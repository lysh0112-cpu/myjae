'use client'
import { Suspense, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { calcYongsin } from '@/lib/saju/yongsin'
import { calcYongsinNew } from '@/lib/saju/yongsinNew'
import { supabase } from '@/lib/supabase'
import type { DiagnoseResult, NameChar } from '@/lib/saju/naming'
import PageHeader from '@/app/components/common/PageHeader'
import ConsultButton from '@/app/components/common/ConsultButton'
import { fromProfile, fromUrl, personKey, type MyInfo } from '@/lib/saju/myInfo'

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
  is_avoid?: boolean
}

interface Commentary {
  title: string
  eumyang: string      // 음양오행
  baleum: string       // 발음오행
  suri: string         // 수리오행
  jawon: string        // 자원오행
  yongsin: string      // 사주 보완(용신)
  conclusion: string   // 맺음말
}

const gold = '#FAC775'
const cardBg = '#2C2C2A'
const border = '1px solid rgba(250,199,117,0.15)'

function gradeColor(g: string) {
  if (g === '좋음') return '#7BC86C'
  if (g === '아쉬움') return '#E0A04A'
  return '#9a98b0'
}

function isAvoidChar(row: HanjaRow): boolean {
  if (row.is_avoid === true) return true
  const m = row.meaning || ''
  return AVOID_KEYWORDS.some((k) => m.includes(k))
}

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

