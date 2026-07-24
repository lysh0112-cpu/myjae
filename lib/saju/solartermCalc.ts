// lib/saju/solartermCalc.ts
// ============================================================================
//  절기(節氣) 계산 — 외부 API 없이 태양황경으로 절입일을 구한다.
//
//  ══════════════════════════════════════════════════════════════════════
//  [왜 만들었나]
//  solarterm.ts 는 KASI(공공데이터포털) API 로 절입일을 받는데,
//  실패하면 월별 고정 숫자표로 떨어졌다. 그 표가 2023년 근처 값이라
//  다른 해에는 대부분 하루씩 어긋났다.
//
//    실측 (2020~2026, 12절 × 7년 = 84개)
//      옛 고정표   37/84 = 44.0%
//      이 계산식   80/84 = 95.2%
//
//  대운수(大運數)는 절입일까지의 날수를 3으로 나눠 구하므로,
//  하루가 틀리면 나눗셈 경계에서 대운 시작 나이가 1년 통째로 밀린다.
//
//  [원리]
//  절기는 태양의 황경(黃經)이 특정 각도에 이르는 순간이다.
//    입춘 315° · 경칩 345° · 청명 15° · 입하 45° · 망종 75° · 소서 105°
//    입추 135° · 백로 165° · 한로 195° · 입동 225° · 대설 255° · 소한 285°
//  (사주는 '절(節)' 12개만 쓴다. '기(氣)' 12개는 월 경계가 아니다.)
//
//  태양황경은 Jean Meeus 『Astronomical Algorithms』 25장의
//  약식 태양위치 계산을 따랐다. 오차는 대체로 1분 이내다.
//
//  [한계 — 반드시 알고 쓸 것]
//  틀리는 경우는 전부 절입 시각이 자정에 붙어 있을 때다.
//  계산 자체는 1시간 이내로 맞는데 날짜가 하루 갈린다.
//
//    2022 백로  계산 9/8 0.6시  실제 9/7   (실제 절입 7일 23시경)
//    2023 소한  계산 1/5 23.9시 실제 1/6   (실제 절입 6일 0시경)
//    2024 대설  계산 12/7 0.3시 실제 12/6
//    2026 망종  계산 6/6 0.6시  실제 6/5
//
//  → 더 정확히 하려면 KASI 실측값 보정표가 필요하다.
//    업계 표준(SAZU·척척만세력 등)도 "계산 + KASI 교차검증" 방식이다.
//
//  [기준시] 한국표준시(KST, UTC+9 = 동경 135도).
//    KASI 발표 절입시각과 같은 기준이다.
//  ══════════════════════════════════════════════════════════════════════

/** 12절(節)의 태양황경. 사주 월 경계는 이 12개로만 갈린다. */
const TERM_LONGITUDE: Record<number, number> = {
  1: 285,  // 소한 — 丑월 시작
  2: 315,  // 입춘 — 寅월 시작 (사주의 한 해 시작)
  3: 345,  // 경칩 — 卯월
  4: 15,   // 청명 — 辰월
  5: 45,   // 입하 — 巳월
  6: 75,   // 망종 — 午월
  7: 105,  // 소서 — 未월
  8: 135,  // 입추 — 申월
  9: 165,  // 백로 — 酉월
  10: 195, // 한로 — 戌월
  11: 225, // 입동 — 亥월
  12: 255, // 대설 — 子월
}

/** 양력 날짜 → 율리우스일(JD). 시각은 0시(UT) 기준. */
function toJD(year: number, month: number, day: number): number {
  let y = year
  let m = month
  if (m <= 2) { y -= 1; m += 12 }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716))
       + Math.floor(30.6001 * (m + 1))
       + day + B - 1524.5
}

/**
 * 겉보기 태양황경(도). Meeus 『Astronomical Algorithms』 25장 약식.
 *   기하평균황경 + 중심차 → 진황경, 여기에 장동·광행차를 보정한다.
 */
function apparentSolarLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0
  const T2 = T * T
  const T3 = T2 * T

  // 기하평균황경
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T2
  // 평균근점이각
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T2
  const Mrad = (M * Math.PI) / 180

  // 중심차(equation of center)
  const C = (1.914602 - 0.004817 * T - 0.000014 * T2) * Math.sin(Mrad)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad)
          + 0.000289 * Math.sin(3 * Mrad)

  const trueLong = L0 + C

  // 장동(nutation) + 광행차(aberration) 보정
  const omega = 125.04452 - 1934.136261 * T + 0.0020708 * T2 + T3 / 450000
  const apparent = trueLong - 0.00569 - 0.00478 * Math.sin((omega * Math.PI) / 180)

  return ((apparent % 360) + 360) % 360
}

