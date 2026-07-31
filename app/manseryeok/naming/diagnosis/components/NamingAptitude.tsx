'use client'

// app/manseryeok/naming/diagnosis/components/NamingAptitude.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  내이름 감정 — 五. 이름에 담을 기운 · 六. 사주 명리적성            │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (41부 Step 3 · UI) — 대표님 확정
//
//   ① 상단 요약은 «펼친 채»           → NamingSajuSummary.tsx
//   ② 五 이름에 담을 기운 — 늘 보임    → namingBridge
//   ③ 六 명리적성 — «접힌 채» 시작     → career 파이프라인 + jijangganBridge
//      + 아래에 [상세 진로/적성 분석 보러가기 →] 링크
//
//  ⚠️⚠️ 오행 색을 «여기서 정하지 않습니다». lib/saju/ohaengColor.ts 한 곳만 씁니다.
//     오행 색은 명리 규칙입니다. 2026-08-01 에 여덟 벌을 한 벌로 모았습니다.
//
//  ⚠️ CareerCard 의 reasons 는 «절대» 그리지 않습니다 — AI 통변 재료입니다 (교훈 AV).
//     lines 만 손님에게 보입니다.
//
//  ⚠️ 판정을 «여기서 다시 하지 않습니다». career 파이프라인이 낸 것을 그리기만 합니다.
// ══════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react'
import { EL_CHART, EL_TEXT } from '@/lib/saju/ohaengColor'
import { calcCareerScore, gradeAll, pickStrong } from '@/lib/saju/career/careerScore'
import { judgeOhaengGijil, judgeGyeyeol, judgeJobFit } from '@/lib/saju/career'
import { calcJijangganBridge } from '@/lib/saju/career/jijangganBridge'
import { calcNamingBridge, type NamingBridgeResult } from '@/lib/saju/career/namingBridge'
import type { CareerCard } from '@/lib/saju/career/types'

type Ohaeng = '목' | '화' | '토' | '금' | '수'

interface Pillar { pillar: string; stem: string; branch: string }

export interface NamingAptitudeProps {
  saju: Pillar[]
  solarYear: number
  solarMonth: number
  solarDay: number
  hourBranch: string | null
  dayStem: string
  yongsin: Ohaeng | null
  heeksin?: Ohaeng | null
  gisin?: Ohaeng | null
  /** 진로적성 화면으로 넘길 주소 */
  careerHref: string
  /** 학생이면 계열, 성인이면 직무를 보여 줍니다 */
  target?: 'student' | 'adult'
}

const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const GOLD = '#c8783c'
const INK = '#5c3a1e'

