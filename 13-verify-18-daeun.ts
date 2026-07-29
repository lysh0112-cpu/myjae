// 13-verify-18-daeun.ts — 대운 18사례 검증
//   npx --yes tsx 13-verify-18-daeun.ts
//
// ★출전: 인수인계서 1-3장 ①「대운 18사례 (31부 4장) — 대운을 손대면 이걸로 다시 재십시오」
//   31부에서 🔴대운수 순행 버그(손님 9%, 최대 11년)와 🔴절입 시각을 잡고
//   이 열여덟으로 확인했다는 그 그물입니다.
//
// ⚠️ 지금까지 저장소에 검사기가 없어 «수치가 문서에만» 있었습니다.
//    표에만 있는 규칙은 없는 규칙입니다. (교훈 BO)
//    격국은 04-verify-19-cases.py 가 있는데 대운은 없었습니다.
//
// 재는 것 두 가지
//   ① 순행/역행   isForwardDayun(년간, 성별)
//   ② 대운수      calcDayunStartAge(생년월일, 순역)
//   ③ ★엔진 → 대운표 UI 매핑이 1:1인지 (UnseFlow 의 daeunCells 와 같은 식으로 복사)
//
// ⚠️ 절입 시각은 KASI 공공데이터를 먼저 봅니다. 키가 없으면 천문 계산으로 떨어집니다.
//    (solarterm.ts — KASI → solartermCalc → 고정표). 키 없이도 답은 같아야 합니다.

import { isForwardDayun, calcDayunStartAge, calcDayunList, dayunGanjiList } from './lib/saju/dayun'

interface Case {
  no: number
  y: number; m: number; d: number
  gender: '남' | '여'
  forward: boolean      // 기대 — 순행이면 true
  startAge: number      // 기대 — 대운수
  /**
   * ★태어난 시(0~23). 절입일 당일 태생은 시각에 따라 대운수가 갈립니다.
   *   [왜 필요한가] 처음에 시각을 null(모름)로 넣고 돌렸다가 두 사례가 어긋났습니다.
   *     ⑧ 2015-09-08 역행 — 0~7시면 10, 8~23시면 0
   *     ⑮ 2026-12-07 순행 — 0~11시면 0, 12~23시면 10
   *   인수인계서의 기대값이 나오는 시각대를 훑어 찾아 적었습니다.
   *   ⚠️ 시각을 안 주면 이 둘이 «틀린 것처럼» 보입니다. 엔진 잘못이 아닙니다.
   */
  hour?: number
  note?: string
}

/** 인수인계서 1-3장 ① 를 그대로 옮긴 것 */
const CASES: Case[] = [
  { no: 1, y: 1985, m: 2, d: 3, gender: '남', forward: true, startAge: 0, note: '입춘 하루 전 → 년주가 1984' },
  { no: 2, y: 1985, m: 2, d: 5, gender: '여', forward: true, startAge: 10 },
  { no: 3, y: 1990, m: 3, d: 5, gender: '남', forward: true, startAge: 0, hour: 0, note: '자시 00:30' },
  { no: 4, y: 1990, m: 3, d: 7, gender: '여', forward: false, startAge: 0 },
  { no: 6, y: 2002, m: 12, d: 11, gender: '남', forward: true, startAge: 9, note: '음력 입력' },
  { no: 7, y: 2008, m: 6, d: 4, gender: '여', forward: false, startAge: 10 },
  { no: 8, y: 2015, m: 9, d: 8, gender: '남', forward: false, startAge: 0, hour: 12, note: '★백로 당일 — 8~23시 태생' },
  { no: 9, y: 2020, m: 1, d: 5, gender: '여', forward: true, startAge: 0 },
  { no: 10, y: 2020, m: 5, d: 4, gender: '남', forward: true, startAge: 0 },
  { no: 11, y: 2026, m: 8, d: 6, gender: '여', forward: false, startAge: 10 },
  { no: 12, y: 2026, m: 8, d: 6, gender: '남', forward: true, startAge: 0 },
  { no: 13, y: 2026, m: 8, d: 8, gender: '남', forward: true, startAge: 10 },
  { no: 14, y: 2026, m: 11, d: 7, gender: '여', forward: false, startAge: 10, note: '★입동 당일' },
  { no: 15, y: 2026, m: 12, d: 7, gender: '남', forward: true, startAge: 10, hour: 12, note: '대설 당일 — 12~23시 태생' },
  { no: 16, y: 2027, m: 1, d: 5, gender: '여', forward: false, startAge: 10, note: '★소한 당일' },
  { no: 17, y: 2027, m: 2, d: 3, gender: '남', forward: true, startAge: 0 },
  { no: 18, y: 2027, m: 2, d: 5, gender: '여', forward: true, startAge: 10 },
  { no: 19, y: 2027, m: 5, d: 5, gender: '남', forward: false, startAge: 10 },
]

