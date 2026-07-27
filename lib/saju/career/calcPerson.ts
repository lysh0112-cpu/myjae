// lib/saju/career/calcPerson.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  생년월일시 → 사주 네 기둥 (진로적성 화면 공용)                     │
// └───────────────────────────────────────────────────────────────┘
//
// couple-result-new 의 calcOnePerson 과 같은 방식이다.
// 그쪽은 화면 파일 안에 들어 있어 가져다 쓸 수 없어 여기에 따로 두었다.
//
// ⚠️ 계절치환(월지·시지)에 **양력 날짜와 시지**가 필요하다.
//    음력으로 입력받아도 /api/lunar 가 양력 날짜를 함께 돌려주므로 그것을 쓴다.

import { calcHourPillar } from '../hourPillar'
import type { Pillar } from './types'

export interface PersonRaw {
  name?: string
  gender?: string      // '남' | '여'
  calType?: string     // '양력' | '음력'
  year?: string
  month?: string
  day?: string
  leapMonth?: string   // '0' | '1'
  hour?: string        // '0'~'11' | '모름'
}

export interface PersonCalc {
  saju: Pillar[]
  solarMonth: number
  solarDay: number
  hourBranch: string | null
  /** 시(時)를 모르고 넣었는가 */
  hourUnknown: boolean
}

function splitGanji(g: string): { stem: string; branch: string } {
  if (!g) return { stem: '?', branch: '?' }
  const m = g.match(/\(([^)]+)\)/)
  if (m && m[1].length >= 2) return { stem: m[1][0], branch: m[1][1] }
  if (g.length >= 2) return { stem: g[0], branch: g[1] }
  return { stem: '?', branch: '?' }
}

function hourToIdx(hour?: string): number | null {
  if (!hour || hour === '모름') return null
  const n = parseInt(hour)
  return isNaN(n) ? null : n
}

export async function calcPerson(p: PersonRaw): Promise<PersonCalc | null> {
  const y = parseInt(p.year || ''), m = parseInt(p.month || ''), d = parseInt(p.day || '')
  if (!y || !m || !d) return null

  const calType = p.calType || '양력'
  const leap = p.leapMonth || '0'
  const hIdx = hourToIdx(p.hour)
  const url = `/api/lunar?year=${y}&month=${m}&day=${d}&calType=${calType}&leapMonth=${leap}`
    // ★2026-07-27 — 태어난 시를 함께 넘긴다 (절입일 당일 태생 대비)
    + (hIdx !== null ? `&hour=${hIdx}` : '')

  let data: Record<string, unknown>
  try {
    const res = await fetch(url)
    data = await res.json()
  } catch {
    return null
  }
  if (!data || data.error) return null

  const year = splitGanji(String(data.yearGanji ?? ''))
  const month = splitGanji(String(data.monthGanji ?? ''))
  const day = splitGanji(String(data.dayGanji ?? ''))

  const hour = hIdx !== null
    ? calcHourPillar(day.stem, hIdx)
    : { stem: '?', branch: '?' }

  return {
    saju: [
      { pillar: '시주', stem: hour.stem, branch: hour.branch },
      { pillar: '일주', stem: day.stem, branch: day.branch },
      { pillar: '월주', stem: month.stem, branch: month.branch },
      { pillar: '년주', stem: year.stem, branch: year.branch },
    ],
    solarMonth: Number(data.solarMonth) || m,
    solarDay: Number(data.solarDay) || d,
    hourBranch: hour.branch === '?' ? null : hour.branch,
    hourUnknown: hIdx === null,
  }
}

/** 만 나이 (학생/성인 자동 판단에 쓴다) */
export function ageOf(year?: string): number | null {
  const y = parseInt(year || '')
  if (!y) return null
  return new Date().getFullYear() - y + 1
}
