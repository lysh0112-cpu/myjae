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
    if (!form.title) return alert('제목을 입력해주세요')
    setLoading(true)
    // 오류를 받아서 확인한다. 안 그러면 실패해도 저장된 것처럼 보인다.
    const { error } = editing
      ? await supabase.from('knowledge_docs').update({
          title: form.title, content: form.content,
          category: form.category, is_active: form.is_active,
        }).eq('id', form.id)
      : await supabase.from('knowledge_docs').insert({
          title: form.title, content: form.content,
          category: form.category, is_active: form.is_active,
        })
    setLoading(false)
    if (error) { alert('저장하지 못했어요: ' + error.message); return }
    setForm(emptyDoc)
    setEditing(false)
    fetchList()
  }

  async function handleMultiSave(docs: Omit<DocForm, 'id' | 'created_at'>[]) {
    setLoading(true)
    const { error } = await supabase.from('knowledge_docs').insert(docs)
    setLoading(false)
    if (error) { alert('저장하지 못했어요: ' + error.message); return }
    fetchList()
    alert(`${docs.length}개 파일이 저장됐어요!`)
  }

  async function handleDelete(id: string) {
    if (!confirm('삭제하시겠습니까?')) return
    const { error } = await supabase.from('knowledge_docs').delete().eq('id', id)
    if (error) { alert('지우지 못했어요: ' + error.message); return }
    fetchList()
  }

  async function handleToggleActive(doc: DocForm) {
    const { error } = await supabase.from('knowledge_docs')
      .update({ is_active: !doc.is_active }).eq('id', doc.id)
    if (error) { alert('바꾸지 못했어요: ' + error.message); return }
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
        onMultiSave={handleMultiSave}
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
