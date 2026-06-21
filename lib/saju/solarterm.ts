// lib/saju/solarterm.ts
const MONTH_TERM_NAME: Record<number, string> = {
  1:'소한', 2:'입춘', 3:'경칩', 4:'청명',
  5:'입하', 6:'망종', 7:'소서', 8:'입추',
  9:'백로', 10:'한로', 11:'입동', 12:'대설',
}

function getFallbackDay(monthIdx: number): number {
  const fallback: Record<number, number> = {
    1:6, 2:4, 3:6, 4:5, 5:6, 6:6,
    7:7, 8:8, 9:8, 10:8, 11:8, 12:7
  }
  return fallback[monthIdx]
}

// ✅ apiKey를 파라미터로 받아서 처리
export async function getSolarTermDay(
  year: number, monthIdx: number, apiKey: string
): Promise<number> {
  const termName = MONTH_TERM_NAME[monthIdx]
  if (!termName || !apiKey) return getFallbackDay(monthIdx)
  try {
    const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo?solYear=${year}&solMonth=${String(monthIdx).padStart(2,'0')}&ServiceKey=${apiKey}`
    const res = await fetch(url)
    const xml = await res.text()
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || []
    for (const item of items) {
      const name = item.match(/<dateName>([\s\S]*?)<\/dateName>/)?.[1]?.trim()
      if (name === termName) {
        const solDay = item.match(/<solDay>([\s\S]*?)<\/solDay>/)?.[1]?.trim()
        const solHour = item.match(/<solHour>([\s\S]*?)<\/solHour>/)?.[1]?.trim()
        if (solDay) {
          const hour = parseInt(solHour || '0')
          const day = parseInt(solDay)
          return hour >= 23 ? day + 1 : day
        }
      }
    }
  } catch {}
  return getFallbackDay(monthIdx)
}
