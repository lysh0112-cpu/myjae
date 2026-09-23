/* ═══════════════════════════════════════════════════════════
   다알아 (Da-Ara) — 전자 설문조사
   ───────────────────────────────────────────────────────────
   ★ 설문은 전자투표와 다르다. 섞으면 분쟁이 된다.

       전자투표 : 법적 의결권 행사 · 정관 근거 필요 · 정족수 · 철회 절차
       설문조사 : 참고용 의견 수렴 · 법적 효력 없음

     응답 화면 맨 위에 "의결이 아니다" 는 경고를 고정한다.
     이게 빠지면 나중에 "설문에서는 반대가 많았는데 왜 통과됐냐" 는
     말이 반드시 나온다.

   ★ 확정한 운영 방식
       결과 공개 : 마감 후 공개  (여론 쏠림 방지)
       익명      : 답변은 익명, 참여 여부만 기록 (1인 1회 통제)

     누가 응답했는지는 남기되, 어떤 답을 했는지는 이름과 잇지 않는다.
     이 둘을 분리해야 솔직한 답이 나오면서 중복도 막힌다.

   ★ Supabase 대응
       surveys        ← SURVEYS
       survey_items   ← SURVEYS[].items      (문항 · 유형 · 보기)
       survey_answers ← SV_ANSWERS           (답변 · 설문id+문항id 기준, 익명)
       survey_voters  ← SV_VOTERS            (참여 여부만 · 답변과 잇지 않음)
   ═══════════════════════════════════════════════════════════ */

/* ── 1. 문항 유형 여덟 가지 ────────────────────────────────
   보기가 넷 이하면 라디오가 편하고,
   이주 희망 시기처럼 열두 달을 고르는 것은 드롭다운이 낫다.
   폰 화면에서 차이가 크다. */
const SV_TYPES = [
  {k:"one",   name:"단일 선택",   opt:true,  desc:"보기 하나만"},
  {k:"many",  name:"복수 선택",   opt:true,  desc:"여러 개 고르기"},
  {k:"drop",  name:"드롭다운",     opt:true,  desc:"보기가 많을 때"},
  {k:"short", name:"주관식 단답", opt:false, desc:"한 줄"},
  {k:"long",  name:"주관식 장문", opt:false, desc:"여러 줄"},
  {k:"scale", name:"척도 1~5",    opt:false, desc:"만족도 등"},
  {k:"date",  name:"날짜",        opt:false, desc:"희망 시기"},
  {k:"num",   name:"숫자",        opt:false, desc:"인원 · 금액"}
];
const svType = k => SV_TYPES.find(t => t.k === k) || SV_TYPES[0];

/* ── 2. 설문 양식 ─────────────────────────────────────────
   양식은 출발점일 뿐이다. 불러온 뒤 문항을 고치고 더할 수 있다. */
