'use client'
// app/manseryeok/wedding-timing/components/PickWeddingV7.tsx
//
// ★ 결혼택일 v7 — 날짜 고르기 화면.
//   점수·순위·별점을 보여주지 않는다. 조건을 켜고 끄며 두 분이 직접 고른다.
//
//   [화면 구성]
//   · 이미 확인해 둔 것 (고정 4개) — 칩. 누르면 설명 모달. 끌 수 없다.
//   · 더 보고 싶은 것 (선택 3개) — 카드를 누르면 설명, 스위치로 켜고 끔
//   · 남은 날 목록 — 연도별로 묶어서
//   · 남는 날이 없으면 조건을 끄도록 안내
//
//   [원칙] 조건을 많이 켤수록 좋은 게 아니라는 것을 문구로 계속 알린다.

import { useMemo, useState } from 'react'
import {
  OPT_FILTERS, FIXED_CHIPS, DEFAULT_OPT, passOpt,
  type OptKey, type OptState,
} from '../lib/weddingFilterV7'
import type { DayResult, WeddingV7Result } from '../lib/recommendV7'
import WeddingTermModal from './WeddingTermModal'

const C = {
  bg: '#FDF6F0', card: '#FFFBF7', line: '#F0E0D5', ink: '#3A2E28',
  sub: '#B4785A', brand: '#96502E', accent: '#C8783C', soft: '#F6E3D6', warm: '#F5EDE6',
}

interface Props {
  result: WeddingV7Result
  onPickDay?: (day: DayResult) => void
}

