-- ═══════════════════════════════════════════════════════════
--  016_source.sql — 정보몽땅에서 온 자료임을 밝힌다 (2026-08-31)
-- ───────────────────────────────────────────────────────────
--  ★ 015_meeting_kind.sql 을 먼저 돌리셔야 합니다.
--
--  ★★★ public 스키마에 만든다. daara 가 아니다 ★★★
--
--  ★ 왜 필요한가
--
--    정부는 조합 안에서 일어나는 결정 사항을 빠짐없이
--    **서울시 정비사업 정보몽땅**에 올리도록 하고 있다.
--    그것은 조합의 법정 의무이고, 다알아에 올린다고 없어지지 않는다.
--
--    그런데 정보몽땅에 실제로 들어가서 보는 조합원은 거의 없다.
--    자료는 다 올라가 있는데 아무도 읽지 않는다.
--
--    ★ 그래서 다알아는 정보몽땅의 **대체가 아니라 번역기**다.
--        정보몽땅   법정 원본 · 조합이 반드시 올려야 하는 것
--        다알아     그것을 조합원이 읽을 수 있게 옮겨 놓은 것
--
--  ★★★ 출처를 밝히지 않으면 다알아가 원본인 척하게 된다 ★★★
--
--    조합원이 다알아에서 본 숫자와 정보몽땅의 숫자가 다르면
--    어느 쪽이 맞는지 가릴 방법이 있어야 한다.
--    **원본은 언제나 정보몽땅이다.** 화면에 그렇게 적어 둔다.
--
--    또 「저기는 올렸는데 여기는 안 올렸다」가 생기면
--    조합원이 정보몽땅에서 본 것을 다알아에서 못 찾고,
--    그때 나오는 말은 「숨겼다」이다.
--    그래서 **아직 안 옮긴 회의도 화면에 보이게** 한다.
-- ═══════════════════════════════════════════════════════════

SET search_path = public;

do $$
begin
  if to_regclass('public.meetings') is null then
    raise exception E'\n\n★ meetings 표가 없습니다.\n'
      '  sql/014_meeting.sql · 015_meeting_kind.sql 을 먼저 돌려 주십시오.\n';
  end if;
end $$;

-- ── 1. 회의에 출처를 붙인다 ─────────────────────────────────
--  src_kind  own   조합이 다알아에서 직접 만든 것
--            mtd   정보몽땅에 올린 것을 옮겨 담은 것
alter table meetings add column if not exists src_kind text not null default 'own';
alter table meetings add column if not exists src_at   date;    -- 정보몽땅 등록일
alter table meetings add column if not exists src_url  text;    -- 원문 주소
alter table meetings add column if not exists src_no   text;    -- 정보몽땅 문서번호

alter table meetings drop constraint if exists meetings_src_ok;
alter table meetings add  constraint meetings_src_ok
  check (src_kind in ('own','mtd'));

-- ★ 정보몽땅에서 온 것이라면 등록일은 반드시 있어야 한다.
--   「정보몽땅 자료입니다」라고만 하고 언제 올린 것인지 없으면
--   조합원이 원문과 대조할 수가 없다.
alter table meetings drop constraint if exists meetings_src_at_ok;
alter table meetings add  constraint meetings_src_at_ok
  check (src_kind <> 'mtd' or src_at is not null);

comment on column meetings.src_kind is 'own 조합이 직접 · mtd 정보몽땅에서 옮김';
comment on column meetings.src_at   is '정보몽땅 등록일 · 원문과 대조하는 기준';
comment on column meetings.src_url  is '정보몽땅 원문 주소 · 조합원이 눌러서 확인';
comment on column meetings.src_no   is '정보몽땅 문서번호';

create index if not exists meetings_src_idx
    on meetings (tenant_id, src_kind, src_at desc);

-- ── 2. 의결 기록에도 같은 칸 ────────────────────────────────
--  ★ 지난 20년치 옛 기록은 회의 단위로 복원되지 않는다.
--    낱장으로 들어온 것에도 출처를 붙일 수 있어야 한다.
alter table decision add column if not exists src_kind text not null default 'own';
alter table decision add column if not exists src_at   date;
alter table decision add column if not exists src_url  text;

alter table decision drop constraint if exists decision_src_ok;
alter table decision add  constraint decision_src_ok
  check (src_kind in ('own','mtd'));

comment on column decision.src_kind is 'own 조합이 직접 · mtd 정보몽땅에서 옮김';

-- ── 3. 뷰를 다시 만든다 ─────────────────────────────────────
--  ★ m.* 를 쓰지 말 것 (2026-08-31 에 겪은 것).
--    칸이 늘면 자리가 밀려서
--      ERROR 42P16: cannot change name of view column
--    이 난다. 칸을 하나씩 적는다.
drop view if exists v_agenda;
drop view if exists v_meeting;

create view v_meeting as
select m.id, m.tenant_id, m.title, m.kind, m.year, m.seq,
       m.meet_date, m.meet_time, m.place,
       m.vote_open, m.vote_close, m.status,
       m.src_kind, m.src_at, m.src_url, m.src_no,
       m.created_at, m.created_by, m.updated_at, m.updated_by,
       m.closed_at, m.closed_by,
       (select count(*) from agendas a where a.meeting_id = m.id)               as agenda_n,
       (select count(*) from agendas a where a.meeting_id = m.id and a.is_vote) as vote_n,
       (select count(*) from decision d where d.meeting_id = m.id)              as decided_n
  from meetings m;

create view v_agenda as
select a.id, a.meeting_id, a.tenant_id, a.no, a.title, a.is_vote,
       a.quorum_pass, a.quorum_base, a.quorum_attend, a.law_ref,
       a.detail, a.memo, a.created_at, a.updated_at,
       m.title     as meeting_title,
       m.kind      as meeting_kind,
       m.meet_date as meet_date,
       m.status    as meeting_status,
       m.src_kind  as meeting_src_kind,
       m.src_at    as meeting_src_at,
       m.src_url   as meeting_src_url,
       d.id        as decision_id,
       d.yes_n, d.no_n, d.abstain_n, d.total_n, d.attend_n,
       d.approved  as decision_approved
  from agendas a
  join meetings m on m.id = a.meeting_id
  left join decision d on d.agenda_id = a.id;

drop view if exists v_decision;
create view v_decision as
select d.id, d.tenant_id, d.kind, k.name as kind_name, k.legal_base,
       d.decided_on, d.meeting, d.agenda_no, d.title, d.rule,
       d.total_n, d.attend_n, d.yes_n, d.no_n, d.abstain_n, d.memo, d.link_ref,
       d.file_path, d.file_name, d.file_size,
       d.approved, d.approved_at, d.approved_by,
       d.created_at, d.created_by, d.updated_at, d.updated_by,
       dec_need(d.rule, d.attend_n, d.total_n) as need_n,
       (d.yes_n >= dec_need(d.rule, d.attend_n, d.total_n)) as passed,
       (d.attend_n - d.yes_n - d.no_n - d.abstain_n) as invalid_n,
       d.meeting_id, d.agenda_id,
       d.src_kind, d.src_at, d.src_url
  from decision d
  left join decision_kind k on k.kind = d.kind;

-- ── 확인 ────────────────────────────────────────────────────
--  select kind, meet_date, title, src_kind, src_at, src_no
--    from v_meeting order by meet_date desc;
