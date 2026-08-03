// app/manseryeok/components/TongbyeonView.tsx
// ============================================================================
// AI 통변 결과 화면 (개선판)
// ----------------------------------------------------------------------------
// 선택한 질문 + 사주 데이터로 프롬프트를 조립하고, /api/tongbyeon 을 스트리밍
// 호출해 통변을 실시간으로 카드에 표시한다.
//
// 개선점:
//   - 카드 아코디언: 제목 누르면 펼침(첫 카드만 기본 펼침) — 사주아이 방식
//   - 제목: 굵은 글씨 + 주제별 개성 아이콘
//   - 마크다운 기호(#, ##, ---, **) 제거해서 깔끔하게 파싱
//   - 여백 촘촘하게
//
// props: input, questions, premium?, onBack?
// ============================================================================

'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { splitCardText } from '@/lib/saju/premium/splitCardText'
import { buildTongbyeonPrompt, type TongbyeonInput } from '@/lib/saju/tongbyeonPrompt'
import type { SajuQuestion } from '@/lib/saju/questions'
import { withNim } from '@/lib/saju/honorific'

const C = {
  cardBg: '#FFFBF7',
  card: '#fff',
  border: '#f0e0d5',
  divider: '#f5e5da',
  point: '#c8783c',
  brown: '#b46e46',
  title: '#3a2e28',
  titleWarm: '#96502e',
  sub: '#b4785a',
  subLight: '#c5a590',
}

/**
 * ★2026-07-29 — 카드에 «요약 한 줄 · 태그 · 실천» 자리를 두었습니다. (대표님 지시)
 *
 *   [무엇이 문제였나] 사주풀이 카드는 본문이 통짜 글(pre-wrap) 하나뿐이었습니다.
 *     진로적성 카드는 제목 옆에 태그가 있고 결론이 앞에 나와 눈에 잘 들어오는데,
 *     사주풀이는 어디가 핵심인지 스스로 찾아 읽어야 했습니다.
 *   [어떻게] AI 가 [한줄]·[태그]·[실천] 을 붙여 쓰게 하고, 여기서 갈라 그립니다.
 *   ⚠️ 없으면 예전처럼 통짜로 그립니다. 옛 통변(보관함)도 안 깨집니다.
 */
interface Card {
  title: string
  body: string
  icon: string
  /** 핵심 요약 한 줄 — 카드 맨 위에 굵게 */
  summary?: string
  /** 키워드 태그 — 제목 아래 알약으로 */
  tags?: string[]
  /** 실천 — 강조 상자로 따로 뺀다 */
  action?: string
}

// 카드 제목 키워드 → 개성 아이콘
function iconFor(title: string): string {
  const t = title
  if (t.includes('타고난') || t.includes('당신') || t.includes('본바탕')) return '\u2728'
  if (t.includes('성격') || t.includes('마음') || t.includes('내면')) return '\uD83C\uDF19'
  if (t.includes('강점') || t.includes('재능') || t.includes('잠재')) return '\uD83D\uDC8E'
  if (t.includes('직업') || t.includes('진로') || t.includes('일') || t.includes('적성')) return '\uD83D\uDCBC'
  if (t.includes('연애') || t.includes('결혼') || t.includes('인연') || t.includes('사랑')) return '\uD83D\uDC97'
  if (t.includes('관계') || t.includes('사람') || t.includes('인간')) return '\uD83E\uDD1D'
  if (t.includes('재물') || t.includes('돈') || t.includes('금전') || t.includes('재테크')) return '\uD83D\uDCB0'
  if (t.includes('건강') || t.includes('몸')) return '\uD83C\uDF3F'
  if (t.includes('자녀') || t.includes('아이') || t.includes('출산') || t.includes('임신')) return '\uD83D\uDC76'
  if (t.includes('부모') || t.includes('가족')) return '\uD83C\uDFE1'
  if (t.includes('노후') || t.includes('노년')) return '\uD83C\uDF75'
  if (t.includes('개운') || t.includes('살리는')) return '\uD83D\uDD2E'
  // ── 대운·세운·월운(시간운) 제목 ──
  if (t.includes('인생') || t.includes('흐름') || t.includes('황금기') || t.includes('대운')) return '\uD83C\uDF1F' // 🌟 인생 흐름
  if (t.includes('전환') || t.includes('교운') || t.includes('변화')) return '\uD83D\uDD04' // 🔄 전환기
  if (t.includes('시기') || t.includes('타이밍') || t.includes('달') || t.includes('때')) return '\uD83D\uDCC5' // 📅 타이밍
  if (t.includes('주의') || t.includes('조심') || t.includes('삼재') || t.includes('충')) return '\u26A0\uFE0F' // ⚠️ 주의
  if (t.includes('학업') || t.includes('시험') || t.includes('합격')) return '\uD83D\uDCDA' // 📚 학업
  if (t.includes('종합') || t.includes('총운') || t.includes('올해')) return '\uD83C\uDF3F' // 🌿 종합
  return '\uD83C\uDF1F' // 기본: 🌟 (로딩 회전 아이콘 ✦ 와 겹치지 않도록)
}

