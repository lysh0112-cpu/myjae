// lib/saju/premium/buildCareerMbtiPrompt.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  [모듈 2] 진로적성 & MBTI 맞춤 리포트 — 6개 프리미엄 섹션            │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★2026-07-29 대표님 기획 — 6섹션. 신분에 따라 섹션 4가 통째로 갈립니다.
//
// ── ⚠️ MBTI 를 다루는 결 ──────────────────────────────────────────────
//   명리와 MBTI 는 뿌리가 다른 체계입니다. 짝짓는 산식은 교재에 없습니다.
//   ★그러니 «맞혔다»가 아니라 «타고난 결을 익숙한 말로 옮긴 것» 입니다.
//     시스템 지시에 못박아 두었습니다. 빼지 마십시오.
//
// ── ⚠️ 여기서 새로 계산하지 않는 것 ───────────────────────────────────
//   MBTI 네 축   career/sajuMbti.calcSajuMbti
//   신분 분기     career/status
//   직무·조직     career/roleFit · career/jobFit
//   학생 계열학과 career/gyeyeol (judgeGyeyeol)
//   강점·무자·다자 premium/deepJudge.judgeExtremes
//   재물관·발복대운 premium/deepJudge (이번에 추가)
//   이 파일은 **받아서 여섯 덩이로 짜기만** 합니다.

import type { Ohaeng } from '../simsanOhaeng'
import type { YongsinNewResult } from '../yongsinNew'
import type { DayunItem } from '../dayun'
import { calcSajuMbti, compareMbti, AXIS_WORK, type SajuMbtiResult } from '../career/sajuMbti'
import { STATUS_PROMPT, statusToTarget, showsGyeyeol, STATUS_LABEL, type CareerStatus } from '../career/status'
import { judgeRoleFit } from '../career/roleFit'
import { judgeJobFit } from '../career/jobFit'
import { judgeGyeyeol } from '../career/gyeyeol'
import {
  buildDeep, judgeWealthStyle, flagCareerDaeun, type Pill,
} from './deepJudge'
import { PREMIUM_TOTAL_CAP } from './buildGeneralSajuPrompt'

/** 한 줄 상한 — 교재 자료 한 줄이 상한을 독차지하지 않게 */
const LINE_MAX = 220

export interface CareerMbtiInput {
  name: string
  gender: string
  age: number
  saju: Pill[]
  dayStem: string
  score: Record<Ohaeng, number>
  yongsin: YongsinNewResult | null
  solarMonth: number
  solarDay: number
  hourBranch: string | null
  /** 지금 신분·직업 */
  status: CareerStatus
  /** 본인이 밝힌 MBTI. 모르면 빈 문자열 */
  realMbti?: string
  daeunList?: DayunItem[]
  hourUnknown?: boolean
}

// ── MBTI 네 축이 «일할 때» 어떻게 드러나는가 ──────────────────────────
//  ★2026-08-03 (44부 29차) — 여덟 줄을 career/sajuMbti.ts 로 «옮겼습니다».
//    화면(MbtiCard)도 같은 줄을 보여야 해서, 두 벌이 되면 «다른 말» 을 하게 됩니다.
//    ⚠️ 여기서 다시 적지 «마십시오». 고칠 곳은 sajuMbti.ts 한 곳입니다.

interface Section { no: number; title: string; blocks: Array<[string, string[]]> }

