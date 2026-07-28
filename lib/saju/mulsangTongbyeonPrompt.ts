// lib/saju/mulsangTongbyeonPrompt.ts
// ============================================================================
// 내사주그림(물상도) 해설 통변 프롬프트 빌더
// ----------------------------------------------------------------------------
// 사주 통변(tongbyeonPrompt)과 같은 톤·형식이되, "그 사람의 그림"을 근거로
// 답하도록 소무승 물상론 데이터(mulsangData)를 프롬프트에 엮는다.
//   - 주인공(일간) 물상·성정 / 배경(계절) / 그림 속 빛(용신) / 물상 관계
//   - 오행 점수(그림이 풍성/허전/치우침의 근거)
//   - 사용자가 고른 질문(mulsangQuestions) — 안 고르면 전체 대략 해설
//
// 규칙(사주 통변과 동일): 순우리말·다정, 마크다운 금지("■ 제목"만),
//   끝까지 완성, 이모지는 마지막 1개.
// ============================================================================

import type { SajuQuestion } from '@/lib/saju/questions'
// ★2026-07-27 — 교재 48~77쪽 지지 자료를 물상 재료에도 넣는다.
//   물상은 월지로 배경 계절을, 시지로 하루의 빛을 그린다.
//   교재의 지지 특징이 바로 그 묘사의 근거가 된다.
//   ⚠️ 대목(■ 제목)을 늘리지 않는다. 이미 있는 블록에 근거로만 얹는다.
import type { Pillar } from '@/lib/saju/simsanOhaeng'
import { traitOf, noteLines, ctxOf } from '@/lib/saju/jijiTrait'
import { findByeongjon, findCombo, findJijiByeongjon, sayOf } from '@/lib/saju/byeongjon'
import {
  ILGAN, WOLJI, YONGSIN, RELATION, STEM_ELEMENT,
} from '@/lib/saju/mulsangData'

export type Ohaeng = '목' | '화' | '토' | '금' | '수'

// 시지(時支) → 태어난 시각의 실제 기운. ★2026-07-22 신설.
//   그림에는 이 시각대로 하늘·빛이 그려진다(mulsangPrompt.BRANCH_HOUR와 짝).
//   해설이 이걸 몰라서, 겨울(월지)을 밤으로 착각해 "한밤중"으로 쓰던 사고를 막는다.
//   (예: 오연희=午시=한낮인데 해설이 "한겨울 밤"으로 나감)
const HOUR_MOOD: Record<string, string> = {
  子: '한밤중 (자정 무렵)',
  丑: '깊은 새벽 (아직 어두운 시각)',
  寅: '동틀 무렵 새벽',
  卯: '아침 해가 떠오르는 시각',
  辰: '해가 완연히 오른 늦은 아침',
  巳: '한낮으로 향하는 밝은 오전',
  午: '해가 가장 높이 뜬 한낮 (정오 무렵)',
  未: '한낮의 볕이 무르익은 이른 오후',
  申: '해가 기우는 늦은 오후',
  酉: '해 질 녘 저녁 무렵',
  戌: '땅거미 지는 초저녁',
  亥: '밤이 깊어가는 시각',
}

// 그림 통변에 필요한 값 (mulsang 화면이 만들어 넘김)
import { cheonganImage, stage25 } from './jaryoPick'

export interface MulsangTongbyeonInput {
  name: string                       // 이름/별명
  age: number
  gender: string
  dayStem: string                    // 일간 한자 (예: 壬) — 그림 주인공
  monthBranch: string                // 월지 한자 (예: 寅) — 그림 배경 계절
  ohaengScore: Record<Ohaeng, number>// 오행 점수 (그림 풍성/치우침 근거)
  topElement: Ohaeng                 // 가장 강한 기운
  lackElements: Ohaeng[]             // 없거나 약한 기운
  yongsinElement?: Ohaeng            // 용신 오행 (그림 속 빛)
  styleLabel?: string                // 화풍 (수묵담채화/지브리풍)
  hourBranch?: string | null         // ★시지(時支) 한자. 태어난 시각 — 계절과 헷갈리지 않게.
  hourKo?: string                    // ★태어난 시각의 한글 표현 (예: "한낮(午시)"). 없으면 생략.
  /** ★명식 네 기둥 — 있으면 교재 지지 자료와 병존을 근거로 얹는다. 없으면 전과 같다. */
  saju?: Pillar[]
}

