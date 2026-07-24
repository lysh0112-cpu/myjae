// app/manseryeok/moving-timing/lib/lunarTable.ts
//
// ★ 한국 음력 대조표 (1900-01-01 ~ 2050-12-14) — 오프라인, API 호출 0회
//
//   ══════════════════════════════════════════════════════════
//   [왜 만들었나]
//   손 없는 날 판정에 음력이 필요한데, /api/lunar 는 하루씩만 조회한다.
//   1년치를 보려면 365회를 부르게 되고, 고객이 늘면 공공데이터포털
//   트래픽 한도에 걸린다. 결혼택일이 실제로 그 구조였고 걷어냈다.
//
//   [원리 — 왜 이렇게 작은가]
//   음력 달은 반드시 29일 아니면 30일이다. 그래서 달마다 비트 하나면 된다.
//   1,868개 달 = 1,867비트 = 234바이트(base64 로 312자).
//   달 경계(음력 1일)만 알면 그 사이는 1,2,3… 으로 세면 되므로
//   중간 날짜를 저장할 필요가 없다.
//
//   [데이터 출처]
//   한국천문연구원(KASI) 음양력 정보를 담은 오픈소스 두 종에서 추출했다.
//     · korean-lunar-calendar (npm)
//     · kor-lunar (npm)
//   두 라이브러리는 서로 독립적으로 만들어졌다.
//
//   [검증] 2026-07-24
//   · 두 라이브러리 상호 대조 1900~2050 전수 55,152일 → 불일치 0건
//   · KASI API 실측 대조 3건 → 전부 일치
//       2027-02-07 = 음력 1/1 (설날)
//       2027-09-15 = 음력 8/15 (추석)
//       2027-12-31 = 음력 12/4
//   · 이 파일에서 복원한 값 vs korean-lunar-calendar
//       1901~2049 전수 54,422일 → 불일치 0건
//   · 경계 간격이 29 또는 30 이외인 경우 → 0건
//
//   ⚠️ 중국계 라이브러리(lunar-javascript)는 쓰면 안 된다.
//      중국 표준시(UTC+8) 기준이라 합삭이 자정 근처면 하루 어긋난다.
//      실제로 2027 설날을 음력 1월 2일로 계산했다.
//
//   ⚠️ 범위 밖(1900년 이전, 2050-12-14 이후)은 null 을 돌려준다.
//      호출부는 null 이면 손 판정을 건너뛰고 화면에 안내해야 한다.
//   ══════════════════════════════════════════════════════════

/** 첫 경계 — 1900-01-01 은 음력 12월 1일 */
const FIRST_SOLAR = 19000101
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
  lunarMonth: number
  lunarDay: number
  isLeapMonth: boolean
}

interface Boundary { solarMs: number; lunarMonth: number; isLeap: boolean }

let cache: Boundary[] | null = null

/** 비트열을 풀어 경계 표를 만든다. 최초 1회만 돈다. */
function table(): Boundary[] {
  if (cache) return cache

  // base64 → 바이트. 이 파일은 브라우저에서 도는 코드라 atob 로 충분하다.
  //   (서버에서 부를 일이 생기면 Node 18+ 도 globalThis.atob 를 갖고 있다)
  const bin = atob(SIZE_BITS)
  const byteAt = (i: number) => bin.charCodeAt(i)

  const out: Boundary[] = []
  const y = Math.floor(FIRST_SOLAR / 10000)
  const m = Math.floor(FIRST_SOLAR / 100) % 100
  const d = FIRST_SOLAR % 100
  let ms = Date.UTC(y, m - 1, d)
  let lm = FIRST_LUNAR_MONTH

  for (let i = 0; i < COUNT; i++) {
    out.push({ solarMs: ms, lunarMonth: lm, isLeap: LEAP_INDEXES.has(i) })
    if (i < COUNT - 1) {
      const bit = (byteAt(i >> 3) >> (7 - (i & 7))) & 1
      ms += (bit ? 30 : 29) * 86400000
      // 다음 경계가 윤달이면 달 번호를 올리지 않는다 (윤N월은 N월 뒤에 붙는다)
      if (!LEAP_INDEXES.has(i + 1)) lm = lm % 12 + 1
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
export function solarToLunar(y: number, m: number, d: number): LunarDate | null {
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
  if (day < 1 || day > 30) return null

  return {
    lunarMonth: t[idx].lunarMonth,
    lunarDay: day,
    isLeapMonth: t[idx].isLeap,
  }
}

/** 표가 다루는 양력 범위 (화면 안내용) */
export function lunarRange(): { start: Date; end: Date } {
  const t = table()
  return { start: new Date(t[0].solarMs), end: new Date(t[t.length - 1].solarMs) }
}
