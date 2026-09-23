-- =============================================================================
--  001_core_schema.sql
--  RAG 기반 AI 행정지원 플랫폼 — 멀티테넌트 코어 스키마
--
--  실행: psql -v ON_ERROR_STOP=1 -f sql/001_core_schema.sql
--
--  설계 근거 (제2권 1-3 / 1-4)
--    - fact / chunk 를 tenant_id 기준 LIST 파티셔닝
--    - 파티션마다 독립 HNSW 인덱스  → post-filtering 리콜 저하 회피
--    - RLS 로 애플리케이션 버그를 DB 레벨에서 차단
--
--  ★ 중요 : 애플리케이션은 반드시 비소유자(daara_api) 롤로 접속해야 한다.
--           테이블 소유자와 superuser 는 RLS 를 우회하므로,
--           아래에서 FORCE ROW LEVEL SECURITY 를 함께 건다.
-- =============================================================================

BEGIN;

-- ★ 2026-08-20 수정 : 테이블이 daara 스키마에 있으므로 검색 경로를 지정한다.
--   (이 줄이 없으면 'relation "fact" does not exist' 오류가 난다)
SET search_path = daara, public;

CREATE EXTENSION IF NOT EXISTS vector;      -- pgvector
CREATE EXTENSION IF NOT EXISTS pgcrypto;    -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 0. 롤 분리
--    app_owner   : 스키마 소유자. 마이그레이션 전용. 런타임 사용 금지.
--    daara_api    : 애플리케이션 런타임 롤. RLS 강제 적용 대상.
--    daara_auditor : 감사·자문변호사. 읽기 전용.
-- -----------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'daara_api') THEN
        CREATE ROLE daara_api NOLOGIN;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'daara_auditor') THEN
        CREATE ROLE daara_auditor NOLOGIN;
    END IF;
END$$;

