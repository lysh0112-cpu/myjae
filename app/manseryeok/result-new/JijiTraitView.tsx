'use client'

/**
 * 지지가 말하는 것 — 교재 48쪽 「地支의 종류」 + 50~73쪽 「12地支 심층 분석」 특징
 * ────────────────────────────────────────────────────────────
 * 판정은 lib/saju/jijiTrait.ts 하나뿐이다. 이 파일은 그리기만 한다.
 *
 * ★월지·일지를 먼저, 펼친 채로 둔다.
 *   교재 72쪽 亥 "月支와 日支에 있을 때 가장 강력하게 작용한다"
 *   교재 90쪽 신살 작용력도 월지·일지가 가장 크다.
 *   년지·시지는 접어 둔다. 넷을 다 펼치면 화면이 글로 덮인다.
 *
 * ⚠️ row.original / row.noteOriginal 은 절대 그리지 않는다. 교재 원문이다.
 */

import { useState } from 'react'
import type { Pillar } from '@/lib/saju/simsanOhaeng'
import {
  traitsInSaju, traitLines, noteLines, isDohwaAt, ctxOf,
  type JijiTraitRow, type Target, type SajuCtx,
} from '@/lib/saju/jijiTrait'

const LINE = '#f0e0d5'
const ACCENT = '#8f3d0e'

interface Props {
  saju: Pillar[]
  target?: Target
}

function Tag({ text, tone }: { text: string; tone: 'warm' | 'cool' }) {
  const c = tone === 'warm'
    ? { bg: '#fff3e9', bd: '#e8d5c5', fg: ACCENT }
    : { bg: '#f3eef8', bd: '#e5dcf0', fg: '#6a4a9c' }
  return (
    <span style={{
      fontSize: 10, padding: '2px 8px', borderRadius: 8, fontWeight: 600,
      background: c.bg, border: `0.5px solid ${c.bd}`, color: c.fg, whiteSpace: 'nowrap',
    }}>{text}</span>
  )
}

function One({ pillar, pillars, branch, row, target, ctx, defaultOpen }: {
  pillar: string; pillars: string[]; branch: string; row: JijiTraitRow
  target: Target; ctx: SajuCtx; defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const lines = [...traitLines(row, target, ctx), ...noteLines(row, target, ctx)]
  const dohwa = pillars.some(p => isDohwaAt(p.replace('지', '주'), branch))

  return (
    <div style={{ borderTop: `0.5px solid #b99a7d` }}>
      <div onClick={() => setOpen(v => !v)}
        style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '11px 15px 9px', cursor: 'pointer' }}>
        <span style={{ fontSize: 11, color: '#b4785a', whiteSpace: 'nowrap' }}>{pillar}</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: '#1a1a1a' }}>{branch}</span>
        <span style={{ fontSize: 11.5, color: '#8a7a6c' }}>{row.ko} · {row.tti}</span>
        {dohwa && <Tag text="도화" tone="warm" />}
        <span style={{ marginLeft: 'auto', fontSize: 10.5, color: '#c5a590' }}>{open ? '접기' : '펼쳐보기'}</span>
      </div>
      {open && (
        <div style={{ padding: '0 15px 12px' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 8 }}>
            <Tag text={`${row.eumyang}`} tone="cool" />
            <Tag text={row.chung} tone="cool" />
            <Tag text={`본기 ${row.bongi}`} tone="cool" />
            <Tag text={`${row.jeolgi} · ${row.hour}`} tone="cool" />
          </div>
          {lines.map((l, i) => (
            <p key={i} style={{ margin: '0 0 5px', fontSize: 12.5, color: '#4a3a30', lineHeight: 1.75, paddingLeft: 10, textIndent: -10 }}>
              · {l}
            </p>
          ))}
          {row.jobs?.length ? (
            <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
              <span style={{ fontSize: 10.5, color: '#a3907f' }}>어울리는 자리</span>
              {row.jobs.map(j => (
                <span key={j} style={{
                  fontSize: 11.5, padding: '2px 8px', borderRadius: 7,
                  background: '#faf3ee', border: `0.5px solid ${LINE}`, color: '#6b5340',
                }}>{j}</span>
              ))}
            </div>
          ) : null}
          <div style={{ fontSize: 10, color: '#c5a590', marginTop: 8 }}>{row.src}</div>
        </div>
      )}
    </div>
  )
}

export default function JijiTraitView({ saju, target = 'adult' }: Props) {
  const [open, setOpen] = useState(true)
  const hits = traitsInSaju(saju)
  const ctx = ctxOf(saju)
  if (!hits.length) return null

  return (
    <div style={{
      background: '#fff', border: `0.5px solid ${LINE}`, borderRadius: 16,
      overflow: 'hidden', marginBottom: 10,
      fontFamily: "'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      <div onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px 10px',
          borderBottom: open ? `0.5px solid #b99a7d` : 'none', cursor: 'pointer',
        }}>
        <span style={{ color: ACCENT, fontSize: 12 }}>✦</span>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1a1a1a' }}>지지가 말하는 것</span>
        <span style={{
          fontSize: 10, padding: '2px 8px', borderRadius: 8,
          background: '#fff3e9', border: `0.5px solid #9c7a58`, color: ACCENT, fontWeight: 600,
        }}>{hits.length}가지</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: '#c5a590' }}>{open ? '접기' : '펼쳐보기'}</span>
      </div>

      {open && (
        <>
          <div style={{ fontSize: 10.5, color: '#b4785a', padding: '8px 16px 2px', lineHeight: 1.6 }}>
            월지와 일지가 가장 세게 작용해요. 그 둘을 먼저 펼쳐 두었습니다.
          </div>
          {hits.map(h => (
            <One key={h.branch} pillar={h.pillar} pillars={h.pillars} branch={h.branch} row={h.row}
              target={target} ctx={ctx}
              defaultOpen={h.pillars.includes('월지') || h.pillars.includes('일지')} />
          ))}
          <div style={{ fontSize: 10, color: '#c5a590', padding: '9px 16px 12px', lineHeight: 1.6 }}>
            『명리적성 비법노트』 48쪽 · 50~73쪽. 한 글자만 보고 단정하지 마세요.
          </div>
        </>
      )}
    </div>
  )
}
