// lib/saju/toTongbyeonInput.ts
// ============================================================================
// result-new(만세력)가 이미 계산한 값들을 AI 통변용 TongbyeonInput 형태로 변환.
// ----------------------------------------------------------------------------
// result-new는 심산 오행·용신·명식·일간을 이미 계산해 둔다.
// 통변 화면(TongbyeonView)은 그 값을 TongbyeonInput로 받아야 하므로,
// 이 "다리" 함수 하나로 변환한다. (계산 로직을 다시 짜지 않고 재활용)
// ============================================================================

import type { TongbyeonInput, Ohaeng } from '@/lib/saju/tongbyeonPrompt'
// 용신 결과 타입 — 구버전 yongsin.ts 를 없애고 심산 기반 어댑터 타입으로 옮김(07-20).
//   두 타입은 필드가 완전히 같다(isStrong·yongsin·heeksin·gisin·gusin·hansin·score·description).
import type { YongsinCompatResult as YongsinResult } from '@/lib/saju/yongsinNew'
import { getUnsung } from '@/lib/saju/unsung'
import { getSinsal } from '@/lib/saju/sinsal'
import { getGongmang } from '@/lib/saju/gongmang'
import { getGwiinForBranch, getGwiinForStem } from '@/lib/saju/gwiin'
import { UNSUNG_MEANING } from '@/lib/saju/unsungMeaning'
import { SINSAL_MEANING } from '@/lib/saju/sinsalMeaning'
import { GWIIN_MEANING, GWIIN_HARMONY } from '@/lib/saju/gwiinMeaning'
import { GONGMANG_INTRO, GONGMANG_BY_PILLAR } from '@/lib/saju/gongmangMeaning'
// ★2026-07-27 — 교재 48~77쪽 지지 자료를 통변 재료로 넣는다.
//   지금까지 화면에만 있고 AI 는 몰랐다. (교훈 BF 의 반대편 — 줘야 할 것은 줘야 한다)
import { traitsInSaju, traitLines, noteLines, isDohwaAt, ctxOf, type Target } from '@/lib/saju/jijiTrait'
import { findByeongjon, findCombo, findJijiByeongjon, sayOf } from '@/lib/saju/byeongjon'
import { jijiRelation } from '@/lib/saju/jijiGrade'
// ★2026-07-28 — 교재 20~28·41~47·78~86·94~97쪽 자료를 통변 재료로 넣는다.
//   ⚠️ 통째로 넣지 않는다. 걸린 것만 골라 넣는다. (교훈 BS · 31부 §6)
//      일곱 파일의 나가는 문장을 다 합치면 33,000자다. 조건으로 거르면
//      한 사람당 1,500~2,000자로 떨어진다.
import { CHEONGAN_TRAIT } from '@/lib/saju/cheonganTrait'
import { OHAENG_TRAIT } from '@/lib/saju/ohaengTrait'
import { OHAENG_NATURE } from '@/lib/saju/ohaengNature'
import { OHAENG_25 } from '@/lib/saju/ohaengTable25'
import { findChungByChars } from '@/lib/saju/chungMeaning'
import { findHap } from '@/lib/saju/hapMeaning'
import { SAL_TABLE } from '@/lib/saju/sinsalTable'
import { hyeongPaHaeBrief } from '@/lib/saju/jaryoPick'
import { grade as ohaengGrade } from '@/lib/saju/simsanOhaeng'

// 천간 → 오행
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
// 천간 한글 이름
const STEM_KOR: Record<string, string> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무',
  己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
}
// 지지 한글
const BRANCH_KOR: Record<string, string> = {
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사',
  午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
}

