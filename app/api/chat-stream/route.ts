import { buildToneBlockFromDB } from '@/lib/ai/tonePrompt'

export async function POST(req: Request) {
  const {
    messages, mode,
    saju1, saju2,
    gender1, gender2,
    yongsin1, yongsin2,
    userQuestion,
  } = await req.json()

  // 관리자 '어투 관리'의 공통 말투 (비었거나 오류면 기본값 폴백)
  const toneBlock = await buildToneBlockFromDB()

  const systemPrompt = getSystemPrompt({
    mode, saju1, saju2, gender1, gender2,
    yongsin1, yongsin2, userQuestion,
    toneBlock,
  })

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
            max_tokens: 800,
            stream: true,
            system: systemPrompt,
            messages,
          }),
        })

        const reader = res.body!.getReader()
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

function sajuText(saju: any[]) {
  if (!saju?.length) return ''
  return saju.map((s: any) => `${s.pillar}: ${s.stem}${s.branch}`).join(', ')
}

function yongsinText(y: any) {
  if (!y) return ''
  const parts: string[] = []
  if (y.track1?.yongsin) parts.push(`억부용신: ${y.track1.yongsin}`)
  if (y.track1?.heeksin) parts.push(`희신: ${y.track1.heeksin}`)
  if (y.track1?.gisin)   parts.push(`기신: ${y.track1.gisin}`)
  if (y.track2?.yongsin) parts.push(`격국용신: ${y.track2.yongsin}`)
  if (y.track2?.geok)    parts.push(`격국: ${y.track2.geok}`)
  if (y.isConflict)      parts.push(`투트랙 충돌: ${y.conflictAdvice}`)
  return parts.join(' / ')
}

function getSystemPrompt(p: {
  mode: string
  saju1: any[], saju2: any[]
  gender1: string, gender2: string
  yongsin1: any, yongsin2: any
  userQuestion?: string
  toneBlock?: string
}): string {

  const s1 = sajuText(p.saju1)
  const s2 = sajuText(p.saju2)
  const y1 = yongsinText(p.yongsin1)
  const y2 = yongsinText(p.yongsin2)
  const q = p.userQuestion ? `\n고객 주요 질문: ${p.userQuestion}` : ''

  // 공통 어투를 맨 앞에 붙인다 (관리자 '어투 관리'에서 조절)
  const tone = p.toneBlock ? `${p.toneBlock}\n\n` : ''

  const base = `${tone}당신은 자평진전 격국론 기반의 명리학 전문 상담사입니다.

[필수 규칙]
1. 마크다운 기호(##, **, ---)는 절대 사용하지 마세요.
2. 답변은 핵심만 3~5문장으로 간결하게 작성하세요.
3. 친근하고 따뜻한 말투로 대화하세요.
4. 이전 대화 내용을 반드시 기억하고 연결해서 답변하세요.
5. 아래 사주 정보는 이미 제공된 것이므로 절대 다시 물어보지 마세요.
6. 고객의 질문이 어떤 말투나 형태로 오더라도 반드시 질문의 의도를 파악해서 사주 정보를 바탕으로 바로 답변하세요.
7. 고객이 반말·구어체·감탄사로 질문해도 자연스럽게 재치있게 받아서 명리학적으로 연결하세요.
8. 절대 사주 정보를 다시 요청하거나 "죄송해요"로 시작하지 마세요.`

  switch (p.mode) {
    case 'couple':
      return `${base}

상담 유형: 연인 궁합
${p.gender1 === '여' ? '여성' : '남성'} 사주: ${s1}${y1 ? ` / 용신 ${y1}` : ''}
${p.gender2 === '여' ? '여성' : '남성'} 사주: ${s2}${y2 ? ` / 용신 ${y2}` : ''}${q}

두 사람의 사주를 이미 파악하고 있습니다. 고객 질문에 사주 기반으로 바로 답변하세요.`

    case 'prewedding':
      return `${base}

상담 유형: 예비 신혼부부
신랑 사주: ${s1}${y1 ? ` / 용신 ${y1}` : ''}
신부 사주: ${s2}${y2 ? ` / 용신 ${y2}` : ''}${q}

두 사람의 사주를 이미 파악하고 있습니다. 긍정적이고 희망찬 톤으로 답변하세요.`

    case 'married':
      return `${base}

상담 유형: 부부 상담
남편 사주: ${s1}${y1 ? ` / 용신 ${y1}` : ''}
아내 사주: ${s2}${y2 ? ` / 용신 ${y2}` : ''}${q}

두 사람의 사주를 이미 파악하고 있습니다. 고객 질문에 사주 기반으로 바로 답변하세요.`

    case 'birth':
      return `${base}

상담 유형: 출산 시기
부모1 사주: ${s1}${y1 ? ` / 용신 ${y1}` : ''}
부모2 사주: ${s2}${y2 ? ` / 용신 ${y2}` : ''}${q}

두 사람의 사주를 이미 파악하고 있습니다. 출산 시기를 명리학적으로 분석해서 답변하세요.`

    default:
      return `${base}

사주: ${s1}${y1 ? ` / 용신 ${y1}` : ''}${q}

사주를 이미 파악하고 있습니다. 고객 질문에 사주 기반으로 바로 답변하세요.`
  }
}
