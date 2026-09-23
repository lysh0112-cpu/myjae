/* ═══════════════════════════════════════════════════════════
   다알아 (Da-Ara) — 단체 문자 발송
   ───────────────────────────────────────────────────────────
   ★ 알림톡은 승인받은 템플릿만 보낼 수 있다.
     문구를 마음대로 고치면 카카오가 발송을 거부한다.
     실무에서 가장 많이 걸리는 대목이라 화면에서 아예 막는다.
     자유 문구가 필요하면 SMS · LMS 를 쓰게 안내한다.

   ★ SMS 는 90바이트까지다. 넘으면 자동으로 LMS 가 된다.
     단가가 15원에서 45원으로 세 배가 된다.
     직원이 모르고 긴 문장을 쓰면 요금이 확 뛰므로 미리 세어 알려 준다.

   ★ 보내기 전에 비용을 보여 준다.
     남은 기본 제공량 안에서 끝나는지, 넘으면 얼마가 더 나오는지
     먼저 보여주고 확인을 받는다.

   ★ 번호는 화면에서 뒷자리만 보인다.
     발송에는 전체 번호가 쓰이지만, 이 화면은 명부를 옆에서
     들여다볼 수 있는 자리라 가려서 보여 준다.

   ★ Supabase 대응
       msg_template ← MSG_TPL   (승인받은 알림톡 템플릿)
       msg_batch    ← MSG_LOG   (발송 묶음 · 누가 언제 누구에게)
       usage_daily  ← USAGE     (발송 즉시 계량에 반영)
   ═══════════════════════════════════════════════════════════ */

const MSG_CH = [
  {k:"alim", name:"알림톡", tpl:true,  limit:1000, pk:"alim",
   desc:"승인받은 템플릿만 · 가장 쌉니다"},
  {k:"sms",  name:"SMS",   tpl:false, limit:90,   pk:"sms",
   desc:"90바이트까지 · 자유 문구"},
  {k:"lms",  name:"LMS",   tpl:false, limit:2000, pk:"lms",
   desc:"긴 글 · 단가가 올라갑니다"},
  {k:"mms",  name:"MMS",   tpl:false, limit:2000, pk:"mms",
   desc:"사진 첨부 · 가장 비쌉니다"}
];
const msgChOf = k => MSG_CH.find(c => c.k === k) || MSG_CH[0];

/* 카카오 심사를 마친 템플릿. 변수 자리만 채울 수 있다. */
const MSG_TPL = [
  {id:"DAARA_MTG_01", name:"총회 소집 안내",
   vars:["일시","장소"],
   body:`[다알아] 미아2재정비촉진구역 조합

#{이름}님, 2026년 정기총회를 아래와 같이 소집합니다.

일시 : #{일시}
장소 : #{장소}

전자투표는 앱에서 하실 수 있습니다.
▶ 바로가기`},

  {id:"DAARA_VOTE_01", name:"전자투표 마감 안내",
   vars:["마감일시"],
   body:`[다알아] 미아2재정비촉진구역 조합

#{이름}님, 전자투표 마감이 다가왔습니다.

마감 : #{마감일시}

아직 하지 않으셨다면 지금 하실 수 있습니다.
▶ 투표하러 가기`},

  {id:"DAARA_DOC_01", name:"새 자료 등록 안내",
   vars:["자료명"],
   body:`[다알아] 미아2재정비촉진구역 조합

#{이름}님, 새 자료가 등록되었습니다.

자료 : #{자료명}

앱 자료실에서 확인하실 수 있습니다.
▶ 자료실 열기`},

  {id:"DAARA_SVY_01", name:"설문 참여 요청",
   vars:["설문명","마감일"],
   body:`[다알아] 미아2재정비촉진구역 조합

#{이름}님, 의견을 여쭙고자 합니다.

설문 : #{설문명}
마감 : #{마감일}

법적 효력이 있는 의결이 아닌 참고용 조사입니다.
▶ 참여하기`}
];
const msgTplOf = id => MSG_TPL.find(t => t.id === id) || MSG_TPL[0];

