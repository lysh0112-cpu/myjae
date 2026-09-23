-- ═══════════════════════════════════════════════════════════
--  014_meeting.sql — 총회 · 안건 정식 표 (2026-08-31)
-- ───────────────────────────────────────────────────────────
--  ★ 011_decision.sql 을 먼저 돌리셔야 합니다.
--    이 파일이 decision 표에 칸을 두 개 더합니다.
--    011 이 없으면 「decision 표가 없습니다」로 멈춥니다.
--
--  ★★★ public 스키마에 만든다. daara 가 아니다 ★★★
--
--    hub.js 가 Accept-Profile 헤더를 안 붙이므로
--    PostgREST 는 public 만 쳐다본다.
--    daara 에 만들면 표는 멀쩡한데 화면에서 0건이 온다.
--    오류도 안 나고 그냥 비어 보인다.
--
--  ★ 왜 표로 옮기는가
--
--    지금 총회는 roster-demo.js 안에 **하나가 고정으로 박혀** 있다.
--    직원이 총회명을 고쳐도 새로고침하면 사라진다.
--    지난 총회는 아예 남지 않는다.
--
--    조합이 다툴 때 근거가 되는 것은 **몇 년 전 총회에서 무엇을
--    어떤 요건으로 의결했나**이다. 그것이 남지 않으면 프로그램을
--    쓰는 뜻이 없다.
--
--  ★ 투표 로그(votes)는 이번에 옮기지 않는다.
--    출석 · 철회까지 한 덩어리라 따로 한다. 「다음에 할 것」 참고.
-- ═══════════════════════════════════════════════════════════

SET search_path = public;

-- ── 0. 앞선 것이 있는지 먼저 본다 ───────────────────────────
do $$
begin
  if to_regclass('public.decision') is null then
    raise exception E'\n\n★ decision 표가 없습니다.\n'
      '  sql/011_decision.sql 을 먼저 돌려 주십시오.\n';
  end if;
end $$;

-- ── 1. 총회 ─────────────────────────────────────────────────
--  ★ 시각 두 칸(vote_open · vote_close)은 글자로 담는다.
--    화면이 「2026-03-10 09:00」처럼 글자로 다루고 있어서다.
--    시각으로 바꾸시려면 화면의 입력칸부터 datetime-local 로
--    바꿔야 한다. 한쪽만 바꾸면 값이 통째로 비워진다.
create table if not exists meetings (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   text not null,

    title       text not null,
    kind        text not null default '정기총회',
    meet_date   date not null,
    place       text,
    vote_open   text,
    vote_close  text,

    -- draft 대기 · open 진행중 · closed 마감
    status      text not null default 'draft',

    created_at  timestamptz not null default now(),
    created_by  text,
    updated_at  timestamptz not null default now(),
    updated_by  text,
    closed_at   timestamptz,
    closed_by   text,

    constraint meetings_status_ok check (status in ('draft','open','closed')),
    constraint meetings_kind_ok   check (kind in ('정기총회','임시총회'))
);

-- ★★★ 한 구역에 「진행중」은 하나만 ★★★
--
--   절대규칙 ⑧ — 투표 중에는 명부 변경을 적용하지 않는다.
--   명부 변경 잠금은 「진행중인 총회」 하나를 본다.
--   두 개가 동시에 진행중이 되면 어느 쪽을 봐야 할지 정해지지 않고,
--   잠금이 풀린 사이에 모수가 바뀌면 집계가 통째로 흔들린다.
create unique index if not exists meetings_one_open_idx
    on meetings (tenant_id) where status = 'open';

create index if not exists meetings_tenant_date_idx
    on meetings (tenant_id, meet_date desc);

comment on table meetings is '총회 · 지난 총회도 그대로 남긴다';

