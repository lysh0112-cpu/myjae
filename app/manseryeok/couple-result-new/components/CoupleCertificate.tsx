// app/manseryeok/couple-result-new/components/CoupleCertificate.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  ★A4 궁합서 — 리포트를 «인쇄·PDF» 로                            │
// └───────────────────────────────────────────────────────────────┘
//
//  ★2026-08-03 신설 — 대표님 지시 (44부 23차)
//
//  ══ [왜 PDF 라이브러리를 쓰지 않는가] ══
//    ① 한글 글꼴을 함께 실어야 해서 꾸러미가 몇 MB 늘어납니다.
//       ⚠️ 안 실으면 «글자가 깨진» 궁합서가 손님께 나갑니다.
//    ② 의존을 더하면 package-lock 까지 함께 올려야 합니다 (교훈 [의존]).
//    ★브라우저의 «인쇄» 는 어느 기기에서나 「PDF로 저장」을 함께 줍니다.
//      아이폰·안드로이드·PC 모두 됩니다.
//    ⇒ ★43부 선명장(NamingCertificate)과 «같은 방식» 입니다. 전례를 따릅니다.
//
//  ══ [왜 새 창을 여는가] ══
//    지금 화면에 @media print 를 걸면 «화면의 다른 것» 을 전부 숨겨야 하고,
//    한 군데만 빠뜨려도 궁합서에 버튼이 찍혀 나갑니다.
//    ★따로 만든 문서를 새 창에 띄우면 «그것만» 인쇄됩니다. 어긋날 자리가 없습니다.
//
//  ⚠️⚠️ 이 부품은 «판정을 하지 않습니다». 받은 값을 그리기만 합니다. (교훈 CJ)
//  ⚠️ 팝업 차단에 걸릴 수 있습니다. ★조용히 실패하지 않고 알려 드립니다. (교훈 U)
//
//  ⚠️ 오행 그래프는 ★«가운데가 0» 인 양방향으로 그립니다 —
//     화면(OhaengCompareCard)과 «같은 모양» 이라야 합니다. 대표님 지시입니다.

'use client'

import { OHAENG_ORDER } from '@/lib/saju/ohaengCompare'
import { EL_BG } from '@/lib/saju/ohaengColor'

export interface CertPerson {
  name: string
  birth: string
  /** 시·일·월·년 차례 (화면과 같은 차례) */
  pillars: Array<{ label: string; stem: string; branch: string; stemEl: string; branchEl: string }>
}

export interface CertOhaengRow {
  el: string
  /** 왼쪽(아내/A) */
  a: number
  /** 오른쪽(남편/B) */
  b: number
}

export interface CoupleCertInput {
  kindLabel: string          // 「부부 궁합」 / 「연인 궁합」
  badge: string              // 「기운을 채워 주는 사이」
  a: CertPerson
  b: CertPerson
  aLabel: string             // 「아내」 / 이름
  bLabel: string             // 「남편」 / 이름
  intro: string
  sections: Array<{ title: string; body: string }>
  outro: string
  ohaeng?: { rows: CertOhaengRow[]; similarity: number; complement: number }
}

const EL_TEXT: Record<string, string> = {
  목: '#2e7d32', 화: '#c62828', 토: '#b8801a', 금: '#8a8a8a', 수: '#2b2b2b',
}
const EL_LABEL: Record<string, string> = {
  목: '목 나무', 화: '화 불', 토: '토 흙', 금: '금 쇠', 수: '수 물',
}

/** 화면에 그대로 찍히면 안 되는 글자를 막습니다 */
function esc(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 문단을 나눠 그립니다. ★「→」로 시작하는 줄은 «솔루션» 이라 따로 그립니다 */
function paraHtml(text: string): string {
  return text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean).map(b => {
    if (/^\s*[→➔➡]/.test(b)) {
      return `<div class="sol">${esc(b.replace(/^\s*[→➔➡]\s*/, '→ '))}</div>`
    }
    return `<p>${esc(b)}</p>`
  }).join('')
}

/**
 * ★오행 그래프 — «가운데가 0» 인 양방향 (화면과 같은 모양)
 *
 *   [이름]  아내 막대 ◀─(0)─▶ 남편 막대  [이름]
 *   ⚠️ 인쇄에서도 «깨지지 않아야» 합니다 — 대표님 지시.
 *      ★그래서 flex 가 아니라 «표(table)» 로 그립니다. 인쇄 엔진마다
 *        flex 를 다르게 재는 일이 있어, 표가 가장 안전합니다.
 */