-- -----------------------------------------------------------------------------
-- 1. 파트너 (PM사 · 정비업체) — 제2권 3-4
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partner (
    partner_id      TEXT        PRIMARY KEY,
    display_name    TEXT        NOT NULL,
    contact_email   TEXT,
    status          TEXT        NOT NULL DEFAULT 'ACTIVE'
                    CHECK (status IN ('ACTIVE', 'SUSPENDED', 'TERMINATED')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 2. 테넌트 마스터
--    RLS 를 걸지 않는다. 미들웨어가 인증 이전 단계에서 조회해야 하기 때문.
--    대신 민감 컬럼을 두지 않고, 애플리케이션에는 SELECT 만 부여한다.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenant (
    tenant_id       TEXT        PRIMARY KEY
                    -- ★ 파티션·인덱스 이름에 그대로 삽입되므로 식별자 안전 문자만 허용.
                    --   SQL injection 방어의 1차 방어선이다.
                    CHECK (tenant_id ~ '^[a-z][a-z0-9_]{1,30}$'),
    display_name    TEXT        NOT NULL,
    project_type    TEXT        NOT NULL
                    CHECK (project_type IN ('REDEVELOPMENT', 'RECONSTRUCTION')),
    lifecycle_stage TEXT        NOT NULL
                    CHECK (lifecycle_stage IN ('PLANNING', 'ESTABLISHED',
                                               'RELOCATION', 'CONSTRUCTION',
                                               'COMPLETED')),
    partner_id      TEXT        REFERENCES partner(partner_id),
    plan_tier       TEXT        NOT NULL DEFAULT 'STANDARD'
                    CHECK (plan_tier IN ('STANDARD', 'PRO', 'ENTERPRISE')),
    status          TEXT        NOT NULL DEFAULT 'ONBOARDING'
                    CHECK (status IN ('ONBOARDING', 'ACTIVE',
                                      'SUSPENDED', 'ARCHIVED')),
    -- tenant.yaml 파싱 결과. term_aliases / visible_topics / ruleset_overrides 등
    config          JSONB       NOT NULL DEFAULT '{}'::jsonb,
    -- ★ 같은 고시문에 나란히 기재되어 정당하게 언급될 수 있는 이웃 구역.
    --   테넌트 가드의 어휘 검사에서 오탐을 막는 데 사용된다. (제2권 0장)
    co_mentioned_tenants TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_partner ON tenant(partner_id);
CREATE INDEX IF NOT EXISTS idx_tenant_status  ON tenant(status);

-- -----------------------------------------------------------------------------
-- 3. 고시 (notice) — ★ 전역 자원. 테넌트 소유가 아니다.
--
--    근거: 서울특별시고시 제2026-32호 1건이 미아2·3·4·5 를 동시에 규율한다.
--    테넌트별로 복제하면 동일 고시가 N벌 중복되고, 정정 고시 발생 시
--    N곳을 동시에 갱신해야 하므로 무결성이 깨진다.
--    → 고시는 전역, 고시-테넌트 관계는 링크 테이블로 표현한다.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notice (
    notice_id       TEXT        PRIMARY KEY,      -- '2026-032'
    issuer          TEXT        NOT NULL,         -- 'SEOUL' | 'GANGBUK' | ...
    issued_date     DATE        NOT NULL,
    gazette_ref     TEXT,                         -- '서울시보 제4120호'
    title           TEXT,
    supersedes      TEXT[]      NOT NULL DEFAULT '{}',
    source_uri      TEXT        NOT NULL,         -- 원본 PDF 오브젝트 키
    page_from       INT,
    page_to         INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 고시 ↔ 테넌트 (N:M). 이쪽은 테넌트 데이터이므로 RLS 대상.
CREATE TABLE IF NOT EXISTS notice_tenant (
    tenant_id       TEXT        NOT NULL REFERENCES tenant(tenant_id),
    notice_id       TEXT        NOT NULL REFERENCES notice(notice_id),
    is_governing    BOOLEAN     NOT NULL DEFAULT false,  -- 해당 구역의 현행 고시 여부
    change_status   TEXT        NOT NULL DEFAULT 'CHANGED'
                    CHECK (change_status IN ('CHANGED', 'NO_CHANGE')),
    PRIMARY KEY (tenant_id, notice_id)
);

-- -----------------------------------------------------------------------------
-- 4. 사실 원장 (fact) — LIST 파티셔닝
--    제1권 2-2 스키마 + tenant_id
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS fact (
    tenant_id       TEXT        NOT NULL,
    fact_id         BIGINT      GENERATED ALWAYS AS IDENTITY,
    notice_id       TEXT        NOT NULL,
    topic           TEXT        NOT NULL,   -- 'FAR' | 'UNIT' | 'ZONE' | ...
    metric_code     TEXT        NOT NULL,   -- 'FAR_CAP' | 'UNIT_TOTAL' | ...
    metric_label    TEXT        NOT NULL,   -- '상한용적률'
    category        TEXT,                   -- '40㎡ 이하' 등 세부구분
    value_before    NUMERIC,                -- 기정
    value_delta     NUMERIC,                -- 증감 (감소는 음수)
    value_after     NUMERIC,                -- 변경
    unit            TEXT        NOT NULL,   -- '%' | '㎡' | '세대' | 'm' | '층'
    -- ★ 산출근거. 제1권 함정② 방어. 수치와 반드시 동반 반환된다.
    basis_note      TEXT,
    page_no         INT,
    table_name      TEXT,
    confidence      NUMERIC     CHECK (confidence IS NULL
                                       OR (confidence >= 0 AND confidence <= 1)),
    verified_by     TEXT,
    verified_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, fact_id)
) PARTITION BY LIST (tenant_id);

-- -----------------------------------------------------------------------------
-- 5. 서술 청크 (chunk) — LIST 파티셔닝 + 파티션별 HNSW
--    embedding 차원 1024 = BGE-M3
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chunk (
    tenant_id       TEXT        NOT NULL,
    chunk_id        TEXT        NOT NULL,
    notice_id       TEXT        NOT NULL,
    -- 중복 조서 정규화 키. 제1권 함정③ 방어.
    canonical_id    TEXT,
    is_canonical    BOOLEAN     NOT NULL DEFAULT true,
    -- '고시2026-32 > 붙임 > 4.10) 건축계획'
    breadcrumb      TEXT        NOT NULL,
    legal_tier      TEXT        NOT NULL DEFAULT 'L1'
                    CHECK (legal_tier IN ('L1', 'L2', 'L3', 'L4')),
    topic           TEXT,
    content         TEXT        NOT NULL,
    content_tsv     TSVECTOR,               -- BM25 대용 FTS (하이브리드 검색)
    embedding       VECTOR(1024),
    page_no         INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (tenant_id, chunk_id)
) PARTITION BY LIST (tenant_id);

-- -----------------------------------------------------------------------------
-- 6. 감사 로그 — 분쟁 시 증거로 제출될 수 있음. append-only.
--    제2권 3-7: WORM 저장 권장.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
    audit_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id       TEXT,
    actor_id        TEXT,
    actor_role      TEXT,
    action          TEXT        NOT NULL,   -- 'QUERY' | 'TENANT_GUARD_BLOCK' | ...
    severity        TEXT        NOT NULL DEFAULT 'INFO'
                    CHECK (severity IN ('INFO', 'WARN', 'CRITICAL')),
    detail          JSONB       NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_tenant_time
    ON audit_log (tenant_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_severity
    ON audit_log (severity, occurred_at DESC)
    WHERE severity IN ('WARN', 'CRITICAL');

-- =============================================================================
--  RLS 정책
--
--  current_setting('daara.tenant_id', true) 는 미설정 시 NULL 을 반환하고,
--  `tenant_id = NULL` 은 false 로 평가되므로 결과가 0행이 된다.
--  즉 GUC 설정을 빠뜨리면 데이터가 새는 게 아니라 안 보인다 (fail-closed).
-- =============================================================================

-- 부모 파티션 테이블에 정책을 걸면 부모 경유 접근 시 적용된다.
-- 파티션 직접 접근에 대비해 프로비저닝 함수가 각 파티션에도 동일 정책을 건다.
--
-- ★ ENABLE 만으로는 테이블 소유자에게 정책이 적용되지 않는다.
--   마이그레이션이나 관리 작업을 소유자 계정으로 돌리는 순간
--   다른 구역 자료까지 통째로 보이고 고쳐진다.
--   구역 격리를 내세우는 서비스에서 이건 치명적이라 FORCE 를 함께 건다.
ALTER TABLE fact          ENABLE ROW LEVEL SECURITY;
ALTER TABLE fact          FORCE  ROW LEVEL SECURITY;
ALTER TABLE chunk         ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunk         FORCE  ROW LEVEL SECURITY;
ALTER TABLE notice_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE notice_tenant FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_tenant_isolation ON fact;
CREATE POLICY p_tenant_isolation ON fact
    FOR ALL
    TO daara_api
    USING      (tenant_id = current_setting('daara.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('daara.tenant_id', true));

DROP POLICY IF EXISTS p_tenant_isolation ON chunk;
CREATE POLICY p_tenant_isolation ON chunk
    FOR ALL
    TO daara_api
    USING      (tenant_id = current_setting('daara.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('daara.tenant_id', true));

DROP POLICY IF EXISTS p_tenant_isolation ON notice_tenant;
CREATE POLICY p_tenant_isolation ON notice_tenant
    FOR ALL
    TO daara_api
    USING      (tenant_id = current_setting('daara.tenant_id', true))
    WITH CHECK (tenant_id = current_setting('daara.tenant_id', true));

-- 감사인: 자기 담당 테넌트만 읽기. GUC 는 동일하게 사용.
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

ALTER TABLE audit_log FORCE  ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_audit_append ON audit_log;
CREATE POLICY p_audit_append ON audit_log
    FOR INSERT TO daara_api
    WITH CHECK (true);                       -- 기록은 항상 허용 (append-only)

DROP POLICY IF EXISTS p_audit_read ON audit_log;
CREATE POLICY p_audit_read ON audit_log
    FOR SELECT TO daara_api, daara_auditor
    USING (tenant_id = current_setting('daara.tenant_id', true));

-- =============================================================================
--  권한
-- =============================================================================
GRANT USAGE ON SCHEMA public TO daara_api, daara_auditor;

GRANT SELECT                         ON tenant, partner, notice TO daara_api, daara_auditor;
GRANT SELECT, INSERT, UPDATE, DELETE ON fact, chunk, notice_tenant TO daara_api;
GRANT SELECT, INSERT                 ON audit_log TO daara_api;
GRANT SELECT                         ON fact, chunk, notice_tenant TO daara_auditor;

-- 향후 생성될 파티션에도 자동 적용
ALTER DEFAULT PRIVILEGES IN SCHEMA public
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO daara_api;

-- ★ daara_api 는 UPDATE 로 tenant_id 를 바꿔 다른 파티션으로 행을 옮길 수 없어야 한다.
--   WITH CHECK 절이 이를 막지만, 컬럼 단위로 한 번 더 잠근다.
REVOKE UPDATE (tenant_id) ON fact  FROM daara_api;
REVOKE UPDATE (tenant_id) ON chunk FROM daara_api;

COMMIT;

-- =============================================================================
--  자가 점검: GUC 미설정 상태에서 0행이 나오는지 확인 (fail-closed 검증)
--
--    SET ROLE daara_api;
--    SELECT count(*) FROM fact;              -- 반드시 0
--    SELECT set_config('daara.tenant_id', 'MIA-002', false);
--    SELECT count(*) FROM fact;              -- MIA-002 행 수
--    RESET ROLE;
-- =============================================================================
