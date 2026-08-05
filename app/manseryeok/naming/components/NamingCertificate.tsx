'use client'

// app/manseryeok/naming/components/NamingCertificate.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  A4 작명서(작명 인증서) — 인쇄 · PDF 저장                          │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부 5차) — 대표님 지시 「A4 1장 규격 작명서」
//
//  [왜 «인쇄» 로 만들었나]
//    PDF 만드는 꾸러미(jspdf 등)를 더하지 «않았습니다».
//    ① 한글 글꼴을 통째로 실어야 해서 꾸러미가 매우 무거워집니다.
//       ⚠️ 안 실으면 «글자가 깨진» 작명서가 손님께 나갑니다. 그것이 더 나쁩니다.
//    ② 의존을 더하면 package-lock 까지 함께 올려야 합니다 (교훈 [의존]).
//    ★브라우저의 «인쇄» 는 어느 기기에서나 「PDF로 저장」을 함께 줍니다.
//      아이폰·안드로이드·PC 모두 됩니다. 글꼴도 화면에 보이는 그대로 나갑니다.
//
//  [왜 새 창을 여는가]
//    지금 화면에 @media print 를 걸면 «화면의 다른 것» 을 전부 숨겨야 하고,
//    한 군데만 빠뜨려도 작명서에 버튼이 찍혀 나갑니다.
//    ★따로 만든 문서를 새 창에 띄우면 «그것만» 인쇄됩니다. 어긋날 자리가 없습니다.
//
//  ⚠️⚠️ 이 부품은 «판정을 하지 않습니다». 받은 값을 그리기만 합니다. (교훈 CJ)
//     점수·등급은 부르는 쪽(newresult)이 이미 낸 것을 그대로 받습니다.
//
//  ⚠️ 팝업 차단에 걸릴 수 있습니다. 그때는 «조용히 실패하지 않고» 알려 드립니다.
// ══════════════════════════════════════════════════════════════════

import React from 'react'

export interface CertChar {
  hangul: string
  hanja: string
  strokes: number
  /** ★자원오행 — 한자가 품은 기운 (字源五行) */
  resourceOhaeng: string
  /** ★음오행 — 초성으로 보는 기운 (音五行). 없으면 화면에서 비웁니다 */
  soundOhaeng?: string
  /** 훈음 — 「버들」 처럼 한 낱말. 없으면 비웁니다 */
  meaning?: string
  role: '성' | '이름'
}

export interface CertPillar { pillar: string; stem: string; branch: string }

/**
 * ★수리 4격 한 줄 — 元·亨·利·貞
 *
 * ⚠️ 값을 여기서 «만들지» 않습니다. diagnoseName 의 suri.gyeok 을 그대로 받습니다.
 *    격 이름을 새로 지어내면 화면과 종이가 갈립니다. (교훈 CJ·BF)
 */
/** ★元亨利貞 — 한자로 새깁니다 (2026-08-01 · 43부 14차) */
export const GYEOK_MARK: Record<string, string> = {
  won: '元', hyeong: '亨', i: '利', jeong: '貞',
}

export interface CertGyeok {
  /**
   * 元 · 亨 · 利 · 貞
   *
   * 🔴⚠️ diagnoseName 의 key 는 «won·hyeong·i·jeong» 입니다 (로마자).
   *    그것을 그대로 넣었더니 종이에 「won格 · hyeong格」 이 찍혀 나갔습니다.
   *    ★반드시 GYEOK_MARK 로 옮겨서 넣으십시오.
   */
  mark: string
  /** 초년운 · 청년운 · 중년운 · 말년운 */
  label: string
  sum: number
  /** 격 이름 — 「공명격」 */
  name: string
  /** 운 이름 — 「개신융창운」 */
  un: string
}

