// =============================================================================
//  ai-extract  ·  Supabase Edge Function
//  다알아 (Da-Ara) — 올린 자료에서 「조합원이 물으실 것」을 뽑는다
//
//  ★ 이 파일은 기록용이다. 실제로 도는 것은 Supabase 화면에 붙여넣은 것이다.
//    (Edge Functions → ai-extract → Code 에서 볼 수 있다)
//
//  ★ 비밀값 (Edge Functions → Secrets)
//    ANTHROPIC_API_KEY   sk-ant-… (daara-ai-extract · daara-server 계정)
//    AI_MODEL            (없어도 된다 · 기본 claude-sonnet-5)
//
//  ★ 부르는 법  POST  { url, cat, title, keywords, have }
//              POST  { url, mode:"fin", year }   ← 결산서의 표를 칸으로 읽는다 (2026-09-22)
// =============================================================================

const KEY   = Deno.env.get("ANTHROPIC_API_KEY") ?? "";
const MODEL = Deno.env.get("AI_MODEL") ?? "claude-sonnet-5";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const J = (o: unknown, s = 200) =>
  new Response(JSON.stringify(o), {
    status: s,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

const HINT: Record<string, string> = {
  gosi: "용적률 · 세대수 · 임대주택 · 용도지역 · 기반시설 · 최고층수 · 사업 일정",
  rule: "조합원 자격 · 임원 임기와 선임 · 해임 절차 · 총회 소집 · 의결 정족수 · 대의원회",
  minu: "안건 · 표결 결과 · 출석 인원 · 의결 정족수 · 다음 회의 일정",
  appr: "평가 기준일 · 평가법인 · 평가 방법 · 종전자산 총액 · 비례율 · 이의 신청",
  acct: "예산 총액 · 과목별 내역 · 집행 실적 · 승인 총회 · 감사 의견",
  week: "보고 기간 · 진행 중인 일 · 다음 주 계획 · 지연된 일과 사유",
  suit: "사건번호 · 당사자 · 청구 취지 · 진행 단계 · 다음 기일",
  audit: "감사 기간 · 지적 사항 · 시정 요구 · 감사 의견",
};

const SYS = [
  "당신은 재개발 조합 사무실의 자료 정리를 돕습니다.",
  "조합원이 실제로 궁금해하실 만한 질문과, 그 답을 문서에서 찾아 적습니다.",
  "",
  "반드시 지킬 것",
  "1. 답은 문서에 적힌 숫자와 사실이어야 합니다.",
  "   「해당 쪽에 있습니다」 같은 안내는 답이 아닙니다.",
  "2. 문서에 없는 것은 만들어 내지 마십시오. 없으면 그 질문을 빼십시오.",
  "3. 숫자는 문서에 적힌 그대로 옮깁니다. 반올림하거나 고치지 마십시오.",
  "4. 해석이나 의견을 쓰지 마십시오. 조합의 공식 입장이 되어 버립니다.",
  "5. 존댓말로 씁니다.",
  "6. page 는 **파일의 몇 번째 쪽**인지 적습니다. 첫 쪽이 1 입니다.",
  "   문서에 인쇄된 쪽 번호(예: 237쪽, 200쪽)가 아닙니다.",
  "   사진이면 page 를 빈칸으로 두십시오.",
].join("\n");
/* ★ 6번은 2026-09-20 에 더했다 (인수인계서 115절).
   사진 두 장짜리 자료에 AI 가 책자에 인쇄된 「200쪽」을 적어
   조합원 화면에 [원문 200쪽 보기]가 나갔다.
   PDF 도 같다 — 고시는 시보 237~300쪽을 떼어 온 64쪽짜리라
   인쇄 번호로는 #page= 가 엉뚱한 데를 연다. */

function parseRows(txt: string): any[] {
  const s = txt.replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = s.indexOf("["), b = s.lastIndexOf("]");
  if (a < 0 || b < a) return [];
  try {
    const arr = JSON.parse(s.slice(a, b + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.q === "string" && x.q.trim())
      .slice(0, 20)
      .map((x) => ({
        q: String(x.q).trim(),
        a: typeof x.a === "string" ? x.a.trim() : "",
        at: typeof x.at === "string" ? x.at.trim() : "",
        page: x.page == null ? "" : String(x.page).trim(),
        kw: Array.isArray(x.kw)
          ? x.kw.filter((k: unknown) => typeof k === "string").slice(0, 6)
          : [],
      }));
  } catch {
    return [];
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return J({ ok: false, why: "POST 로 불러 주십시오." });

  if (!KEY) {
    return J({ ok: false, why: "서버에 ANTHROPIC_API_KEY 가 없습니다.\n\nSupabase → Edge Functions → Secrets 에 넣어 주십시오." });
  }

  let b: any;
  try { b = await req.json(); }
  catch { return J({ ok: false, why: "보내신 것을 읽지 못했습니다." }); }

  const url = String(b?.url ?? "").trim();
  if (!url) return J({ ok: false, why: "원문 파일 주소가 없습니다." });

  const mode = String(b?.mode ?? "").trim();       /* "fin" 이면 결산서 표 읽기 */
  const year = String(b?.year ?? "").trim();
  const cat  = String(b?.cat ?? "").trim();
  const ttl  = String(b?.title ?? "").trim();
  const kw   = String(b?.keywords ?? "").trim();
  const have: string[] = Array.isArray(b?.have) ? b.have.slice(0, 80) : [];

  const low = url.split("?")[0].toLowerCase();
  let block: any;
  if (low.endsWith(".pdf")) {
    block = { type: "document", source: { type: "url", url } };
  } else if (/\.(png|jpe?g|gif|webp)$/.test(low)) {
    block = { type: "image", source: { type: "url", url } };
  } else {
    return J({ ok: false, why: "PDF 와 사진만 읽을 수 있습니다.\n\n한글(hwp) · 워드 파일은 PDF 로 저장해 다시 올려 주십시오." });
  }

  /* ★★ 결산서 읽기 (2026-09-22)
     총회 책자의 「운영비 예산·결산 대비표」 · 「사업비 예산·결산 대비표」 ·
     재무상태표 · 손익계산서에서 **숫자를 칸으로** 뽑는다.
     ★ 직원이 손으로 30줄을 옮겨 적으면 반드시 틀린다. AI 가 옮기고 사람이 대조한다.
     ★ 합계(opChk · bizChk)는 결산서에 **적혀 있는 값**을 그대로 준다.
       우리 화면이 항목을 더한 값과 견주어 잘못 읽은 줄을 잡아낸다. */
  if (mode === "fin") {
    const fask = [
      year ? `이 문서는 ${year}년 결산서입니다.` : "",
      "총회 책자의 결산 자료입니다. 아래를 찾아 JSON 으로만 주십시오.",
      "",
      "① 「운영비 예산·결산 대비표」 → op",
      "   항(項) 단위로 한 줄씩. 예) 인건비 · 일반운영비 · 제세공과금 · 업무추진비 ·",
      "   복리후생비 · 회의비 · 기타운영비 · 예비비",
      "   그 아래 목/세목은 sub 에 넣습니다. 예) 인건비 → 상근임원 급여 · 직원(사무장) 급여 …",
      "   ko 에는 조합원이 알기 쉬운 말을 한 줄로 적습니다(없으면 빈칸).",
      "② 「사업비 예산·결산 대비표」 → biz  (같은 모양)",
      "③ 표 맨 아래 합계의 **결산액** → opChk · bizChk",
      "④ 차입금 → loans",
      "   ★ 「자산 부채 명세서」의 **부채명세서**에 차입금이 거래처별로 적혀 있으면",
      "     그 줄을 **한 줄씩 그대로** 옮깁니다. 비고(거래처)를 who 에 적습니다.",
      "     「차입금」 아래 줄은 kind \"단기\", 「장기차입금」 아래 줄은 kind \"장기\" 입니다.",
      "   ★ 명세서가 없으면 재무상태표의 차입금 · 장기차입금 합계만 한 줄씩 적습니다.",
      "   ★ 이율 · 빌린 날 · 갚기로 한 날은 **문서에 적혀 있을 때만** 적습니다.",
      "     없으면 반드시 빈 문자열로 두십시오. 아래 보기의 글자를 베끼지 마십시오.",
      "⑤ 재무상태표 · 손익계산서 · 자산명세서에서",
      "   cash.bank    보통예금(당좌자산의 보통예금)",
      "   cash.unpaid  미지급금",
      "   cash.loss    당기순손실",
      "   cash.deficit 미처리결손금(누적)",
      "",
      "★ 숫자는 쉼표 없이 숫자만 적습니다. 문서에 없는 칸은 빈 문자열로 둡니다.",
      "★ 문서에 적힌 그대로만 옮깁니다. 더하거나 빼거나 고치지 마십시오.",
      "★ 항목 이름은 결산서에 적힌 글자 그대로 씁니다.",
      "★ 아래 JSON 은 **모양을 보이는 보기**입니다. 그 안의 숫자와 글자를 베끼지 마십시오.",
      "",
      "다른 말은 한 글자도 붙이지 말고 아래 모양의 JSON 만 주십시오.",
      '{"op":[{"k":"인건비","ko":"급여·상여·퇴직급여","bud":"333733333","use":"163609053",'
        + '"sub":[{"k":"상근임원 급여","bud":"108000000","use":"48884316"}]}],'
        + '"biz":[],"opChk":"311708520","bizChk":"253209470",'
        + '"loans":[{"who":"","kind":"장기","amt":"3843685040","rate":"","from":"","due":"","use":""}],'
        + '"cash":{"bank":"553873091","unpaid":"3050516729","loss":"311405986","deficit":"3090957908"}}',
    ].filter(Boolean).join("\n");

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": KEY,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 8000,
          system: "당신은 한국 재개발조합의 회계 자료를 읽는 사람입니다. "
                + "문서에 적힌 숫자만 그대로 옮깁니다. 짐작하거나 계산하지 않습니다.",
          messages: [{ role: "user", content: [block, { type: "text", text: fask }] }],
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        return J({ ok: false, why: `AI 가 ${r.status} 를 돌려주었습니다.`, detail: t.slice(0, 400) });
      }
      const d = await r.json();
      const txt = (d?.content ?? [])
        .filter((x: any) => x?.type === "text").map((x: any) => x.text).join("\n");
      const m = txt.match(/\{[\s\S]*\}/);
      if (!m) return J({ ok: false, why: "표를 읽지 못했습니다.", raw: txt.slice(0, 400) });
      let v: any;
      try { v = JSON.parse(m[0]); }
      catch { return J({ ok: false, why: "읽은 것을 옮기지 못했습니다.", raw: m[0].slice(0, 400) }); }
      return J({ ok: true, fin: v, model: MODEL, usage: d?.usage ?? null });
    } catch (e) {
      return J({ ok: false, why: "AI 를 부르지 못했습니다.", detail: String(e).slice(0, 300) });
    }
  }

  const ask = [
    ttl ? `문서 이름 · ${ttl}` : "",
    HINT[cat] ? `조합원이 주로 찾는 것 · ${HINT[cat]}` : "",
    kw ? `★ 이번에는 다음 낱말과 관련된 것만 찾아 주십시오 · ${kw}` : "",
    have.length ? `이미 만들어 둔 질문입니다. 겹치지 않게 해 주십시오.\n- ${have.join("\n- ")}` : "",
    "",
    "이 문서를 읽고, 조합원이 물으실 질문과 답을 뽑아 주십시오.",
    kw ? "관련된 것이 없으면 빈 배열 [] 만 주십시오." : "많아야 8개까지만 주십시오.",
    "",
    "다른 말은 한 글자도 붙이지 말고, 아래 모양의 JSON 배열만 주십시오.",
    '[{"q":"질문","a":"문서에 적힌 숫자와 사실로 된 답","at":"제○조 (정관·규약일 때만)","page":"파일의 몇 번째 쪽 (1부터 · 인쇄된 번호 아님 · 사진이면 빈칸)","kw":["조합원이 달리 물으실 말","예비 낱말"]}]',
  ].filter(Boolean).join("\n");

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYS,
        messages: [{ role: "user", content: [block, { type: "text", text: ask }] }],
      }),
    });

    if (!r.ok) {
      const t = await r.text();
      return J({ ok: false, why: `AI 가 ${r.status} 를 돌려주었습니다.`, detail: t.slice(0, 400) });
    }

    const d = await r.json();
    const txt = (d?.content ?? [])
      .filter((x: any) => x?.type === "text")
      .map((x: any) => x.text)
      .join("\n");

    const rows = parseRows(txt);
    if (!rows.length) {
      return J({ ok: true, rows: [], raw: txt.slice(0, 400), model: MODEL });
    }
    return J({ ok: true, rows, model: MODEL, usage: d?.usage ?? null });
  } catch (e) {
    return J({ ok: false, why: "AI 를 부르지 못했습니다.", detail: String(e).slice(0, 300) });
  }
});
