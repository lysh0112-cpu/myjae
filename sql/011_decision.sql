-- ═══════════════════════════════════════════════════════════
--  011_decision.sql — 의결 기록 정식 표 (2026-08-23)
-- ───────────────────────────────────────────────────────────
--  ★ 지금 바로 돌리십시오. 화면이 이 표를 읽고 씁니다.
--    맨 아래 「옮기기」가 함께 들어 있어
--    app_state 에 있던 기록이 자동으로 넘어옵니다.
--
--  ★★★ public 스키마에 만든다. daara 가 아니다 ★★★
--
--    hub.js 가 Accept-Profile 헤더를 안 붙이므로
--    PostgREST 는 public 만 쳐다본다.
--    daara 에 만들면 표는 멀쩡한데 화면에서 0건이 온다.
--    오류도 안 나고 그냥 비어 보인다.
--    → sql/009_app_state.sql 맨 위에 같은 이야기가 있다.
--
--  ★ 왜 app_state 에서 옮기는가
--
--    app_state 는 **목록 전체를 통째로 갈아 끼우는** 구조다.
--    두 사람이 같은 시간에 올리면 나중 것이 앞의 것을 지운다.
--    총회 접수에서 이미 겪었고(40번 절) 칸을 나눠 피했다.
--
--    의결 기록은 **결재가 붙는 순간 조합장과 직원이 동시에 손을 댄다.**
--    그리고 개발자 도구를 아는 사람이 「가결」을 「부결」로 바꿀 수 있다.
--    한 줄씩 넣고 고치는 표라야 한다.
-- ═══════════════════════════════════════════════════════════

SET search_path = public;

-- ── 회의 종류 ───────────────────────────────────────────────
--  ★ 모수와 의결 요건이 회의마다 다르다.
--    총회 97명 · 대의원회 25명 · 이사회 7명.
--    대의원회 기록에 총회 총원을 넣으면 정족수가 통째로 틀린다.
--    가결이 부결로 뒤집히고, 그 기록이 조합원 앱에 나가면 되돌릴 수 없다.
create table if not exists decision_kind (
    kind        text primary key,
    name        text not null,
    legal_base  text,
    note        text,
    sort        int  not null default 0
);

insert into decision_kind (kind, name, legal_base, note, sort) values
 ('mtg','총회','도시정비법 제45조 · 조합 정관',
  '조합원 과반수 출석에 출석 조합원 과반수 찬성이 원칙입니다. 정관 변경 · 시공자 선정 등은 조합원 2/3 이상입니다.',1),
 ('del','대의원회','조합 정관 · 대의원회 규정',
  '대의원 과반수 출석에 출석 과반수 찬성이 보통입니다. 총회 권한을 대행하는 사항은 정관에서 따로 정합니다.',2),
 ('brd','이사회','조합 정관 · 이사회 규정',
  '이사 과반수 출석에 출석 과반수 찬성이 보통입니다. 이사회 의결로 총회 부의 안건을 정합니다.',3)
on conflict (kind) do update set
  name = excluded.name, legal_base = excluded.legal_base,
  note = excluded.note, sort = excluded.sort;

-- ── 회의체별 총원 (모수) ────────────────────────────────────
--  ★ 정관에서 정한다. 법은 「정관으로 정한다」고만 한다.
create table if not exists decision_base (
    tenant_id   text not null,
    kind        text not null references decision_kind(kind),
    total_n     int  not null default 0,   -- 0 이면 화면이 의결권자 수를 쓴다 (총회)
    updated_at  timestamptz not null default now(),
    updated_by  text,
    primary key (tenant_id, kind)
);

