// ══════════════════════════════════════════════════════════════════
//  ★2026-09-09 — 상담료를 «지갑에서» 빼는 자리 «한 곳»  [대표님 지시]
//    「상담사 연결버튼을 누르고 난 후 ★결제시점을 어느 위치에 둘지」
//    「이름과 핸드폰 번호 넣고 저장 버튼을 누르는 순간」
//    「잔액확인은 ★"전문가와 상담신청하기"를 누를 때 먼저 확인하는 걸로」
//    「지갑에서 비용을 빼가고 … 안내 팝업 … ★각종 서비스들 모두 통일해줘」
//
//   [까닭 — 대표님 말씀]
//     「상담사 연결하기 버튼만 누르고 결제를 한 경우에는
//       ★일정이 가능한 상담사가 없을 경우, 환불해야 되는 복잡한 문제가 발생할 수 있거든」
//     ⇒ 그래서 ★돈은 «예약이 다 끝난 뒤» 에 움직입니다.
//     ⇒ 2부 4장이 「차감을 맨 마지막에 두고, 실패하면 반드시 되돌리십시오」라
//       적어 둔 것과 ★같은 결론입니다. 걱정한 것만 달랐습니다.
//
//   ★때가 «둘» 입니다 — 둘 다 있어야 합니다
//     ① 「전문가와 상담하기 · 50,000원」 누를 때  → ★볼 뿐, 안 뺍니다 (wallet_check)
//        ⇒ 상담사·시간·이름을 «고르기 전» 에 막아 헛수고를 없앱니다.
//     ② 「이 시간으로 상담 예약하기」 뒤, 슬롯까지 잠긴 «다음» → ★뺍니다 (wallet_use)
//        ⇒ 여기서 모자라면 ★예약을 되돌리고 «아무것도 안 뺍니다».
//     ⛔⛔ ①을 넣었으니 ②는 안 봐도 된다고 보지 마십시오 —
//        ★지갑은 세 앱(명카페·큐보드·골프온) «공용» 입니다.
//        그 사이 다른 앱에서 쓰면 잔액이 줄어 있습니다.
//
//   🔴🔴 ★WALLET_GATE_ON — 이 하나로 켜고 끕니다
//     지금은 ★false 입니다. 카카오 로그인이 붙기 «전» 이기 때문입니다 —
//       · 지금은 ★로그인 없이도 예약이 됩니다 (consultant-select 의 user_id ?? null).
//         켜면 비회원이 예약을 «못 하게» 됩니다.
//       · 지갑 함수는 로그인한 사람의 것만 봅니다 (인자에 user_id 를 «못» 넣습니다).
//     ⇒ 카카오가 붙은 «뒤» 에 ★이 값만 true 로 바꾸십시오. 다른 곳은 손댈 것이 없습니다.
//     ⛔ 화면마다 이 판단을 «다시 적지» 마십시오 — 열일곱 곳이 갈립니다.
// ══════════════════════════════════════════════════════════════════

import { supabase } from '@/lib/supabase'

/**
 *  🔴 상담료를 지갑에서 뺄지. ★카카오 뒤에 true 로 바꾸십시오.
 *  ⚠️ false 인 동안에는 잔액을 «보지도, 빼지도» 않습니다 — 지금과 똑같이 돕니다.
 */
//  🔴🔴 ★2026-09-09 — «시험용» 으로 켰습니다 [대표님 「ai결제창이 안붙는다」]
//     ⚠️ 켜면 ★상담료 관문도 «함께» 켜집니다 — 값이 하나입니다.
//        ⇒ 켜 두는 동안 ★비회원은 상담 예약을 «못 합니다» (지갑은 로그인한 사람 것만 봅니다).
//     ⛔ 손님을 받기 시작하시면, 카카오가 붙기 «전» 에는 ★false 로 되돌리십시오.
export const WALLET_GATE_ON = false

/** 명카페 앱 딱지 — mc_ledger 의 service 칸에 들어갑니다 */
const SERVICE = 'myc'

