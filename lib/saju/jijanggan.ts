// lib/saju/jijanggan.ts
//
// 지장간(支藏干) 날수 배분 — 절입 뒤 며칠째가 여기(餘氣)·중기(中氣)·정기(正氣)인가
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-07-31 (41부 Step 2) — 대표님 확정 지침으로 만들었습니다.
//
//  [★가장 중요한 것 — 표를 «여기에 두지 않았습니다»]
//
//   저장소에 지장간 표가 «이미 둘» 있고, 둘은 «일부러» 다릅니다.
//
//     lib/saju/yongsinNew.ts        亥 = 戊甲壬   ← 사주보기·궁합·격국이 씁니다
//     app/…/birth-timing/lib/sajuTables.ts
//                                   亥 = 壬甲     ← 출산택일이 씁니다
//       「亥에는 戊(土)를 넣지 않는다. 亥는 토 일간의 뿌리가 될 수 없다」
//        ★연재쌤 확정 2026-07-23
//
//   ⚠️ 여기서 «세 번째 표» 를 만들면 그때부터 관리가 안 됩니다 (교훈 CJ).
//      → 이 파일은 «날수 배분» 만 합니다. 표는 부르는 쪽이 넘깁니다.
//
//  [★두 번째로 중요한 것 — 두 표는 «순서가 반대» 입니다]
//
//     yongsinNew   寅 = [戊, 丙, 甲]   여기 먼저 · 정기가 «마지막»
//     sajuTables   寅 = [甲, 丙, 戊]   정기 먼저 · 정기가 «처음»
//
//   ⚠️ 표만 받고 순서를 짐작하면 «여기와 정기가 통째로 뒤바뀝니다».
//      → order 를 «반드시» 함께 받습니다. 기본값을 두지 않았습니다.
//
//  [실측으로 확인한 것]  2026-07-31
//     · ★정기는 두 표가 «완전히 같습니다» (12/12). 다른 것은 여기·중기 개수뿐입니다.
//     · 빠진 것은 «전부 여기» 이고, 亥의 戊 하나만 중기입니다.
//     · 子卯午酉에서 빠진 여기는 «같은 오행» 이 표에 남아 있습니다
//       (壬→癸 · 甲→乙 · 丙→丁 · 庚→辛) — 합쳐도 오행 총량이 그대로입니다.
// ══════════════════════════════════════════════════════════════════

import { calcSolarTermMoment } from './solartermCalc'

/** 지장간 세 단계 */
export type JijangganStage = '여' | '중' | '정'

/**
 * 표의 «늘어놓은 순서». ★짐작하지 않습니다 — 부르는 쪽이 알려 주십시오.
 *   여기먼저  [여, 중, 정]   lib/saju/yongsinNew.ts
 *   정기먼저  [정, 중, 여]   app/…/birth-timing/lib/sajuTables.ts
 */
export type JijangganOrder = '여기먼저' | '정기먼저'

export interface JijangganSpec {
  table: Readonly<Record<string, readonly string[]>>
  order: JijangganOrder
}

// ── 날수 배분 ──────────────────────────────────────────────────────
//
//  ⚠️ 전통 배분(자오묘유 / 인신사해 / 진술축미)을 «기본값» 으로 둡니다.
//     ★교재 전사 정본이 확정되면 daySplit 인자로 갈아끼우면 됩니다 (대표님 확정).

export interface DaySplit { 여: number; 중: number; 정: number }

/**
 * 전통 지장간 일수 배분 (30일 기준).
 *
 * ⚠️⚠️ 「교재 대조 대기 중」 — 아직 교재 쪽수를 받지 못했습니다.
 *     지장간 날수는 유파마다 갈리는 자리입니다. 교재 정본이 오면
 *     이 표를 갈아끼우고 16·2x-verify 에 교차 대조를 박으십시오 (교훈 EJ·EO).
 */
export const TRADITIONAL_DAY_SPLIT: Readonly<Record<string, DaySplit>> = {
  // 생지(生支) 寅申巳亥 — 여 7 · 중 7 · 정 16
  寅: { 여: 7, 중: 7, 정: 16 },
  申: { 여: 7, 중: 7, 정: 16 },
  巳: { 여: 7, 중: 7, 정: 16 },
  亥: { 여: 7, 중: 7, 정: 16 },

  // 왕지(旺支) 子卯酉 — 여 10 · 정 20 (중기 없음)
  子: { 여: 10, 중: 0, 정: 20 },
  卯: { 여: 10, 중: 0, 정: 20 },
  酉: { 여: 10, 중: 0, 정: 20 },

  // ★午 만 홀로 중기를 둡니다 — 여 10 · 중 9 · 정 11
  //   전통 배분(丙10/己9/丁11) 적용 - 교재 대조 대기 중
  午: { 여: 10, 중: 9, 정: 11 },

  // 묘지(墓支) 辰戌丑未 — 여 9 · 중 3 · 정 18
  辰: { 여: 9, 중: 3, 정: 18 },
  戌: { 여: 9, 중: 3, 정: 18 },
  丑: { 여: 9, 중: 3, 정: 18 },
  未: { 여: 9, 중: 3, 정: 18 },
}

