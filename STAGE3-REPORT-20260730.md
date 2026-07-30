# 3단계 작업 보고 — 새 DB 컬럼 바인딩 · 후보 정렬 이관 · max_tokens

```
작업 시점   2026-07-30
산출물      ① lib/saju/hanjaRow.ts        신설 239줄 — hanja 표 읽기 단일 창구
            ② 후보 정렬 이관               rename/hanja · rename/newhanja
            ③ max_tokens 3,500 → 12,000 + res.ok + logAiError
            ④ 16-verify-naming.ts         183건 (143 → 183)
            ⑤ stage3-column-binding-20260730.patch
```

---

## 0. ⚠️ 먼저 — 제가 못 하는 것 둘

요청하신 ①②는 **제 환경에서 불가능합니다.** 36·37부와 같은 제약입니다.

```
① git push   →  fatal: could not read Username for 'https://github.com'
                (인증 정보가 없습니다. 대표님이 GitHub Desktop 으로 하셔야 합니다)
② SQL 실행    →  Supabase 접속 권한이 없습니다
                (Supabase SQL Editor 에서 대표님이 돌리셔야 합니다)
```

그래서 ③ 코드만 만들었고, 아래 「올리는 순서」에 ①②를 함께 적어 두었습니다.

---

## 1. ★가장 중요 — 마이그레이션 «전에도» 돌아갑니다

Supabase 는 **없는 컬럼을 select 하면 400 으로 통째로 실패**합니다.
그래서 컬럼 이름을 나열하지 않았습니다.

```ts
export const HANJA_SELECT = '*'      // lib/saju/hanjaRow.ts
```

그리고 읽기 함수들이 «새 컬럼이 있으면 그것을, 없으면 옛 컬럼을» 씁니다.

| 함수 | 마이그레이션 뒤 | 마이그레이션 전 |
|---|---|---|
| `rowOhaeng()` | `resource_ohaeng_primary` | `resource_ohaeng` → 정규화 |
| `rowOhaengSecondary()` | `resource_ohaeng_secondary` | `null` |
| `rowStrokes()` | `strokes_kangxi` (원획법) | `strokes` |
| `rowNameUse()` | `is_name_use` | `grade !== '不用'` |
| `rowActive()` | `is_active` | `true` |

**→ SQL 을 먼저 돌려도, 코드를 먼저 올려도 안 깨집니다.** 순서 걱정 없이 하실 수 있습니다.

⚠️ **`strokes_kangxi` 가 NULL·0 이면 믿지 않고 `strokes` 로 돌아갑니다.**
SQL STEP 4 가 컬럼만 만들고 `UPDATE` 를 빠뜨리면 전부 NULL 인데,
그때 0 으로 읽으면 수리 4격이 통째로 깨집니다. 그물이 이 경우를 검사합니다.

---

## 2. 🔴 그리고 개명 화면의 «불용한자 누수» 를 찾았습니다

`HanjaRow` 타입과 select 문이 **세 벌** 흩어져 있었고, 세 화면이 같은 표를 다르게 읽고 있었습니다.

```
diagnosis        select 에 grade 있음   →  isAvoidChar 로 不用 + 뜻 + avoid_hard 를 거름
rename/hanja     select 에 grade 없음   →  avoid_hard «만» 거름
rename/newhanja  select 에 grade 없음   →  avoid_hard «만» 거름
```

**개명 화면 둘은 `grade` 를 select 하지도 않았습니다.** 그러니 거를 수가 없었습니다.

### 실측 — 덕암 5,111자 기준

```
不用 (인명 불가)                     947자   18.5%
뜻으로 걸리는 것 (不用 아닌데)         579자
─────────────────────────────────────────────
★목록에서 빠져야 하는 것 합계        1,526자   29.9%
```

**개명 화면 둘이 이 1,526자를 손님에게 그대로 추천하고 있었습니다.**
`慚`(불가) 같은 글자가 후보 목록에 올라와 있었던 것입니다.

→ `avoidReason()` 하나로 세 화면이 같은 잣대를 쓰게 했습니다. (교훈 CJ)
   `AVOID_KEYWORDS` 표도 `diagnosis` 에만 있던 것을 옮겼습니다.

⚠️ **후보 목록이 30% 줄어듭니다.** 손님이 「글자가 적어졌다」고 느끼실 수 있지만, 옳은 방향입니다.
음마다 후보가 5개 미만으로 줄면 알려 주십시오 — 그때는 `avoid_soft` 를 목록에 남기고
표시만 다르게 하는 쪽으로 조정하겠습니다.

---

## 3. 후보 정렬 이관

### 옛 방식 — 다섯 관점을 3단 등급으로 뭉갬

```ts
weighted = gradeNum(용신)×3 + gradeNum(자원)×2 + gradeNum(수리)×1.5 + gradeNum(발음)×1
//         gradeNum: 좋음=2 · 보통=1 · 아쉬움=0     (만점 15)
```

