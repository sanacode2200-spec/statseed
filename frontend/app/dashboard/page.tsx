import Link from "next/link";

const START_ACTIONS = [
  {
    href: "/dashboard/data",
    eyebrow: "データがある",
    title: "データを読み込んで始める",
    desc: "CSV・Excelを読み込み、列の種類や欠損値を確認してから解析します。",
    icon: FolderIcon,
    primary: true,
  },
  {
    href: "/dashboard/guide",
    eyebrow: "方法を相談したい",
    title: "解析方法を選ぶ",
    desc: "研究目的やデータについて答え、適した統計手法を確認します。",
    icon: CompassIcon,
    primary: false,
  },
  {
    href: "/dashboard/test",
    eyebrow: "すぐ計算したい",
    title: "手入力で解析する",
    desc: "少量のデータを貼り付けて、統計検定をすぐに実行します。",
    icon: FlaskIcon,
    primary: false,
  },
];

const WORKFLOWS = [
  { href: "/dashboard/descriptive", title: "データを要約", desc: "平均・中央値・ばらつき・欠損を確認", icon: ChartBarIcon },
  { href: "/dashboard/test", title: "群の差・関連を調べる", desc: "t検定・ANOVA・相関・カテゴリ比較", icon: FlaskIcon },
  { href: "/dashboard/regression", title: "要因を調べる", desc: "線形回帰・ロジスティック回帰・ポアソン回帰", icon: RegressionIcon },
  { href: "/dashboard/table1", title: "背景特性表を作る", desc: "SMD・n (%)・mean ± SDをまとめる", icon: TableIcon },
  { href: "/dashboard/graph", title: "伝わるグラフを作る", desc: "個別値を示し、論文・発表向けに出力", icon: GraphIcon },
];

const STANDARDS = [
  ["信頼できる計算", "SciPy・statsmodelsを利用し、効果量や95%信頼区間も表示します。"],
  ["判断に必要な情報", "解析使用数、除外数、欠損や前提に関する注意を結果と一緒に示します。"],
  ["伝わるグラフ", "色覚多様性や縮小表示に配慮し、PNG・SVG・PDFで出力できます。"],
];

export default function DashboardHome() {
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-8">
        <p className="text-[13px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600">ホーム</p>
        <h1 className="mt-2 text-[31px] font-bold tracking-tight text-gray-900 dark:text-white">何から始めますか？</h1>
        <p className="mt-2 text-[16px] text-gray-500 dark:text-neutral-500">データの準備状況に合わせて、最初の操作を選んでください。</p>
      </div>

      <section>
        <div className="grid gap-3 lg:grid-cols-3">
          {START_ACTIONS.map(({ href, eyebrow, title, desc, icon: Icon, primary }) => (
            <Link
              key={href}
              href={href}
              className={`group rounded-xl border p-5 transition-all hover:-translate-y-0.5 ${
                primary
                  ? "border-neutral-900 bg-neutral-900 text-white shadow-lg shadow-black/10 dark:border-white dark:bg-white dark:text-black"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-neutral-800 dark:bg-[#111] dark:hover:border-neutral-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[12px] font-semibold tracking-wider ${primary ? "text-neutral-400 dark:text-neutral-500" : "text-gray-400 dark:text-neutral-600"}`}>{eyebrow}</span>
                <Icon />
              </div>
              <h2 className={`mt-8 text-[19px] font-bold ${primary ? "dark:text-black" : ""}`}>{title}</h2>
              <p className={`mt-2 text-[14px] leading-6 ${primary ? "text-neutral-300 dark:text-neutral-600" : "text-gray-500 dark:text-neutral-500"}`}>{desc}</p>
              <span className="mt-5 inline-block text-[14px] font-semibold">始める →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
        <div>
          <h2 className="mb-3 text-[16px] font-semibold text-gray-800 dark:text-neutral-200">目的から選ぶ</h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-[#111]">
            {WORKFLOWS.map(({ href, title, desc, icon: Icon }) => (
              <Link key={href} href={href} className="group flex items-center gap-3 border-b border-gray-100 px-4 py-3.5 last:border-0 hover:bg-gray-50 dark:border-neutral-900 dark:hover:bg-neutral-950">
                <span className="text-gray-400 dark:text-neutral-600"><Icon /></span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-gray-800 dark:text-neutral-200">{title}</span>
                  <span className="mt-0.5 block text-[13px] text-gray-400 dark:text-neutral-600">{desc}</span>
                </span>
                <span className="text-gray-300 group-hover:text-gray-500 dark:text-neutral-700">→</span>
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h2 className="mb-3 text-[16px] font-semibold text-gray-800 dark:text-neutral-200">Statseedの基準</h2>
          <div className="space-y-3">
            {STANDARDS.map(([title, text], index) => (
              <div key={title} className="rounded-xl border border-gray-200 bg-white p-4 dark:border-neutral-800 dark:bg-[#111]">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[12px] text-gray-300 dark:text-neutral-700">0{index + 1}</span>
                  <h3 className="text-[14px] font-semibold text-gray-800 dark:text-neutral-200">{title}</h3>
                </div>
                <p className="mt-2 text-[13px] leading-5 text-gray-400 dark:text-neutral-600">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

function ChartBarIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="12" width="4" height="9" /><rect x="10" y="7" width="4" height="14" /><rect x="17" y="3" width="4" height="18" /></svg>; }
function FlaskIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M9 3h6m-6 0v7L4.5 19a1 1 0 0 0 .9 1.5h13.2a1 1 0 0 0 .9-1.5L15 10V3" /></svg>; }
function GraphIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>; }
function CompassIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="10" /><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" /></svg>; }
function FolderIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" /></svg>; }
function RegressionIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><line x1="3" y1="21" x2="21" y2="3" /><circle cx="6" cy="17" r="1.4" /><circle cx="10" cy="15" r="1.4" /><circle cx="14" cy="9" r="1.4" /><circle cx="18" cy="8" r="1.4" /></svg>; }
function TableIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="9" x2="9" y2="21" /></svg>; }
