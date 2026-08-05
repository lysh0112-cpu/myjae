// 36-verify-line-token.ts
// 선 부품 그물 — 2026-08-05 (47부 24차 · 대표님 지시)
//
// ══════════════════════════════════════════════════════════════════
//  🔴 이 검사가 «왜» 생겼나
//
//   2026-08-05, 저장소 전체의 테두리를 세어 보니 —
//     · 테두리 지정 ★733 군데
//     · 색이 드러난 것 중 ★서로 다른 색이 «94 가지»
//     · 「내 이름 정밀분석」 ★한 화면 안에만 선이 «여섯 종류»
//     · 궁합·사주는 다른 카드가 #9c7a58 인데 ★통변만 #f0e0d5 (1.29:1)
//
//   ⇒ 대표님 — 「모든 라인들을 부품처럼 통일하면 어떤가」
//   ⇒ lib/ui/line.ts 를 만들고 화면을 «하나씩» 옮기는 중입니다.
//
//  ⚠️⚠️ 그런데 이 일은 ★«한 번에 끝나지 않습니다».
//     733 곳을 한꺼번에 바꾸면 어디서 어긋났는지 못 찾습니다.
//     ⇒ 그래서 이 검사는 «막는» 것이 아니라 ★«되돌아가는 것을 막고
//        얼마나 남았는지 세는» 그물입니다.
//
//  ★이 검사가 지키는 것 셋
//    ㊱-a  ★이미 옮긴 파일이 «되돌아가지» 않는가   (실패로 잡습니다)
//    ㊱-b  부품 값이 «흐트러지지» 않았는가          (실패로 잡습니다)
//    ㊱-c  얼마나 남았는가                        (★세기만 합니다. 실패 아님)
//
//  ⛔ ㊱-c 를 «실패» 로 바꾸지 마십시오. 아직 700곳 가까이 남아 있어
//     빌드가 통째로 막힙니다. 다 옮긴 뒤에 바꾸십시오.
// ══════════════════════════════════════════════════════════════════

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

let pass = 0
let fail = 0
function check(ok: boolean, msg: string) {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) }
  else { fail++; console.log(`  ❌ ${msg}`) }
}

function collect(dir: string, out: string[] = []): string[] {
  let entries: string[]
  try { entries = readdirSync(dir) } catch { return out }
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue
    const full = join(dir, name)
    if (statSync(full).isDirectory()) collect(full, out)
    else if (full.endsWith('.tsx')) out.push(full)
  }
  return out
}

const files = collect('app')
const TOKEN = /LINE_OUTER|LINE_INNER|CHIP_BORDER|LINE_WARN/
// ⚠️ 선 값이 «식» 으로 이어지는 경우가 많습니다 —
//     border: `0.5px solid ${gPicked > 0 ? col + '55' : '#f0e0d5'}`
//     border: '1px solid ' + (on ? GOLD : '#e5d3c2')
//   ⇒ 따옴표에서 끊으면 ★뒤에 오는 «뜻이 있는 색» 을 못 봅니다.
//     그래서 ★줄 «전체» 를 함께 봅니다 (아래 isMeaningful 이 줄을 받습니다).
const BORDER = /border[A-Za-z]*: *[`'][^`']*solid[^`']*/g
// ⚠️⚠️ ★위 BORDER 는 g 플래그가 있어 .test() 로 되쓰면 lastIndex 가 남아
//    «한 줄 걸러» 놓칩니다. 줄 검사용은 ★g 없는 것을 따로 둡니다.
const BORDER1 = /border[A-Za-z]*: *[`'][^`']*solid[^`']*/

/**
 * ★이미 «옮긴» 파일들 — 되돌아가면 실패로 잡습니다.
 *   ⚠️ 화면을 새로 옮기실 때 ★여기에 «반드시» 더하십시오.
 *      안 더하면 그 화면은 다음 세션이 조용히 되돌려도 아무도 모릅니다.
 */
