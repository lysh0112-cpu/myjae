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
// ★2026-08-01 (43부 6차) — 바깥 화면과 «같은» 대비를 씁니다.
//   ⚠️ 이 부품만 옛 색을 쓰면 조건 패널이 화면에서 «떠» 보입니다.
// ★2026-08-01 (43부 7차) — 배색을 «오프화이트 + 흰 카드» 로 다시 잡았습니다.
//   ⚠️ 6차의 베이지(#F5E9DE)는 흰 카드와 여전히 «비슷한 색» 이었습니다.
//      바탕에서 누런 기를 빼야 흰 카드가 또렷이 떠오릅니다.
const CARD = '#FFFFFF'
const LINE = '#DFD9D2'
/** 패널 바탕 — 카드(흰색)와 갈리도록 한 단 낮춥니다 */
const PANEL = '#F4F2EF'
/** 카드 그림자 — 테두리만으로 부족한 자리에 */
const SHADOW = '0 1px 3px rgba(46,38,34,0.06)'

/**
 * ★고른 버튼 / 안 고른 버튼 — «한눈에» 갈리게 (대표님 지시)
 *
 *  ⚠️ 전에는 둘 다 옅어 「지금 뭘 골랐지」를 알기 어려웠습니다.
 *     고른 쪽: 금색을 «채우고» 흰 글씨 + 옅은 금빛 그림자
 *     안 고른 쪽: 흰 바탕 + «보이는» 테두리 + 짙은 글씨
 */
