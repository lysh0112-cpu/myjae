/* ═══════════════════════════════════════════════════════════
   다알아 (Da-Ara) — 명부 변경 결재 연동
   ───────────────────────────────────────────────────────────
   ★ 명부는 직원이 혼자 고칠 수 없다.
     수정 · 추가 · 삭제 · 일괄등록 무엇이든
     [명부 변경 품의] 가 자동으로 만들어지고,
     총무이사 검토 → 조합장 승인을 거쳐야 실제로 반영된다.

     담당 직원의 임의 수정을 원천 차단하고,
     분쟁이 났을 때 결재 증빙으로 방어하기 위한 것이다.

   ★ 삭제는 더 무겁게 다룬다 (확정)
     매매 · 상속으로 자격이 넘어가는 중대한 사안이라
     등기부등본이나 매매계약서 같은 근거 문서를 붙여야
     결재가 올라간다. 잘못 지우면 그분 의결권이 사라진다.

   ★ 긴급 통로는 두지 않는다 (확정)
     총회 당일이라도 정석대로 결재를 거친다.
     긴급 통로를 열어두면 그것이 일상이 된다.
     알림톡이 조합장 폰으로 즉시 가므로 승인은 30초면 끝난다.

   ★ 투표 중에는 반영하지 않는다
     이미 60명이 97명 기준으로 표를 던졌는데
     도중에 의결권자가 109명이 되면 그 표들의 기준이 달라진다.
     가결·부결이 뒤집힐 수 있고, 소송이 나면 조합이 진다.
     승인은 받되 적용은 투표 마감 뒤로 미룬다.

   ★ Supabase 대응
       roster_changes      ← MBR            (변경 품의 · 결재선)
       roster_change_items ← MBR[].items    (변경 항목 하나하나)
       documents           ← 같은 문서로 이어 붙는다 (code = MBR)
   ═══════════════════════════════════════════════════════════ */

/* 명부 변경 품의 — 전자결재의 문서와 같은 모양이라
   approval.html 의 결재함에 그대로 이어 붙는다. */
let MBR = [];
let MBR_SEQ = 6;
const mbrNo = () => "MBR-2026-" + String(++MBR_SEQ).padStart(3,"0");

const MBR_KIND = {
  edit:{label:"정보 수정", pill:"p-blue"},
  add :{label:"신규 등록", pill:"p-ok"},
  del :{label:"조합원 삭제", pill:"p-red"},
  bulk:{label:"일괄 등록", pill:"p-ok"}
};

/* 투표가 진행 중인가 — 진행 중이면 승인돼도 적용을 미룬다 (절대규칙 ⑧)
   ★ 2026-08-31 — 총회가 여러 개가 됐다.
     서버(meetings 표)에서 「진행중」인 총회 하나를 본다.
     구역에 진행중은 하나뿐이도록 표가 막고 있다.
     표가 아직 없으면 예전처럼 화면 안 예시 총회를 본다. */
function voteLocked(){
  if(typeof mtOpenVote !== "undefined") return !!mtOpenVote();
  return (typeof DEMO_MEETING !== "undefined") && DEMO_MEETING.status === "open";
}

/* 결재선 — 담당자는 올린 즉시 승인 처리되고 총무이사에게 넘어간다 */
function mbrLine(drafter){
  const at = (() => { const d=new Date(), z=v=>String(v).padStart(2,"0");
    return `${d.getFullYear()}-${z(d.getMonth()+1)}-${z(d.getDate())} ${z(d.getHours())}:${z(d.getMinutes())}`; })();
  return [
    {step:1, role:"담당자",   approver:drafter||"직원",  status:"ok",   acted_at:at, comment:null},
    {step:2, role:"총무이사", approver:"박총무",         status:"wait", acted_at:null, comment:null},
    {step:3, role:"조합장",   approver:"김조합장",       status:"wait", acted_at:null, comment:null}
  ];
}

/* 변경 품의 만들기
   kind  : edit · add · del · bulk
   items : [{op, no, name, field, from, to}]  또는 신규/일괄은 {op:"add", row:{...}}
   files : 근거 문서 (삭제일 때 필수) */
function mbrCreate(kind, items, drafter, files){
  const no = mbrNo();
  const K = MBR_KIND[kind] || MBR_KIND.edit;
  const n = kind === "bulk" ? items.length
          : kind === "edit" ? new Set(items.map(x=>x.no)).size
          : items.length;
  const now = new Date(), z=v=>String(v).padStart(2,"0");
  const today = `${now.getFullYear()}-${z(now.getMonth()+1)}-${z(now.getDate())}`;

  const body = `1. 조합원 명부를 아래와 같이 변경하고자 품의합니다.
  가. 구 분 : ${K.label}
  나. 대상 : ${n}명
  다. 사 유 : ${kind==="del" ? "매매·상속에 따른 조합원 자격 승계"
             : kind==="bulk" ? "명부 일괄 등록"
             : kind==="add"  ? "신규 조합원 등록" : "조합원 정보 수정"}
2. 변경 후 명부는 ${mbrAfterCount(kind, items).all}명, 의결권자는 ${mbrAfterCount(kind, items).voter}명이 됩니다.
3. 붙임 : ${files && files.length ? files.map(f=>f.kind).join(" · ") : "없음"}`;

  const doc = {
    no, code:"MBR", title:`조합원 명부 변경의 건 (${K.label} ${n}명)`,
    amount:"", item:null, payee:null,
    drafted:today, drafter:drafter||"직원", status:"pending",
    body, files:(files||[]).slice(),
    line: mbrLine(drafter),
    seal:null,
    mbr: {kind, items:JSON.parse(JSON.stringify(items)), applied:false, held:false}
  };
  MBR.push(doc);
  return doc;
}

