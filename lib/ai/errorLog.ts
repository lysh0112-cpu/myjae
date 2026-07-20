// lib/ai/errorLog.ts
// ----------------------------------------------------------------------------
// AI 호출이 실패했을 때 그 이유를 DB(ai_error_logs)에 남긴다.
//
// [왜 필요한가]
//   console.error 는 Vercel 로그에만 남아서, 대표님이 화면에서 볼 수 없다.
//   2026-07-20 하루에만 세 번(물상도·감정기록·통변) "이유를 모르는 멈춤"이
//   있었고, 매번 개발자 도구와 결제 대시보드를 뒤져야 했다.
//   이 표에 남겨두면 관리자 화면 "AI 오류" 탭에서 바로 확인할 수 있다.
//
// [쓰는 법]  API 라우트 안에서
//   if (!res.ok) {
//     await logAiError('tongbyeon', res.status, await res.text())
//   }
//
// ※ 기록에 실패하더라도 절대 원래 기능을 방해하지 않는다(조용히 넘어간다).
// ----------------------------------------------------------------------------

import { createClient } from '@supabase/supabase-js'

/**
 * 영어 오류 메시지를 보고 우리말 짐작 원인을 붙인다.
 * 대표님이 영어를 읽지 않고도 무엇을 해야 할지 알 수 있게 하는 게 목적.
 */
export function guessHint(status: number | null, message: string): string {
  const m = (message || '').toLowerCase()

  if (m.includes('credit balance is too low') || m.includes('billing hard limit')) {
    return '결제 잔액이 바닥났어요. 크레딧을 충전해 주세요.'
  }
  if (status === 401 || m.includes('invalid x-api-key') || m.includes('authentication')) {
    return 'API 키가 잘못됐거나 만료됐어요. Vercel 환경변수를 확인해 주세요.'
  }
  if (status === 429 || m.includes('rate limit')) {
    return '한꺼번에 너무 많이 불렀어요. 잠시 뒤에는 다시 될 거예요.'
  }
  if (status === 529 || m.includes('overloaded')) {
    return 'AI 쪽이 잠시 붐비고 있어요. 조금 뒤 다시 시도하면 됩니다.'
  }
  if (m.includes('row-level security')) {
    return '데이터베이스 접근 권한(RLS) 설정이 빠졌어요.'
  }
  if (status && status >= 500) {
    return 'AI 쪽 일시적인 문제로 보여요. 조금 뒤 다시 시도해 주세요.'
  }
  return '원인을 자동으로 알아내지 못했어요. 아래 원문을 확인해 주세요.'
}

/**
 * 실패 이유를 ai_error_logs 에 남긴다.
 * @param apiName  어느 기능인지 ('tongbyeon', 'mulsang' 등)
 * @param status   HTTP 상태
 * @param message  실패 이유 원문
 */
export async function logAiError(
  apiName: string,
  status: number | null,
  message: unknown,
): Promise<void> {
  // 서버 로그에도 남긴다(Vercel Logs에서 바로 보이도록).
  console.error(`[${apiName}] AI 호출 실패:`, status, message)

  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    // 기록은 service_role 키로 넣는다(RLS를 통과해야 하므로).
    // 없으면 anon 키로라도 시도한다.
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return

    const text = typeof message === 'string' ? message : JSON.stringify(message)
    const trimmed = (text || '').slice(0, 1000)

    const supabase = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await supabase.from('ai_error_logs').insert({
      api_name: apiName,
      status: status ?? null,
      message: trimmed,
      hint: guessHint(status, trimmed),
    })
  } catch {
    // 기록 자체가 실패해도 원래 기능을 막지 않는다.
  }
}
