/* ═══════════════════════════════════════════════════════════
   다알아 (Da-Ara) — 회원사(구역) · 홈 화면 · 전역 법령
   ───────────────────────────────────────────────────────────
   ★ 고유번호 규칙 : 지역 3자리 + 구역번호 3자리
       MIA-002  미아 2구역
       JAN-001  장위 1구역
       HEU-003  흑석 3구역

     이 번호가 화면 표시이자 곧 데이터베이스의 tenant_id 다.
     화면과 내부 값이 다르면 감사 로그를 볼 때마다 머릿속으로
     변환해야 하고, 언젠가 반드시 사고가 난다. 그래서 하나로 쓴다.

     한 번 정하면 바꾸지 않는다.
     DB 행 · 접근제어(RLS) · 파일 폴더 · 감사 로그가 전부 이 값에 묶인다.

   ★ 구역 제원(면적 · 세대수 · 최고층수)은 여기서 고칠 수 없다.
     그 값은 고시 원문에서 뽑아 검산 23개 규칙을 통과한 것이다.
     4,003세대는 분양 3,293 + 임대 710 으로 맞아떨어지고,
     179,566.0㎡ 는 용도지역 면적 합계와 일치한다.

     운영자가 손으로 고치면 검산이 깨지는데
     조합원 앱에는 여전히 "검산 통과" 라고 표시된다.
     다알아의 가장 큰 강점이 거짓말이 되는 순간이다.

     그래서 이미지 · 명칭 · 주소만 바꿀 수 있고
     제원은 읽기 전용이다. 고치려면 고시 자료를 다시 올려야 한다.

   ★ Supabase 대응
       tenant        ← TENANTS      (회원사 · 구독 · 단계)
       tenant_home   ← TENANTS[].home     (홈 화면 표시 설정)
       tenant_plan   ← TENANTS[].plan     (마일스톤)
       global_law    ← LAWS         (전역 법령 · 구역 구분 없음)
   ═══════════════════════════════════════════════════════════ */

/* ★ 2026-09-16 밤 — 「통합심의」와 「시공사 선정」을 더했다.
   ─────────────────────────────────────────────────────
   미아2구역은 9월 15일에 통합심의를 통과했고
   시공사 입찰제안서가 10월 12일 마감이다.
   일곱 칸으로는 조합원께 지금 어디까지 왔는지 못 알려 드린다.

   ★ 차례를 바꾸면 조합원 홈의 진행 막대도 함께 바뀐다.
     이 배열 하나가 콘솔 단추 · 조합원 막대 · 폰 미리보기를 다 정한다.
     여기만 고치면 세 군데가 함께 따라온다.

   ★ 아홉 칸은 폰 한 화면에 안 들어간다.
     좌우로 미는 것으로 풀되 스크롤바는 숨긴다. */
const STAGES = ["정비구역 지정","추진위","조합설립","통합심의","시공사 선정",
                "사업시행인가","관리처분","착공","입주"];

/* ═══════════════════════════════════════════════════════════
   조합 사무실 · 임원 · 대의원   (2026-08-21)
   ───────────────────────────────────────────────────────────
   ★ 조합원이 정말 필요한 것은 주소와 전화번호다.
     어르신들께 주소만 드리면 못 찾아오신다.
     지도 앱으로 바로 넘겨 드린다.

   ★ 임원 개인 휴대폰은 넣지 않는다.
     조합장 번호가 500분께 공개되면 밤낮없이 전화가 온다.
     결국 안 받으시게 되고, 그때부터 전화를 피한다는 말이 나온다.
     사무실 대표번호로 받고, 임원은 이름과 직책만 알린다.

   ★ 임원은 실명으로 낸다.
     조합원이 뽑은 분들이라 성명 공개가 원칙이고
     정보공개 청구 대상이기도 하다.
   ═══════════════════════════════════════════════════════════ */
let OFFICE = (typeof hubLoad !== "undefined") ? hubLoad("office", {
  name:"", addr:"", addr2:"", tel:"", fax:"", hours:"", way:""
}) : {name:"", addr:"", addr2:"", tel:"", fax:"", hours:"", way:""};

/* ═══════════════════════════════════════════════════════════
   ★ 조합 임원 직책 (2026-08-23)
   ───────────────────────────────────────────────────────────
   ★ 손으로 치게 두면 「조합장」 「조합 장」 「조합장(직무대행)」이 섞인다.
     조합원 앱은 정확히 「조합장」인 것만 위에 펼쳐 보여 주므로
     한 글자만 달라도 아래 접힌 자리로 내려간다.
     정작 조합장이 안 보이고 이사가 위에 뜬다.

   ★ 도시정비법 제41조 · 정관에서 정하는 직책이다.
     직무대행은 따로 두었다. 해임·사임 뒤에 실제로 자주 생긴다.

   ★ 「그 밖」은 정관에 없는 직책을 넣으실 자리다.
     고르시면 옆 칸에 직접 치실 수 있다.
   ═══════════════════════════════════════════════════════════ */
const OFFICER_ROLES = [
  "조합장", "조합장 직무대행",
  "총무이사", "상근이사", "이사",
  "감사",
  "사무장", "그 밖"
];
/* 조합원 앱에서 위에 펼쳐 보이는 직책 */
const OFFICER_TOP = /^(조합장|조합장 직무대행|총무이사|감사)$/;

let OFFICER = (typeof hubLoad !== "undefined") ? hubLoad("officer", []) : [];
let DELEGATE = (typeof hubLoad !== "undefined")
  ? hubLoad("delegate", {at:"", term:"", names:[]}) : {at:"", term:"", names:[]};

/* ═══════════════════════════════════════════════════════════
   역대 임원 이력 (2026-08-23)
   ───────────────────────────────────────────────────────────
   ★ 왜 필요한가

     조합은 20년을 간다. 그 사이 임원이 여러 번 바뀐다.
     조합원이 「그때 조합장이 누구였나」를 물으시는 일이 잦고,
     **소송에서는 「그 계약을 누가 결재했나」가 다투어진다.**

     지금 화면은 「현재 임원」만 담는다. 바뀌면 앞의 것이 사라진다.
     그러면 나중에 답할 것이 없다.

   ★ 지우지 않는다 (절대 규칙 ①).
     임기가 끝나도 남긴다. 해임된 분도 남긴다.
     **불리한 것을 지우면 「숨겼다」는 말이 나온다.**
     조합 임원은 조합원이 뽑은 분들이고 정보공개 청구 대상이다.

   ★ 지금 임원은 한 기수만 「현재」다.
     새 기수를 「현재로」 하면 앞의 것은 저절로 지난 기수가 된다.
     둘이 동시에 현재이면 조합원 화면에 임원이 두 벌 나온다.

   ★ 근거 총회를 함께 적는다.
     「2026-03-20 정기총회 제3호 안건」이 있어야
     구청이 「이 임원은 무슨 근거로 선임됐냐」고 물을 때 답이 된다.
   ═══════════════════════════════════════════════════════════ */
let OFF_HIST = (typeof hubLoad !== "undefined") ? hubLoad("off_hist", []) : [];

/* 기수 정렬 — 최근이 위 */
const histRows = () => OFF_HIST.slice().sort((a,b) =>
  (b.from||"").localeCompare(a.from||"") || (b.gi||0)-(a.gi||0));
const histNow  = () => OFF_HIST.find(h => h.now) || null;

/* 다음 기수 번호 */
function histNextGi(){
  let m = 0; OFF_HIST.forEach(h => { if(+h.gi > m) m = +h.gi; });
  return m + 1;
}

/* ★ 「현재」는 한 기수뿐이다 */
function histSetNow(id, who){
  OFF_HIST.forEach(h => { h.now = (h.id === id); });
  officePut(who);
}

