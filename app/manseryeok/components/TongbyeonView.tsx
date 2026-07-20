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

interface Card { title: string; body: string; icon: string }

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

  for (const raw of lines) {
    const ln = raw
    if (isHeading(ln)) {
      if (cur) cards.push({ title: cleanLine(cur.title), body: cur.bodyLines.join('\n').trim(), icon: iconFor(cleanLine(cur.title)) })
      cur = { title: ln, bodyLines: [] }
    } else if (cur) {
      cur.bodyLines.push(ln)
    } else {
      const c = cleanLine(ln)
      if (c) intro += (intro ? '\n' : '') + c
    }
  }
  if (cur) cards.push({ title: cleanLine(cur.title), body: cur.bodyLines.join('\n').trim(), icon: iconFor(cleanLine(cur.title)) })

  return { intro, cards: cards.filter(c => c.title || c.body) }
}

export interface TongbyeonViewProps {
  input: TongbyeonInput
  questions: SajuQuestion[]
  premium?: boolean
  onBack?: () => void
  // 무슨 통변인지: 없으면 사주, 'daeun' 대운, 'seyun' 세운(월운 포함)
  unseEntry?: 'daeun' | 'seyun'
  // ── 보관함 다시보기용(선택) ──
  //   savedText가 있으면 AI를 호출하지 않고 그 통변을 그대로 표시한다.
  savedText?: string
  //   통변 스트리밍이 끝나면 완성 텍스트를 넘겨준다(부모가 저장에 쓴다).
  onComplete?: (text: string) => void
}

export default function TongbyeonView({ input, questions, premium, onBack, unseEntry, savedText, onComplete }: TongbyeonViewProps) {
  // 통변 섹션 제목: 대운/세운/사주에 맞춰. 이름이 '나'면 "나의 ~ 이야기".
  const kindWord = unseEntry === 'daeun' ? '대운' : unseEntry === 'seyun' ? '세운' : '사주'
  const storyTitle = input.name === '나'
    ? `나의 ${kindWord} 이야기`
    : `${withNim(input.name)}의 ${kindWord} 이야기`
  const prompt = useMemo(
    () => buildTongbyeonPrompt(input, questions, { premium }),
    [input, questions, premium]
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
          body: JSON.stringify({ systemPrompt: prompt, premium: !!premium }),
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
            <div key={i} style={{ background: C.card, border: `0.5px solid ${C.border}`, borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
              <div
                onClick={() => setOpenIdx(open ? -1 : i)}
                style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.titleWarm, lineHeight: 1.35 }}>{c.title}</span>
                <span style={{ color: C.point, fontSize: 12, transition: 'transform .25s', transform: `rotate(${open ? '180' : '0'}deg)` }}>{'\u25BE'}</span>
              </div>
              <div style={{ maxHeight: open ? '2000px' : '0', overflow: 'hidden', transition: 'max-height .3s ease' }}>
                <div style={{ fontSize: 13.5, lineHeight: 1.8, color: C.title, whiteSpace: 'pre-wrap', padding: '0 14px 14px' }}>{c.body}</div>
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
