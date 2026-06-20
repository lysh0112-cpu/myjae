'use client'

import { useState } from 'react'

const STEM_ELEMENT: Record<string,string> = {甲:"목",乙:"목",丙:"화",丁:"화",戊:"토",己:"토",庚:"금",辛:"금",壬:"수",癸:"수"};
const BRANCH_ELEMENT: Record<string,string> = {子:"수",丑:"토",寅:"목",卯:"목",辰:"토",巳:"화",午:"화",未:"토",申:"금",酉:"금",戌:"토",亥:"수"};
const BRANCH_LIST = [
  {char:"子"},{char:"丑"},{char:"寅"},{char:"卯"},
  {char:"辰"},{char:"巳"},{char:"午"},{char:"未"},
  {char:"申"},{char:"酉"},{char:"戌"},{char:"亥"},
];

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
}

export default function AiAnalysis({
  saju, gender, calType, yearParam, monthParam, dayParam,
  hourIdx, leapMonth, solar
}: Props) {
  const [aiResult, setAiResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const currentYear = new Date().getFullYear()

  const handleAiAnalysis = async () => {
    setLoading(true)
    setAiResult('')
    setDone(false)

    const sajuText = saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(', ')
    const lunarInfo = calType === '음력' && solar
      ? `\n음력 ${yearParam}년 ${monthParam}월 ${dayParam}일${leapMonth === '1' ? ' (윤달)' : ''} → 양력 ${solar.year}년 ${solar.month}월 ${solar.day}일로 변환`
      : ''
    const elements = {목:0,화:0,토:0,금:0,수:0} as Record<string,number>
    saju.forEach(({stem,branch}) => {
      if (STEM_ELEMENT[stem]) elements[STEM_ELEMENT[stem]]++
      if (BRANCH_ELEMENT[branch]) elements[BRANCH_ELEMENT[branch]]++
    })

    const prompt = `당신은 30년 경력의 명리학 전문가입니다. 다음 사주를 아래 10가지 항목으로 상세히 분석해주세요.

성별: ${gender}성
생년월일: ${calType} ${yearParam}년 ${monthParam}월 ${dayParam}일${lunarInfo}
태어난 시: ${hourIdx === null ? '모름' : BRANCH_LIST[hourIdx]?.char+'시'}
사주팔자: ${sajuText}
오행 분포: 목${elements['목']} 화${elements['화']} 토${elements['토']} 금${elements['금']} 수${elements['수']}

아래 10가지 항목을 각각 이모지와 제목을 붙여 친근하고 이해하기 쉽게 분석해주세요:

1️⃣ 나의 사주팔자 상세분석
- 사주팔자 구성 살펴보기
- 사주팔자가 말해주는 나의 운명이야기
- 음양오행으로 보는 나의 성격과 기질

2️⃣ 내 인생의 황금기
- 인생의 고점과 저점 분석
- 부와 성공이 예약된 황금기
- 조심해야 할 인생의 암흑기

3️⃣ 연애운과 배우자운
- 나의 연애유형과 성향
- 사주가 알려주는 운명의 상대
- 천생연분을 만나는 최적의 시기

4️⃣ 나의 재물운 분석
- 내 사주 속에 숨겨진 재물운
- 돈이 불어날 때와 조심해야 할 때
- 재물복을 높이는 방법과 재테크 전략

5️⃣ 직업과 성공의 운명
- 나에게 적합한 직업과 직종 제안
- 내 운명은 사업가일까, 직장인일까

6️⃣ 사주로 보는 건강과 체질
- 타고난 건강 체질과 관리법
- 건강에 유의해야 할 시기와 대처법

7️⃣ 당신을 도와줄 운명의 귀인
- 나를 돕는 귀인의 특징
- 운명의 귀인을 만나는 시기

8️⃣ 운명을 바꾸는 방법
- 사주가 가리키는 운명의 개선점
- 운의 물길을 바꾸는 인생 전략

9️⃣ 나의 ${currentYear}년 월별 상세 운명분석
- 월별 상세 운명분석 (1월~12월)

🔟 앞으로의 10년간 운명 분석
- ${currentYear}년부터 ${currentYear + 9}년 10년간 운명 분석

각 항목을 풍부하고 구체적으로 분석해주세요.`

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({messages:[{role:'user',content:prompt}]}),
      })
      const data = await res.json()
      const text = data.content?.find((c:{type:string}) => c.type==='text')?.text
      setAiResult(text || '결과를 가져오지 못했습니다.')
    } catch(e) {
      setAiResult('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
      setDone(true)
    }
  }

  return (
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
          <p className="text-sm text-center" style={{color:"#FAC775"}}>
            AI가 사주를 분석하고 있습니다...<br/>10가지 항목 분석 중 (약 30초 소요)
          </p>
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
  )
}
