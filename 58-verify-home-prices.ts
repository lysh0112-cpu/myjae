// ══════════════════════════════════════════════════════════════════════
//  58-verify-home-prices.ts — 홈 카드 가격  [대표님 2026-09-18 · 10부]
//
//  ┌───────────────────────────────────────────────────────────────┐
//  │  「홈화면 가격표도 만들어줘 · 토글버튼이 있어야 해 ·            │
//  │    나중에 토글을 꺼서 홈화면의 가격을 숨길 수도 있어야 해」     │
//  │  · 서비스 ★전부(열둘)  · 값은 ★AI 분석값 「10,000원~」         │
//  │  · ★비회원(PG 심사관)도 보임                                   │
//  └───────────────────────────────────────────────────────────────┘
//
//  🔴 이 그물이 «꼭» 필요한 까닭 —
//     짝 표가 ★«두 곳» 입니다 (PriceManager 의 PAIRS · lib/homePrices 의 표).
//     한쪽만 고치면 홈이 ★«엉뚱한 값» 을 내겁니다. 그래서 «대조» 합니다.
//     ⇒ 7부 0-1 「말로 막은 것은 안 지켜집니다」 와 같은 자리입니다.
// ══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { join } from 'path'
import { HOME_PRICE_SERVICES, cheapestAi, HOME_PRICES_NONE } from './lib/homePrices'
import { EXAM_LUCK_NAME, HAERAK_NAME } from './lib/homeFlags'

const ROOT = process.cwd()
const R = (p: string) => readFileSync(join(ROOT, p), 'utf-8')
/** ⛔ ★주석을 걷어냅니다 — 주석에 옛 값이 그대로 남아 있습니다 (9부 교훈 ②) */
const liveOf = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*|--)/.test(l)).join('\n')

let pass = 0
let fail = 0
const ok = (c: boolean, m: string) => {
  if (c) { pass++; console.log(`  ✅ ${m}`) } else { fail++; console.log(`  ❌ ${m}`) }
}
const head = (t: string) => console.log(`\n━━ ${t} ━━`)

