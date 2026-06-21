'use client'

import { Suspense, useState } from 'react'
import { useRouter } from 'next/navigation'

type CalType = '양력' | '음력'
type Gender = '남' | '여'
type RelationType = 'couple' | 'prewedding' | 'married' | 'birth'

interface PersonInput {
  year: string
  month: string
  day: string
  hour: string
  gender: Gender
  calType: CalType
}

const RELATION_TYPES = [
  { id: 'couple',     label: '💑 연인 사이',    desc: '연애 궁합·결혼 적합도' },
  { id: 'prewedding', label: '💍 예비 신혼부부', desc: '결혼 택일·신혼 운세' },
  { id: 'married',    label: '👫 부부',          desc: '관계 개선·재물·자녀운' },
  { id: 'birth',      label: '👶 출산 시기',     desc: '임신·출산 최적 시기' },
]

const HOURS = [
  { label: '모름', value: '-1' },
  { label: '子시 (23~01시)', value: '0' },
  { label: '丑시 (01~03시)', value: '1' },
  { label: '寅시 (03~05시)', value: '2' },
  { label: '卯시 (05~07시)', value: '3' },
  { label: '辰시 (07~09시)', value: '4' },
  { label: '巳시 (09~11시)', value: '5' },
  { label: '午시 (11~13시)', value: '6' },
  { label: '未시 (13~15시)', value: '7' },
  { label: '申시 (15~17시)', value: '8' },
  { label: '酉시 (17~19시)', value: '9' },
  { label: '戌시 (19~21시)', value: '10' },
  { label: '亥시 (21~23시)', value: '11' },
]

const DEFAULT_PERSON: PersonInput = {
  year: '', month: '', day: '', hour: '-1',
  gender: '남', calType: '양력',
}

