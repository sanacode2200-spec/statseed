import Link from "next/link";

const TILES = [
  {
    href: "/dashboard/descriptive",
    icon: "📋",
    title: "記述統計",
    desc: "平均・SD・中央値・IQR・95%CI・正規性検定",
    color: "#0072B2",
  },
  {
    href: "/dashboard/test",
    icon: "🔬",
    title: "統計検定",
    desc: "t検定・Mann-Whitney・ANOVA・χ²・相関など9種",
    color: "#009E73",
  },
  {
    href: "/dashboard/graph",
    icon: "📊",
    title: "グラフ作成",
    desc: "箱ひげ図・ヒストグラム・散布図。PNG/SVG/PDF論文出力",
    color: "#E69F00",
  },
  {
    href: "/dashboard/guide",
    icon: "🗺️",
    title: "検定選択ガイド",
    desc: "質問に答えるだけで最適な検定を提案。統計初学者でも迷わない",
    color: "#CC79A7",
  },
  {
    href: "/dashboard/data",
    icon: "📂",
    title: "データ読み込み",
    desc: "CSV・Excelをアップロードして列ごとの概要を確認。値をコピーして解析に使用",
    color: "#56B4E9",
  },
];

export default function DashboardHome() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">ダッシュボード</h1>
      <p className="text-gray-500 text-sm mb-8">解析したい内容を選んでください。</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {TILES.map((tile) => (
          <Link
            key={tile.href}
            href={tile.href}
            className="group bg-white rounded-xl border border-gray-100 shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="text-3xl mb-3">{tile.icon}</div>
            <h2
              className="font-semibold text-base mb-1 group-hover:opacity-80 transition-opacity"
              style={{ color: tile.color }}
            >
              {tile.title}
            </h2>
            <p className="text-sm text-gray-500">{tile.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
