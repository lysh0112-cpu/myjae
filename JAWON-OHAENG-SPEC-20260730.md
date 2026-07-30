# 자원오행(字源五行) 판정 알고리즘 명세서

```
대상 저장소   lysh0112-cpu/myjae   HEAD 54c5034
분석한 파일   lib/saju/naming.ts (330줄) · lib/saju/suri81.ts (112줄)
              app/api/naming/route.ts (225줄)
              app/manseryeok/naming/diagnosis/page.tsx (920줄)
              app/manseryeok/naming/rename/{hanja,newhanja,result,newresult}/page.tsx
              lib/saju/yongsinNew.ts · lib/saju/simsanOhaeng.ts
작성 시점     2026-07-30
```

> ⚠️ 이 문서의 1부는 **저장소를 읽어 재구성한 것**이고, 3·4부는 **제안**입니다.
> 1부의 줄 번호와 조건식은 위 HEAD 기준입니다. 손대기 전에 grep 으로 다시 확인하십시오.
>
> ⚠️ 한자 사전(`hanja` 표)은 Supabase 에 있고 저장소에 없습니다.
> **따라서 1-A장의 «정규화 누락» 이 실제로 터지는지는 DB 값을 한 줄 조회해 보아야 확정됩니다.**
> 확인 쿼리를 1-A장 끝에 적었습니다.

---

# 1. 현재 자원오행 알고리즘 명세

## 1-0. 데이터 원천 — `hanja` 표

코드가 실제로 `select` 하는 컬럼은 아홉 개입니다.

| 컬럼 | 뜻 | 자원오행 판정에 쓰이는가 |
|---|---|---|
| `hangul` | 한글 음 (`승`) | 조회 키 |
| `hanja` | 한자 (`承`) | 표시·저장 |
| `meaning` | 뜻 (`이을`) | ❌ **판정에 안 씀** (AI 서술용으로만 전달) |
| `strokes` | 원획수 (강희자전) | 수리·음양 전용 |
| **`resource_ohaeng`** | **자원오행** | ✅ **이 컬럼 하나가 자원오행 판정의 전부** |
| `sound_ohaeng` | 발음오행 | ❌ **읽지 않습니다** — 초성에서 직접 계산 |
| `avoid_hard` | 절대 회피 | 후보 정렬에만 |
| `avoid_soft` | 권장 회피 | 후보 정렬 2순위 |
| `grade` | 인명용 등급 | `'不用'` 필터에만 |

⚠️ **자원오행의 입력은 문자열 컬럼 하나뿐입니다.** 주/부 구분, 부수, 자의, 유파 이견을 담을 자리가 없습니다.

⚠️ `sound_ohaeng` 이 DB 에 있는데 코드는 `soundOhaengOf()` 로 초성에서 계산합니다
(`naming.ts:19` `SOUND_OHAENG_MODE = "토"` — ㅇㅎ=土 명연재 표준을 고정하기 위한 것으로 보입니다).
의도된 것일 수 있으나 **어디에도 적혀 있지 않아** 다음 사람이 DB 값을 믿고 고칠 위험이 있습니다.

## 1-1. 전체 흐름 (Step-by-Step)

```
Step 1  이름 입력                    diagnosis/page.tsx:325 applyName()
        cleaned ← 공백 제거
        arr     ← 한글 음절만 남김  (isHangulSyllable)
        IF arr.length < 2 : 중단      ← ★상한 방어막 없음 (input maxLength=5)

Step 2  음절마다 한자 목록 조회       diagnosis/page.tsx:339
        SELECT hangul, hanja, meaning, strokes, resource_ohaeng,
               sound_ohaeng, avoid_hard, avoid_soft, grade
        FROM hanja WHERE hangul = :음절 ORDER BY strokes ASC

Step 3  손님이 글자마다 한자 선택 → NameChar 조립
        ┌─ diagnosis/page.tsx:361   resourceOhaeng: row.resource_ohaeng        ← ★날것
        └─ rename/*/page.tsx        resourceOhaeng: ohaengChar(row.resource_ohaeng)  ← 정규화
        surname ← chars[0]                    ← ★복성을 한 글자로 봄
        given   ← chars.slice(1)

Step 4  사주 → 용신 산출              diagnosis/page.tsx:424
        calcYongsinCompat(saju, dayStem, 양력월, 양력일, 시지)
          반환 { isStrong, yongsin, heeksin, gisin, gusin, hansin, score, description }
        ★naming 이 받아 쓰는 것은 yongsin · heeksin · score 셋뿐입니다.
          gisin(기신) · gusin(구신) · hansin(한신) · isStrong 은 버립니다.

Step 5  POST /api/naming → diagnoseName()   naming.ts:297
        ④ scoreResource(input)        자원오행 «흐름»
        ⑤ scoreYongsin(input, MODE)   사주보완 «충족»
        (①음양 ②발음 ③수리는 별도)

Step 6  가중 합산 → overallGrade      naming.ts:308
        ★화면에는 안 나옵니다. 그러나 개명 후보 «추천 순위»를 정합니다.

Step 7  facts(JSON) → Claude → 3단 서술 → naming_results 저장
        ★AI 는 점수를 못 받고 «사실»만 받습니다. 판정 문장은 AI 가 씁니다.
```

## 1-2. 의사코드 — 현재 로직 그대로 재구성

### 공통 관계표 (`naming.ts:102`)

```
GENERATES = { 목→화, 화→토, 토→금, 금→수, 수→목 }    # 상생
CONTROLS  = { 목→토, 토→수, 수→화, 화→금, 금→목 }    # 상극

FUNCTION relationOf(a, b):
    IF a == b            : RETURN {kind:'비화', text:"a→b 같은 기운"}
    IF GENERATES[a] == b : RETURN {kind:'생',  text:"a生b"}
    IF GENERATES[b] == a : RETURN {kind:'생',  text:"b生a"}      # ★역방향도 '생'
    IF CONTROLS[a]  == b : RETURN {kind:'극',  text:"a剋b"}
    IF CONTROLS[b]  == a : RETURN {kind:'극',  text:"b剋a"}
    RETURN {kind:'기타', text:"a→b"}                            # ★모르는 값이 여기로

FUNCTION isSaeng(a, b):
    RETURN GENERATES[a] == b  OR  GENERATES[b] == a              # ★방향 무관
```

### ④ 자원오행 흐름 (`naming.ts:231` `scoreResource`)

