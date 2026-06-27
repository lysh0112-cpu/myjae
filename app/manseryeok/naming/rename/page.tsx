'use client'
import { useRouter } from 'next/navigation'

const GOLD = '#FAC775'
const CARD = '#2C2C2A'
const SUB = '#8a88a0'

const OPTIONS = [
  {
    group: '발음은 그대로, 한자만 바꾸기',
    groupIcon: 'Aa',
    items: [
      { kind: 'hanja1', label: '한 글자만 바꾸기', desc: "'오연희' 그대로 · 한 글자 한자만", price: 3000 },
      { kind: 'hanja2', label: '두 글자 바꾸기', desc: "'오연희' 그대로 · 두 글자 한자", price: 5000 },
    ],
  },
  {
    group: '새 이름을 직접 정하기',
    groupIcon: '✎',
    items: [
      { kind: 'newname', label: '새 이름 직접 정하기', desc: '원하는 한글 이름 → 맞는 한자 추천', price: 5000 },
    ],
  },
  {
    group: '이름까지 통째로 추천받기',
    groupIcon: '✨',
    items: [
      { kind: 'auto5', label: '추천 이름 5개 받기', desc: '사주에 맞는 이름 5개 추천', price: 10000 },
      { kind: 'auto10', label: '추천 이름 10개 받기', desc: '사주에 맞는 이름 10개 추천', price: 20000 },
    ],
  },
]

export default function RenameMethodPage() {
  const router = useRouter()

  const choose = (kind: string, price: number, label: string) => {
    const q = new URLSearchParams({ kind, price: String(price), label })
    router.push(`/manseryeok/naming/pay?${q.toString()}`)
  }

  return (
    <main style={{ minHeight: '100vh', background: '#1f1e1c', maxWidth: 480, margin: '0 auto', padding: '8px 16px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 4px 16px' }}>
        <button onClick={() => router.back()} style={{ background: 'none', border: 'none', color: GOLD, fontSize: 20, cursor: 'pointer' }}>{'\u2039'}</button>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>어떻게 바꿀까요?</span>
      </div>
      <p style={{ fontSize: 12, color: SUB, margin: '0 0 14px', padding: '0 4px' }}>
        바꾸는 방식과 글자 수에 따라 비용이 달라집니다
      </p>

      {OPTIONS.map((g) => (
        <div key={g.group}>
          <div style={{ fontSize: 11, color: SUB, margin: '16px 0 8px', padding: '0 4px', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 14 }}>{g.groupIcon}</span> {g.group}
          </div>
          {g.items.map((it) => (
            <button
              key={it.kind}
              onClick={() => choose(it.kind, it.price, it.label)}
              className="active:scale-95"
              style={{
                width: '100%', textAlign: 'left', background: CARD,
                border: '1px solid rgba(250,199,117,0.18)', borderRadius: 16,
                padding: '14px 16px', marginBottom: 10, cursor: 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
                transition: 'transform 0.15s ease',
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{it.label}</span>
                <span style={{ fontSize: 12, color: SUB }}>{it.desc}</span>
              </span>
              <span style={{ fontSize: 15, fontWeight: 700, color: GOLD, whiteSpace: 'nowrap' }}>
                {it.price.toLocaleString()}원
              </span>
            </button>
          ))}
        </div>
      ))}
    </main>
  )
}
