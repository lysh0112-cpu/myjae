// 21-verify-lunar.ts
// 음력 변환 그물 — 2026-07-31 (41부)
// ⚠️ npm run verify 에 붙여 주십시오.

import {
  fallbackLunarToSolar, fallbackSolarToLunar, lunarToSolar, solarToLunar,
  compareSolar, compareLunar, KASI_TIMEOUT_MS,
} from './lib/saju/lunarConvert'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}

async function main() {
  console.log('\n━━ ⑫-a 부본 — 양력 → 음력 ━━')
  // ★바깥의 정답표와 대조합니다 (교훈 EQ). KASI·천문력에서 널리 확인되는 값들입니다
  const S2L: [number, number, number, number, number, number, boolean][] = [
    [1965,  2, 15, 1965,  1, 14, false],
    [1995, 10,  2, 1995,  8,  8, true ],   // ★윤8월
    [2000,  7, 15, 2000,  6, 14, false],
    [2024,  2, 10, 2024,  1,  1, false],   // 설날
    [2025,  1, 29, 2025,  1,  1, false],   // 설날
    [2020,  6, 21, 2020,  5,  1, false],
  ]
  for (const [sy, sm, sd, ly, lm, ld, leap] of S2L) {
    const r = fallbackSolarToLunar({ year: sy, month: sm, day: sd })
    const ok = !!r && r.year === ly && r.month === lm && r.day === ld && r.isLeap === leap
    check(ok, `양 ${sy}-${sm}-${sd} → 음 ${r?.year}-${r?.month}-${r?.day}${r?.isLeap ? '(윤)' : ''} `
      + `(기대 ${ly}-${lm}-${ld}${leap ? '(윤)' : ''})`)
  }

  console.log('\n━━ ⑫-b 부본 — 음력 → 양력 · ★윤달을 가리는가 ━━')
  {
    const flat = fallbackLunarToSolar({ year: 1995, month: 8, day: 8, isLeap: false })
    const leap = fallbackLunarToSolar({ year: 1995, month: 8, day: 8, isLeap: true })
    check(!!flat && flat.month === 9 && flat.day === 2, `음 1995-08-08 평달 → 양 ${flat?.month}/${flat?.day} (기대 9/2)`)
    check(!!leap && leap.month === 10 && leap.day === 2, `음 1995-08-08 윤달 → 양 ${leap?.month}/${leap?.day} (기대 10/2)`)
    // ⚠️ 일(日)만 견주면 안 됩니다 — 9/2 와 10/2 는 «일이 같습니다». 날짜 전체를 봅니다
    const fmt = (x: { year: number; month: number; day: number } | null) =>
      x ? `${x.year}-${x.month}-${x.day}` : 'null'
    check(fmt(flat) !== fmt(leap), `★평달(${fmt(flat)})과 윤달(${fmt(leap)})이 «다른 날» 로 갈립니다`)
  }

  console.log('\n━━ ⑫-c 왕복이 제자리로 오는가 (2000~2030 무작위 600건) ━━')
  {
    let bad = 0; const ex: string[] = []
    for (let i = 0; i < 600; i++) {
      const y = 2000 + Math.floor(Math.random() * 31)
      const m = 1 + Math.floor(Math.random() * 12)
      const d = 1 + Math.floor(Math.random() * 28)
      const l = fallbackSolarToLunar({ year: y, month: m, day: d })
      if (!l) { bad++; continue }
      const back = fallbackLunarToSolar(l)
      if (!back || back.year !== y || back.month !== m || back.day !== d) {
        bad++; if (ex.length < 3) ex.push(`${y}-${m}-${d}`)
      }
    }
    check(bad === 0, `양→음→양 왕복 어긋남 ${bad}건 ${ex.length ? '— ' + ex.join(',') : ''}`)
  }

  console.log('\n━━ ⑫-d 🔴 KASI 키가 «없어도» 죽지 않는가 ━━')
  {
    const a = await lunarToSolar({ year: 1995, month: 8, day: 8, isLeap: true }, '')
    check(a.value !== null, `음→양 — 키 없이도 답합니다 (${a.value?.year}-${a.value?.month}-${a.value?.day})`)
    check(a.source === 'FALLBACK_LUNAR_JS', `출처가 «부본» 으로 표시됩니다`)
    check(!!a.reason, `까닭이 남습니다 — ${a.reason}`)
    const b = await solarToLunar({ year: 2024, month: 2, day: 10 }, '')
    check(b.value !== null && b.value.month === 1 && b.value.day === 1, `양→음 — 키 없이도 답합니다`)
    check(b.source === 'FALLBACK_LUNAR_JS' && !!b.reason, `출처·까닭이 남습니다`)
  }

  console.log('\n━━ ⑫-e 🔴 정본↔부본 대조가 «어긋남을 잡는가» ━━')
  {
    // 일부러 어긋난 값을 넣어 봅니다 — 조용히 통과하면 안 됩니다
    check(compareSolar({ year: 2024, month: 2, day: 10 }, { year: 2024, month: 2, day: 10 }) === null,
      `같으면 null`)
    check(compareSolar({ year: 2024, month: 2, day: 10 }, { year: 2024, month: 2, day: 11 }) !== null,
      `하루 어긋나면 잡습니다`)
    check(compareLunar({ year: 1995, month: 8, day: 8, isLeap: true },
                       { year: 1995, month: 8, day: 8, isLeap: false }) !== null,
      `★윤달 여부만 달라도 잡습니다`)
    check(compareSolar({ year: 2024, month: 2, day: 10 }, null) === null,
      `부본이 못 냈으면 «어긋남» 으로 치지 않습니다`)
  }

  console.log('\n━━ ⑫-f 제한 시간 ━━')
  check(KASI_TIMEOUT_MS === 3000, `KASI 제한 시간 3초 (${KASI_TIMEOUT_MS}ms)`)
  {
    // 닿지 않는 주소로 «실제로» 시간을 재 봅니다
    const t0 = Date.now()
    const r = await solarToLunar({ year: 2024, month: 2, day: 10 }, 'DUMMY_KEY_FOR_TIMEOUT_TEST')
    const dt = Date.now() - t0
    check(r.value !== null, `KASI 가 실패해도 값이 나옵니다 (${dt}ms)`)
    check(dt < KASI_TIMEOUT_MS + 2000, `제한 시간 안에 돌아옵니다 (${dt}ms)`)
    check(r.source === 'FALLBACK_LUNAR_JS' && !!r.reason, `부본으로 갔고 까닭이 남습니다 — ${r.reason?.slice(0, 40)}`)
  }

  console.log('\n━━ ⑫-g 이상한 입력 ━━')
  for (const bad of [
    { year: 1995, month: 13, day: 8, isLeap: false },
    { year: 1995, month: 8, day: 40, isLeap: false },
  ]) {
    const r = fallbackLunarToSolar(bad)
    check(r === null || (r.year >= 1000 && r.year <= 3000),
      `음 ${bad.year}-${bad.month}-${bad.day} — 터지지 않습니다 (${r ? `${r.year}-${r.month}-${r.day}` : 'null'})`)
  }


  console.log(`\n━━ 음력 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
  if (fail > 0) process.exit(1)

}

main().catch((e) => { console.error(e); process.exit(1) })
