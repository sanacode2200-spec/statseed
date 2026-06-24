import { inputCls, textareaCls } from "@/components/ui/formStyles";
import type { ColumnInfo } from "@/lib/types";

type Props = {
  csvMode: boolean;
  csvCont: ColumnInfo[];
  csvCat: ColumnInfo[];
  bpYLabel: string;
  setBpYLabel: (v: string) => void;
  csvGroupedValueCol: string;
  setCsvGroupedValueCol: (v: string) => void;
  csvGroupedGroupCol: string;
  setCsvGroupedGroupCol: (v: string) => void;
  bpGroupTexts: string[];
  bpGroupNames: string[];
  updateBpName: (i: number, v: string) => void;
  updateBpGroup: (i: number, v: string) => void;
  addBpGroup: () => void;
  removeBpGroup: (i: number) => void;
  bpDisplayStyle: "auto" | "simple" | "distribution" | "individual";
  setBpDisplayStyle: (v: "auto" | "simple" | "distribution" | "individual") => void;
  bpColorMode: "color" | "monochrome";
  setBpColorMode: (v: "color" | "monochrome") => void;
  bpShowN: boolean;
  setBpShowN: (v: boolean) => void;
  bpShowGrid: boolean;
  setBpShowGrid: (v: boolean) => void;
  bpYMin: string;
  setBpYMin: (v: string) => void;
  bpYMax: string;
  setBpYMax: (v: string) => void;
  bpShowComparison: boolean;
  setBpShowComparison: (v: boolean) => void;
  bpComparisonMethod: "parametric" | "nonparametric";
  setBpComparisonMethod: (v: "parametric" | "nonparametric") => void;
};

