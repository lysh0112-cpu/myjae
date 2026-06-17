"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import BottomNav from "../components/BottomNav";

// ─── 데이터 ───
const ALL_COUNSELORS = [
  { id: 1, name: "이명연", title: "사주·운명 전문가", experience: 18, tags: ["사주팔자", "궁합", "진로", "이직"], rating: 4.9, reviews: 1243, price: 30000, available: true, initial: "이", color: "#3C3489", category: "사주", badge: "인기", intro: "18년 경력의 정통 명리학 전문가. 1만 건 이상의 상담 경험.", totalConsult: 12480 },
  { id: 2, name: "박진수", title: "풍수지리·명리 연구가", experience: 12, tags: ["명리학", "풍수", "이사", "묘지"], rating: 4.8, reviews: 892, price: 25000, available: true, initial: "박", color: "#5a3d8a", category: "풍수", badge: "", intro: "풍수지리와 명리학을 결합한 종합적 운세 분석.", totalConsult: 6720 },
  { id: 3, name: "김서연", title: "타로·사주 상담사", experience: 9, tags: ["타로", "연애운", "재물운", "직업운"], rating: 4.9, reviews: 2104, price: 20000, available: false, initial: "김", color: "#2a5a8a", category: "타로", badge: "신규", intro: "심리 타로와 사주를 접목한 감성적 상담 전문가.", totalConsult: 8900 },
  { id: 4, name: "최하늘", title: "신점·사주 대가", experience: 22, tags: ["신점", "사업운", "이직", "건강"], rating: 5.0, reviews: 3210, price: 50000, available: true, initial: "최", color: "#7a3060", category: "사주", badge: "베스트", intro: "22년 전통 신점과 현대 명리학의 조화로 정확도 최고.", totalConsult: 21500 },
  { id: 5, name: "정도운", title: "수비학·명리 전문가", experience: 15, tags: ["수비학", "이름", "작명", "개명"], rating: 4.7, reviews: 567, price: 35000, available: true, initial: "정", color: "#2a6a5a", category: "작명", badge: "", intro: "성명학과 수비학으로 이름의 에너지를 분석합니다.", totalConsult: 4230 },
  { id: 6, name: "오미래", title: "연애·궁합 전문가", experience: 8, tags: ["궁합", "연애", "결혼", "이별"], rating: 4.8, reviews: 1890, price: 22000, available: true, initial: "오", color: "#8a2a60", category: "궁합", badge: "인기", intro: "연애·결혼 전문 상담으로 수천 쌍의 인연을 이어왔습니다.", totalConsult: 9800 },
  { id: 7, name: "한동원", title: "재물·사업운 전문", experience: 20, tags: ["재물운", "사업", "투자", "부동산"], rating: 4.9, reviews: 978, price: 45000, available: false, initial: "한", color: "#4a6a2a", category: "재물", badge: "", intro: "사업가 출신 명리학자. 실전 재물운 상담 전문.", totalConsult: 7600 },
  { id: 8, name: "윤지은", title: "건강·체질 명리사", experience: 11, tags: ["건강운", "체질", "오행", "음식"], rating: 4.6, reviews: 432, price: 28000, available: true, initial: "윤", color: "#6a4a2a", category: "건강", badge: "", intro: "오행 체질 분석으로 건강 관리법과 운세를 함께 알려드립니다.", totalConsult: 3100 },
];

const CATEGORIES = ["전체", "사주", "궁합", "재물", "타로", "풍수", "작명", "건강"];
const SORT_OPTIONS = [
  { value: "recommend", label: "추천순" },
  { value: "reviews", label: "후기 많은순" },
  { value: "price_asc", label: "가격 낮은순" },
  { value: "career", label: "경력 높은순" },
  { value: "rating", label: "평점순" },
];

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function IconFilter() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <line x1="4" y1="6" x2="20" y2="6" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="11" y1="18" x2="13" y2="18" />
    </svg>
  );
}

type SortKey = "recommend" | "reviews" | "price_asc" | "career" | "rating";

function sortCounselors(list: typeof ALL_COUNSELORS, sort: SortKey) {
  return [...list].sort((a, b) => {
    if (sort === "reviews") return b.reviews - a.reviews;
    if (sort === "price_asc") return a.price - b.price;
    if (sort === "career") return b.experience - a.experience;
    if (sort === "rating") return b.rating - a.rating;
    return b.totalConsult - a.totalConsult;
  });
}