/* 승인되면 명부는 몇 명이 되는가 — 결재 화면에 미리 보여 준다 */
function mbrAfterCount(kind, items){
  const R = (typeof ROSTER !== "undefined") ? ROSTER : [];
  let all = R.length, voter = R.filter(x=>x.rep).length;
  if(kind === "del"){
    items.forEach(it => { const r = R.find(x=>x.no===it.no);
      if(r){ all -= 1; if(r.rep) voter -= 1; } });
  } else if(kind === "add" || kind === "bulk"){
    items.forEach(it => { const row = it.row || it;
      if(!R.find(x=>x.no===row.no)){ all += 1; if(row.rep !== false) voter += 1; } });
  } else {
    /* 수정은 대표조합원 값이 바뀔 때만 의결권자 수가 달라진다 */
    items.forEach(it => {
      if(it.field !== "대표조합원") return;
      if(it.to === "Y" && it.from === "N") voter += 1;
      if(it.to === "N" && it.from === "Y") voter -= 1;
    });
  }
  return {all, voter};
}

/* 최종 승인 후 실제 반영
   ★ 투표 중이면 적용을 미루고 held 로 표시한다. */
function mbrApply(doc){
  if(!doc || !doc.mbr || doc.mbr.applied) return {ok:false, why:"이미 반영됐습니다"};
  if(voteLocked()){ doc.mbr.held = true;
    return {ok:false, held:true,
      why:"총회 투표가 진행 중이라 마감 후에 반영됩니다"}; }

  const R = ROSTER;
  const {kind, items} = doc.mbr;
  let add=0, upd=0, del=0;

  if(kind === "del"){
    items.forEach(it => { const i = R.findIndex(x=>x.no===it.no);
      if(i>=0){ R.splice(i,1); del++; }
      /* 조합원이 빠지면 그분 물건도 함께 뺀다 */
      if(typeof PROPS !== "undefined") PROPS = PROPS.filter(p => p.no !== it.no);
    });
  } else if(kind === "add" || kind === "bulk"){
    items.forEach(it => { const row = it.row || it;
      const i = R.findIndex(x=>x.no===row.no);
      if(i>=0){ Object.assign(R[i], row); upd++; } else { R.push(row); add++; }
      /* ★ 소유 물건도 함께 갈아 끼운다.
         조합원만 바꾸고 물건을 그대로 두면 면적이 옛 값으로 남는다. */
      if(typeof PROPS !== "undefined" && it.props){
        PROPS = PROPS.filter(p => p.no !== row.no);
        it.props.forEach(p => PROPS.push(Object.assign({}, p)));
      } });
  } else {
    const byNo = {};
    items.forEach(it => { (byNo[it.no] = byNo[it.no] || []).push(it); });
    Object.keys(byNo).forEach(no => {
      const r = R.find(x=>String(x.no)===String(no)); if(!r) return;
      byNo[no].forEach(it => {
        const map = {"성명":"name","연락처":"phone","소유부동산":"addr","물건종류":"type",
                     "대지면적":"land","건물면적":"bldg","지분":"share","대표조합원":"rep"};
        const k = map[it.field]; if(!k) return;
        r[k] = k==="rep" ? (it.to==="Y")
             : (k==="land"||k==="bldg") ? Number(it.to)||0 : it.to;
      });
      upd++;
    });
  }
  doc.mbr.applied = true; doc.mbr.held = false;
  const now = new Date(), z=v=>String(v).padStart(2,"0");
  doc.mbr.appliedAt = `${now.getFullYear()}-${z(now.getMonth()+1)}-${z(now.getDate())} `
    + `${z(now.getHours())}:${z(now.getMinutes())}`;
  return {ok:true, add, upd, del,
    all:R.length, voter:R.filter(x=>x.rep).length};
}

/* 투표가 마감되면 미뤄 둔 건을 한꺼번에 반영한다 */
function mbrApplyHeld(){
  if(voteLocked()) return {ok:false, why:"아직 투표가 진행 중입니다"};
  let n = 0;
  MBR.filter(d => d.status==="approved" && d.mbr && !d.mbr.applied)
     .forEach(d => { const r = mbrApply(d); if(r.ok) n++; });
  return {ok:true, n};
}

/* 대기 중인 변경 (승인 전 + 승인됐으나 투표로 보류) */
const mbrPending = () => MBR.filter(d =>
  d.status === "pending" || (d.status === "approved" && d.mbr && !d.mbr.applied));

/* 대기 건이 모두 반영되면 명부는 몇 명이 되는가 */
function mbrPendingCount(){
  const R = (typeof ROSTER !== "undefined") ? ROSTER : [];
  let all = R.length, voter = R.filter(x=>x.rep).length;
  mbrPending().forEach(d => {
    const c = mbrAfterCount(d.mbr.kind, d.mbr.items);
    all += (c.all - R.length); voter += (c.voter - R.filter(x=>x.rep).length);
  });
  return {all, voter};
}

/* 삭제할 때 붙여야 하는 근거 문서 (확정 · B안) */
const MBR_DEL_DOCS = ["등기부등본", "매매계약서", "상속 관련 서류", "기타 자격 승계 증빙"];
