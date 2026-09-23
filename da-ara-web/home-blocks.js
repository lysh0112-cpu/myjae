/* ═══════════════════════════════════════════════════════════
   home-blocks.js  ·  홈 화면 세 덩이   (2026-09-17 밤)
   ───────────────────────────────────────────────────────────
   ★ 무엇을 담나

       우리 구역 한눈에   숫자 카드 3칸
       이번 고시 변경     좌우로 넘기는 카드
       궁금한 것          누르면 답이 펼쳐지는 목록

     셋 다 **index.html 안에 박혀** 있었다. 미아2 전용이다.
     다른 조합이 들어오면 **남의 구역 숫자**가 그대로 보인다.

   ★★★ 흐린 예시로 보여 준다 ★★★

     빈 칸만 있으면 무엇을 넣어야 할지 모르신다.
     미아2의 값을 **흐린 글씨(placeholder)로** 깔아 두고,
     조합이 채우면 그것을 쓴다.

       채우기 전   흐린 글씨로 보이지만 조합원 화면에는 안 나간다
       채운 뒤     그 값이 조합원 화면에 나간다

   ★ 덩이마다 켜고 끌 수 있다.
     고시 변경이 없는 구역은 꺼 두면 **덩이가 통째로 사라진다.**
     빈 칸이 남으면 「조합이 일을 안 한다」로 보인다.

   ★ 담기는 자리 — app_state 의 home_blocks (구역마다 따로)
   ═══════════════════════════════════════════════════════════ */

/* ── 흐린 예시 (미아2구역) ────────────────────────────────
   ★ 이것은 **예시일 뿐** 조합원 화면에 나가지 않는다.
     직원이 채우셔야 나간다. 무엇을 넣는 자리인지 알려 주는 몫이다. */
const HB_SAMPLE = {
  kpi: [
    {name:"총 세대수",   val:"4,003", unit:"세대", diff:"▲ 484"},
    {name:"최고 층수",   val:"45",    unit:"층",   diff:"▲ 10"},
    {name:"상한용적률", val:"286.5", unit:"%",    diff:"▲ 25.6"}
  ],
  chg: [
    {t:"제3종일반주거지역", b:"0",     a:"145,124", u:"㎡",   d:"▲ 145,124 · 종상향", p:"240"},
    {t:"총 세대수",        b:"3,519", a:"4,003",   u:"세대", d:"▲ 484",             p:"240"},
    {t:"입주 목표",        b:"2030",  a:"2033",    u:"년",   d:"▲ 3년 연기",        p:"290"},
    {t:"임대주택 등",      b:"604",   a:"710",     u:"세대", d:"▲ 106",             p:"251"}
  ],
  faq: [
    {q:"용적률이 올랐나요?", sub:"기준 · 상한 · 법적상한 · 건축계획",
     badge:"답 4개", icon:"ratio", kind:"num",
     rows:[
       {t:"기준용적률(완화)", b:"210",   a:"220",    u:"%", p:"289",
        note:"소형주택 · 고령화 · 저출산 · 사업성 보정 인센티브 적용"},
       {t:"상한용적률",       b:"260.9", a:"286.5",  u:"%", p:"245",
        note:"변경 후 286.5% 이하"},
       {t:"건축계획용적률",   b:"",      a:"309.01", u:"%", p:"251",
        note:"공공주택 의무비율 산정의 기준이 되는 값"},
       {t:"법적상한용적률",   b:"",      a:"310.0",  u:"%", p:"251",
        note:"법이 정한 천장"}
     ], body:""},
    {q:"임대주택은 늘었나요, 줄었나요?", sub:"둘 다 사실입니다",
     badge:"주의", icon:"my", kind:"text", rows:[],
     body:"세대수는 604 → 710 으로 늘었습니다.\n"
        + "다만 전체 세대수가 3,519 → 4,003 으로 더 많이 늘어\n"
        + "비율로는 17.2% → 17.7% 입니다.\n\n"
        + "「늘었다」와 「비율은 비슷하다」가 둘 다 사실입니다."},
    {q:"평형은 어떻게 구성되나요?", sub:"60㎡ 이하 2,032 · 60~85㎡ 1,686",
     badge:"", icon:"home", kind:"num", rows:[
       {t:"60㎡ 이하",   b:"", a:"2,032", u:"세대", p:"247", note:""},
       {t:"60~85㎡",     b:"", a:"1,686", u:"세대", p:"247", note:""},
       {t:"85㎡ 초과",   b:"", a:"285",   u:"세대", p:"247", note:""}
     ], body:""},
    {q:"공원·학교는 어떻게 되나요?", sub:"어린이공원 확대 · 송천초 이전",
     badge:"", icon:"park", kind:"text", rows:[],
     body:"어린이공원이 넓어지고 송천초등학교가 옮겨 갑니다.\n"
        + "자세한 위치는 고시문 지형도면에 있습니다."}
  ]
};

/* ── 지금 담긴 값 ───────────────────────────────────────── */
let HB = (typeof hubLoad !== "undefined")
  ? hubLoad("home_blocks", null) : null;

