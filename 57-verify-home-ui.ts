// ══════════════════════════════════════════════════════════════════════
//  57-verify-home-ui.ts — 홈 화면 마감  [대표님 2026-09-15 · 10부]
//
//  ┌───────────────────────────────────────────────────────────────┐
//  │  대표님이 홈 화면 사진 두 장을 보시고 ★넷을 짚어 주셨습니다 —   │
//  │    ① 전문가용 만세력 — 짙은 바탕에 대비 선명하게              │
//  │    ② 「함께 쓰는 서비스」 제목을 「전체 서비스」와 «완벽히» 통일 │
//  │    ③ 큐보드·골프온 카드 테두리를 다른 카드처럼 다듬기          │
//  │    ④ 하단바에서 「선생님 소개」 숨기기                          │
//  └───────────────────────────────────────────────────────────────┘
//
//  🔴 왜 그물이 필요한가 —
//     ②③ 은 ★«두 파일이 같은 값이라야» 지켜지는 것입니다.
//     주석에 「같게 두십시오」라고 적어 두는 것으로는 ★안 지켜집니다.
//     ⇒ 7부 0-1 「말로 막은 것은 안 지켜집니다」 · 9부 ⑥ 타로 크레디트와 같은 자리.
//     ⇒ 그래서 ★두 파일을 «대조» 합니다.
//
//  ⛔ 이 그물을 만들 때 지킨 것 (9부 교훈 ②) —
//     · ★주석을 걸러냅니다 (live) — 주석에 옛 값이 그대로 남아 있습니다
//     · ★«그리는» 자리를 봅니다 (선언·import 가 아니라)
//     · ★되살려 보았습니다 — 다섯 가지를 되돌려 다섯 번 다 잡혔습니다
// ══════════════════════════════════════════════════════════════════════

import { readFileSync } from 'fs'
import { join } from 'path'

const ROOT = process.cwd()
const R = (p: string) => readFileSync(join(ROOT, p), 'utf-8')

