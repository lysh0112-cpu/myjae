// 28-verify-naming-flow.ts
// 작명 동선 «네 병목» 그물 — 2026-08-01 (43부)
//
// ══════════════════════════════════════════════════════════════════
//  🔴 이 검사가 «왜» 생겼나
//
//   42부에 「작명은 이름 없이 시작합니다」를 넣었는데, 화면에서는 «열리지 않았습니다».
//   네 자리가 각각 끊겨 있었고 «어느 검사에도 걸리지 않았습니다» —
//   27-verify 는 엔진만 재고, 25-verify 는 만세력·프레임 쪽을 봅니다.
//
//     ① 신생아 차단      newname 이 «저장된 이름» 이 없으면 화면을 통째로 막음
//     ② URL 성씨 사장    ①에 막혀 surnameFromUrl 이 «한 번도» 안 돎 (죽은 코드)
//     ③ kind 붙박이      newhanja 가 kind 를 안 읽고, newresult 가 '개명' 고정
//     ④ 타인 사주 유실   newhanja·newresult 가 localStorage myinfo(내 것)만 읽음
//
//   ⚠️ 넷 다 «각각은 말이 되는» 코드였습니다. 이어 붙였을 때만 드러납니다.
//      → 그래서 «이어지는 자리» 를 검사로 못 박습니다. (교훈 [조건겹침])
// ══════════════════════════════════════════════════════════════════

import { readFileSync, existsSync } from 'fs'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}
const read = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '')
/** 줄머리 주석은 뺍니다 — «왜 고쳤는지» 적어 둔 글까지 잡으면 안 됩니다 */
const codeOf = (s: string) => s.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')

const P = {
  sess: 'lib/saju/namingSession.ts',
  surname: 'lib/saju/surname.ts',
  nn: 'app/manseryeok/naming/rename/newname/page.tsx',
  nh: 'app/manseryeok/naming/rename/newhanja/page.tsx',
  nr: 'app/manseryeok/naming/rename/newresult/page.tsx',
  nb: 'app/manseryeok/naming/rename/newborn/page.tsx',
  sto: 'app/manseryeok/naming/diagnosis/storage/page.tsx',
  home: 'app/home-new/page.tsx',
  rec: 'lib/saju/namingRecords.ts',
}
const S = Object.fromEntries(Object.entries(P).map(([k, v]) => [k, read(v)])) as Record<keyof typeof P, string>

