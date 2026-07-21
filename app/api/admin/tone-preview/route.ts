import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { tone_rules, easy_terms, saju_info } = await req.json()

    const toneBlock = `${(tone_rules || '').trim()}\n\n${(easy_terms || '').trim()}`

    const info = (saju_info || '').trim() ||
      '양력 1990년 5월 12일 낮에 태어난 여성'

    const samplePrompt = `${toneBlock}

[아래는 관리자 미리보기입니다. 위 말투 규칙을 그대로 지켜, 아래 사람의 사주를 실제 고객에게 보여주듯 3~5문장으로 따뜻하게 풀이해 주세요.]
- 대상: ${info}

위 말투 규칙(따뜻한 위로·쉬운 말·겁주지 않기)을 그대로 적용해, 실제 고객이 받아볼 해설처럼 자연스럽게 써 주세요.`

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI 키가 설정되지 않았어요.' }, { status: 500 })
    }

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 800,
        messages: [{ role: 'user', content: samplePrompt }],
      }),
    })

    const data = await res.json()
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message || 'AI 호출 실패' }, { status: 500 })
    }

    const text = (data?.content || [])
      .map((b: any) => (b.type === 'text' ? b.text : ''))
      .join('')
      .trim()

    return NextResponse.json({ preview: text || '(미리보기 생성 결과가 비어 있어요)' })
  } catch (e: unknown) {
    const _m = e instanceof Error ? e.message : ''
    return NextResponse.json({ error: '미리보기 오류: ' + (_m || '알 수 없음') }, { status: 500 })
  }
}