export interface NamingCertificateProps {
  hangulName: string
  hanjaName: string
  /** 개명 · 신생아 */
  kind: '개명' | '신생아'
  chars: CertChar[]
  saju: CertPillar[]
  birthText: string
  yongsin: string
  /** 관점별 한 줄 — [이름, 값] */
  lines: [string, string][]
  /** ★수리 4격 (元亨利貞). 비면 그 칸을 안 그립니다 */
  gyeok?: CertGyeok[]
  /** 남자=乾命 · 여자=坤命. 모르면 비웁니다 */
  gender?: string
  /** 「陽 1998年 01月 05日 寅時生」 처럼 한자로 적은 인적사항 */
  birthHanja?: string
  /** 맺음말 (AI 통변의 conclusion). 없으면 그 칸을 안 그립니다 */
  conclusion?: string
  /**
   * ★總評에 함께 담을 «사주와의 만남» 풀이 (2026-08-01 · 43부 11차)
   *
   *   nameLine  「이 이름은」 — 이 사주는 무엇을 용신·희신으로 삼고, 이름에 무엇이 담겼는가
   *   meaning   「어떤 의미인가」 — 왜 그것이 사주를 돕는가
   *
   * ⚠️ 이 글은 AI 가 «다섯 관점» 을 보고 쓴 것입니다. 여기서 고쳐 쓰지 마십시오 —
   *    화면과 종이가 «다른 말» 을 하면 손님은 어느 쪽을 믿어야 할지 모릅니다. (교훈 CJ)
   * ⚠️ 없으면 그 줄을 «비웁니다». 지어내지 않습니다.
   */
  yongsinLine?: string
  yongsinMeaning?: string
  /**
   * ★撰名狀 전용 «요약 總評» (2026-08-01 · 43부 17차 · 대표님 지시)
   *
   *   「내 이름 정밀분석 내용은 줄이지 말고, 그 내용들을 «요약» 해서 실어라」
   *
   *   ★이 값이 있으면 이것«만» 씁니다 — 화면 글을 잘라 붙이지 않습니다.
   *   ⚠️ 비어 있으면 옛 길(yongsinMeaning + conclusion)로 갑니다.
   *      옛 기록에는 이 값이 «없습니다». 그분들 증서도 나와야 합니다. (교훈 [폴백])
   */
  chongpyeong?: string
  /** 발행일 — 「2026년 8월 1일」 */
  issuedAt: string
  /** 팝업이 막혔을 때 알림 */
  onBlocked?: () => void
}

/** ⚠️ HTML 에 값을 꽂기 전에 반드시 거릅니다 — 이름에 <, & 가 들어올 수 있습니다 */
function esc(v: string): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * A4 한 장짜리 «선명장(撰名狀)» 을 글자로 짓습니다. ★여기가 작명서의 모양입니다.
 *
 * ══════════════════════════════════════════════════════════════════
 *  ★2026-08-01 (43부 10차) — 대표님이 주신 «전통 선명장» 양식으로 다시 지었습니다.
 *
 *   담는 것 다섯
 *     ① 머리      撰名狀 · 陽/陰 生年月日時 · 乾命/坤命
 *     ② 이름      한자 크게 · 훈음(버들 류) · 劃數 · 音五行 · 字源五行
 *     ③ 수리 4격  元·亨·利·貞 — 획수합 · 격 이름 · 운 이름
 *     ④ 총평      사주 보완 · 수리 길흉을 아우른 한 덩이 글
 *     ⑤ 발급      「위와 같이 作名하여 撰名狀을 드립니다」 · 연구소 · 원장 · 인장
 *
 *  ⚠️⚠️ «판정을 여기서 하지 않습니다». 격 이름도 훈음도 «받아서» 적습니다.
 *     종이에만 다른 말이 적히면 손님은 어느 쪽을 믿어야 할지 모릅니다. (교훈 CJ·BF)
 *
 *  ⚠️ 값이 없으면 그 칸을 «비웁니다». 지어내지 않습니다 —
 *     훈음이 없는 한자에 그럴듯한 뜻을 붙이면 그것이 종이로 남습니다. (교훈 EJ)
 *
 *  ⚠️ 인장은 «그림 파일이 아니라» 글자와 테두리로 그립니다.
 *     이미지를 쓰면 인쇄 설정(배경 그림 끄기)에서 통째로 사라집니다.
 * ══════════════════════════════════════════════════════════════════
 */
