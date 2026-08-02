// 31-measure-hour-convert.ts
//
// ┌───────────────────────────────────────────────────────────────┐
// │  시지 계절 치환이 «무엇을 얼마나» 바꾸는가 — 자(尺)입니다        │
// └───────────────────────────────────────────────────────────────┘
//
//  ★2026-08-02 — 연재쌤이 「시지 점수를 반영하자」 하셔서 넣었습니다.
//    ⚠️ 이것은 «검사» 가 아니라 «자» 입니다. verify 체인에 넣지 마십시오.
//       배포가 느려지고, 임의 표본이라 값이 조금씩 흔들립니다.
//
//  쓰는 법   npm run measure:hour
//
//  ⚠️⚠️ 시지 치환을 손대기 «전» 에 반드시 이것을 먼저 돌리십시오.
//     43부 자원오행에서 배웠습니다 — 재지 않고 손대면 «나중에» 알게 됩니다.
//
//  [2026-08-02 처음 잰 값 — 다음에 견줄 잣대]
//     144칸 중 달라지는 칸        11개 (7.6%)
//     점수가 달라지는 사람        7.56%
//     ★발달·과다 판정이 뒤집힘    4.91%
//     ★가장 센 오행이 바뀜        1.51%
//     약함→결핍                   1.18%
//
//  ⚠️⚠️ 재실 때 «시지만» 떼어 재십시오. purpose 를 통째로 바꾸면 월지 치환(35점)이
//     함께 꺼져 숫자가 부풀려집니다. 처음에 그렇게 재어 4.62% 라는 값을 냈습니다.

import { calcSimsanOhaeng, grade, hourConvertEl, type Ohaeng, type Pillar } from './lib/saju/simsanOhaeng'

const GAN = '甲乙丙丁戊己庚辛壬癸'.split('')
const JI = '子丑寅卯辰巳午未申酉戌亥'.split('')
const EL5: Ohaeng[] = ['목', '화', '토', '금', '수']

/** 지지 본래 오행 — ⚠️ 판정용이 아닙니다. 「달라졌는가」를 재는 데만 씁니다 */
const BRANCH_EL: Record<string, Ohaeng> = {
  子: '수', 丑: '토', 寅: '목', 卯: '목', 辰: '토', 巳: '화',
  午: '화', 未: '토', 申: '금', 酉: '금', 戌: '토', 亥: '수',
}
/** 월지 → 양력 한가운데 날짜 (寅·申월 날짜분할을 피해 가운데로 잡습니다) */
const SOLAR: Record<string, [number, number]> = {
  寅: [2, 20], 卯: [3, 20], 辰: [4, 20], 巳: [5, 20], 午: [6, 20], 未: [7, 20],
  申: [8, 20], 酉: [9, 20], 戌: [10, 20], 亥: [11, 20], 子: [12, 20], 丑: [1, 20],
}
const R = (n: number) => Math.floor(Math.random() * n)
const pc = (x: number, n: number) => (x / n * 100).toFixed(2) + '%'

console.log('\n━━ ① 144칸 전수 — 어느 월지×시지가 달라지는가 ━━')
{
  const changed: string[] = []
  for (const m of JI) for (const h of JI) {
    const to = hourConvertEl(m, h)
    if (to) changed.push(`${m}월 ${h}시 ${BRANCH_EL[h]}→${to}`)
  }
  console.log(`  달라지는 칸  ${changed.length}개 / 144  (${(changed.length / 144 * 100).toFixed(1)}%)`)
  for (const c of changed) console.log(`    · ${c}`)
  // ⚠️ 공란 월지는 «그대로» 여야 합니다 (대표님 확인 2026-08-02)
  const blank = ['子', '巳', '午', '亥']
  const bad = blank.filter(m => JI.some(h => hourConvertEl(m, h) !== null))
  console.log(`  공란 월지(子巳午亥)에 치환이 «없는가»  ${bad.length === 0 ? '✅' : '🔴 ' + bad.join()}`)
}

