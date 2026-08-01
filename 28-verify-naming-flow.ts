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
  // ★2026-08-01 (43부 9차) — 본체가 부품으로 옮겨졌습니다
  sto: 'app/manseryeok/naming/components/NamingStorageView.tsx',
  stoDoor: 'app/manseryeok/naming/diagnosis/storage/page.tsx',
  stoNaming: 'app/manseryeok/naming/naming-storage/page.tsx',
  home: 'app/home-new/page.tsx',
  rec: 'lib/saju/namingRecords.ts',
  auto: 'app/manseryeok/naming/rename/auto/page.tsx',
  hanja: 'app/manseryeok/naming/rename/hanja/page.tsx',
  hrow: 'lib/saju/hanjaRow.ts',
  rj: 'lib/saju/resourceJudge.ts',
  svc: 'app/home-new/components/ServiceSection.tsx',
  cert: 'app/manseryeok/naming/components/NamingCertificate.tsx',
  pol: 'lib/saju/namingPolicy.ts',
  pick: 'app/manseryeok/naming/components/NamePicker.tsx',
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

  // ⑧ ★總評 — 「이름이 사주를 어떻게 돕는가」까지 담는가 (43부 11차)
  //    ⚠️ 맺음말만 실으면 «왜 좋은 이름인지» 가 종이에 남지 않습니다.
  check(/yongsinLine/.test(cert) && /yongsinMeaning/.test(cert),
    `★總評에 «사주와의 만남» 을 담을 자리가 있습니다`)
  check(/cur\.commentary\?\.yongsin\?\.name/.test(nr)
     && /cur\.commentary\?\.yongsin\?\.meaning/.test(nr),
    `★AI 가 쓴 그 글을 «그대로» 싣습니다 (화면과 갈리지 않게)`)
  check(/class="cl"/.test(cert) && /class="cend"/.test(cert),
    `「이 이름은」·「맺음」 이 눈으로 갈립니다`)
  check(/\(p\.yongsinMeaning \|\| p\.conclusion\)/.test(cert),
    `⚠️ 둘 다 없으면 總評 칸을 «안 그립니다» (빈 제목만 남지 않게)`)
}

