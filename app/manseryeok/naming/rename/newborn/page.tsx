'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/app/components/common/PageHeader'

const NEWBORN_SURNAME_KEY = 'newborn_surname_v1'

const gold = '#FAC775'
const cardBg = '#2C2C2A'
const border = '1px solid rgba(250,199,117,0.15)'

// 홈 입력 화면과 동일한 시(時) 목록 / 인덱스 매핑 (절대 변경 금지)
const HOURS = [
  '모름', '子시(23~01)', '丑시(01~03)', '寅시(03~05)', '卯시(05~07)',
  '辰시(07~09)', '巳시(09~11)', '午시(11~13)', '未시(13~15)',
  '申시(15~17)', '酉시(17~19)', '戌시(19~21)', '亥시(21~23)',
]
const HOUR_INDEX: Record<string, number> = {
  '子시(23~01)': 0, '丑시(01~03)': 1, '寅시(03~05)': 2, '卯시(05~07)': 3,
  '辰시(07~09)': 4, '巳시(09~11)': 5, '午시(11~13)': 6, '未시(13~15)': 7,
  '申시(15~17)': 8, '酉시(17~19)': 9, '戌시(19~21)': 10, '亥시(21~23)': 11,
}

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

// 개명(newname)이 "같은 사람"을 식별하는 키. myinfo 기반과 글자 단위로 동일해야 한다.
// 순서: calType | year | month | day | leapMonth | hourIdx('x') | gender
function personKey(info: {
  gender: string; calType: string; year: number; month: number; day: number; leapMonth: string; hourIdx: number | null
} | null): string {
  if (!info || !info.year) return ''
  const hourIdx = info.hourIdx == null ? 'x' : info.hourIdx
  return [info.calType, info.year, info.month, info.day, info.leapMonth, hourIdx, info.gender].join('|')
}

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

// 한글 음절 한 글자만 남기기 (조합 완료 후 정리용)
function firstHangul(s: string): string {
  const arr = Array.from(s)
  for (const ch of arr) {
    const code = ch.charCodeAt(0)
    if (code >= 0xac00 && code <= 0xd7a3) return ch
  }
  return arr.length > 0 ? arr[arr.length - 1] : ''
}

function NewbornInner() {
  const router = useRouter()

  // ── 아기 사주 직접 입력 ──
  const [gender, setGender] = useState<'남' | '여'>('남')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')
  const [birthDate, setBirthDate] = useState('')   // 'YYYY-MM-DD'
  const [birthHour, setBirthHour] = useState('')   // HOURS 라벨 또는 '모름'
  const [confirmed, setConfirmed] = useState(false) // 아기 정보 확정 여부

  // 확정된 아기 사주 info
  const [info, setInfo] = useState<{
    gender: string; calType: string
    year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
  } | null>(null)

  // ── 성씨 입력 ──
  const [surInput, setSurInput] = useState('')
  const [surHangul, setSurHangul] = useState('')
  const [surHanja, setSurHanja] = useState<SavedChar | null>(null)
  const composingSur = useRef(false)

  const [picker, setPicker] = useState(false)
  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [searching, setSearching] = useState(false)

  const pkey = personKey(info)

  const { dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  // 아기 정보 확정
  function confirmBaby() {
    if (!birthDate) {
      alert('아기 생년월일을 입력해주세요 😊')
      return
    }
    const d = birthDate.split('-')
    const y = parseInt(d[0] || '0')
    const m = parseInt(d[1] || '0')
    const day = parseInt(d[2] || '0')
    if (!y || !m || !day) {
      alert('아기 생년월일을 올바르게 입력해주세요 😊')
      return
    }
    const hourIdx = birthHour === '모름' || birthHour === '' ? null : HOUR_INDEX[birthHour]
    setInfo({ gender, calType, year: y, month: m, day, leapMonth: '0', hourIdx })
    setConfirmed(true)
    // 아기 정보를 바꾸면 이전 성씨 선택은 초기화
    setSurInput(''); setSurHangul(''); setSurHanja(null)
  }

  // 아기 정보 다시 입력
  function editBaby() {
    setConfirmed(false)
    setInfo(null)
    setSurInput(''); setSurHangul(''); setSurHanja(null)
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

  // 원하는 발음으로 한자 지어주기 → 성씨 + 아기 사주 저장 후 newname
  function goDirect() {
    if (!surHanja || !info) return
    try {
      // newname이 읽는 성씨 (personKey로 같은 사람 식별)
      localStorage.setItem(NEWBORN_SURNAME_KEY, JSON.stringify({ personKey: pkey, surname: surHanja }))
      // newname이 아기 사주를 읽을 수 있도록 함께 저장 (본인 사주 myinfo는 건드리지 않음)
      localStorage.setItem('newborn_baby_v1', JSON.stringify({
        personKey: pkey,
        gender: info.gender,
        calType: info.calType,
        year: info.year,
        month: info.month,
        day: info.day,
        leapMonth: info.leapMonth,
        hour: info.hourIdx == null ? '모름' : String(info.hourIdx),
      }))
    } catch {}
    router.push('/manseryeok/naming/rename/newname')
  }

  const sajuLine = converting ? '사주 불러오는 중...' :
    `일간 ${dayStem} · ${info?.calType} ${info?.year}.${info?.month}.${info?.day}`

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

            {surHanja && (
              <div style={{ marginTop: '14px' }}>
                <div style={{ fontSize: '13px', color: gold, fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
                  어떻게 지어드릴까요?
                </div>

                <button onClick={goDirect}
                  style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(250,199,117,0.16)', border: `1px solid ${gold}`, marginBottom: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', color: gold }}>원하는 발음으로, 한자 지어주기</div>
                    <div style={{ fontSize: '11px', color: '#cbb890', marginTop: '2px' }}>부를 한글 이름을 정하면, 사주에 맞는 한자로</div>
                  </div>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: gold, whiteSpace: 'nowrap', marginLeft: '10px' }}>5,000원</span>
                </button>

                {/* TODO(나중에): '새 이름 5개 추천' / '새 이름 10개 추천' 버튼 자리.
                    recommend 화면 만들면 /manseryeok/naming/rename/recommend?count=5(또는 10) 로 연결 */}
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