const SYSTEM_GUIDE = `당신은 소무승(蘇無僧) 물상론에 통달한 다정한 명리 상담가입니다.
손님이 자기 사주로 그린 한 폭의 풍경화(물상도)를 함께 바라보며, 그림 속 하나하나가 무엇을 뜻하는지 따뜻하게 풀어줍니다.

[말투와 태도]
- 순우리말로 다정하게. 어려운 한자어는 괄호로 살짝만 병기하세요.
- "그림 속 저 나무를 보세요", "화폭 한가운데 우뚝 선…" 처럼 그림을 직접 가리키며 설명하세요.
- 손님의 마음을 헤아리고, 부족함도 "채워가면 된다"는 희망으로 감싸세요.
- 나이는 현재와 앞으로만. 과거를 먼저 꺼내지 마세요.
- 물상을 부를 때는 그림에 실제 그려진 모습에 맞춰 자연스럽게 부르세요. 특히 물(水) 일간(임수·계수)은 아래 규칙을 반드시 지키세요.
  · 임수(壬)의 데이터에 "바다"라는 말이 있더라도, 그림은 대개 잔잔한 강·호수·시냇물로 그려집니다. 그러니 "바다"라는 단어는 되도록 쓰지 말고 "넓은 물", "깊은 강", "고요한 호수"로 부르세요.
  · "거대한 바다", "쓰나미", "파도" 같은 과장된 표현도 피하고, 그림의 잔잔하고 평온한 분위기에 맞춰 부드럽게 표현하세요.
  · 계수(癸)는 "봄비·이슬·시냇물·옹달샘"처럼 작고 맑은 물로 부르세요.

[반드시 지킬 규칙]
- 아래 제공된 물상 데이터에만 근거하세요. 데이터에 없는 사실을 지어내지 마세요.
- ★[겹친 기운 — 병존] 과 [곁의 지지] 는 교재에서 온 근거입니다.
  · 그림을 묘사할 때 근거로만 쓰세요. 이것만 따로 떼어 새 대목을 만들지 마세요.
  · 목록으로 나열하지 말고 문장 속에 녹이세요. 쪽수는 옮기지 마세요.
  · 병존은 "그 기운이 두 배로 짙다"는 뜻이니, 그림에서 그 요소를 더 크고 짙게 그릴 근거로 삼으세요.
- ★계절(월지)과 시각(시지)은 전혀 다릅니다. 절대 뒤섞지 마세요.
  · "태어난 계절"은 봄·여름·가을·겨울의 기운이고, "태어난 시각"은 하루 중 아침·낮·저녁·밤입니다.
  · 예를 들어 겨울에 태어났어도 한낮(午시)에 태어났다면, 그림은 "겨울의 밝은 대낮"입니다. 이런 경우 절대 "한밤중"이나 "밤"으로 묘사하면 안 됩니다.
  · 아래 '태어난 시각'에 밝은 낮이라고 되어 있으면, 그림의 하늘도 밝습니다. 밤·어둠·네온·달빛으로 묘사하지 마세요.
  · 반대로 밤 시각이면 낮의 햇살로 묘사하지 마세요. 그림에 그려진 시각의 빛에 맞춰 설명하세요.
- 통변의 중심축은 "그림 주인공(일간)"과 "그림 속 빛(용신)", 그리고 "오행의 넘침/부족"입니다.
- 각 질문에 딸린 "명리 연결"을 반드시 활용해 해석하세요.
- 의료·법률·투자의 확정적 단정은 피하고 참고 조언으로 전합니다.
- 이모지는 맨 마지막 인사에 딱 하나만 씁니다.

[형식 규칙 — 매우 중요]
- 마크다운 기호를 절대 쓰지 마세요. #, ##, **, --- 를 쓰면 안 됩니다.
- 각 카드 제목은 반드시 "■ 제목" 형식으로만 시작하세요.
- 정해진 분량 안에서 반드시 끝까지 완성하세요. 마지막 인사까지 온전히 맺으세요.`

