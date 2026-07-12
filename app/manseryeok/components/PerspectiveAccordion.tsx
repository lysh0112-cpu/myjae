'use client'
// app/manseryeok/components/PerspectiveAccordion.tsx
// 작명 5관점 겸손 해설 — 아코디언 부품
//   一 음양오행 · 二 발음오행 · 三 수리오행 · 四 자원오행 · 五 사주와의 만남
// 각 관점 3단(무엇을 보나 / 이 이름은 / 어떤 의미인가). 맺음말은 항상 펼침.
// ★ 색·폰트는 diagnosis 화면과 동일(피치톤). 판정(좋음/아쉬움) 표시 없음.
//
// 데이터는 route.ts의 commentary(5관점 3단 통변)를 그대로 받는다.
// 이름/한글이름 등 상단·하단은 page.tsx가 담당. 이 부품은 "해설 블록"만.

import { useState } from 'react'

// diagnosis/page.tsx와 동일 팔레트
const cardBg = '#fffbf7'
const gold = '#c8783c'
const ink = '#1a1a1a'
const sub = '#b4785a'
const border = '0.5px solid #f0e0d5'
const accent = '#e6be9f' // 3단 좌측 라인

export interface Perspective {
  intro: string    // 무엇을 보나
  name: string     // 이 이름은
  meaning: string  // 어떤 의미인가
}
export interface PerspectiveCommentary {
  title: string
  yinyang: Perspective
  baleum: Perspective
  suri: Perspective
  jawon: Perspective
  yongsin: Perspective
  conclusion: string
}

const NUMERALS = ['一', '二', '三', '四', '五']

const HEADS: { key: keyof PerspectiveCommentary; title: string; sub: string }[] = [
  { key: 'yinyang', title: '음양오행', sub: '획수에 담긴 음과 양' },
  { key: 'baleum', title: '발음오행', sub: '부르는 소리의 기운' },
  { key: 'suri', title: '수리오행', sub: '획수가 그리는 네 마디' },
  { key: 'jawon', title: '자원오행', sub: '한자에 담긴 본래 기운' },
  { key: 'yongsin', title: '사주와의 만남', sub: '이름이 사주를 돕는가' },
]

function Triple({ label, text }: { label: string; text: string }) {
  if (!text) return null
  return (
    <div style={{ borderLeft: `3px solid ${accent}`, borderRadius: 0, padding: '2px 12px', marginBottom: '12px' }}>
      <div style={{ fontSize: '11px', color: gold, marginBottom: '3px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: ink, lineHeight: 1.85 }}>{text}</div>
    </div>
  )
}

export default function PerspectiveAccordion({ commentary }: { commentary: PerspectiveCommentary }) {
  // 기본: 모두 접힘. 첫 관점만 펼쳐 시작하고 싶으면 useState(new Set([0]))로.
  const [open, setOpen] = useState<Set<number>>(new Set())
  const toggle = (i: number) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })

  return (
    <>
      {/* 제목 카드 */}
      {commentary.title && (
        <div style={{ background: cardBg, border, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: gold, marginBottom: '6px', lineHeight: 1.5 }}>
            &ldquo;{commentary.title}&rdquo;
          </div>
          <div style={{ fontSize: '12px', color: sub, lineHeight: 1.7 }}>
            성명학이 이름을 살피는 다섯 갈래의 관점으로, 이 이름의 결을 하나씩 헤아려 보았습니다. 각 관점을 눌러 펼쳐 보세요.
          </div>
        </div>
      )}

      {/* 5관점 아코디언 */}
      {HEADS.map((h, i) => {
        const p = commentary[h.key] as Perspective
        const isOpen = open.has(i)
        return (
          <div key={h.key} style={{ background: cardBg, border, borderRadius: '16px', marginBottom: '12px', overflow: 'hidden' }}>
            <div
              onClick={() => toggle(i)}
              role="button"
              aria-expanded={isOpen}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '15px', fontWeight: 'bold', color: gold }}>{NUMERALS[i]}.</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: ink }}>{h.title}</span>
                <span style={{ fontSize: '12px', color: sub }}>{h.sub}</span>
              </div>
              <span style={{ fontSize: '13px', color: gold, transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>▼</span>
            </div>
            {isOpen && (
              <div style={{ padding: '0 18px 18px' }}>
                <Triple label="무엇을 보나" text={p?.intro} />
                <Triple label="이 이름은" text={p?.name} />
                <Triple label="어떤 의미인가" text={p?.meaning} />
              </div>
            )}
          </div>
        )
      })}

      {/* 맺음말 — 항상 펼침 */}
      {commentary.conclusion && (
        <div style={{ background: 'rgba(200,120,60,0.07)', border: `1px solid ${gold}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: sub, marginBottom: '8px', textAlign: 'center' }}>맺음</div>
          <div style={{ fontSize: '13px', color: ink, lineHeight: 1.9, textAlign: 'center' }}>
            {commentary.conclusion}
          </div>
        </div>
      )}

      {/* 하단 고지 (판정 아님을 명시) */}
      <div style={{ fontSize: '11px', color: sub, lineHeight: 1.7, textAlign: 'center', padding: '0 8px', marginBottom: '20px', fontStyle: 'italic' }}>
        성명학은 학파에 따라 발음오행·수리·용신을 달리 보는 여러 견해가 있습니다. 이 풀이는 그 가운데 한 관점으로 이름의 결을 살핀 것으로, 참고 삼아 헤아리시길 바랍니다.
      </div>
    </>
  )
}
