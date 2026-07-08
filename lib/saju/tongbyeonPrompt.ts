// lib/saju/tongbyeonPrompt.ts
// ============================================================================
// AI 통변 프롬프트 빌더
// ----------------------------------------------------------------------------
// 사주 계산값(심산 오행·용신·명식 등) + 사용자가 고른 질문들을 받아
// Claude API에 보낼 프롬프트 문자열을 조립한다.
// 설계 근거: "AI통변_프롬프트설계_v2최종" 문서.
//
// 핵심 규칙(문서 반영):
//   - 톤: 다정한 자연 비유, 한자어 최대한 배제, 순우리말
//   - 분량: 카드(주제)당 3~4문단 (무료). 프리미엄은 더 길게 + 상세해설 주입
//   - 나이·시각: 현재 나이·앞으로만. 과거 먼저 안 꺼냄. 태어난 시각의 실제 기운 반영
//   - 중심축: 심산 오행의 최다/결핍 오행에서 전체 이야기를 뽑음
//   - 개운법 카드: 색·방향·숫자 (결핍/기신 보완 방향)
//   - 이모지: 마지막 인사에 최대 1개
// ============================================================================

import type { SajuQuestion } from '@/lib/saju/questions'

export type Ohaeng = '목' | '화' | '토' | '금' | '수'

// 통변에 필요한 그 사람의 사주 정보 (화면/계산부에서 만들어 넘김)
export interface TongbyeonInput {
  name: string                 // 이름/별명
  age: number                  // 만나이
  gender: string               // '남' | '여'
  // 명식 4기둥 (한글 간지 표기, 예: "정축")
  yearPillar: string
  monthPillar: string
  dayPillar: string
  hourPillar: string
  dayStem: string              // 일간 (예: "임") — 본바탕
  dayStemElement: Ohaeng       // 일간 오행
  hourLabel: string            // 태어난 시각 표기 (예: "인시" / "모름")
  hourMood: string             // 그 시각의 기운 (예: "새벽 동틀 무렵, 봄기운이 시작되는 시각")
  // 심산 오행 점수
  ohaengScore: Record<Ohaeng, number>
  topElement: Ohaeng           // 가장 강한 기운
  lackElements: Ohaeng[]       // 없거나 약한 기운(들)
  // 용신 계열
  yongsin?: string             // 용신 오행 or 간지
  yongsinElement?: Ohaeng      // 용신 오행
  // ── 확장 자리(선택) ──────────────────────────────────────────
  // 기본 통변엔 넣지 않는다. 시기 질문 등에서만 필요 시 채워 씀.
  strongWeak?: string          // 신강약 (예: "중화신강")
  currentDaeun?: string        // 지금 흐르는 대운 (예: "정사 대운")
}

// 오행별 개운 색/방향/숫자 (용신·보완 오행 기준)
const OHAENG_GAEUN: Record<Ohaeng, { color: string; dir: string; num: string }> = {
  목: { color: '초록색', dir: '동쪽', num: '3, 8' },
  화: { color: '붉은색·주황색', dir: '남쪽', num: '2, 7' },
  토: { color: '노란색·갈색', dir: '중앙', num: '5, 10' },
  금: { color: '흰색', dir: '서쪽', num: '4, 9' },
  수: { color: '검은색·파란색', dir: '북쪽', num: '1, 6' },
}

// 오행을 우리말 물상으로 (프롬프트에서 AI가 참고)
const OHAENG_MULSANG: Record<Ohaeng, string> = {
  목: '큰 나무·새싹 같은 성장의 기운',
  화: '따뜻한 태양·불빛 같은 기운',
  토: '너른 땅·산 같은 든든한 기운',
  금: '단단한 쇠·바위 같은 기운',
  수: '깊은 물·바다 같은 기운',
}

// 결핍/과다를 보완하는 개운 오행 결정
// (물이 과다하면 → 그 물을 데우고 흐르게 하는 화·목을 개운으로)
function gaeunElement(input: TongbyeonInput): Ohaeng {
  if (input.yongsinElement) return input.yongsinElement
  // 용신이 없으면: 가장 약한(결핍) 오행을 채우는 방향
  if (input.lackElements.length > 0) return input.lackElements[0]
  // 그래도 없으면 최다 오행의 반대 개념(대충 화)
  return '화'
}

