'use client'
import { useState } from 'react'
import { calcYongsinPro } from '@/lib/saju/yongsin_pro'

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
  saju: {pillar:string; stem:string; branch:string}[]
  dayStem: string
  hourIdx: number | null
  gender: string
  yearParam: number
  monthParam: number
  dayParam: number
  calType: string
  customScores?: Record<string,number> | null
  consultationId: string | null
  customerPhone: string
}

export default function YongsinAIAnalysis({
  saju, dayStem, hourIdx, gender, yearParam, monthParam, dayParam,
  calType, customScores, consultationId, customerPhone
}: Props) {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleAnalysis() {
    if (!dayStem || saju.length === 0) return
    setLoading(true)
    try {
      // 용신 계산
      const { track1, track2, isConflict, score } =
        calcYongsinPro(saju, dayStem, hourIdx, customScores ?? null)

      const sajuText = saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(', ')
      const scoreText = Object.entries(score).map(([k,v]) => `${k}:${v}`).join(' ')

      const prompt = `다음 사주를 용신까지 반영하여 종합 분석해주세요.

성별: ${gender}성
생년월일: ${calType} ${yearParam}년 ${monthParam}월 ${dayParam}일
사주팔자: ${sajuText}
오행 점수: ${scoreText}

[Track 1 - 내면/건강/행복 용신]
용신 유형: ${track1.type}
용신: ${track1.yongsin} / 희신: ${track1.heeksin} / 기신: ${track1.gisin}
${track1.description}

[Track 2 - 사회/직업/성공 용신]
격국: ${track2.gyeokguk}
사회적 용신: ${track2.yongsin}
${track2.description}

${isConflict ? '[주의] 두 용신이 상극 관계 - 내면과 외면의 에너지가 다름' : ''}

중요: 마크다운 기호(##, **, --- 등)를 절대 사용하지 말고 일반 텍스트로만 작성하세요.

위 용신 분석을 바탕으로 아래 항목을 종합적으로 분석해주세요:

1. 용신으로 본 타고난 성격과 기질
- 일간과 용신의 관계에서 드러나는 본질적 성격
- 내면의 욕구와 사회적 페르소나의 차이

2. 용신으로 본 건강과 생활 조언
- Track 1 용신 기반 건강 관리법
- 일상에서 용신 기운을 보충하는 방법 (색상, 방향, 음식, 환경)

3. 용신으로 본 직업과 성공 전략
- Track 2 격국 기반 최적 직업군
- 사회적 성공을 위한 구체적 전략

4. 용신으로 본 대인관계와 인연
- 용신 오행과 잘 맞는 사람의 특징
- 피해야 할 기신 오행의 사람 유형

5. 현재 운세와 개운법
- 현재 대운/세운에서 용신 활용법
- 지금 당장 실천할 수 있는 개운법 3가지

읽는 사람이 "어떻게 이렇게 정확하지?" 라고 느낄 만큼 구체적으로 작성해주세요.`

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({messages:[{role:'user', content: prompt}]}),
      })
      const data = await res.json()
      const rawText = data.content?.find((c:{type:string}) => c.type==='text')?.text || ''
      setResult(cleanMarkdown(rawText))
    } catch(e) {
      setResult('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSendToCustomer() {
    if (!consultationId || !result.trim()) return
    setSending(true)
    try {
      const { supabase } = await import('@/lib/supabase')
      await supabase.from('chat_messages').insert({
        consultation_id: consultationId,
        sender: 'consultant',
        message: `📊 용신 반영 사주 분석\n\n${result}`,
      })
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch(e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{background:'#2C2C2A', border:'1px solid rgba(250,199,117,0.3)'}}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div>
          <div className="flex items-center gap-2">
            <span style={{color:'#FAC775'}}>⚡</span>
            <div className="text-sm font-bold text-white">용신 반영 AI 사주 해석</div>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{background:'rgba(250,199,117,0.2)', color:'#FAC775'}}>
              전문가 전용
            </span>
          </div>
          <div className="text-xs mt-0.5" style={{color:'#8a88a0'}}>
            투트랙 용신 + 사주팔자 종합 분석
          </div>
        </div>
        <button onClick={handleAnalysis} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold"
          style={{background:'rgba(250,199,117,0.2)', color:'#FAC775',
            border:'1px solid rgba(250,199,117,0.3)'}}>
          {loading
            ? <><span className="animate-spin">✦</span>분석 중...</>
            : <>⚡ AI 분석 시작</>}
        </button>
      </div>

      {loading && (
        <div className="flex flex-col items-center py-8 gap-3">
          <div className="text-3xl animate-spin">✦</div>
          <p className="text-sm text-center" style={{color:'#FAC775'}}>
            용신을 반영하여 분석 중입니다...<br/>
            (약 30~40초 소요)
          </p>
        </div>
      )}

      {result && !loading && (
        <div className="p-4">
          <div className="rounded-xl p-4 mb-3"
            style={{background:'rgba(250,199,117,0.05)',
              border:'1px solid rgba(250,199,117,0.15)'}}>
            <p className="text-sm leading-relaxed whitespace-pre-wrap"
              style={{color:'#e0dce8'}}>{result}</p>
          </div>

          {/* 전송 버튼 */}
          {consultationId && (
            <div className="flex gap-2">
              <button onClick={handleSendToCustomer}
                disabled={sending || sent}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
                style={{
                  background: sent ? 'rgba(76,175,80,0.2)' : 'rgba(60,52,137,0.5)',
                  color: sent ? '#81c784' : '#FAC775',
                  border: sent ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(60,52,137,0.5)',
                }}>
                {sent ? '✓ 전송 완료' : sending ? '전송 중...' : '고객에게 전송'}
              </button>
              <button onClick={handleAnalysis}
                className="px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{background:'rgba(255,255,255,0.06)', color:'#8a88a0',
                  border:'1px solid rgba(255,255,255,0.08)'}}>
                🔄 재분석
              </button>
            </div>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="p-4 text-center">
          <p className="text-sm" style={{color:'#8a88a0'}}>
            AI 분석 시작 버튼을 눌러주세요
          </p>
          <p className="text-xs mt-1" style={{color:'rgba(255,255,255,0.2)'}}>
            오행 분포를 수정하면 더 정확한 분석이 가능합니다
          </p>
        </div>
      )}
    </div>
  )
}
