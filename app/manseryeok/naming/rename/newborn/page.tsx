'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { supabase } from '@/lib/supabase'
import { HOURS, HOUR_INDEX, fromInputs, personKey, toMyInfoObject } from '@/lib/saju/myInfo'

const gold = '#c8783c'
const cardBg = '#fffbf7'
const border = '1px solid rgba(200,120,60,0.12)'

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

// ── 신버전 자체 피치 sticky 헤더 (공용 다크 헤더 대체) ──
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
  const [remaining, setRemaining] = useState(0)      // ★ 남은 조회 횟수
  const [surLocked, setSurLocked] = useState(false)  // ★ 성씨 고정(이용권/URL로 이미 정해짐)
  const [entryLoaded, setEntryLoaded] = useState(false)  // 진입 시 이용권 확인 완료

  useEffect(() => {
    supabase.from('analysis_prices').select('price').eq('price_key', 'naming_hanja').maybeSingle()
      .then(({ data }) => { if (data) setHanjaPrice(data.price) })
    supabase.from('app_settings').select('value').eq('key', 'naming_try_limit').maybeSingle()
      .then(({ data }) => { if (data && typeof data.value === 'number') setTryLimit(data.value) })
  }, [])

  // ★ 진입: 이용권(newborn_pass_v1)이 살아있으면 아기 정보·성씨를 복원해
  //   정보/성씨 입력을 건너뛰고 이름 입력부터 시작. (정해진 횟수 안에서는 재입력 불필요)
  //   이용권이 없으면 결제 안내부터.
  useEffect(() => {
    // 1) 이용권 먼저 확인
    let passRemaining = 0
    let passBaby: Record<string, string> | null = null
    let passSurname: SavedChar | null = null
    try {
      const p = JSON.parse(localStorage.getItem(NEWBORN_PASS_KEY) || '{}')
      if (typeof p.remaining === 'number' && p.remaining > 0) {
        passRemaining = p.remaining
        passBaby = p.babyInfo || null
        passSurname = p.surname || null
      }
    } catch {}

    // 2) URL 파라미터(다른 이름 또 지어보기)도 확인 — 이용권 정보가 없을 때 보조
    const babyRaw = sp.get('baby')
    const surRaw = sp.get('surname')
    let urlBaby: Record<string, string> | null = null
    let urlSurname: SavedChar | null = null
    try { if (babyRaw) urlBaby = JSON.parse(decodeURIComponent(babyRaw)) } catch {}
    try { if (surRaw) urlSurname = JSON.parse(decodeURIComponent(surRaw)) as SavedChar } catch {}

    const b = passBaby || urlBaby
    const s = passSurname || urlSurname

    setRemaining(passRemaining)

    // 아기 정보 복원 → 정보 입력 건너뜀
    if (b && b.year) {
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
    }
    // 성씨 복원 → 성씨 입력 건너뜀
    if (s && s.hanja) {
      setSurHanja(s)
      setSurHangul(s.hangul)
      setSurInput(s.hangul)
      setSurLocked(true)
    }

    setEntryLoaded(true)
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
    setSurLocked(false)
    setG1(''); setG2('')
    // ★ 이용권에 이 아기 정보 저장 (이후 재진입 시 정보 입력 스킵)
    try {
      const babyObj = toMyInfoObject(std) as unknown as Record<string, string>
      const p = JSON.parse(localStorage.getItem(NEWBORN_PASS_KEY) || '{}')
      if (typeof p.remaining === 'number' && p.remaining > 0) {
        localStorage.setItem(NEWBORN_PASS_KEY, JSON.stringify({ ...p, babyInfo: babyObj }))
      }
    } catch {}
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
    const sur: SavedChar = {
      hangul: row.hangul,
      hanja: row.hanja,
      strokes: row.strokes,
      resourceOhaeng: row.resource_ohaeng,
    }
    setSurHanja(sur)
    setPicker(false)
    setHanjaList([])
    // ★ 이용권에 성씨 저장 (이후 재진입 시 성씨 입력 스킵)
    try {
      const p = JSON.parse(localStorage.getItem(NEWBORN_PASS_KEY) || '{}')
      if (typeof p.remaining === 'number' && p.remaining > 0) {
        localStorage.setItem(NEWBORN_PASS_KEY, JSON.stringify({ ...p, surname: sur }))
      }
    } catch {}
  }

  const givenReady =
    firstHangul(g1).trim().length > 0 &&
    (nameCount === 1 || firstHangul(g2).trim().length > 0)

  // 원하는 발음으로 한자 지어주기 → 아기 사주+성씨+한글이름을 URL로 실어 아기 한자고르기로
  // (이용권은 입구에서 이미 결제됨. 여기선 babyKey를 이용권에 확정하고 바로 진입)
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

    // 이용권에 babyKey를 확정 (result가 이 열쇠로 이용권/기록을 읽음)
    const bkey = babyKeyOf(babyObj as unknown as { gender: string; calType: string; year: string; month: string; day: string; leapMonth: string; hour: string })
    try {
      const p = JSON.parse(localStorage.getItem(NEWBORN_PASS_KEY) || '{}')
      if (typeof p.remaining === 'number' && p.remaining > 0) {
        localStorage.setItem(NEWBORN_PASS_KEY, JSON.stringify({ ...p, babyKey: bkey, babyInfo: babyObj, surname: surHanja }))
        router.push(url)
        return
      }
    } catch {}
    // 이용권이 없으면(직접 URL 진입 등) 결제 안내 화면으로
    setRemaining(0)
    setConfirmed(false)
  }

  // 결제(지금은 실제 PG 없이 통과) → 이용권 충전
  // ★ 나중에 실제 결제 붙일 때 이 함수 안 "결제 통과" 자리에 PG 호출을 넣으면 됨
  //   결제는 아기 정보 입력 전에 받으므로, 이 시점엔 babyKey를 아직 모름(정보 확정 시 채움).
  function payNow() {
    try {
      localStorage.setItem(NEWBORN_PASS_KEY, JSON.stringify({ babyKey: '', remaining: tryLimit, babyInfo: null, surname: null }))
      localStorage.removeItem('newborn_history_v1')
    } catch {}
    setRemaining(tryLimit)
  }

  const sajuLine = converting ? '사주 불러오는 중...' :
    `일간 ${dayStem} · ${info?.calType} ${info?.year}.${info?.month}.${info?.day}${info?.calType === '음력' && info?.leapMonth === '1' ? ' (윤달)' : ''}`

  const givenInputStyle = {
    width: 48, height: 46, textAlign: 'center' as const, fontSize: 18,
    borderRadius: 10, border: '1px solid ' + gold,
    background: 'rgba(200,120,60,0.07)', color: '#1a1a1a',
  }

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <PitchHeader title="내 아기 이름짓기" onBack={() => router.push('/manseryeok/naming/rename/newborn-storage')} onHome={() => router.push('/home-new')} />

      <div style={{ padding: '16px' }}>

        {/* ★ 결제 전: 이용권 안내 (아기 정보 입력 전에 먼저 결제) */}
        {entryLoaded && remaining <= 0 && (
          <div style={{ background: cardBg, border, borderRadius: '16px', padding: '22px 18px', marginBottom: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>👶</div>
            <div style={{ fontSize: 17, fontWeight: 'bold', color: '#c8783c', marginBottom: 8 }}>아기 이름 지어보기</div>
            <div style={{ fontSize: 13, color: '#b4785a', marginBottom: 18, lineHeight: 1.8 }}>
              결제하시면 아기 사주에 맞는 한자로<br />
              <b style={{ color: gold }}>{tryLimit}개</b>의 이름을 지어보고<br />
              상세 풀이까지 확인하실 수 있어요.
            </div>
            <div style={{ background: '#FDF6F0', borderRadius: 12, padding: '14px', marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '0.5px solid #f0e0d5' }}>
              <span style={{ fontSize: 14, color: '#b4785a' }}>결제 금액</span>
              <span style={{ fontSize: 20, fontWeight: 'bold', color: gold }}>{hanjaPrice.toLocaleString()}원</span>
            </div>
            <button onClick={payNow}
              style={{ width: '100%', padding: 15, borderRadius: 12, background: '#c8783c', border: 'none', color: '#fff', fontSize: 15, fontWeight: 'bold', cursor: 'pointer' }}>
              💳 {hanjaPrice.toLocaleString()}원 결제하고 시작하기
            </button>
            <div style={{ fontSize: 11, color: '#b4785a', marginTop: 10, lineHeight: 1.6 }}>
              결제 후 아기 정보를 입력하시면, 정해진 횟수 안에서는<br />정보를 다시 넣지 않고 여러 번 지어보실 수 있어요.
            </div>
          </div>
        )}

        {/* ── 아기 정보 입력 (결제 후 · 확정 전) ── */}
        {entryLoaded && remaining > 0 && !confirmed && (
          <div style={{ background: cardBg, border, borderRadius: '14px', padding: '14px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', background: '#c8783c' }}>✦</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1a1a1a' }}>아기 정보를 입력해주세요</div>
                <div style={{ fontSize: '11px', color: '#b4785a' }}>아기 사주로 이름을 풀이해요</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
              {([
                { label: '성별', vals: ['남', '여'] as const, state: gender, set: setGender },
                { label: '달력', vals: ['양력', '음력'] as const, state: calType, set: setCalType },
              ] as const).map(({ label, vals, state, set }) => (
                <div key={label} style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: '#b4785a', marginBottom: '6px' }}>{label}</div>
                  <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '0.5px solid #f0e0d5' }}>
                    {vals.map((v) => (
                      <button key={v} onClick={() => (set as (x: string) => void)(v)}
                        style={{ flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                          ...(state === v ? { background: '#c8783c', color: '#fff', border: 'none' } : { background: 'transparent', color: '#b4785a', border: 'none' }) }}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {calType === '음력' && (
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '11px', color: '#b4785a', marginBottom: '6px' }}>
                  윤달 여부 <span style={{ color: '#b4785a' }}>(음력 생일이 윤달이면 선택)</span>
                </div>
                <div style={{ display: 'flex', borderRadius: '10px', overflow: 'hidden', border: '0.5px solid #f0e0d5' }}>
                  {([['평달', false], ['윤달', true]] as const).map(([lbl, val]) => (
                    <button key={lbl} onClick={() => setLeap(val)}
                      style={{ flex: 1, padding: '10px 0', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
                        ...(leap === val ? { background: '#c8783c', color: '#fff', border: 'none' } : { background: 'transparent', color: '#b4785a', border: 'none' }) }}>
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '11px', color: '#b4785a', marginBottom: '6px' }}>생년월일</div>
              <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', background: '#FDF6F0', border: '0.5px solid #f0e0d5', color: birthDate ? gold : '#b4785a', fontSize: '14px', colorScheme: 'dark' }} />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#b4785a', marginBottom: '6px' }}>태어난 시 (시주)</div>
              <select value={birthHour} onChange={(e) => setBirthHour(e.target.value)}
                style={{ width: '100%', boxSizing: 'border-box', padding: '12px 14px', borderRadius: '10px', background: '#FDF6F0', border: '0.5px solid #f0e0d5', color: birthHour ? gold : '#b4785a', fontSize: '14px', colorScheme: 'dark' }}>
                <option value="">시간 선택</option>
                {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>

            <button onClick={confirmBaby}
              style={{ width: '100%', padding: '13px', borderRadius: '12px', background: '#c8783c', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              아기 사주 확인 →
            </button>
          </div>
        )}

        {/* ── 아기 사주 요약 (확정 후) ── */}
        {confirmed && info && (
          <div style={{ background: cardBg, border, borderRadius: '12px', padding: '12px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#b4785a', marginBottom: '5px' }}>아기 사주</div>
              <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{sajuLine}</div>
            </div>
            <button onClick={editBaby}
              style={{ flexShrink: 0, fontSize: '12px', padding: '7px 12px', borderRadius: '9px', background: 'rgba(200,120,60,0.05)', color: '#b4785a', border: '0.5px solid #f0e0d5', cursor: 'pointer', whiteSpace: 'nowrap', marginLeft: '10px' }}>
              다시 입력
            </button>
          </div>
        )}

        {/* ── 성씨 입력 (아기 사주 확정 후에만 · 성씨 미확정일 때만) ── */}
        {confirmed && info && (
          <>
            {!surLocked && (
              <>
                <div style={{ fontSize: '13px', color: '#b4785a', marginBottom: '10px' }}>아기 성씨를 한글로 적어주세요</div>
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
                    style={{ flex: 1, minWidth: 0, padding: '13px', borderRadius: '12px', background: '#FDF6F0', border: '0.5px solid #f0e0d5', color: '#1a1a1a', fontSize: '16px' }}
                  />
                  <button onClick={() => applySurname()}
                    style={{ flexShrink: 0, padding: '0 18px', borderRadius: '12px', background: gold, border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    확인
                  </button>
                </div>
              </>
            )}

            {surHangul && (
              <>
                <div style={{ fontSize: '13px', color: '#b4785a', marginBottom: '12px' }}>성씨 한자</div>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '6px' }}>
                  <button onClick={() => openPicker(surHangul)} className="active:scale-95"
                    style={{ width: '78px', height: '78px', borderRadius: '50%',
                      background: surHanja ? 'rgba(200,120,60,0.10)' : cardBg,
                      border: surHanja ? `2px solid ${gold}` : '1px dashed #d8a87e',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                    {surHanja ? (
                      <>
                        <span style={{ fontSize: '28px', fontWeight: 'bold', color: gold, lineHeight: 1 }}>{surHanja.hanja}</span>
                        <span style={{ fontSize: '10px', color: '#b4785a', marginTop: '2px' }}>{surHanja.hangul}</span>
                      </>
                    ) : (
                      <>
                        <span style={{ fontSize: '26px', fontWeight: 'bold', color: '#1a1a1a', lineHeight: 1 }}>{surHangul}</span>
                        <span style={{ fontSize: '9px', color: gold, marginTop: '4px' }}>한자 고르기</span>
                      </>
                    )}
                  </button>
                </div>
                {surHanja && (
                  <div style={{ fontSize: '9px', color: '#b4785a', textAlign: 'center', marginBottom: '20px' }}>
                    {surHanja.resourceOhaeng}·{surHanja.strokes}획
                  </div>
                )}
              </>
            )}

            {/* ── 지어줄 한글 이름 입력 (성씨 한자 고른 뒤) ── */}
            {surHanja && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '13px', color: '#b4785a', marginBottom: '10px' }}>
                  지어줄 한글 이름을 적어주세요 <span style={{ color: '#b4785a' }}>(부를 이름)</span>
                </div>

                <div style={{ fontSize: '12px', color: '#b4785a', marginBottom: '8px' }}>이름 글자 수</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  {([[1, '외자 (한 글자)'], [2, '두 글자']] as const).map(([n, lbl]) => {
                    const on = nameCount === n
                    return (
                      <button key={n} onClick={() => { setNameCount(n); setG1(''); setG2('') }}
                        style={{ flex: 1, padding: '12px 0', borderRadius: 12, cursor: 'pointer',
                          background: on ? 'rgba(200,120,60,0.12)' : cardBg,
                          border: '1px solid ' + (on ? gold : 'rgba(200,120,60,0.10)'),
                          color: on ? gold : '#cfcdc4', fontWeight: 700, fontSize: 14 }}>
                        {lbl}
                      </button>
                    )
                  })}
                </div>

                <div style={{ background: cardBg, border: '1px solid rgba(200,120,60,0.10)', borderRadius: 16, padding: '18px 16px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: 22, color: '#b4785a' }}>{surHanja.hanja}</span>
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
                    background: givenReady ? 'rgba(200,120,60,0.12)' : cardBg,
                    border: `1px solid ${givenReady ? gold : 'rgba(200,120,60,0.10)'}`,
                    cursor: givenReady ? 'pointer' : 'default', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: givenReady ? gold : '#555' }}>사주에 맞는 한자 추천받기 →</div>
                    <div style={{ fontSize: '11px', color: '#96502e', marginTop: '2px' }}>정한 한글 이름에, 아기 사주에 맞는 한자로</div>
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
            style={{ width: '100%', maxWidth: '400px', background: '#fffbf7', borderRadius: '18px', padding: '20px 16px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: gold, marginBottom: '14px' }}>
              &lsquo;{surHangul}&rsquo; 성씨 한자 고르기
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {searching && <div style={{ textAlign: 'center', color: '#b4785a', padding: '20px' }}>찾는 중...</div>}
              {!searching && hanjaList.length === 0 && (
                <div style={{ textAlign: 'center', color: '#b4785a', padding: '20px', fontSize: '13px' }}>
                  &lsquo;{surHangul}&rsquo; 음의 한자를 찾을 수 없어요
                </div>
              )}
              {hanjaList.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  {hanjaList.map((row, i) => (
                    <div key={i} onClick={() => pickHanja(row)}
                      style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: '12px', background: '#fffbf7', cursor: 'pointer', border: '0.5px solid #f0e0d5' }}>
                      <span style={{ fontSize: '26px', fontWeight: 'bold', color: gold, minWidth: '32px', textAlign: 'center' }}>{row.hanja}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: '#1a1a1a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.meaning}</div>
                        <div style={{ fontSize: '11px', color: '#b4785a', marginTop: '2px' }}>{row.resource_ohaeng}·{row.strokes}획</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function NewbornPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FDF6F0' }}>
        <div style={{ color: '#c8783c' }}>로딩 중...</div>
      </div>
    }>
      <NewbornInner />
    </Suspense>
  )
}