console.log('\n━━ ② 사람 단위 — 판정이 얼마나 뒤집히는가 ━━')
{
  const N = 200000
  let n = 0, scoreDiff = 0, gradeFlip = 0, topFlip = 0
  const flips: Record<string, number> = {}
  for (let i = 0; i < N; i++) {
    const pill = ['년주', '월주', '일주', '시주'].map(p => ({
      pillar: p, stem: GAN[R(10)], branch: JI[R(12)],
    })) as Pillar[]
    const mb = pill[1].branch, hb = pill[3].branch
    const [sm, sd] = SOLAR[mb]
    n++
    // ══════════════════════════════════════════════════════════
    //  ⚠️⚠️ «시지만» 떼어 재야 합니다.
    //   purpose 를 통째로 바꾸면 «월지 치환(35점)» 도 함께 꺼집니다
    //     (forCouple — 丑辰未戌월을 土로 · 2026-07-24 대표님 지시)
    //   ★그러면 시지 10점의 영향이 월지 35점에 묻혀 숫자가 크게 부풀려집니다.
    //     제가 2026-08-02 에 실제로 한 번 그렇게 재어 4.62% 라는 잘못된 값을 냈습니다.
    //   ⇒ 진로 값을 기준으로 두고, 시지 10점만 «손으로» 되돌려 견줍니다.
    // ══════════════════════════════════════════════════════════
    const to = hourConvertEl(mb, hb)
    if (!to) continue
    const forCareer = calcSimsanOhaeng(pill, sm, sd, hb, { purpose: '진로' })
    const forHealth = { ...forCareer }
    forHealth[to] -= 10
    forHealth[BRANCH_EL[hb]] += 10
    scoreDiff++
    const gA = EL5.map(e => grade(forCareer[e])).join('')
    const gB = EL5.map(e => grade(forHealth[e])).join('')
    if (gA !== gB) {
      gradeFlip++
      for (const e of EL5) {
        const a = grade(forHealth[e]), b = grade(forCareer[e])
        if (a !== b) flips[`${a}→${b}`] = (flips[`${a}→${b}`] ?? 0) + 1
      }
    }
    const topA = EL5.reduce((x, y) => forCareer[y] > forCareer[x] ? y : x)
    const topB = EL5.reduce((x, y) => forHealth[y] > forHealth[x] ? y : x)
    if (topA !== topB) topFlip++
  }
  console.log(`  임의 사주 ${n.toLocaleString()}건 — 진로 값 ↔ 건강궁합 값 대조`)
  console.log(`  점수가 달라지는 사람        ${pc(scoreDiff, n)}`)
  console.log(`  ★발달·과다 판정이 뒤집힘    ${pc(gradeFlip, n)}`)
  console.log(`  ★가장 센 오행이 바뀜        ${pc(topFlip, n)}`)
  console.log('  등급 이동 :', Object.entries(flips).sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${pc(v, n)}`).join(' · '))
}

console.log('\n━━ ③ 합이 언제나 100인가 ━━')
{
  let bad = 0
  for (let i = 0; i < 20000; i++) {
    const pill = ['년주', '월주', '일주', '시주'].map(p => ({
      pillar: p, stem: GAN[R(10)], branch: JI[R(12)],
    })) as Pillar[]
    const [sm, sd] = SOLAR[pill[1].branch]
    for (const purpose of ['진로', '건강궁합'] as const) {
      const s = calcSimsanOhaeng(pill, sm, sd, pill[3].branch, { purpose })
      const sum = EL5.reduce((a, e) => a + s[e], 0)
      if (sum !== 100) bad++
    }
  }
  console.log(`  합이 100이 아닌 경우  ${bad}건  ${bad === 0 ? '✅' : '🔴'}`)
}

console.log('\n⚠️ 이것은 «자» 입니다. 검사가 아닙니다. verify 체인에 넣지 마십시오.\n')
