'use client'
import { Suspense, useState, useEffect, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'
import { calcSimsanOhaeng, toPercentList } from '@/lib/saju/simsanOhaeng'
import { buildMulsangPrompt, STYLE_CONFIGS } from '@/lib/saju/mulsangPrompt'
import { buildMulsangTongbyeonPrompt, type Ohaeng } from '@/lib/saju/mulsangTongbyeonPrompt'
import { MULSANG_QUESTIONS, groupMulsangByCategory } from '@/lib/saju/mulsangQuestions'
import OhaengPentagon from '@/app/manseryeok/result-new/OhaengPentagon'
import PageHeader from '@/app/components/common/PageHeader'
import { supabase } from '@/lib/supabase'
import { fromProfile } from '@/lib/saju/myInfo'
import type { SajuQuestion } from '@/lib/saju/questions'

interface Commentary {
  title: string
  subject: string
  environment: string
  yongsin: string
  advice: string
}

const MY_INFO_KEY = 'myinfo'
const MULSANG_RESULT_KEY = 'mulsang_last_result_v3'

const HOUR_LABEL = [
  '한밤중(子시)', '늦은밤(丑시)', '새벽(寅시)', '이른아침(卯시)',
  '아침(辰시)', '늦은아침(巳시)', '한낮(午시)', '이른오후(未시)',
  '오후(申시)', '저녁무렵(酉시)', '저녁(戌시)', '밤(亥시)',
]
const SEASON_LABEL: Record<string, string> = {
  寅: '이른 봄', 卯: '봄', 辰: '늦봄',
  巳: '초여름', 午: '여름', 未: '늦여름',
  申: '초가을', 酉: '가을', 戌: '늦가을',
  亥: '초겨울', 子: '겨울', 丑: '늦겨울',
}

function MulsangInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [info, setInfo] = useState<{
    gender: string; calType: string
    year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
    name?: string
  } | null>(null)

  const [drawPrice, setDrawPrice] = useState(19900)
  const [drawActive, setDrawActive] = useState(true)
  const [payOpen, setPayOpen] = useState(false)

  useEffect(() => {
    supabase
      .from('analysis_prices')
      .select('price, active')
      .eq('price_key', 'mulsang_ai')
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setDrawPrice(data.price); setDrawActive(data.active) }
      })
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadInfo() {
      // (1) URL 우선 — 다른 사람 선택 / 가족지인 목록에서 넘어온 경우
      const urlYear = parseInt(sp.get('year') || '0')
      if (urlYear) {
        const hourParam = sp.get('hour')
        if (!cancelled) setInfo({
          gender: sp.get('gender') || '남',
          calType: sp.get('calType') || '양력',
          year: urlYear,
          month: parseInt(sp.get('month') || '0'),
          day: parseInt(sp.get('day') || '0'),
          leapMonth: sp.get('leapMonth') || '0',
          hourIdx: hourParam === '모름' || hourParam === null ? null : parseInt(hourParam),
        })
        return
      }

      // (2) URL 없으면(="나" 선택) 로그인한 내 정보(profiles) = 내 사주
      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          const { data: p } = await supabase.from('profiles')
            .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
            .eq('id', u.user.id).single()
          const prof = fromProfile(p)
          if (prof && !cancelled) {
            setInfo({
              gender: prof.gender,
              calType: prof.calType,
              year: parseInt(prof.year),
              month: parseInt(prof.month),
              day: parseInt(prof.day),
              leapMonth: prof.leapMonth || '0',
              hourIdx: prof.hour === '모름' ? null : parseInt(prof.hour),
            })
            return
          }
        }
      } catch {}

      // (3) 그래도 없으면 localStorage myinfo (예전 방식 보조)
      const saved = localStorage.getItem(MY_INFO_KEY)
      if (saved) {
        try {
          const m = JSON.parse(saved)
          if (m.year && !cancelled) {
            setInfo({
              gender: m.gender || '남',
              calType: m.calType || '양력',
              year: parseInt(m.year),
              month: parseInt(m.month),
              day: parseInt(m.day),
              leapMonth: m.leapMonth || '0',
              hourIdx: m.hour === '모름' || m.hour == null ? null : parseInt(m.hour),
            })
          }
        } catch {}
      }
    }
    loadInfo()
    return () => { cancelled = true }
  }, [sp])

  const { saju, dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  const [style, setStyle] = useState<string>('oriental')
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [commentary, setCommentary] = useState<Commentary | null>(null)

  // ── 오행·용신·월지 (그림 해설 통변 재료) ──
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
  const hourBranch = saju.find(p => p.pillar === '시주')?.branch ?? null
  const solarMonth = info?.month ?? 0
  const solarDay = info?.day ?? 0
  const ohaeng = useMemo(
    () => (saju.length > 0 ? toPercentList(calcSimsanOhaeng(saju, solarMonth, solarDay, hourBranch)) : []),
    [saju, solarMonth, solarDay, hourBranch],
  )
  const yongsinResult = useMemo(
    () => (saju.length > 0 && dayStem ? calcYongsin(saju, dayStem) : null),
    [saju, dayStem],
  )
  // 오행 점수(100점)·최강·결핍 (통변 프롬프트용)
  const ohaengScore = useMemo(() => {
    const s: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
    for (const o of ohaeng) s[o.el as Ohaeng] = o.pct
    return s
  }, [ohaeng])
  const topElement = useMemo<Ohaeng>(() => {
    let top: Ohaeng = '목'; let max = -1
    for (const k of ['목', '화', '토', '금', '수'] as Ohaeng[]) if (ohaengScore[k] > max) { max = ohaengScore[k]; top = k }
    return top
  }, [ohaengScore])
  const lackElements = useMemo<Ohaeng[]>(
    () => (['목', '화', '토', '금', '수'] as Ohaeng[]).filter(k => ohaengScore[k] <= 10),
    [ohaengScore],
  )
  const yongsinElement = (yongsinResult?.yongsin ?? '') as Ohaeng | ''

  // ── 통변(그림 해설) 상태 ──
  const [showTongbyeon, setShowTongbyeon] = useState(false)      // 통변 영역 펼침
  const [pickedQ, setPickedQ] = useState<Set<string>>(new Set()) // 고른 질문 id
  const [tongLoading, setTongLoading] = useState(false)
  const [tongResult, setTongResult] = useState<string | null>(null)
  const [openCat, setOpenCat] = useState<string | null>(null)   // 아코디언: 열린 대분류
  const [openWonguk, setOpenWonguk] = useState(false)           // 사주 원국 아코디언

  useEffect(() => {
    const saved = localStorage.getItem(MULSANG_RESULT_KEY)
    if (saved) {
      try {
        const r = JSON.parse(saved)
        if (r.commentary) setCommentary(r.commentary)
        if (r.imageUrl) setImageUrl(r.imageUrl)
        if (r.style) setStyle(r.style)
      } catch {}
    }
  }, [])

  const gold = '#FAC775'
  const cardBg = '#2C2C2A'
  const border = '1px solid rgba(250,199,117,0.15)'

  if (!info) {
    return (
      <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
        <PageHeader title="내 사주가 그림이 된다면?" onBack={() => router.push('/')} />
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8a88a0' }}>
          <p style={{ marginBottom: '20px' }}>먼저 홈에서 사주 정보를 입력해주세요.</p>
          <button onClick={() => router.push('/')}
            style={{ padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontWeight: 'bold', cursor: 'pointer' }}>
            홈으로 가기 →
          </button>
        </div>
      </main>
    )
  }

  async function doGenerate() {
    setPayOpen(false)
    if (!saju || saju.length === 0 || !dayStem) return
    setLoading(true)
    setImageUrl(null)
    setCommentary(null)
    try {
      const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
      const yongsinResult = calcYongsin(saju, dayStem)
      const built = buildMulsangPrompt({
        dayStem,
        monthBranch,
        stems: saju.map(p => p.stem),
        elementScores: yongsinResult.score,
        yongsin: yongsinResult.yongsin,
        style,
      })
      const sajuText = saju.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(', ')
      const seasonKo = SEASON_LABEL[monthBranch] ?? '계절 정보 없음'
      const hourKo = info && info.hourIdx !== null ? HOUR_LABEL[info.hourIdx] : '시간 모름'
      const res = await fetch('/api/mulsang', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: built.prompt,
          dayStem,
          dayElement: built.dayElement,
          yongsin: yongsinResult.yongsin,
          season: built.season,
          seasonKo,
          hourKo,
          sceneDesc: built.prompt,
          styleLabel: built.styleLabel,
          style,
          sajuText,
          saju,
          elementScores: yongsinResult.score,
        }),
      })
      const data = await res.json()
      setImageUrl(data.imageUrl ?? null)
      setCommentary(data.commentary ?? null)
      try {
        localStorage.setItem(MULSANG_RESULT_KEY, JSON.stringify({
          commentary: data.commentary ?? null,
          imageUrl: data.imageUrl ?? null,
          style,
        }))
        // 상담 전달용: 물상도 결과를 세션에 담아둠 (예약 시 상담 건에 연결)
        const storedUrl = data.storedUrl || data.imageUrl || null
        sessionStorage.setItem('mulsang_full', JSON.stringify({
          image_url: storedUrl,
          prompt: built.prompt,
          style,
          commentary: data.commentary ?? null,
        }))
        // 상담사 화면 해설 표시용 텍스트도 함께 (ai_analysis)
        if (data.commentary) {
          const c = data.commentary
          const text = `[물상도 · ${c.title || ''}]\n\n· 주인공(나)\n${c.subject || ''}\n\n· 환경\n${c.environment || ''}\n\n· 핵심 에너지(용신)\n${c.yongsin || ''}\n\n· 삶의 조언\n${c.advice || ''}`.trim()
          sessionStorage.setItem('ai_analysis', text)
        }
      } catch {}
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function openPay() {
    if (!saju || saju.length === 0 || !dayStem || converting) return
    setPayOpen(true)
  }

  // ── 그림 해설 통변 생성 (질문 골라서 or 전체 대략) ──
  function toggleQ(id: string) {
    setPickedQ(prev => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id); else n.add(id)
      return n
    })
  }
  async function runTongbyeon(mode: 'selected' | 'all') {
    if (!dayStem || saju.length === 0) return
    const questions: SajuQuestion[] =
      mode === 'all'
        ? []
        : MULSANG_QUESTIONS.filter(q => pickedQ.has(q.id))
    if (mode === 'selected' && questions.length === 0) return

    setTongLoading(true)
    setTongResult(null)
    setShowTongbyeon(true)
    try {
      const prompt = buildMulsangTongbyeonPrompt(
        {
          name: info?.name || '나',
          age: info?.year ? new Date().getFullYear() - info.year : 0,
          gender: info?.gender || '',
          dayStem,
          monthBranch,
          ohaengScore,
          topElement,
          lackElements,
          yongsinElement: (yongsinElement || undefined) as Ohaeng | undefined,
          styleLabel: STYLE_CONFIGS[style]?.label,
        },
        questions,
      )
      // 기존 사주 통변과 같은 /api/tongbyeon 재사용 (스트리밍)
      const res = await fetch('/api/tongbyeon', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt: prompt, premium: false }),
      })
      if (!res.ok || !res.body) {
        setTongResult('통변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
        setTongLoading(false)
        return
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let acc = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6)
          if (d === '[DONE]') continue
          try {
            const parsed = JSON.parse(d)
            if (parsed.text) { acc += parsed.text; setTongResult(acc) }
          } catch {}
        }
      }
    } catch {
      setTongResult('통변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setTongLoading(false)
    }
  }

  function goConsult() {
    // 상담 신청 시점에 현재 물상도(그림+해설)를 세션에 확실히 담는다.
    // (그림을 새로 뽑았든, 예전 결과를 복원했든 항상 연결되게)
    try {
      if (commentary || imageUrl) {
        sessionStorage.setItem('mulsang_full', JSON.stringify({
          image_url: imageUrl || null,
          prompt: '',
          style,
          commentary: commentary || null,
        }))
        const c = commentary
        if (c) {
          const text = `[물상도 · ${c.title || ''}]\n\n· 주인공(나)\n${c.subject || ''}\n\n· 환경\n${c.environment || ''}\n\n· 핵심 에너지(용신)\n${c.yongsin || ''}\n\n· 삶의 조언\n${c.advice || ''}`.trim()
          sessionStorage.setItem('ai_analysis', text)
        }
      }
    } catch {}
    const params = new URLSearchParams()
    params.set('mode', 'mulsang')       // 물상도로 구분 (상담사 화면이 그림+해설 표시)
    params.set('priceKey', 'mulsang')
    router.push('/manseryeok/consultant-select?' + params.toString())
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: '명카페 사주 풍경화', text: '내 사주를 그림으로 봤어요!', url: window.location.href })
    }
  }

  const branchList = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
  const sajuLine = converting ? '사주 불러오는 중...' :
    `일간 ${dayStem} · ${info.calType} ${info.year}.${info.month}.${info.day}${info.hourIdx !== null ? ` ${branchList[info.hourIdx]}시` : ''}`

  const hasResult = commentary && !loading

  const PayPopup = payOpen ? (
    <div onClick={() => setPayOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '430px', background: '#15152e', borderRadius: '20px 20px 0 0', padding: '10px 20px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.5)' }}>
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.2)', margin: '0 auto 18px' }} />
        <div style={{ fontSize: '17px', fontWeight: 700, color: '#e8e4ff', marginBottom: '4px' }}>🖼️ 사주 그림 생성</div>
        <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '16px', lineHeight: 1.6 }}>
          당신의 사주를 한 폭의 풍경화로 그려드려요
        </div>
        <div style={{ background: cardBg, borderRadius: '12px', padding: '14px', marginBottom: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '8px' }}>포함 내용</div>
          {['사주 8글자 기반 맞춤 풍경화', '선택한 화풍으로 생성', '그림 해설(주인공·환경·용신·조언)', '저장·공유 가능'].map((t, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#b8b4d8', lineHeight: 1.9 }}>· {t}</div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', color: '#8a88a0' }}>결제 금액</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: gold }}>{drawPrice.toLocaleString()}원</span>
        </div>
        <button onClick={doGenerate}
          style={{ width: '100%', padding: '15px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)', border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '8px' }}>
          💳 {drawPrice.toLocaleString()}원 결제하고 그림 그리기
        </button>
        <button onClick={() => setPayOpen(false)}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8a88a0', fontSize: '13px', cursor: 'pointer' }}>
          취소
        </button>
      </div>
    </div>
  ) : null

  if (hasResult) {
    return (
      <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
        <PageHeader title="내 사주가 그림이 된다면?" onBack={() => router.push('/')} />

        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#1a1a18' }}>
          {imageUrl ? (
            <img src={imageUrl} alt="사주 풍경화" style={{ width: '100%', display: 'block' }} />
          ) : (
            <div style={{ aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#5555aa', background: cardBg }}>
              <span style={{ fontSize: '40px' }}>🖼️</span>
              <span style={{ fontSize: '12px' }}>그림 생성은 곧 제공됩니다</span>
            </div>
          )}
          {imageUrl && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', padding: '8px', background: '#1a1a18', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <a href={imageUrl} download="mulsang.png" style={{ fontSize: '13px', color: gold, textDecoration: 'none' }}>⬇ 저장</a>
              <button onClick={handleShare} style={{ fontSize: '13px', color: gold, background: 'none', border: 'none', cursor: 'pointer' }}>↗ 공유</button>
            </div>
          )}
        </div>

        <div style={{ padding: '16px' }}>
          <div style={{ fontSize: '17px', fontWeight: 'bold', color: gold, marginBottom: '14px', lineHeight: 1.5 }}>
            "{commentary.title}"
          </div>
          {[
            { label: '주인공 (나)', text: commentary.subject },
            { label: '환경', text: commentary.environment },
            { label: '핵심 에너지 (용신)', text: commentary.yongsin },
            { label: '삶의 조언', text: commentary.advice },
          ].filter(s => s.text).map((s, i) => (
            <div key={i} style={{ borderLeft: `3px solid ${gold}`, padding: '4px 12px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: gold, marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '14px', color: '#e0dce8', lineHeight: 1.8 }}>{s.text}</div>
            </div>
          ))}

          {/* ── 오행표 + 사주원국 + 그림 해설 통변 (밝은 카드) ── */}
          <div style={{ background: '#FDF6F0', borderRadius: '16px', padding: '14px', margin: '4px 0 14px', color: '#3a2e28' }}>

            {/* 오행표 — 그림 바로 아래, 항상 펼침 */}
            {ohaeng.length > 0 && (
              <div style={{ background: '#fffbf7', border: '0.5px solid #f0e0d5', borderRadius: '12px', padding: '12px', marginBottom: '10px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#96502e', marginBottom: '4px' }}>오행 분석 — 그림이 이렇게 그려진 이유</div>
                <div style={{ fontSize: '11px', color: '#b4785a', marginBottom: '8px' }}>넘치는 기운은 풍성하게, 부족한 기운은 그림 속 빛으로 채워요</div>
                <OhaengPentagon ohaeng={ohaeng} />
              </div>
            )}

            {/* 사주 원국 — 아코디언(접힘 기본) */}
            <div style={{ background: '#fff', border: '0.5px solid #f0e0d5', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
              <div onClick={() => setOpenWonguk(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 14px', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: '#3a2e28' }}>사주 원국 (내 여덟 글자)</span>
                <span style={{ color: '#c8783c', fontSize: '12px' }}>{openWonguk ? '▾' : '▸'}</span>
              </div>
              {openWonguk && (
                <div style={{ padding: '4px 14px 14px', display: 'flex', gap: '6px', justifyContent: 'center' }}>
                  {saju.map((p, i) => (
                    <div key={i} style={{ flex: 1, textAlign: 'center', background: '#fdf6f0', borderRadius: '8px', padding: '8px 4px' }}>
                      <div style={{ fontSize: '10px', color: '#b4785a', marginBottom: '3px' }}>{p.pillar}</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#96502e' }}>{p.stem}</div>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#6e50a0' }}>{p.branch}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 그림 해설 통변 안내 */}
            <div style={{ fontSize: '13px', fontWeight: 700, color: '#96502e', margin: '4px 2px 4px' }}>그림에서 궁금한 걸 골라보세요</div>
            <div style={{ fontSize: '11px', color: '#b4785a', margin: '0 2px 10px' }}>안 고르면 그림 전체를 대략 풀어드려요</div>

            {/* 카테고리별 질문 (아코디언) */}
            {groupMulsangByCategory(MULSANG_QUESTIONS).map(({ category, items }) => {
              const gPicked = items.filter(q => pickedQ.has(q.id)).length
              const open = openCat === category
              return (
                <div key={category} style={{ border: `0.5px solid ${gPicked > 0 ? '#6e50a055' : '#f0e0d5'}`, borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
                  <div onClick={() => setOpenCat(open ? null : category)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 12px', background: gPicked > 0 ? '#6e50a014' : '#fff', cursor: 'pointer' }}>
                    <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: '#6e50a0' }}>{category}</span>
                    {gPicked > 0 && <span style={{ fontSize: '10px', color: '#fff', background: '#6e50a0', borderRadius: '9px', padding: '2px 7px' }}>{gPicked}</span>}
                    <span style={{ color: '#6e50a0', fontSize: '12px' }}>{open ? '▾' : '▸'}</span>
                  </div>
                  {open && (
                    <div style={{ padding: '8px 10px' }}>
                      {items.map(q => {
                        const on = pickedQ.has(q.id)
                        return (
                          <div key={q.id} onClick={() => toggleQ(q.id)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 8px', borderRadius: '8px', background: on ? '#6e50a014' : 'transparent', marginBottom: '3px', cursor: 'pointer' }}>
                            <span style={{ width: '18px', height: '18px', borderRadius: '5px', border: `1.5px solid ${on ? '#6e50a0' : '#d8c4b4'}`, background: on ? '#6e50a0' : '#fff', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                            <span style={{ fontSize: '12.5px', color: '#3a2e28' }}>{q.question}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}

            {/* 통변 실행 버튼 */}
            <button onClick={() => runTongbyeon('selected')} disabled={pickedQ.size === 0 || tongLoading}
              style={{ width: '100%', height: '46px', background: pickedQ.size > 0 ? '#b46e46' : '#d8c4b4', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: pickedQ.size > 0 ? 'pointer' : 'not-allowed', marginTop: '4px' }}>
              {pickedQ.size > 0 ? `${pickedQ.size}개 골라 그림 풀이 받기` : '궁금한 것을 골라주세요'}
            </button>
            <button onClick={() => runTongbyeon('all')} disabled={tongLoading}
              style={{ width: '100%', height: '42px', background: 'transparent', border: '0.5px solid #d8c4b4', borderRadius: '12px', color: '#96502e', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}>
              그냥 전체 대략 해설 볼래요
            </button>

            {/* 통변 결과 */}
            {showTongbyeon && (
              <div style={{ marginTop: '14px' }}>
                {tongLoading ? (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#b4785a', fontSize: '13px' }}>그림을 찬찬히 살펴보는 중이에요…</div>
                ) : tongResult ? (
                  <div style={{ background: '#fffbf7', border: '0.5px solid #f0e0d5', borderRadius: '12px', padding: '14px', fontSize: '13.5px', lineHeight: 1.85, color: '#3a2e28', whiteSpace: 'pre-wrap' }}>
                    {tongResult}
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <button onClick={goConsult}
            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'transparent', border: `1px solid ${gold}`, color: gold, fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginTop: '8px', marginBottom: '12px' }}>
            🔮 이 그림에 대해 전문가와 상담하기 →
          </button>

          {drawActive && (
            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px' }}>
              <div style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '8px' }}>다른 화풍으로 다시 그리기</div>
              <select value={style} onChange={e => setStyle(e.target.value)}
                style={{ width: '100%', padding: '10px', borderRadius: '10px', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.15)', color: gold, fontSize: '14px', marginBottom: '10px' }}>
                {(Object.keys(STYLE_CONFIGS)).map(key => (
                  <option key={key} value={key}>{STYLE_CONFIGS[key].label}</option>
                ))}
              </select>
              <button onClick={openPay}
                style={{ width: '100%', padding: '12px', borderRadius: '10px', background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)', border: 'none', color: '#1a1a18', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
                ✨ 다시 그리기 · {drawPrice.toLocaleString()}원
              </button>
            </div>
          )}
        </div>

        {PayPopup}
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <PageHeader title="내 사주가 그림이 된다면?" onBack={() => router.push('/')} />
      <div style={{ padding: '16px' }}>
        <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '6px' }}>내 사주</div>
          <div style={{ fontSize: '14px', color: '#e8e4ff' }}>{sajuLine}</div>
        </div>

        <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '8px' }}>화풍 선택</div>
        <select value={style} onChange={e => setStyle(e.target.value)} disabled={loading}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.15)', color: gold, fontSize: '15px', marginBottom: '16px' }}>
          {(Object.keys(STYLE_CONFIGS)).map(key => (
            <option key={key} value={key}>{STYLE_CONFIGS[key].label}</option>
          ))}
        </select>

        {drawActive ? (
          <button onClick={openPay} disabled={loading || converting}
            style={{
              width: '100%', padding: '14px', borderRadius: '12px', marginBottom: '20px',
              background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)',
              border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold',
              cursor: loading ? 'default' : 'pointer', opacity: loading || converting ? 0.6 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
            {loading ? (
              <>
                <span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>✦</span>
                그림과 해설을 만드는 중...
              </>
            ) : `✨ 나의 사주 그림 그리기 · ${drawPrice.toLocaleString()}원`}
          </button>
        ) : (
          <div style={{ textAlign: 'center', color: '#8a88a0', fontSize: '13px', marginBottom: '20px' }}>
            현재 그림 생성 서비스는 준비 중입니다.
          </div>
        )}

        {loading && (
          <div style={{ background: cardBg, border, borderRadius: '14px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '40px', display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span>
            <div style={{ textAlign: 'center', color: gold, fontSize: '13px', lineHeight: 1.7 }}>
              당신의 사주를 풍경으로 그리고 있어요<br />
              <span style={{ color: '#8a88a0', fontSize: '12px' }}>잠시만 기다려 주세요 (최대 1분)</span>
            </div>
          </div>
        )}
      </div>

      {PayPopup}
    </main>
  )
}

export default function MulsangPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a18' }}>
        <div style={{ color: '#FAC775' }}>로딩 중...</div>
      </div>
    }>
      <MulsangInner />
    </Suspense>
  )
}