// 마크다운 기호 제거 (한 줄 정리)
function cleanLine(s: string): string {
  return s
    .replace(/^#{1,6}\s*/, '')
    .replace(/^\s*[-*]{3,}\s*$/, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^\u25A0\s*/, '')
    .trim()
}

// 통변 텍스트를 카드 배열로 파싱
function parseCards(text: string): { intro: string; cards: Card[] } {
  const lines = text.split('\n')
  let intro = ''
  const cards: Card[] = []
  let cur: { title: string; bodyLines: string[] } | null = null

  const isHeading = (ln: string) => /^\s*(#{1,6}\s*)?\u25A0/.test(ln) || /^\s*#{2,6}\s+/.test(ln)

  // ★2026-08-03 (44부 30차) — 파서를 lib/saju/premium/splitCardText.ts 로 «옮겼습니다».
  //   ⚠️ 같은 코드가 합격운에도 복사되어 있었고, ★진로적성에는 «없었습니다».
  //      고칠 곳은 그 «한 곳» 입니다. 여기서 다시 적지 마십시오.
  const split = splitCardText

  for (const raw of lines) {
    const ln = raw
    if (isHeading(ln)) {
      if (cur) { const t = cleanLine(cur.title); cards.push({ title: t, icon: iconFor(t), ...split(cur.bodyLines.join('\n')) }) }
      cur = { title: ln, bodyLines: [] }
    } else if (cur) {
      cur.bodyLines.push(ln)
    } else {
      const c = cleanLine(ln)
      if (c) intro += (intro ? '\n' : '') + c
    }
  }
  if (cur) { const t = cleanLine(cur.title); cards.push({ title: t, icon: iconFor(t), ...split(cur.bodyLines.join('\n')) }) }

  return { intro, cards: cards.filter(c => c.title || c.body) }
}

export interface TongbyeonViewProps {
  input: TongbyeonInput
  questions: SajuQuestion[]
  premium?: boolean
  /**
   * ★2026-07-29 — 프리미엄 리포트 프롬프트 (lib/saju/premium).
   *   있으면 이걸 쓰고, 없으면 예전 buildTongbyeonPrompt 로 갑니다.
   */
  premiumPrompt?: { system: string; user: string } | null
  /**
   * ★2026-07-29 — 섹션마다 그 자리에 얹을 도표. (대표님 지시 — 샌드위치 렌더링)
   *
   *   [무엇이 문제였나] 도표가 전부 화면 위쪽에 몰려 있고 풀이는 전부 아래에 있어,
   *     손님이 «이 설명이 어느 표 이야기인지» 를 스스로 이어 붙여야 했습니다.
   *   [어떻게] 풀이 카드를 그리기 «직전»에 그 카드의 도표를 그립니다.
   *
   *   ★2026-07-29 (2차) — «자리(index)»가 아니라 «제목»으로 찾습니다.
   *     [왜 바꿨나] 전에는 slots[i] 였습니다. AI 가 카드를 하나만 덜 쓰거나
   *       차례를 바꾸면 그 뒤 도표가 **통째로 한 칸씩 밀립니다.**
   *       실제로 「합충 반영 오행」 표가 엉뚱한 풀이 위에 붙는 일이 있었습니다.
   *       AI 출력은 우리가 통제할 수 없으니 자리로 맞추면 안 됩니다.
   *     [어떻게] 카드 제목에 match 낱말이 하나라도 들어 있으면 그 도표를 얹습니다.
   *     ⚠️ 못 찾으면 그냥 안 그립니다. 엉뚱한 자리에 붙는 것보다 낫습니다.
   */
  slots?: Array<{ match: string[]; node: React.ReactNode } | null>
  onBack?: () => void
  // 무슨 통변인지: 없으면 사주, 'daeun' 대운, 'seyun' 세운(월운 포함)
  unseEntry?: 'daeun' | 'seyun'
  // ── 보관함 다시보기용(선택) ──
  //   savedText가 있으면 AI를 호출하지 않고 그 통변을 그대로 표시한다.
  savedText?: string
  //   통변 스트리밍이 끝나면 완성 텍스트를 넘겨준다(부모가 저장에 쓴다).
  onComplete?: (text: string) => void
}

export default function TongbyeonView({ input, questions, premium, premiumPrompt, slots, onBack, unseEntry, savedText, onComplete }: TongbyeonViewProps) {
  // 통변 섹션 제목: 대운/세운/사주에 맞춰. 이름이 '나'면 "나의 ~ 이야기".
  const kindWord = unseEntry === 'daeun' ? '대운' : unseEntry === 'seyun' ? '세운' : '사주'
  const storyTitle = input.name === '나'
    ? `나의 ${kindWord} 이야기`
    : `${withNim(input.name)}의 ${kindWord} 이야기`
  // ★2026-07-29 — 프리미엄 프롬프트를 밖에서 받으면 그걸 씁니다.
  //   [왜 밖에서 받나] 프리미엄은 원국·격국·대운·세운 원자료가 다 필요한데
  //     이 부품은 이미 조립된 input 만 갖고 있습니다.
  //     원자료를 쥔 화면(result-new)이 만들어 넘기는 것이 맞습니다. (교훈 BQ)
  const prompt = useMemo(
    () => premiumPrompt?.system ?? buildTongbyeonPrompt(input, questions, { premium }),
    [input, questions, premium, premiumPrompt]
  )
  const [text, setText] = useState(savedText || '')
  const [loading, setLoading] = useState(!savedText)   // 저장본이면 로딩 없이 바로 표시
  const [err, setErr] = useState('')
  const [openIdx, setOpenIdx] = useState<number>(0)
  const startedRef = useRef(false)

  useEffect(() => {
    if (startedRef.current) return
    // 보관함 다시보기: 저장된 통변이 있으면 AI를 호출하지 않고 그대로 쓴다.
    if (savedText) { startedRef.current = true; setText(savedText); setLoading(false); return }
    startedRef.current = true
    let cancelled = false

    async function run() {
      setLoading(true); setErr(''); setText('')
      let acc = ''   // finally에서 onComplete로 넘기려고 try 밖에 둔다.
      try {
        const res = await fetch('/api/tongbyeon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemPrompt: prompt,
            userPrompt: premiumPrompt?.user,
            premium: !!premium,
          }),
        })
        if (!res.ok || !res.body) { setErr('통변을 불러오지 못했어요.'); setLoading(false); return }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          const chunk = decoder.decode(value)
          for (const line of chunk.split('\n')) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6)
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.text) { acc += parsed.text; if (!cancelled) setText(acc) }
            } catch {}
          }
        }
      } catch {
        if (!cancelled) setErr('통변을 불러오는 중 문제가 생겼어요.')
      } finally {
        if (!cancelled) {
          setLoading(false)
          // 완성된 통변을 부모에 전달 (저장용). acc는 스트리밍으로 쌓인 전체 텍스트.
          if (acc && onComplete) onComplete(acc)
        }
      }
    }
    run()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prompt, premium])

  const { intro, cards } = useMemo(() => parseCards(text), [text])

  const effectiveOpen = loading && cards.length > 0 ? cards.length - 1 : openIdx

  return (
    <div style={{ background: C.cardBg, borderRadius: 18, border: `0.5px solid ${C.border}`, overflow: 'hidden' }}>
      <div style={{ padding: '13px 16px', borderBottom: `0.5px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        {onBack && <button type="button" onClick={onBack} style={{ color: C.subLight, fontSize: 18, cursor: 'pointer', background: 'none', border: 'none', padding: 0, fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>{'\u2039'}</button>}
        <div style={{ flex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.title }}>{storyTitle}</div>
          <div style={{ fontSize: 10, color: C.point, marginTop: 1 }}>각 제목을 누르면 해설이 펼쳐져요</div>
        </div>
        {onBack && <span style={{ width: 16 }} />}
      </div>

      <div style={{ padding: '12px 14px 16px' }}>
        {intro && (
          <div style={{ fontSize: 13.5, lineHeight: 1.8, color: C.title, whiteSpace: 'pre-wrap', marginBottom: 12, padding: '0 2px' }}>{intro}</div>
        )}

        {cards.map((c, i) => {
          const open = effectiveOpen === i
          return (
            <div key={i}>
            {/* ★그 카드의 도표를 풀이 «바로 위»에 얹는다 — 제목으로 찾는다 */}
            {(() => {
              const hit = slots?.find(s2 =>
                s2 && s2.match.some(w => c.title.replace(/\s/g, '').includes(w.replace(/\s/g, ''))))
              return hit ? <div style={{ marginBottom: 8 }}>{hit.node}</div> : null
            })()}
            <div style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
              <div
                onClick={() => setOpenIdx(open ? -1 : i)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: C.titleWarm, lineHeight: 1.35 }}>{c.title}</span>
                  {/* ★핵심 요약 한 줄 — 접혀 있어도 보입니다. 스크롤하며 훑어 읽으라고 둔 것입니다. */}
                  {c.summary && (
                    <span style={{ display: 'block', fontSize: 12, color: C.point, lineHeight: 1.5, marginTop: 3 }}>
                      {c.summary}
                    </span>
                  )}
                </span>
                <span style={{ color: C.point, fontSize: 12, transition: 'transform .25s', transform: `rotate(${open ? '180' : '0'}deg)` }}>{'\u25BE'}</span>
              </div>

              {/* ★키워드 태그 — 접혀 있어도 보입니다 */}
              {c.tags && c.tags.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, padding: '0 14px 11px' }}>
                  {c.tags.map((t, ti) => (
                    <span key={ti} style={{
                      fontSize: 10.5, color: '#5a4a86', background: '#f2eefa',
                      border: '1px solid #e2d9f2', padding: '3px 9px', borderRadius: 20, fontWeight: 600,
                    }}>{t}</span>
                  ))}
                </div>
              )}

              <div style={{ maxHeight: open ? '4000px' : '0', overflow: 'hidden', transition: 'max-height .3s ease' }}>
                <div style={{ padding: '0 14px 14px' }}>
                  {/* ★단락으로 나눠 그립니다. 통짜 pre-wrap 이면 눈이 쉴 곳이 없습니다. */}
                  {c.body.split(/\n\s*\n/).filter(t => t.trim()).map((para, pi) => (
                    <p key={pi} style={{
                      fontSize: 13.5, lineHeight: 1.85, color: C.title,
                      whiteSpace: 'pre-wrap', margin: pi === 0 ? '0 0 11px' : '0 0 11px',
                    }}>{para.trim()}</p>
                  ))}

                  {/* ★실천 — 강조 상자로 따로 뺍니다 */}
                  {c.action && (
                    <div style={{
                      marginTop: 4, padding: '12px 13px', borderRadius: 12,
                      background: '#fdf6ee', border: '1px solid rgba(200,120,60,0.28)',
                      display: 'flex', gap: 9, alignItems: 'flex-start',
                    }}>
                      <span style={{ fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>✅</span>
                      <span style={{ fontSize: 12.5, lineHeight: 1.75, color: '#6b4a2e' }}>{c.action}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            </div>
          )
        })}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px', color: C.sub, fontSize: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.brown, animation: 'tbpulse 1s infinite' }} />
            정성껏 풀이하고 있어요…
          </div>
        )}

        {err && (
          <div style={{ padding: '14px', textAlign: 'center', color: '#c05a5a', fontSize: 13 }}>{err}</div>
        )}
      </div>

      <style>{`@keyframes tbpulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
    </div>
  )
}