// 시지 → 태어난 시각의 실제 기운 (밤/낮·계절감). 프롬프트에서 이 문구를 근거로 씀.
// ※ "시주=노년 자리"가 아니라 "실제 태어난 시각의 기운"을 반영하기 위한 것.
const HOUR_MOOD: Record<string, string> = {
  子: '한밤중, 물기운이 가장 깊은 시각',
  丑: '깊은 새벽, 아직 어둠이 짙은 시각',
  寅: '새벽 동틀 무렵, 봄기운이 시작되는 시각',
  卯: '아침 해가 떠오르는 시각',
  辰: '해가 완연히 오른 늦은 아침',
  巳: '한낮으로 향하는 밝은 시각',
  午: '해가 가장 높이 뜬 한낮의 시각',
  未: '한낮의 열기가 무르익은 오후',
  申: '해가 기우는 늦은 오후',
  酉: '해 질 녘, 저녁으로 접어드는 시각',
  戌: '땅거미 지는 초저녁',
  亥: '밤이 깊어가는 초야의 시각',
}

// 명식 한 기둥 (result-new의 saju 요소 형태)
export interface PillarInput { pillar: string; stem: string; branch: string }

/** 지금 흐르는 대운 한 칸 — 화면이 /api/dayun 으로 받아 넘긴다 */
export interface DayunLite {
  age: number; cheongan: string; jiji: string; ganYukchin: string; jiYukchin: string
}
/** 올해 세운 한 칸 */
export interface SeyunLite {
  year: number; cheongan: string; jiji: string; ganYukchin: string; jiYukchin: string
}

export interface ToTongbyeonArgs {
  name: string
  gender: string                       // '남' | '여'
  age: number                          // 만나이
  saju: PillarInput[]                  // 명식 4기둥
  dayStem: string                      // 일간(한자)
  ohaeng: Array<{ el: Ohaeng; pct: number }>  // 심산 오행 (toPercentList 결과)
  yongsin?: YongsinResult | null       // 용신 계산 결과
  hourBranch?: string | null           // 시지(한자). 없으면 '모름'
  /** ★지금 흐르는 대운 — 없으면 대운 재료가 빠진다 */
  currentDayun?: DayunLite | null
  /** ★올해 세운 */
  thisYearSeyun?: SeyunLite | null
  /**
   * ★2026-07-28 — 손님이 고른 질문의 대분류.
   *   재료를 이걸로 고른다. 안 넘기면 밑바탕만 나간다.
   *   교재 자료를 다 넣어 두되, 물어본 것에 맞는 것만 꺼내 쓰기 위함이다.
   */
  questionCategories?: string[]
  // ── 확장 자리 ────────────────────────────────────────────────
  // 대운·세운은 기본 통변에 넣지 않는다. (홈에 별도 서비스가 있음)
  // 사용자가 "언제/내년/몇 살" 같은 시기 질문을 직접입력했을 때만,
  // 그때 대운·세운을 불러와 프롬프트에 추가 블록으로 붙일 예정.
  // 지금은 구조만 열어둔다. (다음 단계에서 채움)
  //   daeunList?: ...
  //   seyunList?: ...
}

// 한자 간지 기둥 → 한글 표기 (예: "정축")
function pillarKor(p?: PillarInput): string {
  if (!p) return ''
  return (STEM_KOR[p.stem] ?? p.stem) + (BRANCH_KOR[p.branch] ?? p.branch)
}

