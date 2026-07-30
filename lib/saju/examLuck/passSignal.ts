// lib/saju/examLuck/passSignal.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  합격 신호 — 원국(原局) 기준 유리·주의 자리                          │
// │  2026-07-30                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★대표님 지시서 2-B «명리학적 합격 판정 로직 (Positive & Warning Signals)»
//
// ── ⚠️ 왜 새로 만드는가 — 이미 있는 것과 무엇이 다른가 ────────────────
//   examScore.ts 가 관인상생·상관정관·재극인·관성관대·형충을 **이미** 판정합니다.
//   그런데 그것은 전부 «그해(세운)» 판정입니다.
//
//       examScore   그해 간지가 원국을 건드리는가   → 「2027년은 관인상생이 됩니다」
//       여기        원국 자체가 어떤 그릇인가        → 「이 분은 원국에 인성이 없습니다」
//
//   지시서가 요구하는 것은 뒤엣것입니다. «타고난 공부 DNA» 는 해마다 바뀌는 것이
//   아니고, «무인성 사주는 인성운이 올 때 도약» 같은 말은 원국을 알아야 나옵니다.
//
//   ⚠️⚠️ **판정기를 둘로 두지 않았습니다** (교훈 CJ).
//     겹치는 자리는 계산을 다시 하지 않고 있는 것을 그대로 부릅니다.
//         금수쌍청  → byeongjon.findCombo      (교재 74~75쪽)
//         12운성    → unsung.getUnsung          (공용)
//         십성      → examLuck/sipsin.sipsinOfChar  (지지도 받는 유일한 창구)
//         오행 등급  → simsanOhaeng.grade        (25점 발달 · 50점 과다)
//     여기서 «새로» 계산하는 것은 원국 안에서의 짝 맞춤뿐입니다.
//
// ── ⚠️ 목화통명(木火通明)은 교재에 없습니다 ──────────────────────────
//   저장소 전체를 훑어도 없었습니다. 금수쌍청은 교재 74~75쪽에 있는데
//   그 짝인 목화통명은 없습니다. 지시서가 둘을 나란히 요구하므로
//   **명리 통설로 채웠습니다.** 아래 judgeMokhwaTongmyeong 주석에 잣대를 적어 두었습니다.
//   ★교재 자료가 아니므로 SOURCE_INDEX 에 넣지 않았습니다.
//
// ── ⚠️ 겁주지 않습니다 ──────────────────────────────────────────────
//   warnings 는 «떨어진다» 가 아니라 «이런 실수가 나기 쉽다» 로만 적습니다.
//   AI 가 그대로 옮겨 써도 손님이 다치지 않을 문장이어야 합니다.

import type { Pillar, Sipsin, ExamTarget } from './types'
import { sipsinOfChar } from './sipsin'
import { getUnsung } from '../unsung'
import { findCombo } from '../byeongjon'
import { grade, type OhaengScore } from '../simsanOhaeng'
import { isJijiChung, isCheonganHap } from './hapchung'

// ── 십성 묶음 ──────────────────────────────────────────────────────
const GWAN: Sipsin[] = ['정관', '편관']
const IN: Sipsin[] = ['정인', '편인']
const SIKSANG: Sipsin[] = ['식신', '상관']
const JAE: Sipsin[] = ['정재', '편재']
const BIGYEOP: Sipsin[] = ['비견', '겁재']

/**
 * 기둥의 자리 번호 — «이웃한 자리» 를 재는 데 쓴다.
 * ⚠️ 시(時)를 모르는 손님은 시주가 없습니다. 그때는 시주가 map 에 안 들어오므로
 *    자연히 이웃 판정에서 빠집니다. 따로 막을 필요가 없습니다.
 */
const PILLAR_IDX: Record<string, number> = { 년주: 0, 월주: 1, 일주: 2, 시주: 3 }

/** 천간의 오행 — 목화통명·금수상함을 보는 데 쓴다 */
const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

