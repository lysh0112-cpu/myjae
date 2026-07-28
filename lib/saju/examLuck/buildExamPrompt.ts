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
import { salBrief, cheonganBrief, ohaengBrief, hyeongPaHaeBrief, hapChungBrief, munYiBrief } from '../jaryoPick'
// ★육친(십성) — 명리적성 3장 106~131쪽 (2026-07-28)
import { yukchinBrief } from '../yukchinTable'
import { groupBrief } from '../yukchinGroup'

export const ORDER: Array<{ key: string; title: string; len: string }> = [
  { key: 'years', title: '앞으로의 흐름', len: '4~6문장' },
  { key: 'dayun', title: '지금의 흐름', len: '3~4문장' },
  { key: 'examkind', title: '어떤 시험에 힘이 실리나', len: '3~4문장' },
  { key: 'examday', title: '시험 날짜를 짚어 보면', len: '3~4문장' },
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
  const bookLines = [
    ...cheonganBrief(dayStem, 3),
    ...(v.ohaengScore ? ohaengBrief(v.ohaengScore, v.target, { 결: true }) : []),
    // ★문과:이과 비율 (교재 25쪽) — 어떤 시험에 힘이 실리는지 짚을 때 쓴다.
    ...(v.ohaengScore ? [munYiBrief(v.ohaengScore)].filter(Boolean) : []),
    ...(v.saju?.length ? hyeongPaHaeBrief(v.saju, v.target).slice(0, 2) : []),
    ...(v.saju?.length ? hapChungBrief(v.saju, v.target).slice(0, 2) : []),
    // ★육친 (명리적성 3장 106~131쪽) — 2026-07-28
    //   교재 117쪽: "관성이 많으면 남을 많이 의식한다. 합격운, 취업운에도 유리하다"
    //   교재 130쪽: 학업 상승운은 인성운·식상운, 하락운은 비겁운·재성운
    //   시험은 관성·인성·식상이 핵심이라 십성을 짚어 주면 통변이 또렷해진다.
    ...(v.saju?.length ? yukchinBrief(v.saju, v.target, { keys: 2, cap: 2 }) : []),
    // 과다한 짝만 (없는 짝은 오행 결핍과 결이 겹쳐 뺀다)
    ...(v.saju?.length ? groupBrief(v.saju, v.target, { cap: 2, maxKeys: 1, onlyGwada: true }) : []),
  ]
  const bookBlock = bookLines.length
    ? `\n\n[타고난 결 — 교재 20~47·87~93쪽]\n` + bookLines.map(t => `- ${t}`).join('\n')
    : ''

  const closing = (v.target === 'student' ? CLOSING_STUDENT : CLOSING).join(' ')

  return `당신은 사주 상담을 오래 해 온 따뜻한 어른입니다.
${v.name}님(${v.age}세 ${v.gender})의 합격운·취업운을 풀어 주세요.

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

[형식]
· 여는말로 시작하세요. 제목이나 "여는말" 라벨을 붙이지 마세요.
· 이어서 아래 대목을 차례대로 쓰세요. 제목 줄에는 ■ 말고 다른 것을 붙이지 마세요.
  번호도, 별표도, 우물정도 붙이지 마세요.
· 마지막에 "■ 맺는말" 로 끝맺으세요.

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

  return { intro: intro.join('\n').trim(), outro, byKey, byTitle }
}
