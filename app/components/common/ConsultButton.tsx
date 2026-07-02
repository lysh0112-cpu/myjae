'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  priceKey: string                  // consult_prices의 price_key (예: 'saju')
  mode?: string                     // 상담사 선택 화면 상단 라벨용 (couple/personal 등)
  searchParams?: URLSearchParams    // 생년월일 등 기존 파라미터 이어넘기기 (선택)
}

export default function ConsultButton({ priceKey, mode, searchParams }: Props) {
  const router = useRouter()
  const [price, setPrice] = useState<number | null>(null)
  const [active, setActive] = useState<boolean>(false)
  const [loaded, setLoaded] = useState(false)

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

  // 아직 로딩 전이거나, 노출이 꺼진 상담이면 버튼 자체를 숨김
  if (!loaded || !active) return null

  function go() {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : '')
    if (mode) params.set('mode', mode)
    params.set('priceKey', priceKey)
    router.push(`/manseryeok/consultant-select?${params.toString()}`)
  }

  return (
    <div className="rounded-2xl p-5" style={{ background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.15)' }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔮</span>
        <h2 className="text-base font-bold text-white">전문가와 상담하기</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: '#8a88a0' }}>
        AI 분석이 더 궁금하신가요? 전문 상담사와 1:1 상담을 받아보세요
      </p>
      <button onClick={go}
        className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
        style={{ background: '#FAC775', color: '#1a1a18' }}>
        전문가와 상담하기
        {price != null && <span style={{ opacity: 0.8 }}>· {price.toLocaleString()}원</span>}
      </button>
    </div>
  )
}
