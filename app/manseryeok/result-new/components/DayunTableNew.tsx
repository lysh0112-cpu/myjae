'use client'

import { useState, useEffect, useRef } from 'react'
import { getUnsung, getSinsal, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { GAN_COLOR, JI_COLOR } from '@/lib/saju/constants'
import type { DayunItem } from '@/lib/saju/dayun'

interface Props {
  solarYear: number
  solarMonth: number
  solarDay: number
  gender: string
  monthGanji: string
  yearStem: string
  dayStem: string
  currentYear: number
  birthYear: number
  ilgan: string
  yeonjji: string
  iljji: string
}

const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const BRANCH_ELEMENT: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}

const ELEMENT_COLOR: Record<string,string> = {목:'#2e7d32',화:'#c62828',토:'#795548',금:'#f57f17',수:'#1565c0'}
const ELEMENT_BG: Record<string,string> = {목:'#e8f5e9',화:'#ffebee',토:'#efebe9',금:'#fff8e1',수:'#e3f2fd'}

const SIPSIN_COLOR: Record<string,string> = {
  비견:'#607d8b',겁재:'#607d8b',
  식신:'#2e7d32',상관:'#388e3c',
  편재:'#8B6914',정재:'#a07820',
  편관:'#c62828',정관:'#d32f2f',
  편인:'#1565c0',정인:'#1976d2',
}

