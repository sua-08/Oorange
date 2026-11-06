import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Orange Task Farm",
  description: "큰 목표를 아주 작은 시작으로 바꾸는 오렌지 할 일 측정소",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
