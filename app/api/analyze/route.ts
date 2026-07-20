import { NextRequest, NextResponse } from 'next/server'
import { logAiError } from '@/lib/ai/errorLog'

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not set' }, { status: 500 })
    }
    const body = await req.json()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 6000,
        messages: body.messages,
      }),
    })
    const data = await response.json()
    // 실패 이유를 서버 로그에 남긴다(크레딧 소진·키 만료 추적용).
    if (!response.ok) await logAiError('analyze', response.status, data?.error || data)
    return NextResponse.json(data, { status: response.status })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
