// 26-verify-namedict.ts
// 교재 1장 이름 사전 그물 — 2026-08-01
//
// ★바깥의 정답표(교재 3장 초성 배당)와 «대조» 합니다 (교훈 EQ).
//   자기 안에서만 보는 검사는 «일관되게 틀린» 자료를 통과시킵니다.

import { NAME_DICT, NAME_DICT_TOTAL, namesByElement, namesByCho } from './lib/saju/tables/nameDict'
import { parseSoundChar } from './lib/saju/sound/normalize'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}

console.log('\n━━ ⑰-a 전사 규모 ━━')
check(NAME_DICT_TOTAL === 1256, `이름 ${NAME_DICT_TOTAL}개 (기대 1,256)`)
check(Object.keys(NAME_DICT).length === 12, `묶음 ${Object.keys(NAME_DICT).length}개 (기대 12)`)
{
  const all = Object.values(NAME_DICT).flatMap(g => [...g.names])
  check(new Set(all).size === all.length, `중복 ${all.length - new Set(all).size}건`)
}

console.log('\n━━ ⑰-b 🔴 초성 → 오행이 «교재 3장» 과 맞는가 ━━')
{
  // ★사전의 오행 딱지를 믿지 않고, 발음오행 판정기로 «다시» 재 봅니다
  const bad: string[] = []
  for (const [key, g] of Object.entries(NAME_DICT)) {
    for (const n of g.names) {
      const got = parseSoundChar(n[0]).ohaeng
      if (got !== g.el) bad.push(`${key} ${n}→${got}`)
    }
  }
  check(bad.length === 0,
    `★1,256개 전부 첫소리가 그 오행입니다 — 어긋남 ${bad.slice(0, 3).join(', ') || '0건'}`)
}

console.log('\n━━ ⑰-c ⚠️ 교재에 «없는» 것을 채우지 않았는가 (교훈 EJ) ━━')
{
  const chos = Object.values(NAME_DICT).map(g => g.cho)
  check(!chos.includes('ㄹ'), `ㄹ(화) 단락이 «없습니다» — 교재 원문 그대로 (대표님 확인)`)
  check(!chos.includes('ㅋ'), `ㅋ(목) 단락이 «없습니다» — 교재 원문 그대로 (대표님 확인)`)
  check(namesByCho('ㅊ').includes('초'), `金_ㅊ 의 외자 「초」 가 그대로 있습니다 (대표님 확인)`)
}

console.log('\n━━ ⑰-d ⚠️ 오행별 개수가 «기울어» 있다는 것을 아는가 ━━')
{
  const cnt = (['목', '화', '토', '금', '수'] as const)
    .map(e => [e, namesByElement(e).length] as const)
  for (const [e, n] of cnt) console.log(`     ${e}  ${String(n).padStart(4)}개`)
  const mok = namesByElement('목').length
  const geum = namesByElement('금').length
  check(mok === 65 && geum === 575, `목 65 · 금 575 (기울기 ${(geum / mok).toFixed(1)}배)`)
  // ★사전만으로는 목(木)이 필요한 손님을 못 채웁니다. 규칙 추천 엔진(F)이 «먼저» 입니다
  check(mok < 100,
    `★목이 100개 미만입니다 — 사전은 «보조», 규칙 추천(F)이 «먼저» (대표님 확정)`)
}

console.log('\n━━ ⑰-e 조회 함수 ━━')
check(namesByElement('금').length === 575, `오행으로 찾기`)
check(namesByCho('ㄱ').length === 65, `첫소리로 찾기`)
check(namesByElement('목' as never).every(n => n.length >= 1), `빈 이름이 없습니다`)

console.log(`\n━━ 이름 사전 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
