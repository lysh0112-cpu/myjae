'use client'
// app/manseryeok/components/PersonPickerModal.tsx
// ============================================================================
// 공용 "사람 선택 모달" — 홈의 12서비스가 전부 이 모달을 거친다.
// ----------------------------------------------------------------------------
// 담는 것(전부 확정된 설계):
//  - 헤드라인: 서비스별 자동 (예: "누구의 사주를 볼까요?")
//  - 관계별 그룹 목록 (연인·가족 / 친구·지인 / 기타) — 빈 그룹 자동 숨김
//  - 검색: 저장된 사람 5명 이상일 때만 노출, 이름으로 필터
//  - 편집 모드 토글: 평소엔 눌러서 바로 결과로 / "편집" 누르면 수정·삭제 노출
//  - 새로운 사람 추가 / 수정 → PersonFormPitch 재사용
//  - 삭제 → 확인 후 제거
//  - 중복이면 "이미 있어요" 알림 (savedPeople.addSavedPerson이 판정)
//
// 이 모달은 "1명 고르기"용(사주·대운·개명 등)이다.
// 궁합처럼 2명 고르는 흐름은 이 모달을 두 번 띄우거나 별도 래퍼로 감싼다.
//
// 부모 사용 예:
//   <PersonPickerModal
//     open={open}
//     serviceLabel="사주해설"
//     headline="누구의 사주를 볼까요?"
//     serviceType="saju"
//     submitLabel="저장하고 사주 보기"
//     onPick={(person) => { /* 그 사람 결과 화면으로 이동 */ }}
//     onClose={() => setOpen(false)}
//   />
// ============================================================================

