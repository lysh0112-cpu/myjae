import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: '이 PDF의 모든 텍스트 내용을 원문 그대로 추출해주세요. 설명이나 부연 없이 텍스트만 출력하세요.',
              },
            ],
          },
        ],
      }),
    })

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    return NextResponse.json({ text })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: '텍스트 추출 실패' }, { status: 500 })
  }
}
