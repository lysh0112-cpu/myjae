-- _SQL_monthly_fortune.sql
-- 이달의 운세 저장 테이블
--   AI가 쓴 글만 저장한다. 점수는 화면에서 매번 계산하므로 저장하지 않는다.
--   (점수를 저장하면 배점을 바꿔도 옛 점수가 그대로 남는 문제가 생긴다)
--
-- 실행: Supabase SQL 편집기에 붙여넣고 Run
-- 작성일: 2026-07-20

create table if not exists public.monthly_fortune (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,

  -- 어느 달인가 (양력 기준)
  year          int  not null,
  month         int  not null,          -- 1~12
  month_stem    text,                   -- 이달 천간 (예: 乙)
  month_branch  text,                   -- 이달 지지 (예: 未)

  -- AI가 쓴 글
  summary       text,
  love          text,
  money         text,
  health        text,
  lucky_color   text,
  lucky_dir     text,
  insight       text,                   -- 이달의 명리 한 조각 (순화된 문장)

  created_at    timestamptz not null default now(),

  -- 한 사람이 같은 달을 두 번 만들지 않도록
  unique (user_id, year, month)
);

-- 조회 속도
create index if not exists idx_monthly_fortune_user_ym
  on public.monthly_fortune (user_id, year, month);

-- ── RLS: 자기 것만 보고 쓸 수 있게 ────────────────────────────
alter table public.monthly_fortune enable row level security;

drop policy if exists "monthly_fortune_select_own" on public.monthly_fortune;
create policy "monthly_fortune_select_own"
  on public.monthly_fortune for select
  using (auth.uid() = user_id);

drop policy if exists "monthly_fortune_insert_own" on public.monthly_fortune;
create policy "monthly_fortune_insert_own"
  on public.monthly_fortune for insert
  with check (auth.uid() = user_id);

drop policy if exists "monthly_fortune_update_own" on public.monthly_fortune;
create policy "monthly_fortune_update_own"
  on public.monthly_fortune for update
  using (auth.uid() = user_id);

drop policy if exists "monthly_fortune_delete_own" on public.monthly_fortune;
create policy "monthly_fortune_delete_own"
  on public.monthly_fortune for delete
  using (auth.uid() = user_id);

-- ── 참고 ──────────────────────────────────────────────────────
-- 글을 다시 만들고 싶을 때 (프롬프트를 고친 뒤 등):
--   delete from public.monthly_fortune where year = 2026 and month = 7;
