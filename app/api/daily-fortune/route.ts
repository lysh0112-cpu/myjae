// app/api/daily-fortune/route.ts
// 오늘의 운세 API (B방식: 얇은 계층)
//  - 하는 일: 내 사주 받음 → 오늘 간지(/api/lunar) → 용신 계산 → 100점 채점(dailyFortune.ts)
//             → Claude로 위로 톤 통변 + 명리 한 조각 생성 → JSON 반환
//  - 안 하는 일: DB 접근 없음. 저장(캐싱)은 마이페이지(브라우저)가 Supabase에 직접 함.
//  - Claude 호출 방식은 기존 /api/analyze 와 동일(모델·헤더·엔드포인트 통일).
//
// ※ 채점 배점·신살은 dailyFortune.ts의 잠정 기준. 연재 선생님 검수 후 조정 전제.

import { NextRequest, NextResponse } from 'next/server'
import { calcYongsin } from '@/lib/saju/yongsin'
import { scoreDailyFortune } from '@/lib/saju/dailyFortune'

// 간지 문자열 → {stem, branch} (기존 splitGanji 방식 동일)
function splitGanji(ganji: string): { stem: string; branch: string } {
  if (!ganji) return { stem: '?', branch: '?' }
  const match = ganji.match(/\(([^)]+)\)/)
  if (match && match[1].length >= 2) return { stem: match[1][0], branch: match[1][1] }
  if (ganji.length >= 2) return { stem: ganji[0], branch: ganji[1] }
  return { stem: '?', branch: '?' }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not set' }, { status: 500 })
    }

    // ── 마이페이지에서 넘겨주는 값 ──
    // saju: useResultSaju가 만든 [{pillar,stem,branch}...] 배열 (시·일·월·년주)
    // dayStem: 내 일간, iljji: 내 일지
    // nickname, ageGroup(선택): 통변 개인화용
    const body = await req.json()
    const { saju, dayStem, iljji, nickname, ageGroup } = body

    if (!saju || !dayStem || !iljji) {
      return NextResponse.json({ error: '사주 정보가 부족합니다.' }, { status: 400 })
    }

    // ── 1) 오늘 간지(일진) 구하기 : /api/lunar 그대로 호출 ──
    const now = new Date()
    // 한국 날짜 기준 (서버가 UTC일 수 있어 +9h 보정)
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
    const y = kst.getUTCFullYear()
    const m = kst.getUTCMonth() + 1
    const d = kst.getUTCDate()
    const fortuneDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`

    const origin = req.nextUrl.origin
    const lunarRes = await fetch(
      `${origin}/api/lunar?year=${y}&month=${m}&day=${d}&calType=양력&leapMonth=0`
    )
    const lunar = await lunarRes.json()
    if (lunar.error) {
      return NextResponse.json({ error: '오늘 간지 조회 실패' }, { status: 500 })
    }
    const today = splitGanji(lunar.dayGanji)

    // ── 2) 내 용신 계산 : 기존 엔진 그대로 ──
    const yongsinResult = calcYongsin(saju, dayStem)

    // ── 3) 100점 채점 : dailyFortune.ts ──
    const scored = scoreDailyFortune({
      myDayStem: dayStem,
      myDayBranch: iljji,
      yongsin: yongsinResult.yongsin,
      heeksin: yongsinResult.heeksin,
      gisin: yongsinResult.gisin,
      todayStem: today.stem,
      todayBranch: today.branch,
    })

    // ── 4) Claude로 위로 톤 통변 + 명리 한 조각 생성 ──
    const f = scored.flags
    const prompt = `당신은 따뜻하고 지혜로운 명리 상담가입니다. 아래 계산 결과를 바탕으로 "오늘의 운세"를 작성하세요.

