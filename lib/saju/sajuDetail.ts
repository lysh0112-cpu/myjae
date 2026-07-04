// lib/saju/sajuDetail.ts
// (계산기 전용) 신살·납음·공망·합충 계산 (한정판)
//   ※ 기존 sinsal.ts(getSinsal)와 별개의 새 파일입니다. 기존 파일은 건드리지 않음.
//   신살·납음·공망·합충 계산 (한정판)
//   신살: 12신살 + 천을귀인 + 태극귀인 + 문창귀인 + 문곡귀인
//   부가: 납음오행 / 공망 / 지지 합충(육합·삼합·방합·충)
// ─────────────────────────────────────────────────────────────
// 검수 안내: 각 항목은 아래 "대조표(상수)"로만 계산됩니다.
//   연재 선생님이 규칙이 다르다고 하시면 해당 표만 고치면
//   명식·대운·세운 전체에 자동 반영됩니다. (표시부 수정 불필요)
// ─────────────────────────────────────────────────────────────

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

// 60갑자 인덱스 (천간 stem, 지지 branch 조합의 0~59)
function gapjaIndex(stem: string, branch: string): number {
  const s = STEMS.indexOf(stem), b = BRANCHES.indexOf(branch)
  if (s < 0 || b < 0) return -1
  for (let i = 0; i < 60; i++) if (i % 10 === s && i % 12 === b) return i
  return -1
}

// ── 12신살 (삼합국 기준) ──────────────────────────────────────
const SINSAL_12 = ['지살','년살','월살','망신','장성','반안','역마','육해','화개','겁살','재살','천살']
const SAMHAP_START: Record<string, number> = {
  申:0, 子:0, 辰:0,   寅:2, 午:2, 戌:2,
  亥:11, 卯:11, 未:11, 巳:5, 酉:5, 丑:5,
}
export function sinsal12(baseBranch: string, targetBranch: string): string {
  const start = SAMHAP_START[baseBranch]
  const ti = BRANCHES.indexOf(targetBranch)
  if (start === undefined || ti < 0) return ''
  return SINSAL_12[(ti - start + 12) % 12]
}

// ── 귀인 (일간 기준) ──────────────────────────────────────────
const CHEONEUL: Record<string, string[]> = {
  甲:['丑','未'], 戊:['丑','未'], 庚:['丑','未'],
  乙:['子','申'], 己:['子','申'],
  丙:['亥','酉'], 丁:['亥','酉'],
  壬:['巳','卯'], 癸:['巳','卯'],
  辛:['午','寅'],
}
const TAEGEUK: Record<string, string[]> = {
  甲:['子','午'], 乙:['子','午'],
  丙:['卯','酉'], 丁:['卯','酉'],
  戊:['辰','戌','丑','未'], 己:['辰','戌','丑','未'],
  庚:['寅','亥'], 辛:['寅','亥'],
  壬:['巳','申'], 癸:['巳','申'],
}
const MUNCHANG: Record<string, string> = {
  甲:'巳', 乙:'午', 丙:'申', 丁:'酉', 戊:'申',
  己:'酉', 庚:'亥', 辛:'子', 壬:'寅', 癸:'卯',
}
const CHUNG: Record<string, string> = {
  子:'午',丑:'未',寅:'申',卯:'酉',辰:'戌',巳:'亥',
  午:'子',未:'丑',申:'寅',酉:'卯',戌:'辰',亥:'巳',
}
function mungok(dayStem: string): string {
  const mc = MUNCHANG[dayStem]
  return mc ? CHUNG[mc] : ''
}

// 특정 지지에 붙는 귀인 목록
export function guiinFor(dayStem: string, targetBranch: string): string[] {
  const out: string[] = []
  if (CHEONEUL[dayStem]?.includes(targetBranch)) out.push('천을귀인')
  if (TAEGEUK[dayStem]?.includes(targetBranch)) out.push('태극귀인')
  if (MUNCHANG[dayStem] === targetBranch) out.push('문창귀인')
  if (mungok(dayStem) === targetBranch) out.push('문곡귀인')
  return out
}

// 한 지지의 신살 전체 (12신살 + 귀인)
export function sinsalAll(dayStem: string, baseBranch: string, targetBranch: string) {
  return {
    twelve: sinsal12(baseBranch, targetBranch),
    guiin: guiinFor(dayStem, targetBranch),
  }
}

