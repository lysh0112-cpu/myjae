-- ═══════════════════════════════════════════════════════════
--  012_auth.sql — 권한 바닥 (2026-08-23)
-- ───────────────────────────────────────────────────────────
--  ★★★ 이 파일만 돌려서는 아무것도 안 바뀝니다 ★★★
--
--    이것은 **자물쇠를 다는 파일**이고,
--    013_rls.sql 이 **자물쇠를 잠그는 파일**입니다.
--    012 만 돌리면 지금처럼 누구나 읽고 씁니다. 그래도 안 깨집니다.
--
--    순서 : 012 → (운영자 등록 · 아래 6장) → 로그인 붙이기 → 013
--    ★ 013 을 먼저 돌리면 로그인이 없어서 아무도 못 씁니다.
--
--  ★ 권한이 세 층입니다
--
--    1층  Supabase Auth      로그인한 사람인가        auth.uid()
--         └ 브라우저가 위조할 수 없습니다. 토큰에서 나옵니다.
--
--    2층  memberships        어느 구역을 보나 · 무슨 역할  can_see / can_manage
--         └ RLS 정책은 이것만 봅니다.
--
--    3층  platform_admins    전 구역을 보는 운영자      is_super()
--         └ ★ RLS 에 넣지 않습니다. 함수로만 통과시킵니다.
--
--  ★★★ 3층을 RLS 에 넣지 마십시오 ★★★
--
--    「운영자면 모든 구역을 본다」를 RLS 에 적으면
--    조건이 조금만 어긋나도 남의 조합 자료가 새어 나갑니다.
--    자물쇠는 그대로 두고, 운영자만 부를 수 있는 함수를 따로 둡니다.
--
--  ★ 다알아는 1단 구조입니다
--
--    너스핏은 병원 아래 병동이 있는 2단이지만
--    다알아는 **구역(tenant)이 최소 단위**입니다.
--    지부·분회를 억지로 만들면 빈 층이 하나 생깁니다.
--    나중에 필요해지면 그때 memberships 에 칸을 하나 더합니다.
-- ═══════════════════════════════════════════════════════════

SET search_path = public;

-- ── 1. 구역 표 ──────────────────────────────────────────────
--  ★ 지금은 화면 안 TENANTS 배열에만 있습니다.
--    memberships 가 여기를 가리켜야 하므로 표로 만듭니다.
--    이름 · 단계 같은 것은 그대로 app_state 에 두어도 되고,
--    이 표에는 **누가 어느 구역에 속하나**를 잇는 데 필요한 것만 담습니다.
create table if not exists orgs (
    id          text primary key,                 -- MIA-002 형식
    name        text not null,
    short       text,
    active      boolean not null default true,    -- 계약이 살아 있나
    created_at  timestamptz not null default now()
);

insert into orgs (id, name, short) values
  ('MIA-002', '미아2재정비촉진구역 주택재개발정비사업조합', '미아2구역')
on conflict (id) do nothing;

comment on table orgs is '구역 · 조합 · 계약 단위';

-- ── 2. 출입증 ───────────────────────────────────────────────
--  ★ 「누가 · 어느 구역을 · 무슨 자격으로」 보는가.
--    한 사람이 여러 구역에 속할 수 있습니다(정비업체 직원).
--
--  ★ 역할 셋
--      staff    조합 직원   자료를 올리고 고침
--      officer  임원        직원 권한 + 결재
--      member   조합원      자기 자료만 봄
--
--    ★ 운영자(platform_admins)는 여기 없습니다. 3층입니다.
create table if not exists memberships (
    user_id     uuid not null references auth.users(id) on delete cascade,
    org_id      text not null references orgs(id)       on delete cascade,
    role        text not null default 'member',
    member_no   int,                               -- 조합원번호 (명부와 잇기)
    active      boolean not null default true,
    created_at  timestamptz not null default now(),
    created_by  text,
    primary key (user_id, org_id),
    constraint memberships_role_ok check (role in ('staff','officer','member'))
);

create index if not exists memberships_org_idx  on memberships (org_id, role);
create index if not exists memberships_user_idx on memberships (user_id);

comment on table memberships is '출입증 · 누가 어느 구역을 무슨 자격으로 보나';

-- ── 3. 운영자 ───────────────────────────────────────────────
--  ★★★ 정책(policy)을 하나도 만들지 마십시오 ★★★
--
--    RLS 만 켜고 문을 안 열면 **로그인한 누구도 이 표를 읽거나 쓸 수 없습니다.**
--    운영자를 더하고 빼는 일은 Supabase SQL Editor 에서 사람이 직접 합니다.
--    여기가 뚫리면 전 구역이 뚫립니다.
create table if not exists platform_admins (
    user_id     uuid primary key references auth.users(id) on delete cascade,
    note        text not null default '',
    created_at  timestamptz not null default now()
);
alter table platform_admins enable row level security;
-- ★ 정책 없음. 일부러 없습니다.

