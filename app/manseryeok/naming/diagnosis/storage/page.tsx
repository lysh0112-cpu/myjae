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
import { useRouter, useSearchParams } from 'next/navigation'
import {
  listNamingRecords, deleteNamingRecord, daysAgoLabel,
  NAMING_RELATION_COLOR, namingRelationGroup, namingRelationLabel,
  type NamingRecord, type NamingKind,
} from '@/lib/saju/namingRecords'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'
import { surnameOfHangul } from '@/lib/saju/surname'

// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 — 보관함에 «풀이» 와 «작명» 을 가르는 탭을 넣습니다
//
//   ⚠️ 옛 기록에는 kind 가 없어 «풀이» 로 들어옵니다. 하나도 안 사라집니다.
//   ⚠️ 색은 «작명» 만 도드라지게 둡니다 —
//      풀이는 지금처럼 관계 배지(은은한 톤)를 그대로 씁니다.
// ══════════════════════════════════════════════════════════════════

type FilterKey = '전체' | '풀이' | '작명'
const FILTER_LABEL: Record<FilterKey, string> = {
  전체: '전체', 풀이: '이름 풀이', 작명: '작명 보관함',
}

// ══════════════════════════════════════════════════════════════════
//  ★2026-08-01 (43부 2차) — 「들어온 입구」에 따라 보관함이 «달라집니다»
//
//  [무엇이 문제였나]  대표님 지시 —
//    홈에서 [내이름 감정]과 [아기 작명] 버튼을 갈라 놓았는데,
//    둘 다 «같은 보관함» 으로 들어왔습니다.
//    ⚠️ 아기 이름을 지으러 온 분이 [+ 새 이름 풀이하기] 버튼을 함께 보고,
//       이름을 풀러 온 분이 [+ 새 이름 짓기] 를 함께 봤습니다.
//       ★버튼을 가른 뜻이 보관함에서 도로 뭉개졌습니다.
//
//  [이제]  ?mode= 로 갈립니다.
//    diagnosis  「내 이름 보관함」   탭 없음 · [+ 새 이름 풀이하기] 하나
//    naming     「작명 보관함」      탭 없음 · [+ 새 이름 짓기] 하나
//    (없음)     「내 이름 보관함」   탭 셋 · 버튼 둘   ← ★예전 그대로
//
//  ⚠️⚠️ «거르기» 이지 «지우기» 가 아닙니다.
//     모드가 걸려도 기록은 하나도 사라지지 않습니다. 다른 갈래를 보고 싶으면
//     화면 아래 「모두 보기」 로 언제든 전체 보관함에 갈 수 있습니다.
//     ★기록이 «없어진 줄» 알고 놀라시는 일이 없어야 합니다.
//
//  ⚠️ mode 가 없을 때를 «예전 그대로» 둔 것은 일부러입니다 —
//     옛 링크·북마크가 아직 살아 있습니다. (교훈 AM)
// ══════════════════════════════════════════════════════════════════

type StorageMode = 'diagnosis' | 'naming' | null

/** 모드마다 화면이 어떻게 달라지는가 — ★한 곳에만 적습니다 */
const MODE_VIEW = {
  diagnosis: {
    title: '내 이름 보관함',
    /** 이 갈래만 보여 줍니다 */
    only: '풀이' as FilterKey,
    /** 하단 버튼 — 하나만 */
    button: '풀이' as const,
    empty: '아직 저장된 이름 풀이가 없어요',
    emptySub: '이름을 풀면 여기에 차곡차곡 쌓여요',
    otherLabel: '작명 기록도 함께 보기',
  },
  naming: {
    title: '작명 보관함',
    only: '작명' as FilterKey,
    button: '작명' as const,
    empty: '아직 지어 드린 이름이 없어요',
    emptySub: '아래에서 새 이름을 지어 보세요',
    otherLabel: '이름 풀이 기록도 함께 보기',
  },
} as const

