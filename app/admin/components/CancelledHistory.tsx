'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getConsultTypeLabel } from './useDashboardTable'

type Cancelled = {
  id: string
  created_at: string
  deleted_at: string | null
  customer_phone: string
  customer_name: string | null
  paid_amount: number
  consultant_id: string
  booking_date: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  birth_data: any
}
type Consultant = { id: string; name: string }

function fmtDateTime(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  const mo = d.getMonth() + 1
  const da = d.getDate()
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mo}/${da} ${hh}:${mi}`
}
function fmtDate(iso: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleDateString('ko-KR')
}

export default function CancelledHistory() {
  const [list, setList] = useState<Cancelled[]>([])
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [loading, setLoading] = useState(true)
  // ══════════════════════════════════════════════════════════════════
  //  🔴 ★2026-09-09 — 「아직 안 돌려준 돈」  [대표님 지시]
  //    「관리자 화면에서 ★되돌려주지 않은 금액들만 따로 모아 볼 수 있으면 좋겠다」
  //
  //   [어떻게 가리나]  mc_ledger 에서 ★같은 ref(상담 건 id) 줄들의 «합» 을 봅니다 —
  //      -50,000(use) 만 있음         → ★아직 안 돌아감
  //      -50,000 + 50,000(refund)     → 돌아감
  //
  //   ⚠️⚠️ ★전제 — 서버의 wallet_refund 가 되돌림 줄에 «ref 를 남겨야» 합니다.
  //      2026-09-09 현재 지갑 SQL 이 저장소에 «없어» 확인하지 못했습니다.
  //      ⇒ 한 건 되돌려 보고 여기가 「돌아감」으로 바뀌는지 ★꼭 확인하십시오.
  //      ⇒ 안 바뀌면 서버가 ref 를 안 남기는 것이니, 그때 가리는 법을 바꾸십시오.
  //
  //   ⛔ [돌려주기] 단추를 넣지 마십시오 —
  //      지갑 함수는 ★«자기 것» 만 만집니다 (인자에 user_id 를 못 넣습니다 · 1부 3-3).
  //      ⇒ 눌러도 «안 되는» 단추가 됩니다. 🪙 회원 지갑에서 손으로 넣으십시오.
  //      □ 나중에 — 관리자용 되돌리기 함수를 서버에 두면 그때 단추를 붙이면 됩니다.
  // ══════════════════════════════════════════════════════════════════
  /** 상담 건 id → { 빠진 돈, 되돌아간 돈 } */
  const [money, setMoney] = useState<Record<string, { used: number; back: number }>>({})
  const [onlyUnpaid, setOnlyUnpaid] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    const [{ data: cons }, { data: consultantList }] = await Promise.all([
      // 취소된 건: deleted_at이 찍혔거나 status=cancelled인 것 모두
      supabase.from('consultations').select('*')
        .or('deleted_at.not.is.null,status.eq.cancelled')
        .order('created_at', { ascending: false }),
      supabase.from('consultants').select('id, name'),
    ])
    const rows = (cons as Cancelled[]) ?? []
    setList(rows)
    setConsultants((consultantList as Consultant[]) ?? [])

    //  ★취소된 건들의 지갑 내역을 «한 번에» 가져옵니다.
    //  ⚠️ 취소 건이 없으면 .in() 을 부르지 않습니다 — 빈 목록으로 부르면 오류가 납니다.
    const ids = rows.map(r => r.id)
    if (ids.length > 0) {
      const { data: led } = await supabase
        .from('mc_ledger').select('ref, kind, amount').in('ref', ids)
      const m: Record<string, { used: number; back: number }> = {}
      for (const r of (led ?? []) as { ref: string; kind: string; amount: number }[]) {
        if (!m[r.ref]) m[r.ref] = { used: 0, back: 0 }
        //  ⚠️ amount 는 쓴 줄이 «음수» 로 들어옵니다 — 크기만 씁니다.
        if (r.kind === 'use') m[r.ref].used += Math.abs(r.amount)
        if (r.kind === 'refund') m[r.ref].back += Math.abs(r.amount)
      }
      setMoney(m)
    } else {
      setMoney({})
    }
    setLoading(false)
  }

  function consultantName(id: string) {
    if (!id) return 'AI'
    return consultants.find(c => c.id === id)?.name ?? 'AI'
  }

  // 되살리기: 취소를 되돌림 → 다시 정상 예약 목록에 나타남
  // (주의: 그 시간 슬롯이 이미 다른 사람에게 예약됐을 수 있으므로, 슬롯 재잠금은 하지 않고 상담 건만 복원)
  async function handleRestore(c: Cancelled) {
    if (!confirm('이 예약을 되살릴까요?\n\n다시 정상 예약으로 돌아갑니다.\n(그 시간이 이미 다른 분께 예약됐을 수 있으니, 예약 시간은 확인해 주세요)')) return
    setBusyId(c.id)
    try {
      const { error } = await supabase.from('consultations')
        .update({ status: 'booked', deleted_at: null })
        .eq('id', c.id)
      if (error) { alert('되살리기 실패: ' + error.message); return }
      await fetchAll()
    } finally {
      setBusyId(null)
    }
  }

  // 영구삭제: DB에서 완전히 제거 (복구 불가). 연관 데이터도 함께 정리.
  async function handlePurge(c: Cancelled) {
    if (!confirm('정말 영구삭제할까요?\n\n되돌릴 수 없습니다. 이 상담과 관련된 모든 기록이 사라집니다.')) return
    if (!confirm('한 번 더 확인합니다. 정말 영구삭제합니다.')) return
    setBusyId(c.id)
    try {
      // 연관 테이블 먼저 삭제 (외래키 제약 해제)
      await supabase.from('payments').delete().eq('consultation_id', c.id)
      await supabase.from('chat_messages').delete().eq('consultation_id', c.id)
      await supabase.from('commentaries').delete().eq('consultation_id', c.id)
      await supabase.from('couples').delete().eq('consultation_id', c.id)
      await supabase.from('mulsang_images').delete().eq('consultation_id', c.id)
      await supabase.from('namings').delete().eq('consultation_id', c.id)
      await supabase.from('weddings').delete().eq('consultation_id', c.id)
      await supabase.from('births').delete().eq('consultation_id', c.id)
      await supabase.from('bookings').delete().eq('consultation_id', c.id)
      const { error } = await supabase.from('consultations').delete().eq('id', c.id)
      if (error) { alert('영구삭제 실패: ' + error.message); return }
      await fetchAll()
    } finally {
      setBusyId(null)
    }
  }

  function handleExcel() {
    const headers = ['취소일시', '원래예약일', '상담사', '종류', '전화번호', '금액']
    const rows = list.map(c => [
      fmtDateTime(c.deleted_at),
      fmtDate(c.booking_date),
      consultantName(c.consultant_id),
      getConsultTypeLabel(c),
      c.customer_phone,
      (c.paid_amount || 0).toLocaleString() + '원',
    ])
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `명연재_취소내역_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) return <div className="text-center py-10" style={{ color: '#FAC775' }}>불러오는 중...</div>

  const th = 'px-3 py-3 text-left text-xs font-bold whitespace-nowrap'

  //  ★아직 안 돌려준 것 — 「빠진 돈 > 되돌아간 돈」 인 건들
  const unpaidOf = (id: string) => {
    const m = money[id]
    if (!m) return 0
    return Math.max(0, m.used - m.back)
  }
  const unpaidList = list.filter(c => unpaidOf(c.id) > 0)
  const unpaidSum = unpaidList.reduce((a, c) => a + unpaidOf(c.id), 0)
  //  ⚠️ 거르개는 «보이는 것» 만 바꿉니다 — 위 요약은 언제나 «전체» 를 셉니다.
  const shown = onlyUnpaid && unpaidList.length > 0 ? unpaidList : list

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="text-sm font-bold text-white">
          취소 내역
          <span className="ml-2 text-xs" style={{ color: '#8a88a0' }}>총 {list.length}건</span>
        </div>
        <button onClick={handleExcel}
          className="px-4 py-2 rounded-xl text-xs font-bold"
          style={{ background: 'rgba(76,175,80,0.2)', color: '#81c784', border: '1px solid rgba(76,175,80,0.3)' }}>
          📊 엑셀 다운로드
        </button>
      </div>

      {/* ★2026-09-09 [대표님] — 「되돌려주지 않은 금액들만 따로 모아 볼 수 있으면」
          ⚠️ 한 건도 없으면 ★안 보입니다 — 없는 걱정을 만들지 않습니다.
          ⛔ 여기에 [돌려주기] 단추를 넣지 마십시오 (위 머리말을 보십시오). */}
      {unpaidSum > 0 && (
        <div className="px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div className="rounded-xl px-4 py-3"
            style={{ background: 'rgba(192,90,90,0.10)', border: '1px solid rgba(192,90,90,0.35)' }}>
            <div className="flex items-baseline justify-between gap-3 flex-wrap">
              <span className="text-sm font-bold" style={{ color: '#e08a8a' }}>아직 안 돌려준 돈</span>
              <span className="text-xl font-bold" style={{ color: '#e08a8a' }}>
                {unpaidSum.toLocaleString()}원
              </span>
            </div>
            <div className="text-xs mt-1" style={{ color: '#8a88a0' }}>
              {unpaidList.length}건 · 🪙 회원 지갑에서 손으로 넣어 주십시오
            </div>
            <div className="text-xs mt-1" style={{ color: '#6a6880' }}>
              회원이 마이페이지에서 취소하면 저절로 돌아갑니다. 여기 남는 것은 관리자가 취소한 건입니다.
            </div>
          </div>

          <div className="flex gap-2 mt-3">
            {([['안 돌려준 것만', true], ['전체', false]] as const).map(([label, v]) => (
              <button key={label} onClick={() => setOnlyUnpaid(v)}
                className="px-3 py-1.5 rounded-xl text-xs"
                style={{
                  background: onlyUnpaid === v ? 'rgba(250,199,117,0.16)' : 'transparent',
                  color: onlyUnpaid === v ? '#FAC775' : '#8a88a0',
                  border: '1px solid ' + (onlyUnpaid === v ? 'rgba(250,199,117,0.45)' : 'rgba(255,255,255,0.10)'),
                }}>{label}</button>
            ))}
          </div>
        </div>
      )}

      <div style={{ overflowX: 'auto', maxHeight: '60vh', overflowY: 'auto' }}>
        <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '800px' }}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr style={{ background: 'rgba(60,52,137,0.3)', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              {/* ★2026-09-09 — 「지갑」 칸을 더했습니다 [대표님 지시] */}
              {['취소일시', '원래 예약일', '상담사', '종류', '전화번호', '금액', '지갑', '되살리기', '영구삭제'].map(h => (
                <th key={h} className={th} style={{ color: '#FAC775' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.length === 0 && (
              <tr><td colSpan={9} className="text-center py-10 text-sm"
                style={{ color: 'rgba(255,255,255,0.3)' }}>취소된 예약이 없습니다</td></tr>
            )}
            {shown.map((c, i) => {
              const isBusy = busyId === c.id
              const typeLabel = getConsultTypeLabel(c)
              return (
                <tr key={c.id} style={{
                  background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent',
                  borderBottom: '1px solid rgba(255,255,255,0.04)'
                }}>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#e8e2f5' }}>{fmtDateTime(c.deleted_at)}</td>
                  <td className="px-3 py-3 text-xs whitespace-nowrap" style={{ color: '#8a88a0' }}>{fmtDate(c.booking_date)}</td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    <span className="text-xs px-2 py-1 rounded-full"
                      style={{ background: 'rgba(60,52,137,0.3)', color: '#b0aec8' }}>
                      {consultantName(c.consultant_id)}
                    </span>
                  </td>
                  <td className="px-3 py-3 whitespace-nowrap">
                    {typeLabel !== '-' ? (
                      <span className="text-xs px-2 py-1 rounded-full"
                        style={{ background: 'rgba(129,199,132,0.15)', color: '#81c784' }}>{typeLabel}</span>
                    ) : <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>-</span>}
                  </td>
                  <td className="px-3 py-3 text-sm text-white whitespace-nowrap">{c.customer_phone}</td>
                  <td className="px-3 py-3 text-sm font-bold whitespace-nowrap" style={{ color: '#FAC775' }}>
                    {(c.paid_amount || 0).toLocaleString()}원
                  </td>

                  {/* ★2026-09-09 [대표님] — 지갑에서 빠진 돈이 «돌아갔는지».
                      ⚠️ 지갑 내역이 «없는» 건은 관문이 꺼져 있던 때 잡은 예약입니다 —
                         애초에 돈이 안 빠졌으니 「—」 로 둡니다. ⛔ 빨갛게 칠하지 마십시오. */}
                  <td className="px-3 py-3 text-xs whitespace-nowrap">
                    {(() => {
                      const m = money[c.id]
                      if (!m || m.used === 0) {
                        return <span style={{ color: 'rgba(255,255,255,0.25)' }}>—</span>
                      }
                      const left = Math.max(0, m.used - m.back)
                      if (left === 0) {
                        return <span style={{ color: '#7ac77a' }}>돌아감</span>
                      }
                      return (
                        <span style={{ color: '#e08a8a', fontWeight: 700 }}>
                          안 돌아감 {left.toLocaleString()}원
                        </span>
                      )
                    })()}
                  </td>

                  <td className="px-3 py-3">
                    <button onClick={() => handleRestore(c)} disabled={isBusy}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(55,138,221,0.2)', color: '#64b5f6', opacity: isBusy ? 0.5 : 1 }}>
                      되살리기
                    </button>
                  </td>
                  <td className="px-3 py-3">
                    <button onClick={() => handlePurge(c)} disabled={isBusy}
                      className="px-3 py-1 rounded-lg text-xs font-bold"
                      style={{ background: 'rgba(255,100,100,0.15)', color: '#ff6464', opacity: isBusy ? 0.5 : 1 }}>
                      영구삭제
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
