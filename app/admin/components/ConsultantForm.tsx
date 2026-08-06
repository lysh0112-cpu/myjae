'use client'
import { useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BANKS, SERVICE_SPECIALTIES, REGIONS, formatPhone } from './consultantData'

export type ConsultantFormData = {
  id: string
  name: string
  /**
   * ★2026-08-06 (48부 4차) — 별칭(호) [대표님 지시]
   *   「상담사는 ★본명은 «관리자만» 관리를 하고,
   *     고객들은 ★별칭인 "호" 가 보이도록 하려고 해」
   *   ⚠️ 비면 ★본명이 그대로 나갑니다 (지금 계신 분들이 안 사라지도록).
   *   ⛔ 손님 화면에 name 을 «직접» 쓰지 마십시오. ★shownName(c) 을 쓰십시오.
   */
  alias: string
  phone: string
  email: string
  specialty: string
  /**
   * ★2026-08-06 (48부 3차) — 전문분야를 «여러 개» 고릅니다 [대표님 지시]
   *   담기는 값은 ★consult_prices 의 price_key 입니다 (예: ['saju','couple']).
   *   ⚠️ 위 specialty(한 칸)는 ★손님 화면(consultant-select)이 아직 읽습니다 —
   *      상담사 이름 아래 한 줄로 나옵니다. 그래서 ★지우지 않고,
   *      저장할 때 여기서 만든 한 줄을 «함께» 넣어 둡니다.
   *   ⛔ specialty 칸을 지우지 마십시오. 손님 화면 한 줄이 빈칸이 됩니다.
   */
  specialties: string[]
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
  sort: number
}

export const emptyForm: ConsultantFormData = {
  id: '', name: '', alias: '', phone: '', email: '', specialty: '', specialties: [],
  price: 0, bank: '', account: '', active: true,
  region: '', commission_rate: 0, commission_amount: 0,
  photo_url: '', career: '', intro: '',
  rating: 0, review_count: 0, review_text: '',
  sort: 0,
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
    } catch (e: unknown) {
      const _m = e instanceof Error ? e.message : ''
      alert('사진 업로드 오류: ' + (_m || String(e)))
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
          <label className="text-xs mb-1 block" style={labelStyle}>
            이름 <span style={{ color: '#8e8ba8' }}>(본명 · 관리자만 봅니다)</span>
          </label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
        </div>

        {/* ★2026-08-06 (48부 4차) — 별칭(호) [대표님 지시]
            「상담사는 본명은 관리자만 관리를 하고,
              고객들은 ★별칭인 "호" 가 보이도록 하려고 해」
            ⚠️ 비워 두면 ★본명이 그대로 나갑니다. */}
        <div>
          <label className="text-xs mb-1 block" style={labelStyle}>
            별칭 (호) <span style={{ color: '#FAC775' }}>— 고객에게 보입니다</span>
          </label>
          <input value={form.alias} onChange={e => set('alias', e.target.value)}
            placeholder="예: 청산"
            className="w-full rounded-xl px-3 py-2 text-sm outline-none" style={inputStyle} />
          <div className="text-xs mt-1" style={{ color: '#8e8ba8' }}>
            {form.alias
              ? `고객 화면 — ${form.alias} 선생님`
              : '비우면 본명이 그대로 보입니다'}
          </div>
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

      {/* ══════════════════════════════════════════════════════════════
          ★2026-08-06 (48부 3차) — 전문분야 토글 «열 개» [대표님 지시]
            「전문분야를 홈서비스 버튼에 맞춰서 각 상담사별로
              토글로 연결할지 말지 버튼만 만들어 주면 된다」

          ⚠️ ★3열 격자 «밖» 에 두었습니다 — 열 개가 한 칸에 안 들어갑니다.
          ⚠️ 담기는 값은 ★price_key 입니다 (consult_prices 와 «같은» 값).
             ⇒ 손님이 온 화면(ConsultButton 의 priceKey)과 그대로 짝이 맞습니다.
          ⚠️ 차례는 ★대표님이 적어 주신 그대로입니다 (홈 카드 차례와 다릅니다).
          ⛔ SERVICE_SPECIALTIES 의 key 를 바꾸지 마십시오 — 열두 화면과 어긋납니다.
          ══════════════════════════════════════════════════════════════ */}
      <div className="mt-4 rounded-2xl p-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>

        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <label className="text-xs" style={labelStyle}>
            전문분야 <span style={{ color: '#8e8ba8' }}>— 여러 개 고를 수 있어요</span>
          </label>
          <button type="button"
            onClick={() => set('specialties', SERVICE_SPECIALTIES.map(s => s.key))}
            className="px-3 py-1 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#b0aec8' }}>
            전체 선택
          </button>
          <button type="button"
            onClick={() => set('specialties', [])}
            className="px-3 py-1 rounded-lg text-xs"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#b0aec8' }}>
            전체 해제
          </button>
          <span className="text-xs ml-auto" style={{ color: '#8e8ba8' }}>
            {form.specialties.length}개 선택됨
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {SERVICE_SPECIALTIES.map(s => {
            const on = form.specialties.includes(s.key)
            return (
              <button key={s.key} type="button"
                onClick={() => set('specialties', on
                  ? form.specialties.filter(k => k !== s.key)
                  : [...form.specialties, s.key])}
                className="rounded-xl px-3 py-2 text-left"
                style={on
                  ? { background: 'rgba(127,119,221,0.22)', border: '2px solid #7F77DD', color: '#CECBF6' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.10)', color: '#8e8ba8' }}>
                <div className="text-[13px] leading-tight">{s.icon} {s.name}</div>
                <div className="text-[11px] mt-0.5" style={{ color: on ? '#AFA9EC' : '#6d6a85' }}>{s.key}</div>
              </button>
            )
          })}
        </div>

        <div className="text-xs mt-3" style={{ color: '#8e8ba8' }}>
          고른 서비스의 결과 화면에서만 이 상담사가 보입니다.
        </div>
      </div>

      {/* 고객 화면에 보일 정보 */}
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
