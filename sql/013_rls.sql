-- ═══════════════════════════════════════════════════════════
--  013_rls.sql — 자물쇠 잠그기 (2026-08-23)
-- ───────────────────────────────────────────────────────────
--  ★★★ 이 파일을 돌리는 순간 로그인 없이는 아무것도 안 됩니다 ★★★
--
--    돌리기 전에 아래를 **전부** 마치셔야 합니다.
--
--      ① 012_auth.sql 을 돌렸다
--      ② Supabase Authentication 에 계정을 만들었다
--      ③ platform_admins 에 운영자를 등록했다 (012 맨 아래 3번)
--      ④ memberships 에 조합 직원을 넣었다 (012 맨 아래 5번)
--      ⑤ 화면에 로그인이 붙었다 (hub.js 가 토큰을 보냄)
--
--    ★ ⑤ 없이 돌리면 조합원 앱도 직원 화면도 전부 빈 화면이 됩니다.
--      오류도 안 나고 그냥 0건이 옵니다. 되돌리려면 맨 아래 「되돌리기」를
--      돌리십시오. 그것도 함께 담아 두었습니다.
--
--  ★ 무엇이 바뀌나
--
--      지금   using (true)          누구나 읽고 쓴다
--      뒤     can_see(tenant_id)    자기 구역만 읽는다
--             can_manage(tenant_id) 직원 · 임원만 쓴다
--
--  ★★★ is_super() 를 정책에 넣지 않습니다 ★★★
--
--    「운영자면 다 본다」를 정책에 적으면 조건이 조금만 어긋나도
--    남의 조합 자료가 새어 나갑니다.
--    운영자는 012 의 console_* 함수로만 남의 구역을 봅니다.
--    그 함수들은 SECURITY DEFINER 라 자물쇠를 지나갑니다.
-- ═══════════════════════════════════════════════════════════

SET search_path = public;

-- ── 0. 준비가 됐는지 먼저 본다 ──────────────────────────────
--  ★ 운영자가 하나도 없는데 잠그면 아무도 못 들어옵니다.
do $$
begin
  if not exists (select 1 from platform_admins) then
    raise exception E'\n\n★ 운영자가 한 명도 등록되지 않았습니다.\n'
      '  012_auth.sql 맨 아래 3번으로 먼저 등록하십시오.\n'
      '  지금 잠그면 아무도 콘솔에 못 들어갑니다.\n';
  end if;
  if not exists (select 1 from memberships where role in ('staff','officer')) then
    raise exception E'\n\n★ 조합 직원 출입증이 하나도 없습니다.\n'
      '  012_auth.sql 맨 아래 5번으로 먼저 넣으십시오.\n'
      '  지금 잠그면 직원 화면에서 아무것도 못 올립니다.\n';
  end if;
end $$;

-- ── 1. app_state ────────────────────────────────────────────
--  소식 · 총회 · 설문 · 명부 · 회계 · 접수 …
--  화면이 쓰는 거의 모든 자료가 여기 있습니다.
drop policy if exists app_state_read  on app_state;
drop policy if exists app_state_write on app_state;

--  ★ 조합원도 읽어야 합니다. 소식 · 자료실 · 총회가 여기 있습니다.
create policy app_state_see on app_state
  for select to authenticated
  using (can_see(tenant_id));

--  ★ 쓰는 것은 직원 · 임원만.
--    읽는 것보다 이게 더 큽니다. 「가결」을 「부결」로 바꿀 수 있습니다.
create policy app_state_edit on app_state
  for all to authenticated
  using      (can_manage(tenant_id))
  with check (can_manage(tenant_id));

-- ── 2. 의결 기록 ────────────────────────────────────────────
drop policy if exists decision_all      on decision;
drop policy if exists decision_base_all on decision_base;
drop policy if exists decision_kind_ro  on decision_kind;

create policy decision_see on decision
  for select to authenticated using (can_see(tenant_id));
create policy decision_edit on decision
  for all to authenticated
  using (can_manage(tenant_id)) with check (can_manage(tenant_id));

create policy decision_base_see on decision_base
  for select to authenticated using (can_see(tenant_id));
create policy decision_base_edit on decision_base
  for all to authenticated
  using (can_manage(tenant_id)) with check (can_manage(tenant_id));

--  회의 종류는 구역 구분이 없는 공통표라 읽기만 엽니다.
create policy decision_kind_see on decision_kind
  for select to authenticated using (true);

-- ── 3. 구역 · 출입증 ────────────────────────────────────────
alter table orgs        enable row level security;
alter table memberships enable row level security;

drop policy if exists orgs_see        on orgs;
drop policy if exists memberships_see on memberships;

--  내가 속한 구역만 보입니다. 구역 목록으로 남의 조합을 훑을 수 없습니다.
create policy orgs_see on orgs
  for select to authenticated using (can_see(id));

