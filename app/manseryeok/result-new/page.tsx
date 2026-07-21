"use client";

import { useState, Suspense, useEffect } from "react";
import { EL_BG as ELEMENT_BG, EL_TEXT as ELEMENT_COLOR, EL_C, EL_C_SUB, EL_HAN as OH_HAN } from '@/lib/saju/ohaengColor'
import { useSearchParams, useRouter } from "next/navigation";
import { useResultSaju } from "@/hooks/useResultSaju";
import { supabase } from "@/lib/supabase";
import { fromProfile, fromUrl, type MyInfo } from "@/lib/saju/myInfo";
import { saveRecord, getRecord } from "@/lib/saju/sajuRecords";
import { getUnsung, getSinsal, unsungColor, getGongmang, SINSAL_HIGHLIGHT } from "@/lib/saju";

import { calcYongsinNew, calcYongsinCompat } from "@/lib/saju/yongsinNew";
import { calcHapchungScore } from "@/lib/saju/hapchungScore";
import { calcSimsanOhaeng, toPercentList, seasonConvertNote } from "@/lib/saju/simsanOhaeng";
import AiAnalysisNew from "./components/AiAnalysisNew";
import { withNim, nimEuiTitle } from "@/lib/saju/honorific";
import ConsultButton from "@/app/components/common/ConsultButton";
import OhaengPentagon from "./OhaengPentagon";
import HapchungView from "./HapchungView";
import ExpertDetail from "./ExpertDetail";
import SipsungTable from "./SipsungTable";
import UnseFlow from "./UnseFlow";
import SingangTable from "./SingangTable";
import QuestionPicker from "../components/QuestionPicker";
import TongbyeonView from "../components/TongbyeonView";
import CopyTextButton from '@/app/components/common/CopyTextButton';
import { birthYearToGroup, genderToFilter, type SajuQuestion } from "@/lib/saju/questions";
import { type UnseEntry } from "@/lib/saju/unseQuestions";
import { toTongbyeonInput } from "@/lib/saju/toTongbyeonInput";
import YongsinCard from "./YongsinCard";
import SajuWonguk from "./SajuWonguk";

const BRANCH_LIST = [{char:"子"},{char:"丑"},{char:"寅"},{char:"卯"},{char:"辰"},{char:"巳"},{char:"午"},{char:"未"},{char:"申"},{char:"酉"},{char:"戌"},{char:"亥"}]
const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const STEM_KOR: Record<string,string> = {甲:'갑목',乙:'을목',丙:'병화',丁:'정화',戊:'무토',己:'기토',庚:'경금',辛:'신금',壬:'임수',癸:'계수'}
const BRANCH_ELEMENT: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}
const BRANCH_YIN: Record<string,boolean> = {子:true,丑:true,寅:false,卯:true,辰:false,巳:false,午:true,未:true,申:false,酉:true,戌:false,亥:false}
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
  // 배경이 진한 오행색이라 글씨는 EL_C(흰색, 금만 검정)를 쓴다
  const color=el?EL_C[el]:'#888'
  const sub=el?EL_C_SUB[el]:'#888'
  const bd=el?ELEMENT_COLOR[el]:'#ddd'
  const bg=el?ELEMENT_BG[el]:'#f5f5f5'
  return (
    <div style={{
      width:'100%',height:'52px',borderRadius:'8px',
      background:isDay?'#fff3e9':bg,
      border:isGongmang?'1.5px solid #f44336':isDay?'1.5px solid #e8d5c5':`1px solid ${bd}`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      position:'relative' as const,gap:'1px',
    }}>
      {isGongmang&&<span style={{position:'absolute' as const,top:'2px',right:'4px',fontSize:'8px',color:'#f44336',fontWeight:700}}>空</span>}
      <span style={{fontSize:'24px',fontWeight:700,color,lineHeight:1}}>{char}</span>
      {el&&<span style={{fontSize:'10.5px',fontWeight:600,color:sub}}>{OH_HAN[el]}</span>}
    </div>
  )
}

