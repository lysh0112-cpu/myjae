'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

// ── 슬라이드 배너 ──
const SLIDES = [
  {
    tag: '오늘의 운세', title: '오늘 하루\n어떤 날일까?',
    sub: '매일 내 사주 기반 운세 확인', link: '운세 보기 →',
    bg: 'linear-gradient(135deg, #fce6d5, #f8d5be)',
    tagColor: '#c8783c', titleColor: '#96502e', subColor: '#b4785a',
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

// ── 12지신 이미지 (파일명 01~12) ──
const ZODIAC_IMAGES = [
  '/01-saju.png', '/02-buboo.png', '/03-yeonin.png', '/04-wedding.png',
  '/05-birth.png', '/06-naming.png', '/07-babyname.png', '/08-sajupic.png',
  '/09-daeun.png', '/10-seun.png', '/11-wolun.png', '/12-tarot.png',
]

// ── 12 서비스 (연재쌤 지정 순서) ──
const SERVICES = [
  { name: '사주',       color: '#6e50a0', href: '/manseryeok' },
  { name: '내사주그림', color: '#b46e46', href: '/manseryeok/mulsang' },
  { name: '대운',       color: '#3c82a0', href: '/manseryeok' },
  { name: '연도별운세', color: '#8c783c', href: '/manseryeok' },
  { name: '연인궁합',   color: '#c85a8c', href: '/manseryeok/couple-input' },
  { name: '부부궁합',   color: '#c85a6e', href: '/manseryeok/couple-input' },
  { name: '결혼택일',   color: '#96643c', href: '/manseryeok/wedding-timing' },
  { name: '출산택일',   color: '#b45a78', href: '/manseryeok/birth-timing' },
  { name: '내이름개명', color: '#5a825a', href: '/manseryeok/naming' },
  { name: '아기이름',   color: '#967850', href: '/manseryeok/naming' },
  { name: '타로',       color: '#b45a78', href: '/tarot' },
  { name: '물어보살',   color: '#785aaa', href: '/manseryeok/ai-chat' },
]

const CATS = ['전체', '사주·명리', '운세·택일', '이름', '상담']

// 오늘 날짜 기준 0~11 (매일 이미지가 한 칸씩 돌게)
function dayOffset(): number {
  const now = new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now.getTime() - start.getTime()
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))
  return dayOfYear % 12
}

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
  const [offset, setOffset] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setOffset(dayOffset()) }, [])

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

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlide(s => (s + 1) % SLIDES.length)
    }, 4000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const displayName = profile?.nickname || profile?.hangul_name || '회원'

  return (
    <div style={{
      minHeight: '100vh', background: '#FDF6F0',
      maxWidth: '430px', margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#3a2e28', paddingBottom: '70px',
    }}>

      {/* ① 네비게이션 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: '#FFFBF7',
        borderBottom: '0.5px solid #f0e0d5',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ fontSize: '16px', fontWeight: 600, color: '#3a2e28' }}>
          명연재<span style={{ color: '#c8783c', fontSize: '12px' }}>（明然載）</span>
        </div>
        <div style={{ display: 'flex', gap: '16px', fontSize: '18px', color: '#b49080' }}>
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
              minHeight: '150px', transition: 'background 0.4s',
            }}
          >
            <div style={{
              display: 'inline-block', padding: '4px 12px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.65)', fontSize: '11px', fontWeight: 700,
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
              background: 'rgba(255,255,255,0.8)', fontSize: '12px', fontWeight: 600,
              color: SLIDES[slide].titleColor,
            }}>{SLIDES[slide].link}</div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '10px 0 4px' }}>
            {SLIDES.map((_, i) => (
              <div key={i} onClick={() => setSlide(i)} style={{
                width: i === slide ? '18px' : '6px', height: '6px', borderRadius: '3px',
                background: i === slide ? '#c8783c' : '#e8d5c5', cursor: 'pointer', transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* ③ 유저 카드 */}
        <div style={{ padding: '8px 16px 0' }}>
          <div style={{
            background: '#FFFBF7', border: '0.5px solid #f0e0d5',
            borderRadius: '16px', padding: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '50%',
                background: '#fae6d5', border: '1.5px solid #e6be9f',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', flexShrink: 0,
              }}>🌿</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px', color: '#3a2e28' }}>
                  {displayName}님
                  {profile?.birth_year && (
                    <span style={{ fontSize: '11px', fontWeight: 400, color: '#c5a590' }}>
                      {' '}{profile.birth_year}년생 · {profile.gender || ''}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: '#c8783c' }}>
                  오늘도 좋은 기운 가득하세요 ✦
                </div>
              </div>
            </div>
            <button
              onClick={() => router.push('/manseryeok')}
              style={{
                width: '100%', height: '44px',
                background: '#b46e46', border: 'none', borderRadius: '10px',
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
              border: cat === c ? '1.5px solid #b46e46' : '0.5px solid #e8d5c5',
              background: cat === c ? '#b46e46' : '#FFFBF7',
              color: cat === c ? '#fff' : '#a58575',
              fontSize: '12px', fontWeight: cat === c ? 600 : 400,
              cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0,
            }}>{c}</button>
          ))}
        </div>

        {/* ⑤ 12지신 서비스 그리드 */}
        <div style={{ padding: '6px 16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#3a2e28' }}>명연재 서비스</span>
            <span style={{ fontSize: '11px', color: '#c8783c' }}>12지신과 함께 ✦</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {SERVICES.map((s, idx) => {
              // 매일 이미지가 한 칸씩 돌게 (offset)
              const imgIdx = (idx + offset) % ZODIAC_IMAGES.length
              const nameLen = s.name.length
              const fontSize = nameLen === 2 ? '30px' : nameLen === 3 ? '24px' : nameLen === 4 ? '21px' : '18px'
              return (
                <div
                  key={s.name}
                  onClick={() => router.push(s.href)}
                  className="zodiac-card"
                  style={{
                    position: 'relative', aspectRatio: '1 / 1',
                    borderRadius: '18px', overflow: 'hidden',
                    cursor: 'pointer',
                    // 입체 그림자 (떠 있는 느낌)
                    boxShadow: '0 6px 16px rgba(180,110,70,0.18), 0 2px 4px rgba(180,110,70,0.10)',
                    // 각 카드마다 둥실 타이밍 다르게
                    animation: `floaty 3.2s ease-in-out ${(idx % 6) * 0.4}s infinite`,
                  }}
                >
                  {/* 지신 이미지 */}
                  <img src={ZODIAC_IMAGES[imgIdx]} alt={s.name} style={{
                    width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                  }} />
                  {/* 도톰한 글씨 (위쪽) */}
                  <div style={{
                    position: 'absolute', top: '16px', left: 0, right: 0,
                    textAlign: 'center', fontSize, fontWeight: 900, color: s.color,
                    textShadow: '2px 2px 0 #fff, -2px 2px 0 #fff, 2px -2px 0 #fff, -2px -2px 0 #fff, 0 3px 6px rgba(0,0,0,0.12)',
                    letterSpacing: '-0.5px',
                  }}>{s.name}</div>
                </div>
              )
            })}
          </div>
        </div>
      </main>

      {/* 눌림 + 둥실 애니메이션 */}
      <style>{`
        @keyframes floaty {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .zodiac-card:active {
          transform: scale(0.94) !important;
          animation-play-state: paused !important;
          box-shadow: 0 2px 6px rgba(180,110,70,0.15) !important;
          transition: transform 0.1s ease, box-shadow 0.1s ease;
        }
        .zodiac-card {
          transition: transform 0.15s ease, box-shadow 0.2s ease;
        }
      `}</style>

      {/* 하단 고정 네비게이션 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        display: 'flex', background: '#FFFBF7',
        borderTop: '0.5px solid #f0e0d5', zIndex: 20,
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
            <span style={{ fontSize: '10px', color: n.active ? '#c8783c' : '#c5a590', fontWeight: n.active ? 600 : 400 }}>
              {n.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
