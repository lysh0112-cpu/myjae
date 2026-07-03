'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface Props {
  consultationId: string | null
  saju?: { pillar: string; stem: string; branch: string }[]
  gender?: string
  calType?: string
  yearParam?: number
  monthParam?: number
  dayParam?: number
  hourIdx?: number | null
}

type CoupleResult = {
  totalScore?: number
  grade?: string
  gradeDesc?: string
  scoreDetails?: Record<string, number | boolean | undefined>
}
type CoupleRow = {
  mode?: string
  person_a_birth?: Record<string, string>
  person_b_birth?: Record<string, string>
  result?: CoupleResult
}

type MulsangRow = {
  image_url?: string | null
  style?: string | null
  commentary?: {
    title?: string
    subject?: string
    environment?: string
    yongsin?: string
    advice?: string
  } | null
}

// 개명(이름풀이) 결과 타입
type NamingGrade = { grade?: string; detail?: string }
type NamingRow = {
  kind?: string | null
  hangul_name?: string | null
  hanja_name?: string | null
  result?: {
    yongsinBohwan?: NamingGrade
    resourceFlow?: NamingGrade
    soundFlow?: NamingGrade
    suri?: { grade?: string; gyeok?: { label: string; name: string; fortune: string }[] }
    overallGrade?: string
  } | null
  commentary?: {
    title?: string
    summary?: string
    good?: string
    improve?: string
    advice?: string
  } | null
  target_birth?: Record<string, string> | null
}

const MODE_KO: Record<string, string> = {
  couple: '연인 궁합',
  married: '부부 궁합',
  prewedding: '예비부부',
  birth: '출산 택일',
}

const SCORE_LABELS: { key: string; label: string }[] = [
  { key: 'iljuScore', label: '일주 궁합' },
  { key: 'yongsinScore', label: '용신' },
  { key: 'ohaengScore', label: '오행' },
  { key: 'johuScore', label: '조후' },
  { key: 'yeonScore', label: '연지' },
  { key: 'wolScore', label: '월지' },
]

function birthText(b?: Record<string, string>): string {
  if (!b) return '-'
  const g = b.gender ? b.gender + ' · ' : ''
  const cal = b.calType || '양력'
  const h = b.hour && b.hour !== '모름' ? ' ' + b.hour + '시' : ''
  return g + cal + ' ' + b.year + '.' + b.month + '.' + b.day + h
}

function namingGradeColor(g?: string) {
  if (g === '좋음') return '#7BC86C'
  if (g === '아쉬움') return '#E0A04A'
  return '#9a98b0'
}