function buildSections(v: CareerMbtiInput): { sections: Section[]; mbti: SajuMbtiResult } {
  const target = statusToTarget(v.status)
  const mbti = calcSajuMbti(v.saju, v.solarMonth, v.solarDay, v.hourBranch)
  const real = (v.realMbti ?? '').toUpperCase().trim()
  const cmp = real ? compareMbti(mbti, real) : null

  const deep = buildDeep({
    saju: v.saju, dayStem: v.dayStem, score: v.score,
    daeunList: v.daeunList?.map(d => ({ age: d.age, cheongan: d.cheongan, jiji: d.jiji })),
    age: v.age, gisin: v.yongsin?.eokbu?.gisin ?? null, target,
  })
  const wealth = judgeWealthStyle(v.saju, v.dayStem, v.score)
  const careerDaeun = v.daeunList?.length
    ? flagCareerDaeun(
        v.daeunList.map(d => ({ age: d.age, cheongan: d.cheongan, jiji: d.jiji })),
        v.dayStem, v.yongsin?.eokbu ?? null)
    : []

  const cardIn = {
    saju: v.saju, solarMonth: v.solarMonth, solarDay: v.solarDay,
    hourBranch: v.hourBranch, target,
  }
  const role = judgeRoleFit(cardIn)
  const jobfit = judgeJobFit(cardIn)
  const gyeyeol = showsGyeyeol(v.status) ? judgeGyeyeol(cardIn) : null

  // ── 섹션 4 — 신분에 따라 통째로 갈린다 ──
  const section4: Section = showsGyeyeol(v.status)
    ? {
        no: 4, title: '학업 & 전공 적성',
        blocks: [
          ['4-1 추천 학문 분야·계열', (gyeyeol?.lines ?? []).slice(0, 4)],
          ['4-2 세부 추천 학과', (gyeyeol?.reasons ?? []).slice(0, 4)],
          ['4-3 공부·학습 스타일', [
            deep.eumyang.yangPct >= 60
              ? '밖으로 뻗는 기운이 세니 혼자 오래 앉아 있기보다 스터디·질의응답처럼 주고받는 방식이 붙습니다.'
              : '안으로 모으는 기운이 세니 조용한 자리에서 혼자 파고드는 방식이 붙습니다. 소음이 성적을 좌우합니다.',
            deep.mindReality.aligned
              ? '머리로 세운 계획과 실제 공부하는 결이 같아, 세운 계획이 잘 지켜지는 편입니다.'
              : '계획은 크게 세우는데 몸이 다르게 움직입니다. 계획을 하루 단위로 잘게 쪼개 두십시오.',
            ...(deep.extremes.excessiveYukchin.includes('관성')
              ? ['정해진 틀에서 힘이 나는 결이라 정시·내신처럼 기준이 분명한 쪽이 유리합니다.'] : []),
            ...(deep.extremes.excessiveYukchin.includes('식상')
              ? ['드러내는 기운이 세니 발표·수행·포트폴리오가 들어가는 수시 쪽이 유리합니다.'] : []),
          ]],
        ],
      }
    : {
        no: 4, title: '직무 & 커리어 전략',
        blocks: [
          ['4-1 최적의 직무 분야', (role.lines ?? []).slice(0, 7)],
          ['4-2 조직 성향 vs 자율·독립성', (jobfit.lines ?? []).slice(0, 5)],
          ['4-3 이직·전직 타이밍', [
            ...careerDaeun.filter(d => d.age >= v.age - 5 && d.note)
              .slice(0, 3).map(d => `${d.age}세 ${d.ganji} — ${d.note}`),
            ...deep.daeunFlags.filter(d => d.interchange && d.age >= v.age)
              .slice(0, 2).map(d => `${d.age}세 ${d.ganji} — 삶을 갈아타는 어름입니다. 옮기려면 이때가 자연스럽습니다.`),
            ...deep.daeunFlags.filter(d => d.cheongeukJichung)
              .map(d => `${d.age}세 ${d.ganji} — 태어난 달의 기둥이 위아래로 흔들리는 때. 누구나 한 번 지나는 큰 변곡점입니다.`),
          ]],
        ],
      }

  // ══════════════════════════════════════════════════════════════
  //  🔴★2026-08-03 (44부 35차) — MBTI 를 «안 넣으셨으면» 1·2번 대목을 «내지 않습니다».
  //
  //   [까닭]  화면에서 「사주로 본 성향」 카드를 통째로 숨기기로 했습니다 (대표님 지시).
  //     ⚠️ 재료를 그대로 두면 ★AI 글에 「ESFP 이신 분은…」이 나가는데
  //        화면에는 그 카드가 «없습니다». 손님이 무엇을 말하는지 모릅니다.
  //     ★44부 1-3 교훈 — 「재료와 그 재료를 쓸 자리는 «같은 차수» 에」.
  //        연표를 재료로만 내보내 자식운 카드에 들어갔던 자리와 같습니다.
  //   ⚠️ 대목 «번호» 는 그대로 둡니다 — 화면이 제목으로 찾으므로 번호를 다시 매기지 않습니다.
  // ══════════════════════════════════════════════════════════════
  const showMbti = !!real

  const sections: Section[] = [
    ...(!showMbti ? [] : ([{
      no: 1, title: '사주로 본 성향 — 네 축 입체 분석',
      blocks: [
        ['1-1 최종 코드와 칭호', [
          `${mbti.code} — ${mbti.title}`,
          mbti.balanced ? '두 축 이상이 반반에 가깝습니다. 한쪽으로 몰린 결이 아니라 상황에 따라 달리 쓰는 분입니다.' : '',
        ].filter(Boolean)],
        // ⚠️⚠️ 2026-08-03 (44부 29차) — ★「81:19」를 «재료에서도» 걷어냈습니다.
        //   화면에서만 걷어내고 여기 남겨 두면, AI 가 그 숫자를 보고
        //   ★"81 대 19 로 아주 뚜렷합니다" 로 풀어 버립니다.
        //   44부 3-3장에서 별점을 «세 곳 중 두 곳» 만 껐다가 겪은 일과 같은 자리입니다.
        //   ⚠️ 그 숫자는 손님이 아무리 더해도 «맞지 않습니다» (바닥 15%·층별 평균).
        ['1-2 네 축의 사주 근거', mbti.axes.map(a =>
          `${a.left}/${a.right} — ${a.pick} · 근거 ${a.why} · 일할 때: ${AXIS_WORK[a.pick] ?? ''}`)],
      ],
    }, {
      no: 2, title: cmp ? '사주 성향 vs 실제 성향 — 시너지와 반전' : '사주 추정 성향의 핵심',
      blocks: cmp ? [
        ['2-1 융합 시너지', [
          // ★cmp.headline 이 «몇 가지가 겹칩니다» 를 이미 말하므로 여기서는 코드만 밝힌다.
          //   둘 다 넣으면 같은 문장이 두 번 나갑니다.
          `타고난 결 ${mbti.code} ↔ 지금의 결 ${real}`,
          cmp.headline, cmp.body,
          ...mbti.axes.filter((a, i) => a.pick === real[i])
            .map(a => `겹치는 축 ${a.pick} — ${AXIS_WORK[a.pick] ?? ''} 억지로 꾸미지 않아도 되는 자리라 힘이 덜 듭니다.`),
        ]],
        ['2-2 남들이 보는 모습 vs 실제 내면', [
          ...mbti.axes.filter((a, i) => a.pick !== real[i]).map((a, i2) => {
            const mine = real[mbti.axes.indexOf(a)]
            return `${a.left}/${a.right} 축 — 타고나기는 ${a.pick} 쪽인데 실제로는 ${mine} 쪽으로 쓰십니다. 남들은 ${AXIS_WORK[mine]?.slice(0, 24) ?? ''}… 하는 모습을 보지만, 속에서는 ${AXIS_WORK[a.pick]?.slice(0, 24) ?? ''}… 하는 결이 돕니다. 이 차이가 이 분만의 반전입니다.${i2 > 1 ? '' : ''}`
          }),
          cmp.diffAxes.length ? `갈리는 자리(${cmp.diffAxes.join('·')})는 흠이 아니라 두 결을 다 쓸 수 있다는 뜻입니다.` : '',
        ].filter(Boolean)],
      ] : [
        // ⚠️⚠️ 2026-08-03 (44부 31차) — ★「실제 MBTI 를 넣으시면…」 권유를 «뺐습니다».
        //   [까닭] 화면에서도 그 상자를 없앴습니다(막다른 길이었습니다).
        //     재료에 남겨 두면 ★AI 글에서 다시 튀어나옵니다 —
        //     44부 3-3장에서 별점을 «세 곳 중 두 곳» 만 껐다가 겪은 일과 같은 자리입니다.
        //   ★대신 «입력 화면» 콤보 옆에 「검사하기 ↗」를 늘 보이게 두었습니다.
        //     결과를 다 본 손님을 붙잡고 조르지 «않습니다».
        ['핵심 성향 진단', [
          `${mbti.code} — ${mbti.title}`,
          ...mbti.axes.map(a => `${a.pick} — ${AXIS_WORK[a.pick] ?? ''}`),
        ]],
      ],
    }] as Section[])),
    {
      no: 3, title: '강점 지능과 행동 패턴',
      blocks: [
        ['3-1 핵심 강점 지능(25~45점)', deep.extremes.strengthLines.length
          ? deep.extremes.strengthLines
          : ['25~45점 구간에 든 기운이 없습니다. 한쪽으로 몰린 결이라 강점도 약점도 뚜렷합니다.']],
        ['3-2 과다·무자가 일과 공부에 미치는 영향', [
          ...deep.extremes.manyLines,
          ...deep.extremes.lackLines,
        ]],
      ],
    },
    section4,
    {
      no: 5, title: '리더십과 재물 운용',
      blocks: [
        ['5-1 조직 내 처세와 리더십', [
          `일지 ${deep.jijanggan.branch} 지장간 ${deep.jijanggan.hidden.join('·')} → ${deep.jijanggan.groups.join('·')}`,
          deep.jijanggan.structure ? `${deep.jijanggan.structure} — ${deep.jijanggan.say}` : deep.jijanggan.say,
        ].filter(Boolean)],
        ['5-2 재물관과 수익 방식', [
          // ★무재면 «정재 0 : 편재 0 (50%)» 같은 빈 비율이 나가 어색합니다. 그때는 뺍니다.
          wealth.label === '무재'
            ? '재성이 여덟 글자에 드러나 있지 않습니다.'
            : `${wealth.label} — 정재 ${wealth.jeongJae} : 편재 ${wealth.pyeonJae} (정재 ${wealth.jeongPct}%)`,
          wealth.say, wealth.guide,
        ]],
      ],
    },
    {
      no: 6, title: '커리어 발복 대운과 개운',
      blocks: [
        // ★학생에게는 «승진·이직» 이 아니라 «배움과 시험» 결로 말합니다
        ['6-1 힘이 붙는 대운', careerDaeun.filter(d => d.favorable || d.gwanseong)
          .slice(0, 4).map(d => target === 'student'
            ? `${d.age}세 ${d.ganji} — ${d.note.replace('승진·이직·자격에 힘이 붙습니다', '시험과 자격에 힘이 붙습니다')}`
            : `${d.age}세 ${d.ganji} — ${d.note}`)],
        ['6-2 커리어 개운 액션', [
          ...deep.remedy.lines.slice(0, 3),
          v.yongsin?.eokbu ? `${v.yongsin.eokbu.yongsin} 기운을 늘리는 쪽으로 자리·색·습관을 두면 일에 힘이 붙습니다.` : '',
        ].filter(Boolean)],
      ],
    },
  ]
  return { sections, mbti }
}

