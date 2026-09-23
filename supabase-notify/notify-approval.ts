// =============================================================================
//  notify-approval  ·  Supabase Edge Function
//  다알아 (Da-Ara) — 결재 알림 발송 (카카오 알림톡 → 실패 시 문자)
//
//  배포
//    supabase functions deploy notify-approval
//
//  환경변수 (supabase secrets set …)
//    SUPABASE_URL              프로젝트 주소
//    SUPABASE_SERVICE_KEY      service_role 키 (절대 화면 쪽에 두지 말 것)
//    SOLAPI_KEY / SOLAPI_SECRET  중계사 인증 정보
//    SENDER_NO                 발신번호 (사전등록 마친 번호)
//    KAKAO_PFID                카카오 채널 아이디
//    APP_BASE                  https://da-ara.netlify.app/approval.html
//
//  ★ 왜 Edge Function 인가
//    DB 트리거 안에서 외부 API 를 부르면 중계사가 느릴 때 결재 저장이 물린다.
//    조합장이 승인 버튼을 눌렀는데 화면이 멈추면 다시 누르시고, 중복 발송이 된다.
//    저장은 트리거가 먼저 끝내고, 발송은 이 함수가 뒤에서 한다.
//
//  ★ 알림톡이 실패하면 문자로 대체한다.
//    카카오톡을 안 쓰거나 채널을 차단한 분이 조합 임원 중에 반드시 있다.
//    대체하지 않으면 그분은 결재가 온 줄도 모르신다.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_KEY")!,
);

const APP_BASE  = Deno.env.get("APP_BASE") ?? "";
const SENDER_NO = Deno.env.get("SENDER_NO") ?? "";
const PFID      = Deno.env.get("KAKAO_PFID") ?? "";

/* 알림톡 템플릿 코드
   ★ 카카오 심사를 받은 템플릿만 쓸 수 있고, 변수 자리만 채울 수 있다.
     문구를 마음대로 바꾸면 발송이 거부된다. 심사에 영업일 며칠 걸린다. */
const TEMPLATE: Record<string, string> = {
  new    : "DAARA_APPR_NEW",
  final  : "DAARA_APPR_FINAL",
  reject : "DAARA_APPR_REJECT",
  done   : "DAARA_APPR_DONE",
  remind : "DAARA_APPR_REMIND",
};

/* 1회용 링크 토큰 발급 (24시간) */
async function issueToken(tenant: string, docNo: string, step: number, approver: string) {
  const token = crypto.randomUUID().replace(/-/g, "").slice(0, 12).toUpperCase();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  await db.from("approval_tokens").insert({
    token, tenant_id: tenant, doc_no: docNo, step, approver, expires_at: expires,
  });
  return `${APP_BASE}?d=${encodeURIComponent(docNo)}&t=${token}`;
}

/* 메시지 조립 — 화면(approval.html)의 buildMsg 와 같은 모양이어야 한다 */
function buildMsg(kind: string, v: Record<string, string>) {
  const head = "[다알아 전자결재]";
  switch (kind) {
    case "reject":
      return `${head}\n[${v.to}님] 상신하신 문서가 반려되었습니다.\n`
           + `문서 : ${v.doc}\n제목 : ${v.title}\n반려 : ${v.by}\n사유 : ${v.comment}\n▶ 문서 보기\n${v.link}`;
    case "done":
      return `${head}\n[${v.to}님] 상신하신 문서의 결재가 완료되었습니다.\n`
           + `문서 : ${v.doc}\n제목 : ${v.title}\n▶ 문서 보기\n${v.link}`;
    case "final":
      return `${head}\n[${v.to}님] 최종 결재 차례입니다.\n`
           + `문서 : ${v.doc}\n제목 : ${v.title}\n앞 결재 : ${v.prev}\n▶ 바로 결재하기\n${v.link}`;
    default:
      return `${head}\n[${v.to}님] 처리해야 할 대기 문서가 있습니다.\n`
           + `문서 : ${v.doc}\n제목 : ${v.title}\n기안 : ${v.drafter}\n▶ 바로 결재하기\n${v.link}`;
  }
}

/* ── 중계사 호출 (솔라피 예시) ──────────────────────────────
   알리고·쿨에스엠에스도 형태만 다르고 흐름은 같다.
   type 을 ATA(알림톡) 로 보내고, 실패하면 SMS/LMS 로 다시 보낸다. */
