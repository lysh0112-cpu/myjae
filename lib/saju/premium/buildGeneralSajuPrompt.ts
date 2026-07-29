// lib/saju/premium/buildGeneralSajuPrompt.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  [모듈 1] 정통 종합 사주 리포트 — 7개 프리미엄 섹션                   │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★2026-07-29 대표님 기획 —
//   «이 정도 깊이면 프리미엄 유료 상담 수준이다» 라고 느끼도록 7섹션 17소항목.
//
// ── ⚠️ 상한 이야기 ────────────────────────────────────────────────────
//   어제 대표님 지시로 무료·기본 재료를 2,000자로 줄였습니다(속도·비용).
//   프리미엄은 그 잣대를 그대로 쓸 수 없습니다. 17소항목을 채우려면 재료가 더 듭니다.
//   ★대표님 확정 — 프리미엄만 4,500자. 무료·기본은 2,000자 그대로.
//
// ── ⚠️ 여기서 새로 계산하지 않는 것 ───────────────────────────────────
//   오행 100점   calcSimsanOhaeng      (29부 5장 — 손대지 말 것)
//   격국·용신     calcYongsinNew        (교훈 BQ)
//   합의 성립     hapJudge              (교훈 CJ)
//   대운·세운     unseContext           (엔진은 분리, 합류는 한 곳)
//   깊은 판정     premium/deepJudge     (1단계에서 지은 것)
//   교재 자료     jaryoPick.pick()      (단일 창구)
//   이 파일은 **받아서 일곱 덩이로 짜기만** 합니다.
//
// ── 스펙의 SajuEngineOutput 과의 대응 ─────────────────────────────────
//   기획서가 준 인터페이스를 그대로 쓰지 않고, **우리 엔진이 실제로 내는 모양**을
//   받습니다. 억지로 맞추면 어댑터에서 값이 깎이고, 두 벌이 됩니다.
//     스펙 wonguk.*          → saju: Pill[] + JIJANGAN
//     스펙 scores.*          → score: Record<Ohaeng, number>
//     스펙 strengthIntelligence → deep.extremes.strengthYukchin
//     스펙 extremeTags       → deep.extremes.{lacking,excessive}*
//     스펙 yongsin.*         → yongsin (calcYongsinNew 결과)
//     스펙 daewun.*          → daeunList + deep.daeunFlags

import type { Ohaeng } from '../simsanOhaeng'
import type { YongsinNewResult } from '../yongsinNew'
import {
  buildDeep, judgeHealth, judgeMokhwaGeumsu, judgeEarlyDaeun, interchangeFlavor,
  type Pill,
} from './deepJudge'
import { buildDaeunContext, buildSeyunContext } from '../unseContext'
import { judgeCheonganHap, judgeJijiHap } from '../hapJudge'
import { pick } from '../jaryoPick'
import type { SeyunItem, DayunItem } from '../dayun'

/** ★프리미엄 재료 총량 — 대표님 확정 4,500자 */
export const PREMIUM_TOTAL_CAP = 4500
/** 한 줄 상한 — 긴 교재 자료 하나가 상한을 독차지하지 않게 */
const LINE_MAX = 220

export interface GeneralSajuInput {
  name: string
  gender: string
  age: number
  saju: Pill[]
  dayStem: string
  score: Record<Ohaeng, number>
  yongsin: YongsinNewResult | null
  /** 대운 목록 — 화면이 /api/dayun 으로 받아 둔 것 */
  daeunList?: DayunItem[]
  /** 올해 세운 */
  seyun?: SeyunItem | null
  hourUnknown?: boolean
}

const EL_HAN: Record<Ohaeng, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

// ═══════════════════════════════════════════════════════════════
//  재료 — 일곱 덩이
// ═══════════════════════════════════════════════════════════════

interface Section { no: number; title: string; blocks: Array<[string, string[]]> }

