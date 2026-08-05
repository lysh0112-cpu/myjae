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
  /**
   * ★2026-08-05 (47부 6차) — 물상도(내사주그림) 한 벌
   *   [왜 더했나]  물상은 여태 «따로 만든» 버튼으로 갔고, 그 안에서 mulsang_full 을
   *     직접 세션에 담았습니다. 공용 부품으로 바꾸면서 이 자리가 없으면
   *     ★그림과 해설이 상담사에게 «안 넘어갑니다».
   *   ⚠️ consultant-select 가 읽는 세션 키는 ★여섯입니다 —
   *      ai_analysis · ai_free_analysis · couple_full · mulsang_full · naming_full · birth_full
   *      이 부품이 담아 주는 것은 ★넷. naming_full·birth_full 은 그 화면들이
   *      «스스로» 담고 나서 이 부품을 부릅니다. 그대로 두었습니다.
   */
  mulsangFull?: {
    image_url?: string | null
    prompt?: string
    style?: string
    commentary?: string | null
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
        if (p.mulsangFull) sessionStorage.setItem('mulsang_full', JSON.stringify(p.mulsangFull))
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

  // ══════════════════════════════════════════════════════════════════════
  // ★2026-08-05 (47부 5차) — 문구와 배색 [대표님 확정]
  //
  //   [무엇이 문제였나]  대표님 — 「내용이 중복이 되는 내용이야」
  //     같은 말이 ★세 겹이었습니다 —
  //       제목  「전문가와 상담하기」
  //       설명  「AI 분석이 더 궁금하신가요? 전문 상담사와 1:1 상담을 받아보세요」
  //       버튼  「전문가와 상담하기 · 50,000원」   ← ★제목과 «똑같았습니다»
  //     ⚠️ 설명글은 뜻도 어긋났습니다 — 손님은 «방금 풀이를 다 읽고» 내려온 자리입니다.
  //        물어야 할 것은 「궁금한가」가 아니라 「이것만으로 «부족» 한가」입니다.
  //
  //   [무엇을 골랐나]  ★목업 넷을 보시고 ⓑ 로 확정하셨습니다.
  //     제목은 두고 «버튼 문구» 를 바꿉니다. 누르면 무슨 일이 나는지 또렷해집니다.
  //     ⚠️ 「AI」라는 말을 ★뺐습니다. 이 부품은 궁합·작명·출산택일도 함께 쓰는데
  //        「이 풀이」라고 하면 어느 화면에서나 맞습니다.
  //
  //   [배색]  대표님 — 「고객들이 보는 화면의 색상들과 통일감있게」
  //     ★색을 새로 짓지 않았습니다. 손님 화면이 «이미 쓰는» 값입니다.
  //       카드 바탕  #2C2C2A → #FFFBF7   (마이페이지 카드와 같음)
  //       카드 선    주황15% → #9c7a58   3.67:1  (45부 확정)
  //       제목       #ffffff → #3a2e28  12.74:1
  //       설명       #8a88a0 → #7d6a5b   ★4.99:1  ← 전에는 4.07:1 «미달» 이었습니다
  //       버튼       #FAC775+검정 → #96502e+흰글자
  //
  //   ★2026-08-05 (47부 10차) — 버튼 색을 ★#b46e46 으로 바꿨습니다. [대표님 확정]
  //     [대표님]  「이 화면의 것들과 같은 색상으로 하라는 거야 · 모두 통일되게」
  //     [겪은 일]  #96502e 로 뒀더니 물상 화면에서 「색상이 이상하다」 하셨습니다.
  //       재 보니 그 화면의 「카드로 저장」·「다시 그리기」가 ★#b46e46 이라
  //       비슷하면서 «미묘하게 다른» 갈색 둘이 나란히 놓여 잘못 칠한 것처럼 보였습니다.
  //
  //     ⚠️ 제가 한때 「화면마다 브랜드색이 다르다(진로 보라·궁합 분홍·작명 초록)」고
  //        말씀드렸는데 ★틀렸습니다. 그건 «홈 카드» 색이었습니다.
  //        ★결과 화면의 꽉 찬 버튼은 실제로 «두 색» 뿐입니다 —
  //          #b46e46  물상(10) · 궁합(2) · 사주(2)
  //          #c8783c  이름정밀분석(3) · 작명(1)
  //        ⇒ 그래서 «색 하나» 로 통일할 수 있었고, 공용 부품을 지킬 수 있었습니다.
  //
  //   🔴🔴 ★알고 쓰는 «미달» 입니다 — 잊지 마십시오
  //     #b46e46 + 흰 글자 = ★3.99:1  (기준 4.5 «미달»)
  //     ⇒ ★이 화면들의 버튼이 «원래부터» 미달이었습니다. 45부 대비 손질에서 빠진 자리입니다.
  //     ⇒ 대표님이 「통일」을 우선하기로 ★알고 고르셨습니다. 제 실수가 아닙니다.
  //     ⚠️ 눈에 거의 같으면서 4.94:1 을 넘기는 값도 재 두었습니다 → ★#9f613e
  //        나중에 #b46e46 버튼들을 «통째로» 올리실 때 이 값을 쓰시면 됩니다.
  //        ⇒ 그때는 ★이 부품과 각 화면 버튼을 «함께» 바꾸십시오. 하나만 하면 또 어긋납니다.
  //     ⛔ 이 부품만 혼자 다른 색으로 바꾸지 마십시오. 통일이 깨집니다.
  //
  //   ⚠️⚠️ 버튼을 ★#c8783c 로 바꾸지 마십시오.
  //     작명·AiTalkFab 이 쓰는 색이라 «통일감» 은 더 좋지만
  //     흰 글자와 ★3.38:1 로 기준(4.5) «미달» 입니다. 재서 확인했습니다.
  //     ⇒ 50,000원을 결제하는 버튼이라 또렷해야 합니다.
  //     ⚠️ 이 판단은 ★아래 47부 10차에 «거두었습니다». 지금 색은 #b46e46 입니다.
  //     ⇒ 나중에 손님 화면 주 버튼 색을 «통째로» 올릴 때 이 자리도 함께 보십시오.
  //
  //   ⚠️ 이 부품을 쓰는 화면은 «다섯» 입니다 — 여기를 고치면 다섯 곳이 함께 바뀝니다.
  //      사주(result-new) · 궁합 · 출산택일 결과 · 작명진단 · 개명결과
  //   ⚠️ 물상(mulsang/page.tsx:1070)에는 ★따로 만든 상담 버튼이 있습니다.
  //      지금 false && 로 «꺼져» 있어 안 건드렸습니다. 되살리실 때 이 부품으로 바꾸십시오.
  // ══════════════════════════════════════════════════════════════════════
  return (
    // ★2026-08-05 (47부 17차) — 위아래 여백을 ★«부품 안» 에서 잡습니다. [대표님 지시]
    //   [무엇이 문제였나]  부르는 쪽 «열두 곳» 이 각자 여백을 정하고 있었습니다 —
    //     8 · 10 · 12 · 16 · 18 · ★«없음» (작명 둘)
    //     ⇒ 화면마다 카드가 뜨는 자리가 달랐고, 작명 둘은 ★위 버튼과 «붙어» 있었습니다.
    //   [고침]  marginTop 16 · marginBottom 16 을 여기서 줍니다.
    //     ⇒ 앞으로 어디에 붙여도 ★저절로 맞습니다. 부르는 쪽은 여백을 «안 줘도» 됩니다.
    //   ⚠️ 11차에 버튼 «높이» 를 부품 안에서 잡은 것과 «같은 결» 입니다.
    //   ⛔ 부르는 쪽에서 다시 marginTop 을 주지 마십시오. ★두 겹으로 벌어집니다.
    <div className="rounded-2xl p-5"
      style={{ background: '#FFFBF7', border: '0.5px solid #9c7a58', marginTop: 16, marginBottom: 16 }}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg" aria-hidden="true">🔮</span>
        <h2 className="text-base font-bold" style={{ color: '#3a2e28' }}>전문가와 상담하기</h2>
      </div>
      <p className="text-xs mb-4" style={{ color: '#7d6a5b', lineHeight: 1.7 }}>
        이 풀이로 못 다한 이야기, 상담사가 1:1로 짚어 드려요
      </p>
      <button onClick={go}
        className="w-full py-3.5 rounded-xl font-bold flex items-center justify-center gap-2"
        style={{ background: '#b46e46', color: '#fff', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
        상담 신청하기
        {price != null && <span style={{ opacity: 0.85 }}>· {price.toLocaleString()}원</span>}
      </button>
    </div>
  )
}