```
FUNCTION scoreResource(surname, given):
    seq   ← [surname] + given                # ★성을 «포함». 4글자면 4칸
    links ← []
    saeng ← 0 ;  total ← 0

    FOR i FROM 0 TO len(seq) - 2:            # ★이웃한 쌍만
        a   ← seq[i].resourceOhaeng
        b   ← seq[i+1].resourceOhaeng
        rel ← relationOf(a, b)
        links.append({from:a, to:b, rel:rel.kind, text:rel.text})
        total ← total + 1
        IF isSaeng(a, b): saeng ← saeng + 1
        # ⚠️ rel.kind == '극' 이어도 아무 일도 일어나지 않습니다 (감점 0)
        # ⚠️ rel.kind == '비화' 도 saeng 에 안 들어갑니다 (0점 취급)

    ratio ← (total > 0) ? saeng / total : 0

    grade ← ratio ≥ 0.5  → '좋음'
          | ratio  > 0    → '보통'
          | otherwise     → '아쉬움'

    RETURN {
        grade,                                        # 내부 점수용 (화면 미표시)
        detail : "자원오행: " + join(오행들, '→'),
        facts  : { sequence, chain, links, saengCount:saeng, total }
    }
```

**두 글자 이름의 판정 경우가 사실상 셋뿐입니다.**

| 성→이름1, 이름1→이름2 | saeng/total | grade |
|---|---|---|
| 둘 다 상생 | 2/2 = 1.0 | 좋음 |
| 하나만 상생 | 1/2 = 0.5 | **좋음** |
| 상생 0 (극·비화·기타 아무 조합) | 0/2 = 0 | 아쉬움 |

⚠️ **`ratio > 0` 이면서 `< 0.5` 인 «보통» 은 두 글자 이름에서 나올 수 없습니다.**
`total = 2` 이므로 ratio 는 0 · 0.5 · 1.0 뿐입니다. 세 글자 이름(total=3)에서 1/3 일 때만 «보통» 이 나옵니다.
즉 **대부분의 손님에게 자원오행 등급은 «좋음/아쉬움» 두 갈래**입니다.

### ⑤ 사주보완 (`naming.ts:262` `scoreYongsin`)

```
FUNCTION scoreYongsin(surname, given, yongsin, heeksin, MODE = '관대'):
    nameOhaengs  ← given.map(c → c.resourceOhaeng)               # ★성 «제외»
    surnameOhaeng ← surname.resourceOhaeng                       # facts 에만 실림

    hasYongsin   ← yongsin ∈ nameOhaengs
    hasHeeksin   ← heeksin ? (heeksin ∈ nameOhaengs) : false

    yongsinChars ← ([surname] + given)                           # ★성 «포함» ← 어긋남
                     .filter(c → c.resourceOhaeng == yongsin)
                     .map(c → {hanja, hangul})

    IF hasYongsin                        : grade ← '좋음'
    ELIF MODE == '관대' AND hasHeeksin   : grade ← '보통'
    ELSE                                 : grade ← '아쉬움'

    RETURN { grade, detail, facts:{
        yongsin, heeksin, nameOhaengs, surnameOhaeng,
        hasYongsin, hasHeeksin, yongsinChars,
        elementScore                        # ★원시 숫자만. 등급 판정 안 함
    }}
```

⚠️ **`hasYongsin` 은 이름만 보고, `yongsinChars` 는 성까지 봅니다.**
성만 용신을 담은 사주에서 AI 가 받는 사실이 서로 모순됩니다 (2-A장 ②).

⚠️ **`elementScore`(사주 오행 점수)를 판정에 쓰지 않습니다.** facts 로 넘기고 끝입니다.
`simsanOhaeng.grade()` 가 이미 `결핍(0) / 약함(<25) / 발달(≥25) / 과다(≥50)` 를 주는데 부르지 않습니다.
→ **과다 오행 중복 투입 경고가 원천적으로 불가능합니다.**

### 종합 점수 (`naming.ts:308`)

```
num(g) = 좋음 → 2 | 보통 → 1 | 아쉬움 → 0

weighted = num(yongsinBohwan) × 3      # 사주보완
         + num(resourceFlow)   × 2      # 자원오행
         + num(suri)           × 1.5    # 수리
         + num(soundFlow)      × 1      # 발음
                                        # ★음양은 종합에서 제외
maxWeighted = 15
ratio       = weighted / 15

overallGrade = ratio ≥ 0.7 → '좋음' | ratio < 0.4 → '아쉬움' | '보통'
```

⚠️ 자원오행이 걸린 자리가 **둘**입니다 — `resourceFlow`(×2) 와 `yongsinBohwan`(×3).
둘 다 같은 `resourceOhaeng` 값을 봅니다. **한 자료가 5/15(33%)를 지배합니다.**

### 후보 정렬 (`rename/hanja/page.tsx:200`)

```
FOR EACH row IN hanjaList:                       # 그 음의 인명용 한자 전부
    given' ← baseGiven 에서 activeIdx 칸만 row 로 교체
    r ← diagnoseName({surname, given', yongsin, heeksin, elementScore})
    weighted    ← 위 가중식
    fitsYongsin ← ohaengChar(row.resource_ohaeng) == yongsin
    scored.append({row, weighted, fitsYongsin})

SORT scored BY:
    ① fitsYongsin  DESC        # 용신 일치가 절대 우선
    ② avoid_soft   ASC         # 권장 회피자를 뒤로
    ③ weighted     DESC
    ④ strokes      ASC         # 같으면 획수 적은 쪽

recommend ← (fitsYongsin 있으면 그 부분집합, 없으면 전체) 의 앞 TOP_N
```

⚠️ **손님에게 안 보이는 `overallGrade` 계열 점수가 추천 순위를 실제로 정합니다.**
「판정하지 않는다」 는 방침은 **화면 문구에만** 적용되고, 추천은 점수로 줄 세웁니다.
방침 위반은 아니지만 **문서에 적혀 있지 않습니다.**

---

# 2. 기존 로직의 자원오행 판정 한계점 및 취약성

심각도 순으로 적습니다. **A 는 다른 모든 것보다 먼저입니다.**

## 2-A. 🔴 치명 — 정규화 그물이 «내이름 감정» 에만 빠져 있습니다

### ① 다섯 창구 중 하나만 날것을 씁니다

`diagnoseName` 을 부르는 곳은 다섯이고, `resource_ohaeng` 을 DB 에서 직접 읽는 곳은 둘입니다.

