'use client'
import { useState, useEffect } from 'react'
import { CoupleResultData, PersonInput } from '../hooks/useCoupleResult'

interface Props {
  result: CoupleResultData
  person1: PersonInput
  person2: PersonInput
  mode?: string
}

const GAN_COLOR: Record<string,string> = {
  甲:'#4caf50',乙:'#81c784',丙:'#f44336',丁:'#e57373',
  戊:'#ff9800',己:'#ffb74d',庚:'#9e9e9e',辛:'#e0e0e0',
  壬:'#2196f3',癸:'#64b5f6','?':'#8a88a0'
}
const JI_COLOR: Record<string,string> = {
  子:'#2196f3',丑:'#ff9800',寅:'#4caf50',卯:'#81c784',
  辰:'#ff9800',巳:'#f44336',午:'#f44336',未:'#ff9800',
  申:'#9e9e9e',酉:'#e0e0e0',戌:'#ff9800',亥:'#2196f3','?':'#8a88a0'
}

const HEAVENLY_STEMS = ["甲","乙","丙","丁","戊","己","庚","辛","壬","癸"]
const EARTHLY_BRANCHES = ["子","丑","寅","卯","辰","巳","午","未","申","酉","戌","亥"]

function calcHourPillar(dayStem: string, hourIdx: number): { stem: string; branch: string } {
  const dg = HEAVENLY_STEMS.indexOf(dayStem)
  const groupBase = [0, 2, 4, 6, 8, 0, 2, 4, 6, 8]
  const hourStem = HEAVENLY_STEMS[(groupBase[dg] + hourIdx) % 10]
  const hourBranch = EARTHLY_BRANCHES[hourIdx]
  return { stem: hourStem, branch: hourBranch }
}

async function fetchSajuData(person: PersonInput) {
  try {
    const res = await fetch(
      `/api/lunar?year=${person.year}&month=${person.month}&day=${person.day}&calType=${person.calType}&leapMonth=0`
    )
    const d = await res.json()
    if (d.error) return null

    // 시주 계산
    const dayGanji = d.dayGanji || ''
    const dayStem = dayGanji[0] || ''
    const hourIdx = person.hour && person.hour !== '-1' && person.hour !== '모름'
      ? parseInt(person.hour) : null

    const hourPillar = (dayStem && hourIdx !== null)
      ? calcHourPillar(dayStem, hourIdx)
      : null

    return {
      yearGanji: d.yearGanji || '',
      monthGanji: d.monthGanji || '',
      dayGanji: d.dayGanji || '',
      hourPillar,
    }
  } catch {
    return null
  }
}

