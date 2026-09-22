'use client'

// ══════════════════════════════════════════════════════════════════
//  HomeFlagToggle — ★2026-09-11 (6부) 신설
//  「합격운/취업운」 을 홈에 보일지 켜고 끕니다  [대표님 「넣을지 말지 결정하는 토글」]
//
//  ★누르면 «바로» 저장합니다 — 값이 하나뿐이라 따로 [저장] 단추를 두지 않았습니다.
//  ★결과 글은 토글 «바로 옆» 에 뜹니다.
//    ⚠️ 말투 관리는 결과가 화면 맨 위에 떠서 대표님이 «못 보셨습니다» (2026-09-11).
//  ⚠️ 켤 때만 한 번 여쭙니다 — 지금 합격운에는 결제 시트가 «없어» 로그인한 손님께 무료로 보입니다.
//  ⛔ 화면에서 app_settings 에 «곧장» 쓰지 마십시오 — 서버 길(/api/admin/home-flags)로 씁니다.
// ══════════════════════════════════════════════════════════════════
import { useEffect, useState } from 'react'
import { callAdmin } from './callAdmin'
import { EXAM_LUCK_NAME, HAERAK_NAME, fetchHomeFlags, type HomeFlagKey } from '@/lib/homeFlags'

/* ★2026-09-11 (6부) — onChange: 값을 «읽었을 때 · 바꿨을 때» 가격 관리 화면에 알립니다.
 *   가격 표의 합격운 줄이 이 값을 따라 보이고 숨습니다 (검사 ㉒-y). */
/*  ★2026-09-14 (8부) [대표님 「하락이수도 넣을지 말지 결정하는 토글」]
 *    ★낱말(flag)을 받게 넓혔습니다. 안 넘기면 «합격운» 입니다 — 옛 자리가 그대로 돕니다.
 *  ⛔ 카드마다 부품을 «복사» 하지 마십시오. 여기 한 곳입니다. */
const LABEL: Record<HomeFlagKey, string> = {
  examLuck: EXAM_LUCK_NAME,
  haerak: HAERAK_NAME,
  //  ★2026-09-21 (10부) — 홈 카드가 «아닙니다». 심사관이 들어오는 문입니다.
  reviewLogin: '심사용 이메일 로그인',
  //  ★2026-09-22 (10부) — 홈 맨 아래 «함께 쓰는 서비스» (큐보드·골프온)
  sisterLinks: '큐보드·골프온 바로가기',
}
/** 토글 밑에 붙는 «무엇을 켜고 끄는가» — ⛔ 낱말마다 «다릅니다» */
const SUB: Record<HomeFlagKey, string> = {
  examLuck: '홈 카드 · 보관함 · 가격 표 줄',
  haerak: '홈 카드 · 보관함 · 가격 표 줄',
  //  ★홈 카드가 «아닙니다» — 심사관이 들어오는 문입니다
  reviewLogin: '/login/review 화면을 열고 닫습니다',
  sisterLinks: '큐보드·골프온이 나오는 일곱 자리 (홈 줄 · 로그인 · 지갑 · 충전 · 약관)',
}

/** 켤 때 한 번 여쭙는 말 — ⛔ 비워 두면 안 묻습니다 */
const ASK: Record<HomeFlagKey, string> = {
  examLuck: '⚠️ 지금은 결제 시트가 없어, 로그인한 손님께 무료로 보입니다.',
  haerak: '⚠️ 아직 ★검증 중입니다. 화면이 준비되지 않았으면 손님이 눌러도 갈 데가 없습니다.',
  /*  🔴 켤 때 반드시 여쭙습니다 — ★열어 두면 «아무나» 이메일로 들어올 수 있습니다 */
  reviewLogin: '⚠️ PG 카드사 «심사관» 이 들어오는 문입니다.\n'
    + '⛔ 심사가 끝나면 ★반드시 «끄십시오». 열어 두면 이메일로 로그인할 수 있습니다.',
  /*  ⚠️ 켤 때 여쭙습니다 — ★심사 «중» 에 켜면 반려입니다 */
  sisterLinks: '⚠️ 누르면 ★cue.myjae.kr · golf.myjae.kr 로 «떠납니다».\n'
    + '⛔ PG 심사 «중» 에는 켜지 마십시오 — 심사 대상이 아닌 도메인을 보게 됩니다.\n'
    + '⇒ 심사가 «통과한 뒤» 에 켜십시오.',
}

