import { supabase } from '@/lib/supabase'

// ============================================================================
// 관리자 API 를 «안전하게» 부르는 자리    ★2026-09-11 (새벽) 신설
//
// [겪은 일]
//   화면을 오래 켜 두었다가 회원 지갑을 누르니 ★「그 회원을 못 찾았습니다」만 떴습니다.
//   [까닭] Supabase 의 access token 은 ★1시간(3600초)짜리입니다 (값으로 확인).
//          · middleware 는 ★«화면을 옮길 때» 만 돕니다.
//          · fetch 는 middleware 를 ★안 거칩니다.
//          ⇒ 오래 켜 둔 화면은 ★갱신될 «기회가 없습니다».
//          ⇒ 죽은 쿠키로 API 를 부르고 → requireMaster 가 401 →
//             화면은 까닭도 모른 채 「못 찾았습니다」라고만 말했습니다.
//
// [골프온이 같은 것을 겪었습니다 — 2026-09-11 · 1판-49]
//   「사진 읽기는 창을 열 때 받은 토큰을 갱신 없이 썼다 ⇒ ★한 시간 뒤 401」
//   ⇒ 골프온은 ★부르는 «순간» 새로 받게 고쳤습니다. 여기도 같은 방식입니다.
//   ⚠️ 골프 라운드는 ★최장 6시간이라 그 앱에서 가장 크게 터질 자리였습니다.
//      명연재는 관리자 화면이 그렇습니다 — 대표님이 밤새 켜 두십니다.
//
// [무엇을 하나]
//   ① 부르기 ★«직전» 에 세션을 새로 받습니다 (필요하면 갱신됩니다)
//   ② 그래도 401 이면 ★「로그인이 풀렸어요」 라고 «분명히» 알립니다
//   ③ ★신호 끊김과 «서버 거절» 을 가려서 말합니다 (골프온 ④와 같은 뜻)
//
// [쓰는 법]
//   const r = await callAdmin('/api/admin/wallet/member', { what: 'one', userId })
//   if (!r.ok) { alert(r.message); return }
//   ⇒ r.data 에 서버가 준 것이 들어 있습니다.
//
// ⛔ 관리자 API 를 fetch 로 «직접» 부르지 마십시오 — 이 부품을 쓰십시오.
//    직접 부르면 ★오래 켜 둔 화면에서 또 조용히 실패합니다.
// ============================================================================

/* ────────────────────────────────────────────────────────────────
 *  ★부르기 «직전» 에 세션만 새로 받는 짧은 자리
 *
 *  [왜 따로 두나]  관리자 API 를 부르는 곳이 ★열세 곳인데 모양이 제각각입니다.
 *     ⇒ 전부 callAdmin 으로 갈아 끼우면 «한꺼번에 많이» 바뀌어 위험합니다.
 *     ⇒ 기존 fetch 를 그대로 두고, ★그 «한 줄 앞» 에 이것만 넣습니다.
 *
 *  [무엇을 하나]  getSession() 이 만료가 가까우면 ★스스로 갱신하고,
 *     그 결과가 쿠키에 담깁니다. 이어지는 fetch 가 «새 쿠키» 를 보냅니다.
 *
 *  [돌려주는 것]  로그인이 살아 있으면 true · 풀렸으면 false
 *     ⇒ false 면 ★「로그인이 풀렸어요」 라고 알려 주십시오. 조용히 넘기지 마십시오.
 *
 *  ⚠️ 새로 만드시는 관리자 화면은 ★callAdmin 을 쓰십시오. 이건 «옛 코드용» 입니다.
 * ──────────────────────────────────────────────────────────────── */
export async function freshSession(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  return !!session
}

type AdminResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string; expired: boolean }

export async function callAdmin<T = unknown>(
  url: string,
  body: Record<string, unknown>,
): Promise<AdminResult<T>> {
  /* ① 부르기 «직전» 에 세션을 새로 받습니다.
     ⚠️ getSession() 은 만료가 가까우면 ★스스로 갱신합니다.
        그 결과가 쿠키에 담기고, 이어지는 fetch 가 «새 쿠키» 를 보냅니다.
     ⛔ 이 줄을 빼지 마십시오 — 오래 켜 둔 화면이 죽은 토큰을 보냅니다. */
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { ok: false, expired: true, message: '로그인이 풀렸어요. 다시 로그인해 주세요.' }
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    /* ③ ★신호가 끊긴 것입니다 — 서버가 «거절한 것이 아닙니다».
       ⛔ 이때 「다시 로그인하세요」 라고 하지 마십시오. 로그인은 멀쩡합니다.
       (골프온 1판-49 ④ 와 같은 가름입니다) */
    return { ok: false, expired: false, message: '인터넷이 잠깐 끊겼어요. 잠시 뒤 다시 해주세요.' }
  }

  const j = await res.json().catch(() => ({}))

  /* ② 서버가 «거절» 한 것입니다. 401·403 은 까닭을 «분명히» 말합니다. */
  if (res.status === 401) {
    return { ok: false, expired: true, message: '로그인이 풀렸어요. 다시 로그인해 주세요.' }
  }
  if (res.status === 403) {
    return { ok: false, expired: false, message: '관리자만 쓸 수 있어요.' }
  }
  if (!res.ok) {
    return { ok: false, expired: false, message: (j as { error?: string })?.error ?? '알 수 없는 오류가 났어요.' }
  }
  return { ok: true, data: j as T }
}
