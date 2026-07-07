"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useResultSaju } from "@/hooks/useResultSaju";
import { getUnsung, getSinsal, unsungColor, getGongmang, SINSAL_HIGHLIGHT } from "@/lib/saju";
import { GAN_COLOR, JI_COLOR } from "@/lib/saju/constants";
import { calcSeyunList, calcWolunList } from "@/lib/saju/dayun";
import DayunTableNew from "./components/DayunTableNew";
import AiAnalysisNew from "./components/AiAnalysisNew";
import ConsultButton from "@/app/components/common/ConsultButton";
import OhaengPentagon from "./OhaengPentagon";
import SipsungTable from "./SipsungTable";

const BRANCH_LIST = [{char:"子"},{char:"丑"},{char:"寅"},{char:"卯"},{char:"辰"},{char:"巳"},{char:"午"},{char:"未"},{char:"申"},{char:"酉"},{char:"戌"},{char:"亥"}]
const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const BRANCH_ELEMENT: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}
const BRANCH_YIN: Record<string,boolean> = {子:true,丑:true,寅:false,卯:true,辰:false,巳:true,午:false,未:true,申:false,酉:true,戌:false,亥:true}
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

function getSipsin(dayStem:string,targetStem:string):string{
  if(!targetStem||targetStem==='?')return''
  const dayIdx=HEAVENLY_STEMS.indexOf(dayStem),targetIdx=HEAVENLY_STEMS.indexOf(targetStem)
  const de=STEM_ELEMENT[dayStem],te=STEM_ELEMENT[targetStem]
  const sameYin=(dayIdx%2)===(targetIdx%2)
  const gen:Record<string,string>={목:'화',화:'토',토:'금',금:'수',수:'목'}
  const ctl:Record<string,string>={목:'토',화:'금',토:'수',금:'목',수:'화'}
  if(de===te)return sameYin?'비견':'겁재'
  if(gen[de]===te)return sameYin?'식신':'상관'
  if(ctl[de]===te)return sameYin?'편재':'정재'
  if(ctl[te]===de)return sameYin?'편관':'정관'
  if(gen[te]===de)return sameYin?'편인':'정인'
  return''
}
function getSipsinBranch(dayStem:string,branch:string):string{
  if(!branch||branch==='?')return''
  const be=BRANCH_ELEMENT[branch],de=STEM_ELEMENT[dayStem]
  const dayYin=HEAVENLY_STEMS.indexOf(dayStem)%2===1
  const sameYin=dayYin===BRANCH_YIN[branch]
  const gen:Record<string,string>={목:'화',화:'토',토:'금',금:'수',수:'목'}
  const ctl:Record<string,string>={목:'토',화:'금',토:'수',금:'목',수:'화'}
  if(de===be)return sameYin?'비견':'겁재'
  if(gen[de]===be)return sameYin?'식신':'상관'
  if(ctl[de]===be)return sameYin?'편재':'정재'
  if(ctl[be]===de)return sameYin?'편관':'정관'
  if(gen[be]===de)return sameYin?'편인':'정인'
  return''
}

function calcOhaeng(saju:{stem:string;branch:string}[]) {
  const cnt:Record<string,number>={목:0,화:0,토:0,금:0,수:0}
  saju.forEach(({stem,branch})=>{
    if(STEM_ELEMENT[stem])cnt[STEM_ELEMENT[stem]]+=1
    if(BRANCH_ELEMENT[branch])cnt[BRANCH_ELEMENT[branch]]+=1
  })
  const total=Object.values(cnt).reduce((a,b)=>a+b,0)
  return Object.entries(cnt).map(([el,n])=>({el,pct:total?Math.round(n/total*1000)/10:0}))
}

