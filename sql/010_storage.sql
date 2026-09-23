-- ═══════════════════════════════════════════════════════════
--  010_storage.sql — 파일 저장소 (2026-08-22 오후)
-- ───────────────────────────────────────────────────────────
--  ★★★ 이 파일은 지금까지 없었다 ★★★
--
--    동의서 스캔과 자료실 문서는 Supabase Storage 에 올라간다.
--    그런데 저장소를 만드는 SQL 이 어디에도 없었다.
--    정책 두 줄이 인수인계서 본문에 적혀만 있었고 파일로는 없었다.
--
--    그래서 000~009 를 순서대로 돌린 사람은
--    표는 다 만들어졌는데 파일만 안 올라가는 상태가 된다.
--    화면에는 「올리지 못했습니다 (404)」 만 뜬다.
--    404 가 무슨 뜻인지 알 수 없어 인터넷 탓인 줄 아신다.
--
--  ★ 저장소는 하나만 쓴다.
--    이름은 consent-scan 이지만 자료실 문서도 여기 담는다.
--    저장소를 여럿 만들면 정책도 여럿이 되고, 한쪽만 고치는 일이 생긴다.
--
--  ★★★ 경로 맨 앞에 구역 코드가 붙는다 (2026-08-22 오후) ★★★
--
--        동의서 스캔    MIA-002__CSF-001__CS-2026-0001.pdf
--        자료실 문서    MIA-002__arc__AR-2026-001.pdf
--                       ↑ 구역
--
--    구역이 없으면 파일이 서로 덮어쓴다.
--    자료 번호(AR-2026-001)는 구역마다 1번부터 다시 세기 때문에
--    미아2 의 AR-2026-001 과 미아3 의 AR-2026-001 이 같은 이름이 된다.
--    게다가 hub.js 가 x-upsert 로 올리므로
--    **오류도 없이 앞의 파일이 지워지고 뒤의 것이 덮인다.**
--
--    미아2 조합원이 자기 고시문을 열었더니 미아3 고시문이 나오고
--    원본은 이미 없어진 뒤다. 되돌릴 방법이 없다.
--
--    ★ 다만 이것은 이름이 겹치지 않게 하는 것일 뿐, 접근 차단이 아니다.
--      아래 정책은 아직 anon 에게 저장소 전체를 열어 두고 있어
--      경로만 알면 남의 구역 파일도 열린다.
--      진짜 격리는 Supabase Auth 를 붙이고
--      「로그인한 사람의 구역으로 시작하는 파일만」 으로 좁혀야 생긴다.
--      맨 아래에 그때 쓸 정책을 적어 두었다.
--
--  ★ 경로에 슬래시를 쓰지 않는다.
--    폴더처럼 나누면 주소에서 %2F 로 바뀌는데,
--    임시 주소를 만들 때와 열 때 경로가 어긋나 InvalidSignature 가 난다.
--    hub.js 의 hubPath() 가 슬래시를 - 로 바꾼다.
-- ═══════════════════════════════════════════════════════════

-- ── 저장소 만들기 ───────────────────────────────────────────
--  ★ public 을 끈 채로 만든다.
--    동의서 스캔에는 조합원 이름과 서명이 들어 있다.
--    주소만 알면 열리는 저장소에 두면 안 된다.
--    열어 볼 때마다 한 시간짜리 임시 주소를 받아서 연다.
--
--  ★ 용량과 확장자를 서버에서도 막는다.
--    화면에서만 막으면 개발자 도구로 얼마든지 넘길 수 있다.
--    40MB 짜리 제한이 화면에만 있으면 400MB 가 올라가고,
--    저장 요금은 우리 것으로 나간다.
--
--  ★ 40MB 로 둔다 (자료실 기준).
--    동의서 스캔은 화면에서 20MB 로 막지만 저장소는 하나뿐이라
--    큰 쪽에 맞춘다. 스캔 20MB 는 화면 쪽 규칙으로 남는다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'consent-scan', 'consent-scan', false,
  41943040,                                   -- 40MB (40 * 1024 * 1024)
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/heic',
    'application/x-hwp',                      -- 한글 .hwp
    'application/hwp+zip',                    -- 한글 .hwpx
    'application/msword',                     -- .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'  -- .docx
  ]
)
on conflict (id) do update set
  public             = false,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ★ 브라우저는 .hwp 의 종류를 모른다. 빈 값으로 준다.
--   그대로 보내면 application/octet-stream 이 되어 위 목록에 걸린다.
--   그래서 hub.js 의 hubMime() 이 확장자를 보고 종류를 붙여 보낸다.
--   ★ 이 목록과 hub.js 의 HUB_MIME 은 반드시 같아야 한다.
--     한쪽만 고치면 그 확장자가 조용히 400 으로 막힌다.

