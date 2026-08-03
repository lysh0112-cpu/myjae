'use client'

/**
 * 이사택일 보관함 — 사주·궁합·결혼택일과 같은 "보관함 관문" 패턴
 * ─────────────────────────────────────────────
 * 진입: 홈 > [이사택일] → 이 보관함
 * 흐름: 목록 > 카드 선택 > 결과 화면(그대로 출력, recordId)
 *              > [+ 새 이사택일 보기] > input(두 사람 + 명의 + 방향)
 *
 * 데이터: listMovingRecords() — saju_records, service_type='moving'
 * kind: check(정한 날) / find(좋은 날) — 카드에 배지로 구분.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listMovingRecords, daysAgoLabel, deleteMovingRecord,
  OWNER_MODE_LABEL,
  type MovingRecord,
} from '@/lib/saju/movingRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'
import ConfirmDeleteDialog from '@/app/components/common/ConfirmDeleteDialog'
import StorageShell from '@/app/components/common/StorageShell'
import StorageRow from '@/app/components/common/StorageRow'

// ⚠️ 2026-08-03 (44부 26차) — 이사택일 «전용 색» 을 걷어냈습니다.
//    대표님 지시 「모두 통일해줘. 서비스별로 보관함을 차별화할 필요없어」
//    ⇒ 보관함의 색·크기는 StorageShell 의 S 하나가 정합니다.
//    ★sub 는 Suspense 대기 글자에 아직 씁니다.
const sub = '#9A8060'

const KIND_BADGE: Record<'check' | 'find', { label: string; color: string; bg: string }> = {
  check: { label: '정한 날', color: '#7A6440', bg: '#F0EADA' },
  find: { label: '좋은 날', color: '#5F7A4E', bg: '#EDF3E4' },
}

/** 기록 → 결과 화면 URL. kind 에 따라 pick/check 로 분기 */
function toResultUrl(r: MovingRecord): string {
  const pack = (input: SavedInputData & { name?: string }, name: string) =>
    encodeURIComponent(JSON.stringify({ ...input, name }))
  const dest = r.kind === 'find' ? 'pick' : 'check'
  const q = new URLSearchParams()
  q.set('recordId', r.id)
  q.set('p1', pack(r.input1, r.name1))
  if (r.input2) q.set('p2', pack(r.input2, r.name2))
  q.set('owner', r.ownerMode)
  q.set('who', r.ownerWho)
  if (r.direction) q.set('dir', r.direction)
  return `/manseryeok/moving-timing/${dest}?${q.toString()}`
}

function MovingStorageInner() {
  const router = useRouter()

  const [records, setRecords] = useState<MovingRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<MovingRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listMovingRecords().then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteMovingRecord(confirmDel.id)
    setDeleting(false)
    if (ok) {
      setRecords(prev => (prev ? prev.filter(x => x.id !== confirmDel.id) : prev))
    }
    setConfirmDel(null)
  }

  return (
    <StorageShell
      title="이사택일 보관함"
      count={records ? records.length : null}
      loading={records === null}
      showEmpty={!!records && records.length === 0}
      emptyIcon="📦"
      emptyTitle="아직 보신 이사택일이 없어요"
      emptyDesc="새로 택일을 보면 여기에 차곡차곡 쌓여요"
      actionLabel="+ 새 이사택일 보기"
      onAction={() => router.push('/manseryeok/moving-timing/input')}
    >
      {records && records.map(r => {
        const badge = KIND_BADGE[r.kind]
        return (
          <StorageRow key={r.id} onClick={() => router.push(toResultUrl(r))} onDelete={() => setConfirmDel(r)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
                <span style={{
                  background: badge.bg, color: badge.color, fontSize: 10.5,
                  fontWeight: 700, padding: '3px 9px', borderRadius: 7,
                }}>
                  {badge.label}
                </span>
                <span style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28' }}>
                  {r.name1}{r.name2 ? ` · ${r.name2}` : ''}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#5c3a1e', lineHeight: 1.6 }}>
                {r.summary}
              </div>
              <div style={{ fontSize: 11, color: '#5c3a1e', marginTop: 3 }}>
                {OWNER_MODE_LABEL[r.ownerMode]}
                {r.direction && ` · ${r.direction}쪽`}
                {' · '}{daysAgoLabel(r.createdAt)}
              </div>
            </div>
          </StorageRow>
        )
      })}

      {confirmDel && (
        <ConfirmDeleteDialog
          open
          message={<>{confirmDel.name1}{confirmDel.name2 ? ` · ${confirmDel.name2}` : ''} 이사택일을 삭제해요.</>}
          busy={deleting}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </StorageShell>
  )
}

export default function MovingStoragePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: sub }}>불러오는 중…</div>}>
      <MovingStorageInner />
    </Suspense>
  )
}
