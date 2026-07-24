'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

// ============================================================
// 재방문 이력 패널 (CustomerHistory) — 2단계 조회 방식
//  - 1단계(목록): 고객 user_id로 과거 상담의 날짜·종류·짧은 요약(summary)만 가볍게 조회
//  - 2단계(펼침): 상담사가 항목을 누르는 그 순간에만, 그 1건의 전문을 따로 조회 (캐싱)
//  - 지금 보고 있는 상담 건 / 취소·삭제 건은 목록에서 제외
//  - 가운데 칸 위쪽에 상시 표시. 이력이 없으면 "첫 상담 고객"이라고 알려줌.
//  - 새로 저장하는 것 없음. 이미 저장된 값을 읽어서 표시만 함.
// ============================================================

// 종류 라벨 — ConsultationList의 TYPE_LABELS와 동일하게 맞춤 (일관성)
const TYPE_LABELS: Record<string, string> = {
  personal: '개인상담',
  couple: '연인궁합',
  married: '부부궁합',
  prewedding: '예비부부',
  moving: '이사택일',
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

const PREVIEW_LEN = 160
const teal = '#5DCAA5'

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
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  const [detailCache, setDetailCache] = useState<Record<string, string>>({})
  const [detailLoadingId, setDetailLoadingId] = useState<string | null>(null)
  const [expandedFull, setExpandedFull] = useState<Record<string, boolean>>({})

  // ---------- 1단계: 목록 조회 (가벼움) ----------
  useEffect(() => {
    let cancelled = false
    async function loadList() {
      setLoading(true)
      if (!userId) {
        // 예외: user_id 없는 상담(정상 흐름엔 없음). 조용히 첫 상담과 동일 처리.
        if (!cancelled) { setRows([]); setLoading(false) }
        return
      }
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
    setDetailCache({})
    setExpandedFull({})
    setOpenId(null)
    return () => { cancelled = true }
  }, [userId, currentConsultationId])

  // ---------- 2단계: 항목 펼칠 때만 그 1건 전문 조회 (캐싱) ----------
  async function toggleItem(row: HistoryRow) {
    if (openId === row.id) { setOpenId(null); return }
    setOpenId(row.id)
    if (detailCache[row.id] !== undefined) return
    if (row.summary && row.summary.trim()) {
      setDetailCache(prev => ({ ...prev, [row.id]: row.summary || '' }))
      return
    }
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

  const headerCount = loading ? '' : `${rows.length}건`

  return (
    <div style={{ padding: '12px', height: '100%', overflowY: 'auto' }}>
      {/* 건수만 표시 (제목은 위 제목바 "이전 상담 내역"에 있음) */}
      {!loading && rows.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ fontSize: fontSize - 2, color: 'rgba(255,255,255,0.45)' }}>총 {headerCount}</span>
        </div>
      )}

      {loading ? (
        <div style={{ fontSize: fontSize - 1, color: 'rgba(255,255,255,0.4)', padding: '8px 0' }}>불러오는 중…</div>
      ) : rows.length === 0 ? (
        // 첫 상담 고객 (또는 예외적으로 user_id 없는 경우)
        <div style={{
          fontSize: fontSize - 1, color: 'rgba(255,255,255,0.55)',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 10, padding: '12px', lineHeight: 1.6, textAlign: 'center',
        }}>
          이전 상담 내역이 없습니다<br />
          <span style={{ fontSize: fontSize - 2, color: 'rgba(255,255,255,0.4)' }}>첫 상담 고객입니다</span>
        </div>
      ) : (
        <div>
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
                background: 'rgba(29,158,117,0.06)', border: '1px solid rgba(29,158,117,0.25)',
                borderRadius: 10, padding: '10px 12px', marginBottom: 8,
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