-- ── 의결 기록 ───────────────────────────────────────────────
create table if not exists decision (
    id          uuid primary key default gen_random_uuid(),
    tenant_id   text not null,
    kind        text not null references decision_kind(kind) default 'mtg',

    decided_on  date not null,
    meeting     text,
    agenda_no   int,
    title       text not null,
    rule        text not null default 'all2',

    -- ★ 표결 수치 — 기권을 따로 센다.
    --   기권은 찬성도 반대도 아니다. 찬성률 계산에서 뺀다.
    total_n     int not null,
    attend_n    int not null,
    yes_n       int not null default 0,
    no_n        int not null default 0,
    abstain_n   int not null default 0,
    memo        text,

    link_ref    text,                      -- 안건 · 동의서 연결

    -- ★ 회의록 원본 — Storage 경로
    --   MIA-002__dec__2026-03-20__1__시각.pdf
    --   → sql/010_storage.sql 의 consent-scan 버킷
    file_path   text,
    file_name   text,
    file_size   bigint,

    -- ★ 조합장 결재
    approved    boolean not null default false,
    approved_at timestamptz,
    approved_by text,

    created_at  timestamptz not null default now(),
    created_by  text,
    updated_at  timestamptz not null default now(),
    updated_by  text,

    -- ★ 숫자가 서로 맞는지 DB 에서도 본다.
    --   화면에서만 막으면 개발자 도구로 얼마든지 넘길 수 있다.
    constraint dec_attend_le_total check (attend_n <= total_n),
    constraint dec_votes_le_attend check (yes_n + no_n + abstain_n <= attend_n),
    constraint dec_n_positive      check (total_n > 0 and attend_n >= 0
                                          and yes_n >= 0 and no_n >= 0 and abstain_n >= 0),
    constraint dec_rule_ok         check (rule in ('half','all2','two3','att2'))
);

create index if not exists decision_tenant_date_idx
    on decision (tenant_id, decided_on desc, agenda_no desc);
create index if not exists decision_kind_idx
    on decision (tenant_id, kind, decided_on desc);
create index if not exists decision_link_idx
    on decision (tenant_id, link_ref) where link_ref is not null;

-- ── 가결 여부는 DB 가 셈한다 ────────────────────────────────
--  ★ 직원이 「가결」이라고 적는 것이 아니라 숫자에서 나온다.
--    적게 하면 실수하고, 실수한 것이 조합원께 나간다.
create or replace function dec_need(p_rule text, p_attend int, p_total int)
returns int language sql immutable as $$
  select case p_rule
    when 'half' then floor(p_attend / 2.0) + 1
    when 'all2' then floor(p_total  / 2.0) + 1
    when 'two3' then ceil (p_total  * 2.0 / 3)
    when 'att2' then ceil (p_attend * 2.0 / 3)
    else floor(p_attend / 2.0) + 1
  end::int
$$;

-- ★★★ 숫자를 고치면 조합장 결재가 저절로 풀린다 ★★★
--   조합장이 확인한 것과 다른 숫자가 「조합장 확인」으로 나가면 안 된다.
--   화면에도 같은 규칙이 있지만, DB 에도 있어야 개발자 도구로 못 넘긴다.
create or replace function decision_touch() returns trigger
language plpgsql as $$
begin
    if TG_OP = 'UPDATE' then
        if (OLD.total_n, OLD.attend_n, OLD.yes_n, OLD.no_n, OLD.abstain_n,
            OLD.rule, OLD.kind)
           is distinct from
           (NEW.total_n, NEW.attend_n, NEW.yes_n, NEW.no_n, NEW.abstain_n,
            NEW.rule, NEW.kind)
        then
            NEW.approved    := false;
            NEW.approved_at := null;
            NEW.approved_by := null;
        end if;
        if NEW.approved and not OLD.approved and NEW.approved_at is null then
            NEW.approved_at := now();
        end if;
    end if;
    NEW.updated_at := now();
    return NEW;
end $$;

drop trigger if exists decision_touch_trg on decision;
create trigger decision_touch_trg
    before insert or update on decision
    for each row execute function decision_touch();

-- ── 화면이 읽는 뷰 ──────────────────────────────────────────
create or replace view v_decision as
select d.id, d.tenant_id, d.kind, k.name as kind_name, k.legal_base,
       d.decided_on, d.meeting, d.agenda_no, d.title, d.rule,
       d.total_n, d.attend_n, d.yes_n, d.no_n, d.abstain_n, d.memo, d.link_ref,
       d.file_path, d.file_name, d.file_size,
       d.approved, d.approved_at, d.approved_by,
       d.created_at, d.created_by, d.updated_at, d.updated_by,
       dec_need(d.rule, d.attend_n, d.total_n) as need_n,
       (d.yes_n >= dec_need(d.rule, d.attend_n, d.total_n)) as passed,
       (d.attend_n - d.yes_n - d.no_n - d.abstain_n) as invalid_n
  from decision d
  left join decision_kind k on k.kind = d.kind;

-- ── 규칙 (RLS) ──────────────────────────────────────────────
alter table decision      enable row level security;
alter table decision_base enable row level security;
alter table decision_kind enable row level security;

