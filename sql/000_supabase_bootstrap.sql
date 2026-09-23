-- =============================================================================
--  000_supabase_bootstrap.sql
--  정비사업 행정지원 플랫폼 — 전용 Supabase 프로젝트 초기 잠금
--
--  전제: 이 프로젝트에는 정비사업 데이터만 존재한다.
--        사주 서비스(명카페·키우소·마이스코어)는 별도 프로젝트로 완전 분리됐다.
--
--  실행 순서: 000 → 001 → 002 → 003
-- =============================================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- -----------------------------------------------------------------------------
-- 1. 스키마 분리
--
--    daara          운영 데이터 (tenant · fact · chunk · notice)
--    daara_registry 권리자 원장 — 최고 민감 등급. 성명·연락처·권리가액.
--
--    두 스키마를 나누는 이유: daara 가 뚫려도 원장은 남아야 한다.
--    질의 API 롤에는 daara_registry 에 대한 USAGE 조차 부여하지 않는다.
-- -----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS daara;
CREATE SCHEMA IF NOT EXISTS daara_registry;

-- -----------------------------------------------------------------------------
-- 2. PostgREST 경로 차단
--
--    전용 프로젝트라도 Supabase 는 anon / authenticated / service_role 롤을
--    기본 생성한다. 이 서비스는 PostgREST 를 쓰지 않고 FastAPI 직접 커넥션만
--    사용하므로, 세 롤을 전부 밀어낸다.
--
--    ★ service_role 은 BYPASSRLS 를 갖지만 superuser 는 아니다.
--      따라서 스키마 USAGE 를 회수하면 실제로 접근이 막힌다.
--      RLS 로는 service_role 을 막을 수 없으므로 이 REVOKE 가 유일한 통제점이다.
-- -----------------------------------------------------------------------------
DO $$
DECLARE r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format(
                'REVOKE ALL ON SCHEMA daara, daara_registry FROM %I', r);
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES IN SCHEMA daara, daara_registry '
                'REVOKE ALL ON TABLES FROM %I', r);
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES IN SCHEMA daara, daara_registry '
                'REVOKE ALL ON FUNCTIONS FROM %I', r);
            EXECUTE format(
                'ALTER DEFAULT PRIVILEGES IN SCHEMA daara, daara_registry '
                'REVOKE ALL ON SEQUENCES FROM %I', r);
        END IF;
    END LOOP;
END$$;

-- public 스키마 무력화.
-- 누군가 public 에 테이블을 만들면 그 순간 PostgREST 엔드포인트가 생긴다.
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
        REVOKE CREATE ON SCHEMA public FROM anon, authenticated;
    END IF;
END$$;

-- -----------------------------------------------------------------------------
-- 3. 전용 롤
--
--    daara_owner        마이그레이션 전용. 런타임 사용 금지.
--    daara_api          질의 API 런타임. daara 만 접근. RLS 적용 대상.
--    daara_registry_api 원장 접근 전용. 인증 서비스만 사용.
--    daara_auditor         감사·자문변호사. 읽기 전용.
-- -----------------------------------------------------------------------------
DO $$
DECLARE r TEXT;
BEGIN
    FOREACH r IN ARRAY ARRAY['daara_owner', 'daara_api',
                             'daara_registry_api', 'daara_auditor'] LOOP
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format('CREATE ROLE %I NOLOGIN', r);
        END IF;
    END LOOP;
END$$;

GRANT USAGE ON SCHEMA daara          TO daara_api, daara_auditor;
GRANT USAGE ON SCHEMA daara_registry TO daara_registry_api;

-- ★ daara_api 는 daara_registry 에 USAGE 가 없다.
--   질의 API 가 완전히 장악당해도 조합원 개인정보에는 닿지 못한다.
--   daara_auditor 도 마찬가지다 — 감사 목적이라도 원장 열람은 별도 절차를 거친다.


-- -----------------------------------------------------------------------------
-- 4. 스키마 간 외래키 금지 감사 쿼리
--
--    daara* 가 auth.users 등 외부 스키마를 참조하면
--    (a) 조인 경로가 생겨 도메인 경계가 흐려지고
--    (b) pg_dump --schema=daara 로 통째 이관하는 길이 막힌다.
--    CI 에서 이 쿼리 결과가 비어 있는지 검사할 것.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE VIEW daara.v_foreign_schema_fk AS
SELECT c.conname, n.nspname AS from_schema, rn.nspname AS to_schema
  FROM pg_constraint c
  JOIN pg_class t       ON t.oid  = c.conrelid
  JOIN pg_namespace n   ON n.oid  = t.relnamespace
  JOIN pg_class rt      ON rt.oid = c.confrelid
  JOIN pg_namespace rn  ON rn.oid = rt.relnamespace
 WHERE c.contype = 'f'
   AND n.nspname LIKE 'daara%'
   AND rn.nspname NOT LIKE 'daara%';

COMMIT;

-- =============================================================================
--  실행 후 확인
--
--    -- ① 노출 롤이 daara 에 접근 불가한지
--    SET ROLE service_role;
--    SELECT 1 FROM daara.tenant;        -- permission denied for schema daara
--    RESET ROLE;
--
--    -- ② 스키마 간 FK 가 없는지 (0행이어야 함)
--    SELECT * FROM daara.v_foreign_schema_fk;
--
--  Supabase 대시보드 설정
--    - API Settings > Exposed schemas : daara, daara_registry 를 넣지 않는다
--    - Realtime publication 에 daara* 테이블을 추가하지 않는다
--    - Storage 버킷 da-ara-notices 는 public = false, 서명 URL 만 사용
--    - 프로젝트 멤버 최소화 + MFA 필수
--      (SQL Editor 는 소유자 권한으로 RLS 를 우회하므로 대시보드 접근 자체를
--       break-glass 로 취급하고 접근 이력을 정기 검토할 것)
-- =============================================================================
