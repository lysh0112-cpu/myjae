-- =============================================================================
--  005_checksum_MIA-002.sql
--  다알아 (Da-Ara) — 미아2구역 원장 자동 검산
--
--  제1권 1-4 「숫자 무결성 자동 검산 규칙」의 실행판.
--
--  행정 고시문의 표는 내부 합계가 반드시 맞아떨어지도록 설계되어 있다.
--  그 성질을 이용해 적재 오류를 자동으로 잡아낸다.
--  자릿수 오류 · 쉼표 오류 · 단일 자릿수 오독의 90% 이상이 여기서 걸린다.
--
--  ★ 전 규칙 PASS 일 때만 마지막 UPDATE(검수 확정)를 실행할 것.
-- =============================================================================

-- ★ 2026-08-20 수정 : 테이블이 daara 스키마에 있으므로 검색 경로를 지정한다.
--   (이 줄이 없으면 'relation "fact" does not exist' 오류가 난다)
SET search_path = daara, public;

WITH m AS (
    SELECT metric_code,
           max(value_before) AS b,
           max(value_delta)  AS d,
           max(value_after)  AS a
      FROM fact
     WHERE tenant_id = 'MIA-002' AND notice_id = '2026-032'
     GROUP BY metric_code
),
g AS (
    SELECT * FROM (VALUES

    -- ── 세대수 ───────────────────────────────────────────────────────
    ('CHK-UNIT-01', '규모별 세대수 합 = 총세대수 (변경)',
     (SELECT a FROM m WHERE metric_code='UNIT_U60')
    +(SELECT a FROM m WHERE metric_code='UNIT_60_85')
    +(SELECT a FROM m WHERE metric_code='UNIT_O85'),
     (SELECT a FROM m WHERE metric_code='UNIT_TOTAL')),

    ('CHK-UNIT-02', '규모별 세대수 합 = 총세대수 (기정)',
     (SELECT b FROM m WHERE metric_code='UNIT_U60')
    +(SELECT b FROM m WHERE metric_code='UNIT_60_85')
    +(SELECT b FROM m WHERE metric_code='UNIT_O85'),
     (SELECT b FROM m WHERE metric_code='UNIT_TOTAL')),

    ('CHK-UNIT-03', '분양 + 임대주택등 = 총세대수 (변경)',
     (SELECT a FROM m WHERE metric_code='SALE_TOTAL')
    +(SELECT a FROM m WHERE metric_code='RENT_TOTAL'),
     (SELECT a FROM m WHERE metric_code='UNIT_TOTAL')),

    ('CHK-UNIT-04', '60㎡ 이하 세분 합 = 60㎡ 이하 계 (변경)',
     (SELECT a FROM m WHERE metric_code='UNIT_U40')
    +(SELECT a FROM m WHERE metric_code='UNIT_40_50')
    +(SELECT a FROM m WHERE metric_code='UNIT_50_60'),
     (SELECT a FROM m WHERE metric_code='UNIT_U60')),

    ('CHK-UNIT-05', '60㎡ 이하 세분 합 = 60㎡ 이하 계 (기정)',
     (SELECT b FROM m WHERE metric_code='UNIT_U40')
    +(SELECT b FROM m WHERE metric_code='UNIT_40_50')
    +(SELECT b FROM m WHERE metric_code='UNIT_50_60'),
     (SELECT b FROM m WHERE metric_code='UNIT_U60')),

    -- ── 분양 ─────────────────────────────────────────────────────────
    ('CHK-SALE-01', '분양 규모별 합 = 분양 계 (변경)',
     (SELECT a FROM m WHERE metric_code='SALE_U40')
    +(SELECT a FROM m WHERE metric_code='SALE_40_50')
    +(SELECT a FROM m WHERE metric_code='SALE_50_60')
    +(SELECT a FROM m WHERE metric_code='SALE_60_85')
    +(SELECT a FROM m WHERE metric_code='SALE_O85'),
     (SELECT a FROM m WHERE metric_code='SALE_TOTAL')),

    ('CHK-SALE-02', '분양 규모별 합 = 분양 계 (기정)',
     (SELECT b FROM m WHERE metric_code='SALE_U40')
    +(SELECT b FROM m WHERE metric_code='SALE_40_50')
    +(SELECT b FROM m WHERE metric_code='SALE_50_60')
    +(SELECT b FROM m WHERE metric_code='SALE_60_85')
    +(SELECT b FROM m WHERE metric_code='SALE_O85'),
     (SELECT b FROM m WHERE metric_code='SALE_TOTAL')),

    -- ── 임대주택 ─────────────────────────────────────────────────────
    ('CHK-RENT-01', '의무 + 공공주택 3종 = 임대등 계',
     (SELECT a FROM m WHERE metric_code='RENT_OBLIGATION')
    +(SELECT a FROM m WHERE metric_code='RENT_PUBLIC_LEASE')
    +(SELECT a FROM m WHERE metric_code='RENT_MIRINAE')
    +(SELECT a FROM m WHERE metric_code='RENT_PUBLIC_SALE'),
     (SELECT a FROM m WHERE metric_code='RENT_TOTAL')),

    ('CHK-RENT-02', '임대 규모별 합 = 임대등 계 (변경)',
     (SELECT a FROM m WHERE metric_code='RENT_U40')
    +(SELECT a FROM m WHERE metric_code='RENT_40_50')
    +(SELECT a FROM m WHERE metric_code='RENT_50_60')
    +(SELECT a FROM m WHERE metric_code='RENT_O60'),
     (SELECT a FROM m WHERE metric_code='RENT_TOTAL')),

    ('CHK-RENT-03', '50㎡초과 + 60㎡초과 = 50㎡초과 합계 (p.290 대조)',
     (SELECT a FROM m WHERE metric_code='RENT_50_60')
    +(SELECT a FROM m WHERE metric_code='RENT_O60'),
     (SELECT a FROM m WHERE metric_code='RENT_O50_SUM')),

    ('CHK-RENT-04', '의무임대 산정 : 모수 × 15% 올림 = 의무 세대수',
     ceil((SELECT a FROM m WHERE metric_code='RENT_BASE_UNITS')
          * (SELECT a FROM m WHERE metric_code='RENT_RATIO') / 100),
     (SELECT a FROM m WHERE metric_code='RENT_OBLIGATION')),

    -- ── 용도지역 ─────────────────────────────────────────────────────
    ('CHK-ZONE-01', '용도지역 면적 합 = 구역면적 (변경)',
     (SELECT a FROM m WHERE metric_code='ZONE_1ST')
    +(SELECT a FROM m WHERE metric_code='ZONE_2ND_7F')
    +(SELECT a FROM m WHERE metric_code='ZONE_2ND')
    +(SELECT a FROM m WHERE metric_code='ZONE_3RD'),
     (SELECT a FROM m WHERE metric_code='AREA_TOTAL')),

    ('CHK-ZONE-02', '용도지역 면적 합 = 구역면적 (기정)',
     (SELECT b FROM m WHERE metric_code='ZONE_1ST')
    +(SELECT b FROM m WHERE metric_code='ZONE_2ND_7F')
    +(SELECT b FROM m WHERE metric_code='ZONE_2ND')
    +(SELECT b FROM m WHERE metric_code='ZONE_3RD'),
     (SELECT b FROM m WHERE metric_code='AREA_TOTAL')),

    -- ── 토지이용 ─────────────────────────────────────────────────────
    ('CHK-LAND-01', '기반시설 + 택지 = 구역면적 (변경)',
     (SELECT a FROM m WHERE metric_code='LAND_INFRA_TOTAL')
    +(SELECT a FROM m WHERE metric_code='LAND_HOUSING_TOTAL'),
     (SELECT a FROM m WHERE metric_code='AREA_TOTAL')),

    ('CHK-LAND-02', '기반시설 + 택지 = 구역면적 (기정)',
     (SELECT b FROM m WHERE metric_code='LAND_INFRA_TOTAL')
    +(SELECT b FROM m WHERE metric_code='LAND_HOUSING_TOTAL'),
     (SELECT b FROM m WHERE metric_code='AREA_TOTAL')),

    ('CHK-LAND-03', '기반시설 세부 합 = 기반시설 계 (변경)',
     (SELECT a FROM m WHERE metric_code='LAND_ROAD')
    +(SELECT a FROM m WHERE metric_code='LAND_PARK')
    +(SELECT a FROM m WHERE metric_code='LAND_SCHOOL_ELEM')
    +(SELECT a FROM m WHERE metric_code='LAND_KINDERGARTEN')
    +(SELECT a FROM m WHERE metric_code='LAND_PUBLIC_OFFICE1')
    +(SELECT a FROM m WHERE metric_code='LAND_PUBLIC_OFFICE3')
    +(SELECT a FROM m WHERE metric_code='LAND_SENIOR_WELFARE'),
     (SELECT a FROM m WHERE metric_code='LAND_INFRA_TOTAL')),

    ('CHK-LAND-04', '기반시설 세부 합 = 기반시설 계 (기정)',
     (SELECT b FROM m WHERE metric_code='LAND_ROAD')
    +(SELECT b FROM m WHERE metric_code='LAND_PARK')
    +(SELECT b FROM m WHERE metric_code='LAND_SCHOOL_ELEM')
    +(SELECT b FROM m WHERE metric_code='LAND_KINDERGARTEN')
    +(SELECT b FROM m WHERE metric_code='LAND_PUBLIC_OFFICE1')
    +(SELECT b FROM m WHERE metric_code='LAND_PUBLIC_OFFICE3')
    +(SELECT b FROM m WHERE metric_code='LAND_SENIOR_WELFARE'),
     (SELECT b FROM m WHERE metric_code='LAND_INFRA_TOTAL')),

    ('CHK-LOT-01', '택지 4개 합 = 택지 계 (변경)',
     (SELECT a FROM m WHERE metric_code='LOT_2_1')
    +(SELECT a FROM m WHERE metric_code='LOT_2_2')
    +(SELECT a FROM m WHERE metric_code='LOT_2_3')
    +(SELECT a FROM m WHERE metric_code='LOT_2_4'),
     (SELECT a FROM m WHERE metric_code='LAND_HOUSING_TOTAL')),

    ('CHK-LOT-02', '택지 4개 합 = 택지 계 (기정)',
     (SELECT b FROM m WHERE metric_code='LOT_2_1')
    +(SELECT b FROM m WHERE metric_code='LOT_2_2')
    +(SELECT b FROM m WHERE metric_code='LOT_2_3')
    +(SELECT b FROM m WHERE metric_code='LOT_2_4'),
     (SELECT b FROM m WHERE metric_code='LAND_HOUSING_TOTAL')),

    ('CHK-PARK-01', '어린이공원 + 소공원 = 공원 계 (변경)',
     (SELECT a FROM m WHERE metric_code='PARK_CHILD')
    +(SELECT a FROM m WHERE metric_code='PARK_SMALL'),
     (SELECT a FROM m WHERE metric_code='LAND_PARK')),

    -- ── 기반시설 비용분담 ────────────────────────────────────────────
    ('CHK-INFRA-01', '계획기반시설 − 국공유지② − 국공유지③ = 순부담 (변경)',
     (SELECT a FROM m WHERE metric_code='INFRA_PLANNED')
    -(SELECT a FROM m WHERE metric_code='INFRA_STATE_IN_PLAN')
    -(SELECT a FROM m WHERE metric_code='INFRA_STATE_EXISTING'),
     (SELECT a FROM m WHERE metric_code='INFRA_NET_BURDEN')),

    ('CHK-INFRA-02', '계획기반시설 − 국공유지② − 국공유지③ = 순부담 (기정)',
     (SELECT b FROM m WHERE metric_code='INFRA_PLANNED')
    -(SELECT b FROM m WHERE metric_code='INFRA_STATE_IN_PLAN')
    -(SELECT b FROM m WHERE metric_code='INFRA_STATE_EXISTING'),
     (SELECT b FROM m WHERE metric_code='INFRA_NET_BURDEN')),

    -- ── 공공주택 ─────────────────────────────────────────────────────
    ('CHK-PUBH-01', '건축계획용적률 − 상한용적률 의 50% = 공공주택 의무비율',
     round(((SELECT a FROM m WHERE metric_code='FAR_PLANNED')
           -(SELECT a FROM m WHERE metric_code='FAR_CAP')) * 0.5, 2),
     (SELECT a FROM m WHERE metric_code='PUBLIC_HOUSING_RATIO'))

    ) AS t(rule_id, 검산식, 계산값, 원장값)
)
SELECT rule_id     AS "규칙",
       검산식,
       계산값,
       원장값,
       CASE
         WHEN 계산값 IS NULL OR 원장값 IS NULL          THEN '⚠ 값없음'
         WHEN abs(계산값 - 원장값) < 0.005              THEN '✅ PASS'
         ELSE                                                '❌ FAIL'
       END AS "판정"
  FROM g
 ORDER BY rule_id;