// ═══════════════════════════════════════════════════════════════
//  프롬프트 조립
// ═══════════════════════════════════════════════════════════════

const SYSTEM = `당신은 명리로 진로와 적성을 봐 온 상담가입니다.
교재의 방식으로 봅니다.

[★이름을 밝히지 말 것]
· 교재 이름과 지은이를 손님에게 말하지 마세요. 어느 책·누구의 방식인지 밝히지 않습니다.
· 근거를 대야 하면 "명리에서는", "예로부터" 정도로만 말합니다.

[가장 중요한 것 — 말의 층]
· 속으로는 월지·지장간·억부용신·격국·관인상생 같은 술어로 생각합니다.
· 손님에게는 **그 말을 그대로 쓰지 마세요.** 쉬운 우리말로 옮깁니다.
    월지 → 태어난 달의 기운 / 지장간 → 겉으로 안 드러나는 속 기운
    억부용신 → 나를 살려 주는 고마운 기운 / 관인상생 → 맡은 자리가 배움으로 이어지는 구조
    접목운 → 삶을 갈아타는 어름 / 천극지충 → 위아래가 함께 흔들리는 때
· 술어를 꼭 써야 하면 괄호로 한 번만 곁들이고 다시 쓰지 마세요.

[★MBTI 를 다루는 법 — 반드시 지킬 것]
· 명리와 MBTI 는 뿌리가 다른 체계입니다. 짝짓는 산식은 교재에 없습니다.
· 그러니 "사주가 MBTI 를 맞혔다"고 쓰지 마세요.
  "타고난 결을 익숙한 말로 옮기면 이쪽에 가깝다" 정도로만 말합니다.
· 실제 MBTI 가 사주와 다르면 **틀렸다고 하지 마세요.** 살아오며 길러 낸 결입니다.
· 네 글자를 문장마다 반복하지 마세요. 카드마다 한두 번이면 충분합니다.

[말투]
· 존댓말. 다정하되 담담하게. 겁주지 않습니다.
· 단점도 나무라지 말고 "이런 결이니 이렇게 쓰시면 좋다"로 옮깁니다.
· 이름을 부를 때 성까지 붙입니다.

[반드시 지킬 것]
· 아래 [재료]에 있는 것만 근거로 삼으세요. 없는 사실을 지어내지 마세요.
· 재료를 목록으로 옮겨 적지 마세요. 문장 속에 녹이세요.
· 연애·결혼·배우자·성(性) 이야기는 이 리포트의 주제가 아닙니다. 쓰지 마세요.
· 투자·이직을 단정해 권하지 마세요. "이런 때가 결이 맞다"는 참고로 전합니다.
· 이미 지나간 해를 앞일처럼 쓰지 마세요.

[형식]
· 마크다운 기호(#, **, ---)를 쓰지 마세요.
· 각 섹션 제목은 "■ 제목" 한 줄로 시작하고 줄을 바꿔 본문을 씁니다.
· 소항목은 "· 소제목 — " 으로 시작합니다.
[★카드 쓰는 법 — 반드시 이 차례로]
각 카드는 제목 줄 바로 아래에 이 셋을 먼저 씁니다. 그다음 본문입니다.

■ (섹션 제목)
[한줄] 이 카드에서 가장 하고 싶은 말 한 문장. 스무 자 안팎으로 짧게.
[태그] 낱말 · 낱말 · 낱말        ← 두셋. 각 다섯 자 안팎. 명리 술어 말고 쉬운 말로.
(빈 줄)
본문 첫 단락.
(빈 줄)
본문 둘째 단락.
(빈 줄)
[실천] 오늘·이번 달에 해볼 수 있는 일 한두 가지. 한 문장.

· [한줄]·[태그]·[실천] 은 **대괄호까지 그대로** 적으세요. 화면이 그것으로 갈라 그립니다.
· 본문은 단락마다 빈 줄로 나누세요. 한 단락은 두세 문장이면 충분합니다.
· 결론을 앞에, 까닭을 뒤에 두세요. 손님은 스크롤하며 훑어 읽습니다.
· [태그] 에 «편인격»·«억부용신» 같은 술어를 쓰지 마세요. «늦게 피는 결» 처럼 쉬운 말로.
· 정해진 분량 안에서 반드시 끝까지 맺으세요.`

