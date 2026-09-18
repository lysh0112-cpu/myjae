-- ══════════════════════════════════════════════════════════════════
--  🏠 홈 카드 가격 표시 — home_prices 열두 줄  ★2026-09-18 (10부)
--
--  [대표님]  「홈화면 가격표도 만들어줘 · 토글버튼이 있어야 해 ·
--             나중에 토글을 꺼서 홈화면의 가격을 숨길 수도 있어야 해」
--             서비스 ★전부(열둘) · ★비회원도 보임 · 값은 ★AI 분석값
--
--  ⚠️ Supabase → SQL Editor 에서 ★«한 번만» 돌리시면 됩니다.
--  ⚠️ 여러 번 돌려도 ★안전합니다 (이미 있는 줄은 안 건드립니다).
--
--  🔴 ★price 칸은 «안 씁니다».
--     홈에 보일 값은 analysis_prices 의 «켜져 있는 가장 싼 값» 에서 저절로 옵니다.
--     ⇒ 대표님이 AI 값을 고치시면 ★홈도 «저절로» 따라갑니다.
--     ⇒ 여기에 값을 적어 두면 가격이 «네 곳» 이 되어 조용히 어긋납니다.
--  ⇒ 이 표는 ★show_price(보일지 말지) «만» 씁니다.
--
--  ⛔ ★처음에는 «다 꺼짐»(false) 으로 넣습니다.
--     켜는 것은 대표님이 관리 화면에서 «보시면서» 하십시오.
-- ══════════════════════════════════════════════════════════════════

-- ── ① 표가 없으면 만듭니다 (이미 있으면 그냥 지나갑니다) ──────────
create table if not exists public.home_prices (
  service_key text primary key,
  label       text not null,
  price       integer not null default 0,   -- ⚠️ 안 씁니다 (위 설명 참고)
  show_price  boolean not null default false,
  sort        integer not null default 0,
  updated_at  timestamptz not null default now()
);

-- ── ② 열두 줄 ────────────────────────────────────────────────────
--    ⚠️ service_key 는 ★consult_prices.price_key 와 «같은 낱말» 입니다.
--       (lib/homePrices.ts 의 HOME_PRICE_SERVICES 와 한 글자도 달라선 안 됩니다)
--    ⚠️ 차례(sort)는 ★관리 화면 표의 차례와 같게 두었습니다.
insert into public.home_prices (service_key, label, show_price, sort) values
  ('mulsang',      '내사주그림',           false,  10),
  ('career',       '진로적성',             false,  20),
  ('haerak',       '하락이수',             false,  30),
  ('examluck',     '합격운/취업운/승진운', false,  40),
  ('couple',       '궁합',                 false,  50),
  ('saju',         '내 사주와 운세보기',    false,  60),
  ('wedding',      '결혼택일',             false,  70),
  ('birth',        '출산택일',             false,  80),
  ('moving',       '이사택일',             false,  90),
  ('naming',       '내 이름 정밀분석',      false, 100),
  ('naming_baby',  '내 아이 명품작명',      false, 110),
  ('tarot',        '타로',                 false, 120)
on conflict (service_key) do nothing;

-- ── ③ 확인 ───────────────────────────────────────────────────────
--    ⚠️ ★열두 줄이 나와야 합니다.
select service_key, label, show_price, sort
from public.home_prices
order by sort;

-- ── ④ ⚠️ 옛 줄이 남아 있다면 ─────────────────────────────────────
--    전에 만들어 두신 네 줄(궁합 분석 · 내 사주가 그림이 된다면 ·
--    인생 이름풀이/개명 · 타로 카드 리딩)이 «다른 낱말» 로 들어 있으면
--    ③에서 열둘보다 많이 나옵니다.
--
--    🔴 ★그 줄들은 이제 «아무 데서도 안 읽습니다». 그냥 두셔도 괜찮습니다.
--       화면에서 «보이지도» 않습니다. ⛔ 굳이 지우실 필요 없습니다.
--
--    ⚠️ 그래도 깔끔히 지우고 싶으시면 —
--       ⛔ 먼저 ③을 돌려 «무엇이 지워질지» 눈으로 보신 «뒤» 에 아래를 돌리십시오.
--
-- delete from public.home_prices
--  where service_key not in (
--    'mulsang','career','haerak','examluck','couple','saju',
--    'wedding','birth','moving','naming','naming_baby','tarot'
--  );
