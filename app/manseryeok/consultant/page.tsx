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

  // 상담사 이름 로드
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
      display: 'flex', flexDirection: 'column',
      height: '100vh', background: s.bgColor,
      fontFamily: s.fontFamily, fontSize: s.fontSize + 'px',
    }}>

      {/* 상단 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '0 20px',
        height: '48px', background: s.leftBg, flexShrink: 0,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        gap: '12px',
      }}>
        <span style={{fontSize:'16px',fontWeight:'500',color:'#e8e4ff'}}>명연재</span>
        <span style={{fontSize:'12px',color:'#5555aa'}}>|</span>
        <span style={{fontSize:'13px',color:'#9988cc'}}>{consultantName || '상담사'} 님</span>
        <div style={{marginLeft:'auto',display:'flex',gap:'8px',alignItems:'center'}}>
          <button onClick={() => setShowSettings(prev => !prev)}
            style={{
              fontSize:'12px', padding:'5px 12px', borderRadius:'8px',
              border:'1px solid rgba(255,255,255,0.1)', background:'transparent',
              color:'#8877cc', cursor:'pointer',
            }}>
            ⚙️ 화면 설정
          </button>
          <button onClick={handleLogout}
            style={{
              fontSize:'12px', padding:'5px 12px', borderRadius:'8px',
              border:'1px solid rgba(255,80,80,0.2)', background:'transparent',
              color:'rgba(255,100,100,0.7)', cursor:'pointer',
            }}>
            로그아웃
          </button>
        </div>
      </div>

      {/* 설정 패널 */}
      {showSettings && (
        <div style={{
          position:'fixed', top:'48px', right:'0', width:'300px',
          background:'#1e1e2e', borderLeft:'1px solid rgba(255,255,255,0.08)',
          borderBottom:'1px solid rgba(255,255,255,0.08)',
          padding:'16px', zIndex:100, boxShadow:'-4px 4px 20px rgba(0,0,0,0.4)',
          borderRadius:'0 0 0 12px',
        }}>
          <div style={{fontSize:'13px',fontWeight:'500',color:'#e8e4ff',marginBottom:'14px'}}>
            화면 설정
          </div>

          {/* 색상 설정 */}
          {[
            { label: '전체 배경', key: 'bgColor' },
            { label: '좌측·우측 패널', key: 'leftBg' },
            { label: '채팅 배경', key: 'chatBg' },
            { label: '내 메시지 버블', key: 'myBubble' },
            { label: '고객 메시지 버블', key: 'customerBubble' },
          ].map(({ label, key }) => (
            <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'10px'}}>
              <span style={{fontSize:'12px',color:'#8877aa'}}>{label}</span>
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <input
                  type="color"
                  value={(s as any)[key]}
                  onChange={e => setSettings(prev => ({...prev, [key]: e.target.value}))}
                  style={{width:'36px',height:'28px',border:'none',borderRadius:'6px',cursor:'pointer',background:'transparent'}}
                />
                <span style={{fontSize:'11px',color:'#555577'}}>{(s as any)[key]}</span>
              </div>
            </div>
          ))}

          {/* 폰트 크기 */}
          <div style={{marginBottom:'12px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:'6px'}}>
              <span style={{fontSize:'12px',color:'#8877aa'}}>폰트 크기</span>
              <span style={{fontSize:'12px',color:'#b8a9ff'}}>{s.fontSize}px</span>
            </div>
            <input type="range" min="11" max="16" step="1"
              value={s.fontSize}
              onChange={e => setSettings(prev => ({...prev, fontSize: Number(e.target.value)}))}
              style={{width:'100%',cursor:'pointer'}}
            />
          </div>

          {/* 폰트 종류 */}
          <div style={{marginBottom:'14px'}}>
            <div style={{fontSize:'12px',color:'#8877aa',marginBottom:'8px'}}>폰트 종류</div>
            <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {[
                { label: '기본', value: 'var(--font-sans)' },
                { label: '명조', value: 'Batang, serif' },
                { label: '고딕', value: 'Malgun Gothic, sans-serif' },
                { label: '둥근고딕', value: 'Apple SD Gothic Neo, sans-serif' },
              ].map(f => (
                <button key={f.value}
                  onClick={() => setSettings(prev => ({...prev, fontFamily: f.value}))}
                  style={{
                    fontSize:'11px', padding:'4px 10px', borderRadius:'8px',
                    border: s.fontFamily === f.value ? '1px solid #7766dd' : '1px solid rgba(255,255,255,0.1)',
                    background: s.fontFamily === f.value ? '#2d2060' : 'transparent',
                    color: s.fontFamily === f.value ? '#c8b0ff' : '#666688',
                    cursor:'pointer',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* 저장·초기화 */}
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={handleSaveSettings}
              style={{
                flex:1, padding:'8px', borderRadius:'8px', border:'none',
                background:'#3d2a88', color:'#c8b0ff', fontSize:'12px', cursor:'pointer',
              }}>
              저장
            </button>
            <button onClick={() => setSettings(DEFAULT_SETTINGS)}
              style={{
                padding:'8px 12px', borderRadius:'8px', border:'1px solid rgba(255,255,255,0.1)',
                background:'transparent', color:'#666688', fontSize:'12px', cursor:'pointer',
              }}>
              초기화
            </button>
          </div>
        </div>
      )}

      {/* 3분할 본문 */}
      <div style={{
        display:'grid', gridTemplateColumns:'220px 1fr 280px',
        flex:1, gap:'1px', overflow:'hidden',
      }}>

        {/* 좌측: 고객 리스트 */}
        <div style={{background:s.leftBg, display:'flex', flexDirection:'column', overflow:'hidden'}}>
          <div style={{
            padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)',
            display:'flex', alignItems:'center', gap:'8px', flexShrink:0,
          }}>
            <span style={{fontSize:'13px',fontWeight:'500',color:'#e8e4ff'}}>상담 목록</span>
            <span style={{
              marginLeft:'auto', fontSize:'10px',
              background:'rgba(255,100,100,0.15)', color:'#ff8888',
              padding:'2px 8px', borderRadius:'20px',
            }}>대기 중</span>
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
          <div style={{
            padding:'10px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)',
            display:'flex', alignItems:'center', gap:'8px', flexShrink:0,
          }}>
            <span style={{fontSize:'13px',fontWeight:'500',color:'#e8e4ff'}}>AI 분석</span>
            <div style={{marginLeft:'auto', display:'flex', gap:'5px'}}>
              {['AI 분석','사주 보기'].map((label, i) => (
                <button key={label} onClick={() => setShowSaju(i === 1)}
                  style={{
                    fontSize:'11px', padding:'3px 10px', borderRadius:'20px',
                    border:'none', cursor:'pointer',
                    background: (i === 1) === showSaju ? '#2d2060' : 'rgba(255,255,255,0.06)',
                    color: (i === 1) === showSaju ? '#b8a9ff' : '#666688',
                  }}>
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
