/* ═══════════════════════════════════════════════════════════
   다알아 (Da-Ara) — 전자동의서 징구
   ───────────────────────────────────────────────────────────
   ★ 동의서는 소송에서 가장 치열하게 다투는 서류다.
     조합설립 인가가 취소되는 사건은 대부분 동의서에서 시작한다.
     그래서 다른 기능보다 절차를 무겁게 잡았다.

       ① 요건 안내를 먼저 읽히고
       ② 서식 전문을 끝까지 내려 본 뒤에야 동의 칸이 열리고
       ③ 제출은 PASS 본인인증을 반드시 거치고
       ④ 완료증에 시각과 서명값을 남긴다

   ★ 전자 징구가 언제 되는지는 아직 확정하지 못했다.
     법과 지침이 바뀌는 중이라 화면에 그 사실을 그대로 적는다.
     "된다" 고 단정했다가 나중에 무효가 되면 조합이 다친다.
     모르는 것은 모른다고 적는 편이 낫다.

   ★ PIN · 생체로는 제출할 수 없다.
     본인확인기관이 준 식별값(CI)을 명부와 대조해야
     타인 명의 도용을 막고 증거 능력이 선다.

   ★ Supabase 대응
       consent_form   ← CONSENT_FORMS  (서식 · 조문)
       consent_submit ← CONSENT_LOG    (제출 이력 · 완료증)
       idv_log        ← 인증 기록이 그대로 과금 근거가 된다
   ═══════════════════════════════════════════════════════════ */

/* ── 1. 징구 요건 안내 (진입 시 가장 먼저) ───────────────── */
const CONSENT_NOTICE = {
  title: "전자동의서 제출 전에 읽어 주십시오",
  sub  : "동의서는 조합의 법적 근거가 되는 서류입니다",
  items: [
    {h:"동의서는 되돌리기 어렵습니다",
     b:"한 번 제출하면 철회에 별도 절차가 필요합니다. 인가 신청이 접수된 뒤에는 철회가 제한될 수 있습니다. 충분히 읽어 보신 뒤 제출해 주십시오."},
    {h:"본인만 제출하실 수 있습니다",
     b:"통신사 PASS 또는 NICE 본인인증을 거칩니다. 인증 결과를 조합원 명부와 대조하므로 가족이나 대리인이 대신 제출하실 수 없습니다."},
    {h:"공유 물건은 대표조합원만 제출합니다",
     b:"한 부동산을 여러 분이 나눠 가진 경우, 대표조합원으로 지정된 한 분만 동의서를 내실 수 있습니다."},
    {h:"제출 내용은 그대로 보관됩니다",
     b:"제출 시각과 인증 서명값이 함께 기록되며 조합이 임의로 고칠 수 없습니다. 완료증을 받으시면 언제든 확인하실 수 있습니다."},
    {h:"서면 제출도 가능합니다",
     b:"전자로 내기 어려우시면 조합 사무실에서 서면으로 내실 수 있습니다. 효력은 같습니다."}
  ],
  /* ★ 이 문구를 지우지 말 것.
     전자 징구 요건이 확정되기 전까지는 화면에 그대로 있어야 한다. */
  caveat: "※ 본 양식 및 상세 징구 가능 요건은 추후 확정 후 보완 예정입니다."
};

/* ── 사업 종류별 동의 요건 ────────────────────────────────
   ★ 재개발과 재건축은 요건이 다르다. 단계마다도 다르다.
     하나로 뭉뚱그리면 반드시 틀린다.

       재개발 조합설립   토지등소유자 3/4 + 토지면적 1/2
       재건축 조합설립   구분소유자 3/4 + 동별 과반수 + 토지면적 3/4
       사업시행 변경     조합원 과반수 (면적 요건 없음)

   ★ 재건축의 '동별 과반수' 는 한 동이 통째로 반대하면
     못 하게 막는 장치다. 재개발보다 훨씬 까다롭다.
     명부의 물건에 동(棟) 정보가 있어야 계산할 수 있다.
     재개발 구역은 동 칸이 비어 있으므로 이 계산을 건너뛴다. */
/* ── 법정 의결 요건 목록 ─────────────────────────────────
   ★ 직원이 요건을 직접 넣게 두면 안 된다.
     법으로 정해져 있고, 잘못 넣으면 인가가 반려된다.
     여기 있는 것 중에서만 고르게 한다.
     새 요건이 필요하면 자문 변호사 확인을 거쳐 여기에 더한다. */
