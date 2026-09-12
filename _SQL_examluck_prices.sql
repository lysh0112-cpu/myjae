-- _SQL_examluck_prices.sql
--
-- ┌───────────────────────────────────────────────────────────────┐
-- │  합격운 · 취업운 · 승진운 — 가격 항목 «셋» 넣기                  │
-- │  2026-09-13 (7부) [대표님 「각각 항목을 넣고」]                   │
-- └───────────────────────────────────────────────────────────────┘
--
--  ⚠️ Supabase → SQL Editor 에 붙여 넣고 [Run] 하십시오.
--  ⛔ 값은 ★시험 값입니다. 넣으신 뒤 ★관리자 → 💰 가격 관리 에서 고치십시오.
--     (연재쌤과 «진짜» 가격을 정하시는 것이 6부 10-1 에 남아 있습니다)
--
--  ⚠️ 이 파일은 «있으면 그대로 두고, 없으면 넣습니다» — 여러 번 돌려도 안전합니다.

-- ══════════════════════════════════════════════════════════════
--  ① 먼저 «지금 무엇이 있는지» 보십시오 (고치는 것이 아니라 보는 것입니다)
-- ══════════════════════════════════════════════════════════════
select 'analysis_prices' as 표, price_key as 낱말, price as 값
from analysis_prices where price_key like 'examluck%'
union all
select 'consult_prices', price_key, price
from consult_prices where price_key like 'examluck%'
union all
select 'mc_price', item, price
from mc_price where service = 'myc' and item like 'examluck%'
order by 표, 낱말;

-- ══════════════════════════════════════════════════════════════
--  ② AI 값 셋 — analysis_prices
--     ⚠️ examluck_ai (기본값) 은 ★그대로 둡니다. 셋 중 값이 없으면 여기로 떨어집니다.
-- ══════════════════════════════════════════════════════════════
insert into analysis_prices (price_key, price)
values
  ('examluck_pass',  9900),   -- 합격운
  ('examluck_job',   9900),   -- 취업운
  ('examluck_promo', 12000)   -- 승진운  ★재료가 더 많아 조금 높게 잡았습니다
on conflict (price_key) do nothing;

-- ══════════════════════════════════════════════════════════════
--  ③ 🔴 지갑이 보는 표 — mc_price
--     ⛔ 여기 없으면 ★관문이 켜졌을 때 「잔액을 확인하지 못했어요」 가 뜹니다.
--        analysis_prices 에만 넣으면 안 됩니다. ★둘 다 넣어야 합니다.
-- ══════════════════════════════════════════════════════════════
insert into mc_price (service, item, price)
values
  ('myc', 'examluck_pass',  9900),
  ('myc', 'examluck_job',   9900),
  ('myc', 'examluck_promo', 12000)
on conflict (service, item) do nothing;

-- ══════════════════════════════════════════════════════════════
--  ④ 상담 값 — consult_prices
--     ⚠️ 'examluck' 한 줄입니다. 셋이 «같은 상담» 을 씁니다.
--        (결과 화면 아래 [전문상담사 연결] 이 이 값을 봅니다)
-- ══════════════════════════════════════════════════════════════
insert into consult_prices (price_key, price)
values ('examluck', 40000)
on conflict (price_key) do nothing;

insert into mc_price (service, item, price)
values ('myc', 'examluck', 40000)
on conflict (service, item) do nothing;

-- ══════════════════════════════════════════════════════════════
--  ⑤ 넣은 뒤 «값으로» 확인 — ★여섯 줄이 나와야 합니다
-- ══════════════════════════════════════════════════════════════
select 'analysis_prices' as 표, price_key as 낱말, price as 값
from analysis_prices where price_key like 'examluck%'
union all
select 'mc_price', item, price
from mc_price where service = 'myc' and item like 'examluck%'
order by 표, 낱말;

-- ══════════════════════════════════════════════════════════════
--  ⚠️ 값을 고치실 때는 ★관리자 → 💰 가격 관리 에서 하십시오.
--     SQL 로 고치면 두 표(analysis_prices · mc_price)가 ★갈립니다.
--     관리자 화면은 둘을 «함께» 고칩니다.
-- ══════════════════════════════════════════════════════════════
