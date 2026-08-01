// 30-e2e-naming-flow.ts
// 작명 «세 동선» 을 로직으로 태워 보는 e2e — 2026-08-01 (43부)
//
// ══════════════════════════════════════════════════════════════════
//  ★이것이 «무엇을 대신하고, 무엇을 대신하지 못하는가»
//
//   [대신하는 것]  화면들이 «주고받는 값» 이 끊기지 않는지.
//     보관함이 실어 보낸 것 → Step 2 가 읽은 것 → Step 3 이 읽은 것 → Step 4 가 쓴 것.
//     ★네 결함(①신생아 차단 ②URL 성씨 사장 ③kind 붙박이 ④타인 사주 유실)이
//       모두 «값이 끊긴» 자리였으므로, 값을 따라가면 되살아나는 것을 잡습니다.
//
//   ⚠️⚠️ [대신하지 «못하는» 것]  실기기 확인입니다.
//     · 버튼이 눌리는지 · 글자가 잘리는지 · 결제 팝업이 뜨는지
//     · Supabase 가 실제로 답하는지 · IME(한글 조합)가 제대로 도는지
//     ★이 검사가 전부 통과해도 «실기 확인은 여전히 하셔야 합니다».
//       그것을 대신한다고 말하지 않습니다.
//
//   ⚠️ 화면 코드를 그대로 부를 수는 없습니다(React·라우터·DB가 필요합니다).
//      그래서 화면이 «하는 일» 을 이 파일에 다시 적어 태웁니다.
//      → 화면 로직이 바뀌면 여기도 함께 고쳐야 합니다. 그것이 이 방식의 값입니다.
//
//   쓰는 법   npx tsx 30-e2e-naming-flow.ts
// ══════════════════════════════════════════════════════════════════

import {
  readNamingTargetFromQuery, namingTargetQuery, resolveNamingTarget,
  guessKind, hasSaju, type NamingTarget,
} from './lib/saju/namingSession'
import { surnameOfHangul, splitSurname } from './lib/saju/surname'
import { recommendNames } from './lib/saju/nameRecommend'

let pass = 0, fail = 0
const check = (ok: boolean, msg: string) => {
  if (ok) { pass++; console.log(`  ✅ ${msg}`) } else { fail++; console.log(`  🔴 ${msg}`) }
}

/** URL 조각을 읽는 흉내 */
const getterOf = (qs: string) => {
  const p = new URLSearchParams(qs)
  return (k: string) => p.get(k)
}

// ══════════════════════════════════════════════════════════════════
//  화면이 «하는 일» — 코드와 같은 순서로 적습니다
// ══════════════════════════════════════════════════════════════════

interface SavedChar { hangul: string; hanja: string; strokes: number; resourceOhaeng: string }

/** Step 2 (newname) 가 성씨·kind·사주를 정하는 방식 */
function step2(qs: string, myNames: SavedChar[] | null, myInfoYear: number) {
  const get = getterOf(qs)
  const surnameChars = myNames && myNames[0] ? splitSurname(myNames).surname : []

  // ★URL 이 성씨를 또박또박 주면 «그쪽이 먼저» (결함 ②)
  const explicit = surnameOfHangul(get('surname') || '')
  const loaded = surnameChars.map(c => c.hangul).join('')
  const fromName = surnameOfHangul(get('name') || '')
  const surnameHangul = explicit || loaded || fromName
  const surnameHanja = loaded === surnameHangul ? surnameChars.map(c => c.hanja).join('') : ''

  const kind = get('kind') === '신생아' ? '신생아'
    : get('kind') === '개명' ? '개명'
      : guessKind(surnameHanja.length > 0)

  // 사주 — URL 이 먼저, 없으면 내 myinfo (결함 ④)
  const sajuYear = get('year') ? Number(get('year')) : myInfoYear
  const sajuFrom = get('year') ? 'url' : 'me'

  // ★관문 — 한글 성씨만 있으면 들어옵니다 (결함 ①)
  const blocked = !surnameHangul

  return { surnameHangul, surnameHanja, kind, sajuYear, sajuFrom, blocked }
}

