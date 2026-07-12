// app/api/naming/route.ts
// 작명 진단 API — "내 이름 풀이" (5관점 겸손 해설판)
// 흐름: ① 진단 엔진(diagnoseName)으로 5관점 사실(facts) 산출
//       ② Claude로 5관점 3단 겸손 통변 생성 (관리자 어투 연동)
//       ③ naming_results 테이블에 저장
//
// ★ 방침(대표님 지시): "좋다/나쁘다" 판정 금지. 각 관점을 3단으로 겸손하게 서술.
//   3단 = ① 무엇을 보나(원리) → ② 이 이름은(사실) → ③ 어떤 의미인가(서술).
//   통변 문구의 세부 톤은 관리자 어투(tone_settings)로 조율. 프롬프트는 뼈대만.

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { diagnoseName, type NameChar } from '@/lib/saju/naming'
import { buildToneBlockFromDB } from '@/lib/ai/tonePrompt'

export const runtime = 'nodejs'
export const maxDuration = 60

interface Body {
  surname: NameChar
  given: NameChar[]
  yongsin: string
  heeksin?: string
  elementScore: Record<string, number>
  dayStem?: string
  sajuText?: string
  birthData?: unknown
  saju?: unknown
  customerPhone?: string
  // 저장 메타(누구 이름인지) — 보관함 관계 배지용
  personTitle?: string    // 예: "아내", "큰딸", 본인이면 생략/이름
  personRelation?: string // 예: "배우자", "자녀", "본인"
}

// 5관점 통변 기본값 (AI 실패 시 폴백 — 빈 문자열로 화면이 깨지지 않게)
function emptyCommentary() {
  return {
    title: '',
    yinyang: { intro: '', name: '', meaning: '' },   // ① 음양오행
    baleum: { intro: '', name: '', meaning: '' },    // ② 발음오행
    suri: { intro: '', name: '', meaning: '' },      // ③ 수리오행
    jawon: { intro: '', name: '', meaning: '' },     // ④ 자원오행
    yongsin: { intro: '', name: '', meaning: '' },   // ⑤ 사주와의 만남
    conclusion: '',                                   // 맺음말
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const supabase = supabaseUrl && supabaseKey
      ? createClient(supabaseUrl, supabaseKey)
      : null

    // ---------- 1) 진단 엔진으로 5관점 사실 산출 ----------
    const result = diagnoseName({
      surname: body.surname,
      given: body.given,
      yongsin: body.yongsin,
      heeksin: body.heeksin,
      elementScore: body.elementScore,
    })

    const hanjaName = body.surname.hanja + body.given.map((g) => g.hanja).join('')
    const hangulName = body.surname.hangul + body.given.map((g) => g.hangul).join('')

    // 관리자 '어투 관리' 공통 말투
    const toneBlock = await buildToneBlockFromDB()

    // 작명·개명 전용 지시문 (관리자 화면 B. 작명 전용 칸)
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

    // ---------- 2) Claude 5관점 3단 겸손 통변 ----------
    // AI에는 "사실(facts)"만 근거로 주고, 판정 대신 겸손한 서술을 시킨다.
    const factsForAI = {
      음양오행: result.yinYang.facts,
      발음오행: result.soundFlow.facts,
      수리오행: result.suri.facts,
      자원오행: result.resourceFlow.facts,
      사주보완: result.yongsinBohwan.facts,
    }

    const commentaryPrompt = `${toneBlock}

${namingGuide}

당신은 따뜻하면서도 정직한 성명학·명리학 전문가입니다.
아래는 한 사람의 이름을 성명학의 다섯 관점(음양오행·발음오행·수리오행·자원오행·사주보완)으로 분석한 "사실 데이터"입니다.
이 사실만을 근거로, 고객이 받아볼 겸손한 해설을 작성하세요.

[반드시 지킬 원칙]
- "좋다/나쁘다/좋은 이름/나쁜 이름"으로 단정하지 마세요. 판정하지 않습니다.
- 대신 "~보는 견해가 있습니다", "참고하시면 좋습니다", "~라 볼 수 있습니다" 같은 절제된 어조로 특징만 서술합니다.
- 흉/부침이 있는 부분도 숨기지 말되, 단정하지 말고 "이런 견해가 있어 참고하시라"는 정도로 담담히 전합니다.
- 상생 관계(예: 土生金, 木生火)는 근거로 정확히 제시합니다. 사실 데이터에 없는 내용은 지어내지 마세요.
- 전문적이되 따뜻하고 담백하게. 마크다운 기호(##, **, ---)는 쓰지 마세요.

[각 관점은 3단 구조로]
- intro(무엇을 보나): 이 관점이 성명학에서 무엇을, 왜 보는지 원리를 2~4문장으로 교양있게 설명. (이름마다 크게 달라지지 않는 일반 설명)
- name(이 이름은): 이 이름의 실제 글자·획수·오행·격을 사실 그대로 1~2문장.
- meaning(어떤 의미인가): 그 사실이 어떤 결·흐름을 지니는지 2~4문장으로 겸손하게 서술.

[이름]
${hangulName} (${hanjaName})
${body.sajuText ? `사주: ${body.sajuText}` : ''}
사주에 필요한 기운(용신): ${body.yongsin}

[5관점 사실 데이터(JSON)]
${JSON.stringify(factsForAI, null, 2)}

아래 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "title": "이 이름 풀이를 한 줄로 요약한 따뜻한 제목",
  "yinyang":  { "intro": "", "name": "", "meaning": "" },
  "baleum":   { "intro": "", "name": "", "meaning": "" },
  "suri":     { "intro": "", "name": "", "meaning": "" },
  "jawon":    { "intro": "", "name": "", "meaning": "" },
  "yongsin":  { "intro": "", "name": "", "meaning": "" },
  "conclusion": "다섯 관점을 아우르는 겸손한 맺음말 3~5문장. 판정하지 말고, 이름과 사주가 어우러지는 결을 전하며 '좋고 나쁨으로 가르기보다 더불어 살아가는 것'이라는 태도로 마무리."
}`

    let commentary: Record<string, unknown> = emptyCommentary()

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
        try {
          commentary = { ...emptyCommentary(), ...JSON.parse(clean) }
        } catch {
          // JSON이 중간에 잘린 경우: 마지막 완전한 '}' 까지만 잘라 재파싱 시도
          let recovered: Record<string, unknown> | null = null
          const lastBrace = clean.lastIndexOf('}')
          if (lastBrace > 0) {
            for (let end = lastBrace; end > 0; end = clean.lastIndexOf('}', end - 1)) {
              try {
                recovered = JSON.parse(clean.slice(0, end + 1))
                break
              } catch { /* 계속 앞쪽 } 로 시도 */ }
            }
          }
          if (recovered) {
            commentary = { ...emptyCommentary(), ...recovered }
          } else {
            // 복구 불가 → 원본(JSON 텍스트)을 화면에 노출하지 않는다. 빈 통변으로 두고 실패 표시.
            commentary = emptyCommentary()
          }
        }
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
              personTitle: body.personTitle ?? null,
              personRelation: body.personRelation ?? null,
              result,       // 5관점 사실 데이터
              commentary,   // 5관점 3단 통변
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
