"use client";

import { useState } from "react";
import Link from "next/link";
import BottomNav from "./components/BottomNav";

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
  return (
    <header className="fixed top-0 z-50 flex items-center justify-between px-5 py-4"
      style={{ background: "rgba(44,44,42,0.95)", backdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(255,255,255,0.06)", width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)" }}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #3C3489, #FAC775)" }}>명</div>
        <span className="text-lg font-bold tracking-wider" style={{ color: "#FAC775" }}>명연재연구소</span>
      </div>
      <button className="text-sm px-4 py-1.5 rounded-full border font-medium"
        style={{ borderColor: "#FAC775", color: "#FAC775" }}>로그인</button>
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
            <p className="text-xs" style={{ color: "#8a88a0" }}>생년월일시를
