'use client'

/**
 * ConfirmDeleteDialog — 보관함에서 «지울까요?» 를 묻는 공용 팝업.
 * ─────────────────────────────────────────────────────────────
 *  ★2026-08-03 신설 — 대표님 지시 「삭제 메시지 형식을 통일할 것」 (44부 25차)
 *
 * ══ 왜 공용 부품인가 ══
 *   삭제 확인이 뜨는 자리가 열한 곳인데 팝업 코드가 «열한 벌 복사» 되어 있었고,
 *   그래서 말투가 네 갈래로 갈라져 있었습니다 —
 *
 *     ① 「정말 삭제할까요? / 취소·삭제」          8곳  ← ★정본으로 삼았습니다
 *     ② 「이 기록을 지울까요? / 그대로 둘게요·지울게요」 2곳 (진로적성·합격운)
 *     ③ 「삭제할까요?」 260px 흰 팝업              1곳 (인물 고르기)
 *     ④ 브라우저 기본 confirm() 창                6곳 (아직 그대로 — 8-2 참고)
 *
 *   ★①을 고른 까닭 — 여덟 곳이 이미 그 말투이고, ②는 두 곳이 «서로 베낀» 것입니다
 *     (exam-luck 머리말에 「진로적성 보관함을 그대로 본떴다」고 적혀 있습니다).
 *
 * ⚠️ 말투를 바꾸시려면 «이 파일 한 곳» 만 고치십시오. 열한 화면이 함께 바뀝니다.
 *    제목은 TITLE, 버튼 글자는 CANCEL_LABEL·CONFIRM_LABEL·BUSY_LABEL 입니다.
 * ⚠️⚠️ 화면마다 이 팝업을 «다시 짓지 마십시오». 그렇게 해서 넷으로 갈라졌습니다.
 *
 * 쓰는 법:
 *   <ConfirmDeleteDialog
 *     open={!!confirmDel}
 *     message={<>{confirmDel?.name1} ♥ {confirmDel?.name2} 궁합을 삭제해요.</>}
 *     busy={deleting}
 *     onCancel={() => setConfirmDel(null)}
 *     onConfirm={handleDelete}
 *   />
 *
 * ★message 는 «무엇을 지우는지» 한 줄만 씁니다.
 *   「삭제하면 되돌릴 수 없어요.」 는 이 부품이 «언제나» 붙입니다. 따로 적지 마십시오.
 */

import { useEffect } from 'react'
import type { ReactNode } from 'react'

/* ══ 말투 — ★고치려면 여기만 ══ */
const TITLE = '정말 삭제할까요?'
const WARN = '삭제하면 되돌릴 수 없어요.'
const CANCEL_LABEL = '취소'
const CONFIRM_LABEL = '삭제'
const BUSY_LABEL = '삭제 중…'

/* ══ 꼴 — 갈래 ①(여덟 곳)의 값 그대로 ══ */
const OVERLAY = 'rgba(40,28,22,0.35)'
const CARD_BG = '#FFFBF7'
const TITLE_C = '#3a2e28'
const BODY_C = '#96502e'
const CANCEL_BG = '#f3e6db'
const CONFIRM_BG = '#c8506e'
const CONFIRM_BUSY = '#d99'

interface Props {
  /** 열려 있는가 */
  open: boolean
  /**
   * 무엇을 지우는지 한 줄.
   * 없으면 「이 기록을 삭제해요.」 로 나갑니다.
   */
  message?: ReactNode
  /** 지우는 중 — 버튼이 잠기고 「삭제 중…」 이 됩니다 */
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
  /**
   * 다른 팝업 «안» 에서 열릴 때 true.
   *   ⚠️ 인물 고르기(PersonPickerModal)처럼 이미 떠 있는 모달 위에 겹칠 때는
   *      position:fixed 로 화면 전체를 덮으면 부모 모달의 둥근 모서리를 넘어갑니다.
   *      그때만 absolute 로 «부모 안» 을 덮습니다.
   */
  contained?: boolean
}

export default function ConfirmDeleteDialog({
  open, message, busy = false, onCancel, onConfirm, contained = false,
}: Props) {
  /* ★ESC 로도 닫힙니다 — 지우는 중에는 잠급니다 */
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !busy) onCancel()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div
      onClick={() => !busy && onCancel()}
      style={{
        position: contained ? 'absolute' : 'fixed', inset: 0, zIndex: 50,
        background: OVERLAY, borderRadius: contained ? 20 : undefined,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}>
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 320, background: CARD_BG,
          borderRadius: 16, padding: '22px 20px 16px', textAlign: 'center',
          boxShadow: '0 8px 30px rgba(90,50,30,0.2)',
        }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: TITLE_C, marginBottom: 8 }}>
          {TITLE}
        </div>
        <div style={{ fontSize: 13, color: BODY_C, lineHeight: 1.5, marginBottom: 18 }}>
          {message ?? '이 기록을 삭제해요.'}<br />
          {WARN}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={onCancel}
            disabled={busy}
            style={{
              flex: 1, padding: 12, borderRadius: 10, fontSize: 13.5, fontWeight: 500,
              background: CANCEL_BG, border: 'none', color: BODY_C,
              cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
            }}>
            {CANCEL_LABEL}
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            style={{
              flex: 1, padding: 12, borderRadius: 10, fontSize: 13.5, fontWeight: 500,
              background: busy ? CONFIRM_BUSY : CONFIRM_BG, border: 'none', color: '#fff',
              cursor: busy ? 'default' : 'pointer', fontFamily: 'inherit',
            }}>
            {busy ? BUSY_LABEL : CONFIRM_LABEL}
          </button>
        </div>
      </div>
    </div>
  )
}