export function BoxplotPanel({
  csvMode,
  csvCont,
  csvCat,
  bpYLabel,
  setBpYLabel,
  csvGroupedValueCol,
  setCsvGroupedValueCol,
  csvGroupedGroupCol,
  setCsvGroupedGroupCol,
  bpGroupTexts,
  bpGroupNames,
  updateBpName,
  updateBpGroup,
  addBpGroup,
  removeBpGroup,
  bpDisplayStyle,
  setBpDisplayStyle,
  bpColorMode,
  setBpColorMode,
  bpShowN,
  setBpShowN,
  bpShowGrid,
  setBpShowGrid,
  bpYMin,
  setBpYMin,
  bpYMax,
  setBpYMax,
  bpShowComparison,
  setBpShowComparison,
  bpComparisonMethod,
  setBpComparisonMethod,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="boxplot-y-label" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">Y軸ラベル</label>
        <input
          id="boxplot-y-label"
          type="text"
          value={bpYLabel}
          onChange={(e) => setBpYLabel(e.target.value)}
          className={`${inputCls} w-full sm:w-48`}
          placeholder="例：握力 (kg)"
        />
      </div>
      {csvMode ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="boxplot-value-col" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">値（連続変数）の列</label>
            <select id="boxplot-value-col" value={csvGroupedValueCol} onChange={(e) => setCsvGroupedValueCol(e.target.value)} className={`${inputCls} w-full`}>
              {csvCont.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="boxplot-group-col" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">群（カテゴリ変数）の列</label>
            <select id="boxplot-group-col" value={csvGroupedGroupCol} onChange={(e) => setCsvGroupedGroupCol(e.target.value)} className={`${inputCls} w-full`}>
              {csvCat.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {bpGroupTexts.map((text, i) => (
            <div key={i}>
              <div className="flex gap-1 mb-1">
                <input
                  type="text"
                  aria-label={`群${i + 1}の名前`}
                  value={bpGroupNames[i]}
                  onChange={(e) => updateBpName(i, e.target.value)}
                  className="flex-1 rounded-md border border-gray-200 dark:border-neutral-800 px-2 py-1 text-[16px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700"
                />
                {bpGroupTexts.length > 2 && (
                  <button
                    type="button"
                    onClick={() => removeBpGroup(i)}
                    aria-label={`群${i + 1}を削除`}
                    className="text-[14px] text-red-400 dark:text-red-500 hover:text-red-600"
                  >
                    ✕
                  </button>
                )}
              </div>
              <textarea
                aria-label={`群${i + 1}の値`}
                value={text}
                onChange={(e) => updateBpGroup(i, e.target.value)}
                rows={5}
                className={textareaCls}
                placeholder="1行1データ"
              />
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4">
        {!csvMode && (
          <button
            type="button"
            onClick={addBpGroup}
            className="text-[14px] text-gray-400 dark:text-neutral-600 hover:text-gray-600 dark:hover:text-neutral-400 transition-colors"
          >
            + 群を追加
          </button>
        )}
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-3 space-y-3">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[14px] font-medium text-gray-600 dark:text-neutral-400">表示スタイル</span>
            <span className="text-[13px] text-gray-400 dark:text-neutral-600">個別値の点サイズはデータ数に合わせて調整されます</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {([
              ["individual", "個別値を表示", "箱ひげとすべての測定値"],
              ["simple", "箱ひげのみ", "要約された分布だけを表示"],
            ] as const).map(([value, label, description]) => (
              <button
                key={value}
                type="button"
                aria-pressed={bpDisplayStyle === value}
                onClick={() => setBpDisplayStyle(value)}
                className={`rounded-md border px-3 py-2 text-left transition-colors ${
                  bpDisplayStyle === value
                    ? "border-gray-900 dark:border-neutral-200 bg-gray-50 dark:bg-neutral-900"
                    : "border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900"
                }`}
              >
                <span className="block text-[14px] font-medium text-gray-700 dark:text-neutral-300">{label}</span>
                <span className="block mt-0.5 text-[12px] text-gray-400 dark:text-neutral-600">{description}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4">
          <div>
            <p className="text-[13px] text-gray-400 dark:text-neutral-600 mb-1">配色</p>
            <div className="flex rounded-md border border-gray-200 dark:border-neutral-800 overflow-hidden" role="group" aria-label="配色">
              {([["color", "カラー"], ["monochrome", "白黒"]] as const).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={bpColorMode === value}
                  onClick={() => setBpColorMode(value)}
                  className={`px-3 py-1.5 text-[14px] transition-colors ${
                    bpColorMode === value
                      ? "bg-gray-900 text-white dark:bg-neutral-100 dark:text-black"
                      : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-1.5 pb-1.5 text-[14px] text-gray-500 dark:text-neutral-500 cursor-pointer">
            <input type="checkbox" checked={bpShowN} onChange={(e) => setBpShowN(e.target.checked)} className="rounded" />
            サンプル数を表示
          </label>
          <label className="flex items-center gap-1.5 pb-1.5 text-[14px] text-gray-500 dark:text-neutral-500 cursor-pointer">
            <input type="checkbox" checked={bpShowGrid} onChange={(e) => setBpShowGrid(e.target.checked)} className="rounded" />
            補助線を表示
          </label>
          <div className="flex flex-wrap gap-2">
            <div>
              <label htmlFor="boxplot-y-min" className="block text-[13px] text-gray-400 dark:text-neutral-600 mb-1">Y軸 最小</label>
              <input id="boxplot-y-min" type="number" value={bpYMin} onChange={(e) => setBpYMin(e.target.value)}
                className={`${inputCls} w-24`} placeholder="自動" step="any" />
            </div>
            <div>
              <label htmlFor="boxplot-y-max" className="block text-[13px] text-gray-400 dark:text-neutral-600 mb-1">Y軸 最大</label>
              <input id="boxplot-y-max" type="number" value={bpYMax} onChange={(e) => setBpYMax(e.target.value)}
                className={`${inputCls} w-24`} placeholder="自動" step="any" />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-neutral-800 pt-3">
          <label className="flex items-center gap-2 text-[14px] font-medium text-gray-600 dark:text-neutral-400 cursor-pointer">
            <input
              type="checkbox"
              checked={bpShowComparison}
              onChange={(e) => setBpShowComparison(e.target.checked)}
              className="rounded"
            />
            群間差を検定してp値を表示
          </label>
          {bpShowComparison && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-[13px] text-gray-400 dark:text-neutral-600">データの扱い：</span>
              <div className="flex rounded-md border border-gray-200 dark:border-neutral-800 overflow-hidden" role="group" aria-label="データの扱い">
                {([
                  ["parametric", "平均値を比較", "Welch / ANOVA + Tukey"],
                  ["nonparametric", "順位を比較", "Mann–Whitney / Kruskal–Wallis + Dunn-Holm"],
                ] as const).map(([value, label, detail]) => (
                  <button
                    key={value}
                    type="button"
                    title={detail}
                    aria-pressed={bpComparisonMethod === value}
                    onClick={() => setBpComparisonMethod(value)}
                    className={`px-3 py-1.5 text-[14px] transition-colors ${
                      bpComparisonMethod === value
                        ? "bg-gray-900 text-white dark:bg-neutral-100 dark:text-black"
                        : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <span className="text-[13px] text-gray-400 dark:text-neutral-600">
                {bpComparisonMethod === "parametric"
                  ? "平均値の差を検定します"
                  : "外れ値や非正規分布の影響を受けにくい方法です"}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
