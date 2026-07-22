// app/manseryeok/birth-timing/lib/gyeokgukSungpae.ts
//
// ★ 격국 성패(成敗) 1차 자동판정 — 출산택일 신규 (설계안 v4 §5)
//
//   [무엇]
//   격국이 제대로 완성됐나(성격) / 깨졌나(파격)를 기계가 확실히 잡는 것만 판정.
//   애매한 정도 판단(상신 유력도·형충 무력화 등)은 2차로 미루고 전문가 상담(종격)으로.
//
//   [연재쌤 확정 반영]
//   · 지장간은 보지 않는다. 원국 천간·지지에 "드러난 8글자"만 센다.
//     (yongsinNew.ts 주석 167·236행과 동일 기준)
//   · 격 이름·상신은 공용 엔진 calcGyeokguk 재사용. 성패 판정만 여기서 신규.
//
//   [원칙] 공용 엔진(yongsinNew) 계산은 안 건드림. sipsinOf·calcGyeokguk 를 가져다 씀.

import { sipsinOf, calcGyeokguk } from '@/lib/saju/yongsinNew'
import type { EnginePillar } from './engineAdapter'

export type SungpaeVerdict = 'sunggyeok' | 'gyeokOnly' | 'pagyeok'

export interface SungpaeResult {
  gyeokName: string          // 격 이름 (예: '정관격')
  verdict: SungpaeVerdict     // 성격 / 격만 / 파격
  reasons: string[]          // 파격/성격 사유 (화면 해설·디버깅용)
  sipsinCount: Record<string, number>  // 드러난 8글자 십신 카운트
}

// 8글자(일간 제외 7글자 + 일지)에서 각 십신이 몇 개 드러났는지 센다.
//   드러난 것 = 천간 그대로, 지지는 지지 본래 오행의 대표 천간으로 환산해 십신 판정.
//   ※ 지장간 안 봄(연재쌤 확정). 지지는 "그 지지의 오행"이 무슨 십신인지만 본다.
const BRANCH_MAIN_STEM: Record<string, string> = {
  子: '癸', 丑: '己', 寅: '甲', 卯: '乙', 辰: '戊', 巳: '丙',
  午: '丁', 未: '己', 申: '庚', 酉: '辛', 戌: '戊', 亥: '壬',
}

function countSipsin(saju: EnginePillar[], dayStem: string): Record<string, number> {
  const count: Record<string, number> = {
    비견: 0, 겁재: 0, 식신: 0, 상관: 0, 편재: 0,
    정재: 0, 편관: 0, 정관: 0, 편인: 0, 정인: 0,
  }
  for (const p of saju) {
    // 천간 (일간 자신은 제외)
    if (!(p.pillar === '일주')) {
      const s = sipsinOf(dayStem, p.stem)
      if (s && s in count) count[s]++
    }
    // 지지 (일지 포함 — 지지는 자기 오행으로 십신 판정)
    const bStem = BRANCH_MAIN_STEM[p.branch]
    if (bStem) {
      const s = sipsinOf(dayStem, bStem)
      if (s && s in count) count[s]++
    }
  }
  return count
}

// 편의: 유형별 합산
function sum(count: Record<string, number>, ...keys: string[]): number {
  return keys.reduce((a, k) => a + (count[k] ?? 0), 0)
}

/**
 * 격국 성패 1차 자동판정.
 * @param saju     EnginePillar[4] (어댑터 결과)
 * @param dayStem  일간
 * @param status   신강약 (재다신약 판정용). judgeStrength 결과.
 */
export function judgeSungpae(
  saju: EnginePillar[],
  dayStem: string,
  status: string,
): SungpaeResult {
  const g = calcGyeokguk(saju as any, dayStem)
  const gyeokName = g.name || ''
  const c = countSipsin(saju, dayStem)
  const reasons: string[] = []

  // ── 공통 파격 신호 (설계안 §5-2 자동판정) ──
  const 관살혼잡 = c.정관 > 0 && c.편관 > 0
  const 상관견관 = c.상관 > 0 && c.정관 > 0
  const 재성 = sum(c, '정재', '편재')
  const 인성 = sum(c, '정인', '편인')
  const 식상 = sum(c, '식신', '상관')
  const 관성 = sum(c, '정관', '편관')
  const 재다신약 = status === '신약' && 재성 >= 3

  let verdict: SungpaeVerdict = 'gyeokOnly'

  // 격별 파격 조건 (설계안 §5-1 조건표, 드러난 글자 기준)
  switch (gyeokName) {
    case '식신격':
      if (재성 === 0) reasons.push('식신격인데 재성이 없어 식신생재가 안 돼요(도식)')
      if (c.상관 > 0) reasons.push('식신에 상관이 섞여 있어요')
      break
    case '상관격':
      if (인성 === 0) reasons.push('상관격인데 인성이 없어 제어가 안 돼요')
      if (c.정관 > 0) reasons.push('상관과 정관이 함께 있어요(견관)')
      break
    case '정재격':
    case '편재격':
      if (재다신약) reasons.push('재성은 많은데 일간이 약해요(재다신약)')
      if (gyeokName === '편재격' && 관성 === 0 && 인성 === 0) reasons.push('관·인이 모두 없어요')
      break
    case '정관격':
      if (관살혼잡) reasons.push('정관과 편관이 섞였어요(관살혼잡)')
      if (상관견관) reasons.push('정관을 상관이 치고 있어요(상관견관)')
      break
    case '편관격':
      if (status === '신약' && 식상 === 0 && 인성 === 0) reasons.push('칠살을 제어할 식상·인성이 없어요')
      if (관살혼잡) reasons.push('관살이 혼잡해요')
      break
    case '정인격':
    case '편인격':
      if (재성 > 0 && 인성 > 0 && 재성 >= 인성) reasons.push('재성이 인성을 극해요(탐재괴인 우려)')
      break
    case '건록격':
    case '양인격':
    case '비견격':
    case '겁재격':
      if (관성 === 0) reasons.push('힘을 조절할 관성이 없어요')
      break
    default:
      // 격 미상 → 판정 보류
      break
  }

  // 판정: 파격 사유 있으면 파격 / 없고 상신(격국용신) 있으면 성격 / 그 외 격만
  if (reasons.length > 0) {
    verdict = 'pagyeok'
  } else if (g.element) {
    // 상신 방향이 잡히고 파격 신호 없음 → 성격 후보
    verdict = 'sunggyeok'
    reasons.push(g.note || '격이 잘 갖춰졌어요')
  } else {
    verdict = 'gyeokOnly'
  }

  return { gyeokName, verdict, reasons, sipsinCount: c }
}
