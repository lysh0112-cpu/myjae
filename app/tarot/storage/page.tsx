'use client'

/**
 * 타로 보관함 — 내가 예전에 뽑았던 타로 리딩 기록을 모아 보는 화면.
 * ─────────────────────────────────────────────
 * 진입: 홈 > [타로] > 보관함 (또는 타로 입구의 "이전 기록 보기")
 * 흐름: 이 목록 > 카드 선택(그때 본 해석 그대로 다시보기)
 *                > [+ 새 타로 보기] > 타로 입구(/tarot)
 *
 * 데이터: listTarotRecords() — 로그인 아이디(user_id) 기준. (saju_records, service_type='tarot')
 *   고객은 자기 기록을 보고, 각 기록엔 관심사(category) 배지가 붙는다(마케팅 트렌드와 동일 축).
 *
 * 사주 보관함(saju-storage) 패턴을 본떴다. 단 타로는 "사람"이 아니라
 * "질문·관심사·카드"라 사람 선택 모달 없이 입구로 바로 이동한다.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listTarotRecords, deleteTarotRecord, daysAgoLabel,
  TAROT_CATEGORY_COLOR,
  type TarotRecord,
} from '@/lib/saju/tarotRecords'

function TarotStorageInner() {
  const router = useRouter()

  const [records, setRecords] = useState<TarotRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<TarotRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listTarotRecords().then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteTarotRecord(confirmDel.id)
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
        <button onClick={() => router.push('/tarot')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#3a2e28' }}>타로 보관함</div>
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
            <div style={{ fontSize: 30, marginBottom: 10 }}>🔮</div>
            <div style={{ fontSize: 14, color: '#96502e', fontWeight: 500, marginBottom: 4 }}>
              아직 저장된 타로 기록이 없어요
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>카드를 뽑으면 여기에 차곡차곡 쌓여요</div>
          </div>
        )}

        {/* 카드 목록 */}
        {records && records.map(r => (
          <div key={r.id} onClick={() => router.push(`/tarot?recordId=${r.id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 13, padding: '15px',
              background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14,
              marginBottom: 10, cursor: 'pointer',
            }}>
            {/* 관심사 배지 */}
            <div style={{
              minWidth: 52, height: 44, borderRadius: 10, flexShrink: 0, padding: '0 6px',
              background: TAROT_CATEGORY_COLOR[r.category], color: '#fff', fontSize: 11, fontWeight: 600,
              display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', lineHeight: 1.25,
            }}>
              {r.category}
            </div>

            {/* 질문 + 스프레드 + 날짜 */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 14, fontWeight: 500, color: '#3a2e28', marginBottom: 3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {r.question || '무제 리딩'}
              </div>
              <div style={{ fontSize: 11, color: '#b4785a' }}>
                {r.spreadTitle} · {daysAgoLabel(r.createdAt)}
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

        {/* 새로 보기 → 타로 입구 */}
        <button onClick={() => router.push('/tarot')}
          style={{
            width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
            background: '#b45a78', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
          }}>
          + 새 타로 보기
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
              이 타로 기록을 삭제해요.<br />
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

export default function TarotStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <TarotStorageInner />
    </Suspense>
  )
}