// ── 공유 카드용 짧은 요약 프롬프트 ──
//   긴 해설을 카톡 등에 올릴 수 있게 3~4문장으로 다시 쓴다.
//   ★새로 점을 보는 게 아니라 "이미 나온 해설을 줄이는" 것이므로,
//     아래 해설 밖의 내용을 지어내지 않도록 못박는다.
export function buildMulsangCardSummaryPrompt(
  fullText: string,
  name?: string,
): string {
  const who = name ? `${name}님` : '이분'
  return `당신은 다정한 명리 상담가입니다.
아래는 손님이 받아본 "사주 그림 해설" 전문입니다.
이것을 다른 사람에게 보여줄 수 있는 카드에 담으려 합니다.

[할 일]
아래 해설을 ${who}에 대한 이야기로 3~4문장으로 줄여 쓰세요.

[반드시 지킬 것]
- 아래 해설에 있는 내용만 쓰세요. 없는 것을 지어내지 마세요.
- "화폭에", "그림 속" 같은 그림 설명이 아니라, 그 사람이 어떤 사람인지로 풀어 쓰세요.
- 순우리말로 다정하게. 존댓말.
- 겁주지 마세요. 부족한 점도 "채워가면 된다"는 결로.
- 3~4문장. 그보다 길게 쓰지 마세요.
- 제목·머리말·따옴표·마크다운(#, **, ■) 없이, 문장만 쓰세요.
- 이모지는 쓰지 마세요.

[해설 전문]
${fullText.trim()}`
}

