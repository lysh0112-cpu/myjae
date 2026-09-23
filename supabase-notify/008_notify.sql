-- =============================================================================
--  008_notify.sql
--  다알아 (Da-Ara) — 전자결재 알림 발송
--
--  실행 순서 : 000 → 001 → 002 → 003 → 004 → 005 → 006 → 007 → 008
--
--  ★ 이 파일은 전자결재(approval.html)의 알림 기능을 위한 것이다.
--    문서·결재선 테이블(doc_*)이 먼저 있어야 한다.
--
--  ★ 왜 트리거 안에서 문자를 보내지 않는가
--    트리거에서 외부 API 를 부르면, 중계사가 느릴 때 결재 저장 자체가 물린다.
--    조합장이 승인 버튼을 눌렀는데 화면이 멈춰 있으면 다시 누르시고,
--    그러면 중복 발송이 된다.
--    그래서 저장은 먼저 끝내고, Webhook 이 Edge Function 을 깨워 뒤에서 보낸다.
-- =============================================================================

SET search_path = daara, public;

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. 발송 이력
--
--    실패한 건을 다시 보내려면 무엇을 보냈는지 남아 있어야 한다.
--    중계사 응답(raw)까지 통째로 보관한다. 분쟁 시 이것만이 근거다.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notify_log (
    notify_id   BIGSERIAL PRIMARY KEY,
    tenant_id   TEXT        NOT NULL,
    doc_no      TEXT        NOT NULL,               -- 문서 분류번호
    kind        TEXT        NOT NULL,               -- new · final · reject · done · remind
    reason      TEXT        NOT NULL,               -- 신규 기안 · 순차 도래 · 반려 · 미결 독촉
    to_name     TEXT        NOT NULL,
    to_phone    TEXT        NOT NULL,               -- 저장 시 암호화 권장
    channel     TEXT        NOT NULL,               -- alimtalk · sms · hold
    template    TEXT,                               -- 알림톡 템플릿 코드
    message     TEXT        NOT NULL,
    result      TEXT        NOT NULL DEFAULT 'queued',  -- queued·ok·fallback·fail·hold
    provider    TEXT,                               -- solapi · aligo ...
    provider_id TEXT,                               -- 중계사 발송 식별자
    raw         JSONB,                              -- 중계사 응답 원본
    retry_of    BIGINT REFERENCES notify_log(notify_id),
    send_after  TIMESTAMPTZ,                        -- 야간 보류 시 아침 시각
    sent_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_notify_doc    ON notify_log (doc_no, created_at DESC);
CREATE INDEX IF NOT EXISTS ix_notify_result ON notify_log (result) WHERE result IN ('queued','fail','hold');

-- -----------------------------------------------------------------------------
-- 2. 1회용 결재 링크 토큰
--
--    문자는 남에게 전달되기 쉽다.
--    링크가 영구적이면 캡처 한 장으로 아무나 결재 화면에 들어온다.
--    한 번 쓰면 막고, 24시간 뒤 만료시킨다.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_tokens (
    token       TEXT        PRIMARY KEY,            -- 무작위 문자열
    tenant_id   TEXT        NOT NULL,
    doc_no      TEXT        NOT NULL,
    step        SMALLINT    NOT NULL,               -- 1 담당자 · 2 총무이사 · 3 조합장
    approver    TEXT        NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    used_at     TIMESTAMPTZ,
    used_ip     INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_token_doc ON approval_tokens (doc_no);

-- 토큰 검증 : 유효하면 문서번호를 돌려주고 즉시 사용 처리한다
CREATE OR REPLACE FUNCTION use_approval_token(p_token TEXT, p_ip INET DEFAULT NULL)
RETURNS TABLE(doc_no TEXT, step SMALLINT, approver TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = daara, public, pg_temp
AS $$
BEGIN
    RETURN QUERY
    UPDATE approval_tokens t
       SET used_at = now(), used_ip = p_ip
     WHERE t.token = p_token
       AND t.used_at IS NULL
       AND t.expires_at > now()
    RETURNING t.doc_no, t.step, t.approver;
END;
$$;

-- 만료·사용된 토큰 청소 (하루 한 번 돌리면 된다)
CREATE OR REPLACE FUNCTION purge_approval_tokens()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE n INTEGER;
BEGIN
    DELETE FROM approval_tokens
     WHERE expires_at < now() - INTERVAL '7 days';
    GET DIAGNOSTICS n = ROW_COUNT;
    RETURN n;
END;
$$;

-- -----------------------------------------------------------------------------
-- 3. 발송 설정 (구역별)
--
--    야간 시각과 독촉 주기를 코드에 박지 않는다.
--    조합마다 사정이 다르고, 운영하면서 반드시 바뀐다.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notify_config (
    tenant_id    TEXT PRIMARY KEY,
    quiet_from   SMALLINT NOT NULL DEFAULT 21,      -- 이 시각부터 보류
    quiet_to     SMALLINT NOT NULL DEFAULT 8,       -- 이 시각에 발송
    remind_days  SMALLINT NOT NULL DEFAULT 3,       -- 미결 독촉 (1회)
    sender_no    TEXT,                              -- 발신번호 (사전등록 필수)
    provider     TEXT     NOT NULL DEFAULT 'solapi',
    kakao_ch     TEXT,                              -- 카카오 채널 검색용 아이디
    active       BOOLEAN  NOT NULL DEFAULT TRUE,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO notify_config (tenant_id, sender_no, kakao_ch)
VALUES ('MIA-002', '02-000-0000', '@daara')
ON CONFLICT (tenant_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. 알림이 필요한 순간을 큐에 넣는 트리거
--
--    ★ 여기서 문자를 보내지 않는다. 큐에 넣기만 한다.
--      실제 발송은 Edge Function 이 한다.
--
--    doc_approvals 의 한 단계가 승인되면 다음 단계가 열린다.
--    그때 다음 결재자에게 보낼 건을 queued 로 쌓는다.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION on_approval_changed()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_next   RECORD;
    v_doc    RECORD;
    v_kind   TEXT;
    v_reason TEXT;
BEGIN
    SELECT * INTO v_doc FROM documents WHERE doc_no = NEW.doc_no;
    IF NOT FOUND THEN RETURN NEW; END IF;

    -- 반려 : 기안자에게
    IF NEW.status = 'no' AND (OLD.status IS DISTINCT FROM 'no') THEN
        INSERT INTO notify_log (tenant_id, doc_no, kind, reason,
                                to_name, to_phone, channel, message, result)
        VALUES (v_doc.tenant_id, NEW.doc_no, 'reject', '반려',
                v_doc.drafter, COALESCE(v_doc.drafter_phone,''), 'alimtalk',
                '[다알아 전자결재] 상신하신 문서가 반려되었습니다.', 'queued');
        RETURN NEW;
    END IF;

    IF NEW.status <> 'ok' OR (OLD.status IS NOT DISTINCT FROM 'ok') THEN
        RETURN NEW;
    END IF;

    -- 다음 단계 결재자 찾기
    SELECT * INTO v_next
      FROM doc_approvals
     WHERE doc_no = NEW.doc_no AND status = 'wait'
     ORDER BY step
     LIMIT 1;

    IF FOUND THEN
        v_kind   := CASE WHEN v_next.step = 3 THEN 'final' ELSE 'new' END;
        v_reason := '순차 도래';
        INSERT INTO notify_log (tenant_id, doc_no, kind, reason,
                                to_name, to_phone, channel, message, result)
        VALUES (v_doc.tenant_id, NEW.doc_no, v_kind, v_reason,
                v_next.approver, COALESCE(v_next.phone,''), 'alimtalk',
                '[다알아 전자결재] 처리해야 할 대기 문서가 있습니다.', 'queued');
    ELSE
        -- 마지막 단계까지 승인 : 기안자에게 완료 알림
        UPDATE documents SET status = 'approved' WHERE doc_no = NEW.doc_no;
        INSERT INTO notify_log (tenant_id, doc_no, kind, reason,
                                to_name, to_phone, channel, message, result)
        VALUES (v_doc.tenant_id, NEW.doc_no, 'done', '결재 완료',
                v_doc.drafter, COALESCE(v_doc.drafter_phone,''), 'alimtalk',
                '[다알아 전자결재] 상신하신 문서의 결재가 완료되었습니다.', 'queued');
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_approval_changed ON doc_approvals;
CREATE TRIGGER trg_approval_changed
    AFTER UPDATE ON doc_approvals
    FOR EACH ROW
    EXECUTE FUNCTION on_approval_changed();

-- -----------------------------------------------------------------------------
-- 5. 야간 보류 처리
--
--    밤 9시~아침 8시에 쌓인 건은 아침 시각을 send_after 에 적어 둔다.
--    Edge Function 은 send_after 가 지난 것만 집어간다.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION apply_quiet_hours()
RETURNS INTEGER
LANGUAGE plpgsql
AS $$
DECLARE n INTEGER; cfg RECORD; h INTEGER;
BEGIN
    SELECT * INTO cfg FROM notify_config WHERE tenant_id = 'MIA-002';
    h := EXTRACT(HOUR FROM now() AT TIME ZONE 'Asia/Seoul');

    IF h >= cfg.quiet_from OR h < cfg.quiet_to THEN
        UPDATE notify_log
           SET result = 'hold',
               send_after = date_trunc('day', now() AT TIME ZONE 'Asia/Seoul')
                            + (CASE WHEN h >= cfg.quiet_from THEN INTERVAL '1 day'
                                    ELSE INTERVAL '0 day' END)
                            + (cfg.quiet_to || ' hours')::INTERVAL
         WHERE result = 'queued' AND send_after IS NULL;
        GET DIAGNOSTICS n = ROW_COUNT;
        RETURN n;
    END IF;
    RETURN 0;
END;
$$;

-- -----------------------------------------------------------------------------
-- 6. 미결 독촉 대상
--
--    ★ 딱 한 번만 보낸다.
--      계속 보내면 스팸으로 취급받아 그다음부터 알림 자체를 꺼 버리신다.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW v_notify_remind AS
SELECT d.tenant_id, d.doc_no, d.title, a.step, a.approver, a.phone, d.created_at
  FROM documents d
  JOIN doc_approvals a ON a.doc_no = d.doc_no AND a.status = 'wait'
 WHERE d.status = 'pending'
   AND d.created_at < now() - ((SELECT remind_days FROM notify_config
                                 WHERE tenant_id = d.tenant_id) || ' days')::INTERVAL
   AND a.step = (SELECT min(step) FROM doc_approvals
                  WHERE doc_no = d.doc_no AND status = 'wait')
   AND NOT EXISTS (SELECT 1 FROM notify_log n
                    WHERE n.doc_no = d.doc_no AND n.kind = 'remind');

COMMIT;

-- =============================================================================
--  확인
-- =============================================================================
SELECT 'notify_log'      AS 테이블, count(*) AS 행수 FROM notify_log
UNION ALL SELECT 'approval_tokens', count(*) FROM approval_tokens
UNION ALL SELECT 'notify_config',   count(*) FROM notify_config;

-- =============================================================================
--  Database Webhook 설정 (Supabase 대시보드에서)
--
--   Database → Webhooks → Create a new hook
--     Table   : notify_log
--     Events  : INSERT
--     Type    : Supabase Edge Functions
--     Function: notify-approval
--
--   notify_log 에 queued 가 쌓이면 Edge Function 이 깨어나 발송한다.
-- =============================================================================
