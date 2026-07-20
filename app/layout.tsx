import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AutoLogout from "./components/AutoLogout";
import { FortuneCacheProvider } from "./manseryeok/components/FortuneCache";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: "명연재연구소",
  description: "AI 만세력과 전문 상담사를 통한 사주·운세 서비스",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ko"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full" style={{ background: "#FDF6F0" }}>
        <AutoLogout />
        {/* 운세 담아두기 — 화면을 오갈 때 DB를 다시 안 보도록 (AI 호출 횟수와는 무관) */}
        <FortuneCacheProvider>
          {children}
        </FortuneCacheProvider>
      </body>
    </html>
  );
}