export interface PassSignal {
  /** 이 서비스에서 «주 기운» 은 무엇인가 — 학생은 인성, 성인은 관성 (지시서 2-B-1) */
  mainName: '배움의 기운(인성)' | '자리의 기운(관성)'
  /** 원국에 그 기운이 몇 자리인가 */
  mainCount: number
  /** 아예 없는가 — 무인성/무관성 */
  mainMissing: boolean
  /** 유리한 자리 */
  positives: string[]
  /** 주의할 자리 */
  warnings: string[]
  /** 학업 몰입도 등급 (지시서 2-A-3) */
  focus: { grade: 'A' | 'B' | 'C'; say: string }
  /** 원국에 있는 십성 (중복 없이) */
  sipsinHave: string[]
}

/**
 * 목화통명(木火通明) — ★교재에 없음. 명리 통설로 우리가 정한 잣대.
 *
 *   잣대 : 일간이 목(甲·乙) 이고, 천간에 화(丙·丁)가 함께 있고,
 *          목이 발달(25점) 이상이어서 «땔감이 있는» 상태.
 *   뜻   : 나무가 불을 만나 환히 밝아진다 — 총명하고 표현이 트인다.
 *
 * ⚠️ 「일간이 화(丙·丁)이고 목이 있는」 쪽도 통명으로 보는 유파가 있습니다.
 *    한쪽으로 정하지 않으면 판정이 흔들리므로 **일간 목** 으로 고정했습니다.
 *    바꾸실 때는 이 주석과 아래 조건을 함께 고치십시오.
 */
function judgeMokhwaTongmyeong(saju: Pillar[], ohaeng: OhaengScore): boolean {
  const dayStem = saju.find(p => p.pillar === '일주')?.stem ?? ''
  if (STEM_EL[dayStem] !== '목') return false
  const stems = saju.map(p => p.stem).filter(s => s && s !== '?')
  const hasFire = stems.some(s => STEM_EL[s] === '화')
  if (!hasFire) return false
  return (ohaeng['목'] ?? 0) >= 25
}

/** 자형(自刑) 넷 — 같은 글자가 겹칠 때만 */
const JAHYEONG = ['辰', '午', '酉', '亥']
/** 상형(相刑) — 子卯 */
const SANGHYEONG: Record<string, string> = { 子: '卯', 卯: '子' }
/** 삼형(三刑) 두 벌 — ★셋이 다 모여야 봅니다. 둘만 있는 반형은 안 봅니다 */
const SAMHYEONG_SETS = [['寅', '巳', '申'], ['丑', '戌', '未']]

/**
 * 좁게 본 형(刑) — 자형 · 상형 · 완전삼형만.
 * ⚠️ 반형(삼형 짝 가운데 둘)은 **일부러 뺐습니다.** 위 ② 주석에 까닭이 있습니다.
 */
function isNarrowHyeong(a: string, b: string, allBranches: string[]): boolean {
  if (!a || !b || a === '?' || b === '?') return false
  if (SANGHYEONG[a] === b) return true
  if (a === b && JAHYEONG.includes(a)) {
    // ★같은 글자가 «두 자리 이상» 있어야 자형입니다. 자기 자신과는 안 겹칩니다.
    return allBranches.filter(x => x === a).length >= 2
  }
  // 완전삼형 — 셋이 다 모였고 a 가 그 안에 있을 때
  return SAMHYEONG_SETS.some(set =>
    set.includes(a) && set.includes(b) && a !== b && set.every(x => allBranches.includes(x)))
}

/**
 * 원국 합격 신호를 낸다.
 *
 * @param saju    원국 네 기둥
 * @param target  학생인가 성인인가 — 주 기운이 갈립니다 (지시서 2-B-1)
 * @param ohaeng  simsanOhaeng.calcSimsanOhaeng 이 낸 점수
 */
