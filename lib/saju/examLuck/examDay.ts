// lib/saju/examLuck/examDay.ts
//
// 시험 날짜를 아는 손님에게 — 그 달·그 날까지 짚어 준다.
// 출전: 교재 195쪽
//   「합격운과 취업운은 세운이 가장 중요하고, 그다음은 대운과 월운과 일진 순서입니다」
//   「시험일이나 합격자 발표일이 공망일이면 합격에 불리합니다」
//
// ★날짜를 모르면 아무것도 안 한다. 세운까지만 보는 것이 예전 동작이다.
//
// ⚠️ 겁주지 않는다. 공망이라고 "떨어진다" 고 하지 않는다.
//    [교재] 시험일이나 합격자 발표일이 공망일이면 합격에 불리합니다
//    [화면] 그날이 공망에 듭니다. 시험날 실수하지 않도록 미리 다져 두면 됩니다.

import { calcWolunList, calcIlunList } from '../dayun'
import { getGongmang } from '../gongmang'
import { judgeYear } from './examScore'
import type { Pillar, YearLuck } from './types'

export interface ExamDayResult {
  /** 그해 세운 판정 */
  year: YearLuck
  /** 그 달 월운 간지 */
  monthGanji: string
  /** 그 날 일진 간지 */
  dayGanji: string
  /** 손님이 읽는 말 */
  lines: string[]
  /** AI 통변에게만 주는 재료 */
  reasons: string[]
  /** 시험일이 공망에 드는가 */
  isGongmang: boolean
}

/**
 * 시험일(또는 합격자 발표일) 하루를 짚는다.
 * @param saju  원국 네 기둥
 * @param y·m·d 양력 시험 날짜
 * @param label '시험일' | '합격자 발표일'
 */
export function judgeExamDay(
  saju: Pillar[], y: number, m: number, d: number,
  label: '시험일' | '합격자 발표일' = '시험일',
  purpose?: 'exam' | 'job',
): ExamDayResult | null {
  const day = saju.find(p => p.pillar === '일주')
  const dayStem = day?.stem ?? ''
  const dayBranch = day?.branch ?? ''
  if (!dayStem || dayStem === '?') return null

  // ① 세운 — 가장 중요하다
  const seyun = calcSeyunGanji(dayStem, y)
  if (!seyun) return null
  const year = judgeYear(saju, y, seyun[0], seyun[1], purpose)

  // ② 월운
  const wol = calcWolunList(dayStem, y).find(w => w.month === m)
  const monthGanji = wol ? `${wol.cheongan}${wol.jiji}` : ''

  // ③ 일진
  const il = calcIlunList(dayStem, y, m).find(x => x.day === d)
  const dayGanji = il ? `${il.cheongan}${il.jiji}` : ''

  // ④ 공망 — 교재가 따로 짚은 자리
  let isGongmang = false
  if (dayBranch && dayBranch !== '?' && il) {
    const gm = getGongmang(dayStem, dayBranch)
    isGongmang = gm.includes(il.jiji)
  }

  const lines: string[] = [
    `${y}년 ${m}월 ${d}일 ${label}을 짚어 보았습니다.`,
    `그해는 ${seyun[0]}${seyun[1]}년으로 ${year.grade}입니다.`,
  ]
  if (monthGanji) lines.push(`그달은 ${monthGanji}월, 그날은 ${dayGanji}일입니다.`)
  if (isGongmang) {
    lines.push(`그날이 공망(空亡)에 듭니다. 나쁜 날이라는 뜻이 아니라 '비어 있는' 날이에요. `
      + `평소보다 한 박자 늦게, 실수하지 않도록 미리 다져 두시면 됩니다.`)
  }
  lines.push('교재는 세운이 가장 중요하고 그다음이 대운·월운·일진이라 합니다. '
    + '날짜 하나로 단정하지 마시고 흐름을 크게 보십시오.')

  return {
    year, monthGanji, dayGanji, isGongmang, lines,
    reasons: [
      `${label} ${y}-${m}-${d} · 세운 ${seyun[0]}${seyun[1]}(${year.grade}, 점수 ${year.score})`,
      monthGanji ? `월운 ${monthGanji}` : '',
      dayGanji ? `일진 ${dayGanji}` : '',
      isGongmang ? '★그날이 공망에 든다 (교재 195쪽)' : '',
      '교재 195쪽 — 세운 > 대운 > 월운 > 일진 차례',
    ].filter(Boolean),
  }
}

/** 그해 세운 간지 — calcSeyunList 를 쓰지 않고 바로 구한다 */
function calcSeyunGanji(_dayStem: string, year: number): [string, string] | null {
  const S = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']
  const B = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']
  if (!Number.isFinite(year)) return null
  const off = ((year - 1984) % 60 + 60) % 60
  return [S[off % 10], B[off % 12]]
}
