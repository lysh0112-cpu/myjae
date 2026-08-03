'use client'

/**
 * 결혼택일 보관함 — 사주·궁합과 같은 "보관함 관문" 패턴 (피치톤).
 * ─────────────────────────────────────────────
 * 진입: 홈 > [결혼택일] → 이 보관함
 * 흐름: 이 목록 > 카드 선택 > 결과 화면(그대로 출력, recordId)
 *                > [+ 새 결혼택일 보기] > 두 사람 선택(wedding-input-new)
 *
 * 데이터: listWeddingRecords() — 내 결혼택일 기록 최신순. (saju_records, service_type='wedding')
 * kind: check(정한 날 봐주기) / find(좋은 날 찾기) — 카드에 배지로 구분.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listWeddingRecords, daysAgoLabel, deleteWeddingRecord,
  WEDDING_KIND_LABEL,
  type WeddingRecord,
} from '@/lib/saju/weddingRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'
import ConfirmDeleteDialog from '@/app/components/common/ConfirmDeleteDialog'
import StorageShell from '@/app/components/common/StorageShell'
import StorageRow from '@/app/components/common/StorageRow'

// ⚠️ 2026-08-03 (44부 26차) — 보관함 «전용 색» 을 걷어냈습니다.
//    대표님 지시 「모두 통일해줘. 서비스별로 보관함을 차별화할 필요없어」
//    ⇒ 바탕·카드·선·버튼 색은 StorageShell 의 S 하나가 정합니다.

// 카드 kind 배지 색
const KIND_BADGE: Record<'check' | 'find', { label: string; color: string; bg: string }> = {
  check: { label: '정한 날', color: '#96502e', bg: '#f3e6db' },
  find:  { label: '좋은 날', color: '#b46e46', bg: '#f7ede2' },
}

// 두 사람 정보 → 결과 화면 URL 쿼리 (kind에 따라 pick/check 로 분기)
//   ★v7(2026-07-24): 옛 점수제 화면 /result 를 지웠다. find 기록은 /pick 으로 간다.
function toResultUrl(r: WeddingRecord): string {
  const pack = (input: SavedInputData & { name?: string }, name: string) =>
    encodeURIComponent(JSON.stringify({ ...input, name }))
  const dest = r.kind === 'find' ? 'pick' : 'check'
  return `/manseryeok/wedding-timing/${dest}?recordId=${r.id}` +
    `&p1=${pack(r.input1, r.name1)}&p2=${pack(r.input2, r.name2)}`
}

function WeddingStorageInner() {
  const router = useRouter()

  const [records, setRecords] = useState<WeddingRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<WeddingRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listWeddingRecords().then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteWeddingRecord(confirmDel.id)
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
      title="결혼택일 보관함"
      count={records ? records.length : null}
      loading={records === null}
      showEmpty={!!records && records.length === 0}
      emptyIcon="💍"
      emptyTitle={"아직 저장된 결혼택일이 없어요"}
      emptyDesc={"새로 택일을 보면 여기에 차곡차곡 쌓여요"}
      actionLabel={"+ 새 결혼택일 보기"}
      onAction={() => router.push('/manseryeok/wedding-timing/input')}
    >
        {/* 카드 목록 */}
        {records && records.map(r => {
          const badge = KIND_BADGE[r.kind]
          return (
            <StorageRow key={r.id} onClick={() => router.push(toResultUrl(r))} onDelete={() => setConfirmDel(r)}>
              {/* kind 배지 */}
              <div style={{ textAlign: 'center', minWidth: 50, flexShrink: 0 }}>
                <span style={{
                  display: 'inline-block', padding: '4px 8px', borderRadius: 8,
                  fontSize: 11, fontWeight: 600, color: badge.color, background: badge.bg,
                }}>
                  {badge.label}
                </span>
              </div>

              <div style={{ width: '0.5px', height: 34, background: '#f0e0d5', flexShrink: 0 }} />

              {/* 두 사람 + 요약 + 날짜 */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 4 }}>
                  {r.name1} <span style={{ color: '#d4537e' }}>♥</span> {r.name2}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#5c3a1e' }}>
                  <span>{daysAgoLabel(r.createdAt)}</span>
                  {r.summary ? <span style={{ color: '#6b5340' }}>· {r.summary}</span> : null}
                </div>
              </div>
            </StorageRow>
          )
        })}

      {/* 삭제 확인 팝업 */}
      {confirmDel && (
        <ConfirmDeleteDialog
          open
          message={<>{confirmDel.name1} <span style={{ color: '#d4537e' }}>♥</span> {confirmDel.name2} 결혼택일을 삭제해요.</>}
          busy={deleting}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </StorageShell>
  )
}

export default function WeddingStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <WeddingStorageInner />
    </Suspense>
  )
}
