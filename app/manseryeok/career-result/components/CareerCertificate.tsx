'use client'

/**
 * CareerCertificate — 진로적성 A4 인쇄물의 «속».
 * ─────────────────────────────────────────────────────────────
 *  ★2026-08-03 신설 — 대표님 지시 (44부 36차)
 *
 *  ⚠️ 틀(새 창·A4 규격·머리띠·쪽 나눔)은 ★app/components/common/A4Print.tsx 가 맡습니다.
 *     여기서 window.open 이나 @page 를 «다시 적지 마십시오».
 *
 *  ══ 담는 것 (2026-08-03 대표님 확정 — 「모두 담을 것」) ══
 *    ① 머리 — 「◯◯님의 진로적성」 + 신분 배지
 *    ② 사주 원국 넉 기둥 (오행 색 그대로)
 *    ③ ★AI 프리미엄 리포트 — 대목 차례대로
 *       ⚠️ MBTI 를 안 넣으신 분은 1·2번 대목이 «없습니다» (44부 35차)
 *    ④ ★판정 카드 — 근거까지 (격과 그릇 · 신살 · 직무 …)
 *    ⑤ 맺음 — 화면과 «같은 줄»
 *
 *  ⚠️ 값을 «다시 계산하지 않습니다» (교훈 CJ) —
 *     화면이 쓰는 것을 그대로 받습니다. 두 벌로 세면 종이와 화면이 다른 말을 합니다.
 */

import { openA4, esc, paraHtml } from '@/app/components/common/A4Print'
import { splitCardText } from '@/lib/saju/premium/splitCardText'
import { EL_BG, EL_C, EL_HAN } from '@/lib/saju/ohaengColor'

const ACCENT = '#785aaa'

export interface CareerCertPillar {
  /** 시·일·월·년 */
  label: string
  stem: string
  branch: string
  stemEl: string
  branchEl: string
}

export interface CareerCertInput {
  name: string
  /** 생년월일 — 「1988.4.20」 */
  birth: string
  /** 신분 배지 — 「직장인 · 성인」 */
  badge: string
  pillars: CareerCertPillar[]
  /** ★AI 리포트 대목 — 화면이 쓰는 것 그대로 */
  sections: Array<{ title: string; body: string }>
  /** ★판정 카드 — 근거 (대표님 「모두 담을 것」) */
  cards: Array<{ title: string; badge?: string; lines: string[] }>
  /**
   * ★화면 카드 사이에 끼는 «표» — 오행·십성·신강·용신 (44부 37차)
   *
   *  🔴 [까닭]  대표님이 뽑으신 첫 PDF 에 ★「설명하는 표가 모두 사라졌다」 하셨습니다.
   *    화면에는 SajuTableSlot 이 네 가지를 그리는데 종이에는 «하나도» 없었습니다.
   *  ⚠️ 화면 부품은 React(오각형 SVG·표)라 종이에 그대로 못 옮깁니다.
   *     ★«값» 을 받아 인쇄용 표로 다시 그립니다.
   *  ⚠️⚠️ 값을 «다시 계산하지 않습니다» — 화면이 쓰는 것을 그대로 받습니다. (교훈 CJ)
   */
  tables?: {
    /** 오행 세력 — 목·화·토·금·수 백분율 */
    ohaeng?: Array<{ el: string; pct: number }>
    /** 십성 세력 */
    sipsung?: Array<{ ss: string; pct: number }>
    /** 용신 세 갈래 — 조후 · 억부 · 격국 */
    yongsin?: { johu?: string; eokbu?: string; gyeokguk?: string; strength?: string }
  }
}

/** 넉 기둥 — 화면(SajuWonguk)과 «같은 차례» 로 그립니다 */
function pillarHtml(ps: CareerCertPillar[]): string {
  const cell = (ch: string, el: string) =>
    `<td class="gz" style="background:${EL_BG[el] ?? '#eee'};color:${EL_C[el] ?? '#222'}"><span>${esc(ch)}</span></td>`
  return `<table class="gztbl">
    <tr>${ps.map(p => `<td class="lb">${esc(p.label)}</td>`).join('')}</tr>
    <tr>${ps.map(p => cell(p.stem, p.stemEl)).join('')}</tr>
    <tr>${ps.map(p => cell(p.branch, p.branchEl)).join('')}</tr>
  </table>`
}