export default function DayunTableNew({
  solarYear, solarMonth, solarDay, gender, monthGanji, yearStem, dayStem,
  currentYear, birthYear, ilgan, yeonjji, iljji
}: Props) {
  const [dayunList, setDayunList] = useState<DayunItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentAge = currentYear - birthYear

  useEffect(() => {
    if (!solarYear||!solarMonth||!solarDay||!monthGanji||!yearStem||!dayStem) return
    let alive = true
    setLoading(true)
    fetch('/api/dayun', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({solarYear,solarMonth,solarDay,monthGanji,yearStem,gender,dayStem}),
    })
      .then(r=>r.json())
      .then(d=>{if(alive)setDayunList(d.dayunList||[])})
      .catch(e=>{console.error(e);if(alive)setDayunList([])})
      .finally(()=>{if(alive)setLoading(false)})
    return ()=>{alive=false}
  },[solarYear,solarMonth,solarDay,monthGanji,yearStem,gender,dayStem])

  const reversedList = [...(dayunList||[])].reverse()

  useEffect(()=>{
    if(!scrollRef.current||!reversedList.length) return
    const idx = reversedList.findIndex(d=>d.age<=currentAge&&currentAge<d.age+10)
    if(idx>=0) scrollRef.current.scrollLeft = Math.max(0, idx*80-80)
  },[dayunList,currentAge])

  if(loading) return (
    <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'20px',padding:'20px',textAlign:'center',fontSize:'13px',color:'#bbb'}}>
      대운을 계산하는 중...
    </div>
  )
  if(!dayunList||dayunList.length===0) return null

  const selectedDayun = selected!==null ? reversedList[selected] : null

  return (
    <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'20px',overflow:'hidden',fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>

      {/* 헤더 */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'14px 18px 12px',borderBottom:'0.5px solid #f5f3ef'}}>
        <span style={{color:'#8B6914',fontSize:'14px'}}>✦</span>
        <span style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>대운</span>
        <span style={{fontSize:'11px',padding:'2px 10px',borderRadius:'10px',background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',fontWeight:600}}>
          현재 {currentAge}세
        </span>
        <span style={{fontSize:'11px',color:'#ccc',marginLeft:'auto'}}>← 미래 · 과거 →</span>
      </div>

      {/* 가로 슬라이드 */}
      <div style={{padding:'14px 12px 10px'}}>
        <div ref={scrollRef} style={{display:'flex',gap:'6px',overflowX:'auto',paddingBottom:'4px',scrollbarWidth:'none' as const}}>
          {reversedList.map((dayun,i)=>{
            const isCurrent = dayun.age<=currentAge&&currentAge<dayun.age+10
            const isSelected = selected===i
            const ganEl = STEM_ELEMENT[dayun.cheongan]
            const jiEl = BRANCH_ELEMENT[dayun.jiji]
            const ganColor = GAN_COLOR[dayun.cheongan] ?? (ganEl?ELEMENT_COLOR[ganEl]:'#888')
            const jiColor = JI_COLOR[dayun.jiji] ?? (jiEl?ELEMENT_COLOR[jiEl]:'#888')
            const ganBg = ganEl?ELEMENT_BG[ganEl]:'#f5f5f5'
            const jiBg = jiEl?ELEMENT_BG[jiEl]:'#f5f5f5'

            return (
              <button key={i} onClick={()=>setSelected(isSelected?null:i)} style={{
                flexShrink:0, minWidth:'72px',
                display:'flex', flexDirection:'column', alignItems:'center',
                padding:'10px 6px',
                borderRadius:'14px',
                background: isSelected?'#1a1a1a' : isCurrent?'#fffbee':'#fafaf8',
                border: isSelected?'1.5px solid #1a1a1a' : isCurrent?'1.5px solid #e8d5a0':'0.5px solid #eeebe4',
                cursor:'pointer',
              }}>
                {/* 나이 */}
                <div style={{fontSize:'9px',fontWeight:600,marginBottom:'6px',color:isSelected?'#d4b87a':isCurrent?'#8B6914':'#bbb'}}>
                  {dayun.age}~{dayun.age+9}
                </div>

                {/* 천간 */}
                <div style={{
                  width:'44px',height:'44px',borderRadius:'10px',
                  background:isSelected?'rgba(255,255,255,0.1)':ganBg,
                  border:`0.5px solid ${isSelected?'rgba(255,255,255,0.2)':ganColor+'44'}`,
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                  marginBottom:'4px',
                }}>
                  <span style={{fontSize:'22px',fontWeight:700,color:isSelected?'#fff':ganColor,lineHeight:1}}>{dayun.cheongan}</span>
                  <span style={{fontSize:'8px',color:isSelected?'rgba(255,255,255,0.6)':ganColor,marginTop:'2px'}}>{ganEl}</span>
                </div>

                {/* 지지 */}
                <div style={{
                  width:'44px',height:'44px',borderRadius:'10px',
                  background:isSelected?'rgba(255,255,255,0.1)':jiBg,
                  border:`0.5px solid ${isSelected?'rgba(255,255,255,0.2)':jiColor+'44'}`,
                  display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                  marginBottom:'6px',
                }}>
                  <span style={{fontSize:'22px',fontWeight:700,color:isSelected?'#d4b87a':jiColor,lineHeight:1}}>{dayun.jiji}</span>
                  <span style={{fontSize:'8px',color:isSelected?'rgba(212,184,122,0.7)':jiColor,marginTop:'2px'}}>{jiEl}</span>
                </div>

                {/* 십성 */}
                <div style={{fontSize:'9px',color:isSelected?'rgba(255,255,255,0.6)':(SIPSIN_COLOR[dayun.ganYukchin]||'#bbb'),fontWeight:600,lineHeight:1.4,textAlign:'center'}}>
                  {dayun.ganYukchin}
                </div>
                <div style={{fontSize:'9px',color:isSelected?'rgba(255,255,255,0.5)':(SIPSIN_COLOR[dayun.jiYukchin]||'#bbb'),lineHeight:1.4,textAlign:'center'}}>
                  {dayun.jiYukchin}
                </div>

                {/* 현재 뱃지 */}
                {isCurrent&&!isSelected&&(
                  <div style={{marginTop:'5px',fontSize:'8px',fontWeight:700,background:'#8B6914',color:'#fff',padding:'1px 7px',borderRadius:'6px'}}>현재</div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* 상세 패널 */}
      {selectedDayun&&(
        <div style={{margin:'0 12px 12px',background:'#fafaf8',border:'0.5px solid #e8e5de',borderRadius:'14px',padding:'14px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',flexWrap:'wrap' as const}}>
              <span style={{fontSize:'24px',fontWeight:700,color:'#1a1a1a'}}>{selectedDayun.cheongan}{selectedDayun.jiji}</span>
              <span style={{fontSize:'12px',fontWeight:700,background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',padding:'3px 10px',borderRadius:'10px'}}>
                {selectedDayun.age}~{selectedDayun.age+9}세
              </span>
              <span style={{fontSize:'11px',color:'#bbb'}}>{birthYear+selectedDayun.age}~{birthYear+selectedDayun.age+9}년</span>
            </div>
            <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'#bbb',fontSize:'18px',cursor:'pointer'}}>✕</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {[
              {label:'천간 십성', value:selectedDayun.ganYukchin, color:SIPSIN_COLOR[selectedDayun.ganYukchin]||'#1a1a1a'},
              {label:'지지 십성', value:selectedDayun.jiYukchin, color:SIPSIN_COLOR[selectedDayun.jiYukchin]||'#1a1a1a'},
              {label:'12운성', value:getUnsung(ilgan,selectedDayun.jiji), color:unsungColor(getUnsung(ilgan,selectedDayun.jiji))},
              {label:'신살(년지)', value:getSinsal(yeonjji,selectedDayun.jiji)||'-', color:SINSAL_HIGHLIGHT[getSinsal(yeonjji,selectedDayun.jiji)]||'#1a1a1a'},
              {label:'신살(일지)', value:getSinsal(iljji,selectedDayun.jiji)||'-', color:SINSAL_HIGHLIGHT[getSinsal(iljji,selectedDayun.jiji)]||'#1a1a1a'},
            ].map((item,idx)=>(
              <div key={idx} style={{background:'#fff',border:'0.5px solid #eeebe4',borderRadius:'10px',padding:'10px 12px',gridColumn:idx===4?'1/-1':'auto'}}>
                <div style={{fontSize:'10px',color:'#bbb',marginBottom:'4px'}}>{item.label}</div>
                <div style={{fontSize:'14px',fontWeight:700,color:item.color}}>{item.value||'-'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
