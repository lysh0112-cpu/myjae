'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
/* ★2026-09-11 — 관리자 API 는 ★callAdmin 으로 부릅니다 (오래 켜 둔 화면의 401 을 막습니다) */
import { callAdmin } from './callAdmin'
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

//  ★2026-09-08 — 앱 딱지 색 [대표님 「골프온과 큐보드도 같이 나오도록」]
//    ⚠️ 내역은 «이미» 세 앱이 다 나옵니다 — 조회에 service 거르개가 «없습니다».
//       지금 명카페만 보이는 것은 큐보드·골프온이 아직 wallet_use 를 «안 부르기» 때문입니다
//       (카카오 뒤에 그쪽 창에서 붙입니다 · 2부 7장). ⛔ 여기에 거르개를 넣지 마십시오.
const SERVICE_TAG: Record<string, { bg: string; fg: string }> = {
  charge: { bg: 'rgba(250,199,117,0.16)', fg: '#FAC775' },   // 충전
  myc: { bg: 'rgba(176,141,255,0.16)', fg: '#b08dff' },      // 명카페
  bil: { bg: 'rgba(110,168,254,0.16)', fg: '#6ea8fe' },      // 큐보드
  glf: { bg: 'rgba(122,199,122,0.16)', fg: '#7ac77a' },      // 골프온
}

//  ★한국 시각으로 보입니다 — 2026-09-05 14:32
//  ⛔⛔ ★at.slice(5,10) 처럼 «글자를 잘라» 쓰지 마십시오 —
//     Supabase 는 시각을 ★세계표준시(UTC)로 돌려줍니다.
//     잘라 쓰면 ★아홉 시간 이른 시각이 나오고, 아침 기록은 ★날짜가 «하루» 어긋납니다.
//  ⚠️ ★시간대를 'Asia/Seoul' 로 «못박았습니다» — 보시는 분이 어디에 계시든
//     돈이 오간 시각은 «한국 시각» 이어야 손님 문의와 맞아떨어집니다.
//  ⚠️ ko-KR 은 「2026. 09. 05.」 모양으로 내놓습니다.
//     ⛔ 그 결과를 «글자로 잘라» 쓰지 마십시오 — 조각(parts)을 직접 맞춥니다.
function fmtAt(at: string): string {
  const d = new Date(at)
  if (isNaN(d.getTime())) return at.slice(0, 16).replace('T', ' ')
  const p: Record<string, string> = {}
  for (const x of new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(d)) p[x.type] = x.value
  //  ⚠️ hour12:false 가 자정을 '24' 로 내놓는 곳이 있어 '00' 으로 맞춥니다.
  const hh = p.hour === '24' ? '00' : p.hour
  return `${p.year}-${p.month}-${p.day} ${hh}:${p.minute}`
}

