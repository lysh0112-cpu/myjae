'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '../components/BottomNav'

interface Profile {
  hangul_name: string | null
  hanja_name: string | null
  nickname: string | null
  email: string | null
  birth_year: number | null
  birth_month: number | null
  birth_day: number | null
  birth_hour: string | null
  cal_type: string | null
  gender: string | null
  leap_month: boolean | null
}

export default function MyPageNew() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    async function load() {
      // 1) 로그인 확인
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        // 로그인 안 했으면 로그인 화면으로
        router.push('/login')
        return
      }
      // 2) 내 프로필 불러오기
      const { data } = await supabase
        .from('profiles')
        .select('hangul_name, hanja_name, nickname, email, birth_year, birth_month, birth_day, birth_hour, cal_type, gender, leap_month')
        .eq('id', user.id)
        .maybeSingle()

      if (mounted) {
        setProfile({
          ...(data as Profile),
          email: data?.email || user.email || null,
        })
        setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [router])

  const handleLogout = async () => {
    if (!confirm('로그아웃 할까요?')) return
    await supabase.auth.signOut()
    router.push('/login')
  }

  // 표시용 이름 (닉네임 우선, 없으면 한글이름)
  const displayName = profile?.nickname || profile?.hangul_name || '회원'
  // 생년월일 표시
  const birthText = profile?.birth_year
    ? `${profile.cal_type || '양력'} ${profile.birth_year}.${String(profile.birth_month || '').padStart(2, '0')}.${String(profile.birth_day || '').padStart(2, '0')}`
    : '생년월일 미등록'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      maxWidth: '430px',
      margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#1a1a1a',
    }}>

      {/* 헤더 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 18px',
        background: '#FAFAF8',
        borderBottom: '0.5px solid #e8e5de',
      }}>
        <button
          onClick={() => router.push('/home-new')}
          style={{ background: 'none', border: 'none', color: '#999', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
        >←</button>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>마이페이지</span>
        <div style={{ width: '22px' }} />
      </div>

      <main style={{ paddingBottom: '100px' }}>

        {/* 유저 정보 (실제 데이터) */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '22px 18px',
          borderBottom: '0.5px solid #f0ede6',
          background: '#fff',
        }}>
          <div style={{
            width: '54px', height: '54px', borderRadius: '50%',
            background: '#f0eaff',
            border: '1.5px solid #d0c5ee',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', flexShrink: 0,
          }}>🌿</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', marginBottom: '3px' }}>
              {loading ? '불러오는 중…' : displayName}
              <span style={{ fontSize: '12px', fontWeight: 400, color: '#bbb' }}> 님</span>
            </div>
            <div style={{ fontSize: '11px', color: '#bbb', marginBottom: '4px' }}>
              {profile?.email || ''}
            </div>
            <div style={{ fontSize: '11px', color: '#8B6914', fontWeight: 500 }}>
              {birthText}
            </div>
          </div>
          <button
            onClick={() => router.push('/mypage-new/edit')}
            style={{
              padding: '7px 16px',
              border: '0.5px solid #ddd',
              borderRadius: '16px', background: '#fff',
              color: '#888', fontSize: '11px', cursor: 'pointer', flexShrink: 0,
            }}>편집</button>
        </div>

        {/* 잔액 · 이용권 */}
        <div style={{ padding: '18px 16px 0', background: '#FAFAF8' }}>
          <div style={{ fontSize: '10px', color: '#bbb', letterSpacing: '1.5px', marginBottom: '10px' }}>
            MY 잔액 · 이용권
          </div>
          <div style={{
            background: '#fff',
            border: '0.5px solid #e8e5de',
            borderRadius: '16px', overflow: 'hidden',
          }}>
            <BalRow icon="💰" title="보유 캐시" sub="충전 후 서비스 이용" value="0원" action="→" />
            <BalRow icon="🎟️" title="이름짓기 이용권" sub="개명 · 아기이름 조회 가능" value="0회" action="↺" />
            <BalRow icon="✨" title="포인트" sub="상담 완료 후 적립" value="0P" action="→" last />
          </div>
          <button style={{
            width: '100%', height: '48px',
            background: '#1a1a1a', border: 'none', borderRadius: '12px',
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', marginTop: '12px', marginBottom: '4px',
            letterSpacing: '0.3px',
          }}>
            💳 캐시 충전하기
          </button>
        </div>

        {/* 내 분석 기록 */}
        <SectionLabel label="내 분석 기록" />
        <MenuGroup>
          <MenuItem icon="🔮" iconBg="#f5f0ff" title="내 사주 분석" sub="저장된 사주풀이 다시보기" count="0건" />
          <MenuItem icon="💑" iconBg="#fff5ee" title="궁합 풀이" sub="저장된 궁합 결과 보기" count="0건" />
          <MenuItem icon="✍️" iconBg="#eef6ff" title="이름풀이 · 개명" sub="분석한 이름 목록" count="0건" last />
        </MenuGroup>

        {/* 상담 · 결제 */}
        <SectionLabel label="상담 · 결제" />
        <MenuGroup>
          <MenuItem icon="📋" iconBg="#fffbee" title="상담 예약 내역" sub="예정 · 완료 상담 확인" badge="0건 예정" />
          <MenuItem icon="🧾" iconBg="#f8f8f8" title="결제 내역" sub="전체 결제 이력 확인" />
          <MenuItem icon="🎁" iconBg="#f0fff5" title="쿠폰 등록하기" sub="쿠폰 코드 입력" last />
        </MenuGroup>

        {/* 기타 */}
        <SectionLabel label="기타" />
        <MenuGroup>
          <MenuItem icon="⚙️" iconBg="#f8f8f8" title="계정 설정" sub="프로필 · 알림 · 개인정보 수정" onClick={() => router.push('/mypage-new/edit')} />
          <MenuItem icon="❓" iconBg="#fffbee" title="문의하기" sub="고객센터 · 1:1 문의" last />
        </MenuGroup>

        {/* 로그아웃 / 탈퇴 */}
        <div style={{
          margin: '16px 16px 0',
          background: '#fff',
          border: '0.5px solid #e8e5de',
          borderRadius: '16px', overflow: 'hidden',
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              width: '100%', padding: '15px 16px',
              background: 'none', border: 'none',
              borderBottom: '0.5px solid #f0ede6',
              color: '#888', fontSize: '13px', cursor: 'pointer',
              textAlign: 'left',
            }}>
            🚪 <span>로그아웃</span>
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '15px 16px',
            background: 'none', border: 'none',
            color: '#ccc', fontSize: '13px', cursor: 'pointer',
            textAlign: 'left',
          }}>
            ✕ <span>회원탈퇴</span>
          </button>
        </div>

        {/* 하단 링크 */}
        <div style={{
          textAlign: 'center', padding: '20px 0 10px',
          fontSize: '10px', color: '#ccc',
        }}>
          회사소개 &nbsp;|&nbsp; 이용약관 &nbsp;|&nbsp; 개인정보처리방침
        </div>

      </main>

      <BottomNav />
    </div>
  )
}

