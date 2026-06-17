"use client";

import { useState } from "react";
import Link from "next/link";

// ─── 타입 ───
type Step = 1 | 2 | 3 | 4;
type ConsultType = "30min" | "60min" | "90min";
type ConsultMode = "chat" | "voice" | "video";

// ─── 상담사 목업 ───
const COUNSELOR = {
  id: 1, name: "이명연", title: "사주·운명 전문가",
  rating: 4.9, reviews: 1243, initial: "이", color: "#3C3489",
  available: true, experience: 18,
};

const CONSULT_TYPES: { key: ConsultType; label: string; duration: string; price: number; desc: string }[] = [
  { key: "30min", label: "기본 상담", duration: "30분", price: 30000, desc: "사주 기본 분석 + 현재 운세 핵심 정리" },
  { key: "60min", label: "심층 상담", duration: "60분", price: 60000, desc: "대운·세운·직업·연애운 전반 분석" },
  { key: "90min", label: "종합 상담", duration: "90분", price: 75000, desc: "전 분야 심층 분석 + 질의응답 무제한" },
];

const CONSULT_MODES: { key: ConsultMode; icon: string; label: string; desc: string }[] = [
  { key: "chat", icon: "💬", label: "채팅 상담", desc: "텍스트로 편하게 대화" },
  { key: "voice", icon: "🎙️", label: "음성 상담", desc: "전화처럼 목소리로 대화" },
  { key: "video", icon: "📹", label: "화상 상담", desc: "얼굴 보며 깊은 상담" },
];

const TIME_SLOTS = [
  { date: "오늘 (6/17)", day: "화", slots: ["14:00", "15:00", "16:30"] },
  { date: "내일 (6/18)", day: "수", slots: ["10:00", "11:00", "13:00", "15:00", "16:00"] },
  { date: "6/19", day: "목", slots: ["10:00", "14:00", "17:00"] },
  { date: "6/20", day: "금", slots: ["09:00", "11:00", "13:00", "15:00"] },
  { date: "6/21", day: "토", slots: ["10:00", "11:00", "12:00"] },
];

const CONCERN_TAGS = [
  "연애·짝사랑", "결혼 타이밍", "이직·취업", "사업·창업",
  "재물·투자", "진로 방향", "건강", "가족 관계",
  "이사·풍수", "이름·작명", "올해 운세", "기타",
];

// ─── 유틸 ───
function BackBtn({ href }: { href: string }) {
  return (
    <Link href={href}>
      <button className="w-9 h-9 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.06)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
    </Link>
  );
}

