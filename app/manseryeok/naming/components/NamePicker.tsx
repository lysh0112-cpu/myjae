'use client'

// app/manseryeok/naming/components/NamePicker.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  Step 2 — 한글 이름 고르기 (추천 · 교재 사전 · 직접 입력)          │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (Phase 3 · Step 2 화면) — 대표님 지시
//
//   [전에는]  손님이 «한글 음절을 직접» 쳤습니다. 추천이 없었습니다.
//   [이제는]  세 갈래로 고릅니다.
//
//     ① 추천받기    성씨 + 사주로 뽑은 열 개 (lib/saju/nameRecommend.ts)
//     ② 사전에서    교재 1장 초성별 이름 1,256개 (tables/nameDict.ts)
//     ③ 직접 쓰기   전에 하던 그대로
//
//   ⚠️ ②에서 고른 이름도 «그 자리에서» 성씨와 맞춰 봅니다 —
//      사전은 이름만 실려 있고 «어느 성씨에 어울리는지» 는 안 적혀 있습니다.
//      교재 125칸으로 재서 보여 줍니다. (soundEngine)
//
//   ⚠️⚠️ 판정은 여기서 «하지 않습니다». soundEngine·nameRecommend 가 낸 것을 그립니다.
//   ⚠️ 한자·자원오행·수리4격은 «다음 화면(Step 3)» 의 일입니다.
// ══════════════════════════════════════════════════════════════════

import React, { useMemo, useState } from 'react'
import { recommendNames, type NameStyle } from '@/lib/saju/nameRecommend'
import { NAME_DICT } from '@/lib/saju/tables/nameDict'
import { evaluateSoundOhaeng } from '@/lib/saju/soundEngine'
import { EL_CHART, EL_TEXT } from '@/lib/saju/ohaengColor'
import type { Ohaeng } from '@/lib/saju/ohaeng'

const GOLD = '#c8783c'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const INK = '#3a2e28'
const SUB = '#8a7063'
const PRESS: React.CSSProperties = { transition: 'all .12s cubic-bezier(.4,0,.2,1)' }

type Tab = '추천' | '사전' | '직접'

export interface NamePickerProps {
  /** 성씨 (한글). 복성이면 두 글자 */
  surname: string
  yongsin?: Ohaeng | null
  heeksin?: Ohaeng | null
  gisin?: Ohaeng | null
  /* 어감/성향 선호 필터 (교재 밖 참고용) — «첫 값» 입니다. 손님이 화면에서 바꿉니다 */
  style?: NameStyle | null
  prefer?: string
  avoid?: string
  /** 고르면 부릅니다 */
  onPick: (name: string) => void
  /** 직접 쓰기 탭 내용 — 기존 화면을 그대로 넣습니다 */
  manual?: React.ReactNode
}

/** 초성 차례 — 교재에 실린 열두 갈래 (ㄹ·ㅋ 은 교재에 없습니다) */
const CHO_ORDER = Object.values(NAME_DICT).map((g) => g.cho)

