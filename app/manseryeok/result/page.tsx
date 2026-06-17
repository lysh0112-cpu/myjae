"use client";

import { useState } from "react";
import Link from "next/link";

// ─── 사주 팔자 데이터 (목업) ───
const PILLARS = [
  { label: "년주", sky: "甲", earth: "子", skyName: "갑목", earthName: "자수", skyDesc: "양목·봄·생명력", earthDesc: "양수·겨울·지혜" },
  { label: "월주", sky: "庚", earth: "午", skyName: "경금", earthName: "오화", skyDesc: "양금·가을·결단력", earthDesc: "양화·여름·열정" },
  { label: "일주", sky: "壬", earth: "申", skyName: "임수", earthName: "신금", skyDesc: "양수·겨울·지혜", earthDesc: "양금·가을·창의" },
  { label: "시주", sky: "戊", earth: "子", skyName: "무토", earthName: "자수", skyDesc: "양토·환절기·신뢰", earthDesc: "양수·겨울·감성" },
];

// 천간 색상
const SKY_COLORS: Record<string, string> = {
  甲: "#4caf50", 乙: "#81c784", 丙: "#f44336", 丁: "#e57373",
  戊: "#ff9800", 己: "#ffb74d", 庚: "#9e9e9e", 辛: "#eeeeee",
  壬: "#2196f3", 癸: "#64b5f6",
};
const ELEMENT_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  목: { bg: "rgba(76,175,80,0.2)", text: "#81c784", label: "木" },
  화: { bg: "rgba(244,67,54,0.2)", text: "#ef9a9a", label: "火" },
  토: { bg: "rgba(255,152,0,0.2)", text: "#ffcc80", label: "土" },
  금: { bg: "rgba(158,158,158,0.2)", text: "#e0e0e0", label: "金" },
  수: { bg: "rgba(33,150,243,0.2)", text: "#90caf9", label: "水" },
};

const FIVE_ELEMENTS = [
  { name: "목", label: "木 목", pct: 25, desc: "창의·성장·인자함" },
  { name: "화", label: "火 화", pct: 15, desc: "열정·예의·명예" },
  { name: "토", label: "土 토", pct: 20, desc: "신뢰·중재·안정" },
  { name: "금", label: "金 금", pct: 30, desc: "결단·의리·정직" },
  { name: "수", label: "水 수", pct: 10, desc: "지혜·유연·감성" },
];

const SECTIONS = [
  {
    id: "basic", icon: "✦", title: "사주 기본 분석", color: "#FAC775",
    content: [
      { label: "일간 특성", text: "壬水 일간은 깊은 바다처럼 지혜롭고 유연한 성격을 지닙니다. 직관력이 뛰어나고 사람의 마음을 잘 읽으며, 상황에 따라 유연하게 적응하는 능력이 탁월합니다. 다만 결정을 내리는 데 시간이 걸릴 수 있습니다." },
      { label: "격국", text: "정관격(正官格) — 조직과 규칙을 중시하며 책임감이 강한 격입니다. 공직, 대기업, 전문직 계열에서 두각을 나타냅니다." },
      { label: "용신", text: "金(금) — 금이 수를 생하여 일간을 도우므로 금 기운이 강한 방향과 시기가 유리합니다." },
    ],
  },
  {
    id: "dayun", icon: "🌊", title: "대운·세운 흐름", color: "#90caf9",
    content: [
      { label: "현재 대운 (39~49세)", text: "丁亥 대운 — 수의 기운이 강해지는 시기로 지혜와 감수성이 극대화됩니다. 새로운 인맥과 기회가 물처럼 흘러들어오는 시기입니다." },
      { label: "2025년 세운 (을사년)", text: "乙巳년 — 목화(木火)의 기운이 강합니다. 상반기에 새로운 프로젝트·사업 기회가 생기며 사회적 활동이 활발해집니다. 건강 관리에 주의가 필요한 해입니다." },
      { label: "2026년 전망", text: "丙午년 — 화(火) 기운이 매우 강한 해로 명예운이 크게 상승합니다. 승진·이직·창업 모두 좋은 시기이나 재물 관리를 철저히 해야 합니다." },
    ],
  },
  {
    id: "career", icon: "💼", title: "직업·재물운", color: "#ffcc80",
    content: [
      { label: "적성 직업군", text: "물과 관련된 직업(수산업, 음료, 여행업), 지식·정보 계열(교육, 연구, IT), 금융·투자, 예술·창작 분야가 적합합니다. 독립적으로 일하거나 다양한 사람을 만나는 직업이 잘 맞습니다." },
      { label: "재물운", text: "안정적인 수입보다 투자나 부업으로 추가 수익을 얻는 패턴입니다. 30대 중반 이후 재물이 크게 늘어나는 시기가 옵니다. 부동산보다 금융·주식 쪽이 유리합니다." },
      { label: "사업 타이밍", text: "2025~2026년이 창업·독립의 최적기입니다. 동쪽 또는 북쪽 방향의 입지가 유리하며, 파트너십 사업보다 단독 경영이 더 잘 맞는 사주입니다." },
    ],
  },
  {
    id: "love", icon: "💕", title: "연애·궁합운", color: "#f48fb1",
    content: [
      { label: "연애 스타일", text: "겉으로 차가워 보이지만 내면은 감성이 풍부합니다. 한 번 마음을 주면 깊게 사랑하는 타입으로, 상대방의 진심을 중요하게 여깁니다. 밀고 당기기보다 솔직한 표현을 좋아합니다." },
      { label: "인연 시기", text: "2025년 하반기(7~11월)에 중요한 인연이 찾아올 가능성이 높습니다. 직장이나 학문적 모임을 통해 만나는 인연이 오래 지속됩니다." },
      { label: "최고 궁합", text: "庚金(경금)·辛金(신금) 일간과 궁합이 좋습니다. 반대로 戊土(무토)·己土(기토) 일간과는 마찰이 생길 수 있으니 주의가 필요합니다." },
    ],
  },
];

