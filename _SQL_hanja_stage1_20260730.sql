-- ═══════════════════════════════════════════════════════════════════
--  _SQL_hanja_stage1_20260730.sql
--  1단계 — 한자 DB 데이터 오염 정제 + 자원오행 표준 컬럼 신설
-- ═══════════════════════════════════════════════════════════════════
--
--  근거 자료 : ___덕암_인명용한자_가나다_599페이지_완성.xlsx  (시트 '인명용한자')
--              5,111행 · 13열 — 전수 조사한 결과를 각 단계에 적어 두었습니다
--
--  ⚠️⚠️ 읽는 방법 — 한 번에 다 돌리지 마십시오.
--     STEP 마다 «확인 쿼리» 가 붙어 있습니다. 결과를 눈으로 보고 다음으로 가십시오.
--     STEP 4(중복)와 STEP 6(불용)은 **연재쌤 판단이 필요한 자리**라 자동 처리하지 않습니다.
--
--  ⚠️ 지우는 문장이 하나도 없습니다. (교훈 CR — 이 저장소에서 지운 것은 되살리기 어렵습니다)
--     원본 컬럼 resource_ohaeng 은 끝까지 남깁니다. 옮긴 값이 맞는지 대조할 유일한 근거입니다.
--
--  ⚠️ 전제 — 지금 hanja 표의 컬럼은 코드가 select 하는 아홉 개로 봅니다.
--       hangul, hanja, meaning, strokes, resource_ohaeng,
--       sound_ohaeng, avoid_hard, avoid_soft, grade
--     그리고 `grade` 가 엑셀의 «자의품격»(大吉/中吉/小吉/不用) 이라고 봅니다.
--       근거: diagnosis/page.tsx:115  if (row.grade === '不用') return true
--     ★다르면 STEP 0 의 확인 쿼리에서 드러납니다. 거기서 멈추십시오.
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- STEP 0.  손대기 전 — 지금 상태를 «눈으로» 봅니다
-- ═══════════════════════════════════════════════════════════════════

-- 0-1) 실제 컬럼 구성 확인 (위 전제가 맞는지)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'hanja'
ORDER BY ordinal_position;

-- 0-2) ★가장 중요한 한 줄 — 자원오행이 어떤 «표기» 로 들어 있는가
--
--   [엑셀 원자료 실측]  자원오행 컬럼은 100% 한자였습니다. 한글이 한 글자도 없습니다.
--       木 1,449 · 火 1,048 · 水 1,019 · 金 824 · 土 771   (합 5,111)
--
--   [그래서 무엇이 벌어졌나]
--     lib/saju/naming.ts 의 상생표는 «한글» 키입니다 — GENERATES = { 목:'화', … }
--     따라서 GENERATES['木'] 은 undefined 이고,
--       · 자원오행 상생 판정이 언제나 0건   → 등급 언제나 '아쉬움'
--       · 용신(한글 '목')과 대조도 언제나 false → 사주보완 언제나 '아쉬움'
--     이 되었습니다. 등급은 화면에 안 나오는 것이 방침이라 눈에 띌 자리가 없었고,
--     대신 AI 에게 「상생 0건 · 용신 없음」이라는 **틀린 사실** 이 나갔습니다.
--
--   [영향 실측]  실제 5,111자에서 무작위 이름 4,000개를 만들어 재보니 —
--       자원오행 상생 판정이 바뀜   65.0%
--       용신 충족 여부가 바뀜       35.8%
--       ★종합 등급이 바뀜          64.8%
SELECT resource_ohaeng, COUNT(*) AS n
FROM hanja
GROUP BY resource_ohaeng
ORDER BY n DESC;

-- 0-3) grade 가 정말 자의품격인가
--   [엑셀 실측]  小吉 2,225 · 中吉 1,642 · 不用 947 · 大吉 297
SELECT grade, COUNT(*) AS n FROM hanja GROUP BY grade ORDER BY n DESC;

