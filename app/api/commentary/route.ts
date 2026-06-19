// app/api/commentary/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const { consultationId, text } = await req.json()

    if (!text?.trim()) {
      return NextResponse.json({ error: 'text is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('commentaries')
      .upsert({
        consultation_id: consultationId ?? 'temp',
        content: text,
        updated_at: new Date().toISOString(),
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch(e) {
    console.error(e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
