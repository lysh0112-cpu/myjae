'use client'
import { useRouter } from 'next/navigation'

interface PageHeaderProps {
  title: string
  subtitle?: string
  onBack?: () => void
  showHome?: boolean
  rightButton?: React.ReactNode
}

export default function PageHeader({
  title,
  subtitle,
  onBack,
  showHome = true,
  rightButton,
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else {
      router.back()
    }
  }

  return (
    <div style={{
      padding: '14px 20px',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
      position: 'sticky',
      top: 0,
      background: '#0d0d1a',
      zIndex: 10,
    }}>
      {/* 뒤로가기 */}
      <button onClick={handleBack}
        style={{ fontSize: '20px', color: '#9d8cff', background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
        ‹
      </button>

      {/* 제목 */}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '15px', fontWeight: '500', color: '#e8e4ff' }}>{title}</div>
        {subtitle && (
          <div style={{ fontSize: '10px', color: '#9d8cff', fontStyle: 'italic' }}>{subtitle}</div>
        )}
      </div>

      {/* 홈 버튼 */}
      {showHome && (
        <button onClick={() => router.push('/')}
          style={{ fontSize: '18px', color: '#9d8cff', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', flexShrink: 0 }}>
          🏠
        </button>
      )}

      {/* 우측 커스텀 버튼 */}
      {rightButton && (
        <div style={{ flexShrink: 0 }}>
          {rightButton}
        </div>
      )}
    </div>
  )
}
