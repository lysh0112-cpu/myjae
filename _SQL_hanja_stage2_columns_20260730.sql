-- ═══════════════════════════════════════════════════════════════════
--  _SQL_hanja_stage2_columns_20260730.sql
--  2단계 DB — 자원오행 표준 컬럼 + 부수·원획·불용 컬럼
--
--  ★대표님이 주신 스크립트를 바탕으로 다섯 자리를 고쳤습니다.
--    ① is_name_use DEFAULT true  →  不用 947건이 true 가 됩니다 (가장 위험)
--    ② strokes_kangxi 를 채우지 않았음  →  전부 NULL. 수리 계산이 깨집니다
--    ③ CHECK 이 NULL 허용  →  STEP 3 이 0건이면 NOT NULL 로 조입니다
--    ④ 검증 쿼리가 resource_ohaeng IS NULL 인 행을 놓침
--    ⑤ ADD COLUMN 에 IF NOT EXISTS 없음  →  두 번 돌리면 실패
--
--  ⚠️ 한 STEP 씩 돌리고 «확인 쿼리» 결과를 눈으로 보십시오.
--  ⚠️ 지우는 문장이 하나도 없습니다. (교훈 CR)
-- ═══════════════════════════════════════════════════════════════════


-- ═══════════════════════════════════════════════════════════════════
-- STEP 0.  손대기 전 — 지금 상태
-- ═══════════════════════════════════════════════════════════════════

-- 0-1) 자원오행 표기 분포 (2026-07-30 실측: 木 2,446 · 水 1,846 · 火 1,752 · 金 1,325 · 土 1,281 = 8,650)
SELECT resource_ohaeng, COUNT(*) AS n FROM hanja GROUP BY 1 ORDER BY n DESC;

-- 0-2) NULL·빈 값이 있는가 (위 GROUP BY 에 NULL 줄이 없었으므로 0건이어야 합니다)
SELECT COUNT(*) AS 자원오행없음 FROM hanja
WHERE resource_ohaeng IS NULL OR btrim(resource_ohaeng) = '';

-- 0-3) grade(자의품격) 분포 — is_name_use 를 여기서 만듭니다
SELECT grade, COUNT(*) AS n FROM hanja GROUP BY 1 ORDER BY n DESC;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 1.  🔴 hanja 컬럼 공백 정제 — ★자원오행보다 먼저입니다
-- ═══════════════════════════════════════════════════════════════════
--
--   [왜 먼저인가]  덕암 원자료 행 5002 에 `' 熺'`(앞에 일반 공백)이 있었습니다.
--     이 값으로는 `WHERE hanja = '熺'` 가 안 걸리고 화면에는 «熺» 로 정상처럼 보입니다.
--     ⚠️ Postgres 의 TRIM(x) 은 «일반 공백만» 걷어냅니다.
--        탭·NBSP(U+00A0)·전각공백(U+3000)·ZWSP(U+200B)·BOM 은 남습니다.
--        아래는 그것까지 걷어냅니다. (코드 쪽 짝은 lib/saju/ohaeng.ts 의 cleanHanja)

-- 1-1) 몇 건인가 — 0건이면 STEP 2 로
SELECT id, hangul, hanja, encode(convert_to(hanja, 'UTF8'), 'hex') AS 바이트
FROM hanja
WHERE hanja <> regexp_replace(
        btrim(hanja, E' \t\n\r\u00a0\u3000'),
        E'[\u200b\u200c\u200d\u2060\ufeff]', '', 'g')
   OR hangul <> btrim(hangul);

-- 1-2) 원본을 남기고 정제
ALTER TABLE hanja ADD COLUMN IF NOT EXISTS hanja_raw text;

UPDATE hanja SET hanja_raw = hanja
WHERE hanja_raw IS NULL
  AND hanja <> regexp_replace(btrim(hanja, E' \t\n\r\u00a0\u3000'),
                              E'[\u200b\u200c\u200d\u2060\ufeff]', '', 'g');

UPDATE hanja
SET hanja = regexp_replace(btrim(hanja, E' \t\n\r\u00a0\u3000'),
                           E'[\u200b\u200c\u200d\u2060\ufeff]', '', 'g')
WHERE hanja <> regexp_replace(btrim(hanja, E' \t\n\r\u00a0\u3000'),
                              E'[\u200b\u200c\u200d\u2060\ufeff]', '', 'g');

UPDATE hanja SET hangul = btrim(hangul) WHERE hangul <> btrim(hangul);

-- 1-3) 확인 — 0건이어야 합니다
SELECT COUNT(*) AS 남은오염 FROM hanja
WHERE hanja <> btrim(hanja) OR hangul <> btrim(hangul);


