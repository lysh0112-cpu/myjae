// lib/saju/solarterm.ts
// 절기 계산 (Jean Meeus "Astronomical Algorithms" 기반)

const MONTH_TERM_LONGITUDE: Record<number, number> = {
  1: 285, 2: 315, 3: 345, 4: 15, 5: 45, 6: 75,
  7: 105, 8: 135, 9: 165, 10: 195, 11: 225, 12: 255,
}

function toJulianDay(year: number, month: number, day: number): number {
  let y = year, m = month
  if (m <= 2) { y--; m += 12 }
  const A = Math.floor(y / 100)
  const B = 2 - A + Math.floor(A / 4)
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5
}

function getSolarLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0
  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T
  L0 = L0 % 360
  if (L0 < 0) L0 += 360
  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T
  M = (M % 360) * Math.PI / 180
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
    + 0.000289 * Math.sin(3 * M)
  let sunLon = L0 + C
  const omega = 125.04 - 1934.136 * T
  sunLon = sunLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180)
  sunLon = sunLon % 360
  if (sunLon < 0) sunLon += 360
  return sunLon
}

function findSolarTermDate(year: number, targetLon: number): Date {
  const approxMonth = Math.floor(targetLon / 30) + 3
  const startJD = toJulianDay(year, ((approxMonth - 1) % 12) + 1, 1)
  let lo = startJD - 20
  let hi = startJD + 20
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2
    let midLon = getSolarLongitude(mid)
    if (targetLon < 30 && midLon > 330) midLon -= 360
    if (targetLon > 330 && midLon < 30) midLon += 360
    if (midLon < targetLon) lo = mid
    else hi = mid
    if (hi - lo < 0.0001) break
  }
  const jd = (lo + hi) / 2
  const ms = (jd - 2440587.5) * 86400000 + 9 * 3600000
  return new Date(ms)
}

export function getSolarTermDay(year: number, monthIdx: number): number {
  const targetLon = MONTH_TERM_LONGITUDE[monthIdx]
  try {
    const date = findSolarTermDate(year, targetLon)
    return date.getDate()
  } catch {
    const fallback: Record<number, number> = {
      1:6, 2:4, 3:6, 4:5, 5:6, 6:6,
      7:7, 8:8, 9:8, 10:8, 11:8, 12:7
    }
    return fallback[monthIdx]
  }
}
