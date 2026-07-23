'use client'
// app/manseryeok/birth-timing/components/PickDateV7.tsx
//
// ★ 출산택일 v7 — 날짜 고르기 화면.
//   점수·순위를 보여주지 않는다. 조건을 켜고 끄며 부모가 직접 고른다.
//
//   [화면 구성]
//   · 먼저 정리해 둔 것 (고정 4개) — 설명만. 끌 수 없다.
//   · 더 보고 싶은 것 (선택 5개) — 토글. 켤 때마다 남는 날이 바뀐다.
//   · 남은 날 목록 — 날짜별 시간 버튼
//   · 남는 날이 없으면 상담 안내
//
//   [원칙] 조건을 많이 켤수록 좋은 게 아니라는 것을 문구로 계속 알린다.

import { useMemo, useState } from 'react'
import {
  OPT_FILTERS, EMPTY_OPT, passOpt,
  type OptKey, type OptState,
} from '../lib/babyFilterV7'
import type { DayOption, HourOption, RecommendV7Result } from '../lib/recommendV7'

const C = {
  bg: '#FDF6F0', card: '#FFFBF7', line: '#F0E0D5', ink: '#3A2E28',
  sub: '#B4785A', brand: '#96502E', accent: '#C8783C', soft: '#F6E3D6', warm: '#F5EDE6',
}

