'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const HOURS = [
  '모름', '子시(23~01)', '丑시(01~03)', '寅시(03~05)', '卯시(05~07)',
  '辰시(07~09)', '巳시(09~11)', '午시(11~13)', '未시(13~15)',
  '申시(15~17)', '酉시(17~19)', '戌시(19~21)', '亥시(21~23)',
]

const HOUR_INDEX: Record<string, number> = {
  '子시(23~01)': 0, '丑시(01~03)': 1, '寅시(03~05)': 2, '卯시(05~07)': 3,
  '辰시(07~09)': 4, '巳시(09~11)': 5, '午시(11~13)': 6, '未시(13~15)': 7,
  '申시(15~17)': 8, '酉시(17~19)': 9, '戌시(19~21)': 10, '亥시(21~23)': 11,
}

export const MY_INFO_KEY = 'myinfo'

export default function AiManseryeokSection() {
  const router = useRouter()
  const [gender, setGender] = useState<'남' | '여'>('남')
  const [birthDate, setBirthDate] = useState('')
  const [birthHour, setBirthHour] = useState('')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')

  // 입력값 변경 시 실시간으로 sessionStorage에 저장
  useEffect(() => {
    if (!birthDate) return
    const d = birthDate.split('-')
    const year = d[0] || ''
    const month = d[1] ? String(parseInt(d[1])) : ''
    const day = d[2] ? String(parseInt(d[2])) : ''
    const hourVal = birthHour === '모름' ? '모름'
      : birthHour ? String(HOUR_INDEX[birthHour]) : '모름'

    sessionStorage.setItem(MY_INFO_KEY, JSON.stringify({
      gender, calType, year, month, day, hour: hourVal,
    }))
  }, [gender, calType, birthDate, birthHour])

  function handleStart() {
    if (!birthDate) {
      alert('생년월일을 먼저 입력해주세요 😊')
      return
    }
    const params = new URLSearchParams()
    params.set('gender', gender)
    params.set('calType', calType)
    const d = birthDate.split('-')
    const year = d[0] || ''
    const month = d[1] ? String(parseInt(d[1])) : ''
    const day = d[2] ? String(parseInt(d[2])) : ''
    params.set('year', year)
    params.set('month', month)
    params.set('day', day)
    const hourVal = birthHour === '모름' ? '모름'
      : birthHour ? String(HOUR_INDEX[birthHour]) : '모름'
    params.set('hour', hourVal)

    router.push(`/manseryeok/result?${params.toString()}`)
  }

  return (
    <section className="px-4 -mt-4 relative z-10">
      <div className="rounded-2xl p-5 shadow-2xl"
        style={{ background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.15)' }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #3C3489, #4e46b0)' }}>✦</div>
          <div>
            <h2 className="text-base font-bold text-white">나는 어떤 사주를 타고났을까?</h2>
            <p className="text-xs" style={{ color: '#8a88a0' }}>생년월일과 태어난 시를 입력해주세요</p>
          </div>
        </div>
        <div className="flex gap-3 mb-4">
          {[
            { label: '성별', vals: ['남', '여'] as const, state: gender, set: setGender },
            { label: '달력', vals: ['양력', '음력'] as const, state: calType, set: setCalType },
          ].map(({ label, vals, state, set }) => (
            <div key={label} className="flex-1">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: '#b0aec8' }}>{label}</label>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
                {vals.map((v) => (
                  <button key={v} onClick={() => (set as (x: string) => void)(v)}
                    className="flex-1 py-2.5 text-sm font-medium transition-all"
                    style={state === v ? { background: '#3C3489', color: '#FAC775' } : { background: 'transparent', color: '#8a88a0' }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#b0aec8' }}>생년월일</label>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)',
              color: birthDate ? '#FAC775' : '#8a88a0', colorScheme: 'dark' }} />
        </div>
        <div className="mb-5">
          <label className="text-xs font-medium mb-1.5 block" style={{ color: '#b0aec8' }}>태어난 시 (시주)</label>
          <select value={birthHour} onChange={(e) => setBirthHour(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: '#1a1a18', border: '1px solid rgba(255,255,255,0.1)',
              color: birthHour ? '#FAC775' : '#8a88a0', colorScheme: 'dark' }}>
            <option value="">시간 선택</option>
            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #3C3489 0%, #FAC775 100%)', color: '#1a1a18',
            boxShadow: '0 4px 20px rgba(60,52,137,0.4)' }}>
          ✨ 만세력 상세 분석하기
        </button>
        <p className="text-center text-xs mt-3" style={{ color: '#8a88a0' }}>
          기본 분석은 무료 · 심층 분석은 전문 상담사와 연결
        </p>
      </div>
    </section>
  )
}
