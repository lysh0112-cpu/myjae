// app/manseryeok/moving-timing/lib/lunarTable.ts
//
// ★2026-09-14 (9부) — 표의 «실체» 를 ★lib/saju/koreanLunarTable.ts 로 옮겼습니다.
//
//   [왜]  하락이수도 «같은 달력» 이 필요해졌기 때문입니다.
//        ⛔ 복사하지 않았습니다 — 이 파일은 ★그것을 다시 내보내기만 합니다 (8부 §6④).
//        ⇒ 이사택일 쪽 코드는 ★한 줄도 안 바뀌었습니다.
//
//   ⚠️ 새로 쓰실 때는 ★lib/saju/koreanLunarTable.ts 를 바로 부르십시오.
//      이 파일은 «옛 이름» 을 살려 두려고 남겨 둔 것입니다.
//
//   ⛔⛔ lunar-javascript(중국계)로 음력을 세지 마십시오 —
//        중국 표준시(UTC+8) 기준이라 합삭이 자정 근처면 하루 어긋납니다.
//        1900~2050 전수 대조에서 ★1,978일(3.59%)이 달랐습니다 (9부 실측).

import { solarToLunarKR, lunarRangeKR, type LunarDate as KRLunarDate } from '@/lib/saju/koreanLunarTable'

/** ⚠️ 옛 모양 그대로 — lunarYear 는 여기서 빼고 줍니다 (이사택일이 안 쓰던 값입니다) */
export interface LunarDate {
  lunarMonth: number
  lunarDay: number
  isLeapMonth: boolean
}

/** 양력 → 음력. 범위 밖이면 null. */
export function solarToLunar(y: number, m: number, d: number): LunarDate | null {
  const r: KRLunarDate | null = solarToLunarKR(y, m, d)
  if (!r) return null
  return { lunarMonth: r.lunarMonth, lunarDay: r.lunarDay, isLeapMonth: r.isLeapMonth }
}

/** 표가 다루는 양력 범위 (화면 안내용) */
export function lunarRange(): { start: Date; end: Date } {
  return lunarRangeKR()
}
