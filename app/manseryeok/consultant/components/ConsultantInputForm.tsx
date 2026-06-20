'use client'
import { useInputForm, formatBirth, timeToHourIdx } from '@/hooks/useInputForm'

const BRANCH_LIST = [
  {char:'子'},{char:'丑'},{char:'寅'},{char:'卯'},
  {char:'辰'},{char:'巳'},{char:'午'},{char:'未'},
  {char:'申'},{char:'酉'},{char:'戌'},{char:'亥'},
]

export default function ConsultantInputForm({
  onSubmit,
  initialGender,
  initialCalType,
  initialBirth,
  initialHour,
}: {
  onSubmit: (params: Record<string, string>) => void
  initialGender?: '남' | '여'
  initialCalType?: '양력' | '음력'
  initialBirth?: string
  initialHour?: string
}) {
  const {
    birthInput, setBirthInput,
    timeInput, setTimeInput,
    noTime, setNoTime,
    gender, setGender,
    calType, setCalType,
    customerName, setCustomerName,
    error, handleSubmit,
  } = useInputForm(onSubmit, initialGender, initialCalType, initialBirth, initialHour)

  return (
    <div className="rounded-2xl p-4"
      style={{background:'linear-gradient(135deg,#3C3489 0%,#2a2075 100%)',border:'1px solid rgba(250,199,117,0.2)'}}>
      <div className="text-xs font-semibold mb-3" style={{color:'rgba(250,199,117,0.8)'}}>✦ 고객 정보 입력</div>
      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>고객 이름 (선택)</label>
        <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
          placeholder="홍길동" className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
          style={{background:'rgba(255,255,255,0.1)',color:'#fff',border:'1px solid rgba(255,255,255,0.15)'}} />
      </div>
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>성별</label>
          <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.15)'}}>
            {(['남','여'] as const).map(v => (
              <button key={v} onClick={() => setGender(v)} className="flex-1 py-2 text-sm font-bold transition-all"
                style={gender===v?{background:'rgba(250,199,117,0.3)',color:'#FAC775'}:{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)'}}>
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>달력</label>
          <div className="flex rounded-xl overflow-hidden" style={{border:'1px solid rgba(255,255,255,0.15)'}}>
            {(['양력','음력'] as const).map(v => (
              <button key={v} onClick={() => setCalType(v)} className="flex-1 py-2 text-sm font-bold transition-all"
                style={calType===v?{background:'rgba(250,199,117,0.3)',color:'#FAC775'}:{background:'rgba(255,255,255,0.05)',color:'rgba(255,255,255,0.5)'}}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>생년월일 (8자리)</label>
        <input type="tel" value={birthInput} onChange={(e) => setBirthInput(formatBirth(e.target.value))}
          placeholder="1998.01.05" maxLength={10}
          className="w-full rounded-xl px-3 py-2.5 text-lg text-center font-bold tracking-widest focus:outline-none"
          style={{background:'rgba(255,255,255,0.1)',color:'#FAC775',border:'1px solid rgba(255,255,255,0.15)'}} />
      </div>
      <div className="mb-4">
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>출생시간 (4자리)</label>
        <div className="flex gap-2 items-center">
          <input type="tel" value={timeInput} onChange={(e) => setTimeInput(e.target.value.replace(/\D/g,'').slice(0,4))}
            placeholder="0200" maxLength={4} disabled={noTime}
            className="flex-1 rounded-xl px-3 py-2.5 text-lg text-center font-bold tracking-widest focus:outline-none"
            style={{background:noTime?'rgba(255,255,255,0.03)':'rgba(255,255,255,0.1)',
              color:noTime?'rgba(255,255,255,0.3)':'#FAC775',border:'1px solid rgba(255,255,255,0.15)'}} />
          <label className="flex items-center gap-1.5 text-sm cursor-pointer" style={{color:'rgba(255,255,255,0.6)'}}>
            <input type="checkbox" checked={noTime} onChange={(e) => setNoTime(e.target.checked)} className="w-4 h-4 rounded" />
            모름
          </label>
        </div>
        {timeInput.length >= 3 && !noTime && (
          <p className="text-xs mt-1" style={{color:'rgba(250,199,117,0.7)'}}>
            → {BRANCH_LIST[timeToHourIdx(timeInput) ?? 0]?.char}시
          </p>
        )}
      </div>
      {error && <p className="text-xs mb-3 text-center" style={{color:'#ff8080'}}>{error}</p>}
      <button onClick={handleSubmit}
        className="w-full py-3 rounded-xl font-bold text-sm transition-all active:scale-95"
        style={{background:'linear-gradient(135deg,#FAC775,#f0a030)',color:'#1a1a18'}}>
        ✦ 사주 조회하기
      </button>
    </div>
  )
}
