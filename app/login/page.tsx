"use client";

import { useState } from "react";
import Link from "next/link";

type AuthTab = "login" | "signup";

function IconEye({ show }: { show: boolean }) {
  return show ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function InputField({
  label, type = "text", placeholder, value, onChange, rightEl,
}: {
  label: string; type?: string; placeholder: string;
  value: string; onChange: (v: string) => void; rightEl?: React.ReactNode;
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1.5" style={{ color: "#b0aec8" }}>{label}</label>
      <div className="relative">
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-xl px-4 py-3.5 text-sm outline-none"
          style={{
            background: "#1a1a18",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#e0dce8",
            colorScheme: "dark",
          }}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
    </div>
  );
}

// ─── 소셜 로그인 버튼 ───
const SOCIAL = [
  { key: "kakao", label: "카카오로 계속하기", bg: "#FEE500", color: "#191919", icon: "💬" },
  { key: "naver", label: "네이버로 계속하기", bg: "#03C75A", color: "#fff", icon: "N" },
  { key: "google", label: "Google로 계속하기", bg: "#fff", color: "#333", icon: "G" },
  { key: "apple", label: "Apple로 계속하기", bg: "#000", color: "#fff", icon: "🍎" },
];

function SocialButtons() {
  return (
    <div className="space-y-2.5">
      {SOCIAL.map((s) => (
        <button key={s.key}
          className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2.5 transition-all active:scale-[0.98]"
          style={{ background: s.bg, color: s.color, border: s.key === "google" ? "1px solid rgba(0,0,0,0.12)" : "none" }}>
          <span className="text-base leading-none">{s.icon}</span>
          {s.label}
        </button>
      ))}
    </div>
  );
}

// ─── 로그인 폼 ───
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !pw) { setError("이메일과 비밀번호를 입력해주세요."); return; }
    if (!email.includes("@")) { setError("올바른 이메일 형식을 입력해주세요."); return; }
    setError("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="이메일" type="email" placeholder="example@email.com" value={email} onChange={setEmail} />
      <InputField
        label="비밀번호" type={showPw ? "text" : "password"} placeholder="비밀번호 입력"
        value={pw} onChange={setPw}
        rightEl={
          <button type="button" onClick={() => setShowPw(!showPw)} style={{ color: "#8a88a0" }}>
            <IconEye show={showPw} />
          </button>
        }
      />
      {error && <p className="text-xs px-1" style={{ color: "#ef9a9a" }}>{error}</p>}
      <div className="flex items-center justify-between text-xs">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded" style={{ accentColor: "#3C3489" }} />
          <span style={{ color: "#8a88a0" }}>로그인 유지</span>
        </label>
        <button type="button" className="transition-all" style={{ color: "#FAC775" }}>
          비밀번호 찾기
        </button>
      </div>
      <button type="submit"
        className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
        style={{ background: "linear-gradient(135deg, #3C3489 0%, #FAC775 100%)", color: "#1a1a18", boxShadow: "0 4px 20px rgba(60,52,137,0.4)" }}>
        로그인
      </button>
    </form>
  );
}

// ─── 회원가입 폼 ───
function SignupForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [error, setError] = useState("");

  const pwMatch = pw === pwConfirm && pw.length > 0;
  const pwStrength = pw.length === 0 ? 0 : pw.length < 6 ? 1 : pw.length < 10 ? 2 : 3;
  const strengthLabel = ["", "약함", "보통", "강함"][pwStrength];
  const strengthColor = ["", "#ef9a9a", "#ffcc80", "#81c784"][pwStrength];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !email || !pw || !pwConfirm) { setError("모든 항목을 입력해주세요."); return; }
    if (!email.includes("@")) { setError("올바른 이메일 형식을 입력해주세요."); return; }
    if (!pwMatch) { setError("비밀번호가 일치하지 않습니다."); return; }
    if (!agree) { setError("필수 약관에 동의해주세요."); return; }
    setError("");
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <InputField label="이름" placeholder="홍길동" value={name} onChange={setName} />
      <InputField label="이메일" type="email" placeholder="example@email.com" value={email} onChange={setEmail} />
      <div>
        <InputField
          label="비밀번호" type={showPw ? "text" : "password"} placeholder="8자 이상 입력"
          value={pw} onChange={setPw}
          rightEl={
            <button type="button" onClick={() => setShowPw(!showPw)} style={{ color: "#8a88a0" }}>
              <IconEye show={showPw} />
            </button>
          }
        />
        {pw.length > 0 && (
          <div className="flex items-center gap-2 mt-1.5 px-1">
            <div className="flex gap-1 flex-1">
              {[1, 2, 3].map((n) => (
                <div key={n} className="flex-1 h-1 rounded-full transition-all"
                  style={{ background: n <= pwStrength ? strengthColor : "rgba(255,255,255,0.08)" }} />
              ))}
            </div>
            <span className="text-xs" style={{ color: strengthColor }}>{strengthLabel}</span>
          </div>
        )}
      </div>
      <div>
        <InputField label="비밀번호 확인" type="password" placeholder="비밀번호 재입력"
          value={pwConfirm} onChange={setPwConfirm} />
        {pwConfirm.length > 0 && (
          <p className="text-xs mt-1 px-1" style={{ color: pwMatch ? "#81c784" : "#ef9a9a" }}>
            {pwMatch ? "✓ 비밀번호가 일치합니다" : "✗ 비밀번호가 일치하지 않습니다"}
          </p>
        )}
      </div>

      {/* 약관 동의 */}
      <div className="rounded-xl p-4 space-y-3" style={{ background: "#1a1a18", border: "1px solid rgba(255,255,255,0.07)" }}>
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={agree && agreeMarketing}
            onChange={(e) => { setAgree(e.target.checked); setAgreeMarketing(e.target.checked); }}
            className="w-4 h-4" style={{ accentColor: "#3C3489" }} />
          <span className="text-sm font-semibold text-white">전체 동의</span>
        </label>
        <div className="h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
        {[
          { label: "[필수] 이용약관 동의", val: agree, set: setAgree, link: true },
          { label: "[필수] 개인정보 처리방침 동의", val: agree, set: setAgree, link: true },
          { label: "[선택] 마케팅 정보 수신 동의", val: agreeMarketing, set: setAgreeMarketing, link: false },
        ].map((item) => (
          <label key={item.label} className="flex items-center justify-between cursor-pointer">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={item.val} onChange={(e) => item.set(e.target.checked)}
                className="w-4 h-4" style={{ accentColor: "#3C3489" }} />
              <span className="text-xs" style={{ color: "#b0aec8" }}>{item.label}</span>
            </div>
            {item.link && <span className="text-xs" style={{ color: "#6a6880" }}>보기 &gt;</span>}
          </label>
        ))}
      </div>

      {error && <p className="text-xs px-1" style={{ color: "#ef9a9a" }}>{error}</p>}
      <button type="submit"
        className="w-full py-4 rounded-xl font-bold text-base tracking-wide transition-all active:scale-95"
        style={{ background: "linear-gradient(135deg, #3C3489 0%, #FAC775 100%)", color: "#1a1a18", boxShadow: "0 4px 20px rgba(60,52,137,0.4)" }}>
        회원가입 완료
      </button>
    </form>
  );
}