function BalRow({ icon, title, sub, value, action, last }: {
  icon: string; title: string; sub: string; value: string; action: string; last?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: last ? 'none' : '0.5px solid #f0ede6',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>{icon}</span>
        <div>
          <div style={{ fontSize: '13px', color: '#333' }}>{title}</div>
          <div style={{ fontSize: '10px', color: '#bbb', marginTop: '1px' }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>{value}</span>
        <button style={{
          width: '28px', height: '28px', borderRadius: '50%',
          background: '#f5f5f3', border: '0.5px solid #e8e8e8',
          color: '#999', fontSize: '13px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{action}</button>
      </div>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      padding: '18px 18px 8px',
      fontSize: '10px', color: '#bbb',
      letterSpacing: '1.5px',
    }}>
      {label}
    </div>
  )
}

function MenuGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      margin: '0 16px',
      background: '#fff',
      border: '0.5px solid #e8e5de',
      borderRadius: '16px', overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function MenuItem({ icon, iconBg, title, sub, count, badge, last, onClick }: {
  icon: string; iconBg: string; title: string; sub: string
  count?: string; badge?: string; last?: boolean; onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '14px 16px',
        borderBottom: last ? 'none' : '0.5px solid #f5f3ef',
        cursor: 'pointer',
        background: '#fff',
      }}>
      <div style={{
        width: '36px', height: '36px', borderRadius: '10px',
        background: iconBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '18px', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>{sub}</div>
      </div>
      {count && (
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#8B6914' }}>{count}</span>
      )}
      {badge && (
        <span style={{
          background: '#fffbee', color: '#8B6914',
          fontSize: '10px', fontWeight: 600,
          padding: '3px 10px', borderRadius: '10px',
          border: '0.5px solid #e8d5a0',
        }}>{badge}</span>
      )}
      <span style={{ fontSize: '18px', color: '#ddd' }}>›</span>
    </div>
  )
}
