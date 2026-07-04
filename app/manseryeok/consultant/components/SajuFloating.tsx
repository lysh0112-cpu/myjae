'use client'
import { useState, useRef, useEffect } from 'react'
import { calcSeyunList } from '@/lib/saju/dayun'
import type { DayunItem, SeyunItem } from '@/lib/saju/dayun'
import {
  sinsal12, guiinFor, guiinSummary, nabeum, gongmang, branchRelations,
} from '@/lib/saju/sajuDetail'

// ============================================================
// 사주명식 계산기 (독립 플로팅 창)
//  - page.tsx 메뉴바 "🔮 사주명식" 버튼으로 열고 닫음
//  - 창 안에서 생년월일·시·성별·양력음력을 직접 입력 → 즉석 계산
//  - 계산 엔진은 기존과 동일: /api/lunar, /api/dayun, calcSeyunList
//    (useConsultantSaju 훅이 하던 호출을 창 안에서 그대로 재현 — 엔진 불변)
//  - 신살·납음·공망·합충은 검증된 sinsal.ts 계산을 표시
//  - 고객과 무관한 독립 계산기. 제목줄 드래그 이동, X 닫기.
// ============================================================

type Props = { open: boolean; onClose: () => void }

const STEMS = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
const BRANCHES = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

// 시지 라벨 (0~11 = 자~해)
const HOUR_LABELS = [
  '子 23:30-01:30','丑 01:30-03:30','寅 03:30-05:30','卯 05:30-07:30',
  '辰 07:30-09:30','巳 09:30-11:30','午 11:30-13:30','未 13:30-15:30',
  '申 15:30-17:30','酉 17:30-19:30','戌 19:30-21:30','亥 21:30-23:30',
]

