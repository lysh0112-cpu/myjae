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
import { GOOD, BAD, NEUTRAL, STUDY_TREND, PURPOSE_BONUS, examKindOf } from './tables/rules'
// ★2026-07-27 — 관성의 12운성을 보려면 필요하다. 원본 195쪽 「관성이 12운성 상 관대에 해당하거나」
import { getUnsung } from '../unsung'
// ★2026-07-27 — 조후·기신·격국을 얻는다. 셋 다 이 한 번의 호출로 나온다.
//   ⚠️ yongsinNew.ts 는 손대지 않는다. 부르기만 한다. (작업지시 12장)
import { calcYongsinNew } from '../yongsinNew'
import { isCheonganHap } from './hapchung'
import type { ExamInput, YearLuck, Grade, Pillar } from './types'
import {
  readNatal, ilganGwanHap, ilganGwanChung, cheonhapJihap, cheongeukJichung,
  chungedBy, hyeongChungedBy, hapedBy, makesGroupHap, makesSamhyeong, isYukhap,
} from './hapchung'

const rule = (key: string) =>
  GOOD.find(r => r.key === key) ?? BAD.find(r => r.key === key) ?? NEUTRAL.find(r => r.key === key)!

/** 대운 30 : 세운 70 (잠정 — CONFLICT ①) */
export const DAYUN_WEIGHT = 0.3
export const SEYUN_WEIGHT = 0.7

/** 등급 경계 — ★분포를 재고 다듬을 것 (교훈 BA) */
/**
 * ★등급 문턱 — 2026-07-27 대표님 확정.
 *
 * [어떻게 정했나]
 *   무작위 사주 3만 벌에 대운 30 : 세운 70 을 섞어 점수 분포를 먼저 쟀다.
 *   (교훈 BA — 문턱을 정하기 전에 분포부터 재라)
 *
 *     지금 값 7 / 3 / −4 / −9   아주좋음 5.9 · 좋음 21.5 · 보통 51.7 · 조심 16.1 · 많이조심 4.9 %
 *     전  값 6 / 3 / −2 / −5   아주좋음 9.4 · 좋음 18.0 · 보통 38.7 · 조심 17.7 · 많이조심 16.2 %
 *
 * [왜 바꿨나]
 *   전 값은 여섯에 하나가 "많이 조심" 이었다. 합격운은 겁주기 가장 쉬운 자리다.
 *   지금은 스무 명에 하나만 그 칸에 든다. "아주 좋음" 도 같은 비율로 드물어
 *   그 말이 나올 때 값어치가 있다.
 *
 * ⚠️ 무작위 사주 기준이다. 실제 손님 분포는 다를 수 있다.
 *    한동안 돌려 보고 어느 칸이 쏠리면 여기만 고치면 된다.
 */
/** 천간·지지 → 오행 (examScore 안에서만 쓰는 잔손) */
const STEM_EL_: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const BRANCH_EL_: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}

