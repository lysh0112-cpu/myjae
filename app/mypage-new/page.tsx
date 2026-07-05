'use client'

import { useRouter } from 'next/navigation'
import BottomNav from '../components/BottomNav'

export default function MyPageNew() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a18',
      maxWidth: '430px',
      margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
    }}>

      {/* 헤더 */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 18px',
        borderBottom: '0.5px solid rgba(255,255,255,0.08)',
      }}>
        <button
          onClick={() => router.back()}
          style={{ background: 'none', border: 'none', color: '#888', fontSize: '22px', cursor: 'pointer', lineHeight: 1 }}
        >←</button>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>마이페이지</span>
        <div style={{ width: '22px' }} />
      </div>

      <main style={{ paddingBottom: '100px' }}>

        {/* 유저 정보 */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '14px',
          padding: '20px 18px',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '50%',
            background: 'rgba(155,125,204,0.15)',
            border: '1.5px solid rgba(155,125,204,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '24px', flexShrink: 0,
          }}>🌿</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>
              홍길동 <span style={{ fontSize: '11px', fontWeight: 400, color: '#666' }}>님</span>
            </div>
            <div style={{ fontSize: '11px', color: '#555', marginBottom: '3px' }}>카카오로 로그인했습니다</div>
            <div style={{ fontSize: '11px', color: '#8B6914' }}>乙亥일주 · 용신 丙丁火</div>
          </div>
          <button style={{
            padding: '6px 14px',
            border: '0.5px solid rgba(255,255,255,0.15)',
            borderRadius: '14px', background: 'none',
            color: '#888', fontSize: '11px', cursor: 'pointer', flexShrink: 0,
          }}>편집</button>
        </div>

        {/* 잔액 · 이용권 */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{ fontSize: '10px', color: '#444', letterSpacing: '1px', marginBottom: '10px' }}>
            MY 잔액 · 이용권
          </div>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.08)',
            borderRadius: '14px', overflow: 'hidden',
          }}>
            <BalRow icon="💰" title="보유 캐시" sub="충전 후 서비스 이용" value="0원" action="→" />
            <BalRow icon="🎟️" title="이름짓기 이용권" sub="개명 · 아기이름 조회 가능" value="0회" action="↺" />
            <BalRow icon="✨" title="포인트" sub="상담 완료 후 적립" value="0P" action="→" last />
          </div>
          <button style={{
            width: '100%', height: '46px',
            background: '#8B6914', border: 'none', borderRadius: '10px',
            color: '#fff', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', marginTop: '10px', marginBottom: '4px',
          }}>
            💳 캐시 충전하기
          </button>
        </div>

        {/* 내 분석 기록 */}
        <SectionLabel label="내 분석 기록" />
        <MenuGroup>
          <MenuItem icon="🔮" iconBg="rgba(155,125,204,0.15)" title="내 사주 분석" sub="저장된 사주풀이 다시보기" count="0건" />
          <MenuItem icon="💑" iconBg="rgba(212,132,58,0.15)" title="궁합 풀이" sub="저장된 궁합 결과 보기" count="0건" />
          <MenuItem icon="✍️" iconBg="rgba(58,138,180,0.15)" title="이름풀이 · 개명" sub="분석한 이름 목록" count="0건" last />
        </MenuGroup>

        {/* 상담 · 결제 */}
        <SectionLabel label="상담 · 결제" />
        <MenuGroup>
          <MenuItem icon="📋" iconBg="rgba(255,245,200,0.08)" title="상담 예약 내역" sub="예정 · 완료 상담 확인" badge="0건 예정" />
          <MenuItem icon="🧾" iconBg="rgba(255,255,255,0.04)" title="결제 내역" sub="전체 결제 이력 확인" />
          <MenuItem icon="🎁" iconBg="rgba(100,200,100,0.08)" title="쿠폰 등록하기" sub="쿠폰 코드 입력" last />
        </MenuGroup>

        {/* 기타 */}
        <SectionLabel label="기타" />
        <MenuGroup>
          <MenuItem icon="⚙️" iconBg="rgba(255,255,255,0.04)" title="계정 설정" sub="프로필 · 알림 · 개인정보 수정" />
          <MenuItem icon="❓" iconBg="rgba(255,200,100,0.08)" title="문의하기" sub="고객센터 · 1:1 문의" last />
        </MenuGroup>

        {/* 로그아웃 / 탈퇴 */}
        <div style={{
          padding: '12px 18px 4px',
          marginTop: '8px',
          borderTop: '0.5px solid rgba(255,255,255,0.06)',
        }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '13px 0',
            background: 'none', border: 'none',
            borderBottom: '0.5px solid rgba(255,255,255,0.06)',
            color: '#666', fontSize: '13px', cursor: 'pointer',
          }}>
            🚪 로그아웃
          </button>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            width: '100%', padding: '13px 0',
            background: 'none', border: 'none',
            color: '#333', fontSize: '13px', cursor: 'pointer',
          }}>
            ✕ 회원탈퇴
          </button>
        </div>

        {/* 하단 링크 */}
        <div style={{
          textAlign: 'center', padding: '14px 0',
          fontSize: '10px', color: '#333',
          borderTop: '0.5px solid rgba(255,255,255,0.04)',
        }}>
          회사소개 &nbsp;|&nbsp; 이용약관 &nbsp;|&nbsp; 개인정보처리방침
        </div>

      </main>

      <BottomNav />
    </div>
  )
}

/* ── 서브 컴포넌트 ── */

function BalRow({ icon, title, sub, value, action, last }: {
  icon: string; title: string; sub: string; value: string; action: string; last?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '14px 16px',
      borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '18px' }}>{icon}</span>
        <div>
          <div style={{ fontSize: '13px', color: '#ccc' }}>{title}</div>
          <div style={{ fontSize: '10px', color: '#444' }}>{sub}</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '16px', fontWeight: 700, color: '#fff' }}>{value}</span>
        <button style={{
          width: '26px', height: '26px', borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
          border: '0.5px solid rgba(255,255,255,0.1)',
          color: '#666', fontSize: '13px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{action}</button>
      </div>
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <div style={{
      padding: '16px 18px 6px',
      fontSize: '10px', color: '#444',
      letterSpacing: '1px',
    }}>
      {label}
    </div>
  )
}

function MenuGroup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      margin: '0 16px',
      background: 'rgba(255,255,255,0.04)',
      border: '0.5px solid rgba(255,255,255,0.08)',
      borderRadius: '14px', overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

function MenuItem({ icon, iconBg, title, sub, count, badge, last }: {
  icon: string; iconBg: string; title: string; sub: string
  count?: string; badge?: string; last?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px',
      padding: '14px 16px',
      borderBottom: last ? 'none' : '0.5px solid rgba(255,255,255,0.06)',
      cursor: 'pointer',
    }}>
      <div style={{
        width: '34px', height: '34px', borderRadius: '10px',
        background: iconBg, display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: '17px', flexShrink: 0,
      }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', color: '#e0e0e0', fontWeight: 500 }}>{title}</div>
        <div style={{ fontSize: '10px', color: '#444', marginTop: '2px' }}>{sub}</div>
      </div>
      {count && (
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#8B6914' }}>{count}</span>
      )}
      {badge && (
        <span style={{
          background: 'rgba(139,105,20,0.2)', color: '#c8980a',
          fontSize: '9px', fontWeight: 700,
          padding: '3px 8px', borderRadius: '8px',
          border: '0.5px solid rgba(139,105,20,0.3)',
        }}>{badge}</span>
      )}
      <span style={{ fontSize: '16px', color: '#333' }}>›</span>
    </div>
  )
}