function DiagnosisInner() {
  const router = useRouter()
  const sp = useSearchParams()

  const [info, setInfo] = useState<MyInfo | null>(null)

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

  const [savedOffer, setSavedOffer] = useState<{
    result: DiagnoseResult
    commentary: Commentary
    chars: (NameChar | null)[]
  } | null>(null)

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
          setCommentary(row.commentary as Commentary)
          setChars(row.chars as (NameChar | null)[])
          setSyllables((row.chars as (NameChar | null)[]).filter(Boolean).map((c) => c!.hangul))
          setSavedOffer(null)   // 저장건 불러오기 배너는 필요 없음
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

  useEffect(() => {
    if (nameId) return          // id로 들어온 경우는 최근건 배너 안 띄움
    if (!info) return
    let cancelled = false
    async function checkSaved() {
      try {
        const { data: u } = await supabase.auth.getUser()
        if (!u?.user) return
        const { data: rows } = await supabase
          .from('my_names')
          .select('chars, result, commentary, person_key')
          .eq('user_id', u.user.id)
          .order('created_at', { ascending: false })
          .limit(1)
        if (cancelled) return
        const row = rows && rows[0]
        if (row && row.person_key === personKey(info) && row.result && row.commentary && Array.isArray(row.chars)) {
          setSavedOffer({
            result: row.result as DiagnoseResult,
            commentary: row.commentary as Commentary,
            chars: row.chars as (NameChar | null)[],
          })
        }
      } catch {}
    }
    checkSaved()
    return () => { cancelled = true }
  }, [info, nameId])

  function loadSavedResult() {
    if (!savedOffer) return
    setResult(savedOffer.result)
    setCommentary(savedOffer.commentary)
    setChars(savedOffer.chars)
    setSyllables(savedOffer.chars.filter(Boolean).map((c) => c!.hangul))
    setStep('result')
    setSavedOffer(null)
  }

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
        .select('hangul, hanja, meaning, strokes, resource_ohaeng, sound_ohaeng')
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
    return `[이름풀이 · ${hangulName} (${hanjaName})]\n\n· 음양오행\n${c.eumyang || ''}\n\n· 발음오행\n${c.baleum || ''}\n\n· 수리오행\n${c.suri || ''}\n\n· 자원오행\n${c.jawon || ''}\n\n· 사주 보완(용신)\n${c.yongsin || ''}\n\n· 맺음\n${c.conclusion || ''}`.trim()
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
      // 용신 엔진 선택 — 관리자 설정(naming_yongsin_mode) 기준.
      //   기본 'precise'(정밀 yongsinNew, 억부·조후·병약 → 사주화면과 일치)
      //   'simple'이면 옛 단순 엔진(yongsin.ts)
      let yongsinEl = '', heeksinEl: string | undefined, elementScore: Record<string, number> = {}
      let mode = 'precise'
      try {
        const { data: ts } = await supabase
          .from('tone_settings').select('naming_yongsin_mode').eq('id', 1).maybeSingle()
        if (ts?.naming_yongsin_mode === 'simple') mode = 'simple'
      } catch { /* 설정 없으면 정밀 기본 */ }

      if (mode === 'simple') {
        const r = calcYongsin(saju, dayStem)
        yongsinEl = r.yongsin; heeksinEl = r.heeksin; elementScore = r.score
      } else {
        const r = calcYongsinNew(saju, dayStem)
        if (r) {
          yongsinEl = r.eokbu.yongsin
          heeksinEl = r.eokbu.heesin       // 정밀 엔진은 heesin(철자 주의)
          elementScore = r.score
        } else {
          // 안전 폴백: 정밀 계산 실패 시 단순 엔진
          const rr = calcYongsin(saju, dayStem)
          yongsinEl = rr.yongsin; heeksinEl = rr.heeksin; elementScore = rr.score
        }
      }

      const sajuText = saju.map(p => `${p.pillar}:${p.stem}${p.branch}`).join(', ')
      const res = await fetch('/api/naming', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          surname,
          given,
          yongsin: yongsinEl,
          heeksin: heeksinEl,
          elementScore,
          dayStem,
          sajuText,
          birthData: info,
          saju,
        }),
      })
      const data = await res.json()
      setResult(data.result ?? null)
      setCommentary(data.commentary ?? null)
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
          await supabase.from('my_names').insert({
            user_id: u.user.id,
            hangul_name: hangulName,
            hanja_name: hanjaName,
            chars,
            result: data.result ?? null,
            commentary: data.commentary ?? null,
            kind: 'self',
            person_key: pkey,
          })
        }
      } catch {}
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
      <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
        <PageHeader title="내 이름 풀이" onBack={() => router.push('/mypage')} />
        <div style={{ padding: '60px 20px', textAlign: 'center', color: gold, fontSize: '14px' }}>
          저장된 이름 풀이를 불러오는 중…
        </div>
      </main>
    )
  }

  if (!info && !nameId) {
    return (
      <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
        <PageHeader title="내 이름 풀이" onBack={() => router.push('/manseryeok/naming')} />
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8a88a0' }}>
          <p style={{ marginBottom: '12px', fontSize: '15px', color: '#e8e4ff' }}>먼저 사주 정보를 입력해주세요.</p>
          <p style={{ marginBottom: '24px', fontSize: '13px', lineHeight: 1.7 }}>
            홈 화면에서 생년월일 · 음양력 · 태어난 시(시주)를<br />입력하시면 이름 풀이를 시작할 수 있어요.
          </p>
          <button onClick={() => router.push('/')}
            style={{ padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontWeight: 'bold', cursor: 'pointer' }}>
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

  // 저장된 이름 석 자 (배너 표시용)
  const savedHangul = savedOffer ? savedOffer.chars.filter(Boolean).map((c) => c!.hangul).join('') : ''
  const savedHanja = savedOffer ? savedOffer.chars.filter(Boolean).map((c) => c!.hanja).join('') : ''

  const hanjaCard = (row: HanjaRow, i: number, dim: boolean) => (
    <div key={i}
      onClick={() => pickHanja(row)}
      style={{
        display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px',
        borderRadius: '12px', background: '#2C2C2A', cursor: 'pointer',
        border: '1px solid rgba(255,255,255,0.05)', opacity: dim ? 0.45 : 1,
      }}>
      <span style={{ fontSize: '26px', fontWeight: 'bold', color: gold, minWidth: '32px', textAlign: 'center' }}>
        {row.hanja}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '13px', color: '#e8e4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.meaning}</div>
        <div style={{ fontSize: '11px', color: '#8a88a0', marginTop: '2px' }}>
          {row.resource_ohaeng}·{row.strokes}획
        </div>
      </div>
    </div>
  )

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <PageHeader title="내 이름 풀이" onBack={() => router.push(nameId ? '/mypage' : '/manseryeok/naming')} />

      <div style={{ padding: '16px' }}>
        <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '6px' }}>내 사주</div>
          <div style={{ fontSize: '14px', color: '#e8e4ff' }}>{sajuLine}</div>
        </div>

        {step === 'input' && savedOffer && (
          <div style={{ background: 'rgba(250,199,117,0.08)', border: `1px solid ${gold}`, borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
            <div style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '6px', textAlign: 'center' }}>저장된 내 이름</div>
            <div style={{ fontSize: '30px', fontWeight: 'bold', color: gold, letterSpacing: '4px', textAlign: 'center', lineHeight: 1.2 }}>
              {savedHanja || savedHangul}
            </div>
            {savedHanja && (
              <div style={{ fontSize: '14px', color: '#e8e4ff', textAlign: 'center', marginTop: '4px' }}>{savedHangul}</div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button onClick={loadSavedResult}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: gold, border: 'none', color: '#1a1a18', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                풀이 다시보기
              </button>
              <button onClick={() => router.push('/manseryeok/naming/rename/newname')}
                style={{ flex: 1, padding: '12px', borderRadius: '10px', background: 'rgba(250,199,117,0.16)', border: `1px solid ${gold}`, color: gold, fontSize: '13px', fontWeight: 'bold', cursor: 'pointer' }}>
                한자 바꾸기
              </button>
            </div>
            <button onClick={() => setSavedOffer(null)}
              style={{ width: '100%', marginTop: '8px', padding: '12px', borderRadius: '10px', background: 'transparent', border: '1px solid rgba(255,255,255,0.15)', color: '#8a88a0', fontSize: '13px', cursor: 'pointer' }}>
              🔄 다른 이름 다시 풀기
            </button>
            <div style={{ fontSize: '11px', color: '#8a88a0', textAlign: 'center', marginTop: '10px', lineHeight: 1.5 }}>
              · 풀이 다시보기는 무료예요<br />
              · 한자 바꾸기(개명)는 {hanjaPrice.toLocaleString()}원이에요
            </div>
          </div>
        )}

        {step === 'input' && !savedOffer && (
          <>
            <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '10px' }}>
              본인 이름을 한글로 입력하세요
            </div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: syllables.length > 0 ? '26px' : '20px' }}>
              <input
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') applyName() }}
                placeholder="예: 홍길동"
                maxLength={5}
                style={{
                  flex: 1, padding: '13px', borderRadius: '12px', background: '#1a1a18',
                  border: '1px solid rgba(255,255,255,0.15)', color: '#e8e4ff', fontSize: '16px',
                }} />
              <button onClick={applyName}
                style={{ padding: '13px 20px', borderRadius: '12px', background: gold, border: 'none', color: '#1a1a18', fontWeight: 'bold', cursor: 'pointer' }}>
                확인
              </button>
            </div>

            {syllables.length >= 2 && (
              <>
                <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '16px' }}>
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
                            background: c ? 'rgba(250,199,117,0.1)' : cardBg,
                            border: c ? `2px solid ${gold}` : '1px dashed rgba(250,199,117,0.4)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', transition: 'transform 0.15s ease',
                          }}>
                          {c ? (
                            <>
                              <span style={{ fontSize: '30px', fontWeight: 'bold', color: gold, lineHeight: 1 }}>{c.hanja}</span>
                              <span style={{ fontSize: '10px', color: '#8a88a0', marginTop: '3px' }}>{c.hangul}</span>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#e8e4ff', lineHeight: 1 }}>{syl}</span>
                              <span style={{ fontSize: '9px', color: gold, marginTop: '4px' }}>한자 고르기</span>
                            </>
                          )}
                        </button>
                        <div style={{ fontSize: '9px', color: '#8a88a0', marginTop: '5px' }}>
                          {c ? `${c.resourceOhaeng}·${c.strokes}획` : slotLabel(i)}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div style={{ fontSize: '11px', color: '#666', marginBottom: '20px', lineHeight: 1.6 }}>
                  · 원을 누르면 그 글자의 한자가 자동으로 나와요<br />
                  · 이름을 바꾸려면 위에 다시 입력하고 확인을 누르세요
                </div>

                <button onClick={handlePreview} disabled={!canSubmit}
                  style={{
                    width: '100%', padding: '14px', borderRadius: '12px',
                    background: canSubmit ? 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)' : '#333',
                    border: 'none', color: canSubmit ? '#1a1a18' : '#666',
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
              <div style={{ fontSize: '14px', color: '#e8e4ff', marginTop: '4px' }}>
                {chars.filter(Boolean).map(c => c!.hangul).join('')}
              </div>
            </div>

            <div style={{ background: cardBg, border, borderRadius: '14px', padding: '18px', marginBottom: '16px' }}>
              <div style={{ fontSize: '13px', color: gold, marginBottom: '12px', fontWeight: 'bold' }}>
                ✨ 미리보기
              </div>
              <div style={{ fontSize: '13px', color: '#c8c4d8', lineHeight: 1.9 }}>
                이름의 한자 획수와 발음을 분석했어요.<br />
                이 이름이 <b style={{ color: gold }}>사주에 필요한 기운(용신)</b>을 얼마나 채워주는지,
                전체적으로 잘 맞는 이름인지는 전체 풀이에서 확인하실 수 있어요.
              </div>
            </div>

            <button onClick={() => setStep('pay')}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)',
                border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold',
                cursor: 'pointer', marginBottom: '10px',
              }}>
              전체 풀이 받기 ({readPrice.toLocaleString()}원) →
            </button>
            <button onClick={() => setStep('input')}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border, color: '#8a88a0', fontSize: '13px', cursor: 'pointer' }}>
              ← 이름 다시 고르기
            </button>
          </>
        )}

        {step === 'pay' && (
          <>
            <div style={{
              border: '2px dashed rgba(250,199,117,0.4)', borderRadius: '16px',
              padding: '30px 20px', textAlign: 'center', marginBottom: '20px',
            }}>
              <div style={{ fontSize: '28px', marginBottom: '10px' }}>💳</div>
              <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '6px' }}>결제 금액</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: gold }}>{readPrice.toLocaleString()}원</div>
            </div>

            <button onClick={handleFullResult}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px',
                background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)',
                border: 'none', color: '#1a1a18', fontSize: '15px', fontWeight: 'bold',
                cursor: 'pointer', marginBottom: '10px',
              }}>
              💳 {readPrice.toLocaleString()}원 결제하고 결과 보기 →
            </button>
            <button onClick={() => setStep('preview')}
              style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border, color: '#8a88a0', fontSize: '13px', cursor: 'pointer' }}>
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
                  <span style={{ color: '#8a88a0', fontSize: '12px' }}>잠시만 기다려 주세요</span>
                </div>
              </div>
            )}

            {!loading && result && (
              <>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '34px', fontWeight: 'bold', color: gold, letterSpacing: '4px' }}>
                    {chars.filter(Boolean).map(c => c!.hanja).join('')}
                  </div>
                  <div style={{ fontSize: '14px', color: '#e8e4ff', marginTop: '4px' }}>
                    {chars.filter(Boolean).map(c => c!.hangul).join('')}
                  </div>
                </div>

                {commentary && commentary.title && (
                  <div style={{ textAlign: 'center', margin: '4px 0 22px' }}>
                    <div style={{ fontSize: '17px', fontWeight: 'bold', color: gold, lineHeight: 1.6 }}>
                      "{commentary.title}"
                    </div>
                  </div>
                )}

                {/* 5관점 겸손 해설 카드 */}
                {commentary && [
                  {
                    num: '一', label: '음양오행', sub: '획수에 담긴 음과 양',
                    text: commentary.eumyang,
                    data: (
                      <span>
                        {[result.yinyang.strokes.map((s, i) => (
                          <span key={i} style={{ marginRight: '10px' }}>
                            {(chars.filter(Boolean)[i]?.hanja) ?? ''}
                            <span style={{ color: result.yinyang.marks[i] === '양' ? '#E0A04A' : '#7BAECF', marginLeft: '3px' }}>
                              {s}획·{result.yinyang.marks[i]}
                            </span>
                          </span>
                        ))]}
                      </span>
                    ),
                  },
                  {
                    num: '二', label: '발음오행', sub: '부르는 소리의 기운',
                    text: commentary.baleum,
                    data: <span style={{ letterSpacing: '.05em' }}>{chars.filter(Boolean).map(c => c!.hangul).join(' → ')}</span>,
                  },
                  {
                    num: '三', label: '수리오행', sub: '획수가 그리는 인생 네 마디',
                    text: commentary.suri,
                    data: (
                      <span>
                        {result.suri.gyeok.map((g, i) => (
                          <span key={i} style={{ marginRight: '10px', fontSize: '11.5px' }}>
                            {g.label} {g.name}
                            <span style={{ color: g.fortune === '길' ? '#7BC86C' : g.fortune === '흉' ? '#E0A04A' : '#9a98b0' }}>({g.fortune})</span>
                          </span>
                        ))}
                      </span>
                    ),
                  },
                  {
                    num: '四', label: '자원오행', sub: '한자에 담긴 기운',
                    text: commentary.jawon,
                    data: <span>{chars.filter(Boolean).map((c, i) => (
                      <span key={i}>{i > 0 ? ' → ' : ''}{c!.hanja}({c!.resourceOhaeng})</span>
                    ))}</span>,
                  },
                  {
                    num: '五', label: '사주와의 만남', sub: '이름이 사주를 어떻게 돕는가',
                    text: commentary.yongsin,
                    data: <span>이 사주가 구하는 기운 · <span style={{ color: gold }}>{result.weakElement}</span></span>,
                  },
                ].filter(s => s.text).map((s, i) => (
                  <div key={i} style={{ background: cardBg, border, borderRadius: '16px', padding: '20px', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '15px', color: '#c98668', fontWeight: 'bold' }}>{s.num}</span>
                      <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#e8e4ff' }}>{s.label}</span>
                      <span style={{ fontSize: '11px', color: '#8a88a0' }}>{s.sub}</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#a8a4bc', marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                      {s.data}
                    </div>
                    <div style={{ fontSize: '14px', color: '#e0dce8', lineHeight: 1.9 }}>{s.text}</div>
                  </div>
                ))}

                {/* 맺음 */}
                {commentary && commentary.conclusion && (
                  <div style={{
                    background: 'rgba(250,199,117,0.06)', border: `1px solid ${gold}`,
                    borderRadius: '16px', padding: '22px', marginBottom: '16px',
                  }}>
                    <div style={{ fontSize: '12px', color: gold, letterSpacing: '.3em', textAlign: 'center', marginBottom: '14px' }}>맺 음</div>
                    <div style={{ fontSize: '14.5px', color: '#e8e4ff', lineHeight: 2 }}>{commentary.conclusion}</div>
                  </div>
                )}

                {/* 학파 안내 (판정이 아님을 명시) */}
                <div style={{ fontSize: '11px', color: '#8a88a0', textAlign: 'center', lineHeight: 1.8, marginBottom: '18px', fontStyle: 'italic' }}>
                  성명학은 학파에 따라 발음오행·수리·용신을 달리 보는 여러 견해가 있습니다.<br />
                  이 풀이는 그 가운데 한 관점으로 이름의 결을 살핀 것으로, 참고 삼아 헤아리시길 바랍니다.
                </div>

                {/* ★ 전문가 상담 연결 — 개명·아기와 동일한 ConsultButton (색상 통일 + 가격표 토글 연동) */}
                <div style={{ marginBottom: '12px' }}>
                  <ConsultButton priceKey="naming" mode="naming" />
                </div>

                <div style={{ background: 'linear-gradient(160deg,#34322f 0%,#2C2C2A 100%)', border: `1px solid ${gold}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: '#f48fb1', fontStyle: 'italic', marginBottom: '14px', lineHeight: 1.5, textAlign: 'center' }}>
                    {result.overallGrade !== '좋음'
                      ? '사주에 필요한 기운을 더 담고 싶다면, 이런 이름은 어떨까요?'
                      : '이 이름과 사주는 잘 어우러집니다. 다른 결도 살펴볼까요?'}
                  </div>

                  <button onClick={() => router.push('/manseryeok/naming/rename/newname')}
                    style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(250,199,117,0.16)', border: `1px solid ${gold}`, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontSize: '14px', fontWeight: 'bold', color: gold }}>발음은 그대로, 한자 바꾸기</div>
                      <div style={{ fontSize: '11px', color: '#cbb890', marginTop: '2px' }}>부르는 이름은 두고, 사주에 맞는 한자로</div>
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 'bold', color: gold, whiteSpace: 'nowrap', marginLeft: '10px' }}>{hanjaPrice.toLocaleString()}원</span>
                  </button>
                </div>

                <button onClick={() => nameId ? router.push('/mypage') : resetAll()}
                  style={{ width: '100%', padding: '12px', borderRadius: '12px', background: 'transparent', border, color: '#8a88a0', fontSize: '13px', cursor: 'pointer' }}>
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
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px',
          }}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: '400px', background: '#222220',
              borderRadius: '18px', padding: '20px 16px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              maxHeight: '80vh', display: 'flex', flexDirection: 'column',
            }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: gold, marginBottom: '14px' }}>
              &lsquo;{syllables[pickerIdx]}&rsquo; 한자 고르기
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {searching && <div style={{ textAlign: 'center', color: '#8a88a0', padding: '20px' }}>찾는 중...</div>}
              {!searching && hanjaList.length === 0 && (
                <div style={{ textAlign: 'center', color: '#8a88a0', padding: '20px', fontSize: '13px' }}>
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
                  <div style={{ fontSize: '11px', color: '#8a88a0', margin: '18px 0 8px', lineHeight: 1.6 }}>
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
    </main>
  )
}

export default function DiagnosisPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a18' }}>
        <div style={{ color: '#FAC775' }}>로딩 중...</div>
      </div>
    }>
      <DiagnosisInner />
    </Suspense>
  )
}
