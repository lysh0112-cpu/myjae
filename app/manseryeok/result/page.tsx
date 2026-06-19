"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import DayunTable from "./DayunTable";
import SeyunTable from "./SeyunTable";
import { supabase } from "@/lib/supabase";

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

const BRANCH_YIN: Record<string,boolean> = {
  子:true,丑:true,寅:false,卯:true,辰:false,巳:true,
  午:false,未:true,申:false,酉:true,戌:false,亥:true
};

function getSipsin(dayStem: string, targetStem: string): string {
  if (!targetStem || targetStem === "?") return "";
  const dayIdx = HEAVENLY_STEMS.indexOf(dayStem);
  const targetIdx = HEAVENLY_STEMS.indexOf(targetStem);
  const dayElement = STEM_ELEMENT[dayStem];
  const targetElement = STEM_ELEMENT[targetStem];
  const sameYin = (dayIdx % 2) === (targetIdx % 2);
  const generates: Record<string,string> = {목:"화",화:"토",토:"금",금:"수",수:"목"};
  const controls: Record<string,string> = {목:"토",화:"금",토:"수",금:"목",수:"화"};
  if (dayElement === targetElement) return sameYin ? "비견" : "겁재";
  if (generates[dayElement] === targetElement) return sameYin ? "식신" : "상관";
  if (controls[dayElement] === targetElement) return sameYin ? "편재" : "정재";
  if (controls[targetElement] === dayElement) return sameYin ? "편관" : "정관";
  if (generates[targetElement] === dayElement) return sameYin ? "편인" : "정인";
  return "";
}

function getSipsinBranch(dayStem: string, branch: string): string {
  if (!branch || branch === "?") return "";
  const branchElement = BRANCH_ELEMENT[branch];
  const dayElement = STEM_ELEMENT[dayStem];
  const dayIdx = HEAVENLY_STEMS.indexOf(dayStem);
  const dayYin = dayIdx % 2 === 1;
  const branchYin = BRANCH_YIN[branch];
  const sameYin = dayYin === branchYin;
  const generates: Record<string,string> = {목:"화",화:"토",토:"금",금:"수",수:"목"};
  const controls: Record<string,string> = {목:"토",화:"금",토:"수",금:"목",수:"화"};
  if (dayElement === branchElement) return sameYin ? "비견" : "겁재";
  if (generates[dayElement] === branchElement) return sameYin ? "식신" : "상관";
  if (controls[dayElement] === branchElement) return sameYin ? "편재" : "정재";
  if (controls[branchElement] === dayElement) return sameYin ? "편관" : "정관";
  if (generates[branchElement] === dayElement) return sameYin ? "편인" : "정인";
  return "";
}

function splitGanji(ganji: string) {
  if (!ganji) return { stem: "?", branch: "?" };
  const match = ganji.match(/\(([^)]+)\)/);
  if (match && match[1].length >= 2) {
    return { stem: match[1][0], branch: match[1][1] };
  }
  if (ganji.length >= 2) return { stem: ganji[0], branch: ganji[1] };
  return { stem: "?", branch: "?" };
}

function calcHourPillar(dayStem: string, hourIdx: number) {
  const dg = HEAVENLY_STEMS.indexOf(dayStem);
  const hourStem = HEAVENLY_STEMS[(dg * 2 + hourIdx) % 10];
  const hourBranch = EARTHLY_BRANCHES[hourIdx];
  return { stem: hourStem, branch: hourBranch };
}

const sipsinColor = (s: string) => {
  if (!s) return "#8a88a0";
  if (["비견","겁재"].includes(s)) return "#9e9e9e";
  if (["식신","상관"].includes(s)) return "#4caf50";
  if (["편재","정재"].includes(s)) return "#FAC775";
  if (["편관","정관"].includes(s)) return "#f44336";
  if (["편인","정인"].includes(s)) return "#2196f3";
  return "#8a88a0";
};

type Consultant = {
  id: string
  name: string
  specialty: string
  price: number
}

