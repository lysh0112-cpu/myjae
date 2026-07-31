'use client'

// app/manseryeok/naming/diagnosis/components/NamingSajuSummary.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  내이름 감정 — 맨 위 «사주 한눈에» 요약                            │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (41부 Step 3 · UI) — 대표님 지시
//
//   이름 풀이를 읽기 «전에» 손님이 자기 사주를 한눈에 보게 합니다.
//     · 사주 명식 (정본 원국표 — 용어를 누르면 뜻풀이가 뜹니다)
//     · 절입 뒤 며칠째인가 + 그 자리의 지장간
//     · 오행 점수 (심산 100점)
//     · 격국 · 필요한 기운(용신) · 이름에 담을 자원오행 — 칩 세 줄
//
//  ⚠️⚠️ 색을 «여기서 정하지 않습니다». lib/saju/ohaengColor.ts 한 곳만 씁니다.
//     오행 색은 명리 규칙입니다 (연재쌤 확인 없이 바꾸지 말 것).
//     ★2026-08-01 에 여덟 벌로 흩어진 것을 한 벌로 모았습니다. 되돌리지 마십시오.
//
//  ⚠️ 원국표도 «가져다» 씁니다 — app/manseryeok/components/SajuWonguk.tsx
//     여기서 다시 그리면 또 갈립니다. (교훈 CJ)
//
//  [문턱]  심산 100점 · 교재 40쪽
//     0 결핍 · 1~24 약함 · 25~45 발달(강점 지능) · 50↑ 과다
//     ★2026-07-31 대표님 확정 — «현행 유지». 환산하지 않습니다.
// ══════════════════════════════════════════════════════════════════

import React, { useMemo } from 'react'
import SajuWonguk from '@/app/manseryeok/components/SajuWonguk'
import { EL_CHART, EL_TEXT, EL_HAN } from '@/lib/saju/ohaengColor'
import { calcSimsanOhaeng, grade as gradeOfPoints } from '@/lib/saju/simsanOhaeng'
import { calcYongsinNew } from '@/lib/saju/yongsinNew'
import { getGongmang } from '@/lib/saju'
import { calcJijangganBridge } from '@/lib/saju/career/jijangganBridge'

type Ohaeng = '목' | '화' | '토' | '금' | '수'
const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']

interface Pillar { pillar: string; stem: string; branch: string }

export interface NamingSajuSummaryProps {
  saju: Pillar[]
  solarYear: number
  solarMonth: number
  solarDay: number
  hourBranch: string | null
  dayStem: string
  /** 이름에 담을 자원오행 (namingBridge 의 fill). 없으면 칩을 안 그립니다 */
  fillElements?: Ohaeng[]
}

const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const GOLD = '#c8783c'
const INK = '#3a2e28'

/** 등급 → 손님이 읽는 말. ★「결핍」 같은 날말을 그대로 쓰지 않습니다 */
const GRADE_WORD: Record<string, string> = {
  과다: '넘침', 발달: '강점', 약함: '옅음', 결핍: '비어 있음',
}
const GRADE_TONE: Record<string, { bg: string; fg: string }> = {
  과다: { bg: '#fbeaf0', fg: '#9c3a5c' },
  발달: { bg: '#eaf1e6', fg: '#3f6b34' },
  약함: { bg: '#f2eee9', fg: '#7a6a5c' },
  결핍: { bg: '#f2eee9', fg: '#7a6a5c' },
}

