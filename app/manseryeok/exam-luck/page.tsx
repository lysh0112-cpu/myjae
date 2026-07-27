'use client'

/**
 * 합격운 · 취업운 보관함
 * ─────────────────────────────────────────────
 * 진입: 홈 > [합격운/취업운 🐍] → /manseryeok/exam-luck
 * 흐름: 이 목록 > 카드 선택(그때 본 사람으로 다시보기)
 *              > [+ 새로 보기] > 사람 선택 모달 > exam-luck-input > exam-luck-result
 *
 * 데이터: listRecordsByService('examluck') — saju_records
 * ★진로적성 보관함(career/page.tsx)을 그대로 본떴다. 새로 설계하지 않는다.
 *   (작업지시 2장 — 같은 흐름·같은 얼개)
 *
 * ★2026-07-27 — "지금 준비하고 있어요" 껍데기를 실제 화면으로 바꿨다.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listRecordsByService, deleteRecord, daysAgoLabel, type SajuRecord,
} from '@/lib/saju/sajuRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson, type SavedInputData } from '@/lib/saju/savedPeople'

const ACCENT = '#c85a8c'      // 합격운 색 (홈 서비스 목록과 같은 분홍)
const SOFT = '#f7e6ee'
const BG = '#FDF6F0'
const CARD = '#FFFBF7'
const LINE = '#f0e0d5'

function personToQuery(d: SavedInputData, name: string): string {
  const p = new URLSearchParams()
  p.set('year', d.year); p.set('month', d.month); p.set('day', d.day)
  p.set('gender', d.gender); p.set('calType', d.calType)
  p.set('leapMonth', d.leapMonth || '0'); p.set('hour', d.hour || '모름')
  if (name) p.set('name', name)
  return p.toString()
}

function ExamLuckStorageInner() {
  const router = useRouter()
  const [records, setRecords] = useState<SajuRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<SajuRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    listRecordsByService('examluck').then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteRecord(confirmDel.id)
    setDeleting(false)
    if (ok) {
      setRecords(prev => prev ? prev.filter(x => x.id !== confirmDel.id) : prev)
      setConfirmDel(null)
    } else {
      alert('삭제하지 못했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  return (
    <main style={{ minHeight: '100vh', background: BG, maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${LINE}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/home-new')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>합격운 · 취업운 보관함</div>
        {records && <div style={{ marginLeft: 'auto', fontSize: 12, color: '#5c3a1e' }}>{records.length}건</div>}
      </div>

      <div style={{ padding: '16px 14px 0' }}>
        {records === null && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#5c3a1e', fontSize: 13 }}>
            보관함을 불러오는 중…
          </div>
        )}

        {records && records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '46px 20px', color: '#5c3a1e' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🌱</div>
            <div style={{ fontSize: 14, color: ACCENT, fontWeight: 500, marginBottom: 4 }}>
              아직 저장된 합격운 기록이 없어요
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>새로 보면 여기에 차곡차곡 쌓여요</div>
          </div>
        )}

        {records && records.map(r => (
          <div key={r.id}
            onClick={() => router.push(`/manseryeok/exam-luck-result?${personToQuery(r.inputData, r.title)}&recordId=${r.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: 15,
              background: CARD, border: `0.5px solid ${LINE}`, borderRadius: 14,
              marginBottom: 10, cursor: 'pointer',
            }}>
            <div style={{
              minWidth: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {(r.title || '?').slice(0, 2)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 3 }}>
                {r.title || '이름 없음'}
                {r.relation ? <span style={{ fontSize: 11, color: '#5c3a1e', marginLeft: 6 }}>{r.relation}</span> : null}
              </div>
              <div style={{ fontSize: 11, color: '#5c3a1e' }}>
                {r.inputData.year}.{r.inputData.month}.{r.inputData.day} · {daysAgoLabel(r.createdAt)}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); setConfirmDel(r) }} aria-label="삭제"
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                background: 'none', border: 'none', color: '#6b5340', fontSize: 17,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>×</button>
          </div>
        ))}

        <button onClick={() => setPickerOpen(true)}
          style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
            background: ACCENT, border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
          + 새 합격운 보기
        </button>

        <div style={{
          marginTop: 14, background: SOFT, border: '0.5px solid #f0d8e2', borderRadius: 12,
          padding: '11px 14px', fontSize: 11.5, color: '#8c4a63', lineHeight: 1.7,
        }}>
          시험과 일자리의 흐름을 봅니다. 사주가 말해 주는 건 흐름이고,
          결과를 만드는 건 준비한 시간이에요.
        </div>
      </div>

      <PersonPickerModal
        open={pickerOpen}
        serviceLabel="합격운"
        serviceType="examluck"
        headline="누구의 합격운을 볼까요?"
        submitLabel="저장하고 합격운 보기"
        onPick={(person: SavedPerson) => {
          setPickerOpen(false)
          router.push(`/manseryeok/exam-luck-input?${toResultQuery(person)}`)
        }}
        onClose={() => setPickerOpen(false)}
      />

      {confirmDel && (
        <div onClick={() => !deleting && setConfirmDel(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(60,40,30,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 24,
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: CARD, borderRadius: 16, padding: '22px 20px', maxWidth: 300, width: '100%' }}>
            <div style={{ fontSize: 14.5, fontWeight: 500, color: '#3a2e28', marginBottom: 6 }}>
              이 기록을 지울까요?
            </div>
            <div style={{ fontSize: 12.5, color: '#5c3a1e', lineHeight: 1.6, marginBottom: 18 }}>
              {confirmDel.title || '이름 없음'} · 지우면 되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDel(null)} disabled={deleting}
                style={{ flex: 1, padding: 11, borderRadius: 10, background: '#faf3ee', border: `0.5px solid ${LINE}`, color: '#5c3a1e', fontSize: 13, cursor: 'pointer' }}>
                그대로 둘게요
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ flex: 1, padding: 11, borderRadius: 10, background: '#c05a5a', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer' }}>
                {deleting ? '지우는 중…' : '지울게요'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function ExamLuckStoragePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <ExamLuckStorageInner />
    </Suspense>
  )
}
