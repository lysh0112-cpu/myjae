-- ══════════════════════════════════════════════════════════════════════
--  _SQL_wallet_charge_paid.sql
--  ★손님이 «스스로 결제해서» 넣는 충전 함수          2026-09-22 (11부)
--
--  ┌──────────────────────────────────────────────────────────────────┐
--  │  [까닭]  기존 wallet_charge 는 ★«master 만» 부를 수 있습니다 —    │
--  │    v_me := auth.uid() → profiles.role 이 'master' 가 아니면       │
--  │    ★reason 'not_master' 로 거절합니다.                            │
--  │  ⇒ 토스 승인 창구는 ★«서버 열쇠»(service_role)로 부르므로          │
--  │    auth.uid() 가 «없고», 그래서 ★늘 거절당했습니다.                │
--  │  ⇒ 대표님 시험에서 「결제는 됐는데 지갑에 넣지 못했어요」 가 난 까닭. │
--  └──────────────────────────────────────────────────────────────────┘
--
--  ⛔⛔ ★기존 wallet_charge 에 「auth.uid() 가 없으면 통과」 를 «넣지 마십시오».
--     로그인 «안 한» 손님도 auth.uid() 가 없습니다 ⇒ ★누구나 무한 충전이 됩니다.
--     ⇒ 그래서 ★«서버만» 부를 수 있는 함수를 «따로» 만듭니다.
--
--  🔴 막는 법은 ★«권한» 입니다 (아래 revoke/grant) —
--     anon · authenticated 에게서 ★실행 권한을 걷고, ★service_role 에만 줍니다.
--     ⇒ 손님 브라우저에서는 이 함수를 ★«부를 수 없습니다».
--
--  ⚠️ 관리자 화면이 쓰는 wallet_charge 는 ★«그대로» 둡니다. 손대지 않습니다.
--
--  ⇒ Supabase SQL 편집기에 ★«통째로» 붙여 넣고 한 번 돌리십시오.
-- ══════════════════════════════════════════════════════════════════════

create or replace function public.wallet_charge_paid(
  p_user_id uuid,
  p_amount  integer,
  p_service text default 'myc',
  p_memo    text default null
) returns json
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_after integer;
  v_dup   integer;
begin
  --  ⛔ ★«넣는» 일만 합니다. 빼는 값(음수)은 안 받습니다.
  if p_amount is null or p_amount <= 0 then
    return json_build_object('ok', false, 'reason', 'bad_amount');
  end if;

  --  ⛔ ★주문번호(orderId)가 «반드시» 있어야 합니다 — 멱등의 열쇠입니다.
  if p_memo is null or length(p_memo) < 6 then
    return json_build_object('ok', false, 'reason', 'no_order_id');
  end if;

  --  🔴 ★이미 넣은 주문인가 — 손님이 «새로고침» 하면 두 번 들어옵니다.
  --     ⇒ 창구(route.ts)도 막지만, ★여기서도 막습니다. 돈 자리는 두 겹으로.
  select count(*) into v_dup from mc_ledger where memo = p_memo;
  if v_dup > 0 then
    select balance into v_after from mc_wallet where user_id = p_user_id;
    return json_build_object('ok', true, 'already', true, 'balance', v_after);
  end if;

  --  ⚠️ 지갑 줄이 없으면 만들어 둡니다 (첫 충전인 손님)
  insert into mc_wallet (user_id, balance) values (p_user_id, 0)
    on conflict (user_id) do nothing;

  update mc_wallet set balance = balance + p_amount, up_at = now()
   where user_id = p_user_id
  returning balance into v_after;

  if v_after is null then
    return json_build_object('ok', false, 'reason', 'no_wallet');
  end if;

  --  ⚠️ ★memo 에 주문번호를 적습니다 — 창구가 «이미 넣었는지» 를 이것으로 봅니다.
  insert into mc_ledger (user_id, service, kind, item, amount, after, memo)
    values (p_user_id, p_service, 'charge', 'charge', p_amount, v_after, p_memo);

  return json_build_object('ok', true, 'balance', v_after);
end
$function$;

-- ══ 🔴🔴 권한 — ★여기가 «진짜 문지기» 입니다 ═══════════════════════
--  ⛔ 이 세 줄을 «빠뜨리면» 손님 브라우저에서도 부를 수 있게 됩니다.
revoke all on function public.wallet_charge_paid(uuid, integer, text, text) from public;
revoke all on function public.wallet_charge_paid(uuid, integer, text, text) from anon, authenticated;
grant execute on function public.wallet_charge_paid(uuid, integer, text, text) to service_role;

-- ══ ⚠️ 한 겹 더 — 같은 주문번호가 ★두 줄 될 수 없게 ════════════════
--  ⚠️ 충전 주문번호는 'myjae_…' 로만 만듭니다 (charge/page.tsx).
--     ⇒ 관리자가 손으로 적는 메모(「계좌이체」 등)는 ★걸리지 않습니다.
create unique index if not exists mc_ledger_paid_memo_uq
  on mc_ledger (memo) where memo like 'myjae\_%';
