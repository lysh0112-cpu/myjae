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
const ELEMENT_COLOR: Record<string,string> = {목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3'}
const ELEMENT_BG: Record<string,string> = {목:'#e8f5e9',화:'#ffebee',토:'#fff3e0',금:'#f5f5f5',수:'#e3f2fd'}
const ELEMENT_HAN: Record<string,string> = {목:'木',화:'火',토:'土',금:'金',수:'水'}
const SIPSIN_COLOR: Record<string,string> = {
  비견:'#9e9e9e',겁재:'#9e9e9e',
  식신:'#4caf50',상관:'#4caf50',
  편재:'#ff9800',정재:'#ff9800',
  편관:'#f44336',정관:'#f44336',
  편인:'#2196f3',정인:'#2196f3',
}

function GanjiSquare({char, el, isSelected, isCurrent}: {char:string; el:string; isSelected?:boolean; isCurrent?:boolean}) {
  const color = GAN_COLOR[char] ?? JI_COLOR[char] ?? (el ? ELEMENT_COLOR[el] : '#888')
  const bg = el ? ELEMENT_BG[el] : '#f5f5f5'
  return (
    <div style={{
      width:'44px', height:'44px', borderRadius:'8px',
      background: isSelected ? 'rgba(255,255,255,0.15)' : bg,
      border: `1px solid ${color}66`,
      display:'flex', alignItems:'center', justifyContent:'center',
      position:'relative' as const,
    }}>
      <span style={{fontSize:'24px', fontWeight:700, color: isSelected ? '#fff' : color, lineHeight:1}}>{char}</span>
      {el && (
        <span style={{
          position:'absolute' as const, bottom:'2px', right:'3px',
          fontSize:'9px', fontWeight:700,
          color: isSelected ? 'rgba(255,255,255,0.5)' : color,
        }}>{ELEMENT_HAN[el]}</span>
      )}
    </div>
  )
}

export default function DayunTableNew({
  solarYear, solarMonth, solarDay, gender, monthGanji, yearStem, dayStem,
  currentYear, birthYear, ilgan, yeonjji, iljji
}: Props) {
  const [dayunList, setDayunList] = useState<DayunItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number|null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const currentAge = currentYear - birthYear

  useEffect(()=>{
    if(!solarYear||!solarMonth||!solarDay||!monthGanji||!yearStem||!dayStem) return
    let alive=true
    setLoading(true)
    fetch('/api/dayun',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({solarYear,solarMonth,solarDay,monthGanji,yearStem,gender,dayStem})})
      .then(r=>r.json()).then(d=>{if(alive)setDayunList(d.dayunList||[])})
      .catch(e=>{console.error(e);if(alive)setDayunList([])})
      .finally(()=>{if(alive)setLoading(false)})
    return()=>{alive=false}
  },[solarYear,solarMonth,solarDay,monthGanji,yearStem,gender,dayStem])

  const reversedList = [...(dayunList||[])].reverse()

  useEffect(()=>{
    if(!scrollRef.current||!reversedList.length) return
    const idx=reversedList.findIndex(d=>d.age<=currentAge&&currentAge<d.age+10)
    if(idx>=0) scrollRef.current.scrollLeft=Math.max(0,idx*60-60)
  },[dayunList,currentAge])

  if(loading) return (
    <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'20px',padding:'20px',textAlign:'center',fontSize:'13px',color:'#bbb'}}>
      대운을 계산하는 중...
    </div>
  )
  if(!dayunList||dayunList.length===0) return null

  const selectedDayun = selected!==null ? reversedList[selected] : null

  return (
    <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'20px',overflow:'hidden',fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",marginBottom:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'14px 18px 12px',borderBottom:'0.5px solid #f5f3ef'}}>
        <span style={{color:'#8B6914',fontSize:'14px'}}>✦</span>
        <span style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>대운</span>
        <span style={{fontSize:'11px',padding:'2px 10px',borderRadius:'10px',background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',fontWeight:600}}>현재 {currentAge}세</span>
        <span style={{fontSize:'10px',color:'#ccc',marginLeft:'auto'}}>← 미래 · 과거 →</span>
      </div>

      <div style={{padding:'12px'}}>
        <div ref={scrollRef} style={{overflowX:'auto',scrollbarWidth:'none' as const}}>
          <table style={{borderCollapse:'collapse',whiteSpace:'nowrap' as const}}>
            <tbody>
              {/* 나이 행 */}
              <tr>
                <td style={{width:'32px',fontSize:'9px',color:'#bbb',paddingRight:'4px',verticalAlign:'middle'}}></td>
                {reversedList.map((d,i)=>{
                  const isCurrent=d.age<=currentAge&&currentAge<d.age+10
                  return (
                    <td key={i} style={{padding:'0 3px',textAlign:'center',verticalAlign:'middle'}}>
                      <div style={{fontSize:'9px',fontWeight:600,color:isCurrent?'#8B6914':'#bbb',marginBottom:'3px',textAlign:'center'}}>
                        {d.age}~{d.age+9}
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* 천간 십성 */}
              <tr>
                <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',verticalAlign:'middle'}}></td>
                {reversedList.map((d,i)=>(
                  <td key={i} style={{padding:'0 3px',textAlign:'center',verticalAlign:'middle'}}>
                    <div style={{fontSize:'10px',fontWeight:700,color:SIPSIN_COLOR[d.ganYukchin]||'#bbb',height:'16px',lineHeight:'16px',textAlign:'center'}}>
                      {d.ganYukchin}
                    </div>
                  </td>
                ))}
              </tr>

              {/* 천간 박스 */}
              <tr>
                <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',verticalAlign:'middle',fontWeight:500}}>천간</td>
                {reversedList.map((d,i)=>{
                  const isCurrent=d.age<=currentAge&&currentAge<d.age+10
                  const isSelected=selected===i
                  const el=STEM_ELEMENT[d.cheongan]
                  return (
                    <td key={i} style={{padding:'2px 3px',textAlign:'center',cursor:'pointer'}}
                      onClick={()=>setSelected(isSelected?null:i)}>
                      <div style={{
                        display:'inline-block',
                        outline: isCurrent&&!isSelected ? '2px solid #8B6914' : 'none',
                        borderRadius:'10px',
                        background: isSelected?'#1a1a1a':'transparent',
                        padding:'1px',
                      }}>
                        <GanjiSquare char={d.cheongan} el={el} isSelected={isSelected} isCurrent={isCurrent}/>
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* 지지 박스 */}
              <tr>
                <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',verticalAlign:'middle',fontWeight:500}}>지지</td>
                {reversedList.map((d,i)=>{
                  const isCurrent=d.age<=currentAge&&currentAge<d.age+10
                  const isSelected=selected===i
                  const el=BRANCH_ELEMENT[d.jiji]
                  return (
                    <td key={i} style={{padding:'2px 3px',textAlign:'center',cursor:'pointer'}}
                      onClick={()=>setSelected(isSelected?null:i)}>
                      <div style={{
                        display:'inline-block',
                        outline: isCurrent&&!isSelected ? '2px solid #8B6914' : 'none',
                        borderRadius:'10px',
                        background: isSelected?'#1a1a1a':'transparent',
                        padding:'1px',
                      }}>
                        <GanjiSquare char={d.jiji} el={el} isSelected={isSelected} isCurrent={isCurrent}/>
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* 지지 십성 */}
              <tr>
                <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',verticalAlign:'middle'}}></td>
                {reversedList.map((d,i)=>(
                  <td key={i} style={{padding:'0 3px',textAlign:'center',verticalAlign:'middle'}}>
                    <div style={{fontSize:'9px',color:SIPSIN_COLOR[d.jiYukchin]||'#bbb',height:'16px',lineHeight:'16px',textAlign:'center'}}>
                      {d.jiYukchin}
                    </div>
                  </td>
                ))}
              </tr>

              {/* 현재 뱃지 */}
              <tr>
                <td></td>
                {reversedList.map((d,i)=>{
                  const isCurrent=d.age<=currentAge&&currentAge<d.age+10
                  return (
                    <td key={i} style={{padding:'2px 3px',textAlign:'center'}}>
                      {isCurrent&&(
                        <div style={{fontSize:'8px',fontWeight:700,background:'#8B6914',color:'#fff',padding:'1px 4px',borderRadius:'5px',display:'inline-block'}}>현재</div>
                      )}
                    </td>
                  )
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 상세 패널 */}
      {selectedDayun&&(
        <div style={{margin:'0 12px 12px',background:'#fafaf8',border:'0.5px solid #e8e5de',borderRadius:'14px',padding:'14px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
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
              {label:'천간 십성',value:selectedDayun.ganYukchin,color:SIPSIN_COLOR[selectedDayun.ganYukchin]||'#1a1a1a'},
              {label:'지지 십성',value:selectedDayun.jiYukchin,color:SIPSIN_COLOR[selectedDayun.jiYukchin]||'#1a1a1a'},
              {label:'12운성',value:getUnsung(ilgan,selectedDayun.jiji),color:unsungColor(getUnsung(ilgan,selectedDayun.jiji))},
              {label:'신살(년지)',value:getSinsal(yeonjji,selectedDayun.jiji)||'-',color:SINSAL_HIGHLIGHT[getSinsal(yeonjji,selectedDayun.jiji)]||'#1a1a1a'},
              {label:'신살(일지)',value:getSinsal(iljji,selectedDayun.jiji)||'-',color:SINSAL_HIGHLIGHT[getSinsal(iljji,selectedDayun.jiji)]||'#1a1a1a'},
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
