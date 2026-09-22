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
/** ⛔ ★주석을 «줄 머리» 로만 걷어냅니다 (빠른 것 · 대부분 여기로 충분) */
const liveOf = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*|--)/.test(l)).join('\n')

/**
 *  🔴🔴 ★주석 «덩이» 를 통째로 걷어냅니다 — 2026-09-18 (10부)
 *
 *  ⚠️ 위 liveOf 는 ★«줄 머리» 만 봅니다. 그래서 이런 줄을 «못 거릅니다» —
 *        {* 추천 탭은 이미 좋음만 냅니다. 그런데 사전 탭은
 *           교재 1장의 이름을 그대로 늘어놓습니다.        ← ★줄 머리가 «글자» 입니다
 *  ⇒ 손님에게 «안 보이는» 글인데 ★보이는 것으로 세었습니다.
 *  ⇒ 🔴 그래서 ★«여는 표시부터 닫는 표시까지» 통째로 걷어냅니다.
 *  ⛔ 이것이 필요한 자리(손님 글을 세는 곳)에서는 ★strip 을 쓰십시오.
 */
const strip = (src: string) =>
  src
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')   //  JSX 주석 {/* … */}
    .replace(/\/\*[\s\S]*?\*\//g, ' ')        //  여러 줄 주석 /* … */
    .replace(/^\s*\/\/.*$/gm, ' ')            //  한 줄 주석 //

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
    /*  🔴 ★2026-09-18 [대표님] — 라벨을 «뺐습니다».
     *    「혼자 보기」 라 적었다가 ★대표님이 «무슨 뜻이냐» 물으셨습니다.
     *    ⇒ ★대표님이 물으시면 손님은 더 모르십니다. 값만 둡니다. */
    ok(!/혼자 보기|바로 보기|혼자 조회/.test(live),
      '🔴 ★값만 둡니다 — 설명하는 말을 안 붙였습니다 [대표님]')

    /*  🔴 ★2026-09-18 [대표님 「자리가 없다고 할 것이 아니라 «자리를 만들어야지»」]
     *    ⛔ 설명 줄 밑에 «끼워» 넣는 것으로 되돌리지 마십시오 —
     *       카드 «맨 아래 한 칸» 이라야 합니다. */
    ok(/borderTop: `1px solid \$\{C\.borderSub\}`/.test(live)
      && /justifyContent: 'flex-end'/.test(live),
      '🔴 ★«윗선이 있는 한 칸» 입니다 (설명 줄에 얹은 것이 아닙니다)')
    ok(!/<PriceLine/.test(live),
      '⛔ ★옛 «얹기» 모양으로 되돌아가지 않았습니다')

    /*  🔴🔴 ★2026-09-18 [대표님 「위에 세 개만 아래 가격표시가 안 나온다」]
     *
     *  ⚠️⚠️ 제가 카드 모양을 ★«셋» 이라 여기고 셋만 붙였는데 ★다섯이었습니다.
     *     BEST 카드(내사주그림·진로적성·하락이수)가 빠져 있었습니다.
     *     ⇒ 7부 0-3 «절반만 고치기» 를 또 밟았습니다.
     *  🔴 ★그런데 이 그물이 «셋» 이라고 «못 박아» 두어 «저를 못 잡았습니다».
     *     숫자를 외운 그물은 ★«늘어난 것» 을 영영 모릅니다.
     *  ⇒ ★이제 «카드를 그리는 자리» 를 세어 «그만큼» 붙었는지 봅니다.
     *  ⛔ 다시 숫자를 못 박지 마십시오. */
    {
      const cards = (live.match(/onClick=\{\(\) => onOpen\(s\)\}/g) ?? []).length
      const n = (live.match(/<PriceRow/g) ?? []).length
      /*  ⚠️ ★「고정한 서비스」 하나는 «알약 바로가기» 라 값 칸이 없습니다 —
       *     같은 서비스가 아래 카드에 «이미» 값과 함께 나옵니다. 그래서 «카드 − 1» 입니다. */
      const chip = /svcChip/.test(live) ? 1 : 0
      ok(cards - chip === n,
        `🔴🔴 ★카드 모양 «모두» 에 붙었습니다 (그리는 자리 ${cards} − 알약 ${chip} = 값 칸 ${n})`)
      ok(n >= 4, `★BEST 카드까지 붙었습니다 (값 칸 ${n})`)
    }
    //  ⛔ BEST 카드는 «겉을 감싸» 값 칸까지 테두리 안에 들어와야 합니다
    ok(/borderRadius: 16, overflow: 'hidden',/.test(live),
      '⛔ ★BEST 카드는 «겉 상자» 가 테두리를 맡습니다 (값 칸이 밖으로 새지 않게)')

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

  /* ══ ⑦ 🔴🔴 청약철회 안내 — 약관이 «약속» 한 것 ════════════════
   *  약관 제8조 2항 —
   *    「AI 콘텐츠는 결과물이 제공된 후에는 청약철회가 제한되며,
   *      회사는 이를 ★«결제 전 화면에» 표시합니다」
   *
   *  ⚠️ 2026-09-18 에 세어 보니 ★결제 시트에 «한 줄도» 없었습니다.
   *     «적어만 두고 안 지킨» 것입니다 (7부 0-1 그대로).
   *  ⇒ 🔴 이제 ★약관과 화면을 «함께» 봅니다. 한쪽만 고치면 멈춥니다.
   * ════════════════════════════════════════════════════════════════ */
  head('⑦ 🔴🔴 청약철회 안내 — 약관과 화면이 «맞는가»')
  {
    const terms = R('app/components/legal/termsText.ts')
    const sheet = R('app/components/common/WalletPaySheet.tsx')
    const live = liveOf(sheet)

    //  ★약관이 «표시하겠다» 고 약속해 두었는가
    const promise = /회사는 이를 결제 전 화면에 표시합니다/.test(terms)
    ok(promise, '★약관 제8조 2항이 «결제 전 화면에 표시» 를 약속합니다')

    /*  🔴🔴 ★약속했으면 «화면에 있어야» 합니다.
     *    ⛔ 둘 중 하나만 고치지 마십시오 —
     *       화면에서 지우시려면 ★약관의 그 한 마디도 «함께» 빼야 합니다. */
    const shown = /결과를 확인하신 뒤에는 환불이 어려워요/.test(live)
    ok(promise === shown,
      `🔴🔴 ★약관의 약속과 화면이 «맞습니다» (약관 ${promise} · 화면 ${shown})`)
    ok(/만드는 데 실패하면 값이 빠지지 않아요/.test(live),
      '★실패하면 «안 빠진다» 도 함께 알립니다 (약관 제8조 2항 뒷말)')

    /*  🔴 ★서비스 제공기간 — 2026-09-21 [토스 계약 메일]
     *    「구매자가 서비스제공기간을 인지할 수 있도록 ★«상품페이지 내에» 명확히 기재」
     *  ⚠️ 약관에도 화면에도 ★한 줄도 없었습니다 (환불정책만 있었습니다).
     *  ⛔ 지우지 마십시오 — 없으면 ★카드사 심사에서 걸립니다. */
    ok(/결제하시면 바로 결과가 나와요\. \(최대 24시간 이내\)/.test(live),
      '🔴 ★서비스 제공기간을 «상품페이지에» 적었습니다 (토스 요구)')
    //  ⚠️ 「24시간」 은 넉넉히 잡은 값 — ⛔ 줄이면 실제보다 «빠듯해» 집니다
    ok(!/최대 1시간|최대 10분|즉시 제공됩니다/.test(live),
      '⛔ ★제공기간을 «줄이지» 않았습니다 (심사는 최댓값을 봅니다)')

    /*  ⚠️ ★«결제하는» 화면에서만 보입니다 —
     *    잔액이 모자라거나 오류일 때는 «충전하러 가는» 화면이라 안 보여 줍니다. */
    {
      /*  ⚠️ ★2026-09-21 — 앞 «200자» 만 보던 것을 고쳤습니다.
       *    제공기간 한 줄이 늘면서 ★조건문이 그 밖으로 밀려나 «헛 실패» 가 났습니다.
       *    ⇒ ★«그 덩이의 머리» 를 찾아 봅니다. 글이 더 늘어도 안 흔들립니다. */
      const i = live.indexOf('결과를 확인하신 뒤에는')
      const head = live.lastIndexOf("{state === 'ok' && !short && (", i)
      ok(head > 0 && head < i,
        "⛔ ★결제하는 화면(state 'ok')에서만 보입니다 (충전·오류 화면에는 안 나옵니다)")
    }
    //  🔴 ⛔ ★결제 단추 «위» 라야 합니다 — 누르기 «전» 에 보여야 하기 때문입니다
    {
      const iMsg = live.indexOf('결과를 확인하신 뒤에는')
      const iBtn = live.indexOf('내고 ${p.actionLabel}')
      ok(iMsg > 0 && iBtn > iMsg,
        `🔴 ★결제 단추 «위» 에 있습니다 — 누르기 전에 보입니다 (${iMsg}/${iBtn})`)
    }
    //  ⛔ 센 말로 바꾸지 않았는지 — 파는 물건입니다
    ok(!/환불 불가|환불되지 않습니다|절대/.test(live),
      '⛔ ★센 말을 쓰지 않습니다 (「환불 불가」 등) — 파는 물건입니다')
    //  ⛔ 결제 시트는 «한 곳» 입니다 — 화면마다 다시 만들지 않았는지
    ok(!/결과를 확인하신 뒤에는/.test(R('app/home-new/page.tsx')),
      '⛔ ★이 글을 화면마다 «다시 적지» 않았습니다 (공용 시트 한 곳)')
  }

  /* ══ ⑧ 🔴 손님 화면에 「교재」 라는 말을 안 씁니다 ════════════════
   *  [대표님 2026-09-18]
   *    「"교재 원문 그대로의 풀이" 이 말은 삭제」 · 「작명쪽도 모두 지워」
   *
   *  ⚠️ 까닭 셋 —
   *    ① 손님은 ★«무슨 책» 인지 모르십니다.
   *    ② 「원문 그대로」 는 자랑이 아니라 ★「안 다듬었다」 로 읽힙니다.
   *    ③ 🔴 ★사실과도 달랐습니다 — 손님 화면은 plainMap 으로 «순화해» 나갑니다.
   *       원문 그대로 보시는 곳은 ★연재쌤 전용 화면입니다.
   *
   *  ⛔ ★«그리는» 글만 봅니다 — 주석의 「교재」 는 근거를 적어 둔 것이라 남깁니다.
   *     (9부 ② 「주석을 걸러내십시오」)
   * ════════════════════════════════════════════════════════════════ */
  head('⑧ 🔴 손님 화면에 「교재」 를 안 씁니다 [대표님]')
  {
    /*  ⚠️ ★손님이 여는 화면만 봅니다 —
     *    consultant(상담사용)와 naejeong(연재쌤 전용)은 ★교재 원문을 씁니다. */
    const files = [
      'app/manseryeok/haerak-input/page.tsx',
      'app/manseryeok/naming/components/NamePicker.tsx',
      'app/manseryeok/naming/start/page.tsx',
      'app/manseryeok/naming/rename/newborn/page.tsx',
      'app/manseryeok/naming/diagnosis/page.tsx',
      'app/manseryeok/naming/rename/newname/page.tsx',
    ]
    for (const f of files) {
      //  ⛔ ★strip 을 씁니다 — 주석 «덩이» 를 통째로 걷어내야 «보이는 글» 만 남습니다
      const live = strip(R(f))
      const hit = live.includes('교재')
      ok(!hit, `⛔ ★${f.split('/').slice(-2).join('/')} — 손님 글에 「교재」 없음`)
    }
    //  ★결제 시트에서 지운 그 줄
    const haerak = strip(R('app/manseryeok/haerak-input/page.tsx'))
    ok(!/교재 원문 그대로의 풀이/.test(haerak),
      '🔴 ★「교재 원문 그대로의 풀이」 를 지웠습니다 [대표님]')
    ok(/상반기·하반기 두 괘/.test(haerak) && /나에게 움직이는 자리/.test(haerak),
      '★남은 두 줄은 그대로입니다')

    /*  ⚠️ ★상담사·연재쌤 화면은 «그대로» 여야 합니다 —
     *    거기서까지 지우면 «출전이 어디인지» 를 잃습니다 (9부 ⑩). */
    ok(/교재 원문 그대로/.test(R('app/manseryeok/consultant/components/SomuReading.tsx')),
      '⛔ ★상담사 화면의 「교재 원문 그대로」 는 «남겨» 둡니다 (출전 밝히기)')
  }

  /* ══ ⑨ 🔴🔴 심사용 이메일 로그인 문 ══════════════════════════════
   *  [대표님 2026-09-21] 「심사관만 들어오게 이메일 로그인을 하나만 만들어주자」
   *                      「관리자 화면에 토글을 만들고 열었다 닫았다 하게」
   *
   *  [까닭]  토스 계약 메일 — 「★소셜 로그인 테스트 계정 사용 불가(카카오톡, 구글 등)」
   *         ⇒ 우리는 카카오뿐이라 심사관이 들어올 길이 «없습니다».
   * ════════════════════════════════════════════════════════════════ */
  head('⑨ 🔴🔴 심사용 이메일 로그인 문 [대표님]')
  {
    const page = R('app/login/review/page.tsx')
    const live = strip(page)
    const flags = R('lib/homeFlags.ts')
    const toggle = R('app/admin/components/HomeFlagToggle.tsx')
    const settings = R('app/admin/components/SiteSettings.tsx')

    //  ★낱말이 표에 있고, 못 읽으면 «닫힘» 인가
    ok(/reviewLogin: 'review_login'/.test(flags), '★낱말이 표에 있습니다')
    ok(/HOME_FLAGS_OFF: HomeFlags = \{[^}]*reviewLogin: false/.test(flags),
      '🔴 ⛔ ★못 읽으면 «닫힘» 입니다')
    ok(/reviewLogin: d\?\.reviewLogin === true/.test(flags),
      '⛔ ★«true 일 때만» 열립니다 (이상한 값이면 닫힘)')
    ok(/'reviewLogin'/.test(flags.slice(flags.indexOf('HOME_FLAG_LIST'))),
      '★목록에 들어 있습니다 (창구·검사가 함께 봅니다)')

    //  🔴 ⛔ ★손님 화면 어디에도 «걸려 있지 않은가» — 이것이 핵심입니다
    {
      const linked = [
        'app/home-new/page.tsx', 'app/login/page.tsx', 'app/mypage-new/page.tsx',
        'app/components/HomeBottomNav.tsx', 'app/home-new/components/ServiceSection.tsx',
        'app/landing/page.tsx',
      ].filter(f => strip(R(f)).includes('/login/review'))
      ok(linked.length === 0,
        `🔴🔴 ⛔ ★손님 화면에 이 문으로 가는 길이 «한 곳도» 없습니다 (${linked.length})`)
    }

    //  🔴 ★닫혀 있으면 «없는 화면» 처럼 — 칸도 단추도 안 그립니다
    ok(/if \(!open\) \{/.test(live) && /찾으시는 화면이 없어요/.test(live),
      '🔴 ⛔ ★닫히면 «없는 화면» 처럼 굽니다')
    ok(/fetchHomeFlags\(\)\.then\(f => \{ if \(alive\) setOpen\(f\.reviewLogin\) \}\)/.test(live),
      '★토글을 보고 열고 닫습니다')
    ok(/open === null/.test(live),
      '⚠️ ★읽는 동안은 빈 화면입니다 (문이 «깜빡» 열려 보이지 않게)')

    //  ⛔ 들어오는 길만 — 가입·비밀번호 찾기를 붙이지 않았는지
    ok(!/signUp|회원가입|비밀번호 찾기/.test(live),
      '⛔⛔ ★회원가입·비밀번호 찾기가 «없습니다» (들어오는 길만)')
    ok(/signInWithPassword/.test(live), '★이메일·비밀번호로 들어옵니다')
    //  ⛔ 무엇이 틀렸는지 «가려서» 말하는가 — 아이디가 있는지 알려 주면 안 됩니다
    ok(!/없는 이메일|가입되지 않은|비밀번호가 틀/.test(live),
      '⛔ ★무엇이 틀렸는지 «가려서» 말합니다')
    //  ⚠️ 카카오와 달리 callback 을 안 거치므로 profiles 를 «직접» 봅니다
    ok(/auth\/welcome/.test(live) && /from\('profiles'\)/.test(live),
      '⚠️ ★profiles 가 없으면 welcome 으로 보냅니다 (callback 을 안 거칩니다)')

    //  ★토글 — 부품을 «복사하지 않고» 낱말만 다르게 넘기는가
    ok(/flag="reviewLogin"/.test(strip(settings)),
      '🔴 ★사이트 설정에 토글이 있습니다 [대표님]')
    ok(/import HomeFlagToggle/.test(settings),
      '⛔ ★부품을 «복사하지» 않았습니다 (홈 토글과 같은 것)')
    ok(/reviewLogin: '심사용 이메일 로그인'/.test(toggle), '★토글 이름이 있습니다')
    //  🔴 켤 때 «반드시» 여쭙는가 — 열어 두고 잊으면 안 됩니다
    ok(/reviewLogin: '⚠️ PG 카드사/.test(toggle) && /반드시 «끄십시오»/.test(toggle),
      '🔴 ⛔ ★켤 때 「심사 끝나면 끄라」 고 여쭙니다')
    //  ⚠️ 「홈 카드를 보이게 할까요」 가 아니라 «문을 열까요» 로 묻는가
    ok(/flag === 'reviewLogin'/.test(toggle),
      '⚠️ ★묻는 말이 «문» 에 맞습니다 (홈 카드가 아닙니다)')

    /*  🔴🔴 ★2026-09-21 — 낱말을 더하면 «창구가 둘» 입니다.
     *    ⚠️ 저는 «읽는» 창구만 고치고 ★«쓰는» 창구를 빠뜨렸습니다.
     *       ⇒ 대표님 화면에 ★「저장 실패: 켜기/끄기 값이 이상해요」 가 떴습니다.
     *    ⇒ 이제 ★둘 다 «낱말을 돌면서» 찾는지 봅니다. 붙박이로 적으면 멈춥니다. */
    {
      const wr = R('app/api/admin/home-flags/route.ts')
      ok(/HOME_FLAG_LIST\.find\(k => typeof body\[k\] === 'boolean'\)/.test(wr),
        '🔴🔴 ★«쓰는» 창구가 낱말을 «돌면서» 찾습니다 (붙박이 아님)')
      ok(!/body\.examLuck === 'boolean' \? 'examLuck'/.test(wr),
        '⛔ ★낱말 이름을 «붙박이» 로 적지 않았습니다')
      const rd = R('app/api/home-flags/route.ts')
      ok(/HOME_FLAG_KEYS\.reviewLogin/.test(rd),
        '⛔ ★«읽는» 창구도 새 낱말을 읽습니다')
    }

    /*  ⚠️ ★토글 밑 설명이 낱말마다 «다른가» —
     *    붙박이로 두었다가 심사용 문에 「홈 카드 · 보관함 · 가격 표 줄」 이
     *    ★그대로 따라와 엉뚱한 말이 되었습니다 (대표님 화면에서 확인). */
    ok(/const SUB: Record<HomeFlagKey, string>/.test(toggle)
      && /reviewLogin: '\/login\/review 화면을 열고 닫습니다'/.test(toggle),
      '⚠️ ★토글 밑 설명이 낱말마다 다릅니다 (홈 카드 말이 안 따라옵니다)')
    ok(/knobOn \? '열림' : '닫힘'/.test(toggle),
      "⚠️ ★심사용 문은 «열림/닫힘» 으로 말합니다 (보임/숨김이 아닙니다)")

    /*  ⛔ ★onlyWhen(가격 표)에는 이 낱말을 못 쓰게 좁혀 두었는가 —
     *    홈 카드가 아니므로 가격 줄을 여닫는 데 쓰이면 안 됩니다. */
    ok(/type CardFlag = Extract<HomeFlagKey, 'examLuck' \| 'haerak'>/
      .test(R('app/admin/components/PriceManager.tsx')),
      "⛔ ★가격 표에는 이 낱말을 «못» 씁니다 (홈 카드 둘로 좁힘)")
  }

  /* ══ ⑩ 🔴 회원 지갑 — «누구 지갑인지» 보입니다 ═══════════════════
   *  [대표님 2026-09-21] 「회원관리에서 회원이름을 클릭하면
   *                       이 화면에 회원이름이 나와야 되는데 없어서 헷갈리네」
   *
   *  [까닭]  창구가 ★email 을 «안» 주어 memberName 이 마지막 '회원' 까지 내려갔습니다.
   *    ⇒ 🔴 누구 지갑인지 모르면 ★«남의 지갑에 충전» 할 수 있습니다. 위험한 자리였습니다.
   *  ⚠️ 👥 회원 목록 탭은 ★이미 email 을 보여 주고 있었습니다 — 🪙 지갑 탭만 빠졌습니다.
   * ════════════════════════════════════════════════════════════════ */
  head('⑩ 🔴 회원 지갑 — «누구 지갑인지» [대표님]')
  {
    const api = R('app/api/admin/wallet/member/route.ts')
    const ui = strip(R('app/admin/components/WalletMember.tsx'))

    //  ★창구가 «두 길» 다 email 을 주는가 — 하나만 고치면 목록과 상세가 갈립니다
    const sels = api.match(/\.from\('profiles'\)\.select\('([^']+)'\)/g) ?? []
    ok(sels.length >= 2 && sels.every(x => x.includes('email')),
      `🔴 ★창구의 «두 길»(하나 보기·찾기)이 다 email 을 줍니다 (${sels.length})`)
    ok(/email\.ilike/.test(api),
      '★이메일로도 «찾을» 수 있습니다 (카카오가 아닌 분은 이름이 없습니다)')

    //  ★화면이 그 값을 «그리는가» — 받아만 두면 소용없습니다
    ok(/email: string \| null/.test(ui), '★화면이 email 칸을 받습니다')
    ok(/picked\.email \?\? '회원번호 ' \+ picked\.id\.slice\(0, 8\)/.test(ui),
      '🔴 ⛔ ★지갑 카드에 «누구인지» 를 그립니다 (없으면 회원번호 앞자리)')
    ok(/m\.email \?\? '회원번호 ' \+ m\.id\.slice\(0, 8\)/.test(ui),
      '★찾기 «목록» 에도 그립니다 (닉네임이 같은 분이 둘일 수 있습니다)')
    //  ⛔ 이름을 «크게» — 작은 회색 한 줄이라 대표님이 못 보셨습니다
    ok(/text-base font-bold[\s\S]{0,120}memberName\(picked\)/.test(ui),
      '⛔ ★이름을 «크게» 그립니다 (작은 회색 글씨로 되돌리지 마십시오)')
    /*  🔴🔴 ★2026-09-21 — profiles.email 이 «비어» 있는 분이 있습니다.
     *    ⚠️ 그 칸을 채우는 곳은 ★/auth/welcome «한 곳» 뿐인데,
     *       profiles 줄이 «이미 있는» 분은 welcome 을 안 거쳐 ★영영 빕니다.
     *       ⇒ 대표님 화면에 ★「회원 · 회원번호 d498454e」 로만 떴습니다.
     *    ⇒ ★auth.users 가 «늘 맞는 값» 입니다. 비었으면 거기서 가져옵니다. */
    ok(/async function fillEmail/.test(api) && /auth\.admin\.getUserById/.test(api),
      '🔴🔴 ★email 이 비면 auth 에서 «채워» 옵니다 (profiles 만 믿지 않습니다)')
    ok(/const \[pf\] = await fillEmail/.test(api) && /const rows = await fillEmail/.test(api),
      '⛔ ★«두 길»(하나 보기·찾기)에 다 붙였습니다')
    ok(!/from\('profiles'\)[\s\S]{0,200}update\(/.test(api),
      '⛔ ★읽어서 «보여 주기만» 합니다 (손님 자료를 되써 넣지 않습니다)')
    //  ⛔ profiles 만 훑으면 «못 찾는 분» 이 있습니다 — auth 쪽에서도 찾는가
    ok(/auth\.admin\.listUsers/.test(api),
      '🔴 ★auth 쪽에서도 «이메일로 찾습니다» (email 이 빈 분도 찾힙니다)')

    //  ⛔ memberName 을 안 거치고 칸을 «직접» 쓰지 않았는지
    ok(!/\{picked\.nickname\}|\{m\.nickname\}/.test(ui),
      '⛔ ★memberName 을 거칩니다 (칸을 직접 쓰면 사람이 «사라집니다»)')
  }

  /* ══ ⑪ 🔴 상담사 관리 — 탭 셋 [대표님 2026-09-21] ═══════════════
   *  「상담사관리 + 상담사등록(별도 탭) + 정산관리 로 변경해줄래… 너무 헷갈려」
   *  「상담사 몇 명을 안 둘 거니 그렇게 복잡하게 안 해도 될 듯」
   *    ⇒ ★이름을 치게 하는 확인은 «안» 넣었습니다. 확인 한 번이면 됩니다.
   * ════════════════════════════════════════════════════════════════ */
  head('⑪ 🔴 상담사 관리 — 탭 셋 [대표님]')
  {
    const hub = strip(R('app/admin/components/ConsultantHub.tsx'))
    const mgr = R('app/admin/components/ConsultantManager.tsx')
    const mgrLive = strip(mgr)
    const tbl = strip(R('app/admin/components/ConsultantTable.tsx'))

    //  ★탭 셋
    ok(/'consultant' \| 'form' \| 'settlement'/.test(hub), '🔴 ★탭이 «셋» 입니다 [대표님]')
    ok(/➕ 상담사 등록/.test(hub), '★「➕ 상담사 등록」 탭이 있습니다')
    ok(/👤 상담사 관리/.test(hub) && /💰 정산 관리/.test(hub),
      '⛔ ★옛 탭 둘은 «그대로» 입니다 (낱말을 바꾸면 다른 화면이 깨집니다)')

    //  🔴 ★[수정] 이 «탭을 옮기는가» — 이것이 없으면 아무 일도 안 일어나 보입니다
    ok(/onEdit=\{\(\) => \{ setEditSeq\(n => n \+ 1\); setInner\('form'\) \}\}/.test(hub),
      '🔴 ★[수정] 을 누르면 «등록» 탭으로 넘어갑니다')
    ok(/editSeq !== tookSeq/.test(mgrLive),
      '⚠️ ★같은 분을 «다시» 눌러도 폼이 채워집니다 (숫자를 올려 셉니다)')
    ok(/pickedRef\.current = c/.test(mgrLive) && /pickedRef\.current = null/.test(mgrLive),
      '★[수정] 은 그 사람을, [＋등록] 은 «빈 폼» 을 엽니다')

    //  🔴🔴 ★저장·삭제가 «됐을 때만» 목록으로 — 실패했는데 넘어가면 적은 것이 사라집니다
    ok(/async function handleSave\(\): Promise<boolean>/.test(mgr),
      '🔴 ★저장이 «됐는지» 를 돌려줍니다')
    ok(/async function handleDelete\(id: string\): Promise<boolean>/.test(mgr),
      '🔴 ★삭제가 «됐는지» 를 돌려줍니다')
    ok(/if \(await handleSave\(\)\) onDone\?\.\(\)/.test(mgrLive),
      '🔴🔴 ⛔ ★저장이 «됐을 때만» 목록으로 갑니다 (실패하면 머뭅니다)')
    ok(/if \(await handleDelete\(form\.id!\)\) onDone\?\.\(\)/.test(mgrLive),
      '🔴🔴 ⛔ ★삭제가 «됐을 때만» 목록으로 갑니다 (막히면 까닭을 보십니다)')

    /*  🔴 ★목록 «줄» 에서 바로 수정할 수 있는가 — 2026-09-21
     *    ⚠️ 전에는 ★이름을 «눌러 펼쳐야» [수정] 이 나왔습니다.
     *       ⇒ 삭제가 «등록» 탭으로 간 지금은, [수정] 을 못 찾으면
     *         ★삭제로 가는 길도 «막힙니다». (대표님 화면에서 확인)
     *    ⇒ ★「화면」 칸 옆에 «수정» 칸을 두었습니다. */
    ok(/<span style=\{\{ width: 58, textAlign: 'center' \}\}>수정<\/span>/.test(tbl),
      '🔴 ★목록에 «수정» 칸이 있습니다 (펼치지 않아도 보입니다)')
    ok((tbl.match(/✏️ 수정/g) ?? []).length === 2,
      '★목록 줄과 «펼친 상세» 둘 다에서 수정할 수 있습니다')

    //  ⛔ 삭제는 «등록/수정» 탭 맨 아래에 «하나» 뿐인가
    ok(!/onDelete/.test(tbl), '⛔⛔ ★목록 줄에 삭제가 «없습니다» [대표님]')
    ok(/handleDelete\(form\.id!\)/.test(mgrLive) && /editing && form\.id/.test(mgrLive),
      '⛔ ★삭제는 «수정할 때» 만 보입니다 (새로 등록 중에는 지울 것이 없습니다)')
    ok(/비활/.test(mgrLive),
      '⚠️ ★막히면 «비활» 을 권합니다 (지우는 것과 같은 효과 · 기록은 지킴)')

    //  ⚠️ 「진행중 예약」 은 «있을 때만»
    ok(!/진행중 예약<\/span>/.test(tbl), '⚠️ ★「진행중 예약」 «칸» 을 뺐습니다 [대표님]')
    ok(/if \(!p \|\| p\.count === 0\) return null/.test(tbl),
      '⛔ ★예약이 «있을 때만» 표시가 뜹니다 (삭제가 왜 막히는지 알 수 있게)')

    //  ⚠️ 한 화면에 «한 가지» 만 — 목록과 폼을 함께 그리지 않는가
    ok(/view === 'list' &&/.test(mgrLive) && /view === 'form' &&/.test(mgrLive),
      '🔴 ★목록과 폼을 «함께» 그리지 않습니다 (한 번에 한 가지)')
  }

  /* ══ ⑫ 🔴🔴 전문분야 표 — 서비스와 «짝이 맞는가» ═══════════════
   *  [대표님 2026-09-21] 「하락이수 버튼이 없는 것 같네?」
   *
   *  ⚠️ 새 서비스를 만들면서 ★SERVICE_SPECIALTIES 를 «안» 고쳤습니다 —
   *     합격운(6·7부) · 하락이수(8부) 둘이 ★빠져 있었습니다.
   *  ⇒ 🔴 그 둘은 상담사를 «한 명도» 지정할 수 없어,
   *    손님이 [상담 신청하기] 를 누르면 ★「상담 가능한 상담사가 없습니다」.
   *  ⇒ ⛔ PG 심사관이 그 화면을 보면 ★반려 사유입니다.
   *
   *  ⇒ ★이제 «가격 표(PAIRS)» 와 «전문분야 표» 를 대조합니다.
   *    ⛔ 새 서비스를 넣고 한쪽만 고치면 «멈춥니다».
   * ════════════════════════════════════════════════════════════════ */
  head('⑫ 🔴🔴 전문분야 표 = 서비스 열둘 [대표님]')
  {
    const cd = R('app/admin/components/consultantData.ts')
    const spec = [...liveOf(cd).matchAll(/\{ key: '([a-z_]+)',/g)].map(m => m[1])
    const pm = R('app/admin/components/PriceManager.tsx')
    const blk = liveOf(pm.slice(pm.indexOf('const PAIRS'), pm.indexOf('\n]', pm.indexOf('const PAIRS'))))
    const consults = [...blk.matchAll(/consult: '([a-z_]+)'/g)].map(m => m[1])

    ok(spec.length === 12, `🔴 ★전문분야가 «열둘» 입니다 (${spec.length})`)
    ok(spec.includes('haerak'), '🔴 ★「하락이수」 가 있습니다 [대표님이 찾아내신 것]')
    ok(spec.includes('examluck'), '🔴 ★「합격·취업·승진」 도 있습니다 (함께 빠져 있었습니다)')
    ok(JSON.stringify([...spec].sort()) === JSON.stringify([...consults].sort()),
      `🔴🔴 ★가격 표와 «한 낱말도» 안 다릅니다 (전문분야 ${spec.length} ↔ 가격 ${consults.length})`)

    /*  🔴 ⛔ ★상담 단추가 붙은 화면은 «반드시» 이 표에 있어야 합니다 —
     *    단추만 있고 표에 없으면 ★「상담 가능한 상담사가 없습니다」 가 뜹니다. */
    const files = [
      'app/manseryeok/haerak-result/page.tsx',
      'app/manseryeok/exam-luck-result/components/ExamResultShell.tsx',
    ]
    for (const f of files) {
      const m = strip(R(f)).match(/priceKey="([a-z_]+)"/)
      ok(!!m && spec.includes(m[1]),
        `⛔ ★${f.split('/').slice(-1)[0]} 의 상담 단추(${m?.[1]})가 표에 있습니다`)
    }
  }

  /* ══ ⑬ 🔴 큐보드·골프온 바로가기 — 심사 동안 숨김 ═══════════════
   *  [대표님 2026-09-22] 「골프온과 큐보드는 우선 승인 전까지 숨겼다가
   *                       승인 후 추가하는 걸로 하자」
   *
   *  [까닭]  누르면 ★cue.myjae.kr · golf.myjae.kr 로 «떠납니다».
   *    ⇒ PG 심사관이 ★심사 대상이 «아닌» 도메인을 봅니다.
   *    ⇒ 그쪽은 사업자정보가 «한 곳» 뿐이고,
   *      골프온에는 ★「200원이 빠집니다」 가 «실제와 다르게» 적혀 있습니다
   *      (골프온 회신 2026-09-22 — 47-read 166·182줄 · 실제로는 안 빠짐).
   * ════════════════════════════════════════════════════════════════ */
  head('⑬ 🔴 큐보드·골프온 바로가기 — 토글 [대표님]')
  {
    const flags = R('lib/homeFlags.ts')
    const home = strip(R('app/home-new/page.tsx'))
    const st = strip(R('app/admin/components/SiteSettings.tsx'))
    const tg = R('app/admin/components/HomeFlagToggle.tsx')

    ok(/sisterLinks: 'sister_links'/.test(flags), '★낱말이 표에 있습니다')
    ok(/sisterLinks: false/.test(flags), '🔴 ⛔ ★기본값이 «숨김» 입니다')
    ok(/sisterLinks: d\?\.sisterLinks === true/.test(flags),
      '⛔ ★«true 일 때만» 보입니다 (못 읽으면 숨김)')
    ok(/'sisterLinks'/.test(flags.slice(flags.indexOf('HOME_FLAG_LIST'))),
      '★목록에 들어 있습니다 (두 창구가 함께 봅니다)')

    //  🔴 ★홈이 «그 값을 보고» 그리는가 — 낱말만 더하면 소용없습니다
    ok(/\{flags\.sisterLinks && <SisterLinks \/>\}/.test(home),
      '🔴🔴 ★홈이 토글을 보고 «그립니다» (끄면 줄이 사라집니다)')
    ok(!/^\s*<SisterLinks \/>\s*$/m.test(home),
      '⛔ ★조건 없이 그리던 옛 모양이 «남아 있지 않습니다»')

    //  ★읽는 창구도 함께 (9부 ⑥ · 10부에 두 번 밟은 자리)
    ok(/HOME_FLAG_KEYS\.sisterLinks/.test(R('app/api/home-flags/route.ts')),
      '⛔ ★«읽는» 창구가 새 낱말도 읽습니다')

    //  ★관리 화면 토글 — 부품을 복사하지 않았는가
    ok(/flag="sisterLinks"/.test(st), '🔴 ★사이트 설정에 토글이 있습니다')
    ok(/sisterLinks: '큐보드·골프온 바로가기'/.test(tg), '★토글 이름이 있습니다')
    ok(/sisterLinks: '⚠️ 누르면/.test(tg) && /심사 «중» 에는 켜지 마십시오/.test(tg),
      '🔴 ⛔ ★켤 때 「심사 중에는 켜지 마라」 고 여쭙습니다')
    ok(/flag === 'sisterLinks'/.test(tg),
      '⚠️ ★묻는 말이 «줄» 에 맞습니다 (카드도 문도 아닙니다)')
    ok(/sisterLinks: '홈 맨 아래 「함께 쓰는 서비스」 줄'/.test(tg),
      '⚠️ ★토글 밑 설명이 «이 줄» 을 가리킵니다')
  }

  /* ══ ⑭ 🔴🔴 토스 결제 — 충전(지갑에 «넣는» 길) ═══════════════════
   *  ★2026-09-22 (10부) 신설.
   *
   *  ⚠️ 지금까지 지갑은 ★«빼는» 것만 있었습니다. «넣는» 길은
   *     관리자가 손으로 [+5천] 을 누르는 것뿐이었습니다.
   *
   *  🔴🔴 돈이 오가는 자리라 ★지켜야 할 것이 셋입니다 —
   *     ① 시크릿 키가 ★화면에 «없어야» 합니다
   *     ② 금액은 ★토스가 «돌려준» 값만 써야 합니다 (손님이 보낸 값 ❌)
   *     ③ 새로고침해도 ★«두 번» 안 들어가야 합니다
   * ════════════════════════════════════════════════════════════════ */
  head('⑭ 🔴🔴 토스 결제 — 충전')
  {
    const pay = R('app/wallet/charge/page.tsx')
    const payLive = strip(pay)
    const api = R('app/api/toss/confirm/route.ts')
    const apiLive = strip(api)
    const done = strip(R('app/wallet/charge/done/page.tsx'))
    const panel = strip(R('app/components/common/WalletPanel.tsx'))

    /*  🔴🔴 ① 시크릿 키가 화면에 «없는가» — 가장 위험한 자리 */
    /*  ⚠️ ★주석을 걷어내고 봅니다 — 주석에 «시크릿 키를 적지 말라» 는
     *     경고문이 있어서, 그것까지 세면 ★«헛 실패» 가 납니다. */
    ok(!/gsk_|sk_live|_sk_/.test(payLive),
      '🔴🔴 ⛔ ★충전 화면에 «시크릿 키» 가 없습니다 (손님에게 드러나면 안 됩니다)')
    ok(/test_gck_/.test(pay),
      '★클라이언트 키는 «주문서형»(gck)입니다 (구버전 ck 와 섞으면 오류)')
    ok(/process\.env\.TOSS_SECRET_KEY/.test(api),
      '⛔ ★시크릿 키는 «서버» 에서만 읽습니다')
    ok(!/TOSS_SECRET_KEY/.test(payLive),
      '⛔ ★화면 코드가 시크릿 키를 «쳐다보지도» 않습니다')

    /*  🔴🔴 ② 금액을 «토스가 돌려준 값» 으로 쓰는가
     *    손님이 100원 내고 「10만원 넣어 달라」 고 보낼 수 있습니다. */
    ok(/const won = Number\(paid\.totalAmount\)/.test(apiLive),
      '🔴🔴 ⛔ ★토스가 «돌려준» 금액만 씁니다 (손님이 보낸 값이 아닙니다)')
    ok(/p_amount: won/.test(apiLive),
      '⛔ ★지갑에 넣는 값도 «그 금액» 입니다')

    /*  🔴 ③ 새로고침해도 두 번 안 들어가는가 */
    ok(/\.eq\('memo', orderId\)/.test(apiLive) && /already/.test(apiLive),
      '🔴 ⛔ ★이미 넣은 결제면 «다시 안» 넣습니다 (새로고침 두 번 방지)')
    ok(/'Idempotency-Key': orderId/.test(apiLive),
      '★토스에도 «멱등키» 를 보냅니다 (같은 승인이 두 번 안 가게)')
    ok(/sent\.current/.test(done),
      '★성공 화면도 승인을 «한 번만» 부릅니다')

    /*  ⛔ 누구의 지갑인가 — 화면이 보낸 user_id 를 믿지 않는가 */
    ok(/auth\.user\?\.id/.test(apiLive) && !/body\.userId|body\.user_id/.test(apiLive),
      '⛔⛔ ★로그인한 «그 사람» 의 지갑에만 넣습니다 (화면 값을 안 믿습니다)')
    //  ⛔ 지갑은 wallet_charge 로만 — 표를 직접 고치면 조용히 0줄이 바뀝니다
    ok(/rpc\('wallet_charge'/.test(apiLive) && !/from\('mc_wallet'\)/.test(apiLive),
      '⛔ ★wallet_charge 로 넣습니다 (mc_wallet 을 직접 고치지 않습니다)')

    /*  ⚠️ 돈은 빠졌는데 «안 들어간» 경우 — 성공이라 하지 않는가 */
    ok(/승인됐으나 충전 실패/.test(api) && /고객센터로 알려/.test(apiLive),
      '🔴 ⛔ ★넣기에 실패하면 «성공» 이라 하지 않습니다 (사실대로 알립니다)')

    /*  ⚠️ 충전 금액 — 대표님이 정하신 표를 «그대로» 쓰는가 */
    ok(/CHARGE_AMOUNTS/.test(payLive) && !/\[5000, 10000/.test(pay),
      '⛔ ★금액을 «다시 적지» 않았습니다 (CHARGE_AMOUNTS 한 곳 · 대표님 2026-09-08)')

    /*  🔴 충전 단추가 «실제로» 이어졌는가 — 옛 알림으로 되돌아가지 않았는지 */
    ok(/window\.location\.href = '\/wallet\/charge'/.test(panel),
      "🔴 ★[충전하기] 가 «충전 화면» 으로 갑니다")
    ok(!/충전 기능을 준비하고 있어요/.test(panel),
      '⛔ ★「준비하고 있어요」 알림으로 되돌아가지 않았습니다')

    /*  ⚠️ 충전은 «물건» 이 아닙니다 — 청약철회 문구가 달라야 합니다 */
    ok(/충전일로부터 7일/.test(payLive),
      '⚠️ ★충전은 «7일 내 청약철회» 입니다 (약관 제8조 1항)')
    ok(!/결과를 확인하신 뒤에는/.test(payLive),
      '⛔ ★AI 콘텐츠용 문구를 «가져다 쓰지» 않았습니다 (물건이 아닙니다)')

    /*  ══ 🔴🔴 ④ 결제수단을 «두 번» 그리지 않는가 ════════════════════
     *  [대표님 2026-09-22] 「카드는 여기서 막히네」
     *    금액 단추(10만원)를 누르면 ★「결제 수단을 불러오지 못했어요」 가 뜨고
     *    [충전하기] 가 ★«영영» 안 켜졌습니다.
     *  [까닭] 토스는 ★한 페이지에 결제 UI 를 «두 번» 못 그립니다 —
     *    두 번째 render 는 PaymentMethodsWidgetAlreadyRenderedError 로 «던집니다»
     *    (tosspayments-sdk/types/index.d.ts:528 · 약관은 561).
     *    ⇒ 그리는 effect 가 ★amount 를 목록에 달고 있어, 금액이 바뀔 때마다
     *      다시 그렸고, catch 로 빠져 ready 가 «안» 켜졌습니다.
     *  ⛔ ★낱말을 못 박지 않고 «effect 를 갈라» 그 «목록» 을 봅니다.
     * ══════════════════════════════════════════════════════════════ */
    const effects = payLive.split('useEffect(').slice(1)
    const depsOf = (b: string) => (b.match(/\},\s*\[([^\]]*)\]\s*\)/) || [])[1] ?? ''
    const drawBlk = effects.find(b => /renderPaymentMethods/.test(b)) ?? ''
    const amtBlk = effects.find(b => /setAmount/.test(b) && !/renderPaymentMethods/.test(b)) ?? ''

    ok(drawBlk !== '',
      '★결제수단을 «그리는» 자리가 있습니다 (renderPaymentMethods)')
    ok(drawBlk !== '' && !/\bamount\b/.test(depsOf(drawBlk)),
      '🔴🔴 ⛔ ★그리는 effect 가 «amount 를 안 봅니다» (다시 그리면 토스가 던집니다)')
    /*  ⚠️ ★«있는지» 만 보면 안 됩니다 — 처음 만들 때 그렇게 했다가
     *     자물쇠를 통째로 빼도 ★통과했습니다 (catch 의 «풀어 주는» 줄만 남아서).
     *     ⇒ ★«막는 자리»(되돌아가는 줄)와 «거는 자리» 를 «따로» 봅니다. */
    ok(/if \([^)]*drawn\.current[^)]*\)\s*return/.test(drawBlk) && /drawn\.current = true/.test(drawBlk),
      '🔴 ⛔ ★한 번만 그리게 «자물쇠(ref)» 로 «되돌아갑니다» (setState 는 곧바로 안 바뀝니다)')
    ok(amtBlk !== '' && /\bamount\b/.test(depsOf(amtBlk)),
      '🔴 ★금액이 바뀌면 «setAmount 만» 부르는 자리가 «따로» 있습니다')
    ok(!/setReady\(false\)/.test(payLive),
      '⛔ ★금액을 고를 때 ready 를 «내리지» 않습니다 ([충전하기] 가 영영 안 켜집니다)')

    /*  ⚠️ 바꾸자마자 누르면 «옛 금액» 이 갈 수 있습니다 — 직전에 한 번 더 알립니다 */
    const payFn = (payLive.match(/async function pay\(\)[\s\S]*?requestPayment/) || [''])[0]
    ok(/setAmount/.test(payFn),
      '🔴 ⛔ ★결제 «직전» 에 금액을 한 번 더 알려 줍니다 («옛 금액» 결제를 막습니다)')
  }

  /* ══ ⑮ 🔴🔴 «값을 받는가» — 결제 시트 = 실제 차감 ═══════════════
   *  [대표님 2026-09-22]
   *    「사주그림을 누르면 10,000원이 결제되어야 하고 상담사 연결은 80,000원이
   *      따로 결제되어야 하는데 80,000원만 결제되네… 뭔가 이상해」
   *    「모두 철저히 점검해」
   *
   *  [무엇이 있었나]  ★결제 시트는 «열셋» 이 띄우는데 «실제로 빼는» 곳은 ★«셋» 뿐이었습니다.
   *     · 시트는 ★«잔액이 되는지» 만 봅니다 (wallet_check)
   *     · 실제로 빼는 것(wallet_use)은 ★«결과를 만드는 화면» 이 해야 합니다
   *     ⇒ ★열한 갈래가 «돈을 안 받고» 나가고 있었습니다.
   *     ⇒ ⛔ PG 심사에도 걸립니다 — 「적힌 값과 실제가 다르다」.
   *
   *  ⇒ ★이제 «시트를 띄우는 화면» 마다 «빼는 곳» 이 있는지 봅니다.
   *  ⛔ 새 서비스를 넣고 시트만 띄우면 ★멈춥니다.
   * ════════════════════════════════════════════════════════════════ */
  head('⑮ 🔴🔴 값을 «받는가» — 열두 갈래 [대표님]')
  {
    /*  ★「시트를 띄우는 화면」 ↔ 「실제로 빼는 화면」 짝.
     *  ⚠️ 시트와 차감이 ★«다른 화면» 인 것이 많습니다 —
     *     시트는 «입력» 화면, 차감은 «결과» 화면이기 때문입니다. */
    const PAIRS_PAY: { name: string; file: string; item: string }[] = [
      { name: '내사주그림',        file: 'app/manseryeok/mulsang/page.tsx',                              item: 'mulsang_ai' },
      { name: '타로',              file: 'app/tarot/page.tsx',                                           item: 'tarot_ai' },
      { name: '내 사주와 운세보기', file: 'app/manseryeok/result-new/page.tsx',                           item: 'saju_deep' },
      { name: '진로적성',          file: 'app/manseryeok/career-result/page.tsx',                         item: 'career_ai' },
      { name: '궁합',              file: 'app/manseryeok/couple-result-new/page.tsx',                     item: 'couple_ai' },
      { name: '하락이수',          file: 'app/manseryeok/haerak-result/page.tsx',                         item: 'haerak_ai' },
      { name: '결혼택일 찾기',      file: 'app/manseryeok/wedding-timing/find/page.tsx',                   item: 'wedding_pick' },
      { name: '결혼택일 보기',      file: 'app/manseryeok/wedding-timing/check/page.tsx',                  item: 'wedding_check' },
      { name: '출산택일',          file: 'app/manseryeok/birth-timing/page.tsx',                          item: 'birth_pick' },
      { name: '이사택일 찾기',      file: 'app/manseryeok/moving-timing/find/page.tsx',                    item: 'moving_pick' },
      { name: '이사택일 보기',      file: 'app/manseryeok/moving-timing/check/page.tsx',                   item: 'moving_check' },
      { name: '작명(정밀·아기)',    file: 'app/manseryeok/naming/rename/newhanja/page.tsx',                item: 'naming_hanja' },
    ]
    for (const q of PAIRS_PAY) {
      const live = strip(R(q.file))
      ok(new RegExp(`(payFee|useAiFee)\\(\\s*['\`]?${q.item}`).test(live)
        || live.includes(q.item),
        `🔴 ★${q.name} — 값을 «뺍니다» (${q.item})`)
    }

    //  ★합격운은 낱말이 셋으로 갈립니다 — examPriceKey 가 골라 줍니다
    {
      const shell = strip(R('app/manseryeok/exam-luck-result/components/ExamResultShell.tsx'))
      ok(/examPriceKey\(want\)/.test(shell) && /payFee\(item/.test(shell),
        '🔴 ★합격·취업·승진 — 값을 «뺍니다» (examPriceKey 가 낱말을 고릅니다)')
      ok(/EXAM_PRICE_KEYS\.promo/.test(shell),
        '⛔ ★낱말을 «붙박이» 로 적지 않았습니다 (셋으로 갈립니다)')
    }

    /*  🔴🔴 ★AI 를 부르는 갈래는 «실패하면 되돌려야» 합니다 —
     *    「돈은 빠졌는데 못 봤다」 가 «가장 나쁩니다».
     *  ⚠️ 택일·작명은 ★AI 를 «안» 부릅니다 ⇒ 되돌릴 자리가 «없습니다». 여기서 뺍니다. */
    const AI_FILES = [
      'app/manseryeok/mulsang/page.tsx',
      'app/tarot/page.tsx',
      'app/manseryeok/result-new/page.tsx',
      'app/manseryeok/career-result/page.tsx',
      'app/manseryeok/couple-result-new/page.tsx',
      'app/manseryeok/haerak-result/page.tsx',
      'app/manseryeok/exam-luck-result/components/ExamResultShell.tsx',
    ]
    for (const f of AI_FILES) {
      ok(/refundAiFee/.test(strip(R(f))),
        `🔴 ⛔ ★${f.split('/').slice(-2)[0]} — 실패하면 «되돌립니다»`)
    }

    /*  🔴🔴 ★사주그림 — «둘째 그림» 이 저장되는가  2026-09-22 (10부)
     *  [대표님]  「동일한 사주로 다른 종류의 그림을 두 번 저장하면 하나밖에 안 된다」
     *
     *  [까닭]  handleSaveRecord 가 ★saveState 로 «두 번 저장» 을 막았는데,
     *     React 의 setState 는 ★«곧바로» 안 바뀝니다.
     *     ⇒ setSaveState('idle') 을 불러도 «같은 회차» 에서는 아직 'saved' 라
     *       ★둘째 그림이 «그냥 빠져나갔습니다».
     *  ⇒ ★ref 로 막습니다 — ref 는 «곧바로» 바뀝니다.
     *  ⛔ saveState 로 되돌리지 마십시오. */
    {
      const ms = strip(R('app/manseryeok/mulsang/page.tsx'))
      ok(/if \(savingRef\.current \|\| !info \|\| !url\) return/.test(ms),
        '🔴🔴 ★사주그림 — «ref» 로 막습니다 (둘째 그림이 저장됩니다)')
      ok(!/if \(saveState !== 'idle' \|\| !info/.test(ms),
        "⛔ ★saveState 로 막던 옛 모양이 «없습니다» (곧바로 안 바뀝니다)")
      ok(/savingRef\.current = false[\s\S]{0,80}setTongResult\(null\)/.test(ms),
        '⛔ ★새로 그릴 때 «자물쇠도 함께» 풉니다')
      ok(/if \(!res\.ok\) savingRef\.current = false/.test(ms),
        '⛔ ★저장에 실패하면 «다시 누를 수» 있게 풉니다')
    }

    /*  🔴🔴 ⛔ ★TongbyeonView «안» 에서 빼면 «안 됩니다» —
     *    그 부품은 ★사주·궁합·합격운이 «함께» 씁니다.
     *    궁합·합격운은 «밖에서» 빼므로 ★«두 번» 빠집니다. */
    ok(!/useAiFee|payFee\(/.test(strip(R('app/manseryeok/components/TongbyeonView.tsx'))),
      '🔴🔴 ⛔ ★공용 부품(TongbyeonView) «안» 에서 빼지 않습니다 (세 화면이 씁니다)')

    /*  ⛔ ★다시보기는 «안» 받습니다 — AI 를 안 부르기 때문입니다 [대표님].
     *    ⇒ 「저장된 것을 보는데 또 돈이 빠진다」 가 가장 나쁩니다. */
    ok(/if \(recordId && !retryRecord\) return/.test(strip(R('app/manseryeok/exam-luck-result/components/ExamResultShell.tsx'))),
      '⛔ ★합격운 다시보기는 «안» 받습니다')
    ok(/if \(interp && interpKey === key\)/.test(strip(R('app/tarot/page.tsx'))),
      '⛔ ★타로는 «이미 읽은 카드» 를 다시 안 받습니다')
    ok(/!recordId && !paidRef\.current/.test(strip(R('app/manseryeok/haerak-result/page.tsx'))),
      '⛔ ★하락이수 다시보기는 «안» 받습니다')
  }

  console.log(`\n━━ 홈 카드 가격 — 통과 ${pass} · 실패 ${fail} ━━\n`)
  if (fail > 0) process.exit(1)
}

main()
