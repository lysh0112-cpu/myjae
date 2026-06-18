"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import BottomNav from "./components/BottomNav";
import { createClient } from "@/lib/supabase";

function IconHeart() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}
function IconComment() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function Header() {
  const router = useRouter();
  const [user, setUser] = useState<{ email?: string; nickname?: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUser({
          email: data.user.email,
          nickname: data.user.user_metadata?.nickname || data.user.email?.split("@")[0],
        });
      }
    });
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  return (
    <header className="fixed top-0 z-50 flex items-center justify-between px-5 py-4"
      style={{ background: "rgba(44,44,42,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)", width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)" }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #3C3489, #FAC775)" }}>명</div>
        <span className="text-lg font-bold tracking-wider" style={{ color: "#FAC775" }}>명연재연구소</span>
      </div>
      {user ? (
        <div className="flex items-center gap-2">
          <span className="text-sm" style={{ color: "#FAC775" }}>{user.nickname}</span>
          <button onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-full border font-medium"
            style={{ borderColor: "rgba(255,255,255,0.2)", color: "#8a88a0" }}>
            로그아웃
          </button>
        </div>
      ) : (
        <Link href="/auth/login">
          <button className="text-sm px-4 py-1.5 rounded-full border font-medium"
            style={{ borderColor: "#FAC775", color: "#FAC775" }}>
            로그인
          </button>
        </Link>
      )}
    </header>
  );
}

