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
    const url = `http://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo?solYear=${year}&solMonth=${String(month).padStart(2,"0")}&solDay=${String(day).padStart(2,"0")}&ServiceKey=${apiKey}&_type=json`;
    const res = await fetch(url);
    const data = await res.json();
    const item = data?.response?.body?.items?.item;
    if (!item) {
      return NextResponse.json({ error: "No data" }, { status: 404 });
    }
    return NextResponse.json({
      lunarYear: item.lunYear,
      lunarMonth: item.lunMonth,
      lunarDay: item.lunDay,
      solarYear: item.solYear,
      solarMonth: item.solMonth,
      solarDay: item.solDay,
      leapMonth: item.lunLeapmonth === "윤",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
} 
