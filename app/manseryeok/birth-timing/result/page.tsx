'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import PageHeader from '@/app/components/common/PageHeader'
import ConsultButton from '@/app/components/common/ConsultButton'
import { runBirthTiming, type Recommendation, type AvoidDay } from '../lib/recommend'

const cardBg = '#13132a'
const sub = '#5555aa'
const text = '#e8e4ff'
const gold = '#FAC775'

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
    <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#d88', lineHeight: 1.6 }}>
      {full
        ? '※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 출산일·수술일 결정은 산모와 아기의 건강을 최우선으로, 반드시 담당 산부인과 전문의와 상의해 결정하세요.'
        : '※ 전통 명리 참고용 · 최종 결정은 전문의와 상의하세요.'}
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: gold, fontSize: '12px', letterSpacing: '1px' }}>
      {'★'.repeat(n)}<span style={{ color: '#444466' }}>{'★'.repeat(5 - n)}</span>
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

async function getParentDayStem(p: PersonInput | null): Promise<string | undefined> {
  if (!p || !p.year || !p.month || !p.day) return undefined
  try {
    const url = `/api/lunar?year=${p.year}&month=${p.month}&day=${p.day}&calType=${p.calType}&leapMonth=0`
    const res = await fetch(url)
    const data = await res.json()
    if (data.error) return undefined
    const g: string = data.dayGanji || ''
    const m = g.match(/\(([^)]+)\)/)
    if (m && m[1].length >= 1) return m[1][0]
    if (g.length >= 1) return g[0]
    return undefined
  } catch {
    return undefined
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
`${toneBlock ? toneBlock + '\n\n' : ''}아래는 출산택일로 추천된 5개 일시와 각 아기의 사주입니다.
부모가 바라는 점: ${wishesText}

${list}

각 순위마다 그 날 태어날 아기의 기질을 한 줄(20자 내외)로 표현하고,
1순위는 추가로 2~3문장의 상세 해설을 써 주세요.

[반드시 지킬 안전 규칙]
- 의학적 단정이나 건강 예언은 절대 하지 마세요. (이것은 의료 조언이 아닙니다)
- 반드시 아래 JSON 형식으로만 답하세요. 다른 말은 절대 쓰지 마세요.

{"1":{"oneLine":"...","detail":"..."},"2":{"oneLine":"..."},"3":{"oneLine":"..."},"4":{"oneLine":"..."},"5":{"oneLine":"..."}}`

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

function CandidateCard({ c, note, defaultOpen }: { c: Recommendation; note?: AiNote; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const b = c.breakdown
  const stars = [
    { label: '오행 균형', n: b.starOhaeng },
    { label: '온도(조후)', n: b.starJohu },
    { label: '지지 안정', n: b.starJiji },
  ]
  return (
    <div style={{ background: cardBg, borderRadius: '12px', border: '1px solid ' + (c.rank === 1 ? 'rgba(250,199,117,0.35)' : 'rgba(255,255,255,0.06)'), marginBottom: '10px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: '16px' }}>{rankBadge(c.rank)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: text, fontWeight: 600 }}>{c.dateLabel}</div>
          <div style={{ fontSize: '12px', color: sub, marginTop: '2px' }}>{c.hourLabel}</div>
          {note?.oneLine && (
            <div style={{ fontSize: '12px', color: '#c8b0ff', marginTop: '4px', lineHeight: 1.4 }}>“{note.oneLine}”</div>
          )}
        </div>
        <span style={{ fontSize: '15px', fontWeight: 700, color: c.rank === 1 ? gold : '#c8b0ff' }}>{c.score}점</span>
        <span style={{ fontSize: '12px', color: sub }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0 14px 16px' }}>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '12px' }}>
            <div style={{ fontSize: '11px', color: sub, marginBottom: '4px' }}>아기 사주</div>
            <div style={{ fontSize: '15px', color: '#c8b0ff', letterSpacing: '3px', marginBottom: '14px' }}>{c.saju}</div>

            {stars.map((s, i) => (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#b8b4d8' }}>{s.label}</span>
                  <Stars n={s.n} />
                </div>
              </div>
            ))}

            {note?.detail && (
              <div style={{ background: 'rgba(250,199,117,0.08)', borderRadius: '8px', padding: '10px 12px', margin: '12px 0' }}>
                <div style={{ fontSize: '11px', color: gold, marginBottom: '4px' }}>이 아이는</div>
                <div style={{ fontSize: '13px', color: text, lineHeight: 1.6 }}>{note.detail}</div>
              </div>
            )}

            {c.parentNote && (
              <div style={{ background: 'rgba(119,102,221,0.1)', borderRadius: '8px', padding: '10px 12px', margin: '12px 0' }}>
                <div style={{ fontSize: '11px', color: sub, marginBottom: '3px' }}>부모와의 관계</div>
                <div style={{ fontSize: '13px', color: text, lineHeight: 1.5 }}>♥ {c.parentNote}</div>
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

  useEffect(() => {
    let cancelled = false

    async function run() {
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
        const [ds1, ds2] = await Promise.all([getParentDayStem(p1), getParentDayStem(p2)])
        const parents = [{ dayStem: ds1 }, { dayStem: ds2 }]

        const timePref =
          sv.timePref === '평일오전' ? 'morning'
          : sv.timePref === '평일오후' ? 'afternoon'
          : 'any'

        const result = await runBirthTiming(sv.dueDate, {
          timePref: timePref as 'morning' | 'afternoon' | 'any',
          excludeWeekend: true,
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
  }, [sp])

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

  return (
    <main style={{ minHeight: '100vh', background: '#0d0d1a', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader
        title="출산 시기 결과"
        subtitle="아기에게 좋은 출산일이에요"
        onBack={() => router.back()}
      />

      <div style={{ padding: '16px' }}>
        <Disclaimer full />

        <div style={{ margin: '16px 0', padding: '12px 14px', background: cardBg, borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '11px', color: sub, marginBottom: '6px' }}>분석 조건</div>
          <div style={{ fontSize: '12px', color: '#b8b4d8', lineHeight: 1.7 }}>
            출산예정일 {survey?.dueDate || '-'} · {survey?.method || '-'}<br />
            예정일 전후 1주 / 부모 {personSummary(parent1) !== '정보 없음' ? '사주 반영' : '-'}
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
          <div style={{ padding: '20px', textAlign: 'center', color: '#ff8888', fontSize: '13px', lineHeight: 1.7 }}>
            {errMsg}
          </div>
        )}

        {!loading && !errMsg && recs.length > 0 && (
          <>
            <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '4px 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ◆ 추천 출산일 <span style={{ fontSize: '11px', color: sub, fontWeight: 400 }}>(탭하면 자세히)</span>
              {aiLoading && <span style={{ fontSize: '11px', color: gold, fontWeight: 400 }}>✨ 해설 작성 중...</span>}
            </div>
            {recs.map(c => <CandidateCard key={c.rank} c={c} note={aiNotes[c.rank]} defaultOpen={c.rank === 1} />)}

            {avoidDays.length > 0 && (
              <>
                <div style={{ fontSize: '13px', color: '#c8c0ff', fontWeight: 600, margin: '22px 0 12px' }}>◆ 피하면 좋은 날</div>
                <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '12px', padding: '14px' }}>
                  {avoidDays.map((a, i) => (
                    <div key={i} style={{ marginBottom: i < avoidDays.length - 1 ? '10px' : 0 }}>
                      <div style={{ fontSize: '13px', color: '#e0a0a0', fontWeight: 600, marginBottom: '4px' }}>⚠ {a.dateLabel}</div>
                      {a.reasons.map((r: string, j: number) => (
                        <div key={j} style={{ fontSize: '12px', color: '#c89090', lineHeight: 1.6 }}>· {r}</div>
                      ))}
                    </div>
                  ))}
                  <div style={{ fontSize: '11px', color: sub, marginTop: '8px' }}>전통적으로 이런 날은 피해왔어요.</div>
                </div>
              </>
            )}

            {/* 전문가 상담 연결 (출산 택일 상담) — 준비중 alert 대신 실제 예약으로 연결 */}
            <div style={{ marginTop: '22px' }}>
              <ConsultButton priceKey="birth" mode="birth" />
            </div>
          </>
        )}

        <button
          onClick={() => router.push('/manseryeok/couple-input')}
          style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '12px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(200,176,255,0.2)', color: '#c8b0ff', fontSize: '13px', cursor: 'pointer' }}>
          ↩ 다시 분석하기
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0d1a' }}>
        <div style={{ color: '#c8b0ff' }}>로딩 중...</div>
      </div>
    }>
      <BirthResultInner />
    </Suspense>
  )
}
