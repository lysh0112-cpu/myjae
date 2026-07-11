'use client'

/**
 * 아기 이름 보관함 — 내가 예전에 지은 아기 이름 기록을 모아 보는 화면.
 * ─────────────────────────────────────────────
 * 진입: 홈 > [아기 이름 짓기]  (사주·개명 보관함과 동일하게 "보관함 먼저")
 * 흐름: 이 목록 > 카드 선택(그때 지은 이름 다시보기: /newborn-view?recordId=…)
 *                > [+ 새 아기 이름 짓기] > 아기 입력(/manseryeok/naming/rename/newborn)
 *                > [←] > 홈
 *
 * 데이터: listNamingRecords('newborn') — 로그인 아이디(user_id) 기준.
 *   (saju_records, service_type='newborn' — 개명 'naming'과 분리 저장·조회)
 *
 * 개명 보관함(diagnosis/storage) 패턴을 그대로 본떴다. 아기는 "새로 지은 이름"이라
 * 관계 배지 대신 👶 뱃지 + 이름(한자)만 보여준다.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listNamingRecords, deleteNamingRecord, daysAgoLabel,
  type NamingRecord,
} from '@/lib/saju/namingRecords'

const BABY = '#967850'   // 아기 서비스 색 (홈 카드와 동일)

const GRADE_COLOR: Record<string, string> = {
  '좋음': '#4a9450',
  '보통': '#96502e',
  '아쉬움': '#c8783c',
}

function NewbornStorageInner() {
  const router = useRouter()

  const [records, setRecords] = useState<NamingRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<NamingRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listNamingRecords('newborn').then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteNamingRecord(confirmDel.id)
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
        <button onClick={() => router.push('/home-new')} aria-label="뒤로"
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>아기 이름 보관함</div>
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
            <div style={{ fontSize: 30, marginBottom: 10 }}>👶</div>
            <div style={{ fontSize: 14, color: '#96502e', fontWeight: 500, marginBottom: 4 }}>
              아직 저장된 아기 이름이 없어요
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>이름을 지으면 여기에 차곡차곡 쌓여요</div>
          </div>
        )}

        {/* 카드 목록 */}
        {records && records.map(r => (
          <div key={r.id} onClick={() => router.push(`/manseryeok/naming/rename/newborn-view?recordId=${r.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '15px',
              background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14,
              marginBottom: 10, cursor: 'pointer',
            }}>
            {/* 아기 뱃지 */}
            <div style={{
              minWidth: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: BABY, color: '#fff', fontSize: 20, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              👶
            </div>

            {/* 이름 + 등급·날짜 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                <span style={{
                  fontSize: 14, fontWeight: 500, color: '#1a1a1a',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {r.hanjaName || r.hangulName || '이름'}
                </span>
                {r.hangulName && r.hanjaName && (
                  <span style={{ fontSize: 11, color: '#b4785a' }}>{r.hangulName}</span>
                )}
              </div>
              <div style={{ fontSize: 11, color: '#b4785a' }}>
                {r.overallGrade ? (
                  <span style={{ color: GRADE_COLOR[r.overallGrade] ?? '#b4785a' }}>종합 {r.overallGrade} · </span>
                ) : ''}
                {daysAgoLabel(r.createdAt)}
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

        {/* 새로 짓기 → 아기 입력 */}
        {records && (
          <button onClick={() => router.push('/manseryeok/naming/rename/newborn')}
            style={{
              width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
              background: BABY, border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>
            + 새 아기 이름 짓기
          </button>
        )}
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
            <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>
              정말 삭제할까요?
            </div>
            <div style={{ fontSize: 13, color: '#96502e', lineHeight: 1.5, marginBottom: 18 }}>
              &lsquo;{confirmDel.hangulName || confirmDel.hanjaName}&rsquo; 아기 이름을 삭제해요.<br />
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

export default function NewbornStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <NewbornStorageInner />
    </Suspense>
  )
}
