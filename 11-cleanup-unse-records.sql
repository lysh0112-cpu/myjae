-- 11-cleanup-unse-records.sql
-- ============================================================================
-- 통합 리포트 단권화에 따른 테스트 데이터 정리
--   2026-07-29
--
-- ★대표님 확인 — "기존에 대운과 세운에 쌓인 데이터는 모두 테스트 데이터이니
--                 삭제해도 괜찮음"
--
-- ⚠️ 실행 전에 ① 을 먼저 돌려 몇 건인지 눈으로 보십시오.
-- ⚠️ 'saju' 는 지우지 않습니다. 손님이 실제로 본 사주 기록일 수 있습니다.
--    통합 보관함에서 그대로 보입니다(archiveRecords 가 옛 타입도 읽습니다).
-- ============================================================================

-- ① 먼저 세어 보기 (지우기 전 확인)
select service_type, count(*) as cnt
from saju_records
where service_type in ('daeun', 'seyun')
group by service_type;

-- ② 확인했으면 지우기
-- delete from saju_records where service_type in ('daeun', 'seyun');

-- ③ (선택) 옛 'saju' 기록을 통합 타입으로 옮기고 싶다면
--    ⚠️ 안 해도 됩니다. 보관함이 옛 타입도 함께 읽습니다.
-- update saju_records set service_type = 'integrated_saju' where service_type = 'saju';

-- ④ 지운 뒤 확인
-- select service_type, count(*) from saju_records group by service_type order by 2 desc;