-- ═══════════════════════════════════════════════════════════════════
-- STEP 2.  ★자원오행 표준 컬럼
-- ═══════════════════════════════════════════════════════════════════

-- 2-1) 컬럼 추가  ★IF NOT EXISTS — 두 번 돌려도 안전합니다
ALTER TABLE hanja ADD COLUMN IF NOT EXISTS resource_ohaeng_primary text;

-- 2-2) 값 옮기기
--   ⚠️ TRIM 을 안 씁니다 — LIKE '%…%' 는 양쪽 와일드카드라 공백이 있어도 걸립니다.
--      TRIM 을 붙이면 «공백을 처리했다» 는 착각만 남습니다(실제로는 무의미).
--      진짜 공백 처리는 STEP 1 에서 끝냈습니다.
--   ⚠️ 순서(목→화→토→금→수)는 lib/saju/ohaeng.ts 의 우선순위와 맞춘 것입니다.
UPDATE hanja SET resource_ohaeng_primary = CASE
  WHEN resource_ohaeng LIKE '%목%' OR resource_ohaeng LIKE '%木%' THEN '목'
  WHEN resource_ohaeng LIKE '%화%' OR resource_ohaeng LIKE '%火%' THEN '화'
  WHEN resource_ohaeng LIKE '%토%' OR resource_ohaeng LIKE '%土%' THEN '토'
  WHEN resource_ohaeng LIKE '%금%' OR resource_ohaeng LIKE '%金%' THEN '금'
  WHEN resource_ohaeng LIKE '%수%' OR resource_ohaeng LIKE '%水%' THEN '수'
  ELSE NULL
END;

-- 2-3) ★검증 — «조건 없이» 셉니다
--   ⚠️ `resource_ohaeng IS NOT NULL AND primary IS NULL` 로 좁히면
--      원본이 NULL 인 행을 놓칩니다. 그 행도 primary 가 NULL 이라 문제인데 안 보입니다.
--   ★0건이어야 2-5 로 갑니다. 8,650행 기준으로는 0건이 나옵니다.
SELECT id, hangul, hanja, resource_ohaeng
FROM hanja
WHERE resource_ohaeng_primary IS NULL;

-- 2-4) 둘 이상 섞인 값이 있었는가 (있으면 secondary 후보)
SELECT id, hangul, hanja, resource_ohaeng, resource_ohaeng_primary
FROM hanja
WHERE (CASE WHEN resource_ohaeng ~ '[목木]' THEN 1 ELSE 0 END
     + CASE WHEN resource_ohaeng ~ '[화火]' THEN 1 ELSE 0 END
     + CASE WHEN resource_ohaeng ~ '[토土]' THEN 1 ELSE 0 END
     + CASE WHEN resource_ohaeng ~ '[금金]' THEN 1 ELSE 0 END
     + CASE WHEN resource_ohaeng ~ '[수水]' THEN 1 ELSE 0 END) > 1;

-- 2-5) 옮긴 값이 맞는가 (STEP 0-1 과 개수가 같아야 합니다)
SELECT resource_ohaeng AS 원본, resource_ohaeng_primary AS 표준, COUNT(*) AS n
FROM hanja GROUP BY 1, 2 ORDER BY n DESC;

-- 2-6) ★★제약 — 2-3 이 0건이 된 «뒤에만» 실행하십시오
--   ⚠️ CHECK 에 `IS NULL OR` 를 넣으면 못 읽은 값이 조용히 통과합니다.
--      NOT NULL 로 조여야 «다음에 들어오는 자료» 도 막힙니다.
ALTER TABLE hanja ALTER COLUMN resource_ohaeng_primary SET NOT NULL;

ALTER TABLE hanja
  ADD CONSTRAINT hanja_res_primary_ck
  CHECK (resource_ohaeng_primary IN ('목','화','토','금','수'));

COMMENT ON COLUMN hanja.resource_ohaeng IS
  '원본 표기(덕암 자료는 한자 木火土金水). ★판정에 쓰지 마십시오.';
COMMENT ON COLUMN hanja.resource_ohaeng_primary IS
  '표준 표기(목|화|토|금|수). 코드는 이 컬럼만 씁니다. lib/saju/ohaeng.ts 와 짝입니다.';


-- ═══════════════════════════════════════════════════════════════════
-- STEP 3.  부 자원오행 · 부수 · 자의 오행
-- ═══════════════════════════════════════════════════════════════════
--
--   ★lib/saju/resourceJudge.ts 의 JudgeChar.secondary 가 이 값을 받을 자리를
--     이미 비워 두었습니다 (route.ts 의 toJudgeChar). 채우면 바로 씁니다.

