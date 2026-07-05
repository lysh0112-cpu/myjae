'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

const SLIDES = [
  {
    tag: '사주 분석',
    title: '당신의 운명을\n밝혀드립니다',
    sub: 'AI + 전문가의 정밀 분석',
    link: '지금 확인 →',
    bg: 'linear-gradient(135deg, #f0eaff, #e0d5ff)',
    tagColor: '#9b7dcc',
    titleColor: '#4a2080',
    subColor: '#6a40a0',
    href: '/manseryeok',
  },
  {
    tag: '궁합',
    title: '우리 사이,\n사주로 알아보기',
    sub: '연인·부부 궁합 정밀 분석',
    link: '궁합 보러가기 →',
    bg: 'linear-gradient(135deg, #fff0e0, #ffe5cc)',
    tagColor: '#d4843a',
    titleColor: '#7a4010',
    subColor: '#a06020',
    href: '/manseryeok/couple-input',
  },
  {
    tag: '이름풀이·개명',
    title: '이름 속에 담긴\n내 운명은?',
    sub: '작명 전문가가 분석하는 이름의 기운',
    link: '이름 풀어보기 →',
    bg: 'linear-gradient(135deg, #e0f5ff, #ccedff)',
    tagColor: '#3a8ab4',
    titleColor: '#1a4a70',
    subColor: '#2a6090',
    href: '/manseryeok/naming',
  },
  {
    tag: '오늘의 운세',
    title: '오늘 하루\n어떤 날일까?',
    sub: '매일 내 사주 기반 운세 확인',
    link: '운세 보기 →',
    bg: 'linear-gradient(135deg, #e0fff0, #ccfce0)',
    tagColor: '#3ab47a',
    titleColor: '#1a6040',
    subColor: '#2a8060',
    href: '/manseryeok',
  },
  {
    tag: '택일',
    title: '좋은 날 받기,\n이날 어때요?',
    sub: '결혼·이사·개업 날짜 사주 택일',
    link: '택일 알아보기 →',
    bg: 'linear-gradient(135deg, #fff0f0, #ffd5d5)',
    tagColor: '#cc4444',
    titleColor: '#801010',
    subColor: '#a02020',
    href: '/manseryeok/wedding-timing',
  },
  {
    tag: '신규 혜택',
    title: '첫 상담\n특별 혜택!',
    sub: '명연재 회원 전용 이벤트',
    link: '혜택 받기 →',
    bg: 'linear-gradient(135deg, #fffff0, #fff5cc)',
    tagColor: '#b4a020',
    titleColor: '#605000',
    subColor: '#807020',
    href: '/manseryeok',
  },
]

const SERVICES = [
  { icon: '🔮', title: '사주 분석', price: '20,000원~', bg: '#f5f0ff', href: '/manseryeok' },
  { icon: '💑', title: '궁합 풀이', price: '28,000원~', bg: '#fff5ee', href: '/manseryeok/couple-input' },
  { icon: '✍️', title: '이름풀이·개명', price: '5,000원~', bg: '#eef6ff', href: '/manseryeok/naming' },
  { icon: '🃏', title: '타로 상담', price: '5,000원~', bg: '#fff0f5', href: '/manseryeok' },
  { icon: '📅', title: '택일·결혼', price: '30,000원~', bg: '#fff8ee', href: '/manseryeok/wedding-timing' },
  { icon: '👶', title: '아기 이름', price: '20,000원~', bg: '#f0fff5', href: '/manseryeok/naming' },
]

const CATS = ['전체', '사주·명리', '운세·택일', '이름', '상담']

