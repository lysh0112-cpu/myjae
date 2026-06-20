'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Consultant = {
  id: string
  name: string
  phone: string
  email: string
  specialty: string
  price: number
  bank: string
  account: string
  active: boolean
}

const empty = { id: '', name: '', phone: '', email: '', specialty: '', price: 0, bank: '', account: '', active: true }

export default function ConsultantManager() {
  const [list, setList] = useState<Consultant[]>([])
  const [form, setForm] = useState<Consultant>(empty)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchList() }, [])

  async function fetchList() {
    const { data } = await supabase.from('consultants').select('*').order('created_at')
    if (data) setList(data)
  }

  async function handleSave() {
    setLoading(true)
    if (editing) {
      await supabase.from('consultants').update({
        name: form.name, phone: form.phone, email: form.email,
        specialty: form.specialty, price: form.price,
        bank: form.bank, account: form.account, active: form.active,
      }).eq('id', form.id)
    } else {
      await supabase.from('consultants').insert({
        name: form.name, phone: form.phone, email: form.email,
        specialty: form.specialty, price: form.price,
        bank: form.bank, account: form.account,
        password: '123456', active: true,
      })
    }
    setForm(empty)
    setEditing(false)
    setLoading(false)
    fetchList()
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    await supabase.from('consultants').delete().eq('id', id)
    fetchList()
  }

  function handleEdit(c: Consultant) {
    setForm(c)
    setEditing(true)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-4" style={{background:'rgba(60,52,137,0.3)',border:'1px solid rgba(250,199,117,0.2)'}}>
        <div className="text-sm font-bold mb-3" style={{color:'#FAC775'}}>
          {editing ? '상담사 수정' : '상담사 등록'}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: '이름', key: 'name', type: 'text' },
            { label: '전화번호', key: 'phone', type: 'tel' },
            { label: '이메일', key: 'email', type: 'email' },
            { label: '전문분야', key: 'specialty', type: 'text' },
            { label: '상담료(원)', key: 'price', type: 'number' },
            { label: '은행', key: 'bank', type: 'text' },
            { label: '계좌번호', key: 'account', type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.5)'}}>{label}</label>
              <input
                type={type}
                value={String((form as any)[key])}
                onChange={(e) => setForm({ ...form, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value })}
                className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                style={{background:'rgba(255,255,255,0.08)',color:'#fff',border:'1px solid rgba(255,255,255,0.1)'}}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2 rounded-xl text-sm font-bold"
            style={{background:'#FAC775',color:'#1a1a18'}}>
            {loading ? '저장중...' : editing ? '수정 저장' : '등록'}
          </button>
          {editing && (
            <button onClick={() => { setForm(empty); setEditing(false) }}
              className="px-4 py-2 rounded-xl text-sm font-bold"
              style={{background:'rgba(255,255,255,0.08)',color:'rgba(255,255,255,0.6)'}}>
              취소
            </button>
          )}
        </div>
      </div>

      {list.map((c) => (
        <div key={c.id} className="rounded-2xl p-4"
          style={{background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)'}}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="font-bold text-white">{c.name}</span>
              <span className="ml-2 text-xs px-2 py-0.5 rounded-full"
                style={{background: c.active ? 'rgba(76,175,80,0.2)' : 'rgba(255,100,100,0.2)',
                  color: c.active ? '#4caf50' : '#ff6464'}}>
                {c.active ? '활성' : '비활성'}
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleEdit(c)}
                className="text-xs px-3 py-1 rounded-lg"
                style={{background:'rgba(250,199,117,0.15)',color:'#FAC775'}}>
                수정
              </button>
              <button onClick={() => handleDelete(c.id)}
                className="text-xs px-3 py-1 rounded-lg"
                style={{background:'rgba(255,100,100,0.15)',color:'#ff6464'}}>
                삭제
              </button>
            </div>
          </div>
          <div className="text-xs space-y-0.5" style={{color:'rgba(255,255,255,0.4)'}}>
            <div>{c.phone} · {c.email}</div>
            <div>{c.specialty} · {c.price?.toLocaleString()}원</div>
            <div>{c.bank} {c.account}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
