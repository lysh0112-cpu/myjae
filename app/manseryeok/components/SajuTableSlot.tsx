'use client'

// app/manseryeok/components/SajuTableSlot.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  만세력 표를 «떼어다» 다른 화면 사이사이에 끼우는 부품             │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-07-31 — 대표님 지시
//
//   「진로적성 프리미엄 화면은 만세력에 나와 있는 표들을 «따로 떼어내서»
//     고객들이 보기 쉽게 통변별로 잘게 가독성 있게 쪼개 놓으라」
//
//   [무엇이 문제였나]
//     만세력 화면에는 표가 위에 몰려 있고 풀이는 아래에 있었습니다.
//     손님이 «이 설명이 어느 표 이야기인지» 를 스스로 이어 붙여야 했습니다.
//
//   [어떻게]
//     ★표를 «쪼개서» 관련 풀이 바로 옆에 둡니다.
//     진로적성 화면은 이미 카드마다 통변이 붙는 구조라, 그 사이에 끼우면 됩니다.
//
//  ⚠️⚠️ 만세력 화면(result-new)은 «건드리지 않습니다».
//     그쪽은 홈에서 들어가는 두 길 모두 표가 «다 나와야» 합니다.
//     (2026-07-31 — 그 화면에 샌드위치를 걸었다가 표가 통째로 사라진 일이 있었습니다)
//
//  ⚠️ 오행 색은 lib/saju/ohaengColor.ts 한 곳만 씁니다. 여기서 색을 지어내지 마십시오.
//     ★오행 색은 명리 규칙입니다 (연재쌤 확인 없이 바꾸지 말 것).
// ══════════════════════════════════════════════════════════════════

import { useMemo } from 'react'
import { calcSimsanOhaeng, toPercentList } from '@/lib/saju/simsanOhaeng'
import { calcSipsungDist } from '@/lib/saju/sipsungDist'
import { calcYongsinNew } from '@/lib/saju/yongsinNew'
import { elOfStem } from '@/lib/saju/ohaengColor'
import OhaengPentagon from '@/app/manseryeok/result-new/OhaengPentagon'
import SipsungTable from '@/app/manseryeok/result-new/SipsungTable'
import SingangTable from '@/app/manseryeok/result-new/SingangTable'
import YongsinCard from '@/app/manseryeok/result-new/YongsinCard'

/** 어느 표를 그릴 것인가 */
export type SajuTableKind = 'ohaeng' | 'sipsung' | 'singang' | 'yongsin'

export interface SajuTableSlotProps {
  saju: { pillar: string; stem: string; branch: string }[]
  solarMonth: number
  solarDay: number
  hourBranch: string | null
  dayStem: string
  /** 그릴 표들. 차례대로 나옵니다 */
  kinds: SajuTableKind[]
  /** 표 위에 붙일 한 줄. 없으면 안 붙습니다 */
  caption?: string
}

const CARD = '#FFFBF7'
const LINE = '#f0e0d5'

/** 오행 우리말 이름 — 신강·신약 표가 요구합니다 */
const EL_KOR: Record<string, string> = {
  목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물',
}

export default function SajuTableSlot({
  saju, solarMonth, solarDay, hourBranch, dayStem, kinds, caption,
}: SajuTableSlotProps) {
  const ready = saju.length > 0 && !!dayStem && dayStem !== '?'

  const ohaeng = useMemo(
    () => (ready ? toPercentList(calcSimsanOhaeng(saju, solarMonth, solarDay, hourBranch)) : []),
    [ready, saju, solarMonth, solarDay, hourBranch],
  )
  const sipsung = useMemo(
    () => (ready ? calcSipsungDist(saju, dayStem) : []),
    [ready, saju, dayStem],
  )
  const yongsin = useMemo(
    () => (ready ? calcYongsinNew(saju, dayStem) : null),
    [ready, saju, dayStem],
  )
  const dayEl = elOfStem(dayStem)

  if (!ready || kinds.length === 0) return null

  // ★그릴 것이 하나도 없으면 빈 카드를 만들지 않습니다
  const nodes = kinds.map((k) => {
    if (k === 'ohaeng' && ohaeng.length > 0) {
      return (
        <div key="ohaeng">
          <OhaengPentagon ohaeng={ohaeng} dayElement={yongsin?.dayElement} />
        </div>
      )
    }
    if (k === 'sipsung' && sipsung.length > 0) {
      return <div key="sipsung"><SipsungTable sipsung={sipsung} /></div>
    }
    if (k === 'singang' && dayEl && ohaeng.length > 0) {
      return (
        <div key="singang">
          <SingangTable
            ilganEl={dayEl}
            ilganName={EL_KOR[dayEl] ?? dayEl}
            ohaeng={ohaeng}
          />
        </div>
      )
    }
    if (k === 'yongsin' && yongsin) {
      return <div key="yongsin"><YongsinCard result={yongsin} saju={saju} /></div>
    }
    return null
  }).filter(Boolean)

  if (nodes.length === 0) return null

  return (
    <div style={{
      background: CARD, border: `1px solid ${LINE}`, borderRadius: 14,
      padding: 12, marginBottom: 10,
    }}>
      {caption && (
        <div style={{
          fontSize: 11, color: '#96502e', fontWeight: 600,
          marginBottom: 8, letterSpacing: '.01em',
        }}>{caption}</div>
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {nodes}
      </div>
    </div>
  )
}
