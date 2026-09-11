/**
 * 48 — 화면이 끊으면 «AI 호출도 끊는가» (2026-09-11 · 6부)
 *
 *  🔴 [겪음] 9월 11일 하루에 입력 1,977만 · 출력 435만 토큰 — 미납 US$113.59 (Claude 콘솔)
 *     ① 취업운 화면이 AI 를 끊고 다시 부르기를 끝없이 되풀이 (알약 봉투 버그 — 고침 · 검사 46 ⑤)
 *     ② 그런데 서버 창구는 화면이 끊어도 AI 에게 «그만» 을 전하지 않고 글을 끝까지 받아 냈습니다
 *        → 끊긴 호출마다 출력 토큰까지 온전히 비용으로 잡혔습니다.
 *  ⇒ AI 를 부르는 모든 창구: 화면이 끊으면(req.signal) AI 호출도 끊습니다.
 *     흘려보내는 창구(stream)는 흐름이 취소될 때(cancel)도 끊습니다.
 *  ⚠️ 새 AI 창구를 만들면 이 검사가 폴더째 훑어 잡습니다.
 */
import * as fs from 'fs'
import * as path from 'path'
import { memoryBump, BUMP_MAX, BUMP_WINDOW_MS, _resetMemoryBump } from './lib/ai/speedBump'
import { alertKindOf, ALERT_TEXT } from './lib/ai/alertKind'
import { guessHint } from './lib/ai/errorLog'

let pass = 0, fail = 0
const ok = (c: boolean, m: string) => { if (c) { pass++; console.log('  ✅ ' + m) } else { fail++; console.log('  🔴 ' + m) } }
const walk = (d: string): string[] => fs.readdirSync(d).flatMap(n => {
  const p = path.join(d, n)
  return fs.statSync(p).isDirectory() ? walk(p) : /route\.ts$/.test(n) ? [p] : []
})

console.log('\n━━ AI 를 부르는 창구마다 — 화면이 끊으면 AI 도 끊는가 ━━')
const routes = walk('app/api').filter(f => fs.readFileSync(f, 'utf8').includes('api.anthropic.com/v1/messages')).sort()
ok(routes.length >= 13, `AI 창구를 폴더째 셌습니다 (${routes.length}곳)`)
for (const f of routes) {
  const s = fs.readFileSync(f, 'utf8')
  const i = s.indexOf('api.anthropic.com/v1/messages')
  const call = s.slice(i, i + 400)
  const streaming = /stream:\s*true/.test(s)
  if (streaming) {
    ok(/signal:\s*upstream\.signal/.test(call) && /req\.signal\?\.addEventListener\('abort', \(\) => upstream\.abort\(\)\)/.test(s)
      && /cancel\(\)\s*\{\s*upstream\.abort\(\)/.test(s),
      `${f.replace('app/api/', '')} — 흘려보내기: 화면이 끊거나 흐름이 취소되면 AI 도 끊음`)
  } else {
    ok(/signal:\s*req\.signal/.test(call), `${f.replace('app/api/', '')} — 화면이 끊으면 AI 도 끊음`)
  }
}

console.log('\n━━ 🔴 과속 방지턱 — 창구마다 AI 를 부르기 «전» 에 걸려 있는가 (대표님 「여기서 해결」) ━━')
for (const f of routes) {
  const s = fs.readFileSync(f, 'utf8')
  const bumpAt = s.indexOf('aiSpeedBump(')
  const callAt = s.indexOf('api.anthropic.com/v1/messages')
  ok(bumpAt > 0 && bumpAt < callAt && /if \(!bump\.ok\)/.test(s), `${f.replace('app/api/', '')} — AI 를 부르기 전에 방지턱`)
}

console.log('\n━━ 과속 방지턱 — 실제 값으로 ━━')
{
  _resetMemoryBump()
  const t0 = 1_000_000
  let passN = 0
  for (let i = 0; i < BUMP_MAX; i++) if (memoryBump('u1', t0 + i)) passN++
  ok(BUMP_MAX === 20 && BUMP_WINDOW_MS === 10 * 60 * 1000, '10분에 20번 (취업운 한 번 = 4번 · 다섯 번 연달아 넉넉)')
  ok(passN === BUMP_MAX, `20번째까지는 통과 (${passN})`)
  ok(!memoryBump('u1', t0 + 100), '★21번째는 막힘')
  ok(memoryBump('u2', t0 + 100), '다른 사람은 따로 셈')
  ok(memoryBump('u1', t0 + BUMP_WINDOW_MS + 50), '10분이 지나면 다시 통과')
  //  오늘 사고를 되돌려 보면 — 끝없이 부르던 화면이 1분에 수백 번 불렀어도
  _resetMemoryBump()
  let allowed = 0
  for (let i = 0; i < 5000; i++) if (memoryBump('loop', t0 + i * 12)) allowed++   // 1분에 5,000번 흉내
  ok(allowed === BUMP_MAX, `끝없이 부르는 화면도 10분에 ${allowed}번에서 멈춤 (5,000번 중)`)
}

console.log('\n━━ 알림 분류 — 오늘 받은 실제 오류 문장으로 ━━')
{
  const credit = 'Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.'
  const limit = 'You have reached your specified API usage limits. You will regain access on 2026-10-01 at 00:00 UTC.'
  ok(alertKindOf('tongbyeon', 400, credit) === 'billing', '「credit balance is too low」 → 잔액 부족')
  ok(alertKindOf('tongbyeon', 400, limit) === 'limit', '「reached your specified API usage limits」 → 지출 한도 도달')
  ok(alertKindOf('tongbyeon', 401, 'invalid x-api-key') === 'key', '401 → 열쇠 오류')
  ok(alertKindOf('speed-bump:tongbyeon', 429, '과속 방지턱') === 'bump', '방지턱에 걸림 → 화면 버그 의심')
  ok(alertKindOf('tongbyeon', 529, 'overloaded') === null, 'AI 쪽 붐빔(529)은 알리지 않음 (우리가 할 일이 없음)')
  ok(/지출 한도/.test(guessHint(400, limit)), '오류 기록의 풀이도 「지출 한도」 를 알아봄')
  ok(Object.values(ALERT_TEXT).every(x => x.title && x.todo), '알림마다 제목과 할 일')
}

console.log('\n━━ 알림이 실제로 뜨는가 ━━')
{
  const ap = fs.readFileSync('app/admin/page.tsx', 'utf8')
  const bn = fs.readFileSync('app/admin/components/AiAlertBanner.tsx', 'utf8')
  const el = fs.readFileSync('lib/ai/errorLog.ts', 'utf8')
  ok(/<AiAlertBanner \/>/.test(ap), '관리자 화면 맨 위에 빨간 띠')
  ok(/alertKindOf\(/.test(bn) && /ai_error_logs/.test(bn), '띠는 AI 오류 기록을 읽어 분류')
  ok(/RESEND_API_KEY/.test(el) && /ALERT_EMAIL/.test(el) && /alertKindOf\(/.test(el), '메일 알림 — 열쇠를 넣으면 켜짐 (없으면 조용히 건너뜀)')
  ok(fs.existsSync('_SQL_ai_call_log.sql') && /create table if not exists ai_call_log/.test(fs.readFileSync('_SQL_ai_call_log.sql', 'utf8')), 'DB 표 만드는 SQL')
}

console.log(`\n━━ AI 호출 끊기 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail) process.exit(1)
