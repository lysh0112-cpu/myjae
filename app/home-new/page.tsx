'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'
// 커플채팅 플로팅은 당분간 닫음 (기능은 살아있음. 되살리려면 아래 2줄의 주석만 풀면 됨)
// import CoupleChatFab from '@/app/couple-chat/CoupleChatFab'
import AiTalkFab from '@/app/manseryeok/components/AiTalkFab'
import TodayFortuneCard from '@/app/manseryeok/components/TodayFortuneCard'
import EmotionPicker from '@/app/manseryeok/components/EmotionPicker'
import UserCard from '@/app/manseryeok/components/UserCard'
import InviteNotifier from '@/app/couple-chat/InviteNotifier'
import { listPinnedServices, togglePinnedService, MAX_PINS } from '@/lib/saju/pinnedServices'
import HomeBottomSheet from '@/app/home-new/components/HomeBottomSheet'

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

// ── [보관] 예전 그라데이션 배너 (지우지 말 것. 원복 필요 시 아래 SLIDES를 이걸로 교체) ──
const SLIDES_OLD = [
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
    href: '/manseryeok/couple-storage',
  },
]

// ── 슬라이드 배너 (우주·별자리 이미지 5장) ──
//   배경 이미지는 public/banner/slideN.jpg. 문구는 코드에서 왼쪽에 얹는다.
//   img=이미지 경로 / (video 필드에 mp4 경로를 넣으면 영상으로도 재생됨 — 나중에 확장용)
//   sparkles=별 반짝임 색(장별 포인트). accent=태그·강조 글자색.
const SLIDES = [
  {
    tag: '오늘의 명카페', title: '운명의 지도를 아는 자\n내 삶의 주인공이고,\n운명의 지도를 모르는 자\n내 삶의 조연이다',
    sub: '', link: '지금 무료로 시작 →',
    img: '/banner/slide1.jpg', video: '',
    accent: '#ffd97a', sub2: '#c3b49a',
    sparkles: ['#ffe6a0', '#ffd97a', '#fff'],
    href: '/home-new',
  },
  {
    tag: '가격 강점', title: '비싼 상담,\n꼭 필요할까요?',
    sub: '20만원짜리 대면 상담보다\n정확하고 세밀하게', link: '지금 확인 →',
    img: '/banner/slide2.jpg', video: '',
    accent: '#ffd27a', sub2: '#e8ddc8',
    sparkles: ['#ffe6a0', '#ffd27a', '#fff'],
    href: '/home-new',
  },
  {
    tag: '내사주그림', title: '어려운 내 사주,\n한 장의 그림으로',
    sub: '어려운 사주가 한눈에 들어와요', link: '그림 보러가기 →',
    img: '/banner/slide3.jpg', video: '',
    accent: '#ffd97a', sub2: '#e8ddc8',
    sparkles: ['#ff6a4a', '#ffd23a', '#4a9aff', '#5ad07a', '#fff'],
    href: '/manseryeok/mulsang-storage',
  },
  {
    tag: '커플 채팅', title: '연인과 함께,\nAI 조언까지',
    sub: '우리 사주를 아는 커플 채팅,\n명카페에서만', link: '궁합 보러가기 →',
    img: '/banner/slide4.jpg', video: '',
    accent: '#ffc0d8', sub2: '#f0d5e0',
    sparkles: ['#ffb0d0', '#ffd97a', '#fff'],
    href: '/manseryeok/couple-storage',
  },
  {
    tag: '한 곳에서', title: '사주 한 잔\n하고 갈래요?',
    sub: '사주·궁합·이름·택일,\n필요한 만큼만', link: '지금 시작하기 →',
    img: '/banner/slide5.jpg', video: '',
    accent: '#ffe0a0', sub2: '#e8ddc8',
    sparkles: ['#ffe0a0', '#fff', '#ffd97a'],
    href: '/home-new',
  },
  {
    tag: 'AI 타로 마스터', title: '남이 봐주는 타로는 이제 그만',
    sub: '내 손으로 뽑고,\nAI가 정확하게 읽어줘요', link: '타로 보러가기 →',
    img: '/banner/slide6.jpg', video: '',
    accent: '#d8b4ff', sub2: '#e8dcf5',
    sparkles: ['#d8b4ff', '#ffd97a', '#fff'],
    href: '/tarot',
  },
  {
    tag: '감정 기록부', title: '명리로 보는 나,\n감정으로 쓰는 나',
    sub: '사주와 마음이 함께 쌓여요', link: '기록하러 가기 →',
    img: '/banner/slide7.jpg', video: '',
    accent: '#ffc9a0', sub2: '#f0e0d5',
    sparkles: ['#ffc9a0', '#ffd97a', '#fff'],
    href: '/mypage-new',
  },
]


