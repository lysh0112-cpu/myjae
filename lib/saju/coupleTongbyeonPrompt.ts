// lib/saju/coupleTongbyeonPrompt.ts
// ============================================================================
// 궁합(연인/부부) AI 통변 프롬프트 빌더
// ----------------------------------------------------------------------------
// 사주 통변(tongbyeonPrompt)과 같은 톤·형식이되, "두 사람"의 명식과
// 궁합 계산 결과(calcCoupleScore)를 근거로 답하도록 엮는다.
//   - 두 사람 명식(각 4기둥·일간·오행)
//   - 궁합 등급(점수 숫자는 넣지 않음 — C안: 화면·해설 모두 숫자 숨김)
//   - 계산 근거(details의 reason) — 좋은 점/조심할 점의 명리 뿌리
//   - 사용자가 고른 궁합 질문(coupleQuestions) — 없으면 "전체 총평"
//
// 규칙(사주 통변과 동일): 순우리말·다정, 마크다운 금지("■ 제목"만),
//   끝까지 완성, 이모지는 마지막 1개.
//   점수 숫자(87점 등)는 절대 쓰지 않는다(등급 표현으로만).
// ============================================================================

import type { SajuQuestion } from '@/lib/saju/questions'
import type { CoupleScoreResult } from '@/lib/saju/coupleScore'

// 한 사람의 통변용 최소 정보 (화면에서 만들어 넘김)
export interface CouplePerson {
  name: string
  gender: string          // '남' | '여'
  birthLabel?: string     // 표기용 (예: "1995.10.02 진시")
  yearPillar: string      // 한글/한자 간지 (예: "乙亥")
  monthPillar: string
  dayPillar: string
  hourPillar: string      // 시 모르면 "모름"
  dayStem: string         // 일간 (본바탕)
  dayStemNature?: string  // 일간 물상 한 줄 (예: "곧게 자라는 큰 나무")
}

export type CoupleMode = 'couple' | 'married'

export interface CoupleTongbyeonInput {
  mode: CoupleMode
  person1: CouplePerson
  person2: CouplePerson
  score: CoupleScoreResult   // 등급·근거(details) 재료 (점수 숫자는 프롬프트에 안 씀)
}

// 일간 오행 물상 (없을 때 보조)
const STEM_NATURE: Record<string, string> = {
  甲: '곧게 자라는 큰 나무', 乙: '유연한 화초·덩굴',
  丙: '온 세상을 비추는 태양', 丁: '따뜻한 등불·화롯불',
  戊: '너른 산·대지', 己: '기름진 논밭·정원',
  庚: '단단한 무쇠·바위', 辛: '보석·정제된 쇠',
  壬: '깊고 넓은 물·강', 癸: '맑은 이슬·시냇물',
}

const SYSTEM_GUIDE = `당신은 "명카페(MyungCafe)"의 궁합 상담가입니다.
정통 명리에 근거하되, 두 사람이 마음으로 느낄 수 있도록 따뜻하고 감성적인 자연 비유로 풀어냅니다.

[말투·톤]
- 자연 비유로 풀어냅니다. (예: "물이 나무를 키우듯 서로를 자라게 하는 사이")
- 두 사람의 마음을 먼저 헤아려 주세요.
- 부족한 점·조심할 점도 단정하지 말고 "이렇게 맞춰가면 더 단단해진다"는 희망으로 감싸세요.
- 존댓말을 쓰고, 품격 있으면서도 다정한 어조를 유지합니다.

[용어]
- 한자어·전문용어(일간·용신·비겁 등)를 최대한 쓰지 마세요. 순우리말 비유로 풀어냅니다.
  (일간→타고난 본바탕 / 일지→마음이 머무는 안방 / 용신→서로를 살려주는 고마운 기운)
- 영어 병기는 절대 쓰지 않습니다.

[점수·등급 규칙 — 매우 중요]
- 점수 숫자(예: 87점)를 절대 쓰지 마세요. 오직 "등급 표현"으로만 말합니다.
- 낮은 근거도 "안 맞는다"가 아니라 "달라서 채워준다 / 맞춰가면 된다"로 풀어냅니다.
- 이별·파탄·악연을 단정하지 마세요.

[반드시 지킬 규칙]
- 아래 제공된 두 사람의 명식과 "궁합 근거"에만 근거하세요. 없는 사실을 지어내지 마세요.
- 좋은 점은 좋은 근거(상생·합·삼합 등)에서, 조심할 점은 조심할 근거(충·형·공망 등)에서 풀되,
  조심할 점은 반드시 "이렇게 맞춰가면 된다"는 방향까지 함께 제시하세요.
- 각 질문 카드의 중심축은 "그 질문에 딸린 명리 연결"입니다. 반드시 그 부위로 곧장 들어가세요.
- 카드끼리 겹치지 않게, 각 카드는 서로 다른 근거·다른 결론을 담으세요.
- 의료·법률의 확정적 단정은 피하고 참고 조언으로 전합니다.
- 이모지는 맨 마지막 인사에 딱 하나만 씁니다.

[형식 규칙 — 매우 중요]
- 마크다운 기호(#, ##, **, ---)를 절대 쓰지 마세요.
- 각 카드 제목은 반드시 "■ 제목" 형식으로만 시작하세요.
- 정해진 분량 안에서 반드시 끝까지 완성하세요. 마지막 인사까지 온전히 맺으세요.`