function ConsultantList({ searchParams }: { searchParams: URLSearchParams }) {
  const router = useRouter()
  const [consultants, setConsultants] = useState<Consultant[]>([])

  useEffect(() => {
    supabase
      .from('consultants')
      .select('id, name, specialty, price')
      .eq('active', true)
      .order('name')
      .then(({ data }) => { if (data) setConsultants(data) })
  }, [])

  function handleSelect(consultant: Consultant) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('consultantId', consultant.id)
    params.set('consultantName', consultant.name)
    params.set('consultantPrice', String(consultant.price))
    router.push(`/manseryeok/consulting?${params.toString()}`)
  }

  if (consultants.length === 0) return null

  return (
    <div className="rounded-2xl p-5" style={{background:"#2C2C2A",border:"1px solid rgba(250,199,117,0.15)"}}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">🔮</span>
        <h2 className="text-base font-bold text-white">전문 상담사와 상담하기</h2>
      </div>
      <p className="text-xs mb-4" style={{color:"#8a88a0"}}>
        AI 분석이 더 궁금하신가요? 전문 상담사와 1:1 상담을 받아보세요
      </p>
      <div className="space-y-3">
        {consultants.map((c) => (
          <button
            key={c.id}
            onClick={() => handleSelect(c)}
            className="w-full text-left rounded-xl p-4 transition-all"
            style={{background:"rgba(60,52,137,0.2)",border:"1px solid rgba(60,52,137,0.3)"}}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-white">{c.name}</div>
                <div className="text-xs mt-0.5" style={{color:"#8a88a0"}}>{c.specialty}</div>
              </div>
              <div>
                <div className="text-amber-400 font-bold">{c.price.toLocaleString()}원</div>
                <div className="text-xs mt-1 text-right px-3 py-1 rounded-full"
                  style={{background:"rgba(250,199,117,0.15)",color:"#FAC775"}}>
                  상담 신청 →
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function ResultContent() {
  const searchParams = useSearchParams();
  const [aiResult, setAiResult] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [done, setDone] = useState<boolean>(false);
  const [saju, setSaju] = useState<{pillar:string;stem:string;branch:string}[]>([]);
  const [solar, setSolar] = useState<{year:number;month:number;day:number}|null>(null);
  const [converting, setConverting] = useState<boolean>(true);
  const [dayStem, setDayStem] = useState<string>("");
  const [monthGanji, setMonthGanji] = useState<string>("");
  const [yearStem, setYearStem] = useState<string>("");

  const gender = searchParams.get("gender") || "남";
  const calType = searchParams.get("calType") || "양력";
  const yearParam = parseInt(searchParams.get("year") || "0");
  const monthParam = parseInt(searchParams.get("month") || "0");
  const dayParam = parseInt(searchParams.get("day") || "0");
  const leapMonth = searchParams.get("leapMonth") || "0";
  const hourParam = searchParams.get("hour");
  const hourIdx = hourParam === "모름" || hourParam === null ? null : parseInt(hourParam);
  const options = (searchParams.get("options") || "basic").split(",");

  useEffect(() => {
    async function loadSaju() {
      setConverting(true);
      try {
        if (calType === "음력") {
          const res1 = await fetch(`/api/lunar?year=${yearParam}&month=${monthParam}&day=${dayParam}&calType=음력&leapMonth=${leapMonth}`);
          const d1 = await res1.json();
          const sy = d1.solarYear, sm = d1.solarMonth, sd = d1.solarDay;
          setSolar({ year: sy, month: sm, day: sd });
          const res2 = await fetch(`/api/lunar?year=${sy}&month=${sm}&day=${sd}&calType=양력`);
          const d2 = await res2.json();
          buildSaju(d2, hourIdx);
        } else {
          setSolar({ year: yearParam, month: monthParam, day: dayParam });
          const res = await fetch(`/api/lunar?year=${yearParam}&month=${monthParam}&day=${dayParam}&calType=양력`);
          const d = await res.json();
          buildSaju(d, hourIdx);
        }
      } catch(e) {
        console.error(e);
      } finally {
        setConverting(false);
      }
    }

    function buildSaju(data: {yearGanji:string;monthGanji:string;dayGanji:string}, hourIdx: number|null) {
      const year = splitGanji(data.yearGanji);
      const month = splitGanji(data.monthGanji);
      const day = splitGanji(data.dayGanji);
      const hour = hourIdx !== null
        ? calcHourPillar(day.stem, hourIdx)
        : { stem: "?", branch: "?" };
      setDayStem(day.stem);
      setMonthGanji(month.stem + month.branch);
      setYearStem(year.stem);
      setSaju([
        { pillar: "시주", stem: hour.stem, branch: hour.branch },
        { pillar: "일주", stem: day.stem, branch: day.branch },
        { pillar: "월주", stem: month.stem, branch: month.branch },
        { pillar: "년주", stem: year.stem, branch: year.branch },
      ]);
    }

    loadSaju();
  }, [calType, yearParam, monthParam, dayParam, leapMonth, hourIdx]);

  const iljji = saju[1]?.branch ?? "";
  const yeonjji = saju[3]?.branch ?? "";

  const handleAiAnalysis = async () => {
    setLoading(true);
    setAiResult("");
    setDone(false);
    const sajuText = saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(", ");
    const optLabels: Record<string,string> = {
      basic:"사주 기본 분석", dayun:"대운·세운 흐름",
      career:"직업·재물운", love:"연애·궁합운",
      health:"건강·체질", name:"이름 분석"
    };
    const lunarInfo = calType === "음력" && solar
      ? `\n음력 ${yearParam}년 ${monthParam}월 ${dayParam}일${leapMonth === "1" ? " (윤달)" : ""} → 양력 ${solar.year}년 ${solar.month}월 ${solar.day}일로 변환`
      : "";
    const elements = {목:0,화:0,토:0,금:0,수:0} as Record<string,number>;
    saju.forEach(({stem,branch}) => {
      if (STEM_ELEMENT[stem]) elements[STEM_ELEMENT[stem]]++;
      if (BRANCH_ELEMENT[branch]) elements[BRANCH_ELEMENT[branch]]++;
    });
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

  if (converting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{background:"#1a1a18"}}>
        <div className="text-3xl animate-spin">✦</div>
        <p style={{color:"#FAC775"}}>사주 정보를 불러오는 중...</p>
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
              `${calType} ${yearParam}.${monthParam}.${dayParam}${calType === "음력" && leapMonth === "1" ? " (윤달)" : ""}`,
              calType === "음력" && solar ? `(양력 ${solar.year}.${solar.month}.${solar.day})` : "",
              hourIdx === null ? "시 미지정" : `${BRANCH_LIST[hourIdx]?.char}시`
            ].filter(Boolean).map(item => (
              <span key={item} className="text-sm font-semibold px-3 py-1 rounded-full"
                style={{background:"rgba(255,255,255,0.1)",color:"#FAC775"}}>{item}</span>
            ))}
          </div>
        </div>

        {/* 사주 명식 */}
        <div className="rounded-2xl p-5" style={{background:"#2C2C2A",border:"1px solid rgba(250,199,117,0.15)"}}>
          <div className="flex items-center gap-2 mb-4">
            <span style={{color:"#FAC775",fontSize:"18px"}}>✦</span>
            <h2 className="text-base font-bold text-white">사주 명식</h2>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {saju.map(({pillar,stem,branch}) => {
              const se = STEM_ELEMENT[stem];
              const be = BRANCH_ELEMENT[branch];
              const isIlju = pillar === "일주";
              const stemSipsin = isIlju ? "본원" : getSipsin(dayStem, stem);
              const branchSipsin = getSipsinBranch(dayStem, branch);
              return (
                <div key={pillar} className="flex flex-col items-center">
                  <div className="text-[10px] mb-1 font-bold h-4" style={{color: sipsinColor(stemSipsin)}}>
                    {stemSipsin}
                  </div>
                  <div className="w-full rounded-xl py-3 flex flex-col items-center mb-1"
                    style={{background:stem==="?"?"rgba(255,255,255,0.04)":isIlju?"rgba(250,199,117,0.15)":"rgba(60,52,137,0.3)",
                      border:`1px solid ${isIlju?"rgba(250,199,117,0.4)":"rgba(60,52,137,0.4)"}`}}>
                    <span className="text-2xl font-bold" style={{color:stem==="?"?"#8a88a0":"#FAC775"}}>{stem}</span>
                    {se && <span className="text-[10px] mt-0.5 font-medium" style={{color:ELEMENT_COLOR[se]}}>{se}</span>}
                  </div>
                  <div className="w-full rounded-xl py-3 flex flex-col items-center mb-1"
                    style={{background:branch==="?"?"rgba(255,255,255,0.04)":"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)"}}>
                    <span className="text-2xl font-bold" style={{color:branch==="?"?"#8a88a0":"#e0dce8"}}>{branch}</span>
                    {be && <span className="text-[10px] mt-0.5 font-medium" style={{color:ELEMENT_COLOR[be]}}>{be}</span>}
                  </div>
                  <div className="text-[10px] mt-1 font-bold h-4" style={{color: sipsinColor(branchSipsin)}}>
                    {branchSipsin}
                  </div>
                  <div className="text-[10px] mt-1 font-medium" style={{color:"#8a88a0"}}>{pillar}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 대운표 */}
        {dayStem && monthGanji && yearStem && (
          <DayunTable
            birthYear={yearParam}
            birthMonth={monthParam}
            birthDay={dayParam}
            gender={gender}
            monthGanji={monthGanji}
            yearStem={yearStem}
            dayStem={dayStem}
            currentYear={2026}
            ilgan={dayStem}
            yeonjji={yeonjji}
            iljji={iljji}
          />
        )}

        {/* 세운표 */}
        {dayStem && (
          <SeyunTable
            dayStem={dayStem}
            currentYear={2026}
            ilgan={dayStem}
            yeonjji={yeonjji}
            iljji={iljji}
          />
        )}

        {/* AI 상세 분석 */}
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

        {/* 상담사 목록 — 맨 아래 */}
        <ConsultantList searchParams={searchParams} />

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
