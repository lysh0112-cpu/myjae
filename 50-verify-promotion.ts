// 50-verify-promotion.ts
//
//   승진운 표 그물 — lib/saju/examLuck/tables/promotion.ts
//   2026-09-12 (7부)
//
//   돌리기:  npx tsx 50-verify-promotion.ts

import {
  PROMO_JOBS, promoJobOf, isGateStep, defaultNextIdx,
  PROMO_YEARS, PROMO_SEASONS, watchMonthOf,
  PROMO_WISH_SAMPLES, PROMO_WISH_REQUIRED, PROMO_WISH_MAX, PROMO_WISH_NUDGE_UNDER,
  PROMO_TERMS_OK, PROMO_TERMS_BAN, PROMO_BAN_WORDS,
  PROMO_TERM_MAX_PER_SECTION, PROMO_TERM_FREE_SECTIONS,
  PROMO_SECTIONS, PROMO_CLOSING,
} from './lib/saju/examLuck/tables/promotion'
import { JOB_SITUATIONS } from './lib/saju/examLuck/tables/jobFields'
import { readFileSync } from 'fs'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  ❌ ' + m) } }
const head = (t: string) => console.log('\n━━ ' + t + ' ━━')

head('① 직업 일곱 · 차례가 «많으신 순서»')
ok(PROMO_JOBS.length === 7, '직업 일곱')
ok(PROMO_JOBS[0].key === 'hoesa', '맨 앞이 회사원 — 콤보 첫 줄이 기본값이라 가장 많은 분이 안 눌러도 됩니다')
ok(PROMO_JOBS[PROMO_JOBS.length - 1].key === 'etc', '맨 끝이 «그 밖 (직접 적기)»')
ok(PROMO_JOBS.every(j => j.key === 'etc' ? j.ranks.length === 0 : j.ranks.length >= 7),
  '직접 적기를 뺀 여섯은 직급이 일곱 줄 이상')
ok(PROMO_JOBS.every(j => j.key === 'etc' || j.src.length > 0), '여섯 벌 모두 출전이 적혀 있음')
ok(new Set(PROMO_JOBS.map(j => j.key)).size === 7, 'key 가 겹치지 않음')

head('② 찾은 값 그대로인가 — 법령·관행')
const gong = promoJobOf('gong')!
ok(gong.ranks[0] === '9급 서기보' && gong.ranks[8] === '1급 관리관', '공무원 9급 서기보 ~ 1급 관리관 (국가공무원법 제4조)')
ok(gong.ranks[4] === '5급 사무관', '공무원 5급이 사무관')
const police = promoJobOf('police')!
ok(police.ranks.length === 11, '경찰 11계급 (경찰공무원법 제3조)')
ok(police.ranks[2] === '경사' && police.ranks[3] === '경위', '경찰 경사 다음이 경위')
ok(police.ranks[10] === '치안총감', '경찰 맨 위가 치안총감')
const fire = promoJobOf('fire')!
ok(fire.ranks.length === 11, '소방 11계급')
ok(fire.ranks[2] === '소방장' && fire.ranks[3] === '소방위', '소방 소방장 다음이 소방위')
const bank = promoJobOf('bank')!
ok(bank.ranks.includes('부지점장 (부부장)'), '★은행에 부지점장이 있음 — 옛 목록에 없던 칸')
ok(bank.ranks.indexOf('차장') + 1 === bank.ranks.indexOf('부지점장 (부부장)'), '은행 차장 다음이 부지점장')

head('③ 🔴 «문» — 여섯 벌이 다 같은 자리를 가리키는가')
const GATE_EXPECT: Array<[string, string]> = [
  ['hoesa', '부장'], ['gong', '5급 사무관'], ['bank', '부지점장 (부부장)'],
  ['police', '경위'], ['fire', '소방위'], ['army', '소위 · 중위'],
]
for (const [k, name] of GATE_EXPECT) {
  const j = promoJobOf(k)!
  ok(j.gates.includes(j.ranks.indexOf(name)), `${j.label} — «${name}» 이 문으로 잡힘`)
}
ok(PROMO_JOBS.every(j => j.gates.every(g => g >= 0 && g < j.ranks.length)), '문 번호가 직급표 밖으로 나가지 않음')
ok(PROMO_JOBS.every(j => j.key === 'etc' || j.gates.length > 0), '직접 적기를 뺀 여섯은 문이 하나 이상')
ok(PROMO_JOBS.every(j => j.gates.every(g => g > 0)), '맨 아래 직급이 문이 되는 일은 없음 (들어오자마자 결재하지 않습니다)')

