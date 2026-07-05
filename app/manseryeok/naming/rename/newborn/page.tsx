'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/app/components/common/PageHeader'
import { HOURS, HOUR_INDEX, fromInputs, personKey, toMyInfoObject } from '@/lib/saju/myInfo'

const gold = '#FAC775'
const cardBg = '#2C2C2A'
const border = '1px solid rgba(250,199,117,0.15)'

const NEWBORN_PASS_KEY = 'newborn_pass_v1'   // 아기 이용권 { babyKey, remaining }
const DEFAULT_TRY_LIMIT = 3

interface HanjaRow {
  hangul: string
  hanja: string
  meaning: string
  strokes: number
  resource_ohaeng: string
  sound_ohaeng: string
}

interface SavedChar {
  hangul: string
  hanja: string
  strokes: number
  resourceOhaeng: string
}

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

function firstHangul(s: string): string {
  const arr = Array.from(s)
  for (const ch of arr) {
    const code = ch.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) return ch
  }
  return arr.length > 0 ? arr[arr.length - 1] : ''
}

// 아기 사주로 이용권 열쇠 만들기 (newborn-hanja/result와 동일해야 함)
function babyKeyOf(b: { gender: string; calType: string; year: string; month: string; day: string; leapMonth: string; hour: string } | null): string {
  if (!b || !b.year) return ''
  return ['baby', b.calType, b.year, b.month, b.day, b.leapMonth, b.hour, b.gender].join('_')
}