export function judgePassSignal(
  saju: Pillar[],
  target: ExamTarget,
  ohaeng: OhaengScore,
): PassSignal {
  const day = saju.find(p => p.pillar === '일주')
  const dayStem = day?.stem ?? ''
  const isStudent = target === 'student'
  const mainName = isStudent ? '배움의 기운(인성)' as const : '자리의 기운(관성)' as const

  const positives: string[] = []
  const warnings: string[] = []

  // 시(時)를 모르면 시주가 '?' 로 들어옵니다. 걸러 냅니다.
  const branches = saju.map(p => p.branch).filter(b => b && b !== '?')

  // ── 원국 십성 지도 ────────────────────────────────────────────
  /** 글자 → 십성 · 어느 기둥인가 */
  const map: Array<{ ch: string; sipsin: string; pillar: string; isBranch: boolean }> = []
  if (dayStem && dayStem !== '?') {
    for (const p of saju) {
      for (const [ch, isBranch] of [[p.stem, false], [p.branch, true]] as Array<[string, boolean]>) {
        if (!ch || ch === '?') continue
        // ★일간 자신은 십성이 없습니다. 넣으면 비견으로 잡혀 «비겁 과다» 가 됩니다.
        if (p.pillar === '일주' && !isBranch) continue
        const s = sipsinOfChar(dayStem, ch)
        if (s) map.push({ ch, sipsin: s, pillar: p.pillar, isBranch })
      }
    }
  }
  const countOf = (list: Sipsin[]) => map.filter(m => list.includes(m.sipsin as Sipsin)).length
  const sipsinHave = [...new Set(map.map(m => m.sipsin))]

  const gwanN = countOf(GWAN)
  const inN = countOf(IN)
  const sikN = countOf(SIKSANG)
  const jaeN = countOf(JAE)
  const bigN = countOf(BIGYEOP)
  const mainCount = isStudent ? inN : gwanN
  const mainMissing = mainCount === 0

  // ══════════════════════════════════════════════════════════════
  //  Positive Signals (지시서 2-B-2)
  // ══════════════════════════════════════════════════════════════

  // ① 주 기운이 원국에 서 있는가 (지시서 2-B-1)
  if (mainCount > 0) {
    positives.push(isStudent
      ? `원국에 인성이 ${inN}자리 있습니다 — 받아들이고 쌓아 두는 힘을 타고났습니다. 학생에게 가장 먼저 보는 자리입니다.`
      : `원국에 관성이 ${gwanN}자리 있습니다 — 자리를 맡고 틀을 지키는 힘을 타고났습니다. 취업·시험에서 가장 먼저 보는 자리입니다.`)
  }

  // ② 관인상생(官印相生) — ★«이웃한 자리» 에서 만날 때만
  //
  //   ⚠️ examScore 의 '관인상생' 은 «그해» 판정입니다. 여기는 원국입니다. 겹치지 않습니다.
  //
  //   ⚠️⚠️ 처음에 «관성과 인성이 둘 다 있으면» 으로 두었다가 무작위 3,000명에서
  //        **61.9%** 가 걸렸습니다. 열 명 중 여섯에게 «합격 가능성 최고조» 라고
  //        말하는 것은 아무 말도 안 하는 것과 같습니다.
  //        → 35-1장에서 대표님이 천간합을 «이웃한 자리만» 으로 조여 47% → 27.6% 로
  //          내리신 것과 **똑같은 잣대** 를 씁니다.
  //   [왜 이웃해야 하는가] 상생(相生)은 기운이 «건너가는» 것입니다.
  //     년주와 시주처럼 멀리 떨어져 있으면 건너갈 길이 없다고 봅니다.
  //
  //   ⚠️⚠️⚠️ 두 번 조였습니다 (2026-07-30 대표님 지시).
  //        1차 «둘 다 있으면»            → 61.9%
  //        2차 «이웃한 기둥»              → 47.2%   ← 여전히 높다고 하셨습니다
  //        3차 «이웃 + 월지·일지에 하나»   → 아래 실측값
  //        4차 «인성이 월지·일지 + 관성이 이웃»  → 아래 실측값  ← 확정
  //
  //   [4차 조건을 왜 «인성» 쪽에 걸었나 — 3차에서 한 번 헛짚었습니다]
  //     3차에서는 «짝 가운데 한쪽이라도 월지·일지» 로 두었습니다. 37.4% 로 조금만 내렸습니다.
  //     원국 여덟 글자 가운데 일곱이 십성이니, 짝이 여러 벌 생겨 아무 짝이든 하나는
  //     걸리기 때문이었습니다.
  //
  //     관인상생은 «관 → 인 → 일간» 으로 기운이 건너오는 것입니다.
  //     여기서 **인성이 다리(橋)** 입니다. 다리가 멀면 관성이 아무리 세도 나에게 안 옵니다.
  //     그래서 조건을 다리 쪽에 걸었습니다 —
  //         ① 인성이 «월지 또는 일지» 에 앉아 있어야 한다   (다리가 내 몸에 닿아 있음)
  //         ② 그 인성과 «이웃한 기둥» 에 관성이 있어야 한다  (건너올 거리)
  //     ★월지는 태어난 철, 일지는 제 몸입니다. 이 저장소가 격국을 정할 때도 월지를
  //       봅니다(career/gyeokguk.ts). 년주는 조상 자리, 시주는 자식 자리라
  //       «내가 쓰는 힘» 에서 한 걸음 멉니다.
  //
  //   ⚠️ 조건이 하나라도 빠지면 아래 else 로 떨어져 «사실만» 적습니다. 버리지 않습니다.
  //      그 사람들에게 관성·인성 이야기를 통째로 빼면 AI 가 아예 언급을 안 합니다.
  const gwanEntries = map.filter(m => GWAN.includes(m.sipsin as Sipsin))
  const inEntries = map.filter(m => IN.includes(m.sipsin as Sipsin))
  /** 월지·일지에 앉아 있는가 — 지지이면서 월주나 일주인 자리 */
  const isCoreSeat = (m: { pillar: string; isBranch: boolean }) =>
    m.isBranch && (m.pillar === '월주' || m.pillar === '일주')
  /** ★다리(인성)가 월지·일지에 앉고, 그 이웃에 관성이 있는가 */
  const gwaninAdjacent = inEntries.filter(isCoreSeat).some(bridge => {
    const bi = PILLAR_IDX[bridge.pillar] ?? -1
    if (bi < 0) return false
    return gwanEntries.some(g => {
      const gi = PILLAR_IDX[g.pillar] ?? -1
      return gi >= 0 && Math.abs(gi - bi) <= 1
    })
  })
  if (gwaninAdjacent) {
    positives.push('관인상생(官印相生)이 원국에서 성립합니다 — 자리의 기운과 배움의 기운이 '
      + '이웃해 서로를 살립니다. 시험·합격 쪽으로는 가장 좋은 짝으로 봅니다.')
  } else if (gwanN > 0 && inN > 0) {
    // ⚠️ 둘 다 있지만 조건을 못 갖춘 경우 — «최고조» 라고 하지 않고 사실만 적습니다.
    //    ★이 줄을 없애지 마십시오. 이 사람들에게 «아무 말도 안 하는» 것이 되어,
    //      AI 가 관성·인성 이야기를 아예 빼먹습니다.
    positives.push('관성과 인성이 원국에 다 있습니다. 다만 서로 붙어 있지 않거나 '
      + '월지·일지에서 비껴 있어, 평소에는 따로 쓰이고 운에서 이어 줄 때 함께 힘을 냅니다.')
  }

  // ③ 관성이 12운성으로 관대(冠帶)에 드는가 — 교재 195쪽
  //   ⚠️ examScore 는 «그해 지지» 를 봅니다. 여기는 «원국 지지» 를 봅니다.
  if (dayStem && dayStem !== '?') {
    const gwanGwandae = map.filter(m => m.isBranch && GWAN.includes(m.sipsin as Sipsin))
      .filter(m => getUnsung(dayStem, m.ch) === '관대')
    if (gwanGwandae.length) {
      positives.push(`관성이 12운성으로 관대(冠帶)에 듭니다(${gwanGwandae.map(m => m.pillar).join('·')}) — `
        + '교재는 이를 「합격의 옷을 갖춰 입는 자리」로 봅니다. (교재 195쪽)')
    }
  }

  // ④ 특수 격국 — 금수쌍청은 이미 있는 판정을 그대로 부릅니다 (교훈 CJ)
  for (const hit of findCombo(saju)) {
    if (!hit.key.startsWith('금수쌍청')) continue
    positives.push(`${isStudent ? (hit.row.sayStudent ?? hit.row.say) : hit.row.say} `
      + '(고난도 문제를 오래 붙들고 푸는 쪽에서 힘이 납니다)')
  }
  // 목화통명 — ★교재 밖. 위 함수 주석에 잣대를 적었습니다.
  if (judgeMokhwaTongmyeong(saju, ohaeng)) {
    positives.push('목화통명(木火通明)의 결이 섭니다 — 나무가 불을 만나 환해지는 모양입니다. '
      + '머리 회전이 빠르고 배운 것을 밖으로 꺼내 보이는 데 강합니다.')
  }

  // ⑤ 합(合)의 작용 — 일간이 관성과 천간합을 이루는가
  //   ⚠️ 준삼합·반합은 안 봅니다 (35-1장 대표님 확정 ③).
  if (dayStem && dayStem !== '?') {
    const gwanHap = map.filter(m => !m.isBranch && GWAN.includes(m.sipsin as Sipsin))
      .filter(m => isCheonganHap(dayStem, m.ch))
    if (gwanHap.length) {
      positives.push('일간이 관성과 천간합(合)으로 묶입니다 — 자리가 저를 붙잡아 주는 모양이라 '
        + '기회가 왔을 때 놓치지 않는 결입니다.')
    }
  }

  // ══════════════════════════════════════════════════════════════
  //  Warning Signals (지시서 2-B-3)
  // ══════════════════════════════════════════════════════════════

  // ① 상관견관(傷官見官) — 교재가 가장 불리하다고 꼽은 자리
  if (map.some(m => m.sipsin === '상관') && map.some(m => m.sipsin === '정관')) {
    warnings.push('원국에 상관과 정관이 함께 있습니다(상관견관) — 틀을 못 견디는 마음이 있어 '
      + '아는 문제를 제 방식으로 풀다 마킹·조건 확인에서 실수가 나기 쉽습니다. 겁줄 자리가 아니라 '
      + '«습관으로 막을 수 있는» 자리입니다. (교재 195쪽)')
  }

  // ② 관성·인성이 원국에서 충(沖)이나 형(刑)을 맞는가
  //
  //   ⚠️⚠️ 처음에 hapchung.isJijiHyeong 을 그대로 썼다가 무작위 3,000명에서
  //        **66.4%** 가 걸렸습니다. 그 함수는 «삼형 짝 가운데 둘» 인 반형(半刑)까지
  //        형으로 봅니다(hapchung.ts 174줄 주석). 반형은 넓게 잡히는 자리라
  //        «마음이 크게 흔들린다» 는 경고에 쓰기에는 너무 헐렁했습니다.
  //   → 여기서는 **충 · 자형 · 상형 · 완전삼형** 만 봅니다.
  //      ★hapchung 을 고치지 않았습니다. 그 함수는 examScore 가 «그해» 판정에
  //        쓰고 있고, 거기서는 반형까지 보는 것이 맞습니다(운은 스치기만 해도 움직입니다).
  //        원국은 타고난 그릇이라 잣대가 더 좁아야 합니다.
  const shaken = new Set<string>()
  const watchChars = map.filter(m => m.isBranch
    && (GWAN.includes(m.sipsin as Sipsin) || IN.includes(m.sipsin as Sipsin)))
  for (const w of watchChars) {
    for (const b of branches) {
      if (isJijiChung(w.ch, b)) { shaken.add(`${w.sipsin}(${w.ch})`); continue }
      if (isNarrowHyeong(w.ch, b, branches)) shaken.add(`${w.sipsin}(${w.ch})`)
    }
  }
  if (shaken.size) {
    warnings.push(`${[...shaken].join('·')} 자리가 원국 안에서 충·형을 맞습니다 — `
      + '마음이 한 번씩 크게 흔들리는 결입니다. 시험 기간에 «흔들릴 때 할 일» 을 미리 정해 두면 훨씬 낫습니다.')
  }

  // ③ 재극인(財剋印) — 재성이 인성을 치는 자리. 학생에게 특히 크게 봅니다.
  if (jaeN > 0 && inN > 0 && jaeN >= inN) {
    warnings.push(`재성 ${jaeN}자리가 인성 ${inN}자리를 누릅니다(재극인) — 마음이 밖으로 잘 끌리고 `
      + '조급해져서 «다 안다» 고 넘긴 데서 감점이 납니다. 환경을 먼저 정리하는 것이 공부법보다 앞섭니다.')
  }

  // ④ 비겁 과다 — 겁재운의 조급함 (교재 130쪽 하락운)
  if (bigN >= 3) {
    warnings.push(`비겁이 ${bigN}자리로 많습니다 — 남과 견주며 속도를 올리려다 제 페이스를 잃기 쉽습니다. `
      + '«남이 어디까지 했나» 를 덜 보는 것이 이 분에게는 공부법입니다.')
  }

  // ⑤ 주 기운이 아예 없을 때 — ★지시서 2-A-3 「무인성 사주는 인성운 도래 시 최적의 도약기」
  if (mainMissing) {
    warnings.push(isStudent
      ? '원국에 인성이 한 자리도 없습니다(무인성) — 남이 짜 준 순서대로 쌓는 공부가 잘 안 붙습니다. '
        + '★대신 인성운이 드는 해에 성적이 가장 크게 뜁니다. 「원래 안 되는 사람」이 아니라 «때가 있는 사람» 입니다.'
      : '원국에 관성이 한 자리도 없습니다(무관성) — 짜인 틀에 저를 맞추는 일이 답답합니다. '
        + '★대신 관성운이 드는 해에 자리가 크게 열립니다. 그때를 노리는 것이 이 분의 전략입니다.')
  }

  // ══════════════════════════════════════════════════════════════
  //  학업 몰입도 (지시서 2-A-3)
  //    교재 130쪽 — 「학업 상승운은 인성운과 식상운, 보통운은 관성운,
  //                 하락운은 비겁운과 재성운」
  //    ★그 잣대를 «운» 이 아니라 «원국» 에 대어 봅니다. 타고난 몰입 결입니다.
  // ══════════════════════════════════════════════════════════════
  const studyPos = inN + sikN
  const studyNeg = bigN + jaeN
  let focus: PassSignal['focus']
  if (studyPos >= studyNeg + 2) {
    focus = { grade: 'A', say: `인성·식상이 ${studyPos}자리로 앞섭니다 — 앉아서 파고드는 몰입이 잘 되는 결입니다. `
      + '길게 앉히는 계획이 이 분에게 먹힙니다.' }
  } else if (studyNeg >= studyPos + 2) {
    focus = { grade: 'C', say: `비겁·재성이 ${studyNeg}자리로 앞섭니다 — 마음이 밖으로 잘 끌립니다. `
      + '길게 앉히는 계획보다 «짧게 여러 번» 이 이 분에게 맞습니다. 환경 통제가 공부법의 절반입니다.' }
  } else {
    focus = { grade: 'B', say: '몰입하는 힘과 흩어지는 힘이 비슷하게 섭니다 — 컨디션에 따라 폭이 큽니다. '
      + '잘되는 날에 몰아 두고, 안 되는 날에는 손을 대는 것만으로 넘기는 쪽이 낫습니다.' }
  }

  // 오행이 한쪽으로 심하게 몰렸으면 알려 줍니다 — 「오행 밸런스 지침」의 근거
  const over = (Object.keys(ohaeng) as Array<keyof OhaengScore>)
    .filter(el => grade(ohaeng[el] ?? 0) === '과다')
  const lack = (Object.keys(ohaeng) as Array<keyof OhaengScore>)
    .filter(el => grade(ohaeng[el] ?? 0) === '결핍')
  if (over.length) {
    warnings.push(`오행이 ${over.join('·')} 쪽으로 몰려 있습니다(과다) — 그 결로만 밀다가 지칩니다. `
      + `${lack.length ? `비어 있는 ${lack.join('·')} 쪽 습관을 하루에 조금 섞어 주면` : '다른 결을 조금 섞어 주면'} 오래 갑니다.`)
  }

  return { mainName, mainCount, mainMissing, positives, warnings, focus, sipsinHave }
}

/**
 * 프롬프트에 실을 한 덩이로.
 *
 * ⚠️ 걸린 것이 없으면 그 묶음 자체를 빼십시오. 빈 제목만 넣으면
 *    AI 가 «특별한 신호가 없습니다» 를 손님에게 써 보냅니다. (교훈 BF)
 */
export function passSignalBlock(s: PassSignal): string {
  const L: string[] = []
  L.push(`[주로 보는 기운] ${s.mainName} — 원국에 ${s.mainCount}자리`)
  L.push(`[학업 몰입도] ${s.focus.grade}급 · ${s.focus.say}`)
  if (s.positives.length) {
    L.push('[유리한 자리]')
    for (const p of s.positives) L.push(`- ${p}`)
  }
  if (s.warnings.length) {
    L.push('[주의할 자리 — ★겁주지 말고 «막는 법» 과 함께 쓰세요]')
    for (const w of s.warnings) L.push(`- ${w}`)
  }
  return L.join('\n')
}
