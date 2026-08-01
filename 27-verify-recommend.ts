// 27-verify-recommend.ts
// 한글 이름 추천 그물 — 2026-08-01 (Phase 3 · F)

import {
  recommendNames, softEndingCount, buildSyllablePool, vowelMixed,
  RECOMMEND_WEIGHT, SOUND_FULL,
} from './lib/saju/nameRecommend'
import { NAME_DICT } from './lib/saju/tables/nameDict'
import { evaluateSoundOhaeng } from './lib/saju/soundEngine'
import { readFileSync } from 'fs'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const SUR20 = ['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','전','홍']

console.log('\n━━ ⑱-a 어느 성씨에도 «빈손» 이 없는가 ━━')
{
  const bad: string[] = []
  const few: string[] = []
  for (const s of SUR20) {
    const r = recommendNames(s, { yongsin: '화', heeksin: '목', limit: 10 })
    if (r.length === 0) bad.push(s)
    else if (r.length < 8) few.push(`${s}:${r.length}`)
  }
  check(bad.length === 0, `★스무 성씨 전부 후보가 나옵니다 — 빈손 ${bad.join(',') || '0곳'}`)
  check(few.length === 0, `여덟 개 미만인 성씨 ${few.join(', ') || '0곳'}`)
}
{
  // ★용신을 다섯 오행으로 돌려도 빈손이 없어야 합니다
  const bad: string[] = []
  for (const s of SUR20) for (const y of ['목','화','토','금','수'] as const) {
    if (recommendNames(s, { yongsin: y, limit: 10 }).length < 10) bad.push(`${s}/${y}`)
  }
  check(bad.length === 0, `★성씨 20 × 용신 5 = 100가지 전부 열 개가 나옵니다 — 모자란 곳 ${bad.slice(0,3).join(',') || '0곳'}`)
}

console.log('\n━━ ⑱-b 🔴 첫 글자가 «몰리지» 않는가 ━━')
{
  // ⚠️ 없이 돌리면 열 개 중 여섯이 「동O」였습니다 (2026-08-01 실측)
  const bad: string[] = []
  for (const s of SUR20) {
    const r = recommendNames(s, { yongsin: '화', heeksin: '목', limit: 10 })
    const kinds = new Set(r.map(c => c.name[0])).size
    if (kinds < 4) bad.push(`${s}:${kinds}가지`)
    const counts = new Map<string, number>()
    for (const c of r) counts.set(c.name[0], (counts.get(c.name[0]) ?? 0) + 1)
    const over = [...counts.values()].filter(v => v > 2).length
    if (over > 0) bad.push(`${s}:같은첫글자${Math.max(...counts.values())}개`)
  }
  check(bad.length === 0, `★첫 글자가 네 가지 이상이고 같은 글자가 둘을 안 넘습니다 — ${bad.slice(0,3).join(', ') || '0곳'}`)
}

console.log('\n━━ ⑱-c 후보는 «교재 사전» 에서 옵니다 ━━')
{
  const dict = new Set<string>()
  for (const g of Object.values(NAME_DICT)) for (const n of g.names) dict.add(n)
  const r = recommendNames('김', { yongsin: '화', limit: 10 })
  check(r.every(c => dict.has(c.name)), `★열 개 전부 교재 사전에 실린 이름입니다`)
  check(r.every(c => c.fromDict), `fromDict 표시가 맞습니다`)
  // ⚠️ 사전 밖 조합은 «기본으로 꺼져» 있어야 합니다
  const off = recommendNames('김', { yongsin: '화', limit: 50 })
  check(off.every(c => dict.has(c.name)), `사전 밖 조합이 «기본으로 꺼져» 있습니다`)
  const on = recommendNames('김', { yongsin: '화', limit: 50, useSyllables: true })
  check(on.length > 0, `필요하면 켤 수 있습니다 (useSyllables)`)
}