export const GRADE_CUT: Array<{ min: number; grade: Grade }> = [
  { min: 7, grade: '아주 좋음' },
  { min: 3, grade: '좋음' },
  { min: -4, grade: '보통' },
  { min: -9, grade: '조심' },
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
  /**
   * ★무엇을 보러 왔는가 — 원본 195쪽
   *   「합격운은 인성운이 더 중요하고, 취업운은 관성운이 더 중요하며」
   *   안 넘기면 어느 쪽에도 힘을 더 싣지 않는다(예전 동작).
   */
  purpose?: 'exam' | 'job',
  /** 손님이 고른 시험 종류 (EXAM_KINDS 의 key) — 교재 230쪽 */
  examKind?: string | null,
): YearLuck {
  const n = readNatal(saju)
  const hits: YearLuck['hits'] = []
  const add = (key: string) => {
    const r = rule(key)
    if (r && !hits.some(h => h.key === key)) {
      hits.push({ key: r.key, say: r.say, weight: r.weight, src: r.src })
    }
  }

  // ★용신·기신·조후·격국 — 한 번만 계산해 아래 세 규칙이 나눠 쓴다.
  //   전에는 이 셋(조후해결·기신간합·상관격용신운)이 표에만 있고
  //   아무도 안 불러서 한 번도 안 걸리는 죽은 규칙이었다. (교훈 BA 의 짝)
  const ys = n.dayStem && n.dayStem !== '?' ? calcYongsinNew(saju, n.dayStem) : null

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

  // ══════════════════════════════════════════════════════════
  //  원본 195쪽 — 죽어 있던 규칙 셋을 살린다 (2026-07-27)
  // ══════════════════════════════════════════════════════════
  if (ys) {
    // ① 조후 해결 — 「여름생과 겨울생이 조후가 해결되는 운에 유리합니다」
    //    겨울생(亥子丑月)은 火, 여름생(巳午未月)은 水 가 필요하다.
    //    그 오행이 그해 간지(천간·지지 어느 쪽이든)로 오면 온도가 채워진다.
    //    ⚠️ 봄·가을생은 교재가 아예 대상에서 뺐다. johu.element 가 null 이라 자연히 빠진다.
    if (ys.johu.element) {
      const need = ys.johu.element
      if (STEM_EL_[yStem] === need || BRANCH_EL_[yBranch] === need) add('조후해결')
    }

    // ② 기신 간합 — 「천간에 기신을 세운에서 무계합이나 을경합 등으로 간합을 하면 유리」
    //    원국 천간(일간 뺀 셋) 가운데 기신 오행인 글자가
    //    그해 천간과 천간합을 이루면, 거슬리던 기운이 묶인다.
    //    교재가 든 보기는 戊癸·乙庚 둘이지만 "등" 이라 했으니 다섯 쌍 모두 본다.
    const gisin = ys.eokbu.gisin
    for (const p of saju) {
      if (p.pillar === '일주') continue
      const c = p.stem
      if (!c || c === '?') continue
      if (STEM_EL_[c] === gisin && isCheonganHap(c, yStem)) { add('기신간합'); break }
    }

    // ③ 상관격 용신운 — 「목화상관이나 금수상관 사주는 두뇌 총명하고 임기응변에 능하여
    //                     용신운이면 대부분 합격합니다」
    //    ⚠️ 교재가 든 것은 목화상관(木일간+火상관)·금수상관(金일간+水상관) 둘이다.
    //       격국이 상관격이면서 그 짜임일 때만 본다.
    //    ⚠️ gyeokguk.element 는 그 격의 "용신" 오행이지 상관 오행이 아니다.
    //       상관 오행은 일간이 낳는 것(생하는 것) 가운데 음양이 다른 쪽이다.
    //       목 일간 → 상관은 화 · 금 일간 → 상관은 수. 그래서 일간만 보면 된다.
    if (ys.gyeokguk.name.includes('상관격')) {
      const dayEl = ys.dayElement
      const mokhwa = dayEl === '목'   // 목 일간의 상관은 화 → 목화상관
      const geumsu = dayEl === '금'   // 금 일간의 상관은 수 → 금수상관
      if (mokhwa || geumsu) {
        const yong = ys.eokbu.yongsin
        if (STEM_EL_[yStem] === yong || BRANCH_EL_[yBranch] === yong) add('상관격용신운')
      }
    }
  }

  // ★관성·인성이 합과 충을 동시에 받는가 — 원본 195쪽
  //   「인성과 관성이 합과 충이 동시에 작용하면 합격 가능합니다」
  //   한쪽은 묶이고 한쪽은 부딪히는, 엇갈리는 자리다. 교재는 여기에 가능성을 열어 뒀다.
  {
    const gwanIn = [...n.gwanChars, ...n.inChars]
    if (gwanIn.length) {
      const haped = hapedBy(gwanIn, yStem, yBranch)
      const chunged = hyeongChungedBy(gwanIn, yStem, yBranch)
      if (haped && chunged) add('관인합충동시')
    }
  }

  // ★관성이 12운성으로 관대(冠帶)에 드는가 — 원본 195쪽
  //   OCR 이 「상관대지」 로 깨뜨려 오래 빠져 있던 자리다. (CONFLICT ②)
  //   그해 지지를 일간 기준 12운성으로 보아, 관성 자리가 관대면 힘이 실린다.
  if (n.dayStem && (both.includes('정관') || both.includes('편관'))) {
    if (getUnsung(n.dayStem, yBranch) === '관대') add('관성관대')
  }

  // ── 불리 ──────────────────────────────────────────────────
  // ★상관정관 — 교재가 가장 불리하다고 한 자리
  if (both.includes('상관') && (both.includes('정관') || n.gwanChars.length > 0)) add('상관정관')
  if (ilganGwanChung(n, yStem)) add('일간관성충')
  if (cheongeukJichung(n, yStem, yBranch)) add('일주천극지충')
  // ★2026-07-27 — 교재는 "형충(刑沖)" 이라 했는데 충만 보고 있었다. 형을 함께 본다.
  if (n.gwanChars.length && hyeongChungedBy(n.gwanChars, yStem, yBranch)) add('관인형충')
  if (n.inChars.length && hyeongChungedBy(n.inChars, yStem, yBranch)) add('관인형충')
  if (n.bigyeopChars.length && n.gwanChars.length && chungedBy(n.gwanChars, yStem, yBranch)) add('비겁관성충')
  if (both.includes('겁재')) add('겁재운')
  // 합거 — 기대던 인성·관성이 합에 묶여 자리를 비운다
  if (n.gwanChars.length && hapedBy(n.gwanChars, yStem, yBranch)) add('용신관인합거')
  if (n.inChars.length && hapedBy(n.inChars, yStem, yBranch)) add('용신관인합거')
  // 재극인 · 식상극관
  // ★재극인 — 원본 195쪽 「신약한 관살혼잡 사주에 인성이 재성에 의해 재극인을 당하거나」
  //   교재는 조건을 셋 붙였다. 전에는 "재성운 + 원국에 인성" 만 보고 앞의 둘을 빠뜨렸다.
  //     ① 신약할 것          ys.status 로 본다
  //     ② 관살혼잡일 것       정관·편관이 함께 있을 것
  //     ③ 재성이 인성을 극할 것
  //   ⚠️ 셋을 다 걸면 아주 드물어진다. 그래서 두 갈래로 나눈다.
  //      셋 다 맞으면 교재가 말한 그 자리(무게 그대로),
  //      ③만 맞으면 결은 같으나 약하므로 절반 무게로 본다.
  if (both.some(x => x === '정재' || x === '편재') && n.inChars.length) {
    const sinyak = ys ? (ys.status === '신약' || ys.status === '극신약') : false
    const gwansal = n.gwanChars.some(c => sipsinOfChar(n.dayStem, c) === '정관')
      && n.gwanChars.some(c => sipsinOfChar(n.dayStem, c) === '편관')
    if (sinyak && gwansal) add('재극인')
    else add('재극인약')
  }
  if (both.some(s => s === '식신' || s === '상관') && n.gwanChars.length) add('식상극관')

  // 공망
  if (n.dayStem && n.dayBranch && n.dayStem !== '?' && n.dayBranch !== '?') {
    const gm = getGongmang(n.dayStem, n.dayBranch)
    if (gm.includes(yBranch)) add('공망')
  }

  // ── 시험과 무관하지만 알려 주는 것 ──────────────────────────
  if (makesSamhyeong(n.branches, yBranch)) add('삼형살')

  // ★고른 시험에 맞는 십신이 드는 해 — 교재 230쪽
  //   손님이 "어학 시험" 을 골랐으면 편인이 드는 해에, "로스쿨" 이면 정관이 드는 해에 힘이 실린다.
  //   안 골랐으면(examKind 없음) 이 줄은 걸리지 않는다.
  if (examKind) {
    const k = examKindOf(examKind)
    if (k && k.sipsins.length && both.some(x => (k.sipsins as string[]).includes(x))) {
      hits.push({
        key: '고른시험십신',
        say: `${k.label} 쪽으로 힘이 실리는 해입니다.`,
        weight: 2, src: k.src || '교재 230쪽',
      })
    }
  }

  // ★보러 온 것에 따라 힘을 더 싣는다 (원본 195쪽)
  if (purpose) {
    const pb = PURPOSE_BONUS[purpose]
    if (both.some(x => (pb.sipsins as string[]).includes(x))) {
      hits.push({ key: purpose === 'exam' ? '합격은 인성' : '취업은 관성',
        say: pb.say, weight: pb.bonus, src: '교재 195쪽' })
    }
  }

  const score = hits.reduce((s, h) => s + h.weight, 0)
  return {
    year, stem: yStem, branch: yBranch, ganSipsin, jiSipsin,
    score, seyunScore: score, hits, grade: gradeOf(score),
  }
}

