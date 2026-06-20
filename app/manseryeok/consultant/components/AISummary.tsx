'use client'
import { useAISummary } from '@/hooks/useAISummary'

type Props = {
  consultationId: string | null
  consultantName: string
  customerPhone: string
  sajuData?: object
}

export default function AISummary({ consultationId, consultantName, customerPhone, sajuData }: Props) {
  const { summary, setSummary, commentary, loading, sending, sent, generate, sendToCustomer, saveOnly } =
    useAISummary(consultationId, consultantName, customerPhone)

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{background:'#2C2C2A', border:'1px solid rgba(250,199,117,0.15)'}}>
      <div className="flex items-center justify-between px-4 py-3"
        style={{borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
        <div>
          <div className="text-sm font-bold text-white">상담 요약</div>
          <div className="text-xs mt-0.5" style={{color: consultationId ? '#4caf50' : '#8a88a0'}}>
            {consultationId ? `● ${customerPhone} 연결됨` : '채팅 탭에서 상담을 선택해주세요'}
          </div>
        </div>
        <button onClick={() => generate(sajuData)} disabled={loading}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl font-semibold"
          style={{background:'rgba(60,52,137,0.4)', color:'#FAC775', border:'1px solid rgba(60,52,137,0.5)'}}>
          {loading ? <><span className="animate-spin">✦</span>분석 중...</> : <>✨ AI 요약 생성</>}
        </button>
      </div>

      <div className="p-4">
        {commentary && (
          <div className="mb-3 px-3 py-2 rounded-xl text-xs"
            style={{background:'rgba(60,52,137,0.2)', border:'1px solid rgba(60,52,137,0.3)', color:'#FAC775'}}>
            ✍️ 상담사 해설 반영됨
          </div>
        )}
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="AI 요약 생성 버튼을 눌러주세요&#10;상담사 해설 + 채팅 대화를 함께 요약합니다"
          rows={10}
          className="w-full rounded-xl px-4 py-3 text-sm resize-none focus:outline-none"
          style={{background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
            color:'#e0ddd0', lineHeight:'1.7'}}
        />
        <div className="flex gap-2 mt-3">
          <button onClick={sendToCustomer} disabled={sending || !summary.trim() || sent}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold disabled:opacity-40"
            style={{
              background: sent ? 'rgba(76,175,80,0.2)' : 'rgba(60,52,137,0.5)',
              color: sent ? '#81c784' : '#FAC775',
              border: sent ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(60,52,137,0.5)',
            }}>
            {sent ? '✓ 전송 완료' : sending ? '전송 중...' : '고객에게 전송 + DB 저장'}
          </button>
          <button onClick={saveOnly} disabled={!summary.trim()}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40"
            style={{background:'rgba(255,255,255,0.06)', color:'#8a88a0', border:'1px solid rgba(255,255,255,0.08)'}}>
            저장만
          </button>
        </div>
        {sent && (
          <p className="text-xs text-center mt-2" style={{color:'#81c784'}}>
            고객 채팅방에 요약이 전달됐습니다 ✓
          </p>
        )}
      </div>
    </div>
  )
}
