'use client'
import { useEffect, useState, type CSSProperties } from 'react'
import { supabase } from '@/lib/supabase'
import WalletPrice from './WalletPrice'
import HomeFlagToggle from './HomeFlagToggle'

type Price = {
  id: string
  price_key: string
  label: string
  price: number
  active: boolean
  sort: number
}

type TarotPrice = Price & { free_count: number }

type HomePrice = {
  service_key: string
  label: string
  price: number
  show_price: boolean
  sort: number
}

/* ══════════════════════════════════════════════════════════════════
 *  ★2026-09-08 [대표님 지시 · 목업 승낙] — 상담과 AI 분석을 «한 표» 로
 *
 *  [왜]  「왼쪽은 상담사와 이어졌을 때 값, 오른쪽은 손님이 혼자 볼 때 값」
 *        ⇒ 같은 서비스의 두 값을 «같은 줄» 에서 보고 고치실 수 있어야 합니다.
 *
 *  ⚠️ ★1:1 이 아닙니다. 결혼·이사·이름은 화면이 «둘 이상» 이라 AI 줄도 여럿입니다.
 *     ⛔ 억지로 한 줄로 합치지 마십시오 — 화면 둘을 하나로 묶는 셈이라 값이 어긋납니다.
 *
 *  ⛔⛔ ★consult 의 price_key 를 바꾸지 마십시오 —
 *      SERVICE_SPECIALTIES · ConsultButton 등 열두 곳과 어긋납니다 (48부 4-1).
 *
 *  ⚠️ ★PAIRS 에 «없는» analysis 줄은 맨 아래 「그 밖」 에 나옵니다.
 *     ⇒ 줄이 «조용히 사라지지» 않게 하려고 그렇게 했습니다. 지우지 마십시오.
 * ══════════════════════════════════════════════════════════════════ */
/* ★2026-09-11 (6부) — onlyWhen: 'examLuck' 인 줄은 «숨겨 둔 서비스» 토글이 켜졌을 때만 보입니다 (검사 ㉒-y).
 *   ⚠️ 숨겨도 가격은 DB 에 «그대로» 남습니다 — 다시 켜면 그 값으로 돌아옵니다. */
const PAIRS: { consult: string; ai: { k: string; short: string }[]; onlyWhen?: 'examLuck' }[] = [
  { consult: 'mulsang',     ai: [{ k: 'mulsang_ai',     short: '그림 생성' }] },
  { consult: 'career',      ai: [{ k: 'career_ai',      short: '적성 분석' }] },
  //  ★2026-09-11 (6부) [대표님 · 목업 승낙] — 「진로적성 바로 아래」. 토글이 켜졌을 때만.
  //     DB 줄 — consult_prices 'examluck' · analysis_prices 'examluck_ai' · mc_price myc 두 줄
  /*  🔴 ★2026-09-13 (7부) [대표님 「취업운/합격운/승진운 ★각각 항목을 넣고」]
   *    [전] examluck_ai ★하나 — 셋이 같은 값을 썼습니다.
   *    [지금] ★셋으로 갈랐습니다. 값을 따로 매기실 수 있습니다.
   *    ⛔ examluck_ai 를 «지우지» 마십시오 — 옛 기록과 옛 값이 그 낱말로 남아 있습니다.
   *       셋 중 «자기 값이 없으면» examluck_ai 로 떨어집니다 (consultGate.aiPriceOf). */
  { consult: 'examluck',    ai: [{ k: 'examluck_ai',    short: '합격·취업·승진 (기본값)' },
                                 { k: 'examluck_pass',  short: '합격운' },
                                 { k: 'examluck_job',   short: '취업운' },
                                 { k: 'examluck_promo', short: '승진운' }], onlyWhen: 'examLuck' },
  { consult: 'couple',      ai: [{ k: 'couple_ai',      short: '궁합 분석' }] },
  { consult: 'saju',        ai: [{ k: 'saju_deep',      short: '심층분석' }] },
  { consult: 'wedding',     ai: [{ k: 'wedding_check',  short: '정한날 진단' },
                                 { k: 'wedding_pick',   short: '길일 택일' }] },
  { consult: 'birth',       ai: [{ k: 'birth_pick',     short: '시기 택일' }] },
  { consult: 'moving',      ai: [{ k: 'moving_pick',    short: '좋은날 찾기' },
                                 { k: 'moving_check',   short: '정한날 진단' }] },
  { consult: 'naming',      ai: [{ k: 'naming_read',    short: '이름 풀이' },
                                 { k: 'naming_hanja',   short: '한자 바꾸기' },
                                 { k: 'naming_ai',      short: '개명 분석' }] },
  { consult: 'naming_baby', ai: [{ k: 'naming_baby_ai', short: '작명 분석' }] },
  { consult: 'tarot',       ai: [{ k: 'tarot_ai',       short: '카드 리딩' }] },
]

