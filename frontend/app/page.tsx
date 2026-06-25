import Image from "next/image";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

const METHODS = [
  { name: "対応のある t 検定", use: "2時点の変化", type: "TEST", visual: "paired" },
  { name: "Mann–Whitney U", use: "2群の比較", type: "TEST", visual: "bars" },
  { name: "一元配置 ANOVA", use: "3群以上の比較", type: "TEST", visual: "anova" },
  { name: "重回帰分析", use: "要因を探索", type: "MODEL", visual: "scatter" },
  { name: "Kaplan–Meier", use: "生存時間解析", type: "CURVE", visual: "survival" },
  { name: "ROC 曲線", use: "診断精度を評価", type: "CURVE", visual: "roc" },
  { name: "χ² 検定", use: "カテゴリの関連", type: "TEST", visual: "matrix" },
  { name: "記述統計", use: "データを要約", type: "SUMMARY", visual: "summary" },
];

const VALUES = [
  { title: "信頼できる計算", text: "実績ある統計ライブラリを使い、効果量・95%信頼区間・解析対象数まで表示します。", icon: CalculateIcon },
  { title: "理解しやすい結果", text: "p値だけで終わらず、結果の意味と解析上の注意点を日本語で説明します。", icon: ReadIcon },
  { title: "伝わる美しいグラフ", text: "個別値を大切にし、論文や発表資料に使いやすい形式で出力できます。", icon: ExportIcon },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-hidden bg-white text-gray-900 dark:bg-[#080808] dark:text-white">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-gray-200/70 bg-white/80 backdrop-blur-xl dark:border-neutral-900 dark:bg-[#080808]/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/sana2.png" alt="" width={30} height={30} className="h-[30px] w-[30px] rounded-md object-cover" />
            <span className="text-[16px] font-semibold tracking-tight">Statseed</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/dashboard/data" className="rounded-full bg-black px-4 py-2 text-[13px] font-semibold text-white transition-transform hover:scale-[1.02] dark:bg-white dark:text-black">
              解析をはじめる
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative flex min-h-[760px] items-center justify-center px-5 pb-28 pt-36 text-center sm:min-h-[820px]">
          <div className="landing-grid absolute inset-0 opacity-70" />
          <div className="absolute left-1/2 top-[43%] h-[420px] w-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-300/20 blur-[120px] dark:bg-purple-500/10" />
          <HeroPlot />
          <div className="relative z-10 mx-auto max-w-4xl">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/80 px-3 py-1.5 text-[11px] font-semibold tracking-[0.12em] text-gray-500 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/80 dark:text-neutral-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              MEDICAL STATISTICS, MADE SIMPLE
            </div>
            <h1 className="text-balance text-[48px] font-extrabold leading-[1.12] tracking-[-0.055em] sm:text-[72px] lg:text-[88px]">
              臨床研究に、
              <br />
              <span className="text-gray-400 dark:text-neutral-500">やさしい統計を。</span>
            </h1>
            <p className="mx-auto mt-7 max-w-2xl text-[15px] leading-7 text-gray-500 dark:text-neutral-400 sm:text-[18px]">
              計算は信頼できる方法で。結果は分かりやすく。グラフは美しく。
              <br className="hidden sm:block" />
              医療従事者の研究を、解析から報告まで支えます。
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/dashboard/data" className="w-full rounded-full bg-black px-7 py-3.5 text-[14px] font-semibold text-white transition-transform hover:scale-[1.02] dark:bg-white dark:text-black sm:w-auto">
                データを読み込む
              </Link>
              <Link href="/dashboard/guide" className="w-full rounded-full border border-gray-200 bg-white/70 px-7 py-3.5 text-[14px] font-semibold text-gray-700 backdrop-blur transition-colors hover:bg-gray-50 dark:border-neutral-800 dark:bg-neutral-950/70 dark:text-neutral-300 dark:hover:bg-neutral-900 sm:w-auto">
                解析方法を相談する
              </Link>
            </div>
            <p className="mt-5 text-[11px] text-gray-400 dark:text-neutral-600">インストール不要 ・ 無料 ・ 標準ではタブを閉じると読み込みデータを削除</p>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 sm:pb-32">
          <div className="text-center">
            <p className="section-label">OUR STANDARD</p>
            <h2 className="mt-4 text-[34px] font-bold tracking-[-0.035em] sm:text-[48px]">やさしさを支える、3つの基準。</h2>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-gray-200 bg-gray-200 dark:border-neutral-800 dark:bg-neutral-800 md:grid-cols-3">
            {VALUES.map(({ title, text, icon: Icon }) => (
              <div key={title} className="bg-white p-8 dark:bg-[#0d0d0d]">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 dark:border-neutral-800 dark:text-neutral-300"><Icon /></div>
                <h3 className="mt-12 text-[17px] font-bold">{title}</h3>
                <p className="mt-3 text-[13px] leading-6 text-gray-500 dark:text-neutral-400">{text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-gray-200 bg-gray-50 py-16 dark:border-neutral-900 dark:bg-[#0d0d0d]">
          <div className="mb-9 px-5 text-center">
            <p className="section-label">ANALYSIS TOOLKIT</p>
            <h2 className="mt-3 text-[24px] font-bold tracking-tight sm:text-[32px]">研究に必要な手法を、ひとつの場所に。</h2>
          </div>
          <MethodMarquee methods={METHODS.slice(0, 4)} />
          <MethodMarquee methods={METHODS.slice(4)} reverse />
        </section>

        <section className="mx-auto max-w-6xl px-5 py-24 sm:py-32">
          <div className="max-w-2xl">
            <p className="section-label">HOW IT WORKS</p>
            <h2 className="mt-4 text-[34px] font-bold leading-tight tracking-[-0.035em] sm:text-[52px]">解析は、3ステップだけ。</h2>
          </div>
          <div className="mt-14 grid border-y border-gray-200 dark:border-neutral-800 md:grid-cols-3">
            {[
              ["01", "データを読み込む", "CSVをドロップ。列の種類と欠損値を自動で確認します。"],
              ["02", "手法を選ぶ", "目的から選ぶか、ガイドに答えて最適な手法を見つけます。"],
              ["03", "結果を使う", "解釈・表・論文や発表に使いやすいグラフを、研究に活用できます。"],
            ].map(([number, title, text]) => (
              <div key={number} className="group border-b border-gray-200 py-8 last:border-0 dark:border-neutral-800 md:border-b-0 md:border-r md:px-8 md:first:pl-0 md:last:border-r-0 md:last:pr-0">
                <span className="font-mono text-[12px] text-gray-400 dark:text-neutral-600">{number}</span>
                <h3 className="mt-12 text-[20px] font-bold">{title}</h3>
                <p className="mt-3 text-[13px] leading-6 text-gray-500 dark:text-neutral-400">{text}</p>
                <div className="mt-8 h-px w-8 bg-gray-900 transition-all group-hover:w-16 dark:bg-white" />
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-gray-200 bg-[#f4f4f2] px-5 py-24 dark:border-neutral-900 dark:bg-[#0d0d0d] sm:py-32">
          <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[0.8fr_1.2fr]">
            <div>
              <p className="section-label">FROM DATA TO EVIDENCE</p>
              <h2 className="mt-4 text-[34px] font-bold leading-tight tracking-[-0.035em] sm:text-[48px]">数字だけで終わらない解析結果。</h2>
              <p className="mt-6 max-w-md text-[14px] leading-7 text-gray-500 dark:text-neutral-400">
                何が分かったのか、結果をどう報告するのかまで表示。解析に慣れていなくても、次にすることが分かります。
              </p>
              <Link href="/dashboard/test" className="mt-8 inline-flex items-center gap-2 text-[13px] font-semibold">
                統計検定を試す <span aria-hidden="true">→</span>
              </Link>
            </div>
            <AnalysisPreview />
          </div>
        </section>

        <section className="px-5 py-24 sm:py-32">
          <div className="mx-auto max-w-6xl rounded-[28px] bg-black px-6 py-20 text-center text-white dark:bg-white dark:text-black sm:py-24">
            <p className="text-[11px] font-semibold tracking-[0.18em] text-neutral-500">START YOUR ANALYSIS</p>
            <h2 className="mt-5 text-[34px] font-bold tracking-[-0.04em] dark:text-black sm:text-[52px]">そのデータを、根拠に変えよう。</h2>
            <Link href="/dashboard/data" className="mt-8 inline-block rounded-full bg-white px-7 py-3.5 text-[14px] font-semibold text-black dark:bg-black dark:text-white">
              データを読み込んで始める
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-7xl items-center justify-between px-5 py-8 text-[11px] text-gray-400 dark:text-neutral-600">
        <span>© 2026 Statseed</span><span>Medical statistics, made simple.</span>
      </footer>
    </div>
  );
}

function MethodMarquee({ methods, reverse = false }: { methods: typeof METHODS; reverse?: boolean }) {
  const items = [...methods, ...methods];
  return (
    <div className="method-marquee mb-3 overflow-hidden last:mb-0">
      <div className={`method-track ${reverse ? "method-track-reverse" : ""}`}>
        {items.map((method, index) => <MethodCard key={`${method.name}-${index}`} {...method} />)}
      </div>
    </div>
  );
}

function MethodCard({ name, use: useCase, type, visual }: (typeof METHODS)[number]) {
  return (
    <div className="flex h-[126px] w-[270px] shrink-0 items-center justify-between rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-[#151515]">
      <div>
        <span className="font-mono text-[9px] tracking-[0.14em] text-gray-400 dark:text-neutral-600">{type}</span>
        <h3 className="mt-3 text-[14px] font-bold">{name}</h3>
        <p className="mt-1 text-[11px] text-gray-400 dark:text-neutral-500">{useCase}</p>
      </div>
      <MiniVisual kind={visual} />
    </div>
  );
}

function MiniVisual({ kind }: { kind: string }) {
  if (kind === "bars" || kind === "anova" || kind === "summary") return <div className="flex h-12 w-14 items-end gap-1">{[45, 72, 55, 88].map((h, i) => <span key={i} className="w-2 rounded-t-sm bg-gray-300 dark:bg-neutral-700" style={{ height: `${h}%` }} />)}</div>;
  if (kind === "matrix") return <div className="grid h-12 w-12 grid-cols-3 gap-1">{Array.from({ length: 9 }, (_, i) => <span key={i} className={`rounded-sm ${i === 4 || i === 8 ? "bg-purple-400" : "bg-gray-200 dark:bg-neutral-800"}`} />)}</div>;
  return <svg width="62" height="48" viewBox="0 0 62 48" fill="none" className="text-purple-500"><path d={kind === "survival" ? "M3 7h12v8h12v8h12v8h17v10" : kind === "roc" ? "M4 42C10 18 24 8 57 5" : "M4 39C17 35 20 18 31 24S45 8 58 7"} stroke="currentColor" strokeWidth="2" /><path d="M4 43h55M4 43V4" stroke="currentColor" strokeOpacity=".18" /></svg>;
}

function AnalysisPreview() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl shadow-black/10 dark:border-neutral-800 dark:bg-[#111]">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 pb-3 dark:border-neutral-800">
        <div><p className="text-[11px] font-semibold">対応のある t 検定</p><p className="mt-0.5 text-[9px] text-gray-400 dark:text-neutral-600">rehab_pre_post.csv ・ n = 42</p></div>
        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">解析完了</span>
      </div>
      <div className="grid gap-3 p-3 sm:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
          <svg viewBox="0 0 330 190" className="h-auto w-full">
            <path d="M35 155H315M35 155V20" stroke="currentColor" strokeOpacity=".12" />
            {[45,70,92,118,142,164,188,212,238,261,282].map((x, i) => <path key={x} d={`M${x} ${128 - (i % 4) * 12}L${x + 52} ${82 - (i % 3) * 15}`} stroke="#bd93f9" strokeOpacity=".35" />)}
            {[45,70,92,118,142,164,188,212,238,261,282].map((x, i) => <g key={x}><circle cx={x} cy={128 - (i % 4) * 12} r="3.5" fill="#a3a3a3" /><circle cx={x + 52} cy={82 - (i % 3) * 15} r="3.5" fill="#8b5cf6" /></g>)}
            <text x="93" y="178" fontSize="9" fill="#999">介入前</text><text x="235" y="178" fontSize="9" fill="#999">介入後</text>
          </svg>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-gray-100 p-4 dark:border-neutral-800"><p className="text-[9px] text-gray-400">p 値</p><p className="mt-1 font-mono text-[24px] font-bold">0.003</p><p className="mt-1 text-[9px] text-emerald-600">統計的に有意</p></div>
          <div className="rounded-xl border border-gray-100 p-4 dark:border-neutral-800"><p className="text-[9px] text-gray-400">効果量 Cohen&apos;s d</p><p className="mt-1 font-mono text-[24px] font-bold">0.72</p><p className="mt-1 text-[9px] text-gray-400">中〜大程度の効果</p></div>
        </div>
      </div>
      <div className="mx-3 mb-3 rounded-xl bg-purple-50 p-4 text-[10px] leading-5 text-purple-900 dark:bg-purple-950/40 dark:text-purple-200">介入後のスコアは介入前と比較して有意に改善しました。効果量は中〜大程度でした。</div>
    </div>
  );
}

function HeroPlot() {
  return <svg aria-hidden="true" viewBox="0 0 1200 700" className="pointer-events-none absolute left-1/2 top-1/2 w-[1200px] max-w-none -translate-x-1/2 -translate-y-1/2 opacity-[0.16] dark:opacity-[0.12]"><path d="M80 560C260 530 330 440 470 462S690 240 840 280s190-130 290-156" fill="none" stroke="#8b5cf6" strokeWidth="2" />{[[190,515],[278,474],[390,469],[505,448],[612,358],[714,297],[829,279],[945,211],[1080,145]].map(([x,y]) => <circle key={x} cx={x} cy={y} r="5" fill="#8b5cf6" />)}</svg>;
}

function CalculateIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 11h2m4 0h2M8 15h2m4 0h2M8 18h2m4 0h2" /></svg>; }
function ReadIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 5h6a3 3 0 0 1 3 3v11a3 3 0 0 0-3-3H4V5Zm16 0h-4a3 3 0 0 0-3 3v11a3 3 0 0 1 3-3h4V5Z" /></svg>; }
function ExportIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 3v12m0-12 4 4m-4-4L8 7M5 13v7h14v-7" /></svg>; }
