/* ═══════════════════════════════════════════════════════════
   zone-admin.js  ·  우리 구역 설정   (2026-09-17 새벽)
   ───────────────────────────────────────────────────────────
   ★ 왜 파일을 따로 뺐나

     홈 화면 · 단계 일정 · 시세 단지 · 비교 아파트 · 지분 실거래는
     **조합이 정하는 것**이다. 그런데 운영자 콘솔에만 있었다.
     통합심의를 통과한 날 조합이 바로 못 바꾸고 회사에 연락해야 했다.

     그래서 조합 직원 화면(admin)으로 옮겼다.
     다만 **복사하지 않는다.** 복사하면 같은 것이 두 군데가 되어
     한쪽만 고치는 일이 반드시 생긴다 (절대규칙 ㊿).

     이 파일 하나를 **운영자 콘솔과 직원 화면이 함께 읽는다.**
     hub.js 를 한 곳에 몬 것과 같은 방식이다.

   ★ 두 화면이 같은 바탕을 쓴다 — 그래서 옮길 수 있었다

       const V = {}      화면 함수를 담는 그릇
       let cur           지금 보고 있는 화면
       MENU_G            왼쪽 메뉴
       render()          다시 그리기
       S.name            지금 로그인한 사람
       tenant-demo.js    TENANTS · TN() · untilMoveIn()

     CSS 이름(.box · .sec · .f · .row · .two · .btn · .warn)도 같다.

   ★ 콘솔에만 있는 것은 있는지 보고 쓴다

       zLog()   감사 로그. 직원 화면에는 없다.
                 typeof 로 가리고 부른다. 없으면 그냥 넘어간다.

   ★ 이 파일을 읽는 순서
     hub.js · tenant-demo.js 보다 **뒤**,
     화면 파일 안의 <script> 보다 **앞**에 두어야 한다.
   ═══════════════════════════════════════════════════════════ */

/* ★★★ 2026-09-17 — T is not defined ★★★
   ─────────────────────────────────────────────────────
   옮긴 화면은 T() 로 지금 구역을 가져온다.
   그런데 `const T = () => TN()` 는 **콘솔에만** 있었다.
   직원 화면에서 「홈 화면 · 단계 일정」을 누르면
   **T is not defined** 로 그 화면만 안 열렸다.

   ★ 내 검사가 이것을 놓쳤다.
     admin.html 에 "T(" 가 28번 나와서 「있다」고 셌는데,
     그것은 archive-demo.js 안의 **다른 T**(지출 합계)였다.

   > ★ 이름이 있는지만 세지 말고 **무엇을 가리키는지** 본다.
     같은 글자가 다른 것을 가리키는 일이 흔하다.

   ★ 콘솔에도 같은 이름이 있으므로 **없을 때만** 만든다.
     둘 다 만들면 "이미 선언됨" 으로 화면이 통째로 안 열린다. */
if(typeof T === "undefined"){
  window.T = () => TN();
}

/* ★★★ 2026-09-17 — won is not defined ★★★
   ───────────────────────────────────────────────────────────
   숫자에 쉼표를 찍는 zwon() 은 **index.html(조합원 화면)에만** 있다.
   직원 화면과 콘솔은 그 파일을 안 읽는다.

   ★ 어제 지분 실거래 건수에 zwon() 을 썼는데, 그 화면은
     조합원 화면에서 한 번도 안 열리는 곳이라 **못 잡았다.**
     「우리집」으로 옮기고 나서야 터졌다.

   ★ zone-admin.js 는 **세 화면이 함께 읽는 파일**이다.
     여기서 쓰는 이름은 **세 화면에 다 있어야** 한다.
     index.html 에만 있는 것에 기대면 안 된다.

   ★ won 이라는 이름을 또 만들면 조합원 화면에서 중복이 된다.
     그래서 zwon 으로 따로 둔다. */
const zwon = v => (v === null || v === undefined || isNaN(Number(v)))
  ? "—" : Number(v).toLocaleString("ko-KR");

/* 감사 로그 — 콘솔에만 있다. 없으면 조용히 넘어간다. */
function zLog(what, detail){
  try{ if(typeof logIt !== "undefined") zLog(what, detail); }catch(e){}
}



/* ══════════ 비교 아파트 ══════════ */

/* ★★★ 한글 찾기 칸 — 이름을 갈라 두었다 (2026-09-17) ★★★
   ─────────────────────────────────────────────────────
   ★ 한글은 다 쳐야 글자가 된다. 한 글자 칠 때마다 칸을 새로 만들면
     「길음」이 ㄱㅣㄹㅇㅡㅁ 으로 흩어진다. 다 친 뒤에만 그린다.

   ★ 직원 화면에 이미 IME_ON · imeBind 가 있다 (찾기 칸 아홉 개를 본다).
     같은 이름을 여기서 또 선언하면 **그 아홉 개가 통째로 깨진다.**
     그래서 ZQ_IME · zqBind 로 갈랐다.

   > ★ 공통 파일에 이름을 낼 때는 양쪽에 같은 이름이 있는지 먼저 센다.
     오류도 안 나고 남의 화면만 조용히 망가진다. */
let ZQ_IME = false;
function alqType(v){
  AL.q = v;
  if(ZQ_IME) return;
  const e = document.getElementById("alq");
  const pos = e ? e.selectionStart : null;
  render();
  const n = document.getElementById("alq");
  if(n && pos !== null){ n.focus(); n.setSelectionRange(pos, pos); }
}
function zqBind(){
  const e = document.getElementById("alq");
  if(!e || e.dataset.ime) return;
  e.dataset.ime = "1";
  e.addEventListener("compositionstart", () => { ZQ_IME = true; });
  e.addEventListener("compositionend", () => { ZQ_IME = false; alqType(e.value); });
}


/* ── 비교 아파트 설정 ────────────────────────────────────
   ★ 어느 단지와 견줄지는 운영자가 정한다.
     기계가 고르면 엉뚱한 단지가 섞이고,
     조합원이 「왜 저 단지랑 비교하느냐」고 물으실 때 답이 없다.

   ★ 조합 직원이 아니라 운영자가 정한다.
     조합이 정하면 유리한 단지만 고를 수 있다.
     비싼 단지만 올려 두면 조합원 기대가 부풀어 나중에 다툰다.

   ★ 고치는 즉시 담기고, 조합원 폰에 20초 안에 나간다.
     따로 [올리기]를 두지 않았다. 여기는 운영자만 들어오는 화면이라
     검수 전 숫자가 새어 나갈 걱정이 회계 화면보다 적다.

   ★ 억 단위로 넣으신다. 원 단위로 치게 하면 0을 하나 빠뜨리신다.
     11억 2,000만 → 11.2 로 적으신다.                        */
const eok1 = v => v ? (v/100000000).toFixed(2).replace(/\.?0+$/,"") : "";
const eok2 = v => Math.round((Number(v)||0) * 100000000);

/* ★ 한 글자라도 고치시면 예시 표시를 뗀다.
   고쳐 놓고도 조합원 폰에 「예시입니다」가 계속 뜨면
   운영자는 반영이 안 된 줄 아신다. */
function mktReal(){
  if(APTS.demo)    delete APTS.demo;
  if(DEALS.demo)   delete DEALS.demo;
  if(MKT_SRC.demo) delete MKT_SRC.demo;
}

function aptAdd(){
  mktReal(); APTS.push(aptNew()); mktPut(S.name); render();
}

/* ═══════════════════════════════════════════════════════════
   국토부 단지 목록 (2026-08-22)
   ───────────────────────────────────────────────────────────
   ★ 이름을 손으로 치면 국토부 표기와 어긋난다.
     「래미안트리베라」 「래미안 트리베라」 「래미안트리베라1차」…
     한 글자만 달라도 0건이 나오고, 왜 안 되는지 알 수 없다.
     그래서 국토부가 쓰는 이름을 그대로 목록으로 받아 고르게 한다.

   ★ 최근 2년으로 받는다.
     1년이면 거래가 뜸한 단지가 통째로 빠진다.
     3년이면 최저가에 옛날 값이 섞여 견주기에 도움이 안 된다.
     25개월 = 25회. 하루 한도 1,000회라 부담 없다.

   ★ 법정동 코드는 구 단위다.
     11305 는 강북구 전체라 미아동 · 번동 · 수유동이 다 나온다.
     그래서 검색 칸을 둔다. 「미아」를 치면 미아동 것만 남는다.
   ═══════════════════════════════════════════════════════════ */
/* ★ 자주 쓰는 구를 버튼으로 둔다 (2026-08-22).
   코드를 외우게 하면 오타가 나고, 오타가 나면 0건이 나온다.
   왜 0건인지 알 수 없어 국토부 탓인 줄 아신다.

   ★ 미아2구역은 강북구 끝자락이다.
     성북구 길음뉴타운이 바로 옆이라 조합원이 실제로 견주시는 대상은
     행정구역 경계를 넘는다. 그래서 강북 · 성북을 기본으로 켜 둔다.

   ★ 다른 지역 조합이 들어오면 그 구를 여기 더한다.
     서울 25개 구를 다 넣어 두고 가까운 넷을 앞에 둔다. */
const GU_NEAR = [
  ["11305","강북구"], ["11290","성북구"], ["11350","노원구"], ["11320","도봉구"]
];
const GU_ALL = [
  ["11110","종로구"],["11140","중구"],["11170","용산구"],["11200","성동구"],
  ["11215","광진구"],["11230","동대문구"],["11260","중랑구"],["11290","성북구"],
  ["11305","강북구"],["11320","도봉구"],["11350","노원구"],["11380","은평구"],
  ["11410","서대문구"],["11440","마포구"],["11470","양천구"],["11500","강서구"],
  ["11530","구로구"],["11545","금천구"],["11560","영등포구"],["11590","동작구"],
  ["11620","관악구"],["11650","서초구"],["11680","강남구"],["11710","송파구"],
  ["11740","강동구"]
];
const guName = c => (GU_ALL.find(x=>x[0]===c) || [null, c])[1];

/* ★ 기본은 강북 + 성북. 미아2구역 기준이다. */
let AL = {gus:["11305","11290"], more:false, list:[], q:"", busy:false,
          at:"", log:null, deep:null};

function guToggle(code){
  const i = AL.gus.indexOf(code);
  if(i >= 0){
    if(AL.gus.length <= 1){ alert("구를 하나는 고르셔야 합니다."); return; }
    AL.gus.splice(i,1);
  } else {
    if(AL.gus.length >= 8){
      alert("한 번에 여덟 개까지 고르실 수 있습니다.\n\n"
        + "구 하나에 25회를 부르므로 여덟 개면 200회입니다.\n"
        + "하루 한도는 1,000회입니다."); return; }
    AL.gus.push(code);
  }
  render();
}

async function alPull(){
  if(AL.busy) return;
  if(!AL.gus.length){ alert("구를 하나는 고르셔야 합니다."); return; }

  /* ★ 목록은 최근 6개월만 본다 (2026-08-22).
     운영자는 어차피 서너 단지만 고르신다.
     쓰지도 않을 단지까지 2년치를 긁는 것은 낭비다.
     6개월이면 거래가 활발한 대장 아파트는 다 나온다.
     반년 동안 한 건도 없는 단지는 애초에 견줄 대상이 아니다. */
  const d = new Date();
  const ym = (y,m) => `${y}-${String(m).padStart(2,"0")}`;
  const to   = ym(d.getFullYear(), d.getMonth()+1);
  const p6   = new Date(d.getFullYear(), d.getMonth()-5, 1);
  const from = ym(p6.getFullYear(), p6.getMonth()+1);
  const calls = 6 * AL.gus.length;

  if(!confirm(`국토교통부에서 아파트 단지 목록을 받아옵니다.\n\n`
    + `${AL.gus.map(guName).join(" · ")}\n`
    + `최근 6개월 (${from} ~ ${to})\n`
    + `호출 약 ${calls}회 · 하루 한도는 1,000회입니다.\n\n`
    + `목록은 가볍게 받고, 고르신 단지만 2년치를 자세히 봅니다.\n\n계속하시겠습니까?`)) return;

  AL.busy = true; AL.log = null; render();
  const r = await rtmsFetch({mode:"apt", lawd:AL.gus.join(","), from, to});
  AL.busy = false;

  if(!r || !r.ok || !r.list){
    AL.log = {ok:false, message:(r&&r.message)||"받아오지 못했습니다."};
    render(); return;
  }
  if(!r.list.length){
    AL.log = {ok:false, message:"고르신 구에서 최근 6개월 아파트 거래를 찾지 못했습니다. 구를 다시 확인해 주십시오."};
    render(); return;
  }
  AL.list = r.list; AL.at = r.at;
  AL.log = {ok:true, count:r.list.length, failed:r.failed};
  render();
}

/* ★ 고른 단지만 2년치를 깊게 본다 (2026-08-22).
   목록에서 온 값은 6개월치라 최고 · 최저의 폭이 좁아 뜻이 없다.
   조합원이 보시는 것은 「지금 얼마쯤 하고, 얼마까지 갔었나」다.
   그 답은 2년은 봐야 나온다. */
async function alDeep(i){
  const a = APTS[i]; if(!a || !a.name) return;
  const f = AL.list.find(x => x.name === a.name);
  const cd = f ? f.lawd : (AL.gus[0] || "");
  if(!cd){ alert("구를 알 수 없습니다.\n목록을 먼저 받아오신 뒤 고르십시오."); return; }

  const d = new Date();
  const ym = (y,m) => `${y}-${String(m).padStart(2,"0")}`;
  const to   = ym(d.getFullYear(), d.getMonth()+1);
  const from = ym(d.getFullYear()-2, d.getMonth()+1);

  if(!confirm(`${a.name} 의 최근 2년 시세를 받아옵니다.\n\n`
    + `${guName(cd)} · ${from} ~ ${to}\n호출 약 25회\n\n`
    + `평형별 최근 거래 · 최고가 · 최저가가 채워집니다.\n계속하시겠습니까?`)) return;

  AL.deep = a.name; render();
  const r = await rtmsFetch({mode:"one", name:a.name, lawd:cd, from, to});
  AL.deep = null;

  if(!r || !r.ok || !r.types){
    AL.log = {ok:false, message:(r&&r.message)||"받아오지 못했습니다."};
    render(); return;
  }
  mktReal();
  a.built = r.built || a.built;
  a.dist  = r.dong || a.dist;
  a.types = r.types.map(t => ({py:t.py, ex:t.ex, last:t.last,
                               high:t.high, low:t.low, at:t.at}));
  mktPut(S.name);
  AL.log = {ok:true, deep:a.name, n:r.n, months:r.months, failed:r.failed,
            types:r.types.length};
  render();
}

/* 콤보에서 고르면 그 단지 값으로 통째로 채운다 */
function alPick(i, name){
  if(!name) return;
  const a = APTS[i]; if(!a) return;
  const f = AL.list.find(x => x.name === name);
  if(!f){ alert("목록에서 찾지 못했습니다. 다시 받아와 주십시오."); return; }
  mktReal();
  a.name  = f.name;
  a.built = f.built || "";
  a.dist  = f.dong || "";
  a.types = f.types.map(t => ({py:t.py, ex:t.ex, last:t.last,
                               high:t.high, low:t.low, at:t.at}));
  mktPut(S.name); render();
}

/* 목록에서 바로 새 단지로 더한다 */
function alAdd(name){
  if(!name) return;
  const f = AL.list.find(x => x.name === name);
  if(!f) return;
  if(APTS.some(a => a.name === f.name)){
    alert(`${f.name} 는 이미 등록돼 있습니다.`); return; }
  mktReal();
  APTS.push({id:"A"+Date.now().toString(36), name:f.name,
    built:f.built||"", dist:f.dong||"",
    types:f.types.map(t=>({py:t.py, ex:t.ex, last:t.last,
                           high:t.high, low:t.low, at:t.at}))});
  mktPut(S.name); render();
}

/* 예시 자료로 되돌리기 */
function aptSeed(){
  if(!confirm("지금 등록한 단지를 지우고 예시 자료로 되돌립니다.\n\n계속하시겠습니까?")) return;
  APTS = APTS_SEED.slice(); APTS.demo = true;
  mktPut(S.name); render();
}

