import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const day = searchParams.get("day");
  const calType = searchParams.get("calType") || "양력";
  const apiKey = process.env.KASI_API_KEY;

  if (!apiKey || !year || !month || !day) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    let url = "";
    if (calType === "음력") {
      url = `https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getSolCalInfo?lunYear=${year}&lunMonth=${String(month).padStart(2,"0")}&lunDay=${String(day).padStart(2,"0")}&lunLeapmonth=&ServiceKey=${apiKey}&_type=json`;
    } else {
      url = `https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo?solYear=${year}&solMonth=${String(month).padStart(2,"0")}&solDay=${String(day).padStart(2,"0")}&ServiceKey=${apiKey}&_type=json`;
    }

    const res = await fetch(url);
    const data = await res.json();
    const item = data?.response?.body?.items?.item;

    if (!item) {
      return NextResponse.json({ error: "No data", raw: data }, { status: 404 });
    }

    const result = Array.isArray(item) ? item[0] : item;

    return NextResponse.json({
      debug: result,
      solarYear: parseInt(result.solYear),
      solarMonth: parseInt(result.solMonth),
      solarDay: parseInt(result.solDay),
      yearGanji: result.lunSecha || "?",
      monthGanji: result.lunWolgeon || "?",
      dayGanji: result.lunIljin || "?",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
