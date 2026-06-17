"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import BottomNav from "../components/BottomNav";

const EARTHLY_BRANCHES = [
  { char: "子", name: "자시", time: "23~01", animal: "🐭" },
  { char: "丑", name: "축시", time: "01~03", animal: "🐮" },
  { char: "寅", name: "인시", time: "03~05", animal: "🐯" },
  { char: "卯", name: "묘시", time: "05~07", animal: "🐰" },
  { char: "辰", name: "진시", time: "07~09", animal: "🐲" },
  { char: "巳", name: "사시", time: "09~11", animal: "🐍" },
  { char: "午", name: "오시", time: "11~13", animal: "🐴" },
  { char: "未", name: "미시", time: "13~15", animal: "🐑" },
  { char: "申", name: "신시", time: "15~17", animal: "🐵" },
  { char: "酉", name: "유시", time: "17~19", animal: "🐓" },
  { char: "戌", name: "술시", time: "19~21", animal: "🐶" },
  { char: "亥", name: "해시", time: "21~23", animal: "🐷" },
];

const AI_OPTIONS = [
  { id: "basic", label: "사주 기본 분석", desc: "일간·월간·사주 전반", icon: "✦", required: true },
  { id: "dayun", label: "대운·세운 흐름", desc: "10년 대운 및 올해 세운", icon: "🌊", required: false },
  { id: "career", label: "직업·재물운", desc: "직업적성, 사업 타이밍", icon: "💼", required: false },
  { id: "love", label: "연애·궁합운", desc: "인연, 결혼, 연애 운세", icon: "💕", required: false },
  { id: "health", label: "건강·체질", desc: "오행 체질 분석", icon: "🌿", required: false },
  { id: "name", label: "이름 분석", desc: "성명학 에너지 분석", icon: "🖋️", required: false },
];

const HOUR_MAP: Record<string, number> = {
  "子시(23~01)": 0, "丑시(01~03)": 1, "寅시(03~05)": 2, "卯시(05~07)": 3,
  "辰시(07~09)": 4, "巳시(09~11)": 5, "午시(11~13)": 6, "未시(13~15)": 7,
  "申시(15~17)": 8, "酉시(17~19)": 9, "戌시(19~21)": 10, "亥시(21~23)": 11,
};

function BirthDateInput({ year, month, day, setYear, setMonth, setDay }: {
  year: string; month: string; day: string;
  setYear: (v: string) => void; setMonth: (v: string) => void; setDay: (v: string) => void;
}) {
  const inputStyle = { background: "#1a1a18", border: "1px solid rgba(255,255,255,0.12)", color: "#FAC775", colorScheme: "dark" as const };
  return (
    <div className="flex gap-2">
      <div className="flex-1">
        <input type="number" placeholder="년도" value={year} min={1900} max={2025}
          onChange={(e) => setYear(e.target.value)}
          className="w-full rounded-xl px-3 py-3 text-sm outline-none text-center"
          style={{ ...inputStyle, color: year ? "#FAC775" : "#8a88a0" }} />
        <p className="text-center text-[10px] mt-1" style={{ color: "#8a88a0" }}>년</p>
      </div>
      <div className="w-16">
        <select value={month} onChange={(e) => setMonth(e.target.value)}
          className="w-full rounded-xl px-2 py-3 text-sm outline-none appearance-none text-center"
          style={{ ...inputStyle, color: month ? "#FAC775" : "#8a88a0" }}>
          <option value="">월</option>
          {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
        </select>
        <p className="text-center text-[10px] mt-1" style={{ color: "#8a88a0" }}>월</p>
      </div>
      <div className="w-16">
        <select value={day} onChange={(e) => setDay(e.target.value)}
          className="w-full rounded-xl px-2 py-3 text-sm outline-none appearance-none text-center"
          style={{ ...inputStyle, color: day ? "#FAC775" : "#8a88a0" }}>
          <option value="">일</option>
          {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={String(i + 1)}>{i + 1}</option>)}
        </select>
        <p className="text-center text-[10px] mt-1" style={{ color: "#8a88a0" }}>일</p>
      </div>
    </div>
  );
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 justify-center">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="rounded-full transition-all"
          style={{ width: i === current - 1 ? "24px" : "6px", height: "6px",
            background: i < current ? "#FAC775" : i === current - 1 ? "#FAC775" : "rgba(255,255,255,0.15)" }} />
      ))}
    </div>
  );
}

