'use client'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'
const GREEN = '#81c784'

function ResultInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const hanja = sp.get('hanja') || '娟'
  const resultName = '吳' + hanja + '嬉'

  const compare = [
    ['용신 보완', '아쉬움', '채움'],
    ['자원오행', '금', '수 (상생)'],
    ['중년운(81수리)', '흉', '길'],
  ]

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
        <button onClick={() => router.push('/manseryeok/naming')} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>개명 후보 결과</span>
      </div>

      <div style={{ textAlign: 'center', margin: '14px 0 18px' }}>
        <div style={{ fontSize: 30, fontWeight: 700, color: '#fff', letterSpacing: 4 }}>{resultName}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>추천 이름</div>
      </div>

      <div style={{ background: 'rgba(129,199,132,0.14)', border: '1px solid rgba(129,199,132,0.45)', borderRadius: 14, padding: 16, textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: GREEN, marginBottom: 4 }}>개선 효과</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: GREEN }}>아쉬움 {'\u2192'} 좋음</div>
      </div>

      <div style={{ fontSize: 11, color: SUB, margin: '0 0 8px' }}>바뀌는 글자</div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
        <div style={{ textAlign: 'center', opacity: 0.55 }}>
          <div style={{ fontSize: 11, color: SUB }}>현재</div>
          <div style={{ fontSize: 26, color: '#fff' }}>妍</div>
        </div>
        <span style={{ color: GOLD, fontSize: 18 }}>{'\u2192'}</span>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: GOLD }}>추천</div>
          <div style={{ fontSize: 26, color: GOLD }}>{hanja}</div>
        </div>
      </div>

      <div style={{ fontSize: 11, color: SUB, margin: '0 0 8px' }}>무엇이 좋아지나</div>
      {compare.map(([k, b, a]) => (
        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', background: CARD, border: '1px solid rgba(250,199,117,0.1)', borderRadius: 12, marginBottom: 7, fontSize: 13, color: '#fff' }}>
          <span>{k}</span>
          <span><span style={{ color: SUB, textDecoration: 'line-through' }}>{b}</span> <span style={{ color: GREEN }}>{'\u2192'} {a}</span></span>
        </div>
      ))}

      <div style={{ fontSize: 11, color: SUB, margin: '14px 0 6px' }}>왜 이 이름이 더 좋은가</div>
      <div style={{ background: CARD, border: '1px solid rgba(250,199,117,0.12)', borderRadius: 16, padding: '14px 16px' }}>
        <p style={{ fontSize: 13, color: '#cfcdc7', lineHeight: 1.7, margin: 0 }}>
          {hanja}는 물의 기운을 품은 한자로, 사주에 부족했던 기운을 채워줍니다. 발음은 '오연희' 그대로 유지되어 부르던 이름은 변하지 않으면서, 한자만으로 사주의 균형이 한결 좋아집니다.
        </p>
      </div>

      <button className="active:scale-95" style={{ marginTop: 16, width: '100%', background: CARD, border: '1px solid rgba(250,199,117,0.2)', borderRadius: 14, padding: 13, color: '#fff', fontSize: 13, cursor: 'pointer' }}>
        다른 후보와 비교하기
      </button>
      <div style={{ border: '1px dashed rgba(250,199,117,0.35)', borderRadius: 14, padding: 14, textAlign: 'center', marginTop: 10, color: SUB, fontSize: 13 }}>
        전문가 상담으로 확정하기 (준비 중)
      </div>
    </main>
  )
}

export default function RenameResultPage() {
  return (
    <Suspense fallback={<div style={{ background: '#1f1e1c', minHeight: '100vh' }} />}>
      <ResultInner />
    </Suspense>
  )
}