function calcSipsung(saju:{stem:string;branch:string}[],dayStem:string) {
  const cnt:Record<string,number>={}
  saju.forEach(({stem,branch},i)=>{
    const isDay=i===1
    if(!isDay){const ss=getSipsin(dayStem,stem);if(ss)cnt[ss]=(cnt[ss]||0)+1}
    const bs=getSipsinBranch(dayStem,branch);if(bs)cnt[bs]=(cnt[bs]||0)+1
  })
  const total=Object.values(cnt).reduce((a,b)=>a+b,0)
  return Object.entries(cnt).map(([ss,n])=>({ss,pct:total?Math.round(n/total*1000)/10:0})).sort((a,b)=>b.pct-a.pct)
}


// 신강/신약 꺾은선 그래프
function SinganChart({score}:{score:number}) {
  const labels=['극약','태약','신약','중화신약','중화신강','신강','태강','극왕']
  const data=[5,16,19,10,25,13,6,1]
  const w=300, h=120, pl=30, pr=10, pt=10, pb=30
  const chartW=w-pl-pr, chartH=h-pt-pb
  const maxVal=Math.max(...data)
  const xs=data.map((_,i)=>pl+i*(chartW/(data.length-1)))
  const ys=data.map(v=>pt+chartH-(v/maxVal)*chartH)
  const pathD=xs.map((x,i)=>`${i===0?'M':'L'}${x},${ys[i]}`).join(' ')
  const myIdx=Math.min(Math.max(Math.round(score),0),7)

  return (
    <svg width={w} height={h} style={{overflow:'visible'}}>
      <path d={pathD} fill="none" stroke="#bbb" strokeWidth="1.5"/>
      {xs.map((x,i)=>(
        <circle key={i} cx={x} cy={ys[i]} r={i===myIdx?6:3}
          fill={i===myIdx?'#333':'#ccc'} stroke="#fff" strokeWidth="1.5"/>
      ))}
      {myIdx>=0&&myIdx<xs.length&&(
        <text x={xs[myIdx]} y={ys[myIdx]-10} textAnchor="middle" fontSize="9" fill="#333" fontWeight="700">나</text>
      )}
      {labels.map((l,i)=>(
        <text key={i} x={xs[i]} y={h-8} textAnchor="middle" fontSize="8" fill="#aaa">{l}</text>
      ))}
    </svg>
  )
}

// 간지 박스
function GanjiBox({char,el,isDay,isGongmang}:{char:string;el:string;isDay?:boolean;isGongmang?:boolean}) {
  const color=GAN_COLOR[char]??JI_COLOR[char]??(el?ELEMENT_COLOR[el]:'#888')
  const bg=el?ELEMENT_BG[el]:'#f5f5f5'
  return (
    <div style={{
      width:'100%',height:'52px',borderRadius:'8px',
      background:isDay?'#fffbee':bg,
      border:isGongmang?'1.5px solid #f44336':isDay?'1.5px solid #e8d5a0':`1px solid ${color}66`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      position:'relative' as const,gap:'1px',
    }}>
      {isGongmang&&<span style={{position:'absolute' as const,top:'2px',right:'4px',fontSize:'8px',color:'#f44336',fontWeight:700}}>空</span>}
      <span style={{fontSize:'24px',fontWeight:700,color,lineHeight:1}}>{char}</span>
      {el&&<span style={{fontSize:'8px',fontWeight:700,color}}>{ELEMENT_HAN[el]}</span>}
    </div>
  )
}

// 세운/월운 간지 박스
function SmallGanjiBox({char,el,isCurrent,size=36}:{char:string;el:string;isCurrent?:boolean;size?:number}) {
  const color=GAN_COLOR[char]??JI_COLOR[char]??(el?ELEMENT_COLOR[el]:'#888')
  const bg=el?ELEMENT_BG[el]:'#f5f5f5'
  return (
    <div style={{
      width:`${size}px`,height:`${size}px`,borderRadius:'7px',
      background:isCurrent?'rgba(255,255,255,0.15)':bg,
      border:`1px solid ${color}66`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      position:'relative' as const,
    }}>
      <span style={{fontSize:`${size*0.5}px`,fontWeight:700,color:isCurrent?'#fff':color,lineHeight:1}}>{char}</span>
      {el&&<span style={{fontSize:'7px',fontWeight:700,color:isCurrent?'rgba(255,255,255,0.5)':color,position:'absolute' as const,bottom:'2px',right:'3px'}}>{ELEMENT_HAN[el]}</span>}
    </div>
  )
}