/* 글자 수 — 한글은 2바이트로 센다 */
function byteLen(s){
  let n = 0;
  for(const c of (s || "")) n += c.charCodeAt(0) > 127 ? 2 : 1;
  return n;
}
/* SMS 로 보내려는데 90바이트를 넘으면 LMS 로 바뀐다 */
function realChannel(ch, text){
  if(ch === "sms" && byteLen(text) > 90) return "lms";
  return ch;
}

/* 야간 발송 — 밤에 100명 휴대폰이 울리면 그다음부터 차단하신다 */
const MSG_QUIET = {from:21, to:8};
const msgIsQuiet = () => { const h = new Date().getHours();
  return h >= MSG_QUIET.from || h < MSG_QUIET.to; };

/* 이번 달 남은 기본 제공량 */
function msgLeft(pk){
  const p = (typeof PRICE !== "undefined") ? PRICE.find(x => x.k === pk) : null;
  if(!p) return {incl:0, used:0, left:0, fee:0};
  const d = new Date(), z = v => String(v).padStart(2,"0");
  const ym = `${d.getFullYear()}-${z(d.getMonth()+1)}`;
  const code = (typeof TENANT_CODE !== "undefined") ? TENANT_CODE : "MIA-002";
  const u = (typeof USAGE !== "undefined")
    ? USAGE.find(x => x.code === code && x.ym === ym) : null;
  const used = u ? (u[pk] || 0) : 0;
  return {incl:p.incl, used, left:Math.max(0, p.incl - used), fee:p.fee};
}

/* 보내면 얼마가 더 나오는가 */
function msgCost(pk, n){
  const s = msgLeft(pk);
  const over = Math.max(0, n - s.left);
  return {free:n - over, over, amount:over * s.fee, ...s};
}

/* 발송 이력 */
let MSG_LOG = [
  {at:"2026-03-05 09:12", title:"총회 소집 안내", ch:"alim", n:100,
   by:"류승현2", ok:94, alt:6, fail:0},
  {at:"2026-03-17 14:40", title:"전자투표 마감 안내", ch:"alim", n:38,
   by:"류승현2", ok:36, alt:2, fail:0}
];

/* 실제 발송 — 계량에 즉시 반영한다 */
function msgSend(ch, title, n, by){
  const c = msgChOf(ch);
  /* 알림톡은 일부가 실패해 문자로 대체된다. 카카오톡을 안 쓰는 분이 있다. */
  const alt = ch === "alim" ? Math.round(n * 0.06) : 0;
  const ok  = n - alt;

  const d = new Date(), z = v => String(v).padStart(2,"0");
  const ym = `${d.getFullYear()}-${z(d.getMonth()+1)}`;
  const code = (typeof TENANT_CODE !== "undefined") ? TENANT_CODE : "MIA-002";
  if(typeof USAGE !== "undefined"){
    let u = USAGE.find(x => x.code === code && x.ym === ym);
    if(!u){ u = {code, ym, alim:0, sms:0, lms:0, mms:0, pass:0, nice:0, ai:0}; USAGE.push(u); }
    u[c.pk] += ok;
    if(alt) u.sms += alt;          /* 대체 발송은 문자로 센다 */
  }

  MSG_LOG.unshift({
    at:`${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} `
      + `${z(d.getHours())}:${z(d.getMinutes())}`,
    title, ch, n, by:by || "직원", ok, alt, fail:0
  });
  return {ok, alt, fail:0};
}

