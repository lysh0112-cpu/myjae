'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'

type Consultation = {
  id: string
  customer_phone: string
  customer_name?: string
  status: string
  created_at: string
  started_at?: string | null
  completed_at?: string | null
  user_id?: string | null
  delete_requested_at?: string
  birth_data: {
    year?: string
    month?: string
    day?: string
    gender?: string
    hour?: string
    calType?: string
    leapMonth?: string
    customerName?: string
    consultationType?: string
  }
}

type Profile = {
  id: string
  email?: string | null
  nickname?: string | null
  birth_year?: string | number | null
  birth_month?: string | number | null
  birth_day?: string | number | null
  cal_type?: string | null
  leap_month?: string | null
  gender?: string | null
}

// 상담요청 구분 라벨
const TYPE_LABELS: Record<string, string> = {
  personal: '개인상담',
  couple: '연인궁합',
  married: '부부궁합',
  prewedding: '예비부부',
  love: '연애궁합',
  birth: '출산시기',
  naming: '개명',
  mulsang: '물상도',
}

type Period = 'today' | 'week' | 'month' | 'custom'

// 날짜 → YYYY-MM-DD
function ymd(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

// 완료 시각 → "7/3 14:35"
function fmtCompleted(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const mo = d.getMonth() + 1
  const da = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${da} ${hh}:${mi}`
}

// 상담시간(소요) 계산
function fmtDuration(start: string | null | undefined, end: string | null | undefined): string {
  if (!start) return '—'
  if (!end) return '진행중'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (ms <= 0) return '—'
  const min = Math.round(ms / 60000)
  if (min < 60) return `${min}분`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m > 0 ? `${h}시간 ${m}분` : `${h}시간`
}

export default function ConsultationList({
  consultantId,
  onSelect,
  selectedId,
}: {
  consultantId: string
  onSelect: (c: Consultation) => void
  selectedId?: string
  onDeleteRequest?: (id: string) => void
  deleteLoading?: string | null
}) {
  const [list, setList] = useState<Consultation[]>([])
  const [profiles, setProfiles] = useState<Record<string, Profile>>({})
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  // 완료일자 기준 기간 필터
  const [period, setPeriod] = useState<Period>('month')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')

  const fetchList = useCallback(async () => {
    if (!consultantId) { setLoading(false); return }
    const { data } = await supabase
      .from('consultations')
      .select('*')
      .eq('consultant_id', consultantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    const rows = (data as Consultation[]) ?? []
    setList(rows)

    // 회원(profiles) 정보 한 번에 조회
    const userIds = Array.from(new Set(rows.map(r => r.user_id).filter(Boolean))) as string[]
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, email, nickname, birth_year, birth_month, birth_day, cal_type, leap_month, gender')
        .in('id', userIds)
      const map: Record<string, Profile> = {}
      for (const p of (profs as Profile[]) ?? []) map[p.id] = p
      setProfiles(map)
    }
    setLoading(false)
  }, [consultantId])

  useEffect(() => {
    fetchList()
    if (!consultantId) return
    const channel = supabase
      .channel('consultation-list')
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'consultations',
        filter: `consultant_id=eq.${consultantId}`,
      }, () => fetchList())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [consultantId, fetchList])

  // 시작 버튼 → started_at 기록, status=in_progress
  async function handleStart(e: React.MouseEvent, c: Consultation) {
    e.stopPropagation()
    setBusyId(c.id)
    try {
      await supabase.from('consultations')
        .update({ started_at: new Date().toISOString(), status: 'in_progress' })
        .eq('id', c.id)
      await fetchList()
    } catch (err) { console.error(err); alert('시작 처리 중 문제가 생겼어요.') }
    finally { setBusyId(null) }
  }

  // 완료 버튼 → completed_at 기록, status=completed
  async function handleComplete(e: React.MouseEvent, c: Consultation) {
    e.stopPropagation()
    setBusyId(c.id)
    try {
      await supabase.from('consultations')
        .update({ completed_at: new Date().toISOString(), status: 'completed' })
        .eq('id', c.id)
      await fetchList()
    } catch (err) { console.error(err); alert('완료 처리 중 문제가 생겼어요.') }
    finally { setBusyId(null) }
  }

  // 기간 범위 계산
  function periodRange(): { from: string; to: string } {
    const now = new Date()
    if (period === 'today') {
      return { from: ymd(now), to: ymd(now) }
    }
    if (period === 'week') {
      const day = now.getDay()
      const mon = new Date(now); mon.setDate(now.getDate() - ((day + 6) % 7))
      const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
      return { from: ymd(mon), to: ymd(sun) }
    }
    if (period === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1)
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      return { from: ymd(first), to: ymd(last) }
    }
    return { from: customFrom, to: customTo }
  }

  const { from, to } = periodRange()

  // 완료일자 기준 필터: 완료된 건 중 기간 안, 그리고 아직 미완료(대기·진행)도 함께 표시
  const filtered = list.filter(c => {
    if (c.delete_requested_at) return false
    // 완료된 건은 완료일이 기간 안일 때만
    if (c.completed_at) {
      const day = ymd(new Date(c.completed_at))
      if (from && day < from) return false
      if (to && day > to) return false
      return true
    }
    // 아직 완료 안 된 건(대기·진행)은 항상 표시
    return true
  })

  // 한 행의 표시 데이터 (profiles 우선, 없으면 birth_data 폴백)
  function rowData(c: Consultation) {
    const p = c.user_id ? profiles[c.user_id] : undefined
    const b = c.birth_data || {}
    const name = c.customer_name || b.customerName || '—'
    const email = p?.email || '—'
    const phone = c.customer_phone || '—'
    const nickname = p?.nickname || '—'
    const by = p?.birth_year ?? b.year
    const bm = p?.birth_month ?? b.month
    const bd = p?.birth_day ?? b.day
    const birth = by ? `${by}.${bm}.${bd}` : '—'
    const cal = p?.cal_type || b.calType || '—'
    const leap = (p?.leap_month === '윤달' || b.leapMonth === '1' || b.leapMonth === '윤달') ? '윤달' : '평달'
    const gender = p?.gender || b.gender || '—'
    const reqType = TYPE_LABELS[b.consultationType || 'personal'] || '개인상담'
    return { name, email, phone, nickname, birth, cal, leap, gender, reqType }
  }

  // [테스트용] 상담 건 하나 삭제 (연결된 couples 등은 cascade로 함께 삭제됨)
  async function handleDeleteOne(e: React.MouseEvent, c: Consultation) {
    e.stopPropagation()
    if (!confirm('이 상담 건을 삭제할까요? 되돌릴 수 없어요. (테스트용)')) return
    setBusyId(c.id)
    try {
      await supabase.from('consultations').delete().eq('id', c.id)
      await fetchList()
    } catch (err) {
      console.error(err)
      alert('삭제 중 문제가 생겼어요.')
    } finally {
      setBusyId(null)
    }
  }

  // [테스트용] 이 상담사의 상담 건 전부 초기화
  async function handleResetAll() {
    if (list.length === 0) { alert('삭제할 상담 내역이 없어요.'); return }
    if (!confirm(`이 상담사의 상담 내역 ${list.length}건을 모두 삭제할까요?\n되돌릴 수 없어요. (테스트용)`)) return
    if (!confirm('정말 전부 삭제합니다. 계속할까요?')) return
    try {
      await supabase.from('consultations').delete().eq('consultant_id', consultantId)
      await fetchList()
      alert('테스트 상담 내역을 모두 삭제했어요.')
    } catch (err) {
      console.error(err)
      alert('초기화 중 문제가 생겼어요.')
    }
  }

  // 엑셀(CSV) 내보내기
  function exportCsv() {
    const headers = ['이름', '이메일', '연락처', '닉네임', '생년월일', '음/양력', '윤/평달', '성별', '상담요청', '상태', '완료일자', '상담시간']
    const lines = [headers.join(',')]
    for (const c of filtered) {
      const r = rowData(c)
      const status = c.completed_at ? '완료' : c.started_at ? '진행중' : '대기'
      const completed = c.completed_at ? fmtCompleted(c.completed_at) : ''
      const dur = fmtDuration(c.started_at, c.completed_at)
      const cells = [r.name, r.email, r.phone, r.nickname, r.birth, r.cal, r.leap, r.gender, r.reqType, status, completed, dur]
      lines.push(cells.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    }
    const csv = '\uFEFF' + lines.join('\n') // BOM: 엑셀 한글 깨짐 방지
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `상담목록_${ymd(new Date())}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!consultantId) return (
    <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#5555aa' }}>상담사 ID가 없습니다</div>
  )
  if (loading) return (
    <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#FAC775' }}>불러오는 중...</div>
  )

  const th: React.CSSProperties = {
    textAlign: 'left', padding: '8px 6px', color: '#b8a9ff', fontWeight: 600,
    borderBottom: '1px solid rgba(255,255,255,0.1)', whiteSpace: 'nowrap',
  }
  const td: React.CSSProperties = { padding: '8px 6px', color: '#cfcdc7', whiteSpace: 'nowrap' }

  const completedCount = filtered.filter(c => c.completed_at).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* 상단: 기간 필터 + 엑셀 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', flexShrink: 0 }}>
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#e8e4ff' }}>상담목록</span>
        <span style={{ fontSize: '11px', color: '#8a88a0' }}>완료 {completedCount}건</span>

        <span style={{ fontSize: '10px', color: '#66657a', marginLeft: '6px' }}>완료일 기준</span>
        {([['today', '오늘'], ['week', '이번주'], ['month', '이번달']] as [Period, string][]).map(([k, label]) => (
          <button key={k} onClick={() => setPeriod(k)}
            style={{
              fontSize: '10px', padding: '4px 10px', borderRadius: '14px', cursor: 'pointer',
              border: period === k ? '1px solid rgba(119,102,221,0.5)' : '1px solid rgba(255,255,255,0.08)',
              background: period === k ? 'rgba(60,52,137,0.35)' : 'transparent',
              color: period === k ? '#c8b0ff' : '#8888aa',
            }}>
            {label}
          </button>
        ))}
        <input type="date" value={customFrom}
          onChange={e => { setCustomFrom(e.target.value); setPeriod('custom') }}
          style={{ fontSize: '10px', padding: '3px 6px', height: '26px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', color: '#cfcdc7' }} />
        <span style={{ color: '#66657a', fontSize: '10px' }}>~</span>
        <input type="date" value={customTo}
          onChange={e => { setCustomTo(e.target.value); setPeriod('custom') }}
          style={{ fontSize: '10px', padding: '3px 6px', height: '26px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '5px', color: '#cfcdc7' }} />

        <button onClick={exportCsv}
          style={{ marginLeft: 'auto', fontSize: '11px', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(97,196,89,0.4)', background: 'rgba(97,196,89,0.12)', color: '#97c459', cursor: 'pointer' }}>
          ⬇ 엑셀로 내보내기
        </button>
        <button onClick={handleResetAll}
          title="테스트용: 내 상담 내역 전부 삭제"
          style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '6px', border: '1px solid rgba(226,75,74,0.4)', background: 'rgba(226,75,74,0.12)', color: '#e57373', cursor: 'pointer' }}>
          🗑 테스트 초기화
        </button>
      </div>

      {/* 표 (왼쪽 정렬, 오른쪽 여백) */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ maxWidth: '1000px' }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', fontSize: '12px', color: '#5555aa' }}>해당 기간의 상담 내역이 없습니다</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.04)' }}>
                  <th style={th}>이름</th>
                  <th style={th}>이메일</th>
                  <th style={th}>연락처</th>
                  <th style={th}>닉네임</th>
                  <th style={th}>생년월일</th>
                  <th style={{ ...th, textAlign: 'center' }}>음/양</th>
                  <th style={{ ...th, textAlign: 'center' }}>윤/평</th>
                  <th style={{ ...th, textAlign: 'center' }}>성별</th>
                  <th style={th}>상담요청</th>
                  <th style={{ ...th, textAlign: 'center' }}>상태</th>
                  <th style={{ ...th, textAlign: 'center' }}>완료일자</th>
                  <th style={{ ...th, textAlign: 'center' }}>상담시간</th>
                  <th style={{ ...th, textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const r = rowData(c)
                  const isSelected = selectedId === c.id
                  const isBusy = busyId === c.id
                  const gColor = r.gender === '여' ? '#e57373' : r.gender === '남' ? '#64b5f6' : '#8a88a0'

                  return (
                    <tr key={c.id} onClick={() => onSelect(c)}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        cursor: 'pointer',
                        background: isSelected ? 'rgba(60,52,137,0.25)' : 'transparent',
                      }}>
                      <td style={{ ...td, color: '#e8e2f5', fontWeight: 600 }}>{r.name}</td>
                      <td style={{ ...td, color: '#a8a6c0' }}>{r.email}</td>
                      <td style={{ ...td, color: '#a8a6c0' }}>{r.phone}</td>
                      <td style={{ ...td, color: '#a8a6c0' }}>{r.nickname}</td>
                      <td style={td}>{r.birth}</td>
                      <td style={{ ...td, textAlign: 'center' }}>{r.cal}</td>
                      <td style={{ ...td, textAlign: 'center', color: r.leap === '윤달' ? '#FAC775' : '#8a88a0' }}>{r.leap}</td>
                      <td style={{ ...td, textAlign: 'center', color: gColor, fontWeight: 600 }}>{r.gender}</td>
                      <td style={td}>
                        <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '10px', background: 'rgba(119,102,221,0.18)', color: '#b8a9ff' }}>{r.reqType}</span>
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        {c.completed_at ? (
                          <span style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(97,196,89,0.4)', background: 'rgba(97,196,89,0.15)', color: '#97c459', fontWeight: 600 }}>✓ 완료</span>
                        ) : c.started_at ? (
                          <button onClick={e => handleComplete(e, c)} disabled={isBusy}
                            style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(55,138,221,0.5)', background: 'rgba(55,138,221,0.2)', color: '#64b5f6', cursor: 'pointer', fontWeight: 600, opacity: isBusy ? 0.5 : 1 }}>
                            ■ 완료
                          </button>
                        ) : (
                          <button onClick={e => handleStart(e, c)} disabled={isBusy}
                            style={{ fontSize: '10px', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(250,199,117,0.5)', background: 'rgba(250,199,117,0.15)', color: '#FAC775', cursor: 'pointer', fontWeight: 600, opacity: isBusy ? 0.5 : 1 }}>
                            ▶ 시작
                          </button>
                        )}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>{fmtCompleted(c.completed_at)}</td>
                      <td style={{ ...td, textAlign: 'center', color: c.completed_at ? '#e8e2f5' : c.started_at ? '#64b5f6' : '#66657a', fontWeight: c.completed_at ? 600 : 400 }}>
                        {fmtDuration(c.started_at, c.completed_at)}
                      </td>
                      <td style={{ ...td, textAlign: 'center' }}>
                        <button onClick={e => handleDeleteOne(e, c)} disabled={isBusy}
                          title="이 건 삭제 (테스트용)"
                          style={{ fontSize: '11px', width: '22px', height: '22px', borderRadius: '5px', border: '1px solid rgba(226,75,74,0.3)', background: 'transparent', color: '#e57373', cursor: 'pointer', opacity: isBusy ? 0.4 : 1 }}>
                          ✕
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
