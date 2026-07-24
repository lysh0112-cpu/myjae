'use client'

/**
 * 궁합 보관함 — 연인/부부 별도 운용 (mode로 완전 분리).
 * ─────────────────────────────────────────────
 * 진입: 홈 > [연인 궁합 보관함] → ?mode=couple
 *       홈 > [부부 궁합 보관함] → ?mode=married
 * 흐름: 이 목록 > 카드 선택 > 결과 화면(그대로 출력)
 *                > [+ 새 궁합 보기] > 입력 화면(같은 mode)
 *
 * 데이터: listCoupleRecords(mode) — 해당 종류만. (saju_records, service_type='couple')
 * 점수 표기: C안 — 숫자 대신 "등급"만.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  listCoupleRecords, daysAgoLabel, deleteCoupleRecord,
  type CoupleRecord, type CoupleMode,
} from '@/lib/saju/coupleRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'

const MODE_INFO: Record<CoupleMode, { title: string; accent: string; badge: string }> = {
  couple:  { title: '연인 궁합 보관함', accent: '#c85a8c', badge: '연인' },
  married: { title: '부부 궁합 보관함', accent: '#c85a6e', badge: '부부' },
}

// 두 사람 정보 → 결과 화면 URL 쿼리
function toResultUrl(r: CoupleRecord): string {
  const pack = (input: SavedInputData & { name?: string }, name: string) =>
    encodeURIComponent(JSON.stringify({ ...input, name }))
  return `/manseryeok/couple-result-new?recordId=${r.id}` +
    `&person1=${pack(r.input1, r.name1)}&person2=${pack(r.input2, r.name2)}`
}

function CoupleStorageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // ★2026-07-24 — 연인·부부 보관함을 하나로 합쳤다. (메뉴 통합)
  //   예전에는 ?mode=couple / ?mode=married 로 갈라 각각 보여 줬다.
  //   이제 궁합은 하나뿐이라 전부 한 곳에 모인다.
  //   ⚠️ listCoupleRecords(undefined) = 전체(couple+married). 옛 기록도 함께 보인다.
  const info = { title: '궁합 보관함', accent: '#c85a6e', badge: '궁합' }

  const [records, setRecords] = useState<CoupleRecord[] | null>(null)
  // 삭제 확인 팝업 대상(카드). null이면 팝업 닫힘.
  const [confirmDel, setConfirmDel] = useState<CoupleRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listCoupleRecords().then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  // 삭제 실행 (확인 팝업에서 "삭제")
  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteCoupleRecord(confirmDel.id)
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
            <div style={{ fontSize: 30, marginBottom: 10 }}>💝</div>
            <div style={{ fontSize: 14, color: '#96502e', fontWeight: 500, marginBottom: 4 }}>
              아직 저장된 {info.badge} 궁합이 없어요
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>새 궁합을 보면 여기에 차곡차곡 쌓여요</div>
          </div>
        )}

        {/* 카드 목록 */}
        {records && records.map(r => (
          <div key={r.id} onClick={() => router.push(toResultUrl(r))}
            style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '15px',
              background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14,
              marginBottom: 10, cursor: 'pointer',
            }}>
            {/* 등급 (점수 숨김 · C안) */}
            <div style={{ textAlign: 'center', width: 62, flexShrink: 0 }}>
              <div style={{
                fontSize: 11, fontWeight: 600, color: info.accent,
                lineHeight: 1.35, letterSpacing: '-.03em', wordBreak: 'keep-all',
              }}>
                {gradeShort(r.grade)}
              </div>
            </div>

            <div style={{ width: '0.5px', height: 34, background: '#f0e0d5', flexShrink: 0 }} />

            {/* 두 사람 + 날짜 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 4 }}>
                {r.name1} <span style={{ color: '#d4537e' }}>♥</span> {r.name2}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#5c3a1e', flexWrap: 'wrap' }}>
                <span>{daysAgoLabel(r.createdAt)}</span>
                {/* 자유 질문 개수 — 물어본 게 있을 때만 (2026-07-24) */}
                {qaCount(r.resultData) > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 3,
                    background: '#f6ecdf', borderRadius: 7, padding: '1.5px 6px',
                    fontSize: 10, color: '#8a6a4a',
                  }}>
                    💬 질문 {qaCount(r.resultData)}
                  </span>
                )}
                {r.unsavedCount ? <span style={{ color: '#6b5340' }}>· 미저장 {r.unsavedCount}명</span> : null}
              </div>
            </div>

            {/* 삭제 버튼 — 카드 클릭(결과 이동)과 겹치지 않게 stopPropagation */}
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

        {/* 새 궁합 보기 — 부부/연인은 사람 고를 때 관계로 갈린다 */}
        <button onClick={() => router.push('/manseryeok/couple-input-new')}
          style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
            background: '#b46e46', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
          + 새 {info.badge} 궁합 보기
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
              {confirmDel.name1} <span style={{ color: '#d4537e' }}>♥</span> {confirmDel.name2} 궁합을 삭제해요.<br />
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

// 저장된 자유 질문 개수 (없으면 0)
function qaCount(resultData: unknown): number {
  const fu = (resultData as { followUps?: unknown[] } | null | undefined)?.followUps
  return Array.isArray(fu) ? fu.length : 0
}

// 카드 왼쪽 배지 문구
//   ★2026-07-24 — 점수·등급을 버리면서 배지도 바뀌었다.
//     새 기록: 심산 판정에서 뽑은 상태 문구가 그대로 들어온다.
//               예) "기운을 채워 주는 사이" · "서로에게 귀인이 되는 사이"
//     옛 기록: "소울메이트형 ✨" 같은 등급이 남아 있다 → 짧게 줄여서 표시.
//
//   ⚠️ 예전에는 마지막에 slice(0,5) 로 잘랐는데, 새 문구는 그러면
//      "기운을 채워"처럼 말이 끊긴다. 새 문구는 자르지 않는다.
function gradeShort(grade: string): string {
  if (!grade) return '궁합'
  // ── 옛 등급 (v1 이전 기록) ──
  if (grade.includes('천생연분')) return '천생연분'
  if (grade.includes('소울메이트')) return '소울메이트'
  if (grade.includes('황금')) return '황금커플'
  if (grade.includes('탐구')) return '탐구커플'
  if (grade.includes('드라마틱')) return '드라마틱'
  if (grade.includes('반전')) return '반전매력'
  // ── 새 판정 문구 — "…사이"로 끝난다. 그대로 쓴다. ──
  const clean = grade.replace(/[💫✨🌟💡🔥⚡]/g, '').trim()
  if (clean.endsWith('사이')) return clean
  // 그 외 알 수 없는 값은 예전처럼 줄여서
  return clean.slice(0, 5)
}

export default function CoupleStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <CoupleStorageInner />
    </Suspense>
  )
}