const SV_TEMPLATES = [
  {id:"S1", name:"총회 참석 사전조사", desc:"정족수 예측",
   title:"○○년 정기총회 참석 사전조사",
   items:[
     {q:"총회에 직접 참석하실 계획이십니까?", t:"one", req:true,
      opts:["직접 참석","서면결의","전자투표","미정"]},
     {q:"참석이 어려운 이유가 있으시면 알려 주십시오", t:"long", req:false, opts:[]},
     {q:"총회 시간대는 언제가 편하십니까?", t:"one", req:false,
      opts:["평일 오전","평일 오후","평일 저녁","주말"]},
     {q:"대리인을 통해 참석하실 계획이십니까?", t:"one", req:false,
      opts:["직접 참석","배우자·직계존비속 대리","미정"]}
   ]},

  {id:"S2", name:"안건별 사전 의견", desc:"찬반 여론",
   title:"○○년 정기총회 안건 사전 의견 수렴",
   items:[
     {q:"제1호 사업시행계획 변경의 건에 대한 의견", t:"one", req:true,
      opts:["찬성","반대","판단 유보"]},
     {q:"제2호 예산안 승인의 건에 대한 의견", t:"one", req:true,
      opts:["찬성","반대","판단 유보"]},
     {q:"제3호 임원 선임의 건에 대한 의견", t:"one", req:true,
      opts:["찬성","반대","판단 유보"]},
     {q:"판단이 어려우신 안건이 있다면 무엇입니까?", t:"many", req:false,
      opts:["제1호","제2호","제3호","없음"]},
     {q:"추가 설명이 필요한 부분을 적어 주십시오", t:"long", req:false, opts:[]},
     {q:"총회 전 설명회가 필요하다고 보십니까?", t:"one", req:false,
      opts:["필요하다","필요 없다","모르겠다"]}
   ]},

  {id:"S3", name:"평형 선호도", desc:"관리처분 대비",
   title:"조합원 분양 평형 선호도 조사",
   items:[
     {q:"1지망 평형을 골라 주십시오", t:"drop", req:true,
      opts:["전용 59㎡","전용 74㎡","전용 84㎡","전용 101㎡","전용 114㎡"]},
     {q:"2지망 평형을 골라 주십시오", t:"drop", req:false,
      opts:["전용 59㎡","전용 74㎡","전용 84㎡","전용 101㎡","전용 114㎡"]},
     {q:"선호하시는 층수 대역", t:"one", req:false,
      opts:["저층(1~10층)","중층(11~25층)","고층(26층 이상)","상관없음"]},
     {q:"분담금 여력은 어느 정도로 보십니까?", t:"one", req:false,
      opts:["1억 미만","1~2억","2~3억","3억 이상","아직 모르겠다"]},
     {q:"평형 선택에서 가장 중요하게 보시는 것", t:"long", req:false, opts:[]}
   ]},

  {id:"S4", name:"이주 희망 시기", desc:"이주 계획 수립",
   title:"이주 희망 시기 및 주거 계획 조사",
   items:[
     {q:"희망하시는 이주 시기", t:"date", req:true, opts:[]},
     {q:"이주 후 주거 계획", t:"one", req:true,
      opts:["전세","월세","자가 이주","가족과 거주","미정"]},
     {q:"이주비 대출이 필요하십니까?", t:"one", req:false,
      opts:["필요","불필요","검토 중"]},
     {q:"함께 이주하실 가구원 수", t:"num", req:false, opts:[]},
     {q:"이주 과정에서 걱정되시는 점", t:"long", req:false, opts:[]}
   ]},

  {id:"S5", name:"조합 운영 만족도", desc:"건의사항",
   title:"조합 운영 만족도 조사",
   items:[
     {q:"조합 운영에 얼마나 만족하십니까?", t:"scale", req:true, opts:[]},
     {q:"정보 공개는 충분하다고 보십니까?", t:"scale", req:true, opts:[]},
     {q:"어떤 정보가 더 필요하십니까?", t:"many", req:false,
      opts:["사업 일정","예산·지출 내역","총회 안건 설명","감정평가","시공자 선정","기타"]},
     {q:"조합과 소통하실 때 편한 방법", t:"one", req:false,
      opts:["앱 알림","문자","우편","전화","조합 사무실 방문"]},
     {q:"건의하실 내용이 있으면 적어 주십시오", t:"long", req:false, opts:[]},
     {q:"이 설문 같은 의견 조사가 도움이 되십니까?", t:"one", req:false,
      opts:["도움이 된다","보통","도움이 안 된다"]}
   ]},

  {id:"S0", name:"처음부터 만들기", desc:"문항을 직접 만듭니다",
   title:"", items:[], blank:true}
];

/* ── 3. 설문 ──────────────────────────────────────────────
   status : draft 준비 · open 진행중 · closed 마감
   결과는 마감 후에 공개한다. */
/* ★ 일련번호도 서버에 담는다. 화면 안에만 두면
   두 직원이 같은 번호로 설문을 만드신다. */
let SV_SEQ = (typeof hubLoad !== "undefined") ? hubLoad("survey_seq", 0) : 0;
const svNo = () => {
  const y = new Date().getFullYear();
  return `SV-${y}-` + String(++SV_SEQ).padStart(3,"0");
};

