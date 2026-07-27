// lib/saju/examLuck/examScore.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  해마다 합격운 점수를 매긴다                                      │
// │  표: tables/rules.ts   합충: hapchung.ts                       │
// └───────────────────────────────────────────────────────────────┘
//
// ★비중 — 대운 30 : 세운 70 (교재 230쪽, 잠정)
//   두 자료가 어긋나 rules.ts 의 CONFLICT ① 에 적어 두었다.
//   월운·일진은 "중요하지 않다"는 쪽을 따라 보지 않는다.
//
// ★교훈 BA — 문턱을 정하기 전에 분포를 재라.
//   등급 경계는 아래 GRADE_CUT 하나에 모아 두었다. 실제 사주를 여러 벌
//   돌려 보고 조정할 것. 지금 값은 규칙 무게로부터 어림잡은 것이다.

import { calcSeyunList } from '../dayun'
import { exactAge, pickCurrentDayun, dayunOrder, type DayunLike } from '../ageDayun'
// ★2026-07-27 — sipsinOf 는 지지를 못 읽는다(조용히 '' 를 준다). ./sipsin.ts 참조
import { sipsinOfChar } from './sipsin'
import { getGongmang } from '../gongmang'
import { GOOD, BAD, NEUTRAL, STUDY_TREND } from './tables/rules'
import type { ExamInput, YearLuck, Grade, Pillar } from './types'
import {
  readNatal, ilganGwanHap, ilganGwanChung, cheonhapJihap, cheongeukJichung,
  chungedBy, hapedBy, makesGroupHap, makesSamhyeong, isYukhap, isJijiChung,
} from './hapchung'

const rule = (key: string) =>
  GOOD.find(r => r.key === key) ?? BAD.find(r => r.key === key) ?? NEUTRAL.find(r => r.key === key)!

/** 대운 30 : 세운 70 (잠정 — CONFLICT ①) */
export const DAYUN_WEIGHT = 0.3
export const SEYUN_WEIGHT = 0.7

/** 등급 경계 — ★분포를 재고 다듬을 것 (교훈 BA) */
export const GRADE_CUT: Array<{ min: number; grade: Grade }> = [
  { min: 6, grade: '아주 좋음' },
  { min: 3, grade: '좋음' },
  { min: -2, grade: '보통' },
  { min: -5, grade: '조심' },
  { min: -99, grade: '많이 조심' },
]

export function gradeOf(score: number): Grade {
  return GRADE_CUT.find(c => score >= c.min)!.grade
}

