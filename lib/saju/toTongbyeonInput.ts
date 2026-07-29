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
import { calcYongsinNew, checkAgree } from '@/lib/saju/yongsinNew'
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
import { type Target } from '@/lib/saju/jijiTrait'
import { jijiRelation } from '@/lib/saju/jijiGrade'
// ★2026-07-28 — 교재 20~28·41~47·78~86·94~97쪽 자료를 통변 재료로 넣는다.
//   ⚠️ 통째로 넣지 않는다. 걸린 것만 골라 넣는다. (교훈 BS · 31부 §6)
//      일곱 파일의 나가는 문장을 다 합치면 33,000자다. 조건으로 거르면
//      한 사람당 1,500~2,000자로 떨어진다.
// ★2026-07-28 — 교재 자료는 jaryoPick 단일 창구에서만 받는다. (교훈 BQ)
import { pick } from '@/lib/saju/jaryoPick'
// ★운(대운·세운)이 원국을 치는 沖 — 교재 84쪽·121쪽 (2026-07-28)
import { unChungInSaju, unChungLine } from '@/lib/saju/yukchinRule'

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
// ★2026-07-29 — 흐름 재료는 unseContext 한 곳에서만 짠다. (교훈 CJ)
import {
  buildWongukContext, buildDaeunContext, buildSeyunContext, buildUnseContext,
} from './unseContext'

/**
 * ★2026-07-29 — 통합 리포트가 AI 에게 보내는 재료의 **총량** 상한.
 *   대표님 지시: 1,800~2,000자. 넉넉한 쪽 끝을 잡되 흐름 재료를 먼저 확보한다.
 *   ⚠️ jaryoPick.SERVICE_BUDGET.integrated(2000) 와 다릅니다.
 *      그쪽은 «고른 줄»만, 이쪽은 제목·명식특징까지 **다 세는 총량**입니다.
 */
export const INTEGRATED_TOTAL_CAP = 2000

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
  /**
   * ★2026-07-28 — 대운·세운 진입 여부 (unseQuestions.UnseEntry).
   *   대운·세운·월운은 갈래 이름이 사주보기와 다른 벌이라
   *   CATEGORY_NEEDS 에서 못 찾고 재료가 늘 통째로 나가고 있었다.
   *   이 값으로 대운 표와 세운·월운 표를 갈라 쓴다.
   *   안 넘기면 세운·월운 표를 fallback 으로 쓴다(예전과 같이 동작).
   */
  unseEntry?: 'daeun' | 'seyun' | null
  /**
   * ★2026-07-29 — 통합 리포트 모드. (대표님 확정: 사주·대운·연월운세 단권화)
   *   켜면 [원국 + 대운 + 세운] 세 덩이를 unseContext 로 짜서 프롬프트에 얹고,
   *   AI 에게 스토리텔링으로 엮으라고 지시합니다.
   *   ⚠️ 이때 재료 상한이 saju(1600) 이 아니라 integrated(2000) 가 됩니다.
   */
  integrated?: boolean
  /** 통합 모드에서 쓰는 대운 목록 — 화면이 /api/dayun 으로 받아 둔 것을 넘긴다 */
  dayunList?: DayunLite[]
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
/**
 * @param compact ★2026-07-29 — 통합 리포트용 짧은 판.
 *   이름과 한 마디(key)만 남기고 긴 조언(tip)·공망 자리별 해설을 뺍니다.
 *   [왜] 통합 리포트는 대운·세운까지 실어야 해서 자리가 빠듯합니다.
 *        긴 판(1,200자 남짓)을 그대로 실으면 총량에 안 들어가 **통째로 잘립니다.**
 *        그러면 손님이 "제 귀인이 뭔가요" 라고 물어도 AI 가 답할 근거가 없습니다.
 *        짧은 판(400자 남짓)으로 두면 **이름은 살아남아** 답할 수 있습니다.
 *   ⚠️ 뜻을 빼는 것이 아니라 조언만 접는 것입니다. (교훈 BR)
 */
