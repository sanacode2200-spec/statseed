import Link from "next/link";

const STATS = [
  { label: "テスト通過", value: "54", sub: "backend/tests/" },
  { label: "APIエンドポイント", value: "14", sub: "実装済み" },
  { label: "統計検定", value: "9種", sub: "t / ANOVA / χ² …" },
  { label: "グラフ形式", value: "3種", sub: "PNG / SVG / PDF" },
];

const FEATURES = [
  {
    href: "/dashboard/descriptive",
    title: "記述統計",
    desc: "平均・SD・中央値・IQR・95%CI・カテゴリ頻度",
    color: "#0072B2",
    tags: ["連続変数", "カテゴリ変数"],
    icon: ChartBarIcon,
  },
  {
    href: "/dashboard/test",
    title: "統計検定",
    desc: "9種類の検定。効果量・解釈文を自動生成",
    color: "#009E73",
    tags: ["t検定", "ANOVA", "χ²", "相関"],
    icon: FlaskIcon,
  },
  {
    href: "/dashboard/graph",
    title: "グラフ作成",
    desc: "300dpi PNG / SVG / PDF。フォントプリセット対応",
    color: "#E69F00",
    tags: ["箱ひげ図", "ヒストグラム", "散布図"],
    icon: GraphIcon,
  },
  {
    href: "/dashboard/guide",
    title: "検定選択ガイド",
    desc: "5ステップで最適な検定を提案",
    color: "#CC79A7",
    tags: ["初学者向け"],
    icon: CompassIcon,
  },
  {
    href: "/dashboard/data",
    title: "データ読み込み",
    desc: "CSV・Excel をアップロードして変数確認",
    color: "#56B4E9",
    tags: ["CSV", "Excel", "欠損値検出"],
    icon: FolderIcon,
  },
];

const FLOW = [
  { n: "01", label: "データ読み込み", href: "/dashboard/data" },
  { n: "02", label: "検定ガイド", href: "/dashboard/guide" },
  { n: "03", label: "解析を実行", href: "/dashboard/test" },
  { n: "04", label: "グラフ出力", href: "/dashboard/graph" },
];

export default function DashboardHome() {
  return (
    <div className="flex gap-6 items-start">

      {/* ── 左カラム: 概要 ── */}
      <div className="flex-1 min-w-0 space-y-5">

        {/* ヘッダー */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600">
              Overview
            </span>
            <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium"
              style={{ color: "#009E73", backgroundColor: "rgba(0,158,115,0.1)", border: "1px solid rgba(0,158,115,0.3)" }}>
              Phase 1 完了
            </span>
          </div>
          <h1 className="text-[24px] font-bold text-gray-900 dark:text-white tracking-tight">
            Statseed
          </h1>
          <p className="text-[13px] text-gray-400 dark:text-neutral-600 mt-0.5">
            コメディカル向け医療統計 Web アプリ
          </p>
        </div>

        {/* ステータスカード */}
        <div className="grid grid-cols-2 gap-2">
          {STATS.map(({ label, value, sub }) => (
            <div key={label}
              className="bg-white dark:bg-[#111] border border-gray-200 dark:border-neutral-900 rounded-lg px-4 py-3">
              <div className="text-[22px] font-bold text-gray-900 dark:text-white leading-tight">{value}</div>
              <div className="text-[12px] font-medium text-gray-600 dark:text-neutral-400 mt-0.5">{label}</div>
              <div className="text-[11px] text-gray-400 dark:text-neutral-600 mt-0.5 font-mono">{sub}</div>
            </div>
          ))}
        </div>

        {/* 解析の流れ */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-2">
            Quick Start
          </div>
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-neutral-900 rounded-lg divide-y divide-gray-100 dark:divide-neutral-900">
            {FLOW.map(({ n, label, href }) => (
              <Link key={n} href={href}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-neutral-950 transition-colors group">
                <span className="text-[11px] font-mono text-gray-300 dark:text-neutral-700 w-4 shrink-0">{n}</span>
                <span className="text-[13px] text-gray-700 dark:text-neutral-300 flex-1">{label}</span>
                <span className="text-gray-300 dark:text-neutral-800 group-hover:text-gray-500 dark:group-hover:text-neutral-500 transition-colors">
                  <ChevronRight />
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* 技術スタック */}
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-2">
            Stack
          </div>
          <div className="bg-white dark:bg-[#111] border border-gray-200 dark:border-neutral-900 rounded-lg divide-y divide-gray-100 dark:divide-neutral-900">
            {[
              { label: "Frontend", value: "Next.js 14 + TypeScript" },
              { label: "Backend", value: "FastAPI (Python 3.11+)" },
              { label: "計算", value: "scipy · statsmodels · pandas" },
              { label: "インフラ", value: "Vercel + Railway" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center px-4 py-2.5 gap-4">
                <span className="text-[11px] font-medium text-gray-400 dark:text-neutral-600 w-20 shrink-0">{label}</span>
                <span className="text-[12px] text-gray-600 dark:text-neutral-400 font-mono">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 右カラム: 機能 ── */}
      <div className="w-[300px] shrink-0 space-y-3">
        <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-2">
          機能
        </div>
        {FEATURES.map(({ href, title, desc, color, tags, icon: Icon }) => (
          <Link key={href} href={href}
            className="group block bg-white dark:bg-[#111] border border-gray-200 dark:border-neutral-900 rounded-lg px-4 py-3
              hover:border-gray-300 dark:hover:border-neutral-700 transition-all">
            <div className="flex items-center gap-2 mb-1.5">
              <span style={{ color }}><Icon /></span>
              <span className="text-[13px] font-semibold text-gray-900 dark:text-white flex-1">{title}</span>
              <ChevronRight />
            </div>
            <p className="text-[12px] text-gray-400 dark:text-neutral-600 leading-relaxed mb-2">{desc}</p>
            <div className="flex flex-wrap gap-1">
              {tags.map(t => (
                <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-900 text-gray-400 dark:text-neutral-600">
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

    </div>
  );
}

/* ── SVG ── */
function ChartBarIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="12" width="4" height="9" /><rect x="10" y="7" width="4" height="14" /><rect x="17" y="3" width="4" height="18" /></svg>;
}
function FlaskIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M9 3h6m-6 0v7L4.5 19a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L15 10V3" /></svg>;
}
function GraphIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>;
}
function CompassIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>;
}
function FolderIcon() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>;
}
function ChevronRight() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-neutral-800 group-hover:text-gray-400 dark:group-hover:text-neutral-600 transition-colors"><polyline points="9 18 15 12 9 6" /></svg>;
}
