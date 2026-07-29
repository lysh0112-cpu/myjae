// lib/saju/career/roleFit.ts
//
// ┌──────────────────────────────────────────────────────────────────┐
// │  핵심 직무 & 전문 분야 — 성인용                                     │
// │  2026-07-29                                                       │
// └──────────────────────────────────────────────────────────────────┘
//
// ★2026-07-29 대표님 지시 —
//   「어울리는 직업 10가지」를 성인에게는 «직무(Role)와 전문 분야(Field)» 로 바꿉니다.
//
//   [무엇이 문제였나]
//     교재 73~78쪽·일주표의 직업 목록은 1990~2000년대 어휘로 적혀 있습니다.
//       수(水)   → 목욕탕 · 수산물 · 유흥업 · 수도사업 · 생수업 · 장의사
//       丁酉일주 → 사채업 · 당구장 · 쌀가게 · 이발사
//       壬午일주 → 유흥업 · 목욕탕
//     명리적으로는 «물이 흐르고 사람이 모이는 자리» 라는 한 결이지만,
//     직장인이 리포트에서 「당신에게 어울리는 직업: 유흥업」 을 읽으면
//     그 순간 리포트 전체를 못 믿게 됩니다.
//
//   [어떻게 했나]
//     ★교재 표(tables/jobs.ts · tables/ilju.ts · tables/yukchin.ts)는 **한 글자도 안 고쳤습니다.**
//       출전이자 상담사·전문가가 보는 원문입니다. (교훈 BR — 뜻을 빼지 말 것)
//     대신 이 파일이 **한 겹 위에서** 오늘의 직무 이름으로 옮깁니다.
//       옛 이름은 그대로 두고, 손님 화면에만 새 이름이 나갑니다.
//     ⚠️ 되돌리시려면 career-result 에서 judgeRoleFit 를 judgeJobs 로 바꾸면 됩니다.
//
//   ⚠️ 학생에게는 이 카드를 쓰지 않습니다. 학생은 「계열과 학과」가 그 자리입니다.

import type { CareerCard, CareerInput, Ohaeng } from './types'
import { calcCareerScore, gradeAll } from './careerScore'
import { yukchinOf } from './yukchin'
import { checkSinsal9 } from './sinsal9'
import { calcYongsinNew } from '../yongsinNew'

const STEM_EL: Record<string, Ohaeng> = {
  甲: '목', 乙: '목', 丙: '화', 丁: '화', 戊: '토',
  己: '토', 庚: '금', 辛: '금', 壬: '수', 癸: '수',
}
const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']

/**
 * ★성인 리포트에 내보내지 않을 말.
 *   교재 원문에는 남아 있고, 여기서 «걸러 내기만» 합니다.
 *   ⚠️ 나쁜 직업이라는 뜻이 아닙니다. 커리어 리포트의 결에 안 맞는다는 뜻입니다.
 *      (전문가 화면·상담사 화면에는 교재 원문이 그대로 갑니다)
 */
export const ADULT_JOB_BLOCKLIST = [
  '유흥업', '유흥업소', '목욕탕', '사채업', '당구장', '쌀가게', '완구점',
  '도축업', '장의사', '무속인', '안마', '지압', '지압사', '철물점', '정육점',
  '수산물', '농수산물', '수도사업', '수도 사업', '생수업', '냉동업', '양어장',
  '세차장', '문구점', '가구점', '화원', '공원묘지', '골동품', '이발사',
]

/** 걸러야 할 말인가 */
export function isBlockedJob(name: string): boolean {
  const n = name.replace(/\s/g, '')
  return ADULT_JOB_BLOCKLIST.some(b => n.includes(b.replace(/\s/g, '')))
}

// ═══════════════════════════════════════════════════════════════
//  직무 세 묶음 (대표님 지정 구조)
// ═══════════════════════════════════════════════════════════════

interface RoleGroup {
  key: string
  title: string
  /** 그 묶음에 드는 직무 이름들 */
  roles: string[]
  /** 왜 이 묶음이 뜨는가 — 화면에 근거로 나간다 */
  why: string
}

/**
 * ① 독립적 전문 직무 — 내 이름을 걸고 혼자 서는 자리
 *    비겁·양인·건록이 세면 뜬다. 남이 짜 놓은 판을 못 견디는 결이다.
 */
