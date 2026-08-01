'use client'

/**
 * 개명(이름풀이) 보관함 — 내가 예전에 풀었던 이름 기록을 모아 보는 화면.
 * ─────────────────────────────────────────────
 * 진입: 홈 > [내 이름 개명] > 결과 하단 "내 이름 보관함" (또는 입구의 "이전 기록")
 * 흐름: 이 목록 > 카드 선택(그때 본 풀이 그대로 다시보기: /diagnosis?recordId=…)
 *                > [+ 새 이름 풀이하기] > 개명 입구(/manseryeok/naming/diagnosis)
 *
 * 데이터: listNamingRecords() — 로그인 아이디(user_id) 기준. (saju_records, service_type='naming')
 *   내 이름뿐 아니라 남(가족·지인) 이름풀이도 함께 쌓인다. 각 기록엔 관계 배지가 붙는다
 *   (운영 트렌드 "누구 이름을 봤나"와 동일 축).
 *
 * 타로·사주 보관함(storage) 패턴을 본떴다. 개명은 "사람 + 이름"이라
 * 배지에 이름(한자) + 관계를 함께 보여준다.
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  listNamingRecords, deleteNamingRecord, daysAgoLabel,
  NAMING_RELATION_COLOR, namingRelationGroup, namingRelationLabel,
  type NamingRecord, type NamingKind,
} from '@/lib/saju/namingRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'

// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 — 보관함에 «풀이» 와 «작명» 을 가르는 탭을 넣습니다
//
//   ⚠️ 옛 기록에는 kind 가 없어 «풀이» 로 들어옵니다. 하나도 안 사라집니다.
//   ⚠️ 색은 «작명» 만 도드라지게 둡니다 —
//      풀이는 지금처럼 관계 배지(은은한 톤)를 그대로 씁니다.
// ══════════════════════════════════════════════════════════════════

type FilterKey = '전체' | '풀이' | '작명'
const FILTERS: FilterKey[] = ['전체', '풀이', '작명']
const FILTER_LABEL: Record<FilterKey, string> = {
  전체: '전체', 풀이: '이름 풀이', 작명: '작명 보관함',
}

/** 작명 기록에만 붙는 도드라지는 태그 */
const KIND_TAG: Partial<Record<NamingKind, { label: string; bg: string; fg: string }>> = {
  개명: { label: '개명', bg: '#8f3d0e', fg: '#fff' },
  신생아: { label: '신생아', bg: '#4a7c59', fg: '#fff' },
}

/** ★손맛 — 눌림 모션 (요청 6번) */
const PRESS = {
  transition: 'all .12s cubic-bezier(.4,0,.2,1)',
} as const

const GRADE_COLOR: Record<string, string> = {
  '좋음': '#4a9450',
  '보통': '#96502e',
  '아쉬움': '#c8783c',
}

