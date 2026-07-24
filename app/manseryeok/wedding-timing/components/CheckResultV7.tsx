'use client'
// app/manseryeok/wedding-timing/components/CheckResultV7.tsx
//
// ★ 결혼택일 v7 — 정한 날 진단 카드.
//   filter 화면이 '365일에서 걸러내는' 일이라면 여기는 반대다.
//   두 분이 고른 하루가 일곱 가지 조건을 각각 통과하는지 보여준다.
//
//   [세 가지 상태]
//   ✓ 통과 / ✕ 걸림 / — 해당 없음
//   ★용신일(6·7번)은 흉일이 아니라 '있으면 더 좋은 것'이라 X 가 아니라 회색 대시다.
//     용신일이 아니라고 나쁜 날은 아니기 때문.
//
//   [대안 날짜는 주지 않는다]
//   뒤로 가서 '좋은 날 찾기'로 다시 조회하면 되므로 중복이다. (2026-07-24 결정)

import { useState } from 'react'
import { ALL_ROWS, type WeddingFlags } from '../lib/weddingFilterV7'
import type { DayResult } from '../lib/recommendV7'
import WeddingTermModal from './WeddingTermModal'
import CoupleWonguk from '@/app/manseryeok/couple-result-new/components/CoupleWonguk'
import type { PersonSaju } from '../lib/weddingFilterV7'

const C = {
  card: '#FFFBF7', line: '#F0E0D5', ink: '#3A2E28',
  sub: '#B4785A', brand: '#96502E', accent: '#C8783C', warm: '#F5EDE6',
}

/** 걸린 항목에 붙일 근거 문구. branch 는 그날의 일지 한 글자. */
function reasonOf(key: string, d: DayResult['detail'], branch: string): string {
  switch (key) {
    case 'optWeekend':
      return d.optWeekend ? '' : '평일'
    case 'fixMyeongjeol':
      return d.fixMyeongjeol ? '평상시' : '명절 연휴'
    case 'fixGongmang':
      return d.fixGongmang ? branch : `${branch} = ${d.gongmangWho.join('·')} 공망`
    case 'fixChung':
      return d.fixChung ? '해당 없음' : `${branch} ↔ ${d.chungWho.join('·')}`
    case 'fixHyeong':
      return d.fixHyeong ? '해당 없음' : `${d.hyeongKind} · ${d.hyeongWho.join('·')}`
    case 'optBride':
      return d.optBride ? d.brideHit : '해당 없음'
    case 'optBoth':
      return d.optBoth ? d.groomHit : '해당 없음'
    default:
      return ''
  }
}

/** 한 줄 요약 — 가장 무거운 것 하나만 말한다 */
function summaryOf(d: DayResult['detail']): { tone: 'good' | 'soso' | 'bad'; head: string; msg: string } {
  const blocked = !d.passFixed
  if (blocked) {
    if (!d.fixMyeongjeol) return { tone: 'bad', head: '아쉬운 날', msg: '명절 연휴라 예식이 어려워요' }
    if (d.hyeongWho.length) return { tone: 'bad', head: '아쉬운 날', msg: `${d.hyeongWho.join('·')}분과 모나는 날이에요` }
    if (d.chungWho.length) return { tone: 'bad', head: '아쉬운 날', msg: `${d.chungWho.join('·')}분과 부딪히는 날이에요` }
    if (d.gongmangWho.length) return { tone: 'bad', head: '아쉬운 날', msg: `${d.gongmangWho.join('·')}분께 빈자리인 날이에요` }
  }
  if (d.optBoth) return { tone: 'good', head: '두 분 모두에게 좋은 날', msg: '일곱 가지를 모두 통과했어요' }
  if (d.optBride) return { tone: 'good', head: '신부에게 좋은 날', msg: '피할 것 없이 기운도 맞아요' }
  return { tone: 'soso', head: '괜찮은 날', msg: '피할 것은 없는 날이에요' }
}

