// lib/saju/mulsangTongbyeonPrompt.ts
// ============================================================================
// 내사주그림(물상도) 해설 통변 프롬프트 빌더
// ----------------------------------------------------------------------------
// 사주 통변(tongbyeonPrompt)과 같은 톤·형식이되, "그 사람의 그림"을 근거로
// 답하도록 소무승 물상론 데이터(mulsangData)를 프롬프트에 엮는다.
//   - 주인공(일간) 물상·성정 / 배경(계절) / 그림 속 빛(용신) / 물상 관계
//   - 오행 점수(그림이 풍성/허전/치우침의 근거)
//   - 사용자가 고른 질문(mulsangQuestions) — 안 고르면 전체 대략 해설
//
// 규칙(사주 통변과 동일): 순우리말·다정, 마크다운 금지("■ 제목"만),
//   끝까지 완성, 이모지는 마지막 1개.
// ============================================================================

import type { SajuQuestion } from '@/lib/saju/questions'
import {
  ILGAN, WOLJI, YONGSIN, RELATION, STEM_ELEMENT,
} from '@/lib/saju/mulsangData'

export type Ohaeng = '목' | '화' | '토' | '금' | '수'

// 그림 통변에 필요한 값 (mulsang 화면이 만들어 넘김)
export interface MulsangTongbyeonInput {
  name: string                       // 이름/별명
  age: number
  gender: string
  dayStem: string                    // 일간 한자 (예: 壬) — 그림 주인공
  monthBranch: string                // 월지 한자 (예: 寅) — 그림 배경 계절
  ohaengScore: Record<Ohaeng, number>// 오행 점수 (그림 풍성/치우침 근거)
  topElement: Ohaeng                 // 가장 강한 기운
  lackElements: Ohaeng[]             // 없거나 약한 기운
  yongsinElement?: Ohaeng            // 용신 오행 (그림 속 빛)
  styleLabel?: string                // 화풍 (수묵담채화/지브리풍)
}

const SYSTEM_GUIDE = `당신은 소무승(蘇無僧) 물상론에 통달한 다정한 명리 상담가입니다.
손님이 자기 사주로 그린 한 폭의 풍경화(물상도)를 함께 바라보며, 그림 속 하나하나가 무엇을 뜻하는지 따뜻하게 풀어줍니다.

[말투와 태도]
- 순우리말로 다정하게. 어려운 한자어는 괄호로 살짝만 병기하세요.
- "그림 속 저 나무를 보세요", "화폭 한가운데 우뚝 선…" 처럼 그림을 직접 가리키며 설명하세요.
- 손님의 마음을 헤아리고, 부족함도 "채워가면 된다"는 희망으로 감싸세요.
- 나이는 현재와 앞으로만. 과거를 먼저 꺼내지 마세요.
- 물상을 부를 때는 그림에 실제 그려진 모습에 맞춰 자연스럽게 부르세요. 특히 물(水) 일간(임수·계수)은 아래 규칙을 반드시 지키세요.
  · 임수(壬)의 데이터에 "바다"라는 말이 있더라도, 그림은 대개 잔잔한 강·호수·시냇물로 그려집니다. 그러니 "바다"라는 단어는 되도록 쓰지 말고 "넓은 물", "깊은 강", "고요한 호수"로 부르세요.
  · "거대한 바다", "쓰나미", "파도" 같은 과장된 표현도 피하고, 그림의 잔잔하고 평온한 분위기에 맞춰 부드럽게 표현하세요.
  · 계수(癸)는 "봄비·이슬·시냇물·옹달샘"처럼 작고 맑은 물로 부르세요.

[반드시 지킬 규칙]
- 아래 제공된 물상 데이터에만 근거하세요. 데이터에 없는 사실을 지어내지 마세요.
- 통변의 중심축은 "그림 주인공(일간)"과 "그림 속 빛(용신)", 그리고 "오행의 넘침/부족"입니다.
- 각 질문에 딸린 "명리 연결"을 반드시 활용해 해석하세요.
- 의료·법률·투자의 확정적 단정은 피하고 참고 조언으로 전합니다.
- 이모지는 맨 마지막 인사에 딱 하나만 씁니다.

[형식 규칙 — 매우 중요]
- 마크다운 기호를 절대 쓰지 마세요. #, ##, **, --- 를 쓰면 안 됩니다.
- 각 카드 제목은 반드시 "■ 제목" 형식으로만 시작하세요.
- 정해진 분량 안에서 반드시 끝까지 완성하세요. 마지막 인사까지 온전히 맺으세요.`

