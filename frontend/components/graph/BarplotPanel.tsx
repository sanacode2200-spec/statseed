import { inputCls, textareaCls } from "@/components/ui/formStyles";
import type { ColumnInfo } from "@/lib/types";

type Props = {
  csvMode: boolean;
  csvCont: ColumnInfo[];
  csvCat: ColumnInfo[];
  barYLabel: string;
  setBarYLabel: (v: string) => void;
  barErrorType: "sd" | "sem" | "ci95";
  setBarErrorType: (v: "sd" | "sem" | "ci95") => void;
  csvGroupedValueCol: string;
  setCsvGroupedValueCol: (v: string) => void;
  csvGroupedGroupCol: string;
  setCsvGroupedGroupCol: (v: string) => void;
  barGroupTexts: string[];
  barGroupNames: string[];
  updateBarName: (i: number, v: string) => void;
  updateBarGroup: (i: number, v: string) => void;
  addBarGroup: () => void;
  removeBarGroup: (i: number) => void;
};

export function BarplotPanel({
  csvMode,
  csvCont,
  csvCat,
  barYLabel,
  setBarYLabel,
  barErrorType,
  setBarErrorType,
  csvGroupedValueCol,
  setCsvGroupedValueCol,
  csvGroupedGroupCol,
  setCsvGroupedGroupCol,
  barGroupTexts,
  barGroupNames,
  updateBarName,
  updateBarGroup,
  addBarGroup,
  removeBarGroup,
}: Props) {
  return (
    <div className="space-y-3">
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">Y軸ラベル</label>
          <input type="text" value={barYLabel} onChange={(e) => setBarYLabel(e.target.value)}
            className={`${inputCls} w-full sm:w-48`} placeholder="例：握力 (kg)" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">エラーバー</label>
          <div className="flex rounded-md border border-gray-200 dark:border-neutral-800 overflow-hidden">
            {([["sd", "SD"], ["sem", "SEM"], ["ci95", "95%CI"]] as const).map(([val, label]) => (
              <button key={val} type="button" onClick={() => setBarErrorType(val)}
                className={`px-3 py-1.5 text-[12px] transition-colors ${barErrorType === val
                  ? "bg-white text-black" : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500 hover:bg-gray-50"}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {csvMode ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">値（連続変数）の列</label>
            <select value={csvGroupedValueCol} onChange={(e) => setCsvGroupedValueCol(e.target.value)} className={`${inputCls} w-full`}>
              {csvCont.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">群（カテゴリ変数）の列</label>
            <select value={csvGroupedGroupCol} onChange={(e) => setCsvGroupedGroupCol(e.target.value)} className={`${inputCls} w-full`}>
              {csvCat.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {barGroupTexts.map((text, i) => (
              <div key={i}>
                <div className="flex gap-1 mb-1">
                  <input type="text" value={barGroupNames[i]} onChange={(e) => updateBarName(i, e.target.value)}
                    className="flex-1 rounded-md border border-gray-200 dark:border-neutral-800 px-2 py-1 text-[13px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700" />
                  {barGroupTexts.length > 2 && (
                    <button type="button" onClick={() => removeBarGroup(i)}
                      className="text-[12px] text-red-400 hover:text-red-600">✕</button>
                  )}
                </div>
                <textarea value={text} onChange={(e) => updateBarGroup(i, e.target.value)}
                  rows={5} className={textareaCls} placeholder="1行1データ" />
              </div>
            ))}
          </div>
          <button type="button" onClick={addBarGroup}
            className="text-[12px] text-gray-400 dark:text-neutral-600 hover:text-gray-600 dark:hover:text-neutral-400 transition-colors">
            + 群を追加
          </button>
        </>
      )}
    </div>
  );
}
