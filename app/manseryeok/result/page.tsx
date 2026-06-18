"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const HEAVENLY_STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const EARTHLY_BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STEM_ELEMENT: Record<string,string> = {甲:"목",乙:"목",丙:"화",丁:"화",戊:"토",己:"토",庚:"금",辛:"금",壬:"수",癸:"수"};
const BRANCH_ELEMENT: Record<string,string> = {子:"수",丑:"토",寅:"목",卯:"목",辰:"토",巳:"화",午:"화",未:"토",申:"금",酉:"금",戌:"토",亥:"수"};
const ELEMENT_COLOR: Record<string,string> = {목:"#4caf50",화:"#f44336",토:"#ff9800",금:"#9e9e9e",수:"#2196f3"};
const BRANCH_LIST = [
  {char:"子",name:"자"},{char:"丑",name:"축"},
  {char:"寅",name:"인"},{char:"卯",name:"묘"},
  {char:"辰",name:"진"},{char:"巳",name:"사"},
  {char:"午",name:"오"},{char:"未",name:"미"},
  {char:"申",name:"신"},{char:"酉",name:"유"},
  {char:"戌",name:"술"},{char:"亥",name:"해"},
];

function calcSaju(year:number, month:number, day:number, hourIdx:number|null) {
  const yearStem = HEAVENLY_STEMS[((year-4)%10+10)%10];
  const yearBranch = EARTHLY_BRANCHES[((year-4)%12+12)%12];
  const MONTH_BRANCH_IDX = [2,3,4,5,6,7,8,9,10,11,0,1];
  const monthBranch = EARTHLY_BRANCHES[MONTH_BRANCH_IDX[month-1]];
  const yearStemIdx = HEAVENLY_STEMS.indexOf(yearStem);
  const monthStemBase = (yearStemIdx % 5) * 2;
  const monthStem = HEAVENLY_STEMS[(monthStemBase + (month-1)) % 10];
  const a = Math.floor((14-month)/12);
  const y = year+4800-a;
  const m = month+12*a-3;
  const jdn = day+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;
  const dayStem = HEAVENLY_STEMS[((jdn%10)+10)%10];
  const dayBranch = EARTHLY_BRANCHES[((jdn%12)+12)%12];
  let hourStem="?", hourBranch="?";
  if (hourIdx !== null) {
    const dg = HEAVENLY_STEMS.indexOf(dayStem);
    hourStem = HEAVENLY_STEMS[(dg*2+hourIdx)%10];
    hourBranch = EARTHLY_BRANCHES[hourIdx];
  }
  return [
    {pillar:"년주", stem:yearStem, branch:yearBranch},
    {pillar:"월주", stem:monthStem, branch:monthBranch},
    {pillar:"일주", stem:dayStem, branch:dayBranch},
    {pillar:"시주", stem:hourStem, branch:hourBranch},
  ];
}

function calcElements(saju:{stem:string;branch:string}[]) {
  const c:Record<string,number> = {목:0,화:0,토:0,금:0,수:0};
  saju.forEach(({stem,branch}) => {
    if(STEM_ELEMENT[stem]) c[STEM_ELEMENT[stem]]++;
    if(BRANCH_ELEMENT[branch]) c[BRANCH_ELEMENT[branch]]++;
  });
  return c;
}

