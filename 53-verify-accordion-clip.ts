// 53-verify-accordion-clip.ts
//
//   접었다 펴는 상자(Section)가 «내용을 자르지 않는가»
//   2026-09-13 (7부) [대표님 전체 점검]
//
//   돌리기:  npx tsx 53-verify-accordion-clip.ts
//
//  ┌──────────────────────────────────────────────────────────────┐
//  │  [겪은 일]  대표님이 «전문가용 만세력» 을 보시고 —              │
//  │    「외곽 라인이 전체를 담지 못하고 ★일부가 가려 있다」          │
//  │                                                               │
//  │    전문가 상세를 펼치면 ★「공망 — 두 기준」 칸이 «잘려» 나왔습니다.│
//  │    바깥 주황 테두리가 그 줄을 못 감싸고 아래로 삐져나왔습니다.    │
//  │                                                               │
//  │  [까닭]  ★maxHeight 를 «2000px» 로 못 박아 두었습니다.          │
//  │    그 위는 overflow:hidden 이라 ★그냥 «잘립니다».               │
//  │    ⇒ 전문가 상세는 지장간 · 납음 · 12운성 · 신살 2기준 ·        │
//  │      귀인 · 형충회합 · 공망 이 다 들어가 2000px 를 넘습니다.     │
//  │                                                               │
//  │  ⛔ maxHeight 에 «숫자» 를 다시 못 박으면 ★또 잘립니다.          │
//  └──────────────────────────────────────────────────────────────┘

import { readFileSync } from 'fs'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  ❌ ' + m) } }
const head = (t: string) => console.log('\n━━ ' + t + ' ━━')
/** 주석을 걷어낸 «사는 코드» — 주석에 걸리지 않게 (6부 ⛔) */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const RAW = readFileSync('app/manseryeok/result-new/page.tsx', 'utf8')
const pg = code(RAW)

head('① 🔴 펼쳤을 때 «자르지 않는가» [대표님 2026-09-13]')
ok(/maxHeight: isOpen \? \(settled \? 'none' : '2000px'\) : '0'/.test(pg),
  '🔴 ★다 펴지면 maxHeight 를 «none» 으로 풉니다 (숫자로 안 자릅니다)')
ok(/overflow: isOpen && settled \? 'visible' : 'hidden'/.test(pg),
  '★다 펴지면 overflow 도 «visible» — 삐져나온 것이 안 잘립니다')
ok(!/maxHeight: isOpen\?'2000px':'0'/.test(pg),
  '⛔ 옛 모양(2000px 고정)이 되살아나지 않았습니다')

head('② ⚠️ 펴는 «애니메이션» 은 그대로인가')
ok(/transition: 'max-height \.3s ease'/.test(pg), '★여는 움직임이 남아 있습니다')
ok(/: '2000px'\) : '0'/.test(pg), '★여는 «동안» 에는 2000px 로 열립니다 (움직임이 보이게)')
ok(/onTransitionEnd=\{\(\) => \{ setSettled\(isOpen\) \}\}/.test(pg),
  '★움직임이 «끝난 뒤» 에 풉니다')
ok(/const settled = isOpen && settledRaw/.test(pg),
  '⚠️ 접히면 «언제나» 다시 잠급니다 — 접는 모습도 그대로 돕니다')
ok(!/useEffect\(\(\) => \{ if \(!isOpen\) setSettled/.test(pg),
  '⛔ effect 안에서 setState 를 부르지 않습니다 (린트가 막습니다)')

head('③ ⛔ 높이를 «숫자» 로 못 박은 곳이 또 없는가')
{
  /*  ⚠️ 2000px 자체는 «여는 동안» 만 쓰는 값이라 있어야 합니다.
   *     ⛔ 위험한 것은 ★«풀어 주는 길이 없이» 숫자만 있는 꼴입니다.
   *     ⇒ maxHeight 에 숫자가 있으면 ★같은 줄에 «none» 도 있어야 합니다. */
  const lines = pg.split('\n').filter(l => /maxHeight/.test(l))
  const bad = lines.filter(l => /['"]\d{3,}px['"]/.test(l) && !/'none'/.test(l))
  ok(bad.length === 0,
    `⛔ ★숫자만 있고 «풀어 주는 길(none)» 이 없는 곳은 없습니다${bad.length ? ' — ' + bad.length + '곳' : ''}`)
  ok(lines.some(l => /'none'/.test(l)), '★«none» 으로 푸는 길이 있습니다')
}

head('④ ⚠️ 바깥 상자는 «모서리를 깎는» 용도인가')
{
  const i = pg.indexOf("borderRadius:'16px'")
  const seg = pg.slice(Math.max(0, i - 120), i + 120)
  ok(/overflow:'hidden'/.test(seg) && /borderRadius:'16px'/.test(seg),
    '⚠️ 바깥 overflow:hidden 은 ★둥근 모서리용입니다 — 높이는 안 자릅니다 (그대로 두십시오)')
}

head('⑤ 🔴 잘렸던 그 칸이 실제로 있는가')
{
  const ex = readFileSync('app/manseryeok/result-new/ExpertDetail.tsx', 'utf8')
  ok(/공망 — 두 기준/.test(ex), '★「공망 — 두 기준」 칸이 있습니다 (잘렸던 자리)')
  ok(/일주 기준/.test(ex) && /년주 기준/.test(ex), '★두 기준이 다 들어 있습니다')
  //  전문가 상세가 «길다» 는 것을 값으로 — 그래서 2000px 를 넘었습니다
  const cards = (ex.match(/<div style=\{card\}>/g) ?? []).length
  ok(cards >= 5, `★전문가 상세는 칸이 ${cards}개라 길어집니다 (2000px 를 넘던 까닭)`)
}

console.log(`\n━━ 아코디언 잘림 — 통과 ${pass} · 실패 ${fail} ━━\n`)
process.exit(fail ? 1 : 0)
