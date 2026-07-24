// app/manseryeok/moving-timing/lib/movingFilterV1.ts
//
// ★ 이사택일 v1 — 점수제를 쓰지 않는다. 필터로 거르고 본인이 고른다.
//   (출산택일 v7 · 결혼택일 v7 과 같은 원칙. 2026-07-24 확정)
//
//   [왜 점수제가 아닌가]
//   출산택일은 년월 4글자가 예정일로 고정돼 우열을 못 매겼고,
//   결혼택일은 '길신 몇 개가 겹쳤나'로 순위를 정하는 근거가 약했다.
//   이사택일은 후자에 가깝다. 손·공망·충·형은 '걸리냐 아니냐'지
//   '몇 점이냐'가 아니다. → 점수·순위·등급·별점을 만들지 않는다.
//
//   [근거 자료]
//   · 교재 『결혼, 택일 잡는 방법』 231쪽 5번 — "이사는 명의자 사주로"
//   · 손(損) 방위 순환 — 제미나이 조회(『천기대요』·『택일통해』 인용)
//     ⚠️ 교재 원문 미확인. 연재쌤 검수 대상.
//
//   [구조]
//   고정 4 : 서비스가 항상 적용. 끌 수 없다.
//            명절 / 공망 / 충 / 형
//   선택 2 : 본인이 켜고 끈다.
//            손 없는 날 / 가는 방향에 손 없는 날
//
//   [판정 대상]
//   · 공동명의 — 두 사람 합집합(한 사람이라도 걸리면 배제)
//   · 단독명의 — 고른 한 사람만
//
//   ★합집합인 이유: 결혼택일에서 교집합으로 잡았더니 두 사람 공망이
//     겹치는 커플에서만 작동해 6쌍 중 5쌍에서 필터가 죽었다(실측).
//
//   [공망 범위]
//   일진만 본다. 세운(그 해 간지)은 적용하지 않는다.
//   → 세운을 넣으면 세운지가 공망인 사람은 그 해 전체가 0일이 된다.
//     실측: 2027 세운 丁未, 丙戌일 공망 午未 → 未 정면 충돌로 365일 전멸.

import {
  STEM_EL, BRANCH_EL, BRANCHES,
  isChung, hyeongOf, gongmangBranches,
  sonDirection, isSonEomneunNal,
  type Direction,
} from './movingTables'

/** 한 사람의 판정 입력 */
export interface PersonSaju {
  dayStem: string       // 일간
  dayBranch: string     // 일지
  ganji: string         // 일주 60갑자
  yongsin: string       // 억부용신 오행 (표시용)
  status: string        // 신강/중화/신약/극신약
  monthBranch: string   // 월지
  /** 명식 8글자 (시→일→월→연). CoupleWonguk 이 그대로 그린다. */
  pillars: { pillar: string; stem: string; branch: string }[]
  birthLabel: string    // '양력 1997.6.13 申시'
  name: string          // 화면 표시 이름
  role: '계약자' | '배우자'
}

/** 후보 하루 */
export interface DayInput {
  y: number; m: number; d: number
  dateKey: string        // 'YYYYMMDD'
  weekday: string
  isWeekend: boolean
  isHoliday: boolean
  holidayName?: string
  isMyeongjeol: boolean
  dayStem: string
  dayBranch: string
  ganji: string
  /** 음력 일자 (1~30). 못 받으면 0 — 손 판정을 건너뛴다. */
  lunarDay: number
  lunarMonth: number
}

/** 판정 결과 */
export interface MovingFlags {
  // 고정 4
  fixMyeongjeol: boolean  // 설·추석 연휴가 아님
  fixGongmang: boolean    // 공망에 걸리지 않음
  fixChung: boolean       // 일지와 충이 아님
  fixHyeong: boolean      // 일지와 형이 아님
  // 선택 2
  optSonEomneun: boolean  // 손 없는 날 (음력 9·10·19·20·29·30)
  optDirection: boolean   // 가는 방향에 손이 없음
}

export interface MovingDetail extends MovingFlags {
  gongmangWho: string[]   // 걸린 사람 이름
  chungWho: string[]
  hyeongWho: string[]
  hyeongKind: string
  /** 그날 손이 머무는 방위. null 이면 손 없는 날 */
  sonDir: Direction | null
  /** 음력을 못 받았는가 — 화면에서 안내가 필요하다 */
  lunarUnknown: boolean
  passFixed: boolean
}

/** 명의 형태 */
export type OwnerMode = 'single' | 'joint'

/**
 * 하루를 판정한다. 점수를 매기지 않고 통과 여부만 본다.
 *
 * @param people 판정 대상. 공동명의면 2명, 단독명의면 1명.
 * @param direction 이사 가는 방향. 없으면 방향 판정을 건너뛴다.
 */
