-- =============================================================================
--  007_public_read.sql
--  다알아 (Da-Ara) — 화면이 데이터를 읽을 수 있게 하는 '읽기 전용 통로'
--
--  ───────────────────────────────────────────────────────────────────────
--  왜 필요한가
--  ───────────────────────────────────────────────────────────────────────
--  000_supabase_bootstrap.sql 에서 daara / daara_registry 스키마를
--  anon · authenticated · service_role 로부터 전부 차단해 두었다.
--  덕분에 안전하지만, 브라우저 화면도 아무것도 못 읽는 상태다.
--
--  그래서 public 스키마에 '읽기 전용 뷰' 만 따로 만든다.
--    · 공개 고시 자료(구역·고시·확정수치)만 노출
--    · 검수 완료(verified_at IS NOT NULL)된 행만 노출
--    · daara_registry(조합원 명부)는 절대 노출하지 않는다
--    · INSERT / UPDATE / DELETE 는 부여하지 않는다 (SELECT 만)
--
--  ★ 노출되는 자료의 성격
--    서울시보에 게재되어 이미 공표된 고시 내용이다.
--    조합원 개인정보 · 회의록 · 분담금은 이 통로로 나가지 않는다.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. 구역 목록
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_district AS
SELECT t.tenant_id,
       t.display_name,
       t.project_type,
       t.lifecycle_stage,
       t.status,
       t.co_mentioned_tenants,
       (t.config->>'area_sqm')::numeric      AS area_sqm,
       (t.config->>'planned_units')::int     AS planned_units,
       (t.config->>'rental_units')::int      AS rental_units,
       (t.config->'jurisdiction'->>'gu')     AS gu,
       (t.config->'jurisdiction'->>'legal_dong') AS legal_dong,
       (t.config->'jurisdiction'->>'lot')    AS lot,
       t.config->'visible_topics'            AS visible_topics,
       t.config->'ruleset_overrides'         AS ruleset_overrides,
       -- 화면이 "자료 준비 중"을 판단할 수 있도록 적재 현황을 함께 준다
       (SELECT count(*) FROM daara.fact f
         WHERE f.tenant_id = t.tenant_id AND f.verified_at IS NOT NULL) AS fact_count
  FROM daara.tenant t
 WHERE t.status IN ('ACTIVE','ONBOARDING')
 ORDER BY t.tenant_id;

-- -----------------------------------------------------------------------------
-- 2. 고시 계보
--    한 건의 고시가 여러 구역을 규율하므로 링크 테이블을 통해 본다.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_notice AS
SELECT nt.tenant_id,
       n.notice_id,
       n.issuer,
       n.issued_date,
       n.gazette_ref,
       n.title,
       n.page_from,
       n.page_to,
       n.supersedes,
       nt.is_governing,
       nt.change_status,
       (SELECT count(*) FROM daara.fact f
         WHERE f.tenant_id = nt.tenant_id
           AND f.notice_id = n.notice_id
           AND f.verified_at IS NOT NULL) AS fact_count
  FROM daara.notice_tenant nt
  JOIN daara.notice n USING (notice_id)
 ORDER BY n.issued_date DESC;

-- -----------------------------------------------------------------------------
-- 3. 확정 수치 (검수 완료분만)
--    ★ verified_at IS NOT NULL 조건이 핵심.
--      검산·검수를 거치지 않은 값은 화면에 절대 나가지 않는다.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_fact AS
SELECT f.tenant_id,
       f.notice_id,
       f.topic,
       f.metric_code,
       f.metric_label,
       f.category,
       f.value_before,
       f.value_delta,
       f.value_after,
       f.unit,
       f.basis_note,
       f.page_no,
       f.table_name,
       f.verified_at
  FROM daara.fact f
 WHERE f.verified_at IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. 적재 현황 (관리자 화면용)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_ledger_status AS
SELECT f.tenant_id,
       f.topic,
       count(*)                                              AS total,
       count(*) FILTER (WHERE f.verified_at IS NOT NULL)      AS verified,
       count(*) FILTER (WHERE f.verified_at IS NULL)          AS pending,
       max(f.verified_at)                                     AS last_verified_at,
       max(f.verified_by)                                     AS last_verified_by
  FROM daara.fact f
 GROUP BY f.tenant_id, f.topic;

-- -----------------------------------------------------------------------------
-- 5. 검산 규칙 결과 (관리자 화면용)
--    제1권 1-4 의 범용 규칙: 기정 + 증감 = 변경
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.v_checksum AS
SELECT f.tenant_id,
       f.notice_id,
       f.metric_code,
       f.metric_label,
       f.value_before,
       f.value_delta,
       f.value_after,
       f.page_no,
       CASE
         WHEN f.value_before IS NULL OR f.value_delta IS NULL
           OR f.value_after IS NULL THEN 'SKIP'
         WHEN abs((f.value_before + f.value_delta) - f.value_after) < 0.005
           THEN 'PASS'
         ELSE 'FAIL'
       END AS verdict
  FROM daara.fact f;

-- =============================================================================
--  권한
--  SELECT 만 부여한다. 쓰기 권한은 어떤 롤에도 주지 않는다.
-- =============================================================================
DO $$
DECLARE r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY['anon','authenticated'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('GRANT USAGE ON SCHEMA public TO %I', r);
            EXECUTE format(
              'GRANT SELECT ON public.v_district, public.v_notice, public.v_fact,
                               public.v_ledger_status, public.v_checksum TO %I', r);
        END IF;
    END LOOP;
END$$;

-- 뷰는 소유자(postgres) 권한으로 실행되므로 daara 스키마의 RLS 를 통과한다.
-- 대신 뷰 자체가 노출 범위를 고정하고 있어, 화면은 뷰 밖의 어떤 것도 볼 수 없다.
ALTER VIEW public.v_district      SET (security_invoker = off);
ALTER VIEW public.v_notice        SET (security_invoker = off);
ALTER VIEW public.v_fact          SET (security_invoker = off);
ALTER VIEW public.v_ledger_status SET (security_invoker = off);
ALTER VIEW public.v_checksum      SET (security_invoker = off);

COMMIT;

-- =============================================================================
--  확인
-- =============================================================================
SELECT tenant_id, display_name, project_type, lifecycle_stage, fact_count
  FROM public.v_district;
