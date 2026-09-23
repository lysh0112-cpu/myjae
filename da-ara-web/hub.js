/* ═══════════════════════════════════════════════════════════
   다알아 (Da-Ara) — 화면 사이 자료 잇기
   ───────────────────────────────────────────────────────────
   ★ 직원 화면에서 올린 소식이 조합원 폰에도 나와야 한다.

     브라우저 저장소만 쓰면 그 기기 안에서만 통한다.
     컴퓨터에서 올린 것이 폰에 가지 않는다.
     조합원 앱은 폰에서 보는 것이 전부라, 그러면 아무 의미가 없다.

     그래서 서버(Supabase)에 담는다.
     어느 기기에서 열어도 같은 것을 본다.

   ★ 저장소는 화면을 빨리 띄우기 위한 임시 보관으로만 쓴다.
       ① 화면 열림 → 저장소에 있던 것으로 곧바로 그린다
       ② 서버에서 받아온다 → 다르면 다시 그린다
     이렇게 하면 서버가 느려도 화면이 비어 보이지 않는다.

   ★ 여기 담는 것은 어차피 공개되는 자료뿐이다.
     소식 · 총회 안건 · 설문처럼 조합원 누구나 보는 것.
     명부와 감정평가는 절대 담지 않는다.
     그 둘은 조합장 결재를 거쳐야 열리는 자료다.

   ★ 나중에 Supabase Auth 를 붙이면
     아래 KEY 를 지우고 로그인 토큰을 쓰면 된다.
     화면 코드는 손대지 않는다. 그래서 이 파일 하나로 몰아 두었다.

   ★★★ app_state 는 public 스키마에 있다. daara 가 아니다 ★★★

     아래 fetch 들은 Accept-Profile · Content-Profile 헤더를 붙이지
     않는다. 그래서 PostgREST 는 public 스키마만 쳐다본다.

     운영 자료(fact · chunk · notice · audit_log)는 daara 에 있고
     app_state 만 public 에 있다. 섞으면 안 된다.

     누군가 app_state 를 daara 로 옮기면 표는 멀쩡한데
     조합원 폰이 통째로 빈 화면이 된다. 오류도 안 나고 0건이 온다.
     옮기셔야 한다면 아래 세 곳(hubPull · hubPush · hubReset)의
     headers 에 "Accept-Profile":"daara" · "Content-Profile":"daara" 를
     넣고, Supabase Settings → API → Exposed schemas 에 daara 를 등록해야 한다.
     자세한 것은 sql/009_app_state.sql 맨 위에 적어 두었다.
   ═══════════════════════════════════════════════════════════ */

const SB_URL = "https://yvixdzdvhccyszmahfvu.supabase.co";
const SB_KEY = "sb_publishable_Tm6NjB-ytgttFZUxk-KLkQ_MN8I8id4";
const SB_TENANT = "MIA-002";
/* ★ 모든 조합이 함께 쓰는 자리.
     법령은 조합마다 올릴 이유가 없다. 법은 어디나 같다.
     운영자가 한 번 올리면 모든 조합 자료실에 함께 나타난다. */
const SB_COMMON = "COMMON";

const HUB_KEY = "daara.v1.";
const HUB_ON = (() => {
  try { const k = HUB_KEY + "t";
    localStorage.setItem(k, "1"); localStorage.removeItem(k); return true;
  } catch(e){ return false; }
})();

/* ═══════════════════════════════════════════════════════════
   ★ 로그인 다리 (2026-08-23 · sql/012_auth.sql · 013_rls.sql)
   ───────────────────────────────────────────────────────────
   ★ Supabase SDK 를 쓰지 않는다.

     SDK 를 넣으면 npm 이 따라오고 빌드가 생긴다.
     다알아는 파일을 더블클릭하면 열리는 구조라 그것이 무너진다.
     REST 를 fetch 로 직접 부른다. 지금 hub.js 가 하는 것과 같다.

   ★ 토큰이 있으면 그것을, 없으면 anon key 를 보낸다.
     013_rls.sql 을 아직 안 돌리셨으면 anon 으로도 다 됩니다.
     돌리신 뒤에는 토큰이 있어야 자료가 옵니다.
     **그래서 로그인을 붙이기 전에 013 을 돌리면 안 됩니다.**

   ★ 401 이 오면 한 번 되살리고 다시 부른다 (_refresh).
     Supabase 토큰은 한 시간이면 만료된다.
     총회장에서 접수하시다 갑자기 「권한 없음」이 뜨면
     직원이 무엇을 잘못했는지 알 수 없다.

   ★ 소속이 없는 운영자가 튕기지 않게 한다.
     운영자는 memberships 가 비어 있다. my_org() 가 null 이다.
     그것만 보고 「권한 없음」으로 내보내면 콘솔에 못 들어간다.
     goHome() 이 isSuper() 를 **먼저** 본다.
   ═══════════════════════════════════════════════════════════ */
const AU_KEY = HUB_KEY + "auth";        /* 브라우저에 담는 자리 */
let AU = null;                          /* {access_token, refresh_token, user} */
/* ★ 이름을 AU_ME 로 둔다. index.html 이 ME 를 이미 쓰고 있다.
   const 가 겹치면 그 화면이 통째로 안 그려진다. 검사에서 바로 잡혔다. */
let AU_ME = null;

(function auLoad(){
  if(!HUB_ON) return;
  try{ const v = localStorage.getItem(AU_KEY); if(v) AU = JSON.parse(v); }catch(e){}
})();
function auSave(){
  if(!HUB_ON) return;
  try{ AU ? localStorage.setItem(AU_KEY, JSON.stringify(AU))
          : localStorage.removeItem(AU_KEY); }catch(e){}
}

/* 지금 보낼 머리말 — 토큰이 있으면 토큰, 없으면 anon
   ★ 이름을 sbHead 로 둔다. index.html 이 auHead 를 이미 쓰고 있다.
     (인증 화면 머리글을 그리는 함수라 뜻이 아주 다르다) */
function sbHead(extra){
  return Object.assign({
    apikey: SB_KEY,
    Authorization: "Bearer " + ((AU && AU.access_token) || SB_KEY),
    "Content-Type": "application/json"
  }, extra || {});
}

const isLoggedIn = () => !!(AU && AU.access_token);
const myEmail    = () => (AU && AU.user && AU.user.email) || "";
const isSuper    = () => !!(AU_ME && AU_ME.super);
const myOrgs     = () => (AU_ME && AU_ME.orgs) || [];
const myRole     = (org) => { const m = myOrgs().find(x => x.org_id === (org || hubTenant()));
                              return m ? m.role : null; };
const canManage  = (org) => ["staff","officer"].includes(myRole(org));

