// lib/saju/examLuck/tables/upsang.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  업상대체(業象代替) — 계열 안에서 «어느 세부 자리» 가 극대화되는가     │
// │  2026-07-30                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★대표님 지시서 2-A-2 —
//   «{targetMajor} 해설 시, 오행/신살을 결합해 극대화되는 세부 전공을 추천할 것»
//     보기) 의학 계열 + 金氣/현침살/삼형살 → 수술 중심 (정형외과·치과·신경외과)
//     보기) 문과 계열 + 官/印/木氣        → 법학·언론·연구
//
// ── ⚠️ 왜 «표» 인가 — 교훈 CU ────────────────────────────────────────
//   지시로 «세부 전공을 핀포인트 하세요» 라고 부탁하면 AI 는 못 합니다.
//   AI 는 이 사람의 金氣가 몇 점인지, 현침살이 걸렸는지 모릅니다.
//   그래서 **계산해서 재료로 줍니다.** 그러면 한 번에 씁니다.
//   (35부에서 「시험 날짜」 카드가 간지 나열로 끝나던 것과 똑같은 자리입니다)
//
// ── ⚠️⚠️ 이 표는 «교재» 가 아닙니다 ──────────────────────────────────
//   교재 73~78쪽·일주표는 오행마다 «직업» 을 짝지어 두었지만,
//   «계열 × 신살 → 세부 전공» 이라는 짝은 교재에 없습니다.
//   대표님 지시서의 얼개를 명리의 통설(金=쇠붙이·자르는 것, 현침=바늘,
//   木=자라나고 뻗는 것, 水=흐르고 스미는 것)로 채운 **우리가 정한 표**입니다.
//   ★사주MBTI(35-5장 ②)와 같은 성격입니다. 손님에게 단정하지 않게 문구를 골랐습니다.
//
// ── ⚠️ 학생과 성인의 말이 다릅니다 ──────────────────────────────────
//   학생에게는 «학과·전공» 말로, 성인에게는 «직무» 말로 적습니다.
//   ★학생 문장에는 STUDENT_BAN_WORDS 가 한 낱말도 없어야 합니다.
//     특히 «로스쿨» 은 금지어입니다(대표님이 학생 보호용으로 넣으셨음).
//     그래서 학생 쪽은 «법학·법률» 로 적었습니다. 뜻은 같고 낱말만 다릅니다.
//   ⚠️ 이 파일을 고칠 때는 반드시 아래를 돌리십시오.
//        npx tsx 14-verify-exam-seven.ts     ← 학생 금지어 0건을 검사합니다
//
// ── ⚠️ 무속·종교로 잇지 않습니다 ────────────────────────────────────
//   천문성·화개·귀문이 걸리는 자리를 교재는 «종교·무속» 으로 잇습니다.
//   35-5장 ④ 에서 대표님이 그것을 «오늘의 말» 로 옮기라 하셨습니다.
//   여기서도 같습니다 — 심리·상담·인문학으로 옮깁니다.

import type { Ohaeng } from '../../simsanOhaeng'
import { CHEONMUN_CHARS, HYEONCHIM_CHARS } from '../../byeongjon'
import type { Pillar, Sipsin } from '../types'
import { sipsinOfChar } from '../sipsin'