--  ★ 내 출입증만 봅니다. 남이 누구인지 알 수 없습니다.
--    조합 직원도 마찬가지입니다. 사람 목록은 콘솔 함수로만 봅니다.
create policy memberships_see on memberships
  for select to authenticated using (user_id = auth.uid());

--  ★ 쓰기 정책은 없습니다.
--    출입증을 스스로 만들 수 있으면 자물쇠가 없는 것과 같습니다.
--    주고 거두는 일은 console_grant · console_revoke 로만 합니다.

-- ── 4. 파일 저장소 ──────────────────────────────────────────
--  ★ 동의서 스캔에 조합원 이름과 서명이 있습니다.
--    지금은 경로만 알면 누구나 열고, 남이 지울 수도 있습니다.
--
--  ★ 경로 규칙 :  MIA-002__arc__AR-2026-001.pdf
--                 ^^^^^^^ 여기가 구역 코드입니다 (hubPath 가 붙입니다)
--    그래서 파일 이름 앞부분을 잘라 can_see 로 물어볼 수 있습니다.
drop policy if exists "다알아 파일 올리기" on storage.objects;
drop policy if exists "다알아 파일 보기"   on storage.objects;
drop policy if exists "다알아 파일 바꾸기" on storage.objects;
drop policy if exists "다알아 파일 지우기" on storage.objects;

create policy "다알아 파일 보기" on storage.objects
  for select to authenticated
  using (bucket_id = 'consent-scan'
         and can_see(split_part(name, '__', 1)));

create policy "다알아 파일 올리기" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'consent-scan'
              and can_manage(split_part(name, '__', 1)));

create policy "다알아 파일 바꾸기" on storage.objects
  for update to authenticated
  using      (bucket_id = 'consent-scan' and can_manage(split_part(name, '__', 1)))
  with check (bucket_id = 'consent-scan' and can_manage(split_part(name, '__', 1)));

create policy "다알아 파일 지우기" on storage.objects
  for delete to authenticated
  using (bucket_id = 'consent-scan'
         and can_manage(split_part(name, '__', 1)));

notify pgrst, 'reload schema';

-- ── 5. 확인 ────────────────────────────────────────────────
--  ★ 돌리신 뒤 이 두 줄을 눈으로 보십시오.
--
--  select tablename, policyname, cmd, roles
--    from pg_policies where schemaname = 'public'
--   order by tablename, cmd;
--     → using(true) 가 남아 있으면 안 됩니다 (decision_kind 만 예외)
--
--  select count(*) from app_state;
--     → SQL Editor 는 service_role 이라 다 보입니다. 이건 정상입니다.
--       진짜 확인은 **로그아웃 상태의 브라우저**에서 하십시오.

-- ═══════════════════════════════════════════════════════════
--  ★ 되돌리기 — 잠근 뒤 아무것도 안 될 때
-- ───────────────────────────────────────────────────────────
--  로그인이 아직 안 붙었는데 잠가 버리셨으면 아래를 돌리십시오.
--  다시 예전처럼 열립니다. 그 뒤에 차근히 다시 하시면 됩니다.
--
--  drop policy if exists app_state_see  on app_state;
--  drop policy if exists app_state_edit on app_state;
--  create policy app_state_read  on app_state for select using (true);
--  create policy app_state_write on app_state for all using (true) with check (true);
--
--  drop policy if exists decision_see  on decision;
--  drop policy if exists decision_edit on decision;
--  create policy decision_all on decision
--    for all to anon, authenticated using (true) with check (true);
--
--  drop policy if exists decision_base_see  on decision_base;
--  drop policy if exists decision_base_edit on decision_base;
--  create policy decision_base_all on decision_base
--    for all to anon, authenticated using (true) with check (true);
--
--  drop policy if exists "다알아 파일 보기"   on storage.objects;
--  drop policy if exists "다알아 파일 올리기" on storage.objects;
--  drop policy if exists "다알아 파일 바꾸기" on storage.objects;
--  drop policy if exists "다알아 파일 지우기" on storage.objects;
--  create policy "다알아 파일 보기" on storage.objects
--    for select to anon, authenticated using (bucket_id = 'consent-scan');
--  create policy "다알아 파일 올리기" on storage.objects
--    for insert to anon, authenticated with check (bucket_id = 'consent-scan');
--  create policy "다알아 파일 바꾸기" on storage.objects
--    for update to anon, authenticated using (bucket_id = 'consent-scan')
--    with check (bucket_id = 'consent-scan');
--  create policy "다알아 파일 지우기" on storage.objects
--    for delete to anon, authenticated using (bucket_id = 'consent-scan');
--
--  notify pgrst, 'reload schema';
-- ═══════════════════════════════════════════════════════════
