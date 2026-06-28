'use client'
import { Suspense, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useResultSaju } from '@/hooks/useResultSaju'
import { supabase } from '@/lib/supabase'
import PageHeader from '@/app/components/common/PageHeader'

const MY_INFO_KEY = 'myinfo'
const NEWBORN_SURNAME_KEY = 'newborn_surname_v1'

const gold = '#FAC775'
const cardBg = '#2C2C2A'
const border = '1px solid rgba(250,199,117,0.15)'

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

function personKey(m: Record<string, unknown> | null): string {
  if (!m || !m.year) return ''
  const hourIdx = m.hour === '모름' || m.hour == null ? 'x' : m.hour
  return [m.calType || '양력', m.year, m.month, m.day, m.leapMonth || '0', hourIdx, m.gender || '남'].join('|')
}

function isHangulSyllable(ch: string): boolean {
  const code = ch.charCodeAt(0)
  return code >= 0xac00 && code <= 0xd7a3
}

function NewbornInner() {
  const router = useRouter()

  const [info, setInfo] = useState<{
    gender: string; calType: string
    year: number; month: number; day: number
    leapMonth: string; hourIdx: number | null
  } | null>(null)
  const [pkey, setPkey] = useState('')

  const [surInput, setSurInput] = useState('')
  const [surHangul, setSurHangul] = useState('')        // 확정된 성씨 한글
  const [surHanja, setSurHanja] = useState<SavedChar | null>(null) // 고른 성씨 한자

  const [picker, setPicker] = useState(false)
  const [hanjaList, setHanjaList] = useState<HanjaRow[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    try {
      const m = JSON.parse(localStorage.getItem(MY_INFO_KEY) || '{}')
      if (m.year) {
        setInfo({
          gender: m.gender || '남',
          calType: m.calType || '양력',
          year: parseInt(String(m.year)),
          month: parseInt(String(m.month)),
          day: parseInt(String(m.day)),
          leapMonth: m.leapMonth || '0',
          hourIdx: m.hour === '모름' || m.hour == null ? null : parseInt(String(m.hour)),
        })
      }
      setPkey(personKey(m))
    } catch {}
  }, [])

  const { dayStem, converting } = useResultSaju(
    info?.calType || '양력',
    info?.year || 0,
    info?.month || 0,
    info?.day || 0,
    info?.leapMonth || '0',
    info?.hourIdx ?? null,
  )

  function applySurname() {
    const cleaned = surInput.trim().replace(/\s/g, '')
    const arr = Array.from(cleaned).filter(isHangulSyllable)
    if (arr.length < 1) return
    setSurHangul(arr[0])
    setSurHanja(null)
    openPicker(arr[0])
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

  // 1번: 원하는 발음으로 한자 지어주기 → 성씨 저장 후 newname
  function goDirect() {
    if (!surHanja) return
    try {
      localStorage.setItem(NEWBORN_SURNAME_KEY, JSON.stringify({ personKey: pkey, surname: surHanja }))
    } catch {}
    router.push('/manseryeok/naming/rename/newname')
  }

  if (!info) {
    return (
      <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto' }}>
        <PageHeader title="내 아기 이름짓기" onBack={() => router.push('/manseryeok/naming')} />
        <div style={{ padding: '40px 20px', textAlign: 'center', color: '#8a88a0', lineHeight: 1.8 }}>
          먼저 홈에서 아기 생년월일을<br />입력해주세요.
          <div style={{ marginTop: 20 }}>
            <button onClick={() => router.push('/')}
              style={{ padding: '12px 24px', borderRadius: '12px', background: 'linear-gradient(135deg,#3C3489,#FAC775)', border: 'none', color: '#1a1a18', fontWeight: 'bold', cursor: 'pointer' }}>
              홈으로 가기 →
            </button>
          </div>
        </div>
      </main>
    )
  }

  const sajuLine = converting ? '사주 불러오는 중...' :
    `일간 ${dayStem} · ${info.calType} ${info.year}.${info.month}.${info.day}`

  return (
    <main style={{ minHeight: '100vh', background: '#1a1a18', maxWidth: '430px', margin: '0 auto', paddingBottom: '40px' }}>
      <PageHeader title="내 아기 이름짓기" onBack={() => router.push('/manseryeok/naming')} />

      <div style={{ padding: '16px' }}>
        {/* 아기 사주 (홈 정보) */}
        <div style={{ background: cardBg, border, borderRadius: '12px', padding: '12px', marginBottom: '16px' }}>
          <div style={{ fontSize: '11px', color: '#8a88a0', marginBottom: '5px' }}>아기 사주</div>
          <div style={{ fontSize: '13px', color: '#e8e4ff' }}>{sajuLine}</div>
          <div style={{ fontSize: '10px', color: '#8a88a0', marginTop: '4px' }}>홈에서 입력한 정보로 풀이해요</div>
        </div>

        {/* 성씨 입력 */}
        <div style={{ fontSize: '13px', color: '#8a88a0', marginBottom: '10px' }}>아기 성씨를 한글로 적어주세요</div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'stretch' }}>
          <input
            value={surInput}
            onChange={(e) => setSurInput(e.target.value.slice(0, 1))}
            onKeyDown={(e) => { if (e.key === 'Enter') applySurname() }}
            placeholder="예: 김"
            style={{ flex: 1, minWidth: 0, padding: '13px', borderRadius: '12px', background: '#1a1a18', border: '1px solid rgba(255,255,255,0.15)', color: '#e8e4ff', fontSize: '16px' }}
          />
          <button onClick={applySurname}
            style={{ flexShrink: 0, padding: '0 18px', borderRadius: '12px', background: gold, border: 'none', color: '#1a1a18', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            확인
          </button>
        </div>

        {/* 성씨 한자 (고른 결과) */}
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

        {/* 3버튼 — 성씨 한자 고른 뒤 표시 */}
        {surHanja && (
          <div style={{ marginTop: '14px' }}>
            <div style={{ fontSize: '13px', color: gold, fontWeight: 'bold', marginBottom: '12px', textAlign: 'center' }}>
              어떻게 지어드릴까요?
            </div>

            {/* 1) 원하는 발음으로, 한자 지어주기 — 작동 */}
            <button onClick={goDirect}
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: 'rgba(250,199,117,0.16)', border: `1px solid ${gold}`, marginBottom: '10px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: gold }}>원하는 발음으로, 한자 지어주기</div>
                <div style={{ fontSize: '11px', color: '#cbb890', marginTop: '2px' }}>부를 한글 이름을 정하면, 사주에 맞는 한자로</div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: gold, whiteSpace: 'nowrap', marginLeft: '10px' }}>5,000원</span>
            </button>

            {/* 2) 새 이름 5개 추천 — 준비 중 */}
            <div style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: cardBg, border: '1px solid rgba(250,199,117,0.12)', marginBottom: '10px', opacity: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e8e4ff' }}>
                  새 이름 5개 추천 <span style={{ fontSize: '10px', color: '#8a88a0', border: '1px solid #555', borderRadius: '6px', padding: '1px 6px', marginLeft: '4px' }}>준비 중</span>
                </div>
                <div style={{ fontSize: '11px', color: '#8a88a0', marginTop: '2px' }}>사주에 맞는 새 이름 5개를 지어드려요</div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#666', whiteSpace: 'nowrap', marginLeft: '10px' }}>10,000원</span>
            </div>

            {/* 3) 새 이름 10개 추천 — 준비 중 */}
            <div style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', background: cardBg, border: '1px solid rgba(250,199,117,0.12)', opacity: 0.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#e8e4ff' }}>
                  새 이름 10개 추천 <span style={{ fontSize: '10px', color: '#8a88a0', border: '1px solid #555', borderRadius: '6px', padding: '1px 6px', marginLeft: '4px' }}>준비 중</span>
                </div>
                <div style={{ fontSize: '11px', color: '#8a88a0', marginTop: '2px' }}>더 많은 후보 중에서 고르고 싶다면</div>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#666', whiteSpace: 'nowrap', marginLeft: '10px' }}>20,000원</span>
            </div>
          </div>
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
