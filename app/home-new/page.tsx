'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── 슬라이드 배너 ──
const SLIDES = [
  {
    tag: '오늘의 운세', title: '오늘 하루\n어떤 날일까?',
    sub: '매일 내 사주 기반 운세 확인', link: '운세 보기 →',
    bg: 'linear-gradient(135deg, #e0fff0, #ccfce0)',
    tagColor: '#3ab47a', titleColor: '#1a6040', subColor: '#2a8060',
    href: '/manseryeok',
  },
  {
    tag: '사주 분석', title: '당신의 운명을\n밝혀드립니다',
    sub: 'AI + 전문가의 정밀 분석', link: '지금 확인 →',
    bg: 'linear-gradient(135deg, #f0eaff, #e0d5ff)',
    tagColor: '#9b7dcc', titleColor: '#4a2080', subColor: '#6a40a0',
    href: '/manseryeok',
  },
  {
    tag: '궁합', title: '우리 사이,\n사주로 알아보기',
    sub: '연인·부부 궁합 정밀 분석', link: '궁합 보러가기 →',
    bg: 'linear-gradient(135deg, #fff0e0, #ffe5cc)',
    tagColor: '#d4843a', titleColor: '#7a4010', subColor: '#a06020',
    href: '/manseryeok/couple-input',
  },
]

// ── 12지신 서비스 (이미지 순서 그대로) ──
const SERVICES = [
  { name: '사주',        img: '/01-saju.png',     color: '#6e50a0', href: '/manseryeok' },
  { name: '부부궁합',    img: '/02-buboo.png',    color: '#c85a6e', href: '/manseryeok/couple-input' },
  { name: '연인궁합',    img: '/03-yeonin.png',   color: '#c85a8c', href: '/manseryeok/couple-input' },
  { name: '결혼택일',    img: '/04-wedding.png',  color: '#96643c', href: '/manseryeok/wedding-timing' },
  { name: '출산택일',    img: '/05-birth.png',    color: '#b45a78', href: '/manseryeok/birth-timing' },
  { name: '이름·개명',   img: '/06-naming.png',   color: '#5a825a', href: '/manseryeok/naming' },
  { name: '아기이름',    img: '/07-babyname.png', color: '#967850', href: '/manseryeok/naming' },
  { name: '내 사주그림', img: '/08-sajupic.png',  color: '#b46e46', href: '/manseryeok/mulsang' },
  { name: '10년대운',    img: '/09-daeun.png',    color: '#3c82a0', href: '/manseryeok' },
  { name: '세운',        img: '/10-seun.png',     color: '#8c783c', href: '/manseryeok' },
  { name: '월운',        img: '/11-wolun.png',    color: '#aa6450', href: '/manseryeok' },
  { name: '타로',        img: '/12-tarot.png',    color: '#b45a78', href: '/tarot' },
]

const CATS = ['전체', '사주·명리', '운세·택일', '이름', '상담']

interface Profile {
  nickname: string | null
  hangul_name: string | null
  birth_year: number | null
  gender: string | null
}

