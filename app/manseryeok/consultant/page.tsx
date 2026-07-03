'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useConsultantState } from '@/hooks/useConsultantState'
import { useConsultantSaju } from '@/hooks/useConsultantSaju'
import ConsultationList from './components/ConsultationList'
import ConsultantChat from './components/ConsultantChat'
import CustomerAiAnalysis from './components/CustomerAiAnalysis'
import ConsultantSchedule from './components/ConsultantSchedule'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

// ============================================================
// 상담사 대시보드 (3분할 구조)
//  - 상단 메뉴바: 항상 표시 (드래그 이동은 4단계에서 추가)
//  - 고정 3버튼: 나의 일정 / 상담목록 / 나의 정산
//       → 클릭하면 그 화면만 왼쪽 큰 영역에 표시
//  - 상담목록에서 고객 클릭 → 전체가 3분할로 덮임
//       ① AI 해설  ② 고객 채팅  ③ 오른쪽(상: 내 입력 / 하: AI 정리)
//  - 3분할 경계선은 마우스로 좌우 폭 조절
//  - 물상도 / 사주명식표 플로팅, 설정 저장은 다음 단계에서 추가
// ============================================================

type UiSettings = {
  bgColor: string
  fontSize: number
  fontFamily: string
  menuSize: number
}

const DEFAULT_SETTINGS: UiSettings = {
  bgColor: '#111118',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
  menuSize: 11,
}

// 고정 버튼(왼쪽 큰 영역에서 전환되는 화면들)
const FIXED_TABS = [
  { id: 'schedule', icon: '📅', label: '나의 일정' },
  { id: 'list',     icon: '📋', label: '상담목록' },
  { id: 'settle',   icon: '💰', label: '나의 정산' },
] as const

type FixedTab = typeof FIXED_TABS[number]['id']

