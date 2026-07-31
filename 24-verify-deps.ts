// 24-verify-deps.ts
// 의존·빌드 그물 — 2026-07-31 (41부 긴급)
//
// ══════════════════════════════════════════════════════════════════
//  🔴 이 검사가 «왜» 생겼나
//
//   2026-07-31, package.json 에 lunar-javascript 를 더하면서
//   package-lock.json 을 «갱신하지 않았습니다».
//
//   Vercel 은 npm ci 로 빌드합니다. ci 는 둘이 어긋나면 «통째로 실패» 합니다.
//     → 배포가 안 됨 → /api/lunar 가 안 뜸 → 사주가 안 옴
//     → ★만세력·진로적성 화면의 «표가 전부 사라짐»
//
//   ⚠️ 화면 코드는 «한 줄도» 안 바뀌었는데 표가 사라집니다.
//      그래서 원인을 화면에서 찾으면 못 찾습니다.
//
//   ★교훈 — 의존을 더하면 «lock 도 함께» 올리십시오.
//      그리고 그것을 사람이 기억하지 말고 «검사가» 잡게 하십시오.
// ══════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'fs'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}

console.log('\n━━ ⑮-a 🔴 package.json ↔ package-lock.json 이 «맞는가» ━━')
{
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as {
    dependencies?: Record<string, string>; devDependencies?: Record<string, string>
  }
  check(existsSync('package-lock.json'), 'package-lock.json 이 있습니다')
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8')) as {
    packages?: Record<string, unknown>; lockfileVersion?: number
  }
  const inLock = (name: string) => !!lock.packages?.[`node_modules/${name}`]

  const deps = Object.keys(pkg.dependencies ?? {})
  const devs = Object.keys(pkg.devDependencies ?? {})
  const missDep = deps.filter((d) => !inLock(d))
  const missDev = devs.filter((d) => !inLock(d))

  check(missDep.length === 0,
    `★dependencies ${deps.length}개가 전부 lock 에 있습니다 — 빠진 것 ${missDep.join(', ') || '없음'}`)
  check(missDev.length === 0,
    `devDependencies ${devs.length}개가 전부 lock 에 있습니다 — 빠진 것 ${missDev.join(', ') || '없음'}`)
  if (missDep.length || missDev.length) {
    console.log('     ⚠️ 고치는 법 — `npm install` 을 돌리고 package-lock.json 도 «함께» 커밋하십시오.')
    console.log('     ⚠️ 이대로 배포하면 Vercel 의 npm ci 가 실패해 «화면의 표가 전부 사라집니다».')
  }
}

console.log('\n━━ ⑮-b 🔴 «부본» 이 «정본» 을 죽이지 않는가 ━━')
{
  // 폴백용 꾸러미가 없어도 모듈이 로드되어야 합니다.
  // 정적 import 로 두면 꾸러미가 없을 때 파일 전체가 죽고, /api/lunar 가 통째로 멈춥니다.
  const src = readFileSync('lib/saju/lunarConvert.ts', 'utf8')
  check(!/^import .* from ['"]lunar-javascript['"]/m.test(src),
    `★lunarConvert 가 부본을 «정적 import» 하지 않습니다`)
  check(/require\(['"]lunar-javascript['"]\)/.test(src),
    `필요한 순간에만 «게으르게» 불러옵니다`)
  check(/hasFallbackLib/.test(src), `부본이 있는지 밖에서 물어볼 수 있습니다`)
}

console.log('\n━━ ⑮-c 검사 스크립트가 verify 에 «물려 있는가» ━━')
{
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
  const v = pkg.scripts?.verify ?? ''
  for (const n of ['16-verify-naming', '18-verify-sound', '19-verify-eumyang',
                   '20-verify-resource', '21-verify-lunar', '22-verify-jijanggan',
                   '23-verify-career-bridge', '24-verify-deps']) {
    check(v.includes(n), `verify 에 ${n} 이 물려 있습니다`)
  }
  check((pkg.scripts?.prebuild ?? '').includes('verify'), `prebuild 가 verify 를 뭅니다`)
}

console.log(`\n━━ 의존 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
