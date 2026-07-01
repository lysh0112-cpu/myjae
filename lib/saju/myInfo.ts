// lib/saju/myInfo.ts
// ============================================================================
// 사주 입력값(info) 표준화 + personKey 단일 규칙 (공통 헬퍼)
// ----------------------------------------------------------------------------
// 왜 이 파일이 필요한가:
//   그동안 화면마다 info를 만드는 방식과 personKey 계산이 조금씩 달라서,
//   "시간 모름"인 사람이 개명에서 성씨를 못 찾는 버그가 있었다.
//   (홈은 '모름'을 '-1'로, personKey는 '모름'만 'x'로 처리 → 어긋남)
//   이 파일 하나로 규칙을 통일해, 어떤 화면이든 같은 personKey가 나오게 한다.
//
// 표준 info 형태:
//   { calType:'양력'|'음력', year, month, day: string,
//     leapMonth:'0'|'1', hour:'0'~'11'|'모름', gender:'남'|'여' }
//
// docs/사주계산_표준산식_정리.md 의 "7. personKey 표준 규격"과 동일.
// ============================================================================

export interface MyInfo {
  gender: string
  calType: string
  year: string
  month: string
  day: string
  leapMonth: string  // '0'=평달, '1'=윤달
  hour: string       // '0'~'11' 또는 '모름'
}

// useResultSaju 등 계산부에 넘길 때 쓰는 형태 (hourIdx: number|null)
export interface SajuInfo {
  gender: string
  calType: string
  year: number
  month: number
  day: number
  leapMonth: string
  hourIdx: number | null
}

// ── 홈/신생아 입력 화면과 동일한 시(時) 목록·매핑 (절대 변경 금지) ──
export const HOURS = [
  '모름', '子시(23~01)', '丑시(01~03)', '寅시(03~05)', '卯시(05~07)',
  '辰시(07~09)', '巳시(09~11)', '午시(11~13)', '未시(13~15)',
  '申시(15~17)', '酉시(17~19)', '戌시(19~21)', '亥시(21~23)',
]
export const HOUR_INDEX: Record<string, number> = {
  '子시(23~01)': 0, '丑시(01~03)': 1, '寅시(03~05)': 2, '卯시(05~07)': 3,
  '辰시(07~09)': 4, '巳시(09~11)': 5, '午시(11~13)': 6, '未시(13~15)': 7,
  '申시(15~17)': 8, '酉시(17~19)': 9, '戌시(19~21)': 10, '亥시(21~23)': 11,
}
export const INDEX_TO_HOUR: Record<string, string> = {
  '0': '子시(23~01)', '1': '丑시(01~03)', '2': '寅시(03~05)', '3': '卯시(05~07)',
  '4': '辰시(07~09)', '5': '巳시(09~11)', '6': '午시(11~13)', '7': '未시(13~15)',
  '8': '申시(15~17)', '9': '酉시(17~19)', '10': '戌시(19~21)', '11': '亥시(21~23)',
}

// ── "시간 모름" 판정 (단일 기준) ──
// 문자열 '모름', 빈값, null, 그리고 과거 오염값 '-1' 도 모두 "모름"으로 인정.
// (기존에 '-1'로 저장된 값이 남아 있어도 안전하게 흡수)
function isUnknownHour(h: unknown): boolean {
  return h === '모름' || h == null || h === '' || h === '-1'
}

// hour 문자열 → hourIdx(number|null)
export function hourToIdx(hour: string | null | undefined): number | null {
  if (isUnknownHour(hour)) return null
  const n = parseInt(String(hour))
  return Number.isNaN(n) ? null : n
}

// ============================================================================
// 표준 personKey — 유일한 규칙 (모든 화면이 이것만 사용)
//   [calType, year, month, day, leapMonth, hourToken, gender].join('|')
//   hourToken: 모름/null/'' → 'x', 그 외 숫자문자열
//   모든 필드 문자열로 정규화 (숫자/문자 혼용 금지)
// ============================================================================
export function personKey(info: MyInfo | null): string {
  if (!info || !info.year) return ''
  const hourToken = isUnknownHour(info.hour) ? 'x' : String(info.hour)
  return [
    String(info.calType || '양력'),
    String(info.year),
    String(info.month),
    String(info.day),
    String(info.leapMonth || '0'),
    hourToken,
    String(info.gender || '남'),
  ].join('|')
}

