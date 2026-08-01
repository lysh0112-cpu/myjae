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
  {
    const stale = existsSync('app/manseryeok/result-new/SajuWonguk.tsx')
    check(!stale, `옛 자리(result-new/SajuWonguk.tsx)에 «남아 있지 않습니다»`)
    if (stale) {
      // ⚠️ 꾸러미를 «덮어쓰는» 것만으로는 옛 파일이 안 지워집니다.
      //    그래서 빌드 로그만 보고는 무엇을 해야 할지 알 수 없습니다. 여기 적어 둡니다.
      console.log('')
      console.log('     ┌──────────────────────────────────────────────────────────┐')
      console.log('     │  고치는 법 — 옛 파일을 «지우십시오»                          │')
      console.log('     │                                                          │')
      console.log('     │    git rm app/manseryeok/result-new/SajuWonguk.tsx        │')
      console.log('     │    git commit -m "옛 원국 부품 삭제 (공용 자리로 옮김)"       │')
      console.log('     │                                                          │')
      console.log('     │  ★정본은 app/manseryeok/components/SajuWonguk.tsx 입니다.  │')
      console.log('     │    둘을 함께 두면 언젠가 갈립니다. (교훈 CJ)                 │')
      console.log('     └──────────────────────────────────────────────────────────┘')
      console.log('')
    }
  }
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

console.log('\n━━ ⑯-g ★이름 풀이 재료·프롬프트 (2026-08-01 교정) ━━')
{
  const api = readFileSync('app/api/naming/route.ts', 'utf8')
  const sum = readFileSync('app/manseryeok/naming/diagnosis/components/NamingSajuSummary.tsx', 'utf8')

  // ① 배지가 «줄바꿈» 되지 않는가 — 「비어 있음」이 두 줄로 갈리던 자리
  check(/whiteSpace: 'nowrap'/.test(sum), `★오행 등급 배지가 줄바꿈되지 않습니다 (nowrap)`)
  check(!/background: tone\.bg[\s\S]{0,80}width: 44/.test(sum), `배지에 고정 폭이 걸려 있지 않습니다`)

  // ② 재료가 «두 바구니» 로 갈렸는가 — 四 와 五 가 섞이던 자리
  check(/자원오행_글자끼리/.test(api), `★재료에 「자원오행_글자끼리」 바구니가 있습니다`)
  check(/사주와의만남_정밀/.test(api), `★재료에 「사주와의만남_정밀」 바구니가 있습니다`)
  check(!/자원오행_정밀: verdict\.facts/.test(api),
    `옛 「자원오행_정밀: verdict.facts」 통짜 넘기기가 없습니다`)
  // 사주 관계 항목이 «글자끼리» 바구니에 섞이지 않았는가
  const jaBucket = (api.match(/자원오행_글자끼리: \{[\s\S]*?\n      \},/) ?? [''])[0]
  const leaked = ['weakClash', 'gisinAdded', 'excessAdded', 'lackFilled', 'yongsinChars']
    .filter(k => jaBucket.includes(k))
  check(leaked.length === 0, `★「글자끼리」 바구니에 사주 항목이 섞이지 않았습니다 — ${leaked.join(',') || '0건'}`)

  // ③ 건강 문구를 «맺음으로 쓰지 말라» 는 지시가 있는가
  check(/마지막 문장» 으로 쓰지 마세요|마지막 문장»으로 쓰지 마세요/.test(api),
    `★건강 문구를 «관점의 마지막 문장» 으로 쓰지 말라는 지시가 있습니다`)
  check(/개운/.test(api), `五 의 맺음을 «개운» 의 말로 하라는 지시가 있습니다`)

  // ④ 비문 막는 예시가 있는가
  check(/봅니다는/.test(api), `★「봅니다는」 비문 예시가 프롬프트에 있습니다`)
  check(/본다는|보는 견해/.test(api), `바른 어투 예시가 함께 있습니다`)
}

