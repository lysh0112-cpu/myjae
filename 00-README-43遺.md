# 43부 변경 파일 — 2026-08-01

기준 저장소   https://github.com/lysh0112-cpu/myjae.git
기준 커밋     3b97c57
검사          857 → 916건 · 실패 0
타입          tsc --noEmit 통과

**저장소 루트에 «그대로» 덮어쓰면 됩니다.** (경로 구조 그대로입니다)

---

## 신규 3

```
lib/saju/namingSession.ts        ★작명 «대상» 을 Step 2→3→4 로 나르는 단일 창구
                                  URL 이 정본 · 세션이 부본 · 둘 다 없으면 옛 길
28-verify-naming-flow.ts         작명 동선 그물 58건  → verify 체인에 «등록함»
29-measure-resource-weights.ts   자원오행 배점 측정 «자»
                                  ⚠️ verify 에 «넣지 않았습니다» — 검사가 아닙니다
                                  npm run measure:resource
```

## 수정 9

```
lib/saju/surname.ts              surnameOfHangul() 추가 (「류 첫째」→「류」·복성 판단)
                                  ⚠️ 기존 splitSurname·COMPOUND_SURNAMES 손대지 않음

app/manseryeok/naming/rename/newname/page.tsx     결함 ①② — 신생아 진입 · URL 성씨
app/manseryeok/naming/rename/newhanja/page.tsx    결함 ③④ — kind 전달 · 대상 사주
                                                   ★신생아 성씨 한자 고르기(slots)
                                                   ★대법원 인명용 한자 안내
app/manseryeok/naming/rename/newresult/page.tsx   결함 ③④ — '개명' 붙박이 제거
app/manseryeok/naming/rename/newborn/page.tsx     E — 준비중 안내 → 실입구
app/manseryeok/naming/diagnosis/storage/page.tsx  kind=신생아 전달 · ?open=작명
app/home-new/page.tsx                             👶 아기 작명 카드 복원

25-verify-manse-ui.ts            ⚠️ 검사 «두 개» 를 갱신했습니다.
                                    전에는 /kind: '개명'/ 과 「저장된 이름이 먼저」를
                                    «요구» 하고 있어, 결함을 지키던 자리였습니다.
package.json                     verify 에 28 등록 · measure:resource 추가
```

---

## ⛔ 손대지 않은 것 (인수인계서 11장)

```
lib/saju/simsanOhaeng.ts     lib/saju/yongsinNew.ts     lib/saju/ohaengColor.ts
lib/saju/resourceJudge.ts    ★배점 상수 한 글자도 안 바꿨습니다 (재기만 했습니다)
app/manseryeok/naming/start/                CoupleWonguk.tsx
```

## ⚠️ 배포 후 실기 확인 3

```
① 개명(본인)   전과 «똑같은지» — 이름 풀이 → 한자 바꾸기
② 아기 작명    홈 👶 → 성씨+생년월일 → 이름 고르기 → 성씨 한자 → 결과 「신생아」 배지
③ 가족 작명    보관함에서 «가족» 선택 → Step 3·4 까지 그 사람 사주가 유지되는지
```

⚠️ 이 컨테이너에서는 프리렌더 단계에서 Supabase 환경변수가 없어 멈췄습니다.
   컴파일·타입·검사는 모두 통과했습니다. 실제 배포에서 한 번 확인 부탁드립니다.