| 화면 | `resource_ohaeng` 읽음 | `ohaengChar()` 정규화 |
|---|---|---|
| **`naming/diagnosis/page.tsx`** | **4곳** | **0곳** 🔴 |
| `naming/rename/hanja/page.tsx` | 7곳 | 8곳 ✅ |
| `naming/rename/newhanja/page.tsx` | 7곳 | 6곳 ✅ |
| `naming/rename/result/page.tsx` | — | 6곳 ✅ |
| `naming/rename/newresult/page.tsx` | — | 8곳 ✅ |

정규화 함수는 이렇게 생겼습니다 (`rename/hanja/page.tsx:41`).

```ts
function ohaengChar(s: string): string {
  if (!s) return ''
  const t = s.trim()
  if (t.includes('木') || t.includes('목')) return '목'
  if (t.includes('火') || t.includes('화')) return '화'
  if (t.includes('土') || t.includes('토')) return '토'
  if (t.includes('金') || t.includes('금')) return '금'
  if (t.includes('水') || t.includes('수')) return '수'
  return t
}
```

**이 함수가 존재한다는 것 자체가 DB 값이 `목/화/토/금/수` 다섯 글자로 깨끗하지 않다는 증거입니다.**
한자(`木`)와 한글(`목`)을 함께 검사하고 `trim()` 을 하고 `includes` 로 부분일치를 봅니다 —
`'木(목)'`, `' 수 '`, `'水'` 같은 값을 예상한 방어입니다.

### ② 값이 한자나 혼합이면 «내이름 감정» 은 이렇게 무너집니다

```
DB 값이 '木' 이라고 가정하면 —

scoreResource:
    GENERATES['木'] → undefined
    relationOf('木','火') → 어느 IF 도 안 걸림 → {kind:'기타'}
    isSaeng('木','火') → false
    saeng = 0 → ratio = 0 → grade = '아쉬움'          ← ★언제나

scoreYongsin:
    nameOhaengs = ['木','火']   (한자)
    yongsin     = '목'          (한글 — yongsinNew.ts 가 한글로 줍니다)
    hasYongsin  = false                                ← ★언제나
    grade       = '아쉬움'                             ← ★언제나

diagnoseName:
    weighted = 0×3 + 0×2 + num(suri)×1.5 + num(sound)×1
             ≤ 5 / 15 = 0.33 < 0.4
    overallGrade = '아쉬움'                            ← ★언제나
```

**그리고 아무도 모릅니다.** 등급은 화면에 안 나오는 것이 방침이므로(`naming.ts:8`)
「모든 이름이 아쉬움」이라는 사실이 눈에 띌 자리가 없습니다.

**손님에게 실제로 나가는 피해는 등급이 아니라 AI 서술입니다.** facts 에 이렇게 실려 갑니다.

```json
"자원오행": { "links": [{"rel":"기타","text":"木→火"}], "saengCount": 0, "total": 2 }
"사주보완": { "hasYongsin": false, "yongsinChars": [] }
```

프롬프트는 「사실 데이터에 없는 내용은 지어내지 마세요」이므로 AI 는 성실하게
**「상생 관계가 보이지 않는다」 「용신을 담은 글자가 없다」** 로 씁니다. 틀린 풀이가 나갑니다.

### ③ 이것은 교훈 CZ·DA 의 «세 번째 거울» 입니다

```
교훈 CZ (35부)  프롬프트를 막았는데 «화면» 이 뿌린다
교훈 DA (36부)  화면을 막았는데 «AI 재료» 가 나른다
여기            개명 화면은 정규화했는데 «내이름 감정» 이 날것을 쓴다
```

그리고 `ohaengChar()` 가 **네 벌 중복**입니다 (교훈 CJ — 판정기를 둘로 두지 말 것).
정작 다섯 번째 자리에는 없습니다.

### ④ ★확정 쿼리 — 손대기 전에 이 한 줄부터

```sql
-- 자원오행 컬럼에 어떤 «표기» 들이 들어 있는지 세어 봅니다
SELECT resource_ohaeng, COUNT(*) AS n
FROM hanja
GROUP BY resource_ohaeng
ORDER BY n DESC;
```

```
결과가 목/화/토/금/수 다섯 줄뿐  → 이 문제는 «잠재 위험» 입니다.
                                   그래도 diagnosis 에 정규화를 넣으십시오(재발 방지).
그 밖의 표기가 섞여 있으면       → 🔴 지금 «내이름 감정» 이 오답을 내고 있습니다.
                                   4부 마이그레이션과 CHECK 제약을 먼저 하십시오.
```

## 2-B. 자원오행 «판정 자체» 의 한계

### ① 복수 자원오행이 없습니다

컬럼이 하나이므로 한 글자에 오행 하나만 담깁니다. 실제 성명학에서 갈리는 글자들 —

```
榮  부수 木 / 자의 «빛나다» 火     → 목·화 두 벌
淑  부수 水 / 자의 «맑고 곧다» 금 논의
恩  부수 心(火) / 因(土)          → 화·토
炫  부수 火 / 뜻 «밝게 빛나다» 화  → 이견 없음
承  부수 手(木계) / 자의 «잇다»    → 유파차 큼
```

지금 구조에서는 **누군가 하나를 골라 넣은 값**이고, 어느 쪽을 골랐는지·왜 골랐는지가 DB 에 없습니다.
「부수와 뜻의 오행이 다를 때」를 처리하는 코드는 **한 줄도 없습니다.**

### ② 부수 오행과 자의 오행을 구분하지 않습니다

`meaning` 컬럼이 있는데 판정에 안 씁니다 (`facts.sequence[].meaning` 으로 AI 에게만 전달).
즉 **뜻은 서술용이고 판정은 문자열 하나** 입니다.

### ③ 🔴 상극(相克)을 감점하지 않습니다

```
links 에 {rel:'극'} 라벨은 남습니다. 그러나 saeng 만 셉니다.

木剋土 (상극)      → saeng 에 안 들어감 → 0점
木→水 (기타·무관)  → saeng 에 안 들어감 → 0점
木·木 (비화·같음)  → saeng 에 안 들어감 → 0점
```

**상극·무관·비화가 점수상 완전히 동일합니다.** 「성이 이름을 극한다」와 「관계가 없다」가 같습니다.
성명학에서 상극은 무관보다 **나쁘게** 보는 자리인데 구별이 없습니다.

### ④ 상생의 «방향» 을 무시합니다

```
isSaeng(a,b) = GENERATES[a]==b OR GENERATES[b]==a
```

