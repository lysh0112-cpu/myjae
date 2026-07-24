// app/manseryeok/wedding-timing/lib/weddingFilterV7.ts
//
// ★ 결혼택일 v7 — 점수제를 버리고 '필터 + 두 사람이 직접 고르기' 구조로 전환
//   (2026-07-24 확정)
//
//   [왜 바뀌었나]
//   옛 구조는 천을귀인30·용신30·손없는날20·천희홍란20 의 100점 채점이었다.
//   점수를 매기려면 "이 날이 저 날보다 몇 점 더 좋다"를 말할 수 있어야 하는데,
//   길신 몇 개가 겹쳤는지로 우열을 정하는 것은 근거가 약하다는 결론(대표님 판단).
//   출산택일 v7 이 같은 이유로 점수제를 버렸고, 결혼택일도 뒤따른다.
//   → 점수·순위·등급·별점을 만들지 않는다. 조건에 맞는 날을 추려 두 분이 고른다.
//
//   [근거 자료]
//   교재 『결혼, 택일 잡는 방법』 231쪽 5가지를 뼈대로 삼았다.
//     1) 空亡日은 택일하지 않는다      → 고정필터 (공망)
//     2) 沖과 刑일은 피해라             → 고정필터 (충 / 형)
//     3) 用神日로 택일한다              → 선택필터 (신부 용신일)
//     4) 남녀 用神日이 다르면 여자 사주 → 선택필터 기준을 신부로
//     5) 이사 명의자                    → 결혼택일 범위 밖
//
//   [구조]
//   고정 4개 : 서비스가 항상 적용. 두 분이 끌 수 없다.
//              명절 / 공망 / 충 / 형
//   선택 3개 : 두 분이 켜고 끈다.
//              예식하는 날(주말·공휴일) / 신부 용신일 / 두 분 모두 용신일
//
//   [판정 원칙]
//   · 공망·충·형은 모두 '한 사람이라도 걸리면 배제'(합집합).
//     교집합으로 잡으면 두 사람 공망이 겹치는 6쌍 중 1쌍에서만 작동해
//     나머지 커플에게는 필터가 죽는다. (실측 확인)
//   · 판정 대상은 '예식일 일지' 하나. 두 사람의 일지·일주와 견준다.
//   · 공용 엔진(yongsinNew)은 수정하지 않는다. 호출만 한다.
//
//   ⚠️ 세부 기준은 연재쌤 검수 대기 중.
//      · 자형(辰午酉亥)을 형에 포함할지
//      · 용신일 판정 범위 — 일간만인지, 일간·일지 둘 중 하나인지 (현재 후자)

import {
  STEM_EL, BRANCH_EL, BRANCHES,
  isChung, hyeongOf, gongmangBranches,
} from './weddingTables'

/** 한 사람의 채점 입력 (일주·일지·용신) */
export interface PersonSaju {
  dayStem: string       // 일간
  dayBranch: string     // 일지
  ganji: string         // 일주 60갑자
  yongsin: string       // 억부용신 오행
  status: string        // 신강/중화/신약/극신약
  monthBranch: string   // 월지 (계절 표시용)
  /**
   * 명식 8글자 (시→일→월→연). 화면에 원국표를 그릴 때 쓴다.
   * 시를 모르면 시주가 빠진 3칸만 들어온다 — CoupleWonguk 이 '?' 로 그린다.
   */
  pillars: { pillar: string; stem: string; branch: string }[]
  /** 표시용 생년월일 (예: '양력 1998.1.5 寅시') */
  birthLabel: string
  /** 화면에 띄울 이름. 없으면 호출부가 '신랑'·'신부'를 넣는다 */
  name: string
}

/** 후보 하루 */
export interface DayInput {
  y: number; m: number; d: number
  dateKey: string        // 'YYYYMMDD'
  weekday: string        // '토'
  isWeekend: boolean
  isHoliday: boolean
  holidayName?: string
  isMyeongjeol: boolean  // 설·추석 연휴
  dayStem: string
  dayBranch: string
  ganji: string
}

/** 판정 결과 — 화면과 해설이 함께 읽는다 */
export interface WeddingFlags {
  // 고정 4 (항상 적용)
  fixMyeongjeol: boolean  // 설·추석 연휴가 아님
  fixGongmang: boolean    // 두 사람 공망에 걸리지 않음
  fixChung: boolean       // 두 사람 일지와 충이 아님
  fixHyeong: boolean      // 두 사람 일지와 형이 아님
  // 선택 3 (두 분이 켜고 끔)
  optWeekend: boolean     // 주말 또는 공휴일
  optBride: boolean       // 신부 용신이 그날 간지에
  optBoth: boolean        // 신랑 용신까지 함께
}

export interface WeddingDetail extends WeddingFlags {
  /** 걸린 이유 — 진단 화면이 그대로 읽는다 */
  gongmangWho: string[]   // ['신부'] · ['신랑'] · 둘 다
  chungWho: string[]
  hyeongWho: string[]
  hyeongKind: string      // '삼형' | '상형' | '자형'
  brideHit: string        // 어느 글자가 신부 용신인가 ('乙 = 목')
  groomHit: string
  passFixed: boolean      // 고정 4개를 모두 통과했는가
}

