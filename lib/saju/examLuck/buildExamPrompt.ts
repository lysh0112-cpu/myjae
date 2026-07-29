// lib/saju/examLuck/buildExamPrompt.ts
//
// 합격운·취업운 통변 프롬프트 + 파서
// ★진로적성 buildCareerPrompt.ts 를 그대로 본떴다. (작업지시 9장)
//
// ── 반드시 지킬 다섯 (30부에서 데어 가며 얻은 것) ──────────────────
//   ① 목차에 번호를 붙이지 않는다. "1. ■ 제목" 으로 보여 주면 AI 가 번호를 따라 쓰고
//      파서가 통째로 깨진다. (교훈 BH — 예시가 지시를 이긴다)
//   ② 파서는 ■ 앞의 ** · 숫자 · # · - 를 걷어내고 판별한다. (stripLead)
//   ③ 구분선(---)을 금지하고, 파서에서도 걸러 낸다.
//   ④ 재료에 넣어 두고 "쓰지 마세요" 라고 하면 새어 나온다. 못 쓰게 하려면 재료에서 뺀다. (교훈 BF)
//   ⑤ 내부 점수를 "9.8점" 으로 주면 그대로 화면에 나간다. 쓸 수 없게 생기게 한다. (교훈 BG)

import type { ExamCard, ExamTarget } from './types'
import { CLOSING, CLOSING_STUDENT, CLOSING_SRC } from './tables/rules'

/** 대목 차례 — 화면 카드와 1:1 */
// ★2026-07-28 — 교재 자료는 jaryoPick 단일 창구에서만 받는다. (교훈 BQ)
import { salBrief, pick } from '../jaryoPick'

export const ORDER: Array<{ key: string; title: string; len: string }> = [
  { key: 'years', title: '앞으로의 흐름', len: '4~6문장' },
  { key: 'dayun', title: '지금의 흐름', len: '3~4문장' },
  { key: 'examkind', title: '어떤 시험에 힘이 실리나', len: '3~4문장' },
  // ★2026-07-29 — 「시험 날짜를 짚어 보면」을 «실전 전략» 카드로 키웠습니다. (대표님 지시)
  //   [무엇이 문제였나] «丙午년으로 조심입니다. 그달은 己亥월, 그날은 癸巳일입니다» 로
  //     날짜만 나열하고 끝나 손님이 «그래서 어쩌라고» 하게 됐습니다.
  //   ⚠️ 따로 만들었던 'dday' 대목을 없앴습니다. 이 카드와 겹쳐 AI 가 하나만 썼습니다.
  //      대목이 둘이면 AI 는 둘 중 하나에만 씁니다. 자리를 나누지 말고 하나를 키웁니다.
  { key: 'examday', title: '시험 날짜와 실전 준비', len: '5~7문장' },
  { key: 'highschool', title: '고교 선택', len: '2~3문장' },
  { key: 'susi', title: '수시와 정시', len: '2~3문장' },
  { key: 'jobchange', title: '이직과 직업 변동', len: '4~5문장' },
]

