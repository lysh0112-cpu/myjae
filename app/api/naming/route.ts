// app/api/naming/route.ts
// 작명 진단 API — "내 이름 풀이"
// 흐름: ① 진단 엔진(diagnoseName)으로 4요소 채점
//       ② Claude로 총평 생성 (공통 어투 + 작명 전용 지시문 반영)
//       ③ naming_results 테이블에 저장

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { diagnoseName, type NameChar } from '@/lib/saju/naming'
import { buildToneBlockFromDB } from '@/lib/ai/tonePrompt'

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

    // 관리자 '어투 관리'에서 설정한 공통 말투 (비었거나 오류면 기본값 폴백)
    const toneBlock = await buildToneBlockFromDB()

    // 작명·개명 전용 지시문 읽기 (관리자 화면 B. 작명 전용 칸)
    let namingGuide = ''
    if (supabase) {
      try {
        const { data } = await supabase
          .from('tone_settings')
          .select('naming_guide')
          .eq('id', 1)
          .maybeSingle()
        namingGuide = (data?.naming_guide || '').trim()
      } catch (e) {
        console.error('naming_guide load error:', e)
      }
    }

    // ---------- 2) Claude 총평 생성 (5관점 겸손 해설) ----------
    // 관점별 팩트를 근거로 넘기고, "좋다/나쁘다 판정 금지 + 특징 서술"로 생성.

    // 음양 서술용
    const yy = result.yinyang
    const yyLine = yy.strokes.map((s, i) => `${(body.given[i - 1]?.hanja) ?? body.surname.hanja}(${s}획·${yy.marks[i] === '양' ? '양' : '음'})`).join(' ')
    // 발음/자원 흐름 서술용
    const soundFacts = JSON.stringify(result.soundFlow.facts ?? {})
    const resourceFacts = JSON.stringify(result.resourceFlow.facts ?? {})

    const commentaryPrompt = `${toneBlock}

${namingGuide}

당신은 한국 전통 성명학에 정통한 작명가입니다. 아래 한 사람의 이름을 다섯 관점에서 풀이합니다. 이 글은 고객이 돈을 내고 받는 결과물이니, 품격 있고 정성스럽게 써 주세요.

[가장 중요한 원칙 — 반드시 지킬 것]
- 이름에 "좋다/나쁘다", "좋은 이름/나쁜 이름"으로 판정하지 마세요. 성명학은 학파마다 기준이 달라 단정할 수 없습니다.
- 대신 각 관점에서 이 이름이 "어떤 특징을 지니는지" 있는 그대로 서술하세요. 아쉬운 점도 "이렇게 보는 견해가 있다", "참고하시면 좋다"처럼 부드럽고 겸손하게 전하세요.
- 아래 제공된 '분석 데이터'의 사실(오행·획수·흐름·수리)만 근거로 삼고, 없는 내용을 지어내지 마세요.
- 마크다운 기호(##, **, -)는 절대 쓰지 마세요.
- 각 관점 해설은 세 부분으로: ①이 관점이 무엇을 보는지 간단히 → ②이 이름은 어떤지(제공된 사실 근거) → ③그것이 어떤 의미인지. 각 관점 3~5문장으로 넉넉히.

[이름]
${hangulName} (${hanjaName})
${body.sajuText ? `사주: ${body.sajuText}` : ''}
사주에 필요한 기운(용신): ${body.yongsin}

[분석 데이터]
1. 음양오행(획수 음양): ${yyLine} → ${yy.state === '조화' ? '홀수(양)와 짝수(음)가 섞여 조화' : yy.state === '순양' ? '모두 홀수(순양)로 치우침' : '모두 짝수(순음)로 치우침'}
   (순양·순음은 음양이 섞인 배열을 더 조화롭게 보는 견해가 있음. 좋고 나쁨의 문제가 아니라 특징으로 서술)
2. 발음오행(소리 기운): ${soundFacts}
   (각 글자 초성의 오행과 이웃 간 상생 여부. saeng=true는 서로 살려주는 흐름)
3. 수리오행(81수리 4격): ${suriText}
   (초년·청년·중년·말년 각 시기의 격과 길흉. 흉이 있어도 단정 말고 '부침이 있다 보는 견해가 있다'로)
4. 자원오행(한자 기운): ${resourceFacts}
   (각 한자 자원오행과 이웃 간 상생 여부)
5. 사주 보완(용신): 이 사주에 필요한 기운은 ${body.yongsin}. ${result.yongsinBohwan.detail}
   (이름의 자원오행이 용신을 담고 있으면 사주와 어우러진다고, 담지 못하면 그 기운을 담은 한자를 더하면 좋다고 제안형으로)

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "이 이름 풀이의 품격 있는 한 줄 제목",
  "eumyang": "1. 음양오행 관점 해설 (3~5문장)",
  "baleum": "2. 발음오행 관점 해설 (3~5문장)",
  "suri": "3. 수리오행 관점 해설 (3~5문장)",
  "jawon": "4. 자원오행 관점 해설 (3~5문장)",
  "yongsin": "5. 사주 보완(용신) 관점 해설 (3~5문장)",
  "conclusion": "다섯 관점을 아우르는 맺음말 3~4문장. 판정하지 말고, 이 이름의 특징을 짚은 뒤 '사주와 어우러진다' 혹은 '보완하고 싶다면 이런 기운을'처럼 따뜻하게 마무리"
}`

    let commentary: Record<string, string> = {
      title: '이름 풀이', eumyang: '', baleum: '', suri: '', jawon: '', yongsin: '', conclusion: '',
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
            max_tokens: 3500,
            messages: [{ role: 'user', content: commentaryPrompt }],
          }),
        })
        const cData = await cRes.json()
        const rawText = cData.content?.find((c: { type: string }) => c.type === 'text')?.text || '{}'
        const clean = rawText.replace(/```json|```/g, '').trim()
        try { commentary = JSON.parse(clean) } catch { commentary.conclusion = clean.slice(0, 300) }
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
