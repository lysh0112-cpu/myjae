'use client'
// app/manseryeok/moving-timing/components/SoloWonguk.tsx
//
// ★ 한 사람 명식표 — 배우자 없이 계약자만 있을 때 쓴다.
//
//   [왜 만들었나]
//   처음에는 배우자가 없어도 CoupleWonguk 에 계약자를 양쪽에 넣었다.
//   그러니 같은 사람이 두 번 그려졌다(2026-07-24 대표님 확인).
//   CoupleWonguk 은 두 사람 전용이고 가운데 하트도 있어 이 자리엔 맞지 않는다.
//
//   [원칙]
//   · 공용 부품(CoupleWonguk·SajuWonguk)은 건드리지 않는다.
//     궁합·사주보기·결혼택일이 함께 쓰기 때문이다.
//   · 대신 오행 팔레트는 공용 lib/saju/ohaengColor 를 그대로 쓴다.
//     CoupleWonguk 과 나란히 놓아도 색이 어긋나지 않는다.
//   · 4칸(시·일·월·연) 배치와 일주 강조 테두리도 CoupleWonguk 과 같게 맞췄다.

import { EL_BG, EL_BD, EL_C, EL_C_SUB, EL_HAN } from '@/lib/saju/ohaengColor'

type Element = '목' | '화' | '토' | '금' | '수'

const STEM_ELEMENT: Record<string, Element> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_ELEMENT: Record<string, Element> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

interface SajuPillar { pillar: string; stem: string; branch: string }

interface PersonLike {
  name: string
  birthLabel: string
  pillars: SajuPillar[]
  yongsin?: string
}

function GanjiCell({ char, el, isDay }: { char: string; el: Element | undefined; isDay?: boolean }) {
  const isEmpty = !char || char === '?'
  return (
    <div style={{
      borderRadius: 7,
      background: isEmpty ? '#f5f5f5' : (el ? EL_BG[el] : '#f5f5f5'),
      border: el === '수'
        ? (isDay ? '3px solid #000000' : '1px solid #2b2b2b')
        : (isDay ? '2px solid #c8783c' : `1px solid ${el ? EL_BD[el] : '#ddd'}`),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', aspectRatio: '1 / 1',
    }}>
      <span style={{
        fontSize: 16, fontWeight: 700,
        color: isEmpty ? '#ccc' : (el ? EL_C[el] : '#888'), lineHeight: 1,
      }}>
        {isEmpty ? '?' : char}
      </span>
      {el && !isEmpty && (
        <span style={{
          position: 'absolute', bottom: 0, right: 2, fontSize: 9,
          fontWeight: 600, color: EL_C_SUB[el],
        }}>
          {EL_HAN[el]}
        </span>
      )}
    </div>
  )
}

export default function SoloWonguk({ person }: { person: PersonLike }) {
  const byPillar: Record<string, SajuPillar> = {}
  person.pillars.forEach(p => { byPillar[p.pillar] = p })

  // 화면은 항상 시·일·월·연 4칸. 없는 기둥은 ? 로.
  const order = ['시주', '일주', '월주', '연주']
  const pick = (label: string) =>
    byPillar[label] || (label === '연주' ? byPillar['년주'] : undefined)
  const labels = ['시', '일', '월', '연']

  return (
    <div style={{
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
      background: '#FFFDF9', border: '0.5px solid #EAE0CE',
      borderRadius: 12, padding: '12px 10px',
    }}>
      <div style={{ textAlign: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#3A3228' }}>
          {person.name}
        </div>
        {person.birthLabel && (
          <div style={{ fontSize: 10, color: '#7A6440' }}>{person.birthLabel}</div>
        )}
      </div>

      {/* 4칸 — 가운데 정렬. 한 사람이라 폭을 절반쯤으로 잡는다 */}
      <div style={{ maxWidth: 220, margin: '0 auto' }}>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3, marginBottom: 3,
        }}>
          {labels.map((l, i) => (
            <div key={i} style={{ fontSize: 8, textAlign: 'center', color: '#6b5340' }}>{l}</div>
          ))}
        </div>
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3, marginBottom: 3,
        }}>
          {order.map((label, i) => {
            const p = pick(label)
            const stem = p?.stem ?? '?'
            return <GanjiCell key={i} char={stem} el={STEM_ELEMENT[stem]} isDay={label === '일주'} />
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 3 }}>
          {order.map((label, i) => {
            const p = pick(label)
            const branch = p?.branch ?? '?'
            return <GanjiCell key={i} char={branch} el={BRANCH_ELEMENT[branch]} isDay={label === '일주'} />
          })}
        </div>
      </div>

      {person.yongsin && (
        <div style={{
          textAlign: 'center', marginTop: 9, fontSize: 11.5, color: '#9A8060',
        }}>
          필요한 기운 <b style={{ color: '#7A6440' }}>{person.yongsin}</b>
        </div>
      )}
    </div>
  )
}
