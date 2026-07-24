// lib/saju/coupleRelation.ts
// ============================================================================
//  궁합 — 관계로 부부/연인을 가른다
//
//  ★2026-07-24 연재쌤 지시로 연인궁합·부부궁합을 하나로 합쳤다.
//
//    [왜 합쳤나]
//    심산 궁합론(『명리적성 비법노트』)은 아내와 애인을 구분하지 않는다.
//    둘 다 같은 재성으로 본다. 판정 산식(coupleFilterV1)도 원래 관계를
//    가리지 않고 돈다. 메뉴만 둘로 나뉘어 있었을 뿐이다.
//
//    [어떻게 가르나]
//    사람을 등록할 때 이미 '관계'를 고르고 있다(PersonFormPitch).
//    따로 물을 것 없이 그 값으로 판별한다.
//      가족 : 배우자 · 자녀 · 손주 · 부모 · 조부모 · 형제/자매 · 며느리/사위 · 친척
//      연인 : 연인 · 썸남/썸녀 · 전연인 · 전배우자
//      지인 : 친구 · 지인 · 직장동료 · 상사/부하 · 동업자/파트너
//
//    [무엇이 달라지나]
//    판정 내용은 똑같다. 호칭과 카드 제목만 바뀐다.
//      부부  → "배우자분" · "○○님의 배우자운"
//      그 외 → "상대분"   · "○○님의 인연운"
//    본문의 명리 설명("재성이 배우자 자리")은 그대로 둔다.
//    재성·관성이 배우자를 뜻하는 건 관계와 무관한 명리 규칙이기 때문.
// ============================================================================

/** 부부로 보는 관계 */
const MARRIED_RELATIONS = new Set(['배우자', '전배우자'])

/** 연애 관계 (부부 아님) */
const LOVE_RELATIONS = new Set(['연인', '썸남/썸녀', '전연인'])

export type CoupleKind = 'married' | 'love' | 'other'

/** 관계 문자열 → 궁합 갈래 */
export function coupleKindOf(relation?: string | null): CoupleKind {
  const r = (relation || '').trim()
  if (MARRIED_RELATIONS.has(r)) return 'married'
  if (LOVE_RELATIONS.has(r)) return 'love'
  return 'other'
}

/**
 * 두 사람의 관계로 갈래를 정한다.
 * 한쪽이라도 '배우자'면 부부로 본다.
 *   (보통 상대 쪽에만 관계가 붙는다. 본인은 '나'라서 관계가 비어 있다)
 */
export function coupleKindOfPair(rel1?: string | null, rel2?: string | null): CoupleKind {
  const k1 = coupleKindOf(rel1)
  const k2 = coupleKindOf(rel2)
  if (k1 === 'married' || k2 === 'married') return 'married'
  if (k1 === 'love' || k2 === 'love') return 'love'
  return 'other'
}

/** 화면 제목 */
export function coupleTitleOf(kind: CoupleKind): string {
  return kind === 'married' ? '부부 궁합' : kind === 'love' ? '연인 궁합' : '궁합'
}

/** 상대를 부르는 말 — 부부만 '배우자', 나머지는 '상대' */
export function partnerWordOf(kind: CoupleKind): string {
  return kind === 'married' ? '배우자' : '상대'
}

/**
 * 배우자운 카드 제목.
 *   부부  → "홍길동님의 배우자운"
 *   그 외 → "홍길동님의 인연운"
 * (친구·동업자 궁합에서 '배우자운'이 나오면 어색하다)
 */
export function spouseFortuneTitle(name: string, kind: CoupleKind): string {
  return kind === 'married' ? `${name}님의 배우자운` : `${name}님의 인연운`
}

/**
 * 상담 가격 키.
 *   ★2026-07-24 — 'couple' 하나로 통일했다. (대표님 결정)
 *     consult_prices 에 couple(50,000) / married(70,000) 두 행이 있었는데
 *     메뉴를 합치면서 가격도 하나로 맞췄다. 금액은 관리자 화면에서 바꾸면 된다.
 *     married 행은 지우지 않았다 — 되돌릴 때 필요하다.
 */
export const COUPLE_PRICE_KEY = 'couple'

/**
 * DB service_type.
 *   ★2026-07-24 — 'couple' 하나로 통일했다.
 *     예전에는 couple/married 로 나눠 저장했다(대규모 조회 대비).
 *     메뉴가 하나가 되면서 나눌 이유가 없어졌다.
 *     기존 기록은 지워도 된다는 대표님 확인을 받았다.
 */
export const COUPLE_SERVICE_TYPE = 'couple'
