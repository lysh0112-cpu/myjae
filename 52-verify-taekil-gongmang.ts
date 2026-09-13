// 52-verify-taekil-gongmang.ts
//
//   결혼택일 · 이사택일 — «공망» 을 손님께 어떻게 말하는가
//   2026-09-13 (7부) [대표님 전체 점검]
//
//   돌리기:  npx tsx 52-verify-taekil-gongmang.ts
//
//  ┌──────────────────────────────────────────────────────────────┐
//  │  [겪은 일]  대표님이 결혼택일을 보시고 —                        │
//  │    「공망을 ★"빈자리가 있는 날이에요" 로 표현되어 있는데…」      │
//  │                                                               │
//  │  ★두 가지가 어긋나 있었습니다 —                                 │
//  │   ① 결혼택일 요약은 「빈자리」, 근거 칸은 「공망」               │
//  │      ⇒ 한 화면에서 ★같은 것을 «두 말» 로 불렀습니다.            │
//  │   ② 「빈자리」 가 ★무슨 뜻인지 «아무 데도 없었습니다».           │
//  │      손님이 읽고 «빈자리가 뭐지» 합니다.                        │
//  │   ③ 이사택일 제목도 「빈자리를 ★비껴갔어요」 — 제목만 «빈자리»,  │
//  │      게다가 ★«비껴» 가 아니라 «비켜» 가 맞습니다.               │
//  └──────────────────────────────────────────────────────────────┘

import { readFileSync } from 'fs'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  ❌ ' + m) } }
const head = (t: string) => console.log('\n━━ ' + t + ' ━━')
const read = (p: string) => readFileSync(p, 'utf8')
/** 주석을 걷어낸 «사는 코드» — 주석에 걸리지 않게 (6부 ⛔) */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const wed = code(read('app/manseryeok/wedding-timing/components/CheckResultV7.tsx'))
const mov = code(read('app/manseryeok/moving-timing/lib/movingExplainV1.ts'))

head('① 🔴 결혼택일 — 「공망」 을 쓰고 «뜻을 푸는가» [대표님 2026-09-13]')
ok(/공망\(기운이 비는 자리\)인 날이에요/.test(wed),
  '★요약이 「공망(기운이 비는 자리)인 날이에요」 입니다')
ok(!/빈자리인 날/.test(wed),
  '⛔ 옛 말 「빈자리인 날」 이 사라졌습니다 (뜻을 알 길이 없던 말)')
ok(/힘이 실리지 않는 자리라, 큰일을 시작하는 날로는 피합니다/.test(wed),
  '★«왜 피하는지» 까지 말합니다 [대표님 문장]')

head('② 🔴 한 화면에서 «두 말» 을 쓰지 않는가')
{
  //  근거 칸은 「○○ 공망」 — 요약도 «공망» 이라야 두 말이 아닙니다
  ok(/= \$\{d\.gongmangWho\.join\('·'\)\} 공망/.test(wed), '근거 칸은 「공망」 그대로입니다')
  const says = (wed.match(/공망/g) ?? []).length
  ok(says >= 2, `★요약과 근거가 «같은 말»(공망)을 씁니다 — ${says}곳`)
  ok(!/빈자리/.test(wed), '⛔ 결혼택일에 「빈자리」 가 한 곳도 없습니다')
}

head('③ 🔴 긴 설명을 «두 줄» 로 나누는가')
{
  /*  [왜] 요약은 12~16자짜리 한 줄로 잡혀 있습니다 (굵게 14.5px).
   *    52자를 그대로 두면 ★굵은 글씨가 두 줄이 되어 «소리치는» 느낌이 됩니다. */
  ok(/sub\?: string/.test(wed), '★뒷말을 담을 자리(sub)가 있습니다')
  ok(/sub: '힘이 실리지 않는 자리라/.test(wed), '★«왜 피하는지» 는 뒷말로 갑니다')
  ok(/\{s\.sub && \(/.test(wed), '★화면이 뒷말을 그립니다')
  ok(/fontWeight: 700[^}]*\}\}>\{s\.msg\}/.test(wed), '첫 줄은 굵게 그대로')
  {
    const i = wed.indexOf('{s.sub && (')
    const seg = wed.slice(i, i + 400)
    ok(/fontSize: 12\.5/.test(seg) && !/fontWeight: 700/.test(seg),
      '★뒷말은 «굵지 않게» · 작게 그립니다')
    ok(/marginTop: 5/.test(seg), '★한 칸 띄워 두 줄이 붙어 보이지 않습니다')
  }
  ok((wed.match(/wordBreak: 'keep-all'/g) ?? []).length >= 2,
    '★낱말이 가운데서 잘리지 않습니다 (keep-all)')
}

head('④ 🔴 이사택일 — 「공망을 비켜갔어요」 [대표님 2026-09-13]')
ok(/head: '공망을 비켜갔어요'/.test(mov), '★제목이 「공망을 비켜갔어요」 입니다')
ok(!/빈자리를/.test(mov), '⛔ 제목의 「빈자리」 가 사라졌습니다')
ok(/공망은 기운이 비는 자리예요/.test(mov), '본문이 «공망» 의 뜻을 풉니다 (그대로 좋습니다)')

head('⑤ ⚠️ «비껴» 가 아니라 «비켜»')
{
  /*  비껴가다 — 비스듬히 «스쳐» 지나가다 (모양)
   *  ★비켜가다 — «피해서» 지나가다 (피함)   ⇒ 공망·충을 «피한» 것이니 이쪽입니다. */
  ok(!/비껴/.test(mov), '⛔ 이사택일에 「비껴」 가 한 곳도 없습니다')
  ok(/비켜갑니다/.test(mov), '★충 설명도 「비켜갑니다」 입니다')
  ok(!/비껴/.test(read('app/manseryeok/moving-timing/lib/movingExplainV1.ts')),
    '⚠️ 주석에도 「비껴」 가 없습니다 (다음 사람이 베껴 쓰지 않게)')
}

head('⑥ 🔴 두 화면이 «한 집안» 인가')
{
  //  손님이 결혼택일과 이사택일을 «둘 다» 보실 수 있습니다. 말이 맞아야 합니다.
  ok(/기운이 비는 자리/.test(wed) && /기운이 비는 자리/.test(mov),
    '★둘 다 공망을 «기운이 비는 자리» 라 풉니다')
  ok(/공망/.test(wed) && /공망/.test(mov), '★둘 다 «공망» 이라는 말을 씁니다')
}

console.log(`\n━━ 택일 공망 말투 — 통과 ${pass} · 실패 ${fail} ━━\n`)
process.exit(fail ? 1 : 0)
