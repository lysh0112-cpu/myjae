// lib/saju/coupleComplement.ts
// ============================================================================
// 궁합 해설용 — "서로 채워주는 요소" 계산 (용신 + 귀인)
//   연재쌤 방향: "당신은 내게 없는 걸 채워주는 사람, 내 귀인" 멘트의 근거를 만든다.
//
//   ① 용신 채움 : 내 용신(꼭 필요한 오행)을 상대가 사주에 가졌나
//   ② 귀인 채움 : 내 귀인(천을·문창 등 8종) 글자를 상대가 지지에 가졌나
//                 → 전통 인연법("상대가 내 귀인 글자를 지니면 그가 내 귀인")
//
//   결과는 해설 프롬프트에 "재료"로 들어가고, AI가 자연 비유로 풀어낸다.
//   숫자·전문용어는 프롬프트 쪽에서 순우리말로 감싼다.
// ============================================================================

import type { Pillar } from './yongsinNew'
import { calcYongsinNew } from './yongsinNew'
import { calcSimsanOhaeng } from './simsanOhaeng'
import { getGwiinForBranch, getGwiinForStem } from './gwiin'

const HANJA_TO_KO: Record<string, string> = {
  木: '나무', 火: '불', 土: '흙', 金: '쇠', 水: '물',
  목: '나무', 화: '불', 토: '흙', 금: '쇠', 수: '물',
}
const EL_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

// 오행 → 지지 목록 (상대가 그 오행을 가졌는지 셀 때)
const BRANCH_EL: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

export interface ComplementInfo {
  /** 상대가 내 용신 오행을 가졌으면 그 오행(한글). 없으면 null */
  yongsinFilledBy: string | null
  /** 상대가 지닌, 나에게 귀인이 되는 귀인 이름들 (예: ['천을귀인','문창귀인']) */
  guiinFromPartner: string[]
}

/** 한 사람 입장에서, 상대가 나를 얼마나 채워주는지 */
function analyzeOne(
  mySaju: Pillar[],
  myDayStem: string,
  myMonthBranch: string,
  mySolar: { month: number; day: number; hourBranch: string | null },
  partnerSaju: Pillar[],
): ComplementInfo {
  // ① 용신 채움
  let yongsinFilledBy: string | null = null
  try {
    const score = calcSimsanOhaeng(mySaju, mySolar.month, mySolar.day, mySolar.hourBranch)
    const yong = calcYongsinNew(mySaju, myDayStem, score as Record<'목' | '화' | '토' | '금' | '수', number>)
    const yongEl = yong?.eokbu?.yongsin
    if (yongEl) {
      // 상대 사주(천간+지지)에 내 용신 오행이 있나
      const partnerEls: string[] = []
      for (const p of partnerSaju) {
        if (STEM_EL[p.stem]) partnerEls.push(STEM_EL[p.stem])
        if (BRANCH_EL[p.branch]) partnerEls.push(BRANCH_EL[p.branch])
      }
      if (partnerEls.includes(yongEl)) {
        yongsinFilledBy = HANJA_TO_KO[yongEl] ?? yongEl
      }
    }
  } catch { /* 용신 계산 실패 시 조용히 넘어감 */ }

  // ② 귀인 채움 — 상대 지지/천간에 내 귀인이 성립하나
  //   ⚠ 8종 다 넣으면 귀인이 흔해져 감동이 준다(자평진전도 남발 경계).
  //   인연·복의 핵심인 아래 우선순위로 최대 2개만 추린다.
  const GUIIN_PRIORITY = ['천을귀인', '문창귀인', '문곡귀인', '천덕귀인', '월덕귀인', '태극귀인', '금여', '암록']
  const guiinSet = new Set<string>()
  const myMonth = myMonthBranch
  for (const p of partnerSaju) {
    for (const g of getGwiinForBranch(myDayStem, myMonth, p.branch)) guiinSet.add(g)
    for (const g of getGwiinForStem(myMonth, p.stem)) guiinSet.add(g)
  }
  const guiinFromPartner = GUIIN_PRIORITY.filter(g => guiinSet.has(g)).slice(0, 2)

  return { yongsinFilledBy, guiinFromPartner }
}

export interface CoupleComplementResult {
  /** person1 입장: 상대(person2)가 나를 채워주는 정보 */
  forPerson1: ComplementInfo
  /** person2 입장: 상대(person1)가 나를 채워주는 정보 */
  forPerson2: ComplementInfo
}

/** "乙巳" 같은 간지 문자열 → { stem, branch } */
function splitPillar(pillarStr: string): { stem: string; branch: string } {
  const s = (pillarStr || '').replace(/[^\u4e00-\u9fff]/g, '') // 한자만
  if (s.length >= 2) return { stem: s[0], branch: s[1] }
  return { stem: '', branch: '' }
}

/**
 * 두 사람 간지 문자열(년월일시)로 "서로 채워주는" 정보를 계산한다.
 * @param p1 person1: { year, month, day, hour 간지 문자열, dayStem, solar 정보 }
 * @param p2 person2 동일
 */
export function calcCoupleComplement(
  p1: { yearPillar: string; monthPillar: string; dayPillar: string; hourPillar: string; dayStem: string; solar: { month: number; day: number; hourBranch: string | null } },
  p2: { yearPillar: string; monthPillar: string; dayPillar: string; hourPillar: string; dayStem: string; solar: { month: number; day: number; hourBranch: string | null } },
): CoupleComplementResult {
  const toSaju = (p: typeof p1): Pillar[] => {
    const y = splitPillar(p.yearPillar), mo = splitPillar(p.monthPillar)
    const d = splitPillar(p.dayPillar), h = splitPillar(p.hourPillar)
    return [
      { pillar: '년주', stem: y.stem, branch: y.branch },
      { pillar: '월주', stem: mo.stem, branch: mo.branch },
      { pillar: '일주', stem: d.stem, branch: d.branch },
      { pillar: '시주', stem: h.stem, branch: h.branch },
    ]
  }
  const saju1 = toSaju(p1), saju2 = toSaju(p2)
  const mb1 = saju1.find(x => x.pillar === '월주')?.branch ?? ''
  const mb2 = saju2.find(x => x.pillar === '월주')?.branch ?? ''

  return {
    forPerson1: analyzeOne(saju1, p1.dayStem, mb1, p1.solar, saju2),
    forPerson2: analyzeOne(saju2, p2.dayStem, mb2, p2.solar, saju1),
  }
}

/** 계산 결과를 프롬프트용 텍스트 블록으로 (없으면 빈 문자열) */
export function complementPromptBlock(
  r: CoupleComplementResult,
  name1: string,
  name2: string,
): string {
  const lines: string[] = []

  const one = (who: string, other: string, info: ComplementInfo) => {
    if (info.yongsinFilledBy) {
      lines.push(`- ${other}는 ${who}에게 부족하기 쉬운 '${info.yongsinFilledBy}'의 기운을 지녀, ${who}를 살려주는 고마운 상대입니다.`)
    }
    if (info.guiinFromPartner.length > 0) {
      lines.push(`- ${who}의 귀인(${info.guiinFromPartner.join('·')})에 해당하는 기운을 ${other}가 품고 있어, ${other}는 ${who}에게 힘이 되는 귀한 인연입니다.`)
    }
  }

  one(name1, name2, r.forPerson1)
  one(name2, name1, r.forPerson2)

  if (lines.length === 0) return ''
  return `[서로 채워주는 인연 — 반드시 자연 비유로, 전문용어(용신·귀인) 대신 "없는 걸 채워주는 고마운 사람"으로 풀 것]
${lines.join('\n')}`
}
