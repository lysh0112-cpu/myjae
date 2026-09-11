// ══════════════════════════════════════════════════════════════════
//  app/api/admin/consultation-purge/route.ts — ★2026-09-11 (6부) 신설
//  취소 내역의 [영구삭제] 를 «서버가» 합니다
//
//  [있던 일]  화면(CancelledHistory)이 브라우저에서 «표 열 개» 를 차례로 지웠습니다.
//    ① 앞의 아홉 표는 결과를 «안 봤습니다» — 막혀도 모르고 다음으로 넘어갔습니다.
//    ② Supabase 는 권한이 없어도 ★오류를 «안 냅니다» (0줄 · 5부 0-5).
//    ⇒ 중간에 막히면 ★«반쯤만» 지워진 채 「지웠다」 로 끝날 수 있었습니다.
//
//  [지금]  ★관리자 확인(requireMaster) → 취소된 건인지 확인 → 정해진 차례로 지우기
//          → 한 표라도 막히면 «그 자리에서 멈추고» 어느 표인지 돌려줍니다.
//          service_role 이라 권한에 «조용히» 막히는 일은 없습니다 — 막히면 진짜 오류입니다.
//
//  ⚠️ 한 번에 묶어(트랜잭션) 지우지는 «못합니다» — 그건 DB 함수가 있어야 합니다.
//     그래서 멈춘 자리를 «정확히» 말하는 것이 이 길의 몫입니다.
//  ⛔ requireMaster 를 맨 앞에서 빼지 마십시오 — service_role 은 RLS 를 통째로 무시합니다
//     (5부 10장 · 검사 ㉒-n 이 폴더째 봅니다).
//  ⛔ 「취소된 건만」 확인을 빼지 마십시오 — 살아 있는 예약이 지워집니다.
//     조건은 화면 목록과 «같습니다» (deleted_at 이 있거나 status 가 cancelled).
//  ⚠️ 지우는 표와 차례는 ★옛 화면 코드 «그대로» 옮겼습니다. 늘리거나 줄이지 않았습니다.
//     mc_ledger(지갑 기록)는 원래부터 «안» 지웁니다 — 5년 보관 대상입니다.
// ══════════════════════════════════════════════════════════════════
import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { requireMaster } from '../_guard'

/** 상담 건을 지우기 «전» 에 먼저 지우는 표 — 외래키 때문에 차례가 있습니다 */
const PURGE_ORDER = [
  'payments', 'chat_messages', 'commentaries', 'couples', 'mulsang_images',
  'namings', 'weddings', 'births', 'bookings',
] as const

export async function POST(request: Request) {
  try {
    const g = await requireMaster()
    if (!g.ok) return g.res

    const { id } = await request.json().catch(() => ({ id: null }))
    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: '상담 건 번호가 없어요.' }, { status: 400 })
    }

    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // ── ① 취소된 건이 맞는가 ─────────────────────────────────────
    const { data: row, error: rowErr } = await sb.from('consultations')
      .select('id, status, deleted_at').eq('id', id).maybeSingle()
    if (rowErr) return NextResponse.json({ error: '상담 건을 읽지 못했어요: ' + rowErr.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: '그 상담 건을 찾지 못했어요. 이미 지워졌을 수 있어요.' }, { status: 404 })
    if (!row.deleted_at && row.status !== 'cancelled') {
      return NextResponse.json({ error: '취소된 상담만 영구삭제할 수 있어요.' }, { status: 409 })
    }

    // ── ② 딸린 표부터 차례로 ────────────────────────────────────
    //   ⚠️ 딸린 줄이 «없는» 건 흔합니다 (결제·채팅이 없던 상담) — 0줄은 실패가 아닙니다.
    //   ⛔ 오류가 나면 «그 자리에서» 멈춥니다. 뒤를 계속 지우지 않습니다.
    const done: string[] = []
    for (const t of PURGE_ORDER) {
      const { error } = await sb.from(t).delete().eq('consultation_id', id)
      if (error) {
        return NextResponse.json({
          error: `「${t}」 표에서 멈췄어요: ${error.message}`,
          stoppedAt: t, done,
        }, { status: 500 })
      }
      done.push(t)
    }

    // ── ③ 마지막 — 상담 건 자체 (★바뀐 줄을 셉니다) ──────────────
    const { data: gone, error: goneErr } = await sb.from('consultations')
      .delete().eq('id', id).select('id')
    if (goneErr) {
      return NextResponse.json({
        error: '딸린 기록은 지웠는데 상담 건에서 멈췄어요: ' + goneErr.message,
        stoppedAt: 'consultations', done,
      }, { status: 500 })
    }
    if (!gone || gone.length === 0) {
      return NextResponse.json({
        error: '딸린 기록은 지웠는데 상담 건이 지워지지 않았어요.',
        stoppedAt: 'consultations', done,
      }, { status: 500 })
    }
    return NextResponse.json({ ok: true, done })
  } catch (e: unknown) {
    const m = e instanceof Error ? e.message : ''
    return NextResponse.json({ error: '영구삭제 중 문제가 생겼어요: ' + (m || '알 수 없음') }, { status: 500 })
  }
}
