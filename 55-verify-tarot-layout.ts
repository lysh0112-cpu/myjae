/**
 *  검사 55 — 타로 결과 화면의 «맨 아래» 차례
 *  2026-09-15 (9부)
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  [왜 만들었나]                                                     │
 *  │   app/tarot/page.tsx 에 ⛔ 이렇게 «적혀» 있었습니다 —               │
 *  │     「크레디트가 맨 아래에 남아야 합니다. 순서를 바꾸지 마십시오.     │
 *  │       CC BY 4.0 은 만든 이를 보이게 밝혀야 하는 라이선스입니다.」    │
 *  │                                                                  │
 *  │   ⚠️ 그런데 ★9월 9일에 «보관함 줄» 을 크레디트 «아래» 에 넣으면서    │
 *  │      그 규칙이 깨져 있었습니다. ★아무도 몰랐습니다.                 │
 *  │   ⇒ 🔴 «말» 로 막은 것은 안 지켜집니다 (7부 0-1).                   │
 *  │     ⇒ 그래서 ★«값» 으로 셉니다.                                    │
 *  └──────────────────────────────────────────────────────────────────┘
 *
 *  ⛔ 이 검사를 느슨하게 풀지 마십시오.
 *     라이선스 위반은 ★돈으로 물어야 하는 일입니다.
 */

import { readFileSync } from 'fs'

let pass = 0, fail = 0
const ok = (cond: boolean, msg: string) => {
  if (cond) { pass++; console.log(`  ✅ ${msg}`) }
  else { fail++; console.log(`  ❌ ${msg}`) }
}
const head = (t: string) => console.log(`\n━━ ${t} ━━`)
const R = (p: string) => { try { return readFileSync(p, 'utf8') } catch { return '' } }