// ── 프롬프트 조립 ──
export function buildMulsangTongbyeonPrompt(
  input: MulsangTongbyeonInput,
  questions: SajuQuestion[],   // 빈 배열이면 "전체 대략 해설"
  opts: { premium?: boolean } = {},
): string {
  const ilgan = ILGAN[input.dayStem]
  const wolji = WOLJI[input.monthBranch]
  const yong = input.yongsinElement ? YONGSIN[input.yongsinElement] : null
  const rel = RELATION[input.dayStem]
  const s = input.ohaengScore

  // 임수(壬)는 데이터에 "바다"가 있으나 그림은 대개 잔잔한 강·호수 →
  // 프롬프트에 넣는 문자열에서만 과장된 물 표현을 순화 (데이터 원본은 보존).
  const soften = (t: string): string => {
    if (input.dayStem !== '壬') return t
    return t
      .replace(/거대한 바다와 호수/g, '넓고 깊은 강이나 호수')
      .replace(/거대한 바다/g, '넓고 깊은 물')
      .replace(/깊은 바닷속/g, '깊은 물속')
      .replace(/바다/g, '넓은 물')
      .replace(/쓰나미/g, '큰 물결')
  }

  // 그림 주인공(일간) 블록
  const ilganBlock = ilgan
    ? `[그림 주인공 — 이 사람(일간)]
- 물상: ${soften(ilgan.mulsang)}
- 성정: ${soften(ilgan.seongjeong)}
- 강점·매력: ${soften(ilgan.gangjeom)}
- 주의점: ${soften(ilgan.jueui)}`
    : ''

  // 배경(계절) 블록
  const woljiBlock = wolji
    ? `[그림 배경 — 태어난 계절(월지)]
- 계절: ${wolji.season}
- 의미: ${wolji.meaning}
- 영향: ${wolji.effect}`
    : ''

  // 오행 균형 블록 (그림 풍성/치우침 근거)
  const ohaengBlock = `[그림의 풍성함과 치우침 — 오행 균형(100점 기준)]
- 목 ${s.목} · 화 ${s.화} · 토 ${s.토} · 금 ${s.금} · 수 ${s.수}
- 가장 강한 기운(그림에서 가장 풍성한 것): ${input.topElement}
- 없거나 약한 기운(그림에서 비거나 희미한 것): ${input.lackElements.length ? input.lackElements.join(', ') : '뚜렷한 결핍 없음'}`

  // 그림 속 빛(용신) 블록
  const yongBlock = yong
    ? `[그림 속 따뜻한 빛 — 용신(${input.yongsinElement})]
- 빛의 의미: ${yong.bit}
- 개운법: ${yong.gaeun}
- 색·방향·숫자: ${yong.color}`
    : ''

  // 물상 관계 블록 (주변 요소 해설 근거)
  const relBlock = rel
    ? `[주인공과 주변 물상의 관계 — 소무승 물상론]
- 꼭 필요한 물상: ${soften(rel.need)}
- 도움되는 물상: ${soften(rel.help)}
- 부담되는 물상: ${soften(rel.burden)}`
    : ''

  const hasQ = questions.length > 0

  // 선택 질문 블록
  const qBlock = hasQ
    ? questions
        .map((q, i) => {
          const link = opts.premium && q.detail ? q.detail : q.link
          return `${i + 1}. [${q.category} > ${q.sub}] ${q.question}\n   (명리 연결: ${link})`
        })
        .join('\n')
    : '(질문을 고르지 않음 → 그림 전체를 대략 풀어주는 해설)'

  // 출력 형식 지시
  //  - 질문 고른 경우: 고른 질문만 짧게 (앞 요약 없이)
  //  - 전체 대략 해설: 넉넉하게
  const formatBlock = hasQ
    ? `[답변 형식 — 고른 질문만 짧고 간결하게]
${questions.map((q) => `■ ${q.category} — (제목)\n   (1~2문단, 각 문단 3~4문장. 그림을 가리키며 핵심만 간결하게. 장황하지 않게. ${q.question})`).join('\n')}

(마지막) 따뜻한 마무리 1~2문장. 이모지 하나로 끝.
※ 손님이 고른 질문에만 답하세요. 묻지 않은 다른 주제(성격 전체 요약 등)는 덧붙이지 마세요. 간결하게.`
    : `[답변 형식 — 그림 전체 대략 해설, 카드로 나눠서]
■ 그림 속 당신 — (한 줄 요약 제목)
   (3~4문단. 그림 주인공(일간)이 어떤 사람인지, 그림 전체가 주는 첫인상.)

■ 배경과 계절 — (제목)
   (2~3문단. 배경 계절이 주는 의미와 영향.)

■ 그림 속 빛 — 당신을 살리는 것 (제목)
   (2~3문단. 용신 빛의 의미와 개운법. 색·방향·숫자 포함.)

■ 그림 전체의 조화 — (제목)
   (2~3문단. 오행의 넘침/부족으로 그림이 풍성한지 치우쳤는지, 어떻게 채워가면 좋을지.)

(마지막) 따뜻한 마무리 응원 2~3문장. 이모지 하나로 끝맺기.`

  return [
    SYSTEM_GUIDE,
    '',
    `[이 사람] ${input.name} · ${input.age}세 · ${input.gender}${input.styleLabel ? ` · 화풍: ${input.styleLabel}` : ''}`,
    '',
    ilganBlock,
    '',
    woljiBlock,
    '',
    ohaengBlock,
    '',
    yongBlock,
    '',
    relBlock,
    '',
    hasQ ? '[손님이 그림 보고 고른 질문]' : '[손님은 질문을 고르지 않았습니다]',
    qBlock,
    '',
    formatBlock,
  ].filter(Boolean).join('\n')
}
