// YongsinProBoard.tsx
'use client'
import { calcYongsinPro } from '@/lib/saju/yongsin_pro'
import { useYongsinAI } from '@/hooks/useYongsinAI'
import YongsinTrack1 from './YongsinTrack1'
import YongsinTrack2 from './YongsinTrack2'

const ELEMENT_COLOR: Record<string,string> = {
  목:'#4caf50', 화:'#f44336', 토:'#ff9800', 금:'#9e9e9e', 수:'#2196f3'
}
const ELEMENT_CHAR: Record<string,string> = {
  목:'木', 화:'火', 토:'土', 금:'金', 수:'水'
}
const ELEMENT_KOR: Record<string,string> = {
  목:'목(木)', 화:'화(火)', 토:'토(土)', 금:'금(金)', 수:'수(水)'
}

interface Props {
  saju: {pillar:string; stem:string; branch:string}[]
  dayStem: string
  hourIdx: number | null
  customScores?: Record<string,number> | null
}

export default function YongsinProBoard({ saju, dayStem, hourIdx, customScores }: Props) {
  if (!dayStem || saju.length === 0) return null

  const { track1, track2, isConflict, conflictAdvice, score } =
    calcYongsinPro(saju, dayStem, hourIdx, customScores ?? null)

  const displayScore = customScores ?? score
  const isCustom = !!customScores && Object.values(customScores).some(v => v > 0)

  const { track1Detail, track2Detail, loading, done, generateDetail } = useYongsinAI()

  function handleAIDetail() {
    const sajuText = saju.map(s => `${s.pillar}: ${s.stem}${s.branch}`).join(', ')
    const scoreText = Object.entries(displayScore).map(([k,v]) => `${k}:${v}`).join(' ')
    generateDetail(sajuText, scoreText, track1, track2, ELEMENT_KOR)
  }

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{background:'#2C2C2A', border:'1px solid rgba(250,199,117,0.3)'}}>

      {/* 헤더 */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <span style={{color:'#FAC775', fontSize:'18px'}}>⚡</span>
            <h2 className="text-base font-bold text-white">투트랙 용신 분석</h2>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{background:'rgba(250,199,117,0.2)', color:'#FAC775'}}>
              전문가 전용
            </span>
            {isCustom && (
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{background:'rgba(76,175,80,0.2)', color:'#4caf50'}}>
                선생님 점수 적용중
              </span>
            )}
          </div>
          {/* AI 상세 해설 버튼 */}
          <button onClick={handleAIDetail} disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold flex-shrink-0"
            style={{background: done ? 'rgba(76,175,80,0.2)' : 'rgba(250,199,117,0.2)',
              color: done ? '#4caf50' : '#FAC775',
              border: done ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(250,199,117,0.3)'}}>
            {loading
              ? <><span className="animate-spin inline-block">✦</span> 분석중...</>
              : done ? '✓ 해설 완료' : '🤖 AI 상세 해설'}
          </button>
        </div>
        <p className="text-xs mt-1" style={{color:'#8a88a0'}}>
          자평진전 격국론 + 억부/조후/병약/종격 통합 분석
        </p>
      </div>

      {/* 오행 점수 */}
      <div className="px-5 pb-4">
        <p className="text-xs font-semibold mb-2" style={{color:'rgba(250,199,117,0.8)'}}>
          오행 점수 {isCustom ? '(선생님 입력값)' : '(110점 자동계산)'}
        </p>
        <div className="grid grid-cols-5 gap-1.5">
          {Object.entries(displayScore).map(([el, val]) => (
            <div key={el} className="flex flex-col items-center rounded-xl py-2"
              style={{background: isCustom ? 'rgba(76,175,80,0.08)' : 'rgba(255,255,255,0.04)',
                border: isCustom ? '1px solid rgba(76,175,80,0.2)' : '1px solid rgba(255,255,255,0.08)'}}>
              <span className="text-sm font-bold" style={{color:ELEMENT_COLOR[el]}}>
                {ELEMENT_CHAR[el]}
              </span>
              <span className="text-xs font-bold mt-0.5" style={{color:'#e0dce8'}}>{val}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Track 1 */}
      <YongsinTrack1 track1={track1} detail={track1Detail} loading={loading} />

      {/* Track 2 */}
      <YongsinTrack2 track2={track2} detail={track2Detail} loading={loading} />

      {/* 상극 시 통합 조언 */}
      {isConflict && (
        <div className="mx-4 mb-4 rounded-xl p-4"
          style={{background:'rgba(156,39,176,0.1)', border:'1px solid rgba(156,39,176,0.3)'}}>
          <div className="flex items-center gap-2 mb-2">
            <span style={{color:'#ce93d8'}}>🔮</span>
            <span className="text-sm font-bold" style={{color:'#ce93d8'}}>입체적 성향 분석</span>
          </div>
          <p className="text-xs leading-relaxed" style={{color:'#b0aec8'}}>{conflictAdvice}</p>
        </div>
      )}

      <div className="px-5 pb-4">
        <p className="text-[10px] text-center" style={{color:'rgba(255,255,255,0.2)'}}>
          ※ 본 분석은 참고용이며 최종 판단은 연재 선생님의 통변을 따릅니다
        </p>
      </div>
    </div>
  )
}