// ══════════════════════════════════════════════════════════════════
//  ★순서 «검증용» 기준표 — 판정에 쓰지 않습니다
// ══════════════════════════════════════════════════════════════════
//
//  [왜 필요한가]  2026-07-31 실측에서 드러났습니다.
//
//    lib/saju/yongsinNew.ts    12/12 «여기 → 중기 → 정기» 로 일정합니다  ✅
//    app/…/sajuTables.ts       ★순서가 «일정하지 않습니다»
//        丑辰巳未戌  [정, 여, 중]
//        寅申        [정, 중, 여]
//
//  ⚠️⚠️ 그러므로 sajuTables 의 표를 이 모듈에 넘기면
//     «여기와 중기가 뒤바뀝니다». 예) 辰 — 전통 여乙·중癸 인데 여癸·중乙 이 됩니다.
//
//  [그게 sajuTables 의 잘못인가]  아닙니다.
//    그 표는 «통근(뿌리) 판정» 에 씁니다 — 「이 지지 안에 그 오행이 있는가」만 봅니다.
//    집합으로 쓰는 표라 순서를 맞출 이유가 없었습니다.
//    ★날수 배분은 «순서가 뜻을 갖는» 쓰임이라, 그 표를 그대로 쓸 수 없습니다.
//
//  [그래서]  넘겨받은 표가 «여중정 순서인지» 여기서 재고, 아니면 problems 에 올립니다.
//    조용히 뒤바뀐 답을 내지 않습니다. (교훈 EQ — 바깥의 정답표와 대조)

/** 전통 지장간 «여 → 중 → 정» 순. ★검증에만 씁니다 */
const TRADITIONAL_ORDER: Readonly<Record<string, readonly (string | null)[]>> = {
  子: ['壬', null, '癸'], 丑: ['癸', '辛', '己'], 寅: ['戊', '丙', '甲'], 卯: ['甲', null, '乙'],
  辰: ['乙', '癸', '戊'], 巳: ['戊', '庚', '丙'], 午: ['丙', '己', '丁'], 未: ['丁', '乙', '己'],
  申: ['戊', '壬', '庚'], 酉: ['庚', null, '辛'], 戌: ['辛', '丁', '戊'], 亥: ['戊', '甲', '壬'],
}

/**
 * ★넘겨받은 표가 «여중정 순서» 인지 잽니다.
 *
 * 개수가 모자란 지지(여기를 뺀 표)는 «정기 쪽부터» 맞춰 봅니다.
 * @returns 어긋난 지지 목록. 비어 있으면 안심하고 쓰셔도 됩니다.
 */
export function checkJijangganOrder(spec: JijangganSpec): string[] {
  const bad: string[] = []
  for (const [z, want] of Object.entries(TRADITIONAL_ORDER)) {
    const raw = spec.table[z]
    if (!raw || raw.length === 0) continue
    const ordered = spec.order === '여기먼저' ? [...raw] : [...raw].reverse()
    const wantList = want.filter((x): x is string => x !== null)
    // 정기 쪽에서부터 견줍니다 (모자란 것은 언제나 앞쪽입니다)
    const n = Math.min(ordered.length, wantList.length)
    for (let i = 1; i <= n; i++) {
      if (ordered[ordered.length - i] !== wantList[wantList.length - i]) { bad.push(z); break }
    }
  }
  return bad
}

/** 천간 → 오행. 빠진 단계를 «같은 오행» 쪽에 합칠 때 씁니다 */
const STEM_EL: Readonly<Record<string, string>> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

/** 한글 지지도 받습니다 */
const KO_TO_HANJA: Readonly<Record<string, string>> = {
  자: '子', 축: '丑', 인: '寅', 묘: '卯', 진: '辰', 사: '巳',
  오: '午', 미: '未', 신: '申', 유: '酉', 술: '戌', 해: '亥',
}

export function normalizeBranch(z: string): string | null {
  const s = (z ?? '').trim()
  if (!s) return null
  if (TRADITIONAL_DAY_SPLIT[s]) return s
  return KO_TO_HANJA[s] ?? null
}

