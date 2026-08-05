// 35-verify-jsx-safe.ts
// JSX 안전 그물 — 2026-08-05 (47부 13차 · 긴급)
//
// ══════════════════════════════════════════════════════════════════
//  🔴 이 검사가 «왜» 생겼나
//
//   2026-08-05, 상담 카드를 화면 맨 끝으로 옮기면서
//   JSX 주석을 ★{{/* … */}} 로 적었습니다. 중괄호가 «둘» 이었습니다.
//
//     ★잘못  {{/* 주석 */}}      ★맞음  {/* 주석 */}
//
//   ⇒ 진로적성 화면이 통째로 안 떴습니다 (This page couldn't load).
//
//  ⚠️⚠️ 무서운 것은 ★«아무도 못 잡았다» 는 점입니다 —
//     {{/* 주석 */}} 은 ★문법이 «맞습니다».
//       바깥 { } = JSX 식(expression)
//       안쪽 { } = ★«빈 객체» {}   (주석은 그 안에 든 것)
//     ⇒ tsc 통과 · eslint 통과 · verify 통과.
//     ⇒ 「빈 객체를 자식으로 넣었다」는 ★«런타임에만» 터집니다.
//        React: "Objects are not valid as a React child"
//     ⇒ 게다가 이 자리에서는 구글 폰트가 막혀 ★npm run build 도 못 돌립니다.
//     ⇒ 결국 ★대표님이 화면을 열어 보시고서야 드러났습니다.
//
//   ★교훈 — 사람이 눈으로 지킬 수 없는 것은 «검사가» 지켜야 합니다.
//      (46부 1-6 「같은 지적이 세 번 나오면 그물을 치십시오」의 결.
//       다만 이것은 «한 번 만에» 손님 화면을 죽였으므로 곧바로 칩니다.)
//
//   ⚠️ 스크립트로 JSX 를 «끼워 넣을» 때 특히 조심하십시오.
//      파이썬 문자열에서 {{ }} 를 이스케이프로 쓰던 버릇이 그대로 나갑니다.
//      (.format 이 아니라 .replace 를 쓰면 {{ 가 «글자 그대로» 남습니다)
// ══════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

let pass = 0
let fail = 0
function check(ok: boolean, msg: string) {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) }
  else { fail++; console.log(`  ❌ ${msg}`) }
}

/** app · components 아래의 .tsx 를 모두 모읍니다 */
function collect(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return out }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) collect(full, out)
    else if (full.endsWith('.tsx')) out.push(full)
  }
  return out
}

const files = collect('app')

console.log('\n━━ ㉟-a 🔴 JSX 주석의 «중괄호 겹침» ━━')
{
  // {{/*  …  */}}  — 안쪽이 «빈 객체» 가 되어 런타임에 화면이 죽습니다.
  const bad: string[] = []
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    const lines = src.split('\n')
    lines.forEach((l, i) => {
      if (l.includes('{{/*') || l.includes('*/}}')) bad.push(`${f}:${i + 1}`)
    })
  }
  check(bad.length === 0,
    bad.length === 0
      ? `주석 중괄호가 겹친 곳이 «없습니다» (.tsx ${files.length}개)`
      : `★중괄호가 겹친 곳 ${bad.length}군데 — ${bad.slice(0, 5).join(' · ')}`)
  if (bad.length > 0) {
    console.log('     ⚠️ {{/* … */}} 를 ★{/* … */} 로 고치십시오.')
    console.log('     ⚠️ 그대로 배포하면 그 화면이 ★통째로 안 뜹니다 (tsc 는 통과합니다).')
  }
}

console.log('\n━━ ㉟-b 검사 스크립트가 verify 에 «물려 있는가» ━━')
{
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
  const v = pkg.scripts?.verify ?? ''
  check(v.includes('35-verify-jsx-safe'), `verify 에 35-verify-jsx-safe 가 물려 있습니다`)
}

console.log(`\n━━ JSX 안전 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
