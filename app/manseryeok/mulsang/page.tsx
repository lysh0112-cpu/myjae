'use client'
import { Suspense, useState, useEffect, useMemo, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat as calcYongsin } from '@/lib/saju/yongsinNew'
import { calcSimsanOhaeng, toPercentList } from '@/lib/saju/simsanOhaeng'
import { buildMulsangPrompt, STYLE_CONFIGS, ACTIVE_STYLES, STYLE_EMOJI, STYLE_DESC } from '@/lib/saju/mulsangPrompt'
import { buildMulsangTongbyeonPrompt, buildMulsangCardSummaryPrompt, type Ohaeng } from '@/lib/saju/mulsangTongbyeonPrompt'
import { MULSANG_QUESTIONS, groupMulsangByCategory } from '@/lib/saju/mulsangQuestions'
import OhaengPentagon from '@/app/manseryeok/result-new/OhaengPentagon'
import SajuWonguk from '@/app/manseryeok/result-new/SajuWonguk'
import { getGongmang } from '@/lib/saju'
import { saveRecord, getRecord, updateRecordResult } from '@/lib/saju/sajuRecords'
import CopyTextButton from '@/app/components/common/CopyTextButton'
import { supabase } from '@/lib/supabase'
import type { SajuQuestion } from '@/lib/saju/questions'

interface Commentary {
  title: string
  subject: string
  environment: string
  yongsin: string
  advice: string
}

const MY_INFO_KEY = 'myinfo'
// 오각형 육친 라벨용 (일간 → 오행)
const MULSANG_STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const MULSANG_IMG_PREFIX = 'mulsang_img_v5:'      // 그림 (사람 + 화풍별로 각각 저장)
const MULSANG_ANS_PREFIX = 'mulsang_ans_v5:'      // 질문 답 캐시 (사람 + 질문id, 화풍 무관)

// ★2026-07-21: 질문 고르기 숨김 (연재쌤 지시 — 해설은 전체 해설 하나로 통일).
//   부품·데이터(mulsangQuestions.ts)는 그대로 보존. 되살리려면 true 로만 바꾸면 된다.
//   (커플채팅 COUPLE_CHAT_OPEN 과 같은 방식)
const MULSANG_QUESTION_OPEN = false

// 사람(생년월일시+성별) 식별 문자열
function personKeyOf(p: {
  gender: string; calType: string; year: number; month: number; day: number;
  leapMonth: string; hourIdx: number | null;
} | null): string | null {
  if (!p || !p.year) return null
  return [p.gender, p.calType, p.year, p.month, p.day, p.leapMonth, p.hourIdx ?? '모름'].join('|')
}

// 그림 저장 키: 사람 + 화풍(oriental/ghibli) → 두 화풍이 각각 보관됨
function mulsangImgKey(p: Parameters<typeof personKeyOf>[0], style: string): string | null {
  const pk = personKeyOf(p)
  return pk ? `${MULSANG_IMG_PREFIX}${pk}::${style}` : null
}

