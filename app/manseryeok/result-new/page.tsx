"use client";

import { useState, Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useResultSaju } from "@/hooks/useResultSaju";
import { supabase } from "@/lib/supabase";
import { fromProfile, fromUrl, type MyInfo } from "@/lib/saju/myInfo";
import { getUnsung, getSinsal, unsungColor, getGongmang, SINSAL_HIGHLIGHT } from "@/lib/saju";
import { GAN_COLOR, JI_COLOR } from "@/lib/saju/constants";
import { calcSeyunList, calcWolunList } from "@/lib/saju/dayun";
import { calcYongsin } from "@/lib/saju/yongsin";
import { calcSimsanOhaeng, toPercentList } from "@/lib/saju/simsanOhaeng";
import DayunTableNew from "./components/DayunTableNew";
import AiAnalysisNew from "./components/AiAnalysisNew";
import ConsultButton from "@/app/components/common/ConsultButton";
import OhaengPentagon from "./OhaengPentagon";
import SchoolCompare from "./SchoolCompare";
import SipsungTable from "./SipsungTable";
import UnTable from "./UnTable";
import SingangTable from "./SingangTable";
import QuestionPicker from "../components/QuestionPicker";
import TongbyeonView from "../components/TongbyeonView";
import { birthYearToGroup, genderToFilter, type SajuQuestion } from "@/lib/saju/questions";
import { toTongbyeonInput } from "@/lib/saju/toTongbyeonInput";
import YongsinCard from "./YongsinCard";
import SajuWonguk from "./SajuWonguk";

const BRANCH_LIST = [{char:"子"},{char:"丑"},{char:"寅"},{char:"卯"},{char:"辰"},{char:"巳"},{char:"午"},{char:"未"},{char:"申"},{char:"酉"},{char:"戌"},{char:"亥"}]
const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const STEM_KOR: Record<string,string> = {甲:'갑목',乙:'을목',丙:'병화',丁:'정화',戊:'무토',己:'기토',庚:'경금',辛:'신금',壬:'임수',癸:'계수'}
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
      background:isDay?'#fff3e9':bg,
      border:isGongmang?'1.5px solid #f44336':isDay?'1.5px solid #e8d5c5':`1px solid ${color}66`,
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

// Section: 기본은 항상 펼침(고정). collapsible=true면 접이식(아코디언).
//   - collapsible 없이 쓰면 예전과 똑같이 항상 펼쳐진 카드 (사주 원국 등)
//   - collapsible=true면 제목 줄을 눌러 open/onToggle로 펼침·접힘
function Section({
  title, children, collapsible, open, onToggle, hint,
}:{
  title:string
  children:React.ReactNode
  collapsible?:boolean
  open?:boolean
  onToggle?:()=>void
  hint?:string
}) {
  const isOpen = collapsible ? !!open : true
  return (
    <div style={{background:'#fff',border:'0.5px solid #f0e0d5',borderRadius:'16px',overflow:'hidden',marginBottom:'10px'}}>
      <div
        onClick={collapsible?onToggle:undefined}
        style={{display:'flex',alignItems:'center',gap:'8px',padding:'12px 16px 10px',
          borderBottom: isOpen?'0.5px solid #f7ede4':'none',
          cursor: collapsible?'pointer':'default'}}
      >
        <span style={{color:'#c8783c',fontSize:'13px'}}>✦</span>
        <span style={{flex:1,fontSize:'13px',fontWeight:700,color:'#1a1a1a'}}>{title}</span>
        {collapsible && hint && !isOpen &&
          <span style={{fontSize:'10px',color:'#c5a590'}}>{hint}</span>}
        {collapsible &&
          <span style={{color:'#c8783c',fontSize:'12px',transition:'transform .25s',
            transform:`rotate(${isOpen?'180':'0'}deg)`}}>▾</span>}
      </div>
      <div style={{maxHeight: isOpen?'2000px':'0',overflow:'hidden',transition:'max-height .3s ease'}}>
        <div style={{padding:'12px 14px'}}>{children}</div>
      </div>
    </div>
  )
}

const PILLAR_SUBLABELS=['생시','생일','생월','생년']
const PILLAR_LABELS=['시주','일주','월주','년주']