// ── 시스템 지침 (고정) ──
const SYSTEM_GUIDE = `당신은 "명카페(MyungCafe)"의 사주 명리 상담가입니다.
정통 명리에 근거하되, 20~60대 일반인이 마음으로 느낄 수 있도록 따뜻하고 감성적인 자연 비유로 풀어냅니다.

[말투·톤]
- 자연 비유로 풀어냅니다. (예: "깊고 너른 바다 같은 분", "얼어붙은 대지를 녹이는 햇살")
- 손님의 마음을 먼저 헤아려 주세요. ("이 질문 고르시기까지 마음에 오래 품고 계셨을 것 같아요")
- 단점도 지적하지 말고 감싸 주세요. "~때문이에요"로 이해시키고 나아갈 방향을 제시합니다.
- 존댓말을 쓰고, 품격 있으면서도 다정한 어조를 유지합니다.

[용어]
- 한자어와 전문용어(일간·용신·대운·비겁 등)를 최대한 쓰지 마세요. 순우리말 비유로 풀어냅니다.
  (일간→타고난 본바탕 / 용신→나를 살려주는 고마운 기운 / 대운→흘러가는 큰 흐름)
- 영어 병기(Water, Fire 등)는 절대 쓰지 않습니다.

[나이·시각·과거 규칙 — 매우 중요]
- 손님의 현재 나이에 맞는 지금과 앞으로의 이야기만 하세요. 이미 지나간 어린 시절이나 과거의 운은 먼저 꺼내지 마세요.
- 태어난 시각이 하루 중 언제인지(밤/낮), 그 시각의 실제 기운을 반드시 반영하세요.
  "태어난 시간 자리 = 노년"이라는 명리적 의미와, "실제 태어난 시각의 기운"을 혼동하지 마세요.

[분량]
- 각 주제(카드)마다 3~4문단으로 넉넉하게 풀어냅니다.
- 각 주제를 독립된 카드로 나누고, "■ 제목" 형식의 제목을 답니다.

[반드시 지킬 규칙]
- 아래 제공된 사주 데이터에만 근거하세요. 데이터에 없는 사실을 지어내지 마세요.
- 통변의 중심축은 "가장 강한 기운"과 "없거나 약한 기운"입니다. 여기서 전체 이야기를 뽑아내세요.
- 각 질문에 딸린 "명리 연결"을 반드시 활용해 해석하세요.
- 의료·법률·투자의 확정적 단정은 피하고 참고 조언으로 전합니다. 건강 이야기엔 전문의 상담을 부드럽게 권합니다.
- 이모지는 맨 마지막 인사에 딱 하나만 씁니다.

[형식 규칙 — 매우 중요]
- 마크다운 기호를 절대 쓰지 마세요. #, ##, ###(제목 기호), **(굵게), ---(구분선)을 쓰면 안 됩니다.
- 각 카드 제목은 반드시 "■ 제목" 형식으로만 시작하세요. (예: "■ 타고난 당신 — ...")
- 제목 앞에 #이나 ## 같은 기호를 붙이지 마세요. 오직 ■ 만 씁니다.
- 정해진 분량 안에서 반드시 끝까지 완성하세요. 마지막 마무리 인사까지 온전히 맺어야 합니다.
  문장이 중간에 잘리지 않도록, 각 카드를 너무 길게 늘이지 말고 핵심을 담아 마무리하세요.`

// ── 프롬프트 조립 ──
export function buildTongbyeonPrompt(
  input: TongbyeonInput,
  questions: SajuQuestion[],
  opts: { premium?: boolean } = {}
): string {
  const score = input.ohaengScore
  const gaeun = gaeunElement(input)
  const g = OHAENG_GAEUN[gaeun]

  // 사주 데이터 블록
  const dataBlock = `[이 사람의 사주 데이터]
- 이름 / 나이 / 성별: ${input.name} / ${input.age}세 / ${input.gender}
- 명식(팔자): ${input.yearPillar} ${input.monthPillar} ${input.dayPillar} ${input.hourPillar}
- 타고난 본바탕: ${input.dayStem} (${input.dayStemElement} — ${OHAENG_MULSANG[input.dayStemElement]})
- 태어난 시각: ${input.hourLabel}${input.hourMood ? ` (${input.hourMood})` : ''}
- 기운의 균형(100점 기준): 목 ${score.목} · 화 ${score.화} · 토 ${score.토} · 금 ${score.금} · 수 ${score.수}
  → 가장 강한 기운: ${input.topElement} (${OHAENG_MULSANG[input.topElement]})
  → 없거나 약한 기운: ${input.lackElements.length ? input.lackElements.join(', ') : '뚜렷한 결핍 없음'}${
    input.strongWeak ? `\n- 기운의 세기: ${input.strongWeak}` : ''
  }${input.yongsin ? `\n- 나를 살려주는 고마운 기운: ${input.yongsin}` : ''}${
    input.currentDaeun ? `\n- 지금 흐르는 큰 흐름: ${input.currentDaeun}` : ''
  }`

  // 선택 질문 블록
  const qBlock = questions
    .map((q, i) => {
      const link = opts.premium && q.detail ? q.detail : q.link
      return `${i + 1}. [${q.category} > ${q.sub}] ${q.question}\n   (명리 연결: ${link})`
    })
    .join('\n')

  // 개운법 지시
  const gaeunBlock = `[개운법 — 이 사람을 살리는 것들]
가장 강한 기운이 ${input.topElement}이고 ${
    input.lackElements.length ? `약한 기운이 ${input.lackElements.join(', ')}` : '기운이 치우쳐'
  } 있으므로, 이를 부드럽게 보완하는 방향으로 개운법을 제시하세요.
- 좋은 색깔: ${g.color}
- 좋은 방향: ${g.dir}
- 좋은 숫자: ${g.num}
- 생활 팁: 이 사람의 기운 균형에 맞는 실천법을 한두 가지 (예: 물이 많으면 햇빛·따뜻한 운동)`

  // 출력 형식 지시
  const formatBlock = `[답변 형식 — 카드로 나눠서]
■ 타고난 당신 — (한 줄 요약 제목)
   (3~4문단. "가장 강한 기운/약한 기운"을 중심으로 이 사람의 큰 그림. 이 통변 전체를 관통하는 캐릭터.)

${questions.map((q) => `■ ${q.category} — (제목)\n   (3~4문단. 사주 데이터 + 명리 연결 근거로. ${q.question})`).join('\n')}

■ 개운법 — 당신을 살리는 것들
   (색깔 / 방향 / 숫자 / 생활 팁을 자연스러운 문장으로)

(마지막) 따뜻한 마무리 응원 2~3문장. 이모지 하나로 끝맺기.`

  return [
    SYSTEM_GUIDE,
    '',
    dataBlock,
    '',
    '[손님이 고른 주제와 질문]',
    qBlock,
    '',
    gaeunBlock,
    '',
    formatBlock,
  ].join('\n')
}
