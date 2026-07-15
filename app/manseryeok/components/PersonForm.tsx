'use client'
import { useState } from 'react'

const EARTHLY_BRANCHES = [
  { char:"子", name:"자시", time:"23:30~01:30", animal:"🐭" },
  { char:"丑", name:"축시", time:"01:30~03:30", animal:"🐮" },
  { char:"寅", name:"인시", time:"03:30~05:30", animal:"🐯" },
  { char:"卯", name:"묘시", time:"05:30~07:30", animal:"🐰" },
  { char:"辰", name:"진시", time:"07:30~09:30", animal:"🐲" },
  { char:"巳", name:"사시", time:"09:30~11:30", animal:"🐍" },
  { char:"午", name:"오시", time:"11:30~13:30", animal:"🐴" },
  { char:"未", name:"미시", time:"13:30~15:30", animal:"🐑" },
  { char:"申", name:"신시", time:"15:30~17:30", animal:"🐵" },
  { char:"酉", name:"유시", time:"17:30~19:30", animal:"🐓" },
  { char:"戌", name:"술시", time:"19:30~21:30", animal:"🐶" },
  { char:"亥", name:"해시", time:"21:30~23:30", animal:"🐷" },
]

export interface PersonData {
  gender: '남' | '여'
  calType: '양력' | '음력'
  year: string
  month: string
  day: string
  isLeapMonth: boolean
  selectedHour: number | null
  unknownHour: boolean
}

interface Props {
  label: string        // "나" or "상대방"
  color: string        // 구분 색상
  data: PersonData
  onChange: (data: PersonData) => void
}

