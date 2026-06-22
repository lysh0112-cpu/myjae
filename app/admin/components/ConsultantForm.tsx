'use client'
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
}

export const emptyForm: ConsultantFormData = {
  id: '', name: '', phone: '', email: '', specialty: '',
  price: 0, bank: '', account: '', active: true,
  region: '', commission_rate: 0, commission_amount: 0,
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

  return (
    <div className="rounded-2xl p-5 mb-6"
      style={{ background: 'rgba(60,52,137,0.2)', border: '1px solid rgba(250,199,117,0.2)' }}>
      <div className="text-sm font-bold mb-4" style={{ color: '#FAC775' }}>
        {editing ? '✏️ 상담사 수정' : '➕ 상담사 등록'}
      </div>
      <div className="grid grid-cols-3 gap-3">

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>이름</label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>전화번호 (- 없이)</label>
          <input value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))}
            placeholder="01012345678"
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>이메일</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>전문분야</label>
          <select value={form.specialty} onChange={e => set('specialty', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: '#2C2C2A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="">선택</option>
            {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>거주지역</label>
          <select value={form.region} onChange={e => set('region', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: '#2C2C2A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="">선택</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>상담료 (원)</label>
          <input type="number" value={form.price} onChange={e => set('price', parseInt(e.target.value) || 0)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
          <div className="text-xs mt-1" style={{ color: '#FAC775' }}>{form.price.toLocaleString()}원</div>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>은행</label>
          <select value={form.bank} onChange={e => set('bank', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: '#2C2C2A', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}>
            <option value="">선택</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>계좌번호</label>
          <input value={form.account} onChange={e => set('account', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>수수료율 (%)</label>
          <input type="number" value={form.commission_rate} onChange={e => set('commission_rate', parseFloat(e.target.value) || 0)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
        </div>

        <div>
          <label className="text-xs mb-1 block" style={{ color: '#b0aec8' }}>수수료 금액 (원)</label>
          <input type="number" value={form.commission_amount} onChange={e => set('commission_amount', parseInt(e.target.value) || 0)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none"
            style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }} />
          <div className="text-xs mt-1" style={{ color: '#FAC775' }}>{form.commission_amount.toLocaleString()}원</div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <label className="text-xs" style={{ color: '#b0aec8' }}>활성 여부</label>
          <button onClick={() => set('active', !form.active)}
            className="px-4 py-2 rounded-xl text-xs font-bold"
            style={form.active
              ? { background: 'rgba(76,175,80,0.2)', color: '#81c784' }
              : { background: 'rgba(255,100,100,0.2)', color: '#ff6464' }}>
            {form.active ? '✅ 활성' : '❌ 비활성'}
          </button>
        </div>

      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={onSave} disabled={loading}
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
