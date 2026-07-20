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

export interface ToTongbyeonArgs {
  name: string
  gender: string                       // '남' | '여'
  age: number                          // 만나이
  saju: PillarInput[]                  // 명식 4기둥
  dayStem: string                      // 일간(한자)
  ohaeng: Array<{ el: Ohaeng; pct: number }>  // 심산 오행 (toPercentList 결과)
  yongsin?: YongsinResult | null       // 용신 계산 결과
  hourBranch?: string | null           // 시지(한자). 없으면 '모름'
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
    myeongsikFeatures: buildMyeongsikFeatures(a.saju, a.dayStem) || undefined,
    // 신강약·대운은 기본 통변에 넣지 않는다 (심플하게).
    // 시기 질문 시에만 확장해서 붙일 예정.
  }
}
