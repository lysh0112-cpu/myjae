'use client'

import { useState } from 'react'
import { EL_BG as ELEMENT_BG, EL_TEXT as ELEMENT_COLOR, EL_HAN as ELEMENT_HAN, EL_C, EL_C_SUB } from '@/lib/saju/ohaengColor'
import { getUnsung, getSinsal, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { calcSeyunList } from '@/lib/saju/dayun'

interface Props {
  dayStem: string
  currentYear: number
  ilgan: string
  yeonjji: string
  iljji: string
}

const CURRENT_YEAR = new Date().getFullYear()
const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const BRANCH_ELEMENT: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}
const SIPSIN_COLOR: Record<string,string> = {
  비견:'#9e9e9e',겁재:'#9e9e9e',
  식신:'#4caf50',상관:'#4caf50',
  편재:'#ff9800',정재:'#ff9800',
  편관:'#f44336',정관:'#f44336',
  편인:'#2196f3',정인:'#2196f3',
}

function GanjiSquare({char,el,isCurrent,isSelected}:{char:string;el:string;isCurrent?:boolean;isSelected?:boolean}) {
  // 배경이 진한 오행색이라 글씨는 EL_C(흰색, 금만 검정)
  const color = el?EL_C[el]:'#888'
  const sub = el?EL_C_SUB[el]:'#888'
  const bd = el?ELEMENT_COLOR[el]:'#ddd'
  const bg = el?ELEMENT_BG[el]:'#f5f5f5'
  return (
    <div style={{
      width:'40px',height:'40px',borderRadius:'8px',
      background:isSelected?'rgba(255,255,255,0.15)':bg,
      border:`1px solid ${bd}`,
      display:'flex',alignItems:'center',justifyContent:'center',
      position:'relative' as const,
    }}>
      <span style={{fontSize:'22px',fontWeight:700,color:isSelected?'#fff':color,lineHeight:1}}>{char}</span>
      {el&&<span style={{position:'absolute' as const,bottom:'1px',right:'3px',fontSize:'10px',fontWeight:600,color:isSelected?'rgba(255,255,255,0.6)':sub}}>{ELEMENT_HAN[el]}</span>}
    </div>
  )
}

