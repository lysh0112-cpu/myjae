'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================
// 재방문 이력 패널 (CustomerHistory) — 2단계 조회 방식
//  - 1단계(목록): 고객 user_id로 과거 상담의 날짜·종류·짧은 요약(summary)만 가볍게 조회
//                긴 해설(ai_analysis)은 여기서 불러오지 않음 → 회원 많아져도 목록이 빠름
//  - 2단계(펼침): 상담사가 항목을 누르는 그 순간에만, 그 1건의 전문을 따로 조회
//                한 번 불러온 건 화면 보는 동안 기억(캐싱)해서 다시 펴도 재조회 안 함
//  - 지금 보고 있는 상담 건 / 취소·삭제 건은 목록에서 제외
//  - 새로 저장하는 것 없음. 이미 저장된 값을 읽어서 표시만 함
// ============================================================

// 종류 라벨 — ConsultationList의 TYPE_LABELS와 동일하게 맞춤 (일관성)
const TYPE_LABELS: Record<string, string> = {
  personal: '개인상담',
  couple: '연인궁합',
  married: '부부궁합',
  prewedding: '예비부부',
  love: '연애궁합',
  birth: '출산시기',
  naming: '개명',
  mulsang: '물상도',
}

// 1단계 목록용 (가벼움 — 긴 해설 없음)
type HistoryRow = {
  id: string
  created_at: string | null
  status: string | null
  summary: string | null
  birth_data: { consultationType?: string } | null
}

function typeLabel(row: HistoryRow): string {
  const t = row.birth_data?.consultationType
  if (t && TYPE_LABELS[t]) return TYPE_LABELS[t]
  return '사주상담'
}

