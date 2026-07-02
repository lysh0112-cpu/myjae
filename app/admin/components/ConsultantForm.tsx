'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BANKS, SPECIALTIES, REGIONS, formatPhone } from './consultantData'

export type ConsultantFormData = {
  id: string
  name: string
  phone: string
  email: string
  specialty: string
  price: number
  bank: string
  account: string
  active: boolean
  region: string
  commission_rate: number
  commission_amount: number
  photo_url: string
  career: string
  intro: string
  rating: number
  review_count: number
  review_text: string
}

export const emptyForm: ConsultantFormData = {
  id: '', name: '', phone: '', email: '', specialty: '',
  price: 0, bank: '', account: '', active: true,
  region: '', commission_rate: 0, commission_amount: 0,
  photo_url: '', career: '', intro: '',
  rating: 0, review_count: 0, review_text: '',
}

type Props = {
  form: ConsultantFormData
  editing: boolean
  loading: boolean
  onChange: (form: ConsultantFormData) => void
  onSave: () => void
  onCancel: () => void
}

export default function ConsultantForm({ form, editing, loading, onChange, onSave, onCancel }: Props) {
  const set = (key: keyof ConsultantFormData, val: any) => onChange({ ...form, [key]: val })
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function uploadPhoto(file: File) {
    if (!file.type.startsWith('image/')) { alert('이미지 파일만 올릴 수 있습니다'); return }
    setUploading(true)
    try {
      const ext = file.name.split('.').pop() || 'jpg'
      const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error } = await supabase.storage
        .from('consultant-photos')
        .upload(path, file, { upsert: true })
      if (error) { alert('사진 업로드 실패: ' + error.message); setUploading(false); return }
      const { data } = supabase.storage.from('consultant-photos').getPublicUrl(path)
      set('photo_url', data.publicUrl)
    } catch (e: any) {
      alert('사진 업로드 오류: ' + (e?.message || e))
    }
    setUploading(false)
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) uploadPhoto(file)
  }

  const inputStyle = { background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } as const
  const selectStyle = { background: '#2C2C2A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' } as const
  const labelStyle = { color: '#b0aec8' } as const

  return (
    <div className="rounded-2xl p-5 mb-6"
      style={{ background: 'rgba(60,52,137,0.2)', border: '1px solid rgba(250,199,117,0.2)' }}>
      <div className="text-sm font-bold mb-4" style={{ color: '#FAC775' }}>
        {editing ? '✏️ 상담사 수정' : '➕ 상담사 등록'}
      </div>

      {/* 기본 정보 (기존 그대로) */}
      <div className="grid grid-cols-3 gap-3">

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>이름</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>전화번호 (- 없이)</label>
          <input value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))}
            placeholder="01012345678"
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>이메일</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>전문분야</label>
          <select value={form.specialty} onChange={e => set('specialty', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={selectStyle}>
            <option value="">선택</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>거주지역</label>
          <select value={form.region} onChange={e => set('region', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={selectStyle}>
            <option value="">선택</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>상담료 (원)</label>
          <input type="number" value={form.price} onChange={e => set('price', parseInt(e.target.value) || 0)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
          <div className="text-xs mt-1" style={{ color: '#FAC775' }}>{form.price.toLocaleString()}원</div>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>은행</label>
          <select value={form.bank} onChange={e => set('bank', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={selectStyle}>
            <option value="">선택</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>계좌번호</label>
          <input value={form.account} onChange={e => set('account', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>수수료율 (%)</label>
          <input type="number" value={form.commission_rate} onChange={e => set('commission_rate', parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>수수료 금액 (원)</label>
          <input type="number" value={form.commission_amount} onChange={e => set('commission_amount', parseInt(e.target.value) || 0)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
          <div className="text-xs mt-1" style={{ color: '#FAC775' }}>{form.commission_amount.toLocaleString()}원</div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <label className="text-xs" style={labelStyle}>활성 여부</label>
          <button onClick={() => set('active', !form.active)}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={form.active
              ? { background: 'rgba(76,175,80,0.2)', color: '#81c784' }
              : { background: 'rgba(255,100,100,0.2)', color: '#ff6464' }}>
            {form.active ? '✅ 활성' : '❌ 비활성'}
          </button>
        </div>

      </div>

      {/* 고객 화면에 보일 정보 (새로 추가) */}
      <div className="rounded-xl p-4 mt-5"
        style={{ background: 'rgba(60,52,137,0.25)', border: '1px solid rgba(250,199,117,0.25)' }}>
        <div className="text-xs font-bold mb-3" style={{ color: '#FAC775' }}>
          고객 화면에 보일 정보
        </div>

        {/* 사진 */}
        <label className="text-xs mb-1 block" style={labelStyle}>사진</label>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className="rounded-xl mb-4 flex items-center gap-4 cursor-pointer"
          style={{
            padding: '14px',
            border: dragOver ? '1.5px dashed #FAC775' : '1.5px dashed rgba(255,255,255,0.2)',
            background: 'rgba(255,255,255,0.04)',
          }}>
          {form.photo_url ? (
            <img src={form.photo_url} alt="상담사 사진"
              style={{ width: 64, height: 64, borderRadius: 12, objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: 12, background: 'rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🖼️</div>
          )}
          <div className="text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {uploading ? '올리는 중...' : form.photo_url ? '사진을 바꾸려면 다시 끌어다 놓거나 클릭' : '사진을 끌어다 놓거나 클릭해서 선택'}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
        </div>

        {/* 경력 */}
        <label className="text-xs mb-1 block" style={labelStyle}>경력 (줄바꿈으로 여러 줄)</label>
        <textarea value={form.career} onChange={e => set('career', e.target.value)}
          rows={2} placeholder={'명리학 20년\n○○대학교 동양철학'}
          className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-4" style={inputStyle} />

        {/* 소개글 */}
        <label className="text-xs mb-1 block" style={labelStyle}>소개글</label>
        <textarea value={form.intro} onChange={e => set('intro', e.target.value)}
          rows={2} placeholder="사주와 물상도를 함께 풀어드립니다…"
          className="w-full rounded-xl px-3 py-2 text-sm outline-none mb-4" style={inputStyle} />

        {/* 별점 · 상담건수 · 대표후기 (임시값) */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1 block" style={labelStyle}>별점 (임시, 예: 4.9)</label>
            <input type="number" step="0.1" value={form.rating}
              onChange={e => set('rating', parseFloat(e.target.value) || 0)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="text-xs mb-1 block" style={labelStyle}>상담건수 (임시)</label>
            <input type="number" value={form.review_count}
              onChange={e => set('review_count', parseInt(e.target.value) || 0)}
              className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
          </div>
        </div>
        <div className="mt-3">
          <label className="text-xs mb-1 block" style={labelStyle}>대표 후기 한 줄 (임시)</label>
          <input value={form.review_text} onChange={e => set('review_text', e.target.value)}
            placeholder="막막했던 부분을 차분히 짚어주셨어요"
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={onSave} disabled={loading || uploading}
          className="flex-1 py-2.5 rounded-xl text-sm font-bold"
          style={{ background: '#FAC775', color: '#1a1a18' }}>
          {loading ? '저장중...' : editing ? '수정 저장' : '등록'}
        </button>
        {editing && (
          <button onClick={onCancel}
            className="px-5 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}>
            취소
          </button>
        )}
      </div>
    </div>
  )
}
