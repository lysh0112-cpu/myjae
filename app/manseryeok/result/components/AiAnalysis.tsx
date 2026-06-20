'use client'

import { useState } from 'react'
import { getFreePrompt, getFullPrompt } from './prompts'

const PAID_ITEMS = [
  { icon: "3️⃣", label: "연애·결혼·배우자운", desc: "나의 연애유형·운명의 상대·결혼시기" },
  { icon: "4️⃣", label: "적성·직업·취업운", desc: "나에게 맞는 직업·사업 vs 직장" },
  { icon: "5️⃣", label: "재물·부동산·내집마련", desc: "재물운·돈 버는 시기·재테크 전략" },
  { icon: "6️⃣", label: "사업운·성공운", desc: "사업 적성·성공 시기·파트너운" },
  { icon: "7️⃣", label: "자녀운·자녀결혼운", desc: "자녀 인연·자녀 운명·결혼시기" },
  { icon: "8️⃣", label: "노후재물·안정운", desc: "노후 준비·재물 안정·평안한 노년" },
  { icon: "9️⃣", label: "귀인운·운명개선", desc: "나를 돕는 귀인·운명을 바꾸는 방법" },
  { icon: "🔟", label: "10년 운명·월별운", desc: "앞으로 10년 흐름·월별 상세운세" },
]

function cleanMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/^---+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

interface Props {
  saju: { pillar: string; stem: string; branch: string }[]
  gender: string
  calType: string
  yearParam: number
  monthParam: number
  dayParam: number
  hourIdx: number | null
  leapMonth: string
  solar: { year: number; month: number; day: number } | null
  isPaid?: boolean
  onPayRequest?: () => void
}

export default function AiAnalysis({
  saju, gender, calType, yearParam, monthParam, dayParam,
  hourIdx, leapMonth, solar, isPaid = false, onPayRequest
}: Props) {
  const [aiResult, setAiResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const promptParams = {
    saju, gender, calType, yearParam, monthParam, dayParam,
    hourIdx, leapMonth, solar
  }

  const handleAiAnalysis = async (paid?: boolean) => {
    setLoading(true)
    setAiResult('')
    setDone(false)

    const usePaid = paid !== undefined ? paid : isPaid
    const prompt = usePaid
      ? getFullPrompt(promptParams)
      : getFreePrompt(promptParams)

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({messages:[{role:'user',content:prompt}]}),
      })
      const data = await res.json()
      const rawText = data.content?.find((c:{type:string}) => c.type==='text')?.text || ''
      setAiResult(cleanMarkdown(rawText))
    } catch(e) {
      setAiResult('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
      setDone(true)
    }
  }

const handlePayAndAnalyze = () => {
    onPayRequest?.()
    setDone(false)
    setAiResult('')
    setLoading(true)
    setTimeout(() => handleAiAnalysis(true), 50)
  }
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{background:"#2C2C2A",border:"1px solid rgba(255,255,255,0.07)"}}>

      {/* 무료 분석 영역 */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-lg">🤖</span>
          <h2 className="text-base font-bold text-white">AI 사주 분석</h2>
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{background:"rgba(76,175,80,0.2)",color:"#4caf50"}}>
            무료
          </span>
        </div>
        <p className="text-xs mb-4" style={{color:"#8a88a0"}}>
          사주팔자·성격 분석 + 건강·체질 분석
        </p>

        {!done && !loading && (
          <button onClick={() => handleAiAnalysis()}
            className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
            style={{background:"linear-gradient(135deg,#3C3489 0%,#FAC775 100%)",
              color:"#1a1a18",boxShadow:"0 4px 20px rgba(60,52,137,0.4)"}}>
            ✨ 무료 AI 분석 시작하기
          </button>
        )}
        {loading && (
          <div className="flex flex-col items-center py-8 gap-3">
            <div className="text-3xl animate-spin">✦</div>
            <p className="text-sm text-center" style={{color:"#FAC775"}}>
              {isPaid ? 'AI가 10가지 항목을 분석하고 있습니다...' : 'AI가 사주를 분석하고 있습니다...'}<br/>
              (약 20~30초 소요)
            </p>
          </div>
        )}
        {done && aiResult && (
          <div>
            <div className="rounded-xl p-4 mb-3"
              style={{background:"rgba(60,52,137,0.15)",border:"1px solid rgba(60,52,137,0.3)"}}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap"
                style={{color:"#e0dce8"}}>{aiResult}</p>
            </div>
            <button onClick={() => handleAiAnalysis()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold mb-2"
              style={{border:"1px solid rgba(60,52,137,0.5)",color:"#b0aec8",
                background:"rgba(60,52,137,0.1)"}}>
              🔄 다시 분석하기
            </button>
          </div>
        )}
      </div>

      {/* 유료 잠금 영역 — 결제 전에만 표시 */}
      {!isPaid && (
        <div className="px-5 pb-5">
          <div className="rounded-xl overflow-hidden"
            style={{border:"1px solid rgba(250,199,117,0.25)"}}>

            {/* 잠금 헤더 */}
            <div className="px-4 py-3 flex items-center justify-between"
              style={{background:"linear-gradient(135deg,rgba(60,52,137,0.5),rgba(250,199,117,0.15))"}}>
              <div>
                <div className="text-sm font-bold text-white">🔒 나머지 8가지 분석</div>
                <div className="text-xs mt-0.5" style={{color:"rgba(255,255,255,0.5)"}}>
                  연애·재물·직업·건강·10년운 등
                </div>
              </div>
              <div className="text-right">
                <div className="text-xl font-bold" style={{color:"#FAC775"}}>10,000원</div>
                <div className="text-xs" style={{color:"rgba(255,255,255,0.4)"}}>전체 공개</div>
              </div>
            </div>

            {/* 잠금 항목 목록 */}
            {PAID_ITEMS.map((item, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3"
                style={{
                  borderTop:"1px solid rgba(255,255,255,0.04)",
                  background:"rgba(0,0,0,0.15)",
                }}>
                <span className="text-base">{item.icon}</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold"
                    style={{color:"rgba(192,188,216,0.6)"}}>
                    {item.label}
                  </div>
                  <div className="text-xs" style={{color:"rgba(106,104,128,0.8)"}}>
                    {item.desc}
                  </div>
                </div>
                <span style={{color:"rgba(106,104,128,0.8)",fontSize:"14px"}}>🔒</span>
              </div>
            ))}

            {/* 결제 버튼 */}
            <div className="p-4"
              style={{borderTop:"1px solid rgba(255,255,255,0.05)"}}>
              <button
                onClick={handlePayAndAnalyze}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                style={{background:"linear-gradient(135deg,#FAC775,#f0a030)",
                  color:"#1a1a18",boxShadow:"0 4px 16px rgba(250,199,117,0.3)"}}>
                ✨ 전체보기 — 10,000원 결제
              </button>
              <p className="text-xs text-center mt-2"
                style={{color:"rgba(255,255,255,0.3)"}}>
                결제 후 즉시 8가지 추가 분석 공개
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
