import Link from "next/link";

const FEATURES = [
  {
    icon: "📊",
    title: "記述統計",
    desc: "平均・SD・中央値・IQR・95%CI・正規性検定を自動計算。Table 1形式で出力可能。",
  },
  {
    icon: "🔬",
    title: "統計検定",
    desc: "t検定・Mann-Whitney・ANOVA・χ²検定など9種類。効果量・解釈文を自動生成。",
  },
  {
    icon: "🖼️",
    title: "論文品質グラフ",
    desc: "色覚多様性対応パレット。300dpi PNG / SVG / PDF 出力。学会発表・論文投稿に即使用可。",
  },
  {
    icon: "🗺️",
    title: "検定選択ガイド",
    desc: "データの種類・分布・対応有無を答えるだけで最適な検定を提案。統計初学者でも迷わない。",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold" style={{ color: "#0072B2" }}>
          Statseed
        </span>
        <Link
          href="/dashboard"
          className="text-sm px-4 py-2 rounded-md text-white font-medium transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0072B2" }}
        >
          解析をはじめる
        </Link>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-20 bg-white">
        <p className="text-sm font-medium mb-3 tracking-wide" style={{ color: "#0072B2" }}>
          PT / OT / ST / 看護師 / 臨床検査技師 向け
        </p>
        <h1 className="text-4xl font-bold mb-5" style={{ color: "#373737" }}>
          医療統計を、もっとかんたんに。
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mb-10">
          インストール不要・完全無料。ブラウザだけで統計解析から論文品質グラフ出力まで。
        </p>
        <Link
          href="/dashboard"
          className="px-8 py-3 rounded-lg text-white text-base font-semibold shadow transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0072B2" }}
        >
          無料で使ってみる
        </Link>
      </section>

      {/* Features */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
          {FEATURES.map((f) => (
            <div key={f.title} className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-base mb-1" style={{ color: "#373737" }}>
                {f.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-100 text-center text-xs text-gray-400 py-6">
        © 2025 Statseed
      </footer>
    </div>
  );
}
