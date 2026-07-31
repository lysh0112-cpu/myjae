// lib/saju/lunarConvert.ts
//
// 음력 ↔ 양력 변환 — ★단일 창구
//
// ══════════════════════════════════════════════════════════════════
//  [왜 만들었나]  2026-07-31 (41부)
//
//   app/api/lunar/route.ts 가 KASI(공공데이터포털) API 에 «단일 의존» 했습니다.
//     · 키가 없으면            → 400 «Missing params» 로 서비스가 통째로 막힘
//     · 호출이 실패하면        → 500
//     · ★응답이 이상하면      → parseInt(NaN) 이 «조용히» 흘러갔습니다
//
//   절기(solarterm.ts)는 26부에 이미 계산 폴백을 깔았습니다.
//   음력만 남아 있었습니다.
//
//  [어떻게 고쳤나]  81수리표를 「교재 원본 / 작명왕 부본」으로 나눈 방식 그대로.
//
//     정본  KASI          — 그대로 씁니다
//     부본  lunar-javascript — KASI 가 안 될 때 «대신» 답합니다
//     ★대조  둘 다 성공하면 «값이 같은지» 재고, 어긋나면 기록에 남깁니다
//
//  ⚠️ 대조가 핵심입니다. 폴백이 «조용히 다른 답» 을 내면 아무도 모릅니다.
//     mismatch 가 쌓이면 어느 쪽이 틀린 것인지 살펴야 합니다.
//
//  [부본의 정확도]  2026-07-31 실측
//     korean-lunar-calendar · lunardate · lunar-javascript 세 가지를 대조했고
//     윤달 판정까지 서로 일치했습니다 (1995-10-02 → 음 1995-08-08 윤달).
//     ⚠️ 그래도 «부본» 입니다. KASI 를 이기지 않습니다.
// ══════════════════════════════════════════════════════════════════

import { Solar, Lunar } from 'lunar-javascript'

/** 이 값이 어디서 나왔는가 */
export type LunarSource = 'KASI' | 'FALLBACK_LUNAR_JS'

export interface SolarYmd { year: number; month: number; day: number }
export interface LunarYmd { year: number; month: number; day: number; isLeap: boolean }

export interface ConvertResult<T> {
  value: T | null
  /** ★어디서 나온 값인가 — 화면·기록에 남기십시오 */
  source: LunarSource
  /** 부본으로 넘어간 까닭. 정본으로 답했으면 null */
  reason: string | null
  /**
   * ★KASI 와 부본이 «어긋난» 자리. 둘 다 답했을 때만 채워집니다.
   * ⚠️ 값이 있으면 둘 중 하나가 틀린 것입니다. 조용히 넘기지 마십시오.
   */
  mismatch: string | null
}

/** KASI 호출 제한 시간(밀리초). 넘으면 부본으로 갑니다 */
export const KASI_TIMEOUT_MS = 3000

// ── 부본 (lunar-javascript) ────────────────────────────────────────
//  ⚠️ 이 라이브러리는 «윤달을 음수 월» 로 나타냅니다. 1995년 윤8월 = -8.
//     밖으로는 isLeap 로만 주고받습니다 — 음수 월이 새어 나가지 않게 합니다.

/** 부본 — 음력 → 양력 */
export function fallbackLunarToSolar(l: LunarYmd): SolarYmd | null {
  try {
    const m = l.isLeap ? -Math.abs(l.month) : Math.abs(l.month)
    const s = Lunar.fromYmd(l.year, m, l.day).getSolar()
    return { year: s.getYear(), month: s.getMonth(), day: s.getDay() }
  } catch {
    return null
  }
}

/** 부본 — 양력 → 음력 */
export function fallbackSolarToLunar(s: SolarYmd): LunarYmd | null {
  try {
    const l = Solar.fromYmd(s.year, s.month, s.day).getLunar()
    const m = l.getMonth()
    return { year: l.getYear(), month: Math.abs(m), day: l.getDay(), isLeap: m < 0 }
  } catch {
    return null
  }
}

// ── KASI ───────────────────────────────────────────────────────────

