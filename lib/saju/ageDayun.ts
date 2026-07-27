// lib/saju/ageDayun.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  나이 · 지금 지나는 대운 — 한 군데로 모은 곳                       │
// └───────────────────────────────────────────────────────────────┘
//
// ★왜 모았나 (2026-07-27)
//   나이 계산이 아홉 군데에 흩어져 두 벌로 갈려 있었다.
//     연 나이 (currentYear − birthYear)          8곳 — 사주보기·궁합·출산택일…
//     세는나이 (currentYear − birthYear + 1)     1곳 — 진로적성 calcPerson.ageOf
//   같은 사람이 화면마다 나이가 달라 보였다.
//
// ★그런데 둘 다 대운과 안 맞는다
//   dayun.ts 의 대운수는 "절입일까지의 날수 ÷ 3" 이다.
//   3일을 1년으로 치는 계산이라 대운수 3 은 "태어난 지 만 3년 뒤" 를 뜻한다.
//   즉 DayunItem.age 는 처음부터 **만 나이**다.
//   연 나이로 비교하면 생일이 안 지난 사람은 한 살이 앞서, 대운 경계
//   언저리에서 지금 지나는 대운 칸이 통째로 어긋난다.
//
//   → 생년월일을 이미 받고 있으므로 정확히 센다. 그것이 대운과 같은 잣대다.

/** 만 나이 — 태어난 뒤 흐른 햇수. ★대운수와 같은 잣대다. */
export function exactAge(
  birthYear: number,
  birthMonth: number,
  birthDay: number,
  at: Date = new Date(),
): number {
  if (!birthYear || !birthMonth || !birthDay) return 0
  let age = at.getFullYear() - birthYear
  const m = at.getMonth() + 1
  const d = at.getDate()
  if (m < birthMonth || (m === birthMonth && d < birthDay)) age -= 1
  return Math.max(0, age)
}

/** 연 나이 — 생일을 안 보고 해만 뺀다. 병역·청소년보호법이 쓰는 셈법. */
export function yearAge(birthYear: number, at: Date = new Date()): number {
  return Math.max(0, at.getFullYear() - birthYear)
}

/** 세는나이 — 태어나면 1살, 해가 바뀌면 +1. */
export function koreanAge(birthYear: number, at: Date = new Date()): number {
  return Math.max(1, at.getFullYear() - birthYear + 1)
}

/** 대운 한 칸 (dayun.ts 의 DayunItem 과 같은 모양. 서로 물리지 않게 여기서 좁게 적는다) */
export interface DayunLike {
  age: number
  cheongan: string
  jiji: string
  ganYukchin: string
  jiYukchin: string
}

/**
 * 지금 지나고 있는 대운 한 칸.
 * ★조건은 DayunTableNew 가 쓰던 것과 같다 — d.age ≤ 나이 < d.age + 10
 *   첫 대운 전(대운수 이전)이면 null. 마지막 대운을 지나면 마지막 칸을 준다.
 */
export function pickCurrentDayun(list: DayunLike[], age: number): DayunLike | null {
  if (!list?.length) return null
  const hit = list.find(d => d.age <= age && age < d.age + 10)
  if (hit) return hit
  const last = list[list.length - 1]
  if (age >= last.age) return last
  return null                       // 아직 첫 대운에 들지 않았다
}

/** 몇 번째 대운인가 (1대운·2대운… — 교재 230쪽 "1, 2대운" 특칙에 쓴다) */
export function dayunOrder(list: DayunLike[], age: number): number | null {
  const cur = pickCurrentDayun(list, age)
  if (!cur) return null
  const i = list.indexOf(cur)
  return i < 0 ? null : i + 1
}