console.log('\n━━ ⑲-a 작명 «대상» 을 나르는 창구가 하나인가 ━━')
{
  check(existsSync(P.sess), `namingSession.ts 가 있습니다`)
  for (const k of ['NamingTarget', 'resolveNamingTarget', 'namingTargetQuery',
                   'saveNamingTarget', 'loadNamingTarget', 'hasSaju']) {
    check(S.sess.includes(k), `${k} 를 내어 줍니다`)
  }
  // ★URL 이 정본 · 세션이 부본
  check(/readNamingTargetFromQuery\(get\) \?\? loadNamingTarget\(\)/.test(S.sess),
    `★URL(정본) → 세션(부본) 순서입니다`)
  // ⚠️ 이 파일이 myinfo 를 알면 ④가 여기로 숨어 들어옵니다
  check(!/myinfo|MY_INFO_KEY/.test(codeOf(S.sess)),
    `★이 파일이 «내 정보(myinfo)» 를 모릅니다 — 결함 ④가 숨을 자리가 없습니다`)
  // 열쇠 충돌 — 짓는 이름(name)과 대상 호칭(who)은 «다른» 열쇠여야 합니다
  check(/q\.set\('who'/.test(S.sess) && !/q\.set\('name'/.test(S.sess),
    `★대상 호칭을 who 로 씁니다 — name 은 «짓는 이름» 이 이미 쓰는 열쇠입니다`)
}

console.log('\n━━ ⑲-b 🔴 결함 ① — 신생아가 Step 2 에 «들어올 수» 있는가 ━━')
{
  const code = codeOf(S.nn)
  // 옛 관문: 저장된 한자 성씨(surname)가 없으면 통째로 막았습니다
  check(!/if \(loaded && !surname\)/.test(code),
    `★「저장된 이름이 없으면 막는」 옛 관문이 없습니다`)
  check(/if \(loaded && !surnameHangul\)/.test(code),
    `★이제 «한글 성씨» 만 있으면 들어옵니다`)
  check(!/먼저 &lsquo;내 이름 풀이&rsquo;에서 시작해 주세요/.test(S.nn),
    `작명하러 온 손님에게 «이름 풀이부터 하라» 고 하지 않습니다`)
  // 이름 글자 수 관문도 한글 성씨 기준이어야 합니다
  check(/const ready =\s*\n?\s*surnameHangul\.length > 0/.test(code),
    `★[한자 추천받기] 관문도 한글 성씨 기준입니다`)
}

console.log('\n━━ ⑲-c 🔴 결함 ② — URL 성씨가 «실제로 도는가» ━━')
{
  const code = codeOf(S.nn)
  check(/surnameOfHangul/.test(S.surname) && /export function surnameOfHangul/.test(S.surname),
    `★한글 글자열에서 성씨를 떼는 창구가 surname.ts 에 있습니다`)
  // ⚠️ 「류 첫째」·「김철수」 를 앞 두 글자로 자르면 안 됩니다
  check(!/sp\?\.get\('name'\) \|\| ''\)\.trim\(\)\.slice\(0, 2\)/.test(code),
    `★앞 두 글자를 그냥 자르지 않습니다 (복성 판단은 surname.ts 한 곳)`)
  check(/explicitSurname/.test(code),
    `★URL 이 준 성씨가 «저장된 내 이름» 보다 «먼저» 입니다`)
  // 죽은 코드가 아닌지 — 성씨가 실제로 화면·엔진에 흘러야 합니다
  check(/surname=\{surnameHangul\}/.test(S.nn),
    `★그 성씨가 추천 엔진(NamePicker)에 그대로 들어갑니다`)
  // 보관함이 성씨를 실어 보내는가
  check(/surname=\$\{encodeURIComponent\(surnameOfHangul\(person\.title\)\)\}/.test(S.sto),
    `★보관함이 «성씨» 를 또박또박 실어 보냅니다`)
}

console.log('\n━━ ⑲-d 🔴 결함 ③ — kind 가 «끝까지» 가는가 ━━')
{
  const nhCode = codeOf(S.nh)
  const nrCode = codeOf(S.nr)
  // ① 보관함이 실어 보내는가
  check(/kind=신생아/.test(S.sto), `★보관함 작명 길이 kind 를 실어 보냅니다`)
  // ② Step 2 가 읽고 다시 싣는가
  check(/sp\?\.get\('kind'\)/.test(codeOf(S.nn)), `Step 2 가 kind 를 읽습니다`)
  check(/namingTargetQuery\(target\)/.test(codeOf(S.nn)), `Step 2 가 대상을 통째로 실어 보냅니다`)
  // ③ Step 3 이 «읽고 또 넘기는가» — 여기서 끊겨 있었습니다
  check(/resolveNamingTarget/.test(nhCode), `★Step 3 이 대상을 읽습니다 (전에는 안 읽었습니다)`)
  check(/namingTargetQuery\(targetNow\)/.test(nhCode), `★Step 3 이 대상을 Step 4 로 넘깁니다`)
  check(!/router\.push\('\/manseryeok\/naming\/rename\/newresult'\)/.test(nhCode),
    `★맨몸으로 결과 화면에 보내지 않습니다 (kind 가 죽던 자리)`)
  // ④ Step 4 의 붙박이가 사라졌는가
  check(!/kind: '개명'/.test(nrCode), `★결과 화면의 «kind: '개명'» 붙박이가 없습니다`)
  check(!/badge=\{\{ kind: '개명' \}\}/.test(nrCode), `★배지의 '개명' 붙박이가 없습니다`)
  check(/namingKind/.test(nrCode), `★kind 를 대상에서 받아 씁니다`)
  check(/kind: namingKind/.test(nrCode), `★보관함에도 그 kind 로 저장합니다`)
  // ⑤ 신생아 배지가 «닿을 수 있는» 값인가
  check(/신생아: '신생아'|신생아: \{ label: '신생아'/.test(S.rec + S.sto),
    `보관함에 신생아 태그 자리가 있습니다`)
  // ⚠️ service_type 은 나누면 안 됩니다 (옛 기록이 사라집니다)
  check(!/serviceType: 'newborn'/.test(nrCode),
    `★service_type 을 나누지 «않았습니다» — 옛 기록이 목록에서 사라지지 않습니다`)
}

console.log('\n━━ ⑲-e 🔴 결함 ④ — «그 사람» 사주가 Step 3·4 까지 가는가 ━━')
{
  const nhCode = codeOf(S.nh)
  const nrCode = codeOf(S.nr)
  for (const [name, code] of [['Step 3', nhCode], ['Step 4', nrCode]] as const) {
    check(/hasSaju\(t\)/.test(code), `${name} 이 «대상의 사주» 를 먼저 봅니다`)
    // myinfo 를 아예 못 쓰게 하면 옛 길이 죽습니다 — «먼저 보지 않는지» 만 봅니다
    // ⚠️ 상수 선언(const MY_INFO_KEY = …)이 아니라 «실제로 읽는» 자리를 봅니다
    const iMy = code.indexOf('localStorage.getItem(MY_INFO_KEY)')
    const iTarget = code.indexOf('hasSaju(t)')
    check(iTarget !== -1 && (iMy === -1 || iTarget < iMy),
      `${name} 이 myinfo «보다 먼저» 대상을 봅니다 (순서가 뒤집히면 ④가 되살아납니다)`)
  }
  // ⚠️ 옛 길이 «살아 있어야» 합니다 — 대상이 없으면 예전처럼 돌아야 합니다
  check(/MY_INFO_KEY/.test(nhCode) && /MY_INFO_KEY/.test(nrCode),
    `★대상이 없으면 옛 길(myinfo)로 갑니다 — 기존 개명 손님이 안 깨집니다`)
  // 보관함 기록에 «누구» 인지 남는가
  check(/relation: target\?\.relation \|\| 'self'/.test(nrCode),
    `★보관함에 «누구 이름인지» 남습니다 (전에는 언제나 self 였습니다)`)
}

console.log('\n━━ ⑲-f ★신생아는 성씨 한자를 «고를 수» 있는가 ━━')
{
  const nhCode = codeOf(S.nh)
  // 수리 4격은 성씨 획수에서, 자원오행은 성씨 오행에서 시작합니다.
  // 성씨 한자가 없으면 판정 자체가 불가능합니다.
  check(/pickSurname/.test(nhCode), `★성씨 한자를 고르는 갈래가 있습니다`)
  check(/surnameSlotCount/.test(nhCode) && /slots/.test(nhCode),
    `성씨 칸과 이름 칸을 한 줄(slots)로 다룹니다`)
  check(/loadedSurnameFits/.test(nhCode),
    `★불러온 성씨가 «이 대상의» 성씨일 때만 붙박이로 씁니다`)
  check(/가족관계등록부에 적힌 한자/.test(S.nh),
    `왜 성씨 한자를 묻는지 알려 줍니다`)
  // 개명은 예전 그대로여야 합니다
  check(/!pickSurname && surnameNow/.test(nhCode),
    `★개명은 성씨가 «붙박이 칸» 그대로입니다`)
}

console.log('\n━━ ⑲-g ★E — 아기 이름 짓기가 «열려 있는가» ━━')
{
  check(existsSync(P.nb), `아기 작명 입구 화면이 있습니다`)
  check(!/준비 중이에요/.test(S.nb), `★「준비 중」 안내가 아닙니다`)
  check(/open=작명/.test(S.nb), `입구가 작명 폼으로 이어집니다`)
  // ⚠️ 폼을 두 곳에 만들면 언젠가 갈립니다 (교훈 CJ)
  check(!/PersonFormPitch/.test(codeOf(S.nb)),
    `★입구가 «자기 폼» 을 따로 갖고 있지 않습니다 (보관함 폼 하나만 씁니다)`)
  check(/openParam === '작명'/.test(codeOf(S.sto)), `보관함이 ?open=작명 을 받아 폼을 엽니다`)
  // ⚠️ 효과로 열면 «폼이 한 박자 늦게» 떠서 깜박입니다. 첫 값으로 두었는지 봅니다
  check(/useState<null \| '풀이' \| '작명'>\(\s*\n?\s*openParam ===/.test(S.sto),
    `★효과가 아니라 «첫 값» 으로 엽니다 (폼이 깜박이지 않습니다)`)
  // 홈에서 갈 수 있는가 — 「아무도 안 부르는 화면」이 되지 않게
  check(/rename\/newborn/.test(S.home), `★홈에서 아기 작명으로 갈 수 있습니다`)
  // 대법원 인명용 한자 안내 (E-②)
  check(/대법원 인명용 한자/.test(S.nh), `★한자 고르는 화면에 인명용 한자 안내가 있습니다`)
  // ⚠️ 「우리 목록이 곧 대법원 표」 라고 말하면 안 됩니다 — 그 표가 아직 없습니다
  check(!/대법원 인명용 한자입니다|인명용 한자만 보여/.test(S.nh),
    `★목록이 «대법원 표와 같다» 고 말하지 않습니다 (없는 것을 지어내지 않습니다)`)
}

console.log('\n━━ ⑲-h ⚠️ 옛 개명 손님이 «안 깨지는가» ━━')
{
  const nnCode = codeOf(S.nn)
  // 이용권·결제 길이 갈리면 안 됩니다
  check(/function goHanja/.test(nnCode), `Step 3 로 가는 문이 하나입니다`)
  const gates = (nnCode.match(/readRemaining\(\) > 0/g) ?? []).length
  check(gates >= 2, `추천·직접 쓰기가 «같은» 이용권 관문을 지납니다 (${gates}곳)`)
  check(/manual=\{<>/.test(S.nn), `★「직접 쓰기」 가 그대로 살아 있습니다`)
  check(/my_names/.test(codeOf(S.nh)), `★개명은 여전히 저장된 이름에서 성씨를 받습니다`)
  // 판정을 화면이 다시 하지 않는가 (교훈 CJ)
  for (const [n, c] of [['Step 2', S.nn], ['Step 3', S.nh], ['Step 4', S.nr]] as const) {
    check(!/SCORE_BASE|REL_SCORE/.test(codeOf(c)), `${n} 이 판정을 다시 하지 않습니다`)
  }
}

console.log(`\n━━ 작명 동선 그물 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail > 0) {
  console.log('  ┌────────────────────────────────────────────────────────────┐')
  console.log('  │  고치는 법                                                  │')
  console.log('  │   · 대상은 lib/saju/namingSession.ts 로만 나르십시오          │')
  console.log('  │   · Step 3·4 는 «대상 → myinfo» 순서를 지키십시오             │')
  console.log('  │   · kind 를 화면에 붙박이로 적지 마십시오                     │')
  console.log('  └────────────────────────────────────────────────────────────┘')
  process.exit(1)
}