/** 인쇄용 가로 막대 표 — ★화면 오각형·표를 «값 그대로» 옮겨 그립니다 */
function barTable(rows: Array<{ name: string; pct: number; color?: string }>): string {
  const max = Math.max(1, ...rows.map(r => r.pct))
  return `<table class="btbl">${rows.map(r => `<tr>
    <td class="bn">${esc(r.name)}</td>
    <td class="bb"><i style="width:${Math.round((r.pct / max) * 100)}%;background:${r.color ?? '#b9a9dd'}"></i></td>
    <td class="bp">${r.pct}</td>
  </tr>`).join('')}</table>`
}

const CSS = `
  .head { text-align: center; padding-bottom: 12px; border-bottom: 1.4px solid #d8cec4 }
  .head .kind { font-size: 9pt; letter-spacing: .12em; color: #6b5a90 }
  .head h1 { margin: 5px 0 0; font-size: 17pt; font-weight: 700 }
  .head .who { font-size: 9pt; color: #7a6a60; margin-top: 4px }
  .head .badge {
    display: inline-block; margin-top: 8px; font-size: 11pt; font-weight: 700;
    color: #5b4580; border: 1px solid #ddd3ef; border-radius: 9px; padding: 5px 14px;
  }
  .wonguk { margin: 14px auto 6px; max-width: 110mm; page-break-inside: avoid; break-inside: avoid }
  .gztbl { width: 100%; border-collapse: separate; border-spacing: 3px }
  .gztbl .lb { text-align: center; font-size: 7.5pt; color: #a89a90 }
  .gz { text-align: center; height: 26px; border-radius: 4px; font-size: 13pt; font-weight: 700 }

  .sec h2 i {
    flex: none; width: 17px; height: 17px; border-radius: 5px; background: #f0ecfa;
    color: #5b4580; font-size: 8.5pt; font-weight: 700; font-style: normal;
    display: inline-flex; align-items: center; justify-content: center;
  }
  .one { color: #5b4580; font-weight: 700; margin: 0 0 7px }
  .tags { margin: 0 0 8px }
  .tags span {
    display: inline-block; font-size: 8pt; color: #5b4580; background: #f3eefb;
    border: 1px solid #e4daf5; border-radius: 20px; padding: 2px 9px; margin: 0 4px 3px 0;
  }
  .act {
    margin: 9px 0; background: #fdf6ee; border-left: 2.5px solid #c8783c;
    border-radius: 0 6px 6px 0; padding: 8px 11px; color: #6b4a2e;
    page-break-inside: avoid; break-inside: avoid;
  }
  .cards { margin-top: 18px; padding-top: 12px; border-top: 1.4px solid #d8cec4 }
  .cards > .t { font-size: 9pt; color: #8a7063; margin-bottom: 8px }
  .card { margin-bottom: 10px; page-break-inside: avoid; break-inside: avoid }
  .card .ct { font-size: 10.5pt; font-weight: 700; margin-bottom: 3px }
  .card .cb {
    font-size: 8pt; color: #5b4580; background: #f3eefb; border-radius: 6px;
    padding: 1px 8px; margin-left: 6px; font-weight: 400;
  }
  .card p { margin: 0 0 3px; font-size: 9.5pt; color: #4a3a30 }

  .tbox { margin: 10px 0 4px; page-break-inside: avoid; break-inside: avoid }
  .tbox > .t { font-size: 8.5pt; color: #8a7063; margin-bottom: 5px }
  .btbl { width: 100%; border-collapse: collapse }
  .btbl td { padding: 2px 0; vertical-align: middle }
  .btbl .bn { width: 16mm; font-size: 8.5pt; color: #5b4580; white-space: nowrap }
  .btbl .bp { width: 12mm; text-align: right; font-size: 8.5pt; color: #7a6a60 }
  .btbl .bb i { display: block; height: 10px; border-radius: 2px }
  .ys { font-size: 9.5pt; color: #3a2e28 }
  .ys b { color: #5b4580 }
`