// 세운/월운 간지 박스
function SmallGanjiBox({char,el,isCurrent,size=36}:{char:string;el:string;isCurrent?:boolean;size?:number}) {
  const color=el?EL_C[el]:'#888'
  const sub=el?EL_C_SUB[el]:'#888'
  const bd=el?ELEMENT_COLOR[el]:'#ddd'
  const bg=el?ELEMENT_BG[el]:'#f5f5f5'
  return (
    <div style={{
      width:`${size}px`,height:`${size}px`,borderRadius:'7px',
      background:isCurrent?'rgba(255,255,255,0.15)':bg,
      border:`1px solid ${bd}`,
      display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
      position:'relative' as const,
    }}>
      <span style={{fontSize:`${size*0.5}px`,fontWeight:700,color:isCurrent?'#fff':color,lineHeight:1}}>{char}</span>
      {el&&<span style={{fontSize:'9px',fontWeight:600,color:isCurrent?'rgba(255,255,255,0.6)':sub,position:'absolute' as const,bottom:'1px',right:'3px'}}>{OH_HAN[el]}</span>}
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

  // ── 보관함 저장 (2026-07-21 2차: 수동 → 자동) ──
  //   통변이 완성되면 자동으로 saju_records에 기록한다.
  //   [왜] 고객이 저장 버튼을 안 누르고 나가면 돈 주고 본 결과가 사라진다.
  //        결과가 뜨는 순간 남겨두면 그냥 나가도 보관함에서 다시 볼 수 있다.
  //   service_type은 unse에 따라 saju/daeun/seyun. 다시보기(recordId)면 이미 저장된 것.
  //   ⚠️ 같은 사주를 여러 번 봐도 그대로 쌓는다(대표님 확정). 중복 제거하지 않는다.
  const recordIdParam = searchParams.get('recordId') || undefined
  const [saveState,setSaveState]=useState<'idle'|'saving'|'saved'|'failed'>(recordIdParam?'saved':'idle')
  // ── 통변 스냅샷 ──
  //   새 조회: TongbyeonView가 완성한 통변을 tongText로 받아 저장에 쓴다.
  //   다시보기(recordId): getRecord로 저장된 통변(savedTong)·질문을 불러와 그대로 표시.
  const [tongText,setTongText]=useState('')
  const [savedTong,setSavedTong]=useState<string|undefined>(undefined)
  // recordId면 스냅샷 로드가 끝날 때까지 질문선택/결과를 잠깐 보류
  const [recordLoading,setRecordLoading]=useState(!!recordIdParam)

  // ── 사주 원국 아코디언 (기본 펼침. 표가 커서 접을 수 있게) ──
  const [wongukOpen,setWongukOpen]=useState(true)
  const [hapchungOn,setHapchungOn]=useState(false)

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

  // ── 보관함 다시보기: recordId 있으면 저장된 스냅샷(질문+통변) 로드 ──
  //   질문 선택을 건너뛰고, 저장된 통변을 AI 재호출 없이 그대로 보여준다.
  useEffect(()=>{
    if(!recordIdParam){ setRecordLoading(false); return }
    let cancelled=false
    getRecord(recordIdParam).then(rec=>{
      if(cancelled) return
      const snap = rec?.resultData as { tongText?: string; questions?: SajuQuestion[] } | undefined
      if(snap?.questions && snap.questions.length>0){
        setPickedQuestions(snap.questions)   // 질문선택 건너뜀
      } else {
        // 예전(구버전) 기록: 스냅샷이 없으면 빈 배열 → 질문선택 없이 만세력만 표시
        setPickedQuestions([])
      }
      setSavedTong(snap?.tongText || '')     // 저장된 통변(없으면 빈 문자열)
      setSaveState('saved')
      setRecordLoading(false)
    }).catch(()=>{ if(!cancelled){ setPickedQuestions([]); setRecordLoading(false) } })
    return ()=>{cancelled=true}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[recordIdParam])

  const gender=info?.gender||"남"
  const calType=info?.calType||"양력"
  const yearParam=info?parseInt(info.year):0
  const monthParam=info?parseInt(info.month):0
  const dayParam=info?parseInt(info.day):0
  const leapMonth=info?.leapMonth||"0"
  const hourIdx=info?(info.hour==="모름"?null:parseInt(info.hour)):null
  const currentYear=new Date().getFullYear()

  // 제목용 이름: URL에 name이 있으면 "OO님의 만세력", 없으면 "나의 만세력"
  // 시간운 진입(?unse=daeun|seyun)이면 "만세력" 대신 "대운/세운"으로.
  const personName=searchParams.get("name")||""
  const _unse=searchParams.get("unse")
  const _kindLabel=_unse==="daeun"?"대운":_unse==="seyun"?"세운":"만세력"
  const titleName=nimEuiTitle(personName,_kindLabel)
  // 프로필 카드에는 제목을 되풀이하지 않고 "누구인지"만 적는다.
  const cardName=personName?withNim(personName):"나"

  const {saju,solar,converting:converting0,dayStem,monthGanji,yearStem,iljji,yeonjji}=
    useResultSaju(calType,yearParam,monthParam,dayParam,leapMonth,hourIdx)
  const converting=converting0||loadingInfo||recordLoading

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
  const monthBranchForNote=saju.find(p=>p.pillar==="월주")?.branch??null
  const ohaeng=saju.length>0?toPercentList(calcSimsanOhaeng(saju,solarMonth,solarDay,hourBranch)):[]
  const sipsung=saju.length>0&&dayStem?calcSipsung(saju,dayStem):[]
  const calLabel=`${calType} ${yearParam}.${monthParam}.${dayParam}${calType==="음력"&&leapMonth==="1"?" (윤달)":""}`
  const solarLabel=calType==="음력"&&solar?` (양력 ${solar.year}.${solar.month}.${solar.day})`:" "
  const hourLabel=hourIdx===null?"시 미지정":`${BRANCH_LIST[hourIdx]?.char}시`
  const genderLabel=gender==="여"?"여성":"남성"

  // 용신 계산 — 화면 표시는 심산 3종 용신(yongsinNew), 통변은 기존 형식(호환)
  //   ★ 심산 오행 점수를 넘겨 준다. 이래야 월지 계절 치환(丑월=水, 未월=火 등)이
  //     억부용신 판정에 반영된다. (연재쌤 확정: 표 기준으로 계절 치환이 맞다)
  const simsanScore = saju.length>0 ? calcSimsanOhaeng(saju,solarMonth,solarDay,hourBranch) : null
  const yongsinBase=saju.length>0&&dayStem?calcYongsinNew(saju,dayStem,simsanScore ?? undefined):null
  // 전문가 모드(?pro=1)에서 합충 토글 ON이면 합충 반영 점수로 재계산
  const isPro = searchParams.get('pro') === '1'
  const yongsinHap=isPro&&saju.length>0&&dayStem
    ? calcYongsinNew(saju,dayStem,calcHapchungScore(saju).score)
    : null
  const yongsinNew = (isPro && hapchungOn && yongsinHap) ? yongsinHap : yongsinBase
  // 통변에 넘길 용신 — 화면 표시와 같은 심산 점수 기준으로 계산한다.
  const yongsinResult=saju.length>0&&dayStem
    ?calcYongsinCompat(saju,dayStem,solarMonth,solarDay,hourBranch)
    :null

  // 신강/신약 점수 (임시: 토 비율로 계산)
  const toEl=ohaeng.find(o=>o.el==='토')
  const singanScore=toEl?Math.round(toEl.pct/100*7):3

  // ── 질문 선택 단계 ───────────────────────────────────────────
  // 아직 질문을 안 골랐으면, 만세력·통변 대신 질문 선택 화면을 먼저 보여준다.
  // (사람 → 질문 → 결과 순서. 질문은 반드시 1개 이상 골라야 다음으로.)
  // 단, URL에 mode=chart 면 "만세력만 보기"라서 질문 선택을 건너뛴다.
  //   (마이페이지 "내 사주 보기" 등 순수 조회용 진입)
  const chartOnly = searchParams.get('mode') === 'chart'
  // 시간운 진입: ?unse=daeun | seyun 이면 사주 대신 대운/세운 질문·통변으로.
  //   없으면(=undefined) 기존 사주 통변 그대로.
  const unseParam = searchParams.get('unse')
  const unseEntry: UnseEntry | undefined =
    unseParam === 'daeun' || unseParam === 'seyun' ? unseParam : undefined

  // ── 보관함 저장 핸들러 ──
  //   service_type: 대운=daeun, 세운=seyun, 그 외=saju.
  //   info(사람 사주정보)를 input_data로, 이름을 title로 저장.
  //   ★통변 텍스트는 인자로 받는다. 자동 저장 시점에는 setTongText 가 아직
  //     state 에 반영되기 전이라 tongText 를 읽으면 빈 값이 저장된다.
  async function handleSaveRecord(tongOverride?: string){
    if(!info || (saveState!=='idle' && saveState!=='failed')) return
    setSaveState('saving')
    const serviceType = unseParam==='daeun' ? 'daeun' : unseParam==='seyun' ? 'seyun' : 'saju'
    const res = await saveRecord({
      serviceType,
      title: personName || '나',
      inputData: {
        gender: info.gender, calType: info.calType,
        year: info.year, month: info.month, day: info.day,
        leapMonth: info.leapMonth || '0', hour: info.hour || '모름',
      },
      // 결과 스냅샷 — 다시보기용. 통변 텍스트 + 고른 질문을 그대로 저장한다.
      //   (AI 재호출 없이 예전 통변을 복원하기 위함)
      resultData: {
        tongText: tongOverride ?? tongText,
        questions: pickedQuestions || [],
      },
    })
    // ★실패해도 alert 로 막지 않는다. 자동 저장이라 고객이 부른 게 아니다.
    //   화면에 [다시 저장] 버튼으로 알린다. (14부 "조용히 실패하는 코드" 방지)
    setSaveState(res.ok ? 'saved' : 'failed')
  }

  const ageGroup=birthYearToGroup(yearParam)
  const genderFilter=genderToFilter(gender)
  // recordId(다시보기)면 질문선택을 건너뛴다. (스냅샷 로드가 pickedQuestions를 채움)
  if(pickedQuestions===null && !chartOnly && !recordIdParam){
    return (
      <div style={{minHeight:'100vh',background:'#FDF6F0',maxWidth:'430px',margin:'0 auto',padding:'12px',fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif'"}}>
        <QuestionPicker
          ageGroup={ageGroup}
          gender={genderFilter}
          personName={personName||undefined}
          ageLabel={`${new Date().getFullYear()-yearParam}세`}
          unseEntry={unseEntry}
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
        </div>
        {/* 저장 버튼은 하단으로 이동. 헤더 균형용 빈 칸. */}
        <div style={{width:'20px'}}/>
      </div>

      {/* 프로필 헤더 (피치톤) */}
      <div style={{padding:'12px 16px 0'}}>
        <div style={{background:'#fffbf7',border:'0.5px solid #f0e0d5',borderRadius:'12px',padding:'16px'}}>
          <div style={{display:'flex',alignItems:'center',gap:'11px'}}>
            <div style={{width:'42px',height:'42px',borderRadius:'50%',background:'#f5ebe2',border:'1.5px solid #e8d5c5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'19px',flexShrink:0}}>🌿</div>
            <div>
              <div style={{fontSize:'13px',fontWeight:700,color:'#96502e',marginBottom:'2px'}}>{cardName}</div>
              <div style={{fontSize:'11px',color:'#b4785a',lineHeight:1.5}}>{calLabel}{solarLabel} · {hourLabel} · {genderLabel}</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{padding:'10px'}}>

        {/* 전문가 모드: 전문가 상세 토글 (?pro=1일 때만) */}
        {isPro && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fff3e9',border:'0.5px solid #e8d5c5',borderRadius:'12px',padding:'11px 14px',marginBottom:'10px'}}>
            <div>
              <span style={{fontSize:'12px',fontWeight:700,color:'#96502e'}}>전문가 상세</span>
              <span style={{fontSize:'10px',color:'#c5a590',marginLeft:'8px'}}>{hapchungOn?'지장간·납음·신살·형충회합 표시 중':'켜면 상세 정보가 모두 나와요'}</span>
            </div>
            <div onClick={()=>setHapchungOn(v=>!v)}
              style={{width:'42px',height:'24px',borderRadius:'12px',background:hapchungOn?'#b46e46':'#ddd',position:'relative',cursor:'pointer',transition:'background 0.15s',flexShrink:0}}>
              <div style={{width:'18px',height:'18px',borderRadius:'50%',background:'#fff',position:'absolute',top:'3px',left:hapchungOn?'21px':'3px',transition:'left 0.15s'}}/>
            </div>
          </div>
        )}

        {/* ① 사주 원국 (신살 통합) — 표가 커서 아코디언(기본 펼침). */}
        <Section title="사주 원국" collapsible open={wongukOpen} onToggle={()=>setWongukOpen(v=>!v)} hint="펼쳐보기">
          <div style={{background:'#fff',padding:'2px'}}>
            <SajuWonguk saju={saju} dayStem={dayStem} yeonjji={yeonjji} iljji={iljji} gm1={gm1} gm2={gm2}/>
          </div>
        </Section>

        {/* ①-2 전문가 상세 (전문가 모드 + 토글 ON) — 지장간·납음·운성/신살 2기준·귀인·공망·형충회합 */}
        {isPro && hapchungOn && saju.length>0 && (
          <Section title="전문가 상세" collapsible={!chartOnly} open={openSection==='expert'} onToggle={()=>toggleSection('expert')}>
            <ExpertDetail
              saju={saju}
              dayStem={dayStem}
              yearStem={yearStem}
              yeonjji={yeonjji}
              iljji={iljji}
              monthBranch={saju.find(p=>p.pillar==='월주')?.branch || ''}
            />
          </Section>
        )}
        <Section title="오행과 십성 분석" collapsible={!chartOnly} open={openSection==='ohaeng'} onToggle={()=>toggleSection('ohaeng')}>
          {/* 계산 기준 안내 — 합충 반영 그래프와 숫자가 다른 이유 */}
          <div style={{fontSize:'10.5px',color:'#b4785a',background:'#faf3ec',border:'0.5px solid #f0e0d5',borderRadius:'8px',padding:'7px 10px',marginBottom:'10px',lineHeight:1.6}}>
            진로·적성·성격은 <b style={{color:'#96502e'}}>계절 치환</b>으로, 건강·궁합은 오행 그대로 봐요.
            {(() => {
              const note = saju.length>0 && monthBranchForNote
                ? seasonConvertNote(monthBranchForNote, solarMonth, solarDay, hourBranch ?? '')
                : null
              return note ? (
                <div style={{marginTop:'5px',color:'#c8783c'}}>↳ {note}</div>
              ) : null
            })()}
          </div>
          {/* 오각형 그래프(왼쪽) + 십성표(오른쪽) 나란히 */}
          <div style={{display:'flex',gap:'6px',alignItems:'center',marginBottom:'12px'}}>
            <div style={{flex:1.45,minWidth:0}}>
              <OhaengPentagon ohaeng={ohaeng} dayElement={yongsinNew?.dayElement}/>
            </div>
            <div style={{flex:0.55,minWidth:0}}>
              <SipsungTable sipsung={sipsung}/>
            </div>
          </div>
        </Section>

        {/* ③-2 합충 반영 (전문가 모드 + 토글 ON) */}
        {isPro && hapchungOn && saju.length>0 && (
          <Section title="합충 반영 오행" collapsible={!chartOnly} open={openSection==='hapchung'} onToggle={()=>toggleSection('hapchung')}>
            <HapchungView saju={saju}/>
          </Section>
        )}

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

        {/* ⑤ 나의 용신 (조후·억부·격국 3종) */}
        {yongsinNew&&(
        <Section title="나의 용신" collapsible={!chartOnly} open={openSection==='yongsin'} onToggle={()=>toggleSection('yongsin')}>
          <YongsinCard result={yongsinNew} saju={saju}/>
        </Section>
        )}

        {/* ⑥ 대운·세운·월운·일운 (연동 흐름) */}
        {dayStem&&monthGanji&&yearStem&&solarYear&&(
          <Section title="운의 흐름 (대운·세운·월운·일운)" collapsible={!chartOnly} open={openSection==='daeun'} onToggle={()=>toggleSection('daeun')} hint="눌러서 흐름 보기">
            <UnseFlow
              solarYear={solarYear} solarMonth={solarMonth} solarDay={solarDay}
              monthGanji={monthGanji} yearStem={yearStem} dayStem={dayStem}
              gender={gender} birthYear={yearParam} currentYear={currentYear}
            />
          </Section>
        )}

        {/* ⑨ AI 통변 (고른 질문 기반). mode=chart(만세력만)면 통변 없음.
            다시보기(recordId)면 저장된 통변·질문이 있을 때만(구버전 기록은 통변 숨김). */}
        {!chartOnly && pickedQuestions && pickedQuestions.length>0 && dayStem && ohaeng.length>0 &&
          (!recordIdParam || (savedTong && savedTong.length>0)) && (
          <div style={{marginTop:'10px'}}>
            <TongbyeonView
              input={toTongbyeonInput({
                name: personName || '나',
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
              unseEntry={unseEntry}
              savedText={savedTong}
              onComplete={(t)=>{
                setTongText(t)
                // ★통변이 완성되면 바로 보관함에 저장한다. (2026-07-21 2차)
                //   다시보기(recordId)면 이미 'saved' 라 handleSaveRecord 가 그냥 빠져나온다.
                //   t 를 인자로 넘기는 이유는 setTongText 가 아직 반영되기 전이기 때문.
                if (t && t.trim()) handleSaveRecord(t)
              }}
              onBack={()=>setPickedQuestions(null)}
            />
          </div>
        )}

        {/* ⑩ 보관함 저장 상태 — 자동 저장이라 누르는 버튼이 아니다. (2026-07-21 2차)
            [왜 자동인가] 고객이 저장을 안 누르고 나가면 돈 주고 본 결과가 사라진다.
            실패했을 때만 [다시 저장]으로 바뀌어 눌러서 재시도할 수 있다. */}
        {/* ★해설 복사 — 카톡 등에 붙여넣기 (공용 부품) */}
        {!chartOnly && (
          <CopyTextButton
            text={tongText || savedTong}
            label={_unse === 'daeun' ? '대운 풀이' : _unse === 'seyun' ? '연월운세 풀이' : '사주 풀이'}
            name={personName || undefined}
          />
        )}

        {info && !chartOnly && (saveState==='saved' || saveState==='failed') && (
          <div style={{marginTop:'12px'}}>
            {saveState==='saved' ? (
              <>
                <div style={{
                  width:'100%',padding:'13px 0',borderRadius:'12px',
                  background:'#eef5e8',color:'#4a7a3a',
                  fontSize:'14px',fontWeight:500,textAlign:'center',
                }}>
                  ✓ 보관함에 저장됐어요
                </div>
                <div style={{fontSize:'11px',color:'#6b5340',textAlign:'center',marginTop:'7px'}}>
                  보관함에서 언제든 다시 볼 수 있어요
                </div>
              </>
            ) : (
              <>
                <button onClick={()=>handleSaveRecord()}
                  style={{
                    width:'100%',padding:'15px 0',borderRadius:'12px',border:'none',
                    background:'#b46e46',color:'#fff',
                    fontSize:'15px',fontWeight:600,cursor:'pointer',
                  }}>
                  💾 다시 저장하기
                </button>
                <div style={{fontSize:'11px',color:'#8f3d0e',textAlign:'center',marginTop:'7px'}}>
                  보관함에 저장하지 못했어요. 한 번 더 눌러주세요
                </div>
              </>
            )}
          </div>
        )}

        {/* ⑪ 상담 버튼 — 홈 "내 사주 자세히 보기"(mode=chart)로 들어온 만세력 화면에서는 감춘다.
            홈 서비스 목록(사주·대운·연월운세)으로 들어온 경우에는 그대로 보인다.
            ★2026-07-21 2차: 저장 표시 아래로 옮겼다.
              ConsultButton 만 감싸므로, 관리자 > 가격 관리에서 '노출'을 끄면
              버튼이 스스로 null 을 돌려주어 이 영역이 통째로 사라진다. */}
        {!chartOnly && (
          <div style={{marginTop:'10px',marginBottom:'80px'}}>
            <ConsultButton priceKey="saju" mode="personal" searchParams={searchParams}
              /* ★고객이 본 통변을 상담사에게 넘긴다 (2026-07-21)
                 새 조회면 tongText, 보관함 다시보기면 savedTong 을 쓴다.
                 유료 결제분이면 ai_analysis, 아니면 ai_free_analysis 로 담는다. */
              payload={() => {
                const text = (tongText || savedTong || '').trim()
                if (!text) return null
                return isPaid ? { aiAnalysis: text } : { aiFreeAnalysis: text }
              }}
            />
          </div>
        )}

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