export default function HomeFlagToggle(
  { flag = 'examLuck', showTitle = true, onChange }:
  { flag?: HomeFlagKey; showTitle?: boolean; onChange?: (on: boolean) => void } = {},
) {
  const NAME = LABEL[flag]
  const [on, setOn] = useState<boolean | null>(null)   // null = 읽는 중
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  //  ⚠️ onChange 를 목록에 적습니다 — 가격 관리가 넘기는 것은 useState 의 set 함수라 «바뀌지 않아»
  //     처음 읽기가 다시 돌지 않습니다. ⛔ ref 로 붙잡는 방식은 새 eslint 규칙에서 «오류» 입니다 (기준선을 늘림).
  useEffect(() => {
    let alive = true
    fetchHomeFlags().then((f) => { if (alive) { setOn(f[flag]); onChange?.(f[flag]) } })
    return () => { alive = false }
  }, [onChange, flag])

  async function flip() {
    if (on === null || busy) return
    const next = !on
    /*  ⚠️ ★묻는 말이 낱말마다 다릅니다 —
     *     reviewLogin 은 «홈 카드» 가 아니라 «문» 이라 「보이게 할까요」 가 안 맞습니다. */
    /*  ⚠️ ★낱말마다 묻는 말이 다릅니다 —
     *     reviewLogin 은 «문», sisterLinks 는 «줄», 나머지는 «카드» 입니다. */
    const ask = flag === 'reviewLogin'
      ? `★심사용 이메일 로그인 문을 «열까요»?\n\n`
      : flag === 'sisterLinks'
        ? `홈 맨 아래에 「함께 쓰는 서비스」 줄을 «보이게» 할까요?\n\n`
        : `홈 화면에 「${NAME}」 카드를 보이게 할까요?\n\n`
    if (next && !window.confirm(ask + ASK[flag])) return
    setBusy(true)
    setMsg(null)
    const r = await callAdmin<Record<string, boolean>>('/api/admin/home-flags', { [flag]: next })
    setBusy(false)
    if (!r.ok) { setMsg({ ok: false, text: '저장 실패: ' + r.message }); return }
    setOn(r.data[flag])
    onChange?.(r.data[flag])
    setMsg({
      ok: true,
      text: r.data[flag]
        ? '✓ 홈에 보이게 했어요 (손님 화면은 새로고침하면 보여요)'
        : '✓ 홈에서 숨겼어요',
    })
  }

  const knobOn = on === true
  return (
    <div>
      {/*  ⚠️ ★2026-09-14 (8부) — 토글이 «둘» 이 되며 제목이 두 번 떴습니다 (대표님 화면에서 확인).
        *     ⇒ 둘째부터는 showTitle={false} 로 제목을 숨깁니다. */}
      {showTitle ? (
        <div className="text-sm font-bold mb-2" style={{ color: '#fff' }}>🎯 숨겨 둔 서비스</div>
      ) : null}
      <div style={{ background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.15)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#e8e4ff' }}>{NAME}</div>
            {/*  🔴 ★2026-09-21 (10부) — 밑줄 설명이 «붙박이» 였습니다.
              *    ⚠️ 심사용 문에도 「홈 카드 · 보관함 · 가격 표 줄」 이 그대로 따라와
              *       ★엉뚱한 말이 되었습니다 (대표님 화면에서 확인).
              *    ⇒ 7부 0-3 «절반만 고치기» — 낱말만 바꾸고 «설명» 을 안 셌습니다.
              *  ⛔ 새 낱말을 더하시거든 ★여기 SUB 에도 한 줄 넣으십시오. */}
            <div style={{ fontSize: 11, color: '#8a88a0', marginTop: 3 }}>
              {SUB[flag]}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: knobOn ? '#FAC775' : '#8a88a0', minWidth: 42, textAlign: 'right' }}>
              {on === null ? '읽는 중'
                : flag === 'reviewLogin' ? (knobOn ? '열림' : '닫힘')
                : knobOn ? '보임' : '숨김'}
            </span>
            <button
              onClick={flip}
              disabled={on === null || busy}
              aria-label={`${NAME} 홈 노출 ${knobOn ? '끄기' : '켜기'}`}
              aria-pressed={knobOn}
              style={{
                position: 'relative', width: 36, height: 20, borderRadius: 10, border: 'none',
                background: knobOn ? '#FAC775' : 'rgba(255,255,255,0.2)',
                cursor: on === null || busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1,
              }}
            >
              <span style={{
                position: 'absolute', top: 2, [knobOn ? 'right' : 'left']: 2,
                width: 16, height: 16, borderRadius: '50%', background: '#fff',
              }} />
            </button>
          </div>
        </div>
        {/* ★결과 글 — 토글 «바로 밑» (말투 관리 교훈) */}
        <div aria-live="polite" style={{ minHeight: 18, marginTop: 8, fontSize: 12,
          color: busy ? '#8a88a0' : msg ? (msg.ok ? '#9fe0a8' : '#ff9b8a') : 'transparent' }}>
          {busy ? '저장 중…' : msg?.text ?? ''}
        </div>
      </div>
      <div className="text-xs mt-2" style={{ color: '#8a88a0' }}>
        💡 누르면 바로 저장돼요 · 처음 값은 «숨김» 이에요
      </div>
    </div>
  )
}