/**
 * ★대운 30 : 세운 70 을 섞는다. (2026-07-27)
 *
 * [무엇이 문제였나]
 *   DAYUN_WEIGHT·SEYUN_WEIGHT 를 선언만 해 두고 아무도 안 썼다.
 *   그래서 지금까지 **세운 100%** 로만 채점하고 있었다.
 *   교재는 "대운 30%, 세운 70%" 라고 못 박았다(작업지시 4장 · CONFLICT ①).
 *
 * [어떻게]
 *   대운 간지에도 같은 규칙을 돌려 점수를 낸 뒤 무게를 실어 더한다.
 *   대운은 열 해 내내 같으므로 그 사이 해들의 바닥값 노릇을 한다.
 *
 * ⚠️ 대운을 안 넘기면 세운만으로 매긴다. 화면이 /api/dayun 을 못 받았을 때다.
 *    그때 등급이 달라지므로, 대운을 받은 뒤 다시 매기는 것이 맞다.
 */
export function blendWithDayun(
  seyun: YearLuck,
  dayunScore: number | null,
  dayunGanji?: string,
): YearLuck {
  if (dayunScore == null) return seyun
  const mixed = seyun.score * SEYUN_WEIGHT + dayunScore * DAYUN_WEIGHT
  const score = Math.round(mixed * 10) / 10
  return { ...seyun, score, dayunScore, dayunGanji, grade: gradeOf(score) }
}

