// lib/saju/namingSession.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  작명 «대상» 을 Step 2 → 3 → 4 까지 잃지 않고 나르는 자리          │
// └───────────────────────────────────────────────────────────────┘
//
// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부) — 대표님 승인 ①②③④
//
//  [무엇이 있었나]  네 가지가 «각각» 끊겨 있었습니다.
//
//    ① 신생아가 Step 2 에서 막혔습니다
//       newname 이 「저장된 이름(chars)」 이 없으면 화면을 통째로 막았습니다.
//       ⚠️ 작명은 «아직 이름이 없는» 손님이 오는 곳입니다. 막으면 안 됩니다.
//
//    ② 그래서 URL 성씨가 «한 번도» 쓰이지 않았습니다
//       surnameHangul = chars.join('') || surnameFromUrl 이었는데
//       chars 가 있으면 앞이 이기고, 없으면 ①에서 이미 막혔습니다. 죽은 코드였습니다.
//
//    ③ kind(개명·신생아)가 newhanja 에서 끊겼습니다
//       newname 이 URL 로 실어 보냈지만 newhanja 가 «읽지도 넘기지도» 않았고,
//       newresult 는 badge 도 저장도 '개명' 붙박이였습니다.
//       → 「신생아」 배지는 «생길 길이 없었습니다».
//
//    ④ 남의 사주가 Step 3 부터 «내 사주» 로 바뀌었습니다
//       newhanja·newresult 가 localStorage myinfo(내 것)만 읽었습니다.
//       보관함에서 가족을 고르면 추천 이름은 그 아이 사주로,
//       한자는 «내» 사주로 골라졌습니다. 가장 무거운 자리였습니다.
//
//  [고친 방법 — 한 곳에 모읍니다]
//    ★URL 이 «정본» 이고 이 세션은 «부본» 입니다.
//      · 화면끼리 넘길 때는 URL 로 넘깁니다 (새로고침·뒤로가기에도 남습니다)
//      · 손님이 결과 화면을 «북마크로 다시 열거나» 결제 팝업을 돌아 나오면
//        URL 이 비는 자리가 있어, 그때 이 세션이 받쳐 줍니다.
//
//    ⚠️ 교훈 [폴백] — «부본이 정본을 죽이면 안 됩니다».
//       그래서 resolveNamingTarget 은 URL → 세션 → null 순서로만 봅니다.
//       셋 다 없으면 «옛 길»(myinfo/my_names)이 그대로 돕니다.
//       ★기존 개명 손님의 화면은 한 글자도 달라지지 않습니다.
//
//  ⚠️ 이 파일은 «나르는 일» 만 합니다. 판정·점수를 여기 넣지 마십시오. (교훈 CJ)
// ══════════════════════════════════════════════════════════════════

/** 작명의 두 갈래. ⚠️ '풀이' 는 여기 오지 않습니다 — 그건 감정 화면의 일입니다 */
export type NamingKindLite = '개명' | '신생아'

export interface NamingTarget {
  /** 개명 = 이름이 이미 있음 · 신생아 = 아직 없음 */
  kind: NamingKindLite

  /** 한글 성씨 (한 글자, 복성이면 두 글자) — ★작명에 «반드시» 있어야 합니다 */
  surnameHangul: string
  /**
   * 한자 성씨. ★신생아는 «없습니다»(null).
   *
   * ⚠️ 없다고 비워 두면 안 됩니다 — 수리 4격은 성씨 획수로 시작하고
   *    자원오행은 성씨 오행부터 흐릅니다. 그래서 Step 3 에서 «성씨 한자부터»
   *    고르게 합니다. newhanja 의 pickSurname 을 보십시오.
   */
  surnameHanja: string | null

  // ── 이 사람의 사주 (④가 새던 자리) ──
  calType: string
  year: number
  month: number
  day: number
  leapMonth: string
  /** 0~11. 모르면 null */
  hourIdx: number | null
  gender: string | null

  // ── 누구인가 — 보관함 배지·저장에 씁니다 ──
  relation: string | null
  /** 「류 첫째」 같은 태명·호칭 */
  personTitle: string | null

  // ── 교재 «밖» 취향 — ⚠️ 길흉 판정에 쓰지 마십시오 ──
  style: string | null
  prefer: string | null
  avoid: string | null
}

export const NAMING_TARGET_KEY = 'naming_target_v1'

/** URL·세션에서 나르는 열쇠들. ★한 곳에만 적습니다 (빠뜨림 방지) */
export const NAMING_QUERY_KEYS = [
  'kind', 'surname', 'surnameHanja',
  'calType', 'year', 'month', 'day', 'leapMonth', 'hour', 'gender',
  'relation', 'who', 'name', 'style', 'prefer', 'avoid',
] as const

type Getter = (k: string) => string | null | undefined

function num(v: string | null | undefined): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

/** 사주가 «실제로» 담겼는가. 연도가 없으면 계산이 안 됩니다 */
export function hasSaju(t: Partial<NamingTarget> | null): boolean {
  return !!t && Number.isFinite(t.year) && (t.year ?? 0) > 1800
}

