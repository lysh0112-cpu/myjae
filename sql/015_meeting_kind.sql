-- ═══════════════════════════════════════════════════════════
--  015_meeting_kind.sql — 회의를 네 갈래로 (2026-08-31)
-- ───────────────────────────────────────────────────────────
--  ★ 014_meeting.sql 을 먼저 돌리셔야 합니다.
--
--  ★★★ public 스키마에 만든다. daara 가 아니다 ★★★
--
--  ★ 무엇이 달라지나
--
--    014 는 총회만 받았다.
--        check (kind in ('정기총회','임시총회'))
--
--    그런데 서울시 정비사업 정보몽땅을 보니 이 조합은
--    2026년 8월까지 **대의원회를 네 차례** 열었다.
--    정기총회는 3월에 한 번인데 대의원회는 두 달에 한 번꼴이다.
--
--    대의원회는 회의를 만들 자리가 없어서, 안건을 미리 여러 건
--    올려 둘 수가 없었다. 직원이 의결 기록 화면에서 한 건씩 치고,
--    그때마다 날짜와 회의명을 다시 쳤다.
--
--  ★ 네 갈래
--        정기총회   조합원 모수 · 투표 기간 있음 · 명부 잠금
--        임시총회   같음 · 차수가 붙는다
--        대의원회   대의원 모수 · 그 자리에서 거수 · 명부 안 잠금
--        이사회     이사 모수 · 같음
--
--  ★ 화면은 하나다.
--    왼쪽 메뉴만 넷으로 보이고, 안쪽은 같은 화면이 종류만 달리 받는다.
--    화면을 넷으로 나누면 한 군데 고칠 때 네 군데를 고쳐야 하고,
--    세 군데만 고치면 나머지 하나에서 조용히 사고가 난다.
--    (2026-08-31 대의원 명단이 사라진 것이 바로 그 종류의 사고다)
-- ═══════════════════════════════════════════════════════════

SET search_path = public;

do $$
begin
  if to_regclass('public.meetings') is null then
    raise exception E'\n\n★ meetings 표가 없습니다.\n'
      '  sql/014_meeting.sql 을 먼저 돌려 주십시오.\n';
  end if;
end $$;

-- ── 1. 회의 종류를 넷으로 ───────────────────────────────────
alter table meetings drop constraint if exists meetings_kind_ok;
alter table meetings add  constraint meetings_kind_ok
  check (kind in ('정기총회','임시총회','대의원회','이사회'));

-- ── 2. 연도 · 차수 · 시각 ───────────────────────────────────
--  ★ 회의 이름을 손으로 치면 「제2026-4차」와 「2026-4차」가 섞인다.
--    섞이면 순서대로 늘어놓을 수가 없다.
--    연도와 차수만 받고 이름은 화면이 만든다.
alter table meetings add column if not exists year      int;
alter table meetings add column if not exists seq       int;
alter table meetings add column if not exists meet_time text;

comment on column meetings.year is '회의 연도 · 2026';
comment on column meetings.seq  is '그 해 몇 번째인가 · 정기총회는 비운다';
comment on column meetings.meet_time is '개최 시각 · 16:00 · 글자로 담는다';

update meetings set year = extract(year from meet_date)::int
 where year is null;

-- ★ 같은 해에 같은 차수가 둘 있으면 안 된다.
--   제2026-4차 대의원회가 둘이면 어느 쪽 의결인지 가릴 수 없다.
create unique index if not exists meetings_seq_uniq
    on meetings (tenant_id, kind, year, seq) where seq is not null;

-- ── 3. ★ 진행중은 「회의 종류마다」 하나 ────────────────────
--  ★ 014 에서는 구역에 통틀어 하나였다.
--    그러면 총회 준비 중에 대의원회를 열 수 없다.
--    실제 조합은 총회에 올릴 안건을 대의원회에서 먼저 정한다.
--
--  ★ 명부 변경 잠금(절대규칙 ⑧)은 **총회만** 본다.
--    대의원회·이사회는 그 자리에서 거수로 정하니
--    명부가 바뀌어도 집계 모수가 흔들리지 않는다.
drop index if exists meetings_one_open_idx;
create unique index if not exists meetings_one_open_per_kind_idx
    on meetings (tenant_id, kind) where status = 'open';

-- ── 4. 안건에 설명과 비고 ───────────────────────────────────
--  ★ 안건 이름만으로는 조합원이 무슨 안건인지 모른다.
--    「시공자 선정계획서(안) 의결의 건」이라고만 하면
--    시공자를 뽑는다는 건지 계획만 정한다는 건지 알 수 없다.
alter table agendas add column if not exists detail text;

--  ★ 표결 숫자로는 담기지 않는 것을 적는다.
--    「정순원 · 이종순 · 이승현 · 최수진 · 임종오 선임」 같은 것이다.
alter table agendas add column if not exists memo text;

comment on column agendas.detail is '안건 설명 · 조합원 앱에 그대로 나간다';
comment on column agendas.memo   is '비고 · 선임자 이름 등';

-- ── 5. 기권과 무효를 한 칸으로 ──────────────────────────────
--  ★ 예전에는 기권만 받고, 찬성+반대+기권이 참석보다 적으면
--    그 차이를 무효로 여겼다.
--
--    그런데 의사록에는 **「기권및무효 2표」로 합쳐** 적혀 있다.
--    직원이 나눌 수가 없다. 한 칸으로 받는 편이 맞다.
--
--  ★ 가결 판정은 어느 쪽이든 같다. 찬성이 요건을 넘느냐만 본다.
--    담기는 칸(abstain_n)도 그대로다. 뜻만 넓어졌다.
comment on column decision.abstain_n is '기권 · 무효 (합쳐서 받는다 · 2026-08-31)';

-- ── 6. 뷰를 다시 만든다 ─────────────────────────────────────
create or replace view v_meeting as
select m.*,
       (select count(*) from agendas a where a.meeting_id = m.id)               as agenda_n,
       (select count(*) from agendas a where a.meeting_id = m.id and a.is_vote) as vote_n,
       (select count(*) from decision d where d.meeting_id = m.id)              as decided_n
  from meetings m;

create or replace view v_agenda as
select a.*,
       m.title     as meeting_title,
       m.kind      as meeting_kind,
       m.meet_date as meet_date,
       m.status    as meeting_status,
       d.id        as decision_id,
       d.yes_n, d.no_n, d.abstain_n, d.total_n, d.attend_n,
       d.approved  as decision_approved
  from agendas a
  join meetings m on m.id = a.meeting_id
  left join decision d on d.agenda_id = a.id;

-- ── 7. 회의체 총원을 채워 둔다 ──────────────────────────────
--  ★ 대의원회 모수는 대의원 수다. 사무실·임원 화면에서 명단을
--    넣으시면 화면이 그 수를 여기에 맞춰 준다.
--    여기서는 값이 없을 때만 자리를 만든다.
insert into decision_base (tenant_id, kind, total_n)
select distinct m.tenant_id, k.kind, 0
  from meetings m cross join (values ('mtg'),('del'),('brd')) k(kind)
on conflict (tenant_id, kind) do nothing;

-- ── 확인 ────────────────────────────────────────────────────
--  select kind, year, seq, meet_date, title, status, agenda_n, decided_n
--    from v_meeting order by meet_date desc;
