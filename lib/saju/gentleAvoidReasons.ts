// lib/saju/gentleAvoidReasons.ts
// 인명에 «권장하지 않는» 까닭을 손님 말로 — 순화된 해설
//
// ══════════════════════════════════════════════════════════════════
//  [왜 이 파일이 생겼나]  2026-07-30 · 3단계-e (대표님 지시)
//
//    3단계-b 가 不用 글자를 «막지 않고 표시» 하게 바꾸면서 배지를 붙였는데,
//    문구가 「인명 권장 안 함」 하나뿐이라 **왜 그런지** 알 수가 없었습니다.
//    까닭을 갈래별로 나누고, 단정적·자극적인 말을 걷어낸 해설을 답니다.
//
//  ★말투 규칙 — 대표님 방침(naming.ts:8)을 그대로 따릅니다
//      쓰지 않는 말   단명 · 이별 · 탕진 · 흉 · 불길 · 나쁨 · 재앙
//      쓰는 말        「~권장」 · 「~신중」 · 「~보는 관습이 있습니다」
//    ⚠️ 16-verify-naming.ts 가 이 표의 모든 글에 금지어 검사를 겁니다.
// ══════════════════════════════════════════════════════════════════

export interface GentleAvoidReason {
  /** UI 배지 — 짧게. 6~9자 */
  badgeLabel: string
  /** 한 줄 요약 */
  summary: string
  /** 감정서·안내에 쓰는 상세 해설 */
  gentleDescription: string
}

export type AvoidReasonKey =
  | 'LONELY_COLD' | 'SACRED_OVERLOAD' | 'ENERGY_DECLINE' | 'SEASON_CHANGE'
  | 'ANIMAL_INSECT' | 'BODY_PART' | 'NUMBER_CHAR' | 'GANJI_CHAR'
  | 'MULTI_SOUND' | 'ORDER_MISMATCH' | 'ILJI_CHUNG'

export const GENTLE_AVOID_REASONS: Record<AvoidReasonKey, GentleAvoidReason> = {
  // 1. 고독 / 쓸쓸함 (霜 雪 萍 菊 蘭 …)
  LONELY_COLD: {
    badgeLabel: '안정적 결실 권장',
    summary: '기운이 흩어지거나 차가워지기 쉬움',
    gentleDescription:
      '서리나 눈처럼 운치가 있으나 에너지가 차갑게 흩어질 수 있는 성질이 있습니다. '
      + '따뜻한 결실과 일상의 안정을 돕기 위해 인명용으로는 권장하지 않는 글자입니다.',
  },
  // 2. 과다 / 중압 (佛 仙 聖 帝 龍 …)
  SACRED_OVERLOAD: {
    badgeLabel: '평온한 조화 권장',
    summary: '글자의 기운과 상징성이 매우 중함',
    gentleDescription:
      '글자가 지닌 에너지와 상징적 무게가 매우 높습니다. '
      + '평범하고 평온한 일상을 가꾸기에는 다소 중압감이 될 수 있어 전통 성명학에서 아끼는 한자입니다.',
  },
  // 3. 쇠퇴 / 소모 (盡 靜 窮 退 …)
  ENERGY_DECLINE: {
    badgeLabel: '활력 보완 권장',
    summary: '기운을 비우거나 소모하는 성질',
    gentleDescription:
      '글자 자체에 무언가를 정리하거나 비워내는 정적인 기운이 강합니다. '
      + '지속적인 성장과 활기찬 생동감을 더해 주기 위해 인명에는 잘 쓰지 않습니다.',
  },
  // 4. 계절 / 날씨 (春 夏 秋 冬 風 雲 …)
  SEASON_CHANGE: {
    badgeLabel: '일관된 기운 권장',
    summary: '기후 변화처럼 변화무쌍한 기운',
    gentleDescription:
      '계절과 바람처럼 변화의 폭이 커 기운의 기복이 생길 수 있습니다. '
      + '한결같고 안정적인 흐름을 유지하기 위해 인명용 사용에 신중을 기하는 글자입니다.',
  },
  // 5. 동물 / 곤충 (蛇 烏 狗 蟲 …)
  ANIMAL_INSECT: {
    badgeLabel: '인명 기피 글자',
    summary: '동물 및 곤충을 상징하는 한자',
    gentleDescription:
      '길상(길한 상징)을 뜻하는 일부 글자를 제외하고, 일반적인 동물이나 곤충을 뜻하는 한자는 '
      + '사람이 쓰는 이름의 품격을 위해 피하는 관습이 있습니다.',
  },
  // 6. 신체 / 장기 (心 骨 腸 肝 …)
  BODY_PART: {
    badgeLabel: '균형적 기운 권장',
    summary: '특정 신체 부위를 뜻하는 한자',
    gentleDescription:
      '신체 장기나 부위를 직접 나타내는 글자는 기운의 균형을 한쪽으로 치우치게 할 수 있어, '
      + '전인적인 조화를 위해 인명용으로는 기피합니다.',
  },
  // 7. 숫자 / 수리
  NUMBER_CHAR: {
    badgeLabel: '수리 충돌 주의',
    summary: '획수 수리 및 서열상의 혼선 가능성',
    gentleDescription:
      '숫자를 뜻하는 한자는 이름 전체의 획수 계산(수리오행) 및 가족 간 서열에 혼선을 줄 수 있어 '
      + '가급적 피하는 것이 이롭습니다.',
  },
  // 8. 간지 / 절기
  GANJI_CHAR: {
    badgeLabel: '사주 충돌 주의',
    summary: '십간십이지 상징 한자',
    gentleDescription:
      '사주의 간지(干支)와 직접 부딪히거나 부조화를 이룰 가능성이 높아, '
      + '사주와 이름의 부드러운 만남을 위해 가급적 피하는 글자입니다.',
  },
  // 9. 동자이음
  MULTI_SOUND: {
    badgeLabel: '발음 혼선 주의',
    summary: '두 가지 이상으로 읽히는 한자',
    gentleDescription:
      '문맥이나 쓰임에 따라 읽는 발음이 달라질 수 있습니다. '
      + '사회생활에서 정확하고 명확하게 불리기 위해 신중히 선택해야 하는 글자입니다.',
  },
  // 11. ★일주(월지·일지) 충 — 『작명개운법』 122쪽
  ILJI_CHUNG: {
    badgeLabel: '충(沖) 주의',
    summary: '사주의 월지·일지와 부딪히는 글자',
    gentleDescription:
      '월지는 태어난 기운과 부모·직업의 자리이고, 일지는 자신과 배우자를 나타내는 자리로 봅니다. '
      + '그 자리와 정면으로 부딪히는 글자는 기운이 흔들릴 수 있어 되도록 다른 글자를 살펴보시길 권합니다.',
  },
  // 10. 서열 불일치
  ORDER_MISMATCH: {
    badgeLabel: '서열 관계 확인',
    summary: '출생 서열과 한자 의미의 불일치',
    gentleDescription:
      '첫째, 둘째 등 태어난 순서를 나타내는 글자가 실제 자녀의 출생 서열과 맞지 않아 '
      + '기운의 정렬을 위해 조정을 권장하는 글자입니다.',
  },
}
