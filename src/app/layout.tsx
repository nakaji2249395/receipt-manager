import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Deep session 支払い請求",
  description: "スタッフ向け支払い請求・管理システム",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