const G_INDEPENDENT: RoleGroup = {
  key: 'independent', title: '독립적 전문 직무',
  roles: ['컨설턴트', '전문 연구·분석가', '자유 전문직(변리·회계·감정)', '프리랜서 전문가', '1인 사업·스튜디오'],
  why: '내 판을 스스로 짜야 힘이 나는 결입니다',
}

/**
 * ② 인사이트 & 기획 — 흐름을 읽어 방향을 잡는 자리
 *    수(水)·인성·식상이 세면 뜬다. 궁리하고 설계하는 결이다.
 */
const G_INSIGHT: RoleGroup = {
  key: 'insight', title: '인사이트 & 기획',
  roles: ['데이터·시장 분석', '브랜딩·전략 기획', '콘텐츠 크리에이티브', '상품·서비스 기획', 'UX 리서치'],
  why: '눈앞의 일보다 판을 읽는 데 힘이 붙는 결입니다',
}

/**
 * ③ 사람·심리를 다루는 일 — 도화 + 수 기운
 *    사람이 모이고 마음이 오가는 자리. 교재의 «유흥·서비스» 결을 오늘의 말로 옮긴 것.
 */
const G_PEOPLE: RoleGroup = {
  key: 'people', title: '사람·심리를 다루는 일',
  roles: ['심리 상담·코칭', 'HR·인재개발', '대중 마케팅·커뮤니케이션', '고객 경험(CX)', '교육·퍼실리테이션'],
  why: '사람이 모이는 자리에서 기운이 사는 결입니다',
}

/** ④ 체계·관리 — 관성이 세면 */
const G_SYSTEM: RoleGroup = {
  key: 'system', title: '체계 · 관리 · 공공',
  roles: ['조직·운영 관리', '품질·프로세스', '공공·정책', '법무·컴플라이언스', 'PM·PMO'],
  why: '기준을 세우고 지키는 데 강한 결입니다',
}

/** ⑤ 실물·수치 — 재성이 세면 */
const G_MARKET: RoleGroup = {
  key: 'market', title: '시장 · 수치를 다루는 일',
  roles: ['영업·사업개발', '재무·회계', '유통·공급망', '금융·투자', '가격·수익 관리'],
  why: '돌아가게 만들고 숫자로 확인하는 데 강한 결입니다',
}

/** ⑥ 기술·정밀 — 금이 세면 */
const G_TECH: RoleGroup = {
  key: 'tech', title: '기술 · 정밀',
  roles: ['엔지니어링', '개발·아키텍처', '설계·정밀 제조', '보안·인프라', '의료 기술'],
  why: '자르고 다듬어 완성하는 데 강한 결입니다',
}

const ALL_GROUPS = [G_INDEPENDENT, G_INSIGHT, G_PEOPLE, G_SYSTEM, G_MARKET, G_TECH]

/**
 * 성인용 「핵심 직무 & 전문 분야」 카드.
 *
 *   대표님이 든 보기 — 壬子 일주 · 수 비겁 과다(80) · 양인격 · 도화살
 *     → 비겁 과다 + 양인격  = ① 독립적 전문 직무
 *     → 수 과다             = ② 인사이트 & 기획
 *     → 도화 + 수           = ③ 사람·심리
 *     → 조직은 «내 영역이 확실한 독립 파트»
 *   그 결이 그대로 나오도록 짰습니다.
 */