/** 어떤 조건에 걸리는가 */
export interface UpsangWhen {
  /** 이 오행이 «발달(25점) 이상» 일 때 */
  ohaeng?: Ohaeng[]
  /** 이 십성이 원국에 있을 때 */
  sipsin?: Sipsin[]
  /**
   * ★그 십성이 «몇 자리 이상» 이어야 하는가. 기본 1.
   *
   * ⚠️ 왜 필요한가 (2026-07-30 · 교훈 BO)
   *   무작위 4,000명으로 재 보니 십성만 조건으로 둔 줄이 «기본값» 이 되어 있었습니다.
   *       hum-law   80.3%   (관성이 «하나라도» 있으면 걸림)
   *       biz-market 68.6%
   *       edu-in    51.6%
   *   그러면 손님마다 다른 말을 하는 «핀포인트» 가 아니고, 계열마다 늘 같은 답입니다.
   *   → 십성만 보는 줄은 «두 자리 이상» 으로 올렸습니다.
   *     오행·신살과 함께 보는 줄은 이미 좁으므로 1 그대로 둡니다.
   */
  sipsinMin?: number
  /** 현침살 글자가 이만큼 이상 있을 때 (기본 1) */
  hyeonchim?: boolean
  /**
   * 천문성 글자가 «셋 이상» 있을 때.
   *
   * ⚠️⚠️ 왜 셋인가 (2026-07-30 · 교훈 BO)
   *   처음에 «한 자라도 있으면» 으로 두었다가 무작위 4,000명에서 **93.3%** 가 걸렸습니다.
   *   까닭은 표를 보면 바로 보입니다 —
   *       CHEONMUN_CHARS = 卯 戌 亥 未 寅 酉   ← **지지 열둘 가운데 여섯**
   *   지지 넷을 뽑으면 하나라도 걸릴 확률이 94%입니다. 판정이 아니라 상수였습니다.
   *   → 셋 이상으로 올렸습니다(약 31%). 「천문성은 여럿 모여야 뜻이 있다」는
   *     통설과도 맞고, 숫자로도 «남과 다른 자리» 가 됩니다.
   *   ⚠️ byeongjon.CHEONMUN_CHARS 는 손대지 않았습니다. 그 표는 지지병존이
   *      «같은 글자 둘» 을 볼 때 쓰는 것이라 거기서는 여섯 글자가 맞습니다.
   */
  cheonmun?: boolean
  /** 삼형(寅巳申·丑戌未)이 원국에서 셋 다 모였을 때 */
  samhyeong?: boolean
}

export interface UpsangRow {
  /** TRACKS 의 key — studentTarget.TRACKS 와 같은 낱말을 씁니다 */
  track: string
  key: string
  when: UpsangWhen
  /** 학생에게 — 학과·전공 말 (★금지어가 없어야 합니다) */
  student: string
  /** 성인에게 — 직무 말 */
  adult: string
  /** 왜 그렇게 보는가 — AI 가 «근거» 로 쓸 한 마디 */
  why: string
}

/**
 * ★계열마다 위에서부터 봅니다. 걸린 것 가운데 **가장 위 두 개** 만 냅니다.
 *   셋 넘게 주면 AI 가 다 나열해서 «핀포인트» 가 아니게 됩니다.
 */