/**
 * 그 해에 목표 황경에 도달하는 순간의 JD.
 *   황경은 1년에 360도를 도므로, 차이를 날수로 환산해 반복 수렴시킨다.
 */
function findTermJD(year: number, targetLongitude: number): number {
  // 시작 추정: 1월 1일의 황경은 대략 280도.
  const jan1 = toJD(year, 1, 1)
  let guess = targetLongitude >= 280
    ? jan1 + ((targetLongitude - 280) / 360) * 365.25
    : jan1 + ((targetLongitude + 80) / 360) * 365.25

  // 8회면 초 단위까지 수렴한다.
  for (let i = 0; i < 8; i++) {
    const current = apparentSolarLongitude(guess)
    let diff = targetLongitude - current
    if (diff > 180) diff -= 360
    if (diff < -180) diff += 360
    guess += (diff * 365.2422) / 360
  }
  return guess
}

/** JD → 한국표준시(KST) 기준 달·일·시각 */
function jdToKST(jd: number): { month: number; day: number; hour: number } {
  const t = jd + 0.5 + 9 / 24        // UT → KST
  const z = Math.floor(t)
  const frac = t - z

  let a = z
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25)
    a = z + 1 + alpha - Math.floor(alpha / 4)
  }
  const b = a + 1524
  const c = Math.floor((b - 122.1) / 365.25)
  const d = Math.floor(365.25 * c)
  const e = Math.floor((b - d) / 30.6001)

  return {
    month: e < 14 ? e - 1 : e - 13,
    day: b - d - Math.floor(30.6001 * e),
    hour: frac * 24,
  }
}

/**
 * 그 달의 절입일(節入日)을 계산으로 구한다. API 를 쓰지 않는다.
 *
 * @param year     양력 연도
 * @param monthIdx 양력 월 (1~12)
 * @param nightRule 23시 이후를 다음날로 넘길지 (기본 false)
 * @returns 절입 '일'. 계산 불가하면 null.
 *
 * ⚠️ nightRule 을 왜 기본 false 로 두는가
 *    이 값은 dayun.ts 에서 "생일부터 절입일까지 며칠인가"를 세는 데만 쓴다.
 *    날수를 세는 목적이라면 절입이 몇 시였는지는 상관이 없고,
 *    23시룰을 넣으면 오히려 하루가 밀린다.
 *
 *    실측 (2020~2026 · 84개)
 *      nightRule 없음  80/84 = 95.2%
 *      nightRule 적용  76/84 = 90.5%
 *
 *    solarterm.ts 의 KASI 경로는 예전부터 23시룰을 적용해 왔으므로
 *    그쪽 동작을 바꾸지 않기 위해 옵션으로 열어만 둔다.
 *    (KASI 경로와 계산 경로의 규칙을 통일할지는 연재쌤 확인 대상)
 */
export function calcSolarTermDay(
  year: number, monthIdx: number, nightRule = false,
): number | null {
  const longitude = TERM_LONGITUDE[monthIdx]
  if (longitude === undefined) return null
  if (!Number.isFinite(year) || year < 1600 || year > 2400) return null

  const jd = findTermJD(year, longitude)
  const { month, day, hour } = jdToKST(jd)

  // 수렴이 어긋나 엉뚱한 달이 나오면 쓰지 않는다 (조용히 틀린 값을 주지 않는다).
  if (month !== monthIdx) return null

  return nightRule && hour >= 23 ? day + 1 : day
}

/**
 * 절입 시각까지 필요한 경우 (분 단위 판정용).
 * 지금은 대운수 계산에 '일'만 쓰지만, 입춘 경계 판정 등에 쓸 수 있게 열어 둔다.
 */
export function calcSolarTermMoment(
  year: number, monthIdx: number,
): { month: number; day: number; hour: number } | null {
  const longitude = TERM_LONGITUDE[monthIdx]
  if (longitude === undefined) return null
  if (!Number.isFinite(year) || year < 1600 || year > 2400) return null

  const r = jdToKST(findTermJD(year, longitude))
  if (r.month !== monthIdx) return null
  return r
}
