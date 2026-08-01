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
  resourceOhaeng: string
  /** 뜻 (한자 표의 meaning). 없으면 비웁니다 */
  meaning?: string
  role: '성' | '이름'
}

export interface CertPillar { pillar: string; stem: string; branch: string }

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
  /** 맺음말 (AI 통변의 conclusion). 없으면 그 칸을 안 그립니다 */
  conclusion?: string
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

/** A4 한 장짜리 문서를 «글자로» 짓습니다. ★여기가 작명서의 모양입니다 */
export function buildCertificateHtml(p: NamingCertificateProps): string {
  const sur = p.chars.filter(c => c.role === '성')
  const giv = p.chars.filter(c => c.role === '이름')
  const totalStrokes = p.chars.reduce((a, c) => a + (c.strokes || 0), 0)

  const charCell = (c: CertChar) => `
    <div class="ch">
      <div class="ch-hanja">${esc(c.hanja)}</div>
      <div class="ch-hangul">${esc(c.hangul)}</div>
      <div class="ch-meta">${esc(c.meaning || '')}</div>
      <div class="ch-meta2">${esc(c.resourceOhaeng || '—')} · ${c.strokes}획</div>
    </div>`

  const sajuCell = (x: CertPillar) => `
    <div class="pil">
      <div class="pil-t">${esc(x.pillar)}</div>
      <div class="pil-g">${esc(x.stem)}</div>
      <div class="pil-b">${esc(x.branch)}</div>
    </div>`

  return `<!doctype html>
<html lang="ko"><head><meta charset="utf-8">
<title>${esc(p.hanjaName || p.hangulName)} 작명서</title>
<style>
  /* ⚠️ A4 한 장에 «반드시» 담기게 — 넘치면 두 장으로 갈라져 인증서 꼴이 안 납니다 */
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    margin: 0; font-family: 'Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif;
    color: #3a2e28; background: #fff;
  }
  .sheet { width: 182mm; margin: 0 auto; }
  .frame { border: 1.2mm solid #c8783c; padding: 9mm 8mm; position: relative; }
  .frame::after {
    content: ''; position: absolute; inset: 2mm; border: 0.3mm solid #e0b98f; pointer-events: none;
  }
  .head { text-align: center; margin-bottom: 6mm; }
  .kind {
    display: inline-block; font-size: 8pt; letter-spacing: 2px; color: #fff;
    background: ${p.kind === '신생아' ? '#4a7c59' : '#8f3d0e'};
    padding: 1mm 4mm; border-radius: 6mm;
  }
  .title { font-size: 20pt; font-weight: 700; letter-spacing: 8px; margin: 3mm 0 1mm; color: #8f3d0e; }
  .sub { font-size: 8.5pt; color: #8a7063; letter-spacing: 1px; }
  .name-hanja { font-size: 40pt; font-weight: 700; letter-spacing: 10px; color: #3a2e28; margin: 5mm 0 1mm; }
  .name-hangul { font-size: 12pt; color: #6b5340; letter-spacing: 3px; }
  .rule { height: 0.3mm; background: #e0b98f; margin: 6mm 0 5mm; }
  h2 {
    font-size: 9pt; font-weight: 700; color: #96502e; margin: 0 0 2.5mm;
    letter-spacing: 1px; border-left: 1mm solid #c8783c; padding-left: 2.5mm;
  }
  .chars { display: flex; gap: 3mm; justify-content: center; margin-bottom: 5mm; }
  .ch { flex: 1; max-width: 30mm; text-align: center; border: 0.3mm solid #f0e0d5; border-radius: 2mm; padding: 3mm 1mm; background: #fffbf7; }
  .ch-hanja { font-size: 20pt; font-weight: 700; color: #8f3d0e; line-height: 1.1; }
  .ch-hangul { font-size: 9pt; color: #6b5340; margin-top: 1mm; }
  .ch-meta { font-size: 7pt; color: #8a7063; margin-top: 1.5mm; min-height: 3mm; }
  .ch-meta2 { font-size: 7pt; color: #a8927e; margin-top: 0.5mm; }
  .two { display: flex; gap: 6mm; margin-bottom: 5mm; }
  .two > div { flex: 1; }
  .pils { display: flex; gap: 2mm; }
  .pil { flex: 1; text-align: center; border: 0.3mm solid #f0e0d5; border-radius: 2mm; padding: 2mm 0; background: #fffbf7; }
  .pil-t { font-size: 6.5pt; color: #a8927e; }
  .pil-g { font-size: 13pt; font-weight: 700; color: #3a2e28; line-height: 1.2; }
  .pil-b { font-size: 13pt; font-weight: 700; color: #6b5340; line-height: 1.2; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
  td { padding: 1.6mm 0; border-bottom: 0.2mm dotted #ead9c9; }
  td.k { color: #8a7063; width: 42%; }
  td.v { text-align: right; font-weight: 700; }
  .concl { font-size: 8.5pt; line-height: 1.75; color: #5c3a1e; background: #fffbf7;
           border: 0.3mm solid #f0e0d5; border-radius: 2mm; padding: 3.5mm 4mm; }
  .foot { margin-top: 6mm; text-align: center; }
  .date { font-size: 9pt; letter-spacing: 2px; color: #5c3a1e; }
  .issuer { font-size: 11pt; font-weight: 700; letter-spacing: 4px; color: #8f3d0e; margin-top: 2mm; }
  .note { font-size: 6.5pt; color: #a8927e; margin-top: 3mm; line-height: 1.6; }
  /* 화면에서 미리 볼 때만 보이는 안내 — 인쇄에는 안 나갑니다 */
  .bar { text-align: center; padding: 10px; background: #FDF6F0; font-size: 13px; color: #6b5340; }
  .bar button { font-size: 13px; padding: 9px 20px; border-radius: 9px; border: none;
                background: #c8783c; color: #fff; cursor: pointer; margin-left: 8px; }
  @media print { .bar { display: none !important; } }
</style></head>
<body>
  <div class="bar">
    이 창에서 인쇄하거나 <b>PDF로 저장</b>하실 수 있습니다.
    <button onclick="window.print()">인쇄 / PDF 저장</button>
  </div>

  <div class="sheet"><div class="frame">
    <div class="head">
      <span class="kind">${esc(p.kind)} 작명</span>
      <div class="title">作 名 書</div>
      <div class="sub">이 름 에 담 은 기 운 을 적 어 드 립 니 다</div>
      <div class="name-hanja">${esc(p.hanjaName || p.hangulName)}</div>
      <div class="name-hangul">${esc(p.hangulName)}</div>
    </div>

    <div class="rule"></div>

    <h2>이름을 이루는 글자</h2>
    <div class="chars">${p.chars.map(charCell).join('')}</div>

    <div class="two">
      <div>
        <h2>사주 원국</h2>
        <div class="pils">${p.saju.map(sajuCell).join('')}</div>
        <table style="margin-top:2.5mm">
          <tr><td class="k">생년월일시</td><td class="v">${esc(p.birthText)}</td></tr>
          <tr><td class="k">사주가 바라는 기운</td><td class="v">${esc(p.yongsin || '—')}</td></tr>
          <tr><td class="k">이름 총 획수</td><td class="v">${totalStrokes}획</td></tr>
        </table>
      </div>
      <div>
        <h2>살펴본 자리</h2>
        <table>
          ${p.lines.map(([k, v]) => `<tr><td class="k">${esc(k)}</td><td class="v">${esc(v)}</td></tr>`).join('')}
          <tr><td class="k">성 · 이름</td><td class="v">${esc(sur.map(c => c.hanja).join(''))} · ${esc(giv.map(c => c.hanja).join(''))}</td></tr>
        </table>
      </div>
    </div>

    ${p.conclusion ? `<h2>맺음말</h2><div class="concl">${esc(p.conclusion)}</div>` : ''}

    <div class="foot">
      <div class="date">${esc(p.issuedAt)}</div>
      <div class="issuer">명 연 재 연 구 소</div>
      <div class="note">
        ⚠️ 이 작명서는 명리 해석에 따른 «참고 자료» 입니다. 법적 효력을 갖지 않습니다.<br>
        출생·개명 신고에는 대법원 인명용 한자만 쓸 수 있으니 한 번 더 확인해 주세요.
      </div>
    </div>
  </div></div>
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
          width: '100%', padding: 14, borderRadius: 12, marginBottom: 6,
          background: p.disabled ? '#f0e0d5' : '#fffbf7',
          border: `1px solid ${p.disabled ? '#f0e0d5' : '#c8783c'}`,
          color: p.disabled ? '#b09a86' : '#c8783c',
          fontSize: 14, fontWeight: 600, cursor: p.disabled ? 'default' : 'pointer',
        }}>
        🖨️ A4 작명서 인쇄 · PDF로 저장
      </button>
      <div style={{ fontSize: 10.5, color: '#a8927e', textAlign: 'center', marginBottom: 10, lineHeight: 1.6 }}>
        {msg
          ? <span style={{ color: '#c8506e' }}>{msg}</span>
          : '새 창에서 인쇄하거나 「PDF로 저장」을 고르시면 됩니다.'}
      </div>
    </>
  )
}
