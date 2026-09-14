// lib/saju/koreanLunarTable.ts
//
// ★ 한국 음력 대조표 (1900-01-01 ~ 2051-01-11) — 오프라인 · ★바깥 호출 0회
//
//   ══════════════════════════════════════════════════════════════════
//   [어디서 왔나]  2026-09-14 (9부)
//     app/manseryeok/moving-timing/lib/lunarTable.ts (2026-07-24 · 이사택일)
//     의 ★«실체» 를 이 자리로 옮긴 것입니다.
//     ⛔ 복사가 «아닙니다» — 옛 자리는 ★여기를 다시 내보내기만 합니다 (8부 §6④).
//
//   [왜 옮겼나]  하락이수도 ★같은 달력이 필요해졌습니다.
//     8부는 하락이수에 ★부본(lunar-javascript)을 썼는데, 그것이
//     ★중국 표준시(UTC+8) 기준이라 합삭이 자정 근처면 하루 어긋납니다.
//     ⇒ 1900~2050 전수 대조 — ★1,978일(3.59%)이 이 표와 달랐습니다.
//     ⇒ 하락이수는 그 하루로 ★괘가 통째로 바뀝니다 (선천·후천이 맞바뀜).
//
//   ┌────────────────────────────────────────────────────────────────┐
//   │ ⛔⛔ ★lunar-javascript 로 음력을 세지 마십시오.                  │
//   │    2026-07-24 에 이미 이 파일 머리말에 적혀 있던 경고입니다.     │
//   │    8부가 그것을 못 보고 그대로 밟았습니다.                       │
//   └────────────────────────────────────────────────────────────────┘
//
//   [원리 — 왜 이렇게 작은가]
//   음력 달은 반드시 29일 아니면 30일이다. 그래서 달마다 비트 하나면 된다.
//   1,868개 달 = 1,867비트 = 234바이트(base64 로 312자).
//   달 경계(음력 1일)만 알면 그 사이는 1,2,3… 으로 세면 되므로
//   중간 날짜를 저장할 필요가 없다.
//
//   [데이터 출처]  한국천문연구원(KASI) 음양력 정보를 담은 오픈소스 두 종.
//     · korean-lunar-calendar (npm)   · kor-lunar (npm)
//     두 라이브러리는 서로 독립적으로 만들어졌다.
//
//   [검증] 2026-07-24
//   · 두 라이브러리 상호 대조 1900~2050 전수 55,152일 → 불일치 0건
//   · KASI API 실측 대조 3건 → 전부 일치
//   · 이 파일에서 복원한 값 vs korean-lunar-calendar 54,422일 → 불일치 0건
//   [검증] 2026-09-14 (9부) — ★웹 달력 대조 8건 전부 일치
//   · 양 2026-10-10 = 음 8.30   · 양 2026-10-11 = 음 9.1
//   · 양 2027-02-06 = 음 12.30(섣달그믐)  · 양 2027-02-07 = 음 1.1(설날)
//   · 양 2027-03-08 = 음 2.1    · 양 2026-09-11 = 음 8.1
//
//   ⚠️ 범위 밖은 ★null 을 돌려줍니다 — ⛔ «조용히 틀린 값» 을 내지 않습니다.
//      호출부는 null 이면 ★멈추고 사실대로 말해야 합니다.
//   ══════════════════════════════════════════════════════════════════

/** 첫 경계 — 1900-01-01 은 ★음력 «1899년» 12월 1일 */
const FIRST_SOLAR = 19000101
const FIRST_LUNAR_YEAR = 1899
const FIRST_LUNAR_MONTH = 12
const COUNT = 1868

/** 달 크기 비트열. 1 = 30일(대월), 0 = 29일(소월). base64 */
const SIZE_BITS =
  'pbUrqV1Juk2yrVVWqa1K6ldSbpN0l2U2qq1S2pXUraTdJdktqmtS1qVtK2k3SXZLcldStqVtStpV0l2S3JXUraVbSraVbJdktyV1K6lbSrVVaqbZLcldSupW0q1VWqq1S2pXUrqTtJtlWqqtU1qV1K6k7SbpLqptU1qltStpN0m6S7JbUralrUraVtJukuyW1K6lbUrWlbSbpLsluSupW0q1VWyq2S7JbkrqVtKulWqqtUuqW1K6ldStpVqqtVVqltSupXUnaTbJrVVapbUrqV1Juk3SXVLapbVLalbSbpL0l2S2pW1K2pWg'

/** 윤달인 경계의 인덱스 */
const LEAP_INDEXES = new Set([
  9, 43, 79, 114, 143, 179, 213, 243, 278, 314, 349, 378,
  414, 449, 478, 514, 549, 584, 614, 649, 684, 714, 749, 784,
  820, 849, 884, 920, 949, 984, 1019, 1050, 1083, 1119, 1154, 1184,
  1218, 1254, 1289, 1319, 1354, 1389, 1420, 1453, 1489, 1524, 1553, 1589,
  1624, 1657, 1689, 1725, 1759, 1789, 1824, 1859,
])

export interface LunarDate {
  /** ★2026-09-14 (9부) 에 더했습니다 — 음력 «해». 없으면 음력→양력을 못 합니다 */
  lunarYear: number
  lunarMonth: number
  lunarDay: number
  isLeapMonth: boolean
}

export interface SolarDate { year: number; month: number; day: number }

interface Boundary {
  solarMs: number
  lunarYear: number
  lunarMonth: number
  isLeap: boolean
  /** 이 달이 며칠짜리인가 — ★29 또는 30 */
  size: 29 | 30
}

let cache: Boundary[] | null = null

