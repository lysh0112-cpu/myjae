// lib/saju/samjae.ts
// 삼재 계산 로직

// 삼재 그룹: 띠(년지) → 삼재 해당 년지들
const SAMJAE_MAP: Record<string, string[]> = {
  // 申子辰 삼합 띠 → 寅卯辰년 삼재
  '申': ['寅', '卯', '辰'],
  '子': ['寅', '卯', '辰'],
  '辰': ['寅', '卯', '辰'],
  // 亥卯未 삼합 띠 → 申酉戌년 삼재
  '亥': ['申', '酉', '戌'],
  '卯': ['申', '酉', '戌'],
  '未': ['申', '酉', '戌'],
  // 寅午戌 삼합 띠 → 亥子丑년 삼재
  '寅': ['亥', '子', '丑'],
  '午': ['亥', '子', '丑'],
  '戌': ['亥', '子', '丑'],
  // 巳酉丑 삼합 띠 → 巳午未년 삼재
  '巳': ['巳', '午', '未'],
  '酉': ['巳', '午', '未'],
  '丑': ['巳', '午', '未'],
}

// 삼재 세부 구분
const SAMJAE_TYPE: Record<number, string> = {
  0: '들삼재 (입삼재)',   // 첫 번째 해 — 가장 강함
  1: '눌삼재 (중삼재)',   // 두 번째 해
  2: '날삼재 (출삼재)',   // 세 번째 해 — 빠져나오는 해
}

// 년지별 간지 순서 (삼재 진입 순서 계산용)
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

export interface SamjaeResult {
  isSamjae: boolean
  type: string        // 들/눌/날 삼재
  years: string[]     // 삼재 해당 년지들
  severity: 'high' | 'medium' | 'low' | 'none'
  description: string
}

/**
 * 특정 사람의 삼재 여부 계산
 * @param birthYeonJi 태어난 년지 (띠)
 * @param targetYeonJi 대상 년도의 년지
 */
export function calcSamjae(birthYeonJi: string, targetYeonJi: string): SamjaeResult {
  const samjaeYears = SAMJAE_MAP[birthYeonJi]

  if (!samjaeYears) {
    return {
      isSamjae: false,
      type: '',
      years: [],
      severity: 'none',
      description: '삼재 해당 없음',
    }
  }

  const idx = samjaeYears.indexOf(targetYeonJi)

  if (idx === -1) {
    return {
      isSamjae: false,
      type: '',
      years: samjaeYears,
      severity: 'none',
      description: '삼재 해당 없음',
    }
  }

  const type = SAMJAE_TYPE[idx]
  const severity = idx === 0 ? 'high' : idx === 1 ? 'medium' : 'low'

  return {
    isSamjae: true,
    type,
    years: samjaeYears,
    severity,
    description: `${birthYeonJi}띠 ${type} — ${severity === 'high' ? '삼재 중 가장 강한 해' : severity === 'medium' ? '삼재 중간 해' : '삼재 마지막 해 (빠져나오는 중)'}`,
  }
}

/**
 * 두 사람 모두의 삼재 여부 확인
 */
export interface CoupleSamjaeResult {
  person1: SamjaeResult
  person2: SamjaeResult
  isBothSamjae: boolean
  isAnySamjae: boolean
  scoreImpact: number   // 택일 점수에 미치는 영향
  advice: string
}

export function calcCoupleSamjae(
  birthYeonJi1: string,
  birthYeonJi2: string,
  targetYeonJi: string
): CoupleSamjaeResult {
  const person1 = calcSamjae(birthYeonJi1, targetYeonJi)
  const person2 = calcSamjae(birthYeonJi2, targetYeonJi)

  const isBothSamjae = person1.isSamjae && person2.isSamjae
  const isAnySamjae = person1.isSamjae || person2.isSamjae

  let scoreImpact = 0
  let advice = ''

  if (isBothSamjae) {
    scoreImpact = -20
    advice = '두 사람 모두 삼재 해당 — 결혼 연도 재고 권장'
  } else if (person1.isSamjae) {
    const s = person1.severity
    scoreImpact = s === 'high' ? -15 : s === 'medium' ? -10 : -5
    advice = `신랑 ${person1.type} — ${s === 'high' ? '가급적 피하는 것이 좋음' : s === 'medium' ? '주의 필요' : '큰 문제 없으나 유의'}`
  } else if (person2.isSamjae) {
    const s = person2.severity
    scoreImpact = s === 'high' ? -15 : s === 'medium' ? -10 : -5
    advice = `신부 ${person2.type} — ${s === 'high' ? '가급적 피하는 것이 좋음' : s === 'medium' ? '주의 필요' : '큰 문제 없으나 유의'}`
  } else {
    scoreImpact = 5
    advice = '두 사람 모두 삼재 아님 — 좋은 시기'
  }

  return {
    person1,
    person2,
    isBothSamjae,
    isAnySamjae,
    scoreImpact,
    advice,
  }
}

/**
 * 년지 추출 헬퍼 (사주 배열에서)
 */
export function getYeonJi(saju: { pillar: string; branch: string }[]): string {
  return saju.find(p => p.pillar === '년주')?.branch ?? ''
}
