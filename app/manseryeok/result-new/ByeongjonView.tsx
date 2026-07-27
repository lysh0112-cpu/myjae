'use client'

/**
 * 병존(竝存) 카드 — 사주 원국에 같은 글자가 나란히 있는가
 * ─────────────────────────────────────────────────────────
 * 출전: 『명리적성 비법노트』(심산) 74~77쪽
 *         07 天干의 병존 (74~75쪽)   08 地支의 병존 (76~77쪽)
 *
 * 판정은 lib/saju/byeongjon.ts 하나뿐이다. 이 파일은 그리기만 한다.
 *
 * ★걸린 게 하나도 없으면 null 을 돌려준다. 빈 상자를 그리지 않는다.
 *   (교훈 BL — 미완성·빈자리를 화면에 적지 마라)
 *
 * ⚠️ row.original 은 절대 그리지 않는다. 교재 원문이라 화면에 낼 수 없는 말이 섞여 있다.
 *    화면에는 say / sayStudent 만 쓴다. (byeongjon.ts 머리말 참조)
 */

import { useState } from 'react'
import type { Pillar } from '@/lib/saju/simsanOhaeng'
import {
  findByeongjon, findCombo, findJijiByeongjon, sayOf,
} from '@/lib/saju/byeongjon'

const CARD = '#fff'
const LINE = '#f0e0d5'
const ACCENT = '#8f3d0e'

interface Props {
  saju: Pillar[]
  /** 학생이면 순화된 문장이 나간다 */
  target?: 'student' | 'adult'
}

/** 자리 배지 (년간·월지 …) */
function Where({ text }: { text: string }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 8,
      background: '#fff3e9', border: `0.5px solid #e8d5c5`, color: ACCENT,
      fontWeight: 600, whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

/** 살 배지 (천문성·현침살 …) */
function Sal({ text }: { text: string }) {
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 8,
      background: '#f3eef8', border: `0.5px solid #e5dcf0`, color: '#6a4a9c',
      fontWeight: 600, whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

interface ItemProps {
  glyph: string
  ko?: string
  wheres: string[]
  sals?: string[]
  body: string
  jobs?: string[]
  jobsSay?: string
}

function Item({ glyph, ko, wheres, sals, body, jobs, jobsSay }: ItemProps) {
  return (
    <div style={{ padding: '12px 15px', borderTop: `0.5px solid #f7ede4` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 7 }}>
        <span style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a', letterSpacing: '.02em' }}>{glyph}</span>
        {ko && <span style={{ fontSize: 11, color: '#b4785a' }}>{ko}</span>}
        {wheres.map(w => <Where key={w} text={w} />)}
        {sals?.map(s => <Sal key={s} text={s} />)}
      </div>
      <p style={{ margin: 0, fontSize: 13, color: '#4a3a30', lineHeight: 1.75 }}>{body}</p>
      {(jobs?.length || jobsSay) && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, color: '#a3907f' }}>어울리는 자리</span>
          {jobs?.length
            ? jobs.map(j => (
                <span key={j} style={{
                  fontSize: 11.5, padding: '2px 8px', borderRadius: 7,
                  background: '#faf3ee', border: `0.5px solid ${LINE}`, color: '#6b5340',
                }}>{j}</span>
              ))
            : <span style={{ fontSize: 11.5, color: '#6b5340' }}>{jobsSay}</span>}
        </div>
      )}
    </div>
  )
}

export default function ByeongjonView({ saju, target = 'adult' }: Props) {
  const [open, setOpen] = useState(true)

  const gan = findByeongjon(saju)
  const combo = findCombo(saju)
  const ji = findJijiByeongjon(saju)
  const total = gan.length + combo.length + ji.length
  if (total === 0) return null      // ★없으면 아예 안 그린다

  return (
    <div style={{
      background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 16,
      overflow: 'hidden', marginBottom: 10,
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      <div onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 10px',
          borderBottom: open ? `0.5px solid #f7ede4` : 'none', cursor: 'pointer',
        }}>
        <span style={{ color: ACCENT, fontSize: 12 }}>✦</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>병존 (竝存)</span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 8,
          background: '#fff3e9', border: `0.5px solid #e8d5c5`, color: ACCENT, fontWeight: 600,
        }}>{total}가지</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#c5a590' }}>{open ? '접기' : '펼쳐보기'}</span>
      </div>

      {open && (
        <>
          <div style={{ fontSize: 10.5, color: '#b4785a', padding: '8px 16px 0', lineHeight: 1.6 }}>
            같은 글자가 나란히 있는 것을 병존이라고 해요. 그 기운이 두 배로 짙어집니다.
          </div>

          {gan.map(h => (
            <Item key={h.key} glyph={h.key} ko={h.row.ko}
              wheres={h.pillars}
              sals={h.row.yeokma ? [`역마 · ${h.row.yeokma}`] : undefined}
              body={sayOf(h.row, target)}
              jobsSay={h.row.jobsSay} />
          ))}

          {combo.map(c => (
            <Item key={c.key} glyph={c.row.need.join('')} ko={c.key}
              wheres={c.pillars}
              body={sayOf(c.row, target)} />
          ))}

          {ji.map(h => (
            <Item key={h.key} glyph={h.key} ko={h.row.ko}
              wheres={h.pillars}
              sals={h.row.sal}
              body={sayOf(h.row, target)}
              jobs={h.row.jobs} jobsSay={h.row.jobsSay} />
          ))}

          <div style={{ fontSize: 10, color: '#c5a590', padding: '9px 16px 12px', lineHeight: 1.6 }}>
            『명리적성 비법노트』 74~77쪽. 병존은 결을 짙게 할 뿐, 하나만 보고 단정하지 마세요.
          </div>
        </>
      )}
    </div>
  )
}
