'use client'
// app/manseryeok/moving-timing/components/CheckResultV1.tsx
//
// ★ 이사택일 v1 — 정한 날 봐주기 결과.
//   날짜마다 6줄(고정 4 + 선택 2)을 O/X 로 보여준다. 점수를 매기지 않는다.
//   결혼택일 CheckResultV7 과 같은 구조.
//
//   [표시 규칙]
//   ✓ 통과 / ✕ 걸림 / — 해당없음
//   ★선택 2줄(손·방향)은 '흉일'이 아니다. 안 걸려도 X 가 아니라 회색 대시로 둔다.
//     손 없는 날이 아니라고 나쁜 날이 아니기 때문. 정통 택일에서도 참고 조건이다.
//   ★대안 날짜는 주지 않는다. 필요하면 '좋은 날 찾기'로 가시면 된다.

import { useState } from 'react'
import { ALL_ROWS, type MovingFlags } from '../lib/movingFilterV1'
import type { DayResult, DiagnoseV1Result } from '../lib/recommendV1'
import { DIR_HANJA } from '../lib/movingTables'
import MovingTermModal from './MovingTermModal'
import CoupleWonguk from '@/app/manseryeok/couple-result-new/components/CoupleWonguk'

const C = {
  bg: '#FBF8F2', card: '#FFFDF9', line: '#EAE0CE', ink: '#3A3228',
  sub: '#9A8060', brand: '#7A6440', accent: '#967850', soft: '#F2EADA', warm: '#F5F0E4',
  bad: '#C0705E', good: '#5F7A4E',
}

interface Props {
  result: DiagnoseV1Result
}