console.log('\n━━ ⑲-A ★보관함 둘을 «따로» 운영하는가 (43부 9차) ━━')
{
  const view = codeOf(S.sto)
  const door = codeOf(S.stoDoor)
  const naming = codeOf(S.stoNaming)

  // ① 주소가 «둘» 인가 — ?mode= 하나로만 가르면 뒤로가기·북마크가 섞입니다
  check(existsSync(P.stoNaming), `★작명 보관함 «전용 주소» 가 있습니다`)
  check(/forcedMode="naming"/.test(naming), `그 주소는 «언제나» 작명입니다`)
  check(/StorageMode = forcedMode/.test(view), `★전용 주소면 ?mode= 보다 «먼저» 입니다`)

  // ② ⚠️⚠️ 화면을 «복사하지» 않았는가 — 복사하면 한쪽만 고치는 날이 옵니다
  check(/NamingStorageView/.test(door) && /NamingStorageView/.test(naming),
    `★두 문이 «같은 부품» 을 씁니다`)
  check(door.split('\n').length < 40 && naming.split('\n').length < 40,
    `★두 문이 «얇습니다» (본체를 복사하지 않았습니다)`)
  check(!/listNamingRecords/.test(door) && !/listNamingRecords/.test(naming),
    `문에는 목록을 읽는 코드가 «없습니다»`)

  // ③ ⚠️ 옛 주소를 좁히지 않았는가 — 마이페이지·북마크가 아직 옵니다
  check(!/forcedMode=/.test(door),
    `★옛 주소에 갈래를 «못 박지 않았습니다» (옛 링크가 작명 기록도 볼 수 있게)`)

  // ④ 섞어 보여 주지 않는가 — 가른 뜻이 없어집니다
  check(/const showAll = false/.test(view), `★한 화면에서 «섞지» 않습니다`)
  check(/router\.push\(mode === 'naming'/.test(view),
    `★대신 «옆 보관함으로 가는 길» 을 줍니다`)
  check(/hiddenCount > 0[\s\S]{0,80}건 →/.test(view),
    `⚠️ 저쪽에 몇 건 있는지 알려 드립니다 (사라진 줄 알고 놀라시지 않게)`)

  // ⑤ 링크가 새 주소를 보는가
  check(/naming\/naming-storage/.test(S.home), `홈 [아기 작명] 이 전용 주소로 갑니다`)
  check(/naming\/naming-storage/.test(codeOf(S.nb)), `아기 작명 입구도 전용 주소로 갑니다`)
  check(/naming\/naming-storage/.test(codeOf(S.nr)), `결과 화면의 보관함 버튼도 전용 주소입니다`)
  check(!/storage\?mode=naming/.test(S.home + S.nb + S.nr),
    `★옛 ?mode=naming 링크가 남아 있지 않습니다`)
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
  check(/작명 보관함에서 보기/.test(S.nr), `★보관함으로 «가는» 버튼이 있습니다`)
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
  for (const n of ['궁합', '내이름 감정', '아기 작명']) {
    check(new RegExp(`SOLO_NAMES = \\[[^\\]]*'${n}'`).test(svc), `★「${n}」이 낱장입니다`)
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
  check(/'내 이름 풀이 및 개명'/.test(svc), `내이름 감정 — 「내 이름 풀이 및 개명」`)
  check(/'아기 이름 지어 주기'/.test(svc), `아기 작명 — 「아기 이름 지어 주기」`)
  // ⚠️ 압핀 칩·다른 화면이 쓰는 sub 도 함께 맞춰 두었는가
  check(/sub: '내 이름 풀이 및 개명'/.test(home), `★SERVICES 의 sub 도 같이 맞췄습니다`)

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
  check(/storage\?mode=diagnosis/.test(home) && /naming-storage/.test(home),
    `이름 두 카드가 «각자» 보관함으로 갑니다`)
}

console.log('\n━━ ⑲-m ★들어온 «입구» 에 따라 보관함이 갈리는가 (43부 2차) ━━')
{
  const sto = codeOf(S.sto)
  // ① 모드를 읽는가
  check(/sp\?\.get\('mode'\)/.test(sto), `?mode= 를 읽습니다`)
  check(/MODE_VIEW/.test(sto) && /diagnosis:/.test(sto) && /naming:/.test(sto),
    `★모드마다 달라지는 것을 «한 곳» 에만 적었습니다 (MODE_VIEW)`)

  // ② 제목이 갈리는가
  check(/title: '내 이름 보관함'/.test(sto) && /title: '작명 보관함'/.test(sto),
    `★제목이 갈립니다 — 「내 이름 보관함」 · 「작명 보관함」`)

  // ③ 탭이 숨는가
  check(/\{!view && records && records\.length > 0 && \(/.test(sto),
    `★모드로 들어오면 탭을 숨깁니다 (갈래가 이미 정해져 있습니다)`)

  // ④ 하단 버튼이 «하나» 인가
  check(/\(!view \|\| view\.button === '작명'\)/.test(sto)
     && /\(!view \|\| view\.button === '풀이'\)/.test(sto),
    `★버튼이 모드마다 하나씩만 뜹니다`)

  // ⑤ ⚠️ «기록이 사라진 줄» 알고 놀라시지 않는가 — 가장 중요한 자리
  check(/hiddenCount/.test(sto), `★가려진 기록이 몇 건인지 셉니다`)
  // ★9차 — 「모두 보기」 대신 «옆 보관함으로 가기» 입니다 (⑲-A 가 봅니다)
  check(/보관함으로 가기/.test(S.sto),
    `★옆 보관함으로 가는 길이 있습니다 — 길이 끊기지 않습니다`)
  // ⚠️ 거르기이지 «지우기» 가 아닙니다 — 목록 조회에 mode 가 끼면 안 됩니다
  check(!/listNamingRecords\((mode|view)/.test(sto),
    `★목록을 «불러올 때» 거르지 않습니다 (거르기는 화면에서만 — 기록은 그대로입니다)`)

  // ⑥ 건수와 목록이 어긋나지 않는가
  check(/view && !showAll \? shownRecords\.length : records\.length/.test(sto),
    `★머리의 건수가 «보이는 목록» 과 같습니다`)

  // ⑦ ⚠️ 모드가 «없을» 때는 예전 그대로여야 합니다 (옛 링크·마이페이지)
  check(/: null\)/.test(sto),
    `★mode 가 없으면 null — 탭 셋 · 버튼 둘로 «예전 그대로» 돕니다`)
  check(/useState<FilterKey>\(view \? view\.only : '전체'\)/.test(sto),
    `모드가 없으면 첫 탭이 «전체» 입니다`)
  check(/mode: StorageMode = forcedMode/.test(sto), `전용 주소면 그 갈래로 고정됩니다`)

  // ⑧ 입구가 mode 를 실어 보내는가
  check(/mode=diagnosis/.test(S.home), `홈 [내이름 감정] 이 mode=diagnosis 로 갑니다`)
  // ★9차 — 작명은 «전용 주소» 로 갈렸습니다 (위 ⑲-A 가 봅니다)
  check(/naming-storage/.test(S.home), `홈 [아기 작명] 이 작명 보관함으로 갑니다`)
  check(/naming-storage\?open=작명/.test(S.nb), `★안내 화면도 작명 보관함으로 갑니다`)
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
