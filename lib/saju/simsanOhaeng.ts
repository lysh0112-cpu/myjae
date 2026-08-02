// lib/saju/simsanOhaeng.ts
//
// ┌─────────────────────────────────────────────────────────────┐
// │  심산 오행 계산기 (수리계산 관점 · 100점)                      │
// │  출전: 『명리적성 비법노트』 p.38 「01 점수론」                  │
// │        (원장님 110→100점 수정판)                              │
// │                                                              │
// │  사주 여덟 글자 + 양력 생일 + 시지를 넣으면                     │
// │  오행별 점수(목·화·토·금·수, 합 100)를 돌려주는 공용 부품.       │
// │  result-new 그래프, 유파 비교표, 상담사 화면 등 어디서든 재사용. │
// └─────────────────────────────────────────────────────────────┘
//
// 사용 예:
//   import { calcSimsanOhaeng } from '@/lib/saju/simsanOhaeng'
//   const score = calcSimsanOhaeng(saju, solarMonth, solarDay, hourBranch)
//   // → { 목:15, 화:5, 토:25, 금:0, 수:55 }

export type Ohaeng = '목' | '화' | '토' | '금' | '수'
export type OhaengScore = Record<Ohaeng, number>

/** 사주 한 기둥 (천간+지지). pillar는 '년주'|'월주'|'일주'|'시주' */
export interface Pillar {
  pillar: string
  stem: string
  branch: string
}

// ── 기본 오행 매핑 ──────────────────────────────────────────────
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

// ── ★★배점 확정 (2026-07-28 대표님 확정) ──────────────────────────
//
//       천간   년간  5 · 월간 10 · 일간 10 · 시간 10   =  35
//       지지   년지  5 · 월지 35 · 일지 15 · 시지 10   =  65
//                                                 총 100점
//
//   ★이 여덟 칸이 확정값이다. 아래 STEM_SCORE·BRANCH_SCORE 와 같다.
//
//   ⚠️ 교재 39쪽 「02 寅月生과 申月生의 사주 진로 분석」에는
//      총 110점 표가 실려 있다(天干 각 10 / 地支 時15 日15 月30 年10).
//      ★그 표는 옛 판이다. 사고가 아니다.
//      심산 원장이 교재를 손수 고쳐 100점으로 가르치셨고, 우리는 그것을 받아 썼다.
//      ohaengGijil.ts 머리말의 "① 배점 100점 (현재 프로그램)" 도 같은 이야기다.
//
//   ⚠️ PDF 스캔 39쪽을 보고 "점수가 틀렸다" 며 고치지 마십시오.
//      고치면 오행 점수가 통째로 흔들리고 발달·과다 판정이 다 바뀝니다.
//      대운·세운·궁합·진로적성까지 한꺼번에 달라집니다.
//
// ── 기본 배점 (총 100점) ────────────────────────────────────────
//   천간: 시간10 · 일간10 · 월간10 · 년간5   (합 35)
//   지지: 시지10 · 일지15 · 월지35 · 년지5   (합 65)
const STEM_SCORE: Record<string, number> = { 시주: 10, 일주: 10, 월주: 10, 년주: 5 }
const BRANCH_SCORE: Record<string, number> = { 시주: 10, 일주: 15, 월주: 35, 년주: 5 }