`木生火`(성이 이름을 낳음, 순생·하향생)와 `火←木`(이름이 성을 낳음, 역생)이 **같은 1점**입니다.
정통 성명학은 성→이름 방향의 순생을 좋게 보고 역생은 「자식이 부모를 봉양하는 격」으로 달리 봅니다.
`relationOf` 는 `text` 에 방향을 적어 두는데(`"b生a 상생"`) **점수는 그것을 안 봅니다.**

### ⑤ 이웃한 쌍만 봅니다

```
성 - 이름1 - 이름2  에서  성↔이름2 관계는 아예 안 봅니다.
```

3자 이상 이름에서는 건너뛴 관계가 더 늘어납니다. 그리고 `total` 이 커지므로
**같은 «상생 두 자리» 가 두 글자 이름에서는 1.0(좋음), 세 글자 이름에서는 0.67(좋음),
네 글자에서는 0.5(좋음)** — 분모가 달라 등급 기준이 이름 길이에 따라 흔들립니다.

### ⑥ 🔴 과다 오행 중복 투입 경고가 없습니다

```
elementScore 를 facts 로 넘기기만 하고 «판정» 하지 않습니다.
simsanOhaeng.grade() 가 결핍(0)/약함(<25)/발달(≥25)/과다(≥50) 를 이미 주는데 부르지 않습니다.
```

**결과** — 사주에 火가 60점(과다)이고 용신이 水인 손님이 이름에 `炫(火)` 을 넣어도

```
scoreResource   자원오행 흐름만 봄 → 木生火 이면 상생 1점 → '좋음' 가능
scoreYongsin    hasYongsin=false → '아쉬움' (용신 미충족으로만 잡힘)
경고             0건
```

「이미 넘치는 기운을 더 보탠다」는 **가장 중요한 경고가 나갈 자리가 없습니다.**
용신을 못 담은 것과 기신을 보탠 것이 똑같이 «아쉬움» 입니다.

### ⑦ 🔴 기신(忌神)·구신(仇神)을 버립니다

```
calcYongsinCompat 반환  { isStrong, yongsin, heeksin, gisin, gusin, hansin, score, description }
naming 이 받는 것        { yongsin, heeksin, score }
버리는 것               isStrong · gisin · gusin · hansin      ← ★넷
```

기신이 있는데 안 봅니다. 그래서 ⑥의 경고를 만들 재료가 **이미 손안에 있는데도** 안 씁니다.

### ⑧ 성(姓)의 취급이 한 파일 안에서 세 갈래입니다

```
scoreResource        성 «포함»  (seq = [surname] + given)
scoreYongsin         성 «제외»  (nameOhaengs = given only)     → hasYongsin
scoreYongsin         성 «포함»  (yongsinChars)                  ← ★같은 함수 안에서 어긋남
```

성은 바꿀 수 없으므로 「용신 충족」 판정에서 제외하는 것은 **논리적으로 옳습니다.**
문제는 `yongsinChars` 가 다른 잣대를 쓰는 것이고, **어느 쪽이 의도인지 주석이 없습니다.**

### ⑨ 수리·음양·발음과 서로를 모릅니다

네 관점이 각각 독립 계산되고 마지막에 가중 합산만 됩니다.
`strokes` 가 정한 획수 오행과 `resource_ohaeng` 이 정한 자원오행이 충돌하는 글자를
「어느 쪽을 따를지」 정하는 규칙이 없습니다.

### ⑩ 빈 값·오타가 조용히 통과합니다

```
resource_ohaeng = ''  또는 '토양' 같은 오타
  → relationOf → '기타' → saeng 0 → 감점 없이 «아쉬움»
  → 예외도 경고도 로그도 없습니다
```

### ⑪ 이름 길이 방어막이 관점마다 다릅니다

```
수리(scoreSuri)     이름 4글자 이상 → 격 0개인데 grade='좋음' (조건식 0 >= -1)
자원오행            4글자여도 계속 돕니다 (분모만 커짐)
입력 방어막         arr.length < 2 만 막음 · input maxLength=5
복성(남궁·선우)      surname=chars[0] 로 «남» 한 글자만 성이 됨
```

**복성 손님은 4글자로 들어와 수리 격 0개 + 자원오행 분모 3** 을 받습니다.

## 2-C. 점수 체계의 구조적 한계

| 자리 | 문제 |
|---|---|
| 3단 등급(2/1/0) | ratio 0.5 와 1.0 이 같은 «좋음». 정보가 뭉개집니다 |
| 두 글자 이름 | ratio 가 0·0.5·1.0 뿐 → «보통» 이 나올 수 없음 |
| 자원오행 이중 계산 | `resourceFlow`(×2) + `yongsinBohwan`(×3) 이 같은 컬럼을 봄 → 5/15 지배 |
| 음양 제외 | 종합에서 빠지는데 `scoreYinYang` 은 계속 계산 |
| 등급 은닉 | 화면에는 안 쓰는데 **추천 순위**는 이 점수로 정함 (문서화 안 됨) |
| 경고 없음 | 반환 타입에 `warnings` 자리가 없음 → 「위험」을 표현할 수단이 없음 |

---

# 3. 전문가급 개선 자원오행 판정/점수화 알고리즘

## 3-0. 설계 원칙 — 기존 틀을 깨지 않습니다

```
① 「좋다/나쁘다 판정 금지」 방침 유지
   → 점수는 «내부» 로만 (후보 정렬용). 손님에게는 «사실 + 경고» 만 facts 로.
② diagnoseName 의 반환 모양을 깨지 않음
   → resourceFlow / yongsinBohwan 의 grade·facts 를 그대로 두고 facts 를 늘림
③ 정규화 창구를 «하나» 로 (교훈 CJ)
   → lib/saju/ohaeng.ts 신설. 네 벌의 ohaengChar 를 여기로 흡수
④ 이미 있는 부품을 다시 만들지 않음
   → simsanOhaeng.grade() · calcYongsinCompat 의 gisin/gusin/hansin 을 «부릅니다»
⑤ 경고는 «감점» 이 아니라 «사실» 로도 나갑니다
   → AI 가 담담히 서술할 수 있게. 판정은 여전히 AI 가 안 합니다
```

## 3-1. 0단계 — 정규화 단일 창구 (★가장 먼저)

