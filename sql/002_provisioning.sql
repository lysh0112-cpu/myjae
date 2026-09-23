-- =============================================================================
--  002_provisioning.sql
--  테넌트 프로비저닝 — 파티션 · HNSW 인덱스 · RLS 정책 자동 생성
--
--  제2권 2-1 온보딩 T+3분 구간에 해당한다.
--  온보딩 API 가 이 함수 하나를 호출하면 신규 구역의 저장 계층이 완성된다.
-- =============================================================================

BEGIN;

-- ★ 2026-08-20 수정 : 테이블이 daara 스키마에 있으므로 검색 경로를 지정한다.
--   (이 줄이 없으면 'relation "fact" does not exist' 오류가 난다)
SET search_path = daara, public;

-- -----------------------------------------------------------------------------
--  식별자 안전성 검증
--
--  tenant_id 는 파티션명 · 인덱스명에 문자열로 삽입되므로,
--  format(%I) 만 믿지 않고 화이트리스트로 한 번 더 막는다.
--  (tenant 테이블의 CHECK 제약과 이중 방어)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION assert_safe_tenant_id(p_tenant_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
    IF p_tenant_id IS NULL OR p_tenant_id !~ '^[a-z][a-z0-9_]{1,30}$' THEN
        RAISE EXCEPTION
            'unsafe tenant_id: %. 소문자로 시작하는 2~31자 [a-z0-9_] 만 허용된다.',
            p_tenant_id
            USING ERRCODE = '22023';   -- invalid_parameter_value
    END IF;
END;
$$;


-- -----------------------------------------------------------------------------
--  테넌트 프로비저닝
--
--  멱등(idempotent)하게 설계했다. 온보딩 재시도 시 안전하게 다시 호출할 수 있다.
--
--  ★ HNSW 인덱스 파라미터
--     m = 16, ef_construction = 64 는 수만~수십만 청크 규모의 표준값이다.
--     구역당 청크가 수십만을 넘어가면 m = 24 ~ 32 로 상향을 검토한다.
--
--  ★ CREATE INDEX CONCURRENTLY 는 트랜잭션·함수 안에서 실행할 수 없다.
--     신규 테넌트는 파티션이 비어 있어 락 문제가 없으므로 일반 CREATE INDEX 로 충분하다.
--     기존 대용량 파티션에 인덱스를 다시 만들 때는 함수 밖에서 CONCURRENTLY 로 수행할 것.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION provision_tenant(
    p_tenant_id       TEXT,
    p_hnsw_m          INT DEFAULT 16,
    p_hnsw_ef_constr  INT DEFAULT 64
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER          -- 파티션 생성 권한은 소유자에게만 있다
SET search_path = daara, public, pg_temp   -- ★ 2026-08-20 수정 : daara 추가
AS $$
DECLARE
    v_fact_part   TEXT;
    v_chunk_part  TEXT;
    v_created     BOOLEAN := false;
BEGIN
    PERFORM assert_safe_tenant_id(p_tenant_id);

    IF NOT EXISTS (SELECT 1 FROM tenant WHERE tenant_id = p_tenant_id) THEN
        RAISE EXCEPTION 'tenant % 가 tenant 테이블에 없다. 먼저 등록할 것.', p_tenant_id
            USING ERRCODE = '23503';   -- foreign_key_violation
    END IF;

    v_fact_part  := format('fact_%s',  p_tenant_id);
    v_chunk_part := format('chunk_%s', p_tenant_id);

    -- ---------------------------------------------------------------------
    -- 1. fact 파티션
    -- ---------------------------------------------------------------------
    IF to_regclass(v_fact_part) IS NULL THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF fact FOR VALUES IN (%L)',
            v_fact_part, p_tenant_id
        );
        v_created := true;

        -- 조회 패턴: metric_code 단건 조회 / topic 목록 조회 / 고시별 조회
        EXECUTE format(
            'CREATE INDEX %I ON %I (metric_code, notice_id)',
            format('idx_%s_metric', v_fact_part), v_fact_part);
        EXECUTE format(
            'CREATE INDEX %I ON %I (topic)',
            format('idx_%s_topic', v_fact_part), v_fact_part);
        -- 검수 큐: 검산 실패·저신뢰 셀만 빠르게 뽑는다
        EXECUTE format(
            'CREATE INDEX %I ON %I (confidence) WHERE verified_at IS NULL',
            format('idx_%s_unverified', v_fact_part), v_fact_part);
    END IF;

    -- ---------------------------------------------------------------------
    -- 2. chunk 파티션
    -- ---------------------------------------------------------------------
    IF to_regclass(v_chunk_part) IS NULL THEN
        EXECUTE format(
            'CREATE TABLE %I PARTITION OF chunk FOR VALUES IN (%L)',
            v_chunk_part, p_tenant_id
        );
        v_created := true;

        -- ★ 파티션 독립 HNSW 인덱스
        --   단일 인덱스 + WHERE tenant_id 필터 방식은 필터링 후 리콜이 저하된다.
        --   파티션 프루닝이 먼저 일어나 검색 대상 자체가 축소되도록 한다.
        EXECUTE format(
            'CREATE INDEX %I ON %I USING hnsw (embedding vector_cosine_ops) '
            'WITH (m = %s, ef_construction = %s)',
            format('idx_%s_hnsw', v_chunk_part), v_chunk_part,
            p_hnsw_m, p_hnsw_ef_constr
        );

        -- 하이브리드 검색용 FTS 인덱스 (BM25 역할)
        EXECUTE format(
            'CREATE INDEX %I ON %I USING gin (content_tsv)',
            format('idx_%s_fts', v_chunk_part), v_chunk_part);

        -- 메타데이터 하드 필터 (제1권 3-2 R1): 정본 + 법적위계
        EXECUTE format(
            'CREATE INDEX %I ON %I (legal_tier, is_canonical)',
            format('idx_%s_filter', v_chunk_part), v_chunk_part);

        -- Parent Expansion (제1권 3-2 R4): 조서 전체 복원
        EXECUTE format(
            'CREATE INDEX %I ON %I (canonical_id)',
            format('idx_%s_canonical', v_chunk_part), v_chunk_part);
    END IF;

    -- ---------------------------------------------------------------------
    -- 3. 파티션 직접 접근 대비 RLS
    --
    --    부모(fact/chunk) 경유 접근은 부모 정책이 적용되지만,
    --    파티션을 직접 지정한 쿼리에는 파티션 자신의 정책만 적용된다.
    --    실수든 공격이든 파티션 직접 접근이 뚫리지 않도록 동일 정책을 건다.
    -- ---------------------------------------------------------------------
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_fact_part);
    EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY', v_fact_part);
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_chunk_part);
    EXECUTE format('ALTER TABLE %I FORCE  ROW LEVEL SECURITY', v_chunk_part);

    EXECUTE format('DROP POLICY IF EXISTS p_tenant_isolation ON %I', v_fact_part);
    EXECUTE format(
        'CREATE POLICY p_tenant_isolation ON %I FOR ALL TO daara_api '
        'USING (tenant_id = current_setting(''daara.tenant_id'', true)) '
        'WITH CHECK (tenant_id = current_setting(''daara.tenant_id'', true))',
        v_fact_part);

    EXECUTE format('DROP POLICY IF EXISTS p_tenant_isolation ON %I', v_chunk_part);
    EXECUTE format(
        'CREATE POLICY p_tenant_isolation ON %I FOR ALL TO daara_api '
        'USING (tenant_id = current_setting(''daara.tenant_id'', true)) '
        'WITH CHECK (tenant_id = current_setting(''daara.tenant_id'', true))',
        v_chunk_part);

    -- ---------------------------------------------------------------------
    -- 4. 권한
    -- ---------------------------------------------------------------------
    EXECUTE format(
        'GRANT SELECT, INSERT, UPDATE, DELETE ON %I, %I TO daara_api',
        v_fact_part, v_chunk_part);
    EXECUTE format('GRANT SELECT ON %I, %I TO daara_auditor',
        v_fact_part, v_chunk_part);
    EXECUTE format('REVOKE UPDATE (tenant_id) ON %I FROM daara_api', v_fact_part);
    EXECUTE format('REVOKE UPDATE (tenant_id) ON %I FROM daara_api', v_chunk_part);

    INSERT INTO audit_log (tenant_id, actor_role, action, severity, detail)
    VALUES (p_tenant_id, 'SYSTEM', 'TENANT_PROVISIONED', 'INFO',
            jsonb_build_object('fact_partition',  v_fact_part,
                               'chunk_partition', v_chunk_part,
                               'newly_created',   v_created,
                               'hnsw_m',          p_hnsw_m));

    RETURN format('provisioned: %s, %s (newly_created=%s)',
                  v_fact_part, v_chunk_part, v_created);