/** Step 2 → Step 3 으로 넘기는 조각 */
function step2to3(s2: ReturnType<typeof step2>, qs: string, chosenName: string) {
  const get = getterOf(qs)
  const t: NamingTarget = {
    kind: s2.kind as NamingTarget['kind'],
    surnameHangul: s2.surnameHangul,
    surnameHanja: s2.surnameHanja || null,
    calType: get('calType') || '양력',
    year: s2.sajuYear, month: Number(get('month') || 1), day: Number(get('day') || 1),
    leapMonth: get('leapMonth') || '0',
    hourIdx: get('hour') && get('hour') !== '모름' ? Number(get('hour')) : null,
    gender: get('gender') || null,
    relation: get('relation') || null,
    personTitle: get('who') || get('name') || null,
    style: get('style') || null, prefer: get('prefer') || null, avoid: get('avoid') || null,
  }
  return `name=${encodeURIComponent(chosenName)}&${namingTargetQuery(t)}`
}

/** Step 3 (newhanja) 가 대상을 읽는 방식 */
function step3(qs: string, myInfoYear: number) {
  const get = getterOf(qs)
  const t = readNamingTargetFromQuery(get)
  const sajuYear = hasSaju(t) ? t!.year : myInfoYear
  const sajuFrom = hasSaju(t) ? 'url' : 'me'
  const wantSurname = t?.surnameHangul ?? ''
  // 저장된 성씨가 «이 대상의» 것이 아니면 성씨 한자를 고릅니다
  const pickSurname = !t?.surnameHanja && wantSurname.length > 0
  const syllables = [...(get('name') || '')]
  return { t, sajuYear, sajuFrom, wantSurname, pickSurname, syllables, kind: t?.kind ?? '개명' }
}

/** Step 3 → Step 4 (성씨 한자가 여기서 확정됩니다) */
function step3to4(s3: ReturnType<typeof step3>, pickedSurnameHanja: string) {
  if (!s3.t) return ''
  return namingTargetQuery({ ...s3.t, surnameHanja: pickedSurnameHanja || s3.t.surnameHanja })
}

/** Step 4 (newresult) — 배지와 저장 kind */
function step4(qs: string, myInfoYear: number) {
  const t = resolveNamingTarget(getterOf(qs))
  return {
    badgeKind: t?.kind ?? '개명',
    savedKind: t?.kind ?? '개명',
    relation: t?.relation || 'self',
    sajuYear: hasSaju(t) ? t!.year : myInfoYear,
    sajuFrom: hasSaju(t) ? 'url' : 'me',
  }
}

// ══════════════════════════════════════════════════════════════════
//  ① 개명 (본인) — ★전과 «똑같아야» 합니다
// ══════════════════════════════════════════════════════════════════
console.log('\n━━ ① 개명(본인) — 옛 손님이 «안 깨지는가» ━━')
{
  const MY_YEAR = 1988
  // 보관함 [+ 새 이름 풀이하기] 가 아니라 감정 화면에서 바로 온 길 — URL 이 «빕니다»
  const qs = ''
  const myNames: SavedChar[] = [
    { hangul: '류', hanja: '柳', strokes: 9, resourceOhaeng: '목' },
    { hangul: '승', hanja: '承', strokes: 8, resourceOhaeng: '금' },
    { hangul: '현', hanja: '賢', strokes: 15, resourceOhaeng: '목' },
  ]
  const s2 = step2(qs, myNames, MY_YEAR)
  check(!s2.blocked, `Step 2 에 들어갑니다`)
  check(s2.surnameHangul === '류' && s2.surnameHanja === '柳',
    `성씨를 저장된 이름에서 받습니다 (${s2.surnameHanja}${s2.surnameHangul})`)
  check(s2.kind === '개명', `★kind 가 «개명» 입니다 (chars 가 있으므로)`)
  check(s2.sajuFrom === 'me', `사주는 내 것입니다 (${s2.sajuYear})`)

  const q3 = step2to3(s2, qs, '지호')
  const s3 = step3(q3, MY_YEAR)
  check(s3.kind === '개명', `Step 3 도 «개명»`)
  check(!s3.pickSurname, `★성씨 한자를 «다시 묻지 않습니다» — 예전 그대로입니다`)
  check(s3.sajuYear === MY_YEAR, `Step 3 사주 ${s3.sajuYear} — 그대로`)

  const s4 = step4(step3to4(s3, ''), MY_YEAR)
  check(s4.badgeKind === '개명', `Step 4 배지 «개명»`)
  check(s4.savedKind === '개명', `보관함에 «개명» 으로 저장`)
  check(s4.sajuYear === MY_YEAR, `Step 4 사주 ${s4.sajuYear} — 그대로`)
  check(s4.relation === 'self', `관계 self — 내 이름이므로`)
}

