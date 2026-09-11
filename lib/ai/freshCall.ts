// ══════════════════════════════════════════════════════════════════
//  lib/ai/freshCall.ts — ★2026-09-11 (6부) 신설
//
//  [왜 만들었나]
//    analyze · tongbyeon 이 이제 ★«로그인한 사람» 만 받습니다 (검사 ㉒-o).
//    ⚠️ access token 은 1시간짜리입니다. middleware 는 «화면을 옮길 때» 만 돌아
//       fetch 는 갱신될 기회가 없습니다 (5부 0-5 · 3장).
//    ⇒ 오래 켜 둔 화면이 죽은 토큰을 보내면 ★401 이 납니다.
//
//  [하는 일]
//    getSession() 은 만료가 가까우면 ★스스로 갱신하고 쿠키에 담습니다.
//    ⇒ 바로 이어지는 fetch 가 «새 쿠키» 를 보냅니다.
//    ⚠️ 관리자 화면의 callAdmin.ts 와 «같은 결» 입니다.
//       손님 화면이 admin 폴더를 가져다 쓰지 않도록 따로 두었습니다.
//
//  ⛔ 부르는 자리에서 이 줄을 빼지 마십시오 — 검사 ㉒-o 가 «폴더째» 봅니다.
// ══════════════════════════════════════════════════════════════════
import { supabase } from '@/lib/supabase'

/** 세션이 있으면 true. 없으면 false (부르는 쪽은 그대로 부르고, 서버가 401 로 답합니다). */
export async function refreshBeforeAi(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    return !!session
  } catch {
    //  ⚠️ 신호가 끊겨도 «여기서» 막지 않습니다 — 부르는 쪽의 실패 처리가 그대로 돕니다.
    return false
  }
}