// ── 결과 ───────────────────────────────────────────────────────────

export interface JijangganSlice {
  gan: string
  stage: JijangganStage
  /** 이 단계가 차지하는 날수 (totalDays 로 환산된 값) */
  days: number
  /** 절입 뒤 며칠째부터 (0 기준, 포함) */
  from: number
  /** 며칠째까지 (제외) */
  to: number
  /** 총 날수 대비 비율 0~1 */
  ratio: number
}

export interface JijangganResult {
  branch: string
  /** ★지금 이 시점의 지장간 */
  currentGan: string
  /** ★지금 이 시점의 단계 */
  stage: JijangganStage
  slices: JijangganSlice[]
  /** 천간별 비율 — 같은 천간이 겹치면 합칩니다 */
  ratio: Record<string, number>
  /** 오행별 비율 — 표가 달라도 «오행 총량» 을 견주기 좋습니다 */
  elementRatio: Record<string, number>
  /**
   * ★표에 «없는» 단계의 날수를 어디로 보냈는가.
   *   예) '子 여기(壬) 10일 → 癸(같은 오행)' · '亥 여기(戊) 7일 → 壬(정기)'
   *   ⚠️ 비어 있으면 표가 세 단계를 다 갖고 있다는 뜻입니다.
   */
  merged: string[]
  /** ★조용히 넘기지 않습니다 */
  problems: string[]
}

export interface SplitOptions {
  /** 그 절기월의 총 날수. 기본 30 */
  totalDays?: number
  /** 날수 배분표를 갈아끼울 때. 기본 TRADITIONAL_DAY_SPLIT */
  daySplit?: Readonly<Record<string, DaySplit>>
}

/**
 * 절입 뒤 경과 일수로 지장간 구간을 가릅니다.
 *
 * @param branch        월지 (한자 '寅' · 한글 '인' 둘 다 받습니다)
 * @param daysAfterJol  절입 시각으로부터 경과한 일수. 소수 가능 (예: 10.5)
 * @param spec          ★지장간 표 + 늘어놓은 순서. «반드시» 넘기십시오
 *
 * @example
 *   import { JIJANGAN } from '@/lib/saju/yongsinNew'
 *   splitJijanggan('寅', 10.5, { table: JIJANGAN, order: '여기먼저' })
 */
