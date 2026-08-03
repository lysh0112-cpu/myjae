// lib/saju/career/jobs.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ⑩  —  어울리는 직업                                │
// │  출전: 『명리적성 비법노트』(심산) 73~97쪽 전반                      │
// └───────────────────────────────────────────────────────────────┘
//
// [왜 교차로 추리는가]
//   교재의 직업 목록을 다 늘어놓으면 백 개가 넘는다.
//   그런데 책 사례는 하나같이 **다섯 개 안팎**만 짚는다.
//
//     (1) 신생아   산업공학·전자재료공학·제어계측학·동력기계공학·자동차교통공학
//     (6) 특목고1  뇌의학·뇌과학·심리학·법학·정신분석학
//
//   여러 자리에서 거듭 나오는 것이 그 사람의 자리다.
//   그래서 **몇 군데서 나왔나**를 세어 위에서부터 고른다.
//
// [무게 — 교재 133쪽]
//   "오행과 육친의 강점 지능이 진로적성인 경우가 70%이고,
//    용신이 진로적성인 경우는 30%"
//   → 강점 쪽을 무겁게, 용신을 가볍게 둔다.
//
//     오행×육친 25칸   3   가장 구체적이다
//     육친 강점        2
//     오행 강점        2
//     신살             2   (작용력이 가장 크면 3)
//     오행 용신        1
//     육친 용신        1
//
//   두 군데 이상(합 4점 이상)에서 나온 것만 고른다.

import { calcCareerScore, gradeAll, pickStrong, type Ohaeng } from './careerScore'
import { ADULT_JOB_BLOCKLIST } from './roleFit'
import { yukchinOf } from './yukchin'
import { checkSinsal9 } from './sinsal9'
import { calcCareerYongsin } from './yongsin'
import type { CareerCard, CareerInput } from './types'
import { calcCareerGyeokguk } from './gyeokguk'
import { ILJU } from './tables/ilju'
import { OHAENG_JOBS, jobKey, jobLabel, okForStudent } from './tables/jobs'

/**
 * ★성인 리포트에서 걸러 낼 직업 «열쇠» (44부 43차)
 *
 *  ⚠️ 목록은 roleFit 의 것을 «가져다» 씁니다. 두 벌로 적지 마십시오. (교훈 E)
 *  ⚠️ 열쇠로 바꿔 두는 까닭 — jobKey 가 「수도사업」을 「수도」로 줄입니다.
 *     날것으로 견주면 «안 걸립니다».
 */
const BLOCKED_KEYS = new Set(ADULT_JOB_BLOCKLIST.map(jobKey))
import { YUKCHIN_GIJIL, GRID25, YUKCHIN_ORDER, type YukchinGroup } from './tables/yukchin'
import { GYEOKGUK_INFO } from './tables/gyeokguk'
import { SINSAL9 } from './tables/sinsal'
import { YONGSIN_OHAENG, YONGSIN_YUKCHIN } from './tables/yongsin'

// ── 흔한 직업 눌러 주기 ──────────────────────────────────────────
//
// ★교재의 직업 목록 59벌을 다 세어 보면 이렇다.
//     의사 17벌 · 요식업 15벌 · 상담사 14벌 · 법조인 14벌 · 교사 13벌 …
//     그런데 481가지 중 288가지(60%)는 딱 한 벌에만 나온다.
//
//   흔한 낱말은 누구에게나 걸린다. 그대로 세면 어떤 사주를 넣어도
//   "의사·요식업·상담사"가 위로 올라와 변별이 안 된다.
//   그래서 **여러 벌에 두루 나오는 것일수록 무게를 덜어 준다.**
//
//   ※ 이건 교재에 없는 우리 판단이다. (연재쌤 확인 대상)
const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']
function buildFreq(): Map<string, number> {
  const lists: string[][] = []
  for (const e of EL5) lists.push(OHAENG_JOBS[e])
  for (const g of YUKCHIN_ORDER) lists.push(YUKCHIN_GIJIL[g].jobs)
  for (const g of YUKCHIN_ORDER) for (const e of EL5) lists.push(GRID25[g][e].jobs)
  for (const s of SINSAL9) lists.push(s.jobs)
  for (const k of Object.keys(GYEOKGUK_INFO)) lists.push(GYEOKGUK_INFO[k].jobs)
  for (const k of Object.keys(ILJU)) lists.push(ILJU[k].jobs)
  for (const e of EL5) lists.push(YONGSIN_OHAENG[e])
  for (const k of Object.keys(YONGSIN_YUKCHIN)) lists.push(YONGSIN_YUKCHIN[k])
  const m = new Map<string, number>()
  for (const l of lists) {
    const seen = new Set<string>()
    for (const j of l) {
      const k = jobKey(j)
      if (!k || seen.has(k)) continue
      seen.add(k)
      m.set(k, (m.get(k) ?? 0) + 1)
    }
  }
  return m
}
const FREQ = buildFreq()

