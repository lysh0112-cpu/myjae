# 43부 변경 파일 — 2026-08-01 (최종)

```
기준 저장소   https://github.com/lysh0112-cpu/myjae.git
기준 커밋     3b97c57
검사          857 → ★987건 · 실패 0
타입          tsc --noEmit 통과
eslint        기준선 유지 (오류 11 동일 · 경고 1건 감소)
```

**저장소 루트에 그대로 덮어쓰면 됩니다.** (경로 구조 그대로)

---

## 신규 4

```
lib/saju/namingSession.ts        작명 «대상» 을 Step 2→3→4 로 나르는 단일 창구
                                 URL 이 정본 · 세션이 부본 · 둘 다 없으면 «옛 길»
28-verify-naming-flow.ts         작명 동선 그물 84건   → verify 등록
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
 naming/rename/newborn     E — 준비중 안내 → 실입구
 naming/diagnosis/storage  kind=신생아 전달 · ?open=작명
 app/home-new              👶 아기 작명 카드 복원
 lib/saju/surname.ts       surnameOfHangul() 추가

[이번 마무리]
 naming/rename/auto        🔴 가짜 데이터 10건 «삭제» → 엔진(Step 2)으로 보내는 다리
                           ⚠️ 파일은 남깁니다 — 옛 링크가 404 가 되지 않게 (교훈 AM)
 naming/rename/hanja       대법원 인명용 한자 «확인 권유» 추가
 lib/saju/hanjaRow.ts      court_name_use 칸 자리 + courtNameUse() — ★지금은 «모름»
 lib/saju/resourceJudge.ts ★주석 35줄만 추가 — «현행 배점 유지» 확정 기록
                           ⚠️ 값은 «한 글자도» 안 바꿨습니다 (W_FLOW 30 · W_YONGSIN 40)
 25-verify-manse-ui.ts     ⚠️ 결함을 «지키던» 검사 둘 갱신
 package.json              verify 에 28·30 등록 · measure:resource 추가
```

---

## ⛔ 손대지 않은 것 (인수인계서 11장 — 전부 무손상)

```
lib/saju/simsanOhaeng.ts     lib/saju/yongsinNew.ts     lib/saju/ohaengColor.ts
app/manseryeok/naming/start/                            CoupleWonguk.tsx
lib/saju/resourceJudge.ts    ★배점 상수 — 주석만 더했습니다
```

---

## ⚠️ 배포 후 «실기» 확인 3 — 자동 검사가 대신하지 못합니다

30-e2e 가 값의 흐름은 태워 봤지만, 아래는 **기기에서만** 알 수 있습니다.

```
① 개명(본인)   보관함 [+ 새 이름 풀이하기] → 감정 → 한자 바꾸기
               ★확인할 것 — «전과 똑같은가». 성씨 한자를 다시 묻지 않아야 합니다.

② 아기 작명    홈 👶 아기 작명 → 성씨(류)+생년월일 → 추천 열 개
               → ★성씨 한자(柳/劉) 고르기 → 이름 한자 → 결과 「신생아」 배지
               ★확인할 것 — 한글 조합(IME), 결제 팝업, 보관함에 「신생아」 태그

③ 가족 작명    보관함 [+ 새 이름 짓기] → «가족·지인» 선택
               ★확인할 것 — Step 3·4 의 «사주에 필요한 기운» 이 그 사람 것인가
                            (내 용신으로 돌아가면 ④가 되살아난 것입니다)
```

⚠️ 이 컨테이너에서는 프리렌더 단계에서 Supabase 환경변수가 없어 멈췄습니다.
   컴파일·타입·검사는 모두 통과했습니다.

---

## 🔴 남은 PENDING

```
□ hanja 표에 court_name_use 칸 — 원본을 받으면
   ① SQL 로 채우고 ② listPolicy 에 배지 (거르지는 «마십시오»)
   ③ 화면 문구를 «권유» → «판정» 으로 승격
   ⚠️ 지금은 «모름» 이 정상입니다. true 로 뭉개면 손님이 신고에서 되돌아옵니다.

□ 자원오행 흐름 감점 «가·나·다» (39부 3-1장 ①)
   ★교재 151쪽 「별점을 매기는 것이 맞는가」와 «같은 결정» 입니다.
   ⚠️ 손대기 전에 npm run measure:resource 로 «지금» 분포부터 재십시오.
   ★측정으로 밝혀진 것 — 「흐름 무게」와 「별점 몰림」은 «다른 손잡이» 입니다.

□ 합격운 API 무응답 (36부부터 여섯 세션째)
□ 결제 관문 PREMIUM_FOR_ALL = true (22부부터 이월)
□ 17-verify-hanja-data.ts 가 verify 체인에 없음 (수동)
```
