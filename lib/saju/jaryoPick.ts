// lib/saju/jaryoPick.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  교재 자료를 "물어본 것에 맞게" 골라 내는 공용 잔손                   │
// └───────────────────────────────────────────────────────────────┘
//
// ★2026-07-28 — 서비스가 여섯이라 같은 고르개를 여섯 번 적을 수 없다.
//   toTongbyeonInput 에서 쓰던 것을 여기로 올려 다 같이 쓴다. (교훈 BQ)
//
// ★자료는 일곱 파일에 다 들어 있다(합치면 33,000자).
//   그것을 다 내보내는 것이 아니라, 물어본 것에 맞는 것만 꺼내 쓴다.
//   재료가 부풀면 통변이 흐려진다. (교훈 BS · 31부 §6)

import type { Ohaeng } from './simsanOhaeng'
import { grade as ohaengGrade } from './simsanOhaeng'
import { CHEONGAN_TRAIT } from './cheonganTrait'
import { OHAENG_TRAIT } from './ohaengTrait'
import { OHAENG_NATURE } from './ohaengNature'
import { OHAENG_25 } from './ohaengTable25'
import { findChungByChars } from './chungMeaning'
import { findHap, CHEONGAN_HAP_BLOCK, AMHAP_NOTE, HAP_MANY, CHEONJI_HAPDEOK } from './hapMeaning'
// ★2026-07-29 — 합의 성립 판정은 hapJudge 한 곳에서만 한다. (교훈 CJ)
//   교재 78~83쪽이 적어 둔 조건(방해·쟁합·투합·합화·子丑水土·巳申水金·개고)이
//   여기 흩어져 있으면 또 두 벌이 된다.
import {
  judgeCheonganHap, judgeJijiHap, judgeJahwa, judgeAmhap, isCheonjiHapdeok,
} from './hapJudge'
import { SAL_TABLE } from './sinsalTable'
import { findRel, findSamhyeong, relLines } from './hyeongPaHae'
// ★병존·지지특징 — 네 서비스가 따로 갖고 있던 것을 여기로 올렸다 (2026-07-28, 교훈 BQ)
import { findByeongjon, findCombo, findJijiByeongjon, sayOf } from './byeongjon'
import { traitsInSaju, traitLines, noteLines, isDohwaAt, ctxOf as jijiCtxOf } from './jijiTrait'
// ★자리별 沖 판정 (교재 121쪽). 표를 두 벌로 두지 않으려고 여기서 부른다. (교훈 BQ)
import { chungInSaju, toJiName } from './yukchinRule'
// ★육친(십성) 자료 — 명리적성 3장 106~131쪽 (2026-07-28)
import { yukchinBrief } from './yukchinTable'
import { groupBrief, PYEONJUNG_CLOSING } from './yukchinGroup'

export type Pill = { pillar: string; stem: string; branch: string }
export type Target = 'student' | 'adult'

/**
 * ★육친 재료의 글자 상한 (2026-07-28)
 *   교재 3장 육친론이 통째로 들어오면서 재료가 부풀 수 있어 상한을 둡니다.
 *   32-4장에서 맞춰 두신 300~1,300자 결을 지키려는 값입니다.
 *     wide    질문 없음·종합·모르는 갈래 (Need 열 개 이상)
 *     narrow  갈래를 고른 경우
 *   ⚠️ 여기만 고치면 여섯 서비스가 함께 움직입니다. 서비스마다 따로 두지 마십시오.
 */
export const YUKCHIN_CAP = { wide: 300, narrow: 450 }

/**
 * ★병존 — 교재 74~77쪽 (2026-07-28 여기로 올림)
 *   궁합·사주보기·물상·진로적성 넷이 똑같은 코드를 따로 갖고 있었다. (교훈 BQ)
 */
export function byeongjonBrief(saju: Pill[], target: Target): string[] {
  const out: string[] = []
  for (const h of findByeongjon(saju as never)) {
    const yeok = h.row.yeokma ? ` [역마 ${h.row.yeokma}]` : ''
    out.push(`${h.key}(${h.pillars.join('·')})${yeok} — ${sayOf(h.row, target)}`)
  }
  for (const h of findJijiByeongjon(saju as never)) {
    out.push(`${h.key}(${h.pillars.join('·')}) — ${sayOf(h.row, target)}`)
  }
  for (const h of findCombo(saju as never)) {
    out.push(`${h.key} — ${sayOf(h.row, target)}`)
  }
  return out
}

/**
 * ★지지 특징 — 교재 48·50~73쪽 (2026-07-28 여기로 올림)
 *   사주보기·물상·진로적성 셋이 똑같은 코드를 따로 갖고 있었다. (교훈 BQ)
 *   ⚠️ row.original 은 절대 안 넣는다. 화면에 낼 수 없는 말이 섞여 있다. (교훈 BF)
 */
export function jijiTraitBrief(saju: Pill[], target: Target, withJobs = false): string[] {
  const hits = traitsInSaju(saju as never)
  if (!hits.length) return []
  const ctx = jijiCtxOf(saju as never)
  return hits.map(h => {
    const strong = h.pillars.includes('월지') || h.pillars.includes('일지')
    const dohwa = h.pillars.some(p => isDohwaAt(p.replace('지', '주'), h.branch)) ? ' [도화]' : ''
    const body = strong
      ? [...traitLines(h.row, target, ctx), ...noteLines(h.row, target, ctx)].join(' ')
      : noteLines(h.row, target, ctx).join(' ')
    const jobs = withJobs && strong && h.row.jobs?.length ? ` (교재가 든 직업: ${h.row.jobs.join('·')})` : ''
    return `${h.pillar} ${h.branch}(${h.row.ko}·${h.row.tti})${dohwa} — ${body}${jobs}`
  })
}

/**
 * ★단일 창구 — 여섯 서비스가 여기로만 재료를 받는다 (2026-07-28)
 *
 *   [무엇이 문제였나]
 *     서비스마다 교재 테이블을 직접 import 해서 제 손으로 재료를 만들고 있었다.
 *       toTongbyeonInput      jijiTrait byeongjon jijiGrade cheonganTrait ohaeng… 여덟
 *       toCoupleTongbyeonInput byeongjon
 *       mulsangTongbyeonPrompt jijiTrait byeongjon
 *       buildCareerPrompt      byeongjon jijiTrait yukchin…
 *       buildExamPrompt        yukchin…
 *       api/monthly-fortune    yukchin chungMeaning hyeongPaHae
 *     병존 만드는 코드가 네 벌, 지지특징이 세 벌이었다. (교훈 BQ)
 *     교재를 한 쪽 더 넣을 때마다 여섯 곳을 따로 고쳐야 했다.
 *
 *   [어떻게 바꿨나]
 *     · 재료를 고르는 일은 여기서만 한다. 서비스는 결과만 받는다.
 *     · byNeed 로 갈라 돌려주므로, 진로적성처럼 **카드마다 얹어야 하는**
 *       서비스도 제자리에 붙일 수 있다. (32-3장 "대목을 새로 만들지 않는다")
 *     · 글자 상한을 창구에서 건다. 서비스마다 slice 숫자를 따로 두지 않는다.
 *
 *   ⚠️ 서비스가 교재 테이블을 직접 import 하면 이 창구가 다시 갈라진다.
 *      새 교재 자료는 **여기에만** 얹으십시오.
 */
// ★2026-07-29 — 'integrated' 추가 (대표님 확정: 사주·대운·연월운세 단권화)
//   ⚠️ 'saju'·'unse' 는 지우지 않았습니다. 궁합·출산택일 등 다른 서비스가
//      여전히 'saju' 로 재료를 받아 갑니다. 통합 리포트만 'integrated' 를 씁니다.
export type ServiceType = 'saju' | 'unse' | 'integrated' | 'couple' | 'career' | 'exam' | 'monthly' | 'mulsang'