// 명식 특징(12운성·신살·귀인·공망)을 "해석 포함" 텍스트로 조립.
//   해당하는 것만 넣어 프롬프트가 길어지지 않게 한다. 계산·해석 사전을 엮음.
function buildMyeongsikFeatures(
  saju: PillarInput[],
  dayStem: string
): string {
  const lines: string[] = []
  const yearBranch = saju.find(p => p.pillar === '년주')?.branch ?? ''
  const dayBranch = saju.find(p => p.pillar === '일주')?.branch ?? ''
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''

  // ── 12운성 (일주 중심으로 대표 1개 + 각 기둥) ──
  const iljiUnsung = dayStem && dayBranch ? getUnsung(dayStem, dayBranch) : ''
  if (iljiUnsung && UNSUNG_MEANING[iljiUnsung]) {
    const m = UNSUNG_MEANING[iljiUnsung]
    lines.push(`- 일주 12운성: ${iljiUnsung} — ${m.key}. ${m.tip}`)
  }

  // ── 신살 (년지 기준, 각 지지) — 대표적인 것만(중복 제거) ──
  const sinsalSet = new Set<string>()
  for (const p of saju) {
    if (!p.branch) continue
    const s = getSinsal(yearBranch, p.branch)
    if (s && SINSAL_MEANING[s]) sinsalSet.add(s)
  }
  for (const s of sinsalSet) {
    const m = SINSAL_MEANING[s]
    lines.push(`- 신살 ${s}: ${m.key}. ${m.tip}`)
  }

  // ── 귀인 (있는 것만) ──
  const gwiinSet = new Set<string>()
  for (const p of saju) {
    if (p.stem) for (const g of getGwiinForStem(monthBranch, p.stem)) gwiinSet.add(g)
    if (p.branch) for (const g of getGwiinForBranch(dayStem, monthBranch, p.branch)) gwiinSet.add(g)
  }
  for (const g of gwiinSet) {
    const m = GWIIN_MEANING[g]
    if (m) lines.push(`- 귀인 ${g}: ${m.bless}. ${m.tip}`)
  }
  if (gwiinSet.size >= 2) lines.push(`- 귀인 조화: ${GWIIN_HARMONY}`)

  // ── 공망 (일주 기준, 어느 기둥이 비었는지) ──
  if (dayStem && dayBranch) {
    const gm = getGongmang(dayStem, dayBranch)  // [지지, 지지]
    if (gm && gm[0] && gm[0] !== '?') {
      const emptyPillars: string[] = []
      for (const p of saju) {
        if (p.branch === gm[0] || p.branch === gm[1]) emptyPillars.push(p.pillar)
      }
      if (emptyPillars.length) {
        lines.push(`- 공망: ${gm[0]}·${gm[1]} (${emptyPillars.join('·')}에 해당). ${GONGMANG_INTRO}`)
        for (const pillar of emptyPillars) {
          const gp = GONGMANG_BY_PILLAR[pillar]
          if (gp) lines.push(`  · ${pillar} 공망 — ${gp.title}: ${gp.desc}`)
        }
      }
    }
  }

  if (!lines.length) return ''
  return `[명식 특징 — 이 사람에게 실제로 있는 것들(질문에 관련될 때 근거로 쓰되 겁주지 말 것)]\n${lines.join('\n')}`
}

/**
 * 지지가 말하는 것 — 교재 48쪽 「地支의 종류」 + 50~73쪽 「12地支 심층 분석」 특징 문단
 *
 * ★월지·일지는 통째로, 년지·시지는 48쪽 비고만 넣는다.
 *   교재 72쪽 亥 "月支와 日支에 있을 때 가장 강력하게 작용한다"
 *   교재 90쪽 신살 작용력도 월지·일지가 가장 크다.
 *   넷을 다 통째로 넣으면 재료가 프롬프트를 덮어 버린다.
 *
 * ⚠️ row.original 은 절대 안 넣는다. 교재 원문이라 화면에 낼 수 없는 말이 섞여 있다. (교훈 BF)
 */
function buildJijiTrait(saju: PillarInput[], target: Target): string {
  const hits = traitsInSaju(saju)
  if (!hits.length) return ''
  const ctx = ctxOf(saju as never)
  const lines = hits.map(h => {
    const strong = h.pillars.includes('월지') || h.pillars.includes('일지')
    const dohwa = h.pillars.some(p => isDohwaAt(p.replace('지', '주'), h.branch)) ? ' [도화]' : ''
    const body = strong
      ? [...traitLines(h.row, target, ctx), ...noteLines(h.row, target, ctx)].join(' ')
      : noteLines(h.row, target, ctx).join(' ')
    const jobs = strong && h.row.jobs?.length ? ` (교재가 든 직업: ${h.row.jobs.join('·')})` : ''
    return `- ${h.pillar} ${h.branch}(${h.row.ko}·${h.row.tti})${dohwa} — ${body}${jobs}`
  })
  return `[지지가 말하는 것 — 교재 48쪽·50~73쪽. 월지와 일지가 가장 세다]\n${lines.join('\n')}`
}

