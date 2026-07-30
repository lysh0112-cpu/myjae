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
// ★2026-07-30 (3단계-b) — 관점별 별점 (대표님 지시)
import { starGlyphs, type PerspectiveStar, type StarResult } from '@/lib/saju/starRating'

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

// ══════════════════════════════════════════════════════════════════
//  별점 표시 — ★2026-07-30 (3단계-b)
// ══════════════════════════════════════════════════════════════════
//
//  ⚠️ stars 는 «선택값» 입니다.
//     [왜]  보관함 다시보기는 옛 저장본을 불러옵니다. 그 기록에는 stars 가 없습니다.
//           필수로 두면 예전에 풀이받으신 손님의 화면이 깨집니다.
//           없으면 별을 «안 그립니다». 글은 그대로 나옵니다.
//
//  ⚠️ 별 «점수» 는 화면에 쓰지 않습니다. 별과 말만 씁니다.
//     StarResult.score 는 진단용입니다. (대표님 방침)

/** 어조별 색 — 낮은 칸도 «경고색» 을 쓰지 않습니다. 흐리게만 합니다 */
const STAR_TONE: Record<StarResult['tone'], string> = {
  high: '#c8783c',   // 진한 금
  good: '#c8783c',
  mid: '#c79a72',    // 옅은 금
  watch: '#b09a8a',  // 회갈 — ★붉은 경고색을 쓰지 않습니다
}

function Stars({ s, size = 13 }: { s: PerspectiveStar | StarResult; size?: number }) {
  const g = starGlyphs(s.star)
  const c = STAR_TONE[s.tone]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
      <span aria-hidden style={{ fontSize: `${size}px`, letterSpacing: '1px', lineHeight: 1 }}>
        {Array.from({ length: g.full }).map((_, i) => (
          <span key={`f${i}`} style={{ color: c }}>★</span>
        ))}
        {g.half === 1 && <span style={{ color: c, opacity: 0.45 }}>★</span>}
        {Array.from({ length: g.empty }).map((_, i) => (
          <span key={`e${i}`} style={{ color: c, opacity: 0.16 }}>★</span>
        ))}
      </span>
      <span style={{ fontSize: `${size - 2}px`, color: c, fontWeight: 600 }}>
        {s.star.toFixed(1)}
      </span>
      <span className="sr-only">{`5점 만점에 ${s.star.toFixed(1)}점, ${s.label}`}</span>
    </span>
  )
}

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

export default function PerspectiveAccordion({
  commentary,
  stars,
  overallStar,
}: {
  commentary: PerspectiveCommentary
  /** ★선택값 — 옛 보관함 기록에는 없습니다. 없으면 별을 안 그립니다 */
  stars?: PerspectiveStar[] | null
  overallStar?: StarResult | null
}) {
  /** key 로 별을 찾습니다. 순서에 기대지 않습니다 */
  const starOfKey = (k: string) => stars?.find((x) => x.key === k) ?? null
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
          {overallStar && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
              marginTop: '14px', paddingTop: '12px', borderTop: border,
            }}>
              <span style={{ fontSize: '11px', color: sub }}>다섯 관점을 아울러</span>
              <Stars s={overallStar} size={15} />
              <span style={{ fontSize: '12px', color: sub }}>{overallStar.label}</span>
            </div>
          )}
        </div>
      )}

      {/* 5관점 아코디언 */}
      {HEADS.map((h, i) => {
        const p = commentary[h.key] as Perspective
        const isOpen = open.has(i)
        const star = starOfKey(h.key as string)
        return (
          <div key={h.key} style={{ background: cardBg, border, borderRadius: '16px', marginBottom: '12px', overflow: 'hidden' }}>
            <div
              onClick={() => toggle(i)}
              role="button"
              aria-expanded={isOpen}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', padding: '16px 18px', cursor: 'pointer' }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '15px', fontWeight: 'bold', color: gold }}>{NUMERALS[i]}.</span>
                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: ink }}>{h.title}</span>
                  <span style={{ fontSize: '12px', color: sub }}>{h.sub}</span>
                </div>
                {/* ★별점은 제목 «아래 줄» 에 둡니다.
                    같은 줄에 넣으면 430px 화면에서 «자원오행 한자에 담긴 본래 기운 ★★★★★ 4.5» 가
                    줄바꿈되며 지저분해집니다. */}
                {star && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <Stars s={star} />
                    <span style={{ fontSize: '11px', color: sub }}>{star.label}</span>
                  </div>
                )}
              </div>
              <span style={{ fontSize: '13px', color: gold, flexShrink: 0, transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s' }}>▼</span>
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
        {stars && stars.length > 0 && (
          <>
            별점은 이름의 좋고 나쁨을 가르는 점수가 아니라, 다섯 관점 가운데 어느 쪽을 더 살펴보면 좋을지 가리키는 눈금입니다.
            <br />
          </>
        )}
        성명학은 학파에 따라 발음오행·수리·용신을 달리 보는 여러 견해가 있습니다. 이 풀이는 그 가운데 한 관점으로 이름의 결을 살핀 것으로, 참고 삼아 헤아리시길 바랍니다.
      </div>
    </>
  )
}