/** 한 해를 판정한다 */
export function judgeYear(
  saju: Pillar[],
  year: number,
  yStem: string,
  yBranch: string,
): YearLuck {
  const n = readNatal(saju)
  const hits: YearLuck['hits'] = []
  const add = (key: string) => {
    const r = rule(key)
    if (r && !hits.some(h => h.key === key)) {
      hits.push({ key: r.key, say: r.say, weight: r.weight, src: r.src })
    }
  }

  const ganSipsin = n.dayStem ? sipsinOfChar(n.dayStem, yStem) : ''
  // ★2026-07-27 — 전에는 sipsinOf 라 지지 십신이 언제나 '' 였다.
  //   정관운·정인운·겁재운 같은 규칙이 천간에서만 걸리고 있었다.
  const jiSipsin = n.dayStem ? sipsinOfChar(n.dayStem, yBranch) : ''
  const both = [ganSipsin, jiSipsin]

  // ── 유리 ──────────────────────────────────────────────────
  if (ilganGwanHap(n, yStem)) add('일간관성합')
  if (cheonhapJihap(n, yStem, yBranch)) add('일주천합지합')

  // 관인상생 — 그해에 관성과 인성이 함께 들거나, 한쪽이 들며 원국의 다른 쪽과 이어질 때
  const hasGwan = both.some(s => s === '정관' || s === '편관')
  const hasIn = both.some(s => s === '정인' || s === '편인')
  if ((hasGwan && hasIn) || (hasGwan && n.inChars.length) || (hasIn && n.gwanChars.length)) {
    add('관인상생')
  }

  if (makesGroupHap(n.branches, yBranch) || isYukhap(n.dayBranch, yBranch)) add('삼합방합육합')
  if (both.includes('정인')) add('정인운')
  if (both.includes('정관')) add('정관운')
  if (both.includes('편인')) add('편인운')
  if (both.includes('식신')) add('식신운')

  // ── 불리 ──────────────────────────────────────────────────
  // ★상관정관 — 교재가 가장 불리하다고 한 자리
  if (both.includes('상관') && (both.includes('정관') || n.gwanChars.length > 0)) add('상관정관')
  if (ilganGwanChung(n, yStem)) add('일간관성충')
  if (cheongeukJichung(n, yStem, yBranch)) add('일주천극지충')
  if (n.gwanChars.length && chungedBy(n.gwanChars, yStem, yBranch)) add('관인형충')
  if (n.inChars.length && chungedBy(n.inChars, yStem, yBranch)) add('관인형충')
  if (n.bigyeopChars.length && n.gwanChars.length && chungedBy(n.gwanChars, yStem, yBranch)) add('비겁관성충')
  if (both.includes('겁재')) add('겁재운')
  // 합거 — 기대던 인성·관성이 합에 묶여 자리를 비운다
  if (n.gwanChars.length && hapedBy(n.gwanChars, yStem, yBranch)) add('용신관인합거')
  if (n.inChars.length && hapedBy(n.inChars, yStem, yBranch)) add('용신관인합거')
  // 재극인 · 식상극관
  if (both.some(s => s === '정재' || s === '편재') && n.inChars.length) add('재극인')
  if (both.some(s => s === '식신' || s === '상관') && n.gwanChars.length) add('식상극관')

  // 공망
  if (n.dayStem && n.dayBranch && n.dayStem !== '?' && n.dayBranch !== '?') {
    const gm = getGongmang(n.dayStem, n.dayBranch)
    if (gm.includes(yBranch)) add('공망')
  }

  // ── 시험과 무관하지만 알려 주는 것 ──────────────────────────
  if (makesSamhyeong(n.branches, yBranch)) add('삼형살')

  const score = hits.reduce((s, h) => s + h.weight, 0)
  return { year, stem: yStem, branch: yBranch, ganSipsin, jiSipsin, score, hits, grade: gradeOf(score) }
}

/** 올해부터 span 해를 판정한다 (기본 3년 — 대표님 지시 2026-07-27) */
export function judgeYears(input: ExamInput, thisYear: number): YearLuck[] {
  const span = input.span ?? 3
  const day = input.saju.find(p => p.pillar === '일주')
  const dayStem = day?.stem ?? ''
  if (!dayStem || dayStem === '?') return []

  const all = calcSeyunList(dayStem, thisYear)
  return all
    .filter(s => s.year >= thisYear && s.year < thisYear + span)
    .map(s => judgeYear(input.saju, s.year, s.cheongan, s.jiji))
}

/**
 * 지금 지나고 있는 대운 한 칸을 고른다 (비중 30%).
 *
 * ★대운 계산은 KASI 절기 API 키가 필요해 서버에서만 된다.
 *   그래서 여기서 직접 부르지 않는다. 화면이 /api/dayun 으로 받아 온
 *   목록을 넘겨 주면 그중 지금 칸을 골라 준다.
 *   (기존 대운 화면과 같은 방식 — app/api/dayun/route.ts)
 *
 * ★나이는 lib/saju/ageDayun.ts 하나만 쓴다. 화면마다 다르면 안 된다.
 */
export function currentDayunOf(input: ExamInput, dayunList: DayunLike[]) {
  const age = exactAge(input.birthYear, input.birthMonth, input.birthDay)
  return {
    age,
    dayun: pickCurrentDayun(dayunList, age),
    order: dayunOrder(dayunList, age),
  }
}

/**
 * 대운이 학업·시험에 어느 쪽으로 기우는가.
 * ★1·2대운에는 용신을 보지 않고 육친만 본다. (교재 230쪽)
 */
export function dayunTrend(
  dayun: { ganYukchin: string; jiYukchin: string } | null,
): { trend: '상승' | '보통' | '하락' | '알 수 없음'; sipsins: string[] } {
  if (!dayun) return { trend: '알 수 없음', sipsins: [] }
  const s = [dayun.ganYukchin, dayun.jiYukchin].filter(Boolean)
  const has = (list: readonly string[]) => s.some(x => list.includes(x))
  if (has(STUDY_TREND.상승)) return { trend: '상승', sipsins: s }
  if (has(STUDY_TREND.하락)) return { trend: '하락', sipsins: s }
  if (has(STUDY_TREND.보통)) return { trend: '보통', sipsins: s }
  return { trend: '알 수 없음', sipsins: s }
}
