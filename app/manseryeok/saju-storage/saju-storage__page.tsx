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
 * 데이터: listRecordsByService(service) — 해당 서비스 기록만. (saju_records)
 * 궁합 보관함(couple-storage)과 같은 패턴. 단 사주는 "한 사람"이라 더 단순.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  listRecordsByService, deleteRecord, daysAgoLabel,
  type SajuRecord,
} from '@/lib/saju/sajuRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'
import type { SavedInputData } from '@/lib/saju/savedPeople'

// 서비스별 정보 (제목·색·결과경로·unse 파라미터)
type Service = 'saju' | 'daeun' | 'seyun'
const SERVICE_INFO: Record<Service, {
  title: string; badge: string; accent: string;
  resultPath: string; unse?: 'daeun' | 'seyun'; headline: string; submitLabel: string;
}> = {
  saju:  { title: '사주 보관함',       badge: '사주',   accent: '#6e50a0', resultPath: '/manseryeok/result-new', headline: '누구의 사주를 볼까요?',   submitLabel: '저장하고 사주 보기' },
  daeun: { title: '대운 보관함',       badge: '대운',   accent: '#3c82a0', resultPath: '/manseryeok/result-new', unse: 'daeun', headline: '누구의 대운을 볼까요?', submitLabel: '저장하고 대운 보기' },
  seyun: { title: '연월운세 보관함',   badge: '연월운세', accent: '#8c783c', resultPath: '/manseryeok/result-new', unse: 'seyun', headline: '누구의 세운을 볼까요?', submitLabel: '저장하고 세운 보기' },
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
  const searchParams = useSearchParams()
  const svcParam = searchParams.get('service')
  const service: Service = (svcParam === 'daeun' || svcParam === 'seyun') ? svcParam : 'saju'
  const info = SERVICE_INFO[service]

  const [records, setRecords] = useState<SajuRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<SajuRecord | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    listRecordsByService(service).then(list => { if (!cancelled) setRecords(list) })
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
        {records && <div style={{ marginLeft: 'auto', fontSize: 12, color: '#b4785a' }}>{records.length}건</div>}
      </div>

      <div style={{ padding: '16px 14px 0' }}>
        {/* 로딩 */}
        {records === null && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#b4785a', fontSize: 13 }}>
            보관함을 불러오는 중…
          </div>
        )}

        {/* 빈 상태 */}
        {records && records.length === 0 && (
          <div style={{ textAlign: 'center', padding: '46px 20px', color: '#b4785a' }}>
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
                {r.relation ? <span style={{ fontSize: 11, color: '#b4785a', marginLeft: 6 }}>{r.relation}</span> : null}
              </div>
              <div style={{ fontSize: 11, color: '#b4785a' }}>
                {r.inputData.year}.{r.inputData.month}.{r.inputData.day} · {daysAgoLabel(r.createdAt)}
              </div>
            </div>

            {/* 삭제 버튼 */}
            <button
              onClick={(e) => { e.stopPropagation(); setConfirmDel(r) }}
              aria-label="삭제"
              style={{
                flexShrink: 0, width: 28, height: 28, borderRadius: 8,
                background: 'none', border: 'none', color: '#c5a590', fontSize: 17,
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
        serviceType={service}
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
              {confirmDel.title || '이 기록'}의 {info.badge} 기록을 삭제해요.<br />
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

export default function SajuStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <SajuStorageInner />
    </Suspense>
  )
}
