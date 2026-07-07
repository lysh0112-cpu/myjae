'use client'

import React from 'react'

/**
 * 신강·신약 표 (명카페 공용 부품)
 *
 *   import SingangTable from '@/app/manseryeok/result-new/SingangTable'
 *   <SingangTable ilganEl="수" ilganName="임수" ohaeng={ohaeng} />
 *
 * ilganEl: 일간 오행 ('목'|'화'|'토'|'금'|'수')
 * ilganName: 일간 이름 (예: '임수') — 표시용
 * ohaeng: [{el:'수', pct:25}, ...]  (calcOhaeng 결과 그대로)
 *
 * 계산: 돕는 힘(비겁+인성) vs 빼는 힘(식상+재성+관성)
 *  - 돕는 힘 = 일간과 같은 오행 + 일간을 생하는 오행
 *  - 내 에너지 = 돕는 힘 비중(%)  → 50% 기준으로 신강/신약 판정
 */

type Element = '목' | '화' | '토' | '금' | '수'

const GENERATES_ME: Record<Element, Element> = { 목: '수', 화: '목', 토: '화', 금: '토', 수: '금' }
const EL_HAN: Record<Element, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

interface Props {
  ilganEl: Element
  ilganName?: string
  ohaeng: { el: string; pct: number }[]
}

export default function SingangTable({ ilganEl, ilganName = '', ohaeng }: Props) {
  const pct = (el: string) => ohaeng.find((o) => o.el === el)?.pct ?? 0

  const same = ilganEl
  const inseong = GENERATES_ME[ilganEl]
  const helpingEls: Element[] = [same, inseong]
  const drainingEls = (['목', '화', '토', '금', '수'] as Element[]).filter((e) => !helpingEls.includes(e))

  const helping = helpingEls.reduce((s, e) => s + pct(e), 0)
  const draining = drainingEls.reduce((s, e) => s + pct(e), 0)
  const total = helping + draining
  const myEnergy = total ? Math.round((helping / total) * 1000) / 10 : 50

  let verdict = '중화'
  let vColor = '#43a047'
  if (myEnergy >= 60) { verdict = '신강'; vColor = '#c62828' }
  else if (myEnergy >= 52) { verdict = '중화신강'; vColor = '#e88a3c' }
  else if (myEnergy >= 48) { verdict = '중화'; vColor = '#43a047' }
  else if (myEnergy >= 40) { verdict = '중화신약'; vColor = '#3f8ae0' }
  else { verdict = '신약'; vColor = '#1565c0' }

  const helpNames = `${EL_HAN[same]}·${EL_HAN[inseong]}`
  const markerLeft = Math.min(Math.max(myEnergy, 3), 97)

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      {ilganName && (
        <div style={{ fontSize: 11, color: '#a99', marginBottom: 14 }}>
          일간 <b style={{ color: '#1565c0' }}>{ilganName}</b>가 사주에서 얼마나 힘을 받는지 봐요
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: vColor }}>{verdict}</span>
        <span style={{ fontSize: 12, color: '#999' }}>내 에너지 {myEnergy}%</span>
      </div>

      {/* 에너지 바 */}
      <div style={{ position: 'relative', height: 34, margin: '18px 0 6px' }}>
        <div style={{ position: 'absolute', top: 11, left: 0, right: 0, height: 12, borderRadius: 6, background: 'linear-gradient(90deg,#90caf9 0%,#c5e1a5 50%,#ef9a9a 100%)' }} />
        <div style={{ position: 'absolute', top: 6, left: '50%', transform: 'translateX(-50%)', width: 2, height: 22, background: '#bbb' }} />
        <div style={{ position: 'absolute', top: 30, left: '50%', transform: 'translateX(-50%)', fontSize: 9, color: '#bbb' }}>중화 50%</div>
        <div style={{ position: 'absolute', top: 2, left: `${markerLeft}%`, transform: 'translateX(-50%)' }}>
          <div style={{ width: 0, height: 0, borderLeft: '5px solid transparent', borderRight: '5px solid transparent', borderTop: `7px solid ${vColor}` }} />
        </div>
        <div style={{ position: 'absolute', top: -14, left: `${markerLeft}%`, transform: 'translateX(-50%)', fontSize: 10, fontWeight: 700, color: vColor, whiteSpace: 'nowrap' }}>나 ●</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#bbb', marginBottom: 16 }}>
        <span>신약 (0%)</span><span>신강 (100%)</span>
      </div>

      {/* 돕는 힘 / 빼는 힘 카드 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <div style={{ flex: 1, background: '#e8f2fc', borderRadius: 10, padding: '11px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#1565c0', fontWeight: 600, marginBottom: 3 }}>나를 돕는 힘</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#1565c0' }}>{Math.round(helping)}<span style={{ fontSize: 12 }}>%</span></div>
          <div style={{ fontSize: 9, color: '#7aa', marginTop: 2 }}>비겁·인성</div>
        </div>
        <div style={{ flex: 1, background: '#fdecec', borderRadius: 10, padding: '11px 10px', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#c62828', fontWeight: 600, marginBottom: 3 }}>힘을 빼는 기운</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#c62828' }}>{Math.round(draining)}<span style={{ fontSize: 12 }}>%</span></div>
          <div style={{ fontSize: 9, color: '#c99', marginTop: 2 }}>식상·재성·관성</div>
        </div>
      </div>

      {/* 안내 */}
      <div style={{ background: '#f7f5f0', borderRadius: 10, padding: '11px 13px', fontSize: 11.5, lineHeight: 1.7 }}>
        <b style={{ color: '#8B6914' }}>💡 신강·신약은 좋고 나쁨이 아니에요.</b><br />
        <span style={{ color: '#777' }}>
          나에게 어떤 오행이 도움이 되는지(용신), 어떤 삶의 방식이 맞는지 찾는 기준이에요.
          {verdict.includes('약') && <> 지금은 <b style={{ color: '#1565c0' }}>나를 돕는 {helpNames}</b> 기운이 들어올 때 힘이 나요.</>}
          {verdict.includes('강') && <> 지금은 <b style={{ color: '#c62828' }}>힘을 덜어주는 기운</b>이 들어올 때 균형이 잡혀요.</>}
        </span>
      </div>
    </div>
  )
}