export default function PickWeddingV7({ result, onPickDay }: Props) {
  const [on, setOn] = useState<OptState>(DEFAULT_OPT)
  const [help, setHelp] = useState<string | null>(null)

  const filterBy = useMemo(() => (state: OptState): DayResult[] =>
    result.days.filter(d => passOpt(d.detail, state)), [result.days])

  const days = filterBy(on)
  const onCount = (Object.keys(on) as OptKey[]).filter(k => on[k]).length
  const bothCount = days.filter(d => d.detail.optBoth).length

  /** 토글 하나를 켜면/끄면 며칠이 바뀌는지 미리 계산 */
  function preview(k: OptKey) {
    if (on[k]) {
      const back = filterBy({ ...on, [k]: false }).length
      return back > days.length
        ? { text: `켜는 중 · 끄면 ${back - days.length}일 늘어요`, tone: 'on' as const }
        : { text: '켜는 중', tone: 'on' as const }
    }
    const next = filterBy({ ...on, [k]: true }).length
    if (next === 0) return { text: '지금 켜면 남는 날이 없어요', tone: 'zero' as const }
    const diff = days.length - next
    if (diff === 0) return { text: '켜도 그대로예요', tone: 'same' as const }
    return { text: `켜면 ${diff}일 줄어요`, tone: 'norm' as const }
  }

  const toneColor = { on: '#8FA37E', zero: '#C0705E', same: '#AA9999', norm: C.brand }

  // 연도별로 묶기
  const byYear = new Map<number, DayResult[]>()
  for (const d of days) {
    if (!byYear.has(d.y)) byYear.set(d.y, [])
    byYear.get(d.y)!.push(d)
  }

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 60px' }}>

      <div style={{
        background: 'rgba(255,120,120,.06)', border: '1px solid rgba(255,120,120,.18)',
        borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 600,
        color: '#C0705E', lineHeight: 1.7, margin: '16px 0',
      }}>
        ※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 예식일은 양가·예식장
        사정과 두 분의 형편을 함께 고려해 결정하세요.
      </div>

      {/* 고정 4개 */}
      <div style={{ background: C.warm, borderRadius: 13, padding: '14px 15px', marginBottom: 15 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.brand, letterSpacing: '-.2px' }}>
          이미 확인해 둔 것
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.75, marginTop: 7 }}>
          알려주신 기간 <b style={{ color: C.brand }}>{result.totalCandidates}일</b>을 모두 살펴
          아래 네 가지를 미리 확인했어요. <b style={{ color: C.brand }}>눌러보시면 설명이 나와요.</b>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 11 }}>
          {FIXED_CHIPS.map(f => (
            <button key={f.key} onClick={() => setHelp(f.key)} style={{
              display: 'flex', alignItems: 'baseline', gap: 4,
              background: '#fff', border: `1px solid ${C.line}`, borderRadius: 8,
              padding: '6px 11px', fontSize: 12.5, color: C.brand, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '-.2px',
            }}>
              {f.label}
              <span style={{ fontSize: 10, color: '#C9AA96', fontWeight: 400 }}>{f.hanja}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 카운터 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20, background: C.bg,
        padding: '13px 0 12px', borderBottom: `1px solid ${C.line}`, marginBottom: 15,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
          <b style={{
            fontSize: 33, color: days.length ? C.brand : '#C0705E',
            letterSpacing: '-1.3px', fontVariantNumeric: 'tabular-nums',
          }}>{days.length}</b>
          <span style={{ fontSize: 13, color: C.sub }}>일 고를 수 있어요</span>
        </div>
        <div style={{ height: 6, background: '#EFE2D8', borderRadius: 99, overflow: 'hidden', marginTop: 9 }}>
          <div style={{
            height: '100%',
            width: `${result.passedFixed ? (days.length / result.passedFixed) * 100 : 0}%`,
            background: `linear-gradient(90deg, ${C.accent}, #E3A874)`,
            transition: 'width .45s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, margin: '22px 0 4px' }}>
        더 보고 싶은 것을 골라보세요
      </div>
      <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.7, margin: '0 0 11px' }}>
        <b style={{ color: C.brand }}>많이 켠다고 더 좋은 날이 되는 건 아니에요.</b>{' '}
        무엇을 더 눈여겨보실지에 따라 고르시면 됩니다.
      </p>

      {/* 선택 3개 */}
      {OPT_FILTERS.map(f => {
        const p = preview(f.key)
        const active = on[f.key]
        return (
          <div key={f.key} onClick={() => setHelp(f.key)} style={{
            background: active ? '#FFF6EE' : C.card,
            border: `1px solid ${active ? C.accent : C.line}`,
            borderRadius: 14, padding: '15px 15px 14px', marginBottom: 9, cursor: 'pointer',
            boxShadow: active ? '0 2px 10px rgba(200,120,60,.10)' : 'none',
            transition: 'background .2s, border-color .2s, box-shadow .2s',
            opacity: p.tone === 'zero' ? .5 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 15.5, fontWeight: 700, letterSpacing: '-.3px' }}>{f.label}</span>
                  <span style={{ fontSize: 10.5, color: '#C9AA96', fontWeight: 400 }}>{f.hanja}</span>
                </div>
                <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6, marginTop: 5 }}>{f.desc}</div>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setOn({ ...on, [f.key]: !active }) }}
                aria-label={`${f.label} ${active ? '끄기' : '켜기'}`}
                style={{
                  flex: 'none', width: 48, height: 28, borderRadius: 99,
                  background: active ? C.accent : '#E4D5C8', position: 'relative',
                  cursor: 'pointer', border: 'none', transition: 'background .2s',
                }}>
                <span style={{
                  position: 'absolute', top: 3, left: 3, width: 22, height: 22,
                  borderRadius: '50%', background: '#fff',
                  transform: active ? 'translateX(20px)' : 'none',
                  transition: 'transform .2s', boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                }} />
              </button>
            </div>
            <div style={{
              marginTop: 11, paddingTop: 10, borderTop: `1px solid ${active ? '#F2DFCC' : '#F7EDE5'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 600, color: toneColor[p.tone] }}>
                {p.tone === 'on' ? '✓ ' : ''}{p.text}
              </span>
              <span style={{ fontSize: 11, color: '#C9AA96' }}>눌러서 자세히</span>
            </div>
          </div>
        )
      })}

      {/* 결과 */}
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '24px 0 10px' }}>
        <h3 style={{ fontSize: 15, margin: 0 }}>고를 수 있는 날</h3>
        <span style={{ fontSize: 12, color: C.sub }}>
          {onCount ? `${onCount}가지 보는 중` : '조건 없이 전체'}
        </span>
      </div>

      <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden' }}>
        {days.length > 0 ? [...byYear.entries()].map(([year, list], idx) => (
          <div key={year} style={{
            padding: '13px 14px',
            borderBottom: idx < byYear.size - 1 ? '1px solid #F7EDE5' : 'none',
          }}>
            <div style={{ fontSize: 11, color: C.sub, marginBottom: 8 }}>{year}년</div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {list.map(d => {
                const hl = d.detail.optBoth
                return (
                  <button key={d.dateKey} onClick={() => onPickDay?.(d)} style={{
                    background: hl ? '#FBEEE2' : C.soft, color: C.brand,
                    border: hl ? `1.5px solid ${C.accent}` : '1px solid transparent',
                    borderRadius: 8, padding: hl ? '7px 10px' : '8px 11px',
                    fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                    fontFamily: 'inherit', textAlign: 'left', lineHeight: 1.4,
                  }}>
                    {d.dateLabel}{hl ? ' ♥' : ''}
                    <span style={{ display: 'block', fontSize: 10.5, color: C.sub, fontWeight: 400, marginTop: 1 }}>
                      {d.weekday} · {d.ganji}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )) : (
          <div style={{ padding: '26px 18px', textAlign: 'center', color: C.sub, fontSize: 13, lineHeight: 1.8 }}>
            <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
              고르신 조건을 모두 만족하는 날이 없어요
            </div>
            <p style={{ margin: 0 }}>
              조건을 <b style={{ color: C.brand }}>하나만 꺼</b> 보시면 다시 나타납니다.
            </p>
          </div>
        )}
      </div>

      {/* 하단 안내 — 상황에 따라 문구가 바뀐다 */}
      <div style={{
        fontSize: 12, color: C.sub, lineHeight: 1.75, marginTop: 13,
        padding: '12px 14px', background: C.warm, borderRadius: 10,
      }}>
        {days.length === 0 ? (
          <>조건은 <b style={{ color: C.brand }}>많이 켤수록 좋은 게 아니라</b>, 무엇을 더 보고
            싶은지의 문제예요. 세 가지를 모두 만족하는 날은 드뭅니다.</>
        ) : on.optBoth ? (
          <>두 분 모두에게 맞는 <b style={{ color: C.brand }}>{days.length}일</b>이 남았어요.
            예식장 사정과 맞지 않으면 이 조건을 꺼보세요.</>
        ) : bothCount > 0 ? (
          <><b style={{ color: C.brand }}>♥ 표시한 {bothCount}일</b>은 신랑·신부 두 분께 모두
            좋은 날이에요. 위 <b style={{ color: C.brand }}>두 분 모두 좋은 날</b>을 켜면
            이 {bothCount}일만 남습니다.</>
        ) : (
          <>지금 <b style={{ color: C.brand }}>{days.length}일</b>이 남았어요.
            날짜를 누르면 그날이 어떤 날인지 자세히 볼 수 있어요.</>
        )}
      </div>

      <WeddingTermModal termKey={help} onClose={() => setHelp(null)} />
    </div>
  )
}