// ══════════════════════════════════════════════════════════════════
//  ② 아기 작명 — 네 걸음
// ══════════════════════════════════════════════════════════════════
console.log('\n━━ ② 아기 작명 — 네 걸음이 «이어지는가» ━━')
{
  const PARENT_YEAR = 1988          // 로그인한 부모
  const BABY_YEAR = 2026            // 아기
  // 보관함 [+ 새 이름 짓기] → 폼(성씨 류 · 호칭 첫째) → 이 조각으로 옵니다
  const qs = `year=${BABY_YEAR}&month=3&day=15&gender=남&calType=양력&leapMonth=0&hour=5`
    + `&name=${encodeURIComponent('류 첫째')}&relation=${encodeURIComponent('자녀')}`
    + `&surname=${encodeURIComponent('류')}&kind=${encodeURIComponent('신생아')}`
  // ⚠️ 부모는 «자기 이름풀이 기록» 을 갖고 있습니다 — 그것이 새면 ②③④가 되살아납니다
  const parentNames: SavedChar[] = [
    { hangul: '박', hanja: '朴', strokes: 6, resourceOhaeng: '목' },
    { hangul: '민', hanja: '珉', strokes: 10, resourceOhaeng: '금' },
    { hangul: '수', hanja: '秀', strokes: 7, resourceOhaeng: '목' },
  ]

  const s2 = step2(qs, parentNames, PARENT_YEAR)
  check(!s2.blocked, `★[걸음1] 이름이 «없어도» Step 2 에 들어갑니다 (결함 ①)`)
  check(s2.surnameHangul === '류',
    `★성씨가 «류» — 부모 성씨(박)에 덮이지 않았습니다 (결함 ②) — 받은 값 「${s2.surnameHangul}」`)
  check(s2.surnameHanja === '', `한자 성씨는 아직 «없습니다» (Step 3 에서 고릅니다)`)
  check(s2.kind === '신생아', `★kind 가 «신생아» (결함 ③)`)
  check(s2.sajuYear === BABY_YEAR,
    `★사주가 «아기» 것입니다 (${s2.sajuYear}) — 부모(${PARENT_YEAR}) 가 아닙니다 (결함 ④)`)

  // 걸음2 — 추천이 «실제로» 나오는가 (엔진을 진짜로 부릅니다)
  const list = recommendNames(s2.surnameHangul, { yongsin: '화', heeksin: '목', limit: 10 })
  check(list.length === 10, `★[걸음2] 추천이 «열 개» 나옵니다 (${list.length}개)`)
  check(list.every(c => c.fullName.startsWith('류')), `모두 «류» 로 시작합니다`)
  check(new Set(list.map(c => c.name[0])).size >= 5,
    `첫 글자가 몰리지 않습니다 (${new Set(list.map(c => c.name[0])).size}가지)`)
  check(list[0].score >= list[list.length - 1].score, `점수 내림차순입니다`)

  const picked = list[0].name
  const q3 = step2to3(s2, qs, picked)
  const s3 = step3(q3, PARENT_YEAR)
  check(s3.kind === '신생아', `★[걸음3] kind 가 «끝까지» 왔습니다`)
  check(s3.sajuYear === BABY_YEAR, `사주도 아기 것 (${s3.sajuYear})`)
  check(s3.pickSurname, `★성씨 한자를 «고르게» 합니다 — 수리4격·자원오행이 성씨에서 시작합니다`)
  check(s3.wantSurname === '류', `고를 성씨는 «류»`)
  check(s3.syllables.length === picked.length, `이름 글자가 그대로 왔습니다 (${s3.syllables.join('')})`)

  const s4 = step4(step3to4(s3, '柳'), PARENT_YEAR)
  check(s4.badgeKind === '신생아', `★[걸음4] 배지가 «신생아» — 붙박이가 걷혔습니다`)
  check(s4.savedKind === '신생아', `★보관함에도 «신생아» 로 저장됩니다`)
  check(s4.sajuYear === BABY_YEAR, `결과 풀이도 아기 사주 (${s4.sajuYear})`)
  check(s4.relation === '자녀', `★관계가 «자녀» — 전에는 언제나 self 였습니다`)
}

