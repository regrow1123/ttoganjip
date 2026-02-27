import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "또간집 - 재방문이 증명하는 진짜 맛집",
  description:
    "재방문 횟수로 검증된 맛집을 지도에서 발견하세요. 영수증 인증으로 포인트를 얻고, 숨겨진 맛집을 확인하세요.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">{children}</body>
    </html>
  );
}
