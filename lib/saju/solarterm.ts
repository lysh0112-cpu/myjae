// lib/saju/solarterm.ts
// KASI API 기반 절기일 계산 (정확한 날짜+시간)

const KASI_API_KEY = process.env.KASI_API_KEY

// 월별 절기 이름 매핑
const MONTH_TERM_NAME: Record<number, string> = {
  1: '소한', 2: '입춘', 3: '경칩', 4: '청명',
  5: '입하', 6: '망종', 7: '소서', 8: '입추',
  9: '백로', 10: '한로', 11: '입동', 12: '대설',
}

// KASI API로 절기일 가져오기
export async function getSolarTermDay(
  year: number,
  monthIdx: number
): Promise<number> {
  const termName = MONTH_TERM_NAME[monthIdx]
  if (!termName || !KASI_API_KEY) return getFallbackDay(monthIdx)

  try {
    const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo?solYear=${year}&solMonth=${String(monthIdx).padStart(2,'0')}&ServiceKey=${KASI_API_KEY}`
    const res = await fetch(url)
    const xml = await res.text()

    // XML에서 해당 절기 찾기
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || []
    for (const item of items) {
      const name = item.match(/<dateName>([\s\S]*?)<\/dateName>/)?.[1]?.trim()
      if (name === termName) {
        const solDay = item.match(/<solDay>([\s\S]*?)<\/solDay>/)?.[1]?.trim()
        const solHour = item.match(/<solHour>([\s\S]*?)<\/solHour>/)?.[1]?.trim()
        const solMin = item.match(/<solMin>([\s\S]*?)<\/solMin>/)?.[1]?.trim()
        if (solDay) {
          // 절기 시간이 23시 이후면 다음날로 처리 (자정 넘김)
          const hour = parseInt(solHour || '0')
          const day = parseInt(solDay)
          return hour >= 23 ? day + 1 : day
        }
      }
    }
  } catch {
    // API 실패 시 폴백
  }
  return getFallbackDay(monthIdx)
}

// API 실패 시 폴백값
function getFallbackDay(monthIdx: number): number {
  const fallback: Record<number, number> = {
    1:6, 2:4, 3:6, 4:5, 5:6, 6:6,
    7:7, 8:8, 9:8, 10:8, 11:8, 12:7
  }
  return fallback[monthIdx]
}