-- ── 2. 안건 ─────────────────────────────────────────────────
create table if not exists agendas (
    id            uuid primary key default gen_random_uuid(),
    meeting_id    uuid not null references meetings(id) on delete cascade,
    tenant_id     text not null,

    no            int  not null,
    title         text not null,

    -- 의결 안건인가, 보고 안건인가
    is_vote       boolean not null default true,

    -- ★ 모수를 글자로 판단하지 말 것.
    --   「출석 조합원 과반수」도 '조합원'이 들어 있어 걸린다.
    --   판정은 quorum_base 로만 한다.
    quorum_pass   text,                    -- 사람이 읽는 문장
    quorum_base   text,                    -- members 전체 · attendees 출석
    quorum_attend int,                     -- 직접출석 요건 (%)
    law_ref       text,

    created_at    timestamptz not null default now(),
    updated_at    timestamptz not null default now(),

    constraint agendas_no_pos    check (no > 0),
    constraint agendas_base_ok   check (quorum_base is null
                                        or quorum_base in ('members','attendees')),
    constraint agendas_attend_ok check (quorum_attend is null
                                        or (quorum_attend >= 0 and quorum_attend <= 100)),
    -- ★ 보고 안건에 가결 기준이 붙어 있으면 나중에 「의결했다」로 읽힌다
    constraint agendas_report_clean check (is_vote
                                        or (quorum_base is null and quorum_attend is null)),
    unique (meeting_id, no)
);

create index if not exists agendas_meeting_idx on agendas (meeting_id, no);

comment on table agendas is '총회 안건 · 제○호';

-- ── 3. 의결 기록에 총회를 잇는다 ────────────────────────────
--  ★ 지금은 총회에서 안건 이름을 적고, 의결 기록에서 같은 이름을
--    또 친다. 두 번 치면 한 글자씩 달라지고, 나중에
--    「이게 그 안건이 맞나」로 다툰다.
alter table decision add column if not exists meeting_id uuid references meetings(id);
alter table decision add column if not exists agenda_id  uuid references agendas(id);

-- ★ 한 안건에 의결 기록은 하나뿐이다.
--   두 번 넘기면 같은 안건이 「가결」과 「부결」로 둘 다 남는다.
create unique index if not exists decision_agenda_uniq
    on decision (agenda_id) where agenda_id is not null;
create index if not exists decision_meeting_idx
    on decision (meeting_id) where meeting_id is not null;

-- ── 4. 지우기를 막는다 ──────────────────────────────────────
--  ★ 절대규칙 ① — 기록은 지우지 않는다.
--    잘못 만든 총회(대기)는 지울 수 있게 두되,
--    한 번 열린 총회는 지울 수 없다. 지울 수 있으면 증거가 못 된다.
create or replace function meetings_guard_delete() returns trigger
language plpgsql as $$
begin
    if OLD.status <> 'draft' then
        raise exception E'\n한 번 연 총회는 지울 수 없습니다.\n'
          '  「%」 · 상태 %\n'
          '  잘못 만드신 것이면 안건을 비우고 그대로 두십시오.\n'
          '  지운 기록은 나중에 아무것도 증명하지 못합니다.', OLD.title, OLD.status;
    end if;
    return OLD;
end $$;

drop trigger if exists meetings_guard_delete_trg on meetings;
create trigger meetings_guard_delete_trg
    before delete on meetings
    for each row execute function meetings_guard_delete();

--  ★ 마감한 총회의 안건은 못 고친다.
--    의결 기록이 이미 나간 뒤에 안건 이름이 바뀌면
--    조합원 앱에 있는 기록과 달라진다.
create or replace function agendas_guard() returns trigger
language plpgsql as $$
declare st text;
begin
    select status into st from meetings
     where id = coalesce(NEW.meeting_id, OLD.meeting_id);
    if st = 'closed' then
        raise exception E'\n마감한 총회의 안건은 고칠 수 없습니다.\n'
          '  의결 기록이 이미 조합원 앱에 나가 있습니다.\n';
    end if;
    if TG_OP = 'DELETE' then return OLD; end if;
    NEW.updated_at := now();
    return NEW;
end $$;

drop trigger if exists agendas_guard_trg on agendas;
create trigger agendas_guard_trg
    before insert or update or delete on agendas
    for each row execute function agendas_guard();

-- 총회를 고칠 때마다 시각을 남긴다
create or replace function meetings_touch() returns trigger
language plpgsql as $$
begin
    NEW.updated_at := now();
    if TG_OP = 'UPDATE' and NEW.status = 'closed' and OLD.status <> 'closed'
       and NEW.closed_at is null then
        NEW.closed_at := now();
    end if;
    return NEW;
