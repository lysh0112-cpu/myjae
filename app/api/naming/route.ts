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
import { splitSurname } from '@/lib/saju/surname'
import { diagnoseName, type NameChar } from '@/lib/saju/naming'
// ★2026-07-30 (2단계) — 자원오행 통합 판정
import {
  buildSajuOhaengProfile, judgeResource, resourceFactsBlock,
  birthOrderCautionBlock,
  type JudgeChar, type PillarLike,
} from '@/lib/saju/resourceJudge'
import { normalizeOhaeng, cleanHanja } from '@/lib/saju/ohaeng'
// ★2026-07-30 (3단계-b) — 화면 표시용 별점 (대표님 지시)
import { perspectiveStars, overallStar } from '@/lib/saju/starRating'
import { W_FLOW, W_YONGSIN, W_BALANCE } from '@/lib/saju/resourceJudge'
import { buildToneBlockFromDB } from '@/lib/ai/tonePrompt'
// ★2026-07-30 (3단계) — 관리자 🚨 AI 오류 탭에 남깁니다. naming 만 이것을 안 불렀습니다.
import { logAiError, guessHint } from '@/lib/ai/errorLog'

/** NameChar(문자열 오행) → JudgeChar(정규화된 Ohaeng|null) */
function toJudgeChar(c: NameChar): JudgeChar {
  return {
    hanja: cleanHanja(c.hanja) || c.hanja,
    hangul: c.hangul,
    primary: normalizeOhaeng(c.resourceOhaeng),
    secondary: null,   // ★2단계 DB 컬럼(resource_ohaeng_secondary)이 들어오면 여기 채웁니다
  }
}

export const runtime = 'nodejs'
// ★★2026-07-30 (3단계-d) — 60 → 300.
//   [무엇이 있었나]  max_tokens 를 12,000 으로 올린 뒤 실기기에서
//     HTTP 504 FUNCTION_INVOCATION_TIMEOUT 이 났습니다.
//     3,500 일 때는 «잘리면서» 60초 안에 끝났고, 상한을 올리자 끝까지 쓰느라 넘겼습니다.
//   [왜 300 인가]  형제 라우트 /api/tongbyeon 이 300 입니다. 같은 Anthropic 호출인데
//     naming 만 60 이었습니다. (교훈 DT — 잘 되는 형제와 «보내는 값» 을 대조하라)
//   ⚠️ Vercel 은 요금제 상한까지만 줍니다. Hobby 면 300 을 적어도 60초에서 끊깁니다.
//      그때는 아래 max_tokens 를 더 줄이거나 관점을 나눠 부르는 쪽입니다(4단계).
export const maxDuration = 300