/** 흔할수록 낮아지는 계수 */
export function rarityOf(key: string): number {
  const n = FREQ.get(key) ?? 1
  if (n <= 2) return 1
  if (n <= 5) return 0.9
  if (n <= 9) return 0.8
  return 0.7
}

const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

/** 어디서 나왔는지 */
export interface JobSource { label: string; weight: number }
export interface JobHit {
  key: string
  label: string
  /** 희소성을 반영한 최종 점수 */
  score: number
  /** 희소성 반영 전 원점수 */
  raw: number
  /** 교재 목록 59벌 중 몇 벌에 나오는가 */
  freq: number
  sources: JobSource[]
}

/** 문턱 — 이 점수 이상이어야 "어울린다"고 본다 (두 군데 이상) */
export const JOB_MIN = 4
/** 화면에 보일 개수 */
export const JOB_SHOW = 10

export function pickJobs(input: CareerInput): { hits: JobHit[]; pool: number } {
  const day = input.saju.find(p => p.pillar === '일주')
  const dayEl = day && day.stem !== '?' ? STEM_EL[day.stem] : null
  if (!dayEl) return { hits: [], pool: 0 }

  const r = calcCareerScore(input.saju, input.solarMonth, input.solarDay, input.hourBranch)
  const g = gradeAll(r)
  const strong = pickStrong(r, g).slice(0, 2)     // 대표 오행 둘까지

  const bag = new Map<string, JobHit>()
  const add = (jobs: string[], label: string, weight: number) => {
    const seen = new Set<string>()
    for (const raw of jobs) {
      const k = jobKey(raw)
      if (!k || seen.has(k)) continue        // 한 출처 안에서 겹치면 한 번만
      seen.add(k)
      const cur = bag.get(k) ?? { key: k, label: jobLabel(k), score: 0, raw: 0, freq: FREQ.get(k) ?? 1, sources: [] }
      cur.raw += weight
      cur.score = Math.round(cur.raw * rarityOf(k) * 10) / 10
      cur.sources.push({ label, weight })
      bag.set(k, cur)
    }
  }

  // ① 오행 강점 · ② 육친 강점 · ③ 25칸 격자
  for (const el of strong) {
    const grp = yukchinOf(dayEl, el) as YukchinGroup
    add(OHAENG_JOBS[el] ?? [], `${el} 오행`, 2)
    add(YUKCHIN_GIJIL[grp]?.jobs ?? [], `${grp}`, 2)
    add(GRID25[grp]?.[el]?.jobs ?? [], `${el} ${grp}`, 3)
  }

  // ④ 격국 — 그릇이 가리키는 자리 (교재 62~65쪽)
  if (day && day.stem !== '?') {
    const gk = calcCareerGyeokguk(input.saju, day.stem)
    const info = GYEOKGUK_INFO[gk.name]
    if (info) add(info.jobs, gk.name, 2)
  }

  // ⑤ 일주 — 60갑자가 가리키는 자리 (교재 100~127쪽)
  if (day && day.stem !== '?' && day.branch !== '?') {
    const ij = ILJU[day.stem + day.branch]
    if (ij) add(ij.jobs, `${ij.ko} 일주`, 2)
  }

  // ⑥ 신살 — 작용력이 가장 크면 무겁게
  for (const h of checkSinsal9(input.saju)) {
    if (!h.active) continue
    add(h.row.jobs, h.name, h.power >= 3 ? 3 : 2)
  }

  // ⑦ 용신 (30% — 가볍게)
  const y = calcCareerYongsin(input)
  if (y?.yongsin) {
    add(y.jobsByEl, `${y.yongsin} 용신`, 1)
    if (y.yukchinName) add(y.jobsByYukchin, `${y.yukchinName} 용신`, 1)
  }

  // ★학생 모드에서는 어른용 직업을 걸러 낸다 (유흥·카지노·대부업 등)
  const forStudent = input.target === 'student'

  // 🔴★2026-08-03 (44부 43차) — «성인» 리포트에서도 걸러 냅니다.
  //   [무엇이 있었나]  학생만 걸러, 직장인 리포트에 ★「유흥업」이 그대로 나갔습니다.
  //     (2026-08-03 대표님 PDF — 「어울리는 직업」에 유흥업이 찍혀 있었습니다)
  //   ⚠️ roleFit.ts 머리말에 그 까닭이 «이미» 적혀 있었습니다 —
  //      「직장인이 «당신에게 어울리는 직업: 유흥업» 을 읽으면 리포트 전체를 못 믿게 된다」
  //      ★그런데 roleFit 만 그 판단을 쓰고 여기서는 안 썼습니다. 두 곳이 어긋난 것입니다.
  //   ⚠️ 나쁜 직업이라는 뜻이 «아닙니다». 커리어 리포트의 결에 안 맞는 것입니다.
  //      ★교재 표는 «안 고쳤습니다». 목록도 roleFit 의 것을 «가져다» 씁니다 (교훈 E).
  //   ⚠️⚠️ ★«같은 이름일 때만» 막습니다.
  //      처음엔 includes 로 견주었더니 ★「의사」가 「장의사」에 걸려 사라졌습니다.
  //      한 글자라도 겹치면 막는 방식은 «멀쩡한 직업» 을 지웁니다. (교훈 — 낱말로 막지 말 것)
  //   ⚠️⚠️ ★목록도 «같은 잣대(jobKey)» 로 다듬어 견줍니다.
  //      「수도사업」은 jobKey 가 「사업」을 떼어 ★「수도」가 되므로,
  //      목록을 날것 그대로 견주면 ★안 걸립니다. (실제로 「수도」가 남아 나왔습니다)
  const blocked = (key: string) => BLOCKED_KEYS.has(key)

  const hits = [...bag.values()]
    .filter(x => x.score >= JOB_MIN)
    .filter(x => !forStudent || okForStudent(x.key))
    .filter(x => !blocked(x.key))
    .sort((a, b) => (b.score - a.score) || (b.sources.length - a.sources.length))

  return { hits, pool: bag.size }
}