export function splitJijanggan(
  branch: string,
  daysAfterJol: number,
  spec: JijangganSpec,
  opts: SplitOptions = {},
): JijangganResult | null {
  const problems: string[] = []
  const z = normalizeBranch(branch)
  if (!z) return null

  const splitTable = opts.daySplit ?? TRADITIONAL_DAY_SPLIT
  const base = splitTable[z]
  if (!base) return null

  const raw = spec.table[z]
  if (!raw || raw.length === 0) {
    return null
  }

  // ★이 지지의 순서가 전통과 맞는가 — 어긋나면 «조용히 넘기지 않습니다»
  const want = TRADITIONAL_ORDER[z]
  if (want) {
    const chk = spec.order === '여기먼저' ? [...raw] : [...raw].reverse()
    const wl = want.filter((x): x is string => x !== null)
    const n = Math.min(chk.length, wl.length)
    for (let i = 1; i <= n; i++) {
      if (chk[chk.length - i] !== wl[wl.length - i]) {
        problems.push(
          `${z} 의 지장간 순서가 전통(${wl.join('·')})과 어긋납니다 — 넘기신 표: ${chk.join('·')}. `
          + `★여기와 중기가 뒤바뀔 수 있습니다. 표와 order 를 확인하십시오`)
        break
      }
    }
  }

  // ── ① 표를 «여기·중기·정기» 자리에 맞춰 놓습니다 ────────────────
  //   ★정기 «쪽에서부터» 맞춥니다.
  //     실측 — 두 표의 정기는 완전히 같고(12/12), 모자란 것은 언제나 앞(여기) 쪽입니다.
  //
  //   ⚠️ 날수가 0인 단계는 «건너뜁니다».
  //      子卯酉는 중기가 없습니다(여10·정20). 건너뛰지 않으면
  //      yongsinNew 의 子=[壬,癸] 에서 壬이 «중기» 자리에 들어가 0일로 사라집니다.
  const ordered = spec.order === '여기먼저' ? [...raw] : [...raw].reverse()
  const slotOf: Record<JijangganStage, string | null> = { 여: null, 중: null, 정: null }
  const backward = (['정', '중', '여'] as JijangganStage[]).filter((st) => base[st] > 0)
  for (let i = 0; i < backward.length; i++) {
    const g = ordered[ordered.length - 1 - i]
    if (g) slotOf[backward[i]] = g
  }
  if (ordered.length > backward.length) {
    problems.push(
      `${z} 의 지장간이 ${ordered.length}개인데 날수 구간은 ${backward.length}개입니다 `
      + `— 정기 쪽 ${backward.length}개만 씁니다`)
  }

  // ── ② 표에 없는 단계의 날수를 «정기로» 옮깁니다 ────────────────
  //   [왜 정기인가]  표에 없는 간은 «무엇인지 알 수 없습니다». 오행을 견줄 수 없습니다.
  //     그래서 정기로 보냅니다. 실측으로 두 경우 다 옳은 것을 확인했습니다 —
  //       子卯午酉  빠진 여기가 정기와 «같은 오행» 입니다 (壬→癸 · 甲→乙 · 丙→丁 · 庚→辛)
  //                 → 합쳐도 오행 총량이 그대로입니다.
  //       亥        빠진 여기가 戊(토)입니다 → 토가 사라집니다.
  //                 ★그것이 연재쌤 확정입니다 — 「亥에는 戊를 넣지 않는다」.
  const days: Record<JijangganStage, number> = { 여: base.여, 중: base.중, 정: base.정 }
  const merged: string[] = []
  for (const st of ['여', '중'] as JijangganStage[]) {
    if (slotOf[st] !== null || days[st] === 0) continue
    const moveDays = days[st]
    days[st] = 0
    days['정'] += moveDays
    merged.push(`${z} ${st}기 ${moveDays}일 → ${slotOf['정'] ?? '?'}(정기)`)
  }

  // ── ③ 총 날수에 맞춰 늘이거나 줄입니다 ──────────────────────────
  const total = opts.totalDays && opts.totalDays > 0 ? opts.totalDays : 30
  const sum = days.여 + days.중 + days.정
  if (sum <= 0) return null
  const k = total / sum

  const slices: JijangganSlice[] = []
  let cursor = 0
  for (const st of ['여', '중', '정'] as JijangganStage[]) {
    const g = slotOf[st]
    const d = days[st] * k
    if (!g || d <= 0) continue
    slices.push({ gan: g, stage: st, days: d, from: cursor, to: cursor + d, ratio: d / total })
    cursor += d
  }
  if (slices.length === 0) return null

  // ── ④ 지금이 어느 구간인가 ──────────────────────────────────────
  let t = Number.isFinite(daysAfterJol) ? daysAfterJol : 0
  if (t < 0) {
    problems.push(`절입 뒤 경과 일수가 음수입니다(${daysAfterJol}) — 첫 구간으로 봅니다`)
    t = 0
  }
  if (t > total) {
    problems.push(`절입 뒤 ${daysAfterJol}일은 이 달(${total}일)을 넘습니다 — 마지막 구간으로 봅니다`)
  }
  const hit = slices.find((s) => t >= s.from && t < s.to) ?? slices[slices.length - 1]

  // ── ⑤ 비율 ──────────────────────────────────────────────────────
  const ratio: Record<string, number> = {}
  const elementRatio: Record<string, number> = {}
  for (const s of slices) {
    ratio[s.gan] = (ratio[s.gan] ?? 0) + s.ratio
    const el = STEM_EL[s.gan]
    if (el) elementRatio[el] = (elementRatio[el] ?? 0) + s.ratio
    else problems.push(`'${s.gan}' 은 천간이 아닙니다`)
  }

  return {
    branch: z,
    currentGan: hit.gan,
    stage: hit.stage,
    slices, ratio, elementRatio, merged, problems,
  }
}

/**
 * 절입 시각과 태어난 시각으로 «경과 일수» 를 구합니다.
 * ⚠️ 두 시각은 «같은 기준시(KST)» 여야 합니다.
 */
export function daysAfterJolip(birth: Date, jolip: Date): number {
  return (birth.getTime() - jolip.getTime()) / 86400000
}

// ── 사령(司令) ────────────────────────────────────────────────────────
//
//  ★2026-08-05 (46부 12차) — 대표님 지시로 더했습니다.
//    「지장간 사령 + 절입 경과일을 전문가용 화면 토글에서만 보이게」
//
//  위의 splitJijanggan 은 «경과일» 을 받아 구간을 가릅니다.
//  그 경과일을 «생년월일·시진에서» 구해 주는 것이 아래 함수입니다.
//
//  ⚠️⚠️ 날수 배분표(TRADITIONAL_DAY_SPLIT)는 ★«교재 정본이 아닙니다».
//     위 주석대로 「전통 배분을 기본값으로 두고, 교재 전사 정본이 확정되면
//     daySplit 인자로 갈아끼운다」가 대표님 확정입니다.
//     ⇒ 그래서 ★화면에 「전통 배분 기준」이라고 «밝혀» 냅니다. 지우지 마십시오.
//     ⇒ 특히 午 (여10·중9·정11) 는 「★교재 대조 대기 중」이라 적혀 있습니다.