// details를 "좋은 근거 / 조심할 근거"로 나눠 사람이 읽는 문장으로
function splitReasons(score: CoupleScoreResult): { good: string[]; care: string[] } {
  const good: string[] = []
  const care: string[] = []
  for (const d of score.details) {
    if (d.score > 0) good.push(`${d.reason}`)
    else if (d.score < 0) care.push(`${d.reason}`)
  }
  return { good, care }
}

function personBlock(p: CouplePerson, label: string): string {
  const nature = p.dayStemNature || STEM_NATURE[p.dayStem] || ''
  return `[${label}] ${p.name} · ${p.gender}${p.birthLabel ? ` · ${p.birthLabel}` : ''}
- 명식(팔자): ${p.yearPillar} ${p.monthPillar} ${p.dayPillar} ${p.hourPillar}
- 타고난 본바탕: ${p.dayStem}${nature ? ` (${nature})` : ''}`
}

export function buildCoupleTongbyeonPrompt(
  input: CoupleTongbyeonInput,
  questions: SajuQuestion[],          // 빈 배열이면 "전체 총평"
  opts: { premium?: boolean } = {},
): string {
  const { good, care } = splitReasons(input.score)
  const relWord = input.mode === 'married' ? '부부' : '연인'

  const scoreBlock = `[두 사람의 궁합 등급 — 점수 숫자는 절대 쓰지 말 것]
- 등급: ${input.score.grade}
- 등급 의미: ${input.score.gradeDesc}
- 이 등급을 자연 비유로 감싸 전하되, 숫자는 언급하지 마세요.`

  const goodBlock = good.length
    ? `[두 사람이 잘 맞는 뿌리 — 좋은 근거]\n${good.map(g => `- ${g}`).join('\n')}`
    : `[좋은 근거] 뚜렷한 특이점은 적으나, 무난히 어울리는 조합입니다.`

  const careBlock = care.length
    ? `[조심하면 더 좋아지는 부분 — 반드시 "맞춰가면 된다"로 풀 것]\n${care.map(c => `- ${c}`).join('\n')}`
    : `[조심할 부분] 큰 걸림돌은 보이지 않습니다.`

  const hasQ = questions.length > 0

  const qBlock = hasQ
    ? questions.map((q, i) => {
        const link = opts.premium && q.detail ? q.detail : q.link
        return `${i + 1}. [${q.category} > ${q.sub}] ${q.question}\n   (명리 연결: ${link})`
      }).join('\n')
    : '(질문을 고르지 않음 → 두 사람 궁합 전체를 대략 풀어주는 총평)'

  const formatBlock = hasQ
    ? `[답변 형식 — 고른 질문만, 각 카드 3~4문단]
■ 두 사람의 큰 그림 — (한 줄 요약 제목)
   (2~3문단. 두 본바탕이 만났을 때의 큰 인상과 등급의 느낌을 자연 비유로. 숫자 없이.)

${questions.map((q) => `■ ${q.category} — (제목)\n   (3~4문단. 이 카드는 아래 명리 연결이 가리키는 부위만 주인공으로: "${q.link}". 위 좋은/조심 근거 중 이 질문에 맞는 것을 골라 풀되, 조심할 점은 맞춰가는 방향까지. 질문: ${q.question})`).join('\n')}

(마지막) 두 사람을 위한 따뜻한 응원 2~3문장. 이모지 하나로 끝.
※ 고른 질문에만 답하세요. 묻지 않은 주제는 덧붙이지 마세요.`
    : `[답변 형식 — 전체 총평, 카드로 나눠서]
■ 두 사람의 첫인상 — (한 줄 요약 제목)
   (3~4문단. 두 본바탕이 만났을 때 서로에게 어떤 존재인지, 등급의 느낌. 숫자 없이.)

■ 서로를 살리는 점 — (제목)
   (2~3문단. 좋은 근거를 자연 비유로.)

■ 함께 맞춰가면 좋은 점 — (제목)
   (2~3문단. 조심할 근거를 "달라서 채워준다·맞춰가면 된다"로.)

■ 두 사람에게 — (제목)
   (2~3문단. 앞으로 관계를 가꿔갈 방향과 응원.)

(마지막) 따뜻한 마무리 응원 2~3문장. 이모지 하나로 끝맺기.`

  return [
    SYSTEM_GUIDE,
    '',
    `[관계] ${relWord} 궁합`,
    '',
    personBlock(input.person1, '첫 번째 사람'),
    '',
    personBlock(input.person2, '두 번째 사람'),
    '',
    scoreBlock,
    '',
    goodBlock,
    '',
    careBlock,
    '',
    hasQ ? '[두 사람이 고른 질문]' : '[질문을 고르지 않았습니다 — 전체 총평]',
    qBlock,
    '',
    formatBlock,
  ].join('\n')
}