/**
 * URL 에서 작명 대상을 읽습니다. ★정본입니다.
 *
 * ⚠️ 성씨가 없으면 null 을 돌려줍니다 — 「반쯤 담긴 대상」을 만들지 않습니다.
 *    반쯤 담긴 것을 넘기면 Step 3 에서 «어느 쪽이 맞는지» 알 수 없게 됩니다.
 */
export function readNamingTargetFromQuery(get: Getter): NamingTarget | null {
  const sur = (get('surname') || '').trim().slice(0, 2)
  if (!sur) return null

  const hourRaw = get('hour')
  const kindRaw = get('kind')

  return {
    kind: kindRaw === '신생아' ? '신생아' : kindRaw === '개명' ? '개명' : '개명',
    surnameHangul: sur,
    surnameHanja: (get('surnameHanja') || '').trim() || null,
    calType: get('calType') || '양력',
    year: num(get('year')),
    month: num(get('month')) || 1,
    day: num(get('day')) || 1,
    leapMonth: get('leapMonth') || '0',
    hourIdx: hourRaw && hourRaw !== '모름' ? num(hourRaw) : null,
    gender: get('gender') || null,
    relation: get('relation') || null,
    // ⚠️ 「누구인가」는 who 로 씁니다.
    //    ★name 은 «지금 짓는 이름» 이 이미 쓰고 있는 열쇠입니다 (newhanja?name=서연).
    //      같은 열쇠를 쓰면 URL 에 name 이 둘이 되어 어느 쪽이 이길지 모르게 됩니다.
    //      보관함이 옛 방식으로 name 을 보낼 때만 받쳐 읽습니다.
    personTitle: get('who') || get('name') || null,
    style: get('style') || null,
    prefer: get('prefer') || null,
    avoid: get('avoid') || null,
  }
}

/** 대상을 URL 조각으로. ★Step 사이는 이것으로 넘깁니다 */
export function namingTargetQuery(t: NamingTarget): string {
  const q = new URLSearchParams()
  q.set('kind', t.kind)
  q.set('surname', t.surnameHangul)
  if (t.surnameHanja) q.set('surnameHanja', t.surnameHanja)
  if (t.year > 1800) {
    q.set('calType', t.calType)
    q.set('year', String(t.year))
    q.set('month', String(t.month))
    q.set('day', String(t.day))
    q.set('leapMonth', t.leapMonth)
    if (t.hourIdx != null) q.set('hour', String(t.hourIdx))
    if (t.gender) q.set('gender', t.gender)
  }
  if (t.relation) q.set('relation', t.relation)
  if (t.personTitle) q.set('who', t.personTitle)
  if (t.style) q.set('style', t.style)
  if (t.prefer) q.set('prefer', t.prefer)
  if (t.avoid) q.set('avoid', t.avoid)
  return q.toString()
}

/** 세션에 남깁니다 (부본). ⚠️ 실패해도 «조용히» 넘어갑니다 — 정본은 URL 입니다 */
export function saveNamingTarget(t: NamingTarget): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(NAMING_TARGET_KEY, JSON.stringify(t))
  } catch { /* 사파리 프라이빗 모드 등 — 막지 않습니다 */ }
}

/** 세션에서 읽습니다 (부본) */
export function loadNamingTarget(): NamingTarget | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(NAMING_TARGET_KEY)
    if (!raw) return null
    const t = JSON.parse(raw) as NamingTarget
    if (!t || typeof t.surnameHangul !== 'string' || !t.surnameHangul) return null
    return {
      ...t,
      kind: t.kind === '신생아' ? '신생아' : '개명',
      surnameHanja: t.surnameHanja || null,
    }
  } catch { return null }
}

export function clearNamingTarget(): void {
  if (typeof window === 'undefined') return
  try { localStorage.removeItem(NAMING_TARGET_KEY) } catch { /* 막지 않습니다 */ }
}

/**
 * ★URL → 세션 순서로 찾습니다. 둘 다 없으면 null.
 *
 * ⚠️ null 이면 «옛 길»(myinfo / my_names)로 가야 합니다.
 *    여기서 myinfo 를 읽지 않는 까닭 — 그러면 이 파일이 «내 사주» 를 알게 되고,
 *    ④번(남의 사주가 내 것으로 바뀌던 결함)이 이 안으로 숨어 들어옵니다.
 *    부르는 쪽이 «대상이 없다» 는 것을 알아야 옛 길로 갈지 정할 수 있습니다.
 */
export function resolveNamingTarget(get: Getter): NamingTarget | null {
  return readNamingTargetFromQuery(get) ?? loadNamingTarget()
}

/**
 * 이름 글자(chars)에서 kind 를 «가늠» 합니다.
 *   chars 있음 → 개명   (이름이 이미 있습니다)
 *   chars 없음 → 신생아 (아직 없습니다)
 *
 * ⚠️ URL 의 kind 가 «먼저» 입니다. 이건 URL 이 없을 때만 씁니다.
 */
export function guessKind(hasChars: boolean): NamingKindLite {
  return hasChars ? '개명' : '신생아'
}
