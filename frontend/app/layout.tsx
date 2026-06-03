import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Statseed — コメディカル向け医療統計",
  description: "PT・OT・ST・看護師など医療従事者向けの統計解析Webアプリ。論文品質グラフ出力対応。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className="antialiased bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