export interface CareerMbtiPromptResult {
  system: string
  user: string
  materialChars: number
  truncated: boolean
  /** 화면이 함께 쓸 수 있게 돌려준다 (프로그레스 바 등) */
  mbti: SajuMbtiResult
}

/**
 * ★프리미엄 리포트인지 «가리는» 잣대 (44부 38차)
 *
 *  🔴 [까닭]  「다시보기」로 열면 isPremiumTong 이 «거짓으로 남아»
 *     프리미엄 글이 카드형으로 잘못 그려지고, A4·해설복사 버튼도 안 떴습니다.
 *  ⚠️ 저장본에는 「프리미엄이었는지」가 «적혀 있지 않습니다».
 *     ⇒ ★대목 «제목» 으로 가립니다. 제목은 이 파일이 정하므로 여기 둡니다.
 *  ⚠️ 제목을 고치시면 ★이 목록도 함께 고치십시오. 안 그러면 옛 기록이 카드형으로 돌아갑니다.
 */
export const PREMIUM_SECTION_TITLES = [
  '사주로 본 성향',
  '사주 성향 vs 실제 성향',
  '사주 추정 성향의 핵심',
  '강점 지능과 행동 패턴',
  '직무 & 커리어 전략',
  '리더십과 재물 운용',
  '커리어 발복 대운과 개운',
] as const

