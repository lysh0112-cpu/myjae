// ══════════════════════════════════════════════════════════════════
//  lib/safeNext.ts — ★2026-09-11 (6부) 신설
//  「로그인 뒤 돌아갈 주소(next)」를 거르는 규칙 «한 곳»
//
//  [왜 만들었나]
//    다섯 자리가 «같은 규칙» 을 저마다 적고 있었습니다 —
//      /login · /auth/login · /signup · /auth/callback · /auth/welcome
//    규칙은 「/ 로 시작하고, // 로 시작하지 않으면 우리 집 주소」 였는데
//    ★「/\evil.com」 이 그 규칙을 «통과» 했습니다.
//    ⇒ 브라우저는 \ 를 / 로 읽어 ★https://evil.com 으로 갑니다 (6부가 node 로 잼).
//    ⇒ 꾸민 링크로 처음 가입한 손님을 ★환영 화면 뒤 남의 사이트로 보낼 수 있었습니다.
//
//  [지금 규칙]  아래를 «모두» 지나야 우리 집 주소입니다
//    ① / 로 시작한다   ② // 로 시작하지 않는다
//    ③ \ 가 없다        ④ 보이지 않는 글자(탭·줄바꿈 등)가 없다
//       ⚠️ 브라우저는 주소 속 탭·줄바꿈을 «지우고» 읽습니다 — 「/<탭>/evil.com」 이 「//evil.com」 이 됩니다
//    ⑤ ★브라우저와 «같은 방식» 으로 풀어 봐도 우리 집 안이다 (마지막 그물)
//
//  ⛔ 다섯 자리에서 규칙을 «다시 적지» 마십시오 — 여기서 가져다 쓰십시오.
//     한쪽만 풀면 그쪽이 구멍이 됩니다. 검사 ㉒-q 가 봅니다.
//  ⚠️ 이 파일은 서버(callback)와 화면이 «함께» 씁니다 — 브라우저 전용 것을 넣지 마십시오.
// ══════════════════════════════════════════════════════════════════

const HOME = 'https://home.invalid'

/** 우리 집 주소면 그대로, 아니면 null */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string' || raw === '') return null
  if (!raw.startsWith('/') || raw.startsWith('//')) return null
  if (raw.includes('\\')) return null
  if (/[\u0000-\u001f\u007f]/.test(raw)) return null
  try {
    if (new URL(raw, HOME).origin !== HOME) return null
  } catch {
    return null
  }
  return raw
}
