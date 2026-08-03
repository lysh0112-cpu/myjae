'use client'

/**
 * 합격운 카드 한 장
 * ─────────────────────────────────────────────
 * 판정 부품(lib/saju/examLuck/*)이 내놓는 ExamCard 를 그대로 받아 그린다.
 * ★진로적성 CareerJudgeCard 를 그대로 본떴다. 새로 설계하지 않는다. (작업지시 2장)
 *
 * ⚠️ reasons 는 절대 그리지 않는다. AI 통변에게만 주는 재료다. (교훈 AV)
 *
 * ★등급 배지는 겁주지 않는 결로 (작업지시 8장)
 *   '많이 조심' 도 붉게 칠하지 않는다. 흐린 자두빛까지만 간다.
 */

import { useState } from 'react'
import { splitCardText } from '@/lib/saju/premium/splitCardText'
import type { ExamCard, Grade } from '@/lib/saju/examLuck/types'

/**
 * ★긴 낱말이 안 꺾여 오른쪽으로 넘치던 것을 막는다. (2026-07-27)
 *   "9급·7급·로스쿨·교사 임용고시" 처럼 가운뎃점으로 이어진 말은
 *   브라우저가 한 덩어리로 보아 줄을 안 바꾼다. 화면 밖으로 잘려 나갔다.
 */
const WRAP = {
  wordBreak: 'keep-all' as const,      // 한글은 낱말 단위로 꺾는다
  overflowWrap: 'anywhere' as const,   // 그래도 넘치면 어디서든 꺾는다
}

const CARD = '#FFFBF7'
const LINE = '#f0e0d5'
const ACCENT = '#c85a8c'

/** 다섯 칸 등급 색 — 좋은 쪽은 따뜻하게, 살필 쪽은 차분하게 */
export const GRADE_STYLE: Record<Grade, { bg: string; fg: string }> = {
  '아주 좋음': { bg: '#e9f2ea', fg: '#3b6d3b' },
  '좋음': { bg: '#eef3ea', fg: '#5a7a45' },
  '보통': { bg: '#f4efe8', fg: '#7a6858' },
  '조심': { bg: '#f7f0e6', fg: '#8a6a3c' },
  '많이 조심': { bg: '#f7eef1', fg: '#8c4a63' },
}

interface Props {
  card: ExamCard
  /** 그 카드에 붙는 AI 통변. 없으면 판정 문장을 본문으로 쓴다. */
  tong?: string
}

/**
 * ★2026-07-29 — 통변에서 [한줄]·[태그]·[실천] 을 갈라 낸다. (대표님 지시)
 *
 *   [무엇이 문제였나] 프롬프트에 카드 형식을 심어 두었는데 화면이 몰라서
 *     «[한줄] …» 이 본문에 글자 그대로 나오거나, 통짜 글로만 보였습니다.
 *     사주풀이(TongbyeonView)는 이미 갈라 그리는데 합격운만 안 했습니다.
 *   ⚠️ 형식이 없으면 예전처럼 통짜로 그립니다. 옛 통변도 안 깨집니다.
 */
// ★2026-08-03 (44부 30차) — 파서를 lib/saju/premium/splitCardText.ts 로 «옮겼습니다».
//   ⚠️ 같은 코드가 사주풀이·합격운 두 곳에 복사되어 있었고, ★진로적성에는 «없어서»
//      「[한줄] …」이 손님 화면에 글자 그대로 나갔습니다. 여기서 다시 적지 마십시오.
const splitTong = splitCardText

export default function ExamJudgeCard({ card, tong }: Props) {
  const [openWhy, setOpenWhy] = useState(false)
  const hasTong = !!(tong && tong.trim())
  const parsed = hasTong ? splitTong(tong!) : null

  return (
    <div style={{
      background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
      padding: '16px 16px 14px', marginBottom: 12,
      overflowWrap: 'anywhere', minWidth: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14.5, fontWeight: 500, color: '#3a2e28' }}>{card.title}</div>
        {card.badge && (
          <span style={{
            fontSize: 11, background: '#f7e6ee', color: ACCENT,
            padding: '2px 9px', borderRadius: 8, fontWeight: 500,
          }}>{card.badge}</span>
        )}
      </div>

      {/* 풀이가 있으면 풀이를 본문으로, 판정 문장은 「근거 보기」로 접는다 */}
      {parsed && (
        <>
          {/* ★핵심 요약 한 줄 */}
          {parsed.summary && (
            <p style={{
              fontSize: 13, color: ACCENT, lineHeight: 1.6, fontWeight: 600,
              margin: '0 0 9px', ...WRAP,
            }}>{parsed.summary}</p>
          )}

          {/* ★키워드 태그 */}
          {parsed.tags && parsed.tags.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, margin: '0 0 10px' }}>
              {parsed.tags.map((t, i) => (
                <span key={i} style={{
                  fontSize: 10.5, color: '#8c4a63', background: '#fdeef4',
                  border: '1px solid #f5dbe6', padding: '3px 9px', borderRadius: 20, fontWeight: 600,
                }}>{t}</span>
              ))}
            </div>
          )}

          {/* ★단락으로 나눠 그린다 */}
          {parsed.body.split(/\n\s*\n/).filter(t => t.trim()).map((para, i) => (
            <p key={i} style={{
              fontSize: 13.5, color: '#3a2e28', lineHeight: 1.85,
              margin: '0 0 10px', whiteSpace: 'pre-wrap', ...WRAP,
            }}>{para.trim()}</p>
          ))}

          {/* ★실천 — 강조 상자 */}
          {parsed.action && (
            <div style={{
              marginTop: 2, marginBottom: 4, padding: '11px 12px', borderRadius: 11,
              background: '#fdf6ee', border: '1px solid rgba(200,120,60,0.26)',
              display: 'flex', gap: 8, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 13, lineHeight: 1.4, flexShrink: 0 }}>✅</span>
              <span style={{ fontSize: 12.5, lineHeight: 1.75, color: '#6b4a2e', ...WRAP }}>
                {parsed.action}
              </span>
            </div>
          )}
        </>
      )}

      {!hasTong && card.lines.map((l, i) => (
        <p key={i} style={{ fontSize: 13, color: '#4a3a30', lineHeight: 1.75, margin: '0 0 6px', ...WRAP }}>{l}</p>
      ))}

      {hasTong && card.lines.length > 0 && (
        <div style={{ marginTop: 10, borderTop: `0.5px solid ${LINE}`, paddingTop: 8 }}>
          <button onClick={() => setOpenWhy(o => !o)}
            style={{
              background: 'none', border: 'none', padding: 0, cursor: 'pointer',
              color: ACCENT, fontSize: 12, fontFamily: 'inherit',
            }}>
            {openWhy ? '근거 접기' : '근거 보기'}
          </button>
          {openWhy && (
            <div style={{ marginTop: 7 }}>
              {card.lines.map((l, i) => (
                <p key={i} style={{ fontSize: 12.5, color: '#7a6858', lineHeight: 1.7, margin: '0 0 5px', ...WRAP }}>{l}</p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
