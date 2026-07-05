'use client'

import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FAFAF8',
      maxWidth: '430px',
      margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#1a1a1a',
    }}>

      {/* 네비게이션 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 20px',
        background: '#FAFAF8',
        borderBottom: '0.5px solid #f0ede6',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a1a', letterSpacing: '-0.3px' }}>
          명연재<span style={{ color: '#8B6914', fontSize: '13px' }}>（明然載）</span>
        </div>
        <button
          onClick={() => router.push('/auth/login')}
          style={{
            padding: '7px 18px',
            border: '1px solid #1a1a1a',
            borderRadius: '20px',
            background: 'transparent',
            color: '#1a1a1a',
            fontSize: '12px', fontWeight: 500,
            cursor: 'pointer',
          }}
        >로그인</button>
      </div>

      <main>

        {/* ① 히어로 */}
        <div style={{ padding: '36px 20px 28px', background: '#FAFAF8', textAlign: 'center' }}>
          <div style={{
            fontSize: '10px', letterSpacing: '2.5px', color: '#8B6914',
            marginBottom: '16px', fontWeight: 500,
          }}>
            사주명리 전문 플랫폼
          </div>
          <h1 style={{
            fontSize: '28px', fontWeight: 300, lineHeight: 1.4,
            color: '#1a1a1a', letterSpacing: '-0.5px', margin: '0 0 8px',
          }}>
            모두를 위한 사주,<br />
            <strong style={{ fontWeight: 700 }}>명연재가 밝혀드립니다</strong>
          </h1>
          <p style={{
            fontSize: '13px', color: '#999', lineHeight: 1.8,
            margin: '0 0 28px',
          }}>
            3대 고전(적천수·자평진전·궁통보감)을 바탕으로<br />
            AI와 전문가가 함께 분석하는 깊이 있는 명리
          </p>

          {/* 사주 카드 미리보기 */}
          <div style={{
            background: '#fff',
            border: '0.5px solid #e8e5de',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'left',
          }}>
            {/* 카드 헤더 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: '#f0eaff', border: '1.5px solid #d0c5ee',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0,
              }}>🌿</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a' }}>
                  홍길동 <span style={{ fontSize: '11px', color: '#999', fontWeight: 400 }}>（을목 일간）</span>
                </div>
                <div style={{ fontSize: '11px', color: '#bbb', marginTop: '2px' }}>
                  1990.03.22 · 서울특별시
                </div>
              </div>
            </div>

            {/* 사주 4주 */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px', marginBottom: '14px' }}>
              {[
                { label: '연주', gan: '庚', ji: '午', ganColor: '#c0392b' },
                { label: '월주', gan: '壬', ji: '子', ganColor: '#2980b9' },
                { label: '일주 ★', gan: '乙', ji: '亥', ganColor: '#4a2080', highlight: true },
                { label: '시주', gan: '甲', ji: '寅', ganColor: '#27ae60' },
              ].map((col) => (
                <div key={col.label} style={{
                  background: col.highlight ? '#fffbee' : '#f8f6ff',
                  border: `0.5px solid ${col.highlight ? '#e8d5a0' : '#e0d8f8'}`,
                  borderRadius: '10px',
                  padding: '10px 6px',
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: '9px', color: col.highlight ? '#8B6914' : '#9b7dcc', marginBottom: '4px' }}>
                    {col.label}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: col.ganColor, lineHeight: 1 }}>
                    {col.gan}
                  </div>
                  <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>{col.ji}</div>
                </div>
              ))}
            </div>

            {/* 용신·희신 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              <div style={{
                flex: 1, padding: '8px 0', textAlign: 'center',
                background: '#fffbee', borderRadius: '8px',
                border: '0.5px solid #e8d5a0',
                fontSize: '12px', fontWeight: 600, color: '#8B6914',
              }}>용신 · 丙丁火</div>
              <div style={{
                flex: 1, padding: '8px 0', textAlign: 'center',
                background: '#f5f0ff', borderRadius: '8px',
                border: '0.5px solid #d0c5ee',
                fontSize: '12px', fontWeight: 600, color: '#6a40a0',
              }}>희신 · 戊己土</div>
            </div>

            {/* 상세보기 버튼 */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '6px', padding: '10px 0',
              background: '#f8f6ff', borderRadius: '10px',
              fontSize: '12px', color: '#9b7dcc', fontWeight: 600, cursor: 'pointer',
            }}>
              사주 자세히 보기 ▾
            </div>
          </div>

          {/* CTA 버튼 */}
          <button
            onClick={() => router.push('/onboarding')}
            style={{
              width: '100%', height: '54px',
              background: '#1a1a1a', border: 'none', borderRadius: '16px',
              color: '#fff', fontSize: '16px', fontWeight: 600,
              cursor: 'pointer', letterSpacing: '0.3px', marginBottom: '12px',
            }}
          >
            ✦ 시작하기
          </button>
          <button
            style={{
              width: '100%', height: '46px',
              background: '#f5f5f3', border: '0.5px solid #e0ddd6',
              borderRadius: '16px', color: '#666',
              fontSize: '14px', cursor: 'pointer',
            }}
          >
            저장된 사주 불러오기
          </button>
        </div>

        {/* 구분선 */}
        <div style={{ height: '8px', background: '#f0ede6' }} />

        {/* ② 명연재 특징 박스 */}
        <div style={{
          margin: '24px 16px',
          background: '#fff',
          border: '0.5px solid #e8e5de',
          borderRadius: '18px',
          padding: '20px',
        }}>
          <div style={{
            display: 'inline-block',
            background: '#8B6914', color: '#fff',
            fontSize: '10px', fontWeight: 700,
            padding: '3px 10px', borderRadius: '10px',
            marginBottom: '14px', letterSpacing: '1px',
          }}>명연재 특징</div>
          {[
            '3대 고전 기반 정통 명리 분석',
            'AI + 전문 상담사 연계 시스템',
            '이름풀이·개명·궁합·택일 통합 서비스',
            '회원가입 한 번으로 내 사주 영구 저장',
            '검증된 명리 전문가와 직접 상담 가능',
          ].map((item) => (
            <div key={item} style={{
              display: 'flex', alignItems: 'flex-start', gap: '10px',
              padding: '8px 0',
              borderBottom: '0.5px solid #f5f3ef',
              fontSize: '13px', color: '#333', lineHeight: 1.5,
            }}>
              <span style={{ color: '#8B6914', fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>✦</span>
              {item}
            </div>
          ))}
        </div>

        {/* 구분선 */}
        <div style={{ height: '8px', background: '#f0ede6' }} />

        {/* ③ WHY 명연재 (소개 섹션) */}
        <div style={{ background: '#1a1a1a', padding: '36px 20px 32px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#8B6914', marginBottom: '14px' }}>
            WHY 명연재
          </div>
          <h2 style={{
            fontSize: '22px', fontWeight: 300, lineHeight: 1.5,
            color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px',
          }}>
            비싼 상담, 꼭 필요할까요?<br />
            <strong style={{ fontWeight: 700, color: '#d4b87a' }}>명연재가 더 깊게 알려드립니다</strong>
          </h2>
          <p style={{ fontSize: '12px', color: '#666', lineHeight: 1.8, margin: '0 0 24px' }}>
            20만원짜리 대면 상담보다 정확하고 세밀하게.<br />
            3대 고전을 바탕으로 AI가 분석하고,<br />
            필요할 때만 전문가와 연결됩니다.
          </p>

          {[
            { icon: '📖', title: '정통 명리 3대 고전 기반', desc: '적천수·자평진전·궁통보감을 학습한 AI가 분석합니다' },
            { icon: '🔮', title: '사주 · 궁합 · 이름 · 택일 통합', desc: '한 플랫폼에서 명리의 모든 것을 해결하세요' },
            { icon: '👩‍🏫', title: '검증된 전문가 직접 상담', desc: 'AI 분석 후 더 깊은 해석이 필요할 때만 연결' },
            { icon: '☁️', title: '내 사주 영구 저장', desc: '매번 입력 없이, 로그인하면 바로 내 분석 확인' },
          ].map((item) => (
            <div key={item.title} style={{
              display: 'flex', alignItems: 'flex-start', gap: '14px',
              padding: '14px 0',
              borderBottom: '0.5px solid rgba(255,255,255,0.06)',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '17px', flexShrink: 0,
              }}>{item.icon}</div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#e0e0e0', marginBottom: '3px' }}>
                  {item.title}
                </div>
                <div style={{ fontSize: '11px', color: '#666', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}

          <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
            <button
              onClick={() => router.push('/onboarding')}
              style={{
                flex: 1, height: '48px',
                background: '#8B6914', border: 'none', borderRadius: '12px',
                color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer',
              }}
            >지금 무료로 시작</button>
            <button
              style={{
                flex: 1, height: '48px',
                background: 'transparent',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px',
                color: '#888', fontSize: '13px', cursor: 'pointer',
              }}
            >서비스 더 알아보기</button>
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: '8px', background: '#f0ede6' }} />

        {/* ④ 푸터 */}
        <div style={{ background: '#f8f8f6', padding: '24px 20px 40px', borderTop: '0.5px solid #e8e5de' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' as const }}>
            {['회사소개', '이용약관', '개인정보처리방침'].map((t, i) => (
              <span key={t} style={{
                fontSize: '11px',
                color: i === 2 ? '#1a1a1a' : '#999',
                fontWeight: i === 2 ? 700 : 400,
                cursor: 'pointer',
              }}>{t}</span>
            ))}
          </div>
          <div style={{ height: '1px', background: '#e8e5de', marginBottom: '16px' }} />
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            {['IG', 'YT', 'X'].map((s) => (
              <div key={s} style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: '#e8e5de', display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: '10px', color: '#888', cursor: 'pointer',
              }}>{s}</div>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#bbb', lineHeight: 1.9 }}>
            (주)명연재연구소 &nbsp;|&nbsp; 대표 오연희<br />
            사업자등록번호 000-00-0000<br />
            서울시 강북구 솔매로45길 95, 201호
          </div>
          <div style={{ marginTop: '12px', fontSize: '11px', color: '#888', lineHeight: 1.9 }}>
            <strong style={{ color: '#555' }}>고객센터</strong><br />
            lysh6728@naver.com<br />
            070-0000-0000
          </div>
          <button style={{
            marginTop: '12px', padding: '7px 18px',
            border: '0.5px solid #ddd', borderRadius: '16px',
            background: '#fff', color: '#666',
            fontSize: '11px', cursor: 'pointer',
          }}>문의하기</button>
          <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '0.5px solid #eee', fontSize: '10px', color: '#ccc' }}>
            © 2026 명연재연구소. All rights reserved.
          </div>
        </div>

      </main>
    </div>
  )
}
