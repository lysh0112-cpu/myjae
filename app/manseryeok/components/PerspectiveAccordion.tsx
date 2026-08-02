'use client'
// app/manseryeok/components/PerspectiveAccordion.tsx
// 작명 5관점 겸손 해설 — 아코디언 부품
//   一 음양오행 · 二 발음오행 · 三 수리오행 · 四 자원오행 · 五 사주와의 만남
// 각 관점 3단(무엇을 보나 / 이 이름은 / 어떤 의미인가). 맺음말은 항상 펼침.
// ★ 색·폰트는 diagnosis 화면과 동일(피치톤). 판정(좋음/아쉬움) 표시 없음.
//
// 데이터는 route.ts의 commentary(5관점 3단 통변)를 그대로 받는다.
// 이름/한글이름 등 상단·하단은 page.tsx가 담당. 이 부품은 "해설 블록"만.

import { useEffect, useState } from 'react'
import Stars from '@/app/components/common/StarRating'
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

// ★2026-08-01 (43부 30차) — 별점 그리기를 «공용 부품» 으로 내보냈습니다.
//   🔴 여기 있던 Stars 를 걷어냅니다 — 이 파일 «안» 에 숨어 있어
//      다른 화면이 쓰지 못했고, 결국 «별점 없는 화면» 이 생겼습니다.
//   ★app/components/common/StarRating.tsx 하나만 씁니다.
//   ⚠️ 옛 이름(Stars)으로 부르던 곳이 있어 그대로 다시 내보냅니다.
export { default as Stars } from '@/app/components/common/StarRating'

// ══════════════════════════════════════════════════════════════════
//  ★2026-08-02 — 차례를 «三 자원오행 · 四 수리오행» 으로 바꿉니다 (대표님 지시)
//
//   [까닭]  앞의 둘(음양·발음)은 «한글 소리와 획수» 이야기이고,
//     자원오행은 «한자에 담긴 기운», 수리 4격은 «획수가 그리는 운» 입니다.
//     자원 → 수리로 두면 「글자를 보고 → 그 획수가 그리는 마디를 보고 →
//     그것이 사주와 어떻게 만나는가」로 이야기가 한 줄로 이어집니다.
//
//  ⚠️⚠️ 번호(一二三四五)는 이 배열의 «자리» 로 붙습니다 (NUMERALS[i]).
//     그러니 여기 차례를 바꾸면 «번호도 함께» 따라옵니다 — 그것이 맞습니다.
//     다만 밖에서 이어 붙이는 것들(요약 카드·선명장 줄)은 «자리» 가 아니라
//     열쇠(yinyang·baleum…)로 잇거나, 여기와 «같은 차례» 로 적어야 합니다.
//     ★함께 고칠 곳 — NameAnalysisResultView 의 SUMMARY_KEYS,
//       diagnosis / newresult 가 선명장에 넘기는 lines. (교훈 [자리 말고 열쇠])
// ══════════════════════════════════════════════════════════════════
const HEADS: { key: keyof PerspectiveCommentary; title: string; sub: string }[] = [
  { key: 'yinyang', title: '음양오행', sub: '획수에 담긴 음과 양' },
  { key: 'baleum', title: '발음오행', sub: '부르는 소리의 기운' },
  { key: 'jawon', title: '자원오행', sub: '한자에 담긴 본래 기운' },
  { key: 'suri', title: '수리오행', sub: '획수가 그리는 네 마디' },
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
  focusKey,
  focusNonce,
  overallStar,
}: {
  commentary: PerspectiveCommentary
  /** ★선택값 — 옛 보관함 기록에는 없습니다. 없으면 별을 안 그립니다 */
  stars?: PerspectiveStar[] | null
  /**
   * ★밖에서 「이 관점을 펼쳐 달라」고 시키는 자리 (2026-08-01 · 43부 27차)
   *
   *  위 요약 카드의 줄을 누르면 그 관점이 «펼쳐지고» 그리로 «미끄러져» 갑니다.
   *  ⚠️ 값이 같으면 아무 일도 안 일어납니다 — 같은 줄을 두 번 눌러도 됩니다.
   *     그래서 «누를 때마다 달라지는» 값(nonce)을 함께 받습니다.
   */
  focusKey?: keyof PerspectiveCommentary | null
  focusNonce?: number
  overallStar?: StarResult | null
}) {
  /** key 로 별을 찾습니다. 순서에 기대지 않습니다 */
  const starOfKey = (k: string) => stars?.find((x) => x.key === k) ?? null
  // 기본: 모두 접힘. 첫 관점만 펼쳐 시작하고 싶으면 useState(new Set([0]))로.
  const [open, setOpen] = useState<Set<number>>(new Set())

  // ★요약 카드에서 「여기 보여 줘」 하면 펼치고 그리로 미끄러져 갑니다
  useEffect(() => {
    if (!focusKey) return
    const i = HEADS.findIndex((h) => h.key === focusKey)
    if (i === -1) return
    // ⚠️ 효과 «안에서 곧바로» 상태를 바꾸면 그리기가 겹칩니다(eslint).
    //    그리고 펼쳐지기 «전» 에 옮기면 엉뚱한 자리에 섭니다.
    //    ★한 박자 뒤에 «펼치고 옮깁니다» — 두 가지가 한 번에 풀립니다.
    const t = setTimeout(() => {
      setOpen((prev) => new Set(prev).add(i))
      requestAnimationFrame(() => {
        document.getElementById(`persp-${String(focusKey)}`)
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }, 0)
    return () => clearTimeout(t)
  }, [focusKey, focusNonce])
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
          /* ★닻(id) — 요약 카드에서 «이리로» 미끄러져 옵니다 (43부 27차)
             ⚠️ scroll-margin-top 을 두어 «머리글에 가려지지» 않게 합니다 */
          <div key={h.key} id={`persp-${String(h.key)}`}
            style={{
              background: cardBg, border, borderRadius: '16px', marginBottom: '12px',
              overflow: 'hidden', scrollMarginTop: '64px',
            }}>
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
              {/* ══════════════════════════════════════════════════
                  ★2026-08-01 (43부 27차) — 화살표를 «크게» (대표님 지시)

                   🔴 13px 이라 «누를 수 있는 줄» 인지 모르고 지나치셨습니다.
                   ★22px 로 키우고, 둘레에 «누르는 자리»(padding)를 둡니다.
                   ⚠️ 색도 진하게 — 옅으면 커도 눈에 안 들어옵니다.
                   ★펼치면 ▲ 로 «돌아갑니다» (0.25초) — 상태가 눈에 보이게.
                  ══════════════════════════════════════════════════ */}
              <span aria-hidden style={{
                fontSize: '22px', lineHeight: 1, color: isOpen ? '#8f3d0e' : gold,
                flexShrink: 0, padding: '6px 4px', marginRight: '-4px',
                transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform .25s cubic-bezier(.4,0,.2,1), color .2s',
                display: 'inline-block',
              }}>▾</span>
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