/* ── 로그인 ─────────────────────────────────────────────── */
async function auLogin(email, pw){
  try{
    const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=password`, {
      method:"POST", headers:{apikey:SB_KEY, "Content-Type":"application/json"},
      body: JSON.stringify({email:String(email||"").trim(), password:pw})});
    const j = await r.json().catch(()=>({}));
    if(!r.ok) return {ok:false, why: auWhy(r.status, j)};
    AU = {access_token:j.access_token, refresh_token:j.refresh_token, user:j.user};
    auSave();
    await auMe();
    return {ok:true};
  }catch(e){ return {ok:false, why:"서버에 닿지 못했습니다.\n인터넷을 확인해 주십시오."}; }
}

async function auLogout(){
  try{
    if(AU && AU.access_token)
      await fetch(`${SB_URL}/auth/v1/logout`, {method:"POST", headers:sbHead()});
  }catch(e){}
  AU = null; AU_ME = null; auSave();
}

/* 토큰 되살리기 — 401 이 왔을 때 한 번만 */
let AU_BUSY = null;
async function auRefresh(){
  if(!AU || !AU.refresh_token) return false;
  if(AU_BUSY) return AU_BUSY;                 /* 여러 요청이 동시에 401 이면 한 번만 */
  AU_BUSY = (async () => {
    try{
      const r = await fetch(`${SB_URL}/auth/v1/token?grant_type=refresh_token`, {
        method:"POST", headers:{apikey:SB_KEY, "Content-Type":"application/json"},
        body: JSON.stringify({refresh_token: AU.refresh_token})});
      if(!r.ok){ AU = null; AU_ME = null; auSave(); return false; }
      const j = await r.json();
      AU = {access_token:j.access_token, refresh_token:j.refresh_token,
            user:j.user || (AU && AU.user)};
      auSave(); return true;
    }catch(e){ return false; }
    finally{ setTimeout(()=>{ AU_BUSY = null; }, 0); }
  })();
  return AU_BUSY;
}

/* ★ 내가 누구인지 — 로그인 뒤 한 번만 부르면 된다 */
async function auMe(){
  if(!isLoggedIn()){ AU_ME = null; return null; }
  const r = await auRpc("me", {});
  AU_ME = r.ok ? r.data : null;
  return AU_ME;
}

/* ── 함수 부르기 (RPC) ──────────────────────────────────── */
async function auRpc(fn, args){
  const call = async () => fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method:"POST", headers:sbHead(), body: JSON.stringify(args || {})});
  try{
    let r = await call();
    /* ★ 토큰이 만료됐으면 한 번 되살리고 다시 부른다 */
    if(r.status === 401 && await auRefresh()) r = await call();
    const t = await r.text();
    if(!r.ok) return {ok:false, why: auWhy(r.status, t)};
    return {ok:true, data: t ? JSON.parse(t) : null};
  }catch(e){ return {ok:false, why:"서버에 닿지 못했습니다."}; }
}

/* ★ 오류를 사람 말로 (dbWhy 와 짝) */
function auWhy(status, body){
  const b = typeof body === "string" ? body : JSON.stringify(body || {});
  if(/Invalid login credentials/i.test(b))
    return "이메일이나 비밀번호가 맞지 않습니다.";
  if(/Email not confirmed/i.test(b))
    return "메일 확인이 아직 안 됐습니다.\n\n받은 메일함에서 확인 링크를 눌러 주십시오.";
  if(/운영자만/.test(b))
    return "운영자만 할 수 있습니다.\n\n지금 계정 · " + (myEmail() || "로그인 안 됨");
  if(/그 이메일로 가입한 계정이 없습니다/.test(b))
    return "그 이메일로 가입한 계정이 없습니다.\n\n먼저 가입하셔야 출입증을 드릴 수 있습니다.";
  if(status === 401)
    return "로그인이 풀렸습니다.\n다시 들어와 주십시오.";
  if(status === 403 || /row-level security|permission denied/i.test(b))
    return "이 자료를 볼 권한이 없습니다.\n\n지금 계정 · " + (myEmail() || "로그인 안 됨")
      + "\n다른 계정으로 로그인하셨는지 확인해 주십시오.";
  if(status === 404 || /function .* does not exist/i.test(b))
    return "서버 준비가 아직 안 됐습니다.\n\n"
      + "Supabase 에서 sql/012_auth.sql 을 돌려 주십시오.\n"
      + "조합 직원이 하실 것이 아닙니다. 운영자에게 알려 주십시오.";
  try{ const j = JSON.parse(b);
       if(j.message) return j.message;
       if(j.msg) return j.msg; }catch(e){}
  return `문제가 생겼습니다 (${status})\n${b.slice(0,160)}`;
}

/* ★★★ 로그인 뒤 어디로 보내나 — 한 곳에서만 정한다 ★★★
   ★ 운영자를 먼저 본다.
     운영자는 memberships 가 비어 있어 my_org() 가 null 이다.
     소속만 보고 판단하면 콘솔에 못 들어간다. 너스핏이 겪은 사고다. */
function goHome(){
  if(!isLoggedIn()) return "login.html";
  if(isSuper())     return "console.html";      /* 소속이 없어도 들어간다 */
  const org = myOrgs()[0];
  if(!org)          return "nomember.html";     /* 출입증이 없다 */
  return ["staff","officer"].includes(org.role) ? "admin.html" : "index.html";
}

/* ═══════════════════════════════════════════════════════════
   ★★★ 2026-09-18 — 단계가 자꾸 예전 것으로 돌아가던 까닭 ★★★
   ───────────────────────────────────────────────────────────
   조합원 폰에서 「통합심의」가 자꾸 「조합설립」으로 돌아갔다.

   ★ 까닭 — HUB_NET 이 **한 번 false 가 되면 영영 안 돌아왔다.**

       catch(e){ hubDown(); }      한 번 실패하면
       if(!hubOK()) return null;         그 뒤로 서버를 **아예 안 본다**

     폰은 인터넷이 자주 끊긴다. 지하철 · 엘리베이터 · 전파 약한 곳.
     한 번만 실패해도 그 뒤로는 **예시 자료**만 보여 드린다.
     예시 자료의 단계가 「조합설립」이라 거기로 돌아간 것이다.

   ★ 게다가 조용히 그렇게 된다. 조합원은 **틀린 줄도 모르신다.**

   ★ 고침 — 30초 뒤에 다시 해 본다.
     인터넷은 대개 곧 돌아온다. 영영 포기할 까닭이 없다.
   ═══════════════════════════════════════════════════════════ */
let HUB_NET = true;
let HUB_OFF_AT = 0;          /* 언제 끊겼나 */
const HUB_RETRY = 30 * 1000; /* 30초 뒤 다시 해 본다 */

/* 서버를 지금 써 볼 수 있는가 */
function hubOK(){
  if(HUB_NET) return true;
  if(Date.now() - HUB_OFF_AT > HUB_RETRY){
    HUB_NET = true;          /* 다시 해 본다. 또 실패하면 또 30초 쉰다. */
    return true;
  }
  return false;
}

/* 끊겼다고 적어 둔다.
   ★ 여기서 hubDown() 을 부르면 자기가 자기를 불러 화면이 멈춘다.
     일괄 바꾸기를 하다 한 번 그렇게 됐다. 값을 직접 넣는다. */
function hubDown(){
  HUB_NET = false;
  HUB_OFF_AT = Date.now();
}

/* ═══════════════════════════════════════════════════════════
   ★★★ 지금 다루는 구역이 어디인가 (2026-08-22 오후) ★★★
   ───────────────────────────────────────────────────────────
   ★ 예전에는 SB_TENANT 라는 붙박이 글자 하나였다.
     어느 화면에서 무엇을 하든 언제나 MIA-002 로 갔다.
     조합이 하나뿐이라 티가 나지 않았을 뿐이다.

     미아3 이 들어오는 순간
       · 미아3 직원이 올린 자료가 미아2 자리에 담긴다
       · 미아2 조합원 폰에 미아3 자료가 나타난다
     조합 자료가 섞이는 것은 되돌릴 수 없는 사고다.

   ★ 이제 한 곳에서 정한다. 고칠 곳도 여기뿐이다.
     tenant-demo.js 의 TENANT_CODE 를 따라간다.
     그 파일이 없는 화면에서는 SB_TENANT 로 돌아간다.

   ★★★ 다만 이것은 「화면이 어느 구역을 보여 줄까」 일 뿐이다 ★★★

     진짜 차단이 아니다. 지금 app_state 와 저장소 규칙은
     anon 에게 전부 열려 있어, 개발자 도구를 아는 사람은
     tenant_id 만 바꿔 남의 조합 자료를 그대로 읽을 수 있다.

     진짜 격리는 Supabase Auth 를 붙이고
     로그인한 사람의 구역만 읽도록 RLS 를 좁혀야 생긴다.
     → 인수인계서 「배포 전 반드시 ⑱ · ⑲」
     실제 조합원 명부를 올리기 전에 반드시 해야 한다.
   ═══════════════════════════════════════════════════════════ */
/* ★ 주소로 넘어온 구역을 여기서 먼저 읽는다 (2026-08-22 오후).

     admin.html?t=MIA-003

   ★★★ 반드시 hub.js 에서 읽어야 한다 ★★★
     tenant-demo.js 에서 읽으면 늦다. 로드 순서가

       admin.html   hub · roster · archive · survey · … · tenant · …

     이라 archive-demo.js 가 먼저 읽히는데, 그 파일은 읽히자마자
     hubLoad("arc_docs") 로 저장소에서 자료를 꺼낸다.
     그때 TENANT_CODE 는 아직 없어서 미아2 자료를 꺼내 온다.
     화면은 미아3 인데 목록만 미아2 인 상태가 된다.

   ★ 모양만 본다. 어느 구역이 있는지는 hub.js 가 알 수 없다.
     실제로 있는 구역인지는 tenant-demo.js 가 TENANTS 로 다시 본다. */
const SB_ZONE = (() => {
  try{
    const q = new URLSearchParams(location.search).get("t");
    if(!q) return SB_TENANT;
    const c = q.normalize("NFC").trim().toUpperCase();
    return /^[A-Z]{2,6}-\d{3}$/.test(c) ? c : SB_TENANT;
  }catch(e){ return SB_TENANT; }
})();

/* ★★★ typeof 로는 못 피한다. try 로 감싸야 한다 (2026-08-22 오후) ★★★

     처음에는 이렇게 썼다가 화면 셋이 통째로 죽었다.

       if(typeof TENANT_CODE !== "undefined") …     ← 이러면 안 된다

     TENANT_CODE 는 tenant-demo.js 의 let 이다.
     let 로 만든 이름은 그 파일이 실행되기 전까지 「죽은 구간」에 있는데,
     이 구간에서는 typeof 조차 오류를 낸다. (var 나 function 은 안 그렇다)

       ReferenceError: Cannot access 'TENANT_CODE' before initialization

     admin 은 archive-demo.js 를 tenant-demo.js 보다 먼저 읽고,
     archive-demo.js 는 읽히자마자 hubPoll → hubPull → hubTenant() 를 부른다.
     그때 이 줄이 오류를 내면 그 뒤 파일이 전부 안 읽힌다.
     흰 화면이 되고, 무엇이 잘못됐는지 알 수 없다.

   ★ 이 코드 곳곳의 typeof 검사(typeof hubPush · typeof TN …)는
     function 이거나 아예 선언되지 않은 이름이라 지금은 괜찮다.
     하지만 let · const 로 만든 이름에 쓰면 같은 사고가 난다.
     **파일을 나눌 때 이것도 함께 볼 것.** */
function hubTenant(){
  try {
    if(typeof TENANT_CODE !== "undefined" && TENANT_CODE) return TENANT_CODE;
  } catch(e){ /* tenant-demo.js 가 아직 안 읽혔다 — 아래 값을 쓴다 */ }
  return SB_ZONE;
}

/* ═══════════════════════════════════════════════════════════
   ★★★ 한글 찾기는 반드시 이것을 지난다 (2026-08-22 밤) ★★★
   ───────────────────────────────────────────────────────────
   ★ 왜 필요한가

     「서우은」이 세 글자로 들어올 수도,
     여섯 조각(ㅅㅓㅇㅜㅇㅡㄴ)으로 들어올 수도 있다.
     **화면에는 똑같이 보이는데 컴퓨터는 다른 것으로 본다.**

     로그인 세 곳(console · admin · index)은 이미 고쳐 두었는데
     **조합원 찾기에는 안 넣어서** 이름을 쳐도 못 찾았다.
     실제로 투표 입력에서 「서우은」을 못 찾는 것을 확인했다(2026-08-22).

   ★ 언제 생기나
     · 폰 · 태블릿 키보드에서 조합이 아직 안 끝난 채로 들어올 때
     · 맥에서 복사해 붙여넣을 때 (맥은 NFD 로 담는다)
     · 자동 채우기 · 음성 입력

   ★ 앞으로 이름 · 지번으로 찾는 곳은 전부 이 함수를 쓸 것.
     찾는 쪽(사용자가 친 글자)과 찾히는 쪽(명부 값) **양쪽 다** 골라야 한다.
     한쪽만 고르면 여전히 못 찾는다.
   ═══════════════════════════════════════════════════════════ */
function hubNorm(v){
  return String(v == null ? "" : v).normalize("NFC").trim();
}
/* 찾기용 — 사이 공백까지 지운다. 「미아동 430-119」와 「미아동430-119」가 같아야 한다 */
function hubKeyOf(v){
  return hubNorm(v).replace(/\s+/g, "").toLowerCase();
}

/* ── 임시 보관 ──────────────────────────────────────────────
   ★ 저장소 이름에도 구역을 넣는다 (2026-08-22 오후).
     예전에는 daara.v1.arc_docs 하나였다.
     운영자 콘솔에서 미아2 를 보다 미아3 으로 옮기면
     화면이 미아2 자료를 그대로 그렸다. 서버에서 받아오기 전까지는
     구역을 바꾼 것이 화면에 반영되지 않았다. */
const cacheKey = (key, tid) => HUB_KEY + (tid || hubTenant()) + "." + key;

function cacheGet(key, def, tid){
  if(!HUB_ON) return def;
  try { const raw = localStorage.getItem(cacheKey(key, tid));
    if(raw === null) return def;
    const v = JSON.parse(raw);
    return (v === null || v === undefined) ? def : v;
  } catch(e){ return def; }
}
function cacheSet(key, val, tid){
  if(!HUB_ON) return;
  try { localStorage.setItem(cacheKey(key, tid), JSON.stringify(val)); } catch(e){}
}

/* 화면이 바로 쓰는 읽기 — 임시 보관에서 즉시 준다 */
function hubLoad(key, def){ return cacheGet(key, def); }

/* ── 서버에서 받아오기 ───────────────────────────────────
   받아온 것이 임시 보관과 다르면 fn 을 불러 화면을 다시 그리게 한다. */
async function hubPull(key, fn, tid){
  if(!hubOK()) return null;
  const t = tid || hubTenant();
  try {
    const r = await fetch(
      `${SB_URL}/rest/v1/app_state?tenant_id=eq.${encodeURIComponent(t)}&key=eq.${encodeURIComponent(key)}&select=value`,
      {headers:sbHead()});
    if(!r.ok) throw new Error(r.status);
    const rows = await r.json();
    if(!rows.length) return null;
    const v = rows[0].value;
    const before = JSON.stringify(cacheGet(key, null, t));
    cacheSet(key, v, t);
    /* ★ 2026-09-20 (113절) — 받은 것으로 화면을 다시 그리기 **전에** 쓰던 글을 담는다.
       20초 갱신 열 곳이 넘는 자리가 모두 여기를 거친다. 한 곳에서 막는다.
       keepAll 은 직원 화면(admin.html)에만 있다 — 없으면 그냥 넘어간다.
       ★ 칸의 글자를 읽어 담기만 하므로 다시 그리지 않는 갱신에도 해가 없다. */
    if(before !== JSON.stringify(v) && typeof fn === "function"){
      if(typeof keepAll === "function"){ try{ keepAll(); }catch(e){} }
      fn(v);
    }
    return v;
  } catch(e){ hubDown(); return null; }
}

/* ── 서버에 올리기 ──────────────────────────────────────── */
/* ★ 2026-08-31 — 왜 못 담았는지 남긴다.
   예전에는 false 만 돌려주어, 인터넷 문제인지 서버가 거절한 것인지
   알 수 없었다. 화면이 「저장하지 못했습니다」 뒤에 이 줄을 붙여 드린다. */
let HUB_WHY = "";

async function hubPush(key, val, who, tid){
  const t = tid || hubTenant();
  cacheSet(key, val, t);                 /* 화면은 곧바로 반영 */
  if(!hubOK()){ HUB_WHY = "서버에 닿지 못했습니다."; return false; }
  try {
    const r = await fetch(`${SB_URL}/rest/v1/app_state?on_conflict=tenant_id,key`, {
      method:"POST",
      headers:sbHead({Prefer:"resolution=merge-duplicates"}),
      body: JSON.stringify({tenant_id:t, key, value:val, updated_by:who || null})
    });
    if(!r.ok){
      const txt = await r.text().catch(()=>"" );
      HUB_WHY = (typeof dbWhy !== "undefined") ? dbWhy(r.status, txt)
              : `서버가 거절했습니다 (${r.status}).`;
      return false;
    }
    HUB_WHY = "";
    return true;
  } catch(e){ hubDown();
    HUB_WHY = "서버에 닿지 못했습니다. 인터넷을 확인해 주십시오.";
    return false; }
}

/* 예전 이름 — 화면 코드를 고치지 않으려고 남겨 둔다 */
function hubSave(key, val, who){ hubPush(key, val, who); return true; }

/* 시연 자료 지우기 — 지금 보고 있는 구역 것만 지운다 */
async function hubReset(){
  const t = hubTenant();
  if(HUB_ON) Object.keys(localStorage)
    .filter(k => k.indexOf(HUB_KEY + t + ".") === 0)
    .forEach(k => localStorage.removeItem(k));
  if(!hubOK()) return;
  try {
    await fetch(`${SB_URL}/rest/v1/app_state?tenant_id=eq.${encodeURIComponent(t)}`, {
      method:"DELETE",
      headers:sbHead()});
  } catch(e){}
}

/* 다른 탭에서 바뀌면 알려 준다 (같은 기기 안) */
function hubWatch(fn){
  if(!HUB_ON) return;
  window.addEventListener("storage", e => {
    if(e.key && e.key.indexOf(HUB_KEY) === 0) fn(e.key.slice(HUB_KEY.length));
  });
}

/* ═══════════════════════════════════════════════════════════
   ★ 정식 표를 한 줄씩 다루는 함수 (2026-08-23)
   ───────────────────────────────────────────────────────────
   ★ app_state 와 무엇이 다른가

     app_state   목록 전체를 통째로 갈아 끼운다
                 두 사람이 같은 시간에 올리면 나중 것이 앞의 것을 지운다
     정식 표      한 줄씩 넣고 고친다
                 서로 다른 줄을 만지면 겹치지 않는다

   ★ 의결 기록은 결재가 붙는 순간 조합장과 직원이 동시에 손을 댄다.
     그래서 표로 옮겼다. → sql/011_decision.sql

   ★ 돌려주는 모양을 맞춘다.
     실패하면 {ok:false, why} 를 돌려준다. 예외를 던지지 않는다.
     화면 쪽에서 try 를 빠뜨리면 그 화면이 통째로 안 그려진다.
   ═══════════════════════════════════════════════════════════ */
/* ★ sbHead 하나로 몬다 (2026-08-23).
   예전에는 여기서 SB_KEY 를 고정으로 붙였다.
   로그인을 붙인 뒤에는 **토큰이 나가야** 자기 구역 자료가 온다.
   같은 일을 두 곳에서 하면 한 곳만 고쳐 놓고 「왜 안 되지」 한다. */
const dbHead = (extra) => sbHead(extra);

/* 읽기 — 이 구역 것만 */
async function dbList(table, query){
  if(!hubOK()) return {ok:false, why:"서버에 닿지 못했습니다.", rows:[]};
  try{
    const q = `tenant_id=eq.${encodeURIComponent(hubTenant())}` + (query ? "&" + query : "");
    const r = await fetch(`${SB_URL}/rest/v1/${table}?${q}`, {headers: dbHead()});
    if(!r.ok){ const t = await r.text().catch(()=>"" );
      return {ok:false, why: dbWhy(r.status, t), rows:[]}; }
    return {ok:true, rows: await r.json()};
  }catch(e){ hubDown();
    return {ok:false, why:"서버에 닿지 못했습니다.\n인터넷을 확인해 주십시오.", rows:[]}; }
}

/* 한 줄 넣기 — 넣은 줄을 그대로 돌려받는다 */
async function dbAdd(table, row){
  if(!hubOK()) return {ok:false, why:"서버에 닿지 못했습니다."};
  try{
    const body = Object.assign({tenant_id: hubTenant()}, row);
    const r = await fetch(`${SB_URL}/rest/v1/${table}`, {
      method:"POST", headers: dbHead({Prefer:"return=representation"}),
      body: JSON.stringify(body)});
    const t = await r.text();
    if(!r.ok) return {ok:false, why: dbWhy(r.status, t)};
    const j = JSON.parse(t || "[]");
    return {ok:true, row: j[0] || null};
  }catch(e){ return {ok:false, why:"서버에 닿지 못했습니다."}; }
}

/* 한 줄 고치기 */
async function dbSet(table, id, row){
  if(!hubOK()) return {ok:false, why:"서버에 닿지 못했습니다."};
  try{
    const r = await fetch(
      `${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method:"PATCH", headers: dbHead({Prefer:"return=representation"}),
      body: JSON.stringify(row)});
    const t = await r.text();
    if(!r.ok) return {ok:false, why: dbWhy(r.status, t)};
    const j = JSON.parse(t || "[]");
    return {ok:true, row: j[0] || null};
  }catch(e){ return {ok:false, why:"서버에 닿지 못했습니다."}; }
}

