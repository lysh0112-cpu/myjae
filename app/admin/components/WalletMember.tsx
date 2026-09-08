'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { memberName } from '@/lib/memberName'

//  ★회원 지갑 — 2026-09-05 신설 (HANDOVER-WALLET.md 4장)
//
//  ⚠️ 충전은 ★wallet_charge 함수가 합니다. 화면에서 mc_wallet 을 «직접 고치지» 마십시오.
//     ⛔ 표에 쓰기 정책이 «아예 없습니다». 직접 고치려 하면 조용히 0줄이 바뀝니다.
//  ⚠️ 함수가 안에서 role='master' 를 확인합니다. 화면 권한과 «두 겹» 입니다.

type Found = {
  id: string
  nickname: string | null
  hangul_name: string | null
  balance: number
}

type Ledger = {
  id: number
  service: string
  kind: string
  item: string
  amount: number
  after: number
  memo: string | null
  at: string
}

const SERVICE_NAME: Record<string, string> = {
  bil: '큐보드', glf: '골프온', myc: '명카페',
}

export default function WalletMember() {
  const [q, setQ] = useState('')
  const [list, setList] = useState<Found[]>([])
  const [picked, setPicked] = useState<Found | null>(null)
  const [ledger, setLedger] = useState<Ledger[]>([])
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)

  async function search() {
    const key = q.trim()
    if (!key) return
    setBusy(true)
    setSearched(true)

    //  ★닉네임 · 이름으로 찾습니다.
    //  ★2026-09-08 — 보일 이름은 memberName() 이 고릅니다 (닉네임이 «맨 앞»).
    //    ⛔ 찾을 때는 두 칸을 «다» 훑어야 합니다 —
    //       화면엔 닉네임이 떠도 대표님은 통장에 찍힌 «이름» 으로 치실 수 있습니다.
    //  ⚠️ 카카오 로그인이 붙으면 «회원번호 뒷자리» 도 여기서 찾게 됩니다 (아직 없음).
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, hangul_name')
      .or(`hangul_name.ilike.%${key}%,nickname.ilike.%${key}%`)
      .limit(20)
    if (error) { alert('찾기 실패: ' + error.message); setBusy(false); return }

    const ids = (data ?? []).map(r => r.id)
    const { data: wallets } = await supabase
      .from('mc_wallet').select('user_id, balance').in('user_id', ids)

    const bal = new Map((wallets ?? []).map(w => [w.user_id, w.balance]))
    setList((data ?? []).map(r => ({
      id: r.id,
      nickname: r.nickname,
      hangul_name: r.hangul_name,
      balance: bal.get(r.id) ?? 0,
    })))
    setPicked(null)
    setLedger([])
    setBusy(false)
  }

  async function pick(m: Found) {
    setPicked(m)
    const { data, error } = await supabase
      .from('mc_ledger')
      .select('id, service, kind, item, amount, after, memo, at')
      .eq('user_id', m.id)
      .order('at', { ascending: false })
      .limit(50)
    if (error) { alert('내역 불러오기 실패: ' + error.message); return }
    setLedger((data ?? []) as Ledger[])
  }

  async function charge(amount: number) {
    if (!picked) return
    const memo = window.prompt(
      `${memberName(picked)} 님에게 ${amount.toLocaleString()}원을 올립니다.\n메모(입금자명 등)를 적어 주십시오.`,
      '계좌이체')
    if (memo === null) return

    setBusy(true)
    const { data, error } = await supabase.rpc('wallet_charge', {
      p_user_id: picked.id, p_amount: amount, p_service: 'myc', p_memo: memo,
    })
    setBusy(false)

    if (error) { alert('충전 실패: ' + error.message); return }
    const r = data as { ok: boolean; reason?: string; balance?: number }
    if (!r?.ok) { alert('충전 실패: ' + (r?.reason ?? '알 수 없음')); return }

    const next = { ...picked, balance: r.balance ?? picked.balance }
    setPicked(next)
    setList(prev => prev.map(m => m.id === next.id ? next : m))
    pick(next)
  }

  function askDirect() {
    const raw = window.prompt('얼마를 올릴까요? (빼시려면 앞에 - 를 붙이십시오)', '10000')
    if (raw === null) return
    const num = parseInt(raw.replace(/[^0-9-]/g, ''))
    if (!num) { alert('숫자를 넣어 주십시오'); return }
    charge(num)
  }

  const box = { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }

  return (
    <div>
      <div className="flex gap-2 mb-2">
        <input value={q} onChange={e => setQ(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') search() }}
          placeholder="이름 · 닉네임"
          className="flex-1 rounded-xl px-4 text-sm"
          style={{ height: 38, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#e8e6f0' }} />
        <button onClick={search} disabled={busy}
          className="px-5 rounded-xl text-sm font-bold"
          style={{ background: 'rgba(250,199,117,0.25)', color: '#FAC775', border: '1px solid rgba(250,199,117,0.4)' }}>
          찾기
        </button>
      </div>
      <div className="text-xs mb-5" style={{ color: '#6a6880' }}>
        카카오 로그인이 붙으면 회원번호 뒷자리로도 찾게 됩니다
      </div>

      {searched && list.length === 0 && !busy && (
        <div className="text-sm" style={{ color: '#8a88a0' }}>찾으신 분이 없습니다.</div>
      )}

      {list.length > 0 && !picked && (
        <div className="rounded-2xl p-2" style={box}>
          {list.map(m => (
            <button key={m.id} onClick={() => pick(m)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left"
              style={{ color: '#e8e6f0' }}>
              <span className="text-sm">
                {memberName(m)}
                <span className="text-xs ml-2" style={{ color: '#8a88a0' }}>{m.hangul_name ?? ''}</span>
              </span>
              <span className="text-sm font-bold" style={{ color: '#FAC775' }}>
                {m.balance.toLocaleString()}원
              </span>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <>
          <button onClick={() => { setPicked(null); setLedger([]) }}
            className="text-xs mb-3" style={{ color: '#8a88a0' }}>
            ← 목록으로
          </button>

          <div className="rounded-2xl p-5 mb-4 flex items-center justify-between flex-wrap gap-3" style={box}>
            <div>
              <div className="text-sm" style={{ color: '#8a88a0' }}>
                {memberName(picked)}{picked.hangul_name ? ' · ' + picked.hangul_name : ''}
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: '#FAC775' }}>
                {picked.balance.toLocaleString()}원
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {[5000, 10000, 20000].map(v => (
                <button key={v} onClick={() => charge(v)} disabled={busy}
                  className="px-3 py-2 rounded-xl text-sm font-bold"
                  style={{ background: 'rgba(255,255,255,0.05)', color: '#e8e6f0', border: '1px solid rgba(255,255,255,0.12)' }}>
                  ＋{(v / 10000 >= 1 ? v / 10000 + '만' : v / 1000 + '천')}
                </button>
              ))}
              <button onClick={askDirect} disabled={busy}
                className="px-3 py-2 rounded-xl text-sm font-bold"
                style={{ background: 'rgba(255,255,255,0.05)', color: '#e8e6f0', border: '1px solid rgba(255,255,255,0.12)' }}>
                직접
              </button>
            </div>
          </div>

          <div className="text-sm font-bold mb-2" style={{ color: '#e8e6f0' }}>내역</div>
          {ledger.length === 0 ? (
            <div className="text-sm" style={{ color: '#8a88a0' }}>아직 내역이 없습니다.</div>
          ) : (
            <div className="rounded-2xl p-2" style={box}>
              {ledger.map(l => (
                <div key={l.id} className="flex items-center px-3 py-2 text-sm"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <span style={{ width: 56, color: '#6a6880' }} className="text-xs">
                    {l.at.slice(5, 10)}
                  </span>
                  <span style={{ width: 64, color: '#8a88a0' }} className="text-xs">
                    {l.kind === 'charge' ? '충전' : SERVICE_NAME[l.service] ?? l.service}
                  </span>
                  <span className="flex-1" style={{ color: '#e8e6f0' }}>
                    {l.memo || l.item}
                  </span>
                  <span style={{ width: 84, textAlign: 'right', color: l.amount >= 0 ? '#7ac77a' : '#ff8080' }}>
                    {l.amount >= 0 ? '+' : ''}{l.amount.toLocaleString()}
                  </span>
                  <span style={{ width: 88, textAlign: 'right', color: '#6a6880' }} className="text-xs">
                    {l.after.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