/** 병존 — 같은 글자가 나란히 (교재 74~77쪽) */
function buildByeongjon(saju: PillarInput[], target: Target): string {
  const lines: string[] = []
  for (const h of findByeongjon(saju)) {
    const yeok = h.row.yeokma ? ` [역마 ${h.row.yeokma}]` : ''
    lines.push(`- ${h.key} (${h.pillars.join('·')})${yeok} — ${sayOf(h.row, target)}`)
  }
  for (const c of findCombo(saju)) {
    lines.push(`- ${c.row.need.join('')} ${c.key} (${c.pillars.join('·')}) — ${sayOf(c.row, target)}`)
  }
  for (const h of findJijiByeongjon(saju)) {
    const sal = h.row.sal?.length ? ` [${h.row.sal.join('·')}]` : ''
    const jobs = h.row.jobs?.length ? ` (교재가 든 직업: ${h.row.jobs.join('·')})` : ''
    lines.push(`- ${h.key} (${h.pillars.join('·')})${sal} — ${sayOf(h.row, target)}${jobs}`)
  }
  if (!lines.length) return ''
  return `[병존 — 같은 글자가 나란히 있어 그 기운이 짙다 (교재 74~77쪽)]\n${lines.join('\n')}`
}

/**
 * 지금 흐름과 내 지지의 어울림 — 교재 49쪽 144칸
 * ★교재 49쪽 "대운이나 세운을 일단 月支에 대입해라. 月支가 총사령관이다"
 */
function buildUnJiji(
  saju: PillarInput[],
  target: Target,
  dayun?: DayunLite | null,
  seyun?: SeyunLite | null,
): string {
  const myMonth = saju.find(p => p.pillar === '월주')?.branch ?? ''
  const myDay = saju.find(p => p.pillar === '일주')?.branch ?? ''
  if (!myMonth && !myDay) return ''
  const lines: string[] = []
  const one = (label: string, branch: string) => {
    const e = jijiRelation(myMonth, branch)
    const f = jijiRelation(myDay, branch)
    if (!e && !f) return
    const parts: string[] = []
    // ★학생에게는 해설(desc)을 주지 않는다.
    //   144칸 해설은 교재 원문이라 학생/성인 구분이 없고, 병명(조울증·맹장염·감염증)과
    //   투자 권유(주식·공격적 투자)가 섞여 있다. 재료에 있으면 AI 가 꺼내 쓴다. (교훈 BF)
    //   등급과 관계 이름까지만 주면 흐름은 짚으면서 위험한 말은 안 나온다.
    const tail = (r: NonNullable<ReturnType<typeof jijiRelation>>) =>
      target === 'student' ? '' : ` — ${r.desc}`
    if (e) parts.push(`환경(월지 ${myMonth}) ${e.grade} ${e.tag}${tail(e)}`)
    if (f) parts.push(`나(일지 ${myDay}) ${f.grade} ${f.tag}${tail(f)}`)
    lines.push(`- ${label}: ${parts.join(' / ')}`)
  }
  if (dayun) one(`대운 ${dayun.cheongan}${dayun.jiji} (${dayun.age}세부터, 천간 ${dayun.ganYukchin}·지지 ${dayun.jiYukchin})`, dayun.jiji)
  // ★"(올해)"를 붙인다. 이게 없으면 AI 가 연도를 몰라 지난 해를 앞일처럼 쓴다.
  if (seyun) one(`${seyun.year}년(올해) 세운 ${seyun.cheongan}${seyun.jiji} (천간 ${seyun.ganYukchin}·지지 ${seyun.jiYukchin})`, seyun.jiji)
  if (!lines.length) return ''
  return `[지금 흐름이 내 지지와 어떻게 어울리나 — 교재 49쪽. 등급 A~D 는 눈금이지 좋고 나쁨의 판정이 아니다]\n${lines.join('\n')}`
}


// ═══════════════════════════════════════════════════════════
//  2026-07-28 추가분 — 교재 자료를 "물어본 것에 맞게" 골라 낸다
//
//  ★자료는 일곱 파일에 다 들어 있다(합치면 33,000자).
//    그것을 다 내보내는 것이 아니라, 손님이 고른 질문의 갈래에 맞는 것만
//    꺼내 쓴다. 재료가 부풀면 통변이 흐려진다. (교훈 BS · 31부 §6)
//
//  ★갈래를 안 넘기면(대운·세운 화면 등) 밑바탕만 나간다.
// ═══════════════════════════════════════════════════════════