// 모달 본문 — 고정 4 + 선택 5
const HELP: Record<string, { t: string; k: string; w: string; e: string; c: string }> = {
  fixRoot: {
    t: '든든한 기운', k: '통근(通根) · 뿌리내림',
    w: '사주 여덟 글자 가운데 아이 자신을 뜻하는 글자가 하나 있어요. 그 글자와 같은 기운이 아래쪽 땅자리에 들어 있으면 뿌리를 내렸다고 합니다.',
    e: '나무로 치면 줄기만 서 있는 것과, 흙에 단단히 박힌 것의 차이예요. 뿌리가 있어야 좋은 기운이 찾아와도 받아서 쓸 힘이 생긴다고 봅니다. 그래서 뿌리가 없는 시간은 처음부터 빼 두었어요.',
    c: '뿌리가 많다고 무조건 좋은 것은 아니에요. 지나치면 고집이 세지거나 융통성이 부족해질 수 있어서, 알맞은 정도가 좋다고 봅니다.',
  },
  fixWonjin: {
    t: '편안한 자리', k: '원진(怨嗔) · 까닭 없이 불편한 사이',
    w: '특별한 이유가 없는데도 왠지 마음이 맞지 않는 관계가 있어요. 크게 다투지는 않지만 속으로 앙금이 남는 사이입니다.',
    e: '태어난 달과 날이 이런 사이가 되는 경우를 미리 빼 두었어요. 이 두 자리는 아이가 자라며 가장 오래 머무는 자리로 보기 때문에, 여기만큼은 편안한 쪽으로 잡았습니다.',
    c: '부딪침이 큰 편은 아니라서 가볍게 보는 분들도 있어요. 다만 굳이 두고 볼 이유도 없다고 판단했습니다.',
  },
  fixHyeong: {
    t: '부딪침 없는 자리', k: '형(刑) · 서로 다투는 관계',
    w: '사람 사이에도 유난히 부딪치는 조합이 있듯, 열두 글자 중에도 만나면 서로를 깎아내리는 짝이 있어요.',
    e: '태어난 달과 날이 그런 사이인 경우를 빼 두었어요. 옛 책에서는 다치거나 시비에 휘말리기 쉽다고 보았습니다.',
    c: '남을 다스리는 일에는 오히려 힘이 된다고 보는 견해도 있어요. 반드시 나쁘기만 한 것은 아니지만, 아이 사주에는 두지 않는 쪽으로 잡았습니다.',
  },
  fixSamePillar: {
    t: '겹치지 않는 기둥', k: '일주 · 월주 동일 제외',
    w: '사주는 네 기둥으로 이루어져요. 그중 태어난 달과 태어난 날의 두 글자가 완전히 똑같이 겹치는 경우가 있습니다.',
    e: '같은 글자가 겹치면 그 기운만 두 배로 커져서 나머지가 묻히기 쉬워요. 겉으로는 다섯 기운이 다 있어 보여도 실제로는 한쪽으로 쏠린 사주가 됩니다.',
    c: '같은 기둥이 겹치는 것을 기운이 뚜렷하다고 좋게 보는 견해도 있어요. 다만 균형을 우선으로 보는 쪽을 택했습니다.',
  },
  optDaeun: {
    t: '인생 중반의 흐름', k: '대운(大運) · 10년마다 바뀌는 큰 흐름',
    w: '사람에게는 10년 단위로 바뀌는 큰 흐름이 있어요. 이것을 대운이라고 합니다. 아이에게 특히 필요한 기운이 20대에서 60대 사이에 찾아오는지를 봤어요.',
    e: '이 흐름은 태어난 달에서 정해져요. 예정일이 정해지면 큰 틀은 거의 같지만, 어느 날에 태어나느냐에 따라 그 기운을 무엇으로 받는지가 달라집니다. 같은 시기가 어떤 아이에게는 재물이 붙는 때가 되고, 어떤 아이에게는 배움이 깊어지는 때가 됩니다.',
    c: '여름·겨울에 태어나면 따뜻함과 서늘함의 균형을, 봄·가을이면 기운의 세기를 기준으로 봐요. 계절에 따라 보는 방식이 다릅니다.',
  },
  optFiveEl: {
    t: '고루 갖춘 기운', k: '오행(五行) · 다섯 기운',
    w: '세상의 기운을 나무·불·흙·쇠·물 다섯으로 나누어 봅니다. 여덟 글자 안에 이 다섯이 하나도 빠짐없이 들어 있는 날만 남겨요.',
    e: '하나가 아예 없으면 그 부분이 비어 있다고 봅니다. 다만 여덟 글자에 다섯을 모두 담으려면 어느 하나는 한 개뿐이 되기 마련이에요. 그건 자연스러운 일입니다.',
    c: '다 갖췄다고 좋기만 한 것도, 하나 없다고 나쁘기만 한 것도 아니에요. 없는 기운은 살아가며 채워 간다고 보기도 합니다.',
  },
  optBalance: {
    t: '한쪽으로 치우치지 않음', k: '오행 편중 · 쏠림',
    w: '다섯 기운이 다 있더라도, 그중 하나가 여덟 글자의 절반 가까이를 차지하면 한쪽으로 쏠렸다고 봅니다.',
    e: '예를 들어 나무 기운이 셋 이상이면 나머지 넷이 다섯 자리를 나눠 갖게 돼요. 겉보기엔 고른데 실제로는 한 기운이 판을 주도합니다.',
    c: '계절에 따라 자연스러운 쏠림도 있어요. 봄에 태어나면 나무가 많고 가을이면 쇠가 많은 것은 당연한 일입니다. 이걸 흠으로만 볼 필요는 없어요.',
  },
  optFourRoot: {
    t: '고르게 단단한 기운', k: '신왕 · 관왕 · 식상왕 · 재왕',
    w: '사주에는 네 갈래 힘이 있어요. 아이 자신, 지켜야 할 일과 규범, 드러내는 재능, 다루는 살림살이입니다. 이 넷이 모두 땅에 뿌리를 두고 있는 날만 남겨요.',
    e: '하나만 크고 나머지가 비어 있는 것보다, 네 갈래가 고루 자리 잡은 쪽을 고르는 방식이에요. 어느 하나가 뿌리 없이 떠 있으면 그 부분이 실속을 갖기 어렵다고 봅니다.',
    c: '고르다는 것이 곧 크다는 뜻은 아니에요. 한 가지가 뚜렷하게 강한 사주를 더 좋게 보는 견해도 있습니다.',
  },
  optGwiin: {
    t: '나를 도와주는 귀인', k: '천을귀인(天乙貴人)',
    w: '예로부터 어려울 때 돕는 사람이 나타난다고 본 자리입니다. 여러 길한 자리 가운데서도 으뜸으로 쳐 왔어요.',
    e: '태어난 날의 기준 글자에 따라 어느 자리가 귀인인지 정해져요. 그 자리가 아이 사주 안에 들어오는 날만 남깁니다. 어느 기둥에 들어오는지에 따라 뜻을 달리 보기도 해요.',
    c: '귀인이 없다고 도움을 받지 못한다는 뜻은 아니에요. 있으면 좋게 보는 자리일 뿐입니다.',
  },
}