function chipStyle(on: boolean): React.CSSProperties {
  return on
    ? {
        background: GOLD, color: '#fff', fontWeight: 700,
        border: `1px solid ${GOLD}`,
        boxShadow: '0 2px 6px rgba(200,120,60,0.30)',
      }
    : {
        background: CARD, color: INK, fontWeight: 500,
        border: `1px solid ${LINE}`,
        boxShadow: SHADOW,
      }
}
const INK = '#2E2622'
/** ★7차 — 안내 글자를 «짙게» (흰 카드 위에서 흐렸습니다) */
const SUB = '#6B5B50'
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
  /**
   * ★「내 아이 명품작명」인가 (2026-08-01 · 43부 20차)
   *
   *  켜면 «발음오행이 좋음» 인 이름만 냅니다.
   *  ⚠️ 개명은 «끕니다» — 손님이 이미 쓰는 이름의 발음을 지키려는 자리라,
   *     좋음만 내밀면 고를 것이 없어집니다.
   */
  premium?: boolean
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
  /** ★고르신 소리를 «어느 자리에» 넣을지 (43부 6차 · 대표님 지시) */
  const [preferPos, setPreferPos] = useState<'가운데' | '끝' | null>(null)

  const sur = p.surname.trim()
  const ready = sur.length > 0

  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 (43부 3차) — 「입력해도 목록이 안 바뀐다」 를 고쳤습니다
  //
  //  [먼저 밝힐 것]  이 화면에 «[적용] 버튼은 없습니다».
  //    아래 useMemo 는 style·prefer·avoid 가 바뀌면 «이미» 다시 돕니다.
  //    ★그런데도 손님이 「안 바뀐다」고 느끼신 까닭이 «둘» 있었습니다.
  //
  //  🔴 까닭 ① — 목록이 «화면 밖» 으로 밀렸습니다.
  //     조건 패널을 펼치면 그 높이(약 280px)가 목록을 아래로 밀어냅니다.
  //     휴대폰에서는 목록이 «접힌 화면 아래» 로 사라집니다.
  //     → 손님은 글자를 치면서 «바뀌는 것을 볼 수가 없었습니다».
  //     ★그래서 패널 «안» 에 실시간 미리보기를 넣었습니다. 닫지 않아도 보입니다.
  //
  //  🔴 까닭 ② — 한글 «조합 중» 낱자가 그대로 엔진에 들어갔습니다.
  //     「민」을 치면 ㅁ → 미 → 민 순으로 값이 바뀝니다.
  //     그런데 「ㅁ」은 이름 글자에 «절대 들어 있지 않습니다» (name.includes('ㅁ')).
  //     → 첫 글자를 친 순간에는 아무 일도 안 일어나 «먹통» 처럼 보였습니다.
  //     ★그래서 «완성된 글자» 만 조건으로 씁니다. 조합이 끝나면 곧바로 반영됩니다.
  //
  //  ⚠️ 되짚어 «판정» 이 바뀌는 것은 아닙니다. 거르기·줄 세우기만 달라집니다.
  // ══════════════════════════════════════════════════════════════

  /**
   * ★완성된 한글 음절만 남깁니다 (가~힣).
   *   조합 중 낱자(ㅁ·ㅏ 같은 호환 자모)는 «아직 글자가 아니므로» 뺍니다.
   *   ⚠️ 빼는 것이지 «막는» 것이 아닙니다 — 입력칸의 글자는 그대로 보입니다.
   */
  const syllablesOf = (v: string) =>
    [...v.replace(/[,\s]+/g, '')].filter(ch => {
      const c = ch.charCodeAt(0)
      return c >= 0xac00 && c <= 0xd7a3
    })

  const preferChars = useMemo(() => syllablesOf(prefer), [prefer])
  const avoidChars = useMemo(
    () => avoid.split(/[,\s]+/).filter(Boolean).filter(w => syllablesOf(w).length === w.length),
    [avoid])

  /** ⚠️ 조합 중이라 «아직 못 쓰는» 글자가 있는가 — 손님에게 알려 드립니다 */
  const pending = (prefer.trim() !== '' && preferChars.length === 0)
    || (avoid.trim() !== '' && avoidChars.length === 0)

  const list = useMemo(() => {
    if (!ready) return []
    return recommendNames(sur, {
      yongsin: p.yongsin ?? null,
      heeksin: p.heeksin ?? null,
      gisin: p.gisin ?? null,
      style: style ?? undefined,
      prefer: preferChars.length ? preferChars : undefined,
      preferPos,
      // ★「내 아이 명품작명」이면 «발음오행 좋음» 만 냅니다 (43부 20차)
      premium: p.premium === true,
      avoid: avoidChars.length ? avoidChars : undefined,
      limit: 10,
    })
  }, [ready, sur, p.yongsin, p.heeksin, p.gisin, style, preferChars, avoidChars, preferPos])

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
                  {[style, prefer && `“${prefer}”${preferPos ? ` ${preferPos}` : ''}`,
                    avoid && `${avoid} 빼기`].filter(Boolean).join(' · ')}
                </span>
              )}
            </span>
            {/* ★조건이 걸리면 «지금 몇 개» 인지 곧바로 보여 드립니다 —
                접혀 있어도 바뀌는 것이 눈에 보입니다 */}
            <span style={{ fontSize: 11, color: SUB, display: 'flex', alignItems: 'center', gap: 7 }}>
              {ready && (style || preferChars.length || avoidChars.length) && (
                <span style={{ color: list.length === 0 ? '#c8506e' : GOLD, fontWeight: 600 }}>
                  {list.length}개
                </span>
              )}
              {openOpts ? '접기 ▾' : '펼치기 ▸'}
            </span>
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
                      ...PRESS, cursor: 'pointer', fontSize: 12, padding: '8px 14px',
                      borderRadius: 12, ...chipStyle(style === v),
                    }}>{v}</button>
                ))}
              </div>

              <Opt label="꼭 넣고 싶은 소리" placeholder="예) 민, 서" value={prefer} onChange={setPrefer} />

              {/* ══════════════════════════════════════════════════
                  ★2026-08-01 (43부 6차) — 그 소리를 «어느 자리에» 넣을지
                    항렬자는 집안마다 «가운데» 또는 «끝» 으로 정해져 있습니다.
                    ⚠️ 안 고르시면 예전 그대로 «어디든» 들어 있으면 맞습니다.
                    ⚠️ 자리를 고르시면 «외자» 는 맞지 않습니다 — 넣을 자리가 없습니다.
                  ══════════════════════════════════════════════════ */}
              {preferChars.length > 0 && (
                <div style={{ marginTop: -4, marginBottom: 11 }}>
                  <div style={{ fontSize: 11.5, color: SUB, marginBottom: 5 }}>
                    「{preferChars.join('·')}」를 넣을 자리
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {([null, '가운데', '끝'] as const).map(v => {
                      const on = preferPos === v
                      return (
                        <button key={String(v)} onClick={() => setPreferPos(v)}
                          style={{
                            ...PRESS, flex: 1, padding: '9px 0', borderRadius: 9, cursor: 'pointer',
                            fontSize: 12, ...chipStyle(on),
                          }}>
                          {v ?? '상관없음'}
                        </button>
                      )
                    })}
                  </div>
                  {/* ⚠️ 자리를 고르면 후보가 줄어드는 것이 «정상» 입니다. 미리 알려 드립니다 */}
                  {preferPos && list.filter(c => c.preferHit).length === 0 && (
                    <div style={{ fontSize: 10.5, color: '#c8506e', marginTop: 5, lineHeight: 1.6 }}>
                      「{preferChars.join('·')}」를 {preferPos} 자리에 둔 이름은 사전에 없어요.
                      「상관없음」으로 넓혀 보세요.
                    </div>
                  )}
                </div>
              )}
              <Opt label="피하고 싶은 글자" placeholder="예) 항렬자·친척 이름의 한 글자"
                value={avoid} onChange={setAvoid}
                note="한 글자를 적으시면 그 글자가 든 이름을 모두 뺍니다" />

              {/* ══════════════════════════════════════════════════
                  ★실시간 미리보기 — 패널을 «닫지 않아도» 바뀌는 것이 보입니다
                    🔴 이것이 없어서 「입력해도 안 바뀐다」로 느껴졌습니다.
                       목록은 패널 «아래» 라 펼친 동안 화면 밖으로 밀렸습니다.
                    ⚠️ 판정을 여기서 다시 하지 않습니다 — 위 list 를 그대로 씁니다.
                  ══════════════════════════════════════════════════ */}
              <div style={{
                background: CARD, border: `1px solid ${LINE}`, borderRadius: 10,
                padding: '10px 11px', marginBottom: 11,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  marginBottom: list.length ? 7 : 0,
                }}>
                  <span style={{ fontSize: 11, color: SUB }}>
                    {p.premium && <b style={{ color: GOLD }}>명품 기준 · </b>}
                    지금 조건으로
                    <b style={{ color: list.length === 0 ? '#c8506e' : GOLD, marginLeft: 5 }}>
                      {ready ? `${list.length}개` : '—'}
                    </b>
                    {/* ⚠️ 선호 소리는 «거르기» 가 아니라 «앞줄 세우기» 입니다.
                        몇 개가 실제로 그 소리를 담았는지 «따로» 적어 오해를 막습니다 —
                        「민 넣었는데 왜 민 없는 이름이 있지」 가 되지 않게. */}
                    {preferChars.length > 0 && (
                      <span style={{ marginLeft: 6, color: '#7A6A5E' }}>
                        · 「{preferChars.join('·')}」{preferPos ? ` ${preferPos}에` : ''} 담은 것{' '}
                        {list.filter(c => c.preferHit).length}개
                      </span>
                    )}
                  </span>
                  {/* ⚠️ 조합이 끝나지 않은 글자가 있으면 «왜 아직인지» 알려 드립니다 */}
                  {pending && (
                    <span style={{ fontSize: 10.5, color: '#b09a86' }}>글자를 마저 입력해 주세요</span>
                  )}
                </div>

                {ready && list.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {list.slice(0, 4).map(c => (
                      <button key={c.name} onClick={() => p.onPick(c.name)}
                        style={{
                          ...PRESS, cursor: 'pointer', fontSize: 12.5, padding: '5px 10px',
                          borderRadius: 9, background: PANEL, color: INK,
                          border: `1px solid ${LINE}`,
                        }}>
                        {c.fullName}
                      </button>
                    ))}
                    {list.length > 4 && (
                      <span style={{ fontSize: 10.5, color: '#7A6A5E', alignSelf: 'center' }}>
                        외 {list.length - 4}개 · 아래에 이어집니다
                      </span>
                    )}
                  </div>
                )}
                {ready && list.length === 0 && !pending && (
                  <div style={{ fontSize: 11, color: '#c8506e', lineHeight: 1.6, marginTop: 5 }}>
                    이 조건에 맞는 이름이 없습니다. 조건을 조금 넓혀 보세요.
                  </div>
                )}
              </div>

              <div style={{ fontSize: 10.5, color: '#7A6A5E', lineHeight: 1.65 }}>
                조건을 바꾸시면 <b>바로</b> 다시 골라 드립니다. 따로 누르실 것은 없습니다.
                <br />
                어감에 대한 취향은 참고로만 씁니다.
                이름의 길흉은 교재의 기준으로 따로 살핍니다.
              </div>
            </div>
          )}

          {!ready && <Empty>성씨를 먼저 알려 주세요.</Empty>}
          {ready && list.length === 0 && (
            <Empty>고르신 조건에 맞는 이름을 찾지 못했습니다. 조건을 조금 넓혀 보세요.</Empty>
          )}
          {/* ★무엇을 잰 점수인지 «먼저» 알려 드립니다 (43부 21차) */}
          {ready && list.length > 0 && (
            <div style={{
              fontSize: 10.5, color: '#7A6A5E', lineHeight: 1.65,
              padding: '0 4px', marginBottom: 9,
            }}>
              점수는 <b>소리의 흐름</b>과 <b>사주가 바라는 기운</b>을 본 것입니다.
              <br />획수(수리 4격)와 한자의 기운은 <b>다음 걸음에서 한자를 고를 때</b> 정해집니다.
            </div>
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
                {/* ══════════════════════════════════════════════
                    🔴★2026-08-01 (43부 21차) — 「98점 → 70점」 널뛰기 (대표님 지적)

                     [무엇이 있었나]  여기 「98점」이 «최종 점수처럼» 보였습니다.
                       그런데 이 점수는 «한글만» 보고 낸 것입니다 —
                       발음오행 70 + 용신 20 + 어감 8 + 선호 2.
                       ⚠️ 수리 4격과 자원오행은 «한자를 고른 뒤» 에야 정해집니다.
                          그래서 다음 걸음에서 70점이 되어 «깎인 것처럼» 보였습니다.
                       ★깎인 것이 아니라 «다른 것을 재고 있었습니다».

                     [고침]  ① 「점」을 떼고 «소리 98» 로 적습니다 — 무엇을 잰 것인지 드러나게.
                             ② 목록 머리에 「한자를 고르면 최종 점수가 나옵니다」를 적습니다.
                     ⚠️ 두 점수를 «같은 잣대» 로 맞추려면 후보마다 한자 조합을
                        전부 따져야 합니다 — 한 후보에 수백 가지입니다.
                        ★그래서 «맞추는» 대신 «다른 것임을 밝히는» 길을 골랐습니다.
                    ══════════════════════════════════════════════ */}
                <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: GOLD }}>
                  소리 {Math.round(c.score)}
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
              {/* ══════════════════════════════════════════════════
                  ★「명품작명」 컷라인 — 사전 탭에도 겁니다 (43부 20차)

                   🔴 [왜]  추천 탭은 이미 «좋음» 만 냅니다. 그런데 사전 탭은
                      교재 1장의 이름을 그대로 늘어놓습니다.
                      ⚠️ 사전에 실린 이름이라도 «이 성씨와 만나면» 흉이 될 수 있습니다.
                         (교재 사전은 성씨를 가리지 않고 실려 있습니다)
                      → 명품이라 이름 붙인 자리에 아쉬움이 새어 들어오던 길입니다.

                   ⚠️ 막되 «왜» 인지 알려 드립니다. 그냥 안 눌리면 고장으로 보입니다.
                  ══════════════════════════════════════════════════ */}
              {p.premium && dictCheck.grade !== '좋음' ? (
                <div style={{
                  marginTop: 9, padding: '10px 11px', borderRadius: 11,
                  background: '#fff', border: `1px solid ${LINE}`,
                  fontSize: 11.5, color: '#96502e', lineHeight: 1.7,
                }}>
                  이 이름은 <b>{sur}</b> 씨와 만나면 소리의 흐름이
                  <b> {dictCheck.grade}</b>으로 봅니다.
                  <br />명품작명은 <b>좋음</b>인 이름만 지어 드리고 있어요.
                  다른 이름을 골라 주세요.
                </div>
              ) : (
                <button onClick={() => p.onPick(checked)}
                  style={{
                    ...PRESS, width: '100%', marginTop: 9, padding: 11, borderRadius: 11,
                    background: GOLD, border: 'none', color: '#fff',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer',
                  }}>
                  이 이름으로 한자 고르러 가기 →
                </button>
              )}
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

