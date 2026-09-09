// ══════════════════════════════════════════════════════════════════
//  ★2026-09-08 — 회원을 «부를 이름»  [대표님 지시]
//    「관리자나 상담사도 ★닉네임 그대로 부르면 돼」
//    「회원관리는 앞으로 ★카카오 회원번호로 모두 통일 · 카카오 로그인만」
//
//  ⚠️⚠️ ★관리자 화면에서 회원 이름을 보일 때는 «언제나» 이 함수를 쓰십시오.
//     p.nickname 이나 p.hangul_name 을 «직접» 쓰면 ★사람이 «사라집니다».
//
//  [왜 만들었나 — 2026-09-08 값으로 잰 것]
//    카카오 로그인만 열면 ★email 이 «빕니다» (동의 항목을 안 켜기로 정함).
//    그런데 관리자 화면 둘이 서로 «다른 칸» 을 보고 있었습니다 —
//      👥 회원 관리   nickname || email     → 카카오 뒤 email 이 없어 ★「(이름 없음)」
//      🪙 회원 지갑   hangul_name           → 카카오는 실명을 안 주어 ★「(이름 없음)」
//    ⇒ ★같은 사람이 탭마다 «다른 이름» 으로 보였습니다.
//    ⇒ 그리고 「(이름 없음)」이 둘이면 ★누구에게 충전할지 못 가립니다.
//
//  ⛔⛔ ★차례를 바꾸거나 줄이지 마십시오 —
//     이 다섯 줄은 ★큐보드(1판-23 · 검사 11항목) · 골프온(pickName · 검사 13항목)이
//     «이미» 쓰고 있는 것과 «똑같습니다». 한 곳만 바꾸면 ★세 앱이 다시 갈라져
//     같은 사람이 앱마다 다른 이름으로 보입니다 [1부 2-3].
//
//  ⚠️ ★메타nickname 을 빼지 마십시오 —
//     카카오 «첫 로그인» 순간에는 profiles 줄이 아직 «없고»,
//     user_metadata 의 닉네임이 ★그 사람의 유일한 이름입니다.
//     ⚠️ 채워 주는 곳은 ★app/api/admin/list-users/route.ts «한 곳» 입니다.
//        카카오는 nickname 칸을 «안 줍니다» — 거기서 name·full_name 등을 함께 봅니다.
//
//  🔴 ★2026-09-10 정정 — 위 「email 이 빕니다」는 «틀린 말» 이었습니다.
//     동의항목에 ★카카오계정(이메일)을 «필수» 로 켰더니 (그래야 로그인이 됩니다)
//     ⇒ auth.users 에 이메일이 ★들어옵니다. 값으로 확인했습니다.
//     ⚠️ 다만 profiles.email 은 ★따로 담아야 채워집니다 (/auth/welcome 이 담습니다).
//
//  ⚠️ ★'회원' 을 '(이름 없음)' 으로 되돌리지 마십시오 —
//     「없다」가 아니라 「아직 안 정하셨다」가 맞습니다. 손님은 실재합니다.
//
//  ⛔ ★손님 화면에는 쓰지 마십시오 — 손님은 «자기 닉네임» 만 보면 됩니다.
//  ⛔ ★상담사 이름에는 쓰지 마십시오 — 그쪽은 shownName()(호) 입니다 [48부 4차].
// ══════════════════════════════════════════════════════════════════

/** 회원 이름을 고를 때 볼 수 있는 칸들. 없는 칸은 안 넘겨도 됩니다. */
export type MemberNameSource = {
  /** profiles.nickname — ★맨 먼저 봅니다 [대표님] */
  nickname?: string | null
  /** profiles.hangul_name — 관리자가 손으로 만든 회원 등 */
  hangul_name?: string | null
  /** auth user_metadata 의 닉네임 — ★카카오 첫 로그인 «찰나» */
  meta_nickname?: string | null
  /** 이메일 — ★카카오 뒤에는 «빕니다». 마지막 단서일 뿐입니다 */
  email?: string | null
}

/** 빈 문자열·공백만 있는 값을 걸러 냅니다. */
function clean(v: string | null | undefined): string {
  return (v ?? '').trim()
}

/**
 * 회원을 «부를 이름» 을 고릅니다.
 *
 *   nickname → hangul_name → 메타nickname → 이메일앞 → '회원'
 *
 * ⛔ 이 차례는 큐보드·골프온과 «똑같아야» 합니다. 바꾸지 마십시오.
 */
export function memberName(p: MemberNameSource | null | undefined): string {
  if (!p) return '회원'

  const nick = clean(p.nickname)
  if (nick) return nick

  const hangul = clean(p.hangul_name)
  if (hangul) return hangul

  const meta = clean(p.meta_nickname)
  if (meta) return meta

  //  이메일 «앞» 만 씁니다 — 목록에 주소가 통째로 뜨면 읽기 어렵습니다.
  //  ⚠️ 카카오 뒤에는 여기까지 내려올 일이 거의 없습니다 (email 이 빕니다).
  const email = clean(p.email)
  if (email) {
    const head = email.split('@')[0].trim()
    if (head) return head
  }

  return '회원'
}

/**
 * 「누구에게」 처럼 문장에 넣을 때 씁니다. memberName 과 «같은» 값을 씁니다.
 * ⛔ 화면 표시와 문장에 «다른» 함수를 쓰지 마십시오 —
 *    화면엔 이름이 나오는데 확인 창에는 딴 이름이 뜨는 일이 생깁니다.
 */
export function memberNameWithNim(p: MemberNameSource | null | undefined): string {
  return `${memberName(p)} 님`
}
