'use client'

// ============================================================================
// 상담 시작 · 종료 · 경과시간 (2026-07-21 신설)
//
// [왜 만들었나]
//   원래 이 기능들은 ConsultantChat.tsx 안에 들어 있었다.
//   07-20 개편에서 고객 채팅을 화면에서 빼면서,
//   그 안에 딸려 있던 [상담 시작]·[상담 종료]·초시계까지 함께 사라졌다.
//   유선 상담 후 완료 처리를 할 방법이 없어져 여기로 떼어냈다.
//
//   → 채팅과 무관한 기능이므로 앞으로도 분리된 채로 둔다.
//     채팅을 되살리더라도 이 부품은 그대로 쓴다.
//
// [어디에 있나]
//   상단 메뉴바 오른쪽 (메뉴크기 슬라이더와 로그아웃 사이).
//   고객을 선택해 3분할이 열렸을 때만 나타난다.
//   가운데 칸은 플로팅 창을 끌어다 놓는 자리라 비워 둔다.
// ============================================================================

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  consultationId: string
  /** 종료 후 목록으로 돌아갈 때 */
  onEnded?: () => void
}

export default function ConsultTimer({ consultationId, onEnded }: Props) {
  const [startedAt, setStartedAt] = useState<string | null>(null)
  const [completedAt, setCompletedAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState<number>(Date.now())

  // 현재 시작·종료 상태를 읽어온다
  //   (자동으로 in_progress 로 바꾸지 않는다 — 시작은 반드시 버튼으로)
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase.from('consultations')
      .select('started_at, completed_at')
      .eq('id', consultationId)
      .single()
      .then(({ data }) => {
        if (cancelled) return
        setStartedAt(data?.started_at ?? null)
        setCompletedAt(data?.completed_at ?? null)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [consultationId])

  // 진행 중일 때만 초시계가 흐른다
  useEffect(() => {
    if (!startedAt || completedAt) return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [startedAt, completedAt])

  // [상담 시작] → started_at 기록
  async function handleStart() {
    if (busy) return
    setBusy(true)
    try {
      const iso = new Date().toISOString()
      const { error } = await supabase.from('consultations')
        .update({ started_at: iso, status: 'in_progress' })
        .eq('id', consultationId)
      if (error) throw error          // ★Supabase 는 실패해도 throw 하지 않는다
      setStartedAt(iso)
      setNow(Date.now())
    } catch (err) {
      console.error(err)
      alert('시작 처리 중 문제가 생겼어요. 다시 눌러주세요.')
    } finally {
      setBusy(false)
    }
  }

  // [상담 종료] → completed_at 기록
  async function handleEnd() {
    if (busy) return
    if (!startedAt) {
      if (!confirm('아직 [상담 시작]을 누르지 않았어요. 그래도 종료할까요?')) return
    }
    if (!confirm('이 상담을 종료할까요? 종료 시각이 기록됩니다.')) return
    setBusy(true)
    try {
      const iso = new Date().toISOString()
      const { error } = await supabase.from('consultations')
        .update({ completed_at: iso, status: 'completed' })
        .eq('id', consultationId)
      if (error) throw error
      setCompletedAt(iso)
      onEnded?.()
    } catch (err) {
      console.error(err)
      alert('종료 처리 중 문제가 생겼어요. 다시 눌러주세요.')
    } finally {
      setBusy(false)
    }
  }

  // [상담 재개] → 종료시각만 지움 (시작시각 유지 → 시간 이어서 누적)
  async function handleResume() {
    if (busy) return
    if (!confirm('상담을 다시 이어서 진행할까요? 종료 시각이 지워지고 시간이 계속 흘러갑니다.')) return
    setBusy(true)
    try {
      const { error } = await supabase.from('consultations')
        .update({ completed_at: null, status: 'in_progress' })
        .eq('id', consultationId)
      if (error) throw error
      setCompletedAt(null)
      setNow(Date.now())
    } catch (err) {
      console.error(err)
      alert('재개 처리 중 문제가 생겼어요. 다시 눌러주세요.')
    } finally {
      setBusy(false)
    }
  }

  const fmtTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' }) : ''

  function elapsedText(): string {
    if (!startedAt) return '00:00:00'
    const end = completedAt ? new Date(completedAt).getTime() : now
    let sec = Math.floor((end - new Date(startedAt).getTime()) / 1000)
    if (sec < 0) sec = 0
    const h = String(Math.floor(sec / 3600)).padStart(2, '0')
    const m = String(Math.floor((sec % 3600) / 60)).padStart(2, '0')
    const s = String(sec % 60).padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  const running = !!startedAt && !completedAt

  const btnBase: React.CSSProperties = {
    fontSize: '11px', padding: '5px 12px', borderRadius: '7px',
    cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
    fontFamily: 'inherit', WebkitUserSelect: 'none', userSelect: 'none',
    touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent',
    opacity: busy ? 0.5 : 1, flexShrink: 0,
  }

  if (loading) {
    return (
      <div style={{ fontSize: '10px', color: '#555577', whiteSpace: 'nowrap' }}>
        상담 상태 확인 중…
      </div>
    )
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      marginLeft: '8px', paddingLeft: '8px',
      borderLeft: '1px solid rgba(255,255,255,0.08)',
      minWidth: 0, flexShrink: 1,
    }}>
      {/* 상태 문구 — 자리가 모자라면 이것부터 줄어든다 */}
      <span style={{
        fontSize: '10px', color: 'rgba(255,255,255,0.35)',
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        minWidth: 0, flexShrink: 1,
      }}>
        {completedAt
          ? `종료 · ${fmtTime(startedAt)}~${fmtTime(completedAt)}`
          : startedAt
            ? `${fmtTime(startedAt)} 시작`
            : '대기 중'}
      </span>

      {/* ⏱ 경과시간 — 시작 이후에만 */}
      {startedAt && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '4px',
          fontSize: '12px', fontWeight: 700, fontVariantNumeric: 'tabular-nums',
          padding: '3px 8px', borderRadius: '7px', whiteSpace: 'nowrap', flexShrink: 0,
          border: running ? '1px solid rgba(97,196,89,0.45)' : '1px solid rgba(255,255,255,0.12)',
          background: running ? 'rgba(97,196,89,0.12)' : 'rgba(255,255,255,0.04)',
          color: running ? '#97c459' : '#9a98b0',
        }}>
          <span style={{ fontSize: '11px' }}>⏱</span>
          <span>{elapsedText()}</span>
        </div>
      )}

      {/* 시작 / 종료 / 재개 */}
      {!completedAt ? (
        !startedAt ? (
          <button type="button" onClick={handleStart} disabled={busy}
            style={{ ...btnBase, border: '1px solid rgba(250,199,117,0.5)', background: 'rgba(250,199,117,0.15)', color: '#FAC775' }}>
            ▶ 상담 시작
          </button>
        ) : (
          <button type="button" onClick={handleEnd} disabled={busy}
            style={{ ...btnBase, border: '1px solid rgba(255,80,80,0.35)', background: 'rgba(255,80,80,0.12)', color: 'rgba(255,120,120,0.95)' }}>
            ■ 상담 종료
          </button>
        )
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          <span style={{
            fontSize: '10px', padding: '5px 10px', borderRadius: '7px',
            border: '1px solid rgba(97,196,89,0.4)', background: 'rgba(97,196,89,0.15)',
            color: '#97c459', fontWeight: 600, whiteSpace: 'nowrap',
          }}>✓ 완료됨</span>
          <button type="button" onClick={handleResume} disabled={busy}
            style={{ ...btnBase, fontSize: '10px', padding: '5px 10px', border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#9a98b0' }}>
            ↺ 재개
          </button>
        </div>
      )}
    </div>
  )
}
