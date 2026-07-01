'use client'

import { useState, useEffect } from 'react'

type Member = {
  id: string
  email: string
  nickname: string | null
  role: string | null
  created_at: string | null
  last_sign_in_at: string | null
}

export default function MemberManager() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [roleSavingId, setRoleSavingId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  // 닉네임 수정
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNick, setEditNick] = useState('')
  const [nickSavingId, setNickSavingId] = useState<string | null>(null)

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

  // 닉네임 수정 시작
  const startEditNick = (member: Member) => {
    setEditingId(member.id)
    setEditNick(member.nickname || '')
    setMsg('')
  }

  // 닉네임 저장
  const saveNick = async (member: Member) => {
    const name = editNick.trim()
    if (!name) { setMsg('닉네임을 입력해주세요.'); return }
    if (name.length > 20) { setMsg('닉네임은 20자 이내로 입력해주세요.'); return }
    setNickSavingId(member.id)
    setMsg('')
    try {
      const res = await fetch('/api/admin/update-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: member.id, nickname: name }),
      })
      const result = await res.json()
      if (!res.ok) {
        setMsg('닉네임 변경 실패: ' + (result.error || '알 수 없는 오류'))
      } else {
        setMsg(`닉네임을 "${name}"(으)로 변경했어요.`)
        setMembers(members.map(m => m.id === member.id ? { ...m, nickname: name } : m))
        setEditingId(null)
      }
    } catch (e: any) {
      setMsg('닉네임 변경 중 오류: ' + (e?.message || '알 수 없음'))
    }
    setNickSavingId(null)
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

  const downloadCSV = () => {
    const header = ['닉네임', '이메일', '등급', '가입일', '마지막 로그인']
    const rows = members.map(m => [
      m.nickname || '',
      m.email || '',
      roleLabelText(m.role),
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
        총 {members.length}명 · 등급을 바꾸려면 등급 칸을 누르세요 · 삭제하면 로그인 정보와 프로필이 함께 지워집니다.
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px' }}>닉네임</th>
                <th style={{ padding: '10px 12px' }}>이메일</th>
                <th style={{ padding: '10px 12px' }}>등급</th>
                <th style={{ padding: '10px 12px' }}>가입일</th>
                <th style={{ padding: '10px 12px' }}>마지막 로그인</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', color: '#fff' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                    {editingId === member.id ? (
                      <input
                        value={editNick}
                        onChange={e => setEditNick(e.target.value)}
                        maxLength={20}
                        placeholder="닉네임"
                        style={{ width: 120, background: '#1a1a18', color: '#fff', borderRadius: 6, padding: '6px 8px', border: '1px solid rgba(250,199,117,0.4)', fontSize: 13 }}
                      />
                    ) : (
                      member.nickname || '(없음)'
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.7)' }}>{member.email || '-'}</td>
                  <td style={{ padding: '10px 12px' }}>
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
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{fmtDateShort(member.created_at)}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{fmtDate(member.last_sign_in_at)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {editingId === member.id ? (
                      <>
                        <button
                          onClick={() => saveNick(member)}
                          disabled={nickSavingId === member.id}
                          style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: '#FAC775', color: '#1a1a18', fontSize: 12, fontWeight: 700, cursor: 'pointer', marginRight: 6, opacity: nickSavingId === member.id ? 0.5 : 1 }}>
                          {nickSavingId === member.id ? '저장 중...' : '저장'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: 'rgba(255,255,255,0.6)', fontSize: 12, cursor: 'pointer' }}>
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => startEditNick(member)}
                          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(250,199,117,0.4)', background: 'rgba(250,199,117,0.1)', color: '#FAC775', fontSize: 12, cursor: 'pointer', marginRight: 6 }}>
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(member)}
                          disabled={deletingId === member.id}
                          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,80,80,0.4)', background: 'rgba(255,80,80,0.1)', color: '#ff8080', fontSize: 12, cursor: 'pointer', opacity: deletingId === member.id ? 0.5 : 1 }}>
                          {deletingId === member.id ? '삭제 중...' : '삭제'}
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