/* ★★★ 2026-08-31 — 저장이 실패해도 「저장했습니다」가 떴다 ★★★

   예전에는 hubPush 를 넷 던져 놓고 결과를 보지 않았다.
   서버가 거절해도 화면은 「저장했습니다」라고 알렸다.
   직원은 다 된 줄 알고 창을 닫으시고, 자료는 없다.

   ★ 결과를 기다려서 돌려준다. 부르는 쪽이 반드시 확인한다. */
async function officePut(who){
  if(typeof hubPush === "undefined")
    return {ok:false, why:"서버에 닿는 장치가 없습니다."};
  const r = await Promise.all([
    hubPush("office",   OFFICE,   who),
    hubPush("officer",  OFFICER,  who),
    hubPush("delegate", DELEGATE, who),
    hubPush("off_hist", OFF_HIST, who)
  ]);
  if(r.every(Boolean)) return {ok:true};
  const nm = ["사무실","임원","대의원","역대 임원"].filter((_,i)=>!r[i]);
  return {ok:false, why:`${nm.join(" · ")} 을(를) 서버에 담지 못했습니다.\n`
    + (typeof HUB_WHY !== "undefined" && HUB_WHY ? HUB_WHY + "\n" : "")
    + "인터넷을 확인하시고 다시 눌러 주십시오."};
}
if(typeof hubPoll !== "undefined"){
  const take = (k, set) => hubPoll(k, v => {
    if(!v) return;
    const el = document.activeElement, t = el ? (el.tagName||"").toUpperCase() : "";
    if(t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    set(v); if(typeof render !== "undefined") render();
  }, 60);
  take("office",   v => { OFFICE = v; });
  take("officer",  v => { OFFICER = v; });
  take("delegate", v => { DELEGATE = v; });
  take("off_hist", v => { OFF_HIST = v; });
}

/* 지도 앱으로 바로 넘긴다. 출발지는 지금 계신 곳, 도착지는 사무실. */
function mapUrl(kind){
  const q = encodeURIComponent(
    (OFFICE.addr || "") + (OFFICE.addr2 ? " " + OFFICE.addr2 : ""));
  const nm = encodeURIComponent(OFFICE.name || "조합 사무실");
  if(kind === "naver")
    return `https://map.naver.com/p/search/${q}`;
  return `https://map.kakao.com/link/search/${q}`;
}

/* ═══════════════════════════════════════════════════════════
   의결 기록   (2026-08-21)
   ───────────────────────────────────────────────────────────
   ★ 부결된 것도 반드시 함께 남긴다.
     가결된 것만 올리면 나중에 "불리한 건 숨겼다"는 말이 나온다.
     조합 자료는 유리한 것만 골라 보이는 순간 신뢰를 잃는다.

   ★ 누가 어떻게 투표했는지는 남기지 않는다.
     비밀투표다. 숫자만 남는다.

   ★ 숫자는 회의록 원문과 대조를 마친 것만 올린다.
     틀린 숫자가 조합원께 나가면 그것으로 다툰다.
   ═══════════════════════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════
   ★★★ 의결 기록은 정식 표를 쓴다 (2026-08-23) ★★★
   ───────────────────────────────────────────────────────────
   ★ app_state 에서 옮긴 이유

     app_state 는 목록 전체를 통째로 갈아 끼운다.
     두 사람이 같은 시간에 올리면 나중 것이 앞의 것을 지운다.
     **결재가 붙는 순간 조합장과 직원이 동시에 손을 댄다.**
     그리고 개발자 도구를 아는 사람이 「가결」을 「부결」로 바꿀 수 있다.

     → public.decision 표 · sql/011_decision.sql

   ★ 가결 여부와 정족수는 DB 가 셈한다 (v_decision 뷰).
     직원이 「가결」이라고 적는 것이 아니라 숫자에서 나온다.
     화면에도 같은 계산이 있지만 **DB 값을 먼저 쓴다.**
     둘이 다르면 DB 가 맞다. 화면은 고쳐질 수 있어도 DB 는 아니다.

   ★ 표가 아직 없으면 예전 app_state 를 읽는다.
     011 을 안 돌리신 분이 화면을 열었을 때 빈 화면이 되면 안 된다.
   ═══════════════════════════════════════════════════════════ */
let DECISION = (typeof hubLoad !== "undefined") ? hubLoad("decision", []) : [];
let DEC_DB   = false;          /* 정식 표를 쓰고 있는가 */
let DEC_ERR  = "";             /* 못 읽었을 때 이유 */

/* 표 한 줄 → 화면이 쓰는 모양 */
function decFromRow(r){
  return {
    id:r.id, kind:r.kind||"mtg",
    date:r.decided_on||"", meeting:r.meeting||"", no2:r.agenda_no||0,
    title:r.title||"", rule:r.rule||"all2",
    total:r.total_n||0, att:r.attend_n||0,
    yes:r.yes_n||0, no:r.no_n||0, abs:r.abstain_n||0,
    note:r.memo||"", link:r.link_ref||"",
    path:r.file_path||"", file:r.file_name||"", size:r.file_size||0,
    ap:!!r.approved, apAt:(r.approved_at||"").slice(0,16).replace("T"," "),
    apBy:r.approved_by||"", by:r.created_by||"",
    /* ★ 어느 총회 · 어느 안건에서 나온 것인가 (2026-08-31 · 014)
       총회에서 불러오면 붙는다. 손으로 넣은 것은 비어 있다. */
    mtId:r.meeting_id||null, agId:r.agenda_id||null,
    /* ★ DB 가 셈한 값 — 화면 계산보다 이것을 먼저 쓴다 */
    dbNeed:r.need_n, dbOk:r.passed, dbInvalid:r.invalid_n
  };
}
/* 화면 모양 → 표 한 줄 */
function decToRow(d){
  return {
    kind:d.kind||"mtg", decided_on:d.date, meeting:d.meeting||null,
    agenda_no:+d.no2||null, title:d.title, rule:d.rule||"all2",
    total_n:+d.total||0, attend_n:+d.att||0,
    yes_n:+d.yes||0, no_n:+d.no||0, abstain_n:+d.abs||0,
    memo:d.note||null, link_ref:d.link||null,
    file_path:d.path||null, file_name:d.file||null, file_size:d.size||null,
    /* ★ 014 를 안 돌리셨으면 이 칸이 표에 없다.
       null 을 보내면 PostgREST 가 「없는 칸」이라고 막는다.
       그래서 값이 있을 때만 싣는다. */
    ...(d.mtId ? {meeting_id:d.mtId} : {}),
    ...(d.agId ? {agenda_id:d.agId}  : {})
  };
}

/* ★ 표에서 다시 읽어 온다. 화면은 늘 이것을 부른다. */
async function decisionSync(){
  if(typeof dbList === "undefined") return false;
  const r = await dbList("v_decision", "order=decided_on.desc,agenda_no.desc");
  if(!r.ok){
    DEC_ERR = r.why || "";
    /* ★ 표가 아직 없으면 예전 자료로 보여 드린다. 빈 화면이 되면 안 된다. */
    if(!DEC_DB && typeof hubPull !== "undefined"){
      const v = await hubPull("decision", null);
      if(Array.isArray(v)) DECISION = v;
    }
    return false;
  }
  DEC_DB = true; DEC_ERR = "";
  DECISION = r.rows.map(decFromRow);
  return true;
}

/* 넣기 · 고치기 · 지우기 — 한 줄씩 */
async function decisionAdd(d, who){
  if(!DEC_DB) return {ok:false, why:"표가 아직 준비되지 않았습니다.\n"
    + "Supabase 에서 sql/011_decision.sql 을 돌려 주십시오."};
  const row = decToRow(d); row.created_by = who || null;
  const r = await dbAdd("decision", row);
  if(r.ok) await decisionSync();
  return r;
}
async function decisionSet(id, d, who){
  if(!DEC_DB) return {ok:false, why:"표가 아직 준비되지 않았습니다."};
  const row = decToRow(d); row.updated_by = who || null;
  const r = await dbSet("decision", id, row);
  if(r.ok) await decisionSync();
  return r;
}
async function decisionDel(id){
  if(!DEC_DB) return {ok:false, why:"표가 아직 준비되지 않았습니다."};
  const r = await dbDel("decision", id);
  if(r.ok) await decisionSync();
  return r;
}
/* 결재만 따로 — 숫자를 건드리지 않는다 */
async function decisionApprove(id, on, who){
  if(!DEC_DB) return {ok:false, why:"표가 아직 준비되지 않았습니다."};
  const r = await dbSet("decision", id, on
    ? {approved:true,  approved_by:who || null, approved_at:new Date().toISOString()}
    : {approved:false, approved_by:null, approved_at:null});
  if(r.ok) await decisionSync();
  return r;
}

/* 예전 이름 — 화면 코드를 한꺼번에 안 고치려고 남겨 둔다 */
function decisionPut(who){
  if(!DEC_DB && typeof hubPush !== "undefined") hubPush("decision", DECISION, who);
}

/* 처음 한 번 읽고, 20초마다 다시 본다.
   ★ 직원이 치고 계실 때는 갈아엎지 않는다. */
if(typeof dbList !== "undefined"){
  decisionSync().then(ok => { if(ok && typeof render !== "undefined") render(); });
  setInterval(async () => {
    const el = document.activeElement, t = el ? (el.tagName||"").toUpperCase() : "";
    if(t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    const before = JSON.stringify(DECISION);
    if(await decisionSync() && JSON.stringify(DECISION) !== before
       && typeof render !== "undefined"){
      /* ★ 쓰던 글을 먼저 담는다 (2026-09-20 · 110절). 직원 화면에만 있다. */
      if(typeof keepAll === "function") keepAll();
      render();
    }
  }, 20000);
}

/* ═══════════════════════════════════════════════════════════
   ★★★ 회의 종류마다 모수와 요건이 다르다 (2026-08-23) ★★★
   ───────────────────────────────────────────────────────────
   ★ 이걸 안 나누면 정족수 판정이 통째로 틀린다.

     총회      조합원 97명이 모수      도시정비법 제45조
     대의원회   대의원 25명이 모수      정관에서 정함
     이사회     이사 7명이 모수        정관에서 정함

     대의원회 기록에 총원 97을 넣으면 「과반 49명」이 필요하다고 나온다.
     실제로는 13명이면 되는데 **미달로 판정되어 가결이 부결이 된다.**
     그 기록이 조합원 앱에 나가면 되돌릴 수 없다.

   ★ 모수는 정관에서 정한다.
     법은 「정관으로 정한다」고만 하고 실제 숫자는 정관에 있다(6번 절).
     정관이 올라오면 그 값으로 고쳐야 한다. 화면에서 고칠 수 있다.

   ★ 요건 목록도 회의마다 다르게 보인다.
     대의원회에 「조합원 2/3」이 보이면 직원이 잘못 고르신다.
   ═══════════════════════════════════════════════════════════ */
const DEC_KINDS = {
  mtg  : {name:"총회",     short:"총회",
          base:"도시정비법 제45조 · 조합 정관",
          rules:["all2","two3","half","att2"],
          note:"조합원 과반수 출석에 출석 조합원 과반수 찬성이 원칙입니다. " +
               "정관 변경 · 시공자 선정 등은 조합원 2/3 이상입니다."},
  del  : {name:"대의원회", short:"대의원",
          base:"조합 정관 · 대의원회 규정",
          rules:["all2","half","two3","att2"],
          note:"대의원 과반수 출석에 출석 과반수 찬성이 보통입니다. " +
               "총회 권한을 대행하는 사항은 정관에서 따로 정합니다."},
  brd  : {name:"이사회",   short:"상임간부",
          base:"조합 정관 · 이사회 규정",
          rules:["all2","half"],
          note:"이사 과반수 출석에 출석 과반수 찬성이 보통입니다. " +
               "이사회 의결로 총회 부의 안건을 정합니다."}
};
/* 회의별 총원 기본값 — 정관에서 정한다. 화면에서 고칠 수 있다. */
let DEC_BASE = (typeof hubLoad !== "undefined")
  ? hubLoad("dec_base", {mtg:0, del:25, brd:7}) : {mtg:0, del:25, brd:7};

/* ★ 회의별 총원도 표에서 읽는다 (decision_base).
   정관에서 정하는 값이라 구역마다 다르다. */
async function decBaseSync(){
  if(typeof dbList === "undefined") return false;
  const r = await dbList("decision_base");
  if(!r.ok) return false;
  r.rows.forEach(x => { DEC_BASE[x.kind] = x.total_n; });
  return true;
}
if(typeof dbList !== "undefined") decBaseSync();
/* 총회 모수는 의결권자 수를 쓴다 (0이면 자동) */
/* ═══════════════════════════════════════════════════════════
   회의체 총원 — 명단이 있으면 명단이 총원이다 (2026-08-31)
   ───────────────────────────────────────────────────────────
   ★ 왜 바꿨나

     직원이 사무실·임원 화면에 대의원 104분을 다 넣으셨는데,
     의결 기록의 대의원회 총원은 기본값 25 에 머물러 있었다.
     그래서 「총원 25 · 참석 81」 이라는 기록이 만들어졌다.
     참석이 총원보다 56명 많다. 정족수가 통째로 틀린다.

     ★ 같은 것을 두 군데에 치게 하면 반드시 어긋난다.
       명단을 넣으셨으면 그 수가 총원이다.

   ★ 총회가 조합원 명부에서 자동으로 오는 것과 같은 방식이다.

   ★ 그래도 [고치기]로 다르게 정할 수 있다.
     정관이 대의원 정수를 「조합원의 10분의 1 이상」처럼 정해 두고,
     사임·해임으로 자리가 비면 정수와 현원이 달라진다.
     모수를 무엇으로 볼지는 정관이 정한다.
     다르게 정하셨으면 화면이 「명단과 다릅니다」라고 적어 준다.
     말없이 다르면 나중에 왜 그런지 아무도 모른다.

   ★★★ 이미 담긴 의결 기록의 총원은 건드리지 않는다 ★★★
     그때 그 회의의 모수는 그때의 인원이다.
     지난 기록의 숫자가 나중에 저절로 바뀌면 그게 더 큰 사고다.
     새로 넣는 기록부터 새 숫자를 쓴다.
   ═══════════════════════════════════════════════════════════ */

/* 명단에서 센 수 — 없으면 0 */
function decBaseFromRoster(kind){
  if(kind === "mtg")
    return (typeof VOTER_N !== "undefined") ? VOTER_N() : 0;
  if(kind === "del")
    return (typeof DELEGATE !== "undefined" && DELEGATE.names)
      ? DELEGATE.names.length : 0;
  if(kind === "brd"){
    /* 이사회 총원 — 임원 가운데 이사만 센다.
       ★ 감사는 이사회 구성원이 아니다. 의결권이 없다.
         조합장·직무대행은 이사이므로 센다. */
    if(typeof OFFICER === "undefined") return 0;
    return OFFICER.filter(x => {
      const r = String(x.role || "");
      if(!String(x.name || "").trim()) return false;
      if(/감사/.test(r)) return false;
      return /이사|조합장/.test(r);
    }).length;
  }
  return 0;
}

/* 화면이 쓰는 총원 — 손으로 정하신 값이 있으면 그것이 먼저 */
function decBaseOf(kind){
  const v = +(DEC_BASE[kind] || 0);
  if(v) return v;
  return decBaseFromRoster(kind);
}

/* 손으로 정한 값이 명단과 다른가 — 화면이 짚어 준다 */
function decBaseGap(kind){
  const set = +(DEC_BASE[kind] || 0);
  const now = decBaseFromRoster(kind);
  return (set && now && set !== now) ? {set, now} : null;
}
async function decBasePut(who, kind){
  if(typeof dbUpsert !== "undefined"){
    const r = await dbUpsert("decision_base",
      {kind:kind, total_n:+DEC_BASE[kind]||0, updated_by:who||null},
      "tenant_id,kind");
    if(r.ok) return true;
  }
  if(typeof hubPush !== "undefined") hubPush("dec_base", DEC_BASE, who);
  return false;
}

/* 의결 요건 — 안건에 따라 다르다.
   ★ 「조합원」은 그 회의체의 구성원을 뜻한다.
     대의원회에서는 대의원, 이사회에서는 이사다. */
const DEC_RULE = {
  half   : {name:"출석 과반수",      need:(a,t)=>Math.floor(a/2)+1},
  all2   : {name:"구성원 과반수",    need:(a,t)=>Math.floor(t/2)+1},
  two3   : {name:"구성원 2/3 이상",  need:(a,t)=>Math.ceil(t*2/3)},
  att2   : {name:"출석 2/3 이상",    need:(a,t)=>Math.ceil(a*2/3)}
};
/* 회의 종류에 맞춰 이름을 바꾼다 — 총회에서는 「조합원 과반수」로 보인다 */
function decRuleName(rk, kind){
  const r = DEC_RULE[rk] || DEC_RULE.half;
  if(kind === "mtg") return r.name.replace("구성원", "조합원");
  if(kind === "del") return r.name.replace("구성원", "대의원");
  if(kind === "brd") return r.name.replace("구성원", "이사");
  return r.name;
}

/* 한 건을 셈해서 돌려준다 */
function decCalc(d){
  const total = +d.total || 0, att = +d.att || 0;
  const yes = +d.yes || 0, no = +d.no || 0;
  /* ★ 기권을 따로 센다 (2026-08-23).
     예전에는 「찬성 + 반대 < 참석」이면 한 번 여쭙기만 했다.
     기권이 몇 명인지 남지 않아 나중에 「그 차이는 뭐냐」에 답할 수 없었다.
     ★ 기권은 찬성도 반대도 아니다. 찬성률 계산에서 뺀다. */
  const abs = +d.abs || 0;
  const cast = yes + no;
  const kind = d.kind || "mtg";
  const rule = DEC_RULE[d.rule] || DEC_RULE.half;
  const need = rule.need(att, total);
  /* ★ DB 가 셈한 값이 있으면 그것을 쓴다 (2026-08-23).
     화면 계산은 폼에서 미리보기용이고, 담긴 기록은 DB 값이 맞다.
     화면 코드는 고쳐질 수 있어도 DB 는 아니다. */
  const need2 = (d.dbNeed != null) ? d.dbNeed : need;
  const ok2   = (d.dbOk   != null) ? !!d.dbOk : (yes >= need);
  return {
    total, att, yes, no, abs, cast, need: need2,
    ruleName: decRuleName(d.rule, kind), kind,
    kindName: (DEC_KINDS[kind]||DEC_KINDS.mtg).name,
    /* 안 세어진 표 — 기권까지 넣고도 참석과 안 맞으면 무효표 */
    gap: (d.dbInvalid != null) ? d.dbInvalid : (att - (yes + no + abs)),
    yesRate: cast ? Math.round(yes * 100 / cast) : 0,
    noRate : cast ? Math.round(no  * 100 / cast) : 0,
    attRate: total ? Math.round(att * 100 / total) : 0,
    ok: ok2
  };
}

/* 기간으로 고른다 */
function decList(from, to, kind){
  return DECISION
    .filter(d => !from || (d.date||"") >= from)
    .filter(d => !to   || (d.date||"") <= to)
    .filter(d => !kind || kind === "all"
      || (kind === "ok" ? decCalc(d).ok : !decCalc(d).ok))
    .sort((a,b) => (b.date||"").localeCompare(a.date||"")
                || (b.no2||0) - (a.no2||0));
}

/* ═══════════════════════════════════════════════════════════
   문의 · 답변   (2026-08-21)
   ───────────────────────────────────────────────────────────
   ★ 조합원이 무엇을 물었고 조합이 뭐라 답했는지 남긴다.
     전화로만 주고받으면 "그런 말 한 적 없다"가 된다.

   ★ 개인 사안(분담금 · 권리가액)은 본인만 본다.
   ═══════════════════════════════════════════════════════════ */
let ASKLOG = (typeof hubLoad !== "undefined") ? hubLoad("asklog", []) : [];
let ASK_SEQ = (typeof hubLoad !== "undefined") ? hubLoad("asklog_seq", 0) : 0;
function askPut(who){
  if(typeof hubPush === "undefined") return;
  hubPush("asklog", ASKLOG, who);
  hubPush("asklog_seq", ASK_SEQ, who);
}
if(typeof hubPoll !== "undefined"){
  hubPoll("asklog_seq", v => { ASK_SEQ = Math.max(ASK_SEQ, v || 0); }, 30);
  hubPoll("asklog", v => {
    if(!v || JSON.stringify(v) === JSON.stringify(ASKLOG)) return;
    ASKLOG = v;
    const el = document.activeElement, t = el ? (el.tagName||"").toUpperCase() : "";
    if(t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    if(typeof render !== "undefined") render();
  }, 30);
}
const QNA_KIND = {money:"분담금 · 권리가액", num:"수치 오류 신고",
                  doc:"자료 요청", etc:"그 밖의 문의"};
function askNew(no, name, kind, body, who){
  const d = new Date(), z = v => String(v).padStart(2,"0");
  const rec = {
    id: "Q-" + d.getFullYear() + "-" + String(++ASK_SEQ).padStart(4,"0"),
    voter: no, name, kind, body,
    at: `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} `
      + `${z(d.getHours())}:${z(d.getMinutes())}`,
    reply: "", replyAt: "", replyBy: "", state: "open"
  };
  ASKLOG.push(rec); askPut(who || name);
  return rec;
}
const askMine = no => ASKLOG.filter(x => x.voter === no)
  .sort((a,b) => (b.at||"").localeCompare(a.at||""));

/* ═══════════════════════════════════════════════════════════
   자주 묻는 질문   (2026-08-21)
   ───────────────────────────────────────────────────────────
   ★ 같은 질문이 스무 분께 오면 스무 번 답해야 한다.
     직원이 답하면서 "이건 다들 궁금해하시겠다" 싶은 것을 공개로 돌린다.

   ★ 이름은 빼고 질문과 답만 남긴다.
     누가 물었는지는 개인 사안이다.

   ★ 조합원이 직접 쓰는 게시판은 두지 않는다.
     반대파와 찬성파가 댓글로 싸우면 조합이 관리할 수도 지울 수도 없다.
     지우면 "입막음한다"는 말이 나온다.
   ═══════════════════════════════════════════════════════════ */
let FAQ = (typeof hubLoad !== "undefined") ? hubLoad("faq", []) : [];
function faqPut(who){ if(typeof hubPush !== "undefined") hubPush("faq", FAQ, who); }
if(typeof hubPoll !== "undefined")
  hubPoll("faq", v => {
    if(!v || JSON.stringify(v) === JSON.stringify(FAQ)) return;
    FAQ = v;
    const el = document.activeElement, t = el ? (el.tagName||"").toUpperCase() : "";
    if(t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    if(typeof render !== "undefined") render();
  }, 30);

/* 문의 하나를 공개로 돌린다 — 이름은 빼고 질문과 답만 */
function faqAdd(askId, who){
  const x = ASKLOG.find(y => y.id === askId);
  if(!x || !x.reply) return null;
  if(FAQ.some(f => f.from === askId)) return null;   /* 두 번 올리지 않는다 */
  const d = new Date(), z = v => String(v).padStart(2,"0");
  const rec = {
    id: "F-" + d.getFullYear() + "-" + String(FAQ.length + 1).padStart(3,"0"),
    from: askId, kind: x.kind, q: x.body, a: x.reply,
    at: `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`,
    by: who || x.replyBy, hidden: false
  };
  FAQ.push(rec); faqPut(who);
  x.faq = rec.id; askPut(who);
  return rec;
}
const faqOpen = () => FAQ.filter(f => !f.hidden)
  .sort((a,b) => (b.at||"").localeCompare(a.at||""));

/* ═══════════════════════════════════════════════════════════
   시세 비교 단지   (2026-08-21)
   ───────────────────────────────────────────────────────────
   ★ 실거래가 API 는 아직 붙이지 않았다.
     국토부 공공데이터포털 인증키가 필요하고, 브라우저에서 직접 부르면
     키가 노출되고 CORS 에 막힌다. Supabase 에 중계 장치를 두어야 한다.
     지금은 운영자가 값을 넣는다. 나중에 API 를 붙이면 그 자리에 채워진다.

   ★ 출처와 기준일을 반드시 적게 한다.
     언제 것인지 모르는 시세는 조합원을 오히려 헷갈리게 한다.

   ★ 시세와 권리가액은 다른 것이다.
     시세가 높아도 권리가액은 감정평가로 따로 정해진다.
     이걸 분명히 하지 않으면 "시세대로 안 쳐줬다"는 말이 나온다.
   ═══════════════════════════════════════════════════════════ */
let MARKET = (typeof hubLoad !== "undefined") ? hubLoad("market", []) : [];
let MARKET_SET = (typeof hubLoad !== "undefined")
  ? hubLoad("market_set", {def:[], src:"", at:""}) : {def:[], src:"", at:""};

function marketPut(who){
  if(typeof hubPush === "undefined") return;
  hubPush("market", MARKET, who);
  hubPush("market_set", MARKET_SET, who);
}
if(typeof hubPoll !== "undefined"){
  hubPoll("market", v => {
    if(!v || JSON.stringify(v) === JSON.stringify(MARKET)) return;
    MARKET = v;
    const el = document.activeElement, t = el ? (el.tagName||"").toUpperCase() : "";
    if(t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    if(typeof render !== "undefined") render();
  }, 60);
  hubPoll("market_set", v => { if(v) MARKET_SET = v; }, 60);
}

/* ★ 조합원이 고른 것은 그분 폰에만 담는다.
   조합 공용 자리에 담으면 남의 선택이 섞인다. */
const MK_KEY = "daara_market_pick";
function mkPick(){
  try{
    const v = JSON.parse(localStorage.getItem(MK_KEY) || "null");
    if(Array.isArray(v) && v.length) return v.filter(id => MARKET.some(m=>m.id===id));
  }catch(e){}
  return (MARKET_SET.def || []).filter(id => MARKET.some(m=>m.id===id));
}
function mkSave(ids){
  try{ localStorage.setItem(MK_KEY, JSON.stringify(ids)); }catch(e){}
}
function mkReset(){ try{ localStorage.removeItem(MK_KEY); }catch(e){} }
const mkIsMine = () => {
  try{ return !!localStorage.getItem(MK_KEY); }catch(e){ return false; }
};

/* ★ 산수로 낸다. AI 가 말하는 것이 아니다.
   고른 단지들의 ㎡당 값을 평균 내고, 계산식을 그대로 보여 준다. */
function mkAvg(ids, mode){
  const list = MARKET.filter(m => ids.includes(m.id));
  const vals = list.map(m => +(mode === "ask" ? m.ask : m.deal) || 0).filter(v => v > 0);
  if(!vals.length) return null;
  const sum = vals.reduce((a,b) => a+b, 0);
  return {n: vals.length, sum, avg: Math.round(sum / vals.length),
          names: list.map(m => m.name), vals};
}

/* 조합원 증명 — 사무실에서 본인 확인용
   ★ 확인번호는 조합원번호와 오늘 날짜로 만든다.
     날마다 바뀌므로 남에게 넘겨도 다음 날은 쓸 수 없다. */
function memberCode(no){
  const d = new Date(), z = v => String(v).padStart(2,"0");
  const key = `${no}|${d.getFullYear()}${z(d.getMonth()+1)}${z(d.getDate())}`;
  let x = 5381;
  for(const c of key) x = ((x * 33) ^ c.codePointAt(0)) >>> 0;
  const s = String(x % 1000000).padStart(6, "0");
  return s.slice(0,3) + "-" + s.slice(3);
}

/* 구역 주소에서 시·도를 뽑는다 — "서울특별시 강북구 …" → "서울특별시" */
const sidoOf = t => {
  const a = (t && t.addr) || "";
  const m = a.match(/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원특별자치도|강원도|충청북도|충청남도|전북특별자치도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)/);
  return m ? m[1] : "";
};

/* 지금 보고 있는 구역 — hub.js 의 SB_TENANT 가 가리키는 곳 */
function thisTenant(){
  const code = (typeof SB_TENANT !== "undefined") ? SB_TENANT : "";
  return TENANTS.find(t => t.code === code) || TENANTS[0] || null;
}

/* 이 구역에 적용되는 법령만 고른다.
   전국 법령 + 그 시·도의 조례
   ★ t 를 주지 않으면 지금 보고 있는 구역으로 본다. */
function lawsFor(t){
  const sido = sidoOf(t || thisTenant());
  return LAWS.filter(l => !l.scope || l.scope === "전국" || l.scope === sido);
}
let TENANTS = [
  {code:"MIA-002", name:"미아2재정비촉진구역", short:"미아2구역",
   kind:"주택재개발", stage:"조합설립", sub:"운영중",
   addr:"서울특별시 강북구 미아동 일대",
   /* ★ 아래 셋은 고시 원장에서 온다. 손으로 고칠 수 없다. */
   facts:{area:179566.0, units:4003, floors:45, notice:"서울특별시고시 제2026-32호"},
   home:{img:"", hero:"linear-gradient(160deg,#1B3A5C 0%,#2C5580 55%,#4A7BA8 100%)",
         showPlan:true},
   plan:{approved:"2025-11-14", move:"2028-10", moveIn:"2033-12"},
   accounts:[
     {role:"조합장",   name:"김○○", scope:"전체",        active:true,  byOps:true},
     {role:"총무이사", name:"박○○", scope:"전체",        active:true,  byOps:true},
     {role:"직원",     name:"류○○", scope:"명부 제외",   active:true,  byOps:false}
   ],
   usage:{rows:1240, files:64, mb:82}},

  {code:"MIA-003", name:"미아3재정비촉진구역", short:"미아3구역",
   kind:"주택재개발", stage:"추진위", sub:"대기",
   addr:"서울특별시 강북구 미아동 일대",
   facts:{area:0, units:0, floors:0, notice:""},
   home:{img:"", hero:"linear-gradient(160deg,#2C3E50 0%,#40566E 100%)", showPlan:false},
   plan:{approved:"", move:"", moveIn:""},
   accounts:[], usage:{rows:0, files:0, mb:0}},

  {code:"MIA-004", name:"미아4재정비촉진구역", short:"미아4구역",
   kind:"주택재개발", stage:"추진위", sub:"대기",
   addr:"서울특별시 강북구 미아동 일대",
   facts:{area:0, units:0, floors:0, notice:""},
   home:{img:"", hero:"linear-gradient(160deg,#2C3E50 0%,#40566E 100%)", showPlan:false},
   plan:{approved:"", move:"", moveIn:""},
   accounts:[], usage:{rows:0, files:0, mb:0}},

  {code:"JAN-001", name:"장위1구역", short:"장위1구역",
   kind:"주택재건축", stage:"사업시행인가", sub:"미계약",
   addr:"서울특별시 성북구 장위동 일대",
   facts:{area:0, units:0, floors:0, notice:""},
   home:{img:"", hero:"linear-gradient(160deg,#3A2C4E 0%,#5A4470 100%)", showPlan:false},
   plan:{approved:"", move:"", moveIn:""},
   accounts:[], usage:{rows:0, files:0, mb:0}}
];

/* 지금 보고 있는 구역 — 조합원 앱과 직원 화면은 자기 구역만 본다
   ★ 주소로 넘어온 구역을 받는다 (2026-08-22 오후).
       admin.html?t=MIA-003
     운영자 콘솔에서 [직원 화면 열기] 로 넘어올 때 붙여 준다.

   ★ 이 파일은 hub.js 바로 다음에 읽힌다. 그래서 여기서 정해 두면
     그 뒤의 모든 hubPull · hubPush · hubPath 가 이 구역을 쓴다.
     화면마다 따로 받으면 한 곳을 빠뜨려 그 화면만 옛 구역을 본다.

   ★★★ 이것은 「화면이 어느 구역을 보여 줄까」 일 뿐 진짜 차단이 아니다 ★★★
     주소를 손으로 고치면 남의 구역이 열린다.
     지금 app_state 와 저장소 규칙이 anon 에게 전부 열려 있어서,
     주소를 막아도 개발자 도구로는 그대로 읽힌다.
     진짜 격리는 Supabase Auth 를 붙이고 RLS 를 좁혀야 생긴다.
     → 인수인계서 「배포 전 반드시 ⑱ · ⑲」

   ★ 없는 구역 코드가 오면 무시한다.
     오타 하나로 빈 화면이 나오면 무엇이 잘못됐는지 알 수 없다. */
let TENANT_CODE = (() => {
  /* hub.js 가 주소에서 이미 읽어 두었다. 여기서는 실제로 있는 구역인지만 본다.
     ★ 없는 코드가 오면 미아2 로 돌린다.
       오타 하나로 빈 화면이 나오면 무엇이 잘못됐는지 알 수 없다. */
  const c = (typeof SB_ZONE !== "undefined") ? SB_ZONE : "MIA-002";
  return TENANTS.some(t => t.code === c) ? c : "MIA-002";
})();
const TN = () => TENANTS.find(t => t.code === TENANT_CODE) || TENANTS[0];
const tnOf = c => TENANTS.find(t => t.code === c);

/* 데이터가 어떻게 갈려 있는가 — 화면에 그대로 보여 준다 */
const isolation = c => ([
  ["DB 행 구분",   `tenant_id = '${c}'`],
  ["접근 제어(RLS)", `tenant_id = current_tenant()`],
  ["파일 보관",     `storage/${c}/…`],
  ["감사 로그",     `tenant=${c} 기록`]
]);

/* 입주까지 남은 기간 — 손으로 적지 않고 계산한다 */
function untilMoveIn(t){
  const p = (t || TN()).plan;
  if(!p || !p.moveIn) return "";
  const [y, m] = p.moveIn.split("-").map(Number);
  const now = new Date();
  let mo = (y - now.getFullYear()) * 12 + (m - (now.getMonth() + 1));
  if(mo <= 0) return "입주 시작";
  const yy = Math.floor(mo / 12), mm = mo % 12;
  return `약 ${yy ? yy + "년 " : ""}${mm ? mm + "개월" : ""}`.trim();
}

/* ── 전역 법령 ─────────────────────────────────────────────
   ★ 구역별로 따로 넣지 않는다. 법은 모든 조합에 똑같이 적용된다.
     여기서 고치면 전 구역 자료실과 AI 답변에 함께 반영된다.

   ★ 원문을 복사해 두지 않고 링크를 건다.
     전문을 저장하면 개정될 때마다 낡은 조문이 남는다.
     국가법령정보센터로 연결하면 항상 현행이 나온다.
     AI 답변에는 요약과 시행일을 쓴다.
   ───────────────────────────────────────────────────────── */
/* ★ scope — 이 법이 어디에 적용되는가
     "전국"        법률 · 시행령 · 시행규칙 · 국토부 고시
     "서울특별시"   시·도 조례 · 자치법규

   조례를 전역으로 두면 경기도 조합이 들어오는 순간
   그 조합원에게 서울시 조례가 나간다.
   임대주택 의무비율은 지자체마다 다르다. */
let LAWS = [
  {id:"L1", kind:"법률", name:"도시 및 주거환경정비법", scope:"전국",
   eff:"2026-07-01", state:"현행",
   url:"https://www.law.go.kr/법령/도시및주거환경정비법",
   note:"제45조 제6항 신설로 상시 전자투표가 허용됐습니다. 제10항은 전자투표를 직접 출석으로 봅니다. (법률 제21447호)"},
  {id:"L2", kind:"시행령", name:"도시 및 주거환경정비법 시행령", scope:"전국",
   eff:"2026-07-01", state:"현행",
   url:"https://www.law.go.kr/법령/도시및주거환경정비법시행령",
   note:"전자투표 운영 기준과 총회 소집 절차를 정하고 있습니다. (대통령령 제36424호)"},
  {id:"L3", kind:"시행규칙", name:"도시 및 주거환경정비법 시행규칙", scope:"전국",
   eff:"2026-02-11", state:"현행",
   url:"https://www.law.go.kr/법령/도시및주거환경정비법시행규칙",
   note:"각종 신청 서식과 첨부 서류를 정하고 있습니다."},
  {id:"L4", kind:"조례", name:"서울특별시 도시 및 주거환경정비 조례", scope:"서울특별시",
   eff:"2026-05-18", state:"현행",
   url:"https://www.law.go.kr/자치법규/서울특별시도시및주거환경정비조례",
   note:"임대주택 의무비율과 정비계획 수립 기준이 여기 있습니다. (서울특별시조례 제10117호)"},
  {id:"L5", kind:"고시", name:"정비사업 계약업무 처리기준 (국토교통부)", scope:"전국",
   eff:"2024-11-01", state:"확인 필요",
   url:"https://www.law.go.kr/행정규칙/정비사업계약업무처리기준",
   note:"시공자 선정과 용역 계약 절차를 정한 국토부 고시입니다."}
];

const LAW_KINDS = ["법률","시행령","시행규칙","조례","고시","예규"];
const lawsActive = () => LAWS.filter(l => l.state !== "폐지");

/* ═══════════════════════════════════════════════════════════
   실거래가 (2026-08-22)
   ───────────────────────────────────────────────────────────
   ★★ 아직 국토교통부 API 가 붙어 있지 않다. ★★
     공공데이터포털 인증키를 운영자가 신청해야 하고,
     브라우저에서 직접 부르면 키가 노출되고 CORS 에 막힌다.
     Supabase 에 중계 장치를 두어야 한다.
     → 인수인계서 13번 「실거래가 자동 연동」

     그때까지는 운영자가 손으로 넣고 출처와 기준일을 함께 적는다.
     자료가 없으면 「예시」라고 화면에 그대로 적는다.
     조합원이 예시 숫자를 진짜로 아시면 그것으로 다툰다.

   ★★ 시세는 권리가액이 아니다. ★★
     이 화면 어디에도 「내 물건은 얼마」가 나오지 않는다.
     권리가액은 감정평가로 따로 정해진다.
     이걸 분명히 하지 않으면 「시세대로 안 쳐줬다」는 말이 나온다.

   ★ 지번은 본번까지만 낸다.
     실거래가 자체는 국토부가 이미 공개하는 자료라 공개해도 된다.
     다만 100명 규모 구역에서 부번까지 내면 누구 물건인지 특정된다.
     조합이 그것을 앱으로 뿌렸다는 책임이 남는다.
     명의는 아예 담지 않는다. 지번과 물건 제원만 담는다.

   ★ Supabase 대응 : deal_land · deal_apt
       구역별로 나뉘고, 운영자가 채운다 (조합 직원이 아니다).   */

/* ── 구역 내 지분 실거래 ─────────────────────────────────
   date  계약일 · kind 단독|다세대 · built 건축연도
   bun   본번 (부번은 마스킹) · lot 대지면적 · own 대지지분 · ex 전용면적
   price 거래금액(원)                                        */
let DEALS = (typeof hubLoad !== "undefined") ? hubLoad("deals", null) : null;
let APTS  = (typeof hubLoad !== "undefined") ? hubLoad("apts",  null) : null;
let MKT_SRC = (typeof hubLoad !== "undefined")
  ? hubLoad("mkt_src", null) : null;

/* ★ 시연용 예시. 실제 자료가 올라오면 그쪽이 이긴다.
   실제 명부를 올리기 전에 MKT_DEMO 를 false 로 바꾼다.
   → 「배포 전 반드시」 목록에 넣어 두었다. */
const MKT_DEMO = true;

const DEALS_SEED = [
  {date:"2026-05-14", kind:"다세대", built:2004, bun:"436", lot:198, own:33.1, ex:42.8, price:412000000},
  {date:"2026-03-22", kind:"단독",   built:1988, bun:"421", lot:132, own:132.0, ex:96.4, price:1180000000},
  {date:"2026-02-08", kind:"다세대", built:2011, bun:"440", lot:224, own:28.6, ex:38.2, price:365000000},
  {date:"2025-11-19", kind:"단독",   built:1979, bun:"436", lot:165, own:165.0, ex:82.6, price:1395000000},
  {date:"2025-09-03", kind:"다세대", built:1998, bun:"418", lot:186, own:31.5, ex:44.1, price:338000000},
  {date:"2025-06-27", kind:"단독",   built:1985, bun:"429", lot:148, own:148.0, ex:74.2, price:1210000000},
  {date:"2025-04-11", kind:"다세대", built:2007, bun:"436", lot:210, own:30.2, ex:40.5, price:352000000},
  {date:"2024-12-05", kind:"단독",   built:1982, bun:"440", lot:172, own:172.0, ex:88.0, price:1320000000},
  {date:"2024-08-16", kind:"다세대", built:2001, bun:"421", lot:192, own:32.0, ex:43.6, price:318000000},
  {date:"2024-03-29", kind:"단독",   built:1991, bun:"418", lot:140, own:140.0, ex:78.5, price:1050000000},
  {date:"2023-10-12", kind:"다세대", built:2009, bun:"429", lot:205, own:29.4, ex:39.8, price:296000000},
  {date:"2023-05-24", kind:"단독",   built:1976, bun:"436", lot:158, own:158.0, ex:80.2, price:1085000000},
  {date:"2022-11-08", kind:"다세대", built:1996, bun:"440", lot:180, own:30.8, ex:41.2, price:305000000},
  {date:"2022-06-15", kind:"단독",   built:1984, bun:"421", lot:145, own:145.0, ex:76.8, price:1020000000}
];

const APTS_SEED = [
  {id:"A1", name:"래미안트리베라", built:2010, dist:"도보 8분 · 미아동",
   types:[{py:25, ex:59.9, last:820000000, high:890000000, low:760000000, at:"2026-06"},
          {py:34, ex:84.9, last:1120000000, high:1210000000, low:1040000000, at:"2026-07"},
          {py:45, ex:114.8, last:1380000000, high:1450000000, low:1310000000, at:"2026-04"}]},
  {id:"A2", name:"꿈의숲푸르지오", built:2018, dist:"도보 12분 · 번동",
   types:[{py:25, ex:59.8, last:910000000, high:960000000, low:865000000, at:"2026-07"},
          {py:34, ex:84.7, last:1265000000, high:1340000000, low:1180000000, at:"2026-06"}]},
  {id:"A3", name:"미아뉴타운센트럴", built:2014, dist:"도보 5분 · 미아동",
   types:[{py:25, ex:59.6, last:785000000, high:840000000, low:735000000, at:"2026-05"},
          {py:34, ex:84.5, last:1058000000, high:1130000000, low:995000000, at:"2026-07"},
          {py:40, ex:101.2, last:1215000000, high:1280000000, low:1160000000, at:"2026-03"}]}
];

const MKT_SRC_SEED = {
  src:"국토교통부 실거래가 공개시스템 · 공공데이터포털",
  at:"2026-08-01",
  api:false,          /* API 연동 여부 — 붙으면 true */
  note:"운영자가 손으로 옮겨 적은 자료입니다."
};

if(!DEALS   && MKT_DEMO){ DEALS   = DEALS_SEED.slice();   DEALS.demo = true; }
if(!APTS    && MKT_DEMO){ APTS    = APTS_SEED.slice();    APTS.demo  = true; }
if(!MKT_SRC && MKT_DEMO){ MKT_SRC = Object.assign({demo:true}, MKT_SRC_SEED); }
if(!DEALS)   DEALS = [];
if(!APTS)    APTS  = [];
if(!MKT_SRC) MKT_SRC = {src:"", at:"", api:false, note:""};

/* ── 셈하기 ─────────────────────────────────────────────
   ★ 평당가는 대지 지분 기준이다.
     재개발에서 값을 정하는 것은 땅이지 건물이 아니다.
     전용면적으로 나누면 아파트 평당가와 섞여 완전히 다른 숫자가 된다.
   ★ 3.3058㎡ = 1평. 3.3 으로 어림하면 1%가 어긋난다. */
const PY = 3.3058;
const perPy = d => d.own ? Math.round(d.price / (d.own / PY)) : 0;

/* 억 · 만으로 읽기 */
function eokKRW(v){
  v = Math.round(Number(v) || 0);
  if(v >= 100000000){
    const e = Math.floor(v / 100000000);
    const m = Math.round((v % 100000000) / 10000);
    return m ? `${e}억 ${m.toLocaleString("ko-KR")}만` : `${e}억`;
  }
  if(v >= 10000) return `${Math.round(v/10000).toLocaleString("ko-KR")}만`;
  return v.toLocaleString("ko-KR");
}

/* ── 법정동 고르기 (2026-08-22) ──────────────────────────
   ★ 국토부는 구 단위로만 준다.
     강북구(11305)를 부르면 미아동 · 수유동 · 번동이 다 온다.
     그것을 그대로 「우리 구역 실거래」라고 내보내면 안 된다.
     수유동 빌라 값이 섞여 평당가가 흐려지고,
     조합원이 「우리 구역이 평당 1,800만이라던데」 하고 잘못 아신다.

   ★ 거른 것을 버리지 않는다.
     122회를 들여 받은 것을 버리기 아깝고,
     나중에 「수유동도 넣어볼까」 하실 때 다시 안 받아도 된다.
     담아 두고 켜 둔 동만 내보낸다.

   ★ 조합원은 동을 고를 수 없다.
     조합원이 수유동을 켜서 평당 2,500만이 나오면
     「우리도 그만큼 받아야 한다」는 이야기가 나온다.
     견줄 대상은 운영자가 정하는 편이 안전하다.
     인근 아파트를 운영자가 고르게 한 것과 같은 이유다. */
let DEAL_DONG = (typeof hubLoad !== "undefined")
  ? hubLoad("deal_dong", null) : null;
if(!DEAL_DONG) DEAL_DONG = [];      /* 빈 배열 = 다 보여 준다 */

/* 받아온 자료에 실제로 있는 법정동을 건수와 함께 뽑는다.
   ★ 미리 적어 두지 않는다. 자료에서 만든다.
     성북구를 넣으시면 길음동 · 정릉동이 저절로 생긴다. */
function dealDongs(){
  const by = {};
  DEALS.forEach(d => { const n = (d.dong || "").trim();
    if(n) by[n] = (by[n] || 0) + 1; });
  return Object.keys(by).sort((a,b) => by[b] - by[a])
    .map(n => ({name:n, n:by[n]}));
}

/* ═══════════════════════════════════════════════════════════
   ★ 한 건씩 빼기 (2026-09-17)
   ───────────────────────────────────────────────────────────
   동으로 거르는 것만으로는 모자랐다.
   같은 미아동이어도 **우리 구역과 상관없는 거래**가 섞인다.

     · 구역 밖 필지
     · 특수관계인 거래 (터무니없이 싸거나 비싸다)
     · 같은 물건을 두 번 신고한 것

   ★★★ 켜는 것이 아니라 **빼는 것**이다 ★★★
     6,568건을 하나씩 켤 수는 없다. 기본은 **다 나간다.**
     이상한 것만 체크를 풀어 뺀다.

   ★ 뺀 것만 담는다. 담기는 양이 적다.
     켠 것을 담으면 6,568개를 담아야 한다.

   ★ 왜 뺐는지는 안 묻는다. 물으면 안 빼신다.
     다만 **몇 건 뺐는지**는 화면에 늘 보여 드린다.
   ═══════════════════════════════════════════════════════════ */
let DEAL_OFF = (typeof hubLoad !== "undefined") ? hubLoad("deal_off", []) : [];
if(!Array.isArray(DEAL_OFF)) DEAL_OFF = [];

/* 거래 한 건을 가리키는 열쇠 — 고유 번호가 없어 셋을 이어 만든다.
   ★ 날짜 · 지번 · 가격이 모두 같은 두 건은 사실상 같은 신고다. */
const dealKey = d => `${d.date||""}|${(d.dong||"").trim()}${d.bun||""}|${d.price||""}`;

/* ★ 뺀 목록을 Set 으로 들고 있는다 (2026-09-17).
   includes 는 뺀 것이 100개면 한 건마다 100번을 본다.
   6,568건 × 100 = 65만 번. Set 은 한 번이면 끝난다. */
let DEAL_OFF_SET = new Set(DEAL_OFF);
const dealOffSync = () => { DEAL_OFF_SET = new Set(DEAL_OFF); };
const dealOff = d => DEAL_OFF_SET.has(dealKey(d));

/* 켜 둔 동만 남기고, 손으로 뺀 것도 뺀다.
   ★ 동을 아무것도 안 고르셨으면 동으로는 안 거른다. */
const dongOn = d => (!DEAL_DONG.length
  || DEAL_DONG.includes((d.dong || "").trim())) && !dealOff(d);
const dealsOn = () => DEALS.filter(dongOn);

function dongPut(who){
  if(typeof hubPush !== "undefined") hubPush("deal_dong", DEAL_DONG, who);
}
function dealOffPut(who){
  dealOffSync();
  if(typeof hubPush !== "undefined") hubPush("deal_off", DEAL_OFF, who);
}

/* 연도별 평당가 평균 — 단독 · 다세대를 갈라 낸다.
   재개발에서 둘은 값이 다르다. 섞으면 아무 뜻이 없는 평균이 된다. */
function dealTrend(kind){
  const by = {};
  /* ★ 지분이 없는 건은 뺀다.
     국토부가 연립 · 다세대의 대지권 지분을 주지 않아 own 이 0 인 건이 있다.
     0 을 섞어 평균 내면 평당가가 통째로 내려앉아 흐름이 거짓이 된다. */
  dealsOn().filter(d => (!kind || d.kind === kind) && d.own > 0).forEach(d => {
    const y = (d.date || "").slice(0, 4);
    if(!y) return;
    (by[y] = by[y] || []).push(perPy(d));
  });
  return Object.keys(by).sort().map(y => ({
    y, n: by[y].length,
    avg: Math.round(by[y].reduce((a, b) => a + b, 0) / by[y].length)
  }));
}

/* ── 실거래가 자료 서버 연동 (2026-08-22) ─────────────────
   ★ 운영자가 콘솔에서 고친 것이 조합원 폰에 나가야 한다.
     화면 안 변수에만 담으면 그 컴퓨터에서만 통한다.
     조합원 앱은 폰에서 보는 게 전부라 그러면 의미가 없다.

   ★ 20초마다 살펴본다. 조합원 앱의 원칙이다.

   ★ 칸에 커서가 있으면 미뤄 둔다.
     운영자가 아파트 이름을 치는 중에 화면이 갈아엎히면
     글자가 날아가 처음부터 다시 치셔야 한다.

   ★ 이 자료는 담아도 된다.
     국토부가 이미 공개하는 실거래가이고 명의는 담지 않는다.
     명부와 감정평가는 여기 담지 않는다는 원칙은 그대로다.  */
function mktPut(who){
  if(typeof hubPush === "undefined") return;
  hubPush("apts",    APTS,    who);
  hubPush("deals",   DEALS,   who);
  hubPush("mkt_src", MKT_SRC, who);
  hubPush("deal_dong", DEAL_DONG, who);
}
if(typeof hubPoll !== "undefined"){
  const busy = () => {
    const el = document.activeElement, t = el ? (el.tagName||"").toUpperCase() : "";
    return t === "INPUT" || t === "TEXTAREA" || t === "SELECT";
  };
  const take = (v, cur, set) => {
    if(!v || JSON.stringify(v) === JSON.stringify(cur)) return false;
    set(v); return true;
  };
  hubPoll("apts", v => {
    if(!take(v, APTS, x => APTS = x)) return;
    if(busy()) return;
    if(typeof render !== "undefined") render(true);
  }, 20);
  hubPoll("deals", v => {
    if(!take(v, DEALS, x => DEALS = x)) return;
    if(busy()) return;
    if(typeof render !== "undefined") render(true);
  }, 20);
  hubPoll("mkt_src", v => { if(v) MKT_SRC = v; }, 60);
  hubPoll("deal_dong", v => {
    if(!Array.isArray(v) || JSON.stringify(v) === JSON.stringify(DEAL_DONG)) return;
    DEAL_DONG = v;
    if(busy()) return;
    if(typeof render !== "undefined") render(true);
  }, 20);
  /* ★ 손으로 빼 둔 거래도 함께 받는다 (2026-09-17).
     ★ 이것을 빼먹으면 직원이 빼도 **조합원 폰에는 그대로 나간다.**
       담는 곳과 받는 곳은 늘 짝이다 (절대규칙 82). */
  hubPoll("deal_off", v => {
    if(!Array.isArray(v) || JSON.stringify(v) === JSON.stringify(DEAL_OFF)) return;
    DEAL_OFF = v; dealOffSync();
    if(busy()) return;
    if(typeof render !== "undefined") render(true);
  }, 20);
}

/* ★ 새 단지 · 새 평형을 만들 때 쓰는 빈 껍데기.
   빈 칸에서 시작하면 무엇을 채워야 하는지 모르신다. */
function aptNew(){
  const n = APTS.length + 1;
  return {id:"A" + Date.now().toString(36), name:"", built:"", dist:"",
          types:[{py:34, ex:84.9, last:0, high:0, low:0, at:""}]};
}
const aptType = () => ({py:25, ex:59.9, last:0, high:0, low:0, at:""});
