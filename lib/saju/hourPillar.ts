// lib/saju/hourPillar.ts
// 시주(時柱) 계산 공용 함수 — 오자둔 시두법 (groupBase 방식, 120건 검증 완료)
// useResultSaju, 궁합 등 여러 곳에서 공용으로 사용한다.

export const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
export const EARTHLY_BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

// 일간(dayStem) + 시 인덱스(hourIdx 0~11) → 시주 간지
// groupBase: 甲己일→甲子시부터 … 오자둔 시두법. (docs/사주계산_표준산식_정리.md ④ 참고)
export function calcHourPillar(dayStem: string, hourIdx: number): { stem: string; branch: string } {
  const dg = HEAVENLY_STEMS.indexOf(dayStem)
  if (dg < 0 || hourIdx < 0 || hourIdx > 11) return { stem: '?', branch: '?' }
  const groupBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
  const hourStem = HEAVENLY_STEMS[(groupBase[dg] + hourIdx) % 10]
  const hourBranch = EARTHLY_BRANCHES[hourIdx]
  return { stem: hourStem, branch: hourBranch }
}

// 시 인덱스 → 지지 글자 (시지만 필요할 때)
export function hourBranchOf(hourIdx: number): string {
  if (hourIdx < 0 || hourIdx > 11) return '?'
  return EARTHLY_BRANCHES[hourIdx]
}