/* ★ 처음이면 빈 껍데기를 만든다. 예시를 담지 않는다.
   담아 버리면 「조합이 넣은 값」과 「예시」를 못 가른다. */
function hbInit(){
  if(!HB) HB = {};
  if(!HB.kpi) HB.kpi = {on:true,  rows:[{},{},{}]};
  if(!HB.chg) HB.chg = {on:false, rows:[]};
  if(!HB.faq) HB.faq = {on:true,  rows:[]};
  return HB;
}

/* 한 칸이 비었는지 — 흰 칸인지 채운 칸인지 가른다 */
const hbEmpty = o => !o || !Object.keys(o).some(k => String(o[k] || "").trim());

/* ═══════════════════════════════════════════════════════════
   조합원 화면이 쓰는 함수
   ★ 채운 것만 돌려준다. 예시는 절대 안 나간다.
   ═══════════════════════════════════════════════════════════ */

/* 우리 구역 한눈에 — 세 칸 중 채운 것만 */
function hbKpi(){
  const b = HB && HB.kpi;
  if(!b || b.on === false) return null;
  const rows = (b.rows || []).filter(r => !hbEmpty(r) && String(r.val || "").trim());
  return rows.length ? rows : null;
}

/* 이번 고시 변경 */
function hbChg(){
  const b = HB && HB.chg;
  if(!b || b.on === false) return null;
  const rows = (b.rows || []).filter(r => !hbEmpty(r) && String(r.t || "").trim());
  return rows.length ? rows : null;
}

/* 궁금한 것 */
function hbFaq(){
  const b = HB && HB.faq;
  if(!b || b.on === false) return null;
  const rows = (b.rows || []).filter(r => !hbEmpty(r) && String(r.q || "").trim());
  /* ★ 보일 개수까지만 (2026-09-20 · 116절). 넘는 것은 「대기」로 목록에만 남는다.
     조합원 홈 · 답 펼치기 · 직원 폰 미리보기가 모두 여기를 거친다 → 한 곳에서 자른다. */
  return rows.length ? rows.slice(0, hbFaqMax()) : null;
}

/* ═══════════════════════════════════════════════════════════
   ★ 자료를 홈 「궁금한 것」에 올린다 (2026-09-20)
   ───────────────────────────────────────────────────────────
   조합원이 궁금해할 자료를 홈 첫 화면에 올린다.
   누르면 그 자료의 **질문 목록이 통째로** 열린다.

   ★ 한 곳에서만 정리한다.
     질문과 답은 **자료실에서만** 고친다. 홈은 **링크만** 건다.
     두 군데 적으면 한쪽만 고쳐져 **조합원이 다른 답을 두 곳에서** 본다.

   ★ HB.faq.rows 에 함께 담는다. 손으로 넣은 것과 **한 목록**이다.
     조합원이 보시는 것이 한 목록이므로 합쳐서 세어야 한다.

   ★ 자료에서 온 줄은 docId 를 갖는다. 손으로 넣은 것은 없다.
   ═══════════════════════════════════════════════════════════ */
const HB_FAQ_MAX = 5;          /* 보일 개수를 안 정했을 때 */
const HB_FAQ_CAP = 20;         /* 대기까지 합쳐 담아 둘 수 있는 한도 */
/* ★ 홈에 보일 개수 — 직원이 5~10 에서 고른다 (2026-09-20 · 116절) */
function hbFaqMax(){
  const m = +(HB && HB.faq && HB.faq.max) || HB_FAQ_MAX;
  return Math.min(10, Math.max(5, m));
}
/* 이 자료가 홈 몇 번째에 보이나 · 대기면 0 · 안 올렸으면 -1 */
function hbFaqPos(id){
  try{
    const rows = (HB && HB.faq && HB.faq.rows || [])
      .filter(r => !hbEmpty(r) && String(r.q||"").trim());
    const k = rows.findIndex(r => r.docId === id);
    if(k < 0) return -1;
    return k < hbFaqMax() ? k + 1 : 0;
  }catch(e){ return -1; }
}

/* 이 자료가 홈에 올라가 있나 */
function arcOnHome(id){
  try{
    return (HB && HB.faq && HB.faq.rows || []).some(r => r.docId === id);
  }catch(e){ return false; }
}

/* 홈에 올린 것이 몇 개인가 — 손으로 넣은 것까지 */
function hbFaqN(){
  try{
    return (HB && HB.faq && HB.faq.rows || [])
      .filter(r => !hbEmpty(r) && String(r.q||"").trim()).length;
  }catch(e){ return 0; }
}

/* 한 질문의 답이 몇 개인가 — 딱지에 쓴다 */
function hbAnsN(f){
  if(!f) return 0;
  if(f.kind === "num") return (f.rows || []).filter(r => String(r.t || "").trim()).length;
  return String(f.body || "").trim() ? 1 : 0;
}

/* 서버에 담기 */
async function hbPut(who){
  if(typeof hubPush === "undefined") return false;
  return await hubPush("home_blocks", HB, who);
}

/* 서버에서 받기 — 조합원 화면도 이것을 쓴다 */
function hbTake(v){
  if(!v) return;
  HB = v;
}