/* ══════════════════════════════════════════════════════════════════
 *  값 칸 + 노출 토글  (상담 쪽·AI 쪽이 «똑같이» 생기도록 한 곳에서 그립니다)
 *
 *  ⛔⛔ ★이 부품을 MergedPriceTable «안» 으로 옮기지 마십시오 —
 *      React 가 글자 한 자마다 «새 부품» 으로 보고 다시 그려서
 *      ★커서가 빠져나갑니다. 숫자를 한 자밖에 못 칩니다 (2026-09-08 겪음).
 *
 *  ⚠️ ★치는 «동안» 은 쉼표를 찍지 않습니다 (draft).
 *     ⛔ value 를 늘 toLocaleString() 으로 되돌리지 마십시오 —
 *        쉼표가 끼면서 ★커서가 맨 뒤로 튀고, 칸을 «비울» 수도 없습니다.
 *     ⇒ 칸에서 손을 떼면(onBlur) 그때 쉼표를 찍습니다.
 * ══════════════════════════════════════════════════════════════════ */
function PriceCell({ r, short, onPrice, onToggle }: {
  r: Price | undefined
  short?: string
  onPrice: (id: string, raw: string) => void
  onToggle: (id: string) => void
}) {
  const [draft, setDraft] = useState<string | null>(null)

  if (!r) return <span style={{ fontSize: 11, color: '#8a88a0' }}>—</span>

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: r.active ? 1 : 0.45 }}>
      {short !== undefined && (
        <span style={{ width: 74, flex: 'none', fontSize: 10, color: '#8a88a0' }}>{short}</span>
      )}
      <input type="text" inputMode="numeric"
        value={draft ?? r.price.toLocaleString()}
        onFocus={ev => { setDraft(String(r.price)); ev.target.select() }}
        onChange={ev => {
          const raw = ev.target.value.replace(/[^0-9]/g, '')
          setDraft(raw)
          onPrice(r.id, raw)
        }}
        onBlur={() => setDraft(null)}
        className="rounded-lg px-2 py-1 text-xs text-right outline-none"
        style={{ width: 78, background: 'rgba(255,255,255,0.08)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.1)' }} />
      <button onClick={() => onToggle(r.id)} aria-label={r.label + ' 노출'}
        style={{ width: 34, height: 18, borderRadius: 20, position: 'relative', flex: 'none',
          background: r.active ? '#FAC775' : 'rgba(255,255,255,0.2)' }}>
        <span style={{ position: 'absolute', top: 2, [r.active ? 'right' : 'left']: 2,
          width: 14, height: 14, borderRadius: '50%', background: '#fff' } as CSSProperties} />
      </button>
    </div>
  )
}

