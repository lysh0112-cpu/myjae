import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not set' }, { status: 500 })
    }

    const { consultantName, customerPhone, chatText } = await req.json()

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `다음은 명리 상담 채팅 내용입니다. 상담사(${consultantName})와 고객(${customerPhone}) 간의 대화를 아래 형식으로 요약해주세요.

채팅 내용:
${chatText}

아래 형식으로 요약해주세요:
📋 상담 요약

[핵심 질문]
- 

[사주 분석]
- 

[상담사 조언]
- 

[추가 메모]
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
