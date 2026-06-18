import { NextRequest, NextResponse } from "next/server";

// =============================================
// 천문학 수식 기반 절기 계산 (1582년~9999년)
// Jean Meeus "Astronomical Algorithms" 기반
// =============================================

const STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];

// 절기별 태양황경 (도)
const MONTH_TERM_LONGITUDE: Record<number, number> = {
  1: 285,  // 소한
  2: 315,  // 입춘
  3: 345,  // 경칩
  4: 15,   // 청명
  5: 45,   // 입하
  6: 75,   // 망종
  7: 105,  // 소서
  8: 135,  // 입추
  9: 165,  // 백로
  10: 195, // 한로
  11: 225, // 입동
  12: 255, // 대설
};

// 율리우스 적일(JD) 계산
function toJulianDay(year: number, month: number, day: number): number {
  let y = year, m = month;
  if (m <= 2) { y--; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + day + B - 1524.5;
}

// 태양황경 계산 (도)
function getSolarLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;

  let L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  L0 = L0 % 360;
  if (L0 < 0) L0 += 360;

  let M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  M = (M % 360) * Math.PI / 180;

  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * M)
    + 0.000289 * Math.sin(3 * M);

  let sunLon = L0 + C;

  const omega = 125.04 - 1934.136 * T;
  sunLon = sunLon - 0.00569 - 0.00478 * Math.sin(omega * Math.PI / 180);

  sunLon = sunLon % 360;
  if (sunLon < 0) sunLon += 360;
  return sunLon;
}

// 특정 태양황경에 도달하는 날짜 계산 (이진탐색)
function findSolarTermDate(year: number, targetLon: number): Date {
  const approxMonth = Math.floor(targetLon / 30) + 3;
  const startJD = toJulianDay(year, ((approxMonth - 1) % 12) + 1, 1);

  let lo = startJD - 20;
  let hi = startJD + 20;

  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    let midLon = getSolarLongitude(mid);

    if (targetLon < 30 && midLon > 330) midLon -= 360;
    if (targetLon > 330 && midLon < 30) midLon += 360;

    if (midLon < targetLon) lo = mid;
    else hi = mid;

    if (hi - lo < 0.0001) break;
  }

  const jd = (lo + hi) / 2;
  const ms = (jd - 2440587.5) * 86400000 + 9 * 3600000;
  return new Date(ms);
}

// 절기일 가져오기
function getSolarTermDay(year: number, monthIdx: number): number {
  const targetLon = MONTH_TERM_LONGITUDE[monthIdx];
  try {
    const date = findSolarTermDate(year, targetLon);
    return date.getDate();
  } catch {
    const fallback: Record<number, number> = {
      1:6, 2:4, 3:6, 4:5, 5:6, 6:6,
      7:7, 8:8, 9:8, 10:8, 11:8, 12:7
    };
    return fallback[monthIdx];
  }
}

// 년주 계산 (입춘 기준)
function getYearGanji(year: number, month: number, day: number): string {
  const lichunDay = getSolarTermDay(year, 2);
  let adjustedYear = year;
  if (month < 2 || (month === 2 && day < lichunDay)) {
    adjustedYear = year - 1;
  }
  const BASE_YEAR = 1984;
  const offset = ((adjustedYear - BASE_YEAR) % 60 + 60) % 60;
  return STEMS[offset % 10] + BRANCHES[offset % 12];
}

// 월주 계산 (절기 기준)
function getMonthGanji(year: number, month: number, day: number): string {
  const termDay = getSolarTermDay(year, month);

  let monthIdx = month;
  if (day < termDay) {
    monthIdx = month - 1;
    if (monthIdx < 1) monthIdx = 12;
  }

  const lichunDay = getSolarTermDay(year, 2);
  let adjustedYear = year;
  if (month < 2 || (month === 2 && day < lichunDay)) {
    adjustedYear = year - 1;
  }

  const BASE_YEAR = 1984;
  const yearOffset = ((adjustedYear - BASE_YEAR) % 60 + 60) % 60;
  const yearStemIdx = yearOffset % 10;

  const inMonthStemBase = [2, 4, 6, 8, 0, 2, 4, 6, 8, 0];
  const inMonthStemIdx = inMonthStemBase[yearStemIdx];

  const branchMap: Record<number, number> = {
    1:1, 2:2, 3:3, 4:4, 5:5, 6:6,
    7:7, 8:8, 9:9, 10:10, 11:11, 12:0
  };
  const monthBranchIdx = branchMap[monthIdx];

  let stemOffset = monthBranchIdx - 2;
  if (stemOffset < 0) stemOffset += 12;
  const monthStemIdx = (inMonthStemIdx + stemOffset) % 10;

  return STEMS[monthStemIdx] + BRANCHES[monthBranchIdx];
}

// 일주 계산 (2000년 1월 1일 = 戊午, index 54)
function getDayGanji(year: number, month: number, day: number): string {
  const date = new Date(year, month - 1, day);
  const baseDate = new Date(2000, 0, 1);
  const diffDays = Math.floor((date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
  const BASE_DAY_IDX = 54;
  const idx = ((diffDays + BASE_DAY_IDX) % 60 + 60) % 60;
  return STEMS[idx % 10] + BRANCHES[idx % 12];
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");
  const day = searchParams.get("day");
  const calType = searchParams.get("calType") || "양력";
  const leapMonth = searchParams.get("leapMonth") || "0"; // 윤달 여부
  const apiKey = process.env.KASI_API_KEY;

  if (!apiKey || !year || !month || !day) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const y = parseInt(year);
  const m = parseInt(month);
  const d = parseInt(day);

  try {
    let solarYear = y, solarMonth = m, solarDay = d;

    if (calType === "음력") {
      // 윤달이면 lunLeapmonth=윤, 아니면 빈값
      const leapParam = leapMonth === "1" ? "윤" : "";
      const url = `https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getSolCalInfo?lunYear=${y}&lunMonth=${String(m).padStart(2,"0")}&lunDay=${String(d).padStart(2,"0")}&lunLeapmonth=${leapParam}&ServiceKey=${apiKey}`;
      const res = await fetch(url);
      const xmlText = await res.text();
      const getValue = (tag: string) => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
        const match = xmlText.match(regex);
        return match ? match[1].trim() : "";
      };
      solarYear = parseInt(getValue("solYear"));
      solarMonth = parseInt(getValue("solMonth"));
      solarDay = parseInt(getValue("solDay"));
    }

    const yearGanji = getYearGanji(solarYear, solarMonth, solarDay);
    const monthGanji = getMonthGanji(solarYear, solarMonth, solarDay);
    const dayGanji = getDayGanji(solarYear, solarMonth, solarDay);

    let lunarYear = 0, lunarMonth = 0, lunarDay = 0;
    if (calType === "양력") {
      const url2 = `https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo?solYear=${solarYear}&solMonth=${String(solarMonth).padStart(2,"0")}&solDay=${String(solarDay).padStart(2,"0")}&ServiceKey=${apiKey}`;
      const res2 = await fetch(url2);
      const xmlText2 = await res2.text();
      const getValue2 = (tag: string) => {
        const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`);
        const match = xmlText2.match(regex);
        return match ? match[1].trim() : "";
      };
      lunarYear = parseInt(getValue2("lunYear"));
      lunarMonth = parseInt(getValue2("lunMonth"));
      lunarDay = parseInt(getValue2("lunDay"));
    }

    return NextResponse.json({
      solarYear, solarMonth, solarDay,
      lunarYear, lunarMonth, lunarDay,
      yearGanji, monthGanji, dayGanji,
      isLeapMonth: leapMonth === "1",
    });

  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