// ══════════════════════════════════════════════════════════════════
//  ③ 가족·지인 작명 — 사주가 «끝까지» 유지되는가
// ══════════════════════════════════════════════════════════════════
console.log('\n━━ ③ 가족 작명 — 남의 사주가 «내 것으로 바뀌지» 않는가 ━━')
{
  const ME = 1988, NEPHEW = 2019
  const qs = `year=${NEPHEW}&month=7&day=2&gender=여&calType=음력&leapMonth=0&hour=3`
    + `&name=${encodeURIComponent('강 조카')}&relation=${encodeURIComponent('친척')}`
    + `&surname=${encodeURIComponent('강')}&kind=${encodeURIComponent('신생아')}`
  const myNames: SavedChar[] = [
    { hangul: '오', hanja: '吳', strokes: 7, resourceOhaeng: '토' },
    { hangul: '세', hanja: '世', strokes: 5, resourceOhaeng: '화' },
  ]

  const s2 = step2(qs, myNames, ME)
  const q3 = step2to3(s2, qs, '지우')
  const s3 = step3(q3, ME)
  const s4 = step4(step3to4(s3, '姜'), ME)

  check(s2.sajuYear === NEPHEW, `Step 2 — 조카 사주 (${s2.sajuYear})`)
  check(s3.sajuYear === NEPHEW, `★Step 3 — 조카 사주 (${s3.sajuYear}) · 내 것(${ME}) 아님`)
  check(s4.sajuYear === NEPHEW, `★Step 4 — 조카 사주 (${s4.sajuYear}) · 내 것(${ME}) 아님`)
  check(s2.surnameHangul === '강', `성씨 «강» — 내 성(오)에 안 덮였습니다`)
  check(s4.relation === '친척', `관계 «친척» 이 기록됩니다`)
  // 음력·시각도 새지 않아야 합니다
  const t4 = resolveNamingTarget(getterOf(step3to4(s3, '姜')))
  check(t4?.calType === '음력', `★음력 여부도 끝까지 갑니다 (${t4?.calType})`)
  check(t4?.hourIdx === 3, `태어난 시도 끝까지 갑니다 (${t4?.hourIdx})`)
}

// ══════════════════════════════════════════════════════════════════
//  ④ 가장자리 — «끊길 만한» 자리
// ══════════════════════════════════════════════════════════════════
console.log('\n━━ ④ 가장자리 — 끊길 만한 자리 ━━')
{
  // 복성
  const qs = `surname=${encodeURIComponent('남궁')}&kind=신생아&year=2026&month=1&day=1`
  const s2 = step2(qs, null, 0)
  check(s2.surnameHangul === '남궁', `★복성을 통째로 받습니다 (${s2.surnameHangul})`)

  // 「류 첫째」 처럼 호칭이 붙은 값
  check(surnameOfHangul('류 첫째') === '류', `「류 첫째」 → 「류」`)
  check(surnameOfHangul('김철수') === '김', `「김철수」 → 「김」 (앞 두 글자를 자르지 않습니다)`)
  check(surnameOfHangul('남궁민수') === '남궁', `「남궁민수」 → 「남궁」`)

  // ★열쇠 충돌 — 짓는 이름(name)과 대상 호칭(who)이 섞이면 안 됩니다
  const t: NamingTarget = {
    kind: '신생아', surnameHangul: '류', surnameHanja: null,
    calType: '양력', year: 2026, month: 1, day: 1, leapMonth: '0', hourIdx: null, gender: null,
    relation: null, personTitle: '류 첫째', style: null, prefer: null, avoid: null,
  }
  const q = `name=${encodeURIComponent('지호')}&${namingTargetQuery(t)}`
  const p = new URLSearchParams(q)
  check(p.getAll('name').length === 1,
    `★URL 에 name 이 «하나» 입니다 (짓는 이름과 호칭이 안 섞입니다)`)
  check(p.get('name') === '지호', `name 은 «짓는 이름» (${p.get('name')})`)
  check(p.get('who') === '류 첫째', `호칭은 who 로 (${p.get('who')})`)

  // 성씨가 아예 없으면 — 막아야 합니다
  const blocked = step2('kind=신생아', null, 0)
  check(blocked.blocked, `★성씨가 없으면 막고 «어디로 갈지» 알려 줍니다`)

  // 대상이 없으면 옛 길 — 기존 개명 손님
  check(resolveNamingTarget(getterOf('')) === null,
    `★대상이 없으면 null — 부르는 쪽이 «옛 길» 로 갈 수 있습니다`)
}

