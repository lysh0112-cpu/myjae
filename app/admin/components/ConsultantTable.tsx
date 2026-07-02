'use client'
import { useState } from 'react'
import { ConsultantFormData } from './ConsultantForm'

type Props = {
  list: ConsultantFormData[]
  onEdit: (c: ConsultantFormData) => void
  onDelete: (id: string) => void
  onToggleActive: (c: ConsultantFormData) => void
}

// 토글 가능한 열 정의
const COLUMNS = [
  { key: 'email', label: '이메일' },
  { key: 'phone', label: '전화번호' },
  { key: 'specialty', label: '전문분야' },
  { key: 'region', label: '거주지역' },
  { key: 'bank', label: '은행/계좌' },
  { key: 'commission', label: '수수료' },
] as const
type ColKey = typeof COLUMNS[number]['key']

export default function ConsultantTable({ list, onEdit, onDelete, onToggleActive }: Props) {
  // 기본으로 켜둘 열
  const [cols, setCols] = useState<Record<ColKey, boolean>>({
    email: false, phone: false, specialty: true,
    region: false, bank: false, commission: false,
  })
  const [openId, setOpenId] = useState<string | null>(null)

  const toggleCol = (k: ColKey) => setCols(prev => ({ ...prev, [k]: !prev[k] }))

  // 엑셀(CSV) 다운로드 — 켜진 열만
  function downloadCSV() {
    const headers = ['이름', '활성']
    if (cols.email) headers.push('이메일')
    if (cols.phone) headers.push('전화번호')
    if (cols.specialty) headers.push('전문분야')
    if (cols.region) headers.push('거주지역')
    if (cols.bank) headers.push('은행', '계좌번호')
    if (cols.commission) headers.push('수수료율', '수수료금액')

    const esc = (v: any) => {
      const s = String(v ?? '')
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }

    const rows = list.map(c => {
      const r = [c.name, c.active ? '활성' : '비활성']
      if (cols.email) r.push(c.email || '')
      if (cols.phone) r.push(c.phone || '')
      if (cols.specialty) r.push(c.specialty || '')
      if (cols.region) r.push(c.region || '')
      if (cols.bank) r.push(c.bank || '', c.account || '')
      if (cols.commission) r.push(String(c.commission_rate || 0) + '%', String(c.commission_amount || 0))
      return r.map(esc).join(',')
    })

    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `상담사목록_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const chipStyle = (on: boolean) => on
    ? { background: 'rgba(250,199,117,0.2)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.4)' }
    : { background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.1)' }

  return (
    <div className="p-4">
      {/* 툴바 : 열 토글 + 엑셀 */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="text-xs" style={{ color: '#8a88a0' }}>보일 열</span>
        {COLUMNS.map(col => (
          <button key={col.key} onClick={() => toggleCol(col.key)}
            className="px-3 py-1 rounded-full text-xs font-bold"
            style={chipStyle(cols[col.key])}>
            {cols[col.key] ? '✓ ' : ''}{col.label}
          </button>
        ))}
        <button onClick={downloadCSV}
          className="ml-auto px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"
          style={{ background: 'rgba(76,175,80,0.15)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }}>
          📊 엑셀 다운로드
        </button>
      </div>
      <div className="text-xs mb-3" style={{ color: '#6a6880' }}>
        켜진 열만 엑셀에 담깁니다 · 상담사를 누르면 상세가 펼쳐집니다
      </div>

      {/* 목록 */}
      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        {/* 헤더 */}
        <div className="flex items-center gap-3 px-3 py-2 text-xs font-bold"
          style={{ background: 'rgba(60,52,137,0.3)', color: '#FAC775' }}>
          <span style={{ width: 34 }}></span>
          <span style={{ flex: 1 }}>이름</span>
          <span style={{ width: 50, textAlign: 'center' }}>활성</span>
          {cols.email && <span style={{ width: 130 }}>이메일</span>}
          {cols.phone && <span style={{ width: 100 }}>전화번호</span>}
          {cols.specialty && <span style={{ width: 90 }}>전문분야</span>}
          {cols.region && <span style={{ width: 60 }}>지역</span>}
          {cols.bank && <span style={{ width: 160 }}>은행/계좌</span>}
          {cols.commission && <span style={{ width: 90 }}>수수료</span>}
        </div>

        {list.map((c, i) => (
          <div key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            {/* 한 줄 */}
            <div className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
              style={{ background: openId === c.id ? 'rgba(250,199,117,0.06)' : (i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent') }}
              onClick={() => setOpenId(openId === c.id ? null : c.id)}>
              {/* 썸네일 */}
              <div style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0,
                background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.photo_url
                  ? <img src={c.photo_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 13, color: '#b0aec8' }}>{c.name?.[0] || '?'}</span>}
              </div>
              <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#fff' }}>{c.name}</span>
              <span style={{ width: 50, textAlign: 'center' }}>
                <button onClick={e => { e.stopPropagation(); onToggleActive(c) }}
                  className="px-2 py-0.5 rounded-lg text-xs font-bold"
                  style={c.active
                    ? { background: 'rgba(76,175,80,0.2)', color: '#81c784' }
                    : { background: 'rgba(255,100,100,0.2)', color: '#ff6464' }}>
                  {c.active ? '활성' : '비활'}
                </button>
              </span>
              {cols.email && <span style={{ width: 130, fontSize: 12, color: '#b0aec8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || '-'}</span>}
              {cols.phone && <span style={{ width: 100, fontSize: 12, color: '#b0aec8' }}>{c.phone || '-'}</span>}
              {cols.specialty && <span style={{ width: 90, fontSize: 12, color: '#b0aec8' }}>{c.specialty || '-'}</span>}
              {cols.region && <span style={{ width: 60, fontSize: 12, color: '#b0aec8' }}>{c.region || '-'}</span>}
              {cols.bank && <span style={{ width: 160, fontSize: 12, color: '#b0aec8' }}>{c.bank || '-'} {c.account || ''}</span>}
              {cols.commission && <span style={{ width: 90, fontSize: 12, color: '#b0aec8' }}>{c.commission_rate || 0}% / {(c.commission_amount || 0).toLocaleString()}</span>}
            </div>

            {/* 펼친 상세 카드 */}
            {openId === c.id && (
              <div className="px-4 py-4" style={{ background: 'rgba(255,255,255,0.03)' }}>
                <div className="flex gap-3 mb-3">
                  <div style={{ width: 64, height: 64, borderRadius: 12, overflow: 'hidden', flexShrink: 0,
                    background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {c.photo_url
                      ? <img src={c.photo_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontSize: 20, color: '#b0aec8' }}>{c.name?.[0] || '?'}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2">
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.name} 선생님</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#FAC775' }}>
                        {c.rating ? `★ ${c.rating}` : '★ —'} {c.review_count ? `· ${c.review_count}건` : ''}
                      </span>
                    </div>
                    {c.career
                      ? <div style={{ fontSize: 12, color: '#b0aec8', marginTop: 4, whiteSpace: 'pre-line' }}>{c.career}</div>
                      : <div style={{ fontSize: 12, color: '#6a6880', marginTop: 4, fontStyle: 'italic' }}>경력 없음 — 수정에서 입력</div>}
                    <div style={{ fontSize: 12, color: '#b0aec8', marginTop: 2 }}>{c.specialty || '-'} · {c.region || '-'}</div>
                  </div>
                </div>

                {c.intro
                  ? <p style={{ fontSize: 12, color: '#b0aec8', lineHeight: 1.6, background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '9px 11px', marginBottom: 8 }}>{c.intro}</p>
                  : <p style={{ fontSize: 12, color: '#6a6880', fontStyle: 'italic', marginBottom: 8 }}>소개글 없음 — 수정에서 입력</p>}

                {c.review_text && (
                  <div style={{ fontSize: 12, color: '#b0aec8', background: 'rgba(0,0,0,0.2)', borderRadius: 8, padding: '9px 11px', marginBottom: 8 }}>
                    “{c.review_text}”
                  </div>
                )}

                <div style={{ fontSize: 11, color: '#6a6880', marginBottom: 10 }}>
                  {c.bank || '-'} {c.account || ''} · 수수료 {c.commission_rate || 0}%
                </div>

                <div className="flex gap-2">
                  <button onClick={e => { e.stopPropagation(); onEdit(c) }}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ background: '#FAC775', color: '#1a1a18' }}>
                    ✏️ 수정
                  </button>
                  <button onClick={e => { e.stopPropagation(); onDelete(c.id) }}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>
                    🗑️ 삭제
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {list.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            등록된 상담사가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
