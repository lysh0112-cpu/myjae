// lib/ai/speedBump.ts
//
// 🔴 ★2026-09-11 (6부) [대표님 「과속방지턱은 여기서 해결해 줘야지」] — AI 과속 방지턱 (검사 48)
//
//   [겪음] 9월 11일 — 취업운 화면 버그가 AI 를 끝없이 다시 불러, 하루에 입력 1,977만 · 출력 435만 토큰
//          (미납 US$113.59). 화면 코드에 버그가 생기면 서버가 그대로 따라갔습니다.
//   ⇒ 서버가 «사람마다» 호출을 셉니다. 10분에 20번을 넘으면 AI 를 부르지 않고 429 를 돌려줍니다.
//     취업운 한 번 = 4번이라 다섯 번 연달아 보셔도 넉넉하고, 고장 난 화면은 20번에서 멈춥니다.
//
//   두 겹입니다.
//     ① 메모리 — 같은 서버 안에서 곧바로 (DB 가 없어도 돕니다)
//     ② DB(ai_call_log) — 서버가 여러 대로 나뉘어 돌아도 한 사람을 빠짐없이 셉니다
//   ⚠️ DB 가 없거나 오류면 ②는 건너뛰고 ①만 돕니다 (서비스를 막지 않습니다).
//   ⚠️ 막힌 일은 AI 오류 기록에 «speed-bump:창구» 로 남겨, 관리자 화면 빨간 띠에 뜹니다 (10분에 한 번만).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { logAiError } from './errorLog'

export const BUMP_WINDOW_MS = 10 * 60 * 1000
export const BUMP_MAX = 20

const mem = new Map<string, number[]>()
const lastLogged = new Map<string, number>()

/** ① 메모리 방지턱 — true 면 통과 */
export function memoryBump(key: string, now = Date.now()): boolean {
  const recent = (mem.get(key) ?? []).filter(t => now - t < BUMP_WINDOW_MS)
  if (recent.length >= BUMP_MAX) { mem.set(key, recent); return false }
  recent.push(now)
  mem.set(key, recent)
  if (mem.size > 5000) {   // 오래 안 온 사람은 비웁니다 (서버 기억이 끝없이 커지지 않게)
    for (const [k, v] of mem) if (!v.length || now - v[v.length - 1] > BUMP_WINDOW_MS) mem.delete(k)
  }
  return true
}
/** 검사용 */
export function _resetMemoryBump(): void { mem.clear(); lastLogged.clear() }

export type BumpResult = { ok: true } | { ok: false; res: NextResponse }

const MESSAGE = 'AI 요청이 너무 잦아요. 10분쯤 뒤에 다시 해 주세요.'

async function blocked(userId: string, route: string, where: 'memory' | 'db'): Promise<BumpResult> {
  const now = Date.now()
  if (now - (lastLogged.get(userId) ?? 0) > BUMP_WINDOW_MS) {   // 기록은 10분에 한 번만 (기록이 폭주하지 않게)
    lastLogged.set(userId, now)
    await logAiError(`speed-bump:${route}`, 429,
      `과속 방지턱 — 한 사람이 10분에 ${BUMP_MAX}번을 넘게 불렀습니다 (사용자 ${userId.slice(0, 8)}… · ${where}). 화면 버그로 되풀이해 부르고 있을 수 있어요.`)
  }
  return { ok: false, res: NextResponse.json({ error: MESSAGE }, { status: 429, headers: { 'Retry-After': '600' } }) }
}

/** AI 를 부르기 «전» 에 반드시 거칩니다. */
export async function aiSpeedBump(userId: string, route: string): Promise<BumpResult> {
  if (!memoryBump(userId)) return blocked(userId, route, 'memory')
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) return { ok: true }
    const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
    const since = new Date(Date.now() - BUMP_WINDOW_MS).toISOString()
    const { count, error } = await db.from('ai_call_log')
      .select('id', { count: 'exact', head: true }).eq('user_id', userId).gte('created_at', since)
    if (error) return { ok: true }                        // 표가 아직 없으면 메모리 방지턱만
    if ((count ?? 0) >= BUMP_MAX) return blocked(userId, route, 'db')
    await db.from('ai_call_log').insert({ user_id: userId, route })
    //  가끔(200번에 한 번) 하루 지난 줄을 비웁니다 — 표가 끝없이 커지지 않게
    if (Math.random() < 0.005) {
      await db.from('ai_call_log').delete().lt('created_at', new Date(Date.now() - 86_400_000).toISOString())
    }
    return { ok: true }
  } catch {
    return { ok: true }
  }
}
