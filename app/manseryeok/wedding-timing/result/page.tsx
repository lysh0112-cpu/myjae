'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import ConsultButton from '@/app/components/common/ConsultButton'
import { runWeddingTiming, type WeddingRecommendation, type WeddingAvoidDay } from '../lib/recommend'
import { saveWeddingRecord, getWeddingRecord } from '@/lib/saju/weddingRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'

const cardBg = '#FFFBF7'
const sub = '#b4785a'
const text = '#3a2e28'
const gold = '#c8783c'

const HOUR_LABELS: Record<string, string> = {
  '-1': '시간 모름',
  '0': '子시(23:30~01:30)', '1': '丑시(01:30~03:30)', '2': '寅시(03:30~05:30)', '3': '卯시(05:30~07:30)',
  '4': '辰시(07:30~09:30)', '5': '巳시(09:30~11:30)', '6': '午시(11:30~13:30)', '7': '未시(13:30~15:30)',
  '8': '申시(15:30~17:30)', '9': '酉시(17:30~19:30)', '10': '戌시(19:30~21:30)', '11': '亥시(21:30~23:30)',
}

interface PersonInput {
  year: string; month: string; day: string; hour: string
  gender: string; calType: string; job: string; mbti: string
  name?: string
}

interface WeddingSurvey {
  startDate: string; endDate: string; dayPref: string; avoidNote: string
}

interface AiNote { oneLine: string; detail?: string }

function Disclaimer({ full }: { full?: boolean }) {
  return (
    <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '10px', padding: '10px 14px', fontSize: '11px', color: '#d88', lineHeight: 1.6 }}>
      {full
        ? '※ 본 분석은 전통 사주명리에 기반한 참고 정보입니다. 실제 예식일은 양가·예식장 사정과 두 분의 형편을 함께 고려해 결정하세요.'
        : '※ 전통 명리 참고용 · 실제 예식일은 양가·예식장 사정과 함께 결정하세요.'}
    </div>
  )
}

function Stars({ n }: { n: number }) {
  return (
    <span style={{ color: gold, fontSize: '12px', letterSpacing: '1px' }}>
      {'★'.repeat(n)}<span style={{ color: '#e8d5c6' }}>{'★'.repeat(5 - n)}</span>
    </span>
  )
}

// 성별로 신랑/신부 아이콘·라벨 결정 (남=신랑🤵, 여=신부👰)
function roleIcon(p: PersonInput | null): string {
  if (p?.gender === '여') return '👰'
  if (p?.gender === '남') return '🤵'
  return '💑'
}

function personSummary(p: PersonInput | null): string {
  if (!p || !p.year) return '정보 없음'
  const hour = HOUR_LABELS[p.hour] ?? '시간 모름'
  return `${p.gender} · ${p.calType} ${p.year}.${p.month}.${p.day} · ${hour}`
}

function rankBadge(rank: number): string {
  return rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `${rank}`
}

const GRADE_COLOR: Record<string, string> = {
  S: '#c8783c', A: '#5a8c5a', B: '#b46e46', C: '#96502e', D: '#c5a590',
}

