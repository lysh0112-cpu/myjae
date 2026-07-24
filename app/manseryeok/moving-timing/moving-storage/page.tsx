'use client'

/**
 * 이사택일 보관함 — 사주·궁합·결혼택일과 같은 "보관함 관문" 패턴
 * ─────────────────────────────────────────────
 * 진입: 홈 > [이사택일] → 이 보관함
 * 흐름: 목록 > 카드 선택 > 결과 화면(그대로 출력, recordId)
 *              > [+ 새 이사택일 보기] > input(두 사람 + 명의 + 방향)
 *
 * 데이터: listMovingRecords() — saju_records, service_type='moving'
 * kind: check(정한 날) / find(좋은 날) — 카드에 배지로 구분.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listMovingRecords, daysAgoLabel, deleteMovingRecord,
  OWNER_MODE_LABEL,
  type MovingRecord,
} from '@/lib/saju/movingRecords'
import type { SavedInputData } from '@/lib/saju/savedPeople'

const accent = '#967850'
const line = '#EAE0CE'
const ink = '#3A3228'
const sub = '#9A8060'

const KIND_BADGE: Record<'check' | 'find', { label: string; color: string; bg: string }> = {
  check: { label: '정한 날', color: '#7A6440', bg: '#F0EADA' },
  find: { label: '좋은 날', color: '#5F7A4E', bg: '#EDF3E4' },
}

/** 기록 → 결과 화면 URL. kind 에 따라 pick/check 로 분기 */
function toResultUrl(r: MovingRecord): string {
  const pack = (input: SavedInputData & { name?: string }, name: string) =>
    encodeURIComponent(JSON.stringify({ ...input, name }))
  const dest = r.kind === 'find' ? 'pick' : 'check'
  const q = new URLSearchParams()
  q.set('recordId', r.id)
  q.set('p1', pack(r.input1, r.name1))
  if (r.input2) q.set('p2', pack(r.input2, r.name2))
  q.set('owner', r.ownerMode)
  q.set('who', r.ownerWho)
  if (r.direction) q.set('dir', r.direction)
  return `/manseryeok/moving-timing/${dest}?${q.toString()}`
}

