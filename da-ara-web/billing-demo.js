/* ═══════════════════════════════════════════════════════════
   다알아 (Da-Ara) — 사용량 계량과 요금 정산
   ───────────────────────────────────────────────────────────
   ★ 요금 구조 (확정 · C안)
       기본료 안에 일정량이 들어 있고, 그것을 넘긴 만큼만 더 낸다.

       평달에는 조합이 기본료만 내므로 예산을 세우기 쉽다.
       총회가 있는 달에만 조금 더 나온다.
       쓴 만큼 다 받으면 조합이 매달 금액을 예측할 수 없고,
       정액제로 하면 총회 달에 운영사가 손해를 본다.
       그 사이를 잡은 것이 이 방식이다.

   ★ 단가 (확정)
       원가에 플랫폼 운영과 연동 비용을 더한 통합 단가로 청구한다.
       조합 화면에는 묶음 금액만 보이고 원가는 나오지 않는다.
       운영자 콘솔에서는 원가와 청구 단가를 함께 보며 고칠 수 있다.

   ★ 계량 대상 일곱 가지
       카카오 알림톡 · 단문(SMS) · 장문(LMS) · 사진(MMS)
       본인확인 PASS · 본인확인 NICE · AI 생성 답변

   ★ AI 답변을 특히 눈여겨볼 것.
     건당 단가는 낮아도 조합원이 자료실에서 자꾸 물어보면
     문자보다 큰 비용이 된다. 조합장이 미리 아셔야 한다.
     청구서를 받고 나서 "이게 뭐냐" 하시면 늦는다.

   ★ Supabase 대응
       usage_daily   ← USAGE      (구역 · 월 · 항목별 건수)
       price_book    ← PRICE      (원가 · 청구 단가 · 기본 제공량)
       billing_plan  ← PLAN       (기본료 · 구간)
       invoice       ← 계산 결과   (기간별 청구서)
   ═══════════════════════════════════════════════════════════ */

/* ── 1. 단가표 ────────────────────────────────────────────
   cost : 우리가 공급처에 내는 값 (조합 화면에 나오지 않는다)
   fee  : 조합에 청구하는 통합 단가
   incl : 기본료에 들어 있는 월 제공량 */
let PRICE = [
  {k:"alim",  name:"카카오 알림톡",   from:"중계사",       cost:9,  fee:15,  incl:500},
  {k:"sms",   name:"단문 문자 (SMS)", from:"중계사",       cost:9,  fee:15,  incl:200},
  {k:"lms",   name:"장문 문자 (LMS)", from:"중계사",       cost:30, fee:45,  incl:50},
  {k:"mms",   name:"사진 문자 (MMS)", from:"중계사",       cost:90, fee:130, incl:10},
  {k:"pass",  name:"본인확인 PASS",   from:"통신 3사",     cost:40, fee:60,  incl:50},
  {k:"nice",  name:"본인확인 NICE",   from:"나이스평가정보", cost:45, fee:65,  incl:50},
  {k:"ai",    name:"AI 생성 답변",    from:"AI 사업자",    cost:12, fee:20,  incl:500},
  /* ★ 동의서 스캔 보관 (2026-08-21)
     단위는 MB · 월. 조합원 500명 × 스캔 1장(약 1MB) = 500MB 이므로
     평달에는 기본 제공량 안에서 끝난다. 넘긴 만큼만 붙는다. */
  {k:"store", name:"자료 보관",        from:"Supabase",     cost:0.03, fee:0.05, incl:2048,
   unit:"MB"}
];
const priceOf = k => PRICE.find(p => p.k === k) || PRICE[0];

/* ── 2. 요금제 ──────────────────────────────────────────── */
let PLAN = {base:100000, name:"기본형", note:"세대수 5,000 이하"};

/* ── 3. 사용량 (구역 · 월별) ─────────────────────────────
   ★ 3월이 두 배로 튄다. 총회 소집통지와 투표 안내가 나간 달이다.
     "왜 이번 달만 많이 나왔냐" 는 물음에 이 표로 답한다. */
let USAGE = [
  {code:"MIA-002", ym:"2026-01", alim:320, sms:84,  lms:32, mms:4,  pass:28, nice:16, ai:520, store:0},
  {code:"MIA-002", ym:"2026-02", alim:380, sms:96,  lms:40, mms:6,  pass:30, nice:18, ai:640, store:0},
  {code:"MIA-002", ym:"2026-03", alim:540, sms:132, lms:76, mms:12, pass:38, nice:24, ai:980, store:0}
];