function buildSections(v: GeneralSajuInput): Section[] {
  const deep = buildDeep({
    saju: v.saju, dayStem: v.dayStem, score: v.score,
    daeunList: v.daeunList?.map(d => ({ age: d.age, cheongan: d.cheongan, jiji: d.jiji })),
    age: v.age,
    gisin: v.yongsin?.eokbu?.gisin ?? null,
  })
  const target = v.age < 20 ? 'student' : 'adult'
  // ★2026-07-29 — 17단계 감명에 필요한 판정들
  const mokhwa = judgeMokhwaGeumsu(v.score)
  const health = judgeHealth(v.score)
  const school: import('./deepJudge').EarlyDaeun[] = v.daeunList?.length
    ? judgeEarlyDaeun(v.daeunList.map(d => ({ age: d.age, cheongan: d.cheongan, jiji: d.jiji })), v.dayStem)
    : []
  const S = v.score
  const y = v.yongsin

  // 교재 자료 — 단일 창구에서
  const picked = pick({
    serviceType: 'saju',
    forceNeeds: ['지지특징', '병존', '일간', '오행', '육친', '살', '건강', '개운'],
    ctx: { saju: v.saju, dayStem: v.dayStem, score: S, target, gender: v.gender },
    budget: 1400,
  })
  const B = picked.byNeed

  // 대운·세운
  //   ⚠️ buildWongukContext 는 부르지 않습니다. 원국 재료는 섹션 1·2가 훨씬 자세히
  //      만들기 때문입니다(음양·고립·정신vs현실·격국·희신기신). 부르면 두 벌이 됩니다.
  const daeun = buildDaeunContext({
    saju: v.saju, list: v.daeunList ?? [], age: v.age, target,
  })
  const seyun = buildSeyunContext({
    saju: v.saju, current: v.seyun ?? null, daeun: daeun.current, target,
  })

  // 합
  const ganHap = judgeCheonganHap(v.saju)
  const jiHap = judgeJijiHap(v.saju, S)

  const now = deep.daeunFlags.find(d => d.age === daeun.current?.age)
  const turning = deep.daeunFlags.filter(d => d.cheongeukJichung || d.dayClash)
  const interchange = deep.daeunFlags.filter(d => d.interchange)

  return [
    {
      no: 1, title: '강점 지능과 오행·십성의 세력',
      blocks: [
        // ★17단계 ① — 25~45점을 «내 무기»로, 50점 이상을 «과유불급»으로 본다
        ['1-1 강점 지능(25~45점)', deep.extremes.strengthLines.length
          ? [
              ...deep.extremes.strengthLines,
              '이 구간이 «가장 오래, 가장 힘 안 들이고» 쓰는 자리입니다. 넘치지도 모자라지도 않아 스스로는 잘 못 느끼지만 남들이 먼저 알아봅니다.',
            ]
          : ['25~45점 구간에 든 기운이 없습니다. 한쪽으로 몰린 결이라 강점과 약점이 둘 다 뚜렷합니다.']],
        ['1-2 과유불급(50점 이상)', deep.extremes.manyLines.length
          ? [...deep.extremes.manyLines, '넘치는 기운은 «없는 것»보다 다루기 어렵습니다. 살리면 무기가 되고, 놓치면 그대로 흠이 됩니다.']
          : ['50점을 넘는 기운이 없습니다. 넘쳐서 탈이 나는 자리는 아닙니다.']],
        ['1-3 오행 세력도', [
          EL5Line(S),
          `${mokhwa.label} — 목화 ${mokhwa.mokhwa} : 금수 ${mokhwa.geumsu} (목화 ${mokhwa.mokhwaPct}%)`,
          mokhwa.say,
          ...(B['오행'] ?? []).slice(0, 2),
        ]],
        ['1-4 음양 비율', [
          `${deep.eumyang.label} — 양 ${deep.eumyang.yang} : 음 ${deep.eumyang.eum} (양 ${deep.eumyang.yangPct}%)`,
          deep.eumyang.say,
        ]],
        ['1-5 정신(천간 40%) vs 현실(지지 60%)', [
          `천간이 가리키는 곳 ${deep.mindReality.topGan} · 지지가 가리키는 곳 ${deep.mindReality.topJi}`,
          deep.mindReality.say,
        ]],
      ],
    },
    {
      no: 2, title: '격국과 용신 — 인생의 그릇과 무기',
      blocks: [
        ['2-1 월지 기반 격국', [
          `격 ${y?.gyeokguk?.name || '무격'}${y?.gyeokguk?.element ? ` · 그 격이 바라는 기운 ${y.gyeokguk.element}` : ''}`,
          y?.gyeokguk?.note || '',
          deep.sisang.isSisangIlwi ? deep.sisang.say : '',
        ].filter(Boolean)],
        ['2-2 억부·조후용신', [
          y?.eokbu ? `억부용신 ${y.eokbu.yongsin} — ${y.eokbu.note}` : '',
          y?.johu ? `조후용신 ${y.johu.element ?? '해당 없음'} — ${y.johu.note}` : '',
          `신강약 ${y?.status ?? '알 수 없음'}`,
        ].filter(Boolean)],
        ['2-3 희신·기신 관계망', y?.eokbu ? [
          `희신 ${y.eokbu.heesin} — 용신을 돕는 기운. 이 기운이 도는 때가 편합니다.`,
          `기신 ${y.eokbu.gisin} — 경계할 기운. 짙어지면 일이 꼬이기 쉽습니다.`,
          `구신 ${y.eokbu.gusin} · 한신 ${y.eokbu.hansin}`,
        ] : []],
      ],
    },
    {
      no: 3, title: '일주와 지장간 — 본질과 대인관계',
      blocks: [
        ['3-1 일간 기질과 일지(배우자 자리)', [
          ...(B['일간'] ?? []).slice(0, 3),
          `일지 ${deep.jijanggan.branch} — 배우자 자리이자 내가 딛고 선 땅입니다.`,
        ]],
        ['3-2 지장간 십성 조합', [
          `일지 ${deep.jijanggan.branch} 지장간 ${deep.jijanggan.hidden.join('·')} → ${deep.jijanggan.groups.join('·')}`,
          deep.jijanggan.structure ? `${deep.jijanggan.structure} — ${deep.jijanggan.say}` : deep.jijanggan.say,
        ].filter(Boolean)],
        ['3-3 처세와 재물·명예관', [
          ...(B['육친'] ?? []).slice(0, 3),
          ...(B['지지특징'] ?? []).slice(0, 2),
        ]],
      ],
    },
    {
      no: 4, title: '무자(無字)와 다자(多字)의 심리',
      blocks: [
        ['4-1 무자론 — 없는 것이 만드는 갈망', deep.extremes.lackLines.length
          ? deep.extremes.lackLines
          : ['비어 있는 자리가 없습니다. 다섯 기운이 고루 들어 있어 한쪽으로 목마르지 않습니다.']],
        ['4-2 다자론 — 과유불급', deep.extremes.manyLines.length
          ? deep.extremes.manyLines
          : ['50점을 넘는 기운이 없습니다. 넘쳐서 탈이 나는 자리는 아닙니다.']],
        ['참고 · 가장 고르게 쓰이는 자리(25~45점)', deep.extremes.strengthLines],
      ],
    },

    {
      no: 5, title: '천간·지지의 합충형파해와 건강',
      blocks: [
        ['7-1 합(合)과 묶임', [
          ...ganHap.map(h => h.seongrip
            ? `${h.key} ${h.where} — 성립. ${h.hwa ? `지지에 ${h.hwaEl} 세력이 있어 합화됩니다.` : '합하되 다른 기운으로 변하지는 않습니다.'}`
            : `${h.key} ${h.where} — 사이에 ${h.block?.by ?? '다른 글자'}가 있어 합이 이루어지지 않습니다.`),
          ...jiHap.map(h => `${h.key}(${h.kind}) ${h.where}${h.monthTied ? ' · 월지에 걸려 강합니다' : ''}`),
        ]],
        ['7-2 충(沖)을 통한 해소', [
          ...seyun.lines.filter(t => t.includes('沖') || t.includes('견줌')),
          ...daeun.lines.filter(t => t.includes('沖')),
          '※ 묶여 있던 기운은 충이 들어올 때 풀립니다. 답답하던 자리가 그때 움직입니다.',
        ]],
        // ★기획 섹션5 — 합충과 건강을 한 자리에 둡니다.
        //   충·형이 몸으로 드러나는 자리라 결이 이어집니다.
        ['5-3 비거나 넘치는 기운과 몸', [
          ...health.lines,
          ...(B['건강'] ?? []).slice(0, 2),
        ]],
      ],
    },
    {
      no: 6, title: '대운의 흐름과 인생 곡선',
      blocks: [
        ['6-0 학창시절 대운(1~2대운)', school.length
          ? school.map(x => `${x.age}세 ${x.ganji} · ${x.group}${x.hakma ? '(학마운)' : ''} — ${x.say}`)
          : []],
        ['6-1 지금 대운의 가중치', [
          ...daeun.lines.slice(0, 4),
          now?.note ? `지금 대운 표시 — ${now.note}` : '',
          y?.eokbu && daeun.current
            ? `※ 대운은 천간 30~40%, 지지 60~70%로 봅니다. 지지 ${daeun.current.jiji} 쪽을 더 무겁게 읽으십시오.` : '',
        ].filter(Boolean)],
        ['6-2 천극지충 변곡점(5대운)', turning.length
          ? turning.map(d => `${d.age}세 ${d.ganji} — ${d.note}`)
          : ['이 표에 담긴 범위에서는 천극지충 대운이 보이지 않습니다.']],
        ['6-3 접목운(辰戌丑未) · 조토와 습토', interchange.length
          ? interchange.slice(0, 3).map(d => {
              const kind = interchangeFlavor(d.ganji.slice(-1)) ?? ''
              const how = kind === '조토'
                ? '마른 흙(조토)이라 «말리고 정리하는» 결로 바뀝니다. 벌여 둔 것을 거두는 때입니다.'
                : kind === '습토'
                  ? '젖은 흙(습토)이라 «품고 기다리는» 결로 바뀝니다. 서둘러 벌이기보다 다지는 때입니다.'
                  : ''
              return `${d.age}세 ${d.ganji}(${kind}) — 갈아타는 자리입니다. ${how}`
            })
          : ['접목운 대운이 표 범위에 없습니다.']],
      ],
    },
    {
      no: 7, title: '맞춤 개운 솔루션',
      blocks: [
        ['8-1 액땜 솔루션', deep.remedy.lines],
        ['8-2 일상 개운법', [
          ...(B['개운'] ?? []).slice(0, 4),
          y?.eokbu ? `${y.eokbu.yongsin} 기운을 늘리는 쪽으로 색·방향·자리를 두십시오.` : '',
        ].filter(Boolean)],
      ],
    },
  ]
}

