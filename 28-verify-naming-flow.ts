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
// ★2026-08-02 — 성씨 표는 «정규식» 이 아니라 «값» 으로 봅니다.
//   ⚠️ 주석에 「인구수 순」이라 적혀 있어도 값이 흩어져 있으면 소용없습니다.
import { SURNAME_HANJA } from './lib/saju/surnameHanja'
// ★2026-08-02 — 사전과 추천은 «돌려서» 봅니다. 붙박이 표본이 아니라 실제 결과를 잽니다.
import { NAME_DICT } from './lib/saju/tables/nameDict'
import { recommendNames } from './lib/saju/nameRecommend'

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
  // ★2026-08-01 (43부 9차) — 본체가 부품으로 옮겨졌습니다
  sto: 'app/manseryeok/naming/components/NamingStorageView.tsx',
  stoDoor: 'app/manseryeok/naming/diagnosis/storage/page.tsx',
  stoNaming: 'app/manseryeok/naming/naming-storage/page.tsx',
  stoDiag: 'app/manseryeok/naming/diagnosis-storage/page.tsx',
  home: 'app/home-new/page.tsx',
  rec: 'lib/saju/namingRecords.ts',
  auto: 'app/manseryeok/naming/rename/auto/page.tsx',
  hanja: 'app/manseryeok/naming/rename/hanja/page.tsx',
  hrow: 'lib/saju/hanjaRow.ts',
  rj: 'lib/saju/resourceJudge.ts',
  api: 'app/api/naming/route.ts',
  svc: 'app/home-new/components/ServiceSection.tsx',
  cert: 'app/manseryeok/naming/components/NamingCertificate.tsx',
  pol: 'lib/saju/namingPolicy.ts',
  pick: 'app/manseryeok/naming/components/NamePicker.tsx',
  modal: 'app/manseryeok/components/PersonPickerModal.tsx',
  rec2: 'lib/saju/nameRecommend.ts',
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
  // ★2026-08-01 (43부 5차) — 이 검사를 «뒤집었습니다».
  //   🔴 전에는 「개명은 성씨가 붙박이」를 «요구» 했습니다.
  //      그 붙박이 때문에 개명 손님이 성씨 한자를 «고칠 길이 없었습니다».
  //      柳(9획)·劉(15획)가 다른데 불러온 것이 틀려도 그대로 갔습니다 — 수리4격이 어긋납니다.
  //   ★이제 성씨도 누를 수 있습니다. 다만 개명은 «미리 채워져» 있어 화면이 안 흔들립니다.
  check(/slotFilled\(i\)/.test(nhCode),
    `★개명은 성씨 칸이 «미리 채워져» 있습니다 (누르면 바꿀 수도 있습니다)`)
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
  //   ★2026-08-01 (43부 2차) — 홈 카드가 «작명 보관함» 으로 바뀌었습니다.
  //     안내 화면은 그 보관함 안에서 잇습니다. 검사도 한 칸 늘려 봅니다.
  check(/naming-storage/.test(S.home), `★홈 [아기 작명] 이 «작명 보관함» 으로 갑니다`)
  check(/rename\/newborn/.test(codeOf(S.sto)),
    `★안내 화면이 보관함에서 «이어져» 있습니다 (아무도 안 부르는 화면이 되지 않게)`)
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

