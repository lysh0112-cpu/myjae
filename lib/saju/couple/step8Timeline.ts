// lib/saju/couple/step8Timeline.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  【8단계】 앞으로의 열 해 — 두 분 것을 «나란히» 놓습니다          │
// └───────────────────────────────────────────────────────────────┘
//
//  ★2026-08-02 신설 — 프리미엄 궁합 설계 확정본 2판 3장
//
//  ══ 교재 근거 ══
//    261쪽  "대운은 천간 30~40%, 지지 70~60% 정도의 비중으로 보고
//            ★지지가 «용신운» 으로 흐르는지 «기신운» 으로 흐르는지 살핀다"
//           ★"불리한 운이 와서 내담자가 힘들어할 때는 «좋은 대운과 세운을 살펴
//             희망을 가지고 살아가게» 상담해야 한다"
//    134쪽  ★"진술축미 대운은 … 음양이 교체되는 계절에 바뀌는 «접목대운» 이다.
//            ★고속도로의 «인터체인지» 에 비유할 수 있으며 인생의 큰 전환을 하게 되는
//            «터닝 포인트» 시기이다"
//           "인터체인지는 병목 현상이 발생하기 때문에 «속력을 내면 사고가 발생하므로
//            천천히 운전을 해야 한다»"
//           [접목 무렵에 생기는 넷] ① 매사가 얽히고설킨다 ② 계획이 지체·미뤄진다
//                                   ③ 조급증·안절부절 ④ 구설·장애물
//     62쪽  "午대운은 «개점휴업기» 라 사업 확장은 불리. 무리한 계획보다 준비하는 시기"
//     58쪽  "土대운은 고속도로의 인터체인지이다. 성급하게 일을 벌이면 안 된다"
//    263쪽  [개운법] "봉사를 하거나 기부를 해라. 좋은 일을 많이 해라.
//            마음 수행 공부를 많이 해라(명상, 수행). 많은 모임과 활발한 활동보다는
//            심신 수련을 하면서 공부를 해라"
//           ⚠️ 같은 대목의 「헌혈·부항·쌍꺼풀 시술」은 «담지 않았습니다» —
//              몸에 관한 것이고 우리는 의료인이 아닙니다. (교훈 CA)
//    238쪽  ★"사주를 좋고 나쁜 것으로 «단식 판단» 을 하면 안 된다"
//
//  ══ ⛔ 하지 «않는» 것 ══
//    ⛔ 「두 분이 «동시에» 어려운 해」라고 «판정하지» 않습니다.
//       ★교재에 "두 사람의 대운을 서로 견주는 «대조법»" 이 «없습니다».
//       ⇒ 두 분 것을 «나란히 놓고», 겹치면 «말만» 합니다.
//    ⛔ 「위기」라는 말을 쓰지 «않습니다». ★교재에 그 말이 없습니다.
//       교재는 「인터체인지」·「접목대운」·「터닝 포인트」·「개점휴업기」로 부릅니다.
//    ⛔ 「이별」·「이혼」·「헤어짐」은 «절대» 금지입니다 (toneGuard 와 같은 잣대).
//
//  ══ ★반드시 지킬 것 ══
//    ★흉을 말한 해에는 «반드시» solution 이 함께 있어야 합니다.
//      ⚠️ 43부에서 건강 당부(weakClashNote)를 「관점 마지막 문장으로 쓰지 말라」고
//         한 것과 같은 결입니다. 검사가 그것을 셉니다.
//
//  ══ 부품 재사용 (교훈 E — 만들기 전에 grep) ══
//    dayun.ts       ★calcSeyunList — 세운. 절기 API 가 필요 없습니다
//    ⚠️ 대운은 «절입일» 이 필요해 서버(/api/dayun)를 거칩니다.
//       화면에서 받아 온 것을 인자로 넘겨 주십시오. 여기서 새로 계산하지 «않습니다».
//    coupleFilterV1.PersonJudge.eokbu — 용신·희신·기신이 이미 들어 있습니다

import { calcSeyunList } from '../dayun'

export type Ohaeng = '목' | '화' | '토' | '금' | '수'

