"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "../components/BottomNav";

// ─── 타입 ───
type MenuTab = "예약내역" | "분석내역" | "찜목록" | "설정";

// ─── 목업 데이터 ───
const USER = {
  name: "김운세",
  email: "user@example.com",
  joinDate: "2024.08.15",
  tier: "골드",
  point: 4200,
  coupon: 2,
  totalConsult: 7,
  aiCount: 23,
};

const BOOKINGS = [
  { id: 1, counselor: "이명연", title: "사주팔자 심층 분석", date: "2025.06.15 14:00", duration: "60분", price: 60000, status: "완료", statusColor: "#4caf50", mode: "화상", tags: ["진로", "재물운"] },
  { id: 2, counselor: "최하늘", title: "신점·사업운 종합 상담", date: "2025.05.28 19:00", duration: "90분", price: 75000, status: "완료", statusColor: "#4caf50", mode: "채팅", tags: ["사업운", "이직"] },
  { id: 3, counselor: "이명연", title: "연애운·궁합 상담", date: "2025.06.20 15:00", duration: "30분", price: 30000, status: "예정", statusColor: "#FAC775", mode: "음성", tags: ["연애운", "궁합"] },
  { id: 4, counselor: "오미래", title: "결혼 타이밍 상담", date: "2025.04.10 11:00", duration: "30분", price: 22000, status: "취소", statusColor: "#8a88a0", mode: "채팅", tags: ["결혼"] },
];

const AI_RESULTS = [
  { id: 1, title: "壬水 일간 종합 분석", date: "2025.06.17", tags: ["사주기본", "대운", "직업운"], sections: 4 },
  { id: 2, title: "2025 을사년 신년 운세", date: "2025.01.03", tags: ["세운", "재물운", "연애운"], sections: 3 },
  { id: 3, title: "이직 타이밍 집중 분석", date: "2024.11.22", tags: ["직업운", "대운"], sections: 2 },
  { id: 4, title: "사주 기본 분석 (첫 분석)", date: "2024.08.20", tags: ["사주기본"], sections: 1 },
];

const FAVORITES = [
  { id: 1, name: "이명연", title: "사주·운명 전문가", rating: 4.9, reviews: 1243, initial: "이", color: "#3C3489", available: true, price: 30000 },
  { id: 4, name: "최하늘", title: "신점·사주 대가", rating: 5.0, reviews: 3210, initial: "최", color: "#7a3060", available: true, price: 50000 },
  { id: 6, name: "오미래", title: "연애·궁합 전문가", rating: 4.8, reviews: 1890, initial: "오", color: "#8a2a60", available: false, price: 22000 },
];

const SETTINGS_GROUPS = [
  {
    title: "계정",
    items: [
      { icon: "👤", label: "프로필 수정" },
      { icon: "🔒", label: "비밀번호 변경" },
      { icon: "📱", label: "휴대폰 번호 인증" },
      { icon: "🔔", label: "알림 설정" },
    ],
  },
  {
    title: "서비스",
    items: [
      { icon: "💳", label: "결제 수단 관리" },
      { icon: "🎁", label: "쿠폰 / 포인트" },
      { icon: "📋", label: "이용약관" },
      { icon: "🛡️", label: "개인정보 처리방침" },
    ],
  },
  {
    title: "지원",
    items: [
      { icon: "💬", label: "1:1 문의하기" },
      { icon: "📖", label: "공지사항" },
      { icon: "⭐", label: "앱 평가하기" },
      { icon: "🔄", label: "버전 정보", sub: "v1.2.4" },
    ],
  },
];

// ─── 공통 헤더 ───
function PageHeader() {
  return (
    <header className="fixed top-0 z-50 flex items-center justify-between px-4 py-4"
      style={{
        background: "rgba(26,26,24,0.97)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)",
      }}>
      <Link href="/">
        <button className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </Link>
      <span className="text-sm font-bold text-white">마이페이지</span>
      <Link href="/login">
        <button className="text-xs px-3 py-1.5 rounded-full font-medium"
          style={{ border: "1px solid rgba(250,199,117,0.3)", color: "#FAC775" }}>
          로그아웃
        </button>
      </Link>
    </header>
  );
}

