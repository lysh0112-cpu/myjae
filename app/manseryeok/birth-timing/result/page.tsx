'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ConsultButton from '@/app/components/common/ConsultButton'
import { runBirthTiming, type Recommendation, type AvoidDay } from '../lib/recommend'
import { supabase } from '@/lib/supabase'
import {
  saveBirthRecord, getBirthRecord, type BirthSurvey,
} from '@/lib/saju/birthRecords'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import type { SavedInputData } from '@/lib/saju/savedPeople'

// 피치톤 (신버전 · 결혼택일과 통일)
const accent = '#b45a78'   // 출산택일 포인트(로즈핑크)
const cardBg = '#FFFBF7'
const sub = '#b4785a'
const text = '#3a2e28'
const gold = '#c8783c'      // 별점·강조 (피치 브라운오렌지)

const HOUR_LABELS: Record<string, string> = {
  '-1': '시간 모름',
  '0': '子시(23~01)', '1': '丑시(01~03)', '2': '寅시(03~05)', '3': '卯시(05~07)',
  '4': '辰시(07~09)', '5': '巳시(09~11)', '6': '午시(11~13)', '7': '未시(13~15)',
  '8': '申시(15~17)', '9': '酉시(17~19)', '10': '戌시(19~21)', '11': '亥시(21~23)',
}

interface PersonInput {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string; job: string; mbti: string
}

interface SurveyInput {
  dueDate: string; method: string; timePref: string
  babyGender: string; wishes: string[]; avoidNote: string
}

interface AiNote { oneLine: string; detail?: string }

