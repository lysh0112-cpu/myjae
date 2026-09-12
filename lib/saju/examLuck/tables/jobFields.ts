// lib/saju/examLuck/tables/jobFields.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  취업운 «두 단계 콤보» 표 — ① 분야 · ② 일하는 방식 · 직업 목록        │
// │  출전: 『명리적성 비법노트』 5장 202~215쪽 · 230쪽                   │
// │  ★2026-09-11 (6부) [대표님 「직종별로 세분화 · 콤보 두 개로 좁혀지게」]│
// └───────────────────────────────────────────────────────────────┘
//
// ★두 콤보는 교재의 «서로 다른 두 대목» 을 씁니다.
//   ① 분야 → 206~210쪽 「육친별 용신에 따른 직업」 — 그 십신이 드는 해에 힘이 실린다 (시기)
//   ② 방식 → 202~204쪽 「직업별 사주 구조」 — 진로적성 엔진 pickStructure 판정 (적성)
//
// ★직업은 교재에 나온 이름만 씁니다. 직업마다 «분야 · 방식» 딱지를 붙여,
//   두 콤보를 고르면 딱지가 둘 다 맞는 직업만 보입니다. 맞는 것이 없으면 분야 전체.
//   ⛔ 17 × 8 칸 표로 만들지 마십시오 — 빈칸을 채우려다 지어내게 됩니다 (6부 판단).
//
// ⚠️ 십신은 분야마다 «가장 곧게 말한» 두세 개만. 많이 붙이면 거의 모든 해에 점수가 올라
//    판정이 흐려집니다. (예: 금융은 식신 208쪽에도 나오지만 정재·편재·정관만)
// ⚠️ 교재에 있어도 손님께 권하기 어려운 직업은 뺐습니다 —
//    사채업 · 고리대금 · 유사 금융 · 유흥 · 화류 · 폭파 기술자 · 역술 · 무속.
// ⚠️ 이 파일은 «책을 옮겨 적은 것» 입니다. 계산을 섞지 마십시오 (검사 44).

import type { Sipsin } from '../types'

export interface JobField {
  key: string
  label: string
  sipsins: Sipsin[]
  src: string
}