// ── 프롬프트 조립 ──
export function buildMulsangTongbyeonPrompt(
  input: MulsangTongbyeonInput,
  questions: SajuQuestion[],   // 빈 배열이면 "전체 대략 해설"
  opts: { premium?: boolean } = {},
): string {
  const ilgan = ILGAN[input.dayStem]
  // ★2026-07-28 — 교재 41~47쪽의 일간 물상과 25쪽의 계절·하루·색을 얹는다.
  //   물상도는 "무엇에 빗대는가" 가 알맹이라 교재 41쪽 풀이가 그대로 쓰인다.
  const bookImage = cheonganImage(input.dayStem)
  const bookStage = stage25(input.topElement)
  const wolji = WOLJI[input.monthBranch]
  const yong = input.yongsinElement ? YONGSIN[input.yongsinElement] : null
  const rel = RELATION[input.dayStem]
  const s = input.ohaengScore

  // 임수(壬)는 데이터에 "바다"가 있으나 그림은 대개 잔잔한 강·호수 →
  // 프롬프트에 넣는 문자열에서만 과장된 물 표현을 순화 (데이터 원본은 보존).
  const soften = (t: string): string => {
    if (input.dayStem !== '壬') return t
    return t
      .replace(/거대한 바다와 호수/g, '넓고 깊은 강이나 호수')
      .replace(/거대한 바다/g, '넓고 깊은 물')
      .replace(/깊은 바닷속/g, '깊은 물속')
      .replace(/바다/g, '넓은 물')
      .replace(/쓰나미/g, '큰 물결')
  }

  // 그림 주인공(일간) 블록
  const ilganBlock = ilgan
    ? `[그림 주인공 — 이 사람(일간)]
- 물상: ${soften(ilgan.mulsang)}
- 성정: ${soften(ilgan.seongjeong)}
- 강점·매력: ${soften(ilgan.gangjeom)}
- 주의점: ${soften(ilgan.jueui)}${bookImage ? `
- 교재 41~47쪽이 말하는 이 일간: ${soften(bookImage)}` : ''}${bookStage ? `
- 교재 25쪽이 말하는 가장 센 기운: ${bookStage}` : ''}`
    : ''

  // ★병존 — 같은 글자가 나란히 있으면 그 기운이 그림에서 짙어진다 (교재 74~77쪽)
  //   보기) 壬壬 이면 물이 겹쳐 더 깊고 넓게, 子子 면 밤의 결이 두 배로.
  const byeongjonBlock = (() => {
    if (!input.saju?.length) return ''
    const t: 'adult' = 'adult'
    const out: string[] = []
    for (const h of findByeongjon(input.saju)) out.push(`- ${h.key}(${h.pillars.join('·')}) — ${sayOf(h.row, t)}`)
    for (const c of findCombo(input.saju)) out.push(`- ${c.row.need.join('')} ${c.key}(${c.pillars.join('·')}) — ${sayOf(c.row, t)}`)
    for (const h of findJijiByeongjon(input.saju)) out.push(`- ${h.key}(${h.pillars.join('·')}) — ${sayOf(h.row, t)}`)
    if (!out.length) return ''
    return `[겹친 기운 — 병존(竝存), 교재 74~77쪽]
같은 글자가 나란히 있어 그 기운이 두 배로 짙습니다. 그림에서 그 요소를 더 크고 짙게 그릴 근거입니다.
${out.join('\n')}`
  })()

  // ★년지·시지의 교재 비고 — 그림의 곁가지 (교재 48쪽)
  const jijiNoteBlock = (() => {
    if (!input.saju?.length) return ''
    const ctx = ctxOf(input.saju)
    const out: string[] = []
    for (const p of ['년주', '시주'] as const) {
      const b = input.saju.find(x => x.pillar === p)?.branch
      if (!b || b === '?') continue
      const row = traitOf(b)
      if (!row) continue
      const n = noteLines(row, 'adult', ctx)
      if (n.length) out.push(`- ${p.replace('주', '지')} ${b}(${row.ko}·${row.tti}): ${n.join(' ')}`)
    }
    return out.length ? `[곁의 지지 — 교재 48쪽 비고]\n${out.join('\n')}` : ''
  })()

  // 배경(계절) 블록
  // ★월지의 교재 근거 — 절기·시각·본기와 48쪽 비고 (교재 48쪽·50~73쪽)
  const woljiTrait = traitOf(input.monthBranch)
  const woljiSrc = woljiTrait
    ? `\n- 교재가 말하는 ${input.monthBranch}(${woljiTrait.ko}·${woljiTrait.tti}): `
      + `${woljiTrait.jeolgi} (${woljiTrait.solarSpan}) · 본기 ${woljiTrait.bongi} · ${woljiTrait.eumyang}`
      + `\n  ${woljiTrait.say.slice(0, 4).map(l => typeof l === 'string' ? l : l.t).join(' ')}`
    : ''
  const woljiBlock = wolji
    ? `[그림 배경 — 태어난 계절(월지)]
- 계절: ${wolji.season}
- 의미: ${wolji.meaning}
- 영향: ${wolji.effect}${woljiSrc}`
    : ''

  // ★태어난 시각(시지) 블록 — 계절과 별개. 그림의 하늘·빛이 이 시각에 맞춰 그려짐.
  //   hourKo가 오면 그걸 우선, 없으면 시지 한자로 표에서 찾음. 둘 다 없으면 블록 생략.
  const hourMood = input.hourKo
    || (input.hourBranch ? HOUR_MOOD[input.hourBranch] : '')
    || ''
  const hourBlock = hourMood
    ? `[그림의 시각 — 태어난 시각(시지). ★계절과 다름, 헷갈리지 말 것]
- 태어난 시각: ${hourMood}
- 그림의 하늘·빛은 반드시 이 시각에 맞춰야 합니다. (낮이면 밝게, 밤이면 어둡게)
- 위 '계절'은 대기·초목의 느낌일 뿐, 하루 중 밤낮은 이 '시각'을 따르세요.${
  input.hourBranch && traitOf(input.hourBranch)
    ? `\n- 교재가 적은 ${input.hourBranch}시의 폭: ${traitOf(input.hourBranch)!.hour} (${traitOf(input.hourBranch)!.tti})`
    : ''}`
    : `[그림의 시각]
- 태어난 시각을 알 수 없습니다. 밤/낮을 단정하지 말고, 계절의 분위기 위주로 부드럽게 묘사하세요.`

  // 오행 균형 블록 (그림 풍성/치우침 근거)
  const ohaengBlock = `[그림의 풍성함과 치우침 — 오행 균형(100점 기준)]
- 목 ${s.목} · 화 ${s.화} · 토 ${s.토} · 금 ${s.금} · 수 ${s.수}
- 가장 강한 기운(그림에서 가장 풍성한 것): ${input.topElement}
- 없거나 약한 기운(그림에서 비거나 희미한 것): ${input.lackElements.length ? input.lackElements.join(', ') : '뚜렷한 결핍 없음'}`

  // 그림 속 빛(용신) 블록
  const yongBlock = yong
    ? `[그림 속 따뜻한 빛 — 용신(${input.yongsinElement})]
- 빛의 의미: ${yong.bit}
- 개운법: ${yong.gaeun}
- 색·방향·숫자: ${yong.color}`
    : ''

  // 물상 관계 블록 (주변 요소 해설 근거)
  const relBlock = rel
    ? `[주인공과 주변 물상의 관계 — 소무승 물상론]
- 꼭 필요한 물상: ${soften(rel.need)}
- 도움되는 물상: ${soften(rel.help)}
- 부담되는 물상: ${soften(rel.burden)}`
    : ''

  const hasQ = questions.length > 0

  // 선택 질문 블록
  const qBlock = hasQ
    ? questions
        .map((q, i) => {
          const link = opts.premium && q.detail ? q.detail : q.link
          return `${i + 1}. [${q.category} > ${q.sub}] ${q.question}\n   (명리 연결: ${link})`
        })
        .join('\n')
    : '(질문을 고르지 않음 → 그림 전체를 대략 풀어주는 해설)'

  // 출력 형식 지시
  //  - 질문 고른 경우: 고른 질문만 짧게 (앞 요약 없이)
  //  - 전체 대략 해설: 넉넉하게
  const formatBlock = hasQ
    ? `[답변 형식 — 고른 질문만 짧고 간결하게]
${questions.map((q) => `■ ${q.category} — (제목)\n   (1~2문단, 각 문단 3~4문장. 그림을 가리키며 핵심만 간결하게. 장황하지 않게. ${q.question})`).join('\n')}

(마지막) 따뜻한 마무리 1~2문장. 이모지 하나로 끝.
※ 손님이 고른 질문에만 답하세요. 묻지 않은 다른 주제(성격 전체 요약 등)는 덧붙이지 마세요. 간결하게.`
    : `[답변 형식 — 그림 전체 대략 해설, 카드로 나눠서]
■ 그림 속 당신 — (한 줄 요약 제목)
   (3~4문단. 그림 주인공(일간)이 어떤 사람인지, 그림 전체가 주는 첫인상.)

■ 배경과 계절 — (제목)
   (2~3문단. 배경 계절이 주는 의미와 영향.)

■ 그림 속 빛 — 당신을 살리는 것 (제목)
   (2~3문단. 용신 빛의 의미와 개운법. 색·방향·숫자 포함.)

■ 그림 전체의 조화 — (제목)
   (2~3문단. 오행의 넘침/부족으로 그림이 풍성한지 치우쳤는지, 어떻게 채워가면 좋을지.)

(마지막) 따뜻한 마무리 응원 2~3문장. 이모지 하나로 끝맺기.`

  return [
    SYSTEM_GUIDE,
    '',
    `[이 사람] ${input.name} · ${input.age}세 · ${input.gender}${input.styleLabel ? ` · 화풍: ${input.styleLabel}` : ''}`,
    '',
    ilganBlock,
    '',
    woljiBlock,
    '',
    hourBlock,
    '',
    // ★2026-07-27 — 교재 48~77쪽에서 온 근거. 그림 묘사를 단단하게 한다.
    //   ⚠️ 새 대목(■ 제목)을 만들지 말고, 이미 있는 대목 안에서 근거로만 쓰라고
    //      아래 SYSTEM_GUIDE 에 적어 두었다.
    byeongjonBlock,
    byeongjonBlock ? '' : '',
    jijiNoteBlock,
    jijiNoteBlock ? '' : '',
    ohaengBlock,
    '',
    yongBlock,
    '',
    relBlock,
    '',
    hasQ ? '[손님이 그림 보고 고른 질문]' : '[손님은 질문을 고르지 않았습니다]',
    qBlock,
    '',
    formatBlock,
  ].filter(Boolean).join('\n')
}
