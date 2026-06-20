'use client'
import { useInputForm, formatBirth } from '@/hooks/useInputForm'

const BRANCH_LIST = [
  {char:'子',label:'子시 (23~01시)'},
  {char:'丑',label:'丑시 (01~03시)'},
  {char:'寅',label:'寅시 (03~05시)'},
  {char:'卯',label:'卯시 (05~07시)'},
  {char:'辰',label:'辰시 (07~09시)'},
  {char:'巳',label:'巳시 (09~11시)'},
  {char:'午',label:'午시 (11~13시)'},
  {char:'未',label:'未시 (13~15시)'},
  {char:'申',label:'申시 (15~17시)'},
  {char:'酉',label:'酉시 (17~19시)'},
  {char:'戌',label:'戌시 (19~21시)'},
  {char:'亥',label:'亥시 (21~23시)'},
]

export default function ConsultantInputForm({
  onSubmit,
  initialGender,
  initialCalType,
  initialBirth,
  initialHourIdx,
  initialCustomerName,
}: {
  onSubmit: (params: Record<string, string>) => void
  initialGender?: '남' | '여'
  initialCalType?: '양력' | '음력'
  initialBirth?: string
  initialHourIdx?: number | null
  initialCustomerName?: string
}) {
  const {
    birthInput, setBirthInput,
    hourIdx, setHourIdx,
    gender, setGender,
    calType, setCalType,
    customerName, setCustomerName,
    error, handleSubmit,
  } = useInputForm(onSubmit, initialGender, initialCalType, initialBirth, initialHourIdx, initialCustomerName)

  return (
    <div className="rounded-2xl p-4"
      style={{background:'linear-gradient(135deg,#3C3489 0%,#2a2075 100%)',border:'1px solid rgba(250,199,117,0.2)'}}>
      <div className="text-xs font-semibold mb-3" style={{color:'rgba(250,199,117,0.8)'}}>✦ 고객 정보 입력</div>
      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>고객 이름 (선택)</label>
        <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
          placeholder="홍길동"
          className="w-full rounded-xl px-3 py-2.5 text-lg text-center font-bold tracking-widest focus:outline-none"
          style={{background:'rgba(255,255,255,0.1)', color:'#FAC775', border:'1px solid rgba(255,255,255,0.15)'}} />
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
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>출생시간</label>
        <select
          value={hourIdx !== null ? String(hourIdx) : '모름'}
          onChange={(e) => setHourIdx(e.target.value === '모름' ? null : parseInt(e.target.value))}
          className="w-full rounded-xl px-3 py-2.5 text-sm font-bold focus:outline-none"
          style={{background:'#ffffff', color:'#1a1a18', border:'1px solid rgba(255,255,255,0.3)'}}>
          <option value="모름">모름</option>
          {BRANCH_LIST.map((b, i) => (
            <option key={i} value={String(i)}>{b.char}시 — {b.label}</option>
          ))}
        </select>
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
