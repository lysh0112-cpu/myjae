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
  /** ★48부 14차 — 좁힌 칸. 높이 32px (전에는 42px) */
  const fieldStyle = { ...inputStyle, height: 32 } as const
  const fieldSelectStyle = { ...selectStyle, height: 32 } as const

  return (
    <div className="rounded-2xl p-5 mb-6"
      style={{ background: 'rgba(60,52,137,0.2)', border: '1px solid rgba(250,199,117,0.2)' }}>
      <div className="text-sm font-bold mb-4" style={{ color: '#FAC775' }}>
        {editing ? '✏️ 상담사 수정' : '➕ 상담사 등록'}
      </div>

      {/* 기본 정보 (기존 그대로) */}
      {/* ══════════════════════════════════════════════════════════════
          ★2026-08-07 (48부 14차) — ★3열 → «6열» 로 좁혔습니다 [대표님 지시]
            「입력하는 글자 대비 ★칸이 너무 커서 줄이고 ★한 행에 6개를 넣도록」

          ⚠️ 칸 높이 ★42 → 32px · 글자 14 → 13px · 이름표 12 → 11px
             ⇒ 세로가 ★절반쯤 짧아집니다. 실제 넣는 글자가 짧아 빈 자리가 많았습니다.
          ⚠️ ★이메일·계좌번호만 «두 칸»(col-span-2) — 글자가 길어 한 칸이면 잘립니다.
          ⚠️ ★「0원」 미리보기는 «칸 안 오른쪽» 으로 옮겼습니다 (아래 줄을 안 씁니다).
          ⛔ 다시 3열로 되돌리지 마십시오. ⛔ 1400px 에서 재 보고 고치십시오.
          ══════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-6 gap-2">

        <div>
          <label className="text-[11px] mb-1 block" style={labelStyle}>
            이름 <span style={{ color: '#8e8ba8' }}>본명</span>
          </label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldStyle} />
        </div>

        {/* ★48부 4차 — 별칭(호). ⚠️ 비우면 ★본명이 그대로 나갑니다. */}
        <div>
          <label className="text-[11px] mb-1 block" style={labelStyle}>
            별칭 (호) <span style={{ color: '#FAC775' }}>고객용</span>
          </label>
          <input value={form.alias} onChange={e => set('alias', e.target.value)}
            placeholder="예: 청산"
            className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldStyle} />
        </div>

        <div>
          <label className="text-[11px] mb-1 block" style={labelStyle}>전화번호</label>
          <input value={form.phone} onChange={e => set('phone', formatPhone(e.target.value))}
            placeholder="01012345678"
            className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldStyle} />
        </div>

        {/* ★두 칸 — 이메일은 글자가 깁니다 */}
        <div className="col-span-2">
          <label className="text-[11px] mb-1 block" style={labelStyle}>이메일</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
            className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldStyle} />
        </div>

        <div>
          <label className="text-[11px] mb-1 block" style={labelStyle}>거주지역</label>
          <select value={form.region} onChange={e => set('region', e.target.value)}
            className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldSelectStyle}>
            <option value="">선택</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        <div>
          <label className="text-[11px] mb-1 block" style={labelStyle}>상담료 (원)</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={form.price} onChange={e => set('price', parseInt(e.target.value) || 0)}
              className="w-full rounded-lg pl-2 pr-11 text-[13px] outline-none" style={fieldStyle} />
            {/* ★48부 14차 — 미리보기를 «칸 안» 으로. 아래 줄을 안 씁니다. */}
            <span className="text-[10px]" style={{ position: 'absolute', right: 6, top: 9, color: '#FAC775', pointerEvents: 'none' }}>
              {form.price.toLocaleString()}원
            </span>
          </div>
        </div>

        <div>
          <label className="text-[11px] mb-1 block" style={labelStyle}>은행</label>
          <select value={form.bank} onChange={e => set('bank', e.target.value)}
            className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldSelectStyle}>
            <option value="">선택</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* ★두 칸 — 계좌번호도 깁니다 */}
        <div className="col-span-2">
          <label className="text-[11px] mb-1 block" style={labelStyle}>계좌번호</label>
          <input value={form.account} onChange={e => set('account', e.target.value)}
            className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldStyle} />
        </div>

        <div>
          <label className="text-[11px] mb-1 block" style={labelStyle}>수수료율 (%)</label>
          <input type="number" value={form.commission_rate} onChange={e => set('commission_rate', parseFloat(e.target.value) || 0)}
            className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldStyle} />
        </div>

        <div>
          <label className="text-[11px] mb-1 block" style={labelStyle}>수수료 (원)</label>
          <div style={{ position: 'relative' }}>
            <input type="number" value={form.commission_amount} onChange={e => set('commission_amount', parseInt(e.target.value) || 0)}
              className="w-full rounded-lg pl-2 pr-11 text-[13px] outline-none" style={fieldStyle} />
            <span className="text-[10px]" style={{ position: 'absolute', right: 6, top: 9, color: '#FAC775', pointerEvents: 'none' }}>
              {form.commission_amount.toLocaleString()}원
            </span>
          </div>
        </div>

      </div>

      <div className="flex items-center gap-3 mt-3">
        <label className="text-[11px]" style={labelStyle}>활성 여부</label>
        <button onClick={() => set('active', !form.active)}
          className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
          style={form.active
            ? { background: 'rgba(76,175,80,0.2)', color: '#81c784' }
            : { background: 'rgba(255,100,100,0.2)', color: '#ff6464' }}>
          {form.active ? '✅ 활성' : '❌ 비활성'}
        </button>
        <span className="text-[11px]" style={{ color: '#8e8ba8' }}>
          {form.alias ? `고객 화면 — ${form.alias} 선생님` : '별칭을 비우면 본명이 그대로 보입니다'}
        </span>
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

        {/* ══════════════════════════════════════════════════════════
            ★2026-08-07 (48부 15차) — ★사진 «옆» 에 경력 [대표님 지시]
              「사진 등록 옆으로 ★경력입력란을 나란히 배치 · 공간활용차원」
            ⚠️ 사진칸이 가로로 넓기만 하고 ★빈 자리가 많았습니다.
            ⚠️ 사진 ★320px 고정 · 경력이 ★남는 자리를 다 씁니다.
            ⛔ 다시 «위아래» 로 쌓지 마십시오.
            ══════════════════════════════════════════════════════════ */}
        <div className="flex gap-3 mb-3" style={{ alignItems: 'flex-start' }}>

          <div style={{ width: 320, flexShrink: 0 }}>
            <label className="text-[11px] mb-1 block" style={labelStyle}>사진</label>
            <div
              onClick={() => fileRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className="rounded-xl flex items-center gap-3 cursor-pointer"
              style={{
                padding: '10px 12px', height: 84,
                border: dragOver ? '1.5px dashed #FAC775' : '1.5px dashed rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.04)',
              }}>
              {form.photo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.photo_url} alt="상담사 사진"
                  style={{ width: 58, height: 58, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <div style={{ width: 58, height: 58, borderRadius: 10, background: 'rgba(255,255,255,0.06)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>🖼️</div>
              )}
              <div className="text-[11px]" style={{ color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                {uploading ? '올리는 중...' : form.photo_url ? '바꾸려면 다시 끌어다 놓거나 클릭' : '끌어다 놓거나 클릭해서 선택'}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { const f = e.target.files?.[0]; if (f) uploadPhoto(f) }} />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <label className="text-[11px] mb-1 block" style={labelStyle}>경력 (줄바꿈으로 여러 줄)</label>
            <textarea value={form.career} onChange={e => set('career', e.target.value)}
              rows={3} placeholder={'명리학 20년\n○○대학교 동양철학'}
              className="w-full rounded-lg px-2 py-1.5 text-[13px] outline-none"
              style={{ ...inputStyle, height: 84, resize: 'vertical' }} />
          </div>

        </div>

        {/* 소개글 · 대표 후기 — ★나란히 (전에는 위아래였습니다) */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[11px] mb-1 block" style={labelStyle}>소개글</label>
            <textarea value={form.intro} onChange={e => set('intro', e.target.value)}
              rows={2} placeholder="사주와 물상도를 함께 풀어드립니다…"
              className="w-full rounded-lg px-2 py-1.5 text-[13px] outline-none"
              style={{ ...inputStyle, height: 60, resize: 'vertical' }} />
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={labelStyle}>대표 후기 한 줄 (임시)</label>
            <input value={form.review_text} onChange={e => set('review_text', e.target.value)}
              placeholder="막막했던 부분을 차분히 짚어주셨어요"
              className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldStyle} />
          </div>
        </div>

        {/* 별점 · 상담건수 (임시값) — ★좁은 두 칸이면 됩니다 */}
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="text-[11px] mb-1 block" style={labelStyle}>별점 (예: 4.9)</label>
            <input type="number" step="0.1" value={form.rating}
              onChange={e => set('rating', parseFloat(e.target.value) || 0)}
              className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldStyle} />
          </div>
          <div>
            <label className="text-[11px] mb-1 block" style={labelStyle}>상담건수</label>
            <input type="number" value={form.review_count}
              onChange={e => set('review_count', parseInt(e.target.value) || 0)}
              className="w-full rounded-lg px-2 text-[13px] outline-none" style={fieldStyle} />
          </div>
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