```ts
// lib/saju/ohaeng.ts  ← 신설. 네 벌의 ohaengChar 를 여기로 모읍니다
export type Ohaeng = '목' | '화' | '토' | '금' | '수'

const ALIAS: Record<string, Ohaeng> = {
  목: '목', 木: '목', mok: '목',
  화: '화', 火: '화', hwa: '화',
  토: '토', 土: '토', to: '토',
  금: '금', 金: '금', geum: '금', gum: '금',
  수: '수', 水: '수', su: '수',
}

/**
 * 오행 표기를 다섯 글자 중 하나로 정규화한다. 못 알아보면 null.
 * ⚠️ null 을 '기타' 로 뭉개지 마십시오. 호출부가 «모름» 을 알아야 합니다.
 */
export function normalizeOhaeng(raw: string | null | undefined): Ohaeng | null {
  if (!raw) return null
  const t = String(raw).trim()
  if (ALIAS[t]) return ALIAS[t]
  // '木(목)' · '수 水' 같은 혼합 표기 — 부분일치는 «마지막 수단»
  for (const key of Object.keys(ALIAS)) {
    if (t.includes(key)) return ALIAS[key]
  }
  return null
}

/** 정규화 실패를 «세는» 창구. 조용히 넘기지 않기 위한 것입니다. */
export function normalizeOhaengStrict(
  raw: string | null | undefined,
  ctx: string,
): { ohaeng: Ohaeng | null; problem: string | null } {
  const o = normalizeOhaeng(raw)
  return o
    ? { ohaeng: o, problem: null }
    : { ohaeng: null, problem: `${ctx}: 자원오행을 못 읽었습니다 (원값 "${raw ?? ''}")` }
}
```

⚠️ **`diagnosis/page.tsx:361` 을 이 함수로 바꾸는 것이 3부 전체에서 가장 값싸고 큰 고침입니다.**

## 3-2. 관계·방향 판정 (상극을 «감점» 으로 승격)

```ts
export type RelKind = '순생' | '역생' | '순극' | '역극' | '비화' | '모름'

const GENERATES: Record<Ohaeng, Ohaeng> = { 목:'화', 화:'토', 토:'금', 금:'수', 수:'목' }
const CONTROLS:  Record<Ohaeng, Ohaeng> = { 목:'토', 토:'수', 수:'화', 화:'금', 금:'목' }

/** a 를 «앞 글자», b 를 «뒤 글자» 로 보고 방향까지 가린다 */
export function relationDirected(a: Ohaeng | null, b: Ohaeng | null): RelKind {
  if (!a || !b) return '모름'
  if (a === b) return '비화'
  if (GENERATES[a] === b) return '순생'   // 앞이 뒤를 낳음 — 성→이름 하향생
  if (GENERATES[b] === a) return '역생'   // 뒤가 앞을 낳음 — 역생
  if (CONTROLS[a]  === b) return '순극'   // 앞이 뒤를 극함 — 성이 이름을 누름 ★가장 무거움
  if (CONTROLS[b]  === a) return '역극'   // 뒤가 앞을 극함
  return '모름'
}

/** 배치 점수 — «관계 하나» 의 값. 합이 아니라 평균으로 씁니다 */
const REL_SCORE: Record<RelKind, number> = {
  순생:  2.0,   // 가장 좋게 보는 자리
  비화:  1.0,   // 같은 기운 — 나쁘지 않으나 흐름이 없음
  역생:  1.0,   // 상생이지만 방향이 거꾸로
  역극: -1.0,   // 이름이 성을 극함
  순극: -2.0,   // ★성이 이름을 극함 — 가장 무겁게 감점
  모름:  0.0,   // 판정 불가. 0 «이면서» problems 에 남깁니다
}
```

## 3-3. 사주 오행 프로필 (과다·결핍·기신을 «받아옵니다»)

```ts
import { grade as ohaengGrade } from '@/lib/saju/simsanOhaeng'  // 결핍/약함/발달/과다

export interface SajuOhaengProfile {
  yongsin: Ohaeng | null
  heeksin: Ohaeng | null
  gisin:   Ohaeng | null      // ★지금 버리는 값
  gusin:   Ohaeng | null      // ★지금 버리는 값
  hansin:  Ohaeng | null      // ★지금 버리는 값
  isStrong: boolean
  score:   Record<Ohaeng, number>
  level:   Record<Ohaeng, '결핍' | '약함' | '발달' | '과다'>
}

export function buildProfile(y: YongsinCompatResult): SajuOhaengProfile {
  const score = {} as Record<Ohaeng, number>
  const level = {} as SajuOhaengProfile['level']
  for (const o of ['목','화','토','금','수'] as Ohaeng[]) {
    score[o] = y.score?.[o] ?? 0
    level[o] = ohaengGrade(score[o])          // ★새 잣대를 만들지 않습니다
  }
  return {
    yongsin: normalizeOhaeng(y.yongsin),
    heeksin: normalizeOhaeng(y.heeksin),
    gisin:   normalizeOhaeng(y.gisin),
    gusin:   normalizeOhaeng(y.gusin),
    hansin:  normalizeOhaeng(y.hansin),
    isStrong: y.isStrong,
    score, level,
  }
}
```

## 3-4. 글자 하나의 자원오행 해석 (복수 오행·부수/자의 대응)

```ts
export interface ResolvedChar {
  hanja: string
  hangul: string
  primary:   Ohaeng | null      // 주 자원오행
  secondary: Ohaeng | null      // 부 자원오행 (없으면 null)
  basis: '부수' | '자의' | '부수+자의' | '통설' | '미상'
  confidence: 1 | 2 | 3         // 3 = 유파 이견 없음
  problems: string[]
}

/**
 * DB 한 줄을 «해석» 한다.
 * ⚠️ 4부 스키마가 들어오기 전에도 돕니다 — 새 컬럼이 없으면 예전처럼 primary 만 씁니다.
 */
export function resolveChar(row: HanjaRow): ResolvedChar {
  const problems: string[] = []

  const p = normalizeOhaengStrict(row.resource_ohaeng_primary ?? row.resource_ohaeng, row.hanja)
  if (p.problem) problems.push(p.problem)

  const s = row.resource_ohaeng_secondary ? normalizeOhaeng(row.resource_ohaeng_secondary) : null

  // 부수 오행과 자의 오행이 «둘 다» 있고 서로 다르면 — 지금은 없던 처리
  const rad = normalizeOhaeng(row.radical_ohaeng)
  const mea = normalizeOhaeng(row.meaning_ohaeng)
  let basis: ResolvedChar['basis'] = row.resource_basis ?? '미상'
  let confidence: 1 | 2 | 3 = (row.resource_confidence as 1|2|3) ?? 2

  if (rad && mea) {
    if (rad === mea) { basis = '부수+자의'; confidence = 3 }
    else {
      basis = row.resource_basis ?? '부수'      // ★기본은 부수 우선 (한쪽으로 «고정»)
      confidence = 1                             //   이견이 있는 글자로 표시
      problems.push(`${row.hanja}: 부수(${rad})와 자의(${mea})의 오행이 다릅니다 — ${basis} 기준으로 봤습니다`)
    }
  }

  return {
    hanja: row.hanja, hangul: row.hangul,
    primary: p.ohaeng, secondary: s, basis, confidence, problems,
  }
}
```

