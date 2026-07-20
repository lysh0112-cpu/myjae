'use client'

// ============================================================================
// 유저 카드 (공용 부품)
// ----------------------------------------------------------------------------
// 쓰는 법:
//   <UserCard />                          ← 표시만 (홈 기본)
//   <UserCard footer={<button .../>} />   ← 카드 아래 붙일 것을 넘김
//
// 담긴 것: 로그인 확인 → 프로필 조회 → 명식 계산 → 아바타·이름·등급·생년월일·일주
//   - 비회원이면 로그인/회원가입 버튼
//   - 사주 미등록이면 "사주 미등록"으로 표시(일주 자리는 비움)
//
// ⚠ 이 부품은 "보여주기"만 한다. 사주 수정 같은 편집은 footer 로 받아서 붙인다.
//   (마이페이지 편집 로직을 여기 옮기지 않는다 — 되돌리기 어려워짐)
// ============================================================================

import { ReactNode, useCallback, useEffect, useState } from 'react'
import { EL_BG, EL_BD, EL_C, EL_C_SUB, EL_HAN } from '@/lib/saju/ohaengColor'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useResultSaju } from '@/hooks/useResultSaju'
import { normalizeHourLabel, hourLabelOf } from '@/lib/saju/birthInput'
import SajuEditModal from './SajuEditModal'
import { useFortuneCache } from './FortuneCache'
import { withNim } from '@/lib/saju/honorific'

const STEM_ELEMENT: Record<string, string> = { 甲:'목',乙:'목',丙:'화',丁:'화',戊:'토',己:'토',庚:'금',辛:'금',壬:'수',癸:'수' }
const BRANCH_ELEMENT: Record<string, string> = { 子:'수',丑:'토',寅:'목',卯:'목',辰:'토',巳:'화',午:'화',未:'토',申:'금',酉:'금',戌:'토',亥:'수' }

type CardProfile = {
  nickname: string | null
  role: string | null
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_hour: string | null
  cal_type: string | null
  gender: string | null
  leap_month: boolean | null
  saju_saved: boolean | null
}

function toHourIdx(h: string | null): number | null {
  if (!h || h === '모름') return null
  const n = parseInt(h, 10)
  return isNaN(n) ? null : n
}

function roleLabel(r: string | null) {
  return r === 'master' ? '매니저' : r === 'consultant' ? '상담사' : '일반회원'
}
function roleColor(r: string | null) {
  return r === 'master' ? { bg: '#f0eaff', fg: '#785aaa' }
    : r === 'consultant' ? { bg: '#e1f5ee', fg: '#1d9e75' }
      : { bg: '#f5ebe2', fg: '#b4785a' }
}

function GanjiBox({ char, el }: { char: string; el: string }) {
  const color = el ? EL_C[el] : '#888'
  const sub = el ? EL_C_SUB[el] : '#888'
  const bg = el ? EL_BG[el] : '#f5f5f5'
  const bd = el ? EL_BD[el] : '#ddd'
  return (
    <div style={{ width: 38, height: 46, borderRadius: 7, background: bg, border: `1px solid ${bd}`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ fontSize: 19, fontWeight: 600, color, lineHeight: 1 }}>{char}</span>
      {el && <span style={{ fontSize: 10.5, fontWeight: 600, color: sub, marginTop: 1 }}>{EL_HAN[el]}</span>}
    </div>
  )
}

// footer 에 넘겨주는 정보 — 버튼 문구·이동 주소를 부르는 쪽이 정할 수 있게
export type UserCardInfo = {
  hasSaju: boolean          // 사주가 등록돼 있나
  sajuDetailUrl: string     // 내 사주 상세 주소 (미등록이면 '/mypage-new')
  displayName: string
}

