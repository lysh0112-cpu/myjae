// lib/saju/yongsin.ts
// 용신 계산 로직

const STEM_ELEMENT: Record<string,string> = {
  甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',
  己:'토',庚:'금',辛:'금',壬:'수',癸:'수'
}
const BRANCH_ELEMENT: Record<string,string> = {
  子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',
  午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'
}
// 지장간 (중기 기준)
const JIJANGAN_MAIN: Record<string,string> = {
  子:'癸',丑:'己',寅:'甲',卯:'乙',辰:'戊',巳:'丙',
  午:'丁',未:'己',申:'庚',酉:'辛',戌:'戊',亥:'壬'
}

const GENERATES: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
const CONTROLS: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}

interface SajuPillar { pillar: string; stem: string; branch: string }

// 오행 점수 계산 (천간 1점, 지지 1점, 지장간 0.5점)
function calcElementScore(saju: SajuPillar[]): Record<string,number> {
  const score: Record<string,number> = {목:0,화:0,토:0,금:0,수:0}
  saju.forEach(({stem, branch}) => {
    if (STEM_ELEMENT[stem]) score[STEM_ELEMENT[stem]] += 1
    if (BRANCH_ELEMENT[branch]) score[BRANCH_ELEMENT[branch]] += 1
    const jg = JIJANGAN_MAIN[branch]
    if (jg && STEM_ELEMENT[jg]) score[STEM_ELEMENT[jg]] += 0.5
  })
  return score
}

// 신강/신약 판단
function calcStrength(saju: SajuPillar[], dayStem: string): {
  isStrong: boolean
  dayElement: string
  score: number
  totalScore: number
} {
  const dayElement = STEM_ELEMENT[dayStem]
  const score = calcElementScore(saju)

  // 일간 도움 오행: 비겁(같은 오행) + 인성(생해주는 오행)
  const helpElement = Object.entries(GENERATES).find(([,v]) => v === dayElement)?.[0] ?? ''
  const supportScore = (score[dayElement] ?? 0) + (score[helpElement] ?? 0)
  const totalScore = Object.values(score).reduce((a,b) => a+b, 0)

  // 월지 가중치 (월지는 2점 추가)
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
  const monthElement = BRANCH_ELEMENT[monthBranch]
  const monthBonus = (monthElement === dayElement || monthElement === helpElement) ? 2 : 0

  const finalSupport = supportScore + monthBonus
  const isStrong = finalSupport >= totalScore * 0.45

  return { isStrong, dayElement, score, totalScore }
}

export interface YongsinResult {
  isStrong: boolean
  yongsin: string      // 용신 오행
  heeksin: string      // 희신 오행
  gisin: string        // 기신 오행
  gusin: string        // 구신 오행
  hansin: string       // 한신 오행
  score: Record<string,number>
  description: string
}

export function calcYongsin(saju: SajuPillar[], dayStem: string): YongsinResult {
  const { isStrong, dayElement, score } = calcStrength(saju, dayStem)

  let yongsin = '', heeksin = '', gisin = '', gusin = '', hansin = ''

  if (isStrong) {
    // 신강 → 설기·극제하는 오행이 용신
    yongsin = CONTROLS[dayElement]        // 관살 (극하는 것)
    heeksin = GENERATES[dayElement]       // 식상 (설기하는 것)
    gisin = dayElement                    // 비겁 (같은 오행) → 기신
    gusin = Object.entries(GENERATES).find(([,v]) => v === dayElement)?.[0] ?? '' // 인성 → 구신
    hansin = CONTROLS[yongsin]            // 한신
  } else {
    // 신약 → 생조하는 오행이 용신
    yongsin = Object.entries(GENERATES).find(([,v]) => v === dayElement)?.[0] ?? '' // 인성
    heeksin = dayElement                  // 비겁
    gisin = CONTROLS[dayElement]          // 관살 → 기신
    gusin = GENERATES[dayElement]         // 식상 → 구신
    hansin = CONTROLS[yongsin]            // 한신
  }

  const description = isStrong
    ? `일간 ${dayStem}(${dayElement})이 신강합니다. ${yongsin}이 용신입니다.`
    : `일간 ${dayStem}(${dayElement})이 신약합니다. ${yongsin}이 용신입니다.`

  return { isStrong, yongsin, heeksin, gisin, gusin, hansin, score, description }
}
