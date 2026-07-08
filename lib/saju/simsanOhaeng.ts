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
): Array<[Ohaeng, number]> {
  const M = 35 // 월지 총점

  switch (branch) {
    // 寅월 (2.4~3.5) — 날짜 3분할
    case '寅': {
      const md = solarMonth * 100 + solarDay
      if (md >= 204 && md <= 214) return [['수', 35]]
      if (md >= 215 && md <= 225) return [['수', 25], ['목', 10]]
      return [['수', 10], ['목', 25]] // 2.26~3.5
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
      return [['화', 10], ['금', 25]] // 8.28~9.6
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

// ── 시지 계절 보정 (시지 10점을 어느 오행에 주느냐) ───────────────
//   태어난 계절(월지)에 따라 시지 오행을 보정.
function hourBranchScore(hourBranch: string, monthBranch: string): [Ohaeng, number] {
  const S = 10 // 시지 총점

  // 丑시·寅시 + 겨울(丑)·초봄(寅) → 수
  if ((hourBranch === '丑' || hourBranch === '寅') &&
      (monthBranch === '丑' || monthBranch === '寅')) {
    return ['수', S]
  }
  // 辰시 + 봄(卯·辰) → 목
  if (hourBranch === '辰' && (monthBranch === '卯' || monthBranch === '辰')) {
    return ['목', S]
  }
  // 未시 + 여름(巳·未) → 화   /  申·未시 + 申월 → 화
  if (hourBranch === '未' && (monthBranch === '巳' || monthBranch === '未')) {
    return ['화', S]
  }
  if ((hourBranch === '申' || hourBranch === '未') && monthBranch === '申') {
    return ['화', S]
  }
  // 戌시 + 가을(酉·戌) → 금
  if (hourBranch === '戌' && (monthBranch === '酉' || monthBranch === '戌')) {
    return ['금', S]
  }
  // 보정 없음 → 본래 오행
  const el = BRANCH_EL[hourBranch]
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
 * @returns 오행별 점수 { 목, 화, 토, 금, 수 } (합계 최대 100)
 */
export function calcSimsanOhaeng(
  saju: Pillar[],
  solarMonth: number,
  solarDay: number,
  hourBranch: string | null,
): OhaengScore {
  const score = emptyScore()
  const monthPillar = saju.find(p => p.pillar === '월주')
  const monthBranch = monthPillar ? monthPillar.branch : ''

  for (const { pillar, stem, branch } of saju) {
    // 천간 점수 (계절 치환 없음)
    const sEl = STEM_EL[stem]
    if (sEl) score[sEl] += STEM_SCORE[pillar] ?? 0

    // 지지 점수 (자리별 처리)
    if (pillar === '월주') {
      for (const [el, pts] of monthBranchScore(branch, solarMonth, solarDay, hourBranch ?? '')) {
        score[el] += pts
      }
    } else if (pillar === '시주') {
      const hb = hourBranch ?? branch
      const [el, pts] = hourBranchScore(hb, monthBranch)
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
