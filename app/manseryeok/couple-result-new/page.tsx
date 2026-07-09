'use client'

/**
 * 궁합 결과 (새 버전 · 껍데기 + 질문단계)
 * ─────────────────────────────────────────────
 * 흐름: 두 사람 선택(couple-input-new) → [이 화면] 질문 선택 → 결과(명식+등급+해설)
 *   · submitted === null  → 질문 선택 단계 (coupleQuestions 11개, 복수선택)
 *   · submitted = 질문id[] → 결과 단계 (명식 나란히 + 등급 + 통변)
 *   · submitted = []       → "전체 궁합 총평"(질문 안 고르고 전체)
 *
 * 질문 UI: 사주 QuestionPicker와 "같은 모양"(전체선택·복수선택·모두담기·체크박스)
 *   이되, 공용 QuestionPicker 부품은 건드리지 않고 이 페이지가 직접 렌더한다.
 *   (대규모 안정: 공용부품 회귀 위험 없음 — 내사주그림과 같은 원칙)
 *
 * 점수 표기: C안 — 숫자 숨기고 "등급"만 노출(상처 방지 + 공유 훅).
 *   [TODO] 실제 등급은 calcCoupleScore(...).grade 로 교체(지금은 가짜 고정).
 *   [TODO] 폭죽 연출 등급별 강도 차등(다음 단계).
 *
 * 계산/통변/저장은 [TODO] 자리로 표시. 지금은 화면 흐름만 확정.
 */

