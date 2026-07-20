'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsinCompat } from '@/lib/saju/yongsinNew'
import { supabase } from '@/lib/supabase'
import type { DiagnoseResult, NameChar } from '@/lib/saju/naming'
import ConsultButton from '@/app/components/common/ConsultButton'
import { fromProfile, fromUrl, personKey, type MyInfo } from '@/lib/saju/myInfo'
import {
  saveNamingRecord, getNamingRecord,
  type NamingPerson,
} from '@/lib/saju/namingRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import PerspectiveAccordion from '@/app/manseryeok/components/PerspectiveAccordion'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'

const NAMING_RESULT_KEY = 'naming_last_result_v1'

const AVOID_KEYWORDS = [
  '죽을', '죽일', '주검', '시체', '시신', '송장', '애도', '슬플', '슬픔',
  '근심', '걱정', '병', '앓을', '아플', '악할', '흉할', '흉', '재앙', '재난',
  '천할', '천박', '종', '노예', '놈', '도둑', '도적', '귀신', '미칠', '미치광이',
  '어리석을', '간사할', '간교', '허물', '꺾을', '무너질', '망할', '멸할',
  '원수', '저주', '독', '괴로울', '비참', '울', '눈물', '한숨',
]

interface HanjaRow {
  hangul: string
  hanja: string
  meaning: string
  strokes: number
  resource_ohaeng: string
  sound_ohaeng: string
  avoid_hard?: boolean
  avoid_soft?: boolean
  grade?: string
}

// 5관점 3단 해설(무엇을 보나/이 이름은/어떤 의미인가)
interface Perspective {
  intro: string    // 무엇을 보나 (원리)
  name: string     // 이 이름은 (사실)
  meaning: string  // 어떤 의미인가 (서술)
}
interface Commentary {
  title: string
  yinyang: Perspective   // ① 음양오행
  baleum: Perspective    // ② 발음오행
  suri: Perspective      // ③ 수리오행
  jawon: Perspective     // ④ 자원오행
  yongsin: Perspective   // ⑤ 사주와의 만남
  conclusion: string     // 맺음말
}

const EMPTY_PERSPECTIVE: Perspective = { intro: '', name: '', meaning: '' }

// 보관함 스냅샷의 commentary를 5관점 Commentary로 안전 변환.
//   - 새 데이터(yinyang 등 보유): 부족한 관점만 빈값 채워 그대로 사용.
//   - 옛 데이터(summary/good 등): 옛 내용을 맺음말에 모아 5관점 껍데기로 감싼다(화면 안 깨짐).
//   - null/형식불명: null 반환.
function normalizeCommentary(raw: unknown): Commentary | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const asPersp = (v: unknown): Perspective => {
    if (v && typeof v === 'object') {
      const p = v as Record<string, unknown>
      return {
        intro: typeof p.intro === 'string' ? p.intro : '',
        name: typeof p.name === 'string' ? p.name : '',
        meaning: typeof p.meaning === 'string' ? p.meaning : '',
      }
    }
    return { ...EMPTY_PERSPECTIVE }
  }
  const hasNew = 'yinyang' in o || 'baleum' in o || 'jawon' in o || 'conclusion' in o
  if (hasNew) {
    return {
      title: typeof o.title === 'string' ? o.title : '',
      yinyang: asPersp(o.yinyang),
      baleum: asPersp(o.baleum),
      suri: asPersp(o.suri),
      jawon: asPersp(o.jawon),
      yongsin: asPersp(o.yongsin),
      conclusion: typeof o.conclusion === 'string' ? o.conclusion : '',
    }
  }
  // 옛 데이터 호환: summary/good/improve/advice → 맺음말로 합쳐 표시
  const legacy = [o.summary, o.good, o.improve, o.advice]
    .filter((x): x is string => typeof x === 'string' && x.trim() !== '')
    .join('\n\n')
  return {
    title: typeof o.title === 'string' ? o.title : '',
    yinyang: { ...EMPTY_PERSPECTIVE },
    baleum: { ...EMPTY_PERSPECTIVE },
    suri: { ...EMPTY_PERSPECTIVE },
    jawon: { ...EMPTY_PERSPECTIVE },
    yongsin: { ...EMPTY_PERSPECTIVE },
    conclusion: legacy,
  }
}