/* 검색 칸에 친 대로 후보를 좁힌다 */
const alHits = () => {
  const q = (AL.q||"").trim();
  if(!q) return AL.list;
  return AL.list.filter(x =>
    (x.name||"").includes(q) || (x.dong||"").includes(q) || (x.gu||"").includes(q));
};
function aptDel(i){
  const a = APTS[i]; if(!a) return;
  if(!confirm(`${a.name || "이름 없는 단지"}를 지웁니다.\n\n`
    + `조합원 앱 [인근 시세] 에서 바로 사라집니다.\n계속하시겠습니까?`)) return;
  mktReal(); APTS.splice(i,1); mktPut(S.name); render();
}
function aptSet(i, k, v){
  const a = APTS[i]; if(!a) return;
  mktReal();
  a[k] = (k==="built") ? (String(v).replace(/[^0-9]/g,"") || "") : v;
  mktPut(S.name);
}
function tySet(i, j, k, v){
  const t = APTS[i] && APTS[i].types[j]; if(!t) return;
  mktReal();
  if(k==="last" || k==="high" || k==="low") t[k] = eok2(v);
  else if(k==="py" || k==="ex") t[k] = Number(String(v).replace(/[^0-9.]/g,"")) || 0;
  else t[k] = v;
  mktPut(S.name);
}
function tyAdd(i){
  if(!APTS[i]) return;
  mktReal(); APTS[i].types.push(aptType()); mktPut(S.name); render();
}
function tyDel(i, j){
  if(!APTS[i]) return;
  if(APTS[i].types.length <= 1){
    alert("평형이 하나는 있어야 합니다.\n단지를 삭제하시려면 [단지 삭제]를 쓰십시오."); return; }
  mktReal(); APTS[i].types.splice(j,1); mktPut(S.name); render();
}
function srcSet(k, v){ mktReal(); MKT_SRC[k] = v; mktPut(S.name); }

