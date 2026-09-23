// =============================================================================
//  rtms  ·  Supabase Edge Function
//  다알아 (Da-Ara) — 국토교통부 실거래가 중계
//
//  배포
//    supabase functions deploy rtms
//
//  환경변수 (supabase secrets set …)
//    RTMS_KEY   공공데이터포털 일반 인증키 (Decoding 쪽)
//               https://www.data.go.kr → 마이페이지 → 인증키
//
//  ★ 왜 중계가 필요한가
//    ① 인증키가 노출된다
//       조합원 앱은 정적 파일이다. 화면에 키를 넣으면 누구나 개발자 도구로 꺼내
//       자기 프로그램에 쓴다. 일일 호출 한도가 우리 것으로 소진되고,
//       한도를 넘기면 조합원 화면이 통째로 멈춘다.
//    ② CORS 에 막힌다
//       apis.data.go.kr 은 브라우저에서 직접 부를 수 없다.
//       Access-Control-Allow-Origin 을 내려 주지 않는다.
//    ③ XML 을 준다
//       기본 응답이 XML 이라 화면에서 파싱하면 코드가 길어지고,
//       국토부가 서식을 바꾸면 화면을 통째로 고쳐야 한다.
//       여기서 우리 모양으로 바꿔서 내려보낸다.
//
//  ★ 부르는 법
//    ① 구역 내 지분 실거래
//       GET /rtms?lawd=11305&from=2021-01&to=2026-08&kind=all
//         kind   sh(단독/다가구) · rh(연립/다세대) · apt(아파트) · all
//
//    ② 인근 아파트 단지 목록 + 평형별 시세
//       GET /rtms?mode=apt&lawd=11305&from=2024-08&to=2026-08
//         국토부가 쓰는 아파트 이름을 그대로 모아 목록으로 준다.
//         운영자가 이름을 손으로 치면 국토부 표기와 어긋나
//         「래미안트리베라」 「래미안 트리베라」 한 글자 차이로 0건이 된다.
//         고르게 하면 그 일이 없다.
//
//      lawd   법정동 코드 앞 5자리 (강북구 = 11305)
//      from   시작 계약년월  (없으면 최근 12개월)
//      to     끝 계약년월
//
//  ★ 국토부는 한 번에 한 지역 · 한 달만 준다.
//    5년치면 60번을 불러야 한다. 한도가 하루 1,000회라
//    조합원이 화면을 열 때마다 부르면 하루도 못 간다.
//    → 그래서 결과를 app_state 에 담아 두고, 화면은 그것을 읽는다.
//      이 함수는 운영자가 「지금 받아오기」를 누를 때만 돈다.
//
//  ★ 개인정보
//    단독/다가구는 국토부가 지번을 일부만 준다 (예: 436).
//    그것을 그대로 쓴다. 우리가 더 깎지도, 채우지도 않는다.
//    명의는 국토부도 주지 않고 우리도 담지 않는다.
// =============================================================================

const KEY = Deno.env.get("RTMS_KEY") ?? "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/* 국토부 오퍼레이션 — 2026-08 기준으로 확인한 주소 */
const OPS: Record<string, { path: string; label: string }> = {
  sh:  { path: "RTMSDataSvcSHTrade/getRTMSDataSvcSHTrade",   label: "단독" },
  rh:  { path: "RTMSDataSvcRHTrade/getRTMSDataSvcRHTrade",   label: "다세대" },
  apt: { path: "RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade", label: "아파트" },
};

/* ── 계약년월 목록 만들기 ──────────────────────────────
   ★ 최대 60개월로 끊는다.
     기간을 잘못 넣어 20년치를 부르면 240번이 나가고
     그날 한도가 통째로 사라진다. */
function months(from: string, to: string): string[] {
  const out: string[] = [];
  const p = (s: string) => {
    const [y, m] = String(s).replace(/[^0-9]/g, "").padEnd(6, "0")
      .match(/(\d{4})(\d{2})/)!.slice(1).map(Number);
    return { y, m };
  };
  let a = p(from), b = p(to);
  if (a.y * 12 + a.m > b.y * 12 + b.m) [a, b] = [b, a];
  let y = a.y, m = a.m, n = 0;
  while ((y < b.y || (y === b.y && m <= b.m)) && n < 60) {
    out.push(`${y}${String(m).padStart(2, "0")}`);
    m++; if (m > 12) { m = 1; y++; }
    n++;
  }
  return out;
}

