'use client'
// app/manseryeok/moving-timing/components/PickMovingV1.tsx
//
// ★ 이사택일 v1 — 날짜 고르기 화면.
//   점수·순위·별점을 보여주지 않는다. 조건을 켜고 끄며 직접 고른다.
//   결혼택일 PickWeddingV7 과 같은 구조.
//
//   [화면 구성]
//   · 두 사람 명식 (CoupleWonguk 재사용) + 명의·방향 표시
//   · 이미 확인해 둔 것 (고정 4) — 칩. 누르면 설명. 끌 수 없다.
//   · 더 보고 싶은 것 (선택 3) — 쉬는 날 / 손 없는 날 / 방향에 손 없는 날
//   · 남은 날 목록 — 연도별
//
//   [원칙] 조건을 많이 켤수록 좋은 게 아니라는 것을 문구로 알린다.

import { useMemo, useState } from 'react'
import {
  OPT_FILTERS, FIXED_CHIPS, DEFAULT_OPT, passOpt,
  type OptKey, type OptState,
} from '../lib/movingFilterV1'
import type { DayResult, MovingV1Result } from '../lib/recommendV1'
import { DIR_HANJA } from '../lib/movingTables'
import MovingTermModal from './MovingTermModal'
import CoupleWonguk from '@/app/manseryeok/couple-result-new/components/CoupleWonguk'
import SoloWonguk from './SoloWonguk'

// 이사택일 포인트 색 — 홈 메뉴의 #967850 계열(흙빛)
const C = {
  bg: '#FBF8F2', card: '#FFFDF9', line: '#EAE0CE', ink: '#3A3228',
  sub: '#9A8060', brand: '#7A6440', accent: '#967850', soft: '#F2EADA', warm: '#F5F0E4',
}

interface Props {
  result: MovingV1Result
  onPickDay?: (day: DayResult) => void
}

