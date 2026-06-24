import JobSelect from './JobSelect'
import MbtiInput from './MbtiInput'
import { PersonInput, RelationType } from '../hooks/useCoupleInput'

const HOURS = [
  '모름','子시(23~01)','丑시(01~03)','寅시(03~05)','卯시(05~07)',
  '辰시(07~09)','巳시(09~11)','午시(11~13)','未시(13~15)',
  '申시(15~17)','酉시(17~19)','戌시(19~21)','亥시(21~23)',
]

export default function PersonForm({ who, relation, person, onChange, autoLoaded }: {
  who: 1 | 2
  relation: RelationType
  person: PersonInput
  onChange: (key: keyof PersonInput, value: string) => void
  autoLoaded?: boolean
}) {
  const label = relation === 'married' ? (who === 1 ? '남편' : '아내')
    : relation === 'prewedding' ? (who === 1 ? '신랑' : '신부')
    : relation === 'birth' ? (who === 1 ? '부모1' : '부모2')
    : (who === 1 ? '나' : '상대방')

  const avatarBg = who === 1 ? '#2d2060' : '#1a3050'
  const avatarColor = who === 1 ? '#c8b0ff' : '#88bbff'

  const inputStyle: React.CSSProperties = {
    flex: 1, background: '#0d0d1a',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px', padding: '10px 8px',
    color: '#e8e4ff', fontSize: '15px',
    outline: 'none', textAlign: 'center', width: '100%',
  }

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '9px', borderRadius: '8px', border: 'none',
    cursor: 'pointer', fontSize: '13px',
    background: active ? '#2d2060' : 'rgba(255,255,255,0.05)',
    color: active ? '#c8b0ff' : '#555577',
  })

  return (
    <div style={{ background: '#13132a', borderRadius: '14px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
        <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: avatarBg, color: avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '500', flexShrink: 0 }}>
          {label[0]}
        </div>
        <span style={{ fontSize: '14px', color: '#c8c0ff', fontWeight: '500' }}>{label}</span>
        {autoLoaded && who === 1 && (
          <span style={{ marginLeft: 'auto', fontSize: '10px', color: '#44aa66', background: 'rgba(68,170,102,0.1)', padding: '2px 8px', borderRadius: '20px' }}>
            ✓ 자동입력
          </span>
        )}
      </div>

      {autoLoaded && who === 1 ? (
        <div style={{ background: 'rgba(68,170,102,0.08)', border: '1px solid rgba(68,170,102,0.2)', borderRadius: '10px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#88ccaa' }}>
          {person.gender} · {person.calType} · {person.year}년 {person.month}월 {person.day}일
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '5px' }}>성별</div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button style={btnStyle(person.gender === '남')} onClick={() => onChange('gender', '남')}>남성</button>
                <button style={btnStyle(person.gender === '여')} onClick={() => onChange('gender', '여')}>여성</button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '5px' }}>달력</div>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button style={btnStyle(person.calType === '양력')} onClick={() => onChange('calType', '양력')}>양력</button>
                <button style={btnStyle(person.calType === '음력')} onClick={() => onChange('calType', '음력')}>음력</button>
              </div>
            </div>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '5px' }}>생년월일</div>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input type="tel" placeholder="1990" maxLength={4}
                value={person.year}
                onChange={e => onChange('year', e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={{ ...inputStyle, flex: 2 }} />
              <span style={{ color: '#444466', fontSize: '12px' }}>년</span>
              <input type="tel" placeholder="01" maxLength={2}
                value={person.month}
                onChange={e => onChange('month', e.target.value.replace(/\D/g, '').slice(0, 2))}
                style={inputStyle} />
              <span style={{ color: '#444466', fontSize: '12px' }}>월</span>
              <input type="tel" placeholder="01" maxLength={2}
                value={person.day}
                onChange={e => onChange('day', e.target.value.replace(/\D/g, '').slice(0, 2))}
                style={inputStyle} />
              <span style={{ color: '#444466', fontSize: '12px' }}>일</span>
            </div>
          </div>
        </>
      )}

      <div style={{ marginBottom: '12px' }}>
        <div style={{ fontSize: '11px', color: '#5555aa', marginBottom: '5px' }}>출생 시간</div>
        <select value={person.hour} onChange={e => onChange('hour', e.target.value)}
          style={{ width: '100%', background: '#0d0d1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 12px', color: '#e8e4ff', fontSize: '14px', outline: 'none' }}>
          {HOURS.map((h, i) => (
            <option key={i} value={i - 1}>{h}</option>
          ))}
        </select>
      </div>

      {relation === 'couple' && (
  <JobSelect value={person.job} onChange={v => onChange('job', v)} />
)}

      {relation === 'couple' && (
        <MbtiInput value={person.mbti} onChange={v => onChange('mbti', v)} />
      )}
    </div>
  )
}
