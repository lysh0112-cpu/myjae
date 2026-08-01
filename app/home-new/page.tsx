'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import PersonPickerModal from '@/app/manseryeok/components/PersonPickerModal'
import { toResultQuery, type SavedPerson } from '@/lib/saju/savedPeople'
// ★2026-07-27 — 커플채팅(CoupleChatFab · InviteNotifier) 제거. 테스트였으므로 전부 삭제.
//   ⚠️ 상담사–고객 채팅은 별개이며 살아 있다. 함께 지우지 말 것.
import AiTalkFab from '@/app/manseryeok/components/AiTalkFab'
import TodayFortuneCard from '@/app/manseryeok/components/TodayFortuneCard'
import EmotionPicker from '@/app/manseryeok/components/EmotionPicker'
import UserCard from '@/app/manseryeok/components/UserCard'
import { listPinnedServices, togglePinnedService, MAX_PINS } from '@/lib/saju/pinnedServices'
import HomeBottomSheet from '@/app/home-new/components/HomeBottomSheet'
import ServiceSection from '@/app/home-new/components/ServiceSection'

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
// ── 10 서비스 ──
//   ★2026-07-29 — 12지신 동물 이모지를 **전면 제거**했습니다. (대표님 지시)
//     [왜] 띠 동물 매핑이 올드한 명리 앱 느낌을 만들고 있었습니다.
//          토스·애플 같은 산뜻한 결로 갑니다.
//     ⚠️ 앞서 "12지신은 앱의 정체성"이라 판단해 지켰던 것을 대표님 지시로 뒤집었습니다.
//        되살리시려면 이 표의 icon 만 옛 동물로 되돌리면 됩니다. 다른 코드는 안 봐도 됩니다.
//
//   icon = 3D 결의 이모지 · grad = [시작색, 끝색] 타일 그라데이션
//   ⚠️ color·bg 는 그대로 둡니다. 다른 화면(보관함 배지 등)이 아직 씁니다.
//   ⚠️ 그라데이션 색은 Tailwind 이름과 짝을 맞춘 실제 hex 입니다.
//      이 파일은 인라인 스타일로 되어 있어 클래스를 섞지 않았습니다.
const SERVICES = [
  // 🔮 통합 리포트 — 은은한 후광 (indigo-500 → violet-400)
  { name: '내 사주 & 운세', color: '#6e50a0', bg: '#efe6f7', href: '/manseryeok/saju-storage', cat: '사주명리', sub: '원국·10년 흐름·올해를 한 번에', icon: '🔮', grad: ['#6366f1', '#a78bfa'] },
  // 🎨 BEST — rose-400 → amber-300
  { name: '내사주그림', color: '#b46e46', bg: '#f5e9df', href: '/manseryeok/mulsang-storage', cat: '사주명리', sub: '사주를 그림으로', icon: '🎨', grad: ['#fb7185', '#fcd34d'] },
  // 💖 rose-400 → pink-300
  { name: '궁합',       color: '#c85a6e', bg: '#f7e5e8', href: '/manseryeok/couple-storage', cat: '궁합', sub: '두 사람의 결', icon: '💖', grad: ['#fb7185', '#f9a8d4'] },
  // 🎯 emerald-400 → teal-300
  { name: '합격운/취업운', color: '#c85a8c', bg: '#f7e6ee', href: '/manseryeok/exam-luck', cat: '기타', sub: '시험과 일자리', icon: '🎯', grad: ['#34d399', '#5eead4'] },
  // ★택일 셋은 지시에 없어 제가 골랐습니다. 바꾸실 자리입니다.
  { name: '결혼택일',   color: '#96643c', bg: '#f0e8df', href: '/manseryeok/wedding-timing/wedding-storage', cat: '택일', sub: '좋은 날 잡기', icon: '💍', grad: ['#fbbf24', '#fda4af'] },
  { name: '출산택일',   color: '#b45a78', bg: '#f6e5eb', href: '/manseryeok/birth-timing/birth-storage', cat: '택일', sub: '아기 맞을 날', icon: '🍼', grad: ['#f9a8d4', '#fed7aa'] },
  { name: '이사택일',   color: '#967850', bg: '#f0eae0', href: '/manseryeok/moving-timing/moving-storage', cat: '택일', sub: '좋은 이사 날', icon: '🏡', grad: ['#a3e635', '#6ee7b7'] },
  // 📇 sky-400 → cyan-300
  // ★2026-08-01 (43부 2차) — mode 를 실어 보냅니다.
  //   ⚠️ 두 카드가 «같은 보관함» 으로 들어와, 버튼을 가른 뜻이 도로 뭉개졌습니다.
  //      이제 입구마다 «전용 화면» 이 뜹니다.
  //   ★2026-08-01 (43부 4차) — 폴더 밖 «낱장 카드» 로 나왔습니다.
  //     sub 도 「이름 풀이해 보기」 → 「내 이름 풀이 및 개명」 으로 (대표님 지시).
  //     ⚠️ 낱장 카드의 한 줄은 ServiceSection 의 SOLO_COPY 가 «먼저» 입니다.
  //        여기 sub 는 압핀 칩·다른 화면이 쓰므로 함께 맞춰 둡니다.
  { name: '내이름 감정', color: '#5a825a', bg: '#eaf0e6', href: '/manseryeok/naming/diagnosis/storage?mode=diagnosis', cat: '개명', sub: '내 이름 풀이 및 개명', icon: '📇', grad: ['#38bdf8', '#67e8f9'] },
  // ★2026-08-01 (43부 · E) — 아기 이름 짓기를 «다시» 홈에 냅니다.
  //   [왜 사라져 있었나]  기능이 미완성이라 닫아 두었고, 카드 연결도 끊겼습니다.
  //     그 사이 rename/newborn 은 «아무도 부르지 않는» 준비중 안내로 남아 있었습니다.
  //   ★43부에 신생아 동선(성씨만으로 시작 → 성씨 한자 고르기 → 신생아 배지)이
  //     갖춰져 재오픈합니다. 👶 emerald-400 → teal-300
  //   ★2026-08-01 (43부 2차) — «작명 보관함» 으로 바로 들어갑니다 (대표님 지시).
  //     ⚠️ 전에는 안내 화면(rename/newborn)으로 갔는데, 두 번째 오시는 분은
  //        «지난번에 지은 이름» 부터 보고 싶으십니다. 안내를 매번 볼 까닭이 없습니다.
  //     ★안내 화면은 보관함 안에서 「처음이신가요」로 이어 둡니다 — 끊기지 않습니다.
  { name: '아기 작명',   color: '#4a7c59', bg: '#e6f0ea', href: '/manseryeok/naming/diagnosis/storage?mode=naming', cat: '개명', sub: '아기 이름 지어 주기', icon: '👶', grad: ['#34d399', '#5eead4'] },
  // 🃏 violet-500 → fuchsia-400
  { name: '타로',       color: '#b45a78', bg: '#f6e5eb', href: '/tarot', cat: '기타', sub: '오늘의 카드', icon: '🃏', grad: ['#8b5cf6', '#e879f9'] },
  // 🧭 BEST — purple-500 → pink-400
  { name: '진로적성',   color: '#785aaa', bg: '#efeaf7', href: '/manseryeok/career', cat: '적성', sub: '내 길과 그릇', icon: '🧭', grad: ['#a855f7', '#f472b6'] },
]

