'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useConsultantState } from '@/hooks/useConsultantState'
import { useConsultantSaju } from '@/hooks/useConsultantSaju'
import ConsultationList from './components/ConsultationList'
// 고객 채팅 — 07-20 연결 끊음(부품은 남겨 둠). 되살리려면 이 줄과 사용처 주석만 풀면 된다.
// import ConsultantChat from './components/ConsultantChat'
import ConsultTimer from './components/ConsultTimer'
import CustomerAiAnalysis from './components/CustomerAiAnalysis'
// CustomerHistory 는 07-20부터 HistoryFloating(플로팅 창) 안에서 쓴다.
// import CustomerHistory from './components/CustomerHistory'
import ConsultantNote from './components/ConsultantNote'
import ConsultantSchedule from './components/ConsultantSchedule'
// 기존 사주명식 창(십성·신살 탭) — 전문가용으로 교체. 부품은 남겨 둔다.
// import SajuFloating from './components/SajuFloating'
import ExpertFloating from './components/ExpertFloating'
import HistoryFloating from './components/HistoryFloating'
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
//  - 🔮 사주명식: 메뉴바 버튼으로 플로팅 창을 자유롭게 열고 닫음 (하늘도마뱀 양식)
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
    selectedUserId,
    gender, calType, yearParam, monthParam, dayParam, leapMonth, hourIdx,
    consultantId,
    handleSelectConsultation,
  } = useConsultantState()

  // 사주명식 계산 (플로팅 명식창에서 사용 — 검증된 계산식 그대로)
  const { saju, dayStem, dayunList, seyunList } =
    useConsultantSaju(calType, yearParam, monthParam, dayParam, leapMonth, hourIdx, gender)

  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS)
  const [consultantName, setConsultantName] = useState('')
  const [myNickname, setMyNickname] = useState('')
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [authState, setAuthState] = useState<'checking' | 'ok' | 'denied'>('checking')

  // 📋 상담내역 플로팅 창 열림 상태
  const [historyOpen, setHistoryOpen] = useState(false)

  // 🔮 만세력 플로팅 창 열림 상태
  const [sajuOpen, setSajuOpen] = useState(false)

  // 왼쪽 큰 영역에 지금 켜져 있는 고정 탭 (기본: 상담목록)
  const [activeTab, setActiveTab] = useState<FixedTab>('list')

  // 3분할 폭 비율 (%) — 왼쪽(AI해설) / 중간(채팅) / 오른쪽(입력·정리)
  const [splitLeft, setSplitLeft] = useState(30)   // ① AI 해설
  const [splitMid, setSplitMid] = useState(40)     // ② 채팅  (오른쪽 = 나머지)
  const splitDrag = useRef<{ edge: 'left' | 'mid'; startX: number; origLeft: number; origMid: number } | null>(null)
  const splitWrapRef = useRef<HTMLDivElement | null>(null)

  // 가운데 칸 세로 분할 — 위(재방문 이력) / 아래(채팅) 높이 비율 (%)
  // 위치를 기억(localStorage)해서 새로고침·다음 고객에도 유지
  // ⚠️ 가운데 칸 세로 분할(위 이력 / 아래 채팅)은 07-20 개편으로 안 쓴다.
  //    되살릴 때를 대비해 상태·드래그 로직은 남겨 두었다.
  const [midTopPct, setMidTopPct] = useState<number>(() => {
    if (typeof window === 'undefined') return 35
    const saved = window.localStorage.getItem('consultant_mid_top_pct')
    const n = saved ? parseFloat(saved) : NaN
    return isNaN(n) ? 35 : Math.min(70, Math.max(15, n))
  })
  const midDrag = useRef<{ startY: number; origTop: number } | null>(null)
  const midWrapRef = useRef<HTMLDivElement | null>(null)

  // 고객이 선택되면 = 3분할 모드 ON
  const splitMode = !!selectedConsultation

  // ---------- 권한 체크: 로그인한 사람이 상담사 본인인지 확인 ----------
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const { data: u } = await supabase.auth.getUser()
      if (cancelled) return
      // 로그인 안 됨 → 로그인 화면으로
      if (!u.user) {
        setAuthState('denied')
        router.replace('/auth/login')
        return
      }
      const email = u.user.email || ''
      // 이 사람이 상담사(consultants)로 등록돼 있는지 이메일로 확인
      const { data: con } = await supabase
        .from('consultants')
        .select('id, name')
        .eq('email', email)
        .maybeSingle()
      if (cancelled) return
      if (con?.id) {
        // 상담사 본인 확인됨 — 자기 이름·id로 표시
        setConsultantName(con.name || '')
        setAuthState('ok')
      } else {
        // 상담사가 아님 → 상담사 화면 접근 차단, 홈으로
        setAuthState('denied')
        alert('상담사 전용 화면입니다.')
        router.replace('/')
      }
    })()
    return () => { cancelled = true }
  }, [router])

  // ---------- 설정 불러오기 ----------
  useEffect(() => {
    if (!consultantId) return
    supabase.from('consultants').select('name, ui_settings')
      .eq('id', consultantId).single()
      .then(({ data }) => {
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

  // ---------- 가운데 칸 세로 경계선 드래그 (위 이력 / 아래 채팅) ----------
  const startMidDrag = (e: React.MouseEvent) => {
    e.preventDefault()
    midDrag.current = { startY: e.clientY, origTop: midTopPct }
  }
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!midDrag.current || !midWrapRef.current) return
      const wrapH = midWrapRef.current.clientHeight || 1
      const deltaPct = ((e.clientY - midDrag.current.startY) / wrapH) * 100
      const next = Math.min(70, Math.max(15, midDrag.current.origTop + deltaPct))
      setMidTopPct(next)
    }
    const onUp = () => {
      if (midDrag.current) {
        // 놓는 순간 현재 위치를 기억(localStorage)
        try { window.localStorage.setItem('consultant_mid_top_pct', String(midTopPct)) } catch {}
      }
      midDrag.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [midTopPct])

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

  // 명식창 표시용 생년월일 문구
  const birthText = (yearParam && monthParam && dayParam)
    ? `${calType || '양력'} ${yearParam}-${String(monthParam).padStart(2,'0')}-${String(dayParam).padStart(2,'0')}${hourIdx !== null && hourIdx !== undefined ? ` · ${['子(23-01)','丑(01-03)','寅(03-05)','卯(05-07)','辰(07-09)','巳(09-11)','午(11-13)','未(13-15)','申(15-17)','酉(17-19)','戌(19-21)','亥(21-23)'][hourIdx] || ''}시` : ''}`
    : ''

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

      {/* ② 가운데 칸 — 비워 둔다 (플로팅 창을 끌어다 놓고 쓰는 자리)
          ─────────────────────────────────────────────────────
          07-20 개편:
            · 이전 상담 내역 → 메뉴바 "📋 상담내역" 플로팅으로 옮김
            · 고객 채팅 → 연결 끊고 숨김 (부품은 남겨 둠)
              되살리려면 아래 CHAT_OPEN 을 true 로 바꾸고
              page.tsx 의 ConsultantChat import 주석을 풀면 된다. */}
      <div ref={midWrapRef} style={{width:splitMid+'%', minWidth:0, display:'flex', flexDirection:'column', borderRight:'1px solid rgba(255,255,255,0.06)'}}>
        <div style={{
          flex:1, minHeight:0, display:'flex', flexDirection:'column',
          alignItems:'center', justifyContent:'center', gap:'10px',
          border:'1px dashed rgba(250,199,117,0.25)', margin:'8px', borderRadius:'8px',
        }}>
          <div style={{fontSize:'11px', color:'#6a6a8a', textAlign:'center', lineHeight:1.8}}>
            비어 있는 칸이에요.<br/>
            위 메뉴바에서 <span style={{color:'#FAC775'}}>🔮 만세력</span> ·
            <span style={{color:'#FAC775'}}> 📋 상담내역</span> 창을 열어<br/>
            이 자리로 끌어다 놓고 쓰세요.
          </div>
          <button type="button" onClick={() => setSelectedConsultation(null)}
            style={{
              fontSize:'10px', padding:'4px 10px', borderRadius:'5px',
              border:'1px solid rgba(255,255,255,0.12)', background:'transparent',
              color:'#8888bb', cursor:'pointer', fontFamily:'inherit',
              WebkitUserSelect:'none', userSelect:'none', touchAction:'manipulation',
            }}>← 상담 목록</button>
        </div>
      </div>

      {/* 경계선 (중간 ↔ 오른쪽) */}
      <div onMouseDown={e => startSplitDrag('mid', e)} style={dividerStyle} title="드래그로 폭 조절">
        <div style={dividerGrip} />
      </div>

      {/* ③ 오른쪽: 위(내 입력) / 아래(AI 정리) — 저장·요약·카톡복사 연결됨 */}
      <div style={{width:splitRight+'%', minWidth:0, display:'flex', flexDirection:'column'}}>
        <ConsultantNote
          consultationId={selectedConsultation!.id}
          fontSize={s.fontSize}
          fontFamily={s.fontFamily}
        />
      </div>
    </div>
  )

  // 권한 확인 중이거나 거부되면 본 화면을 렌더링하지 않음
  if (authState !== 'ok') {
    return (
      <div style={{width:'100vw', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#1a1a18'}}>
        <div style={{color:'#FAC775', fontSize:'14px'}}>
          {authState === 'checking' ? '상담사 확인 중...' : '접근 권한이 없습니다.'}
        </div>
      </div>
    )
  }

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

        {/* 🔮 사주명식 — 플로팅 창 열기/닫기 토글 */}
        <button
          onClick={() => setSajuOpen(o => !o)}
          title="사주명식 (하늘도마뱀 양식) 열기/닫기"
          style={{
            fontSize: ms + 'px',
            padding: ms <= 9 ? '1px 5px' : ms <= 11 ? '2px 7px' : '3px 9px',
            borderRadius:'5px',
            border: sajuOpen ? '1px solid rgba(250,199,117,0.6)' : '1px solid rgba(255,255,255,0.08)',
            background: sajuOpen ? 'rgba(250,199,117,0.18)' : 'rgba(255,255,255,0.03)',
            color: sajuOpen ? '#FAC775' : '#8888aa',
            cursor:'pointer', display:'flex', alignItems:'center', gap:'3px', whiteSpace:'nowrap',
            marginLeft:'2px',
          }}>
          <span style={{fontSize:(ms+1)+'px'}}>🔮</span>
          <span>만세력</span>
        </button>

        {/* 📋 상담내역 — 플로팅 창 열기/닫기 토글 */}
        <button
          type="button"
          onClick={() => setHistoryOpen(o => !o)}
          title="이전 상담 내역 열기/닫기"
          style={{
            fontSize: ms + 'px',
            padding: ms <= 9 ? '1px 5px' : ms <= 11 ? '2px 7px' : '3px 9px',
            borderRadius:'5px',
            border: historyOpen ? '1px solid rgba(250,199,117,0.6)' : '1px solid rgba(255,255,255,0.08)',
            background: historyOpen ? 'rgba(250,199,117,0.18)' : 'rgba(255,255,255,0.03)',
            color: historyOpen ? '#FAC775' : '#8888aa',
            cursor:'pointer', display:'flex', alignItems:'center', gap:'3px', whiteSpace:'nowrap',
            marginLeft:'2px', fontFamily:'inherit',
            WebkitUserSelect:'none', userSelect:'none', touchAction:'manipulation',
          }}>
          <span style={{fontSize:(ms+1)+'px'}}>📋</span>
          <span>상담내역</span>
        </button>

        {/* 메뉴 크기 슬라이더 (기존 기능 유지) */}
        <div style={{display:'flex', alignItems:'center', gap:'4px', marginLeft:'8px', borderLeft:'1px solid rgba(255,255,255,0.08)', paddingLeft:'8px'}}>
          <span style={{fontSize:'9px', color:'#444466', whiteSpace:'nowrap'}}>메뉴크기</span>
          <input type="range" min="8" max="13" step="1" value={ms}
            onChange={e => setSettings(prev => ({...prev, menuSize: Number(e.target.value)}))}
            style={{width:'50px', cursor:'pointer'}}
          />
          <span style={{fontSize:'9px', color:'#666688'}}>{ms}</span>
        </div>

        {/* ★상담 시작·종료·경과시간 (2026-07-21 복구)
            원래 ConsultantChat 안에 있었는데 채팅을 빼면서 함께 사라졌다.
            채팅과 무관한 기능이라 별도 부품으로 떼어내 메뉴바에 두었다.
            (가운데 칸은 플로팅 창 놓는 자리라 비워 둔다) */}
        {selectedConsultation && (
          <ConsultTimer
            consultationId={selectedConsultation.id}
            onEnded={() => setSelectedConsultation(null)}
          />
        )}

        {/* 우측: 상담사명 + 로그아웃 */}
        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
          <span style={{fontSize:'11px', color:'#7766aa'}}>{consultantName || '상담사'} 님</span>
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

      {/* ===== 🔮 만세력 (전문가용 · 독립 플로팅 창) ===== */}
      {/* 창 안에서 생년월일을 입력하면 전문가용 만세력 화면을 그대로 띄운다.
          고객 데이터와 무관한 독립 계산기. */}
      <ExpertFloating
        open={sajuOpen}
        onClose={() => setSajuOpen(false)}
      />

      {/* ===== 📋 이전 상담 내역 (독립 플로팅 창) ===== */}
      <HistoryFloating
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        userId={selectedUserId}
        currentConsultationId={selectedConsultation?.id ?? null}
        customerName={customerName}
        fontSize={s.fontSize}
      />
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

// 세로 경계선 스타일 (가운데 칸 위/아래 조절)
const vDividerStyle: React.CSSProperties = {
  height:'6px', flexShrink:0, cursor:'row-resize',
  background:'rgba(255,255,255,0.04)',
  display:'flex', alignItems:'center', justifyContent:'center',
}
const vDividerGrip: React.CSSProperties = {
  height:'2px', width:'28px', borderRadius:'2px', background:'rgba(29,158,117,0.5)',
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
