// lib/saju/examLuck/buildExamSeven.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  합격운 — 입시 전문 7대 카테고리                                     │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★2026-07-29 대표님 기획 —
//   기존 «범용 운세 대목» 을 걷어내고 입시 전문 일곱 갈래로 다시 짭니다.
//
// ── ⚠️ 왜 «세 번 나눠» 부르는가 ────────────────────────────────────────
//   한 번에 여러 대목을 시키면 AI 가 앞의 두셋만 길게 쓰고 뒤를 안 씁니다.
//   실제로 겪은 것을 그대로 적습니다.
//       여섯 대목 한 번  →  두셋만 씀
//       세 대목 한 번    →  첫 하나만 씀
//   프롬프트를 네 번 다듬어도 같은 자리에서 실패했습니다.
//   ★대목 수가 문제가 아니라 «여러 대목을 한 번에» 가 문제입니다.
//
//   그래서 일곱을 셋으로 나눕니다. 한 묶음이 둘셋이면 다 씁니다.
//       1묶음  ① 공부 DNA   ② 과목 전략
//       2묶음  ③ 수시정시    ④ 12개월 페이스
//       3묶음  ⑤ D-Day      ⑥ 지원 전략   ⑦ 멘토링
//   ⚠️ 셋을 «나란히» 부르면 시간이 한 번 부르는 것과 비슷합니다. (화면이 병렬로)
//
// ── ⚠️ 마크다운 헤더가 아니라 ■ 를 씁니다 ─────────────────────────────
//   대표님이 «마크다운 헤더 기반» 이라 하셨는데, 이 저장소의 파서는
//   `■ 제목` 을 기준으로 자릅니다(30부 2장에 그 까닭이 적혀 있습니다).
//   `###` 를 쓰면 파서를 함께 고쳐야 하고, 옛 통변(보관함)이 깨집니다.
//   ★스트리밍·끊김 안전이라는 «뜻» 은 그대로이고 기호만 ■ 입니다.
//   ⚠️ 굳이 ### 로 가시려면 stripLead 와 isHeading 을 함께 고쳐야 합니다.

import type { ExamCard, ExamTarget } from './types'

export interface SevenArgs {
  name: string
  gender: string
  age: number
  target: ExamTarget
  /** 판정 카드 — 재료로만 씁니다 */
  cards: ExamCard[]
  saju?: Array<{ pillar: string; stem: string; branch: string }>
  hourUnknown?: boolean
  /** 폼에서 받은 것들 */
  studentGrade?: string | null
  gradeBlock?: string | null
  scoreRange?: string | null
  targetMajor?: string | null
  targetType?: string | null
  targetAcademic?: string | null
  examDate?: string | null
  /** 시험 당일 일진·월운·십성 (examDay 가 낸 것) */
  examDayNote?: string | null
  /** 올해 */
  year: number
}

/** 일곱 갈래 — 순서가 곧 리포트 차례 */
export const SEVEN = [
  { key: 'dna', title: '타고난 공부 DNA와 적성', len: '5~7문장' },
  { key: 'subject', title: '과목별 유불리와 전략 과목', len: '5~7문장' },
  { key: 'ratio', title: '수시와 정시, 나의 황금 비율', len: '5~7문장' },
  { key: 'monthly', title: '열두 달 마음 페이스메이커', len: '5~7문장' },
  { key: 'dday', title: 'D-Day 시험 당일 실전 수칙', len: '5~7문장' },
  { key: 'apply', title: '목표 대학 지원 전략', len: '5~7문장' },
  { key: 'mentor', title: '수험생과 부모님께 드리는 말', len: '6~8문장' },
] as const

export type SevenKey = typeof SEVEN[number]['key']

/** 세 묶음으로 나눈다 — 한 번에 둘셋이면 AI 가 다 씁니다 */
export const SEVEN_GROUPS: SevenKey[][] = [
  ['dna', 'subject'],
  ['ratio', 'monthly'],
  ['dday', 'apply', 'mentor'],
]