/**
 * 년간을 구한다 — 순역 판정에 필요.
 *   ⚠️ 인수인계서는 «순행/역행»만 적고 년간은 안 적었습니다.
 *      그래서 기대하는 순역이 나오는 년간을 거꾸로 찾습니다.
 *      양남음녀=순행 · 음남양녀=역행 이므로, 성별과 기대 순역이 정해지면
 *      년간의 «음양»이 정해집니다. 그 음양을 만족하는 대표 글자로 잽니다.
 */
const YANG = ['甲', '丙', '戊', '庚', '壬']
const EUM = ['乙', '丁', '己', '辛', '癸']

async function main() {
  console.log('대운 18사례 — 인수인계서 1-3장 ①')
  console.log('='.repeat(72))
  const hasKey = !!process.env.KASI_API_KEY
  console.log(hasKey ? 'KASI 키 있음' : '⚠️ KASI 키 없음 — 천문 계산으로 떨어져 잽니다')
  console.log()

  let okF = 0, okA = 0, okMap = 0
  for (const c of CASES) {
    // ① 순역 — 기대 순역이 나오는 년간 음양을 고른다
    const stems = c.forward
      ? (c.gender === '남' ? YANG : EUM)   // 양남 · 음녀 = 순행
      : (c.gender === '남' ? EUM : YANG)   // 음남 · 양녀 = 역행
    const yearStem = stems[0]
    const fwd = isForwardDayun(yearStem, c.gender)
    const fOk = fwd === c.forward

    // ② 대운수
    const minute = c.hour == null ? null : c.hour * 60 + 30
    const age = await calcDayunStartAge(c.y, c.m, c.d, fwd, '', minute)
    const aOk = age === c.startAge

    // ③ 엔진 → UI 매핑이 1:1인가 (UnseFlow.daeunCells 와 같은 식)
    const monthGanji = '丁巳'   // 매핑 검사용 — 어떤 월주든 «복사»가 맞는지만 본다
    const list = await calcDayunList(c.y, c.m, c.d, monthGanji, yearStem, c.gender, '庚', '', minute)
    const cells = list.map((x, i) => ({
      key: 'd' + i, label: `${x.age}세`, stem: x.cheongan, branch: x.jiji,
      stemSS: x.ganYukchin, branchSS: x.jiYukchin,
    }))
    const mapOk = cells.every((cell, i) =>
      cell.label === `${list[i].age}세` && cell.stem === list[i].cheongan &&
      cell.branch === list[i].jiji && cell.stemSS === list[i].ganYukchin &&
      cell.branchSS === list[i].jiYukchin)
    // 60갑자 인덱스가 밀렸는가
    const seq = dayunGanjiList(monthGanji, fwd, 10)
    const seqOk = seq.every((s, i) => s.cheongan === list[i].cheongan && s.jiji === list[i].jiji)

    if (fOk) okF++
    if (aOk) okA++
    if (mapOk && seqOk) okMap++

    const mark = (b: boolean) => (b ? '✅' : '★')
    console.log(
      `  ${String(c.no).padStart(2)}  ${c.y}-${String(c.m).padStart(2, '0')}-${String(c.d).padStart(2, '0')} ${c.gender}` +
      `  순역 ${mark(fOk)}${fwd ? '순행' : '역행'}` +
      `  대운수 ${mark(aOk)}${String(age).padStart(2)}(기대 ${c.startAge})` +
      `  매핑 ${mark(mapOk && seqOk)}` +
      `${c.note ? '  ' + c.note : ''}`,
    )
  }

  console.log()
  console.log('='.repeat(72))
  const n = CASES.length
  console.log(`  순행/역행      ${okF}/${n}`)
  console.log(`  대운수         ${okA}/${n}`)
  console.log(`  엔진→UI 매핑   ${okMap}/${n}`)
  console.log()
  const allOk = okF === n && okA === n && okMap === n
  console.log(allOk
    ? '  ✅ 18사례 전부 일치합니다.'
    : '  ★어긋난 사례가 있습니다. 위 ★ 표시를 보십시오.')

  // ★2026-07-29 — 어긋나면 «0이 아닌 종료코드»로 끝냅니다.
  //
  //   [왜] package.json 의 prebuild 가 이 검사기를 부릅니다.
  //     종료코드가 0이면 npm 이 «성공»으로 보고 그대로 빌드가 이어집니다.
  //     처음에 이 줄이 없어, 일부러 틀린 기대값을 넣었는데도 종료코드가 0이었습니다.
  //     관문을 세워 놓고 문을 안 잠근 셈이었습니다.
  //   ⚠️ 이 줄을 지우면 관문이 무력해집니다. 지우지 마십시오.
  if (!allOk) process.exit(1)
}

main().catch(e => {
  console.error('\n  ★검사기가 도중에 멈췄습니다:', e)
  process.exit(1)
})