// ── 손님에게 보이는 말 ──────────────────────────────────────────────
//  ⚠️ 이 앱은 ★~해요체 입니다 (「예약이 완료됐어요」·「준비하고 있어요」).
//     ⛔ 「차감되었습니다」처럼 딱딱한 말을 쓰지 마십시오 — 혼자 튑니다.
//  ⚠️ ★「남은 잔액」을 «반드시» 함께 보여 주십시오 [1부 3-1] —
//     이 한 줄이 「왜 돈이 줄었냐」는 문의를 막습니다.
//  ⛔ 말을 화면마다 다시 적지 마십시오. 여기가 «한 곳» 입니다.
export const WALLET_MSG = {
  /** ① 잔액이 모자랄 때 — 상담 신청을 누른 «그 자리» 에서 */
  short: (price: number, balance: number) =>
    `잔액이 모자라요.\n\n` +
    `상담료 ${won(price)}\n` +
    `지갑에 ${won(balance)} 있어요\n` +
    `${won(price - balance)}을 더 채우시면 돼요.`,

  /** ② 예약이 끝나고 돈이 빠졌을 때 */
  used: (used: number, balance: number) =>
    `지갑에서 ${won(used)}을 냈어요.\n남은 잔액 ${won(balance)}`,

  /** ③ 도중에 잘못됐을 때 — «돈은 안 빠졌다» 를 «먼저» 말합니다 */
  rolledBack:
    '예약을 마치지 못했어요.\n잠시 뒤에 다시 해 주세요.\n\n' +
    '지갑에서 빠진 돈은 없어요.\n고른 시간도 그대로 남아 있어요.',

  /** 로그인이 없을 때 */
  needLogin: '상담 예약은 로그인 후에 하실 수 있어요.',

  // ── AI 분석 (2026-09-09 · 대표님 「ai결제창이 진로적성보기 클릭시 나오는 걸로」) ──
  //  ⚠️ 2부 4장 원칙 ① — ★AI 분석은 «단추를 누를 때» 뺍니다. 실패하면 되돌립니다.
  //  ⛔ 「차감되었습니다」처럼 딱딱하게 쓰지 마십시오 — 이 앱은 ~해요체입니다.

  /** ★보시기 «전» 에 여쭙습니다 — 얼마가 드는지·얼마가 남는지 «미리» 보여 드립니다 */
  aiAsk: (label: string, need: number, balance: number) =>
    `${label}에 ${won(need)}이 들어요.\n지갑에서 빠집니다.\n\n` +
    `지금 ${won(balance)} → 보시면 ${won(balance - need)}\n\n` +
    `보시겠어요?`,

  /** AI 를 못 돌렸을 때 — «돈은 안 빠졌다» 를 «먼저» 말합니다 */
  aiRolledBack:
    '분석을 마치지 못했어요.\n잠시 뒤에 다시 해 주세요.\n\n지갑에서 빠진 돈은 없어요.',

  /** 로그인이 없을 때 (AI) */
  aiNeedLogin: 'AI 분석은 로그인 후에 보실 수 있어요.',
}

/** 1234567 → 「1,234,567원」 */
export function won(n: number): string {
  return `${Math.max(0, Math.round(n)).toLocaleString()}원`
}

export type CheckResult =
  | { gate: 'off' }
  | { gate: 'on'; ok: true; balance: number; need: number }
  | { gate: 'on'; ok: false; reason: 'no_login' | 'not_enough' | 'error'; balance: number; need: number }

/**
 *  ① 「전문가와 상담하기」 를 누른 «그 순간» — ★보기만 합니다.
 *  ⛔ 여기서 빼지 마십시오. 상담사가 없어 못 잡으면 되돌려 드려야 합니다 [대표님].
 */
export async function checkConsultBalance(priceKey: string): Promise<CheckResult> {
  if (!WALLET_GATE_ON) return { gate: 'off' }
  try {
    const { data: u } = await supabase.auth.getUser()
    if (!u?.user) return { gate: 'on', ok: false, reason: 'no_login', balance: 0, need: 0 }

    //  ⛔ 인자에 «금액» 을 넣지 않습니다 — 서버가 mc_price 를 보고 셉니다 [1부 3-3].
    const { data, error } = await supabase.rpc('wallet_check', {
      p_service: SERVICE, p_item: priceKey, p_qty: 1,
    })
    if (error || !data) return { gate: 'on', ok: false, reason: 'error', balance: 0, need: 0 }

    const r = data as { ok: boolean; need: number; balance: number }
    if (r.ok) return { gate: 'on', ok: true, balance: r.balance ?? 0, need: r.need ?? 0 }
    return { gate: 'on', ok: false, reason: 'not_enough', balance: r.balance ?? 0, need: r.need ?? 0 }
  } catch (e) {
    console.error('[wallet] check 실패', e)
    return { gate: 'on', ok: false, reason: 'error', balance: 0, need: 0 }
  }
}