export const UPSANG: UpsangRow[] = [
  // ── 의학 · 보건 ────────────────────────────────────────────────
  {
    track: 'medical', key: 'medical-surgery',
    when: { ohaeng: ['금'], hyeonchim: true },
    student: '수술처럼 «자르고 정확히 맞추는» 쪽 — 정형·치의학·신경외과 계열',
    adult: '수술·시술 중심 진료과 (정형외과·치과·신경외과)',
    why: '금(金)이 발달한 데다 현침살이 걸립니다. 쇠붙이와 바늘을 다루는 결이라 손끝의 정확함이 실력이 되는 자리입니다.',
  },
  {
    track: 'medical', key: 'medical-samhyeong',
    when: { samhyeong: true },
    student: '응급·중환자 같은 «급한 판을 잡는» 쪽',
    adult: '응급의학·중환자·외상 분야',
    why: '삼형이 원국에서 모입니다. 판이 급하게 엉킬 때 오히려 또렷해지는 결입니다.',
  },
  {
    track: 'medical', key: 'medical-water',
    when: { ohaeng: ['수'] },
    student: '몸속을 «들여다보고 읽어 내는» 쪽 — 진단·영상의학·약학 계열',
    adult: '진단·영상의학·약학·검사 분야',
    why: '수(水)가 발달합니다. 겉을 자르기보다 안을 살펴 읽는 쪽으로 힘이 붙습니다.',
  },
  {
    track: 'medical', key: 'medical-cheonmun',
    when: { cheonmun: true },
    student: '사람의 마음을 다루는 쪽 — 정신건강·심리·재활 계열',
    adult: '정신건강·심리 치료·재활 분야',
    why: '천문성이 걸립니다. 눈에 안 보이는 것을 읽는 결이라 마음을 다루는 자리와 맞물립니다.',
  },
  {
    track: 'medical', key: 'medical-earth',
    when: { ohaeng: ['토'] },
    student: '오래 돌보는 쪽 — 간호·보건행정·재활 계열',
    adult: '간호·보건행정·요양·재활 분야',
    why: '토(土)가 발달합니다. 한 자리에서 오래 품는 결이라 돌보는 일에 힘이 실립니다.',
  },

  // ── 인문 · 사회 · 어학 ─────────────────────────────────────────
  {
    track: 'humanities', key: 'hum-media',
    when: { sipsin: ['상관', '식신'], ohaeng: ['화'] },
    student: '드러내어 알리는 쪽 — 언론·미디어·광고홍보 계열',
    adult: '언론·미디어·콘텐츠·브랜드 커뮤니케이션',
    why: '식상이 살아 있고 화(火)가 함께 발달합니다. 안에 있는 것을 밖으로 내보이는 결입니다.',
  },
  {
    track: 'humanities', key: 'hum-research',
    when: { sipsin: ['정인', '편인'], ohaeng: ['목'] },
    student: '깊이 파는 쪽 — 어문·사학·철학·연구 계열',
    adult: '연구·분석·학술 (교육기관 연구직)',
    why: '인성에 목(木)이 함께 발달합니다. 쌓아 두고 뻗어 나가는 결이라 오래 파는 공부와 맞습니다.',
  },
  {
    track: 'humanities', key: 'hum-lang',
    when: { sipsin: ['편인'], ohaeng: ['수'] },
    student: '남의 말과 글로 들어가는 쪽 — 어학·통번역·지역학 계열',
    adult: '어학·통번역·해외 지역 전문',
    why: '편인에 수(水)가 함께 발달합니다. 낯선 것에 스며들어 제 것으로 만드는 결입니다.',
  },
  {
    track: 'humanities', key: 'hum-psy',
    when: { cheonmun: true },
    student: '사람 속을 읽는 쪽 — 심리·상담·인문학 계열',
    adult: '심리 상담·조직 심리·인문 기반 리서치',
    why: '천문성이 걸립니다. 말로 다 못 하는 것을 알아채는 결입니다.',
  },
  {
    track: 'humanities', key: 'hum-law',
    when: { sipsin: ['정관', '편관'], sipsinMin: 2 },
    student: '틀과 기준을 다루는 쪽 — 법학·법률·행정 계열',
    adult: '법률·규제·컴플라이언스 (로스쿨 포함)',
    why: '관성이 뚜렷합니다. 규칙을 세우고 지키는 자리에서 이 힘이 가장 크게 쓰입니다.',
  },

  // ── 자연 · 공학 ───────────────────────────────────────────────
  {
    track: 'natural', key: 'nat-metal',
    when: { ohaeng: ['금'], hyeonchim: true },
    student: '정밀하게 다루는 쪽 — 기계·재료·반도체 계열',
    adult: '정밀 기계·재료·반도체 공정',
    why: '금(金)이 발달한 데다 현침살이 걸립니다. 밀리미터를 다투는 자리에서 강합니다.',
  },
  {
    track: 'natural', key: 'nat-water',
    when: { ohaeng: ['수'], sipsin: ['편인'] },
    student: '눈에 안 보이는 것을 다루는 쪽 — 전산·데이터·수학 계열',
    adult: '데이터·알고리즘·연구개발',
    why: '수(水)와 편인이 함께 섭니다. 형체 없는 것을 구조로 잡는 결입니다.',
  },
  {
    track: 'natural', key: 'nat-fire',
    when: { ohaeng: ['화'] },
    student: '만들고 움직이는 쪽 — 전기·전자·에너지 계열',
    adult: '전기·전자·에너지·설비',
    why: '화(火)가 발달합니다. 힘을 일으켜 밀어 주는 결입니다.',
  },
  {
    track: 'natural', key: 'nat-wood',
    when: { ohaeng: ['목'] },
    student: '살아 있는 것을 다루는 쪽 — 생명·화학·환경 계열',
    adult: '생명공학·화학·환경',
    why: '목(木)이 발달합니다. 자라나는 것을 살피는 결입니다.',
  },
  {
    track: 'natural', key: 'nat-earth',
    when: { ohaeng: ['토'] },
    student: '터를 다루는 쪽 — 건축·토목·도시 계열',
    adult: '건축·토목·도시·플랜트',
    why: '토(土)가 발달합니다. 바탕을 잡고 세우는 결입니다.',
  },

  // ── 경영 · 경제 · 상경 ────────────────────────────────────────
  {
    track: 'business', key: 'biz-num',
    when: { sipsin: ['정재'], ohaeng: ['금'] },
    student: '숫자를 다루는 쪽 — 회계·재무·통계 계열',
    adult: '회계·재무·리스크 관리',
    why: '정재에 금(金)이 함께 섭니다. 어긋남을 못 견디는 결이라 숫자가 맞아떨어져야 하는 자리와 맞습니다.',
  },
  {
    track: 'business', key: 'biz-org',
    when: { sipsin: ['정관'], sipsinMin: 2 },
    student: '조직을 세우는 쪽 — 경영학·행정·인사 계열',
    adult: '경영관리·인사·조직 운영',
    why: '정관이 뚜렷합니다. 흩어진 것을 줄 세우는 결입니다.',
  },
  {
    track: 'business', key: 'biz-market',
    when: { sipsin: ['편재', '상관'], sipsinMin: 2 },
    student: '판을 읽는 쪽 — 마케팅·무역·경영전략 계열',
    adult: '마케팅·전략·신사업 기획',
    why: '편재와 상관이 섭니다. 넓게 벌여 두고 흐름을 읽는 결입니다.',
  },

  // ── 교육 · 사범 ───────────────────────────────────────────────
  {
    track: 'edu', key: 'edu-in',
    when: { sipsin: ['정인'], sipsinMin: 2 },
    student: '차곡차곡 가르치는 쪽 — 초등교육·교육학 계열',
    adult: '교육 기획·교재 개발·연수 설계',
    why: '정인이 뚜렷합니다. 쌓아 두었다가 그대로 내어 주는 결입니다.',
  },
  {
    track: 'edu', key: 'edu-sang',
    when: { sipsin: ['상관', '식신'], sipsinMin: 2 },
    student: '끌어내어 가르치는 쪽 — 국어·영어 교육, 예체능 교육 계열',
    adult: '강의·교육 콘텐츠·코칭',
    why: '식상이 살아 있습니다. 남의 것을 끌어내 주는 결입니다.',
  },
  {
    track: 'edu', key: 'edu-cheonmun',
    when: { cheonmun: true },
    student: '아이의 마음을 보는 쪽 — 상담·특수교육 계열',
    adult: '상담 교육·특수 교육·학습 심리',
    why: '천문성이 걸립니다. 겉으로 안 드러난 어려움을 알아채는 결입니다.',
  },

  // ── 예체능 ────────────────────────────────────────────────────
  {
    track: 'arts', key: 'arts-fire',
    when: { ohaeng: ['화'], sipsin: ['상관'] },
    student: '무대에 서는 쪽 — 연기·성악·실연 계열',
    adult: '공연·퍼포먼스·연출',
    why: '화(火)와 상관이 함께 섭니다. 봐 주는 눈이 있을 때 살아나는 결입니다.',
  },
  {
    track: 'arts', key: 'arts-metal',
    when: { ohaeng: ['금'], hyeonchim: true },
    student: '손으로 만드는 쪽 — 조형·공예·디자인 계열',
    adult: '제품·조형·공예 디자인',
    why: '금(金)에 현침살이 걸립니다. 손끝이 정확한 결입니다.',
  },
  {
    track: 'arts', key: 'arts-body',
    when: { ohaeng: ['토', '목'] },
    student: '몸으로 하는 쪽 — 체육·무용 계열',
    adult: '스포츠·트레이닝·무용',
    why: '토와 목이 함께 발달합니다. 몸을 바탕으로 밀어 올리는 결입니다.',
  },
  {
    track: 'arts', key: 'arts-water',
    when: { ohaeng: ['수'], sipsin: ['편인'] },
    student: '결을 짜 내는 쪽 — 작곡·문예창작·영상 계열',
    adult: '작곡·시나리오·영상 연출',
    why: '수(水)와 편인이 함께 섭니다. 안에서 오래 고여 있다 나오는 결입니다.',
  },
]

