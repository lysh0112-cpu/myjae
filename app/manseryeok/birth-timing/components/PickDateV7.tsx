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
//   공용 TermModal(app/manseryeok/result-new/TermModal.tsx) 의 규격을 따른다.
//   제목 옆 한자 병기 · 카테고리 배지 · "한마디로" 라벨 · 닫기는 '확인'.
//   ★버튼명은 연재쌤 안(2026-07-23) 기준. 원 명리 개념을 괄호로 병기한다.
interface Help { t: string; hanja: string; cat: string; one: string; body: string; note: string }
const HELP: Record<string, Help> = {
  fixRoot: {
    t: '뿌리 기운', hanja: '通根', cat: '고정',
    one: '아이 자신이 땅에 뿌리를 내린 날이에요.',
    body: '사주 여덟 글자 가운데 아이 자신을 뜻하는 글자가 하나 있어요. 그 글자와 같은 기운이 아래쪽 땅자리에 들어 있으면 뿌리를 내렸다고 합니다.\n\n나무로 치면 줄기만 서 있는 것과, 흙에 단단히 박힌 것의 차이예요. 뿌리가 있어야 좋은 기운이 찾아와도 받아서 쓸 힘이 생긴다고 봅니다.',
    note: '뿌리가 많다고 무조건 좋은 것은 아니에요. 지나치면 고집이 세지거나 융통성이 부족해질 수 있어서, 알맞은 정도가 좋다고 봅니다.',
  },
  fixWonjin: {
    t: '거슬림 없음', hanja: '怨嗔', cat: '고정',
    one: '태어난 달과 날이 서로 순한 날이에요.',
    body: '특별한 이유가 없는데도 왠지 마음이 맞지 않는 관계를 원진이라고 합니다. 크게 다투지는 않지만 속으로 앙금이 남는 사이예요.\n\n태어난 달과 날이 이런 사이가 되는 경우를 미리 빼 두었어요. 이 두 자리는 아이가 자라며 가장 오래 머무는 자리로 봅니다.',
    note: '부딪침이 큰 편은 아니라서 가볍게 보는 분들도 있어요. 다만 굳이 두고 볼 이유도 없다고 판단했습니다.',
  },
  fixHyeong: {
    t: '부딪힘 없음', hanja: '刑', cat: '고정',
    one: '태어난 달과 날이 서로 모나지 않은 날이에요.',
    body: '사람 사이에도 유난히 부딪치는 조합이 있듯, 열두 글자 중에도 만나면 서로를 깎아내리는 짝이 있어요. 이것을 형(刑)이라고 합니다.\n\n태어난 달과 날이 그런 사이인 경우를 빼 두었어요. 옛 책에서는 다치거나 시비에 휘말리기 쉽다고 보았습니다.',
    note: '남을 다스리는 일에는 오히려 힘이 된다고 보는 견해도 있어요. 반드시 나쁘기만 한 것은 아니지만, 아이 사주에는 두지 않는 쪽으로 잡았습니다.',
  },
  fixSamePillar: {
    t: '중복 없음', hanja: '重複', cat: '고정',
    one: '같은 글자가 겹쳐 한쪽으로 쏠리지 않은 날이에요.',
    body: '사주는 네 기둥으로 이루어져요. 그중 태어난 달과 태어난 날의 두 글자가 완전히 똑같이 겹치는 경우가 있습니다.\n\n같은 글자가 겹치면 그 기운만 두 배로 커져서 나머지가 묻히기 쉬워요. 겉으로는 다섯 기운이 다 있어 보여도 실제로는 한쪽으로 쏠린 사주가 됩니다.',
    note: '같은 기둥이 겹치는 것을 기운이 뚜렷하다고 좋게 보는 견해도 있어요. 다만 균형을 우선으로 보는 쪽을 택했습니다.',
  },
  optDaeun: {
    t: '중년 대운', hanja: '大運', cat: '선택',
    one: '아이에게 필요한 기운이 20~60대에 찾아오는 날이에요.',
    body: '사람에게는 10년 단위로 바뀌는 큰 흐름이 있어요. 이것을 대운이라고 합니다. 아이에게 특히 필요한 기운(용신)이 20대에서 60대 사이에 찾아오는지를 봤어요.\n\n이 흐름은 태어난 달에서 정해져요. 예정일이 정해지면 큰 틀은 거의 같지만, 어느 날에 태어나느냐에 따라 그 기운을 무엇으로 받는지가 달라집니다. 같은 시기가 어떤 아이에게는 재물이 붙는 때가 되고, 어떤 아이에게는 배움이 깊어지는 때가 됩니다.',
    note: '여름·겨울에 태어나면 따뜻함과 서늘함의 균형(조후)을, 봄·가을이면 기운의 세기(억부)를 기준으로 봐요. 계절에 따라 보는 방식이 다릅니다.',
  },
  optFiveEl: {
    t: '오행 구족', hanja: '五行具足', cat: '선택',
    one: '나무·불·흙·쇠·물 다섯이 하나도 빠지지 않은 날이에요.',
    body: '세상의 기운을 다섯으로 나누어 봅니다. 여덟 글자 안에 이 다섯이 모두 들어 있는 날만 남겨요.\n\n하나가 아예 없으면 그 부분이 비어 있다고 봅니다. 다만 여덟 글자에 다섯을 모두 담으려면 어느 하나는 한 개뿐이 되기 마련이에요. 그건 자연스러운 일입니다.',
    note: '다 갖췄다고 좋기만 한 것도, 하나 없다고 나쁘기만 한 것도 아니에요. 없는 기운은 살아가며 채워 간다고 보기도 합니다.',
  },
  optBalance: {
    t: '기운의 균형', hanja: '中和', cat: '선택',
    one: '어느 한 기운이 지나치게 몰리지 않은 날이에요.',
    body: '다섯 기운이 다 있더라도, 그중 하나가 여덟 글자의 절반 가까이를 차지하면 한쪽으로 쏠렸다고 봅니다.\n\n예를 들어 나무 기운이 셋 이상이면 나머지 넷이 다섯 자리를 나눠 갖게 돼요. 겉보기엔 고른데 실제로는 한 기운이 판을 주도합니다.',
    note: '계절에 따라 자연스러운 쏠림도 있어요. 봄에 태어나면 나무가 많고 가을이면 쇠가 많은 것은 당연한 일입니다. 이걸 흠으로만 볼 필요는 없어요.',
  },
  optFourRoot: {
    t: '네 기운 착근', hanja: '着根', cat: '선택',
    one: '자신·일·재능·살림 네 갈래가 모두 뿌리를 둔 날이에요.',
    body: '사주에는 네 갈래 힘이 있어요. 아이 자신(신), 지켜야 할 일과 규범(관), 드러내는 재능(식상), 다루는 살림살이(재)입니다. 이 넷이 모두 땅에 뿌리를 두고 있는 날만 남겨요.\n\n하나만 크고 나머지가 비어 있는 것보다, 네 갈래가 고루 자리 잡은 쪽을 고르는 방식이에요. 어느 하나가 뿌리 없이 떠 있으면 그 부분이 실속을 갖기 어렵다고 봅니다.',
    note: '고르다는 것이 곧 크다는 뜻은 아니에요. 한 가지가 뚜렷하게 강한 사주를 더 좋게 보는 견해도 있습니다.',
  },
  optGwiin: {
    t: '도움 기운', hanja: '天乙貴人', cat: '선택',
    one: '어려울 때 돕는 인연이 따른다고 본 자리가 든 날이에요.',
    body: '예로부터 어려울 때 돕는 사람이 나타난다고 본 자리입니다. 여러 길한 자리 가운데서도 으뜸으로 쳐 왔어요.\n\n태어난 날의 기준 글자에 따라 어느 자리가 귀인인지 정해져요. 그 자리가 아이 사주 안에 들어오는 날만 남깁니다. 어느 기둥에 들어오는지에 따라 뜻을 달리 보기도 해요.',
    note: '귀인이 없다고 도움을 받지 못한다는 뜻은 아니에요. 있으면 좋게 보는 자리일 뿐입니다.',
  },
}

