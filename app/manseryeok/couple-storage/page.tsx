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
  listCoupleRecords, daysAgoLabel,
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
  return `/manseryeok/couple-result-new?mode=${r.mode}&recordId=${r.id}` +
    `&person1=${pack(r.input1, r.name1)}&person2=${pack(r.input2, r.name2)}`
}

function CoupleStorageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mode = (searchParams.get('mode') === 'married' ? 'married' : 'couple') as CoupleMode
  const info = MODE_INFO[mode]

  const [records, setRecords] = useState<CoupleRecord[] | null>(null)

  useEffect(() => {
    let cancelled = false
    listCoupleRecords(mode).then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [mode])

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
            <div style={{ textAlign: 'center', minWidth: 54, flexShrink: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 500, color: info.accent, lineHeight: 1.3 }}>
                {gradeShort(r.grade)}
              </div>
            </div>

            <div style={{ width: '0.5px', height: 34, background: '#f0e0d5', flexShrink: 0 }} />

            {/* 두 사람 + 날짜 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 4 }}>
                {r.name1} <span style={{ color: '#d4537e' }}>♥</span> {r.name2}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#b4785a' }}>
                <span>{daysAgoLabel(r.createdAt)}</span>
                {r.unsavedCount ? <span style={{ color: '#c5a590' }}>· 미저장 {r.unsavedCount}명</span> : null}
              </div>
            </div>

            <span style={{ color: '#d9b89f', fontSize: 18, flexShrink: 0 }}>›</span>
          </div>
        ))}

        {/* 새 궁합 보기 (같은 mode로) */}
        <button onClick={() => router.push(`/manseryeok/couple-input-new?mode=${mode}`)}
          style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
            background: '#b46e46', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
          + 새 {info.badge} 궁합 보기
        </button>
      </div>
    </main>
  )
}

// 등급 문자열을 카드용 짧은 표현으로
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