/* 스캔을 올리면 그만큼 계량에 쌓는다 */
function usageStore(mb, code){
  const d = new Date(), z = v => String(v).padStart(2,"0");
  const ym = `${d.getFullYear()}-${z(d.getMonth()+1)}`;
  const c = code || ((typeof TENANT_CODE !== "undefined") ? TENANT_CODE : "MIA-002");
  let u = USAGE.find(x => x.code === c && x.ym === ym);
  if(!u){ u = {code:c, ym, alim:0, sms:0, lms:0, mms:0, pass:0, nice:0, ai:0, store:0}; USAGE.push(u); }
  u.store = (u.store || 0) + Math.max(1, Math.round(mb));
}

/* 조회 기간
   ★ 기본값을 이번 달로 잡는다.
     과거 기간으로 고정해 두면 오늘 보낸 문자가 화면에 안 나타나
     "발송했는데 왜 안 늘지" 하고 헤매게 된다. */
const _nowYm = (() => { const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; })();
const BILLQ = {from:_nowYm, to:_nowYm};

const monthsIn = () => {
  const out = [];
  const [fy, fm] = BILLQ.from.split("-").map(Number);
  const [ty, tm] = BILLQ.to.split("-").map(Number);
  let y = fy, m = fm;
  while(y < ty || (y === ty && m <= tm)){
    out.push(`${y}-${String(m).padStart(2,"0")}`);
    m += 1; if(m > 12){ m = 1; y += 1; }
  }
  return out;
};

const usageRows = code => USAGE.filter(u =>
  (!code || u.code === code) && monthsIn().indexOf(u.ym) >= 0);

/* 항목별 합계 */
function usageSum(code){
  const out = {};
  PRICE.forEach(p => out[p.k] = 0);
  usageRows(code).forEach(u => PRICE.forEach(p => out[p.k] += (u[p.k] || 0)));
  return out;
}

/* ── 4. 청구 계산 ─────────────────────────────────────────
   ★ 초과분은 달마다 따로 센다.
     분기 합계로 계산하면 제공량을 세 배로 준 셈이 되어
     실제보다 적게 청구된다. 이 실수가 정산에서 가장 흔하다. */
function billOf(code){
  const ms = monthsIn();
  const lines = PRICE.map(p => {
    let used = 0, over = 0;
    ms.forEach(ym => {
      const u = USAGE.find(x => x.code === code && x.ym === ym);
      const n = u ? (u[p.k] || 0) : 0;
      used += n;
      over += Math.max(0, n - p.incl);
    });
    return {k:p.k, name:p.name, from:p.from, used, over,
            incl:p.incl * ms.length, fee:p.fee, cost:p.cost,
            amount:over * p.fee, costAmount:used * p.cost};
  });
  const base   = PLAN.base * ms.length;
  const overSum = lines.reduce((a,l) => a + l.amount, 0);
  const supply = base + overSum;
  const vat    = Math.round(supply * 0.1);
  const cost   = lines.reduce((a,l) => a + l.costAmount, 0);
  return {ms, lines, base, overSum, supply, vat, total:supply + vat, cost,
          margin:supply - cost,
          sendCnt: lines.filter(l=>["alim","sms","lms","mms"].indexOf(l.k)>=0)
                        .reduce((a,l)=>a+l.used,0),
          authCnt: lines.filter(l=>["pass","nice"].indexOf(l.k)>=0)
                        .reduce((a,l)=>a+l.used,0),
          aiCnt: (lines.find(l=>l.k==="ai")||{used:0}).used};
}

/* 전 구역 합계 (운영자 콘솔) */
function billAll(){
  const codes = [...new Set(USAGE.map(u => u.code))];
  const each = codes.map(c => ({code:c, bill:billOf(c)}));
  const sum = each.reduce((a,x) => ({
    supply:a.supply + x.bill.supply, vat:a.vat + x.bill.vat,
    total:a.total + x.bill.total, cost:a.cost + x.bill.cost,
    overSum:a.overSum + x.bill.overSum
  }), {supply:0, vat:0, total:0, cost:0, overSum:0});
  return {each, sum};
}

/* 월별 추이 — 그 달의 기본료 + 초과분 */
function monthlyTrend(code){
  return monthsIn().map(ym => {
    const u = USAGE.find(x => x.code === code && x.ym === ym);
    let over = 0;
    PRICE.forEach(p => { const n = u ? (u[p.k] || 0) : 0;
      over += Math.max(0, n - p.incl) * p.fee; });
    return {ym, over, total:PLAN.base + over};
  });
}

