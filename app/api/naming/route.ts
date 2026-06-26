// app/api/naming/route.ts
// 작명 진단 API — "내 이름 풀이"
// 흐름: ① 진단 엔진(diagnoseName)으로 4요소 채점
//       ② Claude로 연재 선생님 톤의 총평 생성
//       ③ naming_results 테이블에 저장
// 물상도 API(app/api/mulsang/route.ts) 패턴을 그대로 따름 (그림 생성만 제외).

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { diagnoseName, type NameChar } from '@/lib/saju/naming'

export const runtime = 'nodejs'
export const maxDuration = 60

interface Body {
  surname: NameChar          // 성씨 (한글/한자/획수/자원오행)
  given: NameChar[]          // 이름 글자들
  yongsin: string            // 용신 (calcYongsin 결과)
  heeksin?: string           // 희신
  elementScore: Record<string, number> // 사주 오행 점수
  dayStem?: string           // 일간 (해설용)
  sajuText?: string          // 사주 8글자 문자열 (해설용)
  birthData?: unknown        // 생년월일 (저장용)
  saju?: unknown             // 사주 원본 (저장용)
  customerPhone?: string     // 연결된 고객 (있으면)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null

    // ---------- 1) 진단 엔진으로 4요소 채점 ----------
    const result = diagnoseName({
      surname: body.surname,
      given: body.given,
      yongsin: body.yongsin,
      heeksin: body.heeksin,
      elementScore: body.elementScore,
    })

    // 이름 문자열 (예: 柳承炫 / 류승현)
    const hanjaName = body.surname.hanja + body.given.map((g) => g.hanja).join('')
    const hangulName = body.surname.hangul + body.given.map((g) => g.hangul).join('')

    // 81수리 요약 (프롬프트용)
    const suriText = result.suri.gyeok
      .map((g) => `${g.label} ${g.name}(${g.fortune})`)
      .join(', ')

    // ---------- 2) Claude 총평 생성 ----------
    const commentaryPrompt = `당신은 따뜻하면서도 정직한 작명·명리학 전문가입니다.
아래는 한 사람의 이름이 그 사람의 사주에 얼마나 잘 맞는지 분석한 결과입니다.
이 해설은 고객이 받는 결과물입니다.

[매우 중요한 원칙]
- 100% 좋은 이름도, 100% 나쁜 이름도 없습니다. 사실(팩트)은 정확하게 설명하되, 그 안에서 강점과 가능성을 찾아 희망적으로 풀어주세요.
- 무조건 "좋습니다"라고 하지 마세요. 쓸쓸하거나 불안하게 끝내지도 마세요. 사실을 인정하되 나아갈 방향을 제시하는 것이 전문가의 역할입니다.
- 아쉬운 점이 있으면, 어떤 한자(오행)를 보완하면 더 좋아지는지 구체적으로 짚어주세요.
- 어려운 한자 용어보다 직관적 표현을 쓰세요. 마크다운 기호(##, **, ---)는 절대 쓰지 마세요.

[이름]
${hangulName} (${hanjaName})
${body.sajuText ? `사주: ${body.sajuText}` : ''}
사주에 필요한 기운(용신): ${body.yongsin}

[분석 결과]
용신 보완: ${result.yongsinBohwan.grade} — ${result.yongsinBohwan.detail}
자원오행 흐름: ${result.resourceFlow.grade} — ${result.resourceFlow.detail}
발음오행 흐름: ${result.soundFlow.grade} — ${result.soundFlow.detail}
81수리: ${result.suri.grade} (${suriText})
종합: ${result.overallGrade}

위 결과를 바탕으로, 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "이 이름 풀이의 한 줄 제목",
  "summary": "이름이 사주에 잘 맞는지 종합 평가 2~3문장. 사실대로, 강점 중심으로",
  "good": "이 이름의 좋은 점 2~3문장",
  "improve": "더 좋아질 수 있는 부분 1~2문장. 아쉬운 점이 있으면 어떤 오행의 한자를 보완하면 좋은지 구체적으로. 없으면 빈 문자열",
  "advice": "이름과 함께 살아갈 사람에게 주는 따뜻한 조언 1~2문장"
}`

    let commentary: Record<string, string> = {
      title: '이름 풀이', summary: '', good: '', improve: '', advice: '',
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (anthropicKey) {
      try {
        const cRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1500,
            messages: [{ role: 'user', content: commentaryPrompt }],
          }),
        })
        const cData = await cRes.json()
        const rawText = cData.content?.find((c: { type: string }) => c.type === 'text')?.text || '{}'
        const clean = rawText.replace(/```json|```/g, '').trim()
        try { commentary = JSON.parse(clean) } catch { commentary.summary = clean.slice(0, 300) }
      } catch (e) {
        console.error('claude error:', e)
      }
    }

    // ---------- 3) naming_results 저장 ----------
    let savedId: string | null = null
    if (supabase) {
      try {
        const { data } = await supabase
          .from('naming_results')
          .insert({
            customer_phone: body.customerPhone ?? null,
            type: '이름풀이',
            birth_data: body.birthData ?? null,
            saju: body.saju ?? null,
            yongsin: body.yongsin,
            surname: body.surname.hanja,
            candidates: {
              hangulName,
              hanjaName,
              result,       // 4요소 채점 결과
              commentary,   // AI 총평
            },
          })
          .select('id')
          .single()
        savedId = data?.id ?? null
      } catch (e) {
        console.error('supabase insert error:', e)
      }
    }

    return NextResponse.json({
      hangulName,
      hanjaName,
      result,
      commentary,
      savedId,
    })
  } catch (e) {
    console.error('naming route error:', e)
    return NextResponse.json({ error: 'naming_failed' }, { status: 500 })
  }
}