/** 올해부터 span 해를 판정한다 (기본 3년 — 대표님 지시 2026-07-27) */
/**
 * 올해부터 span 해.
 * @param dayunList 대운 목록. 넘기면 그해에 흐르던 대운을 찾아 30% 를 섞는다.
 *                  안 넘기면 세운 100% 로 매긴다(예전 동작).
 */
export function judgeYears(
  input: ExamInput, thisYear: number, dayunList?: DayunLike[],
  /** 시험을 보러 왔나, 일자리를 보러 왔나 (원본 195쪽) */
  purpose?: 'exam' | 'job',
): YearLuck[] {
  const examKind = input.examKind ?? null
  const span = input.span ?? 3
  const day = input.saju.find(p => p.pillar === '일주')
  const dayStem = day?.stem ?? ''
  if (!dayStem || dayStem === '?') return []

  // 대운 점수는 대운마다 한 번만 낸다 (열 해가 같은 간지를 쓴다)
  const dayunScoreCache = new Map<string, number>()
  const scoreOfDayun = (gz: string) => {
    const hit = dayunScoreCache.get(gz)
    if (hit != null) return hit
    const v = judgeYear(input.saju, 0, gz[0], gz[1]).score
    dayunScoreCache.set(gz, v)
    return v
  }

  const all = calcSeyunList(dayStem, thisYear)
  return all
    .filter(s => s.year >= thisYear && s.year < thisYear + span)
    .map(s => {
      const base = judgeYear(input.saju, s.year, s.cheongan, s.jiji, purpose, examKind)
      if (!dayunList?.length) return base
      // 그해에 몇 살이었나 → 그때 흐르던 대운
      const ageThatYear = s.year - input.birthYear
      const d = pickCurrentDayun(dayunList, ageThatYear)
      if (!d) return base
      const gz = `${d.cheongan}${d.jiji}`
      return blendWithDayun(base, scoreOfDayun(gz), gz)
    })
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
