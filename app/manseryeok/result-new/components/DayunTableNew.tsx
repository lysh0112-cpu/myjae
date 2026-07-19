'use client'

import { useState, useEffect, useRef } from 'react'
import { EL_BG, EL_BD, EL_C, EL_C_SUB, EL_HAN } from '@/lib/saju/ohaengColor'
import { getUnsung, getSinsal, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
import type { DayunItem } from '@/lib/saju/dayun'
import { SAJU_TERMS } from '../sajuTerms'
import TermModal from '../TermModal'

interface Props {
  solarYear: number; solarMonth: number; solarDay: number
  gender: string; monthGanji: string; yearStem: string; dayStem: string
  currentYear: number; birthYear: number
  ilgan: string; yeonjji: string; iljji: string
}

const SE: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const BE: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}
const HAN: Record<string,string> = {목:'木',화:'火',토:'土',금:'金',수:'水'}
const SS_C: Record<string,string> = {
  비견:'#9e9e9e',겁재:'#9e9e9e',식신:'#43a047',상관:'#43a047',
  편재:'#fb8c00',정재:'#fb8c00',편관:'#e53935',정관:'#e53935',편인:'#1e88e5',정인:'#1e88e5'
}

function GJ({char,el,cur,sz=44}:{char:string;el:string;cur?:boolean;sz?:number}) {
  const bg=EL_BG[el]||'#f5f5f5', bd=EL_BD[el]||'#ddd', c=EL_C[el]||'#888', cs=EL_C_SUB[el]||'#888'
  const box = (
    <div style={{width:sz,height:sz,borderRadius:8,background:bg,border:`1px solid ${bd}`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      position:'relative' as const,margin:'1px auto'}}>
      <span style={{fontSize:sz*0.5,fontWeight:700,color:c,lineHeight:1}}>{char}</span>
      {el&&<span style={{position:'absolute' as const,bottom:1,right:4,fontSize:10.5,fontWeight:600,color:cs}}>{HAN[el]}</span>}
    </div>
  )
  if(cur) return <div style={{outline:'2px solid #555',borderRadius:10,display:'inline-block',padding:1}}>{box}</div>
  return box
}

