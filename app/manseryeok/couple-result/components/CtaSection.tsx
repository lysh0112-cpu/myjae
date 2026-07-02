'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// mode → 가격표 price_key 매핑
const MODE_TO_KEY: Record<string, string> = {
  couple: 'couple',
  prewedding: 'prewedding',
  married: 'married',
  birth: 'birth',
}

export default function CtaSection({ commonMsg, mode = 'couple' }: { commonMsg: string; mode?: string }) {
  const router = useRouter()
  const [price, setPrice] = useState<number | null>(null)
  const [active, setActive] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const priceKey = MODE_TO_KEY[mode] || 'couple'

  useEffect(() => {
    supabase
      .from('consult_prices')
      .select('price, active')
      .eq('price_key', priceKey)
      .maybeSingle()
      .then(({ data }) => {
        if (data) { setPrice(data.price); setActive(data.active) }
        setLoaded(true)
      })
  }, [priceKey])

  function goConsult() {
    const params = new URLSearchParams()
    params.set('mode', mode)
    params.set('priceKey', priceKey)
    router.push(`/manseryeok/consultant-select?${params.toString()}`)
  }

  return (
    <div style={{ background: '#13132a', borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ borderLeft: '2px solid #7F77DD', padding: '8px 12px', fontSize: '11px', color: '#8888cc', fontStyle: 'italic', lineHeight: '1.6', marginBottom: '16px' }}>
        "{commonMsg}"
      </div>

      {/* 노출이 켜진 상담일 때만 상담 버튼 표시 */}
      {loaded && active && (
        <button
          onClick={goConsult}
          style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'linear-gradient(135deg, #5544bb, #7766dd)', border: 'none', color: '#e8e4ff', fontSize: '14px', fontWeight: '500', cursor: 'pointer', marginBottom: '16px' }}>
          전문가와 상담하기{price != null && <span style={{ opacity: 0.85 }}> · {price.toLocaleString()}원</span>} →
        </button>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <button
          onClick={() => {
            if (navigator.share) {
              navigator.share({ title: '명카페 궁합 결과', text: '우리 궁합 결과 확인해봐!', url: window.location.href })
            }
          }}
          style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8888cc', fontSize: '12px', cursor: 'pointer' }}>
          📤 결과 공유하기
        </button>
        <button
          onClick={() => router.push('/manseryeok/couple-input')}
          style={{ padding: '10px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: '#8888cc', fontSize: '12px', cursor: 'pointer' }}>
          🔄 다시 분석하기
        </button>
      </div>
    </div>
  )
}