// ── 오행 / 색 ───────────────────────────────────────────────
const STEM_OH: Record<string,string> = { 甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수' }
const BRANCH_OH: Record<string,string> = { 子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수' }
const STEM_YANG: Record<string,boolean> = { 甲:true,乙:false,丙:true,丁:false,戊:true,己:false,庚:true,辛:false,壬:true,癸:false }
const OH_COLOR: Record<string,{bg:string;fg:string;bd?:string}> = {
  목:{bg:'#1f9d4d',fg:'#fff'}, 화:{bg:'#e23b3b',fg:'#fff'}, 토:{bg:'#f0c020',fg:'#3a2a00'},
  금:{bg:'#f2f2f2',fg:'#333',bd:'#ccc'}, 수:{bg:'#1a1a1a',fg:'#fff'},
}
const OH_ORDER = ['목','화','토','금','수']

const UNSEONG = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양']
const JANGSAENG: Record<string,number> = { 甲:11,丙:2,戊:2,庚:5,壬:8,乙:6,丁:9,己:9,辛:0,癸:3 }
function unseong(dayStem: string, branch: string): string {
  const start = JANGSAENG[dayStem]; const bi = BRANCHES.indexOf(branch)
  if (start === undefined || bi < 0) return ''
  const idx = STEM_YANG[dayStem] ? (bi-start+12)%12 : (start-bi+12)%12
  return UNSEONG[idx]
}
function sipsin(dayStem: string, target: string): string {
  const dO = STEM_OH[dayStem], tO = STEM_OH[target]
  if (!dO || !tO) return ''
  const same = STEM_YANG[dayStem] === STEM_YANG[target]
  const rel = (OH_ORDER.indexOf(tO) - OH_ORDER.indexOf(dO) + 5) % 5
  if (rel===0) return same?'비견':'겁재'
  if (rel===1) return same?'식신':'상관'
  if (rel===2) return same?'편재':'정재'
  if (rel===3) return same?'편관':'정관'
  return same?'편인':'정인'
}
const BRANCH_MAIN: Record<string,string> = { 子:'癸',丑:'己',寅:'甲',卯:'乙',辰:'戊',巳:'丙',午:'丁',未:'己',申:'庚',酉:'辛',戌:'戊',亥:'壬' }
function sipsinBranch(dayStem: string, branch: string): string {
  return BRANCH_MAIN[branch] ? sipsin(dayStem, BRANCH_MAIN[branch]) : ''
}
function stemStyle(stem: string): React.CSSProperties {
  const c = STEM_OH[stem] ? OH_COLOR[STEM_OH[stem]] : {bg:'#888',fg:'#fff'}
  return { background:c.bg, color:c.fg, border: c.bd ? `1px solid ${c.bd}` : '1px solid #bbb' }
}
function branchStyle(branch: string): React.CSSProperties {
  const c = BRANCH_OH[branch] ? OH_COLOR[BRANCH_OH[branch]] : {bg:'#888',fg:'#fff'}
  return { background:c.bg, color:c.fg, border: c.bd ? `1px solid ${c.bd}` : '1px solid #bbb' }
}

// 간지 문자열 파싱 (useConsultantSaju와 동일 방식)
function splitGanji(ganji: string) {
  if (!ganji) return { stem: '?', branch: '?' }
  const m = ganji.match(/\(([^)]+)\)/)
  if (m && m[1].length >= 2) return { stem: m[1][0], branch: m[1][1] }
  if (ganji.length >= 2) return { stem: ganji[0], branch: ganji[1] }
  return { stem: '?', branch: '?' }
}
function calcHourPillar(dayStem: string, hourIdx: number) {
  const dg = STEMS.indexOf(dayStem)
  const groupBase = [0,2,4,6,8,0,2,4,6,8]
  return { stem: STEMS[(groupBase[dg] + hourIdx) % 10], branch: BRANCHES[hourIdx] }
}

type Pillar = { pillar: string; stem: string; branch: string }

export default function SajuFloating({ open, onClose }: Props) {
  const [pos, setPos] = useState({ x: 90, y: 50 })
  const drag = useRef<{ dx:number; dy:number }|null>(null)

  // 입력 상태 (빈 칸으로 시작)
  const [calType, setCalType] = useState<'양력'|'음력'>('양력')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [leap, setLeap] = useState(false)          // 윤달
  const [hourIdx, setHourIdx] = useState<number|null>(null)
  const [gender, setGender] = useState<'남'|'여'>('남')

  // 계산 결과
  const [saju, setSaju] = useState<Pillar[]>([])
  const [dayStem, setDayStem] = useState('')
  const [dayunList, setDayunList] = useState<DayunItem[]>([])
  const [seyunList, setSeyunList] = useState<SeyunItem[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')
  const [tab, setTab] = useState<'십성'|'신살'|'12운성'|'형충회합'>('신살')

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!drag.current) return
      setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy })
    }
    const onUp = () => { drag.current = null }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
  }, [])

  // ── 계산 실행 (기존 엔진 그대로 호출) ──
  async function calculate() {
    const y = Number(year), m = Number(month), d = Number(day)
    if (!y || !m || !d) { setErr('생년월일을 입력하세요.'); return }
    if (m < 1 || m > 12 || d < 1 || d > 31) { setErr('월/일을 확인하세요.'); return }
    setErr(''); setLoading(true)
    try {
      let sY = y, sM = m, sD = d
      if (calType === '음력') {
        const r1 = await fetch(`/api/lunar?year=${y}&month=${m}&day=${d}&calType=음력&leapMonth=${leap ? 'true' : 'false'}`)
        const d1 = await r1.json()
        sY = d1.solarYear; sM = d1.solarMonth; sD = d1.solarDay
      }
      const res = await fetch(`/api/lunar?year=${sY}&month=${sM}&day=${sD}&calType=양력`)
      const dd = await res.json()
      const yy = splitGanji(dd.yearGanji)
      const mm = splitGanji(dd.monthGanji)
      const day2 = splitGanji(dd.dayGanji)
      const hh = hourIdx !== null ? calcHourPillar(day2.stem, hourIdx) : { stem:'?', branch:'?' }
      setDayStem(day2.stem)
      setSaju([
        { pillar:'시주', stem:hh.stem, branch:hh.branch },
        { pillar:'일주', stem:day2.stem, branch:day2.branch },
        { pillar:'월주', stem:mm.stem, branch:mm.branch },
        { pillar:'년주', stem:yy.stem, branch:yy.branch },
      ])
      // 대운 (기존 /api/dayun)
      const dr = await fetch('/api/dayun', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          solarYear:sY, solarMonth:sM, solarDay:sD,
          monthGanji: mm.stem + mm.branch, yearStem: yy.stem, gender, dayStem: day2.stem,
        }),
      })
      const dj = await dr.json()
      setDayunList(dj.dayunList || [])
      // 세운 (기존 calcSeyunList)
      setSeyunList(calcSeyunList(day2.stem, new Date().getFullYear()))
    } catch (e) {
      console.error(e); setErr('계산 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function reset() {
    setYear(''); setMonth(''); setDay(''); setHourIdx(null); setLeap(false)
    setCalType('양력'); setGender('남')
    setSaju([]); setDayStem(''); setDayunList([]); setSeyunList([]); setErr('')
  }

  if (!open) return null

  const hasData = saju.length === 4 && dayStem
  const branchesAll = hasData ? saju.map(p => p.branch) : []
  const yearBranch = saju?.[3]?.branch || ''
  const dayBranch = saju?.[1]?.branch || ''
  const relations = hasData ? branchRelations(branchesAll) : []
  const gm = hasData ? gongmang(dayStem, dayBranch) : []
  const gsum = hasData ? guiinSummary(dayStem) : null

  const ohCount: Record<string, number> = { 목:0, 화:0, 토:0, 금:0, 수:0 }
  if (hasData) saju.forEach(p => {
    if (STEM_OH[p.stem]) ohCount[STEM_OH[p.stem]]++
    if (BRANCH_OH[p.branch]) ohCount[BRANCH_OH[p.branch]]++
  })

  const tabCell = (idx: number): React.ReactNode => {
    if (!hasData) return null
    const p = saju[idx]
    if (tab === '십성') return <>{sipsin(dayStem, p.stem) || '-'}<br/>{sipsinBranch(dayStem, p.branch) || '-'}</>
    if (tab === '12운성') return unseong(dayStem, p.branch) || '-'
    if (tab === '형충회합') { const r = relations[idx]; return r && r.length ? r.map((x,i)=><div key={i}>{x}</div>) : '-' }
    const twelve = sinsal12(yearBranch, p.branch)
    const guiin = guiinFor(dayStem, p.branch)
    return (<>
      {twelve && <div>{twelve}</div>}
      {guiin.map((g,i)=><div key={i} style={{color:'#1a5fb4'}}>{g}</div>)}
      {!twelve && guiin.length===0 && '-'}
    </>)
  }

  return (
    <div style={{
      position:'fixed', left:pos.x, top:pos.y, zIndex:5000,
      width:'clamp(340px, 94vw, 400px)', maxHeight:'92vh',
      background:'#fbf9f4', color:'#222', borderRadius:8,
      boxShadow:'0 12px 40px rgba(0,0,0,.45)', border:'1px solid #999',
      display:'flex', flexDirection:'column', overflow:'hidden',
      fontFamily:"'Noto Sans KR', -apple-system, sans-serif",
    }}>
      {/* 헤더 */}
      <div
        onMouseDown={e => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y } }}
        style={{ height:32, flexShrink:0, cursor:'move', userSelect:'none',
          background:'#2b2b2b', color:'#fff', display:'flex', alignItems:'center',
          padding:'0 10px', gap:8, fontSize:12, fontWeight:600 }}>
        <span>🔮 사주명식 계산기</span>
        <button onClick={onClose} style={{ marginLeft:'auto', width:22, height:22, borderRadius:5,
          border:'none', background:'rgba(255,255,255,.15)', color:'#fff', cursor:'pointer', fontSize:13 }}>✕</button>
      </div>

      <div style={{ overflowY:'auto' }}>
        {/* ── 입력부 ── */}
        <div style={{ padding:8, borderBottom:'1px solid #ddd', background:'#f7f5ef' }}>
          <div style={{ display:'flex', gap:4, marginBottom:5 }}>
            <button onClick={()=>setCalType('양력')} style={{...toggle, ...(calType==='양력'?toggleOn:{})}}>양력</button>
            <button onClick={()=>setCalType('음력')} style={{...toggle, ...(calType==='음력'?toggleOn:{})}}>음력</button>
            {calType==='음력' && (
              <label style={{ display:'flex', alignItems:'center', gap:3, fontSize:11, color:'#555', marginLeft:4 }}>
                <input type="checkbox" checked={leap} onChange={e=>setLeap(e.target.checked)} /> 윤달
              </label>
            )}
            <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
              <button onClick={()=>setGender('남')} style={{...toggle, ...(gender==='남'?toggleOn:{})}}>남</button>
              <button onClick={()=>setGender('여')} style={{...toggle, ...(gender==='여'?toggleOn:{})}}>여</button>
            </div>
          </div>
          <div style={{ display:'flex', gap:4, marginBottom:5 }}>
            <input value={year} onChange={e=>setYear(e.target.value.replace(/\D/g,''))} placeholder="년(예:1990)" maxLength={4} style={inp} inputMode="numeric" />
            <input value={month} onChange={e=>setMonth(e.target.value.replace(/\D/g,''))} placeholder="월" maxLength={2} style={{...inp, flex:'0 0 46px'}} inputMode="numeric" />
            <input value={day} onChange={e=>setDay(e.target.value.replace(/\D/g,''))} placeholder="일" maxLength={2} style={{...inp, flex:'0 0 46px'}} inputMode="numeric" />
          </div>
          <div style={{ display:'flex', gap:4 }}>
            <select value={hourIdx===null?'':hourIdx} onChange={e=>setHourIdx(e.target.value===''?null:Number(e.target.value))} style={{...inp, flex:1}}>
              <option value="">시간 모름</option>
              {HOUR_LABELS.map((l,i)=><option key={i} value={i}>{l}</option>)}
            </select>
            <button onClick={calculate} disabled={loading} style={calcBtn}>{loading?'계산중':'계산'}</button>
            <button onClick={reset} style={resetBtn}>초기화</button>
          </div>
          {err && <div style={{ color:'#c0392b', fontSize:11, marginTop:4 }}>{err}</div>}
        </div>

        {/* ── 결과부 ── */}
        {!hasData ? (
          <div style={{ padding:'26px 12px', textAlign:'center', color:'#a09a8c', fontSize:12, lineHeight:1.6 }}>
            생년월일·시간을 입력하고<br/>[계산]을 누르면 명식이 나옵니다.
          </div>
        ) : (
          <div style={{ padding:8 }}>
            <table style={tbl}><tbody>
              <tr>{saju.map((p,i)=><td key={i} style={{...cellSm, color: p.pillar==='일주'?'#c0392b':'#666', fontWeight: p.pillar==='일주'?700:400}}>{p.pillar==='일주'?'본원':sipsin(dayStem,p.stem)}</td>)}</tr>
              <tr>{saju.map((p,i)=><td key={i} style={{...cellStem, ...stemStyle(p.stem), border:p.pillar==='일주'?'2px solid #c0392b':stemStyle(p.stem).border}}>{p.stem}</td>)}</tr>
              <tr>{saju.map((p,i)=><td key={i} style={{...cellStem, ...branchStyle(p.branch)}}>{p.branch}</td>)}</tr>
              <tr>{saju.map((p,i)=><td key={i} style={cellSm}>{sipsinBranch(dayStem,p.branch)}</td>)}</tr>
              <tr>{saju.map((p,i)=><td key={i} style={{...cellSm, fontSize:8.5}}>{nabeum(p.stem,p.branch)}</td>)}</tr>
              <tr>{saju.map((p,i)=><td key={i} style={cellSm}>{unseong(dayStem,p.branch)}</td>)}</tr>
              <tr>{saju.map((p,i)=><td key={i} style={{...cellSm, color:'#a07b1e'}}>{sinsal12(yearBranch,p.branch)}</td>)}</tr>
              <tr>{saju.map((p,i)=>{const r=relations[i];return <td key={i} style={{...cellSm, color:'#1a5fb4', background:'#f5f9ff', fontSize:8.5}}>{r&&r.length?r.join('·'):'-'}</td>})}</tr>
            </tbody></table>

            <div style={oneLine}>
              {OH_ORDER.map((oh,i)=>(<span key={oh}>
                <span style={{ color: OH_COLOR[oh].bg==='#f2f2f2'?'#999':OH_COLOR[oh].bg, fontWeight:700 }}>
                  {oh==='목'?'木':oh==='화'?'火':oh==='토'?'土':oh==='금'?'金':'水'}</span> {ohCount[oh]}{i<4?' · ':''}
              </span>))}
            </div>
            <div style={sumLine}>
              空亡 {gm.join('')} · 天乙 {gsum!.cheoneul.join('')} · 太極 {gsum!.taegeuk.join('')}
              {gsum!.munchang.length?` · 文昌 ${gsum!.munchang.join('')}`:''}
            </div>

            <div style={{ display:'flex', marginTop:8, border:'1px solid #999', borderBottom:'none' }}>
              {(['십성','신살','12운성','형충회합'] as const).map((t,i)=>(
                <div key={t} onClick={()=>setTab(t)} style={{ flex:1, textAlign:'center', fontSize:9.5, padding:'4px 2px', cursor:'pointer',
                  borderLeft:i>0?'1px solid #ccc':'none', background:tab===t?'#e8e0f5':'#fff', color:tab===t?'#5a2a8a':'#888', fontWeight:tab===t?600:400 }}>{t}</div>
              ))}
            </div>
            <table style={{...tbl, marginTop:0}}><tbody>
              <tr>{saju.map((p,i)=><td key={i} style={cellTab}>{tabCell(i)}</td>)}</tr>
            </tbody></table>

            {dayunList.length>0 && (<>
              <div style={secTitle}>대운</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{...tbl, minWidth:dayunList.length*32}}><tbody>
                  <tr>{[...dayunList].reverse().map((d,i)=><td key={i} style={{...cellSm, fontWeight:700}}>{d.age}</td>)}</tr>
                  <tr>{[...dayunList].reverse().map((d,i)=><td key={i} style={cellSm}>{d.ganYukchin}</td>)}</tr>
                  <tr>{[...dayunList].reverse().map((d,i)=><td key={i} style={{...cellFlow, ...stemStyle(d.cheongan)}}>{d.cheongan}</td>)}</tr>
                  <tr>{[...dayunList].reverse().map((d,i)=><td key={i} style={{...cellFlow, ...branchStyle(d.jiji)}}>{d.jiji}</td>)}</tr>
                  <tr>{[...dayunList].reverse().map((d,i)=><td key={i} style={cellSm}>{d.jiYukchin}</td>)}</tr>
                  <tr>{[...dayunList].reverse().map((d,i)=><td key={i} style={cellSm}>{unseong(dayStem,d.jiji)}</td>)}</tr>
                  <tr>{[...dayunList].reverse().map((d,i)=><td key={i} style={{...cellSm, color:'#a07b1e'}}>{sinsal12(yearBranch,d.jiji)}</td>)}</tr>
                </tbody></table>
              </div>
            </>)}

            {seyunList.length>0 && (<>
              <div style={secTitle}>세운</div>
              <div style={{ overflowX:'auto' }}>
                <table style={{...tbl, minWidth:seyunList.length*30}}><tbody>
                  <tr>{[...seyunList].reverse().map((y,i)=><td key={i} style={{...cellSm, fontSize:7.5, fontWeight:700, background:y.year===new Date().getFullYear()?'rgba(250,199,117,0.25)':undefined}}>{y.year}</td>)}</tr>
                  <tr>{[...seyunList].reverse().map((y,i)=><td key={i} style={{...cellSm, fontSize:7.5}}>{y.ganYukchin}</td>)}</tr>
                  <tr>{[...seyunList].reverse().map((y,i)=><td key={i} style={{...cellFlow, ...stemStyle(y.cheongan)}}>{y.cheongan}</td>)}</tr>
                  <tr>{[...seyunList].reverse().map((y,i)=><td key={i} style={{...cellFlow, ...branchStyle(y.jiji)}}>{y.jiji}</td>)}</tr>
                </tbody></table>
              </div>
            </>)}

            <div style={note}>
              ※ 오행색: 목초록·화빨강·토황·금백·수흑 / 파란글씨=귀인 / 신살은 12신살+천을·태극·문창·문곡. (세운 노란칸=올해)
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── 스타일 ──────────────────────────────────────────────────
const tbl: React.CSSProperties = { width:'100%', borderCollapse:'collapse', tableLayout:'fixed', textAlign:'center' }
const cellSm: React.CSSProperties = { border:'1px solid #bbb', fontSize:9, color:'#666', padding:'2px 1px', lineHeight:1.3 }
const cellStem: React.CSSProperties = { height:34, fontSize:19, fontWeight:700 }
const cellFlow: React.CSSProperties = { height:24, fontSize:14, fontWeight:700, border:'1px solid #bbb' }
const cellTab: React.CSSProperties = { border:'1px solid #bbb', fontSize:9.5, padding:'4px 2px', lineHeight:1.6, verticalAlign:'top', color:'#222' }
const oneLine: React.CSSProperties = { border:'1px solid #999', borderTop:'none', padding:'4px', textAlign:'center', fontSize:11, fontWeight:600, letterSpacing:1 }
const sumLine: React.CSSProperties = { border:'1px solid #999', borderTop:'none', padding:'4px 6px', fontSize:9, color:'#333', lineHeight:1.5 }
const secTitle: React.CSSProperties = { fontSize:9.5, color:'#5a5348', fontWeight:700, margin:'8px 0 3px' }
const note: React.CSSProperties = { fontSize:8, color:'#9a9284', marginTop:8, lineHeight:1.5 }
const inp: React.CSSProperties = { flex:1, minWidth:0, padding:'5px 7px', border:'1px solid #ccc', borderRadius:5, fontSize:12, background:'#fff' }
const toggle: React.CSSProperties = { fontSize:11, padding:'3px 9px', borderRadius:5, border:'1px solid #ccc', background:'#fff', color:'#888', cursor:'pointer' }
const toggleOn: React.CSSProperties = { border:'1px solid #7766dd', background:'#efeaff', color:'#5a2a8a', fontWeight:600 }
const calcBtn: React.CSSProperties = { flex:'0 0 auto', padding:'5px 12px', borderRadius:5, border:'none', background:'#3d3488', color:'#fff', fontSize:12, fontWeight:600, cursor:'pointer' }
const resetBtn: React.CSSProperties = { flex:'0 0 auto', padding:'5px 8px', borderRadius:5, border:'1px solid #ccc', background:'#fff', color:'#888', fontSize:11, cursor:'pointer' }
