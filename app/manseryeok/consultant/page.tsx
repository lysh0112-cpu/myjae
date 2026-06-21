'use client'
import { Suspense, useState, useEffect } from 'react'
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
  leftBg: string
  rightBg: string
  chatBg: string
  myBubble: string
  customerBubble: string
  fontSize: number
  fontFamily: string
}

const DEFAULT_SETTINGS: UiSettings = {
  bgColor: '#111118',
  leftBg: '#1a1a24',
  rightBg: '#1a1a24',
  chatBg: '#13131e',
  myBubble: '#3d3488',
  customerBubble: '#2a2a3a',
  fontSize: 13,
  fontFamily: 'var(--font-sans)',
}

function ConsultantContent() {
  const router = useRouter()
  const {
    tab, setTab,
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

  const [showSaju, setShowSaju] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null)
  const [consultantName, setConsultantName] = useState('')
  const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS)

  useEffect(() => {
    if (!consultantId) return
    supabase.from('consultants').select('name, ui_settings')
      .eq('id', consultantId).single()
      .then(({ data }) => {
        if (data?.name) setConsultantName(data.name)
        if (data?.ui_settings) setSettings({ ...DEFAULT_SETTINGS, ...data.ui_settings })
      })
  }, [consultantId])

  async function handleSaveSettings() {
    if (!consultantId) return
    await supabase.from('consultants')
      .update({ ui_settings: settings })
      .eq('id', consultantId)
    setShowSettings(false)
    alert('설정이 저장됐어요!')
  }

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

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100vh',
      background: s.bgColor, fontFamily: s.fontFamily, fontSize: s.fontSize + 'px',
    }}>

      {/* 상단 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 20px',
        height: '48px', background: s.leftBg, flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)', gap: '12px',
      }}>
        <span style={{fontSize:'16px', fontWeight:'500', color:'#e8e4ff'}}>명연재</span>
        <span style={{fontSize:'12px', color:'#5555aa'}}>|</span>
        <span style={{fontSize:'13px', color:'#9988cc'}}>{consultantName || '상담사'} 님</span>
        <div style={{marginLeft:'auto', display:'flex', gap:'8px', alignItems:'center'}}>
          <button onClick={() => setShowSettings(prev => !prev)}
            style={{fontSize:'12px', padding:'5px 12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)', background:'transparent', color:'#8877cc', cursor:'pointer'}}>
            ⚙️ 화면 설정
          </button>
          <button onClick={handleLogout}
            style={{fontSize:'12px', padding:'5px 12px', borderRadius:'8px', border:'1px solid rgba(255,80,80,0.2)', background:'transparent', color:'rgba(255,100,100,0.7)', cursor:'pointer'}}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 설정 패널 — 컴팩트 한 줄 */}
      {showSettings && (
        <div style={{
          position:'fixed', top:'48px', right:'0', zIndex:100,
          background:'#16161f', borderLeft:'1px solid rgba(255,255,255,0.08)',
          borderBottom:'1px solid rgba(255,255,255,0.08)',
          borderRadius:'0 0 0 8px', padding:'7px 12px',
          boxShadow:'-4px 4px 16px rgba(0,0,0,0.5)',
          display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap',
        }}>
          {[
            { label:'배경', key:'bgColor' },
            { label:'채팅', key:'chatBg' },
            { label:'내버블', key:'myBubble' },
            { label:'고객버블', key:'customerBubble' },
          ].map(({ label, key }) => (
            <div key={key} style={{display:'flex', alignItems:'center', gap:'3px'}}>
              <span style={{fontSize:'10px', color:'#555577'}}>{label}</span>
              <label style={{position:'relative', cursor:'pointer'}}>
                <div style={{width:'16px', height:'16px', borderRadius:'2px', background:(s as any)[key], border:'1px solid rgba(255,255,255,0.2)', cursor:'pointer'}}/>
                <input type="color" value={(s as any)[key]}
                  onChange={e => setSettings(prev => ({...prev, [key]: e.target.value}))}
                  style={{position:'absolute', opacity:0, width:'16px', height:'16px', top:0, left:0, cursor:'pointer'}}
                />
              </label>
            </div>
          ))}
          <div style={{width:'1px', height:'16px', background:'rgba(255,255,255,0.08)'}}/>
          <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
            <span style={{fontSize:'10px', color:'#555577'}}>크기</span>
            <input type="range" min="11" max="16" step="1" value={s.fontSize}
              onChange={e => setSettings(prev => ({...prev, fontSize: Number(e.target.value)}))}
              style={{width:'60px', cursor:'pointer'}}
            />
            <span style={{fontSize:'10px', color:'#b8a9ff'}}>{s.fontSize}px</span>
          </div>
          <div style={{display:'flex', alignItems:'center', gap:'4px'}}>
            <span style={{fontSize:'10px', color:'#555577'}}>폰트</span>
            <select value={s.fontFamily}
              onChange={e => setSettings(prev => ({...prev, fontFamily: e.target.value}))}
              style={{fontSize:'11px', padding:'2px 4px', borderRadius:'4px', background:'#1e1e2e', color:'#c8c0ff', border:'1px solid rgba(255,255,255,0.1)', cursor:'pointer'}}>
              <option value="var(--font-sans)">기본</option>
              <option value="Batang, serif">명조</option>
              <option value="Malgun Gothic, sans-serif">고딕</option>
              <option value="Apple SD Gothic Neo, sans-serif">둥근고딕</option>
            </select>
          </div>
          <div style={{width:'1px', height:'16px', background:'rgba(255,255,255,0.08)'}}/>
          <div style={{display:'flex', gap:'4px'}}>
            <button onClick={handleSaveSettings}
              style={{fontSize:'11px', padding:'3px 10px', borderRadius:'5px', border:'none', background:'#3d2a88', color:'#c8b0ff', cursor:'pointer'}}>
              저장
            </button>
            <button onClick={() => setSettings(DEFAULT_SETTINGS)}
              style={{fontSize:'11px', padding:'3px 8px', borderRadius:'5px', border:'1px solid rgba(255,255,255,0.08)', background:'transparent', color:'#555577', cursor:'pointer'}}>
              초기화
            </button>
            <button onClick={() => setShowSettings(false)}
              style={{fontSize:'11px', padding:'3px 6px', borderRadius:'5px', border:'none', background:'transparent', color:'#444466', cursor:'pointer'}}>
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 3분할 본문 */}
      <div style={{display:'grid', gridTemplateColumns:'220px 1fr 280px', flex:1, gap:'1px', overflow:'hidden'}}>

        {/* 좌측: 고객 리스트 */}
        <div style={{background:s.leftBg, display:'flex', flexDirection:'column', overflow:'hidden'}}>
          <div style={{padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'8px', flexShrink:0}}>
            <span style={{fontSize:'13px', fontWeight:'500', color:'#e8e4ff'}}>상담 목록</span>
            <span style={{marginLeft:'auto', fontSize:'10px', background:'rgba(255,100,100,0.15)', color:'#ff8888', padding:'2px 8px', borderRadius:'20px'}}>대기 중</span>
          </div>
          <div style={{flex:1, overflowY:'auto', padding:'8px'}}>
            <ConsultationList
              consultantId={consultantId}
              onSelect={(consultation) => {
                handleSelectConsultation(consultation)
                setShowSaju(false)
                setShowSettings(false)
              }}
              selectedId={selectedConsultation?.id}
              onDeleteRequest={handleDeleteRequest}
              deleteLoading={deleteLoading}
            />
          </div>
        </div>

        {/* 가운데: 채팅창 */}
        <div style={{background:s.chatBg, display:'flex', flexDirection:'column', overflow:'hidden'}}>
          {selectedConsultation ? (
            <ConsultantChat
              consultationId={selectedConsultation.id}
              customerPhone={selectedConsultation.customer_phone}
              onBack={() => setSelectedConsultation(null)}
              onViewSaju={() => setShowSaju(prev => !prev)}
              pcMode={true}
              myBubbleColor={s.myBubble}
              customerBubbleColor={s.customerBubble}
              fontSize={s.fontSize}
            />
          ) : (
            <div style={{flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:'12px'}}>
              <span style={{fontSize:'32px'}}>💬</span>
              <span style={{fontSize:'13px', color:'#5555aa'}}>좌측에서 고객을 선택해주세요</span>
            </div>
          )}
        </div>

        {/* 우측: AI 분석 */}
        <div style={{background:s.rightBg, display:'flex', flexDirection:'column', overflow:'hidden'}}>
          <div style={{padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'8px', flexShrink:0}}>
            <span style={{fontSize:'13px', fontWeight:'500', color:'#e8e4ff'}}>AI 분석</span>
            <div style={{marginLeft:'auto', display:'flex', gap:'5px'}}>
              {['AI 분석','사주 보기'].map((label, i) => (
                <button key={label} onClick={() => setShowSaju(i === 1)}
                  style={{fontSize:'11px', padding:'3px 10px', borderRadius:'20px', border:'none', cursor:'pointer', background:(i === 1) === showSaju ? '#2d2060' : 'rgba(255,255,255,0.06)', color:(i === 1) === showSaju ? '#b8a9ff' : '#666688'}}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div style={{flex:1, overflowY:'auto', padding:'12px'}}>
            {selectedConsultation ? (
              showSaju ? (
                <ConsultantSajuTab
                  saju={saju} dayStem={dayStem} converting={converting}
                  iljji={iljji} yeonjji={yeonjji} yeangan={yeangan}
                  dayunList={dayunList} seyunList={seyunList}
                  yearParam={yearParam} gender={gender} calType={calType}
                  monthParam={monthParam} dayParam={dayParam} hourIdx={hourIdx}
                  customerName={customerName} consultationId={consultationId}
                  customerPhone={customerPhone} consultantId={consultantId}
                  onFormSubmit={handleFormSubmit}
                  onConsultationStarted={(id, phone) => {
                    setConsultationId(id)
                    setCustomerPhone(phone)
                  }}
                />
              ) : (
                <CustomerAiAnalysis
                  consultationId={selectedConsultation.id}
                  saju={saju} gender={gender} calType={calType}
                  yearParam={yearParam} monthParam={monthParam}
                  dayParam={dayParam} hourIdx={hourIdx}
                />
              )
            ) : (
              <div style={{display:'flex', alignItems:'center', justifyContent:'center', height:'100%', flexDirection:'column', gap:'12px'}}>
                <span style={{fontSize:'32px'}}>🔮</span>
                <span style={{fontSize:'13px', color:'#5555aa'}}>고객 선택 시 분석이 표시됩니다</span>
              </div>
            )}
          </div>
        </div>

      </div>
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
