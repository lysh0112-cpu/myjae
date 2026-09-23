-- ═══════════════════════════════════════════════════════════
--  019_part_mime.sql — 조각을 받게 한다 (2026-09-16)
-- ───────────────────────────────────────────────────────────
--  ★ 018 을 먼저 돌리셔야 합니다.
--  ★ 이미 돌리셨습니다 (2026-09-16 저녁). 다시 돌려도 안전합니다.
--
--  ★ 왜 필요한가
--
--    018 에서 버킷이 받을 파일 종류를 PDF · 사진 · 한글 · 워드로 못 박았다.
--    그런데 45MB 씩 잘라 보내는 **조각**은 application/octet-stream 이라
--    서버가 거절했다.
--
--      2조각 가운데 1번째에서 멈췄습니다.
--      이 형식은 올리실 수 없습니다.
--
--  ★ 조각은 어차피 `.part` 로 끝나고, 원래 파일 종류는
--    hubUploadBig() 이 보내기 전에 이미 검사했다.
--    서버는 조각을 그대로 받아 두기만 하면 된다.
--
--  ★ 왜 조각으로 나누나 (72번 절)
--
--    Supabase 프로젝트 전체 한도가 **50MB** 다.
--    Pro 라도 **지출 상한(spend cap)이 켜져 있으면** 그렇게 묶인다.
--    상한을 끄면 500GB 까지 되지만, 전송량이 250GB 를 넘을 때
--    **요금이 그대로 붙는다.** 조합 돈이라 상한은 켜 둔 채로 간다.
--
--    ★★★ 쪼개도 조합원은 몰라야 한다 ★★★
--      목록에는 한 줄, 내려받으시면 브라우저가 이어 붙여
--      **원래 파일 하나**가 받아진다.
-- ═══════════════════════════════════════════════════════════

SET search_path = storage;

update storage.buckets
   set allowed_mime_types = array[
     'application/pdf',
     'image/jpeg', 'image/png',
     'application/haansofthwp', 'application/x-hwp', 'application/vnd.hancom.hwp',
     'application/haansofthwpx', 'application/vnd.hancom.hwpx',
     'application/msword',
     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
     -- ★ 조각 (45MB 씩 잘라 보내는 것)
     'application/octet-stream'
   ]
 where id = 'consent-scan';

-- ── 확인 ────────────────────────────────────────────────────
select id,
       file_size_limit / 1024 / 1024 as mb,
       array_length(allowed_mime_types, 1) as 받는종류,
       public
  from storage.buckets;

--  ★ mb 200 · 받는종류 11 로 나오면 된 것입니다.
