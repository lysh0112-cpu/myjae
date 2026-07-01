// ============================================================================
// 시두법 검증: 우리 시스템 calcHourPillar vs 표준 오자둔(五子遁) 시두법
// 표준 근거(한국민족문화대백과·백과): 일간에 따라 자시 시간(時干)이 정해짐
//   甲己일 → 甲子시부터,  乙庚일 → 丙子시부터,  丙辛일 → 戊子시부터,
//   丁壬일 → 庚子시부터,  戊癸일 → 壬子시부터
// ============================================================================

const HEAVENLY_STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]
const EARTHLY_BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]

// ── 우리 시스템 (useResultSaju.ts 에서 그대로) ──
function calcHourPillar_ours(dayStem, hourIdx) {
  const dg = HEAVENLY_STEMS.indexOf(dayStem)
  const groupBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
  const hourStem = HEAVENLY_STEMS[(groupBase[dg] + hourIdx) % 10]
  const hourBranch = EARTHLY_BRANCHES[hourIdx]
  return hourStem + hourBranch
}

// ── 표준 오자둔 시두법 (독립 구현) ──
// 자시(子, idx0)의 천간 시작점: 甲己→甲(0), 乙庚→丙(2), 丙辛→戊(4), 丁壬→庚(6), 戊癸→壬(8)
function calcHourPillar_standard(dayStem, hourIdx) {
  const dg = HEAVENLY_STEMS.indexOf(dayStem)
  // 일간을 5개 그룹으로: (甲己)(乙庚)(丙辛)(丁壬)(戊癸)
  const group = dg % 5              // 甲=0,己=5→0 / 乙=1,庚=6→1 / ...
  const ziStemStart = group * 2     // 0→甲, 1→丙, 2→戊, 3→庚, 4→壬
  const hourStem = HEAVENLY_STEMS[(ziStemStart + hourIdx) % 10]
  const hourBranch = EARTHLY_BRANCHES[hourIdx]
  return hourStem + hourBranch
}

console.log('='.repeat(70))
console.log('시두법 전수 검증: 10개 일간 × 12개 시지 = 120건')
console.log('='.repeat(70))

let mismatch = 0
for (let d = 0; d < 10; d++) {
  const dayStem = HEAVENLY_STEMS[d]
  let line = `일간 ${dayStem}: `
  for (let h = 0; h < 12; h++) {
    const ours = calcHourPillar_ours(dayStem, h)
    const std = calcHourPillar_standard(dayStem, h)
    if (ours !== std) { mismatch++; line += `[❌${h}:${ours}≠${std}] ` }
  }
  // 자시 시작점만 표시
  console.log(`일간 ${dayStem} → 子시: ${calcHourPillar_ours(dayStem,0)} (표준 ${calcHourPillar_standard(dayStem,0)})`)
}

console.log('─'.repeat(70))
// 백과사전 명시 사례: 일간 乙 또는 庚 + 卯시(idx3) → 己卯
console.log('\n[문헌 검증 사례]')
console.log('  乙庚일 卯시(5~7시) → 표준 문헌: 己卯')
console.log('  우리 시스템 乙일 卯시:', calcHourPillar_ours('乙', 3))
console.log('  우리 시스템 庚일 卯시:', calcHourPillar_ours('庚', 3))
// 일향사 사례: 丙일 寅시(idx2) → 庚寅
console.log('  丙辛일 寅시(3~5시) → 표준 문헌: 庚寅')
console.log('  우리 시스템 丙일 寅시:', calcHourPillar_ours('丙', 2))
// 백과 사례: 戊癸일 戌시(idx10) → 壬戌
console.log('  戊癸일 戌시(19~21시) → 표준 문헌: 壬戌')
console.log('  우리 시스템 癸일 戌시:', calcHourPillar_ours('癸', 10))

console.log('\n' + '='.repeat(70))
console.log(mismatch === 0 ? '✅ 120건 전부 표준 오자둔 시두법과 일치' : `❌ 불일치 ${mismatch}건`)
console.log('='.repeat(70))