export default function HomeNew() {
  const router = useRouter()
  const [slide, setSlide] = useState(0)
  const [cat, setCat] = useState('전체')
  const [profile, setProfile] = useState<Profile | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // 로그인 유저 정보
  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase
        .from('profiles')
        .select('nickname, hangul_name, birth_year, gender')
        .eq('id', user.id)
        .maybeSingle()
      if (mounted && data) setProfile(data as Profile)
    }
    load()
    return () => { mounted = false }
  }, [])

  // 배너 자동 슬라이드
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlide(s => (s + 1) % SLIDES.length)
    }, 4000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const displayName = profile?.nickname || profile?.hangul_name || '회원'

  return (
    <div style={{
      minHeight: '100vh', background: '#FAFAF8',
      maxWidth: '430px', margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#1a1a1a', paddingBottom: '70px',
    }}>

      {/* ① 네비게이션 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: '#FAFAF8',
        borderBottom: '0.5px solid #f0ede6',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600 }}>
          명연재<span style={{ color: '#8B6914', fontSize: '12px' }}>（明然載）</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '18px', color: '#888' }}>
          <span style={{ cursor: 'pointer' }}>🔔</span>
          <span style={{ cursor: 'pointer' }}>☰</span>
        </div>
      </div>

      <main>
        {/* ② 슬라이드 배너 */}
        <div style={{ padding: '14px 16px 0' }}>
          <div
            onClick={() => router.push(SLIDES[slide].href)}
            style={{
              borderRadius: '18px', padding: '28px 22px',
              background: SLIDES[slide].bg, cursor: 'pointer',
              minHeight: '150px', position: 'relative',
              transition: 'background 0.4s',
            }}
          >
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.6)', fontSize: '11px', fontWeight: 700,
              color: SLIDES[slide].tagColor, marginBottom: '12px',
            }}>{SLIDES[slide].tag}</div>
            <div style={{
              fontSize: '22px', fontWeight: 700, lineHeight: 1.35,
              color: SLIDES[slide].titleColor, whiteSpace: 'pre-line', marginBottom: '8px',
            }}>{SLIDES[slide].title}</div>
            <div style={{ fontSize: '12px', color: SLIDES[slide].subColor, marginBottom: '14px' }}>
              {SLIDES[slide].sub}
            </div>
            <div style={{
              display: 'inline-block', padding: '7px 16px', borderRadius: '16px',
              background: 'rgba(255,255,255,0.75)', fontSize: '12px', fontWeight: 600,
              color: SLIDES[slide].titleColor,
            }}>{SLIDES[slide].link}</div>
          </div>
          {/* 점 인디케이터 */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '10px 0 4px' }}>
            {SLIDES.map((_, i) => (
              <div key={i} onClick={() => setSlide(i)} style={{
                width: i === slide ? '18px' : '6px', height: '6px', borderRadius: '3px',
                background: i === slide ? '#8B6914' : '#ddd', cursor: 'pointer', transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* ③ 유저 카드 */}
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{
            background: '#fff', border: '0.5px solid #e8e5de',
            borderRadius: '16px', padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: '#f0eaff', border: '1.5px solid #d0c5ee',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0,
              }}>🌿</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px' }}>
                  {displayName}님
                  {profile?.birth_year && (
                    <span style={{ fontSize: '11px', fontWeight: 400, color: '#bbb' }}>
                      {' '}{profile.birth_year}년생 · {profile.gender || ''}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#8B6914' }}>
                  오늘도 좋은 기운 가득하세요 ✦
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/manseryeok')}
              style={{
                width: '100%', height: '44px',
                background: '#1a1a1a', border: 'none', borderRadius: '10px',
                color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
              }}
            >내 사주 바로 보기 →</button>
          </div>
        </div>

        {/* ④ 카테고리 탭 */}
        <div style={{
          display: 'flex', gap: '8px', padding: '16px 16px 10px',
          overflowX: 'auto' as const, scrollbarWidth: 'none' as const,
        }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)} style={{
              padding: '6px 16px', borderRadius: '18px',
              border: cat === c ? '1.5px solid #1a1a1a' : '0.5px solid #e0ddd6',
              background: cat === c ? '#1a1a1a' : '#fff',
              color: cat === c ? '#fff' : '#888',
              fontSize: '12px', fontWeight: cat === c ? 600 : 400,
              cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0,
            }}>{c}</button>
          ))}
        </div>

        {/* ⑤ 12지신 서비스 그리드 */}
        <div style={{ padding: '6px 16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700 }}>명연재 서비스</span>
            <span style={{ fontSize: '11px', color: '#8B6914' }}>12지신과 함께 ✦</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {SERVICES.map((s) => (
              <div
                key={s.name}
                onClick={() => router.push(s.href)}
                style={{
                  position: 'relative', aspectRatio: '1 / 1',
                  borderRadius: '18px', overflow: 'hidden',
                  cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,0.05)',
                }}
              >
                {/* 지신 이미지 */}
                <img src={s.img} alt={s.name} style={{
                  width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                }} />
                {/* 도톰한 글씨 (아래쪽) */}
                <div style={{
                  position: 'absolute', bottom: '14px', left: 0, right: 0,
                  textAlign: 'center',
                  fontSize: s.name.length <= 4 ? '22px' : '18px',
                  fontWeight: 900, color: s.color,
                  textShadow: '2px 2px 0 #fff, -2px 2px 0 #fff, 2px -2px 0 #fff, -2px -2px 0 #fff, 0 3px 6px rgba(0,0,0,0.15)',
                  letterSpacing: '-0.5px',
                }}>{s.name}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* 하단 고정 네비게이션 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        display: 'flex', background: '#fff',
        borderTop: '0.5px solid #e8e5de', zIndex: 20,
      }}>
        {[
          { icon: '🏠', label: '홈', href: '/home-new', active: true },
          { icon: '⊞', label: '서비스', href: '/manseryeok', active: false },
          { icon: '💬', label: '상담', href: '/manseryeok/consultant-select', active: false },
          { icon: '♡', label: '찜', href: '/home-new', active: false },
          { icon: '👤', label: '마이', href: '/mypage-new', active: false },
        ].map((n) => (
          <button
            key={n.label}
            onClick={() => router.push(n.href)}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
            }}
          >
            <span style={{ fontSize: '18px', opacity: n.active ? 1 : 0.4 }}>{n.icon}</span>
            <span style={{ fontSize: '10px', color: n.active ? '#8B6914' : '#bbb', fontWeight: n.active ? 600 : 400 }}>
              {n.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