const FIXED_CHIPS: { key: string; label: string; hanja: string }[] = [
  { key: 'fixRoot', label: '뿌리 기운', hanja: '通根' },
  { key: 'fixWonjin', label: '거슬림 없음', hanja: '怨嗔' },
  { key: 'fixHyeong', label: '부딪힘 없음', hanja: '刑' },
  { key: 'fixSamePillar', label: '중복 없음', hanja: '重複' },
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
        <div style={{ fontSize: 13, fontWeight: 700, color: C.brand, letterSpacing: '-.2px' }}>
          이미 확인해 둔 것
        </div>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.75, marginTop: 7 }}>
          알려주신 예정일을 기준으로 <b style={{ color: C.brand }}>3주 전부터 사흘 전까지</b>,
          병원이 수술하는 <b style={{ color: C.brand }}>평일 오전 9시 30분 ~ 오후 5시 30분</b> 안에서
          찾았어요. 그중 아래 네 가지는 미리 확인해 두었습니다.
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

      {/* 선택 5개 — 카드를 누르면 설명, 스위치를 누르면 켜고 끔 */}
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

      {/* 설명 모달 — 공용 TermModal(result-new/TermModal.tsx) 규격에 맞춤.
          제목 옆 한자 · 카테고리 배지 · 우상단 ✕ · "한마디로" 라벨 · 닫기는 '확인' */}
      {help && HELP[help] && (() => {
        const h = HELP[help]
        return (
          <div onClick={() => setHelp(null)} style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 20, zIndex: 1000,
          }}>
            <div onClick={e => e.stopPropagation()} style={{
              maxWidth: 340, width: '100%', background: '#fff', borderRadius: 16,
              padding: '20px 18px', maxHeight: '86vh', overflowY: 'auto',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <span style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-.4px' }}>
                  {h.t}{' '}
                  <span style={{ fontSize: 13, color: '#6b5340', fontWeight: 400 }}>({h.hanja})</span>
                </span>
                <span style={{
                  fontSize: 10, color: '#8f3d0e', background: '#fdf6ee',
                  padding: '2px 8px', borderRadius: 8, flex: 'none',
                }}>{h.cat}</span>
                <button onClick={() => setHelp(null)} aria-label="닫기" style={{
                  marginLeft: 'auto', background: 'none', border: 'none',
                  fontSize: 16, color: '#ccc', cursor: 'pointer', lineHeight: 1,
                }}>✕</button>
              </div>

              <div style={{ background: '#f6f6f3', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: '#8f3d0e', fontWeight: 700, marginBottom: 5 }}>한마디로</div>
                <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, fontWeight: 600 }}>{h.one}</div>
              </div>

              <div style={{ fontSize: 13, color: '#555', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
                {h.body}
              </div>

              <div style={{
                marginTop: 14, paddingTop: 12, borderTop: '1px solid #eee',
                fontSize: 12.5, color: '#8a7a6d', lineHeight: 1.75,
              }}>
                <span style={{ color: '#8f3d0e', fontWeight: 700 }}>다만</span> — {h.note}
              </div>

              <div onClick={() => setHelp(null)} style={{
                marginTop: 16, background: '#1a1a1a', color: '#fff', textAlign: 'center',
                padding: 11, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              }}>확인</div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
