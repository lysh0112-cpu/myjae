import { NextRequest, NextResponse } from 'next/server'
import { requireMaster } from '../admin/_guard'

export async function POST(req: NextRequest) {
  /* ★관리자 확인 (2026-09-11 · 6부 둘째) — 부르는 곳이 «0곳» 인데 열려 있었습니다.
   *   ⇒ 쓰는 사람이 없으니 ★관리자만 쓰게 잠갔습니다.
   *   ⚠️ 상담사 화면이 쓰게 되면 그때 문지기를 «직원» 으로 바꾸십시오.
   *   ⛔ 몸통을 읽기 «전» 에 둡니다 — 검사 ㉒-o 가 순서를 봅니다. */
  const g = await requireMaster()
  if (!g.ok) return g.res
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    if (!file) return NextResponse.json({ error: '파일 없음' }, { status: 400 })

    const arrayBuffer = await file.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      signal: req.signal,   // ★6부 — 화면이 끊으면 AI 호출도 끊습니다 (검사 48 · 9월 11일 비용 사고)
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