export function buildCertificateHtml(p: NamingCertificateProps): string {
  const totalStrokes = p.chars.reduce((a, c) => a + (c.strokes || 0), 0)
  /** 한자 오행 한 글자 — 값이 없으면 «비웁니다» */
  const oh = (v?: string) => ({ 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }[v ?? ''] ?? '')

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부 14차) — 總評 길이에 따라 «스스로» 줄어듭니다
  //
  //   🔴 [무엇이 있었나]  글자 크기를 «한 번» 맞춰 두었습니다.
  //      그런데 총평은 AI 가 씁니다 — 이름마다 길이가 «크게» 다릅니다.
  //      짧은 표본으로 맞춰 두었더니 실제 손님 것(약 1.6배)이 두 장으로 갈라졌습니다.
  //      ⚠️ 「한 번 재서 맞췄으니 됐다」가 통하지 않는 자리였습니다.
  //
  //   ★[이제]  글자 수를 세어 크기를 «세 단» 으로 고릅니다.
  //   ⚠️ 무한정 줄이지 않습니다 — 7.4pt 아래로는 읽기 어렵습니다.
  //      그보다 길면 «넘치더라도» 읽을 수 있는 크기를 지킵니다.
  //      (그런 이름은 아직 본 적이 없지만, 언젠가 옵니다)
  // ══════════════════════════════════════════════════════════════
  /**
   * ★總評이 «너무 길면» 문장 단위로 줄입니다 (2026-08-01 · 43부 15차)
   *
   *  🔴 [왜]  글자만 줄이면 1,400자에서 6.5pt, 2,000자에서 5.6pt 가 됩니다.
   *     한 장에는 담기지만 «어르신이 못 읽으십니다». 그건 담긴 것이 아닙니다.
   *  ★그래서 «읽을 수 있는 크기(7.6pt)» 를 먼저 지키고, 넘치는 만큼 글을 줄입니다.
   *  ⚠️ 중간을 자르지 «않습니다» — 문장이 끊기면 말이 이상해집니다.
   *     마침표에서 끊고, 잘렸다는 것을 «숨기지 않습니다».
   *  ⚠️ 화면에는 «전문» 이 그대로 있습니다. 종이만 줄입니다.
   */
  const trimChong = (t: string, max: number): string => {
    const v = (t ?? '').trim()
    if (v.length <= max) return v
    const cut = v.slice(0, max)
    const at = cut.lastIndexOf('. ')
    const kept = at > max * 0.5 ? cut.slice(0, at + 1) : cut.trimEnd()
    return kept + ' (…자세한 풀이는 앱에서 이어집니다)'
  }
  /**
   * ⚠️ 한 장에 «읽을 수 있는 크기» 로 담기는 한계입니다 — 재서 얻은 값입니다.
   *
   * ★2026-08-01 (43부 16차) — 통변 프롬프트에도 «800자» 상한을 두었습니다
   *   (app/api/naming/route.ts 의 「분량」 대목).
   *   ⚠️ 그래도 이 자름막을 «걷어내지 마십시오».
   *      AI 는 상한을 «지키지 못할 때가 있습니다». 그때 종이가 두 장으로 갈라집니다.
   *      ★프롬프트는 «부탁» 이고, 이 값은 «약속» 입니다. 둘 다 있어야 합니다.
   *   실측 — 실제 통변 745자 (상한의 65%). 여유가 넉넉합니다.
   */
  const CHONG_MAX = 1150
  /**
   * ★머리줄은 종이 쪽에서 «줄입니다» (2026-08-01 · 43부 18차)
   *
   *  ⚠️ 전에는 프롬프트에 「60자 안쪽」을 걸어 두었습니다.
   *     그런데 이 글은 «화면에도» 나옵니다 — 종이 사정으로 화면을 줄인 셈이었습니다.
   *  ★이제 화면 글에는 어떤 상한도 두지 않고, 길면 여기서 한 줄로 다듬습니다.
   */
  const cLine = trimChong(p.yongsinLine ?? '', 110)
  const room = Math.max(300, CHONG_MAX - cLine.length)

  /**
   * ★요약이 있으면 «그것만» 씁니다 (43부 17차).
   *
   *  ⚠️ 화면 글을 잘라 붙이던 옛 길은 «요약이 없을 때만» 돕니다.
   *     옛 기록에는 chongpyeong 이 없어, 그분들 증서가 안 나오면 안 됩니다.
   *  ⚠️ 요약도 상한을 지납니다 — AI 가 넘길 수 있습니다.
   */
  const summary = (p.chongpyeong ?? '').trim()
  const cMean = summary
    ? trimChong(summary, room)
    : trimChong(p.yongsinMeaning ?? '', Math.round(room * 0.6))
  const cEnd = summary ? '' : trimChong(p.conclusion ?? '', room - cMean.length)

  const chongLen = cLine.length + cMean.length + cEnd.length
  const chongSize = chongLen > 900 ? 7.6 : chongLen > 620 ? 8.3 : 9.2
  const chongLead = chongLen > 900 ? 1.55 : chongLen > 620 ? 1.62 : 1.72

  const nameCol = (c: CertChar) => `
    <td class="nc">
      <div class="nc-hanja">${esc(c.hanja || c.hangul)}</div>
      <div class="nc-hun">(${esc(c.meaning || '')}${c.meaning ? ', ' : ''}${esc(c.hangul)})</div>
    </td>`

  const gyeokRows = (p.gyeok ?? []).map((g) => `
    <div class="gy">
      <span class="gy-k">${esc(GYEOK_MARK[g.mark] ?? g.mark)}格</span>
      <span class="gy-n">${g.sum}</span>
      <span class="gy-name">${esc(g.name)}</span>
      <span class="gy-un">${esc(g.un)}</span>
      <span class="gy-age">${esc(g.label)}</span>
    </div>`).join('')

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>${esc(p.hanjaName || p.hangulName)} 撰名狀</title>
<style>
  /* ⚠️ A4 한 장에 «반드시» 담기게 — 넘치면 두 장으로 갈라져 증서 꼴이 안 납니다 */
  @page { size: A4; margin: 9mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; background: #fff; color: #241c14;
    font-family: 'Apple SD Gothic Neo','Malgun Gothic','Noto Serif KR','Batang',serif;
  }
  .sheet { width: 192mm; margin: 0 auto; }
  /* 겹테두리 — 전통 증서의 결 */
  .frame {
    border: 2mm solid #8a6a2f; padding: 5mm 7mm 4mm; position: relative;
    background:
      radial-gradient(circle at 12% 10%, rgba(196,166,90,0.10), transparent 42%),
      radial-gradient(circle at 88% 10%, rgba(196,166,90,0.10), transparent 42%),
      #fffdf7;
  }
  .frame::before {
    content: ''; position: absolute; inset: 1.6mm;
    border: 0.5mm solid #c4a65a; pointer-events: none;
  }
  .inner { position: relative; }

  .title { text-align: center; font-size: 23pt; font-weight: 700; letter-spacing: 11px;
           color: #7a1f1f; margin: 0 0 2mm; text-indent: 11px; }
  .birth { text-align: center; font-size: 10.5pt; letter-spacing: 3px; color: #3b2f22; margin-bottom: 3.5mm; }

  /* ── 이름 · 오행 표 ── */
  table.name { width: 100%; border-collapse: collapse; table-layout: fixed; margin-bottom: 2.5mm; }
  table.name td { text-align: center; }
  td.nc { padding-bottom: 1mm; }
  .nc-hanja { font-size: 33pt; font-weight: 700; line-height: 1.02; color: #241c14; }
  .nc-hun { font-size: 9.5pt; color: #4a3a28; margin-top: 1mm; }
  tr.lab td { font-size: 10.5pt; letter-spacing: 2px; padding: 0.8mm 0; color: #3b2f22; }
  tr.lab td:first-child { text-align: right; padding-right: 4mm; color: #6b563a; letter-spacing: 3px; }
  .sep { height: 0.4mm; background: #c4a65a; margin: 2mm 0 2.5mm; }

  /* ── 수리 4격 ── */
  .gy { display: flex; align-items: baseline; gap: 3mm; font-size: 11pt;
        padding: 1mm 2mm; border-bottom: 0.2mm dotted #ddc79a; }
  .gy-k { font-weight: 700; color: #7a1f1f; width: 13mm; letter-spacing: 1px;
          white-space: nowrap; flex-shrink: 0; }
  .gy-n { width: 9mm; text-align: right; font-weight: 700; }
  .gy-name { font-weight: 700; color: #241c14; }
  .gy-un { color: #4a3a28; }
  .gy-age { margin-left: auto; font-size: 8.5pt; color: #8a7355; }

  h2 { font-size: 9.5pt; color: #7a1f1f; letter-spacing: 3px; margin: 3mm 0 1.5mm;
       font-weight: 700; text-align: center; }
  .two { display: flex; gap: 6mm; margin-top: 2mm; }
  .two > div { flex: 1; }
  .pils { display: flex; gap: 1.5mm; }
  .pil { flex: 1; text-align: center; border: 0.3mm solid #ddc79a; border-radius: 1mm;
         padding: 1.5mm 0; background: #fffaf0; }
  .pil-t { font-size: 6.5pt; color: #8a7355; }
  .pil-g, .pil-b { font-size: 12pt; font-weight: 700; line-height: 1.15; }
  table.info { width: 100%; border-collapse: collapse; font-size: 9pt; }
  table.info td { padding: 0.9mm 0; border-bottom: 0.2mm dotted #ead9c9; }
  table.info td.k { color: #6b563a; }
  table.info td.v { text-align: right; font-weight: 700; }

  /* ── 총평 ── */
  .chong { font-size: ${chongSize}pt; line-height: ${chongLead}; color: #241c14; text-align: justify;
           margin-top: 1mm; padding: 0 1mm; }
  .chong p { margin: 0 0 1.6mm; }
  .chong p:last-child { margin-bottom: 0; }
  /* ★「이 이름은」 한 줄 — 사주와 이름의 «관계» 를 먼저 못 박습니다 */
  .chong p.cl { font-weight: 700; color: #7a1f1f; text-align: center; letter-spacing: 0.2px; }
  /* ★맺음 — 윗글과 갈리도록 가는 선을 둡니다 */
  .chong p.cend { border-top: 0.2mm dotted #ddc79a; padding-top: 1.6mm; }

  /* ── 발급 ── */
  .foot { margin-top: 4mm; text-align: center; position: relative; }
  .give { font-size: 11.5pt; letter-spacing: 3px; margin-bottom: 2mm; }
  .house { font-size: 13pt; font-weight: 700; letter-spacing: 8px; color: #241c14; }
  .master { font-size: 11.5pt; letter-spacing: 4px; margin-top: 2mm; }
  /* ★인장 — 그림이 아니라 «글자와 테두리» 로 그립니다 (인쇄에서 안 사라지게) */
  .seal {
    display: inline-block; margin-left: 5mm; vertical-align: middle;
    width: 13.5mm; height: 13.5mm; border: 0.7mm solid #a32020; border-radius: 1.2mm;
    color: #a32020; font-size: 7.5pt; font-weight: 700; line-height: 1.15;
    padding-top: 2.4mm; letter-spacing: 0.5px;
  }
  .note { font-size: 6.5pt; color: #8a7355; margin-top: 3mm; line-height: 1.55; }

  .bar { text-align: center; padding: 10px; background: #F4F2EF; font-size: 13px; color: #4a3a28; }
  .bar button { font-size: 13px; padding: 9px 20px; border-radius: 9px; border: none;
                background: #8a6a2f; color: #fff; cursor: pointer; margin-left: 8px; }
  @media print { .bar { display: none !important; } }
</style></head>
<body>
  <div class="bar">
    이 창에서 인쇄하거나 <b>PDF로 저장</b>하실 수 있습니다.
    <button onclick="window.print()">인쇄 / PDF 저장</button>
  </div>

  <div class="sheet"><div class="frame"><div class="inner">

    <div class="title">撰 名 狀</div>
    <div class="birth">${esc(p.birthHanja || p.birthText)}${p.gender ? ` ${esc(p.gender)}` : ''}</div>

    <table class="name">
      <tr><td style="width:22mm"></td>${p.chars.map(nameCol).join('')}</tr>
      <tr class="lab"><td>劃　數</td>${p.chars.map((c) => `<td>${String(c.strokes ?? 0).padStart(2, '0')}</td>`).join('')}</tr>
      <tr class="lab"><td>音五行</td>${p.chars.map((c) => `<td>${oh(c.soundOhaeng)}</td>`).join('')}</tr>
      <tr class="lab"><td>字源五行</td>${p.chars.map((c) => `<td>${oh(c.resourceOhaeng)}</td>`).join('')}</tr>
    </table>

    ${gyeokRows ? `<div class="sep"></div>${gyeokRows}` : ''}

    <div class="two">
      <div>
        <h2>四 柱 原 局</h2>
        <div class="pils">${p.saju.map((x) => `
          <div class="pil"><div class="pil-t">${esc(x.pillar)}</div>
          <div class="pil-g">${esc(x.stem)}</div><div class="pil-b">${esc(x.branch)}</div></div>`).join('')}</div>
        <table class="info" style="margin-top:2mm">
          <tr><td class="k">生年月日時</td><td class="v">${esc(p.birthText)}</td></tr>
          <tr><td class="k">사주가 바라는 기운</td><td class="v">${esc(p.yongsin || '—')}</td></tr>
          <tr><td class="k">이름 총 획수</td><td class="v">${totalStrokes}획</td></tr>
        </table>
      </div>
      <div>
        <h2>살 펴 본 자 리</h2>
        <table class="info">
          ${p.lines.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('')}
        </table>
      </div>
    </div>

    ${(cMean || cEnd) ? `<h2>總 評</h2><div class="chong">
      ${cLine ? `<p class="cl">${esc(cLine)}</p>` : ''}
      ${cMean ? `<p>${esc(cMean)}</p>` : ''}
      ${cEnd ? `<p class="cend">${esc(cEnd)}</p>` : ''}
    </div>` : ''}

    <div class="foot">
      <div class="give">위와 같이 作名하여 撰名狀을 드립니다.</div>
      <div style="font-size:9.5pt;letter-spacing:2px;color:#4a3a28;margin-bottom:2.5mm">${esc(p.issuedAt)}</div>
      <div class="house">明 淵 齋 硏 究 所</div>
      <div class="master">
        院長 &nbsp;明淵齋
        <span class="seal">明淵齋<br>作名之印</span>
      </div>
      <div class="note">
        ⚠️ 이 撰名狀은 명리 해석에 따른 «참고 자료» 입니다. 법적 효력을 갖지 않습니다.<br>
        출생·개명 신고에는 대법원 인명용 한자만 쓸 수 있으니 한 번 더 확인해 주세요.
      </div>
    </div>

  </div></div></div>

  <script>
  /* ══════════════════════════════════════════════════════════════
     ★2026-08-01 (43부 15차) — A4 «한 장» 을 브라우저가 «재서» 맞춥니다

      🔴 [왜 필요한가]  總評은 AI 가 씁니다. 길이가 이름마다 크게 다릅니다.
         글자 수로 크기를 어림잡아 봤지만 800자·1100자에서 넘쳤습니다 —
         글자 수와 «줄 수» 가 비례하지 않기 때문입니다
         (줄바꿈 자리에 따라 한 줄이 통째로 늘어납니다).
         ⚠️ 한 장을 넘기면 «인장과 원장 이름» 이 둘째 장으로 밀립니다.
            증서에서 그것만은 있으면 안 됩니다.

      ★[방법]  실제 높이를 재서, 담길 때까지 總評 글자를 줄입니다.
      ⚠️ 6.4pt 를 «바닥» 으로 둡니다 — 그보다 작으면 어르신이 못 읽으십니다.
         바닥까지 줄여도 안 담기면 «넘치는 편» 을 고릅니다.
         못 읽는 증서보다 두 장이 낫습니다.
      ⚠️ mm→px 는 «기기마다 다릅니다». 279mm 짜리 자를 만들어 그 자로 잽니다.
         숫자를 박아 두면 어느 기기에서 반드시 어긋납니다.
     ══════════════════════════════════════════════════════════════ */
  (function fitToPage() {
    var frame = document.querySelector('.frame')
    var chong = document.querySelector('.chong')
    if (!frame || !chong) return
    /* ★279mm 가 몇 px 인지 «재서» 알아냅니다 (A4 297mm − 위아래 여백 9mm씩) */
    var ruler = document.createElement('div')
    ruler.style.cssText = 'position:absolute;visibility:hidden;height:279mm'
    document.body.appendChild(ruler)
    var limit = ruler.offsetHeight
    document.body.removeChild(ruler)
    if (!limit) return

    var size = parseFloat(getComputedStyle(chong).fontSize)
    /* ★바닥 7.2pt — 그보다 작으면 읽기 어렵습니다.
       ⚠️ 위에서 글을 이미 줄여 두었으므로 여기까지 내려갈 일은 드뭅니다. */
    var minPx = 7.2 * (limit / 279) * (25.4 / 72)
    var guard = 0
    while (frame.offsetHeight > limit && size > minPx && guard++ < 60) {
      size -= 0.3
      chong.style.fontSize = size + 'px'
      chong.style.lineHeight = '1.52'
    }
  })()
  </script>
</body></html>`
}

/** 새 창에 작명서를 띄웁니다. ★팝업이 막히면 «조용히» 넘어가지 않습니다 */
export function openCertificate(p: NamingCertificateProps): boolean {
  const w = window.open('', '_blank')
  if (!w) { p.onBlocked?.(); return false }
  w.document.write(buildCertificateHtml(p))
  w.document.close()
  return true
}

/** 결과 화면에 놓는 버튼 한 벌 */
// ══════════════════════════════════════════════════════════════════
// ★2026-08-05 (47부 20차) — 「새 창에서 인쇄 또는 PDF로 저장」 안내를 «걷어냈습니다».
//   [대표님 지시]  「공간을 줄이자…보기가 싫다」
//   🔴 ★오류 알림(msg)은 «남겼습니다» — 인쇄가 막히면 손님이 까닭을 알아야 합니다.
//      평소에는 msg 가 없어 ★칸이 통째로 안 그려집니다. 공간을 «안» 씁니다.
//   ⛔ 오류 알림까지 지우지 마십시오.
//   ⚠️ 이 부품은 ★작명 결과 · 이름 정밀분석 «둘» 이 씁니다. 양쪽에서 함께 사라집니다.
//   ⚠️ 진로적성의 같은 안내도 «함께» 걷었습니다. 한쪽만 하면 어긋납니다.
//
// ⛔⛔ ★이 파일에는 «인쇄용 HTML 문자열» 이 들어 있습니다.
//    검사 ⑦(28-verify-naming-flow)이 ★JSX 주석을 통째로 막습니다 —
//    HTML 문자열 안에 넣으면 ★종이에 그대로 «찍혀 나오기» 때문입니다.
//    ⇒ 이 파일에 설명을 적으실 때는 ★반드시 «줄 주석(//)» 으로 하십시오.
// ══════════════════════════════════════════════════════════════════
export default function NamingCertificateButton(
  p: NamingCertificateProps & { disabled?: boolean },
) {
  const [msg, setMsg] = React.useState<string | null>(null)
  return (
    <>
      <button
        disabled={p.disabled}
        onClick={() => {
          setMsg(null)
          const ok = openCertificate({
            ...p,
            onBlocked: () => setMsg('새 창이 막혀 있어요. 브라우저의 팝업 차단을 풀고 다시 눌러 주세요.'),
          })
          if (!ok) return
        }}
        className="active:scale-95"
        style={{
          // ══════════════════════════════════════════════════════════
          //  ★2026-08-02 — «컴팩트한 서브 버튼» 으로 줄입니다 (대표님 지시 ③)
          //
          //   [무엇이 있었나]  43부 28차에 이 버튼을 «으뜸» 으로 세우며
          //     16px 여백 · 15px 글자 · 그림자로 크게 키웠습니다.
          //     ★그랬더니 결과 «본문» 보다 이 버튼이 먼저 눈에 들어왔습니다.
          //     손님이 보러 오신 것은 «이름 풀이» 이지 인쇄 버튼이 아닙니다.
          //
          //   ★[이제]  높이와 여백을 줄입니다 (16→10, 15→13.5px).
          //   ⚠️ 색은 «채운 채로» 둡니다 — 이것만 색이 차 있어야
          //      아래 테두리 버튼들과 켜가 갈립니다. 크기로 낮추고 색으로 남깁니다.
          //   ⚠️ 그림자도 줄였습니다. 그림자가 크면 «작아도 커 보입니다».
          // ══════════════════════════════════════════════════════════
          width: '100%', padding: '10px 12px', borderRadius: 12, marginBottom: 5,
          background: p.disabled ? '#EDE7E0' : '#c8783c',
          border: 'none',
          color: p.disabled ? '#A99B8E' : '#fff',
          fontSize: 13.5, fontWeight: 600, letterSpacing: '-0.2px',
          boxShadow: p.disabled ? 'none' : '0 1px 4px rgba(200,120,60,0.20)',
          cursor: p.disabled ? 'default' : 'pointer',
        }}>
        🖨️ A4 명품 작명서 인쇄 · PDF 저장
      </button>
      {msg && (
        <div style={{ fontSize: 10.5, color: '#c8506e', textAlign: 'center', marginBottom: 10, lineHeight: 1.6 }}>
          {msg}
        </div>
      )}
    </>
  )
}