function CounselorListCard({ c }: { c: typeof ALL_COUNSELORS[0] }) {
  return (
    <Link href={`/consultants/${c.id}`}>
      <div className="rounded-2xl p-4 transition-all active:scale-[0.98]"
        style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.07)" }}>
        <div className="flex gap-3">
          {/* 아바타 */}
          <div className="relative flex-shrink-0">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${c.color}, #FAC775)` }}>
              {c.initial}
            </div>
            {c.available
              ? <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 flex items-center justify-center"
                  style={{ background: "#4caf50", borderColor: "#2C2C2A" }} />
              : <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2"
                  style={{ background: "#757575", borderColor: "#2C2C2A" }} />
            }
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-base">{c.name}</span>
                  {c.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: "rgba(250,199,117,0.15)", color: "#FAC775", border: "1px solid rgba(250,199,117,0.3)" }}>
                      {c.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs mt-0.5" style={{ color: "#b0aec8" }}>{c.title}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-sm font-bold" style={{ color: "#FAC775" }}>
                  {c.price.toLocaleString()}원~
                </div>
                <div className="text-[10px] mt-0.5" style={{ color: c.available ? "#4caf50" : "#757575" }}>
                  {c.available ? "● 상담 가능" : "● 대기 중"}
                </div>
              </div>
            </div>

            <p className="text-xs mt-1.5 leading-relaxed line-clamp-1" style={{ color: "#8a88a0" }}>{c.intro}</p>

            <div className="flex items-center gap-3 mt-2">
              <span className="text-xs" style={{ color: "#FAC775" }}>★ {c.rating}</span>
              <span className="text-xs" style={{ color: "#8a88a0" }}>후기 {c.reviews.toLocaleString()}</span>
              <span className="text-xs" style={{ color: "#8a88a0" }}>경력 {c.experience}년</span>
              <span className="text-xs" style={{ color: "#8a88a0" }}>총 {c.totalConsult.toLocaleString()}건</span>
            </div>

            <div className="flex flex-wrap gap-1 mt-2">
              {c.tags.slice(0, 3).map((tag) => (
                <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(60,52,137,0.25)", color: "#b0aec8" }}>#{tag}</span>
              ))}
            </div>
          </div>
        </div>

        <button
          className="w-full mt-3 py-2.5 rounded-xl text-xs font-bold transition-all active:scale-95"
          style={c.available
            ? { background: "linear-gradient(135deg, #3C3489, #4e46b0)", color: "#FAC775" }
            : { background: "rgba(255,255,255,0.05)", color: "#8a88a0" }}>
          {c.available ? "상담 신청하기" : "대기 목록 등록"}
        </button>
      </div>
    </Link>
  );
}

export default function ConsultantsPage() {
  const [category, setCategory] = useState("전체");
  const [sort, setSort] = useState<SortKey>("recommend");
  const [query, setQuery] = useState("");
  const [showSort, setShowSort] = useState(false);

  const filtered = useMemo(() => {
    let list = ALL_COUNSELORS;
    if (category !== "전체") list = list.filter((c) => c.category === category);
    if (query.trim()) list = list.filter((c) =>
      c.name.includes(query) || c.tags.some((t) => t.includes(query)) || c.title.includes(query)
    );
    return sortCounselors(list, sort);
  }, [category, sort, query]);

  const availableCount = filtered.filter((c) => c.available).length;

  return (
    <div className="min-h-screen" style={{ background: "#1a1a18", maxWidth: "430px", margin: "0 auto" }}>

      {/* 헤더 */}
      <header className="fixed top-0 z-50 px-4 pt-4 pb-3"
        style={{
          background: "rgba(26,26,24,0.97)", backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          width: "100%", maxWidth: "430px", left: "50%", transform: "translateX(-50%)",
        }}>
        <div className="flex items-center gap-3 mb-3">
          <Link href="/">
            <button className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.06)" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5 text-white">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          </Link>
          {/* 검색창 */}
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.08)" }}>
            <span style={{ color: "#8a88a0" }}><IconSearch /></span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름, 전문분야 검색"
              className="flex-1 bg-transparent outline-none text-sm"
              style={{ color: "#e0dce8" }}
            />
          </div>
          {/* 정렬 */}
          <div className="relative">
            <button onClick={() => setShowSort(!showSort)}
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: showSort ? "#3C3489" : "rgba(255,255,255,0.06)", color: showSort ? "#FAC775" : "#8a88a0" }}>
              <IconFilter />
            </button>
            {showSort && (
              <div className="absolute right-0 top-11 rounded-xl overflow-hidden z-50 w-40 shadow-2xl"
                style={{ background: "#2C2C2A", border: "1px solid rgba(255,255,255,0.1)" }}>
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value} onClick={() => { setSort(opt.value as SortKey); setShowSort(false); }}
                    className="w-full px-4 py-3 text-left text-sm transition-all"
                    style={sort === opt.value
                      ? { color: "#FAC775", background: "rgba(60,52,137,0.3)" }
                      : { color: "#c8c4d8" }}>
                    {sort === opt.value && "✓ "}{opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 카테고리 탭 */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
          {CATEGORIES.map((cat) => (
            <button key={cat} onClick={() => setCategory(cat)}
              className="flex-shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={category === cat
                ? { background: "#3C3489", color: "#FAC775" }
                : { background: "rgba(255,255,255,0.05)", color: "#8a88a0" }}>
              {cat}
            </button>
          ))}
        </div>
      </header>

      <BottomNav />
      <main className="pt-36 pb-24 px-4">

        {/* 결과 요약 */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs" style={{ color: "#8a88a0" }}>
            <span className="text-white font-semibold">{filtered.length}명</span> 의 상담사 ·{" "}
            <span style={{ color: "#4caf50" }}>{availableCount}명</span> 상담 가능
          </p>
          <span className="text-xs px-2 py-1 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)", color: "#8a88a0" }}>
            {SORT_OPTIONS.find((o) => o.value === sort)?.label}
          </span>
        </div>

        {/* 상담사 리스트 */}
        {filtered.length > 0 ? (
          <div className="space-y-3">
            {filtered.map((c) => <CounselorListCard key={c.id} c={c} />)}
          </div>
        ) : (
          <div className="flex flex-col items-center py-20">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-white font-semibold">검색 결과가 없습니다</p>
            <p className="text-xs mt-1" style={{ color: "#8a88a0" }}>다른 키워드나 카테고리로 검색해보세요</p>
            <button onClick={() => { setQuery(""); setCategory("전체"); }}
              className="mt-4 px-6 py-2.5 rounded-xl text-sm font-semibold"
              style={{ background: "#3C3489", color: "#FAC775" }}>
              필터 초기화
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