-- 0-4) 전체 행 수 (엑셀은 5,111행)
SELECT COUNT(*) AS 전체행, COUNT(DISTINCT hanja) AS 고유한자, COUNT(DISTINCT hangul) AS 고유음
FROM hanja;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 1.  🔴 공백·비가시문자 오염 정제
-- ═══════════════════════════════════════════════════════════════════
--
--   [엑셀 실측]  전체 5,111행 × 10컬럼을 훑어 오염은 **딱 한 건** 이었습니다.
--       행 5002   한자 컬럼   ' 熺'   ← 앞에 일반 공백(U+0020) 하나
--
--   [왜 위험한가] 이 값으로는 아무것도 조회되지 않습니다.
--     `WHERE hanja = '熺'` 가 안 걸리고, 화면에는 «熺» 로 정상처럼 보입니다.
--     그리고 이 글자를 고른 손님의 이름이 저장되면 그 레코드가 계속 어긋납니다.
--
--   ⚠️ trim() 만으로는 부족합니다. 폭 없는 문자(U+200B ZWSP·U+200C·U+200D·U+2060)는
--      공백이 아니어서 trim 이 남깁니다. 아래는 그것까지 걷어냅니다.
--      (코드 쪽 짝은 lib/saju/ohaeng.ts 의 stripInvisible / cleanHanja 입니다)

-- 1-1) 먼저 «몇 건인가» 를 셉니다 — 0건이면 STEP 2 로
SELECT id, hangul, hanja,
       length(hanja)                        AS 글자수,
       encode(convert_to(hanja,'UTF8'),'hex') AS 바이트
FROM hanja
WHERE hanja <> regexp_replace(
        btrim(hanja, E' \t\n\r\u00a0\u3000'),
        E'[\u200b\u200c\u200d\u2060\ufeff]', '', 'g')
   OR hangul <> btrim(hangul)
   OR resource_ohaeng <> btrim(resource_ohaeng);

-- 1-2) 정제 — ★원본을 남기기 위해 백업 컬럼을 먼저 만듭니다
ALTER TABLE hanja ADD COLUMN IF NOT EXISTS hanja_raw text;

UPDATE hanja
SET hanja_raw = hanja
WHERE hanja_raw IS NULL
  AND hanja <> regexp_replace(btrim(hanja, E' \t\n\r\u00a0\u3000'),
                              E'[\u200b\u200c\u200d\u2060\ufeff]', '', 'g');

UPDATE hanja
SET hanja = regexp_replace(btrim(hanja, E' \t\n\r\u00a0\u3000'),
                           E'[\u200b\u200c\u200d\u2060\ufeff]', '', 'g')
WHERE hanja <> regexp_replace(btrim(hanja, E' \t\n\r\u00a0\u3000'),
                              E'[\u200b\u200c\u200d\u2060\ufeff]', '', 'g');

UPDATE hanja SET hangul = btrim(hangul)                   WHERE hangul <> btrim(hangul);
UPDATE hanja SET resource_ohaeng = btrim(resource_ohaeng) WHERE resource_ohaeng <> btrim(resource_ohaeng);

-- 1-3) 확인 — 0건이어야 합니다
SELECT COUNT(*) AS 남은오염 FROM hanja
WHERE hanja <> btrim(hanja) OR hangul <> btrim(hangul);

-- 1-4) ★재발 방지 — 앞뒤 공백이 다시 들어오지 못하게
ALTER TABLE hanja
  ADD CONSTRAINT hanja_no_pad_ck
  CHECK (hanja = btrim(hanja) AND hangul = btrim(hangul));


-- ═══════════════════════════════════════════════════════════════════
-- STEP 2.  ★자원오행 표준 컬럼 신설 (resource_ohaeng_primary)
-- ═══════════════════════════════════════════════════════════════════

-- 2-1) 컬럼 추가 (원본은 그대로 둡니다)
ALTER TABLE hanja ADD COLUMN IF NOT EXISTS resource_ohaeng_primary text;

COMMENT ON COLUMN hanja.resource_ohaeng IS
  '원본 표기. 엑셀 원자료는 한자(木火土金水)입니다. ★판정에 쓰지 마십시오.';
COMMENT ON COLUMN hanja.resource_ohaeng_primary IS
  '표준 표기(목|화|토|금|수). 코드는 이 컬럼만 씁니다. lib/saju/ohaeng.ts 와 짝입니다.';