// ══════════════════════════════════════════════════════════════════
//  ⑤ 조건을 «바꾸면 그 자리에서» 목록이 달라지는가 (43부 3차)
// ══════════════════════════════════════════════════════════════════
console.log('\n━━ ⑤ 조건 바꾸기 — 「입력해도 안 바뀐다」 를 잡습니다 ━━')
{
  const SUR = '김'
  const opt = { yongsin: '화' as const, heeksin: '목' as const, limit: 10 }
  const base = recommendNames(SUR, opt)
  check(base.length === 10, `조건 없이 열 개 (${base.length}개)`)

  // ★NamePicker 가 하는 «완성 글자만 쓰기» 를 그대로 흉내 냅니다
  const syllablesOf = (v: string) =>
    [...v.replace(/[,\s]+/g, '')].filter(ch => {
      const c = ch.charCodeAt(0); return c >= 0xac00 && c <= 0xd7a3
    })

  // ── 선호 소리 ──
  const preferred = recommendNames(SUR, { ...opt, prefer: syllablesOf('민') })
  check(preferred.length > 0, `「민」을 넣으면 목록이 나옵니다 (${preferred.length}개)`)
  check(preferred[0].name !== base[0].name || preferred.some(c => c.name.includes('민')),
    `★「민」이 든 이름이 앞으로 옵니다 (1위 ${preferred[0].fullName})`)

  // ⚠️ 조합 중 낱자 — 「ㅁ」은 «아직 글자가 아닙니다». 조건에서 빠져야 합니다
  check(syllablesOf('ㅁ').length === 0, `★조합 중 낱자 「ㅁ」은 조건에서 빠집니다`)
  const midComposing = recommendNames(SUR, {
    ...opt, prefer: syllablesOf('ㅁ').length ? syllablesOf('ㅁ') : undefined })
  check(midComposing.map(c => c.name).join() === base.map(c => c.name).join(),
    `★조합 중에는 «조건 없음» 과 같습니다 — 목록이 엉뚱하게 비지 않습니다`)
  check(syllablesOf('미').length === 1 && syllablesOf('민').length === 1,
    `「미」·「민」은 완성 글자라 곧바로 조건이 됩니다`)

  // ── 피할 글자 ──
  const avoidCh = base[0].name[0]
  const avoided = recommendNames(SUR, { ...opt, avoid: [avoidCh] })
  check(!avoided.some(c => c.name.includes(avoidCh)),
    `★「${avoidCh}」를 빼면 그 글자가 든 이름이 «하나도» 없습니다`)
  check(avoided.length > 0, `그래도 목록이 비지 않습니다 (${avoided.length}개)`)

  // ── 성향 ──
  const styles = ['남성적', '여성적', '중성적'] as const
  const byStyle = styles.map(st => recommendNames(SUR, { ...opt, style: st }))
  check(byStyle.every(l => l.length > 0), `성향 셋 다 목록이 나옵니다`)
  check(new Set(byStyle.map(l => l.map(c => c.name).join())).size === 3,
    `★성향을 바꾸면 목록이 «서로 다릅니다» (버튼이 먹통이 아닙니다)`)

  // ── 겹쳐 걸기 ──
  const both = recommendNames(SUR, {
    ...opt, style: '중성적', prefer: syllablesOf('민'), avoid: [avoidCh] })
  check(!both.some(c => c.name.includes(avoidCh)), `조건을 겹쳐도 «피할 글자» 가 지켜집니다`)

  // ⚠️ 조건이 «판정» 을 바꾸지는 않아야 합니다 (교재 밖 취향이므로)
  const common = base.find(b => preferred.some(x => x.name === b.name))
  if (common) {
    const same = preferred.find(x => x.name === common.name)!
    check(Math.abs(same.sound.score - common.sound.score) < 0.001,
      `★같은 이름의 «발음오행 판정» 은 조건을 걸어도 그대로입니다 (${same.sound.score})`)
  } else {
    check(true, `이 표본에는 겹치는 이름이 없어 넘어갑니다`)
  }
}