// ─── 대운 타임라인 ───
const DAYUN = [
  { age: "9~19", stem: "辛", branch: "亥", element: "금수", active: false },
  { age: "19~29", stem: "庚", branch: "戌", element: "금토", active: false },
  { age: "29~39", stem: "己", branch: "酉", element: "토금", active: false },
  { age: "39~49", stem: "戊", branch: "申", element: "토금", active: true },
  { age: "49~59", stem: "丁", branch: "未", element: "화토", active: false },
  { age: "59~69", stem: "丙", branch: "午", element: "화", active: false },
];

// ─── 공유 아이콘 ───
function IconShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

// ─── 섹션 아코디언 ───
function ResultSection({ sec }: { sec: typeof SECTIONS[0] }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">{sec.icon}</span>
          <span className="font-bold text-white text-sm">{sec.title}</span>
        </div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className="w-4 h-4 transition-transform" style={{ color: "#8a88a0", transform: open ? "rotate(180deg)" : "rotate(0deg)" }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          {sec.content.map((item) => (
            <div key={item.label} className="pt-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-1 h-4 rounded-full" style={{ background: sec.color }} />
                <span className="text-xs font-semibold" style={{ color: sec.color }}>{item.label}</span>
              </div>
              <p className="text-sm leading-relaxed" style={{ color: "#c8c4d8" }}>{item.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── 관련 상담사 카드 (슬림) ───
const RECOMMEND_COUNSELORS = [
  { id: 1, name: "이명연", title: "사주·운명 전문", rating: 4.9, reviews: 1243, price: "30,000원~", initial: "이", color: "#3C3489", available: true },
  { id: 4, name: "최하늘", title: "사주·신점 전문", rating: 5.0, reviews: 3210, price: "50,000원~", initial: "최", color: "#7a3060", available: true },
];

export default function ResultPage() {
  const [saveToast, setSaveToast] = useState(false);

  function handleSave() {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
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
        <Link href="/manseryeok">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </Link>
        <span className="text-sm font-bold text-white">AI 만세력 분석 결과</span>
        <button onClick={handleSave} className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)", color: "#FAC775" }}>
          <IconShare />
        </button>
      </header>

      <main className="pt-20 pb-32">

        {/* ── 완료 배너 ── */}
        <div className="relative overflow-hidden px-4 pt-4 pb-6"
          style={{ background: "linear-gradient(160deg, #2C2C2A 0%, #3C3489 100%)" }}>
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #FAC775, transparent)" }} />
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full mb-3"
              style={{ background: "rgba(250,199,117,0.15)", color: "#FAC775", border: "1px solid rgba(250,199,117,0.3)" }}>
              ✦ AI 분석 완료
            </div>
            <p className="text-white font-bold text-lg mb-1">壬水 일간 · 정관격</p>
            <p className="text-sm" style={{ color: "#b0aec8" }}>양력 1990년 5월 15일 · 申시생 · 남성</p>
            <div className="flex justify-center gap-4 mt-4">
              {[["종합운", "87"], ["재물운", "72"], ["연애운", "91"], ["건강운", "78"]].map(([lbl, score]) => (
                <div key={lbl} className="text-center">
                  <div className="text-xl font-bold" style={{ color: "#FAC775" }}>{score}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: "#8a88a0" }}>{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="px-4 space-y-4 mt-4">

          {/* ── 사주 팔자 ── */}
          <div className="rounded-2xl p-5"
            style={{ background: "#2C2C2A", border: "1px solid rgba(250,199,117,0.12)" }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-white">사주 팔자 (四柱八字)</h2>
              <span className="text-xs px-2 py-0.5 rounded-full"
                style={{ background: "rgba(250,199,117,0.1)", color: "#FAC775" }}>壬水 일간</span>
            </div>
            <div className="grid grid-cols-4 gap-2">
              {PILLARS.map((p) => (
                <div key={p.label} className="flex flex-col items-center">
                  <div className="text-[10px] mb-1.5 font-medium" style={{ color: "#8a88a0" }}>{p.label}</div>
                  {/* 천간 */}
                  <div className="w-full rounded-xl py-3 flex flex-col items-center gap-1 mb-1.5"
                    style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${SKY_COLORS[p.sky] ?? "#FAC775"}40` }}>
                    <span className="text-2xl font-bold" style={{ color: SKY_COLORS[p.sky] ?? "#FAC775" }}>{p.sky}</span>
                    <span className="text-[10px]" style={{ color: "#8a88a0" }}>{p.skyName}</span>
                  </div>
                  {/* 지지 */}
                  <div className="w-full rounded-xl py-3 flex flex-col items-center gap-1"
                    style={{ background: "rgba(60,52,137,0.2)", border: "1px solid rgba(60,52,137,0.35)" }}>
                    <span className="text-2xl font-bold" style={{ color: "#b0aec8" }}>{p.earth}</span>
                    <span className="text-[10px]" style={{ color: "#8a88a0" }}>{p.earthName}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {PILLARS.map((p) => (
                <p key={p.label} className="text-[9px] text-center leading-tight" style={{ color: "#6a6880" }}>
                  {p.skyDesc}
                </p>
              ))}
            </div>
          </div>

          {/* ── 오행 분포 ── */}
          <div className="rounded-2xl p-5"
            style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="text-sm font-bold text-white mb-4">오행 분포 (五行)</h2>
            <div className="space-y-3">
              {FIVE_ELEMENTS.map((el) => {
                const c = ELEMENT_COLORS[el.name];
                return (
                  <div key={el.name} className="flex items-center gap-3">
                    <div className="w-14 text-right">
                      <span className="text-xs font-bold" style={{ color: c.text }}>{el.label}</span>
                    </div>
                    <div className="flex-1 h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(255,255,255,0.06)" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${el.pct}%`, background: c.text }} />
                    </div>
                    <div className="w-8 text-xs text-right" style={{ color: "#8a88a0" }}>{el.pct}%</div>
                    <div className="w-20 text-[10px]" style={{ color: "#6a6880" }}>{el.desc}</div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 rounded-xl p-3"
              style={{ background: "rgba(250,199,117,0.08)", border: "1px solid rgba(250,199,117,0.15)" }}>
              <p className="text-xs" style={{ color: "#b0aec8" }}>
                <span style={{ color: "#FAC775" }}>💡 오행 해석 — </span>
                金(금) 기운이 가장 강하여 결단력·의지력이 뛰어납니다. 水(수)가 약하니 지구력을 보완하는 것이 과제입니다.
                木(목) 기운으로 창의적 에너지도 풍부한 사주입니다.
              </p>
            </div>
          </div>

          {/* ── 대운 타임라인 ── */}
          <div className="rounded-2xl p-5"
            style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
            <h2 className="text-sm font-bold text-white mb-4">대운 흐름 (大運)</h2>
            <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
              {DAYUN.map((d) => (
                <div key={d.age} className="flex-shrink-0 flex flex-col items-center rounded-xl px-3 py-3 min-w-[68px]"
                  style={d.active
                    ? { background: "linear-gradient(135deg, #3C3489, #4e46b0)", border: "1px solid rgba(250,199,117,0.4)" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  {d.active && <div className="text-[9px] font-bold mb-1.5" style={{ color: "#FAC775" }}>현재</div>}
                  <div className="text-xl font-bold mb-0.5" style={{ color: d.active ? "#FAC775" : "#c8c4d8" }}>{d.stem}</div>
                  <div className="text-base" style={{ color: d.active ? "#b0aec8" : "#8a88a0" }}>{d.branch}</div>
                  <div className="text-[9px] mt-1.5" style={{ color: d.active ? "#90caf9" : "#6a6880" }}>{d.age}세</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── AI 통변 섹션들 ── */}
          {SECTIONS.map((sec) => <ResultSection key={sec.id} sec={sec} />)}

          {/* ── 전문 상담사 연결 ── */}
          <div className="rounded-2xl p-5"
            style={{ background: "linear-gradient(135deg, rgba(60,52,137,0.3), rgba(250,199,117,0.05))", border: "1px solid rgba(60,52,137,0.4)" }}>
            <div className="text-center mb-4">
              <p className="text-xs font-semibold mb-1" style={{ color: "#FAC775" }}>AI 분석을 넘어선 심층 상담</p>
              <h3 className="text-base font-bold text-white">전문 상담사와 1:1 상담</h3>
              <p className="text-xs mt-1" style={{ color: "#8a88a0" }}>AI가 찾아낸 핵심 포인트를 전문가가 직접 풀어드립니다</p>
            </div>
            <div className="space-y-2 mb-4">
              {RECOMMEND_COUNSELORS.map((c) => (
                <Link key={c.id} href={`/consultants/${c.id}`}>
                  <div className="flex items-center gap-3 rounded-xl px-4 py-3 transition-all active:scale-[0.98]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white"
                        style={{ background: `linear-gradient(135deg, ${c.color}, #FAC775)` }}>{c.initial}</div>
                      {c.available && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2"
                        style={{ background: "#4caf50", borderColor: "#2C2C2A" }} />}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-bold text-white">{c.name}</div>
                      <div className="text-xs" style={{ color: "#8a88a0" }}>{c.title} · ★ {c.rating} ({c.reviews.toLocaleString()})</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold" style={{ color: "#FAC775" }}>{c.price}</div>
                      <div className="text-[10px] mt-0.5" style={{ color: "#4caf50" }}>상담 가능</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/consultants">
              <button className="w-full py-3 rounded-xl text-sm font-bold transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #3C3489, #4e46b0)", color: "#FAC775" }}>
                전체 상담사 보기 →
              </button>
            </Link>
          </div>

        </div>
      </main>

      {/* 고정 하단 버튼 */}
      <div className="fixed bottom-0 z-50 px-4 py-4"
        style={{
          background: "linear-gradient(to top, #1a1a18 70%, transparent)",
          width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}>
        <div className="flex gap-2">
          <button onClick={handleSave}
            className="flex-1 py-3.5 rounded-xl text-sm font-semibold transition-all active:scale-95 flex items-center justify-center gap-2"
            style={{ border: "1px solid rgba(250,199,117,0.3)", color: "#FAC775", background: "rgba(250,199,117,0.08)" }}>
            <IconShare /> 결과 저장
          </button>
          <Link href="/consultants" className="flex-1">
            <button className="w-full py-3.5 rounded-xl text-sm font-bold transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #3C3489, #FAC775)", color: "#1a1a18", boxShadow: "0 4px 20px rgba(60,52,137,0.4)" }}>
              상담사 연결하기
            </button>
          </Link>
        </div>
      </div>

      {/* 저장 토스트 */}
      {saveToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl text-sm font-semibold text-white"
          style={{ background: "rgba(60,52,137,0.95)", border: "1px solid rgba(250,199,117,0.3)" }}>
          ✓ 결과가 저장되었습니다
        </div>
      )}
    </div>
  );
}
