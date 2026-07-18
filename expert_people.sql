-- ============================================================
-- 명카페 · 전문가용 인적사항 테이블 (expert_people)
--   고객용 saju_records와 완전 분리.
--   전문가(연재쌤·상담사)가 만세력 조회할 사람들의 인적사항만 보관.
--   Supabase SQL 편집기에 붙여넣고 [Run] 실행.
-- ============================================================

-- 1) 테이블 생성
create table if not exists public.expert_people (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null,                 -- 이름·별명
  memo         text,                          -- 상담 참고 메모 (선택)
  gender       text not null default '남',    -- '남' | '여'
  cal_type     text not null default '양력',  -- '양력' | '음력'
  birth_year   int  not null,
  birth_month  int  not null,
  birth_day    int  not null,
  leap_month   boolean not null default false,
  birth_hour   text not null default '모름',  -- '0'~'11' | '모름'
  sort         int  not null default 0,
  created_at   timestamptz not null default now()
);

-- 2) 조회 성능용 인덱스 (내 목록을 최신순으로)
create index if not exists idx_expert_people_user_created
  on public.expert_people (user_id, created_at desc);

-- 3) RLS 켜기 — 본인 데이터만 접근
alter table public.expert_people enable row level security;

drop policy if exists "expert_people_select_own" on public.expert_people;
create policy "expert_people_select_own"
  on public.expert_people for select
  using (auth.uid() = user_id);

drop policy if exists "expert_people_insert_own" on public.expert_people;
create policy "expert_people_insert_own"
  on public.expert_people for insert
  with check (auth.uid() = user_id);

drop policy if exists "expert_people_update_own" on public.expert_people;
create policy "expert_people_update_own"
  on public.expert_people for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "expert_people_delete_own" on public.expert_people;
create policy "expert_people_delete_own"
  on public.expert_people for delete
  using (auth.uid() = user_id);

-- 완료. (기존 service_type='expert' 데이터는 없으므로 이전 작업 불필요)
