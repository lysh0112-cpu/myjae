'use client'
import { useState, useRef, useEffect } from 'react'
import SourceReading from './SourceReading'
import YongsinReading from './YongsinReading'
import SomuReading from './SomuReading'

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

/**
 * ★2026-08-05 (47부 38차) — 두 갈래 [대표님 지시]
 *   「자동불러오기 걷어 / 계산기 / 빈탭에 원본해설 불러오기」
 *
 *   [🔮 계산기]     생년월일을 손으로 넣어 전문가용 만세력을 봅니다 (전부터 있던 것)
 *   [📖 원본 해설]  ★같은 생년월일로 «교재 원본» 해설을 죽 폅니다
 *
 *   ⚠️ 36·37차의 「고른 고객 자동 불러오기」는 ★걷었습니다.
 *      열 화면이 상담 신청 때 생년월일을 «안 실어 보내» 대개 비어 있었습니다.
 *      ⛔ 되살리시려면 ★먼저 그 열 화면을 고치십시오.
 */
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

  // ★2026-08-05 (47부 38차) — 두 갈래 [대표님 지시]
  //   'calc'   손으로 넣는 전문가용 만세력 계산기 (전부터 있던 것)
  //   'source' ★교재 «원본 해설» — 같은 생년월일로 죽 폅니다
  // ★2026-08-06 (48부 1차) — 세 갈래로 [연재쌤 의견 · 대표님 지시]
  //   'yongsin' ★용신 «로데이터» — 판정 근거를 그대로 폅니다
  //   ⚠️ 세 갈래가 ★«같은 입력칸» 을 씁니다. 한 번 넣으면 셋 다 바로 봅니다.
  //   'somu'    ★🌿 소무승 물상론 — «완전 별도» 파이프라인 [49부 1차 · 연재쌤 의견]
  //   ⚠️ 넷이 ★«같은 입력칸» 을 씁니다. 한 번 넣으면 넷 다 바로 봅니다.
  const [tab, setTab] = useState<'calc' | 'source' | 'yongsin' | 'somu'>('calc')

  // ── 창 위치·크기 ──
  const [pos, setPos] = useState({ x: 80, y: 80 })
  const [size, setSize] = useState({ w: 430, h: 640 })
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  // ★axis — 'x' 가로만 · 'y' 세로만 · 'both' 둘 다 (47부 37차)
  const resize = useRef<{ x: number; y: number; w: number; h: number; axis: 'x' | 'y' | 'both' } | null>(null)

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (drag.current) {
        // ★2026-08-05 (47부 42차) — 창이 «위로» 못 나가게 막습니다. [대표님 지시]
        //   [겪은 일]  대표님 — 「상단으로 들어가 버리면 옮길 수가 없네」
        //     제목줄이 화면 «위» 로 넘어가면 ★잡을 곳이 없어 다시 못 내렸습니다.
        //   [고침]  ★y 를 0 밑으로 못 내려갑니다. 제목줄이 «언제나» 보입니다.
        //   ⚠️⚠️ ★아래·왼쪽·오른쪽은 «안» 막았습니다 —
        //      대표님 「아래로는 끝까지 늘려야 되거든」.
        //      ⛔ 아래쪽에 제한을 걸지 마십시오. 긴 해설을 볼 때 답답해집니다.
        //      ⛔ 좌우에도 걸지 마십시오. 옆으로 밀어 두고 쓰실 수 있어야 합니다.
        setPos({
          x: e.clientX - drag.current.dx,
          y: Math.max(0, e.clientY - drag.current.dy),
        })
      } else if (resize.current) {
        const r = resize.current
        setSize({
          w: r.axis === 'y' ? r.w : Math.max(340, r.w + (e.clientX - r.x)),
          h: r.axis === 'x' ? r.h : Math.max(300, r.h + (e.clientY - r.y)),
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
        {/* ★2026-08-05 (47부 36차) — 「← 다시 입력」은 ★직접 입력 갈래에서만.
            고른 고객 갈래에는 «칸이 없어» 돌아갈 자리가 없습니다. */}
        {tab === 'calc' && src && (
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
            marginLeft: (tab === 'calc' && src) ? 6 : 'auto', width: 22, height: 22, borderRadius: 5,
            border: 'none', background: 'rgba(255,255,255,.15)', color: '#fff',
            cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            WebkitUserSelect: 'none', userSelect: 'none', touchAction: 'manipulation',
          }}>✕</button>
      </div>

      {/* ★2026-08-05 (47부 38차) — 두 갈래 [대표님 지시]
          🔮 계산기     생년월일을 손으로 넣어 «전문가용 만세력» 을 봅니다
          📖 원본 해설  ★같은 생년월일로 «교재 원본» 해설을 죽 폅니다
          ⚠️ 두 갈래가 ★«같은 입력값» 을 씁니다. 한 번 넣으면 둘 다 바로 봅니다. */}
      {/* ★2026-08-06 (48부 1차) — 세 갈래로 [연재쌤 의견 · 대표님 지시]
          ⚠️ ★문구를 줄였습니다 — 창이 430px 이라 탭 하나가 «약 138px» 입니다.
             「🔮 만세력 계산기」 그대로 두면 셋이 안 들어가 글자가 잘립니다.
          ★2026-08-07 (49부 1차) — ★넷이 되었습니다. 창 430px 기준 탭 하나가
             «약 103px» 입니다. ★320px 로 줄이면 «약 76px» 이라 더는 못 늘립니다.
             ⇒ 그래서 넷째는 「🌿 물상」 넉 자입니다. 온전한 이름
               「소무승 물상론 해설」은 ★화면 «머리» 에 적어 두었습니다.
          ⛔ 다시 늘리지 마십시오. ★320px 로 줄여 놓고 재 보십시오. */}
      <div style={{ display: 'flex', gap: 4, padding: '6px 8px 0', background: '#f7f5ef', flexShrink: 0 }}>
        {([
          ['calc', '🔮 만세력'],
          ['source', '📖 원본 해설'],
          ['yongsin', '⚖️ 용신'],
          ['somu', '🌿 물상'],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            style={{
              flex: 1, height: 28, borderRadius: 5, fontSize: 11, fontFamily: 'inherit',
              border: tab === key ? '1px solid #2b2b2b' : '1px solid #ccc',
              background: tab === key ? '#2b2b2b' : '#fff',
              color: tab === key ? '#fff' : '#555',
              fontWeight: tab === key ? 600 : 400, cursor: 'pointer',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}>
            {label}
          </button>
        ))}
      </div>

      {/* 입력부 — ★계산기 갈래에서 «결과가 없을 때만» 보인다.
          ⚠️ 원본 해설 갈래는 «따로» 입력부를 그립니다 (아래). */}
      {/* ⚠️ 입력부는 ★두 갈래가 «함께» 씁니다 —
          계산기는 결과가 없을 때, 원본 해설은 «언제나» 보입니다
          (해설은 [조회] 없이 값이 바뀌면 바로 다시 폅니다). */}
      {/* ★48부 1차 — 용신 갈래도 «언제나» 입력부가 보입니다 (원본 해설과 같습니다).
          [조회] 없이 값이 바뀌면 바로 다시 폅니다. */}
      {((tab === 'calc' && !src) || tab === 'source' || tab === 'yongsin' || tab === 'somu') && (
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

      {/* 결과부 */}
      {tab === 'somu' ? (
        /* ★🌿 소무승 물상론 — 위 계산기와 «같은 입력값» 을 그대로 씁니다.
           ⚠️⚠️ ★기존 판정 함수를 «하나도» 부르지 않습니다 [대표님 지시 · 연재쌤 의견].
              ⚖️ 용신 탭과 ★답이 달라도 어긋난 것이 «아닙니다». 보는 눈이 다릅니다.
           ⛔ 교재 원문 그대로라 거친 말이 나옵니다. 손님 화면에 옮기지 마십시오. */
        <SomuReading
          calType={calType} leap={leap} gender={gender}
          year={year} month={month} day={day}
          hourIdx={hourIdx} name={name}
        />
      ) : tab === 'yongsin' ? (
        /* ★⚖️ 용신 «로데이터» — 위 계산기와 «같은 입력값» 을 그대로 씁니다.
           ⚠️ 판정 근거를 폅니다. ⛔ 손님 화면에 옮기지 마십시오. */
        <YongsinReading
          calType={calType} leap={leap} gender={gender}
          year={year} month={month} day={day}
          hourIdx={hourIdx} name={name}
        />
      ) : tab === 'source' ? (
        /* ★📖 원본 해설 — 위 계산기와 «같은 입력값» 을 그대로 씁니다.
           ⚠️ 따로 입력받지 않습니다. 한 번 넣으면 두 갈래를 오가며 봅니다. */
        <SourceReading
          calType={calType} leap={leap} gender={gender}
          year={year} month={month} day={day}
          hourIdx={hourIdx} name={name}
        />
      ) : src ? (
        <iframe
          src={src}
          title="전문가용 만세력"
          style={{ flex: 1, width: '100%', border: 'none', background: '#FDF6F0' }}
        />
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 20, fontSize: 12.5, color: '#8a7461', textAlign: 'center', lineHeight: 1.8 }}>
          생년월일·시간을 넣고 [조회]를 누르면<br />전문가용 만세력이 그대로 나옵니다.
        </div>
      )}

      {/* ★2026-08-05 (47부 37차) — 크기 조절을 «옆·아래·모서리» 셋으로. [대표님 지시]
          「윗부분은 고정이 옆과 아래로는 자유롭게 늘리고 줄이고 가능」
          [전]  ★오른쪽 «아래 모서리» 하나뿐이라 가로만·세로만 늘리기가 어려웠습니다.
          [후]  ▶ 오른쪽 가장자리 — ★가로만
                ▼ 아래 가장자리   — ★세로만
                ◢ 오른쪽 아래     — 둘 다 (전에 있던 것)
          ⚠️ ★위쪽·왼쪽은 «안» 붙였습니다 — 그쪽을 끌면 창이 «움직여» 보여
             제목줄 끌기와 헷갈립니다. 대표님도 「윗부분은 고정」이라 하셨습니다.
          ⚠️ 손잡이 폭 6px — 잡기 쉬우면서 화면을 안 가리는 값입니다. */}

      {/* ▶ 오른쪽 가장자리 — 가로만 */}
      <div
        onMouseDown={e => { resize.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h, axis: 'x' } }}
        style={{ position: 'absolute', right: 0, top: 32, bottom: 16, width: 6, cursor: 'ew-resize' }}
        title="드래그로 가로 폭 조절"
      />
      {/* ▼ 아래 가장자리 — 세로만 */}
      <div
        onMouseDown={e => { resize.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h, axis: 'y' } }}
        style={{ position: 'absolute', left: 0, right: 16, bottom: 0, height: 6, cursor: 'ns-resize' }}
        title="드래그로 세로 높이 조절"
      />
      {/* ◢ 오른쪽 아래 모서리 — 둘 다 */}
      <div
        onMouseDown={e => { resize.current = { x: e.clientX, y: e.clientY, w: size.w, h: size.h, axis: 'both' } }}
        style={{
          position: 'absolute', right: 0, bottom: 0, width: 16, height: 16,
          cursor: 'nwse-resize', background: 'linear-gradient(135deg, transparent 50%, #bbb 50%)',
        }}
        title="드래그로 창 크기 조절"
      />
    </div>
  )
}