export default function PickMovingV1({ result, onPickDay }: Props) {
  const [on, setOn] = useState<OptState>(DEFAULT_OPT)
  const [help, setHelp] = useState<string | null>(null)

  const filterBy = useMemo(() => (state: OptState): DayResult[] =>
    result.days.filter(d => passOpt(d.detail, state)), [result.days])

  const days = filterBy(on)
  const sonCount = days.filter(d => d.detail.optSonEomneun).length

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

  // 판정에 실제로 쓴 사람. 옛 보관함 스냅샷에 people 이 없으면 계약자로 되살린다.
  const people = result.people?.length
    ? result.people
    : (result.contractor ? [result.contractor] : [])

  const ownerText = result.ownerMode === 'joint'
    ? '공동명의 — 두 분 모두 보고 골랐어요'
    : `단독명의 — ${people[0]?.name ?? ''}님 사주로 골랐어요`

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 60px' }}>

      <div style={{
        background: 'rgba(255,120,120,.06)', border: '1px solid rgba(255,120,120,.18)',
        borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 600,
        color: '#C0705E', lineHeight: 1.7, margin: '16px 0',
      }}>
        ※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 이사일은 계약·잔금·
        이삿짐 업체 사정을 함께 고려해 결정하세요.
      </div>

      {/* 명식 — ★판정에 실제로 쓴 사람만 그린다(result.people).
          공동명의면 두 분, 단독명의면 명의자 한 분.
          배우자를 입력했더라도 단독명의면 판정에 안 쓰이므로 그리지 않는다.
          (2026-07-24 대표님 확인 — "한 사람 명의이면 등록한 그 사람만 나오면 된다") */}
      {people.length > 0 && (
        <div style={{ marginBottom: 15 }}>
          {people.length >= 2 ? (
            <>
              <CoupleWonguk
                left={{
                  name: people[0].name,
                  birth: people[0].birthLabel,
                  saju: people[0].pillars,
                }}
                right={{
                  name: people[1].name,
                  birth: people[1].birthLabel,
                  saju: people[1].pillars,
                }}
              />
              <div style={{
                display: 'flex', gap: 6, marginTop: 7, fontSize: 11.5,
                color: C.sub, lineHeight: 1.6,
              }}>
                <span style={{ flex: 1, textAlign: 'center' }}>
                  필요한 기운 <b style={{ color: C.brand }}>{people[0].yongsin || '—'}</b>
                </span>
                <span style={{ color: '#DDD0BC' }}>·</span>
                <span style={{ flex: 1, textAlign: 'center' }}>
                  필요한 기운 <b style={{ color: C.brand }}>{people[1].yongsin || '—'}</b>
                </span>
              </div>
            </>
          ) : (
            <SoloWonguk person={people[0]} />
          )}
        </div>
      )}

      {/* 명의·방향 요약 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        background: C.soft, borderRadius: 11, padding: '11px 14px', marginBottom: 15,
        fontSize: 12.5, color: C.sub, lineHeight: 1.6,
      }}>
        <span style={{ fontWeight: 700, color: C.brand }}>{ownerText}</span>
        {result.direction && (
          <span style={{ marginLeft: 'auto' }}>
            가는 방향{' '}
            <b style={{ color: C.brand }}>
              {result.direction}쪽
              <span style={{ fontSize: 10, color: '#C0AC90', marginLeft: 3 }}>
                {DIR_HANJA[result.direction]}
              </span>
            </b>
          </span>
        )}
      </div>

      {/* 음력을 못 읽은 경우 안내 */}
      {result.lunarFailed && (
        <div style={{
          background: '#FBF1E4', border: `1px solid ${C.line}`, borderRadius: 10,
          padding: '11px 14px', fontSize: 12.5, color: '#A87B4A',
          lineHeight: 1.7, marginBottom: 15,
        }}>
          음력을 읽지 못해 <b>손 없는 날</b> 조건은 지금 쓸 수 없어요.
          아래 네 가지는 정상으로 확인했어요.
        </div>
      )}

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
              <span style={{ fontSize: 10, color: '#C0AC90', fontWeight: 400 }}>{f.hanja}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 선택 2개 */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.brand, marginBottom: 4 }}>
          더 보고 싶은 것
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.75, marginBottom: 10 }}>
          많이 켤수록 좋은 게 아니에요. 켤수록 고르실 수 있는 날이 줄어들어요.
        </div>

        {OPT_FILTERS.map(f => {
          const pv = preview(f.key)
          const active = on[f.key]
          // ★주말 토글은 음력과 무관하므로 잠그지 않는다.
          const disabled = result.lunarFailed && f.key !== 'optWeekend'
          return (
            <div key={f.key} style={{
              display: 'flex', alignItems: 'center', gap: 11,
              background: active ? C.soft : C.card,
              border: `1px solid ${active ? C.accent : C.line}`,
              borderRadius: 12, padding: '13px 14px', marginBottom: 8,
              opacity: disabled ? 0.5 : 1,
            }}>
              <button
                onClick={() => !disabled && setHelp(f.key)}
                style={{
                  flex: 1, textAlign: 'left', background: 'none', border: 'none',
                  padding: 0, cursor: disabled ? 'default' : 'pointer', fontFamily: 'inherit',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: C.ink, letterSpacing: '-.2px' }}>
                    {f.label}
                  </span>
                  <span style={{ fontSize: 10, color: '#C0AC90' }}>{f.hanja}</span>
                </div>
                <div style={{ fontSize: 11.5, color: toneColor[pv.tone], marginTop: 3 }}>
                  {disabled ? '음력을 읽지 못해 쓸 수 없어요' : pv.text}
                </div>
              </button>

              <button
                onClick={() => !disabled && setOn(s => ({ ...s, [f.key]: !s[f.key] }))}
                aria-label={`${f.label} ${active ? '끄기' : '켜기'}`}
                style={{
                  width: 44, height: 26, borderRadius: 13, border: 'none',
                  background: active ? C.accent : '#DDD3C0',
                  position: 'relative', cursor: disabled ? 'default' : 'pointer',
                  flex: 'none', transition: 'background .15s',
                }}
              >
                <span style={{
                  position: 'absolute', top: 3, left: active ? 21 : 3,
                  width: 20, height: 20, borderRadius: '50%', background: '#fff',
                  transition: 'left .15s',
                }} />
              </button>
            </div>
          )
        })}
      </div>

      {/* 남은 날 */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 11,
      }}>
        <span style={{ fontSize: 24, fontWeight: 700, color: C.brand }}>{days.length}</span>
        <span style={{ fontSize: 13.5, color: C.sub }}>일을 고르실 수 있어요</span>
        {sonCount > 0 && (
          <span style={{ fontSize: 11.5, color: '#8FA37E', marginLeft: 'auto' }}>
            손 없는 날 {sonCount}일
          </span>
        )}
      </div>

      {days.length === 0 ? (
        <div style={{
          background: C.card, border: `1px solid ${C.line}`, borderRadius: 12,
          padding: '28px 20px', textAlign: 'center', fontSize: 13,
          color: C.sub, lineHeight: 1.8,
        }}>
          조건을 하나만 꺼 보시면 다시 나타나요.
        </div>
      ) : (
        [...byYear.entries()].map(([y, list]) => (
          <div key={y} style={{ marginBottom: 18 }}>
            <div style={{
              fontSize: 12.5, fontWeight: 700, color: C.sub, marginBottom: 7,
              paddingLeft: 2,
            }}>
              {y}년
            </div>
            <div style={{
              background: C.card, border: `1px solid ${C.line}`,
              borderRadius: 12, overflow: 'hidden',
            }}>
              {list.map((d, i) => (
                <button
                  key={d.dateKey}
                  onClick={() => onPickDay?.(d)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    padding: '13px 15px', background: 'none', border: 'none',
                    borderBottom: i < list.length - 1 ? `1px solid ${C.line}` : 'none',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: 14, color: C.ink, fontWeight: 600, minWidth: 76 }}>
                    {d.dateLabel}
                  </span>
                  <span style={{
                    fontSize: 12.5,
                    color: d.detail.optWeekend ? '#B4634A' : C.sub,
                    fontWeight: d.detail.optWeekend ? 700 : 400,
                  }}>
                    {d.weekday}
                  </span>
                  <span style={{ fontSize: 12, color: '#C0AC90' }}>{d.ganji}</span>
                  {d.detail.optSonEomneun ? (
                    <span style={{
                      marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                      color: '#5F7A4E', background: '#EDF3E4',
                      padding: '3px 9px', borderRadius: 7,
                    }}>
                      손 없는 날
                    </span>
                  ) : (
                    <span style={{ marginLeft: 'auto', fontSize: 11.5, color: '#BFAE96' }}>
                      {d.lunarLabel}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        ))
      )}

      {days.length > 0 && (
        <div style={{ fontSize: 11.5, color: '#BFAE96', marginTop: 4, paddingLeft: 2 }}>
          날짜를 누르면 보관함에 저장돼요.
        </div>
      )}

      <MovingTermModal termKey={help} onClose={() => setHelp(null)} />
    </div>
  )
}