export default function DayunTableNew({solarYear,solarMonth,solarDay,gender,monthGanji,yearStem,dayStem,currentYear,birthYear,ilgan,yeonjji,iljji}:Props) {
  const [list,setList]=useState<DayunItem[]>([])
  const [loading,setLoading]=useState(true)
  const [sel,setSel]=useState<number|null>(null)
  const [term,setTerm]=useState<string|null>(null)
  const ref=useRef<HTMLDivElement>(null)
  const age=currentYear-birthYear

  useEffect(()=>{
    if(!solarYear||!monthGanji||!yearStem||!dayStem)return
    let ok=true; setLoading(true)
    fetch('/api/dayun',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({solarYear,solarMonth,solarDay,monthGanji,yearStem,gender,dayStem})})
      .then(r=>r.json()).then(d=>{if(ok)setList(d.dayunList||[])})
      .catch(()=>{if(ok)setList([])})
      .finally(()=>{if(ok)setLoading(false)})
    return()=>{ok=false}
  },[solarYear,solarMonth,solarDay,monthGanji,yearStem,gender,dayStem])

  const rev=[...(list||[])].reverse()
  useEffect(()=>{
    if(!ref.current||!rev.length)return
    const i=rev.findIndex(d=>d.age<=age&&age<d.age+10)
    if(i>=0)ref.current.scrollLeft=Math.max(0,i*52-52)
  },[list,age])

  if(loading)return <div style={{padding:16,textAlign:'center',fontSize:13,color:'#bbb'}}>대운 계산 중...</div>
  if(!list.length)return null

  const selD=sel!==null?rev[sel]:null

  const tbl=(rows:DayunItem[],keyFn:(d:DayunItem)=>string,isCur:(d:DayunItem)=>boolean,topLabel:(d:DayunItem)=>string,botLabel:(d:DayunItem)=>string)=>(
    <div style={{overflowX:'auto',scrollbarWidth:'none' as const}} ref={ref}>
      <table style={{borderCollapse:'separate',borderSpacing:0,whiteSpace:'nowrap' as const}}>
        <tbody>
          {/* 나이/연도 + 십성 상단 */}
          <tr>{<td style={{width:22}}/>}{rows.map((d,i)=>{
            const c=isCur(d)
            return <td key={i} style={{padding:'2px 2px 0',textAlign:'center',cursor:'pointer',
              borderLeft:c?'2px solid #555':'2px solid transparent',borderRight:c?'2px solid #555':'2px solid transparent',
              borderTop:c?'2px solid #555':'2px solid transparent',
              borderTopLeftRadius:c?10:0,borderTopRightRadius:c?10:0}} onClick={()=>setSel(sel===i?null:i)}>
              <div style={{fontSize:9,color:c?'#c8783c':'#aaa',lineHeight:1.3}}>{keyFn(d)}</div>
              <div style={{fontSize:10,fontWeight:600,color:SS_C[d.ganYukchin]||'#aaa',height:14,lineHeight:'14px'}}>{d.ganYukchin}</div>
            </td>
          })}</tr>
          {/* 천간 */}
          <tr>
            <td style={{fontSize:9,color:'#bbb',textAlign:'right',paddingRight:3}}>천간</td>
            {rows.map((d,i)=>{
              const el=SE[d.cheongan], c=isCur(d)
              return <td key={i} style={{padding:'1px 2px',cursor:'pointer',
                borderLeft:c?'2px solid #555':'2px solid transparent',borderRight:c?'2px solid #555':'2px solid transparent'}} onClick={()=>setSel(sel===i?null:i)}>
                <GJ char={d.cheongan} el={el}/>
              </td>
            })}
          </tr>
          {/* 지지 */}
          <tr>
            <td style={{fontSize:9,color:'#bbb',textAlign:'right',paddingRight:3}}>지지</td>
            {rows.map((d,i)=>{
              const el=BE[d.jiji], c=isCur(d)
              return <td key={i} style={{padding:'1px 2px',cursor:'pointer',
                borderLeft:c?'2px solid #555':'2px solid transparent',borderRight:c?'2px solid #555':'2px solid transparent'}} onClick={()=>setSel(sel===i?null:i)}>
                <GJ char={d.jiji} el={el}/>
              </td>
            })}
          </tr>
          {/* 십성 하단 + 12운성 */}
          <tr>{<td/>}{rows.map((d,i)=>{
            const c=isCur(d)
            return <td key={i} style={{padding:'0 2px 2px',textAlign:'center',fontSize:9,color:SS_C[d.jiYukchin]||'#aaa',lineHeight:1.4,
              borderLeft:c?'2px solid #555':'2px solid transparent',borderRight:c?'2px solid #555':'2px solid transparent',
              borderBottom:c?'2px solid #555':'2px solid transparent',
              borderBottomLeftRadius:c?10:0,borderBottomRightRadius:c?10:0}}>
              {d.jiYukchin}<br/>{dayStem?getUnsung(dayStem,d.jiji):''}
            </td>
          })}</tr>
        </tbody>
      </table>
    </div>
  )

  return (
    <div style={{background:'#fff',border:'0.5px solid #f0e0d5',borderRadius:16,overflow:'hidden',marginBottom:10,fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>
      {/* 헤더 */}
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'12px 16px 10px',borderBottom:'0.5px solid #f7ede4'}}>
        <span style={{color:'#c8783c',fontSize:13}}>✦</span>
        <span style={{fontSize:13,fontWeight:700,color:'#1a1a1a'}}>대운</span>
        <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'#fff3e9',border:'0.5px solid #e8d5c5',color:'#c8783c',fontWeight:600}}>현재 {age}세</span>
        <span style={{fontSize:10,color:'#ccc',marginLeft:'auto'}}>← 미래 · 과거 →</span>
      </div>

      <div style={{padding:'10px 12px'}}>
        {tbl(rev, d=>`${d.age}~${d.age+9}`, d=>d.age<=age&&age<d.age+10, d=>d.ganYukchin, d=>d.jiYukchin)}
      </div>

      {/* 상세 모달 */}
      {selD&&(
        <div onClick={()=>setSel(null)} style={{position:'fixed' as const,inset:0,background:'rgba(0,0,0,0.4)',display:'flex',alignItems:'center',justifyContent:'center',padding:20,zIndex:900}}>
          <div onClick={e=>e.stopPropagation()} style={{maxWidth:240,width:'100%',background:'#fff',borderRadius:16,padding:'16px 14px',position:'relative' as const}}>
            <button onClick={()=>setSel(null)} style={{position:'absolute' as const,top:13,right:13,background:'none',border:'none',fontSize:15,color:'#bbb',cursor:'pointer'}}>✕</button>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:3,flexWrap:'wrap' as const}}>
              <span style={{fontSize:20,fontWeight:700,color:'#1a1a1a'}}>{selD.cheongan}{selD.jiji}</span>
              <span style={{fontSize:10,fontWeight:600,color:'#c8783c',background:'#fff3e9',border:'0.5px solid #e8d5c5',borderRadius:7,padding:'2px 6px'}}>{selD.age}~{selD.age+9}세</span>
            </div>
            <div style={{fontSize:10,color:'#aaa',marginBottom:2}}>{birthYear+selD.age}~{birthYear+selD.age+9}년</div>
            <div style={{fontSize:10.5,color:'#c8a86a',marginBottom:12}}>👆 눌러서 뜻풀이 보기</div>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {[
                {label:'천간',val:selD.ganYukchin,c:SS_C[selD.ganYukchin]||'#222'},
                {label:'지지',val:selD.jiYukchin,c:SS_C[selD.jiYukchin]||'#222'},
                {label:'12운성',val:getUnsung(ilgan,selD.jiji),c:unsungColor(getUnsung(ilgan,selD.jiji))},
                {label:'신살·년지',val:getSinsal(yeonjji,selD.jiji)||'-',c:SINSAL_HIGHLIGHT[getSinsal(yeonjji,selD.jiji)]||'#222'},
                {label:'신살·일지',val:getSinsal(iljji,selD.jiji)||'-',c:SINSAL_HIGHLIGHT[getSinsal(iljji,selD.jiji)]||'#222'},
              ].map((item,i)=>(
                <div key={i} onClick={()=>SAJU_TERMS[item.val]&&setTerm(item.val)}
                  style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#faf3ee',border:'0.5px solid #f0e0d5',borderRadius:9,padding:'8px 11px',cursor:SAJU_TERMS[item.val]?'pointer':'default'}}>
                  <span style={{fontSize:10.5,color:'#999'}}>{item.label}</span>
                  <span style={{fontSize:14,fontWeight:700,color:item.c}}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 용어 설명 모달 (공용 부품) */}
      <TermModal term={term} onClose={()=>setTerm(null)}/>
    </div>
  )
}
