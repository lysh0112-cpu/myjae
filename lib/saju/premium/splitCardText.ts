// lib/saju/premium/splitCardText.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  통변 한 대목에서 [한줄]·[태그]·[실천] 을 갈라낸다 — 공용 부품    │
// └───────────────────────────────────────────────────────────────┘
//
//  ★2026-08-03 신설 (44부 30차)
//
//  ══ 왜 공용 부품인가 ══
//    프롬프트가 AI 에게 「[한줄]·[태그]·[실천] 을 대괄호까지 그대로 적으라」고
//    시켜 두었는데, ★그것을 갈라 그리는 코드가 «화면마다» 있었습니다.
//      · TongbyeonView.tsx        (사주풀이)   ─┐
//      · ExamJudgeCard.tsx        (합격운)     ─┤ ★한 글자도 다르지 않은 «복사본»
//      · career-result/page.tsx   (진로적성)   ─┘ ⇒ ★없었습니다
//
//    🔴 그래서 진로적성 프리미엄 리포트에 「[한줄] …」·「[태그] …」·「[실천] …」이
//       ★손님 화면에 «글자 그대로» 나가고 있었습니다. (2026-08-03 대표님 사진)
//
//  ⚠️⚠️ 화면마다 다시 짓지 «마십시오». 그렇게 해서 두 벌이 되었고,
//     세 번째 화면은 아예 빠뜨렸습니다. ★고칠 곳은 여기 «한 곳» 입니다.
//
//  ⚠️ 표시가 «없는» 글은 그대로 돌려줍니다 — 옛 통변이 깨지지 않게 하려는 것입니다.

export interface SplitCard {
  /** [한줄] — 카드 맨 위 한 문장 */
  summary?: string
  /** [태그] — 알약으로 그릴 낱말 (최대 넷) */
  tags?: string[]
  /** [실천] — 강조 상자로 따로 뺀다 */
  action?: string
  /** 표시를 걷어낸 본문 */
  body: string
}

export function splitCardText(raw: string): SplitCard {
  let summary: string | undefined
  let action: string | undefined
  let tags: string[] | undefined
  const rest: string[] = []
  for (const ln of (raw ?? '').split('\n')) {
    const t = ln.trim()
    const mS = t.match(/^\[한줄\]\s*(.+)$/)
    const mT = t.match(/^\[태그\]\s*(.+)$/)
    const mA = t.match(/^\[실천\]\s*(.+)$/)
    if (mS) { summary = mS[1].trim(); continue }
    if (mT) { tags = mT[1].split(/[·,]/).map(x => x.trim()).filter(Boolean).slice(0, 4); continue }
    if (mA) { action = mA[1].trim(); continue }
    rest.push(ln)
  }
  return { summary, tags, action, body: rest.join('\n').trim() }
}