function CoupleInputInner() {
  const router = useRouter()
  const [relation, setRelation] = useState<RelationType>('couple')
  const [person1, setPerson1] = useState<PersonInput>({ ...DEFAULT_PERSON, gender: '남' })
  const [person2, setPerson2] = useState<PersonInput>({ ...DEFAULT_PERSON, gender: '여' })
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')

  const updatePerson = (
    who: 1 | 2,
    key: keyof PersonInput,
    value: string
  ) => {
    const setter = who === 1 ? setPerson1 : setPerson2
    setter(prev => ({ ...prev, [key]: value }))
  }

  const validate = () => {
    if (!person1.year || !person1.month || !person1.day) return '첫 번째 분의 생년월일을 입력해주세요.'
    if (!person2.year || !person2.month || !person2.day) return '두 번째 분의 생년월일을 입력해주세요.'
    if (isNaN(Number(person1.year)) || Number(person1.year) < 1900) return '올바른 연도를 입력해주세요.'
    if (isNaN(Number(person2.year)) || Number(person2.year) < 1900) return '올바른 연도를 입력해주세요.'
    return ''
  }

  const handleStart = () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')

    const p1 = encodeURIComponent(JSON.stringify(person1))
    const p2 = encodeURIComponent(JSON.stringify(person2))
    const q = encodeURIComponent(question)

    router.push(
      `/manseryeok/ai-chat?mode=${relation}&person1=${p1}&person2=${p2}&userQuestion=${q}`
    )
  }

  const cardStyle = (selected: boolean) => ({
    padding: '12px 16px',
    borderRadius: '12px',
    border: selected ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.08)',
    background: selected ? 'rgba(60,52,137,0.3)' : 'rgba(255,255,255,0.02)',
    cursor: 'pointer',
    transition: 'all 0.15s',
  })

  const inputStyle = {
    background: '#13132a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#e8e4ff',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
  }

  const renderPerson = (who: 1 | 2) => {
    const p = who === 1 ? person1 : person2
    const label = relation === 'married'
      ? (who === 1 ? '남편' : '아내')
      : relation === 'prewedding'
      ? (who === 1 ? '신랑' : '신부')
      : relation === 'birth'
      ? (who === 1 ? '부모 1' : '부모 2')
      : (who === 1 ? '나' : '상대방')

    const avatarColor = who === 1 ? '#2d2060' : '#1a3050'
    const avatarTextColor = who === 1 ? '#c8b0ff' : '#88bbff'

    return (
      <div style={{background:'#13132a', borderRadius:'14px', padding:'16px', border:'1px solid rgba(255,255,255,0.06)'}}>
        {/* 헤더 */}
        <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px'}}>
          <div style={{width:'36px', height:'36px', borderRadius:'50%', background:avatarColor, color:avatarTextColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'500'}}>
            {label[0]}
          </div>
          <div>
            <div style={{fontSize:'14px', color:'#c8c0ff', fontWeight:'500'}}>{label}</div>
            <div style={{fontSize:'11px', color:'#5555aa', marginTop:'1px'}}>두 번째 사람</div>
          </div>
        </div>

        {/* 성별 + 음양력 */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'10px'}}>
          <div>
            <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'5px'}}>성별</div>
            <div style={{display:'flex', gap:'6px'}}>
              {(['남','여'] as Gender[]).map(g => (
                <button key={g} onClick={() => updatePerson(who, 'gender', g)}
                  style={{flex:1, padding:'8px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px',
                    background: p.gender === g ? '#2d2060' : 'rgba(255,255,255,0.05)',
                    color: p.gender === g ? '#c8b0ff' : '#555577',
                    fontWeight: p.gender === g ? '500' : '400',
                  }}>
                  {g === '남' ? '남성' : '여성'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'5px'}}>달력</div>
            <div style={{display:'flex', gap:'6px'}}>
              {(['양력','음력'] as CalType[]).map(c => (
                <button key={c} onClick={() => updatePerson(who, 'calType', c)}
                  style={{flex:1, padding:'8px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px',
                    background: p.calType === c ? '#2d2060' : 'rgba(255,255,255,0.05)',
                    color: p.calType === c ? '#c8b0ff' : '#555577',
                    fontWeight: p.calType === c ? '500' : '400',
                  }}>
                  {c}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 생년월일 */}
        <div style={{marginBottom:'10px'}}>
          <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'5px'}}>생년월일 (8자리)</div>
          <input
            type="number"
            placeholder="예) 19901231"
            value={p.year + p.month.padStart(2,'0') + p.day.padStart(2,'0')}
            onChange={e => {
              const v = e.target.value.replace(/\D/g, '').slice(0, 8)
              updatePerson(who, 'year', v.slice(0, 4))
              updatePerson(who, 'month', v.slice(4, 6))
              updatePerson(who, 'day', v.slice(6, 8))
            }}
            style={{...inputStyle, letterSpacing:'2px'}}
          />
        </div>

        {/* 출생 시간 */}
        <div>
          <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'5px'}}>출생 시간</div>
          <select value={p.hour} onChange={e => updatePerson(who, 'hour', e.target.value)}
            style={{...inputStyle, cursor:'pointer'}}>
            {HOURS.map(h => (
              <option key={h.value} value={h.value}>{h.label}</option>
            ))}
          </select>
        </div>
      </div>
    )
  }

  return (
    <main style={{minHeight:'100vh', background:'#0d0d1a', maxWidth:'480px', margin:'0 auto', paddingBottom:'40px'}}>

      {/* 헤더 */}
      <div style={{padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'10px', position:'sticky', top:0, background:'#0d0d1a', zIndex:10}}>
        <button onClick={() => router.back()}
          style={{fontSize:'20px', color:'#9d8cff', background:'none', border:'none', cursor:'pointer'}}>
          ‹
        </button>
        <div style={{fontSize:'15px', fontWeight:'500', color:'#e8e4ff'}}>궁합 분석</div>
        <div style={{marginLeft:'auto', fontSize:'11px', color:'#5555aa'}}>💑 두 사람 사주</div>
      </div>

      <div style={{padding:'20px 16px'}}>

        {/* 관계 선택 */}
        <div style={{marginBottom:'20px'}}>
          <div style={{fontSize:'12px', color:'#5555aa', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px'}}>
            우리 사이는?
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'8px'}}>
            {RELATION_TYPES.map(r => (
              <div key={r.id} onClick={() => setRelation(r.id as RelationType)}
                style={cardStyle(relation === r.id)}>
                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                  <span style={{fontSize:'16px'}}>{r.label.split(' ')[0]}</span>
                  <div>
                    <div style={{fontSize:'13px', color: relation === r.id ? '#c8b0ff' : '#8888cc', fontWeight:'500'}}>
                      {r.label.slice(2)}
                    </div>
                    <div style={{fontSize:'11px', color:'#5555aa', marginTop:'2px'}}>{r.desc}</div>
                  </div>
                  {relation === r.id && (
                    <div style={{marginLeft:'auto', width:'16px', height:'16px', borderRadius:'50%', background:'#5544aa', display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="white">
                        <path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                      </svg>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 두 사람 정보 입력 */}
        <div style={{marginBottom:'16px'}}>
          <div style={{fontSize:'12px', color:'#5555aa', marginBottom:'10px', textTransform:'uppercase', letterSpacing:'1px'}}>
            두 사람 정보
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            {renderPerson(1)}
            {renderPerson(2)}
          </div>
        </div>

        {/* 질문 입력 */}
        <div style={{marginBottom:'20px'}}>
          <div style={{fontSize:'12px', color:'#5555aa', marginBottom:'8px', textTransform:'uppercase', letterSpacing:'1px'}}>
            가장 궁금한 것 (선택)
          </div>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="예) 우리 결혼해도 될까요?"
            rows={2}
            style={{...inputStyle, resize:'none', lineHeight:'1.6'}}
          />
        </div>

        {/* 에러 */}
        {error && (
          <div style={{fontSize:'12px', color:'#ff8888', marginBottom:'12px', textAlign:'center'}}>
            {error}
          </div>
        )}

        {/* 시작 버튼 */}
        <button onClick={handleStart}
          style={{
            width:'100%', padding:'16px', borderRadius:'14px',
            background:'linear-gradient(135deg, #5544bb, #7766dd)',
            border:'none', color:'#e8e4ff', fontSize:'15px',
            fontWeight:'500', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:'8px',
          }}>
          💑 AI 궁합 분석 시작
        </button>

        <div style={{textAlign:'center', marginTop:'12px', fontSize:'11px', color:'#333355'}}>
          결제 없이 AI와 자유롭게 대화할 수 있어요
        </div>

      </div>
    </main>
  )
}

export default function CoupleInputPage() {
  return (
    <Suspense fallback={
      <div style={{minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0d0d1a'}}>
        <div style={{color:'#FAC775'}}>로딩 중...</div>
      </div>
    }>
      <CoupleInputInner />
    </Suspense>
  )
}
