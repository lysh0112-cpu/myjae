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
/*  ★2026-09-12 (7부) [대표님] — 승진운을 더하면서 카드 이름을 바꿨습니다.
 *    [전] 합격운/취업운   [지금] 합격운/취업운/승진운
 *  ⛔ 압핀(찜)은 saju_records 의 title 에 ★«이름 그대로» 저장됩니다
 *     (lib/saju/pinnedServices.ts — service_type='pinned' · title=serviceName).
 *     그래서 이름만 바꾸면 ★이미 찜해 두신 분의 압핀이 «말없이» 풀립니다.
 *  ⇒ 옛 이름을 아래에 남겨 두고, 홈이 «둘 다» 내 것으로 읽습니다. */
export const EXAM_LUCK_NAME = '합격운/취업운/승진운'

/** ⛔ 지우지 마십시오 — 7부 이전에 찜해 두신 분들의 압핀 이름입니다 */
export const EXAM_LUCK_NAME_OLD = '합격운/취업운'

/** 이 카드의 이름인가 — 옛 이름도 «내 것» 으로 봅니다 */
export function isExamLuckName(name: string): boolean {
  return name === EXAM_LUCK_NAME || name === EXAM_LUCK_NAME_OLD
}

/*  ★2026-09-14 (8부) [대표님 「완전한 검증이 될 때까지 … 넣을지 말지를 결정하는 토글」]
 *    하락이수를 «합격운과 똑같은 방식» 으로 켜고 끕니다.
 *  ⛔ 하락이수는 ★뱃지를 «붙이지» 않습니다 [대표님 「나중에 필요하면 넣도록 할께」]. */
export const HAERAK_NAME = '하락이수'
/** 이 카드의 이름인가 */
export function isHaerakName(name: string): boolean {
  return name === HAERAK_NAME
}

/** app_settings 의 낱말 — ⛔ 바꾸면 켜 둔 값이 «꺼짐» 으로 돌아갑니다 */
export const HOME_FLAG_KEYS = {
  examLuck: 'home_exam_luck',
  haerak: 'home_haerak',
  /*  🔴 ★2026-09-21 (10부) [대표님] — PG 카드사 «심사관» 이 들어오는 문.
   *  ⚠️ 토스 메일 — 「★소셜 로그인 테스트 계정 사용 불가(카카오톡, 구글 등)」
   *     ⇒ 우리는 ★카카오뿐이라 심사관이 들어올 길이 «없습니다».
   *  ⇒ 이메일 로그인 화면(/login/review)을 ★이 토글로 «열었다 닫았다» 합니다.
   *  ⛔ 심사가 끝나면 ★끄십시오. 끄면 그 화면이 «없는 것처럼» 굽니다. */
  reviewLogin: 'review_login',
  /*  🔴 ★2026-09-22 (10부) [대표님] — 「골프온과 큐보드는 우선 승인 전까지 숨겼다가
   *    승인 후 추가하는 걸로 하자」
   *
   *  [까닭]  홈 맨 아래 「함께 쓰는 서비스」 단추를 누르면
   *    ★cue.myjae.kr · golf.myjae.kr 로 «떠납니다» (같은 창).
   *    ⇒ PG 심사관이 ★심사 대상이 아닌 다른 도메인을 보게 됩니다.
   *    ⇒ 그쪽은 사업자정보가 «한 곳» 뿐이고,
   *      골프온에는 ★「200원이 빠집니다」 가 적혀 있는데 «실제로는 안 빠집니다».
   *
   *  ⛔ ★심사 «접수 전» 에 끄고, «통과 뒤» 에 켜십시오.
   *     심사 «중» 에 켜고 끄면 «홈페이지 수정» 으로 보여 반려됩니다.
   *  ⚠️ 이것은 «홈 카드» 가 아닙니다 — 자매 앱 바로가기입니다. */
  sisterLinks: 'sister_links',
} as const

export interface HomeFlags {
  examLuck: boolean
  /** ★2026-09-14 (8부) — 하락이수. ⛔ 검증 끝날 때까지 «꺼짐» 으로 나갑니다 [대표님] */
  haerak: boolean
  /**
   *  ★2026-09-21 (10부) — 심사관 전용 이메일 로그인 문.
   *  ⚠️ 이것은 «홈 카드» 가 아닙니다. 홈 화면은 이 값을 ★쓰지 않습니다.
   *     같은 «켜고 끄는 장치» 라 표를 함께 쓸 뿐입니다 (⛔ 부품을 복사하지 않으려고).
   *  ⛔ 기본값은 ★«꺼짐». 심사 끝나면 반드시 끄십시오.
   */
  reviewLogin: boolean
  /**
   *  ★2026-09-22 (10부) — 홈 맨 아래 「함께 쓰는 서비스」(큐보드·골프온).
   *  ⛔ 기본값은 ★«꺼짐». 심사가 끝난 «뒤» 에 켜십시오 [대표님].
   */
  sisterLinks: boolean
}

export const HOME_FLAGS_OFF: HomeFlags = {
  examLuck: false, haerak: false, reviewLogin: false, sisterLinks: false,
}

/** 토글 낱말 — 화면·창구·검사가 «이 목록» 으로 맞춥니다 */
export type HomeFlagKey = keyof HomeFlags
export const HOME_FLAG_LIST: HomeFlagKey[] = ['examLuck', 'haerak', 'reviewLogin', 'sisterLinks']

/** 화면에서 부릅니다 — 못 읽으면 «꺼짐» */
export async function fetchHomeFlags(): Promise<HomeFlags> {
  try {
    const r = await fetch('/api/home-flags', { cache: 'no-store' })
    if (!r.ok) return HOME_FLAGS_OFF
    const d = (await r.json()) as Partial<HomeFlags> | null
    return {
      examLuck: d?.examLuck === true,
      haerak: d?.haerak === true,
      //  ⛔ ★«true 일 때만» 켜집니다 — 못 읽거나 이상하면 «닫힘» 입니다
      reviewLogin: d?.reviewLogin === true,
      //  ⛔ ★«true 일 때만» 보입니다 — 못 읽으면 «숨김» 입니다
      sisterLinks: d?.sisterLinks === true,
    }
  } catch {
    return HOME_FLAGS_OFF
  }
}
