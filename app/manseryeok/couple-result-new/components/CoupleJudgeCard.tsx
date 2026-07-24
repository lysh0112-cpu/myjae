// app/manseryeok/couple-result-new/components/CoupleJudgeCard.tsx
// ============================================================================
//  궁합 판정 카드 — 심산 기준 6개 카테고리 (점수·등급 없음)
//
//  계산은 하지 않는다. lib/saju/coupleFilterV1.ts 의 judgeCouple() 결과를
//  받아서 그리기만 한다. (원칙: 화면과 계산 분리)
//
//  ★ 별표는 카테고리별로만 매기고, 전부 더한 총점은 만들지 않는다.
//    심산 궁합론에 종합식이 없고, 238쪽이 "사주를 좋고 나쁜 것으로
//    단식 판단을 하면 안 된다"고 못박기 때문. 택일 3종도 같은 이유로 점수제를 버렸다.
//
//  ★ 양방향(dual) 카테고리는 별을 두 줄로 나눈다.
//    심산 궁합은 남녀 비대칭이고 jijiGrade 144칸도 비대칭이라(辰→寅은 C, 寅→辰은 B),
//    평균을 내면 그 차이가 묻힌다.
//
//  ⚠️ 화면에 쪽수·유파명·검수자 이름을 쓰지 않는다. (대표님 지시 2026-07-24)
//     근거는 coupleFilterV1.ts 주석에만 남긴다.
// ============================================================================
'use client'

import type { CoupleJudgeV1, CategoryResult, Stars } from '@/lib/saju/coupleFilterV1'

const GOLD = '#c08a2e'
const GOLD_DIM = '#e5d8bf'

function StarRow({ n }: { n: Stars }) {
  return (
    <span style={{ fontSize: 12.5, letterSpacing: '.05em', whiteSpace: 'nowrap', flexShrink: 0 }}>
      <span style={{ color: GOLD }}>{'★'.repeat(n)}</span>
      <span style={{ color: GOLD_DIM }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function Card({ cat }: { cat: CategoryResult }) {
  return (
    <div style={{
      background: '#fff', border: '0.5px solid #eee2d6', borderRadius: 13,
      padding: '13px 14px', marginBottom: 7,
    }}>
      {/* 제목 + 별 (양방향이면 별은 아래 dual 로 간다) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontSize: 13.5, fontWeight: 700, letterSpacing: '-.02em', lineHeight: 1.4, color: '#2f211c' }}>
          {cat.title}
        </span>
        {cat.stars && <StarRow n={cat.stars} />}
      </div>

      {/* 본문 */}
      {cat.lines.length > 0 && (
        <div style={{ marginTop: 7 }}>
          {cat.lines.map((l, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginTop: i === 0 ? 0 : 4 }}>
              <span style={{
                flex: '0 0 3px', height: 3, borderRadius: '50%',
                background: '#eee2d6', marginTop: 8,
              }} />
              <span style={{
                fontSize: 12, color: '#6b5044', lineHeight: 1.72, letterSpacing: '-.01em',
              }}>{l}</span>
            </div>
          ))}
        </div>
      )}

      {/* 양방향 — 두 줄로 나눠 각각 별 */}
      {cat.dual && (
        <div style={{
          marginTop: 9, border: '0.5px solid #f5ece3', borderRadius: 9, overflow: 'hidden',
        }}>
          {cat.dual.map((d, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
              padding: '8px 10px', background: '#fdfaf7',
              borderTop: i === 0 ? 'none' : '0.5px solid #f5ece3',
            }}>
              <span style={{ fontSize: 11.5, color: '#6b5044', lineHeight: 1.5, letterSpacing: '-.01em' }}>
                {d.text}
              </span>
              <StarRow n={d.stars} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SectLabel({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 2px 9px' }}>
      <span style={{
        fontSize: 10.5, letterSpacing: '.17em', color: '#8a7063', fontWeight: 700, whiteSpace: 'nowrap',
      }}>{text}</span>
      <span style={{ flex: 1, height: '0.5px', background: '#eee2d6' }} />
    </div>
  )
}

function Block({ kind, title, items }: {
  kind: 'good' | 'watch' | 'note'
  title: string
  items: string[]
}) {
  if (!items.length) return null
  const color = kind === 'good' ? '#4f7d63' : kind === 'watch' ? '#b06a3c' : '#8a7063'
  return (
    <div style={{
      background: '#fff', border: '0.5px solid #eee2d6', borderRadius: 13,
      padding: '13px 14px', marginBottom: 7, position: 'relative', overflow: 'hidden',
    }}>
      <span style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 2.5, background: color }} />
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8, letterSpacing: '-.02em', color }}>
        {title}
      </div>
      {items.map((t, i) => (
        <div key={i} style={{
          fontSize: 11.5, color: '#6b5044', lineHeight: 1.7, paddingLeft: 11,
          position: 'relative', marginBottom: i === items.length - 1 ? 0 : 5, letterSpacing: '-.01em',
        }}>
          <span style={{
            position: 'absolute', left: 0, top: 8, width: 3, height: 3, borderRadius: '50%',
            background: color, opacity: .4,
          }} />
          {t}
        </div>
      ))}
    </div>
  )
}

export default function CoupleJudgeCard({ judge }: { judge: CoupleJudgeV1 }) {
  // 앞 4개 = 두 사람이 만났을 때 / 뒤 2개 = 각자의 배우자 자리
  const meet = judge.cats.filter(c => !c.key.startsWith('spouse_'))
  const solo = judge.cats.filter(c => c.key.startsWith('spouse_'))

  return (
    <div style={{ marginTop: 12 }}>
      <SectLabel text="두 분이 만났을 때" />
      {meet.map(c => <Card key={c.key} cat={c} />)}

      <div style={{ marginTop: 20 }}>
        <SectLabel text="각자의 배우자 자리" />
        {solo.map(c => <Card key={c.key} cat={c} />)}
      </div>

      <div style={{ marginTop: 20 }}>
        <SectLabel text="이렇게 읽으시면 좋아요" />
        <Block kind="good" title="도움이 되는 자리" items={judge.good} />
        <Block kind="watch" title="함께 살피시면 좋은 자리" items={judge.watch} />
        <Block kind="note" title="알아두시면 좋아요" items={judge.note} />
      </div>

      {/* 마무리 — 238쪽 개운법의 태도를 그대로 옮긴 문장 */}
      <div style={{
        marginTop: 14, padding: '15px 16px', borderRadius: 13,
        background: 'linear-gradient(135deg,#f6e8ec 0%,#f9eee4 100%)',
        fontSize: 11.5, color: '#7d4155', lineHeight: 1.8, letterSpacing: '-.01em',
      }}>
        <strong style={{ display: 'block', fontSize: 12.5, marginBottom: 6, color: '#6d364a', letterSpacing: '-.02em' }}>
          사주는 좋고 나쁨으로 가르는 것이 아닙니다
        </strong>
        부족한 자리는 서로 채우면 되고, 직업과 살아가는 방식으로도 달라집니다.
        나의 모자란 면을 채워 주는 사람을 만나는 것 자체가 이미 하나의 복이에요.
      </div>
    </div>
  )
}
