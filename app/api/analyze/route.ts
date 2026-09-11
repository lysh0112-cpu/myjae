import { NextRequest, NextResponse } from 'next/server'
import { logAiError } from '@/lib/ai/errorLog'
import { requireUser } from '../admin/_guard'
import { aiSpeedBump } from '@/lib/ai/speedBump'

// ★2026-07-21: maxDuration 이 없으면 Vercel 기본값(10초)으로 돌아
//   긴 AI 응답이 도중에 잘린다. 오류도 안 나서 원인을 찾기 어렵다.
export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    /* ★로그인 확인 (2026-09-11 · 6부) — 몸통에 «AI 에게 시킬 글» 이 통째로 옵니다.
     *   ⚠️ 이 줄이 «없었습니다». 누구든 사장님 AI 열쇠로 아무 일이나 시킬 수 있었습니다.
     *   ⚠️ 정상적인 손님은 이미 «로그인 + 결제» 를 거쳐 옵니다 ⇒ 불편해질 손님이 없습니다.
     *   ⛔ 몸통을 읽기 «전» 에 둡니다 — 검사 ㉒-o 가 순서를 봅니다. */
    const g = await requireUser()
    if (!g.ok) return g.res
    //  🔴 ★6부 — AI 과속 방지턱: 한 사람이 10분에 20번을 넘게 부르면 막습니다 (검사 48 · 9월 11일 비용 사고)
    const bump = await aiSpeedBump(g.userId, 'analyze')
    if (!bump.ok) return bump.res

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not set' }, { status: 500 })
    }
    const body = await req.json()
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      signal: req.signal,   // ★6부 — 화면이 끊으면 AI 호출도 끊습니다 (검사 48 · 9월 11일 비용 사고)
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
