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

const accent = '#96643c'   // 결혼택일 포인트(브라운)

// 카드 kind 배지 색
const KIND_BADGE: Record<'check' | 'find', { label: string; color: string; bg: string }> = {
  check: { label: '정한 날', color: '#96502e', bg: '#f3e6db' },
  find:  { label: '좋은 날', color: '#b46e46', bg: '#f7ede2' },
}

// 두 사람 정보 → 결과 화면 URL 쿼리 (kind에 따라 result/check 로 분기)
function toResultUrl(r: WeddingRecord): string {
  const pack = (input: SavedInputData & { name?: string }, name: string) =>
    encodeURIComponent(JSON.stringify({ ...input, name }))
  const dest = r.kind === 'find' ? 'result' : 'check'
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
    <main style={{ minHeight: '100vh', background: '#FDF6F0', maxWidth: 480, margin: '0 auto', paddingBottom: 40 }}>
      {/* 헤더 */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        background: 'rgba(250,250,248,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: '0.5px solid #f0e0d5', padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button onClick={() => router.push('/home-new')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>결혼택일 보관함</div>
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
            <div style={{ fontSize: 30, marginBottom: 10 }}>💍</div>
            <div style={{ fontSize: 14, color: '#96502e', fontWeight: 500, marginBottom: 4 }}>
              아직 저장된 결혼택일이 없어요
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>새로 택일을 보면 여기에 차곡차곡 쌓여요</div>
          </div>
        )}

        {/* 카드 목록 */}
        {records && records.map(r => {
          const badge = KIND_BADGE[r.kind]
          return (
            <div key={r.id} onClick={() => router.push(toResultUrl(r))}
              style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '15px',
                background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14,
                marginBottom: 10, cursor: 'pointer',
              }}>
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
          )
        })}

        {/* 새 결혼택일 보기 → 두 사람 선택 */}
        <button onClick={() => router.push('/manseryeok/wedding-timing/input')}
          style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
            background: accent, border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
          + 새 결혼택일 보기
        </button>
      </div>

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
              {confirmDel.name1} <span style={{ color: '#d4537e' }}>♥</span> {confirmDel.name2}
              {' '}결혼택일을 삭제해요.<br />
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

export default function WeddingStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <WeddingStorageInner />
    </Suspense>
  )
}