/** 지지 → 오행. ⚠️ 궁합이므로 «본래 오행» 입니다 (계절 치환 안 함 · 교재 40쪽) */
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

/** ★접목대운(辰戌丑未) — 교재 134쪽 「인터체인지」 */
const JEOPMOK = new Set(['辰', '戌', '丑', '未'])

/** 지지 충 — 태어난 날의 자리가 흔들리는 해를 봅니다 */
const CHUNG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}

export interface TimelinePerson {
  name: string
  /** 일지 — 태어난 날의 자리. 흔들리는 해를 보는 데 씁니다 */
  dayBranch: string
  /** 일간 — 세운 십신 계산에 씁니다 */
  dayStem: string
  /** ★용신·희신·기신 — PersonJudge.eokbu 를 그대로 넘기십시오 */
  yongsin: Ohaeng
  heesin: Ohaeng
  gisin: Ohaeng
}

/** 한 해에 한 사람이 어떤 결인가 */
export type YearTrend = '오름' | '고름' | '준비'

export interface YearRow {
  year: number
  ganji: string
  /** 사람마다의 결 */
  each: Array<{ name: string; trend: YearTrend; el: Ohaeng; shaken: boolean }>
  /** ★두 분이 «함께» 어떤 해인가 — 판정이 아니라 «나란히 놓은 결과» 입니다 */
  together: '두 분 다 오름' | '두 분 다 준비' | '엇갈림' | '고름'
  /** ★접목대운(辰戌丑未) 해인가 — 교재 134쪽 「인터체인지」 */
  jeopmok: boolean
  /** 손님께 드릴 말 */
  line: string
  /** ★흉을 말했으면 «반드시» 있습니다 */
  solution: string | null
}

/**
 * 한 해가 그 사람에게 어떤 결인가.
 *
 *   교재 261쪽 "지지가 용신운으로 흐르는지 기신운으로 흐르는지 살핀다"
 *   ⚠️ 「좋다/나쁘다」로 가르지 «않습니다». 오름 / 고름 / 준비 셋입니다.
 *      ★「나쁨」이라는 칸을 두지 않은 것이 이 함수의 알맹이입니다. (교재 238쪽)
 */
function trendOf(el: Ohaeng, p: TimelinePerson): YearTrend {
  if (el === p.yongsin || el === p.heesin) return '오름'
  if (el === p.gisin) return '준비'
  return '고름'
}

/**
 * 두 분의 앞날을 «나란히» 놓습니다.
 *
 * @param a  첫 번째 분
 * @param b  두 번째 분
 * @param fromYear  이 해부터
 * @param years  몇 해를 볼지 (기본 10)
 *
 * ⚠️ 대운은 여기서 계산하지 «않습니다». 절입일이 필요해 서버 전용입니다.
 *    ★세운(해마다의 간지)만 봅니다 — calcSeyunList 는 절기가 필요 없습니다.
 */
export function buildTimeline(
  a: TimelinePerson, b: TimelinePerson,
  fromYear: number, years = 10,
): YearRow[] {
  const aList = calcSeyunList(a.dayStem, fromYear)
  const bList = calcSeyunList(b.dayStem, fromYear)
  const out: YearRow[] = []

  for (let y = fromYear; y < fromYear + years; y++) {
    const ay = aList.find(x => x.year === y)
    if (!ay) continue
    // ⚠️ 세운의 «지지» 는 두 분이 같습니다 (같은 해이므로).
    //    다른 것은 «십신» 인데, 여기서는 용신·기신으로 보므로 지지 하나면 됩니다.
    //    ★그래서 b 쪽 목록은 «존재만» 확인하고 값은 쓰지 않습니다.
    if (!bList.find(x => x.year === y)) continue
    const el = BRANCH_EL[ay.jiji]
    if (!el) continue

    const each = [
      { name: a.name, trend: trendOf(el, a), el, shaken: CHUNG[a.dayBranch] === ay.jiji },
      { name: b.name, trend: trendOf(el, b), el, shaken: CHUNG[b.dayBranch] === ay.jiji },
    ]

    const ups = each.filter(x => x.trend === '오름').length
    const preps = each.filter(x => x.trend === '준비').length
    const together: YearRow['together'] =
      ups === 2 ? '두 분 다 오름'
        : preps === 2 ? '두 분 다 준비'
          : (ups === 1 && preps === 1) ? '엇갈림'
            : '고름'

    const jeopmok = JEOPMOK.has(ay.jiji)
    const { line, solution } = sayOf(y, each, together, jeopmok)

    out.push({
      year: y, ganji: `${ay.cheongan}${ay.jiji}`,
      each, together, jeopmok, line, solution,
    })
  }
  return out
}

