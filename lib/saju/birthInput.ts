// lib/saju/birthInput.ts
// ============================================================================
//  생년월일시 입력 공용 재료 (1단계 — 데이터·헬퍼만. 화면 부품 아님)
//
//  ★ 왜 만들었나
//    시(時) 목록이 4곳에 따로 복사돼 있었고 서로 달랐다.
//      - lib/saju/myInfo.ts   30분법 · 공백없음   (기준)
//      - app/mypage-new       30분법 · 공백없음   (동일)
//      - app/manseryeok/expert 30분법 · 공백있음  ("子시 (23:30~01:30)")
//      - app/signup           정시법 · 공백있음   ("子시 (23:00~01:00)")  ★★
//    특히 회원가입만 정시법이라, 23:15 출생자가 子시를 골라 저장되는
//    (30분법 기준으로는 亥시여야 하는) 문제가 있었다.
//
//  ★ 이 파일의 방침
//    - 표준은 30분법 · 공백없음 (다수가 이미 이 형태 + 공용 myInfo.ts 기준)
//    - 옛 라벨(정시법·공백있음)도 인덱스로 변환해 준다 → 마이그레이션 불필요
//    - 기존 파일은 하나도 건드리지 않는다 (1단계는 추가만)
//
//  ★ 저장 형식은 기존과 동일 (바꾸지 않음)
//    DB에는 라벨이 아니라 인덱스 문자열 '0'~'11' 또는 '모름'이 들어간다.
//    따라서 이 파일을 쓰더라도 기존 데이터는 그대로 유효하다.
//
//  ※ 택일 화면(결혼·출산·이사)의 복수 날짜 입력은 대상이 아니다.
// ============================================================================

// ── 시각 기준 ────────────────────────────────────────────────────────────────
//  ★ 연재쌤 검수 대기 항목 ("시각 30분법 확정" — 인수인계서 9부).
//    만약 정시법으로 바뀌면 이 상수 하나만 false로 두면 전체가 따라 바뀐다.
const USE_HALF_HOUR = true

/** 12지지 (시 순서 = 인덱스 0~11) */
export const HOUR_BRANCHES = [
  '子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥',
] as const

/** 각 시의 시작 시각(분 단위, 0~1439). 子시는 전날 23:30에 시작해 자정을 넘는다. */
const HOUR_START_MIN: number[] = HOUR_BRANCHES.map((_, i) => {
  const base = 23 * 60 + (USE_HALF_HOUR ? 30 : 0)   // 子시 시작
  return (base + i * 120) % 1440
})

const pad = (n: number) => String(n).padStart(2, '0')
const fmt = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

/** '子시(23:30~01:30)' 형태의 표준 라벨 (공백 없음) */
export function hourLabelOf(idx: number): string {
  const s = HOUR_START_MIN[idx]
  const e = (s + 120) % 1440
  return `${HOUR_BRANCHES[idx]}시(${fmt(s)}~${fmt(e)})`
}

/** 표준 시 목록 — '모름' 포함 (기존 HOURS와 같은 자리 구성) */
export const HOURS_STD: string[] = [
  '모름',
  ...HOUR_BRANCHES.map((_, i) => hourLabelOf(i)),
]

/** 라벨 → 인덱스 (표준 라벨 기준) */
export const HOUR_INDEX_STD: Record<string, number> = Object.fromEntries(
  HOUR_BRANCHES.map((_, i) => [hourLabelOf(i), i]),
)

/** 인덱스('0'~'11') → 표준 라벨 */
export const INDEX_TO_HOUR_STD: Record<string, string> = Object.fromEntries(
  HOUR_BRANCHES.map((_, i) => [String(i), hourLabelOf(i)]),
)

// ── "모름" 판정 ──────────────────────────────────────────────────────────────
//  myInfo.ts의 isUnknownHour와 같은 기준. ('-1' 오염값까지 흡수)
export function isUnknownHour(h: unknown): boolean {
  return h === '모름' || h == null || h === '' || h === '-1'
}

// ── 라벨 정규화 ──────────────────────────────────────────────────────────────
/**
 * 어떤 형태의 시 라벨이든 인덱스(0~11)로 변환한다. 모르면 null.
 *
 *   받아들이는 것 (전부 같은 결과):
 *     '子시(23:30~01:30)'   표준
 *     '子시 (23:30~01:30)'  공백 있음      (expert 옛 라벨)
 *     '子시 (23:00~01:00)'  정시법         (signup 옛 라벨)
 *     '子시'                 지지만
 *     '子'                   글자만
 *     '0' / 0                이미 인덱스
 *     '모름' / '' / null / '-1'  → null
 *
 * 괄호 안 시각은 보지 않고 "지지 글자"로만 판정하므로,
 * 정시법·30분법 표기 차이에 영향받지 않는다.
 */
export function normalizeHourLabel(input: unknown): number | null {
  if (isUnknownHour(input)) return null

  // 이미 인덱스인 경우 (숫자 또는 '0'~'11')
  if (typeof input === 'number') {
    return Number.isInteger(input) && input >= 0 && input <= 11 ? input : null
  }
  const raw = String(input).trim()
  if (!raw) return null
  if (/^\d+$/.test(raw)) {
    const n = parseInt(raw, 10)
    return n >= 0 && n <= 11 ? n : null
  }

  // 라벨에서 지지 글자를 찾는다
  for (let i = 0; i < HOUR_BRANCHES.length; i++) {
    if (raw.includes(HOUR_BRANCHES[i])) return i
  }
  return null
}