-- ── 정책 ────────────────────────────────────────────────────
--  ★ 지금은 로그인 장치가 없어 anon 에게 열어 둔다. 임시다.
--    실제 조합원 명부를 올리기 전에 반드시 좁혀야 한다.
--    → 인수인계서 「배포 전 반드시 ⑲」
--
--  ★ 네 가지를 다 만든다. 예전에는 두 개(올리기·보기)뿐이었다.
--       insert  올리기
--       select  열어 보기 (임시 주소 발급에도 필요하다)
--       update  같은 이름으로 다시 올리기  ← 빠져 있었다
--       delete  잘못 올린 것 떼어내기      ← 빠져 있었다
--
--    update 가 없으면 [바꾸기] 로 같은 접수번호에 다시 올릴 때 막힌다.
--    hub.js 가 x-upsert 로 보내는데, 이미 있는 파일을 덮어쓰려면
--    insert 가 아니라 update 권한이 필요하다.
--
--    delete 가 없으면 [스캔 떼기] 를 눌러도 파일이 그대로 남는다.
--    화면에서는 떨어진 것처럼 보이는데 저장소에는 남아 있다.
--    조합원 서명이 든 파일이 지워진 줄 알고 계시게 된다.

drop policy if exists "다알아 파일 올리기"   on storage.objects;
drop policy if exists "다알아 파일 보기"     on storage.objects;
drop policy if exists "다알아 파일 바꾸기"   on storage.objects;
drop policy if exists "다알아 파일 지우기"   on storage.objects;
-- 예전 이름도 함께 지운다 (인수인계서 본문에 있던 것)
drop policy if exists "동의서 스캔 올리기"   on storage.objects;
drop policy if exists "동의서 스캔 보기"     on storage.objects;

create policy "다알아 파일 올리기" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'consent-scan');

create policy "다알아 파일 보기" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'consent-scan');

create policy "다알아 파일 바꾸기" on storage.objects
  for update to anon, authenticated
  using      (bucket_id = 'consent-scan')
  with check (bucket_id = 'consent-scan');

create policy "다알아 파일 지우기" on storage.objects
  for delete to anon, authenticated
  using (bucket_id = 'consent-scan');

-- ── 잘 됐는지 확인 ──────────────────────────────────────────
--  ★ 돌린 뒤 이 두 줄을 실행해 눈으로 보십시오.
--    아무 것도 안 나오면 위가 안 들어간 것입니다.
--
--    select id, public, file_size_limit,
--           array_length(allowed_mime_types, 1) as 확장자수
--      from storage.buckets where id = 'consent-scan';
--
--    select policyname, cmd from pg_policies
--     where schemaname = 'storage' and tablename = 'objects'
--       and policyname like '다알아%' order by cmd;
--
--    저장소 한 줄 + 정책 네 줄이 나와야 합니다.

-- ★ 정책 만들 때 must be owner of table objects 오류가 나면
--   SQL Editor 대신 대시보드에서 하십시오.
--     Storage → consent-scan → Policies → New policy
--   Supabase 프로젝트에 따라 storage.objects 주인이 다릅니다.

-- ═══════════════════════════════════════════════════════════
--  ★ 나중에 — 구역별로 진짜 잠그기 (Supabase Auth 를 붙인 뒤)
-- ───────────────────────────────────────────────────────────
--  위 정책은 anon 에게 저장소 전체를 열어 둔 임시 규칙이다.
--  경로에 구역 코드를 붙여 두었으므로, 로그인이 생기면
--  「내 구역으로 시작하는 파일만」 으로 좁힐 수 있다.
--
--  ★ 아직 돌리지 마십시오. 로그인 장치가 없어 지금 돌리면
--    아무도 파일을 못 올리고 못 엽니다.
--
--  drop policy if exists "다알아 파일 올리기" on storage.objects;
--  create policy "다알아 파일 올리기" on storage.objects
--    for insert to authenticated
--    with check (
--      bucket_id = 'consent-scan'
--      and name like (auth.jwt() ->> 'tenant_id') || '\_\_%'
--    );
--
--  (보기 · 바꾸기 · 지우기도 같은 조건으로 바꾼다)
--
--  ★ 조합원 앱은 자료실 원문을 열어야 하므로 select 는
--    조합원 자리에도 열어 두되, 역시 자기 구역으로 한정한다.
--
--  ★ auth.jwt() 에 tenant_id 를 담는 것은
--    sql/001_core_schema.sql 의 current_tenant() 와 짝을 맞춘다.
--    두 곳이 다른 이름을 쓰면 한쪽만 새는 구멍이 생긴다.
--    → 인수인계서 「배포 전 반드시 ⑱ · ⑲」
