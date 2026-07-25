// lib/saju/buildCouplePrompt.ts
// ============================================================================
//  궁합 통변 프롬프트 빌더 (26부 신설)
// ----------------------------------------------------------------------------
//  toCoupleTongbyeonMaterial 이 만든 재료(personBlocks·judgeBlock·flowBlock)를
//  받아, AI 가 궁합 통변을 쓰도록 지시문을 붙인다.
//
//  ★설계 (대표님과 확정)
//    · 화면 카드 순서 = 통변 단락 (1:1 대응)
//        여는말(각자 오행 소개+상호작용) → 없는오행 → 귀인 → 일주
//        → 첫 번째 사람 배우자운 → 두 번째 사람 배우자운 → 맺는말
//    · 6~7문단
//    · 재료 = 카드에 이미 완성된 문구(judgeBlock). raw 계산을 다시 해석하지 않는다.
//        (AI 가 raw 를 해석하면 글자 소속·방향을 틀린다 — 26부 교훈)
//    · AI 는 사실(글자·방향·별·판정)을 못 바꾼다. 순화·어미·비유·연결만 재량.
//    · "(순화해서 전할 것)" 표시가 붙은 재료는 무섭지 않게 부드럽게.
//    · 톤은 사주 통변과 동일 (따뜻·자연비유·위로·나아갈 방향·순우리말)
//    · 유파명·쪽수·점수숫자·불륜 같은 말 금지
//
//  ★십신 배경지식 (통변이 배우자 별을 풀 때 참고)
//    남자 재성 = 재물·배우자(아내)·부친
//    여자 관성 = 배우자(남편)·명예
// ============================================================================

import type { CoupleTongbyeonMaterial } from './toCoupleTongbyeonInput'

export type CoupleRelationKind = '부부' | '연인' | '일반'

export interface BuildCouplePromptOpts {
  /** 관계 갈래 — 호칭을 고른다 (부부/연인/일반) */
  relation?: CoupleRelationKind
  /** 자유 질문 (없으면 전체 총평) */
  question?: string
}

const SYSTEM = `당신은 "명카페"의 궁합 상담가입니다.
정통 명리에 근거하되, 두 사람이 마음으로 느끼도록 따뜻하고 다정하게 풀어냅니다.

[말투·톤]
- 존댓말, 품격 있고 다정하게. 자연 비유로 풀어냅니다.
  (예: "물이 나무를 키우듯 서로를 자라게 하는 사이")
- 조심할 점도 단정하지 말고 "이렇게 맞춰가면 더 단단해진다"는 희망으로 감쌉니다.

[용어]
- 한자어·전문용어(일간·용신·관성·재성 등)를 되도록 쓰지 말고 순우리말 비유로.
- 영어 병기 금지. 유파 이름·책 쪽수·점수 숫자 금지.

[십신 배경지식 — 배우자 별을 풀 때만 참고]
- 남자의 재성 = 재물·배우자(아내)·부친을 함께 뜻합니다.
- 여자의 관성 = 배우자(남편)·명예를 뜻합니다.

[★가장 중요한 규칙 — 사실을 바꾸지 마세요]
- 아래 [심산 판정]에 담긴 사실(어떤 글자가 누구 것인지, 누가 누구에게 귀인인지,
  좋은 자리인지 살필 자리인지)은 절대 바꾸지 마세요.
- 당신이 할 수 있는 것은 그 사실을 "순화하고, 어미를 다듬고, 비유로 풀고,
  문단으로 잇는 것"뿐입니다. 없는 사실을 지어내지 마세요.
- "(순화해서 전할 것)" 표시가 붙은 재료는 무서운 말을 그대로 쓰지 말고,
  뜻만 살려 부드럽게 풀고 반드시 "이렇게 맞춰가면 된다"는 방향을 함께 전하세요.

[형식]
- 제목은 "■ 제목" 형태만 씁니다. 다른 마크다운(굵게·목록기호 등) 금지.
- 6~7개 문단으로, 아래 [글의 뼈대] 순서를 그대로 따르세요.
- 끝까지 완성하고, 이모지는 맨 마지막에 하나만.`

/** 관계별 호칭 — 부부/연인/일반 */
function relationWord(r: CoupleRelationKind): string {
  if (r === '부부') return '두 분'
  if (r === '연인') return '두 사람'
  return '두 분'
}

/** 글의 뼈대 — 화면 카드 순서와 1:1 */
function skeleton(r: CoupleRelationKind, hasQuestion: boolean): string {
  const who = relationWord(r)
  const lines = [
    '[글의 뼈대 — 이 순서대로 문단을 지으세요. 화면 카드 순서와 같습니다]',
    `1. 여는말 — ${who}이 각각 어떤 기운(오행)을 타고났는지 한 분씩 짧게 소개하고,`,
    '   그 두 기운이 만나 어떻게 어울리는지(살려 주는지·부딪히는지) 한 문단으로.',
    '   재료에 상호작용이 없으면 "없는 오행을 서로 채워 주는지"로 엽니다.',
    '2. 없는 오행을 채워 주는가 — [없는 오행을 채워 주는가] 재료를 풀어서.',
    '3. 서로에게 귀인이 되는가 — [서로에게 귀인이 되는가] 재료를 풀어서.',
    '4. 두 분 일주가 만나는 자리 — [두 분 일주가 만나는 자리] 재료를 풀어서.',
    '5. 첫 번째 사람의 배우자운 — 그 사람 배우자운 카드의 본문과 "배우자운 통변 재료"를 녹여서.',
    '6. 두 번째 사람의 배우자운 — 같은 방식으로.',
    `7. 맺는말 — ${who}이 앞으로 어떻게 마음을 내면 더 좋아질지, 따뜻한 당부로 마무리.`,
  ]
  if (hasQuestion) {
    lines.push('')
    lines.push('※ 다만 아래 [질문]이 있으니, 위 흐름을 지키되 그 질문에 답이 되도록 무게를 실으세요.')
  }
  return lines.join('\n')
}

/** 궁합 통변 프롬프트를 만든다 — { system, user } */
export function buildCouplePrompt(
  material: CoupleTongbyeonMaterial,
  opts: BuildCouplePromptOpts = {},
): { system: string; user: string } {
  const relation = opts.relation ?? '부부'
  const q = opts.question?.trim()

  const parts: string[] = []
  parts.push('[두 사람의 명식]')
  material.personBlocks.forEach(b => { parts.push(b); parts.push('') })

  if (material.judgeBlock) {
    parts.push(material.judgeBlock)
    parts.push('')
  }
  if (material.flowBlock) {
    parts.push(material.flowBlock)
    parts.push('')
  }

  parts.push(skeleton(relation, !!q))
  if (q) {
    parts.push('')
    parts.push(`[질문] ${q}`)
  }

  return { system: SYSTEM, user: parts.join('\n') }
}
