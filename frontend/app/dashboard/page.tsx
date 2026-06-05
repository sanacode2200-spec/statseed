import Link from "next/link";

const FEATURES = [
  {
    href: "/dashboard/descriptive",
    title: "記述統計",
    desc: "平均・SD・中央値・IQR・95%CI・カテゴリ頻度",
    color: "#0072B2",
    icon: ChartBarIcon,
    tags: ["連続変数", "カテゴリ変数", "正規性検定"],
  },
  {
    href: "/dashboard/test",
    title: "統計検定",
    desc: "9種類の検定。効果量・解釈文を自動生成",
    color: "#009E73",
    icon: FlaskIcon,
    tags: ["t検定", "ANOVA", "χ²検定", "相関"],
  },
  {
    href: "/dashboard/graph",
    title: "グラフ作成",
    desc: "論文品質出力。300dpi PNG / SVG / PDF",
    color: "#E69F00",
    icon: GraphIcon,
    tags: ["箱ひげ図", "ヒストグラム", "散布図"],
  },
  {
    href: "/dashboard/guide",
    title: "検定選択ガイド",
    desc: "質問に答えるだけで最適な検定を提案",
    color: "#CC79A7",
    icon: CompassIcon,
    tags: ["初学者向け", "5ステップ"],
  },
  {
    href: "/dashboard/data",
    title: "データ読み込み",
    desc: "CSV・Excel をアップロードして変数を確認",
    color: "#56B4E9",
    icon: FolderIcon,
    tags: ["CSV", "Excel", "欠損値検出"],
  },
];

const FLOW = [
  { step: "01", label: "データ読み込み", sub: "CSV / Excel", href: "/dashboard/data" },
  { step: "02", label: "検定ガイド", sub: "どれを使う？", href: "/dashboard/guide" },
  { step: "03", label: "解析を実行", sub: "検定 / 記述統計", href: "/dashboard/test" },
  { step: "04", label: "グラフ出力", sub: "PNG / PDF", href: "/dashboard/graph" },
];

export default function DashboardHome() {
  return (
    <div className="space-y-10">

      {/* ── ヘッダー ── */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs font-medium px-2 py-0.5 rounded-full border"
            style={{ color: "#0072B2", borderColor: "#0072B2", backgroundColor: "rgba(0,114,178,0.08)" }}>
            Phase 1 完了
          </span>
          <span className="text-xs text-gray-400 dark:text-neutral-600">54 テスト通過</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
          Statseed
        </h1>
        <p className="text-sm text-gray-500 dark:text-neutral-500">
          コメディカル向け医療統計 Web アプリ。ブラウザで完結、完全日本語 UI、論文品質グラフ出力。
        </p>
      </div>

      {/* ── 機能カード ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-neutral-600 uppercase tracking-wider mb-3">機能</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map(({ href, title, desc, color, icon: Icon, tags }) => (
            <Link
              key={href}
              href={href}
              className="group relative flex flex-col bg-white dark:bg-[#111] border border-gray-200 dark:border-neutral-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-neutral-700 transition-all hover:shadow-sm"
            >
              {/* アイコン */}
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: `${color}18` }}>
                  <span style={{ color }}><Icon /></span>
                </div>
                <ChevronRight />
              </div>

              {/* テキスト */}
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</h3>
              <p className="text-xs text-gray-500 dark:text-neutral-500 leading-relaxed mb-3 flex-1">{desc}</p>

              {/* タグ */}
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <span key={tag}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 dark:bg-neutral-900 text-gray-500 dark:text-neutral-500">
                    {tag}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── 解析の流れ ── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 dark:text-neutral-600 uppercase tracking-wider mb-3">解析の流れ</h2>
        <div className="flex flex-col sm:flex-row gap-px bg-gray-200 dark:bg-neutral-800 rounded-xl overflow-hidden border border-gray-200 dark:border-neutral-800">
          {FLOW.map(({ step, label, sub, href }, i) => (
            <Link
              key={step}
              href={href}
              className="flex-1 flex items-center gap-3 bg-white dark:bg-[#111] px-4 py-4 hover:bg-gray-50 dark:hover:bg-neutral-900/60 transition-colors group"
            >
              <span className="text-[11px] font-mono font-bold text-gray-300 dark:text-neutral-700 w-5 shrink-0">{step}</span>
              <div className="min-w-0">
                <div className="text-sm font-medium text-gray-800 dark:text-neutral-200 truncate">{label}</div>
                <div className="text-xs text-gray-400 dark:text-neutral-600">{sub}</div>
              </div>
              {i < FLOW.length - 1 && (
                <span className="ml-auto text-gray-200 dark:text-neutral-800 hidden sm:block">
                  <ArrowRight />
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

/* ── SVG アイコン ── */

function ChartBarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="12" width="4" height="9" /><rect x="10" y="7" width="4" height="14" /><rect x="17" y="3" width="4" height="18" />
    </svg>
  );
}

function FlaskIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6m-6 0v7L4.5 19a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L15 10V3" />
    </svg>
  );
}

function GraphIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function CompassIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round"
      className="text-gray-300 dark:text-neutral-700 group-hover:text-gray-500 dark:group-hover:text-neutral-400 transition-colors">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
