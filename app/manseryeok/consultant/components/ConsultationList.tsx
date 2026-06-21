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
  personal:   { label: '일반 상담',  color: '#88aadd', bg: 'rgba(30,60,120,0.3)' },
  couple:     { label: '부부 상담',  color: '#b8a9ff', bg: 'rgba(60,52,137,0.3)' },
  love:       { label: '연애 궁합',  color: '#dd88cc', bg: 'rgba(120,40,100,0.3)' },
  birth:      { label: '출산 시기',  color: '#88cc88', bg: 'rgba(30,100,50,0.3)' },
  naming:     { label: '개명 분석',  color: '#ddaa44', bg: 'rgba(100,70,10,0.3)' },
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
    <div style={{padding:'20px',textAlign:'center',fontSize:'12px',color:'#5555aa'}}>상담사 ID가 없습니다</div>
  )
  if (loading) return (
    <div style={{padding:'20px',textAlign:'center',fontSize:'12px',color:'#FAC775'}}>불러오는 중...</div>
  )

  return (
    <div style={{display:'flex',flexDirection:'column',gap:'0',height:'100%'}}>

      {/* 필터 탭 */}
      <div style={{display:'flex',gap:'0',padding:'8px 0',borderBottom:'1px solid rgba(255,255,255,0.06)',marginBottom:'8px',flexShrink:0}}>
        {[
          { key: 'all', label: '전체' },
          { key: 'waiting', label: `대기${waitingCount > 0 ? ` ${waitingCount}` : ''}` },
          { key: 'active', label: '진행' },
          { key: 'done', label: '완료' },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key as any)}
            style={{
              flex: 1, padding: '5px 4px', fontSize: '11px', border: 'none', cursor: 'pointer',
              background: 'transparent', borderBottom: filter === f.key ? '2px solid #7766dd' : '2px solid transparent',
              color: filter === f.key ? '#b8a9ff' : '#5555aa', fontWeight: filter === f.key ? '500' : '400',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {/* 리스트 */}
      <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column',gap:'6px'}}>
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
          const isWaiting = c.status === 'paid'
          const isActive = c.status === 'in_progress'

          return (
            <div key={c.id}
              onClick={() => onSelect(c)}
              style={{
                padding: '10px 12px', borderRadius: '10px', cursor: 'pointer',
                border: isSelected ? '1px solid #5544aa' : '1px solid rgba(255,255,255,0.06)',
                background: isSelected ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.1s',
              }}>

              {/* 상단: 이름 + 상태 + 삭제 */}
              <div style={{display:'flex',alignItems:'center',gap:'6px',marginBottom:'5px'}}>
                <div style={{
                  width: '7px', height: '7px', borderRadius: '50%', flexShrink: 0,
                  background: isActive ? '#44bb66' : isWaiting ? '#EF9F27' : '#666688',
                }} />
                <span style={{fontSize:'13px',fontWeight:'500',color:'#e8e4ff',flex:1}}>
                  {b?.customerName || c.customer_phone}
                </span>
                {c.paid_amount && (
                  <span style={{fontSize:'11px',color:'#9977ff',fontWeight:'500'}}>
                    {c.paid_amount.toLocaleString()}원
                  </span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onDeleteRequest?.(c.id)
                  }}
                  disabled={deleteLoading === c.id}
                  style={{
                    fontSize: '10px', padding: '2px 7px', borderRadius: '20px', border: 'none',
                    background: 'rgba(255,80,80,0.12)', color: 'rgba(255,120,120,0.7)',
                    cursor: 'pointer', flexShrink: 0,
                  }}>
                  {deleteLoading === c.id ? '...' : '삭제요청'}
                </button>
              </div>

              {/* 상담 유형 뱃지 */}
              <div style={{marginBottom:'4px'}}>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '20px',
                  background: typeInfo.bg, color: typeInfo.color,
                }}>
                  {typeInfo.label}
                </span>
              </div>

              {/* 생년월일 */}
              <div style={{fontSize:'11px',color:'rgba(255,255,255,0.4)'}}>
                {b?.year}.{b?.month}.{b?.day} {hourText} · {b?.gender === '여' ? '여성' : '남성'}
              </div>

              {/* 대기 시간 */}
              <div style={{fontSize:'10px',color:'#444466',marginTop:'3px'}}>
                {isWaiting ? `대기 중 · ${getTimeAgo(c.created_at)}` :
                 isActive ? `진행 중 · ${getTimeAgo(c.created_at)}` :
                 `완료 · ${new Date(c.created_at).toLocaleDateString('ko-KR')}`}
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