export default function NamingSajuSummary({
  saju, solarYear, solarMonth, solarDay, hourBranch, dayStem, fillElements,
}: NamingSajuSummaryProps) {
  const ready = saju.length > 0 && !!dayStem && dayStem !== '?'

  const score = useMemo(
    () => (ready ? calcSimsanOhaeng(saju, solarMonth, solarDay, hourBranch) : null),
    [ready, saju, solarMonth, solarDay, hourBranch],
  )
  const yongsin = useMemo(
    () => (ready ? calcYongsinNew(saju, dayStem) : null),
    [ready, saju, dayStem],
  )
  const jj = useMemo(
    () => (ready ? calcJijangganBridge({ saju, solarYear, solarMonth, solarDay }) : null),
    [ready, saju, solarYear, solarMonth, solarDay],
  )

  if (!ready || !score) return null

  const iljji = saju.find((p) => p.pillar === '일주')?.branch ?? ''
  const yeonjji = saju.find((p) => p.pillar === '년주' || p.pillar === '연주')?.branch ?? ''
  const [gm1, gm2] = (dayStem && iljji && iljji !== '?') ? getGongmang(dayStem, iljji) : ['', '']
  const max = Math.max(...EL5.map((e) => score[e] ?? 0), 1)

  return (
    <div style={{
      background: CARD, border: `1px solid ${LINE}`, borderRadius: 14,
      padding: '14px 12px', marginBottom: 16,
    }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 10 }}>
        내 사주 한눈에
      </div>

      {/* ── 명식 — ★정본 원국표를 가져다 씁니다 ── */}
      <SajuWonguk saju={saju} dayStem={dayStem} yeonjji={yeonjji} iljji={iljji} gm1={gm1} gm2={gm2} />

      {/* ── 절입 경과일수 + 그 자리의 지장간 ── */}
      {jj?.jijanggan && jj.daysAfterJol != null && (
        <div style={{
          marginTop: 10, fontSize: 11, color: '#6b5340', lineHeight: 1.7,
          background: '#faf3ec', border: `0.5px solid ${LINE}`, borderRadius: 9, padding: '8px 10px',
        }}>
          태어난 달({jj.monthBranch})의 절기가 든 뒤 <b style={{ color: GOLD }}>{jj.daysAfterJol.toFixed(1)}일째</b>,
          {' '}그 자리의 기운은 <b style={{ color: GOLD }}>{jj.jijanggan.currentGan}</b>
          {' '}({jj.jijanggan.stage}기)입니다.
        </div>
      )}

      {/* ── 오행 점수 (심산 100점) ── */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 11, color: '#8a7063', marginBottom: 7 }}>
          오행의 세력 <span style={{ color: '#b09a86' }}>· 100점 기준</span>
        </div>
        {EL5.map((el) => {
          const pt = score[el] ?? 0
          const g = gradeOfPoints(pt)
          const tone = GRADE_TONE[g] ?? GRADE_TONE.약함
          return (
            <div key={el} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 5 }}>
              <span style={{
                width: 34, fontSize: 11, fontWeight: 700, color: EL_TEXT[el], flexShrink: 0,
              }}>{el}<span style={{ fontSize: 9, opacity: .7 }}>{EL_HAN[el]}</span></span>
              <div style={{ flex: 1, height: 13, background: '#f3ece4', borderRadius: 7, overflow: 'hidden' }}>
                <div style={{
                  width: `${(pt / max) * 100}%`, height: '100%',
                  background: EL_CHART[el], borderRadius: 7,
                  transition: 'width .4s ease',
                }} />
              </div>
              <span style={{ width: 26, fontSize: 11, fontWeight: 600, color: INK, textAlign: 'right' }}>{pt}</span>
              <span style={{
                // ⚠️ 「비어 있음」이 «비어 있 / 음» 으로 갈리던 자리입니다.
                //    글자 수가 넷이라 44px 안에서 줄이 바뀌었습니다.
                //    ★nowrap 을 걸고 width 를 없앴습니다 — 글자 길이에 맞춰 늘어납니다.
                fontSize: 9.5, fontWeight: 600, padding: '2px 7px', borderRadius: 8,
                background: tone.bg, color: tone.fg, textAlign: 'center',
                flexShrink: 0, whiteSpace: 'nowrap',
              }}>{GRADE_WORD[g] ?? g}</span>
            </div>
          )
        })}
        {/* ★문턱 안내 — 교재 40쪽 · 심산 100점 (2026-07-31 대표님 확정: 현행 유지) */}
        <div style={{ fontSize: 9.5, color: '#a8927e', marginTop: 6, lineHeight: 1.6 }}>
          25~45점이면 <b style={{ color: '#3f6b34' }}>강점</b>, 50점을 넘으면 <b style={{ color: '#9c3a5c' }}>넘침</b>,
          {' '}점수가 없으면 <b>비어 있음</b>으로 봅니다.
        </div>
      </div>

      {/* ── 칩 — 격국 · 용신 · 이름에 담을 기운 ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 13 }}>
        {yongsin?.gyeokguk?.name && (
          <Chip label="격국" value={yongsin.gyeokguk.name} />
        )}
        {yongsin?.eokbu?.yongsin && (
          <Chip label="필요한 기운" value={yongsin.eokbu.yongsin} el={yongsin.eokbu.yongsin as Ohaeng} />
        )}
        {fillElements && fillElements.length > 0 && (
          <Chip label="이름에 담을 기운" value={fillElements.slice(0, 2).join('·')} el={fillElements[0]} />
        )}
      </div>
    </div>
  )
}

/** 칩 하나. el 을 주면 그 오행 색으로 점을 찍습니다 */
function Chip({ label, value, el }: { label: string; value: string; el?: Ohaeng }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, padding: '5px 10px', borderRadius: 14,
      background: '#fff', border: `1px solid ${LINE}`, color: INK,
    }}>
      {el && (
        <span style={{
          width: 8, height: 8, borderRadius: 4, background: EL_CHART[el],
          border: el === '금' ? '0.5px solid #c8c8c8' : 'none', flexShrink: 0,
        }} />
      )}
      <span style={{ color: '#8a7063', fontSize: 10 }}>{label}</span>
      <b style={{ color: GOLD }}>{value}</b>
    </span>
  )
}
