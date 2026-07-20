'use client'
// ============================================================================
//  관리자 > 🔍 AI 통변 구조
// ----------------------------------------------------------------------------
//  AI가 통변을 만들 때 실제로 무엇을 전달받는지 "보기 전용"으로 보여준다.
//
//  ★ 읽기 전용이다. 저장·수정 기능은 일부러 넣지 않았다.
//    실제 코드(lib/saju/*Prompt.ts)에서 그대로 불러와 화면에 그리기만 한다.
//    따라서 이 화면을 아무리 눌러도 서비스가 바뀌지 않는다.
//
//  왜 만들었나 (2026-07):
//    통변 프롬프트가 코드 안에 흩어져 있어 대표님이 내용을 볼 수 없었다.
//    "어투 관리"에 쓴 규칙이 어디에 적용되는지도 알기 어려웠다.
//    → 무엇이 들어가는지 눈으로 보고, 고칠 곳을 정확히 짚어 요청할 수 있게 함.
// ============================================================================

import { useMemo, useState } from 'react'
import { buildTongbyeonPrompt } from '@/lib/saju/tongbyeonPrompt'
import { QUESTIONS, questionsFor, type SajuQuestion, type AgeGroup } from '@/lib/saju/questions'
import { toTongbyeonInput } from '@/lib/saju/toTongbyeonInput'
import { calcSimsanOhaeng, toPercentList } from '@/lib/saju/simsanOhaeng'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { useResultSaju } from '@/hooks/useResultSaju'
import { hourLabelOf, TIME_BANDS, MONTHS, dayOptions, clampDay, type TimeBand } from '@/lib/saju/birthInput'

const gold = '#FAC775'
const cardBg = '#1f1f1e'
const line = '#333'

const inp: React.CSSProperties = {
  minWidth: 0, background: '#242422', border: '1px solid #3a3a38', borderRadius: 6,
  padding: '7px 8px', color: '#ddd', fontSize: 11.5, outline: 'none',
}
const seg: React.CSSProperties = {
  fontSize: 11, padding: '7px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
}

// ── 블록 설명 (화면에 그대로 표시) ─────────────────────────────────────────
interface BlockInfo {
  no: string
  title: string
  desc: string
  source: string
  editable: 'code' | 'admin' | 'data'
  warn?: string
}

const BLOCKS: BlockInfo[] = [
  {
    no: '①', title: '시스템 지침',
    desc: '말투·톤 / 용어 / 나이·시각 규칙 / 분량 / 반드시 지킬 규칙 / 형식 규칙',
    source: 'lib/saju/tongbyeonPrompt.ts → SYSTEM_GUIDE',
    editable: 'code',
    warn: '형식 규칙을 바꾸면 "■ 제목" 카드 파싱이 깨져 화면이 망가집니다.',
  },
  {
    no: '②', title: '사주 데이터',
    desc: '명식 8글자 · 일간 · 용신 · 오행 점수 · 나이 · 성별 · 태어난 시각의 기운',
    source: '계산 결과 (useResultSaju → toTongbyeonInput)',
    editable: 'data',
  },
  {
    no: '③', title: '고른 질문 + 명리 연결',
    desc: '손님이 고른 질문마다 link(명리 연결)와 detail(상세 해설)이 함께 전달됩니다.',
    source: 'lib/saju/questions.ts — 연령대별 66문항',
    editable: 'data',
  },
  {
    no: '④', title: '개운 참고자료',
    desc: '용신 오행별 색·방향·숫자. 개운·건강 질문을 골랐을 때만 쓰라는 조건부 자료입니다.',
    source: 'lib/saju/tongbyeonPrompt.ts → OHAENG_GAEUN',
    editable: 'code',
  },
  {
    no: '⑤', title: '답변 형식',
    desc: '고른 질문 수만큼 "■ 제목" 카드를 만들라는 지시. 카드마다 3~4문단.',
    source: 'lib/saju/tongbyeonPrompt.ts → formatBlock',
    editable: 'code',
    warn: '화면이 이 형식을 읽어 카드로 나눕니다. 바꾸려면 화면도 함께 고쳐야 합니다.',
  },
]

