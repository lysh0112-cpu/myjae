-- =============================================================================
--  003_seed_mia.sql
--  미아재정비촉진(확장)지구 4개 테넌트 등록 + 프로비저닝
--
--  값의 출처: 서울특별시고시 제2026-32호 (서울시보 제4120호, 2026.01.15)
--  제2권 부록 A 의 tenant.yaml 을 DB 행으로 옮긴 것이다.
--
--  ★ 이 스크립트만 실행하면 V1~V3 검증 환경(미아3·4·5)이 즉시 준비된다.
-- =============================================================================

BEGIN;

-- ★ 2026-08-20 수정 : 테이블이 daara 스키마에 있으므로 검색 경로를 지정한다.
--   (이 줄이 없으면 'relation "fact" does not exist' 오류가 난다)
SET search_path = daara, public;

-- 전역 고시 1건. 이 고시 하나가 4개 구역을 동시에 규율한다.
INSERT INTO notice (notice_id, issuer, issued_date, gazette_ref, title,
                    supersedes, source_uri, page_from, page_to)
VALUES (
    '2026-032', 'SEOUL', DATE '2026-01-15', '서울시보 제4120호',
    '미아재정비촉진(확장)지구 재정비촉진계획 변경결정(미아2구역) 및 지형도면 고시',
    ARRAY['2025-754','2025-084','2023-006','2020-423','2020-350','2020-186',
          '2019-018','2017-275','2016-353','2016-084','2014-248','2014-026',
          '2010-090','2008-445','2006-215','2003-372'],
    's3://notices/20260115_NOTICE_SEOUL_2026-032_MIA_재정비촉진계획변경_v1.pdf',
    237, 300
)
ON CONFLICT (notice_id) DO NOTHING;


INSERT INTO tenant (tenant_id, display_name, project_type, lifecycle_stage,
                    plan_tier, status, co_mentioned_tenants, config)
VALUES
-- ---------------------------------------------------------------- 미아2 (V0)
('MIA-002', '미아2재정비촉진구역', 'REDEVELOPMENT', 'ESTABLISHED',
 'STANDARD', 'ACTIVE', ARRAY['MIA-003','MIA-004','MIA-005'],
 jsonb_build_object(
   'jurisdiction', jsonb_build_object('city','서울특별시','gu','강북구',
                                      'legal_dong','미아동','lot','403-44'),
   'area_sqm', 179566.0,
   'planned_units', 4003,
   'rental_units', 710,
   'far_base', 220, 'far_cap', 286.5, 'far_legal_cap', 310.0, 'far_planned', 309.01,
   'bcr_max', 25.0, 'height_max_m', 145, 'floors_max', 45,
   'member_count', 1550,
   'visible_topics', jsonb_build_array('FAR','UNIT','ZONE','INFRA','SCHED',
                                       'RENT','PARK','SCHOOL'),
   'hidden_topics',  jsonb_build_array('COST')
 )),

-- ---------------------------------------------------------------- 미아3 (V1)
('MIA-003', '미아3재정비촉진구역', 'REDEVELOPMENT', 'RELOCATION',
 'STANDARD', 'ONBOARDING', ARRAY['MIA-002','MIA-004','MIA-005'],
 jsonb_build_object(
   'jurisdiction', jsonb_build_object('city','서울특별시','gu','강북구',
                                      'legal_dong','미아동','lot','636-32'),
   'area_sqm', 57553.4,
   'planned_units', 1051,
   'rental_units', 158,
   'far_base', 208.01, 'far_cap', 244.4, 'far_legal_cap', 244.4,
   'bcr_max', 60.0, 'height_max_m', 107, 'floors_max', 35,
   'visible_topics', jsonb_build_array('FAR','UNIT','ZONE','INFRA','SCHED','RENT')
 )),

-- ------------------------------------------------- 미아4 (V2 · 재건축 룰셋 검증)
('MIA-004', '미아4재정비촉진구역', 'RECONSTRUCTION', 'RELOCATION',
 'STANDARD', 'ONBOARDING', ARRAY['MIA-002','MIA-003','MIA-005'],
 jsonb_build_object(
   'jurisdiction', jsonb_build_object('city','서울특별시','gu','강북구',
                                      'legal_dong','미아동','lot','1261-376'),
   'area_sqm', 28497.0,
   'planned_units', 493,
   'rental_units', 10,
   'far_base', 212.02, 'far_cap', 252.96, 'far_legal_cap', 265.55,
   'bcr_max', 50.0, 'height_max_m', 90, 'floors_max', 28, 'floors_avg', 23.5,
   'ruleset_overrides', jsonb_build_object(
       'rent_obligation', 'NOT_APPLICABLE',   -- 재건축: 재개발 의무임대 미적용
       'extra_checks', jsonb_build_array('CHK-RECON-01')),
   'visible_topics', jsonb_build_array('FAR','UNIT','ZONE','INFRA','SCHED')
 )),

-- --------------------------------------------- 미아5 (V3 · 사업완료 룰셋 검증)
('MIA-005', '미아5재정비촉진구역', 'REDEVELOPMENT', 'COMPLETED',
 'STANDARD', 'ONBOARDING', ARRAY['MIA-002','MIA-003','MIA-004'],
 jsonb_build_object(
   'jurisdiction', jsonb_build_object('city','서울특별시','gu','강북구',
                                      'legal_dong','미아동','lot','476'),
   'area_sqm', 18475.0,
   'planned_units', 376,
   'rental_units', 70,
   'far_base', 190, 'far_cap', 230.0,
   'bcr_max', 60.0, 'height_max_m', 48, 'floors_max', 15, 'floors_avg', 14.0,
   'archive_mode', true,
   'ruleset_overrides', jsonb_build_object(
       'tense_mode', 'PAST',                          -- 미래형 답변 금지
       'disable_topics', jsonb_build_array('SCHED')), -- 향후 일정 질의 비활성
   'visible_topics', jsonb_build_array('FAR','UNIT','ZONE','INFRA')
 ))
ON CONFLICT (tenant_id) DO UPDATE
   SET config               = EXCLUDED.config,
       co_mentioned_tenants = EXCLUDED.co_mentioned_tenants,
       updated_at           = now();


-- 고시 ↔ 테넌트 연결. 미아2만 '변경', 나머지는 '변경없음'.
INSERT INTO notice_tenant (tenant_id, notice_id, is_governing, change_status)
VALUES ('MIA-002', '2026-032', true, 'CHANGED'),
       ('MIA-003', '2026-032', true, 'NO_CHANGE'),
       ('MIA-004', '2026-032', true, 'NO_CHANGE'),
       ('MIA-005', '2026-032', true, 'NO_CHANGE')
ON CONFLICT (tenant_id, notice_id) DO NOTHING;

COMMIT;


-- 파티션 · HNSW 인덱스 · RLS 정책 생성
SELECT provision_tenant('MIA-002');
SELECT provision_tenant('MIA-003');
SELECT provision_tenant('MIA-004');
SELECT provision_tenant('MIA-005');