/* ── XML 에서 <item> 만 뽑는다 ────────────────────────
   ★ 정규식으로 XML 을 다루는 것은 원래 좋지 않다.
     다만 이 응답은 서식이 고정돼 있고 중첩이 없어 이 정도로 충분하다.
     Deno 에 기본 DOM 파서가 없어 라이브러리를 더 얹느니 이쪽이 가볍다.
     국토부가 서식을 바꾸면 여기만 고치면 된다. */
function items(xml: string): Record<string, string>[] {
  const out: Record<string, string>[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  for (const b of blocks) {
    const o: Record<string, string> = {};
    /* ★ 바깥 <item> 을 먼저 벗겨 낸다.
       벗기지 않으면 아래 정규식이 <item> 자신을 먼저 잡아
       안쪽 전체를 값 하나로 삼킨다. 그러면 모든 칸이 비어
       한 건도 못 읽는데 오류는 나지 않는다. 조용히 0건이 된다. */
    const inner = b.replace(/^<item>/, "").replace(/<\/item>$/, "");
    /* ★ 값 안에 <> 가 없는 홑겹 태그만 본다.
       ★ CDATA 로 감싸 오는 칸이 있다. <![CDATA[ 90,000 ]]>
         `[^<]*` 만으로는 CDATA 의 `<` 에 걸려 그 칸을 통째로 놓친다.
         놓치면 금액이 비어 그 건이 버려진다. 오류는 나지 않는다.
         그래서 CDATA 형태를 따로 먼저 본다. */
    const tags = inner.match(
      /<([a-zA-Z0-9_가-힣]+)>(?:<!\[CDATA\[[\s\S]*?\]\]>|[^<]*)<\/\1>/g) || [];
    for (const t of tags) {
      const m = t.match(
        /<([a-zA-Z0-9_가-힣]+)>(?:<!\[CDATA\[([\s\S]*?)\]\]>|([^<]*))<\/\1>/);
      if (m) o[m[1]] = String(m[2] !== undefined ? m[2] : (m[3] ?? "")).trim();
    }
    out.push(o);
  }
  return out;
}

const num = (v: unknown) => Number(String(v ?? "").replace(/[^0-9.-]/g, "")) || 0;

/* ── 법정동 코드 → 구 이름 ────────────────────────────────
   ★ 국토부는 법정동(umdNm)만 주고 구 이름은 주지 않는다.
     여러 구를 한 번에 받으면 목록에 「미아동」 「길음동」만 나와
     어느 구인지 헷갈린다.

   ★ 서울 25개 구만 넣어 둔다.
     다른 지역 조합이 들어오면 그때 그 시·군·구를 더한다.
     표에 없으면 코드를 그대로 보여 준다. 빈칸으로 두면 안 된다. */
const GU: Record<string, string> = {
  "11110":"종로구","11140":"중구","11170":"용산구","11200":"성동구",
  "11215":"광진구","11230":"동대문구","11260":"중랑구","11290":"성북구",
  "11305":"강북구","11320":"도봉구","11350":"노원구","11380":"은평구",
  "11410":"서대문구","11440":"마포구","11470":"양천구","11500":"강서구",
  "11530":"구로구","11545":"금천구","11560":"영등포구","11590":"동작구",
  "11620":"관악구","11650":"서초구","11680":"강남구","11710":"송파구",
  "11740":"강동구",
};

/* ── 전용면적 → 사람들이 부르는 평형 ─────────────────────
   ★ 국토부는 전용면적만 준다. 공급면적은 주지 않는다.
     그런데 「33평」은 공급면적으로 부르는 이름이다.
     전용 84.9㎡ 를 그대로 나누면 26평이 되어 아무도 못 알아본다.

   ★ 국민주택 규모가 전용 85㎡ 이고 그것이 33~34평으로 불린다.
     그 언저리 값들을 표로 둔다. 표에 없으면 전용률 0.74 로 어림한다.

   ★ 실제 분양 평형과 한 평쯤 다를 수 있다.
     단지마다 전용률이 다르기 때문이다. 화면에 그 사실을 적는다. */
const PY_TABLE: [number, number][] = [
  [39.5, 17], [42, 18], [46, 20], [49, 21], [51, 22], [55, 24],
  [59.9, 25], [63, 27], [68, 29], [72, 30], [76, 32], [79, 33],
  [84.9, 34], [98, 39], [101, 40], [114.8, 45], [134, 52], [148, 58],
];
function pyOf(ex: number): number {
  let best = PY_TABLE[0], gap = Math.abs(ex - best[0]);
  for (const row of PY_TABLE) {
    const g = Math.abs(ex - row[0]);
    if (g < gap) { gap = g; best = row; }
  }
  /* 표에서 3㎡ 넘게 벗어나면 전용률로 어림한다 */
  if (gap > 3) return Math.round(ex / 0.74 / 3.3058);
  return best[1];
}

/* ── 국토부 응답 → 우리 모양 ───────────────────────────
   ★ 칸 이름이 오퍼레이션마다 조금씩 다르고,
     국토부가 2023년에 한 번 크게 바꿨다 (년/월/일 → dealYear 등).
     옛 이름과 새 이름을 둘 다 본다. 한쪽만 보면 어느 날 갑자기 0건이 된다.

   ★ 금액은 만원 단위 문자열로 온다 ("118,000" = 11억 8천).
     쉼표를 떼고 10000 을 곱해 원으로 만든다. */
function norm(kind: string, r: Record<string, string>) {
  const y = r.dealYear ?? r["년"] ?? "";
  const m = r.dealMonth ?? r["월"] ?? "";
  const d = r.dealDay ?? r["일"] ?? "";
  if (!y || !m || !d) return null;

  const date = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  const price = num(r.dealAmount ?? r["거래금액"]) * 10000;
  if (!price) return null;

  /* 지번 — 단독/다가구는 국토부가 일부만 준다.
     연립/다세대·아파트는 온전히 오므로 본번까지만 남긴다.
     ★ 「산12-3」 처럼 산번지가 온다. 산을 떼면 평지 12번지와 섞인다.
       숫자만 남기면 「산12」와 「12」가 같은 것이 되어 버린다. */
  const raw = String(r.jibun ?? r["지번"] ?? "").trim();
  const san = /^산/.test(raw) ? "산" : "";
  const bun = san + (raw.replace(/^산/, "").split("-")[0].replace(/[^0-9]/g, "")
              || raw.replace(/^산/, ""));

  /* 면적 — 단독은 대지면적(plottageAr)과 연면적(totalFloorAr),
     연립/아파트는 전용면적(excluUseAr)만 온다. */
  const lot = num(r.plottageAr ?? r["대지면적"]);
  const ex  = num(r.excluUseAr ?? r.totalFloorAr ?? r["전용면적"] ?? r["연면적"]);

  return {
    date,
    kind: OPS[kind].label,
    built: num(r.buildYear ?? r["건축년도"]) || "",
    bun,
    dong: String(r.umdNm ?? r["법정동"] ?? "").trim(),
    lot: lot || ex,          /* 단독은 대지면적, 없으면 연면적으로 */
    /* ★ 지분은 국토부가 주지 않는다.
       단독은 대지 전체가 한 사람 것이라 대지면적이 곧 지분이다.
       연립/다세대는 대지권 지분이 등기부에 있고 API 에는 없다.
       그래서 운영자가 뒤에서 채워야 한다. 0 으로 두고 표시로 남긴다. */
    own: kind === "sh" ? (lot || 0) : 0,
    ex,
    price,
    src: "molit",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  if (!KEY) {
    /* ★ 키가 없다는 사실을 숨기지 않는다.
       "자료가 없습니다"로 보이면 운영자가 국토부 탓인 줄 안다. */
    return json({ ok: false, reason: "nokey",
      message: "RTMS_KEY 가 설정되지 않았습니다. supabase secrets set RTMS_KEY=… 로 넣어 주십시오." }, 200);
  }

  try {
    const u = new URL(req.url);

    /* ★ 구를 여럿 받는다 (2026-08-22).
       미아2구역은 강북구 끝자락이라 성북구 길음뉴타운이 바로 옆이다.
       조합원이 실제로 견주시는 대상은 행정구역 경계를 넘는다.
       국토부는 구 단위로만 주므로, 구를 여럿 불러 합친다.

       ★ 여덟 개에서 끊는다.
         구 하나에 25개월이면 200회다. 하루 한도가 1,000회라
         그 이상은 한 번에 한도를 다 쓰게 된다. */
    const lawds = [...new Set(
      (u.searchParams.get("lawd") || "")
        .split(/[,\s]+/)
        .map((v) => v.replace(/[^0-9]/g, "").slice(0, 5))
        .filter((v) => v.length === 5)
    )].slice(0, 8);
    if (!lawds.length)
      return json({ ok: false, reason: "lawd",
        message: "법정동 코드 앞 5자리가 필요합니다. (강북구 = 11305) 쉼표로 여럿 넣으실 수 있습니다." }, 200);
    const lawd = lawds[0];

    const now = new Date();
    const ymNow = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const to   = u.searchParams.get("to")   || ymNow;
    const from = u.searchParams.get("from") ||
      `${now.getFullYear() - 1}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    /* ═══════════════════════════════════════════════════════
       mode=apt  아파트 단지 목록 · 평형별 시세
       ───────────────────────────────────────────────────────
       ★ 운영자가 이름을 손으로 치면 국토부 표기와 어긋난다.
         「래미안트리베라」 「래미안 트리베라」 「래미안트리베라1차」…
         한 글자만 달라도 0건이 나오고, 왜 안 되는지 알 수 없다.
         그래서 국토부가 쓰는 이름을 그대로 목록으로 준다.

       ★ 최근 2년치 거래에서 이름을 모은다.
         1년이면 거래가 뜸한 단지가 통째로 빠진다.
         3년이면 최저가에 옛날 값이 섞여 견주기에 도움이 안 된다.

       ★ 24번을 부른다. 한도가 하루 1,000회라 부담 없다.
         한 번 불러 담아 두면 다시 안 불러도 된다.
       ═══════════════════════════════════════════════════════ */
    /* ═══════════════════════════════════════════════════════
       mode=one  고른 단지 하나만 깊게 (2026-08-22)
       ───────────────────────────────────────────────────────
       ★ 목록은 가볍게, 고른 것만 깊게.
         운영자는 어차피 서너 단지만 고르신다.
         쓰지도 않을 단지까지 2년치를 긁는 것은 낭비였다.

       ★ 최고 · 최저는 기간이 짧으면 뜻이 없다.
         6개월치면 최고 11.8억 최저 11.2억 처럼 폭이 좁아 볼 것이 없다.
         조합원이 보시는 것은 「지금 얼마쯤 하고, 얼마까지 갔었나」다.
         그래서 고른 단지만 2년치를 본다.
       ═══════════════════════════════════════════════════════ */
    if ((u.searchParams.get("mode") || "") === "one") {
      const want = String(u.searchParams.get("name") || "").trim();
      if (!want) return json({ ok: false, reason: "name",
        message: "단지 이름이 필요합니다." }, 200);

      const ms = months(from, to);
      const types = new Map<number, { ex: number; deals: { p: number; ym: string }[] }>();
      const fails: string[] = [];
      let dong = "", built = 0, n = 0;

      for (let i = 0; i < ms.length; i += 6) {
        await Promise.all(ms.slice(i, i + 6).map(async (ym) => {
          const url = `https://apis.data.go.kr/1613000/${OPS.apt.path}`
            + `?serviceKey=${encodeURIComponent(KEY)}`
            + `&LAWD_CD=${lawd}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=1`;
          try {
            const res = await fetch(url, { headers: { "User-Agent": "da-ara/1.0" } });
            const xml = await res.text();
            if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE ERROR|LIMITED_NUMBER/.test(xml)) {
              fails.push(ym); return;
            }
            for (const r of items(xml)) {
              const name = String(r.aptNm ?? r.aptName ?? r["아파트"] ?? "").trim();
              if (name !== want) continue;      /* 고른 단지만 */
              const ex = num(r.excluUseAr ?? r["전용면적"]);
              const p  = num(r.dealAmount ?? r["거래금액"]) * 10000;
              const y  = r.dealYear ?? r["년"] ?? "";
              const m2 = r.dealMonth ?? r["월"] ?? "";
              if (!ex || !p) continue;
              n++;
              if (!dong)  dong  = String(r.umdNm ?? r["법정동"] ?? "").trim();
              if (!built) built = num(r.buildYear ?? r["건축년도"]);
              const key = Math.round(ex * 10) / 10;
              if (!types.has(key)) types.set(key, { ex: key, deals: [] });
              types.get(key)!.deals.push({ p, ym: `${y}-${String(m2).padStart(2, "0")}` });
            }
          } catch (_) { fails.push(ym); }
        }));
      }

      if (!n) return json({ ok: false, reason: "empty",
        message: `${want} 의 거래를 찾지 못했습니다. 구를 확인해 주십시오.` }, 200);

      const list = [...types.values()].map((t) => {
        const sorted = t.deals.slice().sort((x, y2) => y2.ym.localeCompare(x.ym));
        const ps = t.deals.map((d) => d.p);
        return { py: pyOf(t.ex), ex: t.ex,
                 last: sorted[0].p, at: sorted[0].ym,
                 high: Math.max(...ps), low: Math.min(...ps), n: t.deals.length };
      }).sort((x, y2) => x.py - y2.py);

      return json({
        ok: true, mode: "one",
        name: want, lawd, gu: GU[lawd] || lawd, dong, built, n,
        from, to, months: ms.length, calls: ms.length, failed: fails.length,
        at: new Date().toISOString().slice(0, 10),
        types: list,
      });
    }

    if ((u.searchParams.get("mode") || "") === "apt") {
      const ms = months(from, to);
      const map = new Map<string, {
        name: string; lawd: string; dong: string; built: number; n: number;
        types: Map<number, { ex: number; deals: { p: number; ym: string }[] }>;
      }>();
      const fails: string[] = [];

      /* 구 × 달 을 모두 펼쳐 놓고 여섯 개씩 끊어 부른다 */
      const jobs2: { cd: string; ym: string }[] = [];
      for (const cd of lawds) for (const ym of ms) jobs2.push({ cd, ym });

      for (let i = 0; i < jobs2.length; i += 6) {
        await Promise.all(jobs2.slice(i, i + 6).map(async ({ cd, ym }) => {
          const url = `https://apis.data.go.kr/1613000/${OPS.apt.path}`
            + `?serviceKey=${encodeURIComponent(KEY)}`
            + `&LAWD_CD=${cd}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=1`;
          try {
            const res = await fetch(url, { headers: { "User-Agent": "da-ara/1.0" } });
            const xml = await res.text();
            if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE ERROR|LIMITED_NUMBER/.test(xml)) {
              fails.push(`${cd}/${ym}`); return;
            }
            for (const r of items(xml)) {
              const name = String(r.aptNm ?? r.aptName ?? r["아파트"] ?? "").trim();
              const ex   = num(r.excluUseAr ?? r["전용면적"]);
              const p    = num(r.dealAmount ?? r["거래금액"]) * 10000;
              const y    = r.dealYear ?? r["년"] ?? "";
              const m2   = r.dealMonth ?? r["월"] ?? "";
              if (!name || !ex || !p) continue;

              /* ★ 같은 이름이 다른 구에 있을 수 있다.
                 「래미안」 「푸르지오」 같은 이름은 구마다 있다.
                 이름만으로 묶으면 강북구 것과 성북구 것이 한 덩어리가 된다. */
              const key2 = `${cd}|${name}`;
              if (!map.has(key2)) map.set(key2, {
                name,
                lawd: cd,
                dong: String(r.umdNm ?? r["법정동"] ?? "").trim(),
                built: num(r.buildYear ?? r["건축년도"]),
                n: 0, types: new Map(),
              });
              const a = map.get(key2)!;
              a.n++;
              if (!a.built) a.built = num(r.buildYear ?? r["건축년도"]);

              /* ★ 전용면적이 84.87 · 84.9 처럼 조금씩 다르게 온다.
                 소수점 첫째에서 반올림해 같은 평형으로 묶는다.
                 안 묶으면 33평이 다섯 줄로 갈라진다. */
              const key = Math.round(ex * 10) / 10;
              if (!a.types.has(key)) a.types.set(key, { ex: key, deals: [] });
              a.types.get(key)!.deals.push({
                p, ym: `${y}-${String(m2).padStart(2, "0")}`,
              });
            }
          } catch (_) { fails.push(ym); }
        }));
      }

      /* 평형별로 최근 · 최고 · 최저를 낸다 */
      const list = [...map.values()].map((a) => {
        const types = [...a.types.values()]
          .filter((t) => t.deals.length)
          .map((t) => {
            const sorted = t.deals.slice().sort((x, y2) => y2.ym.localeCompare(x.ym));
            const ps = t.deals.map((d) => d.p);
            return {
              /* ★ 평형은 전용면적이 아니라 공급면적으로 부른다.
                 84.9㎡ 를 그대로 3.3058 로 나누면 26평이 나오는데,
                 사람들이 부르는 이름은 33평이다. 26평이라고 띄우면
                 조합원이 "우리가 아는 그 단지가 맞나" 하신다.

                 국토부는 공급면적을 주지 않는다. 전용면적만 준다.
                 그래서 통상 전용률로 되돌린다.
                   85㎡ 이하  전용률 약 74%  (계단식 아파트 기준)
                   85㎡ 초과  전용률 약 78%  (넓을수록 전용률이 높다)
                 84.9 / 0.74 / 3.3058 = 34.7 → 반올림 35 … 여전히 어긋난다.

                 그래서 흔히 쓰는 평형으로 맞춘다.
                 실제 분양 평형과 한 평쯤 다를 수 있고,
                 그 사실을 화면에도 적는다.                        */
              py: pyOf(t.ex),
              ex: t.ex,
              last: sorted[0].p,
              at: sorted[0].ym,
              high: Math.max(...ps),
              low: Math.min(...ps),
              n: t.deals.length,
            };
          })
          .sort((x, y2) => x.py - y2.py);
        return { name: a.name, lawd: a.lawd, gu: GU[a.lawd] || a.lawd,
                 dong: a.dong, built: a.built, n: a.n, types };
      }).sort((x, y2) => y2.n - x.n);   /* 거래가 많은 단지부터 */

      return json({
        ok: true, mode: "apt", lawd, lawds, from, to,
        months: ms.length, calls: ms.length * lawds.length, failed: fails.length,
        count: list.length,
        at: new Date().toISOString().slice(0, 10),
        list,
      });
    }

    const want = (u.searchParams.get("kind") || "all").toLowerCase();
    const kinds = want === "all" ? ["sh", "rh"] : [want];
    for (const k of kinds)
      if (!OPS[k]) return json({ ok: false, reason: "kind",
        message: `kind 는 sh · rh · apt · all 중 하나입니다. (받은 값: ${k})` }, 200);

    const ms = months(from, to);
    const rows: unknown[] = [];
    const fails: string[] = [];

    /* ★ 한 번에 몰아서 부르지 않는다.
       60개월 × 2종 = 120번을 동시에 던지면 국토부가 막는다.
       여섯 개씩 끊어서 보낸다. */
    const jobs: { k: string; cd: string; ym: string }[] = [];
    for (const k of kinds) for (const cd of lawds) for (const ym of ms) jobs.push({ k, cd, ym });

    for (let i = 0; i < jobs.length; i += 6) {
      const part = jobs.slice(i, i + 6);
      await Promise.all(part.map(async ({ k, cd, ym }) => {
        const url = `https://apis.data.go.kr/1613000/${OPS[k].path}`
          + `?serviceKey=${encodeURIComponent(KEY)}`
          + `&LAWD_CD=${cd}&DEAL_YMD=${ym}&numOfRows=1000&pageNo=1`;
        try {
          const res = await fetch(url, { headers: { "User-Agent": "da-ara/1.0" } });
          const xml = await res.text();

          /* 국토부는 오류도 200 으로 준다. 본문을 봐야 안다. */
          if (/SERVICE_KEY_IS_NOT_REGISTERED|SERVICE ERROR|LIMITED_NUMBER/.test(xml)) {
            fails.push(`${k}/${cd}/${ym}`); return;
          }
          for (const r of items(xml)) {
            const n = norm(k, r);
            if (n) rows.push(n);
          }
        } catch (_) { fails.push(`${k}/${ym}`); }
      }));
    }

    rows.sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));

    return json({
      ok: true,
      lawd, lawds, from, to, kinds,
      months: ms.length, calls: ms.length * lawds.length * kinds.length,
      count: rows.length,
      failed: fails.length,          /* 몇 달치가 실패했는지 숨기지 않는다 */
      at: new Date().toISOString().slice(0, 10),
      rows,
    });
  } catch (e) {
    return json({ ok: false, reason: "error", message: String(e) }, 200);
  }
});