자원오행 ratio 0.5 와 1.0 이 같은 «좋음» 이라 정보가 사라지고,
**상극·과다 오행·기신·구신이 추천 순서에 닿지 않았습니다.**

### 새 방식 — 자원+용신 칸만 정밀하게

```ts
candidateScore = judgeResource.score × 0.667    // 자원오행 + 사주보완 (0~100)
               + suri(3단) × 0.200
               + sound(3단) × 0.133
```

★**비율은 옛 가중치를 그대로 옮겼습니다** — `(3+2)/7.5 = 66.7%` · `1.5/7.5 = 20%` · `1/7.5 = 13.3%`.
관점의 무게를 바꾸지 않았고, 바뀌는 것은 «정밀도» 뿐입니다.

⚠️ 수리·발음은 아직 3단 등급입니다. 그것까지 정밀하게 하려면 `scoreSuri`·`scoreSound` 를
고쳐야 하고 그건 4단계 일입니다. **한 번에 다 바꾸면 무엇 때문에 순서가 바뀐 건지
갈라볼 수 없습니다.** (교훈 DU)

### 비교 함수도 공용으로

```
① 용신을 담았는가      ★하드 게이트 — 대표님이 두신 순서를 «바꾸지 않았습니다»
② avoid_soft 가 아닌가
③ candidateScore 높은 쪽
④ 획수 적은 쪽
```

두 화면이 각자 비교 함수를 갖고 있던 것을 `compareCandidates()` 하나로 합쳤습니다.

### 실측 — 무작위 3,000회 · 후보 20개씩

| | 바뀐 비율 |
|---|---|
| **1등 후보가 바뀜** | **3.1%** |
| 상위 5개 목록이 바뀜 | 61.8% |
| 전체 순서가 바뀜 | 97.4% |

★**1등이 3.1% 만 바뀐 것이 중요합니다.** 용신 하드 게이트가 살아 있어 «가장 중요한 추천» 은
거의 그대로이고, 그 아래 줄 세우기가 정밀해졌습니다. 손님이 느끼는 충격이 작습니다.

---

## 4. `max_tokens` 3,500 → 12,000 · 그리고 조용한 실패를 막았습니다

첫 점검(「내이름감정」 배관 점검)에서 지적한 셋을 이제 고쳤습니다.

### ① `max_tokens: 3500` → `12000`

5관점 × 3단 + 맺음말 JSON 입니다. 우리말 한 대목이 200~300자면 5관점만 3,000~4,500자
≒ 4,500~6,500 토큰이고 JSON 키·따옴표까지 더하면 3,500 으로는 뒤가 잘립니다.

**★라우트에 «JSON 이 잘렸을 때 되살리는» 복구 코드가 있다는 것이 실제로 잘리고 있었다는 증거입니다.**
그리고 2단계가 자원오행 재료를 늘렸으므로 위험이 더 커졌습니다.

⚠️ 상한으로 자르지 말고 «분량 지시» 로 줄이십시오. (교훈 DS)

### ② `cRes.ok` 를 안 봤습니다 → 봅니다

```
전  401·429·529·크레딧 부족이 와도 cData.content 가 없어 '{}' → emptyCommentary()
    → ★200 OK 로 «빈 통변» 이 나갔습니다. 손님은 빈 칸을 보고 원인을 알 방법이 없었습니다
후  상태코드를 보존하고 aiOk·aiFailStatus·aiFailHint 로 화면에 알립니다
```

### ③ `logAiError` 를 안 불렀습니다 → 부릅니다

일곱 라우트(tongbyeon·mulsang·analyze·summarize·chat-stream·daily·monthly)는 부르는데
`/api/naming` 만 **0건**이었습니다. → **개명 실패가 `/admin` 🚨 AI 오류 탭에 안 남았습니다.**

### ④ 화면의 «빈 화면» 도 고쳤습니다

```
전  const data = await res.json()        ← res.ok 를 안 봄
    setResult(data.result ?? null)
    → 500 이 와도 통과 → result=null → `{!loading && result && …}` 가 false
    → ★손님이 «빈 화면» 을 봤습니다. 실패 문구도 [다시 시도] 도 없었습니다
후  res.ok 검사 + failWhy 상태 + 🌧️ 안내 + [다시 시도] 단추
```

---

## 5. 그물 183건 (143 → 183)

새로 넣은 두 구획입니다.