-- =============================================================================
--  범용 규칙 : 기정 + 증감 = 변경   (제1권 CHK-DELTA-01)
--  전국 모든 정비사업 고시문에 공통 적용된다.
--  아래 쿼리 결과가 0행이어야 정상.
-- =============================================================================
SELECT metric_code AS "규칙위반 항목",
       metric_label AS "항목명",
       value_before AS "기정",
       value_delta  AS "증감",
       value_after  AS "변경",
       value_before + value_delta AS "계산결과",
       page_no      AS "원문 페이지"
  FROM fact
 WHERE tenant_id = 'MIA-002'
   AND notice_id = '2026-032'
   AND value_before IS NOT NULL
   AND value_delta  IS NOT NULL
   AND value_after  IS NOT NULL
   AND abs((value_before + value_delta) - value_after) > 0.005
 ORDER BY metric_code;


-- =============================================================================
--  ★ 전 규칙 PASS 를 눈으로 확인한 뒤에만 아래를 실행할 것
--
--  검수 확정. 이 시점부터 NumericGuard 가 이 수치들의 인용을 허용한다.
--  (require_verified=True 설정이므로, 확정 전에는 다알아가 답변하지 않는다)
-- =============================================================================

UPDATE fact
   SET verified_by = '류승현',
       verified_at = now()
 WHERE tenant_id = 'MIA-002'
   AND notice_id = '2026-032';

-- 확인 : 65 가 나와야 정상
SELECT count(*) AS "검수확정 건수"
  FROM fact
 WHERE tenant_id = 'MIA-002' AND verified_at IS NOT NULL;