// ── 12 서비스 (연재쌤 지정 순서) ──
//   color·href·cat 은 기존 그대로 (연결은 하나도 안 바뀜).
//   sub  = 리스트 한 줄 설명
//   bg   = 아이콘 파스텔 배경
//   icon = SVG 내부 요소 (stroke=color 로 그려짐)
const SERVICES = [
  { name: '사주',       color: '#6e50a0', bg: '#efe6f7', href: '/manseryeok/saju-storage?service=saju', cat: '사주명리', sub: '내 팔자 풀이', emoji: '🐭' },
  { name: '내사주그림', color: '#b46e46', bg: '#f5e9df', href: '/manseryeok/mulsang-storage', cat: '사주명리', sub: '사주를 그림으로', emoji: '🐮' },
  { name: '대운',       color: '#3c82a0', bg: '#e2eef2', href: '/manseryeok/saju-storage?service=daeun', cat: '사주명리', sub: '10년 큰 흐름', emoji: '🐯' },
  { name: '연월운세', color: '#8c783c', bg: '#f0ebe0', href: '/manseryeok/saju-storage?service=seyun', cat: '사주명리', sub: '올해·이달 운세', emoji: '🐰' },
  // ★2026-07-24 — 연인궁합·부부궁합을 하나로 합쳤다. (연재쌤 지시)
  //   심산 궁합론은 아내와 애인을 구분하지 않고 같은 재성으로 본다.
  //   판정 산식(coupleFilterV1)도 원래 관계를 가리지 않는다.
  //   부부/연인 구분은 '사람 추가'에서 고른 관계로 자동 판별한다.
  { name: '궁합',       color: '#c85a6e', bg: '#f7e5e8', href: '/manseryeok/couple-storage', cat: '궁합', sub: '두 사람의 결', emoji: '🐲' },
  // ★2026-07-24 — 연인궁합 자리를 합격운/취업운으로 바꿨다. (아직 준비 중)
  { name: '합격운/취업운', color: '#c85a8c', bg: '#f7e6ee', href: '/manseryeok/exam-luck', cat: '기타', sub: '시험과 일자리', emoji: '🐍' },
  { name: '결혼택일',   color: '#96643c', bg: '#f0e8df', href: '/manseryeok/wedding-timing/wedding-storage', cat: '택일', sub: '좋은 날 잡기', emoji: '🐴' },
  { name: '출산택일',   color: '#b45a78', bg: '#f6e5eb', href: '/manseryeok/birth-timing/birth-storage', cat: '택일', sub: '아기 맞을 날', emoji: '🐑' },
  { name: '이사택일',   color: '#967850', bg: '#f0eae0', href: '/manseryeok/moving-timing/moving-storage', cat: '택일', sub: '좋은 이사 날', emoji: '🐔' },
  { name: '내이름 감정', color: '#5a825a', bg: '#eaf0e6', href: '/manseryeok/naming/diagnosis/storage', cat: '개명', sub: '이름 풀이해 보기', emoji: '🐵' },
  { name: '타로',       color: '#b45a78', bg: '#f6e5eb', href: '/tarot', cat: '기타', sub: '오늘의 카드', emoji: '🐶' },
  { name: '물어보살',   color: '#785aaa', bg: '#efeaf7', href: '/manseryeok/ai-chat', cat: '기타', sub: 'AI에게 묻기', emoji: '🐷' },
]
type Service = typeof SERVICES[number]

// 서비스 리스트를 접었을 때 보이는 줄 수 (핀이 맨 위로 오므로 핀 3개 + 1개가 보임)
const COLLAPSED_COUNT = 4