export interface PickContext {
  saju?: Pill[]
  dayStem?: string
  score?: Record<Ohaeng, number>
  target?: Target
  gender?: string
  /** 대운·세운·월운 가운데 무엇으로 들어왔나 (serviceType 이 'unse' 일 때) */
  unseKind?: 'daeun' | 'seyun' | 'wolun' | null
}

export interface PickArgs {
  serviceType: ServiceType
  questionCategories?: string[]
  ctx: PickContext
  /** 글자 상한. 안 주면 서비스 기본값 */
  budget?: number
  /**
   * ★질문 갈래와 무관하게 늘 넣을 것.
   *   사주보기의 「지지가 말하는 것」·「병존」은 명식 소개라 질문을 안 가린다.
   */
  forceNeeds?: Need[]
}

export interface PickResult {
  /** 평평한 줄 — 대부분의 서비스가 이걸 쓴다 */
  lines: string[]
  /** need 별로 나눈 것 — 카드마다 얹어야 하는 서비스가 쓴다 */
  byNeed: Partial<Record<Need, string[]>>
  needs: Need[]
  chars: number
  /** 상한에 걸려 잘렸는가 */
  truncated: boolean
  /** 갈래를 몰라 기본 재료로 갔는가 */
  fellBack: boolean
}

/**
 * ★갈래를 모를 때 내보낼 기본 재료 (2026-07-28)
 *
 *   ⚠️⚠️ 32부 교훈 BV 와 어긋나는 결정입니다. 반드시 읽어 주십시오.
 *     교훈 BV — "모르면 다 준다. 재료가 조금 무거워지는 것보다 재료가 비는 것이
 *               훨씬 나쁘다. 고르는 일은 AI 가 한다."
 *     32-4장 — "앞으로 자유질문란을 만드실 것이라 하셨습니다.
 *               표에 없는 갈래가 하나라도 섞이면 자료를 통째로 내보냅니다."
 *
 *   2026-07-28 대표님 지시로 **「모르면 기본 재료 + 상한」** 으로 바꿨습니다.
 *   재료가 통째로 나가면 프롬프트가 무거워지기 때문입니다.
 *
 *   ★되돌리려면 FALLBACK_MODE 만 'all' 로 고치면 됩니다.
 *     자유질문란을 여신 뒤 통변이 얕아지면 이것부터 의심하십시오.
 */
export const FALLBACK_MODE: 'default' | 'all' = 'default'

/** 갈래를 몰라도 이만큼은 준다 — 사람을 말하는 데 밑바탕이 되는 것들 */
export const DEFAULT_NEEDS: Need[] = ['일간', '오행', '합', '충', '살', '육친']

/**
 * 서비스별 글자 상한
 *
 * ★2026-07-28 대표님 확정 — saju 를 1400 → 1600 으로 올렸습니다.
 *   지지 합(육합·삼합·방합)을 재료에 넣으면서 재료가 무거워졌습니다.
 *   전수 86,400 명식 · 손님이 3갈래를 골랐을 때 잘리는 비율:
 *       1400자  9.2%      1500자  5.4%
 *       1600자  2.9%  ★   1800자  0.6%
 *   "지지 합·충과 격국이 알차게 담기는 편이 훨씬 유리하다"는 판단입니다.
 *
 * ⚠️ 여기 한 곳만 고치면 여섯 서비스가 함께 움직입니다.
 *    서비스 파일에 slice 숫자를 따로 두지 마십시오. (교훈 CF)
 * ⚠️ 나머지 여섯은 그대로입니다. 대운·세운은 재료가 500자 안팎이라 여유가 있습니다.
 */
/**
 * ⚠️⚠️ 이것은 «총량»이 아닙니다. pick() 이 고른 **줄에만** 걸립니다.
 *
 *   블록 제목과 buildMyeongsikFeatures(12운성·신살·귀인·공망)는 여기 안 셉니다.
 *   실측(2026-07-29) — 사주보기가 상한 1,600 인데 실제로는 3,538자를 보내고 있었습니다.
 *
 *   ★나가는 재료의 총량은 `toTongbyeonInput.TOTAL_CAP` 이 잡습니다.
 *     둘을 헷갈리지 마십시오. 상한을 고칠 일이 있으면 **둘 다** 보십시오.
 *
 *   ⚠️ 'couple' 과 'mulsang' 은 pick() 을 부르는 곳이 없습니다. 죽은 설정입니다.
 *      지우지 않은 것은 나중에 그 서비스도 교재 재료를 받게 될 자리이기 때문입니다.
 */
export const SERVICE_BUDGET: Record<ServiceType, number> = {
  saju: 1600, unse: 1200, couple: 1300, career: 1600, exam: 1200, monthly: 900, mulsang: 1200,
  // ★2026-07-29 통합 리포트 — 대표님 지시 1,800~2,000자.
  //   단순 합(saju 1600 + unse 1200 = 2800)이 아닙니다.
  //   원국에서 이미 말한 오행·일간·육친을 대운·세운에서 되풀이하지 않고,
  //   unseContext 가 세 덩이로 나눠 압축한 뒤 얹기 때문입니다.
  //   ⚠️ 이 숫자는 **교재가 아니라 우리가 정한 것**입니다. (34부 30/42/47 과 같은 성격)
  integrated: 2000,
}

/**
 * 상한에 걸렸을 때 뒤에서 자를 순서 — 뒤쪽이 먼저 잘린다.
 *   ★이것은 **갈래를 모를 때 쓰는 기본값**입니다. 갈래를 알면 CORE_NEEDS 가 앞을 바꿉니다.
 */
const NEED_PRIORITY: Need[] = [
  '일간', '오행', '육친', '충', '합', '살', '형파해',
  '병존', '지지특징', '건강', '개운', '다루는법', '직업', '문이과', '인생단계',
]

/**
 * ★2026-07-29 — 갈래별 「먼저 지킬 것」 (대표님 확정)
 *
 * [무엇이 문제였나]
 *   NEED_PRIORITY 가 **한 벌뿐**이라 모든 갈래에 같은 차례를 썼습니다.
 *   그런데 갈래마다 「곁가지」가 다릅니다. '문이과'·'살' 은 대부분의 갈래에서
 *   맨 뒤에 두어도 되지만, 「취업」에서는 그것이 답의 알맹이입니다.
 *
 *   실측 (상한 없는 경우와 견주어 실제로 사라진 것만 셈)
 *       옛 방식  직업·사업 → 형파해(174) · ★살(39)
 *                취업     → ★문이과(22) · ★살(17)
 *       새 방식  직업·사업 → 형파해(179) · 육친(39)
 *                취업     → 합(33)
 *     ★표시가 갈래의 알맹이인데 잘리던 것입니다. 이제 마지막까지 지킵니다.
 *
 *   ⚠️ 처음 조사 때 "「직업」이 잘린다"고 적었으나 **그것은 잘못 잰 것이었습니다.**
 *      만들어지지도 않은 need 를 「잘렸다」고 셌습니다. 「직업」은 옛 방식에서도
 *      잘리지 않았습니다. 다음 분이 헷갈리지 않도록 바로잡아 둡니다.
 *
 * [어떻게 고쳤나]
 *   갈래마다 「이건 마지막까지 지킨다」를 두셋 적어 둡니다.
 *   실제 차례는 이렇게 만듭니다.
 *       [그 갈래의 핵심] + [NEED_PRIORITY 의 나머지]
 *   표를 통째로 새로 적지 않으므로 손볼 곳이 적습니다.
 *
 *   ⚠️ 갈래를 모르면(「모르면 다 준다」로 빠지면) 기본값 NEED_PRIORITY 를 씁니다.
 *   ⚠️ '종합' 은 어차피 다 주는 갈래라 핵심을 두지 않습니다.
 *   ⚠️ 이름이 같은 갈래(재물·직업·건강·관계·연애)는 사주보기·궁합·운이 함께 씁니다.
 *      같은 이름이면 묻는 결도 같기 때문입니다.
 */
