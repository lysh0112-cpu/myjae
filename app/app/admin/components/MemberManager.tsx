'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type Member = {
  id: string
  nickname: string | null
  role: string | null
  created_at: string | null
}

export default function MemberManager() {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  const loadMembers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, role, created_at')
      .order('created_at', { ascending: false })
    if (error) {
      setMsg('회원 목록을 불러오지 못했어요: ' + error.message)
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    loadMembers()
  }, [])

  const handleDelete = async (member: Member) => {
    const name = member.nickname || '(닉네임 없음)'
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

  return (
    <div style={{ padding: '8px 4px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>회원 관리</h3>
        <button onClick={loadMembers}
          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid rgba(250,199,117,0.3)', background: 'transparent', color: '#FAC775', fontSize: 13, cursor: 'pointer' }}>
          ↻ 새로고침
        </button>
      </div>

      <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginBottom: 16 }}>
        총 {members.length}명 · 삭제하면 로그인 정보와 프로필이 함께 지워집니다.
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(member => (
            <div key={member.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div>
                <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
                  {member.nickname || '(닉네임 없음)'}
                  <span style={{ marginLeft: 8, fontSize: 12, color: '#FAC775' }}>{roleLabel(member.role)}</span>
                </div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 3 }}>
                  가입: {member.created_at ? new Date(member.created_at).toLocaleDateString('ko-KR') : '-'}
                </div>
              </div>
              <button
                onClick={() => handleDelete(member)}
                disabled={deletingId === member.id}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,80,80,0.4)', background: 'rgba(255,80,80,0.1)', color: '#ff8080', fontSize: 13, cursor: 'pointer', opacity: deletingId === member.id ? 0.5 : 1 }}>
                {deletingId === member.id ? '삭제 중...' : '삭제'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