/** 질문 대분류 → 어떤 자료를 꺼낼까 */
type Need = '일간' | '오행' | '건강' | '개운' | '합' | '충' | '살' | '직업' | '다루는법' | '인생단계'

const CATEGORY_NEEDS: Record<string, Need[]> = {
  '건강':      ['건강', '충', '개운'],
  '건강·자기':  ['건강', '오행', '개운', '일간'],
  '재물':      ['오행', '충', '일간'],
  '노후·재물':  ['오행', '충', '인생단계'],
  '진로·적성':  ['일간', '오행', '살', '직업'],
  '직업·진로':  ['일간', '오행', '살', '직업'],
  '직업·사업':  ['일간', '살', '직업', '충'],
  '취업':      ['일간', '살', '직업'],
  '연애':      ['합', '살', '일간'],
  '연애·결혼':  ['합', '충', '일간'],
  '관계·마음':  ['일간', '다루는법', '합'],
  '인간관계':   ['일간', '다루는법', '합'],
  '가정':      ['충', '일간', '다루는법'],
  '가족':      ['충', '다루는법'],
  '부모':      ['충', '다루는법'],
  '자녀':      ['충', '오행'],
  '출산·자녀':  ['충', '오행'],
  '노후':      ['인생단계', '오행', '건강'],
  '인생후반':   ['인생단계', '오행', '충'],
}

/** 갈래가 없을 때의 밑바탕 — 일간 몇 줄만 */
const BASE_NEEDS: Need[] = ['일간']

function needsOf(cats?: string[]): Set<Need> {
  // ★일간은 늘 넣는다. AI 가 "이 사람이 누구인가"를 모르면 어떤 답도 흐려진다.
  const out = new Set<Need>(BASE_NEEDS)
  for (const c of cats ?? []) for (const n of CATEGORY_NEEDS[c] ?? []) out.add(n)
  return out
}

/** 판정 조건을 적은 줄은 재료에서 뺀다. AI 에게 줄 것은 뜻이지 잣대가 아니다. */
const isRule = (t: string) =>
  /개 이상|포함해|되풀이|섞여 있어도|차례로 작용력|일 때 봅니다|해당하며/.test(t)

/** 일간이 말하는 것 — 교재 41~47쪽 */
function buildCheongan(dayStem: string, target: Target, gender: string, need: Set<Need>): string {
  if (!need.has('일간')) return ''
  const r = CHEONGAN_TRAIT[dayStem]
  if (!r) return ''
  // 갈래가 많이 걸릴수록 짧게. 물어본 것이 넓으면 일간은 밑그림만 준다.
  const cap = need.size >= 4 ? 3 : 5
  const lines = [`- ${dayStem}(${r.ko}) ${r.image} — ${r.tendency}, ${r.keyword}. ${r.nature41}`]
  for (const t of r.traits.slice(0, cap)) lines.push(`- ${t}`)
  for (const t of r.advice.slice(0, 2)) lines.push(`- ${t}`)
  // ★성별 줄은 본인이 자기 명식을 보는 자리에서만. 궁합에서는 넘기지 말 것.
  if (target === 'adult' && (gender === '남' || gender === '여')) {
    for (const t of r.sayByGender?.[gender] ?? []) lines.push(`- ${t}`)
  }
  return `[일간이 말하는 것 — 교재 41~47쪽. 이 사람의 본바탕이다]\n${lines.join('\n')}`
}

