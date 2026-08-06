'use client'
// app/admin/components/InquiryManager.tsx
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-07 (48부 8차) — 💬 문의 관리  [대표님 지시]
//    「관리자 화면에 ★문의관리탭도 별도로 만들어야 하고」
//    「답변은 ★마스터인 류승현과 오연희 두 사람만 가능」
//    「그 질문들 중 좋은 내용은 ★선별적으로 공유」
//
//  ★여기서 하는 일 셋
//     ① 답변 달기        — 손님 화면에 「답변 완료」로 뜹니다
//     ② 공개로 바꾸기     — ★모든 손님에게 보입니다 (기본은 나만 보임)
//     ③ 예시 표시         — 언제나 맨 위에 보이는 본보기 질문
//
//  ⚠️⚠️ ★공개로 바꾸기 전에 «사적인 내용» 이 없는지 보십시오 —
//     사주 문의에는 이혼·건강·돈 같은 이야기가 섞입니다.
//     손님 화면에 ★이름은 안 나가지만, 내용만으로도 아는 사람은 압니다.
//     ⛔ 망설여지면 «공개하지» 마십시오. 되돌려도 이미 본 사람은 압니다.
//
//  ⚠️ 마스터만 답할 수 있게 하는 것은 ★DB 정책(RLS)이 합니다 —
//     inquiries_master_all : profiles.role = 'master'
//     ⇒ 화면을 뚫어도 ★DB 가 막습니다.
//     ⛔ 화면에서 다시 확인하지 마십시오. 두 겹이 되면 어긋납니다.
// ══════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Row = {
  id: string
  user_id: string | null
  title: string
  body: string
  is_public: boolean
  is_sample: boolean
  answer: string | null
  answered_at: string | null
  created_at: string
}

function dt(s: string | null) {
  if (!s) return '-'
  const d = new Date(s)
  return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
}

