-- ============================================================
-- 회원끼리 이름 검색 초대 기능
--   - couple_rooms에 초대받은 회원(invitee_id) 저장
--   - 받는 쪽이 "나에게 온 초대"를 조회할 수 있게 함
-- ============================================================

alter table public.couple_rooms
  add column if not exists invitee_id uuid references auth.users(id) on delete set null;

-- 받는 쪽이 자기에게 온 초대를 빨리 찾도록 인덱스
create index if not exists idx_couple_rooms_invitee
  on public.couple_rooms(invitee_id);
