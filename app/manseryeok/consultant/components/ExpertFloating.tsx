'use client'
import { useState, useRef, useEffect } from 'react'

// ============================================================
// 전문가용 만세력 (독립 플로팅 창)
//  - 상담사 메뉴바 "🔮 만세력" 버튼으로 열고 닫음
//  - 창 안에서 생년월일·시·성별·양력음력을 입력 → [조회]
//  - 결과는 전문가용 만세력 화면(/manseryeok/result-new?pro=1&mode=chart)을
//    iframe으로 그대로 띄운다.
//    → 명식·오행 점수·용신 3종·신살·귀인·대운·세운·월운·일운이 전부 나온다.
//    → 전문가용 화면이 바뀌면 여기도 자동으로 같이 바뀐다(따로 만들 필요 없음).
//  - 제목줄 드래그로 이동, 오른쪽·아래 모서리로 크기 조절, X 닫기.
//
//  ※ 기존 SajuFloating(십성·신살 탭 방식)을 대체한다.
// ============================================================

type Props = { open: boolean; onClose: () => void }

// 시(時) 목록 — 30분법 (birthInput.ts 기준과 동일한 표기)
const HOUR_LABELS = [
  '子 23:30-01:30', '丑 01:30-03:30', '寅 03:30-05:30', '卯 05:30-07:30',
  '辰 07:30-09:30', '巳 09:30-11:30', '午 11:30-13:30', '未 13:30-15:30',
  '申 15:30-17:30', '酉 17:30-19:30', '戌 19:30-21:30', '亥 21:30-23:30',
]

