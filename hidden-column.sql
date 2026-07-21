-- ============================================================================
-- 상담 내역 "고객 화면에서만 숨기기" — 2026-07-21 2차
--
-- [왜 필요한가]
--   고객이 마이페이지에서 [×]를 누르면 그 상담이 목록에서 사라져야 한다.
--   그런데 이 기록은 상담사 정산·관리자 집계의 근거라, 진짜로 지우면 안 된다.
--   → 실제 삭제 대신 이 칸만 true 로 바꿔 고객 화면에서만 감춘다.
--
-- [영향]
--   상담사 화면·관리자 정산은 이 칸을 보지 않으므로 그대로 다 보인다.
--   기존 상담 건은 전부 false(기본값)라 지금과 똑같이 보인다.
--
-- [되돌리려면]
--   alter table public.consultations drop column hidden_by_customer;
-- ============================================================================

alter table public.consultations
  add column if not exists hidden_by_customer boolean default false;

-- 확인 — 칸이 생겼는지
select column_name, data_type, column_default
  from information_schema.columns
 where table_name = 'consultations'
   and column_name = 'hidden_by_customer';
