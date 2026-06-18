import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const day = searchParams.get("day");
  const apiKey = process.env.KASI_API_KEY;

  if (!apiKey || !year || !month || !day) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const url = `http://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getSolCalInfo?lunYear=${year}&lunMonth=${String(month).padStart(2,"0")}&lunDay=${String(day).padStart(2,"0")}&lunLeapmonth=&ServiceKey=${apiKey}&_type=json`;
    const res = await fetch(url);
    const data = await res.json();
    const item = data?.response?.body?.items?.item;
    if (!item) {
      return NextResponse.json({ error: "No data" }, { status: 404 });
    }
    const result = Array.isArray(item) ? item[0] : item;
    return NextResponse.json({
      solarYear: parseInt(result.solYear),
      solarMonth: parseInt(result.solMonth),
      solarDay: parseInt(result.solDay),
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
