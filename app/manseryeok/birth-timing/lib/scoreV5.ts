// app/manseryeok/birth-timing/lib/scoreV5.ts
//
// ★ 출산택일 v5 채점 — 원국 5단계 (설계안 §3)
//   성공축 65(격국35+통근15+재관15) : 건강축 35(조후25+오행10) + 대운타이밍(별도가점).
//
//   [구조 원칙]
//   · 공용 부품(simsanOhaeng·yongsinNew·gyeokgukSungpae)을 조립만. 계산은 부품이.
//   · 대운 타이밍은 비동기(절기 API)라 여기서 분리 → scoreWithDayun() 에서 합산.
//     이 파일은 동기(원국)만 → 대운 API 실패해도 원국 점수는 나온다.
//
//   [연재쌤 확정 반영]
//   · 지장간 제외, 드러난 8글자 (gyeokgukSungpae 가 처리)
//   · 조후: 여름생 水 / 겨울생 火 (calcJohu 기준과 동일)

import type { Candidate } from './candidates'
import { engineInputs } from './engineAdapter'
import { judgeSungpae, type SungpaeResult } from './gyeokgukSungpae'
import { calcSimsanOhaeng, grade } from '@/lib/saju/simsanOhaeng'
import { calcYongsinNew } from '@/lib/saju/yongsinNew'
import { BIRTH_SCORE_CONFIG as CFG } from './birthScoreConfig'

const W = CFG.weightsV5

// 지지 온도
const SUMMER = ['巳', '午', '未']
const WINTER = ['亥', '子', '丑']
const BRANCH_EL: Record<string, string> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
const STEM_EL: Record<string, string> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}

export interface ScoreV5Breakdown {
  total: number           // 원국 합 (대운 제외), 0~100
  johu: number            // 0~W.johu
  gyeok: number           // 0~W.gyeok
  tonggeun: number        // 0~W.tonggeun
  jaegwan: number         // 0~W.jaegwan
  ohaeng: number          // 0~W.ohaeng
  penalty: number         // 월일충·조후불능 등 감점 합
  // 판정 부가정보
  status: string          // 신강약
  yongsinEl: string       // 억부용신 오행 (대운 타이밍에서 씀)
  sungpae: SungpaeResult
  isJonggyeok: boolean    // 종격 의심 → 전문가 상담 분기
  elementGrade: Record<string, string>  // 오행별 등급
  notes: string[]
}

// ① 조후 (W.johu) — 여름생 水 / 겨울생 火
function scoreJohu(c: Candidate, count: Record<string, number>): { score: number; bulneung: boolean } {
  const mb = c.month.branch
  const full = W.johu, half = Math.round(W.johu * 0.66), lack = Math.round(W.johu * 0.3)
  if (SUMMER.includes(mb)) {
    const w = count['수'] ?? 0
    if (w === 0) return { score: lack, bulneung: true }  // 여름 水전무 = 조후불능
    return { score: w >= 2 ? full : half, bulneung: false }
  }
  if (WINTER.includes(mb)) {
    const f = count['화'] ?? 0
    if (f === 0) return { score: lack, bulneung: true }  // 겨울 火전무 = 조후불능
    return { score: f >= 2 ? full : half, bulneung: false }
  }
  return { score: Math.round(W.johu * 0.8), bulneung: false }  // 환절기 온화
}

// ② 격국 성패 (W.gyeok) — verdict → 점수
function scoreGyeok(sp: SungpaeResult): number {
  const g = CFG.gyeok
  const raw = sp.verdict === 'sunggyeok' ? g.sunggyeok
    : sp.verdict === 'pagyeok' ? g.pagyeok
    : g.gyeokOnly
  // gyeok 배점(W.gyeok)에 맞춰 스케일 (config gyeok 값이 35 기준이므로 비율 환산)
  return Math.round(raw * (W.gyeok / g.sunggyeok))
}

// ③ 일간 통근·신강약 (W.tonggeun)
function scoreTonggeun(status: string): number {
  const t = CFG.tonggeunV5
  if (status === '신강' || status === '중화') return Math.min(W.tonggeun, t.sinwang)
  if (status === '신약') return Math.min(W.tonggeun, t.sinyak)
  return Math.round(W.tonggeun * 0.4)  // 극신약 등
}

