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

console.log(`\n━━ AI 호출 끊기 — 통과 ${pass} · 실패 ${fail} ━━\n`)
if (fail) process.exit(1)