export const JOB_FIELDS: JobField[] = [
  { key: 'public', label: '공공기관 · 공기업', sipsins: ['정관', '정인'], src: '교재 210쪽 정관 「행정 · 교육 · 세무 관련 공무원」 · 230쪽 「교육청 시험은 정인운」' },
  { key: 'finance', label: '금융 · 보험', sipsins: ['정재', '편재', '정관'], src: '교재 209쪽 정재 「금융 관련 직장」 · 편재 「금융업 · 증권」 · 210쪽 정관 「은행 · 증권 · 금융업」' },
  { key: 'tax', label: '세무 · 회계', sipsins: ['정재', '식신'], src: '교재 209쪽 정재 「세무 · 회계」 · 208쪽 식신 「세무 · 회계」' },
  { key: 'it', label: 'IT · 전자 · 통신', sipsins: ['식신', '상관', '편관'], src: '교재 202쪽 「전자 · 전기 · 컴퓨터 · 통신」 · 208쪽 식신 「기술 계통」 · 210쪽 편관 「첨단 기술 분야」' },
  { key: 'make', label: '제조 · 기술 · 건축', sipsins: ['정재', '식신', '겁재'], src: '교재 209쪽 정재 「공업 · 제조 · 건축」 · 208쪽 식신 「건축업 · 제조 · 생산」 · 207쪽 겁재 「전문 기술자」' },
  { key: 'trade', label: '유통 · 무역 · 물류', sipsins: ['편재', '정재'], src: '교재 209쪽 편재 「무역업 · 유통업」 · 정재 「무역 · 도매」' },
  { key: 'ad', label: '광고 · 홍보 · 영업', sipsins: ['편재', '상관'], src: '교재 209쪽 편재 「광고 · 홍보 대행업」 · 208쪽 상관 「각종 영업직 · 중개업」' },
  { key: 'edu', label: '교육 · 학원', sipsins: ['정인', '식신'], src: '교재 206쪽 정인 「교육 · 학원업」 · 208쪽 식신 「교육 · 교사 · 강사」' },
  { key: 'media', label: '언론 · 출판 · 방송', sipsins: ['정인', '식신', '상관'], src: '교재 206쪽 정인 「언론 · 출판 · 신문 · 작가」 · 208쪽 식신 「언론 · 출판」 · 상관 「언론인」' },
  { key: 'medical', label: '의료 · 보건 · 약학', sipsins: ['편인', '편관', '식신'], src: '교재 206쪽 편인 「의사 · 약사 · 한의사 · 침술사」 · 210쪽 편관 「의술 계통」 · 208쪽 식신 「의료 · 의사」' },
  { key: 'law', label: '법률', sipsins: ['상관', '정관', '비견'], src: '교재 208쪽 상관 「변호사 · 변리사」 · 210쪽 정관 「판사」 · 207쪽 비견 「변호사」' },
  { key: 'guard', label: '군인 · 경찰 · 경호', sipsins: ['편관', '겁재'], src: '교재 210쪽 편관 「군인 · 경찰 · 검찰」 · 207쪽 겁재 「군인 · 경찰 · 경비」' },
  { key: 'service', label: '서비스 · 음식 · 여행', sipsins: ['식신', '편재', '겁재'], src: '교재 208쪽 식신 「음식점 · 커피숍 · 서비스업」 · 209쪽 편재 「여행업」 · 207쪽 겁재 「음식점 · 식음료」' },
  { key: 'art', label: '예술 · 디자인 · 연예 · 스포츠', sipsins: ['상관', '편인', '비견'], src: '교재 208쪽 상관 「배우 · 가수 · 모델 · 운동선수 · 디자인」 · 206쪽 편인 「예술가 · 문필가」 · 207쪽 비견 「스포츠 · 창작」' },
  { key: 'welfare', label: '복지 · 상담', sipsins: ['식신', '편인'], src: '교재 208쪽 식신 「사회복지사」 · 206쪽 편인 「심리 상담」' },
  { key: 'research', label: '연구 · 기획', sipsins: ['식신', '비견', '편인'], src: '교재 208쪽 식신 「연구 분야 · 기획 분야」 · 207쪽 비견 「지식 기반의 각종 기획 · 연구」 · 206쪽 편인 「학문을 바탕으로 하는 직업」' },
  { key: 'office', label: '일반 기업 사무직', sipsins: ['정재', '정관'], src: '교재 209쪽 정재 「일반 회사원」 · 210쪽 정관 「회사원」' },
]

/** ② 일하는 방식 — 교재 202~204쪽 «직업별 사주 구조» (진로적성 JOB_STRUCT 의 key 와 짝) */
export interface JobWay {
  key: string
  label: string
  /** 목표 이름에 붙는 짧은 이름 — 예: 「금융 · 보험 회사원」 */
  short: string
  /** lib/saju/career/tables/jobStructure.ts 의 key — ⛔ 이름을 바꾸면 적성 카드가 끊깁니다 */
  structKeys: string[]
}

export const JOB_WAYS: JobWay[] = [
  { key: 'unknown', label: '아직 모르겠어요', short: '', structKeys: [] },
  { key: 'gong', label: '공무원 · 공공기관', short: '공공기관', structKeys: ['gongmuwon'] },
  { key: 'hoesa', label: '회사에 들어가 일해요', short: '회사원', structKeys: ['hoesawon'] },
  { key: 'jeon', label: '전문직 · 연구직', short: '전문직', structKeys: ['yeonguzik', 'hakja'] },
  { key: 'gisul', label: '기술직', short: '기술직', structKeys: ['gisulja'] },
  { key: 'hwarin', label: '사람을 돕는 일', short: '사람을 돕는 일', structKeys: ['hwarineop'] },
  { key: 'yesul', label: '예술 · 창작', short: '예술 · 창작', structKeys: ['yesulga'] },
  { key: 'chang', label: '창업 · 자영업', short: '창업 · 자영업', structKeys: ['saeobga', 'jayeongeop'] },
]

