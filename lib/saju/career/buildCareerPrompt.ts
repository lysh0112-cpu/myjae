// lib/saju/career/buildCareerPrompt.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 통변 프롬프트                                          │
// │  출전: 『명리적성 비법노트』(심산)                                 │
// └───────────────────────────────────────────────────────────────┘
//
// [궁합에서 데인 자리 — 처음부터 피한다]
//
//  ① 지시 모순 금지
//     궁합은 [형식]이 "맺는말에 제목 붙이지 마세요" 라 하고
//     뼈대는 "반드시 ■ 맺는말" 이라 해서 서로 부딪혔다.
//     AI가 제목을 안 붙이자 매칭이 깨져 맺는말이 앞 카드에 흡수됐다.
//     → 여기서는 **모든 대목에 ■ 제목을 붙인다**로 하나만 말한다.
//
//  ② 길이 제한과 "다 다뤄라"를 한자리에 넣지 않는다
//     궁합은 "맺는말 100자 안팎" + "하나도 빠뜨리지 말고 요약하지 말라"가
//     정면 충돌해, AI가 맺는말을 길게 쓰다 앞 대목까지 총정리로 물들였다.
//     → 대목마다 길이를 따로 적고, "요약하지 말라" 같은 말은 쓰지 않는다.
//
//  ③ 공용 꼬리 금지
//     갈래마다 자기 문장을 스스로 끝맺게 한다.
//
//  ④ 재료는 reasons 만 준다
//     lines(고객이 읽는 글)를 주면 AI가 그대로 베껴 쓴다.
//
//  ⑤ 이름은 성까지 부른다
//     궁합에서 "정준호님"이 "준호님"이 되어 누구 이야기인지 헷갈렸다.

import type { CareerCard } from './types'

export interface CareerPromptInput {
  name: string
  gender: string            // '남' | '여'
  age?: number | null
  target: 'student' | 'adult'
  saju: Array<{ pillar: string; stem: string; branch: string }>
  hourUnknown: boolean
  cards: CareerCard[]
}

/** 화면 묶음과 같은 순서. 통변도 이 순서로 쓴다. (교훈 AS) */
const ORDER: Array<{ key: string; title: string; len: string }> = [
  { key: 'special',     title: '한 번 더 볼 점',      len: '2~3문장' },
  { key: 'ohaeng_gijil', title: '타고난 오행의 결',    len: '3~4문장' },
  { key: 'yukchin',     title: '육친이 가리키는 곳',   len: '4~5문장' },
  { key: 'ilju',        title: '일주가 말하는 것',     len: '3~4문장' },
  { key: 'gyeokguk',    title: '격과 그릇',           len: '3~4문장' },
  { key: 'sinsal',      title: '타고난 신살',         len: '3~4문장' },
  { key: 'yongsin',     title: '기운을 얻는 자리',     len: '2~3문장' },
  { key: 'jobstruct',   title: '어느 자리에서 일할까', len: '3~4문장' },
  { key: 'gyeyeol',     title: '계열과 학과',         len: '3~4문장' },
  { key: 'jobs',        title: '어울리는 직업',        len: '4~6문장' },
]

