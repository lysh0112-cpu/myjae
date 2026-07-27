// lib/saju/career/ilju.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  진로적성 카드 ③  —  일주가 말하는 것                             │
// │  출전: 『명리적성 비법노트』(심산) 100~127쪽                        │
// └───────────────────────────────────────────────────────────────┘
//
// ★교재 128쪽: "일주와 지장간의 구조를 분석하여 기질적성을 파악하고,
//   월지와 지장간의 구조를 분석하여 진로적성을 파악한다."
//   → 일주는 **기질**을 말하는 자리다. 그래서 [타고난 결] 묶음에 놓는다.
//
// 계산이 없다. 일간+일지 두 글자로 표에서 꺼내 오면 끝이다.

import type { CareerCard, CareerInput } from './types'
import { ILJU, ILJU_SRC } from './tables/ilju'
import { jobKey, okForStudent } from './tables/jobs'

export function judgeIlju(input: CareerInput): CareerCard | null {
  const day = input.saju.find(p => p.pillar === '일주')
  if (!day || day.stem === '?' || day.branch === '?') return null

  const key = day.stem + day.branch
  const row = ILJU[key]
  if (!row) return null

  const lines: string[] = []
  lines.push(`${row.ko} 일주(${key})입니다.`)
  lines.push(row.gijil)

  const reasons: string[] = []
  reasons.push(`일주 ${row.ko}(${key}) — ${row.gijil}`)
  const jobs = input.target === 'student'
    ? row.jobs.filter(j => okForStudent(jobKey(j)))
    : row.jobs
  reasons.push(`${row.ko} 일주에 어울리는 일 : ${jobs.join(', ')}`)
  reasons.push(`근거 ${ILJU_SRC}`)
  reasons.push('이 대목("일주가 말하는 것")의 통변 재료입니다. 이 사람의 결과 성품만 다루세요. 직업 목록은 뒤 대목에서 추립니다.')
  reasons.push('일주는 60가지뿐이라 같은 일주인 사람이 많습니다. "이런 결을 타고났다" 정도로 말하고 단정하지 마세요.')

  return {
    key: 'ilju', title: '일주가 말하는 것', badge: `${row.ko}(${key})`,
    lines, reasons,
    data: { key, ko: row.ko, jobs } as unknown as Record<string, unknown>,
  }
}

export { ILJU }
