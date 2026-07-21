'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Props = {
  priceKey: string                  // consult_prices의 price_key (예: 'saju')
  mode?: string                     // 상담사 선택 화면 상단 라벨용 (couple/personal 등)
  searchParams?: URLSearchParams    // 생년월일 등 기존 파라미터 이어넘기기 (선택)
  /**
   * ★상담사에게 넘길 자료 (2026-07-21 추가)
   *
   * [왜 필요한가]
   *   상담 신청 화면(consultant-select)은 sessionStorage 에서 자료를 꺼내
   *   consultations / couples 테이블에 저장한다.
   *   그런데 이 버튼은 URL 파라미터만 넘기고 자료를 담지 않아,
   *   궁합·사주로 신청하면 상담사 화면에 "조회한 풀이가 없습니다"만 떴다.
   *   (물상도·작명·택일은 각 화면에서 직접 담고 있어 정상이었다)
   *
   * [쓰는 법] 상담 버튼을 놓는 화면에서 지금 화면의 결과를 넘긴다.
   *   <ConsultButton priceKey="saju" payload={{ aiAnalysis: tongText }} />
   */
  payload?: () => ConsultPayload | null
}

export interface ConsultPayload {
  /** 유료(상세) 풀이 — 고객이 본 그대로 */
  aiAnalysis?: string
  /** 무료(기본) 풀이 — 고객이 본 그대로 */
  aiFreeAnalysis?: string
  /** 궁합이면 couples 테이블에 넣을 한 벌 */
  coupleFull?: {
    person_a_birth?: Record<string, string> | null
    person_b_birth?: Record<string, string> | null
    mode?: string
    result?: unknown
  }
}

export default function ConsultButton({ priceKey, mode, searchParams, payload }: Props) {
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
    // ★이동 직전에 지금 화면의 결과를 세션에 담는다.
    //   (물상도 goConsult() 와 같은 방식. consultant-select 가 이걸 꺼내 저장한다)
    try {
      const p = payload?.()
      if (p) {
        if (p.aiAnalysis) sessionStorage.setItem('ai_analysis', p.aiAnalysis)
        if (p.aiFreeAnalysis) sessionStorage.setItem('ai_free_analysis', p.aiFreeAnalysis)
        if (p.coupleFull) sessionStorage.setItem('couple_full', JSON.stringify(p.coupleFull))
      }
    } catch {
      // 세션 저장 실패는 상담 신청 자체를 막지 않는다.
      //   (자료가 안 넘어갈 뿐, 예약은 정상 진행되어야 한다)
    }
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