⚠️ **부수를 기본으로 «고정» 한 것은 판정을 흔들리지 않게 하기 위한 선택입니다.**
목화통명을 「일간 목」으로 고정한 것과 같은 성격이고(36-2장), 유파 선택이므로
**연재쌤 확인을 받고 `resource_basis` 컬럼에 글자별로 적어 두는 것이 옳습니다.**

## 3-5. ★본체 — 자원오행 판정과 사주 연동

```ts
export interface ResourceVerdict {
  /** 내부 점수 0~100. ★손님 화면에 쓰지 마십시오. 후보 정렬 전용 */
  score: number
  /** 하위호환 3단 등급 — 기존 weighted 식이 계속 돕니다 */
  grade: '좋음' | '보통' | '아쉬움'
  /** AI 에게 «사실» 로 나갈 것들 */
  facts: {
    chain: string
    links: Array<{ from: Ohaeng | null; to: Ohaeng | null; rel: RelKind; text: string }>
    flowAvg: number
    yongsin: Ohaeng | null; heeksin: Ohaeng | null
    hasYongsin: boolean; hasHeeksin: boolean
    yongsinChars: Array<{ hanja: string; hangul: string }>   // ★given 만 — 잣대 통일
    surnameOhaeng: Ohaeng | null
    excessAdded: Ohaeng[]      // 과다인데 이름이 더 보탠 오행
    lackFilled:  Ohaeng[]      // 결핍인데 이름이 채운 오행
    gisinAdded:  Ohaeng[]      // 기신·구신을 보탠 오행
    levels: Record<Ohaeng, string>
  }
  /** ★신설 — 「경고」를 표현할 자리. 지금 구조에는 없습니다 */
  warnings: string[]
  /** 판정 불가·데이터 문제. 조용히 넘기지 않습니다 */
  problems: string[]
}

// ── 배점 (합 100) ──────────────────────────────────────────
const W_FLOW    = 30   // ① 배치(흐름) — 방향 있는 상생/상극
const W_YONGSIN = 40   // ② 용신 충족 — 가장 무겁게
const W_BALANCE = 30   // ③ 균형 — 과다 억제 · 결핍 충족 · 기신 회피
// ⚠️ 이 셋을 바꾸면 개명 «추천 순위» 가 바뀝니다. 바꿀 때 무작위 표본으로 재십시오 (교훈 BO)

export function judgeResource(
  surnameRow: ResolvedChar,
  givenRows: ResolvedChar[],
  P: SajuOhaengProfile,
): ResourceVerdict {

  const problems: string[] = [...surnameRow.problems, ...givenRows.flatMap(g => g.problems)]
  const warnings: string[] = []

  const seq = [surnameRow, ...givenRows]
  const O   = seq.map(c => c.primary)

  // ───────────────────────────────────────────────────────
  // ① 배치(흐름) — 이웃 쌍 + «성↔끝글자» 한 자리를 더 봅니다
  // ───────────────────────────────────────────────────────
  const links: ResourceVerdict['facts']['links'] = []
  let relSum = 0, relCount = 0

  for (let i = 0; i < O.length - 1; i++) {
    const rel = relationDirected(O[i], O[i + 1])
    links.push({ from: O[i], to: O[i + 1], rel, text: relText(O[i], O[i + 1], rel) })
    relSum += REL_SCORE[rel]; relCount++
    if (rel === '순극') warnings.push(`${seq[i].hanja}(${O[i]})가 ${seq[i+1].hanja}(${O[i+1]})를 극하는 자리로 봅니다`)
    if (rel === '모름') problems.push(`${seq[i].hanja}→${seq[i+1].hanja} 관계를 판정하지 못했습니다`)
  }
  // ★건너뛴 관계 하나 — 성과 마지막 글자 (3자 이상에서 의미가 큽니다)
  if (O.length >= 3) {
    const far = relationDirected(O[0], O[O.length - 1])
    links.push({ from: O[0], to: O[O.length - 1], rel: far, text: relText(O[0], O[O.length-1], far) + ' (성↔끝)' })
    relSum += REL_SCORE[far] * 0.5; relCount += 0.5      // 반 무게
  }

  const flowAvg   = relCount > 0 ? relSum / relCount : 0          // -2.0 ~ +2.0
  const flowScore = clamp((flowAvg + 2) / 4, 0, 1) * W_FLOW        // 0 ~ 30

  // ───────────────────────────────────────────────────────
  // ② 용신 충족 — ★성은 제외합니다 (바꿀 수 없는 글자이므로)
  // ───────────────────────────────────────────────────────
  const givenO = givenRows.map(g => g.primary)
  const givenAll = givenRows.flatMap(g => [g.primary, g.secondary]).filter(Boolean) as Ohaeng[]

  const hasYongsin = !!P.yongsin && givenO.includes(P.yongsin)
  const hasYongsinSecondary = !!P.yongsin && !hasYongsin && givenAll.includes(P.yongsin)
  const hasHeeksin = !!P.heeksin && givenO.includes(P.heeksin)

  let yongsinScore = 0
  if (hasYongsin)                yongsinScore = W_YONGSIN            // 40
  else if (hasYongsinSecondary)  yongsinScore = W_YONGSIN * 0.7      // 28 — 부 오행으로 충족
  else if (hasHeeksin)           yongsinScore = W_YONGSIN * 0.5      // 20 — 희신 (관대 모드)
  else if (P.hansin && givenO.includes(P.hansin)) yongsinScore = W_YONGSIN * 0.25  // 10
  else {
    yongsinScore = 0
    warnings.push(`이름에 사주가 바라는 기운(${P.yongsin ?? '미상'})이 담기지 않았습니다`)
  }

  // ───────────────────────────────────────────────────────
  // ③ 균형 — ★지금 «전혀 없는» 판정입니다
  // ───────────────────────────────────────────────────────
  let balance = W_BALANCE                     // 만점에서 깎아 내려갑니다
  const excessAdded: Ohaeng[] = []
  const lackFilled:  Ohaeng[] = []
  const gisinAdded:  Ohaeng[] = []

  for (const o of givenO) {
    if (!o) continue

    // (a) 과다 오행을 또 보탰다 — ★가장 중요한 경고
    if (P.level[o] === '과다') {
      excessAdded.push(o)
      balance -= 12
      warnings.push(`사주에 ${o} 기운이 이미 넘치는 편인데(${P.score[o]}점) 이름도 ${o}을 더합니다`)
    } else if (P.level[o] === '발달') {
      balance -= 4
    }

    // (b) 결핍 오행을 채웠다 — 가산
    if (P.level[o] === '결핍') {
      lackFilled.push(o)
      balance += 6
    }

    // (c) 기신·구신을 보탰다 — ★지금은 재료조차 안 받는 판정
    if (P.gisin && o === P.gisin) {
      gisinAdded.push(o)
      balance -= 15
      warnings.push(`${o}은 이 사주가 꺼리는 기운(기신)으로 봅니다`)
    } else if (P.gusin && o === P.gusin) {
      gisinAdded.push(o)
      balance -= 8
    }
  }
  balance = clamp(balance, 0, W_BALANCE)

  // ───────────────────────────────────────────────────────
  // 합산 · 신뢰도 감쇠 · 하위호환 등급
  // ───────────────────────────────────────────────────────
  let score = flowScore + yongsinScore + balance

  // 유파 이견이 큰 글자가 섞이면 점수를 «확신 없이» 씁니다
  const minConf = Math.min(...seq.map(c => c.confidence))
  if (minConf === 1) score *= 0.92

  // 판정 불가 글자가 있으면 점수를 신뢰하지 않습니다 — ★조용한 통과를 막는 자리
  if (O.some(o => o === null)) {
    problems.push('자원오행을 못 읽은 글자가 있어 이 점수는 참고용입니다')
    score = Math.min(score, 40)
  }

  score = Math.round(clamp(score, 0, 100))

  const grade: ResourceVerdict['grade'] =
    score >= 70 ? '좋음' : score >= 45 ? '보통' : '아쉬움'

  return {
    score, grade, warnings, problems,
    facts: {
      chain: seq.map(c => `${c.hanja}(${c.primary ?? '?'})`).join('→'),
      links, flowAvg,
      yongsin: P.yongsin, heeksin: P.heeksin,
      hasYongsin, hasHeeksin,
      yongsinChars: givenRows                          // ★given 만 — 잣대 통일
        .filter(g => g.primary === P.yongsin)
        .map(g => ({ hanja: g.hanja, hangul: g.hangul })),
      surnameOhaeng: surnameRow.primary,
      excessAdded, lackFilled, gisinAdded,
      levels: P.level as unknown as Record<Ohaeng, string>,
    },
  }
}

function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)) }
```

