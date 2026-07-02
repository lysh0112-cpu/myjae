// app/api/naming-chat/route.ts
// AI 작명 도우미 채팅 — 개명/새이름 추천 화면용
import { NextResponse } from 'next/server'
import { buildToneBlockFromDB } from '@/lib/ai/tonePrompt'

export const runtime = 'nodejs'
export const maxDuration = 60

interface ChatMsg { role: 'user' | 'assistant'; content: string }
interface Body {
  messages: ChatMsg[]
  context?: { name?: string; yongsin?: string; sajuText?: string; candidates?: string }
}

const SYSTEM_PROMPT = `당신은 '명연재'의 작명 도우미입니다. 사용자가 자기 이름·사주·추천된 한자를 두고 묻는 작명 관련 질문에만 답합니다.
[답변 범위]
- 이름·한자·사주 보완(용신)과 관련된 질문에만 답합니다.
- 작명과 무관한 질문(일반 운세 상담, 잡담, 그 외 요청)은 정중히 거절하고 작명 주제로 돌립니다.
[가장 중요 — 영업비밀 보호]
- 사주·작명의 이론·공식·계산법·판정 기준은 절대 설명하지 않습니다. (예: 용신을 어떻게 정하는지, 81수리 계산법, 왜 이 한자가 火인지의 원리 등)
- 당신은 '결과'와 '실용적 조언'만 제공합니다. "이 이름이 당신에게 이런 점에서 좋다", "이 글자가 더 어울린다" 같은 결론 위주로만 답합니다.
- 사용자가 이론·원리를 캐물으면: 명리 고전(연해자평, 자평진전, 적천수, 궁통보감, 삼명통회, 신봉통고) 중 관련된 것을 짧게 가리키고, 작명 이론은 "성명학 관련 책들이 많으니 직접 연구해보시라"고 일반적으로만 안내합니다. 책 제목을 지어내지 않습니다. 그 이상 깊은 해석은 정중히 거절합니다.
[태도]
- 따뜻하고 간결하게. 한두 문단 이내로 답합니다. 마크다운 기호(##, **)는 쓰지 않습니다.
- 추측이나 단정은 피합니다.`

const FAIL_REPLY = '연결이 잠시 불안정해요. 다시 한 번 여쭤봐 주세요.'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    const { messages, context } = body
    if (!Array.isArray(messages) || messages.length === 0) {
      // 화면이 멈추지 않도록 200 + reply 로 응답
      return NextResponse.json({ reply: FAIL_REPLY })
    }

    // 관리자 '어투 관리'의 공통 말투 (비었거나 오류면 기본값 폴백)
    // 영업비밀 보호 등 기능 규칙(SYSTEM_PROMPT)은 그대로 두고, 공통 어투만 앞에 얹는다.
    const toneBlock = await buildToneBlockFromDB()
    const systemPrompt = `${toneBlock}\n\n${SYSTEM_PROMPT}`

    let ctxLine = ''
    if (context) {
      const parts: string[] = []
      if (context.name) parts.push(`이름: ${context.name}`)
      if (context.yongsin) parts.push(`사주에 필요한 기운(용신): ${context.yongsin}`)
      if (context.sajuText) parts.push(`사주: ${context.sajuText}`)
      if (context.candidates) parts.push(`추천 한자: ${context.candidates}`)
      if (parts.length) ctxLine = `[참고 정보]\n${parts.join('\n')}`
    }

    const apiMessages = [
      ...(ctxLine
        ? [
            { role: 'user', content: ctxLine },
            { role: 'assistant', content: '네, 이름과 사주 정보를 확인했습니다. 무엇이 궁금하세요?' },
          ]
        : []),
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ]

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      return NextResponse.json({ reply: '죄송해요, 지금은 답변을 드릴 수 없어요.' })
    }

    const cRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: systemPrompt,
        messages: apiMessages,
      }),
    })

    // API가 200이 아니어도 화면이 멈추지 않게 reply 로 안내
    if (!cRes.ok) {
      console.error('naming-chat anthropic status:', cRes.status)
      return NextResponse.json({ reply: FAIL_REPLY })
    }

    const cData = await cRes.json()
    const text =
      Array.isArray(cData?.content)
        ? cData.content.find((c: { type: string }) => c.type === 'text')?.text || ''
        : ''
    return NextResponse.json({ reply: text.trim() || '죄송해요, 다시 한 번 여쭤봐 주세요.' })
  } catch (e) {
    console.error('naming-chat error:', e)
    // 절대 500을 던지지 않는다 — 화면이 멈추지 않도록 항상 reply
    return NextResponse.json({ reply: FAIL_REPLY })
  }
}