export interface BuildExamPromptArgs {
  /** ★2026-07-28 — 명식 네 기둥. 있으면 학문 관련 살을 재료에 얹는다 */
  saju?: Array<{ pillar: string; stem: string; branch: string }>
  /** ★2026-07-28 — 오행 점수. 있으면 과다·부족 자료를 얹는다 */
  ohaengScore?: Record<string, number>
  name: string
  gender: string
  age: number
  target: ExamTarget
  cards: ExamCard[]
  hourUnknown?: boolean
  /**
   * ★2026-07-29 — 초입 폼에서 고른 것들. (대표님 지시)
   *
   *   [무엇이 문제였나] 초입에서 [시험·합격운]/[취업운], 시험 종류, 날짜를 고르는데
   *     **그 셋이 프롬프트까지 안 왔습니다.** 화면 URL 에는 있었지만
   *     buildExamPrompt 인자에 자리가 없어 결과 화면에서 버려졌습니다.
   *     그래서 2012년생 학생에게도 공무원·이직 이야기가 나갔습니다.
   *   ⚠️ 없으면 예전처럼 돕니다. 하위 호환입니다.
   */
  kind?: 'exam' | 'job'
  examKind?: string | null
  /** YYYY-MM-DD */
  examDate?: string | null
  /** 시험 당일 판정 (일진·공망) — examDay.ts 가 낸 것 */
  examDayNote?: string | null
  /**
   * ★2026-07-29 — 학생이 고른 목표 (2단 드롭다운). 대표님 지시.
   *   targetPromptBlock() 이 이미 문장으로 짜 준 것을 받습니다.
   *   ⚠️ 여기서 다시 표를 뒤지지 않습니다. 짜는 곳은 studentTarget 한 곳입니다.
   */
  targetBlock?: string | null
  /**
   * ★2026-07-29 — 학년·신분에 따른 결. (대표님 지시)
   *   GRADE_PROMPT 가 이미 문장으로 짜 준 것을 받습니다.
   *   ⚠️ 초등학생에게 «수능 당일 멘탈» 을 말하지 않게 하는 자리입니다.
   */
  gradeBlock?: string | null
  /** 나이와 고른 학년이 어긋나는가 — 어긋나면 학년을 따르라고 알린다 */
  gradeMismatch?: boolean
  /** ★고1 이상에게 물은 «지금 성적대·희망 계열» */
  levelTrack?: string | null
  /**
   * ★2026-07-29 — 조건이 겹칠 때만 붙는 지시. (대표님 지시)
   *   [N수생 + 상위권 + 성적대 + 계열] 같은 조합에서만 나오는 말을 만드는 자리입니다.
   *   ⚠️ 안 걸리면 빈 문자열이라 프롬프트가 안 길어집니다.
   */
  conditional?: string | null
}

