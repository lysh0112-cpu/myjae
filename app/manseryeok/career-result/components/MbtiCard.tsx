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

import { AXIS_WORK, AXIS_NAME_SHORT, titleOf } from '@/lib/saju/career/sajuMbti'
import type { SajuMbtiResult, MbtiCompare } from '@/lib/saju/career/sajuMbti'
import { LINE_OUTER } from '@/lib/ui/line'

const ACCENT = '#785aaa'

interface Props {
  result: SajuMbtiResult
  realMbti?: string
  compare?: MbtiCompare | null
  /** [실제 MBTI 넣기] 를 눌렀을 때 — 입력 화면으로 되돌린다 */
  onWantInput?: () => void
  /** 손님 이름 — 「류도이님은 …」 (없으면 이름 없이 씁니다) */
  name?: string
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
/** ⚠️ 「1가지가」가 아니라 「한 가지가」 — 손님께 드리는 말입니다 */
/**
 * 긴 설명이 짧은 이름과 «같은 말로 시작»하면 그 문장을 뺍니다.
 *  ⚠️ 두 벌이 결이 달라 대개는 안 겹치는데, N·P 처럼 겹치는 글자가 있습니다.
 *     겹친 채로 두면 손님 눈에 ★같은 말을 두 번 한 것으로 보입니다.
 */
function trimEcho(ch: string): string {
  // ★짧은 이름의 «낱말» 을 뽑아, 그 낱말이 여럿 겹치는 문장을 뺍니다.
  //   ⚠️ 앞 여덟 글자만 견주면 S·J·P 를 못 잡습니다 —
  //      「정해 두고 가는 결」 / 「정해 두고 가야 편합니다」처럼 말끝만 다릅니다.
  const words = (AXIS_NAME_SHORT[ch] ?? '')
    .replace(/ 결$/, '').split(/\s+/).filter(w => w.length >= 2)
  const parts = (AXIS_WORK[ch] ?? '').split(/(?<=\.)\s+/).filter(Boolean)
  const echo = (p: string) => {
    const hit = words.filter(w => p.includes(w.replace(/(는|을|를|이|가|에서|으로)$/, ''))).length
    return words.length > 0 && hit >= Math.min(2, words.length)
  }
  const kept = parts.filter(p => !echo(p))
  return (kept.length ? kept : parts).join(' ')
}

const NUM: Record<number, string> = { 1: '한 가지', 2: '두 가지', 3: '세 가지' }

function leanWord(leftPct: number): string {
  const d = Math.abs(leftPct - 50)
  if (d <= 5) return '반반에 가까워요'
  if (d <= 15) return '조금 기울어요'
  if (d <= 25) return '뚜렷해요'
  return '아주 뚜렷해요'
}

// ⚠️ onWantInput 은 Props 에 «남겨 두되» 지금은 받지 않습니다 —
//    부르는 쪽(career-result/page.tsx)을 고치지 않으려는 것입니다. 되살릴 때 씁니다.
export default function MbtiCard({ result, realMbti, compare, name }: Props) {
  return (
    <div style={{
      background: '#fff',
      // ★2026-08-05 (47부 25차) — 카드 «바깥» 선을 선 부품으로. [대표님 지시]
      //   ⚠️ 아래 borderLeft 셋(#5dcaa5 초록 · #f0997b 주황 · #cec9f0 보라)은
      //      ★«세 가지 뜻» 을 색으로 가르는 자리라 «그대로» 둡니다.
      border: LINE_OUTER,
      borderRadius: 16,
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      padding: 16,
      marginBottom: 12,
    }}>
      {/* ── 머리 ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ fontSize: 22, lineHeight: 1 }}>🧩</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* ★2026-08-03 (44부 31차) — 제목을 «갈랐습니다» (대표님 지시)
              ⚠️ 「내 MBTI에 대비해 본…」은 ★MBTI 를 넣으신 분에게만 맞는 말입니다.
                 안 넣으신 분께 그렇게 말하면 «없는 것을 있다고» 하는 셈입니다. */}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', letterSpacing: '-0.2px' }}>
            {compare && realMbti ? '내 MBTI에 대비해 본 나의 사주명리' : '사주로 본 성향'}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
            재미로 보는 참고예요. 검사 결과를 대신하지 않아요.
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════
          ★2026-08-03 (44부 32차) — 「표」를 걷어내고 «읽는 글» 로 (대표님 지시)

          🔴 [무엇이 있었나]  네 글자(ESFP)를 크게 던져 놓고, 그것이 «무엇인지»
             — 사주가 본 것인지, 손님이 넣으신 것인지 — 를 ★맨 아래에서야 밝혔습니다.
             ⚠️ 대표님도 「이 사람의 타고난 결이 ESFP란 거야?」 하고 물으셨습니다.
                화면에 크게 적혀 있는데도 그러셨다면, 손님은 더합니다.
          ★[이제]  첫 문장에서 «누가 무엇을 말하는지» 를 끝냅니다.
             ① 사주가 본 결은 …입니다  ② 스스로 아시는 결은 …라고 하셨지요
             ③ 어긋난 것이 아닙니다   ← ★손님이 «혼자 의아해할 틈» 을 주지 않습니다
          ══════════════════════════════════════════════════════════ */}
      <div style={{
        background: '#f3f0fc', borderRadius: 12,
        padding: '14px 15px', margin: '14px 0 16px',
      }}>
        <p style={{ margin: '0 0 8px', fontSize: 14, lineHeight: 1.8, color: '#2e2550' }}>
          {name ? `${name}님은 ` : ''}사주명리에 비춰 볼 때 타고난 결이{' '}
          <b style={{ fontWeight: 700 }}>{result.code}({result.title})</b>입니다.
        </p>
        {compare && realMbti && (
          <p style={{ margin: 0, fontSize: 13, lineHeight: 1.8, color: '#4a3b60' }}>
            스스로 아시는 결은{' '}
            <b style={{ fontWeight: 700 }}>{realMbti}({titleOf(realMbti)})</b>라고 하셨지요.{' '}
            {compare.same === 4
              ? '네 결이 그대로 겹칩니다.'
              : compare.same === 0
                ? '네 결이 모두 갈립니다. 어긋난 것이 아니라, 살아오며 길러 내신 결입니다.'
                : `네 결 가운데 ${NUM[compare.diffAxes.length] ?? compare.diffAxes.length}가 갈립니다. 어긋난 것이 아니라, 살아오며 길러 내신 결입니다.`}
          </p>
        )}
      </div>

      {/* ★두 줄로 겹쳐 보기 — 어느 칸이 바뀌었는지 «한눈에»
          ⚠️ 2026-08-03 (44부 33차) — 「타고난 / 지금」을 칸 «왼쪽» 으로 옮겼습니다.
             오른쪽 끝에 붙여 두니 어느 줄의 이름인지 눈이 한 번 더 가야 했습니다.
             ★글은 왼쪽에서 오른쪽으로 흐르니 이름이 «먼저» 와야 읽힙니다. */}
      {compare && realMbti && compare.same < 4 && (
        <div style={{ marginBottom: 18 }}>
          {([['born', '타고난'], ['now', '지금']] as const).map(([k, lab]) => (
            <div key={k} style={{
              display: 'flex', gap: 7, alignItems: 'center',
              marginBottom: k === 'born' ? 6 : 0,
            }}>
              <span style={{
                width: 36, flexShrink: 0, fontSize: 11, color: '#94a3b8', textAlign: 'right',
              }}>{lab}</span>
              {compare.axes.map(a => {
                const on = a.same
                return (
                  <div key={a.label} style={{
                    flex: 1, height: 42, borderRadius: 9,
                    background: on ? '#e6f4ee' : (k === 'born' ? '#fbeee9' : '#f6d9cd'),
                    display: 'grid', placeItems: 'center',
                    fontSize: 18, fontWeight: 700,
                    color: on ? '#0f6e56' : (k === 'born' ? '#993c1d' : '#4a1b0c'),
                  }}>{a[k]}</div>
                )
              })}
            </div>
          ))}
          {/* ★어느 칸이 무슨 결인지 — 아래에 옅게 한 줄 */}
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 5 }}>
            <span style={{ width: 36, flexShrink: 0 }} />
            {compare.axes.map(a => (
              <div key={a.label} style={{
                flex: 1, textAlign: 'center', fontSize: 10, color: '#a09488',
              }}>{a.label.replace(' 결', '')}</div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ★같은 결 / 다른 결 — 알약 머리말 + 결마다 한 덩이 (44부 32차)

          ⚠️ 알약에는 「같은 결」만, 결 이름은 «옆에» 옅게 둡니다.
             알약 안에 이름까지 넣으면 넷이 갈리는 분은 «두 줄로 터집니다».
          ⚠️ 한쪽이 비면 그 알약을 «안 그립니다» (넷 다 같거나 넷 다 다를 때)
          ══════════════════════════════════════════════════════════ */}
      {compare && realMbti ? (
        <>
          {compare.axes.some(a => a.same) && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
                <span style={{
                  fontSize: 11.5, color: '#0f6e56', background: '#e6f4ee',
                  border: '0.5px solid #b6e0d0', padding: '4px 13px', borderRadius: 20,
                }}>같은 결</span>
                <span style={{ fontSize: 11.5, color: '#8a7063' }}>
                  {compare.sameAxes.join(' · ')}
                </span>
              </div>
              {compare.axes.filter(a => a.same).map(a => (
                <div key={a.label} style={{
                  borderLeft: '2px solid #5dcaa5', padding: '2px 0 2px 12px', marginBottom: 8,
                }}>
                  {/* ⚠️ 짧은 이름과 긴 설명이 «같은 말» 로 시작하는 글자가 있습니다
                      (N — 「아직 없는 그림을 먼저 보는 결 / 아직 없는 그림을 먼저 봅니다」)
                      ⇒ ★겹치면 짧은 이름만 두고 긴 설명의 «뒷문장» 만 씁니다 */}
                  <div style={{ fontSize: 13, color: '#2b2320', lineHeight: 1.7 }}>
                    <b style={{ fontWeight: 700, color: '#0f6e56' }}>{a.born}</b>{' '}
                    {AXIS_NAME_SHORT[a.born]}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b5a4e', lineHeight: 1.7 }}>
                    {trimEcho(a.born)}
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: '#0f6e56', margin: '0 0 18px 14px' }}>
                → 타고난 대로 쓰고 계신 자리라 힘이 덜 듭니다.
              </div>
            </>
          )}

          {compare.axes.some(a => !a.same) && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 10px' }}>
                <span style={{
                  fontSize: 11.5, color: '#993c1d', background: '#fbeee9',
                  border: '0.5px solid #f2c9b8', padding: '4px 13px', borderRadius: 20,
                }}>다른 결</span>
                <span style={{ fontSize: 11.5, color: '#8a7063' }}>
                  {compare.diffAxes.join(' · ')}
                </span>
              </div>
              {compare.axes.filter(a => !a.same).map(a => (
                <div key={a.label} style={{
                  borderLeft: '2px solid #f0997b', padding: '2px 0 2px 12px', marginBottom: 8,
                }}>
                  <div style={{ fontSize: 13, color: '#2b2320', lineHeight: 1.7 }}>
                    <b style={{ fontWeight: 700, color: '#993c1d' }}>{a.born} → {a.now}</b>
                  </div>
                  <div style={{ fontSize: 12, color: '#6b5a4e', lineHeight: 1.7 }}>
                    타고나기는 {AXIS_NAME_SHORT[a.born]}인데, 지금은 {AXIS_NAME_SHORT[a.now]}로 쓰십니다.
                  </div>
                </div>
              ))}
              <div style={{ fontSize: 12, color: '#993c1d', margin: '0 0 18px 14px' }}>
                → 두 결을 다 쓸 수 있다는 뜻입니다. 남들이 예상하지 못한 방식으로 일을 풀 수 있습니다.
              </div>
            </>
          )}
        </>
      ) : (
        /* ★MBTI 를 안 넣으신 분 — 견줄 것이 없으니 네 결을 «그냥» 풀어 드립니다 */
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
          {result.axes.map(a => (
            <div key={a.axis} style={{
              borderLeft: '2px solid #cec9f0', padding: '2px 0 2px 12px',
            }}>
              <div style={{ fontSize: 13, color: '#2b2320', lineHeight: 1.7 }}>
                <b style={{ fontWeight: 700, color: '#534ab7' }}>{a.pick}</b>{' '}
                {AXIS_NAME_SHORT[a.pick]}
              </div>
              <div style={{ fontSize: 12, color: '#6b5a4e', lineHeight: 1.7 }}>
                {trimEcho(a.pick)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ★사주에서 어떻게 나온 건가요 — 네 축 막대를 «접어» 둡니다 (44부 32차)

          ⚠️ 지우는 것이 «아닙니다». 근거를 보고 싶은 분은 열면 됩니다.
          🔴 [까닭]  막대·기울기·근거 기운이 위에 있으니 손님이 «표» 로 읽고,
             「이게 무슨 표냐」에서 멈췄습니다. 결론을 먼저 드리고 근거는 뒤로 뺍니다.
          ══════════════════════════════════════════════════════════ */}
      <details style={{ borderTop: '1px dashed rgba(120,53,15,0.14)', paddingTop: 12 }}>
        <summary style={{
          fontSize: 12, color: '#8a7063', cursor: 'pointer', listStyle: 'none',
        }}>사주에서 어떻게 나온 건가요</summary>

        <div style={{
          fontSize: 11, color: '#8a7063', background: '#faf7f3',
          borderRadius: 9, padding: '8px 10px', margin: '10px 0 14px', lineHeight: 1.6,
        }}>
          아래 막대는 <b style={{ fontWeight: 700, color: '#4a3b60' }}>사주로 본 결</b>이에요.
          기운이 기운 쪽으로 자랍니다.
        </div>

        {/* ★가운데 선이 무엇인지 한 번만 밝힙니다 — 줄마다 적으면 시끄럽습니다 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 9px',
          fontSize: 10.5, color: '#a09488',
        }}>
          <span style={{ width: 15, flexShrink: 0 }} />
          <div style={{ flex: 1, textAlign: 'center' }}>↓ 여기가 반반</div>
          <span style={{ width: 15, flexShrink: 0 }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
          {result.axes.map(a => (
            <div key={a.axis}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
                marginBottom: 5,
              }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>{AXIS_NAME[a.axis]}</span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>{leanWord(a.leftPct)}</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  fontSize: 12.5, fontWeight: 800, width: 15, textAlign: 'center', flexShrink: 0,
                  color: a.pick === a.left ? ACCENT : '#cbd5e1',
                }}>{a.left}</span>

                {/* ★가운데가 «반반» — 고른 쪽으로 자랍니다 (44부 32차)
                    ⚠️ 전에는 언제나 왼쪽에서 자라, 막대는 T 쪽인데 고른 글자는 F 인
                       «어긋나 보이는» 일이 있었습니다. 궁합 오행 그래프를 「가운데 0」으로
                       바꾼 것과 같은 결입니다 (44부 23차). */}
                <div style={{
                  flex: 1, height: 9, borderRadius: 20,
                  background: '#eef2f6', position: 'relative',
                }}>
                  {/* ★가운데 선 — «여기서부터 자란다» 는 것을 눈으로 보이게 (44부 33차)
                      🔴 [무엇이 있었나] 선 색이 #d8dee6 로 막대 바탕(#eef2f6)과 거의 같아
                         ★묻혀서 안 보였습니다. 「반반에 가까워요」인 축은 막대도 0에 가까워
                         «아무것도 없는 줄» 로 보였습니다. (대표님 사진 2026-08-03)
                      ⚠️ 막대보다 «위아래로 길게» 빼서 눈금처럼 세웁니다. */}
                  <div style={{
                    position: 'absolute', left: '50%', top: -4, bottom: -4,
                    width: 2, marginLeft: -1, background: '#9b8bc4', borderRadius: 2,
                  }} />
                  <div style={{
                    position: 'absolute', top: 0, bottom: 0,
                    ...(a.leftPct >= 50
                      ? { right: '50%', width: `${a.leftPct - 50}%` }
                      : { left: '50%', width: `${50 - a.leftPct}%` }),
                    background: ACCENT, borderRadius: 20,
                  }} />
                </div>

                <span style={{
                  fontSize: 12.5, fontWeight: 800, width: 15, textAlign: 'center', flexShrink: 0,
                  color: a.pick === a.right ? ACCENT : '#cbd5e1',
                }}>{a.right}</span>
              </div>

              <div style={{ fontSize: 10.5, color: '#8a6a52', marginTop: 5, paddingLeft: 23 }}>
                {a.pick} 쪽 — {a.why}
              </div>
            </div>
          ))}
        </div>
      </details>

      {/* ⚠️⚠️ 2026-08-03 (44부 32차) — ★옛 「타고난 결 ↔ 지금의 결」 상자를 «걷어냈습니다».
          여는말이 이미 그 말을 하고, 「같은 결 / 다른 결」이 속을 풀어 줍니다.
          그대로 두면 ★같은 말을 «세 번» 하게 됩니다.
          ⚠️ compare.headline·body 는 «남아 있습니다» — 통변 재료가 그것을 씁니다.
             화면에서만 안 그립니다. 되살리려면 대표님께 여쭈십시오. */}
      {/* ══════════════════════════════════════════════════════════
          🔴★2026-08-03 (44부 31차) — MBTI 를 안 넣으셨으면 «아무것도 그리지 않습니다».

          [무엇이 있었나]  「실제 MBTI 를 넣으시면 … [넣고 다시 보기]」 상자.
            ⚠️ 모르는 분에겐 ★막다른 길이었습니다 — 돌아가 봐야 콤보에
               「잘 모름」밖에 고를 것이 없었습니다.
          ★대신 «입력 화면» 콤보 옆에 「검사하기 ↗」를 늘 보이게 했습니다.
            거기서 검사하고 오시면 됩니다. 결과 화면에서 조르지 않습니다.
          ⚠️⚠️ 통변 «재료» 에서도 같은 권유 문장을 뺐습니다.
             화면에서만 빼면 AI 글에서 다시 튀어나옵니다.
             (44부 3-3장 — 별점을 세 곳 중 두 곳만 껐다가 새어 나간 자리)
          ⚠️ onWantInput 은 «남겨 둡니다» — 되살릴 때 필요합니다.
          ══════════════════════════════════════════════════════════ */}
    </div>
  )
}
