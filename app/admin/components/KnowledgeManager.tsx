'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import KnowledgeForm, { DocForm, emptyDoc } from './KnowledgeForm'
import KnowledgeList from './KnowledgeList'

export default function KnowledgeManager() {
  const [list, setList] = useState<DocForm[]>([])
  const [form, setForm] = useState<DocForm>(emptyDoc)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    const { data } = await supabase
      .from('knowledge_docs').select('*')
      .order('created_at', { ascending: false })
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
        category: form.category, is_active: form.is_active,
      })
    }
    setForm(emptyDoc)
    setEditing(false)
    setLoading(false)
    fetchList()
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    await supabase.from('knowledge_docs').delete().eq('id', id)
    fetchList()
  }

  async function handleToggleActive(doc: DocForm) {
    await supabase.from('knowledge_docs')
      .update({ is_active: !doc.is_active }).eq('id', doc.id)
    fetchList()
  }

  function handleEdit(doc: DocForm) {
    setForm(doc)
    setEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
      <KnowledgeForm
        form={form} editing={editing} loading={loading}
        onChange={setForm} onSave={handleSave}
        onCancel={() => { setForm(emptyDoc); setEditing(false) }}
      />
      <KnowledgeList
        list={list}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onToggleActive={handleToggleActive}
      />
    </div>
  )
}
