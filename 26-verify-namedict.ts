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
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-02 — 1,256 → 1,258 (대표님 확정 · 교재 전수 재대조)
//
//   [무엇을 했나]  교재 35~38쪽을 300dpi·600dpi 로 두 번 떠서 한국어 OCR 로
//     따로 읽고, 차례까지 맞춘 대조로 어긋난 자리를 전부 뽑았습니다.
//     의심 낱말은 5배로 확대해 다시 읽혀 가렸습니다.
//     ★교차 검증 — 교재 목록은 소리마다 «가나다순» 이라, 사전에서 그 차례가
//       깨진 자리를 따로 세어 맞대어 보았습니다 (김택·신흥이 여기서 걸렸습니다).
//
//   🔴 [글자가 틀렸던 다섯]
//     김택 → 강택   ⚠️ 성씨 「김」과 겹쳐 «김김택» 이 나올 자리였습니다
//     국민 → 국만 · 병칠 → 병철 · 이룬 → 이륜 · 신흥 → 신홍
//   🔴 [빠져 있던 둘]  남혁(火_ㄴ) · 삼우(金_ㅅ)   ⇒ 1,256 + 2 = 1,258
//   ⚠️ [차례만 달랐던 다섯]  삼호 · 상필 상학 · 서원 서윤 · 서필
//      → 교재 차례로 되돌렸습니다. 이름 자체는 원래 다 있었습니다.
//
//   ⚠️ 이 값을 함부로 되돌리지 마십시오. 되돌리면 위 일곱이 함께 사라집니다.
//      ★다음에 또 재실 때는 「교재는 소리마다 가나다순」이라는 잣대가 가장 잘 듣습니다.
// ══════════════════════════════════════════════════════════════════
check(NAME_DICT_TOTAL === 1258, `이름 ${NAME_DICT_TOTAL}개 (기대 1,258)`)
check(Object.keys(NAME_DICT).length === 12, `묶음 ${Object.keys(NAME_DICT).length}개 (기대 12)`)
{
  const all = Object.values(NAME_DICT).flatMap(g => [...g.names])
  check(new Set(all).size === all.length, `중복 ${all.length - new Set(all).size}건`)

  // ★고친 일곱이 «그대로 있는가» — 다음 세션이 되돌리면 여기서 막힙니다
  const S = new Set(all)
  for (const n of ['강택', '국만', '병철', '이륜', '신홍', '남혁', '삼우']) {
    check(S.has(n), `★교재 대조로 바로잡은 「${n}」이 있습니다`)
  }
  for (const n of ['김택', '국민', '병칠', '이룬', '신흥']) {
    check(!S.has(n), `⚠️ 옛 오타 「${n}」이 되살아나지 않았습니다`)
  }
  // ⚠️ 「김택」은 성씨와 겹치던 자리입니다 — 사전에 성씨 소리로 시작하는 오타가
  //    다시 들어오면 「김김택」 같은 짝이 생깁니다
  check(!all.some(n => n.startsWith('김')), `⚠️ 「김」으로 시작하는 이름이 없습니다`)

  // ★차례 — 교재는 소리마다 «가나다순» 입니다.
  //   ⚠️ 교재 자체가 몇 군데 어긋나 있어(완우 와운·용준 용오 …) 0을 요구하지 «않습니다».
  //      다만 그 수가 «늘면» 전사가 흐트러진 것입니다.
  let broken = 0
  for (const g of Object.values(NAME_DICT)) {
    for (let i = 1; i < g.names.length; i++) {
      if (g.names[i - 1].localeCompare(g.names[i], 'ko') > 0) broken++
    }
  }
  check(broken <= 9, `★가나다 차례가 깨진 자리 ${broken}곳 (교재 자체의 어긋남 · 9 이하)`)
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
    `★1,258개 전부 첫소리가 그 오행입니다 — 어긋남 ${bad.slice(0, 3).join(', ') || '0건'}`)
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
  // ★2026-08-02 — 삼우(金_ㅅ)를 보충해 금이 575 → 576 이 되었습니다.
  //   ⚠️ 기울기는 «여전히» 8.9배입니다. 이 값이 좋아진 것이 아닙니다 —
  //      교재 자체가 기울어 있고, 그 사실을 바꾸지 않았습니다.
  check(mok === 65 && geum === 576, `목 65 · 금 576 (기울기 ${(geum / mok).toFixed(1)}배)`)
  // ★사전만으로는 목(木)이 필요한 손님을 못 채웁니다. 규칙 추천 엔진(F)이 «먼저» 입니다
  check(mok < 100,
    `★목이 100개 미만입니다 — 사전은 «보조», 규칙 추천(F)이 «먼저» (대표님 확정)`)
}

console.log('\n━━ ⑰-e 조회 함수 ━━')
check(namesByElement('금').length === 576, `오행으로 찾기`)
check(namesByCho('ㄱ').length === 65, `첫소리로 찾기`)
check(namesByElement('목' as never).every(n => n.length >= 1), `빈 이름이 없습니다`)

console.log(`\n━━ 이름 사전 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
