import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic()

export async function POST(req: NextRequest) {
  const { consultantName, customerPhone, chatText } = await req.json()

  const message = await client.messages.create({
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
  })

  const summary = message.content[0].type === 'text' ? message.content[0].text : ''

  return NextResponse.json({ summary })
}