export default function InquiryManager() {
  const [list, setList] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [nick, setNick] = useState<Record<string, string>>({})
  const [openId, setOpenId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [only, setOnly] = useState<'all' | 'todo'>('all')

  useEffect(() => { load() }, [])

  async function load() {
    const { data } = await supabase
      .from('inquiries')
      .select('id, user_id, title, body, is_public, is_sample, answer, answered_at, created_at')
      .order('created_at', { ascending: false })
    const rows = (data ?? []) as Row[]
    setList(rows)

    // 누가 남긴 문의인지 — ★관리자만 봅니다 (손님 화면에는 안 나갑니다)
    const ids = [...new Set(rows.map(r => r.user_id).filter(Boolean))] as string[]
    if (ids.length) {
      const { data: ps } = await supabase.from('profiles').select('id, nickname').in('id', ids)
      if (ps) setNick(Object.fromEntries(ps.map(p => [p.id, p.nickname || '(닉네임 없음)'])))
    }
    setLoading(false)
  }

  async function saveAnswer(id: string) {
    if (!draft.trim()) { alert('답변을 적어 주세요.'); return }
    setSaving(true)
    const { data: me } = await supabase.auth.getUser()
    const { error } = await supabase.from('inquiries')
      .update({ answer: draft.trim(), answered_by: me.user?.id ?? null, answered_at: new Date().toISOString() })
      .eq('id', id)
    setSaving(false)
    if (error) { alert('저장하지 못했어요.\n\n(' + error.message + ')'); return }
    setOpenId(null); setDraft(''); load()
  }

  async function togglePublic(r: Row) {
    if (!r.is_public && !confirm(
      '이 문의를 모든 회원에게 보이게 할까요?\n\n'
      + '· 이름은 나가지 않지만 내용만으로 알아볼 수 있습니다\n'
      + '· 사적인 이야기가 섞여 있지 않은지 다시 봐 주세요',
    )) return
    const { error } = await supabase.from('inquiries').update({ is_public: !r.is_public }).eq('id', r.id)
    if (error) { alert('바꾸지 못했어요.\n\n(' + error.message + ')'); return }
    load()
  }

  async function toggleSample(r: Row) {
    const { error } = await supabase.from('inquiries')
      .update({ is_sample: !r.is_sample, is_public: !r.is_sample ? true : r.is_public })
      .eq('id', r.id)
    if (error) { alert('바꾸지 못했어요.\n\n(' + error.message + ')'); return }
    load()
  }

  const shown = only === 'todo' ? list.filter(r => !r.answer && !r.is_sample) : list
  const todoCount = list.filter(r => !r.answer && !r.is_sample).length

  const chip = (on: boolean) => ({
    padding: '3px 9px', borderRadius: 6, fontSize: 11,
    background: on ? 'rgba(250,199,117,0.15)' : 'rgba(255,255,255,0.05)',
    border: `1px solid ${on ? 'rgba(250,199,117,0.4)' : 'rgba(255,255,255,0.1)'}`,
    color: on ? '#FAC775' : '#8a88a0',
    cursor: 'pointer', fontFamily: 'inherit',
  })

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-5 py-4 flex items-center gap-3 flex-wrap"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-sm font-bold text-white">
          문의 관리 <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>총 {list.length}건</span>
        </div>
        {todoCount > 0 && (
          <span style={{ fontSize: 11, color: '#FAC775' }}>답변 대기 {todoCount}건</span>
        )}
        <div className="ml-auto flex gap-2">
          <button onClick={() => setOnly('all')} style={chip(only === 'all')}>전체</button>
          <button onClick={() => setOnly('todo')} style={chip(only === 'todo')}>답변 대기</button>
        </div>
      </div>

      <div className="px-5 py-3 text-xs" style={{ color: '#6a6880', lineHeight: 1.8 }}>
        손님 문의는 <b style={{ color: '#FAC775' }}>본인에게만</b> 보입니다 ·
        「공개」로 바꾸면 모든 회원이 봅니다 (이름은 안 나갑니다) ·
        「예시」는 언제나 보이는 본보기 질문입니다
      </div>

      {loading ? (
        <div className="px-5 py-10 text-center text-sm" style={{ color: '#8a88a0' }}>불러오는 중…</div>
      ) : shown.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm" style={{ color: '#8a88a0' }}>문의가 없어요.</div>
      ) : (
        shown.map((r) => (
          <div key={r.id} className="px-5 py-4"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              {r.is_sample && (
                <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, background: 'rgba(127,119,221,0.2)', color: '#CECBF6' }}>예시</span>
              )}
              {r.is_public
                ? <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, background: 'rgba(29,158,117,0.18)', color: '#9FE1CB' }}>공개</span>
                : <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', color: '#8a88a0' }}>본인만</span>}
              {!r.answer && !r.is_sample && (
                <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 5, background: 'rgba(250,199,117,0.18)', color: '#FAC775' }}>답변 대기</span>
              )}
              <span className="ml-auto text-xs" style={{ color: '#6a6880' }}>
                {r.user_id ? (nick[r.user_id] ?? '…') : '—'} · {dt(r.created_at)}
              </span>
            </div>

            <div className="text-sm text-white mb-1">{r.title}</div>
            <div className="text-xs" style={{ color: '#b0aec8', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
              {r.body}
            </div>

            {r.answer && openId !== r.id && (
              <div className="mt-3 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(255,255,255,0.04)', color: '#b0aec8', lineHeight: 1.8, whiteSpace: 'pre-line' }}>
                <span style={{ color: '#FAC775' }}>답변</span> · {dt(r.answered_at)}
                <div className="mt-1">{r.answer}</div>
              </div>
            )}

            {openId === r.id && (
              <div className="mt-3">
                <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={5}
                  placeholder="답변을 적어 주세요."
                  style={{
                    width: '100%', padding: '10px 12px', fontSize: 13, lineHeight: 1.8,
                    background: 'rgba(255,255,255,0.05)', color: '#fff',
                    border: '1px solid rgba(255,255,255,0.12)', borderRadius: 9,
                    fontFamily: 'inherit', outline: 'none', resize: 'vertical',
                  }} />
                <div className="flex gap-2 mt-2">
                  <button onClick={() => saveAnswer(r.id)} disabled={saving}
                    className="px-4 py-2 rounded-lg text-xs"
                    style={{ background: '#FAC775', color: '#2C2C2A', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                    {saving ? '저장 중…' : '답변 저장'}
                  </button>
                  <button onClick={() => { setOpenId(null); setDraft('') }}
                    className="px-4 py-2 rounded-lg text-xs"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#b0aec8', border: 'none', fontFamily: 'inherit', cursor: 'pointer' }}>
                    취소
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3 flex-wrap">
              {openId !== r.id && (
                <button onClick={() => { setOpenId(r.id); setDraft(r.answer ?? '') }}
                  style={chip(false)}>{r.answer ? '답변 고치기' : '답변 달기'}</button>
              )}
              <button onClick={() => togglePublic(r)} style={chip(r.is_public)}>
                {r.is_public ? '공개 중' : '공개로 바꾸기'}
              </button>
              <button onClick={() => toggleSample(r)} style={chip(r.is_sample)}>
                {r.is_sample ? '예시' : '예시로 두기'}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
