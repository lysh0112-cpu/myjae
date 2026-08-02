// app/manseryeok/couple-result-new/components/CoupleReport.tsx
//
// ┌───────────────────────────────────────────────────────────────┐
// │  ★프리미엄 궁합 리포트 — «목업이 정본» 입니다                    │
// └───────────────────────────────────────────────────────────────┘
//
//  ★2026-08-02 신설 — 대표님 지시 「목업대로 전면 개편」 (44부 22차)
//
//  ══ 옛 화면(CoupleJudgeCard)과 무엇이 다른가 ══
//
//   옛것                                   ★이것
//   ────────────────────────────────      ────────────────────────────────
//   제목만 보이고 «눌러야» 열림             ★모두 «펼친 채». 스크롤하며 읽습니다
//   판정 카드 → 접힌 풀이 → AI 글 «두 겹»   ★AI 풀이 «한 겹»
//   통변을 판정 카드 «키» 에 매핑           ★AI 가 쓴 대목을 «그대로» 그립니다
//     ⇒ 키가 없는 새 대목은 «사라졌습니다»     ⇒ 대목이 늘어도 그냥 나옵니다
//   맨 아래 「도움이 되는 자리…」 부록        ★없앴습니다 (목업에 없음)
//
//  🔴 [옛 화면이 새 대목을 «삼킨» 까닭]
//    catKeys = ohaeng·gwiin·ilju·spouse_a·spouse_b·couple_overall·child
//    ⇒ vessel·env·timeline 은 «키가 없어» 매핑에 실패하고,
//      「판정 카드를 다 채운 뒤 남은 것」으로 밀려 outro 에 뭉치거나 사라졌습니다.
//    ★그래서 키 매핑을 «통째로 버렸습니다». AI 가 쓴 차례를 그대로 씁니다.
//
//  ⚠️ 판정(coupleFilterV1)은 «건드리지 않았습니다» — 대표님 지시.
//     판정은 코드가 하고 AI 는 «풀기만» 합니다. 이 파일은 «그리기만» 합니다.
//  ⚠️ 별점은 15~21차에 껐습니다. 여기서도 그리지 않습니다.
//  ⚠️ 오행 그래프는 «살립니다» — 대표님 지시. 해당 대목 안에 넣습니다.

'use client'

import type { ReactNode } from 'react'

export interface ReportSection {
  /** ■ 뒤의 제목 그대로 */
  title: string
  /** 본문 (여러 문단) */
  body: string
  /** 제목 앞 아이콘 */
  icon: string
}

/** 제목에 어떤 낱말이 들어 있으면 이 대목 «안» 에 그래프를 넣는다 */
const GRAPH_IN = ['채워', '오행', '기운']

export default function CoupleReport({
  intro, sections, outro, graph, badge,
}: {
  /** 여는말 — 제목 없이 흐르는 글 */
  intro: string
  sections: ReportSection[]
  /** 맺음말 */
  outro: string
  /** 오행 비교 그래프 (대표님 지시로 «살립니다») */
  graph?: ReactNode
  /** 배지 — 명식 아래 한 마디 */
  badge?: string
}) {
  return (
    <div>
      {/* ── 배지 — 목업에서 명식 «바로 아래» 자리 ── */}
      {badge && (
        <div style={{ textAlign: 'center', margin: '4px 0 18px' }}>
          <span style={{
            display: 'inline-block', fontSize: 15, fontWeight: 700, color: '#8a5a2e',
            background: '#fff', border: '1px solid #e8d9c8', borderRadius: 12,
            padding: '10px 19px', boxShadow: '0 1px 3px rgba(0,0,0,.04)',
          }}>{badge}</span>
        </div>
      )}

      {/* ── 여는말 — ★제목 없이 흐릅니다 (목업) ── */}
      {intro.trim() && (
        <div style={{
          background: '#faf7f3', borderRadius: 12, padding: '15px 16px',
          marginBottom: 18, fontSize: 14, lineHeight: 1.85, color: '#3a2e28',
        }}>
          {para(intro)}
        </div>
      )}

      {/* ── 본문 — ★모두 «펼친 채» ── */}
      {sections.map((s, i) => {
        const withGraph = !!graph && GRAPH_IN.some(w => s.title.includes(w))
        return (
          <section key={`${s.title}-${i}`} style={{
            background: '#fff', border: '1px solid #DFD9D2', borderRadius: 14,
            marginBottom: 16, overflow: 'hidden',
          }}>
            <h2 style={{
              margin: 0, padding: '15px 17px 13px', fontSize: 15.5, fontWeight: 700,
              borderBottom: '1px solid #f0ebe6', display: 'flex', alignItems: 'center', gap: 9,
              color: '#2b2320', letterSpacing: '-.02em',
            }}>
              <span style={{
                flex: 'none', width: 23, height: 23, borderRadius: 7, background: '#f5ede4',
                color: '#96702e', fontSize: 12, fontWeight: 700,
                display: 'grid', placeItems: 'center',
              }}>{i + 1}</span>
              <span>{s.icon} {s.title}</span>
            </h2>
            <div style={{ padding: '15px 17px 17px' }}>
              {/* ★그래프는 «해당 대목 안» 에 (대표님 지시로 살립니다) */}
              {withGraph && <div style={{ marginBottom: 14 }}>{graph}</div>}
              {para(s.body)}
            </div>
          </section>
        )
      })}

      {/* ── 맺음말 ── */}
      {outro.trim() && (
        <div style={{
          background: 'linear-gradient(160deg,#fffdfa,#f9f4ee)',
          border: '1px solid #ece0d4', borderRadius: 14,
          padding: '20px 18px', marginTop: 20,
        }}>
          <h2 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700, color: '#2b2320' }}>
            맺음말
          </h2>
          {para(outro)}
        </div>
      )}
    </div>
  )
}

/**
 * 문단을 나눠 그립니다.
 * ★「→」로 시작하는 줄은 «솔루션» 이라 눈에 띄게 그립니다.
 *   설계 확정본 — "흉을 말한 대목 뒤에는 «반드시» 함께 사는 법 한 줄이 온다"
 *   ⇒ 그 줄이 본문에 묻히면 값이 사라집니다.
 */
function para(text: string): ReactNode {
  const blocks = text.split(/\n{2,}/).map(b => b.trim()).filter(Boolean)
  return blocks.map((b, i) => {
    const isSol = /^\s*(→|➔|➡)/.test(b)
    if (isSol) {
      return (
        <div key={i} style={{
          marginTop: 13, background: '#f6f9f6', borderLeft: '3px solid #3c9a6e',
          borderRadius: '0 9px 9px 0', padding: '11px 13px',
          fontSize: 13.5, lineHeight: 1.8, color: '#2f5c46',
        }}>{b.replace(/^\s*[→➔➡]\s*/, '→ ')}</div>
      )
    }
    return (
      <p key={i} style={{
        margin: i === 0 ? '0 0 11px' : '0 0 11px', fontSize: 14,
        lineHeight: 1.85, color: '#3a2e28',
      }}>{b}</p>
    )
  })
}