const CORE_NEEDS: Record<string, Need[]> = {
  // ── 사주보기 ──
  '건강':       ['건강', '충', '형파해'],
  '건강·자기':   ['건강', '오행', '개운'],
  '재물':       ['오행', '합', '충'],
  '노후·재물':   ['오행', '인생단계', '합'],
  '진로·적성':   ['직업', '문이과', '오행'],
  '직업·진로':   ['직업', '문이과', '오행'],
  '직업·사업':   ['직업', '살', '충'],
  '취업':       ['직업', '문이과', '살'],
  '연애':       ['합', '살', '일간'],
  '연애·결혼':   ['합', '충', '형파해'],
  '관계·마음':   ['다루는법', '일간', '합'],
  '인간관계':    ['다루는법', '일간', '합'],
  '가정':       ['충', '형파해', '다루는법'],
  '가족':       ['충', '형파해', '육친'],
  '부모':       ['육친', '충', '형파해'],
  '자녀':       ['육친', '충', '오행'],
  '출산·자녀':   ['육친', '충', '오행'],
  '노후':       ['인생단계', '건강', '오행'],
  '인생후반':    ['인생단계', '충', '형파해'],
  // ── 궁합 ──
  '끌림·첫인상':  ['합', '일간', '살'],
  '성격·기질':   ['일간', '오행', '다루는법'],
  '소통·감정':   ['다루는법', '일간', '합'],
  '관계 지속성': ['합', '충', '형파해'],
  '갈등·주의점':  ['충', '형파해', '다루는법'],
  '속궁합·친밀감': ['합', '살', '일간'],
  '결혼·미래운':  ['합', '충', '인생단계'],
  '관계 조언·개운': ['개운', '다루는법', '오행'],
  // ── 대운·세운·월운 ──
  '인생 흐름':   ['인생단계', '오행', '일간'],
  '전환기':     ['충', '형파해', '인생단계'],
  '직업':       ['직업', '일간', '살'],
  '관계':       ['다루는법', '일간', '합'],
  '마음':       ['다루는법', '일간', '개운'],
  '학업':       ['문이과', '일간', '오행'],
  '주의':       ['충', '형파해', '살'],
  '타이밍':     ['합', '충', '인생단계'],
}

/**
 * 이번 질문에 쓸 자르는 차례를 만든다.
 *   갈래를 모르면 기본값 그대로. 여럿 골랐으면 핵심을 앞에서부터 합친다.
 */
function priorityFor(cats?: string[]): Need[] {
  const core: Need[] = []
  for (const c of cats ?? []) {
    for (const n of CORE_NEEDS[c] ?? []) if (!core.includes(n)) core.push(n)
  }
  if (!core.length) return NEED_PRIORITY
  return [...core, ...NEED_PRIORITY.filter(n => !core.includes(n))]
}

/** 갈래 표를 서비스로 고른다 */
function tableOf(t: ServiceType, unseKind?: PickContext['unseKind']): Record<string, Need[]> {
  if (t === 'couple') return COUPLE_CATEGORY_NEEDS
  if (t === 'unse') return unseKind === 'daeun' ? DAEUN_CATEGORY_NEEDS
    : unseKind === 'wolun' ? WOLUN_CATEGORY_NEEDS : SEYUN_CATEGORY_NEEDS
  if (t === 'integrated') return INTEGRATED_CATEGORY_NEEDS
  return CATEGORY_NEEDS
}


export function pick(args: PickArgs): PickResult {
  const { serviceType, questionCategories, ctx } = args
  const table = tableOf(serviceType, ctx.unseKind)
  const fb = serviceType === 'couple' ? undefined
    : serviceType === 'unse' ? undefined
    : unseTableOf(null)      // 사주보기는 대운·세운 갈래도 한 번 더 본다

  // 갈래를 아는가
  let known = !!questionCategories?.length
  if (known) {
    known = questionCategories!.every(c => !!(table[c] ?? fb?.[c]))
  }
  const fellBack = !known
  const need = known
    ? needsOf(questionCategories, table, fb)
    : new Set<Need>(FALLBACK_MODE === 'all' ? ALL_NEEDS : DEFAULT_NEEDS)
  for (const n of args.forceNeeds ?? []) need.add(n)

  const byNeed = buildByNeed(need, ctx)
  const budget = args.budget ?? SERVICE_BUDGET[serviceType]

  // 상한 — 우선순위가 낮은 need 부터 덜어 낸다
  let chars = 0
  const lines: string[] = []
  let truncated = false
  // ★2026-07-29 — 갈래를 알면 그 갈래의 핵심을 마지막까지 지킨다 (대표님 확정)
  //   갈래를 모르고 「다 준다」로 빠진 경우(fellBack)는 기본값을 쓴다.
  const order = priorityFor(fellBack ? undefined : questionCategories).filter(n => byNeed[n]?.length)
  for (const n of order) {
    for (const t of byNeed[n]!) {
      if (chars + t.length > budget) { truncated = true; continue }
      lines.push(t); chars += t.length
    }
  }
  if (truncated) {
    // 잘린 need 는 byNeed 에서도 덜어 내 서비스가 헷갈리지 않게 한다
    for (const n of order) {
      byNeed[n] = byNeed[n]!.filter(t => lines.includes(t))
      if (!byNeed[n]!.length) delete byNeed[n]
    }
  }
  return { lines, byNeed, needs: [...need], chars, truncated, fellBack }
}

/** need 별로 재료를 만든다 (pick 의 알맹이) */
function buildByNeed(need: Set<Need>, a: PickContext): Partial<Record<Need, string[]>> {
  const t: Target = a.target ?? 'adult'
  const r: Partial<Record<Need, string[]>> = {}
  const put = (n: Need, arr: string[]) => { if (arr.length) r[n] = [...(r[n] ?? []), ...arr] }

  if (need.has('일간') && a.dayStem) put('일간', cheonganBrief(a.dayStem, need.size >= 8 ? 3 : 5, a.gender))
  if (a.score) {
    if (need.has('오행') || need.has('건강') || need.has('개운') || need.has('다루는법')) {
      put('오행', ohaengBrief(a.score, t, {
        결: need.has('오행'), 건강: need.has('건강'),
        개운: need.has('개운'), 다루는법: need.has('다루는법'),
      }))
    }
    if (need.has('인생단계')) {
      const top = (['목','화','토','금','수'] as Ohaeng[]).slice()
        .sort((x, y) => (a.score![y] ?? 0) - (a.score![x] ?? 0))[0]
      const st = stage25(top); if (st) put('인생단계', [st])
    }
    if (need.has('문이과')) { const m = munYiBrief(a.score); if (m) put('문이과', [m]) }
  }
  if (a.saju?.length) {
    if (need.has('합') || need.has('충')) {
      const hc = hapChungBrief(a.saju, t, { 합: need.has('합'), 충: need.has('충'), 건강: need.has('건강') }, a.score)
      put(need.has('충') ? '충' : '합', hc)
    }
    if (need.has('형파해')) put('형파해', hyeongPaHaeBrief(a.saju, t).slice(0, 4))
    if (need.has('살')) put('살', salBrief(a.saju, t, need.has('직업')))
    if (need.has('병존')) put('병존', byeongjonBrief(a.saju, t))
    if (need.has('지지특징')) put('지지특징', jijiTraitBrief(a.saju, t, need.has('직업')))
    if (need.has('육친')) {
      const wide = need.size >= 10
      const yuk = [
        ...yukchinBrief(a.saju, t, {
          keys: wide ? 1 : 2, cap: wide ? 2 : 3,
          다루는법: !wide && need.has('다루는법'),
          개운: !wide && need.has('개운'),
          직업: !wide && need.has('직업'),
        }),
      ]
      const g = groupBrief(a.saju, t, {
        cap: wide ? 1 : 2, onlyGwada: wide, maxKeys: wide ? 1 : 3,
        보완: !wide && need.has('개운'), 개운: !wide && need.has('개운'), 직업: !wide && need.has('직업'),
      })
      yuk.push(...g)
      const CAP = wide ? YUKCHIN_CAP.wide : YUKCHIN_CAP.narrow
      let used = 0; const cut: string[] = []
      for (const line of yuk) {
        if (used + line.length > CAP && cut.length) break
        cut.push(line); used += line.length
      }
      if (cut.some(x => x.includes('과다'))) cut.push(...PYEONJUNG_CLOSING)
      put('육친', cut)
    }
  }
  return r
}

