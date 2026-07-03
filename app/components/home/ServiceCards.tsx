'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

// name / subTitle 안에 \n 을 넣으면 그 자리에서 줄바꿈된다.
// priceKey = home_prices 테이블의 service_key 와 연결되는 값
const SERVICES = [
  {
    icon: '💕',
    name: '궁합 분석',
    priceKey: 'couple',
    target: '커플·연인용',
    targetStyle: { background: 'rgba(233,30,99,0.18)', color: '#f48fb1' },
    subTitle: '나의 인연,\n어디쯤 오고 있을까?',
    desc: '두 사람 궁합 분석 (외국인 포함 연인·미혼·돌싱)',
    href: '/manseryeok/couple-input',
  },
  {
    icon: '🎨',
    name: '내 사주가\n그림이 된다면?',
    priceKey: 'mulsang',
    target: '국내 유일',
    targetStyle: { background: 'rgba(76,175,80,0.15)', color: '#81c784' },
    desc: '사주 8글자 → 수묵화 풍경화 생성',
    href: '/manseryeok/mulsang',
  },
  {
    icon: '✍️',
    name: '인생이름 풀이/개명',
    priceKey: 'naming',
    target: '나만의이름',
    targetStyle: { background: 'rgba(255,152,0,0.15)', color: '#ffcc80' },
    desc: '사주 조화와 용신에 맞는 이름 분석 및 현대적이고 세련된 개명 서비스',
    href: '/manseryeok/naming',
  },
  {
    icon: '🃏',
    name: '타로 카드 리딩',
    priceKey: 'tarot',
    target: '국내 유일',
    targetStyle: { background: 'rgba(156,39,176,0.18)', color: '#ce93d8' },
    desc: '78장의 카드, 당신에게 건네는 메시지',
    href: '/tarot',
  },
]

type PriceRow = { price: number; show_price: boolean }

export default function ServiceCards() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [prices, setPrices] = useState<Record<string, PriceRow>>({})

  useEffect(() => {
    ;(async () => {
      const { data } = await supabase
        .from('home_prices')
        .select('service_key, price, show_price')
      if (data) {
        const map: Record<string, PriceRow> = {}
        data.forEach((row: any) => {
          map[row.service_key] = { price: row.price, show_price: row.show_price }
        })
        setPrices(map)
      }
    })()
  }, [])

  // 숫자 → "10,000원~" 형식
  const formatPrice = (n: number) => `${n.toLocaleString('ko-KR')}원~`

  return (
    <section className="px-4 py-5">
      <h2 className="text-base font-bold text-white mb-4">핵심 서비스</h2>
      <div className="grid grid-cols-2 gap-3">
        {SERVICES.map((s) => {
          const isHover = hovered === s.name
          const priceInfo = prices[s.priceKey]
          const showPrice = priceInfo && priceInfo.show_price
          return (
            <Link key={s.name} href={s.href}>
              <div
                onMouseEnter={() => setHovered(s.name)}
                onMouseLeave={() => setHovered(null)}
                className="rounded-2xl p-4 h-full active:scale-95"
                style={{
                  background: isHover
                    ? 'linear-gradient(160deg, #34322f 0%, #2C2C2A 100%)'
                    : '#2C2C2A',
                  border: isHover
                    ? '1px solid rgba(250,199,117,0.55)'
                    : '1px solid rgba(250,199,117,0.12)',
                  boxShadow: isHover
                    ? '0 10px 26px rgba(0,0,0,0.45), 0 0 18px rgba(250,199,117,0.18)'
                    : '0 1px 3px rgba(0,0,0,0.25)',
                  transform: isHover ? 'translateY(-4px) scale(1.03)' : 'translateY(0) scale(1)',
                  transition: 'transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease, background 0.25s ease',
                  cursor: 'pointer',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-2xl" style={{ flexShrink: 0 }}>{s.icon}</span>
                  <div className="text-sm font-bold text-white" style={{ whiteSpace: 'pre-line', lineHeight: 1.35 }}>{s.name}</div>
                </div>
                <div
                  className="inline-block px-2 py-0.5 rounded-full font-semibold mb-2"
                  style={{ fontSize: '10px', ...s.targetStyle }}
                >
                  {s.target}
                </div>
                {s.subTitle && (
                  <p style={{
                    color: '#f48fb1',
                    fontSize: '11px',
                    fontStyle: 'italic',
                    fontWeight: 300,
                    marginBottom: '4px',
                    letterSpacing: '0.3px',
                    whiteSpace: 'pre-line',
                    lineHeight: 1.5,
                  }}>
                    {s.subTitle}
                  </p>
                )}
                <p style={{ color: '#8a88a0', fontSize: '11px', lineHeight: '1.5' }}>
                  {s.desc}
                </p>
                {showPrice && (
                  <p style={{ color: '#FAC775', fontSize: '11px', fontWeight: 600, marginTop: '6px' }}>
                    {formatPrice(priceInfo.price)}
                  </p>
                )}
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
