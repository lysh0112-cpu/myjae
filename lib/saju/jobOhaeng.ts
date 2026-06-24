// lib/saju/jobOhaeng.ts
// 직업 오행 분류 테이블 — 주오행 + 부오행

export interface JobOhaeng {
  main: string    // 주오행
  sub: string     // 부오행 (없으면 '')
  label: string   // 직업 설명
}

// 직업 ID → 주오행 + 부오행
export const JOB_OHAENG_MAP: Record<string, JobOhaeng> = {
  // 목(木) 계열
  wood: { main: '목', sub: '화', label: '교육·복지·출판·환경' },

  // 화(火) 계열
  fire: { main: '화', sub: '토', label: '방송·예술·요리·미용·연예' },

  // 토(土) 계열
  earth: { main: '토', sub: '금', label: '공무원·부동산·건설·유통·관리' },

  // 금(金) 계열
  metal: { main: '금', sub: '목', label: '금융·법조·의학·군경·IT·공학' },

  // 수(水) 계열
  water: { main: '수', sub: '목', label: '무역·여행·연구·상담·철학' },

  // 가사·무직 → 토(土) 성향 (안정·돌봄)
  home: { main: '토', sub: '', label: '전업주부·육아·가사·무직' },
}

// Claude가 반환한 오행명 → job ID 변환
export function ohaengToJobId(ohaeng: string): string {
  if (ohaeng.includes('목')) return 'wood'
  if (ohaeng.includes('화')) return 'fire'
  if (ohaeng.includes('토')) return 'earth'
  if (ohaeng.includes('금')) return 'metal'
  if (ohaeng.includes('수')) return 'water'
  return ''
}

// job ID → 주오행
export function getMainOhaeng(jobId: string): string {
  return JOB_OHAENG_MAP[jobId]?.main ?? ''
}

// job ID → 부오행
export function getSubOhaeng(jobId: string): string {
  return JOB_OHAENG_MAP[jobId]?.sub ?? ''
}