export default function NamePicker(p: NamePickerProps) {
  const [tab, setTab] = useState<Tab>('추천')
  const [cho, setCho] = useState<string>(CHO_ORDER[0])
  const [checked, setChecked] = useState<string | null>(null)

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 — 작명 «조건» 을 여기서 고릅니다 (대표님 지시)
  //
  //   [왜 여기인가]  전에는 앞 화면(갈림길)에서 물었습니다.
  //     그런데 보관함 버튼을 둘로 나누며 «작명은 Step 2 로 바로» 오게 되었습니다.
  //     → 조건 고르는 자리가 사라지므로 이리로 옮겼습니다.
  //   ★여기가 나은 까닭 — 조건을 바꾸면 «그 자리에서» 목록이 다시 뜹니다.
  //     앞 화면에서 고르면 되돌아가야 했습니다.
  //
  //   ⚠️ 이 셋은 «교재 밖 취향» 입니다. 길흉 판정에 쓰지 않습니다.
  // ══════════════════════════════════════════════════════════════
  const [openOpts, setOpenOpts] = useState(false)
  const [style, setStyle] = useState<NameStyle | null>(p.style ?? null)
  const [prefer, setPrefer] = useState(p.prefer ?? '')
  const [avoid, setAvoid] = useState(p.avoid ?? '')

  const sur = p.surname.trim()
  const ready = sur.length > 0

  const list = useMemo(() => {
    if (!ready) return []
    return recommendNames(sur, {
      yongsin: p.yongsin ?? null,
      heeksin: p.heeksin ?? null,
      gisin: p.gisin ?? null,
      style: style ?? undefined,
      prefer: prefer ? [...prefer.replace(/[,\s]+/g, '')] : undefined,
      avoid: avoid ? avoid.split(/[,\s]+/).filter(Boolean) : undefined,
      limit: 10,
    })
  }, [ready, sur, p.yongsin, p.heeksin, p.gisin, style, prefer, avoid])

  /** ★사전에서 고른 이름을 «그 자리에서» 성씨와 맞춰 봅니다 */
  const dictCheck = useMemo(() => {
    if (!checked || !ready) return null
    const v = evaluateSoundOhaeng([
      ...[...sur].map((h) => ({ hangul: h, 역할: '성' as const })),
      ...[...checked].map((h) => ({ hangul: h, 역할: '이름' as const })),
    ])
    return v
  }, [checked, ready, sur])

  const group = Object.values(NAME_DICT).find((g) => g.cho === cho)

  return (
    <div>
      {/* ── 탭 ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 13 }}>
        {(['추천', '사전', '직접'] as Tab[]).map((t) => {
          const on = tab === t
          return (
            <button key={t} onClick={() => setTab(t)} aria-pressed={on}
              style={{
                ...PRESS, flex: 1, padding: '9px 6px', borderRadius: 11, cursor: 'pointer',
                fontSize: 12, fontWeight: on ? 600 : 400,
                background: on ? GOLD : CARD, color: on ? '#fff' : '#6b5340',
                border: `0.5px solid ${on ? GOLD : LINE}`,
              }}>
              {t === '추천' ? '추천받기' : t === '사전' ? '사전에서 고르기' : '직접 쓰기'}
            </button>
          )
        })}
      </div>

      {/* ── ① 추천 ── */}
      {tab === '추천' && (
        <div>
          {/* ★조건 고르기 — 접힌 채 시작합니다. 안 고르셔도 됩니다 */}
          <button onClick={() => setOpenOpts(v => !v)} aria-expanded={openOpts}
            style={{
              ...PRESS, width: '100%', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', background: CARD, border: `1px solid ${LINE}`,
              borderRadius: 12, padding: '10px 13px', marginBottom: 9, cursor: 'pointer',
            }}>
            <span style={{ fontSize: 12, color: '#6b5340' }}>
              조건 고르기
              {(style || prefer || avoid) && (
                <span style={{ color: GOLD, marginLeft: 6 }}>
                  {[style, prefer && `“${prefer}”`, avoid && `${avoid} 빼기`].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
            <span style={{ fontSize: 11, color: SUB }}>{openOpts ? '접기 ▾' : '펼치기 ▸'}</span>
          </button>

          {openOpts && (
            <div style={{
              background: CARD, border: `1px solid ${LINE}`, borderRadius: 12,
              padding: '13px 12px', marginBottom: 11,
            }}>
              <div style={{ fontSize: 11.5, color: SUB, marginBottom: 6 }}>
                어떤 결이 좋으세요 <span style={{ color: '#b09a86' }}>· 고르지 않으셔도 됩니다</span>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                {(['남성적', '여성적', '중성적'] as NameStyle[]).map(v => (
                  <button key={v} onClick={() => setStyle(style === v ? null : v)}
                    aria-pressed={style === v}
                    style={{
                      ...PRESS, cursor: 'pointer', fontSize: 12, padding: '7px 13px',
                      borderRadius: 12, fontWeight: style === v ? 600 : 400,
                      background: style === v ? GOLD : '#fff',
                      color: style === v ? '#fff' : '#5c3a1e',
                      border: `1px solid ${style === v ? GOLD : LINE}`,
                    }}>{v}</button>
                ))}
              </div>

              <Opt label="꼭 넣고 싶은 소리" placeholder="예) 민, 서" value={prefer} onChange={setPrefer} />
              <Opt label="피하고 싶은 글자" placeholder="예) 항렬자·친척 이름의 한 글자"
                value={avoid} onChange={setAvoid}
                note="한 글자를 적으시면 그 글자가 든 이름을 모두 뺍니다" />

              <div style={{ fontSize: 10.5, color: '#a8927e', lineHeight: 1.65 }}>
                어감에 대한 취향은 참고로만 씁니다.
                이름의 길흉은 교재의 기준으로 따로 살핍니다.
              </div>
            </div>
          )}

          {!ready && <Empty>성씨를 먼저 알려 주세요.</Empty>}
          {ready && list.length === 0 && (
            <Empty>고르신 조건에 맞는 이름을 찾지 못했습니다. 조건을 조금 넓혀 보세요.</Empty>
          )}
          {list.map((c) => (
            <button key={c.name} onClick={() => p.onPick(c.name)}
              style={{
                ...PRESS, width: '100%', textAlign: 'left', cursor: 'pointer',
                background: CARD, border: `1px solid ${LINE}`, borderRadius: 13,
                padding: '13px 14px', marginBottom: 8,
              }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: SUB, width: 30, flexShrink: 0 }}>{c.rank}순위</span>
                <span style={{ fontSize: 18, fontWeight: 600, color: INK, letterSpacing: 1 }}>
                  {c.fullName}
                </span>
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: GOLD }}>
                  {Math.round(c.score)}점
                </span>
              </div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', paddingLeft: 38 }}>
                {c.filled.map((el) => (
                  <span key={el} style={{
                    fontSize: 10.5, padding: '2px 7px', borderRadius: 9,
                    background: EL_CHART[el], color: el === '금' ? '#1a1a1a' : '#fff',
                    border: el === '금' ? '0.5px solid #c8c8c8' : 'none',
                  }}>{el} 보완</span>
                ))}
                {c.sound.gyeokPublic && (
                  <span style={{
                    fontSize: 10.5, padding: '2px 7px', borderRadius: 9,
                    background: '#f6efe8', color: '#7a6a5c',
                  }}>{c.sound.gyeokPublic}</span>
                )}
              </div>
            </button>
          ))}
          <Note>
            소리의 흐름과 사주가 바라는 기운을 함께 본 차례입니다.
            한자는 다음 걸음에서 맞춰 드립니다.
          </Note>
        </div>
      )}

      {/* ── ② 교재 사전 ── */}
      {tab === '사전' && (
        <div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 11 }}>
            {Object.values(NAME_DICT).map((g) => {
              const on = cho === g.cho
              return (
                <button key={g.cho} onClick={() => { setCho(g.cho); setChecked(null) }}
                  aria-pressed={on}
                  style={{
                    ...PRESS, cursor: 'pointer', fontSize: 12, padding: '6px 11px',
                    borderRadius: 11, fontWeight: on ? 600 : 400,
                    background: on ? EL_CHART[g.el] : '#fff',
                    color: on ? (g.el === '금' ? '#1a1a1a' : '#fff') : EL_TEXT[g.el],
                    border: `1px solid ${on ? EL_CHART[g.el] : LINE}`,
                  }}>
                  {g.cho} <span style={{ fontSize: 10, opacity: .8 }}>{g.el}</span>
                </button>
              )
            })}
          </div>

          {/* ★고른 이름을 그 자리에서 재 봅니다 */}
          {checked && dictCheck && (
            <div style={{
              background: '#fff7f0', border: `1px solid ${GOLD}`, borderRadius: 12,
              padding: '11px 12px', marginBottom: 10,
            }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: INK, marginBottom: 5 }}>
                {sur}{checked}
              </div>
              <div style={{ fontSize: 11.5, color: '#5c3a1e', lineHeight: 1.7 }}>
                {dictCheck.elements.filter(Boolean).join('·')} 의 흐름
                {dictCheck.gyeokPublic ? ` — ${dictCheck.gyeokPublic}` : ''}
                {dictCheck.gentle ? <><br />{dictCheck.gentle}</> : null}
              </div>
              <button onClick={() => p.onPick(checked)}
                style={{
                  ...PRESS, width: '100%', marginTop: 9, padding: 11, borderRadius: 11,
                  background: GOLD, border: 'none', color: '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                이 이름으로 한자 고르러 가기 →
              </button>
            </div>
          )}

          <div style={{
            background: CARD, border: `1px solid ${LINE}`, borderRadius: 13,
            padding: 11, display: 'flex', flexWrap: 'wrap', gap: 6,
            maxHeight: 300, overflowY: 'auto',
          }}>
            {group?.names.map((n) => {
              const on = checked === n
              return (
                <button key={n} onClick={() => setChecked(on ? null : n)}
                  style={{
                    ...PRESS, cursor: 'pointer', fontSize: 13, padding: '7px 11px',
                    borderRadius: 10, background: on ? GOLD : '#fff',
                    color: on ? '#fff' : INK,
                    border: `1px solid ${on ? GOLD : LINE}`,
                  }}>
                  {n}
                </button>
              )
            })}
          </div>
          <Note>
            교재에 실린 이름입니다. 누르시면 지금 성씨와 어울리는지 함께 보여 드립니다.
          </Note>
        </div>
      )}

      {/* ── ③ 직접 쓰기 — 전에 하던 그대로 ── */}
      {tab === '직접' && <div>{p.manual}</div>}
    </div>
  )
}

function Opt({ label, placeholder, value, onChange, note }: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; note?: string
}) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ fontSize: 11.5, color: SUB, marginBottom: 5 }}>{label}</div>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        style={{
          width: '100%', padding: '9px 11px', borderRadius: 10,
          border: `1px solid ${LINE}`, background: '#fff',
          fontSize: 13, color: INK, outline: 'none',
        }} />
      {note && <div style={{ fontSize: 10.5, color: '#a8927e', marginTop: 4 }}>{note}</div>}
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      textAlign: 'center', padding: '28px 16px', color: SUB,
      fontSize: 12, lineHeight: 1.7,
    }}>{children}</div>
  )
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 10.5, color: '#a8927e', lineHeight: 1.65, marginTop: 9 }}>
      {children}
    </div>
  )
}