/* 미리보기 — 변수 자리를 채워 넣는다 */
function msgFill(body, vars, name){
  let s = body.replace(/#\{이름\}/g, name || "○○○");
  Object.keys(vars || {}).forEach(k => {
    s = s.split(`#{${k}}`).join(vars[k] || `#{${k}}`);
  });
  return s;
}

/* ═══════════════════════════════════════════════════════════
   공용 수신자 고르기  (2026-08-21 추가)
   ───────────────────────────────────────────────────────────
   ★ 왜 떼어냈는가
     예전에는 이 목록이 admin.html 의 단체 문자 화면 안에
     통째로 박혀 있었다. 그래서 소식·공고에서는 쓸 수가 없었고,
     소식 알림은 무조건 의결권자 전원에게 나갔다.

     그런데 조합 일은 전원에게 보낼 일보다
     대의원 스무 명, 이사 일곱 명처럼
     일부에게만 보낼 일이 훨씬 잦다.

   ★ 직책 칸을 새로 만들지 않는다
     명부에 "대의원" 칸을 두면 사람이 바뀔 때마다 명부를 고쳐야 하고,
     명부를 고치려면 조합장 결재가 필요하다. 회의 한 번 알리자고
     결재를 올릴 수는 없다.
     그래서 보낼 때마다 체크로 고른다.

   ★ 세 곳이 같이 쓴다
       단체 문자        처음부터 고른다
       소식 · 공고       등록한 뒤 이어서 고른다
       투표 개시 알림    (앞으로) 미참여자만 골라 독촉한다
   ═══════════════════════════════════════════════════════════ */

const PICK = {q:"", filter:"all", sel:{}, page:0};
const PICK_PER = 50;          /* 한 쪽에 몇 명씩 보일까 */

/* ★ 늘 있는 묶음. 명부에서 자동으로 세어지므로 만들거나 지울 수 없다.
     화면에서 "직접 만든 그룹"과 반드시 구분해서 보여 준다.
     같은 모양으로 나란히 두면 왜 어떤 것은 못 지우는지 알 수 없다. */
const PICK_FILTERS = [
  ["all",     "전체",       "명부에 계신 분 전부"],
  ["voter",   "의결권자",   "대표조합원 · 총회 정족수의 모수"],
  ["nojoin",  "앱 미가입",  "아직 앱에 들어오지 않으신 분"],
  ["novote",  "투표 미참여", "진행 중인 투표에 아직 참여 안 하신 분"],
  ["share",   "공유 물건",  "한 물건을 여럿이 나눠 가지신 분"]
];
const pickFilterDesc = k => (PICK_FILTERS.find(f=>f[0]===k)||[,,""])[2];

/* ── 발송 그룹 ─────────────────────────────────────────────
   ★ 대의원회 · 임원진처럼 자주 보내는 묶음을 미리 만들어 둔다.
     조합원이 수천 명이면 매번 체크로 고를 수가 없다.

   ★ 명부에 직책 칸을 두지 않는 이유
     명부를 고치려면 조합장 결재가 필요하다(명부 변경 품의).
     대의원 한 명 바뀔 때마다 결재를 올릴 수는 없다.
     그래서 명부는 그대로 두고 발송용 묶음만 따로 갖는다.

   ★ 서버(app_state)에 올리지 않는다
     "누가 대의원인가"는 명부에서 나온 자료다.
     app_state 에는 조합원 누구나 보는 것만 담는 것이 원칙이다.
     지금은 브라우저에만 담고, Supabase Auth 를 붙일 때
     daara_registry 스키마의 msg_group 테이블로 옮긴다. */
let PICK_GRP     = (typeof cacheGet!=="undefined") ? cacheGet("msg_groups", null) : null;
let PICK_GRP_SEQ = (typeof cacheGet!=="undefined") ? cacheGet("msg_groups_seq", 0) : 0;

/* 처음 여는 조합에는 본보기 두 개를 만들어 둔다.
   무엇을 만들 수 있는지 글로 설명하는 것보다 하나 보여주는 편이 빠르다. */
function grpSeed(){
  if(PICK_GRP) return;
  const R = (typeof ROSTER !== "undefined") ? ROSTER : [];
  const rep = R.filter(r => r.rep);
  PICK_GRP = [
    {id:1, name:"대의원회", memo:"정관상 조합원 10분의 1 이상",
     nos: rep.slice(0, Math.max(3, Math.ceil(rep.length/10))).map(r=>r.no)},
    {id:2, name:"임원진", memo:"조합장 · 이사 · 감사",
     nos: rep.slice(0, 5).map(r=>r.no)}
  ];
  PICK_GRP_SEQ = 2;
  grpPut();
}
function grpPut(){
  if(typeof cacheSet === "undefined") return;
  cacheSet("msg_groups", PICK_GRP);
  cacheSet("msg_groups_seq", PICK_GRP_SEQ);
}
const grpAll = () => { grpSeed(); return PICK_GRP || []; };
const grpOf  = id => grpAll().find(g => g.id === id) || null;

/* 명부에서 빠진 분은 그룹에서도 빼고 센다.
   조합원이 나가셨는데 그룹에 남아 있으면 인원이 맞지 않는다. */
function grpNos(g){
  const live = new Set((typeof ROSTER!=="undefined"?ROSTER:[]).map(r=>r.no));
  return (g && g.nos || []).filter(n => live.has(n));
}

const pickRoster = () => (typeof ROSTER !== "undefined") ? ROSTER : [];
const pickVoted  = () => (typeof SV_VOTERS !== "undefined")
  ? new Set(SV_VOTERS.map(v => v.voter)) : new Set();

/* 칩 하나에 걸리는 사람들. "g:3" 이면 3번 그룹이다. */
function pickBy(k){
  const R = pickRoster();
  if(k && k.slice(0,2) === "g:"){
    const s = new Set(grpNos(grpOf(+k.slice(2))));
    return R.filter(r => s.has(r.no));
  }
  if(k === "voter")  return R.filter(r => r.rep);
  if(k === "nojoin") return R.filter(r => !r.joined);
  if(k === "novote"){ const v = pickVoted(); return R.filter(r => !v.has(r.no)); }
  if(k === "share")  return R.filter(r => r.share !== "1/1");
  return R;
}
const pickCount = k => pickBy(k).length;

function pickPool(){
  let list = pickBy(PICK.filter);
  /* ★ 한글을 골라서 본다 (hub.js hubKeyOf · 2026-08-22 밤).
     조합원 이름이 자모로 들어오면 못 찾아 1만 명 명단을 눈으로 훑게 된다. */
  const K = (typeof hubKeyOf !== "undefined")
    ? hubKeyOf : (v => String(v||"").normalize("NFC").trim().replace(/\s+/g,"").toLowerCase());
  const pq = K(PICK.q);
  if(pq) list = list.filter(r =>
    K(r.name).indexOf(pq) >= 0
    || String(r.no).indexOf(pq) >= 0
    || K(r.addr).indexOf(pq) >= 0);
  return list;
}

const pickNos = () => Object.keys(PICK.sel).filter(k => PICK.sel[k]).map(Number);
const pickN   = () => pickNos().length;
const pickPhones = () => {
  const s = new Set(pickNos());
  return pickRoster().filter(r => s.has(r.no)).map(r => r.phone);
};

function pickReset(filter, preselect){
  PICK.q = ""; PICK.filter = filter || "all"; PICK.sel = {}; PICK.page = 0;
  if(preselect) pickBy(PICK.filter).forEach(r => PICK.sel[r.no] = true);
}
function pickSet(nos){
  PICK.sel = {}; (nos||[]).forEach(n => PICK.sel[n] = true);
}

function pickTog(no){ PICK.sel[no] = !PICK.sel[no]; render(); }

/* ★ "이 쪽"과 "전체"를 반드시 나눈다.
     예전에는 버튼에 "이 쪽"이라 써 놓고 실제로는 전체를 골랐다.
     1만 명 명단에서 50명 고른 줄 알고 1만 건이 나가면 되돌릴 수 없다. */
function pickPageAll(on){
  const from = PICK.page * PICK_PER;
  pickPool().slice(from, from + PICK_PER).forEach(r => PICK.sel[r.no] = on);
  render();
}
function pickAll(on){
  const pool = pickPool();
  /* 큰 명단을 한 번에 고르실 때는 인원과 비용을 먼저 보여 드린다 */
  if(on && pool.length > 200){
    const fee = (typeof PRICE !== "undefined")
      ? (PRICE.find(x => x.k === "sms") || {fee:15}).fee : 15;
    if(!confirm(`${pool.length.toLocaleString("ko-KR")}명을 모두 고릅니다.\n\n`
      + `문자로 보내시면 최대 ${(pool.length*fee).toLocaleString("ko-KR")}원이 들 수 있습니다.\n`
      + `(기본 제공량을 다 쓰신 경우)\n\n계속하시겠습니까?`)) return;
  }
  pool.forEach(r => PICK.sel[r.no] = on);
  render();
}
function pickPage(d){
  const max = Math.max(0, Math.ceil(pickPool().length / PICK_PER) - 1);
  PICK.page = Math.min(max, Math.max(0, PICK.page + d)); render(); scrollTo(0, 0);
}
function pickClear(){ PICK.sel = {}; render(); }

/* 칩을 누르면 그 묶음으로 좁힌다.
   ★ 그룹 칩은 누르는 즉시 그 그룹 전원이 체크된다.
     대의원회를 고른다는 것은 곧 대의원 전원에게 보낸다는 뜻이기 때문이다.
     빼실 분은 목록에서 다시 누르시면 된다. */
function pickChip(k){
  PICK.filter = k; PICK.page = 0; PICK.q = "";
  if(k.slice(0,2) === "g:"){
    grpNos(grpOf(+k.slice(2))).forEach(n => PICK.sel[n] = true);
  }
  render();
}

const pickMask = n => (typeof mask !== "undefined") ? mask(n)
  : (n.length <= 2 ? n[0]+"*" : n[0]+"*".repeat(n.length-2)+n[n.length-1]);
const pickMaskPh = p => (typeof maskPh !== "undefined") ? maskPh(p)
  : p.slice(0,3)+"-****-"+p.slice(-4);

/* ── 칩 줄 ─────────────────────────────────────────────── */
function pickChips(){
  const G = grpAll();
  const chip = (k, l, n, isG) => `<button
    style="border:${PICK.filter===k?"1.5px solid var(--navy)":"1px solid var(--line)"};
    background:${PICK.filter===k?"var(--navy)":isG?"#FFF7F2":"#fff"};
    color:${PICK.filter===k?"#fff":isG?"#8C3A12":"var(--muted)"};
    border-radius:99px;padding:7px 14px;font-size:.8rem;
    font-weight:${PICK.filter===k?700:isG?600:400}"
    onclick="pickChip('${k}')">${l} ${n}명</button>`;
  return `
  <div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:10px">
    ${PICK_FILTERS.map(([k,l]) => chip(k, l, pickCount(k), false)).join("")}
    ${G.length?`<span style="width:1px;background:var(--line);margin:2px 4px"></span>`:""}
    ${G.map(g => chip("g:"+g.id, g.name, grpNos(g).length, true)).join("")}
    <button style="border:1px dashed var(--blue);background:#fff;color:var(--blue);
      border-radius:99px;padding:7px 14px;font-size:.8rem;font-weight:700"
      onclick="grpNewFromPick()">+ 새 그룹</button>
  </div>
  ${pickGrpBar()}`;
}

/* ── 명단 ──────────────────────────────────────────────── */
function pickView(){
  const pool = pickPool();
  const pages = Math.max(1, Math.ceil(pool.length / PICK_PER));
  if(PICK.page > pages - 1) PICK.page = pages - 1;
  const from = PICK.page * PICK_PER;
  const rows = pool.slice(from, from + PICK_PER);
  const pageOn = rows.length && rows.every(r => PICK.sel[r.no]);
  const allOn  = pool.length && pool.every(r => PICK.sel[r.no]);
  const n = pickN();
  const label = PICK.filter === "all" ? "명부 전체"
    : (PICK.filter.slice(0,2) === "g:" ? (grpOf(+PICK.filter.slice(2))||{name:"이 그룹"}).name
    : (PICK_FILTERS.find(f => f[0] === PICK.filter) || [,"이 목록"])[1]);
  return `
  ${pickChips()}

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
    <input value="${PICK.q}" placeholder="이름 · 번호 · 지번으로 찾기"
      oninput="PICK.q=this.value" onkeydown="if(event.key==='Enter'){PICK.page=0;render()}"
      style="flex:1;min-width:190px;border:1px solid var(--line);border-radius:8px;
      padding:8px 11px;font-size:.8rem;outline:none">
    <button class="btn ghost sm" onclick="PICK.page=0;render()">검색</button>
  </div>

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
    <button class="btn ${allOn?"ghost":""} sm" onclick="pickAll(${!allOn})">
      ${allOn?`${label} ${wonB(pool.length)}명 해제`
             :`${label} ${wonB(pool.length)}명 모두 선택`}</button>
    ${pages>1?`<button class="btn ghost sm" onclick="pickPageAll(${!pageOn})">
      ${pageOn?"이 쪽만 해제":`이 쪽 ${rows.length}명만 선택`}</button>`:""}
    ${n?`<button class="btn ghost sm" onclick="pickClear()">선택 비우기</button>`:""}
    ${PICK.q?`<span style="font-size:.78rem;color:var(--amber)">
      찾으신 ${wonB(pool.length)}명만 해당됩니다</span>`:""}
  </div>

  <div class="box" style="padding:0;overflow:hidden">
    <table><thead><tr>
      <th style="width:34px"></th><th style="width:66px">번호</th><th style="width:66px">성명</th>
      <th style="width:118px">연락처</th><th>소유 부동산</th>
      <th style="width:54px">대표</th><th style="width:62px">가입</th>
    </tr></thead><tbody>
    ${rows.map(r=>`<tr class="tap" onclick="pickTog(${r.no})"
        ${PICK.sel[r.no]?'style="background:#F0F5FB"':''}>
      <td><span style="display:inline-block;width:16px;height:16px;border-radius:4px;
        ${PICK.sel[r.no]?"background:var(--navy);color:#fff":"border:1.5px solid var(--line)"};
        font-size:.7rem;text-align:center;line-height:16px">${PICK.sel[r.no]?"✓":""}</span></td>
      <td class="mono">${String(r.no).padStart(4,"0")}</td>
      <td>${pickMask(r.name)}</td>
      <td class="mono" style="color:var(--muted)">${pickMaskPh(r.phone)}</td>
      <td>${r.addr} · ${r.type}${r.share!=="1/1"&&!r.rep?` <span style="color:#8C3A12">(공유)</span>`:""}</td>
      <td><span class="pill ${r.rep?"p-ok":"p-wait"}">${r.rep?"Y":"N"}</span></td>
      <td>${r.joined?`<span class="pill p-ok">완료</span>`
        :`<span style="color:var(--muted)">미가입</span>`}</td>
    </tr>`).join("")}
    ${!rows.length?`<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:18px">
      찾는 분이 없습니다</td></tr>`:""}
    </tbody></table>
  </div>

  ${pages>1?`<div style="display:flex;gap:10px;align-items:center;justify-content:center;
    margin-top:10px;flex-wrap:wrap">
    <button class="btn ghost sm ${PICK.page?"":"off"}" onclick="pickPage(-1)">‹ 앞으로</button>
    <span style="font-size:.82rem;color:var(--muted)">
      ${from+1}–${from+rows.length} / 전체 ${pool.length}명
      <b style="color:var(--navy)"> · ${PICK.page+1} / ${pages}쪽</b></span>
    <button class="btn ghost sm ${PICK.page<pages-1?"":"off"}" onclick="pickPage(1)">뒤로 ›</button>
  </div>
  <p class="note" style="text-align:center">쪽을 넘겨도 고르신 분은 그대로 남습니다.
    이름이나 지번으로 찾으시면 더 빠릅니다.</p>`:""}`;
}

/* ── 고른 분 요약 한 줄 ──────────────────────────────────
   명단이 길어 화면 밖으로 밀려나므로 위쪽에도 같은 것을 둔다. */
function pickSummary(){
  const n = pickN();
  const R = pickRoster();
  const sel = new Set(pickNos());
  const nojoin = R.filter(r => sel.has(r.no) && !r.joined).length;
  return `
  <div class="box" style="background:#F0F5FB;border-color:var(--navy);
    display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
    <span style="font-size:.86rem">받는 분 <b style="color:var(--navy);font-size:1rem">${n}명</b>
      ${n?`<span style="color:var(--muted)"> · 앱 미가입 ${nojoin}명 포함</span>`
        :`<span style="color:var(--muted)"> · 아래에서 골라 주십시오</span>`}</span>
    ${n?`<button class="btn ghost sm" onclick="pickClear()">선택 비우기</button>`:""}
  </div>`;
}

/* ── 소식 한 건을 문자 본문으로 바꾼다 ───────────────────────
   ★ 알림톡과 문자는 담을 수 있는 것이 다르다.

     알림톡  승인받은 템플릿만 나간다. 본문을 그대로 실을 수 없어
             제목만 변수에 끼워 넣고 "앱에서 보십시오"로 안내한다.
     문자    자유 문구라 제목과 본문을 그대로 싣는다.
             다만 90바이트를 넘으면 LMS 가 되어 단가가 세 배다. */
function newsToText(x, ch){
  if(ch === "alim"){
    const t = msgTplOf("DAARA_DOC_01");
    return msgFill(t.body, {자료명: x.t}, "○○○");
  }
  const head = `[다알아] 미아2구역 조합`;
  /* ★★★ 문자에는 한 줄 요약을 보낸다 (2026-09-16) ★★★

     예전에는 본문을 통째로 실었다. 통합심의 공지가 1,084자라
     LMS 로 넘어가 단가가 세 배가 됐다. 100분께 보내면
     긴 문자가 그대로 간다.

     ★ 문자는 **짧게 보내고 앱으로 오시게** 하는 것이 맞다.
       긴 글은 앱에서 읽으신다. 문자는 「뭔가 올라왔다」만 알리면 된다.

     ★ 한 줄 요약(sub)이 있으면 그것을, 없으면 본문 첫 줄을 쓴다.
       본문 전체를 보내지 않는다. */
  const one = (x.sub || "").trim()
    || String(x.body || "").split("\n").map(v=>v.trim()).filter(Boolean)[0] || "";
  return `${head}\n\n${x.urgent?"[긴급] ":""}${x.t}`
    + (one ? `\n${one}` : "")
    + `\n\n자세한 내용은 다알아 앱 소식에서 보십시오.`;
}

/* ── 고르신 분이 누구인가 ───────────────────────────────────
   ★ 칩을 여러 번 누르면 선택이 섞인다.
     "지금 화면에 뜬 칩"으로는 실제 받는 분을 설명할 수 없다.
     그래서 고른 사람을 거꾸로 훑어 무슨 묶음인지 알아낸다.

   ★ 큰 묶음부터 본다. 명부 전체 → 의결권자 → 그룹 → 나머지.
     "대의원회 10명 전원 · 그 외 3명" 처럼 나온다. */
function pickWho(){
  const sel = new Set(pickNos());
  if(!sel.size) return [];
  const R = pickRoster();
  if(sel.size === R.length) return [{t:`명부 전체 ${R.length}명`, big:true}];

  const used = new Set();
  const out = [];
  const cand = [];
  PICK_FILTERS.forEach(([k,l]) => { if(k !== "all") cand.push({k, l, nos:pickBy(k).map(r=>r.no)}); });
  grpAll().forEach(g => cand.push({k:"g:"+g.id, l:g.name, nos:grpNos(g), grp:true}));
  cand.sort((a,b) => b.nos.length - a.nos.length);

  cand.forEach(c => {
    if(c.nos.length < 2) return;
    if(!c.nos.every(n => sel.has(n))) return;        /* 전원이 들어 있어야 한다 */
    if(c.nos.every(n => used.has(n))) return;        /* 이미 다른 묶음으로 설명됐다 */
    out.push({t:`${c.l} ${c.nos.length}명 전원`, grp:c.grp});
    c.nos.forEach(n => used.add(n));
  });

  const rest = [...sel].filter(n => !used.has(n));
  if(rest.length){
    if(!out.length) out.push({t:`직접 고르신 ${rest.length}명`});
    else out.push({t:`그 외 ${rest.length}명`, rest:true});
  }
  return out;
}

/* 팝업에 쓸 한 줄 요약 */
const pickWhoText = () => {
  const w = pickWho();
  return w.length ? w.map(x=>x.t).join(" · ") : "아직 아무도 고르지 않으셨습니다";
};

/* ═══════════════════════════════════════════════════════════
   그룹 만들기 · 고치기 — 화면을 옮기지 않는다  (2026-08-21)
   ───────────────────────────────────────────────────────────
   ★ 예전에는 `발송 그룹` 메뉴가 따로 있었다.
     같은 칩이 두 화면에 나뉘어 있으니 어느 쪽에서 고쳐야 하는지
     알 수 없었고, 문자 보내다 말고 메뉴를 옮겨 다녀야 했다.

   ★ 그래서 수신자 고르기 한 자리에서 다 한다.
       ① 명단에서 보낼 분을 체크한다
       ② [+ 새 그룹] 을 누르고 이름을 적는다
       ③ 다음부터는 칩 하나로 그 분들이 한 번에 골라진다

   ★ 그룹 칩을 고르면 그 아래에 관리 줄이 나온다.
     이름 바꾸기 · 지금 고른 분으로 바꾸기 · 삭제.
     늘 있는 묶음(전체 · 의결권자 등)은 명부에서 자동으로 세어지므로
     고칠 수 없다는 것을 같은 자리에서 알려 준다.
   ═══════════════════════════════════════════════════════════ */

function pickGrpBar(){
  const k = PICK.filter;
  if(k.slice(0,2) !== "g:"){
    const d = pickFilterDesc(k);
    return `<div style="background:var(--mist);border-radius:9px;padding:9px 13px;
      margin-bottom:10px;font-size:.79rem;color:var(--muted)">
      <b style="color:var(--ink)">${(PICK_FILTERS.find(f=>f[0]===k)||[,"전체"])[1]}</b>
      · ${d} · <b>명부에서 자동으로 세어집니다.</b> 고치거나 지우실 수 없습니다.</div>`;
  }
  const g = grpOf(+k.slice(2)); if(!g) return "";
  const n = pickN();
  return `<div style="background:#FFF7F2;border:1px solid #F3C7AC;border-radius:9px;
    padding:9px 13px;margin-bottom:10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap">
    <span style="font-size:.82rem;color:#8C3A12">
      <b>${g.name}</b> ${grpNos(g).length}명 · 직접 만드신 그룹입니다</span>
    <span style="margin-left:auto;display:flex;gap:6px;flex-wrap:wrap">
      <button class="btn ghost sm" onclick="grpRename(${g.id})">이름 바꾸기</button>
      <button class="btn ghost sm ${n?"":"off"}" onclick="grpReplace(${g.id})">
        지금 고른 ${wonB(n)}명으로 바꾸기</button>
      <button class="btn ghost sm" style="border-color:#E9B4B4;color:var(--red)"
        onclick="grpDel(${g.id})">삭제</button>
    </span></div>`;
}

function grpNewFromPick(){
  const nos = pickNos();
  if(!nos.length){
    alert("먼저 아래 명단에서 담으실 분을 체크해 주십시오.\n\n"
      + "체크하신 분들이 그대로 새 그룹이 됩니다.");
    return;
  }
  const name = prompt(`고르신 ${nos.length}명을 새 그룹으로 담습니다.\n\n그룹 이름을 적어 주십시오.`, "");
  if(name === null) return;
  if(!name.trim()){ alert("이름을 적으셔야 합니다."); return; }
  grpAll();
  PICK_GRP.push({id:++PICK_GRP_SEQ, name:name.trim(), memo:"", nos});
  grpPut();
  PICK.filter = "g:" + PICK_GRP_SEQ;
  alert(`${name.trim()} · ${nos.length}명\n\n만들었습니다.\n다음부터는 칩 하나로 고르실 수 있습니다.`);
  render();
}

function grpRename(id){
  const g = grpOf(id); if(!g) return;
  const name = prompt("그룹 이름을 바꿉니다.", g.name);
  if(name === null) return;
  if(!name.trim()){ alert("이름을 적으셔야 합니다."); return; }
  g.name = name.trim(); grpPut(); render();
}

function grpReplace(id){
  const g = grpOf(id); if(!g) return;
  const nos = pickNos();
  if(!nos.length){ alert("먼저 명단에서 담으실 분을 체크해 주십시오."); return; }
  const was = grpNos(g).length;
  if(!confirm(`${g.name}\n\n${was}명 → ${nos.length}명 으로 바꿉니다.\n\n`
    + `지금 체크되어 있는 분들이 그대로 담깁니다.\n계속하시겠습니까?`)) return;
  g.nos = nos; grpPut();
  alert(`${g.name} · ${nos.length}명\n\n바꿨습니다.`);
  render();
}

function grpDel(id){
  const g = grpOf(id); if(!g) return;
  if(!confirm(`${g.name} (${grpNos(g).length}명)\n\n이 그룹을 지우시겠습니까?\n`
    + `조합원 명부는 그대로 남습니다. 고르신 분도 그대로 남습니다.`)) return;
  PICK_GRP = PICK_GRP.filter(x => x.id !== id); grpPut();
  if(PICK.filter === "g:" + id) PICK.filter = "all";
  render();
}