/** 비트열을 풀어 경계 표를 만든다. 최초 1회만 돈다. */
function table(): Boundary[] {
  if (cache) return cache

  // base64 → 바이트. 브라우저의 atob, Node 18+ 의 globalThis.atob 둘 다 있다.
  const bin = atob(SIZE_BITS)
  const byteAt = (i: number) => bin.charCodeAt(i)

  const out: Boundary[] = []
  const y = Math.floor(FIRST_SOLAR / 10000)
  const m = Math.floor(FIRST_SOLAR / 100) % 100
  const d = FIRST_SOLAR % 100
  let ms = Date.UTC(y, m - 1, d)
  let lm = FIRST_LUNAR_MONTH
  let ly = FIRST_LUNAR_YEAR

  for (let i = 0; i < COUNT; i++) {
    //  ⚠️ 마지막 경계는 «다음 경계» 가 없어 크기를 모릅니다 — 29로 두고,
    //     solarToLunar 가 그 달을 범위 밖으로 봅니다.
    const bit = i < COUNT - 1 ? ((byteAt(i >> 3) >> (7 - (i & 7))) & 1) : 0
    out.push({
      solarMs: ms,
      lunarYear: ly,
      lunarMonth: lm,
      isLeap: LEAP_INDEXES.has(i),
      size: bit ? 30 : 29,
    })
    if (i < COUNT - 1) {
      ms += (bit ? 30 : 29) * 86400000
      // 다음 경계가 윤달이면 달 번호를 올리지 않는다 (윤N월은 N월 뒤에 붙는다)
      if (!LEAP_INDEXES.has(i + 1)) {
        const next = lm % 12 + 1
        //  ★음력 12월 다음이 1월이면 «해» 가 바뀝니다
        if (next === 1) ly++
        lm = next
      }
    }
  }
  cache = out
  return out
}

/**
 * 양력 → 음력. 범위 밖이면 null.
 *
 * 이진 탐색으로 그 날이 속한 달 경계를 찾고, 경계로부터 며칠째인지 센다.
 * 달 크기를 추측하지 않으므로 소월·대월·윤달 모두 정확하다.
 */
export function solarToLunarKR(y: number, m: number, d: number): LunarDate | null {
  const t = table()
  const ms = Date.UTC(y, m - 1, d)
  if (ms < t[0].solarMs) return null

  let lo = 0, hi = t.length - 1, idx = -1
  while (lo <= hi) {
    const mid = (lo + hi) >> 1
    if (t[mid].solarMs <= ms) { idx = mid; lo = mid + 1 } else { hi = mid - 1 }
  }
  if (idx < 0) return null

  const day = Math.round((ms - t[idx].solarMs) / 86400000) + 1
  // 마지막 경계 뒤로는 달 크기를 모른다 — 범위 밖으로 본다
  if (idx === t.length - 1 && day > 29) return null
  if (day < 1 || day > t[idx].size) return null

  return {
    lunarYear: t[idx].lunarYear,
    lunarMonth: t[idx].lunarMonth,
    lunarDay: day,
    isLeapMonth: t[idx].isLeap,
  }
}

/** 경계 하나를 찾습니다 — 없으면 -1 */
function findBoundary(ly: number, lm: number, isLeap: boolean): number {
  const t = table()
  for (let i = 0; i < t.length; i++) {
    if (t[i].lunarYear === ly && t[i].lunarMonth === lm && t[i].isLeap === isLeap) return i
  }
  return -1
}

/**
 * ★음력 → 양력. 범위 밖이거나 «없는 날» 이면 null.
 *   2026-09-14 (9부) 에 더했습니다.
 *
 * ⛔ 「그 달에 30일이 있느냐」 를 ★여기서 가려 줍니다 —
 *    작은달(29일)에 30일을 물으면 ★null 입니다. «지어내지» 않습니다.
 */
export function lunarToSolarKR(
  ly: number, lm: number, ld: number, isLeap = false,
): SolarDate | null {
  if (lm < 1 || lm > 12 || ld < 1 || ld > 30) return null
  const t = table()
  const idx = findBoundary(ly, lm, isLeap)
  if (idx < 0) return null
  //  ⚠️ ★마지막 경계는 «다음 경계» 가 없어 달 크기를 모릅니다.
  //     다만 음력 달은 ★반드시 29일 이상이므로 1~29일까지는 확실합니다.
  //     ⛔ 30일은 ★있는지 모르므로 «지어내지» 않습니다.
  if (idx === t.length - 1) {
    if (ld > 29) return null
  } else if (ld > t[idx].size) return null

  const ms = t[idx].solarMs + (ld - 1) * 86400000
  const dt = new Date(ms)
  return { year: dt.getUTCFullYear(), month: dt.getUTCMonth() + 1, day: dt.getUTCDate() }
}

/**
 * ★그 음력 달의 «마지막 날» — 29 또는 30. 범위 밖이면 null.
 *
 * 🔴 비트 하나가 그대로 답입니다. ⛔ 날짜를 옮겼다 되돌리는 셈이 «필요 없습니다».
 */
export function lunarMonthSizeKR(ly: number, lm: number, isLeap = false): 29 | 30 | null {
  const t = table()
  const idx = findBoundary(ly, lm, isLeap)
  if (idx < 0 || idx === t.length - 1) return null
  return t[idx].size
}

/** 표가 다루는 양력 범위 (화면 안내용) */
export function lunarRangeKR(): { start: Date; end: Date } {
  const t = table()
  const last = t[t.length - 1]
  return { start: new Date(t[0].solarMs), end: new Date(last.solarMs) }
}
