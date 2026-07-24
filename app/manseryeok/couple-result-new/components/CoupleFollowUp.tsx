// app/manseryeok/couple-result-new/components/CoupleFollowUp.tsx
// ============================================================================
//  자유 질문 — 결과를 다 보신 뒤 궁금한 것을 최대 3개까지 물어본다.
//
//  ★ 왜 결과 아래에 두는가 (2026-07-24 연재쌤·대표님)
//    예전에는 결과를 보기 '전'에 질문 12분류를 고르게 했다.
//    무엇이 궁금한지는 결과를 봐야 생긴다. 그래서 질문 고르기 화면을 없애고
//    (couple-result-new/page.tsx 의 SHOW_QUESTION_PICKER=false)
//    총평을 다 읽으신 다음 자유롭게 물어보시게 바꿨다.
//
//  ★ 3개로 제한한 이유
//    결혼택일·이사택일 진단이 최대 3개라 서비스 간 일관성을 맞췄다.
//    무제한이면 API 비용이 계속 나가고 결제 구조와도 어긋난다.
//
//  ★ 문답은 보관함에 남는다
//    답이 올 때마다 updateCoupleRecordResult() 로 result_data 를 덮어쓴다.
//    (insert 를 다시 하면 보관함에 같은 궁합이 두 줄로 쌓인다)
//    다시보기로 열면 문답이 그대로 나오고, 3개를 다 안 쓰셨으면 이어서 물어볼 수 있다.
// ============================================================================
'use client'

import { useState } from 'react'

export interface FollowUp {
  q: string
  a: string
}

export const MAX_FOLLOWUPS = 3

interface Props {
  items: FollowUp[]
  /** 질문 보내기 — 부모가 스트리밍·저장까지 맡는다 */
  onAsk: (question: string) => void
  /** 답변 받는 중 (스트리밍) */
  loading: boolean
  /** 스트리밍 중인 답 (아직 items 에 안 들어간 것) */
  streaming?: { q: string; a: string } | null
  /** 다시보기(스냅샷)에서도 물어볼 수 있게 할지 */
  disabled?: boolean
}

export default function CoupleFollowUp({
  items, onAsk, loading, streaming, disabled = false,
}: Props) {
  const [text, setText] = useState('')
  const [hint, setHint] = useState('')

  const used = items.length + (streaming ? 1 : 0)
  const left = Math.max(0, MAX_FOLLOWUPS - used)
  const full = left === 0

  function submit() {
    const t = text.trim()
    if (t.length < 5) { setHint('궁금한 점을 조금 더 자세히 적어주세요.'); return }
    if (full || loading) return
    setHint('')
    setText('')
    onAsk(t)
  }

  return (
    <div style={{ marginTop: 22 }}>
      {/* 섹션 라벨 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '0 2px 9px' }}>
        <span style={{
          fontSize: 10.5, letterSpacing: '.17em', color: '#8a7063', fontWeight: 700, whiteSpace: 'nowrap',
        }}>더 궁금한 것</span>
        <span style={{ flex: 1, height: '0.5px', background: '#eee2d6' }} />
      </div>

      {/* 이미 주고받은 문답 */}
      {items.map((it, i) => <QaCard key={i} qa={it} />)}

      {/* 답변 받는 중 */}
      {streaming && <QaCard qa={streaming} streaming />}

      {/* 입력칸 */}
      {!disabled && (
        <div style={{
          border: '1px dashed #d8b89a', borderRadius: 13, background: '#faf3ec', padding: '12px 13px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#96502e', letterSpacing: '-.02em' }}>
              ✏️ 무엇이든 물어보세요
            </span>
            <span style={{
              fontSize: 10, color: full ? '#b08a6a' : '#96502e',
              background: '#fff', borderRadius: 7, padding: '2px 7px',
            }}>
              {full ? '모두 사용' : `${left}번 남음`}
            </span>
          </div>

          {full ? (
            <div style={{
              fontSize: 11.5, color: '#8a7063', lineHeight: 1.7, textAlign: 'center', padding: '8px 4px',
            }}>
              질문을 모두 사용하셨어요.<br />
              더 깊은 이야기는 상담으로 이어가실 수 있습니다.
            </div>
          ) : (
            <>
              <textarea
                value={text}
                onChange={e => { setText(e.target.value); if (hint) setHint('') }}
                placeholder="두 분 궁합에 대해 궁금한 걸 자유롭게 적어보세요"
                disabled={loading}
                style={{
                  width: '100%', boxSizing: 'border-box', minHeight: 50, background: '#fff',
                  border: '0.5px solid #e8d5c5', borderRadius: 10, padding: '9px 11px',
                  fontSize: 12, color: '#2f211c', resize: 'none', fontFamily: 'inherit',
                  outline: 'none', lineHeight: 1.55,
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 7 }}>
                <span style={{
                  flex: 1, fontSize: 10, lineHeight: 1.5,
                  color: hint ? '#c8783c' : '#c5a590',
                }}>
                  {hint || `${MAX_FOLLOWUPS}번까지 물어보실 수 있어요.`}
                </span>
                <button
                  type="button"
                  onClick={submit}
                  disabled={loading || !text.trim()}
                  style={{
                    fontSize: 11.5, color: '#fff',
                    background: (loading || !text.trim()) ? '#d8bfae' : '#b46e46',
                    border: 'none', borderRadius: 8, padding: '6px 14px',
                    cursor: (loading || !text.trim()) ? 'default' : 'pointer',
                    flexShrink: 0, fontFamily: 'inherit', fontWeight: 600,
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {loading ? '풀이 중…' : '물어보기'}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function QaCard({ qa, streaming }: { qa: FollowUp; streaming?: boolean }) {
  return (
    <div style={{
      background: '#fff', border: '0.5px solid #eee2d6', borderRadius: 13,
      padding: '12px 13px', marginBottom: 7,
    }}>
      <div style={{
        display: 'flex', gap: 7, fontSize: 12.5, fontWeight: 700,
        color: '#96502e', lineHeight: 1.5, letterSpacing: '-.02em',
      }}>
        <span style={{
          flexShrink: 0, width: 17, height: 17, borderRadius: '50%',
          background: '#f6e8ec', color: '#a8465f', fontSize: 10, fontWeight: 700,
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1,
        }}>Q</span>
        <span>{qa.q}</span>
      </div>

      {(qa.a || streaming) && (
        <div style={{
          fontSize: 12, lineHeight: 1.85, color: '#2f211c', whiteSpace: 'pre-wrap',
          marginTop: 9, paddingTop: 9, borderTop: '0.5px solid #f5ece3', letterSpacing: '-.01em',
        }}>
          {qa.a}
          {streaming && !qa.a && (
            <span style={{ color: '#8a7063' }}>정성껏 풀이하고 있어요…</span>
          )}
        </div>
      )}
    </div>
  )
}