// ─── 프로필 카드 ───
function ProfileCard() {
  const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    골드: { bg: "rgba(250,199,117,0.15)", text: "#FAC775", border: "rgba(250,199,117,0.4)" },
    실버: { bg: "rgba(180,180,200,0.15)", text: "#c8c8d8", border: "rgba(180,180,200,0.4)" },
    브론즈: { bg: "rgba(180,100,50,0.15)", text: "#d4906a", border: "rgba(180,100,50,0.4)" },
  };
  const tier = TIER_COLORS[USER.tier] ?? TIER_COLORS["실버"];

  return (
    <div className="relative overflow-hidden mx-4 mt-4 rounded-2xl p-5"
      style={{ background: "linear-gradient(135deg, #2C2C2A 0%, #3C3489 100%)", border: "1px solid rgba(60,52,137,0.5)" }}>
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-15"
        style={{ background: "radial-gradient(circle, #FAC775, transparent)" }} />
      <div className="relative z-10 flex items-center gap-4">
        {/* 아바타 */}
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, #3C3489, #FAC775)" }}>
            {USER.name[0]}
          </div>
          <div className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
            style={{ background: tier.bg, color: tier.text, border: `1px solid ${tier.border}` }}>
            {USER.tier}
          </div>
        </div>
        {/* 정보 */}
        <div className="flex-1">
          <div className="text-lg font-bold text-white">{USER.name}</div>
          <div className="text-xs mt-0.5" style={{ color: "#b0aec8" }}>{USER.email}</div>
          <div className="text-xs mt-0.5" style={{ color: "#8a88a0" }}>가입일 {USER.joinDate}</div>
          <Link href="/login">
            <button className="mt-2 text-xs px-3 py-1 rounded-full"
              style={{ background: "rgba(255,255,255,0.08)", color: "#c8c4d8" }}>
              프로필 수정 →
            </button>
          </Link>
        </div>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-4 gap-2 mt-4 pt-4"
        style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {[
          { label: "포인트", value: USER.point.toLocaleString() },
          { label: "쿠폰", value: `${USER.coupon}장` },
          { label: "상담 횟수", value: `${USER.totalConsult}회` },
          { label: "AI 분석", value: `${USER.aiCount}회` },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-sm font-bold" style={{ color: "#FAC775" }}>{s.value}</div>
            <div className="text-[10px] mt-0.5" style={{ color: "#8a88a0" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── 예약 내역 탭 ───
function BookingHistory() {
  const [filter, setFilter] = useState<"전체" | "예정" | "완료" | "취소">("전체");
  const filtered = filter === "전체" ? BOOKINGS : BOOKINGS.filter((b) => b.status === filter);

  return (
    <div className="space-y-3">
      {/* 필터 */}
      <div className="flex gap-1.5">
        {(["전체", "예정", "완료", "취소"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
            style={filter === f
              ? { background: "#3C3489", color: "#FAC775" }
              : { background: "rgba(255,255,255,0.05)", color: "#8a88a0" }}>
            {f}
          </button>
        ))}
      </div>

      {filtered.map((b) => (
        <div key={b.id} className="rounded-2xl p-4"
          style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: `${b.statusColor}20`, color: b.statusColor, border: `1px solid ${b.statusColor}40` }}>
                  {b.status}
                </span>
                <span className="text-xs" style={{ color: "#8a88a0" }}>{b.mode} 상담</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-1.5">{b.title}</h3>
              <p className="text-xs mt-0.5" style={{ color: "#b0aec8" }}>
                {b.counselor} 상담사 · {b.duration}
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold" style={{ color: "#FAC775" }}>{b.price.toLocaleString()}원</div>
            </div>
          </div>

          <div className="flex items-center justify-between mt-3 pt-3"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5" style={{ color: "#8a88a0" }}>
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span className="text-xs" style={{ color: "#8a88a0" }}>{b.date}</span>
            </div>
            <div className="flex gap-1.5">
              {b.status === "완료" && (
                <button className="text-xs px-3 py-1 rounded-full transition-all"
                  style={{ border: "1px solid rgba(250,199,117,0.3)", color: "#FAC775" }}>
                  후기 작성
                </button>
              )}
              {b.status === "예정" && (
                <button className="text-xs px-3 py-1 rounded-full transition-all"
                  style={{ border: "1px solid rgba(255,80,80,0.3)", color: "#ef9a9a" }}>
                  취소
                </button>
              )}
              {b.status === "완료" && (
                <Link href="/booking">
                  <button className="text-xs px-3 py-1 rounded-full transition-all"
                    style={{ background: "rgba(60,52,137,0.3)", color: "#b0aec8" }}>
                    재예약
                  </button>
                </Link>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-1 mt-2">
            {b.tags.map((t) => (
              <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: "rgba(60,52,137,0.2)", color: "#8a88a0" }}>#{t}</span>
            ))}
          </div>
        </div>
      ))}

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">📋</div>
          <p className="text-sm text-white font-semibold">예약 내역이 없습니다</p>
          <Link href="/consultants">
            <button className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "#3C3489", color: "#FAC775" }}>
              상담사 찾기
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── AI 분석 내역 ───
function AiHistory() {
  return (
    <div className="space-y-3">
      {AI_RESULTS.map((r) => (
        <Link key={r.id} href="/manseryeok/result">
          <div className="rounded-2xl p-4 transition-all active:scale-[0.98]"
            style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-bold text-white">{r.title}</span>
                </div>
                <p className="text-xs" style={{ color: "#8a88a0" }}>
                  {r.date} · {r.sections}개 분석 항목
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {r.tags.map((t) => (
                    <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(60,52,137,0.25)", color: "#b0aec8" }}>#{t}</span>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: "rgba(60,52,137,0.25)" }}>✦</div>
            </div>
          </div>
        </Link>
      ))}
      <div className="text-center pt-2">
        <Link href="/manseryeok">
          <button className="px-6 py-3 rounded-xl text-sm font-semibold"
            style={{ background: "linear-gradient(135deg, #3C3489, #4e46b0)", color: "#FAC775" }}>
            ✨ 새 AI 분석 시작하기
          </button>
        </Link>
      </div>
    </div>
  );
}

// ─── 찜 목록 ───
function FavoriteList() {
  const [favs, setFavs] = useState(FAVORITES.map((f) => f.id));
  function toggle(id: number) {
    setFavs((prev) => prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]);
  }
  const active = FAVORITES.filter((f) => favs.includes(f.id));

  return (
    <div className="space-y-3">
      {active.map((c) => (
        <div key={c.id} className="rounded-2xl p-4"
          style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-3">
            <div className="relative flex-shrink-0">
              <div className="w-14 h-14 rounded-xl flex items-center justify-center text-xl font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${c.color}, #FAC775)` }}>
                {c.initial}
              </div>
              {c.available && (
                <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
                  style={{ background: "#4caf50", borderColor: "#2C2C2A" }} />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{c.name}</span>
                <span className="text-xs" style={{ color: "#FAC775" }}>★ {c.rating}</span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#b0aec8" }}>{c.title}</p>
              <p className="text-xs mt-0.5" style={{ color: "#8a88a0" }}>후기 {c.reviews.toLocaleString()} · {c.price.toLocaleString()}원~</p>
            </div>
            <button onClick={() => toggle(c.id)} className="w-9 h-9 flex items-center justify-center rounded-xl"
              style={{ background: "rgba(255,80,80,0.1)" }}>
              <svg viewBox="0 0 24 24" fill="#ef9a9a" className="w-5 h-5">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </button>
          </div>
          <div className="flex gap-2 mt-3">
            <Link href={`/consultants/${c.id}`} className="flex-1">
              <button className="w-full py-2 rounded-xl text-xs font-semibold"
                style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#c8c4d8" }}>
                프로필 보기
              </button>
            </Link>
            <Link href="/booking" className="flex-1">
              <button className="w-full py-2 rounded-xl text-xs font-bold"
                style={c.available
                  ? { background: "linear-gradient(135deg, #3C3489, #4e46b0)", color: "#FAC775" }
                  : { background: "rgba(255,255,255,0.05)", color: "#8a88a0" }}>
                {c.available ? "상담 신청" : "대기 중"}
              </button>
            </Link>
          </div>
        </div>
      ))}

      {active.length === 0 && (
        <div className="text-center py-16">
          <div className="text-4xl mb-3">🤍</div>
          <p className="text-sm text-white font-semibold">찜한 상담사가 없습니다</p>
          <Link href="/consultants">
            <button className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "#3C3489", color: "#FAC775" }}>
              상담사 둘러보기
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── 설정 탭 ───
function SettingsTab() {
  return (
    <div className="space-y-4">
      {/* 포인트·쿠폰 배너 */}
      <div className="rounded-2xl p-4 flex items-center justify-between"
        style={{ background: "linear-gradient(135deg, rgba(60,52,137,0.3), rgba(250,199,117,0.06))", border: "1px solid rgba(60,52,137,0.4)" }}>
        <div>
          <p className="text-xs" style={{ color: "#8a88a0" }}>보유 포인트</p>
          <p className="text-xl font-bold" style={{ color: "#FAC775" }}>{USER.point.toLocaleString()} P</p>
        </div>
        <div className="h-10 w-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        <div className="text-center">
          <p className="text-xs" style={{ color: "#8a88a0" }}>쿠폰</p>
          <p className="text-xl font-bold text-white">{USER.coupon}장</p>
        </div>
        <button className="px-4 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "#3C3489", color: "#FAC775" }}>
          포인트 충전
        </button>
      </div>

      {/* 설정 그룹 */}
      {SETTINGS_GROUPS.map((group) => (
        <div key={group.title} className="rounded-2xl overflow-hidden"
          style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="px-5 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <span className="text-xs font-semibold" style={{ color: "#8a88a0" }}>{group.title}</span>
          </div>
          {group.items.map((item, i) => (
            <button key={item.label}
              className="w-full flex items-center justify-between px-5 py-4 transition-all active:bg-white/5"
              style={{ borderTop: i === 0 ? "none" : "1px solid rgba(255,255,255,0.04)" }}>
              <div className="flex items-center gap-3">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm text-white">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                {"sub" in item && item.sub && (
                  <span className="text-xs" style={{ color: "#6a6880" }}>{item.sub}</span>
                )}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4"
                  style={{ color: "#6a6880" }}>
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      ))}

      {/* 로그아웃 / 탈퇴 */}
      <div className="flex gap-3">
        <Link href="/login" className="flex-1">
          <button className="w-full py-3 rounded-xl text-sm font-semibold"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#8a88a0" }}>
            로그아웃
          </button>
        </Link>
        <button className="flex-1 py-3 rounded-xl text-sm font-semibold"
          style={{ border: "1px solid rgba(239,154,154,0.3)", color: "#ef9a9a" }}>
          회원 탈퇴
        </button>
      </div>
    </div>
  );
}

// ─── 내부 섹션 탭 ───
function SectionTabBar({ active, setActive }: {
  active: MenuTab; setActive: (t: MenuTab) => void;
}) {
  const tabs: { key: MenuTab; icon: string; label: string }[] = [
    { key: "예약내역", icon: "📋", label: "예약내역" },
    { key: "분석내역", icon: "✦", label: "분석내역" },
    { key: "찜목록", icon: "🤍", label: "찜목록" },
    { key: "설정", icon: "⚙️", label: "설정" },
  ];
  return (
    <div className="flex sticky top-16 z-30"
      style={{ background: "#1a1a18", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
      {tabs.map((t) => (
        <button key={t.key} onClick={() => setActive(t.key)}
          className="flex-1 flex flex-col items-center justify-center py-2.5 gap-0.5 relative transition-all"
          style={{ color: active === t.key ? "#FAC775" : "#8a88a0" }}>
          {active === t.key && (
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
              style={{ background: "#FAC775" }} />
          )}
          <span className="text-base leading-none">{t.icon}</span>
          <span style={{ fontSize: "9px", fontWeight: active === t.key ? 600 : 400 }}>{t.label}</span>
        </button>
      ))}
    </div>
  );
}

// ─── 메인 ───
export default function MyPage() {
  const [tab, setTab] = useState<MenuTab>("예약내역");

  return (
    <div className="min-h-screen" style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>
      <PageHeader />

      <div className="pt-16 pb-24">
        <ProfileCard />

        {/* 퀵 액션 */}
        <div className="grid grid-cols-3 gap-2 mx-4 mt-4">
          {[
            { icon: "🔮", label: "AI 만세력", href: "/manseryeok" },
            { icon: "👥", label: "상담사 찾기", href: "/consultants" },
            { icon: "📅", label: "예약하기", href: "/booking" },
          ].map((a) => (
            <Link key={a.label} href={a.href}>
              <button className="w-full py-3.5 rounded-xl flex flex-col items-center gap-1.5 transition-all active:scale-95"
                style={{ background: "rgba(60,52,137,0.2)", border: "1px solid rgba(60,52,137,0.3)" }}>
                <span className="text-2xl">{a.icon}</span>
                <span className="text-xs font-medium" style={{ color: "#b0aec8" }}>{a.label}</span>
              </button>
            </Link>
          ))}
        </div>

        {/* 섹션 탭 (sticky) */}
        <div className="mt-4">
          <SectionTabBar active={tab} setActive={setTab} />
        </div>

        {/* 탭 콘텐츠 */}
        <div className="mt-4 px-4">
          {tab === "예약내역" && <BookingHistory />}
          {tab === "분석내역" && <AiHistory />}
          {tab === "찜목록" && <FavoriteList />}
          {tab === "설정" && <SettingsTab />}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
