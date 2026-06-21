// lib/saju/yongsin_track1.ts
const STEM_ELEMENT: Record<string,string> = {
  甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',
  己:'토',庚:'금',辛:'금',壬:'수',癸:'수'
}
const BRANCH_ELEMENT: Record<string,string> = {
  子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',
  午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'
}
const SUMMER_MONTHS = ['巳','午','未']
const WINTER_MONTHS = ['亥','子','丑']
const GENERATES: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
const CONTROLS: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
const ELEMENT_KOR: Record<string,string> = {
  목:'목(木)',화:'화(火)',토:'토(土)',금:'금(金)',수:'수(水)'
}

export interface SajuPillar { pillar: string; stem: string; branch: string }

export interface Track1Result {
  yongsin: string
  heeksin: string
  gisin: string
  type: string
  description: string
  lifeAdvice: string
}

function calcMyForce(score: Record<string,number>, dayStem: string): number {
  const dayElement = STEM_ELEMENT[dayStem]
  const helpElement = Object.entries(GENERATES).find(([,v]) => v === dayElement)?.[0] ?? ''
  return (score[dayElement] ?? 0) + (score[helpElement] ?? 0)
}

export function calcTrack1(
  saju: SajuPillar[],
  dayStem: string,
  score: Record<string,number>
): Track1Result {
  const myForce = calcMyForce(score, dayStem)
  const dayElement = STEM_ELEMENT[dayStem]
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''
  const maxElement = Object.entries(score).sort((a,b) => b[1]-a[1])[0]

  // 종격
  if (myForce <= 15 || maxElement[1] >= 80) {
    const dominant = maxElement[0]
    const help = Object.entries(GENERATES).find(([,v]) => v === dominant)?.[0] ?? ''
    return {
      yongsin: dominant, heeksin: help, gisin: CONTROLS[dominant],
      type: '종격',
      description: `대세를 따르는 종격 사주입니다. ${ELEMENT_KOR[dominant]}의 기운이 압도적으로 강합니다.`,
      lifeAdvice: `${ELEMENT_KOR[dominant]} 기운을 살리는 환경과 직업이 유리합니다.`
    }
  }

  // 조후
  if (SUMMER_MONTHS.includes(monthBranch) && (score['수'] ?? 0) < 40) {
    return {
      yongsin: '수', heeksin: '금', gisin: '화', type: '조후',
      description: `여름 태생으로 사주가 조열합니다. 수(水)의 기운으로 균형을 잡아야 합니다.`,
      lifeAdvice: `검은색 계열, 북쪽 방향, 물가에서 휴식이 스트레스 해소에 좋습니다.`
    }
  }
  if (WINTER_MONTHS.includes(monthBranch) && (score['화'] ?? 0) < 40) {
    return {
      yongsin: '화', heeksin: '목', gisin: '수', type: '조후',
      description: `겨울 태생으로 사주가 한랭합니다. 화(Fire)의 기운으로 따뜻함을 채워야 합니다.`,
      lifeAdvice: `붉은색 계열, 남쪽 방향, 따뜻하고 밝은 환경이 심리 안정에 도움됩니다.`
    }
  }

  // 병약
  const diseaseElement = Object.entries(score).find(([,v]) => v >= 50)
  if (diseaseElement) {
    const medicine = CONTROLS[diseaseElement[0]]
    return {
      yongsin: medicine,
      heeksin: GENERATES[medicine] ?? '',
      gisin: diseaseElement[0],
      type: '병약',
      description: `${ELEMENT_KOR[diseaseElement[0]]}이 과다(${diseaseElement[1]}점)하여 병(病)이 됩니다. ${ELEMENT_KOR[medicine]}이 약(藥)이 됩니다.`,
      lifeAdvice: `${ELEMENT_KOR[diseaseElement[0]]} 기운을 줄이고 ${ELEMENT_KOR[medicine]} 기운을 보충하는 생활이 필요합니다.`
    }
  }

  // 억부
  if (myForce >= 60) {
    const candidates = [CONTROLS[dayElement], GENERATES[dayElement]]
    const yongsin = candidates.find(el => {
      const s = score[el] ?? 0
      return s >= 10 && s <= 25
    }) ?? CONTROLS[dayElement]
    return {
      yongsin,
      heeksin: candidates.find(el => el !== yongsin) ?? '',
      gisin: dayElement,
      type: '억부(신강)',
      description: `신강 사주입니다(내 세력 ${myForce}점). ${ELEMENT_KOR[yongsin]}으로 기운을 조절합니다.`,
      lifeAdvice: `넘치는 에너지를 발산할 수 있는 활동적인 환경이 좋습니다.`
    }
  } else {
    const helpElement = Object.entries(GENERATES).find(([,v]) => v === dayElement)?.[0] ?? ''
    return {
      yongsin: helpElement, heeksin: dayElement, gisin: CONTROLS[dayElement],
      type: '억부(신약)',
      description: `신약 사주입니다(내 세력 ${myForce}점). ${ELEMENT_KOR[helpElement]}의 도움이 필요합니다.`,
      lifeAdvice: `안정적이고 지지받는 환경에서 능력을 발휘합니다.`
    }
  }
}
