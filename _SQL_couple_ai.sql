-- ============================================================
-- 커플채팅 AI 조언용: 방에 궁합 정보 연결
--   - couple_rooms에 궁합 기록 스냅샷을 담을 컬럼 추가
--   - 초대 시 두 사람 사주 + 궁합 결과를 방에 저장 → AI가 읽음
-- ============================================================

alter table public.couple_rooms
  add column if not exists compat_data jsonb;   -- 궁합 정보 스냅샷(두 사람 사주 + 결과)

-- compat_data 예시 구조:
-- {
--   "person1": {"year":1990,"month":5,"day":3,"hour":6,"gender":"남","name":"..."},
--   "person2": {"year":1992,"month":8,"day":15,"hour":3,"gender":"여","name":"..."},
--   "grade": "천생연분",
--   "summary": "궁합 결과 요약 텍스트..."
-- }