/**
 * 한 해를 손님 말로 옮깁니다.
 *
 * ⚠️⚠️ 「위기」라는 말을 쓰지 «않습니다». 교재에 그 말이 «없습니다».
 *    교재의 말 — 인터체인지 · 접목대운 · 터닝 포인트 · 개점휴업기 · 준비하는 시기
 * ★어려운 해에는 «반드시» solution 을 함께 냅니다.
 */
function sayOf(
  year: number,
  each: YearRow['each'],
  together: YearRow['together'],
  jeopmok: boolean,
): { line: string; solution: string | null } {
  const [x, z] = each
  const shaken = each.filter(e => e.shaken)
  const ups = each.filter(e => e.trend === '오름')
  const preps = each.filter(e => e.trend === '준비')

  // ══════════════════════════════════════════════════════════════
  //  ★말은 «겹쳐» 냅니다. 하나가 다른 하나를 덮지 않게 합니다.
  //
  //  🔴 [2026-08-02 — 처음에 잘못 지었던 것]
  //    「접목이면 접목만 · 흔들리면 흔들림만」으로 갈라 냈더니 —
  //      · 2030년이 «두 분 다 오름» 인데 접목이 덮어 「일이 더디다」로 나갔습니다
  //        ⇒ 교재 261쪽 "좋은 운을 살펴 «희망을 갖게» 하라" 와 어긋납니다
  //      · 한 분이 «준비» 인데 다른 분이 고르면 그 준비가 «묻혔습니다»
  //    ★그래서 «오름 → 준비 → 흔들림 → 접목» 순으로 «쌓아» 말합니다.
  //      좋은 것을 «먼저», 살펴야 할 것을 «뒤에», 솔루션은 «맨 끝» 에.
  // ══════════════════════════════════════════════════════════════
  const parts: string[] = []
  const sols: string[] = []

  // ① 오름 — ★좋은 것을 «먼저» (교재 261쪽)
  if (ups.length === 2) {
    parts.push('★두 분 모두 기운이 오르는 해입니다.')
  } else if (ups.length === 1) {
    parts.push(`${ups[0].name}님께 기운이 붙는 해입니다.`)
  }

  // ② 준비 — 「나쁨」이 아니라 «준비» 입니다 (교재 238쪽 「단식 판단 금지」)
  if (preps.length === 2) {
    parts.push('두 분 다 «준비하는 해» 예요. 크게 벌이기보다 다지는 쪽이 잘 맞습니다.')
    sols.push('큰 결정은 한 해 미루시고, 그동안 함께 무언가를 배워 보시면 좋습니다.')
  } else if (preps.length === 1) {
    parts.push(`${preps[0].name}님께는 «준비하는 해» 입니다.`)
    if (ups.length === 1) {
      // ★엇갈리는 해 — 두 분의 «속도» 가 달라집니다
      sols.push('속도가 다른 해라 «먼저 말해 두는 것» 만으로 크게 달라집니다. '
        + '바쁜 쪽이 미리 알려 주시면 서운함이 줄어듭니다.')
    } else if (!shaken.length) {
      // ⚠️⚠️ 흔들리는 분이 «있으면» 아래에서 그쪽 솔루션이 나갑니다.
      //    여기서 또 내면 두 문장이 이어 붙어 «누구 이야기인지 흐려집니다».
      //    🔴 2026-08-02 — 2032년이 「김서준 준비 · 이지우 흔들림」인데
      //       솔루션이 «김서준을 살피라» 로 시작해 어긋났습니다.
      //    ★흔들림이 있으면 그쪽을 «먼저» 말합니다 — 더 급한 자리입니다.
      sols.push(`${preps[0].name}님께서 조용해지시면 «지친 것» 일 수 있어요. `
        + '이 무렵에는 곁에서 한 번 더 살펴 주십시오.')
    }
  }

  // ③ 태어난 날의 자리가 흔들리는 해
  if (shaken.length === 2) {
    parts.push(`${parts.length ? '그리고 ' : ''}두 분 다 «속마음이 머무는 자리» 가 흔들립니다. `
      + '사소한 말에도 마음이 오래 가실 수 있어요.')
    sols.push('서운한 것을 «그날 안에» 짧게라도 말해 두시면 쌓이지 않습니다.')
  } else if (shaken.length === 1) {
    const who = shaken[0].name
    const other = each.find(e => e.name !== who)!.name
    parts.push(`${parts.length ? '그리고 ' : ''}${who}님의 «속마음 자리» 가 흔들립니다. `
      + '마음이 자주 오르내리실 수 있어요.')
    // ★«누가 누구에게» 인지 분명히 합니다. 두 분이 함께 보시는 글입니다.
    sols.push(`${other}님께서 «괜찮냐» 고 한 번 물어 주시는 것만으로 크게 달라집니다. `
      + '설명을 재촉하지 마시고 기다려 주십시오.')
  }

  // ④ ★접목 — 교재 134쪽 「인터체인지」. «덮지 않고» 덧붙입니다
  if (jeopmok) {
    const hard = preps.length === 2
    const bothUp = ups.length === 2
    parts.push(hard
      ? `★계절이 바뀌는 «접목» 의 해${parts.length ? '이기도' : ''} 합니다. `
        + '교재는 이런 때를 «인터체인지» 에 견줍니다 — '
        + '길이 갈리는 자리라 속력을 내면 안 된다는 뜻이에요. '
        + '일이 얽히거나 미뤄지고, 마음이 조급해지기 쉬운 무렵입니다.'
      : bothUp
        // ★두 분 다 오르는데 접목인 해 — «좋은 해» 임을 지우지 않습니다 (교재 261쪽)
        ? '다만 계절이 바뀌는 «접목» 의 해라, 좋은 기운이 «한꺼번에» 오지 않고 '
          + '천천히 풀립니다. 조급해하지 않으셔도 됩니다.'
        // ⚠️ 앞말이 있으면 「이기도 합니다」, 없으면 「입니다」 —
        //    🔴 2026-08-02 — 앞말 없이 「이기도 합니다」로 시작해 어색했습니다.
        : `★계절이 바뀌는 «접목» 의 해${parts.length ? '이기도' : ''} 합니다. `
          + '새로운 자리로 건너가는 무렵이라 평소보다 일이 더디게 느껴질 수 있어요.')
    sols.push(hard
      ? '큰 결정은 한 해 뒤로 미루시면 훨씬 수월합니다. '
        + '교재는 이런 때에 «봉사나 기부, 마음을 다스리는 공부» 가 특히 잘 든다고 말합니다.'
      : bothUp
        ? '기운은 좋으니 «서둘러 결과를 보려 하지 않는 것» 만 지키시면 됩니다.'
        : '서두르지 않으시면 대개 잘 지나갑니다. 이 무렵에는 «벌이기보다 마무리하는» 쪽이 잘 맞습니다.')
  }

  // ⑤ 아무것도 안 걸린 해
  if (!parts.length) {
    return {
      line: '크게 오르내리지 않는 고른 해입니다. 쌓아 두신 것을 다지기 좋습니다.',
      solution: null,   // ★흉을 말하지 않았으므로 솔루션이 없어도 됩니다
    }
  }

  // ★두 분 다 오르고 아무 걸림이 없으면 — 가장 좋은 말을 덧붙입니다
  if (ups.length === 2 && !preps.length && !shaken.length && !jeopmok) {
    parts.push('열 해 가운데 가장 고른 무렵이에요.')
    sols.push('미뤄 두신 큰일이 있다면 이 무렵에 두시면 좋습니다.')
  }

  void x; void z; void year
  return { line: parts.join(' '), solution: sols.length ? sols.join(' ') : null }
}