export default function CheckResultV1({ result }: Props) {
  const [help, setHelp] = useState<string | null>(null)

  const ownerText = result.ownerMode === 'joint'
    ? '공동명의 — 두 분 모두 봤어요'
    : `단독명의 — ${result.people[0]?.name ?? ''}님 사주로 봤어요`

  /**
   * 한 날짜의 한 줄이 어떻게 보일지.
   *
   * ★걸린 줄은 눈에 확 띄어야 한다. 마크만 굵게 하면 잘 안 보여서
   *   마크·라벨·근거를 함께 굵게 하고 줄 배경에도 옅은 붉은 기를 준다.
   */
  function cellOf(day: DayResult, key: keyof MovingFlags, kind: 'fix' | 'opt') {
    const v = day.detail[key] as boolean
    if (kind === 'fix') {
      return v
        ? { mark: '✓', color: C.good, weight: 400, hit: false }
        : { mark: '✕', color: C.bad, weight: 700, hit: true }
    }
    // 선택 조건 — 안 맞아도 흉일이 아니다. 회색 대시로 둔다.
    if (result.lunarFailed) return { mark: '—', color: '#C9BBA6', weight: 400, hit: false }
    return v
      ? { mark: '✓', color: C.good, weight: 400, hit: false }
      : { mark: '—', color: '#C9BBA6', weight: 400, hit: false }
  }

  /** 걸린 근거 문구 ('戌 ↔ 배우자 丑' 같은) */
  function reasonOf(day: DayResult, key: keyof MovingFlags): string {
    const d = day.detail
    const br = day.ganji[1]
    if (key === 'fixGongmang' && d.gongmangWho.length > 0) {
      return `${d.gongmangWho.join('·')}님 공망`
    }
    if (key === 'fixChung' && d.chungWho.length > 0) {
      return `${br} ↔ ${d.chungWho.join('·')}님 일지`
    }
    if (key === 'fixHyeong' && d.hyeongWho.length > 0) {
      return `${d.hyeongKind} · ${br} ↔ ${d.hyeongWho.join('·')}님 일지`
    }
    if (key === 'fixMyeongjeol' && !d.fixMyeongjeol) {
      return day.holidayName || '명절 연휴'
    }
    if (key === 'optSonEomneun' && !d.optSonEomneun && !result.lunarFailed) {
      return d.sonDir ? `${d.sonDir}쪽에 손` : ''
    }
    if (key === 'optDirection' && !d.optDirection && result.direction) {
      return `${result.direction}쪽에 손`
    }
    return ''
  }

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

      {/* 두 사람 명식 */}
      {result.contractor && (
        <div style={{ marginBottom: 15 }}>
          <CoupleWonguk
            left={{
              name: result.contractor.name,
              birth: result.contractor.birthLabel,
              saju: result.contractor.pillars,
            }}
            right={{
              name: (result.spouse ?? result.contractor).name,
              birth: (result.spouse ?? result.contractor).birthLabel,
              saju: (result.spouse ?? result.contractor).pillars,
            }}
          />
        </div>
      )}

      {/* 명의·방향 */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap',
        background: C.soft, borderRadius: 11, padding: '11px 14px', marginBottom: 16,
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

      {result.lunarFailed && (
        <div style={{
          background: '#FBF1E4', border: `1px solid ${C.line}`, borderRadius: 10,
          padding: '11px 14px', fontSize: 12.5, color: '#A87B4A',
          lineHeight: 1.7, marginBottom: 15,
        }}>
          음력을 읽지 못해 <b>손</b> 관련 두 줄은 확인하지 못했어요.
        </div>
      )}

      {/* 날짜별 진단 */}
      {result.results.map(day => {
        const fixOk = day.detail.passFixed
        return (
          <div key={day.dateKey} style={{
            background: C.card,
            border: fixOk ? `1px solid ${C.line}` : `1.5px solid #E0A99A`,
            borderRadius: 13, padding: '15px 16px', marginBottom: 13,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 3 }}>
              <span style={{
                fontSize: 16, fontWeight: 700,
                color: fixOk ? C.ink : C.bad, letterSpacing: '-.3px',
              }}>
                {day.fullLabel}
              </span>
              <span style={{ fontSize: 12.5, color: C.sub }}>{day.weekday}</span>
              <span style={{ fontSize: 11.5, color: '#C0AC90', marginLeft: 'auto' }}>
                {day.ganji}
              </span>
            </div>
            <div style={{ fontSize: 11.5, color: '#BFAE96', marginBottom: 12 }}>
              {day.lunarLabel}
              {day.holidayName && ` · ${day.holidayName}`}
            </div>

            {ALL_ROWS.map(row => {
              const cell = cellOf(day, row.key, row.kind)
              const reason = reasonOf(day, row.key)
              return (
                <button
                  key={row.key}
                  onClick={() => setHelp(row.key as string)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, width: '100%',
                    padding: cell.hit ? '9px 8px' : '8px 0',
                    margin: cell.hit ? '0 -8px' : 0,
                    background: cell.hit ? '#FBEFEC' : 'none',
                    border: 'none', borderTop: `1px solid ${C.line}`,
                    borderRadius: cell.hit ? 8 : 0,
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                  }}
                >
                  <span style={{
                    fontSize: cell.hit ? 15 : 14, color: cell.color, fontWeight: cell.weight,
                    width: 16, textAlign: 'center', flex: 'none',
                  }}>
                    {cell.mark}
                  </span>
                  <span style={{
                    fontSize: 13, color: cell.hit ? C.bad : C.ink,
                    fontWeight: cell.hit ? 700 : 400,
                  }}>
                    {row.label}
                  </span>
                  <span style={{ fontSize: 10, color: cell.hit ? '#D0A090' : '#C0AC90' }}>
                    {row.hanja}
                  </span>
                  {reason && (
                    <span style={{
                      marginLeft: 'auto', fontSize: cell.hit ? 12 : 11.5,
                      fontWeight: cell.hit ? 700 : 400,
                      color: cell.hit ? C.bad : '#BFAE96',
                    }}>
                      {reason}
                    </span>
                  )}
                </button>
              )
            })}

            {(() => {
              const hits = [
                !day.detail.fixMyeongjeol && '명절',
                !day.detail.fixGongmang && '공망',
                !day.detail.fixChung && '충',
                !day.detail.fixHyeong && '형',
              ].filter(Boolean) as string[]
              return (
                <div style={{
                  marginTop: 11, paddingTop: 11, borderTop: `1px solid ${C.line}`,
                  fontSize: 12.5, lineHeight: 1.75,
                  color: fixOk ? C.good : C.bad, fontWeight: 700,
                }}>
                  {fixOk
                    ? '꼭 봐야 할 네 가지는 모두 지나갔어요.'
                    : `${hits.join('·')}에 걸려요. 다른 날을 보시는 게 좋겠어요.`}
                </div>
              )
            })()}
          </div>
        )
      })}

      <div style={{
        fontSize: 12, color: '#BFAE96', lineHeight: 1.8, marginTop: 6, paddingLeft: 2,
      }}>
        아래 두 줄(손 없는 날 · 방향)은 참고 조건이에요. 안 맞아도 나쁜 날은 아니에요.
        <br />
        다른 날을 찾고 싶으시면 이전 화면에서 <b style={{ color: C.brand }}>좋은 날 찾기</b>를
        골라 주세요.
      </div>

      <MovingTermModal termKey={help} onClose={() => setHelp(null)} />
    </div>
  )
}
