'use client'

/**
 * 궁합 보관함 — 지난 궁합을 모아 보고, 눌러서 다시 보거나, 새로 본다.
 * ─────────────────────────────────────────────
 * 흐름(대표님 확정):
 *   홈 > [궁합 보관함 보기] > 이 목록 > 카드 선택 > 결과 화면(그대로 출력)
 *                                    > [+ 새 궁합 보기] > 입력 화면
 *
 * 데이터: listCoupleRecords() (saju_records, service_type='couple')
 * 점수 표기: C안 — 숫자 대신 "등급"만.
 * 카드 누르면 결과 화면으로 두 사람 정보를 URL로 넘김.
 *   [다음 단계] recordId로 저장된 결과 스냅샷을 그대로 렌더(재계산·AI 없음).
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listCoupleRecords, daysAgoLabel,
  type CoupleRecord, type CoupleMode,
} from '@/lib/saju/coupleRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'

type Filter = 'all' | 'couple' | 'married'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'couple', label: '연인' },
  { key: 'married', label: '부부' },
]

// 두 사람 정보 → 결과 화면 URL 쿼리
function toResultUrl(r: CoupleRecord): string {
  const pack = (input: SavedInputData & { name?: string }, name: string) =>
    encodeURIComponent(JSON.stringify({ ...input, name }))
  const mode = r.mode
  return `/manseryeok/couple-result-new?mode=${mode}&recordId=${r.id}` +
    `&person1=${pack(r.input1, r.name1)}&person2=${pack(r.input2, r.name2)}`
}

function CoupleStorageInner() {
  const router = useRouter()
  const [records, setRecords] = useState<CoupleRecord[] | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  useEffect(() => {
    let cancelled = false
    listCoupleRecords().then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  const shown = records
    ? (filter === 'all' ? records : records.filter(r => r.mode === filter))
    : null

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
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>궁합 보관함</div>
        {records && <div style={{ marginLeft: 'auto', fontSize: 12, color: '#b4785a' }}>{records.length}건</div>}
      </div>

      <div style={{ padding: '14px 14px 0' }}>
        {/* 필터 탭 */}
        <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
          {FILTERS.map(f => {
            const on = filter === f.key
            return (
              <button key={f.key} onClick={() => setFilter(f.key)}
                style={{
                  padding: '7px 16px', borderRadius: 99, fontSize: 12.5, cursor: 'pointer',
                  border: on ? 'none' : '0.5px solid #e8d5c5',
                  background: on ? '#b46e46' : '#fff',
                  color: on ? '#fff' : '#b4785a', fontWeight: on ? 500 : 400,
                }}>
                {f.label}
              </button>
            )
          })}
        </div>

        {/* 로딩 */}
        {shown === null && (
          <div style={{ textAlign: 'center', padding: '50px 0', color: '#b4785a', fontSize: 13 }}>
            보관함을 불러오는 중…
          </div>
        )}

        {/* 빈 상태 */}
        {shown && shown.length === 0 && (
          <div style={{ textAlign: 'center', padding: '46px 20px', color: '#b4785a' }}>
            <div style={{ fontSize: 30, marginBottom: 10 }}>💝</div>
            <div style={{ fontSize: 14, color: '#96502e', fontWeight: 500, marginBottom: 4 }}>
              {filter === 'all' ? '아직 저장된 궁합이 없어요' : '이 종류의 궁합이 없어요'}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>새 궁합을 보면 여기에 차곡차곡 쌓여요</div>
          </div>
        )}

        {/* 카드 목록 */}
        {shown && shown.map(r => (
          <div key={r.id} onClick={() => router.push(toResultUrl(r))}
            style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '15px 15px',
              background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14,
              marginBottom: 10, cursor: 'pointer',
            }}>
            {/* 등급 (점수 숨김 · C안) */}
            <div style={{ textAlign: 'center', minWidth: 52, flexShrink: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: r.mode === 'married' ? '#c85a6e' : '#c85a8c', lineHeight: 1.3 }}>
                {gradeShort(r.grade)}
              </div>
            </div>

            <div style={{ width: '0.5px', height: 34, background: '#f0e0d5', flexShrink: 0 }} />

            {/* 두 사람 + 관계 + 날짜 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 4 }}>
                {r.name1} <span style={{ color: '#d4537e' }}>♥</span> {r.name2}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#b4785a' }}>
                <span style={{
                  color: r.mode === 'married' ? '#c85a6e' : '#c85a8c',
                  background: r.mode === 'married' ? '#c85a6e14' : '#c85a8c14',
                  borderRadius: 6, padding: '1px 7px',
                }}>{r.mode === 'married' ? '부부' : '연인'}</span>
                <span>{daysAgoLabel(r.createdAt)}</span>
                {r.unsavedCount ? <span style={{ color: '#c5a590' }}>· 미저장 {r.unsavedCount}명</span> : null}
              </div>
            </div>

            <span style={{ color: '#d9b89f', fontSize: 18, flexShrink: 0 }}>›</span>
          </div>
        ))}

        {/* 새 궁합 보기 */}
        <button onClick={() => router.push('/manseryeok/couple-input-new?mode=couple')}
          style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
            background: '#b46e46', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
          + 새 궁합 보기
        </button>
      </div>
    </main>
  )
}

// 등급 문자열을 카드용 짧은 표현으로 (이미지의 점수 자리)
function gradeShort(grade: string): string {
  if (!grade) return '궁합'
  if (grade.includes('천생연분')) return '천생연분'
  if (grade.includes('소울메이트')) return '소울메이트'
  if (grade.includes('황금')) return '황금커플'
  if (grade.includes('탐구')) return '탐구커플'
  if (grade.includes('드라마틱')) return '드라마틱'
  if (grade.includes('반전')) return '반전매력'
  return grade.replace(/[💫✨🌟💡🔥⚡\s]/g, '').slice(0, 5)
}

export default function CoupleStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <CoupleStorageInner />
    </Suspense>
  )
}