// 명식 귀인 요약 (상단 요약줄용)
export function guiinSummary(dayStem: string) {
  return {
    cheoneul: CHEONEUL[dayStem] || [],
    taegeuk: TAEGEUK[dayStem] || [],
    munchang: MUNCHANG[dayStem] ? [MUNCHANG[dayStem]] : [],
    mungok: mungok(dayStem) ? [mungok(dayStem)] : [],
  }
}

// ── 납음오행 (60갑자) ─────────────────────────────────────────
const NABEUM = [
  '海中金','海中金','爐中火','爐中火','大林木','大林木','路傍土','路傍土','劍鋒金','劍鋒金',
  '山頭火','山頭火','澗下水','澗下水','城頭土','城頭土','白蠟金','白蠟金','楊柳木','楊柳木',
  '泉中水','泉中水','屋上土','屋上土','霹靂火','霹靂火','松柏木','松柏木','長流水','長流水',
  '沙中金','沙中金','山下火','山下火','平地木','平地木','壁上土','壁上土','金箔金','金箔金',
  '覆燈火','覆燈火','天河水','天河水','大驛土','大驛土','釵釧金','釵釧金','桑柘木','桑柘木',
  '大溪水','大溪水','沙中土','沙中土','天上火','天上火','石榴木','石榴木','大海水','大海水',
]
const NABEUM_KR: Record<string, string> = {
  海中金:'해중금',爐中火:'노중화',大林木:'대림목',路傍土:'노방토',劍鋒金:'검봉금',
  山頭火:'산두화',澗下水:'간하수',城頭土:'성두토',白蠟金:'백랍금',楊柳木:'양류목',
  泉中水:'천중수',屋上土:'옥상토',霹靂火:'벽력화',松柏木:'송백목',長流水:'장류수',
  沙中金:'사중금',山下火:'산하화',平地木:'평지목',壁上土:'벽상토',金箔金:'금박금',
  覆燈火:'복등화',天河水:'천하수',大驛土:'대역토',釵釧金:'차천금',桑柘木:'상자목',
  大溪水:'대계수',沙中土:'사중토',天上火:'천상화',石榴木:'석류목',大海水:'대해수',
}
export function nabeum(stem: string, branch: string): string {
  const i = gapjaIndex(stem, branch)
  if (i < 0) return ''
  return NABEUM_KR[NABEUM[i]] || NABEUM[i]
}

// ── 공망 (일주 기준 순중 공망) ────────────────────────────────
export function gongmang(dayStem: string, dayBranch: string): string[] {
  const idx = gapjaIndex(dayStem, dayBranch)
  if (idx < 0) return []
  const sun = Math.floor(idx / 10)
  const startBranch = (sun * 10) % 12
  return [BRANCHES[(startBranch + 10) % 12], BRANCHES[(startBranch + 11) % 12]]
}

// ── 지지 합충 관계 ────────────────────────────────────────────
const YUKHAP: Record<string, string> = {
  子:'丑',丑:'子',寅:'亥',亥:'寅',卯:'戌',戌:'卯',
  辰:'酉',酉:'辰',巳:'申',申:'巳',午:'未',未:'午',
}
const SAMHAP = [['申','子','辰'],['寅','午','戌'],['亥','卯','未'],['巳','酉','丑']]
const BANGHAP = [['寅','卯','辰'],['巳','午','未'],['申','酉','戌'],['亥','子','丑']]

// 명식 지지 배열에서 각 지지가 가진 관계 라벨 반환 (기둥별)
export function branchRelations(branches: string[]): string[][] {
  return branches.map((b, i) => {
    const labels: string[] = []
    branches.forEach((other, j) => {
      if (i === j) return
      if (YUKHAP[b] === other) labels.push('육합')
      if (CHUNG[b] === other) labels.push('충')
    })
    for (const s of SAMHAP) {
      if (s.includes(b) && s.filter(x => branches.includes(x)).length >= 2) labels.push('삼합')
    }
    for (const s of BANGHAP) {
      if (s.includes(b) && s.filter(x => branches.includes(x)).length >= 2) labels.push('방합')
    }
    return Array.from(new Set(labels))
  })
}

export const _tables = { CHEONEUL, TAEGEUK, MUNCHANG, SINSAL_12, SAMHAP_START, NABEUM_KR }