/** 판정 조건을 적은 줄은 재료에서 뺀다. AI 에게 줄 것은 뜻이지 잣대가 아니다. */
export const isRuleLine = (t: string) =>
  /개 이상|포함해|되풀이|섞여 있어도|차례로 작용력|일 때 봅니다|해당하며/.test(t)

/** 일간 몇 줄 — cap 으로 길이를 조절한다 */
export function cheonganBrief(dayStem: string, cap = 4, gender?: string): string[] {
  const r = CHEONGAN_TRAIT[dayStem]
  if (!r) return []
  const out = [`${dayStem}(${r.ko}) ${r.image} — ${r.tendency}, ${r.keyword}. ${r.nature41}`]
  out.push(...r.traits.slice(0, cap))
  // ★성별 줄은 넘겨줄 때만 나간다. 궁합처럼 상대를 말하는 자리에서는 넘기지 말 것.
  if (gender === '남' || gender === '여') out.push(...(r.sayByGender?.[gender] ?? []))
  return out
}

/** 일간 물상 한 줄 — 물상도에 쓴다 */
export function cheonganImage(dayStem: string): string {
  const r = CHEONGAN_TRAIT[dayStem]
  return r ? `${dayStem}(${r.ko})는 ${r.image}입니다. ${r.nature41}` : ''
}

/** 오행 과다·결핍 — what 으로 무엇을 담을지 고른다 */
export function ohaengBrief(
  score: Record<Ohaeng, number>, target: Target,
  what: { 결?: boolean; 건강?: boolean; 개운?: boolean; 다루는법?: boolean } = { 결: true },
): string[] {
  const out: string[] = []
  for (const el of ['목', '화', '토', '금', '수'] as Ohaeng[]) {
    const g = ohaengGrade(score[el] ?? 0)
    if (g !== '과다' && g !== '결핍') continue
    const t = OHAENG_TRAIT[el]; const n = OHAENG_NATURE[el]
    if (!t) continue
    const parts: string[] = []
    if (g === '과다') {
      if (what.결) parts.push(...t.excess.slice(0, 2))
      if (what.건강 && target === 'adult') parts.push(...(t.excessAdult ?? []).slice(0, 2))
      if (target === 'student') parts.push(...(t.excessStudent ?? []).slice(0, 1))
      out.push(`${el}(${t.hanja}) 과다 ${score[el]}점 — ${parts.join(' ')}`)
      if (what.다루는법 && n?.handling?.length) out.push(`  · 곁의 사람이 대할 때: ${n.handling.slice(0, 2).join(' ')}`)
    } else {
      if (what.결) parts.push(...t.lack.slice(0, 2))
      if (what.건강 && target === 'adult') parts.push(...(t.lackAdult ?? []).slice(0, 2))
      if (target === 'student') parts.push(...(t.lackStudent ?? []).slice(0, 1))
      out.push(`${el}(${t.hanja}) 결핍 — ${parts.join(' ')}`)
      if (what.개운 && t.gaeun?.length) out.push(`  · 개운법: ${t.gaeun.slice(0, 3).join(' ')}`)
    }
  }
  return out
}

/**
 * 원국에 실제로 선 합·충만.
 *
 * ★2026-07-28 — 沖이 **자리(位)** 를 보게 고쳤습니다.
 *
 *   [무엇이 문제였나]
 *     교재(명리적성 121쪽)는 沖을 자리마다 다르게 읽습니다.
 *       月支沖 긍정 70%(이동·스카우트·사업 시작. "부정적으로 보지 않는다")
 *       年支沖 긍정 · 日支沖 100% 부정(배우자궁) · 時支沖 50% 긍정
 *       영향력은 월일 〉 일시 〉 연월
 *     그런데 이 규칙이 chungMeaning.ts 의 original 칸에만 적혀 있었고
 *     (original 은 화면·재료에 안 나갑니다),
 *     여기서는 saju.map(p => p.branch) 로 **자리를 버리고** 글자만 봤습니다.
 *     그래서 년월沖(좋은 자리)인 손님도 "매매나 계약에 불리합니다" 를 들었습니다.
 *
 *   [얼마나 퍼져 있었나 — 지지 네 자리 전수 20,736가지]
 *     沖이 있는 명식                       8,364 (40.3%)
 *     「좋게 읽어야 할 沖」이 섞인 명식      4,752 (22.9%)  ← 다섯에 한 명
 *     沖이 전부 좋은 쪽인데 다 나쁘게 나감  3,600 (17.4%)  ← 여섯에 한 명
 *     31부에서 고친 대운수 순행 버그(약 9%)보다 큽니다.
 *
 *   [어떻게 고쳤나]
 *     · saju 를 그대로 돌며 pillar 를 살립니다. 부르는 쪽은 한 글자도 안 고쳤습니다.
 *     · 자리 판정은 yukchinRule.ts 의 CHUNG_POSITION 을 씁니다 (표를 두 벌로 두지 않음).
 *     · 일지가 끼면 '부정' → 지금까지 쓰던 chungMeaning 의 say 를 그대로 씁니다.
 *       일지가 안 끼면 '변동' → 교재대로 이동·변동 쪽으로 돌립니다.
 *     · 영향력이 큰 것부터 냅니다 (월일 〉 일시 〉 연월).
 *
 *   ⚠️ 「긍정 70%」를 "좋습니다" 로 못 박지 않았습니다. 나머지 30%가 있습니다.
 *      방향만 「변화·변동」으로 돌립니다.
 *   ⚠️ 여기는 **원국 안의 沖**만 봅니다. 대운·세운에서 오는 沖은 잣대가 다릅니다
 *      (chungMeaning.CHUNG_RULE — "대운·세운은 일단 월지에 먼저 대입한다").
 */