head('④ isGateStep — 직접 적으신 분도 «똑같이» 판정되는가')
ok(isGateStep('hoesa', 5) === true, '회사원 차장→부장 = 문')
ok(isGateStep('hoesa', 3) === false, '회사원 대리→과장 = 문 아님')
ok(isGateStep('police', 3) === true, '경찰 경사→경위 = 문')
ok(isGateStep('police', 4) === false, '경찰 경위→경감 = 문 아님')
ok(isGateStep('etc', -2, true) === true, '★직접 적기 + 「네」 → 문으로 봄 (직급 이름을 몰라도 판정이 돕니다)')
ok(isGateStep('etc', -2, false) === false, '직접 적기 + 「아니요」 → 문 아님')
ok(isGateStep('hoesa', 3, true) === true, '★손님 답이 표보다 앞섭니다 (본인이 제일 잘 아십니다)')
ok(isGateStep('hoesa', null) === false, '다음 직급을 모르면 문으로 보지 않음')
ok(isGateStep('hoesa', -1) === false, '「아직 모르겠어요」(-1)도 문으로 보지 않음')
ok(isGateStep(null, 5) === false, '직업이 없으면 문으로 보지 않음')

head('⑤ defaultNextIdx — 「넌지시」 한 계단 위가 미리')
ok(defaultNextIdx('hoesa', 4) === 5, '차장을 고르면 부장이 미리 골라짐')
ok(defaultNextIdx('police', 2) === 3, '경사를 고르면 경위가 미리 골라짐')
ok(defaultNextIdx('hoesa', 6) === 6, '맨 위에서는 그 자리에 머무름 (더 위가 없습니다)')
ok(defaultNextIdx('etc', 0) === -2, '직접 적기면 -2 (글 칸으로 엽니다)')

head('⑥ 대상연차 · 인사 시기')
ok(PROMO_YEARS[0].label.includes('대상연차'), '★낱말이 «대상» 이 아니라 «대상연차» [대표님]')
ok(PROMO_YEARS.some(y => y.key === 'notyet'), '「아직 연차가 안 됐어요」가 있음 — 없으면 시기를 못 가립니다')
ok(PROMO_YEARS.some(y => y.key === 'unknown') && PROMO_SEASONS.some(s => s.key === 'unknown'),
  '둘 다 「잘 모르겠어요」가 있음 (억지로 고르게 하면 틀린 달을 짚습니다)')
ok(watchMonthOf('year_end') === 10, '★연말(12월) 인사 → 눈여겨볼 달은 10월')
ok(watchMonthOf('mid') === 5, '년중(7월) 인사 → 5월')
ok(watchMonthOf('h1') === 11, '★상반기(1월) 인사 → 11월 (해를 넘어갑니다)')
ok(watchMonthOf('anytime') === null && watchMonthOf('unknown') === null,
  '수시 · 모르겠어요는 달을 짚지 않음')
ok(watchMonthOf(null) === null, '값이 없어도 터지지 않음')

head('⑦ 고민 칸 — ★«꼭» 입니다 [대표님]')
ok(PROMO_WISH_REQUIRED === true, '고민 칸이 필수')
ok(PROMO_WISH_MAX === 200, '200자')
ok(PROMO_WISH_NUDGE_UNDER > 0, '너무 짧으면 한 번 되묻되 ★막지는 않음')
ok(PROMO_WISH_SAMPLES.length === 3, '보기 셋 [대표님이 고르심]')
ok(new Set(PROMO_WISH_SAMPLES.map(s => s.grows)).size === 3, '★보기 셋이 서로 «다른 갈래» 를 키움 (겹치지 않습니다)')
ok(PROMO_WISH_SAMPLES.every(s => s.note.length > 20), '보기마다 «어떻게 받을지» 가 적혀 있음')
const stay = PROMO_WISH_SAMPLES.find(s => s.grows === 'stay')!
ok(stay.note.includes('나가지 마세요') && stay.note.includes('금지'),
  '★「더 버틸지」 보기에 «결정을 흔드는 말 금지» 가 박혀 있음')