export default function HomeNew() {
  const router = useRouter()
  const [cur, setCur] = useState(0)
  const [cat, setCat] = useState('전체')
  const trackRef = useRef<HTMLDivElement>(null)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const goTo = (n: number) => {
    const next = (n + SLIDES.length) % SLIDES.length
    setCur(next)
    if (trackRef.current) {
      trackRef.current.style.transform = `translateX(-${next * 100}%)`
    }
  }

  const startAuto = () => {
    if (autoRef.current) clearInterval(autoRef.current)
    autoRef.current = setInterval(() => {
      setCur(prev => {
        const next = (prev + 1) % SLIDES.length
        if (trackRef.current) {
          trackRef.current.style.transform = `translateX(-${next * 100}%)`
        }
        return next
      })
    }, 3000)
  }

  useEffect(() => {
    startAuto()
    return () => { if (autoRef.current) clearInterval(autoRef.current) }
  }, [])

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
        padding: '14px 18px',
        background: '#FAFAF8',
        borderBottom: '0.5px solid #f0ede6',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.3px' }}>
          명연재<span style={{ color: '#8B6914', fontSize: '13px' }}>（明然載）</span>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>🔔</button>
          <button style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>☰</button>
        </div>
      </div>

      <main style={{ paddingBottom: '80px' }}>

        {/* ① 슬라이드 배너 */}
        <div
          style={{ position: 'relative', overflow: 'hidden' }}
          onMouseEnter={() => { if (autoRef.current) clearInterval(autoRef.current) }}
          onMouseLeave={startAuto}
        >
          <div
            ref={trackRef}
            style={{ display: 'flex', transition: 'transform 0.4s ease' }}
          >
            {SLIDES.map((s, i) => (
              <div
                key={i}
                onClick={() => router.push(s.href)}
                style={{ minWidth: '100%', cursor: 'pointer' }}
              >
                <div style={{
                  height: '180px',
                  background: s.bg,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '0 20px',
                }}>
                  <span style={{
                    fontSize: '10px', letterSpacing: '1px', fontWeight: 700,
                    padding: '3px 12px', borderRadius: '12px',
                    background: s.tagColor, color: '#fff',
                  }}>{s.tag}</span>
                  <div style={{
                    fontSize: '22px', fontWeight: 700,
                    color: s.titleColor, textAlign: 'center', lineHeight: 1.3,
                    whiteSpace: 'pre-line' as const,
                  }}>{s.title}</div>
                  <div style={{ fontSize: '11px', color: s.subColor, opacity: 0.8 }}>{s.sub}</div>
                  <div style={{
                    fontSize: '11px', fontWeight: 600,
                    padding: '5px 16px', borderRadius: '14px',
                    border: `1.5px solid ${s.tagColor}`,
                    color: s.titleColor, background: '#fff',
                    marginTop: '2px',
                  }}>{s.link}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 화살표 */}
          {(['left', 'right'] as const).map(dir => (
            <button
              key={dir}
              onClick={() => goTo(dir === 'left' ? cur - 1 : cur + 1)}
              style={{
                position: 'absolute', top: '50%',
                transform: 'translateY(-50%)',
                [dir]: '10px',
                width: '28px', height: '28px', borderRadius: '50%',
                background: 'rgba(255,255,255,0.85)',
                border: '0.5px solid #e0ddd6',
                color: '#888', fontSize: '14px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >{dir === 'left' ? '‹' : '›'}</button>
          ))}

          {/* 점 인디케이터 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', padding: '8px 0 4px' }}>
            {SLIDES.map((_, i) => (
              <div
                key={i}
                onClick={() => goTo(i)}
                style={{
                  height: '5px', borderRadius: '3px',
                  width: i === cur ? '14px' : '5px',
                  background: i === cur ? '#1a1a1a' : '#ddd',
                  cursor: 'pointer', transition: 'all 0.2s',
                }}
              />
            ))}
          </div>
        </div>

        {/* ② 유저 카드 */}
        <div style={{ padding: '16px 16px 0' }}>
          <div style={{
            background: '#fff',
            border: '0.5px solid #e8e5de',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '4px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: '#f0eaff', border: '1.5px solid #d0c5ee',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0,
              }}>🌿</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', marginBottom: '3px' }}>
                  홍길동님 <span style={{ fontSize: '11px', fontWeight: 400, color: '#bbb' }}>1990년생 · 여</span>
                </div>
                <div style={{ fontSize: '11px', color: '#8B6914' }}>
                  용신 · 丙丁火 &nbsp;|&nbsp; 희신 · 戊己土
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/manseryeok')}
              style={{
                width: '100%', height: '44px',
                background: '#1a1a1a', border: 'none', borderRadius: '10px',
                color: '#fff', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', letterSpacing: '0.3px',
              }}
            >내 사주 바로 보기 →</button>
          </div>
        </div>

        {/* ③ 카테고리 탭 */}
        <div style={{
          display: 'flex', gap: '8px',
          padding: '14px 16px 10px',
          overflowX: 'auto' as const,
          scrollbarWidth: 'none' as const,
          borderBottom: '0.5px solid #f0ede6',
        }}>
          {CATS.map(c => (
            <button
              key={c}
              onClick={() => setCat(c)}
              style={{
                padding: '6px 16px', borderRadius: '18px',
                border: cat === c ? '1.5px solid #1a1a1a' : '0.5px solid #e0ddd6',
                background: cat === c ? '#1a1a1a' : '#fff',
                color: cat === c ? '#fff' : '#888',
                fontSize: '12px', fontWeight: cat === c ? 600 : 400,
                cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0,
              }}
            >{c}</button>
          ))}
        </div>

        {/* ④ 서비스 카드 */}
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '15px', fontWeight: 600 }}>핵심 서비스</span>
            <span style={{ fontSize: '12px', color: '#8B6914', cursor: 'pointer' }}>전체보기 →</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {SERVICES.map((s) => (
              <div
                key={s.title}
                onClick={() => router.push(s.href)}
                style={{
                  background: '#fff',
                  border: '0.5px solid #e8e5de',
                  borderRadius: '14px',
                  padding: '16px 14px',
                  cursor: 'pointer',
                }}
              >
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px',
                  background: s.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '20px', marginBottom: '10px',
                }}>{s.icon}</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a', marginBottom: '4px' }}>
                  {s.title}
                </div>
                <div style={{ fontSize: '11px', color: '#8B6914', fontWeight: 500 }}>{s.price}</div>
              </div>
            ))}
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: '8px', background: '#f0ede6' }} />

        {/* ⑤ WHY 명연재 소개 섹션 */}
        <div style={{ background: '#1a1a1a', padding: '36px 20px 32px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#8B6914', marginBottom: '14px' }}>
            WHY 명연재
          </div>
          <h2 style={{
            fontSize: '22px', fontWeight: 300, lineHeight: 1.5,
            color: '#fff', margin: '0 0 8px', letterSpacing: '-0.3px',
          }}>
            비싼 상담, 꼭 필요할까요?<br />
            <strong style={{ fontWeight: 700, color: '#d4b87a' }}>
              명연재가 더 깊게 알려드립니다
            </strong>
          </h2>
          <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.8, margin: '0 0 24px' }}>
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
                <div style={{ fontSize: '11px', color: '#555', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 구분선 */}
        <div style={{ height: '8px', background: '#f0ede6' }} />

        {/* ⑥ 푸터 */}
        <div style={{ background: '#f8f8f6', padding: '24px 20px 20px', borderTop: '0.5px solid #e8e5de' }}>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '14px', flexWrap: 'wrap' as const }}>
            {['회사소개', '이용약관', '개인정보처리방침'].map((t, i) => (
              <span key={t} style={{
                fontSize: '11px',
                color: i === 2 ? '#1a1a1a' : '#bbb',
                fontWeight: i === 2 ? 700 : 400,
                cursor: 'pointer',
              }}>{t}</span>
            ))}
          </div>
          <div style={{ height: '0.5px', background: '#e8e5de', marginBottom: '14px' }} />
          <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
            {['IG', 'YT', 'X'].map(s => (
              <div key={s} style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: '#e8e5de',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
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
            marginTop: '10px', padding: '7px 18px',
            border: '0.5px solid #ddd', borderRadius: '16px',
            background: '#fff', color: '#666',
            fontSize: '11px', cursor: 'pointer',
          }}>문의하기</button>
          <div style={{
            marginTop: '14px', paddingTop: '12px',
            borderTop: '0.5px solid #eee',
            fontSize: '10px', color: '#ccc',
          }}>
            © 2026 명연재연구소. All rights reserved.
          </div>
        </div>

      </main>

      {/* 하단 네비게이션 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%',
        transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        display: 'flex', justifyContent: 'space-around',
        padding: '10px 0 20px',
        background: '#fff',
        borderTop: '0.5px solid #f0ede6',
        zIndex: 20,
      }}>
        {[
          { icon: '🏠', label: '홈', active: true },
          { icon: '⊞', label: '서비스', active: false },
          { icon: '💬', label: '상담', active: false },
          { icon: '🤍', label: '찜', active: false },
          { icon: '👤', label: '마이', active: false },
        ].map(item => (
          <div
            key={item.label}
            style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '22px' }}>{item.icon}</span>
            <span style={{
              fontSize: '10px',
              color: item.active ? '#1a1a1a' : '#ccc',
              fontWeight: item.active ? 600 : 400,
            }}>{item.label}</span>
          </div>
        ))}
      </div>

    </div>
  )
}
