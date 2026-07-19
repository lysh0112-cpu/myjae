'use client'

import React from 'react'

/**
 * 궁합 전용 · 두 사람 사주원국 나란히 부품 (방식 A: 좌4 + 우4)
 *
 * 색상은 result-new 의 SajuWonguk 부품과 "완전히 동일" 하게 맞춤(통일성).
 *   목: 연초록칸/#2e7d32   화: 연분홍칸/#c62828   토: 크림칸/#f57f17
 *   금: 회색칸/#616161     수: 검정칸(#2b2b2b)/흰글씨
 *   일주(일간·일지) 칸은 테두리 강조 — 수면 3px 검정, 아니면 2px 브라운(#c8783c)
 *
 * 계산은 하지 않는다. 이미 만들어진 saju 배열(시→일→월→연)을 받아 그리기만 함.
 *   import { buildSajuPillars } from '@/lib/saju/coupleAnalysis' 로 만든 결과를 그대로 넘기면 됨.
 *
 *   <CoupleWonguk
 *     left={{ name:'나', saju: saju1 }}
 *     right={{ name:'그이', saju: saju2 }}
 *   />
 *
 * saju: [{pillar:'시주', stem:'辛', branch:'亥'}, ...]  (시주가 없으면 3칸만 들어와도 됨)
 */

interface SajuPillar { pillar: string; stem: string; branch: string }

interface PersonWonguk {
  name: string
  birth?: string          // '1995.05.18 12:07' 같은 표시용 (선택)
  isMe?: boolean          // '나' 뱃지 표시
  saju: SajuPillar[]      // 시→일→월→연 순
}

interface Props {
  left: PersonWonguk
  right: PersonWonguk
}

type Element = '목' | '화' | '토' | '금' | '수'

const STEM_ELEMENT: Record<string, Element> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_ELEMENT: Record<string, Element> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

// ── SajuWonguk 과 동일한 오행 팔레트 ──
const EL_BG: Record<Element, string> = { 목: '#e8f5e9', 화: '#ffebee', 토: '#fff8e1', 금: '#f5f5f5', 수: '#2b2b2b' }
const EL_BD: Record<Element, string> = { 목: '#a5d6a7', 화: '#ef9a9a', 토: '#ffe082', 금: '#bdbdbd', 수: '#2b2b2b' }
const EL_C:  Record<Element, string> = { 목: '#2e7d32', 화: '#c62828', 토: '#f57f17', 금: '#616161', 수: '#ffffff' }
const EL_HAN: Record<Element, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

function GanjiCell({ char, el, isDay }: { char: string; el: Element | undefined; isDay?: boolean }) {
  const isEmpty = !char || char === '?'
  return (
    <div style={{
      borderRadius: 7,
      background: isEmpty ? '#f5f5f5' : (el ? EL_BG[el] : '#f5f5f5'),
      border: el === '수'
        ? (isDay ? '3px solid #000000' : '1px solid #2b2b2b')
        : (isDay ? '2px solid #c8783c' : `1px solid ${el ? EL_BD[el] : '#ddd'}`),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', aspectRatio: '1 / 1',
    }}>
      <span style={{ fontSize: 16, fontWeight: 700, color: isEmpty ? '#ccc' : (el ? EL_C[el] : '#888'), lineHeight: 1 }}>
        {isEmpty ? '?' : char}
      </span>
      {el && !isEmpty && (
        <span style={{ position: 'absolute', bottom: 1, right: 2, fontSize: 7, fontWeight: 700, color: EL_C[el] }}>
          {EL_HAN[el]}
        </span>
      )}
    </div>
  )
}

function OneWonguk({ person }: { person: PersonWonguk }) {
  // 화면은 항상 시·일·월·연 4칸 순서로 고정. 없는 기둥은 ? 로.
  const byPillar: Record<string, SajuPillar> = {}
  person.saju.forEach(p => { byPillar[p.pillar] = p })
  const order = ['시주', '일주', '월주', '연주']
  // '연주' / '년주' 표기 혼용 대비
  const pick = (label: string) =>
    byPillar[label] || (label === '연주' ? byPillar['년주'] : undefined)

  const labels = ['시', '일', '월', '연']

  return (
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3, marginBottom: 3 }}>
        {labels.map((l, i) => (
          <div key={i} style={{ fontSize: 8, textAlign: 'center', color: '#bbb' }}>{l}</div>
        ))}
      </div>
      {/* 천간 줄 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3, marginBottom: 3 }}>
        {order.map((label, i) => {
          const p = pick(label)
          const stem = p?.stem ?? '?'
          const el: Element | undefined = STEM_ELEMENT[stem]
          return <GanjiCell key={i} char={stem} el={el} isDay={label === '일주'} />
        })}
      </div>
      {/* 지지 줄 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3 }}>
        {order.map((label, i) => {
          const p = pick(label)
          const branch = p?.branch ?? '?'
          const el: Element | undefined = BRANCH_ELEMENT[branch]
          return <GanjiCell key={i} char={branch} el={el} isDay={label === '일주'} />
        })}
      </div>
    </div>
  )
}

export default function CoupleWonguk({ left, right }: Props) {
  return (
    <div style={{
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '12px 8px',
    }}>
      {/* 두 사람 이름 + 하트 */}
      <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#3a2e28' }}>
            {left.name}
            {left.isMe && <span style={{ fontSize: 9, color: '#b46e46', marginLeft: 3 }}>나</span>}
          </div>
          {left.birth && <div style={{ fontSize: 10, color: '#b4785a' }}>{left.birth}</div>}
        </div>
        <div style={{ color: '#d4537e', fontSize: 15 }}>♥</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#3a2e28' }}>
            {right.name}
            {right.isMe && <span style={{ fontSize: 9, color: '#b46e46', marginLeft: 3 }}>나</span>}
          </div>
          {right.birth && <div style={{ fontSize: 10, color: '#b4785a' }}>{right.birth}</div>}
        </div>
      </div>

      {/* 좌4 + 우4 나란히 */}
      <div style={{ display: 'flex', gap: 7 }}>
        <OneWonguk person={left} />
        <div style={{ width: '0.5px', background: '#f0e0d5' }} />
        <OneWonguk person={right} />
      </div>
    </div>
  )
}
