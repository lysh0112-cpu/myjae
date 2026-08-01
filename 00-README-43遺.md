# 43부 변경 파일 — 2026-08-01 (최종 · 보관함 분리 포함)

```
기준 저장소   https://github.com/lysh0112-cpu/myjae.git
기준 커밋     3b97c57
검사          857 → ★1,002건 · 실패 0
타입          tsc --noEmit 통과
eslint        기준선 유지 (오류 동일 · 경고 1건 감소)
```

**저장소 루트에 그대로 덮어쓰면 됩니다.**

---

## ★이번에 더한 것 — 입구에 따른 보관함 분리

```
?mode=diagnosis   「내 이름 보관함」  탭 없음 · [+ 새 이름 풀이하기] 하나
?mode=naming      「작명 보관함」     탭 없음 · [+ 새 이름 짓기] 하나
(mode 없음)       「내 이름 보관함」  탭 셋 · 버튼 둘   ← ★예전 그대로
```

바뀐 입구
```
홈 [내이름 감정]  → storage?mode=diagnosis
홈 [아기 작명]    → storage?mode=naming          ★안내 화면이 아니라 보관함으로
                     ⚠️ 두 번째 오시는 분은 «지난번 이름» 부터 보고 싶으십니다.
                        안내 화면은 그 보관함 안 「처음이신가요」로 이어 두었습니다.
rename/newborn    → storage?mode=naming&open=작명
```

⚠️⚠️ **«거르기» 이지 «지우기» 가 아닙니다.**
```
· listNamingRecords 는 예전 그대로 «전부» 불러옵니다. 화면에서만 거릅니다.
· 머리의 건수를 «보이는 목록» 과 맞췄습니다 (숫자와 목록이 어긋나면 「어디 갔지」가 됩니다)
· 아래 「◯◯ 기록도 함께 보기 · N건」 으로 언제든 전체를 봅니다
  ★기록이 «사라진 줄» 알고 놀라시는 일이 없어야 합니다
· mode 가 없을 때를 예전 그대로 둔 것은 «일부러» 입니다 — 옛 링크·마이페이지 (교훈 AM)
```

---

## 신규 4

```
lib/saju/namingSession.ts        작명 «대상» 을 Step 2→3→4 로 나르는 단일 창구
28-verify-naming-flow.ts         작명 동선 그물 99건   → verify 등록
30-e2e-naming-flow.ts            세 동선 e2e 45건      → verify 등록
29-measure-resource-weights.ts   자원오행 배점 «자»
                                 ⚠️ verify 에 «넣지 않았습니다» — 검사가 아닙니다
                                 npm run measure:resource
```

## 수정 13

```
[결함 ①②③④ + E]
 naming/rename/newname     ①신생아 진입 · ②URL 성씨 우선
 naming/rename/newhanja    ③kind 전달 · ④대상 사주 · 성씨 한자 고르기 · 두음 안내
 naming/rename/newresult   ③'개명' 붙박이 제거 · ④대상 사주 · relation 기록
 naming/rename/newborn     E — 준비중 안내 → 실입구 (+ mode 전달)
 naming/diagnosis/storage  kind 전달 · ?open=작명 · ★?mode= 분기
 app/home-new              👶 카드 복원 + ★두 카드에 mode
 lib/saju/surname.ts       surnameOfHangul() 추가

[마무리]
 naming/rename/auto        🔴 가짜 데이터 10건 삭제 → 엔진(Step 2)으로 보내는 다리
                           ⚠️ 파일은 남깁니다 — 옛 링크가 404 가 되지 않게
 naming/rename/hanja       대법원 인명용 한자 «확인 권유»
 lib/saju/hanjaRow.ts      court_name_use 칸 자리 + courtNameUse() — ★지금은 «모름»
 lib/saju/resourceJudge.ts ★주석 35줄만 — «현행 배점 유지» 확정 기록
                           ⚠️ 값은 «한 글자도» 안 바꿨습니다
 25-verify-manse-ui.ts     ⚠️ 결함을 «지키던» 검사 둘 갱신
 package.json              verify 에 28·30 등록 · measure:resource 추가
```

## ⛔ 손대지 않은 것 (인수인계서 11장 — 전부 무손상)

```
simsanOhaeng.ts   yongsinNew.ts   ohaengColor.ts   naming/start/   CoupleWonguk.tsx
resourceJudge.ts  ★배점 상수 — 주석만
```

---

## ⚠️ 배포 후 «실기» 확인 — 자동 검사가 대신하지 못합니다

```
① 개명(본인)    홈 [내이름 감정] → 「내 이름 보관함」 · 버튼 하나인지
                → 감정 → 한자 바꾸기가 «전과 똑같은가»

② 아기 작명     홈 [아기 작명] → 「작명 보관함」 · [+ 새 이름 짓기] 하나인지
                → 성씨(류)+생년월일 → 추천 열 개 → ★성씨 한자(柳/劉) → 「신생아」 배지
                ★한글 조합(IME) · 결제 팝업 · 보관함 「신생아」 태그

③ 가족 작명     보관함 [+ 새 이름 짓기] → «가족·지인» 선택
                → Step 3·4 의 «필요한 기운» 이 그 사람 것인가 (내 용신이면 ④ 재발)

④ ★기록 확인    보관함에서 「함께 보기 · N건」 을 눌러 «전부 그대로» 있는지
                ⚠️ 이번 분리로 놀라시는 분이 없어야 합니다
```

## 🔴 남은 PENDING

```
□ hanja 표 court_name_use 칸 — 원본이 오면 ①SQL ②배지(거르지 «마십시오») ③문구 승격
□ 자원오행 흐름 감점 «가·나·다» (39부 3-1장 ①) — 교재 151쪽과 «같은 결정»
   ⚠️ 손대기 전 npm run measure:resource · 「흐름 무게」와 「별점 몰림」은 다른 손잡이
□ 합격운 API 무응답 (36부부터)   □ PREMIUM_FOR_ALL = true (22부부터)
□ 17-verify-hanja-data.ts 가 verify 체인에 없음 (수동)
```
