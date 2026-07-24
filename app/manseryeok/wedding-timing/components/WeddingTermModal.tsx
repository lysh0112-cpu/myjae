'use client'
// app/manseryeok/wedding-timing/components/WeddingTermModal.tsx
//
// 결혼택일 용어 설명 모달.
// 겉모습은 공용 TermModal(result-new/TermModal.tsx) 규격을 그대로 따른다.
//   제목 옆 한자 병기 · 카테고리 배지 · 우상단 ✕ · "한마디로" 라벨 · 닫기는 '확인'
// 내용만 결혼택일 전용 사전(weddingHelpV7)에서 읽는다. 이유는 그 파일 주석 참고.

import { WEDDING_HELP } from '../lib/weddingHelpV7'

export default function WeddingTermModal({
  termKey, onClose,
}: { termKey: string | null; onClose: () => void }) {
  if (!termKey || !WEDDING_HELP[termKey]) return null
  const h = WEDDING_HELP[termKey]

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        maxWidth: 340, width: '100%', background: '#fff', borderRadius: 16,
        padding: '20px 18px', maxHeight: '86vh', overflowY: 'auto',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 19, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-.4px' }}>
            {h.t}{' '}
            <span style={{ fontSize: 13, color: '#6b5340', fontWeight: 400 }}>({h.hanja})</span>
          </span>
          <span style={{
            fontSize: 10, color: '#8f3d0e', background: '#fdf6ee',
            padding: '2px 8px', borderRadius: 8, flex: 'none',
          }}>{h.cat}</span>
          <button onClick={onClose} aria-label="닫기" style={{
            marginLeft: 'auto', background: 'none', border: 'none',
            fontSize: 16, color: '#ccc', cursor: 'pointer', lineHeight: 1,
          }}>✕</button>
        </div>

        <div style={{ background: '#f6f6f3', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#8f3d0e', fontWeight: 700, marginBottom: 5 }}>한마디로</div>
          <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, fontWeight: 600 }}>{h.one}</div>
        </div>

        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
          {h.body}
        </div>

        <div style={{
          marginTop: 14, paddingTop: 12, borderTop: '1px solid #eee',
          fontSize: 12.5, color: '#8a7a6d', lineHeight: 1.75,
        }}>
          <span style={{ color: '#8f3d0e', fontWeight: 700 }}>다만</span> — {h.note}
        </div>

        <div onClick={onClose} style={{
          marginTop: 16, background: '#1a1a1a', color: '#fff', textAlign: 'center',
          padding: 11, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>확인</div>
      </div>
    </div>
  )
}
