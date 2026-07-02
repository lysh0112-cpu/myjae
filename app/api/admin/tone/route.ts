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

// 불러오기 — 저장된 지시문을 반환. 비어있으면 코드 기본값을 채워서 반환.
export async function GET() {
  try {
    const supabase = admin()
    const { data } = await supabase
      .from('tone_settings')
      .select('tone_rules, easy_terms, updated_at')
      .eq('id', 1)
      .maybeSingle()

    const tone_rules = (data?.tone_rules || '').trim() || DEFAULT_TONE_RULES_TEXT
    const easy_terms = (data?.easy_terms || '').trim() || DEFAULT_EASY_TERMS_TEXT

    return NextResponse.json({
      tone_rules,
      easy_terms,
      updated_at: data?.updated_at || null,
      // 화면의 '기본값으로 되돌리기'에서 쓸 코드 기본값도 함께 전달
      default_rules: DEFAULT_TONE_RULES_TEXT,
      default_terms: DEFAULT_EASY_TERMS_TEXT,
    })
  } catch (e: any) {
    return NextResponse.json({ error: '불러오기 오류: ' + (e?.message || '알 수 없음') }, { status: 500 })
  }
}

// 저장 — 관리자가 편집한 지시문을 tone_settings(id=1)에 저장(upsert).
export async function POST(req: Request) {
  try {
    const { tone_rules, easy_terms } = await req.json()
    const supabase = admin()
    const { error } = await supabase
      .from('tone_settings')
      .upsert({
        id: 1,
        tone_rules: tone_rules ?? '',
        easy_terms: easy_terms ?? '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: '저장 오류: ' + (e?.message || '알 수 없음') }, { status: 500 })
  }
}
