'use client'
import { useRouter } from 'next/navigation'

interface Props {
  onSettingsOpen: () => void
}

export default function ChatHeader({ onSettingsOpen }: Props) {
  const router = useRouter()

  return (
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', alignItems: 'center', gap: '10px',
      position: 'sticky', top: 0, background: '#0d0d1a', zIndex: 10
    }}>
      <button onClick={() => router.back()}
        style={{ fontSize: '20px', color: '#9d8cff', background: 'none', border: 'none', cursor: 'pointer', flexShrink: 0 }}>
        ‹
      </button>
      <div style={{ display: 'flex' }}>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#2d2060', color: '#c8b0ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '500', zIndex: 2, border: '2px solid #0d0d1a' }}>나</div>
        <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#3d1040', color: '#f48fb1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '500', marginLeft: '-8px', border: '2px solid #0d0d1a' }}>상</div>
      </div>
      <div>
        <div style={{ fontSize: '14px', fontWeight: '500', color: '#e8e4ff' }}>우리만의 공간 🔒</div>
        <div style={{ fontSize: '10px', color: '#6666aa' }}>커플 전용 비밀 채팅방</div>
      </div>
      <button onClick={() => router.push('/')}
        style={{ marginLeft: 'auto', fontSize: '11px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(255,255,255,0.05)', color: '#8888cc', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}>
        홈
      </button>
      <button onClick={onSettingsOpen}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6666aa', fontSize: '20px' }}>
        ⚙️
      </button>
    </div>
  )
}
