'use client'
import { useRouter } from 'next/navigation'
import { LINE_OUTER } from '@/lib/ui/line'
import { STORAGE_LINK, SAVE_STATE } from '@/lib/ui/color'

// ══════════════════════════════════════════════════════════════════
//  🔴 ★2026-09-09 — 결과 화면 맨 아래 「보관함」 자리 «한 벌»  [대표님 지시]
//    「최종결과화면에서 ★보관함 버튼을 만들면 어때」
//    「보기 흉하지 않게 버튼하되」 · 「★색상을 통일해야해」
//
//   [값으로 잰 것 — 2026-09-09]
//     보관함 단추가 «있는» 곳   사주·궁합·진로적성·사주그림·결혼 진단·출산·이름 풀이
//     ★«없는» 곳                결혼 날짜 · 이사 진단 · 이사 날짜 · 타로
//     ⇒ 이사에서 못 찾으신 것이 맞았습니다. 정말 없었습니다.
//
//   [모양을 왜 이렇게 했나]
//     저장이 ★«저절로» 되게 바뀌어서, 「저장」 단추는 늘 「✓ 저장됨」으로만 있게 됩니다.
//     ⇒ 아무 일도 안 하는 단추는 ★자리만 차지합니다. 그래서 «없앴습니다».
//     ⇒ 대신 ★담겼다는 것을 한 줄로 말해 줍니다.
//     ⇒ 「다시 담기」는 ★실패했을 때만 나옵니다.
//
//   ★색 규칙 — «가는 단추» 는 «가는 곳» 색 · «하는 단추» 는 «그 화면» 색
//     ⛔ 「○○ 보관함」 을 화면 색으로 칠하지 마십시오 —
//        누르면 색이 바뀌어 «다른 곳에 온 것처럼» 보입니다.
//
//   ⛔⛔ ★화면마다 이 줄을 «다시 만들지» 마십시오. 여기 한 곳입니다.
// ══════════════════════════════════════════════════════════════════

export default function StorageLinkRow(p: {
  /** 「이사택일 보관함」 의 앞말 */
  label: string
  /** 갈 곳 — 예: '/manseryeok/moving-timing/moving-storage' */
  href: string
  /** 담겼는가. 'saving' 이면 아무것도 안 보입니다 (아직 도는 중) */
  state: 'saving' | 'saved' | 'failed'
  /** 「다시 담기」를 눌렀을 때. 실패했을 때만 쓰입니다 */
  onRetry?: () => void
  /** 「다시 담기」 단추 색 — ★그 화면의 색을 넣으십시오 */
  accent: string
}) {
  const router = useRouter()
  const failed = p.state === 'failed'

  const goBtn = {
    flex: 1, padding: '13px 6px', borderRadius: 12,
    minHeight: 46, boxSizing: 'border-box' as const,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: STORAGE_LINK.bg, border: LINE_OUTER, color: STORAGE_LINK.ink,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
  }

  return (
    <div style={{ marginTop: 14 }}>
      {/* ⚠️ 담기는 «중» 에는 아무 말도 안 합니다 — 곧 끝나는 일에 말을 걸면 시끄럽습니다 */}
      {p.state === 'saved' && (
        <div style={{ fontSize: 12.5, color: SAVE_STATE.ok, marginBottom: 10 }}>
          ✓ 보관함에 담았어요
        </div>
      )}
      {failed && (
        <div style={{ fontSize: 12.5, color: SAVE_STATE.fail, marginBottom: 10 }}>
          ⚠ 보관함에 담지 못했어요
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        {/* ★「다시 담기」는 실패했을 때만 — «그 화면» 색입니다 */}
        {failed && p.onRetry && (
          <button onClick={p.onRetry}
            style={{
              flex: 1, padding: '13px 6px', borderRadius: 12,
              minHeight: 46, boxSizing: 'border-box',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: p.accent, border: 'none', color: '#fff',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            💾 다시 담기
          </button>
        )}

        <button onClick={() => router.push(p.href)} style={goBtn}>
          📋 {p.label}
        </button>
      </div>
    </div>
  )
}