export function judgeRoleFit(input: CareerInput): CareerCard {
  const { saju, solarMonth, solarDay, hourBranch } = input
  const empty: CareerCard = { key: 'rolefit', title: '', badge: '', lines: [], reasons: [] }
  if (input.target === 'student') return empty

  const dayStem = saju.find(p => p.pillar === '일주')?.stem ?? ''
  const dayEl = STEM_EL[dayStem]
  if (!dayEl) return empty

  const r = calcCareerScore(saju, solarMonth, solarDay, hourBranch)
  const g = gradeAll(r)
  const Y: Record<string, number> = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 }
  for (const el of EL5) Y[yukchinOf(dayEl, el)] += r.score[el] ?? 0

  const hits = checkSinsal9(saju)
  const has = (n: string) => hits.some(h => h.name.includes(n))
  const yong = calcYongsinNew(saju as never, dayStem, r.score as never)
  const gyeok = yong?.gyeokguk?.name ?? ''

  // ── 어느 묶음이 몇 점인가 ──
  const pt: Record<string, number> = {}
  const add = (k: string, v: number, why: string, reasons: string[]) => {
    if (v <= 0) return
    pt[k] = (pt[k] ?? 0) + v
    reasons.push(why)
  }
  const R: Record<string, string[]> = {}
  const bag = (k: string) => (R[k] ??= [])

  // ① 독립 — 비겁 · 양인격/건록격 · 양인살
  add('independent', Y['비겁'], `비겁 ${Math.round(Y['비겁'])}점`, bag('independent'))
  if (gyeok === '양인격' || gyeok === '건록격') add('independent', 25, `${gyeok}`, bag('independent'))
  if (has('양인')) add('independent', 10, '양인', bag('independent'))

  // ② 인사이트 — 수 · 인성 · 식상
  add('insight', r.score['수'] ?? 0, `수 ${Math.round(r.score['수'] ?? 0)}점`, bag('insight'))
  add('insight', Y['인성'] * 0.8, `인성 ${Math.round(Y['인성'])}점`, bag('insight'))
  add('insight', Y['식상'] * 0.6, `식상 ${Math.round(Y['식상'])}점`, bag('insight'))

  // ③ 사람·심리 — 도화 · 수 · 식상
  if (has('도화')) add('people', 30, '도화', bag('people'))
  add('people', (r.score['수'] ?? 0) * 0.5, `수 ${Math.round(r.score['수'] ?? 0)}점`, bag('people'))
  add('people', Y['식상'] * 0.5, `식상 ${Math.round(Y['식상'])}점`, bag('people'))

  // ④ 체계 — 관성
  add('system', Y['관성'], `관성 ${Math.round(Y['관성'])}점`, bag('system'))
  // ⑤ 시장 — 재성
  add('market', Y['재성'], `재성 ${Math.round(Y['재성'])}점`, bag('market'))
  // ⑥ 기술 — 금
  add('tech', r.score['금'] ?? 0, `금 ${Math.round(r.score['금'] ?? 0)}점`, bag('tech'))

  const ranked = ALL_GROUPS
    .map(grp => ({ grp, score: pt[grp.key] ?? 0, why: (R[grp.key] ?? []).slice(0, 2).join(' · ') }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)

  if (!ranked.length) return empty

  const lines: string[] = []
  const reasons: string[] = []
  ranked.forEach((x, i) => {
    // ★교재에서 온 이름이 아니므로 blocklist 에 걸릴 일이 없지만, 안전망으로 한 번 더 거른다
    const roles = x.grp.roles.filter(n => !isBlockedJob(n))
    lines.push(`${i + 1}. ${x.grp.title} — ${roles.join(' · ')}`)
    lines.push(`   ${x.grp.why} (${x.why})`)
    reasons.push(`${x.grp.title}: ${x.why} (${Math.round(x.score)}점)`)
  })

  // ── 조직 성향 ──
  const free = (Y['비겁'] ?? 0) + (Y['식상'] ?? 0)
    + (gyeok === '양인격' || gyeok === '건록격' ? 25 : 0)
  const belong = (Y['관성'] ?? 0) + (Y['인성'] ?? 0)
  const freePct = Math.round((free / Math.max(1, free + belong)) * 100)
  lines.push(
    freePct >= 60
      ? '조직은 — 지시받는 자리보다 내 영역과 자율권이 분명한 독립 파트·프로젝트 단위가 맞습니다. 큰 회사라도 그 안에서 재량이 있는 자리라야 오래갑니다.'
      : freePct <= 40
        ? '조직은 — 틀과 절차가 분명한 곳에서 오히려 멀리 갑니다. 자율이 너무 크면 방향을 잃기 쉬운 결입니다.'
        : '조직은 — 큰 틀은 조직에 두되 안에서 재량이 있는 자리가 맞습니다. 완전한 자유도, 촘촘한 통제도 둘 다 안 맞습니다.',
  )
  reasons.push(`자율(비겁+식상+록왕지) ${Math.round(free)} vs 소속(관성+인성) ${Math.round(belong)} → ${freePct}%`)
  if (g['수']?.grade) reasons.push(`수 ${g['수'].grade}`)

  return {
    key: 'rolefit',
    title: '핵심 직무 & 전문 분야',
    badge: freePct >= 60 ? '자율형' : freePct <= 40 ? '소속형' : '균형형',
    lines, reasons,
    data: { freePct, top: ranked.map(x => x.grp.key) },
  }
}