export default function SeyunTableNew({dayStem,currentYear,ilgan,yeonjji,iljji}:Props) {
  const seyunList = calcSeyunList(dayStem,currentYear)
  const [selected, setSelected] = useState<number|null>(null)

  if(!seyunList||seyunList.length===0) return null

  const currentIdx = seyunList.findIndex(s=>s.year===CURRENT_YEAR)
  const startIdx = Math.max(0,currentIdx-2)
  const displayList = [...seyunList.slice(startIdx,startIdx+10)].reverse()
  const selectedSeyun = selected!==null ? displayList[selected] : null

  return (
    <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'20px',overflow:'hidden',fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",marginBottom:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'14px 18px 12px',borderBottom:'0.5px solid #f5f3ef'}}>
        <span style={{color:'#8B6914',fontSize:'14px'}}>✦</span>
        <span style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>세운 (연운)</span>
        <span style={{fontSize:'11px',padding:'2px 10px',borderRadius:'10px',background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',fontWeight:600}}>{CURRENT_YEAR}년</span>
        <span style={{fontSize:'10px',color:'#ccc',marginLeft:'auto'}}>← 미래 · 과거 →</span>
      </div>

      <div style={{padding:'12px'}}>
        <div style={{overflowX:'auto',scrollbarWidth:'none' as const}}>
          <table style={{borderCollapse:'collapse',whiteSpace:'nowrap' as const}}>
            <tbody>
              {/* 연도 + 십성 */}
              <tr>
                <td style={{width:'32px'}}></td>
                {displayList.map((s,i)=>{
                  const isCurrent=s.year===CURRENT_YEAR
                  return (
                    <td key={i} style={{padding:'0 3px',textAlign:'center',cursor:'pointer'}} onClick={()=>setSelected(selected===i?null:i)}>
                      <div style={{fontSize:'9px',color:isCurrent?'#8B6914':'#bbb',fontWeight:600,marginBottom:'1px'}}>{s.year}</div>
                      <div style={{fontSize:'10px',fontWeight:700,color:SIPSIN_COLOR[s.ganYukchin]||'#bbb',height:'14px'}}>{s.ganYukchin}</div>
                    </td>
                  )
                })}
              </tr>

              {/* 천간 */}
              <tr>
                <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',verticalAlign:'middle',fontWeight:500}}>천간</td>
                {displayList.map((s,i)=>{
                  const isCurrent=s.year===CURRENT_YEAR
                  const isSelected=selected===i
                  const el=STEM_ELEMENT[s.cheongan]
                  return (
                    <td key={i} style={{padding:'2px 3px',textAlign:'center',cursor:'pointer'}} onClick={()=>setSelected(isSelected?null:i)}>
                      <div style={{display:'inline-block',outline:isCurrent&&!isSelected?'2px solid #8B6914':'none',borderRadius:'10px',background:isSelected?'#1a1a1a':'transparent',padding:'1px'}}>
                        <GanjiSquare char={s.cheongan} el={el} isCurrent={isCurrent} isSelected={isSelected}/>
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* 지지 */}
              <tr>
                <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',verticalAlign:'middle',fontWeight:500}}>지지</td>
                {displayList.map((s,i)=>{
                  const isCurrent=s.year===CURRENT_YEAR
                  const isSelected=selected===i
                  const el=BRANCH_ELEMENT[s.jiji]
                  return (
                    <td key={i} style={{padding:'2px 3px',textAlign:'center',cursor:'pointer'}} onClick={()=>setSelected(isSelected?null:i)}>
                      <div style={{display:'inline-block',outline:isCurrent&&!isSelected?'2px solid #8B6914':'none',borderRadius:'10px',background:isSelected?'#1a1a1a':'transparent',padding:'1px'}}>
                        <GanjiSquare char={s.jiji} el={el} isCurrent={isCurrent} isSelected={isSelected}/>
                      </div>
                    </td>
                  )
                })}
              </tr>

              {/* 지지 십성 */}
              <tr>
                <td></td>
                {displayList.map((s,i)=>(
                  <td key={i} style={{padding:'0 3px',textAlign:'center'}}>
                    <div style={{fontSize:'9px',color:SIPSIN_COLOR[s.jiYukchin]||'#bbb',height:'14px',lineHeight:'14px',textAlign:'center'}}>{s.jiYukchin}</div>
                    {s.year===CURRENT_YEAR&&<div style={{fontSize:'8px',fontWeight:700,background:'#8B6914',color:'#fff',padding:'1px 4px',borderRadius:'5px',display:'inline-block',marginTop:'2px'}}>올해</div>}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {selectedSeyun&&(
        <div style={{margin:'0 12px 12px',background:'#fafaf8',border:'0.5px solid #e8e5de',borderRadius:'14px',padding:'14px'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span style={{fontSize:'24px',fontWeight:700,color:'#1a1a1a'}}>{selectedSeyun.cheongan}{selectedSeyun.jiji}</span>
              <span style={{fontSize:'12px',fontWeight:700,background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',padding:'3px 10px',borderRadius:'10px'}}>{selectedSeyun.year}년</span>
            </div>
            <button onClick={()=>setSelected(null)} style={{background:'none',border:'none',color:'#bbb',fontSize:'18px',cursor:'pointer'}}>✕</button>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {[
              {label:'천간 십성',value:selectedSeyun.ganYukchin,color:SIPSIN_COLOR[selectedSeyun.ganYukchin]||'#1a1a1a'},
              {label:'12운성',value:getUnsung(ilgan,selectedSeyun.jiji),color:unsungColor(getUnsung(ilgan,selectedSeyun.jiji))},
              {label:'신살(년지)',value:getSinsal(yeonjji,selectedSeyun.jiji)||'-',color:SINSAL_HIGHLIGHT[getSinsal(yeonjji,selectedSeyun.jiji)]||'#1a1a1a'},
              {label:'신살(일지)',value:getSinsal(iljji,selectedSeyun.jiji)||'-',color:SINSAL_HIGHLIGHT[getSinsal(iljji,selectedSeyun.jiji)]||'#1a1a1a'},
            ].map((item,idx)=>(
              <div key={idx} style={{background:'#fff',border:'0.5px solid #eeebe4',borderRadius:'10px',padding:'10px 12px'}}>
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
