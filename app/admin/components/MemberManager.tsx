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
  const [msg, setMsg] = useState('')

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

  const roleLabel = (role: string | null) => {
    if (role === 'master') return '👑 마스터'
    if (role === 'consultant') return '🔮 상담사'
    return '👤 일반회원'
  }

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

  const fmtDateShort = (d: string | null) =>
    d ? new Date(d).toLocaleDateString('ko-KR') : '-'

  // 엑셀(CSV) 다운로드
  const downloadCSV = () => {
    const header = ['닉네임', '이메일', '등급', '가입일', '마지막 로그인']
    const rows = members.map(m => [
      m.nickname || '',
      m.email || '',
      roleLabel(m.role).replace(/[👑🔮👤]/g, '').trim(),
      fmtDateShort(m.created_at),
      fmtDate(m.last_sign_in_at),
    ])
    const csv = [header, ...rows]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    // BOM 추가 (엑셀 한글 깨짐 방지)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `명연재_회원목록_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '8px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>회원 관리</h3>
        <div style={{ display: 'flex', gap: 8 }}>
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

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
        총 {members.length}명 · 삭제하면 로그인 정보와 프로필이 함께 지워집니다. (비밀번호는 보안상 조회 불가)
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
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 720 }}>
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
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{member.nickname || '(없음)'}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.7)' }}>{member.email || '-'}</td>
                  <td style={{ padding: '10px 12px', color: '#FAC775' }}>{roleLabel(member.role)}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{fmtDateShort(member.created_at)}</td>
                  <td style={{ padding: '10px 12px', color: 'rgba(255,255,255,0.6)' }}>{fmtDate(member.last_sign_in_at)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <button
                      onClick={() => handleDelete(member)}
                      disabled={deletingId === member.id}
                      style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,80,80,0.4)', background: 'rgba(255,80,80,0.1)', color: '#ff8080', fontSize: 12, cursor: 'pointer', opacity: deletingId === member.id ? 0.5 : 1 }}>
                      {deletingId === member.id ? '삭제 중...' : '삭제'}
                    </button>
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
