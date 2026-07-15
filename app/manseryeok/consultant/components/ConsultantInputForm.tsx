'use client'
import { useState } from 'react'
import { useInputForm, formatBirth } from '@/hooks/useInputForm'

const BRANCH_LIST = [
  {char:'子',label:'子시 (23:30~01:30시)'},
  {char:'丑',label:'丑시 (01:30~03:30시)'},
  {char:'寅',label:'寅시 (03:30~05:30시)'},
  {char:'卯',label:'卯시 (05:30~07:30시)'},
  {char:'辰',label:'辰시 (07:30~09:30시)'},
  {char:'巳',label:'巳시 (09:30~11:30시)'},
  {char:'午',label:'午시 (11:30~13:30시)'},
  {char:'未',label:'未시 (13:30~15:30시)'},
  {char:'申',label:'申시 (15:30~17:30시)'},
  {char:'酉',label:'酉시 (17:30~19:30시)'},
  {char:'戌',label:'戌시 (19:30~21:30시)'},
  {char:'亥',label:'亥시 (21:30~23:30시)'},
]

const QUESTION_CATEGORIES = [
  { id: 'love', label: '연애·결혼', icon: '💕' },
  { id: 'career', label: '취업·직장', icon: '💼' },
  { id: 'business', label: '사업·재물', icon: '💰' },
  { id: 'health', label: '건강', icon: '🌿' },
  { id: 'move', label: '이사·방위', icon: '🏠' },
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

  const [selectedCategory, setSelectedCategory] = useState('')
  const [customQuestion, setCustomQuestion] = useState('')
  const [showQuestion, setShowQuestion] = useState(false)

  return (
    <div className="rounded-2xl p-4"
      style={{background:'linear-gradient(135deg,#3C3489 0%,#2a2075 100%)',border:'1px solid rgba(250,199,117,0.2)'}}>
      <div className="text-xs font-semibold mb-3" style={{color:'rgba(250,199,117,0.8)'}}>✦ 고객 정보 입력</div>

      {/* 고객 이름 */}
      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>고객 이름 (선택)</label>
        <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)}
          placeholder="홍길동"
          className="w-full rounded-xl px-3 py-2.5 text-lg text-center font-bold tracking-widest focus:outline-none"
          style={{background:'rgba(255,255,255,0.1)', color:'#FAC775', border:'1px solid rgba(255,255,255,0.15)'}} />
      </div>

      {/* 성별·달력 */}
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

      {/* 생년월일 */}
      <div className="mb-3">
        <label className="text-xs mb-1 block" style={{color:'rgba(255,255,255,0.6)'}}>생년월일 (8자리)</label>
        <input type="tel" value={birthInput} onChange={(e) => setBirthInput(formatBirth(e.target.value))}
          placeholder="1998.01.05" maxLength={10}
          className="w-full rounded-xl px-3 py-2.5 text-lg text-center font-bold tracking-widest focus:outline-none"
          style={{background:'rgba(255,255,255,0.1)',color:'#FAC775',border:'1px solid rgba(255,255,255,0.15)'}} />
      </div>

      {/* 출생시간 */}
      <div className="mb-3">
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

      {/* ✅ 고객 질문 입력란 */}
      <div className="mb-4">
        <button
          onClick={() => setShowQuestion(!showQuestion)}
          className="w-full py-2 rounded-xl text-xs font-semibold mb-2 transition-all"
          style={{background: showQuestion ? 'rgba(250,199,117,0.2)' : 'rgba(255,255,255,0.08)',
            color: showQuestion ? '#FAC775' : 'rgba(255,255,255,0.5)',
            border: showQuestion ? '1px solid rgba(250,199,117,0.3)' : '1px solid rgba(255,255,255,0.1)'}}>
          🔮 고객 질문 입력 {showQuestion ? '▲' : '▼'}
        </button>
        {showQuestion && (
          <div className="rounded-xl p-3"
            style={{background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.1)'}}>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUESTION_CATEGORIES.map((cat) => (
                <button key={cat.id}
                  onClick={() => setSelectedCategory(selectedCategory === cat.id ? '' : cat.id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
                  style={selectedCategory === cat.id
                    ? {background:'rgba(250,199,117,0.3)', color:'#FAC775', border:'1px solid rgba(250,199,117,0.4)'}
                    : {background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.5)', border:'1px solid rgba(255,255,255,0.1)'}}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            <textarea
              value={customQuestion}
              onChange={(e) => setCustomQuestion(e.target.value)}
              placeholder="고객이 가장 궁금한 것을 입력해주세요&#10;예) 올해 이직해도 될까요?"
              rows={2}
              maxLength={200}
              className="w-full rounded-lg px-3 py-2 text-xs resize-none focus:outline-none"
              style={{background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.1)',
                color:'#e0dce8', lineHeight:'1.6'}}
            />
            <div className="text-right text-[10px] mt-1" style={{color:'rgba(255,255,255,0.3)'}}>
              {customQuestion.length}/200
            </div>
          </div>
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
