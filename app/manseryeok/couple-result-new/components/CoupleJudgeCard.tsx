// app/manseryeok/couple-result-new/components/CoupleJudgeCard.tsx
// ★★★ VERSION: 2026-07-24-v3 ★★★
//   덮어쓰기가 됐는지 확인하려면 이 줄을 보십시오.
//   이 판의 변경점: 오행 비교 그래프를 '없는 오행을 채워 주는가' 카드 안으로 넣음
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

import { useState } from 'react'
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

function Card({ cat, extra, tong }: { cat: CategoryResult; extra?: React.ReactNode; tong?: string }) {
  const [open, setOpen] = useState(false)
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

      {/* ★2026-07-25 — 카드 본문(lines)·양방향(dual) 표시를 껐다. (대표님 지시)
          같은 내용이 판정 요약과 AI 풀이에 두 번 나오던 중복을 없앤다.
          lines 는 통변 재료로는 그대로 살아 있고(toCoupleTongbyeonInput),
          화면에는 제목·별점·그래프·풀이(접기)만 보인다. */}

      {/* 카테고리에 딸린 추가 내용 (예: 없는 오행 카드의 오행 비교 그래프) */}
      {extra && <div style={{ marginTop: 10 }}>{extra}</div>}

      {/* ★2026-07-25 — 이 주제의 AI 통변 해설 (접기). 판정 아래에 그 주제 풀이가 붙는다. */}
      {tong && tong.trim() && (
        <div style={{ marginTop: 10, borderTop: '0.5px solid #f2e8dd', paddingTop: 9 }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: '#8f3d0e', fontSize: 12, fontWeight: 600, letterSpacing: '-.01em',
            }}
          >
            <span style={{ fontSize: 12 }}>✦</span>
            <span>{open ? '풀이 접기' : '이 자리의 풀이 보기'}</span>
            <span style={{ marginLeft: 'auto', fontSize: 10, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>▾</span>
          </button>
          {open && (
            <div style={{
              marginTop: 9, fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.85,
              letterSpacing: '-.01em', whiteSpace: 'pre-wrap',
            }}>{tong.trim()}</div>
          )}
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

export default function CoupleJudgeCard({ judge, needExtra, tongByKey, tongIntro, tongOutro }: {
  judge: CoupleJudgeV1
  /** '없는 오행을 채워 주는가' 카드 안에 넣을 것 (오행 비교 그래프) */
  needExtra?: React.ReactNode
  /** ★2026-07-25 — 주제(카드 key)별 AI 통변 해설. 각 판정 카드 안에 접기로 붙는다. */
  tongByKey?: Record<string, string>
  /** 여는말 통변 (카드 위 독립) */
  tongIntro?: string
  /** 맺는말 통변 (카드 아래 독립) */
  tongOutro?: string
}) {
  // 앞 4개 = 두 사람이 만났을 때 / 뒤 2개 = 각자의 배우자 자리
  const meet = judge.cats.filter(c => !c.key.startsWith('spouse_'))
  const solo = judge.cats.filter(c => c.key.startsWith('spouse_'))

  return (
    <div style={{ marginTop: 12 }}>
      {/* 여는말 통변 — 두 사람 소개 (카드 위 독립) */}
      {tongIntro && tongIntro.trim() && (
        <div style={{
          background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 13,
          padding: '14px 15px', marginBottom: 12,
          fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.85, letterSpacing: '-.01em', whiteSpace: 'pre-wrap',
        }}>{tongIntro.trim()}</div>
      )}

      <SectLabel text="두 분이 만났을 때" />
      {meet.map(c => (
        <Card key={c.key} cat={c} extra={c.key === 'ohaeng' ? needExtra : undefined} tong={tongByKey?.[c.key]} />
      ))}

      <div style={{ marginTop: 20 }}>
        <SectLabel text="각자의 배우자 자리" />
        {solo.map(c => <Card key={c.key} cat={c} tong={tongByKey?.[c.key]} />)}
      </div>

      <div style={{ marginTop: 20 }}>
        <SectLabel text="이렇게 읽으시면 좋아요" />
        <Block kind="good" title="도움이 되는 자리" items={judge.good} />
        <Block kind="watch" title="함께 살피시면 좋은 자리" items={judge.watch} />
        <Block kind="note" title="알아두시면 좋아요" items={judge.note} />
      </div>

      {/* ★2026-07-25 — 맺는말 통변 (카드 아래 독립) */}
      {tongOutro && tongOutro.trim() && (
        <div style={{
          marginTop: 14, background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 13,
          padding: '14px 15px',
          fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.85, letterSpacing: '-.01em', whiteSpace: 'pre-wrap',
        }}>{tongOutro.trim()}</div>
      )}

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
