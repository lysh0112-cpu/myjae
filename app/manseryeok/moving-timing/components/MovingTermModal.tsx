'use client'
// app/manseryeok/moving-timing/components/MovingTermModal.tsx
//
// 용어 설명 모달 — 결혼택일 WeddingTermModal 과 같은 구조.
// 문안은 movingFilterV1.HELP_TEXT 에 모아 두었다.

import { HELP_TEXT } from '../lib/movingFilterV1'

const C = {
  card: '#FFFBF7', line: '#EDE3D5', ink: '#3A3228',
  sub: '#9A8060', brand: '#7A6440',
}

interface Props {
  termKey: string | null
  onClose: () => void
}

export default function MovingTermModal({ termKey, onClose }: Props) {
  if (!termKey) return null
  const t = HELP_TEXT[termKey]
  if (!t) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(40,32,24,.45)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        zIndex: 60,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card, width: '100%', maxWidth: 480,
          borderRadius: '18px 18px 0 0', padding: '22px 20px 30px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, marginBottom: 12 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: C.ink, letterSpacing: '-.3px' }}>
            {t.title}
          </span>
          <span style={{ fontSize: 12, color: '#C0AC90' }}>{t.hanja}</span>
        </div>

        <div style={{
          fontSize: 13.5, color: C.sub, lineHeight: 1.85, whiteSpace: 'pre-line',
        }}>
          {t.body}
        </div>

        <button
          onClick={onClose}
          style={{
            width: '100%', marginTop: 20, padding: '13px 0',
            background: C.brand, color: '#fff', border: 'none', borderRadius: 11,
            fontSize: 14.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          알겠어요
        </button>
      </div>
    </div>
  )
}
