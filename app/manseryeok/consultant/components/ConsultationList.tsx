'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Consultation = {
  id: string
  customer_phone: string
  status: string
  created_at: string
  paid_amount?: number
  delete_requested_at?: string
  birth_data: {
    year: string
    month: string
    day: string
    gender: string
    hour?: string
    customerName?: string
    consultationType?: string
  }
}

const BRANCH_LIST = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

const TYPE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  personal: { label: '일반', color: '#88aadd', bg: 'rgba(30,60,120,0.3)' },
  couple:   { label: '부부', color: '#b8a9ff', bg: 'rgba(60,52,137,0.3)' },
  love:     { label: '연애', color: '#dd88cc', bg: 'rgba(120,40,100,0.3)' },
  birth:    { label: '출산', color: '#88cc88', bg: 'rgba(30,100,50,0.3)' },
  naming:   { label: '개명', color: '#ddaa44', bg: 'rgba(100,70,10,0.3)' },
}

export default function ConsultationList({
  consultantId,
  onSelect,
  selectedId,
  onDeleteRequest,
  deleteLoading,
}: {
  consultantId: string
  onSelect: (c: Consultation) => void
  selectedId?: string
  onDeleteRequest?: (id: string) => void
  deleteLoading?: string | null
}) {
  const [list, setList] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'waiting' | 'active' | 'done'>('all')

  useEffect(() => {
    if (!consultantId) { setLoading(false); return }
    fetchList()

    const channel = supabase
      .channel('consultation-list')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'consultations',
        filter: `consultant_id=eq.${consultantId}`,
      }, () => fetchList())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [consultantId])

  async function fetchList() {
    const { data } = await supabase
      .from('consultations')
      .select('*')
      .eq('consultant_id', consultantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (data) setList(data)
    setLoading(false)
  }

  const filtered = list.filter(c => {
    if (filter === 'waiting') return c.status === 'paid' && !c.delete_requested_at
    if (filter === 'active')  return c.status === 'in_progress' && !c.delete_requested_at
    if (filter === 'done')    return c.status === 'closed' || c.status === 'completed'
    return !c.delete_requested_at
  })

  const waitingCount = list.filter(c => c.status === 'paid' && !c.delete_requested_at).length

  if (!consultantId) return (
    <div style={{padding:'16px',textAlign:'center',fontSize:'12px',color:'#5555aa'}}>
      상담사 ID가 없습니다
    </div>
  )
  if (loading) return (
    <div style={{padding:'16px',textAlign:'center',fontSize:'12px',color:'#FAC775'}}>
      불러오는 중...
    </div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%'}}>

      {/* 필터 탭 */}
      <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)',marginBottom:'8px',flexShrink:0}}>
        {[
          { key: 'all',     label: '전체' },
          { key: 'waiting', label: waitingCount > 0 ? `대기 ${waitingCount}` : '대기' },
          { key: 'active',  label: '진행' },
          { key: 'done',    label: '완료' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            style={{
              flex: 1, padding: '7px 4px', fontSize: '11px',
              border: 'none', cursor: 'pointer', background: 'transparent',
              borderBottom: filter === f.key ? '2px solid #7766dd' : '2px solid transparent',
              color: filter === f.key ? '#b8a9ff' : '#555577',
              fontWeight: filter === f.key ? '500' : '400',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:'5px'}}>
        {filtered.length === 0 ? (
          <div style={{padding:'20px',textAlign:'center',fontSize:'12px',color:'#5555aa'}}>
            {filter === 'waiting' ? '대기 중인 상담이 없습니다' : '상담 내역이 없습니다'}
          </div>
        ) : filtered.map((c) => {
          const b = c.birth_data
          const hourText = b?.hour && b.hour !== '모름'
            ? `${BRANCH_LIST[parseInt(b.hour)]}시` : ''
          const typeInfo = TYPE_LABELS[b?.consultationType || 'personal'] || TYPE_LABELS.personal
          const isSelected = selectedId === c.id
          const isActive = c.status === 'in_progress'
          const isWaiting = c.status === 'paid'

          // 전화번호 마스킹 (010-****-5678)
          const phone = c.customer_phone || ''
          const maskedPhone = phone.length >= 8
            ? phone.slice(0, 3) + '-****-' + phone.slice(-4)
            : phone

          return (
            <div key={c.id} onClick={() => onSelect(c)}
              style={{
                padding: '9px 10px',
                borderRadius: '10px',
                cursor: 'pointer',
                border: isSelected
                  ? '1px solid rgba(119,102,221,0.6)'
                  : '1px solid rgba(255,255,255,0.05)',
                background: isSelected
                  ? 'rgba(60,52,137,0.25)'
                  : 'rgba(255,255,255,0.02)',
                transition: 'all 0.1s',
              }}>

              {/* 1행: 상태 도트 + 이름/전화 + 가격 */}
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'5px'}}>
                <div style={{
                  width: '6px', height: '6px', borderRadius: '50%', flexShrink: 0,
                  background: isActive ? '#44bb66' : isWaiting ? '#EF9F27' : '#555577',
                }} />
                <span style={{
                  fontSize: '12px', fontWeight: '500',
                  color: '#d8d4ff', flex: 1,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {b?.customerName || maskedPhone}
                </span>
                {c.paid_amount ? (
                  <span style={{fontSize:'11px',color:'#9977cc',fontWeight:'500',flexShrink:0}}>
                    {(c.paid_amount/1000).toFixed(0)}K
                  </span>
                ) : null}
              </div>

              {/* 2행: 유형 뱃지 + 상태 */}
              <div style={{display:'flex',alignItems:'center',gap:'5px',marginBottom:'4px'}}>
                <span style={{
                  fontSize: '10px', padding: '1px 7px', borderRadius: '20px',
                  background: typeInfo.bg, color: typeInfo.color, flexShrink: 0,
                }}>
                  {typeInfo.label}
                </span>
                <span style={{
                  fontSize: '10px', color: isActive ? '#44aa66' : isWaiting ? '#cc9933' : '#555577',
                }}>
                  {isActive ? '진행 중' : isWaiting ? '대기 중' : '완료'}
                </span>
                <span style={{marginLeft:'auto',fontSize:'10px',color:'#444466'}}>
                  {getTimeAgo(c.created_at)}
                </span>
              </div>

              {/* 3행: 생년월일 + 삭제 버튼 */}
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <span style={{fontSize:'11px',color:'#555577'}}>
                  {b?.year}.{b?.month}.{b?.day}
                  {hourText ? ` · ${hourText}` : ''}
                  {b?.gender ? ` · ${b.gender === '여' ? '여성' : '남성'}` : ''}
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteRequest?.(c.id) }}
                  disabled={deleteLoading === c.id}
                  style={{
                    fontSize: '10px', padding: '2px 7px',
                    borderRadius: '20px', border: 'none', cursor: 'pointer',
                    background: 'rgba(255,60,60,0.1)',
                    color: 'rgba(255,100,100,0.6)',
                    flexShrink: 0,
                  }}>
                  {deleteLoading === c.id ? '...' : '삭제요청'}
                </button>
              </div>

            </div>
          )
        })}
      </div>
    </div>
  )
}

function getTimeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000)
  if (diff < 1) return '방금'
  if (diff < 60) return `${diff}분 전`
  const h = Math.floor(diff / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}