// ── 카드 ────────────────────────────────────────────────────────
export function judgeJobs(input: CareerInput): CareerCard {
  const { hits, pool } = pickJobs(input)
  const shown = hits.slice(0, JOB_SHOW)

  const lines: string[] = []
  const reasons: string[] = []

  if (!shown.length) {
    lines.push('여러 자리에서 거듭 나오는 직업이 뚜렷하지 않아요. 강점 지능과 신살을 하나씩 따로 보시는 편이 낫겠습니다.')
    reasons.push(`교차 추림에서 문턱(${JOB_MIN}점)을 넘은 직업이 없습니다. 직업을 억지로 지어내지 마세요.`)
  } else {
    lines.push(`오행·육친·신살·용신을 겹쳐 보니 ${shown.length}가지가 거듭 나옵니다.`)
    for (const h of shown) {
      const from = h.sources.map(s => s.label).join(' · ')
      lines.push(`${h.label} — ${from}`)
    }
    lines.push('여러 자리에서 거듭 나온 순서입니다. 이 안에서 마음이 가는 것을 고르시면 됩니다.')
  }

  reasons.push(`교차 추림 — 후보 ${pool}가지 중 ${hits.length}가지가 문턱을 넘었습니다.`)
  reasons.push('★[내부순위] 는 우리가 순서를 고르려고 매긴 수치입니다. 교재에 없습니다. 글에 절대 쓰지 마세요.')
  for (const h of hits.slice(0, 15)) {
    reasons.push(`  ${h.label} [내부순위 ${h.score}] ← ${h.sources.map(s => `${s.label}`).join(' + ')}`)
  }
  reasons.push('무게 : 25칸 격자 3 · 육친 2 · 오행 2 · 격국 2 · 일주 2 · 신살 2~3 · 용신 1 (교재 133쪽 강점 70 : 용신 30)')
  reasons.push('교재 목록 59벌에 두루 나오는 흔한 직업(의사·요식업·상담사 등)은 무게를 덜었습니다.')
  reasons.push('이 대목("어울리는 직업")의 통변 재료입니다. 위에서 서너 개만 골라 왜 어울리는지 풀어 주세요. 목록을 그대로 읊지 마세요.')
  if (input.target === 'student') reasons.push('★학생입니다. 유흥·도박·대부업 같은 어른용 직업은 목록에서 이미 뺐습니다. 통변에서도 언급하지 마세요.')
  reasons.push('직업은 정해 주는 것이 아니라 권해 보는 것입니다. "이런 자리에서 힘이 납니다" 정도로 말하세요.')

  return {
    key: 'jobs', title: '어울리는 직업',
    badge: shown.length ? `${shown.length}가지` : '',
    lines, reasons,
    data: { hits: shown, pool } as unknown as Record<string, unknown>,
  }
}