```
⑧-2 ★새 DB 컬럼 바인딩 — 마이그레이션 전/후 모두
     · HANJA_SELECT 가 '*' 인지
     · 마이그레이션 전 : resource_ohaeng('木') → '목' · strokes · grade
     · 마이그레이션 뒤 : primary · strokes_kangxi(10) «가» strokes(9) 를 이기는지
     · ★새 컬럼이 «있지만 NULL» 일 때 옛 컬럼으로 돌아가는지 (0 도 안 믿음)
     · 不用 / is_name_use=false / ' 不用 '(공백) / 뜻 / is_active=false 를 다 거르는지
     · toJudgeChar · toNameChar · describeRowSource

⑧-3 ★개명 후보 정렬 이관
     · 배점 비율 합이 1 · 자원+용신 비율이 옛 5/7.5 와 «같은지»
     · 기신·과다 투입이 추천 순서에 «반영되는지»
     · 용신 하드 게이트가 살아 있는지 (점수 10 이 점수 99 를 이기는지)
     · 정렬이 되돌릴 수 있는지
```

### 검증

```
tsc 0건 · tsc strict 0건
16-verify-naming        183건 전부 통과 ✅
npm run verify (관문)    대운 18/18 · 일곱 갈래 · naming 183 ✅
eslint 전체              81 error / 125 warning
                         ★기준선(81/126) 보다 warning 이 «하나 줄었습니다»
```

⚠️ 처음에 새 코드가 warning 을 5개 올렸습니다(안 쓰는 import 4 + 훅 의존성).
그 가운데 **`saju` 의존성 누락은 실제 버그**였습니다 — 사주가 바뀌어도 후보가
다시 계산되지 않는 자리입니다. 고쳤습니다. (교훈 BM)

---

## 6. 올리는 순서 — ★대표님이 하실 것

```bash
# ── ① 2단계-c 가 아직 안 올라갔으면 먼저 ──
#    GitHub Desktop → 커밋 → Push origin

# ── ② 3단계 코드 ──
#    myjae-stage3 zip 을 풀어 저장소에 덮어쓰기 (6파일 + 문서 2)
npm run verify        # ★naming 183건 이 나와야 정상
npm run build         # .env.local 이 있어야 통과합니다
#    커밋 메시지:
#    3단계: hanja 표 읽기 단일 창구(hanjaRow) · 후보 정렬 이관 · max_tokens 12000 · 실패 처리

# ── ③ SQL — 코드보다 먼저 해도 되고 나중에 해도 됩니다 ──
#    Supabase SQL Editor 에서 _SQL_hanja_stage2_columns_20260730.sql
#    ★STEP 씩 돌리고 확인 쿼리를 눈으로 보십시오
#      STEP 2-3 이 0건인 뒤에 2-6(NOT NULL)
#      STEP 5-3 은 false 가 947건 안팎
```

### 실기기로 볼 것

```
① 개명 화면(한자 바꾸기) — ★후보 목록이 30% 줄어들었는지
   慚(불가) 같은 글자가 사라졌는지
② 추천 1~3위가 크게 달라지지 않았는지 (실측 3.1% 만 바뀝니다)
③ 「내이름 감정」 — 통변이 잘리지 않는지 (max_tokens 12,000)
④ ★일부러 실패시켜 보기 — Vercel 환경변수 ANTHROPIC_API_KEY 를 잠깐 지우면
   🌧️ 안내와 [다시 시도] 가 나와야 합니다. 빈 화면이 나오면 안 됩니다
```

---

## 7. ⚠️ 확인 못 한 것

```
❌ git push · SQL 실행       제 환경에서 불가 (0장)
❌ npm run build             fonts.googleapis.com 403 (환경 제약)
❌ 실기기 발행               브라우저·API 키 없음
❌ 마이그레이션 «뒤» 의 실동작  DB 를 못 봅니다
   ★그래서 그물 ⑧-2 가 «전/후» 두 모양을 다 검사합니다.
     그리고 describeRowSource() 로 «어느 컬럼을 읽고 있는지» 볼 수 있게 두었습니다.
```

## 8. 4단계 후보

```
· 수리·발음도 정밀 점수로 (지금은 3단 등급 — candidateScore 의 20% + 13.3%)
· scoreSuri 의 구멍 — 4글자 이상 격 0개인데 «좋음» · 외자 격 중복 · 복성
· radical / meaning_ohaeng 값 채우기 (덕암 엑셀 «부수» 에서)
· 중복 19쌍 · 오행 불일치 6글자 → 연재쌤 판정 뒤 유일 제약
· naming 을 /api/tongbyeon 으로 합치기 (스트리밍 · 창구 열둘 → 하나)
```

## 9. ★연재쌤 확인 대기 (2단계에서 이월)

```
① 고립 잣대            judgeIsolated() — 우리가 정한 것 (인수인계서 ㉖ 미결)
② 상극 예외 범위        용신만? 희신까지? (CLASH_EXEMPT_INCLUDES_HEEKSIN)
③ 배점·감점 폭          기신 −15 · 과다 −12 · 후보 정렬 66.7/20/13.3
④ ★새로 — 뜻으로 거르는 579자가 적절한지 (AVOID_KEYWORDS 47개 낱말)
```

**★이 문서의 «이러면 된다» 도 다시 재 주십시오. (교훈 DK)**