async function fetchAiNotes(recs: WeddingRecommendation[], survey: WeddingSurvey): Promise<Record<number, AiNote>> {
  const list = recs.map(r =>
    `${r.rank}순위) ${r.dateLabel}, 일진 ${r.ganji}, 점수 ${r.score}(${r.grade}등급), ` +
    `적용 길신: ${r.badges.length ? r.badges.join('·') : '없음'}`
  ).join('\n')

  // 관리자 '어투 관리'의 공통 말투를 불러온다 (화면이라 API로 받음, 실패해도 그냥 진행)
  let toneBlock = ''
  try {
    const tr = await fetch('/api/admin/tone')
    if (tr.ok) {
      const td = await tr.json()
      toneBlock = `${td.tone_rules || ''}\n\n${td.easy_terms || ''}`.trim()
    }
  } catch {}

  // 프롬프트 = [공통 어투] + [택일 기능 지시] + [출력 형식]
  const prompt =
`${toneBlock ? toneBlock + '\n\n' : ''}아래는 두 사람의 결혼택일로 추천된 5개 날짜입니다.
희망 기간: ${survey.startDate} ~ ${survey.endDate}

${list}

각 순위마다 그 날 결혼하면 좋은 점을 한 줄(20자 내외)로 표현하고,
1·2·3순위는 추가로 2~3문장의 상세 해설(detail)을 써 주세요. 4·5순위는 한 줄만.

[반드시 지킬 규칙]
- 적용된 길신(천을귀인·용신·손없는날·천희홍란 등)의 의미를 쉬운 말로 풀어 주세요.
- 반드시 아래 JSON 형식으로만 답하세요. 다른 말은 절대 쓰지 마세요.

{"1":{"oneLine":"...","detail":"..."},"2":{"oneLine":"...","detail":"..."},"3":{"oneLine":"...","detail":"..."},"4":{"oneLine":"..."},"5":{"oneLine":"..."}}`

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

function CandidateCard({ c, note, defaultOpen }: { c: WeddingRecommendation; note?: AiNote; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const b = c.breakdown
  const rows = [
    { label: '천을귀인 (귀인의 도움)', score: b.cheoneul, max: 30 },
    { label: '부부 용신 (기운 보완)', score: b.yongsin, max: 30 },
    { label: '손 없는 날', score: b.sonEopneun, max: 20 },
    { label: '천희·홍란 (혼인 길신)', score: b.cheonhuiHongran, max: 20 },
  ]
  return (
    <div style={{ background: cardBg, borderRadius: '12px', border: '1px solid ' + (c.rank === 1 ? 'rgba(250,199,117,0.35)' : '#f0e0d5'), marginBottom: '10px', overflow: 'hidden' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: '16px' }}>{rankBadge(c.rank)}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '14px', color: text, fontWeight: 600 }}>{c.dateLabel}</div>
          <div style={{ fontSize: '12px', color: sub, marginTop: '2px' }}>일진 {c.ganji} · <span style={{ color: GRADE_COLOR[c.grade] }}>{c.grade}등급</span>{c.holidayName && <span style={{ color: '#e29b9b' }}> · 🎌 {c.holidayName}</span>}</div>
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
            {c.badges.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {c.badges.map((bd, i) => (
                  <span key={i} style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: '#f7ede2', color: gold, border: '1px solid #e8cba8' }}>✦ {bd}</span>
                ))}
              </div>
            )}

            <div style={{ fontSize: '11px', color: sub, marginBottom: '8px' }}>길신 점수</div>
            {rows.map((r, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: '#6b5d54' }}>{r.label}</span>
                  <Stars n={r.score === 0 ? 0 : Math.max(1, Math.round((r.score / r.max) * 5))} />
                </div>
              </div>
            ))}

            {note?.detail && (
              <div style={{ background: '#faf3ec', borderRadius: '8px', padding: '10px 12px', margin: '12px 0' }}>
                <div style={{ fontSize: '11px', color: gold, marginBottom: '4px' }}>이 날은</div>
                <div style={{ fontSize: '13px', color: text, lineHeight: 1.6 }}>{note.detail}</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function WeddingResultInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [groom, setGroom] = useState<PersonInput | null>(null)
  const [bride, setBride] = useState<PersonInput | null>(null)
  const [survey, setSurvey] = useState<WeddingSurvey | null>(null)

  const [loading, setLoading] = useState(true)
  const [recs, setRecs] = useState<WeddingRecommendation[]>([])
  const [avoidDays, setAvoidDays] = useState<WeddingAvoidDay[]>([])
  const [aiNotes, setAiNotes] = useState<Record<number, AiNote>>({})
  const [aiLoading, setAiLoading] = useState(false)
  const [errMsg, setErrMsg] = useState('')
  // 보관함 저장/다시보기
  const recordId = sp.get('recordId') || undefined
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved'>(recordId ? 'saved' : 'idle')

  useEffect(() => {
    let cancelled = false

    async function run() {
      // ── 보관함 다시보기: recordId 있으면 저장된 스냅샷을 그대로 로드 (계산·AI 없음) ──
      if (recordId) {
        try {
          const rec = await getWeddingRecord(recordId)
          const snap = rec?.resultData as {
            recs?: WeddingRecommendation[]; avoidDays?: WeddingAvoidDay[]
            aiNotes?: Record<number, AiNote>; survey?: WeddingSurvey
            groom?: PersonInput; bride?: PersonInput
          } | undefined
          if (!cancelled && snap?.recs) {
            setGroom(snap.groom ?? null); setBride(snap.bride ?? null)
            setSurvey(snap.survey ?? null)
            setRecs(snap.recs); setAvoidDays(snap.avoidDays ?? [])
            setAiNotes(snap.aiNotes ?? {})
            setLoading(false)
            return
          }
          if (!cancelled) { setErrMsg('저장된 결과를 불러오지 못했어요.'); setLoading(false) }
        } catch {
          if (!cancelled) { setErrMsg('저장된 결과를 불러오지 못했어요.'); setLoading(false) }
        }
        return
      }

      let p1: PersonInput | null = null
      let p2: PersonInput | null = null
      let sv: WeddingSurvey | null = null
      try {
        const a = sp.get('p1'); const b = sp.get('p2'); const s = sp.get('survey')
        if (a) p1 = JSON.parse(decodeURIComponent(a))
        if (b) p2 = JSON.parse(decodeURIComponent(b))
        if (s) sv = JSON.parse(decodeURIComponent(s))
      } catch {}

      if (!cancelled) { setGroom(p1); setBride(p2); setSurvey(sv) }

      if (!sv || !sv.startDate || !sv.endDate) {
        if (!cancelled) { setErrMsg('기간 정보가 없어요. 이전 화면에서 다시 입력해 주세요.'); setLoading(false) }
        return
      }

      try {
        const result = await runWeddingTiming({
          startDate: sv.startDate,
          endDate: sv.endDate,
          dayPref: (sv.dayPref === 'all' ? 'all' : sv.dayPref === 'holiday' ? 'holiday' : 'weekend'),
          groom: p1,
          bride: p2,
        })

        if (cancelled) return
        if (result.error) { setErrMsg(result.error); setLoading(false); return }

        setRecs(result.recommendations)
        setAvoidDays(result.avoidDays)
        if (result.recommendations.length === 0) {
          setErrMsg('조건에 맞는 길일을 찾지 못했어요. 기간을 넓히거나 요일 조건을 바꿔서 다시 시도해 주세요.')
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

  // ★ 예약 시 상담사 화면으로 넘기기 위해 결과 요약을 세션에 저장
  //    (개명·궁합·물상도와 동일 방식. consultant-select가 wedding_full을 읽어 weddings에 저장)
  //    kind='find' (좋은 날 찾기) · 추천 길일 5개 전부 + 조건 + 신랑신부 인적사항
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!survey || recs.length === 0) return
    try {
      sessionStorage.setItem('wedding_full', JSON.stringify({
        kind: 'find',
        start_date: survey.startDate,
        end_date: survey.endDate,
        day_pref: survey.dayPref,
        groom,
        bride,
        recommendations: recs.map(r => ({
          rank: r.rank,
          dateLabel: r.dateLabel,
          ganji: r.ganji,
          score: r.score,
          grade: r.grade,
          badges: r.badges,
          holidayName: r.holidayName ?? null,
        })),
        avoid_days: avoidDays.map(a => ({ dateLabel: a.dateLabel, reasons: a.reasons })),
        ai_notes: aiNotes,
      }))
    } catch {}
  }, [survey, recs, avoidDays, aiNotes, groom, bride])

  // ── 보관함 저장 (추천 결과 스냅샷 — 다시보기용) ──
  const toInput = (p: PersonInput | null): SavedInputData => ({
    gender: p?.gender || '', calType: p?.calType || '양력',
    year: p?.year || '', month: p?.month || '', day: p?.day || '',
    leapMonth: '0', hour: p?.hour || '모름',
  })
  async function handleSave() {
    if (saveState !== 'idle' || recs.length === 0 || !survey) return
    setSaveState('saving')
    const name1 = groom?.name || '신랑'
    const name2 = bride?.name || '신부'
    const res = await saveWeddingRecord({
      kind: 'find',
      name1, name2,
      summary: `길일 ${recs.length}개`,
      input1: { ...toInput(groom), name: name1 },
      input2: { ...toInput(bride), name: name2 },
      resultData: { recs, avoidDays, aiNotes, survey, groom, bride },
    })
    setSaveState(res.ok ? 'saved' : 'idle')
    if (!res.ok) alert(res.message || '저장하지 못했어요.')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '480px', margin: '0 auto', paddingBottom: '40px' }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#3a2e28' }}>결혼 길일 결과</div>
          <div style={{ fontSize: 10.5, color: '#5c3a1e' }}>두 분께 좋은 결혼 날짜예요</div>
        </div>
      </div>

      <div style={{ padding: '16px' }}>
        <Disclaimer full />

        <div style={{ margin: '16px 0', padding: '12px 14px', background: cardBg, borderRadius: '10px', border: '1px solid #f0e0d5' }}>
          <div style={{ fontSize: '11px', color: sub, marginBottom: '6px' }}>분석 조건</div>
          <div style={{ fontSize: '12px', color: '#6b5d54', lineHeight: 1.7 }}>
            기간 {survey?.startDate || '-'} ~ {survey?.endDate || '-'} · {survey?.dayPref === 'all' ? '평일 포함' : survey?.dayPref === 'holiday' ? '공휴일 포함' : '주말만'}<br />
            {roleIcon(groom)} {personSummary(groom)}<br />
            {roleIcon(bride)} {personSummary(bride)}
          </div>
        </div>

        {loading && (
          <div style={{ padding: '48px 0', textAlign: 'center' }}>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <div style={{ fontSize: '34px', color: gold, marginBottom: '16px', display: 'inline-block', animation: 'spin 1.1s linear infinite' }}>✦</div>
            <div style={{ color: gold, fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>
              두 분께 좋은 날을 찾고 있어요
            </div>
            <div style={{ color: sub, fontSize: '12px', lineHeight: 1.7 }}>
              날짜별 길신을 계산하고 해설을 쓰고 있어요.<br />
              기간이 길면 조금 더 걸려요. 잠시만 기다려 주세요 😊
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
            <div style={{ fontSize: '13px', color: '#96502e', fontWeight: 600, margin: '4px 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ◆ 추천 결혼 길일 <span style={{ fontSize: '11px', color: sub, fontWeight: 400 }}>(탭하면 자세히)</span>
              {aiLoading && <span style={{ fontSize: '11px', color: gold, fontWeight: 400 }}>✨ 해설 작성 중...</span>}
            </div>
            {recs.map(c => <CandidateCard key={c.rank} c={c} note={aiNotes[c.rank]} defaultOpen={c.rank === 1} />)}

            {avoidDays.length > 0 && (
              <>
                <div style={{ fontSize: '13px', color: '#96502e', fontWeight: 600, margin: '22px 0 12px' }}>◆ 피하면 좋은 날</div>
                <div style={{ background: 'rgba(255,120,120,0.06)', border: '1px solid rgba(255,120,120,0.18)', borderRadius: '12px', padding: '14px' }}>
                  {avoidDays.map((a, i) => (
                    <div key={i} style={{ marginBottom: i < avoidDays.length - 1 ? '10px' : 0 }}>
                      <div style={{ fontSize: '13px', color: '#e0a0a0', fontWeight: 600, marginBottom: '4px' }}>⚠ {a.dateLabel}</div>
                      {a.reasons.map((r: string, j: number) => (
                        <div key={j} style={{ fontSize: '12px', color: '#c89090', lineHeight: 1.6 }}>· {r}</div>
                      ))}
                    </div>
                  ))}
                  <div style={{ fontSize: '11px', color: sub, marginTop: '8px' }}>전통적으로 혼례에 피해온 날이에요.</div>
                </div>
              </>
            )}

            {/* 전문가 상담 연결 (예비부부 상담) — 준비중 alert 대신 실제 예약으로 연결 */}
            <div style={{ marginTop: '22px' }}>
              <ConsultButton priceKey="prewedding" mode="prewedding" />
            </div>
          </>
        )}

        {!loading && !errMsg && recs.length > 0 && (
          <button
            onClick={handleSave}
            disabled={saveState !== 'idle'}
            style={{ width: '100%', marginTop: '16px', padding: '13px', borderRadius: '12px',
              background: saveState === 'saved' ? '#e8f0e0' : gold,
              border: 'none', color: saveState === 'saved' ? '#5a8c5a' : '#1a1208',
              fontSize: '14px', fontWeight: 600, cursor: saveState === 'idle' ? 'pointer' : 'default' }}>
            {saveState === 'saved' ? '✓ 보관함에 저장됨' : saveState === 'saving' ? '저장 중…' : '💾 이 결과 보관함에 저장'}
          </button>
        )}

        <button
          onClick={() => router.push('/manseryeok/wedding-timing/wedding-storage')}
          style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '12px', background: '#faf3ec', border: '1px solid #f0e0d5', color: '#96502e', fontSize: '13px', cursor: 'pointer' }}>
          📋 결혼택일 보관함
        </button>

        <div style={{ marginTop: '16px' }}>
          <Disclaimer />
        </div>
      </div>
    </main>
  )
}

export default function WeddingResultPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF6F0' }}>
        <div style={{ color: '#96502e' }}>로딩 중...</div>
      </div>
    }>
      <WeddingResultInner />
    </Suspense>
  )
}