export function buildExamPrompt(v: BuildExamPromptArgs): string {
  const plan = v.cards
    .map(c => ORDER.find(o => o.key === c.key))
    .filter(Boolean) as typeof ORDER

  const material = v.cards.map(c => {
    const o = ORDER.find(x => x.key === c.key)
    return `[${o?.title ?? c.title}]\n` + c.reasons.map(r => `- ${r}`).join('\n')
  }).join('\n\n')

  // ★2026-07-28 — 학문에 관계된 살만 재료로 얹는다 (교재 96~97쪽).
  //   문창성·천을귀인은 학문과 인복의 자리라 합격운에 바로 닿는다.
  //   ⚠️ 대목(카드)을 새로 만들지 않는다. 재료 뒤에 사실로만 붙인다.
  const salLines = v.saju?.length
    ? salBrief(v.saju, v.target, false, ['munchang', 'cheoneulgwiin', 'hyeonchim'])
    : []
  const salBlock = salLines.length
    ? `\n\n[타고난 살 — 교재 94~97쪽. 학문에 닿는 것만 골랐습니다]\n` +
      salLines.map(t => `- ${t}`).join('\n')
    : ''

  // ★2026-07-28 — 일간·오행·형을 재료에 얹는다.
  //   일간은 "이 사람이 누구인가" 라 어떤 답에도 밑바탕이 된다.
  //   오행 과다·부족은 공부를 어떻게 밀고 가야 하는지에 닿는다.
  //   형(刑)은 업상대체를 말하는 자리라 시험 종류를 고를 때 쓸모가 있다.
  const dayStem = v.saju?.find(p => p.pillar === '일주')?.stem ?? ''
  // ★2026-07-28 — 교재 자료는 jaryoPick 단일 창구에서만 받는다.
  //   교재 117쪽: "관성이 많으면 남을 많이 의식한다. 합격운, 취업운에도 유리하다"
  //   교재 130쪽: 학업 상승운은 인성운·식상운, 하락운은 비겁운·재성운
  // ★2026-07-29 — 학생에게 «취업» 갈래를 주면 재료부터 어른 말이 섞입니다.
  //   재료에 있으면 AI 가 꺼내 씁니다. (교훈 BF)
  const bookLines = pick({
    serviceType: 'exam',
    questionCategories: v.target === 'student' ? ['학업'] : ['취업'],
    ctx: { saju: v.saju, dayStem, score: v.ohaengScore ?? undefined, target: v.target },
  }).lines

  const bookBlock = bookLines.length
    ? `\n\n[타고난 결 — 교재 20~47·87~93쪽]\n` + bookLines.map(t => `- ${t}`).join('\n')
    : ''

  const closing = (v.target === 'student' ? CLOSING_STUDENT : CLOSING).join(' ')

  const isStudent = v.target === 'student'
  /** ★리포트 이름부터 갈라야 합니다. 학생에게 «취업운» 이라 부르면 그 순간 결이 어긋납니다. */
  const reportName = isStudent ? '시험·합격운' : (v.kind === 'job' ? '취업운' : '합격운·취업운')

  /**
   * ★2026-07-29 — 학생에게 금지할 말. (대표님 지시 — Hard Ban)
   *   [왜] 재료를 학업 쪽으로 바꿔도 AI 가 «취업», «면접» 을 스스로 끌어옵니다.
   *        모델이 «합격운» 이라는 말에서 취업을 연상하기 때문입니다.
   *        그래서 낱말을 못박아 금지합니다.
   */
  const BAN = '이직, 취업, 취준, 직장, 회사, 공무원, 사업, 승진, 전직, 면접, 팀 단위 근무, 조리사, 영양사, 자격증 취득'

  /** 초입 폼에서 고른 것 — 있으면 프롬프트에 못박는다 */
  const formBlock = [
    v.examKind ? `· 손님이 고른 시험: ${v.examKind}` : '',
    v.examDate ? `· 시험(또는 발표) 날짜: ${v.examDate}` : '',
    v.examDayNote ? `· 그날의 기운: ${v.examDayNote}` : '',
    v.targetBlock || '',
    v.levelTrack || '',
  ].filter(Boolean).join('\n')

  return `당신은 사주 상담을 오래 해 온 따뜻한 어른입니다.
${v.name}님(${v.age}세 ${v.gender})의 ${reportName}을 풀어 주세요.
${formBlock ? `\n[손님이 고른 것 — 반드시 반영하세요]\n${formBlock}\n` : ''}${
  isStudent ? `
[★★가장 중요 — 이 손님은 «학생»입니다]
· 내신·수능·입시(수시/정시)·특목고/자사고·공부 환경·집중력을 중심으로 쓰세요.
· 아래 낱말을 **한 번도 쓰지 마세요.** 하나라도 쓰면 답이 잘못된 것입니다.
    ${BAN}
· «합격» 은 오직 시험 합격을 뜻합니다. 일자리 이야기가 아닙니다.
· 부모가 함께 읽습니다. 성적이나 형편을 탓하는 말로 들리지 않게 하세요.
${v.gradeBlock ? `
[★학년·신분에 맞춰]
${v.gradeBlock}${v.gradeMismatch ? `
· ⚠️ 만 나이와 고른 학년이 어긋납니다. **손님이 고른 학년을 따르세요.**
  조기 입학·유예·검정고시 등 사정이 있을 수 있습니다. 나이를 들먹이지 마세요.` : ''}
` : ''}` : `
[★이 손님은 «성인»입니다]
· 대기업·공기업·공무원 시험, 승진, 전문 자격, 이직, 면접, 커리어 관리를 중심으로 쓰세요.
· 입시·내신·수시정시 같은 학생 이야기는 쓰지 마세요.
`}

[말투]
· 존댓말로, 다정하고 담담하게. 겁주지 마세요.
· 어려운 한자말은 풀어 쓰세요. (관성 → 자리의 기운, 인성 → 배움의 기운)
${v.target === 'student' ? `· 이 사람은 미성년일 수 있고, 부모가 함께 읽습니다.
· 아이의 성품을 나무라듯 말하지 마세요. "이런 결이니 이렇게 도와주시면 좋겠다" 로.
· 성적이나 형편을 탓하는 말로 들리지 않게 하세요.` : ''}

[★합격운에서 가장 조심할 것]
· "불합격", "떨어진다", "안 된다" 같은 말을 절대 쓰지 마세요.
· 힘이 덜 실리는 해도 "이 해는 다지는 때" 로 전하세요.
· 등급(아주 좋음·조심 등)을 그대로 옮겨 적지 말고 사람 말로 풀어 쓰세요.

${v.examDate ? `[★「시험 날짜와 실전 준비」 카드는 이렇게 쓰세요]
· 날짜와 간지만 나열하고 끝내지 마세요. 그건 사실이지 도움이 아닙니다.
· 차례는 이렇습니다.
  ① ${v.examDate} 그날이 세운·월운·일진으로 어떤 결인지 «한 문장» 으로.
  ② 그 결이 이 사람에게 어떻게 작용하는지 — 몰아치는 날인지, 가라앉는 날인지.
  ③ 그래서 **그날 아침을 어떻게 보내면 좋은가** (일어나는 때, 먹는 것, 가는 길).
  ④ **시험 중 집중이 흐트러질 때 무엇을 하면 되는가** (호흡, 시선, 문제 넘기는 요령).
  ⑤ **마음이 흔들릴 때 붙잡을 한마디.**
· ★③④⑤가 이 카드의 알맹이입니다. 그날 바로 쓸 수 있는 것으로 구체적으로 쓰세요.
· 공망이 걸렸다면 겁주지 말고 «기운이 비는 날이니 이렇게 채우자» 로 풀어 주세요.
· "조심입니다" 로 끝내지 마세요. 조심할 것이 있으면 «어떻게» 조심할지까지 주세요.

` : ''}[★★목표를 반드시 «이름 그대로» 부르세요 — 가장 중요]
· 손님이 목표를 적어 주셨습니다. 위 [손님이 고른 것] 에 있습니다.
· **아래 세 자리에서 그 이름을 그대로 불러야 합니다.**
    ① 여는말 — 「${v.name}님이 목표하시는 ○○를 향해…」 처럼 첫 문장부터.
    ② 「수시와 정시」(또는 그에 해당하는 대목) — 그 목표 기준으로 말하세요.
    ③ 맺는말 — 다시 한 번 이름을 불러 주며 맺으세요.
· ★«목표하시는 곳»·«원하시는 학교» 같은 두루뭉술한 말로 대신하지 마세요.
  손님이 적어 준 그 낱말을 그대로 쓰는 것이 이 리포트의 값입니다.
· 성적대·희망 계열을 적어 주셨으면 그것도 한 번은 언급하세요.
· 그 목표에 «쓰이는 힘» 이 이 사람에게 지금 어떤지 짚어 주세요.
  ⚠️ «있으니 붙는다»·«없으니 어렵다» 로 단정하지 마세요.
     «이 힘을 이렇게 쓰면 좋겠다» 로 말합니다. 결과를 점치는 자리가 아닙니다.

${v.conditional ? v.conditional + '\n\n' : ''}[★「어떤 공부·시험에 힘이 실리나」 카드는 이렇게 맺으세요]
· 십성마다 «이런 시험에 힘이 실린다» 를 나열하는 것으로 끝내지 마세요.
  그건 누구에게나 같은 일반론이라 읽어도 남는 것이 없습니다.
· **마지막에 반드시 이 사람의 결론을 한 문장 더 붙이세요.**
    「그 가운데 ${new Date().getFullYear()}년 ${v.name}님에게는 ○○ 기운이 가장 세게 듭니다.
      그러니 ○○ 쪽에 힘을 쓰시면 가장 잘 붙습니다.」
· 어느 기운이 센지는 [앞으로의 흐름] 재료의 올해 줄을 보고 정하세요.

[★「수시와 정시」 카드는 사주 근거를 붙이세요]
· «수시가 맞습니다» 로 끝내지 마세요. 왜 그런지가 없으면 점집 말과 다르지 않습니다.
· **원국의 무엇 때문인지를 한 줄 더 쓰세요.**
    「원국에 관성과 인성이 서로를 살려 주는 결이라, 한 번에 겨루는 정시보다
      꾸준히 쌓아 보여 주는 수시 쪽이 이 아이의 체질에 맞습니다.」
· 손님이 이미 목표(수시/정시)를 골랐다면 «둘 중 고르라» 고 하지 마세요.
  고른 쪽을 기준으로 «그 길에서 무엇을 살리면 좋은가» 를 말하세요.

[반드시 지킬 것]
· 아래 재료에 없는 것을 지어내지 마세요.
· ★오늘은 ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월입니다.
  ${new Date().getFullYear() - 1}년처럼 이미 지나간 해를 앞일처럼 말하지 마세요.
· 재료의 [내부] 표기나 점수 숫자는 글에 쓰지 마세요. 교재에 없는 수치입니다.
· 재료를 목록으로 나열하지 말고 문장 속에 녹이세요.
· 대목 사이에 --- 같은 구분선을 넣지 마세요.

[★맺음말 — ${CLOSING_SRC}]
· 글 마지막에 반드시 이 뜻을 담아 주세요. 그대로 베끼지 말고 앞말과 이어지게 풀어 쓰세요.
  「${closing}」

[★풀이의 결 — 세 걸음으로 이어 쓰세요]
1) 타고난 «공부 체질» 을 먼저 짚습니다.
   일간과 식상·관성·인성의 움직임으로 «이 사람이 어떻게 배우고 어떻게 시험을 치르는가» 를 정합니다.
   예) "戊土 일간이 지지에 申金 식신을 두어, 외워서 쌓기보다 이해로 뚫는 결입니다."
2) 그 결이 «올해·이 대운» 을 만나 어떻게 달라지는지 잇습니다.
   관인상생·식상제살·용신 작용·조후처럼 «맞물림» 을 말하세요. 사건 나열이 아닙니다.
3) 그래서 «무엇을 어떻게 준비할지» 를 넷으로 줍니다.
   ① 어떤 시험·전형이 맞는가  ② 공부 환경을 어떻게 두는가
   ③ 실전에서 마음을 어떻게 잡는가  ④ 결정·지원의 때는 언제인가
· ★십성 이름과 직업·시험을 1:1로 짝짓지 마세요. ("인성이 있으니 ○○" 같은 문장 금지)
  기운이 어떻게 작용하는지를 풀어 쓰고, 그 결과로 자연스럽게 권하세요.

[형식]
· 여는말로 시작하세요. 제목이나 "여는말" 라벨을 붙이지 마세요.
· ★여는말은 **2~3문장으로 끝내고 반드시 마침표로 맺으세요.**
  길게 늘이다 중간에서 멈추면 손님이 첫 문장부터 잘린 글을 봅니다.
  (실제로 «…타고났» 에서 끊긴 채 나간 적이 있습니다)
· 이어서 아래 대목을 차례대로 쓰세요. 제목 줄에는 ■ 말고 다른 것을 붙이지 마세요.
  번호도, 별표도, 우물정도 붙이지 마세요.
· 마지막에 "■ 맺는말" 로 끝맺으세요.

[★카드 쓰는 법 — 반드시 이 차례로]
각 대목은 제목 줄 바로 아래에 이 셋을 먼저 씁니다. 그다음 본문입니다.

■ (대목 제목)
[한줄] 이 카드에서 가장 하고 싶은 말 한 문장. 스무 자 안팎으로 짧게.
[태그] 낱말 · 낱말 · 낱말        ← 두셋. 각 다섯 자 안팎. 쉬운 말로.
(빈 줄)
본문 첫 단락.
(빈 줄)
본문 둘째 단락.
(빈 줄)
[실천] 지금 바로 해볼 수 있는 일 한두 가지. 한 문장.

· [한줄]·[태그]·[실천] 은 **대괄호까지 그대로** 적으세요. 화면이 그것으로 갈라 그립니다.
· 본문은 단락마다 빈 줄로 나누세요. 한 단락은 두세 문장이면 충분합니다.

[쓸 대목]
${plan.map(o => `■ ${o.title} — ${o.len}`).join('\n')}
■ 맺는말 — 3~4문장

[판정 재료]
${material}${salBlock}${bookBlock}

이제 위 순서대로 써 주세요.`
}