/**
 * ★2026-07-28 — 지지 합(육합·삼합·방합)을 재료에 넣습니다.
 *
 * [무엇이 빠져 있었나]
 *   합 쪽이 **천간합 다섯 짝만** 보고 있었습니다.
 *   `hapMeaning.ts` 에 육합(80쪽)·삼합(80~81쪽)·방합(82쪽) 자료가 다 들어 있는데
 *   꺼내는 곳이 없었습니다. 33-3장의 沖과 똑같은 자리입니다.
 *     교훈 BO — 표에만 있는 규칙은 없는 규칙이다.
 *
 *   실측 — 지지 합이 있는 명식이 **49.3%** 입니다. 두 명에 한 명이 못 듣고 있었습니다.
 *
 * [어떤 차례로 내는가 — 교재가 매긴 세기]
 *   교재 261쪽 "삼합은 천간합이나 육합에 견주어 강력합니다"
 *   교재 340쪽 "세기는 삼합보다 방국이 더 강합니다"
 *     → 방합 〉 삼합 〉 육합 〉 천간합
 *
 * [월지 조건 — 교재 259·343쪽]
 *   "세 지지 중 하나는 반드시 월지에 있어야 삼합(방국)이 강하게 섭니다"
 *   ★성립을 막지는 않습니다. 월지에 안 걸리면 「힘이 덜하다」고 덧붙입니다.
 *     막아 버리면 손님이 자기 명식의 합을 아예 못 듣습니다. (교훈 BV)
 *
 * ⚠️ 준삼합·반합(교재 81쪽 SAMHAP_PARTIAL)은 넣지 않습니다.
 *    ★2026-07-28 대표님 확정 — "재료가 너무 비대해지는 것을 막고
 *      core 합(방합·삼합·육합) 위주로 통변하는 게 더 깔끔하다."
 *    두 글자만으로도 서는 것이라 걸리는 명식이 크게 늘어 재료가 넘칩니다.
 *    나중에 넣으실 거라면 걸림 비율부터 재십시오. (교훈 BO)
 */
function jijiHapBrief(saju: Pill[], score?: Record<Ohaeng, number>): string[] {
  const out: string[] = []
  // ★2026-07-29 — 성립 판정은 hapJudge 가 한다. 여기서는 말만 짓는다. (교훈 CJ)
  for (const h of judgeJijiHap(saju, score)) {
    const r = findHap(h.key)
    if (!r) continue
    const say = r.say.filter(t => !isRuleLine(t)).slice(0, h.kind === '육합' ? 1 : 2)
    if (!say.length) continue
    const nm = r.name ?? ''
    const head = h.kind === '육합'
      ? `${h.key}${nm ? `(${nm})` : ''}`
      : `${h.key} ${nm}(${h.kind})`
    // 월지 조건 — 교재 80·82쪽. 막지 않고 단서만 붙인다 (교훈 BV)
    const weak = h.kind === '육합' || h.monthTied
      ? '' : ' 다만 월지에 걸치지 않아 힘이 덜합니다.'
    // 子丑·巳申 처럼 갈리는 합은 이번 명식이 어느 쪽인지 밝힌다 (교재 80쪽)
    const hwa = h.hwaEl ? ` 이 명식은 ${h.hwaWhy} ${h.hwaEl}로 봅니다.` : ''
    // 午未合이 깨지는 자리 (교재 80쪽)
    const broken = h.broken ? ` ${h.broken} 가까운 사이가 팍팍해지기 쉬우니 살펴 주십시오.` : ''
    out.push(`${head} · ${h.where} — ${say.join(' ')}${hwa}${weak}${broken}`)
  }
  return out
}

/**
 * ★2026-07-29 — 자화간합(82쪽) · 암합(83쪽) · 합이 많음(83쪽)
 *
 *   [무엇이 빠져 있었나]
 *     `hapMeaning.ts` 에 자료가 다 있는데 **꺼내는 곳이 0건**이었습니다.
 *       JAHWA_GANHAP · AMHAP_NOTE · HAP_MANY · CHEONJI_HAPDEOK · CHEONGAN_HAP_BLOCK
 *     34부의 지지 합과 똑같은 자리입니다. (교훈 BO)
 *
 *   [실측] 자화간합 8.3% · 암합(亥午) 6.9% · 암합(卯申) 7.1% · 합이 많음 2.2%
 */
function jahwaAmhapBrief(saju: Pill[], score?: Record<Ohaeng, number>): string[] {
  const out: string[] = []
  const day = saju.find(p => p.pillar === '일주')

  // ── 자화간합 (82쪽) — 다섯 일주 ──
  if (day) {
    const j = judgeJahwa(day.stem, day.branch)
    if (j) {
      const say = j.say.filter(t => !isRuleLine(t))
      out.push(`자화간합 ${j.key}(${j.keyword ?? ''}) · 일주 — ${say.join(' ')} 복록이 있고 총명하며 부부 인연이 좋은 고품격 일주로 봅니다.`)
    }
  }

  // ── 암합 (83쪽) — 겉으로 안 드러나는 지장간끼리의 합 ──
  //    ★두 줄까지만. 개고 조건에 걸린 것이 여럿일 수 있어 재료가 불어납니다.
  for (const a of judgeAmhap(saju).slice(0, 2)) {
    const open = a.needsOpen && a.openedBy ? ` ${a.openedBy}으로 창고 문이 열려 인정됩니다.` : ''
    // ★말은 교재 자료(AMHAP_NOTE)에서 가져온다. 여기서 새로 짓지 않는다.
    out.push(`암합 ${a.chars.join('')}(${a.ganhap.join('·')}) · ${a.where} — ${AMHAP_NOTE[0]} ${AMHAP_NOTE[1]}${open}`)
  }

  // ── 합이 많은가 · 천지합덕 (83쪽) ──
  //    ★교재는 이 대목을 남녀로 갈라 적습니다. hapMeaning 이 이미 성별을 떼어 두었습니다.
  if (isCheonjiHapdeok(saju, score)) {
    out.push(`천지합덕 — ${CHEONJI_HAPDEOK.slice(1).join(' ')}`)
  } else if (judgeJijiHap(saju, score).length + judgeCheonganHap(saju).filter(h => h.seongrip).length >= 3) {
    out.push(HAP_MANY.join(' '))
  }
  return out
}