function ResultNewContent() {
  const searchParams=useSearchParams()
  const router=useRouter()
  const [isPaid,setIsPaid]=useState(false)
  // 아코디언: 한 번에 하나만 펼침. 사주 원국은 고정(항상 펼침)이라 대상 아님.
  const [openSection,setOpenSection]=useState<string|null>(null)
  const toggleSection=(key:string)=>setOpenSection(prev=>prev===key?null:key)
  // 질문 선택: 아직 안 골랐으면 QuestionPicker를 먼저, 고르면 만세력+통변 표시.
  // null이면 질문 선택 화면 단계. 배열이면 결과 화면 단계.
  const [pickedQuestions,setPickedQuestions]=useState<SajuQuestion[]|null>(null)

  // ── ID 통일: URL 우선 + profiles 보조 (diagnosis와 동일한 표준 패턴) ──
  //   1) URL에 생년월일이 있으면 그 사람(타인·특정인·가족지인 목록에서 선택)
  //   2) 없으면 로그인한 내 정보(profiles) = 내 사주
  //   3) 둘 다 없으면 null (로그인/등록 안내)
  const [info,setInfo]=useState<MyInfo|null>(null)
  const [loadingInfo,setLoadingInfo]=useState(true)

  useEffect(()=>{
    let cancelled=false
    async function loadInfo(){
      // (1) URL 우선 — 사람 선택 모달/가족지인 목록에서 넘어온 경우
      const urlInfo=fromUrl(searchParams)
      if(urlInfo){ if(!cancelled){setInfo(urlInfo);setLoadingInfo(false)} return }

      // (2) URL 없으면 로그인한 내 정보(profiles) = 내 사주
      try{
        const {data:u}=await supabase.auth.getUser()
        if(u?.user){
          const {data:p}=await supabase.from("profiles")
            .select("birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved")
            .eq("id",u.user.id).single()
          const profInfo=fromProfile(p)
          if(profInfo){ if(!cancelled){setInfo(profInfo);setLoadingInfo(false)} return }
        }
      }catch(e){ console.error(e) }

      // (3) 둘 다 없음 → 안내
      if(!cancelled){setInfo(null);setLoadingInfo(false)}
    }
    loadInfo()
    return ()=>{cancelled=true}
  },[searchParams])

  const gender=info?.gender||"남"
  const calType=info?.calType||"양력"
  const yearParam=info?parseInt(info.year):0
  const monthParam=info?parseInt(info.month):0
  const dayParam=info?parseInt(info.day):0
  const leapMonth=info?.leapMonth||"0"
  const hourIdx=info?(info.hour==="모름"?null:parseInt(info.hour)):null
  const currentYear=new Date().getFullYear()

  // 제목용 이름: URL에 name이 있으면 "OO님의 만세력", 없으면 "나의 만세력"
  const personName=searchParams.get("name")||""
  const titleName=personName?`${personName}님의 만세력`:"나의 만세력"

  const {saju,solar,converting:converting0,dayStem,monthGanji,yearStem,iljji,yeonjji}=
    useResultSaju(calType,yearParam,monthParam,dayParam,leapMonth,hourIdx)
  const converting=converting0||loadingInfo

  if(converting) return (
    <div style={{minHeight:'100vh',background:'#FDF6F0',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px'}}>
      <div style={{fontSize:'32px',animation:'spin 1s linear infinite'}}>✦</div>
      <p style={{color:'#c8783c',fontSize:'14px'}}>사주 정보를 불러오는 중...</p>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  // 로그인도 안 했고 URL 정보도 없을 때 → 안내
  if(!info) return (
    <div style={{minHeight:'100vh',background:'#FDF6F0',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:'16px',padding:'24px',textAlign:'center'}}>
      <div style={{fontSize:'32px'}}>✦</div>
      <p style={{color:'#96502e',fontSize:'15px',fontWeight:700}}>사주 정보가 필요해요</p>
      <p style={{color:'#b4785a',fontSize:'13px',lineHeight:1.7}}>로그인하시면 내 사주가 자동으로 나와요.<br/>또는 홈에서 생년월일을 입력해 주세요.</p>
      <div style={{display:'flex',gap:'8px',marginTop:'4px'}}>
        <button onClick={()=>router.push('/login')} style={{background:'#b46e46',color:'#fff',border:'none',borderRadius:'10px',padding:'10px 20px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>로그인</button>
        <button onClick={()=>router.push('/home-new')} style={{background:'#fffbf7',color:'#96502e',border:'0.5px solid #f0e0d5',borderRadius:'10px',padding:'10px 20px',fontSize:'14px',fontWeight:600,cursor:'pointer'}}>홈으로</button>
      </div>
    </div>
  )

  const solarYear=calType==="음력"&&solar?solar.year:yearParam
  const solarMonth=calType==="음력"&&solar?solar.month:monthParam
  const solarDay=calType==="음력"&&solar?solar.day:dayParam
  const ilgan=dayStem
  const [gm1,gm2]=ilgan&&iljji?getGongmang(ilgan,iljji):['','']
  const hourBranch=saju.find(p=>p.pillar==="시주")?.branch??null
  const ohaeng=saju.length>0?toPercentList(calcSimsanOhaeng(saju,solarMonth,solarDay,hourBranch)):[]
  const sipsung=saju.length>0&&dayStem?calcSipsung(saju,dayStem):[]
  const calLabel=`${calType} ${yearParam}.${monthParam}.${dayParam}${calType==="음력"&&leapMonth==="1"?" (윤달)":""}`
  const solarLabel=calType==="음력"&&solar?` (양력 ${solar.year}.${solar.month}.${solar.day})`:" "
  const hourLabel=hourIdx===null?"시 미지정":`${BRANCH_LIST[hourIdx]?.char}시`
  const genderLabel=gender==="여"?"여성":"남성"

  const seyunList=dayStem?calcSeyunList(dayStem,currentYear):[]
  const wolunList=dayStem?calcWolunList(dayStem,currentYear):[]

  // 용신·희신·기신 계산 (이미 있는 계산기 사용)
  const yongsinResult=saju.length>0&&dayStem?calcYongsin(saju,dayStem):null
  const currentSeyunIdx=seyunList.findIndex(s=>s.year===currentYear)
  const startIdx=Math.max(0,currentSeyunIdx-2)
  const displaySeyun=[...seyunList.slice(startIdx,startIdx+10)].reverse()

  // 신강/신약 점수 (임시: 토 비율로 계산)
  const toEl=ohaeng.find(o=>o.el==='토')
  const singanScore=toEl?Math.round(toEl.pct/100*7):3

  // ── 질문 선택 단계 ───────────────────────────────────────────
  // 아직 질문을 안 골랐으면, 만세력·통변 대신 질문 선택 화면을 먼저 보여준다.
  // (사람 → 질문 → 결과 순서. 질문은 반드시 1개 이상 골라야 다음으로.)
  // 단, URL에 mode=chart 면 "만세력만 보기"라서 질문 선택을 건너뛴다.
  //   (마이페이지 "내 사주 보기" 등 순수 조회용 진입)
  const chartOnly = searchParams.get('mode') === 'chart'
  const ageGroup=birthYearToGroup(yearParam)
  const genderFilter=genderToFilter(gender)
  if(pickedQuestions===null && !chartOnly){
    return (
      <div style={{minHeight:'100vh',background:'#FDF6F0',maxWidth:'430px',margin:'0 auto',padding:'12px',fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif'"}}>
        <QuestionPicker
          ageGroup={ageGroup}
          gender={genderFilter}
          personName={personName||undefined}
          ageLabel={`${new Date().getFullYear()-yearParam}세`}
          onSubmit={(qs)=>setPickedQuestions(qs)}
          onBack={()=>router.back()}
        />
      </div>
    )
  }

  return (
    <div style={{minHeight:'100vh',background:'#FDF6F0',maxWidth:'430px',margin:'0 auto',fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",color:'#1a1a1a'}}>

      {/* 헤더 */}
      <div style={{position:'sticky',top:0,zIndex:50,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',background:'rgba(250,250,248,0.96)',backdropFilter:'blur(10px)',borderBottom:'0.5px solid #f0e0d5'}}>
        <button onClick={()=>router.back()} style={{background:'none',border:'none',color:'#999',fontSize:'20px',cursor:'pointer'}}>←</button>
        <div style={{textAlign:'center'}}>
          <div style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>{titleName}</div>
          <div style={{fontSize:'9px',color:'#c8783c'}}>명연재（明然載）</div>
        </div>
        <div style={{width:'20px'}}/>
      </div>

      {/* 프로필 헤더 (피치톤) */}
      <div style={{padding:'12px 16px 0'}}>
        <div style={{background:'#fffbf7',border:'0.5px solid #f0e0d5',borderRadius:'12px',padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'11px'}}>
            <div style={{width:'42px',height:'42px',borderRadius:'50%',background:'#f5ebe2',border:'1.5px solid #e8d5c5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'19px',flexShrink:0}}>🌿</div>
            <div>
              <div style={{fontSize:'13px',fontWeight:700,color:'#96502e',marginBottom:'2px'}}>{titleName}</div>
              <div style={{fontSize:'11px',color:'#b4785a',lineHeight:1.5}}>{calLabel}{solarLabel} · {hourLabel} · {genderLabel}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'10px'}}>

        {/* ① 사주 원국 (신살 통합) */}
        <Section title="사주 원국">
          <SajuWonguk saju={saju} dayStem={dayStem} yeonjji={yeonjji} iljji={iljji} gm1={gm1} gm2={gm2}/>
        </Section>

        {/* ③ 오행과 십성 분석 */}
        <Section title="오행과 십성 분석" collapsible={!chartOnly} open={openSection==='ohaeng'} onToggle={()=>toggleSection('ohaeng')}>
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

        {/* ③-2 유파별 관점 비교 (독립 부품) */}
        {ohaeng.length>0 && <SchoolCompare ohaeng={ohaeng}/>}

        {/* ④ 신강/신약 */}
        <Section title="신강 · 신약" collapsible={!chartOnly} open={openSection==='singang'} onToggle={()=>toggleSection('singang')}>
          {dayStem && (
            <SingangTable
              ilganEl={STEM_ELEMENT[dayStem] as '목'|'화'|'토'|'금'|'수'}
              ilganName={STEM_KOR[dayStem]||dayStem}
              ohaeng={ohaeng}
            />
          )}
        </Section>

        {/* ⑤ 용신 · 희신 · 기신 */}
        {yongsinResult&&(
        <Section title="용신 · 희신 · 기신" collapsible={!chartOnly} open={openSection==='yongsin'} onToggle={()=>toggleSection('yongsin')}>
          <YongsinCard
            yongsin={yongsinResult.yongsin}
            heeksin={yongsinResult.heeksin}
            gisin={yongsinResult.gisin}
            description={yongsinResult.description}
          />
        </Section>
        )}

        {/* ⑥ 대운 (홈 「대운」 서비스에도 있음) */}
        {dayStem&&monthGanji&&yearStem&&solarYear&&(
          <Section title="대운 (10년 흐름)" collapsible={!chartOnly} open={openSection==='daeun'} onToggle={()=>toggleSection('daeun')} hint="홈 「대운」에도 있어요">
            <DayunTableNew
              solarYear={solarYear} solarMonth={solarMonth} solarDay={solarDay}
              birthYear={yearParam} gender={gender}
              monthGanji={monthGanji} yearStem={yearStem}
              dayStem={dayStem} currentYear={currentYear}
              ilgan={dayStem} yeonjji={yeonjji} iljji={iljji}
            />
          </Section>
        )}

        {/* ⑦ 세운 (홈 「연도별운세」에도 있음) */}
        {displaySeyun.length>0&&(
          <Section title="세운 (연운)" collapsible={!chartOnly} open={openSection==='seyun'} onToggle={()=>toggleSection('seyun')} hint="홈 「연도별운세」에도 있어요">
            <UnTable
              title="세운 (연운)"
              badge={`${currentYear}년`}
              items={displaySeyun.map(s=>({
                label:String(s.year),
                stem:s.cheongan, branch:s.jiji,
                stemSipsin:s.ganYukchin, branchSipsin:s.jiYukchin,
                current:s.year===currentYear,
              }))}
            />
          </Section>
        )}

        {/* ⑧ 월운 */}
        {wolunList.length>0&&(
          <Section title="월운 (이번 해 달별)" collapsible={!chartOnly} open={openSection==='wolun'} onToggle={()=>toggleSection('wolun')}>
            <UnTable
              title="월운"
              badge={`${currentYear}년`}
              items={wolunList.map(w=>({
                label:`${w.month}월`,
                stem:w.cheongan, branch:w.jiji,
                stemSipsin:w.ganYukchin, branchSipsin:w.jiYukchin,
                current:new Date().getMonth()+1===w.month,
              }))}
            />
          </Section>
        )}

        {/* ⑨ AI 통변 (고른 질문 기반). mode=chart(만세력만)면 통변 없음 */}
        {!chartOnly && pickedQuestions && dayStem && ohaeng.length>0 && (
          <div style={{marginTop:'10px'}}>
            <TongbyeonView
              input={toTongbyeonInput({
                name: personName || (titleName.includes('나의')?'나':titleName.replace('님의 만세력','')),
                gender,
                age: new Date().getFullYear()-yearParam,
                saju,
                dayStem,
                ohaeng,
                yongsin: yongsinResult,
                hourBranch,
              })}
              questions={pickedQuestions}
              premium={isPaid}
              onBack={()=>setPickedQuestions(null)}
            />
          </div>
        )}

        {/* ⑩ 상담 버튼 */}
        <div style={{background:'#fff',border:'0.5px solid #f0e0d5',borderRadius:'14px',padding:'12px',marginTop:'10px'}}>
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
      <div style={{minHeight:'100vh',background:'#FDF6F0',display:'flex',alignItems:'center',justifyContent:'center'}}>
        <div style={{color:'#c8783c',fontSize:'14px'}}>로딩 중...</div>
      </div>
    }>
      <ResultNewContent/>
    </Suspense>
  )
}
