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
      url = `http://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getSolCalInfo?lunYear=${year}&lunMonth=${String(month).padStart(2,"0")}&lunDay=${String(day).padStart(2,"0")}&lunLeapmonth=&ServiceKey=${apiKey}&_type=json`;
    } else {
      url = `http://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo?solYear=${year}&solMonth=${String(month).padStart(2,"0")}&solDay=${String(day).padStart(2,"0")}&ServiceKey=${apiKey}&_type=json`;
    }

    const res = await fetch(url);
    const data = await res.json();
    const item = data?.response?.body?.items?.item;

    if (!item) {
      return NextResponse.json({ error: "No data", raw: data }, { status: 404 });
    }

    const result = Array.isArray(item) ? item[0] : item;

    // 실제 필드명 확인용으로 전체 반환
    return NextResponse.json({
      debug: result, // 전체 필드 확인용
      solarYear: parseInt(result.solYear),
      solarMonth: parseInt(result.solMonth),
      solarDay: parseInt(result.solDay),
      yearGanji: result.lunSecha || result.lunYear_ganji || result.yearGanji || "?",
      monthGanji: result.lunWolgeon || result.lunMonth_ganji || result.monthGanji || "?",
      dayGanji: result.lunIljin || result.lunDay_ganji || result.dayGanji || "?",
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