/** 오행이 넘치거나 모자란 자리 — 교재 20~28쪽 */
function buildOhaengGrade(score: Record<Ohaeng, number>, target: Target, need: Set<Need>): string {
  if (!need.has('오행') && !need.has('건강') && !need.has('개운') && !need.has('다루는법')) return ''
  const lines: string[] = []
  const EL: Ohaeng[] = ['목', '화', '토', '금', '수']
  for (const el of EL) {
    const g = ohaengGrade(score[el] ?? 0)
    if (g !== '과다' && g !== '결핍') continue
    const t = OHAENG_TRAIT[el]; const n = OHAENG_NATURE[el]
    if (!t) continue
    const parts: string[] = []
    if (g === '과다') {
      if (need.has('오행')) parts.push(...t.excess.slice(0, 2))
      if (need.has('건강') && target === 'adult') parts.push(...(t.excessAdult ?? []).slice(0, 2))
      if (target === 'student') parts.push(...(t.excessStudent ?? []).slice(0, 1))
      lines.push(`- ${el}(${t.hanja}) 과다 ${score[el]}점 — ${parts.join(' ')}`)
      if (need.has('다루는법') && n?.handling?.length) {
        lines.push(`  · 곁의 사람이 대할 때: ${n.handling.slice(0, 2).join(' ')}`)
      }
    } else {
      if (need.has('오행')) parts.push(...t.lack.slice(0, 2))
      if (need.has('건강') && target === 'adult') parts.push(...(t.lackAdult ?? []).slice(0, 2))
      if (target === 'student') parts.push(...(t.lackStudent ?? []).slice(0, 1))
      lines.push(`- ${el}(${t.hanja}) 결핍 — ${parts.join(' ')}`)
      if (need.has('개운') && t.gaeun?.length) lines.push(`  · 개운법: ${t.gaeun.slice(0, 3).join(' ')}`)
    }
  }
  if (!lines.length) return ''
  return `[오행이 넘치거나 모자란 자리 — 교재 20~28쪽. 넘치는 것도 모자란 것도 결이지 흠이 아니다]\n${lines.join('\n')}`
}

/** 합과 충 — 교재 78~86쪽. 원국에 실제로 선 것만 */
function buildHapChung(saju: PillarInput[], target: Target, need: Set<Need>): string {
  const wantHap = need.has('합'); const wantChung = need.has('충') || need.has('건강')
  if (!wantHap && !wantChung) return ''
  const branches = saju.map(p => p.branch).filter(Boolean)
  const stems = saju.map(p => p.stem).filter(Boolean)
  const lines: string[] = []
  const seen = new Set<string>()

  if (wantChung) {
    for (let i = 0; i < branches.length; i++) {
      for (let j = i + 1; j < branches.length; j++) {
        const r = findChungByChars(branches[i], branches[j])
        if (!r || seen.has(r.key)) continue
        seen.add(r.key)
        const say = r.say.filter(t => !isRule(t)).slice(0, 2)
        // 건강을 물었을 때만 장부 줄까지 준다
        const extra = need.has('건강') && target === 'adult' ? (r.sayAdult ?? []).slice(0, 2) : []
        lines.push(`- ${r.key}${r.alias ? `(${r.alias})` : ''} — ${[...say, ...extra].join(' ')}`)
      }
    }
  }
  if (wantHap) {
    const PAIRS: [string, string, string][] = [
      ['甲', '己', '甲己合'], ['乙', '庚', '乙庚合'], ['丙', '辛', '丙辛合'],
      ['丁', '壬', '丁壬合'], ['戊', '癸', '戊癸合'],
    ]
    for (const [a1, b1, key] of PAIRS) {
      if (!stems.includes(a1) || !stems.includes(b1) || seen.has(key)) continue
      const r = findHap(key); if (!r) continue
      seen.add(key)
      const say = r.say.filter(t => !isRule(t)).slice(0, 2)
      const extra = target === 'adult' ? (r.sayAdult ?? []).slice(0, 1) : []
      lines.push(`- ${r.key}${r.name ? `(${r.name})` : ''} — ${[...say, ...extra].join(' ')}`)
    }
  }
  // ★2026-07-28 — 형·파·해·원진 (교재 87~93쪽). 합충과 한 벌이다.
  for (const t of hyeongPaHaeBrief(saju, target).slice(0, 4)) lines.push(`- ${t}`)
  if (!lines.length) return ''
  return `[합·충·형·파·해 — 교재 78~93쪽. 천간은 합을 중히 보고 지지는 충을 중히 본다]\n${lines.join('\n')}`
}