export default function ExpertFloating({ open, onClose }: Props) {
  // ── 입력값 ──
  const [name, setName] = useState('')
  const [calType, setCalType] = useState<'양력' | '음력'>('양력')
  const [leap, setLeap] = useState(false)
  const [gender, setGender] = useState<'남' | '여'>('남')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [hourIdx, setHourIdx] = useState<number | null>(null)
  const [err, setErr] = useState('')

  // ── 조회 결과 주소 (iframe src) ──
  const [src, setSrc] = useState('')

  // ── 창 위치·크기 ──
  const [pos, setPos] = useState({ x: 80, y: 80 })
  const [size, setSize] = useState({ w: 430, h: 640 })
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (drag.current) {
        setPos({ x: e.clientX - drag.current.dx, y: e.clientY - drag.current.dy })
      } else if (resize.current) {
        const r = resize.current
        setSize({
          w: Math.max(340, r.w + (e.clientX - r.x)),
          h: Math.max(300, r.h + (e.clientY - r.y)),
        })
      }
    }
    const up = () => { drag.current = null; resize.current = null }
    window.addEventListener('mousemove', move)
    window.addEventListener('mouseup', up)
    return () => {
      window.removeEventListener('mousemove', move)
      window.removeEventListener('mouseup', up)
    }
  }, [])

  if (!open) return null

  // ── 조회 ──
  //   전문가용 만세력과 똑같은 주소 규칙 (lib/saju/expertPeople.ts 의 toExpertResultUrl)
  function search() {
    setErr('')
    const y = Number(year), m = Number(month), d = Number(day)
    if (!y || y < 1900 || y > 2100) { setErr('연도를 확인해 주세요 (1900~2100)'); return }
    if (!m || m < 1 || m > 12) { setErr('월을 확인해 주세요 (1~12)'); return }
    if (!d || d < 1 || d > 31) { setErr('일을 확인해 주세요 (1~31)'); return }

    const q = new URLSearchParams()
    q.set('year', String(y)); q.set('month', String(m)); q.set('day', String(d))
    q.set('gender', gender); q.set('calType', calType)
    q.set('leapMonth', calType === '음력' && leap ? '1' : '0')
    if (hourIdx !== null) q.set('hour', String(hourIdx))
    if (name.trim()) q.set('name', name.trim())
    q.set('pro', '1')       // 전문가 모드 (합충 토글 등)
    q.set('mode', 'chart')  // 통변 없이 만세력만
    // 같은 조건으로 다시 눌러도 새로 그리도록 t 값을 붙인다.
    q.set('t', String(Date.now()))
    setSrc(`/manseryeok/result-new?${q.toString()}`)
  }

  function reset() {
    setName(''); setYear(''); setMonth(''); setDay('')
    setHourIdx(null); setLeap(false); setErr(''); setSrc('')
  }

  // ── 스타일 ──
  const inp: React.CSSProperties = {
    flex: 1, minWidth: 0, height: 28, padding: '0 7px', fontSize: 12,
    border: '1px solid #ccc', borderRadius: 4, background: '#fff', color: '#222',
    fontFamily: 'inherit', boxSizing: 'border-box',
  }
  const toggle: React.CSSProperties = {
    height: 26, padding: '0 9px', fontSize: 11, borderRadius: 4,
    border: '1px solid #ccc', background: '#fff', color: '#555',
    cursor: 'pointer', fontFamily: 'inherit',
  }
  const toggleOn: React.CSSProperties = {
    background: '#2b2b2b', color: '#fff', borderColor: '#2b2b2b', fontWeight: 600,
  }

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 5000,
      width: size.w, height: size.h,
      background: '#fbf9f4', color: '#222', borderRadius: 8,
      boxShadow: '0 12px 40px rgba(0,0,0,.45)', border: '1px solid #999',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Noto Sans KR', -apple-system, sans-serif",
    }}>
      {/* 제목줄 — 드래그로 이동 */}
      <div
        onMouseDown={e => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y } }}
        style={{
          height: 32, flexShrink: 0, cursor: 'move', userSelect: 'none',
          background: '#2b2b2b', color: '#fff', display: 'flex', alignItems: 'center',
          padding: '0 10px', gap: 8, fontSize: 12, fontWeight: 600,
        }}>
        <span>🔮 만세력 (전문가용)</span>
        {src && (
          <button type="button" onClick={() => setSrc('')}
            style={{
              marginLeft: 'auto', height: 22, padding: '0 8px', borderRadius: 5,
              border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff',
              cursor: 'pointer', fontSize: 11, fontFamily: 'inherit',
              WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',
            }}>← 다시 입력</button>
        )}
        <button type="button" onClick={onClose}
          style={{
            marginLeft: src ? 6 : 'auto', width: 22, height: 22, borderRadius: 5,
            border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',
          }}>✕</button>
      </div>

      {/* 입력부 — 결과가 없을 때만 보인다 */}
      {!src && (
        <div style={{ padding: 8, borderBottom: '1px solid #ddd', background: '#f7f5ef', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
            <button type="button" onClick={() => setCalType('양력')} style={{ ...toggle, ...(calType === '양력' ? toggleOn : {}) }}>양력</button>
            <button type="button" onClick={() => setCalType('음력')} style={{ ...toggle, ...(calType === '음력' ? toggleOn : {}) }}>음력</button>
            {calType === '음력' && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#555', marginLeft: 4 }}>
                <input type="checkbox" checked={leap} onChange={e => setLeap(e.target.checked)} /> 윤달
              </label>
            )}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              <button type="button" onClick={() => setGender('남')} style={{ ...toggle, ...(gender === '남' ? toggleOn : {}) }}>남</button>
              <button type="button" onClick={() => setGender('여')} style={{ ...toggle, ...(gender === '여' ? toggleOn : {}) }}>여</button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="이름(선택)" style={inp} />
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 5 }}>
            <input value={year} onChange={e => setYear(e.target.value.replace(/\D/g, ''))} placeholder="년(예:1990)" maxLength={4} style={inp} inputMode="numeric" />
            <input value={month} onChange={e => setMonth(e.target.value.replace(/\D/g, ''))} placeholder="월" maxLength={2} style={{ ...inp, flex: '0 0 46px' }} inputMode="numeric" />
            <input value={day} onChange={e => setDay(e.target.value.replace(/\D/g, ''))} placeholder="일" maxLength={2} style={{ ...inp, flex: '0 0 46px' }} inputMode="numeric" />
          </div>

          <div style={{ display: 'flex', gap: 4 }}>
            <select value={hourIdx === null ? '' : hourIdx}
              onChange={e => setHourIdx(e.target.value === '' ? null : Number(e.target.value))}
              style={{ ...inp, flex: 1 }}>
              <option value="">시간 모름</option>
              {HOUR_LABELS.map((l, i) => <option key={i} value={i}>{l}</option>)}
            </select>
            <button type="button" onClick={search}
              style={{
                height: 28, padding: '0 14px', fontSize: 12, fontWeight: 600, borderRadius: 4,
                border: 'none', background: '#2b2b2b', color: '#fff', cursor: 'pointer',
                fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none',
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              }}>조회</button>
            <button type="button" onClick={reset}
              style={{
                height: 28, padding: '0 10px', fontSize: 12, borderRadius: 4,
                border: '1px solid #ccc', background: '#fff', color: '#666', cursor: 'pointer',
                fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none',
                touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
              }}>초기화</button>
          </div>

          {err && <div style={{ color: '#c0392b', fontSize: 11, marginTop: 4 }}>{err}</div>}
        </div>
      )}

      {/* 결과부 — 전문가용 만세력 화면을 그대로 띄운다 */}
      {src ? (
        <iframe
          src={src}
          title="전문가용 만세력"
          style={{ flex: 1, width: '100%', border: 'none', background: '#FDF6F0' }}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 12px', textAlign: 'center', color: '#a09a8c', fontSize: 12, lineHeight: 1.7 }}>
          생년월일·시간을 넣고 [조회]를 누르면<br />전문가용 만세력이 그대로 나옵니다.
        </div>
      )}

      {/* 크기 조절 손잡이 (오른쪽 아래 모서리) */}
      <div
        onMouseDown={e => { resize.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h } }}
        style={{
          position: 'absolute', right: 0, bottom: 0, width: 16, height: 16,
          cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, #bbb 50%)',
        }}
        title="드래그로 창 크기 조절"
      />
    </div>
  )
}
