-- =============================================================================
--  006_demo_MIA-002.sql
--  다알아 (Da-Ara) — 조합원 화면 미리보기
--
--  아직 앱 화면이 없으므로, 조합원이 물어볼 질문에 대한 답을
--  SQL 로 미리 확인해 본다.
--
--  ★ 하나씩 잘라서 실행할 것.
--    전체를 한 번에 Run 하면 마지막 결과만 보인다.
-- =============================================================================

-- ★ 2026-08-20 수정 : 테이블이 daara 스키마에 있으므로 검색 경로를 지정한다.
--   (이 줄이 없으면 'relation "fact" does not exist' 오류가 난다)
SET search_path = daara, public;


-- ═════════════════════════════════════════════════════════════════════════
--  Q1. "이번 고시로 뭐가 바뀌었나요?"   ← 가장 많이 나올 질문
-- ═════════════════════════════════════════════════════════════════════════
SELECT metric_label            AS "항목",
       rtrim(to_char(value_before,'FM999,999,990.99'),'.') || COALESCE(unit,'') AS "기정",
       CASE WHEN value_delta > 0 THEN '▲ '
            WHEN value_delta < 0 THEN '▼ '
            ELSE '― ' END
       || rtrim(to_char(abs(value_delta),'FM999,999,990.99'),'.')      AS "증감",
       rtrim(to_char(value_after,'FM999,999,990.99'),'.')  || COALESCE(unit,'') AS "변경",
       'p.' || page_no                                                AS "근거"
  FROM fact
 WHERE tenant_id = 'MIA-002'
   AND notice_id = '2026-032'
   AND value_delta IS NOT NULL
   AND value_delta <> 0
 ORDER BY abs(value_delta) DESC
 LIMIT 15;


-- ═════════════════════════════════════════════════════════════════════════
--  Q2. "총 몇 세대가 되나요?"
-- ═════════════════════════════════════════════════════════════════════════
SELECT metric_label AS "구분",
       value_before AS "기정",
       value_delta  AS "증감",
       value_after  AS "변경",
       basis_note   AS "산출근거",
       'p.' || page_no AS "근거"
  FROM fact
 WHERE tenant_id = 'MIA-002' AND topic = 'UNIT'
   AND metric_code IN ('UNIT_TOTAL','UNIT_U60','UNIT_60_85','UNIT_O85')
 ORDER BY CASE metric_code
            WHEN 'UNIT_TOTAL' THEN 1 WHEN 'UNIT_U60' THEN 2
            WHEN 'UNIT_60_85' THEN 3 ELSE 4 END;


-- ═════════════════════════════════════════════════════════════════════════
--  Q3. "용적률이 어떻게 변했나요?"   ★ 한 단어에 4개의 답이 있는 구간
--      다알아는 이 4개를 모두 보여주고 되묻는다 (제1권 UX ②)
-- ═════════════════════════════════════════════════════════════════════════
SELECT metric_label AS "용적률 종류",
       value_before AS "기정",
       value_after  AS "변경",
       basis_note   AS "설명",
       'p.' || page_no AS "근거"
  FROM fact
 WHERE tenant_id = 'MIA-002' AND topic = 'FAR'
   AND metric_code LIKE 'FAR%'          -- 건폐율(BCR)은 제외
 ORDER BY COALESCE(value_after, value_before);


-- ═════════════════════════════════════════════════════════════════════════
--  Q4. "임대주택이 줄었나요, 늘었나요?"
--      ★ 둘 다 사실이라 산출근거 없이 답하면 분쟁이 된다
-- ═════════════════════════════════════════════════════════════════════════
SELECT metric_label AS "구분",
       value_before AS "기정",
       value_after  AS "변경",
       CASE WHEN value_delta > 0 THEN '증가'
            WHEN value_delta < 0 THEN '감소'
            ELSE '동일' END AS "방향",
       basis_note   AS "★ 산출근거"
  FROM fact
 WHERE tenant_id = 'MIA-002'
   AND metric_code IN ('RENT_TOTAL','RENT_OBLIGATION','RENT_RATIO','RENT_BASE_UNITS')
 ORDER BY CASE metric_code
            WHEN 'RENT_TOTAL' THEN 1 WHEN 'RENT_OBLIGATION' THEN 2
            WHEN 'RENT_RATIO' THEN 3 ELSE 4 END;


-- ═════════════════════════════════════════════════════════════════════════
--  Q5. "몇 층까지 지어지나요?"
-- ═════════════════════════════════════════════════════════════════════════
SELECT metric_label AS "항목",
       value_before || COALESCE(unit,'') AS "기정",
       value_after  || COALESCE(unit,'') AS "변경",
       'p.' || page_no AS "근거"
  FROM fact
 WHERE tenant_id = 'MIA-002' AND topic = 'HEIGHT';


-- ═════════════════════════════════════════════════════════════════════════
--  Q6. "언제 이주하고 언제 입주하나요?"
-- ═════════════════════════════════════════════════════════════════════════
SELECT metric_label AS "일정",
       value_before || '년' AS "기정",
       value_after  || '년' AS "변경",
       basis_note   AS "상세",
       'p.' || page_no AS "근거"
  FROM fact
 WHERE tenant_id = 'MIA-002' AND topic = 'SCHED'
 ORDER BY metric_code;


-- ═════════════════════════════════════════════════════════════════════════
--  Q7. "공원하고 학교는 어떻게 되나요?"
-- ═════════════════════════════════════════════════════════════════════════
SELECT metric_label AS "시설",
       rtrim(to_char(value_before,'FM999,999,990.9'),'.') || '㎡' AS "기정",
       rtrim(to_char(value_after,'FM999,999,990.9'),'.') || '㎡' AS "변경",
       basis_note AS "변경 사유",
       'p.' || page_no AS "근거"
  FROM fact
 WHERE tenant_id = 'MIA-002' AND topic IN ('PARK','SCHOOL')
 ORDER BY topic, metric_code;


-- ═════════════════════════════════════════════════════════════════════════
--  Q8. 원장 적재 현황 (관리자용)
-- ═════════════════════════════════════════════════════════════════════════
SELECT topic AS "분류",
       count(*) AS "항목수",
       count(*) FILTER (WHERE verified_at IS NOT NULL) AS "검수완료",
       count(*) FILTER (WHERE verified_at IS NULL)     AS "미검수"
  FROM fact
 WHERE tenant_id = 'MIA-002'
 GROUP BY ROLLUP(topic)
 ORDER BY topic NULLS LAST;
