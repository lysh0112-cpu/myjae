{/* 헤더 */}
<div className="px-5 pt-5 pb-3">
  <div className="flex items-center gap-2 flex-wrap mb-2">
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
  <p className="text-xs mb-3" style={{color:'#8a88a0'}}>
    자평진전 격국론 + 억부/조후/병약/종격 통합 분석
  </p>
  {/* ✅ 버튼을 아래로 이동 */}
  <button onClick={handleAIDetail} disabled={loading}
    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold"
    style={{background: done ? 'rgba(76,175,80,0.2)' : 'rgba(250,199,117,0.15)',
      color: done ? '#4caf50' : '#FAC775',
      border: done ? '1px solid rgba(76,175,80,0.3)' : '1px solid rgba(250,199,117,0.3)'}}>
    {loading
      ? <><span className="animate-spin inline-block">✦</span> Track 1·2 분석 중... (약 30초)</>
      : done ? '✓ AI 상세 해설 완료' : '🤖 Track 1·2 AI 상세 해설 보기'}
  </button>
</div>
