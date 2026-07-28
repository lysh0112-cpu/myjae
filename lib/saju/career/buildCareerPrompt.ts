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
// ★2026-07-27 — 교재 48~77쪽 지지 자료를 진로적성 재료에도 넣는다.
//   ⚠️ 대목(카드)을 새로 만들지 않는다. 이미 있는 카드의 재료에 얹는다.
//      이 프롬프트는 ■ 제목으로 대목을 나누는 파서와 짝이라, 대목을 늘리면 화면이 깨진다. (30부 2장)
import { findByeongjon, findCombo, findJijiByeongjon, sayOf } from '../byeongjon'
import { cheonganBrief, salBrief, hyeongPaHaeBrief, munYiBrief, ohaengBrief, hapChungBrief } from '../jaryoPick'
// ★육친(십성) — 명리적성 3장 106~131쪽 (2026-07-28)
import { yukchinBrief } from '../yukchinTable'
import { groupBrief, PYEONJUNG_CLOSING } from '../yukchinGroup'
import { traitsInSaju, traitLines, noteLines, ctxOf } from '../jijiTrait'

export interface CareerPromptInput {
  name: string
  gender: string            // '남' | '여'
  age?: number | null
  target: 'student' | 'adult'
  saju: Array<{ pillar: string; stem: string; branch: string }>
  hourUnknown: boolean
  cards: CareerCard[]
  /** ★2026-07-28 — 오행 점수. 있으면 문이과 비율과 과다·부족 자료를 얹는다 */
  ohaengScore?: Record<string, number>
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

  // ── 교재 48~77쪽 자료를 어느 카드에 얹을지 ──────────────────────
  //   병존 → [타고난 신살]      같은 글자가 나란히 있어 기운이 짙다는 이야기라 신살 결이다
  //   지지 특징 → [어느 자리에서 일할까]  교재가 든 직업이 여기에 붙는다
  //   ★144칸(jijiGrade)은 안 넣는다. 그건 운(대운·세운)과의 어울림이라 진로적성 주제가 아니다.
  const extra: Record<string, string[]> = {}
  // ★2026-07-28 — 교재 20~28·41~47·94~97쪽 자료를 카드마다 나눠 얹는다.
  //   ⚠️ 대목(카드)을 새로 만들지 않는다. 이미 있는 카드의 재료에 얹는다.
  {
    const push = (k: string, arr: string[]) => {
      if (!arr.length) return
      extra[k] = [...(extra[k] ?? []), ...arr]
    }
    // 오행 점수는 카드 재료(ohaeng_gijil)에 이미 있으므로 여기서 다시 세지 않는다.
    // 명식 글자로만 잴 수 있는 것 — 일간과 살 — 만 얹는다.
    push('ilju', cheonganBrief(v.saju.find(p => p.pillar === '일주')?.stem ?? '', 4))
    push('sinsal', salBrief(v.saju, v.target, false))
    push('jobs', salBrief(v.saju, v.target, true))
    // ★형·파·해는 업상대체(그 기운을 직업으로 쓰는 것)를 말하는 자리라 직업 카드에 붙인다.
    push('jobstruct', hyeongPaHaeBrief(v.saju, v.target).slice(0, 3))
    // ★합·충 (교재 78~86쪽) — 격과 그릇을 말하는 카드에 붙인다. 합충이 격을 흔든다.
    push('gyeokguk', hapChungBrief(v.saju, v.target).slice(0, 3))
    // ★문과:이과 비율 (교재 25쪽) — 계열·학과 카드에 붙인다.
    //   31부 §9 에 "木만 있고 나머지 넷은 없다" 고 남기신 그 자료다. 25쪽에 다섯이 다 있다.
    if (v.ohaengScore) {
      const my = munYiBrief(v.ohaengScore)
      if (my) push('gyeyeol', [my])
      push('ohaeng_gijil', ohaengBrief(v.ohaengScore, v.target, { 결: true, 개운: true }))
    }
    // ★육친 (명리적성 3장 106~131쪽) — 2026-07-28
    //   교재 40쪽: "육친으로 판단 = 진로와 직업적성 (강점 지능 찾기)"
    //   ⚠️ 이미 있는 [육친이 가리키는 곳] 카드에 얹는다. 카드를 새로 만들지 않는다.
    //   ⚠️ career/tables/yukchin.ts 는 **짝 다섯**만 다룬다(다른 출전).
    //      여기 얹는 것은 **십성 열 개**라 결이 다르다. 겹치지 않는다.
    push('yukchin', yukchinBrief(v.saju, v.target, { keys: 2, cap: 3, 직업: true }))
    {
      const g = groupBrief(v.saju, v.target, { cap: 2, maxKeys: 2, 보완: true, 직업: true })
      push('yukchin', g)
      // ★편중 이야기가 나갔으면 맺음말을 함께 (교재 123·126·129쪽)
      if (g.some(t => t.includes('과다'))) push('yukchin', PYEONJUNG_CLOSING)
    }
  }
  {
    const bj: string[] = []
    for (const h of findByeongjon(v.saju)) {
      const yeok = h.row.yeokma ? ` [역마 ${h.row.yeokma}]` : ''
      bj.push(`병존 ${h.key}(${h.pillars.join('·')})${yeok} — ${sayOf(h.row, v.target)}`)
    }
    for (const c of findCombo(v.saju)) {
      bj.push(`병존 ${c.row.need.join('')} ${c.key}(${c.pillars.join('·')}) — ${sayOf(c.row, v.target)}`)
    }
    for (const h of findJijiByeongjon(v.saju)) {
      const sal = h.row.sal?.length ? ` [${h.row.sal.join('·')}]` : ''
      const jobs = h.row.jobs?.length ? ` (교재가 든 직업: ${h.row.jobs.join('·')})` : ''
      bj.push(`병존 ${h.key}(${h.pillars.join('·')})${sal} — ${sayOf(h.row, v.target)}${jobs}`)
    }
    if (bj.length) extra['sinsal'] = bj
  }
  {
    const ctx = ctxOf(v.saju)
    const tr: string[] = []
    for (const h of traitsInSaju(v.saju)) {
      // 월지·일지만 통째로. 년지·시지는 48쪽 비고만. (교재 72쪽 "月支와 日支에 있을 때 가장 강력")
      const strong = h.pillars.includes('월지') || h.pillars.includes('일지')
      const body = strong
        ? [...traitLines(h.row, v.target, ctx), ...noteLines(h.row, v.target, ctx)].join(' ')
        : noteLines(h.row, v.target, ctx).join(' ')
      const jobs = strong && h.row.jobs?.length ? ` (교재가 든 직업: ${h.row.jobs.join('·')})` : ''
      tr.push(`${h.pillar} ${h.branch}(${h.row.ko}·${h.row.tti}) — ${body}${jobs}`)
    }
    if (tr.length) extra['jobstruct'] = tr
  }

