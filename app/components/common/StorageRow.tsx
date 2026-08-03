'use client'

/**
 * StorageRow — 보관함의 «한 줄» 공용 부품.
 * ─────────────────────────────────────────────────────────────
 *  ★2026-08-03 신설 — 대표님 지시 「모두 통일해줘」 (44부 26차)
 *
 * ══ 무엇을 맡는가 ══
 *   줄카드의 «테두리·바탕·여백» 과 오른쪽 ✕ 버튼만 맡습니다.
 *   ★줄 «안» 은 화면마다 정말 다릅니다 —
 *     내 이름 보관함은 왼쪽에 한자 22px, 궁합은 「이름 ♥ 이름」,
 *     타로는 관심사 배지…  ⇒ ★그 안은 children 으로 받아 «손대지 않습니다».
 *
 * ⚠️ ✕ 버튼은 카드 누르기(결과로 이동)와 겹치므로 stopPropagation 을
 *    ★이 부품이 «대신» 합니다. 화면에서 또 적지 마십시오.
 *
 * 쓰는 법:
 *   <StorageRow key={r.id} onClick={() => router.push(url)} onDelete={() => setConfirmDel(r)}>
 *     …줄 안…
 *   </StorageRow>
 */

import type { ReactNode } from 'react'
import { S } from './StorageShell'

interface Props {
  children: ReactNode
  onClick?: () => void
  /** 없으면 ✕ 를 그리지 않습니다 */
  onDelete?: () => void
}

export default function StorageRow({ children, onClick, onDelete }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: 15,
        background: S.card, border: `0.5px solid ${S.line}`, borderRadius: 14,
        marginBottom: 10, cursor: onClick ? 'pointer' : 'default',
      }}>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 13 }}>
        {children}
      </div>

      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          aria-label="삭제"
          style={{
            flexShrink: 0, width: 28, height: 28, borderRadius: 8,
            background: 'none', border: 'none', color: S.del, fontSize: 17,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}>
          ×
        </button>
      )}
    </div>
  )
}