-- 2-2) 값 옮기기
--   ⚠️ 한자·한글·괄호 혼합 표기를 함께 받습니다.
--      순서가 «목→화→토→금→수» 인 것은 lib/saju/ohaeng.ts 의 우선순위와 맞추기 위함입니다.
--      («土金» 처럼 둘이 섞인 값이 있으면 앞엣것을 고릅니다 — 2-4 에서 잡힙니다)
UPDATE hanja SET resource_ohaeng_primary = CASE
  WHEN resource_ohaeng LIKE '%목%' OR resource_ohaeng LIKE '%木%' THEN '목'
  WHEN resource_ohaeng LIKE '%화%' OR resource_ohaeng LIKE '%火%' THEN '화'
  WHEN resource_ohaeng LIKE '%토%' OR resource_ohaeng LIKE '%土%' THEN '토'
  WHEN resource_ohaeng LIKE '%금%' OR resource_ohaeng LIKE '%金%' THEN '금'
  WHEN resource_ohaeng LIKE '%수%' OR resource_ohaeng LIKE '%水%' THEN '수'
  ELSE NULL
END;

-- 2-3) ★못 옮긴 줄을 «눈으로» 봅니다 — 0건이어야 STEP 2-5 로 갑니다
--      (엑셀 원자료 기준으로는 0건이 나와야 합니다)
SELECT id, hangul, hanja, resource_ohaeng
FROM hanja
WHERE resource_ohaeng_primary IS NULL;

-- 2-4) 둘 이상이 섞인 값이 있었는지 (있으면 2단계에서 secondary 로 보낼 후보)
SELECT id, hangul, hanja, resource_ohaeng, resource_ohaeng_primary
FROM hanja
WHERE (CASE WHEN resource_ohaeng ~ '[목木]' THEN 1 ELSE 0 END
     + CASE WHEN resource_ohaeng ~ '[화火]' THEN 1 ELSE 0 END
     + CASE WHEN resource_ohaeng ~ '[토土]' THEN 1 ELSE 0 END
     + CASE WHEN resource_ohaeng ~ '[금金]' THEN 1 ELSE 0 END
     + CASE WHEN resource_ohaeng ~ '[수水]' THEN 1 ELSE 0 END) > 1;

-- 2-5) 옮긴 값이 맞는지 원본과 대조 (다섯 줄 × 개수가 STEP 0-2 와 같아야 합니다)
SELECT resource_ohaeng AS 원본, resource_ohaeng_primary AS 표준, COUNT(*) AS n
FROM hanja GROUP BY 1,2 ORDER BY n DESC;

-- 2-6) ★★제약 — 이 한 줄이 오염의 재발을 원천 차단합니다
--      ⚠️ 위 2-3 이 0건이 된 뒤에만 실행하십시오. NULL 이 남아 있으면 실패합니다.
ALTER TABLE hanja
  ALTER COLUMN resource_ohaeng_primary SET NOT NULL;

ALTER TABLE hanja
  ADD CONSTRAINT hanja_res_primary_ck
  CHECK (resource_ohaeng_primary IN ('목','화','토','금','수'));


-- ═══════════════════════════════════════════════════════════════════
-- STEP 3.  획수 — 강희자전 원획수 컬럼 (strokes_kangxi)
-- ═══════════════════════════════════════════════════════════════════
--
--   [왜 컬럼을 새로 두나]
--     수리 4격(초년·청년·중년·말년)은 **원획법**(강희자전 획수)으로 셉니다.
--     지금 `strokes` 가 원획인지 실획인지 컬럼 이름만으로는 알 수 없습니다.
--     엑셀 원자료의 «획수» 는 원획으로 보이지만(부수 변형자를 본래 부수 획으로 셈),
--     ★확인 못 했으므로 이름을 명시적으로 갈라 둡니다.
--
--   ⚠️ 지금은 strokes 를 그대로 복사만 합니다. 값을 바꾸지 않습니다.
--      코드(naming.ts scoreSuri)가 strokes_kangxi 를 읽도록 옮기는 것은 2단계입니다.