const wonB = v => (v || 0).toLocaleString("ko-KR");

/* ═══════════════════════════════════════════════════════════
   운영자 재무 — 고정 운영비 (2026-08-22)
   ───────────────────────────────────────────────────────────
   ★ 지금까지 콘솔에는 「받는 돈」만 있었다.
     나가는 돈은 인수인계서에 글로만 적혀 있었다.
     그래서 이번 달에 남는지 밑지는지 화면에서 알 수 없었다.

   ★ 변동비와 고정비를 나눈다. 성격이 다르다.
       변동비   문자 · 본인확인 · AI — 쓴 만큼 나간다 (PRICE 의 cost)
       고정비   서버 · 도메인 — 조합이 하나도 없어도 나간다 (아래 OPEX)

   ★ 달러로 내는 것은 환율이 바뀐다.
     환율을 한 곳에 두고 원화로 환산해 보여 준다.
     환율이 오르면 마진이 줄어드는데, 숫자로 보이지 않으면 모른다.

   ★ 이 표는 운영자만 본다. 조합 화면에는 원가가 나가지 않는다.
     인수인계서 「원가와 마진은 운영자 콘솔에서만 보이고,
     조합 화면에는 묶음 금액만 나간다」                        */
let FX = 1380;                     /* 원/달러 · 운영자가 고친다 */

let OPEX = [
  {k:"supabase", name:"Supabase Pro",   from:"데이터베이스 · 저장소", usd:25, krw:0, on:true},
  {k:"cf",       name:"Cloudflare Pages", from:"화면 배포",          usd:0,  krw:0, on:true},
  {k:"domain",   name:"조합 도메인",       from:"mia2.co.kr 등",      usd:0,  krw:0, on:false},
  {k:"relay",    name:"문자 중계사 기본료", from:"솔라피",             usd:0,  krw:0, on:false},
  {k:"idv",      name:"본인인증 기본료",   from:"포트원",             usd:0,  krw:0, on:false}
];

/* 한 달치 고정비 — 켜 둔 것만 센다 */
function opexSum(){
  return OPEX.filter(o => o.on)
    .reduce((a,o) => a + Math.round((o.usd||0) * FX) + (o.krw||0), 0);
}
const opexOf = o => Math.round((o.usd||0) * FX) + (o.krw||0);

/* ── 운영자 손익 ────────────────────────────────────────
   ★ 부가세는 우리 돈이 아니다.
     받아서 국가에 내는 돈이라 수입에 넣으면 안 된다.
     공급가액으로만 센다. 여기서 틀리면 10%가 통째로 부풀려진다.

   ★ 고정비는 달수만큼 곱한다.
     분기로 조회하시면 서버비도 석 달치가 나가야 맞다. */
function opProfit(){
  const b  = billAll();
  const ms = monthsIn().length || 1;
  const revenue = b.sum.supply;          /* 공급가액 = 실제 수입 */
  const varCost = b.sum.cost;            /* 문자 · 인증 · AI 원가 */
  const fixCost = opexSum() * ms;        /* 서버 · 도메인 */
  const cost    = varCost + fixCost;
  return {ms, revenue, varCost, fixCost, cost,
          profit: revenue - cost,
          rate: revenue ? (revenue - cost) / revenue * 100 : 0,
          vat: b.sum.vat, each: b.each};
}

/* ── 지난달과 견주기 ────────────────────────────────────
   ★ 조회 기간을 잠깐 지난달로 옮겼다가 되돌린다.
     되돌리지 않으면 화면이 지난달을 보여 주게 된다. */
function opPrev(){
  const keep = {from:BILLQ.from, to:BILLQ.to};
  const [y, m] = BILLQ.from.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  const ym = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
  BILLQ.from = ym; BILLQ.to = ym;
  let r;
  try { r = opProfit(); }
  finally { BILLQ.from = keep.from; BILLQ.to = keep.to; }
  return r;
}

/* 구역별 매출 기여도 — 큰 것부터 */
function opByTenant(){
  const p = opProfit();
  return p.each
    .map(x => ({code:x.code, revenue:x.bill.supply, cost:x.bill.cost,
                share: p.revenue ? x.bill.supply / p.revenue * 100 : 0}))
    .sort((a,b) => b.revenue - a.revenue);
}
