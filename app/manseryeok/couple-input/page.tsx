'use client'
import { Suspense, useState, useEffect } from 'react'
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
  { id: 'couple',     icon: '💑', label: '연인 사이',    desc: '연애 궁합·결혼 적합도' },
  { id: 'prewedding', icon: '💍', label: '예비 신혼부부', desc: '결혼 택일·신혼 운세' },
  { id: 'married',    icon: '👫', label: '부부',          desc: '관계 개선·재물·자녀운' },
  { id: 'birth',      icon: '👶', label: '출산 시기',     desc: '임신·출산 최적 시기' },
]

const HOURS = [
  '모름','子시(23~01)','丑시(01~03)','寅시(03~05)','卯시(05~07)',
  '辰시(07~09)','巳시(09~11)','午시(11~13)','未시(13~15)',
  '申시(15~17)','酉시(17~19)','戌시(19~21)','亥시(21~23)',
]

const DEFAULT_PERSON = (gender: Gender): PersonInput => ({
  year:'', month:'', day:'', hour:'-1', gender, calType:'양력'
})

const STORAGE_KEY = 'couple-input-data'

function PersonForm({ who, relation, person, onChange }: {
  who: 1 | 2
  relation: RelationType
  person: PersonInput
  onChange: (key: keyof PersonInput, value: string) => void
}) {
  const label = relation === 'married' ? (who === 1 ? '남편' : '아내')
    : relation === 'prewedding' ? (who === 1 ? '신랑' : '신부')
    : relation === 'birth' ? (who === 1 ? '부모1' : '부모2')
    : (who === 1 ? '나' : '상대방')

  const avatarBg = who === 1 ? '#2d2060' : '#1a3050'
  const avatarColor = who === 1 ? '#c8b0ff' : '#88bbff'

  const inputStyle: React.CSSProperties = {
    flex:1, background:'#0d0d1a',
    border:'1px solid rgba(255,255,255,0.1)',
    borderRadius:'8px', padding:'10px 8px',
    color:'#e8e4ff', fontSize:'15px',
    outline:'none', textAlign:'center', width:'100%',
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex:1, padding:'9px', borderRadius:'8px', border:'none',
    cursor:'pointer', fontSize:'13px',
    background: active ? '#2d2060' : 'rgba(255,255,255,0.05)',
    color: active ? '#c8b0ff' : '#555577',
  })

  return (
    <div style={{background:'#13132a', borderRadius:'14px', padding:'16px', border:'1px solid rgba(255,255,255,0.06)'}}>
      <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'14px'}}>
        <div style={{width:'34px', height:'34px', borderRadius:'50%', background:avatarBg, color:avatarColor, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'500', flexShrink:0}}>
          {label[0]}
        </div>
        <span style={{fontSize:'14px', color:'#c8c0ff', fontWeight:'500'}}>{label}</span>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'12px'}}>
        <div>
          <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'5px'}}>성별</div>
          <div style={{display:'flex', gap:'5px'}}>
            <button style={btnStyle(person.gender==='남')} onClick={() => onChange('gender','남')}>남성</button>
            <button style={btnStyle(person.gender==='여')} onClick={() => onChange('gender','여')}>여성</button>
          </div>
        </div>
        <div>
          <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'5px'}}>달력</div>
          <div style={{display:'flex', gap:'5px'}}>
            <button style={btnStyle(person.calType==='양력')} onClick={() => onChange('calType','양력')}>양력</button>
            <button style={btnStyle(person.calType==='음력')} onClick={() => onChange('calType','음력')}>음력</button>
          </div>
        </div>
      </div>

      <div style={{marginBottom:'12px'}}>
        <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'5px'}}>
          생년월일
          {person.year && person.month && person.day && (
            <span style={{marginLeft:'8px', color:'#44aa66'}}>
              ✓ {person.year}년 {person.month}월 {person.day}일
            </span>
          )}
        </div>
        <div style={{display:'flex', gap:'6px', alignItems:'center'}}>
          <input type="tel" placeholder="1990" maxLength={4}
            value={person.year}
            onChange={e => onChange('year', e.target.value.replace(/\D/g,'').slice(0,4))}
            style={{...inputStyle, flex:2}}
          />
          <span style={{color:'#444466', fontSize:'12px'}}>년</span>
          <input type="tel" placeholder="01" maxLength={2}
            value={person.month}
            onChange={e => onChange('month', e.target.value.replace(/\D/g,'').slice(0,2))}
            style={inputStyle}
          />
          <span style={{color:'#444466', fontSize:'12px'}}>월</span>
          <input type="tel" placeholder="01" maxLength={2}
            value={person.day}
            onChange={e => onChange('day', e.target.value.replace(/\D/g,'').slice(0,2))}
            style={inputStyle}
          />
          <span style={{color:'#444466', fontSize:'12px'}}>일</span>
        </div>
      </div>

      <div>
        <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'5px'}}>출생 시간</div>
        <select value={person.hour} onChange={e => onChange('hour', e.target.value)}
          style={{width:'100%', background:'#0d0d1a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'8px', padding:'10px 12px', color:'#e8e4ff', fontSize:'14px', outline:'none'}}>
          {HOURS.map((h, i) => (
            <option key={i} value={i-1}>{h}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function CoupleInputInner() {
  const router = useRouter()
  const [relation, setRelation] = useState<RelationType>('couple')
  const [person1, setPerson1] = useState<PersonInput>(DEFAULT_PERSON('남'))
  const [person2, setPerson2] = useState<PersonInput>(DEFAULT_PERSON('여'))
  const [question, setQuestion] = useState('')
  const [error, setError] = useState('')

  // 페이지 진입 시 저장된 데이터 복원
  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY)
    if (saved) {
      const data = JSON.parse(saved)
      if (data.relation) setRelation(data.relation)
      if (data.person1) setPerson1(data.person1)
      if (data.person2) setPerson2(data.person2)
      if (data.question) setQuestion(data.question)
    }
  }, [])

  // 데이터 변경 시 자동 저장
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
      relation, person1, person2, question
    }))
  }, [relation, person1, person2, question])

  const handleClear = () => {
    if (confirm('입력 내용을 초기화할까요?')) {
      sessionStorage.removeItem(STORAGE_KEY)
      setRelation('couple')
      setPerson1(DEFAULT_PERSON('남'))
      setPerson2(DEFAULT_PERSON('여'))
      setQuestion('')
    }
  }

  const handleStart = () => {
    if (!person1.year || !person1.month || !person1.day) {
      setError('첫 번째 분의 생년월일을 입력해주세요.'); return
    }
    if (!person2.year || !person2.month || !person2.day) {
      setError('두 번째 분의 생년월일을 입력해주세요.'); return
    }
    setError('')
    const p1 = encodeURIComponent(JSON.stringify(person1))
    const p2 = encodeURIComponent(JSON.stringify(person2))
    const q = encodeURIComponent(question)
    router.push(`/manseryeok/ai-chat?mode=${relation}&person1=${p1}&person2=${p2}&userQuestion=${q}`)
  }

  return (
    <main style={{minHeight:'100vh', background:'#0d0d1a', maxWidth:'480px', margin:'0 auto', paddingBottom:'40px'}}>

      {/* 헤더 */}
      <div style={{padding:'14px 20px', borderBottom:'1px solid rgba(255,255,255,0.06)', display:'flex', alignItems:'center', gap:'10px', position:'sticky', top:0, background:'#0d0d1a', zIndex:10}}>
        <button onClick={() => router.back()}
          style={{fontSize:'20px', color:'#9d8cff', background:'none', border:'none', cursor:'pointer'}}>‹</button>
        <div style={{fontSize:'15px', fontWeight:'500', color:'#e8e4ff'}}>궁합 분석</div>
        <button onClick={handleClear}
          style={{marginLeft:'auto', fontSize:'11px', padding:'4px 10px', borderRadius:'20px', background:'rgba(255,80,80,0.1)', color:'rgba(255,120,120,0.7)', border:'1px solid rgba(255,80,80,0.2)', cursor:'pointer'}}>
          초기화
        </button>
      </div>

      <div style={{padding:'20px 16px'}}>

        {/* 관계 선택 */}
        <div style={{marginBottom:'20px'}}>
          <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'10px'}}>우리 사이는?</div>
          <div style={{display:'flex', flexDirection:'column', gap:'7px'}}>
            {RELATION_TYPES.map(r => (
              <div key={r.id} onClick={() => setRelation(r.id as RelationType)}
                style={{
                  padding:'11px 14px', borderRadius:'11px', cursor:'pointer',
                  border: relation === r.id ? '1px solid rgba(119,102,221,0.6)' : '1px solid rgba(255,255,255,0.06)',
                  background: relation === r.id ? 'rgba(60,52,137,0.25)' : 'rgba(255,255,255,0.02)',
                  display:'flex', alignItems:'center', gap:'10px',
                }}>
                <span style={{fontSize:'16px'}}>{r.icon}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:'13px', color: relation === r.id ? '#c8b0ff' : '#8888cc', fontWeight:'500'}}>{r.label}</div>
                  <div style={{fontSize:'11px', color:'#444466', marginTop:'1px'}}>{r.desc}</div>
                </div>
                {relation === r.id && (
                  <div style={{width:'16px', height:'16px', borderRadius:'50%', background:'#5544aa', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 두 사람 정보 */}
        <div style={{marginBottom:'16px'}}>
          <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'10px'}}>두 사람 정보</div>
          <div style={{display:'flex', flexDirection:'column', gap:'10px'}}>
            <PersonForm who={1} relation={relation} person={person1}
              onChange={(k,v) => setPerson1(prev => ({...prev, [k]:v}))} />
            <PersonForm who={2} relation={relation} person={person2}
              onChange={(k,v) => setPerson2(prev => ({...prev, [k]:v}))} />
          </div>
        </div>

        {/* 질문 */}
        <div style={{marginBottom:'20px'}}>
          <div style={{fontSize:'11px', color:'#5555aa', marginBottom:'8px'}}>가장 궁금한 것 (선택)</div>
          <textarea value={question} onChange={e => setQuestion(e.target.value)}
            placeholder="예) 우리 결혼해도 될까요?"
            rows={2}
            style={{width:'100%', background:'#13132a', border:'1px solid rgba(255,255,255,0.1)', borderRadius:'10px', padding:'10px 14px', color:'#e8e4ff', fontSize:'14px', outline:'none', resize:'none', lineHeight:'1.6', boxSizing:'border-box'}}
          />
        </div>

        {error && <div style={{fontSize:'12px', color:'#ff8888', marginBottom:'12px', textAlign:'center'}}>{error}</div>}

        <button onClick={handleStart}
          style={{width:'100%', padding:'16px', borderRadius:'14px', background:'linear-gradient(135deg, #5544bb, #7766dd)', border:'none', color:'#e8e4ff', fontSize:'15px', fontWeight:'500', cursor:'pointer'}}>
          💑 AI 궁합 분석 시작
        </button>

        <div style={{textAlign:'center', marginTop:'10px', fontSize:'11px', color:'#333355'}}>
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
