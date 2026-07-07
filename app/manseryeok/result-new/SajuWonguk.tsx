'use client'

import React, { useState } from 'react'
import { getUnsung, getSinsal, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
import TermModal from './TermModal'

/**
 * 사주 원국 통합 표 (명카페 공용 부품 · 포스텔러 스타일)
 *
 * 기존 "사주 원국" + "신살과 길성" 두 표를 하나로 합친 것.
 * 한 기둥에 십성·천간·지지·12운성·지지십성·신살을 세로로 쌓음.
 * 용어(십성·운성·신살)를 누르면 TermModal로 쉬운 설명이 뜸.
 *
 *   import SajuWonguk from '@/app/manseryeok/result-new/SajuWonguk'
 *   <SajuWonguk saju={saju} dayStem={dayStem} yeonjji={yeonjji} iljji={iljji} gm1={gm1} gm2={gm2} />
 *
 * saju: [{pillar:'시주', stem:'辛', branch:'亥'}, ...] (시→일→월→연 순)
 */

interface SajuPillar { pillar: string; stem: string; branch: string }

interface Props {
  saju: SajuPillar[]
  dayStem: string
  yeonjji: string
  iljji: string
  gm1?: string
  gm2?: string
}

type Element = '목' | '화' | '토' | '금' | '수'
const STEM_ELEMENT: Record<string, Element> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
const BRANCH_ELEMENT: Record<string, Element> = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
const EL_BG: Record<Element, string> = { 목: '#e8f5e9', 화: '#ffebee', 토: '#fff8e1', 금: '#f5f5f5', 수: '#2b2b2b' }
const EL_BD: Record<Element, string> = { 목: '#a5d6a7', 화: '#ef9a9a', 토: '#ffe082', 금: '#bdbdbd', 수: '#2b2b2b' }
const EL_C: Record<Element, string> = { 목: '#2e7d32', 화: '#c62828', 토: '#f57f17', 금: '#616161', 수: '#ffffff' }
const EL_HAN: Record<Element, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }
const SS_C: Record<string, string> = {
  비견: '#9e9e9e', 겁재: '#9e9e9e', 식신: '#43a047', 상관: '#43a047',
  편재: '#fb8c00', 정재: '#fb8c00', 편관: '#e53935', 정관: '#e53935',
  편인: '#1e88e5', 정인: '#1e88e5',
}
const HEAVENLY_STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCH_YIN: Record<string, boolean> = { 子: false, 丑: true, 寅: false, 卯: true, 辰: false, 巳: true, 午: false, 未: true, 申: false, 酉: true, 戌: false, 亥: true }

function getSipsin(dayStem: string, targetStem: string): string {
  if (!targetStem || targetStem === '?') return ''
  const dayIdx = HEAVENLY_STEMS.indexOf(dayStem)
  const targetIdx = HEAVENLY_STEMS.indexOf(targetStem)
  const de = STEM_ELEMENT[dayStem], te = STEM_ELEMENT[targetStem]
  const sameYin = (dayIdx % 2) === (targetIdx % 2)
  const gen: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
  const ctl: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }
  if (de === te) return sameYin ? '비견' : '겁재'
  if (gen[de] === te) return sameYin ? '식신' : '상관'
  if (ctl[de] === te) return sameYin ? '편재' : '정재'
  if (ctl[te] === de) return sameYin ? '편관' : '정관'
  if (gen[te] === de) return sameYin ? '편인' : '정인'
  return ''
}

function getSipsinBranch(dayStem: string, branch: string): string {
  if (!branch || branch === '?') return ''
  const be = BRANCH_ELEMENT[branch], de = STEM_ELEMENT[dayStem]
  const dayYin = HEAVENLY_STEMS.indexOf(dayStem) % 2 === 1
  const branchYin = BRANCH_YIN[branch]
  const sameYin = dayYin === branchYin
  const gen: Record<string, string> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
  const ctl: Record<string, string> = { 목: '토', 화: '금', 토: '수', 금: '목', 수: '화' }
  if (de === be) return sameYin ? '비견' : '겁재'
  if (gen[de] === be) return sameYin ? '식신' : '상관'
  if (ctl[de] === be) return sameYin ? '편재' : '정재'
  if (ctl[be] === de) return sameYin ? '편관' : '정관'
  if (gen[be] === de) return sameYin ? '편인' : '정인'
  return ''
}

