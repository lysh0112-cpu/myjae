// lib/saju/surnameDb.ts
//
// ┌───────────────────────────────────────────────────────────────────┐
// │  성씨 한자 «읽기» — ★단일 창구 (2026-08-12 · 58부)                  │
// └───────────────────────────────────────────────────────────────────┘
//
//  ══ 🔴 왜 만들었나 ═══════════════════════════════════════════════
//    [대표님]  「성씨는 성씨 DB에서만 가지고 오도록 해야 해」
//              「예를 들어 이씨 고를 때 성씨인 이자만 나오면 되는데
//                엉뚱한 이자들이 모두 나와서 헷갈리게 한다는 것이지」
//
//    [무엇이 있었나]  56부는 이렇게 했습니다 —
//        ① hanja 표에서 .eq('hangul','이') 로 «그 소리 한자를 전부» 꺼내고
//        ② surnameAllowed.ts 로 «걸러냈습니다»
//      ⇒ 성씨 목록이 «뿌리» 가 아니라 ★«거르개» 였습니다.
//      🔴 그래서 성씨 목록에 «있어도» hanja 표에 그 소리 줄이 없으면
//         ★조용히 사라졌습니다 (56부의 辻·鴌 이 그랬습니다).
//
//    [이제]  ① ★surname_hanja 표가 «뿌리» — 보일 글자를 «이 표가» 정합니다
//            ② hanja 표는 ★«값만» — .in('hanja', 목록) 으로 «한자로» 찾습니다
//                                                    ↑ ★소리로 안 찾습니다
//
//  ══ ✅ 한자로 찾아서 덤으로 풀리는 것 — 두음법칙 ═══════════════════
//    같은 한자가 두 소리에 있습니다 —  劉 呂 李 林 柳 梁 羅  ★일곱
//        나 羅  不用(미확인)   ↔   라 羅  中吉(새 책)
//    ⇒ 소리로 찾으면 「나 羅」가 ★옛 값에 묶입니다.
//      ★한자로 찾으면 두 줄이 다 잡히고 pickBest 가 «좋은 줄» 을 고릅니다.
//
//  ══ ⛔⛔ 손대지 말 것 ═════════════════════════════════════════════
//    ⛔ ★돌려주는 줄의 hangul 은 «손님이 쓴 소리» 로 «덮어씁니다».
//       (「나」로 찾았는데 「라 羅」 줄이 왔어도 hangul 은 ★'나')
//       [왜]  ① 교재는 «표기음 그대로» 가 정답입니다 (dueum.ts 머리말).
//             ② 화면의 자물쇠가 row.hangul !== slot.hangul 이면 «거부» 합니다.
//             ③ 발음오행 판정이 slot.hangul 을 씁니다.
//       ⇒ 덮어쓰지 않으면 ★「나」로 쓴 손님이 「라」(火)로 판정됩니다.
//         화면은 «멀쩡히» 뜨고 값만 조용히 갈립니다. (48부 1-4 와 같은 모양)
//
//    ⛔ ★surname_hanja 의 ref_* 를 판정에 쓰지 마십시오 —
//       획수·자원오행의 정본은 ★hanja 표입니다. 두 벌이 되면 수리 4격이
//       화면마다 달라집니다. 이 파일도 ref_* 를 «한 번도 안 읽습니다».
//
//    ⛔ ★성씨 목록을 화면에 «다시 적지» 마십시오. 판단은 이 파일 «한 곳» 입니다.
//
//  ══ ⚠️ 표가 «없을 때» ════════════════════════════════════════════
//    표가 아직 없거나 읽기에 실패하면 ★예전 길(surnameAllowed.ts)로 내려갑니다.
//    ⇒ 배포 순서가 어긋나도 손님이 «막히지» 않습니다.
//    □ 표가 자리를 잡으면 그 되돌림과 코드 파일 둘을 걷어냅니다.
//      ⛔ ★지금 지우지 마십시오.

import { supabase } from '@/lib/supabase'
import {
  HANJA_SELECT, rowHanja, rowStrokes, type HanjaRow,
} from './hanjaRow'
import { surnameAllowedOf, isSurnameAllowed, shouldFilterSurname } from './surnameAllowed'
import { surnameRank } from './surnameHanja'