/** 진로적성 구조 key → 손님 말 */
export const STRUCT_PLAIN: Record<string, string> = {
  gongmuwon: '공무원 · 공공기관', hoesawon: '회사에 들어가 일하는 쪽', yeonguzik: '전문직 · 연구직',
  hakja: '학자 · 교수', gisulja: '기술직', hwarineop: '사람을 돕는 일(의료 · 상담 · 교육)',
  yesulga: '예술 · 창작', saeobga: '사업', jayeongeop: '자영업',
}

export interface JobItem { field: string; way: string; name: string; page: number }

const T = (field: string, list: Array<[string, string, number]>): JobItem[] =>
  list.map(([name, way, page]) => ({ field, way, name, page }))

/** 직업 — 교재에 나온 이름 · 방식 딱지 · 쪽 (「취업운_분야직업표_교재근거」 문서와 같습니다) */
export const JOB_ITEMS: JobItem[] = [
  ...T('public', [['행정 공무원', 'gong', 210], ['교육 공무원', 'gong', 210], ['세무 공무원', 'gong', 210], ['공기업 · 공사', 'gong', 230], ['외교관', 'gong', 202]]),
  ...T('finance', [['은행', 'hoesa', 210], ['증권사', 'hoesa', 210], ['증권 딜러', 'hoesa', 202], ['컨설턴트', 'hoesa', 202], ['보험 설계사', 'chang', 204], ['투자 사업', 'chang', 209], ['재무 자격증을 쓰는 개인 사업', 'chang', 214], ['감정 평가', 'jeon', 214]]),
  ...T('tax', [['세무사', 'jeon', 212], ['회계사', 'jeon', 212], ['세무 · 회계 직장', 'hoesa', 209], ['세무 공무원', 'gong', 210]]),
  ...T('it', [['전자 · 전기 · 컴퓨터 · 통신 계통', 'hoesa', 202], ['전자 기기 설계 기사', 'gisul', 203], ['첨단 기술 분야', 'jeon', 210], ['정보 통신', 'hoesa', 214], ['벤처업', 'chang', 209], ['발명 · 특허 사업', 'chang', 203]]),
  ...T('make', [['건축 · 토목 기술자', 'gisul', 203], ['금속 · 기계 기술자', 'gisul', 203], ['자동차 정비 · 중장비', 'gisul', 203], ['제조업', 'chang', 202], ['건축업', 'chang', 202], ['기계 금속 부품업', 'chang', 204], ['공업 직장', 'hoesa', 209]]),
  ...T('trade', [['무역업', 'chang', 202], ['유통업', 'chang', 202], ['운수업', 'chang', 202], ['도매 · 소매업', 'chang', 204], ['창고 관리', 'hoesa', 214], ['교통 운송', 'hoesa', 214]]),
  ...T('ad', [['광고', 'hoesa', 209], ['홍보 대행업', 'chang', 209], ['영업직', 'hoesa', 208], ['자동차 판매', 'chang', 204], ['중개업', 'chang', 208]]),
  ...T('edu', [['초 · 중 · 고 교사', 'gong', 203], ['교수', 'jeon', 211], ['강사', 'jeon', 208], ['교육 연구원', 'jeon', 208], ['학원 경영', 'chang', 211], ['교습소 · 과외', 'chang', 211], ['어린이집 · 유치원 등 육영 사업', 'chang', 213]]),
  ...T('media', [['기자', 'hoesa', 207], ['언론인', 'hoesa', 208], ['출판 · 잡지 · 신문', 'hoesa', 206], ['방송', 'hoesa', 213], ['통역 · 번역', 'jeon', 206], ['작가', 'yesul', 206], ['카피라이터', 'yesul', 213], ['서점', 'chang', 206]]),
  ...T('medical', [['의사', 'hwarin', 203], ['약사', 'hwarin', 203], ['한의사', 'hwarin', 206], ['침술사', 'hwarin', 206], ['의료 서비스', 'hoesa', 208]]),
  ...T('law', [['변호사', 'jeon', 208], ['변리사', 'jeon', 208], ['관세사', 'jeon', 212], ['판사 · 검사', 'gong', 202], ['법무팀', 'hoesa', 202]]),
  ...T('guard', [['군인', 'gong', 210], ['경찰', 'gong', 210], ['검찰', 'gong', 210], ['교도관', 'gong', 215], ['경호원', 'hoesa', 212], ['경비', 'hoesa', 207]]),
  ...T('service', [['음식점', 'chang', 204], ['카페 · 커피숍', 'chang', 204], ['숙박 · 호텔', 'chang', 204], ['여행업 · 관광', 'chang', 204], ['이 · 미용', 'chang', 204], ['요리사', 'gisul', 205], ['서비스업 직장', 'hoesa', 208]]),
  ...T('art', [['배우 · 가수 · 모델', 'yesul', 208], ['운동선수', 'yesul', 208], ['디자이너', 'yesul', 215], ['예술가', 'yesul', 206], ['무대 · 뮤지컬 공연 예술', 'yesul', 204], ['공예 · 조각', 'yesul', 215], ['패션 · 의류업', 'chang', 204]]),
  ...T('welfare', [['사회복지사', 'hwarin', 208], ['상담사', 'hwarin', 203], ['심리 상담', 'hwarin', 206], ['종교인', 'hwarin', 203], ['요양원 · 복지관', 'chang', 213]]),
  ...T('research', [['연구원', 'jeon', 211], ['과학자', 'jeon', 208], ['대학자 · 교수', 'jeon', 203], ['발명가', 'jeon', 208], ['기획 업무', 'hoesa', 202], ['참모 · 기획실', 'hoesa', 215]]),
  ...T('office', [['회사원', 'hoesa', 209], ['관리직', 'hoesa', 202], ['인사 · 관리직', 'hoesa', 202], ['기획 업무', 'hoesa', 202], ['접객 업무', 'hoesa', 202], ['경리 · 재정', 'hoesa', 214]]),
]