export default function PersonForm({ label, color, data, onChange }: Props) {
  const { gender, calType, year, month, day, isLeapMonth, selectedHour, unknownHour } = data

  function update(patch: Partial<PersonData>) {
    onChange({ ...data, ...patch })
  }

  const birthReady = !!year && !!month && !!day
  const hourReady = unknownHour || selectedHour !== null

  return (
    <div className="rounded-2xl p-4"
      style={{background:'#2C2C2A', border:`1px solid ${birthReady && hourReady ? color : 'rgba(255,255,255,0.07)'}`}}>

      {/* 라벨 */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold"
          style={{background: color, color:'#fff'}}>
          {label === '나' ? '👤' : '💑'}
        </div>
        <span className="text-sm font-bold text-white">{label}의 정보</span>
        {birthReady && hourReady && (
          <span className="text-xs px-2 py-0.5 rounded-full"
            style={{background:'rgba(76,175,80,0.2)', color:'#4caf50'}}>✓ 입력 완료</span>
        )}
      </div>

      {/* 성별·달력 */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{color:'#8a88a0'}}>성별</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['남','여'] as const).map(v => (
              <button key={v} onClick={() => update({gender: v})}
                className="py-2 rounded-xl text-sm font-bold transition-all"
                style={gender===v
                  ? {background:'#3C3489', color:'#FAC775', border:'1px solid rgba(250,199,117,0.3)'}
                  : {background:'rgba(255,255,255,0.04)', color:'#8a88a0', border:'1px solid rgba(255,255,255,0.08)'}}>
                {v === '남' ? '♂ 남' : '♀ 여'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1">
          <label className="text-xs mb-1 block" style={{color:'#8a88a0'}}>달력</label>
          <div className="grid grid-cols-2 gap-1.5">
            {(['양력','음력'] as const).map(v => (
              <button key={v} onClick={() => update({calType: v, isLeapMonth: false})}
                className="py-2 rounded-xl text-sm font-bold transition-all"
                style={calType===v
                  ? {background:'#3C3489', color:'#FAC775', border:'1px solid rgba(250,199,117,0.3)'}
                  : {background:'rgba(255,255,255,0.04)', color:'#8a88a0', border:'1px solid rgba(255,255,255,0.08)'}}>
                {v === '양력' ? '☀️ 양' : '🌙 음'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 생년월일 */}
      <div className="flex gap-2 mb-3">
        <div className="flex-1">
          <input type="number" placeholder="년도" value={year} min={1900} max={2025}
            onChange={(e) => update({year: e.target.value})}
            className="w-full rounded-xl px-3 py-2.5 text-sm outline-none text-center"
            style={{background:'#1a1a18', border:'1px solid rgba(255,255,255,0.12)',
              color: year ? '#FAC775' : '#8a88a0', colorScheme:'dark'}} />
          <p className="text-center text-[10px] mt-1" style={{color:'#8a88a0'}}>년</p>
        </div>
        <div className="w-16">
          <select value={month} onChange={(e) => update({month: e.target.value})}
            className="w-full rounded-xl px-2 py-2.5 text-sm outline-none appearance-none text-center"
            style={{background:'#1a1a18', border:'1px solid rgba(255,255,255,0.12)',
              color: month ? '#FAC775' : '#8a88a0', colorScheme:'dark'}}>
            <option value="">월</option>
            {Array.from({length:12}, (_,i) => <option key={i+1} value={String(i+1)}>{i+1}</option>)}
          </select>
          <p className="text-center text-[10px] mt-1" style={{color:'#8a88a0'}}>월</p>
        </div>
        <div className="w-16">
          <select value={day} onChange={(e) => update({day: e.target.value})}
            className="w-full rounded-xl px-2 py-2.5 text-sm outline-none appearance-none text-center"
            style={{background:'#1a1a18', border:'1px solid rgba(255,255,255,0.12)',
              color: day ? '#FAC775' : '#8a88a0', colorScheme:'dark'}}>
            <option value="">일</option>
            {Array.from({length:31}, (_,i) => <option key={i+1} value={String(i+1)}>{i+1}</option>)}
          </select>
          <p className="text-center text-[10px] mt-1" style={{color:'#8a88a0'}}>일</p>
        </div>
      </div>

      {/* 윤달 */}
      {calType === '음력' && (
        <button onClick={() => update({isLeapMonth: !isLeapMonth})}
          className="w-full mb-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2"
          style={isLeapMonth
            ? {background:'rgba(250,199,117,0.15)', color:'#FAC775', border:'1px solid rgba(250,199,117,0.3)'}
            : {background:'rgba(255,255,255,0.04)', color:'#8a88a0', border:'1px solid rgba(255,255,255,0.08)'}}>
          {isLeapMonth ? '🌕 ✓ 윤달' : '🌙 윤달이에요'}
        </button>
      )}

      {/* 태어난 시 */}
      <label className="text-xs mb-2 block" style={{color:'#8a88a0'}}>태어난 시</label>
      <button onClick={() => update({unknownHour: !unknownHour, selectedHour: null})}
        className="w-full py-2 rounded-xl text-xs font-medium mb-2 transition-all"
        style={unknownHour
          ? {background:'rgba(250,199,117,0.15)', color:'#FAC775', border:'1px solid rgba(250,199,117,0.3)'}
          : {background:'rgba(255,255,255,0.04)', color:'#8a88a0', border:'1px solid rgba(255,255,255,0.08)'}}>
        {unknownHour ? '✓ 시간 모름' : '시간을 모름'}
      </button>
      <div className={`grid grid-cols-6 gap-1 transition-opacity ${unknownHour ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
        {EARTHLY_BRANCHES.map((b, i) => {
          const isSelected = selectedHour === i
          return (
            <button key={b.char} onClick={() => update({selectedHour: i, unknownHour: false})}
              className="flex flex-col items-center py-2 rounded-xl transition-all"
              style={isSelected
                ? {background:'#3C3489', border:'1px solid rgba(250,199,117,0.5)'}
                : {background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)'}}>
              <span className="text-sm">{b.animal}</span>
              <span className="text-xs font-bold" style={{color: isSelected ? '#FAC775' : '#e0dce8'}}>{b.char}</span>
              <span className="text-[9px]" style={{color: isSelected ? '#FAC775' : '#8a88a0'}}>{b.time}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
