import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

// 타로 카드/덱 불러오기 전용 API
// GET /api/tarot/cards            → 활성화된 덱 목록
// GET /api/tarot/cards?deck=universal → 그 덱의 카드 78장 (이름·키워드·그림주소)
//
// 화면(page.tsx)은 DB를 직접 읽지 않고 이 API로만 카드를 받아간다.
// 나중에 다국어/해외 대응 시, 여기서 ?lang=en 같은 분기만 추가하면 된다.

export async function GET(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'no_supabase' }, { status: 500 })
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { searchParams } = new URL(req.url)
    const deckCode = searchParams.get('deck')

    // ---------- 1) 덱 코드가 없으면: 덱 목록 반환 ----------
    if (!deckCode) {
      const { data: decks, error } = await supabase
        .from('tarot_decks')
        .select('code, name_ko, description, card_count, uses_reversed, is_active, sort_order')
        .order('sort_order', { ascending: true })
      if (error) throw error
      return NextResponse.json({ decks: decks ?? [] })
    }

    // ---------- 2) 덱 코드가 있으면: 그 덱 정보 + 카드 목록 반환 ----------
    const { data: deck, error: deckErr } = await supabase
      .from('tarot_decks')
      .select('id, code, name_ko, description, card_count, uses_reversed, is_active')
      .eq('code', deckCode)
      .single()
    if (deckErr || !deck) {
      return NextResponse.json({ error: 'deck_not_found' }, { status: 404 })
    }

    // 덱별 그림 연결 + 카드 의미를 함께 읽어온다
    const { data: rows, error: cardErr } = await supabase
      .from('tarot_deck_cards')
      .select(`
        image_url,
        tarot_cards (
          id, arcana, suit, number, name_ko, name_en,
          upright_kw, reversed_kw, sort_order
        )
      `)
      .eq('deck_id', deck.id)
    if (cardErr) throw cardErr

    // 보기 좋게 정리 + 정렬
    const cards = (rows ?? [])
      .map((r: Record<string, unknown>) => {
        const c = r.tarot_cards as Record<string, unknown>
        return {
          id: c.id,
          arcana: c.arcana,
          suit: c.suit,
          number: c.number,
          nameKo: c.name_ko,
          nameEn: c.name_en,
          uprightKw: c.upright_kw,
          reversedKw: c.reversed_kw,
          imageUrl: r.image_url ?? null,
          sortOrder: c.sort_order,
        }
      })
      .sort((a, b) => (a.sortOrder as number) - (b.sortOrder as number))

    return NextResponse.json({
      deck: {
        code: deck.code,
        nameKo: deck.name_ko,
        usesReversed: deck.uses_reversed,
        isActive: deck.is_active,
      },
      cards,
    })
  } catch (e) {
    console.error('tarot cards api error:', e)
    return NextResponse.json({ error: 'tarot_cards_failed' }, { status: 500 })
  }
}
