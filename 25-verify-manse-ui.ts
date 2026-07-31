// 25-verify-manse-ui.ts
// 만세력 화면 «표가 사라지지 않는가» 그물 — 2026-07-31 긴급
//
// ══════════════════════════════════════════════════════════════════
//  🔴 이 검사가 «왜» 생겼나
//
//   2026-07-29 프리미엄 도표를 «AI 풀이 안 샌드위치» 로 옮기면서
//   위쪽 표에 `!premiumPrompt &&` 를 걸었습니다.
//
//   그런데 홈의 「나의 만세력」 버튼은 mode=chart 로 들어옵니다.
//   그 모드는 AI 풀이 블록 자체를 «안 그립니다» (!chartOnly 조건).
//     → 위에서도 숨고, 아래 샌드위치도 없음
//     → ★오행·용신·대운·세운 표가 «전부» 사라짐
//
//   ⚠️ 조건 두 개가 «각각은 옳은데» 겹치면 화면이 빕니다.
//      그래서 «조건이 겹치는 자리» 를 검사로 못 박습니다.
// ══════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const PAGE = 'app/manseryeok/result-new/page.tsx'
const src = readFileSync(PAGE, 'utf8')

console.log('\n━━ ⑯-a 🔴 만세력 표가 «어떤 길로 와도» 나오는가 ━━')
{
  // ★2026-07-31 대표님 확정 — 프리미엄 «샌드위치» 는 진로적성 화면에 하는 것입니다.
  //   만세력 화면(홈에서 들어가는 두 길)은 표가 «전부» 나와야 합니다.
  //   그래서 표를 감추는 조건이 «하나도 없어야» 합니다.
  const lines = src.split('\n').map((l, i) => ({ l, n: i + 1 }))
  const bare = lines.filter(({ l }) => /\{[^/]*!premiumPrompt\s*&&/.test(l))
  check(bare.length === 0,
    `★표를 감추는 «!premiumPrompt &&» 자리 ${bare.length}곳`
    + (bare.length ? ` — ${bare.map((b) => b.n + '행').join(', ')}` : ''))
  if (bare.length) {
    console.log('     ⚠️ 만세력 표는 감추면 안 됩니다. 그 조건을 «지우십시오».')
    console.log('        샌드위치는 app/manseryeok/career-result 에서 합니다.')
  }
  check(!/\(!premiumPrompt \|\| chartOnly\)/.test(src),
    `«|| chartOnly» 로 절반만 고친 자리도 없습니다`)
}

console.log('\n━━ ⑯-b 표 섹션이 «전부 있는가» ━━')
{
  const MUST = ['사주 원국', '오행과 십성 분석', '신강 · 신약', '나의 용신',
                '운의 흐름 (대운·세운·월운·일운)']
  for (const t of MUST) check(src.includes(`title="${t}"`), `「${t}」 섹션이 있습니다`)
  // 전문가 상세는 ?pro=1 + 합충 토글일 때만
  check(src.includes('title="전문가 상세"'), `「전문가 상세」 섹션이 있습니다`)
}

console.log('\n━━ ⑯-c 홈 「나의 만세력」 버튼이 어느 길로 가는가 ━━')
{
  const card = readFileSync('app/manseryeok/components/UserCard.tsx', 'utf8')
  check(/result-new\?[^`]*mode=chart/.test(card),
    `★홈 버튼이 mode=chart 로 들어갑니다 — ⑯-a 가 지키는 그 길입니다`)
}

console.log('\n━━ ⑯-d ★진로적성에 만세력 표가 «쪼개져» 붙는가 ━━')
{
  const career = readFileSync('app/manseryeok/career-result/page.tsx', 'utf8')
  check(/SajuTableSlot/.test(career), `진로적성이 SajuTableSlot 을 씁니다`)
  check(/TABLE_AFTER/.test(career), `카드 뒤에 붙일 표 지도(TABLE_AFTER)가 있습니다`)
  for (const k of ['ohaeng_gijil', 'yukchin', 'yongsin']) {
    check(new RegExp(`${k}:\\s*\\{ kinds`).test(career), `「${k}」 카드 뒤에 표가 붙습니다`)
  }
  const slot = readFileSync('app/manseryeok/components/SajuTableSlot.tsx', 'utf8')
  for (const c of ['OhaengPentagon', 'SipsungTable', 'SingangTable', 'YongsinCard']) {
    check(slot.includes(c), `${c} 를 떼어다 씁니다`)
  }
  // ⚠️ 색을 «지어내지» 않았는가 — 오행 색은 명리 규칙입니다
  check(!/목:\s*'#/.test(slot), `★오행 색을 여기서 지어내지 않았습니다 (ohaengColor 한 곳만)`)
}

console.log(`\n━━ 만세력 화면 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