/** 五 · 六 을 한 벌로 내보냅니다 — 화면은 이 하나만 얹으면 됩니다 */
export default function NamingAptitude(p: NamingAptitudeProps) {
  const ready = p.saju.length > 0 && !!p.dayStem && p.dayStem !== '?'
  const [open, setOpen] = useState(false)   // ★六 은 «접힌 채» 시작합니다

  const score = useMemo(
    () => (ready ? calcCareerScore(p.saju, p.solarMonth, p.solarDay, p.hourBranch) : null),
    [ready, p.saju, p.solarMonth, p.solarDay, p.hourBranch],
  )
  const grades = useMemo(() => (score ? gradeAll(score) : null), [score])
  const strong = useMemo(
    () => (score && grades ? pickStrong(score, grades).slice(0, 2) : []),
    [score, grades],
  )
  const naming: NamingBridgeResult | null = useMemo(
    () => (grades ? calcNamingBridge({
      grades, yongsin: p.yongsin, heeksin: p.heeksin, gisin: p.gisin,
    }) : null),
    [grades, p.yongsin, p.heeksin, p.gisin],
  )
  const jj = useMemo(
    () => (ready ? calcJijangganBridge({
      saju: p.saju, solarYear: p.solarYear, solarMonth: p.solarMonth, solarDay: p.solarDay,
    }) : null),
    [ready, p.saju, p.solarYear, p.solarMonth, p.solarDay],
  )
  const cards: CareerCard[] = useMemo(() => {
    if (!ready) return []
    const input = {
      saju: p.saju, solarMonth: p.solarMonth, solarDay: p.solarDay,
      hourBranch: p.hourBranch, target: p.target ?? 'adult',
    }
    return [judgeOhaengGijil(input), judgeGyeyeol(input), judgeJobFit(input)]
      .filter((c): c is CareerCard => !!c && c.lines.length > 0)
  }, [ready, p.saju, p.solarMonth, p.solarDay, p.hourBranch, p.target])

  if (!ready || !score || !grades) return null

  const gijil = cards.find((c) => c.key === 'ohaeng_gijil')
  const jaris = cards.filter((c) => c.key !== 'ohaeng_gijil')

  return (
    <>
      {/* ── 五. 이름에 담을 기운 ── */}
      {naming && (naming.fill.length > 0 || naming.avoid.length > 0) && (
        <div style={{
          background: CARD, border: `1px solid ${LINE}`, borderRadius: 14,
          padding: '13px 12px', marginBottom: 12,
        }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: GOLD, marginBottom: 9 }}>
            이름에 담을 기운
          </div>
          <div style={{ borderLeft: `2px solid ${LINE}`, paddingLeft: 9 }}>
            <div style={{ fontSize: 11.5, color: INK, lineHeight: 1.8 }}>
              {naming.fill.length > 0 && (
                <>이름에 먼저 담아 보실 기운은{' '}
                  <b style={{ color: GOLD }}>{naming.fill.slice(0, 3).join(' · ')}</b>입니다.{' '}</>
              )}
              {naming.avoid.length > 0 && (
                <>{naming.avoid.slice(0, 2).join('·')}는 이미 넉넉하거나 조심스러운 자리라,
                  굳이 더 보태지 않는 편이 좋겠습니다.</>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 9 }}>
              {naming.fill.slice(0, 3).map((el) => <ElChip key={el} el={el} label="담을 것" />)}
              {naming.avoid.slice(0, 2).map((el) => <ElChip key={el} el={el} label="피할 것" muted />)}
            </div>
            {/* ★교재 4장 107쪽 — 상극은 잣대가 아닙니다 */}
            <div style={{ fontSize: 10.5, color: '#a8927e', marginTop: 9, lineHeight: 1.65 }}>
              자원오행은 사주가 바라는 기운을 채우는 것이 본래 목적이라고 봅니다.
              상극이 있다 하여 흠으로 볼 일은 아니라는 견해를 실무에서 널리 따릅니다.
            </div>
          </div>
        </div>
      )}

      {/* ── 六. 사주 명리적성 — ★접힌 채 시작 ── */}
      <div style={{
        background: CARD, border: `1px solid ${LINE}`, borderRadius: 14,
        padding: '13px 12px', marginBottom: 14,
      }}>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{
            width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
          }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: GOLD }}>
            六. 사주 명리적성
          </span>
          <span style={{ fontSize: 11, color: '#8a7063' }}>
            {open ? '접기 ▾' : '펼쳐보기 ▸'}
          </span>
        </button>

        {!open && (
          <div style={{ fontSize: 11, color: '#8a7063', marginTop: 7, lineHeight: 1.7 }}>
            타고난 기질과 어울리는 자리를 함께 봅니다.
          </div>
        )}

        {open && (
          <div style={{ marginTop: 11 }}>
            {/* 강점 지능 */}
            {strong.length > 0 && (
              <>
                <div style={{ fontSize: 11, color: '#96502e', marginBottom: 5 }}>강점 지능</div>
                <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                  {strong.map((el) => (
                    <span key={el} style={{
                      fontSize: 11, fontWeight: 600, padding: '4px 9px', borderRadius: 11,
                      background: EL_CHART[el], color: el === '금' ? '#1a1a1a' : '#fff',
                      border: el === '금' ? '0.5px solid #c8c8c8' : 'none',
                    }}>{el} {grades[el].points}</span>
                  ))}
                </div>
              </>
            )}

            {/* ★career 판정이 낸 lines 만 그립니다. reasons 는 안 그립니다 (교훈 AV) */}
            {gijil && (
              <div style={{ fontSize: 11.5, color: INK, lineHeight: 1.8, marginBottom: 11 }}>
                {gijil.lines.slice(0, 2).map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}

            {jaris.map((c) => (
              <div key={c.key} style={{ marginBottom: 11 }}>
                <div style={{ fontSize: 11, color: '#96502e', marginBottom: 4 }}>{c.title}</div>
                <div style={{ fontSize: 11.5, color: INK, lineHeight: 1.8 }}>
                  {c.lines.slice(0, 2).map((l, i) => <div key={i}>{l}</div>)}
                </div>
              </div>
            ))}

            {/* 월지 지장간 */}
            {jj?.jijanggan && jj.daysAfterJol != null && (
              <div style={{ background: '#faf3ec', borderRadius: 9, padding: '9px 10px', marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: '#96502e', marginBottom: 3 }}>월지 지장간</div>
                <div style={{ fontSize: 11, color: INK, lineHeight: 1.7 }}>
                  절기가 든 뒤 {jj.daysAfterJol.toFixed(1)}일째, {jj.jijanggan.stage}기{' '}
                  {jj.jijanggan.currentGan}의 자리입니다.{' '}
                  {Object.entries(jj.jijanggan.elementRatio)
                    .filter(([, v]) => v > 0)
                    .sort((a, b) => b[1] - a[1])
                    .map(([el, v]) => `${el} ${Math.round(v * 100)}%`)
                    .join(' · ')}
                </div>
              </div>
            )}

            {/* ★상세 화면으로 */}
            <a
              href={p.careerHref}
              style={{
                display: 'block', textAlign: 'center', textDecoration: 'none',
                fontSize: 12, fontWeight: 600, color: '#fff', background: GOLD,
                borderRadius: 12, padding: '12px 14px',
              }}>
              상세 진로·적성 분석 보러가기 →
            </a>
          </div>
        )}
      </div>
    </>
  )
}

/** 오행 칩 — 색은 정본에서만 가져옵니다 */
function ElChip({ el, label, muted }: { el: Ohaeng; label: string; muted?: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      fontSize: 11, padding: '3px 9px', borderRadius: 11,
      background: muted ? '#f2eee9' : '#fff',
      border: `1px solid ${LINE}`, color: muted ? '#7a6a5c' : INK,
    }}>
      <span style={{
        width: 8, height: 8, borderRadius: 4, background: EL_CHART[el],
        border: el === '금' ? '0.5px solid #c8c8c8' : 'none', flexShrink: 0,
      }} />
      <span style={{ fontSize: 10, color: '#8a7063' }}>{label}</span>
      <b style={{ color: muted ? '#7a6a5c' : EL_TEXT[el] }}>{el}</b>
    </span>
  )
}
