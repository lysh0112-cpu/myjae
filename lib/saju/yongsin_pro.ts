// lib/saju/yongsin_pro.ts
import { SajuPillar, Track1Result, calcTrack1 } from './yongsin_track1'
import { Track2Result, calcTrack2 } from './yongsin_track2'

export type { Track1Result, Track2Result }

const GENERATES: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
const CONTROLS: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
const ELEMENT_KOR: Record<string,string> = {
  목:'목(木)',화:'화(火)',토:'토(土)',금:'금(金)',수:'수(水)'
}

const JIJANGAN_MAIN: Record<string,string> = {
  子:'癸',丑:'己',寅:'甲',卯:'乙',辰:'戊',巳:'丙',
  午:'丁',未:'己',申:'庚',酉:'辛',戌:'戊',亥:'壬'
}
const STEM_ELEMENT: Record<string,string> = {
  甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',
  己:'토',庚:'금',辛:'금',壬:'수',癸:'수'
}
const BRANCH_ELEMENT: Record<string,string> = {
  子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',
  午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'
}

export interface YongsinProResult {
  track1: Track1Result
  track2: Track2Result
  isConflict: boolean
  conflictAdvice: string
  score: Record<string,number>
}

function calc110Score(saju: SajuPillar[], hourIdx: number | null): Record<string,number> {
  const score: Record<string,number> = {목:0,화:0,토:0,금:0,수:0}
  saju.forEach(({pillar, stem, branch}) => {
    if (STEM_ELEMENT[stem]) score[STEM_ELEMENT[stem]] += 10
    let branchScore = 10
    if (pillar === '월주') branchScore = 30
    else if (pillar === '일주') branchScore = 15
    else if (pillar === '시주') branchScore = 15
    if (pillar === '월주') {
      if (branch === '丑') { score['수'] += 30; return }
      if (branch === '未') { score['화'] += 30; return }
    }
    if (pillar === '시주') {
      if (branch === '丑' || branch === '寅') { score['수'] += 15; return }
      if (branch === '未') { score['화'] += 15; return }
    }
    if (BRANCH_ELEMENT[branch]) score[BRANCH_ELEMENT[branch]] += branchScore
  })
  return score
}

export function calcYongsinPro(
  saju: SajuPillar[],
  dayStem: string,
  hourIdx: number | null,
  customScores?: Record<string,number> | null
): YongsinProResult {
  const score = customScores && Object.values(customScores).some(v => v > 0)
    ? customScores
    : calc110Score(saju, hourIdx)

  const track1 = calcTrack1(saju, dayStem, score)
  const track2 = calcTrack2(saju, dayStem)

  const isConflict = track1.yongsin !== '' &&
    track2.yongsin !== '' &&
    CONTROLS[track1.yongsin] === track2.yongsin

  const conflictAdvice = isConflict
    ? `사적인 영역(휴식·건강)에서는 ${ELEMENT_KOR[track1.yongsin]} 기운으로 재충전하고, 공적인 영역(직장·사업)에서는 ${ELEMENT_KOR[track2.yongsin]} 기운을 무기로 삼아야 성공하는 입체적 성향의 소유자입니다. 일터에서 치열하게 활동하되 퇴근 후 정적인 취미로 온오프를 분리하세요.`
    : ''

  return { track1, track2, isConflict, conflictAdvice, score }
}