const CONSENT_KINDS = [
  {k:"estab", name:"조합설립",
   law:"「도시 및 주거환경정비법」 제35조",
   note:"제35조 제2항",
   title:"조합설립 동의서",
   body:[
     ["1. 정비사업의 종류 및 명칭",""],
     ["2. 정비사업비의 분담기준",
      "정비사업비는 조합원이 소유한 종전자산의 감정평가액 비율에 따라 분담하며, 구체적인 분담금은 관리처분계획에서 정한다."],
     ["3. 조합원의 권리·의무에 관한 사항",
      "조합원은 총회에 출석하여 의결권을 행사할 권리를 가지며, 정비사업비를 분담할 의무를 진다. 의결권은 조합원 1인당 1개로 하되, 공유 물건은 대표조합원 1인만 행사한다."],
     ["4. 정비사업이 종료된 때의 계산",
      "사업이 종료되면 조합은 청산 절차를 거쳐 잔여 재산을 조합원에게 분배하거나 부족액을 징수한다."],
     ["5. 조합 정관","별첨 정관에 동의한다. 정관은 조합 자료실에서 열람하실 수 있다."],
     ["6. 동의의 철회","인가 신청 전까지는 철회할 수 있다. 철회는 서면으로 하며 조합에 도달한 때 효력이 생긴다."]
   ]},

  {k:"plan", name:"사업시행계획 인가",
   law:"「도시 및 주거환경정비법」 제50조",
   note:"제50조 제6항",
   title:"사업시행계획 인가 동의서",
   meeting:true,
   body:[
     ["1. 사업시행계획의 주요 내용",""],
     ["2. 정비사업비 추산액",""],
     ["3. 조합원에게 미치는 영향",""],
     ["4. 동의의 철회","인가 신청 전까지는 서면으로 철회할 수 있다."]
   ]},

  {k:"plan23", name:"사업시행계획 변경 · 정비사업비 10% 이상 증가",
   law:"「도시 및 주거환경정비법」 제50조",
   note:"제50조 제6항 단서",
   title:"사업시행계획 변경 동의서",
   meeting:true,
   body:[
     ["1. 변경하려는 내용",""],
     ["2. 정비사업비 증가액과 산출 근거",""],
     ["3. 조합원 분담금 변동",""],
     ["4. 동의의 철회","인가 신청 전까지는 서면으로 철회할 수 있다."]
   ]},

  {k:"manage", name:"관리처분계획 인가",
   law:"「도시 및 주거환경정비법」 제74조",
   note:"제74조 제1항",
   title:"관리처분계획 인가 동의서",
   meeting:true,
   body:[
     ["1. 분양대상자별 종전자산 평가액",""],
     ["2. 분양예정 대지·건축물의 추산액",""],
     ["3. 조합원별 분담금 및 납부 시기",""],
     ["4. 동의의 철회","인가 신청 전까지는 서면으로 철회할 수 있다."]
   ]},

  {k:"manage23", name:"관리처분계획 변경 · 분담금 10% 이상 증가",
   law:"「도시 및 주거환경정비법」 제74조",
   note:"제74조 제1항 단서",
   title:"관리처분계획 변경 동의서",
   meeting:true,
   body:[
     ["1. 변경하려는 내용",""],
     ["2. 분담금 증가액과 산출 근거",""],
     ["3. 조합원별 변동 내역",""]
   ]},

  {k:"rule23", name:"정관 변경 · 조합원 자격 등 중요 사항",
   law:"「도시 및 주거환경정비법」 제40조",
   note:"제40조 제3항",
   title:"정관 변경 동의서",
   meeting:true,
   body:[
     ["1. 변경하려는 조항",""],
     ["2. 변경 전후 대비",""],
     ["3. 변경 사유",""]
   ]},

  {k:"dissolve", name:"조합 해산",
   law:"「도시 및 주거환경정비법」 제86조의2",
   note:"제86조의2",
   title:"조합 해산 동의서",
   meeting:true,
   body:[
     ["1. 해산 사유",""],
     ["2. 청산 절차와 잔여재산 처리",""],
     ["3. 조합원에게 미치는 영향",""]
   ]}
];
const kindOf = k => CONSENT_KINDS.find(x => x.k === k) || CONSENT_KINDS[0];

const CONSENT_RULES = {
  "주택재개발": {
    estab:{owners:0.75, area:0.50, dong:false,
      desc:"토지등소유자 3/4 이상 및 토지면적 1/2 이상",
      law:"「도시 및 주거환경정비법」 제35조 제2항"},
    plan :{owners:0.50, area:0, dong:false,
      desc:"조합원 과반수", law:"같은 법 제50조 제6항"},
    plan23:{owners:2/3, area:0, dong:false,
      desc:"조합원 2/3 이상", law:"같은 법 제50조 제6항 단서"},
    manage:{owners:0.50, area:0, dong:false,
      desc:"조합원 과반수", law:"같은 법 제74조 제1항"},
    manage23:{owners:2/3, area:0, dong:false,
      desc:"조합원 2/3 이상", law:"같은 법 제74조 제1항 단서"},
    rule23:{owners:2/3, area:0, dong:false,
      desc:"조합원 2/3 이상", law:"같은 법 제40조 제3항"},
    dissolve:{owners:0.50, area:0, dong:false,
      desc:"조합원 과반수", law:"같은 법 제86조의2"}
  },
  "주택재건축": {
    estab:{owners:0.75, area:0.75, dong:true,
      desc:"구분소유자 3/4 이상, 동별 과반수, 토지면적 3/4 이상",
      law:"「도시 및 주거환경정비법」 제35조 제3항"},
    plan :{owners:0.50, area:0, dong:false,
      desc:"조합원 과반수", law:"같은 법 제50조 제6항"},
    plan23:{owners:2/3, area:0, dong:false,
      desc:"조합원 2/3 이상", law:"같은 법 제50조 제6항 단서"},
    manage:{owners:0.50, area:0, dong:false,
      desc:"조합원 과반수", law:"같은 법 제74조 제1항"},
    manage23:{owners:2/3, area:0, dong:false,
      desc:"조합원 2/3 이상", law:"같은 법 제74조 제1항 단서"},
    rule23:{owners:2/3, area:0, dong:false,
      desc:"조합원 2/3 이상", law:"같은 법 제40조 제3항"},
    dissolve:{owners:0.50, area:0, dong:false,
      desc:"조합원 과반수", law:"같은 법 제86조의2"}
  }
};
const tenantKind = () => (typeof TN !== "undefined") ? (TN().kind || "주택재개발") : "주택재개발";
const ruleOf = step => {
  const k = CONSENT_RULES[tenantKind()] || CONSENT_RULES["주택재개발"];
  return k[step] || k.estab;
};

/* ── 2. 법정 서식 ────────────────────────────────────────
   조문은 뼈대만 담았다. 실제 징구 전에 조합 자문 변호사 확인을 받아야 한다. */