// ④ 재·관 동태 (W.jaegwan) — 재성·관성이 통근해 살아있는가 (부모소망 가중은 recommend에서)
function scoreJaegwan(count: Record<string, number>, sp: SungpaeResult): number {
  const jae = (sp.sipsinCount.정재 ?? 0) + (sp.sipsinCount.편재 ?? 0)
  const gwan = (sp.sipsinCount.정관 ?? 0) + (sp.sipsinCount.편관 ?? 0)
  const hasJae = jae > 0, hasGwan = gwan > 0
  if (hasJae && hasGwan) return CFG.jaegwan.full
  if (hasJae || hasGwan) return CFG.jaegwan.partial
  return Math.round(CFG.jaegwan.partial * 0.5)
}

// ⑤ 오행 중화 (W.ohaeng)
function scoreOhaeng(scoreMap: Record<string, number>): { score: number; gradeMap: Record<string, string> } {
  const els = ['목', '화', '토', '금', '수']
  const gradeMap: Record<string, string> = {}
  let missing = 0, over = 0
  for (const e of els) {
    const g = grade(scoreMap[e] ?? 0)
    gradeMap[e] = g
    if (g === '결핍') missing++
    if (g === '과다') over++
  }
  let score = W.ohaeng
  score -= missing * Math.round(W.ohaeng * 0.15)
  score -= over * Math.round(W.ohaeng * 0.1)
  if (score < 0) score = 0
  return { score, gradeMap }
}

// 종격 의심: 한 오행이 전체의 branchDominantRatio 이상 (설계안 §5-3)
function checkJonggyeok(scoreMap: Record<string, number>): boolean {
  const vals = Object.values(scoreMap)
  const total = vals.reduce((a, b) => a + b, 0) || 1
  const max = Math.max(...vals)
  return max / total >= CFG.jonggyeok.branchDominantRatio
}

/** 원국 5단계 채점 (동기). 대운 타이밍은 scoreWithDayun 에서 별도 합산. */
export function scoreBabyV5(c: Candidate): ScoreV5Breakdown {
  const { saju, solarMonth, solarDay, hourBranch, dayStem } = engineInputs(c)

  // 오행 점수(심산) + 간이 카운트(조후용)
  const ohScore = calcSimsanOhaeng(saju as any, solarMonth, solarDay, hourBranch)
  const count: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 }
  for (const p of [c.year, c.month, c.day, c.hour]) {
    const se = STEM_EL[p.stem]; if (se) count[se]++
    const be = BRANCH_EL[p.branch]; if (be) count[be]++
  }

  const ys = calcYongsinNew(saju as any, dayStem)
  const status = ys?.status ?? ''
  const yongsinEl = ys?.eokbu?.yongsin ?? ''
  const sp = judgeSungpae(saju as any, dayStem, status)

  const johu = scoreJohu(c, count)
  const gyeok = scoreGyeok(sp)
  const tonggeun = scoreTonggeun(status)
  const jaegwan = scoreJaegwan(count, sp)
  const oh = scoreOhaeng(ohScore as any)
  const isJonggyeok = checkJonggyeok(ohScore as any)

  // 감점: 월지-일지 충 + 조후 불능
  let penalty = 0
  const notes: string[] = []
  if (isWolIlChung(c)) {
    penalty += CFG.filter.chungWolIl
    notes.push('월지와 일지가 충이에요')
  }
  if (johu.bulneung) {
    penalty += CFG.filter.johuBulneung
    notes.push('계절 온도를 풀어줄 기운이 없어요(조후 불능)')
  }

  let total = johu.score + gyeok + tonggeun + jaegwan + oh.score - penalty
  if (total < 0) total = 0
  if (total > 100) total = 100

  return {
    total, johu: johu.score, gyeok, tonggeun, jaegwan, ohaeng: oh.score,
    penalty, status, yongsinEl, sungpae: sp, isJonggyeok,
    elementGrade: oh.gradeMap, notes,
  }
}

// 월지-일지 충
const CHUNG: Record<string, string> = {
  子: '午', 午: '子', 丑: '未', 未: '丑', 寅: '申', 申: '寅',
  卯: '酉', 酉: '卯', 辰: '戌', 戌: '辰', 巳: '亥', 亥: '巳',
}
function isWolIlChung(c: Candidate): boolean {
  return CHUNG[c.month.branch] === c.day.branch
}