function MergedPriceTable({ showExamLuck = false }: { showExamLuck?: boolean }) {
  const [consult, setConsult] = useState<Price[]>([])
  const [ai, setAi] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const [c, a] = await Promise.all([
      supabase.from('consult_prices').select('*').order('sort'),
      supabase.from('analysis_prices').select('*').order('sort'),
    ])
    if (c.error) { alert('상담 가격 불러오기 실패: ' + c.error.message); return }
    if (a.error) { alert('AI 분석 가격 불러오기 실패: ' + a.error.message); return }
    setConsult((c.data ?? []) as Price[])
    setAi((a.data ?? []) as Price[])
    setLoading(false)
  }

  const edit = (
    set: (fn: (prev: Price[]) => Price[]) => void,
  ) => ({
    price: (id: string, raw: string) => {
      const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
      set(prev => prev.map(r => r.id === id ? { ...r, price: num } : r))
    },
    toggle: (id: string) => set(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r)),
  })
  const eC = edit(setConsult)
  const eA = edit(setAi)

  /* ★2026-09-08 [대표님 확정] — 저장하면 ★mc_price 에도 «함께» 씁니다.
   *
   *  [왜]  손님이 이용권을 충전해 두고, 서비스를 쓸 때마다 ★지갑에서 빠집니다.
   *        상담료도 «지갑에서» 뺍니다 [대표님 「일관성 있게」].
   *        ⇒ 그런데 wallet_use 는 ★mc_price 를 보고 뺍니다.
   *          ⛔ 인자에 «금액» 을 못 넣습니다 (남의 지갑·값 조작을 막으려고 그렇게 만든 것).
   *        ⇒ 그래서 여기서 정한 값이 ★mc_price 에 «가 있어야» 합니다.
   *
   *  ⛔⛔ ★이 부분을 «빼지» 마십시오 —
   *      빼면 대표님이 값을 고치셔도 ★지갑은 «옛 값» 으로 뺍니다.
   *      화면은 «멀쩡히» 뜨고 돈만 조용히 어긋납니다.
   *
   *  ⚠️ 낱말이 «겹치지 않습니다» —
   *      상담료  mulsang · saju · wedding …        (consult_prices 와 같은 낱말)
   *      AI분석  saju_deep · wedding_check …       (analysis_prices 와 같은 낱말)
   *      ⇒ tarot(4만) 과 tarot_ai(1천) 처럼 «다른 줄» 입니다.
   *
   *  ⚠️ mc_price 쓰기는 ★master 만 됩니다 (RLS). 관리자 화면이라 괜찮습니다.
   *  ⚠️ ★실패해도 «앞의 저장은 이미 끝났습니다». 그래서 알림만 띄우고 멈춥니다.
   */
  async function saveAll() {
    setSaving(true)
    for (const [table, rows] of [['consult_prices', consult], ['analysis_prices', ai]] as const) {
      for (const r of rows) {
        /* 🔴 ★2026-09-11 — 「바뀐 줄 세기」 [큐보드 회신 ⑥]
           ⚠️ Supabase 는 ★권한이 없어도 오류를 «안 냅니다». 0줄이어도 error 는 null 입니다. */
        const { data, error } = await supabase.from(table)
          .update({ price: r.price, active: r.active, updated_at: new Date().toISOString() })
          .eq('id', r.id)
          .select('id')
        if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
        if (!data || data.length === 0) {
          alert('저장되지 않았습니다 (' + r.label + ').\n로그인이 풀렸거나 권한이 없습니다.\n로그아웃 후 다시 로그인해 주세요.')
          setSaving(false); return
        }
      }
    }

    // ★지갑 요금표에도 같은 값을 씁니다 (줄은 이미 스물넷 다 있습니다)
    for (const r of [...consult, ...ai]) {
      /* 🔴 ★2026-09-11 — 여기도 «셉니다».
         ⚠️ 아래 알림이 「이대로 두면 지갑이 옛 값으로 뺍니다」라 경고하는데,
            ★0줄일 때는 그 경고가 «안 떴습니다». 그것이 더 위험합니다. */
      const { data, error } = await supabase.from('mc_price')
        .update({ price: r.price, label: r.label, up_at: new Date().toISOString() })
        .eq('service', 'myc').eq('item', r.price_key)
        .select('item')
      if (error || !data || data.length === 0) {
        alert('가격은 저장됐지만 ★지갑 요금표 반영에 실패했습니다 ('
          + r.label + '): ' + (error ? error.message : '바뀐 줄이 없습니다 — 로그인이 풀렸거나 권한이 없습니다')
          + '\n\n⚠️ 이대로 두면 지갑이 옛 값으로 뺍니다. 다시 저장해 주세요.')
        setSaving(false); load(); return
      }
    }

    setSaving(false)
    alert('가격이 저장되었습니다 (지갑 요금표에도 반영)')
    load()
  }

  if (loading) return <div className="text-sm" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  //  ⛔ 짝 목록은 «전체» PAIRS 로 봅니다 (거른 목록 아님) — 토글을 끈 동안
  //     합격운 AI 줄이 아래 「그 밖 · 짝이 없는 AI 줄」 로 새지 않게 (검사 ㉒-y).
  const pairedKeys = new Set(PAIRS.flatMap(p => p.ai.map(x => x.k)))
  const leftovers = ai.filter(r => !pairedKeys.has(r.price_key))

  /* ★2026-09-08 — 칸 폭을 «글자에 맞춰» 고정했습니다 [대표님 「가깝게 붙여줘」].
     ⛔ 1fr 로 되돌리지 마십시오 — 남는 자리를 반씩 나눠 가져
        상담 값과 AI 값이 ★화면 끝과 끝으로 벌어집니다. 눈이 건너뛰게 됩니다.
     ⚠️ 오른쪽 빈자리는 ★당구·골프 요금을 넣으실 자리로 비워 둡니다. */
  const row = { display: 'grid', gridTemplateColumns: '148px 150px 224px', gap: 14,
    alignItems: 'start', padding: '9px 12px',
    borderTop: '1px solid rgba(255,255,255,0.05)' } as CSSProperties

  return (
    <div style={{ width: 'fit-content', minWidth: 560 }}>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>

        <div style={{ ...row, borderTop: 'none', alignItems: 'center',
          background: 'rgba(60,52,137,0.3)', color: '#FAC775', fontSize: 12, fontWeight: 700 }}>
          <span>종류</span>
          <span>🔮 전문가 상담</span>
          <span>✨ AI 분석 (혼자 조회)</span>
        </div>

        {/* ★2026-09-11 (6부) — 토글이 꺼지면 합격운 줄을 «그리지 않습니다» (값은 그대로) */}
        {PAIRS.filter(p => !p.onlyWhen || showExamLuck).map(p => {
          const c = consult.find(r => r.price_key === p.consult)
          if (!c) return null
          return (
            <div key={p.consult} style={row}>
              <span style={{ fontSize: 12, color: '#fff', paddingTop: 5,
                opacity: c.active ? 1 : 0.45 }}>
                {c.label}{!c.active && <span style={{ fontSize: 10, color: '#8a88a0' }}> (숨김)</span>}
              </span>
              <div style={{ paddingTop: 1 }}>
                <PriceCell r={c} onPrice={eC.price} onToggle={eC.toggle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {p.ai.map(x => (
                  <PriceCell key={x.k} r={ai.find(r => r.price_key === x.k)}
                    onPrice={eA.price} onToggle={eA.toggle} short={x.short} />
                ))}
              </div>
            </div>
          )
        })}

        {leftovers.length > 0 && (
          <div style={row}>
            <span style={{ fontSize: 12, color: '#8a88a0', paddingTop: 5 }}>그 밖</span>
            <span style={{ fontSize: 11, color: '#8a88a0', paddingTop: 5 }}>짝이 없는 AI 줄</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {leftovers.map(r => (
                <PriceCell key={r.id} r={r}
                  onPrice={eA.price} onToggle={eA.toggle} short={r.label} />
              ))}
            </div>
          </div>
        )}
      </div>

      <button onClick={saveAll} disabled={saving}
        className="py-2 px-5 rounded-xl text-sm font-bold mt-3"
        style={{ background: '#FAC775', color: '#1a1a18' }}>
        {saving ? '저장중...' : '저장'}
      </button>
    </div>
  )
}

