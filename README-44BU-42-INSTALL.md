# 44부 42차 — 🔴 A4·해설복사 버튼이 «영영 안 뜨던» 까닭

```
기준 커밋   원격 최신 (41차까지 올라간 상태)
검사        오행·용신 그물 ★496 · 실패 0
타입        npx tsc --noEmit 통과
eslint      오류 82 · 경고 138  (기준선 그대로)
변경        ★수정 2 파일 — career-result/page.tsx · 32-verify-hour-convert.ts
⚠️ 빌드     제 쪽에서 «확인 못 했습니다» (구글 폰트가 막힌 자리)
```

## 넣는 법

```bash
cd myjae
unzip -o ../myjae-44bu-42-20260803.zip
git status --porcelain      # ★ M 두 줄
npm run verify
npx tsc --noEmit
★npm run build
git add -A && git commit -m "A4·해설복사 버튼을 통변 상태에서 뗌 (44부 42차)" && git push
```

---

# 🔴 무엇이 문제였나

대표님이 **「A4용지 출력과 복사하기 기능들이 없다」**고 하셨습니다.
저장소를 열어 보니 **코드는 41차까지 원격에 다 올라가 있었습니다.**
그런데도 버튼이 안 떴습니다.

## ★까닭 — 스트리밍이 끝나기 전에 effect 가 «정리» 되면

```
career-result/page.tsx
  343   if (cancelled) return
  344   setTongState('done')      ← ★여기에 «닿지 못합니다»

⚠️ React 18 개발 모드는 effect 를 두 번 돌립니다.
   첫 번째가 정리되며 cancelled = true 가 되고,
   ★tongStartedRef 때문에 두 번째는 «아예 시작하지 않습니다».
⇒ 글(tong)은 첫 번째가 이미 채웠는데,
  ★tongState 는 'loading' 인 채로 «영영 남습니다».
⇒ 버튼 조건이 tongState === 'done' 이라 ★버튼만 안 떴습니다.
```

★**대표님 화면이 정확히 그 모습이었습니다** — 통변 글은 보이는데 버튼만 없었습니다.

⚠️ 41차에 제가 이 버튼을 «프리미엄에서 통변으로» 옮기며 `tongState` 에 맸는데,
**그 상태 자체가 못 믿을 값이었습니다.**

# ★고친 법 — 「글 자체」를 봅니다

```ts
const tongDone = useMemo(() => {
  if (!tong) return false
  if (tongState === 'done') return true          // 저장본 다시보기
  return (tong.match(/^\s*■/gm) ?? []).length >= 3 // ★대목이 셋 이상이면 반쪽이 아닙니다
}, [tong, tongState])
```

```
전   {tongState === 'done' && !!tong && ( … )}
★후  {tongDone && ( … )}
```

⚠️ **「반쪽 인쇄물을 막는다」는 뜻은 그대로입니다** — 대목이 셋 미만이면 여전히 안 뜹니다.
⚠️ A4 가 담을 대목(`tongByKey`)은 **`tongState` 와 무관** 하므로 손대지 않았습니다.

## ⚠️ 검사 그물도 함께 고쳤습니다

옛 조건을 글자로 지키고 있어 걸렸습니다. ★**재는 것은 그대로** 두고, 둘을 더했습니다 —
「대목이 셋 이상이라야 다 왔다고 보는가」·「저장본은 tongState 로도 참인가」.

## ⛔ 손대지 «않은» 것

```
lib/saju/premium/buildCareerMbtiPrompt.ts — ★원격 그대로입니다 (AI 재료)
lib/saju/premium/config.ts                — 궁합·사주 프리미엄 그대로
```

# ⬜ 42차 실기 확인

```
□ 🔴★진로적성 결과 맨 아래에 [A4 PDF저장/인쇄] [해설 복사] 가 «보이는지»
□ ⚠️ 통변이 나오는 «도중» 에는 «안 보이는지»
□ ★A4 를 눌러 종이에 대목이 «들어 있는지»
□ ★보관함에서 저장된 것을 열어도 버튼이 보이는지
```