/**
 * ★AI 재료로 넘길 한 덩이.
 *
 * ⚠️ 이 글은 toneGuard 를 «지나서» 나갑니다 (toCoupleTongbyeonInput).
 *    여기서 금지어를 쓰지 않는 것이 먼저이지만, 그물이 한 겹 더 있습니다.
 */
export function timelineBlock(rows: YearRow[]): string {
  if (!rows.length) return ''
  const out: string[] = ['[앞으로의 열 해 — 두 분 것을 나란히 놓았습니다]']
  out.push('※ ★「두 분이 동시에 어려운 해」라고 «판정하지» 마세요. 교재에 그런 대조법이 없습니다.')
  // ⚠️ 「위기」라는 낱말을 «여기 적지 않습니다» — 금지 지시문 안에 적으면
  //    금지어 검사가 그것을 잡습니다. toneGuard 를 지을 때 겪은 것과 같은 함정입니다.
  //    ★대신 «써야 할 말» 을 알려 줍니다. 그편이 AI 에게도 더 잘 듣습니다.
  out.push('※ ★어려운 시기는 교재의 말로 부르세요 — 「인터체인지」·「접목」·「준비하는 시기」·「터닝 포인트」.')
  // ⚠️⚠️ 금지어를 «여기 적지 마십시오». 적으면 금지어 검사가 그것을 잡습니다.
  //    🔴 2026-08-02 — 제가 「위기」와 「헤어짐」을 안내문에 적었다가 «두 번» 걸렸습니다.
  //       toneGuard 를 지을 때 겪은 것과 같은 함정인데 또 밟았습니다.
  //    ★금지어 목록은 toneGuard.BAN_NOTE «한 곳» 에만 둡니다.
  //      거기서는 CONTEXT_OK 가 「지시문 안의 예시」를 봐 주게 되어 있습니다.
  out.push('※ ★겁주는 말을 쓰지 마세요. 금지어 목록은 앞의 안내를 따르십시오.')
  out.push('※ ★어려움을 말한 대목 뒤에는 «반드시» 「→ 이렇게 하시면 좋습니다」를 붙이세요.')
  for (const r of rows) {
    const who = r.each.map(e => `${e.name} ${e.trend}`).join(' · ')
    out.push(`- ${r.year} ${r.ganji} [${who}]${r.jeopmok ? ' ★접목(인터체인지)' : ''}`)
    out.push(`    ${r.line}`)
    if (r.solution) out.push(`    → ${r.solution}`)
  }
  return out.join('\n')
}