function ConsultantContent() {
  const router = useRouter()
  const {
    consultationId,
    customerName,
    selectedConsultation, setSelectedConsultation,
    gender, calType, yearParam, monthParam, dayParam, leapMonth, hourIdx,
    consultantId,
    handleSelectConsultation,
  } = useConsultantState()

  // 사주명식 계산 (사주명식표 플로팅에서 쓸 예정 — 지금은 흐름만 유지)
  const { saju, dayStem, dayunList, seyunList } =
    useConsultantSaju(calType, yearParam, monthParam, dayParam, leapMonth, hourIdx, gender)

  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS)
  const [consultantName, setConsultantName] = useState('')
  const [myNickname, setMyNickname] = useState('')
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)

  // 왼쪽 큰 영역에 지금 켜져 있는 고정 탭 (기본: 상담목록)
  const [activeTab, setActiveTab] = useState<FixedTab>('list')

  // 3분할 폭 비율 (%) — 왼쪽(AI해설) / 중간(채팅) / 오른쪽(입력·정리)
  const [splitLeft, setSplitLeft] = useState(30)   // ① AI 해설
  const [splitMid, setSplitMid] = useState(40)     // ② 채팅  (오른쪽 = 나머지)
  const splitDrag = useRef<{ edge: 'left' | 'mid'; startX: number; origLeft: number; origMid: number } | null>(null)
  const splitWrapRef = useRef<HTMLDivElement | null>(null)

  // 고객이 선택되면 = 3분할 모드 ON
  const splitMode = !!selectedConsultation

  // ---------- 설정 불러오기 ----------
  useEffect(() => {
    if (!consultantId) return
    supabase.from('consultants').select('name, ui_settings')
      .eq('id', consultantId).single()
      .then(({ data }) => {
        if (data?.name) setConsultantName(data.name)
        if (data?.ui_settings) setSettings({ ...DEFAULT_SETTINGS, ...data.ui_settings })
      })
  }, [consultantId])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: p } = await supabase.from('profiles')
        .select('nickname').eq('id', data.user.id).single()
      if (p?.nickname) setMyNickname(p.nickname)
    })
  }, [])

  // ---------- 3분할 경계선 드래그 ----------
  const startSplitDrag = (edge: 'left' | 'mid', e: React.MouseEvent) => {
    e.preventDefault()
    splitDrag.current = { edge, startX: e.clientX, origLeft: splitLeft, origMid: splitMid }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!splitDrag.current || !splitWrapRef.current) return
      const wrapW = splitWrapRef.current.clientWidth || 1
      const deltaPct = ((e.clientX - splitDrag.current.startX) / wrapW) * 100
      if (splitDrag.current.edge === 'left') {
        // 왼쪽 경계: AI해설 폭 조절 (중간은 유지, 오른쪽이 흡수)
        const next = Math.min(60, Math.max(15, splitDrag.current.origLeft + deltaPct))
        setSplitLeft(next)
      } else {
        // 중간 경계: 채팅 폭 조절 (오른쪽이 흡수)
        const next = Math.min(65, Math.max(20, splitDrag.current.origMid + deltaPct))
        setSplitMid(next)
      }
    }
    const onUp = () => { splitDrag.current = null }
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
  const ms = s.menuSize
  const splitRight = Math.max(15, 100 - splitLeft - splitMid)

  // ---------- 왼쪽 큰 영역: 고정 탭 내용 ----------
  const renderFixedTab = () => {
    switch (activeTab) {
      case 'schedule':
        return (
          <div style={{flex:1, overflowY:'auto', padding:'16px'}}>
            <ConsultantSchedule consultantId={consultantId} fontSize={s.fontSize} />
          </div>
        )
      case 'list':
        return (
          <div style={{flex:1, overflowY:'auto', padding:'12px'}}>
            <ConsultationList
              consultantId={consultantId}
              onSelect={(c) => handleSelectConsultation(c)}
              selectedId={selectedConsultation?.id}
              onDeleteRequest={handleDeleteRequest}
              deleteLoading={deleteLoading}
            />
          </div>
        )
      case 'settle':
        return (
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'10px'}}>
            <span style={{fontSize:'26px'}}>💰</span>
            <span style={{fontSize:'12px', color:'#5555aa'}}>정산 화면 준비 중</span>
          </div>
        )
      default: return null
    }
  }

  // ---------- 3분할 화면 (고객 선택 시) ----------
  const renderSplitView = () => (
    <div ref={splitWrapRef} style={{flex:1, display:'flex', overflow:'hidden'}}>

      {/* ① AI 해설 */}
      <div style={{width:splitLeft+'%', minWidth:0, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={paneTitleStyle}>🔮 AI 해설</div>
        <div style={{flex:1, overflowY:'auto', padding:'12px', fontSize:s.fontSize+'px'}}>
          <CustomerAiAnalysis
            consultationId={selectedConsultation!.id}
            saju={saju} gender={gender} calType={calType}
            yearParam={yearParam} monthParam={monthParam}
            dayParam={dayParam} hourIdx={hourIdx}
          />
        </div>
      </div>

      {/* 경계선 (왼쪽 ↔ 중간) */}
      <div onMouseDown={e => startSplitDrag('left', e)} style={dividerStyle} title="드래그로 폭 조절">
        <div style={dividerGrip} />
      </div>

      {/* ② 고객 채팅 */}
      <div style={{width:splitMid+'%', minWidth:0, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={paneTitleStyle}>
          💬 {customerName || '고객'} 채팅
          <button onClick={() => setSelectedConsultation(null)}
            style={{marginLeft:'auto', fontSize:'10px', padding:'2px 8px', borderRadius:'5px', border:'1px solid rgba(255,255,255,0.12)', background:'transparent', color:'#8888bb', cursor:'pointer'}}>
            ← 목록
          </button>
        </div>
        <div style={{flex:1, overflow:'hidden'}}>
          <ConsultantChat
            consultationId={selectedConsultation!.id}
            customerPhone={selectedConsultation!.customer_phone}
            onBack={() => setSelectedConsultation(null)}
            onViewSaju={() => {}}
            pcMode={true}
            myBubbleColor={'#3d3488'}
            customerBubbleColor={'#2a2a3a'}
            fontSize={s.fontSize}
          />
        </div>
      </div>

      {/* 경계선 (중간 ↔ 오른쪽) */}
      <div onMouseDown={e => startSplitDrag('mid', e)} style={dividerStyle} title="드래그로 폭 조절">
        <div style={dividerGrip} />
      </div>

      {/* ③ 오른쪽: 위(내 입력) / 아래(AI 정리) — 3단계에서 실제 연결 */}
      <div style={{width:splitRight+'%', minWidth:0, display:'flex', flexDirection:'column'}}>
        <div style={{flex:1, display:'flex', flexDirection:'column', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
          <div style={paneTitleStyle}>✍️ 내 설명 입력</div>
          <div style={{flex:1, padding:'10px'}}>
            <textarea placeholder="고객에게 전할 설명을 입력하세요..."
              style={{width:'100%', height:'100%', background:'transparent', border:'none', outline:'none', resize:'none', color:'#c8c0ff', fontSize:s.fontSize+'px', fontFamily:s.fontFamily, lineHeight:'1.6'}}
            />
          </div>
        </div>
        <div style={{flex:1, display:'flex', flexDirection:'column'}}>
          <div style={paneTitleStyle}>📄 AI 정리 결과</div>
          <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'8px', padding:'12px', textAlign:'center'}}>
            <span style={{fontSize:'20px'}}>📄</span>
            <span style={{fontSize:'11px', color:'#5555aa'}}>AI 정리 · 저장 · 복사<br/>다음 단계에서 연결됩니다</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div style={{width:'100vw', height:'100vh', overflow:'hidden', background:s.bgColor, fontFamily:s.fontFamily, position:'relative', display:'flex', flexDirection:'column'}}>

      {/* ===== 상단 메뉴바 ===== */}
      <div style={{
        height:'40px', flexShrink:0, zIndex:1000,
        background:'rgba(18,18,28,0.97)', borderBottom:'1px solid rgba(255,255,255,0.06)',
        display:'flex', alignItems:'center', padding:'0 12px', gap:'4px',
      }}>
        <span style={{fontSize:'13px', fontWeight:'500', color:'#e8e4ff', marginRight:'6px'}}>명연재</span>
        <span style={{fontSize:'10px', color:'#333355', marginRight:'2px'}}>|</span>

        {/* 고정 3버튼 — 클릭 시 그 화면만 표시 (3분할 중이면 목록으로 복귀) */}
        {FIXED_TABS.map(t => {
          const active = !splitMode && activeTab === t.id
          return (
            <button key={t.id}
              onClick={() => { setActiveTab(t.id); if (splitMode) setSelectedConsultation(null) }}
              style={{
                fontSize: ms + 'px',
                padding: ms <= 9 ? '1px 5px' : ms <= 11 ? '2px 7px' : '3px 9px',
                borderRadius:'5px',
                border: active ? '1px solid rgba(119,102,221,0.5)' : '1px solid rgba(255,255,255,0.08)',
                background: active ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.03)',
                color: active ? '#c8b0ff' : '#8888aa',
                cursor:'pointer', display:'flex', alignItems:'center', gap:'3px', whiteSpace:'nowrap',
              }}>
              <span style={{fontSize:(ms+1)+'px'}}>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          )
        })}

        {/* 메뉴 크기 슬라이더 (기존 기능 유지) */}
        <div style={{display:'flex', alignItems:'center', gap:'4px', marginLeft:'8px', borderLeft:'1px solid rgba(255,255,255,0.08)', paddingLeft:'8px'}}>
          <span style={{fontSize:'9px', color:'#444466', whiteSpace:'nowrap'}}>메뉴크기</span>
          <input type="range" min="8" max="13" step="1" value={ms}
            onChange={e => setSettings(prev => ({...prev, menuSize: Number(e.target.value)}))}
            style={{width:'50px', cursor:'pointer'}}
          />
          <span style={{fontSize:'9px', color:'#666688'}}>{ms}</span>
        </div>

        {/* 우측: 상담사명 + 로그아웃 */}
        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
          <span style={{fontSize:'11px', color:'#7766aa'}}>{myNickname || consultantName || '상담사'} 님</span>
          <button onClick={handleLogout}
            style={{fontSize:'10px', padding:'2px 8px', borderRadius:'5px', border:'1px solid rgba(255,80,80,0.2)', background:'transparent', color:'rgba(255,100,100,0.7)', cursor:'pointer'}}>
            로그아웃
          </button>
        </div>
      </div>

      {/* ===== 본문: 3분할 모드 or 고정 탭 ===== */}
      <div style={{flex:1, display:'flex', overflow:'hidden'}}>
        {splitMode ? renderSplitView() : (
          <div style={{flex:1, display:'flex', flexDirection:'column', overflow:'hidden'}}>
            <div style={paneTitleStyle}>
              {FIXED_TABS.find(t => t.id === activeTab)?.icon}{' '}
              {FIXED_TABS.find(t => t.id === activeTab)?.label}
            </div>
            {renderFixedTab()}
          </div>
        )}
      </div>
    </div>
  )
}

// 각 분할 영역 제목바 공통 스타일
const paneTitleStyle: React.CSSProperties = {
  height:'32px', flexShrink:0, padding:'0 12px',
  background:'rgba(20,20,35,0.6)', borderBottom:'1px solid rgba(255,255,255,0.06)',
  display:'flex', alignItems:'center', gap:'6px',
  fontSize:'12px', fontWeight:500, color:'#c8c0ff', userSelect:'none',
}

// 경계선 스타일
const dividerStyle: React.CSSProperties = {
  width:'6px', flexShrink:0, cursor:'col-resize',
  background:'rgba(255,255,255,0.04)',
  display:'flex', alignItems:'center', justifyContent:'center',
}
const dividerGrip: React.CSSProperties = {
  width:'2px', height:'28px', borderRadius:'2px', background:'rgba(119,102,221,0.4)',
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