export function hapChungBrief(saju: Pill[], target: Target, opt: { 합?: boolean; 충?: boolean; 건강?: boolean } = { 합: true, 충: true }, score?: Record<Ohaeng, number>): string[] {
  const out: string[] = []; const seen = new Set<string>()
  if (opt.충) {
    // ★자리를 살려서 본다. branches 로 줄이지 않는다.
    for (const hit of chungInSaju(saju)) {
      if (seen.has(hit.key)) continue
      const r = findChungByChars(saju.find(p => p.pillar === hit.a)!.branch,
                                 saju.find(p => p.pillar === hit.b)!.branch)
      if (!r) continue
      seen.add(hit.key)
      const where = `${toJiName(hit.a)}-${toJiName(hit.b)}`
      if (hit.rule.tone === '변동') {
        // 교재 121쪽 — 부정적으로 보지 않는다. 변화·변동으로 읽는다.
        //   ★다만 沖마다 교재가 따로 매긴 결(원수충·역마충·법고·붕충 등)은 살린다.
        //     자리 판정으로 덮어 버리면 卯酉沖(원수충)이 그냥 '이동' 이 되어 버린다.
        //     그래서 자리 줄을 앞에 두고, 그 沖의 첫 줄을 뒤에 붙인다.
        const own = r.say.filter(t => !isRuleLine(t)).slice(0, 1)
        out.push(`${r.key}${r.alias ? `(${r.alias})` : ''} · ${where} — ${hit.rule.say}${own.length ? ' ' + own.join(' ') : ''}`)
      } else {
        const say = r.say.filter(t => !isRuleLine(t)).slice(0, 2)
        const extra = opt.건강 && target === 'adult' ? (r.sayAdult ?? []).slice(0, 2) : []
        out.push(`${r.key}${r.alias ? `(${r.alias})` : ''} · ${where} — ${[...say, ...extra].join(' ')}`)
      }
    }
  }
  if (opt.합) {
    // ── 지지 합이 먼저 — 교재가 매긴 세기대로 (방합 〉 삼합 〉 육합 〉 천간합) ──
    out.push(...jijiHapBrief(saju, score))

    // ── 천간합 다섯 짝 (교재 78~79쪽) ────────────────────────────────
    //   ★2026-07-29 — 전에는 `stems.includes(a) && stems.includes(b)` 뿐이라
    //     **자리를 아예 안 봤습니다.** 교재 78쪽이 든 두 예가 모두 자리 이야기입니다.
    //         甲庚己 — 사이의 庚이 甲을 극해 합이 이루어지지 않는다
    //         甲乙己 — 사이의 乙이 끼어 합을 방해한다
    //     실측 — 천간합이 있는 명식의 절반(전수 23.0%)이 방해받는 자리인데
    //            그대로 「합이 있습니다」로 나가고 있었습니다.
    //   ⚠️ 막지 않고 **까닭을 붙여** 내보냅니다. (교훈 BV)
    for (const h of judgeCheonganHap(saju)) {
      if (seen.has(h.key)) continue
      const r = findHap(h.key); if (!r) continue
      seen.add(h.key)

      if (!h.seongrip) {
        const why = h.block?.kind === '극'
          ? `사이에 ${h.block.by}이(가) 있어 극하니`
          : `사이에 ${h.block?.by ?? '다른 글자'}이(가) 끼어`
        out.push(`${h.key}${r.name ? `(${r.name})` : ''} · ${h.where} — ${why} 합이 이루어지지 않습니다. 끌어당기는 마음은 있으나 맺어지기까지 한 번 걸러집니다.`)
        continue
      }

      const say = r.say.filter(t => !isRuleLine(t)).slice(0, 2)
      const extra = target === 'adult' ? (r.sayAdult ?? []).slice(0, 1) : []
      // 합화 — 교재 78쪽 "지지에 합화된 세력이 있을 경우에 합화된다"
      const hwa = h.hwa
        ? ` 지지에 ${h.hwaEl} 세력이 있어 합화됩니다.`
        : ' 다만 지지에 받쳐 줄 세력이 없어 합하되 다른 오행으로 변하지는 않습니다.'
      out.push(`${h.key}${r.name ? `(${r.name})` : ''} · ${h.where} — ${[...say, ...extra].join(' ')}${hwa}`)
    }

    // ── 쟁합·투합 (교재 78쪽) ──
    //   ★교재는 이 둘을 남녀로 갈라 적습니다. hapMeaning 이 이미 성별을 떼어 두었습니다.
    for (const h of judgeCheonganHap(saju)) {
      if (!h.dispute) continue
      const line = CHEONGAN_HAP_BLOCK.find(t => t.includes(h.dispute!))
      if (line) out.push(`${h.key} — ${line.split('—')[1]?.trim() ?? line}`)
      break   // 한 줄이면 넉넉합니다
    }

    // ── 자화간합 · 암합 · 합이 많음 (교재 82~83쪽) ──
    out.push(...jahwaAmhapBrief(saju, score))
  }
  return out
}

/**
 * 걸린 살만.
 *   ★교재가 개수·자리 조건을 적어 둔 살만 잰다.
 *     역마·화개·천문성·천라·지망은 조건이 없어 거의 모두에게 걸린다. (교훈 BO)
 *   ⚠️ 양인살은 96쪽(다섯, 일간 기준 월지)으로 잰다. 93쪽(셋)과 다르다 — 연재쌤 확인.
 */
export function salHits(saju: Pill[]): string[] {
  const at = (n: string) => saju.find(p => p.pillar === n)
  const branches = saju.map(p => p.branch).filter(Boolean)
  const stems = saju.map(p => p.stem).filter(Boolean)
  const pillars = saju.map(p => `${p.stem}${p.branch}`)
  const monthB = at('월주')?.branch ?? ''; const dayB = at('일주')?.branch ?? ''
  const dayStem = at('일주')?.stem ?? ''
  const hits: string[] = []
  const DOHWA = ['子', '午', '卯', '酉']
  if (branches.filter(b => DOHWA.includes(b)).length >= 2 && (DOHWA.includes(monthB) || DOHWA.includes(dayB))) hits.push('dohwa')
  const HC = ['甲', '午', '未', '申', '辛']
  if ([...stems, ...branches].filter(c => HC.includes(c)).length >= 3 || (HC.includes(dayStem) && HC.includes(dayB))) hits.push('hyeonchim')
  if (['甲辰','乙未','丙戌','丁丑','戊辰','壬戌','癸丑'].some(x => pillars.includes(x))) hits.push('baekho')
  if (['庚辰','庚戌','壬辰','壬戌','戊辰','戊戌'].some(x => pillars.includes(x))) hits.push('goegang')
  const Y: Record<string, string> = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' }
  if (dayStem && Y[dayStem] && monthB === Y[dayStem]) hits.push('yangin')
  for (const key of ['cheoneulgwiin', 'munchang']) {
    const r = SAL_TABLE.find(x => x.key === key)
    if ((r?.byDayStem?.[dayStem] ?? []).some(b => branches.includes(b))) hits.push(key)
  }
  return hits
}

/** 걸린 살을 문장으로. keys 를 주면 그중에서만 고른다 */
export function salBrief(saju: Pill[], target: Target, withJobs = false, keys?: string[]): string[] {
  return salHits(saju)
    .filter(k => !keys || keys.includes(k))
    .map(k => {
      const r = SAL_TABLE.find(x => x.key === k); if (!r) return ''
      const mean = r.say.filter(t => !isRuleLine(t))
      const say = [...mean.slice(0, 2), ...(target === 'adult' ? (r.sayAdult ?? []).slice(0, 1) : [])]
      const jobs = withJobs && r.jobs?.length ? ` (교재가 든 일: ${r.jobs.slice(0, 5).join('·')})` : ''
      return `${r.name} — ${say.join(' ')}${jobs}`
    })
    .filter(Boolean)
}

/** 문과:이과 비율 — 교재 25쪽 */
export function munYiBrief(score: Record<Ohaeng, number>): string {
  const top = (['목','화','토','금','수'] as Ohaeng[]).slice().sort((a,b)=>(score[b]??0)-(score[a]??0))[0]
  const r = OHAENG_25[top]
  return r ? `가장 센 기운은 ${top}(${r.hanja})이고, 교재 25쪽은 이 기운의 문과:이과 비율을 ${r.munYi} 로 봅니다.` : ''
}

/** 오행의 계절·하루·인생 — 교재 25쪽 */
export function stage25(el: Ohaeng): string {
  const r = OHAENG_25[el]
  return r ? `${el}(${r.hanja}) — 계절은 ${r.season}, 하루로는 ${r.timeOfDay}, 인생으로는 ${r.lifeStage}, 색은 ${r.color}, 맛은 ${r.taste}입니다.` : ''
}

/**
 * 형·파·해·원진 — 교재 87~93쪽. 원국에 실제로 선 것만.
 *   ⚠️ 판정은 하지 않는다. 두 글자가 함께 있는지만 본다.
 *      세기는 hapchungScore.ts 가 잰다.
 */
export function hyeongPaHaeBrief(saju: Pill[], target: Target): string[] {
  // hyeongPaHae.ts 는 '성인'|'학생' 으로 받는다. 여기서 이어 준다.
  const who = target === 'adult' ? '성인' : '학생'
  const b = saju.map(p => p.branch).filter(Boolean)
  const out: string[] = []
  const seen = new Set<string>()
  // 삼형은 세 글자가 다 있어야 선다
  for (const r of findSamhyeong(b)) {
    if (seen.has(r.key)) continue
    seen.add(r.key)
    out.push(`${r.key}${r.alias ? `(${r.alias})` : ''} — ${relLines(r, who).slice(0, 3).join(' ')}`)
  }
  for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
    for (const r of findRel(b[i], b[j])) {
      if (seen.has(r.key)) continue
      seen.add(r.key)
      out.push(`${r.key}${r.alias ? `(${r.alias})` : ''} — ${relLines(r, who).slice(0, 2).join(' ')}`)
    }
  }
  return out
}