/** 하루를 판정한다. 점수를 매기지 않고 통과 여부만 본다. */
export function judgeDay(day: DayInput, bride: PersonSaju, groom: PersonSaju): WeddingDetail {
  const db = day.dayBranch
  const ds = day.dayStem

  // ── 공망 — 한 사람이라도 걸리면 배제 ──
  const gmB = gongmangBranches(bride.ganji)
  const gmG = gongmangBranches(groom.ganji)
  const gongmangWho: string[] = []
  if (gmB.includes(db)) gongmangWho.push('신부')
  if (gmG.includes(db)) gongmangWho.push('신랑')

  // ── 충 — 예식일 일지 vs 두 사람 일지 ──
  const chungWho: string[] = []
  if (isChung(db, bride.dayBranch)) chungWho.push('신부')
  if (isChung(db, groom.dayBranch)) chungWho.push('신랑')

  // ── 형 — 삼형·상형·자형 ──
  const hyeongWho: string[] = []
  let hyeongKind = ''
  const hB = hyeongOf(db, bride.dayBranch)
  const hG = hyeongOf(db, groom.dayBranch)
  if (hB) { hyeongWho.push('신부'); hyeongKind = hB }
  if (hG) { hyeongWho.push('신랑'); hyeongKind = hyeongKind || hG }

  // ── 용신일 — 그날 간지(천간·지지)의 오행 집합으로 본다 ──
  //   ★판정 범위: 일간 '또는' 일지. 둘 중 하나만 맞아도 용신일로 인정한다.
  //     (교재 231쪽은 판정 범위를 명시하지 않았다. 옛 코드도 이 방식이었다.)
  const stemEl = STEM_EL[ds] ?? ''
  const branchEl = BRANCH_EL[db] ?? ''
  const dayEls = new Set([stemEl, branchEl].filter(Boolean))

  const brideOk = !!bride.yongsin && dayEls.has(bride.yongsin)
  const groomOk = !!groom.yongsin && dayEls.has(groom.yongsin)

  const hitText = (el: string) =>
    stemEl === el ? `${ds} = ${el}` : branchEl === el ? `${db} = ${el}` : ''

  const flags: WeddingFlags = {
    fixMyeongjeol: !day.isMyeongjeol,
    fixGongmang: gongmangWho.length === 0,
    fixChung: chungWho.length === 0,
    fixHyeong: hyeongWho.length === 0,
    optWeekend: day.isWeekend || day.isHoliday,
    optBride: brideOk,
    optBoth: brideOk && groomOk,
  }

  return {
    ...flags,
    gongmangWho, chungWho, hyeongWho, hyeongKind,
    brideHit: brideOk ? hitText(bride.yongsin) : '',
    groomHit: groomOk ? hitText(groom.yongsin) : '',
    passFixed:
      flags.fixMyeongjeol && flags.fixGongmang && flags.fixChung && flags.fixHyeong,
  }
}

// ── 선택 필터 메타 (화면이 그대로 읽어 쓴다) ────────────────────────────
export type OptKey = 'optWeekend' | 'optBride' | 'optBoth'

export const OPT_FILTERS: { key: OptKey; label: string; hanja: string; desc: string }[] = [
  { key: 'optWeekend', label: '예식하는 날', hanja: '週末',
    desc: '토·일요일과 공휴일만 봐요.' },
  { key: 'optBride', label: '신부에게 좋은 날', hanja: '用神日',
    desc: '신부에게 필요한 기운이 든 날이에요.' },
  { key: 'optBoth', label: '두 분 모두 좋은 날', hanja: '用神日',
    desc: '신랑·신부 두 분께 다 맞는 날이에요.' },
]

export type OptState = Record<OptKey, boolean>

/** 기본값 — 주말과 신부 용신일은 켜고, 둘 다는 꺼 둔다 */
export const DEFAULT_OPT: OptState = {
  optWeekend: true, optBride: true, optBoth: false,
}

/** 켜져 있는 선택 필터를 모두 만족하는가 */
export function passOpt(d: WeddingFlags, on: OptState): boolean {
  return (Object.keys(on) as OptKey[]).every(k => !on[k] || d[k])
}

/** 고정 필터 칩 — 화면 상단에 설명용으로 띄운다 */
export const FIXED_CHIPS: { key: string; label: string; hanja: string }[] = [
  { key: 'fixMyeongjeol', label: '명절 아님', hanja: '名節' },
  { key: 'fixGongmang', label: '빈자리 아님', hanja: '空亡' },
  { key: 'fixChung', label: '부딪힘 없음', hanja: '沖' },
  { key: 'fixHyeong', label: '모남 없음', hanja: '刑' },
]

/** 진단 화면이 쓰는 7줄 순서 (고정 4 + 선택 3) */
export const ALL_ROWS: { key: keyof WeddingFlags; label: string; hanja: string; kind: 'fix' | 'opt' }[] = [
  { key: 'optWeekend', label: '예식하는 날', hanja: '週末', kind: 'opt' },
  { key: 'fixMyeongjeol', label: '명절 아님', hanja: '名節', kind: 'fix' },
  { key: 'fixGongmang', label: '빈자리 아님', hanja: '空亡', kind: 'fix' },
  { key: 'fixChung', label: '부딪힘 없음', hanja: '沖', kind: 'fix' },
  { key: 'fixHyeong', label: '모남 없음', hanja: '刑', kind: 'fix' },
  { key: 'optBride', label: '신부에게 좋은 날', hanja: '用神日', kind: 'opt' },
  { key: 'optBoth', label: '신랑에게도 좋은 날', hanja: '用神日', kind: 'opt' },
]

void BRANCHES
