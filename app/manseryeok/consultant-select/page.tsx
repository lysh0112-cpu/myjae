'use client'
import { Suspense, useEffect, useState } from 'react'
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

function ConsultantSelectInner() {
  const params = useSearchParams()
  const router = useRouter()
  const mode  = params.get('mode')  || 'couple'
  const score = params.get('score') || ''
  const names = params.get('names') || ''
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('consultants')
        .select('id, name, specialty, photo_url, career, intro, rating, review_count, review_text, region')
        .eq('active', true)
        .order('created_at')
      setConsultants((data ?? []) as Consultant[])
      setLoading(false)
    }
    load()
  }, [])

  const modeLabel: Record<string, string> = {
    couple: '💑 연인 궁합',
    prewedding: '💍 예비 신혼',
    married: '👫 부부 상담',
    birth: '👶 출산 시기',
    personal: '🔮 개인 상담',
  }

  // 상담사 선택 → 시간 선택 화면으로 (결제는 이미 했다고 가정하고 뒤 단계에서 처리)
  function pick(c: Consultant) {
    router.push(`/manseryeok/consulting?consultantId=${c.id}&consultantName=${encodeURIComponent(c.name)}&mode=${mode}`)
  }

  return (
    <main className="min-h-screen bg-[#0d0d1a] pb-10">
      {/* 헤더 */}
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
          {modeLabel[mode] || '👫 부부 상담'}
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
            return (
              <div key={c.id} className="mb-2 rounded-2xl overflow-hidden"
                style={{ border: '1px solid #252545', background: open ? '#13132a' : '#0f0f22' }}>
                {/* 한 줄 (누르면 펼침) */}
                <button onClick={() => setOpenId(open ? null : c.id)}
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
                  </div>
                  {c.rating ? (
                    <span className="text-[12px] text-[#e0b060] flex-shrink-0">★ {c.rating}</span>
                  ) : null}
                  <span className="text-[#7766bb] text-lg flex-shrink-0">{open ? '⌃' : '⌄'}</span>
                </button>

                {/* 펼친 상세 */}
                {open && (
                  <div className="px-4 pb-4">
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

                    <button onClick={() => pick(c)}
                      className="w-full py-[13px] rounded-xl text-[14px] font-medium"
                      style={{ background: '#3d2a88', color: '#c8b0ff' }}>
                      이 선생님으로 시간 고르기
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 하단 — AI 채팅으로 돌아가기 */}
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
