'use client'

import React, { CSSProperties, useState } from 'react'
import { EL_BG, EL_BD, EL_C, EL_C_SUB, EL_HAN } from '@/lib/saju/ohaengColor'
import TermModal from './TermModal'
import { SAJU_TERMS } from './sajuTerms'

/**
 * 대운·세운·월운 표 (명카페 공용 부품 · 포스텔러 스타일)
 *
 *   import UnTable from '@/app/manseryeok/result-new/UnTable'
 *   <UnTable title="대운" badge="현재 60세" items={items} />
 *
 * items: [{label, stem, branch, stemSipsin, branchSipsin, unsung?, current?}, ...]
 *  - label: 나이/연도/월 (예: "9세", "2026", "7월")
 *  - stem/branch: 천간/지지 한자
 *  - stemSipsin/branchSipsin: 천간/지지 십성
 *  - unsung: 12운성(선택). 있으면 지지십성 아래 줄에 표시 (대운용)
 *  - current: 현재 칸이면 true → 테두리 강조
 *
 * 데이터 변환 예:
 *   const items = dayunList.map(d => ({
 *     label:`${d.age}세`, stem:d.cheongan, branch:d.jiji,
 *     stemSipsin:d.ganYukchin, branchSipsin:d.jiYukchin,
 *     unsung:getUnsung(dayStem, d.jiji),
 *     current:(currentYear - birthYear) closest to d.age,
 *   }))
 */

interface Item {
  label: string
  stem: string
  branch: string
  stemSipsin: string
  branchSipsin: string
  unsung?: string
  current?: boolean
}

interface Props {
  title: string
  badge?: string
  items: Item[]
}

type Element = '목' | '화' | '토' | '금' | '수'
const STEM_ELEMENT: Record<string, Element> = { 甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토', 己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수' }
const BRANCH_ELEMENT: Record<string, Element> = { 子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화', 午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수' }
const SS_C: Record<string, string> = {
  비견: '#9e9e9e', 겁재: '#9e9e9e', 식신: '#43a047', 상관: '#43a047',
  편재: '#fb8c00', 정재: '#fb8c00', 편관: '#e53935', 정관: '#e53935',
  편인: '#1e88e5', 정인: '#1e88e5',
}

const BLOCK = 44

const blockStyle = (el: Element | undefined): CSSProperties => ({
  width: BLOCK, height: BLOCK, borderRadius: 8,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 23, fontWeight: 700, position: 'relative', boxSizing: 'border-box',
  background: el ? EL_BG[el] : '#f5f5f5',
  border: `1px solid ${el ? EL_BD[el] : '#ddd'}`,
  color: el ? EL_C[el] : '#888',
})

const markStyle = (el: Element | undefined): CSSProperties => ({
  position: 'absolute', right: 3, bottom: 0, fontSize: 10.5, fontWeight: 600,
  color: el ? EL_C_SUB[el] : '#888',
})

export default function UnTable({ title, badge, items }: Props) {
  const [term, setTerm] = useState<string | null>(null)
  const open = (v?: string) => v && SAJU_TERMS[v] && setTerm(v)
  return (
    <div style={{ background: '#fff', border: '0.5px solid #f0e0d5', borderRadius: 16, overflow: 'hidden', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 10px', borderBottom: '0.5px solid #f7ede4' }}>
        <span style={{ color: '#8f3d0e', fontSize: 13 }}>✦</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a' }}>{title}</span>
        {badge && (
          <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: '#fff3e9', border: '0.5px solid #e8d5c5', color: '#8f3d0e', fontWeight: 600 }}>
            {badge}
          </span>
        )}
      </div>
      <div style={{ fontSize: 10, color: '#8f3d0e', padding: '0 16px 6px' }}>👆 십성을 누르면 뜻풀이가 나와요</div>
      <div style={{ overflowX: 'auto', padding: '4px 12px 10px' }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {items.map((item, index) => {
            const stemEl = STEM_ELEMENT[item.stem]
            const branchEl = BRANCH_ELEMENT[item.branch]
            return (
              <div key={index} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                padding: '3px 2px', flexShrink: 0,
                border: item.current ? '2px solid #555' : '2px solid transparent', borderRadius: 10,
              }}>
                <div style={{ fontSize: 10.5, color: '#9e9e9e', whiteSpace: 'nowrap' }}>{item.label}</div>
                <div onClick={() => open(item.stemSipsin)} style={{ fontSize: 10.5, fontWeight: 600, color: SS_C[item.stemSipsin] || '#9e9e9e', whiteSpace: 'nowrap', cursor: SAJU_TERMS[item.stemSipsin] ? 'pointer' : 'default' }}>
                  {item.stemSipsin || '-'}
                </div>
                <div style={blockStyle(stemEl)}>
                  {item.stem}
                  {stemEl && <span style={markStyle(stemEl)}>{EL_HAN[stemEl]}</span>}
                </div>
                <div style={blockStyle(branchEl)}>
                  {item.branch}
                  {branchEl && <span style={markStyle(branchEl)}>{EL_HAN[branchEl]}</span>}
                </div>
                <div style={{ fontSize: 10, color: '#9e9e9e', textAlign: 'center', lineHeight: 1.3, whiteSpace: 'nowrap' }}>
                  <span onClick={() => open(item.branchSipsin)} style={{ cursor: SAJU_TERMS[item.branchSipsin] ? 'pointer' : 'default' }}>
                    {item.branchSipsin || '-'}
                  </span>
                  {item.unsung ? <><br /><span onClick={() => open(item.unsung)} style={{ cursor: item.unsung && SAJU_TERMS[item.unsung] ? 'pointer' : 'default' }}>{item.unsung}</span></> : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <TermModal term={term} onClose={() => setTerm(null)} />
    </div>
  )
}
