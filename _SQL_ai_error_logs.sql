-- ============================================================================
--  _SQL_ai_error_logs.sql
--  AI 호출이 실패했을 때 그 이유를 담는 표.
--
--  [왜 필요한가]
--    2026-08-04 새벽, 크레딧이 US$0.05 모자라 «열두 AI 기능이 전부» 멈췄습니다.
--    관리자 「AI 오류」 탭을 열었지만 이 표가 없어 아무것도 안 보였고,
--    결국 Vercel Logs 까지 뒤져서야 원인을 찾았습니다.
--    ⇒ 이 표가 있으면 대표님이 관리자 화면에서 «바로» 아실 수 있습니다.
--
--  [쓰는 곳]
--    lib/ai/errorLog.ts        logAiError() 가 여기에 넣습니다
--    app/admin/components/AiErrorLog.tsx   관리자 「AI 오류」 탭이 여기서 읽습니다
--
--  [실행법]  Supabase → SQL Editor → 통째로 붙여넣고 Run
--  ★두 번 실행해도 안전합니다 (IF NOT EXISTS).
-- ============================================================================

create table if not exists public.ai_error_logs (
  id          uuid        primary key default gen_random_uuid(),
  -- 어느 기능인지 ('tongbyeon' · 'mulsang' · 'naming' …)
  api_name    text        not null,
  -- HTTP 상태 (400 · 401 · 429 · 529 …). 못 받았으면 null
  status      integer,
  -- 실패 이유 원문 (errorLog.ts 가 1,000자로 잘라 넣습니다)
  message     text,
  -- guessHint() 가 붙인 우리말 짐작
  hint        text,
  created_at  timestamptz not null default now()
);

-- 관리자 화면이 「최근 것부터 100건」을 읽습니다. 그 조회를 위한 차례표.
create index if not exists ai_error_logs_created_at_idx
  on public.ai_error_logs (created_at desc);

-- ── 권한 ───────────────────────────────────────────────────────────────────
--  ⚠️ 이 표는 «오류 원문» 이 담깁니다. 손님께 보일 것이 아닙니다.
--     RLS 를 켜고, 정책을 «하나도» 두지 않습니다.
--       · 넣기  → service_role 키로 (RLS 를 지나갑니다) — logAiError 가 그렇게 합니다
--       · 읽기  → 정책이 없으므로 anon/authenticated 는 «못 읽습니다»
--     ★관리자 화면이 anon 키로 읽는다면 아래 «관리자 읽기» 블록을 여십시오.
alter table public.ai_error_logs enable row level security;

-- ── 관리자 읽기 (필요할 때만 여십시오) ──────────────────────────────────────
--  ⚠️ 관리자 화면(AiErrorLog.tsx)은 lib/supabase.ts 의 «anon 키» 로 읽습니다.
--     그대로 두면 탭이 계속 비어 보입니다.
--     ⇒ profiles 에 role 이 있다면 아래 정책을 켜 주십시오.
--     ⚠️ profiles 표의 «관리자 표시 방식» 을 모르면 켜지 마시고 먼저 확인하십시오.
--        (role 칸 이름과 값이 다르면 오히려 «아무도 못 읽게» 됩니다)
--
-- create policy "관리자만 읽기" on public.ai_error_logs
--   for select
--   using (
--     exists (
--       select 1 from public.profiles p
--       where p.id = auth.uid() and p.role = 'admin'
--     )
--   );

-- ── 오래된 기록 지우기 (원하실 때 손으로) ───────────────────────────────────
--  이 표는 실패했을 때만 쌓이니 빠르게 늘지 않습니다.
--  그래도 반년쯤 지난 것을 비우고 싶으시면 —
--
-- delete from public.ai_error_logs where created_at < now() - interval '180 days';

-- ── 확인 ───────────────────────────────────────────────────────────────────
--  실행한 뒤 이 줄로 표가 생겼는지 보실 수 있습니다.
--
-- select count(*) from public.ai_error_logs;