drop policy if exists decision_all      on decision;
drop policy if exists decision_base_all on decision_base;
drop policy if exists decision_kind_ro  on decision_kind;

--  ★ 지금은 로그인 장치가 없어 anon 에게 열어 둔다. 임시다.
--    실제 조합원 명부를 올리기 전에 반드시 좁혀야 한다.
--    → 인수인계서 「배포 전 반드시 ⑱ · ⑲」
create policy decision_all on decision
  for all to anon, authenticated using (true) with check (true);
create policy decision_base_all on decision_base
  for all to anon, authenticated using (true) with check (true);
create policy decision_kind_ro on decision_kind
  for select to anon, authenticated using (true);

--  ★ Auth 를 붙인 뒤에는 위 세 줄을 지우고 아래로 바꾼다.
--
--  create policy decision_staff on decision for all to authenticated
--    using      (tenant_id = (auth.jwt() ->> 'tenant_id'))
--    with check (tenant_id = (auth.jwt() ->> 'tenant_id'));
--
--  create policy decision_member on decision for select to authenticated
--    using (tenant_id = (auth.jwt() ->> 'tenant_id'));
--
--  ★ tenant_id 를 JWT 에 담는 방식은 001_core_schema.sql 의
--    current_tenant() 와 짝을 맞춘다. 두 곳이 다르면 한쪽만 새는 구멍이 생긴다.

-- 실시간 구독 — 다른 PC 에서 바뀌면 바로 보이게
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public' and tablename = 'decision'
  ) then
    alter publication supabase_realtime add table public.decision;
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════
--  ★ 옮기기 — app_state("decision") 에 있던 것을 이 표로
-- ───────────────────────────────────────────────────────────
--  ★ 두 번 돌려도 안전합니다. 표가 비어 있을 때만 넣습니다.
--  ★ 옮긴 뒤에도 app_state 를 지우지 마십시오.
--    잘못되면 돌아갈 데가 있어야 합니다. 한 달쯤 두고 보신 뒤에 지우십시오.

insert into decision
  (tenant_id, kind, decided_on, meeting, agenda_no, title, rule,
   total_n, attend_n, yes_n, no_n, abstain_n, memo, link_ref,
   file_path, file_name, file_size, approved, approved_at, approved_by, created_by)
select s.tenant_id,
       coalesce(nullif(x ->> 'kind',''), 'mtg'),
       (x ->> 'date')::date,
       nullif(x ->> 'meeting',''),
       nullif(x ->> 'no2','')::int,
       coalesce(nullif(x ->> 'title',''), '(제목 없음)'),
       coalesce(nullif(x ->> 'rule',''), 'all2'),
       greatest(coalesce(nullif(x ->> 'total','')::int, 1), 1),
       coalesce(nullif(x ->> 'att','')::int, 0),
       coalesce(nullif(x ->> 'yes','')::int, 0),
       coalesce(nullif(x ->> 'no','')::int, 0),
       coalesce(nullif(x ->> 'abs','')::int, 0),
       nullif(x ->> 'note',''),
       nullif(x ->> 'link',''),
       nullif(x ->> 'path',''),
       nullif(x ->> 'file',''),
       nullif(x ->> 'size','')::bigint,
       coalesce((x ->> 'ap')::boolean, false),
       nullif(x ->> 'apAt','')::timestamptz,
       nullif(x ->> 'apBy',''),
       nullif(x ->> 'by','')
  from app_state s, jsonb_array_elements(s.value) x
 where s.key = 'decision'
   and jsonb_typeof(s.value) = 'array'
   and (x ->> 'date') ~ '^\d{4}-\d{2}-\d{2}$'
   and not exists (select 1 from decision);

-- 회의별 총원도 함께 옮긴다
insert into decision_base (tenant_id, kind, total_n)
select s.tenant_id, k.kind, coalesce((s.value ->> k.kind)::int, 0)
  from app_state s cross join decision_kind k
 where s.key = 'dec_base'
on conflict (tenant_id, kind) do nothing;

-- ── 확인 ────────────────────────────────────────────────────
--  돌리신 뒤 이 두 줄을 실행해 눈으로 보십시오.
--
--  select kind_name, count(*) as 건수,
--         sum(case when passed then 1 else 0 end) as 가결,
--         sum(case when approved then 1 else 0 end) as 결재
--    from v_decision group by kind_name order by kind_name;
--
--  select policyname, cmd from pg_policies
--   where schemaname='public' and tablename='decision';
