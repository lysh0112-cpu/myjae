'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'

const NEXT_ROUTE = {
  hanja1: '/manseryeok/naming/rename/hanja?count=1',
  hanja2: '/manseryeok/naming/rename/hanja?count=2',
  newname: '/manseryeok/naming/rename/newname',
  auto5: '/manseryeok/naming/rename/auto?n=5',
  auto10: '/manseryeok/naming/rename/auto?n=10',
}

function PayInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const kind = sp.get('kind') || 'hanja1'
  const price = Number(sp.get('price') || 0)
  const label = sp.get('label') || '개명 서비스'

  const proceed = () => {
    router.push(NEXT_ROUTE[kind] || '/manseryeok/naming')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>결제</span>
      </div>

      <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.15)', borderRadius: 16, padding: '16px' }}>
        <div style={{ fontSize: 12, color: SUB, marginBottom: 6 }}>선택한 서비스</div>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 14 }}>{label}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 12, borderTop: '1px solid rgba(250,199,117,0.15)' }}>
          <span style={{ fontSize: 13, color: SUB }}>결제 금액</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: GOLD }}>{price.toLocaleString()}원</span>
        </div>
      </div>

      <div style={{ border: '1px dashed rgba(250,199,117,0.4)', borderRadius: 14, padding: 24, textAlign: 'center', margin: '14px 0' }}>
        <div style={{ fontSize: 13, color: SUB }}>결제 시스템 첨부 예정</div>
        <div style={{ fontSize: 11, color: SUB, marginTop: 6 }}>(토스페이먼츠 연동 자리 · 지금은 통과)</div>
      </div>

      <button
        onClick={proceed}
        className="active:scale-95"
        style={{ width: '100%', background: 'rgba(250,199,117,0.16)', border: '1px solid ' + GOLD, borderRadius: 14, padding: 15, color: GOLD, fontWeight: 700, fontSize: 15, cursor: 'pointer' }}
      >
        {price.toLocaleString()}원 결제하고 진행 {'\u2192'}
      </button>
    </main>
  )
}

export default function PayPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <PayInner />
    </Suspense>
  )
}
