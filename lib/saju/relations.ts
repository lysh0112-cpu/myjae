// 형충회합파해 계산 로직

const GAN_HAP = [['甲','己'],['乙','庚'],['丙','辛'],['丁','壬'],['戊','癸']]
const JI_HAP = [['子','丑'],['寅','亥'],['卯','戌'],['辰','酉'],['巳','申'],['午','未']]
const SAMHAP = [['申','子','辰'],['亥','卯','未'],['寅','午','戌'],['巳','酉','丑']]
const BANGHAP = [['寅','卯','辰'],['巳','午','未'],['申','酉','戌'],['亥','子','丑']]
const CHUNG = [['子','午'],['丑','未'],['寅','申'],['卯','酉'],['辰','戌'],['巳','亥']]
const HYUNG = [['寅','巳','申'],['丑','戌','未'],['子','卯'],['辰','辰'],['午','午'],['酉','酉'],['亥','亥']]
const PA = [['子','酉'],['丑','辰'],['寅','亥'],['卯','午'],['巳','申'],['未','戌']]
const HAE = [['子','未'],['丑','午'],['寅','巳'],['卯','辰'],['申','亥'],['酉','戌']]

interface SajuPillar { stem: string; branch: string }

export function findRelations(saju: SajuPillar[]): string[] {
  const branches = saju.map(s => s.branch).filter(b => b && b !== '?')
  const stems = saju.map(s => s.stem).filter(s => s && s !== '?')
  const results: string[] = []

  // 천간합
  for (const [a, b] of GAN_HAP) {
    if (stems.includes(a) && stems.includes(b)) results.push(`${a}${b}합`)
  }
  // 지지합
  for (const [a, b] of JI_HAP) {
    if (branches.includes(a) && branches.includes(b)) results.push(`${a}${b}합`)
  }
  // 삼합
  for (const trio of SAMHAP) {
    if (trio.every(t => branches.includes(t))) results.push(`${trio.join('')}삼합`)
  }
  // 방합
  for (const trio of BANGHAP) {
    if (trio.every(t => branches.includes(t))) results.push(`${trio.join('')}방합`)
  }
  // 충
  for (const [a, b] of CHUNG) {
    if (branches.includes(a) && branches.includes(b)) results.push(`${a}${b}충`)
  }
  // 형
  for (const group of HYUNG) {
    if (group.every(t => branches.includes(t))) results.push(`${group.join('')}형`)
  }
  // 파
  for (const [a, b] of PA) {
    if (branches.includes(a) && branches.includes(b)) results.push(`${a}${b}파`)
  }
  // 해
  for (const [a, b] of HAE) {
    if (branches.includes(a) && branches.includes(b)) results.push(`${a}${b}해`)
  }

  return results
}

// 관계별 색상
export function getRelationColor(relation: string): string {
  if (relation.includes('합')) return '#4caf50'
  if (relation.includes('충')) return '#f44336'
  if (relation.includes('형')) return '#ff9800'
  if (relation.includes('파')) return '#9c27b0'
  if (relation.includes('해')) return '#2196f3'
  return '#e0dce8'
}
