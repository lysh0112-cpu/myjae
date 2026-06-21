import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

export async function POST(req: Request) {
  const { messages, mode, saju1, saju2, gender1, gender2 } = await req.json()

  // 모드별 시스템 프롬프트
  const systemPrompt = getSystemPrompt(mode, saju1, saju2, gender1, gender2)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: systemPrompt,
          messages: messages,
        })

        for await (const chunk of response) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`))
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

function getSystemPrompt(
  mode: string,
  saju1: any,
  saju2: any,
  gender1: string,
  gender2: string
): string {
  const saju1Text = saju1 ? saju1.map((s: any) => `${s.pillar}: ${s.stem}${s.branch}`).join(', ') : ''
  const saju2Text = saju2 ? saju2.map((s: any) => `${s.pillar}: ${s.stem}${s.branch}`).join(', ') : ''

  const base = `당신은 명리학 전문가입니다. 
마크다운 기호(##, **, ---)는 절대 사용하지 마세요.
답변은 핵심만 3~5문장으로 간결하게 작성하세요.
친근하고 따뜻한 말투로 대화하세요.`

  switch (mode) {
    case 'couple':
      return `${base}
상담 유형: 연인 궁합
첫 번째 사람 사주 (${gender1}): ${saju1Text}
두 번째 사람 사주 (${gender2}): ${saju2Text}
두 사람의 궁합을 명리학적으로 분석해서 질문에 답변해주세요.`

    case 'married':
      return `${base}
상담 유형: 부부 상담
남편 사주: ${saju1Text}
아내 사주: ${saju2Text}
부부 관계를 명리학적으로 분석해서 질문에 답변해주세요.`

    case 'prewedding':
      return `${base}
상담 유형: 예비 신혼부부
신랑 사주: ${saju1Text}
신부 사주: ${saju2Text}
결혼을 앞둔 두 분의 궁합을 명리학적으로 분석해서 질문에 답변해주세요.
긍정적이고 희망찬 톤으로 답변하세요.`

    case 'birth':
      return `${base}
상담 유형: 출산 시기
부모1 사주: ${saju1Text}
부모2 사주: ${saju2Text}
출산 시기와 아이 사주에 대해 명리학적으로 분석해서 질문에 답변해주세요.`

    default:
      return `${base}
사주: ${saju1Text}
위 사주를 바탕으로 질문에 답변해주세요.`
  }
}