/** 갈래마다 «그 자리에서» 읽을 지시 */
function hint(key: SevenKey, v: SevenArgs): string[] {
  const L: string[] = []
  const major = v.targetMajor ? `«${v.targetMajor}»` : ''
  switch (key) {
    case 'dna':
      L.push('원국의 십성으로 «어떻게 배우는 사람인가» 를 먼저 정하세요.')
      L.push('· 이해로 뚫는 결(인성·편인) / 여러 번 돌려 쌓는 결(정인·비겁) / 문제를 풀며 익히는 결(식상·재성)')
      L.push('  셋 가운데 어디에 가까운지 한 가지로 정하고, 왜 그런지 원국으로 밝히세요.')
      if (major) L.push(`· 그 결이 ${major} 계열과 어떻게 맞물리는지 이어 주세요.`)
      break
    case 'subject':
      L.push(`${v.year}년 세운의 기운을 보고 «지금 가장 빨리 오를 과목» 을 짚으세요.`)
      if (v.scoreRange) L.push(`· 지금 성적대(${v.scoreRange})에서 올릴 수 있는 만큼으로 말하세요. 뜬구름은 안 됩니다.`)
      L.push('· 과목 이름을 구체적으로 드세요. 그리고 «공부 비중을 어떻게 나눌지» 까지.')
      L.push('· 반대로 «지금 손대면 시간만 쓰는 과목» 도 하나 짚어 주세요.')
      break
    case 'ratio':
      L.push('원국의 관성(틀을 지키는 힘)과 인성(쌓는 힘) 비율로 «수시 몇 : 정시 몇» 을 숫자로 내세요.')
      L.push('· 보기) 「수시 70 : 정시 30 으로 봅니다」 처럼 눈에 보이게.')
      L.push('· 왜 그 비율인지 원국으로 밝히세요. 숫자만 던지면 점집 말이 됩니다.')
      if (v.targetType) L.push(`· 손님은 ${v.targetType}를 목표로 하십니다. 그 길에서 카드를 어떻게 안배할지 주세요.`)
      break
    case 'monthly':
      L.push('열두 달 가운데 «가장 잘 붙는 달(골든존)» 하나와 «흔들리기 쉬운 달(위험존)» 하나를 콕 집으세요.')
      L.push('· 몇 월인지 숫자로 말하세요. 「봄쯤」 같은 말은 도움이 안 됩니다.')
      L.push('· 골든존에는 «무엇을 몰아서 할지», 위험존에는 «어떻게 버틸지» 를 주세요.')
      L.push('· 재료의 달별 흐름을 보고 정하세요. 지어내지 마세요.')
      break
    case 'dday':
      if (v.examDate) L.push(`${v.examDate} 그날의 일진 기운을 먼저 한 문장으로.`)
      L.push('· 재료의 «일진 — 천간 ○○ · 지지 ○○» 를 보고 그 십성이 이 사람에게 어떻게 작용하는지.')
      L.push('· ★그다음이 알맹이입니다. 넷을 구체적으로 주세요.')
      L.push('   1교시 입실 직후 마음을 어떻게 가라앉힐지 /')
      L.push('   어느 과목에서 실수가 나기 쉬운지와 막는 법 /')
      L.push('   시험 중 흔들릴 때 할 행동 하나 /')
      L.push('   그날 아침을 어떻게 보낼지')
      L.push('· ★간지만 나열하고 「조심입니다」 로 끝내면 안 됩니다.')
      break
    case 'apply':
      if (v.targetAcademic) L.push(`목표는 «${v.targetAcademic}» 입니다. 그 이름을 부르며 시작하세요.`)
      L.push(`· ${v.year}년 운이 «밀어 볼 때» 인지 «지켜 낼 때» 인지 분명히 말하세요.`)
      L.push('· 상향·소신·안정을 몇 대 몇으로 둘지 눈에 보이게 주세요.')
      L.push('· ⚠️ «붙는다·떨어진다» 로 단정하지 마세요. 「이 해의 기운은 이런 쪽에 힘이 붙는다」 로.')
      break
    case 'mentor':
      L.push('사주 이야기를 잠시 내려놓고, 사람 대 사람으로 맺으세요.')
      if (v.studentGrade) L.push(`· 지금 신분(${v.studentGrade})의 무게를 알아주는 말로 시작하세요.`)
      L.push('· 부모님도 함께 읽습니다. 부모님께 드리는 말도 한두 문장 넣어 주세요.')
      L.push('· ⚠️ 「더 일찍 시작했으면」·「작년에는」 같은 말을 쓰지 마세요.')
      L.push('· 끝은 응원으로. 결과를 점치지 말고, 남은 시간을 어떻게 쓸지로 맺으세요.')
      break
  }
  return L
}

const TONE = `[말투]
· 존댓말로 다정하되 담담하게. 겁주지 마세요.
· "불합격"·"떨어진다"·"안 된다" 를 쓰지 마세요.
· 어려운 한자말은 풀어 쓰세요. (관성 → 자리의 기운, 인성 → 배움의 기운)
· 재료의 점수·등급 표기를 그대로 옮기지 말고 사람 말로 푸세요.
· 마크다운(#, **, ---)을 쓰지 마세요.`

/** 학생에게 쓰면 안 되는 말 */
const STUDENT_BAN = '이직, 취업, 취준, 직장, 회사, 공무원, 사업, 승진, 전직, 팀 단위 근무, 조리사, 영양사'

/**
 * 한 묶음을 쓰는 프롬프트.
 * @param group SEVEN_GROUPS 의 한 덩이
 */
