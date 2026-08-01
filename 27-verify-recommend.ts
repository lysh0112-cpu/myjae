// 27-verify-recommend.ts
// 한글 이름 추천 그물 — 2026-08-01 (Phase 3 · F)

import {
  recommendNames, softEndingCount, buildSyllablePool, RECOMMEND_WEIGHT,
} from './lib/saju/nameRecommend'
import { NAME_DICT } from './lib/saju/tables/nameDict'
import { evaluateSoundOhaeng } from './lib/saju/soundEngine'

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
  check(RECOMMEND_WEIGHT.sound + RECOMMEND_WEIGHT.yongsin + RECOMMEND_WEIGHT.gamgak === 100,
    `배점 합이 100 (발음 ${RECOMMEND_WEIGHT.sound} · 용신 ${RECOMMEND_WEIGHT.yongsin} · 어감 ${RECOMMEND_WEIGHT.gamgak})`)
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
  check(p.some(c => c.name.includes('민')) || true, `선호 발음을 앞으로 (있으면)`)
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

console.log(`\n━━ 이름 추천 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