// SajuInfo(hourIdx 기반)에서 바로 personKey를 뽑고 싶을 때
export function personKeyFromSaju(info: SajuInfo | null): string {
  if (!info || !info.year) return ''
  const hourToken = info.hourIdx == null ? 'x' : String(info.hourIdx)
  return [
    String(info.calType || '양력'),
    String(info.year),
    String(info.month),
    String(info.day),
    String(info.leapMonth || '0'),
    hourToken,
    String(info.gender || '남'),
  ].join('|')
}

// ============================================================================
// 소스별 → 표준 MyInfo 변환기
// ============================================================================

// (A) profiles(DB) row → MyInfo
export function fromProfile(p: {
  birth_year?: number | null
  birth_month?: number | null
  birth_day?: number | null
  birth_hour?: string | null
  cal_type?: string | null
  gender?: string | null
  leap_month?: string | null
  saju_saved?: boolean | null
} | null): MyInfo | null {
  if (!p || !p.saju_saved || !p.birth_year) return null
  const hour = isUnknownHour(p.birth_hour) ? '모름' : String(p.birth_hour)
  return {
    gender: p.gender ?? '남',
    calType: p.cal_type ?? '양력',
    year: String(p.birth_year),
    month: String(p.birth_month ?? ''),
    day: String(p.birth_day ?? ''),
    leapMonth: p.leap_month != null ? String(p.leap_month) : '0',
    hour,
  }
}

// (B) URL 파라미터 → MyInfo (없으면 null)
export function fromUrl(sp: {
  get: (k: string) => string | null
}): MyInfo | null {
  const y = sp.get('year')
  if (!y || !parseInt(y)) return null
  const h = sp.get('hour')
  const hour = isUnknownHour(h) ? '모름' : String(h)
  return {
    gender: sp.get('gender') || '남',
    calType: sp.get('calType') || '양력',
    year: String(parseInt(y)),
    month: String(parseInt(sp.get('month') || '0')),
    day: String(parseInt(sp.get('day') || '0')),
    leapMonth: sp.get('leapMonth') || '0',
    hour,
  }
}

// (C) 저장된 myinfo(JSON 파싱 결과) → MyInfo (과거 '-1' 값도 흡수)
export function fromMyInfo(m: Record<string, unknown> | null): MyInfo | null {
  if (!m || !m.year) return null
  const h = m.hour
  const hour = isUnknownHour(h) ? '모름' : String(h)
  return {
    gender: (m.gender as string) || '남',
    calType: (m.calType as string) || '양력',
    year: String(m.year),
    month: String(m.month ?? ''),
    day: String(m.day ?? ''),
    leapMonth: (m.leapMonth as string) || '0',
    hour,
  }
}

// (D) 직접 입력(생년월일 문자열 + 시 라벨) → MyInfo
//     birthDate: 'YYYY-MM-DD', hourLabel: HOURS 중 하나 또는 '모름'/''
export function fromInputs(args: {
  gender: string
  calType: string
  birthDate: string
  hourLabel: string
  leap: boolean
}): MyInfo | null {
  const d = args.birthDate.split('-')
  const year = d[0] || ''
  if (!year) return null
  const month = d[1] ? String(parseInt(d[1])) : ''
  const day = d[2] ? String(parseInt(d[2])) : ''
  const hour = (args.hourLabel === '모름' || !args.hourLabel)
    ? '모름'
    : String(HOUR_INDEX[args.hourLabel] ?? '모름')
  return {
    gender: args.gender,
    calType: args.calType,
    year, month, day,
    leapMonth: args.leap ? '1' : '0',
    hour,
  }
}

// ── MyInfo → SajuInfo (계산부 useResultSaju 에 넘길 형태) ──
export function toSajuInfo(info: MyInfo | null): SajuInfo | null {
  if (!info) return null
  return {
    gender: info.gender,
    calType: info.calType,
    year: parseInt(info.year),
    month: parseInt(info.month),
    day: parseInt(info.day),
    leapMonth: info.leapMonth || '0',
    hourIdx: hourToIdx(info.hour),
  }
}

// ── MyInfo → myinfo 저장용 평범한 객체 (sessionStorage 등) ──
// hour는 표준대로 '모름' 또는 인덱스 문자열. ('-1' 쓰지 않음)
export function toMyInfoObject(info: MyInfo): Record<string, string> {
  return {
    gender: info.gender,
    calType: info.calType,
    year: info.year,
    month: info.month,
    day: info.day,
    leapMonth: info.leapMonth || '0',
    hour: isUnknownHour(info.hour) ? '모름' : String(info.hour),
  }
}
