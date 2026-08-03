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
    title: '내 사주 & 운세 보관함', badge: '사주 & 운세', accent: '#6e50a0',
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
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/home-new')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>{info.title}</div>
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
            <div style={{ fontSize: 30, marginBottom: 10 }}>📜</div>
            <div style={{ fontSize: 14, color: '#96502e', fontWeight: 500, marginBottom: 4 }}>
              아직 저장된 {info.badge} 기록이 없어요
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>새로 보면 여기에 차곡차곡 쌓여요</div>
          </div>
        )}

        {/* 카드 목록 */}
        {records && records.map(r => (
          <div key={r.id} onClick={() => router.push(toResultUrl(r, service))}
            style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '15px',
              background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14,
              marginBottom: 10, cursor: 'pointer',
            }}>
            {/* 뱃지 (서비스 색) */}
            <div style={{
              minWidth: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: info.accent, color: '#fff', fontSize: 12, fontWeight: 600,
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

            {/* 삭제 버튼 */}
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

        {/* 새로 보기 */}
        <button onClick={() => setPickerOpen(true)}
          style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
            background: '#b46e46', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
          + 새 {info.badge} 보기
        </button>
      </div>

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
    </main>
  )
}

export default function SajuStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <SajuStorageInner />
    </Suspense>
  )
}