interface Body {
  surname: NameChar
  given: NameChar[]
  yongsin: string
  heeksin?: string
  elementScore: Record<string, number>
  // ★2026-07-30 (2단계) — 지금까지 «버리던» 값들을 받습니다.
  //   calcYongsinCompat 이 이미 주고 있었는데 naming 만 안 받았습니다.
  //   ⚠️ 모두 선택값입니다. 안 보내면 예전과 똑같이 돕니다(옛 화면이 안 깨집니다).
  gisin?: string
  gusin?: string
  hansin?: string
  isStrong?: boolean
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
    // ★2026-08-01 (43부 17차) — 선명장에 실을 «요약 총평» (화면 글과 별개)
    chongpyeong: '',
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
    // ★2026-07-31 복성 안전망 — 화면이 «남궁민수» 를 성「남」+이름「궁민수」로
    //   갈라 보내도 여기서 성「남궁」+이름「민수」로 되돌립니다.
    const sp = splitSurname([body.surname, ...body.given])
    const result = diagnoseName({
      surname: sp.surname[0] ?? body.surname,
      surname2: sp.surname[1] ?? null,
      given: sp.given,
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

    // ★★2026-07-30 (2단계) — 자원오행 통합 판정을 «덧붙입니다».
    //   [무엇이 달라지나] 옛 facts 는 «이웃 글자끼리 상생인가» 뿐이었습니다.
    //     여기서 더해지는 것 —
    //       · 상극을 «방향까지» 가림 (순극/역극)
    //       · 과다 오행 중복 투입 경고        ← 옛 로직에 아예 없던 판정
    //       · 결핍·고립 오행 보충 가산        ← 없던 판정
    //       · 기신·구신 투입 경고             ← 재료조차 안 받던 값
    //       · 보완하는 글자가 만든 상극은 예외 (대표님 지시 ④)
    //   ⚠️ 옛 5관점 facts 는 «지우지 않았습니다». 화면·파서가 그대로 돕니다.
    //      새 판정은 자원오행/사주보완 두 관점의 «근거를 넓히는» 역할입니다.
    //   ⚠️ 점수(score·breakdown)는 프롬프트에 넣지 않습니다.
    //      숫자를 주면 AI 가 「85점입니다」 처럼 판정해 버립니다. (대표님 방침)
    const profile = buildSajuOhaengProfile(
      {
        isStrong: body.isStrong,
        yongsin: body.yongsin, heeksin: body.heeksin,
        gisin: body.gisin, gusin: body.gusin, hansin: body.hansin,
        score: body.elementScore,
      },
      Array.isArray(body.saju) ? (body.saju as PillarLike[]) : null,
    )
    // ★2026-07-31 복성 — 위에서 갈라 둔 sp 를 그대로 씁니다.
    //   body.given 을 쓰면 복성 둘째 글자(穹)가 이름 글자로 채점됩니다.
    const givenJudge = sp.given.map(toJudgeChar)
    const verdict = judgeResource(sp.surname.map(toJudgeChar), givenJudge, profile)
    // ★2026-07-30 (4단계) — 형제 서열을 가려 쓰는 글자가 있으면 «참고» 로만 안내합니다.
    //   ⚠️ 감점하지 않습니다. 폼이 «몇째» 를 묻지 않고, 교재 표의 해석도 갈립니다.
    //   ⚠️ 걸린 글자가 없으면 빈 문자열이라 프롬프트에 블록이 «아예» 안 들어갑니다. (교훈 BF)
    const birthOrderCaution = birthOrderCautionBlock(givenJudge)

    const factsForAI = {
      음양오행: result.yinYang.facts,
      발음오행: result.soundFlow.facts,
      수리오행: result.suri.facts,
      자원오행: result.resourceFlow.facts,
      사주보완: result.yongsinBohwan.facts,
      // ══════════════════════════════════════════════════════════════
      //  ★2026-08-01 — 재료를 «두 바구니로 갈랐습니다». (대표님 지시)
      //
      //   [무엇이 문제였나]
      //     verdict.facts 를 통째로 「자원오행_정밀」이라는 «이름» 으로 넘겼습니다.
      //     그 안에는 사주와의 관계(약한 기운을 누르는가·넘치는가·기신인가)가
      //     대부분인데, 이름이 「자원오행」이라 AI 가 그것을 «四 자원오행» 대목에 썼습니다.
      //     → 四 에 사주 이야기가 섞이고, 五 와 같은 말을 두 번 했습니다.
      //
      //   ★재료의 «이름» 이 곧 AI 에게 주는 지시입니다. 이름을 바로잡습니다.
      //     四 는 «한자끼리», 五 는 «사주와 이름» — 바구니가 갈리면 섞이지 않습니다.
      // ══════════════════════════════════════════════════════════════
      자원오행_글자끼리: {
        chain: verdict.facts.chain,
        links: verdict.facts.links,
        flowAvg: verdict.facts.flowAvg,
        surnameOhaeng: verdict.facts.surnameOhaeng,
        givenOhaengs: verdict.facts.givenOhaengs,
        clashExemptCount: verdict.facts.clashExemptCount,
      },
      사주와의만남_정밀: {
        yongsin: verdict.facts.yongsin,
        heeksin: verdict.facts.heeksin,
        gisin: verdict.facts.gisin,
        hasYongsin: verdict.facts.hasYongsin,
        hasYongsinSecondary: verdict.facts.hasYongsinSecondary,
        hasHeeksin: verdict.facts.hasHeeksin,
        yongsinChars: verdict.facts.yongsinChars,
        excessAdded: verdict.facts.excessAdded,
        lackFilled: verdict.facts.lackFilled,
        isolatedFilled: verdict.facts.isolatedFilled,
        gisinAdded: verdict.facts.gisinAdded,
        weakClashed: verdict.facts.weakClashed,
        // ★이 문장은 «누르는 자리를 말하는 그 대목» 에서만 씁니다 (위 원칙 참고)
        weakClashNote: verdict.facts.weakClashNote,
        sajuLevel: verdict.facts.sajuLevel,
      },
      형제서열_참고: birthOrderCaution || undefined,
      참고할자리: verdict.warnings,
      판정못한자리: verdict.problems,
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
- 수리오행을 쓸 때는 사실 데이터의 「수리오행.서술지침」과 각 격의 「gentle」 문장을 근거로 삼고, 그 어조를 그대로 유지하세요.
- ★성씨가 몇 글자인지는 사실 데이터의 「역할」·「복성여부」·「성씨」·「이름」 항목으로 확인하세요. 복성(두 글자 성씨)이면 두 글자를 묶어 하나의 성씨로 부르고, 성씨의 둘째 글자를 이름 글자처럼 다루지 마세요.
- 오행이 이어지는 자리를 말할 때는 「links」의 「구간」(성씨 안 / 성씨→이름 / 이름 안)을 그대로 따르세요. 어느 글자에서 어느 글자로 가는지 사실 데이터와 다르게 적지 마세요.
- ★사실 데이터에 「weakClashNote」가 채워져 있으면, 그 문장을 «있는 그대로 한 번만» 옮겨 적으세요. 늘리거나 바꿔 쓰지 마세요. 비어 있으면 건강을 아예 언급하지 마세요.
- ★★그 문장을 «어디에» 두는지가 중요합니다. (2026-08-01 대표님 지시)
  · 「이름의 어느 글자가 사주의 약한 기운을 누른다」고 말한 «바로 그 자리» 에 붙이세요.
  · ⚠️ 관점의 «마지막 문장» 으로 쓰지 마세요. 좋은 이야기 끝에 갑자기 건강 당부가 붙으면
    앞뒤가 이어지지 않아 손님이 놀랍니다.
  · 누르는 자리를 말하지 않는 대목에서는 그 문장을 «꺼내지 마세요».

[★관점끼리 역할을 나눕니다 — 2026-08-01 대표님 지시]
- jawon(자원오행)에는 «한자끼리» 의 이야기만 담으세요.
  글자에 담긴 자원오행이 서로 어떻게 잇고 누르는지, 그 결이 어떤지.
  ⚠️ 「사주에 무엇이 약한데 이 글자가 그것을 누른다」 같은 «사주와의» 이야기를 여기 섞지 마세요.
- yongsin(사주와의 만남)에 «사주와 이름의» 이야기를 모으세요.
  용신·희신을 담았는가, 사주의 약하거나 넘치는 기운과 어떻게 만나는가, weakClashNote.
- ★두 관점이 같은 이야기를 두 번 하지 않게 하세요.

[★분량 — 화면 글은 «줄이지 마세요»]
- ★2026-08-01 대표님 지시 —
  「내 이름 정밀분석 내용은 줄이지 말고, 그 내용들을 «요약» 해서 선명장에 실어라」
- ⚠️⚠️ 다섯 관점(yinyang·baleum·suri·jawon·yongsin)과 conclusion 은
     «화면에서 손님이 읽는 글» 입니다. 상한을 두지 «않습니다». 넉넉히 쓰세요.
     ★전에는 여기에 800자 상한이 있었습니다. 종이(선명장) 때문이었는데,
       그 때문에 «화면 글이 얇아졌습니다». 상한을 걷어냈습니다.
- ★yongsin 의 「name」도 다른 관점과 «똑같이» 1~2문장으로 쓰세요.
  ⚠️ 여기에도 60자 상한이 있었습니다. 선명장 머리줄로 쓰려던 것인데,
     그것 역시 «종이 사정으로 화면을 줄이는» 일이었습니다. 걷어냈습니다.
     길면 종이 쪽에서 알아서 줄입니다.
- ★종이에 들어갈 짧은 글은 «따로» 씁니다 — 아래 chongpyeong 을 보세요.

[★chongpyeong — 撰名狀(선명장)에 실을 «總評»]
- ★이것은 «위 글을 줄인 것» 이 아니라 «요약해 새로 쓴» 한 덩이 글입니다.
  A4 한 장짜리 종이 증서의 總評 자리에 들어갑니다. 손님 손에 오래 남습니다.
- ⚠️⚠️ «450자 안쪽» 으로. 문단을 나누지 말고 «한 덩이» 로 쓰세요.
  [왜]  종이가 한 장입니다. 넘치면 글자가 작아지거나 문장이 잘립니다.
        ★잘린 문장이 찍힌 증서를 드릴 수는 없습니다.
- 담을 것 — ① 이름이 사주의 «어떤 기운» 을 채우거나 덜어 주는가
             ② 수리 4격의 흐름이 어떠한가 (한두 마디로)
             ③ 부르는 사람과 함께 채워 가는 이름이라는 맺음
- 어조는 전통 증서에 어울리게 «담담하고 정갈하게». 다만 옛투로 꾸미지 마세요.
- ⚠️ 화면 글에 없는 이야기를 «새로 지어내지» 마세요. 위 다섯 관점 안에서만 추리세요.
- ⚠️ 「매우 좋은 이름입니다」 같은 «단정» 을 쓰지 마세요. 화면과 같은 태도를 지키세요.

[★yongsin(사주와의 만남)의 맺음]
- 마지막 문장은 «개운» 의 말로 맺으세요. 이름이 사주를 어떻게 돕는지에 초점을 둡니다.
  예) "사주에 부족한 기운을 보완하여 삶의 흐름을 한층 윤택하게 돕는 이름으로 볼 수 있습니다."
  ⚠️ 다만 사실 데이터가 «용신을 담지 못했다» 고 하면 이렇게 쓰지 마세요.
     그때는 무엇을 더 살피면 좋을지로 담담히 맺으세요.

[★어투 — 비문을 막습니다]
- 「~로 봅니다」와 「~는 견해」를 «겹쳐 쓰지» 마세요.
  ✖ "…여리게 하는 자리로 봅니다는 견해가 있어"     ← 말이 어긋납니다
  ○ "…여리게 하는 자리로 본다는 견해가 있어"
  ○ "…여리게 하는 자리로 보는 견해가 있어"
  ○ "…여리게 하는 자리로 봅니다."
- 문장을 끝맺기 전에 «어미가 두 번 겹치지 않았는지» 한 번 살피세요.
- ★몸·질병·장기·수명에 대해서는 위 문장 밖의 어떤 말도 덧붙이지 마세요. 어느 부위가 약하다는 식의 이야기는 사실 데이터에 없습니다.

[각 관점은 3단 구조로]
- ★★아래 문장 수는 «바닥» 입니다. «천장이 아닙니다». (2026-08-01 대표님 지시)
  「이 정도의 분량은 «항상» 나와야 한다」
  ⚠️⚠️ 문장 수를 맞추려고 «할 말을 덜어내지» 마세요.
     사실 데이터에 근거가 있으면 더 쓰십시오. 줄이는 쪽으로 기울지 마세요.
- intro(무엇을 보나): 이 관점이 성명학에서 무엇을, 왜 보는지 원리를 «3문장 이상» 교양있게 설명. (이름마다 크게 달라지지 않는 일반 설명)
- name(이 이름은): 이 이름의 실제 글자·획수·오행·격을 사실 그대로 «1~2문장».
- meaning(어떤 의미인가): 그 사실이 어떤 결·흐름을 지니는지 «5문장 이상» 겸손하게 서술.
  ★어느 글자에서 어느 글자로 이어지는지, 그것이 사주와 어떻게 만나는지,
    무엇을 참고하면 좋을지까지 «낱낱이» 풀어 주세요.
- conclusion(맺음): 다섯 관점을 아우르는 맺음말을 «5문장 이상».

[★분량의 «기준선» — 2026-08-01]
- 아래만큼은 «항상» 나와야 합니다. 이보다 얇으면 잘못 쓴 것입니다.
  · 다섯 관점 각각 — intro 3문장 이상 · name 1~2문장 · meaning 5문장 이상
  · conclusion — 5문장 이상
- ⚠️ 이 기준선은 «종이(선명장) 사정과 아무 상관이 없습니다».
  종이에 실을 짧은 글은 chongpyeong 으로 «따로» 받습니다.
  ★종이 때문에 화면 글을 줄이는 일은 «다시는» 없어야 합니다.

[이름]
${hangulName} (${hanjaName})
${body.sajuText ? `사주: ${body.sajuText}` : ''}
사주에 필요한 기운(용신): ${body.yongsin}

[★자원오행과 사주의 관계 — 사람이 읽는 정리]
${resourceFactsBlock(verdict, profile)}
${birthOrderCaution ? `\n${birthOrderCaution}` : ''}

[★위 «참고하실 자리» 를 다루는 법]
- 숨기지 마세요. 다만 «좋다/나쁘다» 로 가르지 말고 "이런 견해가 있어 참고하시라"는 정도로 담담히 전하세요.
- 특히 「이미 넉넉한 기운」과 「꺼리는 기운」은 자원오행 또는 사주보완 대목에서 한 번은 짚어 주세요.
- 서로 누르는 자리가 있으나 «사주를 보완하는 글자» 라 흠으로 보지 않는다고 적혀 있으면, 그 사정을 함께 전하세요.
- ⚠️⚠️ **「사주가 꺼리는 기운(기신)」과 「도움이 덜 되는 기운(구신)」을 «채우라·보태라·가꾸라» 고 권하지 마세요.**
  그 기운이 사주에 비어 있다면 그것은 아쉬움이 아니라 편한 자리입니다.
  비어 있는 기운을 «가꾸라» 고 권하는 것은 «바라는 기운(용신·희신)» 에만 해당합니다.
- ⚠️ 「점수」·「등급」·「몇 점」 같은 말을 쓰지 마세요. 손님에게 점수를 보여 주지 않습니다.
- ⚠️ 위에 적히지 않은 오행·글자·관계를 지어내지 마세요.

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
  "conclusion": "다섯 관점을 아우르는 겸손한 맺음말. 판정하지 말고, 이름과 사주가 어우러지는 결을 전하며 '좋고 나쁨으로 가르기보다 더불어 살아가는 것'이라는 태도로 마무리. ★분량 상한 없음 — 화면 글입니다.",
  "chongpyeong": "★撰名狀(종이 증서)에 실을 總評. 위 글들을 «요약해 새로 쓴» 한 덩이 글. ⚠️450자 안쪽, 문단 나누지 말 것. 이름이 사주의 어떤 기운을 채우는가 · 수리의 흐름 · 부르는 사람과 함께 채워 가는 이름이라는 맺음."
}`

    let commentary: Record<string, unknown> = emptyCommentary()
    // ★실패 이유를 «버리지 않습니다». 화면이 «빈 칸» 과 «실패» 를 구별할 수 있게 돌려줍니다.
    let aiFailStatus: number | null = null
    let aiFailHint: string | null = null

    const anthropicKey = process.env.ANTHROPIC_API_KEY
    if (!anthropicKey) {
      // ★전에는 조용히 빈 통변을 내보냈습니다. 키 미설정과 «잘 됐는데 비었다» 가 구별이 안 됐습니다.
      console.error('naming: ANTHROPIC_API_KEY 가 없습니다')
      aiFailStatus = 0
      aiFailHint = 'AI 열쇠(ANTHROPIC_API_KEY)가 설정되지 않았어요'
    }
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
            // ★★2026-07-30 (3단계) — 3,500 → 12,000.
            //
            //   [무엇이 문제였나]  5관점 × 3단(intro/name/meaning) + 맺음말 JSON 입니다.
            //     우리말 한 대목이 200~300자면 5관점만 3,000~4,500자 ≒ 4,500~6,500 토큰이고,
            //     JSON 따옴표·키까지 더하면 3,500 으로는 «뒤가 잘립니다».
            //     ★아래에 «JSON 이 잘렸을 때 되살리는» 복구 코드가 있다는 것이
            //       곧 실제로 잘리고 있었다는 증거입니다.
            //     그리고 2단계가 자원오행 재료를 늘렸으므로 잘림 위험이 더 커졌습니다.
            //
            //   ⚠️ 상한으로 자르지 말고 «분량 지시» 로 줄이십시오. (교훈 DS)
            //      상한으로 자르면 문장 중간에서 끊기고, 분량 지시로 줄이면 말이 온전합니다.
            //      느리다고 느껴지면 프롬프트의 «2~4문장» 을 줄이는 쪽입니다.
            //   ★2026-07-30 (3단계-d) — 12,000 → 7,000 으로 내렸습니다.
            //     [실측]  5관점 × 3단 + 맺음말 ≒ 39문장 ≒ 2,150자 ≒ 3,200~4,300 토큰.
            //       3,500 은 «딱 경계» 라 잘렸고(그래서 복구 코드가 있었습니다),
            //       12,000 은 세 배라 끝까지 쓰느라 60초를 넘겼습니다.
            //       7,000 이면 두 배 여유이고 시간도 넉넉합니다.
            //   ⚠️ 그래도 느리면 상한이 아니라 «분량 지시»(아래 2~4문장)를 줄이십시오. (교훈 DS)
            max_tokens: 7000,
            messages: [{ role: 'user', content: commentaryPrompt }],
          }),
        })
        // ★★2026-07-30 (3단계) — 상태코드를 «버리지 않습니다».
        //
        //   [무엇이 문제였나]  전에는 cRes.ok 를 보지 않고 바로 .json() 을 했습니다.
        //     401(키)·429(한도)·529(붐빔)·크레딧 부족이 와도 cData.content 가 없어
        //     rawText 가 '{}' 가 되고 → emptyCommentary() → **200 OK 로 빈 통변**이 나갔습니다.
        //     손님 화면은 «빈 칸» 이고, 원인을 갈라볼 방법이 없었습니다.
        //
        //   [그리고 관리자 🚨 AI 오류 탭에 안 남았습니다]
        //     tongbyeon·mulsang·analyze·summarize·chat-stream·daily·monthly 일곱 라우트는
        //     logAiError 를 부르는데 naming 만 0건이었습니다.
        //     → 개명 실패는 /admin 어디에도 흔적이 없었습니다.
        if (!cRes.ok) {
          let why = ''
          try { why = (await cRes.text()).slice(0, 400) } catch { /* 본문을 못 읽어도 status 는 남는다 */ }
          console.error('naming claude error:', cRes.status, why)
          await logAiError('naming', cRes.status, why || { status: cRes.status })
          aiFailStatus = cRes.status
          aiFailHint = guessHint(cRes.status, why)
          throw new Error(`claude ${cRes.status}`)
        }
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

    // ★2026-07-30 (3단계-b) — 관점별 별점 (대표님 지시)
    //   ⚠️ 별을 «만드는» 것은 여기이고, «보여 줄지» 는 화면이 정합니다.
    //      AI 프롬프트는 건드리지 않았습니다 — AI 는 여전히 점수·등급을 말하지 않습니다.
    //      화면은 별을 보여 주고 글은 담담히 서술합니다. 둘이 어긋나지 않습니다.
    const stars = perspectiveStars({
      flowScore: verdict.breakdown.flow, flowMax: W_FLOW,
      matchScore: verdict.breakdown.yongsin + verdict.breakdown.balance,
      matchMax: W_YONGSIN + W_BALANCE,
      hasYongsin: verdict.facts.hasYongsin,
      yinYangGrade: result.yinYang.grade,
      // ★2026-07-31 (40부) — 교재 125칸 정밀 점수. 화면도 «같은 값» 을 씁니다
      soundScore: result.soundFlow.score,
      suriGrade: result.suri.grade,
    })

    // ══════════════════════════════════════════════════════════════
    //  ★2026-08-01 (43부 16차) — 總評 분량이 «상한을 넘었는지» 재서 남깁니다
    //
    //   ★2026-08-01 (43부 17차) — 이제 «화면 글» 이 아니라 «요약 총평(chongpyeong)» 을 잽니다.
    //     [무엇이 달라졌나]  전에는 화면 글(yongsin+conclusion)에 800자 상한을 두었습니다.
    //       종이 때문이었는데, ★그 바람에 «화면 글이 얇아졌습니다».
    //       대표님 지시로 화면 글의 상한을 걷고, 종이용 요약을 «따로» 받습니다.
    //   [왜 재는가]  프롬프트의 450자는 «부탁» 입니다. AI 는 때때로 넘깁니다.
    //     넘긴 것을 «아무도 모르면» 어느 날 선명장에서 문장이 잘려 나가고,
    //     그제야 손님이 알려 주십니다.
    //   ⚠️ 여기서 «자르지» 않습니다 — 자르면 문장 가운데가 끊깁니다.
    //      종이 쪽(NamingCertificate)이 1,150자까지 담고, 넘으면 거기서 줄입니다.
    //   ⚠️ 이 숫자를 고치실 때는 NamingCertificate 의 CHONG_MAX 와 «함께» 보십시오.
    //      28-verify ⑲-B 가 두 숫자를 맞대어 잽니다.
    // ══════════════════════════════════════════════════════════════
    //   ⚠️ commentary 는 느슨한 모양이라 «조심스럽게» 꺼냅니다 — 없으면 0 입니다
    const cAny = commentary as {
      yongsin?: { name?: string; meaning?: string }
      conclusion?: string; chongpyeong?: string
    }
    const chongLen = (cAny.chongpyeong ?? '').length
    const CHONG_PROMPT_CAP = 450
    if (chongLen > CHONG_PROMPT_CAP) {
      console.warn(
        `[naming] 撰名狀 總評 분량 초과 — ${chongLen}자 (상한 ${CHONG_PROMPT_CAP}자) · ${hanjaName || hangulName}\n`
        + `  종이는 1,150자까지 담습니다. 자주 뜨면 프롬프트의 chongpyeong 지침을 다시 보십시오.`,
      )
    }
    // ⚠️ 요약이 «아예 비면» 종이가 옛 길(화면 글)로 갑니다 — 그것도 알아야 합니다
    if (!cAny.chongpyeong && (cAny.conclusion ?? '')) {
      console.warn(`[naming] chongpyeong 이 비었습니다 — 선명장이 화면 글로 대신합니다 · ${hanjaName || hangulName}`)
    }

    return NextResponse.json({
      hangulName,
      hanjaName,
      result,
      commentary,
      // ★總評 분량 — 화면이 쓰지는 않지만, 넘치는지 «밖에서» 볼 수 있게 냅니다
      chongLen,
      savedId,
      stars,
      overallStar: overallStar(stars, verdict.facts.hasYongsin),
      // ★2026-07-30 (3단계) — 통변이 비었을 때 «왜» 인지 화면이 알 수 있게.
      //   ⚠️ aiFailHint 는 우리말 안내입니다(guessHint). 손님에게 보여도 됩니다.
      aiOk: aiFailStatus === null,
      aiFailStatus,
      aiFailHint,
    })
  } catch (e) {
    console.error('naming route error:', e)
    return NextResponse.json({ error: 'naming_failed' }, { status: 500 })
  }
}