// ══════════════════════════════════════════════════════════════════
//  판정
// ══════════════════════════════════════════════════════════════════

/** 천문성은 «셋 이상» 모여야 본다 — 위 UpsangWhen.cheonmun 주석 참고 */
export const CHEONMUN_MIN = 3

/** 삼형 셋이 원국에 다 모였는가 */
const SAMHYEONG_SETS = [['寅', '巳', '申'], ['丑', '戌', '未']]

export interface UpsangCtx {
  saju: Pillar[]
  /** simsanOhaeng.calcSimsanOhaeng 이 낸 점수 */
  ohaengScore: Record<string, number>
  target: 'student' | 'adult'
}

/** 그 오행이 발달(25점) 이상인가 — simsanOhaeng.grade 와 같은 잣대 */
const isDeveloped = (score: Record<string, number>, el: string) => (score[el] ?? 0) >= 25

/**
 * 계열 안에서 «극대화되는 세부 자리» 를 골라 낸다.
 *
 * @returns 위에서부터 걸린 것 최대 두 개. 하나도 안 걸리면 빈 배열.
 *
 * ⚠️ 빈 배열이면 프롬프트에 아무 줄도 넣지 마십시오.
 *    «해당 없음» 이라고 적어 주면 AI 가 그 말을 손님에게 옮겨 씁니다. (교훈 BF)
 */
