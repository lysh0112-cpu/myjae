// app/manseryeok/birth-timing/lib/babyFilterV7.ts
//
// ★ 출산택일 v7 — 점수제를 버리고 '필터 + 부모 선택' 구조로 전환 (2026-07-23 확정)
//
//   [왜 바뀌었나]
//   사주 8글자 중 년주·월주 4글자는 예정일이 정해지면 이미 고정된다.
//   우리가 고를 수 있는 건 일주·시주 4글자뿐이다.
//   그 4글자로 100점 우열을 매기는 것은 근거가 없다는 결론(대표님 판단).
//   → 점수·순위를 만들지 않는다. 조건에 맞는 날을 추려 부모가 고르게 한다.
//
//   [구조]
//   고정 4개 : 서비스가 항상 적용. 부모가 끌 수 없다.
//   선택 5개 : 부모가 켜고 끈다. 켤 때마다 남는 날이 줄어든다.
//
//   [원칙]
//   · 공용 엔진(yongsinNew·gwiin)은 수정하지 않는다. 호출만 한다. (교훈 E)
//   · 우열 판정을 하지 않는다. 통과/탈락만 본다.
//   · 판정 범위는 '우리가 고를 수 있는 자리'로 한정한다.
//     년지·월지는 고정이라 그 둘 사이의 관계로 거르면 후보가 전멸한다.
//     (실측: 丙午년 庚子월 예정일에서 년-월 충을 보면 64개 → 0개)
//
//   ⚠️ 세부 기준은 연재쌤 검수 대기 중. docs/출산택일_필터_v7.md 참조.

import type { Candidate } from './candidates'
import { calcYongsinNew } from '@/lib/saju/yongsinNew'
import { getGwiinForBranch } from '@/lib/saju/gwiin'
import { toEnginePillars } from './engineAdapter'
import {
  STEM_EL, BRANCH_EL, GEN, OVERCOME,
  gwanElOf, isWonjin, hyeongOf, rootSeatsOf, countElements,
  SUMMER, WINTER,
} from './sajuTables'

// ── 상수 ────────────────────────────────────────────────────────────────
//   표는 전부 sajuTables.ts 로 모았다. 여기서 다시 정의하지 않는다.
//   (같은 표가 여러 파일에 복사돼 있으면 한 곳만 고쳤을 때 조용히 갈라진다)

// ── 대운 ────────────────────────────────────────────────────────────────
const STEMS = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
const BRANCHES = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

/** 대운 순행 여부 — 년간 음양 × 성별 (lib/saju/dayun.ts 와 동일 규칙) */
export function isForward(yearStem: string, gender: string): boolean {
  const yangYear = STEMS.indexOf(yearStem) % 2 === 0
  const male = gender === '남' || gender === 'male' || gender === '아들'
  return (yangYear && male) || (!yangYear && !male)
}

/** 월주에서 대운 간지 8개를 뽑는다. 대운 간지열은 월주에서만 정해진다. */
function daeunList(monthStem: string, monthBranch: string, forward: boolean) {
  const out: { stem: string; branch: string }[] = []
  let si = STEMS.indexOf(monthStem)
  let bi = BRANCHES.indexOf(monthBranch)
  for (let n = 1; n <= 8; n++) {
    si = forward ? (si + 1) % 10 : (si + 9) % 10
    bi = forward ? (bi + 1) % 12 : (bi + 11) % 12
    out.push({ stem: STEMS[si], branch: BRANCHES[bi] })
  }
  return out
}

// ── 판정 결과 ────────────────────────────────────────────────────────────
export interface FilterFlags {
  // 고정 4 (항상 적용)
  fixRoot: boolean       // 일간의 뿌리
  fixWonjin: boolean     // 일지-월지 원진 없음
  fixHyeong: boolean     // 일지-월지 형 없음
  fixSamePillar: boolean // 일주 ≠ 월주
  // 선택 5 (부모가 켜고 끔)
  optDaeun: boolean      // 20~60세 대운 지지에 용신이 옴
  optFiveEl: boolean     // 오행 다섯이 모두 있음
  optBalance: boolean    // 한 오행이 3개 이상으로 쏠리지 않음
  optFourRoot: boolean   // 신왕·관왕·식상왕·재왕 모두 뿌리
  optGwiin: boolean      // 천을귀인 1개 이상
}

export interface FilterDetail extends FilterFlags {
  /** 화면·해설이 함께 쓰는 판정 근거 */
  dayStem: string
  dayEl: string
  status: string                     // 신강/중화/신약/극신약
  eokbuEl: string                    // 억부용신
  johuEl: string | null              // 조후용신 (여름·겨울생만)
  seasonKind: '여름' | '겨울' | '봄가을'
  elementCount: Record<string, number>
  rootSeats: string[]
  gwanRoot: number
  siksangRoot: number
  jaeRoot: number
  gwiinSeats: string[]               // ['년','월','일','시'] 중
  daeun: { age: number; stem: string; branch: string }[]  // 20~60세 구간만
  passFixed: boolean                 // 고정 4개를 모두 통과했는가
}

export interface JudgeOptions {
  gender: string
  /** 대운 시작 나이. 절입일 기준으로 계산한 값을 넘긴다. 없으면 5로 가정. */
  daeunStartAge?: number
}

/**
 * 후보 하나를 판정한다. 점수를 매기지 않고 조건 통과 여부만 본다.
 */
