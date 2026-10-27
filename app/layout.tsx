import type { Metadata, Viewport } from "next";
import Nav from "./Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "셀러AI - 상품명·키워드·상세문구 30초 생성",
  description:
    "스마트스토어·쿠팡 셀러를 위한 상품등록 AI 도우미. 상품명, 검색 키워드, 상세 설명 문구를 30초 만에 만들어 보세요.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Nav />
        {children}
      </body>
    </html>
  );
}