/** 성씨 한 줄 — 화면이 쓰는 모양 (값은 hanja 표에서 온 것) */
export interface SurnameChoice {
  row: HanjaRow
  /** 흔한 차례 — 작을수록 앞. 9999 는 «표에 없음»(뒤로 갈 뿐 막지 않습니다) */
  rank: number
}

/**
 * ★같은 한자에 줄이 여럿일 때 «어느 줄» 을 쓸 것인가.
 *
 *   ① source='새책' 인 줄을 «먼저»   — 2026-08-12 대조본이 가장 미덥습니다
 *   ② 그다음 획수가 «있는» 줄
 *
 * ⚠️ ★품격(不用)은 보지 «않습니다» — 성씨는 «타고나는 것» 이라
 *    「쓰지 마라」가 성립하지 않습니다 (43부 23차 · 대표님 지시).
 */
function pickBest(rows: HanjaRow[]): HanjaRow | null {
  if (rows.length === 0) return null
  const score = (r: HanjaRow) =>
    (r.source === '새책' ? 2 : 0) + (rowStrokes(r) > 0 ? 1 : 0)
  return [...rows].sort((a, b) => score(b) - score(a))[0]
}

/** 한자로 hanja 표를 읽어 «한자 → 한 줄» 로 추립니다 */
async function readValuesByHanja(hanjaList: string[]): Promise<Map<string, HanjaRow>> {
  const out = new Map<string, HanjaRow>()
  if (hanjaList.length === 0) return out

  const { data, error } = await supabase
    .from('hanja').select(HANJA_SELECT).in('hanja', hanjaList)
  if (error || !data) return out

  const byHanja = new Map<string, HanjaRow[]>()
  for (const r of data as HanjaRow[]) {
    const k = rowHanja(r)
    const arr = byHanja.get(k)
    if (arr) arr.push(r)
    else byHanja.set(k, [r])
  }
  for (const [k, rows] of byHanja) {
    const best = pickBest(rows)
    if (best) out.set(k, best)
  }
  return out
}

/**
 * ★그 소리의 «성씨 한자» 를 돌려줍니다.
 *
 * @param hangul     손님이 쓴 소리 (「이」)
 * @param extraHanja ★복성 카드가 못 뜰 때를 위한 «안전망» —
 *                   복성의 그 자리 글자를 넣어 주면 목록에 곁들입니다.
 *                   ⚠️ 57부 「못 찾으면 낱글자로 내려갑니다. ⛔ 막지 않습니다」
 *
 * @returns null 이면 ★「이 소리는 성씨 표에 없다」 는 뜻입니다.
 *          ⇒ 부르는 쪽이 «예전처럼» 그 소리 전체를 보여 주십시오.
 *             🔴 귀화하신 분·드문 본관이 그렇습니다. 막으면 그 집안이 못 넘어갑니다.
 *             ⚠️ 이것은 「0개면 전체를 보여 주는 되돌림」이 «아닙니다» —
 *                표에 «있는» 소리는 여기서 null 이 되지 않습니다.
 */
