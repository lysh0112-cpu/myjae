'use client'

/**
 * 병존(竝存) — 명식에 같은 글자가 나란히 있는가
 * 출전: 『명리적성 비법노트』(심산) 74~77쪽
 * ─────────────────────────────────────────────────────────
 * ★★2026-07-27 — 해석문을 화면에서 전부 걷어냈다.
 *
 *   처음에는 병존과 지지 특징의 풀이를 통째로 늘어놨다. 그런데 그건 재료다.
 *   손님은 자기가 고른 질문의 답만 받으면 되고, 재료를 다 펴 놓으면
 *   읽을 게 너무 많아진다. (교훈 AV — reasons 는 그리지 않는다)
 *
 *   → 화면에는 "이 사주에 이런 게 있다"는 **사실**만 남긴다.
 *      풀이는 lib/saju/toTongbyeonInput.ts 를 거쳐 AI 통변으로만 간다.
 *
 *   ⚠️ 여기에 설명을 다시 붙이고 싶어지면 먼저 물어보라. 재료와 화면은 다르다.
 */

import type { Pillar } from '@/lib/saju/simsanOhaeng'
import { findByeongjon, findCombo, findJijiByeongjon } from '@/lib/saju/byeongjon'

const LINE = '#f0e0d5'
const ACCENT = '#8f3d0e'

interface Props {
  saju: Pillar[]
  /** 지금은 안 쓴다. 화면에 풀이를 안 내보내기 때문. 부르는 쪽 호환을 위해 남긴다. */
  target?: 'student' | 'adult'
}

function Chip({ glyph, where, sal }: { glyph: string; where: string; sal?: string }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: '#faf6f1', border: `0.5px solid ${LINE}`, borderRadius: 9,
      padding: '4px 9px', whiteSpace: 'nowrap',
    }}>
      <b style={{ fontSize: 13, color: '#1a1a1a', letterSpacing: '.02em' }}>{glyph}</b>
      <span style={{ fontSize: 10.5, color: '#a3907f' }}>{where}</span>
      {sal && <span style={{ fontSize: 10, color: '#6a4a9c' }}>{sal}</span>}
    </span>
  )
}

export default function ByeongjonView({ saju }: Props) {
  const gan = findByeongjon(saju)
  const combo = findCombo(saju)
  const ji = findJijiByeongjon(saju)
  const total = gan.length + combo.length + ji.length
  if (total === 0) return null      // ★없으면 아예 안 그린다 (교훈 BL)

  return (
    <div style={{
      background: '#fff', border: `0.5px solid ${LINE}`, borderRadius: 16,
      padding: '12px 16px 13px', marginBottom: 10,
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
        <span style={{ color: ACCENT, fontSize: 12 }}>✦</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>병존 (竝存)</span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 8,
          background: '#fff3e9', border: `0.5px solid #e8d5c5`, color: ACCENT, fontWeight: 600,
        }}>{total}가지</span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {gan.map(h => (
          <Chip key={h.key} glyph={h.key} where={h.pillars.join('·')}
            sal={h.row.yeokma ? `역마·${h.row.yeokma}` : undefined} />
        ))}
        {combo.map(c => (
          <Chip key={c.key} glyph={c.row.need.join('')} where={c.key} />
        ))}
        {ji.map(h => (
          <Chip key={h.key} glyph={h.key} where={h.pillars.join('·')}
            sal={h.row.sal?.join('·')} />
        ))}
      </div>

      <div style={{ fontSize: 10.5, color: '#b4785a', lineHeight: 1.6, marginTop: 9 }}>
        같은 글자가 나란히 있어 그 기운이 짙어요. 자세한 풀이는 질문을 고르시면 풀이에 담아 드립니다.
      </div>
    </div>
  )
}