/** 제한 시간을 건 fetch. 넘으면 던집니다 */
async function fetchWithTimeout(url: string, ms = KASI_TIMEOUT_MS): Promise<string> {
  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), ms)
  try {
    const res = await fetch(url, { signal: ac.signal })
    if (!res.ok) throw new Error(`KASI ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

function tagOf(xml: string, tag: string): string {
  const m = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))
  return m ? m[1].trim() : ''
}

/**
 * ★KASI 응답을 «믿기 전에» 잽니다.
 * ⚠️ 옛 코드는 parseInt('') = NaN 을 그대로 흘렸습니다.
 *    NaN 이 날짜로 흘러가면 화면이 조용히 틀립니다.
 */
function intOf(xml: string, tag: string): number | null {
  const v = parseInt(tagOf(xml, tag), 10)
  return Number.isFinite(v) ? v : null
}

function validSolar(s: SolarYmd | null): boolean {
  return !!s && s.year >= 1000 && s.year <= 3000
    && s.month >= 1 && s.month <= 12 && s.day >= 1 && s.day <= 31
}
function validLunar(l: LunarYmd | null): boolean {
  return !!l && l.year >= 1000 && l.year <= 3000
    && l.month >= 1 && l.month <= 12 && l.day >= 1 && l.day <= 30
}

// ── 단일 창구 ──────────────────────────────────────────────────────

const KASI_BASE = 'https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService'
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * 음력 → 양력. KASI 를 먼저 부르고, 안 되면 부본으로 답합니다.
 *
 * @param apiKey 없거나 빈 문자열이면 «바로» 부본으로 갑니다 (400 으로 죽지 않습니다)
 */
export async function lunarToSolar(l: LunarYmd, apiKey: string): Promise<ConvertResult<SolarYmd>> {
  const backup = fallbackLunarToSolar(l)

  if (!apiKey) {
    return { value: backup, source: 'FALLBACK_LUNAR_JS', reason: 'KASI 키가 없습니다', mismatch: null }
  }
  try {
    const url = `${KASI_BASE}/getSolCalInfo`
      + `?lunYear=${l.year}&lunMonth=${pad(l.month)}&lunDay=${pad(l.day)}`
      + `&lunLeapmonth=${l.isLeap ? '윤' : ''}&ServiceKey=${apiKey}`
    const xml = await fetchWithTimeout(url)
    const y = intOf(xml, 'solYear'), m = intOf(xml, 'solMonth'), d = intOf(xml, 'solDay')
    const primary: SolarYmd | null = (y != null && m != null && d != null) ? { year: y, month: m, day: d } : null

    if (!validSolar(primary)) {
      return { value: backup, source: 'FALLBACK_LUNAR_JS', reason: 'KASI 응답을 읽을 수 없습니다', mismatch: null }
    }
    return {
      value: primary, source: 'KASI', reason: null,
      mismatch: compareSolar(primary!, backup),
    }
  } catch (e) {
    return {
      value: backup, source: 'FALLBACK_LUNAR_JS',
      reason: e instanceof Error && e.name === 'AbortError'
        ? `KASI 응답이 ${KASI_TIMEOUT_MS}ms 를 넘었습니다`
        : `KASI 호출 실패 — ${String(e).slice(0, 80)}`,
      mismatch: null,
    }
  }
}

/** 양력 → 음력. 같은 방식입니다 */
export async function solarToLunar(s: SolarYmd, apiKey: string): Promise<ConvertResult<LunarYmd>> {
  const backup = fallbackSolarToLunar(s)

  if (!apiKey) {
    return { value: backup, source: 'FALLBACK_LUNAR_JS', reason: 'KASI 키가 없습니다', mismatch: null }
  }
  try {
    const url = `${KASI_BASE}/getLunCalInfo`
      + `?solYear=${s.year}&solMonth=${pad(s.month)}&solDay=${pad(s.day)}&ServiceKey=${apiKey}`
    const xml = await fetchWithTimeout(url)
    const y = intOf(xml, 'lunYear'), m = intOf(xml, 'lunMonth'), d = intOf(xml, 'lunDay')
    // ⚠️ KASI 는 윤달을 «윤/평» 글자로 줍니다
    const leapTag = tagOf(xml, 'lunLeapmonth')
    const primary: LunarYmd | null = (y != null && m != null && d != null)
      ? { year: y, month: m, day: d, isLeap: leapTag === '윤' } : null

    if (!validLunar(primary)) {
      return { value: backup, source: 'FALLBACK_LUNAR_JS', reason: 'KASI 응답을 읽을 수 없습니다', mismatch: null }
    }
    return {
      value: primary, source: 'KASI', reason: null,
      mismatch: compareLunar(primary!, backup),
    }
  } catch (e) {
    return {
      value: backup, source: 'FALLBACK_LUNAR_JS',
      reason: e instanceof Error && e.name === 'AbortError'
        ? `KASI 응답이 ${KASI_TIMEOUT_MS}ms 를 넘었습니다`
        : `KASI 호출 실패 — ${String(e).slice(0, 80)}`,
      mismatch: null,
    }
  }
}

// ── 대조 ───────────────────────────────────────────────────────────
//  ★KASI 가 답했어도 부본을 «함께» 계산해 견줍니다.
//    비용은 밀리초 이하입니다. 어긋남을 놓치는 값이 훨씬 큽니다.

export function compareSolar(a: SolarYmd, b: SolarYmd | null): string | null {
  if (!b) return null
  if (a.year === b.year && a.month === b.month && a.day === b.day) return null
  return `KASI ${a.year}-${a.month}-${a.day} ↔ 부본 ${b.year}-${b.month}-${b.day}`
}

export function compareLunar(a: LunarYmd, b: LunarYmd | null): string | null {
  if (!b) return null
  if (a.year === b.year && a.month === b.month && a.day === b.day && a.isLeap === b.isLeap) return null
  const f = (x: LunarYmd) => `${x.year}-${x.month}-${x.day}${x.isLeap ? '(윤)' : ''}`
  return `KASI ${f(a)} ↔ 부본 ${f(b)}`
}