async function solapiSend(body: unknown) {
  const key    = Deno.env.get("SOLAPI_KEY")!;
  const secret = Deno.env.get("SOLAPI_SECRET")!;
  const date   = new Date().toISOString();
  const salt   = crypto.randomUUID().replace(/-/g, "");

  // HMAC-SHA256(date + salt) — 중계사 인증 규격
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sigBuf = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(date + salt));
  const sig = [...new Uint8Array(sigBuf)].map(b => b.toString(16).padStart(2, "0")).join("");

  const res = await fetch("https://api.solapi.com/messages/v4/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `HMAC-SHA256 apiKey=${key}, date=${date}, salt=${salt}, signature=${sig}`,
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, json: await res.json().catch(() => ({})) };
}

async function sendAlimtalk(to: string, text: string, kind: string, vars: Record<string, string>) {
  return await solapiSend({
    message: {
      to: to.replace(/\D/g, ""),
      from: SENDER_NO.replace(/\D/g, ""),
      type: "ATA",
      text,
      kakaoOptions: {
        pfId: PFID,
        templateId: TEMPLATE[kind] ?? TEMPLATE.new,
        variables: vars,
        disableSms: true,   // 대체 발송은 우리가 직접 판단한다
      },
    },
  });
}

async function sendSms(to: string, text: string) {
  return await solapiSend({
    message: {
      to: to.replace(/\D/g, ""),
      from: SENDER_NO.replace(/\D/g, ""),
      type: text.length > 45 ? "LMS" : "SMS",
      subject: "다알아 전자결재",
      text,
    },
  });
}

// =============================================================================
//  진입점
//  Database Webhook (notify_log INSERT) 이 부르거나,
//  Cron 으로 주기 호출해 보류·실패 건을 집어가게 해도 된다.
// =============================================================================
Deno.serve(async (req) => {
  try {
    const hook = await req.json().catch(() => ({}));
    const rowId = hook?.record?.notify_id ?? null;

    // 보낼 건 고르기 : 방금 들어온 건 + 보류 시각이 지난 건 + 실패한 건
    let q = db.from("notify_log").select("*").limit(20);
    q = rowId
      ? q.eq("notify_id", rowId)
      : q.in("result", ["queued", "hold", "fail"])
         .or(`send_after.is.null,send_after.lte.${new Date().toISOString()}`);

    const { data: rows, error } = await q;
    if (error) throw error;

    const done: unknown[] = [];

    for (const r of rows ?? []) {
      // 문서·결재선에서 표시할 값 채우기
      const { data: doc } = await db.from("documents")
        .select("title, drafter, doc_no, tenant_id").eq("doc_no", r.doc_no).single();
      const { data: line } = await db.from("doc_approvals")
        .select("step, approver, status, acted_at").eq("doc_no", r.doc_no).order("step");

      const nextStep = (line ?? []).find(x => x.status === "wait")?.step ?? 3;
      const prev = (line ?? []).filter(x => x.status === "ok").slice(-1)[0];

      const link = await issueToken(r.tenant_id, r.doc_no, nextStep, r.to_name);
      const vars = {
        "#{이름}": r.to_name,
        "#{문서번호}": r.doc_no,
        "#{제목}": doc?.title ?? "",
        "#{기안자}": doc?.drafter ?? "",
        "#{링크}": link,
      };
      const text = buildMsg(r.kind, {
        to: r.to_name, doc: r.doc_no, title: doc?.title ?? "",
        drafter: doc?.drafter ?? "", link,
        prev: prev ? `${prev.approver} 승인 ${String(prev.acted_at).slice(5, 16)}` : "",
        by: r.to_name, comment: r.message ?? "",
      });

      // ① 알림톡
      let channel = "alimtalk";
      let result  = "fail";
      let out     = await sendAlimtalk(r.to_phone, text, r.kind, vars);

      // ② 실패하면 문자로 대체
      if (!out.ok) {
        channel = "sms";
        out = await sendSms(r.to_phone, text);
        result = out.ok ? "fallback" : "fail";
      } else {
        result = "ok";
      }

      await db.from("notify_log").update({
        channel, result, message: text,
        template: TEMPLATE[r.kind] ?? null,
        provider: "solapi",
        provider_id: (out.json as any)?.groupId ?? null,
        raw: out.json,
        sent_at: new Date().toISOString(),
      }).eq("notify_id", r.notify_id);

      done.push({ id: r.notify_id, to: r.to_name, channel, result });
    }

    return new Response(JSON.stringify({ sent: done.length, done }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    // ★ 실패해도 예외를 삼키지 말 것.
    //   조용히 안 보내지는 것이 가장 나쁘다. 로그에 남겨 사람이 알아야 한다.
    console.error("[notify-approval]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
