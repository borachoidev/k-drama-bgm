import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "K-Drama BGM - 나만의 드라마 배경음악 만들기",
  description:
    "K-Drama 장르와 감정에 맞는 완벽한 배경음악을 AI로 생성하세요. 로맨스, 스릴러, 사극 등 다양한 장르의 BGM을 손쉽게 만들 수 있습니다.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
