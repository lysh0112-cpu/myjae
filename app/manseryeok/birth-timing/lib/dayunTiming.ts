// app/manseryeok/birth-timing/lib/dayunTiming.ts
//
// ★ 대운 타이밍 판정 (연재쌤 확정 — 출산택일)
//
//   [연재쌤 의도]
//   "원국에 부족한 오행·용신이 대운에서 중요한 시기(20~60세)에 와주는지가 중요하다."
//   "용신이나 필요한 오행이 20·30·40·50대 근처에서 '지지'로 받쳐줄 수 있는 것을 찾아달라."
//   → 정지된 원국(그릇)만 보지 않고, 필요한 기운이 인생 핵심기에 채워지는 타이밍을 본다.
//
//   [확정 사양 — 2026-07-23]
//   · 기준 오행: 용신. (여름·겨울생=조후용신 / 봄·가을생=억부용신 — 호출부에서 결정)
//   · 중요 시기: 20~60세 대운. (2026-07-23 확대: 30 → 20)
//   · ★천간과 지지의 영향력이 다르다★  10점 만점 기준
//       - 지지(地支)가 받쳐주면 6.5  ← 뿌리라서 영향력이 크다
//       - 천간(天干)만 있으면  3.5  ← 떠 있는 기운
//       - 둘 다면 10 (6.5 + 3.5)
//
//   [원칙] 대운 계산 엔진(dayun.ts)은 수정하지 않는다. 그 결과(DayunItem[])를 받아 판정만.
//   대운 산출은 절기 API(서버)가 필요하므로, 이 함수는 순수 판정만 맡는다.

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
  minAge: number    // 중요 시기 시작 나이 (기본 30)
  maxAge: number    // 중요 시기 끝 나이 (기본 60)
  jiWeight: number  // 지지가 용신일 때 점수 (기본 6.5) ★영향력 큼
  ganWeight: number // 천간이 용신일 때 점수 (기본 3.5)
  cap: number       // 이 항목 최대 점수(여러 대운 합산 상한)
}

export interface DayunHit {
  age: number
  gan: boolean      // 천간이 용신인가
  ji: boolean       // 지지가 용신인가  ★이게 핵심
  score: number
}

export interface DayunTimingResult {
  score: number           // 0~cap
  hits: DayunHit[]        // 용신이 온 대운들 (상세)
  hitAges: number[]       // 용신이 온 대운 나이 (하위호환)
  jiHitAges: number[]     // ★지지로 받쳐준 대운 나이 (연재쌤이 중시)
  yongsinEl: string
  note: string            // 화면 해설용 한 줄
}

// 한 대운이 중요 시기(minAge~maxAge)에 걸치는가.
//   대운은 age 부터 10년간 유효 → [age, age+10) 이 [minAge, maxAge) 와 겹치면 해당.
function inImportantWindow(age: number, min: number, max: number): boolean {
  return age < max && age + 10 > min
}

/**
 * 대운 타이밍 점수.
 * @param dayunList  calcDayunList 결과 (10개, 각 age·천간·지지)
 * @param yongsinEl  아기의 용신 오행 (여름겨울=조후 / 봄가을=억부)
 * @param cfg        config 값 (birthScoreConfig 에서 주입)
 */
export function scoreDayunTiming(
  dayunList: DayunItem[],
  yongsinEl: string | null | undefined,
  cfg: DayunTimingConfig,
): DayunTimingResult {
  if (!yongsinEl || dayunList.length === 0) {
    return { score: 0, hits: [], hitAges: [], jiHitAges: [], yongsinEl: yongsinEl ?? '', note: '' }
  }

  let score = 0
  const hits: DayunHit[] = []

  for (const du of dayunList) {
    if (!inImportantWindow(du.age, cfg.minAge, cfg.maxAge)) continue
    const ganHit = STEM_EL[du.cheongan] === yongsinEl
    const jiHit = BRANCH_EL[du.jiji] === yongsinEl
    if (!ganHit && !jiHit) continue

    // ★지지 6.5 : 천간 3.5 — 지지가 뿌리라 영향력이 크다 (연재쌤 확정)
    const s = (jiHit ? cfg.jiWeight : 0) + (ganHit ? cfg.ganWeight : 0)
    score += s
    hits.push({ age: du.age, gan: ganHit, ji: jiHit, score: s })
  }

  if (score > cfg.cap) score = cfg.cap
  score = Math.round(score * 10) / 10   // 소수 첫째자리까지

  const hitAges = hits.map(h => h.age)
  const jiHitAges = hits.filter(h => h.ji).map(h => h.age)

  // 해설 — 지지로 받쳐주는 경우를 우선해서 말한다.
  let note = ''
  if (jiHitAges.length > 0) {
    const ages = jiHitAges.map(a => `${a}세`).join('·')
    note = `필요한 ${yongsinEl} 기운이 ${ages} 대운에 지지로 받쳐줘 중요한 시기를 든든하게 해줘요`
  } else if (hitAges.length > 0) {
    const ages = hitAges.map(a => `${a}세`).join('·')
    note = `필요한 ${yongsinEl} 기운이 ${ages} 대운 천간에 들어와요 (지지까지 받쳐주면 더 좋아요)`
  } else {
    note = `중요 시기(${cfg.minAge}~${cfg.maxAge}세) 대운에 ${yongsinEl} 기운이 약해요`
  }

  return { score, hits, hitAges, jiHitAges, yongsinEl, note }
}