ALTER TABLE hanja
  ADD COLUMN IF NOT EXISTS resource_ohaeng_secondary text,
  ADD COLUMN IF NOT EXISTS radical                   text,
  ADD COLUMN IF NOT EXISTS radical_ohaeng            text,
  ADD COLUMN IF NOT EXISTS meaning_ohaeng            text,
  ADD COLUMN IF NOT EXISTS resource_basis            text,
  ADD COLUMN IF NOT EXISTS resource_confidence       smallint;

ALTER TABLE hanja
  ADD CONSTRAINT hanja_res_secondary_ck
    CHECK (resource_ohaeng_secondary IS NULL
           OR resource_ohaeng_secondary IN ('목','화','토','금','수')),
  ADD CONSTRAINT hanja_radical_ohaeng_ck
    CHECK (radical_ohaeng IS NULL OR radical_ohaeng IN ('목','화','토','금','수')),
  ADD CONSTRAINT hanja_meaning_ohaeng_ck
    CHECK (meaning_ohaeng IS NULL OR meaning_ohaeng IN ('목','화','토','금','수')),
  ADD CONSTRAINT hanja_basis_ck
    CHECK (resource_basis IS NULL
           OR resource_basis IN ('부수','자의','부수+자의','통설')),
  ADD CONSTRAINT hanja_conf_ck
    CHECK (resource_confidence IS NULL OR resource_confidence BETWEEN 1 AND 3);

COMMENT ON COLUMN hanja.resource_ohaeng_secondary IS
  '부 자원오행(榮=목·화 같은 글자). 없으면 NULL. resourceJudge 가 70% 로 인정합니다.';
COMMENT ON COLUMN hanja.resource_basis IS
  '부수와 자의가 갈릴 때 어느 쪽을 골랐는가. ★연재쌤 판단을 기록하는 자리입니다.';

-- ⚠️ 이 다섯 컬럼은 «아직 비어 있습니다». 덕암 엑셀에 «부수» 컬럼이 있으므로
--    radical 은 거기서 옮길 수 있습니다. 자의 오행은 연재쌤 판단이 필요합니다.


-- ═══════════════════════════════════════════════════════════════════
-- STEP 4.  강희자전 원획수 — ★컬럼만 만들지 말고 «채웁니다»
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE hanja
  ADD COLUMN IF NOT EXISTS strokes_kangxi smallint,
  ADD COLUMN IF NOT EXISTS strokes_actual smallint;

-- 4-1) ★값을 채웁니다 — 안 채우면 전부 NULL 이고 수리 4격이 통째로 깨집니다
UPDATE hanja SET strokes_kangxi = strokes WHERE strokes_kangxi IS NULL;

ALTER TABLE hanja
  ADD CONSTRAINT hanja_strokes_kangxi_ck
  CHECK (strokes_kangxi IS NULL OR strokes_kangxi BETWEEN 1 AND 64);

COMMENT ON COLUMN hanja.strokes_kangxi IS
  '강희자전 원획수. ★수리 4격과 음양은 이 값으로 셉니다(원획법).';
COMMENT ON COLUMN hanja.strokes_actual IS
  '실획수. 참고용. 원획법을 쓰는 동안 판정에 쓰지 마십시오.';

-- 4-2) 확인 — NULL 이 0건이어야 합니다
SELECT COUNT(*) AS 원획없음 FROM hanja WHERE strokes_kangxi IS NULL;

-- ⚠️ 지금은 strokes 를 그대로 복사만 했습니다. 값을 «검증» 한 것이 아닙니다.
--    덕암 자료에서 획수 → 획수오행 규칙 어긋남 49건 · 획수 → 음양 어긋남 56건이
--    있었습니다. 어느 쪽이 오타인지는 원본을 봐야 갈립니다(연재쌤).


-- ═══════════════════════════════════════════════════════════════════
-- STEP 5.  🔴 불용한자 — ★DEFAULT true 를 쓰지 마십시오
-- ═══════════════════════════════════════════════════════════════════
--
--   ⚠️⚠️ `ADD COLUMN is_name_use boolean DEFAULT true` 는
--        PostgreSQL 11+ 에서 **기존 행 전부를 true 로 채웁니다.**
--        덕암 자료 기준 «不用» 947건이 전부 «쓸 수 있는 글자» 가 됩니다.
--        나중에 화면이 이 컬럼을 읽으면 불용한자가 손님에게 추천됩니다.
--
--   ★그래서 DEFAULT 없이 만들고 grade 에서 «계산해» 넣습니다.
--     그리고 모르는 것은 «안전한 쪽(false)» 으로 둡니다 —
--     모르는 글자를 손님에게 권하지 않기 위함입니다.

ALTER TABLE hanja ADD COLUMN IF NOT EXISTS is_name_use boolean;   -- ★DEFAULT 없음

