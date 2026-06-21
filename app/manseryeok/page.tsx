"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "../components/BottomNav";
import PersonForm, { PersonData } from "./components/PersonForm";

const QUESTION_CATEGORIES = [
  { id: "love", label: "연애·결혼", icon: "💕" },
  { id: "career", label: "취업·직장", icon: "💼" },
  { id: "business", label: "사업·재물", icon: "💰" },
  { id: "health", label: "건강", icon: "🌿" },
  { id: "move", label: "이사·방위", icon: "🏠" },
]

const defaultPerson = (): PersonData => ({
  gender: '남', calType: '양력',
  year: '', month: '', day: '',
  isLeapMonth: false,
  selectedHour: null, unknownHour: false,
})

function ManseryeokContent() {
  const router = useRouter()

  // 모드: 'single' | 'couple'
  const [mode, setMode] = useState<'single' | 'couple'>('single')

  // 개인 사주
  const [person, setPerson] = useState<PersonData>(defaultPerson())

  // 궁합
  const [personA, setPersonA] = useState<PersonData>(defaultPerson())
  const [personB, setPersonB] = useState<PersonData>(defaultPerson())

  // 질문
  const [selectedCategory, setSelectedCategory] = useState('')
  const [customQuestion, setCustomQuestion] = useState('')

  function isPersonReady(p: PersonData) {
    return !!p.year && !!p.month && !!p.day && (p.unknownHour || p.selectedHour !== null)
  }

  const singleReady = isPersonReady(person)
  const coupleReady = isPersonReady(personA) && isPersonReady(personB)
  const readyToAnalyze = mode === 'single' ? singleReady : coupleReady

  function handleAnalyze() {
    if (!readyToAnalyze) return
    const params = new URLSearchParams()

    if (mode === 'single') {
      params.set("gender", person.gender)
      params.set("calType", person.calType)
      params.set("year", person.year)
      params.set("month", person.month)
      params.set("day", person.day)
      if (person.calType === "음력") params.set("leapMonth", person.isLeapMonth ? "1" : "0")
      params.set("hour", person.unknownHour ? "모름" : String(person.selectedHour))
      if (selectedCategory) params.set("category", selectedCategory)
      if (customQuestion.trim()) params.set("question", customQuestion.trim())
      router.push(`/manseryeok/result?${params.toString()}`)
    } else {
      // 궁합 모드
      params.set("mode", "couple")
      params.set("a_gender", personA.gender)
      params.set("a_calType", personA.calType)
      params.set("a_year", personA.year)
      params.set("a_month", personA.month)
      params.set("a_day", personA.day)
      if (personA.calType === "음력") params.set("a_leapMonth", personA.isLeapMonth ? "1" : "0")
      params.set("a_hour", personA.unknownHour ? "모름" : String(personA.selectedHour))
      params.set("b_gender", personB.gender)
      params.set("b_calType", personB.calType)
      params.set("b_year", personB.year)
      params.set("b_month", personB.month)
      params.set("b_day", personB.day)
      if (personB.calType === "음력") params.set("b_leapMonth", personB.isLeapMonth ? "1" : "0")
      params.set("b_hour", personB.unknownHour ? "모름" : String(personB.selectedHour))
      if (selectedCategory) params.set("category", selectedCategory)
      if (customQuestion.trim()) params.set("question", customQuestion.trim())
      router.push(`/manseryeok/result?${params.toString()}`)
    }
  }

  return (
    <div className="min-h-screen" style={{background:"#1a1a18", maxWidth:"430px", margin:"0 auto"}}>

      {/* 헤더 */}
      <header className="fixed top-0 z-50 flex items-center justify-between px-4 py-4"
        style={{background:"rgba(26,26,24,0.97)", backdropFilter:"blur(12px)",
          borderBottom:"1px solid rgba(255,255,255,0.06)", width:"100%", maxWidth:"430px", left:"50%", transform:"translateX(-50%)"}}>
        <Link href="/">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{background:"rgba(255,255,255,0.06)"}}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        </Link>
        <div className="text-sm font-bold text-white">AI 만세력 분석</div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:"rgba(60,52,137,0.3)"}}>
          <span style={{color:"#FAC775", fontSize:"16px"}}>✦</span>
        </div>
      </header>

      <main className="pt-20 pb-36 px-4 space-y-4">

        {/* 모드 선택 */}
        <div className="rounded-2xl p-4" style={{background:"#2C2C2A", border:"1px solid rgba(255,255,255,0.07)"}}>
          <p className="text-xs font-semibold mb-3" style={{color:"rgba(250,199,117,0.8)"}}>분석 유형 선택</p>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setMode('single')}
              className="flex flex-col items-center py-4 rounded-xl transition-all active:scale-95"
              style={mode==='single'
                ? {background:"#3C3489", border:"1px solid rgba(250,199,117,0.4)"}
                : {background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)"}}>
              <span className="text-2xl mb-1">👤</span>
              <span className="text-sm font-bold" style={{color: mode==='single' ? '#FAC775' : '#8a88a0'}}>개인 사주</span>
              <span className="text-xs mt-0.5" style={{color: mode==='single' ? 'rgba(250,199,117,0.7)' : '#6a6880'}}>나의 사주 분석</span>
            </button>
            <button onClick={() => setMode('couple')}
              className="flex flex-col items-center py-4 rounded-xl transition-all active:scale-95"
              style={mode==='couple'
                ? {background:"linear-gradient(135deg,#8B2FC9,#E91E63)", border:"1px solid rgba(233,30,99,0.4)"}
                : {background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)"}}>
              <span className="text-2xl mb-1">💑</span>
              <span className="text-sm font-bold" style={{color: mode==='couple' ? '#fff' : '#8a88a0'}}>궁합 분석</span>
              <span className="text-xs mt-0.5" style={{color: mode==='couple' ? 'rgba(255,255,255,0.7)' : '#6a6880'}}>두 사람 궁합 보기</span>
            </button>
          </div>
        </div>

        {/* 개인 사주 모드 */}
        {mode === 'single' && (
          <PersonForm
            label="나"
            color="rgba(60,52,137,0.8)"
            data={person}
            onChange={setPerson}
          />
        )}

        {/* 궁합 분석 모드 */}
        {mode === 'couple' && (
          <>
            <div className="flex items-center gap-2 px-1">
              <div className="flex-1 h-px" style={{background:"rgba(255,255,255,0.08)"}}/>
              <span className="text-xs" style={{color:'#8a88a0'}}>두 사람의 정보를 입력해 주세요</span>
              <div className="flex-1 h-px" style={{background:"rgba(255,255,255,0.08)"}}/>
            </div>
            <PersonForm
              label="나"
              color="rgba(60,52,137,0.8)"
              data={personA}
              onChange={setPersonA}
            />
            <div className="flex items-center justify-center py-1">
              <span className="text-2xl">💕</span>
            </div>
            <PersonForm
              label="상대방"
              color="rgba(233,30,99,0.8)"
              data={personB}
              onChange={setPersonB}
            />
          </>
        )}

        {/* 질문 입력 */}
        <div className="rounded-2xl p-4"
          style={{background:"#2C2C2A",
            border:`1px solid ${selectedCategory || customQuestion ? "rgba(250,199,117,0.2)" : "rgba(255,255,255,0.07)"}`}}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🔮</span>
            <span className="text-sm font-bold text-white">가장 궁금한 것</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{background:"rgba(255,255,255,0.06)", color:"#8a88a0"}}>선택</span>
          </div>
          <div className="flex flex-wrap gap-2 mb-3">
            {QUESTION_CATEGORIES.map(cat => (
              <button key={cat.id}
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                style={selectedCategory === cat.id
                  ? {background:"#3C3489", color:"#FAC775", border:"1px solid rgba(250,199,117,0.3)"}
                  : {background:"rgba(255,255,255,0.04)", color:"#8a88a0", border:"1px solid rgba(255,255,255,0.08)"}}>
                <span>{cat.icon}</span><span>{cat.label}</span>
              </button>
            ))}
          </div>
          <textarea
            value={customQuestion}
            onChange={(e) => setCustomQuestion(e.target.value)}
            placeholder={mode === 'couple'
              ? "두 사람에 대해 궁금한 것을 입력해주세요&#10;예) 우리 결혼해도 될까요?"
              : "더 구체적으로 입력해주세요&#10;예) 올해 이직해도 될까요?"}
            rows={2} maxLength={200}
            className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none"
            style={{background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
              color:"#e0dce8", lineHeight:"1.7"}}
          />
          <div className="text-right text-xs mt-1" style={{color:"#8a88a0"}}>
            {customQuestion.length}/200
          </div>
        </div>
      </main>

      <BottomNav />

      {/* 분석 시작 버튼 */}
      <div className="fixed bottom-0 z-50 px-4 py-4"
        style={{background:"linear-gradient(to top, #1a1a18 70%, transparent)", width:"100%", maxWidth:"430px",
          left:"50%", transform:"translateX(-50%)", paddingBottom:"calc(env(safe-area-inset-bottom, 0px) + 60px)"}}>
        <button onClick={handleAnalyze} disabled={!readyToAnalyze}
          className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
          style={readyToAnalyze
            ? mode === 'couple'
              ? {background:"linear-gradient(135deg,#8B2FC9,#E91E63)", color:"#fff", boxShadow:"0 4px 24px rgba(233,30,99,0.4)"}
              : {background:"linear-gradient(135deg,#3C3489 0%,#FAC775 100%)", color:"#1a1a18", boxShadow:"0 4px 24px rgba(60,52,137,0.5)"}
            : {background:"rgba(255,255,255,0.06)", color:"#8a88a0", cursor:"not-allowed"}}>
          {!readyToAnalyze
            ? "생년월일을 먼저 입력해주세요"
            : mode === 'couple'
            ? "💑 궁합 분석 시작"
            : "✨ AI 만세력 분석 시작"}
        </button>
      </div>
    </div>
  )
}

export default function ManseryeokPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{background:"#1a1a18"}}>
        <div style={{color:"#FAC775"}}>로딩 중...</div>
      </div>
    }>
      <ManseryeokContent/>
    </Suspense>
  )
}