// ═══════════════════════════════════════════════════════════
//  질문 갈래로 자료를 고르는 공용 잣대
//    ★모르는 갈래거나 갈래가 안 오면 **다 내보낸다.**
//      자유질문란이 생겨도 재료가 비지 않게 하기 위함이다. (2026-07-28 대표님 지시)
// ═══════════════════════════════════════════════════════════

export type Need = '일간' | '오행' | '건강' | '개운' | '합' | '충' | '형파해' | '살' | '직업' | '다루는법' | '인생단계' | '문이과' | '육친' | '병존' | '지지특징'

const ALL_NEEDS: Need[] = ['일간','오행','건강','개운','합','충','형파해','살','직업','다루는법','인생단계','문이과','육친','병존','지지특징']

/** 사주보기·대운·세운 질문 대분류 (questions.ts) */
export const CATEGORY_NEEDS: Record<string, Need[]> = {
  '건강': ['건강','충','형파해','개운'],
  '건강·자기': ['건강','오행','개운','일간','육친'],
  // ★2026-07-29 — 「합」을 넣었습니다.
  //   교재 82쪽 "사주에 方局이나 三合이 있으면 크게 성공하는 경우가 많다"
  //   재물이야말로 합이 중요한 자리인데 34부까지 합이 안 나가고 있었습니다.
  '재물': ['오행','합','충','형파해','일간','육친'],
  '노후·재물': ['오행','합','충','인생단계','육친'],
  '진로·적성': ['일간','오행','살','직업','문이과','육친'],
  '직업·진로': ['일간','오행','살','직업','문이과','육친'],
  // ★2026-07-29 — 「직업·사업」·「취업」에도 합을 넣었습니다. (대표님 확정)
  //   상한에 걸리는 비율이 오르지만(직업·사업 6.0% · 취업 1.2%)
  //   CORE_NEEDS 가 갈래의 알맹이(직업·문이과·살)를 지켜 주므로
  //   사라지는 것은 곁가지(형파해·육친)입니다.
  '직업·사업': ['일간','살','직업','합','충','형파해','육친'],
  '취업': ['일간','살','직업','합','문이과','육친'],
  '연애': ['합','살','일간'],
  '연애·결혼': ['합','충','형파해','일간','육친'],
  '관계·마음': ['일간','다루는법','합','형파해','육친'],
  '인간관계': ['일간','다루는법','합','형파해','육친'],
  '가정': ['충','형파해','일간','다루는법','육친'],
  '가족': ['충','형파해','다루는법','육친'],
  '부모': ['충','형파해','다루는법','육친'],
  '자녀': ['충','오행','육친'],
  '출산·자녀': ['충','오행','육친'],
  '노후': ['인생단계','오행','건강'],
  '인생후반': ['인생단계','오행','충','형파해'],
}

/** 궁합 질문 대분류 (coupleQuestions.ts) */
export const COUPLE_CATEGORY_NEEDS: Record<string, Need[]> = {
  '끌림·첫인상': ['일간','합','살'],
  '성격·기질': ['일간','오행','다루는법','육친'],
  '소통·감정': ['일간','다루는법','합','육친'],
  '관계 지속성': ['합','충','형파해'],
  '갈등·주의점': ['충','형파해','다루는법','육친'],
  '속궁합·친밀감': ['합','살','일간'],
  '결혼·미래운': ['합','충','형파해','인생단계'],
  '관계 조언·개운': ['다루는법','개운','오행','육친'],
  '종합': ALL_NEEDS,
}

/**
 * ★대운·세운·월운 질문 대분류 (unseQuestions.ts) — 2026-07-28 추가
 *
 *   [무엇이 문제였나]
 *     CATEGORY_NEEDS 는 **사주보기 갈래 19개만** 담고 있었습니다.
 *     그런데 대운·세운·월운은 갈래 이름이 아예 다른 벌입니다.
 *       사주보기   직업·진로 · 직업·사업 · 관계·마음 · 인간관계 · 인생후반 …
 *       대운·세운   직업 ·      학업 ·      관계 ·      주의 ·      인생 흐름 …
 *     이름이 안 맞으니 needsOf 가 못 찾고 「모르면 다 준다」(교훈 BV)로 빠졌습니다.
 *     안전망이라 통변이 비지는 않았으나, 손님이 「직업」 하나만 골라도
 *     열두 Need 가 전부 실려 재료가 늘 통째로 나갔습니다.
 *
 *   [실측] 대운·세운·월운 갈래 13개 중 **9개가 표에 없었습니다.**
 *     있던 것  건강 · 재물 · 연애 · 연애·결혼   (사주보기와 이름이 같아 우연히 걸림)
 *     없던 것  인생 흐름 · 전환기 · 타이밍 · 직업 · 주의 · 종합 · 관계 · 학업 · 마음
 *
 *   [왜 표를 둘로 나눴나]
 *     같은 「재물」이라도 묻는 결이 다릅니다.
 *       대운 재물   "돈이 크게 모이는 시기는 언제쯤인가요"   → 10년 단위. 인생단계
 *       세운 재물   "올해 돈 흐름은 어떤가요"              → 한 해. 그해 합충
 *       월운 재물   "돈이 들어오거나 나가기 쉬운 달은"      → 달. 합충
 *     대운은 **시기**를 묻고 세운·월운은 **그때 무슨 일**을 묻습니다.
 *     그래서 대운은 인생단계를 앞세우고, 세운·월운은 합·충을 앞세웁니다.
 *
 *   ⚠️ 세운 진입이면 세운과 월운 질문이 섞입니다(groupUnseByKind).
 *      둘은 결이 가까워 한 표로 묶었습니다.
 */
export const DAEUN_CATEGORY_NEEDS: Record<string, Need[]> = {
  // 대운 11문 — 「언제」를 묻는 자리라 인생단계를 늘 깝니다
  '인생 흐름': ['인생단계','오행','일간','합','충'],
  '전환기':    ['충','형파해','인생단계','개운'],
  '재물':      ['오행','인생단계','충'],
  '직업':      ['일간','오행','직업','살','인생단계','육친'],
  '관계':      ['일간','다루는법','합','충','육친'],
  '건강':      ['건강','오행','충','형파해'],
  '마음':      ['일간','오행','다루는법','개운','육친'],
}

export const SEYUN_CATEGORY_NEEDS: Record<string, Need[]> = {
  // 세운 10문 — 「올해 무슨 일」을 묻는 자리라 합·충을 앞세웁니다
  '종합':      ALL_NEEDS,
  '재물':      ['오행','충','형파해','일간'],
  '연애·결혼': ['합','충','형파해','일간','육친'],
  '직업':      ['일간','살','직업','충','형파해','육친'],
  '건강':      ['건강','충','형파해','개운'],
  '관계':      ['일간','다루는법','합','형파해','육친'],
  '학업':      ['일간','오행','문이과','살','육친'],
  '주의':      ['충','형파해','살','개운'],
  '타이밍':    ['합','충','인생단계'],
  // 월운 6문 — 세운 진입이면 함께 섞여 나옵니다
  '연애':      ['합','살','일간'],
}

/**
 * ★월운 6문 — 「몇 월인가」를 묻는 자리라 가장 좁습니다 (2026-07-28)
 *   달 단위는 원국을 길게 풀 자리가 아니라 합·충과 타이밍만 봅니다.
 */
