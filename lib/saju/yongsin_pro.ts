export function calcYongsinPro(
  saju: SajuPillar[],
  dayStem: string,
  hourIdx: number | null,
  customScores?: Record<string,number> | null  // ✅ 추가
): YongsinProResult {
  // ✅ 커스텀 점수 있으면 우선 사용, 없으면 자동계산
  const score = customScores && Object.values(customScores).some(v => v > 0)
    ? customScores
    : calc110Score(saju, hourIdx)

  const track1 = calcTrack1WithScore(saju, dayStem, score)
  const track2 = calcTrack2(saju, dayStem)

  const CONTROLS: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  const isConflict = track1.yongsin !== '' &&
    track2.yongsin !== '' &&
    CONTROLS[track1.yongsin] === track2.yongsin

  const ELEMENT_KOR: Record<string,string> = {
    목:'목(木)',화:'화(火)',토:'토(土)',금:'금(金)',수:'수(水)'
  }
  const conflictAdvice = isConflict
    ? `사적인 영역(휴식·건강)에서는 ${ELEMENT_KOR[track1.yongsin]} 기운으로 재충전하고, 공적인 영역(직장·사업)에서는 ${ELEMENT_KOR[track2.yongsin]} 기운을 무기로 삼아야 성공하는 입체적 성향의 소유자입니다. 일터에서 치열하게 활동하되 퇴근 후 정적인 취미로 온오프를 분리하세요.`
    : ''

  return { track1, track2, isConflict, conflictAdvice, score }
}