  const material = v.cards.map(c => {
    const o = ORDER.find(x => x.key === c.key)
    const rs = [...c.reasons, ...(extra[c.key] ?? [])]
    return `[${o?.title ?? c.title}]\n` + rs.map(r => `- ${r}`).join('\n')
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
· ★다만 드러내도 좋은 것은 오행·육친 점수(100점 배점)와 글자 수뿐입니다.
  재료에 적힌 직업·학과의 추림 점수("상담사 9.8점", "무도학과 8점")는
  교재에 없는 우리 내부 수치입니다. 읽는 분은 무슨 기준인지 알 수 없고,
  9.8과 8.4가 정밀한 차이인 것처럼 읽힙니다. 절대 쓰지 마세요.
  순서를 고르는 데만 쓰고, 말할 때는 "여러 자리에서 거듭 나온다" 정도로 하세요.
· ★비율(%)을 한 대목에 두 가지 넘게 늘어놓지 마세요. 읽는 분이 헷갈립니다.
· 단정하지 말고 여지를 두세요. "~인 편입니다", "~하는 경우가 많습니다".
· 좋은 말만 하지 마세요. 약한 자리도 말하되, 겁을 주지는 마세요.
· ★건강·질병·사고를 예언처럼 말하지 마세요. 병 이름을 나열하지 마세요.
· 아래 재료에 없는 것을 지어내지 마세요. 특히 직업과 학과는 재료에 있는 것만 쓰세요.
· ★오늘은 ${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월입니다.
  ${new Date().getFullYear() - 1}년처럼 이미 지나간 해를 앞일처럼 말하지 마세요.
· ★재료에 "병존", "월지 ○(…)" 로 시작하는 줄이 있으면 교재 48~77쪽에서 온 것입니다.
  그 대목의 이야기로 자연스럽게 녹이되, **목록으로 나열하지 마세요.**
  한 대목에 서너 가지 넘게 끌어오지 마세요. 안 쓰고 남기는 것이 정상입니다.
  쪽수·"교재가 든 직업" 같은 표기는 그대로 옮기지 말고 사람 말로 바꾸세요.
· 재료에 적힌 "…하세요", "…넘기세요" 같은 지시문은 당신에게 하는 말입니다. 옮겨 쓰지 마세요.
${guard}

[짜임새]
아래 대목을 이 순서로 씁니다. **모든 대목은 반드시 ■ 로 시작하는 제목을 답니다.**
제목은 아래 적힌 글자를 그대로 쓰세요. 화면에서 대목을 찾아 넣는 데 쓰입니다.
★제목 줄에는 ■ 말고 다른 것을 붙이지 마세요. 번호(1. 2.)도, 별표(**)도, 우물정(#)도 쓰지 마세요.
★대목 사이에 --- 같은 구분선을 넣지 마세요. 제목만으로 나뉩니다.

여는말 — 제목 없이 2~3문장. 이 사람이 어떤 결을 타고났는지 한마디로.
${plan.map(o => `■ ${o.title} — ${o.len}`).join('\n')}
■ 맺는말 — 3~4문장. 앞을 되풀이하지 말고, 이 사람에게 건네는 말로 닫습니다.

[대목마다 지킬 것]
· 그 대목의 재료만 씁니다. 다른 대목 이야기를 끌어오지 마세요.
· 앞 대목을 요약하거나 총정리하지 마세요. 맺는말도 총정리가 아닙니다.
· 각 대목은 그 자리에서 문장을 끝맺습니다.

[판정 재료]
${material}

이제 위 순서대로 써 주세요.`
}

// ★2026-07-27 — 제목 줄 앞에 붙는 군더더기를 걷어낸다.
//   AI가 "**■ 제목**", "1. ■ 제목", "### ■ 제목" 처럼 쓰면
//   예전 정규식(/^\s*(#{1,6}\s*)?■/)이 못 잡아 그 대목이 앞 대목 본문으로
//   흡수됐다. 최악의 경우 대목 전부가 여는말 상자 하나로 뭉친다.
const stripLead = (s: string) =>
  s.replace(/^[\s#>*\-–—•·]*/, '').replace(/^\d+[.)]\s*/, '').replace(/^[\s#>*]*/, '')

/** ■ 로 시작하는 제목 줄인가 (앞에 무엇이 붙어 있어도) */
const isHead = (s: string) => stripLead(s).startsWith('■')

/** --- *** ___ === 같은 구분선만 있는 줄인가 */
const isSep = (s: string) => /^\s*(?:[-–—_*=]{3,}|[·•]{3,})\s*$/.test(s)

/** 통변 글을 대목별로 가른다 (■ 제목 기준) */
export function parseCareerTongbyeon(text: string): { intro: string; byTitle: Record<string, string>; outro: string } {
  const lines = text.split('\n')
  const byTitle: Record<string, string> = {}
  let intro = '', outro = ''
  let cur: { title: string; body: string[] } | null = null
  const clean = (s: string) => stripLead(s).replace(/^■\s*/, '').replace(/\*\*/g, '').trim()

  const flush = () => {
    if (!cur) return
    const t = clean(cur.title)
    const body = cur.body.filter(l => !isSep(l)).join('\n').trim()
    // ★맺는말·여는말은 낱말이 흔들려도 잡는다. 못 잡으면 화면에서 사라진다.
    if (/맺는말|맺음말|마무리|마치며|끝으로|닫는말|정리하며/.test(t)) {
      outro = outro ? outro + '\n\n' + body : body
    } else if (/여는말|여는글|들어가며|시작하며|머리말/.test(t)) {
      intro = intro ? intro + '\n' + body : body
    } else {
      byTitle[t] = body
    }
    cur = null
  }
  for (const ln of lines) {
    if (isHead(ln)) { flush(); cur = { title: ln, body: [] } }
    else if (cur) cur.body.push(ln)
    else if (!isSep(ln)) { const c = clean(ln); if (c) intro += (intro ? '\n' : '') + c }
  }
  flush()
  return { intro, byTitle, outro }
}

/** 대목 제목 → 카드 key */
export function keyOfTitle(title: string): string | null {
  const t = title.replace(/\s/g, '')

  // ★2026-07-27 — 먼저 정식 제목과 앞부분을 맞춰 본다.
  //   AI가 "■ 기운을 얻는 자리 — 용신 수(水) 오행" 처럼 뒤에 말을 붙이면
  //   아래 낱말 검사가 '오행'을 먼저 집어 오행 카드에 붙여 버렸다.
  //   "격과 그릇 (일주 기준)" 이 일주 카드로 가던 것도 같은 병이다.
  //   화면은 멀쩡해 보이고 내용만 뒤바뀌어 눈으로는 못 잡는다.
  for (const o of ORDER) {
    if (t.startsWith(o.title.replace(/\s/g, ''))) return o.key
  }

  // 제목이 많이 흐트러졌을 때의 뒷받침. ★좁은 낱말부터 본다.
  if (t.includes('한번더')) return 'special'
  if (t.includes('용신') || t.includes('기운')) return 'yongsin'
  if (t.includes('격과') || t.includes('그릇') || t.includes('격국')) return 'gyeokguk'
  if (t.includes('신살')) return 'sinsal'
  if (t.includes('육친')) return 'yukchin'
  if (t.includes('일주')) return 'ilju'
  if (t.includes('계열') || t.includes('학과')) return 'gyeyeol'
  if (t.includes('어느자리') || t.includes('일할까') || t.includes('직업구조')) return 'jobstruct'
  if (t.includes('직업')) return 'jobs'
  if (t.includes('오행')) return 'ohaeng_gijil'
  return null
}