console.log('\n━━ ⑲-J 🔴★별점 — 공용 부품 · 두 화면 통일 (43부 30차) ━━')
{
  const nr = codeOf(S.nr)
  const acc = codeOf(read('app/manseryeok/components/PerspectiveAccordion.tsx'))
  const view = codeOf(read('app/manseryeok/naming/components/NameAnalysisResultView.tsx'))
  const star = read('app/components/common/StarRating.tsx')

  // ① 공용 부품
  check(existsSync('app/components/common/StarRating.tsx'), `★공용 별점 부품이 있습니다`)
  check(/export default function StarRating/.test(star), `StarRating 을 내어 줍니다`)
  // ⚠️ 별을 «두 곳» 에서 그리면 화면마다 모양이 갈립니다
  check(/export \{ default as Stars \} from '@\/app\/components\/common\/StarRating'/.test(acc),
    `★아코디언이 «자기 별» 을 그리지 않고 공용 부품을 씁니다`)
  check(!/function Stars\(\{ s, size/.test(acc), `아코디언 안의 옛 Stars 가 없습니다`)
  check(/import PerspectiveAccordion, \{ Stars/.test(view),
    `요약 카드도 «같은 부품» 을 씁니다`)
  // ⚠️ 없는 별점을 0점으로 그리면 «아주 나쁜 이름» 으로 보입니다
  check(/if \(!s\) return null/.test(star),
    `★별점이 없으면 «빈 자리» 를 냅니다 (0점으로 그리지 않습니다)`)
  check(/없는 것과 나쁜 것은 다릅니다/.test(star), `⚠️ 그 까닭이 적혀 있습니다`)

  // ② 🔴 작명 결과가 별점을 «버리던» 자리
  check(!/stars=\{null\}/.test(nr), `★★stars={null} 이 없습니다 (별점을 버리지 않습니다)`)
  check(/stars=\{cur\.stars \?\? null\}/.test(nr), `★API 가 준 별점을 그대로 넘깁니다`)
  check(/const gotStars = \(data\.stars/.test(nr), `★API 응답에서 별점을 받습니다`)
  check(/stars\?: PerspectiveStar\[\] \| null/.test(nr), `기록 모양에 별점 자리가 있습니다`)
  // ③ 보관함에서 다시 열 때도 나오는가 — 이름이 «같아야» 합니다
  check(/_stars: t\.stars \?\? null/.test(nr) && /_overallStar/.test(nr),
    `★보관함 저장에 «_stars» 로 담습니다 (감정 화면이 그 이름으로 꺼냅니다)`)
  check(/const withStars = /.test(nr),
    `⚠️ 저장하는 자리가 둘이라 «한 함수» 로 모았습니다 (한쪽만 고치지 않게)`)
}

console.log('\n━━ ⑲-I ★화살표 · 요약 카드 · 하단 위계 (43부 27·28차) ━━')
{
  const acc = codeOf(read('app/manseryeok/components/PerspectiveAccordion.tsx'))
  const view = codeOf(read('app/manseryeok/naming/components/NameAnalysisResultView.tsx'))
  const nr = codeOf(S.nr)
  const cert = codeOf(S.cert)

  // ① 화살표 — 작아서 «누를 수 있는 줄» 인지 몰랐습니다
  check(/fontSize: '22px'/.test(acc) && /rotate\(180deg\)/.test(acc),
    `★화살표를 22px 로 키우고 «돌아가게» 했습니다 (13px → 22px)`)
  check(!/fontSize: '13px', color: gold, flexShrink: 0, transform/.test(acc),
    `옛 13px 화살표가 남아 있지 않습니다`)
  check(/padding: '6px 4px'/.test(acc), `★둘레에 «누르는 자리» 를 두었습니다`)

  // ② 요약 카드 ↔ 아코디언 연동
  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-02 — 이 검사가 «옛 차례» 를 지키고 있었습니다.
  //    대표님 지시로 三 자원 · 四 수리 로 바꾸려는데 이 줄이 막았습니다.
  //    ★코드를 되돌리지 않고 «검사를 뒤집었습니다». (교훈 [검사가 지킨다])
  //    [까닭]  한자에 담긴 기운(자원)을 보고 → 그 획수가 그리는 마디(수리)를 보고
  //            → 사주와 어떻게 만나는가로 이야기가 이어집니다.
  //  ⚠️ 아래 ②-b 가 «두 곳이 같은 차례인지» 를 함께 봅니다 — 한쪽만 못 고칩니다.
  // ══════════════════════════════════════════════════════════════
  check(/SUMMARY_KEYS = \['yinyang', 'baleum', 'jawon', 'suri', 'yongsin'\]/.test(view),
    `★요약 카드가 아코디언과 «같은 차례» 입니다 (三 자원 · 四 수리)`)
  check(!/SUMMARY_KEYS = \['yinyang', 'baleum', 'suri', 'jawon'/.test(view),
    `옛 차례(三 수리 · 四 자원)가 남아 있지 않습니다`)

  // ②-b ★★두 곳의 차례가 «정말로» 같은가 — 눈으로 맞추지 않습니다
  //   ⚠️ 번호(一二三)는 아직 «자리(index)» 로 붙습니다. 차례가 갈리면
  //      「三. 수리오행 — 한자에 담긴 본래 기운」 같은 것이 나옵니다.
  {
    const headOrder = [...acc.matchAll(/\{ key: '(\w+)', title:/g)].map(m => m[1])
    const sumOrder = (view.match(/SUMMARY_KEYS = \[([^\]]+)\]/) ?? ['', ''])[1]
      .split(',').map(s => s.trim().replace(/'/g, '')).filter(Boolean)
    check(headOrder.length === 5, `아코디언 관점이 다섯입니다 (${headOrder.length})`)
    check(headOrder.join('>') === sumOrder.join('>'),
      `★아코디언과 요약 카드의 차례가 «글자 그대로» 같습니다 (${headOrder.join('>')})`)
    check(headOrder[2] === 'jawon' && headOrder[3] === 'suri',
      `★三 = 자원오행 · 四 = 수리오행`)
  }
  check(/SUMMARY_NUMERALS/.test(view) && /一/.test(view), `一·二·三 체계로 통일했습니다`)
  check(/setFocusKey\(SUMMARY_KEYS\[i\]\)/.test(view), `줄을 누르면 그 관점을 가리킵니다`)
  check(/focusNonce/.test(view) && /focusNonce/.test(acc),
    `⚠️ 같은 줄을 두 번 눌러도 듣습니다 (nonce)`)
  check(/scrollIntoView\(\{ behavior: 'smooth'/.test(acc), `★부드럽게 미끄러져 갑니다`)
  check(/id=\{`persp-\$\{String\(h\.key\)\}`\}/.test(acc), `관점마다 닻이 있습니다`)
  check(/scrollMarginTop/.test(acc), `⚠️ 머리글에 «가려지지» 않게 여백을 두었습니다`)
  // ⚠️ 별점을 두 곳에서 그리면 모양이 갈립니다
  // ★30차 — 별점 그리기가 «공용 부품» 으로 옮겨졌습니다 (위 ⑲-J 가 봅니다)
  check(/from '@\/app\/components\/common\/StarRating'/.test(acc)
     && /import PerspectiveAccordion, \{ Stars/.test(view),
    `★별점은 «한 곳» 에서만 그립니다 (교훈 CJ)`)

  // ③ 하단 위계
  check(/A4 명품 작명서 인쇄 · PDF 저장/.test(S.cert), `★으뜸 버튼 — A4 명품 작명서`)
  check(/background: p\.disabled \? '#EDE7E0' : '#c8783c'/.test(cert),
    `★으뜸은 «채운 색» 입니다 (나머지는 테두리만)`)
  check(/✓ 보관함에 안전하게 자동 저장되었습니다/.test(S.nr),
    `★저장 안내가 «버튼이 아니라» 얌전한 한 줄입니다`)
  check(!/✓ 보관함에 저장됐어요/.test(nr), `옛 «큰 상자» 안내가 없습니다`)
  check(/display: 'flex', gap: 8, marginTop: 4, marginBottom: 10/.test(nr),
    `★버금 둘을 «나란히» 두었습니다`)
  check(/\+ 새 이름 지으러 가기/.test(S.nr) && /textDecoration: 'underline'/.test(nr),
    `★끝은 «조용한 글줄» 입니다`)
  // ⚠️ 같은 버튼이 두 번 뜨지 않는가
  check(/onOtherHanja=\{undefined\}/.test(nr),
    `⚠️ 「다른 한자 보기」가 화면에 두 번 뜨지 않습니다`)
  // ⚠️ 저장 «실패» 는 여전히 눈에 띄어야 합니다 — 그때는 눌러야 합니다
  check(/saveFailed && \(/.test(nr) && /보관함에 다시 저장하기/.test(S.nr),
    `★저장이 «실패하면» 예전처럼 도드라집니다`)
}

console.log('\n━━ ⑲-H 🔴 보관함에서 선명장을 «다시» 뽑을 수 있는가 (43부 26차) ━━')
{
  const diag = read('app/manseryeok/naming/diagnosis/page.tsx')
  const dCode = codeOf(diag)
  const rec = read('lib/saju/namingRecords.ts')

  // ① 🔴 저장이 «안 된 것이 아니라» 뽑을 길이 없었습니다
  check(/NamingCertificateButton/.test(dCode),
    `★★보관함 다시보기에 선명장 버튼이 있습니다`)
  check(/recKind && recKind !== '풀이'/.test(dCode),
    `★작명 기록에만 답니다 (풀이 기록에는 안 답니다)`)
  check(/setRecKind\(rec\.kind/.test(dCode), `기록의 갈래를 읽습니다`)

  // ② 필요한 값이 «기록에» 다 있는가 — 없으면 종이가 빕니다
  check(/result: DiagnoseResult \| null/.test(rec), `기록에 판정(4격 포함)이 담깁니다`)
  check(/commentary: NamingResultSnapshot\['commentary'\]/.test(rec),
    `기록에 풀이(요약 총평 포함)가 담깁니다`)
  check(/chars: \(NameChar \| null\)\[\]/.test(rec), `기록에 글자(획수·오행·훈)가 담깁니다`)
  check(/chongpyeong\?: string/.test(dCode) || /chongpyeong/.test(dCode),
    `★저장된 «요약 총평» 을 그대로 씁니다`)

  // ③ ⚠️ AI 를 «다시 부르지» 않는가 — 다시 부르면 돈이 나가고 글도 달라집니다
  check(/재계산·AI 재호출 없이 저장된 풀이를 그대로/.test(diag),
    `★기록을 그대로 씁니다 — AI 를 다시 부르지 않습니다`)
  check(/result\.suri\.gyeok/.test(dCode),
    `★4격도 저장된 값에서 꺼냅니다 (다시 재지 않습니다)`)

  // ④ 배지 규칙이 결과 화면과 «같은가»
  check(/\['self', '본인', '나'\]/.test(dCode),
    `⚠️ 「나 작명」이 되지 않게 막았습니다 (결과 화면과 같은 규칙)`)
}

console.log('\n━━ ⑲-G 🔴 성씨는 «가문 선택» 이지 «사주 추천» 이 아니다 (43부 23차) ━━')
{
  const nh = codeOf(S.nh)
  const tbl = read('lib/saju/surnameHanja.ts')

  // ① 성씨 «전용» 데이터셋
  check(existsSync('lib/saju/surnameHanja.ts'), `성씨 전용 표가 있습니다`)
  check(/이: \['李'/.test(tbl), `★「이」에 李 가 «첫째» 로 있습니다`)
  check(/류: \['柳', '劉'\]/.test(tbl) && /정: \['鄭', '丁'/.test(tbl),
    `★같은 소리의 여러 집안이 담겨 있습니다 (류·정)`)
  check(/남궁: \['南宮'\]/.test(tbl), `복성도 있습니다`)
  // ⚠️ 획수를 여기 또 적으면 hanja 표와 갈립니다
  check(!/bookStrokes|strokes:/.test(tbl),
    `★획수를 «여기 적지 않았습니다» — hanja 표가 정본입니다 (교훈 CJ)`)
  check(/이 표를 «전부» 라고 여기지 마십시오/.test(tbl),
    `⚠️ 이 표가 전부가 아님을 적어 두었습니다`)

  // ★2026-08-01 (43부 24차) — 표 «자체» 를 잽니다
  {
    const rows = [...tbl.matchAll(/^\s{2}([가-힣]+): \[([^\]]*)\],/gm)].map(m => ({
      h: m[1], v: [...m[2].matchAll(/'([^']+)'/g)].map(x => x[1]),
    }))
    const single = rows.filter(r => [...r.h].length === 1)
    const comp = rows.filter(r => [...r.h].length > 1)
    check(rows.length >= 120, `성씨 소리 ${rows.length}개 (단성 ${single.length} · 복성 ${comp.length})`)
    check(new Set(rows.map(r => r.h)).size === rows.length, `★같은 소리를 «두 번» 적지 않았습니다`)
    // ⚠️ 한 소리 안에 같은 한자가 두 번 있으면 화면에 두 번 뜹니다
    const dup = rows.filter(r => new Set(r.v).size !== r.v.length)
    check(dup.length === 0, `★한 소리 안에 겹치는 한자가 없습니다${dup.length ? ' — ' + dup.map(d => d.h).join(',') : ''}`)
    check(rows.every(r => r.v.length > 0), `빈 목록이 없습니다`)
    // ★복성은 한자도 «두 글자» 여야 합니다
    const badComp = comp.filter(r => r.v.some(v => [...v].length !== [...r.h].length))
    check(badComp.length === 0,
      `★복성은 한자도 글자 수가 맞습니다${badComp.length ? ' — ' + badComp.map(d => d.h).join(',') : ''}`)
    // 대표님 명단의 주요 소리가 다 들어왔는가
    for (const h of ['이', '정', '강', '조', '장', '신', '전', '류', '양', '진', '순', '어', '대'])
      check(rows.some(r => r.h === h), `「${h}」이(가) 있습니다`)
    for (const h of ['망절', '어금', '비전'])
      check(rows.some(r => r.h === h), `복성 「${h}」이(가) 있습니다`)
  }
  // ⚠️ 확인이 안 된 것을 «지레 넣지» 않았는가
  // ★2026-08-01 (43부 25차) — 대표님 확인으로 «제외 확정» 되었습니다
  check(/넣지 않기로 확정» 되었습니다\. 되돌리지 마십시오/.test(tbl),
    `★제외 다섯이 «확정» 임을 적어 두었습니다 (다음 세션이 되돌리지 않게)`)
  check(/126개 소리 \/ 186개 한자 세트로 대표 성씨 데이터셋을 확정/.test(tbl),
    `★대표님 확정 문구가 코드에 남아 있습니다`)
  check(!/'刑'/.test(tbl) && !/도: \[[^\]]*'鄭'/.test(tbl),
    `★소리가 어긋나는 한자(刑·鄭)를 넣지 않았습니다`)

  // ② 🔴 성씨 칸에서 «거르지 않는가» — 李 가 사라지던 자리
  check(/setHanjaList\(isSurnameSlot \? rows : rows\.filter/.test(nh),
    `★★성씨 칸은 이름용 잣대(listPolicy)로 «거르지 않습니다»`)
  check(/성씨는 «고르는 것» 이 아니라 «타고나는 것»/.test(S.nh),
    `⚠️ 그 까닭이 적혀 있습니다`)
  // 대표 성씨를 앞으로
  check(/surnameRank\(h, rowHanja\(a\.row\)\)/.test(nh),
    `★대표 성씨 한자를 «앞 묶음» 으로 냅니다`)
  check(/대표 성씨 한자 \{recommend\.length\}개/.test(S.nh),
    `머리글도 「대표 성씨 한자」로 갈립니다`)
  // ⚠️ 표에 없는 성씨도 막지 않아야 합니다
  check(/known\.length === 0 && surnameHanjaOf\(h\)\.length === 0/.test(nh),
    `⚠️ 표에 없는 성씨(드문 집안·귀화)도 앞에 냅니다`)
  // ⚠️ 성씨 칸에 «용신 경고» 를 띄우면 안 됩니다
  check(/slots\[activeIdx\]\?\.role !== '성' && \(/.test(nh),
    `★성씨 칸에는 «용신에 안 맞는다» 는 경고를 띄우지 않습니다`)

  // ③ ★Step 0 — 성씨가 «먼저»
  check(/const surnameHole = slots\.findIndex/.test(nh),
    `★성씨를 비워 둔 채 이름 한자로 넘어가지 «못합니다»`)
  check(/성씨 획수가 정해져야 수리 4격이 «제대로» 나옵니다/.test(S.nh),
    `⚠️ 왜 성씨가 먼저인지 적혀 있습니다`)
}

console.log('\n━━ ⑲-F 🔴 점수 널뛰기 · 추천이 나무라는 한자 (43부 21차) ━━')
{
  const nh = codeOf(S.nh)
  const pick = codeOf(S.pick)

  // ① 🔴 「사주(용신 X)에 맞는 추천」에 엉뚱한 한자가 섞이던 것
  //    용신에 맞는 것이 «없으면» 전체를 그대로 추천 자리에 내놓았습니다.
  check(!/fitSorted\.length > 0 \? fitSorted : sorted/.test(nh),
    `★용신에 맞는 것이 없으면 «권하지 않습니다» (전체를 들이밀지 않습니다)`)
  check(/s\.verdict\.warnings\.length === 0/.test(nh),
    `★★확정 팝업이 «나무랄» 한자는 추천하지 않습니다`)
  check(/!s\.row\.avoid_soft/.test(nh) && /softPenalty === 0/.test(nh),
    `★「주의」 한자도 추천에서 뺍니다`)
  check(/그 외\S*에는 그대로 둡니다/.test(S.nh),
    `⚠️ 「그 외」에는 남깁니다 — 집안 한자가 거기 있을 수 있습니다`)
  // ⚠️ 추천이 비면 «까닭» 을 알려야 합니다
  check(/recommend\.length === 0 && others\.length > 0/.test(nh),
    `★추천이 비면 «왜» 인지 알려 드립니다`)

  // ② 🔴 「98점 → 70점」 널뛰기
  // ★2026-08-01 (43부 22차 대표님 확정) — 「소리 98점」 / 「종합 성명학 점수 70점」
  check(/소리 \{Math\.round\(c\.score\)\}점/.test(pick),
    `★Step 2 — 「소리 N점」 (무엇을 잰 것인지 이름표를 답니다)`)
  check(/다음 걸음\(한자 고르기\)에서 최종 완성됩니다/.test(S.pick),
    `★목록 머리에 「한자 고르기에서 최종 완성됩니다」`)
  check(/종합 성명학 점수<\/span>/.test(S.nh),
    `★Step 3 — 「종합 성명학 점수」 (이름이 다르니 «다른 것» 임이 드러납니다)`)
  check(!/사주와의 어울림<\/span>/.test(S.nh),
    `옛 이름표가 남아 있지 않습니다`)
  // ⓐ 용신에 맞는 한자가 없을 때 «경고» 로 알립니다
  check(/이 소리에는 사주가 바라는 기운의 한자가 없어요/.test(S.nh),
    `★ⓐ 용신에 안 맞으면 «경고» 로 표기합니다`)
  check(/다른 글자가 \{yongsin\} 기운을 담고 있으면 괜찮습니다/.test(S.nh),
    `⚠️ 겁주지 않습니다 — 다른 글자로 채우면 된다고 알려 드립니다`)
  check(/앞 걸음의 점수는 <b>소리<\/b>만 본 것이고/.test(S.nh),
    `★확정 팝업이 «왜 숫자가 다른지» 밝힙니다`)
}

console.log('\n━━ ⑲-E ★명품작명 결과 화면 · 컷라인 (43부 20차) ━━')
{
  const nr = codeOf(S.nr)
  const pick = codeOf(S.pick)
  const view = codeOf(read('app/manseryeok/naming/components/NameAnalysisResultView.tsx'))
  const rec = codeOf(S.rec2)

  // ① 🔴 이름이 «두 번» 나오던 것
  check(!/letterSpacing: 4 \}\}>\{fullName\}/.test(nr),
    `★위쪽 «중복 이름» 이 없습니다`)
  check(!/이름 분석 \(4가지 기준\)/.test(nr),
    `★위쪽 «중복 요약표» 가 없습니다`)
  // ★2026-08-01 (43부 31차) — 요약 카드를 «껐습니다» (대표님 지시).
  //   아코디언마다 별점이 붙어 «같은 말을 두 번» 하게 됐습니다.
  check(!/summaryRows=\{rows\.map/.test(nr),
    `★★요약 카드를 끄고 아코디언 별점 하나로 모았습니다`)
  check(/summaryRows\?: \{ label: string; grade: string \}\[\]/.test(view),
    `⚠️ 부품은 남겨 두었습니다 (배선만 끊음 · 교훈 AM)`)
  check(/열쇠\(yinyang·baleum…\)를 함께 받아/.test(read('app/manseryeok/naming/components/NameAnalysisResultView.tsx')),
    `★되살릴 때 «열쇠로 이으라» 고 적어 두었습니다 (자리로 이으면 어긋납니다)`)
  // ★재 놓고 «안 쓰던» 값을 실제로 알려 드리는가
  check(/\{nameMismatch && \(/.test(nr),
    `★★고른 이름과 다른 이름을 그리면 «알려 드립니다» (재 놓고 안 쓰던 값)`)
  check(/방금 고르신 이름을 불러오지 못했어요/.test(S.nr),
    `⚠️ 조용히 다른 풀이를 보여 드리지 않습니다`)

  // ② 라벨 통일
  check(/subtitle="내 아이를 위한 추천 이름"/.test(nr), `★라벨이 «하나» 로 통일됐습니다`)
  check(!/아기에게 지어 드린 이름/.test(nr) && !/'새로 지은 이름'/.test(nr),
    `★옛 라벨 둘이 남아 있지 않습니다`)

  // ③ ★컷라인
  check(/premium\?: boolean/.test(rec), `엔진이 «명품 컷라인» 을 받습니다`)
  check(/c\.sound\.grade === '좋음'/.test(rec), `★발음오행 «좋음» 만 냅니다`)
  check(/if \(good\.length > 0\)/.test(rec),
    `⚠️ 걸러서 «하나도 안 남으면» 되돌립니다 (빈 화면을 내밀지 않습니다)`)
  check(/premium=\{isNewborn\}/.test(codeOf(S.nn)),
    `★신생아(명품작명)만 컷라인이 걸립니다`)
  check(/개명은 «쓰던 발음을 지키는» 자리/.test(S.nn),
    `⚠️ 개명에 걸지 않는 까닭이 적혀 있습니다`)
  // 사전 탭으로 «새어 들어오던» 길
  check(/checked && dictCheck && p\.premium && dictCheck\.grade !== '좋음'/.test(pick),
    `★사전 탭에도 컷라인이 걸립니다 (교재 사전은 성씨를 가리지 않습니다)`)

  // ★2026-08-01 (43부 29차) — 사전 탭에서 «누르면 바로» 넘어갑니다
  check(/if \(!p\.premium\) \{ p\.onPick\(n\); return \}/.test(pick),
    `★★이름을 누르면 «곧장» 한자 고르기로 갑니다 (흐름이 안 끊깁니다)`)
  check(/if \(v\.grade === '좋음'\) p\.onPick\(n\)/.test(pick),
    `★명품작명은 «좋음» 일 때만 넘어갑니다`)
  check(/if \(on\) \{ setChecked\(null\); return \}/.test(pick),
    `이미 고른 이름을 다시 누르면 «끕니다» (예전 그대로)`)
  check(!/교재에 실린 이름입니다/.test(S.pick),
    `★맨 아래 안내 문구를 걷어냈습니다`)
  check(!/이 이름으로 한자 고르러 가기/.test(S.pick),
    `⚠️ 「이 이름으로」 버튼이 «남아 겹치지» 않습니다 (누르면 바로 가므로)`)
  check(/명품작명은 <b>좋음<\/b>인 이름만/.test(S.pick),
    `⚠️ 막되 «왜» 인지 알려 드립니다 (그냥 안 눌리면 고장으로 보입니다)`)
  // ⚠️ 지킬 수 없는 약속을 하지 않았는가
  check(/여기서 걸 수 있는 것은 «발음오행뿐»/.test(S.rec2),
    `★자원오행·수리는 «한자를 고른 뒤» 정해진다고 적어 두었습니다`)
}

console.log('\n━━ ⑲-D ★서비스 이름 개편 · 압핀 지키기 (43부 13차) ━━')
{
  const home = codeOf(S.home)
  const svc = codeOf(S.svc)

  // ① 새 이름 · 새 설명
  check(/name: '내 이름 정밀분석'/.test(home), `「내 이름 정밀분석」 입니다`)
  check(/name: '내 아이 명품작명'/.test(home), `「내 아이 명품작명」 입니다`)
  check(/sub: '내 이름의 가치와 사주 밸런스 진단'/.test(home), `설명 한 줄이 맞습니다`)
  check(/sub: '사주에 꼭 맞는 첫 이름 선물'/.test(home), `설명 한 줄이 맞습니다`)
  check(!/name: '내이름 감정'/.test(home) && !/name: '아기 작명'/.test(home),
    `옛 이름이 SERVICES 에 남아 있지 않습니다`)

  // ② 폴더로 묶였는가 — 「특화 목적 & 타이밍」과 «같은 모양»
  check(/title: '개명 & 작명하기'/.test(svc), `★[개명 & 작명하기] 폴더가 있습니다`)
  check(/desc: '내 이름 분석부터 아기 명품작명까지'/.test(svc), `폴더 설명이 맞습니다`)
  check(/names: \['내 이름 정밀분석', '내 아이 명품작명'\]/.test(svc),
    `★둘이 그 폴더 «안» 에 있습니다`)
  check(/SOLO_NAMES = \['궁합'\]/.test(svc),
    `★낱장에서 빠졌습니다 (궁합만 홀로 남습니다)`)
  // ⚠️ 낱장과 폴더에 «겹쳐» 적으면 같은 카드가 두 번 뜹니다
  check(!/SOLO_NAMES = \[[^\]]*정밀분석/.test(svc), `낱장과 폴더에 겹쳐 있지 않습니다`)

  // ③ ⚠️⚠️ 압핀 — 이름을 바꾸면 회원이 고정해 둔 것이 «말없이» 사라집니다
  check(/const SERVICE_RENAMED/.test(home), `★옛 이름 → 새 이름 지도가 있습니다`)
  check(/'내이름 감정': '내 이름 정밀분석'/.test(home)
     && /'아기 작명': '내 아이 명품작명'/.test(home),
    `★이번에 바꾼 둘이 지도에 있습니다`)
  check(/SERVICE_RENAMED\[n\] \?\? n/.test(home),
    `★압핀을 «갈아 끼웁니다» (없어진 서비스로 보고 지우지 않습니다)`)
  check(/지우지 마십시오/.test(S.home),
    `⚠️ 지도를 지우지 말라고 적어 두었습니다 (옛 핀이 아직 남아 있습니다)`)

  // ④ 화면 머리글까지 맞췄는가 — 홈만 바꾸면 «다른 서비스로 왔나» 헷갈립니다
  const sto = codeOf(S.sto)
  check(/title: '내 이름 정밀분석'/.test(sto) && /title: '내 아이 명품작명'/.test(sto),
    `★보관함 두 곳의 머리글이 새 이름입니다`)
  check(/내 아이 명품작명<\/span>/.test(codeOf(S.nb)), `아기 작명 입구 머리글도 새 이름입니다`)
  check(/'내 아이 명품작명' : '발음 그대로/.test(codeOf(S.nn)), `Step 2 머리글도 새 이름입니다`)
  check(/title="내 이름 정밀분석"/.test(read('app/manseryeok/naming/diagnosis/page.tsx')),
    `이름 풀이 화면 머리글도 새 이름입니다`)
}

console.log('\n━━ ⑲-C 🔴 같은 사람에게 «여러 번» 지을 수 있는가 (43부 12차) ━━')
{
  const modal = codeOf(S.modal)
  // 🔴 생년월일·시·성별이 같으면 저장을 막고 «화면이 멈췄습니다».
  //    작명은 같은 아이에게 이름을 여러 번 지어 봅니다. 막으면 안 됩니다.
  check(/if \(res\.reason === 'duplicate'\) \{\s*\n\s*onPick\(res\.existing\)/.test(modal),
    `★이미 있는 사람이면 «그 사람으로 넘어갑니다» (막지 않습니다)`)
  check(!/'add'[\s\S]{0,400}duplicate'\) setFormErr/.test(modal),
    `★새 사람 추가에서 「이미 있어요」로 «멈추지» 않습니다`)
  // ⚠️ 그렇다고 같은 사람을 «쌓지도» 않아야 합니다
  check(/만들면 같은 사람이 명단에 쌓입니다/.test(S.modal),
    `⚠️ 새로 만들지 않는 까닭이 적혀 있습니다`)
  // ⚠️ 수정(edit) 은 예전 그대로 알려 드려야 합니다
  check(/'edit'[\s\S]{0,300}duplicate'\) setFormErr/.test(modal),
    `★«수정» 에서는 예전처럼 알려 드립니다 (거기선 둘로 만드는 것이 실수입니다)`)
}

console.log('\n━━ ⑲-B ★A4 선명장(撰名狀) 양식 (43부 10차) ━━')
{
  const cert = codeOf(S.cert)
  const nr = codeOf(S.nr)
  // ① 전통 양식의 뼈대
  for (const k of ['撰 名 狀', '劃　數', '音五行', '字源五行', '總 評',
                   '위와 같이 作名하여 撰名狀을 드립니다', '作名之印']) {
    check(S.cert.includes(k), `선명장에 「${k}」 가 있습니다`)
  }
  check(/乾命|坤命/.test(nr), `★남녀를 乾命·坤命 으로 적습니다`)
  check(/陰' : '陽/.test(nr), `★양력·음력을 陽·陰 으로 적습니다`)
  // ② 수리 4격
  check(/CertGyeok/.test(cert) && /gy-name/.test(cert), `元亨利貞 4격 칸이 있습니다`)
  check(/result\.suri\.gyeok/.test(nr),
    `★4격을 diagnoseName 이 낸 값으로 «그대로» 싣습니다`)
  check(!/공명격|건창격|입신격/.test(cert),
    `⚠️ 격 이름을 작명서가 «지어내지» 않습니다 (교훈 BF)`)
  // ③ 음오행 — 판정과 같은 창구
  check(/soundOhaengOf\(c\.hangul\)/.test(nr),
    `★音五行을 판정과 «같은 창구» 로 냅니다 (교훈 CJ)`)
  check(!/ㄱ|ㄴ|ㅁ/.test(cert.slice(cert.indexOf('const oh ='), cert.indexOf('const oh =') + 200)),
    `작명서가 초성표를 «따로 갖고» 있지 않습니다`)
  // ④ 없는 값을 지어내지 않는가
  check(/c\.meaning \|\| ''/.test(cert), `★훈음이 없으면 «비웁니다»`)
  check(/meaning: \(c as \{ meaning\?: string \}\)\.meaning \|\| ''/.test(nr),
    `저장된 글자에 훈음이 없어도 지어내지 않습니다`)
  // ⑤ ⚠️ 인장은 «그림이 아니라» 글자 — 인쇄 설정에서 사라지지 않게
  check(/class="seal"/.test(cert) && !/<img/.test(cert),
    `★인장을 그림 파일로 넣지 «않았습니다» (배경 그림 끄기에서 사라지지 않게)`)
  // ⑥ ⚠️ A4 «한 장» — 넘치면 증서 꼴이 안 납니다
  check(/@page \{ size: A4/.test(cert), `A4 규격입니다`)
  check(/성별은 info 가 아니라/.test(S.nr),
    `★성별을 «작명 대상» 에서 받습니다 (남의 이름에 내 성별이 찍히지 않게)`)
  // ⑦ HTML 안에 JSX 주석이 «찍혀 나오지» 않는가
  check(!/\{\/\*/.test(cert), `⚠️ HTML 문자열 안에 JSX 주석이 남아 있지 않습니다`)

  // ⑨ 🔴★元亨利貞 이 «한자로» 새겨지는가 (43부 14차)
  //    diagnoseName 의 key 는 won·hyeong·i·jeong (로마자) 입니다.
  //    그대로 넣었더니 종이에 「won格 · hyeong格」 이 찍혀 나갔습니다.
  check(/GYEOK_MARK/.test(cert) && /won: '元', hyeong: '亨', i: '利', jeong: '貞'/.test(cert),
    `★로마자 key 를 한자로 옮기는 지도가 있습니다`)
  check(/GYEOK_MARK\[g\.mark\] \?\? g\.mark/.test(cert),
    `★그 지도를 «실제로» 지나 찍습니다`)

  // ⑩ 🔴★訓(뜻)이 채워지는가 (43부 14차)
  //    저장된 글자에 뜻이 없어 「(류)」만 찍혀 나갔습니다. 한자 고르는 화면이 담습니다.
  const nh2 = codeOf(S.nh)
  check(/function firstMeaning/.test(nh2), `★한자를 고를 때 뜻을 «첫 낱말» 로 담습니다`)
  check(/meaning: firstMeaning\(r\)/.test(nh2), `고른 글자에 뜻이 실립니다`)
  check(/m\.split\(\/\[,·\]\/\)\[0\]/.test(nh2),
    `⚠️ 여러 뜻 가운데 «한 낱말» 만 새깁니다 (종이가 좁습니다)`)

  // ⑪ 🔴★總評 길이에 따라 «스스로» 줄어드는가 (43부 14차)
  //    글자 크기를 한 번 맞춰 두었더니 실제 손님 것(1.6배)이 두 장으로 갈라졌습니다.
  check(/const chongLen =/.test(cert) && /const chongSize =/.test(cert),
    `★總評 글자 수를 세어 크기를 고릅니다`)
  check(/chongLen > 900 \? 7\.6/.test(cert),
    `첫 크기를 글자 수로 어림잡습니다`)
  // 🔴★15차 — 어림만으로는 800·1100자에서 «넘쳤습니다». 브라우저가 재게 했습니다
  check(/function fitToPage/.test(cert), `★브라우저가 «재서» 한 장에 맞춥니다`)
  check(/height:279mm/.test(cert) && /ruler\.offsetHeight/.test(cert),
    `⚠️ mm→px 를 «자를 만들어» 잽니다 (숫자를 박으면 기기마다 어긋납니다)`)
  check(/var minPx = 7\.2/.test(cert),
    `★7.2pt 를 «바닥» 으로 둡니다 — 그보다 작으면 못 읽습니다`)
  check(/const trimChong/.test(cert) && /CHONG_MAX = 1150/.test(cert),
    `★너무 길면 «글을» 줄입니다 (글자만 줄이면 5.6pt 가 됩니다)`)
  check(/lastIndexOf\('\. '\)/.test(cert),
    `⚠️ 문장 «가운데» 를 자르지 않습니다 — 마침표에서 끊습니다`)
  check(/자세한 풀이는 앱에서 이어집니다/.test(S.cert),
    `★잘렸다는 것을 «숨기지 않습니다»`)

  // ⑫ ★★프롬프트 상한 ↔ 종이 그릇 — «두 숫자가 갈라지면» 안 됩니다 (43부 16차)
  //    글을 «쓰는 쪽»(프롬프트)과 «담는 쪽»(종이)이 서로 다른 파일에 있습니다.
  //    ⚠️ 한쪽만 고치는 날이 반드시 옵니다. 그때 조용히 문장이 잘려 나갑니다.
  //    ★그래서 두 숫자를 «맞대어» 잽니다.
  {
    const api = read(P.api)
    // ★2026-08-01 (43부 17차) — 상한은 이제 «종이용 요약(chongpyeong)» 에만 겁니다.
    //   🔴 전에는 «화면 글» 에 800자를 걸었습니다. 종이 때문이었는데,
    //      그 바람에 손님이 읽는 화면 글이 «얇아졌습니다». 대표님 지시로 걷어냈습니다.
    const m = api.match(/«(\d+)자 안쪽» 으로\. 문단을 나누지 말고/)
    check(!!m, `★프롬프트에 «요약 총평» 상한이 적혀 있습니다`)
    const promptCap = m ? Number(m[1]) : 0
    const paperCap = Number((cert.match(/CHONG_MAX = (\d+)/) ?? [])[1] ?? 0)
    check(paperCap > 0, `종이가 담는 한계(CHONG_MAX)가 있습니다`)
    check(promptCap > 0 && paperCap > promptCap,
      `★종이 그릇(${paperCap}자)이 프롬프트 상한(${promptCap}자)보다 «큽니다» — 잘릴 일이 없습니다`)
    check(paperCap - promptCap >= 200,
      `★여유가 ${paperCap - promptCap}자 있습니다 (AI 가 조금 넘겨도 안 잘립니다)`)
    // ⚠️ 프롬프트가 «왜» 그 상한을 지켜야 하는지 적혀 있어야 다음 세션이 안 지웁니다
    check(/A4 한 장짜리 종이 증서의 總評 자리/.test(api),
      `⚠️ 그 상한이 «선명장 때문» 임이 프롬프트에 적혀 있습니다`)
    // ★★화면 글에는 «상한이 없어야» 합니다 (대표님 지시)
    check(/상한을 두지 «않습니다». 넉넉히 쓰세요/.test(api),
      `★화면 글(다섯 관점·맺음말)에는 «상한이 없습니다»`)
    check(!/★conclusion 은 4~5문장. «350자 안쪽»/.test(api),
      `★맺음말의 옛 상한(350자)이 걷혔습니다`)
    check(/내용은 줄이지 말고, 그 내용들을 «요약»/.test(api),
      `⚠️ 왜 갈랐는지가 프롬프트에 적혀 있습니다`)
    // 새 필드가 «실제로» 요청되는가
    check(/"chongpyeong":/.test(api), `★JSON 스키마에 chongpyeong 이 있습니다`)
    check(/요약해 새로 쓴» 한 덩이 글/.test(api),
      `★«줄인 것» 이 아니라 «요약해 새로 쓴» 글임을 일러 둡니다`)
    check(/새로 지어내지» 마세요/.test(api),
      `⚠️ 화면에 없는 이야기를 지어내지 못하게 막았습니다`)
    // ★AI 가 상한을 넘겨도 «아무도 모르는» 일이 없게
    check(new RegExp(`CHONG_PROMPT_CAP = ${promptCap}`).test(api),
      `★서버가 그 상한(${promptCap}자)을 «같은 값» 으로 들고 있습니다`)
    check(/chongpyeong 이 비었습니다/.test(api),
      `★요약이 아예 비면 «그것도» 로그에 남깁니다 (옛 길로 갔다는 뜻입니다)`)
    check(/console\.warn\([\s\S]{0,80}總評 분량 초과/.test(api),
      `★넘치면 로그에 남깁니다 (조용히 지나가지 않습니다)`)
    // ⚠️ 서버가 «자르면» 화면 풀이까지 잘립니다
    check(!/conclusion: [\s\S]{0,40}\.slice\(0, CHONG/.test(api),
      `⚠️ 서버는 «자르지 않습니다» — 화면에는 전문이 나갑니다`)
  }

  // ⑫ ★통변 «프롬프트» 가 분량을 조절하는가 (43부 16차)
  //    ⚠️ 뒤에서 자르는 것보다 «애초에 알맞게 쓰게» 하는 것이 낫습니다.
  const api = read('app/api/naming/route.ts')
  // ★2026-08-01 (43부 17차) — 이 검사 다섯이 «옛 방식» 을 요구하고 있었습니다.
  //   🔴 화면 글에 800자 상한을 두던 때의 검사입니다.
  //      그 상한 때문에 손님이 읽는 글이 «얇아졌습니다». 대표님 지시로 갈랐습니다.
  //      → 화면 글은 «상한 없이», 종이용 요약(chongpyeong)만 450자.
  check(/450자 안쪽» 으로\. 문단을 나누지 말고/.test(api),
    `★종이용 «요약» 에만 상한이 있습니다`)
  check(/"chongpyeong":/.test(api),
    `★AI 에게 «요약 총평» 을 따로 청합니다`)
  check(/A4 한 장짜리 종이 증서의 總評 자리/.test(api),
    `★«왜» 짧아야 하는지 프롬프트에 적혀 있습니다 (그래야 AI 가 지킵니다)`)
  check(/상한을 두지 «않습니다». 넉넉히 쓰세요/.test(api),
    `★★화면 글에는 «상한이 없습니다» — 정밀분석을 줄이지 않습니다`)
  check(!/800자를 넘기지 마세요/.test(api),
    `★화면 글의 옛 상한(800자)이 걷혔습니다`)

  // ★★2026-08-01 (43부 18차) — «화면 글에 글자 수 상한이 없는지» 전수로 잽니다
  //
  //   🔴 17차에 800자는 걷었는데, yongsin 의 「name」에 «60자» 가 남아 있었습니다.
  //      그 글도 화면에 나옵니다 — 종이 사정으로 화면을 줄인 셈이었습니다.
  //   ⚠️ 「걷어냈다」고 믿지 말고 «세어» 보아야 합니다.
  //      상한은 프롬프트 여기저기에 흩어져 숨습니다.
  {
    // 「N자 안쪽」 이 적힌 자리를 «모두» 찾습니다
    //   ⚠️ 앞 90자만 보면 «어느 블록» 인지 놓칩니다 — 블록 머리부터 봅니다
    const caps = [...api.matchAll(/«?(\d+)자\s*(?:안쪽|를 넘기지)/g)].map(m => {
      const at = m.index ?? 0
      // 그 상한이 «어느 대목» 에 있는지 — 바로 위 [대괄호 제목] 을 찾습니다
      const head = api.slice(0, at).lastIndexOf('[')
      const block = api.slice(head, at).replace(/\s+/g, ' ')
      return { n: Number(m[1]), block }
    })
    // ★종이용 요약(chongpyeong) 대목에만 상한이 있어야 합니다
    const onScreen = caps.filter(c =>
      !/chongpyeong|撰名狀|종이 증서|걷어냈습니다|있었습니다/.test(c.block))
    check(onScreen.length === 0,
      `★★화면 글에 남은 글자 수 상한 «0개»${onScreen.length ? ' — ' + onScreen.map(c => `${c.n}자(${c.block.slice(0, 26)})`).join(' / ') : ''}`)
    check(caps.length > 0, `종이용 요약에는 상한이 «있습니다» (${caps.length}자리)`)
  }
  // 걷어낸 자리에 «왜» 걷었는지 남겼는가 — 다음 세션이 되돌리지 않게
  check(/종이 사정으로 화면을 줄이는» 일이었습니다/.test(api),
    `⚠️ 「종이 때문에 화면을 줄이지 말라」가 프롬프트에 적혀 있습니다`)
  check(/const cLine = trimChong\(p\.yongsinLine \?\? '', 110\)/.test(cert),
    `★길면 «종이 쪽» 이 줄입니다 (프롬프트가 아니라)`)

  // ★★2026-08-01 (43부 19차) — 문장 수가 «천장» 이 되지 않게 (대표님 지시)
  //   「이 정도의 분량은 «항상» 나와야 한다 — 선명장 조정 이전 그대로」
  //   ⚠️ 「2~4문장」처럼 «범위» 로 적으면 AI 가 «위쪽 끝» 을 천장으로 읽습니다.
  //      → 「N문장 이상」으로 적어 «바닥» 임을 못 박습니다.
  check(/아래 문장 수는 «바닥» 입니다\. «천장이 아닙니다»/.test(api),
    `★★문장 수가 «바닥» 임을 못 박았습니다`)
  check(/meaning\(어떤 의미인가\)[\s\S]{0,60}«5문장 이상»/.test(api),
    `★어떤 의미인가 — 5문장 이상`)
  check(/intro\(무엇을 보나\)[\s\S]{0,80}«3문장 이상»/.test(api),
    `★무엇을 보나 — 3문장 이상`)
  check(/conclusion[\s\S]{0,60}«5문장 이상»/.test(api), `★맺음 — 5문장 이상`)
  check(/할 말을 덜어내지» 마세요/.test(api),
    `⚠️ 문장 수를 맞추려 내용을 덜어내지 못하게 막았습니다`)
  check(/종이 때문에 화면 글을 줄이는 일은 «다시는» 없어야/.test(api),
    `★★「종이 때문에 화면을 줄이지 말라」가 못 박혀 있습니다`)
  // ⚠️ 「2~4문장」 같은 «범위» 표기가 남아 있으면 다시 천장이 됩니다
  check(!/원리를 2~4문장으로/.test(api) && !/지니는지 2~4문장으로/.test(api),
    `★옛 «범위» 표기(2~4문장)가 남아 있지 않습니다`)
  // ⚠️⚠️ 프롬프트가 생겼다고 자름막을 걷어내면 안 됩니다
  check(/CHONG_MAX = 1150/.test(cert),
    `★자름막이 «그대로» 있습니다 — AI 가 상한을 못 지킬 때가 있습니다`)
  check(/프롬프트는 «부탁» 이고, 이 값은 «약속»/.test(S.cert),
    `★둘 다 있어야 하는 까닭이 적혀 있습니다`)
  check(/AI 가 씁니다 — 이름마다 길이가 «크게» 다릅니다/.test(S.cert),
    `★「한 번 재서 맞췄으니 됐다」가 안 통하는 까닭이 적혀 있습니다`)

  // ⑧ ★總評 — 「이름이 사주를 어떻게 돕는가」까지 담는가 (43부 11차)
  //    ⚠️ 맺음말만 실으면 «왜 좋은 이름인지» 가 종이에 남지 않습니다.
  check(/yongsinLine/.test(cert) && /yongsinMeaning/.test(cert),
    `★總評에 «사주와의 만남» 을 담을 자리가 있습니다`)
  check(/cur\.commentary\?\.yongsin\?\.name/.test(nr)
     && /cur\.commentary\?\.yongsin\?\.meaning/.test(nr),
    `★AI 가 쓴 그 글을 «그대로» 싣습니다 (화면과 갈리지 않게)`)
  check(/class="cl"/.test(cert) && /class="cend"/.test(cert),
    `「이 이름은」·「맺음」 이 눈으로 갈립니다`)
  // ★15차에 «줄인 뒤» 의 값(cMean·cEnd)을 봅니다 — 변수 이름이 바뀌었습니다
  check(/\$\{\(cMean \|\| cEnd\) \?/.test(cert),
    `⚠️ 둘 다 없으면 總評 칸을 «안 그립니다» (빈 제목만 남지 않게)`)

  // ⑬ ★종이는 «요약» 을 싣습니다 — 화면 글을 잘라 붙이지 않습니다 (43부 17차)
  check(/chongpyeong\?: string/.test(cert), `선명장이 «요약 총평» 을 받습니다`)
  check(/const summary = \(p\.chongpyeong \?\? ''\)\.trim\(\)/.test(cert)
     && /summary\s*\n?\s*\? trimChong\(summary, room\)/.test(cert),
    `★요약이 있으면 «그것만» 씁니다`)
  check(/const cEnd = summary \? '' :/.test(cert),
    `★요약이 있으면 화면 맺음말을 «덧붙이지 않습니다»`)
  // ⚠️ 옛 기록에는 요약이 «없습니다». 그분들 증서도 나와야 합니다
  check(/비어 있으면 옛 길/.test(S.cert),
    `⚠️ 요약이 없으면 옛 길로 갑니다 (옛 기록도 증서가 나옵니다)`)
  check(/chongpyeong=\{\(cur\.commentary as/.test(nr),
    `결과 화면이 요약을 넘깁니다`)
}

// ★2026-08-01 (43부 33차) — ⑲-A(9차)·⑲-m(2차)을 «걷어냈습니다».
//   🔴 그 검사들은 «탭이 있고 mode 가 없을 수도 있던» 시절의 모습을 요구했습니다.
//      이제 갈래가 «언제나» 정해지고 탭이 없습니다 (대표님 지시).
//   ★그 자리는 아래 ⑲-K 가 «새 구조로» 대신 잽니다.
//   ⚠️ 옛 검사를 남기면 새 구조를 «되돌리라고 떠미는» 셈이 됩니다.
console.log('\n━━ ⑲-K ★보관함 «완전» 분리 — 탭 없음 (43부 33차) ━━')
{
  const v = codeOf(S.sto)
  // ① 전용 주소가 «둘 다»
  check(existsSync(P.stoDiag), `★이름 정밀분석 «전용 주소» 가 있습니다`)
  check(existsSync(P.stoNaming), `★내 아이 명품작명 «전용 주소» 가 있습니다`)
  check(/forcedMode="diagnosis"/.test(codeOf(S.stoDiag)), `그 주소는 «언제나» 정밀분석입니다`)
  check(/forcedMode="naming"/.test(codeOf(S.stoNaming)), `그 주소는 «언제나» 작명입니다`)

  // ② 🔴 탭이 «없는가»
  check(!/FILTERS\.map/.test(v), `★★상단 구분 탭을 걷어냈습니다`)
  check(/필터 탭을 «걷어냈습니다»/.test(S.sto), `⚠️ 왜 걷었는지 적어 두었습니다`)
  check(/const mode: Exclude<StorageMode, null> = forcedMode/.test(v),
    `★갈래가 «언제나» 정해집니다 (「전체」 없음)`)
  check(/modeParam === 'naming' \? 'naming' : 'diagnosis'/.test(v),
    `★옛 주소는 «이름 정밀분석» 입니다 (그 주소의 원래 뜻)`)

  // ③ 버튼 하나 · 옆으로 가는 길
  check(/view\.button === '작명' && \(/.test(v) && /view\.button === '풀이' && \(/.test(v),
    `★하단 버튼이 갈래마다 «하나» 입니다`)
  check(/otherLabel: '내 아이 명품작명으로 가기'/.test(v)
     && /otherLabel: '내 이름 정밀분석으로 가기'/.test(v),
    `★옆 보관함 안내가 «새 이름» 입니다`)
  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-02 — 이 검사가 «옛 모습» 을 지키고 있었습니다.
  //    대표님 지시로 「◯◯으로 가기 · N건 →」 줄을 지우려는데 여기서 막혔습니다.
  //    ★코드를 되돌리지 않고 «검사를 뒤집었습니다». (교훈 [검사가 지킨다])
  //    [까닭]  그 줄 때문에 두 보관함이 «아직 하나» 처럼 보였습니다.
  //  ⚠️ 다만 «기록이 지워지지 않는다» 는 것은 여전히 지켜야 합니다 — 아래로 옮겼습니다.
  // ══════════════════════════════════════════════════════════════
  check(!/hiddenCount > 0[\s\S]{0,80}건 →/.test(v),
    `★「◯◯으로 가기 · N건」 줄이 «없습니다» (대표님 지시)`)
  check(/listNamingRecords\(\)\.then/.test(v),
    `⚠️⚠️ 그래도 기록은 «전부» 불러옵니다 — 거르기는 화면에서만 합니다`)
  check(/거르기는 화면에서만/.test(read(P.sto)),
    `⚠️ 「지우기가 아니라 거르기」 라는 근거가 코드에 남아 있습니다`)

  // ④ ⚠️ 거르기는 «화면에서만» — 기록은 하나도 안 지웁니다
  check(!/listNamingRecords\((mode|view)/.test(v),
    `★목록을 «불러올 때» 거르지 않습니다`)
  check(/shownRecords\.length\}건/.test(v), `머리의 건수가 «보이는 목록» 과 같습니다`)
  // ⚠️ 옛 주소를 지우지 않았는가
  check(existsSync(P.stoDoor), `⚠️ 옛 주소를 «지우지 않았습니다» (북마크·마이페이지)`)
}

console.log('\n━━ ⑲-z 🔴 회차 문구 · 보관함 «온전한» 저장 (43부 8차) ━━')
{
  const nn = codeOf(S.nn)
  const nr = codeOf(S.nr)
  const nh = codeOf(S.nh)
  const rec = read('lib/saju/namingRecords.ts')

  // 🔴 6차에 newname 을 «빠뜨려» 결제 팝업이 여전히 「3개의 이름을」이라 했습니다
  check(/clampTryLimit/.test(nn), `★Step 2 도 «정책을 지나» 한도를 받습니다`)
  check(/isSingleName \? \([\s\S]{0,120}이름 하나<\/b>/.test(nn),
    `★결제 팝업이 «개수를 부풀리지» 않습니다`)
  check(!/typeof data\.value === 'number'\) setTryLimit\(data\.value\)/.test(nn),
    `관리자 설정도 정책을 지납니다`)
  // 회차를 말하는 자리가 모두 갈래로 막혔는가
  check(/isSingleName\s*\n?\s*\? <>✨ 이 이름 자세히 풀이 보기<\/>/.test(nr),
    `★풀이 버튼이 «남은 N회» 를 말하지 않습니다`)
  check(/\{alreadyTried && !isSingleName/.test(nh),
    `★확정 팝업도 «횟수» 를 말하지 않습니다`)

  // 🔴 보관함에 «일부만» 담기던 것 — 풀이가 오기 전에 저장하고 다시 안 했습니다
  check(/export async function updateNamingRecordResult/.test(rec),
    `★이미 저장한 줄에 풀이를 «갈아 끼우는» 창구가 있습니다`)
  check(/\.update\(\{ result_data: snapshot \}\)[\s\S]{0,80}\.eq\('user_id', uid\)/.test(rec),
    `⚠️ 남의 기록을 고치지 못하게 user_id 를 함께 겁니다`)
  check(/savedNamesRef = useRef<Map<string, boolean>>/.test(nr),
    `★«통변까지 담겼는지» 를 함께 기억합니다`)
  check(/cur\?\.commentary\?\.yinyang\?\.meaning\]/.test(nr),
    `★풀이가 «도착했을 때» 저장이 다시 돕니다`)
  check(/updateNamingRecordResult\(rowId/.test(nr),
    `★다시 insert 하지 않고 «갈아 끼웁니다» (같은 이름이 두 건 쌓이지 않게)`)
  check(/savedIdRef/.test(nr), `갈아 끼울 줄의 id 를 기억합니다`)
}

console.log('\n━━ ⑲-v 🔴 «방금 고른 이름» 이 결과에 나오는가 (43부 7차) ━━')
{
  const nh = codeOf(S.nh)
  const nr = codeOf(S.nr)
  // 🔴 6차에 한도를 1 로 내리면서 «두 번째 이름부터» 막혀
  //    새 이름이 저장되지 않고 «지난번 이름» 결과가 나왔습니다.
  check(/if \(isSingleName\) \{[\s\S]{0,200}tries = \[\{ name: hangulName/.test(nh),
    `★한 개 정책이면 «새 이름으로 갈아 끼웁니다» — 막지 않습니다`)
  check(!/isSingleName[\s\S]{0,80}이번 조회는 이름 하나까지/.test(nh),
    `★「하나까지예요」로 «막고 넘어가는» 갈래가 없습니다`)
  // ★URL 이 「내가 고른 한자」를 실어 옵니다
  check(/q\.set\('pickedHanja'/.test(nh), `앞 화면이 «고른 한자» 를 URL 에 싣습니다`)
  check(/gotoResult\(\{ hangul: hangulName, hanja: hanjaKey \}\)/.test(nh),
    `확정 버튼이 그 이름을 넘깁니다`)
  check(/const pickedHanja = \(sp\?\.get\('pickedHanja'\)/.test(nr),
    `★결과 화면이 URL 의 이름을 읽습니다`)
  check(/const cur = curByUrl \?\?/.test(nr),
    `★URL 이 말하는 이름을 «먼저» 그립니다 (없으면 옛 길)`)
  // ⚠️ 보관함 저장은 cur 을 따라갑니다 — cur 이 옳아야 저장도 옳습니다
  check(/chars: cur\.chars/.test(nr), `보관함에 «지금 그리는» 이름을 저장합니다`)
}

console.log('\n━━ ⑲-w 🔴 자리를 고르면 «섞이지» 않는가 (43부 7차) ━━')
{
  const rec = codeOf(S.rec2)
  // 🔴 6차에는 앞줄 세우기만 해 「민 가운데」에 최은도·최우노가 섞였습니다
  check(/if \(preferPos && prefer\.length > 0\) \{[\s\S]{0,160}out\.filter\(\(c\) => c\.preferHit\)/.test(rec),
    `★자리를 고르시면 «거릅니다»`)
  // ⚠️ out 을 자기 자신으로 갈아 끼우면 목록이 통째로 비어 버립니다
  check(/const filtered = out\.filter/.test(rec) && /out\.length = 0/.test(rec),
    `거를 때만 손댑니다 (같은 배열을 자기 자신으로 비우지 않습니다)`)
  check(/걸러야 할 때만 손댑니다/.test(S.rec2),
    `★그 함정을 코드에 적어 두었습니다`)
  // 「상관없음」은 예전 그대로
  check(/if \(!preferPos\) return prefer\.some/.test(rec),
    `★「상관없음」이면 거르지 않습니다`)
}

console.log('\n━━ ⑲-x ★배지가 «진입 경로» 를 따르는가 (43부 7차) ━━')
{
  const nr = codeOf(S.nr)
  check(/const badgeKind =/.test(nr), `배지 말을 따로 정합니다`)
  check(/namingKind === '신생아' && rel/.test(nr),
    `★신생아면 «관계»(손주·자녀 …)를 배지에 씁니다`)
  check(/\['self', '본인', '나'\]/.test(nr),
    `⚠️ 「나 작명」 같은 말이 나오지 않게 막았습니다`)
  check(/badge=\{\{ kind: badgeKind \}\}/.test(nr), `그 말을 프레임에 넘깁니다`)
  const view = read('app/manseryeok/naming/components/NameAnalysisResultView.tsx')
  check(/p\.badge\.kind === '개명' \? '#8f3d0e' : '#4a7c59'/.test(view),
    `★모르는 말이 와도 색이 «빠지지» 않습니다`)
}

console.log('\n━━ ⑲-y ★배색 — 바탕에서 누런 기를 뺐는가 (43부 7차) ━━')
{
  for (const [n, src] of [['newname', S.nn], ['newhanja', S.nh], ['newresult', S.nr]] as const) {
    check(/const BG = '#F4F2EF'/.test(src), `${n} — 바탕이 «오프화이트» 입니다`)
    check(/const LINE = '#DFD9D2'/.test(src), `${n} — 테두리가 중성색입니다`)
    check(/const SUB = '#6B5B50'/.test(src), `${n} — 안내 글자가 «짙어졌습니다»`)
    check(!/const BG = '#F5E9DE'/.test(src), `${n} — 베이지 바탕이 남아 있지 않습니다`)
  }
  const pick = codeOf(S.pick)
  check(/function chipStyle\(on: boolean\)/.test(pick),
    `★고른/안 고른 버튼 모양을 «한 곳» 에서 정합니다`)
  check(/boxShadow: '0 2px 6px rgba\(200,120,60,0\.30\)'/.test(pick),
    `★고른 버튼이 «한눈에» 보입니다 (채운 금색 + 그림자)`)
  check(/const PANEL = '#F4F2EF'/.test(pick), `조건 패널도 같은 바탕을 씁니다`)
}

console.log('\n━━ ⑲-s ★한 번에 이름 «하나» — 부품은 두고 배선만 끊었는가 (43부 6차) ━━')
{
  const pol = codeOf(S.pol)
  const nr = codeOf(S.nr)
  const nh = codeOf(S.nh)
  check(existsSync(P.pol), `정책 파일이 있습니다`)
  check(/NAMES_PER_LOOKUP = 1/.test(pol), `★한 번에 «하나» 입니다`)
  // ⚠️ 스위치가 «한 곳» 이어야 합니다 — 화면마다 판단하면 한 군데가 어긋납니다
  check(/clampTryLimit/.test(nh) && /clampTryLimit/.test(nr),
    `★두 화면 모두 «정책을 지나» 한도를 받습니다`)
  check(!/typeof data\.value === 'number'\) setTryLimit\(data\.value\)/.test(nh + nr),
    `★관리자 설정 값도 정책을 지납니다 (설정으로 3개가 되살아나지 않습니다)`)
  // ★부품이 «살아 있는가» — 지운 것이 아니라 끊은 것입니다 (교훈 AM)
  check(/지금까지 지어본 이름/.test(S.nr), `★비교 칩 부품이 «그대로» 있습니다`)
  check(/!isSingleName && tries\.length > 1/.test(nr), `그 배선이 «끊겨» 있습니다`)
  check(/총 \{TRY_LIMIT\}회까지 종합 해설/.test(S.nr), `★회차 안내 부품도 남아 있습니다`)
  check(/isSingleName \? \(/.test(nr), `그 배선도 갈래로 끊겨 있습니다`)
  // ⚠️ 옛 손님의 기록을 «감추기만» 해야 합니다
  check(/keepPastTries/.test(nr), `★전에 지은 이름이 몇 개인지 셉니다`)
  check(/작명 보관함에 있어요/.test(S.nr), `★어디서 볼 수 있는지 알려 드립니다 (말없이 감추지 않습니다)`)
  // ⚠️ 손님이 화면에 갇히면 안 됩니다
  check(/새 이름 지으러 가기/.test(S.nr), `★다른 이름을 지을 길이 남아 있습니다`)
  // ★언제나 «마지막에 지은» 이름을 봅니다
  check(/visibleTries\(tries\)/.test(nr), `보여 줄 이름을 정책이 정합니다`)
  check(/isSingleName \? shownTries\[0\] : tries\[activeTry\]/.test(nr),
    `★한 개 정책이면 «마지막에 지은» 이름을 봅니다`)
}

console.log('\n━━ ⑲-t ★선호 소리를 «어느 자리에» 넣을지 (43부 6차) ━━')
{
  const rec = codeOf(S.rec2)
  const pick = codeOf(S.pick)
  check(/preferPos\?: '가운데' \| '끝' \| null/.test(rec), `엔진이 자리를 받습니다`)
  check(/const hitsPrefer =/.test(rec), `자리를 재는 창구가 하나입니다`)
  // ⚠️ 외자는 «가운데도 끝도» 아닙니다
  check(/if \(ch\.length < 2\) return false/.test(rec),
    `★외자는 자리가 없어 «맞지 않음» 입니다`)
  // ⚠️ 안 고르면 예전 그대로여야 합니다
  check(/if \(!preferPos\) return prefer\.some/.test(rec),
    `★안 고르시면 «어디든» 들어 있으면 맞습니다 (예전 그대로)`)
  check(/setPreferPos/.test(pick), `화면에 자리 고르기가 있습니다`)
  check(/preferChars\.length > 0 && \(/.test(pick),
    `★소리를 넣으셔야 자리 고르기가 뜹니다 (빈 화면에 안 띄웁니다)`)
  check(/사전에 없어요/.test(S.pick), `★그 자리에 맞는 이름이 없으면 «미리» 알려 드립니다`)
  // ⚠️ 판정이 아닙니다
  check(/차례만 바꿉니다|길흉에 넣지 않습니다/.test(S.rec2),
    `★교재 밖 취향이라 길흉에 넣지 않았습니다`)
}

console.log('\n━━ ⑲-u 🔴 배색 — 카드가 바탕에 «묻히지» 않는가 (43부 6차) ━━')
{
  // 🔴 바탕 #FDF6F0 과 카드 #fffbf7 이 거의 같은 색이라 카드 경계가 안 보였습니다
  for (const [n, src] of [['newname', S.nn], ['newhanja', S.nh], ['newresult', S.nr]] as const) {
    check(/const CARD = '#FFFFFF'/.test(src), `${n} — 카드가 «흰색» 입니다`)
    // ★7차에 중성색(#DFD9D2)으로 다시 잡았습니다 — 아래 ⑲-y 가 값을 봅니다
    check(/const LINE = '#/.test(src), `${n} — 테두리가 «보이는» 선입니다`)
    check(!/'1px solid rgba\(200,120,60,0\.10\)'/.test(src),
      `${n} — «안 보이던» 테두리가 남아 있지 않습니다`)
  }
  // 🔴 흰 바탕에 «흰 글씨» — 이름이 통째로 사라져 보였습니다
  check(!/color: on \? GOLD : '#fff' \}\}>\{t\.chars/.test(codeOf(S.nr)),
    `★비교 칩의 «흰 글씨» 가 없습니다`)
  // ⚠️ 어두운 테마 화면은 «손대면 안 됩니다» — 거기서는 흰 글씨가 맞습니다
  const dark = read('app/manseryeok/naming/rename/hanja/page.tsx')
  check(/const CARD = '#2C2C2A'/.test(dark),
    `★어두운 테마(rename/hanja)는 그대로입니다 — 거기 흰 글씨는 «맞습니다»`)
}

console.log('\n━━ ⑲-o ★성씨 한자를 «눌러서 바꿀 수» 있는가 (43부 5차) ━━')
{
  const nh = codeOf(S.nh)
  // ⚠️ 같은 「류」라도 柳(9획)·劉(15획) — 획수가 달라 수리4격이 통째로 어긋납니다
  check(!/color: '#cfcdc4' \}\}>\{surnameNow\.hanja\}/.test(nh),
    `★성씨가 «못 누르는 회색 상자» 가 아닙니다`)
  check(/const slots = useMemo\(\(\) => \[\s*\n\s*\.\.\.Array\.from\(wantSurname\)/.test(nh),
    `★성씨가 «언제나» 칸입니다`)
  // ⚠️⚠️ 칸이 있다 없다 하면 chosen 의 «번호가 밀려» 이름 한자가 성씨 자리로 갑니다
  check(!/pickSurname\s*\?\s*Array\.from\(wantSurname\)/.test(nh),
    `★칸이 «있다 없다» 하지 않습니다 (번호가 밀리면 고른 한자가 뒤섞입니다)`)
  check(/const slotFilled =/.test(nh),
    `불러온 성씨도 «찬 칸» 으로 셉니다 (개명이 예전처럼 돕니다)`)
  check(/needPick \? 0 : surLen/.test(nh),
    `★개명은 «이름 칸» 부터 시작합니다 — 성씨는 확인하고 싶을 때만 누릅니다`)
  check(/asLoaded/.test(nh), `불러온 성씨 칸은 «바꾸기» 로 흐리게 둡니다`)
}

console.log('\n━━ ⑲-p ★Step 3 → 4 «최종 확정» 완충 단계 ━━')
{
  const nh = codeOf(S.nh)
  check(/이 이름으로 확정할까요/.test(S.nh), `확정을 여쭙는 자리가 있습니다`)
  check(/previewVerdict/.test(nh), `★고른 이름의 «조화도» 를 함께 보여 줍니다`)
  // ⚠️ 판정을 여기서 다시 만들면 결과 화면과 갈립니다 (교훈 ET)
  check(/diagnoseName\(\{[\s\S]{0,400}judgeResource\(/.test(nh),
    `★같은 창구(diagnoseName·judgeResource)를 부릅니다 — 새 잣대를 만들지 않았습니다`)
  check(/previewVerdict\.verdict\.warnings/.test(nh),
    `★살펴볼 자리가 있으면 «가리지 않고» 알려 드립니다`)
  for (const k of ['발음오행', '수리 4격', '자원오행', '사주 보완']) {
    check(nh.includes(`'${k}'`), `확정 화면에 「${k}」 줄이 있습니다`)
  }
  check(/setConfirmOpen\(true\)/.test(nh) && !/proceed\(\)[\s\S]{0,120}gotoResult\(\)/.test(nh),
    `★[이 이름으로] 가 결과로 «바로» 넘어가지 않습니다`)
}

console.log('\n━━ ⑲-q ★A4 작명서 · 보관함 버튼 (Step 4) ━━')
{
  const cert = codeOf(S.cert)
  const nr = codeOf(S.nr)
  check(existsSync(P.cert), `작명서 부품이 있습니다`)
  check(/@page \{ size: A4/.test(cert), `★A4 한 장 규격입니다`)
  check(/window\.print\(\)/.test(cert), `인쇄 · PDF 저장이 됩니다`)
  // ⚠️ 팝업이 막히면 «조용히» 아무 일도 안 일어나면 안 됩니다
  check(/onBlocked/.test(cert), `★팝업이 막히면 알려 드립니다 (조용히 실패하지 않습니다)`)
  // ⚠️ 이름에 <, & 가 들어오면 문서가 깨집니다
  check(/function esc\(/.test(cert) && /replace\(\/&\/g, '&amp;'\)/.test(cert),
    `★값을 «걸러서» 꽂습니다 (이름에 <·& 가 와도 안 깨집니다)`)
  // ⚠️ 판정을 여기서 하지 않습니다
  check(!/judgeResource|diagnoseName|SCORE_BASE/.test(cert),
    `★작명서가 판정을 «다시 하지» 않습니다 — 받은 값을 그립니다 (교훈 CJ)`)
  // ⚠️ 무거운 PDF 꾸러미를 더하지 않았는지 — 의존이 늘면 package-lock 도 함께 (교훈 [의존])
  const pkg = JSON.parse(read('package.json'))
  const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies })
  check(!deps.some((d: string) => /jspdf|html2canvas|pdfmake|puppeteer/.test(d)),
    `★PDF 꾸러미를 더하지 «않았습니다» (한글 글꼴이 빠져 깨질 위험 · 교훈 [의존])`)

  // 화면에 붙었는가
  check(/NamingCertificateButton/.test(nr), `결과 화면에 작명서 버튼이 있습니다`)
  check(/disabled=\{!cur\.commentary/.test(nr),
    `★풀이 전에는 눌리지 않습니다 (맺음말이 빈 작명서가 나가지 않게)`)
  // ★28차 — 「작명 보관함」 으로 «짧게» 바뀌었습니다 (버금 줄에 나란히)
  check(/naming-storage'\)\}/.test(codeOf(S.nr)) && /작명 보관함/.test(S.nr),
    `★보관함으로 «가는» 버튼이 있습니다`)
  check(/naming-storage/.test(nr), `작명 기록이므로 «작명 보관함» 으로 갑니다`)
  // ★[내이름 감정] 과 같은 다섯 관점이 다 실리는가
  for (const k of ['음양', '발음오행', '수리 4격', '자원오행', '사주와의 만남']) {
    check(nr.includes(`'${k}'`), `작명서에 「${k}」 가 실립니다`)
  }
}

console.log('\n━━ ⑲-r 🔴 «묵은 세션» 이 배지·사주를 뒤집지 않는가 ━━')
{
  const nr = codeOf(S.nr)
  // 🔴 아기 이름을 한 번 지으면 kind=신생아 가 세션에 남습니다.
  //    나중에 개명을 옛 길로 들어오면 그 묵은 세션이 집혀 배지가 「신생아」로 굳었습니다.
  check(/묵은 세션|fromUrl/.test(S.nr), `★묵은 세션을 가려내는 자리가 있습니다`)
  check(/t\.surnameHangul\.startsWith\(surOfName\)/.test(nr),
    `★세션의 성씨가 «지금 이름» 과 다르면 버립니다`)
  check(/const fromUrl = !!sp\?\.get\('surname'\)/.test(nr),
    `URL 로 온 것은 «정본» 이라 이 검사를 건너뜁니다`)
  check(!/badge=\{\{ kind: '(개명|신생아)' \}\}/.test(nr), `배지에 붙박이가 없습니다`)
}

console.log('\n━━ ⑲-n ★홈 — 폴더를 «열지 않고» 바로 들어가는가 (43부 4차) ━━')
{
  const svc = codeOf(S.svc)
  const home = codeOf(S.home)

  // ① 셋이 «낱장» 인가
  check(/const SOLO_NAMES = \[/.test(svc), `낱장 카드 목록이 있습니다`)
  // ★2026-08-01 (43부 13차) — 이름 둘은 «폴더» 로 옮겼습니다 (위 ⑲-D 가 봅니다).
  //   ⚠️ 이 검사가 옛 배치를 «요구» 하고 있었습니다. 낱장은 이제 궁합뿐입니다.
  check(/SOLO_NAMES = \['궁합'\]/.test(svc), `★「궁합」이 낱장입니다`)
  for (const n of ['내 이름 정밀분석', '내 아이 명품작명']) {
    check(new RegExp(`names: \\[[^\\]]*'${n}'`).test(svc), `★「${n}」이 폴더 안에 있습니다`)
  }

  // ② 🔴 폴더가 «없어졌는가» — 전에는 「궁합 & 기타 (2)」 안에 묻혀 있었습니다
  check(!/title: '궁합 & 기타'/.test(svc), `★«궁합 & 기타» 폴더가 없습니다`)
  check(!/names: \['궁합', '내이름 감정'\]/.test(svc), `★그 폴더의 목록도 없습니다`)

  // ③ ⚠️ 같은 카드가 «두 번» 뜨지 않는가 — SOLO 와 GROUPS 에 겹쳐 적으면 그렇게 됩니다
  const grpNames = [...svc.matchAll(/names: \[([^\]]*)\]/g)]
    .flatMap(m => [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]))
  const soloNames = [...(svc.match(/SOLO_NAMES = \[([^\]]*)\]/) ?? [])[1]
    ?.matchAll(/'([^']+)'/g) ?? []].map(x => x[1])
  const dup = soloNames.filter(n => grpNames.includes(n))
  check(dup.length === 0,
    `★낱장과 폴더에 «겹쳐 적힌» 이름이 없습니다${dup.length ? ` — ${dup.join(', ')}` : ''}`)

  // ④ 🔴 ★「아기 작명」이 «그 밖의 서비스» 로 새지 않는가
  //    43부에 홈 카드를 되살리며 GROUPS 에 안 적어 orphans 안전망이 받고 있었습니다.
  //    ⚠️ 안전망은 «사라지는 것» 만 막습니다. «엉뚱한 자리» 는 못 막습니다.
  check(/placed = new Set<string>\(\[\.\.\.BEST_NAMES, \.\.\.SOLO_NAMES/.test(svc),
    `★낱장도 «자리를 잡은» 것으로 셉니다 (안 세면 «그 밖의 서비스» 에도 또 뜹니다)`)

  // ⑤ 낱장에는 폴더 표시(개수 배지·여닫이)가 없어야 합니다
  const soloBlock = svc.slice(svc.indexOf('{solo.map('), svc.indexOf('{groups.map('))
  check(soloBlock.length > 100, `낱장을 그리는 자리가 있습니다`)
  check(!/aria-expanded/.test(soloBlock), `★낱장에 여닫이가 없습니다 — 한 번만 누르면 들어갑니다`)
  check(!/list\.length/.test(soloBlock), `★낱장에 개수 배지가 없습니다`)
  check(/<Pin name=\{s\.name\} \/>/.test(soloBlock), `압핀은 그대로입니다 (회원 설정)`)

  // ⑥ 한 줄 문구
  check(/'두 사람의 결'/.test(svc), `궁합 — 「두 사람의 결」`)
  // ★13차 — 설명 한 줄이 새 문구로 바뀌었습니다 (⑲-D 가 값을 봅니다)
  check(/sub: '내 이름의 가치와 사주 밸런스 진단'/.test(home), `내 이름 정밀분석 — 설명 한 줄`)
  check(/sub: '사주에 꼭 맞는 첫 이름 선물'/.test(home), `내 아이 명품작명 — 설명 한 줄`)

  // ⑦ ★카드가 «하나도 사라지지 않았는가» — 자리를 옮기는 일에서 가장 무서운 것
  //    ⚠️ 홈 카드가 조용히 사라지면 그 서비스로 «가는 길이 통째로» 끊깁니다.
  //       화면에서 원인을 찾으면 못 찾습니다 (교훈 [의존]과 같은 결).
  {
    const services = [...S.home.matchAll(/\{ name: '([^']+)',\s+color:/g)].map(m => m[1])
    const best = [...((svc.match(/BEST_NAMES = \[([^\]]*)\]/) ?? [])[1] ?? '')
      .matchAll(/'([^']+)'/g)].map(x => x[1])
    const placedAll = new Set([...best, ...soloNames, ...grpNames])
    const orphan = services.filter(n => !placedAll.has(n))
    const ghost = [...placedAll].filter(n => !services.includes(n))
    check(services.length > 0, `홈 서비스 ${services.length}개를 읽었습니다`)
    check(orphan.length === 0,
      `★«그 밖의 서비스» 로 새는 카드가 없습니다${orphan.length ? ` — ${orphan.join(', ')}` : ''}`)
    check(ghost.length === 0,
      `★SERVICES 에 없는데 적어 둔 이름이 없습니다${ghost.length ? ` — ${ghost.join(', ')}` : ''}`)
    check(best.length + soloNames.length + grpNames.length === services.length,
      `★BEST(${best.length}) + 낱장(${soloNames.length}) + 폴더(${grpNames.length}) = ${services.length} — 딱 맞습니다`)
  }

  // ⑧ ⚠️ 연결(href)이 바뀌지 않았는가 — 자리를 옮긴 것이지 길을 바꾼 것이 아닙니다
  check(/couple-storage/.test(home), `궁합 연결 그대로`)
  check(/naming\/diagnosis-storage/.test(home) && /naming\/naming-storage/.test(home),
    `이름 두 카드가 «각자» 전용 보관함으로 갑니다 (43부 33차)`)
}

console.log('\n━━ ⑲-i 🔴 rename/auto 에 «가짜 데이터» 가 남아 있지 않은가 ━━')
{
  const code = codeOf(S.auto)
  // 🔴 손으로 박아 둔 이름 열 개 — 어느 손님이 와도 «오씨 이름» 이 나왔습니다
  check(!/吳娟熙|吳瑞潤|吳沇河|吳涓汐/.test(code), `★박아 놓은 이름(吳○○)이 코드에 없습니다`)
  check(!/const ALL = \[/.test(code), `★손으로 적은 후보 배열이 없습니다`)
  check(!/grade: '좋음'|grade: '보통'/.test(code), `★손으로 적은 «등급» 이 없습니다`)
  check(!/사주\(용신\)에 맞춰 지은 이름입니다/.test(code),
    `★사주를 안 보면서 «맞춰 지었다» 고 말하지 않습니다`)
  // ⚠️ 파일을 지우지는 «않았습니다» — 옛 링크가 404 가 되지 않게 (교훈 AM)
  check(existsSync(P.auto), `파일은 남아 있습니다 (옛 링크가 404 가 되지 않도록)`)
  check(/rename\/newname/.test(code), `★엔진이 있는 곳으로 보냅니다`)
  // 여기에 «또» 엔진을 붙이면 두 곳에서 갈립니다 (교훈 CJ)
  check(!/recommendNames|NAME_DICT/.test(code),
    `★추천 엔진을 여기 «다시» 붙이지 않았습니다 (Step 2 가 유일한 창구)`)
}

console.log('\n━━ ⑲-j ★두음법칙 안내가 «한자 고르는 화면» 에도 있는가 ━━')
{
  const nhCode = codeOf(S.nh)
  // 두음이 갈리는 자리는 «성씨» 입니다. 성씨 한자를 고르는 곳이 여기입니다.
  check(/dueumPairIfReal/.test(nhCode) && /dueumNotice/.test(nhCode),
    `★개명·신생아 한자 화면에 두음 안내가 있습니다 (전에는 감정 화면에만)`)
  check(/slots\[activeIdx\]\?\.role === '성'/.test(nhCode),
    `★성씨 자리에서만 봅니다 (諒은 이름 끝에서 «량» 이 맞습니다)`)
  check(/fetchHanjaReadings/.test(nhCode),
    `★그 한자가 «정말 두 음으로 실려 있을 때만» 뜹니다 (hanja 표에 물어봅니다)`)
  // ⚠️ 판정을 바꾸면 교재를 어깁니다 — 알려 주기만 해야 합니다
  check(!/setSyllables|setChosen/.test(
    nhCode.slice(nhCode.indexOf('dueumPairIfReal'), nhCode.indexOf('dueumPairIfReal') + 400)),
    `★안내가 «판정을 바꾸지» 않습니다 (교재는 표기음 그대로)`)
}

console.log('\n━━ ⑲-k ★대법원 인명용 한자 — «없는 것을 지어내지» 않는가 ━━')
{
  const hrow = codeOf(S.hrow)
  check(/court_name_use/.test(hrow), `표 칸 자리가 마련돼 있습니다`)
  check(/export function courtNameUse/.test(hrow), `읽는 창구가 있습니다`)
  // ⚠️ 지금은 «모름» 이 정상입니다. true 로 뭉개면 손님이 신고에서 되돌아옵니다
  check(/typeof row\.court_name_use === 'boolean' \? row\.court_name_use : null/.test(hrow),
    `★칸이 없으면 «모름(null)» 을 냅니다 — true 로 뭉개지 않습니다`)
  // 세 화면에 «확인 권유» 가 있는가 (판정이 아닙니다)
  for (const [n, src] of [['아기 작명 입구', S.nb], ['신생아·개명 한자', S.nh], ['개명 한자', S.hanja]] as const) {
    check(/대법원 인명용 한자/.test(src), `${n} 화면에 안내가 있습니다`)
  }
  // ⚠️ 「우리 목록이 곧 대법원 표」 라고 말하면 안 됩니다
  for (const [n, src] of [['newborn', S.nb], ['newhanja', S.nh], ['hanja', S.hanja]] as const) {
    check(!/인명용 한자입니다|인명용 한자만 보여|인명용 한자로만 골랐/.test(src),
      `${n} — 목록이 «대법원 표와 같다» 고 말하지 않습니다`)
  }
}

console.log('\n━━ ⑲-l ★자원오행 배점 — «유지» 확정이 기록돼 있는가 ━━')
{
  const rj = S.rj
  // ⚠️ 값이 바뀌지 않았는지 (20-verify 도 봅니다 — 여기서는 «기록» 을 봅니다)
  check(/export const W_FLOW = 30/.test(rj) && /export const W_YONGSIN = 40/.test(rj),
    `배점이 그대로입니다 (흐름 30 · 용신 40)`)
  check(/\[확정\] 2026-08-01 \(43부\)/.test(rj),
    `★「현행 유지」 확정이 코드에 적혀 있습니다`)
  check(/measure:resource/.test(rj),
    `★고치려는 다음 세션에게 «먼저 재라» 고 일러 둡니다`)
  check(/같은 결정/.test(rj),
    `★39부 3-1장 ①·교재 151쪽과 «같은 결정» 임이 적혀 있습니다`)
  // 하네스가 «검사가 아님» 을 지킵니다 — verify 에 들어가면 배포가 느려집니다
  const pkg = read('package.json')
  check(!/29-measure/.test(JSON.parse(pkg).scripts.verify),
    `★측정 하네스는 verify 체인에 «없습니다» (검사가 아니라 «자» 입니다)`)
  check(/measure:resource/.test(pkg), `npm run measure:resource 로 잴 수 있습니다`)
}

// ══════════════════════════════════════════════════════════════════
//  ⑳ ★2026-08-02 — 결과 화면이 «제 보관함» 으로 돌아가는가 (대표님 지시 ①)
//
//   🔴 [무엇이 있었나]  명품작명으로 들어와 결과를 본 뒤 보관함 버튼을 누르면
//     «정밀분석 보관함» 이 열렸습니다. 주소가 붙박이였습니다.
//   ★이 그물이 그 붙박이가 «다시 생기는 것» 을 막습니다.
// ══════════════════════════════════════════════════════════════════
console.log('\n━━ ⑳-a ★결과 화면 → «제» 보관함 (붙박이 금지) ━━')
{
  const rec = codeOf(S.rec)
  const diag = codeOf(read('app/manseryeok/naming/diagnosis/page.tsx'))
  const sto = codeOf(S.sto)

  // ① 규칙이 «한 곳» 에 있는가 (교훈 CJ)
  check(/export function storageBranchOfKind/.test(rec),
    `★갈래를 정하는 창구가 namingRecords 에 «하나» 있습니다`)
  check(/NAMING_STORAGE_PATH/.test(rec) && /diagnosis-storage/.test(rec) && /naming-storage/.test(rec),
    `★두 보관함 주소를 그 창구가 들고 있습니다`)
  // ⚠️ 보관함 «거르기» 와 «같은 규칙» 이어야 합니다 — 갈리면 버튼이 데려간 곳에
  //    그 기록이 없습니다
  check(/'풀이' \? 'diagnosis' : 'naming'/.test(rec),
    `★거르기와 «같은 규칙» 입니다 (풀이가 아니면 전부 작명)`)
  check(/effFilter === '풀이' \? r\.kind === '풀이' : r\.kind !== '풀이'/.test(sto),
    `⚠️ 보관함 거르기도 「풀이인가 아닌가」 그대로입니다`)

  // ② 결과 화면이 그 창구를 «쓰는가»
  check(/storageBranchOfKind/.test(diag) && /storageBranchOfParam/.test(diag),
    `★결과 화면이 기록의 kind 와 URL 을 «차례로» 봅니다`)
  check(/const storagePath = NAMING_STORAGE_PATH\[storageBranch\]/.test(diag),
    `★보관함 주소를 «갈래로» 정합니다`)

  // ③ ★붙박이가 «하나도» 남아 있지 않은가 — 이것이 이 그물의 핵심입니다
  const hardCoded = [...diag.matchAll(/router\.push\('\/manseryeok\/naming\/[a-z/-]*storage[^']*'\)/g)]
    .map(m => m[0])
  check(hardCoded.length === 0,
    `★결과 화면에 보관함 주소를 «박아 넣은» 자리가 없습니다${hardCoded.length ? ` — ${hardCoded.join(' , ')}` : ''}`)

  // ④ 보관함이 기록을 열 때 «어디서 왔는지» 를 실어 보내는가
  // ★2026-08-02 — 주소를 갈랐습니다 (대표님 지시 ①-가)
  check(/\/manseryeok\/naming\/naming-record/.test(sto),
    `★작명 기록은 «전용 주소» 로 엽니다 (naming-record)`)
  check(/\?recordId=\$\{r\.id\}&from=\$\{br\}/.test(sto),
    `★갈래도 함께 보냅니다 (기록이 오기 «전» 을 받칩니다)`)
  check(existsSync('app/manseryeok/naming/naming-record/page.tsx'),
    `★작명 기록 전용 주소의 문이 있습니다`)
  // ⚠️⚠️ 화면을 «복사하지» 않았는가 — 복사하면 한쪽만 고치는 날이 옵니다 (교훈 CJ)
  const door = read('app/manseryeok/naming/naming-record/page.tsx')
  check(/export \{ default \} from '@\/app\/manseryeok\/naming\/diagnosis\/page'/.test(door),
    `⚠️⚠️ 화면은 «한 부품» 입니다 — 주소만 둘입니다`)
  check(door.length < 4000, `⚠️ 그 문은 «얇습니다» (${door.length}자) — 판정이 들어 있지 않습니다`)
  // ★주소가 갈래를 «먼저» 정하는가 — 기록이 오기 전부터 화면이 옳게 서야 합니다
  check(/pathname\?\.includes\('\/naming-record'\) \? 'naming' : null/.test(diag),
    `★주소가 «가장 먼저» 갈래를 정합니다`)

  // ⑤ ⚠️ 옛 주소는 «살아 있되» 가리키지 않습니다 (교훈 AM)
  check(existsSync(P.stoDoor),
    `⚠️ 옛 주소(diagnosis/storage)의 문은 «그대로» 있습니다 — 북마크가 옵니다`)
  check(!/'\/manseryeok\/naming\/diagnosis\/storage'/.test(diag),
    `★다만 결과 화면이 옛 주소를 «가리키지» 않습니다`)
}

console.log('\n━━ ⑳-b ★하단 정돈 — 띠 배너 · A4 버튼 · 두 칸 ━━')
{
  const diag = codeOf(read('app/manseryeok/naming/diagnosis/page.tsx'))
  const cert = codeOf(S.cert)

  // ① 「보관함에서 불러온 기록」 띠가 «없는가» (지시 ②)
  check(!/보관함에서 불러온 기록/.test(diag),
    `★「📁 보관함에서 불러온 기록」 띠가 «완전히» 없습니다`)
  // ⚠️ 다만 «저장됐다» 는 알림은 남아야 합니다 — 그건 방금 일어난 일입니다
  check(/자동 저장되었습니다/.test(diag),
    `⚠️ 「✓ 자동 저장」 알림은 «남아» 있습니다 (한 줄로 낮췄습니다)`)
  check(/보관함에 저장하지 못했어요/.test(diag),
    `⚠️ 저장 «실패» 알림은 눈에 띄게 그대로입니다`)

  // ② A4 버튼이 «컴팩트» 한가 (지시 ③)
  const pad = (cert.match(/width: '100%', padding: '(\d+)px \d+px', borderRadius: 12/) ?? [])[1]
  check(!!pad && Number(pad) <= 11,
    `★A4 버튼 여백이 컴팩트합니다 (${pad ?? '?'}px ≤ 11)`)
  check(/fontSize: 13\.5, fontWeight: 600/.test(cert),
    `★글자도 함께 낮췄습니다 (15/700 → 13.5/600)`)
  check(!/width: '100%', padding: 16, borderRadius: 14/.test(cert),
    `옛 «으뜸» 크기(16px 여백)가 남아 있지 않습니다`)
  // ⚠️ 크기는 낮추되 «채운 색» 은 남깁니다 — 이것만 색이 차 있어야 켜가 갈립니다
  check(/background: p\.disabled \? '#EDE7E0' : '#c8783c'/.test(cert),
    `⚠️ 채운 색은 그대로입니다 (크기로 낮추고 색으로 남깁니다)`)

  // ③ 맨 하단이 «한 줄 두 칸» 인가 (지시 ④)
  check(/gridTemplateColumns: '1fr 1fr'/.test(diag),
    `★맨 하단 두 버튼이 «한 줄 두 칸» 입니다 (50:50)`)
  check(/📜 \{storageLabel\}/.test(diag),
    `★보관함 버튼 «이름» 도 갈래를 따릅니다`)
  check(/storageBranch === 'naming' \? '새 이름 지어보기' : '다른 이름 풀어보기'/.test(diag),
    `★왼쪽 버튼도 갈래를 따릅니다 (작명 기록에 «풀이 입력» 을 내밀지 않습니다)`)
}

console.log('\n━━ ⑳-c 🔴 「사주 불러오는 중…」 이 «끝나는가» ━━')
{
  const hook = read('hooks/useResultSaju.ts')
  // 🔴 생년월일이 없으면 그냥 나가 버려 converting 이 영영 true 였습니다
  check(/if \(!yearParam \|\| !monthParam \|\| !dayParam\) \{ setConverting\(false\); return \}/.test(hook),
    `★불러올 것이 없으면 «곧바로 끝났다» 고 알립니다`)
  check(!/if \(!yearParam \|\| !monthParam \|\| !dayParam\) return\n/.test(hook),
    `옛 «그냥 나가기» 가 남아 있지 않습니다`)
  check(/finally \{[\s\S]{0,60}setConverting\(false\)/.test(hook),
    `⚠️ 실패해도 끝냅니다 (finally)`)
  // ⚠️ 이 훅은 여러 화면이 나눠 씁니다 — «끝났다» 가 늦으면 전부 멈춥니다
  const users = ['app/manseryeok/naming/diagnosis/page.tsx',
    'app/manseryeok/naming/rename/newhanja/page.tsx',
    'app/manseryeok/result-new/page.tsx']
  for (const u of users) {
    check(/useResultSaju/.test(read(u)), `⚠️ ${u.split('/').slice(-2).join('/')} 가 이 훅을 씁니다`)
  }
}

// ══════════════════════════════════════════════════════════════════
//  ㉑ ★2026-08-02 — 성씨 한자를 고르는 창구가 «셋» 이다 (대표님 지적)
//
//   🔴 [무엇이 있었나]  43부 23차에 「李가 안 보인다」를 잡고 전용 표를 만들었는데,
//     그 표를 «작명 두 화면» 에만 이었습니다. 창구는 셋인데 둘만 고쳤습니다.
//     → 「내 이름 정밀분석」에서 '이' 를 누르면 李가 «이름에 잘 쓰지 않는 글자»
//       흐린 칸에 밀려 있었습니다.
//   ★이 그물은 «셋을 함께» 셉니다. 하나라도 빠지면 여기서 막힙니다.
//   ⚠️ 창구가 넷째로 늘어나면 아래 DOORS 에 «반드시» 한 줄 더하십시오.
// ══════════════════════════════════════════════════════════════════
console.log('\n━━ ㉑-a ★성씨 전용 표 — 성씨를 «고르는» 창구가 모두 지나는가 ━━')
{
  // ⚠️ 먼저 «창구가 몇인지» 를 셉니다. 목록을 손으로 적어 두면 늘어난 것을 놓칩니다.
  //    hanja 표를 직접 캐는 화면이 곧 «한자를 고르는» 화면입니다.
  const PICKERS = [
    'app/manseryeok/naming/diagnosis/page.tsx',      // 내 이름 정밀분석
    'app/manseryeok/naming/rename/newhanja/page.tsx', // 작명 Step 3
    'app/manseryeok/naming/rename/hanja/page.tsx',    // 옛 개명 — ★성씨는 «잠깁니다»
  ]
  const found = PICKERS.filter(p => /from\('hanja'\)/.test(read(p)))
  check(found.length === 3,
    `한자 표를 직접 캐는 화면이 셋입니다 (${found.length})`)

  // ★그 가운데 «성씨를» 고르는 곳은 둘입니다.
  //   ⚠️ 셋째(rename/hanja)는 「성씨는 개명 대상이 아니다」 가 대표님 확정이라
  //      성씨 칸을 아예 안 엽니다. 그래서 표가 필요 없습니다.
  const SURNAME_DOORS: [string, string][] = [
    ['내 이름 정밀분석 (diagnosis)', 'app/manseryeok/naming/diagnosis/page.tsx'],
    ['작명 Step 3 (newhanja)', P.nh],
  ]
  for (const [label, path] of SURNAME_DOORS) {
    const src = codeOf(read(path))
    check(/from '@\/lib\/saju\/surnameHanja'/.test(src),
      `★${label} 이 성씨 전용 표를 씁니다`)
  }
  // ⚠️ 셋째가 «말없이» 성씨를 고르게 바뀌면 여기서 막힙니다
  check(/성씨는 개명 대상이 아닙니다/.test(read('app/manseryeok/naming/rename/hanja/page.tsx')),
    `⚠️ 옛 개명 화면은 성씨를 «고르지 않습니다» (근거가 코드에 적혀 있습니다)`)

  // ⚠️ 「나르는」 자리와 「고르는」 자리를 헷갈리지 마십시오 —
  //    newname 은 성씨 한자를 «받아서 넘길» 뿐입니다. 표가 필요 없습니다.
  check(/surnameHanja: surnameHanja \|\| null/.test(codeOf(S.nn)),
    `⚠️ 작명 Step 0 은 성씨 한자를 «나르기만» 합니다 (고르지 않습니다)`)

  // ⚠️ «들여오기만» 하고 안 쓰면 소용이 없습니다 — 실제로 줄 세우는지 봅니다
  const diag = codeOf(read('app/manseryeok/naming/diagnosis/page.tsx'))
  check(/surnameRank\(syl, rowHanja\(a\)\)/.test(diag),
    `★정밀분석이 성씨 «흔한 차례» 로 줄을 세웁니다`)
  check(/surnameRank/.test(codeOf(S.nh)),
    `★작명 Step 3 도 같은 잣대로 줄을 세웁니다`)
}

console.log('\n━━ ㉑-b 🔴 성씨 칸에서는 «거르지 않는가» (李가 밝은 칸에) ━━')
{
  const diag = codeOf(read('app/manseryeok/naming/diagnosis/page.tsx'))
  // ★성씨 칸이면 avoidList 가 «비어» 있어야 합니다 — 흐린 칸으로 밀지 않습니다
  check(/const avoidList = isSurnameSlot \? \[\] :/.test(diag),
    `★성씨 칸에서는 «흐린 칸» 이 아예 없습니다`)
  check(/const normalList = isSurnameSlot \? surnameSorted :/.test(diag),
    `★성씨 칸은 표가 준 것을 «그대로» 냅니다`)
  check(/const isSurnameSlot = pickerIdx === 0/.test(diag),
    `성씨 칸은 «첫 글자» 입니다`)
  // ⚠️ 이름 칸은 «예전 그대로» 걸러야 합니다 — 거기는 «고르는» 자리입니다
  check(/hanjaList\.filter\(\(r\) => isAvoidChar\(r\)\)/.test(diag),
    `⚠️ 이름 칸은 예전 그대로 거릅니다 (성씨만 예외입니다)`)
  // ⚠️ 표에 없는 한자를 «빼지» 않습니다 — 뒤로 보낼 뿐입니다
  const sh = codeOf(read('lib/saju/surnameHanja.ts'))
  check(/return i === -1 \? 999 : i/.test(sh),
    `⚠️ 표에 없는 한자는 «뒤로» 갈 뿐 사라지지 않습니다`)
}

console.log('\n━━ ㉑-c ★성씨를 고르기 «전» 에는 이름 칸이 잠기는가 ━━')
{
  const diag = codeOf(read('app/manseryeok/naming/diagnosis/page.tsx'))
  check(/const locked = i > 0 && !chars\[0\]/.test(diag),
    `★성씨가 비면 이름 칸이 잠깁니다`)
  check(/disabled=\{locked\}/.test(diag) && /opacity: locked \? 0\.4 : 1/.test(diag),
    `★잠긴 칸은 흐리고 «눌리지 않습니다»`)
  check(/먼저 <b>성씨 한자<\/b>를 골라주세요/.test(diag),
    `★잠근 «까닭» 을 말해 줍니다`)
  // ⚠️⚠️ 이미 고른 이름 글자를 «지우지 않습니다» (대표님 확정 · 가 방식)
  check(!/setChars\(\[\]\)/.test(diag) || !/locked[\s\S]{0,200}setChars\(\[\]\)/.test(diag),
    `⚠️ 잠글 때 이미 고른 이름 글자를 «지우지» 않습니다`)
  // ★성씨 칸 자신은 «언제나» 열려 있어야 합니다 — 잠그면 열 길이 없습니다
  check(/i > 0/.test(diag), `★성씨 칸(i===0)은 언제나 열려 있습니다`)
}

console.log('\n━━ ㉑-d ★성씨 표 차례 — 통계청 인구수 순인가 (대표님 확정) ━━')
{
  // ⚠️ 정규식이 아니라 «표를 직접 불러» 셉니다 — 주석이 아니라 «값» 을 봅니다
  const keys = Object.keys(SURNAME_HANJA)
  const top5 = keys.slice(0, 5).map(k => SURNAME_HANJA[k][0])
  check(top5.join('→') === '金→李→朴→崔→鄭',
    `★앞 다섯이 인구수 순입니다 (${top5.join('→')})`)
  check(keys.slice(0, 12).join(' ') === '김 이 박 최 정 강 조 윤 장 임 한 오',
    `★앞 열둘까지 인구수 순입니다`)

  // ⚠️ 한 소리 «안» 의 차례도 흔한 것이 앞이어야 합니다 — 손님 눈에 보이는 것은 이쪽입니다
  check(SURNAME_HANJA['이']?.[0] === '李', `★「이」의 첫 한자가 李 입니다 (화면 맨 위)`)
  check(SURNAME_HANJA['정']?.[0] === '鄭', `★「정」의 첫 한자가 鄭 입니다`)
  check(SURNAME_HANJA['류']?.[0] === '柳', `★「류」의 첫 한자가 柳 입니다`)

  // ★수량 — 43부 확정값이 흔들리지 않았는가
  const flat = Object.values(SURNAME_HANJA).flat()
  check(keys.length === 126, `126 소리 그대로입니다 (${keys.length})`)
  check(new Set(flat).size === 186, `고유 한자 186 그대로입니다 (${new Set(flat).size})`)
  // ⚠️ 연 수(189)가 고유 수(186)보다 큰 것은 «일부러» 입니다 — 두음법칙
  check(flat.length - new Set(flat).size === 3,
    `⚠️ 두 소리에 걸친 셋(柳·劉·羅)이 그대로입니다 — 두음법칙이라 일부러입니다`)

  // ⚠️ 43부에 «넣지 않기로 확정» 한 다섯이 되살아나지 않았는가
  check(!SURNAME_HANJA['도']?.includes('鄭'), `⚠️ 도←鄭 (오타)가 없습니다`)
  check(!SURNAME_HANJA['성']?.includes('刑'), `⚠️ 성←刑 (오타)가 없습니다`)
  check(!SURNAME_HANJA['노']?.includes('老'), `⚠️ 노←老 (확인 못 함)가 없습니다`)
  check(!SURNAME_HANJA['소']?.includes('肖'), `⚠️ 소←肖 (초로도 읽음)가 없습니다`)
}

console.log('\n━━ ㉑-e 🔴 작명 Step 3 — 성씨보다 이름 칸이 «먼저 열리지» 않는가 ━━')
{
  const nh = codeOf(S.nh)
  // 🔴 needPick 이 「아무 성씨나 불러왔는가」를 보던 자리
  check(!/const needPick = !t\?\.surnameHanja && !surnameLoaded/.test(nh),
    `★옛 잣대(surnameLoaded 날것)가 남아 있지 않습니다`)
  check(/const loadedFits = surnameLoaded && !!want && loadedSurHangul === want/.test(nh),
    `★불러온 성씨가 «이 아기의» 성씨와 같은지 봅니다`)
  check(/const needPick = !t\?\.surnameHanja && !loadedFits/.test(nh),
    `★그래야 성씨 칸에서 시작합니다`)
  // ⚠️ my_names 갈래에서도 한글을 담아야 합니다 — 안 담으면 위 잣대가 헛돕니다
  check(/loadedSurHangul = sp1\.map\(c => c\.hangul\)\.join\(''\)/.test(nh),
    `⚠️ my_names 로 불러올 때도 성씨 «한글» 을 담습니다`)
  // ★두 번째 겹 — 칸을 눌러 건너뛰지 못하게
  check(/const locked = surnameHole !== -1 && !isSur/.test(nh),
    `★성씨가 비면 이름 칸이 «잠깁니다»`)
  check(/opacity: locked \? 0\.4 : 1/.test(nh) && /cursor: locked \? 'not-allowed'/.test(nh),
    `★잠긴 칸은 «눈으로» 보입니다`)
  // ⚠️ 성씨 칸 자신은 언제나 열려 있어야 합니다
  check(/!isSur/.test(nh), `⚠️ 성씨 칸(role === '성')은 잠기지 않습니다`)
}

console.log('\n━━ ㉑-f ★「여성적」 어감이 «무색하지» 않은가 ━━')
{
  const rc = codeOf(S.rec2)
  check(/FEMININE_TAIL/.test(rc), `★끝 글자의 «결» 을 보는 묶음이 있습니다`)
  check(/export function styleTier/.test(rc), `★어감으로 «앞줄» 을 정하는 창구가 있습니다`)
  // ⚠️⚠️ «거르지» 않습니다 — 후보가 0개가 되면 안 됩니다
  check(/if \(style !== '여성적'\) return 0/.test(rc),
    `⚠️ 남성적·중성적은 «예전 그대로» 입니다`)
  check(/\(b\.styleFit - a\.styleFit\)\s*\n\s*\|\| \(b\.score - a\.score\)/.test(rc),
    `★어감이 «점수 앞» 에 섭니다 (뒤에 두면 화면에 안 드러납니다)`)
  check(/\(Number\(b\.preferHit\) - Number\(a\.preferHit\)\)/.test(rc),
    `⚠️ 「꼭 넣고 싶은 소리」는 여전히 «첫 잣대» 입니다`)
  // ★실측 — 정말로 여자 이름이 앞에 오는가 (붙박이 표본이 아니라 «돌려서» 봅니다)
  const FEM = new Set(['아','서','지','유','예','하','나','다','미','희','연','혜',
    '채','리','율','슬','화','은','수','주','영','윤','원','현','인'])
  for (const sur of ['김', '이', '박', '최']) {
    const r = recommendNames(sur, { style: '여성적', yongsin: '목' as never, limit: 8 } as never) as { name: string }[]
    const hit = r.filter(c => FEM.has(c.name[c.name.length - 1])).length
    check(hit >= 6, `★「${sur}」 여성적 8개 중 ${hit}개가 여자 이름 끝소리입니다`)
  }
  // ⚠️ 남성적·중성적이 «달라지지 않았는가»
  const m = (recommendNames('민', { style: '남성적', yongsin: '수' as never, limit: 5 } as never) as { name: string }[])
    .map(c => c.name).join(' ')
  check(m === '경복 교묵 기복 강백 경백', `⚠️ 남성적은 «예전 그대로» 입니다 (${m})`)
}

console.log('\n━━ ㉑-g ★교재 전수 대조로 바로잡은 사전 (2026-08-02) ━━')
{
  const all = Object.values(NAME_DICT).flatMap(g => [...g.names])
  const S2 = new Set(all)
  check(all.length === 1258, `이름 1,258개 (1,256 + 남혁 + 삼우)`)
  for (const n of ['강택', '국만', '병철', '이륜', '신홍', '남혁', '삼우']) {
    check(S2.has(n), `★「${n}」이 있습니다`)
  }
  for (const n of ['김택', '국민', '병칠', '이룬', '신흥']) {
    check(!S2.has(n), `⚠️ 옛 오타 「${n}」이 되살아나지 않았습니다`)
  }
  // ★차례까지 교재와 맞췄는가 — 다섯 자리
  const sk = NAME_DICT['金_ㅅ'].names
  const at = (a: string, b: string) => sk.indexOf(a) + 1 === sk.indexOf(b)
  check(at('산호', '삼우'), `★삼우가 산호 뒤입니다`)
  check(at('삼현', '삼호'), `★삼호가 삼현 뒤입니다 (교재 차례)`)
  check(at('상철', '상필') && at('상필', '상학'), `★상필·상학이 상철 뒤입니다`)
  check(at('서원', '서윤'), `★서원 → 서윤 차례입니다`)
  check(at('서창', '서필'), `★서필이 서창 뒤입니다`)
  // ⚠️ 「김택」은 성씨와 겹치던 자리입니다
  check(!all.some(n => n.startsWith('김')), `⚠️ 「김」으로 시작하는 이름이 없습니다 (김김택 방지)`)
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