function MovingStorageInner() {
  const router = useRouter()

  const [records, setRecords] = useState<MovingRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<MovingRecord | null>(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    let cancelled = false
    listMovingRecords().then(list => { if (!cancelled) setRecords(list) })
    return () => { cancelled = true }
  }, [])

  async function handleDelete() {
    if (!confirmDel || deleting) return
    setDeleting(true)
    const ok = await deleteMovingRecord(confirmDel.id)
    setDeleting(false)
    if (ok) {
      setRecords(prev => (prev ? prev.filter(x => x.id !== confirmDel.id) : prev))
    }
    setConfirmDel(null)
  }

  return (
    <main style={{
      minHeight: '100vh', background: '#FBF8F2', maxWidth: 480,
      margin: '0 auto', paddingBottom: 40,
    }}>
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(251,248,242,0.96)', backdropFilter: 'blur(10px)',
        borderBottom: `0.5px solid ${line}`, padding: '13px 16px',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <button
          onClick={() => router.push('/home-new')}
          style={{
            background: 'none', border: 'none', color: '#7A6440',
            fontSize: 17, cursor: 'pointer', padding: 0,
          }}
        >←</button>
        <div>
          <div style={{ fontSize: 15, fontWeight: 500, color: ink }}>이사택일</div>
          <div style={{ fontSize: 10.5, color: '#7A6440' }}>좋은 이사 날을 봐드려요</div>
        </div>
      </div>

      <div style={{ padding: '18px 16px 0' }}>

        <button
          onClick={() => router.push('/manseryeok/moving-timing/input')}
          style={{
            width: '100%', padding: '15px 0', background: accent, color: '#fff',
            border: 'none', borderRadius: 13, fontSize: 15, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20,
          }}
        >
          + 새 이사택일 보기
        </button>

        {records === null && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: sub, fontSize: 13 }}>
            불러오는 중이에요…
          </div>
        )}

        {records !== null && records.length === 0 && (
          <div style={{
            background: '#FFFDF9', border: `1px solid ${line}`, borderRadius: 13,
            padding: '34px 20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: 13.5, color: ink, fontWeight: 600, marginBottom: 6 }}>
              아직 보신 이사택일이 없어요
            </div>
            <div style={{ fontSize: 12.5, color: sub, lineHeight: 1.8 }}>
              위 버튼을 눌러 시작해 보세요.
            </div>
          </div>
        )}

        {records !== null && records.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: '#7A6440', marginBottom: 10 }}>
              지난 기록
            </div>
            {records.map(r => {
              const badge = KIND_BADGE[r.kind]
              return (
                <div
                  key={r.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 11,
                    background: '#FFFDF9', border: `1px solid ${line}`,
                    borderRadius: 13, padding: '14px 15px', marginBottom: 9,
                  }}
                >
                  <button
                    onClick={() => router.push(toResultUrl(r))}
                    style={{
                      flex: 1, background: 'none', border: 'none', padding: 0,
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4,
                    }}>
                      <span style={{
                        background: badge.bg, color: badge.color, fontSize: 10.5,
                        fontWeight: 700, padding: '3px 9px', borderRadius: 7,
                      }}>
                        {badge.label}
                      </span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: ink }}>
                        {r.name1}{r.name2 ? ` · ${r.name2}` : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: sub, lineHeight: 1.6 }}>
                      {r.summary}
                    </div>
                    <div style={{ fontSize: 11, color: '#BFAE96', marginTop: 3 }}>
                      {OWNER_MODE_LABEL[r.ownerMode]}
                      {r.direction && ` · ${r.direction}쪽`}
                      {' · '}{daysAgoLabel(r.createdAt)}
                    </div>
                  </button>
                  <button
                    onClick={() => setConfirmDel(r)}
                    aria-label="이 기록 지우기"
                    style={{
                      background: 'none', border: 'none', color: '#C9BBA6',
                      fontSize: 15, cursor: 'pointer', padding: '4px 2px', flex: 'none',
                    }}
                  >×</button>
                </div>
              )
            })}
          </>
        )}
      </div>

      {confirmDel && (
        <div
          onClick={() => !deleting && setConfirmDel(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            background: 'rgba(40,32,24,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}>
          <div onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 320, background: '#FFFDF9',
              borderRadius: 16, padding: '22px 20px 16px', textAlign: 'center',
              boxShadow: '0 8px 30px rgba(90,70,40,0.2)',
            }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: ink, marginBottom: 8 }}>
              정말 삭제할까요?
            </div>
            <div style={{ fontSize: 13, color: '#7A6440', lineHeight: 1.5, marginBottom: 18 }}>
              {confirmDel.name1}{confirmDel.name2 ? ` · ${confirmDel.name2}` : ''}
              {' '}이사택일을 삭제해요.<br />
              삭제하면 되돌릴 수 없어요.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmDel(null)}
                disabled={deleting}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, fontSize: 13.5, fontWeight: 500,
                  background: '#F0EADA', border: 'none', color: '#7A6440',
                  cursor: deleting ? 'default' : 'pointer', fontFamily: 'inherit',
                }}>
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                style={{
                  flex: 1, padding: 12, borderRadius: 10, fontSize: 13.5, fontWeight: 500,
                  background: deleting ? '#d99' : '#c8506e', border: 'none', color: '#fff',
                  cursor: deleting ? 'default' : 'pointer', fontFamily: 'inherit',
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

export default function MovingStoragePage() {
  return (
    <Suspense fallback={<div style={{ padding: 40, textAlign: 'center', color: sub }}>불러오는 중…</div>}>
      <MovingStorageInner />
    </Suspense>
  )
}
