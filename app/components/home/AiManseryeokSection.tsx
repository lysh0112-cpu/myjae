'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import {
  HOURS, HOUR_INDEX, INDEX_TO_HOUR,
  fromProfile, fromInputs, toMyInfoObject,
} from '@/lib/saju/myInfo'

export const MY_INFO_KEY = 'myinfo'

export default function AiManseryeokSection() {
  const router = useRouter()
  const [gender, setGender] = useState<'남' | '여'>('남')
  const [birthDate, setBirthDate] = useState('')
  const [birthHour, setBirthHour] = useState('')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')
  const [leap, setLeap] = useState(false)   // 윤달 여부 (음력일 때만 사용)
  const [hasMine, setHasMine] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('profiles')
        .select('birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
        .eq('id', data.user.id).single()
        .then(({ data: p }) => {
          const info = fromProfile(p)
          if (info) {
            const mm = String(info.month).padStart(2, '0')
            const dd = String(info.day).padStart(2, '0')
            setBirthDate(`${info.year}-${mm}-${dd}`)
            setGender(info.gender === '여' ? '여' : '남')
            setCalType(info.calType === '음력' ? '음력' : '양력')
            setLeap(info.leapMonth === '1')
            if (info.hour === '모름') setBirthHour('모름')
            else setBirthHour(INDEX_TO_HOUR[String(info.hour)] || '')
            setHasMine(true)
          }
        })
    })
  }, [])

  function resetFields() {
    setGender('남'); setCalType('양력'); setBirthDate(''); setBirthHour('')
    setLeap(false)
    setHasMine(false)
    // 내 사주 임시정보도 비움 (궁합·개명이 못 읽도록)
    try {
      sessionStorage.removeItem(MY_INFO_KEY)
      localStorage.removeItem(MY_INFO_KEY)
    } catch {}
  }

  async function handleStart() {
    // 로그인 확인 — 로그인 안 했으면 안내하고 로그인 화면으로 보낸다.
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      alert('나의 사주를 보려면 먼저 로그인해 주세요 😊')
      router.push('/auth/login')
      return
    }

    if (!birthDate) {
      alert('생년월일을 먼저 입력해주세요 😊')
      return
    }

    // ── 표준 헬퍼로 info 구성 (시간 모름 = '모름', 윤달 = '0'/'1' 통일) ──
    const info = fromInputs({
      gender, calType,
      birthDate,
      hourLabel: birthHour,
      leap: calType === '음력' ? leap : false,   // 양력이면 윤달 개념 없음
    })
    if (!info) {
      alert('생년월일을 올바르게 입력해주세요 😊')
      return
    }

    // ── 궁합·개명 화면이 읽을 수 있도록 "내 사주(myinfo)"를 임시 저장 ──
    // 표준 형식(hour: '모름' 또는 인덱스 문자열, leapMonth: '0'/'1')으로 저장.
    // (과거 '-1' 방식은 더 이상 쓰지 않음 — 헬퍼가 표준으로 만들어 줌)
    try {
      const json = JSON.stringify(toMyInfoObject(info))
      sessionStorage.setItem(MY_INFO_KEY, json)
      localStorage.setItem(MY_INFO_KEY, json)
    } catch {}

    // ── 결과 화면은 기존대로 URL 파라미터로 전달 (계산 로직 그대로) ──
    // hour는 결과 화면이 기대하는 형식: '모름' 또는 인덱스 문자열
    const hourParam = info.hour   // '모름' 또는 '0'~'11'
    const params = new URLSearchParams()
    params.set('gender', info.gender)
    params.set('calType', info.calType)
    params.set('year', info.year)
    params.set('month', info.month)
    params.set('day', info.day)
    params.set('hour', hourParam)
    params.set('leapMonth', info.leapMonth)   // ★ 윤달 전달 (계산 정확도)
    const url = `/manseryeok/result?${params.toString()}`
    router.push(url)
  }

  return (
    <section className="px-4 -mt-4 relative z-10">
      <div className="rounded-2xl p-5 shadow-2xl"
        style={{ background: '#2C2C2A', border: '1px solid rgba(250,199,117,0.15)' }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: 'linear-gradient(135deg, #3C3489, #4e46b0)' }}>✦</div>
          <div style={{ flex: 1 }}>
            <h2 className="text-base font-bold text-white">나는 어떤 사주를 타고났을까?</h2>
            <p className="text-xs" style={{ color: '#8a88a0' }}>
              {hasMine ? '내 사주가 자동으로 입력됐어요' : '생년월일과 태어난 시를 입력해주세요'}
            </p>
          </div>
          {hasMine && (
            <button onClick={resetFields}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.08)', color: '#b0aec8', border: '1px solid rgba(255,255,255,0.12)' }}>
              🔄 새로 입력
            </button>
          )}
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

        {/* 윤달 선택 — 음력일 때만 표시 (양력은 윤달 개념 없음) */}
        {calType === '음력' && (
          <div className="mb-4">
            <label className="text-xs font-medium mb-1.5 block" style={{ color: '#b0aec8' }}>
              윤달 여부 <span style={{ color: '#8a88a0' }}>(음력 생일이 윤달이면 선택)</span>
            </label>
            <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
              {([['평달', false], ['윤달', true]] as const).map(([lbl, val]) => (
                <button key={lbl} onClick={() => setLeap(val)}
                  className="flex-1 py-2.5 text-sm font-medium transition-all"
                  style={leap === val ? { background: '#3C3489', color: '#FAC775' } : { background: 'transparent', color: '#8a88a0' }}>
                  {lbl}
                </button>
              ))}
            </div>
          </div>
        )}

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

        <button onClick={handleStart}
          className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
          style={{ background: 'linear-gradient(135deg, #3C3489 0%, #FAC775 100%)', color: '#1a1a18',
            boxShadow: '0 4px 20px rgba(60,52,137,0.4)' }}>
          ✨ 나의 운명을 펼쳐보기
        </button>

        <p className="text-center text-xs mt-3" style={{ color: '#8a88a0' }}>
          기본 분석은 무료 · 심층 분석은 전문 상담사와 연결
        </p>
      </div>
    </section>
  )
}
