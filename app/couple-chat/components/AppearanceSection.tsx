'use client'
import { useRef } from 'react'

const BG_COLORS = [
  { id: 'navy',      label: '딥 네이비 (기본)', color: '#0d0d1a' },
  { id: 'teal',      label: '트랜스포머티브 틸', color: '#1D6B6B' },
  { id: 'cloud',     label: '클라우드 댄서',     color: '#F0EDE8' },
  { id: 'icy',       label: '아이시 블루',        color: '#C8DFF0' },
  { id: 'dark',      label: '쿨링 다크',          color: '#0D1B2A' },
  { id: 'terra',     label: '테라코타',           color: '#C4622D' },
  { id: 'caramel',   label: '카라멜',             color: '#C68642' },
  { id: 'olive',     label: '올리브 그린',         color: '#5C6B3A' },
  { id: 'lavender',  label: '라벤더 미스트',       color: '#C9B8E8' },
  { id: 'rose',      label: '로즈 덤',            color: '#E8C4C4' },
]

const FONTS = [
  { id: 'pretendard', label: '프리텐다드 (기본)',   css: "'Pretendard', sans-serif" },
  { id: 'noto',       label: 'Noto Sans KR',       css: "'Noto Sans KR', sans-serif" },
  { id: 'nanumgothic',label: '나눔고딕',            css: "'Nanum Gothic', sans-serif" },
  { id: 'spoqa',      label: 'Spoqa Han Sans',      css: "'Spoqa Han Sans Neo', sans-serif" },
  { id: 'doHyeon',    label: '배민 도현체',          css: "'Do Hyeon', sans-serif" },
  { id: 'kyobo',      label: '교보손글씨체',         css: "'KyoboHandwriting', cursive" },
  { id: 'cafe24',     label: '카페24 써라운드',      css: "'Cafe24Ssurround', sans-serif" },
  { id: 'notoserifkr',label: 'Noto Serif KR',       css: "'Noto Serif KR', serif" },
]

interface Props {
  bgColor: string
  bgImage: string
  font: string
  fontSize: number
  fontWeight: number
  onBgColorChange: (v: string) => void
  onBgImageChange: (v: string) => void
  onFontChange: (v: string) => void
  onFontSizeChange: (v: number) => void
  onFontWeightChange: (v: number) => void
}

export default function AppearanceSection({
  bgColor, bgImage, font, fontSize, fontWeight,
  onBgColorChange, onBgImageChange, onFontChange, onFontSizeChange, onFontWeightChange
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null)

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      onBgImageChange(reader.result as string)
      onBgColorChange('upload')
    }
    reader.readAsDataURL(file)
  }

  const selectedBg = BG_COLORS.find(b => b.id === bgColor)
  const selectedFont = FONTS.find(f => f.id === font)

  const row: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px'
  }
  const lbl: React.CSSProperties = {
    fontSize: '11px', color: '#6666aa', marginBottom: '5px'
  }
  const selectBox: React.CSSProperties = {
    width: '100%', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '8px 12px', color: '#e8e4ff',
    fontSize: '12px', outline: 'none', cursor: 'pointer',
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '10px' }}>🎨 화면 설정</div>

      {/* 배경 색상 드롭박스 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={lbl}>배경 색상</div>
        <div style={{ position: 'relative' }}>
          <select value={bgColor} onChange={e => { onBgColorChange(e.target.value); onBgImageChange('') }}
            style={{ ...selectBox, appearance: 'none', paddingRight: '32px' }}>
            {BG_COLORS.map(b => (
              <option key={b.id} value={b.id}>{b.label}</option>
            ))}
            <option value="upload">사진 업로드</option>
          </select>
          <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '6px', pointerEvents: 'none' }}>
            {selectedBg && (
              <div style={{ width: '14px', height: '14px', borderRadius: '50%', background: selectedBg.color, border: '1px solid rgba(255,255,255,0.2)' }} />
            )}
            <span style={{ fontSize: '10px', color: '#6666aa' }}>▼</span>
          </div>
        </div>

        {/* 컬러 팔레트 미리보기 */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
          {BG_COLORS.map(b => (
            <div key={b.id} onClick={() => { onBgColorChange(b.id); onBgImageChange('') }}
              style={{ width: '22px', height: '22px', borderRadius: '50%', background: b.color, cursor: 'pointer', border: bgColor === b.id ? '2px solid #c8b0ff' : '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
          ))}
        </div>
      </div>

      {/* 사진 업로드 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={lbl}>배경 이미지</div>
        <div onClick={() => fileRef.current?.click()}
          style={{ ...selectBox, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: bgImage ? '#c8b0ff' : '#444466' }}>
            {bgImage ? '이미지 적용됨 ✓' : '사진 업로드'}
          </span>
          <span style={{ fontSize: '14px' }}>📷</span>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
        {bgImage && (
          <div onClick={() => { onBgImageChange(''); onBgColorChange('navy') }}
            style={{ fontSize: '10px', color: '#ff8888', marginTop: '4px', cursor: 'pointer' }}>
            ✕ 이미지 제거
          </div>
        )}
      </div>

      {/* 글씨체 드롭박스 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={lbl}>글씨체</div>
        <select value={font} onChange={e => onFontChange(e.target.value)}
          style={{ ...selectBox, appearance: 'none' }}>
          {FONTS.map(f => (
            <option key={f.id} value={f.id}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* 글씨 크기 슬라이더 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ ...lbl, display: 'flex', justifyContent: 'space-between' }}>
          <span>글씨 크기</span>
          <span style={{ color: '#c8b0ff' }}>{fontSize}px</span>
        </div>
        <div style={row}>
          <span style={{ fontSize: '10px', color: '#444466' }}>작게</span>
          <input type="range" min={10} max={20} step={1} value={fontSize}
            onChange={e => onFontSizeChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#7F77DD' }} />
          <span style={{ fontSize: '10px', color: '#444466' }}>크게</span>
        </div>
      </div>

      {/* 글씨 두께 슬라이더 */}
      <div style={{ marginBottom: '4px' }}>
        <div style={{ ...lbl, display: 'flex', justifyContent: 'space-between' }}>
          <span>글씨 두께</span>
          <span style={{ color: '#c8b0ff' }}>{fontWeight}</span>
        </div>
        <div style={row}>
          <span style={{ fontSize: '10px', color: '#444466' }}>얇게</span>
          <input type="range" min={100} max={800} step={100} value={fontWeight}
            onChange={e => onFontWeightChange(Number(e.target.value))}
            style={{ flex: 1, accentColor: '#7F77DD' }} />
          <span style={{ fontSize: '10px', color: '#444466' }}>굵게</span>
        </div>
      </div>
    </div>
  )
}