-- 5-1) grade 에서 채웁니다 (지금 코드와 «같은» 잣대 — 행동이 안 바뀝니다)
--      근거: diagnosis/page.tsx:115  if (row.grade === '不用') return true
UPDATE hanja
SET is_name_use = (btrim(grade) <> '不用')
WHERE is_name_use IS NULL AND grade IS NOT NULL;

-- 5-2) grade 가 비었으면 안전한 쪽으로
UPDATE hanja SET is_name_use = false WHERE is_name_use IS NULL;

ALTER TABLE hanja ALTER COLUMN is_name_use SET NOT NULL;

COMMENT ON COLUMN hanja.is_name_use IS
  '인명에 쓸 수 있는가. ★grade 문자열 비교(=''不用'') 대신 이 값을 쓰십시오. '
  '모르는 글자는 false 입니다(안전한 쪽).';

-- 5-3) ★확인 — false 가 947건 안팎이어야 합니다
SELECT is_name_use, COUNT(*) AS n FROM hanja GROUP BY 1 ORDER BY 1;

-- 5-4) grade 와 어긋나는 행이 없는지
SELECT grade, is_name_use, COUNT(*) AS n FROM hanja GROUP BY 1, 2 ORDER BY 1, 2;


-- ═══════════════════════════════════════════════════════════════════
-- STEP 6.  쓰지 않는 컬럼에 표시 — 다음 사람이 헤매지 않게
-- ═══════════════════════════════════════════════════════════════════

COMMENT ON COLUMN hanja.sound_ohaeng IS
  '참고용. ★코드는 이 값을 «읽지 않습니다» — naming.ts 의 soundOhaengOf() 로 '
  '초성에서 계산합니다(ㅇㅎ=土 고정, SOUND_OHAENG_MODE). 둘이 다를 수 있습니다.';
COMMENT ON COLUMN hanja.grade IS
  '자의품격(大吉|中吉|小吉|不用). 걸러낼 때는 is_name_use 를 쓰십시오.';


-- ═══════════════════════════════════════════════════════════════════
-- STEP 7.  되돌리기
-- ═══════════════════════════════════════════════════════════════════

-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_res_primary_ck;
-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_res_secondary_ck;
-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_radical_ohaeng_ck;
-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_meaning_ohaeng_ck;
-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_basis_ck;
-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_conf_ck;
-- ALTER TABLE hanja DROP CONSTRAINT IF EXISTS hanja_strokes_kangxi_ck;
-- ALTER TABLE hanja ALTER COLUMN resource_ohaeng_primary DROP NOT NULL;
-- ALTER TABLE hanja ALTER COLUMN is_name_use DROP NOT NULL;
-- UPDATE hanja SET hanja = hanja_raw WHERE hanja_raw IS NOT NULL;   -- STEP 1 되돌리기
-- ALTER TABLE hanja
--   DROP COLUMN IF EXISTS resource_ohaeng_primary,
--   DROP COLUMN IF EXISTS resource_ohaeng_secondary,
--   DROP COLUMN IF EXISTS radical, DROP COLUMN IF EXISTS radical_ohaeng,
--   DROP COLUMN IF EXISTS meaning_ohaeng, DROP COLUMN IF EXISTS resource_basis,
--   DROP COLUMN IF EXISTS resource_confidence,
--   DROP COLUMN IF EXISTS strokes_kangxi, DROP COLUMN IF EXISTS strokes_actual,
--   DROP COLUMN IF EXISTS is_name_use, DROP COLUMN IF EXISTS hanja_raw;


-- ═══════════════════════════════════════════════════════════════════
--  ⚠️ 이 파일에서 «하지 않은» 것
-- ═══════════════════════════════════════════════════════════════════
--
--   · 중복 레코드 정리 (is_active · review_note)     → stage1 SQL 의 STEP 4
--   · 오행 표기 불일치 여섯 글자                       → stage1 SQL 의 STEP 5
--   · hanja_pickable 뷰                              → stage1 SQL 의 STEP 7
--   · radical / meaning_ohaeng 실제 값 채우기         → 덕암 엑셀 «부수» 에서 옮기기
--   · 코드가 strokes 대신 strokes_kangxi 를 읽게 옮기기  → 3단계
--   · 코드가 is_name_use 를 읽게 옮기기                → 3단계
--
--   ⚠️⚠️ **컬럼을 만들었다고 코드가 쓰는 것이 아닙니다.**
--        지금 코드는 여전히 `resource_ohaeng`(원본)·`strokes`·`grade` 를 읽습니다.
--        읽는 자리를 옮기는 것은 3단계이고, 그때 16-verify-naming.ts 를 다시 돌리십시오.
