"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DayunTable from "./DayunTable";
import SeyunTable from "./SeyunTable";
import SajuMyungsik from "./components/SajuMyungsik";
import AiAnalysis from "./components/AiAnalysis";
import ConsultantList from "./components/ConsultantList";
import { useResultSaju } from "@/hooks/useResultSaju";
import PageHeader from '@/app/components/common/PageHeader'

const BRANCH_LIST = [
  {char:"子"},{char:"丑"},{char:"寅"},{char:"卯"},
  {char:"辰"},{char:"巳"},{char:"午"},{char:"未"},
  {char:"申"},{char:"酉"},{char:"戌"},{char:"亥"},
]

function ResultContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPaid, setIsPaid] = useState(false)

  const gender = searchParams.get("gender") || "남"
  const calType = searchParams.get("calType") || "양력"
  const yearParam = parseInt(searchParams.get("year") || "0")
  const monthParam = parseInt(searchParams.get("month") || "0")
  const dayParam = parseInt(searchParams.get("day") || "0")
  const leapMonth = searchParams.get("leapMonth") || "0"
  const hourParam = searchParams.get("hour")
  const hourIdx = hourParam === "모름" || hourParam === null ? null : parseInt(hourParam)
  const currentYear = new Date().getFullYear()

  const { saju, solar, converting, dayStem, monthGanji, yearStem, iljji, yeonjji } =
    useResultSaju(calType, yearParam, monthParam, dayParam, leapMonth, hourIdx)

  if (converting) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{background:"#1a1a18"}}>
      <div className="text-3xl animate-spin">✦</div>
      <p style={{color:"#FAC775"}}>사주 정보를 불러오는 중...</p>
    </div>
  )

  // ✅ 대운 계산용 '양력' 날짜 결정
  //   음력 입력 → 변환된 양력(solar) 사용 / 양력 입력 → 입력값 그대로
  const solarYear  = calType === "음력" && solar ? solar.year  : yearParam
  const solarMonth = calType === "음력" && solar ? solar.month : monthParam
  const solarDay   = calType === "음력" && solar ? solar.day   : dayParam

  // 분석 대상 한 줄 표시: "음력 1966.1.12 (양력 1966.2.2) · 卯시 · 남성"
  const calLabel = `${calType} ${yearParam}.${monthParam}.${dayParam}${calType === "음력" && leapMonth === "1" ? " (윤달)" : ""}`
  const solarLabel = calType === "음력" && solar ? ` (양력 ${solar.year}.${solar.month}.${solar.day})` : ""
  const hourLabel = hourIdx === null ? "시 미지정" : `${BRANCH_LIST[hourIdx]?.char}시`
  const genderLabel = gender === "여" ? "여성" : "남성"
  const targetLine = `${calLabel}${solarLabel} · ${hourLabel} · ${genderLabel}`

  return (
    <div className="min-h-screen" style={{background:"#1a1a18", maxWidth:"430px", margin:"0 auto"}}>

      <div className="fixed top-0 z-50" style={{width:"100%", maxWidth:"430px", left:"50%", transform:"translateX(-50%)"}}>
        <PageHeader
          title="사주가 그려낸 나의 초상"
          onBack={() => router.push('/')}
        />
      </div>

      <main className="pt-20 pb-36 px-4 space-y-4">
        {/* 분석 대상 */}
        <div className="rounded-2xl p-4"
          style={{background:"linear-gradient(135deg,#3C3489 0%,#2a2075 100%)", border:"1px solid rgba(250,199,117,0.2)"}}>
          <div className="text-xs font-semibold mb-2" style={{color:"rgba(250,199,117,0.8)"}}>분석 대상</div>
          <div className="text-sm font-semibold" style={{color:"#FAC775", lineHeight:1.6}}>
            {targetLine}
          </div>
        </div>

        <SajuMyungsik saju={saju} dayStem={dayStem} />

        {dayStem && monthGanji && yearStem && solarYear && (
          <DayunTable
            solarYear={solarYear} solarMonth={solarMonth} solarDay={solarDay}
            birthYear={yearParam}
            gender={gender} monthGanji={monthGanji} yearStem={yearStem}
            dayStem={dayStem} currentYear={currentYear}
            ilgan={dayStem} yeonjji={yeonjji} iljji={iljji}
          />
        )}

        {dayStem && (
          <SeyunTable
            dayStem={dayStem} currentYear={currentYear}
            ilgan={dayStem} yeonjji={yeonjji} iljji={iljji}
          />
        )}

        <AiAnalysis
          saju={saju} gender={gender} calType={calType}
          yearParam={yearParam} monthParam={monthParam} dayParam={dayParam}
          hourIdx={hourIdx} leapMonth={leapMonth} solar={solar}
          isPaid={isPaid}
          onPayRequest={() => setIsPaid(true)}
        />

        <ConsultantList searchParams={searchParams} />
      </main>
    </div>
  )
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
  )
}
