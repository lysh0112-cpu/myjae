# 얹는 법 — 1단계 (오행 정규화 · 한자 DB 정제)

```
기준 HEAD   54c5034   (git log -1 --oneline 으로 먼저 확인하십시오)
바뀐 파일   5개 · 새 파일 1개
```

## 담긴 것

```
저장소에 «그대로» 덮어쓸 것 ────────────────────────────
  lib/saju/ohaeng.ts                                ★신설 (188줄)
  app/manseryeok/naming/diagnosis/page.tsx          ★핵심 고침
  app/manseryeok/naming/rename/hanja/page.tsx
  app/manseryeok/naming/rename/result/page.tsx
  app/manseryeok/naming/rename/newhanja/page.tsx
  app/manseryeok/naming/rename/newresult/page.tsx

저장소 뿌리에 놓을 것 ──────────────────────────────
  _SQL_hanja_stage1_20260730.sql      마이그레이션 (기존 _SQL_ai_error_logs.sql 과 같은 자리)
  1단계-작업보고-20260730.md           무엇을 왜 고쳤나 · 실측 숫자
  stage1-ohaeng-normalize-20260730.patch      git apply 로 얹을 수도 있습니다
  자원오행-알고리즘-명세서.md           현재 로직 명세 · 한계점 · 2단계 제안
```

## 순서

```bash
# 0) ★가장 먼저 — 지금 저장소가 어느 판인지
git log -1 --oneline          # 54c5034 가 나와야 이 zip 이 맞습니다

# 1) 얹기 — 둘 중 하나만 하십시오
#    (가) zip 을 저장소 폴더에 풀어 덮어쓰기
#    (나) 패치로 얹기
git apply stage1-ohaeng-normalize-20260730.patch

# 2) 확인
npx tsc --noEmit --skipLibCheck        # 0건이어야 합니다
npx tsc -p tsconfig.strict.json        # 0건
npm run verify                         # 대운 18/18 · 일곱 갈래 전부 통과
npx eslint .                           # 81 error / 126 warning = 기준선 그대로

# 3) ★로컬 빌드 — 아직 아무도 눈으로 못 봤습니다
npm run build
#   ⚠️ .env.local 이 없으면 /_not-found 프리렌더에서 Supabase 오류로 멈춥니다.
#      폰트(fonts.googleapis.com)와 함께 «환경» 문제이고 코드 문제가 아닙니다.

# 4) 실기기 — 「내이름 감정」으로 아는 이름 하나
npm run dev
```

## ⚠️ DB 는 순서가 다릅니다 — STEP 0 먼저

`_SQL_hanja_stage1_20260730.sql` 을 **한 번에 다 돌리지 마십시오.**
단계마다 확인 쿼리가 붙어 있습니다.

```sql
-- ★이 한 줄이 모든 것을 갈라 줍니다 (STEP 0-2)
SELECT resource_ohaeng, COUNT(*) FROM hanja GROUP BY 1 ORDER BY 2 DESC;
```

```
한자(木火土金水) 로 나오면   → 「내이름 감정」이 지금 오답을 내고 있었습니다.
                              무작위 4,000개 대조에서 종합 등급이 64.8% 바뀌었습니다.
한글(목화토금수) 로 나오면   → 오답은 없었고, 이번 고침은 «재발 방지» 로 값이 있습니다.
                              그래도 얹으십시오 — 창구가 다섯이었고 하나가 비어 있었습니다.
```

## ⚠️ 자동으로 처리하지 않은 것 둘 — 연재쌤 판단이 필요합니다

```
STEP 4  중복 21쌍 (그중 19쌍 내용 다름)
        ★지우지 않고 is_active=false 로 «쉬게» 합니다. 되살릴 수 있습니다
        획수가 다른 것(麟 23↔17 · 琳 13↔12 · 潤 16↔15 …)은 수리 4격이 통째로 갈립니다
STEP 5  오행 표기 불일치 6글자 — 林 明 潤 牖 斑 冏
        ⚠️ 동자이음(음이 다른 것)은 고치지 마십시오. 유파상 정상일 수 있습니다
```

STEP 4-5 와 6-3 이 검토표를 뽑습니다.

## 되돌리기

```bash
git checkout -- app/manseryeok/naming lib/saju/ohaeng.ts   # 코드
# DB 는 SQL 의 STEP 8 에 되돌리기 문장이 주석으로 있습니다.
# 지우는 문장이 하나도 없고 hanja_raw 에 원본이 남습니다. (교훈 CR)
```

## 확인한 것 / 못 한 것

```
✅ tsc 0건 · tsc strict 0건 · npm run verify 전부 통과
✅ eslint 81/126 — 기준선 그대로 (신설 ohaeng.ts 는 0건)
✅ ohaengChar 사본 0건 · 날것 resource_ohaeng → 엔진 0건
✅ 정규화 경계값 시험 (한자·괄호·전각공백·폭없는문자·NFD 한글·복수오행·빈값)
✅ zip 안 .env 계열 0건

❌ npm run build       확인 못 함 (fonts.googleapis.com 403 · 이 환경 제약)
❌ 실기기 발행         확인 못 함 (브라우저·API 키 없음)
❌ 실제 DB 값          못 봤습니다 — 위 STEP 0-2 로 확인하십시오
```

**★이 문서의 «이러면 된다» 도 다시 재 주십시오. (교훈 DK)**