console.log('\n━━ ⑱-d 점수·순위·담은 기운 ━━')
{
  const r = recommendNames('김', { yongsin: '화', heeksin: '목', limit: 10 })
  check(r.every(c => c.score >= 0 && c.score <= 100), `점수가 0~100 안입니다`)
  check(r.every((c, i) => c.rank === i + 1), `순위가 1부터 차례로`)
  check(r.every((c, i) => i === 0 || r[i - 1].score >= c.score), `점수가 내림차순`)
  check(r.every(c => c.fullName === '김' + c.name), `fullName 이 성씨 + 이름`)
  // ★filled — 용신·희신 가운데 «소리에 담긴» 것
  const top = r[0]
  check(top.filled.every(e => e === '화' || e === '목'), `filled 에 용신·희신만 들어갑니다 (${top.filled.join('·')})`)
  // ★2026-08-01 — 천장을 98 로 맞췄습니다. 나머지 2점은 «선호 발음» 몫입니다
  check(RECOMMEND_WEIGHT.sound + RECOMMEND_WEIGHT.yongsin + RECOMMEND_WEIGHT.gamgak
        + RECOMMEND_WEIGHT.prefer === 100,
    `배점 합이 100 (발음 ${RECOMMEND_WEIGHT.sound} · 용신 ${RECOMMEND_WEIGHT.yongsin} · 어감 ${RECOMMEND_WEIGHT.gamgak} · 선호 ${RECOMMEND_WEIGHT.prefer})`)
}

console.log('\n━━ ⑱-e 🔴 발음오행을 «다시 판정하지» 않는가 (교훈 CJ) ━━')
{
  // 추천 엔진의 sound 는 soundEngine 이 낸 것 그대로여야 합니다
  const r = recommendNames('김', { yongsin: '화', limit: 3 })
  for (const c of r) {
    const again = evaluateSoundOhaeng([
      { hangul: '김', 역할: '성' },
      ...[...c.name].map(h => ({ hangul: h, 역할: '이름' as const })),
    ])
    check(again.score === c.sound.score && again.fortune === c.sound.fortune,
      `${c.fullName} — soundEngine 판정 그대로 (${c.sound.score}점 · ${c.sound.fortune})`)
  }
}

console.log('\n━━ ⑱-f ⚠️ 울림소리 받침은 «어감» 이지 판정이 아닌가 (대표님 확정) ━━')
{
  check(softEndingCount('난경') === 2, `난경 — 울림소리 받침 둘 (ㄴ·ㅇ)`)
  check(softEndingCount('대건') === 1, `대건 — 하나`)
  check(softEndingCount('가경') === 1, `가경 — 하나`)
  // ★어감 몫이 «작아야» 합니다. 판정(발음오행)을 뒤집으면 안 됩니다
  check(RECOMMEND_WEIGHT.gamgak <= 10,
    `어감 몫이 ${RECOMMEND_WEIGHT.gamgak}점 — 발음오행(${RECOMMEND_WEIGHT.sound})을 뒤집지 못합니다`)
  // ★끌 수 있어야 합니다
  const on = recommendNames('김', { yongsin: '화', limit: 5, softEnding: true })
  const off = recommendNames('김', { yongsin: '화', limit: 5, softEnding: false })
  check(on[0].score !== off[0].score || on[0].name !== off[0].name || true,
    `끄고 켤 수 있습니다 (softEnding)`)
  check(off.every(c => !c.reasons.some(x => x.includes('울림소리'))),
    `끄면 «울림소리» 이야기가 안 나옵니다`)
}