const MOVED = [
  'app/components/common/ConsultButton.tsx',
  'app/manseryeok/components/PerspectiveAccordion.tsx',
  'app/manseryeok/components/TongbyeonView.tsx',
  'app/manseryeok/couple-result-new/page.tsx',
  'app/manseryeok/couple-result-new/components/CoupleJudgeCard.tsx',
  'app/manseryeok/couple-result-new/components/OhaengCompareCard.tsx',
  'app/manseryeok/naming/components/NameAnalysisResultView.tsx',
  'app/manseryeok/naming/diagnosis/page.tsx',
  'app/manseryeok/naming/diagnosis/components/NamingAptitude.tsx',
  'app/manseryeok/naming/diagnosis/components/NamingSajuSummary.tsx',
  'app/manseryeok/naming/rename/newresult/page.tsx',
  'app/manseryeok/result-new/page.tsx',
  'app/manseryeok/result-new/YongsinCard.tsx',
  'app/manseryeok/result-new/HapchungView.tsx',
  // ★2026-08-05 (47부 25차) — 궁합·진로적성 «부품 트리» 를 전수로 훑어 더했습니다.
  //   ⚠️ 24차까지는 화면 page 만 보고 옮겨 ★CoupleReport(통변 본문 카드)를 «빠뜨렸습니다».
  //      대표님이 사진으로 짚어 주셔서 알았습니다.
  //   ⇒ 앞으로는 ★import 를 타고 «부품 트리 전체» 를 훑고 옮기십시오.
  'app/components/common/CopyTextButton.tsx',
  'app/manseryeok/couple-result-new/components/CoupleReport.tsx',
  'app/manseryeok/couple-result-new/components/CoupleFollowUp.tsx',
  'app/manseryeok/career-result/page.tsx',
  'app/manseryeok/career-result/components/CareerJudgeCard.tsx',
  'app/manseryeok/career-result/components/MbtiCard.tsx',
]

/**
 * ⛔ «뜻이 있는» 색 — 통일에서 «뺀» 것들입니다.
 *   45부 8-2: 「빨강 선은 «주의» 뜻이라 ★갈색으로 안 바꿈」
 *   ⛔ 이것들을 선 부품으로 바꾸지 마십시오. 뜻이 사라집니다.
 */
const MEANINGFUL = [
  'EL_BD_STRONG',            // 오행 색 (木火土金水)
  // ⚠️ ★식 안에서 «이름만» 나오는 것도 잡아야 합니다 —
  //    border: `0.5px solid ${gPicked > 0 ? col + '55' : '#f0e0d5'}`
  //    ⇒ '${col}' 로만 적으면 «못 잡습니다». 이름 그대로 둡니다.
  'col', 'bd',               // 오행·판정에 따라 갈리는 색
  '${accent}',               // 관점별 색 (PerspectiveAccordion 왼쪽 세로선)
  '#d8e4d8', '#e8cfcf',      // 좋음 / 나쁨
  '#d9a55f', '#e2d9f2',      // 강조 배지
  '#e8b4b4', '#e5d3c2',      // 경고 카드 · 고른 것 표시
  'rgba(200,120,60',         // 연한 강조
  'rgba(120,53,15',          // 연한 강조
  'GOLD',                    // 강조
  'copied',                  // 복사 «됐다» 는 뜻 (#a8c898 초록)
  '#3c9a6e',                 // CoupleReport 세로선 — 좋음
  '#5dcaa5', '#f0997b', '#cec9f0',   // MbtiCard 세로선 셋 — «세 가지 뜻» 을 색으로 가름
  '#b6e0d0', '#f2c9b8',      // MbtiCard 강점/약점
]
function isMeaningful(line: string) {
  return MEANINGFUL.some(m => line.includes(m))
}