export default function LoginPage() {
  const [tab, setTab] = useState<AuthTab>("login");
  const [success, setSuccess] = useState(false);
  const [signupDone, setSignupDone] = useState(false);

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>
        <div className="text-7xl mb-6">🎉</div>
        <h2 className="text-2xl font-bold text-white mb-2">환영합니다!</h2>
        <p className="text-sm mb-8" style={{ color: "#b0aec8" }}>명연재연구소에 로그인되었습니다.</p>
        <Link href="/" className="w-full">
          <button className="w-full py-4 rounded-xl font-bold text-base"
            style={{ background: "linear-gradient(135deg, #3C3489, #FAC775)", color: "#1a1a18" }}>
            홈으로 이동
          </button>
        </Link>
      </div>
    );
  }

  if (signupDone) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
        style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>
        <div className="text-7xl mb-6">✅</div>
        <h2 className="text-2xl font-bold text-white mb-2">가입 완료!</h2>
        <p className="text-sm mb-2" style={{ color: "#b0aec8" }}>명연재연구소 회원이 되었습니다.</p>
        <p className="text-xs mb-8" style={{ color: "#8a88a0" }}>가입 혜택으로 AI 만세력 1회 무료 제공</p>
        <Link href="/" className="w-full">
          <button className="w-full py-4 rounded-xl font-bold text-base"
            style={{ background: "linear-gradient(135deg, #3C3489, #FAC775)", color: "#1a1a18" }}>
            서비스 시작하기
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 pt-4 pb-3">
        <Link href="/">
          <button className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold text-white"
            style={{ background: "linear-gradient(135deg, #3C3489, #FAC775)" }}>명</div>
          <span className="text-sm font-bold" style={{ color: "#FAC775" }}>명연재연구소</span>
        </div>
        <div className="w-9" />
      </header>

      <main className="px-5 pb-12">
        {/* 상단 타이틀 */}
        <div className="text-center mb-8 mt-4">
          <h1 className="text-2xl font-bold text-white mb-1">
            {tab === "login" ? "다시 만나요 👋" : "처음 오셨나요? 🌟"}
          </h1>
          <p className="text-sm" style={{ color: "#8a88a0" }}>
            {tab === "login"
              ? "로그인하고 나만의 운세를 확인하세요"
              : "가입하고 AI 만세력 1회 무료로 받으세요"}
          </p>
        </div>

        {/* 소셜 로그인 */}
        <SocialButtons />

        {/* 구분선 */}
        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
          <span className="text-xs" style={{ color: "#6a6880" }}>또는 이메일로 계속하기</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>

        {/* 탭 */}
        <div className="flex rounded-xl overflow-hidden mb-5"
          style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
          {(["login", "signup"] as AuthTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className="flex-1 py-2.5 text-sm font-semibold transition-all"
              style={tab === t
                ? { background: "#3C3489", color: "#FAC775" }
                : { background: "transparent", color: "#8a88a0" }}>
              {t === "login" ? "로그인" : "회원가입"}
            </button>
          ))}
        </div>

        {/* 폼 */}
        {tab === "login"
          ? <LoginForm onSuccess={() => setSuccess(true)} />
          : <SignupForm onSuccess={() => setSignupDone(true)} />
        }

        {/* 전환 링크 */}
        <p className="text-center text-xs mt-6" style={{ color: "#8a88a0" }}>
          {tab === "login" ? "아직 계정이 없으신가요? " : "이미 계정이 있으신가요? "}
          <button onClick={() => setTab(tab === "login" ? "signup" : "login")}
            className="font-semibold" style={{ color: "#FAC775" }}>
            {tab === "login" ? "회원가입" : "로그인"}
          </button>
        </p>
      </main>
    </div>
  );
}