const FIXED_CHIPS: { key: string; label: string }[] = [
  { key: 'fixRoot', label: '든든한 기운' },
  { key: 'fixWonjin', label: '편안한 자리' },
  { key: 'fixHyeong', label: '부딪침 없는 자리' },
  { key: 'fixSamePillar', label: '겹치지 않는 기둥' },
]

interface Props {
  result: RecommendV7Result
  onPickHour?: (day: DayOption, hour: HourOption) => void
  onConsult?: () => void
}

export default function PickDateV7({ result, onPickHour, onConsult }: Props) {
  const [on, setOn] = useState<OptState>(EMPTY_OPT)
  const [help, setHelp] = useState<string | null>(null)

  /** 주어진 토글 상태로 걸러낸 날짜 목록 */
  const filterBy = useMemo(() => (state: OptState): DayOption[] => {
    return result.days
      .map(d => ({ ...d, hours: d.hours.filter(h => passOpt(h.detail, state)) }))
      .filter(d => d.hours.length > 0)
  }, [result.days])

  const days = filterBy(on)
  const hourCount = days.reduce((a, d) => a + d.hours.length, 0)
  const baseHours = result.days.reduce((a, d) => a + d.hours.length, 0)
  const onCount = (Object.keys(on) as OptKey[]).filter(k => on[k]).length

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

  return (
    <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px 60px' }}>

      {/* 면책 — 캡처 영역 안쪽에 두어 이미지 저장 시에도 담기게 한다 */}
      <div style={{
        background: 'rgba(255,120,120,.06)', border: '1px solid rgba(255,120,120,.18)',
        borderRadius: 10, padding: '12px 14px', fontSize: 13, fontWeight: 600,
        color: '#C0705E', lineHeight: 1.7, margin: '16px 0',
      }}>
        ※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 출산일·수술일 결정은 산모와
        아기의 건강을 최우선으로, 반드시 담당 산부인과 전문의와 상의해 결정하세요.
      </div>

      <h2 style={{ fontSize: 19, margin: '0 0 7px', letterSpacing: '-.4px', lineHeight: 1.4 }}>
        어떤 날이 좋으실까요?
      </h2>
      <p style={{ fontSize: 13, color: C.sub, lineHeight: 1.75, margin: '0 0 16px' }}>
        아래 조건을 켜고 끄면서 남는 날이 어떻게 달라지는지 보세요.{' '}
        <b style={{ color: C.brand }}>더 많이 켠다고 더 좋은 날이 되는 건 아니에요.</b>{' '}
        무엇을 더 눈여겨보고 싶으신지에 따라 고르시면 됩니다.
      </p>

      {/* 고정 4개 */}
      <div style={{ background: C.warm, borderRadius: 13, padding: '14px 15px', marginBottom: 15 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.brand }}>✓ 먼저 정리해 둔 것</div>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.75, marginTop: 7 }}>
          알려주신 예정일을 기준으로 <b style={{ color: C.brand }}>3주 전부터 예정일 사흘 뒤까지</b>,
          병원이 수술하는 <b style={{ color: C.brand }}>평일 오전 9시 30분 ~ 오후 5시 30분</b> 안에서
          찾았어요. 그중 아래 네 가지는 미리 확인해 두었습니다.
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
          {FIXED_CHIPS.map(f => (
            <button key={f.key} onClick={() => setHelp(f.key)} style={{
              background: '#fff', border: `1px solid ${C.line}`, borderRadius: 20,
              padding: '5px 11px', fontSize: 11.5, color: C.brand, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>{f.label}<span style={{ color: C.accent, marginLeft: 3 }}>?</span></button>
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
          <span style={{ fontSize: 13, color: C.sub }}>일 · {hourCount}개 시간</span>
        </div>
        <div style={{ height: 6, background: '#EFE2D8', borderRadius: 99, overflow: 'hidden', marginTop: 9 }}>
          <div style={{
            height: '100%', width: `${baseHours ? (hourCount / baseHours) * 100 : 0}%`,
            background: `linear-gradient(90deg, ${C.accent}, #E3A874)`,
            transition: 'width .45s cubic-bezier(.4,0,.2,1)',
          }} />
        </div>
      </div>

      <div style={{ fontSize: 14, fontWeight: 700, margin: '22px 0 4px' }}>
        더 보고 싶은 것을 골라보세요
      </div>
      <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.7, margin: '0 0 11px' }}>
        전통 명리에서 눈여겨보는 다섯 가지예요. 정답은 없고, 어느 것을 더 중히 여기실지는
        두 분의 마음에 달렸어요.
      </p>

      {/* 선택 5개 */}
      {OPT_FILTERS.map(f => {
        const p = preview(f.key)
        const active = on[f.key]
        return (
          <div key={f.key} style={{
            background: C.card, border: `1px solid ${active ? C.accent : C.line}`,
            borderRadius: 14, padding: 14, marginBottom: 9,
            boxShadow: active ? '0 1px 9px rgba(200,120,60,.11)' : 'none',
            opacity: p.tone === 'zero' ? .55 : 1,
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {f.label}
                  <button onClick={() => setHelp(f.key)} style={{
                    border: 'none', background: '#F3E6DC', color: C.brand,
                    width: 18, height: 18, borderRadius: '50%', fontSize: 11,
                    fontWeight: 700, cursor: 'pointer', padding: 0, lineHeight: 1, flex: 'none',
                  }}>?</button>
                </div>
                <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.6, marginTop: 4 }}>{f.desc}</div>
                <div style={{ fontSize: 12, marginTop: 7, fontWeight: 600, color: toneColor[p.tone] }}>
                  {p.tone === 'on' ? '✓ ' : ''}{p.text}
                </div>
              </div>
              <button onClick={() => setOn({ ...on, [f.key]: !active })} style={{
                flex: 'none', width: 47, height: 27, borderRadius: 99,
                background: active ? C.accent : '#E4D5C8', position: 'relative',
                cursor: 'pointer', border: 'none', transition: 'background .2s', marginTop: 2,
              }}>
                <span style={{
                  position: 'absolute', top: 3, left: 3, width: 21, height: 21,
                  borderRadius: '50%', background: '#fff',
                  transform: active ? 'translateX(20px)' : 'none',
                  transition: 'transform .2s', boxShadow: '0 1px 3px rgba(0,0,0,.18)',
                }} />
              </button>
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
        {days.length > 0 ? days.map(d => (
          <div key={d.dateKey} style={{ padding: '13px 14px', borderBottom: `1px solid #F7EDE5` }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <b style={{ fontSize: 14.5, fontVariantNumeric: 'tabular-nums' }}>{d.dateLabel}</b>
              <span style={{ fontSize: 12, color: C.sub }}>{d.weekday}요일</span>
              <span style={{
                fontSize: 11.5, color: C.sub, background: C.warm,
                borderRadius: 5, padding: '2px 7px',
              }}>{d.dayGanji}일</span>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 9 }}>
              {d.hours.map(h => (
                <button key={h.hourIdx} onClick={() => onPickHour?.(d, h)} style={{
                  background: C.soft, color: C.brand, border: '1px solid transparent',
                  borderRadius: 8, padding: '7px 11px', fontSize: 12, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', lineHeight: 1.35,
                }}>
                  {h.hourLabel.split('(')[0]}
                  <span style={{ display: 'block', fontSize: 10.5, color: C.sub, fontWeight: 400, marginTop: 1 }}>
                    {h.hourLabel.match(/\(([^)]+)\)/)?.[1]}
                  </span>
                </button>
              ))}
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
            <div style={{ marginTop: 20, paddingTop: 18, borderTop: `1px solid ${C.line}`, textAlign: 'left' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: C.brand, marginBottom: 6 }}>
                전문가와 상담해 보세요
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.8, color: C.sub, margin: '0 0 13px' }}>
                조건을 줄여도 마음에 드는 날이 없거나, 여러 조건을 함께 살펴야 할 것 같다면
                명리 선생님과 직접 이야기해 보시는 방법이 있어요. 사주는 조건을 하나씩
                맞춰가는 것보다, 전체를 함께 놓고 보아야 할 때가 많습니다.
              </p>
              <button onClick={onConsult} style={{
                width: '100%', padding: 12, borderRadius: 11, border: `1px solid ${C.accent}`,
                background: C.soft, color: C.brand, fontSize: 13.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>상담 알아보기</button>
            </div>
          </div>
        )}
      </div>

      {/* 하단 안내 — 상황에 따라 문구가 바뀐다 */}
      <div style={{
        fontSize: 12, color: C.sub, lineHeight: 1.75, marginTop: 13,
        padding: '12px 14px', background: C.warm, borderRadius: 10,
      }}>
        {days.length === 0 ? (
          <>조건은 <b style={{ color: C.brand }}>많이 켤수록 좋은 게 아니라</b>, 무엇을 더 보고 싶은지의
            문제예요. 다섯 가지를 모두 만족하는 날은 드뭅니다.</>
        ) : onCount === 0 ? (
          <>아직 아무 조건도 켜지 않았어요. 위에서 하나씩 눌러 보시면 남는 날이 바뀝니다.</>
        ) : days.length <= 2 ? (
          <>남은 날이 <b style={{ color: C.brand }}>{days.length}일</b>뿐이에요. 이 중에 병원 일정과 맞는
            날이 없다면, 조건을 하나 꺼 보시거나 <b style={{ color: C.brand }}>명리 선생님과 상담</b>해
            보시는 것도 좋습니다.</>
        ) : (
          <>지금 <b style={{ color: C.brand }}>{days.length}일 {hourCount}개 시간</b>이 남았어요.
            시간을 누르면 그때 태어날 아이가 어떤 결을 지니는지 볼 수 있어요.</>
        )}
      </div>

      {/* 설명 모달 */}
      {help && HELP[help] && (
        <div onClick={e => { if (e.target === e.currentTarget) setHelp(null) }} style={{
          position: 'fixed', inset: 0, background: 'rgba(58,46,40,.44)',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 60,
        }}>
          <div style={{
            background: C.card, width: '100%', maxWidth: 480, borderRadius: '18px 18px 0 0',
            padding: '22px 20px 26px', maxHeight: '88vh', overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: 17.5, margin: '0 0 3px' }}>{HELP[help].t}</h3>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 15 }}>{HELP[help].k}</div>
            <div style={{ background: '#F7EFE8', borderRadius: 10, padding: '13px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: C.brand, marginBottom: 5 }}>쉽게 말하면</div>
              <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.8 }}>{HELP[help].w}</p>
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.85, background: '#fff',
              border: `1px solid ${C.line}`, borderRadius: 10, padding: '13px 14px', marginBottom: 12,
            }}>{HELP[help].e}</div>
            <div style={{
              fontSize: 12, color: C.sub, lineHeight: 1.75,
              borderTop: `1px solid ${C.line}`, paddingTop: 12, marginBottom: 15,
            }}>{HELP[help].c}</div>
            <button onClick={() => setHelp(null)} style={{
              width: '100%', padding: 13, borderRadius: 12, border: 'none',
              background: C.brand, color: '#fff', fontSize: 14, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>알겠어요</button>
          </div>
        </div>
      )}
    </div>
  )
}