console.log('\n━━ ㊱-a 🔴 ★이미 옮긴 파일이 «되돌아가지» 않았는가 ━━')
{
  for (const f of MOVED) {
    let src: string
    try { src = readFileSync(f, 'utf8') }
    catch { check(false, `★${f} 를 못 찾습니다 (옮겨지거나 지워졌나요?)`); continue }

    check(/from '@\/lib\/ui\/line'/.test(src),
      `${f.replace('app/', '')} 가 선 부품을 «부릅니다»`)

    // 부품도 아니고 «뜻이 있는» 색도 아닌 선이 있으면 — 되돌아간 것입니다
    // ★줄 «전체» 로 봅니다 — 식이 이어지는 색을 놓치지 않으려는 것입니다
    const strays = src.split('\n')
      .filter(l => BORDER1.test(l))
      .filter(l => !TOKEN.test(l) && !isMeaningful(l))
      .map(l => l.trim().slice(0, 60))
    check(strays.length === 0,
      strays.length === 0
        ? `  └ 부품 밖 선이 «없습니다»`
        : `  └ ★부품 밖 선 ${strays.length}곳 — ${strays.slice(0, 2).join(' · ')}`)
  }
}

console.log('\n━━ ㊱-b 부품 값이 «흐트러지지» 않았는가 ━━')
{
  const t = readFileSync('lib/ui/line.ts', 'utf8')
  check(/LINE_OUTER_COLOR = '#ea8c46'/.test(t), `바깥선 색이 #ea8c46 입니다 (2.52:1)`)
  check(/LINE_INNER_COLOR = '#ea8c46'/.test(t), `안쪽선 색이 #ea8c46 입니다`)
  check(/CHIP_BORDER_COLOR = '#ea8c46'/.test(t), `알약 선 색이 #ea8c46 입니다`)
  check(/LINE_WARN_COLOR = '#c14545'/.test(t), `★경고선은 «따로» 입니다 (통일에서 뺀 색)`)
  // ⚠️ 셋을 «따로» 둔 까닭 — 바탕이 다르면 대비가 갈립니다.
  //    흰 카드 2.52 · 카드 2.45 · 안쪽칸 2.29 · ★흐린 알약 2.18
  check(/LINE_OUTER_COLOR/.test(t) && /LINE_INNER_COLOR/.test(t) && /CHIP_BORDER_COLOR/.test(t),
    `★바깥·안쪽·알약을 «따로» 돌릴 수 있습니다`)
  check(/CHIP_RADIUS/.test(t) && /CHIP_PADDING/.test(t) && /CHIP_FONT_SIZE/.test(t),
    `알약은 색뿐 아니라 ★둥글기·여백·글자까지 부품에 있습니다`)
}

console.log('\n━━ ㊱-c 얼마나 남았는가 ★(세기만 합니다 — 실패 아님) ━━')
{
  let allBorders = 0
  let tokenUses = 0
  const rest: { f: string; n: number }[] = []
  for (const f of files) {
    const src = readFileSync(f, 'utf8')
    const bs = src.match(BORDER) ?? []
    allBorders += bs.length
    tokenUses += (src.match(/LINE_OUTER|LINE_INNER|CHIP_BORDER|LINE_WARN/g) ?? []).length
    const stray = src.split('\n')
      .filter(l => BORDER1.test(l))
      .filter(l => !TOKEN.test(l) && !isMeaningful(l)).length
    if (stray > 0 && !MOVED.includes(f)) rest.push({ f: f.replace('app/', ''), n: stray })
  }
  rest.sort((a, b) => b.n - a.n)
  console.log(`     테두리 지정 전체      ${allBorders} 곳`)
  console.log(`     ★부품을 쓰는 곳        ${tokenUses} 곳`)
  console.log(`     아직 안 옮긴 곳        ${rest.reduce((s, r) => s + r.n, 0)} 곳`)
  console.log(`     ─ 많이 남은 화면 ─`)
  for (const r of rest.slice(0, 8)) console.log(`       ${String(r.n).padStart(3)} ${r.f}`)
  console.log(`     ⚠️ 이 숫자는 «실패가 아닙니다». 화면을 하나씩 옮기며 줄이십시오.`)
  console.log(`     ⚠️ 옮기실 때 ★MOVED 목록에 «반드시» 더하십시오 (이 파일 위쪽).`)
}

console.log('\n━━ ㊱-d 검사 스크립트가 verify 에 «물려 있는가» ━━')
{
  const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts?: Record<string, string> }
  check((pkg.scripts?.verify ?? '').includes('36-verify-line-token'),
    `verify 에 36-verify-line-token 이 물려 있습니다`)
}

console.log(`\n━━ 선 부품 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