const CONSENT_FORMS = [
  {id:"C-ESTAB", code:"조합설립",
   name:"조합설립 동의서",
   law:"「도시 및 주거환경정비법」 제35조",
   step:"estab",
   get quorum(){ return ruleOf("estab"); },
   open:true, from:"2026-08-01", to:"2026-12-31",
   body:[
     ["1. 정비사업의 종류 및 명칭",
      "주택재개발정비사업 · 미아2재정비촉진구역 주택재개발정비사업"],
     ["2. 정비사업비의 분담기준",
      "정비사업비는 조합원이 소유한 종전자산의 감정평가액 비율에 따라 분담하며, 구체적인 분담금은 관리처분계획에서 정한다. 분담기준이 변경되는 경우 총회 의결을 거친다."],
     ["3. 조합원의 권리·의무에 관한 사항",
      "조합원은 총회에 출석하여 의결권을 행사할 권리를 가지며, 정비사업비를 분담할 의무를 진다. 의결권은 조합원 1인당 1개로 하되, 공유 물건은 대표조합원 1인만 행사한다."],
     ["4. 정비사업이 종료된 때의 계산",
      "사업이 종료되면 조합은 청산 절차를 거쳐 잔여 재산을 조합원에게 분배하거나 부족액을 징수한다."],
     ["5. 조합 정관",
      "별첨 정관에 동의한다. 정관은 조합 자료실에서 열람하실 수 있다."],
     ["6. 동의의 철회",
      "인가 신청 전까지는 철회할 수 있다. 철회는 서면으로 하며 조합에 도달한 때 효력이 생긴다."]
   ]},

  {id:"C-PLAN", code:"사업시행",
   name:"사업시행계획 변경 동의서",
   law:"「도시 및 주거환경정비법」 제50조",
   step:"plan",
   get quorum(){ return ruleOf("plan"); },
   open:false, from:"", to:"",
   body:[
     ["1. 변경 내용",
      "서울특별시고시 제2026-32호에 따른 재정비촉진계획 변경 사항을 반영한다. 세대수 3,519 → 4,003세대, 상한용적률 260.9 → 286.5%."],
     ["2. 변경에 따른 사업비 증감",
      "변경으로 인한 사업비 증감은 관리처분계획 수립 시 반영한다."],
     ["3. 조합원에게 미치는 영향",
      "분양 평형 구성과 분담금이 달라질 수 있다. 구체적인 내용은 감정평가와 관리처분계획에서 확정된다."]
   ]}
];
/* ★ 직원이 만든 서식은 서버에 담는다.
     조합마다 받아야 할 동의가 다르다.
     조합설립 · 사업시행 · 관리처분 · 정관 변경 · 해산 …

   ★ 서식이 거치는 길
       draft     작성 중       고치기 · 지우기 · 결재 올리기
       pending   결재 중       회수만 가능
       approved  승인          징구 시작 · 복제
       open      징구 중       마감 · 복제 (★ 고칠 수 없다)
       closed    마감          복제

   ★ 징구 중에는 절대 고칠 수 없다.
     앞선 열 분은 A 문구에, 뒤의 스무 분은 B 문구에 서명하시게 된다.
     같은 서식으로 받은 것이 아니니 대장이 통째로 무효가 될 수 있다.
     고치셔야 하면 복제해서 새 판으로 다시 결재를 올린다. */