export default function UserCard({ footer }: { footer?: ReactNode | ((info: UserCardInfo) => ReactNode) }) {
  const router = useRouter()
  const [profile, setProfile] = useState<CardProfile | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [email, setEmail] = useState('')

  const { saju } = useResultSaju(
    profile?.cal_type || '양력',
    profile?.birth_year || 0,
    profile?.birth_month || 0,
    profile?.birth_day || 0,
    '0',
    toHourIdx(profile?.birth_hour ?? null),
  )

  const [editOpen, setEditOpen] = useState(false)
  const cache = useFortuneCache()

  const loadProfile = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser()
    if (!u.user) { setIsLoggedIn(false); return }
    setIsLoggedIn(true)
    setEmail(u.user.email || '')

    const { data: p } = await supabase.from('profiles')
      .select('nickname, role, birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month, saju_saved')
      .eq('id', u.user.id)
      .maybeSingle()
    if (p) setProfile(p as CardProfile)
  }, [])

  useEffect(() => { loadProfile() }, [loadProfile])

  const wrap: React.CSSProperties = {
    background: '#FFFBF7', border: '0.5px solid #f0e0d5',
    borderRadius: 16, overflow: 'hidden',
  }

  if (isLoggedIn === null) return null

  // ── 비회원 ──
  if (!isLoggedIn) {
    return (
      <div style={{ ...wrap, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: '50%',
            background: '#f5ebe2', border: '1.5px solid #e6d5c5',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, flexShrink: 0, color: '#6b5340',
          }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, color: '#3a2e28' }}>반가워요! ✦</div>
            <div style={{ fontSize: 11, color: '#8f3d0e' }}>로그인하고 내 사주를 확인하세요</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => router.push('/login')} style={{
            flex: 1, height: 44, background: '#b46e46', border: 'none', borderRadius: 10,
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>로그인</button>
          <button onClick={() => router.push('/signup')} style={{
            flex: 1, height: 44, background: '#fff', border: '0.5px solid #e6d0bc', borderRadius: 10,
            color: '#96502e', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}>회원가입</button>
        </div>
      </div>
    )
  }

  // ── 회원 ──
  const displayName = profile?.nickname || '회원'
  const initial = (profile?.nickname || email || '?').charAt(0)
  const rc = roleColor(profile?.role || null)
  const dayPillar = saju && saju.length >= 2 ? saju[1] : null
  const hasSaju = !!profile?.saju_saved && !!profile?.birth_year

  const hourText = (() => {
    const idx = normalizeHourLabel(profile?.birth_hour ?? null)
    if (idx == null) return profile?.birth_hour === '모름' ? '모름' : '-'
    return hourLabelOf(idx).split('(')[0].trim()
  })()

  // 내 사주 상세 화면 주소 (마이페이지 sajuDetailUrl 과 같은 규칙)
  const sajuDetailUrl = () => {
    if (!hasSaju) return '/mypage-new'
    const g = profile?.gender === '여' ? '여' : '남'
    const cal = profile?.cal_type || '양력'
    const hourIdx = toHourIdx(profile?.birth_hour ?? null)
    const hourParam = hourIdx == null ? '' : `&hour=${hourIdx}`
    const leap = profile?.leap_month ? '1' : '0'
    return `/manseryeok/result-new?gender=${g}&calType=${cal}&year=${profile?.birth_year}&month=${profile?.birth_month}&day=${profile?.birth_day}&leapMonth=${leap}${hourParam}&mode=chart`
  }

  const subLine = hasSaju
    ? `${profile?.cal_type || '양력'} ${profile?.birth_year}.${profile?.birth_month}.${profile?.birth_day} · ${hourText} · ${profile?.gender === '여' ? '여성' : '남성'}`
    : '사주 미등록'

  return (
    <div style={wrap}>
      <div style={{ padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 42, height: 42, borderRadius: '50%', background: '#fae6d5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, fontWeight: 700, color: '#8f3d0e', flexShrink: 0,
        }}>{initial}</div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#3a2e28' }}>{withNim(displayName)}</span>
            <span style={{
              fontSize: 9, padding: '2px 8px', borderRadius: 10,
              background: rc.bg, color: rc.fg, fontWeight: 500, flexShrink: 0,
            }}>{roleLabel(profile?.role || null)}</span>
            <button
              onClick={() => setEditOpen(true)}
              style={{
                marginLeft: 'auto', flexShrink: 0,
                fontSize: 10, color: '#6b5340',
                border: '0.5px solid #ecd8c6', borderRadius: 7,
                padding: '3px 8px', background: 'none', cursor: 'pointer',
              }}
            >수정</button>
          </div>
          <div style={{ fontSize: 10.5, color: '#9a8574', marginTop: 3 }}>{subLine}</div>
        </div>

        {hasSaju && dayPillar && dayPillar.stem !== '?' && (
          <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
            <GanjiBox char={dayPillar.stem} el={STEM_ELEMENT[dayPillar.stem]} />
            <GanjiBox char={dayPillar.branch} el={BRANCH_ELEMENT[dayPillar.branch]} />
          </div>
        )}
      </div>

      {footer && (
        <div style={{ borderTop: '0.5px solid #f5e5da' }}>
          {typeof footer === 'function'
            ? footer({ hasSaju, sajuDetailUrl: sajuDetailUrl(), displayName })
            : footer}
        </div>
      )}

      <SajuEditModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={() => {
          // 사주가 바뀌었을 수 있으니 담아둔 운세를 버린다.
          //   (DB 쪽은 SajuEditModal 이 지운다)
          cache.clear()
          loadProfile()
        }}
      />
    </div>
  )
}
