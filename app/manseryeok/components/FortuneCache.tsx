'use client'

// ============================================================================
// 운세 담아두기 (FortuneCache)
// ----------------------------------------------------------------------------
// 화면을 오갈 때마다 DB에 다시 묻지 않도록, 한 번 읽은 운세를 브라우저에 들고 있는다.
//
//   홈 → 서비스 → 홈   : 담아둔 것을 바로 보여줌 (DB 조회 없음)
//   앱을 껐다 켜면      : 담아둔 것이 사라져 다시 DB 조회
//
// ⚠ AI 호출 횟수는 바뀌지 않는다. 원래도 하루 1회(월운은 월 1회)뿐이다.
//   여기서 줄어드는 것은 DB 조회 횟수와 화면 깜빡임이다.
//
// 날짜·월이 바뀌면?
//   담아둘 때 "어느 날짜의 것인지"를 함께 적어둔다(dayKey / monthKey).
//   다음 날에는 키가 안 맞아 담아둔 값을 쓰지 않고 새로 조회한다. 따로 지울 필요 없음.
//
// 사주를 수정하면?
//   SajuEditModal 이 DB의 오늘·이달 운세를 지운 뒤 clear() 를 부른다.
//   (지우지 않으면 옛 사주로 만든 운세가 계속 보인다)
// ============================================================================

import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react'

/** 담아두는 값 — 화면이 그대로 쓸 수 있는 형태 */
export interface CachedDaily {
  dayKey: string        // 'YYYY-MM-DD' — 어느 날짜의 운세인가
  data: unknown         // TodayFortuneCard 의 Fortune 객체
}
export interface CachedMonthly {
  monthKey: string      // 'YYYY-MM' — 어느 달의 해설인가
  data: unknown         // MonthText 객체
}

interface FortuneCacheValue {
  getDaily: (dayKey: string) => unknown | null
  setDaily: (dayKey: string, data: unknown) => void
  getMonthly: (monthKey: string) => unknown | null
  setMonthly: (monthKey: string, data: unknown) => void
  /** 사주를 고쳤을 때 — 담아둔 것을 모두 버린다 */
  clear: () => void
}

const Ctx = createContext<FortuneCacheValue | null>(null)

export function FortuneCacheProvider({ children }: { children: ReactNode }) {
  // useRef 를 쓰는 이유: 값이 바뀌어도 화면을 다시 그리지 않아야 한다.
  //   useState 로 하면 담아둘 때마다 렌더가 일어나 오히려 느려진다.
  const daily = useRef<CachedDaily | null>(null)
  const monthly = useRef<CachedMonthly | null>(null)

  const getDaily = useCallback((dayKey: string) => {
    if (!daily.current) return null
    return daily.current.dayKey === dayKey ? daily.current.data : null
  }, [])

  const setDaily = useCallback((dayKey: string, data: unknown) => {
    daily.current = { dayKey, data }
  }, [])

  const getMonthly = useCallback((monthKey: string) => {
    if (!monthly.current) return null
    return monthly.current.monthKey === monthKey ? monthly.current.data : null
  }, [])

  const setMonthly = useCallback((monthKey: string, data: unknown) => {
    monthly.current = { monthKey, data }
  }, [])

  const clear = useCallback(() => {
    daily.current = null
    monthly.current = null
  }, [])

  return (
    <Ctx.Provider value={{ getDaily, setDaily, getMonthly, setMonthly, clear }}>
      {children}
    </Ctx.Provider>
  )
}

/**
 * 담아두기 사용.
 * ⚠ Provider 바깥에서 불러도 오류가 나지 않도록 빈 껍데기를 돌려준다.
 *   (담아두기가 없으면 그냥 매번 DB를 보는 것뿐, 화면은 정상 동작한다)
 */
export function useFortuneCache(): FortuneCacheValue {
  const v = useContext(Ctx)
  if (v) return v
  return {
    getDaily: () => null,
    setDaily: () => {},
    getMonthly: () => null,
    setMonthly: () => {},
    clear: () => {},
  }
}
