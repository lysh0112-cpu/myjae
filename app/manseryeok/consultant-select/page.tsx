'use client'
import { useRef, useState } from 'react'
import { Suspense, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import SummaryBand from './SummaryBand'

type Consultant = {
  id: string
  name: string
  specialty: string
  photo_url: string
  career: string
  intro: string
  rating: number
  review_count: number
  review_text: string
  region: string
}

type Slot = {
  id: string
  consultant_id: string
  slot_date: string
  slot_hour: number
  is_booked: boolean
}

const WEEK = ['일', '월', '화', '수', '목', '금', '토']

function fmtDate(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const wd = new Date(y, m - 1, d).getDay()
  return `${m}/${d} ${WEEK[wd]}`
}

function ConsultantSelectInner() {
  const params = useSearchParams()
  const router = useRouter()
  const mode  = params.get('mode')  || 'personal'
  const score = params.get('score') || ''
  const names = params.get('names') || ''

  const gender = params.get('gender') ?? ''
  const calType = params.get('calType') ?? '양력'
  const year = params.get('year') ?? ''
  const month = params.get('month') ?? ''
  const day = params.get('day') ?? ''
  const hour = params.get('hour') ?? ''
  // 상담요청 구분(mode)을 birth_data에 함께 실어, 상담목록 '상담요청' 칸에 정확히 표시
  const birthData = { gender, calType, year, month, day, hour, consultationType: mode }

  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  // 예약 입력값 (펼친 상담사에 대해)
  const [custName, setCustName] = useState('')
  const [custPhone, setCustPhone] = useState('')
  const [pickedSlotId, setPickedSlotId] = useState<string | null>(null)
  const [booking, setBooking] = useState(false)
  const [done, setDone] = useState<{ consultantName: string; date: string; hour: number } | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('consultants')
        .select('id, name, specialty, photo_url, career, intro, rating, review_count, review_text, region')
        .eq('active', true)
        .order('sort')
        .order('created_at')
      setConsultants((data ?? []) as Consultant[])

      const today = new Date()
      const yyyy = today.getFullYear()
      const mm = String(today.getMonth() + 1).padStart(2, '0')
      const dd = String(today.getDate()).padStart(2, '0')
      const todayKey = `${yyyy}-${mm}-${dd}`

      const { data: slotData } = await supabase
        .from('consultant_slots')
        .select('id, consultant_id, slot_date, slot_hour, is_booked')
        .eq('is_booked', false)
        .gte('slot_date', todayKey)
        .order('slot_date')
        .order('slot_hour')
      setSlots((slotData ?? []) as Slot[])

      setLoading(false)
    }
    load()
  }, [])

  function scheduleOf(consultantId: string): { date: string; slots: Slot[] }[] {
    const mine = slots.filter(s => s.consultant_id === consultantId)
    const byDate: Record<string, Slot[]> = {}
    for (const s of mine) {
      if (!byDate[s.slot_date]) byDate[s.slot_date] = []
      byDate[s.slot_date].push(s)
    }
    return Object.keys(byDate).sort().map(date => ({
      date,
      slots: byDate[date].sort((a, b) => a.slot_hour - b.slot_hour),
    }))
  }

  const modeLabel: Record<string, string> = {
    couple: '💑 연인 궁합',
    prewedding: '💍 예비 신혼',
    married: '👫 부부 상담',
    birth: '👶 출산 시기',
    naming: '✏️ 개명 상담',
    personal: '🔮 개인 상담',
  }

  function openConsultant(id: string) {
    if (openId === id) { setOpenId(null); return }
    setOpenId(id)
    setCustName('')
    setCustPhone('')
    setPickedSlotId(null)
  }

  function formatPhone(v: string) {
    const n = v.replace(/[^0-9]/g, '').slice(0, 11)
    if (n.length < 4) return n
    if (n.length < 8) return n.slice(0, 3) + '-' + n.slice(3)
    return n.slice(0, 3) + '-' + n.slice(3, 7) + '-' + n.slice(7)
  }

  async function reserve(c: Consultant) {
    const phoneDigits = custPhone.replace(/\D/g, '')
    if (!custName.trim()) { alert('이름을 입력해 주세요.'); return }
    if (phoneDigits.length < 10) { alert('연락처를 정확히 입력해 주세요.'); return }
    if (!pickedSlotId) { alert('상담 받을 시간을 선택해 주세요.'); return }

    const slot = slots.find(s => s.id === pickedSlotId)
    if (!slot) { alert('선택한 시간을 찾을 수 없어요. 새로고침 후 다시 시도해 주세요.'); return }

    setBooking(true)
    try {
      const { data: u } = await supabase.auth.getUser()

      // 고객이 사주 화면에서 본 해설을 무료·유료 각각 그대로 저장
      const aiFree = typeof window !== 'undefined' ? (sessionStorage.getItem('ai_free_analysis') || '') : ''
      const aiPaid = typeof window !== 'undefined' ? (sessionStorage.getItem('ai_analysis') || '') : ''

      // 고객 저장
      await supabase.from('customers').upsert({ phone: phoneDigits }, { onConflict: 'phone' })

      // 상담 건 생성
      const { data: cons, error: cErr } = await supabase
        .from('consultations')
        .insert({
          customer_phone: phoneDigits,
          customer_name: custName.trim(),
          consultant_id: c.id,
          birth_data: birthData,
          status: 'booked',
          user_id: u?.user?.id ?? null,
          booking_date: slot.slot_date,
          booking_hour: slot.slot_hour,
          ai_analysis: aiPaid,        // 유료 상세 풀이 (고객이 본 그대로)
          ai_free_analysis: aiFree,   // 무료 기본 풀이 (고객이 본 그대로)
        })
        .select('id')
        .single()
      if (cErr) throw cErr

      // 궁합이면: 세션에 담긴 계산 전체를 couples 테이블에 저장 (해설+점수+두 사람 사주원국)
      if (typeof window !== 'undefined') {
        const coupleRaw = sessionStorage.getItem('couple_full')
        if (coupleRaw) {
          try {
            const cp = JSON.parse(coupleRaw)
            await supabase.from('couples').insert({
              consultation_id: cons.id,
              person_a_birth: cp.person_a_birth ?? null,
              person_b_birth: cp.person_b_birth ?? null,
              mode: cp.mode ?? mode,
              result: cp.result ?? null,
            })
          } catch (e) {
            console.error('couples 저장 실패', e)
          }
        }
      }

      // 물상도면: 세션에 담긴 그림+해설을 mulsang_images에 상담 건과 연결 저장
      if (typeof window !== 'undefined') {
        const mulsangRaw = sessionStorage.getItem('mulsang_full')
        if (mulsangRaw) {
          try {
            const ms = JSON.parse(mulsangRaw)
            await supabase.from('mulsang_images').insert({
              consultation_id: cons.id,
              image_url: ms.image_url ?? null,
              prompt: ms.prompt ?? null,
              style: ms.style ?? null,
              commentary: ms.commentary ?? null,
            })
          } catch (e) {
            console.error('mulsang 저장 실패', e)
          }
        }
      }

      // 개명이면: 세션에 담긴 이름풀이 결과를 namings에 상담 건과 연결 저장
      // (궁합·물상도와 동일 방식. 본인 이름/아기 이름 모두 kind로 구분해 저장)
      if (typeof window !== 'undefined') {
        const namingRaw = sessionStorage.getItem('naming_full')
        if (namingRaw) {
          try {
            const nm = JSON.parse(namingRaw)
            await supabase.from('namings').insert({
              consultation_id: cons.id,
              kind: nm.kind ?? 'self',
              hangul_name: nm.hangul_name ?? null,
              hanja_name: nm.hanja_name ?? null,
              chars: nm.chars ?? null,
              result: nm.result ?? null,
              commentary: nm.commentary ?? null,
              target_birth: nm.target_birth ?? null,
            })
          } catch (e) {
            console.error('naming 저장 실패', e)
          }
        }
      }

      // 결혼택일이면: 세션에 담긴 택일 결과를 weddings에 상담 건과 연결 저장
      // (궁합·물상도·개명과 동일 방식. kind로 '좋은날찾기(find)'/'정한날봐주기(check)' 구분)
      if (typeof window !== 'undefined') {
        const weddingRaw = sessionStorage.getItem('wedding_full')
        if (weddingRaw) {
          try {
            const wd = JSON.parse(weddingRaw)
            await supabase.from('weddings').insert({
              consultation_id: cons.id,
              kind: wd.kind ?? 'find',
              start_date: wd.start_date ?? null,
              end_date: wd.end_date ?? null,
              day_pref: wd.day_pref ?? null,
              groom: wd.groom ?? null,
              bride: wd.bride ?? null,
              recommendations: wd.recommendations ?? null,
              avoid_days: wd.avoid_days ?? null,
              ai_notes: wd.ai_notes ?? null,
            })
          } catch (e) {
            console.error('wedding 저장 실패', e)
          }
        }
      }

      // 출산택일이면: 세션에 담긴 출산시기 결과를 births에 상담 건과 연결 저장
      // (결혼택일과 동일 방식. 추천일 5개 + 부모 사주 + 피할 날)
      if (typeof window !== 'undefined') {
        const birthRaw = sessionStorage.getItem('birth_full')
        if (birthRaw) {
          try {
            const bt = JSON.parse(birthRaw)
            await supabase.from('births').insert({
              consultation_id: cons.id,
              kind: bt.kind ?? 'find',
              due_date: bt.due_date ?? null,
              method: bt.method ?? null,
              time_pref: bt.time_pref ?? null,
              baby_gender: bt.baby_gender ?? null,
              wishes: bt.wishes ?? null,
              parent1: bt.parent1 ?? null,
              parent2: bt.parent2 ?? null,
              recommendations: bt.recommendations ?? null,
              avoid_days: bt.avoid_days ?? null,
              ai_notes: bt.ai_notes ?? null,
            })
          } catch (e) {
            console.error('birth 저장 실패', e)
          }
        }
      }

      // 예약 저장
      await supabase.from('bookings').insert({
        slot_id: slot.id,
        consultant_id: c.id,
        consultation_id: cons.id,
        user_id: u?.user?.id ?? null,
        customer_phone: phoneDigits,
        status: 'booked',
      })

      // 슬롯 잠금
      await supabase.from('consultant_slots').update({ is_booked: true }).eq('id', slot.id)

      // 전달 완료된 해설은 세션에서 정리
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('ai_analysis')
        sessionStorage.removeItem('ai_free_analysis')
        sessionStorage.removeItem('couple_full')
        sessionStorage.removeItem('mulsang_full')
        sessionStorage.removeItem('naming_full')
        sessionStorage.removeItem('wedding_full')
        sessionStorage.removeItem('birth_full')
      }

      setDone({ consultantName: c.name, date: slot.slot_date, hour: slot.slot_hour })
    } catch (e) {
      console.error(e)
      alert('예약 중 문제가 생겼어요. 다시 시도해 주세요.')
      setBooking(false)
    }
  }

  // 예약 완료 화면
  if (done) {
    return (
      <main className="min-h-screen bg-[#0d0d1a] flex flex-col items-center justify-center px-6 text-center">
        <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
        <div className="text-[20px] text-[#e8e4ff] font-bold mb-2">예약이 완료됐어요</div>
        <div className="text-[14px] text-[#b0aec8] mb-1">{done.consultantName} 선생님</div>
        <div className="text-[14px] text-[#FAC775] mb-8">{fmtDate(done.date)} {done.hour}시</div>
        <div className="text-[12px] text-[#8888aa] mb-8 leading-relaxed">
          상담 시간에 마이페이지 → 내 상담 내역에서<br />채팅방으로 입장하실 수 있어요.
        </div>
        <button onClick={() => router.push('/mypage')}
          className="w-full max-w-[300px] py-[14px] rounded-xl text-[15px] font-bold mb-3"
          style={{ background: 'linear-gradient(135deg,#3C3489,#FAC775)', color: '#1a1a18' }}>
          마이페이지로 가기
        </button>
        <button onClick={() => router.push('/')}
          className="w-full max-w-[300px] py-[13px] rounded-xl text-[14px]"
          style={{ background: 'rgba(60,52,137,0.2)', color: '#9977cc', border: '1px solid rgba(119,102,221,0.3)' }}>
          홈으로
        </button>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#0d0d1a] pb-10">
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[#1e1e35] sticky top-0 bg-[#0d0d1a] z-10">
        <button onClick={() => router.back()}
          className="text-[#9d8cff] text-xl w-8 h-8 flex items-center justify-center">
          ‹
        </button>
        <span className="text-[15px] text-[#e8e4ff] font-medium">상담사 선택</span>
        <span className="ml-auto" style={{
          background:'#1a2030', color:'#88aadd',
          fontSize:'11px', padding:'4px 12px', borderRadius:'20px',
        }}>
          {modeLabel[mode] || '🔮 개인 상담'}
        </span>
      </div>

      <SummaryBand mode={mode} score={score} names={names} />

      <p className="px-5 pt-4 pb-2 text-[12px] text-[#7777aa]">
        상담할 선생님을 골라주세요 · {consultants.length}명
      </p>

      {loading ? (
        <p className="px-5 text-[13px] text-[#5555aa]">상담사를 불러오는 중...</p>
      ) : consultants.length === 0 ? (
        <p className="px-5 text-[13px] text-[#5555aa]">현재 상담 가능한 상담사가 없습니다.</p>
      ) : (
        <div className="px-4">
          {consultants.map(c => {
            const open = openId === c.id
            const sched = scheduleOf(c.id)
            const first = sched[0]
            return (
              <div key={c.id} className="mb-2 rounded-2xl overflow-hidden"
                style={{ border: '1px solid #252545', background: open ? '#13132a' : '#0f0f22' }}>
                <button onClick={() => openConsultant(c.id)}
                  className="w-full flex items-center gap-3 p-3 text-left">
                  <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                    background: '#2d2060', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.photo_url
                      ? <img src={c.photo_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 16, color: '#c8b0ff' }}>{c.name?.[0] || '?'}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="text-[15px] text-[#e8e4ff] font-medium">
                      {c.name} <span className="text-[12px] text-[#7766bb]">선생님</span>
                    </div>
                    <div className="text-[12px] text-[#8888bb] mt-0.5">{c.specialty || '명리 상담'}</div>
                    {first ? (
                      <div className="text-[11px] mt-1" style={{ color: '#7bc86c' }}>
                        가장 빠른 상담 · {fmtDate(first.date)} {first.slots[0].slot_hour}시
                      </div>
                    ) : (
                      <div className="text-[11px] mt-1" style={{ color: '#666688' }}>열린 일정 없음</div>
                    )}
                  </div>
                  {c.rating ? (
                    <span className="text-[12px] text-[#e0b060] flex-shrink-0">★ {c.rating}</span>
                  ) : null}
                  <span className="text-[#7766bb] text-lg flex-shrink-0">{open ? '⌃' : '⌄'}</span>
                </button>

                {open && (
                  <div className="px-4 pb-4">
                    {/* 프로필 */}
                    <div className="flex items-center gap-2 mb-3">
                      {c.rating ? <span className="text-[12px] text-[#e0b060]">★ {c.rating}</span> : null}
                      {c.review_count ? <span className="text-[12px] text-[#7777aa]">· 상담 {c.review_count}건</span> : null}
                    </div>
                    {c.career && (
                      <div className="text-[12px] text-[#9999cc] mb-2" style={{ whiteSpace: 'pre-line' }}>{c.career}</div>
                    )}
                    {c.intro && (
                      <p className="text-[13px] text-[#aaaacc] leading-relaxed mb-3">{c.intro}</p>
                    )}
                    {c.review_text && (
                      <div className="rounded-lg px-3 py-[10px] mb-3" style={{ background: '#0d0d1a' }}>
                        <div className="text-[11px] text-[#e0b060] mb-1">★★★★★</div>
                        <div className="text-[12px] text-[#8888aa] leading-relaxed">“{c.review_text}”</div>
                      </div>
                    )}

                    {/* 상담 가능 시간 (눌러서 선택) */}
                    <div className="mb-4">
                      <div className="text-[12px] mb-2" style={{ color: '#FAC775' }}>📅 상담 받을 시간</div>
                      {sched.length === 0 ? (
                        <div className="text-[12px]" style={{ color: '#666688' }}>아직 열어둔 시간이 없어요.</div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          {sched.map(row => (
                            <div key={row.date} className="rounded-lg px-3 py-2"
                              style={{ background: '#0d0d1a', border: '1px solid #1e1e35' }}>
                              <div className="text-[11px] mb-1.5" style={{ color: '#aaaacc' }}>{fmtDate(row.date)}</div>
                              <div className="flex flex-wrap gap-1.5">
                                {row.slots.map(s => {
                                  const on = pickedSlotId === s.id
                                  return (
                                    <button key={s.id} onClick={() => setPickedSlotId(s.id)}
                                      className="text-[12px] px-2.5 py-1 rounded-md"
                                      style={on
                                        ? { background: '#FAC775', color: '#1a1a18', border: '1px solid #FAC775', fontWeight: 700 }
                                        : { background: 'rgba(250,199,117,0.14)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.3)' }}>
                                      {s.slot_hour}시
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 이름 · 연락처 */}
                    {sched.length > 0 && (
                      <>
                        <div className="mb-2">
                          <div className="text-[12px] mb-1" style={{ color: '#8888bb' }}>이름</div>
                          <input value={custName} onChange={e => setCustName(e.target.value)}
                            placeholder="홍길동"
                            className="w-full rounded-lg px-3 py-2 text-[14px] outline-none"
                            style={{ background: '#0d0d1a', border: '1px solid #252545', color: '#e8e4ff' }} />
                        </div>
                        <div className="mb-4">
                          <div className="text-[12px] mb-1" style={{ color: '#8888bb' }}>휴대폰 번호</div>
                          <input value={custPhone} onChange={e => setCustPhone(formatPhone(e.target.value))}
                            placeholder="010-1234-5678" inputMode="numeric"
                            className="w-full rounded-lg px-3 py-2 text-[14px] outline-none"
                            style={{ background: '#0d0d1a', border: '1px solid #252545', color: '#e8e4ff' }} />
                        </div>

                        <button onClick={() => reserve(c)} disabled={booking}
                          className="w-full py-[13px] rounded-xl text-[14px] font-bold"
                          style={{ background: booking ? '#2a2a3a' : 'linear-gradient(135deg,#3C3489,#FAC775)',
                            color: booking ? '#888' : '#1a1a18' }}>
                          {booking ? '예약 중...' : '이 시간으로 상담 예약하기'}
                        </button>
                        <div className="text-[11px] text-center mt-2" style={{ color: '#666688' }}>
                          예약 후 상담 시간에 마이페이지에서 채팅방으로 입장해요.
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div style={{ padding: '20px 16px 10px', textAlign: 'center' }}>
        <button onClick={() => router.back()}
          style={{ fontSize:'13px', padding:'12px 24px', borderRadius:'20px',
            background:'rgba(60,52,137,0.2)', color:'#9977cc',
            border:'1px solid rgba(119,102,221,0.3)', cursor:'pointer' }}>
          ← AI 채팅으로 돌아가기
        </button>
      </div>
    </main>
  )
}

export default function ConsultantSelectPage() {
  return (
    <Suspense>
      <ConsultantSelectInner />
    </Suspense>
  )
}
