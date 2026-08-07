'use client'

/**
 * SajuCertificate — 「내 사주와 운세보기」 A4 인쇄물의 «속».
 * ─────────────────────────────────────────────────────────────
 *  ★2026-08-07 신설 (48부 20차) — 대표님 지시
 *    「"내 사주와 운세결과 보기"도 다른 서비스 결과처럼
 *      ★"A4 PDF저장/인쇄"되게 해줘」
 *
 *  ⚠️ 틀(새 창·A4 규격·머리띠·쪽 나눔)은 ★app/components/common/A4Print.tsx 가 맡습니다.
 *     ⛔ 여기서 window.open 이나 @page 를 «다시 적지 마십시오».
 *        그렇게 해서 궁합·작명이 두 벌이 되었습니다 (44부 36차 교훈).
 *
 *  ══ 담는 것 ══
 *    ① 머리 — 「◯◯님의 사주와 운세」 + 생년월일·시진
 *    ② 사주 원국 넉 기둥 (오행 색 그대로)
 *    ③ ★통변 본문 — 화면이 쓰는 것 «그대로»
 *
 *  ⚠️ 값을 «다시 계산하지 않습니다» (교훈 CJ) —
 *     화면이 쓰는 것을 그대로 받습니다. 두 벌로 세면 종이와 화면이 다른 말을 합니다.
 *
 *  ⛔⛔ ★여기에 «JSX 주석»({‍/* *‍/})을 넣지 마십시오 —
 *     인쇄용 HTML 문자열이라 ★종이에 «찍혀 나옵니다» (47부 9-2 · 검사 ⑦).
 *     ⇒ 반드시 ★줄 주석(//)이나 이 블록 주석으로 적으십시오.
 */

import { openA4, esc, paraHtml } from '@/app/components/common/A4Print'
import { EL_BG, EL_C, EL_HAN } from '@/lib/saju/ohaengColor'

const ACCENT = '#96502e'

export interface SajuCertPillar {
  /** 시주·일주·월주·년주 */
  label: string
  stem: string
  branch: string
  stemEl: string
  branchEl: string
}

export interface SajuCertInput {
  /** 「◯◯님의 사주와 운세」 — 화면 제목을 그대로 받습니다 */
  title: string
  /** 생년월일 — 「음력 1966.1.12 · 卯시 · 남성」 */
  birth: string
  pillars: SajuCertPillar[]
  /** ★통변 본문 — 화면이 쓰는 것 그대로 */
  tong: string
}

/** 넉 기둥 표 — 화면의 오행 색을 그대로 씁니다 */
function pillarsHtml(ps: SajuCertPillar[]): string {
  if (!ps.length) return ''
  const cell = (ch: string, el: string) => {
    const bg = (EL_BG as Record<string, string>)[el] ?? '#f5f5f5'
    const co = (EL_C as Record<string, string>)[el] ?? '#333'
    const han = (EL_HAN as Record<string, string>)[el] ?? ''
    return `<td class="gz" style="background:${bg};color:${co}">`
      + `<div class="ch">${esc(ch)}</div>`
      + (han ? `<div class="el">${esc(han)}</div>` : '')
      + '</td>'
  }
  return '<table class="pil">'
    + '<tr>' + ps.map(p => `<th>${esc(p.label)}</th>`).join('') + '</tr>'
    + '<tr>' + ps.map(p => cell(p.stem, p.stemEl)).join('') + '</tr>'
    + '<tr>' + ps.map(p => cell(p.branch, p.branchEl)).join('') + '</tr>'
    + '</table>'
}

const CSS = `
  .head { border-bottom:2px solid ${ACCENT}; padding-bottom:8px; margin-bottom:14px }
  .head h1 { margin:0; font-size:19px; color:${ACCENT} }
  .head .sub { margin-top:4px; font-size:11px; color:#7a6a5c }
  .pil { border-collapse:separate; border-spacing:6px; margin:0 auto 16px }
  .pil th { font-size:10.5px; color:#7a6a5c; font-weight:400; padding-bottom:2px }
  .pil .gz { width:52px; height:52px; text-align:center; border-radius:8px; vertical-align:middle }
  .pil .ch { font-size:22px; line-height:1.1 }
  .pil .el { font-size:9.5px; opacity:.85; margin-top:1px }
  .foot { margin-top:20px; padding-top:10px; border-top:1px solid #e5d8cc;
          font-size:10px; color:#a08d7d; text-align:center; line-height:1.7 }
`

/**
 * 사주 A4 인쇄물을 새 창에 띄웁니다.
 *  ⚠️ 팝업이 막히면 A4Print 가 알려 줍니다. 여기서 다시 다루지 않습니다.
 */
export function openSajuCertificate(input: SajuCertInput) {
  const body =
    '<div class="head">'
    + `<h1>${esc(input.title)}</h1>`
    + (input.birth ? `<div class="sub">${esc(input.birth)}</div>` : '')
    + '</div>'
    + pillarsHtml(input.pillars)
    + `<div class="sec">${paraHtml(input.tong)}</div>`
    + '<div class="foot">사주는 참고입니다. 길은 본인의 노력과 의지로 얼마든지 바꿀 수 있어요.</div>'

  return openA4({
    title: input.title,
    accent: ACCENT,
    css: CSS,
    bodyHtml: body,
  })
}