/* 한 줄 지우기 */
async function dbDel(table, id){
  if(!hubOK()) return {ok:false, why:"서버에 닿지 못했습니다."};
  try{
    const r = await fetch(
      `${SB_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
      method:"DELETE", headers: dbHead()});
    if(!r.ok){ const t = await r.text().catch(()=>"" );
      return {ok:false, why: dbWhy(r.status, t)}; }
    return {ok:true};
  }catch(e){ return {ok:false, why:"서버에 닿지 못했습니다."}; }
}

/* 있으면 고치고 없으면 넣기 (키가 id 가 아닌 표) */
async function dbUpsert(table, row, onConflict){
  if(!hubOK()) return {ok:false, why:"서버에 닿지 못했습니다."};
  try{
    const body = Object.assign({tenant_id: hubTenant()}, row);
    const r = await fetch(
      `${SB_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`, {
      method:"POST",
      headers: dbHead({Prefer:"resolution=merge-duplicates,return=representation"}),
      body: JSON.stringify(body)});
    const t = await r.text();
    if(!r.ok) return {ok:false, why: dbWhy(r.status, t)};
    return {ok:true};
  }catch(e){ return {ok:false, why:"서버에 닿지 못했습니다."}; }
}

/* ★ 오류 번호를 사람 말로 바꾼다.
   「저장 실패 (400)」만 뜨면 직원이 무엇을 고쳐야 할지 모른다.
   특히 check 제약에 걸린 것은 숫자가 안 맞는다는 뜻이라 바로 알려야 한다. */
function dbWhy(status, body){
  const b = String(body || "");
  if(/dec_attend_le_total/.test(b))
    return "참석 인원이 총원보다 많습니다.\n\n회의 종류와 총원을 확인해 주십시오.";
  if(/dec_votes_le_attend/.test(b))
    return "찬성 + 반대 + 기권이 참석 인원보다 많습니다.\n\n회의록을 다시 확인해 주십시오.";
  if(/dec_n_positive/.test(b))
    return "총원은 1명 이상이어야 하고 표는 음수일 수 없습니다.";
  if(/dec_rule_ok/.test(b))
    return "의결 요건이 올바르지 않습니다.";
  if(status === 404 || /does not exist|relation .* does not exist/i.test(b))
    return "표가 아직 만들어지지 않았습니다.\n\n"
      + "Supabase 에서 sql/011_decision.sql 을 한 번 돌려 주십시오.\n"
      + "조합 직원이 고치실 수 있는 것이 아닙니다. 운영자에게 알려 주십시오.";
  if(status === 401 || status === 403 || /row-level security/i.test(b))
    return "표에 쓸 권한이 없습니다.\n\n"
      + "sql/011_decision.sql 의 정책이 들어갔는지 확인해야 합니다.\n"
      + "운영자에게 알려 주십시오.";
  if(status === 409)
    return "같은 기록이 이미 있습니다.";
  return `저장하지 못했습니다 (${status})\n${b.slice(0,180)}`;
}

/* 서버를 주기적으로 살펴본다 — 폰에서도 새 소식이 뜨게
   ★ tid 를 미리 굳히지 않는다 (2026-08-22 오후).
     예전에는 등록할 때의 구역을 그대로 들고 계속 돌았다.
     운영자 콘솔에서 구역을 바꿔도 20초마다 옛 구역을 받아와
     방금 바꾼 화면을 다시 옛 자료로 덮어썼다.
     tid 를 안 주면 그때그때 hubTenant() 를 다시 본다. */
/* ★★ 2026-09-21 (124절) — 탭으로 **돌아오는 순간** 한 번 더 읽는다.
   브라우저는 다른 탭을 보고 있는 동안 그 탭의 20초 갱신을 늦추거나 멈춘다.
   그래서 조합원 앱을 잠시 두었다가 다시 보시면 **옛 내용**이 남아 있었다.
   (직원 화면에서 질문 13개를 올렸는데 폰에는 2개만 보이던 일 · 123절)
   ★ 돌아올 때마다 한꺼번에 몰리지 않도록 2초 안에 한 번만 돈다. */
const HUB_POLLS = [];
let HUB_WAKE = 0;
function hubWake(){
  if(document.hidden) return;
  const now = Date.now();
  if(now - HUB_WAKE < 2000) return;     /* 너무 자주 부르지 않는다 */
  HUB_WAKE = now;
  /* ★ 한꺼번에 몰면 수십 건이 동시에 서버로 간다. 40ms 씩 나눠 보낸다. */
  HUB_POLLS.forEach((p, i) => setTimeout(() => {
    try{ hubPull(p.key, p.fn, p.tid); }catch(e){}
  }, i * 40));
}
/* ★ visibilitychange 는 **문서**에서 나는 사건이다. 창에 달면 놓친다. */
document.addEventListener("visibilitychange", hubWake);
addEventListener("focus", hubWake);
addEventListener("pageshow", hubWake);   /* 뒤로 가기로 돌아온 경우 */

function hubPoll(key, fn, sec, tid){
  HUB_POLLS.push({key, fn, tid});
  hubPull(key, fn, tid);
  setInterval(() => hubPull(key, fn, tid), (sec || 20) * 1000);
}

/* 모든 조합이 함께 쓰는 자리 — 법령처럼 어디나 같은 것 */
const hubPullCommon = (key, fn)      => hubPull(key, fn, SB_COMMON);
const hubPushCommon = (key, val, who)=> hubPush(key, val, who, SB_COMMON);
const hubPollCommon = (key, fn, sec) => hubPoll(key, fn, sec, SB_COMMON);

const HUB_NOTE = "직원 화면에서 올린 것이 조합원 폰에도 나타납니다. "
  + "서버에 저장되므로 기기가 달라도 같은 자료를 봅니다.";

/* ═══════════════════════════════════════════════════════════
   파일 올리기 · 내려받기  (2026-08-21)
   ───────────────────────────────────────────────────────────
   ★ 동의서 스캔은 글자가 아니라 파일이다.
     app_state 는 글자만 담는 자리라 PDF 를 넣을 수 없다.
     Supabase Storage 의 consent-scan 저장소를 쓴다.

   ★ 저장소는 잠겨 있다.
     Public bucket 을 끈 채로 만들었기 때문에 주소만으로는 열리지 않는다.
     동의서 스캔에는 조합원 이름과 서명이 들어 있다.
     열어 볼 때마다 한 시간짜리 임시 주소를 받아서 연다.

   ★ 지금은 누구나 올리고 볼 수 있다.
     로그인 장치가 아직 없어서 규칙을 열어 두었다.
     실제 조합원 명부를 올리기 전에 반드시 좁혀야 한다.
     → 인수인계서 「배포 전 반드시」
   ═══════════════════════════════════════════════════════════ */

const SB_BUCKET = "consent-scan";

/* ★★★ 경로 맨 앞에 구역 코드를 붙인다 (2026-08-22 오후) ★★★

   예전 경로 :  arc__AR-2026-001.pdf
   지금 경로 :  MIA-002__arc__AR-2026-001.pdf

   ★ 구역이 없으면 파일이 서로 덮어쓴다.
     자료 번호(AR-2026-001)는 구역마다 1번부터 다시 센다.
     미아2 의 AR-2026-001 과 미아3 의 AR-2026-001 이 같은 이름이 된다.
     게다가 아래 hubUpload 가 x-upsert 로 보내기 때문에
     **오류도 없이 앞의 파일이 지워지고 뒤의 것이 덮인다.**

     미아2 조합원이 자기 고시문을 열었더니 미아3 고시문이 나오고,
     원본은 이미 없어진 뒤다. 되돌릴 방법이 없다.

   ★ 예전에 올린 파일도 그대로 열린다.
     기록(ARC_DOCS.path · CONSENT_LOG.scanPath)에 그때 경로가
     통째로 담겨 있어서 그 값으로 연다. 새로 올리는 것만 구역이 붙는다.

   ★ 슬래시를 쓰지 않는다.
     폴더처럼 나누면 주소에서 %2F 로 바뀌는데,
     임시 주소를 만들 때와 열 때 경로가 어긋나 InvalidSignature 가 난다.
     __ 로 이어 붙여 평평하게 둔다. */
const hubPath = (...parts) =>
  [hubTenant(), ...parts].join("__").replace(/[^A-Za-z0-9._-]/g, "-");

/* ★ 확장자로 파일 종류를 정한다 (2026-08-22 오후).
     브라우저는 .hwp 의 종류를 모른다. file.type 이 빈 값으로 온다.
     그대로 보내면 application/octet-stream 이 되는데,
     저장소가 허용 목록으로 막고 있어 400 으로 튕긴다.
     한글 파일이 「올리지 못했습니다 (400)」 만 뜨고 왜인지 알 수 없다.

   ★★★ 이 목록과 sql/010_storage.sql 의 allowed_mime_types 는
     반드시 같아야 한다. 한쪽만 고치면 그 확장자가 조용히 막힌다. */
const HUB_MIME = {
  pdf:"application/pdf",
  jpg:"image/jpeg", jpeg:"image/jpeg", png:"image/png", heic:"image/heic",
  hwp:"application/x-hwp", hwpx:"application/hwp+zip",
  doc:"application/msword",
  docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"
};
const hubExt  = name => (String(name||"").match(/\.([A-Za-z0-9]+)$/) || ["",""])[1].toLowerCase();
const hubMime = name => HUB_MIME[hubExt(name)] || "";

/* 저장소가 받아 주는 한도 — sql/010_storage.sql 과 같은 값이어야 한다 */
/* ★★★ 한 조각의 크기 — 45MB (2026-09-16) ★★★

   ★ Supabase 프로젝트 전체 한도가 **50MB** 다.
     Storage → Settings → Global file size limit.

     Pro 라도 **지출 상한(spend cap)이 켜져 있으면 50MB 로 묶인다.**
     상한을 끄면 500GB 까지 되지만, 그러면 전송량이 250GB 를 넘었을 때
     **요금이 그대로 붙는다.** 조합 돈이라 상한은 켜 둔 채로 간다.

   ★ 45 로 잡은 것은 여유다. 파일 이름과 머리말이 함께 실려
     실제로 보내는 양이 파일 크기보다 조금 크다.
     50 에 딱 맞추면 49.9MB 짜리가 튕긴다.

   ★ 이보다 큰 파일은 **조각으로 나눠 올린다.** → hubUploadBig() */
const HUB_PART = 45 * 1024 * 1024;

/* 한 건에 받을 수 있는 최대 — 조각 스무 개까지 (약 900MB) */
const HUB_MAX = HUB_PART * 20;

/* ★ 오류 번호를 사람 말로 바꾼다.
     「올리지 못했습니다 (404)」 만 뜨면 인터넷 탓인 줄 아신다.
     무엇이 잘못됐고 누가 고쳐야 하는지까지 적는다. */
function hubWhy(status, body){
  const b = String(body || "");
  if(status === 404 || /Bucket not found/i.test(b))
    return "파일 저장소가 아직 만들어지지 않았습니다.\n\n"
      + "Supabase 에서 sql/010_storage.sql 을 한 번 돌려 주십시오.\n"
      + "조합 직원이 고치실 수 있는 것이 아닙니다. 운영자에게 알려 주십시오.";
  if(status === 401 || status === 403 || /row-level security|Unauthorized/i.test(b))
    return "저장소에 올릴 권한이 없습니다.\n\n"
      + "sql/010_storage.sql 의 정책 네 개가 들어갔는지 확인해야 합니다.\n"
      + "운영자에게 알려 주십시오.";
  if(status === 413 || /exceeded the maximum|too large/i.test(b))
    return "파일이 저장소 한도를 넘었습니다.\n\n한 건에 40MB까지입니다.";
  if(status === 400 && /mime|content.?type/i.test(b))
    return "이 형식은 올리실 수 없습니다.\n\nPDF · 한글 · 워드 · 사진만 됩니다.";
  if(status === 409)
    return "같은 이름의 파일이 이미 있습니다.\n\n잠시 뒤 다시 눌러 주십시오.";
  return `올리지 못했습니다 (${status})\n${b.slice(0,180)}`;
}

/* 파일을 올린다. 돌려주는 path 를 기록에 남겨 두었다가 나중에 연다.
   ★ 예외를 던지지 않는다. 언제나 {ok:…} 를 돌려준다.
     화면 쪽에서 try 를 빠뜨리면 그 화면이 통째로 안 그려진다. */
async function hubUpload(file, path, onUp, raw){
  if(!file) return {ok:false, why:"파일이 없습니다."};
  /* ★ raw — 조각(.part)을 올릴 때만 참이다.
     조각은 확장자가 .part 라 종류 검사에 걸린다.
     hubUploadBig() 이 이미 원래 파일을 검사했으므로 여기서는 건너뛴다. */

  /* ★ 화면에서 한 번, 여기서 한 번, 저장소에서 한 번 — 세 겹으로 막는다.
     화면 검사만 있으면 개발자 도구로 얼마든지 넘길 수 있고,
     저장 요금은 우리 것으로 나간다. */
  if(file.size > HUB_PART)
    return {ok:false, code:413,
      why:`파일이 너무 큽니다 (${hubSize(file.size)})\n\n`
        + `한 조각에 ${hubSize(HUB_PART)}까지입니다.\n\n`
        + `★ 큰 파일은 hubUploadBig() 으로 올리십시오.`};
  if(!raw && !hubMime(file.name))
    return {ok:false, code:415,
      why:"PDF · 한글 · 워드 · 사진만 올리실 수 있습니다.\n\n" + file.name};

  const key = encodeURIComponent(path);   /* 슬래시 없는 이름이라 안전하다 */

  /* ★★★ fetch 가 아니라 XMLHttpRequest 를 쓴다 (2026-09-16) ★★★

     fetch 로는 **얼마나 올라갔는지 알 수 없다.**
     40MB 까지는 금방이라 티가 안 났는데, 96MB 짜리를 올리면
     조합 사무실 인터넷으로 몇 분이 걸린다.

     그동안 화면이 「올리는 중입니다…」로만 있으면
     직원은 멈춘 줄 알고 **새로고침을 누르신다.** 그러면 처음부터 다시다.

     XHR 은 upload.onprogress 로 진행률을 준다.
     onUp(백분율) 을 주시면 그때그때 알려 드린다. */
  return new Promise(resolve => {
    try{
      const x = new XMLHttpRequest();
      x.open("POST", `${SB_URL}/storage/v1/object/${SB_BUCKET}/${key}`);
      /* ★ 013_rls.sql 뒤에는 토큰이 있어야 올라간다.
         정책이 파일 이름 앞부분(구역 코드)을 잘라 can_manage 로 묻는다. */
      const h = sbHead({"Content-Type": (raw ? "application/octet-stream"
                                             : hubMime(file.name)), "x-upsert":"true"});
      Object.keys(h).forEach(k => x.setRequestHeader(k, h[k]));

      if(typeof onUp === "function" && x.upload){
        x.upload.onprogress = e => {
          if(e.lengthComputable) onUp(Math.round(e.loaded / e.total * 100), e.loaded, e.total);
        };
      }
      x.onload = () => {
        if(x.status >= 200 && x.status < 300){
          resolve({ok:true, path, size:file.size,
                   type:(raw ? "application/octet-stream" : hubMime(file.name)),
                   name:file.name, zone:hubTenant()});
        } else {
          resolve({ok:false, code:x.status, why:hubWhy(x.status, x.responseText || "")});
        }
      };
      x.onerror = () => resolve({ok:false, code:0,
        why:"서버에 닿지 못했습니다.\n인터넷 연결을 확인해 주십시오."});
      /* ★ 큰 파일은 오래 걸린다. 기본 시간제한을 없앤다.
         30MB 짜리가 2분 만에 끊기면 직원은 까닭을 모른다. */
      x.timeout = 0;
      x.ontimeout = () => resolve({ok:false, code:0,
        why:"시간이 너무 오래 걸려 멈췄습니다.\n인터넷이 느린 곳에서는 큰 파일이 어렵습니다."});
      x.send(file);
    }catch(e){
      resolve({ok:false, code:0,
        why:"서버에 닿지 못했습니다.\n인터넷 연결을 확인해 주십시오."});
    }
  });
}

/* ═══════════════════════════════════════════════════════════
   ★★★ 큰 파일을 조각으로 나눠 올린다 (2026-09-16) ★★★
   ───────────────────────────────────────────────────────────
   ★ 왜 필요한가

     Supabase 한 건 한도가 50MB 인데
     정보몽땅 대의원회 회의자료가 **96MB** 였다.

   ★★★ 쪼개는 것이 보는 사람을 불편하게 하면 안 된다 ★★★

     처음에는 「96MB 를 넷으로 나누면 조합원이 네 번 열어야 한다」고
     보아 쪼개지 않으려 했다. 그 걱정은 맞다.

     그래서 **조합원 화면에서는 한 건으로 보이게** 한다.
       · 목록에 한 줄만 나온다
       · 내려받기를 누르시면 조각을 차례로 받아 **브라우저가 이어 붙인다**
       · 받아지는 것은 원래 파일 하나다

     ★ 이어 붙이는 일은 조합원 폰이 한다. 서버가 하지 않는다.
       Blob 으로 붙이므로 폰 메모리를 쓴다. 100MB 쯤은 견딘다.
       그보다 크면 어차피 폰에서 열지도 못한다.

   ★ 담기는 모양

       한 조각짜리   path: "MIA-002__arc__AR-2026-009.pdf"
       여러 조각     parts: ["...-p1.part", "...-p2.part", ...]
                    path 는 첫 조각을 가리킨다 (옛 화면이 깨지지 않게)

   ★ 조각 이름을 .part 로 끝낸다.
     .pdf 로 두면 조합원이 조각 하나만 받아 열려다 「깨진 파일」을 본다.
   ═══════════════════════════════════════════════════════════ */

/* 몇 조각으로 나뉘는가 */
const hubParts = size => Math.max(1, Math.ceil(size / HUB_PART));

/* 큰 파일을 올린다.
   onUp(백분율) · 조각 진행을 합쳐 전체 백분율로 알려 준다.
   ★ 돌려주는 것에 parts 가 있으면 여러 조각이다. */
async function hubUploadBig(file, base, onUp){
  if(!file) return {ok:false, why:"파일이 없습니다."};
  if(file.size > HUB_MAX)
    return {ok:false, code:413,
      why:`파일이 너무 큽니다 (${hubSize(file.size)})\n\n`
        + `한 건에 ${hubSize(HUB_MAX)}까지입니다.`};
  if(!hubMime(file.name))
    return {ok:false, code:415,
      why:"PDF · 한글 · 워드 · 사진만 올리실 수 있습니다.\n\n" + file.name};

  const ext = (file.name.match(/\.[A-Za-z0-9]+$/) || [".pdf"])[0].toLowerCase();

  /* 한 조각이면 예전 방식 그대로 */
  if(file.size <= HUB_PART){
    const r = await hubUpload(file, base + ext, onUp);
    return r.ok ? Object.assign(r, {parts:null, partN:1}) : r;
  }

  const n = hubParts(file.size);
  const paths = [];
  for(let i = 0; i < n; i++){
    const from = i * HUB_PART;
    const to   = Math.min(file.size, from + HUB_PART);
    /* ★ slice 는 자르는 시늉만 한다. 통째로 복사하지 않아 메모리를 안 쓴다. */
    const chunk = file.slice(from, to);
    /* ★ 조각에도 원래 확장자를 알려 준다. 나중에 이어 붙일 때 쓴다. */
    const path = `${base}-p${i+1}of${n}${ext}.part`;

    const r = await hubUpload(
      new File([chunk], path, {type:"application/octet-stream"}),
      path,
      p => { if(typeof onUp === "function")
               onUp(Math.round((i * 100 + p) / n)); },
      true);        /* ★ 조각이다 — 종류 검사를 건너뛴다 */

    if(!r.ok){
      /* ★ 하나라도 못 올리면 앞서 올린 조각을 거둬들인다.
         반쯤 올라간 자료가 남으면 나중에 아무도 못 지운다. */
      for(const q of paths) await hubFileDel(q);
      return {ok:false, code:r.code,
        why:`${n}조각 가운데 ${i+1}번째에서 멈췄습니다.\n\n${r.why}\n\n`
          + `올리던 조각은 되돌렸습니다. 반쯤 올라간 자료는 남지 않았습니다.`};
    }
    paths.push(path);
  }
  return {ok:true, path:paths[0], parts:paths, partN:n,
          size:file.size, type:hubMime(file.name), name:file.name,
          zone:hubTenant()};
}

/* 조각들을 받아 하나로 이어 붙인다. 돌려주는 것은 내려받을 주소다.
   ★ 조합원 폰이 하는 일이다. 서버는 조각을 그대로 줄 뿐이다. */
async function hubJoinParts(parts, onDown){
  const blobs = [];
  for(let i = 0; i < parts.length; i++){
    const u = await hubFileUrl(parts[i], 600);
    if(!u) return {ok:false, why:`${i+1}번째 조각을 받지 못했습니다.`};
    try{
      const r = await fetch(u);
      if(!r.ok) return {ok:false, why:`${i+1}번째 조각을 받지 못했습니다.`};
      blobs.push(await r.blob());
    }catch(e){
      return {ok:false, why:"받는 도중 끊겼습니다.\n인터넷을 확인해 주십시오."};
    }
    if(typeof onDown === "function")
      onDown(Math.round((i + 1) / parts.length * 100));
  }
  /* ★ 확장자를 조각 이름에서 되찾는다. "...-p1of3.pdf.part" → ".pdf" */
  const m = String(parts[0]).match(/(\.[A-Za-z0-9]+)\.part$/);
  const type = m ? hubMime("x" + m[1]) : "application/octet-stream";
  return {ok:true, blob:new Blob(blobs, {type})};
}

/* 열어 볼 임시 주소를 받는다. 기본 한 시간짜리다.
   ★ name 을 주면 「열기」가 아니라 「내려받기」가 된다 (2026-08-22 오후).
     Supabase 가 주소 끝의 download 를 보고
     Content-Disposition: attachment 를 붙여 보낸다.
     폰에서는 브라우저가 띄우지 않고 곧바로 파일로 떨어진다.

     ★ 이름을 함께 준다. 안 주면 저장소에 담긴 이름
       (MIA-002__arc__AR-2026-001.pdf) 그대로 떨어져
       나중에 무슨 파일인지 알 수 없다.
     ★ 이름에 / \\ : * ? " < > | 가 들어가면 안 된다.
       윈도우가 저장을 거부한다. 아래에서 걸러 낸다. */
async function hubFileUrl(path, sec, name){
  try{
    const r = await fetch(`${SB_URL}/storage/v1/object/sign/${SB_BUCKET}/${encodeURIComponent(path)}`, {
      method:"POST",
      headers:sbHead(),
      body: JSON.stringify({expiresIn: sec || 3600})
    });
    if(!r.ok) return null;
    const j = await r.json();
    if(!j.signedURL) return null;
    let u = SB_URL + "/storage/v1" + j.signedURL;
    if(name) u += (u.indexOf("?")>=0 ? "&" : "?")
      + "download=" + encodeURIComponent(hubSafeName(name));
    return u;
  }catch(e){ return null; }
}

/* 파일 이름으로 쓸 수 없는 글자를 걸러 낸다 */
function hubSafeName(name){
  const s = String(name || "자료").replace(/[\\/:*?"<>|]/g, "-").trim();
  return s.length > 80 ? s.slice(0, 80) : (s || "자료");
}

/* ★ 내려받을 이름을 만든다.
   조합원이 여러 건을 받으시면 폴더에 섞이므로
   제목만으로는 무엇인지 알기 어렵다. 날짜를 앞에 붙인다.
     2026-08-22_임시총회 소집공고.pdf */
function hubDownName(title, at, file){
  const ext = (String(file||"").match(/\.[A-Za-z0-9]+$/) || [".pdf"])[0].toLowerCase();
  const day = String(at || "").slice(0, 10);
  return (day ? day + "_" : "") + hubSafeName(title) + ext;
}

/* 지운다 — 결재 전 잘못 올리셨을 때만 쓴다 */
async function hubFileDel(path){
  try{
    const r = await fetch(`${SB_URL}/storage/v1/object/${SB_BUCKET}/${encodeURIComponent(path)}`, {
      method:"DELETE",
      headers:sbHead()
    });
    return r.ok;
  }catch(e){ return false; }
}

/* 크기를 읽기 좋게 */
const hubSize = n => !n ? "—"
  : n < 1024 ? n + "B"
  : n < 1024*1024 ? Math.round(n/1024) + "KB"
  : (n/1024/1024).toFixed(1) + "MB";

/* ── 국토교통부 실거래가 중계 부르기 (2026-08-22) ─────────
   ★ 인증키는 여기에 없다. Edge Function 안에만 있다.
     화면에 키를 두면 누구나 개발자 도구로 꺼내 자기 프로그램에 쓴다.
     일일 한도가 우리 것으로 소진되고, 넘기면 조합원 화면이 멈춘다.

   ★ 이 함수는 운영자가 [지금 받아오기] 를 누를 때만 돈다.
     조합원이 화면을 열 때마다 부르면 하루 한도(1,000회)를 못 넘긴다.
     받아온 것은 app_state("deals") 에 담고 조합원은 그것을 읽는다.

   ★ 실패해도 절대 예외를 던지지 않는다.
     화면 쪽에서 try 를 빠뜨리면 그 화면이 통째로 안 그려진다.
     언제나 {ok:…} 를 돌려주고 화면이 무엇을 보여줄지 정하게 한다.  */
const RTMS_URL = SB_URL + "/functions/v1/rtms";

async function rtmsFetch(opt){
  const o = opt || {};
  const q = new URLSearchParams({
    lawd: o.lawd || "",          /* 쉼표로 여럿 넣을 수 있다 */
    from: o.from || "",
    to:   o.to   || "",
    kind: o.kind || "all"
  });
  if(o.mode) q.set("mode", o.mode);
  /* ★ 60초에서 끊는다.
     구를 여럿 고르면 호출이 배로 늘어난다.
     강북+성북 2년치면 50회라 국토부가 느릴 때 1분 가까이 걸린다.
     그동안 화면이 멈춰 있으면 다시 누르시고, 한도만 두 배로 쓴다. */
  const ac = (typeof AbortController !== "undefined") ? new AbortController() : null;
  const timer = ac ? setTimeout(() => ac.abort(), 60000) : null;
  try {
    const r = await fetch(RTMS_URL + "?" + q.toString(), {
      headers: {apikey: SB_KEY, Authorization: "Bearer " + SB_KEY},
      signal: ac ? ac.signal : undefined
    });
    if(timer) clearTimeout(timer);
    if(!r.ok) return {ok:false, reason:"http", message:"중계 서버가 " + r.status + " 를 돌려주었습니다."};
    return await r.json();
  } catch(e){
    if(timer) clearTimeout(timer);
    const aborted = e && (e.name === "AbortError");
    return {ok:false, reason: aborted ? "timeout" : "net",
      message: aborted
        ? "60초 안에 답이 오지 않았습니다. 구를 줄이거나 기간을 줄여 다시 받아 보십시오."
        : "중계 서버에 닿지 못했습니다. rtms 함수가 배포되어 있는지 확인해 주십시오."};
  }
}
