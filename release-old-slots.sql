-- ============================================================================
-- 이미 끝난 상담이 붙들고 있는 시간(슬롯) 풀기 — 2026-07-21 2차
--
-- [왜 필요한가]
--   상담 종료 시 슬롯을 여는 처리는 이번에 새로 넣었다.
--   그 전에 완료된 상담들은 아직 슬롯을 잡고 있어, 일정표에
--   「예약참」(파랑)으로 남아 있다. → 그 시간에 새 예약을 못 받는다.
--
-- [순서] ① 확인 → 눈으로 보고 → ② 정리
-- ============================================================================

-- ① 먼저 확인 — 어떤 시간이 헛되이 잠겨 있나
select s.id, s.slot_date, s.slot_hour, c.name as 상담사,
       con.status as 상담상태, con.completed_at as 종료시각
  from public.consultant_slots s
  join public.bookings b       on b.slot_id = s.id
  join public.consultations con on con.id = b.consultation_id
  left join public.consultants c on c.id = s.consultant_id
 where s.is_booked = true
   and (con.status = 'completed' or con.status = 'cancelled' or con.status = 'canceled')
 order by s.slot_date, s.slot_hour;


-- ② 위 목록이 맞으면 실행 — 끝난 상담이 잡고 있던 시간을 연다
update public.consultant_slots s
   set is_booked = false
  from public.bookings b, public.consultations con
 where b.slot_id = s.id
   and con.id = b.consultation_id
   and s.is_booked = true
   and (con.status = 'completed' or con.status = 'cancelled' or con.status = 'canceled');


-- ③ 확인 — 아직 잠긴 시간은 진행 중인 예약만 남아야 한다
select s.slot_date, s.slot_hour, con.status
  from public.consultant_slots s
  left join public.bookings b       on b.slot_id = s.id
  left join public.consultations con on con.id = b.consultation_id
 where s.is_booked = true
 order by s.slot_date, s.slot_hour;