V.apt = () => {
  const t = T();
  const bad = APTS.filter(a => !a.name || !a.types.some(x=>x.last)).length;
  return `
  <h2 class="pt">비교 아파트 설정</h2>
  <p class="pd"><b class="mono" style="color:var(--navy)">${t.code}</b> ·
    조합원 앱 [우리집 → 인근 시세] 에 나가는 단지입니다</p>

  <div class="ztwo">
  <div class="col zstick">

    <div class="box">
      <b style="font-size:.86rem">국토교통부에서 단지 목록 받아오기</b>
      <div class="gubar" style="margin-top:9px">
        ${GU_NEAR.map(([c,n])=>`<button class="gub ${AL.gus.includes(c)?"on":""}"
          onclick="guToggle('${c}')">${n}<em>${c}</em></button>`).join("")}
        <button class="gub more" onclick="AL.more=!AL.more;render()">
          ${AL.more?"접기":"다른 구"}</button>
      </div>
      ${AL.more?`<div class="gubar" style="margin-top:7px">
        ${GU_ALL.filter(([c])=>!GU_NEAR.some(g=>g[0]===c))
          .map(([c,n])=>`<button class="gub sm2 ${AL.gus.includes(c)?"on":""}"
            onclick="guToggle('${c}')">${n}</button>`).join("")}
      </div>`:""}

      <div class="rowf" style="margin-top:13px">
        <button class="btn go" onclick="alPull()" ${AL.busy?"disabled":""}>
          ${AL.busy?"받아오는 중…":"단지 목록 불러오기"}</button>
        <span class="hint" style="margin:0">최근 6개월 · 약 ${6*AL.gus.length}회</span>
      </div>
      <p class="hint">${AL.gus.map(guName).join(" · ")}
        ${AL.list.length?`<br>${AL.at} 기준 · <b>${AL.list.length}개 단지</b>`:""}</p>

      <details class="fold">
        <summary>왜 두 걸음으로 나눠 받나</summary>
        <div class="fb">
          <b>① 목록</b> 최근 6개월 · 구마다 6회 — 어느 단지가 있는지만 가볍게 봅니다.<br>
          <b>② 상세</b> 고른 단지만 2년 · 25회 — 최고 · 최저는 2년은 봐야 뜻이 있습니다.<br><br>
          쓰지도 않을 단지까지 2년치를 긁는 것은 낭비입니다.
          국토부가 쓰는 이름을 그대로 목록으로 받아 고르게 하므로
          <b>「래미안트리베라」 「래미안 트리베라」</b> 한 글자 차이로 0건이 되는 일이 없습니다.<br><br>
          <b>미아2구역은 강북구 끝자락입니다.</b> 성북구 길음뉴타운이 바로 옆이라
          조합원이 견주시는 대상은 행정구역 경계를 넘습니다. 그래서 둘을 켜 두었습니다.</div>
      </details>

      ${AL.log ? (AL.log.ok
        ? (AL.log.deep
          ? `<div class="box" style="margin-top:11px;border:1.5px solid var(--ok);background:#F4FCF9;padding:11px 13px">
              <b style="color:#0A6E51;font-size:.82rem">${AL.log.deep} · 2년치 완료</b>
              <p class="hint" style="margin-top:4px">거래 ${AL.log.n}건 · 평형 ${AL.log.types}개</p></div>`
          : `<div class="box" style="margin-top:11px;border:1.5px solid var(--ok);background:#F4FCF9;padding:11px 13px">
              <b style="color:#0A6E51;font-size:.82rem">${AL.log.count}개 단지</b>
              <p class="hint" style="margin-top:4px">고르신 뒤 <b>[2년치 자세히]</b> 를
                누르시면 최고 · 최저가 채워집니다</p></div>`)
        : `<div class="warn" style="margin-top:11px"><b>받아오지 못했습니다</b>
            <p>${AL.log.message}<br><b>등록해 두신 단지는 그대로입니다.</b></p></div>`)
      : ""}
    </div>

    ${AL.list.length?`
    <div class="box" style="margin-top:14px">
      <div class="f"><label>목록에서 찾기</label>
        <input id="alq" value="${AL.q}" placeholder="단지 · 구 · 법정동 · 예) 길음"
          oninput="alqType(this.value)"></div>
      <div class="box" style="padding:0;overflow:hidden;max-height:420px;overflow-y:auto;margin-top:9px">
        <table><thead><tr>
          <th>단지</th><th style="width:104px">지역</th>
          <th style="width:52px;text-align:right">6개월</th><th style="width:48px"></th>
        </tr></thead><tbody>
        ${alHits().slice(0,80).map(x=>{
          const has = APTS.some(a=>a.name===x.name);
          return `<tr style="${has?"opacity:.45":""}">
          <td><b>${x.name}</b>
            <span class="ztiny" style="margin:0">${x.built||"—"}년 ·
              ${x.types.map(t=>t.py+"평").join(" · ")}</span></td>
          <td><span class="pill p-wait">${x.gu||""}</span>
            <span class="ztiny" style="margin:0">${x.dong}</span></td>
          <td class="mono" style="text-align:right">${x.n}</td>
          <td>${has?`<span class="ztiny" style="margin:0">등록</span>`
            :`<button class="lnk" onclick="alAdd('${x.name.replace(/'/g,"\\'")}')">더하기</button>`}</td>
        </tr>`;}).join("")}
        </tbody></table>
      </div>
      ${alHits().length>80?`<p class="hint">${alHits().length}개 중 80개만 보입니다</p>`:""}
      ${!alHits().length?`<p class="hint">찾으시는 단지가 없습니다</p>`:""}
    </div>`:""}

    <details class="fold warnf" style="margin-top:14px">
      <summary>왜 조합이 아니라 운영자가 정하는가</summary>
      <div class="fb">조합이 고르면 <b>유리한 단지만 올릴 수 있습니다.</b>
        비싼 단지만 올려 두면 조합원 기대가 부풀고, 분양가가 정해질 때 그만큼 다툽니다.
        견줄 대상은 바깥에서 정하는 편이 서로에게 안전합니다.<br><br>
        <b>금액은 억 단위로 적으십시오.</b> 11억 2,000만원이면 <b class="mono">11.2</b> 입니다.
        원 단위로 치게 하면 0을 하나 빠뜨리십니다.<br><br>
        수정하시는 즉시 담기고 <b>조합원 폰에 20초 안에</b> 나갑니다. 올리기 버튼이 없습니다.</div>
    </details>

  </div>
  <div class="col">

    <div class="zcards" style="grid-template-columns:repeat(3,1fr)">
      <div class="card"><span>등록 단지</span><b>${APTS.length}</b></div>
      <div class="card"><span>평형 수</span>
        <b>${APTS.reduce((a,x)=>a+x.types.length,0)}</b></div>
      <div class="card"><span>채우다 만 것</span>
        <b style="color:${bad?'var(--amber)':'var(--ok)'}">${bad}</b></div>
    </div>

    ${APTS.demo?`<div class="warn" style="margin-top:14px"><b>지금 세 단지는 예시입니다</b>
      <p>왼쪽에서 국토부 목록을 받아 <b>인근 대장 아파트를 직접 고르십시오.</b>
         한 글자라도 수정하시면 그때부터 실제 자료가 됩니다.</p></div>`:""}
    ${bad?`<div class="warn" style="margin-top:14px">
      <b>이름이나 거래가가 비어 있는 단지가 ${bad}곳 있습니다</b>
      <p>비어 있는 채로 두면 조합원 폰에 이름 없는 칸이 나옵니다.</p></div>`:""}

    ${APTS.length ? APTS.map((a,i)=>`
    <div class="sec">${a.name || `<span style="color:var(--amber)">이름을 적어 주십시오</span>`}
      <em>${a.types.length}개 평형</em></div>
    <div class="box">
      <div class="rowf">
        <div class="f" style="flex:1;min-width:190px"><label>단지 이름</label>
          ${AL.list.length ? `<select onchange="alPick(${i},this.value)">
              <option value="">— 국토부 목록에서 고르기 —</option>
              ${AL.list.map(x=>`<option value="${x.name}" ${a.name===x.name?"selected":""}
                >${x.name} · ${x.gu||""} ${x.dong} (${x.n})</option>`).join("")}
            </select>`
          : `<input value="${a.name||""}" placeholder="래미안트리베라"
              oninput="aptSet(${i},'name',this.value)">`}</div>
        <div class="f w90"><label>준공</label>
          <input value="${a.built||""}" placeholder="2010"
            oninput="aptSet(${i},'built',this.value)"></div>
        <div class="f" style="flex:1;min-width:150px"><label>거리 · 위치</label>
          <input value="${a.dist||""}" placeholder="도보 8분 · 미아동"
            oninput="aptSet(${i},'dist',this.value)"></div>
      </div>
      ${AL.list.length?`<input value="${a.name||""}" placeholder="직접 적으셔도 됩니다"
        oninput="aptSet(${i},'name',this.value)"
        style="margin-top:7px;width:100%;border:1px solid var(--line);border-radius:8px;
        padding:8px 10px;font-size:.82rem;outline:none">`:""}

      <div class="box" style="padding:0;overflow:hidden;margin-top:11px">
        <table><thead><tr>
          <th style="width:58px">평형</th><th style="width:72px">전용㎡</th>
          <th style="width:88px">최근(억)</th><th style="width:82px">최고</th>
          <th style="width:82px">최저</th><th style="width:80px">기준월</th>
          <th style="width:42px"></th>
        </tr></thead><tbody>
        ${a.types.map((x,j)=>`<tr>
          <td><input class="sm" value="${x.py||""}" placeholder="34"
            oninput="tySet(${i},${j},'py',this.value)"></td>
          <td><input class="sm" value="${x.ex||""}" placeholder="84.9"
            oninput="tySet(${i},${j},'ex',this.value)"></td>
          <td><input class="sm" value="${eok1(x.last)}" placeholder="11.2"
            oninput="tySet(${i},${j},'last',this.value)"></td>
          <td><input class="sm" value="${eok1(x.high)}" placeholder="12.1"
            oninput="tySet(${i},${j},'high',this.value)"></td>
          <td><input class="sm" value="${eok1(x.low)}" placeholder="10.4"
            oninput="tySet(${i},${j},'low',this.value)"></td>
          <td><input class="sm" value="${x.at||""}" placeholder="2026-07"
            oninput="tySet(${i},${j},'at',this.value)"></td>
          <td><button class="lnk" onclick="tyDel(${i},${j})"
            style="color:var(--amber)">빼기</button></td>
        </tr>`).join("")}
        </tbody></table>
      </div>

      <div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap;align-items:center">
        ${a.name?`<button class="btn sm" onclick="alDeep(${i})"
          ${AL.deep?"disabled":""}>${AL.deep===a.name?"받아오는 중…":"2년치 자세히"}</button>`:""}
        <button class="btn sm ghost" onclick="tyAdd(${i})">평형 추가</button>
        <button class="btn sm ghost" onclick="aptDel(${i})"
          style="color:var(--amber);border-color:#F3C7AC">단지 삭제</button>
        ${a.name?`<span class="hint" style="margin:0">25회를 부릅니다</span>`:""}
      </div>
    </div>`).join("")
    : `<div class="box" style="margin-top:14px">
        <p class="hint" style="margin:0">등록된 단지가 없습니다.
          조합원 앱 [인근 시세] 탭에 「아직 등록된 단지가 없습니다」가 나옵니다.</p></div>`}

    <div style="display:flex;gap:9px;margin-top:16px;flex-wrap:wrap">
      <button class="btn sm" onclick="aptAdd()">+ 빈 단지 추가</button>
      <button class="btn sm ghost" onclick="aptSeed()">예시 자료로 되돌리기</button>
    </div>

    <div class="sec">자료 출처</div>
    <div class="box">
      <div class="rowf">
        <div class="f" style="flex:1;min-width:220px"><label>출처</label>
          <input value="${MKT_SRC.src||""}" placeholder="국토교통부 실거래가 공개시스템"
            oninput="srcSet('src',this.value)"></div>
        <div class="f w110"><label>기준일</label>
          <input value="${MKT_SRC.at||""}" placeholder="2026-08-01"
            oninput="srcSet('at',this.value)"></div>
        <div class="f w110"><label>API 연동</label>
          <select onchange="srcSet('api',this.value==='1');render()">
            <option value="0" ${!MKT_SRC.api?"selected":""}>손으로</option>
            <option value="1" ${MKT_SRC.api?"selected":""}>자동</option>
          </select></div>
      </div>
      <div class="f" style="margin-top:9px"><label>비고</label>
        <input value="${MKT_SRC.note||""}" placeholder="운영자가 손으로 옮겨 적은 자료입니다"
          oninput="srcSet('note',this.value)"></div>
      <p class="hint">조합원 화면 맨 아래에 이대로 찍힙니다.
        비워 두면 「미등록」으로 나가고 조합원이 숫자를 믿지 않으십니다.</p>
    </div>

  </div>
  </div>`;
};


/* ══════════ 지분 실거래 ══════════ */

/* ── 지분 실거래 · 국토부 연동 (2026-08-22) ──────────────
   ★ 국토부는 한 번에 한 지역 · 한 달만 준다.
     5년치 두 종류면 120번을 불러야 하고, 한도가 하루 1,000회다.
     조합원이 화면을 열 때마다 부르면 하루도 못 간다.
     → 운영자가 여기서 받아와 app_state 에 담고, 조합원은 그것을 읽는다.

   ★ 받아오기가 실패해도 있던 자료를 지우지 않는다.
     새 자료가 온 것을 확인한 뒤에만 갈아 끼운다.
     실패했다고 화면이 비면 조합원이 「자료가 사라졌다」고 하신다. */
let RT = {lawd:"11305", from:"", to:"", kind:"all", busy:false, log:null};

/* 처음 열 때 기간을 채워 둔다 — 최근 5년 */
(() => {
  const d = new Date();
  const ym = (y,m) => `${y}-${String(m).padStart(2,"0")}`;
  RT.to   = ym(d.getFullYear(), d.getMonth()+1);
  RT.from = ym(d.getFullYear()-5, d.getMonth()+1);
})();

/* ═══════════════════════════════════════════════════════════
   ★ 하루 한 번만 받아온다 (2026-09-17)
   ───────────────────────────────────────────────────────────
   국토부는 하루에 받아 주는 횟수(1,000회)가 정해져 있다.
   5년치 한 번이 60회, 구를 둘 고르면 120회다.

   ★ 조합이 넷인데 자주 누르면 **하루치가 금방 찬다.**
     한도가 차면 **모든 구역의 실거래가 함께 멈춘다.**
     한 조합의 손이 다른 조합을 멈추게 해서는 안 된다.

   ★ 구역마다 따로 센다. 미아2가 썼다고 미아3이 못 쓰면 안 된다.
   ★ 새벽 4시에 풀린다. 회사가 그 시각에 자동으로 받아 넣는다.
     자정 기준으로 하면 밤 11시에 쓰고 1시간 뒤 또 쓸 수 있다.
   ═══════════════════════════════════════════════════════════ */
const RT_KEY = "rtms_used";

/* 오늘이 며칠인가 — 새벽 4시 이전은 「어제」로 친다 */
function rtDay(){
  const d = new Date(); d.setHours(d.getHours() - 4);
  const z = v => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
}

/* 이 구역이 오늘 쓴 적이 있는가 */
function rtUsed(){
  try{
    if(typeof hubLoad === "undefined") return null;
    const v = hubLoad(RT_KEY, null);
    return (v && v.day === rtDay()) ? v : null;
  }catch(e){ return null; }
}

function rtMark(){
  try{
    if(typeof hubPush === "undefined") return;
    const now = new Date();
    const z = v => String(v).padStart(2, "0");
    hubPush(RT_KEY, {day: rtDay(),
      at: `${rtDay()} ${z(now.getHours())}:${z(now.getMinutes())}`,
      by: (typeof S !== "undefined" ? S.name : "")},
      (typeof S !== "undefined" ? S.name : ""));
  }catch(e){}
}

async function rtPull(){
  if(RT.busy) return;
  /* ★ 오늘 이미 쓰셨으면 막는다. 까닭을 말로 알려 드린다. */
  const u = rtUsed();
  if(u){
    alert("오늘은 이미 받아오셨습니다.\n\n"
      + `마지막으로 받은 때 · ${u.at}${u.by ? " · " + u.by : ""}\n\n`
      + "국토교통부가 하루에 받아 주는 횟수가 정해져 있어\n"
      + "구역마다 하루 한 번으로 묶어 두었습니다.\n\n"
      + "★ 내일 새벽 4시에 다시 쓰실 수 있습니다.\n"
      + "★ 회사가 매주 자동으로 받아 넣어 드립니다.");
    return;
  }
  if(!/^\d{5}$/.test(RT.lawd)){
    alert("법정동 코드 앞 5자리를 적어 주십시오.\n\n강북구 = 11305"); return; }

  const ms = (() => {
    const p = v => { const [y,m] = v.split("-").map(Number); return y*12+m; };
    return Math.abs(p(RT.to) - p(RT.from)) + 1;
  })();
  const calls = ms * (RT.kind === "all" ? 2 : 1);
  if(!confirm(`국토교통부에서 받아옵니다.\n\n`
    + `지역 ${RT.lawd} · ${RT.from} ~ ${RT.to} (${ms}개월)\n`
    + `호출 횟수 약 ${calls}회\n\n`
    + `하루 한도는 1,000회입니다.\n오래 걸릴 수 있습니다. 계속하시겠습니까?`)) return;

  RT.busy = true; RT.log = null; render();
  const r = await rtmsFetch({lawd:RT.lawd, from:RT.from, to:RT.to, kind:RT.kind});
  RT.busy = false;
  rtMark();          /* ★ 오늘 썼다고 남긴다 (성공·실패 상관없이 호출은 나갔다) */

  if(!r || !r.ok){
    /* ★ 실패해도 있던 자료를 건드리지 않는다 */
    RT.log = {ok:false, reason:(r&&r.reason)||"error",
              message:(r&&r.message)||"알 수 없는 오류입니다."};
    render(); return;
  }
  if(!r.rows || !r.rows.length){
    RT.log = {ok:false, reason:"empty",
      message:`받아온 건수가 0건입니다. 지역 코드나 기간을 확인해 주십시오. `
        + `(${r.failed?`실패한 달 ${r.failed}개월`:"실패 없음"})`};
    render(); return;
  }

  /* ★ 여기서만 갈아 끼운다 */
  DEALS = r.rows;
  MKT_SRC.src  = "국토교통부 실거래가 공개시스템 · 공공데이터포털";
  MKT_SRC.at   = r.at;
  MKT_SRC.api  = true;
  MKT_SRC.note = `${r.from} ~ ${r.to} · ${r.count}건 자동 수집`;
  mktReal();
  mktPut(S.name);
  RT.log = {ok:true, count:r.count, months:r.months, failed:r.failed};
  render();
}

/* ★ 법정동 알약 — 켜 둔 동만 조합원 폰에 나간다 (2026-08-22).
   국토부는 구 단위로만 주므로 강북구를 부르면
   미아동 · 수유동 · 번동이 다 온다.
   그것을 그대로 「우리 구역 실거래」라고 내보내면
   수유동 빌라 값이 섞여 평당가가 흐려진다.

   ★ 거른 것을 버리지 않는다. 담아 두고 표시만 바꾼다.
     122회를 들여 받은 것을 버리기 아깝고,
     나중에 다시 켜실 때 또 받지 않아도 된다. */
function dongToggle(name){
  const i = DEAL_DONG.indexOf(name);
  if(i >= 0) DEAL_DONG.splice(i, 1);
  else DEAL_DONG.push(name);
  dongPut(S.name); render();
}
/* ★ 한 건을 뺐다 넣었다 한다 (2026-09-17).
   ★ render() 를 부르지 않는다. 표가 300줄이라 껌뻑이고,
     체크하신 자리가 화면 밖으로 밀려난다.
     줄 색과 위쪽 건수만 고쳐 준다. */
function dealFlip(key){
  const i = DEAL_OFF.indexOf(key);
  if(i >= 0) DEAL_OFF.splice(i, 1);
  else DEAL_OFF.push(key);
  dealOffPut(S.name);
  dealCount();
  /* ★ 그 줄의 색만 바꾼다. 체크칸에서 두 단계 위가 <tr> 이다. */
  try{
    const box = document.activeElement;
    const tr = box && box.closest && box.closest("tr");
    if(tr) tr.classList.toggle("dealoff", i < 0);
  }catch(e){}
}

/* 뺀 건수를 화면에 고쳐 적는다 */
function dealCount(){
  try{
    const el = document.getElementById("dealCnt");
    if(!el) return;
    const on = DEALS.filter(dongOn).length;
    el.innerHTML = `${zwon(on)}건 / ${zwon(DEALS.length)}건`
      + (DEAL_OFF.length ? ` · <b style="color:#8C3A12">${zwon(DEAL_OFF.length)}건 빼 둠</b>` : "");
  }catch(e){}
}

/* 뺀 것을 모두 되돌린다 */
function dealOffClear(){
  if(!DEAL_OFF.length) return;
  if(!confirm(`빼 두신 ${DEAL_OFF.length}건을 모두 되돌립니다.\n\n계속하시겠습니까?`)) return;
  DEAL_OFF = []; dealOffPut(S.name); render();
}

function dongAll(){ DEAL_DONG = []; dongPut(S.name); render(); }
function dongOnly(name){ DEAL_DONG = [name]; dongPut(S.name); render(); }

/* ★ 예시 자료로 되돌린다 — 잘못 받아왔을 때 쓰는 되살리기 */
function rtSeed(){
  if(!confirm("지금 자료를 지우고 예시 자료로 되돌립니다.\n\n"
    + "국토부에서 잘못 받아왔을 때 쓰십시오.\n계속하시겠습니까?")) return;
  DEALS = DEALS_SEED.slice(); DEALS.demo = true;
  MKT_SRC = Object.assign({demo:true}, MKT_SRC_SEED);
  mktPut(S.name); RT.log = null; render();
}

V.deal = () => {
  const t = T();
  const byKind = {};
  DEALS.forEach(d => byKind[d.kind] = (byKind[d.kind]||0) + 1);
  const yrs = [...new Set(DEALS.map(d=>(d.date||"").slice(0,4)))].sort();
  const live = MKT_SRC.api && !MKT_SRC.demo;
  const ds = dealDongs();
  const on = dealsOn().length;
  const rows = DEALS.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||""));

  return `
  <h2 class="pt">지분 실거래</h2>
  <p class="pd"><b class="mono" style="color:var(--navy)">${t.code}</b> ·
    조합원 앱 [우리집 → 지분 실거래] 에 나가는 자료입니다</p>

  <div class="ztwo">
  <div class="col zstick">

    <div class="box">
      <b style="font-size:.86rem">국토교통부에서 받아오기</b>
      <div class="rowf" style="margin-top:10px">
        <div class="f w110"><label>법정동 코드</label>
          <input value="${RT.lawd}" placeholder="11305"
            oninput="RT.lawd=this.value.replace(/[^0-9,]/g,'')"></div>
        <div class="f w110"><label>시작</label>
          <input value="${RT.from}" placeholder="2021-08" oninput="RT.from=this.value"></div>
        <div class="f w110"><label>끝</label>
          <input value="${RT.to}" placeholder="2026-08" oninput="RT.to=this.value"></div>
      </div>
      <div class="rowf" style="margin-top:9px">
        <div class="f w150"><label>받아올 것</label>
          <select onchange="RT.kind=this.value">
            <option value="all" ${RT.kind==="all"?"selected":""}>단독 + 다세대</option>
            <option value="sh"  ${RT.kind==="sh" ?"selected":""}>단독 · 다가구만</option>
            <option value="rh"  ${RT.kind==="rh" ?"selected":""}>연립 · 다세대만</option>
          </select></div>
        ${/* ★ 오늘 이미 쓰셨으면 단추를 회색으로 두고 까닭을 적는다.
             눌러 봐도 아무 일이 없으면 「고장 났나」 하신다. */""}
        <button class="btn go" onclick="rtPull()"
          ${RT.busy || rtUsed() ? "disabled" : ""}>
          ${RT.busy ? "받아오는 중…" : rtUsed() ? "오늘은 다 쓰셨습니다" : "지금 받아오기"}</button>
      </div>
      <p class="hint">강북구 <b class="mono">11305</b> ·
        성북구 <b class="mono">11290</b> · 쉼표로 여럿<br>
        ${RT.busy?"국토부가 느릴 때 1분까지 · 60초에서 끊습니다":"기간이 길수록 오래 걸립니다"}</p>

      ${(()=>{ const u = rtUsed(); return u
        ? `<div class="warn" style="margin-top:10px">
             <b>오늘은 이미 받아오셨습니다</b>
             <p>마지막으로 받은 때 · <b>${u.at}</b>${u.by?` · ${u.by}`:""}<br>
               국토교통부가 하루에 받아 주는 횟수가 정해져 있어
               <b>구역마다 하루 한 번</b>으로 묶어 두었습니다.
               한 조합이 많이 쓰면 <b>다른 구역의 실거래가 함께 멈춥니다.</b><br>
               ★ <b>내일 새벽 4시</b>에 다시 쓰실 수 있습니다.</p></div>`
        : `<div class="box" style="margin-top:10px;background:#F2FAF6;border-color:#A9E0CD">
             <b style="font-size:.84rem;color:#0A6E51">자동으로 받아 드립니다</b>
             <p class="hint" style="margin-top:5px">평소에는 손대실 것이 없습니다.
               회사가 정해진 때에 받아서 넣어 드립니다.<br>
               ★ 급히 새 거래를 확인하셔야 할 때만 위 단추를 쓰십시오.
               <b>하루 한 번</b>입니다.</p></div>`; })()}

      <div style="display:flex;gap:8px;margin-top:11px">
        <button class="btn sm ghost" onclick="rtSeed()">예시로 되돌리기</button>
      </div>

      ${RT.log ? (RT.log.ok
        ? `<div class="box" style="margin-top:11px;border:1.5px solid var(--ok);background:#F4FCF9;padding:11px 13px">
            <b style="color:#0A6E51;font-size:.82rem">${RT.log.count}건을 받아왔습니다</b>
            <p class="hint" style="margin-top:4px">${RT.log.months}개월 ·
              ${RT.log.failed?`<b style="color:var(--amber)">${RT.log.failed}개월 실패</b> · 다시 받으면 채워집니다`
                :`실패 없음`}</p></div>`
        : `<div class="warn" style="margin-top:11px">
            <b>${RT.log.reason==="nokey"?"인증키가 없습니다"
               :RT.log.reason==="timeout"?"시간 초과"
               :RT.log.reason==="empty"?"받아온 것이 없습니다":"받아오지 못했습니다"}</b>
            <p>${RT.log.message}<br><b>있던 자료는 그대로입니다.</b></p></div>`)
      : ""}
    </div>

    ${DEALS.length ? `
    <div class="box" style="margin-top:14px">
      <b style="font-size:.86rem">조합원에게 보일 법정동</b>
      <span class="hint" style="display:block;margin-top:2px" id="dealCnt">${zwon(on)}건 / ${zwon(DEALS.length)}건${
        DEAL_OFF.length?` · <b style="color:#8C3A12">${zwon(DEAL_OFF.length)}건 빼 둠</b>`:""}</span>
      ${DEAL_OFF.length?`<button class="btn ghost sm" style="margin-top:8px"
        onclick="dealOffClear()">빼 둔 ${zwon(DEAL_OFF.length)}건 되돌리기</button>`:""}
      <div class="gubar" style="margin-top:9px">
        <button class="gub ${!DEAL_DONG.length?"on":""}" onclick="dongAll()">
          전부<em>${DEALS.length}</em></button>
        ${ds.map(x=>`<button class="gub ${DEAL_DONG.includes(x.name)?"on":""}"
          onclick="dongToggle('${x.name.replace(/'/g,"\\'")}')">
          ${x.name}<em>${x.n}</em></button>`).join("")}
      </div>
      ${DEAL_DONG.length ? `<p class="hint" style="color:var(--navy)">
        폰에는 <b>${DEAL_DONG.join(" · ")}</b> 만 나갑니다</p>`
        : `<p class="hint" style="color:#8C3A12">
          <b>받아온 것이 전부 나갑니다.</b> 우리 구역 동만 켜 두십시오</p>`}

      <details class="fold warnf">
        <summary>왜 걸러야 하는가</summary>
        <div class="fb">국토부는 <b>구 단위로만</b> 줍니다.
          강북구를 부르면 미아동 · 수유동 · 번동이 다 옵니다.
          그대로 「우리 구역 실거래」로 내보내면 <b>다른 동 값이 섞여
          평당가가 흐려집니다.</b> 시험해 보니 14%가 어긋났습니다.<br>
          끄신 자료는 <b>지워지지 않습니다.</b> 담아 두고 보여 드리지만 않습니다.</div>
      </details>
    </div>` : ""}

    <details class="fold" style="margin-top:14px">
      <summary>배포 · 개인정보 · 평당가 셈법</summary>
      <div class="fb">
        <b>키는 화면에 두지 않습니다.</b> Supabase Edge Function 안에만 있습니다.
        화면에 두면 누구나 꺼내 쓰고 일일 한도가 소진됩니다.
        apis.data.go.kr 은 CORS 때문에 브라우저에서 직접 못 부릅니다.<br><br>
        <b>배포</b> · <span class="mono">supabase functions deploy rtms</span> →
        <span class="mono">secrets set RTMS_KEY=…</span><br>
        법정동 코드는 <b>code.go.kr</b> 에서 찾습니다.<br><br>
        <b>지번은 본번까지만 담습니다.</b> 단독은 국토부가 애초에 일부만 주고,
        연립은 온전히 오지만 우리가 깎습니다. 100명 규모 구역에서 부번까지
        내면 누구 물건인지 특정됩니다. 명의는 담지 않습니다.<br><br>
        <b>평당가는 대지 지분 기준</b>입니다. 재개발에서 값을 정하는 것은 땅입니다.
      </div>
    </details>

  </div>
  <div class="col">

    <div class="zcards" style="grid-template-columns:repeat(3,1fr)">
      <div class="card"><span>등록 건수</span><b>${DEALS.length}</b></div>
      <div class="card"><span>기간</span>
        <b style="font-size:1rem">${yrs.length?`${yrs[0]}~${yrs[yrs.length-1]}`:"—"}</b></div>
      <div class="card ${live?"good":""}"><span>자료 출처</span>
        <b style="font-size:1rem;color:${live?'var(--ok)':'var(--amber)'}">
          ${live?"국토부 연동":MKT_SRC.demo?"예시 자료":"손으로 등록"}</b></div>
    </div>

    <div class="sec" style="margin-top:16px">받아온 자료
      <em>${Object.keys(byKind).map(k=>`${k} ${byKind[k]}`).join(" · ")||"없음"}</em></div>
    <div class="box" style="padding:0;overflow:hidden">
      <div style="max-height:640px;overflow-y:auto">
      <table><thead><tr>
        <th style="width:34px;text-align:center" title="체크를 풀면 조합원 폰에 안 나갑니다">쓸까</th>
        <th style="width:92px">계약일</th><th style="width:66px">갈래</th>
        <th style="width:118px">지번</th>
        <th style="width:70px;text-align:right">지분㎡</th>
        <th style="text-align:right">거래가</th>
        <th style="width:82px;text-align:right">평당</th>
      </tr></thead><tbody>
      ${rows.length ? rows.slice(0,300).map(d=>{
        const dong = !DEAL_DONG.length || DEAL_DONG.includes((d.dong||"").trim());
        const off  = dealOff(d);
        const k = dealKey(d).replace(/'/g,"\\'");
        return `<tr class="${off?"dealoff":""}" style="${dong?"":"opacity:.3"}">
        <td style="text-align:center">
          ${/* ★ 동으로 이미 걸러진 줄은 체크칸을 잠근다.
               두 가지로 빠진 것을 한 칸에 섞으면 왜 안 나가는지 모르신다. */""}
          <input type="checkbox" class="dchk" ${off?"":"checked"} ${dong?"":"disabled"}
            onchange="dealFlip('${k}')" title="${dong?(off?"빼 둔 건":"조합원 폰에 나갑니다"):"동으로 이미 빠진 건"}"></td>
        <td class="mono" style="color:var(--muted)">${d.date}</td>
        <td><span class="pill ${d.kind==="단독"?"p-blue":"p-wait"}">${d.kind}</span></td>
        <td class="mono">${d.dong?d.dong+" ":""}${d.bun}-**</td>
        <td class="mono" style="text-align:right;color:${d.own?'var(--ink)':'var(--amber)'}">
          ${d.own||"—"}</td>
        <td class="mono" style="text-align:right;font-weight:700">${eokKRW(d.price)}</td>
        <td class="mono" style="text-align:right;color:var(--amber)">
          ${d.own?(perPy(d)/10000).toFixed(0)+"만":"—"}</td>
      </tr>`; }).join("")
      : `<tr><td colspan="7" style="color:var(--muted)">받아온 자료가 없습니다.</td></tr>`}
      </tbody></table>
      </div>
    </div>
    ${rows.length>300?`<p class="hint">${rows.length}건 중 최근 300건만 보입니다.
      ★ 여기 안 보이는 것도 <b>조합원 폰에는 나갑니다.</b>
      빼시려면 위 <b>기간</b>을 줄여 받아오시거나 <b>법정동</b>을 걸러 주십시오.</p>`:""}
    ${DEALS.some(d=>!d.own) ? `<details class="fold warnf">
      <summary>연립 · 다세대는 평당가가 비어 있습니다</summary>
      <div class="fb">국토부 API 는 <b>대지권 지분을 주지 않습니다.</b> 등기부에만 있습니다.
        지분이 없으면 평당가를 낼 수 없어 <b class="mono">—</b> 로 나옵니다.
        채우시려면 등기부를 보고 손으로 넣으셔야 합니다.
        단독 · 다가구는 대지 전체가 한 사람 것이라 대지면적이 곧 지분입니다.</div>
    </details>`:""}

  </div>
  </div>`;
};


/* ══════════ 홈 화면 · 단계 일정 ══════════ */

/* ── 홈 화면 관리 ──────────────────────────────────────────
   ★ 두 칸으로 바꿨다 (2026-08-22 오후).

     예전에는 위에서 아래로 한 줄이었다.
     이미지 → 이름 → 주소 → 제원 → 경고문 → 폰 미리보기 순서라
     이름을 고치고 폰에서 어떻게 보이는지 확인하려면
     스크롤을 끝까지 내렸다가 다시 올라와야 했다.
     오른쪽 절반은 내내 비어 있었다.

     이제 왼쪽에서 치면 오른쪽 폰이 그 자리에서 바뀐다.

   ★ 다시 그리지 않는다. 미리보기 자리만 갈아 끼운다.
     render() 를 부르면 치고 계신 칸의 커서가 맨 앞으로 튄다.
     직원 화면에서 이미 겪은 것이다 (7번 절).
     homeSync() 가 #hmPv 안쪽만 바꾼다.

   ★ 제원 세 값은 여전히 못 고친다.
     접어 두기만 했다. 고칠 수 있게 해 달라는 말씀이 있었지만
     그것만은 안 된다. 검산 23규칙을 통과한 값이라
     손으로 고치면 검산이 깨지는데 조합원 앱에는
     여전히 「검산 통과」라고 나간다.
     다알아의 가장 큰 강점이 거짓말이 되는 순간이다.
     고치시려면 고시 자료를 다시 올리셔야 한다. */
V.home = () => {
  const t = T();
  return `
  <div class="pghd">
    <div class="pgL">
      <h2 class="pt" style="margin:0">홈 화면 · 단계 일정</h2>
      <p class="pd" style="margin:2px 0 0">
        <b class="mono" style="color:var(--navy)">${t.code}</b> · 조합원 앱 첫 화면</p>
    </div>
    <div class="pgR">
      ${/* ★★★ 2026-09-16 밤 — 다시 그릴 때 단추가 도로 죽던 것 ★★★
           예전에는 여기에 disabled 가 **늘 박혀** 있었다.
           단계를 바꾸면 homeDirty() 로 단추를 살리는데,
           바로 뒤에 render() 가 돌면서 이 줄이 다시 그려져
           **도로 회색이 됐다.** 눌러도 아무 일이 없다.

           ★ 그리는 순간의 상태를 그대로 적는다.
             화면을 다시 그리는 것과 상태가 어긋나면 안 된다. */""}
      <span class="hmS${HOME_DIRTY?" on":""}" id="hmS">${HOME_DIRTY
        ? "저장하지 않은 변경이 있습니다" : "모두 저장되었습니다"}</span>
      <button class="btn go" id="hmSave" onclick="homeSave()"
        ${HOME_DIRTY?"":"disabled"}>변경사항 저장</button>
    </div>
  </div>

  <div class="ztwo rev">
    <div class="col tight">

      <div class="sec">대표 이미지 <em>조감도 · 권장 1200×800 · 3MB 이하</em></div>
      <div class="box">
        <div class="hero" onclick="pickHero()">
          <div style="font-size:1.3rem;color:var(--navy)">↑</div>
          <div style="text-align:left">
            <b style="display:block">${t.home.img ? "다른 사진으로 바꾸기" : "눌러서 이미지 고르기"}</b>
            <span>${t.home.img ? t.home.img : "없으면 아래 색으로 채워집니다"}</span>
          </div>
          ${t.home.img?`<button style="color:var(--red);font-weight:700;font-size:.78rem;margin-left:6px"
            onclick="event.stopPropagation();dropHero()">삭제</button>`:""}
        </div>

        ${/* ★ 조감도는 가로로 긴 사진이라 폰에 넣으면 위아래가 잘린다.
             하늘을 자를지 땅을 자를지는 사진마다 다르다.
             ★ 미십시오 → 오른쪽 폰이 그 자리에서 바뀐다. */""}
        ${/* ★ 사진을 끌어서 자리를 잡으신다 (2026-09-17).
             밝은 자리가 폰에 나올 데다. 나머지는 어둡게 덮는다. */""}
        ${t.home.src?`
        <div class="box heropos">
          <div class="hpt">사진 자리 잡기
            <span id="hmPos">${heroPosText(t)}</span></div>

          <div class="hdwrap">
            <div class="hdbox" id="hdBox"
              onpointerdown="heroDown(event)" onpointermove="heroMove(event)"
              onpointerup="heroUp(event)" onpointercancel="heroUp(event)">
              <img id="hdImg" src="${t.home.src}" alt="" draggable="false"
                style="object-position:${t.home.posx===undefined?50:t.home.posx}%
                       ${t.home.pos===undefined?50:t.home.pos}%">
              <div class="hdmask"></div>
              <div class="hdframe"><span>폰에 나오는 자리</span></div>
              <div class="hdhand">✥ 끌어서 옮기십시오</div>
            </div>
          </div>

          ${/* ★ 크기를 키워야 좌우로 밀 데가 생긴다.
               큰 조절은 막대로, 미세 조절은 ＋ － 로. */""}
          <div class="hdzoom">
            <button class="hzb" onclick="heroZoom(-10)" title="작게">−</button>
            <input type="range" id="hdZoom" min="100" max="250" step="5"
              value="${t.home.zoom===undefined?100:t.home.zoom}"
              oninput="heroZoomSet(this.value)">
            <button class="hzb" onclick="heroZoom(10)" title="크게">＋</button>
            <span id="hdZoomT">${t.home.zoom===undefined?100:t.home.zoom}%</span>
          </div>

          <div class="hdfoot">
            <button class="btn ghost sm" onclick="heroPosMid()">처음으로 되돌리기</button>
            <span class="hint">★ <b>작게</b> 하면 사진 전체가 들어옵니다.
              <b>크게</b> 하면 원하는 데만 크게 나오고, 그때 <b>좌우로도 밀 수</b> 있습니다.<br>
              ★ 조감도처럼 가로로 긴 사진은 100%에서 <b>좌우로 밀 데가 없습니다.</b>
              먼저 크기를 키우십시오.</span>
          </div>
        </div>`:""}
      </div>

      <div class="sec">구역 이름 · 주소</div>
      <div class="box">
        <div class="g2">
          <div class="f"><label>구역 명칭 (공식)</label>
            <input value="${t.name}" oninput="homeEdit('name',this.value)"></div>
          <div class="f"><label>짧은 이름 (앱 표시)</label>
            <input value="${t.short}" oninput="homeEdit('short',this.value)"></div>
        </div>
        <div class="f"><label>주소</label>
          <input value="${t.addr}" oninput="homeEdit('addr',this.value)"></div>
        <p class="hint">오른쪽 폰은 <b>치는 즉시</b> 바뀝니다.
          다만 조합원 폰에 나가는 것은 <b>저장을 누르신 뒤</b>입니다.</p>
      </div>

      ${homeSpec(t)}

      ${/* ★ 2026-09-16 밤 — 「단계 · 일정」을 여기로 옮겨 붙였다.
           두 화면 다 여백이 절반이었고, 저장 단추가 둘이라
           「어느 쪽을 저장한 거지」가 됐다. 이제 하나다. */""}
      ${planPart(t)}

      ${/* ★ 홈 아래 세 덩이 — 조합이 직접 채운다 (2026-09-17 밤) */""}
      ${(typeof hbPart !== "undefined") ? hbPart(t) : ""}

    </div>

    <div class="col">
      <div class="zstick">
        <div class="sec" style="margin-top:0;font-size:.84rem">폰 미리보기</div>
        <div id="hmPv">${homePhone(t)}</div>
        <p class="hint" style="text-align:center">조합원이 앱을 열면 보는 첫 화면입니다</p>
      </div>
    </div>
  </div>`;
};

/* 접어 두는 제원 — 요약 줄에 숫자를 그대로 보인다.
   매일 쓰는 분께는 「179,566㎡ · 4,003세대 · 35층」 한 줄이면 충분하고,
   왜 못 고치는지는 처음 오는 분께만 필요하다. */
/* ═══════════════════════════════════════════════════════════
   구역 제원 — 직원이 직접 넣는다 (2026-09-17)
   ───────────────────────────────────────────────────────────
   ★ 예전에는 읽기 전용이었다. 고시 원문에서 뽑아 검산 23규칙을
     통과한 값만 썼기 때문이다.

   ★ 그런데 **고시 자료를 아직 안 올린 조합**은 「—」로 비어 있었다.
     조합원이 홈을 열면 세대수도 층수도 안 보인다.
     서울시 고시를 보고 직원이 넣으면 되는 일이다.

   ★★★ 다만 근거는 흐리지 않는다 ★★★
     손으로 넣은 값을 「검산 통과」라고 하면 안 된다.
     조합원 화면에 그대로 나가는 숫자다.

       고시에서 뽑음   딱지 「검산 통과」
       손으로 넣음     딱지 「직접 입력」   ← 어느 쪽인지 그대로 알린다

   ★ 고시 값이 있는데 손으로 고치시면 물어본다.
     검산을 통과한 값을 모르고 덮어쓰면 안 된다.
   ═══════════════════════════════════════════════════════════ */
function specVal(t, k){
  /* 손으로 넣은 것이 있으면 그것을, 없으면 고시 값을 쓴다 */
  const m = t.home.spec || {};
  return (m[k] !== undefined && m[k] !== "") ? m[k] : (t.facts[k] || "");
}
function specByHand(t){
  const m = t.home.spec || {};
  return ["area","units","floors"].some(k => m[k] !== undefined && m[k] !== "");
}
/* ═══════════════════════════════════════════════════════════
   ★ 숫자 칸에 쉼표를 찍는다 (2026-09-17 저녁)
   ───────────────────────────────────────────────────────────
   179566 은 눈으로 세어야 한다. 179,566 은 한눈에 읽힌다.
   고시문에도 쉼표가 찍혀 있어 **맞춰 보기가 쉽다.**

   ★★★ 커서가 튀지 않게 해야 한다 ★★★
     칸의 글자를 바꾸면 커서가 **맨 뒤로 간다.**
     「179566」을 치다가 「1795」에서 쉼표가 붙으면
     그 다음 글자가 엉뚱한 자리에 들어간다.

     → 커서 **앞에 숫자가 몇 개** 있었는지 세어 두고,
       쉼표를 찍은 뒤 **같은 숫자 개수** 자리로 커서를 옮긴다.
       쉼표 개수는 달라져도 숫자 개수는 그대로다.

   ★ 층수는 쉼표를 안 찍는다. 45층에 쉼표가 붙을 일이 없고,
     붙으면 오히려 어색하다.
   ═══════════════════════════════════════════════════════════ */
function specComma(v){
  const s = String(v).replace(/[^0-9]/g, "");
  if(!s) return "";
  return Number(s).toLocaleString("ko-KR");
}

function specType(el, k){
  const raw = el.value;
  const pos = el.selectionStart;
  /* 커서 앞의 숫자 개수 */
  const before = raw.slice(0, pos).replace(/[^0-9]/g, "").length;

  const digits = raw.replace(/[^0-9]/g, "");
  specSet(k, digits);

  if(k === "floors"){ el.value = digits; return; }

  el.value = specComma(digits);
  /* 같은 숫자 개수 자리로 커서를 돌려놓는다 */
  let n = 0, i = 0;
  for(; i < el.value.length && n < before; i++){
    if(/[0-9]/.test(el.value[i])) n++;
  }
  try{ el.setSelectionRange(i, i); }catch(e){}
}

function specSet(k, v){
  const t = TN();
  if(!t.home.spec) t.home.spec = {};
  /* ★ 고시 값이 있는데 처음 손대실 때만 한 번 여쭙는다 */
  if(t.facts[k] && !specByHand(t) && !SPEC_ASKED){
    SPEC_ASKED = true;
    if(!confirm("이 값은 고시 원문에서 뽑아 검산을 통과한 값입니다.\n\n"
      + "손으로 수정하시면 조합원 화면의 딱지가\n"
      + "「검산 통과」에서 「직접 입력」으로 바뀝니다.\n\n"
      + "계속하시겠습니까?")){ render(); return; }
  }
  t.home.spec[k] = String(v).replace(/[^0-9.]/g, "");
  homeDirty();
  const pv = document.getElementById("hmPv");
  if(pv) pv.innerHTML = homePhone(t);
  const tag = document.getElementById("hmSpecTag");
  if(tag){ tag.textContent = specByHand(t) ? "직접 입력" : "검산 통과";
           tag.className = specByHand(t) ? "zlock hand" : "zlock"; }
}
let SPEC_ASKED = false;

function specBack(){
  if(!confirm("손으로 넣으신 값을 지우고\n고시 원문에서 뽑은 값으로 되돌립니다.\n\n계속하시겠습니까?")) return;
  TN().home.spec = {}; SPEC_ASKED = false; homeDirty(); render();
}

function homeSpec(t){
  const f = t.facts, byHand = specByHand(t);
  const n = v => v ? Number(v).toLocaleString("ko-KR") : "—";
  return `
  <div class="sec">구역 제원
    <span class="zlock ${byHand?"hand":""}" id="hmSpecTag">${byHand?"직접 입력":"검산 통과"}</span></div>
  <div class="box">
    <div class="g3">
      <div class="f"><label>전체 면적 <span class="sm">㎡</span></label>
        <input inputmode="numeric" value="${specComma(specVal(t,"area"))}"
          placeholder="179,566" oninput="specType(this,'area')"></div>
      <div class="f"><label>세대수 <span class="sm">세대</span></label>
        <input inputmode="numeric" value="${specComma(specVal(t,"units"))}"
          placeholder="4,003" oninput="specType(this,'units')"></div>
      <div class="f"><label>최고 층수 <span class="sm">층</span></label>
        <input inputmode="numeric" value="${specVal(t,"floors")}"
          placeholder="45" oninput="specType(this,'floors')"></div>
    </div>

    <p class="hint" style="margin-top:9px">
      조합원 홈 첫 화면에 <b>${n(specVal(t,"area"))}㎡ ·
      ${n(specVal(t,"units"))}세대 · 최고 ${specVal(t,"floors")||"—"}층</b> 으로 나갑니다.<br>
      ★ <b>서울시 고시문</b>에 적힌 숫자를 그대로 넣으십시오. 쉼표는 없어도 됩니다.</p>

    ${byHand ? `<div class="warn" style="margin-top:10px">
      <b>직접 넣으신 값입니다</b>
      <p>조합원 화면에도 <b>「직접 입력」</b>으로 나갑니다.
        검산을 통과한 값이 아니므로 그렇게 알려 드리는 것입니다.<br>
        ★ 숫자가 틀리면 조합원이 그 숫자로 분담금을 셈해 보십니다.
        <b>고시문과 한 번 더 맞춰</b> 주십시오.
        ${f.area?`<br>★ 고시에서 뽑은 값 · ${n(f.area)}㎡ · ${n(f.units)}세대 · ${f.floors}층
          <button style="color:var(--blue);font-weight:700;margin-left:6px"
            onclick="specBack()">되돌리기</button>`:""}</p></div>`
      : `<div class="box" style="margin-top:10px;background:#F2FAF6;border-color:#A9E0CD">
      <b style="font-size:.84rem;color:#0A6E51">고시 원문에서 뽑은 값입니다</b>
      <p class="hint" style="margin-top:5px">
        ${f.notice || "고시 자료"} · 검산 23개 규칙을 통과했습니다.<br>
        4,003세대는 분양 3,293 + 임대 710 으로 맞아떨어지고,
        179,566㎡ 는 용도지역 면적 합계와 일치합니다.<br>
        ★ 손으로 수정하시면 딱지가 <b>「직접 입력」</b>으로 바뀝니다.</p></div>`}
  </div>`;
}

/* 폰 미리보기 — 이 함수 하나만 다시 불러 갈아 끼운다 */
/* ★★★ 2026-09-16 밤 — 조합원 화면 그대로 그린다 ★★★
   ─────────────────────────────────────────────────────
   예전에는 「닮은 카드」였다. 세대수 · 층 · 만㎡ 세 칸과
   「입주까지」 한 줄뿐이라, 운영자가 단계를 바꿔도
   **실제로 어떻게 나가는지 알 수 없었다.**

   ★ 이제 index.html 의 홈(vHome)과 같은 것을 그린다.
     조감도 → 구역 이름 → 진행 막대(9칸) → 이주 · 입주.
   ★ 막대는 STAGES 로 그린다. 조합원 화면과 한 곳에서 나온다.
   ★ 좁으니 좌우로 밀 수 있게 하되 스크롤바는 숨긴다. */
function homePhone(t){
  const h = t.home, p = t.plan;
  /* ★ 손으로 넣은 값이 있으면 그것을 쓴다 (2026-09-17) */
  const f = {area:   specVal(t,"area"),
             units:  specVal(t,"units"),
             floors: specVal(t,"floors")};
  const S = (typeof STAGES !== "undefined") ? STAGES : [];
  let i = S.indexOf(t.stage); if(i < 0) i = 0;
  const pct  = S.length > 1 ? Math.round(i / (S.length - 1) * 100) : 0;
  const half = S.length ? 50 / S.length : 0;
  const two  = x => { const w = String(x).split(" ");
    return w.length > 1 ? `${w[0]}<br>${w.slice(1).join(" ")}`
         : (x.length > 3 ? `${x.slice(0,2)}<br>${x.slice(2)}` : x); };
  const ym = v => v ? `${v.split("-")[0]}년 ${Number(v.split("-")[1])}월` : "—";
  /* ★ specVal 은 글자를 돌려준다. 숫자로 바꿔 쉼표를 찍는다.
     글자에 toLocaleString 을 부르면 그 줄에서 멈춘다. */
  const n  = v => (v === "" || v === undefined || v === null || isNaN(Number(v)))
    ? "—" : Number(v).toLocaleString("ko-KR");

  return `
  <div class="pv">
    ${/* ★ 사진이 있으면 사진을, 없으면 색을 쓴다 (2026-09-17).
         좌우(posx) · 상하(pos)로 어디를 보여 줄지 정한다. */""}
    ${/* ★★★ 2026-09-17 밤 — 셋을 같은 방식으로 그린다 ★★★
         예전에는 미리보기만 **배경 그림**(background-image)이었다.
         조합원 화면과 조절 상자는 <img> 에 object-fit 을 쓴다.
         셈법이 달라 같은 값을 넣어도 **다른 자리**가 나왔다.

         ★ 기준은 늘 조합원이 보는 것이다.
           미리보기도 <img> + object-fit 으로 바꿔 셋을 맞춘다. */""}
    <div class="pv-hero" style="${h.src?"background:#0B1F3A":`background:${h.hero}`}">
      ${h.src?`<img class="pv-bg" src="${h.src}" alt=""
        style="object-fit:${Number(h.zoom||100)<=100?"contain":"cover"};`
        + (Number(h.zoom||100)>100?`transform:scale(${Number(h.zoom)/100});`:"")
        + `object-position:${h.posx===undefined?50:h.posx}% ${h.pos===undefined?50:h.pos}%">`:""}
      <div class="pv-credit">조감도 · 계획안</div>
      <div class="pv-txt">
        <span class="pv-eye">${(t.addr||"").replace("서울특별시 ","서울 ")}</span>
        <div class="pv-h1">${t.short || t.name || "—"}</div>
        <div class="pv-sub">${n(f.area)}㎡ · ${n(f.units)}세대 · 최고 ${f.floors||"—"}층</div>
      </div>
    </div>

    <div class="pv-prog">
      <div class="pv-top">
        <b>지금은 ${t.stage || "—"} 단계</b>
        <div class="pv-dd"><b>${(untilMoveIn(t)||"").replace("약 ","") || "—"}</b>
          <span>입주까지 (계획 기준)</span></div>
      </div>

      <div class="pv-scroll">
        <div class="pv-line" style="width:${Math.max(100, S.length*46)}px">
          <div class="pv-trk" style="left:${half}%;right:${half}%">
            <i style="width:${pct}%"></i></div>
          <div class="pv-dots">${S.map((x,k)=>
            `<span class="pv-cell"><i class="pv-dot ${k<i?"done":k===i?"now":""}"></i></span>`).join("")}</div>
          <div class="pv-labs">${S.map((x,k)=>
            `<span class="${k<=i?"on":""}">${two(x)}</span>`).join("")}</div>
        </div>
      </div>

      ${h.showPlan?`<div class="pv-foot">
        <div><b>${ym(p.move)}</b><span>이주 시작 (예정)</span></div>
        <div><b>${ym(p.moveIn)}</b><span>입주 (목표)</span></div>
      </div>`:""}
    </div>

    ${/* ★ 홈 아래 세 덩이도 미리 보여 드린다 (2026-09-17 밤).
         「저장하면 폰에 이렇게 나옵니다」가 눈에 보여야
         채우실 마음이 생긴다.
       ★ 조합원 화면과 **같은 함수**(hbKpi · hbChg · hbFaq)를 쓴다.
         채운 것만 나오고 예시는 안 나온다. 폰과 똑같다. */""}
    ${(()=>{
      if(typeof hbKpi === "undefined") return "";
      const K = hbKpi(), C = hbChg(), F = hbFaq();
      let out = "";
      if(K) out += `<div class="pv-sec">우리 구역 한눈에</div>
        <div class="pv-kpis">${K.map(r=>`<div class="pv-kpi">
          <span>${r.name||""}</span><b>${r.val||"—"}<i>${r.unit||""}</i></b>
          ${r.diff?`<em>${r.diff}</em>`:""}</div>`).join("")}</div>`;
      if(C) out += `<div class="pv-sec">이번 고시 변경</div>
        <div class="pv-scroll2">${C.map(h=>`<div class="pv-hc">
          <span>${h.t||""}</span>
          <b>${h.b?`<i>${h.b}</i> → `:""}${h.a||""}${h.u||""}</b>
          ${h.d?`<em>${h.d}</em>`:""}</div>`).join("")}</div>`;
      if(F) out += `<div class="pv-sec">궁금한 것</div>
        <div class="pv-faq">${F.map(f=>`<div class="pv-fq">
          <span>${f.q||""}</span>
          ${f.badge?`<em>${f.badge}</em>`:`<i>›</i>`}</div>`).join("")}</div>`;
          /* ★ 「확정 수치 전체 보기」 줄은 뺐다 (118절) */
      return out ? `<div class="pv-more">${out}</div>` : "";
    })()}
  </div>`;
}

/* ═══════════════════════════════════════════════════════════
   저장 (2026-08-22 오후)
   ───────────────────────────────────────────────────────────
   ★ 예전에는 저장이라는 것이 아예 없었다.
     치는 대로 TENANTS 에 바로 들어갔는데 TENANTS 는
     화면 안 변수라 F5 를 누르면 그대로 사라졌다.
     구역 이름을 고쳐 두고 다음 날 오면 예전 이름이 있었다.

   ★ app_state("tenant_home") 에 담는다. 구역마다 따로 담는다.
     TENANTS 통째로 올리지 않는다. 그 안에는 구독료 · 계약 상태가
     들어 있고 app_state 는 조합원 누구나 읽을 수 있다.
     조합원이 개발자 도구를 열면 우리 요금표가 그대로 보인다.
     홈 화면에 나가는 여섯 가지만 골라 담는다.
     (절대 규칙 ⑤ — 담아도 되는 것만 담는다)

   ★ 제원(facts)은 담지 않는다. 여기서 고칠 수 없는 값이다.
   ═══════════════════════════════════════════════════════════ */
let HOME_DIRTY = false;

function homeEdit(k, v){
  const t = TN();
  if(k === "img") t.home.img = v; else t[k] = v;
  HOME_DIRTY = true;
  homeSync();
}

/* ★ 미리보기 자리만 갈아 끼운다. render() 를 부르면 커서가 튄다. */
function homeSync(){
  const t = TN();
  const pv = document.getElementById("hmPv");
  if(pv) pv.innerHTML = homePhone(t);
  homeMark();
}

function homeMark(){
  const b = document.getElementById("hmSave"), s = document.getElementById("hmS");
  if(!b || !s) return;
  b.disabled = !HOME_DIRTY;
  s.className = "hmS" + (HOME_DIRTY ? " on" : "");
  s.textContent = HOME_DIRTY ? "저장하지 않은 변경이 있습니다" : "모두 저장되었습니다";
}

async function homeSave(){
  if(!HOME_DIRTY) return;
  const t = TN(), b = document.getElementById("hmSave");
  b.disabled = true; b.textContent = "저장 중…";

  let ok = false;
  if(typeof hubPush !== "undefined"){
    /* ★ 일정(plan)도 함께 담는다 (2026-09-16 밤).
       예전에는 이름 · 주소 · 단계만 갔다. 일정을 고쳐도 서버에 안 갔고,
       새로고침하면 조용히 예전 값으로 돌아왔다. */
    ok = await hubPush("tenant_home", {
      name:t.name, short:t.short, addr:t.addr, stage:t.stage,
      img:t.home.img, hero:t.home.hero, showPlan:t.home.showPlan,
      /* ★ 사진 자체와 자리도 함께 담는다 (2026-09-17).
         이름(img)만 담으면 조합원 앱에는 아무것도 안 나간다. */
      src:t.home.src || "", pos:t.home.pos, posx:t.home.posx, zoom:t.home.zoom,
      spec:t.home.spec || {},
      /* ★ 분담금 기준값도 함께 담는다 (2026-09-17).
         담는 곳을 빼먹으면 넣어도 조합원 화면에 안 나간다 (절대규칙 82). */
      calc:t.calc || {},
      plan:{approved:t.plan.approved, move:t.plan.move, moveIn:t.plan.moveIn}
    }, S.name, t.code);
  }
  /* ★ 홈 세 덩이도 함께 담는다 (2026-09-17 밤).
     따로 담으면 하나만 저장되고 다른 하나가 빠지는 일이 생긴다. */
  if(ok && typeof hbPut !== "undefined"){
    try{ await hbPut(S.name); }catch(e){}
  }
  b.textContent = "변경사항 저장";

  if(!ok){
    /* ★ 실패를 조용히 넘기지 않는다.
       저장됐다고 알려 놓고 실제로는 안 갔으면
       다음 날 예전 이름을 보고 "고쳤는데 왜 그대로냐" 가 된다. */
    b.disabled = false;
    alert("서버에 닿지 못했습니다.\n\n"
      + "수정하신 내용은 화면에 그대로 있습니다.\n"
      + "인터넷을 확인하시고 [변경사항 저장]을 다시 눌러 주십시오.");
    return;
  }
  HOME_DIRTY = false;
  zLog("홈 화면 수정", `${t.code} · ${t.short}`);
  homeMark();
}

/* ★ 탭을 닫거나 새로고침하실 때도 알린다.
   브라우저가 "이 사이트를 나가시겠습니까" 를 대신 물어 준다. */
window.addEventListener("beforeunload", e => {
  if(!HOME_DIRTY) return;
  e.preventDefault(); e.returnValue = "";
});

/* ═══════════════════════════════════════════════════════════
   ★★★ 2026-09-17 — 조감도가 미리보기에 안 나오던 것 ★★★
   ───────────────────────────────────────────────────────────
   이미지를 골라도 오른쪽 폰이 그대로였다.

   ★ 까닭 — **파일 이름만 담고 그림은 어디에도 안 읽었다.**
     homeEdit("img", f.name) 가 「조감도.jpg」라는 **글자**만 담았다.
     미리보기는 h.hero(색)만 보고 그렸으니 바뀔 것이 없다.

   ★ 고침 — 고르신 파일을 그 자리에서 읽어 담는다.
     FileReader 로 읽으면 data: 로 시작하는 **글자 하나**가 된다.
     그림이 글자가 되므로 app_state 에 그대로 담기고,
     조합원 앱도 그 글자를 배경으로 쓰면 된다.

   ★ 3MB 를 넘기지 않게 막는다. data: 로 바꾸면 크기가 1.37배가 된다.
     app_state 한 칸에 담기에 그 위는 위험하다.
   ═══════════════════════════════════════════════════════════ */
function pickHero(){
  const inp = document.createElement("input");
  inp.type = "file"; inp.accept = "image/*";
  inp.onchange = () => {
    const f = inp.files[0]; if(!f) return;
    if(f.size > 3*1024*1024){
      alert("3MB 이하로 올려 주십시오.\n\n"
        + `고르신 것 · ${(f.size/1024/1024).toFixed(1)}MB\n\n`
        + "★ 사진을 줄이는 방법\n"
        + "  그림판에서 열기 → 크기 조정 → 가로 1200 → 다른 이름으로 저장");
      return;
    }
    const fr = new FileReader();
    fr.onload = () => {
      const t = TN();
      t.home.img = f.name;
      t.home.src = fr.result;        /* ★ 그림 자체 (data: 로 시작하는 글자) */
      if(t.home.pos === undefined) t.home.pos = 50;   /* 위아래 · 기본 가운데 */
      if(t.home.posx === undefined) t.home.posx = 50; /* 좌우 · 기본 가운데 */
      homeDirty(); render();
    };
    fr.onerror = () => alert("사진을 읽지 못했습니다.\n다른 파일로 해보십시오.");
    fr.readAsDataURL(f);
  };
  inp.click();
}

/* 사진을 걷어낸다 — 아래 색으로 돌아간다 */
function dropHero(){
  if(!confirm("고르신 사진을 지웁니다.\n\n아래 색으로 채워집니다.\n계속하시겠습니까?")) return;
  const t = TN();
  t.home.img = ""; t.home.src = "";
  homeDirty(); render();
}

/* ═══════════════════════════════════════════════════════════
   사진 자리 잡기 — 끌어서 옮긴다 (2026-09-17 고침)
   ───────────────────────────────────────────────────────────
   ★ 처음에는 화살표 단추 다섯 개를 두었다. 누를 때마다 6%씩.
     「사진 자체를 올려놓고 조절하면 안 되나」 하셨다. 맞는 말씀이다.
     여섯 번을 눌러야 알 것을 한 번 끌면 된다.

   ★ 접지 않는다. 사진을 고르시면 늘 펼쳐져 있다.
     한 번 더 눌러야 나오면 자리를 안 맞추고 넘어가신다.

   ★ 사진 위에 **폰에 나올 자리**를 밝게 남기고 나머지는 어둡게 덮는다.
     「이 밝은 자리가 폰에 나옵니다」가 눈에 보여야 한다.

   ★ 마우스와 손가락을 함께 받는다. Pointer 로 한 번에 받는다.
     조합 사무실은 노트북이고, 집에서는 태블릿으로 보신다.
   ═══════════════════════════════════════════════════════════ */
let HDRAG = null;

function heroDown(e){
  const box = document.getElementById("hdBox"); if(!box) return;
  const t = TN();
  HDRAG = {x:e.clientX, y:e.clientY,
           px:Number(t.home.posx===undefined?50:t.home.posx),
           py:Number(t.home.pos ===undefined?50:t.home.pos),
           w:box.clientWidth, h:box.clientHeight};
  try{ box.setPointerCapture(e.pointerId); }catch(err){}
  box.classList.add("dragging");
  e.preventDefault();
}

function heroMove(e){
  if(!HDRAG) return;
  const t = TN();
  /* ★ 사진을 오른쪽으로 끌면 **왼쪽 자리**가 보여야 한다. 그래서 빼기다.
     반대로 하면 손과 그림이 어긋나 멀미가 난다. */
  const dx = (e.clientX - HDRAG.x) / HDRAG.w * 100;
  const dy = (e.clientY - HDRAG.y) / HDRAG.h * 100;
  t.home.posx = Math.max(0, Math.min(100, HDRAG.px - dx * 1.6));
  t.home.pos  = Math.max(0, Math.min(100, HDRAG.py - dy * 1.6));
  heroPaint();
}

function heroUp(e){
  if(!HDRAG) return;
  HDRAG = null; homeDirty();
  const box = document.getElementById("hdBox");
  if(box) box.classList.remove("dragging");
}

/* 끄는 동안에는 미리보기와 사진만 다시 칠한다.
   render() 를 부르면 끌던 손이 끊긴다. */
/* ═══════════════════════════════════════════════════════════
   ★ 확대 · 축소 (2026-09-17 저녁)
   ───────────────────────────────────────────────────────────
   「좌우 조절이 안 된다」 하셨다. 까닭은 **당길 데가 없어서**다.

   ★ 조감도는 가로가 아주 긴 사진이다. 폰 자리에 맞추면
     **좌우에는 남는 데가 없고** 위아래만 잘린다.
     그래서 좌우로 아무리 밀어도 그림이 안 변한다.

   ★ 크기를 키우면 그때 좌우로도 남는 데가 생긴다.
     폰 사진첩에서 프로필 사진 고를 때와 같다.
       작게(100%)  사진 전체가 들어온다
       크게(250%)  원하는 데만 크게 보인다 → 좌우 끌기가 살아난다
   ═══════════════════════════════════════════════════════════ */
function heroZoom(v){
  const t = TN();
  const now = Number(t.home.zoom === undefined ? 100 : t.home.zoom);
  t.home.zoom = Math.max(100, Math.min(250, Math.round(now + v)));
  homeDirty(); heroPaint();
}
function heroZoomSet(v){
  const t = TN();
  t.home.zoom = Math.max(100, Math.min(250, Math.round(Number(v) || 100)));
  homeDirty(); heroPaint();
}

function heroPaint(){
  const t = TN();
  const x = t.home.posx===undefined?50:t.home.posx;
  const y = t.home.pos ===undefined?50:t.home.pos;
  const zm = t.home.zoom===undefined?100:t.home.zoom;
  const img = document.getElementById("hdImg");
  if(img){
    img.style.objectPosition = `${x}% ${y}%`;
    /* ★ 100% 일 때는 사진 전체가 들어오게(contain), 키우면 채우기(cover).
       그래야 「작게 하면 다 보인다」가 눈에 맞는다. */
    img.style.objectFit = zm <= 100 ? "contain" : "cover";
    img.style.transform = zm <= 100 ? "none" : `scale(${zm/100})`;
  }
  const zb = document.getElementById("hdZoom");
  if(zb) zb.value = zm;
  const zt = document.getElementById("hdZoomT");
  if(zt) zt.textContent = zm + "%";
  const pv = document.getElementById("hmPv");
  if(pv) pv.innerHTML = homePhone(t);
  const lab = document.getElementById("hmPos");
  if(lab) lab.textContent = heroPosText(t);
}

function heroPosMid(){
  const t = TN();
  t.home.pos = 50; t.home.posx = 50; t.home.zoom = 100;
  homeDirty(); render();      /* 막대 자리도 되돌려야 하므로 다시 그린다 */
}

function heroPosText(t){
  const x = Number(t.home.posx === undefined ? 50 : t.home.posx);
  const y = Number(t.home.pos  === undefined ? 50 : t.home.pos);
  const xs = x < 40 ? "왼쪽" : x > 60 ? "오른쪽" : "가운데";
  const ys = y < 40 ? "위쪽" : y > 60 ? "아래쪽" : "가운데";
  return `좌우 ${xs} · 상하 ${ys}`;
}

/* ── 단계 · 일정 ───────────────────────────────────────────
   ★ 2026-09-16 밤 — 홈 화면 안으로 들어갔다.
     따로 쓰던 V.plan 은 홈으로 보내기만 한다.
     예전 주소를 눌러도 빈 화면이 나오지 않게 남겨 둔다. */
V.plan = () => { cur = "home"; return V.home(); };

function planPart(t){
  const p = t.plan;
  return `
  <div class="sec">현재 단계</div>
  <div class="box stagebox">
    ${/* ★ 아홉 칸이라 한 줄에 안 들어간다.
         좌우로 밀어 보시게 하되 **스크롤바는 숨긴다.**
         폰에서는 손가락으로 밀면 그대로 따라온다.
         ★ 고르신 단추는 늘 가운데로 옮겨 드린다.
           「시공사 선정」을 누르셨는데 화면 밖에 있으면 안 된다. */""}
    <div class="stagerow" id="stagerow">
      ${STAGES.map(x=>`<button onclick="setStage('${x}')"
        class="stageb ${t.stage===x?"on":""}">${t.stage===x?"✓ ":""}${x}</button>`).join("")}
    </div>
    ${/* ★ 예전에는 「◀ 옆으로 밀어 보십시오 ▶」가 **그냥 글자**였다.
         화살표처럼 생겼으니 눌러 보시는 것이 당연한데 아무 일이 없다.
         → 누르면 실제로 밀리는 단추로 바꿨다. */""}
    <div class="stagenow">지금 고르신 단계 · <b>${t.stage||"고르지 않음"}</b>
      <span class="stagear">
        <button onclick="stageSlide(-1)" title="왼쪽으로">◀</button>
        <span class="sm">옆으로 밀어 보십시오</span>
        <button onclick="stageSlide(1)" title="오른쪽으로">▶</button>
      </span></div>
  </div>

  <div class="sec">주요 일정</div>
  <div class="box">
    <div class="g3">
      <div class="f"><label>조합설립 인가일</label>
        <input type="date" value="${p.approved}" onchange="planEdit('approved',this.value)"></div>
      <div class="f"><label>이주 시작 예정</label>
        <input type="month" value="${p.move}" onchange="planEdit('move',this.value)"></div>
      <div class="f"><label>입주 목표</label>
        <input type="month" value="${p.moveIn}" onchange="planEdit('moveIn',this.value)"></div>
    </div>
  </div>

  <div class="box" style="margin-top:12px">
    <div class="row"><span>입주까지 남은 기간</span>
      <b>${untilMoveIn(t)||"—"} <span style="font-weight:400;color:var(--muted)">· 자동 계산</span></b></div>
    <div class="row"><span>앱 홈 화면 표시</span>
      <b><button style="color:var(--blue);font-weight:700"
        onclick="TN().home.showPlan=!TN().home.showPlan;homeDirty();render()">
        ${t.home.showPlan?"켜짐":"꺼짐"}</button></b></div>
  </div>

  ${/* ★ 「홈 새 소식 건수」 칸을 걷었다 (2026-09-18).
       「저절로 상위 N건」 방식일 때 쓰던 것이다.
       이제 **직원이 소식 목록에서 체크한 것만** 올라간다.
       건수를 따로 정할 까닭이 없다. */""}

  <div class="warn"><b>일정은 조합이 정하는 것입니다</b>
    <p>신규 입점 때 운영자가 초기값을 넣어 드리되,
       그 뒤 변경은 조합에서 요청을 받아 처리합니다.
       운영자가 임의로 바꾸면 조합원에게 잘못된 일정이 나갑니다.</p></div>`;
}
/* ★ 고르신 단계를 늘 화면 가운데로 옮겨 드린다 (2026-09-16 밤).
   「시공사 선정」을 누르셨는데 그 단추가 화면 밖에 있으면 안 된다.
   ★ 없어도 되는 일이라 try 로 감싼다 (절대규칙 ㉒).
     이것 때문에 화면 그리기가 통째로 멈추면 안 된다. */
/* ★ 화살표로 민다 (2026-09-17).
   단추 두 개쯤 움직인다. 한 칸만 움직이면 답답하다.
   ★ 없어도 되는 일이라 try 로 감싼다 (절대규칙 ㉒). */
function stageSlide(dir){
  try{
    const row = document.getElementById("stagerow");
    if(!row) return;
    row.scrollLeft += dir * Math.max(140, row.clientWidth * 0.6);
  }catch(e){}
}

function stageCenter(){
  try{
    const row = document.getElementById("stagerow");
    if(!row) return;
    const on = row.querySelector(".stageb.on");
    if(!on || row.scrollWidth <= row.clientWidth) return;
    row.scrollLeft = on.offsetLeft - row.clientWidth / 2 + on.offsetWidth / 2;
  }catch(e){ /* 못 옮겨도 미는 데는 지장이 없다 */ }
}

/* ★★★ 2026-09-16 밤 — 저장 단추가 안 살아나던 것 ★★★
   ─────────────────────────────────────────────────────
   단계를 바꾸고 일정을 고쳐도 [변경사항 저장] 이 회색 그대로였다.
   HOME_DIRTY 를 세우는 곳이 homeEdit() 뿐이었는데,
   단계와 일정은 TN() 을 바로 고치고 render() 만 불렀다.

   ★ 화면만 바뀌고 서버에는 아무것도 안 갔다.
     운영자는 「고쳤다」고 여기고 나가신다. 조합원 앱은 그대로다.

   ★ 고친 값을 건드리는 곳마다 homeDirty() 를 부른다. */
function homeDirty(){
  HOME_DIRTY = true;
  if(typeof homeMark !== "undefined") homeMark();
}

function setStage(x){
  TN().stage = x; homeDirty();
  zLog("단계 변경", `${TN().code} · ${x}`); render();
}

/* 일정 칸 — 수정하면 곧바로 더러움 표시를 세운다 */
/* 홈에 올릴 소식 건수를 정한다 (2026-09-18) */

function planEdit(k, v){
  TN().plan[k] = v; homeDirty(); render();
}


/* ══════════ 시세 단지 ══════════ */

/* ══════════════════════════════════════════════════════════
   시세 조회 단지   (2026-08-21)
   ──────────────────────────────────────────────────────────
   ★ 실거래가 API 는 아직 붙이지 않았다.
     국토부 공공데이터포털 인증키가 필요하고, 브라우저에서 직접 부르면
     키가 노출되고 CORS 에 막힌다. Supabase 에 중계 장치를 두어야 한다.
     지금은 값을 손으로 넣는다.

   ★ 출처와 기준일을 반드시 적는다.
     언제 것인지 모르는 시세는 조합원을 오히려 헷갈리게 한다.
   ══════════════════════════════════════════════════════════ */
const MKF = {name:"", year:"", deal:"", ask:"", note:"", edit:null};

function mkKeep(){
  const g=id=>{const e=document.getElementById(id);return e?e.value:null;};
  [["mk-name","name"],["mk-year","year"],["mk-deal","deal"],
   ["mk-ask","ask"],["mk-note","note"]].forEach(([i,k])=>{
    const v=g(i); if(v!==null) MKF[k]=v; });
  const sc=g("mk-src"), at=g("mk-at");
  if(sc!==null) MARKET_SET.src=sc; if(at!==null) MARKET_SET.at=at;
}
function mkClear(){
  Object.assign(MKF,{name:"",year:"",deal:"",ask:"",note:"",edit:null}); render();
}
function mkAdd(){
  mkKeep();
  if(!MKF.name.trim()){ alert("단지 이름을 적어 주십시오."); return; }
  const d=+MKF.deal||0, a=+MKF.ask||0;
  if(!d && !a){ alert("실거래가나 매물가 중 하나는 넣어 주십시오.\n㎡당 만원 단위입니다."); return; }
  if(d && (d < 100 || d > 10000)){
    if(!confirm(`㎡당 ${d}만원은 흔치 않은 값입니다.\n\n`
      + `평당이 아니라 <b>㎡당</b> 만원 단위입니다.\n`
      + `3.3㎡ = 1평이므로 평당 4,000만원이면 ㎡당 1,212만원쯤입니다.\n\n`
      + `그대로 넣으시겠습니까?`.replace(/<[^>]+>/g,""))) return; }
  const rec = {id: MKF.edit || ("MK-" + Date.now().toString(36)),
    name:MKF.name.trim(), year:MKF.year.trim(), deal:d, ask:a, note:MKF.note.trim()};
  const i = MARKET.findIndex(x=>x.id===MKF.edit);
  if(i>=0) MARKET[i]=rec; else MARKET.push(rec);
  marketPut(S.name);
  zLog("시세 단지", `${rec.name} · ㎡당 ${d||a}만원`);
  mkClear();
}
function mkEdit(id){
  const m = MARKET.find(x=>x.id===id); if(!m) return;
  Object.assign(MKF,{name:m.name,year:m.year||"",deal:m.deal||"",
    ask:m.ask||"",note:m.note||"",edit:id});
  render(); scrollTo(0,0);
}
function mkDel(id){
  const m = MARKET.find(x=>x.id===id); if(!m) return;
  if(!confirm(`${m.name}\n\n지우시겠습니까?\n`
    + `이 단지를 고르셨던 조합원 화면에서도 빠집니다.`)) return;
  MARKET = MARKET.filter(x=>x.id!==id);
  MARKET_SET.def = (MARKET_SET.def||[]).filter(x=>x!==id);
  marketPut(S.name); render();
}
function mkDef(id){
  mkKeep();
  const d = MARKET_SET.def || [];
  if(d.includes(id)) MARKET_SET.def = d.filter(x=>x!==id);
  else { if(d.length>=3){ alert("기본은 세 곳까지입니다.\n하나를 빼신 뒤 고르십시오."); return; }
         MARKET_SET.def = d.concat(id); }
  marketPut(S.name); render();
}
function mkSaveSrc(){
  mkKeep(); marketPut(S.name);
  alert(`출처와 기준일을 저장했습니다.\n\n조합원 화면 시세표 아래에 나갑니다.`);
  render();
}

V.market = () => {
  const def = MARKET_SET.def || [];
  return `
  <h2 class="pt">시세 조회 단지</h2>
  <p class="pd">조합원이 우리 구역과 견주어 볼 인근 단지입니다.</p>

  <div class="warn"><b>실거래가는 아직 자동으로 들어오지 않습니다</b>
    <p>국토부 실거래가는 <b>공공데이터포털 인증키</b>가 있어야 하고,
       브라우저에서 바로 부르면 키가 새어 나가고 막힙니다.
       Supabase 에 중계 장치를 두어야 합니다.<br>
       지금은 값을 손으로 넣으시고, <b>출처와 기준일</b>을 꼭 적어 주십시오.
       언제 것인지 모르는 시세는 조합원을 오히려 헷갈리게 합니다.</p></div>

  <div class="g2" style="margin-top:14px">
    <div>
      <div class="sec" style="margin-top:0">${MKF.edit?"수정":"단지 더하기"}</div>
      <div class="box">
        <div class="frow">
          <div class="f grow" style="margin:0"><label>단지 이름</label>
            <input id="mk-name" value="${MKF.name}" placeholder="○○아파트"></div>
          <div class="f mini" style="margin:0"><label>준공</label>
            <input id="mk-year" value="${MKF.year}" placeholder="2019"></div>
        </div>
        <div class="frow" style="margin-top:9px">
          <div class="f mini" style="margin:0"><label>실거래가 · ㎡당 만원</label>
            <input id="mk-deal" value="${MKF.deal}" placeholder="1180"></div>
          <div class="f mini" style="margin:0"><label>매물가 · ㎡당 만원</label>
            <input id="mk-ask" value="${MKF.ask}" placeholder="1250"></div>
        </div>
        <div class="f wide" style="margin-top:9px"><label>덧붙임</label>
          <input id="mk-note" value="${MKF.note}" placeholder="미아사거리역 도보 7분 · 1,024세대"></div>

        <div class="sample" style="margin-top:10px"><b>평당이 아니라 ㎡당입니다</b>
          <p>3.3㎡ = 1평이므로 <b>평당 4,000만원이면 ㎡당 1,212만원</b>쯤입니다.
             단위를 섞으면 조합원 화면 숫자가 세 배로 틀립니다.</p></div>

        <div style="display:flex;gap:9px;margin-top:12px">
          <button class="btn sm" onclick="mkAdd()">${MKF.edit?"수정 후 저장":"더하기"}</button>
          ${MKF.edit?`<button class="btn ghost sm" onclick="mkClear()">취소</button>`:""}
        </div>
      </div>

      <div class="sec">출처 · 기준일</div>
      <div class="box">
        <div class="f wide"><label>출처</label>
          <input id="mk-src" value="${MARKET_SET.src||""}"
            placeholder="국토교통부 실거래가 공개시스템"></div>
        <div class="f wide"><label>기준일</label>
          <input id="mk-at" value="${MARKET_SET.at||""}" placeholder="2026-08-01"></div>
        <button class="btn ghost sm" onclick="mkSaveSrc()">저장</button>
        <p class="note" style="margin-top:7px">조합원 화면 시세표 아래에 그대로 나갑니다.</p>
      </div>
    </div>

    <div>
      <div class="sec" style="margin-top:0">등록한 단지 <em>${MARKET.length}곳</em>
        <span style="font-size:.74rem;color:var(--muted);font-weight:400">
          · 기본 ${def.length}/3</span></div>

      ${MARKET.length<3?`<div class="warn"><b>세 곳 이상 등록해 주십시오</b>
        <p>조합원이 이 안에서 고릅니다. 한두 곳만 있으면 고를 것이 없습니다.</p></div>`:""}

      <div class="box" style="padding:0;overflow:hidden;margin-top:9px">
        <table><thead><tr>
          <th>단지</th><th style="width:60px">준공</th>
          <th style="width:88px;text-align:right">실거래</th>
          <th style="width:88px;text-align:right">매물</th>
          <th style="width:150px"></th>
        </tr></thead><tbody>
        ${MARKET.map(m=>{ const isDef = def.includes(m.id);
          return `<tr ${isDef?'style="background:#F0F5FB"':''}>
          <td><b style="font-weight:400">${m.name}</b>
            ${isDef?`<span class="pill p-blue" style="margin-left:5px">기본</span>`:""}
            ${m.note?`<span style="display:block;font-size:.72rem;color:var(--muted)">
              ${m.note}</span>`:""}</td>
          <td class="mono" style="color:var(--muted)">${m.year||"—"}</td>
          <td class="mono" style="text-align:right">${m.deal?(+m.deal).toLocaleString():"—"}</td>
          <td class="mono" style="text-align:right">${m.ask?(+m.ask).toLocaleString():"—"}</td>
          <td><div style="display:flex;gap:5px;flex-wrap:wrap">
            <button class="btn ghost sm" style="padding:4px 9px;font-size:.72rem"
              onclick="mkDef('${m.id}')">${isDef?"기본 해제":"기본으로"}</button>
            <button class="btn ghost sm" style="padding:4px 9px;font-size:.72rem"
              onclick="mkEdit('${m.id}')">수정</button>
            <button class="btn ghost sm" style="padding:4px 9px;font-size:.72rem;
              border-color:#E9B4B4;color:var(--red)" onclick="mkDel('${m.id}')">삭제</button>
          </div></td>
        </tr>`;}).join("")}
        ${!MARKET.length?`<tr><td colspan="5" style="text-align:center;color:var(--muted);
          padding:20px">아직 등록한 단지가 없습니다</td></tr>`:""}
        </tbody></table>
      </div>

      <p class="note"><b>기본</b>으로 정하신 세 곳이 조합원 화면에 처음부터 나옵니다.
        조합원은 <b>비교 단지 변경</b>에서 이 목록 안의 다른 곳으로 바꿀 수 있고,
        바꾼 것은 그분 폰에만 담깁니다.</p>

      <div class="sample" style="margin-top:10px"><b>시세와 권리가액은 다른 것입니다</b>
        <p>조합원 화면에 그렇게 적어 두었습니다. 시세가 높아도 권리가액은
           감정평가로 따로 정해집니다. 이걸 분명히 하지 않으면 나중에
           <b>"시세대로 안 쳐줬다"</b>는 말이 나옵니다.</p></div>
    </div>
  </div>`;
};


/* ══════════ 서버에서 불러오기 ══════════ */
/* ★ 한 번만 받아온다. 20초마다 살펴보지 않는다.
     치고 계신 중에 서버 값이 덮어쓰면 글자가 날아간다.
   ★ HOME_DIRTY 일 때는 다시 그리지 않는다.
     고치던 것이 화면에서 사라지면 안 된다. */
async function homePullAll(){
  if(typeof hubPull === "undefined") return;
  let changed = false;
  for(const t of TENANTS){
    const v = await hubPull("tenant_home", null, t.code);
    if(!v) continue;
    if(v.name)  t.name  = v.name;
    if(v.short) t.short = v.short;
    if(v.addr)  t.addr  = v.addr;
    if(v.stage) t.stage = v.stage;
    if(v.hero)  t.home.hero = v.hero;
    t.home.img = v.img || "";
    t.home.src = v.src || "";
    if(v.spec) t.home.spec = v.spec;
    if(v.calc) t.calc = v.calc;
    if(v.pos  !== undefined) t.home.pos  = v.pos;
    if(v.posx !== undefined) t.home.posx = v.posx;
    if(v.zoom !== undefined) t.home.zoom = v.zoom;
    if(typeof v.showPlan === "boolean") t.home.showPlan = v.showPlan;
    if(v.plan){
      if(v.plan.approved) t.plan.approved = v.plan.approved;
      if(v.plan.move)     t.plan.move     = v.plan.move;
      if(v.plan.moveIn)   t.plan.moveIn   = v.plan.moveIn;
    }
    changed = true;
  }
  if(changed && !HOME_DIRTY) render();
}


/* ═══════════════════════════════════════════════════════════
   홈 화면 세 덩이 채우기   (2026-09-17 밤)
   ───────────────────────────────────────────────────────────
   우리 구역 한눈에 · 이번 고시 변경 · 궁금한 것

   ★ 흐린 예시(HB_SAMPLE)를 placeholder 로 깔아 둔다.
     빈 칸만 있으면 무엇을 넣는 자리인지 모르신다.
     예시는 **조합원 화면에 안 나간다.** 채우셔야 나간다.

   ★ 덩이마다 켜고 끄는 단추. 끄면 조합원 홈에서 통째로 사라진다.
     빈 칸이 남으면 「조합이 일을 안 한다」로 보인다.

   ★ 고친 것은 곧바로 오른쪽 폰 미리보기에 뜬다.
   ═══════════════════════════════════════════════════════════ */

/* 예시에서 흐린 글씨를 꺼내 온다 */
function hbPh(kind, i, key){
  try{
    const r = HB_SAMPLE[kind][i];
    return r ? String(r[key] || "") : "";
  }catch(e){ return ""; }
}

/* 값을 담고 미리보기만 다시 칠한다 */
function hbSet(kind, i, key, v){
  hbInit();
  const rows = HB[kind].rows;
  while(rows.length <= i) rows.push({});
  rows[i][key] = v;
  homeDirty(); hbPaint();
}
function hbOn(kind){
  hbInit();
  HB[kind].on = !HB[kind].on;
  homeDirty(); render();
}
function hbAdd(kind){
  hbInit();
  HB[kind].rows.push({});
  homeDirty(); render();
}
function hbDel(kind, i){
  hbInit();
  const r = HB[kind].rows[i];
  const name = (r && (r.t || r.q || r.name)) || "";
  if(name && !confirm(`「${name}」 줄을 지웁니다.\n\n계속하시겠습니까?`)) return;
  HB[kind].rows.splice(i, 1);
  homeDirty(); render();
}
function hbUp(kind, i){
  hbInit();
  if(i <= 0) return;
  const rows = HB[kind].rows;
  [rows[i-1], rows[i]] = [rows[i], rows[i-1]];
  homeDirty(); render();
}

/* 답 줄 (궁금한 것 안쪽) */
function hbRowSet(i, j, key, v){
  hbInit();
  const q = HB.faq.rows[i]; if(!q) return;
  if(!q.rows) q.rows = [];
  while(q.rows.length <= j) q.rows.push({});
  q.rows[j][key] = v;
  homeDirty(); hbPaint();
}
function hbRowAdd(i){
  hbInit();
  const q = HB.faq.rows[i]; if(!q) return;
  if(!q.rows) q.rows = [];
  q.rows.push({}); homeDirty(); render();
}
function hbRowDel(i, j){
  hbInit();
  const q = HB.faq.rows[i];
  if(!q || !q.rows) return;
  q.rows.splice(j, 1); homeDirty(); render();
}

/* 미리보기만 다시 칠한다. render() 를 부르면 치던 칸에서 커서가 튄다. */
function hbPaint(){
  try{
    const pv = document.getElementById("hmPv");
    if(pv) pv.innerHTML = homePhone(TN());
  }catch(e){}
}

/* ── 화면 ────────────────────────────────────────────────── */
function hbToggle(kind, label){
  hbInit();
  const on = HB[kind].on !== false;
  return `<div class="hbhd">
    <span class="hbt">${label}</span>
    <button class="hbsw ${on?"on":""}" onclick="hbOn('${kind}')"
      title="${on?"끄기":"켜기"}"><i></i></button>
    <span class="hbst ${on?"on":""}">${on?"켜짐":"꺼짐"}</span>
  </div>`;
}

/* ★ 예시를 그대로 채워 넣는다 (2026-09-17 밤).
   미아2는 이미 쓰던 값이 있어 다시 치실 까닭이 없다.
   다른 조합도 **모양을 보고 고치는 편**이 빈 칸부터 채우기보다 쉽다.
   ★ 채운 뒤에는 자유롭게 고치고 지우실 수 있다. */
function hbFill(kind){
  hbInit();
  const has = (HB[kind].rows || []).some(r => !hbEmpty(r));
  if(has && !confirm("이미 넣으신 것이 있습니다.\n\n"
    + "예시로 **덮어씁니다.** 계속하시겠습니까?")) return;
  HB[kind].rows = JSON.parse(JSON.stringify(HB_SAMPLE[kind] || []));
  HB[kind].on = true;
  homeDirty(); render();
}

function hbPart(t){
  hbInit();
  return `
  <div class="sec">홈 화면 아래 세 덩이</div>
  <div class="warn" style="margin-bottom:12px">
    <b>흐린 글씨는 예시입니다</b>
    <p>칸에 흐리게 보이는 글자는 <b>미아2구역의 예시</b>입니다.
      그대로 두시면 <b>조합원 화면에 안 나갑니다.</b> 채우셔야 나갑니다.<br>
      ★ 덩이마다 <b>켜고 끄실 수 있습니다.</b> 끄면 조합원 홈에서
      그 덩이가 통째로 사라집니다. 빈 칸이 남지 않습니다.<br>
      ★ 수정하시면 <b>오른쪽 폰</b>에 바로 나타납니다.</p>
  </div>
  ${hbKpiPart(t)}
  ${hbChgPart()}
  ${hbFaqPart()}`;
}

/* ① 우리 구역 한눈에 */
function hbKpiPart(t){
  const on = HB.kpi.on !== false;
  const rows = HB.kpi.rows;
  while(rows.length < 3) rows.push({});
  return `
  <div class="sec">우리 구역 한눈에</div>
  <div class="box hbbox">
    ${hbToggle("kpi","숫자 카드 3칸 · 조합원 홈 가운데")}
    ${on?`
    <div class="g3" style="margin-top:10px">
      ${[0,1,2].map(i=>`
      <div class="hbcard">
        <div class="f"><label>이름</label>
          <input value="${rows[i].name||""}" placeholder="${hbPh("kpi",i,"name")}"
            oninput="hbSet('kpi',${i},'name',this.value)"></div>
        <div class="hbrow2">
          <div class="f"><label>값</label>
            <input value="${rows[i].val||""}" placeholder="${hbPh("kpi",i,"val")}"
              oninput="hbSet('kpi',${i},'val',this.value)"></div>
          <div class="f w60"><label>단위</label>
            <input value="${rows[i].unit||""}" placeholder="${hbPh("kpi",i,"unit")}"
              oninput="hbSet('kpi',${i},'unit',this.value)"></div>
        </div>
        <div class="f"><label>변동 <span class="sm">없어도 됩니다</span></label>
          <input value="${rows[i].diff||""}" placeholder="${hbPh("kpi",i,"diff")}"
            oninput="hbSet('kpi',${i},'diff',this.value)"></div>
      </div>`).join("")}
    </div>
    <button class="hbplus sm" onclick="hbFill('kpi')"
      style="color:var(--muted)">예시(미아2)를 그대로 채워 넣기</button>
    <p class="hint" style="margin-top:9px">
      ★ 변동은 「▲ 484」처럼 적으십시오. 비워 두셔도 됩니다.</p>`
    :`<p class="hint" style="margin-top:9px">꺼져 있습니다.
      조합원 홈에서 이 덩이가 <b>통째로 안 보입니다.</b></p>`}
  </div>`;
}

/* ② 이번 고시 변경 */
function hbChgPart(){
  const on = HB.chg.on !== false;
  const rows = HB.chg.rows;
  return `
  <div class="sec">이번 고시 변경</div>
  <div class="box hbbox">
    ${hbToggle("chg","좌우로 넘기는 카드 · 고시가 바뀐 구역만")}
    ${on?`
    ${rows.length?rows.map((r,i)=>`
    <div class="hbline">
      <span class="hbno">${i+1}</span>
      <div class="hbgrid">
        <div class="f"><label>항목</label>
          <input value="${r.t||""}" placeholder="${hbPh("chg",i,"t")}"
            oninput="hbSet('chg',${i},'t',this.value)"></div>
        <div class="f w90"><label>전</label>
          <input value="${r.b||""}" placeholder="${hbPh("chg",i,"b")}"
            oninput="hbSet('chg',${i},'b',this.value)"></div>
        <div class="f w90"><label>후</label>
          <input value="${r.a||""}" placeholder="${hbPh("chg",i,"a")}"
            oninput="hbSet('chg',${i},'a',this.value)"></div>
        <div class="f w60"><label>단위</label>
          <input value="${r.u||""}" placeholder="${hbPh("chg",i,"u")}"
            oninput="hbSet('chg',${i},'u',this.value)"></div>
        <div class="f"><label>딱지</label>
          <input value="${r.d||""}" placeholder="${hbPh("chg",i,"d")}"
            oninput="hbSet('chg',${i},'d',this.value)"></div>
        <div class="f w60"><label>쪽수</label>
          <input value="${r.p||""}" placeholder="${hbPh("chg",i,"p")}"
            oninput="hbSet('chg',${i},'p',this.value)"></div>
      </div>
      <div class="hbact">
        ${i?`<button onclick="hbUp('chg',${i})" title="위로">▲</button>`:""}
        <button class="del" onclick="hbDel('chg',${i})" title="삭제">✕</button>
      </div>
    </div>`).join(""):`<p class="hint" style="margin-top:9px">아직 없습니다.</p>`}
    <button class="hbplus" onclick="hbAdd('chg')">＋ 한 줄 더하기</button>
    <button class="hbplus sm" onclick="hbFill('chg')"
      style="color:var(--muted)">예시(미아2)를 그대로 채워 넣기</button>
    <p class="hint" style="margin-top:8px">
      ★ <b>변동이 큰 것부터</b> 넣으십시오. 조합원이 왼쪽부터 보십니다.<br>
      ★ 쪽수는 고시문 몇 쪽인지입니다. 조합원이 <b>스스로 확인</b>하실 수 있습니다.</p>`
    :`<p class="hint" style="margin-top:9px">꺼져 있습니다.
      고시 변경이 없는 구역은 꺼 두시면 됩니다.</p>`}
  </div>`;
}

/* ③ 궁금한 것 */
const HB_ICON = [["ratio","％ 용적률"],["my","🏠 임대·내 집"],["home","🏢 평형"],
                 ["park","🌳 공원·학교"],["news","📄 그 밖"]];
/* ★★ 보일 개수 · 번호 · 대기 (2026-09-20 · 116절)
   ───────────────────────────────────────────────────────
   번호 칸에서 고르면 **그 자리로 옮기고** 나머지는 한 칸씩 밀린다(바꾸기 아님).
   보일 개수를 넘는 줄은 지우지 않고 「대기」로 흐리게 남는다.
   ★ 대기인지는 hbFaq() 와 **같은 규칙**으로 센다 — 빈 줄은 빼고 앞에서부터. */
function hbFaqWait(){
  const rows = HB.faq.rows || [], max = hbFaqMax(), w = {};
  let k = 0;
  rows.forEach((r,i) => { if(!hbEmpty(r) && String(r.q||"").trim()){ if(k >= max) w[i] = true; k++; } });
  return w;
}
function hbFaqTo(i, v){
  hbInit();
  const rows = HB.faq.rows, j = Math.max(0, Math.min(rows.length - 1, (+v || 1) - 1));
  if(i === j) return;
  rows.splice(j, 0, rows.splice(i, 1)[0]);
  homeDirty(); render();
}
function hbDown(kind, i){
  hbInit();
  const rows = HB[kind].rows;
  if(i >= rows.length - 1) return;
  [rows[i+1], rows[i]] = [rows[i], rows[i+1]];
  homeDirty(); render();
}
function hbFaqMaxSet(v){
  hbInit();
  HB.faq.max = Math.min(10, Math.max(5, +v || HB_FAQ_MAX));
  homeDirty(); render();
}
function hbNoSel(i, n){
  return `<select class="hbnosel" onchange="hbFaqTo(${i}, this.value)" title="몇 번째에 둘까요">
    ${Array.from({length:n}, (_,k) => `<option value="${k+1}" ${k===i?"selected":""}>${k+1}</option>`).join("")}
  </select>`;
}
function hbFaqPart(){
  const on = HB.faq.on !== false;
  const rows = HB.faq.rows;
  const W = hbFaqWait();
  const firstW = Object.keys(W).map(Number).sort((a,b)=>a-b)[0];
  const wtag = i => W[i] ? `<span class="hbwtag">대기 · 홈에 안 보임</span>` : "";
  const wcls = i => W[i] ? ` hbwait${i===firstW?" first":""}` : "";
  return `
  <div class="sec">궁금한 것</div>
  <div class="box hbbox">
    ${hbToggle("faq","조합원이 누르면 답이 펼쳐집니다")}
    ${on?`
    <div class="hbmax">
      <b>홈에 보일 개수</b>
      <select onchange="hbFaqMaxSet(this.value)">
        ${[5,6,7,8,9,10].map(n=>`<option value="${n}" ${hbFaqMax()===n?"selected":""}>${n}개</option>`).join("")}
      </select>
      <span class="hint" style="margin:0">5~10개 · 넘는 것은 지우지 않고 <b>대기</b>로 남습니다
        · 번호를 고르면 그 자리로 옮깁니다</span>
    </div>
    ${rows.length?rows.map((q,i)=>
      /* ★★★ 2026-09-20 — 자료에서 올린 줄은 여기서 못 고친다 ★★★
         ─────────────────────────────────────────────────────
         [★ 홈] 으로 올리신 줄은 **링크만** 걸린 것이다.
         질문과 답은 그 자료 안에 있다.

         ★ 여기서 고칠 수 있게 하면 **두 군데가 달라진다.**
           자료실 답은 그대로인데 홈만 바뀌어
           조합원이 **다른 답을 두 곳에서** 보신다.

         ★ 그래서 차례 바꾸기와 내리기만 둔다.
           고치시려면 자료실로 가시라고 적어 둔다. */
      q.docId ? `
    <div class="hbq hbdoc${wcls(i)}">
      <div class="hbline" style="border:0;padding:0">
        ${hbNoSel(i, rows.length)}
        <div class="hbgrid">
          <div class="f wide" style="margin:0">
            <label>자료에서 올린 것 <span class="sm">자료실에서 수정하십시오</span>${wtag(i)}</label>
            <div class="hbdv">${q.q||""}</div>
            <p class="hint" style="margin:4px 0 0">${q.sub||""}</p>
          </div>
        </div>
        <div class="hbact">
          ${i?`<button onclick="hbUp('faq',${i})" title="위로">▲</button>`:""}
          ${i<rows.length-1?`<button onclick="hbDown('faq',${i})" title="아래로">▼</button>`:""}
          <button class="del" onclick="hbDel('faq',${i})" title="홈에서 내립니다">✕</button>
        </div>
      </div>
    </div>` : `
    <div class="hbq${wcls(i)}">
      <div class="hbline" style="border:0;padding:0">
        ${hbNoSel(i, rows.length)}
        <div class="hbgrid">
          <div class="f wide"><label>질문${wtag(i)}</label>
            <input value="${q.q||""}" placeholder="${hbPh("faq",i,"q")}"
              oninput="hbSet('faq',${i},'q',this.value)"></div>
          <div class="f wide"><label>한 줄 설명</label>
            <input value="${q.sub||""}" placeholder="${hbPh("faq",i,"sub")}"
              oninput="hbSet('faq',${i},'sub',this.value)"></div>
          <div class="f w90"><label>딱지</label>
            <input value="${q.badge||""}" placeholder="답 4개"
              oninput="hbSet('faq',${i},'badge',this.value)"></div>
          <div class="f w110"><label>그림</label>
            <select onchange="hbSet('faq',${i},'icon',this.value)">
              ${HB_ICON.map(([k,l])=>`<option value="${k}"
                ${(q.icon||"news")===k?"selected":""}>${l}</option>`).join("")}
            </select></div>
        </div>
        <div class="hbact">
          ${i?`<button onclick="hbUp('faq',${i})" title="위로">▲</button>`:""}
          ${i<rows.length-1?`<button onclick="hbDown('faq',${i})" title="아래로">▼</button>`:""}
          <button class="del" onclick="hbDel('faq',${i})" title="삭제">✕</button>
        </div>
      </div>

      <div class="hbans">
        <div class="hbat">답 — 숫자로 견주기</div>
        ${(q.rows||[]).map((r,j)=>`
        <div class="hbline" style="border:0;padding:5px 0">
          <div class="hbgrid">
            <div class="f"><label>이름</label>
              <input value="${r.t||""}" placeholder="상한용적률"
                oninput="hbRowSet(${i},${j},'t',this.value)"></div>
            <div class="f w90"><label>전</label>
              <input value="${r.b||""}" placeholder="260.9"
                oninput="hbRowSet(${i},${j},'b',this.value)"></div>
            <div class="f w90"><label>후</label>
              <input value="${r.a||""}" placeholder="286.5"
                oninput="hbRowSet(${i},${j},'a',this.value)"></div>
            <div class="f w60"><label>단위</label>
              <input value="${r.u||""}" placeholder="%"
                oninput="hbRowSet(${i},${j},'u',this.value)"></div>
            <div class="f w60"><label>쪽수</label>
              <input value="${r.p||""}" placeholder="245"
                oninput="hbRowSet(${i},${j},'p',this.value)"></div>
            <div class="f wide"><label>설명 <span class="sm">없어도 됩니다</span></label>
              <input value="${r.note||""}" placeholder="변경 후 286.5% 이하"
                oninput="hbRowSet(${i},${j},'note',this.value)"></div>
          </div>
          <div class="hbact">
            <button class="del" onclick="hbRowDel(${i},${j})" title="삭제">✕</button>
          </div>
        </div>`).join("")}
        <button class="hbplus sm" onclick="hbRowAdd(${i})">＋ 답 한 줄 더하기</button>

        <div class="hbat" style="margin-top:11px">답 — 글로 쓰기</div>
        <textarea class="hbta" rows="4" placeholder="${hbPh("faq",i,"body").replace(/"/g,"&quot;")}"
          oninput="hbSet('faq',${i},'body',this.value)">${q.body||""}</textarea>
        <p class="hint" style="margin-top:6px">
          ★ 숫자 줄과 글을 <b>함께</b> 넣으셔도 됩니다. 숫자 먼저, 글이 아래에 나옵니다.</p>
      </div>
    </div>`).join(""):`<p class="hint" style="margin-top:9px">아직 없습니다.</p>`}
    ${(rows||[]).some(q=>q.docId)?`<p class="hint" style="margin-top:8px">
      ★ <b>자료에서 올린 것</b>은 여기서 못 고칩니다.
      <b>자료 등록 → 그 자료 → 질문 생성</b>에서 수정하시면 홈도 따라 바뀝니다.</p>`:""}
    <button class="hbplus" onclick="hbAdd('faq')">＋ 질문 더하기</button>
    <button class="hbplus sm" onclick="hbFill('faq')"
      style="color:var(--muted)">예시(미아2)를 그대로 채워 넣기</button>
    <p class="hint" style="margin-top:8px">
      ★ 조합원이 가장 많이 묻는 것부터 넣으십시오.<br>
      ★ 하나도 없으면 조합원 홈에서 「궁금한 것」 칸이 통째로 숨습니다.</p>`
    :`<p class="hint" style="margin-top:9px">꺼져 있습니다.
      조합원 홈에 「궁금한 것」 칸이 안 보입니다.</p>`}
  </div>`;
}


/* ═══════════════════════════════════════════════════════════
   우리집 — 셋을 하나로   (2026-09-17)
   ───────────────────────────────────────────────────────────
   시세 단지 · 비교 아파트 · 지분 실거래가 왼쪽 메뉴에 따로 있었다.

   ★ 조합원 앱에서는 이 셋이 **「우리집」 탭 하나**다.
     직원 화면도 같은 이름으로 묶는다.
     어디를 고치면 어디가 바뀌는지 헷갈리지 않는다.

   ★★★ 「인근 시세」는 둘을 합친 것이다 ★★★
     시세 단지(MARKET)   조합이 손으로 넣는 단지별 시세
     비교 아파트(APTS)   국토부에서 받아 오는 실거래

     조합원에게는 **같은 것**이다. 「우리 평형 시세 비교」 한 화면에
     둘이 함께 쓰인다. 직원 화면에서만 둘로 갈려 있었다.

   ★ 화면 코드는 그대로 두고 **딱지로 넘긴다.**
     V.market · V.apt · V.deal 을 지우지 않는다.
     한꺼번에 뜯어고치면 어디서 깨졌는지 못 찾는다.
   ═══════════════════════════════════════════════════════════ */
const MH_TABS = [
  ["calc",  "분담금",       "조합원이 계산에 쓰는 기준값"],
  ["deal",  "지분 실거래가", "우리 구역 안에서 팔린 값 · 국토부 자동"],
  ["apt",   "인근 시세",     "견줄 아파트 단지 · 시세 단지 + 비교 아파트"]
];
let MH = {tab:"calc"};

function mhGo(k){ MH.tab = k; render(); }

V.myhome = () => {
  const t = TN();
  return `
  <h2 class="pt">우리집</h2>
  <p class="pd"><b class="mono" style="color:var(--navy)">${t.code}</b> ·
    조합원 앱 <b>우리집</b> 탭에 나가는 것들</p>

  <div class="mhtabs">
    ${MH_TABS.map(([k,l,d])=>`
    <button class="mhb ${MH.tab===k?"on":""}" onclick="mhGo('${k}')">
      <b>${l}</b><em>${d}</em></button>`).join("")}
  </div>

  ${/* ★ 분담금 탭만 두 칸이다 (2026-09-17).
       오른쪽에 폰을 붙여 「이렇게 나갑니다」를 보여 드린다.

       ★ 지분 실거래 · 인근 시세는 두 칸으로 안 나눈다.
         표가 넓어 오른쪽에 폰을 두면 표가 찌그러진다.
         그 둘은 화면 자체가 이미 목록 미리보기 노릇을 한다. */""}
  ${MH.tab === "calc"
    ? `<div class="ztwo rev">
         <div class="col tight">${mhCalc(t)}</div>
         <div class="col">
           <div class="sec" style="margin-top:0">폰 미리보기</div>
           <div id="mhPv">${mhPhone(t)}</div>
         </div>
       </div>`
  : MH.tab === "deal" ? V.deal()
  : mhApt()}`;
};

/* ── ① 분담금 — 조합이 정하는 기준값만 ──────────────────────
   ★ 조합원 한 사람 한 사람의 금액이 아니다.
     개인 값은 **명부와 감정평가 자료**에서 나온다.
     여기는 **모두에게 같은 값**만 넣는다.

   ★ 비워 두면 조합원 화면에 「대기」로 나간다.
     아직 정해지지 않았으면 **비워 두시는 것이 맞다.**
     억지로 채우면 조합원이 그 숫자로 분담금을 셈해 보신다. */
function mhCalc(t){
  const c = (t.calc = t.calc || {});
  const ph = {ratio:"100", rdate:"2026-12-00", p39:"", p49:"", p59:"", p84:"", p99:""};
  const f = (k, label, unit, hint) => `
    <div class="f"><label>${label}${unit?` <span class="sm">${unit}</span>`:""}</label>
      <input value="${c[k]||""}" placeholder="${ph[k]||""}"
        oninput="mhSet('${k}',this.value)">
      ${hint?`<p class="hint" style="margin-top:4px">${hint}</p>`:""}</div>`;

  return `
  <div class="sec">비례율</div>
  <div class="box">
    <div class="g3">
      ${f("ratio","비례율","%","총회에서 정해집니다")}
      ${f("rdate","확정일","","아직이면 비워 두십시오")}
    </div>
    <p class="hint" style="margin-top:9px">
      ★ 조합원 화면의 <b>④ 비례율</b> 칸에 <b>처음 값</b>으로 들어갑니다.
      조합원은 그 값을 바꿔 가며 계산해 보실 수 있습니다.</p>
  </div>

  <div class="sec">조합원 분양가 <span class="zlock">평형별</span></div>
  <div class="box">
    <div class="g3">
      ${f("p39","39㎡","만원","")}
      ${f("p49","49㎡","만원","")}
      ${f("p59","59㎡","만원","")}
    </div>
    <div class="g3" style="margin-top:9px">
      ${f("p84","84㎡","만원","")}
      ${f("p99","85㎡ 초과","만원","")}
      <div></div>
    </div>
    <p class="hint" style="margin-top:9px">
      ★ 조합원이 <b>⑥ 희망 평형</b>을 고르면 그 값이
      <b>⑦ 조합원 예상 분양가</b>에 들어갑니다.<br>
      ★ <b>평당이 아니라 만원 단위 총액</b>입니다. 84㎡ 6억이면 <b>60000</b>.</p>
  </div>

  <div class="warn">
    <b>아직 정해지지 않았으면 비워 두십시오</b>
    <p>비운 칸은 조합원 화면에 <b>「대기」</b>로 나갑니다.
      지금 그렇게 나가고 있고, 그것이 맞습니다.<br>
      ★ 억지로 채우시면 조합원이 <b>그 숫자로 분담금을 셈해</b> 보십니다.
      나중에 달라지면 「조합이 속였다」가 됩니다.<br>
      ★ 개인별 금액은 여기서 넣는 것이 아닙니다.
      <b>명부와 감정평가 자료</b>에서 나옵니다.</p>
  </div>`;
}

function mhSet(k, v){
  const t = TN();
  t.calc = t.calc || {};
  t.calc[k] = v;
  homeDirty();
  /* ★ 미리보기만 다시 칠한다. render() 를 부르면 치던 칸에서 커서가 튄다. */
  try{
    const pv = document.getElementById("mhPv");
    if(pv) pv.innerHTML = mhPhone(t);
  }catch(e){}
}

/* ── ③ 인근 시세 — 시세 단지 + 비교 아파트 ──────────────────
   ★ 조합원에게는 **같은 것**이다. 「우리 평형 시세 비교」 한 화면에
     둘이 함께 쓰인다. 직원 화면에서만 둘로 갈려 있었다.
   ★ 위아래로 잇는다. 손으로 넣는 것이 먼저, 받아 오는 것이 아래다. */
function mhApt(){
  return `
  <div class="warn" style="margin-bottom:14px">
    <b>둘을 한 화면에 모았습니다</b>
    <p><b>시세 단지</b>는 조합이 손으로 넣는 것이고,
      <b>비교 아파트</b>는 국토교통부에서 받아 오는 것입니다.<br>
      조합원 화면에서는 <b>「우리 평형 시세 비교」 한 자리</b>에 함께 나갑니다.</p>
  </div>
  ${V.market()}
  <div style="height:26px"></div>
  ${V.apt()}`;
}


/* ═══════════════════════════════════════════════════════════
   우리집 폰 미리보기   (2026-09-17)
   ───────────────────────────────────────────────────────────
   ★ 홈 화면에는 폰이 붙어 있는데 우리집에는 없었다.
     조합원이 어떻게 보실지 모르고 숫자를 넣게 된다.

   ★ 조합원 화면(calcView)의 **여덟 줄을 줄여** 그린다.
     ③ ⑤ ⑦ ⑧ 은 조합원이 넣는 값이라 여기서는 비어 있다.
     직원이 넣는 것은 **④ 비례율**과 **⑦ 분양가**뿐이다.

   ★ 넣은 값은 **초록 상자**로 나간다. 조합원이 「조합이 알린 값」과
     「내가 넣은 값」을 한눈에 가릴 수 있어야 한다.
   ═══════════════════════════════════════════════════════════ */
function mhPhone(t){
  const c = t.calc || {};
  const ps = [["p39","39㎡"],["p49","49㎡"],["p59","59㎡"],
              ["p84","84㎡"],["p99","85㎡ 초과"]].filter(([k])=>String(c[k]||"").trim());
  const n = v => (v===""||v===undefined||isNaN(Number(v)))
    ? "—" : Number(v).toLocaleString("ko-KR");

  return `
  <div class="pv">
    <div class="pvtabs"><span class="on">내 재산 · 분담금</span>
      <span>지분 실거래</span><span>인근 시세</span></div>

    <div class="pvbody">
      <div class="pvt">내 분담금 계산해 보기</div>

      <div class="pvr lock"><span class="pvn">1</span>내 소유 물건
        <em>본인확인 후</em></div>
      <div class="pvr lock"><span class="pvn">2</span>종전자산 평가금액
        <em>감정평가 전</em></div>
      <div class="pvr in"><span class="pvn">3</span>예상 감정가액
        <em>조합원이 넣음</em></div>

      <div class="pvr ${c.ratio?"org":"in"}"><span class="pvn">4</span>비례율
        ${c.ratio?`<b>${c.ratio}%</b>`:`<em>조합원이 넣음</em>`}</div>
      ${c.ratio?`<div class="pvgreen">조합이 정한 값 · <b>${c.ratio}%</b>${
        c.rdate?` (${c.rdate} 확정)`:""}</div>`:""}

      <div class="pvr auto"><span class="pvn">5</span>내 권리가액
        <em>③ × ④ 자동</em></div>
      <div class="pvr in"><span class="pvn">6</span>희망 평형
        <em>조합원이 고름</em></div>

      <div class="pvr ${ps.length?"org":"in"}"><span class="pvn">7</span>조합원 예상 분양가
        ${ps.length?`<b>${ps.length}개 평형</b>`:`<em>조합원이 넣음</em>`}</div>
      ${ps.length?`<div class="pvgreen">
        ${ps.map(([k,l])=>`<span>${l} <b>${n(c[k])}</b>만원</span>`).join("")}
        <i>평형을 고르면 [이 값 쓰기] 단추가 뜹니다</i></div>`:""}

      <div class="pvfin"><span class="pvn">8</span>분담금
        <em>⑦ − ⑤ 자동</em></div>
    </div>
  </div>
  <p class="pvcap">조합원이 <b>우리집</b>을 열면 보는 화면입니다</p>
  ${!c.ratio && !ps.length ? `<div class="warn" style="margin-top:12px">
    <b>아직 아무것도 안 넣으셨습니다</b>
    <p>조합원 화면의 ④ 와 ⑦ 이 <b>빈 칸</b>으로 나갑니다.
      조합원이 스스로 넣어 계산해 보실 수는 있습니다.<br>
      ★ 총회에서 비례율이 정해지면 그때 넣으시면 됩니다.</p></div>` : ""}`;
}