/**
 * 살 — 교재 94~97쪽. 걸린 것만.
 *   ★교재가 개수·자리 조건을 적어 둔 살만 잰다.
 *     역마·화개·천문성·천라·지망은 조건이 없어 거의 모두에게 걸린다. (교훈 BO)
 *   ⚠️ 양인살은 96쪽 표(다섯, 일간 기준 월지)로 잰다.
 *      career/tables/sinsal.ts(93쪽)는 셋이다. 연재쌤 확인 항목.
 */
function buildSal(saju: PillarInput[], target: Target, need: Set<Need>): string {
  if (!need.has('살')) return ''
  const at = (n: string) => saju.find(p => p.pillar === n)
  const branches = saju.map(p => p.branch).filter(Boolean)
  const stems = saju.map(p => p.stem).filter(Boolean)
  const pillars = saju.map(p => `${p.stem}${p.branch}`)
  const monthB = at('월주')?.branch ?? ''
  const dayB = at('일주')?.branch ?? ''
  const dayStem = at('일주')?.stem ?? ''
  const hits: string[] = []

  const DOHWA = ['子', '午', '卯', '酉']
  if (branches.filter(b => DOHWA.includes(b)).length >= 2 &&
      (DOHWA.includes(monthB) || DOHWA.includes(dayB))) hits.push('dohwa')

  const HC = ['甲', '午', '未', '申', '辛']
  if ([...stems, ...branches].filter(c => HC.includes(c)).length >= 3 ||
      (HC.includes(dayStem) && HC.includes(dayB))) hits.push('hyeonchim')

  if (['甲辰','乙未','丙戌','丁丑','戊辰','壬戌','癸丑'].some(x => pillars.includes(x))) hits.push('baekho')
  if (['庚辰','庚戌','壬辰','壬戌','戊辰','戊戌'].some(x => pillars.includes(x))) hits.push('goegang')

  const YANGIN: Record<string, string> = { 甲: '卯', 丙: '午', 戊: '午', 庚: '酉', 壬: '子' }
  if (dayStem && YANGIN[dayStem] && monthB === YANGIN[dayStem]) hits.push('yangin')

  for (const key of ['cheoneulgwiin', 'munchang']) {
    const r = SAL_TABLE.find(x => x.key === key)
    if ((r?.byDayStem?.[dayStem] ?? []).some(b => branches.includes(b))) hits.push(key)
  }

  const lines: string[] = []
  for (const key of hits) {
    const r = SAL_TABLE.find(x => x.key === key); if (!r) continue
    const mean = r.say.filter(t => !isRule(t))
    const say = [...mean.slice(0, 2), ...(target === 'adult' ? (r.sayAdult ?? []).slice(0, 1) : [])]
    // 직업을 물었을 때만 직업 목록을 준다
    const jobs = need.has('직업') && r.jobs?.length ? ` (교재가 든 일: ${r.jobs.slice(0, 5).join('·')})` : ''
    lines.push(`- ${r.name} — ${say.join(' ')}${jobs}`)
  }
  if (!lines.length) return ''
  return `[살(殺) — 교재 94~97쪽. 살은 겁줄 이름이 아니라 결을 가리키는 말이다]\n${lines.join('\n')}`
}

/** 인생의 어느 때인가 — 교재 25쪽. 노후·인생후반을 물었을 때만 */
function buildLifeStage(score: Record<Ohaeng, number>, need: Set<Need>): string {
  if (!need.has('인생단계')) return ''
  const EL: Ohaeng[] = ['목', '화', '토', '금', '수']
  const top = EL.slice().sort((a, b) => (score[b] ?? 0) - (score[a] ?? 0))[0]
  const r = OHAENG_25[top]
  if (!r) return ''
  return `[인생의 결 — 교재 25쪽]\n- 가장 센 기운은 ${top}(${r.hanja})입니다. 계절로는 ${r.season}, 하루로는 ${r.timeOfDay}, 인생으로는 ${r.lifeStage}의 자리입니다.`
}