export function judgeDay(
  day: DayInput,
  people: PersonSaju[],
  direction: Direction | null,
): MovingDetail {
  const db = day.dayBranch

  // ── 공망 — 한 사람이라도 걸리면 배제 ──
  const gongmangWho: string[] = []
  for (const p of people) {
    if (gongmangBranches(p.ganji).includes(db)) gongmangWho.push(p.name)
  }

  // ── 충 — 이사일 일지 vs 사람 일지 ──
  const chungWho: string[] = []
  for (const p of people) {
    if (isChung(db, p.dayBranch)) chungWho.push(p.name)
  }

  // ── 형 — 삼형·상형·자형 ──
  const hyeongWho: string[] = []
  let hyeongKind = ''
  for (const p of people) {
    const h = hyeongOf(db, p.dayBranch)
    if (h) { hyeongWho.push(p.name); hyeongKind = hyeongKind || h }
  }

  // ── 손 — 음력으로만 판정한다 ──
  const lunarUnknown = !day.lunarDay || day.lunarDay < 1
  const sonDir = lunarUnknown ? null : sonDirection(day.lunarDay)
  const isSon = lunarUnknown ? false : isSonEomneunNal(day.lunarDay)

  // 방향 판정 — 손 없는 날은 어느 방향이든 통과한다.
  //   ★손이 하늘로 올라가 사방 어디에도 없기 때문. (제미나이 조회 4번)
  //   음력을 못 받으면 막지 않는다(통과 처리). 대신 화면이 안내한다.
  const dirOk = lunarUnknown ? true
    : direction === null ? true
    : sonDir === null || sonDir !== direction

  const flags: MovingFlags = {
    fixMyeongjeol: !day.isMyeongjeol,
    fixGongmang: gongmangWho.length === 0,
    fixChung: chungWho.length === 0,
    fixHyeong: hyeongWho.length === 0,
    optSonEomneun: isSon,
    optDirection: dirOk,
  }

  return {
    ...flags,
    gongmangWho, chungWho, hyeongWho, hyeongKind,
    sonDir, lunarUnknown,
    passFixed:
      flags.fixMyeongjeol && flags.fixGongmang && flags.fixChung && flags.fixHyeong,
  }
}

// ── 선택 필터 메타 (화면이 그대로 읽어 쓴다) ────────────────────────────
export type OptKey = 'optSonEomneun' | 'optDirection'

export const OPT_FILTERS: { key: OptKey; label: string; hanja: string; desc: string }[] = [
  { key: 'optSonEomneun', label: '손 없는 날', hanja: '損',
    desc: '음력 9·10·19·20·29·30일이에요. 어느 방향으로 가도 괜찮은 날이에요.' },
  { key: 'optDirection', label: '가는 방향에 손 없는 날', hanja: '方位',
    desc: '이사 가시는 쪽에 손이 없는 날이에요. 손 없는 날보다 고를 수 있는 날이 많아요.' },
]

export type OptState = Record<OptKey, boolean>

/** 기본값 — 둘 다 꺼 둔다. 켜면 후보가 크게 줄기 때문. */
export const DEFAULT_OPT: OptState = {
  optSonEomneun: false, optDirection: false,
}

/** 켜져 있는 선택 필터를 모두 만족하는가 */
export function passOpt(d: MovingFlags, on: OptState): boolean {
  return (Object.keys(on) as OptKey[]).every(k => !on[k] || d[k])
}

/** 고정 필터 칩 — 화면 상단 설명용 */
export const FIXED_CHIPS: { key: string; label: string; hanja: string }[] = [
  { key: 'fixMyeongjeol', label: '명절 아님', hanja: '名節' },
  { key: 'fixGongmang', label: '빈자리 아님', hanja: '空亡' },
  { key: 'fixChung', label: '부딪힘 없음', hanja: '沖' },
  { key: 'fixHyeong', label: '모남 없음', hanja: '刑' },
]

/** 진단 화면이 쓰는 6줄 (고정 4 + 선택 2) */
export const ALL_ROWS: { key: keyof MovingFlags; label: string; hanja: string; kind: 'fix' | 'opt' }[] = [
  { key: 'fixMyeongjeol', label: '명절 아님', hanja: '名節', kind: 'fix' },
  { key: 'fixGongmang', label: '빈자리 아님', hanja: '空亡', kind: 'fix' },
  { key: 'fixChung', label: '부딪힘 없음', hanja: '沖', kind: 'fix' },
  { key: 'fixHyeong', label: '모남 없음', hanja: '刑', kind: 'fix' },
  { key: 'optSonEomneun', label: '손 없는 날', hanja: '損', kind: 'opt' },
  { key: 'optDirection', label: '가는 방향에 손 없음', hanja: '方位', kind: 'opt' },
]

/** 용어 설명 모달 문안 */
export const HELP_TEXT: Record<string, { title: string; hanja: string; body: string }> = {
  fixMyeongjeol: {
    title: '명절 아님', hanja: '名節',
    body: '설·추석 연휴는 빼 드려요. 이삿짐 업체도 쉬고, 도로도 막히거든요.',
  },
  fixGongmang: {
    title: '빈자리 아님', hanja: '空亡',
    body: '공망은 기운이 비는 자리예요. 예로부터 이런 날엔 큰일을 시작하지 않았어요.\n' +
          '두 분 중 한 분이라도 걸리면 빼 드려요.',
  },
  fixChung: {
    title: '부딪힘 없음', hanja: '沖',
    body: '충은 두 기운이 정면으로 맞부딪히는 관계예요.\n' +
          '이사하시는 날이 두 분 일지와 부딪히지 않도록 골라요.',
  },
  fixHyeong: {
    title: '모남 없음', hanja: '刑',
    body: '형은 서로 어긋나고 다투는 관계예요.\n' +
          '삼형·상형·자형을 모두 봐요.',
  },
  optSonEomneun: {
    title: '손 없는 날', hanja: '損',
    body: "'손'은 방위를 돌아다니며 이사를 방해한다는 존재예요.\n" +
          '음력 9·10·19·20·29·30일에는 하늘로 올라가 어느 방위에도 없어요.\n' +
          '그래서 이 날들은 어느 쪽으로 가셔도 괜찮아요.',
  },
  optDirection: {
    title: '가는 방향에 손 없음', hanja: '方位',
    body: '손은 음력 날짜에 따라 자리를 옮겨요.\n' +
          '1·2일은 동쪽, 3·4일은 남쪽, 5·6일은 서쪽, 7·8일은 북쪽이에요.\n' +
          '가시는 쪽에만 손이 없으면 되니, 손 없는 날보다 고르실 수 있는 날이 훨씬 많아요.',
  },
}

void BRANCHES; void STEM_EL; void BRANCH_EL
