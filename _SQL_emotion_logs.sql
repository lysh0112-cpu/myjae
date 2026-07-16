-- ============================================================================
-- 감정 로그 테이블 (마이페이지 "오늘 기분")
-- Supabase 대시보드 > SQL Editor 에서 1회 실행.
-- https://supabase.com/dashboard/project/auvuwytatfcoawdrgunl/sql/new
-- ============================================================================

create table if not exists public.emotion_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  log_date   date not null,
  mood       smallint not null check (mood between 0 and 4),
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, log_date)   -- 하루 1개
);

-- 최근 감정 조회용 인덱스
create index if not exists idx_emotion_logs_user_date
  on public.emotion_logs (user_id, log_date desc);

-- ----------------------------------------------------------------------------
-- ⚠️ RLS: 개발 중에는 꺼둠(다른 테이블과 동일). 정식 오픈 전 아래를 켤 것.
-- ----------------------------------------------------------------------------
-- alter table public.emotion_logs enable row level security;
--
-- create policy "own emotion select" on public.emotion_logs
--   for select using (auth.uid() = user_id);
-- create policy "own emotion insert" on public.emotion_logs
--   for insert with check (auth.uid() = user_id);
-- create policy "own emotion update" on public.emotion_logs
--   for update using (auth.uid() = user_id);
-- create policy "own emotion delete" on public.emotion_logs
--   for delete using (auth.uid() = user_id);
