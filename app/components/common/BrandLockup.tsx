'use client'

// ==========================================================================
//  브랜드 머리 묶음 — 로고 + 「명연재사주연구소 (明然載)」
//
//  ★2026-09-15 (10부) 신설  [대표님]
//    「로고 아이콘이 왼쪽에 · 메인 타이틀과 한자가 흐트러짐 없이 정돈된 구조로
//      엑셀 느낌 없이 모바일 앱 상단바에 걸맞은 고급스러운 UI 로」
//
//  🔴🔴 ★왜 부품으로 모았나
//     전에는 ★세 화면이 «각자» 같은 묶음을 적어 두었습니다 —
//       app/home-new/page.tsx · app/login/page.tsx · app/mypage-new/page.tsx
//     ⇒ 사본이 셋이라 ★이미 어긋나 있었습니다 (글자 22px · 20px · 19px ·
//       로고 34px · 30px · 30px · 자간 3 · 2 · 2).
//     ⇒ 9부 ⑤ 「공용 부품을 복사하지 마십시오」 와 같은 자리입니다.
//  ⛔⛔ ★이름이나 크기를 바꿀 때는 «여기만» 고치십시오.
//       화면 쪽에 다시 적지 마십시오. 검사 57 ⑤ 가 사본이 생기는 것을 막습니다.
//
//  ══ ⚠️⚠️ 이름에 대해 — ★건드리면 안 되는 곳이 셋 ══
//
//   ① ★법적 상호는 «(주)명연재» 입니다 (사업자등록증 296-86-04182).
//      ⛔ 푸터·약관·개인정보 화면의 이름을 고치지 마십시오.
//         COMPANY.name 한 곳에서 나갑니다 (companyInfo.ts).
//      ⚠️ PG 심사는 ★신청서에 쓴 값과 화면의 값이 «완전히 같은지» 봅니다.
//
//   ② ★홈 화면 아이콘·앱 이름은 «명연재» 입니다 (layout.tsx metadata · manifest).
//      ⛔ 여기를 「명연재사주연구소」 로 늘리지 마십시오 —
//         2026-09-10 에 ★「명연재연구소」→「명연재」로 «일부러 줄인» 자리입니다.
//         안드로이드 홈 화면 아이콘 밑은 ★글자가 잘립니다.
//      ⚠️ ★카카오 콘솔의 앱 이름도 「명연재」 입니다. 맞춰 두었습니다.
//
//   ③ ⇒ 그래서 ★«화면에 보이는 이름» 과 «앱·법인 이름» 은 다릅니다.
//        이 부품은 ①②가 «아닌» 자리에만 씁니다. 그것이 맞습니다.
//
//  ⛔ 로고 파일을 바꾸지 마십시오 — public/logo-myjae.png
//     ★흰 바탕을 지운 «투명» png 입니다. 흰 네모가 있는 원본을 쓰면
//     피치톤 위에 ★네모가 떠 보입니다.
// ==========================================================================

import Image from 'next/image'

/** ★화면에 보이는 이름 — ⛔ 법인 이름(COMPANY.name)과 «다른 것» 입니다 */
export const BRAND_TITLE = '명연재사주연구소'
/** ★한자 표기 — 괄호까지 포함합니다 */
export const BRAND_HANJA = '(明然載)'

type Props = {
  /**
   *  bar  — 홈·마이페이지의 «붙어 있는 머리띠» (작고 단단하게)
   *  hero — 로그인·가입의 «가운데 놓는 큰 묶음»
   */
  variant?: 'bar' | 'hero'
}

export default function BrandLockup({ variant = 'bar' }: Props) {
  const bar = variant === 'bar'

  /*  ★값을 한 곳에 모아 둡니다 — 두 모양이 «같은 결» 이라야 합니다.
   *  ⚠️ 옛 묶음은 로고와 글자를 «아래끝» 으로 맞췄는데(alignItems flex-end),
   *     이름이 길어지고 한자가 «아랫줄» 로 내려가면서 그 방식이 안 맞습니다.
   *     ⇒ ★이제 «두 줄 덩이» 를 로고와 «가운데» 로 맞춥니다. */
  const logo = bar ? 34 : 38
  const title = bar ? 16.5 : 19
  const hanja = bar ? 10.5 : 11.5

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: bar ? 10 : 11,
      /*  ⛔ ★minWidth 0 — 이름이 길어 «옆 단추를 밀어내는» 것을 막습니다.
       *     [대표님] 「내 정보 버튼과 간격이 자연스럽게 어우러지도록」 */
      minWidth: 0,
    }}>
      <Image
        src="/logo-myjae.png" alt="" aria-hidden="true"
        width={logo} height={logo} priority
        style={{ flexShrink: 0 }}
      />

      {/*  ★두 줄 덩이 — 위 이름 · 아래 한자
        *  ⚠️ 옛 모양은 이름과 한자를 «옆으로» 붙였습니다. 이름이 여덟 글자가 되면서
        *     한 줄에 다 넣으면 ★단추까지 밀립니다. 그래서 «아래» 로 내렸습니다. */}
      <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span style={{
          fontSize: title, fontWeight: 700, color: '#38414B',
          /*  ⚠️ ★자간을 «좁혀» 둡니다 —
           *     옛 이름(석 자)은 3px 씩 벌려 놓아야 보기 좋았지만,
           *     여덟 글자에 그대로 벌리면 ★«엑셀 칸» 처럼 떨어져 보입니다. */
          letterSpacing: '-0.4px',
          lineHeight: 1.15,
          whiteSpace: 'nowrap',
        }}>{BRAND_TITLE}</span>
        <span style={{
          fontSize: hanja, color: '#68112E',
          /*  ★한자는 넉 자뿐이라 «조금 벌려» 두 줄의 너비가 비슷해집니다.
           *    ⇒ 위아래가 «한 덩이» 로 보입니다. */
          letterSpacing: '2.5px',
          lineHeight: 1.25, marginTop: 2,
          whiteSpace: 'nowrap',
        }}>{BRAND_HANJA}</span>
      </span>
    </div>
  )
}
