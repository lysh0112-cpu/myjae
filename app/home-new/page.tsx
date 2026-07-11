'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'

// ── 사람 선택 모달을 여는 서비스 설정 ──
// 사주 + 대운 + 세운(연월운세) 연결. 셋 다 같은 흐름:
//   버튼 → 사람 선택 → result-new (사주는 그냥, 대운/세운은 ?unse=로 진입)
interface PickConfig {
  serviceLabel: string
  headline: string
  serviceType: string
  submitLabel: string
  resultPath: string   // 사람 선택 후 이동할 결과 화면
  unse?: 'daeun' | 'seyun'   // 시간운 진입이면 지정. 없으면 사주.
}
const PICK_CONFIG: Record<string, PickConfig> = {
  // 사주·대운·연월운세·내사주그림 모두 보관함을 관문으로 삼는다.
  //   홈 버튼 → 보관함 → [새로 보기]에서 사람 선택. (궁합과 같은 흐름)
  //   → PICK_CONFIG는 현재 비어 있음. (직접 사람 선택 모달을 여는 서비스가 없음)
}

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
    href: '/manseryeok/couple-storage?mode=couple',
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
  { name: '사주',       color: '#6e50a0', href: '/manseryeok/saju-storage?service=saju', cat: '사주명리' },
  { name: '내사주그림', color: '#b46e46', href: '/manseryeok/mulsang-storage', cat: '사주명리' },
  { name: '대운',       color: '#3c82a0', href: '/manseryeok/saju-storage?service=daeun', cat: '사주명리' },
  { name: '연월운세', color: '#8c783c', href: '/manseryeok/saju-storage?service=seyun', cat: '사주명리' },
  { name: '연인궁합',   color: '#c85a8c', href: '/manseryeok/couple-storage?mode=couple', cat: '궁합' },
  { name: '부부궁합',   color: '#c85a6e', href: '/manseryeok/couple-storage?mode=married', cat: '궁합' },
  { name: '결혼택일',   color: '#96643c', href: '/manseryeok/wedding-timing/wedding-storage', cat: '택일' },
  { name: '출산택일',   color: '#b45a78', href: '/manseryeok/birth-timing/birth-storage', cat: '택일' },
  { name: '내이름개명', color: '#5a825a', href: '/manseryeok/naming/diagnosis', cat: '개명' },
  { name: '아기이름 짓기',   color: '#967850', href: '/manseryeok/naming/rename/newborn', cat: '개명' },
  { name: '타로',       color: '#b45a78', href: '/tarot', cat: '기타' },
  { name: '물어보살',   color: '#785aaa', href: '/manseryeok/ai-chat', cat: '기타' },
]

