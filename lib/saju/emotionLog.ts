// lib/saju/emotionLog.ts
// ============================================================================
// 감정 로그 — 마이페이지에서 하루 1번 "오늘 기분"을 기록.
// ----------------------------------------------------------------------------
//   - 신규 테이블 emotion_logs (user_id + log_date 유니크 = 하루 1개)
//   - daily_fortune 과 완전히 같은 "하루 1개 upsert" 패턴을 그대로 옮겼다.
//   - 값: mood(감정 코드 0~4) · note(한 줄 기록, 선택)
//   - 정식오픈 전 RLS 켤 때 이 테이블도 정책에 포함할 것.
//
// [로그인 아이디 기준] 저장·조회 모두 auth.getUser()의 user_id로 묶는다.
//   → AI 아침 인사가 "요즘 불안한 날이 많으셨네요" 같은 맥락을 잡는 재료.
// ============================================================================

import { supabase } from '@/lib/supabase'

// 감정 5종 (마이페이지 목업 확정: 울적·불안·보통·평온·설렘)
export type MoodCode = 0 | 1 | 2 | 3 | 4

export interface MoodOption {
  code: MoodCode
  emoji: string
  label: string
}

export const MOODS: MoodOption[] = [
  { code: 0, emoji: '😔', label: '울적한 하루' },
  { code: 1, emoji: '😰', label: '불안한 마음' },
  { code: 2, emoji: '😐', label: '그저 그런 날' },
  { code: 3, emoji: '😌', label: '평온한 하루' },
  { code: 4, emoji: '🤩', label: '설레는 하루' },
]

export function moodByCode(code: number): MoodOption {
  return MOODS.find((m) => m.code === code) || MOODS[2]
}

export interface EmotionLog {
  logDate: string   // 'YYYY-MM-DD' (KST)
  mood: MoodCode
  note?: string | null
}

// 한국시간 오늘 날짜 (daily_fortune의 todayKST와 동일 규칙)
function todayKST(): string {
  const now = new Date()
  const kst = new Date(now.getTime() + (9 * 60 + now.getTimezoneOffset()) * 60000)
  const y = kst.getFullYear()
  const m = String(kst.getMonth() + 1).padStart(2, '0')
  const d = String(kst.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser()
  return data.user?.id ?? null
}

// 오늘 감정 저장 (하루 1개 — 다시 누르면 덮어씀)
export async function saveTodayMood(mood: MoodCode, note?: string): Promise<boolean> {
  const user_id = await uid()
  if (!user_id) return false
  const { error } = await supabase
    .from('emotion_logs')
    .upsert(
      { user_id, log_date: todayKST(), mood, note: note ?? null },
      { onConflict: 'user_id,log_date' }
    )
  if (error) {
    console.error('[emotionLog] save error', error.message)
    return false
  }
  return true
}

// 오늘 감정 불러오기 (없으면 null)
export async function getTodayMood(): Promise<EmotionLog | null> {
  const user_id = await uid()
  if (!user_id) return null
  const { data, error } = await supabase
    .from('emotion_logs')
    .select('log_date, mood, note')
    .eq('user_id', user_id)
    .eq('log_date', todayKST())
    .maybeSingle()
  if (error || !data) return null
  return { logDate: data.log_date, mood: data.mood as MoodCode, note: data.note }
}

// 최근 N일 감정 (AI 아침 인사·통계용, 최신순)
export async function listRecentMoods(days = 14): Promise<EmotionLog[]> {
  const user_id = await uid()
  if (!user_id) return []
  const { data, error } = await supabase
    .from('emotion_logs')
    .select('log_date, mood, note')
    .eq('user_id', user_id)
    .order('log_date', { ascending: false })
    .limit(days)
  if (error || !data) return []
  return data.map((r) => ({ logDate: r.log_date, mood: r.mood as MoodCode, note: r.note }))
}
