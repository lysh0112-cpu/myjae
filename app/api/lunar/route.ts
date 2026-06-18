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
      url = `https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getSolCalInfo?lunYear=${year}&lunMonth=${String(month).padStart(2,"0")}&lunDay=${String(day).padStart(2,"0")}&lunLeapmonth=&ServiceKey=${apiKey}`;
    } else {
      url = `https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo?solYear=${year}&solMonth=${String(month).padStart(2,"0")}&solDay=${String(day).padStart(2,"0")}&ServiceKey=${apiKey}`;
    }

    const res = await fetch(url);
    const xmlText = await res.text();

    // XML 파싱
    const getValue = (tag: string) => {
      const match = xmlText.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
      return match ? match[1] : "";
    };

    if (calType === "음력") {
      return NextResponse.json({
        solarYear: parseInt(getValue("solYear")),
        solarMonth: parseInt(getValue("solMonth")),
        solarDay: parseInt(getValue("solDay")),
      });
    } else {
      return NextResponse.json({
        solarYear: parseInt(getValue("solYear")),
        solarMonth: parseInt(getValue("solMonth")),
        solarDay: parseInt(getValue("solDay")),
        lunarYear: parseInt(getValue("lunYear")),
        lunarMonth: parseInt(getValue("lunMonth")),
        lunarDay: parseInt(getValue("lunDay")),
        yearGanji: getValue("lunSecha"),
        monthGanji: getValue("lunWolgeon"),
        dayGanji: getValue("lunIljin"),
        debug_xml: xmlText.substring(0, 500),
      });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