> ⚠️ `relText()` 는 새로 만들지 말고 기존 `relationOf().text` 에 방향 라벨만 붙여 재사용하십시오.
> 관계 문장을 두 곳에서 만들면 화면과 재료가 갈립니다. (교훈 CJ)

## 3-6. 프롬프트에 나가는 모양 — 「경고」를 «사실» 로

```
[자원오행 — 글자에 담긴 기운]
흐름   柳(목) → 承(금) → 炫(화)
관계   목→금 : 상극으로 보는 자리 (앞이 뒤를 누름)
       금→화 : 상극으로 보는 자리 (뒤가 앞을 누름)

[사주와의 관계]
사주가 바라는 기운(용신)   수
이름에 담긴 기운           금 · 화
용신을 담은 글자           없음
이미 넉넉한 기운           화 55점(과다) ← 이름의 炫이 여기에 더합니다
비어 있는 기운             수 0점(결핍) ← 이름이 채우지 않았습니다
```

⚠️ **「나쁘다」는 말을 한 번도 쓰지 않았습니다.** 숫자와 관계만 적었고 판정 문장은 AI 가 씁니다.
지금 방침(`naming.ts:8`)을 그대로 지키면서 **AI 가 쓸 수 있는 사실이 다섯 줄 늘었습니다.**

## 3-7. 갈아 끼우는 순서 (되돌릴 수 있게)

```
① lib/saju/ohaeng.ts 신설 · diagnosis/page.tsx:361 만 고침
   → 이것만으로 2-A 가 닫힙니다. 다른 화면은 안 건드립니다
② rename 4화면의 ohaengChar 를 import 로 교체 (네 벌 → 한 벌)
③ judgeResource 를 «나란히» 붙이고 기존 scoreResource·scoreYongsin 을 남겨 둡니다
   → facts 에 새 키만 더합니다. 화면·파서는 그대로 돕니다
④ 무작위 표본으로 걸림 비율을 재고 배점을 조입니다 (교훈 BO)
   과다투입 경고 몇 % · 기신 몇 % · score 분포
⑤ 그물을 걸고(4-4장) 배점을 확정한 뒤 옛 함수를 지웁니다
```

⚠️ **①과 ③을 한 번에 하지 마십시오.** ①은 «오답을 고치는 것» 이고 ③은 «잣대를 바꾸는 것» 입니다.
함께 하면 무엇이 바뀐 것인지 갈라볼 수 없습니다. (교훈 DU)

---

# 4. DB 스키마 개선안

## 4-1. ★가장 먼저 — 값을 «막는» 제약

```sql
-- 0) 지금 어떤 표기가 들어 있는지 먼저 셉니다 (2-A장 ④와 같은 쿼리)
SELECT resource_ohaeng, COUNT(*) FROM hanja GROUP BY resource_ohaeng ORDER BY 2 DESC;

-- 1) 정규화 컬럼을 새로 만들고 기존 값을 옮깁니다 (원본은 남깁니다)
ALTER TABLE hanja ADD COLUMN resource_ohaeng_primary text;

UPDATE hanja SET resource_ohaeng_primary = CASE
  WHEN resource_ohaeng LIKE '%목%' OR resource_ohaeng LIKE '%木%' THEN '목'
  WHEN resource_ohaeng LIKE '%화%' OR resource_ohaeng LIKE '%火%' THEN '화'
  WHEN resource_ohaeng LIKE '%토%' OR resource_ohaeng LIKE '%土%' THEN '토'
  WHEN resource_ohaeng LIKE '%금%' OR resource_ohaeng LIKE '%金%' THEN '금'
  WHEN resource_ohaeng LIKE '%수%' OR resource_ohaeng LIKE '%水%' THEN '수'
  ELSE NULL END;

-- 2) 옮기지 못한 줄을 «눈으로» 봅니다. 0건이어야 다음으로 갑니다
SELECT hanja, hangul, resource_ohaeng FROM hanja WHERE resource_ohaeng_primary IS NULL;

-- 3) ★이 제약 하나가 2-A 의 재발을 원천 차단합니다
ALTER TABLE hanja ADD CONSTRAINT hanja_res_primary_ck
  CHECK (resource_ohaeng_primary IN ('목','화','토','금','수'));
```

