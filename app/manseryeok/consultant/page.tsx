'use client'
import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useConsultantState } from '@/hooks/useConsultantState'
import { useConsultantSaju } from '@/hooks/useConsultantSaju'
import ConsultationList from './components/ConsultationList'
import ConsultantChat from './components/ConsultantChat'
import ConsultantSajuTab from './components/ConsultantSajuTab'
import CustomerAiAnalysis from './components/CustomerAiAnalysis'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type UiSettings = {
  bgColor: string
  fontSize: number
  fontFamily: string
  titleSize: number
}

const DEFAULT_SETTINGS: UiSettings = {
  bgColor: '#111118',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  titleSize: 12,
}

type PanelState = {
  id: string
  x: number
  y: number
  width: number
  height: number
  minimized: boolean
  maximized: boolean
  open: boolean
  zIndex: number
  settings: {
    bgColor: string
    myBubble?: string
    customerBubble?: string
    fontSize: number
    titleSize: number
  }
}

const PANEL_DEFS = [
  { id: 'list',     icon: '📋', label: '상담목록',  defaultW: 240, defaultH: 500 },
  { id: 'chat',     icon: '💬', label: '채팅',      defaultW: 420, defaultH: 500 },
  { id: 'ai',       icon: '🔮', label: 'AI 분석',   defaultW: 300, defaultH: 500 },
  { id: 'schedule', icon: '📅', label: '일정관리',  defaultW: 320, defaultH: 400 },
  { id: 'settle',   icon: '💰', label: '정산',      defaultW: 320, defaultH: 400 },
  { id: 'memo',     icon: '📝', label: '메모',      defaultW: 280, defaultH: 360 },
]

const PANEL_DEFAULT_SETTINGS = {
  list:     { bgColor: '#1a1a24', fontSize: 13, titleSize: 12 },
  chat:     { bgColor: '#13131e', myBubble: '#3d3488', customerBubble: '#2a2a3a', fontSize: 13, titleSize: 12 },
  ai:       { bgColor: '#1a1a24', fontSize: 13, titleSize: 12 },
  schedule: { bgColor: '#1a1a24', fontSize: 13, titleSize: 12 },
  settle:   { bgColor: '#1a1a24', fontSize: 13, titleSize: 12 },
  memo:     { bgColor: '#1a1a24', fontSize: 13, titleSize: 12 },
}

function initPanels(): PanelState[] {
  return PANEL_DEFS.map((def, i) => ({
    id: def.id,
    x: 20 + (i % 3) * (def.defaultW + 12),
    y: 20 + Math.floor(i / 3) * 60,
    width: def.defaultW,
    height: def.defaultH,
    minimized: false,
    maximized: false,
    open: i < 3,
    zIndex: 10 + i,
    settings: (PANEL_DEFAULT_SETTINGS as any)[def.id],
  }))
}