export async function fetchSurnameChoices(
  hangul: string,
  extraHanja: string[] = [],
): Promise<SurnameChoice[] | null> {
  const sori = (hangul ?? '').trim()
  if (!sori) return []

  // ── ① 성씨 표에서 «어느 글자인가» 를 받습니다 ──
  let listed: { hanja: string; rank: number }[] = []
  let tableAlive = true
  try {
    const { data, error } = await supabase
      .from('surname_hanja')
      .select('hanja, rank')
      .eq('hangul', sori)
      .order('rank', { ascending: true })
    if (error) tableAlive = false
    else listed = (data ?? []).map((d) => ({
      hanja: String(d.hanja ?? '').trim(),
      rank: typeof d.rank === 'number' ? d.rank : 9999,
    })).filter((d) => d.hanja)
  } catch {
    tableAlive = false
  }

  // ⚠️ 표가 없거나 못 읽었으면 ★예전 길로 내려갑니다 (아래 fallback).
  if (!tableAlive) return fallbackChoices(sori, extraHanja)

  // ★표에 그 «소리» 가 아예 없으면 null — 부르는 쪽이 전체를 보여 줍니다.
  if (listed.length === 0 && extraHanja.length === 0) return null

  for (const h of extraHanja) {
    const c = (h ?? '').trim()
    if (c && !listed.some((x) => x.hanja === c)) listed.push({ hanja: c, rank: 9998 })
  }

  // ── ② 값은 hanja 표에서 «한자로» 찾습니다 ──
  const values = await readValuesByHanja(listed.map((x) => x.hanja))

  // ⚠️ 안 보이지 않는 문자(BOM 등)로 «한자» 칸이 더러운 줄이 있을 수 있어
  //    못 찾은 것이 있으면 «그 소리» 로 한 번 더 훑어 건집니다.
  const missing = listed.filter((x) => !values.has(x.hanja))
  if (missing.length > 0) {
    try {
      const { data } = await supabase
        .from('hanja').select(HANJA_SELECT).eq('hangul', sori)
      for (const r of (data ?? []) as HanjaRow[]) {
        const k = rowHanja(r)
        if (!values.has(k) && missing.some((m) => m.hanja === k)) values.set(k, r)
      }
    } catch { /* 못 건져도 아래에서 알려 줍니다 */ }
  }

  const out: SurnameChoice[] = []
  for (const x of listed) {
    const row = values.get(x.hanja)
    if (!row) {
      // 🔴 성씨 표엔 있는데 hanja 표에 «값이 없는» 글자입니다.
      //   ⛔ 획수를 모르면 ★수리 4격이 0 으로 어긋난 채 결과가 나갑니다.
      //     그래서 «내지 않습니다». 대신 여기서 알려 둡니다.
      //   ⇒ _SQL_58bu_성씨_03_점검.sql 의 ②번이 이런 글자를 세어 줍니다.
      console.warn(`[surnameDb] '${sori}' 의 ${x.hanja} — hanja 표에 값이 없습니다`)
      continue
    }
    // ⛔ hangul 은 ★손님이 쓴 소리로 덮어씁니다 (머리말 참조)
    out.push({ row: { ...row, hangul: sori }, rank: x.rank })
  }

  out.sort((a, b) => a.rank - b.rank || rowStrokes(a.row) - rowStrokes(b.row))
  return out
}

/**
 * ⚠️ 되돌림 — surname_hanja 표를 못 읽을 때만 씁니다.
 *    56부가 하던 그대로입니다 (hanja 표에서 소리로 꺼내 코드 목록으로 거르기).
 * □ 표가 자리를 잡으면 이 함수와 코드 파일 둘을 걷어냅니다.
 */
async function fallbackChoices(
  sori: string,
  extraHanja: string[],
): Promise<SurnameChoice[] | null> {
  if (!shouldFilterSurname(sori) && surnameAllowedOf(sori).length === 0) return null
  const { data, error } = await supabase
    .from('hanja').select(HANJA_SELECT).eq('hangul', sori)
  if (error || !data) return null
  const rows = (data as HanjaRow[]).filter(
    (r) => isSurnameAllowed(sori, rowHanja(r)) || extraHanja.includes(rowHanja(r)),
  )
  return rows
    .map((r) => ({ row: r, rank: surnameRank(sori, rowHanja(r)) }))
    .sort((a, b) => a.rank - b.rank || rowStrokes(a.row) - rowStrokes(b.row))
}

/**
 * ★복성 두 글자의 값을 «한자로» 찾습니다.
 *
 * ⛔⛔ 한 칸에 두 글자를 넣지 «않습니다» — a·b 를 «두 칸» 에 각각 넣으십시오 (57부).
 * ⚠️ 하나라도 못 찾으면 null 입니다. ⛔ 막지 마십시오 — 낱글자로 내려가십시오.
 */
export async function fetchCompoundRows(
  hangul1: string, hanja1: string,
  hangul2: string, hanja2: string,
): Promise<{ a: HanjaRow; b: HanjaRow } | null> {
  const values = await readValuesByHanja([hanja1, hanja2])
  const a = values.get(hanja1)
  const b = values.get(hanja2)
  if (!a || !b) return null
  // ⛔ 소리는 «손님이 쓴 것» 으로 덮어씁니다 (머리말 참조)
  return { a: { ...a, hangul: hangul1 }, b: { ...b, hangul: hangul2 } }
}