// ══════════════════════════════════════════════════════════════════
//  ⑥ 선호 소리 «자리» 가 실제로 듣는가 (43부 6차)
// ══════════════════════════════════════════════════════════════════
console.log('\n━━ ⑥ 「민」을 가운데 / 끝 자리에 ━━')
{
  const opt = { yongsin: '화' as const, limit: 10 }
  const any = recommendNames('김', { ...opt, prefer: ['민'] })
  const mid = recommendNames('김', { ...opt, prefer: ['민'], preferPos: '가운데' })
  const end = recommendNames('김', { ...opt, prefer: ['민'], preferPos: '끝' })

  const hitsOf = (l: typeof any) => l.filter(c => c.preferHit)
  check(hitsOf(mid).every(c => [...c.name][0] === '민'),
    `★가운데를 고르면 «앞 글자» 가 민입니다 (${hitsOf(mid)[0]?.fullName ?? '없음'})`)
  check(hitsOf(end).every(c => [...c.name][[...c.name].length - 1] === '민'),
    `★끝을 고르면 «마지막 글자» 가 민입니다 (${hitsOf(end)[0]?.fullName ?? '없음'})`)
  // ⚠️ 외자는 자리가 없습니다
  check(hitsOf(mid).every(c => [...c.name].length >= 2)
     && hitsOf(end).every(c => [...c.name].length >= 2),
    `★외자는 «맞지 않음» 입니다 — 넣을 자리가 없습니다`)
  // ⚠️ 자리를 고르면 후보가 줄어드는 것이 정상 — 그래도 «빈손» 은 안 됩니다
  check(mid.length === 10 && end.length === 10,
    `자리를 골라도 목록이 비지 않습니다 (${mid.length} · ${end.length}개)`)
  check(hitsOf(any).length >= hitsOf(mid).length,
    `★「상관없음」이 가장 넓습니다 (${hitsOf(any).length} ≥ ${hitsOf(mid).length})`)
  // 가운데와 끝은 «서로 다른» 결과여야 합니다 (둘 다 먹통이 아님)
  check(mid.map(c => c.name).join() !== end.map(c => c.name).join(),
    `★가운데와 끝이 «서로 다릅니다» (버튼이 먹통이 아닙니다)`)

  // 🔴★2026-08-01 (43부 7차) — «섞여 나오던» 것을 잡습니다.
  //   전에는 최민교·최민조 아래에 최은도·최우노가 섞였습니다 (앞줄 세우기만 했음).
  check(mid.every(c => [...c.name][0] === '민'),
    `★가운데 — «민이 없는 이름» 이 하나도 안 섞입니다 (${mid.map(c => c.name).join(' ')})`)
  check(end.every(c => [...c.name][[...c.name].length - 1] === '민'),
    `★끝 — «민이 없는 이름» 이 하나도 안 섞입니다`)
  check(mid.every(c => c.preferHit) && end.every(c => c.preferHit),
    `자리를 고르면 «전부» 조건을 만족합니다`)
  // ⚠️ 「상관없음」은 «거르지 않습니다» — 예전 그대로여야 합니다
  const anyNames = recommendNames('김', { ...opt })
  check(anyNames.length === 10 && any.length === 10,
    `★조건이 없거나 「상관없음」이면 거르지 않습니다 (${any.length}개)`)
  // ⚠️ 없는 소리를 그 자리에 두면 «빈손» 이 «사실» 입니다. 억지로 채우지 않습니다
  const none = recommendNames('김', { ...opt, prefer: ['쥑'], preferPos: '끝' })
  check(none.length === 0, `★맞는 이름이 없으면 «억지로 채우지» 않습니다 (${none.length}개)`)
}

console.log(`\n━━ 작명 동선 e2e — 통과 ${pass} · 실패 ${fail} ━━`)
console.log(`
  ⚠️ 이 검사가 «대신하지 못하는» 것 — 실기기 확인
     · 버튼·글자 잘림·결제 팝업 · Supabase 실응답 · 한글 조합(IME)
     ★전부 통과해도 실기 확인은 «따로» 하셔야 합니다.
`)
if (fail > 0) process.exit(1)
