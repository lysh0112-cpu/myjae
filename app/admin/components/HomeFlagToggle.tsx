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
import { EXAM_LUCK_NAME, fetchHomeFlags } from '@/lib/homeFlags'

/* ★2026-09-11 (6부) — onChange: 값을 «읽었을 때 · 바꿨을 때» 가격 관리 화면에 알립니다.
 *   가격 표의 합격운 줄이 이 값을 따라 보이고 숨습니다 (검사 ㉒-y). */
export default function HomeFlagToggle({ onChange }: { onChange?: (on: boolean) => void } = {}) {
  const [on, setOn] = useState<boolean | null>(null)   // null = 읽는 중
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  //  ⚠️ onChange 를 목록에 적습니다 — 가격 관리가 넘기는 것은 useState 의 set 함수라 «바뀌지 않아»
  //     처음 읽기가 다시 돌지 않습니다. ⛔ ref 로 붙잡는 방식은 새 eslint 규칙에서 «오류» 입니다 (기준선을 늘림).
  useEffect(() => {
    let alive = true
    fetchHomeFlags().then((f) => { if (alive) { setOn(f.examLuck); onChange?.(f.examLuck) } })
    return () => { alive = false }
  }, [onChange])

  async function flip() {
    if (on === null || busy) return
    const next = !on
    if (next && !window.confirm(
      `홈 화면에 「${EXAM_LUCK_NAME}」 카드를 보이게 할까요?\n\n` +
      '⚠️ 지금은 결제 시트가 없어, 로그인한 손님께 무료로 보입니다.',
    )) return
    setBusy(true)
    setMsg(null)
    const r = await callAdmin<{ ok: true; examLuck: boolean }>('/api/admin/home-flags', { examLuck: next })
    setBusy(false)
    if (!r.ok) { setMsg({ ok: false, text: '저장 실패: ' + r.message }); return }
    setOn(r.data.examLuck)
    onChange?.(r.data.examLuck)
    setMsg({
      ok: true,
      text: r.data.examLuck
        ? '✓ 홈에 보이게 했어요 (손님 화면은 새로고침하면 보여요)'
        : '✓ 홈에서 숨겼어요',
    })
  }

  const knobOn = on === true
  return (
    <div>
      <div className="text-sm font-bold mb-2" style={{ color: '#fff' }}>🎯 숨겨 둔 서비스</div>
      <div style={{ background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.15)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, color: '#e8e4ff' }}>{EXAM_LUCK_NAME}</div>
            <div style={{ fontSize: 11, color: '#8a88a0', marginTop: 3 }}>
              홈 카드 · 보관함 · 가격 표 줄
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <span style={{ fontSize: 12, color: knobOn ? '#FAC775' : '#8a88a0', minWidth: 42, textAlign: 'right' }}>
              {on === null ? '읽는 중' : knobOn ? '보임' : '숨김'}
            </span>
            <button
              onClick={flip}
              disabled={on === null || busy}
              aria-label={`${EXAM_LUCK_NAME} 홈 노출 ${knobOn ? '끄기' : '켜기'}`}
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