export default function CheckResultV7({
  results, bride, groom,
}: {
  results: DayResult[]
  bride?: PersonSaju | null
  groom?: PersonSaju | null
}) {
  const [help, setHelp] = useState<string | null>(null)

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 60px' }}>
      <div style={{
        background: 'rgba(255,120,120,.06)', border: '1px solid rgba(255,120,120,.18)',
        borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 600,
        color: '#C0705E', lineHeight: 1.7, margin: '16px 0 18px',
      }}>
        ※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 예식일은 양가·예식장
        사정과 두 분의 형편을 함께 고려해 결정하세요.
      </div>

      {/* 두 사람 명식 — 필터 화면과 같은 부품. 무엇을 근거로 봤는지 먼저 보여준다 */}
      {groom && bride && (
        <div style={{ marginBottom: 16 }}>
          <CoupleWonguk
            left={{ name: groom.name, birth: groom.birthLabel, saju: groom.pillars }}
            right={{ name: bride.name, birth: bride.birthLabel, saju: bride.pillars }}
          />
          <div style={{
            display: 'flex', gap: 6, marginTop: 7, fontSize: 11.5,
            color: C.sub, lineHeight: 1.6,
          }}>
            <span style={{ flex: 1, textAlign: 'center' }}>
              필요한 기운 <b style={{ color: C.brand }}>{groom.yongsin || '—'}</b>
            </span>
            <span style={{ color: '#E0CDBC' }}>·</span>
            <span style={{ flex: 1, textAlign: 'center' }}>
              필요한 기운 <b style={{ color: C.brand }}>{bride.yongsin || '—'}</b>
            </span>
          </div>
        </div>
      )}

      {results.map(r => {
        const s = summaryOf(r.detail)
        const box =
          s.tone === 'good' ? { bg: '#FBEEE2', bd: '1.5px solid #C8783C', lab: '#96502E', txt: '#7A3E20' }
          : s.tone === 'bad' ? { bg: '#FBECE8', bd: '1px solid #E8C4B8', lab: '#C0705E', txt: '#A65440' }
          : { bg: C.warm, bd: '1px solid #E8DCD0', lab: '#96502E', txt: '#6B4A38' }

        return (
          <div key={r.dateKey} style={{
            background: C.card, border: `1px solid ${C.line}`, borderRadius: 14,
            padding: 16, marginBottom: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: '-.5px' }}>
                {r.fullLabel}
              </span>
              <span style={{ fontSize: 12.5, color: C.sub, flex: 'none' }}>
                {r.weekday}요일 · {r.ganji}
              </span>
            </div>
            {r.holidayName && (
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: 3 }}>{r.holidayName}</div>
            )}

            <div style={{ background: box.bg, border: box.bd, borderRadius: 11, padding: '13px 14px', marginTop: 12 }}>
              <div style={{ fontSize: 11, color: box.lab, fontWeight: 700, marginBottom: 4 }}>{s.head}</div>
              <div style={{ fontSize: 14.5, color: box.txt, fontWeight: 700, lineHeight: 1.5 }}>{s.msg}</div>
            </div>

            <div style={{ marginTop: 14 }}>
              {ALL_ROWS.map((row, i) => {
                const ok = r.detail[row.key as keyof WeddingFlags]
                const isFix = row.kind === 'fix'
                // 고정은 통과/걸림, 선택 용신은 통과/해당없음
                const failed = isFix ? !ok : false
                const dim = !isFix && !ok
                const last = i === ALL_ROWS.length - 1
                return (
                  <div key={row.key} onClick={() => setHelp(
                    row.key === 'optBoth' ? 'optBoth' : String(row.key),
                  )} style={{
                    display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer',
                    padding: failed ? '9px 10px' : '8px 0',
                    background: failed ? '#FBECE8' : 'transparent',
                    borderRadius: failed ? 8 : 0,
                    margin: failed ? '2px 0' : 0,
                    borderBottom: !failed && !last ? '1px solid #F7EDE5' : 'none',
                  }}>
                    <span style={{
                      width: 14, fontSize: 14, flex: 'none',
                      color: failed ? '#C0705E' : dim ? '#C9AA96' : '#8FA37E',
                    }}>{failed ? '✕' : dim ? '—' : '✓'}</span>
                    <span style={{
                      flex: 1, fontSize: 13,
                      color: failed ? '#A65440' : dim ? C.sub : C.ink,
                      fontWeight: failed ? 600 : 400,
                    }}>
                      {row.label}{' '}
                      <span style={{ fontSize: 10, color: '#C9AA96' }}>{row.hanja}</span>
                    </span>
                    <span style={{
                      fontSize: 11.5, flex: 'none',
                      color: failed ? '#C0705E' : dim ? '#C9AA96' : ok && !isFix ? C.brand : C.sub,
                      fontWeight: failed || (ok && !isFix) ? 600 : 400,
                    }}>{reasonOf(String(row.key), r.detail, r.ganji[1] ?? '')}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      <div style={{
        fontSize: 12, color: C.sub, lineHeight: 1.75, marginTop: 4,
        padding: '12px 14px', background: C.warm, borderRadius: 10,
      }}>
        각 줄을 누르면 무슨 뜻인지 설명이 나와요. 아쉬운 날이 있다면 뒤로 가서{' '}
        <b style={{ color: C.brand }}>좋은 날 찾기</b>로 다시 살펴보실 수 있어요.
      </div>

      <WeddingTermModal termKey={help} onClose={() => setHelp(null)} />
    </div>
  )
}
