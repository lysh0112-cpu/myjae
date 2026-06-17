"use client";

import { useState } from "react";
import Link from "next/link";
import { use } from "react";

// ─── 상담사 데이터 ───
const COUNSELORS_MAP: Record<string, {
  id: number; name: string; title: string; experience: number;
  tags: string[]; rating: number; reviews: number; price: number;
  available: boolean; initial: string; color: string; category: string;
  badge: string; intro: string; totalConsult: number;
  fullIntro: string; career: { year: string; desc: string }[];
  specialties: { icon: string; name: string; desc: string }[];
  reviewList: { author: string; rating: number; date: string; text: string; tag: string }[];
  timeSlots: { date: string; slots: string[] }[];
}> = {
  "1": {
    id: 1, name: "이명연", title: "사주·운명 전문가", experience: 18,
    tags: ["사주팔자", "궁합", "진로", "이직", "대운", "신살"], rating: 4.9, reviews: 1243,
    price: 30000, available: true, initial: "이", color: "#3C3489", category: "사주", badge: "인기",
    intro: "18년 경력의 정통 명리학 전문가. 1만 건 이상의 상담 경험.", totalConsult: 12480,
    fullIntro: "안녕하세요, 명리학 전문가 이명연입니다.\n\n18년간 오직 명리학 한 길만 걸어온 정통 상담사입니다. 사주팔자의 깊은 이치를 바탕으로 여러분의 타고난 기질·재능·운명의 흐름을 정확하게 짚어드립니다.\n\n단순한 운세 풀이를 넘어, 지금 당신이 서 있는 위치와 앞으로 나아가야 할 방향을 함께 찾아드리는 것이 저의 목표입니다.",
    career: [
      { year: "2024", desc: "명연재연구소 수석 상담사" },
      { year: "2018", desc: "한국명리학회 정회원 등록" },
      { year: "2015", desc: "강남 명리상담소 개원 (5년 운영)" },
      { year: "2012", desc: "대한명리학회 자격증 취득" },
      { year: "2006", desc: "명리학 입문 (고 김성호 선생 사사)" },
    ],
    specialties: [
      { icon: "🪬", name: "사주팔자", desc: "년·월·일·시 네 기둥의 정밀 분석" },
      { icon: "💕", name: "궁합·연애운", desc: "합·충·형·파·해 기반 궁합 분석" },
      { icon: "💼", name: "진로·이직운", desc: "격국과 용신으로 적성 직업 도출" },
      { icon: "🌊", name: "대운·세운", desc: "10년 대운과 연간 흐름 총정리" },
    ],
    reviewList: [
      { author: "별빛**", rating: 5, date: "2025.05.12", text: "선생님 덕분에 이직 타이밍을 잡았어요. 실제로 이직 후 연봉이 올랐습니다! 너무 정확해서 소름이었어요.", tag: "진로·이직" },
      { author: "꽃처럼**", rating: 5, date: "2025.04.28", text: "연애 문제로 상담했는데 제 성격을 너무 잘 맞추셔서 깜짝 놀랐습니다. 상담 후 마음이 정말 편해졌어요.", tag: "연애운" },
      { author: "구름위**", rating: 5, date: "2025.04.10", text: "3년째 매년 신년 운세 봅니다. 한 해 계획 세우는 데 정말 큰 도움이 돼요. 강력 추천!", tag: "신년운세" },
      { author: "노을빛**", rating: 4, date: "2025.03.22", text: "대운 분석이 정말 상세했습니다. 설명도 쉽게 해주셔서 명리학을 잘 몰라도 이해할 수 있었어요.", tag: "대운 분석" },
      { author: "하늘빛**", rating: 5, date: "2025.03.05", text: "사주 보는 게 처음이었는데 너무 따뜻하게 상담해 주셨어요. 제 고민을 정확히 짚어주셔서 감사합니다.", tag: "사주팔자" },
    ],
    timeSlots: [
      { date: "오늘 (6/17)", slots: ["14:00", "15:00", "16:30"] },
      { date: "내일 (6/18)", slots: ["10:00", "11:00", "13:00", "15:00"] },
      { date: "6/19 (목)", slots: ["10:00", "14:00", "17:00"] },
    ],
  },
  "4": {
    id: 4, name: "최하늘", title: "신점·사주 대가", experience: 22,
    tags: ["신점", "사업운", "이직", "건강", "부적", "기도"], rating: 5.0, reviews: 3210,
    price: 50000, available: true, initial: "최", color: "#7a3060", category: "사주", badge: "베스트",
    intro: "22년 전통 신점과 현대 명리학의 조화로 정확도 최고.", totalConsult: 21500,
    fullIntro: "안녕하세요, 최하늘입니다.\n\n22년간 신점과 명리학을 함께 연구해온 전문가입니다. 영적 감각과 학문적 명리학을 결합하여 남다른 정확도를 자랑합니다.\n\n특히 사업운, 재물운, 건강운 분야에서 탁월한 분석력을 발휘하며, 많은 사업가와 경영인들이 주요 의사결정 시 찾아주시는 상담사입니다.",
    career: [
      { year: "2022", desc: "명연재연구소 수석 마스터 상담사" },
      { year: "2015", desc: "전국명리학대회 최우수상 수상" },
      { year: "2010", desc: "신점·명리 융합 연구소 개원" },
      { year: "2005", desc: "전통 신점 수련 완성 (10년 과정)" },
      { year: "2002", desc: "명리학 입문" },
    ],
    specialties: [
      { icon: "🔮", name: "신점", desc: "전통 신점으로 영적 흐름 감지" },
      { icon: "💰", name: "사업·재물운", desc: "창업·투자·재물 타이밍 분석" },
      { icon: "🌿", name: "건강운", desc: "오행 체질 기반 건강 운세" },
      { icon: "🏢", name: "이직·승진운", desc: "직업과 사회적 지위 변화 예측" },
    ],
    reviewList: [
      { author: "사업가**", rating: 5, date: "2025.05.20", text: "창업 타이밍을 물어봤는데 정확히 짚어주셨어요. 말씀대로 하니 정말 잘 됐습니다. 경이롭습니다.", tag: "사업운" },
      { author: "직장인**", rating: 5, date: "2025.04.15", text: "건강 문제로 상담했는데 제가 말하지 않은 부분까지 정확히 아셨어요. 정말 신기합니다.", tag: "건강운" },
      { author: "주부맘**", rating: 5, date: "2025.03.30", text: "자녀 진로 상담을 했는데 아이의 적성을 너무 정확하게 맞추셔서 놀랐어요.", tag: "진로" },
    ],
    timeSlots: [
      { date: "오늘 (6/17)", slots: ["18:00", "19:00"] },
      { date: "내일 (6/18)", slots: ["09:00", "10:00", "18:00", "19:00"] },
      { date: "6/20 (금)", slots: ["14:00", "15:00"] },
    ],
  },
};