function HeroBanner() {
  return (
    <section className="relative overflow-hidden pt-24 pb-10 px-5 text-center"
      style={{ background: "linear-gradient(160deg, #1a1a18 0%, #2C2C2A 40%, #3C3489 100%)", minHeight: "340px" }}>
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-20"
        style={{ background: "radial-gradient(circle, #FAC775, transparent)" }} />
      <div className="absolute bottom-0 -left-10 w-48 h-48 rounded-full opacity-10"
        style={{ background: "radial-gradient(circle, #3C3489, transparent)" }} />
      <div className="relative z-10">
        <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-5"
          style={{ background: "rgba(250,199,117,0.15)", color: "#FAC775", border: "1px solid rgba(250,199,117,0.3)" }}>
          ✨ AI 기반 정밀 사주 분석
        </div>
        <h1 className="text-3xl font-bold leading-tight mb-3" style={{ color: "#FAC775" }}>
          당신의 운명을<br /><span className="text-white">밝혀드립니다</span>
        </h1>
        <p className="text-sm leading-relaxed mb-8" style={{ color: "#b0aec8" }}>
          5,000년 동양철학과 AI 기술이 만나<br />정확하고 깊이 있는 사주 분석을 제공합니다
        </p>
        <div className="flex justify-center gap-6">
          {[["12만+", "누적 분석"], ["98%", "만족도"], ["47명", "전문 상담사"]].map(([val, lbl], i) => (
            <div key={lbl} className="flex items-center gap-6">
              {i > 0 && <div className="w-px h-8" style={{ background: "rgba(255,255,255,0.15)" }} />}
              <div className="text-center">
                <div className="text-2xl font-bold" style={{ color: "#FAC775" }}>{val}</div>
                <div className="text-xs mt-0.5" style={{ color: "#8a88a0" }}>{lbl}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const HOURS = [
  "모름", "子시(23~01)", "丑시(01~03)", "寅시(03~05)", "卯시(05~07)",
  "辰시(07~09)", "巳시(09~11)", "午시(11~13)", "未시(13~15)",
  "申시(15~17)", "酉시(17~19)", "戌시(19~21)", "亥시(21~23)",
];

const HOUR_INDEX: Record<string, number> = {
  "子시(23~01)": 0, "丑시(01~03)": 1, "寅시(03~05)": 2, "卯시(05~07)": 3,
  "辰시(07~09)": 4, "巳시(09~11)": 5, "午시(11~13)": 6, "未시(13~15)": 7,
  "申시(15~17)": 8, "酉시(17~19)": 9, "戌시(19~21)": 10, "亥시(21~23)": 11,
};

function AiManseryeokSection() {
  const [gender, setGender] = useState<"남" | "여">("남");
  const [birthDate, setBirthDate] = useState("");
  const [birthHour, setBirthHour] = useState("");
  const [calType, setCalType] = useState<"양력" | "음력">("양력");

  function buildHref() {
    const params = new URLSearchParams();
    params.set("gender", gender);
    params.set("calType", calType);
    if (birthDate) {
      const d = birthDate.split("-");
      params.set("year", d[0] || "");
      params.set("month", d[1] ? String(parseInt(d[1])) : "");
      params.set("day", d[2] ? String(parseInt(d[2])) : "");
    }
    params.set("hour", birthHour === "모름" ? "모름" : birthHour ? String(HOUR_INDEX[birthHour]) : "모름");
    params.set("options", "basic,dayun");
    return `/manseryeok/result?${params.toString()}`;
  }

  return (
    <section className="px-4 -mt-4 relative z-10">
      <div className="rounded-2xl p-5 shadow-2xl"
        style={{ background: "#2C2C2A", border: "1px solid rgba(250,199,117,0.15)" }}>
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: "linear-gradient(135deg, #3C3489, #4e46b0)" }}>✦</div>
          <div>
            <h2 className="text-base font-bold text-white">AI 만세력 분석</h2>
            <p className="text-xs" style={{ color: "#8a88a0" }}>생년월일시를 입력하세요</p>
          </div>
        </div>
        <div className="flex gap-3 mb-4">
          {[
            { label: "성별", vals: ["남", "여"] as const, state: gender, set: setGender },
            { label: "달력", vals: ["양력", "음력"] as const, state: calType, set: setCalType },
          ].map(({ label, vals, state, set }) => (
            <div key={label} className="flex-1">
              <label className="text-xs font-medium mb-1.5 block" style={{ color: "#b0aec8" }}>{label}</label>
              <div className="flex rounded-xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.1)" }}>
                {vals.map((v) => (
                  <button key={v} onClick={() => (set as (x: string) => void)(v)}
                    className="flex-1 py-2.5 text-sm font-medium transition-all"
                    style={state === v ? { background: "#3C3489", color: "#FAC775" } : { background: "transparent", color: "#8a88a0" }}>
                    {v}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: "#b0aec8" }}>
            <IconCalendar />생년월일
          </label>
          <input type="date" value={birthDate} onChange={(e) => setBirthDate(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none"
            style={{ background: "#1a1a18", border: "1px solid rgba(255,255,255,0.1)", color: birthDate ? "#FAC775" : "#8a88a0", colorScheme: "dark" }} />
        </div>
        <div className="mb-5">
          <label className="text-xs font-medium mb-1.5 flex items-center gap-1.5" style={{ color: "#b0aec8" }}>
            <IconClock />태어난 시 (시주)
          </label>
          <select value={birthHour} onChange={(e) => setBirthHour(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none"
            style={{ background: "#1a1a18", border: "1px solid rgba(255,255,255,0.1)", color: birthHour ? "#FAC775" : "#8a88a0", colorScheme: "dark" }}>
            <option value="">시간 선택</option>
            {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
        <Link href={buildHref()}>
          <button className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
            style={{ background: "linear-gradient(135deg, #3C3489 0%, #FAC775 100%)", color: "#1a1a18", boxShadow: "0 4px 20px rgba(60,52,137,0.4)" }}>
            ✨ AI 만세력 상세 분석하기
          </button>
        </Link>
        <p className="text-center text-xs mt-3" style={{ color: "#8a88a0" }}>
          기본 분석은 무료 · 심층 분석은 전문 상담사와 연결
        </p>
      </div>
    </section>
  );
}

function TodayFortuneBanner() {
  return (
    <section className="mx-4 mt-6">
      <div className="rounded-2xl p-5 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, #3C3489 0%, #2a2075 100%)", border: "1px solid rgba(250,199,117,0.2)" }}>
        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "rgba(250,199,117,0.7)" }}>오늘의 운세</p>
          <h3 className="text-white font-bold text-sm leading-snug">
            오늘은 새로운 인연이<br />찾아오는 날입니다 ✨
          </h3>
          <button className="mt-3 text-xs px-4 py-1.5 rounded-full font-semibold"
            style={{ background: "#FAC775", color: "#2C2C2A" }}>확인하기</button>
        </div>
        <div className="text-6xl opacity-80 select-none">🔮</div>
      </div>
    </section>
  );
}

const CATEGORIES = [
  { icon: "🪬", label: "사주\n팔자" },
  { icon: "💕", label: "궁합\n연애" },
  { icon: "💰", label: "재물\n사업" },
  { icon: "🏠", label: "이사\n풍수" },
  { icon: "📅", label: "택일\n날짜" },
  { icon: "🌙", label: "타로\n점술" },
];

function CategoryMenu() {
  return (
    <section className="mt-6 px-4">
      <h2 className="text-base font-bold text-white mb-4">상담 분야</h2>
      <div className="grid grid-cols-6 gap-2">
        {CATEGORIES.map((cat) => (
          <button key={cat.label} className="flex flex-col items-center gap-1.5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-transform active:scale-90"
              style={{ background: "rgba(60,52,137,0.25)", border: "1px solid rgba(60,52,137,0.3)" }}>
              {cat.icon}
            </div>
            <span className="text-center leading-tight whitespace-pre-line" style={{ color: "#8a88a0", fontSize: "10px" }}>
              {cat.label}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

const COUNSELORS = [
  { id: 1, name: "이명연", title: "사주·운명 전문", experience: "경력 18년", tags: ["사주팔자", "궁합", "진로"], rating: 4.9, reviews: 1243, price: "30,000원~", available: true, initial: "이", color: "#3C3489", badge: "인기" },
  { id: 2, name: "박진수", title: "풍수지리·명리", experience: "경력 12년", tags: ["명리학", "풍수", "이사"], rating: 4.8, reviews: 892, price: "25,000원~", available: true, initial: "박", color: "#5a3d8a", badge: "" },
  { id: 3, name: "김서연", title: "타로·사주 상담", experience: "경력 9년", tags: ["타로", "연애운", "재물운"], rating: 4.9, reviews: 2104, price: "20,000원~", available: false, initial: "김", color: "#2a5a8a", badge: "신규" },
  { id: 4, name: "최하늘", title: "사주·신점 전문", experience: "경력 22년", tags: ["신점", "사업운", "이직"], rating: 5.0, reviews: 3210, price: "50,000원~", available: true, initial: "최", color: "#7a3060", badge: "베스트" },
  { id: 5, name: "정도운", title: "명리·수비학", experience: "경력 15년", tags: ["수비학", "이름", "작명"], rating: 4.7, reviews: 567, price: "35,000원~", available: true, initial: "정", color: "#2a6a5a", badge: "" },
];

type Counselor = typeof COUNSELORS[0];

function CounselorCard({ c }: { c: Counselor }) {
  return (
    <div className="rounded-2xl p-4 flex-shrink-0 w-[196px] flex flex-col gap-3"
      style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="flex items-start justify-between">
        <div className="relative">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${c.color}, #FAC775)` }}>
            {c.initial}
          </div>
          {c.available && (
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
              style={{ background: "#4caf50", borderColor: "#2C2C2A" }} />
          )}
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-xs" style={{ color: "#FAC775" }}>★ {c.rating}</div>
          {c.badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
              style={{ background: "rgba(250,199,117,0.15)", color: "#FAC775", border: "1px solid rgba(250,199,117,0.3)" }}>
              {c.badge}
            </span>
          )}
        </div>
      </div>
      <div>
        <div className="font-bold text-white text-sm">{c.name}</div>
        <div className="text-xs mt-0.5" style={{ color: "#b0aec8" }}>{c.title}</div>
        <div className="text-xs mt-0.5" style={{ color: "#8a88a0" }}>{c.experience} · 후기 {c.reviews.toLocaleString()}</div>
      </div>
      <div className="flex flex-wrap gap-1">
        {c.tags.map((tag) => (
          <span key={tag} className="text-xs px-2 py-0.5 rounded-full"
            style={{ background: "rgba(60,52,137,0.3)", color: "#b0aec8" }}>#{tag}</span>
        ))}
      </div>
      <div className="mt-auto">
        <div className="text-xs mb-2" style={{ color: "#8a88a0" }}>
          <span style={{ color: "#FAC775", fontWeight: 600 }}>{c.price}</span> / 30분
        </div>
        <button className="w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={c.available
            ? { background: "linear-gradient(135deg, #3C3489, #4e46b0)", color: "#FAC775" }
            : { background: "rgba(255,255,255,0.05)", color: "#8a88a0" }}>
          {c.available ? "상담 신청" : "대기 중"}
        </button>
      </div>
    </div>
  );
}

function CounselorSection() {
  return (
    <section className="mt-8">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-white">전문 상담사</h2>
          <p className="text-xs mt-0.5" style={{ color: "#8a88a0" }}>검증된 명리학 전문가와 1:1 상담</p>
        </div>
        <button className="text-xs font-medium" style={{ color: "#FAC775" }}>전체보기 →</button>
      </div>
      <div className="flex gap-3 px-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none" }}>
        {COUNSELORS.map((c) => <CounselorCard key={c.id} c={c} />)}
      </div>
    </section>
  );
}

const POSTS = [
  { id: 1, category: "사주 후기", title: "이명연 선생님 상담 후 실제로 취업됐어요 😭", author: "별빛달빛", time: "2시간 전", likes: 128, comments: 34, hot: true },
  { id: 2, category: "Q&A", title: "편인격 일간이 재성이 없으면 어떤 운이 오나요?", author: "명리초보자", time: "4시간 전", likes: 47, comments: 12, hot: false },
  { id: 3, category: "자유게시판", title: "2025년 을사년 전체 운세 정리해봤습니다", author: "운세연구가", time: "어제", likes: 312, comments: 89, hot: true },
  { id: 4, category: "궁합", title: "남자친구랑 원진살이 있는데 헤어져야 할까요?", author: "연분홍봄날", time: "어제", likes: 203, comments: 67, hot: false },
  { id: 5, category: "재물운", title: "갑목 일간 2025 재물운 미리보기 — AI 분석 공유", author: "갑목갑목", time: "2일 전", likes: 88, comments: 21, hot: false },
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  "사주 후기": { bg: "rgba(60,52,137,0.3)", color: "#b0aec8" },
  "Q&A": { bg: "rgba(250,199,117,0.15)", color: "#FAC775" },
  "자유게시판": { bg: "rgba(76,175,80,0.15)", color: "#81c784" },
  "궁합": { bg: "rgba(233,30,99,0.15)", color: "#f48fb1" },
  "재물운": { bg: "rgba(255,152,0,0.15)", color: "#ffcc80" },
};

function CommunitySection() {
  const [activeTab, setActiveTab] = useState<"인기" | "최신" | "Q&A">("인기");
  return (
    <section className="mt-8 pb-2">
      <div className="flex items-center justify-between px-4 mb-4">
        <div>
          <h2 className="text-base font-bold text-white">커뮤니티</h2>
          <p className="text-xs mt-0.5" style={{ color: "#8a88a0" }}>사주·운세 정보를 나눠요</p>
        </div>
        <button className="text-xs font-medium" style={{ color: "#FAC775" }}>전체보기 →</button>
      </div>
      <div className="flex gap-1 px-4 mb-3">
        {(["인기", "최신", "Q&A"] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className="px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={activeTab === tab ? { background: "#3C3489", color: "#FAC775" } : { background: "rgba(255,255,255,0.05)", color: "#8a88a0" }}>
            {tab}
          </button>
        ))}
      </div>
      <div className="px-4 flex flex-col gap-2">
        {POSTS.map((post) => {
          const catStyle = CATEGORY_COLORS[post.category] ?? { bg: "rgba(255,255,255,0.05)", color: "#8a88a0" };
          return (
            <div key={post.id} className="rounded-xl p-4"
              style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: catStyle.bg, color: catStyle.color }}>{post.category}</span>
                  {post.hot && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(255,80,80,0.15)", color: "#ff8080" }}>🔥 HOT</span>
                  )}
                </div>
                <span className="text-[10px] flex-shrink-0" style={{ color: "#8a88a0" }}>{post.time}</span>
              </div>
              <p className="text-sm font-medium text-white leading-snug mb-3">{post.title}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#8a88a0" }}>by {post.author}</span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#8a88a0" }}><IconHeart />{post.likes}</span>
                  <span className="flex items-center gap-1 text-xs" style={{ color: "#8a88a0" }}><IconComment />{post.comments}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 mt-4">
        <button className="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style={{ border: "1px solid rgba(60,52,137,0.5)", color: "#b0aec8", background: "rgba(60,52,137,0.1)" }}>
          + 글쓰기
        </button>
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen relative" style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>
      <Header />
      <main className="pb-28">
        <HeroBanner />
        <AiManseryeokSection />
        <TodayFortuneBanner />
        <CategoryMenu />
        <CounselorSection />
        <CommunitySection />
      </main>
      <BottomNav />
    </div>
  );
}
