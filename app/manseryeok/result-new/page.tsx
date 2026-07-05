"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useResultSaju } from "@/hooks/useResultSaju";
import SajuMyungsikNew from "./components/SajuMyungsikNew";
import DayunTableNew from "./components/DayunTableNew";
import SeyunTableNew from "./components/SeyunTableNew";
import AiAnalysisNew from "./components/AiAnalysisNew";
import ConsultButton from "@/app/components/common/ConsultButton";

const BRANCH_LIST = [
  {char:"子"},{char:"丑"},{char:"寅"},{char:"卯"},
  {char:"辰"},{char:"巳"},{char:"午"},{char:"未"},
  {char:"申"},{char:"酉"},{char:"戌"},{char:"亥"},
]

function ResultNewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPaid, setIsPaid] = useState(false)
  const [tab, setTab] = useState<'myungsik' | 'dayun' | 'ai'>('myungsik')

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

  const TABS = [
    { key: 'myungsik', label: '사주 명식' },
    { key: 'dayun',    label: '대운·세운' },
    { key: 'ai',       label: 'AI 풀이' },
  ] as const

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF8',
      maxWidth: '430px', margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#1a1a1a',
    }}>

      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px',
        background: 'rgba(250,250,248,0.95)',
        backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #e8e5de',
      }}>
        <button onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#999', fontSize: '22px', cursor: 'pointer' }}>
          ←
        </button>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#1a1a1a' }}>나의 만세력</div>
          <div style={{ fontSize: '10px', color: '#8B6914', marginTop: '1px' }}>명연재（明然載）</div>
        </div>
        <div style={{ width: '22px' }} />
      </div>

      <main style={{ paddingBottom: '100px' }}>

        {/* 프로필 헤더 (다크) */}
        <div style={{ background: '#1a1a1a', padding: '22px 20px 18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: 'rgba(139,105,20,0.2)', border: '1.5px solid rgba(139,105,20,0.5)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px',
            }}>🌿</div>
            <div>
              <div style={{ fontSize: '13px', color: '#888', lineHeight: 1.8 }}>
                {calLabel}{solarLabel}<br />
                {hourLabel} · {genderLabel}
              </div>
            </div>
          </div>

          {/* 일주 + 대운 강조 */}
          <div style={{
            background: 'rgba(255,255,255,0.06)', border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '14px', padding: '14px 16px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#8B6914', marginBottom: '5px', letterSpacing: '1px' }}>
                일주（日柱）
              </div>
              <div style={{ fontSize: '34px', fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                {saju[1]?.stem ?? '?'}{saju[1]?.branch ?? '?'}
              </div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                {dayStem ? `${dayStem} 일간` : ''}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: '#666', marginBottom: '6px' }}>대운 정보</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center',
                background: 'rgba(139,105,20,0.2)', border: '0.5px solid rgba(139,105,20,0.4)',
                borderRadius: '10px', padding: '6px 12px', gap: '4px',
              }}>
                <span style={{ fontSize: '11px', color: '#8B6914' }}>상세보기 →</span>
              </div>
            </div>
          </div>
        </div>

        {/* 탭 */}
        <div style={{
          display: 'flex', background: '#fff',
          borderBottom: '0.5px solid #e8e5de',
          position: 'sticky', top: '57px', zIndex: 40,
        }}>
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{
              flex: 1, padding: '13px 0', background: 'none',
              border: 'none',
              borderBottom: tab === t.key ? '2px solid #1a1a1a' : '2px solid transparent',
              fontSize: '13px', fontWeight: tab === t.key ? 700 : 400,
              color: tab === t.key ? '#1a1a1a' : '#bbb', cursor: 'pointer',
            }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

          {/* ── 탭 1: 사주 명식 ── */}
          {tab === 'myungsik' && (
            <>
              <SajuMyungsikNew saju={saju} dayStem={dayStem} />

              {/* 분석 대상 요약 */}
              <div style={{
                background: '#fff', border: '0.5px solid #e8e5de',
                borderRadius: '16px', padding: '14px 16px',
                fontSize: '12px', color: '#888', lineHeight: 1.8,
              }}>
                <span style={{ color: '#8B6914', fontWeight: 600 }}>✦ 분석 대상 &nbsp;</span>
                {calLabel}{solarLabel} · {hourLabel} · {genderLabel}
              </div>

              {/* 상담 버튼 */}
              <div style={{
                background: '#fff', border: '0.5px solid #e8e5de',
                borderRadius: '16px', padding: '14px',
              }}>
                <ConsultButton priceKey="saju" mode="personal" searchParams={searchParams} />
              </div>
            </>
          )}

          {/* ── 탭 2: 대운·세운 ── */}
          {tab === 'dayun' && (
            <>
              {dayStem && monthGanji && yearStem && solarYear && (
                <DayunTableNew
                  solarYear={solarYear} solarMonth={solarMonth} solarDay={solarDay}
                  birthYear={yearParam} gender={gender}
                  monthGanji={monthGanji} yearStem={yearStem}
                  dayStem={dayStem} currentYear={currentYear}
                  ilgan={dayStem} yeonjji={yeonjji} iljji={iljji}
                />
              )}
              {dayStem && (
                <SeyunTableNew
                  dayStem={dayStem} currentYear={currentYear}
                  ilgan={dayStem} yeonjji={yeonjji} iljji={iljji}
                />
              )}
            </>
          )}

          {/* ── 탭 3: AI 풀이 ── */}
          {tab === 'ai' && (
            <AiAnalysisNew
              saju={saju} gender={gender} calType={calType}
              yearParam={yearParam} monthParam={monthParam} dayParam={dayParam}
              hourIdx={hourIdx} leapMonth={leapMonth} solar={solar}
              isPaid={isPaid}
              onPayRequest={() => setIsPaid(true)}
            />
          )}

        </div>
      </main>

      {/* 하단 네비 */}
      <div style={{
        position: 'fixed', bottom: 0, zIndex: 50,
        left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        display: 'flex', justifyContent: 'space-around',
        padding: '10px 0 20px',
        background: '#fff', borderTop: '0.5px solid #f0ede6',
      }}>
        {[
          { icon: '🏠', label: '홈' },
          { icon: '⊞', label: '서비스' },
          { icon: '💬', label: '상담' },
          { icon: '🤍', label: '찜' },
          { icon: '👤', label: '마이' },
        ].map(item => (
          <div key={item.label} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', cursor: 'pointer',
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
        <div style={{ color: '#8B6914', fontSize: '14px' }}>로딩 중...</div>
      </div>
    }>
      <ResultNewContent />
    </Suspense>
  )
}
