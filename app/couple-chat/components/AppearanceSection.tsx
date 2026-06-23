'use client'
import { useRef } from 'react'

const BACKGROUNDS = [
  { id: 'star', label: '별빛', color: '#0d0d1a' },
  { id: 'cherry', label: '벚꽃', color: '#2a1020' },
  { id: 'sunset', label: '노을', color: '#1a0d05' },
]
const FONTS = ['기본체', '손글씨체', '귀여운체', '고딕체']
const FONT_SIZES = ['작게', '보통', '크게']
const FONT_WEIGHTS = ['얇게', '보통', '굵게']

interface Props {
  bg: string
  font: string
  fontSize: string
  fontWeight: string
  bgImage: string
  onBgChange: (v: string) => void
  onFontChange: (v: string) => void
  onFontSizeChange: (v: string) => void
  onFontWeightChange: (v: string) => void
  onBgImageChange: (v: string) => void
}

export default function AppearanceSection({
  bg, font, fontSize, fontWeight, bgImage,
  onBgChange, onFontChange, onFontSizeChange, onFontWeightChange, onBgImageChange
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onBgImageChange(reader.result as string)
      onBgChange('upload')
    }
    reader.readAsDataURL(file)
  }

  const OptionRow = ({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) => (
    <div style={{ marginBottom: '10px' }}>
      <div style={{ fontSize: '11px', color: '#8888cc', marginBottom: '5px' }}>{label}</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {options.map(o => (
          <div key={o} onClick={() => onChange(o)}
            style={{ flex: 1, padding: '7px', borderRadius: '8px', textAlign: 'center', fontSize: '11px', cursor: 'pointer', border: value === o ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)', background: value === o ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)', color: value === o ? '#c8b0ff' : '#8888cc' }}>
            {o}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '8px' }}>🎨 화면 설정</div>

      {/* 배경 테마 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: '#8888cc', marginBottom: '5px' }}>배경 테마</div>
        <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
          {BACKGROUNDS.map(b => (
            <div key={b.id} onClick={() => { onBgChange(b.id); onBgImageChange('') }}
              style={{ flex: 1, padding: '7px', borderRadius: '8px', textAlign: 'center', fontSize: '11px', cursor: 'pointer', border: bg === b.id ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)', background: bg === b.id ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)', color: bg === b.id ? '#c8b0ff' : '#8888cc' }}>
              {b.label}
            </div>
          ))}
        </div>
        <div onClick={() => fileRef.current?.click()}
          style={{ padding: '8px', borderRadius: '8px', textAlign: 'center', fontSize: '11px', cursor: 'pointer', border: bg === 'upload' ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)', background: bg === 'upload' ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)', color: bg === 'upload' ? '#c8b0ff' : '#8888cc' }}>
          📷 직접 업로드 {bgImage && bg === 'upload' ? '(적용됨 ✓)' : ''}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      </div>

      {/* 글씨 설정 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ fontSize: '11px', color: '#8888cc', marginBottom: '5px' }}>글씨체</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
          {FONTS.map(f => (
            <div key={f} onClick={() => onFontChange(f)}
              style={{ padding: '7px', borderRadius: '8px', textAlign: 'center', fontSize: '11px', cursor: 'pointer', border: font === f ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)', background: font === f ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)', color: font === f ? '#c8b0ff' : '#8888cc' }}>
              {f}
            </div>
          ))}
        </div>
      </div>

      <OptionRow label="글씨 크기" options={FONT_SIZES} value={fontSize} onChange={onFontSizeChange} />
      <OptionRow label="글씨 두께" options={FONT_WEIGHTS} value={fontWeight} onChange={onFontWeightChange} />
    </div>
  )
}
