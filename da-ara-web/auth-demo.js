/* ═══════════════════════════════════════════════════════════
   다알아 (Da-Ara) — 본인인증 (하이브리드 3단계)
   ───────────────────────────────────────────────────────────
   ★ 인증을 세 번으로 나눈다

       1단계 · 최초 1회   PASS 또는 NICE 로 본인확인 → 명부 대조 → 세션 발급
       2단계 · 평상시     인증 없이 그냥 이용 (공지 · 자료실 · AI · 우리집)
       3단계 · 의결 직전  투표함에 넣기 전 한 번 더 확인

     투표할 때마다 PASS 를 부르면 조합원은 번거롭고 조합은 비용을 낸다.
     반대로 아무 확인 없이 받으면 대리 투표를 막을 수 없다.
     그 사이를 잡은 것이 이 구조다.

   ★ 재인증 등급 (확정)
       일반 안건 · 설문        PIN · 생체   (기기 안에서 처리 · 과금 없음)
       시공자 선정 · 동의서     PASS 필수    (법적 증거 능력 확보)

     시공자 선정은 도시정비법상 조합원 과반수가 직접 출석해야 하는 안건이고,
     동의서는 소송에서 가장 치열하게 다투는 서류다.
     여기서 PIN 여섯 자리로 끝내면 나중에 "본인이 아니었다" 는 주장에
     방어가 약해진다. 비용을 조금 더 쓰더라도 PASS 를 쓴다.

   ★ 인증 정보는 조합에 저장하지 않는다.
     본인확인기관이 준 식별값(CI)만 받아 명부와 대조하고 버린다.
     주민번호나 생년월일을 조합 서버에 두면 그 자체가 사고 위험이다.

   ★ Supabase 대응
       idv_provider  ← IDV_PROVIDERS  (공급사 · 원가 · 청구 단가)
       idv_policy    ← IDV_POLICY     (세션 · 재인증 등급)
       idv_log       ← IDV_LOG        (인증 이력 · 과금 근거)
       세션 자체는 Supabase Auth 의 JWT 로 다룬다.
   ═══════════════════════════════════════════════════════════ */

/* ── 1. 연동 방식 ─────────────────────────────────────────
   포트원은 PASS · NICE · KCB 를 한 번에 붙일 수 있다.
   기관 직접 계약이 단가는 싸지만 기관마다 따로 계약하고 따로 붙여야 해서
   조합 하나 여는 데 시간이 훨씬 걸린다. */
let IDV_GATEWAY = "portone";          /* portone · direct */
const IDV_GATEWAYS = [
  {k:"portone", name:"포트원 (통합 연동)",
   desc:"PASS · NICE · KCB 를 한 번에. 개별 계약보다 붙이기 쉽습니다."},
  {k:"direct",  name:"기관 직접 계약",
   desc:"단가는 싸지만 기관마다 따로 계약하고 따로 붙여야 합니다."}
];

/* ── 2. 인증 수단 · 단가 ──────────────────────────────────
   cost : 공급처에 내는 값 (조합 화면에 나오지 않는다)
   fee  : 조합에 청구하는 통합 단가
   PIN · 생체는 기기 안에서 끝나므로 공급처에 낼 돈이 없다. */
let IDV_PROVIDERS = [
  {k:"pass", name:"PASS (통신 3사)", from:"포트원", cost:40, fee:60, strong:true,
   desc:"앱으로 바로 확인. 가장 널리 쓰입니다."},
  {k:"nice", name:"NICE 휴대폰",     from:"포트원", cost:45, fee:65, strong:true,
   desc:"문자로 받은 번호를 입력합니다."},
  {k:"kcb",  name:"KCB 신용정보",    from:"포트원", cost:35, fee:55, strong:true,
   desc:"예비 수단으로 열어 둡니다.", off:true},
  {k:"pin",  name:"PIN · 생체 재인증", from:"기기 내 처리", cost:0, fee:0, strong:false,
   desc:"지문 · 얼굴 · 여섯 자리 숫자. 과금이 없습니다."}
];
const idvOf = k => IDV_PROVIDERS.find(p => p.k === k) || IDV_PROVIDERS[0];
const idvStrong = () => IDV_PROVIDERS.filter(p => p.strong && !p.off);

/* ── 3. 정책 ──────────────────────────────────────────────
   ★ 명부가 바뀌면 다시 대조한다.
     지분이나 대표조합원이 바뀌면 의결권도 달라지는데
     옛 세션이 남아 있으면 의결권 없는 분이 투표할 수 있다. */
