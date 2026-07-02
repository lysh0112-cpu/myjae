import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildToneBlockFromDB } from '@/lib/ai/tonePrompt'

export const runtime = 'nodejs'
export const maxDuration = 60

interface Body {
  prompt: string
  dayStem: string
  dayElement: string
  yongsin: string
  season: string
  seasonKo?: string   // 계절(한글)
  hourKo?: string     // 시간대(한글) — 예: "한낮(午시)"
  sceneDesc?: string  // 그림에 실제로 그려진 풍경 요약
  styleLabel: string
  style: string
  sajuText: string
  saju: unknown
  elementScores: unknown
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null

    // 관리자 '어투 관리'에서 설정한 공통 말투 (비었거나 오류면 기본값 폴백)
    const toneBlock = await buildToneBlockFromDB()

    // 물상도 전용 지시문 읽기 (관리자 화면 B. 물상도 전용 칸)
    let mulsangGuide = ''
    if (supabase) {
      try {
        const { data } = await supabase
          .from('tone_settings')
          .select('mulsang_guide')
          .eq('id', 1)
          .maybeSingle()
        mulsangGuide = (data?.mulsang_guide || '').trim()
      } catch (e) {
        console.error('mulsang_guide load error:', e)
      }
    }

    // ---------- 1) Claude 해설 생성 ----------
    // 프롬프트 = [공통 말투] + [물상도 전용 지시문] + [기능 뼈대: 그림 데이터·출력형식]
    const commentaryPrompt = `${toneBlock}

${mulsangGuide}

당신은 따뜻하면서도 정직한 명리학 전문가입니다.
아래 사주를 "자연 풍경 그림"에 빗대어 해설합니다. 이 해설은 고객이 돈을 내고 받는 결과물입니다.

[반드시 지킬 기능 규칙]
- 아래 '그림에 그려진 풍경'과 반드시 일치하게 설명하세요. 그림에 없는 것(예: 그림은 등불인데 태양이라고 하기, 그림에 없는 소나무를 언급하기)을 지어내지 마세요.
- 시간과 계절을 혼동하지 마세요. 아래 명시된 계절과 시간대를 정확히 사용하세요.
- 마크다운 기호(##, **, ---)는 절대 쓰지 마세요.

[이 사람의 정보]
사주: ${body.sajuText}
일간(그림의 주인공): ${body.dayStem}
태어난 계절: ${body.seasonKo || body.season}
태어난 시간대: ${body.hourKo || '시간 정보 없음'}
용신(가장 필요한 기운): ${body.yongsin}

[그림에 실제로 그려진 풍경]
${body.sceneDesc || body.prompt}

위 '그림에 그려진 풍경'과 일치하도록, 아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "이 풍경화의 제목 (그림 분위기와 맞게)",
  "subject": "주인공(일간) 해설 2~3문장 — 그림 속 주인공 대상이 곧 당신. 그림에 그려진 그대로 설명",
  "environment": "주변 풍경(다른 기운들) 해설 2~3문장 — 그림에 그려진 만큼만 설명. 사실대로, 강점 중심으로",
  "yongsin": "핵심 에너지(용신) 해설 2~3문장 — 그림 속 따뜻한 빛/물/땅의 의미와 그것이 주는 도움",
  "advice": "삶의 조언 2~3문장 — 팩트를 인정하되 희망적이고 실질적으로"
}`

    let commentary: Record<string, string> = {
      title: '당신의 사주 풍경', subject: '', environment: '', yongsin: '', advice: '',
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
        try { commentary = JSON.parse(clean) } catch { commentary.subject = clean.slice(0, 200) }
      } catch (e) {
        console.error('claude error:', e)
      }
    }

    // ---------- 2) gpt-image-1 그림 생성 ----------
    let imageUrl: string | null = null
    let imageNote = ''
    const openaiKey = process.env.OPENAI_API_KEY

    if (openaiKey) {
      try {
        const imgRes = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-image-1',
            prompt: body.prompt,
            n: 1,
            size: '1024x1024',
          }),
        })
        const imgData = await imgRes.json()
        const b64 = imgData.data?.[0]?.b64_json ?? null
        if (b64) {
          imageUrl = `data:image/png;base64,${b64}`
        } else {
          imageNote = 'image_failed'
          console.error('gpt-image response:', JSON.stringify(imgData).slice(0, 500))
        }
      } catch (e) {
        console.error('gpt-image error:', e)
        imageNote = 'image_error'
      }
    } else {
      imageNote = 'no_openai_key'
    }

    // ---------- 3) Supabase 저장 ----------
    let savedId: string | null = null
    if (supabase) {
      try {
        const { data } = await supabase
          .from('mulsang_images')
          .insert({
            saju: body.saju,
            element_scores: body.elementScores,
            day_master: body.dayStem,
            yongsin: body.yongsin,
            style: body.style,
            prompt: body.prompt,
            image_url: imageUrl ? '(stored inline)' : null,
            commentary,
          })
          .select('id')
          .single()
        savedId = data?.id ?? null
      } catch (e) {
        console.error('supabase insert error:', e)
      }
    }

    return NextResponse.json({ commentary, imageUrl, imageNote, savedId, prompt: body.prompt })
  } catch (e) {
    console.error('mulsang route error:', e)
    return NextResponse.json({ error: 'mulsang_failed' }, { status: 500 })
  }
}