// ── 신버전 피치톤 팔레트 (result-new / 타로 신버전과 동일) ──
const PAGE_BG = '#FDF6F0'      // 페이지 배경
const cardBg = '#fffbf7'       // 카드 표면
const gold = '#c8783c'         // 강조(구 금색 대체) — 변수명은 유지해 하위 코드 그대로 사용
const ink = '#1a1a1a'          // 본문 진한 텍스트
const sub = '#b4785a'          // 보조 텍스트
const subWarm = '#96502e'      // 따뜻한 강조 텍스트
const rose = '#c8506e'         // 삭제·경고 포인트
const border = '0.5px solid #f0e0d5'

function isAvoidChar(row: HanjaRow): boolean {
  if (row.avoid_hard === true) return true
  if (row.grade === '不用') return true
  const m = row.meaning || ''
  return AVOID_KEYWORDS.some((k) => m.includes(k))
}

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

// ── 신버전 자체 피치 sticky 헤더 (공용 다크 PageHeader 대체) ──
//   result-new / 타로 신버전과 동일 구조: 반투명 피치 + blur + 하단 보더.
function PitchHeader({ title, onBack, onHome }: { title: string; onBack: () => void; onHome?: () => void }) {
  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 50,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px', background: 'rgba(250,250,248,0.96)',
      backdropFilter: 'blur(10px)', borderBottom: '0.5px solid #f0e0d5',
    }}>
      <button onClick={onBack} aria-label="뒤로"
        style={{ background: 'none', border: 'none', color: '#999', fontSize: '20px', cursor: 'pointer', padding: 0, lineHeight: 1 }}>←</button>
      <span style={{ fontSize: '15px', fontWeight: 500, color: '#1a1a1a' }}>{title}</span>
      {onHome
        ? <button onClick={onHome} aria-label="홈" style={{ background: 'none', border: 'none', fontSize: '17px', cursor: 'pointer', padding: 0 }}>🏠</button>
        : <span style={{ width: 20 }} />}
    </div>
  )
}

function DiagnosisInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [info, setInfo] = useState<MyInfo | null>(null)

  // ── 진단 대상 구분 (내 이름 / 남 이름) ──
  //   URL에 name·relation 이 있으면 "남(가족·지인)"을 진단하는 중.
  //   보관함 저장 시 relation('self' 또는 관계)으로 구분해 넣는다.
  const urlName = sp.get('name') || ''
  const urlRelation = sp.get('relation') || ''
  const targetRelation = urlRelation || (urlName ? '지인' : 'self')

  // 사람 선택 모달 (다른 사람 진단하기)
  const [pickerOpen, setPickerOpen] = useState(false)

  // 보관함 다시보기(recordId)로 진입했는지 + saju_records 저장 id
  const recordId = sp.get('recordId')
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
  const [viewOnly, setViewOnly] = useState(false)

  // 가격 (이름 풀이 / 한자 바꾸기)
  const [readPrice, setReadPrice] = useState(5000)
  const [hanjaPrice, setHanjaPrice] = useState(20000)

  useEffect(() => {
    supabase
      .from('analysis_prices')
      .select('price_key, price')
      .in('price_key', ['naming_read', 'naming_hanja'])
      .then(({ data }) => {
        if (data) {
          const read = data.find(d => d.price_key === 'naming_read')
          const hanja = data.find(d => d.price_key === 'naming_hanja')
          if (read) setReadPrice(read.price)
          if (hanja) setHanjaPrice(hanja.price)
        }
      })
  }, [])

  useEffect(() => {
    let cancelled = false

    async function loadInfo() {
      const urlInfo = fromUrl(sp)
      if (urlInfo) {
        if (!cancelled) setInfo(urlInfo)
        return
      }

      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          const { data: p } = await supabase
            .from('profiles')
            .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
            .eq('id', u.user.id)
            .single()
          const profInfo = fromProfile(p)
          if (profInfo) {
            if (!cancelled) setInfo(profInfo)
            return
          }
        }
      } catch (e) {
        console.error(e)
      }

      if (!cancelled) setInfo(null)
    }

    loadInfo()
    return () => { cancelled = true }
  }, [sp])

  const infoYear = info ? parseInt(info.year) : 0
  const infoMonth = info ? parseInt(info.month) : 0
  const infoDay = info ? parseInt(info.day) : 0
  const infoHourIdx = info ? (info.hour === '모름' ? null : parseInt(info.hour)) : null

  const { saju, dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    infoYear,
    infoMonth,
    infoDay,
    info?.leapMonth || '0',
    infoHourIdx,
  )

  const [nameInput, setNameInput] = useState('')
  const [syllables, setSyllables] = useState<string[]>([])
  const [chars, setChars] = useState<(NameChar | null)[]>([])

  const [pickerIdx, setPickerIdx] = useState<number | null>(null)
  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [searching, setSearching] = useState(false)

  const [step, setStep] = useState<'input' | 'preview' | 'pay' | 'result'>('input')
  const [result, setResult] = useState<DiagnoseResult | null>(null)
  const [commentary, setCommentary] = useState<Commentary | null>(null)
  const [loading, setLoading] = useState(false)


  // ★ 마이페이지에서 특정 이름풀이 id를 눌러 들어온 경우 (?nameId=xxx)
  // 저장된 그 1건만 불러와 바로 결과 화면으로. (회원·기록이 많아져도 누른 1건만 조회)
  const nameId = sp.get('nameId')
  const [loadingSaved, setLoadingSaved] = useState(false)

  useEffect(() => {
    if (!nameId) return
    let cancelled = false
    async function loadOneById() {
      setLoadingSaved(true)
      try {
        const { data: u } = await supabase.auth.getUser()
        if (!u?.user) { setLoadingSaved(false); return }
        const { data: row } = await supabase
          .from('my_names')
          .select('hangul_name, hanja_name, chars, result, commentary')
          .eq('id', nameId)
          .eq('user_id', u.user.id)   // 본인 것만 (남의 id로 조회 방지)
          .maybeSingle()
        if (cancelled) return
        if (row && row.result && row.commentary && Array.isArray(row.chars)) {
          setResult(row.result as DiagnoseResult)
          setCommentary(normalizeCommentary(row.commentary))
          setChars(row.chars as (NameChar | null)[])
          setSyllables((row.chars as (NameChar | null)[]).filter(Boolean).map((c) => c!.hangul))
          setStep('result')
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoadingSaved(false)
      }
    }
    loadOneById()
    return () => { cancelled = true }
  }, [nameId])

  // ★ 남(가족·지인) 진단으로 들어온 경우: URL의 이름(name)을 입력칸에 자동으로 채운다.
  //   보관함 > "새 이름 풀이하기" > 사람 선택(오연희 등) 시 그 사람 이름이 실려 온다.
  //   → 사용자가 다시 타이핑하지 않고 바로 한자 고르기로 넘어갈 수 있다.
  useEffect(() => {
    if (nameId || recordId) return    // 저장건 다시보기는 제외
    if (urlName) setNameInput(urlName)
  }, [urlName, nameId, recordId])

  // ── 보관함(saju_records) 다시보기: recordId 있으면 스냅샷 로드 → 바로 결과 ──
  //   재계산·AI 재호출 없이 저장된 풀이를 그대로 보여준다 (viewOnly).
  useEffect(() => {
    if (!recordId) return
    let cancelled = false
    async function loadByRecordId() {
      setLoadingSaved(true)
      try {
        const rec = await getNamingRecord(recordId!)
        if (cancelled || !rec) return
        const snap = rec.snapshot
        if (snap?.result) {
          setResult(snap.result)
          setCommentary(normalizeCommentary(snap.commentary))
          setChars(rec.chars)
          setSyllables(rec.chars.filter(Boolean).map((c) => c!.hangul))
          setSavedRecordId(rec.id)
          setViewOnly(true)
          setStep('result')
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setLoadingSaved(false)
      }
    }
    loadByRecordId()
    return () => { cancelled = true }
  }, [recordId])

  function applyName() {
    const cleaned = nameInput.trim().replace(/\s/g, '')
    const arr = Array.from(cleaned).filter(isHangulSyllable)
    if (arr.length < 2) return
    setSyllables(arr)
    setChars(arr.map(() => null))
  }

  async function openPicker(idx: number) {
    setPickerIdx(idx)
    const hangul = syllables[idx]
    if (!hangul) { setHanjaList([]); return }
    setSearching(true)
    try {
      const { data, error } = await supabase
        .from('hanja')
        .select('hangul, hanja, meaning, strokes, resource_ohaeng, sound_ohaeng, avoid_hard, avoid_soft, grade')
        .eq('hangul', hangul)
        .order('strokes', { ascending: true })
      if (error) { console.error(error); setHanjaList([]) }
      else setHanjaList((data as HanjaRow[]) ?? [])
    } catch (e) {
      console.error(e)
      setHanjaList([])
    } finally {
      setSearching(false)
    }
  }

  function pickHanja(row: HanjaRow) {
    if (pickerIdx === null) return
    const next = [...chars]
    next[pickerIdx] = {
      hangul: row.hangul,
      hanja: row.hanja,
      strokes: row.strokes,
      resourceOhaeng: row.resource_ohaeng,
    }
    setChars(next)
    setPickerIdx(null)
    setHanjaList([])
  }

  const surname = chars[0] ?? null
  const given = chars.slice(1).filter((c): c is NameChar => c !== null)
  const allPicked = syllables.length >= 2 && chars.length === syllables.length && chars.every((c) => c !== null)
  const canSubmit = allPicked

  function handlePreview() {
    if (!canSubmit) return
    setStep('preview')
  }

  // ★ 이름풀이 해설(commentary)을 상담사 화면 표시용 텍스트로 변환 (물상도 방식과 동일)
  function buildNamingAnalysisText(hanjaName: string, hangulName: string, c: Commentary | null): string {
    if (!c) return ''
    const persp = (label: string, p: { intro: string; name: string; meaning: string }) =>
      `· ${label}\n${[p?.intro, p?.name, p?.meaning].filter(Boolean).join('\n')}`
    return [
      `[이름풀이 · ${hangulName} (${hanjaName})]`,
      c.title ? `"${c.title}"` : '',
      persp('음양오행', c.yinyang),
      persp('발음오행', c.baleum),
      persp('수리오행', c.suri),
      persp('자원오행', c.jawon),
      persp('사주와의 만남', c.yongsin),
      c.conclusion ? `· 맺음\n${c.conclusion}` : '',
    ].filter(Boolean).join('\n\n').trim()
  }

  // ★ 결과가 표시되면(새로 풀든, 저장결과 불러오든) 상담사 전달용 세션을 저장.
  //   ConsultButton이 consultant-select로 이동만 하면, 그쪽이 이 세션을 읽어
  //   namings 저장 + consultations.ai_analysis 표시에 사용.
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (step !== 'result' || !result) return
    try {
      const hangulName = chars.filter(Boolean).map((c) => c!.hangul).join('')
      const hanjaName = chars.filter(Boolean).map((c) => c!.hanja).join('')
      sessionStorage.setItem('naming_full', JSON.stringify({
        kind: 'self',
        hangul_name: hangulName,
        hanja_name: hanjaName,
        chars,
        result: result ?? null,
        commentary: commentary ?? null,
        target_birth: null,
      }))
      const text = buildNamingAnalysisText(hanjaName, hangulName, commentary)
      if (text) sessionStorage.setItem('ai_analysis', text)
    } catch {}
  }, [step, result, commentary, chars])

  async function handleFullResult() {
    if (!canSubmit || !surname || !saju || !dayStem) return
    setStep('result')
    setLoading(true)
    try {
      const yongsinResult = calcYongsinCompat(saju, dayStem)
      const sajuText = saju.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(', ')
      const res = await fetch('/api/naming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surname,
          given,
          yongsin: yongsinResult.yongsin,
          heeksin: yongsinResult.heeksin,
          elementScore: yongsinResult.score,
          dayStem,
          sajuText,
          birthData: info,
          saju,
        }),
      })
      const data = await res.json()
      setResult(data.result ?? null)
      setCommentary(normalizeCommentary(data.commentary))
      const pkey = personKey(info)
      try {
        localStorage.setItem(NAMING_RESULT_KEY, JSON.stringify({
          result: data.result ?? null,
          commentary: data.commentary ?? null,
          chars,
          personKey: pkey,
        }))
        // ★ 예약 시 상담사 화면으로 넘길 개명 결과 (궁합·물상도와 동일 방식)
        const hangulName = chars.filter(Boolean).map((c) => c!.hangul).join('')
        const hanjaName = chars.filter(Boolean).map((c) => c!.hanja).join('')
        sessionStorage.setItem('naming_full', JSON.stringify({
          kind: 'self',
          hangul_name: hangulName,
          hanja_name: hanjaName,
          chars,
          result: data.result ?? null,
          commentary: data.commentary ?? null,
          target_birth: null,
        }))
        // ★ 상담사 화면에 뜰 해설 텍스트도 함께 저장 (물상도 방식과 동일)
        const analysisText = buildNamingAnalysisText(hanjaName, hangulName, data.commentary ?? null)
        if (analysisText) sessionStorage.setItem('ai_analysis', analysisText)

        localStorage.removeItem('rename_picks_v1')
        localStorage.removeItem('rename_locked_slot')
      } catch {}

      try {
        const { data: u } = await supabase.auth.getUser()
        if (u?.user) {
          const hangulName = chars.filter(Boolean).map((c) => c!.hangul).join('')
          const hanjaName = chars.filter(Boolean).map((c) => c!.hanja).join('')
          const { error: nameErr } = await supabase.from('my_names').insert({
            user_id: u.user.id,
            hangul_name: hangulName,
            hanja_name: hanjaName,
            chars,
            result: data.result ?? null,
            commentary: data.commentary ?? null,
            // 남(가족·지인) 진단이면 'other', 내 이름이면 'self'
            kind: targetRelation === 'self' ? 'self' : 'other',
            person_key: pkey,
          })
          if (nameErr) console.error('이름 저장 실패:', nameErr.message)
        }
      } catch {}

      // ── 신규: saju_records 보관함에도 병행 저장 (service_type='naming') ──
      //   대량 운영·관계별 트렌드·기기 무관 조회를 위해. (my_names·세션 저장은 위에서 유지)
      try {
        const person: NamingPerson | null = info ? {
          gender: info.gender, calType: info.calType,
          year: info.year, month: info.month, day: info.day,
          leapMonth: info.leapMonth, hour: info.hour,
        } : null
        const saved = await saveNamingRecord({
          chars,
          relation: targetRelation,
          person,
          result: data.result as DiagnoseResult,
          commentary: data.commentary ?? null,
        })
        if (saved.ok && saved.id) setSavedRecordId(saved.id)
      } catch (e) { console.error(e) }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  function resetAll() {
    setNameInput(''); setSyllables([]); setChars([])
    setResult(null); setCommentary(null); setStep('input')
    try {
      localStorage.removeItem(NAMING_RESULT_KEY)
      localStorage.removeItem('rename_picks_v1')
      localStorage.removeItem('rename_locked_slot')
    } catch {}
  }

  // ★ id로 저장 결과 불러오는 중 로딩 화면
  if (nameId && loadingSaved && step !== 'result') {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto' }}>
        <PitchHeader title="내 이름 풀이" onBack={() => router.push('/mypage-new')} onHome={() => router.push('/home-new')} />
        <div style={{ padding: '60px 20px', textAlign: 'center', color: gold, fontSize: '14px' }}>
          저장된 이름 풀이를 불러오는 중…
        </div>
      </main>
    )
  }

  if (!info && !nameId) {
    return (
      <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto' }}>
        <PitchHeader title="내 이름 풀이" onBack={() => router.push('/home-new')} onHome={() => router.push('/home-new')} />
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#5c3a1e' }}>
          <p style={{ marginBottom: '12px', fontSize: '15px', color: '#1a1a1a' }}>먼저 사주 정보를 입력해주세요.</p>
          <p style={{ marginBottom: '24px', fontSize: '13px', lineHeight: 1.7 }}>
            홈 화면에서 생년월일 · 음양력 · 태어난 시(시주)를<br />입력하시면 이름 풀이를 시작할 수 있어요.
          </p>
          <button onClick={() => router.push('/')}
            style={{ padding: '12px 24px', borderRadius: '12px', background: '#c8783c', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
            홈에서 사주 입력하기 →
          </button>
        </div>
      </main>
    )
  }

  const sajuLine = converting ? '사주 불러오는 중...' :
    (dayStem && info
      ? `일간 ${dayStem} · ${info.calType} ${info.year}.${info.month}.${info.day}${info.calType === '음력' && info.leapMonth === '1' ? ' (윤달)' : ''}`
      : '저장된 이름 풀이')

  const slotLabel = (i: number) => i === 0 ? '성(姓)' : `이름 ${i}글자`

  const normalList = hanjaList.filter((r) => !isAvoidChar(r))
  const avoidList = hanjaList.filter((r) => isAvoidChar(r))

  const hanjaCard = (row: HanjaRow, i: number, dim: boolean) => (
    <div key={i}
      onClick={() => pickHanja(row)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
        borderRadius: '12px', background: '#fffbf7', cursor: 'pointer',
        border: '0.5px solid #f0e0d5', opacity: dim ? 0.45 : 1,
      }}>
      <span style={{ fontSize: '26px', fontWeight: 'bold', color: gold, minWidth: '32px', textAlign: 'center' }}>
        {row.hanja}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.meaning}</div>
        <div style={{ fontSize: '11px', color: '#5c3a1e', marginTop: '2px' }}>
          {row.resource_ohaeng}·{row.strokes}획
        </div>
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <PitchHeader title="내 이름 풀이" onBack={() => router.push((sp.get('from') === 'mypage' || nameId) ? '/mypage-new' : '/manseryeok/naming/diagnosis/storage')} onHome={() => router.push('/home-new')} />

      <div style={{ padding: '16px' }}>
        <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#5c3a1e', marginBottom: '6px' }}>내 사주</div>
          <div style={{ fontSize: '14px', color: '#1a1a1a' }}>{sajuLine}</div>
        </div>

        {step === 'input' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#5c3a1e' }}>
                {targetRelation === 'self' ? '본인' : (urlName || '이 분')} 이름을 한글로 입력하세요
              </span>
              <button onClick={() => setPickerOpen(true)}
                style={{ background: 'rgba(200,120,60,0.10)', color: '#96502e', fontSize: '11px', fontWeight: 500, padding: '5px 11px', borderRadius: '16px', border: 'none', cursor: 'pointer' }}>
                ＋ 다른 사람 진단
              </button>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: syllables.length > 0 ? '26px' : '20px' }}>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyName() }}
                placeholder="예: 홍길동"
                maxLength={5}
                style={{
                  flex: 1, padding: '13px', borderRadius: '12px', background: '#FDF6F0',
                  border: '0.5px solid #f0e0d5', color: '#1a1a1a', fontSize: '16px',
                }} />
              <button onClick={applyName}
                style={{ padding: '13px 20px', borderRadius: '12px', background: gold, border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer' }}>
                확인
              </button>
            </div>

            {syllables.length >= 2 && (
              <>
                <div style={{ fontSize: '13px', color: '#5c3a1e', marginBottom: '16px' }}>
                  각 글자의 한자를 골라주세요
                </div>
                <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {syllables.map((syl, i) => {
                    const c = chars[i]
                    return (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <button onClick={() => openPicker(i)} className="active:scale-95"
                          style={{
                            width: '78px', height: '78px', borderRadius: '50%',
                            background: c ? 'rgba(200,120,60,0.10)' : cardBg,
                            border: c ? `2px solid ${gold}` : '1px dashed #d8a87e',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'transform 0.15s ease',
                          }}>
                          {c ? (
                            <>
                              <span style={{ fontSize: '30px', fontWeight: 'bold', color: gold, lineHeight: 1 }}>{c.hanja}</span>
                              <span style={{ fontSize: '10px', color: '#5c3a1e', marginTop: '3px' }}>{c.hangul}</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#1a1a1a', lineHeight: 1 }}>{syl}</span>
                              <span style={{ fontSize: '9px', color: gold, marginTop: '4px' }}>한자 고르기</span>
                            </>
                          )}
                        </button>
                        <div style={{ fontSize: '9px', color: '#5c3a1e', marginTop: '5px' }}>
                          {c ? `${c.resourceOhaeng}·${c.strokes}획` : slotLabel(i)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: '11px', color: '#5c3a1e', marginBottom: '20px', lineHeight: 1.6 }}>
                  · 원을 누르면 그 글자의 한자가 자동으로 나와요<br />
                  · 이름을 바꾸려면 위에 다시 입력하고 확인을 누르세요
                </div>

                <button onClick={handlePreview} disabled={!canSubmit}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: canSubmit ? '#c8783c' : '#e8ddd0',
                    border: 'none', color: canSubmit ? '#fff' : '#b4785a',
                    fontSize: '15px', fontWeight: 'bold', cursor: canSubmit ? 'pointer' : 'default',
                  }}>
                  {canSubmit ? '이름 풀이 보기 →' : '모든 글자의 한자를 골라주세요'}
                </button>
              </>
            )}
          </>
        )}

        {step === 'preview' && surname && (
          <>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ fontSize: '32px', fontWeight: 'bold', color: gold, letterSpacing: '4px' }}>
                {chars.filter(Boolean).map(c => c!.hanja).join('')}
              </div>
              <div style={{ fontSize: '14px', color: '#1a1a1a', marginTop: '4px' }}>
                {chars.filter(Boolean).map(c => c!.hangul).join('')}
              </div>
            </div>

            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: gold, marginBottom: '12px', fontWeight: 'bold' }}>
                ✨ 미리보기
              </div>
              <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: 1.9 }}>
                이름의 한자 획수와 발음을 분석했어요.<br />
                이 이름이 <b style={{ color: gold }}>사주에 필요한 기운(용신)</b>을 얼마나 채워주는지,
                전체적으로 잘 맞는 이름인지는 전체 풀이에서 확인하실 수 있어요.
              </div>
            </div>

            <button onClick={() => setStep('pay')}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: '#c8783c',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 'bold',
                cursor: 'pointer', marginBottom: '10px',
              }}>
              전체 풀이 받기 ({readPrice.toLocaleString()}원) →
            </button>
            <button onClick={() => setStep('input')}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border, color: '#5c3a1e', fontSize: '13px', cursor: 'pointer' }}>
              ← 이름 다시 고르기
            </button>
          </>
        )}

        {step === 'pay' && (
          <>
            <div style={{
              border: '2px dashed #d8a87e', borderRadius: '16px',
              padding: '30px 20px', textAlign: 'center', marginBottom: '20px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>💳</div>
              <div style={{ fontSize: '13px', color: '#5c3a1e', marginBottom: '6px' }}>결제 금액</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: gold }}>{readPrice.toLocaleString()}원</div>
            </div>

            <button onClick={handleFullResult}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: '#c8783c',
                border: 'none', color: '#fff', fontSize: '15px', fontWeight: 'bold',
                cursor: 'pointer', marginBottom: '10px',
              }}>
              💳 {readPrice.toLocaleString()}원 결제하고 결과 보기 →
            </button>
            <button onClick={() => setStep('preview')}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border, color: '#5c3a1e', fontSize: '13px', cursor: 'pointer' }}>
              ← 뒤로
            </button>
          </>
        )}

        {step === 'result' && (
          <>
            {loading && (
              <div style={{ background: cardBg, border, borderRadius: '14px', padding: '40px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                <span style={{ fontSize: '40px', display: 'inline-block', animation: 'spin 1.2s linear infinite' }}>✦</span>
                <div style={{ textAlign: 'center', color: gold, fontSize: '13px', lineHeight: 1.7 }}>
                  이름을 정성껏 풀이하고 있어요<br />
                  <span style={{ color: '#5c3a1e', fontSize: '12px' }}>잠시만 기다려 주세요</span>
                </div>
              </div>
            )}

            {!loading && result && (
              <>
                {savedRecordId && (
                  <div style={{
                    textAlign: 'center', fontSize: '12px', color: subWarm,
                    background: 'rgba(200,120,60,0.08)', border: '0.5px solid #f0e0d5',
                    borderRadius: '10px', padding: '8px', marginBottom: '14px',
                  }}>
                    {viewOnly ? '📁 보관함에서 불러온 기록' : '📁 보관함에 저장됐어요'}
                  </div>
                )}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '34px', fontWeight: 'bold', color: gold, letterSpacing: '4px' }}>
                    {chars.filter(Boolean).map(c => c!.hanja).join('')}
                  </div>
                  <div style={{ fontSize: '14px', color: '#1a1a1a', marginTop: '4px' }}>
                    {chars.filter(Boolean).map(c => c!.hangul).join('')}
                  </div>
                </div>

                {commentary && (
                  <PerspectiveAccordion commentary={commentary} />
                )}

                {/* ★ 전문가 상담 연결 — 개명·아기와 동일한 ConsultButton (색상 통일 + 가격표 토글 연동) */}
                <div style={{ marginBottom: '12px' }}>
                  <ConsultButton priceKey="naming" mode="naming" />
                </div>

                <div style={{ background: '#fdeee2', border: `1px solid ${gold}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#c8506e', fontStyle: 'italic', marginBottom: '14px', lineHeight: 1.5, textAlign: 'center' }}>
                    이름의 결을 더 살펴보고 싶다면, 다른 가능성도 열어둘 수 있습니다
                  </div>

                  <button onClick={() => router.push('/manseryeok/naming/rename/newname')}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(200,120,60,0.12)', border: `1px solid ${gold}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: gold }}>발음은 그대로, 한자 바꾸기</div>
                      <div style={{ fontSize: '11px', color: '#96502e', marginTop: '2px' }}>부르는 이름은 두고, 사주에 맞는 한자로</div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: gold, whiteSpace: 'nowrap', marginLeft: '10px' }}>{hanjaPrice.toLocaleString()}원</span>
                  </button>
                </div>

                <button onClick={() => router.push('/manseryeok/naming/diagnosis/storage')}
                  style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'rgba(200,120,60,0.10)', border: '0.5px solid #f0e0d5', color: subWarm, fontSize: '13px', fontWeight: 500, cursor: 'pointer', marginBottom: '8px' }}>
                  📜 내 이름 보관함 보기
                </button>

                <button onClick={() => nameId ? router.push('/mypage-new') : resetAll()}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border, color: '#5c3a1e', fontSize: '13px', cursor: 'pointer' }}>
                  {nameId ? '← 마이페이지로' : '다른 이름 풀어보기'}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {pickerIdx !== null && (
        <div
          onClick={() => { setPickerIdx(null); setHanjaList([]) }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(40,28,22,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '400px', background: '#fffbf7',
              borderRadius: '18px', padding: '20px 16px', boxShadow: '0 16px 40px rgba(90,50,30,0.2)',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: gold, marginBottom: '14px' }}>
              &lsquo;{syllables[pickerIdx]}&rsquo; 한자 고르기
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {searching && <div style={{ textAlign: 'center', color: '#5c3a1e', padding: '20px' }}>찾는 중...</div>}
              {!searching && hanjaList.length === 0 && (
                <div style={{ textAlign: 'center', color: '#5c3a1e', padding: '20px', fontSize: '13px' }}>
                  &lsquo;{syllables[pickerIdx]}&rsquo; 음의 인명용 한자를 찾을 수 없어요
                </div>
              )}

              {normalList.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {normalList.map((row, i) => hanjaCard(row, i, false))}
                </div>
              )}

              {avoidList.length > 0 && (
                <>
                  <div style={{ fontSize: '11px', color: '#5c3a1e', margin: '18px 0 8px', lineHeight: 1.6 }}>
                    아래 글자들은 일반적으로 이름에 잘 쓰지 않아요.<br />
                    본인 이름에 쓰는 글자라면 골라주세요.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {avoidList.map((row, i) => hanjaCard(row, i + 10000, true))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 다른 사람(가족·지인) 진단 — 사주보기와 동일한 사람 선택 모달 재사용.
          고른 사람의 생년월일을 URL로 실어 이 화면을 다시 열면(fromUrl 우선),
          그 사람 사주로 이름풀이를 진행한다. name·relation 도 함께 실어
          보관함 저장 시 관계로 구분되게 한다. */}
      <PersonPickerModal
        open={pickerOpen}
        serviceLabel="이름풀이"
        headline="누구의 이름을 볼까요?"
        serviceType="naming"
        submitLabel="저장하고 이름 보기"
        onClose={() => setPickerOpen(false)}
        onPick={(person: SavedPerson) => {
          setPickerOpen(false)
          const q = toResultQuery(person)
          const rel = person.relation ? `&relation=${encodeURIComponent(person.relation)}` : ''
          router.push(`/manseryeok/naming/diagnosis?${q}${rel}`)
        }}
      />
    </main>
  )
}

export default function DiagnosisPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF6F0' }}>
        <div style={{ color: '#8f3d0e' }}>로딩 중...</div>
      </div>
    }>
      <DiagnosisInner />
    </Suspense>
  )
}