function ohaengHtml(o: NonNullable<CoupleCertInput['ohaeng']>, aLabel: string, bLabel: string): string {
  const maxV = Math.max(1, ...o.rows.flatMap(r => [r.a, r.b]))
  const pct = (v: number) => `${Math.round((v / maxV) * 100)}%`
  const rows = OHAENG_ORDER.map(el => {
    const row = o.rows.find(x => x.el === el) ?? { el, a: 0, b: 0 }
    const geum = el === '금' ? 'border:0.4px solid #c8c8c8;' : ''
    const nm = `<span style="color:${EL_TEXT[el]}">${EL_LABEL[el]}</span>`
    return `<tr>
      <td class="onm r">${nm}</td>
      <td class="obar l"><i style="width:${pct(row.a)};background:${EL_BG[el]};${geum}"></i></td>
      <td class="obar rr"><i style="width:${pct(row.b)};background:${EL_BG[el]};${geum}"></i></td>
      <td class="onm l">${nm}</td>
    </tr>`
  }).join('')
  return `
  <div class="ograph">
    <div class="oscore">
      <span>닮은 정도 <b>${o.similarity}%</b></span>
      <span>채워 주는 정도 <b>${o.complement}%</b></span>
    </div>
    <table class="otbl">
      <tr class="ohead">
        <td></td><td class="l">◀ ${esc(aLabel)}</td>
        <td class="rr">${esc(bLabel)} ▶</td><td></td>
      </tr>
      ${rows}
    </table>
  </div>`
}

function pillarHtml(p: CertPerson): string {
  const cell = (ch: string, el: string) =>
    `<td class="gz e-${el}"><span>${esc(ch)}</span></td>`
  return `
  <div class="who">
    <div class="wnm">${esc(p.name)}</div>
    <div class="wbt">${esc(p.birth)}</div>
    <table class="gztbl">
      <tr>${p.pillars.map(x => `<td class="lb">${esc(x.label)}</td>`).join('')}</tr>
      <tr>${p.pillars.map(x => cell(x.stem, x.stemEl)).join('')}</tr>
      <tr>${p.pillars.map(x => cell(x.branch, x.branchEl)).join('')}</tr>
    </table>
  </div>`
}

/** ★새 창을 열어 인쇄합니다. 실패하면 «조용히 넘어가지 않습니다» (교훈 U) */
export function openCoupleCertificate(d: CoupleCertInput): { ok: boolean; message?: string } {
  const w = window.open('', '_blank')
  if (!w) {
    return {
      ok: false,
      message: '팝업이 막혀 있어 궁합서를 열지 못했어요. '
        + '브라우저 주소창 옆의 «팝업 허용» 을 눌러 주신 뒤 다시 시도해 주세요.',
    }
  }

  // ★그래프는 「오행」이 든 대목 «안» 에 넣습니다 (화면과 같은 자리)
  const graphIdx = d.sections.findIndex(s => /오행|채워|기운/.test(s.title))
  const secsWithGraph = d.sections.map((s, i) => `
    <section class="sec">
      <h2><i>${i + 1}</i>${esc(s.title)}</h2>
      ${i === graphIdx && d.ohaeng ? ohaengHtml(d.ohaeng, d.aLabel, d.bLabel) : ''}
      ${paraHtml(s.body)}
    </section>`).join('')

  w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(d.kindLabel)} — ${esc(d.a.name)} · ${esc(d.b.name)}</title>