comment on table platform_admins is '운영자 · 전 구역을 봄 · 정책 없음(함수로만)';

-- ── 4. 운영자가 남의 구역을 만진 기록 ───────────────────────
--  ★ 운영자는 전 구역을 볼 수 있으므로 무엇을 했는지 남아야 합니다.
--    「운영진은 조합 명부를 열람하지 않는다」는 원칙(9번 절)의 근거가 됩니다.
create table if not exists admin_log (
    id          bigserial primary key,
    user_id     uuid,
    email       text,
    org_id      text,
    action      text not null,
    detail      jsonb,
    at          timestamptz not null default now()
);
alter table admin_log enable row level security;
-- ★ 정책 없음. 운영자도 화면에서 못 지웁니다.

create index if not exists admin_log_at_idx on admin_log (at desc);

-- ═══════════════════════════════════════════════════════════
--  판정 함수 — 여기 셋이 전부입니다
-- ═══════════════════════════════════════════════════════════

-- ★ 판정은 한 곳에서만. 정책마다 조건을 적으면 한 곳만 틀려도 샙니다.
CREATE OR REPLACE FUNCTION is_super()
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

-- 이 구역을 볼 수 있나 (조합원 포함)
CREATE OR REPLACE FUNCTION can_see(p_org text)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  select exists (
    select 1 from memberships
     where user_id = auth.uid() and org_id = p_org and active
  );
$$;

-- 이 구역을 고칠 수 있나 (직원 · 임원만)
CREATE OR REPLACE FUNCTION can_manage(p_org text)
  RETURNS boolean
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  select exists (
    select 1 from memberships
     where user_id = auth.uid() and org_id = p_org and active
       and role in ('staff','officer')
  );
$$;

-- 내 구역 하나 (화면이 시작할 때 부름)
CREATE OR REPLACE FUNCTION my_org()
  RETURNS text
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  select org_id from memberships
   where user_id = auth.uid() and active
   order by created_at limit 1;
$$;

-- ★ 내가 누구인지 한 번에 — 로그인 뒤 화면이 이것만 부르면 됩니다
CREATE OR REPLACE FUNCTION me()
  RETURNS jsonb
  LANGUAGE sql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
  select jsonb_build_object(
    'user_id', auth.uid(),
    'email',   (select email from auth.users where id = auth.uid()),
    'super',   is_super(),
    'orgs',    coalesce((
       select jsonb_agg(jsonb_build_object(
                'org_id', m.org_id, 'name', o.name,
                'role', m.role, 'member_no', m.member_no))
         from memberships m join orgs o on o.id = m.org_id
        where m.user_id = auth.uid() and m.active), '[]'::jsonb)
  );
$$;

grant execute on function is_super, can_see, can_manage, my_org, me to authenticated;

-- ═══════════════════════════════════════════════════════════
--  운영자 함수 — ★ 첫 줄이 전부 같습니다
-- ═══════════════════════════════════════════════════════════

-- 전 구역 목록 (콘솔 구역 탭)
CREATE OR REPLACE FUNCTION console_orgs()
  RETURNS jsonb
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
begin
  if not is_super() then raise exception '운영자만 볼 수 있습니다'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id, 'name', o.name, 'short', o.short, 'active', o.active,
      'staff',   (select count(*) from memberships m
                   where m.org_id = o.id and m.role in ('staff','officer') and m.active),
      'members', (select count(*) from memberships m
                   where m.org_id = o.id and m.role = 'member' and m.active))
      order by o.id)
    from orgs o), '[]'::jsonb);
end $$;