[오늘 날짜] ${fortuneDate}
[오늘 일진] ${today.stem}${today.branch}
[상담자 일간] ${dayStem} / 일지 ${iljji}
[상담자 용신] ${yongsinResult.yongsin} / 희신 ${yongsinResult.heeksin}
${nickname ? `[호칭] ${nickname}님` : ''}
${ageGroup ? `[연령대] ${ageGroup}` : ''}

[계산된 판정 — 이 사실에 근거해 쓸 것]
- 총점 ${scored.total}점 (등급 ${scored.grade}, 별 ${scored.star}개)
- 오늘 천간 오행: ${f.todayElement} / 지지 오행: ${f.todayBranchElement}
- 오늘 천간의 십성: ${f.sipseong}
- 나와 오늘 천간 관계: ${f.stemRelation}
- 나와 오늘 지지 관계: ${f.branchRelation}
- 오늘 기운이 내 용신/희신인가: ${f.hitYongsin ? '그렇다(길)' : '아니다'}
- 오늘 기운이 내 기신인가: ${f.hitGisin ? '그렇다(주의)' : '아니다'}
- 천을귀인일: ${f.isGwiin ? '예(하늘이 돕는 날)' : '아니오'}
- 공망일: ${f.isGongmang ? '예(헛수고·분실 주의)' : '아니오'}

[작성 규칙]
1. 반드시 아래 JSON 형식으로만 출력. 앞뒤 설명·마크다운·백틱 금지.
2. 위로하는 따뜻한 말투. 단정·겁주기 금지("~한다" 대신 "~할 수 있어요/좋겠어요"). 나쁜 날도 대응법으로 마무리.
3. 매일 다른 문장으로. 뻔한 템플릿 느낌 배제.
4. 명리 용어는 최소화하되 근거는 위 판정을 따를 것. 이론·방법론은 노출하지 말고 결과만 전할 것.
5. 각 필드 길이: summary 3~4문장, love/money/health 각 1문장, insight 2~3문장.
6. lucky_color/lucky_dir는 용신 오행에 맞춰: 목=청록/동, 화=빨강/남, 토=노랑/중앙, 금=흰색/서, 수=검정·파랑/북.

[출력 JSON 형식]
{
  "summary": "오늘 총운 3~4문장",
  "love": "애정운 1문장",
  "money": "재물운 1문장",
  "health": "건강운 1문장",
  "lucky_color": "행운의 색",
  "lucky_dir": "행운의 방향",
  "insight": "오늘의 명리 한 조각: 오늘 일진(${today.stem}${today.branch})이 어떤 기운인지 쉬운 명리 상식 2~3문장"
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

    // Claude 응답에서 텍스트 추출 → JSON 파싱 (백틱 방어)
    let text = ''
    if (Array.isArray(aiData.content)) {
      text = aiData.content.filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('\n')
    }
    let parsed: Record<string, string> = {}
    try {
      const clean = text.replace(/```json|```/g, '').trim()
      parsed = JSON.parse(clean)
    } catch {
      // 파싱 실패 시 최소한의 폴백
      parsed = {
        summary: text || '오늘의 운세를 준비하는 중 문제가 생겼어요. 잠시 후 다시 확인해 주세요.',
        love: '', money: '', health: '',
        lucky_color: '', lucky_dir: '', insight: '',
      }
    }

    // ── 5) 마이페이지가 그대로 화면에 쓰고, daily_fortune에 저장할 형태로 반환 ──
    return NextResponse.json({
      fortune_date: fortuneDate,
      iljin_gan: today.stem,
      iljin_ji: today.branch,
      score: scored.star,          // 화면 별점 1~5
      total: scored.total,         // 참고용 100점
      grade: scored.grade,
      summary: parsed.summary ?? '',
      love: parsed.love ?? '',
      money: parsed.money ?? '',
      health: parsed.health ?? '',
      lucky_color: parsed.lucky_color ?? '',
      lucky_dir: parsed.lucky_dir ?? '',
      today_insight: parsed.insight ?? '',
    }, { status: 200 })

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