export function buildCareerPrompt(v: CareerPromptInput): string {
  const have = new Set(v.cards.map(c => c.key))
  const plan = ORDER.filter(o => have.has(o.key))

  const myeongsik = v.saju
    .map(p => `${p.pillar} ${p.stem === '?' ? '·' : p.stem}${p.branch === '?' ? '·' : p.branch}`)
    .join(' · ')

  const material = v.cards.map(c => {
    const o = ORDER.find(x => x.key === c.key)
    return `[${o?.title ?? c.title}]\n` + c.reasons.map(r => `- ${r}`).join('\n')
  }).join('\n\n')

  const who = v.target === 'student'
    ? '학생입니다. 학부모가 함께 읽습니다. 진학과 공부 이야기가 중심입니다.'
    : '성인입니다. 일하는 자리와 앞으로의 길이 중심입니다.'

  // ★미성년일 수 있는 자리에서 반드시 지킬 것
  const guard = v.target === 'student'
    ? `
[★학생이라 특별히 지킬 것]
· 이 사람은 미성년일 수 있고, 부모가 함께 읽습니다.
· 연애·이성·결혼·배우자·성(性)에 관한 이야기를 절대 쓰지 마세요. 진로와 무관합니다.
· 유흥·도박·대부업 같은 어른용 직업을 권하지 마세요. 재료에서 이미 뺐습니다.
· 술·담배·유흥을 곁들여 말하지 마세요.
· 아이의 성품을 나무라듯 말하지 마세요. "이런 결이니 이렇게 도와주시면 좋겠다"로 쓰세요.`
    : `
[지킬 것]
· 연애·결혼·배우자 이야기는 이 서비스의 주제가 아닙니다. 쓰지 마세요.
· 성(性)에 관한 서술은 쓰지 마세요.`

  return `당신은 명리로 진로적성을 보는 상담가입니다.
『명리적성 비법노트』(심산)의 방식으로, 아래 판정 재료를 사람의 말로 엮어 주세요.

[누구를 보는가]
이름 ${v.name || '이분'} · ${v.gender}자${v.age ? ` · ${v.age}세` : ''}
${who}
명식 ${myeongsik}${v.hourUnknown ? '\n★태어난 시(時)를 모릅니다. 시주를 비워 두고 보았습니다. 시주가 필요한 이야기는 단정하지 마세요.' : ''}

[쓰는 법]
· 존댓말로, 다정하되 담담하게. "~해요"와 "~합니다"를 섞습니다.
· 이름을 부를 때는 성까지 그대로 붙입니다. ${v.name ? `"${v.name}님"이라고 부르세요. 성을 떼지 마세요.` : ''}
· 점수와 글자 수를 숨기지 마세요. "수(水)가 80점으로" 처럼 근거를 드러내도 좋습니다.
· 단정하지 말고 여지를 두세요. "~인 편입니다", "~하는 경우가 많습니다".
· 좋은 말만 하지 마세요. 약한 자리도 말하되, 겁을 주지는 마세요.
· ★건강·질병·사고를 예언처럼 말하지 마세요. 병 이름을 나열하지 마세요.
· 아래 재료에 없는 것을 지어내지 마세요. 특히 직업과 학과는 재료에 있는 것만 쓰세요.
· 재료에 적힌 "…하세요", "…넘기세요" 같은 지시문은 당신에게 하는 말입니다. 옮겨 쓰지 마세요.
${guard}

[짜임새]
아래 대목을 이 순서로 씁니다. **모든 대목은 반드시 ■ 로 시작하는 제목을 답니다.**
제목은 아래 적힌 글자를 그대로 쓰세요. 화면에서 대목을 찾아 넣는 데 쓰입니다.

여는말 — 제목 없이 2~3문장. 이 사람이 어떤 결을 타고났는지 한마디로.
${plan.map((o, i) => `${i + 1}. ■ ${o.title} — ${o.len}`).join('\n')}
${plan.length + 1}. ■ 맺는말 — 3~4문장. 앞을 되풀이하지 말고, 이 사람에게 건네는 말로 닫습니다.

[대목마다 지킬 것]
· 그 대목의 재료만 씁니다. 다른 대목 이야기를 끌어오지 마세요.
· 앞 대목을 요약하거나 총정리하지 마세요. 맺는말도 총정리가 아닙니다.
· 각 대목은 그 자리에서 문장을 끝맺습니다.

[판정 재료]
${material}

이제 위 순서대로 써 주세요.`
}

/** 통변 글을 대목별로 가른다 (■ 제목 기준) */
export function parseCareerTongbyeon(text: string): { intro: string; byTitle: Record<string, string>; outro: string } {
  const lines = text.split('\n')
  const byTitle: Record<string, string> = {}
  let intro = '', outro = ''
  let cur: { title: string; body: string[] } | null = null
  const clean = (s: string) => s.replace(/^\s*#{1,6}\s*/, '').replace(/^\s*■\s*/, '').replace(/\*\*/g, '').trim()

  const flush = () => {
    if (!cur) return
    const t = clean(cur.title)
    const body = cur.body.join('\n').trim()
    if (t.includes('맺는말') || t.includes('맺음말')) outro = body
    else byTitle[t] = body
    cur = null
  }
  for (const ln of lines) {
    if (/^\s*(#{1,6}\s*)?■/.test(ln)) { flush(); cur = { title: ln, body: [] } }
    else if (cur) cur.body.push(ln)
    else { const c = clean(ln); if (c) intro += (intro ? '\n' : '') + c }
  }
  flush()
  return { intro, byTitle, outro }
}

/** 대목 제목 → 카드 key */
export function keyOfTitle(title: string): string | null {
  const t = title.replace(/\s/g, '')
  if (t.includes('한번더')) return 'special'
  if (t.includes('오행')) return 'ohaeng_gijil'
  if (t.includes('육친')) return 'yukchin'
  if (t.includes('일주')) return 'ilju'
  if (t.includes('격과') || t.includes('그릇')) return 'gyeokguk'
  if (t.includes('신살')) return 'sinsal'
  if (t.includes('기운') || t.includes('용신')) return 'yongsin'
  if (t.includes('어느자리') || t.includes('일할까')) return 'jobstruct'
  if (t.includes('계열') || t.includes('학과')) return 'gyeyeol'
  if (t.includes('직업')) return 'jobs'
  return null
}