/**
 * 조건 입력칸 하나.
 *
 * ★2026-08-01 (43부 3차) — 「입력해도 안 바뀐다」의 나머지 절반을 여기서 막습니다.
 *
 *   ⚠️ 한글은 «조합» 으로 들어옵니다 — ㅁ → 미 → 민.
 *      onChange 만 쓰면 조합 중 낱자까지 그대로 흘러갑니다.
 *      ★값은 그대로 두되(입력칸에서 글자가 사라지면 안 됩니다),
 *        조합이 «끝났음» 을 위쪽에 알려 그 순간 곧바로 다시 고르게 합니다.
 *
 *   ⚠️ 조합 중에 값을 잘라내지 «마십시오». 안드로이드 자판에서 글자가 깨집니다.
 *      (rename/newname 의 firstHangul 이 같은 까닭으로 조합을 살펴봅니다)
 */
function Opt({ label, placeholder, value, onChange, note }: {
  label: string; placeholder: string; value: string
  onChange: (v: string) => void; note?: string
}) {
  return (
    <div style={{ marginBottom: 11 }}>
      <div style={{ fontSize: 11.5, color: SUB, marginBottom: 5 }}>{label}</div>
      <input
        value={value}
        // ⚠️ 조합 중에도 «값은 그대로» 넣습니다 — 화면에서 글자가 사라지면 안 됩니다.
        //    조건으로 쓸 때 완성된 글자만 골라 씁니다 (위 syllablesOf).
        onChange={(e) => onChange(e.target.value)}
        onCompositionEnd={(e) => onChange(e.currentTarget.value)}
        placeholder={placeholder}
        inputMode="text"
        style={{
          width: '100%', padding: '9px 11px', borderRadius: 10,
          border: `1px solid ${LINE}`, background: '#fff',
          fontSize: 13, color: INK, outline: 'none',
        }} />
      {note && <div style={{ fontSize: 10.5, color: '#7A6A5E', marginTop: 4 }}>{note}</div>}
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
    <div style={{ fontSize: 10.5, color: '#7A6A5E', lineHeight: 1.65, marginTop: 9 }}>
      {children}
    </div>
  )
}