/** 저장된 통변이 «프리미엄 리포트» 인가 */
export function isPremiumReport(tong: string): boolean {
  const t = (tong ?? '').replace(/\s/g, '')
  return PREMIUM_SECTION_TITLES.some(x => t.includes(x.replace(/\s/g, '')))
}

export function buildCareerMbtiPrompt(v: CareerMbtiInput): CareerMbtiPromptResult {
  const { sections, mbti } = buildSections(v)

  let used = 0
  let truncated = false
  const parts: string[] = []
  for (const sec of sections) {
    const head = `[섹션 ${sec.no}. ${sec.title}]`
    const body: string[] = []
    for (const [label, lines] of sec.blocks) {
      const clean = lines.filter(Boolean).map(t =>
        t.length > LINE_MAX ? t.slice(0, LINE_MAX).replace(/[,·\s]+\S*$/, '') + '…' : t)
      if (!clean.length) continue
      const t = `${label}\n${clean.map(x => `- ${x}`).join('\n')}`
      if (used + t.length > PREMIUM_TOTAL_CAP) { truncated = true; continue }
      body.push(t); used += t.length
    }
    if (body.length) parts.push(`${head}\n${body.join('\n')}`)
  }

  const myeongsik = v.saju
    .map(p => `${p.pillar} ${p.stem === '?' ? '·' : p.stem}${p.branch === '?' ? '·' : p.branch}`)
    .join(' · ')
  const real = (v.realMbti ?? '').toUpperCase().trim()

  const user = `[누구를 보는가]
${v.name || '이분'} · ${v.gender} · 만 ${v.age}세 · 지금 신분: ${STATUS_LABEL[v.status]}
${STATUS_PROMPT[v.status]}
명식 ${myeongsik}${v.hourUnknown ? '\n★태어난 시(時)를 모릅니다. 시주가 필요한 이야기는 단정하지 마세요.' : ''}
${real ? `본인이 밝힌 MBTI: ${real}` : '본인이 MBTI 를 모른다고 하셨습니다. 사주 추정만 다루고, 끝에 실제 MBTI 를 넣어 보시라고 한 문장 권하세요.'}

[재료 — 손님 화면에는 안 보입니다. 당신에게만 줍니다]
${parts.join('\n\n')}

[답변 형식 — 여섯 장의 카드]
아래 여섯 섹션을 각각 "■" 제목의 카드로 쓰세요. 카드는 정확히 여섯 개입니다.
${sections.map(s => `■ ${s.title}\n   (${s.blocks.map(b => b[0].replace(/^\d-\d\s/, '')).join(' / ')} — 각 소항목을 2~3문장씩, 이어지는 한 편의 글로)`).join('\n')}

${showsGyeyeol(v.status)
    ? '★이 손님은 학생입니다. 직무·이직 이야기를 쓰지 마세요. 계열·학과·공부하는 결이 중심입니다.'
    : '★이 손님은 성인입니다. 학과·전공 추천을 쓰지 마세요. 직무와 조직, 커리어 타이밍이 중심입니다.'}

(마지막) 이 분의 일과 앞길을 응원하는 맺음말 3~4문장. 이모지 하나로 끝맺기.`

  return { system: SYSTEM, user, materialChars: used, truncated, mbti }
}