export default function WalletMember({
  userId,
  onBackToMember,
}: {
  //  ★2026-09-09 — 회원 관리에서 «이름» 을 눌러 넘어온 회원 [대표님 지시]
  userId?: string | null
  //  «회원 관리에서 왔을 때만» 들어옵니다. 없으면 돌아가기 단추도 안 뜹니다.
  onBackToMember?: () => void
} = {}) {
  const [q, setQ] = useState('')
  const [list, setList] = useState<Found[]>([])
  const [picked, setPicked] = useState<Found | null>(null)
  const [ledger, setLedger] = useState<Ledger[]>([])
  const [busy, setBusy] = useState(false)
  const [searched, setSearched] = useState(false)
  //  ★2026-09-08 — 마우스가 올라간 줄. «눌러지는» 것을 보이게 하려는 것뿐입니다.
  //    ⚠️ 이 저장소는 tailwind 의 hover: 유틸을 «한 곳도» 쓰지 않아 state 로 했습니다.
  const [hoverId, setHoverId] = useState<string | null>(null)

  // ══════════════════════════════════════════════════════════════════
  //  ★2026-09-09 — 넘어온 회원을 «스스로» 불러옵니다 [대표님 지시]
  //    「회원지갑화면의 해당고객이 자동으로 찾도록」
  //
  //  ⚠️⚠️ ★useEffect 를 «안» 씁니다 — 안에서 setState 를 부르면
  //     react-hooks 가 «오류» 로 잡아 기준선(82/135)이 깨집니다 (47부 1-7).
  //     ⇒ admin/page.tsx 가 해시를 읽는 방식 그대로 ★«그릴 때» 한 번만 견줍니다.
  //  ⛔ useEffect 로 바꾸지 마십시오.
  //
  //  ⚠️ takenId 는 «이미 받아 처리한» 회원입니다.
  //     이것이 없으면 다시 그릴 때마다 또 불러와 ★끝없이 돕니다.
  // ══════════════════════════════════════════════════════════════════
  //  ★회원 하나를 «id 로» 불러옵니다 (찾기 칸을 안 거칩니다).
  //  ⚠️ 잔액이 «없는» 분은 mc_wallet 에 줄이 아직 없습니다 → 0원으로 봅니다.
  //     ⛔ 오류로 다루지 마십시오. 충전을 «한 번도 안 받은» 분입니다.
  async function loadOne(id: string) {
    setBusy(true)
    setSearched(false)
    setList([])
    /* 🔴 ★2026-09-10 (밤) — 브라우저에서 «곧장» DB 를 부르던 것을 ★서버 길로 옮겼습니다.
       [겪은 일] 회원 목록에서 이름을 눌렀는데 ★「그 회원을 못 찾았습니다」만 떴습니다.
       [까닭]    RLS 정책이 ★profiles_select_own = (auth.uid() = id) 라
                 ★«본인 것만» 읽힙니다. 관리자라도 남의 줄은 «안 보입니다».
       [고침]    app/api/admin/wallet/member 가 ★서버에서 대신 읽어 줍니다.
       ⛔ 다시 supabase.from('profiles') 로 되돌리지 마십시오 — 또 막힙니다.
       ⚠️ 그 정책을 «푸는» 것으로 고치지 마십시오 — 손님이 남의 사주를 봅니다. */
    const r = await callAdmin<{ member: { id: string; nickname: string | null; hangul_name: string | null; balance: number } }>(
      '/api/admin/wallet/member', { what: 'one', userId: id })
    const p = r.ok ? r.data.member : undefined
    if (!r.ok || !p) {
      setBusy(false)
      alert(r.ok ? '그 회원을 못 찾았습니다.' : r.message)
      return
    }
    /* ⚠️ 잔액도 ★서버가 «함께» 줍니다 (mc_wallet 도 RLS 에 막힙니다).
       ⛔ 여기서 mc_wallet 을 따로 부르지 마십시오. */
    const found: Found = {
      id: p.id,
      nickname: p.nickname,
      hangul_name: p.hangul_name,
      balance: p.balance,
    }
    setQ(memberName(found))
    setBusy(false)
    await pick(found)
  }

  const [takenId, setTakenId] = useState<string | null>(null)
  if (userId && userId !== takenId) {
    setTakenId(userId)
    void loadOne(userId)
  }

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
    /* 🔴 ★2026-09-10 (밤) — 서버 길로 옮겼습니다 (RLS · 위 loadOne 주석 참고).
       ⚠️ 두 칸(닉네임·이름)을 «다» 훑는 규칙은 ★서버 쪽으로 옮겨 두었습니다.
       ⛔ 여기서 profiles·mc_wallet 을 곧장 부르지 마십시오 — 막힙니다. */
    const r = await callAdmin<{ list: Found[] }>(
      '/api/admin/wallet/member', { what: 'search', keyword: key })
    if (!r.ok) { alert(r.message); setBusy(false); return }
    setList(r.data.list ?? [])
    setPicked(null)
    setLedger([])
    setBusy(false)
  }

  async function pick(m: Found) {
    setPicked(m)
    /* 🔴 ★2026-09-10 (밤) — 서버 길로 (RLS · 위 loadOne 주석 참고). */
    const r = await callAdmin<{ ledger: Ledger[] }>(
      '/api/admin/wallet/member', { what: 'ledger', userId: m.id })
    if (!r.ok) { alert(r.message); return }
    setLedger(r.data.ledger ?? [])
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
            //  ★2026-09-08 [대표님] — 「누를 수 있는 줄」 인 것이 안 보였습니다.
            //    ⇒ 손가락 커서 · 오른쪽 › · 마우스 올리면 밝아지게 했습니다.
            //    ⛔ › 를 빼지 마십시오 — 이것이 없으면 그냥 «글자 두 줄» 로 보입니다.
            <button key={m.id} onClick={() => pick(m)}
              onMouseEnter={() => setHoverId(m.id)}
              onMouseLeave={() => setHoverId(null)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left cursor-pointer"
              style={{
                color: '#e8e6f0',
                background: hoverId === m.id ? 'rgba(255,255,255,0.06)' : 'transparent',
              }}>
              <span className="text-sm">
                {memberName(m)}
                <span className="text-xs ml-2" style={{ color: '#8a88a0' }}>{m.hangul_name ?? ''}</span>
              </span>
              <span className="flex items-center gap-2">
                <span className="text-sm font-bold" style={{ color: '#FAC775' }}>
                  {m.balance.toLocaleString()}원
                </span>
                <span className="text-sm" style={{ color: '#6a6880' }}>›</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {picked && (
        <>
          {/* ★2026-09-09 — 「← 목록으로」는 «찾기 결과» 로 갑니다.
              회원 관리에서 넘어오신 경우엔 찾기 결과가 «없어서» 빈 화면이 됩니다.
              ⇒ 그때는 ★「← 회원 관리로」 를 대신 보입니다. ⛔ 둘을 합치지 마십시오. */}
          {onBackToMember ? (
            <button onClick={onBackToMember}
              className="text-xs mb-3" style={{ color: '#8a88a0' }}>
              ← 회원 관리로
            </button>
          ) : (
            <button onClick={() => { setPicked(null); setLedger([]) }}
              className="text-xs mb-3" style={{ color: '#8a88a0' }}>
              ← 목록으로
            </button>
          )}

          <div className="rounded-2xl p-5 mb-4 flex items-center justify-between flex-wrap gap-3" style={box}>
            <div>
              <div className="text-sm" style={{ color: '#8a88a0' }}>
                {memberName(picked)}{picked.hangul_name ? ' · ' + picked.hangul_name : ''}
              </div>
              <div className="text-2xl font-bold mt-1" style={{ color: '#FAC775' }}>
                {picked.balance.toLocaleString()}원
              </div>
              {/* ★2026-09-08 [대표님] — 「골프온과 큐보드도 같이 나오도록」
                  ⇒ mc_wallet 은 회원당 «줄 하나» 라 잔액이 «셋 공용» 입니다.
                  ⛔ 이 줄을 빼지 마십시오 — 없으면 「명카페 잔액」 으로 오해합니다. */}
              <div className="text-xs mt-1" style={{ color: '#6a6880' }}>
                명카페 · 큐보드 · 골프온 공용 잔액입니다
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
            <div className="text-sm" style={{ color: '#8a88a0' }}>
              아직 내역이 없습니다.
              {/* ⚠️ 큐보드·골프온이 «안 보이는» 것은 고장이 아닙니다 —
                  아직 wallet_use 를 안 부릅니다 (카카오 뒤 · 2부 7장). */}
              <div className="text-xs mt-1" style={{ color: '#6a6880' }}>
                큐보드·골프온은 카카오 로그인이 붙으면 여기에 함께 나옵니다
              </div>
            </div>
          ) : (
            <div className="rounded-2xl p-2" style={box}>
              {ledger.map(l => (
                <div key={l.id} className="flex items-center px-3 py-2 text-sm"
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  {/* ★2026-09-08 [대표님 「몇시에 썼는지도 확인하게」] — 한국 시각까지.
                      ⛔ at.slice() 로 되돌리지 마십시오 — UTC 라 아홉 시간 어긋납니다 (fmtAt). */}
                  <span style={{ width: 118, color: '#6a6880' }} className="text-xs">
                    {fmtAt(l.at)}
                  </span>
                  {(() => {
                    const key = l.kind === 'charge' ? 'charge' : l.service
                    const tag = SERVICE_TAG[key] ?? { bg: 'rgba(255,255,255,0.06)', fg: '#8a88a0' }
                    const label = l.kind === 'charge' ? '충전' : SERVICE_NAME[l.service] ?? l.service
                    return (
                      <span className="text-xs rounded-md px-2 py-0.5 mr-2"
                        style={{ background: tag.bg, color: tag.fg, minWidth: 52, textAlign: 'center' }}>
                        {label}
                      </span>
                    )
                  })()}
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
