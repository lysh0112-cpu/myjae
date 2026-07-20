'use client'

import React from 'react'
import { SAJU_TERMS } from './sajuTerms'

/**
 * 용어 설명 모달 (명카페 공용 부품)
 *
 * 대운·사주원국·세운·월운 등 어디서든 같은 모양·같은 설명으로 통일해서 씁니다.
 *
 *   import TermModal from '@/app/manseryeok/result-new/TermModal'
 *   const [term, setTerm] = useState<string|null>(null)
 *   ...
 *   <span onClick={()=>setTerm('비견')}>비견</span>
 *   <TermModal term={term} onClose={()=>setTerm(null)} />
 *
 * term: 용어 이름(예: '비견'). SAJU_TERMS에 있으면 모달이 뜸. null이면 안 뜸.
 */

export default function TermModal({ term, onClose }: { term: string | null; onClose: () => void }) {
  if (!term || !SAJU_TERMS[term]) return null
  const t = SAJU_TERMS[term]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, zIndex: 1000,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 320, width: '100%', background: '#fff', borderRadius: 16, padding: '20px 18px' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 20, fontWeight: 700, color: '#1a1a1a' }}>
            {term} <span style={{ fontSize: 13, color: '#bbb', fontWeight: 400 }}>({t.hanja})</span>
          </span>
          <span style={{ fontSize: 10, color: '#c8a86a', background: '#fdf6ee', padding: '2px 8px', borderRadius: 8 }}>{t.category}</span>
          <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: 16, color: '#ccc', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ background: '#f6f6f3', borderRadius: 10, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: '#8f3d0e', fontWeight: 700, marginBottom: 5 }}>한마디로</div>
          <div style={{ fontSize: 14, color: '#333', lineHeight: 1.6, fontWeight: 600 }}>{t.oneline}</div>
        </div>

        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.85, whiteSpace: 'pre-line' }}>
          {t.desc}<br /><br />
          <span style={{ color: '#43a047', fontWeight: 700 }}>좋을 때</span> — {t.good}<br /><br />
          <span style={{ color: '#e53935', fontWeight: 700 }}>주의할 때</span> — {t.caution}
        </div>

        <div onClick={onClose} style={{ marginTop: 16, background: '#1a1a1a', color: '#fff', textAlign: 'center', padding: 11, borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          확인
        </div>
      </div>
    </div>
  )
}