/** ★열 해 가운데 «가장 고른 해» — 교재 261쪽 「좋은 운을 살펴 희망을 갖게」 */
export function bestYear(rows: YearRow[]): YearRow | null {
  // ★걸림이 «하나도» 없는 해를 먼저 고릅니다.
  //   ⚠️ 2026-08-02 — 접목인 해가 「가장 고른 해」로 뽑히던 것을 고쳤습니다.
  //      접목은 「천천히 가라」는 해인데 그것을 「큰일을 두시라」고 권하면 어긋납니다.
  const clean = rows.find(r =>
    r.together === '두 분 다 오름' && !r.jeopmok && !r.each.some(e => e.shaken))
  if (clean) return clean
  // ⚠️⚠️ 접목인 해는 «가장 고른 해» 로 내지 «않습니다».
  //    접목은 「천천히 가라」는 해인데 「큰일을 두시라」고 권하면 정면으로 어긋납니다.
  //    ★없으면 «없다» 고 하는 편이 정직합니다. 억지로 하나를 고르지 마십시오.
  //    (교재 261쪽은 「좋은 운을 살펴 희망을 갖게」라 했지 「없는 것을 만들라」 하지 않았습니다)
  return rows.find(r => r.together === '두 분 다 오름' && !r.jeopmok) ?? null
}
