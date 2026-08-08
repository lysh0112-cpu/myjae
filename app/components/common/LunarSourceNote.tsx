// app/components/common/LunarSourceNote.tsx
//
// ┌───────────────────────────────────────────────────────────────────────┐
// │  음력 변환이 «어디서» 나온 값인가 — 상담사에게 보이는 한 줄              │
// └───────────────────────────────────────────────────────────────────────┘
//
//  🔴🔴 ★2026-08-08 신설.
//
//  [겪은 일]  대표님 화면 — 같은 사람(류승현 · 1966 음 1/12 · 卯시)을
//    두 번 조회했는데 ★일간이 «辛 → 壬» 으로 갈렸습니다.
//    물상 탭이 辛金 장을 폈다가 壬水 장을 폈습니다. ★해설이 통째로 다릅니다.
//
//  [까닭]  ★1966년은 한국과 중국의 설날이 «하루» 다른 해입니다.
//      한국 설날 1966-01-22  /  중국 설날 1966-01-21
//      ⇒ 음력 1/12 이 한국은 ★양력 2월 2일(壬辰), 중국은 2월 1일(辛卯)
//    · 정본 KASI(한국천문연구원)      → 壬辰   ✅ 우리 역법
//    · 부본 lunar-javascript(중국)    → 辛卯   ❌
//    ⇒ KASI 가 3초를 넘거나 키가 비면 lunarConvert 가 ★조용히 부본으로 넘어갑니다.
//      그러면 «하루 밀린 원국» 으로 상담이 그대로 나갑니다.
//
//  ⚠️⚠️ /api/lunar 는 41부부터 source · fallbackReason · mismatch 를 «돌려주고»
//     있었는데 ★읽는 화면이 «하나도 없었습니다». 서버 console.warn 뿐이었습니다.
//     ⇒ 값이 틀린 것보다 ★«틀린 줄 모르는 것» 이 나쁩니다. 그래서 이 한 줄을 냅니다.
//
//  ⛔ 이 부품을 지우거나 조건을 «느슨하게» 하지 마십시오.
//  ⛔ 사본을 만들지 마십시오 — 네 탭이 «같은 입력칸» 을 쓰므로 «이 한 곳» 입니다.
//  ⚠️ 정본으로 제대로 답했을 때는 ★아무것도 안 그립니다 (평소에 안 거슬리게).

import { LINE_OUTER, LINE_WARN } from '@/lib/ui/line'

type Props = {
  /** 'KASI' | 'FALLBACK_LUNAR_JS' | null */
  source?: string | null
  /** 부본으로 넘어간 까닭 */
  reason?: string | null
  /** 정본과 부본이 어긋난 자리 */
  mismatch?: string | null
  /** 음력으로 넣었는가 — 양력 입력이면 변환 자체가 없습니다 */
  isLunar: boolean
}

export default function LunarSourceNote({ source, reason, mismatch, isLunar }: Props) {
  if (!isLunar) return null
  const fellBack = source === 'FALLBACK_LUNAR_JS'
  // ★정본이 답했고 어긋남도 없으면 «아무것도» 안 그립니다
  if (!fellBack && !mismatch) return null

  return (
    <div style={{
      background: '#fff', border: fellBack ? LINE_WARN : LINE_OUTER, borderRadius: 10,
      padding: '10px 12px', marginBottom: 8,
      fontSize: 11, color: '#4a3f38', lineHeight: 1.8,
    }}>
      <div style={{ fontWeight: 700, color: fellBack ? '#c14545' : '#96502e', marginBottom: 4 }}>
        {fellBack ? '🔴 음력 변환 — 한국천문연구원(KASI)이 답하지 않았습니다' : '⚠️ 음력 변환 — 정본과 부본이 어긋납니다'}
      </div>
      {fellBack && (
        <>
          지금 원국은 <b>부본(중국 역법)</b>으로 옮긴 값입니다.
          <br />
          <b>한국과 중국의 음력이 하루 다른 해</b>가 있습니다(1966·1997 등).
          그런 해에 태어난 분은 <b>일주가 하루 밀려</b> 일간과 장이 통째로 달라집니다.
          <br />
          ⇒ <b>다시 조회</b>해 이 줄이 사라지는지 보시고, 계속 뜨면 알려 주십시오.
        </>
      )}
      {mismatch && (
        <div style={{ marginTop: fellBack ? 5 : 0 }}>
          어긋난 자리 — {mismatch}
        </div>
      )}
      {reason && (
        <div style={{ marginTop: 4, fontSize: 10, color: '#a08d7d' }}>
          {reason}
        </div>
      )}
    </div>
  )
}