<style>
  /* ★A4 — 여백 12mm. 선명장(9mm)보다 조금 넓게: 글이 길어 숨 쉴 자리가 필요합니다 */
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; background: #fff; color: #2b2320; font-size: 10.5pt; line-height: 1.75;
    font-family: 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;
  }
  .bar {
    position: sticky; top: 0; background: #b48a3c; color: #fff;
    padding: 10px 14px; display: flex; gap: 10px; align-items: center; justify-content: center;
  }
  .bar button {
    background: #fff; color: #8a5a2e; border: 0; border-radius: 8px;
    padding: 8px 16px; font-size: 14px; font-weight: 700; cursor: pointer;
  }
  .bar span { font-size: 12.5px }
  .wrap { max-width: 186mm; margin: 0 auto; padding: 14px 0 30px }

  /* ── 머리 ── */
  .head { text-align: center; padding-bottom: 12px; border-bottom: 1.4px solid #d8cec4 }
  .head .kind { font-size: 9pt; letter-spacing: .12em; color: #96702e }
  .head h1 { margin: 5px 0 0; font-size: 17pt; font-weight: 700 }
  .head .badge {
    display: inline-block; margin-top: 8px; font-size: 11pt; font-weight: 700;
    color: #8a5a2e; border: 1px solid #e2d3c2; border-radius: 9px; padding: 5px 14px;
  }

  /* ── 명식 ── */
  .pair { display: flex; gap: 14px; justify-content: center; align-items: flex-start;
          margin: 14px 0 6px }
  .who { flex: 1; max-width: 78mm }
  .wnm { text-align: center; font-size: 11pt; font-weight: 700 }
  .wbt { text-align: center; font-size: 8.5pt; color: #7a6a60; margin-bottom: 5px }
  .gztbl { width: 100%; border-collapse: separate; border-spacing: 2px }
  .gztbl .lb { text-align: center; font-size: 7.5pt; color: #a89a90 }
  .gz { text-align: center; height: 26px; border-radius: 4px; font-size: 13pt; font-weight: 700 }
  .gz span { line-height: 1 }
  .e-목 { background:#2e7d32; color:#fff } .e-화 { background:#c62828; color:#fff }
  .e-토 { background:#e8a317; color:#3a2c10 } .e-금 { background:#b8b8b8; color:#2b2b2b }
  .e-수 { background:#2b2b2b; color:#fff }
  .heart { align-self: center; color:#c85a6e; font-size: 12pt; padding-top: 26px }

  /* ── 여는말 ── */
  .intro { background:#faf7f3; border-radius:8px; padding:11px 13px; margin:12px 0 4px }
  .intro p { margin: 0 0 8px } .intro p:last-child { margin: 0 }

  /* ── 대목 ── */
  .sec { margin-top: 14px; page-break-inside: auto; break-inside: auto }
  .sec h2 {
    margin: 0 0 8px; font-size: 12pt; font-weight: 700; display: flex; align-items: center; gap: 7px;
    padding-bottom: 6px; border-bottom: 1px solid #ece5de;
    page-break-after: avoid; break-after: avoid;   /* ★제목만 홀로 남지 않게 */
  }
  .sec h2 i {
    flex: none; width: 17px; height: 17px; border-radius: 5px; background:#f5ede4;
    color:#96702e; font-size: 8.5pt; font-weight: 700; font-style: normal;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .sec p { margin: 0 0 8px }
  /* ★「→」 솔루션 — 화면과 같이 눈에 띄게 */
  .sol {
    margin: 9px 0; background:#f6f9f6; border-left: 2.5px solid #3c9a6e;
    border-radius: 0 6px 6px 0; padding: 8px 11px; color:#2f5c46;
    page-break-inside: avoid; break-inside: avoid;
  }

  /* ── ★오행 그래프 — 가운데가 0 인 양방향 ── */
  .ograph { margin: 4px 0 12px; page-break-inside: avoid; break-inside: avoid }
  .oscore { display:flex; gap:10px; justify-content:center; font-size:9pt;
            color:#7a5638; margin-bottom:8px }
  .oscore b { color:#96502e }
  .otbl { width: 100%; border-collapse: collapse; table-layout: fixed }
  .otbl .ohead td { font-size: 8pt; color:#8a6a52; padding-bottom: 4px }
  .otbl td { padding: 2.5px 0 }
  .otbl .onm { width: 15mm; font-size: 8.5pt; white-space: nowrap }
  .otbl .onm.r { text-align: right; padding-right: 4px }
  .otbl .onm.l { text-align: left;  padding-left: 4px }
  .otbl .obar i { display: block; height: 11px; border-radius: 2px }
  .otbl .obar.l  { text-align: right }
  .otbl .obar.l  i { margin-left: auto; border-radius: 2px 0 0 2px }
  .otbl .obar.rr i { margin-right: auto; border-radius: 0 2px 2px 0 }
  /* ★가운데 0 선 — 두 막대가 여기서 시작합니다 */
  .otbl .obar.l { border-right: 1px solid #e0d6cc }

  /* ── 맺음 ── */
  .end { margin-top: 16px; background:#fffdfa; border:1px solid #ece0d4;
         border-radius:8px; padding: 13px 14px }
  .end h2 { margin: 0 0 8px; font-size: 12pt; font-weight: 700 }

  .foot { margin-top: 16px; padding-top: 10px; border-top: 1px solid #e6ded6;
          font-size: 8.5pt; color:#9a8f86; text-align: center; line-height: 1.7 }

  @media print { .bar { display: none !important } .wrap { padding-top: 0 } }
</style></head><body>
  <div class="bar">
    <button onclick="window.print()">인쇄 / PDF 저장</button>
    <span>버튼을 누르신 뒤 «PDF로 저장» 을 고르시면 파일로 남습니다.</span>
  </div>
  <div class="wrap">
    <div class="head">
      <div class="kind">${esc(d.kindLabel)}</div>
      <h1>${esc(d.a.name)} · ${esc(d.b.name)}</h1>
      ${d.badge ? `<div class="badge">${esc(d.badge)}</div>` : ''}
    </div>

    <div class="pair">
      ${pillarHtml(d.a)}
      <div class="heart">&#10084;</div>
      ${pillarHtml(d.b)}
    </div>

    ${d.intro.trim() ? `<div class="intro">${paraHtml(d.intro)}</div>` : ''}
    ${secsWithGraph}
    ${d.outro.trim() ? `<div class="end"><h2>맺음말</h2>${paraHtml(d.outro)}</div>` : ''}

    <div class="foot">
      이 풀이는 흔한 기준으로 본 것이니, 상담사와 한 번 더 맞춰 보시면 더 정확해집니다.<br>
      사주는 참고입니다. 길은 두 분이 함께 만들어 가시는 것입니다.
    </div>
  </div>
</body></html>`)
  w.document.close()
  return { ok: true }
}