function dateText(s: string | null): string {
  if (!s) return ''
  try {
    const d = new Date(s)
    return `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
  } catch { return '' }
}

// 긴 글 미리보기 길이
const PREVIEW_LEN = 160

export default function CustomerHistory({
  userId,
  currentConsultationId,
  fontSize = 13,
}: {
  userId: string | null | undefined
  currentConsultationId: string | null | undefined
  fontSize?: number
}) {
  const [rows, setRows] = useState<HistoryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)                    // 패널 접힘/펼침
  const [openId, setOpenId] = useState<string | null>(null)  // 펼쳐진 이력 항목

  // 2단계에서 불러온 전문을 기억해두는 캐시 (화면 보는 동안만 유지)
  const [detailCache, setDetailCache] = useState<Record<string, string>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  // 긴 글을 전체로 펼쳐 본 항목 (더보기 누른 것)
  const [expandedFull, setExpandedFull] = useState<Record<string, boolean>>({})

  // ---------- 1단계: 목록 조회 (가벼움) ----------
  useEffect(() => {
    if (!userId) { setRows([]); return }
    let cancelled = false
    async function loadList() {
      setLoading(true)
      try {
        const { data } = await supabase
          .from('consultations')
          .select('id, created_at, status, summary, birth_data')
          .eq('user_id', userId)
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
        if (cancelled) return
        const all = (data as HistoryRow[]) ?? []
        const past = all.filter(r =>
          r.id !== currentConsultationId &&
          r.status !== 'cancelled' && r.status !== 'canceled'
        )
        setRows(past)
      } catch (e) {
        console.error('재방문 이력 목록 조회 오류', e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadList()
    // 고객이 바뀌면 캐시·펼침 상태 초기화
    setDetailCache({})
    setExpandedFull({})
    setOpenId(null)
    return () => { cancelled = true }
  }, [userId, currentConsultationId])

  // ---------- 2단계: 항목 펼칠 때만 그 1건 전문 조회 (캐싱) ----------
  async function toggleItem(row: HistoryRow) {
    // 접혀 있으면 펼치고, 펼쳐 있으면 접기
    if (openId === row.id) { setOpenId(null); return }
    setOpenId(row.id)

    // 이미 불러온 적 있으면(캐시에 있으면) 재조회 안 함
    if (detailCache[row.id] !== undefined) return
    // 요약이 있으면 그걸 상세로 쓰고, 전문 조회는 생략 (가장 가벼운 경로)
    if (row.summary && row.summary.trim()) {
      setDetailCache(prev => ({ ...prev, [row.id]: row.summary || '' }))
      return
    }

    // 요약이 없을 때만 전문(ai_analysis / ai_free_analysis)을 이 1건만 조회
    setDetailLoadingId(row.id)
    try {
      const { data } = await supabase
        .from('consultations')
        .select('ai_analysis, ai_free_analysis')
        .eq('id', row.id)
        .maybeSingle()
      const detail = data?.ai_analysis || data?.ai_free_analysis || ''
      setDetailCache(prev => ({ ...prev, [row.id]: detail }))
    } catch (e) {
      console.error('재방문 이력 상세 조회 오류', e)
      setDetailCache(prev => ({ ...prev, [row.id]: '' }))
    } finally {
      setDetailLoadingId(null)
    }
  }

  // 비회원(user_id 없음)이거나 과거 이력이 없으면 패널 자체를 숨김
  if (!userId) return null
  if (!loading && rows.length === 0) return null

  const teal = '#5DCAA5'

  return (
    <div style={{
      borderRadius: 12, marginBottom: 12, overflow: 'hidden',
      background: 'rgba(29,158,117,0.08)', border: '1px solid rgba(29,158,117,0.3)',
    }}>
      {/* 헤더 (접기/펼치기) */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          padding: '10px 12px', background: 'none', border: 'none', cursor: 'pointer',
        }}>
        <span style={{ fontSize: fontSize, fontWeight: 700, color: teal }}>🔁 재방문 이력</span>
        <span style={{ fontSize: fontSize - 2, color: 'rgba(255,255,255,0.45)' }}>
          {loading ? '불러오는 중…' : `${rows.length}건`}
        </span>
        <span style={{ marginLeft: 'auto', fontSize: fontSize - 2, color: 'rgba(255,255,255,0.4)' }}>
          {open ? '▲' : '▼'}
        </span>
      </button>

      {/* 목록 */}
      {open && !loading && (
        <div style={{ padding: '0 12px 12px' }}>
          {rows.map((row) => {
            const isOpen = openId === row.id
            const cached = detailCache[row.id]
            const isDetailLoading = detailLoadingId === row.id
            const showFull = expandedFull[row.id]
            const isLong = cached && cached.length > PREVIEW_LEN
            const shown = !cached ? ''
              : (isLong && !showFull ? cached.slice(0, PREVIEW_LEN) + '…' : cached)

            return (
              <div key={row.id} style={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                paddingTop: 8, marginTop: 8,
              }}>
                {/* 한 줄 요약: 날짜 · 종류 */}
                <button
                  onClick={() => toggleItem(row)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left',
                  }}>
                  <span style={{ fontSize: fontSize - 1, color: '#e0dce8' }}>{dateText(row.created_at)}</span>
                  <span style={{
                    fontSize: fontSize - 3, padding: '2px 8px', borderRadius: 10,
                    background: 'rgba(29,158,117,0.2)', color: teal,
                  }}>{typeLabel(row)}</span>
                  <span style={{ marginLeft: 'auto', fontSize: fontSize - 3, color: 'rgba(255,255,255,0.4)' }}>
                    {isOpen ? '접기 ▲' : '보기 ▼'}
                  </span>
                </button>

                {/* 펼침: 그때의 요약/해설 */}
                {isOpen && (
                  <div style={{ marginTop: 8 }}>
                    {isDetailLoading ? (
                      <p style={{ fontSize: fontSize - 2, color: '#8a88a0', margin: 0 }}>불러오는 중…</p>
                    ) : shown ? (
                      <>
                        <p style={{
                          fontSize: fontSize - 1, lineHeight: 1.7, color: '#e0dce8',
                          whiteSpace: 'pre-wrap', margin: 0,
                        }}>{shown}</p>
                        {isLong && (
                          <button
                            onClick={() => setExpandedFull(prev => ({ ...prev, [row.id]: !showFull }))}
                            style={{
                              marginTop: 6, fontSize: fontSize - 3, color: teal,
                              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            }}>
                            {showFull ? '접기 ▲' : '더보기 ▼'}
                          </button>
                        )}
                      </>
                    ) : (
                      <p style={{ fontSize: fontSize - 2, color: '#8a88a0', margin: 0 }}>
                        저장된 요약·해설이 없는 상담입니다.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