// ★2026-07-29 — `type Service` 와 `COLLAPSED_COUNT` 를 걷어냈습니다.
//   서비스 목록이 [접기/전체보기] 한 줄에서 갈래 여닫이로 바뀌어 접는 줄 수가 없어졌고,
//   목록의 타입은 components/ServiceSection 의 `HomeService` 가 들고 있습니다.
//   ⚠️ 바로 위 SLIDES_OLD 는 "지우지 말 것"으로 남겨 둔 것이라 그대로 둡니다.


export default function HomeNew() {
  const router = useRouter()
  const [slide, setSlide] = useState(0)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  // 사람 선택 모달: 어떤 서비스로 열렸는지 (null이면 닫힘)
  const [pickService, setPickService] = useState<string | null>(null)
  const [pinned, setPinned] = useState<string[]>([])      // 찜한 서비스 이름들 (찜한 순서)
  const [pinMsg, setPinMsg] = useState('')                // 압핀 안내 메시지
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)


  // 찜(고정)한 서비스 목록 로드 (로그인 회원만 값이 있음)
  //
  // ★2026-07-29 — 없어진 서비스의 핀을 자동으로 걷어냅니다.
  //
  //   [무엇이 막혀 있었나]
  //     사주·대운·연월운세를 「내 사주 & 운세」 하나로 합치면서 두 이름이 사라졌는데,
  //     그 둘을 고정해 둔 회원의 saju_records 에는 핀이 그대로 남았습니다.
  //     화면에는 안 뜨지만 **자리는 계속 먹습니다.**
  //     → 「📌 3/3」 인데 보이는 칩은 하나. 새로 고정하려 하면 "최대 3개"라고 막힙니다.
  //
  //   [어떻게 고쳤나]
  //     지금 SERVICES 에 없는 이름은 홈에 들어올 때 조용히 해제합니다.
  //     ⚠️ 이름이 «영영 사라진» 것만 지웁니다. 잠깐 감춘 서비스가 있다면
  //        SERVICES 에 남겨 두십시오. 여기서 지워 버립니다.
  useEffect(() => {
    let mounted = true
    listPinnedServices().then(async (list) => {
      const alive = new Set(SERVICES.map(s => s.name))
      const dead = list.filter(n => !alive.has(n))
      for (const n of dead) await togglePinnedService(n)   // 해제
      if (mounted) setPinned(list.filter(n => alive.has(n)))
    })
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
        /* ★2026-07-29 — 띠 동물 둥실 애니메이션(zfloat·zodiacEmoji)을 걷어냈습니다.
           아이콘이 3D 결로 바뀌면서 흔들 이유가 없어졌습니다. */
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

        {/* ⑤ 서비스 영역 — BEST 2개 + 갈래 4묶음
            ★2026-07-29 대표님 지시로 다시 짰습니다. (부품: components/ServiceSection)
              전  열두 개가 한 줄로 늘어서고 [전체 12개 보기]로 접힘
              후  🔥BEST 둘(내사주그림·진로적성) + 📂네 갈래 여닫이
            ⚠️ 연결(href)은 하나도 안 바뀌었습니다. SERVICES 배열도 그대로입니다.
            ⚠️ 압핀(📌)은 살렸습니다. 회원 설정이라 말없이 없애면 안 됩니다.
                고정한 것은 BEST 아래 「고정한 서비스」 줄로 따로 뜹니다. */}
        <ServiceSection
          services={SERVICES}
          pinned={pinned}
          pinMsg={pinMsg}
          maxPins={MAX_PINS}
          onTogglePin={handleTogglePin}
          onOpen={(s) => { if (PICK_CONFIG[s.name]) setPickService(s.name); else router.push(s.href) }}
        />

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

      <AiTalkFab />
    </div>
  )
}