function buildMyeongsikFeatures(
  saju: PillarInput[],
  dayStem: string,
  compact = false,
): string {
  const lines: string[] = []
  const yearBranch = saju.find(p => p.pillar === '년주')?.branch ?? ''
  const dayBranch = saju.find(p => p.pillar === '일주')?.branch ?? ''
  const monthBranch = saju.find(p => p.pillar === '월주')?.branch ?? ''

  // ── 12운성 (일주 중심으로 대표 1개 + 각 기둥) ──
  const iljiUnsung = dayStem && dayBranch ? getUnsung(dayStem, dayBranch) : ''
  if (iljiUnsung && UNSUNG_MEANING[iljiUnsung]) {
    const m = UNSUNG_MEANING[iljiUnsung]
    lines.push(compact ? `- 일주 12운성: ${iljiUnsung} — ${m.key}` : `- 일주 12운성: ${iljiUnsung} — ${m.key}. ${m.tip}`)
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
    lines.push(compact ? `- 신살 ${s}: ${m.key}` : `- 신살 ${s}: ${m.key}. ${m.tip}`)
  }

  // ── 귀인 (있는 것만) ──
  const gwiinSet = new Set<string>()
  for (const p of saju) {
    if (p.stem) for (const g of getGwiinForStem(monthBranch, p.stem)) gwiinSet.add(g)
    if (p.branch) for (const g of getGwiinForBranch(dayStem, monthBranch, p.branch)) gwiinSet.add(g)
  }
  for (const g of gwiinSet) {
    const m = GWIIN_MEANING[g]
    if (m) lines.push(compact ? `- 귀인 ${g}: ${m.bless}` : `- 귀인 ${g}: ${m.bless}. ${m.tip}`)
  }
  if (gwiinSet.size >= 2 && !compact) lines.push(`- 귀인 조화: ${GWIIN_HARMONY}`)

  // ── 공망 (일주 기준, 어느 기둥이 비었는지) ──
  if (dayStem && dayBranch) {
    const gm = getGongmang(dayStem, dayBranch)  // [지지, 지지]
    if (gm && gm[0] && gm[0] !== '?') {
      const emptyPillars: string[] = []
      for (const p of saju) {
        if (p.branch === gm[0] || p.branch === gm[1]) emptyPillars.push(p.pillar)
      }
      if (emptyPillars.length) {
        lines.push(compact
          ? `- 공망: ${gm[0]}·${gm[1]} (${emptyPillars.join('·')}에 해당)`
          : `- 공망: ${gm[0]}·${gm[1]} (${emptyPillars.join('·')}에 해당). ${GONGMANG_INTRO}`)
        if (!compact) {
          for (const pillar of emptyPillars) {
            const gp = GONGMANG_BY_PILLAR[pillar]
            if (gp) lines.push(`  · ${pillar} 공망 — ${gp.title}: ${gp.desc}`)
          }
        }
      }
    }
  }

  if (!lines.length) return ''
  return `[명식 특징 — 이 사람에게 실제로 있는 것들(질문에 관련될 때 근거로 쓰되 겁주지 말 것)]\n${lines.join('\n')}`
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

  // ★2026-07-28 — 운이 원국을 치는 沖 (교재 84쪽 CHUNG_RULE · 121쪽 자리별 뜻)
  //   "대운과 세운은 일단 월지에 먼저 대입한다" 를 따라 月支를 앞세운다.
  //   ⚠️ 원국 안의 沖과 잣대가 다르다. 원국은 자리 짝으로 보고, 운은 어느 자리를 치는지로 본다.
  //   ⚠️ 겹충(원국에 이미 선 沖을 운이 또 치는 것)은 교재가 따로 무겁게 본다.
  for (const [lab, br] of [
    dayun ? ['지금 대운', dayun.jiji] as const : null,
    seyun ? [`${seyun.year}년(올해) 세운`, seyun.jiji] as const : null,
  ].filter(Boolean) as Array<readonly [string, string]>) {
    for (const h of unChungInSaju(saju as never, br)) lines.push(`- ${unChungLine(h, lab)}`)
  }
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

/** 판정 조건을 적은 줄은 재료에서 뺀다. AI 에게 줄 것은 뜻이지 잣대가 아니다. */
const isRule = (t: string) =>
  /개 이상|포함해|되풀이|섞여 있어도|차례로 작용력|일 때 봅니다|해당하며/.test(t)







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

  // ★2026-07-29 — 통합 리포트의 흐름 재료를 **먼저** 짓는다.
  //   크기를 알아야 원국 계열을 얼마나 실을지 정할 수 있기 때문이다. (교훈 CF)
  //   ⚠️ 산출은 unseContext 안에서 대운·세운을 따로 끝냅니다. (대표님 지시 — 엔진은 분리)
  const unse = (() => {
    if (!a.integrated) return null
    const tgt: Target = a.age < 20 ? 'student' : 'adult'
    const yr = a.dayStem && a.dayStem !== '?'
      ? calcYongsinNew(a.saju as never, a.dayStem, score as never) : null
    const wonguk = buildWongukContext({
      saju: a.saju, dayStem: a.dayStem,
      strongWeak: yr?.status ?? null,
      eokbu: yr?.eokbu?.yongsin ?? null,
      johu: yr?.johu?.element ?? null,
      gyeokguk: yr?.gyeokguk?.name ?? null,
      gyeokgukYongsin: yr?.gyeokguk?.element ?? null,
    })
    const daeun = buildDaeunContext({
      saju: a.saju,
      list: a.dayunList ?? (a.currentDayun ? [a.currentDayun] : []),
      age: a.age, target: tgt,
    })
    const seyun = buildSeyunContext({
      saju: a.saju, current: a.thisYearSeyun ?? null,
      daeun: daeun.current, target: tgt,
    })
    return buildUnseContext({ wonguk, daeun, seyun })
  })()

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
    // ★2026-07-28 — 격국과 세 용신 일치를 통변 재료에 넣는다. (교재 147·157쪽)
    //   전에는 화면 카드(YongsinCard)에만 있고 AI 는 격을 모른 채 썼다.
    //   ⚠️ 여기서 다시 계산하지 않는다. yongsinNew 한 곳에서만 잰다. (교훈 BQ)
    ...(() => {
      const r = a.dayStem && a.dayStem !== '?' ? calcYongsinNew(a.saju as never, a.dayStem, score as never) : null
      if (!r) return {}
      const ag = checkAgree(r)
      return {
        gyeokguk: r.gyeokguk.name || undefined,
        gyeokgukYongsin: r.gyeokguk.element ?? undefined,
        johuYongsin: r.johu.element ?? undefined,
        yongsinAgree: ag.title + ' — ' + ag.note,
      }
    })(),
    // 명식 특징(12운성·신살·귀인·공망) — 해당하는 것만 해석 포함해 조립.
    // ★2026-07-27 — 명식 특징에 교재 48~77쪽 지지 자료를 이어 붙인다.
    //   ① 12운성·신살·귀인·공망 (전부터 있던 것)
    //   ② 지지가 말하는 것   48쪽·50~73쪽
    //   ③ 병존               74~77쪽
    //   ④ 지금 흐름과의 어울림 49쪽 144칸 (대운·세운을 넘겨받았을 때만)
    //   학생/성인은 나이로 가른다. 아이 사주를 부모가 함께 읽는 자리이기 때문이다.
    myeongsikFeatures: (() => {
      // ★2026-07-28 — 교재 자료는 jaryoPick.pick() 단일 창구에서만 받는다. (교훈 BQ)
      //   예전에는 여기서 CHEONGAN_TRAIT·OHAENG_*·SAL_TABLE 등을 직접 뒤져
      //   buildCheongan·buildSal 같은 빌더를 따로 갖고 있었다.
      //   병존은 네 벌, 지지특징은 세 벌, 살은 두 벌이었다.
      //   ★블록 이름과 교재 쪽 표기는 그대로 지킨다. AI 가 출전을 알아야 한다.
      const target: Target = a.age < 20 ? 'student' : 'adult'
      const picked = pick({
        // ★2026-07-29 — 통합이면 상한이 2000, 갈래 표도 「시기」 셋이 얹힌 것을 쓴다
        serviceType: a.integrated ? 'integrated' : 'saju',
        questionCategories: a.questionCategories,
        // 지지특징·병존은 명식 소개라 질문을 안 가린다
        forceNeeds: ['지지특징', '병존'],
        ctx: {
          saju: a.saju, dayStem: a.dayStem, score, target, gender: a.gender,
          unseKind: a.unseEntry ?? null,
        },
      })
      const B = picked.byNeed
      const blk = (title: string, arr?: string[]) =>
        arr?.length ? `${title}\n${arr.map(t => `- ${t}`).join('\n')}` : ''
      const hapChung = [...(B['충'] ?? []), ...(B['합'] ?? []), ...(B['형파해'] ?? [])]
      const blocks: Array<[string, string]> = [
        ['명식특징', buildMyeongsikFeatures(a.saju, a.dayStem, !!a.integrated)],
        ['지지특징', blk('[지지가 말하는 것 — 교재 48쪽·50~73쪽. 월지와 일지가 가장 세다]', B['지지특징'])],
        ['병존', blk('[병존 — 교재 74~77쪽. 같은 글자가 나란히 있어 기운이 짙다]', B['병존'])],
        // ★통합 모드에서는 이 줄을 넣지 않는다.
        //   unseContext 가 [대운]·[세운] 덩이에서 같은 것을 이미 말하기 때문이다.
        //   둘 다 넣으면 144칸과 운충이 두 번씩 나간다. (압축의 핵심)
        ['운어울림', a.integrated ? '' : buildUnJiji(a.saju, target, a.currentDayun, a.thisYearSeyun)],
        ['일간', blk('[일간이 말하는 것 — 교재 41~47쪽. 이 사람의 본바탕이다]', B['일간'])],
        ['오행', blk('[오행이 넘치거나 모자란 자리 — 교재 20~28쪽. 넘치는 것도 모자란 것도 결이지 흠이 아니다]', B['오행'])],
        ['합충', blk('[합·충·형·파·해 — 교재 78~93쪽. 천간은 합을 중히 보고 지지는 충을 중히 본다]', hapChung)],
        ['살', blk('[살 — 교재 94~97쪽. 걸린 것만]', B['살'])],
        ['육친', blk('[육친이 말하는 것 — 교재 106~131쪽. 십성과 다섯 짝]', B['육친'])],
        ['인생단계', blk('[타고난 결의 단계 — 교재 25쪽]', B['인생단계'])],
        ['문이과', blk('[문과·이과 — 교재 25쪽]', B['문이과'])],
      ]
      if (!a.integrated) {
        return blocks.map(([, t]) => t).filter(Boolean).join('\n\n') || undefined
      }

      // ── 통합 모드 총량 조절 ────────────────────────────────────────
      //
      //   [무엇을 몰랐나]
      //     SERVICE_BUDGET 은 pick() 이 고른 «줄»에만 걸립니다.
      //     블록 제목과 buildMyeongsikFeatures(12운성·신살·귀인·공망)는 세지 않습니다.
      //     그래서 상한이 1,600인데 실제로 나가던 재료는 3,500자였습니다.
      //     ⚠️ 사주보기(비통합)도 같습니다. 이번에는 손대지 않고 기록만 합니다.
      //
      //   [어떻게 잡았나]
      //     대표님 지시 1,800~2,000자에 맞춰 **흐름 재료가 먼저 자리를 잡고**
      //     남는 만큼만 원국 계열을 싣습니다. 흐름은 통합 리포트의 알맹이라 안 자릅니다.
      //     ★자를 차례 — 뒤쪽이 먼저 잘립니다. 긴 소개 블록(명식특징·지지특징)이 뒤입니다.
      const KEEP = ['일간', '오행', '명식특징', '육친', '합충', '살',
                    '인생단계', '문이과', '병존', '지지특징']
      const room = INTEGRATED_TOTAL_CAP - (unse?.chars ?? 0)
      const out: string[] = []
      let used = 0
      for (const key of KEEP) {
        const t = blocks.find(([k]) => k === key)?.[1]
        if (!t) continue
        if (used + t.length + 2 > room) continue
        out.push(t); used += t.length + 2
      }
      return out.join('\n\n') || undefined
    })(),
    // ★대운을 넘겨받았으면 프롬프트의 "지금 흐르는 큰 흐름" 자리도 채운다.
    //   전에는 이 자리가 선언만 되어 있고 아무도 안 채우고 있었다.
    currentDaeun: a.currentDayun
      ? `${a.currentDayun.cheongan}${a.currentDayun.jiji} 대운 (${a.currentDayun.age}세부터)`
      : undefined,

    // ★2026-07-29 — 통합 리포트의 흐름 재료 (위에서 이미 지어 둔 것)
    ...(unse ? {
      unseBlock: unse.block,
      seyunYear: unse.seyun.year || undefined,
      daeunLabel: unse.daeun.current
        ? `${unse.daeun.current.cheongan}${unse.daeun.current.jiji} 대운${unse.daeun.span ? ` (${unse.daeun.span})` : ''}`
        : undefined,
    } : {}),
  }
}