END;
$$;


-- -----------------------------------------------------------------------------
--  테넌트 디프로비저닝 (조합 해산 · 계약 종료)
--
--  제2권 3-7: 조합 해산 시 데이터 이관·파기 정책이 필요하다.
--  기본은 DETACH — 파티션을 독립 테이블로 떼어내 보존한다.
--  실제 파기는 별도 승인 절차를 거쳐 수행할 것. 되돌릴 수 없다.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION deprovision_tenant(
    p_tenant_id TEXT,
    p_hard_delete BOOLEAN DEFAULT false
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = daara, public, pg_temp   -- ★ 2026-08-20 수정 : daara 추가
AS $$
DECLARE
    v_fact_part  TEXT;
    v_chunk_part TEXT;
BEGIN
    PERFORM assert_safe_tenant_id(p_tenant_id);

    v_fact_part  := format('fact_%s',  p_tenant_id);
    v_chunk_part := format('chunk_%s', p_tenant_id);

    IF to_regclass(v_fact_part) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE fact DETACH PARTITION %I', v_fact_part);
    END IF;
    IF to_regclass(v_chunk_part) IS NOT NULL THEN
        EXECUTE format('ALTER TABLE chunk DETACH PARTITION %I', v_chunk_part);
    END IF;

    IF p_hard_delete THEN
        EXECUTE format('DROP TABLE IF EXISTS %I', v_fact_part);
        EXECUTE format('DROP TABLE IF EXISTS %I', v_chunk_part);
    ELSE
        -- 보존 모드: 이름만 바꿔 격리 보관
        IF to_regclass(v_fact_part) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I RENAME TO %I',
                           v_fact_part, format('archived_%s', v_fact_part));
        END IF;
        IF to_regclass(v_chunk_part) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE %I RENAME TO %I',
                           v_chunk_part, format('archived_%s', v_chunk_part));
        END IF;
    END IF;

    UPDATE tenant SET status = 'ARCHIVED', updated_at = now()
     WHERE tenant_id = p_tenant_id;

    INSERT INTO audit_log (tenant_id, actor_role, action, severity, detail)
    VALUES (p_tenant_id, 'SYSTEM', 'TENANT_DEPROVISIONED', 'CRITICAL',
            jsonb_build_object('hard_delete', p_hard_delete));

    RETURN format('deprovisioned: %s (hard_delete=%s)', p_tenant_id, p_hard_delete);
END;
$$;

COMMIT;
