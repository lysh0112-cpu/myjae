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
/* ★2026-09-10 — 홈 화면에 «바로가기» 를 만들 때 쓰는 이름과 아이콘입니다.
 *   [겪은 일]  대표님 폰 홈 화면에 ★검은 동그라미로 깔렸습니다.
 *   [까닭]     manifest 가 «없고» 아이콘도 favicon.ico 하나뿐이라
 *              안드로이드가 그릴 그림을 «못 찾았습니다».
 *   [고침]     public/manifest.json · icon-192 · icon-512 · apple-touch-icon 신설
 *
 *   ⚠️ 이름을 ★「명연재연구소」 → 「명연재」 로 줄였습니다.
 *      홈 화면 아이콘 밑은 ★글자가 잘립니다. 짧아야 다 보입니다.
 *      ⛔ 카카오 콘솔의 앱 이름도 「명연재」입니다. 맞춰 두었습니다.
 *
 *   ⛔ 아이콘을 바꾸실 때는 ★넷을 «함께» 바꾸십시오 —
 *      public/icon-192.png · icon-512.png · apple-touch-icon.png · app/favicon.ico
 *      그리고 ★카카오 콘솔의 앱 아이콘도 같은 그림이어야 합니다.
 *   ⚠️ icon-192·512 는 ★여백을 20% 두었습니다. 안드로이드가 «동그랗게 잘라내는데»
 *      여백이 없으면 M·Y 의 끝이 잘립니다. ⛔ 여백을 없애지 마십시오. */
export const metadata: Metadata = {
  title: "명연재",
  description: "사주 · 적성 · 택일 · 작명 — 전통 명리와 AI로 보는 내 운명",
  manifest: "/manifest.json",
  applicationName: "명연재",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "명연재",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#FDF6F0",
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