import { Suspense, useMemo, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import CoupleWonguk from '@/app/manseryeok/couple-result/components/CoupleWonguk'
import GradeFireworks from '@/app/manseryeok/couple-result/components/GradeFireworks'
import { COUPLE_QUESTIONS, groupCoupleByCategory } from '@/lib/saju/coupleQuestions'
import type { SajuQuestion } from '@/lib/saju/questions'
import { calcCoupleScore, type SajuPillarSimple, type CoupleScoreResult } from '@/lib/saju/coupleScore'
import { getGongmang } from '@/lib/saju/gongmang'
import { calcHourPillar } from '@/lib/saju/hourPillar'
import { buildCoupleTongbyeonPrompt, type CouplePerson } from '@/lib/saju/coupleTongbyeonPrompt'

type Mode = 'couple' | 'married'

const MODE_INFO: Record<Mode, { label: string; accent: string }> = {
  couple:  { label: '연인 궁합', accent: '#c85a8c' },
  married: { label: '부부 궁합', accent: '#c85a6e' },
}

// 대분류별 포인트색 (질문 화면 구분감)
const CAT_COLOR: Record<string, string> = {
  '끌림·첫인상': '#c85a8c',
  '성격·기질': '#9a6ec8',
  '소통·감정': '#3c82a0',
  '관계 지속성': '#3c9a6e',
  '갈등·주의점': '#c8783c',
  '속궁합·친밀감': '#c85a6e',
  '결혼·미래운': '#b46e46',
  '관계 조언·개운': '#6e50a0',
  '종합': '#96502e',
}
const catColor = (c: string) => CAT_COLOR[c] ?? '#b46e46'


function CoupleResultInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') === 'married' ? 'married' : 'couple') as Mode
  const info = MODE_INFO[mode]

  const parse = (key: string): Record<string, string> => {
    try { return JSON.parse(decodeURIComponent(searchParams.get(key) || '{}')) } catch { return {} }
  }
  const person1 = parse('person1')
  const person2 = parse('person2')

  const name1 = person1.name || '첫 번째'
  const name2 = person2.name || '두 번째'

  // ── 질문 선택 단계 상태 (사주 QuestionPicker와 동일: 복수선택) ──
  //   submitted === null → 질문 선택 화면
  //   submitted = 질문 배열(빈 배열이면 전체 총평) → 결과 화면
  const groups = useMemo(() => groupCoupleByCategory(COUPLE_QUESTIONS), [])
  const allIds = useMemo(() => COUPLE_QUESTIONS.map(q => q.id), [])

  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [openCats, setOpenCats] = useState<Set<string>>(
    () => new Set(groups.length ? [groups[0].category] : [])
  )
  const [submitted, setSubmitted] = useState<string[] | null>(null)

  const toggleQ = (id: string) => setPicked(prev => {
    const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n
  })
  const toggleCat = (cat: string) => setOpenCats(prev => {
    const n = new Set(prev); if (n.has(cat)) n.delete(cat); else n.add(cat); return n
  })
  const toggleCatAll = (cat: string, items: typeof COUPLE_QUESTIONS) => {
    const ids = items.map(i => i.id)
    const allOn = ids.every(id => picked.has(id))
    setPicked(prev => {
      const n = new Set(prev)
      if (allOn) ids.forEach(id => n.delete(id)); else ids.forEach(id => n.add(id))
      return n
    })
    setOpenCats(prev => new Set(prev).add(cat))
  }
  const selectAll = () => { setPicked(new Set(allIds)); setOpenCats(new Set(groups.map(g => g.category))) }
  const clearAll = () => setPicked(new Set())

  // ────────────────────────────────────────────
  // 질문 선택 단계 (사주 화면과 동일한 모양: 전체선택·복수·모두담기)
  // ────────────────────────────────────────────
  if (submitted === null) {
    const nPicked = picked.size
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
        <div style={{
          position: 'sticky', top: 0, zIndex: 5,
          background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
          borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <button onClick={() => router.back()}
            style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>무엇이 궁금하세요?</div>
            <div style={{ fontSize: 10.5, color: '#c8783c', marginTop: 1 }}>{name1} ♥ {name2} · 궁금한 걸 마음껏 골라보세요</div>
          </div>
          <span style={{ width: 16 }} />
        </div>

        {/* 전체 선택/해제 */}
        <div style={{ padding: '10px 14px', display: 'flex', gap: 8, borderBottom: '0.5px solid #f5e5da' }}>
          <button onClick={selectAll} style={{ flex: 1, height: 34, background: '#fff3e9', border: '0.5px solid #e0c0a8', borderRadius: 9, color: '#96502e', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>✓ 전체 선택</button>
          <button onClick={clearAll} style={{ flex: 1, height: 34, background: '#fff', border: '0.5px solid #e8d5c5', borderRadius: 9, color: '#b4785a', fontSize: 12, cursor: 'pointer' }}>전체 해제</button>
        </div>

        {/* 대분류 목록 */}
        <div style={{ padding: '12px 14px 0' }}>
          {groups.map(({ category, items }) => {
            const col = catColor(category)
            const gPicked = items.filter(q => picked.has(q.id)).length
            const allOn = gPicked === items.length
            const open = openCats.has(category)
            return (
              <div key={category} style={{ marginBottom: 10, border: `0.5px solid ${gPicked > 0 ? col + '55' : '#f0e0d5'}`, borderRadius: 12, overflow: 'hidden' }}>
                <div onClick={() => toggleCat(category)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 12px', background: gPicked > 0 ? col + '14' : '#fff', cursor: 'pointer' }}>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: col }}>{category}</span>
                  {gPicked > 0 && <span style={{ fontSize: 10, color: '#fff', background: col, borderRadius: 9, padding: '2px 7px' }}>{gPicked}</span>}
                  <span onClick={(e) => { e.stopPropagation(); toggleCatAll(category, items) }} style={{ fontSize: 10, color: col, border: `0.5px solid ${col}88`, borderRadius: 8, padding: '3px 8px', background: '#fff' }}>{allOn ? '모두 해제' : '모두 담기'}</span>
                  <span style={{ color: col, fontSize: 12 }}>{open ? '▾' : '▸'}</span>
                </div>
                {open && (
                  <div style={{ padding: '8px 10px' }}>
                    {items.map(q => {
                      const on = picked.has(q.id)
                      return (
                        <div key={q.id} onClick={() => toggleQ(q.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 8px', borderRadius: 8, background: on ? col + '14' : 'transparent', marginBottom: 3, cursor: 'pointer' }}>
                          <span style={{ width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${on ? col : '#d8c4b4'}`, background: on ? col : '#fff', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                          <span style={{ fontSize: 12.5, color: '#3a2e28' }}>{q.question}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* 하단 버튼: 고른 질문으로 / 전체 총평 */}
        <div style={{ padding: '4px 14px 0' }}>
          <button onClick={() => setSubmitted([...picked])} disabled={nPicked === 0}
            style={{ width: '100%', height: 46, background: nPicked > 0 ? '#b46e46' : '#d8c4b4', border: 'none', borderRadius: 12, color: '#fff', fontSize: 14, fontWeight: 700, cursor: nPicked > 0 ? 'pointer' : 'not-allowed' }}>
            {nPicked > 0 ? `${nPicked}개 질문으로 궁합 풀이 받기` : '궁금한 것을 골라주세요'}
          </button>
          <button onClick={() => setSubmitted([])}
            style={{ width: '100%', height: 42, background: 'transparent', border: '0.5px solid #d8c4b4', borderRadius: 12, color: '#96502e', fontSize: 13, cursor: 'pointer', marginTop: 8 }}>
            그냥 전체 궁합 총평 볼래요
          </button>
        </div>
      </main>
    )
  }

  // ────────────────────────────────────────────
  // 결과 단계 → 자식 컴포넌트에 위임 (명식 계산·등급·통변 훅 사용)
  // ────────────────────────────────────────────
  const pickedQuestions = COUPLE_QUESTIONS.filter(q => submitted.includes(q.id))

  return (
    <CoupleResultView
      mode={mode}
      info={info}
      person1={person1}
      person2={person2}
      name1={name1}
      name2={name2}
      pickedQuestions={pickedQuestions}
      onBack={() => setSubmitted(null)}
      onOther={() => router.push(`/manseryeok/couple-input-new?mode=${mode}`)}
    />
  )
}

// 이름이 비었을 때 카피가 어색해지지 않게 방어
function dummyHeadlineSafe(s: string): string {
  return s.replace('undefined', '').replace('님과 님', '두 사람')
}

// ── 통변 텍스트 → 카드 아코디언 파싱 (사주/대운/연운 TongbyeonView와 동일 방식) ──
interface TCard { title: string; body: string; icon: string }
function tbIcon(t: string): string {
  if (t.includes('큰 그림') || t.includes('첫인상') || t.includes('만남')) return '✨'
  if (t.includes('끌림') || t.includes('사랑') || t.includes('인연')) return '💗'
  if (t.includes('성격') || t.includes('기질') || t.includes('마음')) return '🌙'
  if (t.includes('소통') || t.includes('대화')) return '🤝'
  if (t.includes('지속') || t.includes('오래')) return '🌿'
  if (t.includes('갈등') || t.includes('조심') || t.includes('주의')) return '⚠️'
  if (t.includes('속궁합') || t.includes('친밀')) return '💞'
  if (t.includes('결혼') || t.includes('미래') || t.includes('시기')) return '💍'
  if (t.includes('재물') || t.includes('돈')) return '💰'
  if (t.includes('개운') || t.includes('조언') || t.includes('살리는') || t.includes('맞춰')) return '🔮'
  return '🌟'
}
function tbClean(s: string): string {
  return s.replace(/^#{1,6}\s*/, '').replace(/^\s*[-*]{3,}\s*$/, '').replace(/\*\*(.+?)\*\*/g, '$1').replace(/^■\s*/, '').trim()
}
function parseTCards(text: string): { intro: string; cards: TCard[] } {
  const lines = text.split('\n')
  let intro = ''
  const cards: TCard[] = []
  let cur: { title: string; bodyLines: string[] } | null = null
  const isHeading = (ln: string) => /^\s*(#{1,6}\s*)?■/.test(ln) || /^\s*#{2,6}\s+/.test(ln)
  for (const ln of lines) {
    if (isHeading(ln)) {
      if (cur) cards.push({ title: tbClean(cur.title), body: cur.bodyLines.join('\n').trim(), icon: tbIcon(tbClean(cur.title)) })
      cur = { title: ln, bodyLines: [] }
    } else if (cur) { cur.bodyLines.push(ln) }
    else { const c = tbClean(ln); if (c) intro += (intro ? '\n' : '') + c }
  }
  if (cur) cards.push({ title: tbClean(cur.title), body: cur.bodyLines.join('\n').trim(), icon: tbIcon(tbClean(cur.title)) })
  return { intro, cards: cards.filter(c => c.title || c.body) }
}

// ============================================================================
// 결과 뷰: 두 사람 명식 계산 → 등급 → 통변 스트리밍
// ============================================================================
type PersonRaw = Record<string, string>
interface Mode2Info { label: string; accent: string }
const HANGUL_STEM: Record<string, string> = { 甲:'갑',乙:'을',丙:'병',丁:'정',戊:'무',己:'기',庚:'경',辛:'신',壬:'임',癸:'계' }
const pill = (s: string, b: string) => (s && b && s !== '?' ? `${s}${b}` : '모름')

// 시각 라벨(예: "진시") → hourIdx(0~11, 자시=0). couple-input의 hour는 "0"~"11" 또는 "모름"
function hourToIdx(hour: string | undefined): number | null {
  if (!hour || hour === '모름') return null
  const n = parseInt(hour)
  return isNaN(n) ? null : n
}

// /api/lunar 로 한 사람의 4기둥 계산
async function calcOnePerson(p: PersonRaw): Promise<SajuPillarSimple[] | null> {
  const calType = p.calType || '양력'
  const y = parseInt(p.year), m = parseInt(p.month), d = parseInt(p.day)
  if (!y || !m || !d) return null
  const leap = p.leapMonth || '0'
  const url = `/api/lunar?year=${y}&month=${m}&day=${d}&calType=${calType}&leapMonth=${leap}`
  const res = await fetch(url)
  const data = await res.json()
  if (data.error) return null
  const split = (g: string) => {
    if (!g) return { stem: '?', branch: '?' }
    const mt = g.match(/\(([^)]+)\)/)
    if (mt && mt[1].length >= 2) return { stem: mt[1][0], branch: mt[1][1] }
    if (g.length >= 2) return { stem: g[0], branch: g[1] }
    return { stem: '?', branch: '?' }
  }
  const year = split(data.yearGanji), month = split(data.monthGanji), day = split(data.dayGanji)
  const hIdx = hourToIdx(p.hour)
  const hour = hIdx !== null ? calcHourPillar(day.stem, hIdx) : { stem: '?', branch: '?' }
  return [
    { pillar: '시주', stem: hour.stem, branch: hour.branch },
    { pillar: '일주', stem: day.stem, branch: day.branch },
    { pillar: '월주', stem: month.stem, branch: month.branch },
    { pillar: '년주', stem: year.stem, branch: year.branch },
  ]
}

function toCouplePerson(p: PersonRaw, saju: SajuPillarSimple[]): CouplePerson {
  const find = (k: string) => saju.find(s => s.pillar === k)
  const y = find('년주'), mo = find('월주'), da = find('일주'), h = find('시주')
  const birth = p.year ? `${p.year}.${p.month}.${p.day}` : ''
  return {
    name: p.name || '', gender: p.gender || '', birthLabel: birth,
    yearPillar: pill(y?.stem ?? '', y?.branch ?? ''),
    monthPillar: pill(mo?.stem ?? '', mo?.branch ?? ''),
    dayPillar: pill(da?.stem ?? '', da?.branch ?? ''),
    hourPillar: pill(h?.stem ?? '', h?.branch ?? ''),
    dayStem: da?.stem ?? '',
  }
}

function CoupleResultView({
  mode, info, person1, person2, name1, name2, pickedQuestions, onBack, onOther,
}: {
  mode: 'couple' | 'married'
  info: Mode2Info
  person1: PersonRaw
  person2: PersonRaw
  name1: string
  name2: string
  pickedQuestions: SajuQuestion[]
  onBack: () => void
  onOther: () => void
}) {
  const isAll = pickedQuestions.length === 0
  const [saju1, setSaju1] = useState<SajuPillarSimple[] | null>(null)
  const [saju2, setSaju2] = useState<SajuPillarSimple[] | null>(null)
  const [score, setScore] = useState<CoupleScoreResult | null>(null)
  const [calcErr, setCalcErr] = useState(false)

  // 통변
  const [tongLoading, setTongLoading] = useState(false)
  const [tongResult, setTongResult] = useState<string | null>(null)
  const [openCard, setOpenCard] = useState(0)
  const ranRef = useRef(false)

  // 두 사람 명식 계산 + 등급
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        const [s1, s2] = await Promise.all([calcOnePerson(person1), calcOnePerson(person2)])
        if (cancelled) return
        if (!s1 || !s2) { setCalcErr(true); return }
        setSaju1(s1); setSaju2(s2)
        const ilju1 = s1.find(p => p.pillar === '일주')
        const ilju2 = s2.find(p => p.pillar === '일주')
        const gm1 = ilju1 ? getGongmang(ilju1.stem, ilju1.branch) : ['', ''] as [string, string]
        const gm2 = ilju2 ? getGongmang(ilju2.stem, ilju2.branch) : ['', ''] as [string, string]
        setScore(calcCoupleScore(s1, s2, gm1, gm2))
      } catch { if (!cancelled) setCalcErr(true) }
    }
    run()
    return () => { cancelled = true }
  }, [person1, person2])

  // 통변 스트리밍 (계산 끝나면 자동 1회)
  useEffect(() => {
    if (!saju1 || !saju2 || !score || ranRef.current) return
    ranRef.current = true
    let cancelled = false
    async function runTongbyeon() {
      setTongLoading(true); setTongResult(null)
      try {
        const prompt = buildCoupleTongbyeonPrompt(
          { mode, person1: toCouplePerson(person1, saju1!), person2: toCouplePerson(person2, saju2!), score: score! },
          pickedQuestions,
        )
        const res = await fetch('/api/tongbyeon', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ systemPrompt: prompt, premium: false }),
        })
        if (!res.ok || !res.body) { if (!cancelled) setTongResult('통변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.'); return }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let acc = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done || cancelled) break
          for (const line of decoder.decode(value).split('\n')) {
            if (!line.startsWith('data: ')) continue
            const dstr = line.slice(6)
            if (dstr === '[DONE]') continue
            try { const parsed = JSON.parse(dstr); if (parsed.text) { acc += parsed.text; if (!cancelled) setTongResult(acc) } } catch {}
          }
        }
      } catch { if (!cancelled) setTongResult('통변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.') }
      finally { if (!cancelled) setTongLoading(false) }
    }
    runTongbyeon()
    return () => { cancelled = true }
  }, [saju1, saju2, score, mode, person1, person2, pickedQuestions])

  const headline = dummyHeadlineSafe(`${name1}님과 ${name2}님, 두 사람의 만남`)
  const isMe1 = person1.isMe === 'true' || person1.isMe === '1'
  const { intro: tbIntro, cards: tbCards } = useMemo(
    () => (tongResult ? parseTCards(tongResult) : { intro: '', cards: [] }),
    [tongResult],
  )

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>{info.label} 결과</div>
      </div>

      <div style={{ padding: '16px 14px' }}>
        {/* ① 등급 + 폭죽 */}
        {score ? (
          <GradeFireworks grade={score.grade} gradeDesc={score.gradeDesc} headline={headline} accent={info.accent} />
        ) : (
          <div style={{ background: info.accent, borderRadius: 14, padding: '30px 16px', textAlign: 'center', marginBottom: 10, color: '#fff', fontSize: 13 }}>
            {calcErr ? '두 사람 정보를 다시 확인해 주세요.' : '두 사람의 인연을 살펴보는 중…'}
          </div>
        )}

        {/* 고른 질문 */}
        <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '10px 13px', marginBottom: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: isAll ? 0 : 6 }}>
            <span style={{ color: '#c8783c', fontSize: 13 }}>❝</span>
            <span style={{ flex: 1, fontSize: 12, color: '#b4785a' }}>{isAll ? '두 사람 궁합 전체 총평' : `고른 질문 ${pickedQuestions.length}개`}</span>
            <span onClick={onBack} style={{ fontSize: 11, color: '#c8783c', cursor: 'pointer' }}>바꾸기</span>
          </div>
          {!isAll && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {pickedQuestions.map(q => (
                <span key={q.id} style={{ fontSize: 11, color: '#96502e', background: '#f9ebe0', borderRadius: 8, padding: '3px 8px' }}>{q.question}</span>
              ))}
            </div>
          )}
        </div>

        {/* ②③ 두 사람 명식 */}
        <CoupleWonguk
          left={{ name: name1, birth: person1.year ? `${person1.year}.${person1.month}.${person1.day}` : '', isMe: isMe1, saju: saju1 ?? [] }}
          right={{ name: name2, birth: person2.year ? `${person2.year}.${person2.month}.${person2.day}` : '', saju: saju2 ?? [] }}
        />

        {/* ④ 통변 — 질문별 카드 아코디언 (사주/대운/연운과 통일) */}
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, paddingLeft: 2 }}>
            <span style={{ color: '#c8783c' }}>✦</span>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#96502e' }}>두 사람의 궁합 이야기</span>
          </div>

          {tongLoading && !tongResult ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 24, color: '#b4785a', fontSize: 13, background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12 }}>
              <span style={{ fontSize: 28, display: 'inline-block', animation: 'spin 1.1s linear infinite', color: '#c8783c' }}>✦</span>
              <span>두 사람의 인연을 찬찬히 살펴보는 중이에요…</span>
              <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
            </div>
          ) : tongResult ? (
            <>
              {tbIntro && (
                <div style={{ fontSize: 12.5, color: '#b4785a', lineHeight: 1.8, marginBottom: 10, paddingLeft: 2 }}>{tbIntro}</div>
              )}
              {tbCards.map((c, i) => {
                const open = tongLoading ? i === tbCards.length - 1 : openCard === i
                return (
                  <div key={i} style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, marginBottom: 8, overflow: 'hidden' }}>
                    <div onClick={() => setOpenCard(open ? -1 : i)}
                      style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '13px 14px', cursor: 'pointer' }}>
                      <span style={{ fontSize: 16 }}>{c.icon}</span>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#96502e', lineHeight: 1.35 }}>{c.title}</span>
                      <span style={{ color: '#c8783c', fontSize: 12, transition: 'transform .25s', transform: `rotate(${open ? '180' : '0'}deg)` }}>▾</span>
                    </div>
                    <div style={{ maxHeight: open ? '3000px' : '0', overflow: 'hidden', transition: 'max-height .3s ease' }}>
                      <div style={{ fontSize: 13.5, lineHeight: 1.85, color: '#3a2e28', whiteSpace: 'pre-wrap', padding: '0 14px 14px' }}>{c.body}</div>
                    </div>
                  </div>
                )
              })}
              {tongLoading && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 4px', color: '#b4785a', fontSize: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#b46e46', animation: 'tbpulse 1s infinite' }} />
                  정성껏 풀이하고 있어요…
                  <style>{`@keyframes tbpulse{0%,100%{opacity:.3}50%{opacity:1}}`}</style>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12.5, color: '#b4785a', lineHeight: 1.8, background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '14px 12px', textAlign: 'center' }}>
              두 사람의 명식을 준비하는 중이에요…
            </div>
          )}
        </div>

        {/* 저장/다시보기 [TODO] saju_records(couple) 저장 + 보관함 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
          <button style={{ flex: 1, background: '#fff', border: '0.5px solid #e0c9b8', borderRadius: 11, padding: 12, fontSize: 13, color: '#96502e', cursor: 'pointer' }}>보관함에 저장</button>
          <button onClick={onOther} style={{ flex: 1, background: '#b46e46', border: 'none', borderRadius: 11, padding: 12, fontSize: 13, color: '#fff', cursor: 'pointer' }}>다른 궁합 보기</button>
        </div>
      </div>
    </main>
  )
}

export default function CoupleResultNewPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <CoupleResultInner />
    </Suspense>
  )
}
