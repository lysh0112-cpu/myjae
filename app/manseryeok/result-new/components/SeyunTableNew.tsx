'use client'

import { useState } from 'react'
import { getUnsung, getSinsal, unsungColor, SINSAL_HIGHLIGHT } from '@/lib/saju'
import { GAN_COLOR, JI_COLOR } from '@/lib/saju/constants'
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
const ELEMENT_COLOR: Record<string,string> = {목:'#2e7d32',화:'#c62828',토:'#795548',금:'#f57f17',수:'#1565c0'}
const ELEMENT_BG: Record<string,string> = {목:'#e8f5e9',화:'#ffebee',토:'#efebe9',금:'#fff8e1',수:'#e3f2fd'}
const SIPSIN_COLOR: Record<string,string> = {
  비견:'#607d8b',겁재:'#607d8b',
  식신:'#2e7d32',상관:'#388e3c',
  편재:'#8B6914',정재:'#a07820',
  편관:'#c62828',정관:'#d32f2f',
  편인:'#1565c0',정인:'#1976d2',
}

export default function SeyunTableNew({dayStem,currentYear,ilgan,yeonjji,iljji}: Props) {
  const seyunList = calcSeyunList(dayStem,currentYear)
  const [selected, setSelected] = useState<number|null>(null)

  if(!seyunList||seyunList.length===0) return null

  const currentIdx = seyunList.findIndex(s=>s.year===CURRENT_YEAR)
  const startIdx = Math.max(0,currentIdx-2)
  const displayList = [...seyunList.slice(startIdx,startIdx+10)].reverse()
  const selectedSeyun = selected!==null ? displayList[selected] : null

  return (
    <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'20px',overflow:'hidden',fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif"}}>

      {/* 헤더 */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'14px 18px 12px',borderBottom:'0.5px solid #f5f3ef'}}>
        <span style={{color:'#8B6914',fontSize:'14px'}}>✦</span>
        <span style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>세운</span>
        <span style={{fontSize:'11px',padding:'2px 10px',borderRadius:'10px',background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',fontWeight:600}}>{CURRENT_YEAR}년</span>
        <span style={{fontSize:'11px',color:'#ccc',marginLeft:'auto'}}>← 미래 · 과거 →</span>
      </div>

      {/* 5열 그리드 */}
      <div style={{padding:'14px 12px 10px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px'}}>
        {displayList.map((seyun,i)=>{
          const isCurrent=seyun.year===CURRENT_YEAR
          const isSelected=selected===i
          const ganEl=STEM_ELEMENT[seyun.cheongan]
          const jiEl=BRANCH_ELEMENT[seyun.jiji]
          const ganColor=GAN_COLOR[seyun.cheongan]??(ganEl?ELEMENT_COLOR[ganEl]:'#888')
          const jiColor=JI_COLOR[seyun.jiji]??(jiEl?ELEMENT_COLOR[jiEl]:'#888')
          const ganBg=ganEl?ELEMENT_BG[ganEl]:'#f5f5f5'
          const jiBg=jiEl?ELEMENT_BG[jiEl]:'#f5f5f5'

          return (
            <button key={i} onClick={()=>setSelected(isSelected?null:i)} style={{
              display:'flex',flexDirection:'column',alignItems:'center',
              padding:'8px 4px',borderRadius:'12px',
              background:isSelected?'#1a1a1a':isCurrent?'#fffbee':'#fafaf8',
              border:isSelected?'1.5px solid #1a1a1a':isCurrent?'1.5px solid #e8d5a0':'0.5px solid #eeebe4',
              cursor:'pointer',
            }}>
              {/* 연도 */}
              <div style={{fontSize:'9px',fontWeight:600,marginBottom:'5px',color:isSelected?'#d4b87a':isCurrent?'#8B6914':'#bbb'}}>{seyun.year}</div>

              {/* 천간 */}
              <div style={{
                width:'36px',height:'36px',borderRadius:'8px',
                background:isSelected?'rgba(255,255,255,0.1)':ganBg,
                border:`0.5px solid ${isSelected?'rgba(255,255,255,0.2)':ganColor+'44'}`,
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                marginBottom:'3px',
              }}>
                <span style={{fontSize:'18px',fontWeight:700,color:isSelected?'#fff':ganColor,lineHeight:1}}>{seyun.cheongan}</span>
                <span style={{fontSize:'7px',color:isSelected?'rgba(255,255,255,0.5)':ganColor}}>{ganEl}</span>
              </div>

              {/* 지지 */}
              <div style={{
                width:'36px',height:'36px',borderRadius:'8px',
                background:isSelected?'rgba(255,255,255,0.1)':jiBg,
                border:`0.5px solid ${isSelected?'rgba(255,255,255,0.2)':jiColor+'44'}`,
                display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
                marginBottom:'4px',
              }}>
                <span style={{fontSize:'18px',fontWeight:700,color:isSelected?'#d4b87a':jiColor,lineHeight:1}}>{seyun.jiji}</span>
                <span style={{fontSize:'7px',color:isSelected?'rgba(212,184,122,0.6)':jiColor}}>{jiEl}</span>
              </div>

              {/* 십성 */}
              <div style={{fontSize:'8px',color:isSelected?'rgba(255,255,255,0.6)':(SIPSIN_COLOR[seyun.ganYukchin]||'#bbb'),fontWeight:600,textAlign:'center'}}>{seyun.ganYukchin}</div>

              {/* 현재 뱃지 */}
              {isCurrent&&!isSelected&&(
                <div style={{marginTop:'4px',fontSize:'8px',fontWeight:700,background:'#8B6914',color:'#fff',padding:'1px 5px',borderRadius:'5px'}}>올해</div>
              )}
            </button>
          )
        })}
      </div>

      {/* 상세 패널 */}
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
