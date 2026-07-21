import { NextRequest, NextResponse } from 'next/server'
import { logAiError } from '@/lib/ai/errorLog'

// ★2026-07-21: maxDuration 이 없으면 Vercel 기본값(10초)으로 돌아
//   긴 AI 응답이 도중에 잘린다. 오류도 안 나서 원인을 찾기 어렵다.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) return NextResponse.json({ error: 'API key not set' }, { status: 500 })

    const { consultantName, customerPhone, chatText, sajuData, commentary, aiAnalysis } = await req.json()

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

    const aiAnalysisText = aiAnalysis ? `
【고객이 받은 AI 분석 결과】(참고 자료)
${aiAnalysis}
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
상담사 해설이 있으면 그 관점을 최우선으로 유지하고,
채팅 내용과 고객 AI 분석 결과로 자연스럽게 보완하세요.
${sajuText}
${commentaryText}
${aiAnalysisText}
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
    // 실패하면 content가 없어 빈 요약이 된다. 이유를 남긴다.
    if (!response.ok) await logAiError('summarize', response.status, data?.error || data)
    return NextResponse.json({ summary: data.content?.[0]?.text ?? '' })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
