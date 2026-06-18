"use client";

import { useMemo } from "react";

const HEAVENLY_STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"];
const EARTHLY_BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"];
const STEM_ELEMENT: Record<string,string> = {甲:"목",乙:"목",丙:"화",丁:"화",戊:"토",己:"토",庚:"금",辛:"금",壬:"수",癸:"수"};
const BRANCH_ELEMENT: Record<string,string> = {子:"수",丑:"토",寅:"목",卯:"목",辰:"토",巳:"화",午:"화",未:"토",申:"금",酉:"금",戌:"토",亥:"수"};
const ELEMENT_COLOR: Record<string,string> = {목:"#4caf50",화:"#f44336",토:"#ff9800",금:"#9e9e9e",수:"#2196f3"};
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

const sipsinColor = (s: string) => {
  if (!s) return "#8a88a0";
  if (["비견","겁재"].includes(s)) return "#9e9e9e";
  if (["식신","상관"].includes(s)) return "#4caf50";
  if (["편재","정재"].includes(s)) return "#FAC775";
  if (["편관","정관"].includes(s)) return "#f44336";
  if (["편인","정인"].includes(s)) return "#2196f3";
  return "#8a88a0";
};

// 년도별 간지 계산
function getYearGanji(year: number): { stem: string; branch: string } {
  const BASE_YEAR = 1984; // 甲子년
  const offset = ((year - BASE_YEAR) % 60 + 60) % 60;
  return {
    stem: HEAVENLY_STEMS[offset % 10],
    branch: EARTHLY_BRANCHES[offset % 12],
  };
}

interface SeyunTableProps {
  dayStem: string;
  currentYear: number;
}

export default function SeyunTable({ dayStem, currentYear }: SeyunTableProps) {
  const seyuns = useMemo(() => {
    const result = [];
    // 현재 년도 기준 앞뒤 5년씩 총 10년
    const startYear = currentYear - 2;
    for (let i = 0; i < 10; i++) {
      const year = startYear + i;
      const { stem, branch } = getYearGanji(year);
      result.push({ year, stem, branch });
    }
    return result;
  }, [currentYear]);

  return (
    <div className="rounded-2xl p-5" style={{background:"#2C2C2A",border:"1px solid rgba(255,255,255,0.07)"}}>
      <h2 className="text-base font-bold text-white mb-4">📅 세운표</h2>
      <div className="overflow-x-auto">
        <div style={{minWidth:"700px"}}>
          <div className="grid grid-cols-10 gap-1">
            {seyuns.map(({year, stem, branch}) => {
              const isCurrent = year === currentYear;
              const stemSipsin = getSipsin(dayStem, stem);
              const branchSipsin = getSipsinBranch(dayStem, branch);
              return (
                <div key={year} className="flex flex-col items-center">
                  {/* 년도 */}
                  <div className="text-[10px] font-bold w-full text-center py-1 rounded mb-1"
                    style={{
                      color: isCurrent ? "#fff" : "#FAC775",
                      background: isCurrent ? "rgba(220,50,50,0.3)" : "rgba(255,255,255,0.05)",
                      border: isCurrent ? "1px solid rgba(220,50,50,0.8)" : "1px solid rgba(255,255,255,0.1)",
                    }}>
                    {year}
                  </div>
                  {/* 천간 육친 */}
                  <div className="text-[9px] text-center w-full mb-0.5 h-4"
                    style={{color: sipsinColor(stemSipsin)}}>
                    {stemSipsin}
                  </div>
                  {/* 천간 */}
                  <div className="w-full rounded py-2 flex items-center justify-center mb-0.5"
                    style={{
                      background: ELEMENT_COLOR[STEM_ELEMENT[stem]] + "33",
                      border: isCurrent ? "2px solid rgba(220,50,50,0.8)" : "1px solid rgba(255,255,255,0.1)"
                    }}>
                    <span className="text-base font-bold"
                      style={{color: ELEMENT_COLOR[STEM_ELEMENT[stem]]}}>{stem}</span>
                  </div>
                  {/* 지지 */}
                  <div className="w-full rounded py-2 flex items-center justify-center mb-0.5"
                    style={{
                      background: ELEMENT_COLOR[BRANCH_ELEMENT[branch]] + "33",
                      border: isCurrent ? "2px solid rgba(220,50,50,0.8)" : "1px solid rgba(255,255,255,0.1)"
                    }}>
                    <span className="text-base font-bold"
                      style={{color: ELEMENT_COLOR[BRANCH_ELEMENT[branch]]}}>{branch}</span>
                  </div>
                  {/* 지지 육친 */}
                  <div className="text-[9px] text-center w-full mt-0.5 h-4"
                    style={{color: sipsinColor(branchSipsin)}}>
                    {branchSipsin}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
