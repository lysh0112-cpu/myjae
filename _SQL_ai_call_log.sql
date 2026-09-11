-- _SQL_ai_call_log.sql — AI 과속 방지턱이 호출을 세는 표 (2026-09-11 · 6부)
--   Supabase → SQL Editor 에 붙여 넣고 Run 한 번. 여러 번 돌려도 안전합니다.
--   ⚠️ 이 표가 없어도 서버 메모리 방지턱은 돕니다. 표가 있어야 서버가 여러 대일 때도 한 사람을 빠짐없이 셉니다.

create table if not exists ai_call_log (
  id bigserial primary key,
  user_id uuid not null,
  route text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_call_log_user_time on ai_call_log (user_id, created_at desc);

-- 손님은 이 표를 보지도 쓰지도 못합니다 (서버의 service_role 만 씁니다 — 정책을 만들지 않음)
alter table ai_call_log enable row level security;

-- 확인: 아래가 0 이면 표가 잘 만들어진 것입니다
select count(*) as ai_call_log_rows from ai_call_log;