export const fieldOf = (key?: string | null) => JOB_FIELDS.find(f => f.key === key) ?? null
export const wayOf = (key?: string | null) => JOB_WAYS.find(w => w.key === key) ?? JOB_WAYS[0]

/** 두 콤보로 좁힌 직업 — 딱지가 둘 다 맞는 것 · 없으면 분야 전체 */
export function itemsFor(field: string, way?: string | null): { items: JobItem[]; narrowed: boolean } {
  const all = JOB_ITEMS.filter(i => i.field === field)
  if (!way || way === 'unknown') return { items: all, narrowed: false }
  const hit = all.filter(i => i.way === way)
  return hit.length ? { items: hit, narrowed: true } : { items: all, narrowed: false }
}

/* ★2026-09-11 (6부) [대표님 「이 분야의 일을 버튼으로 만들고 선택하게」] — 직업 알약 고르기 (검사 47)
 *   ⚠️ 주소로 넘어오는 이름은 «이 분야의 교재 표에 있는 이름만» 받습니다 — 주소를 고쳐 글을 넣어도 AI 에 안 갑니다. */
export const PICK_MAX = 3
export function parsePicks(field: string, raw: string | null | undefined): string[] {
  if (!field || !raw) return []
  const names = new Set(JOB_ITEMS.filter(i => i.field === field).map(i => i.name))
  const out: string[] = []
  for (const n of raw.split('|')) if (names.has(n) && !out.includes(n)) out.push(n)
  return out.slice(0, PICK_MAX)
}
/** 방식을 «모르겠어요» 로 두었을 때 — 고른 직업의 딱지 가운데 가장 많은 방식 */
export function wayFromPicks(field: string, picks: string[]): string | null {
  const ways = JOB_ITEMS.filter(i => i.field === field && picks.includes(i.name)).map(i => i.way)
  if (!ways.length) return null
  const count = new Map<string, number>()
  for (const w of ways) count.set(w, (count.get(w) ?? 0) + 1)
  return [...count.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

/** AI 와 화면에 넘길 목표 이름 — 예: 「금융 · 보험 회사원 (은행 · 증권사 · …)」 · 고른 직업이 있으면 「분야 — 고른 직업」 */
export function goalLabel(field: string, way?: string | null, picks?: string[]): string {
  const f = fieldOf(field)
  if (!f) return ''
  if (picks && picks.length) return `${f.label} — ${picks.join(' · ')}`
  const w = wayOf(way)
  const { items, narrowed } = itemsFor(field, way)
  const names = items.slice(0, 5).map(i => i.name).join(' · ')
  //  ⚠️ 분야와 같은 말을 되풀이하지 않습니다 (예: 공공기관 · 공기업 × 공공기관 → 방식 이름 생략)
  const dup = !w.short || f.label.split(' · ').some(x => w.short.includes(x) || x.includes(w.short))
  return `${f.label}${dup ? '' : ` ${w.short}`}${narrowed && names ? ` (${names})` : ''}`
}

// ════════════════════════════════════════════════════════════════
//  손님이 직접 적는 고민 — ★2026-09-11 (6부) [대표님 「희망사항을 자유롭게 기술하게」]
// ════════════════════════════════════════════════════════════════
export const WISH_MAX = 200

/**
 * 고민 글 거르기 — AI 에게 넘기기 «전» 에 반드시 거칩니다.
 *   · 우리가 쓰는 묶음표(« »)를 지워, 글이 묶음 밖으로 새어 나가 «지시» 처럼 읽히지 않게 합니다.
 *   · 보이지 않는 글자(제어 문자)를 지우고, 줄바꿈은 한 칸으로 모읍니다.
 *   · 200자에서 자릅니다.
 */
export function sanitizeWish(raw: unknown): string {
  if (typeof raw !== 'string') return ''
  return raw
    .replace(/[«»]/g, '')
    .replace(/\p{Cc}/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, WISH_MAX)
}

/** 마음이 많이 힘든 글인지 — 풀이가 사주보다 먼저 마음을 받게 합니다 (합격운은 학생도 씁니다) */
const HEAVY = ['죽고', '죽을', '자살', '자해', '살기 싫', '사라지고 싶', '끝내고 싶', '포기하고 싶', '다 그만두고 싶', '버티기 힘들', '너무 힘들']
export function wishLooksHeavy(wish: string): boolean {
  const w = wish.replace(/\s/g, '')
  return HEAVY.some(k => w.includes(k.replace(/\s/g, '')))
}

/* ★6부 — 입력 화면 → 결과 화면 «건넴» (주소에 싣지 않으려고 sessionStorage 를 씁니다)
 *   ⚠️ 10분이 지난 건넴은 버립니다 — 다른 사람을 보다가 남은 옛 글이 섞이지 않게.
 *   ⚠️ 결과 화면이 기록을 저장한 뒤 지웁니다 (ExamResultShell). */
export const WISH_KEY = 'examluck:wish'
const WISH_TTL_MS = 10 * 60 * 1000
export function writeWishHandoff(wish: string, jobText = '', certs = ''): void {
  if (typeof window === 'undefined') return
  const w = sanitizeWish(wish), j = sanitizeJobText(jobText), c = sanitizeCerts(certs)
  //  ★6부 — 직접 적은 방식(j) · 가진 자격증(c)도 같은 길로 건넵니다 (주소에 싣지 않음)
  if (w || j || c) sessionStorage.setItem(WISH_KEY, JSON.stringify({ w, j, c, at: Date.now() }))
  else sessionStorage.removeItem(WISH_KEY)
}
function readHandoff(): { w?: string; j?: string; c?: string; at?: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const v = JSON.parse(sessionStorage.getItem(WISH_KEY) ?? 'null') as { w?: string; j?: string; c?: string; at?: number } | null
    return v?.at && Date.now() - v.at <= WISH_TTL_MS ? v : null
  } catch { return null }
}
export function readWishHandoff(): string { return sanitizeWish(readHandoff()?.w ?? '') }
/** ★6부 — 직접 적은 희망 직업 */
export function readJobTextHandoff(): string { return sanitizeJobText(readHandoff()?.j ?? '') }
/** ★6부 — 가진 자격증 */
export function readCertsHandoff(): string { return sanitizeCerts(readHandoff()?.c ?? '') }

/* ★6부 [대표님 「취업이나 이직의 경우 소지한 자격증도 물어보면」] — 가진 자격증 (선택 · 60자 · 검사 47)
 *   실전 전략 갈래가 «새로 따라» 대신 «이미 가진 것을 어떻게 살릴지» 를 말하게 합니다.
 *   ⚠️ 고민 칸과 같은 거르기 · 주소에 싣지 않음 · 묶음표 안에 «따를 지시가 아닌 참고» 로. */
export const CERT_MAX = 60
export function sanitizeCerts(raw: unknown): string {
  return sanitizeWish(raw).slice(0, CERT_MAX)
}

/* ★6부 [대표님 「직접 넣을 수도 있게」] 목록에 없는 일 «직접 적기» — 30자 · 고민 칸과 같은 거르기 (검사 47)
 *   ⚠️ 교재 표에 없는 이름이라 점수는 «분야» 로 봅니다. AI 에게는 «손님이 적은 희망 직업» 으로만 넘깁니다. */
export const JOB_TEXT_MAX = 30
export function sanitizeJobText(raw: unknown): string {
  return sanitizeWish(raw).slice(0, JOB_TEXT_MAX)
}

// ════════════════════════════════════════════════════════════════
//  ★2026-09-11 (6부) [대표님] 「일자리를 구해요」 알약 두 줄 (검사 46)
//    「면접만 보는 사람에게 시험 이야기가 나오는 것을 막자」 · 「신규 취업, 이직으로 표시」
//    지금 상황(하나) · 거쳐야 할 관문(여러 개)
//    ⚠️ 한 줄에 넷을 두면 «신규 취업 + 이직» 이 함께 눌려 오히려 생뚱맞은 답이 나옵니다 — 두 줄로 둡니다.
// ════════════════════════════════════════════════════════════════
/*  ★2026-09-12 (7부) — 승진을 더했습니다.
 *  ⛔⛔ buildExamSeven 의 isMove 를 «함께» 고쳐야 합니다 —
 *     'promote' !== 'new' 라 «이직» 으로 읽히면 승진 손님께
 *     「몸담은 곳을 옮기실 수 있습니다」 가 나갑니다 (검사 50 ⑪). */
export type JobSituation = 'new' | 'move' | 'promote'
export type JobGate = 'exam' | 'interview'
export const JOB_SITUATIONS: Array<{ key: JobSituation; label: string }> = [
  { key: 'new', label: '신규 취업' },
  { key: 'move', label: '이직' },
]
/** ⚠️ 승진은 «승진 탭» 에서만 씁니다 — 취업 탭 알약에는 넣지 않습니다 */
export const JOB_SITUATION_PROMOTE: JobSituation = 'promote'
export const JOB_GATES: Array<{ key: JobGate; label: string }> = [
  { key: 'exam', label: '시험' },
  { key: 'interview', label: '면접' },
]
/** 주소의 gates 값 → 관문 목록. 값이 없으면(옛 기록) null — «모두 고른 것» 으로 봅니다 */
export function parseGates(raw: string | null | undefined): JobGate[] | null {
  if (raw == null) return null
  const keys = JOB_GATES.map(g => g.key)
  return raw.split(',').filter((x): x is JobGate => (keys as string[]).includes(x))
}
export function parseSituation(raw: string | null | undefined): JobSituation | null {
  return raw === 'new' || raw === 'move' || raw === 'promote' ? raw : null
}
/** 날짜 칸 이름 — 고른 관문을 따라갑니다 */
export function dateLabelFor(gates: JobGate[] | null): string {
  if (!gates) return '시험(또는 발표) 날짜'
  const e = gates.includes('exam'), i = gates.includes('interview')
  return e && i ? '시험 또는 면접 날짜' : e ? '시험 날짜' : i ? '면접 날짜' : '발표 날짜'
}