const CATS = ['메뉴판', '사주명리', '궁합', '택일', '개명', '기타']

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
  const [cat, setCat] = useState('메뉴판')
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  // 사람 선택 모달: 어떤 서비스로 열렸는지 (null이면 닫힘)
  const [pickService, setPickService] = useState<string | null>(null)
  const [offset, setOffset] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { setOffset(dayOffset()) }, [])

  useEffect(() => {
    let mounted = true
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { if (mounted) setIsLoggedIn(false); return }
      if (mounted) setIsLoggedIn(true)
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

      <style>{`
        @keyframes mcCupSway { 0%,100% { transform: rotate(-2deg); } 50% { transform: rotate(2deg); } }
        @keyframes mcSteamA { 0% { opacity:0; transform:translateY(0) scaleX(1);} 15%{opacity:0.6;} 50%{opacity:0.4; transform:translateY(-9px) scaleX(1.3);} 100%{opacity:0; transform:translateY(-18px) scaleX(0.8);} }
        @keyframes mcSteamB { 0% { opacity:0; transform:translateY(0) scaleX(1);} 20%{opacity:0.5;} 55%{opacity:0.3; transform:translateY(-10px) scaleX(1.4);} 100%{opacity:0; transform:translateY(-20px) scaleX(0.7);} }
        .mc-cup { animation: mcCupSway 3.5s ease-in-out infinite; transform-origin: bottom center; }
        .mc-steam-a { animation: mcSteamA 2.8s ease-out infinite; }
        .mc-steam-b { animation: mcSteamB 2.8s ease-out infinite 0.9s; }
        .mc-steam-c { animation: mcSteamA 2.8s ease-out infinite 1.6s; }
      `}</style>

      {/* ① 네비게이션 */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 18px', background: '#FFFBF7',
        borderBottom: '0.5px solid #f0e0d5',
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="30" height="34" viewBox="0 0 46 50" style={{ overflow: 'visible' }}>
            <g>
              <path className="mc-steam-a" d="M16 14 q-3 -5 0 -10 q3 -5 0 -10" stroke="#c8a890" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,2)" />
              <path className="mc-steam-b" d="M23 13 q-3 -5 0 -10 q3 -5 0 -10" stroke="#c8a890" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,2)" />
              <path className="mc-steam-c" d="M30 14 q-3 -5 0 -10 q3 -5 0 -10" stroke="#c8a890" strokeWidth="2" fill="none" strokeLinecap="round" transform="translate(0,2)" />
            </g>
            <g className="mc-cup">
              <path d="M8 20 L38 20 L36 40 Q35 45 30 45 L16 45 Q11 45 10 40 Z" fill="#b46e46" />
              <path d="M8 20 L38 20 L37.5 24 L8.5 24 Z" fill="#c8783c" />
              <path d="M38 24 Q45 24 45 30 Q45 36 38 36 L37 32 Q41 32 41 30 Q41 28 37.5 28 Z" fill="#b46e46" />
              <ellipse cx="23" cy="21" rx="14" ry="2.5" fill="#96502e" />
            </g>
          </svg>
          <span style={{ fontSize: '18px', fontWeight: 900, fontStyle: 'italic' }}>
            <span style={{ color: '#96502e' }}>Myung</span><span style={{ color: '#b46e46' }}>Cafe</span>
          </span>
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
            {isLoggedIn ? (
              <>
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
                  onClick={() => router.push('/mypage-new')}
                  onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)' }}
                  onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                  onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
                  style={{
                    width: '100%', height: '44px',
                    background: '#b46e46', border: 'none', borderRadius: '10px',
                    color: '#fff', fontSize: '13.5px', fontWeight: 800, cursor: 'pointer',
                    fontFamily: "var(--font-geist-sans), 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
                    letterSpacing: '0.02em',
                    transition: 'transform 0.12s ease', transform: 'scale(1)',
                    WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                  }}
                >나의 운명 아카이브 바로가기 →</button>
              </>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: '#f5ebe2', border: '1.5px solid #e6d5c5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', flexShrink: 0, color: '#c0a898',
                  }}>👤</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '3px', color: '#3a2e28' }}>
                      반가워요! ✦
                    </div>
                    <div style={{ fontSize: '11px', color: '#c8783c' }}>
                      로그인하고 내 사주를 확인하세요
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => router.push('/login')}
                    style={{
                      flex: 1, height: '44px',
                      background: '#b46e46', border: 'none', borderRadius: '10px',
                      color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >로그인</button>
                  <button
                    onClick={() => router.push('/signup')}
                    style={{
                      flex: 1, height: '44px',
                      background: '#fff', border: '0.5px solid #e6d0bc', borderRadius: '10px',
                      color: '#96502e', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                    }}
                  >회원가입</button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ④ 카테고리 탭 */}
        <div style={{
          display: 'flex', gap: '8px', padding: '16px 16px 10px',
          overflowX: 'auto' as const, scrollbarWidth: 'none' as const,
        }}>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              onPointerDown={(e) => { e.currentTarget.style.transform = 'scale(0.92)' }}
              onPointerUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              onPointerLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
              style={{
              padding: '6px 16px', borderRadius: '18px',
              border: cat === c ? '1.5px solid #b46e46' : '0.5px solid #e8d5c5',
              background: cat === c ? '#b46e46' : '#FFFBF7',
              color: cat === c ? '#fff' : '#a58575',
              fontSize: '12px', fontWeight: cat === c ? 600 : 400,
              cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0,
              transition: 'transform 0.1s ease',
            }}>{c}</button>
          ))}
        </div>

        {/* ⑤ 12지신 서비스 그리드 */}
        <div style={{ padding: '6px 16px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#3a2e28' }}>MyungCafe 서비스</span>
            <span style={{ fontSize: '11px', color: '#c8783c' }}>12지신과 함께 ✦</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {SERVICES.filter(s => cat === '메뉴판' || s.cat === cat).map((s, idx) => {
              // 매일 이미지가 한 칸씩 돌게 (offset)
              const imgIdx = (idx + offset) % ZODIAC_IMAGES.length
              const nameLen = s.name.length
              const fontSize = nameLen === 2 ? '30px' : nameLen === 3 ? '24px' : nameLen === 4 ? '21px' : '18px'
              return (
                <div
                  key={s.name}
                  onClick={() => {
                    if (PICK_CONFIG[s.name]) setPickService(s.name)
                    else router.push(s.href)
                  }}
                  className="zodiac-card"
                  style={{
                    position: 'relative', aspectRatio: '1 / 1',
                    borderRadius: '18px', overflow: 'hidden',
                    cursor: 'pointer',
                    // 카테고리 탭과 동일한 테두리 (연한 살구색 가는 선)
                    border: '0.5px solid #e8d5c5',
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

      {/* 사람 선택 모달 (공용) */}
      {pickService && PICK_CONFIG[pickService] && (() => {
        const cfg = PICK_CONFIG[pickService]
        const unseQS = cfg.unse ? `unse=${cfg.unse}` : ''
        return (
          <PersonPickerModal
            open={true}
            serviceLabel={cfg.serviceLabel}
            headline={cfg.headline}
            serviceType={cfg.serviceType}
            submitLabel={cfg.submitLabel}
            onPick={(person: SavedPerson) => {
              const q = toResultQuery(person)
              router.push(`${cfg.resultPath}?${q}${unseQS ? `&${unseQS}` : ''}`)
            }}
            onPickMe={() => {
              // "나" → 생년월일 URL 없이 이동 → result-new가 profiles(내 정보)를 띄움.
              //   시간운이면 unse만 붙인다.
              router.push(unseQS ? `${cfg.resultPath}?${unseQS}` : cfg.resultPath)
            }}
            onClose={() => setPickService(null)}
          />
        )
      })()}
    </div>
  )
}