export function pickUpsang(track: string | null, ctx: UpsangCtx): UpsangRow[] {
  if (!track || track === 'undecided') return []

  const chars: string[] = []
  for (const p of ctx.saju) {
    for (const ch of [p.stem, p.branch]) if (ch && ch !== '?') chars.push(ch)
  }
  const branches = ctx.saju.map(p => p.branch).filter(b => b && b !== '?')
  const dayStem = ctx.saju.find(p => p.pillar === '일주')?.stem ?? ''

  /** ★Set 이 아니라 배열입니다 — 개수를 세야 sipsinMin 을 볼 수 있습니다 */
  const sipsinCount: string[] = []
  if (dayStem && dayStem !== '?') {
    for (const p of ctx.saju) {
      for (const [ch, isBr] of [[p.stem, false], [p.branch, true]] as Array<[string, boolean]>) {
        if (!ch || ch === '?') continue
        // 일간 자신은 십성이 없습니다. 넣으면 비견으로 잡힙니다.
        if (p.pillar === '일주' && !isBr) continue
        const s = sipsinOfChar(dayStem, ch)
        if (s) sipsinCount.push(s)
      }
    }
  }
  const hasHyeonchim = chars.some(c => HYEONCHIM_CHARS.includes(c))
  /** ★몇 자리인가 — 위 cheonmun 주석에 셋으로 정한 까닭이 있습니다 */
  const cheonmunN = branches.filter(b => CHEONMUN_CHARS.includes(b)).length
  const hasSamhyeong = SAMHYEONG_SETS.some(set => set.every(x => branches.includes(x)))

  const out: UpsangRow[] = []
  for (const row of UPSANG) {
    if (row.track !== track) continue
    const w = row.when
    // ★조건이 여러 가지면 **모두** 맞아야 합니다.
    //   하나만 맞아도 통과시키면 계열마다 다섯 줄이 다 걸려 «핀포인트» 가 아니게 됩니다.
    if (w.ohaeng && !w.ohaeng.some(el => isDeveloped(ctx.ohaengScore, el))) continue
    if (w.sipsin) {
      // ★«있는가» 가 아니라 «몇 자리인가» 를 봅니다. (위 sipsinMin 주석)
      const n = sipsinCount.filter(x => w.sipsin!.includes(x as Sipsin)).length
      if (n < (w.sipsinMin ?? 1)) continue
    }
    if (w.hyeonchim && !hasHyeonchim) continue
    if (w.cheonmun && cheonmunN < CHEONMUN_MIN) continue
    if (w.samhyeong && !hasSamhyeong) continue
    out.push(row)
    if (out.length >= 2) break
  }
  return out
}

/** 프롬프트 재료 한 덩이로 — 없으면 빈 문자열 */
export function upsangBlock(track: string | null, ctx: UpsangCtx): string {
  const rows = pickUpsang(track, ctx)
  if (!rows.length) return ''
  const say = ctx.target === 'student' ? (r: UpsangRow) => r.student : (r: UpsangRow) => r.adult
  return rows.map(r => `· ${say(r)}\n    (근거) ${r.why}`).join('\n')
}