export function buildSevenPrompt(v: SevenArgs, group: SevenKey[]): string | null {
  const plan = SEVEN.filter(s => group.includes(s.key))
  if (!plan.length) return null

  const isStudent = v.target === 'student'
  // 재료는 이 묶음에 필요한 것만 — 다 실으면 프롬프트가 길어져 뒤가 얇아집니다
  const material = v.cards
    .map(c => `[${c.title}]\n` + c.reasons.map(r => `- ${r}`).join('\n'))
    .join('\n\n')

  const myeongsik = v.saju
    ?.map(p => `${p.pillar} ${p.stem === '?' ? '·' : p.stem}${p.branch === '?' ? '·' : p.branch}`)
    .join(' · ') ?? ''

  const who = [
    `${v.name}님 · 만 ${v.age}세 · ${v.gender}`,
    myeongsik ? `명식 ${myeongsik}` : '',
    v.studentGrade ? `· 학년·신분: ${v.studentGrade}` : '',
    v.scoreRange ? `· 지금 성적대: ${v.scoreRange}` : '',
    v.targetMajor ? `· 희망 계열: ${v.targetMajor}` : '',
    v.targetType ? `· 전형 목표: ${v.targetType}` : '',
    v.targetAcademic ? `· 목표 대학: ${v.targetAcademic}` : '',
    v.examDate ? `· 시험(발표) 날짜: ${v.examDate}` : '',
    v.examDayNote ? `· 그날 기운: ${v.examDayNote}` : '',
    v.hourUnknown ? '★태어난 시(時)를 모릅니다. 시주가 필요한 이야기는 단정하지 마세요.' : '',
  ].filter(Boolean).join('\n')

  return `당신은 입시를 오래 봐 온 사주 상담가입니다.
아래 «${plan.length}개 갈래만» 써 주세요. 나머지 갈래는 다른 곳에서 씁니다.

[누구를 보는가]
${who}
${isStudent ? `
★이 손님은 학생입니다. 아래 낱말을 한 번도 쓰지 마세요.
    ${STUDENT_BAN}
${v.gradeBlock ? v.gradeBlock : ''}` : ''}

[재료 — 이것만 근거로 쓰세요. 없는 것을 지어내지 마세요]
${material}

${TONE}

════════════════════════════════════════
★아래 «뼈대» 를 그대로 옮겨 쓰고 괄호 안만 채우세요.
  ■ 로 시작하는 제목 줄은 **한 글자도 바꾸지 마세요.**
  갈래를 새로 지어내거나, 더하거나, 빼지 마세요.
════════════════════════════════════════

${plan.map(s => `■ ${s.title}
[한줄] (가장 하고 싶은 말 한 문장. 스무 자 안팎)
[태그] (낱말 · 낱말 · 낱말 — 두셋, 쉬운 말로)

(본문 ${s.len}. 단락마다 빈 줄로 나눠 쓰세요.)
${hint(s.key, v).map(x => '  · ' + x).join('\n')}

[실천] (지금 바로 해볼 수 있는 일 한 문장)`).join('\n\n')}

════════════════════════════════════════
· 위 ${plan.length}개 갈래만 쓰고 끝내세요. 여는말·맺는말은 따로 쓰지 마세요.
· 괄호 ( ) 는 채워 넣으라는 뜻입니다. 괄호 자체는 답에 쓰지 마세요.
· ★문장을 반드시 마침표로 맺으세요. 중간에서 끊지 마세요.
· ★[한줄]·[태그]·[실천] 은 대괄호까지 그대로 적으세요. 화면이 그것으로 갈라 그립니다.`
}

/** 제목 → 갈래 열쇠. AI 가 제목을 조금 바꿔 써도 잡는다. */
const SEVEN_HINTS: Array<[SevenKey, string[]]> = [
  ['dday', ['D-Day', '디데이', '시험 당일', '당일 실전', '실전 수칙']],
  ['dna', ['공부 DNA', '공부 디엔에이', '타고난 공부', '학습 성향', '공부 결']],
  ['subject', ['과목', '유불리', '전략 과목']],
  ['ratio', ['수시', '정시', '황금 비율', '비율']],
  ['monthly', ['열두 달', '12개월', '페이스', '달별', '월별']],
  ['apply', ['지원 전략', '목표 대학', '눈치', '상향', '소신']],
  ['mentor', ['부모님', '멘토', '최종', '마지막', '총평']],
]

export function sevenKeyOf(title: string): SevenKey | null {
  const t = title.replace(/^■\s*/, '').replace(/\s/g, '').trim()
  for (const s of SEVEN) if (t.startsWith(s.title.replace(/\s/g, ''))) return s.key
  for (const [key, words] of SEVEN_HINTS) {
    if (words.some(w => t.includes(w.replace(/\s/g, '')))) return key
  }
  return null
}
