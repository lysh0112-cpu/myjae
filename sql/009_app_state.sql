-- ═══════════════════════════════════════════════════════════
--  009_app_state.sql — 화면 사이 자료 잇기
-- ───────────────────────────────────────────────────────────
--  ★ 직원 화면에서 올린 소식이 조합원 폰에도 나와야 한다.
--    브라우저 저장소는 그 기기 안에서만 통해서
--    컴퓨터에서 올린 것이 폰에 가지 않는다.
--    서버에 담아야 어느 기기에서 열어도 같은 것을 본다.
--
--  ★ 키-값 한 장으로 받는다.
--    소식 · 총회 · 설문 · 동의서를 각각 표로 나누면
--    화면 고칠 때마다 SQL 도 함께 고쳐야 한다.
--    시연 단계에서는 이 편이 낫고, 자료가 굳으면 표를 나눈다.
--
--  ★ 지금은 로그인이 없어 anon 이 읽고 쓴다.
--    조합원 명부나 감정평가는 절대 여기 두지 말 것.
--    소식 · 총회 안건처럼 어차피 공개되는 것만 담는다.
--    Supabase Auth 를 붙이면 정책을 조합 직원으로 좁힌다.
--
--  ★★★ 이 표만은 public 스키마에 둔다. daara 로 옮기지 말 것 ★★★
--
--    다른 SQL 파일은 맨 앞에 SET search_path = daara, public; 이 있다.
--    이 파일에만 그 줄이 없다. 빠뜨린 것이 아니라 일부러 없는 것이다.
--
--    hub.js 는 Supabase REST 를 이렇게 부른다.
--        GET  {SB_URL}/rest/v1/app_state?tenant_id=eq.…&key=eq.…
--    Accept-Profile · Content-Profile 헤더를 붙이지 않으므로
--    PostgREST 는 public 스키마만 쳐다본다.
--
--    daara.app_state 로 옮기면 표는 멀쩡히 있는데
--    조합원 폰에서 소식 · 동의서 · 자료실 · 회계 · 실거래가
--    전부 빈 화면이 된다. 오류도 안 나고 그냥 0건이 온다.
--    (오늘 국토부 XML 파서가 조용히 0건이던 것과 같은 종류의 사고다)
--
--    굳이 옮기셔야 한다면 hub.js 의 fetch 세 군데(hubPull · hubPush ·
--    hubWipe)에 아래 두 헤더를 함께 넣으셔야 한다.
--        "Accept-Profile":  "daara"     ← 읽을 때
--        "Content-Profile": "daara"     ← 쓸 때
--    그리고 daara 스키마를 Supabase 대시보드
--    Settings → API → Exposed schemas 에 등록해야 한다.
--    지금은 그럴 이유가 없다. 여기 담기는 것은 어차피 공개 자료뿐이다.
-- ═══════════════════════════════════════════════════════════

-- ★ 스키마를 눈에 보이게 못 박는다.
--   SQL Editor 는 열 때마다 search_path 가 다를 수 있고,
--   앞 파일을 돌린 창에서 이어 붙이면 daara 에 만들어져 버린다.
SET search_path = public;

create table if not exists app_state (
  tenant_id   text not null,
  key         text not null,
  value       jsonb not null,
  updated_at  timestamptz not null default now(),
  updated_by  text,
  primary key (tenant_id, key)
);

comment on table  app_state is '화면 사이 공유 자료 (소식 · 총회 · 설문 등)';
comment on column app_state.tenant_id is '구역 코드 · MIA-002 형식';
comment on column app_state.key        is 'news · meeting · survey 등 화면이 정하는 이름';

alter table app_state enable row level security;
alter table app_state force  row level security;

-- ── 정책 ────────────────────────────────────────────────────
--  ★ 지금은 시연이라 누구나 읽고 쓴다.
--    로그인을 붙이면 아래 정책을 지우고
--    조합 직원 역할만 쓸 수 있도록 좁혀야 한다.
drop policy if exists app_state_read  on app_state;
drop policy if exists app_state_write on app_state;

create policy app_state_read on app_state
  for select using (true);

create policy app_state_write on app_state
  for all using (true) with check (true);

-- 갱신 시각 자동
create or replace function app_state_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists app_state_touch on app_state;
create trigger app_state_touch
  before update on app_state
  for each row execute function app_state_touch();

-- 실시간 구독 (다른 기기에서 바뀌면 바로 알 수 있게)
--
-- ★ 이 파일에서 두 번 돌려도 되는 유일한 예외였던 줄이다 (2026-08-22 수리).
--   위쪽은 전부 if not exists · drop … if exists 로 되어 있어
--   몇 번을 붙여 넣어도 괜찮지만, 아래 alter publication 만은
--   이미 들어 있으면 오류가 났다.
--       relation "app_state" is already member of publication
--   그러면 SQL Editor 가 빨갛게 뜨고, 앞의 것들이 잘 들어갔는지
--   알 수 없어 처음부터 다시 돌리게 된다.
--   이미 들어 있으면 조용히 넘어가도록 감쌌다.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename  = 'app_state'
  ) then
    alter publication supabase_realtime add table public.app_state;
  end if;
end $$;