function SectionHeader({ step, icon, title, desc }: { step: number; icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #3C3489, #4e46b0)" }}>{icon}</div>
      <div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(250,199,117,0.15)", color: "#FAC775" }}>STEP {step}</span>
        <h3 className="text-sm font-bold text-white mt-0.5">{title}</h3>
        <p className="text-xs" style={{ color: "#8a88a0" }}>{desc}</p>
      </div>
    </div>
  );
}

function ManseryeokContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initGender = (searchParams.get("gender") as "남" | "여") || "남";
  const initCalType = (searchParams.get("calType") as "양력" | "음력") || "양력";
  const initBirthDate = searchParams.get("birthDate") || "";
  const initBirthHour = searchParams.get("birthHour") || "";
  const parsedDate = initBirthDate ? initBirthDate.split("-") : ["", "", ""];

  const [gender, setGender] = useState<"남" | "여">(initGender);
  const [calType, setCalType] = useState<"양력" | "음력">(initCalType);
  const [year, setYear] = useState(parsedDate[0] || "");
  const [month, setMonth] = useState(parsedDate[1] ? String(parseInt(parsedDate[1])) : "");
  const [day, setDay] = useState(parsedDate[2] ? String(parseInt(parsedDate[2])) : "");
  const [selectedHour, setSelectedHour] = useState<number | null>(
    initBirthHour && initBirthHour !== "모름" ? (HOUR_MAP[initBirthHour] ?? null) : null
  );
  const [unknownHour, setUnknownHour] = useState(initBirthHour === "모름");
  const [aiOptions, setAiOptions] = useState<Record<string, boolean>>({
    basic: true, dayun: true, career: false, love: false, health: false, name: false,
  });

  const birthReady = !!year && !!month && !!day;
  const hourReady = unknownHour || selectedHour !== null;
  const readyToAnalyze = birthReady && hourReady;
  const enabledCount = Object.values(aiOptions).filter(Boolean).length;

  function toggleOption(id: string) {
    if (id === "basic") return;
    setAiOptions((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleAnalyze() {
    if (!readyToAnalyze) return;
    const params = new URLSearchParams();
    params.set("gender", gender);
    params.set("calType", calType);
    params.set("year", year);
    params.set("month", month);
    params.set("day", day);
    params.set("hour", unknownHour ? "모름" : String(selectedHour));
    params.set("options", Object.entries(aiOptions).filter(([, v]) => v).map(([k]) => k).join(","));
    router.push(`/manseryeok/result?${params.toString()}`);
  }

  return (
    <div className="min-h-screen" style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>
      <header className="fixed top-0 z-50 flex items-center justify-between px-4 py-4"
        style={{ background: "rgba(26,26,24,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)", width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)" }}>
        <Link href="/">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </Link>
        <div className="text-center">
          <div className="text-sm font-bold text-white">AI 만세력 분석</div>
          <StepIndicator current={readyToAnalyze ? 3 : birthReady ? 2 : 1} total={3} />
        </div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(60,52,137,0.3)" }}>
          <span style={{ color: "#FAC775", fontSize: "16px" }}>✦</span>
        </div>
      </header>

      <main className="pt-20 pb-36 px-4 space-y-5">
        <div className="rounded-2xl p-5" style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <SectionHeader step={1} icon="👤" title="기본 정보" desc="성별과 달력 방식을 선택해주세요" />
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="text-xs font-medium block mb-2" style={{ color: "#b0aec8" }}>성별</label>
              <div className="grid grid-cols-2 gap-2">
                {(["남", "여"] as const).map((g) => (
                  <button key={g} onClick={() => setGender(g)}
                    className="py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex flex-col items-center gap-1"
                    style={gender === g
                      ? { background: "#3C3489", color: "#FAC775", border: "1px solid rgba(250,199,117,0.3)" }
                      : { background: "rgba(255,255,255,0.04)", color: "#8a88a0", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-xl">{g === "남" ? "♂" : "♀"}</span><span>{g}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-medium block mb-2" style={{ color: "#b0aec8" }}>달력</label>
              <div className="grid grid-cols-2 gap-2">
                {(["양력", "음력"] as const).map((c) => (
                  <button key={c} onClick={() => setCalType(c)}
                    className="py-3 rounded-xl font-bold text-sm transition-all active:scale-95 flex flex-col items-center gap-1"
                    style={calType === c
                      ? { background: "#3C3489", color: "#FAC775", border: "1px solid rgba(250,199,117,0.3)" }
                      : { background: "rgba(255,255,255,0.04)", color: "#8a88a0", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <span className="text-xl">{c === "양력" ? "☀️" : "🌙"}</span><span>{c}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl p-5"
          style={{ background: "#2C2C2A", border: `1px solid ${birthReady ? "rgba(250,199,117,0.2)" : "rgba(255,255,255,0.07)"}` }}>
          <SectionHeader step={2} icon="📅" title="생년월일" desc={`${calType}으로 입력해주세요`} />
          <BirthDateInput year={year} month={month} day={day} setYear={setYear} setMonth={setMonth} setDay={setDay} />
        </div>

        <div className="rounded-2xl p-5"
          style={{ background: "#2C2C2A", border: `1px solid ${hourReady ? "rgba(250,199,117,0.2)" : "rgba(255,255,255,0.07)"}` }}>
          <SectionHeader step={3} icon="🕐" title="태어난 시 (시주)" desc="12지시 중 해당하는 시간을 선택하세요" />
          <button onClick={() => { setUnknownHour(!unknownHour); setSelectedHour(null); }}
            className="w-full py-2.5 rounded-xl text-sm font-medium mb-3 transition-all"
            style={unknownHour
              ? { background: "rgba(250,199,117,0.15)", color: "#FAC775", border: "1px solid rgba(250,199,117,0.3)" }
              : { background: "rgba(255,255,255,0.04)", color: "#8a88a0", border: "1px solid rgba(255,255,255,0.08)" }}>
            {unknownHour ? "✓ " : ""}태어난 시간을 모름
          </button>
          <div className={`grid grid-cols-4 gap-2 transition-opacity ${unknownHour ? "opacity-30 pointer-events-none" : "opacity-100"}`}>
            {EARTHLY_BRANCHES.map((b, i) => {
              const isSelected = selectedHour === i;
              return (
                <button key={b.char} onClick={() => { setSelectedHour(i); setUnknownHour(false); }}
                  className="flex flex-col items-center py-3 px-1 rounded-xl transition-all active:scale-95"
                  style={isSelected
                    ? { background: "#3C3489", border: "1px solid rgba(250,199,117,0.5)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <span className="text-base mb-0.5">{b.animal}</span>
                  <span className="text-base font-bold leading-none" style={{ color: isSelected ? "#FAC775" : "#e0dce8" }}>{b.char}</span>
                  <span className="text-[10px] mt-0.5" style={{ color: isSelected ? "#FAC775" : "#8a88a0" }}>{b.name}</span>
                  <span className="text-[9px] mt-0.5" style={{ color: isSelected ? "rgba(250,199,117,0.7)" : "#6a6880" }}>{b.time}</span>
                </button>
              );
            })}
          </div>
          {(selectedHour !== null || unknownHour) && (
            <div className="mt-3 rounded-xl px-4 py-2.5 flex items-center gap-2"
              style={{ background: "rgba(60,52,137,0.2)", border: "1px solid rgba(60,52,137,0.4)" }}>
              <span style={{ color: "#FAC775" }}>✓</span>
              <span className="text-sm text-white">
                {unknownHour ? "시주 미지정 (추정 분석)" : `${EARTHLY_BRANCHES[selectedHour!].char}시 (${EARTHLY_BRANCHES[selectedHour!].time}시) 선택됨`}
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl p-5" style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <SectionHeader step={4} icon="🤖" title="AI 통변 옵션" desc="원하는 분석 항목을 선택하세요" />
          <div className="space-y-2">
            {AI_OPTIONS.map((opt) => {
              const on = aiOptions[opt.id];
              return (
                <button key={opt.id} onClick={() => toggleOption(opt.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all active:scale-[0.98]"
                  style={on
                    ? { background: "rgba(60,52,137,0.25)", border: "1px solid rgba(60,52,137,0.5)" }
                    : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center gap-3">
                    <span className="text-xl w-7 text-center">{opt.icon}</span>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold" style={{ color: on ? "#FAC775" : "#c0bcd8" }}>{opt.label}</span>
                        {opt.required && <span className="text-[10px] px-1.5 py-0.5 rounded-full"
                          style={{ background: "rgba(250,199,117,0.2)", color: "#FAC775" }}>필수</span>}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#8a88a0" }}>{opt.desc}</div>
                    </div>
                  </div>
                  <div className="relative w-11 h-6 rounded-full flex-shrink-0 transition-all"
                    style={{ background: on ? "#3C3489" : "rgba(255,255,255,0.1)" }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full transition-all shadow-sm"
                      style={{ background: on ? "#FAC775" : "#8a88a0", left: on ? "calc(100% - 20px)" : "4px" }} />
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-3 text-xs text-center" style={{ color: "#8a88a0" }}>
            {enabledCount}개 항목 선택됨
          </div>
        </div>
      </main>

      <BottomNav />

      <div className="fixed bottom-0 z-50 px-4 py-4"
        style={{ background: "linear-gradient(to top, #1a1a18 70%, transparent)", width: "100%", maxWidth: "430px",
          left: "50%", transform: "translateX(-50%)", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 60px)" }}>
        {readyToAnalyze && (
          <div className="flex items-center justify-center gap-2 mb-3 flex-wrap">
            {[`${gender}성`, `${calType} ${year}.${month}.${day}`,
              unknownHour ? "시 미지정" : `${EARTHLY_BRANCHES[selectedHour!].char}시`].map((item) => (
              <span key={item} className="text-xs px-3 py-1 rounded-full"
                style={{ background: "rgba(60,52,137,0.3)", color: "#b0aec8", border: "1px solid rgba(60,52,137,0.4)" }}>
                {item}
              </span>
            ))}
          </div>
        )}
        <button
          onClick={handleAnalyze}
          disabled={!readyToAnalyze}
          className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
          style={readyToAnalyze
            ? { background: "linear-gradient(135deg, #3C3489 0%, #FAC775 100%)", color: "#1a1a18", boxShadow: "0 4px 24px rgba(60,52,137,0.5)" }
            : { background: "rgba(255,255,255,0.06)", color: "#8a88a0", cursor: "not-allowed" }}>
          {readyToAnalyze ? `✨ AI 만세력 분석 시작 (${enabledCount}개 항목)` : "생년월일을 먼저 입력해주세요"}
        </button>
      </div>
    </div>
  );
}

export default function ManseryeokPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#1a1a18" }}>
        <div style={{ color: "#FAC775" }}>로딩 중...</div>
      </div>
    }>
      <ManseryeokContent />
    </Suspense>
  );
}