function NamingStorageInner() {
  const router = useRouter()

  const [records, setRecords] = useState<NamingRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<NamingRecord | null>(null)
  const [filter, setFilter] = useState<FilterKey>('전체')

  /** ★탭에 맞춰 거릅니다. «작명» 은 풀이가 아닌 것 전부 (개명·신생아) */
  const shownRecords = (records ?? []).filter(r =>
    filter === '전체' ? true : filter === '풀이' ? r.kind === '풀이' : r.kind !== '풀이')
  const [deleting, setDeleting] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)   // "누구 이름을 볼까요?" 사람 선택

  useEffect(() => {
    let cancelled = false
    listNamingRecords().then(list => { if (!cancelled) setRecords(list) })
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
        <button onClick={() => router.push('/home-new')}
          style={{ background: 'none', border: 'none', color: '#96502e', fontSize: 17, cursor: 'pointer', padding: 0 }}>←</button>
        <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>내 이름 보관함</div>
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
            <div style={{ fontSize: 30, marginBottom: 10 }}>📜</div>
            <div style={{ fontSize: 14, color: '#96502e', fontWeight: 500, marginBottom: 4 }}>
              아직 저장된 이름 풀이가 없어요
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>이름을 풀면 여기에 차곡차곡 쌓여요</div>
          </div>
        )}

        {/* ★필터 탭 — 전체 / 이름 풀이 / 작명 보관함 */}
        {records && records.length > 0 && (
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {FILTERS.map(k => {
              const on = filter === k
              const n = k === '전체' ? records.length
                : k === '풀이' ? records.filter(x => x.kind === '풀이').length
                : records.filter(x => x.kind !== '풀이').length
              return (
                <button key={k} onClick={() => setFilter(k)}
                  aria-pressed={on}
                  style={{
                    ...PRESS,
                    flex: 1, padding: '9px 6px', borderRadius: 11, cursor: 'pointer',
                    fontSize: 12, fontWeight: on ? 600 : 400,
                    background: on ? '#c8783c' : '#FFFBF7',
                    color: on ? '#fff' : '#6b5340',
                    border: `0.5px solid ${on ? '#c8783c' : '#f0e0d5'}`,
                  }}>
                  {FILTER_LABEL[k]}
                  <span style={{ fontSize: 10, opacity: .75, marginLeft: 4 }}>{n}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ★고른 탭에 아무것도 없을 때 — «전체가 비었을 때» 와 다릅니다 */}
        {records && records.length > 0 && shownRecords.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '30px 16px', color: '#8a7063',
            fontSize: 12, lineHeight: 1.7,
          }}>
            {filter === '작명'
              ? '아직 작명 기록이 없어요. 아래에서 새로 지어 보세요.'
              : '이 갈래에는 아직 기록이 없어요.'}
          </div>
        )}

        {/* 카드 목록 */}
        {records && shownRecords.map(r => {
          const group = namingRelationGroup(r.relation)
          const relColor = NAMING_RELATION_COLOR[group]
          const relLabel = namingRelationLabel(r.relation)
          const kindTag = KIND_TAG[r.kind]
          return (
            <div key={r.id} onClick={() => router.push(`/manseryeok/naming/diagnosis?recordId=${r.id}`)}
              style={{
                display: 'flex', alignItems: 'center', gap: 13, padding: '15px',
                background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 14,
                marginBottom: 10, cursor: 'pointer',
              }}>
              {/* 이름(한자) */}
              <div style={{ minWidth: 54, textAlign: 'center', flexShrink: 0 }}>
                <div style={{ fontSize: 22, fontWeight: 500, color: '#8f3d0e', letterSpacing: 1 }}>
                  {r.hanjaName || r.hangulName || '—'}
                </div>
              </div>

              {/* 한글이름 + 관계 배지 + 등급·날짜 */}
              <div style={{ flex: 1, minWidth: 0, borderLeft: '0.5px solid #f0e0d5', paddingLeft: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 14, fontWeight: 500, color: '#1a1a1a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {r.hangulName || '이름'}
                  </span>
                  {/* ★작명이면 도드라지는 태그, 풀이면 지금처럼 은은한 관계 태그 */}
                  {kindTag ? (
                    <span style={{
                      fontSize: 10, fontWeight: 600, color: kindTag.fg, background: kindTag.bg,
                      padding: '2px 8px', borderRadius: 10, flexShrink: 0,
                    }}>
                      {kindTag.label}
                    </span>
                  ) : (
                    <span style={{
                      fontSize: 10, color: relColor, background: `${relColor}1A`,
                      padding: '2px 8px', borderRadius: 10, flexShrink: 0,
                    }}>
                      {relLabel}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 11, color: '#5c3a1e' }}>
                  {/* ★작명이면 순위·보완 기운을, 풀이면 지금처럼 종합 등급을 */}
                  {kindTag && r.rank ? (
                    <span style={{ color: '#8f3d0e', fontWeight: 600 }}>{r.rank}순위 추천 · </span>
                  ) : r.overallGrade ? (
                    <span style={{ color: GRADE_COLOR[r.overallGrade] ?? '#b4785a' }}>종합 {r.overallGrade} · </span>
                  ) : ''}
                  {kindTag && r.filled?.length ? (
                    <span style={{ color: '#4a7c59' }}>{r.filled.join('·')} 보완 · </span>
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
                  background: 'none', border: 'none', color: '#6b5340', fontSize: 17,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                ×
              </button>
            </div>
          )
        })}

        {/* 새로 보기 → 누구 이름을 볼지 먼저 선택 (나 / 가족·지인 / 새 사람) */}
        {records && (
          <button onClick={() => setPickerOpen(true)}
            style={{
              ...PRESS,
              width: '100%', marginTop: 8, padding: 14, borderRadius: 12,
              background: '#c8783c', border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            }}>
            {/* ★2026-08-01 — 버튼을 하나로 모았습니다 (요청 1-3) */}
            + 새 이름 풀이 / 작명하기
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
              &lsquo;{confirmDel.hangulName || confirmDel.hanjaName}&rsquo; 이름 풀이를 삭제해요.<br />
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

      {/* 누구 이름을 볼까요? — 나 / 가족·지인 / 새 사람 선택 (사주 보관함과 동일 모달) */}
      <PersonPickerModal
        open={pickerOpen}
        serviceLabel="이름풀이"
        headline="누구의 이름을 볼까요?"
        serviceType="naming"
        submitLabel="이름 풀이하기"
        onClose={() => setPickerOpen(false)}
        onPickMe={() => {
          setPickerOpen(false)
          // 나(로그인 회원 본인) → URL 없이 진단(내 사주 자동)
          router.push('/manseryeok/naming/diagnosis')
        }}
        onPick={(person: SavedPerson) => {
          setPickerOpen(false)
          // 가족·지인(또는 새로 추가한 사람) → 그 사람 생년월일·관계를 실어 진단
          const q = toResultQuery(person)
          const rel = person.relation ? `&relation=${encodeURIComponent(person.relation)}` : ''
          router.push(`/manseryeok/naming/diagnosis?${q}${rel}`)
        }}
      />
    </main>
  )
}

export default function NamingStoragePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FDF6F0' }} />}>
      <NamingStorageInner />
    </Suspense>
  )
}
