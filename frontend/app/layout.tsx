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
    <html lang="ja" suppressHydrationWarning>
      <head>
        {/* dark mode flash prevention */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased bg-gray-50 dark:bg-[#0a0a0a] min-h-screen">
        {children}
      </body>
    </html>
  );
}