⚠️ **`resource_ohaeng`(원본)을 지우지 마십시오.** 옮긴 값이 맞는지 나중에 대조할 유일한 근거입니다.
(교훈 CR — 이 저장소에서 지운 것은 되살리기 어렵습니다)

## 4-2. 자원오행 정밀도를 위한 컬럼

```sql
ALTER TABLE hanja
  ADD COLUMN resource_ohaeng_secondary text,   -- 부 자원오행 (없으면 NULL)
  ADD COLUMN radical                   text,   -- 부수 그대로 ('木','氵','心')
  ADD COLUMN radical_ohaeng            text,   -- 부수의 오행
  ADD COLUMN meaning_ohaeng            text,   -- 자의(뜻)의 오행
  ADD COLUMN resource_basis            text,   -- '부수'|'자의'|'부수+자의'|'통설'
  ADD COLUMN resource_confidence       smallint DEFAULT 2,  -- 1 이견큼 ~ 3 이견없음
  ADD COLUMN school_variants           jsonb;  -- {"작명왕":"수","연재":"금"}

ALTER TABLE hanja
  ADD CONSTRAINT hanja_res_secondary_ck
    CHECK (resource_ohaeng_secondary IS NULL
           OR resource_ohaeng_secondary IN ('목','화','토','금','수')),
  ADD CONSTRAINT hanja_basis_ck
    CHECK (resource_basis IS NULL
           OR resource_basis IN ('부수','자의','부수+자의','통설')),
  ADD CONSTRAINT hanja_conf_ck
    CHECK (resource_confidence BETWEEN 1 AND 3);
```

| 컬럼 | 무엇을 풀어 주나 |
|---|---|
| `resource_ohaeng_secondary` | 2-B① 복수 자원오행 (榮 = 목·화) |
| `radical` · `radical_ohaeng` | 2-B② 부수 근거를 코드가 볼 수 있게 |
| `meaning_ohaeng` | 2-B② 자의 오행. `meaning`(텍스트)과 별도 |
| `resource_basis` | 부수와 자의가 갈릴 때 **어느 쪽을 골랐는지 기록** |
| `resource_confidence` | 3-5장 신뢰도 감쇠(×0.92)의 입력 |
| `school_variants` | 유파차를 지우지 않고 담아 둠 — 연재쌤 검수 흔적 |

## 4-3. 그 밖에 정리하면 좋을 컬럼

```sql
ALTER TABLE hanja
  ADD COLUMN strokes_kangxi  smallint,   -- 강희 원획 (지금 strokes 가 이것)
  ADD COLUMN strokes_actual  smallint,   -- 실획 (유파차 대응)
  ADD COLUMN is_name_use     boolean,    -- grade='不用' 문자열 대신 «참/거짓»
  ADD COLUMN source          text,       -- 출처 (교재 쪽수·자전)
  ADD COLUMN updated_by      text,
  ADD COLUMN updated_at      timestamptz DEFAULT now();
```

⚠️ **`grade` 문자열 필터(`row.grade === '不用'`)를 `is_name_use` 로 바꾸십시오.**
지금은 한자 문자열 비교라 표기가 하나만 달라도 조용히 통과합니다 —
2-A 와 같은 종류의 위험입니다.

⚠️ `sound_ohaeng` 컬럼은 코드가 **안 씁니다.** 지우지 말고
**「초성에서 계산합니다. 이 컬럼은 참고용」** 을 표 주석(`COMMENT ON COLUMN`)에 박아 두십시오.
안 그러면 다음 사람이 둘 중 어느 것이 진짜인지 몰라 헤맵니다.

```sql
COMMENT ON COLUMN hanja.sound_ohaeng IS
  '참고용. 코드는 naming.ts 의 soundOhaengOf() 로 초성에서 계산합니다(ㅇㅎ=土 고정).';
COMMENT ON COLUMN hanja.resource_ohaeng IS
  '원본 표기(혼합 가능). 판정은 resource_ohaeng_primary 를 쓰십시오.';
```

## 4-4. ★검사 그물 — `16-verify-naming.ts` (지금 0건입니다)

naming 은 다섯 그물 어디에도 없습니다. `suri81` 과 오행 판정은 순수 함수라 그물이 가장 쉬운 자리입니다.

```
① normalizeOhaeng 이 못 읽는 resource_ohaeng 값이 DB 에 몇 건인가   → 0건이어야 함
② hasYongsin ↔ yongsinChars 모순이 0건인가                        (2-B⑧)
③ 무작위 이름 N개에서 problems 가 남는 비율                        (조용한 실패 감시)
④ 경계 입력이 «조용히» 통과하지 않는가
     · 외자 이름 · 4·5글자 이름 · 복성 · 한자 아닌 글자
     · scoreSuri 의 격 0개 + grade='좋음' 자리  ← ★지금 통과합니다
⑤ suri81 표 81칸 · 환원(82→2 · 163→3) 정상       ← 지금도 통과합니다
⑥ 배점 바꿀 때 걸림 비율 — 과다투입 경고 %, 기신 %, score 분포     (교훈 BO)

★prebuild 에 걸 수 있습니다. ①만 Supabase 를 부르니 그것만 관문 밖으로 두십시오.
```

---

# 부록 — 손대기 전 5분 점검표

```
□ SELECT resource_ohaeng, COUNT(*) FROM hanja GROUP BY 1;      ← ★가장 먼저
□ diagnosis/page.tsx:361 이 정규화를 거치는가                    (2-A)
□ ohaengChar 사본이 몇 벌인가 (지금 4벌)                         (교훈 CJ)
□ calcYongsinCompat 의 gisin·gusin·hansin 을 받아 쓰는가 (지금 안 씀)
□ elementScore 를 simsanOhaeng.grade() 에 통과시키는가 (지금 안 함)
□ 이름 4·5글자 입력이 막히는가 (지금 안 막힘 · maxLength=5)
□ 복성이 두 글자 성으로 잡히는가 (지금 안 잡힘)
```

**이 문서의 «이러면 된다» 도 다시 재 주십시오. (교훈 DK)**
3부의 배점(30/40/30)과 감점 폭(-12·-15)은 **제가 정한 값이고 실측이 아닙니다.**
무작위 표본으로 걸림 비율을 재고 조이십시오.