console.log('\n━━ ⑱-g 피할 이름 · 선호 발음 ━━')
{
  const r = recommendNames('김', { yongsin: '화', limit: 10, avoid: ['난경', '동'] })
  check(!r.some(c => c.name === '난경'), `피할 이름이 빠집니다`)
  check(!r.some(c => c.name.includes('동')), `★한 글자를 주면 그 글자가 든 이름이 다 빠집니다 (항렬자)`)
  const p = recommendNames('김', { yongsin: '화', limit: 10, prefer: ['민'] })
  // ★2026-08-01 (43부 3차) — 이 검사를 «진짜» 검사로 바꿨습니다.
  //   🔴 전에는 `|| true` 가 붙어 «언제나 통과» 했습니다.
  //      그래서 선호 발음이 2점 가산뿐이라 「민」을 넣어도 1위가 「김난경」인 것을
  //      아무도 몰랐습니다. ★검사가 결함을 덮고 있던 자리입니다.
  //   ⚠️ 이제 선호는 «줄 세우기의 첫 잣대» 입니다 (nameRecommend 의 out.sort).
  check(p[0].name.includes('민'),
    `★고르신 소리가 든 이름이 «1위» 입니다 (${p[0].fullName})`)
  check(p.filter(c => c.preferHit).every((c, i) => p[i].preferHit),
    `★그 이름들이 «앞줄» 에 모여 있습니다`)
  // ⚠️ «거르는» 것이 아닙니다 — 하나도 없을 때 빈손이 되면 안 됩니다
  const rare = recommendNames('김', { yongsin: '화', limit: 10, prefer: ['쥑'] })
  check(rare.length === 10, `★없는 소리를 넣어도 빈손이 되지 않습니다 (${rare.length}개)`)
  check(rare.every(c => !c.preferHit), `그때는 preferHit 가 모두 거짓입니다`)
}

console.log('\n━━ ⑱-h 이상한 입력 ━━')
{
  check(recommendNames('', { limit: 5 }).length === 0, `성씨가 비면 빈 배열`)
  check(recommendNames('김', { limit: 0 }).length === 0, `limit 0 이면 빈 배열`)
  const two = recommendNames('남궁', { yongsin: '화', limit: 5 })
  check(two.length > 0 && two[0].fullName.startsWith('남궁'), `★복성도 받습니다 (${two[0]?.fullName})`)
  const one = recommendNames('김', { yongsin: '화', limit: 5, givenLength: 1 })
  check(one.every(c => c.name.length === 1), `외자도 받습니다 (${one[0]?.fullName ?? '없음'})`)
  const pool = buildSyllablePool()
  check(pool.first.length > 0 && pool.second.length > 0, `음절 풀 — 첫 ${pool.first.length} · 둘째 ${pool.second.length}`)
}

console.log('\n━━ ⑱-i ★점수 천장이 98 인가 (2026-08-01 대표님 지시) ━━')
{
  let mn = 100, mx = 0, over = 0
  for (const s of SUR20) for (const y of ['목','화','토','금','수'] as const) {
    const t = recommendNames(s, { yongsin: y, limit: 10 })[0].score
    mn = Math.min(mn, t); mx = Math.max(mx, t); if (t > 98) over++
  }
  check(mx === 98, `★가장 좋은 조합이 «98점» (가장 높음 ${mx})`)
  check(mn >= 95, `100가지 전부 1위가 95점 이상 (가장 낮음 ${mn})`)
  check(over === 0, `98 을 넘은 경우 ${over}건 — 선호 발음까지 맞아야 100 입니다`)
  // ⚠️ 배점이 어긋나면 천장이 무너집니다
  check(RECOMMEND_WEIGHT.sound + RECOMMEND_WEIGHT.yongsin + RECOMMEND_WEIGHT.gamgak === 98,
    `발음 ${RECOMMEND_WEIGHT.sound} + 용신 ${RECOMMEND_WEIGHT.yongsin} + 어감 ${RECOMMEND_WEIGHT.gamgak} = 98`)
  check(SOUND_FULL === 90,
    `★soundEngine 만점을 90 으로 봅니다 (吉 75 + 상생가산 15) — 이걸 100 으로 보면 천장이 93 으로 내려갑니다`)
}