// 질문 답 캐시 키: 사람 + 질문id (답 내용은 화풍과 무관하므로 화풍 안 넣음)
function mulsangAnsKey(p: Parameters<typeof personKeyOf>[0], questionId: string): string | null {
  const pk = personKeyOf(p)
  return pk ? `${MULSANG_ANS_PREFIX}${pk}::${questionId}` : null
}

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
      // (0) recordId 우선 — 보관함에서 "다시보기"로 들어온 경우.
      //   그림은 AI라 재생성 불가 → 저장 스냅샷(그림·해설)을 그대로 복원한다.
      const recordId = sp.get('recordId')
      if (recordId) {
        const rec = await getRecord(recordId)
        if (rec && !cancelled) {
          const d = rec.inputData
          setInfo({
            gender: d.gender, calType: d.calType,
            year: parseInt(d.year), month: parseInt(d.month), day: parseInt(d.day),
            leapMonth: d.leapMonth || '0',
            hourIdx: d.hour === '모름' ? null : parseInt(d.hour),
            name: rec.title || undefined,
          })
          // 저장 스냅샷의 그림·해설 복원
          //   ★해설은 tongResult(화면에 그려지는 자리)로 넣는다.
          //     예전 4칸 해설(객체)로 저장된 옛 기록도 있으므로 문자열일 때만 쓴다.
          const snap = rec.resultData as { images?: { style: string; imageUrl: string; commentary: unknown }[] } | null
          const first = snap?.images?.[0]
          if (first) {
            setStyle(first.style)
            setImageUrl(first.imageUrl)
            if (typeof first.commentary === 'string' && first.commentary.trim()) {
              setTongResult(first.commentary)
              setShowTongbyeon(true)
            } else {
              setCommentary((first.commentary as Commentary) ?? null)
            }
          }
        }
        return
      }

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
          name: sp.get('name') || undefined,
        })
        return
      }

      // (2) URL 없음(="나" 선택). 로그인 여부에 따라 갈라진다.
      //   ⚠️ 중요: 로그인했다면 반드시 "내 profiles"만 신뢰한다.
      //   예전엔 profiles가 없거나 미저장이면 localStorage(myinfo)로 폴백했는데,
      //   그 브라우저에 남의 사주(예: 이전에 본 다른 사람)가 캐시돼 있으면
      //   그게 "내 사주"로 잘못 표시되는 심각한 버그가 있었다. → 폴백 금지.
      let loggedIn = false
      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          loggedIn = true
          // 홈과 동일하게 maybeSingle 사용 (.single()은 행 개수 안 맞으면 에러 → 폴백 오염 원인이었음)
          const { data: p } = await supabase.from('profiles')
            .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
            .eq('id', u.user.id).maybeSingle()
          // 홈은 birth_year만 있으면 "나"로 인정하므로, 여기서도 생년월일만 있으면
          // 내 사주로 쓴다(saju_saved 여부와 무관하게 홈과 동일 기준으로 일관성 유지).
          if (p && p.birth_year && !cancelled) {
            const hourStr = (p.birth_hour == null || p.birth_hour === '모름') ? '모름' : String(p.birth_hour)
            setInfo({
              gender: p.gender ?? '남',
              calType: p.cal_type ?? '양력',
              year: Number(p.birth_year),
              month: Number(p.birth_month ?? 0),
              day: Number(p.birth_day ?? 0),
              leapMonth: p.leap_month != null ? String(p.leap_month) : '0',
              hourIdx: hourStr === '모름' ? null : parseInt(hourStr),
            })
          }
          // 로그인했으나 profiles에 생년월일 없음 → info를 비운 채 둔다.
          //   (안내 화면이 떠서 "사주 정보를 입력해 주세요"로 유도. 남의 캐시 안 씀.)
          return
        }
      } catch {}

      // (3) 비로그인일 때만 localStorage myinfo 보조 (내 브라우저의 내 정보로 간주)
      if (loggedIn) return
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

  const { saju, solar, dayStem, iljji, yeonjji, converting } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  // SajuWonguk(상세 명식 부품)에 넘길 공망 (일간+일지 기준)
  const [gm1, gm2] = dayStem && iljji ? getGongmang(dayStem, iljji) : ['', '']

  const [style, setStyle] = useState<string>(ACTIVE_STYLES[0] ?? 'ghibli')
  // 다시 그리기 드롭다운에서 고른 화풍 (현재 화풍과 별개로 관리)
  const [redrawPick, setRedrawPick] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [commentary, setCommentary] = useState<Commentary | null>(null)

  // ── 오행·용신·월지 (그림 해설 통변 재료) ──
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
  const hourBranch = saju.find(p => p.pillar === '시주')?.branch ?? null
  // ★심산 오행 점수에는 반드시 "양력" 월·일을 넘겨야 한다.
  //   info 는 입력 원본이라 음력일 수 있다. 훅이 돌려주는 solar(양력)를 쓴다.
  //   (2026-07-21 수정 — 음력 입력자의 寅·申월 날짜 3분할이 틀어지던 문제)
  const solarMonth = solar?.month ?? 0
  const solarDay = solar?.day ?? 0
  const ohaeng = useMemo(
    () => (saju.length > 0 ? toPercentList(calcSimsanOhaeng(saju, solarMonth, solarDay, hourBranch)) : []),
    [saju, solarMonth, solarDay, hourBranch],
  )
  const yongsinResult = useMemo(
    // 심산 오행 점수로 계산 (월지 계절 치환 반영)
    () => (saju.length > 0 && dayStem
      ? calcYongsin(saju, dayStem, solarMonth, solarDay,
          saju.find(p => p.pillar === '시주')?.branch ?? null)
      : null),
    [saju, dayStem, solarMonth, solarDay],
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
  const [pickedQ, setPickedQ] = useState<string | null>(null) // 고른 질문 id (하나만)
  const [tongLoading, setTongLoading] = useState(false)
  const [tongResult, setTongResult] = useState<string | null>(null)
  const [openCat, setOpenCat] = useState<string | null>(null)   // 아코디언: 열린 대분류
  const [openWonguk, setOpenWonguk] = useState(false)           // 사주 원국 아코디언
  const [openOhaeng, setOpenOhaeng] = useState(false)           // 오행도 아코디언
  const [openImage, setOpenImage] = useState(true)              // 그림 아코디언 (기본 펼침)
  const [openPicker, setOpenPicker] = useState(false)           // 질문 고르기 부품 전체 아코디언
  // 이미 답이 저장된(=본) 질문 id 집합. 모달 열 때 읽어와 체크 표시에 사용.
  const [answeredIds, setAnsweredIds] = useState<Set<string>>(new Set())
  // 그림 생성 실패 안내 (크레딧 소진 등). null이면 정상.
  const [imageError, setImageError] = useState<string | null>(null)
  // 보관함 저장 상태 — 다시보기(recordId)로 열었으면 이미 저장된 것이므로 'saved'로 시작(재저장 방지)
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'failed'>(sp.get('recordId') ? 'saved' : 'idle')
  // ★그림 요청이 끝나면 올린다 → 아래 useEffect 가 해설을 자동으로 부른다.
  const wantTongRef = useRef(false)
  const shareRef = useRef<HTMLDivElement | null>(null)
  const [cardBusy, setCardBusy] = useState(false)
  const [cardImg, setCardImg] = useState<string | null>(null)   // 캡처용 data URL
  const [cardText, setCardText] = useState('')                  // 카드에 담을 요약
  const [cardStep, setCardStep] = useState('')                  // 진행 안내 문구
  const cardSummaryRef = useRef<string>('')                     // 만든 요약 보관(재사용)

  // 해설에서 첫 카드(■ ~ 다음 ■ 전까지)만 뽑는다.
  const firstCard = useMemo(() => {
    const t = (tongResult || '').trim()
    if (!t) return { title: '', body: '' }
    const parts = t.split(/\n(?=■)/)
    const head = (parts[0] || '').trim()
    const lines = head.split('\n')
    const title = (lines[0] || '').replace(/^■\s*/, '').trim()
    const body = lines.slice(1).join('\n').trim()
    return { title, body }
  }, [tongResult])

  // 그림 내려받기 / 해설 복사 상태
  const [imgSaving, setImgSaving] = useState(false)
  // 자동 저장된 보관함 기록 id — 해설이 완성되면 여기에 덧붙인다.
  const savedIdRef = useRef<string | null>(null)
  const [tongTick, setTongTick] = useState(0)

  // ★그림 뒤 해설 자동 생성.
  //   doGenerate 안에서 바로 부르지 않는 이유: 그 시점엔 saju·dayStem 이
  //   아직 준비되지 않았을 수 있어 조용히 건너뛴다. 준비되면 여기서 부른다.
  useEffect(() => {
    if (!wantTongRef.current) return
    if (!dayStem || saju.length === 0) return   // 아직 준비 안 됨 → 다음 렌더에서 다시
    wantTongRef.current = false
    runTongbyeon('all')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tongTick, dayStem, saju.length])

  useEffect(() => {
    // 보관함 다시보기(recordId)로 진입했으면 스냅샷을 loadInfo에서 이미 복원했으므로
    // localStorage 기반 복원은 건너뛴다 (안 그러면 이 브라우저에 없는 그림을 지워버림).
    if (sp.get('recordId')) return
    const key = mulsangImgKey(info, style)
    if (!key) return
    // 그림 생성 중이면 건드리지 않는다 (방금 만든 그림을 지우면 안 됨).
    if (loading) return
    // 사람 또는 화풍이 바뀌면 화면을 비우고, 그 사람+그 화풍으로 저장된 그림만 복원.
    //   (다른 화풍 그림은 그 화풍으로 전환하면 그때 뜬다. 두 화풍 각각 보관됨.)
    const saved = localStorage.getItem(key)
    if (saved) {
      try {
        const r = JSON.parse(saved)
        setImageUrl(r.imageUrl ?? null)
        // ★해설도 함께 복원 (화풍을 바꿔 예전 그림으로 돌아왔을 때)
        if (typeof r.tong === 'string' && r.tong.trim()) {
          setTongResult(r.tong)
          setShowTongbyeon(true)
        } else {
          setTongResult(null)
          setShowTongbyeon(false)
        }
        setCommentary(r.commentary ?? null)
        return
      } catch {}
    }
    // 저장된 게 없을 때만 비운다.
    setImageUrl(null)
    setCommentary(null)
    setTongResult(null)
    setShowTongbyeon(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [personKeyOf(info), style])

  const gold = '#FAC775'
  const cardBg = '#2C2C2A'
  const border = '1px solid rgba(250,199,117,0.15)'

  if (!info) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto' }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)', borderBottom: '0.5px solid #f0e0d5' }}>
          <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer' }}>←</button>
          <span style={{ fontSize: '15px', fontWeight: 500, color: '#3a2e28' }}>내 사주가 그림이 된다면?</span>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>🏠</button>
        </div>
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5c3a1e' }}>
          <p style={{ marginBottom: '20px' }}>먼저 홈에서 사주 정보를 입력해주세요.</p>
          <button onClick={() => router.push('/')}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#b46e46', border: 'none', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
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
    // ★새로 그리는 것이므로 저장 상태·해설도 초기화한다.
    //   (안 하면 두 번째 그림이 'saved' 로 남아 자동 저장이 안 된다)
    setSaveState('idle')
    setTongResult(null)
    setShowTongbyeon(false)
    savedIdRef.current = null
    try {
      const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
      const yongsinResult = calcYongsin(saju, dayStem, solarMonth, solarDay,
        saju.find(p => p.pillar === '시주')?.branch ?? null)
      const built = buildMulsangPrompt({
        dayStem,
        monthBranch,
        stems: saju.map(p => p.stem),
        elementScores: yongsinResult.score,
        yongsin: yongsinResult.yongsin,
        style,
        // ★시지 전달: 시주 지지 우선, 없으면 hourIdx로. 모르면 null → 그림에서 시간 지시 생략.
        hourBranch: saju.find(p => p.pillar === '시주')?.branch
          ?? (info && info.hourIdx !== null
            ? ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'][info.hourIdx]
            : null),
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
      // 그림이 안 왔으면(=크레딧 소진·타임아웃 등) 이유를 화면에 안내. imageNote로 원인 구분.
      if (!data.imageUrl) {
        // ★영어 원문(OpenAI 오류)은 화면에 띄우지 않는다. (2부 화면 문구 원칙 6)
        //   원인은 관리자 → 🚨 AI 오류 탭에 그대로 기록되므로 추적에 지장 없다.
        const note = data.imageNote || ''
        setImageError(
          note === 'no_openai_key'
            ? '그림 생성 준비가 아직 안 됐어요. 관리자에게 알려주세요.'
            : note === 'image_timeout'
              ? '그림 그리는 데 시간이 조금 오래 걸렸어요. 다시 시도하면 대개 잘 나와요.'
              : '그림 생성이 잠시 어려운 상태예요. 다시 시도해 주세요.'
        )
      } else {
        setImageError(null)
      }
      try {
        const key = mulsangImgKey(info, style)
        if (key) localStorage.setItem(key, JSON.stringify({
          commentary: data.commentary ?? null,
          imageUrl: data.imageUrl ?? null,
        }))
        // 상담 전달용: 물상도 결과를 세션에 담아둠 (예약 시 상담 건에 연결)
        const storedUrl = data.storedUrl || data.imageUrl || null
        sessionStorage.setItem('mulsang_full', JSON.stringify({
          image_url: storedUrl,
          prompt: built.prompt,
          style,
          commentary: data.commentary ?? null,
        }))
      } catch {}

      // ★그림이 나왔으면 곧바로 보관함에 저장한다 (고객이 누르지 않아도).
      //   해설은 아직 만드는 중일 수 있어, 완성되면 아래 useEffect 가 덧붙여 갱신한다.
      if (data.imageUrl) handleSaveRecord(data.imageUrl, '')
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
      // ★그림 요청이 끝나면 해설을 이어서 자동 생성한다.
      //   (아래 useEffect 가 감지해서 부른다 — saju·dayStem 이 준비된 시점에 실행)
      wantTongRef.current = true
      setTongTick(t => t + 1)
    }
  }

  function openPay() {
    if (!saju || saju.length === 0 || !dayStem || converting) return
    setPayOpen(true)
  }

  // ── 그림 해설 통변 생성 (질문 골라서 or 전체 대략) ──
  function toggleQ(id: string) {
    // 하나만 선택 (같은 걸 다시 누르면 해제)
    setPickedQ(prev => (prev === id ? null : id))
  }

  // 질문 모달 열기 — 열기 직전에 이 사람의 "이미 답 있는 질문"을 스캔해 체크 표시 준비.
  function openQuestionPicker() {
    const pk = personKeyOf(info)
    if (pk) {
      const prefix = `${MULSANG_ANS_PREFIX}${pk}::`
      const found = new Set<string>()
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (k && k.startsWith(prefix)) found.add(k.slice(prefix.length))
        }
      } catch {}
      setAnsweredIds(found)
    }
    setOpenPicker(true)
  }
  async function runTongbyeon(mode: 'selected' | 'all') {
    if (!dayStem || saju.length === 0) return
    const questions: SajuQuestion[] =
      mode === 'all'
        ? []
        : MULSANG_QUESTIONS.filter(q => q.id === pickedQ)
    if (mode === 'selected' && questions.length === 0) return

    // ── 답 캐시: 이미 본 질문이면 저장된 답을 즉시 표시 (API 호출 안 함 = 비용 0) ──
    //   선택 질문일 때만 캐시(전체 대략은 매번 다르므로 캐시 안 함).
    const ansKey = mode === 'selected' && pickedQ ? mulsangAnsKey(info, pickedQ) : null
    if (ansKey) {
      const cached = localStorage.getItem(ansKey)
      if (cached) {
        setShowTongbyeon(true)
        setTongResult(cached)
        setTongLoading(false)
        return
      }
    }

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
      // ── 생성 완료 → 답 저장(다음엔 캐시에서 즉시). 내용이 있을 때만. ──
      if (ansKey && acc.trim()) {
        try {
          localStorage.setItem(ansKey, acc)
          if (pickedQ) setAnsweredIds(prev => new Set(prev).add(pickedQ))
        } catch {}
      }
      // ★해설이 완성되면: 상담사 전달용 + 그림 기록에 덧붙이기 + 캐시
      if (mode === 'all' && acc.trim()) {
        try { sessionStorage.setItem('ai_analysis', acc) } catch {}
        // 그림은 먼저 저장됐으므로, 그 기록에 해설을 덧붙인다.
        if (savedIdRef.current && imageUrl) {
          const ok = await updateRecordResult(savedIdRef.current, {
            images: [{ style, imageUrl, commentary: acc }],
            answers: [],
          })
          if (!ok) console.error('보관함 해설 갱신 실패')
        }
        // ★그림과 같은 칸에 해설도 담아둔다 → 화풍 전환·재방문 때 다시 뜬다.
        try {
          const k = mulsangImgKey(info, style)
          if (k) {
            const prev = k ? localStorage.getItem(k) : null
            const obj = prev ? JSON.parse(prev) : {}
            localStorage.setItem(k, JSON.stringify({ ...obj, tong: acc }))
          }
        } catch {}
      }
    } catch {
      setTongResult('통변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.')
    } finally {
      setTongLoading(false)
    }
  }

  // ── 보관함 자동 저장: 그림이 뜨면 바로 저장한다 (고객이 누르지 않아도) ──
  //   ★결제 1회 = 그림 1장 = 보관함 1건. 고객이 저장을 깜빡하고 나가도 남는다.
  //   (19-2부 "고객들이 돈들여 봤는데 그냥 빠져 나가면 아깝잖아")
  async function handleSaveRecord(imgUrl?: string, tong?: string) {
    const url = imgUrl ?? imageUrl
    if (saveState !== 'idle' || !info || !url) return
    const pk = personKeyOf(info)
    if (!pk) return
    setSaveState('saving')

    // 1) ★지금 그린 화풍 그림 하나만 저장한다.
    //   결제 1회 = 그림 1장 = 보관함 1건.
    const images = [{ style, imageUrl: url, commentary: (tong ?? tongResult) ?? null }]

    // 2) 본 질문 해설들 모으기
    const answers: { questionId: string; question: string; answer: string }[] = []
    try {
      const prefix = `${MULSANG_ANS_PREFIX}${pk}::`
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (!key || !key.startsWith(prefix)) continue
        const qid = key.slice(prefix.length)
        const ans = localStorage.getItem(key) || ''
        const q = MULSANG_QUESTIONS.find(x => x.id === qid)
        if (ans) answers.push({ questionId: qid, question: q?.question || '', answer: ans })
      }
    } catch {}

    // 3) saju_records에 스냅샷 저장 (service_type='mulsang')
    const res = await saveRecord({
      serviceType: 'mulsang',
      title: info.name || '나',
      inputData: {
        gender: info.gender, calType: info.calType,
        year: String(info.year), month: String(info.month), day: String(info.day),
        leapMonth: info.leapMonth || '0',
        hour: info.hourIdx == null ? '모름' : String(info.hourIdx),
      },
      resultData: { images, answers },
    })
    // 저장 실패는 alert 로 막지 않는다 — 버튼이 'idle' 로 돌아가 다시 누를 수 있다. (19-2부)
    // 자동 저장이라 alert 로 막지 않는다 — 실패하면 화면에 [다시 저장]이 뜬다. (19-2부)
    setSaveState(res.ok ? 'saved' : 'failed')
    if (res.ok && res.id) savedIdRef.current = res.id
    if (!res.ok) console.error('보관함 저장 실패:', res.message)
  }

  function goConsult() {
    // 상담 신청 시점에 현재 물상도(그림+해설)를 세션에 확실히 담는다.
    // (그림을 새로 뽑았든, 예전 결과를 복원했든 항상 연결되게)
    try {
      if (tongResult || imageUrl) {
        sessionStorage.setItem('mulsang_full', JSON.stringify({
          image_url: imageUrl || null,
          prompt: '',
          style,
          commentary: tongResult || null,
        }))
        // 상담사가 볼 해설 — 고객이 본 전체 해설을 그대로.
        if (tongResult?.trim()) sessionStorage.setItem('ai_analysis', tongResult)
      }
    } catch {}
    const params = new URLSearchParams()
    params.set('mode', 'mulsang')       // 물상도로 구분 (상담사 화면이 그림+해설 표시)
    params.set('priceKey', 'mulsang')
    router.push('/manseryeok/consultant-select?' + params.toString())
  }

  // ── 그림 내려받기 ──
  //   ⚠️ <a download> 은 같은 도메인일 때만 동작한다. 그림은 Supabase Storage(다른 도메인)라
  //   그냥 새 탭에서 열려버린다. 그래서 파일을 받아 blob 으로 만들어 내려받는다.
  async function handleDownloadImage() {
    if (!imageUrl || imgSaving) return
    setImgSaving(true)
    try {
      const res = await fetch(imageUrl)
      if (!res.ok) throw new Error('fetch failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const who = (info?.name || '나').replace(/[\\/:*?"<>|]/g, '')
      a.href = url
      a.download = `명카페_사주그림_${who}_${STYLE_CONFIGS[style]?.label ?? ''}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      // 내려받기가 막히면(브라우저 정책 등) 새 탭으로 열어 직접 저장하게 안내
      window.open(imageUrl, '_blank')
    } finally {
      setImgSaving(false)
    }
  }

  // ── 공유 카드 만들기 (그림 + 첫 해설 카드를 한 장 이미지로) ──
  //   ⚠️ 그림은 Supabase Storage(다른 도메인)라 그대로 캡처하면 빈칸이 된다.
  //   먼저 data URL 로 바꿔 넣은 뒤 캡처한다.
  async function handleShareCard() {
    if (!imageUrl || !tongResult?.trim() || cardBusy) return
    setCardBusy(true)
    try {
      // 0) 카드에 담을 짧은 요약을 먼저 만든다 (3~4문장).
      //    이미 만든 게 있으면 다시 부르지 않는다 (비용 절약).
      let summary = cardSummaryRef.current
      if (!summary) {
        setCardStep('요약을 만드는 중…')
        try {
          const sres = await fetch('/api/tongbyeon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemPrompt: buildMulsangCardSummaryPrompt(tongResult, info?.name),
              premium: false,
            }),
          })
          if (sres.ok && sres.body) {
            const rd = sres.body.getReader()
            const dec = new TextDecoder()
            let acc = ''
            while (true) {
              const { done, value } = await rd.read()
              if (done) break
              for (const line of dec.decode(value).split('\n')) {
                if (!line.startsWith('data: ')) continue
                const d = line.slice(6)
                if (d === '[DONE]') continue
                try {
                  const p = JSON.parse(d)
                  if (p.text) acc += p.text
                } catch {}
              }
            }
            summary = acc.trim()
            if (summary) cardSummaryRef.current = summary
          }
        } catch { /* 요약 실패해도 카드는 만든다 (첫 카드 본문으로 대체) */ }
      }
      setCardText(summary || firstCard.body)

      // 1) 그림을 data URL 로 (다른 도메인 문제 회피)
      setCardStep('카드를 만드는 중…')
      const res = await fetch(imageUrl)
      const blob = await res.blob()
      const dataUrl: string = await new Promise((ok, no) => {
        const fr = new FileReader()
        fr.onload = () => ok(fr.result as string)
        fr.onerror = no
        fr.readAsDataURL(blob)
      })
      setCardImg(dataUrl)
      // 2) 화면에 반영될 때까지 한 박자 기다렸다가 캡처
      await new Promise(r => setTimeout(r, 120))
      const node = shareRef.current
      if (!node) throw new Error('no node')
      const { toPng } = await import('html-to-image')
      const png = await toPng(node, { pixelRatio: 2, cacheBust: true, backgroundColor: '#FDF6F0' })
      // 3) 내려받기
      const a = document.createElement('a')
      const who = (info?.name || '나').replace(/[\\/:*?"<>|]/g, '')
      a.href = png
      a.download = `명카페_사주그림카드_${who}.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (e) {
      console.error('공유 카드 생성 실패:', e)
    } finally {
      setCardImg(null)
      setCardStep('')
      setCardBusy(false)
    }
  }

  function handleShare() {
    if (navigator.share) {
      navigator.share({ title: '명카페 사주 풍경화', text: '내 사주를 그림으로 봤어요!', url: window.location.href })
    }
  }

  const branchList = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']
  const sajuLine = converting ? '사주 불러오는 중...' :
    `일간 ${dayStem} · ${info.calType} ${info.year}.${info.month}.${info.day}${info.hourIdx !== null ? ` ${branchList[info.hourIdx]}시` : ''}`

  // ★결과 화면 판정 — 예전엔 4칸 해설(commentary)을 봤으나 그 해설을 없앴다.
  //   지금은 "그림이 있거나 / 해설이 있거나 / 해설을 부르는 중"이면 결과 화면.
  //   (그림만 실패해도 해설은 보여야 하고, 옛 기록은 commentary만 있을 수 있어 함께 본다)
  const hasResult = !loading && (!!imageUrl || !!tongResult || tongLoading || !!commentary)

  const PayPopup = payOpen ? (
    <div onClick={() => setPayOpen(false)}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '430px', background: '#fffbf7', borderRadius: '20px 20px 0 0', padding: '10px 20px 28px', boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ width: '40px', height: '4px', borderRadius: '2px', background: '#e4d4be', margin: '0 auto 18px' }} />
        <div style={{ fontSize: '17px', fontWeight: 700, color: '#96502e', marginBottom: '4px' }}>🖼️ 사주 그림 생성</div>
        <div style={{ fontSize: '13px', color: '#5c3a1e', marginBottom: '16px', lineHeight: 1.6 }}>
          당신의 사주를 한 폭의 풍경화로 그려드려요
        </div>
        <div style={{ background: '#fdf6f0', borderRadius: '12px', padding: '14px', marginBottom: '18px', border: '0.5px solid #f0e0d5' }}>
          <div style={{ fontSize: '12px', color: '#5c3a1e', marginBottom: '8px' }}>포함 내용</div>
          {['사주 8글자 기반 맞춤 풍경화', '그림에 담긴 뜻을 풀어주는 해설', '보관함 저장 · 공유 가능'].map((t, i) => (
            <div key={i} style={{ fontSize: '13px', color: '#3a2e28', lineHeight: 1.9 }}>· {t}</div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <span style={{ fontSize: '14px', color: '#5c3a1e' }}>결제 금액</span>
          <span style={{ fontSize: '20px', fontWeight: 700, color: '#8f3d0e' }}>{drawPrice.toLocaleString()}원</span>
        </div>
        <button onClick={doGenerate}
          style={{ width: '100%', padding: '15px', borderRadius: '12px', background: '#b46e46', border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700, cursor: 'pointer', marginBottom: '8px' }}>
          💳 {drawPrice.toLocaleString()}원 결제하고 그림 그리기
        </button>
        <button onClick={() => setPayOpen(false)}
          style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border: '0.5px solid #e4d4be', color: '#5c3a1e', fontSize: '13px', cursor: 'pointer' }}>
          취소
        </button>
      </div>
    </div>
  ) : null

  // ── 질문 고르기 모달 (하단 시트) — 두 화면(결과·생성전)에서 공용 ──
  const pickerModal = openPicker ? (
    <div
      onClick={() => setOpenPicker(false)}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(40,28,22,0.4)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: '430px', maxHeight: '80vh', background: '#FDF6F0', borderRadius: '18px 18px 0 0', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 -8px 30px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', alignItems: 'center', padding: '15px 16px 12px', borderBottom: '0.5px solid #f0e0d5', flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#3a2e28' }}>궁금한 걸 골라보세요</div>
            <div style={{ fontSize: '11px', color: '#5c3a1e', marginTop: '2px' }}>하나만 골라주세요</div>
          </div>
          <button onClick={() => setOpenPicker(false)} aria-label="닫기"
            style={{ background: 'none', border: 'none', color: '#6b5340', fontSize: '20px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '12px', overflowY: 'auto', flex: 1 }}>
          {groupMulsangByCategory(MULSANG_QUESTIONS).map(({ category, items }) => {
            const gHasPicked = items.some(q => q.id === pickedQ)
            const open = openCat === category
            return (
              <div key={category} style={{ border: `0.5px solid ${gHasPicked ? '#6e50a055' : '#f0e0d5'}`, borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
                <div onClick={() => setOpenCat(open ? null : category)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 12px', background: gHasPicked ? '#6e50a014' : '#fff', cursor: 'pointer' }}>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: '#6e50a0' }}>{category}</span>
                  {gHasPicked && <span style={{ fontSize: '10px', color: '#fff', background: '#6e50a0', borderRadius: '9px', padding: '2px 7px' }}>선택됨</span>}
                  <span style={{ color: '#6e50a0', fontSize: '12px' }}>{open ? '▾' : '▸'}</span>
                </div>
                {open && (
                  <div style={{ padding: '8px 10px' }}>
                    {items.map(q => {
                      const on = pickedQ === q.id
                      const answered = answeredIds.has(q.id)
                      return (
                        <div key={q.id} onClick={() => { toggleQ(q.id); setOpenPicker(false) }} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 8px', borderRadius: '8px', background: on ? '#6e50a014' : 'transparent', marginBottom: '3px', cursor: 'pointer' }}>
                          <span style={{ width: '18px', height: '18px', borderRadius: '50%', border: `1.5px solid ${on ? '#6e50a0' : '#d8c4b4'}`, background: on ? '#6e50a0' : '#fff', color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{on ? '✓' : ''}</span>
                          <span style={{ flex: 1, fontSize: '12.5px', color: '#3a2e28' }}>{q.question}</span>
                          {answered && (
                            <span style={{ flexShrink: 0, fontSize: '10px', fontWeight: 700, color: '#5a8c5a', background: '#eaf4ea', border: '0.5px solid #cfe4cf', borderRadius: '8px', padding: '2px 7px' }}>✓ 본 질문</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  ) : null

  if (hasResult) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        {/* ── 상단 고정 영역: 헤더 + 사주원국 + 오행도 + 그림 (스크롤해도 고정, 그림에 집중) ── */}
        <div style={{ position: 'sticky', top: 0, zIndex: 50, background: '#FDF6F0' }}>
          {/* 밝은 헤더 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)', borderBottom: '0.5px solid #f0e0d5' }}>
            <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer' }}>←</button>
            <span style={{ fontSize: '15px', fontWeight: 500, color: '#3a2e28' }}>내 사주가 그림이 된다면?</span>
            <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>🏠</button>
          </div>

          <div style={{ padding: '10px 16px 0' }}>
            {/* ① 사주 원국 — 아코디언(접힘 기본) */}
            <div style={{ background: '#fffbf7', border: '0.5px solid #f0e0d5', borderRadius: '12px', marginBottom: '8px', overflow: 'hidden' }}>
              <div onClick={() => setOpenWonguk(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', cursor: 'pointer' }}>
                <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: '#3a2e28' }}>사주 원국 (내 여덟 글자)</span>
                <span style={{ color: '#8f3d0e', fontSize: '12px' }}>{openWonguk ? '▾' : '▸'}</span>
              </div>
              {openWonguk && (
                <div style={{ padding: '4px 12px 14px' }}>
                  <SajuWonguk saju={saju} dayStem={dayStem} yeonjji={yeonjji} iljji={iljji} gm1={gm1} gm2={gm2} />
                </div>
              )}
            </div>

            {/* ② 오행 분석 — 아코디언(접힘 기본) */}
            {ohaeng.length > 0 && (
              <div style={{ background: '#fffbf7', border: '0.5px solid #f0e0d5', borderRadius: '12px', marginBottom: '10px', overflow: 'hidden' }}>
                <div onClick={() => setOpenOhaeng(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 14px', cursor: 'pointer' }}>
                  <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: '#96502e' }}>오행 분석 — 그림이 이렇게 그려진 이유</span>
                  <span style={{ color: '#8f3d0e', fontSize: '12px' }}>{openOhaeng ? '▾' : '▸'}</span>
                </div>
                {openOhaeng && (
                  <div style={{ padding: '2px 12px 12px' }}>
                    <div style={{ fontSize: '11px', color: '#5c3a1e', marginBottom: '8px' }}>넘치는 기운은 풍성하게, 부족한 기운은 그림 속 빛으로 채워요</div>
                    <OhaengPentagon ohaeng={ohaeng} dayElement={dayStem ? MULSANG_STEM_EL[dayStem] : undefined} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {/* ── 여기서 상단 고정 끝. 아래는 스크롤 흐름 ── */}

          {/* ③ 그림 — 아코디언(펼침 기본). 접으면 상단이 짧아져 해설 집중, 펼치면 크게 */}
          <div style={{ background: '#fffbf7', borderTop: '0.5px solid #f0e0d5' }}>
            <div onClick={() => setOpenImage(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '11px 16px', cursor: 'pointer' }}>
              <span style={{ flex: 1, fontSize: '13px', fontWeight: 700, color: '#96502e' }}>내 사주 그림</span>
              <span style={{ fontSize: '11px', color: '#5c3a1e' }}>{openImage ? '접기' : '크게 보기'}</span>
              <span style={{ color: '#8f3d0e', fontSize: '12px' }}>{openImage ? '▾' : '▸'}</span>
            </div>
            {openImage && (
              <>
                <div style={{ background: '#1a1a18' }}>
                  {imageUrl ? (
                    <img src={imageUrl} alt="사주 풍경화" style={{ width: '100%', display: 'block' }} />
                  ) : imageError ? (
                    <div style={{ aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#5c3a1e', background: '#fdf6f0', padding: '24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '34px' }}>🖼️</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#96502e' }}>그림을 그리지 못했어요</span>
                      <span style={{ fontSize: '13px', lineHeight: 1.7, color: '#5c3a1e' }}>{imageError}</span>
                      <button onClick={doGenerate} disabled={loading}
                        style={{ marginTop: '4px', padding: '11px 22px', borderRadius: '10px', background: '#b46e46', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: loading ? 'default' : 'pointer' }}>
                        🔄 다시 그리기
                      </button>
                      <span style={{ fontSize: '11px', color: '#6b5340' }}>해설은 아래에서 보실 수 있어요</span>
                    </div>
                  ) : sp.get('recordId') ? (
                    // ★보관함 다시보기인데 그림이 없는 기록 — 그림 생성에 실패했던 건.
                    //   "곧 제공됩니다"는 사실이 아니므로 있는 그대로 알린다.
                    <div style={{ aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', background: '#fdf6f0', padding: '24px', textAlign: 'center' }}>
                      <span style={{ fontSize: '34px' }}>🖼️</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#96502e' }}>이 기록에는 그림이 없어요</span>
                      <span style={{ fontSize: '13px', lineHeight: 1.7, color: '#5c3a1e' }}>
                        그림 생성에 실패했던 기록이에요.<br />해설은 아래에서 보실 수 있어요.
                      </span>
                    </div>
                  ) : (
                    <div style={{ aspectRatio: '1/1', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#5555aa', background: cardBg }}>
                      <span style={{ fontSize: '40px' }}>🖼️</span>
                      <span style={{ fontSize: '12px' }}>그림 생성은 곧 제공됩니다</span>
                    </div>
                  )}
                </div>
                {imageUrl && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', padding: '10px 12px', background: '#fffbf7', borderBottom: '0.5px solid #f0e0d5' }}>
                    <button onClick={handleDownloadImage} disabled={imgSaving}
                      style={{ flex: 1, maxWidth: '200px', padding: '10px', borderRadius: '9px', background: '#b46e46', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: imgSaving ? 'default' : 'pointer' }}>
                      {imgSaving ? '내려받는 중…' : '⬇ 그림 저장'}
                    </button>
                    {typeof navigator !== 'undefined' && 'share' in navigator && (
                      <button onClick={handleShare}
                        style={{ flex: 1, maxWidth: '200px', padding: '10px', borderRadius: '9px', background: 'transparent', border: '0.5px solid #d8c4b4', color: '#96502e', fontSize: '13px', cursor: 'pointer' }}>
                        ↗ 공유
                      </button>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

        <div style={{ padding: '16px' }}>
          {/* ⑤ 그림 해설 통변 (질문 선택) ── */}
          <div style={{ margin: '4px 0 14px', color: '#3a2e28' }}>
            {/* ★질문 고르기 — 현재 숨김(MULSANG_QUESTION_OPEN).
                해설은 그림과 함께 자동으로 나오므로 고객이 따로 누를 필요가 없다. */}
            {MULSANG_QUESTION_OPEN && (
              <>
                <div onClick={() => openQuestionPicker()}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '13px 14px', background: '#fffbf7', border: '0.5px solid #f0e0d5', borderRadius: '12px', cursor: 'pointer' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#96502e' }}>그림에서 궁금한 걸 골라보세요</div>
                    <div style={{ fontSize: '11px', color: pickedQ ? '#6e50a0' : '#b4785a', marginTop: '2px' }}>
                      {pickedQ ? MULSANG_QUESTIONS.find(q => q.id === pickedQ)?.question : '안 고르면 그림 전체를 대략 풀어드려요'}
                    </div>
                  </div>
                  <span style={{ color: '#8f3d0e', fontSize: '15px' }}>›</span>
                </div>

                {pickedQ && (
                  <button onClick={() => runTongbyeon('selected')} disabled={tongLoading}
                    style={{ width: '100%', height: '46px', background: '#b46e46', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer', marginTop: '10px' }}>
                    이 질문으로 그림 풀이 받기
                  </button>
                )}
              </>
            )}

            {/* ★해설 다시 받기 — 해설이 실패했을 때만 보인다 (평소엔 자동 생성됨) */}
            {!tongLoading && !tongResult && (
              <button onClick={() => runTongbyeon('all')}
                style={{ width: '100%', height: '42px', background: 'transparent', border: '0.5px solid #d8c4b4', borderRadius: '12px', color: '#96502e', fontSize: '13px', cursor: 'pointer', marginTop: '8px' }}>
                그림 해설 받기
              </button>
            )}

            {/* 통변 결과 */}
            {showTongbyeon && (
              <div style={{ marginTop: '14px' }}>
                {tongLoading ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', padding: '24px', color: '#5c3a1e', fontSize: '13px' }}>
                    <span style={{ fontSize: '28px', display: 'inline-block', animation: 'spin 1.1s linear infinite', color: '#8f3d0e' }}>✦</span>
                    <span>그림을 찬찬히 살펴보는 중이에요…</span>
                  </div>
                ) : tongResult ? (
                  <>
                    <div style={{ background: '#fffbf7', border: '0.5px solid #f0e0d5', borderRadius: '12px', padding: '14px', fontSize: '13.5px', lineHeight: 1.85, color: '#3a2e28', whiteSpace: 'pre-wrap' }}>
                      {tongResult}
                    </div>
                    {/* ★해설 복사 — 카톡 등에 붙여넣기 */}
                    {!tongLoading && (
                      <div style={{ display: 'flex', gap: '7px', marginTop: '8px' }}>
                        <div style={{ flex: 1 }}>
                          <CopyTextButton text={tongResult} label="사주 그림 해설" name={info?.name} />
                        </div>
                        {imageUrl && (
                          <button onClick={handleShareCard} disabled={cardBusy}
                            style={{ flex: 1, padding: '11px', borderRadius: '10px', background: '#b46e46',
                              border: 'none', color: '#fff', fontSize: '12.5px', fontWeight: 700,
                              cursor: cardBusy ? 'default' : 'pointer' }}>
                            {cardBusy ? (cardStep || '만드는 중…') : '🖼️ 카드로 저장'}
                          </button>
                        )}
                      </div>
                    )}
                    {!tongLoading && imageUrl && (
                      <div style={{ fontSize: '10.5px', color: '#6b5340', textAlign: 'center', marginTop: '6px' }}>
                        카드로 저장하면 그림과 해설이 한 장으로 저장돼요
                      </div>
                    )}
                  </>
                ) : null}
              </div>
            )}
          </div>

          {/* 전문가 상담 연결 — 현재 숨김 (되살리려면 false를 true로) */}
          {false && (
            <button onClick={goConsult}
              style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'transparent', border: '1px solid #c8783c', color: '#96502e', fontSize: '14px', fontWeight: 500, cursor: 'pointer', marginTop: '8px', marginBottom: '12px' }}>
              🔮 이 그림에 대해 전문가와 상담하기 →
            </button>
          )}

          {/* ★다른 화풍으로 다시 그리기 — 지금 화풍을 뺀 나머지만 고르게 한다.
              (1회 결제 = 그림 1장이므로 다시 그리면 다시 결제된다) */}
          {(() => {
            const others = ACTIVE_STYLES.filter(k => k !== style)
            if (!drawActive || others.length === 0) return null
            // 고른 값이 없거나 지금 화풍과 겹치면 첫 번째 것으로 본다 (렌더 중 계산 — setState 안 씀)
            const picked = redrawPick && others.includes(redrawPick) ? redrawPick : others[0]
            return (
              <div style={{ background: '#fffbf7', border: '0.5px solid #f0e0d5', borderRadius: '14px', padding: '14px' }}>
                <div style={{ fontSize: '12px', color: '#5c3a1e', marginBottom: '8px' }}>다른 화풍으로 다시 그리기</div>
                <select value={picked} onChange={e => setRedrawPick(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '10px', background: '#fff', border: '0.5px solid #e4d4be', color: '#96502e', fontSize: '14px', marginBottom: '10px' }}>
                  {others.map(key => (
                    <option key={key} value={key}>{STYLE_CONFIGS[key].label}</option>
                  ))}
                </select>
                <button onClick={() => { setStyle(picked); setRedrawPick(null); openPay() }}
                  style={{ width: '100%', padding: '12px', borderRadius: '10px', background: '#b46e46', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 700, cursor: 'pointer' }}>
                  ✨ 다시 그리기 · {drawPrice.toLocaleString()}원
                </button>
              </div>
            )
          })()}

          {/* ★보관함 저장 상태 — 누르는 버튼이 아니라 표시다 (그림이 뜨면 자동 저장).
              실패했을 때만 [다시 저장]을 눌러 재시도한다. (19-2부) */}
          {imageUrl && saveState !== 'idle' && (
            <div style={{ marginTop: '12px' }}>
              {saveState === 'failed' ? (
                <div style={{ background: '#fdf0e8', border: '0.5px solid #f0d5c0', borderRadius: '12px', padding: '13px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13px', color: '#8f3d0e', marginBottom: '8px' }}>보관함에 저장하지 못했어요</div>
                  <button onClick={() => { setSaveState('idle'); handleSaveRecord() }}
                    style={{ padding: '9px 20px', borderRadius: '9px', background: '#b46e46', border: 'none', color: '#fff', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    다시 저장
                  </button>
                </div>
              ) : (
                <div style={{ background: '#eef5e8', borderRadius: '12px', padding: '13px', textAlign: 'center' }}>
                  <div style={{ fontSize: '13.5px', color: '#4a7a3a', fontWeight: 700 }}>
                    {saveState === 'saving' ? '보관함에 저장하는 중…' : '✓ 보관함에 저장됐어요'}
                  </div>
                  {saveState === 'saved' && (
                    <div style={{ fontSize: '11px', color: '#5c7a4a', marginTop: '3px' }}>
                      {STYLE_CONFIGS[style]?.label} · 보관함에서 언제든 다시 보실 수 있어요
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <button onClick={() => router.push('/manseryeok/mulsang-storage')}
            style={{ width: '100%', padding: '13px', borderRadius: '12px', marginTop: '10px', marginBottom: '4px',
              background: 'transparent', border: '0.5px solid #d8c4b4', color: '#96502e', fontSize: '14px', fontWeight: 500, cursor: 'pointer' }}>
            👥 다른 사람 그리기
          </button>
        </div>

        {/* ★공유 카드 원본 — 화면 밖에 두고 캡처만 한다.
            display:none 은 캡처가 안 되므로 왼쪽 바깥으로 밀어둔다. */}
        {cardImg && (
          <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
            <div ref={shareRef} style={{ width: '600px', background: '#FDF6F0', fontFamily: 'inherit' }}>
              <img src={cardImg} alt="" style={{ width: '600px', height: '600px', display: 'block', objectFit: 'cover' }} />
              <div style={{ padding: '22px 26px 18px' }}>
                <div style={{ fontSize: '19px', fontWeight: 700, color: '#96502e', marginBottom: '12px', lineHeight: 1.4 }}>
                  {firstCard.title || '그림 속 당신'}
                </div>
                <div style={{ fontSize: '15.5px', lineHeight: 2.0, color: '#3a2e28', whiteSpace: 'pre-wrap' }}>
                  {cardText || firstCard.body}
                </div>
              </div>
              <div style={{ borderTop: '1px solid #f0e0d5', padding: '15px 26px 20px', textAlign: 'center' }}>
                <span style={{ fontSize: '15px', fontWeight: 700, color: '#96502e' }}>☕ 명카페</span>
              </div>
            </div>
          </div>
        )}

        {PayPopup}
        {pickerModal}
      </main>
    )
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)', borderBottom: '0.5px solid #f0e0d5' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer' }}>←</button>
        <span style={{ fontSize: '15px', fontWeight: 500, color: '#3a2e28' }}>내 사주가 그림이 된다면?</span>
        <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer' }}>🏠</button>
      </div>
      <div style={{ padding: '16px' }}>
        <div style={{ background: '#fffbf7', border: '0.5px solid #f0e0d5', borderRadius: '14px', padding: '14px 16px', marginBottom: '18px' }}>
          <div style={{ fontSize: '12px', color: '#5c3a1e', marginBottom: '5px' }}>내 사주</div>
          <div style={{ fontSize: '15px', color: '#3a2e28' }}>{sajuLine}</div>
        </div>

        <div style={{ width: '100%', height: '150px', borderRadius: '14px', background: 'linear-gradient(160deg,#f0e6d8,#e4d4be)', border: '0.5px solid #f0e0d5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '18px' }}>
          <span style={{ fontSize: '34px', opacity: 0.5 }}>🖼️</span>
          <span style={{ fontSize: '12px', color: '#5c3a1e' }}>내 사주 여덟 글자로 그리는 나만의 풍경화</span>
        </div>

        {/* ★화풍 고르기 — 고를 게 둘 이상일 때만 띄운다. 2줄(2개씩) 배치. */}
        {ACTIVE_STYLES.length > 1 && (
          <>
            <div style={{ fontSize: '12px', color: '#96502e', fontWeight: 500, marginBottom: '7px' }}>화풍 고르기</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '7px', marginBottom: '16px' }}>
              {ACTIVE_STYLES.map(key => {
                const on = style === key
                return (
                  <div key={key} onClick={() => !loading && setStyle(key)}
                    style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#fff', border: `${on ? 1.5 : 0.5}px solid ${on ? '#b46e46' : '#f0e0d5'}`, borderRadius: '10px', padding: '8px 10px', cursor: loading ? 'default' : 'pointer' }}>
                    <span style={{ fontSize: '17px', flexShrink: 0 }}>{STYLE_EMOJI[key] ?? '🌿'}</span>
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: 'block', fontSize: '12.5px', fontWeight: on ? 700 : 400, color: on ? '#96502e' : '#b4785a', lineHeight: 1.25 }}>{STYLE_CONFIGS[key].label}</span>
                      <span style={{ display: 'block', fontSize: '10px', color: on ? '#b4785a' : '#c0a898', lineHeight: 1.25 }}>{STYLE_DESC[key] ?? ''}</span>
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {drawActive ? (
          <button onClick={openPay} disabled={loading || converting}
            style={{
              width: '100%', padding: '15px', borderRadius: '12px', marginBottom: '12px',
              background: '#b46e46', border: 'none', color: '#fff', fontSize: '15px', fontWeight: 700,
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
          <div style={{ textAlign: 'center', color: '#5c3a1e', fontSize: '13px', marginBottom: '20px' }}>
            현재 그림 생성 서비스는 준비 중입니다.
          </div>
        )}

        {!loading && drawActive && (
          <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b5340', marginBottom: '8px' }}>
            그림이 완성되면 사주 해설이 이어서 나와요
          </div>
        )}

        {loading && (
          <div style={{ background: '#fffbf7', border: '0.5px solid #f0e0d5', borderRadius: '14px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
            <span style={{ fontSize: '40px', display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span>
            <div style={{ textAlign: 'center', color: '#96502e', fontSize: '13px', lineHeight: 1.7 }}>
              당신의 사주를 풍경으로 그리고 있어요<br />
              <span style={{ color: '#5c3a1e', fontSize: '12px' }}>잠시만 기다려 주세요 (최대 1분)</span>
            </div>
          </div>
        )}
      </div>

      {PayPopup}
      {pickerModal}
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
