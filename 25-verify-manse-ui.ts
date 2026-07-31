// 25-verify-manse-ui.ts
// 만세력 화면 «표가 사라지지 않는가» 그물 — 2026-07-31 긴급
//
// ══════════════════════════════════════════════════════════════════
//  🔴 이 검사가 «왜» 생겼나
//
//   2026-07-29 프리미엄 도표를 «AI 풀이 안 샌드위치» 로 옮기면서
//   위쪽 표에 `!premiumPrompt &&` 를 걸었습니다.
//
//   그런데 홈의 「나의 만세력」 버튼은 mode=chart 로 들어옵니다.
//   그 모드는 AI 풀이 블록 자체를 «안 그립니다» (!chartOnly 조건).
//     → 위에서도 숨고, 아래 샌드위치도 없음
//     → ★오행·용신·대운·세운 표가 «전부» 사라짐
//
//   ⚠️ 조건 두 개가 «각각은 옳은데» 겹치면 화면이 빕니다.
//      그래서 «조건이 겹치는 자리» 를 검사로 못 박습니다.
// ══════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'fs'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const PAGE = 'app/manseryeok/result-new/page.tsx'
const src = readFileSync(PAGE, 'utf8')

console.log('\n━━ ⑯-a 🔴 만세력 표가 «어떤 길로 와도» 나오는가 ━━')
{
  // ★2026-07-31 대표님 확정 — 프리미엄 «샌드위치» 는 진로적성 화면에 하는 것입니다.
  //   만세력 화면(홈에서 들어가는 두 길)은 표가 «전부» 나와야 합니다.
  //   그래서 표를 감추는 조건이 «하나도 없어야» 합니다.
  const lines = src.split('\n').map((l, i) => ({ l, n: i + 1 }))
  const bare = lines.filter(({ l }) => /\{[^/]*!premiumPrompt\s*&&/.test(l))
  check(bare.length === 0,
    `★표를 감추는 «!premiumPrompt &&» 자리 ${bare.length}곳`
    + (bare.length ? ` — ${bare.map((b) => b.n + '행').join(', ')}` : ''))
  if (bare.length) {
    console.log('     ⚠️ 만세력 표는 감추면 안 됩니다. 그 조건을 «지우십시오».')
    console.log('        샌드위치는 app/manseryeok/career-result 에서 합니다.')
  }
  check(!/\(!premiumPrompt \|\| chartOnly\)/.test(src),
    `«|| chartOnly» 로 절반만 고친 자리도 없습니다`)
}

console.log('\n━━ ⑯-b 표 섹션이 «전부 있는가» ━━')
{
  const MUST = ['사주 원국', '오행과 십성 분석', '신강 · 신약', '나의 용신',
                '운의 흐름 (대운·세운·월운·일운)']
  for (const t of MUST) check(src.includes(`title="${t}"`), `「${t}」 섹션이 있습니다`)
  // 전문가 상세는 ?pro=1 + 합충 토글일 때만
  check(src.includes('title="전문가 상세"'), `「전문가 상세」 섹션이 있습니다`)
}

console.log('\n━━ ⑯-c 홈 「나의 만세력」 버튼이 어느 길로 가는가 ━━')
{
  const card = readFileSync('app/manseryeok/components/UserCard.tsx', 'utf8')
  check(/result-new\?[^`]*mode=chart/.test(card),
    `★홈 버튼이 mode=chart 로 들어갑니다 — ⑯-a 가 지키는 그 길입니다`)
}

console.log('\n━━ ⑯-d ★진로적성에 만세력 표가 «쪼개져» 붙는가 ━━')
{
  const career = readFileSync('app/manseryeok/career-result/page.tsx', 'utf8')
  check(/SajuTableSlot/.test(career), `진로적성이 SajuTableSlot 을 씁니다`)
  check(/TABLE_AFTER/.test(career), `카드 뒤에 붙일 표 지도(TABLE_AFTER)가 있습니다`)
  for (const k of ['ohaeng_gijil', 'yukchin', 'yongsin']) {
    check(new RegExp(`${k}:\\s*\\{ kinds`).test(career), `「${k}」 카드 뒤에 표가 붙습니다`)
  }
  const slot = readFileSync('app/manseryeok/components/SajuTableSlot.tsx', 'utf8')
  for (const c of ['OhaengPentagon', 'SipsungTable', 'SingangTable', 'YongsinCard']) {
    check(slot.includes(c), `${c} 를 떼어다 씁니다`)
  }
  // ⚠️ 색을 «지어내지» 않았는가 — 오행 색은 명리 규칙입니다
  check(!/목:\s*'#/.test(slot), `★오행 색을 여기서 지어내지 않았습니다 (ohaengColor 한 곳만)`)
}

console.log('\n━━ ⑯-e ★부품이 «한 벌» 인가 (2026-08-01 통합) ━━')
{
  const { execSync } = require('child_process') as typeof import('child_process')
  const sh = (c: string) => { try { return execSync(c, { encoding: 'utf8' }) } catch { return '' } }

  // ① 사주 원국 — 정본이 공용 자리에 있는가
  check(existsSync('app/manseryeok/components/SajuWonguk.tsx'),
    `★정본 원국이 공용 자리(components/)에 있습니다`)
  check(!existsSync('app/manseryeok/result-new/SajuWonguk.tsx'),
    `옛 자리(result-new/)에 남아 있지 않습니다`)
  // ⚠️ «import» 만 봅니다. 주석에 옛 경로를 적어 둔 것까지 잡으면 안 됩니다
  const oldPath = sh(`grep -rln "^import.*result-new/SajuWonguk" --include=*.tsx app/ 2>/dev/null`).trim()
  check(oldPath === '', `옛 경로로 «부르는» 화면이 없습니다 — ${oldPath.split('\n').filter(Boolean).join(', ') || '0곳'}`)

  // ② 이사택일이 «정본을 가져다» 쓰는가 (스스로 그리지 않는가)
  const solo = readFileSync('app/manseryeok/moving-timing/components/SoloWonguk.tsx', 'utf8')
  check(/import SajuWonguk from '@\/app\/manseryeok\/components\/SajuWonguk'/.test(solo),
    `★이사택일이 정본 원국을 가져다 씁니다`)
  check(!/gridTemplateColumns: 'repeat\(4,1fr\)'/.test(solo),
    `이사택일이 원국을 «스스로 그리지» 않습니다`)

  // ③ 오행 색 — 화면이 자기 색표를 갖고 있지 않은가
  const dirty = sh(`grep -rln "목: *'#\|목:'#" --include=*.tsx app/manseryeok/ 2>/dev/null`).trim()
  const files = dirty ? dirty.split('\n').filter(Boolean) : []
  check(files.length === 0,
    `★화면이 «자기 오행 색표» 를 갖고 있지 않습니다 — ${files.join(', ') || '0곳'}`)
  if (files.length) {
    console.log('     ⚠️ 오행 색은 «명리 규칙» 입니다. lib/saju/ohaengColor.ts 한 곳만 쓰십시오.')
    console.log('        그래프·막대는 EL_CHART, 글씨는 EL_TEXT, 칸 배경은 EL_BG 입니다.')
  }
  const oc = readFileSync('lib/saju/ohaengColor.ts', 'utf8')
  check(/EL_CHART/.test(oc) && /금: '#b8b8b8'/.test(oc),
    `정본에 EL_CHART 가 있고 금(金) 예외가 지켜집니다`)
  for (const f of ['app/manseryeok/result-new/OhaengPentagon.tsx',
                   'app/manseryeok/career-result/components/CareerJudgeCard.tsx']) {
    check(readFileSync(f, 'utf8').includes('EL_CHART'), `${f.split('/').pop()} 가 EL_CHART 를 씁니다`)
  }

  // ⚠️ 궁합 원국은 «그대로» 둡니다 (좌4+우4 배치) — 대표님 확정
  check(existsSync('app/manseryeok/couple-result-new/components/CoupleWonguk.tsx'),
    `⚠️ 궁합 원국은 그대로 둡니다 (배치가 달라 — 대표님 확정)`)
}

console.log('\n━━ ⑯-f ★내이름 감정 화면 (41부 Step 3 · UI) ━━')
{
  const page = readFileSync('app/manseryeok/naming/diagnosis/page.tsx', 'utf8')
  const sum = readFileSync('app/manseryeok/naming/diagnosis/components/NamingSajuSummary.tsx', 'utf8')
  const apt = readFileSync('app/manseryeok/naming/diagnosis/components/NamingAptitude.tsx', 'utf8')

  check(/NamingSajuSummary/.test(page) && /NamingAptitude/.test(page), `두 부품이 화면에 얹혀 있습니다`)

  // ① 상단 요약 — «펼친 채» (대표님 확정). 접는 상태가 없어야 합니다
  check(!/useState\([^)]*\)\s*(?:\/\/[^\n]*)?\n[\s\S]{0,200}접/.test(sum) && !/open/.test(sum.split('export default')[1] ?? ''),
    `★상단 요약은 «펼친 채» 입니다 (접기 없음)`)
  check(/SajuWonguk/.test(sum), `상단 요약이 정본 원국표를 «가져다» 씁니다`)

  // ② 六 — «접힌 채» 시작
  check(/useState\(false\)/.test(apt), `★六 명리적성이 «접힌 채» 시작합니다`)
  check(/aria-expanded/.test(apt), `접기·펼치기에 aria-expanded 가 있습니다`)

  // ③ 상세 진로적성 링크
  check(/careerHref/.test(apt) && /career-result/.test(page),
    `★「상세 진로·적성 분석 보러가기」 링크가 있습니다`)

  // ④ 색을 지어내지 않았는가 — 오행 색은 명리 규칙입니다
  for (const [n, src] of [['NamingSajuSummary', sum], ['NamingAptitude', apt]] as const) {
    check(!/목:\s*'#/.test(src), `${n} 이 «자기 오행 색표» 를 갖고 있지 않습니다`)
    check(/EL_CHART/.test(src), `${n} 이 정본 색(EL_CHART)을 씁니다`)
  }

  // ⑤ 🔴 reasons 를 «그리지 않는가» (교훈 AV)
  check(!/\.reasons/.test(apt), `★AI 통변 재료(reasons)를 화면에 그리지 않습니다 (교훈 AV)`)
  check(/\.lines/.test(apt), `손님 문장(lines)만 그립니다`)

  // ⑥ 문턱 — 2026-07-31 대표님 확정 «현행 유지»
  check(/25~45/.test(sum) && !/0~14/.test(sum),
    `★문턱 안내가 현행(25~45 강점 · 50↑ 넘침)입니다 — 철회된 환산값(0~14)이 없습니다`)
}

console.log(`\n━━ 만세력 화면 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
