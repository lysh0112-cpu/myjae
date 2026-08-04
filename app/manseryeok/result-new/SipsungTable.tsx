'use client'

import React, { useState } from 'react'
import TermModal from './TermModal'
import { SAJU_TERMS } from './sajuTerms'

/**
 * 십성표 (명카페 공용 부품 · 포스텔러 스타일)
 *
 * 사주 분석 화면 어디서나 가져다 씁니다.
 *   import SipsungTable from '@/app/manseryeok/result-new/SipsungTable'
 *   <SipsungTable sipsung={sipsung} />
 *
 * sipsung: [{ss:'상관', pct:28.6}, ...] 형태 (calcSipsung 결과 그대로)
 *
 * 특징
 *  - 십성 10개 고정 순서로 표시, 값 없으면 '-'
 *  - 이름은 오행색 계열로 (식상=초록, 재성=주황, 관성=빨강, 인성=파랑, 비겁=회색)
 *  - 글자 작게 + 가운데 정렬 (좁은 폭에서 오각형 그래프 옆에 나란히 두기 좋음)
 */

const SIPSIN_ORDER = ['상관', '식신', '정재', '편재', '정관', '편관', '정인', '편인', '겁재', '비견']

const SIPSIN_COLOR: Record<string, string> = {
  비견: '#9e9e9e', 겁재: '#9e9e9e',
  식신: '#4caf50', 상관: '#4caf50',
  편재: '#ff9800', 정재: '#ff9800',
  편관: '#f44336', 정관: '#f44336',
  편인: '#2196f3', 정인: '#2196f3',
}

const th: React.CSSProperties = {
  padding: '3px 2px', textAlign: 'center', fontWeight: 600,
  color: '#555', fontSize: '9px', border: '0.5px solid #f0e0d5',
}

export default function SipsungTable({ sipsung }: { sipsung: { ss: string; pct: number }[] }) {
  const pct = (ss: string) => {
    const d = sipsung.find((s) => s.ss === ss)
    return d ? d.pct : null
  }

  /* ★2026-08-04 (45부 · 대표님 지시) — 십성 이름을 누르면 «뜻풀이» 가 뜹니다.
     [만들기 전에 grep 했습니다 — 교훈 E]
       사전   sajuTerms.ts 의 SAJU_TERMS 에 ★십성 열 개가 «이미» 다 있었습니다
       모달   TermModal.tsx 가 «이미» 공용입니다 (원국·UnTable·대운표가 씁니다)
     ⇒ ★새로 지은 것이 «하나도 없습니다». 잇기만 했습니다.
     ⚠️ 사전에 없는 낱말이면 모달이 안 뜹니다 — 그때는 예전처럼 그냥 글자입니다. */
  const [term, setTerm] = useState<string | null>(null)

  return (
    <>
    <table style={{ borderCollapse: 'collapse', fontSize: '9.5px', width: '100%' }}>
      <thead>
        <tr style={{ background: '#f7ede4' }}>
          <th style={th}>십성</th>
          <th style={th}>비율</th>
        </tr>
      </thead>
      <tbody>
        {SIPSIN_ORDER.map((ss) => {
          const p = pct(ss)
          return (
            <tr key={ss}>
              <td
                onClick={() => SAJU_TERMS[ss] && setTerm(ss)}
                style={{
                  padding: '3px 2px', textAlign: 'center', fontWeight: 600,
                  color: SIPSIN_COLOR[ss] || '#555', border: '0.5px solid #f0e0d5',
                  cursor: SAJU_TERMS[ss] ? 'pointer' : 'default',
                }}>
                {SAJU_TERMS[ss]
                  ? <span style={{ textDecoration: 'underline', textDecorationStyle: 'dotted', textUnderlineOffset: 3 }}>{ss}</span>
                  : ss}
              </td>
              <td style={{
                padding: '3px 2px', textAlign: 'center',
                fontWeight: p !== null ? 700 : 400,
                color: p !== null ? '#1a1a1a' : '#bbb',
                border: '0.5px solid #f0e0d5',
              }}>
                {p !== null ? `${p}%` : '-'}
              </td>
            </tr>
          )
        })}
      </tbody>
      {/* ══════════════════════════════════════════════════════════
          ★2026-08-02 — 「왜 오행 비율과 다른가」 한 줄 (대표님 지시)

           [무엇이 헷갈리나]  같은 화면의 오각형은 «점수» 로, 이 표는 «글자 개수» 로
             셉니다. 그리고 오각형은 월지·시지에 «계절 치환» 이 걸립니다.
             ⇒ 「목이 55%인데 비견은 14.3%」 같은 모양이 나옵니다.

           ★십성은 «글자 그대로» 세는 것이 맞습니다 —
             십성은 「이 글자가 일간에게 무엇인가」이고, 그것으로 육친
             (아버지·재물·배우자)을 읽습니다. 계절로 바꿔 세면 사람이 바뀝니다.
           ⚠️ 그러니 셈을 고치지 «마십시오». 까닭을 말해 드리는 것으로 족합니다.
          ══════════════════════════════════════════════════════════ */}
      <tfoot>
        <tr>
          <td colSpan={2} style={{
            padding: '5px 4px', fontSize: '8.5px', color: '#a8927e',
            lineHeight: 1.5, border: 'none', textAlign: 'left',
          }}>
            👆 십성을 누르면 뜻풀이가 나와요 · 십성은 글자를 있는 그대로 셉니다.
            위 오행 비율은 계절 치환이 들어가 서로 다를 수 있어요.
          </td>
        </tr>
      </tfoot>
    </table>
    <TermModal term={term} onClose={() => setTerm(null)} />
    </>
  )
}
