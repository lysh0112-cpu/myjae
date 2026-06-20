import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not set' }, { status: 500 })

    const { consultantName, customerPhone, chatText, sajuData, commentary } = await req.json()

    const sajuText = sajuData ? `
사주 원국:
- 시주: ${sajuData.time?.stem}${sajuData.time?.branch}
- 일주: ${sajuData.day?.stem}${sajuData.day?.branch}
- 월주: ${sajuData.month?.stem}${sajuData.month?.branch}
- 년주: ${sajuData.year?.stem}${sajuData.year?.branch}
- 일간: ${sajuData.dayStem}
` : ''

    const commentaryText = commentary ? `
【상담사 직접 해설】(최우선 반영)
${commentary}
` : ''

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{
          role: 'user',
          content: `당신은 명리학 전문 상담사 보조 AI입니다.
상담사 해설이 있으면 그 관점을 최우선으로 유지하고, 채팅 내용으로 자연스럽게 보완하세요.
${sajuText}
${commentaryText}
상담사: ${consultantName} | 고객: ${customerPhone}

채팅 내용:
${chatText}

아래 형식으로 고객이 읽기 쉽게 친근한 말투로 작성해주세요:

📋 상담 요약

[사주 기본 특성]
- 

[핵심 질문 및 고민]
- 

[사주로 본 분석]
- 

[상담사 조언]
- 

[앞으로의 방향]
- `,
        }],
      }),
    })

    const data = await response.json()
    return NextResponse.json({ summary: data.content?.[0]?.text ?? '' })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