ok(PROMO_WISH_SAMPLES.every(s => s.text.length <= PROMO_WISH_MAX), '보기가 글자 수 안에 들어감')

head('⑧ 🔴 말투 — 사주 용어를 «과하지 않게» [대표님 2026-09-12]')
ok(PROMO_TERMS_OK.length >= 15, '풀어 주면 쓸 수 있는 말이 충분히 있음')
ok(PROMO_TERMS_OK.every(t => t.gloss.length > 0), '★쓸 수 있는 말은 모두 «뜻» 이 달려 있음 (뜻 없이 쓰면 무안합니다)')
ok(PROMO_TERMS_OK.every(t => !PROMO_TERMS_BAN.includes(t.term)), '쓸 수 있는 말과 못 쓰는 말이 겹치지 않음')
for (const t of ['관인상생', '상관견관', '용신', '격국', '12운성', '조후', '신약'])
  ok(PROMO_TERMS_BAN.includes(t), `⛔ «${t}» 은 못 쓰는 말에 들어 있음`)
ok(PROMO_TERM_MAX_PER_SECTION === 3, '한 갈래에 한자말 셋까지 (어림값 — 재고 고칠 것)')
ok(PROMO_TERM_FREE_SECTIONS.includes('cheer'), '★4번 갈래(응원)는 사주 용어 0개')

head('⑨ ⛔ 승진운에서 쓰지 않는 말')
for (const w of ['누락', '경쟁자', '확률', '승진하십니다'])
  ok(PROMO_BAN_WORDS.some(b => b.includes(w) || w.includes(b)), `⛔ «${w}» 이 막혀 있음`)
for (const w of ['결이', '말이 앞선다', '기운이 열린다'])
  ok(PROMO_BAN_WORDS.includes(w), `⛔ 6부 금지어 «${w}» 도 그대로 막혀 있음`)
ok(!PROMO_BAN_WORDS.some(b => PROMO_TERMS_OK.some(t => t.term === b)), '금지어와 허용어가 겹치지 않음')

head('⑩ 네 갈래 — 뼈대는 같고 «이름과 속» 이 다름')
ok(PROMO_SECTIONS.length === 4, '네 갈래 (합격운·취업운과 같은 수 — AI 도 4번 호출)')
ok(PROMO_SECTIONS.map(s => s.key).join('|') === 'flow|gate|pace|cheer', '갈래 key 가 뼈대 그대로')
ok(PROMO_SECTIONS[1].title.includes('다음 자리'), '★2번이 «실전 전략» 이 아니라 «다음 자리로 가는 길»')
ok(PROMO_SECTIONS[2].title.includes('인사 시기'), '★3번에 «D-Day» 가 아니라 «인사 시기» (날짜를 회사가 정합니다)')
ok(PROMO_SECTIONS.every(s => s.job.length > 20), '갈래마다 «맡은 일» 이 적혀 있음 (되풀이 막기)')
ok(PROMO_SECTIONS[1].job.includes('막는 법'), '★2번에 «아쉬운 점은 막는 법과 함께» 가 박혀 있음')
ok(PROMO_CLOSING.includes('정하는 것은 사람과 조직'), '★맺음말 — 「점쟁이는 아니잖아」 [대표님]')

head('⑪ 🔴 지뢰 — 승진을 이직으로 읽지 않는가')
const hasPromote = (JOB_SITUATIONS as Array<{ key: string }>).some(s => s.key === 'promote')
const seven = readFileSync('./lib/saju/examLuck/buildExamSeven.ts', 'utf8')
const naiveIsMove = /jobSituation\s*!==\s*'new'/.test(seven)
ok(!hasPromote || !naiveIsMove,
  "⛔ JobSituation 에 'promote' 를 더하려면 buildExamSeven 의 isMove(!== 'new')를 «함께» 고쳐야 합니다 "
  + '— 안 고치면 승진 손님께 「몸담은 곳을 옮기실 수 있습니다」 가 나갑니다')

console.log(`\n━━ 승진운 표 — 통과 ${pass} · 실패 ${fail} ━━\n`)
process.exit(fail ? 1 : 0)