ALTER TABLE hanja
  ADD COLUMN IF NOT EXISTS strokes_kangxi smallint,   -- 강희 원획 (수리·음양 계산 기준)
  ADD COLUMN IF NOT EXISTS strokes_actual smallint;   -- 실획 (참고. 유파차 대응)

COMMENT ON COLUMN hanja.strokes_kangxi IS
  '강희자전 원획수. ★수리 4격과 음양은 이 값으로 셉니다(원획법).';
COMMENT ON COLUMN hanja.strokes_actual IS
  '실획수. 참고용. 원획법을 쓰는 동안 판정에 쓰지 마십시오.';

UPDATE hanja SET strokes_kangxi = strokes WHERE strokes_kangxi IS NULL;

ALTER TABLE hanja
  ADD CONSTRAINT hanja_strokes_kangxi_ck
  CHECK (strokes_kangxi IS NULL OR strokes_kangxi BETWEEN 1 AND 64);

-- 3-1) ★파생값 정합성 검사 — 엑셀에서 어긋남이 나왔습니다
--
--   [엑셀 실측]
--     · 획수 → 획수오행 규칙(1,2=木 3,4=火 5,6=土 7,8=金 9,0=水) 어긋남  49건
--     · 획수 → 음양 규칙(홀=양, 짝=음)                        어긋남  56건
--
--   ⚠️ 어느 쪽이 틀렸는지 **알 수 없습니다.**
--      획수가 오타일 수도 있고, 획수오행/음양이 오타일 수도 있습니다.
--      → 자동으로 고치지 않습니다. 검토 목록으로만 뽑습니다.
--      → 코드는 획수에서 «계산» 하므로(naming.ts scoreYinYang) 화면은 이미 획수를 따릅니다.
--        즉 지금 당장 손님에게 나가는 값은 획수 기준입니다.
--
--   ★hanja 표에 획수오행·음양 컬럼이 없으면 이 쿼리는 건너뛰십시오.
--     엑셀에는 있고 표에는 없을 수 있습니다(STEP 0-1 로 확인).


-- ═══════════════════════════════════════════════════════════════════
-- STEP 4.  🔴 중복 레코드 — ★자동 삭제하지 않습니다
-- ═══════════════════════════════════════════════════════════════════
--
--   [엑셀 실측]  (자음, 한자) 가 겹치는 쌍 **21쌍 / 42행**.
--                그 가운데 **19쌍은 내용이 서로 다릅니다.**
--
--   [구조적 원인]  행 5020 부터 자음이 «가» 로 되돌아가 «희» 까지 다시 흐릅니다.
--                 두 번째 배치(약 92행)가 **병합 없이 덧붙여진** 것입니다.
--
--   [무엇이 어긋나나 — 획수가 다른 것이 가장 위험합니다]
--       린 麟   23획(鹿부) ↔ 17획(鹿부)          ← 수리 4격이 통째로 달라집니다
--       림 琳   13획 자원金 ↔ 12획 자원木        ← 획수와 자원오행이 «둘 다» 다름
--       명 明    8획 자원火 ↔  9획 자원木        ← 부수까지 다름(日 ↔ 目)
--       윤 潤   16획 자원水 ↔ 15획 자원木        ← 부수 다름(水 ↔ 門)
--       유 牖    9획 자원土 ↔ 15획 자원木
--       반 斑   12획 자원木 ↔ 17획 자원水
--       경 冏    7획 자원火(冂부) ↔ 7획 자원水(口부)
--       예 藝   21획(艹) ↔ 17획(艸)
--       그 밖 — 嶼·聖·嬿·甕·慚·儇·瀅·譓·澔·曦·壻  (품격·비고만 다른 것도 있음)
--
--   ⚠️⚠️ **어느 쪽이 옳은지 저는 모릅니다.** 원본(덕암 책)을 봐야 갈립니다.
--      엑셀의 «확인필요» 컬럼에 이미 편찬자가 「원본 재확인 필요」를 적어 둔 행도 있습니다.
--      → 지우지 않고 **한쪽을 «쉬게»** 합니다. 되돌릴 수 있습니다. (교훈 CR·DX)