-- 구역 세우기
CREATE OR REPLACE FUNCTION console_org_add(p_id text, p_name text, p_short text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
begin
  if not is_super() then raise exception '운영자만 할 수 있습니다'; end if;
  if p_id is null or btrim(p_id) = '' then raise exception '구역 코드를 적어 주십시오'; end if;
  insert into orgs (id, name, short) values (btrim(p_id), p_name, p_short)
    on conflict (id) do nothing;
  insert into admin_log (user_id, email, org_id, action, detail)
  values (auth.uid(), (select email from auth.users where id = auth.uid()),
          btrim(p_id), 'org_add', jsonb_build_object('name', p_name));
  return jsonb_build_object('ok', true, 'id', btrim(p_id));
end $$;

-- ★ 출입증 주기 — 대행 등록의 핵심
--   ★★★ 여기 하나만 운영자에게 풀어 둡니다 ★★★
--     운영자 함수를 여럿 열면 뚫릴 자리가 그만큼 늘어납니다.
--     예외는 한 곳에서만 통제합니다.
CREATE OR REPLACE FUNCTION console_grant(
    p_email text, p_org text, p_role text, p_member_no int DEFAULT NULL)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
declare v_uid uuid;
begin
  if not is_super() then raise exception '운영자만 할 수 있습니다'; end if;
  if p_role not in ('staff','officer','member') then
    raise exception '역할은 staff · officer · member 중 하나입니다'; end if;

  select id into v_uid from auth.users where lower(email) = lower(btrim(p_email));
  -- ★ 없는 이메일이면 오류를 냅니다. 조용히 넘어가면 「됐다」고 여기십니다.
  if v_uid is null then
    raise exception '그 이메일로 가입한 계정이 없습니다 · 먼저 가입하셔야 합니다'; end if;
  if not exists (select 1 from orgs where id = p_org) then
    raise exception '그 구역이 없습니다'; end if;

  insert into memberships (user_id, org_id, role, member_no, created_by)
  values (v_uid, p_org, p_role, p_member_no,
          (select email from auth.users where id = auth.uid()))
  on conflict (user_id, org_id)
    do update set role = excluded.role, member_no = excluded.member_no, active = true;

  insert into admin_log (user_id, email, org_id, action, detail)
  values (auth.uid(), (select email from auth.users where id = auth.uid()),
          p_org, 'grant', jsonb_build_object('to', p_email, 'role', p_role));
  return jsonb_build_object('ok', true, 'user_id', v_uid);
end $$;

-- 출입증 거두기
CREATE OR REPLACE FUNCTION console_revoke(p_email text, p_org text)
  RETURNS jsonb
  LANGUAGE plpgsql SECURITY DEFINER
  SET search_path TO 'public'
AS $$
declare v_uid uuid;
begin
  if not is_super() then raise exception '운영자만 할 수 있습니다'; end if;
  select id into v_uid from auth.users where lower(email) = lower(btrim(p_email));
  if v_uid is null then raise exception '그 이메일로 가입한 계정이 없습니다'; end if;
  -- ★ 지우지 않고 끕니다. 누가 언제 들어와 있었는지 남아야 합니다.
  update memberships set active = false where user_id = v_uid and org_id = p_org;
  insert into admin_log (user_id, email, org_id, action, detail)
  values (auth.uid(), (select email from auth.users where id = auth.uid()),
          p_org, 'revoke', jsonb_build_object('to', p_email));
  return jsonb_build_object('ok', true);
end $$;

-- 구역 사람 목록
CREATE OR REPLACE FUNCTION console_people(p_org text)
  RETURNS jsonb
  LANGUAGE plpgsql STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $$
begin
  if not is_super() then raise exception '운영자만 볼 수 있습니다'; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'email', u.email, 'role', m.role, 'member_no', m.member_no,
      'active', m.active, 'created_at', m.created_at)
      order by m.role, u.email)
    from memberships m join auth.users u on u.id = m.user_id
   where m.org_id = p_org), '[]'::jsonb);
end $$;

grant execute on function console_orgs, console_org_add, console_grant,
                          console_revoke, console_people to authenticated;

-- ★ PostgREST 가 새 함수를 알아보게
notify pgrst, 'reload schema';

-- ═══════════════════════════════════════════════════════════
--  ★ 운영자 등록 — 콘솔이 안 열릴 때 여는 자리
-- ───────────────────────────────────────────────────────────
--  ★★★ 순서가 있습니다 ★★★
--    ① Supabase 대시보드 → Authentication → Users → Add user
--       (또는 로그인 화면에서 가입)
--    ② 아래 3번으로 운영자 등록
--    ③ ★ 그 계정으로 로그인       ← 제일 자주 걸립니다
--
--  ★★ `Success` 는 「됐다」가 아닙니다.
--     on conflict do nothing 은 이미 있어도 · 이메일이 안 맞아도
--     똑같이 Success 를 냅니다. 반드시 4번으로 눈으로 확인하십시오.

-- 1. 지금 누가 운영자인가
--    select u.email, p.note, p.created_at
--      from platform_admins p join auth.users u on u.id = p.user_id
--     order by p.created_at;

-- 2. 계정 목록 — 어느 이메일로 쓰실지 고릅니다
--    select email, created_at from auth.users order by created_at;

-- 3. 운영자로 등록  ★ 이 줄만 고치십시오
--    insert into platform_admins (user_id, note)
--    select id, '대표 운영자' from auth.users
--     where lower(email) = lower('여기에_본인_이메일')
--    on conflict (user_id) do nothing;
--    notify pgrst, 'reload schema';

-- 4. 확인  ★ 반드시 하십시오
--    select u.email, p.note
--      from platform_admins p join auth.users u on u.id = p.user_id;

-- 5. 조합 직원에게 출입증 주기 (운영자로 로그인한 뒤 콘솔에서 해도 됩니다)
--    insert into memberships (user_id, org_id, role)
--    select id, 'MIA-002', 'staff' from auth.users
--     where lower(email) = lower('직원_이메일')
--    on conflict (user_id, org_id) do update set role = 'staff', active = true;

--  ★ 연습 계정에 임시로 권한을 주셨다면 운영 전에 반드시 걷어내십시오.
--    그 계정에는 전 구역 자료를 보는 권한이 붙습니다.
-- ═══════════════════════════════════════════════════════════
