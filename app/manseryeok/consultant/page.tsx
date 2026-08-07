'use client'
import { Suspense, useState, useEffect, useRef } from 'react'
import { useConsultantState } from '@/hooks/useConsultantState'
import { useConsultantSaju } from '@/hooks/useConsultantSaju'
import ConsultationList from './components/ConsultationList'
// 고객 채팅 — 07-20 연결 끊음(부품은 남겨 둠). 되살리려면 이 줄과 사용처 주석만 풀면 된다.
// import ConsultantChat from './components/ConsultantChat'
import ConsultTimer from './components/ConsultTimer'
import { useRoleGate, RoleGateScreen, type AppRole } from '@/hooks/useRoleGate'

// 이 화면에 들어올 수 있는 등급 — 상담사 + 매니저
const STAFF_ROLES: AppRole[] = ['consultant', 'master']
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
    fromParam,
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
  // ★2026-07-21 2차: 매니저가 consultantId 없이 들어오면 누구 화면을 볼지 고르게 한다.
  const [isMaster, setIsMaster] = useState(false)
  const [pickList, setPickList] = useState<{ id: string; name: string }[]>([])

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
  //   ★2026-07-21 2차: 매니저(master)는 이 검사를 건너뛴다.
  //   [왜] 이 검사는 useRoleGate 가 생기기 전부터 있던 것으로,
  //        "로그인 이메일이 consultants 표에 있는가" 만 본다.
  //        매니저는 상담사 명단에 없는 게 정상이라 늘 막혔다.
  //        (실제로 관리자 계정을 상담사 목록에서 지우자 본인이 못 들어가게 됐다)
  //        점검·대리를 위해 매니저는 통과시킨다. — 16-3 권한 설계와 동일한 취지.
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

      // ★매니저 확인 — master 면 상담사 등록 여부와 무관하게 통과
      const { data: me } = await supabase
        .from('profiles').select('role, nickname').eq('id', u.user.id).maybeSingle()
      if (cancelled) return
      if (me?.role === 'master') {
        // URL 의 consultantId 로 그 상담사 이름을 표시한다.
        //   (없으면 아래 '설정 불러오기'가 이름을 채운다)
        setIsMaster(true)
        setConsultantName((me.nickname as string) || '매니저')
        setAuthState('ok')
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

  // ★매니저가 consultantId 없이 들어온 경우 — 누구 화면을 볼지 고르게 한다
  useEffect(() => {
    if (!isMaster || consultantId) return
    supabase.from('consultants').select('id, name').eq('active', true).order('sort')
      .then(({ data }) => setPickList(data ?? []))
  }, [isMaster, consultantId])

  // ---------- 설정 불러오기 ----------
  //   ★2026-08-05 (47부) — 여기서 «이름도» 화면에 넣습니다. [대표님 지시]
  //     [겪은 일]  매니저가 상담사 화면에 들어가도 오른쪽 위에 «매니저 본인 닉네임» 이 떴습니다.
  //     [까닭]  위 138줄 주석에 「URL 의 consultantId 로 그 상담사 이름을 표시한다」라
  //       적혀 있었는데, 정작 이 자리가 name 을 «가져오면서도 안 쓰고» 있었습니다.
  //       (ui_settings 만 쓰고 name 은 버렸습니다)
  //     ⚠️ 상담사 «본인» 은 이미 위에서 con.name 으로 채워집니다. 같은 값이라 탈이 없습니다.
  useEffect(() => {
    if (!consultantId) return
    supabase.from('consultants').select('name, ui_settings')
      .eq('id', consultantId).single()
      .then(({ data }) => {
        if (data?.ui_settings) setSettings({ ...DEFAULT_SETTINGS, ...data.ui_settings })
        if (data?.name) setConsultantName(data.name as string)
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

  // ══════════════════════════════════════════════════════════════════════
  // ★2026-08-05 (47부 3차) — 뒤로가기 [대표님 지시]
  //
  //   [겪은 일]  대표님 — 「들어는 갔으나 뒤로 가기 버튼이 안된다」
  //     ★이 화면에는 뒤로가기 버튼이 «아예 없었습니다». 상단 메뉴바를 전수로 훑어 확인했습니다.
  //
  //   [왜 브라우저 뒤로가기로 안 되나]
  //     관리자 화면(ConsultantTable)에서 오는 길은 ★window.open(…, '_blank') 입니다.
  //     ⇒ «새 탭» 이라 history 가 비어 있어 브라우저 뒤로가기가 «원리상» 안 됩니다.
  //     ⇒ 화면 안 버튼이 반드시 있어야 합니다.
  //
  //   [대표님이 정하신 갈래]
  //     상담사 본인            → 마이페이지
  //     매니저 · 고르기에서 옴  → 상담사 고르기 화면
  //     매니저 · 관리자에서 옴  → 관리자 화면
  //
  //   [어떻게 «어디서 왔는지» 아나]  주소에 from 을 담습니다 (useConsultantState 가 읽습니다).
  //     from=pick   고르기 화면의 상담사 버튼이 붙입니다
  //     from=admin  ConsultantTable 의 「🔮 화면 보기」가 붙입니다
  //
  //   ⚠️ from 이 «없는» 길도 있습니다 — 마이페이지 「🩺 상담 관리」·로그인 직후 welcome.
  //      그때 매니저는 ★고르기 화면으로 보냅니다. «막다른 길이 아닌» 자리이기 때문입니다.
  //      (고르기 화면에는 「← 관리자 화면으로」가 있어 어디로든 갈 수 있습니다)
  //   ⛔ 매니저의 기본값을 /admin 으로 바꾸지 마십시오.
  //      마이페이지에서 온 매니저가 관리자 화면으로 튕겨 «온 길을 잃습니다».
  // ══════════════════════════════════════════════════════════════════════
  const back = (() => {
    // ★상담사 본인 — 관리자 화면에는 못 들어갑니다 (role 이 consultant)
    if (!isMaster) return { href: '/mypage-new', label: '마이페이지' }
    if (fromParam === 'admin') return { href: '/admin', label: '관리자 화면' }
    return { href: '/manseryeok/consultant', label: '상담사 고르기' }
  })()

  // ══════════════════════════════════════════════════════════════════════
  //  ★2026-08-07 (48부 9차) — 매니저는 «언제나» 관리자 화면으로  [대표님 지시]
  //    「관리자(류승현, 오연희)는 ★관리자 페이지와 상담사 관리 화면을
  //      왔다갔다 할 수 있게 해 줘 · 상담사는 상담사 페이지만」
  //
  //  🔴 ★무엇이 모자랐나 — back 은 «온 길»(from) 을 봅니다.
  //     from=admin 으로 오면 관리자 화면으로 돌아가지만,
  //     ★주소를 직접 치거나 북마크로 들어오면 from 이 «없어»
  //     「상담사 고르기」로만 가고 ★관리자 화면으로 갈 길이 없습니다.
  //  ⇒ 매니저에게는 ★온 길과 상관없이 «따로» 버튼을 답니다.
  //
  //  ⛔ 상담사(consultant)에게는 ★보이지 않습니다 — 들어가도 막힙니다
  //     (/admin 은 useRoleGate(['master'])).
  //  ⛔ back 을 /admin 으로 «바꾸지» 마십시오 —
  //     마이페이지에서 온 매니저가 «온 길을 잃습니다» (위 주석 참조).
  // ══════════════════════════════════════════════════════════════════════
  const showAdminLink = isMaster && back.href !== '/admin'

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
  //   ★2026-08-05 (47부) — 크림 톤으로 맞췄습니다. 아래 고르기 화면과 «같은 길목» 이라
  //     여기만 어두우면 마이페이지(크림) → 깜빡 어두움 → 고르기(크림) 로 튑니다.
  //     실측)  '확인 중' #7d6a5b on #FDF6F0 = 4.80:1
  //            '권한 없음' #c14545 on #FDF6F0 = ★4.67:1 (기준 4.5)
  //     ⚠️ 마이페이지의 오류색 #c05a5a 는 이 바탕에서 ★4.04:1 로 «미달» 이라 안 썼습니다.
  //        45부 확정 빨강 #c14545 를 썼습니다.
  if (authState !== 'ok') {
    const denied = authState !== 'checking'
    return (
      <div style={{width:'100vw', minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'#FDF6F0', fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif", boxSizing:'border-box', padding:24}}>
        <div style={{color: denied ? '#c14545' : '#7d6a5b', fontSize:'14px'}}>
          {denied ? '접근 권한이 없습니다.' : '상담사 확인 중...'}
        </div>
      </div>
    )
  }

  // ★매니저가 consultantId 없이 들어온 경우 — 누구 화면을 볼지 고른다 (2026-07-21 2차)
  //
  // ══════════════════════════════════════════════════════════════════════
  // ★2026-08-05 (47부) — 이 화면을 «홈화면과 같은 톤» 으로 바꿨습니다. [대표님 지시]
  //
  //   [무엇이 문제였나]  대표님 —
  //     「마이페이지에서 상담사 관리자 화면으로 들어가면 색상 자체가 이상해」
  //     실제로 재 보니 ★버튼이 «있는지 없는지» 안 보였습니다.
  //       버튼 바탕  rgba(255,255,255,0.06) on #1a1a18 → 대비 ★1.18:1
  //       버튼 테두리 rgba(255,255,255,0.12) on #1a1a18 → 대비 ★1.42:1  (선 기준 3.0)
  //     게다가 바탕은 «따뜻한» 검정(#1a1a18)인데 글자는 «푸른 보라»(#e8e2f5·#8a88a0)라
  //     색기운이 반대로 얹혀 떠 보였습니다.
  //
  //   [왜 어두웠나]  대표님 확인 — 「일부러는 아니야, 하다 보니 어두운 색을 골랐다」
  //     ⇒ 지켜야 할 어두운 테마가 «아닙니다». 그래서 갈아 끼워도 됩니다.
  //     ⚠️ 참고: rename/hanja · rename/result 의 어두운 테마는 «일부러» 입니다 (45부).
  //        그쪽은 이 판단과 무관합니다. 함께 바꾸지 마십시오.
  //
  //   [무엇을 골랐나]  ★새로 짓지 않고 mypage-new/page.tsx 의 색을 «그대로» 빌렸습니다.
  //     바탕 #FDF6F0 · 카드 #FFFBF7 · 선 #9c7a58 · 본문 #3a2e28 · 설명 #7d6a5b
  //     45부에 대비를 재서 확정한 값이라 다시 잴 필요가 없습니다.
  //
  //   [실측 — 바꾼 뒤 대비]
  //     제목 #3a2e28 on #FFFBF7      12.74:1  (기준 4.5)
  //     설명 #7d6a5b on #FDF6F0       4.80:1  (기준 4.5)
  //     버튼 테두리 #9c7a58 on #FDF6F0 ★3.67:1  (기준 3.0) ← 1.42 에서 올렸습니다
  //     관리자 글자 #96502e on #f4ece1  5.15:1  (기준 4.5)
  //
  //   ⛔ 어두운 색으로 되돌리지 마십시오. 되돌리면 버튼 선이 다시 1.42:1 이 됩니다.
  //   ⚠️ 이 화면 «하나만» 바꿨습니다. 상담사 대시보드(#111118)는 그대로입니다.
  //      대시보드까지 옮기려면 부품 열 개 · 색 지정 357군데라 따로 여쭈고 해야 합니다.
  // ══════════════════════════════════════════════════════════════════════
  if (isMaster && !consultantId) {
    return (
      <div style={{width:'100vw', minHeight:'100vh', background:'#FDF6F0', display:'flex',
        flexDirection:'column', alignItems:'center', justifyContent:'center', gap:14, padding:24,
        fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif", boxSizing:'border-box'}}>
        <div style={{color:'#3a2e28', fontSize:16, fontWeight:600}}>어느 상담사의 화면을 볼까요?</div>
        <div style={{color:'#7d6a5b', fontSize:12, textAlign:'center', lineHeight:1.6}}>매니저는 점검·대리를 위해 상담사 화면에 들어갈 수 있어요.</div>
        <div style={{display:'flex', flexDirection:'column', gap:8, width:'100%', maxWidth:320, marginTop:6}}>
          {pickList.length === 0 ? (
            <div style={{color:'#7d6a5b', fontSize:13, textAlign:'center'}}>등록된 상담사가 없어요.</div>
          ) : pickList.map(p => (
            <button key={p.id}
              onClick={() => router.push(`/manseryeok/consultant?consultantId=${p.id}&from=pick`)}
              style={{padding:'13px 0', borderRadius:10, border:'0.5px solid #9c7a58',
                background:'#FFFBF7', color:'#3a2e28', fontSize:14, cursor:'pointer',
                fontFamily:'inherit'}}>
              {p.name} 선생님
            </button>
          ))}
          <button onClick={() => router.push('/admin')}
            style={{padding:'11px 0', borderRadius:10, border:'0.5px solid #96502e',
              background:'#f4ece1', color:'#96502e', fontSize:13, cursor:'pointer', marginTop:4,
              fontFamily:'inherit'}}>
            ← 관리자 화면으로
          </button>
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
        {/* ★2026-08-05 (47부 3차) — 뒤로가기. 위 back 판단을 그대로 씁니다.
            ★라벨에 «갈 곳» 을 적었습니다 — 「← 마이페이지」「← 관리자 화면」「← 상담사 고르기」
              어디로 가는지 안 보이면 누르기가 망설여집니다.
            [대비 실측]  #c8c0ff on 메뉴바(#12121c) = ★11.02:1
              ⚠️ 옆 버튼들의 #8888aa(2.9:1)보다 «일부러» 진하게 했습니다.
                 길을 되찾는 버튼이라 가장 먼저 보여야 합니다.
            ⚠️ 메뉴바 높이가 40px 이라 44px 최소선을 못 맞춥니다. 마우스로 쓰는
               PC 화면이라 그대로 두되 padding 으로 누르는 자리를 넓혔습니다. */}
        <button onClick={() => router.push(back.href)}
          title={`${back.label}(으)로 돌아갑니다`}
          style={{
            fontSize:'12px', padding:'4px 8px', borderRadius:'5px',
            border:'1px solid rgba(200,192,255,0.35)', background:'rgba(255,255,255,0.05)',
            color:'#c8c0ff', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px',
            whiteSpace:'nowrap', marginRight:'6px', fontFamily:'inherit',
            WebkitUserSelect:'none', userSelect:'none', touchAction:'manipulation',
          }}>
          <span style={{fontSize:'14px'}} aria-hidden="true">←</span>
          <span>{back.label}</span>
        </button>

        {/* ★48부 9차 — 매니저는 «언제나» 관리자 화면으로 [대표님 지시]
            ⛔ 상담사에게는 안 보입니다. */}
        {showAdminLink && (
          <button onClick={() => router.push('/admin')}
            title="관리자 화면으로 갑니다"
            style={{
              fontSize:'12px', padding:'4px 8px', borderRadius:'5px',
              border:'1px solid rgba(250,199,117,0.4)', background:'rgba(250,199,117,0.08)',
              color:'#FAC775', cursor:'pointer', display:'flex', alignItems:'center', gap:'4px',
              whiteSpace:'nowrap', marginRight:'6px', fontFamily:'inherit',
              WebkitUserSelect:'none', userSelect:'none', touchAction:'manipulation',
            }}>
            <span style={{fontSize:'13px'}} aria-hidden="true">🔐</span>
            <span>관리자</span>
          </button>
        )}

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
        {/* ★2026-08-05 (47부) — 이름 표시를 둘로 갈랐습니다. [대표님 지시]
            ① 상담사 본인      → 「오금란 님」
            ② 매니저가 대리   → 「오금란 선생님 화면」 + 「매니저 대리」 배지
            [왜 배지를 달았나]  이름만 바꾸면 매니저가 «자기 계정으로 착각» 할 수 있습니다.
              고객 사주·상담 기록을 다루는 화면이라 «누구 자리인지» 가 또렷해야 합니다.
            [대비 실측]  글자색을 #7766aa(★3.78:1) → #9a98b0(★6.64:1) 로 올렸습니다.
              #9a98b0 은 ★이 화면이 이미 쓰던 색입니다 (ConsultTimer·CustomerAiAnalysis).
            ⛔ #7766aa 로 되돌리지 마십시오. */}
        <div style={{marginLeft:'auto', display:'flex', alignItems:'center', gap:'8px'}}>
          {isMaster && consultantId && (
            <span style={{fontSize:'9px', padding:'1px 5px', borderRadius:'4px',
              border:'1px solid rgba(250,199,117,0.5)', color:'#FAC775', whiteSpace:'nowrap'}}>
              매니저 대리
            </span>
          )}
          <span style={{fontSize:'11px', color:'#9a98b0', whiteSpace:'nowrap'}}>
            {consultantName
              ? (isMaster && consultantId ? `${consultantName} 선생님 화면` : `${consultantName} 님`)
              : '상담사'}
          </span>
          <button onClick={handleLogout}
            style={{fontSize:'10px', padding:'2px 8px', borderRadius:'5px', border:'1px solid rgba(193,69,69,0.65)', background:'transparent', color:'rgba(255,100,100,0.7)', cursor:'pointer'}}>
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
      {/* 창 안에서 생년월일을 입력하면 전문가용 만세력 화면을 그대로 띄운다.
          ★2026-08-05 (47부 38차) — 「고른 고객 자동 불러오기」를 «걷어냈습니다». [대표님 지시]
            [까닭]  36·37차에 상담 목록의 고객을 자동으로 불러오게 했는데,
              ★열 화면이 상담 신청 때 «생년월일을 안 실어 보내고» 있었습니다.
              (사주 화면만 searchParams 를 넘깁니다)
              ⇒ 궁합·작명·택일에서 신청한 고객은 birth_data 가 «비어» 있어
                「고른 고객」 갈래가 ★눌리지도 않았습니다.
            ⇒ 대표님이 「자동으로 불러오는 것은 없애고」 하셨습니다.
            ⚠️ 되살리시려면 ★먼저 열 화면이 ConsultButton 에 searchParams 를 넘기게
               고쳐야 합니다. 그러지 않으면 이번과 같은 일이 되풀이됩니다. */}
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
  // ★권한 확인 (2026-07-21)
  //   고객 사주·상담 내역이 보이는 화면이라 직원만 들어올 수 있어야 한다.
  //   매니저도 허용한다 (상담사 화면을 점검·대리할 수 있어야 하므로).
  const gate = useRoleGate(STAFF_ROLES)
  // ★2026-08-05 (47부) — dark={false} 로 크림 갈래를 켰습니다. [대표님 지시]
  //   ★새로 만들지 않았습니다. useRoleGate.tsx 에 크림 갈래가 «이미» 있었습니다.
  //     dark=false → 바탕 #FDF6F0 · 제목 #96502e(5.63:1) · 본문 #5c3a1e(9.44:1)
  //   ⚠️ 이 부품은 admin/page.tsx 도 씁니다. 거기는 «안 건드렸습니다»
  //      (기본값 dark=true 그대로라 관리자 화면은 어두운 채입니다).
  if (gate.state !== 'ok') return <RoleGateScreen gate={gate} dark={false} />

  return (
    <Suspense fallback={
      // ★2026-08-05 (47부) — 크림 톤. 위 authState 대기 화면과 «같은 색» 이어야
      //   들어오는 동안 두 번 깜빡이지 않습니다. (전 #111118 · 글자 #FAC775)
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
        background:'#FDF6F0', fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
        <div style={{color:'#7d6a5b', fontSize:'14px'}}>로딩 중...</div>
      </div>
    }>
      <ConsultantContent />
    </Suspense>
  )
}
