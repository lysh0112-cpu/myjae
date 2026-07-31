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

console.log('\n━━ ⑯-a 🔴 「도표만 보기」에서 표가 숨지 않는가 ━━')
{
  // ★`!premiumPrompt &&` 만 걸린 자리가 «없어야» 합니다.
  //   있으면 mode=chart 에서 그 표가 사라집니다.
  const bare = src.split('\n')
    .map((l, i) => ({ l, n: i + 1 }))
    .filter(({ l }) => /\{!premiumPrompt\s*&&/.test(l))
  check(bare.length === 0,
    `«!premiumPrompt &&» 만 걸린 자리 ${bare.length}곳`
    + (bare.length ? ` — ${bare.map((b) => b.n + '행').join(', ')}` : ''))
  if (bare.length) {
    console.log('     ⚠️ 고치는 법 — `(!premiumPrompt || chartOnly) &&` 로 바꾸십시오.')
    console.log('        mode=chart 는 AI 풀이를 안 그리므로 «중복될 일이 없습니다».')
  }

  const guarded = (src.match(/\(!premiumPrompt \|\| chartOnly\)/g) ?? []).length
  check(guarded >= 4, `«(!premiumPrompt || chartOnly)» 로 지킨 자리 ${guarded}곳 (4곳 이상)`)
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

console.log('\n━━ ⑯-d 프리미엄 샌드위치 슬롯이 살아 있는가 ━━')
{
  check(/premiumSlots/.test(src), `premiumSlots 가 있습니다`)
  for (const m of ['강점', '격국', '대운']) {
    check(new RegExp(`match: \\[[^\\]]*'${m}'`).test(src), `슬롯 match 에 «${m}» 이 있습니다`)
  }
  // ⚠️ 십성표·월운·일운은 슬롯에 «없습니다» — 알고 두는 것입니다
  check(!/node:[\s\S]{0,200}SipsungTable/.test(src),
    `⚠️ 십성표는 샌드위치 슬롯에 없습니다 (프리미엄에서는 안 나옵니다 — 알고 두는 것)`)
}

console.log(`\n━━ 만세력 화면 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
