-- ═══════════════════════════════════════════════════════════
--  017_digest.sql — 회의 소식 요약 (2026-08-31)
-- ───────────────────────────────────────────────────────────
--  ★ 016_source.sql 을 먼저 돌리셔야 합니다.
--
--  ★★★ public 스키마에 만든다. daara 가 아니다 ★★★
--
--  ★ 왜 필요한가
--
--    조합장께 조합원 앱을 보여 드렸더니
--    「정보몽땅에 다 나오는 자료들」이라고 하셨다.
--    **틀린 말이 아니다.** 지금 앱은 정보몽땅에 있는 것을
--    모양만 바꿔 보여 준다.
--
--    ★ 정보몽땅이 못 하는 것은 둘뿐이다.
--        ① 내 것을 보여 준다      (우리집 탭 · 이미 있다)
--        ② 요약해서 알려 준다      ← 이 파일이 만드는 것
--
--    정보몽땅에는 96MB 짜리 회의자료 PDF 가 올라가 있다.
--    조합장도 안 여신다. 조합원은 더 안 여신다.
--
--  ★ 담기는 것
--        headline   한 줄 요약 · 소식 제목이 된다
--        digest     무슨 일이 있었나 · 두세 문단
--        meaning    ★ 조합원에게 무슨 뜻인가 · 소식지의 핵심
--
--    「찬성 91, 반대 2」는 조합원에게 별 뜻이 없다.
--    **「시공자 입찰이 10월에 시작됩니다」**가 조합원이 알고 싶은 것이다.
--
--  ★ 요약이 비어 있어도 회의는 올라간다.
--    안건과 표결 수치는 정보몽땅 「요약항목」에서 5분이면 옮긴다.
--    요약은 자료를 봐야 쓰므로 나중에 채운다.
--    그때까지 조합원 앱에는 「요약 준비 중」으로 나간다.
-- ═══════════════════════════════════════════════════════════

SET search_path = public;

do $$
begin
  if to_regclass('public.meetings') is null then
    raise exception E'\n\n★ meetings 표가 없습니다.\n'
      '  sql/014 · 015 · 016 을 차례로 돌려 주십시오.\n';
  end if;
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='meetings'
                    and column_name='src_kind') then
    raise exception E'\n\n★ 016_source.sql 을 먼저 돌려 주십시오.\n';
  end if;
end $$;

-- ── 1. 요약 세 칸 ───────────────────────────────────────────
alter table meetings add column if not exists headline text;
alter table meetings add column if not exists digest   text;
alter table meetings add column if not exists meaning  text;

comment on column meetings.headline is '한 줄 요약 · 조합원 앱 소식 제목이 된다';
comment on column meetings.digest   is '무슨 일이 있었나 · 두세 문단';
comment on column meetings.meaning  is '★ 조합원에게 무슨 뜻인가 · 소식지의 핵심';

-- ── 2. 언제 누가 알렸나 ─────────────────────────────────────
--  ★ 요약은 **누군가 해석한 것**이다.
--    표결 숫자는 다툴 여지가 없지만 요약은 다툴 수 있다.
--    「조합에 유리하게 썼다」는 말이 나올 수 있다.
--    그래서 **누가 언제 쓴 요약인지** 반드시 남긴다.
alter table meetings add column if not exists told_at timestamptz;  -- 조합원에게 알린 시각
alter table meetings add column if not exists told_by text;         -- 요약을 쓴 사람

comment on column meetings.told_at is '조합원 앱에 알린 시각 · 비면 아직 안 알린 것';
comment on column meetings.told_by is '요약을 쓴 직원 · 조합원 앱에 함께 나간다';

-- ★ 알렸다고 하려면 한 줄 요약은 반드시 있어야 한다.
--   제목 없이 알림만 나가면 조합원이 무슨 소식인지 모른다.
alter table meetings drop constraint if exists meetings_told_ok;
alter table meetings add  constraint meetings_told_ok
  check (told_at is null or (headline is not null and btrim(headline) <> ''));

create index if not exists meetings_told_idx
    on meetings (tenant_id, told_at desc nulls first);

-- ── 3. 며칠이나 밀렸나 ──────────────────────────────────────
--  ★★★ 적시성이 이 소식지의 전부다 ★★★
--
--    정보몽땅에 어제 올라간 것이 여기에 한 달 뒤에 올라가면
--    **안 올린 것과 다르지 않다.**
--    직원 화면 맨 위에 「5일 지남」처럼 띄운다.
create or replace function mt_late_days(p_src_at date, p_told timestamptz)
returns int language sql immutable as $$
  select case
    when p_src_at is null then null
    when p_told is null then (current_date - p_src_at)
    else (p_told::date - p_src_at)
  end::int
$$;

comment on function mt_late_days is
  '정보몽땅 등록일로부터 며칠 만에 알렸나 · 아직이면 오늘까지 며칠';

-- ── 4. 뷰를 다시 만든다 ─────────────────────────────────────
--  ★ m.* 를 쓰지 말 것. 칸이 늘면 자리가 밀려
--    ERROR 42P16 이 난다. 칸을 하나씩 적는다.
drop view if exists v_agenda;
drop view if exists v_meeting;

create view v_meeting as
select m.id, m.tenant_id, m.title, m.kind, m.year, m.seq,
       m.meet_date, m.meet_time, m.place,
       m.vote_open, m.vote_close, m.status,
       m.src_kind, m.src_at, m.src_url, m.src_no,
       m.headline, m.digest, m.meaning, m.told_at, m.told_by,
       m.created_at, m.created_by, m.updated_at, m.updated_by,
       m.closed_at, m.closed_by,
       mt_late_days(m.src_at, m.told_at) as late_days,
       (m.told_at is not null)           as told,
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
       m.told_at   as meeting_told_at,
       d.id        as decision_id,
       d.yes_n, d.no_n, d.abstain_n, d.total_n, d.attend_n,
       d.approved  as decision_approved
  from agendas a
  join meetings m on m.id = a.meeting_id
  left join decision d on d.agenda_id = a.id;

-- ── 5. 대의원회 총원을 100 으로 ─────────────────────────────
--  ★ 기본값 25 가 그대로 남아 있어
--    「총원 25 · 참석 81」 같은 기록이 만들어졌다.
--    참석이 총원보다 많으면 정족수가 통째로 틀린다.
--
--  ★ 실제 대의원 수를 확인하시면 다시 맞추셔야 한다.
--    사무실 · 임원 화면에 대의원 명단을 넣으시면
--    화면이 그 수를 저절로 씁니다. 그때는 이 값을 0 으로 비우면 된다.
update decision_base set total_n = 100, updated_at = now()
 where kind = 'del' and total_n < 100;

insert into decision_base (tenant_id, kind, total_n)
select distinct tenant_id, 'del', 100 from meetings
on conflict (tenant_id, kind) do nothing;

-- ── 확인 ────────────────────────────────────────────────────
--  select meet_date, title, src_at, told_at, late_days, headline
--    from v_meeting order by meet_date desc;