export function toTongbyeonInput(a: ToTongbyeonArgs): TongbyeonInput {
  const find = (name: string) => a.saju.find(p => p.pillar === name)
  const yearP = find('년주'); const monthP = find('월주')
  const dayP = find('일주'); const hourP = find('시주')

  // 심산 오행 점수 (pct를 점수로. 심산은 총 100점이라 사실상 동일)
  const score: Record<Ohaeng, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const o of a.ohaeng) score[o.el] = Math.round(o.pct)

  // 최다 / 결핍
  const sorted = [...a.ohaeng].sort((x, y) => y.pct - x.pct)
  const topElement: Ohaeng = sorted[0]?.el ?? '토'
  const lackElements = a.ohaeng.filter(o => o.pct <= 5).map(o => o.el)

  const dayEl = STEM_EL[a.dayStem] ?? '토'
  const hb = a.hourBranch ?? hourP?.branch ?? null
  const hourLabel = hb ? `${BRANCH_KOR[hb] ?? hb}시` : '태어난 시각 모름'
  const hourMood = hb ? (HOUR_MOOD[hb] ?? '') : ''

  // 용신 (억부용신 우선, 한글 오행 그대로 넘김)
  const yongsinStr = a.yongsin?.yongsin ?? ''
  const yongsinEl = (['목', '화', '토', '금', '수'] as Ohaeng[]).includes(yongsinStr as Ohaeng)
    ? (yongsinStr as Ohaeng)
    : undefined

  const need = needsOf(a.questionCategories)

  return {
    name: a.name || '이 분',
    age: a.age,
    gender: a.gender,
    yearPillar: pillarKor(yearP),
    monthPillar: pillarKor(monthP),
    dayPillar: pillarKor(dayP),
    hourPillar: pillarKor(hourP),
    dayStem: STEM_KOR[a.dayStem] ?? a.dayStem,
    dayStemElement: dayEl,
    hourLabel,
    hourMood,
    ohaengScore: score,
    topElement,
    lackElements,
    yongsin: yongsinStr || undefined,
    yongsinElement: yongsinEl,
    // 명식 특징(12운성·신살·귀인·공망) — 해당하는 것만 해석 포함해 조립.
    // ★2026-07-27 — 명식 특징에 교재 48~77쪽 지지 자료를 이어 붙인다.
    //   ① 12운성·신살·귀인·공망 (전부터 있던 것)
    //   ② 지지가 말하는 것   48쪽·50~73쪽
    //   ③ 병존               74~77쪽
    //   ④ 지금 흐름과의 어울림 49쪽 144칸 (대운·세운을 넘겨받았을 때만)
    //   학생/성인은 나이로 가른다. 아이 사주를 부모가 함께 읽는 자리이기 때문이다.
    myeongsikFeatures: [
      buildMyeongsikFeatures(a.saju, a.dayStem),
      buildJijiTrait(a.saju, a.age < 20 ? 'student' : 'adult'),
      buildByeongjon(a.saju, a.age < 20 ? 'student' : 'adult'),
      buildUnJiji(a.saju, a.age < 20 ? 'student' : 'adult', a.currentDayun, a.thisYearSeyun),
      // ★2026-07-28 — 손님이 고른 질문의 갈래에 맞는 것만 꺼낸다.
      //   갈래를 안 넘기면 일간 몇 줄만 나간다.
      buildCheongan(a.dayStem, a.age < 20 ? 'student' : 'adult', a.gender, need),
      buildOhaengGrade(score, a.age < 20 ? 'student' : 'adult', need),
      buildHapChung(a.saju, a.age < 20 ? 'student' : 'adult', need),
      buildSal(a.saju, a.age < 20 ? 'student' : 'adult', need),
      buildLifeStage(score, need),
    ].filter(Boolean).join('\n\n') || undefined,
    // ★대운을 넘겨받았으면 프롬프트의 "지금 흐르는 큰 흐름" 자리도 채운다.
    //   전에는 이 자리가 선언만 되어 있고 아무도 안 채우고 있었다.
    currentDaeun: a.currentDayun
      ? `${a.currentDayun.cheongan}${a.currentDayun.jiji} 대운 (${a.currentDayun.age}세부터)`
      : undefined,
    // 신강약·대운은 기본 통변에 넣지 않는다 (심플하게).
    // 시기 질문 시에만 확장해서 붙일 예정.
  }
}