function Disclaimer({ full }: { full?: boolean }) {
  return (
    <div style={{ background: '#fbece4', border: '1px solid #f0d5c5', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#b06a52', lineHeight: 1.6 }}>
      {full
        ? '※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 출산일·수술일 결정은 산모와 아기의 건강을 최우선으로, 반드시 담당 산부인과 전문의와 상의해 결정하세요.'
        : '※ 전통 명리 참고용 · 최종 결정은 전문의와 상의하세요.'}
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: gold, fontSize: '12px', letterSpacing: '1px' }}>
      {'★'.repeat(n)}<span style={{ color: '#e0cdbf' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

function personSummary(p: PersonInput | null): string {
  if (!p || !p.year) return '정보 없음'
  const hour = HOUR_LABELS[p.hour] ?? '시간 모름'
  return `${p.gender} · ${p.calType} ${p.year}.${p.month}.${p.day} · ${hour}`
}

function rankBadge(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`
}

// 천간·지지 (시주 계산용)
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

// 부모 사주 → { dayStem, yongsin(억부용신 오행) }
//   신버전 계산엔진(calcYongsinCompat, 억부용신)을 그대로 사용.
//   result가 이미 부모 사주를 /api/lunar로 조회하므로, 그 조회에 용신 계산만 얹어 추가 호출 0.
async function getParentSaju(p: PersonInput | null): Promise<{ dayStem?: string; yongsin?: string }> {
  if (!p || !p.year || !p.month || !p.day) return {}
  try {
    const url = `/api/lunar?year=${p.year}&month=${p.month}&day=${p.day}&calType=${p.calType}&leapMonth=0`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return {}

    // "간지(甲子)" 또는 "甲子" → {stem, branch}
    const split = (g: string): { stem: string; branch: string } => {
      if (!g) return { stem: '?', branch: '?' }
      const m = g.match(/\(([^)]+)\)/)
      if (m && m[1].length >= 2) return { stem: m[1][0], branch: m[1][1] }
      if (g.length >= 2) return { stem: g[0], branch: g[1] }
      return { stem: '?', branch: '?' }
    }
    const year = split(data.yearGanji)
    const month = split(data.monthGanji)
    const day = split(data.dayGanji)
    if (day.stem === '?') return {}

    // 시주: 시간 알면 계산(용신 정확도↑), 모르면 생략
    const hourIdx = p.hour === '-1' || p.hour === '' || p.hour == null ? null : parseInt(p.hour)
    const calcHour = (dayStem: string, hi: number): { stem: string; branch: string } => {
      const dg = STEMS.indexOf(dayStem)
      if (dg < 0) return { stem: '?', branch: '?' }
      const groupBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
      return { stem: STEMS[(groupBase[dg] + hi) % 10], branch: BRANCHES[hi] }
    }
    const hour = hourIdx !== null && !isNaN(hourIdx) ? calcHour(day.stem, hourIdx) : { stem: '?', branch: '?' }

    // calcYongsinCompat 입력: Pillar[] (시·일·월·년, ? 제외)
    const sajuPillars = [
      { pillar: '시주', stem: hour.stem, branch: hour.branch },
      { pillar: '일주', stem: day.stem, branch: day.branch },
      { pillar: '월주', stem: month.stem, branch: month.branch },
      { pillar: '년주', stem: year.stem, branch: year.branch },
    ].filter(pp => pp.stem !== '?' && pp.branch !== '?')

    const ys = calcYongsinCompat(sajuPillars, day.stem)
    return { dayStem: day.stem, yongsin: ys.yongsin || undefined }
  } catch {
    return {}
  }
}

async function fetchAiNotes(recs: Recommendation[], survey: SurveyInput): Promise<Record<number, AiNote>> {
  const wishesText = survey.wishes && survey.wishes.length > 0 ? survey.wishes.join(', ') : '특별히 없음'
  const list = recs.map(r =>
    `${r.rank}순위) 날짜 ${r.dateLabel} ${r.hourLabel}, 사주 ${r.saju}, ` +
    `오행분포 목${r.breakdown.elementCount['목']} 화${r.breakdown.elementCount['화']} 토${r.breakdown.elementCount['토']} 금${r.breakdown.elementCount['금']} 수${r.breakdown.elementCount['수']}, 점수 ${r.score}`
  ).join('\n')

  let toneBlock = ''
  try {
    const tr = await fetch('/api/admin/tone')
    if (tr.ok) {
      const td = await tr.json()
      toneBlock = `${td.tone_rules || ''}\n\n${td.easy_terms || ''}`.trim()
    }
  } catch {}

  const prompt =
`${toneBlock ? toneBlock + '\n\n' : ''}아래는 출산 예정일 전후로 추천된 ${recs.length}개 일시와 각 아기의 사주입니다.
부모가 바라는 점: ${wishesText}

${list}

각 항목마다 그 날 태어날 아기의 기질을 한 줄(20자 내외)로 표현하고,
각 항목마다 추가로 2~3문장의 상세 해설(detail)도 꼭 함께 써 주세요.

[반드시 지킬 안전 규칙]
- 의학적 단정이나 건강 예언은 절대 하지 마세요. (이것은 의료 조언이 아닙니다)
- 반드시 아래 JSON 형식으로만 답하세요. 다른 말은 절대 쓰지 마세요.

{${recs.map(r => `"${r.rank}":{"oneLine":"...","detail":"..."}`).join(",")}}`

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    })
    const data = await res.json()
    let txt = ''
    if (Array.isArray(data?.content)) {
      txt = data.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
    }
    const match = txt.match(/\{[\s\S]*\}/)
    if (!match) return {}
    const parsed = JSON.parse(match[0])
    const out: Record<number, AiNote> = {}
    for (const k of Object.keys(parsed)) {
      const n = parseInt(k)
      if (!isNaN(n)) out[n] = { oneLine: parsed[k].oneLine || '', detail: parsed[k].detail }
    }
    return out
  } catch {
    return {}
  }
}

function CandidateCard({ c, note, defaultOpen, opWarn }: { c: Recommendation; note?: AiNote; defaultOpen: boolean; opWarn?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  const b = c.breakdown
  const stars = [
    { label: '오행 균형', n: b.starOhaeng },
    { label: '온도(조후)', n: b.starJohu },
    { label: '지지 안정', n: b.starJiji },
  ]
  return (
    <div style={{ background: cardBg, borderRadius: '12px', border: '1px solid ' + (c.rank === 1 ? '#f0d5b8' : '#f0e0d5'), marginBottom: '10px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: '16px' }}>{rankBadge(c.rank)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: text, fontWeight: 600 }}>{c.dateLabel}</div>
          <div style={{ fontSize: '12px', color: sub, marginTop: '2px' }}>{c.hourLabel}</div>
          {note?.oneLine && (
            <div style={{ fontSize: '12px', color: '#96502e', marginTop: '4px', lineHeight: 1.4 }}>“{note.oneLine}”</div>
          )}
        </div>
        <span style={{ fontSize: '15px', fontWeight: 700, color: c.rank === 1 ? gold : '#96502e' }}>{c.score}점</span>
        <span style={{ fontSize: '12px', color: sub }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 16px' }}>
          <div style={{ borderTop: '1px solid #f0e0d5', paddingTop: '12px' }}>
            {opWarn && (
              <div style={{ background: '#fdf2e3', border: '0.5px solid #f0d5b8', borderRadius: '8px', padding: '9px 11px', marginBottom: '12px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                <span style={{ fontSize: '13px', flexShrink: 0 }}>🏥</span>
                <span style={{ fontSize: '12px', color: '#96502e', lineHeight: 1.5 }}>{opWarn}</span>
              </div>
            )}
            <div style={{ fontSize: '11px', color: sub, marginBottom: '4px' }}>아기 사주</div>
            <div style={{ fontSize: '15px', color: '#96502e', letterSpacing: '3px', marginBottom: '14px' }}>{c.saju}</div>

            {stars.map((s, i) => (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#96502e' }}>{s.label}</span>
                  <Stars n={s.n} />
                </div>
              </div>
            ))}

            {note?.detail && (
              <div style={{ background: '#fdf2e3', borderRadius: '8px', padding: '10px 12px', margin: '12px 0' }}>
                <div style={{ fontSize: '11px', color: gold, marginBottom: '4px' }}>이 아이는</div>
                <div style={{ fontSize: '13px', color: text, lineHeight: 1.6 }}>{note.detail}</div>
              </div>
            )}

            {c.parentNote && (
              <div style={{ background: '#f6e3d6', borderRadius: '8px', padding: '10px 12px', margin: '12px 0' }}>
                <div style={{ fontSize: '11px', color: sub, marginBottom: '3px' }}>부모와의 관계</div>
                <div style={{ fontSize: '13px', color: text, lineHeight: 1.5 }}>🌿 {c.parentNote}</div>
              </div>
            )}

            <div style={{ fontSize: '12px', color: sub, lineHeight: 1.6, marginTop: '8px' }}>
              <span style={{ color: gold }}>오행 분포</span> · 목{b.elementCount['목']} 화{b.elementCount['화']} 토{b.elementCount['토']} 금{b.elementCount['금']} 수{b.elementCount['수']}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BirthResultInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [parent1, setParent1] = useState<PersonInput | null>(null)
  const [parent2, setParent2] = useState<PersonInput | null>(null)
  const [survey, setSurvey] = useState<SurveyInput | null>(null)

  const [loading, setLoading] = useState(true)
  const [recs, setRecs] = useState<Recommendation[]>([])
  const [avoidDays, setAvoidDays] = useState<AvoidDay[]>([])
  const [aiNotes, setAiNotes] = useState<Record<number, AiNote>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')

  // 저장 + 다시보기(스냅샷)
  const recordIdParam = sp.get('recordId')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // 3일 탭: 처음엔 예정일(offset 0). 전날=-1, 다음날=+1
  const [tabOffset, setTabOffset] = useState(0)
  // 공휴일 맵 (YYYYMMDD → 이름)
  const [holidays, setHolidays] = useState<Record<string, string>>({})

  useEffect(() => {
    let cancelled = false

    async function run() {
      // ── 다시보기(recordId): 저장된 스냅샷을 그대로 복원 (재계산·AI 재호출 없음, 비용 0) ──
      if (recordIdParam) {
        try {
          const rec = await getBirthRecord(recordIdParam)
          const snap = rec?.resultData as {
            recommendations?: Recommendation[]; avoidDays?: AvoidDay[]; aiNotes?: Record<number, AiNote>
          } | undefined
          if (rec && snap && snap.recommendations && snap.recommendations.length > 0) {
            if (!cancelled) {
              setParent1(rec.input1 as unknown as PersonInput)
              setParent2(rec.input2 as unknown as PersonInput)
              setSurvey(rec.survey as unknown as SurveyInput)
              setRecs(snap.recommendations)
              setAvoidDays(snap.avoidDays ?? [])
              setAiNotes(snap.aiNotes ?? {})
              setSaved(true)
              setLoading(false)
            }
            return
          }
          // 스냅샷이 없으면(구기록) 아래 URL 파라미터로 재계산 진행
        } catch {}
      }

      let p1: PersonInput | null = null
      let p2: PersonInput | null = null
      let sv: SurveyInput | null = null
      try {
        const a = sp.get('p1'); const b = sp.get('p2'); const s = sp.get('survey')
        if (a) p1 = JSON.parse(decodeURIComponent(a))
        if (b) p2 = JSON.parse(decodeURIComponent(b))
        if (s) sv = JSON.parse(decodeURIComponent(s))
      } catch {}

      if (!cancelled) { setParent1(p1); setParent2(p2); setSurvey(sv) }

      if (!sv || !sv.dueDate) {
        if (!cancelled) { setErrMsg('출산예정일 정보가 없어요. 이전 화면에서 다시 입력해 주세요.'); setLoading(false) }
        return
      }

      try {
        const [ps1, ps2] = await Promise.all([getParentSaju(p1), getParentSaju(p2)])
        const parents = [
          { dayStem: ps1.dayStem, yongsin: ps1.yongsin },
          { dayStem: ps2.dayStem, yongsin: ps2.yongsin },
        ]

        const timePref =
          sv.timePref === '평일오전' ? 'morning'
          : sv.timePref === '평일오후' ? 'afternoon'
          : 'any'

        const result = await runBirthTiming(sv.dueDate, {
          timePref: timePref as 'morning' | 'afternoon' | 'any',
          parents,
        })

        if (cancelled) return
        setRecs(result.recommendations)
        setAvoidDays(result.avoidDays)
        if (result.recommendations.length === 0) {
          setErrMsg('조건에 맞는 날을 찾지 못했어요. 시간대나 예정일을 바꿔서 다시 시도해 주세요.')
          setLoading(false)
          return
        }
        setLoading(false)

        setAiLoading(true)
        const notes = await fetchAiNotes(result.recommendations, sv)
        if (!cancelled) { setAiNotes(notes); setAiLoading(false) }
      } catch {
        if (!cancelled) { setErrMsg('계산 중 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'); setLoading(false) }
      }
    }

    run()
    return () => { cancelled = true }
  }, [sp, recordIdParam])

  // 결과를 보관함에 저장 (결과 스냅샷 통째로 — 다시보기 시 재계산·AI 없이 복원)
  async function handleSave() {
    if (saving || saved) return
    if (!survey || !survey.dueDate || recs.length === 0) return
    setSaving(true)
    const nameOf = (p: PersonInput | null, fallback: string): string => {
      const nm = (p as unknown as { name?: string } | null)?.name
      return nm && nm.trim() ? nm : fallback
    }
    const toInput = (p: PersonInput | null): SavedInputData & { name?: string } => ({
      gender: p?.gender ?? '',
      calType: p?.calType ?? '양력',
      year: p?.year ?? '',
      month: p?.month ?? '',
      day: p?.day ?? '',
      leapMonth: '0',
      hour: p?.hour ?? '모름',
      name: (p as unknown as { name?: string } | null)?.name,
    })
    const surveyBlob: BirthSurvey = {
      dueDate: survey.dueDate, method: survey.method, timePref: survey.timePref,
      babyGender: survey.babyGender, wishes: survey.wishes ?? [], avoidNote: survey.avoidNote ?? '',
    }
    const res = await saveBirthRecord({
      name1: nameOf(parent1, '부모1'),
      name2: nameOf(parent2, '부모2'),
      summary: `${survey.dueDate} 예정 · 길일 ${recs.length}개`,
      input1: toInput(parent1),
      input2: toInput(parent2),
      survey: surveyBlob,
      resultData: { recommendations: recs, avoidDays, aiNotes },
    })
    setSaving(false)
    if (res.ok) setSaved(true)
    else alert(res.message || '저장하지 못했어요. 잠시 후 다시 시도해 주세요.')
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!survey || recs.length === 0) return
    try {
      sessionStorage.setItem('birth_full', JSON.stringify({
        kind: 'find',
        due_date: survey.dueDate,
        method: survey.method,
        time_pref: survey.timePref,
        baby_gender: survey.babyGender,
        wishes: survey.wishes ?? [],
        parent1,
        parent2,
        recommendations: recs.map(r => ({
          rank: r.rank,
          dateLabel: r.dateLabel,
          hourLabel: r.hourLabel,
          saju: r.saju,
          score: r.score,
          parentNote: r.parentNote ?? null,
          elementCount: r.breakdown?.elementCount ?? null,
        })),
        avoid_days: avoidDays.map(a => ({ dateLabel: a.dateLabel, reasons: a.reasons })),
        ai_notes: aiNotes,
      }))
    } catch {}
  }, [survey, recs, avoidDays, aiNotes, parent1, parent2])

  // 3일(추천)의 공휴일 조회 — 병원 운영 안내용
  useEffect(() => {
    if (recs.length === 0) return
    let cancelled = false
    const keys = recs.map(r => r.dateKey).filter(Boolean).sort()
    if (keys.length === 0) return
    const start = keys[0], end = keys[keys.length - 1]
    fetch(`/api/holidays?start=${start}&end=${end}`)
      .then(res => res.json())
      .then(data => {
        if (cancelled || !Array.isArray(data.holidays)) return
        const map: Record<string, string> = {}
        for (const h of data.holidays) if (h.date) map[h.date] = h.name || '공휴일'
        setHolidays(map)
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [recs])

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      {/* 피치톤 sticky 헤더 (결혼택일과 통일) + 저장 버튼 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/manseryeok/birth-timing/birth-storage')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>출산 시기 결과</div>
          <div style={{ fontSize: 10.5, color: '#b4785a' }}>아기에게 좋은 출산일이에요</div>
        </div>
        {!loading && !errMsg && recs.length > 0 && (
          <button onClick={handleSave} disabled={saving || saved}
            style={{
              marginLeft: 'auto', padding: '7px 13px', borderRadius: 9, fontSize: 12.5, fontWeight: 600,
              border: 'none', cursor: saved ? 'default' : 'pointer',
              background: saved ? '#f3e6db' : accent, color: saved ? '#96502e' : '#fff',
            }}>
            {saved ? '✓ 저장됨' : saving ? '저장 중…' : '저장'}
          </button>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        <Disclaimer full />

        <div style={{ margin: '16px 0', padding: '12px 14px', background: cardBg, borderRadius: '10px', border: '1px solid #f0e0d5' }}>
          <div style={{ fontSize: '11px', color: sub, marginBottom: '6px' }}>분석 조건</div>
          <div style={{ fontSize: '12px', color: '#96502e', lineHeight: 1.7 }}>
            출산예정일 {survey?.dueDate || '-'} · {survey?.method || '-'}<br />
            예정일 전날·당일·다음날 / 부모 {personSummary(parent1) !== '정보 없음' ? '사주 반영' : '-'}
          </div>
        </div>

        {loading && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{
              fontSize: '34px', color: gold, marginBottom: '16px',
              display: 'inline-block',
              animation: 'spin 1.1s linear infinite',
            }}>✦</div>
            <div style={{ color: gold, fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
              아기에게 좋은 날을 찾고 있어요
            </div>
            <div style={{ color: sub, fontSize: '12px', lineHeight: 1.7 }}>
              날짜별 사주를 계산하고 해설을 쓰고 있어요.<br />
              약 10~20초 정도 걸려요. 잠시만 기다려 주세요 😊
            </div>
          </div>
        )}

        {!loading && errMsg && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#c8506e', fontSize: '13px', lineHeight: 1.7 }}>
            {errMsg}
          </div>
        )}

        {!loading && !errMsg && recs.length > 0 && (() => {
          // 탭 라벨 (offset → 라벨)
          const tabLabel = (off: number) => off === -1 ? '예정일 전날' : off === 1 ? '예정일 다음날' : '예정일'
          const current = recs.find(r => r.offset === tabOffset) ?? recs.find(r => r.offset === 0) ?? recs[0]
          // 병원 운영 안내: 공휴일 or 주말
          const holiName = current ? holidays[current.dateKey] : undefined
          const opWarn = holiName
            ? `${holiName}이에요. 담당 병원의 진료·수술 가능 여부를 미리 확인해 주세요.`
            : current?.isWeekend
              ? `주말(${current.weekday}요일)이에요. 담당 병원의 진료·수술 가능 여부를 미리 확인해 주세요.`
              : ''
          return (
          <>
            <div style={{ fontSize: '13px', color: '#96502e', fontWeight: 600, margin: '4px 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ◆ 예정일 전후 출산일
              {aiLoading && <span style={{ fontSize: '11px', color: gold, fontWeight: 400 }}>✨ 해설 작성 중...</span>}
            </div>

            {/* 3일 탭 버튼 (전날 · 예정일 · 다음날) */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[-1, 0, 1].map(off => {
                const r = recs.find(x => x.offset === off)
                const active = tabOffset === off
                return (
                  <button key={off} onClick={() => r && setTabOffset(off)} disabled={!r}
                    style={{
                      flex: 1, padding: '11px 6px', borderRadius: '11px', cursor: r ? 'pointer' : 'default',
                      border: '0.5px solid ' + (active ? accent : '#f0e0d5'),
                      background: active ? accent : '#fff',
                      color: active ? '#fff' : (r ? '#96502e' : '#d8c5b8'),
                      transition: 'all 0.15s ease',
                    }}>
                    <div style={{ fontSize: '12.5px', fontWeight: active ? 700 : 500 }}>{tabLabel(off)}</div>
                    {r && <div style={{ fontSize: '10px', marginTop: '3px', opacity: 0.85 }}>{r.score}점</div>}
                  </button>
                )
              })}
            </div>

            {/* 선택된 날 카드 하나 */}
            {current && (
              <CandidateCard
                key={current.offset}
                c={current}
                note={aiNotes[current.rank]}
                defaultOpen
                opWarn={opWarn}
              />
            )}

            {avoidDays.length > 0 && (
              <>
                <div style={{ fontSize: '13px', color: '#96502e', fontWeight: 600, margin: '22px 0 12px' }}>◆ 피하면 좋은 날</div>
                <div style={{ background: '#fbece4', border: '1px solid #f0d5c5', borderRadius: '12px', padding: '14px' }}>
                  {avoidDays.map((a, i) => (
                    <div key={i} style={{ marginBottom: i < avoidDays.length - 1 ? '10px' : 0 }}>
                      <div style={{ fontSize: '13px', color: '#c8506e', fontWeight: 600, marginBottom: '4px' }}>⚠ {a.dateLabel}</div>
                      {a.reasons.map((r: string, j: number) => (
                        <div key={j} style={{ fontSize: '12px', color: '#b06a52', lineHeight: 1.6 }}>· {r}</div>
                      ))}
                    </div>
                  ))}
                  <div style={{ fontSize: '11px', color: sub, marginTop: '8px' }}>전통적으로 이런 날은 피해왔어요.</div>
                </div>
              </>
            )}

            {/* 전문가 상담 연결 (출산 택일 상담) */}
            <div style={{ marginTop: '22px' }}>
              <ConsultButton priceKey="birth" mode="birth" />
            </div>
          </>
          )
        })()}

        <button
          onClick={() => router.push('/manseryeok/birth-timing/birth-storage')}
          style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '12px', background: '#fff', border: '1px solid #f0e0d5', color: '#96502e', fontSize: '13px', cursor: 'pointer' }}>
          ↩ 보관함으로
        </button>

        <div style={{ marginTop: '16px' }}>
          <Disclaimer />
        </div>
      </div>
    </main>
  )
}

export default function BirthResultPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF6F0' }}>
        <div style={{ color: '#96502e' }}>로딩 중...</div>
      </div>
    }>
      <BirthResultInner />
    </Suspense>
  )
}