// ══════════════════════════════════════════════════════════════
//  파서 — 진로적성 것과 같은 안전망 (30부 2장)
// ══════════════════════════════════════════════════════════════

/** ■ 앞에 붙은 ** · 숫자 · # · - 를 걷어낸다 */
function stripLead(line: string): string {
  return line
    .replace(/^\s+/, '')
    .replace(/^[#>*\-–—]+\s*/, '')
    .replace(/^\d+[.)]\s*/, '')
    .replace(/^\*\*\s*/, '')
    .replace(/\*\*\s*$/, '')
    .trim()
}

/** 구분선인가 */
function isSep(line: string): boolean {
  const t = line.trim()
  return /^[-–—_=*]{3,}$/.test(t)
}

const OUTRO_WORDS = ['맺는말', '맺음말', '마무리', '마치며', '끝으로', '닫는말', '정리하며']
const INTRO_WORDS = ['여는말', '들어가며', '시작하며']

/** 제목 → 카드 key */
export function keyOfTitle(title: string): string | null {
  const t = stripLead(title).replace(/^■\s*/, '').trim()
  // ★정식 제목을 먼저 맞춘다. 뒤에 덧말이 붙어도 잡힌다. (30부 2장)
  for (const o of ORDER) if (t.startsWith(o.title)) return o.key
  // 낱말 검사는 좁은 것부터
  if (t.includes('시험 날짜') || t.includes('시험일')) return 'examday'
  if (t.includes('이직') || t.includes('직업 변동')) return 'jobchange'
  if (t.includes('수시') || t.includes('정시')) return 'susi'
  if (t.includes('고교') || t.includes('고등학교')) return 'highschool'
  if (t.includes('어떤 시험')) return 'examkind'
  if (t.includes('지금')) return 'dayun'
  if (t.includes('흐름')) return 'years'
  return null
}

export interface ParsedExamTongbyeon {
  intro: string
  outro: string
  byKey: Record<string, string>
  byTitle: Record<string, string>
}

export function parseExamTongbyeon(full: string): ParsedExamTongbyeon {
  const lines = full.split('\n')
  const intro: string[] = []
  const blocks: Array<{ title: string; body: string[] }> = []
  let cur: { title: string; body: string[] } | null = null

  for (const raw of lines) {
    if (isSep(raw)) continue                    // ③ 구분선을 걸러 낸다
    const s = stripLead(raw)
    if (s.startsWith('■')) {
      if (cur) blocks.push(cur)
      cur = { title: s.replace(/^■\s*/, '').trim(), body: [] }
      continue
    }
    if (cur) cur.body.push(raw)
    else intro.push(raw)
  }
  if (cur) blocks.push(cur)

  const byKey: Record<string, string> = {}
  const byTitle: Record<string, string> = {}
  let outro = ''
  const orphan: string[] = []

  for (const b of blocks) {
    const body = b.body.join('\n').trim()
    if (OUTRO_WORDS.some(w => b.title.includes(w))) { outro = body; continue }
    if (INTRO_WORDS.some(w => b.title.includes(w))) { intro.push(body); continue }
    byTitle[b.title] = body
    const k = keyOfTitle(b.title)
    // ⑤ 짝 못 찾은 대목을 소리 없이 버리지 않는다 (30부 2장)
    if (k) byKey[k] = body
    else orphan.push(`■ ${b.title}\n${body}`)
  }
  if (orphan.length) outro = [outro, ...orphan].filter(Boolean).join('\n\n')

  /**
   * ★2026-07-29 — 끊긴 여는말을 다듬습니다. (대표님 지적)
   *
   *   [무엇이 있었나] 여는말이 «…기운을 타고났» 에서 멈춘 채 화면에 나갔습니다.
   *     뒤 카드들은 멀쩡했으니 응답이 통째로 끊긴 것이 아니라,
   *     AI 가 여는말을 길게 늘이다 스스로 문장을 못 맺은 것입니다.
   *   [어떻게] 마지막 글자가 문장 부호가 아니면, 마지막 «완결된 문장»까지만 씁니다.
   *     ⚠️ 지어내서 채우지 않습니다. 잘린 조각을 버릴 뿐입니다.
   *     ⚠️ 프롬프트에도 «2~3문장으로 맺으라» 고 적었습니다. 여기는 그물입니다.
   */
  const trimTail = (t: string): string => {
    const s2 = t.trim()
    if (!s2 || /[.!?…”"』」)\]]$/.test(s2)) return s2
    const cut = Math.max(s2.lastIndexOf('.'), s2.lastIndexOf('!'), s2.lastIndexOf('?'), s2.lastIndexOf('…'))
    return cut > 20 ? s2.slice(0, cut + 1) : s2
  }

  return { intro: trimTail(intro.join('\n')), outro, byKey, byTitle }
}
