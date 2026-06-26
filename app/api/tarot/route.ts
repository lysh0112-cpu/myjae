import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

// 타로 해석 API
//   mode 'ai'         → Claude가 질문·자리·카드를 받아 해석 생성
//   mode 'consultant' → 해석은 만들지 않고, 뽑은 카드만 저장 (상담사가 나중에 해석)
// 두 경우 모두 tarot_readings 에 저장한다.

interface CardInput {
  position: string
  name: string
  nameEn: string
  direction: string   // '정방향' | '역방향'
  keyword: string
}
interface Body {
  mode: 'ai' | 'consultant'
  question: string
  deckCode: string
  spreadTitle: string
  cards: CardInput[]
  consultationId?: number | null
}

interface InterpCard { position: string; name: string; direction: string; meaning: string }
interface Interp { title: string; cards: InterpCard[]; summary: string; advice: string }

// 깨진 응답이 와도 화면에 JSON 덩어리가 그대로 보이지 않도록 안전하게 정리
function safeParse(raw: string, body: Body): Interp {
  const clean = raw.replace(/```json|```/g, '').trim()
  try {
    const obj = JSON.parse(clean)
    return {
      title: typeof obj.title === 'string' ? obj.title : '타로 리딩',
      cards: Array.isArray(obj.cards) ? obj.cards : [],
      summary: typeof obj.summary === 'string' ? obj.summary : '',
      advice: typeof obj.advice === 'string' ? obj.advice : '',
    }
  } catch {
    // JSON이 잘리거나 깨진 경우: 카드 자리만이라도 채우고, 덩어리 글자는 숨긴다
    return {
      title: '타로 리딩',
      cards: body.cards.map(c => ({
        position: c.position, name: c.name, direction: c.direction,
        meaning: `${c.keyword}의 기운이 느껴지는 자리입니다.`,
      })),
      summary: '카드 해석을 정리하는 데 잠시 어려움이 있었어요. 다시 한 번 시도해 주시면 더 또렷한 해석을 들려드릴게요.',
      advice: '바로 아래 "새로운 질문하기"로 다시 뽑아보시거나, 전문가 상담으로 더 깊은 이야기를 들어보셔도 좋아요.',
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

    // 카드들을 보기 좋은 텍스트로
    const cardLines = body.cards
      .map((c, i) => `${i + 1}. [${c.position}] ${c.name} (${c.direction}) — 핵심: ${c.keyword}`)
      .join('\n')

    let interpretation: Interp | null = null

    // ---------- AI 모드: Claude 해석 생성 ----------
    if (body.mode === 'ai') {
      const prompt = `당신은 따뜻하면서도 정직한 타로 상담가입니다.
아래는 고객이 마음속 질문을 떠올리고 직접 뽑은 카드들입니다. 이 해석은 고객이 받는 결과물입니다.

[매우 중요한 원칙]
- 무조건 좋다고 하지 마세요. 또한 불안하게 겁주지도 마세요. 사실을 짚되, 그 안에서 나아갈 방향을 제시하세요.
- 고객의 질문에 직접 답하세요. 일반론이 아니라 이 질문에 대한 답으로 각 카드를 풀어주세요.
- 각 카드의 '자리(위치)'와 '정/역 방향'을 반영하세요. 같은 카드라도 자리와 방향에 따라 의미가 달라집니다.
- 어려운 용어보다 쉽고 따뜻한 말로. 마크다운 기호(##, **)는 쓰지 마세요.
- 카드가 많을 때는 각 카드 meaning을 너무 길게 쓰지 말고 2문장 정도로 간결히 쓰세요. (전체가 잘리지 않도록)

[고객의 질문]
${body.question}

[뽑은 방식] ${body.spreadTitle}

[뽑힌 카드]
${cardLines}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "이 리딩을 한 줄로 담은 제목",
  "cards": [
    { "position": "자리 이름", "name": "카드 이름", "direction": "정방향 또는 역방향", "meaning": "이 자리에서 이 카드가 질문에 답하는 의미 2문장" }
  ],
  "summary": "카드들을 엮은 전체 흐름 2~3문장",
  "advice": "질문에 대한 실질적이고 희망적인 조언 2~3문장"
}
주의: cards 배열은 뽑힌 카드 ${body.cards.length}장을 순서대로 모두 포함하세요.`

      const anthropicKey = process.env.ANTHROPIC_API_KEY
      if (anthropicKey) {
        try {
          const cRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': anthropicKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 8000,
              messages: [{ role: 'user', content: prompt }],
            }),
          })
          const cData = await cRes.json()
          const rawText = cData.content?.find((c: { type: string }) => c.type === 'text')?.text || '{}'
          interpretation = safeParse(rawText, body)
        } catch (e) {
          console.error('claude error:', e)
          interpretation = safeParse('', body)
        }
      } else {
        interpretation = safeParse('', body)
      }
    }

    // ---------- 상담사 모드: 해석 없이 안내 메시지 ----------
    if (body.mode === 'consultant') {
      interpretation = {
        title: '카드를 모두 뽑았습니다',
        cards: body.cards.map(c => ({
          position: c.position, name: c.name, direction: c.direction,
          meaning: '전문가 상담에서 이 카드의 의미를 자세히 풀어드립니다.',
        })),
        summary: '뽑으신 카드가 상담사에게 전달되었습니다. 전문가가 직접 해석해 드립니다.',
        advice: '아래 버튼으로 전문가 상담을 신청해 주세요.',
      }
    }

    // ---------- Supabase 저장 (두 모드 모두) ----------
    let savedId: number | null = null
    if (supabase) {
      try {
        const { data } = await supabase
          .from('tarot_readings')
          .insert({
            consultation_id: body.consultationId ?? null,
            question: body.question,
            deck_code: body.deckCode,
            spread_title: body.spreadTitle,
            mode: body.mode,
            cards: body.cards,
            interpretation: interpretation,
          })
          .select('id')
          .single()
        savedId = data?.id ?? null
      } catch (e) {
        console.error('tarot insert error:', e)
      }
    }

    return NextResponse.json({ interpretation, savedId })
  } catch (e) {
    console.error('tarot route error:', e)
    return NextResponse.json({ error: 'tarot_failed' }, { status: 500 })
  }
}
