'use client'

/**
 * 내사주그림 보관함 — saju-storage를 본뜬 "관문" 화면.
 * ─────────────────────────────────────────────
 * 진입: 홈 > [내사주그림] → 이 목록
 * 흐름: 목록 > 카드 선택(저장된 그림·해설 다시보기 = recordId로 mulsang 진입)
 *              > [+ 새 그림 그리기] > 사람 선택 모달 > mulsang(생성)
 *
 * 데이터: listRecordsByService('mulsang') — saju_records의 mulsang 기록만.
 * 그림은 AI라 재생성 불가 → 다시보기는 반드시 저장 스냅샷(recordId)으로 연다.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listRecordsByService, deleteRecord, daysAgoLabel,
  type SajuRecord,
} from '@/lib/saju/sajuRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'

const ACCENT = '#b46e46'

function MulsangStorageInner() {
  const router = useRouter()
  const [records, setRecords] = useState<SajuRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<SajuRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    listRecordsByService('mulsang').then(list => { if (!cancelled) setRecords(list) })
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

  // 다시보기: 저장 스냅샷(recordId)으로 mulsang 진입
  const openRecord = (r: SajuRecord) => {
    router.push(`/manseryeok/mulsang?recordId=${r.id}`)
  }

  // 새 그림: 사람 선택 → mulsang(생성). "나"면 URL 없이.
  const goNew = (q: string) => router.push(`/manseryeok/mulsang?${q}`)

  return (
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/home-new')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>내 사주 그림 보관함</div>
        {records && <div style={{ marginLeft: 'auto', fontSize: 12, color: '#5c3a1e' }}>{records.length}건</div>}
      </div>

      <div style={{ padding: '16px 14px 0' }}>
        {/* 로딩 */}
        {records === null && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#5c3a1e', fontSize: 13 }}>
            보관함을 불러오는 중…
          </div>
        )}

        {/* 빈 상태 */}
        {records && records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '46px 20px', color: '#5c3a1e' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>🖼️</div>
            <div style={{ fontSize: 14, color: '#96502e', fontWeight: 500, marginBottom: 4 }}>
              아직 저장된 그림이 없어요
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>새 그림을 그리면 여기에 차곡차곡 쌓여요</div>
          </div>
        )}

        {/* 카드 목록 */}
        {records && records.map(r => (
          <div key={r.id} onClick={() => openRecord(r)}
            style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '15px',
              background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14,
              marginBottom: 10, cursor: 'pointer',
            }}>
            {/* 뱃지 */}
            <div style={{
              minWidth: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: ACCENT, color: '#fff', fontSize: 12, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {(r.title || '?').slice(0, 2)}
            </div>

            {/* 이름 + 생년월일 + 날짜 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 3 }}>
                {r.title || '이름 없음'}
                {r.relation ? <span style={{ fontSize: 11, color: '#5c3a1e', marginLeft: 6 }}>{r.relation}</span> : null}
              </div>
              <div style={{ fontSize: 11, color: '#5c3a1e' }}>
                {r.inputData.year}.{r.inputData.month}.{r.inputData.day} · {daysAgoLabel(r.createdAt)}
              </div>
            </div>

            {/* 삭제 */}
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDel(r) }}
              aria-label="삭제"
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                background: 'none', border: 'none', color: '#6b5340', fontSize: 17,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
              ×
            </button>
          </div>
        ))}

        {/* 새 그림 */}
        <button onClick={() => setPickerOpen(true)}
          style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
            background: ACCENT, border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
          + 새 그림 그리기
        </button>
      </div>

      {/* 사람 선택 모달 (나 / 가족·지인 / 새 입력) */}
      <PersonPickerModal
        open={pickerOpen}
        serviceLabel="내 사주 그림"
        serviceType="mulsang"
        headline="누구의 사주를 그릴까요?"
        submitLabel="이 사람으로 그리기"
        onPick={(person: SavedPerson) => {
          setPickerOpen(false)
          goNew(toResultQuery(person))
        }}
        onPickMe={() => {
          // "나" → URL 없이 → mulsang이 내 profiles를 읽음
          setPickerOpen(false)
          router.push('/manseryeok/mulsang')
        }}
        onClose={() => setPickerOpen(false)}
      />

      {/* 삭제 확인 팝업 */}
      {confirmDel && (
        <div
          onClick={() => !deleting && setConfirmDel(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(40,28,22,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}>
          <div onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 320, background: '#FFFBF7',
              borderRadius: 16, padding: '22px 20px 16px', textAlign: 'center',
              boxShadow: '0 8px 30px rgba(90,50,30,0.2)',
            }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#3a2e28', marginBottom: 8 }}>
              정말 삭제할까요?
            </div>
            <div style={{ fontSize: 13, color: '#96502e', lineHeight: 1.5, marginBottom: 18 }}>
              {confirmDel.title || '이 기록'}의 그림 기록을 삭제해요.<br />
              삭제하면 되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDel(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, fontSize: 13.5, fontWeight: 500,
                  background: '#f3e6db', border: 'none', color: '#96502e',
                  cursor: deleting ? 'default' : 'pointer',
                }}>
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, fontSize: 13.5, fontWeight: 500,
                  background: deleting ? '#d99' : '#c8506e', border: 'none', color: '#fff',
                  cursor: deleting ? 'default' : 'pointer',
                }}>
                {deleting ? '삭제 중…' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function MulsangStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <MulsangStorageInner />
    </Suspense>
  )
}