// ══════════════════════════════════════════════════════════════════
//  ★2026-09-09 — AI 분석 차감  [대표님 「ai결제창이 진로적성보기 클릭시 나오는 걸로」]
//
//   ★때가 «둘» 입니다 — 상담과 «같은 모양» 입니다 [대표님 「모두 통일해줘」]
//     ① 「진로적성 보기」 를 누를 때  → ★보고 여쭙기만 합니다 (안 뺍니다)
//        ⇒ 얼마가 드는지·얼마가 남는지 미리 보여 드립니다.
//        ⇒ 여기서 빼면, MBTI 를 고르러 가시거나 되돌아가실 때
//          ★「돈은 빠졌는데 안 봤다」 가 됩니다.
//     ② 결과 화면에서 ★AI 가 «실제로 돌기 직전» → 뺍니다
//        ⇒ AI 가 실패하면 ★wallet_refund 로 «되돌립니다» (2부 4장 원칙 ①).
//
//   🔴🔴 ⚠️ 1부 8-3 — 「API 셋이 실패해도 status 200」 인 자리가 있습니다.
//      ★실패를 «성공으로 알고» 돈을 빼면 안 됩니다.
//      ⇒ 화면이 setTongState('failed') 로 가는 «모든» 길에서 되돌리십시오.
//
//   ⛔ 낱말은 mc_price 의 것을 그대로 쓰십시오 — career_ai · saju_deep · couple_ai …
//      2부 5-2 에 스물넷이 적혀 있습니다. ⛔ 새로 지어내지 마십시오.
// ══════════════════════════════════════════════════════════════════

export type UseResult =
  | { gate: 'off' }
  | { gate: 'on'; ok: true; used: number; balance: number; ledgerId?: string }
  | { gate: 'on'; ok: false }

/**
 *  ② 예약이 «다 끝난 뒤» — 슬롯까지 잠긴 다음에 부릅니다.
 *  ⚠️ 여기서 false 가 나오면 ★예약을 되돌리십시오. 돈은 «안 빠진» 상태입니다.
 */
export async function useConsultFee(
  priceKey: string, ref: string, memo: string,
): Promise<UseResult> {
  if (!WALLET_GATE_ON) return { gate: 'off' }
  try {
    const { data, error } = await supabase.rpc('wallet_use', {
      p_service: SERVICE, p_item: priceKey, p_qty: 1, p_ref: ref, p_memo: memo,
    })
    if (error || !data) return { gate: 'on', ok: false }
    const r = data as { ok: boolean; used: number; balance: number }
    if (!r.ok) return { gate: 'on', ok: false }
    return { gate: 'on', ok: true, used: r.used ?? 0, balance: r.balance ?? 0 }
  } catch (e) {
    console.error('[wallet] use 실패', e)
    return { gate: 'on', ok: false }
  }
}

/**
 *  ① AI 를 보시기 «전» — 잔액을 보고 «여쭙습니다». ★빼지 않습니다.
 *  @returns true 면 그대로 진행, false 면 «멈춥니다» (모자라거나 손님이 취소).
 */
export async function askBeforeAi(
  item: string, label: string, onCharge: () => void,
): Promise<boolean> {
  const r = await checkAiBalance(item)
  if (r.gate === 'off') return true
  if (!r.ok) {
    if (r.reason === 'no_login') { alert(WALLET_MSG.aiNeedLogin); return false }
    if (r.reason === 'not_enough') {
      //  ⛔⛔ ★[그냥 닫기] 를 «꼭» 두십시오 [2부 4장 원칙 ③] — 가두면 화가 납니다.
      if (confirm(`${WALLET_MSG.short(r.need, r.balance)}\n\n충전하러 가시겠어요?`)) onCharge()
      return false
    }
    alert('잔액을 확인하지 못했어요.\n잠시 뒤에 다시 해 주세요.')
    return false
  }
  return confirm(WALLET_MSG.aiAsk(label, r.need, r.balance))
}

/** 잔액 보기 — 상담과 «같은 함수» 를 씁니다. 낱말만 다릅니다. */
export async function checkAiBalance(item: string): Promise<CheckResult> {
  return checkConsultBalance(item)
}

/**
 *  ② AI 가 «돌기 직전» — 뺍니다.
 *  ⚠️ 돌려주는 ledgerId 를 ★들고 계십시오. 실패하면 그것으로 되돌립니다.
 */
export async function useAiFee(item: string, ref: string, memo: string): Promise<UseResult> {
  return useConsultFee(item, ref, memo)
}

/**
 *  ③ AI 가 «실패» 했을 때 — 되돌립니다.
 *  ⛔ 되돌리기를 빼지 마십시오 — 「돈은 빠졌는데 못 봤다」 가 «가장 나쁩니다».
 *  ⚠️ 이미 되돌린 것은 다시 안 됩니다 (서버가 막습니다) — 두 번 불러도 안전합니다.
 */
export async function refundAiFee(ledgerId: string, memo: string): Promise<boolean> {
  if (!WALLET_GATE_ON) return true
  try {
    const { data, error } = await supabase.rpc('wallet_refund', {
      p_ledger_id: ledgerId, p_memo: memo,
    })
    if (error || !data) return false
    return !!(data as { ok: boolean }).ok
  } catch (e) {
    console.error('[wallet] refund 실패', e)
    return false
  }
}