// 상담/분석 공용 표
// ⚠️ ★2026-09-08 부터 화면에서는 «안 씁니다» (MergedPriceTable 로 합쳤습니다).
//    ⛔ 지우지 마십시오 — 되돌리실 때 쓰고, 표 하나만 보고 싶을 때도 씁니다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function PriceTable({ title, table }: { title: string; table: 'consult_prices' | 'analysis_prices' }) {
  const [rows, setRows] = useState<Price[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from(table).select('*').order('sort')
    if (error) { alert('불러오기 실패: ' + error.message); return }
    setRows((data ?? []) as Price[])
    setLoading(false)
  }

  function setPrice(id: string, raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
    setRows(prev => prev.map(r => r.id === id ? { ...r, price: num } : r))
  }
  function toggle(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  async function saveAll() {
    setSaving(true)
    for (const r of rows) {
      const { error } = await supabase.from(table)
        .update({ price: r.price, active: r.active, updated_at: new Date().toISOString() })
        .eq('id', r.id)
      if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    alert(title + ' 저장되었습니다')
    load()
  }

  if (loading) return <div className="text-sm" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div style={{ flex: 1, minWidth: 300 }}>
      <div className="text-sm font-bold mb-2" style={{ color: '#FAC775' }}>{title}</div>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center px-3 py-2 text-xs font-bold"
          style={{ background: 'rgba(60,52,137,0.3)', color: '#FAC775',
            borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ flex: 1 }}>종류</span>
          <span style={{ width: 100, textAlign: 'right' }}>가격</span>
          <span style={{ width: 44, textAlign: 'center' }}>노출</span>
        </div>

        {rows.map(r => (
          <div key={r.id} className="flex items-center px-3 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', opacity: r.active ? 1 : 0.45 }}>
            <span style={{ flex: 1, fontSize: 12, color: '#fff' }}>
              {r.label}{!r.active && <span style={{ fontSize: 10, color: '#8a88a0' }}> (숨김)</span>}
            </span>
            <div style={{ width: 100, textAlign: 'right' }}>
              <input type="text" inputMode="numeric" value={r.price.toLocaleString()}
                onChange={e => setPrice(r.id, e.target.value)}
                className="rounded-lg px-2 py-1 text-xs text-right outline-none"
                style={{ width: 88, background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ width: 44, display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => toggle(r.id)}
                style={{ width: 34, height: 18, borderRadius: 20, position: 'relative',
                  background: r.active ? '#FAC775' : 'rgba(255,255,255,0.2)' }}>
                <span style={{ position: 'absolute', top: 2, [r.active ? 'right' : 'left']: 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff' } as any} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={saveAll} disabled={saving}
        className="py-2 px-5 rounded-xl text-sm font-bold mt-3"
        style={{ background: '#FAC775', color: '#1a1a18' }}>
        {saving ? '저장중...' : '저장'}
      </button>
    </div>
  )
}

// 타로 전용 표 (무료횟수 칸 포함)
// ⚠️ ★2026-09-08 부터 화면에서 «안 씁니다» — 값을 하나로 합쳤습니다 [대표님 지시].
//    ⛔ 지우지 마십시오. tarot_prices 의 무료횟수를 되살리실 때 이 함수를 씁니다.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function TarotTable() {
  const [rows, setRows] = useState<TarotPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from('tarot_prices').select('*').order('sort')
    if (error) { alert('불러오기 실패: ' + error.message); return }
    setRows((data ?? []) as TarotPrice[])
    setLoading(false)
  }

  function setPrice(id: string, raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
    setRows(prev => prev.map(r => r.id === id ? { ...r, price: num } : r))
  }
  function setFree(id: string, raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
    setRows(prev => prev.map(r => r.id === id ? { ...r, free_count: num } : r))
  }
  function toggle(id: string) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r))
  }

  async function saveAll() {
    setSaving(true)
    for (const r of rows) {
      const { error } = await supabase.from('tarot_prices')
        .update({ price: r.price, free_count: r.free_count, active: r.active, updated_at: new Date().toISOString() })
        .eq('id', r.id)
      if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    alert('타로 가격 저장되었습니다')
    load()
  }

  if (loading) return <div className="text-sm" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div>
      <div className="text-sm font-bold mb-2" style={{ color: '#FAC775' }}>🃏 타로 가격</div>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center px-3 py-2 text-xs font-bold"
          style={{ background: 'rgba(60,52,137,0.3)', color: '#FAC775',
            borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ flex: 1 }}>종류</span>
          <span style={{ width: 78, textAlign: 'right' }}>가격</span>
          <span style={{ width: 58, textAlign: 'center' }}>무료횟수</span>
          <span style={{ width: 40, textAlign: 'center' }}>노출</span>
        </div>

        {rows.map(r => (
          <div key={r.id} className="flex items-center px-3 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', opacity: r.active ? 1 : 0.45 }}>
            <span style={{ flex: 1, fontSize: 12, color: '#fff' }}>
              {r.label}{!r.active && <span style={{ fontSize: 10, color: '#8a88a0' }}> (숨김)</span>}
            </span>
            <div style={{ width: 78, textAlign: 'right' }}>
              <input type="text" inputMode="numeric" value={r.price.toLocaleString()}
                onChange={e => setPrice(r.id, e.target.value)}
                className="rounded-lg px-2 py-1 text-xs text-right outline-none"
                style={{ width: 68, background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ width: 58, display: 'flex', justifyContent: 'center' }}>
              <input type="text" inputMode="numeric" value={String(r.free_count)}
                onChange={e => setFree(r.id, e.target.value)}
                className="rounded-lg px-2 py-1 text-xs text-center outline-none"
                style={{ width: 40, background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ width: 40, display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => toggle(r.id)}
                style={{ width: 34, height: 18, borderRadius: 20, position: 'relative',
                  background: r.active ? '#FAC775' : 'rgba(255,255,255,0.2)' }}>
                <span style={{ position: 'absolute', top: 2, [r.active ? 'right' : 'left']: 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff' } as any} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs mt-2" style={{ color: '#8a88a0' }}>
        💡 무료횟수 = 결제 없이 볼 수 있는 횟수 (0이면 항상 유료)
      </div>

      <button onClick={saveAll} disabled={saving}
        className="py-2 px-5 rounded-xl text-sm font-bold mt-2"
        style={{ background: '#FAC775', color: '#1a1a18' }}>
        {saving ? '저장중...' : '저장'}
      </button>
    </div>
  )
}

// 홈화면 핵심서비스 가격표 (표시 토글 + 가격) — 타로 아래에 배치
function HomePriceTable() {
  const [rows, setRows] = useState<HomePrice[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    const { data, error } = await supabase.from('home_prices').select('*').order('sort')
    if (error) { alert('불러오기 실패: ' + error.message); return }
    setRows((data ?? []) as HomePrice[])
    setLoading(false)
  }

  function setPrice(key: string, raw: string) {
    const num = parseInt(raw.replace(/[^0-9]/g, '')) || 0
    setRows(prev => prev.map(r => r.service_key === key ? { ...r, price: num } : r))
  }
  function toggle(key: string) {
    setRows(prev => prev.map(r => r.service_key === key ? { ...r, show_price: !r.show_price } : r))
  }

  async function saveAll() {
    setSaving(true)
    for (const r of rows) {
      const { error } = await supabase.from('home_prices')
        .update({ price: r.price, show_price: r.show_price, updated_at: new Date().toISOString() })
        .eq('service_key', r.service_key)
      if (error) { alert('저장 실패(' + r.label + '): ' + error.message); setSaving(false); return }
    }
    setSaving(false)
    alert('홈화면 가격표 저장되었습니다')
    load()
  }

  if (loading) return <div className="text-sm mt-6" style={{ color: '#8a88a0' }}>불러오는 중...</div>

  return (
    <div style={{ marginTop: 20 }}>
      <div className="text-sm font-bold mb-2" style={{ color: '#FAC775' }}>🏠 홈화면 가격표</div>
      <div className="rounded-xl overflow-hidden"
        style={{ background: '#2C2C2A', border: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center px-3 py-2 text-xs font-bold"
          style={{ background: 'rgba(60,52,137,0.3)', color: '#FAC775',
            borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ flex: 1 }}>서비스</span>
          <span style={{ width: 100, textAlign: 'right' }}>가격</span>
          <span style={{ width: 44, textAlign: 'center' }}>표시</span>
        </div>

        {rows.map(r => (
          <div key={r.service_key} className="flex items-center px-3 py-2"
            style={{ borderTop: '1px solid rgba(255,255,255,0.05)', opacity: r.show_price ? 1 : 0.45 }}>
            <span style={{ flex: 1, fontSize: 12, color: '#fff' }}>
              {r.label}{!r.show_price && <span style={{ fontSize: 10, color: '#8a88a0' }}> (숨김)</span>}
            </span>
            <div style={{ width: 100, textAlign: 'right' }}>
              <input type="text" inputMode="numeric" value={r.price.toLocaleString()}
                onChange={e => setPrice(r.service_key, e.target.value)}
                className="rounded-lg px-2 py-1 text-xs text-right outline-none"
                style={{ width: 88, background: 'rgba(255,255,255,0.08)', color: '#fff',
                  border: '1px solid rgba(255,255,255,0.1)' }} />
            </div>
            <div style={{ width: 44, display: 'flex', justifyContent: 'center' }}>
              <button onClick={() => toggle(r.service_key)}
                style={{ width: 34, height: 18, borderRadius: 20, position: 'relative',
                  background: r.show_price ? '#FAC775' : 'rgba(255,255,255,0.2)' }}>
                <span style={{ position: 'absolute', top: 2, [r.show_price ? 'right' : 'left']: 2,
                  width: 14, height: 14, borderRadius: '50%', background: '#fff' } as any} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="text-xs mt-2" style={{ color: '#8a88a0' }}>
        💡 표시 켜짐 = 홈 카드에 &quot;○○원~&quot; 노출 · 꺼짐 = 가격 줄 숨김
      </div>

      <button onClick={saveAll} disabled={saving}
        className="py-2 px-5 rounded-xl text-sm font-bold mt-2"
        style={{ background: '#FAC775', color: '#1a1a18' }}>
        {saving ? '저장중...' : '저장'}
      </button>
    </div>
  )
}

// 이름 짓기 조회 횟수 (개명) — app_settings 테이블의 naming_try_limit 하나만 저장
function NamingTryLimitBox() {
  const [value, setValue] = useState<number>(3)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'naming_try_limit')
      .maybeSingle()
      .then(({ data }) => {
        if (data && typeof data.value === 'number') setValue(data.value)
        setLoading(false)
      })
  }, [])

  async function save() {
    const v = Math.max(1, Math.min(20, value || 1))
    setSaving(true)
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: v, updated_at: new Date().toISOString() })
        .eq('key', 'naming_try_limit')
      if (error) throw error
      setValue(v)
      alert('이름 짓기 조회 횟수가 ' + v + '회로 저장되었습니다.')
    } catch (e) {
      console.error(e)
      alert('저장에 실패했어요. 다시 시도해주세요.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div className="text-sm font-bold mb-2" style={{ color: '#fff' }}>🔢 이름 짓기 조회 횟수</div>
      <div style={{ background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.15)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 13, color: '#e8e4ff' }}>개명 이름 짓기</div>
            <div style={{ fontSize: 11, color: '#8a88a0', marginTop: 3 }}>한 번에 지어볼 수 있는 이름 개수</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <input type="number" min={1} max={20} value={loading ? '' : value}
              onChange={(e) => setValue(parseInt(e.target.value) || 1)}
              style={{ width: 60, textAlign: 'center', padding: 8, borderRadius: 8, background: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)', color: '#FAC775', fontSize: 14, fontWeight: 'bold' }} />
            <span style={{ fontSize: 13, color: '#8a88a0' }}>회</span>
          </div>
        </div>
      </div>
      <div className="text-xs mt-2" style={{ color: '#8a88a0' }}>
        💡 개명에서 &quot;다른 이름 또 지어보기&quot;로 만들 수 있는 총 횟수예요.
      </div>
      <button onClick={save} disabled={saving}
        className="mt-3 px-6 py-2 rounded-lg text-sm font-bold"
        style={{ background: '#FAC775', color: '#1a1a18', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? '저장 중…' : '저장'}
      </button>
    </div>
  )
}

export default function PriceManager() {
  /* ★2026-09-11 (6부) — 「숨겨 둔 서비스」 토글과 가격 표가 «한 값» 을 봅니다.
   *   토글을 누르면 새로고침 없이 표의 합격운 줄이 «바로» 생기고 사라집니다 (검사 ㉒-y). */
  const [examLuck, setExamLuck] = useState(false)
  return (
    <div style={{ maxWidth: 1200 }}>
      <div className="text-base font-bold mb-1" style={{ color: '#FAC775' }}>💰 가격 관리</div>
      <p className="text-xs mb-4" style={{ color: '#8a88a0', lineHeight: 1.5 }}>
        전문가 상담 · AI 분석 · 타로 가격입니다. 노출을 끄면 고객 화면에서 해당 버튼이 숨겨집니다.
      </p>

      {/* ★2026-09-08 [대표님 지시 · 목업 승낙] — 가격표를 «한 화면» 에 모았습니다.
            왼쪽  명카페 (consult_prices · analysis_prices) — 손님 화면이 ★«지금» 읽는 값
            오른쪽 큐보드·골프온 (mc_price) — ★지갑이 «나중에» 뺄 값 (아직 안 붙음)

          ⚠️ 성격이 «다릅니다». 그래서 ★가운데를 비우고 오른쪽에 안내를 두었습니다.
             안 그러면 「당구 200원도 지금 도는 값」으로 보입니다.
          ⛔ 저장 단추를 ★«하나로» 묶지 마십시오 — 표가 다릅니다.
             하나로 묶으면 한쪽이 실패했을 때 «어느 쪽이 저장됐는지» 모릅니다.
          ⚠️ 좁은 화면에서는 오른쪽 덩어리가 ★«아래로» 내려갑니다 (flexWrap). */}
      <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start',
        flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <MergedPriceTable showExamLuck={examLuck} />
        <div style={{ width: 300, minWidth: 260, flex: '0 1 auto' }}>
          <WalletPrice />
        </div>
      </div>

      {/* 이름 짓기 조회 횟수 — 2026-07 화면에서 숨김 (대표님 지시).
          함수(NamingTryLimitBox)는 그대로 두었으니 되살리려면 아래 한 줄만 풀면 된다.
          ※ 숨겨도 고객 화면은 그대로 동작한다.
            app_settings의 naming_try_limit 행이 남아 있고,
            어른 개명 3화면(newname·newhanja·newresult)이 그 값을 읽는다.
            행이 없어도 코드 기본값 3회로 떨어지므로 문제없다.
            값을 바꾸려면 Supabase에서 직접 수정할 것. */}
      {/* <NamingTryLimitBox /> */}

      {/* ⛔ ★2026-09-08 [대표님 지시] — 타로 표를 «내렸습니다».
          「장수와 횟수 구분 없애고 가격 칸 하나만」 ⇒ 위 표의 «타로 · 카드 리딩» 한 칸입니다.
          ⚠️ tarot_prices 표와 TarotTable 함수는 ★«지우지 않았습니다» —
             무료 횟수 값이 들어 있고, 되살리실 때 씁니다.
          ⇒ 되살리시려면 아래 주석 한 줄만 푸십시오.
          <TarotTable /> */}

      {/* ★2026-09-11 (6부) [대표님] — 숨겨 둔 「합격운/취업운」 을 켜고 끄는 토글.
            ⚠️ 홈 가격표 «바로 위» 에 둡니다 — 둘 다 «홈에 무엇이 보이나» 를 정하는 자리입니다.
            ⚠️ 이 토글은 «누르면 바로» 저장합니다 (아래 [저장] 과 따로입니다). */}
      <div style={{ marginTop: 28, maxWidth: 420 }}>
        <HomeFlagToggle onChange={setExamLuck} />
      </div>

      <div style={{ marginTop: 28, maxWidth: 420 }}>
        <HomePriceTable />
      </div>

      <div className="text-xs mt-4" style={{ color: '#8a88a0' }}>
        💡 켜짐 = 고객에게 버튼 보임 · 꺼짐 = 숨김 · 왼쪽·오른쪽을 한 번에 저장합니다
      </div>
    </div>
  )
}
