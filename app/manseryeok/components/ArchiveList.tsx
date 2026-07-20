'use client'

// app/manseryeok/components/ArchiveList.tsx
// ----------------------------------------------------------------------------
// 나의 운명 아카이브 — 저장한 모든 조회물을 시간순 한 리스트로.
//   - 서비스별 작은 배지(사주/타로/개명/궁합…)로 종류 구분
//   - 상단: 서비스 종류별 거르기 칩 (관계 태그 칩은 2026-07-19 숨김)
//   - 각 카드 아코디언: 펼치면 요약 스냅샷 + [다시보기](원본 화면) + [삭제]
//   - 삭제 = saju_records 행 제거 → 각 서비스 보관함과 자동 연동
// 상담 내역은 여기 없음(별도 영역 유지).
// ----------------------------------------------------------------------------

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArchiveItem, listArchive, countArchive,
  badgeOf, reviewUrl, deleteArchiveRecord,
} from '@/lib/saju/archiveRecords'

function dateText(s: string): string {
  try {
    const d = new Date(s)
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}.${m}.${day}`
  } catch { return '' }
}

// result_data 스냅샷에서 한 줄 요약을 유연하게 추출 (서비스마다 구조 다름)
function snippet(resultData: unknown): string {
  if (!resultData || typeof resultData !== 'object') return ''
  const r = resultData as Record<string, unknown>
  const cand = r.summary ?? r.advice ?? r.headline ?? r.grade ?? r.conclusion
  if (typeof cand === 'string') return cand.length > 80 ? cand.slice(0, 80) + '…' : cand
  return ''
}

export default function ArchiveList() {
  const router = useRouter()
  const [items, setItems] = useState<ArchiveItem[]>([])
  const [total, setTotal] = useState(0)
  const [openId, setOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)   // null = 전체

  const load = async () => {
    const [rows, cnt] = await Promise.all([listArchive(50, 0), countArchive()])
    setItems(rows)
    setTotal(cnt)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const remove = async (item: ArchiveItem) => {
    const label = badgeOf(item.serviceType).label
    if (!confirm(`"${item.title || label}" 기록을 삭제할까요?\n삭제하면 보관함에서도 사라지며 되돌릴 수 없습니다.`)) return
    setDeletingId(item.id)
    const ok = await deleteArchiveRecord(item.id)
    setDeletingId(null)
    if (ok) {
      setItems((prev) => {
        const next = prev.filter((x) => x.id !== item.id)
        // 거르는 중인 종류가 이번 삭제로 다 없어지면 전체로 되돌린다(빈 화면 방지)
        if (filter && !next.some((x) => x.serviceType === filter)) setFilter(null)
        return next
      })
      setTotal((t) => Math.max(0, t - 1))
    } else {
      alert('삭제에 실패했어요. 잠시 후 다시 시도해 주세요.')
    }
  }

  if (loading) {
    return <div style={{ fontSize: 12, color: '#5c3a1e', textAlign: 'center', padding: '16px 0' }}>불러오는 중…</div>
  }

  if (items.length === 0) {
    return (
      <div style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, padding: '20px 14px', textAlign: 'center' }}>
        <div style={{ fontSize: 13, color: '#8a7360', marginBottom: 4 }}>아직 저장한 기록이 없어요</div>
        <div style={{ fontSize: 11, color: '#6b5340' }}>사주·궁합·타로·개명 등을 보고 저장하면 여기 모여요.</div>
      </div>
    )
  }

  // ── 종류별 개수 (불러온 목록에서 셈 — DB 추가 조회 없음) ──
  //    많은 순으로 정렬해 자주 보는 것이 앞에 오게 한다.
  const kindCounts = (() => {
    const m = new Map<string, number>()
    for (const it of items) m.set(it.serviceType, (m.get(it.serviceType) ?? 0) + 1)
    return Array.from(m.entries())
      .map(([type, count]) => ({ type, count, label: badgeOf(type).label }))
      .sort((a, b) => b.count - a.count)
  })()

  const shown = filter ? items.filter((it) => it.serviceType === filter) : items
  const filterLabel = filter ? badgeOf(filter).label : null

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 3px 9px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#96502e' }}>나의 운명 아카이브</span>
        <span style={{ fontSize: 10, color: '#6b5340' }}>
          {filter ? `${filterLabel} ${shown.length}건` : `기록 ${total}`}
        </span>
      </div>

      {/* 종류별 거르기 — 누르면 그 종류만, 다시 누르면 전체 */}
      {kindCounts.length > 1 && (
        <div style={{ display: 'flex', gap: 5, marginBottom: 10, flexWrap: 'wrap' }}>
          <button
            onClick={() => setFilter(null)}
            style={{
              fontSize: 10.5, padding: '5px 11px', borderRadius: 14, cursor: 'pointer',
              background: filter === null ? '#b46e46' : '#f5ebe2',
              color: filter === null ? '#fff' : '#8a6a52',
              border: filter === null ? 'none' : '0.5px solid #e8d5c5',
              fontWeight: filter === null ? 600 : 400,
            }}
          >전체 {items.length}</button>
          {kindCounts.map((k) => {
            const on = filter === k.type
            return (
              <button
                key={k.type}
                onClick={() => setFilter(on ? null : k.type)}
                style={{
                  fontSize: 10.5, padding: '5px 11px', borderRadius: 14, cursor: 'pointer',
                  background: on ? '#b46e46' : '#f5ebe2',
                  color: on ? '#fff' : '#8a6a52',
                  border: on ? 'none' : '0.5px solid #e8d5c5',
                  fontWeight: on ? 600 : 400,
                }}
              >{k.label} {k.count}{on ? ' ✕' : ''}</button>
            )
          })}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {shown.map((it) => {
          const b = badgeOf(it.serviceType)
          const open = openId === it.id
          const sn = snippet(it.resultData)
          return (
            <div key={it.id} style={{ background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12, overflow: 'hidden' }}>
              <div
                onClick={() => setOpenId(open ? null : it.id)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 13px', cursor: 'pointer' }}
              >
                <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 12, background: b.bg, color: b.fg, flexShrink: 0 }}>{b.label}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, color: '#3a2e28', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{it.title || b.label}</div>
                  <div style={{ fontSize: 10, color: '#6b5340' }}>{dateText(it.createdAt)}{it.relation ? ` · ${it.relation === 'self' ? '본인' : it.relation}` : ''}</div>
                </div>
                <span style={{ color: '#d0b8a5', fontSize: 12, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }}>▾</span>
              </div>

              {open && (
                <div style={{ padding: '0 13px 12px', borderTop: '0.5px solid #f5e5da' }}>
                  {sn && <div style={{ fontSize: 11.5, color: '#6a5848', lineHeight: 1.6, background: '#faf3ec', borderRadius: 8, padding: '9px 11px', margin: '10px 0' }}>{sn}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: sn ? 0 : 10 }}>
                    <button
                      onClick={() => router.push(reviewUrl(it))}
                      style={{ flex: 1, padding: '9px 0', borderRadius: 9, background: '#b46e46', border: 'none', color: '#fff', fontSize: 12, fontWeight: 500, cursor: 'pointer' }}
                    >다시보기</button>
                    <button
                      onClick={() => remove(it)}
                      disabled={deletingId === it.id}
                      style={{ padding: '9px 16px', borderRadius: 9, background: 'none', border: '0.5px solid #f0d0d0', color: '#c05a5a', fontSize: 12, fontWeight: 500, cursor: 'pointer', opacity: deletingId === it.id ? 0.5 : 1 }}
                    >{deletingId === it.id ? '삭제 중…' : '삭제'}</button>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