let IDV_POLICY = {
  sessionDays : 90,
  deviceBound : true,     /* 기기를 바꾸면 다시 인증 */
  rosterRecheck : true,   /* 명부가 바뀌면 다시 대조 */
  /* 무엇을 할 때 어느 등급이 필요한가 */
  level : {
    browse   : "none",    /* 공지 · 자료실 · AI · 우리집 */
    survey   : "pin",     /* 설문 */
    vote     : "pin",     /* 일반 안건 전자투표 */
    voteHard : "pass",    /* 시공자 선정 등 직접출석 요구 안건 */
    consent  : "pass"     /* 조합설립 · 사업시행 동의서 */
  }
};

/* 안건이 강한 인증을 요구하는가 */
const HARD_WORDS = ["시공자", "시공사", "동의서", "해임", "합병", "해산"];
function idvLevelFor(kind, title){
  if(kind === "consent") return "pass";
  if(kind === "vote"){
    const t = title || "";
    return HARD_WORDS.some(w => t.indexOf(w) >= 0)
      ? IDV_POLICY.level.voteHard : IDV_POLICY.level.vote;
  }
  return IDV_POLICY.level[kind] || "none";
}
const IDV_LEVEL_LABEL = {none:"인증 없이", pin:"PIN · 생체", pass:"PASS 필수"};

/* ── 4. 세션 ──────────────────────────────────────────────
   실제로는 Supabase Auth 의 JWT 를 쓴다. 여기서는 흉내만 낸다. */
let IDV_SESSION = null;

/* ★ 명부가 바뀌었는지 알아보는 지문
   인원수만 보면 안 된다. 지분이나 대표조합원이 바뀔 때는
   인원수가 그대로여서 바뀐 것을 놓친다.
   그러면 의결권을 잃은 분의 옛 세션이 살아남아 투표할 수 있게 된다.
   그래서 인원수 · 의결권자 수 · 대표 구성까지 함께 본다. */
function rosterStamp(){
  if(typeof ROSTER === "undefined") return "0";
  const n = ROSTER.length;
  const v = ROSTER.filter(r => r.rep).length;
  let h = 5381;
  ROSTER.forEach(r => {
    const key = `${r.no}|${r.rep?1:0}|${r.share||"1/1"}`;
    for(const ch of key) h = ((h * 33) ^ ch.codePointAt(0)) >>> 0;
  });
  return `${n}.${v}.${h.toString(36)}`;
}

function idvIssue(memberNo, name, how){
  const now = new Date();
  const exp = new Date(now.getTime() + IDV_POLICY.sessionDays * 86400000);
  IDV_SESSION = {
    member: memberNo, name,
    device: "DEV-" + Math.random().toString(36).slice(2,6).toUpperCase(),
    how, issued: now, expires: exp,
    rosterAt: rosterStamp()
  };
  idvLog(how, "최초 본인확인", memberNo);
  return IDV_SESSION;
}
function idvValid(){
  if(!IDV_SESSION) return false;
  if(new Date() > IDV_SESSION.expires) return false;
  /* 명부가 바뀌었으면 다시 대조해야 한다.
     인원수뿐 아니라 지분 · 대표조합원 변경까지 잡는다. */
  if(IDV_POLICY.rosterRecheck && rosterStamp() !== IDV_SESSION.rosterAt) return false;
  return true;
}
const idvLeft = () => {
  if(!IDV_SESSION) return 0;
  return Math.max(0, Math.ceil((IDV_SESSION.expires - new Date()) / 86400000));
};

/* ── 5. 인증 이력 · 과금 ──────────────────────────────────
   PASS · NICE 는 건마다 과금된다. PIN · 생체는 0원이다.
   이 기록이 곧 청구 근거가 된다. */
let IDV_LOG = [];
function idvLog(how, why, who){
  const p = idvOf(how);
  const d = new Date(), z = v => String(v).padStart(2,"0");
  IDV_LOG.push({
    at: `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} `
      + `${z(d.getHours())}:${z(d.getMinutes())}`,
    how, why, who: who || "", cost: p.cost, fee: p.fee
  });
  /* 사용량 계량에 반영 — 요금 화면에서 그대로 집계된다 */
  if(typeof USAGE !== "undefined" && (how === "pass" || how === "nice")){
    const ym = `${d.getFullYear()}-${z(d.getMonth()+1)}`;
    const code = (typeof TENANT_CODE !== "undefined") ? TENANT_CODE : "MIA-002";
    let u = USAGE.find(x => x.code === code && x.ym === ym);
    if(!u){ u = {code, ym, alim:0, sms:0, lms:0, mms:0, pass:0, nice:0, ai:0}; USAGE.push(u); }
    u[how] += 1;
  }
}

/* 인증 건수 요약 (운영자 콘솔용) */
function idvSummary(){
  const out = {};
  IDV_PROVIDERS.forEach(p => out[p.k] = {n:0, cost:0, fee:0});
  IDV_LOG.forEach(l => { const o = out[l.how]; if(!o) return;
    o.n += 1; o.cost += l.cost; o.fee += l.fee; });
  return out;
}
