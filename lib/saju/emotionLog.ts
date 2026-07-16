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

// 특정 월(YYYY, MM 1~12)의 감정 기록 — 흐름 그래프용. 날짜순(오름).
export async function listMonthMoods(year: number, month: number): Promise<EmotionLog[]> {
  const user_id = await uid()
  if (!user_id) return []
  const mm = String(month).padStart(2, '0')
  const start = `${year}-${mm}-01`
  const end = `${year}-${mm}-31`
  const { data, error } = await supabase
    .from('emotion_logs')
    .select('log_date, mood, note')
    .eq('user_id', user_id)
    .gte('log_date', start)
    .lte('log_date', end)
    .order('log_date', { ascending: true })
  if (error || !data) return []
  return data.map((r) => ({ logDate: r.log_date, mood: r.mood as MoodCode, note: r.note }))
}

// 총 기록 수 — 안내/격려 팝업 트리거용 (1·5·10번 → 그 뒤 10번마다)
export async function countMoods(): Promise<number> {
  const user_id = await uid()
  if (!user_id) return 0
  const { count, error } = await supabase
    .from('emotion_logs')
    .select('log_date', { count: 'exact', head: true })
    .eq('user_id', user_id)
  if (error || count == null) return 0
  return count
}

// 가장 오래된 기록 월 (달력/그래프 과거 넘김 한계) — 없으면 null
export async function firstMoodMonth(): Promise<{ year: number; month: number } | null> {
  const user_id = await uid()
  if (!user_id) return null
  const { data, error } = await supabase
    .from('emotion_logs')
    .select('log_date')
    .eq('user_id', user_id)
    .order('log_date', { ascending: true })
    .limit(1)
    .maybeSingle()
  if (error || !data) return null
  const [y, m] = data.log_date.split('-')
  return { year: Number(y), month: Number(m) }
}

// 이 횟수에 안내 팝업을 띄울지 (1·5·10 → 그 뒤 10 단위)
export function shouldShowNotice(count: number): boolean {
  if (count === 1 || count === 5 || count === 10) return true
  if (count > 10 && count % 10 === 0) return true
  return false
}

// 횟수별 안내 문구
export function noticeFor(count: number): { emoji: string; title: string; body: string } {
  if (count === 1) return {
    emoji: '🌿', title: '감정 기록을 시작해요',
    body: '오늘의 기분은 하루 한 번 기록되고, 그래프에서 언제든 다시 볼 수 있어요. 회원님만 볼 수 있고, 탈퇴 시 함께 삭제돼요.',
  }
  if (count === 5) return {
    emoji: '✨', title: '벌써 5번째 기록이에요!',
    body: '한 달 기분 흐름에서 지난 기분들을 돌아볼 수 있어요. 막대를 누르면 그날 기록이 보여요 😊',
  }
  return {
    emoji: '🎉', title: `${count}번 기록 달성!`,
    body: '꾸준히 마음을 살피고 계시네요. 그 마음이 참 소중해요 🌷',
  }
}