export default function HomeNew() {
  const router = useRouter()
  const [slide, setSlide] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  // 사람 선택 모달: 어떤 서비스로 열렸는지 (null이면 닫힘)
  const [pickService, setPickService] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string[]>([])      // 찜한 서비스 이름들 (찜한 순서)
  const [svcOpen, setSvcOpen] = useState(false)           // 서비스 리스트 펼침 여부
  const [pinMsg, setPinMsg] = useState('')                // 압핀 안내 메시지
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)


  // 찜(고정)한 서비스 목록 로드 (로그인 회원만 값이 있음)
  useEffect(() => {
    let mounted = true
    listPinnedServices().then((list) => { if (mounted) setPinned(list) })
    return () => { mounted = false }
  }, [])

  // 압핀 토글 핸들러
  async function handleTogglePin(name: string) {
    const res = await togglePinnedService(name)
    if (!res.ok) {
      if (res.reason === 'guest') { setPinMsg('로그인 후 이용할 수 있어요'); }
      else if (res.reason === 'max') { setPinMsg(`📌 최대 ${MAX_PINS}개까지 고정할 수 있어요`); }
      else { setPinMsg('잠시 후 다시 시도해 주세요'); }
      setTimeout(() => setPinMsg(''), 1800)
      return
    }
    setPinned((prev) => res.pinned ? [...prev, name] : prev.filter((n) => n !== name))
  }

  // 로그인 여부만 확인 (프로필 내용은 UserCard 부품이 직접 읽는다)
  useEffect(() => {
    let mounted = true
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (mounted) setIsLoggedIn(!!user)
    })
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSlide(s => (s + 1) % SLIDES.length)
    }, 5000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  return (
    <div style={{
      minHeight: '100vh', background: '#FDF6F0',
      maxWidth: '430px', margin: '0 auto',
      fontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
      color: '#3a2e28', paddingBottom: '70px',
    }}>

      <style>{`
        @keyframes zfloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
        .zodiacEmoji { display: inline-block; animation: zfloat 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .zodiacEmoji { animation: none; } }
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
          <span
            onClick={() => router.push('/mypage-new')}
            role="button"
            aria-label="마이페이지"
            style={{ cursor: 'pointer' }}
          >☰</span>
        </div>
      </div>

      <main>
        {/* 배너 별 반짝임 애니메이션 */}
        <style>{`
          @keyframes bnrTwinkle {
            0%, 100% { opacity: 0.35; transform: scale(0.8); }
            50% { opacity: 1; transform: scale(1.25); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-bnr-spk] { animation: none !important; }
          }
        `}</style>
        {/* ② 슬라이드 배너 */}
        <div style={{ padding: '14px 16px 0' }}>
          <div
            onClick={() => { if (!isLoggedIn) router.push('/signup') }}
            style={{
              position: 'relative', borderRadius: '18px', overflow: 'hidden',
              minHeight: '175px', height: '175px', cursor: isLoggedIn ? 'default' : 'pointer',
              background: '#0a0a1a',
            }}
          >
            {/* 배경: 이미지 또는 영상 (5장이 교차 페이드) */}
            {SLIDES.map((s, i) => (
              <div key={i} style={{
                position: 'absolute', inset: 0,
                opacity: i === slide ? 1 : 0,
                transition: 'opacity 0.8s ease',
                zIndex: 0,
              }}>
                {s.video ? (
                  <video
                    src={s.video} autoPlay loop muted playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
              </div>
            ))}

            {/* 별 반짝임 (현재 장의 sparkle 색으로) */}
            {(SLIDES[slide].sparkles || []).map((c, i) => (
              <span key={`${slide}-${i}`} data-bnr-spk="1" style={{
                position: 'absolute', zIndex: 1, borderRadius: '50%',
                width: `${10 + (i % 3) * 3}px`, height: `${10 + (i % 3) * 3}px`,
                left: `${58 + (i * 9) % 34}%`, top: `${20 + (i * 13) % 46}%`,
                background: `radial-gradient(circle, #fff 0%, ${c} 42%, transparent 72%)`,
                animation: `bnrTwinkle ${2.3 + (i % 4) * 0.3}s ease-in-out ${(i * 0.35).toFixed(2)}s infinite`,
                pointerEvents: 'none',
              }} />
            ))}

            {/* 왼쪽 어두운 막 (글자 가독성) */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2,
              background: 'linear-gradient(90deg, rgba(8,8,20,0.82) 0%, rgba(8,8,20,0.42) 55%, rgba(8,8,20,0) 100%)',
            }} />

            {/* 카피 (왼쪽 세로 중앙) */}
            <div style={{
              position: 'absolute', left: '20px', top: '50%', transform: 'translateY(-50%)',
              zIndex: 3, maxWidth: '65%',
              textShadow: '0 1px 6px rgba(0,0,0,0.85)',
            }}>
              <div style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: '20px',
                background: 'rgba(255,255,255,0.15)', fontSize: '10px', fontWeight: 600,
                color: SLIDES[slide].accent, marginBottom: '8px',
              }}>{SLIDES[slide].tag}</div>
              <div style={{
                fontSize: '16px', fontWeight: 600, lineHeight: 1.5,
                color: '#fff', whiteSpace: 'pre-line',
              }}>{SLIDES[slide].title}</div>
              {SLIDES[slide].sub ? (
                <div style={{
                  fontSize: '11px', lineHeight: 1.5, marginTop: '6px',
                  color: SLIDES[slide].sub2, whiteSpace: 'pre-line',
                }}>{SLIDES[slide].sub}</div>
              ) : null}
              {!isLoggedIn ? (
                <div style={{
                  display: 'inline-block', marginTop: '12px', padding: '7px 16px',
                  borderRadius: '16px', background: 'rgba(255,255,255,0.92)',
                  fontSize: '12px', fontWeight: 600, color: '#1a1a2e',
                }}>가입하러 가기 →</div>
              ) : null}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', padding: '10px 0 4px' }}>
            {SLIDES.map((_, i) => (
              <div key={i} onClick={() => setSlide(i)} style={{
                width: i === slide ? '18px' : '6px', height: '6px', borderRadius: '3px',
                background: i === slide ? '#c8783c' : '#e0cdbd', cursor: 'pointer', transition: 'all 0.3s',
              }} />
            ))}
          </div>
        </div>

        {/* ③ 유저 카드 (공용 부품 — 아래에 '내 사주 자세히 보기' 버튼을 붙여 씀) */}
        <div style={{ padding: '8px 16px 0' }}>
          <UserCard
            footer={({ hasSaju, sajuDetailUrl }) => (
              <button
                onClick={() => router.push(sajuDetailUrl)}
                style={{
                  width: '100%', background: '#fffdfb', border: 'none',
                  padding: '12px 14px', fontSize: '12px', color: '#96502e',
                  fontWeight: 600, cursor: 'pointer',
                }}
              >{hasSaju ? '내 사주 자세히 보기 →' : '내 사주 등록하기 →'}</button>
            )}
          />
        </div>

        {/* ═══ 바텀시트: 운세 + 서비스 + 감정기록 (손잡이로 위로 끌면 배너를 덮으며 올라옴) ═══ */}
        <HomeBottomSheet maxLift={320}>

        {/* ④ 오늘의 운세 (공용 부품 — 프로필 조회·계산·AI호출 전부 부품 안에서) */}
        <div style={{ padding: '4px 16px 0' }}>
          <TodayFortuneCard />
        </div>

        {/* ⑤ 서비스 리스트 (아이콘 + 이름 + 설명 + 📌압핀 / 하단 접기)
            - 압핀: 찜하면 리스트 맨 위로 정렬, 최대 MAX_PINS개 (회원만, 비회원은 로그인 안내)
            - 접기: 처음 COLLAPSED_COUNT개만 → [전체 N개 보기]로 펼침 */}
        <div style={{ padding: '6px 0 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', padding: '0 16px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#3a2e28' }}>MyungCafe 서비스</span>
            {pinned.length > 0 && (
              <span style={{ fontSize: '11px', color: '#8f3d0e' }}>📌 {pinned.length}/{MAX_PINS}</span>
            )}
          </div>

          {/* 압핀 안내 메시지 */}
          {pinMsg && (
            <div style={{ textAlign: 'center', fontSize: '12px', color: '#c85a6e', marginBottom: '8px' }}>{pinMsg}</div>
          )}

          {(() => {
            // 찜한 것(찜한 순서) 먼저, 나머지는 원래 순서
            const pinnedList = pinned
              .map(nm => SERVICES.find(s => s.name === nm))
              .filter((s): s is Service => !!s)
            const rest = SERVICES.filter(s => !pinned.includes(s.name))
            const full = [...pinnedList, ...rest]
            const shown = svcOpen ? full : full.slice(0, COLLAPSED_COUNT)
            return (
              <div>
                {shown.map((s, idx) => {
                  const isPinned = pinned.includes(s.name)
                  const isLastPinned = idx === pinnedList.length - 1 && pinnedList.length > 0
                  return (
                    <div key={s.name}>
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', gap: '13px', padding: '11px 16px',
                          background: isPinned ? '#fdf0e4' : 'transparent',
                        }}
                      >
                        <div
                          onClick={() => { if (PICK_CONFIG[s.name]) setPickService(s.name); else router.push(s.href) }}
                          style={{
                            width: '46px', height: '46px', borderRadius: '14px', flexShrink: 0,
                            background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          }}
                        >
                          <span className="zodiacEmoji" style={{ fontSize: '32px', lineHeight: 1, animationDelay: `${(idx * 0.18).toFixed(2)}s` }}>{s.emoji}</span>
                        </div>
                        <div
                          onClick={() => { if (PICK_CONFIG[s.name]) setPickService(s.name); else router.push(s.href) }}
                          style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px', cursor: 'pointer' }}
                        >
                          <span style={{ fontSize: '14.5px', color: '#3a2e28', fontWeight: 700 }}>{s.name}</span>
                          <span style={{ fontSize: '11px', color: '#5c3a1e' }}>{s.sub}</span>
                        </div>
                        <button
                          onClick={() => handleTogglePin(s.name)}
                          aria-label={isPinned ? '고정 해제' : '고정'}
                          style={{
                            width: '34px', height: '34px', border: 'none', background: 'none', cursor: 'pointer',
                            fontSize: '17px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            filter: isPinned ? 'none' : 'grayscale(1)', opacity: isPinned ? 1 : 0.32,
                            transform: isPinned ? 'scale(1.05)' : 'none', transition: 'all 0.12s',
                          }}
                        >📌</button>
                      </div>
                      {/* 구분선: 찜 끝나는 지점은 진하게, 나머지는 옅게 */}
                      {idx < shown.length - 1 && (
                        <div style={{
                          height: '0.5px',
                          background: isLastPinned ? '#e8c9ad' : '#f0e2d5',
                          margin: isLastPinned ? '4px 16px' : '0 16px 0 75px',
                        }} />
                      )}
                    </div>
                  )
                })}

                {/* 접기 / 전체보기 버튼 */}
                <div style={{ padding: '10px 16px 0' }}>
                  <button
                    onClick={() => setSvcOpen(o => !o)}
                    style={{
                      width: '100%', background: '#FFFBF7', border: '0.5px solid #e8d5c5', borderRadius: '12px',
                      padding: '11px', fontSize: '13px', color: '#5c3a1e', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {svcOpen ? '접기 ▲' : `전체 ${SERVICES.length}개 보기 ▼`}
                  </button>
                </div>
              </div>
            )
          })()}
        </div>

        {/* ⑥ 감정 기록부 (공용 부품 — props 없음) */}
        <div style={{ padding: '0 16px 12px' }}>
          <EmotionPicker />
        </div>

        {/* ⑦ 전문가용 만세력 계산기 (서비스 12개와 성격이 달라 별도 카드) */}
        <div style={{ padding: '0 16px 20px' }}>
          <div
            onClick={() => router.push('/manseryeok/expert')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '13px 12px',
              background: '#FFFBF7', border: '0.5px solid #f0e0d5', borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: 13, color: '#5a4a3e' }}>🔎 전문가용 만세력 계산기</span>
          </div>
        </div>

        {/* ═══ 바텀시트 끝 ═══ */}
        </HomeBottomSheet>
      </main>

      {/* 하단 고정 네비게이션 */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: '430px',
        display: 'flex', background: '#FFFBF7',
        borderTop: '0.5px solid #f0e0d5', zIndex: 20,
      }}>
        {[
          { icon: '🏠', label: '홈', href: '/home-new', active: true },
          { icon: '⊞', label: '서비스', href: '', wip: true, active: false },
          { icon: '💬', label: '상담', href: '/manseryeok/reviews', active: false },
          { icon: '📚', label: '보관함', href: '/archive', active: false },
        ].map((n) => (
          <button
            key={n.label}
            onClick={() => { if (n.wip) { alert('작업 중이에요. 곧 만나요!') } else { router.push(n.href) } }}
            style={{
              flex: 1, padding: '10px 0', background: 'none', border: 'none',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: '3px',
            }}
          >
            <span style={{ fontSize: '18px' }}>{n.icon}</span>
            <span style={{ fontSize: '10px', color: n.active ? '#c8783c' : '#b09079', fontWeight: n.active ? 600 : 400 }}>
              {n.label}
            </span>
            {/* 현재 위치 표시 — 아이콘을 흐리게 하는 대신 밑줄로 */}
            <span style={{ height: '2px', width: '22px', borderRadius: '2px', background: n.active ? '#c8783c' : 'transparent' }} />
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

      {/* <CoupleChatFab /> */}
      <AiTalkFab />
      <InviteNotifier />
    </div>
  )
}

