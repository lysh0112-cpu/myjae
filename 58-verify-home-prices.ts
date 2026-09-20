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

    /*  ⚠️ ★«결제하는» 화면에서만 보입니다 —
     *    잔액이 모자라거나 오류일 때는 «충전하러 가는» 화면이라 안 보여 줍니다. */
    {
      const i = live.indexOf('결과를 확인하신 뒤에는')
      const blk = live.slice(Math.max(0, i - 200), i)
      ok(/state === 'ok' && !short/.test(blk),
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

  console.log(`\n━━ 홈 카드 가격 — 통과 ${pass} · 실패 ${fail} ━━\n`)
  if (fail > 0) process.exit(1)
}

main()
