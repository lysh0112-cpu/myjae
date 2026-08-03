'use client'

/**
 * 출산택일 보관함 — 사주·궁합·결혼택일과 같은 "보관함 관문" 패턴 (피치톤).
 * ─────────────────────────────────────────────
 * 진입: 홈 > [출산택일] → 이 보관함
 * 흐름: 이 목록 > 카드 선택 > 결과 화면(그대로 출력, recordId)
 *                > [+ 새 출산택일 보기] > 부모 두 사람 선택(input)
 *
 * 데이터: listBirthRecords() — 내 출산택일 기록 최신순. (saju_records, service_type='birth')
 * 카드: 부모 두 사람 + 예정일/요약 배지.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listBirthRecords, daysAgoLabel, deleteBirthRecord,
  type BirthRecord,
} from '@/lib/saju/birthRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'
import ConfirmDeleteDialog from '@/app/components/common/ConfirmDeleteDialog'
import StorageShell from '@/app/components/common/StorageShell'
import StorageRow from '@/app/components/common/StorageRow'

// ⚠️ 2026-08-03 (44부 26차) — 보관함 «전용 색» 을 걷어냈습니다.
//    대표님 지시 「모두 통일해줘. 서비스별로 보관함을 차별화할 필요없어」
//    ⇒ 바탕·카드·선·버튼 색은 StorageShell 의 S 하나가 정합니다.

// 두 부모 정보 → 다시보기 URL
//   ★기록이 어느 화면에서 만들어졌는지에 따라 갈라 보낸다. (2026-07-23)
//     v7  → /detail  고른 하루의 해설 (점수 없음)
//     그 외 → /result 옛 화면 (점수·순위). 기존 기록이 그대로 열려야 하므로 남겨 둔다.
function toResultUrl(r: BirthRecord): string {
  const pack = (input: SavedInputData & { name?: string }, name: string) =>
    encodeURIComponent(JSON.stringify({ ...input, name }))
  const p1 = pack(r.input1, r.name1)
  const p2 = pack(r.input2, r.name2)
  const survey = encodeURIComponent(JSON.stringify(r.survey))

  if (r.version === 'v7') {
    // v7 기록은 고른 날짜·시각이 result_data.picked 에 들어 있다.
    // 목록은 result_data 를 안 실어 오므로(성능), recordId 만 넘기고
    // 해설 화면이 스스로 불러와 복원한다.
    return `/manseryeok/birth-timing/detail?recordId=${r.id}` +
      `&p1=${p1}&p2=${p2}&survey=${survey}`
  }
  return `/manseryeok/birth-timing/result?recordId=${r.id}` +
    `&p1=${p1}&p2=${p2}&survey=${survey}`
}

function BirthStorageInner() {
  const router = useRouter()

  const [records, setRecords] = useState<BirthRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<BirthRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listBirthRecords().then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteBirthRecord(confirmDel.id)
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
      title="출산택일 보관함"
      count={records ? records.length : null}
      loading={records === null}
      showEmpty={!!records && records.length === 0}
      emptyIcon="🍼"
      emptyTitle="아직 저장된 출산택일이 없어요"
      emptyDesc="새로 택일을 보면 여기에 차곡차곡 쌓여요"
      actionLabel="+ 새 출산택일 보기"
      onAction={() => router.push('/manseryeok/birth-timing/input')}
    >
        {/* 카드 목록 */}
        {records && records.map(r => (
          <StorageRow key={r.id} onClick={() => router.push(toResultUrl(r))} onDelete={() => setConfirmDel(r)}>
            {/* 예정일 배지 */}
            <div style={{ textAlign: 'center', minWidth: 50, flexShrink: 0 }}>
              <span style={{
                display: 'inline-block', padding: '4px 8px', borderRadius: 8,
                fontSize: 11, fontWeight: 600, color: '#96502e', background: '#f7ede2',
              }}>
                택일
              </span>
            </div>

            <div style={{ width: '0.5px', height: 34, background: '#f0e0d5', flexShrink: 0 }} />

            {/* 두 부모 + 요약 + 날짜 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 4 }}>
                {r.name1} <span style={{ color: '#6b5340' }}>·</span> {r.name2}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#5c3a1e' }}>
                <span>{daysAgoLabel(r.createdAt)}</span>
                {r.summary ? <span style={{ color: '#6b5340' }}>· {r.summary}</span> : null}
              </div>
            </div>
          </StorageRow>
        ))}

      {/* 삭제 확인 팝업 */}
      {confirmDel && (
        <ConfirmDeleteDialog
          open
          message={<>{confirmDel.name1} <span style={{ color: '#6b5340' }}>·</span> {confirmDel.name2} 출산택일을 삭제해요.</>}
          busy={deleting}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </StorageShell>
  )
}

export default function BirthStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <BirthStorageInner />
    </Suspense>
  )
}
