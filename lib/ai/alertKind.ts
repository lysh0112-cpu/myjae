// lib/ai/alertKind.ts
//
// ★2026-09-11 (6부) [대표님 「과속방지턱과 알림은 여기서 해결해 줘야지」] — 알림 분류 (검사 48)
//   AI 오류 기록 한 줄이 «대표님이 곧바로 아셔야 할 일» 인지 가립니다.
//   관리자 화면의 빨간 띠(AiAlertBanner)와 메일 알림(errorLog)이 «같은» 분류를 씁니다.
//   ⚠️ 화면(브라우저)에서도 불러 쓰므로 서버 전용 부품을 import 하지 마십시오.
//
//   [겪음] 9월 11일 — 화면 버그로 AI 호출이 폭주해 미납 US$113.59 · 지출 한도 도달.
//          대표님은 «풀이가 안 나온다» 는 것을 보고서야 아셨습니다.

export type AlertKind = 'billing' | 'limit' | 'key' | 'bump'

/** 오류 한 줄 → 알릴 종류 (알릴 필요 없으면 null) */
export function alertKindOf(apiName: string, status: number | null, message: string): AlertKind | null {
  const m = (message || '').toLowerCase()
  if (apiName.startsWith('speed-bump')) return 'bump'
  if (m.includes('credit balance is too low') || m.includes('billing hard limit')) return 'billing'
  if (m.includes('usage limit') || m.includes('spend limit') || m.includes('regain access')) return 'limit'
  if (status === 401 || m.includes('invalid x-api-key') || m.includes('authentication_error')) return 'key'
  return null   // 529 붐빔 · 일시 오류는 알리지 않습니다 (우리가 할 일이 없음)
}

export const ALERT_TEXT: Record<AlertKind, { title: string; todo: string }> = {
  billing: { title: 'AI 크레딧 잔액이 바닥났어요 — 모든 AI 풀이가 멈춰 있어요',
    todo: 'Claude 콘솔(platform.claude.com) → 결제 → 크레딧 구매' },
  limit: { title: 'AI 월 지출 한도에 닿았어요 — 모든 AI 풀이가 멈춰 있어요',
    todo: 'Claude 콘솔 → 결제 → 월별 지출 한도 «제한 조정» (또는 다음 달 1일까지 기다리기)' },
  key: { title: 'AI 열쇠(API 키)에 문제가 있어요 — 모든 AI 풀이가 멈춰 있어요',
    todo: 'Vercel → Settings → Environment Variables → ANTHROPIC_API_KEY 확인' },
  bump: { title: '과속 방지턱에 걸린 호출이 있어요 — 화면 버그로 AI 를 되풀이해 부르고 있을 수 있어요',
    todo: '관리자 → AI관리 → AI 오류 탭에서 어느 창구인지 보고, 그 화면을 닫은 뒤 개발 쪽에 알려 주세요' },
}