/* ═══════════════════════════════════════════════════════════
   ★ 설문은 서버에서 읽어 온다 (2026-09-16)
   ───────────────────────────────────────────────────────────
   ★ 예전에는 예시 설문 두 건이 여기 박혀 있었다.

       2026년 정기총회 참석 사전조사   마감 2026-03-18 (반년 지남)
       조합 운영 만족도 조사

     조합원 화면에 **「예시입니다」 표시도 없이** 떠 있었다.
     조합원이 진짜인 줄 알고 답을 하시는데,
     조합이 올린 것이 아니라 **받을 사람이 없었다.**

     답을 하셨는데 아무 반응이 없으면 그때부터 이 앱을 안 믿으신다.
     설문이 제일 위험하다.

   ★★★ 더 큰 문제 — 서버에 담기지 않았다 ★★★

     직원 화면에서 설문을 만들어도 **그 화면 안에서만** 살아 있었다.
     새로고침하면 사라지고, 조합원 폰에는 아예 안 갔다.

     소식 · 자료와 마찬가지로 app_state 에 담고 읽어 온다.
     ★ 직원 화면의 설문 만들기 서식은 그대로다. 담기는 자리만 생겼다.
   ═══════════════════════════════════════════════════════════ */
let SURVEYS = (typeof hubLoad !== "undefined") ? hubLoad("surveys", []) : [];

/* 서버에 올린다 — 직원이 [저장하고 열기]를 누르실 때 */
function svPut(who){
  if(typeof hubPush === "undefined") return Promise.resolve(false);
  return Promise.all([
    hubPush("surveys", SURVEYS, who),
    hubPush("survey_seq", SV_SEQ, who)
  ]).then(r => r.every(Boolean));
}
/* 다른 직원이 올린 것도 받아 온다 */
if(typeof hubPull !== "undefined"){
  hubPull("surveys", v => {
    SURVEYS = Array.isArray(v) ? v : [];
    if(typeof render !== "undefined") render();
  });
  hubPull("survey_seq", v => { SV_SEQ = +v || SV_SEQ; });
}

/* ── 4. 답변 ──────────────────────────────────────────────
   ★ 답변에는 누가 썼는지 남기지 않는다.
     참여 여부(SV_VOTERS)만 따로 기록해 1인 1회를 지킨다.
     둘을 분리해야 솔직한 답이 나오면서 중복도 막힌다. */
let SV_ANSWERS = [];     /* {survey, item, value} — 이름 없음 */
let SV_VOTERS  = [];     /* {survey, voter} — 답 내용 없음 */

function _svRng(seed){ let s = seed>>>0;
  return () => { s = (s*1664525 + 1013904223)>>>0; return s/4294967296; }; }

(function seedAnswers(){
  const R = (typeof VOTERS !== "undefined") ? VOTERS()
          : (typeof ROSTER !== "undefined" ? ROSTER : []);
  const rnd = _svRng(20260305);

  /* SV-2026-001 : 62명 응답 */
  const pick1 = ["직접 참석","전자투표","서면결의","미정"];
  const w1    = [0.39, 0.34, 0.18, 0.09];
  const time  = ["평일 오전","평일 오후","평일 저녁","주말"];
  const why   = [
    "평일 낮이라 직장 때문에 어렵습니다",
    "거동이 불편해 대리 참석이 필요합니다",
    "지방에 살고 있어 이동이 어렵습니다",
    "그날 병원 예약이 잡혀 있습니다",
    "전자투표로 대신하겠습니다"
  ];
  R.slice(0, 62).forEach(r => {
    SV_VOTERS.push({survey:"SV-2026-001", voter:r.no});
    let x = rnd(), acc = 0, ans = pick1[3];
    for(let i=0;i<w1.length;i++){ acc += w1[i]; if(x < acc){ ans = pick1[i]; break; } }
    SV_ANSWERS.push({survey:"SV-2026-001", item:"q1", value:ans});
    if(ans !== "직접 참석" && rnd() < 0.45)
      SV_ANSWERS.push({survey:"SV-2026-001", item:"q2",
        value: why[Math.floor(rnd()*why.length)]});
    SV_ANSWERS.push({survey:"SV-2026-001", item:"q3",
      value: time[Math.floor(rnd()*time.length)]});
  });

  /* SV-2026-002 : 48명 응답 (마감) */
  const need = ["사업 일정","예산·지출 내역","총회 안건 설명","감정평가","시공자 선정"];
  const say  = [
    "총회 자료를 좀 더 일찍 받아보고 싶습니다",
    "지출 내역을 정기적으로 공개해 주시면 좋겠습니다",
    "어려운 용어를 풀어서 설명해 주시면 좋겠습니다",
    "앱으로 보니 편합니다. 계속 이렇게 해주십시오"
  ];
  R.slice(0, 48).forEach(r => {
    SV_VOTERS.push({survey:"SV-2026-002", voter:r.no});
    SV_ANSWERS.push({survey:"SV-2026-002", item:"q1",
      value: String(1 + Math.floor(rnd()*5))});
    const n = 1 + Math.floor(rnd()*3);
    const set = new Set();
    while(set.size < n) set.add(need[Math.floor(rnd()*need.length)]);
    SV_ANSWERS.push({survey:"SV-2026-002", item:"q2", value:[...set].join("|")});
    if(rnd() < 0.35)
      SV_ANSWERS.push({survey:"SV-2026-002", item:"q3",
        value: say[Math.floor(rnd()*say.length)]});
  });
})();