export function judgeCandidate(c: Candidate, opts: JudgeOptions): FilterDetail {
  const branches = [c.year.branch, c.month.branch, c.day.branch, c.hour.branch]
  const stems = [c.year.stem, c.month.stem, c.day.stem, c.hour.stem]
  const dayEl = STEM_EL[c.day.stem] ?? ''

  // 공용 엔진 — 신강약·억부·조후
  const ys = calcYongsinNew(toEnginePillars(c) as never, c.day.stem) as {
    status?: string
    eokbu?: { yongsin?: string }
    johu?: { element?: string }
  } | null
  const status = ys?.status ?? ''
  const eokbuEl = ys?.eokbu?.yongsin ?? ''

  // 계절 — 월지 기준. 여름·겨울이면 조후를 함께 본다(연재쌤 확정).
  const isSummer = SUMMER.includes(c.month.branch)
  const isWinter = WINTER.includes(c.month.branch)
  const seasonKind: '여름' | '겨울' | '봄가을' = isSummer ? '여름' : isWinter ? '겨울' : '봄가을'
  const johuEl = (isSummer || isWinter) ? (ys?.johu?.element ?? null) : null

  // 오행 개수 — 드러난 8글자. 지장간은 세지 않는다.
  const elementCount = countElements(stems, branches)

  // 네 갈래 뿌리
  const seats = rootSeatsOf(dayEl, branches)
  const gwanRoot = rootSeatsOf(gwanElOf(dayEl), branches).length
  const siksangRoot = rootSeatsOf(GEN[dayEl], branches).length
  const jaeRoot = rootSeatsOf(OVERCOME[dayEl], branches).length

  // 천을귀인 — 공용 gwiin.ts 재사용
  const seatNames = ['년', '월', '일', '시']
  const gwiinSeats: string[] = []
  branches.forEach((b, i) => {
    if (getGwiinForBranch(c.day.stem, c.month.branch, b).includes('천을귀인')) {
      gwiinSeats.push(seatNames[i])
    }
  })

  // 대운 20~60세 구간
  const startAge = opts.daeunStartAge ?? 5
  const fwd = isForward(c.year.stem, opts.gender)
  const daeun = daeunList(c.month.stem, c.month.branch, fwd)
    .map((d, i) => ({ age: startAge + i * 10, ...d }))
    .filter(d => d.age + 10 > 20 && d.age < 60)

  // ★대운 판정: 지지에 와야 인정한다.
  //   연재쌤 "지지가 뿌리라 영향력이 크다" → 천간만 스치는 것은 보지 않는다.
  const johuComes = johuEl ? daeun.some(d => BRANCH_EL[d.branch] === johuEl) : true
  const eokbuComes = !!eokbuEl && daeun.some(d => BRANCH_EL[d.branch] === eokbuEl)

  const maxEl = Math.max(...Object.values(elementCount))

  const flags: FilterFlags = {
    fixRoot: seats.length > 0,
    fixWonjin: !isWonjin(c.month.branch, c.day.branch),
    fixHyeong: !hyeongOf(c.month.branch, c.day.branch),
    fixSamePillar: !(c.day.stem === c.month.stem && c.day.branch === c.month.branch),
    optDaeun: johuComes && eokbuComes,
    optFiveEl: Object.values(elementCount).every(v => v > 0),
    optBalance: maxEl < 3,
    optFourRoot: seats.length > 0 && gwanRoot > 0 && siksangRoot > 0 && jaeRoot > 0,
    optGwiin: gwiinSeats.length > 0,
  }

  return {
    ...flags,
    dayStem: c.day.stem,
    dayEl,
    status,
    eokbuEl,
    johuEl,
    seasonKind,
    elementCount,
    rootSeats: seats,
    gwanRoot,
    siksangRoot,
    jaeRoot,
    gwiinSeats,
    daeun,
    passFixed: flags.fixRoot && flags.fixWonjin && flags.fixHyeong && flags.fixSamePillar,
  }
}

// ── 선택 필터 메타 (화면이 그대로 읽어 쓴다) ──────────────────────────────
export type OptKey = 'optDaeun' | 'optFiveEl' | 'optBalance' | 'optFourRoot' | 'optGwiin'

export const OPT_FILTERS: { key: OptKey; label: string; desc: string }[] = [
  { key: 'optDaeun',    label: '인생 중반의 흐름',
    desc: '아이에게 필요한 기운이 20대에서 60대 사이에 찾아오는 날이에요.' },
  { key: 'optFiveEl',   label: '고루 갖춘 기운',
    desc: '나무·불·흙·쇠·물 다섯 기운이 하나도 빠짐없이 들어 있어요.' },
  { key: 'optBalance',  label: '한쪽으로 치우치지 않음',
    desc: '어느 한 기운이 지나치게 몰리지 않아요.' },
  { key: 'optFourRoot', label: '고르게 단단한 기운',
    desc: '아이 자신·일·재능·살림살이 네 갈래가 모두 뿌리를 두고 있어요.' },
  { key: 'optGwiin',    label: '나를 도와주는 귀인',
    desc: '예로부터 어려울 때 돕는 인연이 따른다고 본 자리가 들어와요.' },
]

export type OptState = Record<OptKey, boolean>
export const EMPTY_OPT: OptState = {
  optDaeun: false, optFiveEl: false, optBalance: false, optFourRoot: false, optGwiin: false,
}

/** 켜져 있는 선택 필터를 모두 만족하는가 */
export function passOpt(d: FilterFlags, on: OptState): boolean {
  return (Object.keys(on) as OptKey[]).every(k => !on[k] || d[k])
}
