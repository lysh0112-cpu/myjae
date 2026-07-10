'use client'

import { getUnsung, unsungColor, getGongmang } from '@/lib/saju'
import { GAN_COLOR, JI_COLOR } from '@/lib/saju/constants'

const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const BRANCH_ELEMENT: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}
const BRANCH_YIN: Record<string,boolean> = {子:true,丑:true,寅:false,卯:true,辰:false,巳:false,午:true,未:true,申:false,酉:true,戌:false,亥:false}
const HEAVENLY_STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']

const ELEMENT_STYLE: Record<string,{color:string;bg:string}> = {
  목:{color:'#2e7d32',bg:'#e8f5e9'},
  화:{color:'#c62828',bg:'#ffebee'},
  토:{color:'#795548',bg:'#efebe9'},
  금:{color:'#f57f17',bg:'#fff8e1'},
  수:{color:'#1565c0',bg:'#e3f2fd'},
}

const SIPSIN_COLOR: Record<string,string> = {
  비견:'#607d8b',겁재:'#607d8b',
  식신:'#2e7d32',상관:'#388e3c',
  편재:'#8B6914',정재:'#a07820',
  편관:'#c62828',정관:'#d32f2f',
  편인:'#1565c0',정인:'#1976d2',
}

function getSipsin(dayStem:string, targetStem:string): string {
  if (!targetStem||targetStem==='?') return ''
  const dayIdx=HEAVENLY_STEMS.indexOf(dayStem), targetIdx=HEAVENLY_STEMS.indexOf(targetStem)
  const de=STEM_ELEMENT[dayStem], te=STEM_ELEMENT[targetStem]
  const sameYin=(dayIdx%2)===(targetIdx%2)
  const gen:Record<string,string>={목:'화',화:'토',토:'금',금:'수',수:'목'}
  const ctl:Record<string,string>={목:'토',화:'금',토:'수',금:'목',수:'화'}
  if(de===te) return sameYin?'비견':'겁재'
  if(gen[de]===te) return sameYin?'식신':'상관'
  if(ctl[de]===te) return sameYin?'편재':'정재'
  if(ctl[te]===de) return sameYin?'편관':'정관'
  if(gen[te]===de) return sameYin?'편인':'정인'
  return ''
}

function getSipsinBranch(dayStem:string, branch:string): string {
  if (!branch||branch==='?') return ''
  const be=BRANCH_ELEMENT[branch], de=STEM_ELEMENT[dayStem]
  const dayYin=HEAVENLY_STEMS.indexOf(dayStem)%2===1
  const sameYin=dayYin===BRANCH_YIN[branch]
  const gen:Record<string,string>={목:'화',화:'토',토:'금',금:'수',수:'목'}
  const ctl:Record<string,string>={목:'토',화:'금',토:'수',금:'목',수:'화'}
  if(de===be) return sameYin?'비견':'겁재'
  if(gen[de]===be) return sameYin?'식신':'상관'
  if(ctl[de]===be) return sameYin?'편재':'정재'
  if(ctl[be]===de) return sameYin?'편관':'정관'
  if(gen[be]===de) return sameYin?'편인':'정인'
  return ''
}

const PILLAR_LABELS = ['시주','일주','월주','년주']
const PILLAR_SUBLABELS = ['생시','생일','생월','생년']

interface Props {
  saju: {pillar:string;stem:string;branch:string}[]
  dayStem: string
}

