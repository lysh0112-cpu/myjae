// ══════════════════════════════════════════════════════════════════
//  lib/homeFlags.ts — ★2026-09-11 (6부) 신설
//  「홈에 무엇을 보일지」 켜고 끄는 값 «한 곳»
//
//  [대표님 2026-09-11]  「나) 단독카드로 하되, 관리화면에 취업운/합격운을 넣을지 말지를
//                        결정하는 토글버튼을 만들어줄래」
//
//  [어디에 담나]  app_settings 표의 한 줄 — key 'home_exam_luck' · value ★1(켜짐) / 0(꺼짐)
//                 ⚠️ value 는 «숫자 칸» 입니다 — 참/거짓은 거절됩니다 (2026-09-11 대표님 화면에서 확인)
//                 ★읽기·쓰기 모두 «서버 길» 로 합니다 (권한에 조용히 막히지 않게)
//                   읽기  GET  /api/home-flags          (손님 누구나 · 정해진 낱말만)
//                   쓰기  POST /api/admin/home-flags    (관리자만)
//
//  ⛔ 못 읽으면 ★«꺼짐» 으로 떨어집니다 — 켜진 채로 새지 않게 (검사 ㉒-u).
//  ⚠️ 이 파일은 화면과 서버가 «함께» 씁니다 — 브라우저 전용 것을 넣지 마십시오.
// ══════════════════════════════════════════════════════════════════

/** 홈 카드 이름 — 홈 · 서비스 낱장 · 관리 화면이 «이 글자» 로 맞춥니다 */
export const EXAM_LUCK_NAME = '합격운/취업운'

/** app_settings 의 낱말 — ⛔ 바꾸면 켜 둔 값이 «꺼짐» 으로 돌아갑니다 */
export const HOME_FLAG_KEYS = {
  examLuck: 'home_exam_luck',
} as const

export interface HomeFlags {
  examLuck: boolean
}

export const HOME_FLAGS_OFF: HomeFlags = { examLuck: false }

/** 화면에서 부릅니다 — 못 읽으면 «꺼짐» */
export async function fetchHomeFlags(): Promise<HomeFlags> {
  try {
    const r = await fetch('/api/home-flags', { cache: 'no-store' })
    if (!r.ok) return HOME_FLAGS_OFF
    const d = (await r.json()) as Partial<HomeFlags> | null
    return { examLuck: d?.examLuck === true }
  } catch {
    return HOME_FLAGS_OFF
  }
}