export function openCareerCertificate(d: CareerCertInput): { ok: boolean; message?: string } {
  const secs = d.sections.map((s, i) => {
    // ★[한줄]·[태그]·[실천] 을 갈라 그립니다 — 화면과 «같은 파서» 입니다 (44부 30차)
    const p = splitCardText(s.body)
    return `<section class="sec">
      <h2><i>${i + 1}</i>${esc(s.title)}</h2>
      ${p.summary ? `<p class="one">${esc(p.summary)}</p>` : ''}
      ${p.tags?.length ? `<div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join('')}</div>` : ''}
      ${paraHtml(p.body)}
      ${p.action ? `<div class="act">${esc(p.action)}</div>` : ''}
    </section>`
  }).join('')

  // ★판정 카드 — 「모두 담을 것」 (대표님 확정). 풀이의 «근거» 라 상담에 씁니다
  const cards = d.cards.length ? `<div class="cards">
    <div class="t">아래는 위 풀이의 근거가 된 판정입니다</div>
    ${d.cards.map(c => `<div class="card">
      <div class="ct">${esc(c.title)}${c.badge ? `<span class="cb">${esc(c.badge)}</span>` : ''}</div>
      ${c.lines.map(l => `<p>${esc(l)}</p>`).join('')}
    </div>`).join('')}
  </div>` : ''

  // ★표 — 화면 SajuTableSlot 이 그리던 넷을 종이에 옮깁니다
  const t = d.tables
  const tbl = !t ? '' : [
    t.ohaeng?.length ? `<div class="tbox"><div class="t">오행의 세력</div>${
      barTable(t.ohaeng.map(o => ({
        name: `${o.el}(${EL_HAN[o.el] ?? ''})`, pct: o.pct, color: EL_BG[o.el],
      })))}</div>` : '',
    t.sipsung?.length ? `<div class="tbox"><div class="t">십성의 세력</div>${
      barTable(t.sipsung.map(x => ({ name: x.ss, pct: x.pct })))}</div>` : '',
    t.yongsin ? `<div class="tbox"><div class="t">어떤 기운이 나를 돕는가</div>
      <div class="ys">
        ${t.yongsin.strength ? `힘의 세기 <b>${esc(t.yongsin.strength)}</b><br>` : ''}
        ${t.yongsin.eokbu ? `억부용신 <b>${esc(t.yongsin.eokbu)}</b> · ` : ''}
        ${t.yongsin.johu ? `조후용신 <b>${esc(t.yongsin.johu)}</b> · ` : ''}
        ${t.yongsin.gyeokguk ? `격국용신 <b>${esc(t.yongsin.gyeokguk)}</b>` : ''}
      </div></div>` : '',
  ].filter(Boolean).join('')

  return openA4({
    title: `${d.name || '진로적성'} — 진로적성`,
    accent: ACCENT,
    // ★12mm — 궁합서와 같게 (2026-08-03 대표님 확정). 글이 길어 숨 쉴 자리가 필요합니다
    marginMm: 12,
    css: CSS,
    bodyHtml: `
      <div class="head">
        <div class="kind">진로적성</div>
        <h1>${esc(d.name || '이름 없음')}님의 진로적성</h1>
        ${d.birth ? `<div class="who">${esc(d.birth)}</div>` : ''}
        ${d.badge ? `<div class="badge">${esc(d.badge)}</div>` : ''}
      </div>
      <div class="wonguk">${pillarHtml(d.pillars)}</div>
      ${tbl}
      ${secs}
      ${cards}
      <div class="foot">
        사주는 참고입니다. 길은 본인의 노력과 의지로 얼마든지 바꿀 수 있어요.
      </div>`,
  })
}