export default function SajuMyungsikNew({saju, dayStem}: Props) {
  const ilgan = dayStem
  const iljji = saju[1]?.branch ?? ''
  const [gm1, gm2] = ilgan && iljji ? getGongmang(ilgan, iljji) : ['','']

  return (
    <div style={{
      background:'#fff', border:'0.5px solid #e8e5de',
      borderRadius:'20px', overflow:'hidden',
      fontFamily:"'Apple SD Gothic Neo','Noto Sans KR',sans-serif",
    }}>
      {/* 헤더 */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'14px 18px 12px',borderBottom:'0.5px solid #f5f3ef'}}>
        <span style={{color:'#8B6914',fontSize:'14px'}}>✦</span>
        <span style={{fontSize:'14px',fontWeight:700,color:'#1a1a1a'}}>사주 원국</span>
        {gm1 && (
          <span style={{marginLeft:'auto',fontSize:'10px',color:'#c62828',background:'#ffebee',border:'0.5px solid #f5c0c8',padding:'2px 8px',borderRadius:'8px',fontWeight:600}}>
            공망 {gm1}·{gm2}
          </span>
        )}
      </div>

      {/* 4주 표 */}
      <div style={{padding:'14px 12px 8px'}}>

        {/* 컬럼 헤더 (생시/생일/생월/생년) */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'6px'}}>
          {PILLAR_SUBLABELS.map((sub,i)=>(
            <div key={i} style={{textAlign:'center',fontSize:'10px',color:'#bbb',fontWeight:500}}>{sub}</div>
          ))}
        </div>

        {/* 천간 십성 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'4px'}}>
          {saju.map(({pillar,stem},i)=>{
            const isIlju = pillar==='일주'
            const ss = isIlju ? '본원' : getSipsin(dayStem,stem)
            return (
              <div key={i} style={{textAlign:'center',fontSize:'10px',fontWeight:700,height:'16px',color:isIlju?'#8B6914':(SIPSIN_COLOR[ss]||'transparent')}}>
                {ss||''}
              </div>
            )
          })}
        </div>

        {/* 천간 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'4px'}}>
          {saju.map(({pillar,stem},i)=>{
            const isIlju=pillar==='일주'
            const el=STEM_ELEMENT[stem]
            const elStyle=el?ELEMENT_STYLE[el]:{color:'#bbb',bg:'#f5f5f5'}
            const isGongmang = stem!=='?' && (gm1||gm2) && false
            return (
              <div key={i} style={{
                background:isIlju?'#fffbee':'#fafaf8',
                border:isIlju?'1.5px solid #e8d5a0':'0.5px solid #eeebe4',
                borderRadius:'12px',padding:'10px 4px',
                display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',
              }}>
                <span style={{
                  fontSize:'28px',fontWeight:700,lineHeight:1,
                  color:stem==='?'?'#ddd':(GAN_COLOR[stem]??'#1a1a1a'),
                }}>{stem}</span>
                {el&&<span style={{fontSize:'9px',fontWeight:700,color:elStyle.color,background:elStyle.bg,padding:'1px 6px',borderRadius:'6px'}}>{el}</span>}
              </div>
            )
          })}
        </div>

        {/* 지지 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'4px'}}>
          {saju.map(({pillar,branch},i)=>{
            const el=BRANCH_ELEMENT[branch]
            const elStyle=el?ELEMENT_STYLE[el]:{color:'#bbb',bg:'#f5f5f5'}
            const isGongmang=branch===gm1||branch===gm2
            return (
              <div key={i} style={{
                background:'#fafaf8',
                border:isGongmang?'1.5px solid #f5c0c8':'0.5px solid #eeebe4',
                borderRadius:'12px',padding:'10px 4px',
                display:'flex',flexDirection:'column',alignItems:'center',gap:'4px',
                position:'relative' as const,
              }}>
                {isGongmang&&<span style={{position:'absolute' as const,top:'3px',right:'5px',fontSize:'8px',color:'#c62828',fontWeight:700}}>空</span>}
                <span style={{
                  fontSize:'28px',fontWeight:600,lineHeight:1,
                  color:branch==='?'?'#ddd':(JI_COLOR[branch]??'#444'),
                }}>{branch}</span>
                {el&&<span style={{fontSize:'9px',fontWeight:700,color:elStyle.color,background:elStyle.bg,padding:'1px 6px',borderRadius:'6px'}}>{el}</span>}
              </div>
            )
          })}
        </div>

        {/* 12운성 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'4px'}}>
          {saju.map(({branch},i)=>{
            const u=dayStem?getUnsung(dayStem,branch):''
            return (
              <div key={i} style={{textAlign:'center',fontSize:'10px',fontWeight:600,height:'16px',color:unsungColor(u)}}>
                {u}
              </div>
            )
          })}
        </div>

        {/* 지지 십성 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'8px'}}>
          {saju.map(({pillar,branch},i)=>{
            const isIlju=pillar==='일주'
            const bs=isIlju?'':getSipsinBranch(dayStem,branch)
            return (
              <div key={i} style={{textAlign:'center',fontSize:'10px',fontWeight:700,height:'16px',color:SIPSIN_COLOR[bs]||'transparent'}}>
                {bs||''}
              </div>
            )
          })}
        </div>

        {/* 기둥 이름 */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:'6px',marginBottom:'12px'}}>
          {PILLAR_LABELS.map((l,i)=>(
            <div key={i} style={{textAlign:'center',fontSize:'10px',color:'#bbb',fontWeight:500}}>{l}</div>
          ))}
        </div>
      </div>

      {/* 하단 요약 */}
      <div style={{
        margin:'0 12px 12px',
        background:'#fafaf8',border:'0.5px solid #eeebe4',
        borderRadius:'12px',padding:'10px 14px',
        display:'flex',justifyContent:'space-around',
      }}>
        {[
          {label:'일간', value:dayStem?`${dayStem}(${STEM_ELEMENT[dayStem]||'?'})`:'-'},
          {label:'격국', value:'건록격'},
          {label:'신강/약', value:'중화', valueColor:'#2e7d32'},
          {label:'공망', value:gm1?`${gm1}·${gm2}`:'-', valueColor:'#c62828'},
        ].map(item=>(
          <div key={item.label} style={{textAlign:'center'}}>
            <div style={{color:'#bbb',fontSize:'9px',marginBottom:'3px'}}>{item.label}</div>
            <div style={{color:item.valueColor||'#1a1a1a',fontWeight:700,fontSize:'12px'}}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
