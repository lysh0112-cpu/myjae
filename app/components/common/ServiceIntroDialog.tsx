'use client'

/**
 * ServiceIntroDialog — 서비스를 «들어가기 전에» 한 번 일러 드리는 공용 팝업.
 * ─────────────────────────────────────────────────────────────
 *  ★2026-09-14 (9부) 신설 — 대표님 지시
 *     「하락이수를 누르면 모달로 설명문을 넣어주자」
 *
 *  [왜 공용으로 두었나]
 *    ⛔ 화면마다 팝업을 «다시 짓는» 일이 이 저장소에서 이미 있었습니다 —
 *       삭제 확인 팝업이 ★열한 벌 복사되어 말투가 네 갈래로 갈렸습니다
 *       (ConfirmDeleteDialog 머리말 참고).
 *    ⇒ 소개 팝업은 ★처음부터 «한 벌» 로 둡니다.
 *      나중에 다른 서비스에도 붙이실 때 이 부품을 그대로 쓰십시오.
 *
 *  ⚠️ ★글은 여기 적지 «않습니다». 부르는 쪽이 넘겨 줍니다.
 *     하락이수 글은 lib/saju/haerak/intro.ts 에 있습니다.
 *
 *  ⛔ 꼴(색·덮개)은 ★ConfirmDeleteDialog 와 «같은 값» 입니다.
 *     팝업이 둘인데 생김새가 다르면 손님이 다른 앱처럼 느끼십니다.
 */

import { useEffect } from 'react'
import type { ReactNode } from 'react'

/* ══ 꼴 — ⛔ ConfirmDeleteDialog 와 같은 값을 씁니다 ══ */
const OVERLAY = 'rgba(40,28,22,0.35)'
const CARD_BG = '#FFFBF7'
const TITLE_C = '#3a2e28'
const BODY_C = '#5c4a40'
const HEAD_C = '#3f6fa8'
const LINE = '#f0e0d5'
const CLOSE_BG = '#f3e6db'

interface Props {
  open: boolean
  /** 팝업 제목 */
  title: string
  /** 머리 문단 */
  lead: string
  /** 가운데 갈래들 — 없으면 안 그립니다 */
  points?: { head: string; body: string }[]
  /** 맺음 문단 — 없으면 안 그립니다 */
  tail?: string
  /** 들어가는 단추 글자 */
  ctaLabel: string
  /** 들어가는 단추를 누르면 */
  onStart: () => void
  /** 닫으면 */
  onClose: () => void
  /** 제목 아래에 덧붙일 것이 있으면 */
  children?: ReactNode
}

export default function ServiceIntroDialog({
  open, title, lead, points, tail, ctaLabel, onStart, onClose, children,
}: Props) {
  /*  ⚠️ 팝업이 떠 있는 동안 ★뒤 화면이 안 밀리게 막습니다.
   *     ⛔ 이 되돌리기(cleanup)를 빼지 마십시오 — 닫은 뒤에도 못 움직이게 됩니다. */
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  //  ★Esc 로도 닫힙니다
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
      /*  🔴 ★2026-09-14 (9부) [대표님 「모달 안이 위아래로 스크롤되어야
       *     하단에서 닫을 수 있을 것 같아」]
       *
       *  [무엇이 문제였나]  글이 길어 팝업이 화면보다 커지면
       *     ★아래 「닫기」 가 «화면 밖» 으로 나가 손님이 못 닫으셨습니다.
       *     홈 아래 띠(HomeBottomNav)에도 가렸습니다.
       *
       *  [어떻게 고쳤나]  ⛔ 가운데 정렬을 «버렸습니다» —
       *     ★덮개 자체가 위아래로 굴러갑니다 (overflowY: auto).
       *     ⇒ 팝업이 아무리 길어도 ★끝까지 내려가 닫을 수 있습니다.
       *  ⚠️ ★alignItems: 'center' 로 되돌리지 마십시오 — 긴 글이 잘립니다.
       *  ⚠️ ★zIndex 는 아래 띠(HomeBottomNav)보다 높아야 합니다. */
      style={{
        position: 'fixed', inset: 0, zIndex: 4000, background: OVERLAY,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '24px 16px 40px',
        overflowY: 'auto', WebkitOverflowScrolling: 'touch',
      }}
    >
      {/*  ⚠️ 안쪽을 눌렀을 때는 ★안 닫히게 합니다 (글을 읽다 눌릴 수 있습니다) */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          //  ⛔ ★maxHeight 를 두지 «않습니다» — 덮개가 굴러가므로 팝업은 «다 펼칩니다».
          //     (vh 로 막으면 휴대폰 주소창 때문에 아래가 잘립니다)
          width: '100%', maxWidth: 380,
          background: CARD_BG, borderRadius: 18, padding: '20px 18px 18px',
          boxShadow: '0 12px 40px -8px rgba(0,0,0,0.25)',
          //  ★위아래로 굴려도 «끝» 이 손에 닿게 합니다
          marginTop: 'auto', marginBottom: 'auto',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: TITLE_C, lineHeight: 1.5, marginBottom: 12 }}>
          {title}
        </div>

        {children}

        <div style={{ fontSize: 12.5, color: BODY_C, lineHeight: 1.75 }}>{lead}</div>

        {points && points.length > 0 ? (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 11 }}>
            {points.map(p => (
              <div key={p.head} style={{
                background: '#fff', border: `1px solid ${LINE}`, borderRadius: 12, padding: '11px 12px',
              }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: HEAD_C, marginBottom: 4 }}>
                  {p.head}
                </div>
                <div style={{ fontSize: 12, color: BODY_C, lineHeight: 1.7 }}>{p.body}</div>
              </div>
            ))}
          </div>
        ) : null}

        {tail ? (
          <div style={{ marginTop: 13, fontSize: 12.5, color: BODY_C, lineHeight: 1.75 }}>{tail}</div>
        ) : null}

        <button
          type="button"
          onClick={onStart}
          style={{
            width: '100%', marginTop: 16, padding: 13, borderRadius: 12,
            background: HEAD_C, border: 'none', color: '#fff',
            fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >{ctaLabel}</button>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: '100%', marginTop: 8, padding: 11, borderRadius: 12,
            background: CLOSE_BG, border: 'none', color: TITLE_C,
            fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}
        >닫기</button>
      </div>
    </div>
  )
}