console.log('\n━━ ⑯-h ★보관함 — 풀이와 작명을 가르는가 (Phase 1 A) ━━')
{
  const rec = readFileSync('lib/saju/namingRecords.ts', 'utf8')
  const sto = readFileSync('app/manseryeok/naming/diagnosis/storage/page.tsx', 'utf8')
  const newres = readFileSync('app/manseryeok/naming/rename/newresult/page.tsx', 'utf8')
  const diag = readFileSync('app/manseryeok/naming/diagnosis/page.tsx', 'utf8')

  // ① 종류 표시가 «input_data 안» 에 들어가는가
  check(/export type NamingKind/.test(rec), `NamingKind 타입이 있습니다`)
  check(/kind\?: NamingKind/.test(rec), `input_data 블롭에 kind 가 «선택값» 으로 들어갑니다`)
  // ⚠️ service_type 을 나누면 «이미 쌓인 기록» 이 목록에서 사라집니다. 나누지 않았는지 봅니다
  check(/\.eq\('service_type', serviceType\)/.test(rec),
    `목록 조회가 여전히 service_type 하나로 봅니다 (옛 기록이 안 사라집니다)`)
  check(/DEFAULT_NAMING_KIND: NamingKind = '풀이'/.test(rec),
    `★kind 가 없는 «옛 기록» 은 «풀이» 로 봅니다`)
  check(/kind: blob\?\.kind \?\? DEFAULT_NAMING_KIND/.test(rec),
    `읽을 때 기본값으로 메웁니다`)

  // ② 두 화면이 «자기 종류» 를 적는가
  check(/kind: '개명'/.test(newres), `개명 결과가 «개명» 으로 저장합니다`)
  check(/kind: '풀이'/.test(diag), `이름 풀이가 «풀이» 로 저장합니다`)

  // ③ 화면 — 필터 탭 · 태그 · 통합 버튼
  check(/FILTERS/.test(sto) && /shownRecords/.test(sto), `필터 탭과 걸러진 목록이 있습니다`)
  for (const t of ['전체', '이름 풀이', '작명 보관함']) {
    check(sto.includes(t), `탭 「${t}」 가 있습니다`)
  }
  check(/KIND_TAG/.test(sto), `작명에 붙는 «도드라지는» 태그가 있습니다`)
  check(/aria-pressed/.test(sto), `탭에 aria-pressed 가 있습니다`)
  check(/새 이름 풀이 \/ 작명하기/.test(sto), `★하단 버튼이 «하나» 로 모였습니다`)
  check(!/\+ 새 이름 풀이하기</.test(sto), `옛 버튼 문구가 남아 있지 않습니다`)

  // ④ 손맛 — 눌림 모션 (요청 6)
  check(/cubic-bezier\(\.4,0,\.2,1\)/.test(sto), `누를 때 반응하는 모션이 걸려 있습니다`)

  // ⑤ ⚠️ 옛 기록이 «안 사라지는가» — 가장 중요한 검사
  check(!/\.eq\('service_type', 'renaming'\)/.test(rec) && !/serviceType: 'renaming'/.test(newres),
    `★service_type 을 새로 나누지 «않았습니다» (나누면 옛 기록이 목록에서 사라집니다)`)
}

