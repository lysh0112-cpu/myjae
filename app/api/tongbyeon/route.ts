// app/api/tongbyeon/route.ts
// ============================================================================
// AI 통변 스트리밍 API.
// ----------------------------------------------------------------------------
// 클라이언트가 buildTongbyeonPrompt로 만든 systemPrompt를 보내면,
// Claude API를 스트리밍 호출해 통변 텍스트를 흘려보낸다.
// 패턴은 기존 app/api/chat-stream/route.ts 를 그대로 따름.
//
// 요청 body: { systemPrompt: string, premium?: boolean }
// 응답: text/event-stream (data: {text} ... data: [DONE])
// ============================================================================

export async function POST(req: Request) {
  const { systemPrompt, premium } = await req.json()

  if (!systemPrompt || typeof systemPrompt !== 'string') {
    return new Response('systemPrompt가 필요해요', { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            // 무료는 넉넉히, 프리미엄은 더 길게
            max_tokens: premium ? 4000 : 2500,
            stream: true,
            system: systemPrompt,
            messages: [
              { role: 'user', content: '위 안내에 따라 통변을 작성해 주세요.' },
            ],
          }),
        })

        if (!res.ok || !res.body) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: '통변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' })}\n\n`)
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6)
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
                  )
                }
              } catch {}
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