end $$;

drop trigger if exists meetings_touch_trg on meetings;
create trigger meetings_touch_trg
    before insert or update on meetings
    for each row execute function meetings_touch();

-- ── 5. 화면이 읽는 뷰 ───────────────────────────────────────
create or replace view v_meeting as
select m.*,
       (select count(*) from agendas a where a.meeting_id = m.id)            as agenda_n,
       (select count(*) from agendas a where a.meeting_id = m.id and a.is_vote) as vote_n,
       (select count(*) from decision d where d.meeting_id = m.id)           as decided_n
  from meetings m;

create or replace view v_agenda as
select a.*,
       m.title     as meeting_title,
       m.meet_date as meet_date,
       m.status    as meeting_status,
       d.id        as decision_id,
       d.yes_n, d.no_n, d.abstain_n, d.total_n, d.attend_n,
       d.approved  as decision_approved
  from agendas a
  join meetings m on m.id = a.meeting_id
  left join decision d on d.agenda_id = a.id;

-- ★ v_decision 에 총회 두 칸을 더한다.
--   조합원 앱이 「어느 총회에서 정해진 것인가」로 묶어 보여 드린다.
create or replace view v_decision as
select d.id, d.tenant_id, d.kind, k.name as kind_name, k.legal_base,
       d.decided_on, d.meeting, d.agenda_no, d.title, d.rule,
       d.total_n, d.attend_n, d.yes_n, d.no_n, d.abstain_n, d.memo, d.link_ref,
       d.file_path, d.file_name, d.file_size,
       d.approved, d.approved_at, d.approved_by,
       d.created_at, d.created_by, d.updated_at, d.updated_by,
       dec_need(d.rule, d.attend_n, d.total_n) as need_n,
       (d.yes_n >= dec_need(d.rule, d.attend_n, d.total_n)) as passed,
       (d.attend_n - d.yes_n - d.no_n - d.abstain_n) as invalid_n,
       d.meeting_id, d.agenda_id
  from decision d
  left join decision_kind k on k.kind = d.kind;

-- ── 6. 규칙 (RLS) ───────────────────────────────────────────
alter table meetings enable row level security;
alter table agendas  enable row level security;

drop policy if exists meetings_all on meetings;
drop policy if exists agendas_all  on agendas;

--  ★ 지금은 로그인 장치가 없어 임시로 열어 둡니다.
--    실제 조합원 명부를 올리기 전에 반드시 좁혀야 합니다.
--    → 인수인계서 「배포 전 반드시 ⑱ · ⑲」, sql/013_rls.sql
create policy meetings_all on meetings
  for all to anon, authenticated using (true) with check (true);
create policy agendas_all on agendas
  for all to anon, authenticated using (true) with check (true);

-- 실시간 구독 — 다른 PC 에서 바뀌면 바로 보이게
do $$
begin
  if not exists (select 1 from pg_publication_tables
                  where pubname='supabase_realtime'
                    and schemaname='public' and tablename='meetings') then
    alter publication supabase_realtime add table public.meetings;
  end if;
  if not exists (select 1 from pg_publication_tables
                  where pubname='supabase_realtime'
                    and schemaname='public' and tablename='agendas') then
    alter publication supabase_realtime add table public.agendas;
  end if;
end $$;

-- ── 7. 이미 있는 의결 기록을 총회에 이어 준다 ───────────────
--  ★ 011 로 넘어온 기록에는 총회명이 글자로만 있다.
--    같은 이름의 총회를 나중에 만드시면 저절로 이어지도록
--    아래를 한 번 더 돌리시면 됩니다. 두 번 돌려도 안전합니다.
update decision d
   set meeting_id = m.id
  from meetings m
 where d.meeting_id is null
   and d.tenant_id = m.tenant_id
   and d.meeting is not null
   and btrim(d.meeting) = btrim(m.title);

-- ── 확인 ────────────────────────────────────────────────────
--  돌리신 뒤 이 줄을 실행해 눈으로 보십시오.
--
--  select meet_date, title, status, agenda_n, vote_n, decided_n
--    from v_meeting order by meet_date desc;
