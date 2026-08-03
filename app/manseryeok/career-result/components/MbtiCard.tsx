'use client'

// ============================================================================
// 사주 MBTI 카드 — 네 축 막대 + 실제 MBTI 견주기
// ----------------------------------------------------------------------------
// ★2026-07-29 대표님 지시.
//
//   ⚠️ 맨 위에 «참고입니다» 를 적어 둡니다.
//      명리와 MBTI 는 뿌리가 다른 체계이고, 짝짓는 산식은 교재에 없습니다.
//      이 말을 빼면 손님이 «사주가 내 MBTI 를 맞혔다»고 읽습니다.
//      맞히는 것이 아니라 «타고난 결을 익숙한 말로 옮긴 것»입니다.
//
//   구성
//     ① 네 글자 + 칭호
//     ② 네 축 막대 — 어느 기운 때문에 그리 나왔는지 한 줄 근거를 곁들임
//     ③ 실제 MBTI 를 넣었으면 견주기 카드, 안 넣었으면 넣도록 권하는 띠
// ============================================================================

import type { SajuMbtiResult, MbtiCompare } from '@/lib/saju/career/sajuMbti'

const ACCENT = '#785aaa'

interface Props {
  result: SajuMbtiResult
  realMbti?: string
  compare?: MbtiCompare | null
  /** [실제 MBTI 넣기] 를 눌렀을 때 — 입력 화면으로 되돌린다 */
  onWantInput?: () => void
}

const AXIS_NAME: Record<string, string> = {
  EI: '기운이 향하는 곳',
  SN: '무엇을 먼저 보는가',
  TF: '무엇으로 고르는가',
  JP: '어떻게 맺는가',
}

/**
 * 기울기를 «말» 로 — ★숫자를 보이지 않습니다.
 *
 *  ⚠️ 「반반에 가까워요」는 45~55% 로 잡습니다 — result.balanced 와 «같은 잣대» 입니다.
 *     두 곳이 다르면 「반반」이라 써 놓고 아래엔 안 그렇게 나오는 날이 옵니다.
 */
function leanWord(leftPct: number): string {
  const d = Math.abs(leftPct - 50)
  if (d <= 5) return '반반에 가까워요'
  if (d <= 15) return '조금 기울어요'
  if (d <= 25) return '뚜렷해요'
  return '아주 뚜렷해요'
}

export default function MbtiCard({ result, realMbti, compare, onWantInput }: Props) {
  return (
    <div style={{
      background: '#fff',
      border: '1px solid rgba(120,53,15,0.15)',
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      padding: 16,
      marginBottom: 12,
    }}>
      {/* ── 머리 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🧩</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.2px' }}>
            사주로 본 성향
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            재미로 보는 참고예요. 검사 결과를 대신하지 않아요.
          </div>
        </div>
      </div>

      {/* ── 네 글자 + 칭호 ── */}
      <div style={{
        display: 'flex', alignItems: 'baseline', gap: 9,
        margin: '14px 0 4px', padding: '13px 14px', borderRadius: 13,
        background: 'linear-gradient(120deg, rgba(250,245,255,0.95), rgba(238,242,255,0.85))',
        border: `1px solid ${ACCENT}2e`,
      }}>
        <span style={{ fontSize: 25, fontWeight: 800, color: ACCENT, letterSpacing: '1.5px' }}>
          {result.code}
        </span>
        <span style={{ fontSize: 13, color: '#4a3b60', fontWeight: 600 }}>{result.title}</span>
      </div>

      {result.balanced && (
        <div style={{ fontSize: 11, color: '#8a6a52', marginBottom: 6, lineHeight: 1.6 }}>
          ※ 두 축 이상이 반반에 가깝습니다. 어느 한쪽으로 몰린 결이 아니라, 상황에 따라 달리 쓰는 분입니다.
        </div>
      )}

      {/* ── 네 축 막대 ── */}
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 13 }}>
        {result.axes.map(a => (
          <div key={a.axis}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              marginBottom: 5,
            }}>
              <span style={{ fontSize: 11, color: '#64748b' }}>{AXIS_NAME[a.axis]}</span>
              {/* ★2026-08-03 (44부 28차) — 「81 : 19」를 «말» 로 바꿨습니다.
                  🔴 [까닭] 그 숫자가 «무엇의 비율인지» 화면 어디에도 없었고,
                     아래 근거를 아무리 더해도 그 값이 나오지 «않았습니다».
                     ⚠️ 대표님도 헷갈리셨습니다. 손님은 더합니다.
                  ⚠️ leftPct 는 «막대 길이» 로 그대로 씁니다 — 지운 것이 아닙니다. */}
              <span style={{ fontSize: 11, color: '#94a3b8' }}>{leanWord(a.leftPct)}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{
                fontSize: 12.5, fontWeight: 800, width: 15, textAlign: 'center', flexShrink: 0,
                color: a.pick === a.left ? ACCENT : '#cbd5e1',
              }}>{a.left}</span>

              <div style={{
                flex: 1, height: 9, borderRadius: 20, overflow: 'hidden',
                background: '#eef2f6', position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', inset: 0,
                  width: `${a.leftPct}%`,
                  background: `linear-gradient(90deg, ${ACCENT}, #a58fd0)`,
                  borderRadius: 20,
                }} />
              </div>

              <span style={{
                fontSize: 12.5, fontWeight: 800, width: 15, textAlign: 'center', flexShrink: 0,
                color: a.pick === a.right ? ACCENT : '#cbd5e1',
              }}>{a.right}</span>
            </div>

            {/* 왜 그렇게 나왔나 — ★기운 «이름» 만. 숫자를 보이지 않습니다 (44부 28차) */}
            <div style={{ fontSize: 10.5, color: '#8a6a52', marginTop: 5, paddingLeft: 23 }}>
              {a.pick} 쪽 — {a.why}
            </div>
          </div>
        ))}
      </div>

      {/* ── 실제 MBTI 와 견주기 ── */}
      {compare && realMbti ? (
        <div style={{
          marginTop: 16, padding: '13px 14px', borderRadius: 13,
          background: '#fbf8f5', border: '1px solid rgba(120,53,15,0.11)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 11.5, color: '#64748b' }}>타고난 결</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: ACCENT }}>{result.code}</span>
            <span style={{ fontSize: 12, color: '#cbd5e1' }}>↔</span>
            <span style={{ fontSize: 11.5, color: '#64748b' }}>지금의 결</span>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#1e293b' }}>{realMbti}</span>
          </div>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: '#1e293b', marginBottom: 5 }}>
            {compare.headline}
          </div>
          <div style={{ fontSize: 11.5, color: '#5c4a3e', lineHeight: 1.72 }}>
            {compare.body}
          </div>
        </div>
      ) : (
        <div style={{
          marginTop: 16, padding: '13px 14px', borderRadius: 13,
          background: '#faf7ff', border: `1px solid ${ACCENT}26`,
        }}>
          <div style={{ fontSize: 11.5, color: '#4a3b60', lineHeight: 1.7 }}>
            실제 MBTI 를 넣으시면 <b>타고난 결과 지금의 결</b>이 어떻게 만나는지
            입체적으로 견주어 드려요.
          </div>
          {onWantInput && (
            <button
              onClick={onWantInput}
              style={{
                marginTop: 10, width: '100%', padding: '10px 12px', borderRadius: 11,
                background: ACCENT, border: 'none', color: '#fff',
                fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >실제 MBTI 넣고 다시 보기</button>
          )}
        </div>
      )}
    </div>
  )
}