/** 인덱스 → 저장값 문자열 ('0'~'11' 또는 '모름'). DB 저장 형식과 동일. */
export function toStoredHour(idx: number | null): string {
  return idx == null ? '모름' : String(idx)
}

// ── 시간대 4구획 ─────────────────────────────────────────────────────────────
/**
 * 시를 정확히 모르는 사람에게 먼저 묻는 큰 단위.
 *   12개 중 찍기(오차 최대 ±6시진)보다, 시간대를 고른 뒤
 *   3개 중 고르게 하면 오차가 ±1시진으로 줄어든다.
 *
 *   ⚠ 子시(23:30~01:30)는 자정을 넘으므로 '밤'의 마지막에 둔다.
 *     이 구간은 날짜가 바뀌어 일주까지 달라지므로 화면에서 안내가 필요하다.
 */
export interface TimeBand {
  key: 'dawn' | 'morning' | 'afternoon' | 'night'
  label: string
  range: string
  hours: number[]   // 시 인덱스 3개
  mid: number       // "잘 모르겠어요" 선택 시 쓸 가운데 시진
}

export const TIME_BANDS: TimeBand[] = [
  { key: 'dawn',      label: '새벽',   range: '1~7시',   hours: [1, 2, 3],   mid: 2 },
  { key: 'morning',   label: '아침낮', range: '7~13시',  hours: [4, 5, 6],   mid: 5 },
  { key: 'afternoon', label: '오후',   range: '13~19시', hours: [7, 8, 9],   mid: 8 },
  { key: 'night',     label: '밤',     range: '19~1시',  hours: [10, 11, 0], mid: 11 },
]

/** 시 인덱스가 속한 시간대 */
export function bandOfHour(idx: number): TimeBand | null {
  return TIME_BANDS.find(b => b.hours.includes(idx)) ?? null
}

/** 자정을 넘는 시인지 (子시만 해당 — 날짜가 바뀌므로 안내 필요) */
export function crossesMidnight(idx: number): boolean {
  return idx === 0
}

// ── 날짜 ─────────────────────────────────────────────────────────────────────
/** 월 목록 1~12 */
export const MONTHS: number[] = Array.from({ length: 12 }, (_, i) => i + 1)

/** 윤년 판정 (양력) */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/**
 * 그 달의 일수. 연도를 모르면(0/NaN) 2월은 29일까지 열어 둔다.
 *   ★ 기존 화면들은 항상 31일을 뿌려서 2월 31일도 고를 수 있었다.
 *     여기서는 실제 일수만 준다.
 *   ※ 음력은 달의 대소가 해마다 달라 여기서 판정하지 않는다.
 *     음력일 때는 daysInMonthSafe를 쓸 것.
 */
export function daysInMonth(year: number, month: number): number {
  if (!month || month < 1 || month > 12) return 31
  const D = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (month === 2) {
    if (!year || Number.isNaN(year)) return 29
    return isLeapYear(year) ? 29 : 28
  }
  return D[month - 1]
}

/** 달력 종류까지 고려한 일수. 음력은 30일까지 (윤달·평달 모두 최대 30일) */
export function daysInMonthSafe(year: number, month: number, calType: string): number {
  if (calType === '음력') return 30
  return daysInMonth(year, month)
}

/** 일 목록 (콤보박스용) */
export function dayOptions(year: number, month: number, calType = '양력'): number[] {
  const n = daysInMonthSafe(year, month, calType)
  return Array.from({ length: n }, (_, i) => i + 1)
}

/**
 * 월/연도를 바꿨을 때 기존에 고른 '일'이 범위를 벗어나면 잘라 준다.
 *   예: 3월 31일 → 2월로 변경 → 28(또는 29)로 내려감
 *   화면에서 setMonth 직후 이 함수로 day를 보정할 것.
 */
export function clampDay(day: string, year: number, month: number, calType = '양력'): string {
  if (!day) return ''
  const d = parseInt(day, 10)
  if (Number.isNaN(d)) return ''
  const max = daysInMonthSafe(year, month, calType)
  return String(Math.min(Math.max(d, 1), max))
}

/** 숫자만 남기고 자릿수 제한 (기존 화면들의 onlyNum과 동일 규칙) */
export function onlyNum(v: string, maxLen: number): string {
  return v.replace(/\D/g, '').slice(0, maxLen)
}

/** 생년월일이 유효한지 (양력 기준 실제 존재하는 날짜인지까지 확인) */
export function isValidBirthDate(
  year: string, month: string, day: string, calType = '양력',
): boolean {
  const y = parseInt(year, 10), m = parseInt(month, 10), d = parseInt(day, 10)
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return false
  if (String(year).length !== 4) return false
  if (y < 1900 || y > 2200) return false
  if (m < 1 || m > 12) return false
  if (d < 1) return false
  return d <= daysInMonthSafe(y, m, calType)
}
