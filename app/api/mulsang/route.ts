import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

interface Body {
  prompt: string
  dayStem: string
  dayElement: string
  strongElement: string
  yongsin: string
  season: string
  styleLabel: string
  style: string
  sajuText: string
  saju: unknown
  elementScores: unknown
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null

    // ---------- 1) Claude 해설 생성 ----------
    const commentaryPrompt = `당신은 따뜻한 명리학 전문가입니다.
아래 사주를 "자연 풍경"으로 풀어 설명하는 해설을 작성하세요.
어려운 한자 용어 대신, 그림 속 풍경에 빗대어 직관적으로 풀어주세요.
마크다운 기호(##, **, ---)는 절대 쓰지 마세요.

사주: ${body.sajuText}
일간(주인공): ${body.dayStem}(${body.dayElement})
가장 강한 기운(환경): ${body.strongElement}
용신(핵심 에너지): ${body.yongsin}
계절: ${body.season}
화풍: ${body.styleLabel}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "이 풍경화의 제목 (예: 새벽녘 활기찬 정원)",
  "subject": "주인공(일간) 해설 2~3문장 — 그림 중앙의 대상이 곧 당신",
  "environment": "환경(강한 오행) 해설 2~3문장 — 당신을 둘러싼 풍경의 의미",
  "yongsin": "핵심 에너지(용신) 해설 2~3문장 — 그림 속 따뜻한 빛/물/땅의 의미",
  "advice": "삶의 조언 2~3문장 — 따뜻하고 희망적으로"
}`

    let commentary: Record<string, string> = {
      title: '당신의 사주 풍경', subject: '', environment: '', yongsin: '', advice: '',
    }

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
            max_tokens: 1500,
            messages: [{ role: 'user', content: commentaryPrompt }],
          }),
        })
        const cData = await cRes.json()
        const rawText = cData.content?.find((c: { type: string }) => c.type === 'text')?.text || '{}'
        const clean = rawText.replace(/```json|```/g, '').trim()
        try { commentary = JSON.parse(clean) } catch { commentary.subject = clean.slice(0, 200) }
      } catch (e) {
        console.error('claude error:', e)
      }
    }

    // ---------- 2) gpt-image-1 그림 생성 ----------
    let imageUrl: string | null = null
    let imageNote = ''
    const openaiKey = process.env.OPENAI_API_KEY

    if (openaiKey) {
      try {
        const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: body.prompt,
            n: 1,
            size: '1024x1024',
          }),
        })
        const imgData = await imgRes.json()
        const b64 = imgData.data?.[0]?.b64_json ?? null
        if (b64) {
          imageUrl = `data:image/png;base64,${b64}`
        } else {
          imageNote = 'image_failed'
          console.error('gpt-image response:', JSON.stringify(imgData).slice(0, 500))
        }
      } catch (e) {
        console.error('gpt-image error:', e)
        imageNote = 'image_error'
      }
    } else {
      imageNote = 'no_openai_key'
    }

    // ---------- 3) Supabase 저장 ----------
    let savedId: string | null = null
    if (supabase) {
      try {
        const { data } = await supabase
          .from('mulsang_images')
          .insert({
            saju: body.saju,
            element_scores: body.elementScores,
            day_master: body.dayStem,
            yongsin: body.yongsin,
            style: body.style,
            prompt: body.prompt,
            image_url: imageUrl ? '(stored inline)' : null,
            commentary,
          })
          .select('id')
          .single()
        savedId = data?.id ?? null
      } catch (e) {
        console.error('supabase insert error:', e)
      }
    }

    return NextResponse.json({ commentary, imageUrl, imageNote, savedId, prompt: body.prompt })
  } catch (e) {
    console.error('mulsang route error:', e)
    return NextResponse.json({ error: 'mulsang_failed' }, { status: 500 })
  }
}