-- 4-1) is_active 플래그 신설 — «지우기» 대신 «안 보이게»
ALTER TABLE hanja ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE hanja ADD COLUMN IF NOT EXISTS review_note text;

COMMENT ON COLUMN hanja.is_active IS
  '한자 고르기 목록에 낼지. false 는 «지운 것» 이 아니라 «쉬는 것» 입니다. 되살릴 수 있습니다.';
COMMENT ON COLUMN hanja.review_note IS
  '검토 사유. 중복·불일치처럼 사람이 판단해야 하는 자리를 적어 둡니다.';

-- 4-2) 중복을 «먼저» 눈으로 봅니다
SELECT hangul, hanja, COUNT(*) AS n,
       array_agg(id             ORDER BY id) AS ids,
       array_agg(strokes        ORDER BY id) AS 획수들,
       array_agg(resource_ohaeng_primary ORDER BY id) AS 자원오행들,
       array_agg(grade          ORDER BY id) AS 품격들,
       COUNT(DISTINCT (strokes, resource_ohaeng_primary, grade)) AS 서로다른내용
FROM hanja
GROUP BY hangul, hanja
HAVING COUNT(*) > 1
ORDER BY 서로다른내용 DESC, hangul;

-- 4-3) 내용이 «같은» 중복만 정리합니다 — 이건 판단이 필요 없습니다
--      (엑셀 실측: 凜·揷 두 쌍이 여기 해당)
WITH dup AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY hangul, hanja, strokes, resource_ohaeng_primary, grade
           ORDER BY id
         ) AS rn
  FROM hanja
)
UPDATE hanja h
SET is_active = false,
    review_note = coalesce(h.review_note || ' / ', '') || '내용이 같은 중복 — 앞엣것을 씁니다'
FROM dup
WHERE h.id = dup.id AND dup.rn > 1;

-- 4-4) 내용이 «다른» 중복은 **표시만** 하고 둘 다 살려 둡니다
--      ★연재쌤이 원본을 보고 고르실 목록입니다
WITH conflict AS (
  SELECT hangul, hanja
  FROM hanja
  WHERE is_active
  GROUP BY hangul, hanja
  HAVING COUNT(*) > 1
)
UPDATE hanja h
SET review_note = coalesce(h.review_note || ' / ', '')
               || '★중복(내용 다름) — 원본 재확인 필요. 획수가 다르면 수리 4격이 달라집니다'
FROM conflict c
WHERE h.hangul = c.hangul AND h.hanja = c.hanja AND h.is_active;

-- 4-5) ★연재쌤께 드릴 검토표
SELECT hangul AS 음, hanja AS 한자, id,
       strokes AS 획수, resource_ohaeng_primary AS 자원오행, grade AS 품격,
       meaning AS 뜻, review_note AS 사유
FROM hanja
WHERE review_note LIKE '%원본 재확인%'
ORDER BY hangul, hanja, id;

-- 4-6) ⚠️ 유일 제약은 **아직 걸지 마십시오.**
--      4-4 의 충돌이 해소된 뒤에 걸어야 합니다. 지금 걸면 실패합니다.
-- CREATE UNIQUE INDEX hanja_hangul_hanja_uq ON hanja (hangul, hanja) WHERE is_active;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 5.  🔴 오행 표기 불일치 (같은 한자가 다른 자원오행)
-- ═══════════════════════════════════════════════════════════════════
--
--   [무엇을 보나]  «같은 한자» 가 서로 다른 자원오행을 갖는 자리입니다.
--     동자이음(같은 글자, 다른 음)이면 정상일 수 있습니다 —
--     엑셀 비고에 «동자이음» 이 1,057건 있습니다.
--     그러나 «같은 음 + 같은 한자» 인데 자원오행이 다르면 오류입니다.
--
--   [엑셀 실측]  STEP 4 의 중복 21쌍 가운데 자원오행이 실제로 갈린 것 —
--       林(金↔木) · 明(火↔木) · 潤(水↔木) · 牖(土↔木) · 斑(木↔水) · 冏(火↔水)
--     여섯 글자입니다.

