// lib/saju/career/yongsin.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ⑥  —  기운을 얻는 자리 (용신)                       │
// │  출전: 『명리적성 비법노트』(심산) 94~97쪽                          │
// └───────────────────────────────────────────────────────────────┘
//
// ★교재 40쪽: "격과 용신도 오행으로 본다"
//   → 용신은 계절치환을 하지 않은 **본래 오행** 기준이다.
//     그래서 careerScore(육친 점수)가 아니라 yongsinNew 를 그대로 쓴다.
//
// ★교재 133쪽: 강점 지능 70% : 용신 30%
//   → 이 카드는 앞 카드들을 거드는 자리다. 앞세우지 않는다.
//
// ⚠️ yongsinNew.ts 는 건드리지 않는다. 사주보기·궁합이 함께 쓴다.

import { calcYongsinNew, type Ohaeng as YOhaeng } from '../yongsinNew'
import type { CareerCard, CareerInput, Ohaeng } from './types'
import { calcCareerGyeokguk } from './gyeokguk'
import { iga, eunneun } from '../josa'
import { YONGSIN_OHAENG, YONGSIN_YUKCHIN, YONGSIN_NOTE, YONGSIN_SRC } from './tables/yongsin'
import { jobKey, okForStudent } from './tables/jobs'

const EL_HANJA: Record<string, string> = { 목: '木', 화: '火', 토: '土', 금: '金', 수: '水' }

export interface CareerYongsin {
  /** 억부용신 — 이 카드의 본줄기 */
  yongsin: Ohaeng | null
  heesin: Ohaeng | null
  gisin: Ohaeng | null
  /** 조후용신 (여름·겨울생이면 잡힌다) */
  johu: Ohaeng | null
  johuNote: string
  /** 격국용신 */
  gyeokYongsin: Ohaeng | null
  gyeokName: string
  status: string           // 극신약 · 신약 · 중화 · 신강
  /** 용신이 가리키는 직업 (오행 용신 + 육친 용신) */
  jobsByEl: string[]
  jobsByYukchin: string[]
  yukchinName: string
}

/** 일간 기준으로 용신 오행이 무슨 십신인지 (육친 용신 표를 고르기 위해) */
const YANG = new Set(['甲', '丙', '戊', '庚', '壬'])
const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const GEN: Record<Ohaeng, Ohaeng> = { 목: '화', 화: '토', 토: '금', 금: '수', 수: '목' }
const CON: Record<Ohaeng, Ohaeng> = { 목: '토', 토: '수', 수: '화', 화: '금', 금: '목' }
const REP_YANG: Record<Ohaeng, string> = { 목: '甲', 화: '丙', 토: '戊', 금: '庚', 수: '壬' }

function sipsinName(dayStem: string, el: Ohaeng): string {
  const de = STEM_EL[dayStem]
  if (!de) return ''
  const same = YANG.has(dayStem) === YANG.has(REP_YANG[el])
  if (de === el) return same ? '비견' : '겁재'
  if (GEN[de] === el) return same ? '식신' : '상관'
  if (CON[de] === el) return same ? '편재' : '정재'
  if (CON[el] === de) return same ? '편관' : '정관'
  return same ? '편인' : '정인'
}

export function calcCareerYongsin(input: CareerInput): CareerYongsin | null {
  const day = input.saju.find(p => p.pillar === '일주')
  if (!day || day.stem === '?') return null

  const r = calcYongsinNew(input.saju as never, day.stem)
  if (!r) return null

  const y = (r.eokbu?.yongsin ?? null) as Ohaeng | null
  const g = calcCareerGyeokguk(input.saju, day.stem)
  const yukName = y ? sipsinName(day.stem, y) : ''

  return {
    yongsin: y,
    heesin: (r.eokbu?.heesin ?? null) as Ohaeng | null,
    gisin: (r.eokbu?.gisin ?? null) as Ohaeng | null,
    johu: (r.johu?.element ?? null) as Ohaeng | null,
    johuNote: r.johu?.note ?? '',
    gyeokYongsin: (g.element ?? null) as Ohaeng | null,
    gyeokName: g.name,
    status: r.status,
    jobsByEl: y ? (YONGSIN_OHAENG[y] ?? []) : [],
    jobsByYukchin: yukName ? (YONGSIN_YUKCHIN[yukName] ?? []) : [],
    yukchinName: yukName,
  }
}

// ── 카드 ────────────────────────────────────────────────────────
export function judgeYongsin(input: CareerInput): CareerCard {
  const v = calcCareerYongsin(input)
  if (!v || !v.yongsin) {
    return { key: 'yongsin', title: '기운을 얻는 자리', badge: '', lines: [],
             reasons: ['용신을 잡지 못했습니다. 이 대목은 건너뛰세요.'] }
  }

  const y = v.yongsin
  const lines: string[] = []
  const reasons: string[] = []

  lines.push(`용신은 ${y}(${EL_HANJA[y]})입니다. ${YONGSIN_NOTE[y]}`)
  lines.push(`일간 기준으로는 ${v.yukchinName}에 해당합니다. 사주는 ${v.status} 쪽이에요.`)
  if (v.heesin) lines.push(`${v.heesin}(${EL_HANJA[v.heesin]})${iga(v.heesin)} 곁에서 도와주고, ${v.gisin}(${EL_HANJA[v.gisin!]})${eunneun(v.gisin!)} 힘을 빼앗습니다.`)
  if (v.johu && v.johuNote) lines.push(v.johuNote)
  if (v.gyeokYongsin) lines.push(`${v.gyeokName}이라 ${v.gyeokYongsin}(${EL_HANJA[v.gyeokYongsin]})${iga(v.gyeokYongsin)} 격국용신입니다.`)
  lines.push('다만 용신은 거드는 자리예요. 앞서 본 강점 지능이 7할이고 용신은 3할입니다.')

  reasons.push(`억부용신 ${y} (${v.yukchinName}) · 희신 ${v.heesin ?? '-'} · 기신 ${v.gisin ?? '-'} · 신강약 ${v.status}`)
  if (v.johu) reasons.push(`조후용신 ${v.johu} — ${v.johuNote}`)
  if (v.gyeokYongsin) reasons.push(`격국용신 ${v.gyeokYongsin} (${v.gyeokName})`)
  // ★2026-07-27 — 학생이면 어른용 직업을 재료에서도 뺀다.
  //   수(水) 용신 목록에 유흥업·술집·목욕탕이, 편재 목록에 대부업·투기업·전당포가 있다.
  const forStudent = input.target === 'student'
  const sift = (list: string[]) =>
    (forStudent ? list.filter(j => okForStudent(jobKey(j))) : list).slice(0, 20)

  reasons.push(`${y} 용신 직업 : ${sift(v.jobsByEl).join(', ')} …`)
  if (v.jobsByYukchin.length) reasons.push(`${v.yukchinName} 용신 직업 : ${sift(v.jobsByYukchin).join(', ')} …`)
  reasons.push(`근거 ${YONGSIN_SRC}`)
  reasons.push('이 대목("기운을 얻는 자리")의 통변 재료입니다. 용신은 3할이라고 반드시 덧붙이세요. 직업 목록은 뒤 대목에서 추립니다.')

  return {
    key: 'yongsin', title: '기운을 얻는 자리', badge: `${y} 용신`,
    lines, reasons, data: { ...v } as unknown as Record<string, unknown>,
  }
}