export default function SajuSummary({ result, person1, person2, mode = 'couple' }: Props) {
  const [person2Pillars, setPerson2Pillars] = useState<{
    yearGanji: string; monthGanji: string; dayGanji: string;
    hourPillar: { stem: string; branch: string } | null
  } | null>(null)
  const [person1Pillars, setPerson1Pillars] = useState<{
    yearGanji: string; monthGanji: string; dayGanji: string;
    hourPillar: { stem: string; branch: string } | null
  } | null>(null)
  const [detail, setDetail] = useState('')
  const [loading, setLoading] = useState(false)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const load = async () => {
      const [p1, p2] = await Promise.all([
        fetchSajuData(person1),
        fetchSajuData(person2),
      ])
      if (p1) setPerson1Pillars(p1)
      if (p2) setPerson2Pillars(p2)

      if (p1 && p2) {
        setLoading(true)
        try {
          const myAnalysis = (
            (localStorage.getItem('saju_free_analysis') ?? '') + ' ' +
            (localStorage.getItem('saju_paid_analysis') ?? '')
          ).trim().slice(0, 300)

          const p1Saju = `${p1.yearGanji} ${p1.monthGanji} ${p1.dayGanji}${p1.hourPillar ? ' ' + p1.hourPillar.stem + p1.hourPillar.branch : ''}`
          const p2Saju = `${p2.yearGanji} ${p2.monthGanji} ${p2.dayGanji}${p2.hourPillar ? ' ' + p2.hourPillar.stem + p2.hourPillar.branch : ''}`

          const modeLabel =
            mode === 'prewedding' ? '예비 신혼부부' :
            mode === 'married' ? '부부' :
            mode === 'birth' ? '출산 시기' : '연인'

          const prompt = `당신은 명리학 전문가입니다. 마크다운 기호(##, **, ---)는 절대 사용하지 마세요.

[${modeLabel} 궁합 분석]

나 (${person1.gender}): ${person1.calType} ${person1.year}년 ${person1.month}월 ${person1.day}일
사주: ${p1Saju}
${myAnalysis ? `기존 분석 참고: ${myAnalysis}` : ''}

상대방 (${person2.gender}): ${person2.calType} ${person2.year}년 ${person2.month}월 ${person2.day}일
사주: ${p2Saju}

아래 3가지를 간결하게 설명해주세요:
1. 나의 사주 특성 (일간 기질, 강약, 용신) — 2문장
2. 상대방 사주 특성 (일간 기질, 강약, 용신) — 2문장
3. 두 사람 오행 조화 및 궁합 핵심 포인트 — 2문장`

          const res = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
          })
          const data = await res.json()
          const text = data.content?.find((c: { type: string }) => c.type === 'text')?.text || ''
          setDetail(text)
          setShown(true)
        } catch {
          setDetail('분석 중 오류가 발생했습니다.')
          setShown(true)
        } finally {
          setLoading(false)
        }
      }
    }
    load()
  }, [person1.year, person2.year])

  const handleRetry = async () => {
    setShown(false)
    setDetail('')
    setLoading(true)
    try {
      const p1Saju = person1Pillars
        ? `${person1Pillars.yearGanji} ${person1Pillars.monthGanji} ${person1Pillars.dayGanji}${person1Pillars.hourPillar ? ' ' + person1Pillars.hourPillar.stem + person1Pillars.hourPillar.branch : ''}`
        : ''
      const p2Saju = person2Pillars
        ? `${person2Pillars.yearGanji} ${person2Pillars.monthGanji} ${person2Pillars.dayGanji}${person2Pillars.hourPillar ? ' ' + person2Pillars.hourPillar.stem + person2Pillars.hourPillar.branch : ''}`
        : ''

      const prompt = `당신은 명리학 전문가입니다. 마크다운 기호(##, **, ---)는 절대 사용하지 마세요.

나 (${person1.gender}): 사주 ${p1Saju}
상대방 (${person2.gender}): 사주 ${p2Saju}

1. 나의 사주 특성 (일간 기질, 강약, 용신) — 2문장
2. 상대방 사주 특성 (일간 기질, 강약, 용신) — 2문장
3. 두 사람 오행 조화 및 궁합 핵심 포인트 — 2문장`

      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
      })
      const data = await res.json()
      const text = data.content?.find((c: { type: string }) => c.type === 'text')?.text || ''
      setDetail(text)
      setShown(true)
    } catch {
      setDetail('오류가 발생했습니다.')
      setShown(true)
    } finally {
      setLoading(false)
    }
  }

  // 사주명식 카드 렌더링
  const renderPillars = (pillars: typeof person2Pillars, color: string) => {
    if (!pillars) return null
    const items = [
      { name: '년주', g: pillars.yearGanji },
      { name: '월주', g: pillars.monthGanji },
      { name: '일주', g: pillars.dayGanji },
      ...(pillars.hourPillar ? [{ name: '시주', g: pillars.hourPillar.stem + pillars.hourPillar.branch }] : []),
    ]
    return (
      <div style={{ display: 'flex', gap: '5px' }}>
        {items.map((p, i) => (
          <div key={i} style={{ textAlign: 'center', flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: '8px', padding: '6px 3px' }}>
            <div style={{ fontSize: '9px', color: '#6666aa', marginBottom: '2px' }}>{p.name}</div>
            <div style={{ fontSize: '17px', fontWeight: 'bold', color: GAN_COLOR[p.g[0]] ?? '#FAC775' }}>{p.g[0]}</div>
            <div style={{ fontSize: '17px', fontWeight: 'bold', color: JI_COLOR[p.g[1]] ?? '#e0dce8' }}>{p.g[1]}</div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div style={{ background: '#13132a', borderRadius: '14px', padding: '16px', marginBottom: '12px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ fontSize: '13px', fontWeight: '500', color: '#c8c0ff', marginBottom: '12px' }}>사주 요약</div>

      {/* 생년월일 요약 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
        <div style={{ background: 'rgba(60,52,137,0.2)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#c8c0ff' }}>
          <span style={{ color: '#7F77DD', fontSize: '11px', marginRight: '6px' }}>나</span>
          {result.person1Summary}
        </div>
        <div style={{ background: 'rgba(212,83,126,0.15)', borderRadius: '10px', padding: '8px 12px', fontSize: '12px', color: '#c8c0ff' }}>
          <span style={{ color: '#D4537E', fontSize: '11px', marginRight: '6px' }}>상대방</span>
          {result.person2Summary}
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <>
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
          <div style={{ textAlign: 'center', padding: '16px', fontSize: '12px', color: '#c8b0ff' }}>
            <div style={{ fontSize: '24px', marginBottom: '8px', animation: 'spin 1.2s linear infinite', display: 'inline-block' }}>✦</div>
            <div>사주를 풀이하고 있습니다...</div>
          </div>
        </>
      )}

      {/* 사주 풀이 섹션 */}
      {shown && detail && (
        <div style={{ background: 'rgba(60,52,137,0.15)', borderRadius: '10px', padding: '14px', marginTop: '4px' }}>

          {/* 상대방 사주명식 — 해설 안에 표시 */}
          {person2Pillars && (
            <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '11px', color: '#D4537E', marginBottom: '8px', fontWeight: '500' }}>
                상대방 사주명식
              </div>
              {renderPillars(person2Pillars, '#D4537E')}
            </div>
          )}

          {/* 사주 해설 */}
          <div style={{ fontSize: '12px', color: '#c8c0ff', lineHeight: '1.8', whiteSpace: 'pre-wrap' }}>
            {detail}
          </div>

          <button onClick={handleRetry}
            style={{ marginTop: '12px', width: '100%', padding: '8px', borderRadius: '8px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', fontSize: '11px', color: '#8888cc', cursor: 'pointer' }}>
            🔄 다시 풀이하기
          </button>
        </div>
      )}
    </div>
  )
}
