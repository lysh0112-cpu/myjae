"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useResultSaju } from "@/hooks/useResultSaju";
import { getUnsung, getSinsal, unsungColor, getGongmang, SINSAL_HIGHLIGHT } from "@/lib/saju";
import { GAN_COLOR, JI_COLOR } from "@/lib/saju/constants";
import { calcSeyunList, calcWolunList } from "@/lib/saju/dayun";
import DayunTableNew from "./components/DayunTableNew";
import AiAnalysisNew from "./components/AiAnalysisNew";
import ConsultButton from "@/app/components/common/ConsultButton";

const BRANCH_LIST = [{char:"子"},{char:"丑"},{char:"寅"},{char:"卯"},{char:"辰"},{char:"巳"},{char:"午"},{char:"未"},{char:"申"},{char:"酉"},{char:"戌"},{char:"亥"}]
const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const BRANCH_ELEMENT: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}
const BRANCH_YIN: Record<string,boolean> = {子:true,丑:true,寅:false,卯:true,辰:false,巳:true,午:false,未:true,申:false,酉:true,戌:false,亥:true}

const ELEMENT_COLOR: Record<string,string> = {목:'#2e7d32',화:'#c62828',토:'#795548',금:'#f57f17',수:'#1565c0'}
const ELEMENT_BG: Record<string,string> = {목:'#e8f5e9',화:'#ffebee',토:'#efebe9',금:'#fff8e1',수:'#e3f2fd'}

const SIPSIN_COLOR: Record<string,string> = {
  비견:'#607d8b',겁재:'#78909c',
  식신:'#2e7d32',상관:'#388e3c',
  편재:'#8B6914',정재:'#a07820',
  편관:'#c62828',정관:'#d32f2f',
  편인:'#1565c0',정인:'#1976d2',
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

// 오행 퍼센트 계산
function calcOhaeng(saju:{stem:string;branch:string}[]) {
  const cnt:Record<string,number> = {목:0,화:0,토:0,금:0,수:0}
  saju.forEach(({stem,branch})=>{
    if(STEM_ELEMENT[stem]) cnt[STEM_ELEMENT[stem]]+=1
    if(BRANCH_ELEMENT[branch]) cnt[BRANCH_ELEMENT[branch]]+=1
  })
  const total = Object.values(cnt).reduce((a,b)=>a+b,0)
  return Object.entries(cnt).map(([el,n])=>({el,pct:total?Math.round(n/total*1000)/10:0}))
}

// 십성 퍼센트 계산
function calcSipsung(saju:{stem:string;branch:string}[], dayStem:string) {
  const cnt:Record<string,number> = {}
  saju.forEach(({stem,branch},i)=>{
    const isDay = i===1
    if(!isDay){const ss=getSipsin(dayStem,stem); if(ss) cnt[ss]=(cnt[ss]||0)+1}
    const bs=getSipsinBranch(dayStem,branch); if(bs) cnt[bs]=(cnt[bs]||0)+1
  })
  const total = Object.values(cnt).reduce((a,b)=>a+b,0)
  return Object.entries(cnt).map(([ss,n])=>({ss,pct:total?Math.round(n/total*1000)/10:0})).sort((a,b)=>b.pct-a.pct)
}

const PILLAR_SUBLABELS = ['생시','생일','생월','생년']
const PILLAR_LABELS = ['시주','일주','월주','년주']

function GanjiBox({char,el,isDay,isGongmang,isSelected}:{char:string;el:string;isDay?:boolean;isGongmang?:boolean;isSelected?:boolean}) {
  const color = GAN_COLOR[char]??JI_COLOR[char]??(el?ELEMENT_COLOR[el]:'#888')
  const bg = el?ELEMENT_BG[el]:'#f5f5f5'
  return (
    <div style={{
      width:'100%',height:'52px',borderRadius:'10px',
      background:isSelected?'rgba(255,255,255,0.12)':isDay?'#fffbee':bg,
      border:isGongmang?`1.5px solid #c62828`:isDay?'1.5px solid #e8d5a0':`0.5px solid ${color}44`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      position:'relative' as const, gap:'2px',
    }}>
      {isGongmang&&<span style={{position:'absolute' as const,top:'2px',right:'4px',fontSize:'8px',color:'#c62828',fontWeight:700}}>空</span>}
      <span style={{fontSize:'26px',fontWeight:700,color:isSelected?'#fff':color,lineHeight:1}}>{char}</span>
      {el&&<span style={{fontSize:'8px',fontWeight:700,color:isSelected?'rgba(255,255,255,0.6)':color}}>{el}</span>}
    </div>
  )
}

function Section({title,icon,children}:{title:string;icon:string;children:React.ReactNode}) {
  return (
    <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'20px',overflow:'hidden',marginBottom:'12px'}}>
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'14px 18px 12px',borderBottom:'0.5px solid #f5f3ef'}}>
        <span style={{color:'#8B6914'}}>{icon}</span>
        <span style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>{title}</span>
      </div>
      <div style={{padding:'14px 14px'}}>{children}</div>
    </div>
  )
}

function ResultNewContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isPaid, setIsPaid] = useState(false)

  const gender    = searchParams.get("gender")||"남"
  const calType   = searchParams.get("calType")||"양력"
  const yearParam  = parseInt(searchParams.get("year")||"0")
  const monthParam = parseInt(searchParams.get("month")||"0")
  const dayParam   = parseInt(searchParams.get("day")||"0")
  const leapMonth  = searchParams.get("leapMonth")||"0"
  const hourParam  = searchParams.get("hour")
  const hourIdx    = hourParam==="모름"||hourParam===null ? null : parseInt(hourParam)
  const currentYear = new Date().getFullYear()

  const {saju,solar,converting,dayStem,monthGanji,yearStem,iljji,yeonjji} =
    useResultSaju(calType,yearParam,monthParam,dayParam,leapMonth,hourIdx)

  if(converting) return (
    <div style={{minHeight:'100vh',background:'#FAFAF8',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px'}}>
      <div style={{fontSize:'32px',animation:'spin 1s linear infinite'}}>✦</div>
      <p style={{color:'#8B6914',fontSize:'14px'}}>사주 정보를 불러오는 중...</p>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  const solarYear  = calType==="음력"&&solar ? solar.year  : yearParam
  const solarMonth = calType==="음력"&&solar ? solar.month : monthParam
  const solarDay   = calType==="음력"&&solar ? solar.day   : dayParam

  const ilgan = dayStem
  const [gm1,gm2] = ilgan&&iljji ? getGongmang(ilgan,iljji) : ['','']

  const ohaeng = saju.length>0 ? calcOhaeng(saju) : []
  const sipsung = saju.length>0 && dayStem ? calcSipsung(saju,dayStem) : []

  const calLabel = `${calType} ${yearParam}.${monthParam}.${dayParam}${calType==="음력"&&leapMonth==="1"?" (윤달)":""}`
  const solarLabel = calType==="음력"&&solar ? ` (양력 ${solar.year}.${solar.month}.${solar.day})` : ""
  const hourLabel = hourIdx===null ? "시 미지정" : `${BRANCH_LIST[hourIdx]?.char}시`
  const genderLabel = gender==="여" ? "여성" : "남성"

  const seyunList = dayStem ? calcSeyunList(dayStem,currentYear) : []
  const wolunList = dayStem ? calcWolunList(dayStem,currentYear) : []

  const currentSeyunIdx = seyunList.findIndex(s=>s.year===currentYear)
  const startIdx = Math.max(0,currentSeyunIdx-2)
  const displaySeyun = [...seyunList.slice(startIdx,startIdx+10)].reverse()

  return (
    <div style={{minHeight:'100vh',background:'#FAFAF8',maxWidth:'430px',margin:'0 auto',fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",color:'#1a1a1a'}}>

      {/* 헤더 */}
      <div style={{position:'sticky',top:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 18px',background:'rgba(250,250,248,0.96)',backdropFilter:'blur(10px)',borderBottom:'0.5px solid #e8e5de'}}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',color:'#999',fontSize:'22px',cursor:'pointer'}}>←</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'15px',fontWeight:700,color:'#1a1a1a'}}>나의 만세력</div>
          <div style={{fontSize:'10px',color:'#8B6914',marginTop:'1px'}}>명연재（明然載）</div>
        </div>
        <div style={{width:'22px'}}/>
      </div>

      {/* 프로필 헤더 */}
      <div style={{background:'#1a1a1a',padding:'20px 18px 18px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'12px'}}>
          <div style={{width:'44px',height:'44px',borderRadius:'50%',background:'rgba(139,105,20,0.2)',border:'1.5px solid rgba(139,105,20,0.4)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px',flexShrink:0}}>🌿</div>
          <div>
            <div style={{fontSize:'13px',color:'#888',lineHeight:1.8}}>
              {calLabel}{solarLabel} · {hourLabel} · {genderLabel}
            </div>
          </div>
        </div>
        <div style={{background:'rgba(255,255,255,0.06)',border:'0.5px solid rgba(255,255,255,0.1)',borderRadius:'12px',padding:'12px 14px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div>
            <div style={{fontSize:'9px',color:'#8B6914',letterSpacing:'1px',marginBottom:'4px'}}>일주（日柱）</div>
            <div style={{fontSize:'32px',fontWeight:700,color:'#fff',lineHeight:1,letterSpacing:'-1px'}}>
              {saju[1]?.stem??'?'}{saju[1]?.branch??'?'}
            </div>
            <div style={{fontSize:'10px',color:'#555',marginTop:'3px'}}>{dayStem?`${dayStem} 일간`:''}</div>
          </div>
          {gm1&&(
            <div style={{textAlign:'right'}}>
              <div style={{fontSize:'10px',color:'#555',marginBottom:'4px'}}>공망</div>
              <div style={{background:'rgba(198,40,40,0.2)',border:'0.5px solid rgba(198,40,40,0.4)',borderRadius:'8px',padding:'6px 12px',display:'inline-block'}}>
                <span style={{fontSize:'18px',fontWeight:700,color:'#ef9a9a'}}>{gm1}·{gm2}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{padding:'12px'}}>

        {/* ① 사주 원국 */}
        <Section title="사주 원국" icon="📋">
          {/* 컬럼 헤더 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'4px'}}>
            {PILLAR_SUBLABELS.map((s,i)=>(
              <div key={i} style={{textAlign:'center',fontSize:'9px',color:'#bbb',fontWeight:500}}>{s}</div>
            ))}
          </div>

          {/* 천간 십성 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'3px'}}>
            {saju.map(({pillar,stem},i)=>{
              const isDay=pillar==='일주'
              const ss=isDay?'본원':getSipsin(dayStem,stem)
              return <div key={i} style={{textAlign:'center',fontSize:'10px',fontWeight:700,height:'15px',color:isDay?'#8B6914':(SIPSIN_COLOR[ss]||'transparent')}}>{ss}</div>
            })}
          </div>

          {/* 천간 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'4px'}}>
            {saju.map(({pillar,stem},i)=>{
              const isDay=pillar==='일주'
              const el=STEM_ELEMENT[stem]
              return <GanjiBox key={i} char={stem} el={el} isDay={isDay} />
            })}
          </div>

          {/* 지지 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'3px'}}>
            {saju.map(({branch},i)=>{
              const el=BRANCH_ELEMENT[branch]
              const isGongmang=branch===gm1||branch===gm2
              return <GanjiBox key={i} char={branch} el={el} isGongmang={isGongmang} />
            })}
          </div>

          {/* 12운성 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'3px'}}>
            {saju.map(({branch},i)=>{
              const u=dayStem?getUnsung(dayStem,branch):''
              return <div key={i} style={{textAlign:'center',fontSize:'10px',fontWeight:600,height:'15px',color:unsungColor(u)}}>{u}</div>
            })}
          </div>

          {/* 지지 십성 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'6px'}}>
            {saju.map(({pillar,branch},i)=>{
              const isDay=pillar==='일주'
              const bs=isDay?'':getSipsinBranch(dayStem,branch)
              return <div key={i} style={{textAlign:'center',fontSize:'10px',fontWeight:700,height:'15px',color:SIPSIN_COLOR[bs]||'transparent'}}>{bs}</div>
            })}
          </div>

          {/* 기둥 이름 */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'10px'}}>
            {PILLAR_LABELS.map((l,i)=>(
              <div key={i} style={{textAlign:'center',fontSize:'9px',color:'#bbb',fontWeight:500}}>{l}</div>
            ))}
          </div>

          {/* 요약 */}
          <div style={{background:'#fafaf8',border:'0.5px solid #eeebe4',borderRadius:'10px',padding:'10px',display:'flex',justifyContent:'space-around'}}>
            {[
              {label:'일간',value:dayStem?`${dayStem}(${STEM_ELEMENT[dayStem]||'?'})`:'-'},
              {label:'격국',value:'건록격'},
              {label:'신강/약',value:'중화',color:'#2e7d32'},
              {label:'공망',value:gm1?`${gm1}·${gm2}`:'-',color:'#c62828'},
            ].map(item=>(
              <div key={item.label} style={{textAlign:'center'}}>
                <div style={{color:'#bbb',fontSize:'9px',marginBottom:'2px'}}>{item.label}</div>
                <div style={{color:item.color||'#1a1a1a',fontWeight:700,fontSize:'12px'}}>{item.value}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ② 신살과 길성 */}
        <Section title="신살과 길성" icon="⚡">
          <div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',minWidth:'300px'}}>
              <thead>
                <tr>
                  <td style={{padding:'4px 6px',color:'#bbb',fontSize:'10px'}}></td>
                  {PILLAR_SUBLABELS.map((s,i)=>(
                    <td key={i} style={{padding:'4px 6px',textAlign:'center',color:'#bbb',fontSize:'10px',fontWeight:500}}>{s}</td>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{padding:'4px 6px',color:'#bbb',fontSize:'10px',fontWeight:500,whiteSpace:'nowrap' as const}}>천간</td>
                  {saju.map(({stem},i)=>(
                    <td key={i} style={{padding:'4px',textAlign:'center'}}>
                      <div style={{
                        display:'inline-flex',alignItems:'center',justifyContent:'center',
                        width:'36px',height:'36px',borderRadius:'8px',
                        background:STEM_ELEMENT[stem]?ELEMENT_BG[STEM_ELEMENT[stem]]:'#f5f5f5',
                        border:`0.5px solid ${(GAN_COLOR[stem]||'#ccc')}44`,
                      }}>
                        <span style={{fontSize:'20px',fontWeight:700,color:GAN_COLOR[stem]||'#888'}}>{stem}</span>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{padding:'4px 6px',color:'#bbb',fontSize:'10px',fontWeight:500}}>길성</td>
                  {saju.map(({stem,branch},i)=>{
                    const sinsal = getSinsal(yeonjji,branch)
                    const color = SINSAL_HIGHLIGHT[sinsal]
                    return (
                      <td key={i} style={{padding:'4px',textAlign:'center',fontSize:'10px',fontWeight:color?700:400,color:color||'#bbb'}}>
                        {color ? sinsal : '×'}
                      </td>
                    )
                  })}
                </tr>
                <tr>
                  <td style={{padding:'4px 6px',color:'#bbb',fontSize:'10px',fontWeight:500}}>지지</td>
                  {saju.map(({branch},i)=>(
                    <td key={i} style={{padding:'4px',textAlign:'center'}}>
                      <div style={{
                        display:'inline-flex',alignItems:'center',justifyContent:'center',
                        width:'36px',height:'36px',borderRadius:'8px',
                        background:BRANCH_ELEMENT[branch]?ELEMENT_BG[BRANCH_ELEMENT[branch]]:'#f5f5f5',
                        border:`0.5px solid ${(JI_COLOR[branch]||'#ccc')}44`,
                      }}>
                        <span style={{fontSize:'20px',fontWeight:700,color:JI_COLOR[branch]||'#888'}}>{branch}</span>
                      </div>
                    </td>
                  ))}
                </tr>
                <tr>
                  <td style={{padding:'4px 6px',color:'#bbb',fontSize:'10px',fontWeight:500}}>길성</td>
                  {saju.map(({branch},i)=>{
                    const sinsal = getSinsal(iljji,branch)
                    const color = SINSAL_HIGHLIGHT[sinsal]
                    return (
                      <td key={i} style={{padding:'4px',textAlign:'center',fontSize:'10px',fontWeight:color?700:400,color:color||'#bbb'}}>
                        {color ? sinsal : '×'}
                      </td>
                    )
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* ③ 오행 분석 */}
        <Section title="오행 분석" icon="🌊">
          <div style={{display:'flex',gap:'6px',marginBottom:'14px'}}>
            {ohaeng.map(({el,pct})=>(
              <div key={el} style={{flex:1,background:ELEMENT_BG[el]||'#f5f5f5',borderRadius:'10px',padding:'10px 4px',textAlign:'center'}}>
                <div style={{fontSize:'16px',fontWeight:700,color:ELEMENT_COLOR[el]||'#888'}}>{pct}%</div>
                <div style={{fontSize:'9px',color:ELEMENT_COLOR[el]||'#888',marginTop:'2px'}}>{el}</div>
              </div>
            ))}
          </div>
          {ohaeng.map(({el,pct})=>(
            <div key={el} style={{marginBottom:'8px'}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'3px'}}>
                <span style={{fontSize:'11px',color:'#555',fontWeight:500}}>{el}(木火土金水'.split('')[['목','화','토','금','수'].indexOf(el)]||el})</span>
                <span style={{fontSize:'11px',fontWeight:700,color:ELEMENT_COLOR[el]}}>{pct}%</span>
              </div>
              <div style={{height:'7px',background:'#f5f3ef',borderRadius:'4px',overflow:'hidden'}}>
                <div style={{height:'100%',background:ELEMENT_COLOR[el],width:`${pct}%`,borderRadius:'4px',transition:'width 0.6s'}}/>
              </div>
            </div>
          ))}
        </Section>

        {/* ④ 십성 분포 */}
        <Section title="십성 분포" icon="⭐">
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'8px'}}>
            {sipsung.filter(s=>s.pct>0).map(({ss,pct})=>(
              <div key={ss} style={{background:'#fafaf8',border:'0.5px solid #eeebe4',borderRadius:'10px',padding:'10px 12px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <span style={{fontSize:'13px',color:SIPSIN_COLOR[ss]||'#555',fontWeight:600}}>{ss}</span>
                <span style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>{pct}%</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ⑤ 용신 */}
        <Section title="용신 · 희신" icon="🔥">
          <div style={{display:'flex',gap:'8px',marginBottom:'12px'}}>
            {[
              {label:'용신',char:'丙丁',el:'화',color:'#c62828',bg:'#ffebee',border:'#f5c0c8'},
              {label:'희신',char:'戊己',el:'토',color:'#795548',bg:'#efebe9',border:'#d7ccc8'},
              {label:'기신',char:'庚辛',el:'금',color:'#f57f17',bg:'#fff8e1',border:'#ffe082'},
            ].map(item=>(
              <div key={item.label} style={{flex:1,background:item.bg,border:`0.5px solid ${item.border}`,borderRadius:'14px',padding:'14px 6px',textAlign:'center'}}>
                <div style={{fontSize:'10px',color:item.color,fontWeight:600,marginBottom:'8px'}}>{item.label}</div>
                <div style={{fontSize:'26px',fontWeight:700,color:'#1a1a1a',lineHeight:1,marginBottom:'4px'}}>{item.char}</div>
                <div style={{fontSize:'11px',color:item.color,fontWeight:600}}>{item.el}</div>
              </div>
            ))}
          </div>
          <div style={{background:'#fafaf8',border:'0.5px solid #eeebe4',borderRadius:'10px',padding:'12px 14px',fontSize:'12px',color:'#666',lineHeight:1.8}}>
            乙木 일간은 음목(陰木)으로 부드럽고 유연한 성질입니다. 수(水)가 많아 뿌리를 잃기 쉬우니, 화(火)로 건조하게 하고 토(土)로 뿌리를 잡아주는 것이 좋습니다.
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
          <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'20px',overflow:'hidden',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'14px 18px 12px',borderBottom:'0.5px solid #f5f3ef'}}>
              <span style={{color:'#8B6914'}}>✦</span>
              <span style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>세운</span>
              <span style={{fontSize:'11px',padding:'2px 10px',borderRadius:'10px',background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',fontWeight:600}}>{currentYear}년</span>
            </div>
            <div style={{padding:'14px 12px',display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'6px'}}>
              {displaySeyun.map((s,i)=>{
                const isCurrent=s.year===currentYear
                const ganEl=STEM_ELEMENT[s.cheongan]
                const jiEl=BRANCH_ELEMENT[s.jiji]
                const ganColor=GAN_COLOR[s.cheongan]??(ganEl?ELEMENT_COLOR[ganEl]:'#888')
                const jiColor=JI_COLOR[s.jiji]??(jiEl?ELEMENT_COLOR[jiEl]:'#888')
                return (
                  <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 4px',borderRadius:'12px',background:isCurrent?'#1a1a1a':'#fafaf8',border:isCurrent?'none':'0.5px solid #eeebe4'}}>
                    <div style={{fontSize:'9px',fontWeight:600,marginBottom:'4px',color:isCurrent?'#d4b87a':'#bbb'}}>{s.year}</div>
                    <div style={{width:'34px',height:'34px',borderRadius:'8px',background:isCurrent?'rgba(255,255,255,0.1)':(ganEl?ELEMENT_BG[ganEl]:'#f5f5f5'),border:`0.5px solid ${isCurrent?'rgba(255,255,255,0.2)':ganColor+'44'}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',marginBottom:'3px'}}>
                      <span style={{fontSize:'17px',fontWeight:700,color:isCurrent?'#fff':ganColor,lineHeight:1}}>{s.cheongan}</span>
                      <span style={{fontSize:'7px',color:isCurrent?'rgba(255,255,255,0.5)':ganColor}}>{ganEl}</span>
                    </div>
                    <div style={{width:'34px',height:'34px',borderRadius:'8px',background:isCurrent?'rgba(255,255,255,0.1)':(jiEl?ELEMENT_BG[jiEl]:'#f5f5f5'),border:`0.5px solid ${isCurrent?'rgba(255,255,255,0.2)':jiColor+'44'}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',marginBottom:'4px'}}>
                      <span style={{fontSize:'17px',fontWeight:700,color:isCurrent?'#d4b87a':jiColor,lineHeight:1}}>{s.jiji}</span>
                      <span style={{fontSize:'7px',color:isCurrent?'rgba(212,184,122,0.6)':jiColor}}>{jiEl}</span>
                    </div>
                    <div style={{fontSize:'8px',color:isCurrent?'rgba(255,255,255,0.6)':(SIPSIN_COLOR[s.ganYukchin]||'#bbb'),fontWeight:600,textAlign:'center'}}>{s.ganYukchin}</div>
                    {isCurrent&&<div style={{marginTop:'4px',fontSize:'8px',fontWeight:700,background:'#8B6914',color:'#fff',padding:'1px 5px',borderRadius:'5px'}}>올해</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ⑧ 월운 */}
        {wolunList.length>0&&(
          <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'20px',overflow:'hidden',marginBottom:'12px'}}>
            <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'14px 18px 12px',borderBottom:'0.5px solid #f5f3ef'}}>
              <span style={{color:'#8B6914'}}>✦</span>
              <span style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>월운</span>
              <span style={{fontSize:'11px',padding:'2px 10px',borderRadius:'10px',background:'#fffbee',border:'0.5px solid #e8d5a0',color:'#8B6914',fontWeight:600}}>{currentYear}년</span>
            </div>
            <div style={{padding:'14px 12px',display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px'}}>
              {wolunList.map((w,i)=>{
                const isCurrent = new Date().getMonth()+1===w.month
                const ganEl=STEM_ELEMENT[w.cheongan]
                const jiEl=BRANCH_ELEMENT[w.jiji]
                const ganColor=GAN_COLOR[w.cheongan]??(ganEl?ELEMENT_COLOR[ganEl]:'#888')
                const jiColor=JI_COLOR[w.jiji]??(jiEl?ELEMENT_COLOR[jiEl]:'#888')
                return (
                  <div key={i} style={{display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 4px',borderRadius:'12px',background:isCurrent?'#1a1a1a':'#fafaf8',border:isCurrent?'none':'0.5px solid #eeebe4'}}>
                    <div style={{fontSize:'9px',fontWeight:600,marginBottom:'4px',color:isCurrent?'#d4b87a':'#bbb'}}>{w.month}월</div>
                    <div style={{width:'32px',height:'32px',borderRadius:'8px',background:isCurrent?'rgba(255,255,255,0.1)':(ganEl?ELEMENT_BG[ganEl]:'#f5f5f5'),border:`0.5px solid ${isCurrent?'rgba(255,255,255,0.2)':ganColor+'44'}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',marginBottom:'3px'}}>
                      <span style={{fontSize:'15px',fontWeight:700,color:isCurrent?'#fff':ganColor,lineHeight:1}}>{w.cheongan}</span>
                      <span style={{fontSize:'7px',color:isCurrent?'rgba(255,255,255,0.5)':ganColor}}>{ganEl}</span>
                    </div>
                    <div style={{width:'32px',height:'32px',borderRadius:'8px',background:isCurrent?'rgba(255,255,255,0.1)':(jiEl?ELEMENT_BG[jiEl]:'#f5f5f5'),border:`0.5px solid ${isCurrent?'rgba(255,255,255,0.2)':jiColor+'44'}`,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',marginBottom:'3px'}}>
                      <span style={{fontSize:'15px',fontWeight:700,color:isCurrent?'#d4b87a':jiColor,lineHeight:1}}>{w.jiji}</span>
                      <span style={{fontSize:'7px',color:isCurrent?'rgba(212,184,122,0.6)':jiColor}}>{jiEl}</span>
                    </div>
                    <div style={{fontSize:'8px',color:isCurrent?'rgba(255,255,255,0.6)':(SIPSIN_COLOR[w.ganYukchin]||'#bbb'),fontWeight:600,textAlign:'center'}}>{w.ganYukchin}</div>
                    {isCurrent&&<div style={{marginTop:'3px',fontSize:'8px',fontWeight:700,background:'#8B6914',color:'#fff',padding:'1px 5px',borderRadius:'5px'}}>이달</div>}
                  </div>
                )
              })}
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
        <div style={{background:'#fff',border:'0.5px solid #e8e5de',borderRadius:'16px',padding:'14px',marginTop:'12px'}}>
          <ConsultButton priceKey="saju" mode="personal" searchParams={searchParams}/>
        </div>

      </div>

      {/* 하단 네비 */}
      <div style={{position:'fixed',bottom:0,zIndex:50,left:'50%',transform:'translateX(-50%)',width:'100%',maxWidth:'430px',display:'flex',justifyContent:'space-around',padding:'10px 0 20px',background:'#fff',borderTop:'0.5px solid #f0ede6'}}>
        {[{icon:'🏠',label:'홈'},{icon:'⊞',label:'서비스'},{icon:'💬',label:'상담'},{icon:'🤍',label:'찜'},{icon:'👤',label:'마이'}].map(item=>(
          <div key={item.label} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:'3px',cursor:'pointer'}}>
            <span style={{fontSize:'22px'}}>{item.icon}</span>
            <span style={{fontSize:'10px',color:'#ccc'}}>{item.label}</span>
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