console.log('\n━━ ⑯-i ★결과 프레임이 «한 벌» 인가 (Phase 1-C) ━━')
{
  const frame = 'app/manseryeok/naming/components/NameAnalysisResultView.tsx'
  check(existsSync(frame), `공용 프레임이 있습니다`)
  const diag = readFileSync('app/manseryeok/naming/diagnosis/page.tsx', 'utf8')
  const newres = readFileSync('app/manseryeok/naming/rename/newresult/page.tsx', 'utf8')

  check(/NameAnalysisResultView/.test(diag), `★감정 화면이 공용 프레임을 씁니다`)
  check(/NameAnalysisResultView/.test(newres), `★작명 화면이 공용 프레임을 씁니다`)

  // 🔴 옛 통변 구조가 «남아 있지 않은가» — 이것 때문에 통변이 안 나왔습니다
  // ⚠️ 줄머리 주석은 걸러 냅니다 — 왜 고쳤는지 적어 둔 것까지 잡으면 안 됩니다
  const code = newres.split('\n').filter(l => !/^\s*(\/\/|\*)/.test(l)).join('\n')
  check(!/commentary\.summary/.test(code),
    `★작명이 «commentary.summary» 를 더 보지 않습니다 (API 가 주지 않는 필드였습니다)`)
  for (const k of ['\\.good', '\\.improve', '\\.advice']) {
    check(!new RegExp(`commentary${k}`).test(newres), `옛 필드 commentary${k.replace('\\\\','')} 가 없습니다`)
  }
  check(/yinyang/.test(newres) && /conclusion/.test(newres),
    `5관점 구조를 씁니다 (yinyang·conclusion)`)

  // 프레임이 세 부품을 다 그리는가
  const src = readFileSync(frame, 'utf8')
  for (const c of ['NamingSajuSummary', 'PerspectiveAccordion', 'NamingAptitude']) {
    check(src.includes(c), `프레임이 ${c} 를 그립니다`)
  }
  // ★작명 전용 — 배지와 [다른 추천 한자 보기]
  check(/NameResultBadge/.test(src) && /추천 \{p\.badge\.rank\}순위/.test(src),
    `★작명 배지 [개명]·[추천 N순위 · 점수] 가 있습니다`)
  check(/다른 추천 한자 보기/.test(src), `[다른 추천 한자 보기] 가 있습니다`)
  // ⚠️ 숫자 점수는 «화면에만». AI 문장 규칙과 충돌하지 않는지
  check(/숫자 점수는 «여기» 에만 보입니다/.test(src),
    `★점수는 배지에만 — AI 문장에는 안 쓴다는 것이 적혀 있습니다`)
  // 색을 지어내지 않았는가
  check(!/목:\s*'#/.test(src), `프레임이 «자기 오행 색표» 를 갖고 있지 않습니다`)
}

console.log('\n━━ ⑯-j ★갈림길 화면 — 풀이할까 지어 드릴까 (Phase 2-B) ━━')
{
  const start = 'app/manseryeok/naming/start/page.tsx'
  check(existsSync(start), `갈림길 화면이 있습니다`)
  const src = readFileSync(start, 'utf8')
  const sto = readFileSync('app/manseryeok/naming/diagnosis/storage/page.tsx', 'utf8')
  const nn = readFileSync('app/manseryeok/naming/rename/newname/page.tsx', 'utf8')

  // ① 보관함 버튼이 «갈림길» 로 오는가 (전에는 바로 진단으로 갔습니다)
  check(/naming\/start/.test(sto), `★보관함이 갈림길 화면으로 보냅니다`)
  check(!/router\.push\('\/manseryeok\/naming\/diagnosis'\)/.test(sto),
    `보관함이 «바로 진단» 으로 가지 않습니다`)

  // ② 두 길이 다 있는가
  check(/naming\/diagnosis/.test(src), `길 ① 이름 풀이`)
  check(/rename\/newname/.test(src), `길 ② 작명`)

  // ③ ★사주를 «다시 묻지 않는가» — 앞에서 받은 것을 그대로 나릅니다
  for (const k of ['year', 'month', 'day', 'gender', 'calType', 'leapMonth', 'hour']) {
    check(src.includes(`'${k}'`), `사주 ${k} 를 이어 나릅니다`)
  }

  // ④ ⚠️ 작명 옵션이 «교재 밖» 임을 밝히는가
  check(/어감\/성향 선호 필터 \(교재 밖 참고용\)/.test(src),
    `★「교재 밖 참고용」 이 명시돼 있습니다`)
  check(/길흉 판정에 쓰지 않습니다|길흉 판정 아님/.test(src),
    `길흉에 쓰지 않는다고 적혀 있습니다`)

  // ⑤ ★옵션이 다음 화면까지 «살아 가는가»
  for (const k of ['kind', 'style', 'prefer', 'avoid']) {
    check(src.includes(`'${k}'`) || src.includes(`set('${k}'`), `${k} 를 실어 보냅니다`)
  }
  check(/withOpts/.test(nn), `★newname 이 옵션을 «잃지 않고» 다음으로 나릅니다`)

  // ⑥ 손맛
  check(/cubic-bezier\(\.4,0,\.2,1\)/.test(src), `누를 때 반응하는 모션`)
  check(/aria-pressed/.test(src), `고른 자리에 aria-pressed`)
}

console.log('\n━━ ⑯-k ★Step 2 — 한글 이름을 «고르는» 화면 (Phase 3) ━━')
{
  const picker = 'app/manseryeok/naming/components/NamePicker.tsx'
  check(existsSync(picker), `이름 고르기 부품이 있습니다`)
  const src = readFileSync(picker, 'utf8')
  const nn = readFileSync('app/manseryeok/naming/rename/newname/page.tsx', 'utf8')

  // ① 세 갈래
  for (const t of ['추천받기', '사전에서 고르기', '직접 쓰기']) {
    check(src.includes(t), `탭 「${t}」 가 있습니다`)
  }
  check(/recommendNames/.test(src), `★추천 엔진을 씁니다`)
  check(/NAME_DICT/.test(src), `★교재 1장 사전을 씁니다`)

  // ② ⚠️ 사전에서 고른 이름을 «그 자리에서» 성씨와 맞춰 보는가
  check(/evaluateSoundOhaeng/.test(src),
    `★사전에서 고르면 «지금 성씨와» 어울리는지 그 자리에서 잽니다`)
  check(/이 이름으로 한자 고르러 가기/.test(src), `고른 뒤 다음으로 가는 길이 있습니다`)

  // ③ 판정을 «다시 하지» 않는가 (교훈 CJ)
  check(!/SCORE_BASE|125칸을 여기서/.test(src), `판정을 여기서 다시 하지 않습니다`)
  check(!/목:\s*'#/.test(src), `«자기 오행 색표» 를 갖고 있지 않습니다`)

  // ④ 화면에 얹혔는가 · 직접 쓰기가 «살아 있는가»
  check(/NamePicker/.test(nn), `★newname 이 이 부품을 씁니다`)
  check(/manual=\{<>/.test(nn), `★「직접 쓰기」 가 그대로 살아 있습니다`)
  check(/function pickName/.test(nn), `고르면 다음으로 넘기는 길이 있습니다`)
  // ⚠️ 이용권·결제 흐름이 «갈리지» 않아야 합니다
  check(/pickName[\s\S]{0,300}readRemaining\(\) > 0[\s\S]{0,200}setPayOpen\(true\)/.test(nn),
    `★추천으로 고를 때도 «같은» 이용권·결제 길을 씁니다`)

  // ⑤ 추천에 쓸 사주·용신을 구하는가
  check(/useResultSaju/.test(nn), `사주를 구합니다`)
  check(/calcYongsinCompat/.test(nn), `용신을 구합니다`)
  check(/catch \{ return '' \}/.test(nn), `용신을 못 구해도 «멈추지 않습니다»`)
}

console.log(`\n━━ 만세력 화면 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) process.exit(1)