/* ── 5. 집계 ──────────────────────────────────────────────
   ★ 단순히 몇 명이라고만 보여주면 직원이 정족수를 직접 계산해야 한다.
     필요 인원과 견줘 "독려가 필요하다" 까지 짚어 준다.
     총회 참석 사전조사의 목적이 바로 그것이다. */
const svById   = id => SURVEYS.find(s => s.id === id);
const svCount  = id => SV_VOTERS.filter(v => v.survey === id).length;
const svDone   = (id, who) => SV_VOTERS.some(v => v.survey === id && v.voter === who);
/* ★ 모수는 명부 인원이 아니라 의결권자(대표조합원) 수다.
   공유 물건의 비대표 조합원은 세지 않는다. */
const svTotal  = () => (typeof VOTER_N !== "undefined") ? VOTER_N()
                     : (typeof ROSTER !== "undefined" ? ROSTER.length : 0);
const svCanSee = s => s.status === "closed" || s.openResult;

function svAgg(id, itemId){
  const s = svById(id); if(!s) return null;
  const it = s.items.find(x => x.id === itemId); if(!it) return null;
  const vals = SV_ANSWERS.filter(a => a.survey === id && a.item === itemId).map(a => a.value);
  const T = svType(it.t);

  if(T.opt){
    const map = {};
    it.opts.forEach(o => map[o] = 0);
    vals.forEach(v => v.split("|").forEach(x => { if(map[x] !== undefined) map[x]++; }));
    const base = it.t === "many" ? vals.length : vals.length;
    return {kind:"opt", n:vals.length,
      rows: it.opts.map(o => ({label:o, n:map[o],
        pct: base ? Math.round(map[o]/base*1000)/10 : 0}))
        .sort((a,b) => b.n - a.n)};
  }
  if(it.t === "scale"){
    const map = {1:0,2:0,3:0,4:0,5:0};
    vals.forEach(v => { if(map[v] !== undefined) map[v]++; });
    const sum = vals.reduce((a,v) => a + Number(v), 0);
    return {kind:"scale", n:vals.length,
      avg: vals.length ? Math.round(sum/vals.length*10)/10 : 0,
      rows: [5,4,3,2,1].map(k => ({label:k+"점", n:map[k],
        pct: vals.length ? Math.round(map[k]/vals.length*1000)/10 : 0}))};
  }
  return {kind:"text", n:vals.length, texts:vals};
}

/* 정족수 판단 (총회 참석 사전조사용) */
function svQuorum(id){
  const s = svById(id);
  if(!s || !s.quorumNeed) return null;
  const a = svAgg(id, s.items[0] ? s.items[0].id : "q1");
  if(!a || a.kind !== "opt") return null;
  const direct = (a.rows.find(r => r.label === "직접 참석") || {n:0}).n;
  return {direct, need:s.quorumNeed, ok:direct >= s.quorumNeed,
          margin:direct - s.quorumNeed, answered:svCount(id), total:svTotal()};
}
