'use client'

/**
 * A4Print — A4 인쇄물을 새 창에 띄우는 «공용 틀».
 * ─────────────────────────────────────────────────────────────
 *  ★2026-08-03 신설 — 대표님 지시 「A4 PDF저장/인쇄도 공용 부품화하면 좋겠다」 (44부 36차)
 *
 *  ══ 무엇을 맡고, 무엇을 안 맡는가 ══
 *
 *   ★맡는 것 (여기 «한 곳» 입니다)
 *     · 새 창 열기 · ★팝업 막힘 알림 · document.write · close
 *     · @page A4 · 여백 · print-color-adjust
 *     · 인쇄 머리띠 (인쇄 버튼 + 안내) · @media print 로 머리띠 감추기
 *     · 쪽 나눔 기본 (.sec / h2 / .sol)
 *     · 글꼴 · 바탕색 · 본문 크기
 *
 *   🔴안 맡는 것 — «속 내용» 은 서비스마다 «전혀» 다릅니다
 *     궁합  명식 둘 + 오행 그래프 · 작명  한자·획수·수리 4격 · 진로  판정 카드
 *     ⇒ ★속까지 하나로 만들려 들면 «모든 서비스를 담는 거대한 부품» 이 되어
 *       오히려 못 고치게 됩니다. 44부에 지장간 표를 «일부러» 둘 둔 것과 같은 판단입니다.
 *     ⇒ 서비스는 «속 만드는 함수» 만 두고, 틀은 여기에 넘깁니다.
 *
 *  ⚠️⚠️ 화면마다 window.open + @page 를 «다시 적지 마십시오».
 *     그렇게 해서 궁합·작명 두 벌이 되었고, 진로적성에는 아예 «없었습니다».
 *
 *  ⚠️ PDF 라이브러리를 «더하지 않습니다» (교훈 [의존])
 *     한글 글꼴을 함께 실어야 해 꾸러미가 몇 MB 늘고,
 *     안 실으면 ★«글자가 깨진» 인쇄물이 손님께 나갑니다. 그것이 더 나쁩니다.
 *     ★브라우저 인쇄가 어느 기기에서나 「PDF로 저장」을 함께 줍니다.
 */

export interface A4PrintInput {
  /** 새 창 제목 */
  title: string
  /** 서비스 색 — 머리띠에 씁니다 */
  accent?: string
  /** 여백 (mm). ★기본 12 — 글이 긴 리포트 기준. 작명 선명장은 9 를 넘겨 씁니다 */
  marginMm?: number
  /** 서비스가 더할 CSS */
  css?: string
  /** 서비스가 만든 «속» — .wrap 안에 그대로 들어갑니다 */
  bodyHtml: string
}

/** HTML 에 그대로 넣어도 되도록 다듬습니다 */
export function esc(s: string): string {
  return (s ?? '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string))
}

/**
 * 빈 줄로 문단을 나눠 그립니다.
 *  ★「→」로 시작하는 줄은 «솔루션» 이라 눈에 띄게 (.sol) — 화면과 같은 결입니다.
 */
export function paraHtml(text: string): string {
  return (text ?? '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean)
    .map(b => /^\s*(→|➔|➡)/.test(b)
      ? `<div class="sol">${esc(b.replace(/^\s*[→➔➡]\s*/, '→ '))}</div>`
      : `<p>${esc(b).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

/**
 * 새 창에 A4 인쇄물을 띄웁니다.
 *  ⚠️ 팝업이 막히면 «조용히 넘어가지 않고» 까닭을 돌려줍니다. (교훈 U)
 */
export function openA4(d: A4PrintInput): { ok: boolean; message?: string } {
  const w = window.open('', '_blank')
  if (!w) {
    return {
      ok: false,
      message: '팝업이 막혀 있어 인쇄 창을 열지 못했어요. '
        + '브라우저 주소창 옆의 «팝업 허용» 을 눌러 주신 뒤 다시 시도해 주세요.',
    }
  }
  const accent = d.accent ?? '#b48a3c'
  const mm = d.marginMm ?? 12

  w.document.write(`<!doctype html><html lang="ko"><head><meta charset="utf-8">
<title>${esc(d.title)}</title>
<style>
  @page { size: A4; margin: ${mm}mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; background: #fff; color: #2b2320; font-size: 10.5pt; line-height: 1.75;
    font-family: 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;
  }
  .bar {
    position: sticky; top: 0; background: ${accent}; color: #fff;
    padding: 10px 14px; display: flex; gap: 10px; align-items: center; justify-content: center;
  }
  .bar button {
    background: #fff; color: ${accent}; border: 0; border-radius: 8px;
    padding: 8px 16px; font-size: 14px; font-weight: 700; cursor: pointer;
  }
  .bar span { font-size: 12.5px }
  .wrap { max-width: ${210 - mm * 2}mm; margin: 0 auto; padding: 14px 0 30px }

  .sec { margin-top: 14px }
  .sec h2 {
    margin: 0 0 8px; font-size: 12pt; font-weight: 700; display: flex; align-items: center; gap: 7px;
    padding-bottom: 6px; border-bottom: 1px solid #ece5de;
    page-break-after: avoid; break-after: avoid;
  }
  .sec p { margin: 0 0 8px }
  .sol {
    margin: 9px 0; background: #f6f9f6; border-left: 2.5px solid #3c9a6e;
    border-radius: 0 6px 6px 0; padding: 8px 11px; color: #2f5c46;
    page-break-inside: avoid; break-inside: avoid;
  }
  .foot { margin-top: 18px; padding-top: 10px; border-top: 1px solid #ece5de;
          font-size: 8.5pt; color: #9a8f86; text-align: center; line-height: 1.7 }

  @media print { .bar { display: none !important } .wrap { padding-top: 0 } }
${d.css ?? ''}
</style></head><body>
  <div class="bar">
    <button onclick="window.print()">인쇄 / PDF 저장</button>
    <span>버튼을 누르신 뒤 «PDF로 저장» 을 고르시면 파일로 남습니다.</span>
  </div>
  <div class="wrap">${d.bodyHtml}</div>
</body></html>`)
  w.document.close()
  return { ok: true }
}
