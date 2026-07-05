"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DayunTable from "../result/DayunTable";
import SeyunTable from "../result/SeyunTable";
import SajuMyungsik from "../result/components/SajuMyungsik";
import AiAnalysis from "../result/components/AiAnalysis";
import ConsultButton from "@/app/components/common/ConsultButton";
import { useResultSaju } from "@/hooks/useResultSaju";

const BRANCH_LIST = [
  {char:"子"},{char:"丑"},{char:"寅"},{char:"卯"},
  {char:"辰"},{char:"巳"},{char:"午"},{char:"未"},
  {char:"申"},{char:"酉"},{char:"戌"},{char:"亥"},
]

function ResultNewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPaid, setIsPaid] = useState(false)

  const gender    = searchParams.get("gender")   || "남"
  const calType   = searchParams.get("calType")  || "양력"
  const yearParam  = parseInt(searchParams.get("year")  || "0")
  const monthParam = parseInt(searchParams.get("month") || "0")
  const dayParam   = parseInt(searchParams.get("day")   || "0")
  const leapMonth  = searchParams.get("leapMonth") || "0"
  const hourParam  = searchParams.get("hour")
  const hourIdx    = hourParam === "모름" || hourParam === null ? null : parseInt(hourParam)
  const currentYear = new Date().getFullYear()

  const { saju, solar, converting, dayStem, monthGanji, yearStem, iljji, yeonjji } =
    useResultSaju(calType, yearParam, monthParam, dayParam, leapMonth, hourIdx)

  /* 로딩 */
  if (converting) return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF8',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: '16px',
    }}>
      <div style={{ fontSize: '32px', animation: 'spin 1s linear infinite' }}>✦</div>
      <p style={{ color: '#8B6914', fontSize: '14px' }}>사주 정보를 불러오는 중...</p>
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>
    </div>
  )

  const solarYear  = calType === "음력" && solar ? solar.year  : yearParam
  const solarMonth = calType === "음력" && solar ? solar.month : monthParam
  const solarDay   = calType === "음력" && solar ? solar.day   : dayParam

  const calLabel   = `${calType} ${yearParam}.${monthParam}.${dayParam}${calType==="음력"&&leapMonth==="1"?" (윤달)":""}`
  const solarLabel = calType === "음력" && solar ? ` (양력 ${solar.year}.${solar.month}.${solar.day})` : ""
  const hourLabel  = hourIdx === null ? "시 미지정" : `${BRANCH_LIST[hourIdx]?.char}시`
  const genderLabel = gender === "여" ? "여성" : "남성"
  const targetLine  = `${calLabel}${solarLabel} · ${hourLabel} · ${genderLabel}`

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      maxWidth: '430px',
      margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#1a1a1a',
    }}>

      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        background: '#FAFAF8',
        borderBottom: '0.5px solid #e8e5de',
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#999', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
        >←</button>
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#1a1a1a' }}>사주가 그려낸 나의 초상</span>
        <div style={{ width: '22px' }} />
      </div>

      <main style={{ padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* 분석 대상 카드 */}
        <div style={{
          background: '#fff',
          border: '0.5px solid #e8e5de',
          borderRadius: '16px',
          padding: '16px 18px',
        }}>
          <div style={{ fontSize: '10px', color: '#8B6914', fontWeight: 600, letterSpacing: '1px', marginBottom: '8px' }}>
            분석 대상
          </div>
          <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: 1.7, fontWeight: 500 }}>
            {targetLine}
          </div>
        </div>

        {/* 사주 명식 — 기존 컴포넌트 래핑 */}
        <div style={{
          background: '#fff',
          border: '0.5px solid #e8e5de',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px 10px',
            borderBottom: '0.5px solid #f5f3ef',
            fontSize: '13px', fontWeight: 600, color: '#1a1a1a',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ color: '#8B6914' }}>✦</span> 사주 명식
          </div>
          <div style={{ padding: '12px' }}>
            <SajuMyungsik saju={saju} dayStem={dayStem} />
          </div>
        </div>

        {/* 대운 */}
        {dayStem && monthGanji && yearStem && solarYear && (
          <div style={{
            background: '#fff',
            border: '0.5px solid #e8e5de',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px 10px',
              borderBottom: '0.5px solid #f5f3ef',
              fontSize: '13px', fontWeight: 600, color: '#1a1a1a',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ color: '#8B6914' }}>✦</span> 대운
            </div>
            <div style={{ padding: '12px' }}>
              <DayunTable
                solarYear={solarYear} solarMonth={solarMonth} solarDay={solarDay}
                birthYear={yearParam}
                gender={gender} monthGanji={monthGanji} yearStem={yearStem}
                dayStem={dayStem} currentYear={currentYear}
                ilgan={dayStem} yeonjji={yeonjji} iljji={iljji}
              />
            </div>
          </div>
        )}

        {/* 세운 */}
        {dayStem && (
          <div style={{
            background: '#fff',
            border: '0.5px solid #e8e5de',
            borderRadius: '16px',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '14px 18px 10px',
              borderBottom: '0.5px solid #f5f3ef',
              fontSize: '13px', fontWeight: 600, color: '#1a1a1a',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <span style={{ color: '#8B6914' }}>✦</span> 세운
            </div>
            <div style={{ padding: '12px' }}>
              <SeyunTable
                dayStem={dayStem} currentYear={currentYear}
                ilgan={dayStem} yeonjji={yeonjji} iljji={iljji}
              />
            </div>
          </div>
        )}

        {/* AI 분석 */}
        <div style={{
          background: '#fff',
          border: '0.5px solid #e8e5de',
          borderRadius: '16px',
          overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px 10px',
            borderBottom: '0.5px solid #f5f3ef',
            fontSize: '13px', fontWeight: 600, color: '#1a1a1a',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <span style={{ color: '#8B6914' }}>✦</span> AI 사주 분석
          </div>
          <div style={{ padding: '12px' }}>
            <AiAnalysis
              saju={saju} gender={gender} calType={calType}
              yearParam={yearParam} monthParam={monthParam} dayParam={dayParam}
              hourIdx={hourIdx} leapMonth={leapMonth} solar={solar}
              isPaid={isPaid}
              onPayRequest={() => setIsPaid(true)}
            />
          </div>
        </div>

        {/* 상담 버튼 */}
        <div style={{
          background: '#fff',
          border: '0.5px solid #e8e5de',
          borderRadius: '16px',
          padding: '16px',
        }}>
          <ConsultButton priceKey="saju" mode="personal" searchParams={searchParams} />
        </div>

      </main>

      {/* 하단 네비게이션 */}
      <div style={{
        position: 'fixed', bottom: 0, zIndex: 50,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        display: 'flex', justifyContent: 'space-around',
        padding: '10px 0 20px',
        background: '#fff',
        borderTop: '0.5px solid #f0ede6',
      }}>
        {[
          { icon: '🏠', label: '홈' },
          { icon: '⊞', label: '서비스' },
          { icon: '💬', label: '상담' },
          { icon: '🤍', label: '찜' },
          { icon: '👤', label: '마이' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: '3px', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{ fontSize: '10px', color: '#ccc' }}>{item.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}

export default function ResultNewPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#FAFAF8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#8B6914' }}>로딩 중...</div>
      </div>
    }>
      <ResultNewContent />
    </Suspense>
  )
}
