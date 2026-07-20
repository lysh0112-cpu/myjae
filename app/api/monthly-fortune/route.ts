// app/api/monthly-fortune/route.ts
// 이달의 운세 AI 해설 API
//  - 하는 일: 계산 결과(점수·등급·지지관계 해설)를 받아 → Claude로 부드러운 문장 생성
//  - ⚠ 점수 계산은 화면(monthlyFortune.ts)에서 이미 끝났다. 여기서는 "글"만 만든다.
//  - 어투: 관리자 '어투 관리'의 공통 말투 + 오늘운세 지시문을 함께 쓴다.
//
// ★ 핵심 원칙 — 소스 문장을 부드럽게 옮기되, 없는 말을 지어내지 않는다.
//   심산 명리 원문은 상담사에게 하는 말이라 표현이 강하다.
//   ("정신적으로 문제가 발생한다" 같은 문장을 한 달 내내 보여줄 수는 없다)
//   그래서 원문을 재료로 주고, 순화 규칙을 프롬프트에 명시한다.

import { NextRequest, NextResponse } from 'next/server'
import { buildToneBlockFromDB } from '@/lib/ai/tonePrompt'
import { createClient } from '@supabase/supabase-js'

// 오늘운세 전용 지시문 읽기 (관리자 화면에서 관리)
async function loadFortuneGuide(): Promise<string> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return ''
    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { data } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', 'tone_fortune')
      .maybeSingle()
    return (data?.value as string) || ''
  } catch {
    return ''
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      year, month, monthStem, monthBranch,
      total, gradeLabel,
      envTag, envDesc, envGrade,
      selfTag, selfDesc, selfGrade,
      sameBranch,          // 월지·일지가 같은 사주인가
      dayStem, monthBranchMine, dayBranchMine,
      yongsin, heeksin,
      sipseong,
      nickname, ageGroup,
      prevTotal,           // 지난달 점수 (없으면 null)
    } = body

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'ANTHROPIC_API_KEY 없음' }, { status: 500 })
    }

    const toneBlock = await buildToneBlockFromDB()
    const fortuneGuide = await loadFortuneGuide()

    // 지지 관계 재료 — 월지·일지가 같으면 하나만 넘긴다
    const branchMaterial = sameBranch
      ? `- 이달 지지(${monthBranch})와 내 월지·일지(${monthBranchMine}): 등급 ${envGrade}, 관계 "${envTag}"
  원문: ${envDesc}`
      : `- 이달 지지(${monthBranch})와 내 월지(${monthBranchMine}) = 사회·환경: 등급 ${envGrade}, 관계 "${envTag}"
  원문: ${envDesc}
- 이달 지지(${monthBranch})와 내 일지(${dayBranchMine}) = 개인·건강: 등급 ${selfGrade}, 관계 "${selfTag}"
  원문: ${selfDesc}`

    const prompt = `${toneBlock}

${fortuneGuide}

당신은 따뜻하고 지혜로운 명리 상담가입니다. 아래 계산 결과를 바탕으로 "이달의 운세"를 작성하세요.

[대상 달] ${year}년 ${month}월 (${monthStem}${monthBranch}월)
[상담자 일간] ${dayStem} / 월지 ${monthBranchMine} / 일지 ${dayBranchMine}
[상담자 용신] ${yongsin} / 희신 ${heeksin}
${nickname ? `[호칭] ${nickname}님` : ''}
${ageGroup ? `[연령대] ${ageGroup}` : ''}

[계산된 판정 — 이 사실에 근거해 쓸 것]
- 총점 ${total}점 (${gradeLabel})
${prevTotal != null ? `- 지난달 ${prevTotal}점 → 이번 달 ${total}점 (${total > prevTotal ? '올라감' : total < prevTotal ? '내려감' : '비슷함'})` : ''}
- 이달 천간의 십성: ${sipseong}
${branchMaterial}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[★ 가장 중요한 규칙 — 문장 순화]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
위 "원문"은 명리 교재의 서술이라 표현이 강합니다.
상담자가 이 문장을 한 달 내내 보게 되므로, 아래 원칙에 따라 옮겨 쓰세요.

1. 원문 내용을 벗어나지 마세요. 없는 말을 지어내지 마세요.
2. 부정적 서술은 "조심할 것"으로 바꾸세요.
   예) "정신적으로 문제가 발생한다"
       → "마음이 쉽게 흔들릴 수 있으니 쉬는 시간을 넉넉히 두세요"
   예) "배신수가 있다"
       → "사람 사이에서 서운한 일이 생길 수 있으니 말을 아끼면 좋아요"
3. 원문에 긍정적인 면이 있으면 반드시 함께 쓰세요.
   예) 원진·귀문 → "감각이 예민해진다"는 곧 "촉이 좋아진다"는 뜻이기도 합니다.
       종교·예술·상담·연구처럼 촉이 필요한 일에는 오히려 유리한 시기입니다.
4. 원문에 직업·분야 이야기가 있을 때만 그것을 언급하세요. 없으면 쓰지 마세요.
5. "나쁜 달"이라고 단정하지 마세요. 어떤 달이든 쓰임이 있습니다.
6. 병·사고·이별 같은 말을 직접 쓰지 마세요. 건강은 "무리하지 않기" 정도로.
7. 명리 용어는 최소화하되, 근거는 위 판정을 따르세요.

[출력 규칙]
1. 반드시 아래 JSON 형식으로만 출력. 앞뒤 설명·마크다운·백틱 금지.
2. 길이: summary 3~4문장, love/money/health 각 1문장, insight 2~3문장.
3. lucky_color/lucky_dir는 용신 오행에 맞춰:
   목=청록/동, 화=빨강/남, 토=노랑/중앙, 금=흰색/서, 수=검정·파랑/북.

[출력 JSON 형식]
{
  "summary": "이달 총운 3~4문장",
  "love": "애정운 1문장",
  "money": "재물운 1문장",
  "health": "건강운 1문장",
  "lucky_color": "이달의 색",
  "lucky_dir": "이달의 방향",
  "insight": "이달의 명리 한 조각: 위 원문을 순화 규칙에 따라 다시 쓴 2~3문장. 좋은 면을 반드시 포함할 것."
}`

    const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }],
      }),
    })
    const aiData = await aiRes.json()

    let text = ''
    if (Array.isArray(aiData.content)) {
      text = aiData.content
        .filter((b: { type: string }) => b.type === 'text')
        .map((b: { text: string }) => b.text)
        .join('\n')
    }

    let parsed: Record<string, string> = {}
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      // AI가 실패해도 화면이 비지 않도록 — 원문을 그대로 넘긴다
      parsed = {
        summary: '',
        love: '', money: '', health: '',
        lucky_color: '', lucky_dir: '',
        insight: envDesc || '',
      }
    }

    return NextResponse.json({
      year, month,
      month_stem: monthStem,
      month_branch: monthBranch,
      total,
      summary: parsed.summary ?? '',
      love: parsed.love ?? '',
      money: parsed.money ?? '',
      health: parsed.health ?? '',
      lucky_color: parsed.lucky_color ?? '',
      lucky_dir: parsed.lucky_dir ?? '',
      insight: parsed.insight ?? '',
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
