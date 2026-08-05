'use client'

/**
 * 사주 보관함 — 사주 / 대운 / 연월운세 별도 운용 (?service= 로 분리).
 * ─────────────────────────────────────────────
 * 진입: 홈 > [사주]       → ?service=saju
 *       홈 > [대운]       → ?service=daeun
 *       홈 > [연월운세]   → ?service=seyun
 * 흐름: 이 목록 > 카드 선택(그때 본 사람으로 다시보기)
 *                > [+ 새로 보기] > 사람 선택 모달 > 결과 화면
 *
 * 데이터: listRecordsByService('integrated_saju') — 해당 서비스 기록만. (saju_records)
 * 궁합 보관함(couple-storage)과 같은 패턴. 단 사주는 "한 사람"이라 더 단순.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listRecordsByService, deleteRecord, daysAgoLabel,
  type SajuRecord,
} from '@/lib/saju/sajuRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'
import type { SavedInputData } from '@/lib/saju/savedPeople'
import ConfirmDeleteDialog from '@/app/components/common/ConfirmDeleteDialog'
import StorageShell, { S } from '@/app/components/common/StorageShell'
import StorageRow from '@/app/components/common/StorageRow'

// 서비스별 정보 (제목·색·결과경로·unse 파라미터)
// ★2026-07-29 — 보관함 단권화 (대표님 확정)
//   전에는 ?service=saju|daeun|seyun 으로 보관함이 셋이었습니다.
//   같은 사람을 세 곳에 따로 저장해야 했고, 손님은 흐름을 보려고 세 번 들어와야 했습니다.
//   이제 하나입니다. 리포트가 [원국 + 대운 + 세운]을 한 번에 풀어 줍니다.
//   ⚠️ ?service= 파라미터는 **받기만 하고 무시**합니다. 예전 링크·북마크가 깨지지 않게
//      두는 것입니다. 어느 값이 와도 통합 보관함으로 옵니다.
type Service = 'integrated'
const SERVICE_INFO: Record<Service, {
  title: string; badge: string; accent: string;
  resultPath: string; unse?: 'daeun' | 'seyun'; headline: string; submitLabel: string;
}> = {
  integrated: {
    // ★2026-08-05 (47부 22차) — 제목을 「나의 만세력 보관함」으로. [대표님 지시]
    //   [까닭]  이 보관함에서 기록을 고르면 결과 화면 제목이 ★「나의 만세력」입니다.
    //     그런데 여기는 「내 사주 & 운세 보관함」이라 ★두 화면 이름이 이어지지 않았습니다.
    //   ⚠️ ★badge 는 «그대로» 둡니다 — 문장 «안» 에 들어가는 말이기 때문입니다.
    //      「아직 저장된 ★사주 & 운세 기록이 없어요」
    //      「+ 새 ★사주 & 운세 보기」
    //      「○○의 ★사주 & 운세 기록을 삭제해요」
    //      ⇒ badge 를 「나의 만세력」으로 바꾸면
    //        「아직 저장된 나의 만세력 기록이 없어요」가 되어 ★말이 어색해집니다.
    //   ⚠️ title 은 «두 곳» 에 쓰입니다 — 화면 제목 · PersonPickerModal 의 serviceLabel.
    //   ⚠️ ★홈 카드는 「내 사주와 운세보기」 그대로입니다 (대표님이 «놔두라» 하셨습니다).
    //      결과 화면 제목(「나의 만세력」)도 그대로입니다.
    title: '나의 만세력 보관함', badge: '사주 & 운세', accent: '#6e50a0',
    resultPath: '/manseryeok/result-new',
    headline: '누구의 사주와 운세를 볼까요?',
    submitLabel: '저장하고 리포트 보기',
  },
}

// 저장된 사람(input_data) → 결과 화면 URL. recordId를 실어 다시보기.
function toResultUrl(r: SajuRecord, svc: Service): string {
  const info = SERVICE_INFO[svc]
  const q = personToQuery(r.inputData, r.title)
  const unseQS = info.unse ? `&unse=${info.unse}` : ''
  return `${info.resultPath}?${q}${unseQS}&recordId=${r.id}`
}

// SavedInputData → result-new가 읽는 URL 쿼리 (year·month·day·gender·calType·hour)
function personToQuery(d: SavedInputData, name: string): string {
  const p = new URLSearchParams()
  p.set('year', d.year); p.set('month', d.month); p.set('day', d.day)
  p.set('gender', d.gender); p.set('calType', d.calType)
  p.set('leapMonth', d.leapMonth || '0'); p.set('hour', d.hour || '모름')
  if (name) p.set('name', name)
  return p.toString()
}

function SajuStorageInner() {
  const router = useRouter()
  // ★2026-07-29 — ?service= 를 더 안 읽습니다. 보관함이 하나로 합쳐졌습니다.
  // ★예전 링크(?service=daeun 등)가 와도 통합 보관함 하나로 받는다.
  const service: Service = 'integrated'
  const info = SERVICE_INFO[service]

  const [records, setRecords] = useState<SajuRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<SajuRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    listRecordsByService('integrated_saju').then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [service])

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

  // 새로 보기: 사람 선택 → 결과 화면(같은 서비스)
  const goResult = (q: string) => {
    const unseQS = info.unse ? `&unse=${info.unse}` : ''
    router.push(`${info.resultPath}?${q}${unseQS}`)
  }

  return (
    <StorageShell
      title={info.title}
      count={records ? records.length : null}
      loading={records === null}
      showEmpty={!!records && records.length === 0}
      emptyIcon="📜"
      emptyTitle={`아직 저장된 ${info.badge} 기록이 없어요`}
      emptyDesc="새로 보면 여기에 차곡차곡 쌓여요"
      actionLabel={`+ 새 ${info.badge} 보기`}
      onAction={() => setPickerOpen(true)}
    >
        {/* 카드 목록 */}
        {records && records.map(r => (
          <StorageRow key={r.id} onClick={() => router.push(toResultUrl(r, service))} onDelete={() => setConfirmDel(r)}>
            {/* 뱃지 (서비스 색) */}
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
                {r.inputData.year}.{r.inputData.month}.{r.inputData.day} · {daysAgoLabel(r.createdAt)}
              </div>
            </div>

          </StorageRow>
        ))}

      {/* 사람 선택 모달 (나 / 가족·지인 / 새 입력) — 검증된 공용 부품 */}
      <PersonPickerModal
        open={pickerOpen}
        serviceLabel={info.title}
        serviceType={'integrated_saju'}
        headline={info.headline}
        submitLabel={info.submitLabel}
        onPick={(person: SavedPerson) => {
          setPickerOpen(false)
          goResult(toResultQuery(person))
        }}
        onPickMe={() => {
          // "나" → 생년월일 URL 없이 이동 → result-new가 profiles(내 정보)를 띄움.
          setPickerOpen(false)
          const unseQS = info.unse ? `?unse=${info.unse}` : ''
          router.push(`${info.resultPath}${unseQS}`)
        }}
        onClose={() => setPickerOpen(false)}
      />

      {/* 삭제 확인 팝업 */}
      {confirmDel && (
        <ConfirmDeleteDialog
          open
          message={<>{confirmDel.title || '이 기록'}의 {info.badge} 기록을 삭제해요.</>}
          busy={deleting}
          onCancel={() => setConfirmDel(null)}
          onConfirm={handleDelete}
        />
      )}
    </StorageShell>
  )
}

export default function SajuStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <SajuStorageInner />
    </Suspense>
  )
}