function main() {
  const pm = R('app/admin/components/PriceManager.tsx')
  const svcSrc = R('app/home-new/components/ServiceSection.tsx')
  const homeSrc = R('app/home-new/page.tsx')
  const api = R('app/api/home-prices/route.ts')
  const sql = R('_SQL_home_prices.sql')

  /* ══ ① 서비스 열둘 ══════════════════════════════════════════ */
  head('① 🔴 서비스 «전부» 열둘 [대표님]')
  {
    ok(HOME_PRICE_SERVICES.length === 12,
      `🔴 ★열두 서비스가 다 있습니다 (${HOME_PRICE_SERVICES.length})`)
    const keys = HOME_PRICE_SERVICES.map(s => s.key)
    ok(new Set(keys).size === 12, '⛔ ★낱말이 겹치지 않습니다')
    const names = HOME_PRICE_SERVICES.map(s => s.name)
    ok(new Set(names).size === 12, '⛔ ★이름이 겹치지 않습니다')
    //  ⛔ 이름을 «붙박이» 로 적지 않았는지 (7부 교훈 — 셋이 갈립니다)
    ok(names.includes(EXAM_LUCK_NAME) && names.includes(HAERAK_NAME),
      '⛔ ★합격운·하락이수 이름은 homeFlags 에서 옵니다 (붙박이 금지)')

    //  🔴🔴 ★홈 카드 이름과 «글자 하나까지» 같은가 — 다르면 가격이 «안 붙습니다»
    const cards = homeSrc.slice(homeSrc.indexOf('const SERVICES = ['))
    for (const s of HOME_PRICE_SERVICES) {
      const lit = s.name === EXAM_LUCK_NAME ? 'EXAM_LUCK_NAME'
        : s.name === HAERAK_NAME ? 'HAERAK_NAME' : `'${s.name}'`
      ok(cards.includes(`name: ${lit}`),
        `🔴 ★「${s.name}」 가 홈 카드 이름과 «같습니다»`)
    }
  }

  /* ══ ② 🔴🔴 두 짝 표를 «대조» ════════════════════════════════ */
  head('② 🔴🔴 PAIRS 와 «한 값도» 안 다름')
  {
    //  ★PriceManager 의 PAIRS 를 읽어 냅니다
    const blk = pm.slice(pm.indexOf('const PAIRS'), pm.indexOf('\n]', pm.indexOf('const PAIRS')))
    const live = liveOf(blk)
    const consults = [...live.matchAll(/consult: '([a-z_]+)'/g)].map(m => m[1])
    const aiKeys = [...live.matchAll(/k: '([a-z_]+)'/g)].map(m => m[1])

    ok(consults.length === 12, `★PAIRS 도 열둘입니다 (${consults.length})`)
    const mine = HOME_PRICE_SERVICES.map(s => s.key)
    ok(JSON.stringify([...consults].sort()) === JSON.stringify([...mine].sort()),
      '🔴🔴 ★서비스 낱말이 «똑같습니다» (PAIRS ↔ HOME_PRICE_SERVICES)')

    const myAi = HOME_PRICE_SERVICES.flatMap(s => s.ai)
    ok(JSON.stringify([...aiKeys].sort()) === JSON.stringify([...myAi].sort()),
      `🔴🔴 ★AI 줄 낱말이 «똑같습니다» (${aiKeys.length} ↔ ${myAi.length})`)
  }

  /* ══ ③ 값은 «저절로» — 홈용 값을 따로 두지 않음 ════════════════ */
  head('③ 🔴 홈 값은 «AI 값에서 저절로» (네 곳이 되지 않게)')
  {
    //  ★가장 싼 «켜진» 값을 고릅니다 — 값으로 재 봅니다
    const rows = [
      { price_key: 'moving_pick', price: 5000, active: true },
      { price_key: 'moving_check', price: 9000, active: true },
      { price_key: 'naming_read', price: 1000, active: false },  // ⛔ 꺼진 것
      { price_key: 'naming_ai', price: 10000, active: true },
      { price_key: 'tarot_ai', price: 0, active: true },          // ⛔ 0원
    ]
    ok(cheapestAi(rows, ['moving_pick', 'moving_check']) === 5000,
      '★가장 싼 값을 고릅니다 (5,000)')
    ok(cheapestAi(rows, ['naming_read', 'naming_ai']) === 10000,
      '⛔ ★«꺼진» 줄의 값은 안 씁니다 (1,000 이 아니라 10,000)')
    ok(cheapestAi(rows, ['tarot_ai']) === null,
      '⛔ ★0원은 내걸지 않습니다 (PG 심사에서 «심사 불가» 사유)')
    ok(cheapestAi(rows, ['없는키']) === null,
      '⛔ ★줄이 없으면 «없다» 고 합니다 (지어내지 않습니다)')

    //  ⛔ 홈이 값을 «따로» 읽지 않는지 — home_prices.price 를 안 씁니다
    ok(!/home_prices[\s\S]{0,200}price\b(?!_)/.test(liveOf(api))
      || !/r\.price/.test(liveOf(api)),
      '⛔ ★창구가 home_prices 의 «값 칸» 을 안 읽습니다 (토글만 읽습니다)')
    ok(/select\('service_key, show_price'\)/.test(api),
      '🔴 ★창구가 «show_price 만» 가져옵니다')
    ok(/analysis_prices/.test(api), '★값은 analysis_prices 에서 옵니다')
  }

  /* ══ ④ 비회원도 보임 — 창구가 안전한가 ════════════════════════ */
  head('④ 🔴 비회원도 보임 · 그러나 «정해진 낱말만» [PG 심사관]')
  {
    ok(!/requireMaster|requireAdmin/.test(api),
      '🔴 ★문지기가 없습니다 — 비회원(심사관)도 가격을 봅니다 [대표님]')
    //  ⛔ 문지기가 없는 대신 ★정해진 낱말만 읽어야 합니다
    ok(/\.in\('price_key', aiKeys\)/.test(api) && /\.in\('service_key', svcKeys\)/.test(api),
      '⛔⛔ ★정해진 낱말«만» 읽습니다 (아무 줄이나 못 읽습니다)')
    ok(!/insert|update|delete|upsert/.test(liveOf(api)),
      '⛔⛔ ★읽기만 합니다 (쓰는 길이 없습니다)')
    ok(/HOME_PRICES_NONE/.test(api) && Object.keys(HOME_PRICES_NONE).length === 0,
      '⛔ ★못 읽으면 «아무것도 안 보여 줍니다» (빈 표)')
    ok(/dynamic = 'force-dynamic'/.test(api) && /no-store/.test(api),
      '★담아 두지 않습니다 — 고치시면 바로 반영됩니다')
    //  🔴 홈이 ★로그인과 «상관없이» 부르는가
    const live = liveOf(homeSrc)
    ok(/fetch\('\/api\/home-prices'\)/.test(live),
      '🔴 ★홈이 가격을 부릅니다')
    const i = live.indexOf("fetch('/api/home-prices')")
    /*  🔴 ⛔ ★«부르는 effect 안» 만 봅니다 —
     *     처음에는 앞 400자를 보았는데, 바로 위의 «상태 선언»(isLoggedIn)이
     *     걸려 ★엉뚱하게 실패했습니다. 느슨한 것이 아니라 «틀린» 범위였습니다. */
    const eff = live.slice(live.lastIndexOf('useEffect', i), live.indexOf('}, [', i) + 6)
    ok(!/isLoggedIn/.test(eff),
      '🔴 ⛔ ★로그인 여부를 «안 봅니다» (비회원도 가격이 보입니다)')
    ok(/\}, \[\]\)/.test(eff),
      '⛔ ★한 번만 부릅니다 (끝없이 부르지 않게 · 6부 0장)')
  }

  /* ══ ⑤ 토글 — 끄면 «숨습니다» ═════════════════════════════════ */
  head('⑤ 🔴 토글로 끄면 홈에서 숨음 [대표님]')
  {
    const live = liveOf(svcSrc)
    ok(/const PriceRow =/.test(live), '★가격 칸 부품이 있습니다')
    ok(/if \(!p \|\| !p\.show \|\| p\.won <= 0\) return null/.test(live),
      '🔴🔴 ★토글이 꺼져 있으면 칸이 «통째로» 사라집니다 [대표님]')
    ok(/원~/.test(live), '★「○○원~」 로 보여 줍니다 [대표님]')
    ok(/혼자 보기/.test(live), '★무슨 값인지 왼쪽에 밝힙니다 (「혼자 보기」)')

    /*  🔴 ★2026-09-18 [대표님 「자리가 없다고 할 것이 아니라 «자리를 만들어야지»」]
     *    ⛔ 설명 줄 밑에 «끼워» 넣는 것으로 되돌리지 마십시오 —
     *       카드 «맨 아래 한 칸» 이라야 합니다. */
    ok(/borderTop: `1px solid \$\{C\.borderSub\}`/.test(live)
      && /justifyContent: 'space-between'/.test(live),
      '🔴 ★«윗선이 있는 한 칸» 입니다 (설명 줄에 얹은 것이 아닙니다)')
    ok(!/<PriceLine/.test(live),
      '⛔ ★옛 «얹기» 모양으로 되돌아가지 않았습니다')

    //  ⛔ 카드가 «세 가지 모양» 입니다 — 낱장 · 폴더 밖 · 폴더 속. 다 붙었는지.
    const n = (live.match(/<PriceRow/g) ?? []).length
    ok(n === 3, `🔴 ★세 가지 카드 모양에 «다» 붙었습니다 (${n})`)

    /*  🔴 ⛔ ★누르는 <button> «바깥» 이라야 합니다 —
     *     안에 두면 읽어 주기가 단추 이름을 「궁합 두 사람의 결 10,000원~」 으로 읽습니다. */
    {
      let bad = 0
      for (const m of live.matchAll(/<PriceRow/g)) {
        const before = live.slice(0, m.index)
        if (before.lastIndexOf('<button') > before.lastIndexOf('</button>')) bad++
      }
      ok(bad === 0, `🔴 ⛔ ★값 칸이 «단추 바깥» 에 있습니다 (안에 든 것 ${bad}개)`)
    }

    //  ⛔ 값이 없을 때 «가격 문의» 같은 글로 채우지 않았는지 (PG 입점 불가 사유)
    ok(!/가격 문의|문의하세요|상담 문의/.test(live),
      '⛔ ★「가격 문의」 로 대신 채우지 않습니다 (PG 입점 불가 사유)')

    //  ⛔ 관리 화면 — 네 번째 칸이 «표 안» 에 있고, 따로 있던 표는 없어야 합니다
    const pmLive = liveOf(pm)
    ok(/gridTemplateColumns: '148px 150px 224px 132px'/.test(pmLive),
      '🔴 ★표가 «네 칸» 입니다 [대표님 「맨우측란에 붙여줘」]')
    ok(/<span>🏠 홈 카드<\/span>/.test(pmLive), '★머리에 「🏠 홈 카드」 가 있습니다')
    ok(/<HomeCell/.test(pmLive), '★줄마다 홈 칸이 있습니다')
    ok(!/function HomePriceTable/.test(pm),
      '⛔⛔ ★따로 있던 표를 걷어냈습니다 («두 벌» 금지)')
    ok(/for \(const r of homeRows\)/.test(pmLive),
      '🔴 ★[저장] 한 번에 홈 토글까지 «함께» 저장됩니다')
    ok(/from\('home_prices'\)/.test(pmLive), '★관리 화면이 home_prices 를 봅니다')
  }

  /* ══ ⑥ SQL — 열두 줄 · 처음엔 다 꺼짐 ═════════════════════════ */
  head('⑥ ★SQL 이 열두 줄을 채웁니다')
  {
    for (const s of HOME_PRICE_SERVICES) {
      ok(new RegExp(`'${s.key}'`).test(sql), `★SQL 에 「${s.key}」 가 있습니다`)
    }
    ok(/on conflict \(service_key\) do nothing/.test(sql),
      '⛔ ★여러 번 돌려도 안전합니다 (있는 줄은 안 건드립니다)')
    ok(/create table if not exists/.test(sql), '★표가 없으면 만듭니다')
    //  ⛔ 처음엔 «다 꺼짐» — 대표님이 보시면서 켜십니다
    const vals = sql.slice(sql.indexOf('values'), sql.indexOf('on conflict'))
    ok(!/\btrue\b/.test(vals), '⛔ ★처음에는 «다 꺼짐» 입니다 (대표님이 켜십니다)')
    //  ⚠️ 지우는 줄은 ★주석으로만 (실수로 지워지지 않게)
    const del = sql.split('\n').find(l => l.includes('delete from'))
    ok(!!del && del.trim().startsWith('--'),
      '⛔⛔ ★지우는 줄은 «주석» 입니다 (대표님이 눈으로 보신 뒤에만)')
  }

  console.log(`\n━━ 홈 카드 가격 — 통과 ${pass} · 실패 ${fail} ━━\n`)
  if (fail > 0) process.exit(1)
}

main()