let CONSENT_MADE = (typeof hubLoad !== "undefined") ? hubLoad("consent_forms", []) : [];
let CSF_SEQ      = (typeof hubLoad !== "undefined") ? hubLoad("consent_forms_seq", 0) : 0;
function formsPut(who){
  if(typeof hubPush === "undefined") return;
  hubPush("consent_forms", CONSENT_MADE, who);
  hubPush("consent_forms_seq", CSF_SEQ, who);
}
if(typeof hubPoll !== "undefined"){
  hubPoll("consent_forms_seq", v => { CSF_SEQ = Math.max(CSF_SEQ, v || 0); }, 20);
  hubPoll("consent_forms", v => {
    if(!v || JSON.stringify(v) === JSON.stringify(CONSENT_MADE)) return;
    CONSENT_MADE = v;
    const el = document.activeElement, t = el ? (el.tagName||"").toUpperCase() : "";
    if(t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return;
    if(typeof render !== "undefined") render();
  }, 20);
}

/* 미리 담긴 두 서식 + 직원이 만든 것.
   ★ 요건이 빠진 옛 자료가 있으면 여기서 채워 준다.
     하나라도 빠지면 집계에서 오류가 나고 화면이 안 그려진다. */
function formFix(f){
  if(!f.quorum) f.quorum = JSON.parse(JSON.stringify(ruleOf(f.step)));
  if(!f.body) f.body = [];
  if(!f.state) f.state = f.open ? "open" : "draft";
  return f;
}
const allForms = () => CONSENT_FORMS.concat(CONSENT_MADE.map(formFix));

/* ═══════════════════════════════════════════════════════════
   ★ 탭 차례는 만든 순서가 아니라 사업 단계 순서다 (2026-08-22 오후)
   ───────────────────────────────────────────────────────────
   예전에는 서식을 만든 순서대로 늘어섰다.
   직원이 정관 변경 서식을 나중에 만드시면 맨 뒤에 붙어,
   조합설립 → 사업시행 → 정관 변경 처럼 뒤죽박죽이 됐다.

   ★ 정관 변경은 조합설립 바로 다음에 둔다.

     정관은 조합설립 때 함께 만들어지는 것이라 설립과 한 몸이다.
     그리고 **정관을 고치는 일은 흔치 않다.**
     사업시행 → 관리처분 → 해산은 사업이 나아가는 차례인데,
     그 사이에 어쩌다 한 번 있는 정관 변경을 끼워 넣으면
     차례가 끊겨 「지금 어디까지 왔나」를 읽을 수 없다.

     설립 옆에 붙여 두면 사업 단계 줄은 깨끗하게 이어진다.

       조합설립 · 정관 변경 │ 사업시행 → 관리처분 → 해산
       ─────────────────   ────────────────────────
       설립 때 함께 정한 것    사업이 나아가는 차례

   ★ 차례에 없는 종류는 맨 뒤로 보낸다.
     나중에 CONSENT_KINDS 에 새 요건이 더해져도 화면이 깨지지 않는다.
   ═══════════════════════════════════════════════════════════ */
const FORM_ORDER = ["estab", "rule23", "plan", "plan23", "manage", "manage23", "dissolve"];
const formRank = f => {
  const i = FORM_ORDER.indexOf(f.step || "estab");
  return i < 0 ? FORM_ORDER.length : i;
};
/* ★ 같은 종류가 여럿이면 만든 차례를 지킨다 (안정 정렬).
   1차 개정 · 2차 개정을 만드셨는데 순서가 뒤바뀌면 안 된다. */
const formSort = list => list
  .map((f, i) => [f, i])
  .sort((a, b) => (formRank(a[0]) - formRank(b[0])) || (a[1] - b[1]))
  .map(x => x[0]);

/* 탭에 보일 것 — 감춘 것은 빼고, 사업 단계 순서로 */
const shownForms = () => formSort(
  CONSENT_FORMS.concat(CONSENT_MADE.map(formFix).filter(x => !x.hidden)));
const consentOf = id => allForms().find(f => f.id === id) || CONSENT_FORMS[0];
/* 조합원 앱에 나가는 목록도 같은 차례를 쓴다.
   직원 화면과 조합원 폰의 차례가 다르면
   「세 번째 것 내주세요」라고 안내할 수가 없다. */
const consentOpen = () => formSort(allForms().filter(f => f.open));

/* 새 서식 만들기 — 법정 요건 목록에서 고른 것으로 뼈대를 잡는다 */
function formNew(kindKey){
  const k = kindOf(kindKey);
  const d = new Date(), z = v => String(v).padStart(2,"0");
  return {
    id: "CF-" + d.getFullYear() + "-" + String(++CSF_SEQ).padStart(3,"0"),
    code: k.name, name: k.title, law: k.law, step: k.k,
    /* ★ 의결 요건을 값으로 담는다.
       미리 담긴 두 서식은 계산해서 돌려주는 구조(get quorum)지만,
       직원이 만든 서식은 서버에 담겼다 돌아오므로 그 구조가 사라진다.
       없으면 집계에서 오류가 나고 화면이 통째로 안 그려진다. */
    quorum: JSON.parse(JSON.stringify(ruleOf(k.k))),
    meetingNeed: !!k.meeting, meetingAt: "", meetingNo: "",
    from: "", to: "", open: false, state: "draft",
    body: k.body.map(x => [x[0], x[1]]),
    made: `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`
  };
}
function formSave(f, who){
  const i = CONSENT_MADE.findIndex(x => x.id === f.id);
  if(i >= 0) CONSENT_MADE[i] = f; else CONSENT_MADE.push(f);
  formsPut(who); return f;
}
/* 복제 — 징구 중인 서식을 고쳐야 할 때 쓴다 */
function formCopy(id, who){
  const o = allForms().find(x => x.id === id); if(!o) return null;
  const d = new Date(), z = v => String(v).padStart(2,"0");
  const c = JSON.parse(JSON.stringify({
    code:o.code, name:o.name, law:o.law, step:o.step,
    quorum: o.quorum || ruleOf(o.step),
    meetingNeed:!!o.meetingNeed, meetingAt:o.meetingAt||"", meetingNo:o.meetingNo||"",
    body:o.body.map(x=>[x[0],x[1]])
  }));
  c.id = "CF-" + d.getFullYear() + "-" + String(++CSF_SEQ).padStart(3,"0");
  c.name = o.name + " (2차)";
  c.from = ""; c.to = ""; c.open = false; c.state = "draft";
  c.made = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`;
  c.from0 = o.id;                       /* 어느 서식에서 나왔는지 남긴다 */
  CONSENT_MADE.push(c); formsPut(who); return c;
}
function formDel(id, who){
  const f = CONSENT_MADE.find(x => x.id === id);
  if(!f) return {ok:false, why:"찾지 못했습니다."};
  if(f.state !== "draft") return {ok:false, why:"작성 중인 서식만 지울 수 있습니다."};
  if(CONSENT_LOG.some(x => x.form === id))
    return {ok:false, why:"이미 접수된 건이 있어 지울 수 없습니다."};
  CONSENT_MADE = CONSENT_MADE.filter(x => x.id !== id); formsPut(who);
  return {ok:true};
}
/* 징구 시작 · 마감 — 승인된 것만 시작할 수 있다 */
function formOpen(id, who){
  const f = CONSENT_MADE.find(x => x.id === id);
  if(!f) return {ok:false, why:"찾지 못했습니다."};
  if(f.state !== "approved")
    return {ok:false, why:"조합장 승인을 받은 서식만 징구를 시작할 수 있습니다."};
  if(!f.from || !f.to) return {ok:false, why:"징구 기간을 넣어 주십시오."};
  f.state = "open"; f.open = true; formsPut(who); return {ok:true};
}
/* ★ 안 쓰는 서식을 목록에서 감춘다.
     지우는 것이 아니다. 접수 기록이 딸려 있으면 지울 수 없고,
     지울 수 있으면 증거가 되지 못한다.
     탭에서만 안 보이게 하고 언제든 다시 꺼낼 수 있다. */
function formHide(id, who){
  const f = CONSENT_MADE.find(x => x.id === id);
  if(!f) return {ok:false, why:"찾지 못했습니다."};
  if(f.state === "open")
    return {ok:false, why:"징구 중인 서식은 감출 수 없습니다.\n먼저 징구를 마감하십시오."};
  if(f.state === "pending")
    return {ok:false, why:"결재 중인 서식은 감출 수 없습니다.\n먼저 결재를 회수하십시오."};
  f.hidden = true; formsPut(who); return {ok:true};
}
function formShow(id, who){
  const f = CONSENT_MADE.find(x => x.id === id);
  if(!f) return {ok:false};
  f.hidden = false; formsPut(who); return {ok:true};
}
const formsHidden = () => CONSENT_MADE.filter(x => x.hidden);

function formClose(id, who){
  const f = CONSENT_MADE.find(x => x.id === id); if(!f) return {ok:false};
  f.state = "closed"; f.open = false; formsPut(who); return {ok:true};
}
const FORM_STATE = {draft:"작성 중", pending:"결재 중", approved:"승인",
                    open:"징구 중", closed:"마감", cancelled:"회수"};

/* ── 3. 제출 이력 ────────────────────────────────────────
   ★ 조합이 고칠 수 없다. 고칠 수 있으면 증거가 되지 못한다.

   ★ 서버에 담는다 (2026-08-21)
     예전에는 화면 안 변수에만 담겼다. 조합원이 폰에서 내면
     "조합에 접수되었습니다"라고 알려주는데 실제로는 아무 데도 없었다.
     새로고침하면 사라지고 직원 PC 에는 애초에 가지 않았다.
     동의서는 소송에서 가장 치열하게 다투는 서류다. 그냥 둘 수 없다.

   ★ 담는 것은 접수 대장이다
     이름 · 지번 · 동의 여부가 들어간다. 어차피 조합이 구청에 내는 자료이고
     인가 신청 때 그대로 첨부된다. 다만 지금 app_state 는 누구나 읽을 수 있으므로
     실제 조합원 명부를 올리기 전에 반드시 정책을 좁혀야 한다.
     → 인수인계서 「배포 전 반드시 ⑲ app_state 정책 좁히기」 */
let CONSENT_LOG   = hubLoad("consent_log",   []);
let CONSENT_SEQ   = hubLoad("consent_seq",   0);

/* 완료증 서명값 — 제출 내용이 바뀌면 값이 달라진다 */
function consentSign(parts){
  let h = 5381;
  for(const ch of parts.join("|")) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  let g = 7;
  for(const ch of parts.join("|")) g = ((g * 131) + ch.codePointAt(0)) >>> 0;
  return (h.toString(16).toUpperCase().padStart(8,"0")
        + "-" + g.toString(16).toUpperCase().padStart(8,"0"));
}

/* 이미 냈는가 */
const consentDone = (formId, no) =>
  CONSENT_LOG.find(x => x.form === formId && x.voter === no && x.status === "active");

/* 제출 — PASS · NICE 로만 받는다 */
function consentSubmit(formId, member, choice, addr, how){
  if(how !== "pass" && how !== "nice")
    return {ok:false, why:"동의서는 PASS 또는 NICE 본인인증으로만 제출하실 수 있습니다."};

  /* ★ 명부에 없는 사람은 받지 않는다.
     예전에는 명부 대조에 실패해도 9999 라는 가짜 번호를 붙여 제출됐고
     완료증까지 발급됐다. 소유자가 특정되지 않은 동의서는
     인가 신청에서 그대로 반려된다. 완료증이 나오는 것 자체가 잘못이다.
     화면에서도 막지만, 화면을 우회해 들어와도 여기서 걸린다. */
  const inRoster = (typeof ROSTER !== "undefined")
    ? ROSTER.some(r => r.no === (member && member.no)) : !!(member && member.no);
  if(!member || !member.no || !inRoster)
    return {ok:false, why:"조합원 명부에서 확인되지 않아 제출할 수 없습니다."};

  /* ★ 지번은 명부에 적힌 것을 쓴다.
     조합원이 남의 지번을 적으면 면적 집계가 통째로 틀어진다. */
  addr = member.addr || addr;

  const f = consentOf(formId);
  const d = new Date(), z = v => String(v).padStart(2,"0");
  const at = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} `
           + `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
  const no = "CS-" + d.getFullYear() + "-" + String(++CONSENT_SEQ).padStart(4,"0");

  /* 본인확인기관이 준 식별값. 실제로는 기관에서 받아 온다.
     원문을 저장하지 않고 대조에만 쓴 뒤 앞자리만 남긴다. */
  const ci = consentSign([String(member.no), member.name, "CI"]).slice(0,11);

  const sign = consentSign([no, formId, String(member.no), choice, addr, at, ci]);

  /* 다시 제출하면 앞의 것은 대체된 것으로 남긴다. 지우지 않는다. */
  CONSENT_LOG.filter(x => x.form === formId && x.voter === member.no && x.status === "active")
    .forEach(x => { x.status = "replaced"; x.replacedBy = no; });

  const rec = {
    serial:no, form:formId, formName:f.name,
    voter:member.no, name:member.name,
    addr, choice, how, ci, sign, at,
    land: member.land || 0, share: member.share || "1/1",
    status:"active"
  };
  CONSENT_LOG.push(rec);

  /* 인증 건수를 계량에 올린다. 그대로 과금 근거가 된다. */
  if(typeof idvLog !== "undefined") idvLog(how, f.name + " 제출", "제 " + String(member.no).padStart(4,"0") + " 호");

  consentPut(member.name);      /* ★ 서버에 올린다. 직원 화면에 바로 나타난다. */
  return {ok:true, rec};
}

/* ★ 명부에 없는 번호로 들어간 기록을 걸러낸다.
   예전 판에서 9999 로 들어간 시연 기록이 서버에 남아 있을 수 있다.
   지우지는 않는다. 지울 수 있으면 증거가 되지 못한다.
   대신 집계와 화면에서 뺀다. */
function consentBogus(x){
  if(typeof ROSTER === "undefined") return false;
  return !ROSTER.some(r => r.no === x.voter);
}
const consentClean = rows => rows.filter(x => !consentBogus(x));

/* ── 4. 집계 ─────────────────────────────────────────────
   ★ 조합설립 동의는 사람 수와 토지면적 두 가지를 함께 본다.
     사람 수만 채우고 안심했다가 인가가 반려되는 일이 실제로 있다. */
function consentTally(formId){
  const f = consentOf(formId);
  /* ★ 요건이 빠져 있으면 여기서 채운다.
     하나라도 빠지면 화면이 통째로 안 그려져 클릭조차 되지 않는다. */
  const rule = f.quorum || ruleOf(f.step || "estab");
  /* ★ 조합장 승인을 받은 것만 센다.
     서면 입력 중(draft)인 건은 아직 대장이 아니다. */
  const rows = consentClean(CONSENT_LOG.filter(x => x.form === formId && x.status === "active"));
  const yes = rows.filter(x => x.choice === "동의");
  const no  = rows.filter(x => x.choice === "부동의");

  const voters = (typeof VOTERS !== "undefined") ? VOTERS() : [];
  const total  = voters.length;

  /* ★ 면적은 물건 목록에서 지분을 곱해 더한다.
     한 필지를 둘이 반씩 가졌으면 각각 절반만 센다.
     건물만 소유한 분은 사람 수에는 들어가고 면적은 0이다.
     국공유지는 소유자가 지자체라 모수에서 뺀다. */
  const A = (typeof ownArea !== "undefined")
    ? (no2 => ownArea(no2))
    : (no2 => { const r = voters.find(x => x.no === no2); return r ? (r.land||0) : 0; });
  const areaAll = (typeof totalArea !== "undefined") ? totalArea()
    : voters.reduce((a,r) => a + (r.land || 0), 0);
  const areaYes = yes.reduce((a,x) => a + A(x.voter), 0);

  const needOwner = Math.ceil(total * rule.owners);
  const needArea  = areaAll * rule.area;

  /* ★ 재건축은 동마다 따로 과반수를 본다.
     101동 20세대 중 12명이 동의해도, 103동이 22세대 중 8명이면 막힌다.
     전체 동의율이 아무리 높아도 한 동이 미달이면 인가가 안 난다. */
  let dongs = null;
  if(rule.dong && typeof dongList !== "undefined" && dongList().length){
    const yesNo = new Set(yes.map(x => x.voter));
    dongs = dongList().map(d => {
      const mem = dongMembers(d).filter(no => voters.some(v => v.no === no));
      const y = mem.filter(no => yesNo.has(no)).length;
      const need = Math.floor(mem.length / 2) + 1;
      return {dong:d, total:mem.length, yes:y, need, ok:y >= need};
    });
  }

  return {
    dongs, okDong: dongs ? dongs.every(x => x.ok) : true,
    total, submitted:rows.length, yes:yes.length, no:no.length,
    rate: total ? Math.round(rows.length / total * 1000) / 10 : 0,
    yesRate: total ? Math.round(yes.length / total * 1000) / 10 : 0,
    areaAll:Math.round(areaAll * 10) / 10,
    areaYes:Math.round(areaYes * 10) / 10,
    areaRate: areaAll ? Math.round(areaYes / areaAll * 1000) / 10 : 0,
    needOwner, needArea:Math.round(needArea * 10) / 10,
    okOwner: yes.length >= needOwner,
    okArea : rule.area ? areaYes >= needArea : true,
    rows
  };
}


/* ═══════════════════════════════════════════════════════════
   서면 동의서 접수와 결재
   ───────────────────────────────────────────────────────────
   ★ 실제로는 서면이 더 많다.
     어르신들은 종이로 내시고 조합 사무실에 직접 오신다.
     전자로만 받는 구조는 반쪽이다.

   ★ 대장은 하나로 합치고 접수 방법만 구분한다.
     전자와 서면을 따로 관리하면 같은 사람이 두 번 세어지고,
     요건 계산에서 어느 쪽을 더할지 헷갈린다.
     법적 효력은 같으므로 하나의 대장에 넣고 표시만 나눈다.

   ★ 흐름 (확정 · B안)
       조합원이 올 때마다 → 입력 + 스캔 → status:"draft" 로 쌓임
       기간이 차면        → 묶어서 결재 (전자 명단도 함께 붙임)
       조합장 승인        → status:"active" 로 확정

     서면은 직원이 입력하는 과정이 끼어들기 때문에 결재가 필요하다.
     전자는 PASS 인증과 서명값이 붙어 있어 손댈 여지가 없지만,
     최종 명단에는 함께 들어가야 하므로 결재 문서에 같이 붙인다.

   ★ 서면 원본은 조합이 보관하고 인가 신청 때 구청에 낸다.
     화면 입력은 집계용이지 원본을 대신하지 못한다.
     종이 오른쪽 위에 접수번호를 적어 두면 나중에 찾기 쉽다.
   ═══════════════════════════════════════════════════════════ */

let PAPER_SEQ = 0;

/* 서면 접수 — 조합원이 올 때마다 한 건씩 */
function consentPaper(formId, member, choice, addr, paperDate, by, preNo){
  const f = consentOf(formId);
  const d = new Date(), z = v => String(v).padStart(2,"0");
  const at = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} `
           + `${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`;
  /* ★ 서식을 뽑을 때 이미 번호를 매겼으면 그것을 쓴다.
     현장에서 그 자리에 서명하고 가시므로 번호가 종이에 찍혀 나온다.
     라벨을 잘라 붙일 일이 없다. */
  const no = preNo || ("CS-" + d.getFullYear() + "-" + String(++CONSENT_SEQ).padStart(4,"0"));

  /* ★ 제출일은 직원이 입력한 날이 아니라 종이에 적힌 날이다.
     서면을 3월 2일에 냈는데 3월 10일에 입력했다면 3월 2일이 기준이다.
     순서를 다툴 때 이 날짜로 판단한다. */
  const sign = consentSign([no, formId, String(member.no), choice, addr, paperDate, "PAPER"]);

  const rec = {
    serial:no, form:formId, formName:f.name,
    voter:member.no, name:member.name,
    addr, choice, how:"paper", ci:"", sign,
    at, paperDate,                    /* at = 입력 시각, paperDate = 종이에 적힌 제출일 */
    land: member.land || 0, share: member.share || "1/1",
    enteredBy: by || "직원", verifiedBy: null,
    scan: null,                       /* 스캔 파일명 */
    batch: null,                      /* 어느 결재 묶음에 들어갔나 */
    status: "draft"                   /* 조합장 승인 전까지는 확정이 아니다 */
  };
  CONSENT_LOG.push(rec);
  consentPut(by || "직원");
  return {ok:true, rec};
}

/* 결재 대기 중인 서면 (아직 묶이지 않은 것) */
const paperDrafts = formId =>
  CONSENT_LOG.filter(x => x.form === formId && x.status === "draft" && !x.batch);

/* 스캔이 안 올라온 건 */
const paperNoScan = formId =>
  paperDrafts(formId).filter(x => !x.scan);

/* ── 결재 묶음 ───────────────────────────────────────────
   전자 명단과 서면 스캔을 함께 붙여 한 번에 올린다. */
let CONSENT_BATCH = hubLoad("consent_batch", []);
let BATCH_SEQ     = hubLoad("consent_batch_seq", 0);

/* ── 서버에 올리고 받아오기 ─────────────────────────────
   ★ 부르는 쪽에서 잊지 않도록 한 곳에 몰아 둔다.
     제출 · 서면 접수 · 묶음 결재가 끝날 때마다 이것만 부르면 된다. */
function consentPut(who){
  hubPush("consent_log",       CONSENT_LOG,   who);
  hubPush("consent_seq",       CONSENT_SEQ,   who);
  hubPush("consent_batch",     CONSENT_BATCH, who);
  hubPush("consent_batch_seq", BATCH_SEQ,     who);
}

/* ── 자동으로 받아온다 (2026-08-21) ──────────────────────
   ★ 직원이 F5 를 눌러야만 보이면 쓸 수가 없다.
     조합원이 낼 때마다 새로고침하고 계실 수는 없다.
     그래서 20초마다 서버를 살펴 새 동의서가 있으면 화면에 얹는다.

   ★ 다만 직원이 무언가 치고 계실 때 화면을 갈아엎으면 안 된다.
     서면 접수를 입력하다 글자가 날아가면 종이를 다시 봐야 한다.
     칸에 커서가 있으면 미뤄 두었다가 손을 떼시면 그때 얹는다.

   ★ 접수번호(SEQ)를 먼저 맞춘다.
     폰에서 CS-2026-0001 을 냈는데 PC 가 0 부터 세면 번호가 두 번 나온다. */
let CONSENT_WAIT = false;          /* 미뤄 둔 갱신이 있는가 */
let CONSENT_NEW  = 0;              /* 보시는 동안 새로 들어온 건수 */

function consentTyping(){
  const el = (typeof document !== "undefined") ? document.activeElement : null;
  if(!el) return false;
  const t = (el.tagName || "").toUpperCase();
  return t === "INPUT" || t === "TEXTAREA" || t === "SELECT";
}

function consentRedraw(){
  if(consentTyping()){ CONSENT_WAIT = true; return; }   /* 치고 계시면 미룬다 */
  CONSENT_WAIT = false;
  if(typeof render !== "undefined") render();
}

/* 손을 떼시면 미뤄 둔 것을 얹는다 */
if(typeof document !== "undefined"){
  document.addEventListener("focusout", () => {
    if(CONSENT_WAIT) setTimeout(consentRedraw, 300);
  });
}

function consentTake(v){
  const now = JSON.stringify(v || []);
  if(now === JSON.stringify(CONSENT_LOG)) return;        /* 달라진 게 없으면 그냥 둔다 */
  const was = CONSENT_LOG.length;
  CONSENT_LOG = v || [];
  if(CONSENT_LOG.length > was) CONSENT_NEW += CONSENT_LOG.length - was;
  consentRedraw();
}

hubPull("consent_seq",       v => { CONSENT_SEQ = Math.max(CONSENT_SEQ, v || 0); });
hubPull("consent_batch_seq", v => { BATCH_SEQ   = Math.max(BATCH_SEQ,   v || 0); });

if(typeof hubPoll !== "undefined"){
  hubPoll("consent_seq",       v => { CONSENT_SEQ = Math.max(CONSENT_SEQ, v || 0); }, 20);
  hubPoll("consent_batch_seq", v => { BATCH_SEQ   = Math.max(BATCH_SEQ,   v || 0); }, 20);
  hubPoll("consent_log",       consentTake, 20);
  hubPoll("consent_batch",     v => {
    if(JSON.stringify(v||[]) === JSON.stringify(CONSENT_BATCH)) return;
    CONSENT_BATCH = v || []; consentRedraw();
  }, 20);
} else {
  hubPull("consent_log",   consentTake);
  hubPull("consent_batch", v => { CONSENT_BATCH = v || []; consentRedraw(); });
}

/* 한 컴퓨터에서 창을 여러 개 띄우신 경우 곧바로 맞춘다 */
if(typeof hubWatch !== "undefined"){
  hubWatch(k => {
    if(k === "consent_log")   hubPull("consent_log",   consentTake);
    if(k === "consent_batch") hubPull("consent_batch", v => { CONSENT_BATCH = v || []; consentRedraw(); });
  });
}

function consentBatch(formId, from, to, by){
  const f = consentOf(formId);
  const papers = paperDrafts(formId).filter(x =>
    (!from || x.paperDate >= from) && (!to || x.paperDate <= to));
  if(!papers.length) return {ok:false, why:"묶을 서면 접수 건이 없습니다."};

  const noScan = papers.filter(x => !x.scan);
  if(noScan.length) return {ok:false, why:`스캔이 올라오지 않은 건이 ${noScan.length}건 있습니다.`};

  /* 이미 확정된 전자 접수분도 명단에 함께 넣는다.
     ★ 명부에서 확인되지 않은 건은 뺀다. 결재 문서에 들어가면
       구청에 낼 명단에 유령이 섞인다. */
  const elec = consentClean(CONSENT_LOG.filter(x => x.form === formId
    && x.status === "active" && x.how !== "paper"));

  const d = new Date(), z = v => String(v).padStart(2,"0");
  const no = "CST-" + d.getFullYear() + "-" + String(++BATCH_SEQ).padStart(3,"0");
  const yes = [...papers, ...elec].filter(x => x.choice === "동의");

  const batch = {
    no, form:formId, formName:f.name,
    from, to, by: by || "직원",
    created: `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())}`,
    paperN: papers.length, elecN: elec.length, yesN: yes.length,
    serials: papers.map(x => x.serial),
    status: "pending"                 /* pending → approved · rejected */
  };
  papers.forEach(x => x.batch = no);
  CONSENT_BATCH.push(batch);
  consentPut(by || "직원");
  return {ok:true, batch, papers, elec};
}

/* 조합장 승인 → 대장 확정 */
function consentBatchApprove(no){
  const b = CONSENT_BATCH.find(x => x.no === no);
  if(!b || b.status !== "pending") return {ok:false, why:"처리할 묶음이 아닙니다."};
  let n = 0;
  CONSENT_LOG.filter(x => x.batch === no && x.status === "draft").forEach(x => {
    /* 같은 사람이 앞서 낸 것이 있으면 대체한다. 지우지 않는다. */
    CONSENT_LOG.filter(y => y.form === x.form && y.voter === x.voter
      && y.status === "active" && y !== x)
      .forEach(y => { y.status = "replaced"; y.replacedBy = x.serial; });
    x.status = "active"; n++;
  });
  b.status = "approved";
  const d = new Date(), z = v => String(v).padStart(2,"0");
  b.approvedAt = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} `
    + `${z(d.getHours())}:${z(d.getMinutes())}`;
  consentPut("조합장");
  return {ok:true, n};
}
/* ★ 직원이 올린 결재를 회수한다.
     잘못 묶었거나 빠진 건이 있을 때 쓴다.
     아직 조합장 승인 전이라야 한다. 승인된 것은 회수할 수 없다.
     묶음 기록은 지우지 않고 '취소됨'으로 남긴다. */
function consentBatchCancel(no, who){
  const b = CONSENT_BATCH.find(x => x.no === no);
  if(!b) return {ok:false, why:"묶음을 찾지 못했습니다."};
  if(b.status !== "pending")
    return {ok:false, why:"이미 처리된 묶음은 회수할 수 없습니다."};
  CONSENT_LOG.filter(x => x.batch === no).forEach(x => x.batch = null);
  const d = new Date(), z = v => String(v).padStart(2,"0");
  b.status = "cancelled";
  b.cancelledAt = `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} `
    + `${z(d.getHours())}:${z(d.getMinutes())}`;
  b.cancelledBy = who || "직원";
  consentPut(who || "직원");
  return {ok:true, n:b.paperN};
}

function consentBatchReject(no, why){
  const b = CONSENT_BATCH.find(x => x.no === no);
  if(!b) return {ok:false};
  CONSENT_LOG.filter(x => x.batch === no).forEach(x => x.batch = null);
  b.status = "rejected"; b.why = why || "";
  consentPut("조합장");
  return {ok:true};
}

/* 결재 문서 본문 — 전자결재로 넘길 때 쓴다 */
function consentBatchBody(b){
  const t = consentTally(b.form);
  const f = consentOf(b.form);
  return `1. ${f.name} 징구 명단을 아래와 같이 승인하고자 품의합니다.
  가. 접수 기간 : ${b.from} ~ ${b.to}
  나. 전자 접수 : ${b.elecN}명
  다. 서면 접수 : ${b.paperN}명
  라. 합    계 : ${b.elecN + b.paperN}명 (동의 ${b.yesN}명)
2. 인가 요건
  가. 사람 수 : 동의 ${t.yes}명 / 필요 ${t.needOwner}명 (${t.okOwner ? "충족" : "미달"})
  나. 토지면적 : ${t.areaYes}㎡ / 필요 ${t.needArea}㎡ (${t.okArea ? "충족" : "미달"})
3. 붙임
  가. 동의자 통합 명단 1부
  나. 서면 동의서 스캔 ${b.paperN}부
  다. 전자 완료증 ${b.elecN}부
※ 서면 원본은 조합 사무실에 보관하며, 인가 신청 시 구청에 제출합니다.`;
}
