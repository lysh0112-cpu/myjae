'use client'

/**
 * MbtiAskDialog — MBTI 를 안 고르셨을 때 «한 번» 정중히 여쭙는 팝업.
 * ─────────────────────────────────────────────────────────────
 *  ★2026-08-03 신설 — 대표님 지시 (44부 35차)
 *    「MBTI 를 넣지 않으면 정중하게 조사를 해 보시라 권하고,
 *      그래도 무시하고 진행하면 ★「사주로 본 성향」 자체를 숨기자」
 *
 *  ══ 왜 «결과» 가 아니라 «입력» 화면인가 ══
 *    결과를 다 보신 뒤에 권하면 «이미 늦습니다» — 돌아가 다시 봐야 합니다.
 *    ★「진로적성 보기」를 누르는 그 자리에서 한 번 여쭙니다.
 *
 *  ⚠️ 31부터의 결정과 «이어집니다» —
 *     31차: 결과 화면에서는 조르지 «않습니다» (막다른 길이라)
 *     35차: 대신 ★입력 화면에서 «한 번» 여쭙습니다
 *     ⇒ 조르는 자리를 «뒤로 미룬» 것이 아니라 «앞으로 당긴» 것입니다.
 *
 *  ⚠️ 꼴은 44부 25차 ConfirmDeleteDialog 와 «같은 결» 입니다 —
 *     팝업이 서비스마다 달라 보이지 않도록 맞췄습니다.
 *
 *  ⚠️ 링크는 MbtiSelect 의 TEST_URL 과 «같은 곳» 을 씁니다. 두 벌로 적지 마십시오.
 */

import { useEffect } from 'react'

/** MBTI 무료 검사 — ★MbtiSelect.tsx 와 «같은 주소» 입니다. 고칠 때 둘 다 보십시오 */
export const MBTI_TEST_URL = 'https://www.16personalities.com/ko'

interface Props {
  open: boolean
  accent?: string
  /** 「MBTI 를 고르러 갈게요」 — 팝업만 닫고 콤보로 돌려보냅니다 */
  onPick: () => void
  /** 「이번엔 넣지 않고 볼게요」 — ★그대로 진행. 성향 대목이 빠집니다 */
  onSkip: () => void
}

export default function MbtiAskDialog({ open, accent = '#785aaa', onPick, onSkip }: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onPick() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onPick])

  if (!open) return null

  return (
    <div
      onClick={onPick}
      style={{
        position: 'fixed', inset: 0, zIndex: 60,
        background: 'rgba(40,28,22,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 320, background: '#FFFBF7',
          borderRadius: 16, padding: '22px 20px 16px', textAlign: 'center',
          boxShadow: '0 8px 30px rgba(90,50,30,0.2)',
        }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: '#3a2e28', marginBottom: 8 }}>
          MBTI 를 알고 계신가요?
        </div>
        <div style={{ fontSize: 13, color: '#96502e', lineHeight: 1.65, marginBottom: 16 }}>
          MBTI 를 넣으시면 <b style={{ fontWeight: 700 }}>타고난 결과 지금의 결</b>을 견주어
          「사주로 본 성향」을 보여 드려요.
          <br />
          모르시면 무료 검사를 먼저 해 보시길 권해 드립니다.
        </div>

        <a
          href={MBTI_TEST_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'block', padding: 12, borderRadius: 10,
            background: accent, color: '#fff',
            fontSize: 13.5, fontWeight: 500, textDecoration: 'none', marginBottom: 7,
          }}>무료 검사 하러 가기 ↗</a>

        <button
          onClick={onPick}
          style={{
            width: '100%', padding: 12, borderRadius: 10,
            background: '#f3e6db', border: 'none', color: '#96502e',
            fontSize: 13.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
          }}>MBTI 를 고르러 갈게요</button>

        {/* ⚠️ 「그래도 진행」 길을 «막지 않습니다» — 손님을 가두면 안 됩니다.
            다만 무엇이 빠지는지 미리 알려 드립니다. */}
        <button
          onClick={onSkip}
          style={{
            width: '100%', padding: 11, borderRadius: 10, marginTop: 4,
            background: 'none', border: 'none', color: '#94a3b8',
            fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit',
          }}>이번엔 넣지 않고 볼게요</button>
      </div>
    </div>
  )
}