function ResultContent() {
  const searchParams = useSearchParams();
  const [aiResult, setAiResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [solar, setSolar] = useState<{year:number,month:number,day:number}|null>(null);
  const [converting, setConverting] = useState<boolean>(false);

  const gender = searchParams.get("gender") || "남";
  const calType = searchParams.get("calType") || "양력";
  const yearParam = parseInt(searchParams.get("year") || "0");
  const monthParam = parseInt(searchParams.get("month") || "0");
  const dayParam = parseInt(searchParams.get("day") || "0");
  const hourParam = searchParams.get("hour");
  const hourIdx = hourParam === "모름" || hourParam === null ? null : parseInt(hourParam);
  const options = (searchParams.get("options") || "basic").split(",");

  useEffect(() => {
    if (calType === "음력") {
      setConverting(true);
      // 음력 → 양력 변환: 한국천문연구원 API 사용
      // 음력 입력을 양력으로 변환하기 위해 해당 연도 전체를 검색
      // 방법: 양력 날짜로 음력 정보를 조회해서 일치하는 날짜 찾기
      findSolarFromLunar(yearParam, monthParam, dayParam).then(result => {
        setSolar(result);
        setConverting(false);
      });
    } else {
      setSolar({ year: yearParam, month: monthParam, day: dayParam });
    }
  }, [calType, yearParam, monthParam, dayParam]);

  async function findSolarFromLunar(lunarYear:number, lunarMonth:number, lunarDay:number) {
    // 음력 해당 연도의 양력 1월~12월을 순회하며 일치하는 날짜 찾기
    try {
      for (let m = 1; m <= 12; m++) {
        const daysInMonth = new Date(lunarYear, m, 0).getDate();
        for (let d = 1; d <= daysInMonth; d++) {
          const res = await fetch(`/api/lunar?year=${lunarYear}&month=${m}&day=${d}`);
          const data = await res.json();
          if (
            parseInt(data.lunarYear) === lunarYear &&
            parseInt(data.lunarMonth) === lunarMonth &&
            parseInt(data.lunarDay) === lunarDay &&
            !data.leapMonth
          ) {
            return { year: lunarYear, month: m, day: d };
          }
        }
      }
    } catch(e) {
      console.error(e);
    }
    return { year: lunarYear, month: lunarMonth, day: lunarDay };
  }

  const saju = solar ? calcSaju(solar.year, solar.month, solar.day, hourIdx) : [];
  const elements = solar ? calcElements(saju) : {목:0,화:0,토:0,금:0,수:0};

  const handleAiAnalysis = async () => {
    if (!solar) return;
    setLoading(true);
    setAiResult("");
    setDone(false);
    const sajuText = saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(", ");
    const optLabels: Record<string,string> = {
      basic:"사주 기본 분석", dayun:"대운·세운 흐름",
      career:"직업·재물운", love:"연애·궁합운",
      health:"건강·체질", name:"이름 분석"
    };
    const lunarInfo = calType === "음력"
      ? `\n음력 ${yearParam}년 ${monthParam}월 ${dayParam}일 → 양력 ${solar.year}년 ${solar.month}월 ${solar.day}일로 변환`
      : "";
    const prompt = `당신은 명리학 전문가입니다. 다음 사주를 분석해주세요.\n\n성별: ${gender}성\n생년월일: ${calType} ${yearParam}년 ${monthParam}월 ${dayParam}일${lunarInfo}\n태어난 시: ${hourIdx === null ? "모름" : BRANCH_LIST[hourIdx]?.char+"시"}\n\n사주팔자: ${sajuText}\n오행: 목${elements["목"]} 화${elements["화"]} 토${elements["토"]} 금${elements["금"]} 수${elements["수"]}\n\n분석항목: ${options.map((o:string) => optLabels[o]||o).join(", ")}\n\n각 항목별 소제목을 붙여 친절하고 자세하게 분석해주세요.`;

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({messages:[{role:"user",content:prompt}]}),
      });
      const data = await res.json();
      const text = data.content?.find((c:{type:string}) => c.type==="text")?.text;
      setAiResult(text || "결과를 가져오지 못했습니다.");
    } catch(e) {
      console.error(e);
      setAiResult("오류가 발생했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
      setDone(true);
    }
  };

  if (converting || !solar) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{background:"#1a1a18"}}>
        <div className="text-3xl animate-spin">✦</div>
        <p style={{color:"#FAC775"}}>음력을 양력으로 변환 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{background:"#1a1a18",maxWidth:"430px",margin:"0 auto"}}>
      <header className="fixed top-0 z-50 flex items-center justify-between px-4 py-4"
        style={{background:"rgba(26,26,24,0.97)",backdropFilter:"blur(12px)",
          borderBottom:"1px solid rgba(255,255,255,0.06)",width:"100%",maxWidth:"430px",left:"50%",transform:"translateX(-50%)"}}>
        <Link href="/manseryeok">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"rgba(255,255,255,0.06)"}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </Link>
        <div className="text-sm font-bold text-white">사주 분석 결과</div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"rgba(60,52,137,0.3)"}}>
          <span style={{color:"#FAC775",fontSize:"16px"}}>✦</span>
        </div>
      </header>

      <main className="pt-20 pb-36 px-4 space-y-4">
        <div className="rounded-2xl p-4"
          style={{background:"linear-gradient(135deg,#3C3489 0%,#2a2075 100%)",border:"1px solid rgba(250,199,117,0.2)"}}>
          <div className="text-xs font-semibold mb-2" style={{color:"rgba(250,199,117,0.8)"}}>분석 대상</div>
          <div className="flex items-center gap-2 flex-wrap">
            {[
              `${gender}성`,
              `${calType} ${yearParam}.${monthParam}.${dayParam}`,
              calType === "음력" ? `(양력 ${solar.year}.${solar.month}.${solar.day})` : "",
              hourIdx === null ? "시 미지정" : `${BRANCH_LIST[hourIdx]?.char}시`
            ].filter(Boolean).map(item => (
              <span key={item} className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{background:"rgba(255,255,255,0.1)",color:"#FAC775"}}>{item}</span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{background:"#2C2C2A",border:"1px solid rgba(250,199,117,0.15)"}}>
          <div className="flex items-center gap-2 mb-4">
            <span style={{color:"#FAC775",fontSize:"18px"}}>✦</span>
            <h2 className="text-base font-bold text-white">사주 명식</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {saju.map(({pillar,stem,branch}) => {
              const se = STEM_ELEMENT[stem];
              const be = BRANCH_ELEMENT[branch];
              return (
                <div key={pillar} className="flex flex-col items-center">
                  <div className="text-[10px] mb-2 font-medium" style={{color:"#8a88a0"}}>{pillar}</div>
                  <div className="w-full rounded-xl py-3 flex flex-col items-center mb-1.5"
                    style={{background:stem==="?"?"rgba(255,255,255,0.04)":"rgba(60,52,137,0.3)",border:"1px solid rgba(60,52,137,0.4)"}}>
                    <span className="text-2xl font-bold" style={{color:stem==="?"?"#8a88a0":"#FAC775"}}>{stem}</span>
                    {se && <span className="text-[10px] mt-0.5 font-medium" style={{color:ELEMENT_COLOR[se]}}>{se}</span>}
                  </div>
                  <div className="w-full rounded-xl py-3 flex flex-col items-center"
                    style={{background:branch==="?"?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}>
                    <span className="text-2xl font-bold" style={{color:branch==="?"?"#8a88a0":"#e0dce8"}}>{branch}</span>
                    {be && <span className="text-[10px] mt-0.5 font-medium" style={{color:ELEMENT_COLOR[be]}}>{be}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{background:"#2C2C2A",border:"1px solid rgba(255,255,255,0.07)"}}>
          <h2 className="text-base font-bold text-white mb-4">오행 분포</h2>
          <div className="space-y-2.5">
            {(["목","화","토","금","수"] as const).map(el => {
              const count = elements[el];
              const total = Object.values(elements).reduce((a,b) => a+b, 0);
              const pct = total > 0 ? Math.round((count/total)*100) : 0;
              const emoji: Record<string,string> = {목:"🌳",화:"🔥",토:"🪨",금:"⚙️",수:"💧"};
              return (
                <div key={el} className="flex items-center gap-3">
                  <span className="text-sm w-12 flex items-center gap-1" style={{color:ELEMENT_COLOR[el]}}>{emoji[el]} {el}</span>
                  <div className="flex-1 rounded-full overflow-hidden" style={{background:"rgba(255,255,255,0.08)",height:"8px"}}>
                    <div className="h-full rounded-full" style={{width:`${pct}%`,background:ELEMENT_COLOR[el]}}/>
                  </div>
                  <span className="text-xs w-14 text-right" style={{color:"#8a88a0"}}>{count}개({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl p-5" style={{background:"#2C2C2A",border:"1px solid rgba(255,255,255,0.07)"}}>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-lg">🤖</span>
            <h2 className="text-base font-bold text-white">AI 상세 분석</h2>
          </div>
          {!done && !loading && (
            <button onClick={handleAiAnalysis}
              className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
              style={{background:"linear-gradient(135deg,#3C3489 0%,#FAC775 100%)",color:"#1a1a18",boxShadow:"0 4px 20px rgba(60,52,137,0.4)"}}>
              ✨ AI 분석 시작하기
            </button>
          )}
          {loading && (
            <div className="flex flex-col items-center py-8 gap-3">
              <div className="text-3xl animate-spin">✦</div>
              <p className="text-sm" style={{color:"#FAC775"}}>AI가 사주를 분석하고 있습니다...</p>
            </div>
          )}
          {done && aiResult && (
            <div>
              <div className="rounded-xl p-4 mb-4"
                style={{background:"rgba(60,52,137,0.15)",border:"1px solid rgba(60,52,137,0.3)"}}>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{color:"#e0dce8"}}>{aiResult}</p>
              </div>
              <button onClick={handleAiAnalysis}
                className="w-full py-3 rounded-xl text-sm font-semibold"
                style={{border:"1px solid rgba(60,52,137,0.5)",color:"#b0aec8",background:"rgba(60,52,137,0.1)"}}>
                🔄 다시 분석하기
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{background:"#1a1a18"}}>
        <div style={{color:"#FAC775"}}>로딩 중...</div>
      </div>
    }>
      <ResultContent/>
    </Suspense>
  );
}
