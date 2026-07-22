// app/manseryeok/birth-timing/lib/engineAdapter.ts
//
// ★ 어댑터: 출산택일 Candidate → 공용 사주 엔진이 요구하는 입력 형태로 변환.
//
//   [왜 필요한가]
//   출산택일 Candidate.Pillar 는 { stem, branch } 뿐인데,
//   공용 엔진(simsanOhaeng·yongsinNew)의 Pillar 는 { pillar:'월주', stem, branch } 로
//   pillar(자리 이름) 필드가 필수다. 엔진이 월지를 p.pillar==='월주' 로 찾기 때문.
//   → Candidate 를 그대로 넘기면 격국·조후·오행이 월주를 못 찾아 오작동한다.
//
//   [원칙] 공용 엔진은 절대 수정하지 않는다(궁합·사주보기 등이 공유). 여기서 입력만 맞춘다.
//   설계안 v4 §1: "계산 로직은 안 건드림, 이미 있는 부품 재사용."

import type { Candidate } from './candidates'

// 공용 엔진들이 공통으로 받는 기둥 타입 (yongsinNew.ts / simsanOhaeng.ts 와 동일 구조).
//   두 파일의 Pillar 는 이름만 각자 export 이고 구조가 같으므로 여기서 하나로 맞춰 쓴다.
export interface EnginePillar {
  pillar: '년주' | '월주' | '일주' | '시주'
  stem: string
  branch: string
}

// Candidate 8글자 → EnginePillar[4]  (년→월→일→시 순)
export function toEnginePillars(c: Candidate): EnginePillar[] {
  return [
    { pillar: '년주', stem: c.year.stem, branch: c.year.branch },
    { pillar: '월주', stem: c.month.stem, branch: c.month.branch },
    { pillar: '일주', stem: c.day.stem, branch: c.day.branch },
    { pillar: '시주', stem: c.hour.stem, branch: c.hour.branch },
  ]
}

// simsanOhaeng.calcSimsanOhaeng 는 (saju, solarMonth, solarDay, hourBranch) 를 요구한다.
//   출산택일은 후보의 (m, d) 가 양력 월·일이고, 시지는 hour.branch 다.
export function engineInputs(c: Candidate): {
  saju: EnginePillar[]
  solarMonth: number
  solarDay: number
  hourBranch: string
  dayStem: string
} {
  return {
    saju: toEnginePillars(c),
    solarMonth: c.m,
    solarDay: c.d,
    hourBranch: c.hour.branch,
    dayStem: c.day.stem,
  }
}
