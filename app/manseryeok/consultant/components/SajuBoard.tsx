'use client'

import { findRelations, getRelationColor } from '@/lib/saju/relations'

const STEM_ELEMENT: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
const BRANCH_ELEMENT: Record<string,string> = {子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수'}
const ELEMENT_COLOR: Record<string,string> = {목:'#4caf50',화:'#f44336',토:'#ff9800',금:'#9e9e9e',수:'#2196f3'}

const JIJANGAN: Record<string, string[]> = {
  子:['壬','癸',''],    丑:['己','癸','辛'],
  寅:['戊','丙','甲'],  卯:['甲','乙',''],
  辰:['戊','乙','癸'],  巳:['戊','庚','丙'],
  午:['丙','己','丁'],  未:['己','丁','乙'],
  申:['戊','壬','庚'],  酉:['庚','辛',''],
  戌:['戊','辛','丁'],  亥:['戊','甲','壬'],
}

interface SajuPillar { pillar: string; stem: string; branch: string }
interface Props { saju: SajuPillar[]; dayStem: string }

function getSipsin(dayStem: string, targetStem: string): string {
  if (!targetStem || targetStem === '?') return ''
  const HS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
  const SE: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
  const dayIdx = HS.indexOf(dayStem), targetIdx = HS.indexOf(targetStem)
  const de = SE[dayStem], te = SE[targetStem]
  const sameYin = (dayIdx%2)===(targetIdx%2)
  const gen: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const ctl: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  if (de===te) return sameYin?'비견':'겁재'
  if (gen[de]===te) return sameYin?'식신':'상관'
  if (ctl[de]===te) return sameYin?'편재':'정재'
  if (ctl[te]===de) return sameYin?'편관':'정관'
  if (gen[te]===de) return sameYin?'편인':'정인'
  return ''
}

const sipsinColor = (s: string) => {
  if (!s) return '#8a88a0'
  if (['비견','겁재'].includes(s)) return '#9e9e9e'
  if (['식신','상관'].includes(s)) return '#4caf50'
  if (['편재','정재'].includes(s)) return '#FAC775'
  if (['편관','정관'].includes(s)) return '#f44336'
  if (['편인','정인'].includes(s)) return '#2196f3'
  return '#8a88a0'
}

function getSipsinBranch(dayStem: string, branch: string): string {
  if (!branch || branch === '?') return ''
  const HS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
  const SE: Record<string,string> = {甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수'}
  const BY: Record<string,boolean> = {子:true,丑:true,寅:false,卯:true,辰:false,巳:true,午:false,未:true,申:false,酉:true,戌:false,亥:true}
  const be = BRANCH_ELEMENT[branch], de = SE[dayStem]
  const dayYin = HS.indexOf(dayStem)%2===1
  const sameYin = dayYin===BY[branch]
  const gen: Record<string,string> = {목:'화',화:'토',토:'금',금:'수',수:'목'}
  const ctl: Record<string,string> = {목:'토',화:'금',토:'수',금:'목',수:'화'}
  if (de===be) return sameYin?'비견':'겁재'
  if (gen[de]===be) return sameYin?'식신':'상관'
  if (ctl[de]===be) return sameYin?'편재':'정재'
  if (ctl[be]===de) return sameYin?'편관':'정관'
  if (gen[be]===de) return sameYin?'편인':'정인'
  return ''
}

export default function SajuBoard({ saju, dayStem }: Props) {
  const relations = findRelations(saju)

  return (
    <div className="rounded-2xl p-5 mb-4" style={{background:'#2C2C2A',border:'1px solid rgba(250,199,117,0.15)'}}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{color:'#FAC775',fontSize:'18px'}}>✦</span>
        <h2 className="text-base font-bold text-white">사주 명식 (전문가)</h2>
      </div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {saju.map(({pillar,stem,branch}) => {
          const se = STEM_ELEMENT[stem]
          const be = BRANCH_ELEMENT[branch]
          const isIlju = pillar === '일주'
          const stemSipsin = isIlju ? '본원' : getSipsin(dayStem, stem)
          const branchSipsin = getSipsinBranch(dayStem, branch)
          const jijangan = JIJANGAN[branch] ?? []
          return (
            <div key={pillar} className="flex flex-col items-center">
              <div className="text-[10px] mb-1 font-bold h-4" style={{color:sipsinColor(stemSipsin)}}>{stemSipsin}</div>
              <div className="w-full rounded-xl py-3 flex flex-col items-center mb-1"
                style={{background:isIlju?'rgba(250,199,117,0.15)':'rgba(60,52,137,0.3)',
                  border:`1px solid ${isIlju?'rgba(250,199,117,0.4)':'rgba(60,52,137,0.4)'}`}}>
                <span className="text-2xl font-bold" style={{color:'#FAC775'}}>{stem}</span>
                {se && <span className="text-[10px] mt-0.5 font-medium" style={{color:ELEMENT_COLOR[se]}}>{se}</span>}
              </div>
              <div className="w-full rounded-xl py-3 flex flex-col items-center mb-1"
                style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)'}}>
                <span className="text-2xl font-bold" style={{color:'#e0dce8'}}>{branch}</span>
                {be && <span className="text-[10px] mt-0.5 font-medium" style={{color:ELEMENT_COLOR[be]}}>{be}</span>}
              </div>
              <div className="w-full rounded-lg py-1.5 flex items-center justify-center gap-1 mb-1"
                style={{background:'rgba(255,255,255,0.03)',border:'1px solid rgba(255,255,255,0.06)'}}>
                {jijangan.filter(Boolean).map((g,i) => (
                  <span key={i} className="text-[11px] font-bold" style={{color:ELEMENT_COLOR[STEM_ELEMENT[g]]??'#aaa'}}>{g}</span>
                ))}
              </div>
              <div className="text-[10px] mt-0.5 font-bold h-4" style={{color:sipsinColor(branchSipsin)}}>{branchSipsin}</div>
              <div className="text-[10px] mt-1 font-medium" style={{color:'#8a88a0'}}>{pillar}</div>
            </div>
          )
        })}
      </div>

      {/* 형충회합파해 */}
      {relations.length > 0 && (
        <div className="rounded-xl p-3" style={{background:'rgba(60,52,137,0.15)',border:'1px solid rgba(60,52,137,0.3)'}}>
          <p className="text-xs font-semibold mb-2" style={{color:'rgba(250,199,117,0.8)'}}>원국 관계 (형충회합파해)</p>
          <div className="flex flex-wrap gap-2">
            {relations.map((r,i) => (
              <span key={i} className="text-xs px-2 py-1 rounded-lg font-bold"
                style={{background:'rgba(255,255,255,0.08)',color:getRelationColor(r)}}>
                {r}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
