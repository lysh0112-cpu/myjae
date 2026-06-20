import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not set' }, { status: 500 })
    }

    const { consultantName, customerPhone, chatText, sajuData } = await req.json()

    // 사주 데이터 텍스트 변환
    const sajuText = sajuData ? `
사주 원국:
- 시주: ${sajuData.time?.stem}${sajuData.time?.branch}
- 일주: ${sajuData.day?.stem}${sajuData.day?.branch}
- 월주: ${sajuData.month?.stem}${sajuData.month?.branch}
- 년주: ${sajuData.year?.stem}${sajuData.year?.branch}
- 원국 관계: ${sajuData.relations?.join(', ') || '없음'}
- 일간: ${sajuData.dayStem}
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
        messages: [
          {
            role: 'user',
            content: `당신은 명리학 전문 상담사입니다. 아래 사주 정보와 상담 채팅 내용을 바탕으로 고객에게 전달할 상담 요약문을 작성해주세요.

${sajuText}
상담사: ${consultantName}
고객: ${customerPhone}

채팅 상담 내용:
${chatText}

아래 형식으로 요약해주세요. 고객이 읽기 쉽고 이해하기 쉽게 친근한 말투로 작성해주세요:

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
          },
        ],
      }),
    })

    const data = await response.json()
    const summary = data.content?.[0]?.text ?? ''
    return NextResponse.json({ summary })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