function ConsultantContent() {
  const router = useRouter()
  const {
    consultationId, setConsultationId,
    customerPhone, setCustomerPhone,
    customerName,
    selectedConsultation, setSelectedConsultation,
    gender, calType, yearParam, monthParam, dayParam, leapMonth, hourIdx,
    consultantId,
    handleFormSubmit, handleSelectConsultation,
  } = useConsultantState()

  const { saju, dayStem, converting, iljji, yeonjji, yeangan, dayunList, seyunList } =
    useConsultantSaju(calType, yearParam, monthParam, dayParam, leapMonth, hourIdx, gender)

  const [panels, setPanels] = useState<PanelState[]>(initPanels)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [consultantName, setConsultantName] = useState('')
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS)
  const [openPanelSettings, setOpenPanelSettings] = useState<string | null>(null)
  const [maxZ, setMaxZ] = useState(20)

  const dragging = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null)
  const resizing = useRef<{ id: string; startX: number; startY: number; origW: number; origH: number } | null>(null)

  useEffect(() => {
    if (!consultantId) return
    supabase.from('consultants').select('name, ui_settings')
      .eq('id', consultantId).single()
      .then(({ data }) => {
        if (data?.name) setConsultantName(data.name)
        if (data?.ui_settings) setSettings({ ...DEFAULT_SETTINGS, ...data.ui_settings })
      })
  }, [consultantId])

  const bringToFront = useCallback((id: string) => {
    setMaxZ(prev => {
      const newZ = prev + 1
      setPanels(ps => ps.map(p => p.id === id ? { ...p, zIndex: newZ } : p))
      return newZ
    })
  }, [])

  const togglePanel = (id: string) => {
    setPanels(ps => ps.map(p => p.id === id ? { ...p, open: !p.open } : p))
  }

  const updatePanel = (id: string, updates: Partial<PanelState>) => {
    setPanels(ps => ps.map(p => p.id === id ? { ...p, ...updates } : p))
  }

  const updatePanelSettings = (id: string, key: string, value: any) => {
    setPanels(ps => ps.map(p => p.id === id ? { ...p, settings: { ...p.settings, [key]: value } } : p))
  }

  const handleDragStart = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    bringToFront(id)
    const panel = panels.find(p => p.id === id)!
    dragging.current = { id, startX: e.clientX, startY: e.clientY, origX: panel.x, origY: panel.y }
  }

  const handleResizeStart = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const panel = panels.find(p => p.id === id)!
    resizing.current = { id, startX: e.clientX, startY: e.clientY, origW: panel.width, origH: panel.height }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (dragging.current) {
        const { id, startX, startY, origX, origY } = dragging.current
        setPanels(ps => ps.map(p => p.id === id ? {
          ...p,
          x: Math.max(0, origX + e.clientX - startX),
          y: Math.max(48, origY + e.clientY - startY),
        } : p))
      }
      if (resizing.current) {
        const { id, startX, startY, origW, origH } = resizing.current
        setPanels(ps => ps.map(p => p.id === id ? {
          ...p,
          width: Math.max(200, origW + e.clientX - startX),
          height: Math.max(200, origH + e.clientY - startY),
        } : p))
      }
    }
    const onUp = () => { dragging.current = null; resizing.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  async function handleDeleteRequest(id: string) {
    if (!confirm('삭제를 요청하시겠어요? 관리자 승인 후 최종 삭제됩니다.')) return
    setDeleteLoading(id)
    await supabase.from('consultations')
      .update({ delete_requested_at: new Date().toISOString() })
      .eq('id', id)
    setDeleteLoading(null)
    alert('삭제 요청이 접수됐어요.')
  }

  const s = settings

  const renderPanelContent = (panel: PanelState) => {
    const ps = panel.settings
    switch (panel.id) {
      case 'list':
        return (
          <div style={{flex:1, overflowY:'auto', padding:'8px', background:ps.bgColor, fontSize:ps.fontSize+'px'}}>
            <ConsultationList
              consultantId={consultantId}
              onSelect={(c) => { handleSelectConsultation(c); bringToFront('chat') }}
              selectedId={selectedConsultation?.id}
              onDeleteRequest={handleDeleteRequest}
              deleteLoading={deleteLoading}
            />
          </div>
        )
      case 'chat':
        return (
          <div style={{flex:1, overflow:'hidden', background:ps.bgColor, fontSize:ps.fontSize+'px'}}>
            {selectedConsultation ? (
              <ConsultantChat
                consultationId={selectedConsultation.id}
                customerPhone={selectedConsultation.customer_phone}
                onBack={() => setSelectedConsultation(null)}
                onViewSaju={() => bringToFront('ai')}
                pcMode={true}
                myBubbleColor={ps.myBubble || '#3d3488'}
                customerBubbleColor={ps.customerBubble || '#2a2a3a'}
                fontSize={ps.fontSize}
              />
            ) : (
              <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:'8px'}}>
                <span style={{fontSize:'24px'}}>💬</span>
                <span style={{fontSize:'11px', color:'#5555aa'}}>상담목록에서 고객을 선택하세요</span>
              </div>
            )}
          </div>
        )
      case 'ai':
        return (
          <div style={{flex:1, overflowY:'auto', padding:'12px', background:ps.bgColor, fontSize:ps.fontSize+'px'}}>
            {selectedConsultation ? (
              <CustomerAiAnalysis
                consultationId={selectedConsultation.id}
                saju={saju} gender={gender} calType={calType}
                yearParam={yearParam} monthParam={monthParam}
                dayParam={dayParam} hourIdx={hourIdx}
              />
            ) : (
              <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:'8px'}}>
                <span style={{fontSize:'24px'}}>🔮</span>
                <span style={{fontSize:'11px', color:'#5555aa'}}>고객 선택 시 표시됩니다</span>
              </div>
            )}
          </div>
        )
      case 'schedule':
        return (
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:ps.bgColor, flexDirection:'column', gap:'8px'}}>
            <span style={{fontSize:'24px'}}>📅</span>
            <span style={{fontSize:'11px', color:'#5555aa'}}>일정관리 준비 중</span>
          </div>
        )
      case 'settle':
        return (
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', background:ps.bgColor, flexDirection:'column', gap:'8px'}}>
            <span style={{fontSize:'24px'}}>💰</span>
            <span style={{fontSize:'11px', color:'#5555aa'}}>정산 준비 중</span>
          </div>
        )
      case 'memo':
        return (
          <div style={{flex:1, padding:'10px', background:ps.bgColor}}>
            <textarea
              placeholder="메모를 입력하세요..."
              style={{
                width:'100%', height:'100%', background:'transparent',
                border:'none', outline:'none', resize:'none',
                color:'#c8c0ff', fontSize:ps.fontSize+'px',
                fontFamily: s.fontFamily, lineHeight:'1.6',
              }}
            />
          </div>
        )
      default: return null
    }
  }

  const renderPanelSettings = (panel: PanelState) => {
    const ps = panel.settings
    return (
      <div style={{
        padding:'6px 10px', borderTop:'1px solid rgba(255,255,255,0.06)',
        background:'#0d0d18', display:'flex', alignItems:'center',
        gap:'10px', flexWrap:'wrap', flexShrink:0,
      }}>
        {/* 배경색 */}
        <div style={{display:'flex', alignItems:'center', gap:'3px'}}>
          <span style={{fontSize:'10px', color:'#555577'}}>배경</span>
          <label style={{position:'relative', cursor:'pointer'}}>
            <div style={{width:'14px', height:'14px', borderRadius:'2px', background:ps.bgColor, border:'1px solid rgba(255,255,255,0.2)'}}/>
            <input type="color" value={ps.bgColor}
              onChange={e => updatePanelSettings(panel.id, 'bgColor', e.target.value)}
              style={{position:'absolute', opacity:0, width:'14px', height:'14px', top:0, left:0, cursor:'pointer'}}
            />
          </label>
        </div>

        {/* 채팅 버블 색상 */}
        {panel.id === 'chat' && (
          <>
            <div style={{display:'flex', alignItems:'center', gap:'3px'}}>
              <span style={{fontSize:'10px', color:'#555577'}}>내버블</span>
              <label style={{position:'relative', cursor:'pointer'}}>
                <div style={{width:'14px', height:'14px', borderRadius:'2px', background:ps.myBubble||'#3d3488', border:'1px solid rgba(255,255,255,0.2)'}}/>
                <input type="color" value={ps.myBubble||'#3d3488'}
                  onChange={e => updatePanelSettings(panel.id, 'myBubble', e.target.value)}
                  style={{position:'absolute', opacity:0, width:'14px', height:'14px', top:0, left:0, cursor:'pointer'}}
                />
              </label>
            </div>
            <div style={{display:'flex', alignItems:'center', gap:'3px'}}>
              <span style={{fontSize:'10px', color:'#555577'}}>고객</span>
              <label style={{position:'relative', cursor:'pointer'}}>
                <div style={{width:'14px', height:'14px', borderRadius:'2px', background:ps.customerBubble||'#2a2a3a', border:'1px solid rgba(255,255,255,0.2)'}}/>
                <input type="color" value={ps.customerBubble||'#2a2a3a'}
                  onChange={e => updatePanelSettings(panel.id, 'customerBubble', e.target.value)}
                  style={{position:'absolute', opacity:0, width:'14px', height:'14px', top:0, left:0, cursor:'pointer'}}
                />
              </label>
            </div>
          </>
        )}

        {/* 내용 폰트 크기 */}
        <div style={{display:'flex', alignItems:'center', gap:'3px'}}>
          <span style={{fontSize:'10px', color:'#555577'}}>내용</span>
          <input type="range" min="10" max="16" step="1" value={ps.fontSize}
            onChange={e => updatePanelSettings(panel.id, 'fontSize', Number(e.target.value))}
            style={{width:'50px', cursor:'pointer'}}
          />
          <span style={{fontSize:'10px', color:'#b8a9ff'}}>{ps.fontSize}px</span>
        </div>

        {/* 제목 크기 */}
        <div style={{display:'flex', alignItems:'center', gap:'3px'}}>
          <span style={{fontSize:'10px', color:'#555577'}}>제목</span>
          <input type="range" min="9" max="15" step="1" value={ps.titleSize}
            onChange={e => updatePanelSettings(panel.id, 'titleSize', Number(e.target.value))}
            style={{width:'50px', cursor:'pointer'}}
          />
          <span style={{fontSize:'10px', color:'#b8a9ff'}}>{ps.titleSize}px</span>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width:'100vw', height:'100vh', overflow:'hidden',
      background: s.bgColor, fontFamily: s.fontFamily,
      position:'relative',
    }}>

      {/* 상단 메뉴바 */}
      <div style={{
        position:'fixed', top:0, left:0, right:0, height:'44px', zIndex:1000,
        background:'rgba(18,18,28,0.97)', borderBottom:'1px solid rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', padding:'0 14px', gap:'5px',
      }}>
        <span style={{fontSize:'14px', fontWeight:'500', color:'#e8e4ff', marginRight:'6px'}}>명연재</span>
        <span style={{fontSize:'11px', color:'#333355', marginRight:'3px'}}>|</span>

        {PANEL_DEFS.map(def => {
          const panel = panels.find(p => p.id === def.id)!
          return (
            <button key={def.id} onClick={() => togglePanel(def.id)}
              style={{
                fontSize:'11px', padding:'3px 9px', borderRadius:'6px',
                border: panel.open ? '1px solid rgba(119,102,221,0.5)' : '1px solid rgba(255,255,255,0.08)',
                background: panel.open ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.03)',
                color: panel.open ? '#c8b0ff' : '#555577',
                cursor:'pointer', display:'flex', alignItems:'center', gap:'3px',
              }}>
              <span style={{fontSize:'12px'}}>{def.icon}</span>
              <span>{def.label}</span>
            </button>
          )
        })}

        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
          <span style={{fontSize:'11px', color:'#7766aa'}}>{consultantName || '상담사'} 님</span>
          <button onClick={handleLogout}
            style={{fontSize:'11px', padding:'3px 9px', borderRadius:'6px', border:'1px solid rgba(255,80,80,0.2)', background:'transparent', color:'rgba(255,100,100,0.7)', cursor:'pointer'}}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 플로팅 패널들 */}
      {panels.filter(p => p.open).map(panel => {
        const def = PANEL_DEFS.find(d => d.id === panel.id)!
        const isMax = panel.maximized
        const isMin = panel.minimized
        const isSettingsOpen = openPanelSettings === panel.id
        const titleSize = panel.settings.titleSize || 12

        return (
          <div key={panel.id}
            onMouseDown={() => bringToFront(panel.id)}
            style={{
              position:'fixed',
              left: isMax ? 0 : panel.x,
              top: isMax ? 44 : panel.y,
              width: isMax ? '100vw' : panel.width,
              height: isMax ? 'calc(100vh - 44px)' : (isMin ? 32 : panel.height),
              zIndex: panel.zIndex,
              borderRadius: isMax ? 0 : '8px',
              border:'1px solid rgba(255,255,255,0.08)',
              overflow:'hidden',
              display:'flex', flexDirection:'column',
              boxShadow:'0 6px 24px rgba(0,0,0,0.5)',
            }}>

            {/* 제목바 */}
            <div
              onMouseDown={e => !isMax && handleDragStart(panel.id, e)}
              style={{
                height:'32px', padding:'0 8px',
                background:'rgba(20,20,35,0.98)',
                borderBottom:'1px solid rgba(255,255,255,0.06)',
                display:'flex', alignItems:'center', gap:'6px',
                cursor: isMax ? 'default' : 'move',
                flexShrink:0, userSelect:'none',
              }}>
              <span style={{fontSize: titleSize + 'px'}}>{def.icon}</span>
              <span style={{fontSize: titleSize + 'px', fontWeight:'500', color:'#c8c0ff', flex:1}}>{def.label}</span>

              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => setOpenPanelSettings(prev => prev === panel.id ? null : panel.id)}
                style={{
                  fontSize:'10px', padding:'1px 6px', borderRadius:'3px',
                  border: isSettingsOpen ? '1px solid rgba(119,102,221,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  background: isSettingsOpen ? 'rgba(60,52,137,0.3)' : 'transparent',
                  color: isSettingsOpen ? '#b8a9ff' : '#444466', cursor:'pointer',
                }}>
                ⚙️
              </button>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => updatePanel(panel.id, { minimized: !panel.minimized, maximized: false })}
                style={{width:'18px', height:'18px', borderRadius:'3px', border:'none', background:'rgba(255,255,255,0.06)', color:'#888', cursor:'pointer', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                ─
              </button>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => updatePanel(panel.id, { maximized: !panel.maximized, minimized: false })}
                style={{width:'18px', height:'18px', borderRadius:'3px', border:'none', background:'rgba(255,255,255,0.06)', color:'#888', cursor:'pointer', fontSize:'10px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                □
              </button>
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={() => updatePanel(panel.id, { open: false })}
                style={{width:'18px', height:'18px', borderRadius:'3px', border:'none', background:'rgba(255,80,80,0.15)', color:'rgba(255,120,120,0.8)', cursor:'pointer', fontSize:'11px', display:'flex', alignItems:'center', justifyContent:'center'}}>
                ✕
              </button>
            </div>

            {/* 패널 설정 바 */}
            {isSettingsOpen && !isMin && renderPanelSettings(panel)}

            {/* 패널 내용 */}
            {!isMin && (
              <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column'}}>
                {renderPanelContent(panel)}
              </div>
            )}

            {/* 리사이즈 핸들 */}
            {!isMax && !isMin && (
              <div
                onMouseDown={e => handleResizeStart(panel.id, e)}
                style={{position:'absolute', right:0, bottom:0, width:'14px', height:'14px', cursor:'se-resize', display:'flex', alignItems:'center', justifyContent:'center'}}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 9L9 2M5 9L9 5M8 9L9 8" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function ConsultantPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#111118'}}>
        <div style={{color:'#FAC775'}}>로딩 중...</div>
      </div>
    }>
      <ConsultantContent />
    </Suspense>
  )
}