/** 월지 → 그 달을 여는 절기의 «양력 월» 과 이름 */
const MONTH_TERM: Readonly<Record<string, { idx: number; name: string }>> = {
  丑: { idx: 1, name: '소한' }, 寅: { idx: 2, name: '입춘' }, 卯: { idx: 3, name: '경칩' },
  辰: { idx: 4, name: '청명' }, 巳: { idx: 5, name: '입하' }, 午: { idx: 6, name: '망종' },
  未: { idx: 7, name: '소서' }, 申: { idx: 8, name: '입추' }, 酉: { idx: 9, name: '백로' },
  戌: { idx: 10, name: '한로' }, 亥: { idx: 11, name: '입동' }, 子: { idx: 12, name: '대설' },
}

export interface SaryeongResult {
  /** 절기 이름 — '망종' 등 */
  termName: string
  /** 절입 시각 */
  jolip: Date
  /** 절입 뒤 경과 일수 (소수) */
  days: number
  /** 구간 가르기 결과 — 사령 글자는 result.currentGan */
  result: JijangganResult
}

/**
 * 태어난 날·시진으로 «절입 경과일» 과 «사령» 을 구합니다.
 *
 * @param solarYear/Month/Day  ★양력 생년월일
 * @param hourIdx  태어난 시진 0~11 (子=0 … 亥=11). 모르면 null — 그 시의 한가운데를 씁니다
 * @param monthBranch  월지
 * @param spec  ★지장간 표 + 차례. 만세력은 { table: JIJANGAN, order: '여기먼저' }
 *
 * ⚠️ 태어난 «분» 은 저희가 모릅니다. 시진까지만 압니다.
 *    ⇒ ★그 시의 «한가운데» 를 씁니다. lib/saju/dayun.ts:226 과 «같은 셈법» 입니다.
 *      (子 00:30 · 丑 02:30 · … · 未 14:30 · 申 16:30)
 *    ⇒ 경과일이 ±0.5일 흔들립니다. 절입 «직후·직전» 태생은 사령이 갈릴 수 있습니다.
 *
 * ⚠️⚠️ ★子월(대설)은 절입이 «전해 12월» 입니다.
 *    1월 초에 태어난 子월생을 그 해 12월 대설로 재면 ★통째로 틀립니다.
 *    아래에서 「태어난 때가 절입보다 앞서면 한 해 뒤로」로 막아 두었습니다.
 */
export function calcSaryeong(
  solarYear: number, solarMonth: number, solarDay: number,
  hourIdx: number | null,
  monthBranch: string,
  spec: JijangganSpec,
  opts: SplitOptions = {},
): SaryeongResult | null {
  const z = normalizeBranch(monthBranch)
  if (!z) return null
  const term = MONTH_TERM[z]
  if (!term) return null
  if (!Number.isFinite(solarYear) || !Number.isFinite(solarMonth) || !Number.isFinite(solarDay)) return null

  // ★그 시의 한가운데 (자정부터 몇 분) — dayun.ts:226 과 같은 셈법
  const bMin = hourIdx == null ? 12 * 60
    : (((hourIdx * 120 + 1410) % 1440) + 60) % 1440
  const birth = new Date(solarYear, solarMonth - 1, solarDay, Math.floor(bMin / 60), bMin % 60)

  const toDate = (y: number) => {
    const t = calcSolarTermMoment(y, term.idx)
    if (!t) return null
    const h = Math.floor(t.hour)
    return new Date(y, t.month - 1, t.day, h, Math.round((t.hour - h) * 60))
  }

  let jolip = toDate(solarYear)
  // ★태어난 때가 그 해 절입보다 «앞서면» 한 해 앞의 절입입니다 (子월 1월생)
  if (jolip && birth.getTime() < jolip.getTime()) jolip = toDate(solarYear - 1)
  if (!jolip) return null

  const days = daysAfterJolip(birth, jolip)
  if (days < 0) return null
  const result = splitJijanggan(z, days, spec, opts)
  if (!result) return null

  return { termName: term.name, jolip, days, result }
}
