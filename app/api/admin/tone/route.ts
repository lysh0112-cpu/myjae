import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { DEFAULT_TONE_RULES_TEXT, DEFAULT_EASY_TERMS_TEXT } from '@/lib/ai/tonePrompt'
import { requireMaster } from '../_guard'

function admin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

// 불러오기 — 저장된 지시문 반환. 비어있으면 코드 기본값을 채워서 반환.
export async function GET() {
  try {
    const supabase = admin()
    /* ★2026-09-11 (6부) — 줄 «전체» 를 읽습니다 (검사 ㉒-v).
     *   [전]  칸 이름을 적어 읽었습니다. 없는 칸이 하나라도 있으면 «줄 전체» 를 못 읽는데,
     *         그 오류를 «안 봐서» 기본값만 돌려줬습니다.
     *         ⇒ 그 화면에서 [저장]을 누르면 ★대표님이 쓰신 말투가 «기본값으로 덮입니다».
     *   [지금] ① 칸 이름을 적지 않습니다 — 이달의 운세 칸(monthly_guide)이 DB 에 «아직 없어도» 안 깨집니다.
     *          ② 오류가 나면 load_error 로 «알립니다» — 말투 관리가 [저장]을 잠급니다.
     *          ⚠️ 손님 화면(출산택일 결과)은 그대로 기본값을 받아 씁니다 (200 은 그대로). */
    const { data, error } = await supabase
      .from('tone_settings')
      .select('*')
      .eq('id', 1)
      .maybeSingle()
    const load_error = error ? error.message : null
    if (error) console.error('[tone] 불러오기 오류:', error.message)
    const has_monthly = !!data && Object.prototype.hasOwnProperty.call(data, 'monthly_guide')

    const tone_rules = (data?.tone_rules || '').trim() || DEFAULT_TONE_RULES_TEXT
    const easy_terms = (data?.easy_terms || '').trim() || DEFAULT_EASY_TERMS_TEXT
    const mulsang_guide = (data?.mulsang_guide || '')  // 물상도 전용
    const tarot_guide = (data?.tarot_guide || '')      // 타로 전용
    const naming_guide = (data?.naming_guide || '')    // 작명·개명 전용
    const fortune_guide = (data?.fortune_guide || '')  // 오늘의 운세 전용
    const monthly_guide = (data?.monthly_guide || '')  // ★이달의 운세 전용 (2026-09-11 · 6부)

    return NextResponse.json({
      tone_rules,
      easy_terms,
      mulsang_guide,
      tarot_guide,
      naming_guide,
      fortune_guide,
      monthly_guide,
      has_monthly,
      load_error,
      updated_at: data?.updated_at || null,
      default_rules: DEFAULT_TONE_RULES_TEXT,
      default_terms: DEFAULT_EASY_TERMS_TEXT,
    })
  } catch (e: unknown) {
    const _m = e instanceof Error ? e.message : ''
    return NextResponse.json({ error: '불러오기 오류: ' + (_m || '알 수 없음') }, { status: 500 })
  }
}

// 저장 — 관리자가 편집한 지시문을 tone_settings(id=1)에 저장(upsert).
export async function POST(req: Request) {
  try {
    /* ★관리자 권한 확인 (2026-09-11 · 6부) — «쓰기» 만 막습니다.
     *   ⚠️ 이 줄이 «없었습니다». 누구든 AI 말투 지시문을 덮어써
     *      ★손님이 받는 AI 답 «전부» 를 바꿀 수 있었습니다.
     *   ⛔ 위 «읽기»(GET) 에는 넣지 마십시오 — 손님 화면(출산택일 결과)이 부릅니다.
     *   ⛔ 몸통을 읽기 «전» 에 둡니다 — 검사 ㉒-n 이 순서를 봅니다. */
    const g = await requireMaster()
    if (!g.ok) return g.res

    const { tone_rules, easy_terms, mulsang_guide, tarot_guide, naming_guide, fortune_guide, monthly_guide } = await req.json()
    const supabase = admin()

    // 넘어온 값만 갱신 (undefined면 기존 값 유지)
    const patch: Record<string, any> = { id: 1, updated_at: new Date().toISOString() }
    if (tone_rules !== undefined) patch.tone_rules = tone_rules ?? ''
    if (easy_terms !== undefined) patch.easy_terms = easy_terms ?? ''
    if (mulsang_guide !== undefined) patch.mulsang_guide = mulsang_guide ?? ''
    if (tarot_guide !== undefined) patch.tarot_guide = tarot_guide ?? ''
    if (naming_guide !== undefined) patch.naming_guide = naming_guide ?? ''
    if (fortune_guide !== undefined) patch.fortune_guide = fortune_guide ?? ''
    //  ★2026-09-11 (6부) — 말투 관리는 DB 에 칸이 «있을 때만» 이 값을 보냅니다 (has_monthly).
    if (monthly_guide !== undefined) patch.monthly_guide = monthly_guide ?? ''

    const { error } = await supabase
      .from('tone_settings')
      .upsert(patch, { onConflict: 'id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const _m = e instanceof Error ? e.message : ''
    return NextResponse.json({ error: '저장 오류: ' + (_m || '알 수 없음') }, { status: 500 })
  }
}
