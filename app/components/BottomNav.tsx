"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "홈",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z" />
      </svg>
    ),
  },
  {
    href: "/manseryeok",
    label: "만세력",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    href: "/consultants",
    label: "상담",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" />
      </svg>
    ),
  },
  {
    href: "/mypage",
    label: "MY",
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  return (
    <nav
      className="fixed bottom-0 z-50 flex items-stretch"
      style={{
        background: "#2C2C2A",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        width: "100%",
        maxWidth: "430px",
        left: "50%",
        transform: "translateX(-50%)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {TABS.map((tab) => {
        const active = isActive(tab.href);
        return (
          <Link key={tab.href} href={tab.href} className="flex-1">
            <div
              className="flex flex-col items-center justify-center gap-1 py-3 relative w-full transition-all"
              style={{ color: active ? "#FAC775" : "#8a88a0" }}
            >
              {active && (
                <div
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                  style={{ background: "#FAC775" }}
                />
              )}
              {tab.icon}
              <span style={{ fontSize: "10px", fontWeight: active ? 600 : 400 }}>
                {tab.label}
              </span>
            </div>
          </Link>
        );
      })}
    </nav>
  );
}
