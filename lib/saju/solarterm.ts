// lib/saju/solarterm.ts
// ============================================================================
//  절입일(節入日) 조회 — KASI(공공데이터포털) 우선, 실패하면 계산으로 대체.
//
//  ══════════════════════════════════════════════════════════════════════
//  ★2026-07-24 고침 (26부 · 9장 3번 "절기 fallback")
//
//  [무엇이 문제였나]
//   1) catch {} 가 비어 있어 API 가 실패해도 아무 흔적이 없었다.
//      키가 없든, 네트워크가 끊겼든, XML 형식이 바뀌었든 화면은 정상으로 보였다.
//      (25부 교훈 U / 26부 교훈 AD — "조용히 실패하는 코드")
//
//   2) 실패했을 때 쓰는 fallback 이 월별 고정 숫자표였다.
//      그 표가 2023년 근처 값이라 다른 해에는 대부분 하루씩 어긋났다.
//
//        실측 (2020~2026 · 12절 × 7년 = 84개)
//          옛 고정표    37/84 = 44.0%
//          새 계산식    80/84 = 95.2%
//
//   3) 대운수(大運數)는 절입일까지 날수를 3으로 나눠 구한다.
//      하루가 틀리면 나눗셈 경계에서 대운 시작 나이가 1년 통째로 밀린다.
//
//  [어떻게 고쳤나]
//   · catch 에서 이유를 남긴다. 서버면 ai_error_logs 까지, 아니면 console.
//   · fallback 을 태양황경 계산(solartermCalc.ts)으로 바꿨다.
//   · 계산도 실패하면 그때만 옛 고정표로 간다. (최후의 보루)
//
//  [남은 일 — 연재쌤·대표님 확인 대상]
//   · 계산식이 틀리는 4건은 전부 절입 시각이 자정에 붙은 경우다.
//     KASI 실측 보정표를 넣으면 100% 가 된다.
//     업계 표준(SAZU·척척만세력 등)도 "계산 + KASI 교차검증" 방식이다.
//   · KASI 경로는 23시 이후를 다음날로 넘기는데(아래 NIGHT RULE),
//     계산 경로는 넘기지 않는다. 두 규칙을 통일할지 확인이 필요하다.
//  ══════════════════════════════════════════════════════════════════════

import { calcSolarTermDay } from './solartermCalc'

const MONTH_TERM_NAME: Record<number, string> = {
  1:'소한', 2:'입춘', 3:'경칩', 4:'청명',
  5:'입하', 6:'망종', 7:'소서', 8:'입추',
  9:'백로', 10:'한로', 11:'입동', 12:'대설',
}

/**
 * 최후의 보루 — 옛 월별 고정표.
 *   2023년 근처 값이라 다른 해에는 자주 틀린다(44%).
 *   계산까지 실패했을 때만 쓴다. 실제로는 거의 오지 않는 길이다.
 */
function getLegacyFallbackDay(monthIdx: number): number {
  const fallback: Record<number, number> = {
    1:6, 2:4, 3:6, 4:5, 5:6, 6:6,
    7:7, 8:8, 9:8, 10:8, 11:8, 12:7,
  }
  return fallback[monthIdx]
}

/** 계산 → 옛 고정표 순으로 떨어진다. */
function getFallbackDay(year: number, monthIdx: number): number {
  const calculated = calcSolarTermDay(year, monthIdx)
  if (calculated !== null) return calculated
  return getLegacyFallbackDay(monthIdx)
}

/**
 * 실패 이유를 남긴다.
 *   ⚠️ 이 파일은 서버(/api/dayun)와 클라이언트 경유(ganji.ts) 양쪽에서 쓰인다.
 *      logAiError 는 Supabase 를 부르므로 서버에서만 안전하다.
 *      그래서 서버일 때만 동적 import 하고, 아니면 console 로 남긴다.
 *      (교훈 AD — 최소한 console.error 라도 반드시 남긴다)
 */
async function reportFailure(year: number, monthIdx: number, why: string) {
  const term = MONTH_TERM_NAME[monthIdx] ?? `${monthIdx}월`
  const msg = `절기 조회 실패 → 계산값으로 대체 (${year}년 ${term}): ${why}`
  console.error('[solarterm]', msg)
  if (typeof window !== 'undefined') return   // 브라우저면 여기까지
  try {
    const { logAiError } = await import('@/lib/ai/errorLog')
    await logAiError('solarterm', null, msg)
  } catch {
    // 기록 실패가 본 기능을 막지 않는다.
  }
}

/**
 * 그 달의 절입일을 돌려준다.
 *
 * @param year     양력 연도
 * @param monthIdx 양력 월 (1~12)
 * @param apiKey   KASI 절기 API 키 (서버에서 전달). 없으면 계산으로 간다.
 */
export async function getSolarTermDay(
  year: number, monthIdx: number, apiKey: string,
): Promise<number> {
  const termName = MONTH_TERM_NAME[monthIdx]
  if (!termName) return getFallbackDay(year, monthIdx)

  // 키가 없으면 조용히 넘어가지 않고, 계산으로 간다는 것을 남긴다.
  if (!apiKey) {
    await reportFailure(year, monthIdx, 'KASI_API_KEY 가 비어 있음')
    return getFallbackDay(year, monthIdx)
  }

  try {
    const url = `https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo?solYear=${year}&solMonth=${String(monthIdx).padStart(2,'0')}&ServiceKey=${apiKey}`
    const res = await fetch(url)
    if (!res.ok) {
      await reportFailure(year, monthIdx, `HTTP ${res.status}`)
      return getFallbackDay(year, monthIdx)
    }
    const xml = await res.text()
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || []
    if (!items.length) {
      // 인증 실패·한도 초과도 200 으로 오면서 본문에 이유가 담긴다.
      await reportFailure(year, monthIdx, `item 없음 · 본문 ${xml.slice(0, 200)}`)
      return getFallbackDay(year, monthIdx)
    }
    for (const item of items) {
      const name = item.match(/<dateName>([\s\S]*?)<\/dateName>/)?.[1]?.trim()
      if (name === termName) {
        const solDay = item.match(/<solDay>([\s\S]*?)<\/solDay>/)?.[1]?.trim()
        const solHour = item.match(/<solHour>([\s\S]*?)<\/solHour>/)?.[1]?.trim()
        if (solDay) {
          // ── NIGHT RULE — 23시 이후는 다음날로 (예전부터 이렇게 해 왔다) ──
          const hour = parseInt(solHour || '0')
          const day = parseInt(solDay)
          return hour >= 23 ? day + 1 : day
        }
      }
    }
    // 절기명을 못 찾은 경우 (형식 변경 등)
    await reportFailure(year, monthIdx, `'${termName}' 을 응답에서 찾지 못함`)
  } catch (e) {
    await reportFailure(year, monthIdx, (e as Error)?.message ?? String(e))
  }
  return getFallbackDay(year, monthIdx)
}
