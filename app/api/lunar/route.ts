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
      // 음력 → 양력 변환
      url = `http://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getSolCalInfo?lunYear=${year}&lunMonth=${String(month).padStart(2,"0")}&lunDay=${String(day).padStart(2,"0")}&lunLeapmonth=&ServiceKey=${apiKey}&_type=json`;
    } else {
      // 양력 → 음력 + 간지 정보
      url = `http://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo?solYear=${year}&solMonth=${String(month).padStart(2,"0")}&solDay=${String(day).padStart(2,"0")}&ServiceKey=${apiKey}&_type=json`;
    }

    const res = await fetch(url);
    const data = await res.json();
    const item = data?.response?.body?.items?.item;
    if (!item) {
      return NextResponse.json({ error: "No data" }, { status: 404 });
    }
    const result = Array.isArray(item) ? item[0] : item;

    if (calType === "음력") {
      return NextResponse.json({
        solarYear: parseInt(result.solYear),
        solarMonth: parseInt(result.solMonth),
        solarDay: parseInt(result.solDay),
      });
    } else {
      return NextResponse.json({
        solarYear: parseInt(result.solYear),
        solarMonth: parseInt(result.solMonth),
        solarDay: parseInt(result.solDay),
        lunarYear: parseInt(result.lunYear),
        lunarMonth: parseInt(result.lunMonth),
        lunarDay: parseInt(result.lunDay),
        yearGanji: result.lunSecha,   // 년 간지 (예: 戊寅)
        monthGanji: result.lunWolgeon, // 월 간지 (예: 壬子)
        dayGanji: result.lunIljin,    // 일 간지 (예: 壬子)
      });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
