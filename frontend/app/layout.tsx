import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const inter = localFont({
  src: "./fonts/GeistVF.woff",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

const lineSeedJP = localFont({
  src: [
    {
      path: "../public/fonts/line-seed-jp/LINESeedJP_OTF_Th.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../public/fonts/line-seed-jp/LINESeedJP_OTF_Rg.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/line-seed-jp/LINESeedJP_OTF_Bd.woff2",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/line-seed-jp/LINESeedJP_OTF_Eb.woff2",
      weight: "800",
      style: "normal",
    },
  ],
  variable: "--font-line-seed-jp",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Statseed — コメディカル向け医療統計",
  description: "PT・OT・ST・看護師など、医療従事者の研究を解析から報告まで支える統計解析Webアプリ。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja" suppressHydrationWarning className={`${inter.variable} ${lineSeedJP.variable}`}>
      <head>
        {/* dark mode flash prevention */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='light'){return;}document.documentElement.classList.add('dark');if(!t){localStorage.setItem('theme','dark');}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="antialiased bg-gray-50 dark:bg-[#0a0a0a] min-h-screen">
        {children}
      </body>
    </html>
  );
}