function main() {
  const t = R('app/tarot/page.tsx')

  /* ══ ① ⛔⛔ 음악 크레디트 — 라이선스 ══════════════════════════════ */
  head('① ⛔⛔ 음악 크레디트 (CC BY 4.0) — 지우면 라이선스 위반')
  ok(t.length > 1000, '★타로 화면 파일을 읽었습니다')
  ok(t.includes('Envision') && t.includes('Kevin MacLeod'),
    '⛔ ★곡 이름과 만든 이가 «그대로» 있습니다')
  ok(t.includes('creativecommons.org/licenses/by/4.0'),
    '⛔ ★라이선스 주소가 있습니다')
  ok(t.includes('incompetech.com'),
    '⛔ ★출처가 있습니다')

  /* ══ ② 🔴 크레디트가 «맨 아래» 인가 ═══════════════════════════════
   *  ⚠️ 「있는지」 만 보면 안 됩니다 — ★«어디 있는지» 를 봐야 합니다.
   *     9월 9일에 깨진 것이 바로 그 자리입니다.
   * ══════════════════════════════════════════════════════════════ */
  head('② 🔴 크레디트가 «맨 아래» 인가')
  {
    //  ⚠️ ★머리말 «주석» 에도 곡 이름이 적혀 있습니다 (133줄).
    //     ⛔ indexOf 로 찾으면 그 주석을 잡습니다 — ★lastIndexOf 로 «화면에 그리는» 쪽을 봅니다.
    //     (9부에 이걸 «되살려 보고» 알았습니다 — 7부 「주석에 검사가 찾는 낱말」 그대로였습니다)
    const iCredit = t.lastIndexOf('Kevin MacLeod')
    const after = t.slice(iCredit)
    //  ⛔ 크레디트 «뒤» 에 손님이 누를 것이 오면 안 됩니다
    const bad: string[] = []
    if (/<StorageLinkRow/.test(after)) bad.push('보관함 줄')
    if (/<ConsultButton/.test(after)) bad.push('상담 단추')
    ok(iCredit > 0 && bad.length === 0,
      `🔴 ⛔ ★크레디트 «뒤» 에 누를 것이 없습니다 ${bad.join(' · ')}`)
  }

  /* ══ ③ 🔴 상담 단추는 «크레디트 바로 위» ═════════════════════════ */
  head('③ 🔴 상담 단추 — 맨 아래 (크레디트 위) [대표님 2026-09-15]')
  {
    const iBtn = t.indexOf('<ConsultButton')
    const iNew = t.indexOf('새로운 질문하기')
    const iCredit = t.lastIndexOf('Kevin MacLeod')   // ⚠️ 주석 말고 «그리는» 쪽
    ok(iBtn > 0 && iNew > 0 && iBtn > iNew,
      '🔴 ★상담 단추가 「새로운 질문하기」 «아래» 입니다')
    ok(iBtn > 0 && iCredit > iBtn,
      '⛔ ★상담 단추가 크레디트 «위» 입니다 (크레디트가 맨 아래여야 합니다)')
    ok(/priceKey="tarot"/.test(t),
      "★상담료는 consult_prices 의 'tarot' 줄을 씁니다")
  }

  /* ══ ④ 🔴 보관함 가는 길이 «하나» 인가 [대표님 2026-09-15] ════════ */
  head('④ 🔴 보관함 가는 길 — «하나» 뿐인가')
  {
    /*  ⚠️ ★«결과 화면 안» 만 봅니다.
     *     타로는 한 파일에 화면이 여럿입니다 —
     *       · 질문 화면의 「📜 이전 타로 기록 보기」  ← ⛔ 중복이 아닙니다
     *       · 맨 위 «뒤로» 단추의 되돌아갈 곳        ← ⛔ 중복이 아닙니다
     *     ⇒ 파일 전체를 세면 ★엉뚱한 것까지 잡습니다 (9부에 겪었습니다). */
    const iNew = t.indexOf('새로운 질문하기')
    const body = iNew > 0 ? t.slice(iNew) : t
    const n = (body.match(/\/tarot\/storage/g) ?? []).length
    ok(n === 1, `🔴 ★결과 화면에서 보관함 가는 길이 «하나» 입니다 (${n}곳)`)
    ok(t.includes('내 타로 보관함'), '★「📜 내 타로 보관함」 단추가 있습니다')
    ok(!/<StorageLinkRow/.test(t),
      '⛔ ★아래쪽 보관함 줄을 걷어냈습니다 [대표님] — 다시 넣지 마십시오')
  }

  /* ══ ⑤ 🔴 저장 «알림» 은 살아 있는가 ══════════════════════════════
   *  ⚠️ 걷어낸 줄은 «단순 링크» 가 아니었습니다 —
   *     ★저장 «실패» 도 알려 주었습니다. 그것까지 지우면 안 됩니다.
   * ══════════════════════════════════════════════════════════════ */
  head('⑤ 🔴 저장 알림 — 걷어내면서 «잃지» 않았는가')
  ok(t.includes('보관함에 담았어요'), '★담긴 것을 알려 드립니다')
  ok(t.includes('보관함에 담지 못했어요'),
    "🔴 ⛔ ★«못 담긴 것» 도 알려 드립니다 — 이걸 잃으면 손님이 모릅니다")
  ok(/saveState === 'saved'/.test(t) && /saveState === 'failed'/.test(t),
    '★저장 상태를 보고 가립니다')
  ok(!/saveState === 'saving'/.test(t),
    '⚠️ ★담는 «중» 에는 아무 말도 안 합니다 (곧 끝나는 일에 말을 걸면 시끄럽습니다)')
  ok(/SAVE_STATE\.ok/.test(t) && /SAVE_STATE\.fail/.test(t),
    '⛔ ★색을 직접 적지 않고 공용(lib/ui/color)을 씁니다')

  console.log(`\n━━ 타로 화면 차례 — 통과 ${pass} · 실패 ${fail} ━━\n`)
  if (fail > 0) process.exit(1)
}

main()