const FILTERS: FilterKey[] = ['전체', '풀이', '작명']

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
  const sp = useSearchParams()

  const [records, setRecords] = useState<NamingRecord[] | null>(null)
  const [confirmDel, setConfirmDel] = useState<NamingRecord | null>(null)

  // ══════════════════════════════════════════════════════════════
  //  ★들어온 입구 (2026-08-01 · 43부 2차)
  //   ?mode=diagnosis  홈 [내이름 감정] 에서
  //   ?mode=naming     홈 [아기 작명] 에서
  //   없음             옛 링크·마이페이지 — ★예전 그대로 (탭 셋 · 버튼 둘)
  // ══════════════════════════════════════════════════════════════
  const modeParam = sp?.get('mode')
  const mode: StorageMode =
    modeParam === 'diagnosis' ? 'diagnosis'
      : modeParam === 'naming' ? 'naming' : null
  const view = mode ? MODE_VIEW[mode] : null

  /** ★모드가 있으면 그 갈래로 «고정» 됩니다. 없으면 손님이 탭으로 고릅니다 */
  const [filter, setFilter] = useState<FilterKey>(view ? view.only : '전체')
  /** 모드인데도 «전체» 를 보고 싶다고 하셨는가 — 「모두 보기」를 누른 경우 */
  const [showAll, setShowAll] = useState(false)
  const effFilter: FilterKey = showAll ? '전체' : filter

  /** ★탭에 맞춰 거릅니다. «작명» 은 풀이가 아닌 것 전부 (개명·신생아) */
  const shownRecords = (records ?? []).filter(r =>
    effFilter === '전체' ? true : effFilter === '풀이' ? r.kind === '풀이' : r.kind !== '풀이')
  /** ⚠️ «다른 갈래에 몇 건이 있는지» — 기록이 사라진 줄 알고 놀라시지 않도록 */
  const hiddenCount = (records ?? []).length - shownRecords.length
  const [deleting, setDeleting] = useState(false)
  // ══════════════════════════════════════════════════════════════
  //  ★2026-08-01 — 버튼을 «둘» 로 나눴습니다 (대표님 지시)
  //
  //   [무엇이 문제였나]  버튼이 하나뿐이라 «어디로 가는지» 헷갈렸습니다.
  //     버튼 하나에 두 뜻을 담아 두었더니 «누르면 무엇이 되는지» 알 수 없었습니다
  //
  //   [이제는]  길마다 버튼이 있고, 팝업 «제목» 도 다릅니다.
  //     [+ 새 이름 풀이하기]  → 「이름 풀이 인적사항 입력」 → 감정 화면
  //     [+ 새 이름 짓기]      → 「작명 기본 정보 입력」   → Step 2 이름 고르기
  //
  //   ⚠️ 작명 조건(어감·선호 소리·피할 글자)은 Step 2 화면 «안» 에서 고릅니다.
  //      여기서 묻고 저기서 또 묻으면 손님이 지칩니다.
  // ══════════════════════════════════════════════════════════════
  // ★2026-08-01 (43부 · E) — 아기 이름 짓기 입구(rename/newborn)에서
  //   ?open=작명 으로 들어오면 그 자리에서 작명 폼을 엽니다.
  //   ⚠️ 폼을 두 곳에 만들지 않기 위한 길입니다 (교훈 CJ).
  //   ⚠️ 효과(useEffect)로 열지 «않습니다» — 한 번 더 그려지고 폼이 깜박입니다.
  //      첫 값으로 둡니다.
  const openParam = sp?.get('open')
  const [pickerOpen, setPickerOpen] = useState<null | '풀이' | '작명'>(
    openParam === '작명' || openParam === '풀이' ? openParam : null,
  )

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
        <div style={{ fontSize: 16, fontWeight: 500, color: '#1a1a1a' }}>
          {view ? view.title : '내 이름 보관함'}
        </div>
        {records && (
          <div style={{ marginLeft: 'auto', fontSize: 12, color: '#5c3a1e' }}>
            {/* ⚠️ 모드일 때는 «보이는 건수» 를 적습니다 — 전체 건수를 적으면
                목록과 숫자가 어긋나 「어디 갔지」 가 됩니다 */}
            {(view && !showAll ? shownRecords.length : records.length)}건
          </div>
        )}
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
            <div style={{ fontSize: 30, marginBottom: 10 }}>{mode === 'naming' ? '✍️' : '📜'}</div>
            <div style={{ fontSize: 14, color: '#96502e', fontWeight: 500, marginBottom: 4 }}>
              {view ? view.empty : '아직 저장된 이름 풀이가 없어요'}
            </div>
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              {view ? view.emptySub : '이름을 풀면 여기에 차곡차곡 쌓여요'}
            </div>
          </div>
        )}

        {/* ★필터 탭 — 전체 / 이름 풀이 / 작명 보관함
            ⚠️ 모드로 들어오면 «숨깁니다». 갈래가 이미 정해져 있는데 탭을 보이면
               「왜 하나만 나오지」 가 됩니다. 대신 아래 「모두 보기」 를 둡니다. */}
        {!view && records && records.length > 0 && (
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
            {effFilter === '작명'
              ? '아직 지어 드린 이름이 없어요. 아래에서 새로 지어 보세요.'
              : effFilter === '풀이'
                ? '아직 풀어 본 이름이 없어요. 아래에서 시작해 보세요.'
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

        {/* ══════════════════════════════════════════════════════
            새로 보기 → 누구 이름을 볼지 먼저 선택 (나 / 가족·지인 / 새 사람)

            ★2026-08-01 (43부 2차) — 들어온 입구에 따라 버튼이 «하나» 입니다.
              diagnosis  [+ 새 이름 풀이하기] 만
              naming     [+ 새 이름 짓기]    만
              모드 없음   둘 다 (예전 그대로)

            ⚠️ 버튼을 숨겨도 «길이 끊기지» 않습니다 — 아래 「모두 보기」로
               전체 보관함에 가면 두 버튼이 다시 나옵니다.
            ══════════════════════════════════════════════════════ */}
        {records && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {(!view || view.button === '작명') && (
              <button onClick={() => setPickerOpen('작명')}
                style={{
                  ...PRESS,
                  width: '100%', padding: 15, borderRadius: 12,
                  background: '#c8783c', border: 'none', color: '#fff',
                  fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>
                + 새 이름 짓기 <span style={{ fontSize: 12, opacity: .85 }}>(작명)</span>
              </button>
            )}
            {(!view || view.button === '풀이') && (
              <button onClick={() => setPickerOpen('풀이')}
                style={{
                  ...PRESS,
                  width: '100%', padding: view?.button === '풀이' ? 15 : 14, borderRadius: 12,
                  // ★이 갈래 전용 화면이면 이 버튼이 «주인공» 이라 채워 씁니다
                  background: view?.button === '풀이' ? '#c8783c' : '#FFFBF7',
                  border: view?.button === '풀이' ? 'none' : '1px solid #c8783c',
                  color: view?.button === '풀이' ? '#fff' : '#c8783c',
                  fontSize: 14, fontWeight: view?.button === '풀이' ? 600 : 500, cursor: 'pointer',
                }}>
                + 새 이름 풀이하기
              </button>
            )}
          </div>
        )}

        {/* ★작명 모드 — 처음 오신 분께 «어떻게 진행되는지» 안내 화면을 이어 둡니다.
            ⚠️ 홈 카드가 보관함으로 바로 오게 되면서 안내 화면이 «아무도 안 부르는»
               자리가 될 뻔했습니다. 여기서 잇습니다. (교훈 AM) */}
        {mode === 'naming' && records && (
          <button
            onClick={() => router.push('/manseryeok/naming/rename/newborn')}
            style={{
              ...PRESS, width: '100%', marginTop: 10, padding: '11px 10px',
              background: 'none', border: 'none', color: '#8a7063',
              fontSize: 12, cursor: 'pointer',
            }}>
            아기 작명이 처음이신가요? 어떻게 진행되는지 보기 →
          </button>
        )}

        {/* ══════════════════════════════════════════════════════
            ★「모두 보기」 — ⚠️ 기록이 «사라진 줄» 알고 놀라시지 않도록
              모드로 걸러 놓았을 뿐 하나도 지워지지 않았다는 것을 알려 드립니다.
              몇 건이 가려져 있는지 «숫자로» 적습니다.
            ══════════════════════════════════════════════════════ */}
        {view && records && records.length > 0 && (
          <button
            onClick={() => setShowAll(v => !v)}
            style={{
              ...PRESS, width: '100%', marginTop: 12, padding: '11px 10px',
              background: 'none', border: 'none', color: '#8a7063',
              fontSize: 12, cursor: 'pointer', lineHeight: 1.6,
            }}>
            {showAll
              ? '이 보관함만 보기 ▴'
              : hiddenCount > 0
                ? `${view.otherLabel} · ${hiddenCount}건 ▾`
                : '전체 보관함 보기 ▾'}
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
        open={pickerOpen !== null}
        serviceLabel={pickerOpen === '작명' ? '작명' : '이름풀이'}
        headline={pickerOpen === '작명' ? '작명 기본 정보 입력' : '이름 풀이 인적사항 입력'}
        serviceType="naming"
        submitLabel={pickerOpen === '작명' ? '이름 지으러 가기' : '이름 풀이하러 가기'}
        namingMode={pickerOpen === '작명'}   /* ★작명이면 «이름» 대신 «성씨 + 태명·호칭» */
        onClose={() => setPickerOpen(null)}
        onPickMe={() => {
          setPickerOpen(null)
          if (pickerOpen === '작명') {
            // ★2026-08-01 (43부) — 이 길은 «성씨 + 태명» 으로 들어옵니다.
            //   즉 «아직 이름이 없는» 작명입니다. kind 를 또박또박 실어 보냅니다.
            //   ⚠️ 안 실으면 newname 이 my_names(내 최근 이름풀이)를 보고
            //      「개명」으로 오해합니다. ③번이 되살아나는 자리입니다.
            router.push('/manseryeok/naming/rename/newname?kind=신생아')
            return
          }
          // ⚠️ 사주는 로그인 회원 본인 것이라 파라미터 없이 넘깁니다
          router.push('/manseryeok/naming/diagnosis')
        }}
        onPick={(person: SavedPerson) => {
          const base = pickerOpen === '작명'
            ? '/manseryeok/naming/rename/newname'   // Step 2 — 이름 고르기
            : '/manseryeok/naming/diagnosis'        // 감정
          setPickerOpen(null)
          // ★그 사람 사주를 그대로 실어 보냅니다 — 다음 화면에서 다시 묻지 않습니다
          const q = toResultQuery(person)
          const rel = person.relation ? `&relation=${encodeURIComponent(person.relation)}` : ''
          // ★작명이면 «성씨» 도 함께 — 아직 이름이 없는 손님을 받쳐 줍니다.
          //   저장된 이름의 «첫 글자» 를 성씨로 봅니다 (「류 첫째」 면 「류」).
          //   ⚠️ 앞 두 글자를 그냥 자르지 않습니다 — 복성 판단은 surname.ts 한 곳만.
          const sn = pickerOpen === '작명' && person.title
            ? `&surname=${encodeURIComponent(surnameOfHangul(person.title))}`
            : ''
          // ★kind — 이 길은 «이름이 아직 없는» 작명입니다 (43부 결함 ③)
          const kd = pickerOpen === '작명' ? '&kind=신생아' : ''
          router.push(`${base}?${q}${rel}${sn}${kd}`)
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