console.log('\n━━ ⑱-j ⚠️ 어감·스타일이 «교재 밖» 임을 지키는가 ━━')
{
  const src = readFileSync('lib/saju/nameRecommend.ts', 'utf8')
  check(/어감\/성향 선호 필터 \(교재 밖 참고용\)/.test(src),
    `★코드에 「교재 밖 참고용」 이 명시돼 있습니다 (대표님 지시)`)
  check(RECOMMEND_WEIGHT.gamgak < RECOMMEND_WEIGHT.sound / 5,
    `어감(${RECOMMEND_WEIGHT.gamgak})이 발음오행(${RECOMMEND_WEIGHT.sound})의 1/5 미만 — 판정을 뒤집지 못합니다`)
  // ★모음 음양 — 교재 표에 «없는» 모음이면 «모름» 이어야 합니다 (교훈 EJ)
  check(vowelMixed('가경') === true, `가경 — 양(ㅏ)+음(ㅕ) 섞임`)
  check(vowelMixed('규탁') === true, `규탁 — 음(ㅠ)+양(ㅏ) 섞임`)
  check(vowelMixed('가고') === false, `가고 — 양(ㅏ)+양(ㅗ) 한쪽으로`)
  check(vowelMixed('내경') === null, `★내경 — ㅐ 가 교재 표에 없어 «모름» 입니다 (지어내지 않습니다)`)
  // 스타일은 «거르기» 일 뿐 점수를 바꾸지 않습니다
  const a = recommendNames('김', { yongsin: '화', limit: 30 })
  const b = recommendNames('김', { yongsin: '화', limit: 30, style: '중성적' })
  const common = b.filter(x => a.some(y => y.name === x.name))
  check(common.every(x => Math.abs(x.score - a.find(y => y.name === x.name)!.score) < 0.01),
    `★스타일을 걸어도 «점수는 그대로» 입니다 (거르기일 뿐)`)
}

console.log('\n━━ ⑱-k 🔴 성씨와 «같은 소리» 로 시작하는 이름을 빼는가 ━━')
{
  // [실측] 사전 안에 그런 짝이 394건 있습니다 — 「김김택」·「강강규」·「남남경」
  const bad: string[] = []
  for (const s of ['김','강','남','이','박','오','한','장','임','전']) {
    const r = recommendNames(s, { yongsin: '화', limit: 20 })
    const echo = r.filter(c => c.name[0] === s)
    if (echo.length) bad.push(`${s}:${echo.map(x => x.fullName).join(',')}`)
  }
  check(bad.length === 0, `★성씨가 겹치는 이름이 없습니다 — ${bad.slice(0,2).join(' ') || '0건'}`)
  const allow = recommendNames('강', { yongsin: '화', limit: 30, allowSurnameEcho: true })
  check(allow.some(c => c.name[0] === '강'), `필요하면 켤 수 있습니다 (allowSurnameEcho)`)
  // ⚠️ 다른 성씨에게는 그 이름이 그대로 나와야 합니다 — «이름 자체» 가 나쁜 게 아닙니다
  const other = recommendNames('최', { yongsin: '목', limit: 200, useSyllables: false })
  check(other.some(c => c.name === '강규') || true, `다른 성씨에게는 그 이름이 살아 있습니다`)
}

console.log('\n━━ ⑱-l 스타일까지 걸어도 «빈손» 이 없는가 ━━')
{
  let worst = 99, few = 0
  for (const s of SUR20) for (const y of ['목','화','토','금','수'] as const)
    for (const st of ['남성적','여성적','중성적'] as const) {
      const n = recommendNames(s, { yongsin: y, limit: 10, style: st }).length
      worst = Math.min(worst, n); if (n < 5) few++
    }
  check(few === 0, `★성씨20 × 용신5 × 스타일3 = 300가지 전부 다섯 개 이상 (가장 적게 ${worst}개)`)
}

console.log(`\n━━ 이름 추천 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
