import { logAiError } from '@/lib/ai/errorLog'
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

// ★2026-07-21: maxDuration 이 없어 Vercel 기본값(10초)으로 돌고 있었다.
//   긴 통변(4카드)은 10초를 넘겨 스트리밍이 도중에 끊기고,
//   글이 문장 중간에서 잘린 채 끝났다("…햇살은 손바" 처럼).
//   오류도 안 나서 원인을 찾기 어려웠다. (14부 "조용히 실패하는 코드")
export const runtime = 'nodejs'
export const maxDuration = 60

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
            // ★2026-07-25 — 궁합 통변 7대목이 8192 토큰에서 끊겨(정준호 배우자운에서 멈춤,
            //   이경아 배우자운 아예 생성 안 됨) 12000으로 올린다.
            //   Sonnet 4.5 최대 출력은 64000 토큰이라 안전. 실제 출력만큼만 과금된다.
            max_tokens: premium ? 12000 : 3500,
            stream: true,
            system: systemPrompt,
            messages: [
              { role: 'user', content: '위 안내에 따라 통변을 작성해 주세요.' },
            ],
          }),
        })

        if (!res.ok || !res.body) {
          // 실패한 진짜 이유를 서버 로그에 남긴다.
          // (크레딧 소진·키 만료 등은 여기 안 남기면 원인을 찾을 길이 없다.)
          let why = ''
          try { why = await res.text() } catch { /* 본문을 못 읽어도 status는 남는다 */ }
          await logAiError('tongbyeon', res.status, why)

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: '통변을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.' })}\n\n`)
          )
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
          return
        }

        const reader = res.body.getReader()
        const decoder = new TextDecoder()

        // ★2026-07-25 — 줄 중간에서 잘린 청크 때문에 delta 가 유실되던 버그 수정.
        //   Anthropic SSE 청크는 줄 경계에서 안 끊길 수 있어, buf 에 모아
        //   완성된 줄만 처리하고 마지막 미완성 줄은 다음 청크로 넘긴다.
        //   (이게 없으면 통변이 길 때 뒷부분 delta 가 사라져 통변이 중간에 끊긴다.)
        let buf = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buf += decoder.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''   // 마지막(미완성)은 다음 청크로

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
