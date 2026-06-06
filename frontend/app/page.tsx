import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  {
    icon: "📊",
    title: "記述統計",
    desc: "平均・SD・中央値・IQR・95%CI・正規性検定を自動計算。カテゴリ変数の頻度・割合にも対応。",
  },
  {
    icon: "🔬",
    title: "統計検定",
    desc: "t検定・Mann-Whitney・ANOVA・χ²検定など9種類。効果量・解釈文を自動生成。",
  },
  {
    icon: "📈",
    title: "論文品質グラフ",
    desc: "色覚多様性対応パレット。300dpi PNG / SVG / PDF 出力。フォントプリセット切り替え対応。",
  },
  {
    icon: "🗺️",
    title: "検定選択ガイド",
    desc: "データの種類・分布・対応有無を答えるだけで最適な検定を提案。統計初学者でも迷わない。",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-[#0a0a0a]">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-neutral-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-[30px] h-[30px] rounded-md overflow-hidden shrink-0">
            <Image src="/sana2.png" alt="Statseed" width={30} height={30} className="w-full h-full object-cover" />
          </div>
          <span className="text-[20px] font-semibold tracking-tight text-gray-900 dark:text-white">
            Statseed
          </span>
        </div>
        <Link
          href="/dashboard"
          className="text-[13px] px-3 py-1.5 rounded-md font-medium transition-colors bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100"
        >
          解析をはじめる
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24">
        <div className="mb-6">
          <div className="w-[72px] h-[72px] rounded-2xl overflow-hidden mx-auto shadow-md">
            <Image src="/sana2.png" alt="Statseed" width={72} height={72} className="w-full h-full object-cover" />
          </div>
        </div>
        <p className="text-[15px] font-medium mb-3 tracking-wide text-gray-500 dark:text-neutral-400">
          PT / OT / ST / 看護師 / 臨床検査技師 向け
        </p>
        <h1 className="text-[40px] font-bold mb-5 text-gray-900 dark:text-white">
          医療統計を、もっとかんたんに。
        </h1>
        <p className="text-[20px] text-gray-500 dark:text-neutral-400 max-w-xl mb-10">
          インストール不要・完全無料。ブラウザだけで統計解析から論文品質グラフ出力まで。
        </p>
        <Link
          href="/dashboard"
          className="px-8 py-3 rounded-lg text-[18px] font-semibold transition-colors bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-100"
        >
          無料で使ってみる
        </Link>
      </section>

      {/* Features */}
      <section className="bg-gray-50 dark:bg-[#111111] border-t border-gray-200 dark:border-neutral-800 px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-gray-200 dark:border-neutral-800"
            >
              <div className="text-[26px] mb-3">{f.icon}</div>
              <h3 className="font-semibold text-[15px] mb-1 text-gray-900 dark:text-white">{f.title}</h3>
              <p className="text-[15px] text-gray-500 dark:text-neutral-400 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-neutral-800 text-center text-[13px] text-gray-400 dark:text-neutral-600 py-6">
        © 2025 Statseed
      </footer>
    </div>
  );
}
