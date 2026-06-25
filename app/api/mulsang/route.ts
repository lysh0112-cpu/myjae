import { NextResponse } from 'next/server'

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
  sajuText: string
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

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

    const claudeRes = await fetch(new URL('/api/analyze', req.url).toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: commentaryPrompt }] }),
    })
    const claudeData = await claudeRes.json()
    const rawText =
      claudeData.content?.find((c: { type: string }) => c.type === 'text')?.text || '{}'
    const clean = rawText.replace(/```json|```/g, '').trim()

    let commentary: Record<string, string>
    try {
      commentary = JSON.parse(clean)
    } catch {
      commentary = {
        title: '당신의 사주 풍경',
        subject: clean.slice(0, 200),
        environment: '',
        yongsin: '',
        advice: '',
      }
    }

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
            model: 'dall-e-3',
            prompt: body.prompt,
            n: 1,
            size: '1024x1024',
          }),
        })
        const imgData = await imgRes.json()
        imageUrl = imgData.data?.[0]?.url ?? null
        if (!imageUrl) imageNote = 'image_generation_failed'
      } catch (e) {
        console.error('DALL-E error:', e)
        imageNote = 'image_generation_error'
      }
    } else {
      imageNote = 'no_openai_key'
    }

    return NextResponse.json({ commentary, imageUrl, imageNote, prompt: body.prompt })
  } catch (e) {
    console.error('mulsang route error:', e)
    return NextResponse.json({ error: 'mulsang_failed' }, { status: 500 })
  }
}