function GanjiBox({ char, el, isDay, isGongmang }: { char: string; el: Element | undefined; isDay?: boolean; isGongmang?: boolean }) {
  return (
    <div style={{
      width: 42, height: 42, borderRadius: 8,
      background: el ? EL_BG[el] : '#f5f5f5',
      border: isDay ? '2px solid #c8783c' : `1px solid ${el ? EL_BD[el] : '#ddd'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      margin: '0 auto', position: 'relative', opacity: isGongmang ? 0.45 : 1,
    }}>
      <span style={{ fontSize: 21, fontWeight: 700, color: el ? EL_C[el] : '#888', lineHeight: 1 }}>{char}</span>
      {el && <span style={{ position: 'absolute', bottom: 2, right: 3, fontSize: 8, fontWeight: 700, color: EL_C[el] }}>{EL_HAN[el]}</span>}
    </div>
  )
}

const rowLabel: React.CSSProperties = { fontSize: 9, color: '#bbb', textAlign: 'right', paddingRight: 5, whiteSpace: 'nowrap' }
const termCell = (color: string): React.CSSProperties => ({ fontSize: 10, fontWeight: 600, color, cursor: 'pointer', textAlign: 'center' })

export default function SajuWonguk({ saju, dayStem, yeonjji, iljji, gm1, gm2 }: Props) {
  const [term, setTerm] = useState<string | null>(null)
  const open = (v: string) => v && v !== '×' && setTerm(v)

  return (
    <div style={{ fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif" }}>
      <div style={{ fontSize: 10.5, color: '#c8a86a', marginBottom: 12 }}>👆 용어를 누르면 쉬운 뜻풀이가 나와요</div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <td style={{ width: 34 }} />
            {saju.map(({ pillar }, i) => (
              <td key={i} style={{ textAlign: 'center', fontSize: 9, color: '#bbb', paddingBottom: 3 }}>{pillar}</td>
            ))}
          </tr>
        </thead>
        <tbody>
          {/* 천간 십성 */}
          <tr>
            <td style={rowLabel}>십성</td>
            {saju.map(({ pillar, stem }, i) => {
              const isDay = pillar === '일주'
              const ss = isDay ? '본원' : getSipsin(dayStem, stem)
              return (
                <td key={i} onClick={() => !isDay && open(ss)} style={{ ...termCell(isDay ? '#c8783c' : (SS_C[ss] || '#ccc')), cursor: isDay ? 'default' : 'pointer' }}>
                  {ss || '-'}
                </td>
              )
            })}
          </tr>
          {/* 천간 */}
          <tr>
            <td style={rowLabel}>천간</td>
            {saju.map(({ pillar, stem }, i) => (
              <td key={i} style={{ padding: 2 }}>
                <GanjiBox char={stem} el={STEM_ELEMENT[stem]} isDay={pillar === '일주'} />
              </td>
            ))}
          </tr>
          {/* 지지 */}
          <tr>
            <td style={rowLabel}>지지</td>
            {saju.map(({ branch }, i) => (
              <td key={i} style={{ padding: 2 }}>
                <GanjiBox char={branch} el={BRANCH_ELEMENT[branch]} isGongmang={branch === gm1 || branch === gm2} />
              </td>
            ))}
          </tr>
          {/* 12운성 */}
          <tr>
            <td style={rowLabel}>12운성</td>
            {saju.map(({ branch }, i) => {
              const u = dayStem ? getUnsung(dayStem, branch) : ''
              return <td key={i} onClick={() => open(u)} style={termCell(unsungColor(u) || '#888')}>{u || '-'}</td>
            })}
          </tr>
          {/* 지지 십성 */}
          <tr>
            <td style={rowLabel}>지지십성</td>
            {saju.map(({ pillar, branch }, i) => {
              const bs = pillar === '일주' ? getSipsinBranch(dayStem, branch) : getSipsinBranch(dayStem, branch)
              return <td key={i} onClick={() => open(bs)} style={termCell(SS_C[bs] || '#ccc')}>{bs || '-'}</td>
            })}
          </tr>
          {/* 신살 */}
          <tr>
            <td style={rowLabel}>신살</td>
            {saju.map(({ branch }, i) => {
              const sinsal = getSinsal(yeonjji, branch)
              const color = SINSAL_HIGHLIGHT[sinsal]
              return (
                <td key={i} onClick={() => color && open(sinsal)} style={{ ...termCell(color || '#ddd'), cursor: color ? 'pointer' : 'default' }}>
                  {color ? sinsal : '×'}
                </td>
              )
            })}
          </tr>
        </tbody>
      </table>

      {/* 요약 */}
      <div style={{ background: '#faf3ee', border: '0.5px solid #f0e0d5', borderRadius: 8, padding: 9, display: 'flex', justifyContent: 'space-around', marginTop: 12 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#bbb', fontSize: 9, marginBottom: 2 }}>일간</div>
          <div style={{ color: '#1a1a1a', fontWeight: 700, fontSize: 11 }}>{dayStem ? `${dayStem}(${STEM_ELEMENT[dayStem] || '?'})` : '-'}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ color: '#bbb', fontSize: 9, marginBottom: 2 }}>공망</div>
          <div style={{ color: '#f44336', fontWeight: 700, fontSize: 11 }}>{gm1 ? `${gm1}·${gm2}` : '-'}</div>
        </div>
      </div>

      <TermModal term={term} onClose={() => setTerm(null)} />
    </div>
  )
}