export const WOLUN_CATEGORY_NEEDS: Record<string, Need[]> = {
  '종합':   ['일간','오행','합','충'],
  '타이밍': ['합','충'],
  '재물':   ['오행','충'],
  '연애':   ['합','살','일간'],
  '주의':   ['충','형파해','살'],
}

/**
 * ★2026-07-29 — 통합 리포트의 갈래 표.
 *
 *   사주 갈래(CATEGORY_NEEDS) 전부에, 사주에 없던 「시기」 셋을 얹습니다.
 *   시기 갈래는 대운 표에서 그대로 가져옵니다 — 묻는 결이 같기 때문입니다.
 *
 *   ⚠️ 표를 새로 베껴 적지 않고 **펼쳐서 얹습니다.**
 *      베끼면 CATEGORY_NEEDS 를 고칠 때 한쪽만 고쳐져 갈립니다. (교훈 CJ)
 */
const INTEGRATED_CATEGORY_NEEDS: Record<string, Need[]> = {
  ...CATEGORY_NEEDS,
  '인생 흐름': DAEUN_CATEGORY_NEEDS['인생 흐름'],
  '전환기':    DAEUN_CATEGORY_NEEDS['전환기'],
  '타이밍':    SEYUN_CATEGORY_NEEDS['타이밍'],
}

/** 대운 진입인지 세운 진입인지로 표를 고른다 (unseQuestions.UnseEntry) */
export function unseTableOf(entry?: 'daeun' | 'seyun' | null): Record<string, Need[]> {
  return entry === 'daeun' ? DAEUN_CATEGORY_NEEDS : SEYUN_CATEGORY_NEEDS
}

/**
 * 갈래 → 무엇을 꺼낼까.
 *   ★갈래가 없거나 표에 없는 갈래(자유질문 등)면 **전부** 돌려준다.
 *     "모르면 다 준다" 가 "모르면 안 준다" 보다 낫다. AI 가 고르면 된다.
 *
 *   ★2026-07-28 — fallback 을 더했다.
 *     대운·세운·월운은 갈래 이름이 사주보기와 다른 벌이라
 *     table(CATEGORY_NEEDS)에서 못 찾고 늘 「전부」로 빠지고 있었다.
 *     table 에서 못 찾으면 fallback 을 한 번 더 본다.
 *     사주보기·궁합 갈래와 이름이 겹치는 넷(건강·재물·연애·연애·결혼)은
 *     table 이 먼저라 예전 그대로 나간다. 손님 화면이 안 바뀐다.
 */
export function needsOf(
  cats?: string[],
  table: Record<string, Need[]> = CATEGORY_NEEDS,
  fallback?: Record<string, Need[]>,
): Set<Need> {
  if (!cats?.length) return new Set(ALL_NEEDS)
  const out = new Set<Need>(['일간'])   // 일간은 늘 밑바탕
  let unknown = false
  for (const c of cats) {
    const n = table[c] ?? fallback?.[c]
    if (!n) { unknown = true; continue }
    for (const x of n) out.add(x)
  }
  // 모르는 갈래가 하나라도 있으면 다 준다
  return unknown ? new Set(ALL_NEEDS) : out
}

/** 고른 need 로 재료 줄을 만든다 — 여섯 서비스가 함께 쓴다 */
export function pickLines(
  need: Set<Need>,
  a: { saju?: Pill[]; dayStem?: string; score?: Record<Ohaeng, number>; target?: Target; gender?: string },
): string[] {
  const t: Target = a.target ?? 'adult'
  const out: string[] = []
  if (need.has('일간') && a.dayStem) out.push(...cheonganBrief(a.dayStem, need.size >= 8 ? 3 : 5, a.gender))
  if (a.score) {
    if (need.has('오행') || need.has('건강') || need.has('개운') || need.has('다루는법')) {
      out.push(...ohaengBrief(a.score, t, {
        결: need.has('오행'), 건강: need.has('건강'),
        개운: need.has('개운'), 다루는법: need.has('다루는법'),
      }))
    }
    if (need.has('인생단계')) {
      const top = (['목','화','토','금','수'] as Ohaeng[]).slice().sort((x, y) => (a.score![y] ?? 0) - (a.score![x] ?? 0))[0]
      const st = stage25(top); if (st) out.push(st)
    }
    if (need.has('문이과')) { const m = munYiBrief(a.score); if (m) out.push(m) }
  }
  if (a.saju?.length) {
    if (need.has('합') || need.has('충')) {
      out.push(...hapChungBrief(a.saju, t, { 합: need.has('합'), 충: need.has('충'), 건강: need.has('건강') }, a.score))
    }
    if (need.has('형파해')) out.push(...hyeongPaHaeBrief(a.saju, t).slice(0, 4))
    if (need.has('살')) out.push(...salBrief(a.saju, t, need.has('직업')))
    // ★육친(십성) — 명리적성 3장 106~131쪽 (2026-07-28)
    //   십성별(106~115)과 짝별(116~131)은 축이 다르므로 둘 다 얹는다.
    //     yukchinBrief  센 십성. 그 사람이 어떤 사람인가
    //     groupBrief    과다한 짝과 아예 없는 짝. 없으면 아무것도 안 낸다
    //   ⚠️ 관계 대상(gwangye)은 안 나간다. 궁합에서 "이 사람에게 아내는" 이 뜨면 곤란하다.
    //
    //   ★재료가 넓을 때는 조인다 (교훈 BU).
    //     질문 없음·종합·모르는 갈래면 Need 가 열넷 다 켜진다.
    //     그때 육친까지 통째로 실으면 32-4장에서 맞춰 두신 1,300자를 훌쩍 넘는다.
    //   ★그리고 육친 묶음 전체에 글자 상한을 둔다.
    //     조건절이 많이 걸린 명식은 줄 수를 조여도 한 줄이 길어져 부푼다.
    //     상한을 넘으면 뒤에서부터 자른다. 앞에 센 것이 오므로 중요한 것이 남는다.
    if (need.has('육친')) {
      const wide = need.size >= 10
      const yuk: string[] = []
      yuk.push(...yukchinBrief(a.saju, t, {
        keys: wide ? 1 : 2, cap: wide ? 2 : 3,
        다루는법: !wide && need.has('다루는법'),
        개운: !wide && need.has('개운'),
        직업: !wide && need.has('직업'),
      }))
      const g = groupBrief(a.saju, t, {
        cap: wide ? 1 : 2,
        onlyGwada: wide,            // 넓을 때는 「없는 짝」을 뺀다. 오행 결핍과 결이 겹친다
        maxKeys: wide ? 1 : 3,
        보완: !wide && need.has('개운'),
        개운: !wide && need.has('개운'),
        직업: !wide && need.has('직업'),
      })
      yuk.push(...g)
      // ★글자 상한 — YUKCHIN_CAP 에서 고칩니다 (교훈 BA — 분포를 재고 정할 것)
      const CAP = wide ? YUKCHIN_CAP.wide : YUKCHIN_CAP.narrow
      let used = 0
      const cut: string[] = []
      for (const line of yuk) {
        if (used + line.length > CAP && cut.length) break
        cut.push(line); used += line.length
      }
      out.push(...cut)
      // ★편중 이야기가 나갔으면 맺음말을 맨 마지막에 붙인다 (교재 123·126·129쪽)
      //   앞에 두면 앞말이 변명처럼 들리고, 빼면 손님이 무서운 말만 안고 나간다.
      if (cut.some(t2 => t2.includes('과다'))) out.push(...PYEONJUNG_CLOSING)
    }
  }
  return out
}
