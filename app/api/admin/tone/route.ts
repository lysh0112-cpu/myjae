import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { DEFAULT_TONE_RULES_TEXT, DEFAULT_EASY_TERMS_TEXT } from '@/lib/ai/tonePrompt'

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
    const { data } = await supabase
      .from('tone_settings')
      .select('tone_rules, easy_terms, mulsang_guide, tarot_guide, naming_guide, fortune_guide, updated_at')
      .eq('id', 1)
      .maybeSingle()

    const tone_rules = (data?.tone_rules || '').trim() || DEFAULT_TONE_RULES_TEXT
    const easy_terms = (data?.easy_terms || '').trim() || DEFAULT_EASY_TERMS_TEXT
    const mulsang_guide = (data?.mulsang_guide || '')  // 물상도 전용
    const tarot_guide = (data?.tarot_guide || '')      // 타로 전용
    const naming_guide = (data?.naming_guide || '')    // 작명·개명 전용
    const fortune_guide = (data?.fortune_guide || '')  // 오늘의 운세 전용

    return NextResponse.json({
      tone_rules,
      easy_terms,
      mulsang_guide,
      tarot_guide,
      naming_guide,
      fortune_guide,
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
    const { tone_rules, easy_terms, mulsang_guide, tarot_guide, naming_guide, fortune_guide } = await req.json()
    const supabase = admin()

    // 넘어온 값만 갱신 (undefined면 기존 값 유지)
    const patch: Record<string, any> = { id: 1, updated_at: new Date().toISOString() }
    if (tone_rules !== undefined) patch.tone_rules = tone_rules ?? ''
    if (easy_terms !== undefined) patch.easy_terms = easy_terms ?? ''
    if (mulsang_guide !== undefined) patch.mulsang_guide = mulsang_guide ?? ''
    if (tarot_guide !== undefined) patch.tarot_guide = tarot_guide ?? ''
    if (naming_guide !== undefined) patch.naming_guide = naming_guide ?? ''
    if (fortune_guide !== undefined) patch.fortune_guide = fortune_guide ?? ''

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