export default function CustomerAiAnalysis({
  consultationId, saju, gender, calType,
  yearParam, monthParam, dayParam, hourIdx,
}: Props) {
  const [freeAnalysis, setFreeAnalysis] = useState('')
  const [paidAnalysis, setPaidAnalysis] = useState('')
  const [couple, setCouple] = useState<CoupleRow | null>(null)
  const [mulsang, setMulsang] = useState<MulsangRow | null>(null)
  const [naming, setNaming] = useState<NamingRow | null>(null)
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)

  useEffect(() => {
    if (!consultationId) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('consultations')
        .select('ai_analysis, ai_free_analysis')
        .eq('id', consultationId)
        .single()
      if (data) {
        setFreeAnalysis(data.ai_free_analysis || '')
        setPaidAnalysis(data.ai_analysis || '')
      }
      const { data: cp } = await supabase
        .from('couples')
        .select('mode, person_a_birth, person_b_birth, result')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setCouple((cp as CoupleRow) || null)

      const { data: ms } = await supabase
        .from('mulsang_images')
        .select('image_url, style, commentary')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setMulsang((ms as MulsangRow) || null)

      const { data: nm } = await supabase
        .from('namings')
        .select('kind, hangul_name, hanja_name, result, commentary, target_birth')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      setNaming((nm as NamingRow) || null)

      setLoading(false)
    }
    load()
  }, [consultationId])

  async function handleGenerate() {
    if (!saju || saju.length === 0) return
    setGenerating(true)
    try {
      const sajuText = saju.map(s => s.pillar + ': ' + s.stem + s.branch).join(', ')
      const hourText = hourIdx === null || hourIdx === undefined
        ? '모름'
        : ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'][hourIdx] + '시'

      const prompt = '사주 분석 전문가로서 아래 사주를 10가지 항목으로 분석해주세요.\n'
        + '마크다운 기호는 절대 쓰지 마세요. 각 항목 2~3문장, 100자 이내.\n\n'
        + '성별: ' + gender + '성 / 생년월일: ' + calType + ' ' + yearParam + '년 ' + monthParam + '월 ' + dayParam + '일\n'
        + '태어난 시: ' + hourText + ' / 사주: ' + sajuText + '\n\n'
        + '1 용신 2 성격 3 건강 4 연애결혼 5 직업 6 재물 7 사업 8 자녀 9 노후 10 10년운세'

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const rawText = data.content?.find((c: { type: string }) => c.type === 'text')?.text || ''
      const cleaned = cleanMarkdown(rawText)
      setPaidAnalysis(cleaned)
      if (consultationId) {
        await supabase.from('consultations').update({ ai_analysis: cleaned }).eq('id', consultationId)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setGenerating(false)
    }
  }

  if (!consultationId) return null

  if (loading) {
    return (
      <div className="rounded-2xl p-4 text-center" style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="animate-spin text-2xl">✦</div>
      </div>
    )
  }

  const hasAny = Boolean(freeAnalysis || paidAnalysis || couple || mulsang || naming)
  const r = couple?.result
  const sd = r?.scoreDetails
  const scoreRows = sd
    ? SCORE_LABELS.filter(x => typeof sd[x.key] === 'number')
    : []

  const headerLabel = mulsang ? '고객이 본 물상도'
    : couple ? '고객이 본 궁합 분석'
    : naming ? '고객이 본 이름 풀이'
    : '고객이 본 사주 풀이'

  const nr = naming?.result
  const nc = naming?.commentary

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.15)' }}>

      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2">
          <span>🤖</span>
          <span className="text-sm font-bold text-white">{headerLabel}</span>
        </div>
        {hasAny ? (
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(76,175,80,0.2)', color: '#4caf50' }}>고객 조회분</span>
        ) : null}
      </div>

      {hasAny ? (
        <div className="p-4 space-y-3">

          {mulsang ? (
            <div className="rounded-xl overflow-hidden" style={{ background: 'rgba(97,153,34,0.08)', border: '1px solid rgba(151,196,89,0.3)' }}>
              {mulsang.image_url ? (
                <img src={mulsang.image_url} alt="물상도" style={{ width: '100%', display: 'block' }} />
              ) : null}
              <div className="p-4">
                <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#97c459' }}>
                  <span>🖼️</span>
                  <span>물상도 (사주 그림)</span>
                </div>
                {mulsang.commentary?.title ? (
                  <div className="text-sm font-bold mb-2" style={{ color: '#e0dce8' }}>&quot;{mulsang.commentary.title}&quot;</div>
                ) : null}
                {[
                  { label: '주인공(나)', text: mulsang.commentary?.subject },
                  { label: '환경', text: mulsang.commentary?.environment },
                  { label: '핵심 에너지(용신)', text: mulsang.commentary?.yongsin },
                  { label: '삶의 조언', text: mulsang.commentary?.advice },
                ].filter(x => x.text).map((x, i) => (
                  <div key={i} className="mb-2">
                    <div className="text-xs" style={{ color: '#97c459' }}>{x.label}</div>
                    <div className="text-sm leading-relaxed" style={{ color: '#e0dce8' }}>{x.text}</div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {naming ? (
            <div className="rounded-xl p-4" style={{ background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.3)' }}>
              <div className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#FAC775' }}>
                <span>✏️</span>
                <span>{naming.kind === 'newborn' ? '아기 이름 풀이' : '이름 풀이'}</span>
                {nr?.overallGrade ? (
                  <span className="ml-auto text-sm font-bold" style={{ color: namingGradeColor(nr.overallGrade) }}>{nr.overallGrade}</span>
                ) : null}
              </div>

              {/* 이름 (한자 · 한글) */}
              {(naming.hanja_name || naming.hangul_name) ? (
                <div className="text-center mb-3">
                  <div className="text-2xl font-bold" style={{ color: '#FAC775', letterSpacing: '3px' }}>{naming.hanja_name || ''}</div>
                  <div className="text-xs mt-0.5" style={{ color: '#e0dce8' }}>{naming.hangul_name || ''}</div>
                </div>
              ) : null}

              {/* 아기 인적사항(있으면) */}
              {naming.target_birth ? (
                <div className="text-xs mb-3" style={{ color: '#c8c4d8' }}>
                  · 대상: {birthText(naming.target_birth)}
                </div>
              ) : null}

              {/* AI 해설 */}
              {nc?.title ? (
                <div className="text-sm font-bold mb-2" style={{ color: '#e0dce8' }}>&quot;{nc.title}&quot;</div>
              ) : null}
              {[
                { label: '종합', text: nc?.summary },
                { label: '좋은 점', text: nc?.good },
                { label: '더 좋아지려면', text: nc?.improve },
                { label: '조언', text: nc?.advice },
              ].filter(x => x.text).map((x, i) => (
                <div key={i} className="mb-2">
                  <div className="text-xs" style={{ color: '#FAC775' }}>{x.label}</div>
                  <div className="text-sm leading-relaxed" style={{ color: '#e0dce8' }}>{x.text}</div>
                </div>
              ))}

              {/* 4가지 분석 등급 */}
              {nr ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-3 mt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: '#b0aec8' }}>
                  {[
                    { label: '사주 보완(용신)', g: nr.yongsinBohwan?.grade },
                    { label: '한자 기운', g: nr.resourceFlow?.grade },
                    { label: '소리 기운', g: nr.soundFlow?.grade },
                    { label: '이름 수리', g: nr.suri?.grade },
                  ].filter(x => x.g).map((x, i) => (
                    <div key={i}>
                      <span>{x.label} </span>
                      <span style={{ color: namingGradeColor(x.g) }}>{x.g}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {couple && r ? (
            <div className="rounded-xl p-4" style={{ background: 'rgba(212,83,126,0.1)', border: '1px solid rgba(212,83,126,0.3)' }}>
              <div className="text-xs font-bold mb-3 flex items-center gap-1.5" style={{ color: '#ED93B1' }}>
                <span>💞</span>
                <span>{MODE_KO[couple.mode || 'couple'] || '궁합'} 계산</span>
                {typeof r.totalScore === 'number' ? (
                  <span className="ml-auto text-sm" style={{ color: '#FAC775' }}>{r.totalScore}점</span>
                ) : null}
              </div>

              {r.grade ? (
                <div className="text-sm font-bold mb-2" style={{ color: '#e0dce8' }}>
                  <span>{r.grade}</span>
                  {r.gradeDesc ? (
                    <span className="text-xs font-normal block mt-0.5" style={{ color: '#b0aec8' }}>{r.gradeDesc}</span>
                  ) : null}
                </div>
              ) : null}

              <div className="text-xs space-y-1 mb-3" style={{ color: '#c8c4d8' }}>
                <div>· 첫째: {birthText(couple.person_a_birth)}</div>
                <div>· 둘째: {birthText(couple.person_b_birth)}</div>
              </div>

              {scoreRows.length > 0 ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: '#b0aec8' }}>
                  {scoreRows.map(x => (
                    <div key={x.key}>
                      <span>{x.label} </span>
                      <span style={{ color: '#FAC775' }}>{String(sd![x.key])}</span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {freeAnalysis ? (
            <div className="rounded-xl p-4" style={{ background: 'rgba(60,52,137,0.15)', border: '1px solid rgba(60,52,137,0.3)' }}>
              <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#b0aec8' }}>
                <span>📖</span>
                <span>기본 풀이</span>
                <span style={{ color: '#4caf50' }}>(무료로 본 내용)</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#e0dce8' }}>{freeAnalysis}</p>
            </div>
          ) : null}

          {paidAnalysis && !mulsang && !naming ? (
            <div className="rounded-xl p-4" style={{ background: 'rgba(250,199,117,0.08)', border: '1px solid rgba(250,199,117,0.2)' }}>
              <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: '#FAC775' }}>
                <span>✨</span>
                <span>{couple ? '궁합 해설' : '상세 풀이'}</span>
                <span style={{ color: '#FAC775', opacity: 0.8 }}>(유료 결제분)</span>
              </div>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: '#e0dce8' }}>{paidAnalysis}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="p-4">
          <p className="text-xs mb-3 text-center" style={{ color: '#8a88a0' }}>
            이 고객이 조회한 풀이가 없습니다. 전화 상담 등을 위해 직접 생성할 수 있어요.
          </p>
          <button onClick={handleGenerate} disabled={generating || !saju?.length}
            className="w-full py-3 rounded-xl text-sm font-bold disabled:opacity-40 transition-all active:scale-95"
            style={{ background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)', color: '#1a1a18' }}>
            {generating ? 'AI 분석 생성 중...' : 'AI 전체 분석 생성 (1~10번)'}
          </button>
        </div>
      )}
    </div>
  )
}