function NewbornInner() {
  const router = useRouter()
  const sp = useSearchParams()

  // ── 아기 사주 직접 입력 ──
  const [gender, setGender] = useState<'남' | '여'>('남')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')
  const [leap, setLeap] = useState(false)
  const [birthDate, setBirthDate] = useState('')
  const [birthHour, setBirthHour] = useState('')
  const [confirmed, setConfirmed] = useState(false)

  const [info, setInfo] = useState<ReturnType<typeof fromInputs>>(null)

  // ── 성씨 입력 ──
  const [surInput, setSurInput] = useState('')
  const [surHangul, setSurHangul] = useState('')
  const [surHanja, setSurHanja] = useState<SavedChar | null>(null)
  const composingSur = useRef(false)

  // ── 지어줄 한글 이름 입력 (아기 부모가 이미 정한 이름) ──
  const [nameCount, setNameCount] = useState<1 | 2>(2)
  const [g1, setG1] = useState('')
  const [g2, setG2] = useState('')
  const composingG1 = useRef(false)
  const composingG2 = useRef(false)

  const [picker, setPicker] = useState(false)
  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [searching, setSearching] = useState(false)

  // ── 이용권/결제 ──
  const [hanjaPrice, setHanjaPrice] = useState(20000)
  const [tryLimit, setTryLimit] = useState(DEFAULT_TRY_LIMIT)
  const [payOpen, setPayOpen] = useState(false)
  const [pendingUrl, setPendingUrl] = useState('')   // 결제 후 이동할 newborn-hanja URL
  const [pendingBaby, setPendingBaby] = useState<Record<string, string> | null>(null)  // 결제 시 이용권 열쇠용

  useEffect(() => {
    supabase.from('analysis_prices').select('price').eq('price_key', 'naming_hanja').maybeSingle()
      .then(({ data }) => { if (data) setHanjaPrice(data.price) })
    supabase.from('app_settings').select('value').eq('key', 'naming_try_limit').maybeSingle()
      .then(({ data }) => { if (data && typeof data.value === 'number') setTryLimit(data.value) })
  }, [])

  // ★ '다른 이름 또 지어보기'로 URL에 baby(+surname)가 실려 들어오면
  //   인적사항·성씨 입력을 건너뛰고 이름 입력부터 시작 (정해진 횟수 안에서는 재입력 불필요)
  useEffect(() => {
    const babyRaw = sp.get('baby')
    if (!babyRaw) return
    try {
      const b = JSON.parse(decodeURIComponent(babyRaw))
      // info를 fromInputs로 복원 (사주 계산용)
      const restored = fromInputs({
        gender: b.gender, calType: b.calType,
        birthDate: `${b.year}-${String(b.month).padStart(2, '0')}-${String(b.day).padStart(2, '0')}`,
        hourLabel: b.hour,
        leap: b.leapMonth === '1',
      })
      if (restored) {
        setInfo(restored)
        setGender(b.gender === '여' ? '여' : '남')
        setCalType(b.calType === '음력' ? '음력' : '양력')
        setConfirmed(true)
      }
      const surRaw = sp.get('surname')
      if (surRaw) {
        const s = JSON.parse(decodeURIComponent(surRaw)) as SavedChar
        setSurHanja(s)
        setSurHangul(s.hangul)
        setSurInput(s.hangul)
      }
    } catch {}
  }, [sp])

  const infoYear = info ? parseInt(info.year) : 0
  const infoMonth = info ? parseInt(info.month) : 0
  const infoDay = info ? parseInt(info.day) : 0
  const infoHourIdx = info ? (info.hour === '모름' ? null : parseInt(info.hour)) : null

  const { dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    infoYear,
    infoMonth,
    infoDay,
    info?.leapMonth || '0',
    infoHourIdx,
  )

  function confirmBaby() {
    if (!birthDate) {
      alert('아기 생년월일을 입력해주세요 😊')
      return
    }
    const std = fromInputs({
      gender, calType,
      birthDate,
      hourLabel: birthHour,
      leap: calType === '음력' ? leap : false,
    })
    if (!std || !std.month || !std.day) {
      alert('아기 생년월일을 올바르게 입력해주세요 😊')
      return
    }
    setInfo(std)
    setConfirmed(true)
    setSurInput(''); setSurHangul(''); setSurHanja(null)
    setG1(''); setG2('')
  }

  function editBaby() {
    setConfirmed(false)
    setInfo(null)
    setSurInput(''); setSurHangul(''); setSurHanja(null)
    setG1(''); setG2('')
  }

  function applySurname(rawVal?: string) {
    const base = rawVal !== undefined ? rawVal : surInput
    const one = firstHangul(base)
    if (!one || !isHangulSyllable(one)) return
    setSurInput(one)
    setSurHangul(one)
    setSurHanja(null)
    openPicker(one)
  }

  async function openPicker(hangul: string) {
    setPicker(true)
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
      console.error(e); setHanjaList([])
    } finally {
      setSearching(false)
    }
  }

  function pickHanja(row: HanjaRow) {
    setSurHanja({
      hangul: row.hangul,
      hanja: row.hanja,
      strokes: row.strokes,
      resourceOhaeng: row.resource_ohaeng,
    })
    setPicker(false)
    setHanjaList([])
  }

  const givenReady =
    firstHangul(g1).trim().length > 0 &&
    (nameCount === 1 || firstHangul(g2).trim().length > 0)

  // 원하는 발음으로 한자 지어주기 → 아기 사주+성씨+한글이름을 URL로 실어 아기 한자고르기로
  // (궁합과 동일 방식: 제3자(아기) 사주를 URL로 전달. localStorage/personKey 안 씀)
  function goDirect() {
    if (!surHanja || !info || !givenReady) return
    const givenName = nameCount === 1 ? firstHangul(g1) : firstHangul(g1) + firstHangul(g2)
    const babyObj = toMyInfoObject(info) as unknown as Record<string, string>
    const babyParam = encodeURIComponent(JSON.stringify(babyObj))
    const surnameParam = encodeURIComponent(JSON.stringify(surHanja))
    const nameParam = encodeURIComponent(givenName)
    const url = '/manseryeok/naming/rename/newborn-hanja'
      + '?baby=' + babyParam
      + '&surname=' + surnameParam
      + '&name=' + nameParam

    // 남은 이용권 있으면 바로 진입, 없으면 결제 팝업
    const bkey = babyKeyOf(babyObj as unknown as { gender: string; calType: string; year: string; month: string; day: string; leapMonth: string; hour: string })
    let remaining = 0
    try {
      const p = JSON.parse(localStorage.getItem(NEWBORN_PASS_KEY) || '{}')
      if (p.babyKey === bkey && typeof p.remaining === 'number') remaining = p.remaining
    } catch {}

    if (remaining > 0) {
      router.push(url)
    } else {
      setPendingUrl(url)
      setPendingBaby(babyObj)
      setPayOpen(true)
    }
  }

  // 결제(지금은 실제 PG 없이 통과) → 이용권 충전 후 진입
  // ★ 나중에 실제 결제 붙일 때 이 함수 안 "결제 통과" 자리에 PG 호출을 넣으면 됨
  function payAndProceed() {
    if (!pendingBaby || !pendingUrl) return
    const bkey = babyKeyOf(pendingBaby as unknown as { gender: string; calType: string; year: string; month: string; day: string; leapMonth: string; hour: string })
    try {
      localStorage.setItem(NEWBORN_PASS_KEY, JSON.stringify({ babyKey: bkey, remaining: tryLimit }))
      // 결제하면 새 이용권이므로 지난 시도기록 초기화
      localStorage.removeItem('newborn_history_v1')
    } catch {}
    setPayOpen(false)
    router.push(pendingUrl)
  }

  const sajuLine = converting ? '사주 불러오는 중...' :
    `일간 ${dayStem} · ${info?.calType} ${info?.year}.${info?.month}.${info?.day}${info?.calType === '음력' && info?.leapMonth === '1' ? ' (윤달)' : ''}`

  const givenInputStyle = {
    width: 48, height: 46, textAlign: 'center' as const, fontSize: 18,
    borderRadius: 10, border: '1px solid ' + gold,
    background: 'rgba(250,199,117,0.08)', color: '#fff',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader title="내 아기 이름짓기" onBack={() => router.push('/manseryeok/naming')} />

      <div style={{ padding: '16px' }}>

        {/* ── 아기 정보 입력 (확정 전) ── */}
        {!confirmed && (
          <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: gold, background: 'linear-gradient(135deg,#3C3489,#4e46b0)' }}>✦</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fff' }}>아기 정보를 입력해주세요</div>
                <div style={{ fontSize: '11px', color: '#8a88a0' }}>아기 사주로 이름을 풀이해요</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              {([
                { label: '성별', vals: ['남', '여'] as const, state: gender, set: setGender },
                { label: '달력', vals: ['양력', '음력'] as const, state: calType, set: setCalType },
              ] as const).map(({ label, vals, state, set }) => (
                <div key={label} style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#b0aec8', marginBottom: '6px' }}>{label}</div>
                  <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    {vals.map((v) => (
                      <button key={v} onClick={() => (set as (x: string) => void)(v)}
                        style={{ flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                          ...(state === v ? { background: '#3C3489', color: gold, border: 'none' } : { background: 'transparent', color: '#8a88a0', border: 'none' }) }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {calType === '음력' && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#b0aec8', marginBottom: '6px' }}>
                  윤달 여부 <span style={{ color: '#8a88a0' }}>(음력 생일이 윤달이면 선택)</span>
                </div>
                <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {([['평달', false], ['윤달', true]] as const).map(([lbl, val]) => (
                    <button key={lbl} onClick={() => setLeap(val)}
                      style={{ flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                        ...(leap === val ? { background: '#3C3489', color: gold, border: 'none' } : { background: 'transparent', color: '#8a88a0', border: 'none' }) }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#b0aec8', marginBottom: '6px' }}>생년월일</div>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)', color: birthDate ? gold : '#8a88a0', fontSize: '14px', colorScheme: 'dark' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#b0aec8', marginBottom: '6px' }}>태어난 시 (시주)</div>
              <select value={birthHour} onChange={(e) => setBirthHour(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)', color: birthHour ? gold : '#8a88a0', fontSize: '14px', colorScheme: 'dark' }}>
                <option value="">시간 선택</option>
                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <button onClick={confirmBaby}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)', border: 'none', color: '#1a1a18', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              아기 사주 확인 →
            </button>
          </div>
        )}

        {/* ── 아기 사주 요약 (확정 후) ── */}
        {confirmed && info && (
          <div style={{ background: cardBg, border, borderRadius: '12px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#8a88a0', marginBottom: '5px' }}>아기 사주</div>
              <div style={{ fontSize: '13px', color: '#e8e4ff' }}>{sajuLine}</div>
            </div>
            <button onClick={editBaby}
              style={{ flexShrink: 0, fontSize: '12px', padding: '7px 12px', borderRadius: '9px', background: 'rgba(255,255,255,0.08)', color: '#b0aec8', border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '10px' }}>
              다시 입력
            </button>
          </div>
        )}

        {/* ── 성씨 입력 (아기 사주 확정 후에만) ── */}
        {confirmed && info && (
          <>
            <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '10px' }}>아기 성씨를 한글로 적어주세요</div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'stretch' }}>
              <input
                value={surInput}
                inputMode="text"
                maxLength={2}
                onCompositionStart={() => { composingSur.current = true }}
                onCompositionEnd={(e) => { composingSur.current = false; setSurInput(firstHangul(e.currentTarget.value)) }}
                onChange={(e) => { const v = e.target.value; if (composingSur.current) setSurInput(v); else setSurInput(firstHangul(v)) }}
                onKeyDown={(e) => { if (e.key === 'Enter') applySurname() }}
                placeholder="예: 김"
                style={{ flex: 1, minWidth: 0, padding: '13px', borderRadius: '12px', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.15)', color: '#e8e4ff', fontSize: '16px' }}
              />
              <button onClick={() => applySurname()}
                style={{ flexShrink: 0, padding: '0 18px', borderRadius: '12px', background: gold, border: 'none', color: '#1a1a18', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                확인
              </button>
            </div>

            {surHangul && (
              <>
                <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '12px' }}>성씨 한자</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                  <button onClick={() => openPicker(surHangul)} className="active:scale-95"
                    style={{ width: '78px', height: '78px', borderRadius: '50%',
                      background: surHanja ? 'rgba(250,199,117,0.1)' : cardBg,
                      border: surHanja ? `2px solid ${gold}` : '1px dashed rgba(250,199,117,0.4)',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {surHanja ? (
                      <>
                        <span style={{ fontSize: '28px', fontWeight: 'bold', color: gold, lineHeight: 1 }}>{surHanja.hanja}</span>
                        <span style={{ fontSize: '10px', color: '#8a88a0', marginTop: '2px' }}>{surHanja.hangul}</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#e8e4ff', lineHeight: 1 }}>{surHangul}</span>
                        <span style={{ fontSize: '9px', color: gold, marginTop: '4px' }}>한자 고르기</span>
                      </>
                    )}
                  </button>
                </div>
                {surHanja && (
                  <div style={{ fontSize: '9px', color: '#8a88a0', textAlign: 'center', marginBottom: '20px' }}>
                    {surHanja.resourceOhaeng}·{surHanja.strokes}획
                  </div>
                )}
              </>
            )}

            {/* ── 지어줄 한글 이름 입력 (성씨 한자 고른 뒤) ── */}
            {surHanja && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '10px' }}>
                  지어줄 한글 이름을 적어주세요 <span style={{ color: '#666' }}>(부를 이름)</span>
                </div>

                <div style={{ fontSize: '12px', color: '#8a88a0', marginBottom: '8px' }}>이름 글자 수</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {([[1, '외자 (한 글자)'], [2, '두 글자']] as const).map(([n, lbl]) => {
                    const on = nameCount === n
                    return (
                      <button key={n} onClick={() => { setNameCount(n); setG1(''); setG2('') }}
                        style={{ flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer',
                          background: on ? 'rgba(250,199,117,0.16)' : cardBg,
                          border: '1px solid ' + (on ? gold : 'rgba(250,199,117,0.12)'),
                          color: on ? gold : '#cfcdc4', fontWeight: 700, fontSize: 14 }}>
                        {lbl}
                      </button>
                    )
                  })}
                </div>

                <div style={{ background: cardBg, border: '1px solid rgba(250,199,117,0.12)', borderRadius: 16, padding: '18px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: 22, color: '#8a88a0' }}>{surHanja.hanja}</span>
                    <input
                      value={g1} maxLength={2} inputMode="text"
                      onCompositionStart={() => { composingG1.current = true }}
                      onCompositionEnd={(e) => { composingG1.current = false; setG1(firstHangul(e.currentTarget.value)) }}
                      onChange={(e) => { const v = e.target.value; if (composingG1.current) setG1(v); else setG1(firstHangul(v)) }}
                      placeholder="서"
                      style={givenInputStyle}
                    />
                    {nameCount === 2 && (
                      <input
                        value={g2} maxLength={2} inputMode="text"
                        onCompositionStart={() => { composingG2.current = true }}
                        onCompositionEnd={(e) => { composingG2.current = false; setG2(firstHangul(e.currentTarget.value)) }}
                        onChange={(e) => { const v = e.target.value; if (composingG2.current) setG2(v); else setG2(firstHangul(v)) }}
                        placeholder="연"
                        style={givenInputStyle}
                      />
                    )}
                  </div>
                </div>

                <button onClick={goDirect} disabled={!givenReady}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px',
                    background: givenReady ? 'rgba(250,199,117,0.16)' : cardBg,
                    border: `1px solid ${givenReady ? gold : 'rgba(250,199,117,0.12)'}`,
                    cursor: givenReady ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: givenReady ? gold : '#555' }}>사주에 맞는 한자 추천받기 →</div>
                    <div style={{ fontSize: '11px', color: '#cbb890', marginTop: '2px' }}>정한 한글 이름에, 아기 사주에 맞는 한자로</div>
                  </div>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 성씨 한자 선택 팝업 */}
      {picker && (
        <div onClick={() => { setPicker(false); setHanjaList([]) }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '400px', background: '#222220', borderRadius: '18px', padding: '20px 16px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: gold, marginBottom: '14px' }}>
              &lsquo;{surHangul}&rsquo; 성씨 한자 고르기
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {searching && <div style={{ textAlign: 'center', color: '#8a88a0', padding: '20px' }}>찾는 중...</div>}
              {!searching && hanjaList.length === 0 && (
                <div style={{ textAlign: 'center', color: '#8a88a0', padding: '20px', fontSize: '13px' }}>
                  &lsquo;{surHangul}&rsquo; 음의 한자를 찾을 수 없어요
                </div>
              )}
              {hanjaList.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {hanjaList.map((row, i) => (
                    <div key={i} onClick={() => pickHanja(row)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: '#2C2C2A', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '26px', fontWeight: 'bold', color: gold, minWidth: '32px', textAlign: 'center' }}>{row.hanja}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: '#e8e4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.meaning}</div>
                        <div style={{ fontSize: '11px', color: '#8a88a0', marginTop: '2px' }}>{row.resource_ohaeng}·{row.strokes}획</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ★ 아기 이름 이용권 결제 팝업 (선결제 → tryLimit회 조회) */}
      {payOpen && (
        <div onClick={() => setPayOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: 360, background: '#222220', borderRadius: 18, padding: '24px 20px', boxShadow: '0 16px 40px rgba(0,0,0,0.5)', textAlign: 'center' }}>
            <div style={{ fontSize: 28, marginBottom: 10 }}>👶</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>아기 이름 지어보기 이용권</div>
            <div style={{ fontSize: 13, color: '#8a88a0', marginBottom: 16, lineHeight: 1.7 }}>
              결제하시면 아기 사주에 맞는 한자로<br />
              <b style={{ color: gold }}>{tryLimit}개</b>의 이름을 지어보고<br />
              상세 풀이까지 확인하실 수 있어요.
            </div>
            <div style={{ background: cardBg, borderRadius: 12, padding: '14px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, color: '#8a88a0' }}>결제 금액</span>
              <span style={{ fontSize: 20, fontWeight: 700, color: gold }}>{hanjaPrice.toLocaleString()}원</span>
            </div>
            <button onClick={payAndProceed}
              style={{ width: '100%', padding: 15, borderRadius: 12, background: 'linear-gradient(135deg,#3C3489 0%,#FAC775 100%)', border: 'none', color: '#1a1a18', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginBottom: 8 }}>
              💳 {hanjaPrice.toLocaleString()}원 결제하고 시작하기
            </button>
            <button onClick={() => setPayOpen(false)}
              style={{ width: '100%', padding: 12, borderRadius: 12, background: 'transparent', border: '1px solid rgba(255,255,255,0.12)', color: '#8a88a0', fontSize: 13, cursor: 'pointer' }}>
              다음에 할게요
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default function NewbornPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1a1a18' }}>
        <div style={{ color: '#FAC775' }}>로딩 중...</div>
      </div>
    }>
      <NewbornInner />
    </Suspense>
  )
}
