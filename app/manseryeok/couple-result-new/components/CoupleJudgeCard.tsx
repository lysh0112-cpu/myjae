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
//  ★★2026-08-02 — 별표를 «껐습니다» (대표님 확정)
//    "점수제는 없애고 «깊이» 로 상대하자"
//    "별점은 없애고 «프리미엄 해설» 로 대신하는 걸로 하자"
//
//    [까닭]  궁합 점수·등급·별점의 «근거가 교재에 하나도 없습니다» (2026-08-02 전수 확인)
//      · 232쪽은 «판단법의 나열» 이지 배점표가 아닙니다
//      · 49쪽 A·B·C·D 등급의 «뜻» 도 교재에 없습니다
//      · 238쪽 "사주를 좋고 나쁜 것으로 «단식 판단» 을 하면 안 된다"
//      ⇒ 별을 매기면 그 잣대는 «우리가 만든 것» 이 됩니다.
//        시중 앱이 억지로 만들어 쓰는 것을 차용했던 것이고, 이제 걷어냅니다.
//
//    ⚠️⚠️ 「지운」 것이 아니라 «감춘» 것입니다 —
//      stars 값은 coupleFilterV1 이 그대로 냅니다. 통변 재료·검사가 씁니다.
//      ★43부에 lines 를 껐던 것과 «같은 방식» 입니다 (아래 주석 참고).
//    ⚠️ 되살리려면 대표님께 여쭈십시오. 2026-07-24 «점수제 폐기» 의 연장입니다.
//
//  ⚠️ [옛 기록] 양방향(dual) 카테고리는 별을 두 줄로 나눴다.
//    심산 궁합은 남녀 비대칭이고 jijiGrade 144칸도 비대칭이라(辰→寅은 C, 寅→辰은 B),
//    평균을 내면 그 차이가 묻히기 때문이었다.
//    ★2026-08-02 — 별을 끄면서 이 대목도 함께 감춰졌습니다.
//
//  ⚠️ 화면에 쪽수·유파명·검수자 이름을 쓰지 않는다. (대표님 지시 2026-07-24)
//     근거는 coupleFilterV1.ts 주석에만 남긴다.
// ============================================================================
'use client'

import { useState } from 'react'
import type { CoupleJudgeV1, CategoryResult, Stars } from '@/lib/saju/coupleFilterV1'

const GOLD = '#c08a2e'
const GOLD_DIM = '#e5d8bf'

/**
 * ★2026-08-02 — 지금은 «쓰지 않습니다». 별표를 껐기 때문입니다 (대표님 확정).
 *   ⚠️ 지우지 «마십시오» — 되살릴 때 필요하고, 어떤 모양이었는지 남겨 둡니다.
 *   ⚠️ eslint 가 「안 쓰인다」고 알려 주는 것이 «맞습니다». 그대로 두십시오.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        {/* ★2026-08-02 — 별표를 «껐습니다» (대표님 확정 · 위 머리말 참고)
            ⚠️ cat.stars 값은 «그대로 옵니다». 화면에만 안 그립니다.
               통변 재료와 검사가 그것을 씁니다. 지우지 마십시오.
            ⚠️ 되살리려면 대표님께 여쭈십시오. */}
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

export default function CoupleJudgeCard({ judge, needExtra, tongByKey, tongIntro, tongOutro, soloLabel = '각자의 배우자 자리' }: {
  judge: CoupleJudgeV1
  /** '없는 오행을 채워 주는가' 카드 안에 넣을 것 (오행 비교 그래프) */
  needExtra?: React.ReactNode
  /** ★2026-07-25 — 주제(카드 key)별 AI 통변 해설. 각 판정 카드 안에 접기로 붙는다. */
  tongByKey?: Record<string, string>
  /** 여는말 통변 (카드 위 독립) */
  tongIntro?: string
  /** 맺는말 통변 (카드 아래 독립) */
  tongOutro?: string
  /** ★2026-07-26 — 각자의 자리 구분선 글씨. 연인이면 "각자의 인연 자리". */
  soloLabel?: string
}) {
  // ★2026-07-26 — 카드를 세 묶음으로 나눈다. (대표님 결정 (가)안)
  //
  //   [무엇이 문제였나]
  //   전에는 spouse_ 인지 아닌지로만 둘로 갈랐다. 그런데 뒤에 새로 붙인
  //   '두 분의 부부운'·'두 분의 자식운'은 spouse_ 가 아니라서 앞 묶음으로 들어가,
  //   화면에서 각자의 배우자운보다 '위'에 떴다.
  //   coupleFilterV1 의 CARD_ORDER 는 배우자운 → 부부운 → 자식운 순으로
  //   정렬해 두었고, 통변(buildCouplePrompt)도 그 순서로 쓰는데, 화면만 뒤집혀 있었다.
  //
  //   [고친 방법]
  //   ① 두 분이 만났을 때  — 없는오행 · 귀인 · 일주
  //   ② 각자의 자리        — 배우자운(인연운) 두 사람
  //   ③ 두 분을 아울러     — 부부운 · 자식운   ← 각자를 본 뒤 두 분 이야기로 모인다
  //   이제 화면 순서 = 통변 순서가 되어 읽는 흐름이 맞는다.
  //   ③은 부부 궁합에만 생긴다(showChild). 연인이면 카드가 없어 묶음째 안 그려진다.
  const TOGETHER = ['couple_overall', 'child']
  const meet = judge.cats.filter(c => !c.key.startsWith('spouse_') && !TOGETHER.includes(c.key))
  const solo = judge.cats.filter(c => c.key.startsWith('spouse_'))
  const together = judge.cats.filter(c => TOGETHER.includes(c.key))

  return (
    <div style={{ marginTop: 12 }}>
      {/* 여는말 통변 — 두 사람 소개 (카드 위 독립) */}
      {tongIntro && tongIntro.trim() && (
        <div style={{
          background: '#FFFBF7', border: '0.5px solid #9c7a58', borderRadius: 13,
          padding: '14px 15px', marginBottom: 12,
          fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.85, letterSpacing: '-.01em', whiteSpace: 'pre-wrap',
        }}>{tongIntro.trim()}</div>
      )}

      <SectLabel text="두 분이 만났을 때" />
      {meet.map(c => (
        <Card key={c.key} cat={c} extra={c.key === 'ohaeng' ? needExtra : undefined} tong={tongByKey?.[c.key]} />
      ))}

      <div style={{ marginTop: 20 }}>
        <SectLabel text={soloLabel} />
        {solo.map(c => <Card key={c.key} cat={c} tong={tongByKey?.[c.key]} />)}
      </div>

      {/* ★2026-07-26 — 각자의 자리를 본 뒤, 두 분 이야기로 모인다. (부부 궁합만) */}
      {together.length > 0 && (
        <div style={{ marginTop: 20 }}>
          <SectLabel text="두 분을 아울러 보면" />
          {together.map(c => <Card key={c.key} cat={c} tong={tongByKey?.[c.key]} />)}
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        <SectLabel text="이렇게 읽으시면 좋아요" />
        <Block kind="good" title="도움이 되는 자리" items={judge.good} />
        <Block kind="watch" title="함께 살피시면 좋은 자리" items={judge.watch} />
        <Block kind="note" title="알아두시면 좋아요" items={judge.note} />
      </div>

      {/* ★2026-07-25 — 맺는말 통변 (카드 아래 독립) */}
      {tongOutro && tongOutro.trim() && (
        <div style={{
          marginTop: 14, background: '#FFFBF7', border: '0.5px solid #9c7a58', borderRadius: 13,
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