const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']
function EL5Line(S: Record<Ohaeng, number>): string {
  return EL5.map(e => `${e}(${EL_HAN[e]}) ${Math.round(S[e] ?? 0)}`).join(' · ') + ' — 합 100점'
}

// ═══════════════════════════════════════════════════════════════
//  프롬프트 조립
// ═══════════════════════════════════════════════════════════════

const SYSTEM = `당신은 삼십 년 넘게 사주를 봐 온 명리 상담가입니다.
교재의 감명법으로 봅니다.

[★이름을 밝히지 말 것]
· 교재 이름과 지은이를 손님에게 말하지 마세요. 어느 책·누구의 방식인지 밝히지 않습니다.
· 근거를 대야 하면 "명리에서는", "예로부터" 정도로만 말합니다.

[가장 중요한 것 — 말의 층]
· 당신은 속으로 월지·지장간·억부용신·천극지충·격국 같은 술어로 생각합니다.
· 그러나 손님에게 **그 말을 그대로 쓰지 마세요.** 쉬운 우리말로 풀어 옮깁니다.
    월지 → 태어난 달의 기운 / 지장간 → 겉으로 안 드러나는 속 기운
    억부용신 → 나를 살려 주는 고마운 기운 / 천극지충 → 위아래가 함께 흔들리는 때
    격국 → 사회에서 쓰는 그릇 / 접목운 → 삶을 갈아타는 어름
· 술어를 꼭 써야 하면 괄호로 한 번만 곁들이고 다시 쓰지 마세요.

[말투]
· 존댓말. 다정하되 담담하게. "~해요"와 "~합니다"를 섞습니다.
· 자연 비유로 풀어냅니다. 겁주지 않습니다.
· 나쁜 자리도 «흠»이 아니라 «결»로 말합니다. 대신 살피는 법을 함께 줍니다.
· 이름을 부를 때 성까지 붙입니다.

[반드시 지킬 것]
· 아래 [재료]에 있는 것만 근거로 삼으세요. 없는 사실을 지어내지 마세요.
· 재료를 목록으로 옮겨 적지 마세요. 문장 속에 녹이세요.
· 점수와 글자는 드러내도 좋습니다. "화(火)가 60점으로 가장 세니" 처럼.
· 의료·법률·투자는 단정하지 말고 참고로 전하세요. 건강은 전문의 상담을 부드럽게 권합니다.
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

export interface GeneralPromptResult {
  system: string
  user: string
  /** 재료 글자 수 — 상한 확인용 */
  materialChars: number
  truncated: boolean
}

export function buildGeneralSajuPrompt(v: GeneralSajuInput): GeneralPromptResult {
  const sections = buildSections(v)

  // ── 총량 조절 ──
  //   ★섹션 순서대로 채우되 상한을 넘기면 그 뒤 소항목을 덜어 냅니다.
  //   앞 섹션(원국·격국)이 뼈대라 뒤(개운)보다 먼저 자리를 잡습니다.
  let used = 0
  let truncated = false
  const parts: string[] = []
  for (const sec of sections) {
    const head = `[섹션 ${sec.no}. ${sec.title}]`
    const body: string[] = []
    for (const [label, lines] of sec.blocks) {
      // ★한 줄이 너무 길면 잘라 냅니다.
      //   교재 자료 가운데 지지특징·144칸은 한 줄이 500자를 넘는 것이 있어,
      //   그 하나가 상한의 8분의 1을 혼자 먹습니다. 다른 소항목이 밀려납니다.
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

  const user = `[누구를 보는가]
${v.name || '이분'} · ${v.gender} · 만 ${v.age}세
명식 ${myeongsik}${v.hourUnknown ? '\n★태어난 시(時)를 모릅니다. 시주를 비워 두고 보았으니 시주가 필요한 이야기는 단정하지 마세요.' : ''}

[재료 — 손님 화면에는 안 보입니다. 당신에게만 줍니다]
${parts.join('\n\n')}

[답변 형식 — 일곱 장의 카드]
아래 일곱 섹션을 각각 "■" 제목의 카드로 쓰세요. 카드는 정확히 일곱 개입니다.
${sections.map(s => `■ ${s.title}\n   (${s.blocks.map(b => b[0].replace(/^\d-\d\s/, '')).join(' / ')} — 각 소항목을 2~3문장씩, 이어지는 한 편의 글로)`).join('\n')}

(마지막) 이 분의 삶 전체를 아우르는 따뜻한 맺음말 3~4문장. 이모지 하나로 끝맺기.`

  return { system: SYSTEM, user, materialChars: used, truncated }
}