-- 5-1) 같은 음 + 같은 한자인데 자원오행이 다른 자리 (★오류)
SELECT hangul, hanja,
       array_agg(DISTINCT resource_ohaeng_primary) AS 자원오행들,
       array_agg(id ORDER BY id) AS ids
FROM hanja
GROUP BY hangul, hanja
HAVING COUNT(DISTINCT resource_ohaeng_primary) > 1;

-- 5-2) 같은 한자인데 «음이 달라» 자원오행이 다른 자리 (동자이음 — 정상일 수 있음)
SELECT hanja,
       array_agg(DISTINCT hangul) AS 음들,
       array_agg(DISTINCT resource_ohaeng_primary) AS 자원오행들,
       COUNT(*) AS n
FROM hanja
GROUP BY hanja
HAVING COUNT(DISTINCT resource_ohaeng_primary) > 1
   AND COUNT(DISTINCT hangul) > 1
ORDER BY n DESC;

--   ⚠️ 5-2 는 **고치지 마십시오.** 음이 다르면 자원오행이 달라도 되는 유파가 있습니다.
--      5-1 만 연재쌤 검토 대상입니다.


-- ═══════════════════════════════════════════════════════════════════
-- STEP 6.  불용한자 플래그 (is_name_use)
-- ═══════════════════════════════════════════════════════════════════
--
--   [지금 어떻게 하고 있나]
--     diagnosis/page.tsx:115   if (row.grade === '不用') return true
--     ★한자 문자열 비교입니다. 표기가 하나만 달라도(不用 / 불용 / 공백) 조용히 통과합니다.
--     STEP 1 의 ' 熺' 와 같은 종류의 위험입니다.
--
--   [엑셀 실측]
--     자의품격 «不用»              947건
--     비고 «불가» 계열 합           941건   (불가 709 + 불가;동자이음 222 + 불가;신체 5
--                                          + 불가;신체;동자이음 2 + 불가;어류 2 + 불가(신체) 1)
--     ★둘이 6건 어긋납니다. 편찬자가 «확인필요» 에 적어 둔 것과 겹칩니다.
--
--       不用 인데 비고가 비어 있음        覡 (행 212)                     1건
--       비고가 «불가» 인데 품격이 不用 아님  諫(小吉) · 爺(小吉) · 褑(小吉)   3건
--       大吉 인데 비고가 «사용»            3건   ← 遠·園 등, 편찬자 주석 있음
--       中吉 인데 비고가 «선별사용»          1건
--       小吉 인데 비고가 «사용»             1건
--                                        ─────
--                                          9건
--
--   ⚠️ «불가(신체)» 는 구분자가 세미콜론이 아니라 괄호입니다 — 파싱 시 둘 다 받으십시오.

ALTER TABLE hanja ADD COLUMN IF NOT EXISTS is_name_use boolean;

COMMENT ON COLUMN hanja.is_name_use IS
  '인명에 쓸 수 있는가. ★grade 문자열 비교(=''不用'') 대신 이 값을 쓰십시오.';

-- 6-1) grade 로부터 채웁니다 (지금 코드와 «같은» 잣대 — 행동이 안 바뀝니다)
UPDATE hanja
SET is_name_use = (btrim(grade) <> '不用')
WHERE is_name_use IS NULL AND grade IS NOT NULL;

-- 6-2) grade 가 비었으면 «안전한 쪽» 으로 둡니다
--   ⚠️ NULL 을 true 로 보지 마십시오. 모르는 글자를 손님에게 권하게 됩니다.
UPDATE hanja SET is_name_use = false WHERE is_name_use IS NULL;

-- 6-3) ★품격 ↔ 비고 불일치 검토표 (hanja 표에 비고 컬럼이 있을 때만)
--      없으면 엑셀에서 그대로 뽑아 연재쌤께 드리십시오. 9건입니다.
SELECT id, hangul, hanja, grade, is_name_use, meaning
FROM hanja
WHERE grade = '不用' AND is_name_use IS DISTINCT FROM false
ORDER BY hangul;

