'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConsultantFormData } from './ConsultantForm'
import { specialtyLabel } from './consultantData'

// 상담사별 "아직 살아 있는 예약"(완료도 취소도 안 된 건)
type PendingInfo = { count: number; names: string[] }

type Props = {
  list: ConsultantFormData[]
  /** ★2026-07-21 2차: 진행중 예약을 목록에 미리 보여준다 */
  pending?: Record<string, PendingInfo>
  onEdit: (c: ConsultantFormData) => void
  onDelete: (id: string) => void
  onToggleActive: (c: ConsultantFormData) => void
  onSaveSort: (id: string, sort: number) => void
}

const COLUMNS = [
  { key: 'email', label: '이메일' },
  { key: 'phone', label: '전화번호' },
  { key: 'specialty', label: '전문분야' },
  { key: 'region', label: '거주지역' },
  { key: 'bank', label: '은행/계좌' },
  { key: 'commission', label: '수수료' },
] as const
type ColKey = typeof COLUMNS[number]['key']

export default function ConsultantTable({ list, pending = {}, onEdit, onDelete, onToggleActive, onSaveSort }: Props) {
  const router = useRouter()
  const [cols, setCols] = useState<Record<ColKey, boolean>>({
    email: false, phone: false, specialty: true,
    region: false, bank: false, commission: false,
  })
  const [openId, setOpenId] = useState<string | null>(null)
  // 순번 입력 중인 값 (id별)
  const [sortDraft, setSortDraft] = useState<Record<string, string>>({})

  const toggleCol = (k: ColKey) => setCols(prev => ({ ...prev, [k]: !prev[k] }))

  function draftOf(c: ConsultantFormData): string {
    return sortDraft[c.id!] !== undefined ? sortDraft[c.id!] : String(c.sort ?? 0)
  }
  function setDraft(id: string, v: string) {
    setSortDraft(prev => ({ ...prev, [id]: v.replace(/[^0-9]/g, '') }))
  }
  function saveDraft(c: ConsultantFormData) {
    const n = parseInt(draftOf(c)) || 0
    onSaveSort(c.id!, n)
    setSortDraft(prev => { const next = { ...prev }; delete next[c.id!]; return next })
  }

  function downloadCSV() {
    // ★48부 4차 — 별칭(호)을 이름 «바로 뒤» 에
    const headers = ['순번', '이름', '별칭(호)', '활성']
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
      const r = [String(c.sort ?? 0), c.name, c.alias || '', c.active ? '활성' : '비활성']
      if (cols.email) r.push(c.email || '')
      if (cols.phone) r.push(c.phone || '')
      if (cols.specialty) r.push(c.specialty || specialtyLabel(c.specialties ?? []) || '')
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
        순번을 고치고 옆의 저장 버튼을 누르세요 · 작을수록 위로 · 비활성은 고객 화면에 안 보여요 · 이름을 누르면 상세가 펼쳐집니다 · 진행중 예약이 있으면 삭제할 수 없어요
      </div>

      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3 px-3 py-2 text-xs font-bold"
          style={{ background: 'rgba(60,52,137,0.3)', color: '#FAC775' }}>
          <span style={{ width: 92, textAlign: 'center' }}>순번</span>
          <span style={{ width: 34 }}></span>
          <span style={{ flex: 1, minWidth: 80 }}>이름</span>
          <span style={{ width: 210 }}>진행중 예약</span>
          <span style={{ width: 50, textAlign: 'center' }}>활성</span>
          {/* ★2026-08-05 (47부 4차) — 「화면」 칸 [대표님 지시]
              「관리자 화면 상담사목록에 버튼란을 하나 만들어서
                상담사를 클릭하면 해당 상담사 관리자 화면으로 가게 해줘」
              ⚠️ 전에도 「🔮 화면 보기」가 있었지만 ★이름을 눌러 «펼쳐야» 나오는
                 상세 안에 숨어 있어 목록에서는 안 보였습니다. */}
          <span style={{ width: 64, textAlign: 'center' }}>화면</span>
          {cols.email && <span style={{ width: 130 }}>이메일</span>}
          {cols.phone && <span style={{ width: 100 }}>전화번호</span>}
          {cols.specialty && <span style={{ width: 90 }}>전문분야</span>}
          {cols.region && <span style={{ width: 60 }}>지역</span>}
          {cols.bank && <span style={{ width: 160 }}>은행/계좌</span>}
          {cols.commission && <span style={{ width: 90 }}>수수료</span>}
        </div>

        {list.map((c, i) => {
          const changed = sortDraft[c.id!] !== undefined && (parseInt(draftOf(c)) || 0) !== (c.sort ?? 0)
          return (
          <div key={c.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-3 px-3 py-2.5"
              style={{ background: openId === c.id ? 'rgba(250,199,117,0.06)' : (i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent') }}>
              {/* 순번 입력 + 저장 버튼 */}
              <div style={{ width: 92, display: 'flex', gap: 4, alignItems: 'center', justifyContent: 'center' }}>
                <input type="text" inputMode="numeric" value={draftOf(c)}
                  onChange={e => setDraft(c.id!, e.target.value)}
                  className="rounded-lg text-xs text-center outline-none"
                  style={{ width: 40, padding: '5px 0', background: 'rgba(255,255,255,0.08)', color: '#FAC775',
                    border: '1px solid rgba(250,199,117,0.25)' }} />
                <button onClick={() => saveDraft(c)}
                  className="rounded-lg text-xs font-bold"
                  style={{ padding: '5px 7px',
                    background: changed ? '#FAC775' : 'rgba(255,255,255,0.08)',
                    color: changed ? '#1a1a18' : '#8a88a0' }}>
                  저장
                </button>
              </div>
              {/* 썸네일 (누르면 펼침) */}
              <div onClick={() => setOpenId(openId === c.id ? null : c.id)}
                style={{ width: 34, height: 34, borderRadius: 8, overflow: 'hidden', flexShrink: 0, cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {c.photo_url
                  ? <img src={c.photo_url} alt={c.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <span style={{ fontSize: 13, color: '#b0aec8' }}>{c.name?.[0] || '?'}</span>}
              </div>
              {/* 이름 (누르면 펼침) */}
              <button type="button" onClick={() => setOpenId(openId === c.id ? null : c.id)}
                style={{ flex: 1, minWidth: 80, fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', background: 'none', border: 'none', padding: 0, textAlign: 'left', fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation' }}>
                {c.name}
                {/* ★48부 4차 — 별칭은 «곁들여» 보입니다. 관리자는 ★본명이 먼저입니다. */}
                {c.alias ? <span style={{ fontWeight: 400, color: '#FAC775', marginLeft: 5 }}>({c.alias})</span> : null}
              </button>

              {/* ★진행중 예약 — 완료도 취소도 안 된 건. 있으면 삭제할 수 없다. (2026-07-21 2차) */}
              <span style={{ width: 210, fontSize: 11.5, lineHeight: 1.4 }}>
                {(() => {
                  const p = pending[c.id!]
                  if (!p || p.count === 0) {
                    return <span style={{ color: '#6a6880' }}>없음 · 삭제 가능</span>
                  }
                  const head = p.names.slice(0, 2).join(' · ')
                  const rest = p.count - Math.min(2, p.names.length)
                  return (
                    <span style={{ color: '#FAC775' }}>
                      {p.count}건 — {head}{rest > 0 ? ` 외 ${rest}명` : ''}
                    </span>
                  )
                })()}
              </span>
              <span style={{ width: 50, textAlign: 'center' }}>
                <button onClick={() => onToggleActive(c)}
                  className="px-2 py-0.5 rounded-lg text-xs font-bold"
                  style={c.active
                    ? { background: 'rgba(76,175,80,0.2)', color: '#81c784' }
                    : { background: 'rgba(255,100,100,0.2)', color: '#ff6464' }}>
                  {c.active ? '활성' : '비활'}
                </button>
              </span>
              {/* ★2026-08-05 (47부 4차) — 목록에서 바로 그 상담사 화면으로 [대표님 지시]
                  ★from=admin 을 붙입니다 — 상담사 화면의 뒤로가기가 「← 관리자 화면」이 됩니다.
                  ★같은 탭으로 갑니다(router.push). 아래 상세 안 버튼은 새 탭(window.open)이라
                    다릅니다. 여기는 뒤로가기가 있어 같은 탭이 오가기 편합니다.
                  [대비 실측]  글자 #7fa8ff on 버튼바탕 #29313f = 5.57:1 (기준 4.5)
                    ⚠️ 버튼 «면» 은 행과 ★1.26:1 이라 «안 보입니다». 그래서 테두리를 넣었습니다 —
                       rgba(127,168,255,0.55) → 행과 ★3.06:1 (선 기준 3.0)
                    ⛔ 테두리를 지우거나 옅게 하지 마십시오. 버튼이 사라져 보입니다. */}
              <span style={{ width: 64, textAlign: 'center' }}>
                <button type="button"
                  onClick={() => router.push(`/manseryeok/consultant?consultantId=${c.id}&from=admin`)}
                  title={`${c.name} 선생님의 상담사 화면으로 갑니다 (점검·대리용)`}
                  className="rounded-lg text-xs font-bold"
                  style={{ padding: '5px 8px', background: 'rgba(100,150,255,0.15)', color: '#7fa8ff',
                    border: '1px solid rgba(127,168,255,0.55)', cursor: 'pointer', whiteSpace: 'nowrap',
                    fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation' }}>
                  🔮 화면
                </button>
              </span>
              {cols.email && <span style={{ width: 130, fontSize: 12, color: '#b0aec8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email || '-'}</span>}
              {cols.phone && <span style={{ width: 100, fontSize: 12, color: '#b0aec8' }}>{c.phone || '-'}</span>}
              {cols.specialty && <span style={{ width: 90, fontSize: 12, color: '#b0aec8' }}>{c.specialty || specialtyLabel(c.specialties ?? []) || '-'}</span>}
              {cols.region && <span style={{ width: 60, fontSize: 12, color: '#b0aec8' }}>{c.region || '-'}</span>}
              {cols.bank && <span style={{ width: 160, fontSize: 12, color: '#b0aec8' }}>{c.bank || '-'} {c.account || ''}</span>}
              {cols.commission && <span style={{ width: 90, fontSize: 12, color: '#b0aec8' }}>{c.commission_rate || 0}% / {(c.commission_amount || 0).toLocaleString()}</span>}
            </div>

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
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{c.name} 선생님{c.alias ? <span style={{ fontWeight: 400, color: '#FAC775', marginLeft: 5 }}>({c.alias})</span> : null}</span>
                      <span style={{ marginLeft: 'auto', fontSize: 12, color: '#FAC775' }}>
                        {c.rating ? `★ ${c.rating}` : '★ —'} {c.review_count ? `· ${c.review_count}건` : ''}
                      </span>
                    </div>
                    {c.career
                      ? <div style={{ fontSize: 12, color: '#b0aec8', marginTop: 4, whiteSpace: 'pre-line' }}>{c.career}</div>
                      : <div style={{ fontSize: 12, color: '#6a6880', marginTop: 4, fontStyle: 'italic' }}>경력 없음 — 수정에서 입력</div>}
                    <div style={{ fontSize: 12, color: '#b0aec8', marginTop: 2 }}>{c.specialty || specialtyLabel(c.specialties ?? []) || '-'} · {c.region || '-'}</div>
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
                  <button onClick={() => onEdit(c)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ background: '#FAC775', color: '#1a1a18' }}>
                    ✏️ 수정
                  </button>
                  {/* ★2026-07-21 2차: 매니저가 이 상담사의 화면을 바로 열 수 있게.
                      예전에는 consultantId 를 알아야 URL 로 들어갈 수 있었다. */}
                  {/* ★2026-08-05 (47부 3차) — from=admin 을 붙였습니다.
                      상담사 화면의 뒤로가기가 «관리자 화면으로» 돌아오게 하려는 것입니다.
                      ⚠️ 여기는 window.open(_blank) 이라 «새 탭» 입니다.
                         브라우저 뒤로가기가 원리상 안 되니 from 이 «반드시» 있어야 합니다. */}
                  <button onClick={() => window.open(`/manseryeok/consultant?consultantId=${c.id}&from=admin`, '_blank')}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    title="이 상담사의 화면을 새 탭으로 엽니다 (점검·대리용)"
                    style={{ background: 'rgba(100,150,255,0.15)', color: '#7fa8ff' }}>
                    🔮 화면 보기
                  </button>
                  <button onClick={() => onDelete(c.id!)}
                    className="flex-1 py-2 rounded-lg text-xs font-bold"
                    style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464' }}>
                    🗑️ 삭제
                  </button>
                </div>
              </div>
            )}
          </div>
          )
        })}

        {list.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: 'rgba(255,255,255,0.3)' }}>
            등록된 상담사가 없습니다
          </div>
        )}
      </div>
    </div>
  )
}
