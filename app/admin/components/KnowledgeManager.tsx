'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Doc = {
  id: string
  title: string
  content: string
  category: string
  is_active: boolean
  created_at: string
}

const CATEGORIES = ['general', 'saju', 'gungham', 'gaemyung', 'mulsang']
const CAT_LABEL: Record<string, string> = {
  general: '일반', saju: '사주기초', gungham: '궁합', gaemyung: '개명', mulsang: '물상도'
}
const empty = { id: '', title: '', content: '', category: 'general', is_active: true, created_at: '' }

export default function KnowledgeManager() {
  const [list, setList] = useState<Doc[]>([])
  const [form, setForm] = useState<Doc>(empty)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    const { data } = await supabase.from('knowledge_docs').select('*').order('created_at', { ascending: false })
    if (data) setList(data)
  }

  async function handleSave() {
    if (!form.title || !form.content) return alert('제목과 내용을 입력해주세요')
    setLoading(true)
    if (editing) {
      await supabase.from('knowledge_docs').update({
        title: form.title, content: form.content,
        category: form.category, is_active: form.is_active,
      }).eq('id', form.id)
    } else {
      await supabase.from('knowledge_docs').insert({
        title: form.title, content: form.content,
        category: form.category, is_active: true,
      })
    }
    setForm(empty)
    setEditing(false)
    setLoading(false)
    fetchList()
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('knowledge_docs').delete().eq('id', id)
    fetchList()
  }

  async function toggleActive(doc: Doc) {
    await supabase.from('knowledge_docs').update({ is_active: !doc.is_active }).eq('id', doc.id)
    fetchList()
  }

  const filtered = filter === 'all' ? list : list.filter(d => d.category === filter)

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4"
        style={{ background: 'rgba(60,52,137,0.3)', border: '1px solid rgba(250,199,117,0.2)' }}>
        <div className="text-sm font-bold mb-3" style={{ color: '#FAC775' }}>
          {editing ? '✏️ 지식 수정' : '➕ 지식 추가'}
        </div>
        <div className="space-y-2">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="제목 (예: 갑목 일간 특성)"
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
          <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
            {CATEGORIES.map(c => <option key={c} value={c}>{CAT_LABEL[c]}</option>)}
          </select>
          <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
            placeholder="내용을 입력하세요. PDF 내용을 붙여넣기 해도 됩니다."
            rows={6}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none resize-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: '#FAC775', color: '#1a1a18' }}>
            {loading ? '저장중...' : editing ? '수정 저장' : '저장'}
          </button>
          {editing && (
            <button onClick={() => { setForm(empty); setEditing(false) }}
              className="px-4 py-2.5 rounded-xl text-sm font-bold"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
              취소
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {['all', ...CATEGORIES].map(c => (
          <button key={c} onClick={() => setFilter(c)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold"
            style={filter === c
              ? { background: 'rgba(250,199,117,0.3)', color: '#FAC775' }
              : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            {c === 'all' ? '전체' : CAT_LABEL[c]}
          </button>
        ))}
      </div>

      <div className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
        총 {filtered.length}개 · AI가 사주 분석 시 활성화된 항목을 자동 참고합니다
      </div>

      {filtered.map((doc) => (
        <div key={doc.id} className="rounded-2xl p-4"
          style={{ background: '#2C2C2A', border: `1px solid ${doc.is_active ? 'rgba(250,199,117,0.15)' : 'rgba(255,255,255,0.06)'}` }}>
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-bold text-white">{doc.title}</span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: 'rgba(60,52,137,0.4)', color: '#b0aec8' }}>
                  {CAT_LABEL[doc.category]}
                </span>
              </div>
              <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {doc.content}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <button onClick={() => toggleActive(doc)}
              className="px-3 py-1 rounded-lg text-xs font-bold"
              style={doc.is_active
                ? { background: 'rgba(76,175,80,0.2)', color: '#81c784' }
                : { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
              {doc.is_active ? '✅ 활성' : '⭕ 비활성'}
            </button>
            <button onClick={() => { setForm(doc); setEditing(true) }}
              className="px-3 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>
              수정
            </button>
            <button onClick={() => handleDelete(doc.id)}
              className="px-3 py-1 rounded-lg text-xs font-bold"
              style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>
              삭제
            </button>
            <span className="text-xs ml-auto" style={{ color: 'rgba(255,255,255,0.2)' }}>
              {new Date(doc.created_at).toLocaleDateString('ko-KR')}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