function Section({title,children}:{title:string;children:React.ReactNode}) {
  return (
    <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'16px',overflow:'hidden',marginBottom:'10px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'12px 16px 10px',borderBottom:'0.5px solid #f5f3ef'}}>
        <span style={{color:'#8B6914',fontSize:'13px'}}>✦</span>
        <span style={{fontSize:'13px',fontWeight:700,color:'#1a1a1a'}}>{title}</span>
      </div>
      <div style={{padding:'12px 14px'}}>{children}</div>
    </div>
  )
}

const PILLAR_SUBLABELS=['생시','생일','생월','생년']
const PILLAR_LABELS=['시주','일주','월주','년주']

function ResultNewContent() {
  const searchParams=useSearchParams()
  const router=useRouter()
  const [isPaid,setIsPaid]=useState(false)

  const gender=searchParams.get("gender")||"남"
  const calType=searchParams.get("calType")||"양력"
  const yearParam=parseInt(searchParams.get("year")||"0")
  const monthParam=parseInt(searchParams.get("month")||"0")
  const dayParam=parseInt(searchParams.get("day")||"0")
  const leapMonth=searchParams.get("leapMonth")||"0"
  const hourParam=searchParams.get("hour")
  const hourIdx=hourParam==="모름"||hourParam===null?null:parseInt(hourParam)
  const currentYear=new Date().getFullYear()

  const {saju,solar,converting,dayStem,monthGanji,yearStem,iljji,yeonjji}=
    useResultSaju(calType,yearParam,monthParam,dayParam,leapMonth,hourIdx)

  if(converting) return (
    <div style={{minHeight:'100vh',background:'#FAFAF8',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px'}}>
      <div style={{fontSize:'32px',animation:'spin 1s linear infinite'}}>✦</div>
      <p style={{color:'#8B6914',fontSize:'14px'}}>사주 정보를 불러오는 중...</p>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const solarYear=calType==="음력"&&solar?solar.year:yearParam
  const solarMonth=calType==="음력"&&solar?solar.month:monthParam
  const solarDay=calType==="음력"&&solar?solar.day:dayParam
  const ilgan=dayStem
  const [gm1,gm2]=ilgan&&iljji?getGongmang(ilgan,iljji):['','']
  const ohaeng=saju.length>0?calcOhaeng(saju):[]
  const sipsung=saju.length>0&&dayStem?calcSipsung(saju,dayStem):[]
  const calLabel=`${calType} ${yearParam}.${monthParam}.${dayParam}${calType==="음력"&&leapMonth==="1"?" (윤달)":""}`
  const solarLabel=calType==="음력"&&solar?` (양력 ${solar.year}.${solar.month}.${solar.day})`:" "
  const hourLabel=hourIdx===null?"시 미지정":`${BRANCH_LIST[hourIdx]?.char}시`
  const genderLabel=gender==="여"?"여성":"남성"

  const seyunList=dayStem?calcSeyunList(dayStem,currentYear):[]
  const wolunList=dayStem?calcWolunList(dayStem,currentYear):[]
  const currentSeyunIdx=seyunList.findIndex(s=>s.year===currentYear)
  const startIdx=Math.max(0,currentSeyunIdx-2)
  const displaySeyun=[...seyunList.slice(startIdx,startIdx+10)].reverse()

  // 신강/신약 점수 (임시: 토 비율로 계산)
  const toEl=ohaeng.find(o=>o.el==='토')
  const singanScore=toEl?Math.round(toEl.pct/100*7):3

  return (
    <div style={{minHeight:'100vh',background:'#FAFAF8',maxWidth:'430px',margin:'0 auto',fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",color:'#1a1a1a'}}>

      {/* 헤더 */}
      <div style={{position:'sticky',top:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'rgba(250,250,248,0.96)',backdropFilter:'blur(10px)',borderBottom:'0.5px solid #e8e5de'}}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',color:'#999',fontSize:'20px',cursor:'pointer'}}>←</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>나의 만세력</div>
          <div style={{fontSize:'9px',color:'#8B6914'}}>명연재（明然載）</div>
        </div>
        <div style={{width:'20px'}}/>
      </div>

      {/* 프로필 헤더 */}
      <div style={{background:'#1a1a1a',padding:'16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'10px'}}>
          <div style={{width:'40px',height:'40px',borderRadius:'50%',background:'rgba(139,105,20,0.2)',border:'1.5px solid rgba(139,105,20,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'18px',flexShrink:0}}>🌿</div>
          <div style={{fontSize:'11px',color:'#666',lineHeight:1.7}}>{calLabel}{solarLabel}· {hourLabel} · {genderLabel}</div>
        </div>
        <div style={{background:'rgba(255,255,255,0.06)',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'10px',padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'9px',color:'#8B6914',letterSpacing:'1px',marginBottom:'3px'}}>일주（日柱）</div>
            <div style={{fontSize:'28px',fontWeight:700,color:'#fff',lineHeight:1}}>{saju[1]?.stem??'?'}{saju[1]?.branch??'?'}</div>
            <div style={{fontSize:'10px',color:'#555',marginTop:'2px'}}>{dayStem?`${dayStem} 일간`:''}</div>
          </div>
          {gm1&&(
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:'9px',color:'#555',marginBottom:'3px'}}>공망</div>
              <div style={{background:'rgba(244,67,54,0.2)',border:'0.5px solid rgba(244,67,54,0.4)',borderRadius:'7px',padding:'5px 10px'}}>
                <span style={{fontSize:'16px',fontWeight:700,color:'#ef9a9a'}}>{gm1}·{gm2}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{padding:'10px'}}>

        {/* ① 사주 원국 */}
        <Section title="사주 원국">
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px',marginBottom:'3px'}}>
            {PILLAR_SUBLABELS.map((s,i)=>(
              <div key={i} style={{textAlign:'center',fontSize:'9px',color:'#bbb'}}>{s}</div>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px',marginBottom:'2px'}}>
            {saju.map(({pillar,stem},i)=>{
              const isDay=pillar==='일주'
              const ss=isDay?'본원':getSipsin(dayStem,stem)
              return <div key={i} style={{textAlign:'center',fontSize:'10px',fontWeight:700,height:'14px',color:isDay?'#8B6914':(SIPSIN_COLOR[ss]||'transparent')}}>{ss}</div>
            })}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px',marginBottom:'4px'}}>
            {saju.map(({pillar,stem},i)=>(
              <GanjiBox key={i} char={stem} el={STEM_ELEMENT[stem]} isDay={pillar==='일주'}/>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px',marginBottom:'2px'}}>
            {saju.map(({branch},i)=>(
              <GanjiBox key={i} char={branch} el={BRANCH_ELEMENT[branch]} isGongmang={branch===gm1||branch===gm2}/>
            ))}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px',marginBottom:'2px'}}>
            {saju.map(({branch},i)=>{
              const u=dayStem?getUnsung(dayStem,branch):''
              return <div key={i} style={{textAlign:'center',fontSize:'10px',fontWeight:600,height:'14px',color:unsungColor(u)}}>{u}</div>
            })}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px',marginBottom:'5px'}}>
            {saju.map(({pillar,branch},i)=>{
              const isDay=pillar==='일주'
              const bs=isDay?'':getSipsinBranch(dayStem,branch)
              return <div key={i} style={{textAlign:'center',fontSize:'10px',fontWeight:700,height:'14px',color:SIPSIN_COLOR[bs]||'transparent'}}>{bs}</div>
            })}
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'5px',marginBottom:'10px'}}>
            {PILLAR_LABELS.map((l,i)=>(
              <div key={i} style={{textAlign:'center',fontSize:'9px',color:'#bbb'}}>{l}</div>
            ))}
          </div>
          <div style={{background:'#fafaf8',border:'0.5px solid #eeebe4',borderRadius:'8px',padding:'8px',display:'flex',justifyContent:'space-around'}}>
            {[
              {label:'일간',value:dayStem?`${dayStem}(${STEM_ELEMENT[dayStem]||'?'})`:'-'},
              {label:'격국',value:'건록격'},
              {label:'신강/약',value:'중화',color:'#4caf50'},
              {label:'공망',value:gm1?`${gm1}·${gm2}`:'-',color:'#f44336'},
            ].map(item=>(
              <div key={item.label} style={{textAlign:'center'}}>
                <div style={{color:'#bbb',fontSize:'9px',marginBottom:'2px'}}>{item.label}</div>
                <div style={{color:item.color||'#1a1a1a',fontWeight:700,fontSize:'11px'}}>{item.value}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ② 신살과 길성 */}
        <Section title="신살과 길성">
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px'}}>
              <thead>
                <tr style={{borderBottom:'1px solid #f0ede6'}}>
                  <td style={{padding:'4px 6px',color:'#bbb',fontSize:'9px',width:'32px'}}></td>
                  {PILLAR_SUBLABELS.map((s,i)=>(
                    <td key={i} style={{padding:'4px',textAlign:'center',color:'#bbb',fontSize:'9px'}}>{s}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{fontSize:'9px',color:'#bbb',fontWeight:500}}>천간</td>
                  {saju.map(({stem},i)=>{
                    const el=STEM_ELEMENT[stem]
                    const color=GAN_COLOR[stem]??(el?ELEMENT_COLOR[el]:'#888')
                    const bg=el?ELEMENT_BG[el]:'#f5f5f5'
                    return (
                      <td key={i} style={{padding:'3px'}}>
                        <div style={{width:'44px',height:'44px',borderRadius:'8px',background:bg,border:`1px solid ${color}66`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',margin:'0 auto',position:'relative' as const}}>
                          <span style={{fontSize:'22px',fontWeight:700,color,lineHeight:1}}>{stem}</span>
                          {el&&<span style={{position:'absolute' as const,bottom:'2px',right:'3px',fontSize:'8px',fontWeight:700,color}}>{ELEMENT_HAN[el]}</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td style={{fontSize:'9px',color:'#bbb',fontWeight:500}}>길성</td>
                  {saju.map(({branch},i)=>{
                    const sinsal=getSinsal(yeonjji,branch)
                    const color=SINSAL_HIGHLIGHT[sinsal]
                    return <td key={i} style={{padding:'4px',textAlign:'center',fontSize:'10px',fontWeight:color?700:400,color:color||'#ddd'}}>{color?sinsal:'×'}</td>
                  })}
                </tr>
                <tr>
                  <td style={{fontSize:'9px',color:'#bbb',fontWeight:500}}>지지</td>
                  {saju.map(({branch},i)=>{
                    const el=BRANCH_ELEMENT[branch]
                    const color=JI_COLOR[branch]??(el?ELEMENT_COLOR[el]:'#888')
                    const bg=el?ELEMENT_BG[el]:'#f5f5f5'
                    return (
                      <td key={i} style={{padding:'3px'}}>
                        <div style={{width:'44px',height:'44px',borderRadius:'8px',background:bg,border:`1px solid ${color}66`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',margin:'0 auto',position:'relative' as const}}>
                          <span style={{fontSize:'22px',fontWeight:700,color,lineHeight:1}}>{branch}</span>
                          {el&&<span style={{position:'absolute' as const,bottom:'2px',right:'3px',fontSize:'8px',fontWeight:700,color}}>{ELEMENT_HAN[el]}</span>}
                        </div>
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td style={{fontSize:'9px',color:'#bbb',fontWeight:500}}>길성</td>
                  {saju.map(({branch},i)=>{
                    const sinsal=getSinsal(iljji,branch)
                    const color=SINSAL_HIGHLIGHT[sinsal]
                    return <td key={i} style={{padding:'4px',textAlign:'center',fontSize:'10px',fontWeight:color?700:400,color:color||'#ddd'}}>{color?sinsal:'×'}</td>
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* ③ 오행과 십성 분석 */}
        <Section title="오행과 십성 분석">
          {/* 오각형 그래프(왼쪽) + 십성표(오른쪽) 나란히 */}
          <div style={{display:'flex',gap:'6px',alignItems:'center',marginBottom:'12px'}}>
            <div style={{flex:1.45,minWidth:0}}>
              <OhaengPentagon ohaeng={ohaeng}/>
            </div>
            <div style={{flex:0.55,minWidth:0}}>
              <SipsungTable sipsung={sipsung}/>
            </div>
          </div>
        </Section>

        {/* ④ 신강/신약 */}
        <Section title="신강/신약 지수">
          <div style={{overflowX:'auto',paddingBottom:'4px'}}>
            <SinganChart score={singanScore}/>
          </div>
          <div style={{fontSize:'11px',color:'#555',lineHeight:1.7,marginTop:'8px',background:'#fafaf8',borderRadius:'8px',padding:'10px'}}>
            <span style={{color:'#f44336',fontWeight:600}}>중화 </span>사주입니다.<br/>
            <span style={{color:'#888',fontSize:'10px'}}>약 16.82%의 사람이 여기에 해당합니다.</span>
          </div>
        </Section>

        {/* ⑤ 용신 */}
        <Section title="용신 · 희신">
          <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>
            {[
              {label:'용신',char:'丙丁',el:'화',color:'#f44336',bg:'#ffebee',border:'#ffcdd2'},
              {label:'희신',char:'戊己',el:'토',color:'#ff9800',bg:'#fff3e0',border:'#ffe0b2'},
              {label:'기신',char:'庚辛',el:'금',color:'#9e9e9e',bg:'#f5f5f5',border:'#e0e0e0'},
            ].map(item=>(
              <div key={item.label} style={{flex:1,background:item.bg,border:`0.5px solid ${item.border}`,borderRadius:'12px',padding:'12px 4px',textAlign:'center'}}>
                <div style={{fontSize:'9px',color:item.color,fontWeight:600,marginBottom:'6px'}}>{item.label}</div>
                <div style={{fontSize:'22px',fontWeight:700,color:'#1a1a1a',lineHeight:1,marginBottom:'3px'}}>{item.char}</div>
                <div style={{fontSize:'10px',color:item.color,fontWeight:600}}>{item.el}({ELEMENT_HAN[item.el]})</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fafaf8',border:'0.5px solid #eeebe4',borderRadius:'8px',padding:'10px 12px',fontSize:'11px',color:'#666',lineHeight:1.8}}>
            乙木 일간은 음목(陰木)으로 부드럽고 유연합니다. 화(火)로 건조하게 하고 토(土)로 뿌리를 잡아주는 것이 좋습니다.
          </div>
        </Section>

        {/* ⑥ 대운 */}
        {dayStem&&monthGanji&&yearStem&&solarYear&&(
          <DayunTableNew
            solarYear={solarYear} solarMonth={solarMonth} solarDay={solarDay}
            birthYear={yearParam} gender={gender}
            monthGanji={monthGanji} yearStem={yearStem}
            dayStem={dayStem} currentYear={currentYear}
            ilgan={dayStem} yeonjji={yeonjji} iljji={iljji}
          />
        )}

        {/* ⑦ 세운 */}
        {displaySeyun.length>0&&(
          <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'16px',overflow:'hidden',marginBottom:'10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'12px 16px 10px',borderBottom:'0.5px solid #f5f3ef'}}>
              <span style={{color:'#8B6914',fontSize:'13px'}}>✦</span>
              <span style={{fontSize:'13px',fontWeight:700,color:'#1a1a1a'}}>세운 (연운)</span>
              <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'8px',background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',fontWeight:600}}>{currentYear}년</span>
            </div>
            <div style={{padding:'10px 12px',overflowX:'auto'}}>
              <table style={{borderCollapse:'collapse',whiteSpace:'nowrap' as const}}>
                <tbody>
                  <tr>
                    <td style={{width:'28px',fontSize:'9px',color:'#bbb',paddingRight:'4px'}}></td>
                    {displaySeyun.map((s,i)=>(
                      <td key={i} style={{padding:'0 3px',textAlign:'center'}}>
                        <div style={{fontSize:'9px',color:s.year===currentYear?'#8B6914':'#bbb',fontWeight:600,marginBottom:'1px'}}>{s.year}</div>
                        <div style={{fontSize:'9px',fontWeight:700,color:SIPSIN_COLOR[s.ganYukchin]||'#bbb',height:'13px'}}>{s.ganYukchin}</div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',fontWeight:500}}>천간</td>
                    {displaySeyun.map((s,i)=>{
                      const isCurrent=s.year===currentYear
                      const el=STEM_ELEMENT[s.cheongan]
                      return (
                        <td key={i} style={{padding:'2px 3px',textAlign:'center'}}>
                          <div style={{display:'inline-block',outline:isCurrent?'2px solid #8B6914':'none',borderRadius:'8px',padding:'1px'}}>
                            <SmallGanjiBox char={s.cheongan} el={el} isCurrent={false}/>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',fontWeight:500}}>지지</td>
                    {displaySeyun.map((s,i)=>{
                      const isCurrent=s.year===currentYear
                      const el=BRANCH_ELEMENT[s.jiji]
                      return (
                        <td key={i} style={{padding:'2px 3px',textAlign:'center'}}>
                          <div style={{display:'inline-block',outline:isCurrent?'2px solid #8B6914':'none',borderRadius:'8px',padding:'1px'}}>
                            <SmallGanjiBox char={s.jiji} el={el} isCurrent={false}/>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td></td>
                    {displaySeyun.map((s,i)=>(
                      <td key={i} style={{padding:'1px 3px',textAlign:'center'}}>
                        <div style={{fontSize:'9px',color:SIPSIN_COLOR[s.jiYukchin]||'#bbb',height:'13px'}}>{s.jiYukchin}</div>
                        {s.year===currentYear&&<div style={{fontSize:'8px',fontWeight:700,background:'#8B6914',color:'#fff',padding:'1px 4px',borderRadius:'4px',display:'inline-block'}}>올해</div>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ⑧ 월운 */}
        {wolunList.length>0&&(
          <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'16px',overflow:'hidden',marginBottom:'10px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'12px 16px 10px',borderBottom:'0.5px solid #f5f3ef'}}>
              <span style={{color:'#8B6914',fontSize:'13px'}}>✦</span>
              <span style={{fontSize:'13px',fontWeight:700,color:'#1a1a1a'}}>월운</span>
              <span style={{fontSize:'10px',padding:'2px 8px',borderRadius:'8px',background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',fontWeight:600}}>{currentYear}년</span>
            </div>
            <div style={{padding:'10px 12px',overflowX:'auto'}}>
              <table style={{borderCollapse:'collapse',whiteSpace:'nowrap' as const}}>
                <tbody>
                  <tr>
                    <td style={{width:'28px',fontSize:'9px',color:'#bbb',paddingRight:'4px'}}></td>
                    {wolunList.map((w,i)=>(
                      <td key={i} style={{padding:'0 2px',textAlign:'center'}}>
                        <div style={{fontSize:'9px',color:new Date().getMonth()+1===w.month?'#8B6914':'#bbb',fontWeight:600,marginBottom:'1px'}}>{w.month}월</div>
                        <div style={{fontSize:'9px',fontWeight:700,color:SIPSIN_COLOR[w.ganYukchin]||'#bbb',height:'13px'}}>{w.ganYukchin}</div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',fontWeight:500}}>천간</td>
                    {wolunList.map((w,i)=>{
                      const isCurrent=new Date().getMonth()+1===w.month
                      const el=STEM_ELEMENT[w.cheongan]
                      return (
                        <td key={i} style={{padding:'2px 2px',textAlign:'center'}}>
                          <div style={{display:'inline-block',outline:isCurrent?'2px solid #8B6914':'none',borderRadius:'7px',padding:'1px'}}>
                            <SmallGanjiBox char={w.cheongan} el={el} isCurrent={false} size={32}/>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td style={{fontSize:'9px',color:'#bbb',paddingRight:'4px',textAlign:'right',fontWeight:500}}>지지</td>
                    {wolunList.map((w,i)=>{
                      const isCurrent=new Date().getMonth()+1===w.month
                      const el=BRANCH_ELEMENT[w.jiji]
                      return (
                        <td key={i} style={{padding:'2px 2px',textAlign:'center'}}>
                          <div style={{display:'inline-block',outline:isCurrent?'2px solid #8B6914':'none',borderRadius:'7px',padding:'1px'}}>
                            <SmallGanjiBox char={w.jiji} el={el} isCurrent={false} size={32}/>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td></td>
                    {wolunList.map((w,i)=>(
                      <td key={i} style={{padding:'1px 2px',textAlign:'center'}}>
                        <div style={{fontSize:'8px',color:SIPSIN_COLOR[w.ganYukchin]||'#bbb',height:'12px'}}>{w.ganYukchin}</div>
                        {new Date().getMonth()+1===w.month&&<div style={{fontSize:'7px',fontWeight:700,background:'#8B6914',color:'#fff',padding:'1px 3px',borderRadius:'4px',display:'inline-block'}}>이달</div>}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ⑨ AI 풀이 */}
        <AiAnalysisNew
          saju={saju} gender={gender} calType={calType}
          yearParam={yearParam} monthParam={monthParam} dayParam={dayParam}
          hourIdx={hourIdx} leapMonth={leapMonth} solar={solar}
          isPaid={isPaid} onPayRequest={()=>setIsPaid(true)}
        />

        {/* ⑩ 상담 버튼 */}
        <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'14px',padding:'12px',marginTop:'10px'}}>
          <ConsultButton priceKey="saju" mode="personal" searchParams={searchParams}/>
        </div>

      </div>

      {/* 하단 네비 */}
      <div style={{position:'fixed',bottom:0,zIndex:50,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'430px',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',background:'#fff',borderTop:'0.5px solid #f0ede6'}}>
        {[{icon:'🏠',label:'홈'},{icon:'⊞',label:'서비스'},{icon:'💬',label:'상담'},{icon:'🤍',label:'찜'},{icon:'👤',label:'마이'}].map(item=>(
          <div key={item.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer'}}>
            <span style={{fontSize:'20px'}}>{item.icon}</span>
            <span style={{fontSize:'9px',color:'#ccc'}}>{item.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}

export default function ResultNewPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh',background:'#FAFAF8',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{color:'#8B6914',fontSize:'14px'}}>로딩 중...</div>
      </div>
    }>
      <ResultNewContent/>
    </Suspense>
  )
}