// ── 기본 예시 (연재쌤) ─────────────────────────────────────────────────────
//  화면을 열면 이 사주로 시작한다. 아래 입력칸에서 얼마든지 바꿀 수 있다.
//  ★ 명식은 실제 서비스와 똑같이 useResultSaju가 계산한다(음력 변환 포함).
const DEFAULT_PERSON = {
  name: '연재',
  gender: '여',
  calType: '음력',
  year: '1967',
  month: '11',
  day: '15',
  leapMonth: '0',
  hour: '6',      // 午시
}

function ageGroupOf(birthYear: number): AgeGroup {
  const age = new Date().getFullYear() - birthYear
  if (age < 30) return '20s'
  if (age < 40) return '30s'
  if (age < 50) return '40s'
  if (age < 60) return '50s'
  return '60s'
}

export default function PromptViewer() {
  const [open, setOpen] = useState<string | null>('①')
  const [picked, setPicked] = useState<string[]>([])
  const [prompt, setPrompt] = useState('')
  const [copied, setCopied] = useState(false)

  // ── 인적사항 (자유롭게 바꿔가며 실험) ──
  const [name, setName] = useState(DEFAULT_PERSON.name)
  const [gender, setGender] = useState(DEFAULT_PERSON.gender)
  const [calType, setCalType] = useState(DEFAULT_PERSON.calType)
  const [year, setYear] = useState(DEFAULT_PERSON.year)
  const [month, setMonth] = useState(DEFAULT_PERSON.month)
  const [day, setDay] = useState(DEFAULT_PERSON.day)
  const [leapMonth, setLeapMonth] = useState(DEFAULT_PERSON.leapMonth)
  const [hour, setHour] = useState(DEFAULT_PERSON.hour)
  const [band, setBand] = useState<TimeBand | null>(null)

  // ── 명식 계산 — 실제 서비스와 똑같은 훅을 쓴다 (음력 변환 포함) ──
  const hourIdx = hour === '' ? null : Number(hour)
  const { saju, solar, converting, dayStem } = useResultSaju(
    calType, Number(year), Number(month), Number(day), leapMonth, hourIdx,
  )

  const hourBranch = hourIdx == null ? null : (saju.find(p => p.pillar === '시주')?.branch ?? null)
  const ohaeng = useMemo(
    () => saju.length > 0 && solar
      ? toPercentList(calcSimsanOhaeng(saju, solar.month, solar.day, hourBranch))
      : [],
    [saju, solar, hourBranch],
  )
  const yongsinResult = useMemo(
    // 심산 오행 점수로 계산 (월지 계절 치환 반영)
    () => (saju.length > 0 && dayStem)
      ? calcYongsinCompat(saju, dayStem, solar?.month, solar?.day, hourBranch)
      : null,
    [saju, dayStem, solar, hourBranch],
  )

  const age = year ? new Date().getFullYear() - Number(year) : 0
  const ageGroup: AgeGroup = year ? ageGroupOf(Number(year)) : '50s'

  // 그 연령대·성별에 맞는 질문만
  const available = useMemo(
    () => questionsFor(ageGroup, gender === '남' ? 'male' : 'female'),
    [ageGroup, gender],
  )

  // 연/월/달력이 바뀌면 이미 고른 '일'을 범위 안으로 보정
  const applyYear = (v: string) => {
    const y = v.replace(/\D/g, '').slice(0, 4)
    setYear(y); setPicked([]); setPrompt('')
    if (month && day) setDay(clampDay(day, parseInt(y, 10), parseInt(month, 10), calType))
  }
  const applyMonth = (m: string) => {
    setMonth(m); setPrompt('')
    if (day) setDay(clampDay(day, parseInt(year, 10), parseInt(m, 10), calType))
  }
  const applyCal = (c: string) => {
    setCalType(c); setPrompt('')
    if (month && day) setDay(clampDay(day, parseInt(year, 10), parseInt(month, 10), c))
  }

  const visibleHours = band
    ? band.hours.map(i => ({ value: String(i), label: hourLabelOf(i) }))
    : Array.from({ length: 12 }, (_, i) => ({ value: String(i), label: hourLabelOf(i) }))
  const pickBand = (b: TimeBand) => {
    if (band?.key === b.key) { setBand(null); return }
    setBand(b)
    if (hour && !b.hours.includes(Number(hour))) setHour('')
  }

  const toggle = (id: string) => {
    setPicked(p => p.includes(id) ? p.filter(x => x !== id) : (p.length >= 3 ? p : [...p, id]))
    setPrompt('')
  }

  const build = () => {
    const qs: SajuQuestion[] = QUESTIONS.filter(q => picked.includes(q.id))
    if (!qs.length) { alert('질문을 1개 이상 골라주세요.'); return }
    if (!saju.length || !dayStem) { alert('명식을 계산하는 중이에요. 잠시 후 다시 눌러주세요.'); return }
    const input = toTongbyeonInput({
      name: name || '고객',
      gender,
      age,
      saju,
      dayStem,
      ohaeng,
      yongsin: yongsinResult,
      hourBranch,
    })
    setPrompt(buildTongbyeonPrompt(input, qs, { premium: false }))
    setCopied(false)
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true); setTimeout(() => setCopied(false), 1800)
    } catch { alert('복사가 안 됐어요. 직접 선택해 복사해 주세요.') }
  }

  // 블록별 실제 내용 (조립된 프롬프트에서 잘라 보여주기)
  const blockText = (no: string): string => {
    if (!prompt) return ''
    const marks = ['[이 사람의 사주 데이터]', '[손님이 고른 주제와 질문]', '[개운 참고자료', '[답변 형식']
    if (no === '①') return prompt.split(marks[0])[0].trim()
    if (no === '②') return ('[이 사람의 사주 데이터]' + (prompt.split(marks[0])[1] || '')).split(marks[1])[0].trim()
    if (no === '③') return (marks[1] + (prompt.split(marks[1])[1] || '')).split(marks[2])[0].trim()
    if (no === '④') return (marks[2] + (prompt.split(marks[2])[1] || '')).split(marks[3])[0].trim()
    if (no === '⑤') return (marks[3] + (prompt.split(marks[3])[1] || '')).trim()
    return ''
  }

  const badge = (kind: BlockInfo['editable']) => {
    const map = {
      code:  { t: '코드 고정', bg: 'rgba(217,128,128,0.15)', c: '#d98080' },
      admin: { t: '관리자 편집 가능', bg: 'rgba(250,199,117,0.15)', c: gold },
      data:  { t: '자동 생성', bg: 'rgba(120,170,220,0.15)', c: '#7aaadc' },
    }[kind]
    return (
      <span style={{ fontSize: 9.5, padding: '2px 7px', borderRadius: 9, background: map.bg, color: map.c }}>
        {map.t}
      </span>
    )
  }

  return (
    <div style={{ color: '#e8e8e6' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: gold, marginBottom: 4 }}>🔍 AI 통변 구조</div>
      <div style={{ fontSize: 11.5, color: '#8a8a88', lineHeight: 1.7, marginBottom: 16 }}>
        AI가 사주 통변을 만들 때 실제로 무엇을 전달받는지 보여줍니다.
        <b style={{ color: '#aaa' }}> 보기 전용</b>이라 여기서 무엇을 눌러도 서비스는 바뀌지 않습니다.
        고칠 곳이 보이면 블록 번호와 함께 개발에 요청하세요.
      </div>

      {/* ── 1. 블록 구조 ───────────────────────────────────────── */}
      <div style={{ fontSize: 12.5, fontWeight: 700, color: '#ccc', marginBottom: 8 }}>
        1. 프롬프트는 이 5개 덩어리로 조립됩니다
      </div>

      {BLOCKS.map(b => {
        const isOpen = open === b.no
        const text = blockText(b.no)
        return (
          <div key={b.no} style={{ background: cardBg, border: `1px solid ${line}`, borderRadius: 8, padding: 12, marginBottom: 7 }}>
            <div onClick={() => setOpen(isOpen ? null : b.no)}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: gold }}>{b.no} {b.title}</span>
                <span style={{ fontSize: 10, color: '#666', marginLeft: 8 }}>{b.source.split('→')[0].trim()}</span>
              </div>
              <span style={{ fontSize: 11, color: '#666' }}>{isOpen ? '▾' : '›'}</span>
            </div>

            {isOpen && (
              <div style={{ marginTop: 9 }}>
                <div style={{ fontSize: 11, color: '#999', lineHeight: 1.7, marginBottom: 8 }}>{b.desc}</div>
                {b.warn && (
                  <div style={{ fontSize: 10.5, color: '#d98080', lineHeight: 1.6, marginBottom: 8,
                    background: 'rgba(217,128,128,0.08)', border: '1px solid rgba(217,128,128,0.2)',
                    borderRadius: 6, padding: '7px 9px' }}>
                    ⚠ {b.warn}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
                  {badge(b.editable)}
                  <span style={{ fontSize: 9.5, color: '#666' }}>{b.source}</span>
                </div>
                {text ? (
                  <pre style={{
                    background: '#141413', border: `1px solid ${line}`, borderRadius: 6, padding: 10,
                    fontSize: 10.5, color: '#9a9a98', lineHeight: 1.75, whiteSpace: 'pre-wrap',
                    maxHeight: 260, overflowY: 'auto', margin: 0,
                  }}>{text}</pre>
                ) : (
                  <div style={{ fontSize: 10.5, color: '#666', fontStyle: 'italic' }}>
                    아래에서 질문을 고르고 [조립해서 보기]를 누르면 실제 내용이 여기 표시됩니다.
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}

      {/* ── 2. 실제 조립 ───────────────────────────────────────── */}
      <div style={{ borderTop: `1px solid ${line}`, marginTop: 18, paddingTop: 16 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: '#ccc', marginBottom: 4 }}>
          2. 실제로 AI에게 전달되는 프롬프트 보기
        </div>
        <div style={{ fontSize: 11, color: '#777', lineHeight: 1.7, marginBottom: 12 }}>
          인적사항을 바꿔가며 <b style={{ color: '#999' }}>어떤 통변이 나올지</b> 미리 볼 수 있습니다.
          명식은 실제 서비스와 똑같이 계산됩니다(음력 변환 포함).
        </div>

        {/* ── 인적사항 입력 ── */}
        <div style={{ background: '#141413', border: `1px solid ${line}`, borderRadius: 8, padding: 11, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
            <input value={name} onChange={e => { setName(e.target.value); setPrompt('') }}
              placeholder="이름" style={{ ...inp, flex: 1.2 }} />
            <div style={{ display: 'flex', gap: 3 }}>
              {['남', '여'].map(g => (
                <button key={g} onClick={() => { setGender(g); setPicked([]); setPrompt('') }}
                  style={{ ...seg, background: gender === g ? gold : '#242422', color: gender === g ? '#1a1a18' : '#777' }}>{g}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 3 }}>
              {['양력', '음력'].map(c => (
                <button key={c} onClick={() => applyCal(c)}
                  style={{ ...seg, background: calType === c ? gold : '#242422', color: calType === c ? '#1a1a18' : '#777' }}>{c}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 7, alignItems: 'center' }}>
            <input value={year} onChange={e => applyYear(e.target.value)} inputMode="numeric"
              placeholder="1990" style={{ ...inp, flex: 1.3 }} />
            <span style={{ fontSize: 10.5, color: '#666' }}>년</span>
            <select value={month} onChange={e => applyMonth(e.target.value)} style={{ ...inp, flex: 1 }}>
              <option value="">월</option>
              {MONTHS.map(m => <option key={m} value={String(m)}>{m}</option>)}
            </select>
            <span style={{ fontSize: 10.5, color: '#666' }}>월</span>
            <select value={day} onChange={e => { setDay(e.target.value); setPrompt('') }} style={{ ...inp, flex: 1 }}>
              <option value="">일</option>
              {dayOptions(parseInt(year, 10), parseInt(month, 10), calType).map(d => <option key={d} value={String(d)}>{d}</option>)}
            </select>
            <span style={{ fontSize: 10.5, color: '#666' }}>일</span>
            {calType === '음력' && (
              <div style={{ display: 'flex', gap: 3 }}>
                {[['0', '평달'], ['1', '윤달']].map(([v, t]) => (
                  <button key={v} onClick={() => { setLeapMonth(v); setPrompt('') }}
                    style={{ ...seg, background: leapMonth === v ? gold : '#242422', color: leapMonth === v ? '#1a1a18' : '#777' }}>{t}</button>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
            <select value={hour} onChange={e => { setHour(e.target.value); setPrompt('') }} style={{ ...inp, flex: 1 }}>
              <option value="">시간 모름</option>
              {visibleHours.map(h => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
            <div style={{ display: 'flex', gap: 3 }}>
              {TIME_BANDS.map(b => (
                <button key={b.key} onClick={() => pickBand(b)}
                  style={{ ...seg, fontSize: 10, padding: '6px 7px',
                    background: band?.key === b.key ? gold : '#242422',
                    color: band?.key === b.key ? '#1a1a18' : '#777' }}>{b.label}</button>
              ))}
            </div>
          </div>

          {/* 계산 결과 미리보기 */}
          <div style={{ fontSize: 10.5, color: '#888', lineHeight: 1.7, paddingTop: 7, borderTop: `1px solid ${line}` }}>
            {converting ? '명식 계산 중…' : saju.length > 0 ? (
              <>
                <span style={{ color: gold }}>
                  {saju.filter(p => p.stem !== '?').map(p => p.stem + p.branch).join(' ')}
                </span>
                {solar && <span style={{ color: '#666' }}> · 양력 {solar.year}.{solar.month}.{solar.day}</span>}
                <span style={{ color: '#666' }}> · 만 {age}세 · {ageGroup.replace('s', '대')} 질문</span>
                {ohaeng.length > 0 && (
                  <div style={{ color: '#777', marginTop: 3 }}>
                    오행 {ohaeng.map(o => `${o.el}${Math.round(o.pct)}`).join(' ')}
                    {yongsinResult?.yongsin && <span> · 억부용신 {yongsinResult.yongsin}</span>}
                  </div>
                )}
              </>
            ) : <span style={{ color: '#666' }}>생년월일을 입력하면 명식이 계산됩니다.</span>}
          </div>
        </div>

        <div style={{
          background: '#141413', border: `1px solid ${line}`, borderRadius: 7,
          padding: 9, maxHeight: 190, overflowY: 'auto', marginBottom: 10,
        }}>
          {available.map(q => {
            const on = picked.includes(q.id)
            return (
              <div key={q.id} onClick={() => toggle(q.id)}
                style={{
                  fontSize: 11, padding: '6px 8px', borderRadius: 5, cursor: 'pointer',
                  marginBottom: 3, lineHeight: 1.5,
                  background: on ? 'rgba(250,199,117,0.12)' : 'transparent',
                  color: on ? gold : '#888',
                  border: on ? `1px solid rgba(250,199,117,0.3)` : '1px solid transparent',
                }}>
                <span style={{ color: '#666', fontSize: 10 }}>[{q.category}]</span> {q.question}
              </div>
            )
          })}
          {!available.length && (
            <div style={{ fontSize: 11, color: '#666', padding: 8 }}>이 연령대에 등록된 질문이 없습니다.</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginBottom: 12 }}>
          <button onClick={build}
            style={{
              flex: 1, background: gold, color: '#1a1a18', border: 'none', borderRadius: 7,
              padding: '10px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
            }}>
            프롬프트 조립해서 보기 {picked.length > 0 && `(질문 ${picked.length}개)`}
          </button>
          {prompt && (
            <button onClick={copy}
              style={{
                background: '#2a2a28', color: '#aaa', border: `1px solid ${line}`, borderRadius: 7,
                padding: '10px 14px', fontSize: 11.5, cursor: 'pointer', whiteSpace: 'nowrap',
              }}>
              {copied ? '✓ 복사됨' : '전문 복사'}
            </button>
          )}
        </div>

        {prompt && (
          <>
            <div style={{ fontSize: 11, color: '#777', marginBottom: 6 }}>
              전체 {prompt.length.toLocaleString()}자 — 이 텍스트가 그대로 AI에게 전달됩니다.
            </div>
            <pre style={{
              background: '#141413', border: `1px solid ${line}`, borderRadius: 7, padding: 12,
              fontSize: 10.5, color: '#9a9a98', lineHeight: 1.8, whiteSpace: 'pre-wrap',
              maxHeight: 460, overflowY: 'auto', margin: 0,
            }}>{prompt}</pre>
          </>
        )}
      </div>
    </div>
  )
}