import { useEffect, useMemo, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { fromProfile } from '@/lib/saju/myInfo'
import {
  listSavedPeople, addSavedPerson, updateSavedPerson, deleteSavedPerson,
  groupByRelation, avatarChar,
  type SavedPerson, type PersonDraft,
} from '@/lib/saju/savedPeople'
import PersonFormPitch from './PersonFormPitch'

// ── 피치톤 색 ──
const C = {
  overlay: 'rgba(60,40,30,0.35)',
  cardBg: '#FFFBF7',
  divider: '#f5e5da',
  point: '#c8783c',
  brown: '#b46e46',
  title: '#3a2e28',
  titleWarm: '#96502e',
  sub: '#b4785a',
  subLight: '#c5a590',
  searchBg: '#faf3ee',
  searchBorder: '#f0e0d5',
  selRow: '#faf3ee',
  chevron: '#d0b299',
  danger: '#c05a5a',
}

// 이름 첫 글자 아바타 배경 (savedPeople와 동일 규칙로 안정 배정)
const AVATAR_BG = [
  { bg: '#f4c0d1', fg: '#72243e' },
  { bg: '#f5c4b3', fg: '#712b13' },
  { bg: '#fac775', fg: '#633806' },
  { bg: '#9fe1cb', fg: '#085041' },
  { bg: '#b5d4f4', fg: '#0c447c' },
  { bg: '#cecbf6', fg: '#3c3489' },
]
function avatarColor(title: string) {
  const t = (title ?? '').trim()
  let sum = 0
  for (let i = 0; i < t.length; i++) sum += t.charCodeAt(i)
  return AVATAR_BG[sum % AVATAR_BG.length]
}

// 시(hour) → 표시용 라벨 (예: '5' → '巳시')
const HOUR_SHORT: Record<string, string> = {
  '0': '子시', '1': '丑시', '2': '寅시', '3': '卯시', '4': '辰시', '5': '巳시',
  '6': '午시', '7': '未시', '8': '申시', '9': '酉시', '10': '戌시', '11': '亥시',
}
function birthLine(p: SavedPerson): string {
  const { calType, year, month, day, hour, leapMonth } = p.input_data
  const date = `${year}.${String(month).padStart(2, '0')}.${String(day).padStart(2, '0')}`
  const leap = calType === '음력' && leapMonth === '1' ? '(윤달)' : ''
  const h = hour === '모름' || hour === '' ? '시간 모름' : (HOUR_SHORT[hour] ?? '')
  return `${date}${leap} · ${h}`
}

export interface PersonPickerModalProps {
  open: boolean
  serviceLabel: string          // 작은 라벨 예: "사주해설"
  headline: string              // 큰 카피 예: "누구의 사주를 볼까요?"
  serviceType?: string | null   // 저장 시 기록 (예: 'saju')
  presetRelation?: string       // 새 사람 추가 시 관계 미리 지정 (궁합 등)
  submitLabel?: string          // 폼 저장 버튼 문구
  onPick: (person: SavedPerson) => void   // 저장된 사람 선택 시 (결과로 이동)
  onPickMe?: () => void         // "나"(로그인 회원 본인) 선택 시. 없으면 "나" 항목 숨김
  onClose: () => void
}

// profiles에서 "나" 표시에 쓸 최소 정보
interface MeInfo {
  nickname: string
  birthLine: string
  avatarChar: string
}

type View =
  | { mode: 'list' }
  | { mode: 'add' }
  | { mode: 'edit'; person: SavedPerson }

export default function PersonPickerModal({
  open, serviceLabel, headline, serviceType, presetRelation, submitLabel = '저장하기',
  onPick, onPickMe, onClose,
}: PersonPickerModalProps) {
  const [people, setPeople] = useState<SavedPerson[]>([])
  const [me, setMe] = useState<MeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<View>({ mode: 'list' })
  const [editing, setEditing] = useState(false)     // 편집 모드 토글
  const [query, setQuery] = useState('')
  const [formErr, setFormErr] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [confirmDel, setConfirmDel] = useState<SavedPerson | null>(null)

  // 열릴 때마다 목록 + "나"(profiles) 로드
  // onPickMe는 인라인 함수라 매 렌더 새로 생김 → 의존성에 넣으면 입력 중
  // effect가 재실행돼 폼이 목록으로 리셋된다. ref로 최신값만 참조하고 의존성은 [open].
  const onPickMeRef = useRef(onPickMe)
  onPickMeRef.current = onPickMe

  useEffect(() => {
    if (!open) return
    let cancelled = false
    setLoading(true)
    setView({ mode: 'list' }); setEditing(false); setQuery('')

    async function load() {
      const list = await listSavedPeople()
      if (cancelled) return
      setPeople(list)

      // "나" 표시: onPickMe가 있을 때만 (없으면 "나" 항목 자체를 안 씀)
      if (onPickMeRef.current) {
        try {
          const { data: u } = await supabase.auth.getUser()
          if (u?.user) {
            const { data: p } = await supabase.from('profiles')
              .select('nickname, hangul_name, birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
              .eq('id', u.user.id).maybeSingle()
            const info = fromProfile(p)
            if (info && p && !cancelled) {
              const date = `${info.year}.${String(info.month).padStart(2, '0')}.${String(info.day).padStart(2, '0')}`
              const h = info.hour === '모름' ? '시간 모름' : (HOUR_SHORT[info.hour] ?? '')
              const nick = (p.nickname as string) || (p.hangul_name as string) || '나'
              setMe({ nickname: nick, birthLine: `${date} · ${h}`, avatarChar: avatarChar(nick) })
            } else if (!cancelled) {
              setMe(null)   // 사주 미등록 회원 → "나" 항목 숨김
            }
          }
        } catch (e) { console.error(e) }
      }
      if (!cancelled) setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [open])

  const filtered = useMemo(() => {
    const q = query.trim()
    if (!q) return people
    return people.filter(p => p.title.includes(q))
  }, [people, query])

  const groups = useMemo(() => groupByRelation(filtered), [filtered])
  const showSearch = people.length >= 5

  if (!open) return null

  // ── 추가/수정 저장 처리 ──
  async function handleSubmit(draft: PersonDraft) {
    setSubmitting(true); setFormErr('')
    if (view.mode === 'add') {
      const res = await addSavedPerson(draft)
      setSubmitting(false)
      if (!res.ok) {
        if (res.reason === 'duplicate') setFormErr(`이미 있어요 — "${res.existing.title}"와 생년월일이 같아요.`)
        else if (res.reason === 'not_logged_in') setFormErr('로그인이 필요해요.')
        else setFormErr(res.message)
        return
      }
      // 저장 성공 → 목록 갱신 + 바로 그 사람 결과로
      setPeople(prev => [res.person, ...prev])
      onPick(res.person)
    } else if (view.mode === 'edit') {
      const res = await updateSavedPerson(view.person.id, draft)
      setSubmitting(false)
      if (!res.ok) {
        if (res.reason === 'duplicate') setFormErr(`이미 있어요 — "${res.existing.title}"와 생년월일이 같아요.`)
        else setFormErr(res.message)
        return
      }
      setPeople(prev => prev.map(p => p.id === res.person.id ? res.person : p))
      setView({ mode: 'list' })
    }
  }

  async function handleDelete(p: SavedPerson) {
    const res = await deleteSavedPerson(p.id)
    if (res.ok) {
      setPeople(prev => prev.filter(x => x.id !== p.id))
      setConfirmDel(null)
    }
  }

  // ── 입력폼 화면 (추가/수정) ──
  if (view.mode === 'add' || view.mode === 'edit') {
    const initial = view.mode === 'edit'
      ? { title: view.person.title, relation: view.person.relation, input: view.person.input_data }
      : undefined
    return (
      <Overlay onClose={onClose}>
        <PersonFormPitch
          initial={initial}
          presetRelation={presetRelation}
          serviceType={serviceType}
          submitLabel={submitLabel}
          submitting={submitting}
          errorMessage={formErr}
          onSubmit={handleSubmit}
          onBack={() => { setView({ mode: 'list' }); setFormErr('') }}
          onClose={onClose}
        />
      </Overlay>
    )
  }

  // ── 목록 화면 ──
  return (
    <Overlay onClose={onClose}>
      <div style={{ background: C.cardBg, borderRadius: 20, overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '82vh' }}>
        {/* 헤더 */}
        <div style={{ padding: '20px 18px 14px', position: 'relative', textAlign: 'center', flexShrink: 0 }}>
          <button onClick={onClose} aria-label="닫기"
            style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: C.subLight, fontSize: 19, lineHeight: 1 }}>×</button>
          {people.length > 0 && (
            <button onClick={() => setEditing(v => !v)}
              style={{ position: 'absolute', top: 16, left: 16, background: 'none', border: `0.5px solid ${C.searchBorder}`, borderRadius: 7, padding: '4px 10px', cursor: 'pointer', color: C.point, fontSize: 12 }}>
              {editing ? '완료' : '편집'}
            </button>
          )}
          <div style={{ fontSize: 11, color: C.point, letterSpacing: 1.5, marginBottom: 6 }}>{serviceLabel}</div>
          <div style={{ fontSize: 18, fontWeight: 500, color: C.title }}>{headline}</div>
        </div>

        {/* 검색 (5명 이상) */}
        {showSearch && (
          <div style={{ padding: '0 16px 12px', flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, background: C.searchBg, border: `0.5px solid ${C.searchBorder}`, borderRadius: 12, padding: '9px 13px' }}>
              <span style={{ color: C.subLight, fontSize: 14 }}>⌕</span>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="이름으로 찾기"
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: C.title }} />
            </div>
          </div>
        )}

        {/* 목록 (스크롤 영역) */}
        <div style={{ overflowY: 'auto', flex: 1, borderTop: `0.5px solid ${C.divider}` }}>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: C.sub, fontSize: 13 }}>불러오는 중…</div>
          ) : (people.length === 0 && !me) ? (
            <div style={{ padding: '36px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 14, color: C.title, fontWeight: 500, marginBottom: 6 }}>아직 저장한 사람이 없어요</div>
              <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6 }}>아래 버튼으로 사람을 추가하면<br />다음부터 바로 골라서 볼 수 있어요.</div>
            </div>
          ) : (
            <>
              {/* "나" — profiles 기반, 맨 위 고정. 검색 중이 아닐 때만 표시 */}
              {me && onPickMe && !query.trim() && (
                <div>
                  <div style={{ fontSize: 11, color: C.point, fontWeight: 500, padding: '12px 18px 6px' }}>나</div>
                  <div onClick={() => { if (!editing) onPickMe() }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px', cursor: editing ? 'default' : 'pointer', background: C.selRow }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, background: '#f4c0d1', color: '#72243e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 500, flexShrink: 0 }}>
                      {me.avatarChar}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: C.title, fontWeight: 500 }}>
                        {me.nickname} <span style={{ fontSize: 10, color: C.point, background: '#fff3e9', border: `0.5px solid ${C.searchBorder}`, borderRadius: 6, padding: '1px 6px', marginLeft: 3 }}>본인</span>
                      </div>
                      <div style={{ fontSize: 11, color: C.sub }}>{me.birthLine}</div>
                    </div>
                    {!editing && <span style={{ color: C.chevron, fontSize: 16 }}>›</span>}
                  </div>
                </div>
              )}

              {groups.length === 0 && people.length > 0 && query.trim() ? (
                <div style={{ padding: '36px 24px', textAlign: 'center', color: C.sub, fontSize: 13 }}>
                  "{query}"와 일치하는 사람이 없어요.
                </div>
              ) : (
                groups.map(g => (
                  <div key={g.key}>
                    <div style={{ fontSize: 11, color: C.point, fontWeight: 500, padding: '12px 18px 6px' }}>{g.label}</div>
                    {g.people.map(p => {
                      const av = avatarColor(p.title)
                      return (
                        <div key={p.id}
                          onClick={() => { if (!editing) onPick(p) }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 18px', cursor: editing ? 'default' : 'pointer' }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: av.bg, color: av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 500, flexShrink: 0 }}>
                            {avatarChar(p.title)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 14, color: C.title, fontWeight: 500 }}>
                              {p.title} <span style={{ fontSize: 10, color: C.titleWarm, marginLeft: 3 }}>{p.relation}</span>
                            </div>
                            <div style={{ fontSize: 11, color: C.sub }}>{birthLine(p)}</div>
                          </div>
                          {editing ? (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={(e) => { e.stopPropagation(); setView({ mode: 'edit', person: p }); setFormErr('') }}
                                style={{ fontSize: 11, color: C.titleWarm, border: `0.5px solid ${C.searchBorder}`, borderRadius: 8, padding: '5px 10px', background: 'none', cursor: 'pointer' }}>수정</button>
                              <button onClick={(e) => { e.stopPropagation(); setConfirmDel(p) }}
                                style={{ fontSize: 11, color: C.danger, border: `0.5px solid #f0d0d0`, borderRadius: 8, padding: '5px 10px', background: 'none', cursor: 'pointer' }}>삭제</button>
                            </div>
                          ) : (
                            <span style={{ color: C.chevron, fontSize: 16 }}>›</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ))
              )}
            </>
          )}
        </div>

        {/* 새로운 사람 추가 */}
        <div style={{ padding: '12px 16px 16px', borderTop: `0.5px solid ${C.divider}`, flexShrink: 0 }}>
          <button onClick={() => { setView({ mode: 'add' }); setFormErr('') }}
            style={{ width: '100%', background: C.brown, borderRadius: 12, padding: 13, border: 'none', color: '#fff', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}>
            ＋ 새로운 사람 추가
          </button>
        </div>
      </div>

      {/* 삭제 확인 */}
      {confirmDel && (
        <div onClick={() => setConfirmDel(null)}
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 20 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, padding: '22px 20px', width: 260, textAlign: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.title, marginBottom: 6 }}>삭제할까요?</div>
            <div style={{ fontSize: 12, color: C.sub, marginBottom: 18, lineHeight: 1.6 }}>"{confirmDel.title}"을(를) 목록에서 지워요.<br />되돌릴 수 없어요.</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDel(null)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `0.5px solid ${C.searchBorder}`, background: 'none', color: C.sub, fontSize: 13, cursor: 'pointer' }}>취소</button>
              <button onClick={() => handleDelete(confirmDel)}
                style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: 'none', background: C.danger, color: '#fff', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>삭제</button>
            </div>
          </div>
        </div>
      )}
    </Overlay>
  )
}

// ── 오버레이 (모달 바깥 공통) ──
function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000, background: C.overlay,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14,
      }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, position: 'relative' }}>
        {children}
      </div>
    </div>
  )
}
