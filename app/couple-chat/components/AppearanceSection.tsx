'use client'
import { useRef } from 'react'

const BG_CATEGORIES = [
  {
    label: '어두운 감성',
    options: [
      { id: 'navy',     label: '🌌 새벽 네이비 — 별빛 가득한 밤하늘', color: '#0d0d1a' },
      { id: 'deeppur',  label: '🔮 딥 퍼플 — 신비로운 우주',           color: '#1a1030' },
      { id: 'cooldark', label: '🖤 쿨링 다크 — 모던하고 차분한',        color: '#0D1B2A' },
      { id: 'midnight', label: '🌃 미드나잇 블랙 — 세련된 다크',        color: '#121212' },
    ]
  },
  {
    label: '파스텔 감성',
    options: [
      { id: 'rose',     label: '🩷 로즈 핑크 — 로맨틱한 달콤함',       color: '#FFE4E8' },
      { id: 'lavender', label: '💜 라벤더 — 몽글몽글 보라빛',           color: '#E8E4FF' },
      { id: 'mint',     label: '🩵 민트 크림 — 청량한 민트',            color: '#E8F5F2' },
      { id: 'peach',    label: '🍑 피치 — 복숭아빛 따뜻함',             color: '#FFD4C2' },
      { id: 'cloud',    label: '☁️ 클라우드 — 구름처럼 포근한',          color: '#F0EDE8' },
    ]
  },
  {
    label: '자연 감성',
    options: [
      { id: 'olive',    label: '🌿 올리브 — 자연스러운 그린',           color: '#5C6B3A' },
      { id: 'teal',     label: '🌊 틸 블루 — 깊고 신비한 청록',         color: '#1D6B6B' },
      { id: 'sunset',   label: '🌅 노을 — 따뜻한 저녁빛',               color: '#C4622D' },
      { id: 'caramel',  label: '☕ 카라멜 — 포근한 브라운',              color: '#C68642' },
    ]
  },
]

const ALL_BG = BG_CATEGORIES.flatMap(c => c.options)

const FONTS = [
  { id: 'pretendard',  label: '프리텐다드 (기본)',  css: "'Pretendard', sans-serif" },
  { id: 'noto',        label: 'Noto Sans KR',       css: "'Noto Sans KR', sans-serif" },
  { id: 'nanumgothic', label: '나눔고딕',            css: "'Nanum Gothic', sans-serif" },
  { id: 'spoqa',       label: 'Spoqa Han Sans',      css: "'Spoqa Han Sans Neo', sans-serif" },
  { id: 'doHyeon',     label: '배민 도현체',          css: "'Do Hyeon', sans-serif" },
  { id: 'kyobo',       label: '교보손글씨체',         css: "'KyoboHandwriting', cursive" },
  { id: 'cafe24',      label: '카페24 써라운드',      css: "'Cafe24Ssurround', sans-serif" },
  { id: 'notoserifkr', label: 'Noto Serif KR',       css: "'Noto Serif KR', serif" },
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
  myNick?: string
  partnerNick?: string
}

const BG_COLOR_MAP: Record<string, string> = Object.fromEntries(ALL_BG.map(b => [b.id, b.color]))

export { BG_COLOR_MAP, ALL_BG }

export default function AppearanceSection({
  bgColor, bgImage, font, fontSize, fontWeight,
  onBgColorChange, onBgImageChange, onFontChange, onFontSizeChange, onFontWeightChange,
  myNick = '나', partnerNick = '상대',
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

  const selectedBg = ALL_BG.find(b => b.id === bgColor)
  const previewBg = bgImage ? `url(${bgImage})` : (selectedBg?.color || '#0d0d1a')

  const lbl: React.CSSProperties = { fontSize: '11px', color: '#6666aa', marginBottom: '5px' }
  const sel: React.CSSProperties = {
    width: '100%', background: '#0d0d1a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '8px 12px',
    color: '#e8e4ff', fontSize: '11px', outline: 'none',
    appearance: 'none' as const, cursor: 'pointer', marginBottom: '6px',
  }

  return (
    <div style={{ marginBottom: '16px' }}>
      <div style={{ fontSize: '11px', color: '#6666aa', marginBottom: '10px' }}>🎨 화면 설정</div>

      {/* 카테고리별 배경 드롭박스 */}
      {BG_CATEGORIES.map(cat => (
        <div key={cat.label} style={{ marginBottom: '8px' }}>
          <div style={lbl}>{cat.label}</div>
          <select
            value={cat.options.some(o => o.id === bgColor) ? bgColor : ''}
            onChange={e => { onBgColorChange(e.target.value); onBgImageChange('') }}
            style={sel}>
            <option value="">— 선택 —</option>
            {cat.options.map(o => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          {/* 컬러 팔레트 */}
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            {cat.options.map(o => (
              <div key={o.id}
                onClick={() => { onBgColorChange(o.id); onBgImageChange('') }}
                style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  background: o.color, cursor: 'pointer', flexShrink: 0,
                  border: bgColor === o.id ? '2.5px solid #c8b0ff' : '1px solid rgba(255,255,255,0.2)',
                }} />
            ))}
          </div>
        </div>
      ))}

      {/* 사진 업로드 */}
      <div style={{ marginBottom: '10px', marginTop: '8px' }}>
        <div style={lbl}>내 사진 업로드</div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <div onClick={() => fileRef.current?.click()}
            style={{ flex: 1, background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: '18px', marginBottom: '2px' }}>📷</div>
            <div style={{ fontSize: '10px', color: bgImage ? '#c8b0ff' : '#6666aa' }}>
              {bgImage ? '적용됨 ✓' : '사진 선택'}
            </div>
          </div>
          {bgImage && (
            <div onClick={() => { onBgImageChange(''); onBgColorChange('navy') }}
              style={{ flex: 1, background: 'rgba(255,80,80,0.08)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: '8px', padding: '10px', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '18px', marginBottom: '2px' }}>🗑</div>
              <div style={{ fontSize: '10px', color: '#ff8888' }}>사진 삭제</div>
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
      </div>

      {/* 미리보기 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={lbl}>미리보기</div>
        <div style={{
          borderRadius: '10px', padding: '10px', overflow: 'hidden',
          background: bgImage ? 'transparent' : (selectedBg?.color || '#0d0d1a'),
          backgroundImage: bgImage ? `url(${bgImage})` : undefined,
          backgroundSize: 'cover', backgroundPosition: 'center',
          minHeight: '80px',
        }}>
          <div style={{ fontSize: '9px', color: '#f48fb1', marginBottom: '2px' }}>{partnerNick}</div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: '10px 10px 10px 2px', padding: '5px 8px', fontSize: '11px', color: '#e8e4ff', maxWidth: '75%', marginBottom: '6px' }}>오늘 운세 너무 신기해 💕</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '9px', color: '#9d8cff', marginBottom: '2px' }}>{myNick}</div>
            <div style={{ background: '#5544bb', borderRadius: '10px 10px 2px 10px', padding: '5px 8px', fontSize: '11px', color: '#e8e4ff', maxWidth: '75%' }}>나도! 소울메이트래 ✨</div>
          </div>
        </div>
      </div>

      {/* 글씨체 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={lbl}>글씨체</div>
        <select value={font} onChange={e => onFontChange(e.target.value)} style={sel}>
          {FONTS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      </div>

      {/* 글씨 크기 슬라이더 */}
      <div style={{ marginBottom: '10px' }}>
        <div style={{ ...lbl, display: 'flex', justifyContent: 'space-between' }}>
          <span>글씨 크기</span>
          <span style={{ color: '#c8b0ff' }}>{fontSize}px</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
