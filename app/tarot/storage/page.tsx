'use client'

/**
 * 타로 보관함 — 내가 예전에 뽑았던 타로 리딩 기록을 모아 보는 화면.
 * ─────────────────────────────────────────────
 * 진입: 홈 > [타로] > 보관함 (또는 타로 입구의 "이전 기록 보기")
 * 흐름: 이 목록 > 카드 선택(그때 본 해석 그대로 다시보기)
 *                > [+ 새 타로 보기] > 타로 입구(/tarot)
 *
 * 데이터: listTarotRecords() — 로그인 아이디(user_id) 기준. (saju_records, service_type='tarot')
 *   고객은 자기 기록을 보고, 각 기록엔 관심사(category) 배지가 붙는다(마케팅 트렌드와 동일 축).
 *
 * 사주 보관함(saju-storage) 패턴을 본떴다. 단 타로는 "사람"이 아니라
 * "질문·관심사·카드"라 사람 선택 모달 없이 입구로 바로 이동한다.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listTarotRecords, deleteTarotRecord, daysAgoLabel,
  TAROT_CATEGORY_COLOR,
  type TarotRecord,
} from '@/lib/saju/tarotRecords'
import ConfirmDeleteDialog from '@/app/components/common/ConfirmDeleteDialog'
import StorageShell from '@/app/components/common/StorageShell'
import StorageRow from '@/app/components/common/StorageRow'

function TarotStorageInner() {
  const router = useRouter()

  const [records, setRecords] = useState<TarotRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<TarotRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listTarotRecords().then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteTarotRecord(confirmDel.id)
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
      title="타로 보관함"
      onBack={() => router.push('/tarot')}
      count={records ? records.length : null}
      loading={records === null}
      showEmpty={!!records && records.length === 0}
      emptyIcon="🔮"
      emptyTitle="아직 저장된 타로 기록이 없어요"
      emptyDesc="카드를 뽑으면 여기에 차곡차곡 쌓여요"
      actionLabel="+ 새 타로 보기"
      onAction={() => router.push('/tarot')}
    >
        {/* 카드 목록 */}
        {records && records.map(r => (
          <StorageRow key={r.id} onClick={() => router.push(`/tarot?recordId=${r.id}`)} onDelete={() => setConfirmDel(r)}>
            {/* 관심사 배지 */}
            <div style={{
              minWidth: 52, height: 44, borderRadius: 10, flexShrink: 0, padding: '0 6px',
              background: TAROT_CATEGORY_COLOR[r.category], color: '#fff', fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.25,
            }}>
              {r.category}
            </div>

            {/* 질문 + 스프레드 + 날짜 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {r.question || '무제 리딩'}
              </div>
              <div style={{ fontSize: 11, color: '#5c3a1e' }}>
                {r.spreadTitle} · {daysAgoLabel(r.createdAt)}
              </div>
            </div>
          </StorageRow>
        ))}

      {/* 삭제 확인 팝업 */}
      {confirmDel && (
        <ConfirmDeleteDialog
          open
          message={<>이 타로 기록을 삭제해요.</>}
          busy={deleting}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </StorageShell>
  )
}

export default function TarotStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <TarotStorageInner />
    </Suspense>
  )
}