function emptyScore(): OhaengScore {
  return { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
}

// ── 월지 계절 치환 (월지 35점을 어느 오행에 주느냐) ──────────────
//   양력 월·일과 시지에 따라 동적으로 결정.
//   반환: [오행, 점수] 목록 (寅·申월 날짜분할은 두 개로 나뉨)
function monthBranchScore(
  branch: string,
  solarMonth: number,
  solarDay: number,
  hourBranch: string,
  forCouple = false,
): Array<[Ohaeng, number]> {
  const M = 35 // 월지 총점

  // ★2026-07-24 — 궁합에서는 월지의 土 지지(丑·辰·未·戌)를 계절로 치환하지 않고
  //   본래 오행인 土로 본다. (대표님 지시)
  //     일반 사주: 未월 → 火, 丑월 → 水 (계절 기운으로 봄)
  //     궁합:      未월 → 土, 丑월 → 土 (지지 본래 오행으로 봄)
  //   ⚠️ 궁합 전용이다. 사주보기(forCouple=false)는 예전 계절 치환을 그대로 쓴다.
  //   범위: 土 지지 4개(丑·辰·未·戌)만. 나머지(子·寅·巳 등)는 궁합에서도 그대로.
  if (forCouple && (branch === '丑' || branch === '辰' || branch === '未' || branch === '戌')) {
    return [['토', M]]
  }

  switch (branch) {
    // 寅월 (2.4~3.5) — 날짜 3분할
    case '寅': {
      const md = solarMonth * 100 + solarDay
      if (md >= 204 && md <= 214) return [['수', 35]]
      if (md >= 215 && md <= 225) return [['수', 25], ['목', 10]]
      return [['수', 15], ['목', 20]] // 2.26~3.5
    }
    // 卯월 — 완연한 봄
    case '卯':
      return [['목', M]]
    // 辰월 — 卯시·辰시면 목, 아니면 토
    case '辰':
      if (hourBranch === '卯' || hourBranch === '辰') return [['목', M]]
      return [['토', M]]
    // 巳·午월 — 여름 불
    case '巳':
    case '午':
      return [['화', M]]
    // 未월 — 토지만 화로
    case '未':
      return [['화', M]]
    // 申월 (8.7~9.6) — 날짜 3분할
    case '申': {
      const md = solarMonth * 100 + solarDay
      if (md >= 807 && md <= 816) return [['화', 35]]
      if (md >= 817 && md <= 827) return [['화', 25], ['금', 10]]
      return [['화', 15], ['금', 20]] // 8.28~9.6
    }
    // 酉월 — 완연한 가을
    case '酉':
      return [['금', M]]
    // 戌월 — 酉시·戌시면 금, 아니면 토
    case '戌':
      if (hourBranch === '酉' || hourBranch === '戌') return [['금', M]]
      return [['토', M]]
    // 亥·子월 — 겨울 물
    case '亥':
    case '子':
      return [['수', M]]
    // 丑월 — 토지만 수로
    case '丑':
      return [['수', M]]
    default: {
      const el = BRANCH_EL[branch]
      return el ? [[el, M]] : []
    }
  }
}

// ── 시지 점수 (시지 10점) ───────────────────────────────────────
// ══════════════════════════════════════════════════════════════════
//  ★★2026-08-02 연재쌤 지시 — 시지 계절 치환을 «넣습니다» (방향이 뒤집혔습니다)
//
//  [무엇이 바뀌었나]
//    전  2026-07 연재쌤 확정 — "시지 계절 보정은 적용하지 않는다"
//    후  ★2026-08-02 연재쌤 지시 — "시지 점수를 반영하자"
//        ⚠️ 옛 확정을 «되돌린» 것이 아니라, 연재쌤이 «새로 정하신» 것입니다.
//           원장님 손글씨 수정판 스캔(38쪽)을 대표님이 보내 주셔서 확인했습니다.
//           원장님은 점수만 15→10 으로 고치셨고 «시지 안내는 지우지 않으셨습니다».
//        ★그러니 「넣지 않는다」가 오히려 교재 밖이었습니다.
//
//  [옛 판단의 까닭 — 기록으로 남깁니다]
//    "심산 선생님도 강의에서 넣을 때와 안 넣을 때가 있다고 한다.
//     상황을 보고 판단하는 참고 규칙이지 절대 규칙이 아니다."
//    ⇒ 그 «때에 따라» 를 이제 «쓰임» 으로 가릅니다. 아래 purpose 를 보십시오.
//
//  ⚠️⚠️ [넣지 않기로 되돌리지 마십시오]
//     이 주석을 보고 "2026-07 에 안 넣기로 했는데" 하며 되돌리면
//     연재쌤 지시를 뒤집는 것입니다. 되돌리려면 연재쌤께 다시 여쭈십시오.
//
//  ── ★교재 38쪽 시지 안내 (월지가 «맞을 때만» · 전부 10점) ──
//     ⚠️ 월지 칸에 안내가 «적힌» 자리만 치환합니다.
//        공란인 월지(子·巳·午·亥)는 «있는 오행 그대로» 입니다. (대표님 확인)
//
//       寅월 · 丑월   시지 丑·寅  →  水 10
//       卯월 · 辰월   시지 辰      →  木 10
//       未월          시지 未      →  火 10
//       申월          시지 申·未   →  火 10
//       酉월 · 戌월   시지 戌      →  金 10
//
//     ⚠️ 卯시·酉시가 안내에 없는 것은 «본래 오행이 이미 그것» 이라 적을 필요가
//        없었기 때문입니다 (卯=목 · 酉=금). 치환해도 결과가 같습니다.
//
//  ── ★쓰임에 따라 가릅니다 (2026-08-02 대표님 지시) ──
//       진로 · 적성 · 성격   →  치환 «적용»    (기본)
//       건강 · 궁합          →  치환 «미적용». 있는 오행 그대로
//       ★교재 147쪽 "조후용신은 건강과 궁합을 볼 때 많이 사용한다" 와 같은 묶음입니다.
//     ⚠️ 치환이 걸리면 «반드시 한 줄» 을 덧붙여야 합니다 —
//        seasonConvertNote() 가 그 말을 냅니다. 빠뜨리면 두 화면의 숫자가
//        왜 다른지 손님이 알 수 없습니다.
//     ⚠️ 「건강」만 보는 화면이 아직 없어, 사주보기는 «진로·성격» 쪽으로 둡니다.
//        ★건강 화면이 생기면 purpose: '건강궁합' 으로 부르십시오. (대표님 지시)
//
//  [실측 2026-08-02] 144칸 중 11칸(7.6%)이 달라집니다.
//     임의 사주 20만 건 — 점수 변동 7.56% · ★발달·과다 판정 뒤집힘 4.91%
//     · 가장 센 오행 바뀜 1.51% · 약함→결핍 1.18%
//     ⚠️ 작은 수정이 아닙니다. 진로적성의 «강점 지능» 이 66명 중 한 분 달라집니다.
//     ★npm run measure:hour 로 언제든 다시 잽니다.
// ══════════════════════════════════════════════════════════════════

/** 교재 38쪽 — 월지가 맞을 때만 걸리는 시지 치환. ★안 적힌 월지는 «그대로» */
const HOUR_CONVERT: Record<string, { hours: string[]; el: Ohaeng }> = {
  寅: { hours: ['丑', '寅'], el: '수' },
  丑: { hours: ['丑', '寅'], el: '수' },
  卯: { hours: ['辰'], el: '목' },
  辰: { hours: ['辰'], el: '목' },
  未: { hours: ['未'], el: '화' },
  申: { hours: ['申', '未'], el: '화' },
  酉: { hours: ['戌'], el: '금' },
  戌: { hours: ['戌'], el: '금' },
}

/**
 * 이 월지·시지 짝에 치환이 걸리는가. 걸리면 바뀔 오행, 아니면 null.
 * ★판정과 «안내 문구» 가 같은 창구를 쓰게 하려고 따로 냅니다. (교훈 CJ)
 */
export function hourConvertEl(monthBranch: string, hourBranch: string): Ohaeng | null {
  const r = HOUR_CONVERT[monthBranch]
  if (!r || !r.hours.includes(hourBranch)) return null
  const from = BRANCH_EL[hourBranch]
  return from === r.el ? null : r.el   // 이미 같은 오행이면 «치환이 아닙니다»
}

function hourBranchScore(
  hourBranch: string,
  monthBranch: string,
  convert: boolean,
): [Ohaeng, number] {
  const S = 10 // 시지 총점
  const el = (convert ? hourConvertEl(monthBranch, hourBranch) : null) ?? BRANCH_EL[hourBranch]
  return el ? [el, S] : ['목', 0]
}

// ── 메인 계산기 ─────────────────────────────────────────────────
/**
 * 심산 오행 점수 계산 (100점 만점)
 *
 * @param saju        사주 네 기둥 (pillar '년주'|'월주'|'일주'|'시주' 포함)
 * @param solarMonth  양력 월 (1~12) — 寅·申월 날짜분할에 필요
 * @param solarDay    양력 일 (1~31)
 * @param hourBranch  시지 글자 (예 '卯'). 없으면 시주 미반영
 * @param opts.purpose  ★무엇을 보려고 부르는가 (2026-08-02 대표님 지시)
 *                      '진로'(기본)  진로·적성·성격 — 시지 계절 치환을 «적용»
 *                      '건강궁합'    건강·궁합       — 있는 오행 «그대로»
 * @param opts.forCouple ⚠️ 옛 이름입니다. 부르는 곳이 여럿이라 남겨 둡니다.
 *                       true 면 purpose='건강궁합' 과 같습니다.
 * @returns 오행별 점수 { 목, 화, 토, 금, 수 } (합계 최대 100)
 */
export type OhaengPurpose = '진로' | '건강궁합'

export function calcSimsanOhaeng(
  saju: Pillar[],
  solarMonth: number,
  solarDay: number,
  hourBranch: string | null,
  opts: { forCouple?: boolean; purpose?: OhaengPurpose } = {},
): OhaengScore {
  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-02 — 「쓰임」 하나로 모읍니다
  //   ⚠️ forCouple 은 원래 «월지» 치환만 가르던 값이었습니다.
  //      이제 «시지» 치환도 함께 가르므로 뜻이 겹칩니다.
  //      ★새로 부르는 곳은 purpose 를 쓰십시오. forCouple 은 옛 길입니다.
  //   ⚠️ 둘 다 안 주면 «진로» 입니다 — 지금까지 부르던 곳이 대부분 그쪽입니다.
  // ══════════════════════════════════════════════════════════════
  const purpose: OhaengPurpose = opts.purpose ?? (opts.forCouple ? '건강궁합' : '진로')
  const forCouple = purpose === '건강궁합'
  /** 시지 계절 치환을 넣는가 — ★진로·적성·성격에서만 */
  const convertHour = purpose === '진로'
  const score = emptyScore()
  const monthPillar = saju.find(p => p.pillar === '월주')
  const monthBranch = monthPillar ? monthPillar.branch : ''

  for (const { pillar, stem, branch } of saju) {
    // 천간 점수 (계절 치환 없음)
    const sEl = STEM_EL[stem]
    if (sEl) score[sEl] += STEM_SCORE[pillar] ?? 0

    // 지지 점수 (자리별 처리)
    if (pillar === '월주') {
      for (const [el, pts] of monthBranchScore(branch, solarMonth, solarDay, hourBranch ?? '', forCouple)) {
        score[el] += pts
      }
    } else if (pillar === '시주') {
      const hb = hourBranch ?? branch
      const [el, pts] = hourBranchScore(hb, monthBranch, convertHour)
      score[el] += pts
    } else {
      // 일지(15) · 년지(5) — 계절 치환 없이 본래 오행
      const bEl = BRANCH_EL[branch]
      if (bEl) score[bEl] += BRANCH_SCORE[pillar] ?? 0
    }
  }

  return score
}

// ── 점수 → 백분율 (그래프용) ────────────────────────────────────
/** 점수를 그래프용 [{el, pct}] 배열로 변환 (합 100 기준 반올림) */
export function toPercentList(score: OhaengScore): Array<{ el: Ohaeng; pct: number }> {
  const total = Object.values(score).reduce((a, b) => a + b, 0) || 1
  return (['목', '화', '토', '금', '수'] as Ohaeng[]).map(el => ({
    el,
    pct: Math.round((score[el] / total) * 1000) / 10, // 소수 첫째자리
  }))
}

// ── 점수 → 등급 (발달/과다/결핍) ────────────────────────────────
export type OhaengGrade = '결핍' | '약함' | '발달' | '과다'
/** 심산 기준 등급: 0 결핍 / 1~24 약함 / 25~45 발달 / 50+ 과다 */
export function grade(points: number): OhaengGrade {
  if (points === 0) return '결핍'
  if (points >= 50) return '과다'
  if (points >= 25) return '발달'
  return '약함'
}

// ── 계절치환 안내 (화면 표시용) ─────────────────────────────────
/**
 * 이 사주의 월지에 계절치환이 적용됐는지 알려준다.
 *   "오행과 십성 분석"(적성 기준)과 "합충 반영 오행"(용신 기준)의
 *   숫자가 왜 다른지 사용자에게 설명하기 위한 문구.
 *
 * @returns 치환이 일어났으면 설명 문자열, 아니면 null
 */
export function seasonConvertNote(
  monthBranch: string,
  solarMonth: number,
  solarDay: number,
  hourBranch: string,
): string | null {
  const md = solarMonth * 100 + solarDay
  switch (monthBranch) {
    case '丑':
      return '월지 丑(토)을 겨울 기운으로 보아 水로 계산했어요.'
    case '未':
      return '월지 未(토)를 여름 기운으로 보아 火로 계산했어요.'
    case '辰':
      return (hourBranch === '卯' || hourBranch === '辰')
        ? '월지 辰(토)을 봄 기운으로 보아 木으로 계산했어요.'
        : null
    case '戌':
      return (hourBranch === '酉' || hourBranch === '戌')
        ? '월지 戌(토)을 가을 기운으로 보아 金으로 계산했어요.'
        : null
    case '寅':
      if (md >= 204 && md <= 214) return '입춘 직후라 월지 寅을 아직 겨울(水)로 계산했어요.'
      if (md >= 215 && md <= 225) return '월지 寅을 겨울(水)에서 봄(木)으로 넘어가는 중으로 나눠 계산했어요.'
      return '월지 寅을 봄(木) 기운 위주로 나눠 계산했어요.'
    case '申':
      if (md >= 807 && md <= 816) return '입추 직후라 월지 申을 아직 여름(火)으로 계산했어요.'
      if (md >= 817 && md <= 827) return '월지 申을 여름(火)에서 가을(金)로 넘어가는 중으로 나눠 계산했어요.'
      return '월지 申을 가을(金) 기운 위주로 나눠 계산했어요.'
    default:
      return null
  }
}

// ══════════════════════════════════════════════════════════════════
//  ★2026-08-02 — 시지 치환이 걸리면 «반드시 한 줄» (대표님 지시)
//
//   [왜 반드시인가]  진로 화면과 건강·궁합 화면의 «숫자가 달라집니다».
//     까닭을 말해 주지 않으면 손님이 「어느 게 맞느냐」고 여쭙습니다.
//     ★위 seasonConvertNote 가 «월지» 를 위해 만들어진 것과 같은 뜻입니다.
//
//   ⚠️ 이 말을 «지어내지» 마십시오 — hourConvertEl 이 판정하고 여기는 옮겨만 씁니다.
//      두 곳에서 따로 판단하면 「치환은 됐는데 말은 안 나오는」 날이 옵니다. (교훈 CJ)
// ══════════════════════════════════════════════════════════════════

/**
 * 시지 계절 치환이 걸렸으면 한 줄로 알려 줍니다. 안 걸렸으면 null.
 *
 * ⚠️ 건강·궁합(purpose='건강궁합')에서는 치환을 «안 하므로»,
 *    그때는 이 함수를 부르지 말고 hourNoConvertNote() 를 쓰십시오.
 */
export function hourConvertNote(monthBranch: string, hourBranch: string): string | null {
  const to = hourConvertEl(monthBranch, hourBranch)
  if (!to) return null
  const from = BRANCH_EL[hourBranch]
  // ★2026-08-02 — careerScore 가 따로 내던 hourNote 를 «여기로 모았습니다».
  //   그쪽 말투가 더 정확해서(「辰월의 기운으로」) 그것을 따릅니다.
  //   ⚠️ 두 곳에서 따로 말하면 한쪽만 고치는 날이 옵니다. (교훈 CJ)
  return `태어난 시 ${hourBranch}(${from})를 ${monthBranch}월의 기운으로 보아 ${to}(으)로 계산했어요.`
}

/**
 * ★건강·궁합 화면에서 «왜 숫자가 다른지» 알려 주는 한 줄.
 *
 *   치환이 걸릴 «자리인데» 안 걸었을 때만 말합니다.
 *   ⚠️ 아무 때나 말하면 손님이 없는 차이를 걱정하십니다.
 */
export function hourNoConvertNote(monthBranch: string, hourBranch: string): string | null {
  const to = hourConvertEl(monthBranch, hourBranch)
  if (!to) return null
  const from = BRANCH_EL[hourBranch]
  return `건강과 궁합을 볼 때는 태어난 시를 있는 그대로 봅니다(${hourBranch}=${from}).`
    + ` 진로·적성 화면에서는 ${to}(으)로 보아 숫자가 조금 다를 수 있어요.`
}
