// app/manseryeok/birth-timing/lib/dayunTiming.ts
//
// ★ 대운 타이밍 판정 (연재쌤 확정 — 출산택일 신규 항목)
//
//   [연재쌤 의도]
//   "아기 원국에 부족한 오행/용신 오행이, 대운에서 중요한 시기(30~60세)에
//    와주는지가 중요하다."
//   → 정지된 원국(그릇)만 보지 않고, '필요한 기운이 인생의 핵심 시기에
//     채워지는 타이밍'을 점수에 반영한다.
//
//   [확정 사양 — 2026-07 세션]
//   · 기준 오행: 용신(억부/조후) 우선.  (부족오행 아님 — 용신이 진짜 도움 되는 기운)
//   · 중요 시기: 30~60세 대운.
//   · 판정: 그 구간 대운의 천간·지지가 용신 오행이면 가점.
//
//   [원칙] 대운 계산 엔진(dayun.ts)은 수정하지 않는다. 그 결과(DayunItem[])를 받아 판정만.
//   대운 목록 계산은 절기 API(서버)가 필요하므로, 이 함수는 순수 판정만 맡고
//   대운 산출은 호출부(서버/캐시)에서 한다.

import type { DayunItem } from '@/lib/saju/dayun'

// 천간·지지 → 오행
const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

export interface DayunTimingConfig {
  minAge: number   // 중요 시기 시작 나이 (기본 30)
  maxAge: number   // 중요 시기 끝 나이 (기본 60)
  hitBoth: number  // 한 대운에서 천간+지지 모두 용신일 때 점수
  hitOne: number   // 천간 또는 지지 하나만 용신일 때 점수
  cap: number      // 이 항목 최대 점수(여러 대운 합산 상한)
}

export interface DayunTimingResult {
  score: number          // 0~cap
  hitAges: number[]      // 용신이 온 대운들의 시작 나이
  yongsinEl: string      // 기준으로 삼은 용신 오행
  note: string           // 화면 해설용 한 줄
}

// 한 대운이 중요 시기(minAge~maxAge)에 걸치는가.
//   대운은 age 부터 10년간 유효 → [age, age+10) 이 [minAge, maxAge) 와 겹치면 해당.
function inImportantWindow(age: number, min: number, max: number): boolean {
  const start = age
  const end = age + 10
  return start < max && end > min
}

/**
 * 대운 타이밍 점수.
 * @param dayunList  calcDayunList 결과 (10개, 각 age·천간·지지)
 * @param yongsinEl  아기의 용신 오행 (억부/조후). calcYongsinNew().eokbu.yongsin 등
 * @param cfg        config 값 (birthScoreConfig 에서 주입)
 */
export function scoreDayunTiming(
  dayunList: DayunItem[],
  yongsinEl: string | null | undefined,
  cfg: DayunTimingConfig,
): DayunTimingResult {
  if (!yongsinEl || dayunList.length === 0) {
    return { score: 0, hitAges: [], yongsinEl: yongsinEl ?? '', note: '' }
  }

  let score = 0
  const hitAges: number[] = []

  for (const du of dayunList) {
    if (!inImportantWindow(du.age, cfg.minAge, cfg.maxAge)) continue
    const ganEl = STEM_EL[du.cheongan]
    const jiEl = BRANCH_EL[du.jiji]
    const ganHit = ganEl === yongsinEl
    const jiHit = jiEl === yongsinEl
    if (ganHit && jiHit) { score += cfg.hitBoth; hitAges.push(du.age) }
    else if (ganHit || jiHit) { score += cfg.hitOne; hitAges.push(du.age) }
  }

  if (score > cfg.cap) score = cfg.cap

  let note = ''
  if (hitAges.length > 0) {
    const ages = hitAges.map(a => `${a}세`).join('·')
    note = `필요한 ${yongsinEl} 기운이 ${ages} 대운에 들어와 중요한 시기를 받쳐줘요`
  } else {
    note = `중요 시기(${cfg.minAge}~${cfg.maxAge}세) 대운에 ${yongsinEl} 기운이 약해요`
  }

  return { score, hitAges, yongsinEl, note }
}
