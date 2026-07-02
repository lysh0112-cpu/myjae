'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import ConsultantForm, { ConsultantFormData, emptyForm } from './ConsultantForm'
import ConsultantTable from './ConsultantTable'
export default function ConsultantManager() {
  const [list, setList] = useState<ConsultantFormData[]>([])
  const [form, setForm] = useState<ConsultantFormData>(emptyForm)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  useEffect(() => { fetchList() }, [])
  async function fetchList() {
    const { data, error } = await supabase.from('consultants').select('*').order('created_at')
    if (error) { alert('목록 불러오기 실패: ' + error.message); return }
    if (data) setList(data)
  }
  async function handleSave() {
    if (!form.name || !form.phone || !form.email) return alert('이름, 전화번호, 이메일은 필수입니다')
    setLoading(true)
    const payload = {
      name: form.name, phone: form.phone, email: form.email,
      specialty: form.specialty, price: form.price,
      bank: form.bank, account: form.account,
      region: form.region, commission_rate: form.commission_rate,
      commission_amount: form.commission_amount,
      photo_url: form.photo_url, career: form.career, intro: form.intro,
      rating: form.rating, review_count: form.review_count, review_text: form.review_text,
    }
    if (editing) {
      const { error } = await supabase.from('consultants')
        .update({ ...payload, active: form.active })
        .eq('id', form.id)
      if (error) { alert('수정 실패: ' + error.message); setLoading(false); return }
    } else {
      const { error } = await supabase.from('consultants')
        .insert({ ...payload, active: true })
      if (error) { alert('등록 실패: ' + error.message); setLoading(false); return }
    }
    setForm(emptyForm)
    setEditing(false)
    setLoading(false)
    fetchList()
  }
  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase.from('consultants').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    fetchList()
  }
  async function handleToggleActive(c: ConsultantFormData) {
    const { error } = await supabase.from('consultants').update({ active: !c.active }).eq('id', c.id)
    if (error) { alert('변경 실패: ' + error.message); return }
    fetchList()
  }
  function handleEdit(c: ConsultantFormData) {
    setForm({ ...emptyForm, ...c })
    setEditing(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  return (
    <div>
      <ConsultantForm
        form={form} editing={editing} loading={loading}
        onChange={setForm} onSave={handleSave}
        onCancel={() => { setForm(emptyForm); setEditing(false) }}
      />
      <div className="rounded-2xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="text-sm font-bold text-white">
            상담사 목록 <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>총 {list.length}명</span>
          </div>
        </div>
        <ConsultantTable
          list={list}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
        />
      </div>
    </div>
  )
}
