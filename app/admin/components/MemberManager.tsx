'use client'

import { useState, useEffect } from 'react'

type Member = {
  id: string
  email: string
  nickname: string | null
  role: string | null
  created_at: string | null
  last_sign_in_at: string | null
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_hour: string | null
  cal_type: string | null
  gender: string | null
  leap_month: boolean | null
}

// 사주 편집 상태
type SajuEdit = {
  birth_year: string
  birth_month: string
  birth_day: string
  birth_hour: string
  cal_type: string
  gender: string
  leap_month: string // '0'=평달, '1'=윤달
}

const HOUR_LABELS = [
  '子시(23~01)', '丑시(01~03)', '寅시(03~05)', '卯시(05~07)',
  '辰시(07~09)', '巳시(09~11)', '午시(11~13)', '未시(13~15)',
  '申시(15~17)', '酉시(17~19)', '戌시(19~21)', '亥시(21~23)',
]

export default function MemberManager() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  // 수정 (닉네임 + 사주)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNick, setEditNick] = useState('')
  const [editSaju, setEditSaju] = useState<SajuEdit | null>(null)
  const [savingId, setSavingId] = useState<string | null>(null)

  // 회원 추가 폼
  const [showAdd, setShowAdd] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newNickname, setNewNickname] = useState('')
  const [newRole, setNewRole] = useState('customer')
  const [showPw, setShowPw] = useState(false)
  const [adding, setAdding] = useState(false)

  const loadMembers = async () => {
    setLoading(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/list-users')
      const result = await res.json()
      if (!res.ok) {
        setMsg('회원 목록을 불러오지 못했어요: ' + (result.error || '알 수 없음'))
      } else {
        setMembers(result.members || [])
      }
    } catch (e: any) {
      setMsg('불러오는 중 오류: ' + (e?.message || '알 수 없음'))
    }
    setLoading(false)
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const handleAdd = async () => {
    if (!newEmail || !newPassword) {
      setMsg('이메일과 비밀번호를 입력해주세요.')
      return
    }
    if (newPassword.length < 6) {
      setMsg('비밀번호는 6자 이상으로 정해주세요.')
      return
    }
    setAdding(true)
    setMsg('')
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, nickname: newNickname, role: newRole }),
      })
      const result = await res.json()
      if (!res.ok) {
        setMsg('추가 실패: ' + (result.error || '알 수 없는 오류'))
      } else {
        setMsg(`"${newNickname || newEmail}" 회원이 추가되었어요. (이메일·비밀번호를 본인에게 전달해주세요)`)
        setNewEmail(''); setNewPassword(''); setNewNickname(''); setNewRole('customer')
        setShowAdd(false)
        loadMembers()
      }
    } catch (e: any) {
      setMsg('추가 중 오류: ' + (e?.message || '알 수 없음'))
    }
    setAdding(false)
  }

  const handleRoleChange = async (member: Member, role: string) => {
    if (role === (member.role || 'customer')) return
    const name = member.nickname || member.email || '(이름 없음)'
    const label = role === 'master' ? '매니저' : role === 'consultant' ? '상담사' : '일반회원'
    if (!confirm(`"${name}" 님의 등급을 "${label}"(으)로 바꿀까요?`)) return
    setRoleSavingId(member.id)
    setMsg('')
    try {
      const res = await fetch('/api/admin/update-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, role }),
      })
      const result = await res.json()
      if (!res.ok) {
        setMsg('등급 변경 실패: ' + (result.error || '알 수 없는 오류'))
      } else {
        setMsg(`"${name}" 님의 등급을 "${label}"(으)로 변경했어요.`)
        setMembers(members.map(m => m.id === member.id ? { ...m, role } : m))
      }
    } catch (e: any) {
      setMsg('등급 변경 중 오류: ' + (e?.message || '알 수 없음'))
    }
    setRoleSavingId(null)
  }

  // 수정 시작 (닉네임 + 사주 함께)
  const startEdit = (member: Member) => {
    setEditingId(member.id)
    setEditNick(member.nickname || '')
    setEditSaju({
      birth_year: member.birth_year != null ? String(member.birth_year) : '',
      birth_month: member.birth_month != null ? String(member.birth_month) : '',
      birth_day: member.birth_day != null ? String(member.birth_day) : '',
      birth_hour: member.birth_hour != null ? member.birth_hour : '모름',
      cal_type: member.cal_type || '양력',
      gender: member.gender || '남',
      leap_month: member.leap_month ? '1' : '0',
    })
    setMsg('')
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditSaju(null)
  }

  // 저장 (닉네임 + 사주 한번에)
  const saveEdit = async (member: Member) => {
    if (!editSaju) return
    const name = editNick.trim()
    if (!name) { setMsg('닉네임을 입력해주세요.'); return }
    if (name.length > 20) { setMsg('닉네임은 20자 이내로 입력해주세요.'); return }
    setSavingId(member.id)
    setMsg('')
    try {
      // 1) 닉네임 저장
      const resNick = await fetch('/api/admin/update-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, nickname: name }),
      })
      const rNick = await resNick.json()
      if (!resNick.ok) {
        setMsg('닉네임 변경 실패: ' + (rNick.error || '알 수 없는 오류'))
        setSavingId(null); return
      }

      // 2) 사주 저장
      const resSaju = await fetch('/api/admin/update-saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: member.id,
          birth_year: editSaju.birth_year ? parseInt(editSaju.birth_year, 10) : null,
          birth_month: editSaju.birth_month ? parseInt(editSaju.birth_month, 10) : null,
          birth_day: editSaju.birth_day ? parseInt(editSaju.birth_day, 10) : null,
          birth_hour: editSaju.birth_hour, // '0'~'11' 또는 '모름'
          cal_type: editSaju.cal_type,
          gender: editSaju.gender,
          leap_month: editSaju.leap_month === '1',
        }),
      })
      const rSaju = await resSaju.json()
      if (!resSaju.ok) {
        setMsg('사주 저장 실패: ' + (rSaju.error || '알 수 없는 오류'))
        setSavingId(null); return
      }

      // 화면 반영
      setMembers(members.map(m => m.id === member.id ? {
        ...m,
        nickname: name,
        birth_year: editSaju.birth_year ? parseInt(editSaju.birth_year, 10) : null,
        birth_month: editSaju.birth_month ? parseInt(editSaju.birth_month, 10) : null,
        birth_day: editSaju.birth_day ? parseInt(editSaju.birth_day, 10) : null,
        birth_hour: editSaju.birth_hour,
        cal_type: editSaju.cal_type,
        gender: editSaju.gender,
        leap_month: editSaju.leap_month === '1',
      } : m))
      setMsg(`"${name}" 님의 정보를 저장했어요.`)
      setEditingId(null)
      setEditSaju(null)
    } catch (e: any) {
      setMsg('저장 중 오류: ' + (e?.message || '알 수 없음'))
    }
    setSavingId(null)
  }

  const handleDelete = async (member: Member) => {
    const name = member.nickname || member.email || '(이름 없음)'
    if (!confirm(`정말 "${name}" 회원을 삭제할까요?\n\n로그인 정보와 프로필이 모두 삭제되며 되돌릴 수 없습니다.`)) {
      return
    }
    setDeletingId(member.id)
    setMsg('')
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id }),
      })
      const result = await res.json()
      if (!res.ok) {
        setMsg('삭제 실패: ' + (result.error || '알 수 없는 오류'))
      } else {
        setMsg(`"${name}" 회원이 삭제되었어요.`)
        setMembers(members.filter(m => m.id !== member.id))
      }
    } catch (e: any) {
      setMsg('삭제 중 오류: ' + (e?.message || '알 수 없음'))
    }
    setDeletingId(null)
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

  const fmtDateShort = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ko-KR') : '-'

  const roleLabelText = (role: string | null) =>
    role === 'master' ? '매니저' : role === 'consultant' ? '상담사' : '일반회원'

  const fmtBirth = (m: Member) =>
    m.birth_year ? `${m.birth_year}.${m.birth_month ?? '-'}.${m.birth_day ?? '-'}` : '-'

  const fmtCalType = (c: string | null) => c || '-'

  const fmtLeap = (m: Member) => (m.birth_year ? (m.leap_month ? '윤달' : '평달') : '-')

  const fmtGender = (g: string | null) => g || '-'

  const fmtHour = (h: string | null) => {
    if (h === null || h === undefined || h === '') return '-'
    if (h === '모름') return '모름'
    const idx = parseInt(h, 10)
    if (isNaN(idx) || idx < 0 || idx > 11) return h
    return HOUR_LABELS[idx]
  }

  const downloadCSV = () => {
    const header = ['등급', '닉네임', '이메일', '생년월일', '음양력', '윤/평달', '남/여', '생시', '가입일', '마지막 로그인']
    const rows = members.map(m => [
      roleLabelText(m.role),
      m.nickname || '',
      m.email || '',
      fmtBirth(m),
      fmtCalType(m.cal_type),
      fmtLeap(m),
      fmtGender(m.gender),
      fmtHour(m.birth_hour),
      fmtDateShort(m.created_at),
      fmtDate(m.last_sign_in_at),
    ])
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `명연재_회원목록_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#1a1a18', color: '#fff', borderRadius: 8,
    padding: '10px 12px', border: '1px solid rgba(255,255,255,0.15)', fontSize: 14,
  }

  const th: React.CSSProperties = { padding: '10px 12px', whiteSpace: 'nowrap' }
  const td: React.CSSProperties = { padding: '10px 12px', whiteSpace: 'nowrap' }

  // 수정 모드용 작은 입력칸 스타일
  const cellInput: React.CSSProperties = {
    width: 52, background: '#1a1a18', color: '#fff', borderRadius: 6,
    padding: '5px 6px', border: '1px solid rgba(250,199,117,0.4)', fontSize: 12, textAlign: 'center',
  }
  const cellSelect: React.CSSProperties = {
    background: '#1a1a18', color: '#fff', borderRadius: 6,
    padding: '5px 6px', border: '1px solid rgba(250,199,117,0.4)', fontSize: 12,
  }

  return (
    <div style={{ padding: '8px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>회원 관리</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowAdd(!showAdd)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(250,199,117,0.5)', background: 'rgba(250,199,117,0.15)', color: '#FAC775', fontSize: 13, cursor: 'pointer', fontWeight: 700 }}>
            {showAdd ? '✕ 닫기' : '+ 회원 추가'}
          </button>
          <button onClick={downloadCSV} disabled={members.length === 0}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(126,231,135,0.4)', background: 'rgba(126,231,135,0.1)', color: '#7ee787', fontSize: 13, cursor: 'pointer', opacity: members.length === 0 ? 0.4 : 1 }}>
            📥 엑셀 다운로드
          </button>
          <button onClick={loadMembers}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(250,199,117,0.3)', background: 'transparent', color: '#FAC775', fontSize: 13, cursor: 'pointer' }}>
            ↻ 새로고침
          </button>
        </div>
      </div>

      {/* 회원 추가 폼 */}
      {showAdd && (
        <div style={{ marginBottom: 18, padding: 18, borderRadius: 12, background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.2)' }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>회원 직접 추가</p>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 14 }}>
            관리자가 계정을 만들어줍니다. 만든 뒤 이메일·비밀번호를 본인에게 전달하고, 첫 로그인 후 비밀번호를 바꾸도록 안내해주세요.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block', marginBottom: 5 }}>닉네임</label>
              <input style={inputStyle} value={newNickname} onChange={e => setNewNickname(e.target.value)} placeholder="사용할 이름" />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block', marginBottom: 5 }}>등급</label>
              <select style={inputStyle} value={newRole} onChange={e => setNewRole(e.target.value)}>
                <option value="customer">👤 일반회원</option>
                <option value="consultant">🔮 상담사</option>
                <option value="master">👑 매니저</option>
              </select>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block', marginBottom: 5 }}>이메일 (아이디)</label>
              <input style={inputStyle} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="example@email.com" />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, display: 'block', marginBottom: 5 }}>임시 비밀번호 (6자 이상)</label>
              <div style={{ position: 'relative' }}>
                <input style={{ ...inputStyle, paddingRight: 40 }} type={showPw ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="6자 이상" />
                <button type="button" onClick={() => setShowPw(!showPw)}
                  style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>
                  {showPw ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
          </div>
          <button onClick={handleAdd} disabled={adding}
            style={{ marginTop: 14, width: '100%', padding: '11px 0', borderRadius: 8, border: 'none', background: '#FAC775', color: '#1a1a18', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: adding ? 0.5 : 1 }}>
            {adding ? '추가 중...' : '회원 추가하기'}
          </button>
        </div>
      )}

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
        총 {members.length}명 · 등급 칸은 바로 바꿀 수 있어요 · [수정]을 누르면 닉네임·생년월일·시간 등을 고칠 수 있습니다.
      </p>

      {msg && (
        <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 8, background: 'rgba(250,199,117,0.1)', border: '1px solid rgba(250,199,117,0.25)', color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
          {msg}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>불러오는 중...</p>
      ) : members.length === 0 ? (
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14 }}>아직 가입한 회원이 없어요.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 1200 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                <th style={th}>등급</th>
                <th style={th}>닉네임</th>
                <th style={th}>이메일</th>
                <th style={th}>생년월일</th>
                <th style={th}>음양력</th>
                <th style={th}>윤/평달</th>
                <th style={th}>남/여</th>
                <th style={th}>생시</th>
                <th style={th}>가입일</th>
                <th style={th}>마지막 로그인</th>
                <th style={{ ...th, textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => {
                const isEdit = editingId === member.id && editSaju
                return (
                  <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}>
                    <td style={td}>
                      <select
                        value={member.role || 'customer'}
                        disabled={roleSavingId === member.id}
                        onChange={(e) => handleRoleChange(member, e.target.value)}
                        style={{
                          background: '#1a1a18', color: '#FAC775', borderRadius: 8,
                          padding: '6px 10px', border: '1px solid rgba(250,199,117,0.3)',
                          fontSize: 13, cursor: 'pointer', opacity: roleSavingId === member.id ? 0.5 : 1,
                        }}>
                        <option value="customer">👤 일반회원</option>
                        <option value="consultant">🔮 상담사</option>
                        <option value="master">👑 매니저</option>
                      </select>
                    </td>

                    {/* 닉네임 */}
                    <td style={{ ...td, fontWeight: 600 }}>
                      {isEdit ? (
                        <input value={editNick} onChange={e => setEditNick(e.target.value)} maxLength={20} placeholder="닉네임"
                          style={{ width: 100, background: '#1a1a18', color: '#fff', borderRadius: 6, padding: '6px 8px', border: '1px solid rgba(250,199,117,0.4)', fontSize: 13 }} />
                      ) : (member.nickname || '(없음)')}
                    </td>

                    <td style={{ ...td, color: 'rgba(255,255,255,0.7)' }}>{member.email || '-'}</td>

                    {/* 생년월일 */}
                    <td style={{ ...td, color: 'rgba(255,255,255,0.75)' }}>
                      {isEdit ? (
                        <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                          <input style={{ ...cellInput, width: 60 }} value={editSaju!.birth_year} onChange={e => setEditSaju({ ...editSaju!, birth_year: e.target.value })} placeholder="년" />
                          <input style={cellInput} value={editSaju!.birth_month} onChange={e => setEditSaju({ ...editSaju!, birth_month: e.target.value })} placeholder="월" />
                          <input style={cellInput} value={editSaju!.birth_day} onChange={e => setEditSaju({ ...editSaju!, birth_day: e.target.value })} placeholder="일" />
                        </span>
                      ) : fmtBirth(member)}
                    </td>

                    {/* 음양력 */}
                    <td style={{ ...td, color: 'rgba(255,255,255,0.75)' }}>
                      {isEdit ? (
                        <select style={cellSelect} value={editSaju!.cal_type} onChange={e => setEditSaju({ ...editSaju!, cal_type: e.target.value })}>
                          <option value="양력">양력</option>
                          <option value="음력">음력</option>
                        </select>
                      ) : fmtCalType(member.cal_type)}
                    </td>

                    {/* 윤/평달 */}
                    <td style={{ ...td, color: 'rgba(255,255,255,0.75)' }}>
                      {isEdit ? (
                        <select style={cellSelect} value={editSaju!.leap_month} onChange={e => setEditSaju({ ...editSaju!, leap_month: e.target.value })}>
                          <option value="0">평달</option>
                          <option value="1">윤달</option>
                        </select>
                      ) : fmtLeap(member)}
                    </td>

                    {/* 남/여 */}
                    <td style={{ ...td, color: 'rgba(255,255,255,0.75)' }}>
                      {isEdit ? (
                        <select style={cellSelect} value={editSaju!.gender} onChange={e => setEditSaju({ ...editSaju!, gender: e.target.value })}>
                          <option value="남">남</option>
                          <option value="여">여</option>
                        </select>
                      ) : fmtGender(member.gender)}
                    </td>

                    {/* 생시 */}
                    <td style={{ ...td, color: 'rgba(255,255,255,0.75)' }}>
                      {isEdit ? (
                        <select style={cellSelect} value={editSaju!.birth_hour} onChange={e => setEditSaju({ ...editSaju!, birth_hour: e.target.value })}>
                          <option value="모름">모름</option>
                          {HOUR_LABELS.map((label, i) => (
                            <option key={i} value={String(i)}>{label}</option>
                          ))}
                        </select>
                      ) : fmtHour(member.birth_hour)}
                    </td>

                    <td style={{ ...td, color: 'rgba(255,255,255,0.6)' }}>{fmtDateShort(member.created_at)}</td>
                    <td style={{ ...td, color: 'rgba(255,255,255,0.6)' }}>{fmtDate(member.last_sign_in_at)}</td>

                    {/* 관리 */}
                    <td style={{ ...td, textAlign: 'center' }}>
                      {isEdit ? (
                        <>
                          <button onClick={() => saveEdit(member)} disabled={savingId === member.id}
                            style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#FAC775', color: '#1a1a18', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginRight: 6, opacity: savingId === member.id ? 0.5 : 1 }}>
                            {savingId === member.id ? '저장 중...' : '저장'}
                          </button>
                          <button onClick={cancelEdit}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' }}>
                            취소
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => startEdit(member)}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(250,199,117,0.4)', background: 'rgba(250,199,117,0.1)', color: '#FAC775', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                            수정
                          </button>
                          <button onClick={() => handleDelete(member)} disabled={deletingId === member.id}
                            style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,80,80,0.4)', background: 'rgba(255,80,80,0.1)', color: '#ff8080', fontSize: 12, cursor: 'pointer', opacity: deletingId === member.id ? 0.5 : 1 }}>
                            {deletingId === member.id ? '삭제 중...' : '삭제'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
