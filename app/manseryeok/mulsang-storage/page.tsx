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
  listRecordsByService, deleteRecord, daysAgoLabel, loadMulsangSummaries,
  type SajuRecord, type MulsangSummary,
} from '@/lib/saju/sajuRecords'
import { STYLE_CONFIGS } from '@/lib/saju/mulsangPrompt'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'
import ConfirmDeleteDialog from '@/app/components/common/ConfirmDeleteDialog'
import StorageShell, { S } from '@/app/components/common/StorageShell'
import StorageRow from '@/app/components/common/StorageRow'

//    ★서비스 색(ACCENT)도 걷어냈습니다 — 배지까지 한 모습입니다.

function MulsangStorageInner() {
  const router = useRouter()
  const [records, setRecords] = useState<SajuRecord[] | null>(null)
  const [summaries, setSummaries] = useState<Record<string, MulsangSummary>>({})
  const [confirmDel, setConfirmDel] = useState<SajuRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    listRecordsByService('mulsang').then(async list => {
      if (cancelled) return
      setRecords(list)
      // 화풍·그림 유무는 따로 가볍게 불러온다 (목록엔 result_data 가 없다)
      if (list.length > 0) {
        const sums = await loadMulsangSummaries(list.map(r => r.id))
        if (!cancelled) setSummaries(sums)
      }
    })
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

  // 새 그림: 사람 선택 → mulsang(생성). "나"면 사람 정보 없이 fresh 만.
  //   ★fresh=1 — "새로 그리러 왔다"는 표시. 이게 있으면 mulsang 이
  //     localStorage 의 예전 그림을 복원하지 않는다. (2026-07-21)
  //     예전엔 표시가 없어 [+ 새 그림 그리기]로 들어가도 옛 그림이 떴다.
  const goNew = (q: string) => router.push(`/manseryeok/mulsang?${q}&fresh=1`)

  return (
    <StorageShell
      title="내 사주 그림 보관함"
      count={records ? records.length : null}
      loading={records === null}
      showEmpty={!!records && records.length === 0}
      emptyIcon="🖼️"
      emptyTitle={"아직 저장된 그림이 없어요"}
      emptyDesc={"새 그림을 그리면 여기에 차곡차곡 쌓여요"}
      actionLabel={"+ 새 그림 그리기"}
      onAction={() => setPickerOpen(true)}
    >
        {records && records.map(r => (
          <StorageRow key={r.id} onClick={() => openRecord(r)} onDelete={() => setConfirmDel(r)}>
            {/* 뱃지 */}
            <div style={{
              minWidth: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: S.btn, color: '#fff', fontSize: 12, fontWeight: 600,
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
                {r.inputData.year}.{r.inputData.month}.{r.inputData.day}
                {(() => {
                  const s = summaries[r.id]
                  if (!s) return null
                  // 그림이 없는 기록 — 그림 생성에 실패했던 건. 열기 전에 알 수 있게 표시.
                  if (!s.hasImage) return <> · <span style={{ color: '#8f3d0e' }}>그림 없음</span></>
                  const label = s.style ? STYLE_CONFIGS[s.style]?.label : null
                  return label ? <> · {label}</> : null
                })()}
                {' · '}{daysAgoLabel(r.createdAt)}
              </div>
            </div>
          </StorageRow>
        ))}

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
          // "나" → 사람 정보 없이 → mulsang 이 내 profiles 를 읽는다.
          //   fresh=1 로 "새로 그리기"임을 알린다(옛 그림 복원 안 함).
          setPickerOpen(false)
          router.push('/manseryeok/mulsang?fresh=1')
        }}
        onClose={() => setPickerOpen(false)}
      />

      {/* 삭제 확인 팝업 */}
      {confirmDel && (
        <ConfirmDeleteDialog
          open
          message={<>{confirmDel.title || '이 기록'}의 그림 기록을 삭제해요.</>}
          busy={deleting}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </StorageShell>
  )
}

export default function MulsangStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <MulsangStorageInner />
    </Suspense>
  )
}
