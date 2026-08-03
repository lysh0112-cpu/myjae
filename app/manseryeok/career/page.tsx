'use client'

/**
 * 진로적성 보관함
 * ─────────────────────────────────────────────
 * 진입: 홈 > [진로적성]  → /manseryeok/career
 * 흐름: 이 목록 > 카드 선택(그때 본 사람으로 다시보기)
 *              > [+ 새로 보기] > 사람 선택 모달 > career-input > career-result
 *
 * 데이터: listRecordsByService('career') — saju_records
 * 사주 보관함(saju-storage)과 같은 패턴. 검증된 부품을 그대로 쓴다.
 *
 * ★2026-07-28 — "지금 준비하고 있어요" 껍데기를 실제 화면으로 바꿨다.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listRecordsByService, deleteRecord, daysAgoLabel, type SajuRecord,
} from '@/lib/saju/sajuRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson, type SavedInputData } from '@/lib/saju/savedPeople'
import ConfirmDeleteDialog from '@/app/components/common/ConfirmDeleteDialog'
import StorageShell, { S } from '@/app/components/common/StorageShell'
import StorageRow from '@/app/components/common/StorageRow'

//    ★서비스 색(ACCENT)도 걷어냈습니다 — 배지까지 한 모습입니다.
// ⚠️ 2026-08-03 (44부 26차) — 보관함 «전용 색» 을 걷어냈습니다.
//    대표님 지시 「모두 통일해줘. 서비스별로 보관함을 차별화할 필요없어」
//    ⇒ 바탕·카드·선·버튼 색은 StorageShell 의 S 하나가 정합니다.

// 저장된 입력값 → 입력 화면이 읽는 URL 쿼리
function personToQuery(d: SavedInputData, name: string): string {
  const p = new URLSearchParams()
  p.set('year', d.year); p.set('month', d.month); p.set('day', d.day)
  p.set('gender', d.gender); p.set('calType', d.calType)
  p.set('leapMonth', d.leapMonth || '0'); p.set('hour', d.hour || '모름')
  if (name) p.set('name', name)
  return p.toString()
}

function CareerStorageInner() {
  const router = useRouter()
  const [records, setRecords] = useState<SajuRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<SajuRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    listRecordsByService('career').then(list => { if (!cancelled) setRecords(list) })
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
    <StorageShell
      title="진로적성 보관함"
      count={records ? records.length : null}
      loading={records === null}
      showEmpty={!!records && records.length === 0}
      emptyIcon="🧭"
      emptyTitle={"아직 저장된 진로적성 기록이 없어요"}
      emptyDesc={"새로 보면 여기에 차곡차곡 쌓여요"}
      actionLabel={"+ 새 진로적성 보기"}
      onAction={() => setPickerOpen(true)}
    >
        {records && records.map(r => (
          <StorageRow key={r.id} onClick={() => router.push(`/manseryeok/career-result?${personToQuery(r.inputData, r.title)}&recordId=${r.id}`)} onDelete={() => setConfirmDel(r)}>
            <div style={{
              minWidth: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: S.btn, color: '#fff', fontSize: 12, fontWeight: 600,
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
          </StorageRow>
        ))}

      <PersonPickerModal
        open={pickerOpen}
        serviceLabel="진로적성"
        serviceType="career"
        headline="누구의 진로적성을 볼까요?"
        submitLabel="저장하고 진로적성 보기"
        onPick={(person: SavedPerson) => {
          setPickerOpen(false)
          router.push(`/manseryeok/career-input?${toResultQuery(person)}`)
        }}
        onClose={() => setPickerOpen(false)}
      />

      {confirmDel && (
        <ConfirmDeleteDialog
          open
          message={<>{confirmDel.title || '이름 없음'}의 진로적성 기록을 삭제해요.</>}
          busy={deleting}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </StorageShell>
  )
}

export default function CareerStoragePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: '#5c3a1e' }}>불러오는 중…</div>}>
      <CareerStorageInner />
    </Suspense>
  )
}