const DEFAULT_COUNSELOR = COUNSELORS_MAP["1"];

function StarRating({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const cls = size === "lg" ? "text-xl" : "text-sm";
  return (
    <span className={cls} style={{ color: "#FAC775" }}>
      {"★".repeat(Math.floor(rating))}{"☆".repeat(5 - Math.floor(rating))}
    </span>
  );
}

type TabKey = "소개" | "후기" | "예약";

export default function ConsultantProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const c = COUNSELORS_MAP[id] ?? DEFAULT_COUNSELOR;
  const [activeTab, setActiveTab] = useState<TabKey>("소개");
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingDone, setBookingDone] = useState(false);

  const ratingDist = [
    { star: 5, pct: 78 }, { star: 4, pct: 15 }, { star: 3, pct: 5 }, { star: 2, pct: 1 }, { star: 1, pct: 1 },
  ];

  function handleBook() {
    if (!selectedSlot) return;
    setBookingDone(true);
    setTimeout(() => setBookingDone(false), 3000);
    setSelectedSlot(null);
  }

  return (
    <div className="min-h-screen" style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>

      {/* 헤더 */}
      <header className="fixed top-0 z-50 flex items-center justify-between px-4 py-4"
        style={{
          background: "rgba(26,26,24,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)",
        }}>
        <Link href="/consultants">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </Link>
        <span className="text-sm font-bold text-white">{c.name} 상담사</span>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", color: "#8a88a0" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
        </button>
      </header>

      <main className="pt-16 pb-36">

        {/* ── 프로필 히어로 ── */}
        <div className="relative overflow-hidden px-4 pt-6 pb-6"
          style={{ background: "linear-gradient(160deg, #2C2C2A 0%, #3C3489 100%)" }}>
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #FAC775, transparent)" }} />
          <div className="relative z-10 flex items-start gap-4">
            {/* 아바타 */}
            <div className="relative flex-shrink-0">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-2xl"
                style={{ background: `linear-gradient(135deg, ${c.color}, #FAC775)` }}>
                {c.initial}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center`}
                style={{ background: c.available ? "#4caf50" : "#757575", borderColor: "#2C2C2A" }}>
                <div className="w-2 h-2 rounded-full bg-white" />
              </div>
            </div>
            {/* 기본 정보 */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-xl font-bold text-white">{c.name}</h1>
                {c.badge && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{ background: "rgba(250,199,117,0.2)", color: "#FAC775", border: "1px solid rgba(250,199,117,0.4)" }}>
                    {c.badge}
                  </span>
                )}
              </div>
              <p className="text-sm mb-2" style={{ color: "#b0aec8" }}>{c.title}</p>
              <div className="flex items-center gap-1.5 mb-3">
                <StarRating rating={c.rating} />
                <span className="text-sm font-bold" style={{ color: "#FAC775" }}>{c.rating}</span>
                <span className="text-xs" style={{ color: "#8a88a0" }}>({c.reviews.toLocaleString()})</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {c.tags.slice(0, 4).map((tag) => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(255,255,255,0.1)", color: "#c8c4d8" }}>#{tag}</span>
                ))}
              </div>
            </div>
          </div>

          {/* 통계 */}
          <div className="grid grid-cols-4 gap-2 mt-5">
            {[
              { label: "경력", value: `${c.experience}년` },
              { label: "총 상담", value: `${(c.totalConsult / 1000).toFixed(1)}k` },
              { label: "후기", value: c.reviews.toLocaleString() },
              { label: "평점", value: String(c.rating) },
            ].map((stat) => (
              <div key={stat.label} className="text-center rounded-xl py-2.5"
                style={{ background: "rgba(255,255,255,0.08)" }}>
                <div className="text-base font-bold" style={{ color: "#FAC775" }}>{stat.value}</div>
                <div className="text-[10px] mt-0.5" style={{ color: "#8a88a0" }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── 탭 ── */}
        <div className="sticky top-16 z-40 flex"
          style={{ background: "#1a1a18", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {(["소개", "후기", "예약"] as TabKey[]).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className="flex-1 py-3 text-sm font-semibold relative transition-all"
              style={{ color: activeTab === tab ? "#FAC775" : "#8a88a0" }}>
              {tab}
              {activeTab === tab && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: "#FAC775" }} />
              )}
            </button>
          ))}
        </div>

        <div className="px-4 pt-4 space-y-4">

          {/* ── 소개 탭 ── */}
          {activeTab === "소개" && (
            <>
              {/* 소개 글 */}
              <div className="rounded-2xl p-5"
                style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="text-sm font-bold text-white mb-3">상담사 소개</h2>
                <p className="text-sm leading-loose whitespace-pre-line" style={{ color: "#c8c4d8" }}>
                  {c.fullIntro}
                </p>
              </div>

              {/* 전문 분야 */}
              <div className="rounded-2xl p-5"
                style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="text-sm font-bold text-white mb-3">전문 분야</h2>
                <div className="grid grid-cols-2 gap-2">
                  {c.specialties.map((sp) => (
                    <div key={sp.name} className="rounded-xl p-3"
                      style={{ background: "rgba(60,52,137,0.2)", border: "1px solid rgba(60,52,137,0.3)" }}>
                      <div className="text-2xl mb-1.5">{sp.icon}</div>
                      <div className="text-sm font-semibold text-white">{sp.name}</div>
                      <div className="text-xs mt-0.5 leading-snug" style={{ color: "#8a88a0" }}>{sp.desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 경력 타임라인 */}
              <div className="rounded-2xl p-5"
                style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h2 className="text-sm font-bold text-white mb-4">경력 사항</h2>
                <div className="space-y-0">
                  {c.career.map((item, i) => (
                    <div key={item.year} className="flex gap-3">
                      {/* 타임라인 선 */}
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1"
                          style={{ background: i === 0 ? "#FAC775" : "#3C3489", border: i === 0 ? "2px solid #FAC775" : "2px solid #4e46b0" }} />
                        {i < c.career.length - 1 && (
                          <div className="w-px flex-1 mt-1" style={{ background: "rgba(60,52,137,0.4)", minHeight: "32px" }} />
                        )}
                      </div>
                      <div className="pb-4">
                        <span className="text-xs font-bold" style={{ color: i === 0 ? "#FAC775" : "#8a88a0" }}>
                          {item.year}
                        </span>
                        <p className="text-sm mt-0.5" style={{ color: i === 0 ? "#e0dce8" : "#b0aec8" }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 상담 요금 안내 */}
              <div className="rounded-2xl p-5"
                style={{ background: "linear-gradient(135deg, rgba(60,52,137,0.25), rgba(250,199,117,0.05))", border: "1px solid rgba(60,52,137,0.4)" }}>
                <h2 className="text-sm font-bold text-white mb-3">상담 요금</h2>
                {[
                  { name: "기본 상담 (30분)", price: c.price, desc: "사주 기본 분석 + 현재 운세" },
                  { name: "심층 상담 (60분)", price: c.price * 2, desc: "대운·세운·직업·연애운 포함" },
                  { name: "종합 상담 (90분)", price: Math.floor(c.price * 2.5), desc: "전 분야 심층 분석 + 질의응답" },
                ].map((plan) => (
                  <div key={plan.name} className="flex items-center justify-between py-3 border-b last:border-0"
                    style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                    <div>
                      <div className="text-sm font-medium text-white">{plan.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#8a88a0" }}>{plan.desc}</div>
                    </div>
                    <div className="text-sm font-bold" style={{ color: "#FAC775" }}>
                      {plan.price.toLocaleString()}원
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── 후기 탭 ── */}
          {activeTab === "후기" && (
            <>
              {/* 평점 요약 */}
              <div className="rounded-2xl p-5"
                style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center gap-5">
                  <div className="text-center">
                    <div className="text-5xl font-bold" style={{ color: "#FAC775" }}>{c.rating}</div>
                    <StarRating rating={c.rating} size="lg" />
                    <div className="text-xs mt-1" style={{ color: "#8a88a0" }}>{c.reviews.toLocaleString()}개</div>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {ratingDist.map((r) => (
                      <div key={r.star} className="flex items-center gap-2">
                        <span className="text-xs w-4 text-right" style={{ color: "#8a88a0" }}>{r.star}</span>
                        <div className="flex-1 h-1.5 rounded-full overflow-hidden"
                          style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: "#FAC775" }} />
                        </div>
                        <span className="text-xs w-7" style={{ color: "#8a88a0" }}>{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* 후기 목록 */}
              <div className="space-y-3">
                {c.reviewList.map((rev, i) => (
                  <div key={i} className="rounded-2xl p-4"
                    style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">{rev.author}</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: "rgba(60,52,137,0.3)", color: "#b0aec8" }}>{rev.tag}</span>
                        </div>
                        <StarRating rating={rev.rating} />
                      </div>
                      <span className="text-[10px]" style={{ color: "#6a6880" }}>{rev.date}</span>
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "#c8c4d8" }}>{rev.text}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── 예약 탭 ── */}
          {activeTab === "예약" && (
            <>
              <div className="rounded-2xl p-4"
                style={{ background: "rgba(250,199,117,0.08)", border: "1px solid rgba(250,199,117,0.2)" }}>
                <p className="text-xs" style={{ color: "#b0aec8" }}>
                  <span style={{ color: "#FAC775" }}>💡 안내 — </span>
                  상담 시작 1시간 전까지 취소 가능합니다. 30분 기본 상담 기준 요금입니다.
                </p>
              </div>

              {/* 시간대 선택 */}
              {c.timeSlots.map((group) => (
                <div key={group.date} className="rounded-2xl p-4"
                  style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <h3 className="text-sm font-bold text-white mb-3">{group.date}</h3>
                  <div className="grid grid-cols-4 gap-2">
                    {group.slots.map((slot) => {
                      const key = `${group.date}-${slot}`;
                      const on = selectedSlot === key;
                      return (
                        <button key={slot} onClick={() => setSelectedSlot(on ? null : key)}
                          className="py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                          style={on
                            ? { background: "#3C3489", color: "#FAC775", border: "1px solid rgba(250,199,117,0.4)" }
                            : { background: "rgba(255,255,255,0.04)", color: "#c8c4d8", border: "1px solid rgba(255,255,255,0.08)" }}>
                          {slot}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* 선택된 슬롯 요약 */}
              {selectedSlot && (
                <div className="rounded-xl px-4 py-3 flex items-center gap-2"
                  style={{ background: "rgba(60,52,137,0.2)", border: "1px solid rgba(60,52,137,0.4)" }}>
                  <span style={{ color: "#FAC775" }}>✓</span>
                  <span className="text-sm text-white">
                    {selectedSlot.replace("-", " ")} · 30분 · {c.price.toLocaleString()}원
                  </span>
                </div>
              )}
            </>
          )}

        </div>
      </main>

      {/* 고정 하단 버튼 */}
      <div className="fixed bottom-0 z-50 px-4 py-4"
        style={{
          background: "linear-gradient(to top, #1a1a18 70%, transparent)",
          width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-xs" style={{ color: "#8a88a0" }}>30분 기준 </span>
            <span className="text-base font-bold" style={{ color: "#FAC775" }}>
              {c.price.toLocaleString()}원
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: c.available ? "#4caf50" : "#757575" }} />
            <span className="text-xs" style={{ color: c.available ? "#4caf50" : "#8a88a0" }}>
              {c.available ? "지금 상담 가능" : "대기 중"}
            </span>
          </div>
        </div>
        <button
          onClick={activeTab === "예약" ? handleBook : () => setActiveTab("예약")}
          disabled={activeTab === "예약" && !selectedSlot}
          className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
          style={
            activeTab === "예약" && !selectedSlot
              ? { background: "rgba(255,255,255,0.06)", color: "#8a88a0", cursor: "not-allowed" }
              : { background: "linear-gradient(135deg, #3C3489 0%, #FAC775 100%)", color: "#1a1a18", boxShadow: "0 4px 20px rgba(60,52,137,0.4)" }
          }>
          {activeTab === "예약"
            ? selectedSlot ? "✓ 상담 예약 확정하기" : "시간대를 선택해주세요"
            : "상담 예약하기"}
        </button>
      </div>

      {/* 예약 완료 토스트 */}
      {bookingDone && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold text-white shadow-2xl"
          style={{ background: "rgba(60,52,137,0.97)", border: "1px solid rgba(250,199,117,0.4)", whiteSpace: "nowrap" }}>
          ✓ {c.name} 상담사와 예약이 완료되었습니다!
        </div>
      )}
    </div>
  );
}