-- 6-4) 확인 — 947건 안팎이어야 합니다
SELECT is_name_use, COUNT(*) FROM hanja GROUP BY 1;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 7.  코드가 볼 뷰 — 화면은 이것만 읽습니다
-- ═══════════════════════════════════════════════════════════════════
--
--   [왜 뷰인가]  화면마다 «어떤 것을 걸러야 하는가» 를 기억하지 않아도 되게 하려는 것입니다.
--     지금은 화면이 각자 grade·avoid_hard 를 보며 걸렀고, 그래서 어긋났습니다.

CREATE OR REPLACE VIEW hanja_pickable AS
SELECT
  id, hangul, hanja, meaning,
  strokes,
  strokes_kangxi,
  resource_ohaeng_primary AS resource_ohaeng,   -- ★코드가 쓰는 이름으로 내보냅니다
  resource_ohaeng          AS resource_ohaeng_raw,
  sound_ohaeng,
  avoid_hard, avoid_soft,
  grade, is_name_use
FROM hanja
WHERE is_active
  AND is_name_use;

COMMENT ON VIEW hanja_pickable IS
  '한자 고르기 화면이 읽을 목록. 쉬는 줄(is_active=false)과 불용자를 이미 걸렀습니다. '
  'resource_ohaeng 은 표준 표기(목|화|토|금|수)로 나갑니다.';

-- 7-1) 뷰가 몇 줄인가 (5,111 - 불용 947 - 쉬는 중복 ≒ 4,160 안팎)
SELECT COUNT(*) AS 고를수있는한자 FROM hanja_pickable;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 8.  되돌리기 (rollback)
-- ═══════════════════════════════════════════════════════════════════
--
--   ⚠️ STEP 1 의 한자 정제는 hanja_raw 에 원본이 남아 있으므로 되돌릴 수 있습니다.
--      그 밖은 컬럼 추가뿐이라 지우면 원상복구됩니다.

-- DROP VIEW IF EXISTS hanja_pickable;
-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_res_primary_ck;
-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_no_pad_ck;
-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_strokes_kangxi_ck;
-- ALTER TABLE hanja ALTER COLUMN resource_ohaeng_primary DROP NOT NULL;
-- UPDATE hanja SET hanja = hanja_raw WHERE hanja_raw IS NOT NULL;   -- 한자 정제 되돌리기
-- ALTER TABLE hanja
--   DROP COLUMN IF EXISTS resource_ohaeng_primary,
--   DROP COLUMN IF EXISTS strokes_kangxi,
--   DROP COLUMN IF EXISTS strokes_actual,
--   DROP COLUMN IF EXISTS is_name_use,
--   DROP COLUMN IF EXISTS is_active,
--   DROP COLUMN IF EXISTS review_note,
--   DROP COLUMN IF EXISTS hanja_raw;


-- ═══════════════════════════════════════════════════════════════════
--  ⚠️ 2단계로 넘길 것 — 이 파일에서 «하지 않은» 것
-- ═══════════════════════════════════════════════════════════════════
--
--   · resource_ohaeng_secondary (복수 자원오행) · radical / radical_ohaeng / meaning_ohaeng
--     resource_basis · resource_confidence · school_variants
--       → 엑셀에 «부수» 컬럼이 이미 있습니다. 2단계에서 옮기면 됩니다.
--   · 코드가 strokes 대신 strokes_kangxi 를 읽게 옮기기
--   · 코드가 hanja 표 대신 hanja_pickable 뷰를 읽게 옮기기
--   · 획수오행·음양 어긋남(49·56건) 연재쌤 판정 뒤 반영
--   · 중복 19쌍 판정 뒤 유일 제약(4-6) 걸기
--   · 엑셀의 «자의품격/비고/확인필요» 를 표에 정식 컬럼으로 올리기
--
--   ★그리고 검사 그물 — 16-verify-naming.ts (지금 0건입니다)
--     ① resource_ohaeng_primary 가 다섯 값 밖인 줄이 0건인가
--     ② 같은 음+한자인데 자원오행이 다른 줄이 0건인가
--     ③ 앞뒤 공백이 있는 hanja·hangul 이 0건인가