function StepBar({ current }: { current: Step }) {
  const labels = ["상담 유형", "날짜·시간", "고민 입력", "최종 확인"];
  return (
    <div className="flex items-center gap-0">
      {labels.map((lbl, i) => {
        const n = (i + 1) as Step;
        const done = n < current;
        const active = n === current;
        return (
          <div key={lbl} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all"
                style={done
                  ? { background: "#FAC775", color: "#1a1a18" }
                  : active
                  ? { background: "#3C3489", color: "#FAC775", border: "2px solid #FAC775" }
                  : { background: "rgba(255,255,255,0.08)", color: "#6a6880" }}>
                {done ? "✓" : n}
              </div>
              <span className="text-[9px] whitespace-nowrap"
                style={{ color: active ? "#FAC775" : done ? "#b0aec8" : "#6a6880" }}>
                {lbl}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className="flex-1 h-px mx-1 mb-3.5 transition-all"
                style={{ background: done ? "#FAC775" : "rgba(255,255,255,0.08)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Step 1: 상담 유형 선택 ───
function Step1({
  consultType, setConsultType,
  consultMode, setConsultMode,
}: {
  consultType: ConsultType | null; setConsultType: (v: ConsultType) => void;
  consultMode: ConsultMode | null; setConsultMode: (v: ConsultMode) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🗂️</span>
          <div>
            <h3 className="text-sm font-bold text-white">상담 시간 선택</h3>
            <p className="text-xs" style={{ color: "#8a88a0" }}>상담 목적에 맞는 시간을 선택하세요</p>
          </div>
        </div>
        <div className="space-y-2">
          {CONSULT_TYPES.map((t) => (
            <button key={t.key} onClick={() => setConsultType(t.key)}
              className="w-full rounded-xl p-4 text-left transition-all active:scale-[0.98]"
              style={consultType === t.key
                ? { background: "rgba(60,52,137,0.3)", border: "1px solid rgba(250,199,117,0.4)" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                    style={consultType === t.key
                      ? { borderColor: "#FAC775", background: "#FAC775" }
                      : { borderColor: "#6a6880", background: "transparent" }}>
                    {consultType === t.key && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold" style={{ color: consultType === t.key ? "#FAC775" : "#e0dce8" }}>
                        {t.label}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(255,255,255,0.07)", color: "#8a88a0" }}>{t.duration}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: "#8a88a0" }}>{t.desc}</p>
                  </div>
                </div>
                <span className="text-sm font-bold flex-shrink-0" style={{ color: consultType === t.key ? "#FAC775" : "#c8c4d8" }}>
                  {t.price.toLocaleString()}원
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">📡</span>
          <div>
            <h3 className="text-sm font-bold text-white">상담 방식 선택</h3>
            <p className="text-xs" style={{ color: "#8a88a0" }}>편한 방식으로 진행합니다</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CONSULT_MODES.map((m) => (
            <button key={m.key} onClick={() => setConsultMode(m.key)}
              className="flex flex-col items-center py-4 px-2 rounded-xl transition-all active:scale-95"
              style={consultMode === m.key
                ? { background: "rgba(60,52,137,0.35)", border: "1px solid rgba(250,199,117,0.4)" }
                : { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <span className="text-2xl mb-1.5">{m.icon}</span>
              <span className="text-xs font-semibold" style={{ color: consultMode === m.key ? "#FAC775" : "#c8c4d8" }}>
                {m.label}
              </span>
              <span className="text-[10px] mt-0.5 text-center leading-tight" style={{ color: "#8a88a0" }}>
                {m.desc}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Step 2: 날짜·시간 ───
function Step2({ selected, setSelected }: {
  selected: string | null; setSelected: (v: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl px-4 py-3" style={{ background: "rgba(250,199,117,0.08)", border: "1px solid rgba(250,199,117,0.2)" }}>
        <p className="text-xs" style={{ color: "#b0aec8" }}>
          <span style={{ color: "#FAC775" }}>💡 </span>
          상담 시작 1시간 전까지 무료 취소 가능합니다
        </p>
      </div>
      {TIME_SLOTS.map((group) => (
        <div key={group.date} className="rounded-2xl p-4"
          style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-sm font-bold text-white">{group.date}</span>
            <span className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.06)", color: "#8a88a0" }}>{group.day}</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {group.slots.map((slot) => {
              const key = `${group.date}-${slot}`;
              const on = selected === key;
              return (
                <button key={slot} onClick={() => setSelected(on ? null : key)}
                  className="py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                  style={on
                    ? { background: "#3C3489", color: "#FAC775", border: "1px solid rgba(250,199,117,0.5)" }
                    : { background: "rgba(255,255,255,0.04)", color: "#c8c4d8", border: "1px solid rgba(255,255,255,0.08)" }}>
                  {slot}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 3: 고민 입력 ───
function Step3({ concern, setConcern, selectedTags, toggleTag }: {
  concern: string; setConcern: (v: string) => void;
  selectedTags: string[]; toggleTag: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xl">🏷️</span>
          <div>
            <h3 className="text-sm font-bold text-white">상담 주제 (복수 선택)</h3>
            <p className="text-xs" style={{ color: "#8a88a0" }}>어떤 부분이 궁금하신가요?</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {CONCERN_TAGS.map((tag) => {
            const on = selectedTags.includes(tag);
            return (
              <button key={tag} onClick={() => toggleTag(tag)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                style={on
                  ? { background: "#3C3489", color: "#FAC775", border: "1px solid rgba(250,199,117,0.3)" }
                  : { background: "rgba(255,255,255,0.04)", color: "#8a88a0", border: "1px solid rgba(255,255,255,0.08)" }}>
                {on ? "✓ " : ""}{tag}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl p-5" style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl">✍️</span>
          <div>
            <h3 className="text-sm font-bold text-white">고민 내용 (선택)</h3>
            <p className="text-xs" style={{ color: "#8a88a0" }}>미리 알려주시면 더 정확한 상담이 가능해요</p>
          </div>
        </div>
        <textarea
          value={concern}
          onChange={(e) => setConcern(e.target.value)}
          placeholder="예) 올해 이직을 고민 중인데 현재 회사에 계속 다니는 게 좋을지, 새 회사로 옮기는 게 좋을지 고민입니다..."
          rows={5}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
          style={{
            background: "#1a1a18",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e0dce8",
            colorScheme: "dark",
          }}
        />
        <div className="flex justify-between mt-1.5">
          <p className="text-xs" style={{ color: "#6a6880" }}>상담 내용은 상담사에게만 공개됩니다</p>
          <span className="text-xs" style={{ color: concern.length > 400 ? "#ef9a9a" : "#6a6880" }}>
            {concern.length}/500
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Step 4: 최종 확인 ───
function Step4({
  consultType, consultMode, slot, concern, selectedTags,
}: {
  consultType: ConsultType | null;
  consultMode: ConsultMode | null;
  slot: string | null;
  concern: string;
  selectedTags: string[];
}) {
  const typeInfo = CONSULT_TYPES.find((t) => t.key === consultType);
  const modeInfo = CONSULT_MODES.find((m) => m.key === consultMode);

  const rows: { label: string; value: string }[] = [
    { label: "상담사", value: `${COUNSELOR.name} · ${COUNSELOR.title}` },
    { label: "상담 유형", value: typeInfo ? `${typeInfo.label} (${typeInfo.duration})` : "-" },
    { label: "상담 방식", value: modeInfo ? `${modeInfo.icon} ${modeInfo.label}` : "-" },
    { label: "날짜·시간", value: slot ? slot.replace("-", " ") : "-" },
  ];

  return (
    <div className="space-y-4">
      {/* 예약 요약 */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: "#2C2C2A", border: "1px solid rgba(250,199,117,0.15)" }}>
        <div className="flex items-center gap-3 px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${COUNSELOR.color}, #FAC775)` }}>
            {COUNSELOR.initial}
          </div>
          <div>
            <div className="font-bold text-white">{COUNSELOR.name}</div>
            <div className="text-xs mt-0.5" style={{ color: "#b0aec8" }}>{COUNSELOR.title}</div>
            <div className="text-xs mt-0.5" style={{ color: "#FAC775" }}>★ {COUNSELOR.rating} · 후기 {COUNSELOR.reviews.toLocaleString()}</div>
          </div>
        </div>
        <div className="px-5 py-3 space-y-3">
          {rows.map(({ label, value }) => (
            <div key={label} className="flex items-start justify-between gap-4">
              <span className="text-xs flex-shrink-0" style={{ color: "#8a88a0" }}>{label}</span>
              <span className="text-xs text-right font-medium" style={{ color: "#e0dce8" }}>{value}</span>
            </div>
          ))}
          {selectedTags.length > 0 && (
            <div className="flex items-start justify-between gap-4">
              <span className="text-xs flex-shrink-0" style={{ color: "#8a88a0" }}>상담 주제</span>
              <div className="flex flex-wrap gap-1 justify-end">
                {selectedTags.map((t) => (
                  <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(60,52,137,0.3)", color: "#b0aec8" }}>{t}</span>
                ))}
              </div>
            </div>
          )}
          {concern && (
            <div>
              <span className="text-xs block mb-1" style={{ color: "#8a88a0" }}>고민 내용</span>
              <p className="text-xs leading-relaxed rounded-xl px-3 py-2.5 line-clamp-3"
                style={{ background: "#1a1a18", color: "#b0aec8" }}>{concern}</p>
            </div>
          )}
        </div>
      </div>

      {/* 결제 요약 */}
      <div className="rounded-2xl p-5"
        style={{ background: "linear-gradient(135deg, rgba(60,52,137,0.25), rgba(250,199,117,0.06))", border: "1px solid rgba(60,52,137,0.4)" }}>
        <h3 className="text-sm font-bold text-white mb-3">결제 정보</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span style={{ color: "#b0aec8" }}>{typeInfo?.label} ({typeInfo?.duration})</span>
            <span style={{ color: "#e0dce8" }}>{typeInfo?.price.toLocaleString()}원</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#b0aec8" }}>할인</span>
            <span style={{ color: "#4caf50" }}>-0원</span>
          </div>
          <div className="h-px mt-2 mb-2" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="flex justify-between">
            <span className="font-bold text-white">최종 결제</span>
            <span className="text-lg font-bold" style={{ color: "#FAC775" }}>
              {typeInfo?.price.toLocaleString()}원
            </span>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: "#8a88a0" }}>
          <span>💳</span>
          <span>카드·간편결제·계좌이체 가능</span>
        </div>
      </div>

      {/* 유의사항 */}
      <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        {["상담 시작 1시간 전까지 무료 취소 가능합니다.", "취소 후에는 동일 금액이 즉시 환불됩니다.", "상담 내용은 철저히 비밀이 보장됩니다."].map((t) => (
          <p key={t} className="text-xs flex gap-2" style={{ color: "#8a88a0" }}>
            <span style={{ color: "#FAC775" }}>·</span>{t}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ───
export default function BookingPage() {
  const [step, setStep] = useState<Step>(1);
  const [consultType, setConsultType] = useState<ConsultType | null>(null);
  const [consultMode, setConsultMode] = useState<ConsultMode | null>(null);
  const [slot, setSlot] = useState<string | null>(null);
  const [concern, setConcern] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [done, setDone] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }

  const canNext =
    step === 1 ? !!(consultType && consultMode) :
    step === 2 ? !!slot :
    step === 3 ? true :
    true;

  function handleNext() {
    if (step < 4) setStep((s) => (s + 1) as Step);
    else setDone(true);
  }

  const typeInfo = CONSULT_TYPES.find((t) => t.key === consultType);

  // 완료 화면
  if (done) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>
        <div className="text-7xl mb-6 animate-bounce">🎉</div>
        <h1 className="text-2xl font-bold text-white mb-2">예약 완료!</h1>
        <p className="text-sm mb-1" style={{ color: "#b0aec8" }}>
          {COUNSELOR.name} 상담사와의 예약이 완료되었습니다.
        </p>
        <p className="text-sm" style={{ color: "#8a88a0" }}>
          {slot?.replace("-", " ")} · {typeInfo?.duration}
        </p>
        <div className="w-full mt-8 p-5 rounded-2xl text-left space-y-3"
          style={{ background: "#2C2C2A", border: "1px solid rgba(250,199,117,0.2)" }}>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ background: "#4caf50" }} />
            <span className="text-xs font-semibold" style={{ color: "#4caf50" }}>예약 확정</span>
          </div>
          {[
            ["상담사", COUNSELOR.name],
            ["일시", slot?.replace("-", " ") ?? ""],
            ["방식", CONSULT_MODES.find((m) => m.key === consultMode)?.label ?? ""],
            ["결제 금액", `${typeInfo?.price.toLocaleString()}원`],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between text-sm">
              <span style={{ color: "#8a88a0" }}>{k}</span>
              <span style={{ color: "#e0dce8", fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-3 w-full mt-6">
          <Link href="/mypage" className="flex-1">
            <button className="w-full py-3.5 rounded-xl text-sm font-semibold"
              style={{ border: "1px solid rgba(250,199,117,0.3)", color: "#FAC775", background: "rgba(250,199,117,0.08)" }}>
              마이페이지
            </button>
          </Link>
          <Link href="/" className="flex-1">
            <button className="w-full py-3.5 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #3C3489, #FAC775)", color: "#1a1a18" }}>
              홈으로
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>
      {/* 헤더 */}
      <header className="fixed top-0 z-50 px-4 pt-4 pb-3"
        style={{
          background: "rgba(26,26,24,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)",
        }}>
        <div className="flex items-center justify-between mb-3">
          <BackBtn href={step === 1 ? "/consultants/1" : "#"} />
          <span className="text-sm font-bold text-white">상담 예약</span>
          <div className="w-9" />
        </div>
        <StepBar current={step} />
      </header>

      {/* 상담사 미니 카드 */}
      <div className="pt-28 px-4 pb-2">
        <div className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${COUNSELOR.color}, #FAC775)` }}>
            {COUNSELOR.initial}
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-white">{COUNSELOR.name}</div>
            <div className="text-xs" style={{ color: "#8a88a0" }}>{COUNSELOR.title} · ★ {COUNSELOR.rating}</div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ background: "#4caf50" }} />
            <span className="text-xs" style={{ color: "#4caf50" }}>상담 가능</span>
          </div>
        </div>
      </div>

      <main className="px-4 pt-3 pb-40 space-y-4">
        {step === 1 && <Step1 consultType={consultType} setConsultType={setConsultType} consultMode={consultMode} setConsultMode={setConsultMode} />}
        {step === 2 && <Step2 selected={slot} setSelected={setSlot} />}
        {step === 3 && <Step3 concern={concern} setConcern={setConcern} selectedTags={selectedTags} toggleTag={toggleTag} />}
        {step === 4 && <Step4 consultType={consultType} consultMode={consultMode} slot={slot} concern={concern} selectedTags={selectedTags} />}
      </main>

      {/* 하단 버튼 */}
      <div className="fixed bottom-0 z-50 px-4 py-4"
        style={{
          background: "linear-gradient(to top, #1a1a18 70%, transparent)",
          width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)",
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)",
        }}>
        {step > 1 && (
          <button onClick={() => setStep((s) => (s - 1) as Step)}
            className="w-full mb-2 py-3 rounded-xl text-sm font-semibold transition-all"
            style={{ border: "1px solid rgba(255,255,255,0.1)", color: "#8a88a0", background: "transparent" }}>
            ← 이전 단계
          </button>
        )}
        <button onClick={handleNext} disabled={!canNext}
          className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
          style={canNext
            ? { background: "linear-gradient(135deg, #3C3489 0%, #FAC775 100%)", color: "#1a1a18", boxShadow: "0 4px 20px rgba(60,52,137,0.4)" }
            : { background: "rgba(255,255,255,0.06)", color: "#6a6880", cursor: "not-allowed" }}>
          {step === 4 ? "💳 결제하고 예약 완료" : `다음 단계 (${step}/4)`}
        </button>
      </div>
    </div>
  );
}