/** ⛔ ★주석 줄을 걷어냅니다 — 주석에 «옛 값» 이 그대로 적혀 있습니다 */
const liveOf = (src: string) =>
  src.split('\n').filter(l => !/^\s*(\/\/|\*|\/\*|\{\/\*)/.test(l)).join('\n')

let pass = 0
let fail = 0
const ok = (cond: boolean, msg: string) => {
  if (cond) { pass++; console.log(`  ✅ ${msg}`) }
  else { fail++; console.log(`  ❌ ${msg}`) }
}
const head = (t: string) => console.log(`\n━━ ${t} ━━`)

/**
 * ★어떤 낱말 뒤에 오는 style 값 하나를 «값으로» 뽑습니다.
 *  ⚠️ 정규식으로 «있는지» 만 보면 값이 바뀌어도 통과합니다 (9부에 여섯 번 겪음).
 */
function pick(src: string, anchor: string, key: string, span = 700): string | null {
  const i = src.indexOf(anchor)
  if (i < 0) return null
  const m = src.slice(i, i + span).match(new RegExp(`${key}:\\s*([^,\\n}]+)`))
  return m ? m[1].trim() : null
}

function main() {
  const homeSrc = R('app/home-new/page.tsx')
  const home = liveOf(homeSrc)
  const svcSrc = R('app/home-new/components/ServiceSection.tsx')
  const svc = liveOf(svcSrc)
  const sisSrc = R('app/components/common/SisterLinks.tsx')
  const sis = liveOf(sisSrc)
  const navSrc = R('app/components/HomeBottomNav.tsx')
  const nav = liveOf(navSrc)

  /* ══ ① 전문가용 만세력 — «짙은 바탕» ══════════════════════════════
   *  [대표님] 「짙은 바탕색(다크 톤)에 대비가 선명하고 가독성 좋은 글씨체/색상으로」
   *  ⛔ 크림 바탕(#FFFBF7)으로 되돌아가면 서비스 카드에 묻힙니다.
   * ════════════════════════════════════════════════════════════════ */
  head('① 🔴 전문가용 만세력 — 짙은 바탕 [대표님]')
  {
    const i = home.indexOf('/manseryeok/expert')
    ok(i > 0, '★전문가용 만세력 칸이 있습니다')

    const bg = pick(home, '/manseryeok/expert', 'background')
    ok(bg === "'#33281F'", `🔴 ★바탕이 «짙은» 색입니다 (${bg})`)
    ok(bg !== "'#FFFBF7'", '⛔ ★크림 바탕으로 되돌아가지 않았습니다')

    /*  🔴 ★대비를 «재서» 봅니다 — 「짙어 보인다」 가 아니라 값입니다.
     *    WCAG 상대휘도 · 본문 기준 4.5:1 */
    const lum = (hex: string) => {
      const v = [1, 3, 5].map(k => parseInt(hex.slice(k, k + 2), 16) / 255)
        .map(c => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
      return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]
    }
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p)
      return (x + 0.05) / (y + 0.05)
    }
    const r = ratio('#F6EDE2', '#33281F')
    ok(r >= 4.5, `🔴 ★글씨 대비가 본문 기준을 넘습니다 (${r.toFixed(2)}:1 · 기준 4.5)`)
    const rSub = ratio('#CBB9A6', '#33281F')
    ok(rSub >= 4.5, `★설명 줄도 기준을 넘습니다 (${rSub.toFixed(2)}:1)`)
    const rChev = ratio('#E8C58A', '#33281F')
    ok(rChev >= 3, `★화살표가 선 기준을 넘습니다 (${rChev.toFixed(2)}:1)`)

    //  ⛔ 45부에 걷어낸 0.5px 테두리로 돌아가지 않았는지
    const bd = pick(home, '/manseryeok/expert', 'border')
    ok(!!bd && !bd.includes('0.5px'), `⛔ ★0.5px 테두리가 아닙니다 (${bd})`)

    //  ★누를 수 있는 것은 button 이라야 합니다 (옛것은 div 였습니다)
    const blk = home.slice(Math.max(0, i - 600), i)
    ok(/<button/.test(blk), '⛔ ★div 가 아니라 «button» 입니다 (키보드·읽어주기)')
  }

  /* ══ ② 🔴🔴 제목 통일 — «두 파일이 같은 값» ═══════════════════════
   *  [대표님] 「폰트 사이즈와 색상을 «완벽하게» 동일하게」
   *  🔴 ★한쪽만 고치면 또 어긋납니다. 그래서 «대조» 합니다.
   * ════════════════════════════════════════════════════════════════ */
  head('② 🔴🔴 「함께 쓰는 서비스」 = 「전체 서비스」 [대표님]')
  {
    //  ★기준 — ServiceSection 의 「전체 서비스」
    const iAll = svc.indexOf('전체 서비스')
    ok(iAll > 0, '★기준이 되는 「전체 서비스」 제목이 있습니다')
    const allSpan = svc.slice(Math.max(0, iAll - 260), iAll)
    const allSize = allSpan.match(/fontSize:\s*([\d.]+)[^}]*fontWeight:\s*(\d+)/)
    ok(!!allSize, '★「전체 서비스」의 크기·굵기를 읽었습니다')

    //  ★맞춰야 할 쪽 — SisterLinks 의 「함께 쓰는 서비스」
    const iSis = sis.indexOf('함께 쓰는 서비스')
    ok(iSis > 0, '★「함께 쓰는 서비스」 제목이 있습니다')
    const sisSpan = sis.slice(Math.max(0, iSis - 260), iSis)
    const sisSize = sisSpan.match(/fontSize:\s*([\d.]+),\s*fontWeight:\s*(\d+)/)

    ok(!!allSize && !!sisSize && allSize[1] === sisSize[1],
      `🔴 ★글씨 크기가 «같습니다» (전체 ${allSize?.[1]} · 함께 ${sisSize?.[1]})`)
    ok(!!allSize && !!sisSize && allSize[2] === sisSize[2],
      `🔴 ★굵기가 «같습니다» (전체 ${allSize?.[2]} · 함께 ${sisSize?.[2]})`)

    //  🔴 ★색 — ServiceSection 은 C.sub, SisterLinks 는 C.head. «값» 을 견줍니다.
    const subVal = svcSrc.match(/sub:\s*'(#[0-9a-fA-F]{6})'/)?.[1]
    const headVal = sisSrc.match(/head:\s*'(#[0-9a-fA-F]{6})'/)?.[1]
    ok(!!subVal && subVal === headVal,
      `🔴🔴 ★색이 «한 값도» 안 다릅니다 (전체 ${subVal} · 함께 ${headVal})`)
    ok(headVal !== '#96502e', '⛔ ★옛 벽돌빛(#96502e)으로 되돌아가지 않았습니다')

    //  ★「전체 서비스」와 같은 얼개 — 아이콘 + gap 6 + 아래 여백 9
    ok(/gap: 6, marginBottom: 9/.test(sisSpan),
      '★아이콘·사이·아래 여백까지 «전체 서비스» 와 같습니다')
  }

  /* ══ ③ 큐보드·골프온 카드 마감 ════════════════════════════════════
   *  [대표님] 「다른 카드들처럼 완성도 높고 세련된 디자인으로 제대로 다듬어」
   *  ⛔ 홈 cardStyle 과 «같은 값» 이라야 합니다. 여기도 «대조» 합니다.
   * ════════════════════════════════════════════════════════════════ */
  head('③ 🔴 큐보드·골프온 카드 = 홈 서비스 카드 마감 [대표님]')
  {
    //  ★기준 — ServiceSection 의 cardStyle
    const cs = svc.slice(svc.indexOf('const cardStyle'), svc.indexOf('const cardStyle') + 420)
    const csRadius = cs.match(/borderRadius:\s*(\d+)/)?.[1]
    const csBorder = cs.match(/border:\s*`([\d.]+)px solid/)?.[1]
    ok(csRadius === '16' && csBorder === '1.5',
      `★기준 카드를 읽었습니다 (모서리 ${csRadius} · 선 ${csBorder}px)`)

    const iCard = sis.indexOf('borderRadius')
    const sisRadius = sis.slice(iCard, iCard + 40).match(/borderRadius:\s*(\d+)/)?.[1]
    ok(sisRadius === csRadius,
      `🔴 ★모서리가 홈 카드와 «같습니다» (${sisRadius} · 기준 ${csRadius})`)
    ok(sisRadius !== '12', '⛔ ★옛 모서리 12 로 되돌아가지 않았습니다')

    const sisBorder = sis.match(/border:\s*`([\d.]+)px solid/)?.[1]
    ok(sisBorder === csBorder, `★선 굵기가 같습니다 (${sisBorder}px)`)

    //  ★왼쪽 색 띠 + 그림자 — 홈 카드가 하는 것을 «똑같이»
    ok(/boxShadow: `inset 4px 0 0 /.test(sis),
      '🔴 ★왼쪽 색 띠(inset 4px)가 있습니다 — 홈 카드와 같은 얼개')
    ok(/0 2px 8px rgba\(0,0,0,0\.04\)/.test(sis),
      '★그림자가 홈 카드와 «같은 값» 입니다')
    ok(/overflow: 'hidden'/.test(sis),
      '⛔ ★overflow hidden — 색 띠가 둥근 모서리를 삐져나오지 않게')

    //  ⛔ 옛 «점» 아이콘(지름 10 동그라미)으로 되돌아가지 않았는지
    ok(!/width: 10, height: 10, borderRadius: '50%'/.test(sis),
      '⛔ ★옛 «점» 아이콘으로 되돌아가지 않았습니다')
    ok(/const ICON/.test(sisSrc) && /ICON\[key\]/.test(sis),
      '★앱마다 아이콘 타일이 있습니다 (당구 · 골프)')
    //  ⛔ 앱 빛깔은 «지갑 딱지» 와 맞춰 둔 값입니다 — 새 색을 짓지 않았는지
    for (const [k, v] of [['bil', '#5a4a7a'], ['glf', '#3B6D11']] as const) {
      ok(new RegExp(`${k}:\\s*'${v}'`).test(sisSrc),
        `⛔ ★${k} 빛깔이 지갑 딱지와 같습니다 (${v})`)
    }
  }

  /* ══ ④ 하단바 — 「선생님 소개」 가림 ══════════════════════════════
   *  [대표님] 「선생님 소개 항목은 화면에 보이지 않도록 숨겨 주십시오」
   *  ⛔ ★«지우지» 않았습니다 — 되살리기 쉽게 hidden 으로만 가립니다.
   * ════════════════════════════════════════════════════════════════ */
  head('④ 🔴 하단바 — 「선생님 소개」 가림 [대표님]')
  {
    ok(/label: '선생님 소개'/.test(nav),
      '⛔ ★줄을 «지우지» 않았습니다 (되살리기 쉽게 남겨 둡니다)')
    ok(/label: '선생님 소개', href: '\/teachers', hidden: true/.test(nav),
      '🔴 ★hidden: true 로 «가려» 두었습니다 [대표님]')
    ok(/HOME_NAV_SHOWN = HOME_NAV\.filter\(n => !n\.hidden\)/.test(nav),
      '★가린 것을 걸러내는 곳이 있습니다')
    //  🔴 ⛔ «그리는» 자리가 HOME_NAV_SHOWN 인가 — 선언만 있고 안 쓰면 소용없습니다
    ok(/\{HOME_NAV_SHOWN\.map\(/.test(nav),
      '🔴 ⛔ ★화면이 «걸러낸 쪽» 을 그립니다 (선언만으로는 안 가려집니다)')
    ok(!/\{HOME_NAV\.map\(/.test(nav),
      '⛔ ★옛 HOME_NAV 를 바로 그리지 않습니다')

    //  ★값으로 — 실제로 셋만 남는가
    const shown = [...nav.matchAll(/hidden: (true|false)/g)].filter(m => m[1] === 'false').length
    ok(shown === 3, `🔴 ★보이는 칸이 «셋» 입니다 — 홈·문의사항·보관함 (${shown})`)
    for (const l of ['홈', '문의사항', '보관함']) {
      ok(new RegExp(`label: '${l}'`).test(nav), `★「${l}」 는 그대로 있습니다`)
    }

    /*  ⚠️ ★/teachers 로 가는 길이 «앱 안에» 없습니다 —
     *     화면은 살아 있고 주소를 치면 열립니다. 고장이 아닙니다.
     *  ⛔ 대표님이 다시 보이게 하시려면 ★hidden 을 false 로만 두면 됩니다. */
    ok(!/'\/teachers'/.test(liveOf(R('app/home-new/page.tsx'))),
      '⚠️ ★홈 본문에도 「선생님 소개」 로 가는 길이 없습니다 (사실 확인)')
  }

  /* ══ ⑤ 🔴🔴 브랜드 머리 — «한 부품» 이라야 합니다 ═══════════════════
   *  [대표님 2026-09-15] 「로고가 왼쪽에 · 타이틀과 한자가 정돈된 구조로
   *                        엑셀 느낌 없이 모바일 앱 상단바에 걸맞게」
   *
   *  ⚠️ 전에는 ★세 화면이 «각자» 적어 두어 ★이미 어긋나 있었습니다 —
   *     글자 22 · 20 · 19px · 로고 34 · 30 · 30px · 자간 3 · 2 · 2
   *  ⇒ 9부 ⑤ 「공용 부품을 복사하지 마십시오」 를 그대로 밟고 있던 자리입니다.
   * ════════════════════════════════════════════════════════════════ */
  head('⑤ 🔴🔴 브랜드 머리 — 한 부품 [대표님]')
  {
    const brandSrc = R('app/components/common/BrandLockup.tsx')
    const login = liveOf(R('app/login/page.tsx'))
    const mypage = liveOf(R('app/mypage-new/page.tsx'))

    ok(/BRAND_TITLE = '명연재 사주연구소'/.test(brandSrc),
      '🔴 ★이름이 「명연재 사주연구소」 입니다 [대표님 2026-09-15 · 한 칸 띄움]')
    ok(/명연재 사주연구소/.test(brandSrc) && !/'명연재사주연구소'/.test(brandSrc),
      '⛔ ★붙여 쓴 옛 이름으로 되돌아가지 않았습니다')
    ok(/BRAND_HANJA = '\(明然載\)'/.test(brandSrc),
      '★한자 표기가 함께 있습니다')

    //  🔴🔴 ⛔ ★사본이 «한 벌도» 없어야 합니다 — 이름을 화면에 다시 적지 않았는지
    for (const [name, src] of [
      ['홈', home], ['로그인', login], ['마이페이지', mypage],
    ] as const) {
      ok(/<BrandLockup/.test(src), `★${name} 이 부품을 «씁니다»`)
      ok(!/明然載/.test(src), `⛔ ★${name} 에 한자를 «다시 적지» 않았습니다`)
      ok(!/logo-myjae\.png/.test(src), `⛔ ★${name} 이 로고를 «직접» 그리지 않습니다`)
    }
    //  ⛔ 저장소 어디에도 «또 다른» 묶음이 없는지 — 값으로 셉니다
    {
      const files = ['app/home-new/page.tsx', 'app/login/page.tsx',
        'app/mypage-new/page.tsx', 'app/components/common/BrandLockup.tsx']
      const n = files.filter(f => /明然載/.test(R(f))).length
      ok(n === 1, `🔴🔴 ★한자를 적은 파일이 «하나» 뿐입니다 (${n})`)
    }

    /*  ⛔⛔ ★건드리면 안 되는 이름 둘 — «화면 이름» 과 «법인·앱 이름» 은 다릅니다 */
    const company = R('app/components/common/companyInfo.ts')
    ok(/name: '\(주\)명연재'/.test(company),
      "⛔⛔ ★법적 상호는 «(주)명연재» 그대로입니다 (사업자등록증 · PG 심사)")
    /*  ⛔ ★띄어쓰기가 있든 없든 잡습니다 — 「사주연구소」 네 글자로 셉니다.
      *     (2026-09-15 에 「명연재사주연구소」 → 「명연재 사주연구소」 로 바뀌었습니다) */
    ok(!/사주연구소/.test(company),
      '⛔ ★회사 정보에 새 이름이 «섞여 들어가지» 않았습니다')
    const layout = R('app/layout.tsx')
    ok(/title: "명연재"/.test(layout) && /applicationName: "명연재"/.test(layout),
      '⛔⛔ ★앱·홈 화면 아이콘 이름은 «명연재» 그대로입니다 (2026-09-10 에 일부러 줄인 자리)')
    ok(!/사주연구소/.test(layout),
      '⛔ ★manifest 쪽에 새 이름이 «섞여 들어가지» 않았습니다')

    /*  ★모양 — 「엑셀 느낌 없이」 [대표님]
     *  ⚠️ 옛 이름(석 자)은 자간을 3px 벌려 두었습니다.
     *     여덟 글자에 그대로 벌리면 ★칸칸이 떨어져 보입니다. */
    const ls = brandSrc.match(/letterSpacing: '(-?[\d.]+)px',\n\s*lineHeight: 1\.15/)?.[1]
    ok(!!ls && parseFloat(ls) <= 0,
      `🔴 ★이름 자간을 «벌리지» 않았습니다 (${ls}px · 옛 값 +3px)`)
    ok(/whiteSpace: 'nowrap'/.test(brandSrc),
      '⛔ ★이름이 «중간에 끊기지» 않습니다')
    ok(/minWidth: 0/.test(brandSrc),
      '⛔ ★minWidth 0 — 이름이 옆 단추를 «밀어내지» 않습니다')

    /*  ★「내 정보」 단추와의 사이 [대표님] */
    ok(/flexShrink: 0, whiteSpace: 'nowrap',/.test(home),
      '🔴 ★「내 정보」 단추가 «찌그러지지» 않습니다 (좁은 폰 320px)')
    for (const [name, src] of [['홈', home], ['마이페이지', mypage]] as const) {
      const pad = src.match(/padding: '11px 16px', gap: 12/)
      ok(!!pad, `★${name} 머리띠 여백이 정돈됐습니다 (11/16 · 사이 12)`)
    }
  }

  /* ══ ⑥ 🔴 배너 넷째 칸 — 연인·부부 [대표님 2026-09-15] ═══════════
   *  「"커플 채팅" 태그는 완전히 삭제 · "AI" 라는 용어도 완전히 배제
   *    채팅이나 기계적인 느낌을 완전히 지우고, 오랜 인연을 함께 나누는 연인과 부부」
   *
   *  ⛔ ★«쓰는» 배너(SLIDES)만 봅니다 —
   *     바로 위 SLIDES_OLD 는 «지우지 말 것» 으로 남겨 둔 보관본이라
   *     손님에게 «안 보입니다». 그것까지 세면 ★영영 통과하지 못합니다.
   * ════════════════════════════════════════════════════════════════ */
  head('⑥ 🔴 배너 넷째 칸 — 연인·부부 [대표님]')
  {
    //  ★«쓰는» 배너만 잘라냅니다 (보관본 SLIDES_OLD 를 지나서)
    const i = homeSrc.indexOf('const SLIDES = [')
    const j = homeSrc.indexOf('\n]', i)
    ok(i > 0 && j > i, '★쓰는 배너 목록을 잘라냈습니다')
    const slides = liveOf(homeSrc.slice(i, j))

    //  ★넷째 칸만 — 궁합으로 가는 칸입니다
    const k = slides.indexOf("href: '/manseryeok/couple-storage'")
    ok(k > 0, '★궁합으로 가는 배너 칸이 있습니다')
    //  🔴 ⛔ ★«칸 하나» 만 잘라냅니다 —
    //     글자 수로 «700자 앞» 을 보면 ★앞 칸(내사주그림)까지 삼킵니다.
    //     ⇒ 그러면 앞 칸에 「AI」 가 생겨도 여기서 실패가 나고, 반대로
    //       이 칸이 비어도 앞 칸 글로 통과할 수 있습니다. ★칸 경계로 자릅니다.
    const cards = slides.split(/\n  \{/)
    const card = cards.find(c => c.includes("href: '/manseryeok/couple-storage'")) ?? ''
    ok(card.length > 0 && !card.includes('/manseryeok/mulsang-storage'),
      `★그 «칸 하나» 만 잘라냈습니다 (${card.length}자 · 이웃 칸이 안 섞임)`)

    ok(!/커플 채팅/.test(card), '⛔ ★「커플 채팅」 이 없습니다 [대표님]')
    ok(!/채팅/.test(card), '⛔ ★「채팅」 이라는 말 자체가 없습니다')
    ok(!/AI/.test(card), '🔴 ⛔ ★「AI」 가 없습니다 [대표님]')
    ok(/tag: '두 사람의 인연'/.test(card), '★태그가 「두 사람의 인연」 입니다')
    ok(/연인과 부부가 함께 보는/.test(card) && /깊이 있는 인연의 조화/.test(card),
      '🔴 ★대표님이 주신 제목 두 줄이 그대로입니다')
    ok(/두 사람이 걸어갈 길과 서로의 사주 결을/.test(card)
      && /명연재에서 정성껏 풀어냅니다/.test(card),
      '🔴 ★대표님이 주신 설명이 그대로입니다')
    /*  ⚠️ ★글자 칸이 화면의 65%(약 280px) 뿐이라 «줄을 미리» 끊어 두어야 합니다.
     *  🔴 ⛔ 처음에 여기에 ★«느슨한 가지»(|| …)를 두었다가 —
     *     줄바꿈을 없애는 되살림 시험에서 ★안 잡혔습니다. 가지를 걷어냈습니다.
     *     ⇒ 9부 ② 「되살려 보지 않은 그물은 그물이 아닙니다」 그대로입니다. */
    ok(/결을\\n명연재에서/.test(card),
      '★설명이 «두 줄» 로 끊겨 있습니다 (제멋대로 접히지 않게)')

    /*  ⚠️ ★타로 칸(여섯째)에는 「AI」 가 «아직 있습니다» —
     *     대표님이 «넷째 칸» 을 두고 하신 말씀이라 ⛔ 건드리지 않았습니다.
     *     ⇒ 대표님이 정하시면 그때 고칩니다. 지금은 ★«있다는 것만» 적어 둡니다. */
    const tarot = /tag: 'AI 타로 마스터'/.test(slides)
    console.log(`  ⚠️  타로 칸의 「AI」 — ${tarot ? '★아직 있습니다 (대표님 답 대기)' : '없습니다'}`)
  }

  /* ══ ④ 🔴 특화 분석(BEST) = 전체 서비스 카드 «같은 모양» ══════════
   *  [대표님 2026-09-22] 「특화분석과 전체서비스 버튼들이 모양이 약간 다르지
   *    통일부터 하고 가자」 · 「왼쪽 음영처리… 그 모양도 같이 해줘」
   *
   *  ⚠️ 2026-09-08 에 ★«선»(모서리·테두리·그림자)만 통일하고
   *     ★«크기» 는 안 맞췄습니다. 그것이 반년 뒤 대표님 눈에 띄었습니다.
   *
   *  ⛔ ★숫자를 못 박지 않습니다 — «두 자리에서 뽑아» 견줍니다.
   *     아래 카드 값을 바꾸면 BEST 도 «함께» 바꾸라고 멈춥니다.
   *  ⚠️ ★갈려도 되는 것 — 바탕색(t.bg) · BEST 뱃지. 그 둘은 «일부러» 다릅니다.
   * ═════════════════════════════════════════ */
  head('④ 🔴 특화 분석 = 전체 서비스 «같은 모양» [대표님]')
  {
    /*  ★BEST 카드를 그리는 토막 — ⚠️ 단추«부터» 자르면 안 됩니다.
     *     왼쪽 띠는 단추 «밖» 겉 상자가 그립니다 (값 칸까지 감싸려고).
     *     ⇒ 처음에 단추부터 잘랐다가 ★띠를 «못 보고» 헛 실패가 났습니다. */
    const bStart = svc.indexOf('{best.map((s) => {')
    const best = svc.slice(bStart, svc.indexOf('<PriceRow', bStart))
    //  ★낱장 카드를 그리는 토막 — 「solo.map」 부터 값 칸까지
    const sStart = svc.indexOf('{solo.map((s) => (')
    const solo = svc.slice(sStart, svc.indexOf('<PriceRow', sStart))

    ok(bStart > 0 && sStart > 0, '★두 카드를 그리는 자리를 찾았습니다')

    const pick = (src: string, re: RegExp) => src.match(re)?.[1] ?? '?'
    const PAIRS: [string, RegExp, RegExp][] = [
      ['카드 안쪽 여백', /padding: '([^']+)'/, /padding: '([^']+)'/],
      ['아이콘 크기', /size=\{(\d+)\}/, /size=\{(\d+)\}/],
      ['제목 글자', /fontSize: ([\d.]+), fontWeight: 700, color: C\.text/, /fontSize: ([\d.]+), fontWeight: 700, color: C\.text/],
      ['설명 글자', /fontSize: ([\d.]+), color: C\.sub/, /fontSize: ([\d.]+), color: C\.sub/],
      ['화살표 크기', /fontSize: (\d+), color: [^,]+, flexShrink/, /fontSize: (\d+), color: [^,]+, flexShrink/],
    ]
    for (const [name, reB, reS] of PAIRS) {
      const vb = pick(best, reB)
      const vs = pick(solo, reS)
      ok(vb !== '?' && vb === vs, `🔴 ★${name} 가 «같습니다» (특화 ${vb} · 전체 ${vs})`)
    }

    /*  🔴 바탕 · 아이콘 타일 · 화살표 — «안 ②» [대표님 2026-09-22 · 목업 보시고 확정]
     *  ⛔ 남겨 둔 차이는 ★BEST 뱃지 «하나» 뿐입니다.
     *  ⚠️ 옛 값(t.bg · t.iconBg · t.arrow)은 «지우지 않았습니다» — 되살리실 때 씁니다. */
    ok(/background: C\.white,/.test(best) && /background: C\.white,/.test(svc.slice(svc.indexOf('const cardStyle'), svc.indexOf('const cardStyle') + 420)),
      '🔴 ⛔ ★카드 바탕이 아래 카드와 «같은 흰색» 입니다 (장마다 다른 색이 아닙니다)')
    ok(!/\{t\.bg\}/.test(svc) && !/background: t\.bg/.test(svc),
      '⛔ ★장마다 다른 바탕(t.bg)으로 되돌아가지 않았습니다')
    ok(!/bg=\{t\.iconBg\}/.test(best) && !/edge=\{t\.iconEdge\}/.test(best),
      '🔴 ⛔ ★아이콘 타일이 아래 카드와 «같습니다» (BEST 전용 색을 안 넘깁니다)')
    ok(!/color: t\.arrow/.test(best),
      '⛔ ★화살표 색도 아래 카드와 «같습니다»')
    ok(/t\.badge/.test(best) && /bg: 'linear-gradient/.test(svc),
      '⚠️ ★남긴 차이는 «BEST 뱃지» 하나 · 옛 색 값은 «지우지 않았습니다»')

    //  🔴 왼쪽 띠 — 너비도 «색» 도 같아야 합니다 [대표님]
    ok(/inset \$\{STRIPE_W\} 0 0 \$\{C\.stripe\}/.test(best),
      '🔴 ⛔ ★왼쪽 띠 색이 아래 카드와 «같습니다» (C.stripe · 장마다 다른 색이 아닙니다)')
    ok(!/\$\{t\.stripe\}/.test(svc),
      '⛔ ★장마다 다른 띠 색(t.stripe)으로 되돌아가지 않았습니다')
    ok(/stripe: '#/.test(svc),
      '⚠️ ★옛 띠 색 값은 «지우지 않고» 남겨 두었습니다 (되살리실 때 씁니다)')
  }

  console.log(`\n━━ 홈 화면 마감 — 통과 ${pass} · 실패 ${fail} ━━\n`)
  if (fail > 0) process.exit(1)
}

main()
