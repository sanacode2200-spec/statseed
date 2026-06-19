"use client";

import { inputAutoCls as inputCls } from "@/components/ui/formStyles";

export type LegendPosition = "右上" | "右下" | "左上" | "左下";

export const LEGEND_POSITION_MAP: Record<LegendPosition, "top-right" | "top-left" | "bottom-right" | "bottom-left"> = {
  右上: "top-right",
  右下: "bottom-right",
  左上: "top-left",
  左下: "bottom-left",
};

interface Props {
  editTitle: string;
  setEditTitle: (v: string) => void;
  editShowTitle: boolean;
  setEditShowTitle: (v: boolean) => void;
  editXLabel: string;
  setEditXLabel: (v: string) => void;
  editYLabel: string;
  setEditYLabel: (v: string) => void;
  editXMin: string;
  setEditXMin: (v: string) => void;
  editXMax: string;
  setEditXMax: (v: string) => void;
  editYMin: string;
  setEditYMin: (v: string) => void;
  editYMax: string;
  setEditYMax: (v: string) => void;
  editXDtick: string;
  setEditXDtick: (v: string) => void;
  editYDtick: string;
  setEditYDtick: (v: string) => void;
  showXControls: boolean;
  editShowValueLabels: boolean;
  setEditShowValueLabels: (v: boolean) => void;
  showValueLabelsControl: boolean;
  editShowLegend: boolean;
  setEditShowLegend: (v: boolean) => void;
  editLegendPos: LegendPosition;
  setEditLegendPos: (v: LegendPosition) => void;
  editDirectMode: boolean;
  setEditDirectMode: (v: boolean) => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors ${
        checked ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-neutral-700"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white dark:bg-black shadow transition-transform ${
          checked ? "translate-x-4" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function GraphEditPanel({
  editTitle, setEditTitle,
  editShowTitle, setEditShowTitle,
  editXLabel, setEditXLabel,
  editYLabel, setEditYLabel,
  editXMin, setEditXMin,
  editXMax, setEditXMax,
  editYMin, setEditYMin,
  editYMax, setEditYMax,
  editXDtick, setEditXDtick,
  editYDtick, setEditYDtick,
  showXControls,
  editShowValueLabels, setEditShowValueLabels,
  showValueLabelsControl,
  editShowLegend, setEditShowLegend,
  editLegendPos, setEditLegendPos,
  editDirectMode, setEditDirectMode,
}: Props) {
  const labelCls = "block text-[13px] font-medium text-gray-500 dark:text-neutral-500 mb-1";
  const rangePairCls = "flex items-center gap-1.5";

  return (
    <div className="space-y-3.5">
      <p className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600 mb-0.5">
        グラフ編集
      </p>

      {/* 直接編集モード */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className={`${labelCls} mb-0`}>グラフを直接編集</span>
          <Toggle checked={editDirectMode} onChange={setEditDirectMode} />
        </div>
        {editDirectMode && (
          <p className="mt-1 text-[12px] leading-snug text-gray-400 dark:text-neutral-600">
            グラフ上のタイトル・軸ラベル・注釈をダブルクリックで直接編集、ドラッグで移動できます。数値の正確な指定は下のフォームをお使いください。
          </p>
        )}
      </div>

      {/* タイトル表示 */}
      <div className="flex items-center justify-between gap-2">
        <span className={`${labelCls} mb-0`}>タイトルを表示</span>
        <Toggle checked={editShowTitle} onChange={setEditShowTitle} />
      </div>

      {/* タイトル */}
      {editShowTitle && (
        <div>
          <label className={labelCls}>タイトル</label>
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className={`${inputCls} w-full`}
            placeholder="グラフタイトル"
          />
        </div>
      )}

      {/* X軸ラベル */}
      <div>
        <label className={labelCls}>X軸ラベル</label>
        <input
          type="text"
          value={editXLabel}
          onChange={(e) => setEditXLabel(e.target.value)}
          className={`${inputCls} w-full`}
          placeholder="X軸のラベル"
        />
      </div>

      {/* Y軸ラベル */}
      <div>
        <label className={labelCls}>Y軸ラベル</label>
        <input
          type="text"
          value={editYLabel}
          onChange={(e) => setEditYLabel(e.target.value)}
          className={`${inputCls} w-full`}
          placeholder="Y軸のラベル"
        />
      </div>

      {/* X軸範囲 */}
      <div>
        <label className={labelCls}>X軸範囲</label>
        <div className={rangePairCls}>
          <input
            type="number"
            value={editXMin}
            onChange={(e) => setEditXMin(e.target.value)}
            className={`${inputCls} w-full`}
            placeholder="最小"
          />
          <span className="text-[13px] text-gray-400 dark:text-neutral-600 shrink-0">–</span>
          <input
            type="number"
            value={editXMax}
            onChange={(e) => setEditXMax(e.target.value)}
            className={`${inputCls} w-full`}
            placeholder="最大"
          />
        </div>
      </div>

      {/* Y軸範囲 */}
      <div>
        <label className={labelCls}>Y軸範囲</label>
        <div className={rangePairCls}>
          <input
            type="number"
            value={editYMin}
            onChange={(e) => setEditYMin(e.target.value)}
            className={`${inputCls} w-full`}
            placeholder="最小"
          />
          <span className="text-[13px] text-gray-400 dark:text-neutral-600 shrink-0">–</span>
          <input
            type="number"
            value={editYMax}
            onChange={(e) => setEditYMax(e.target.value)}
            className={`${inputCls} w-full`}
            placeholder="最大"
          />
        </div>
      </div>

      {/* 目盛り間隔 */}
      <div className={showXControls ? "grid grid-cols-2 gap-2" : ""}>
        {showXControls && (
          <div>
            <label className={labelCls}>X目盛り間隔</label>
            <input
              type="number"
              min="0"
              value={editXDtick}
              onChange={(e) => setEditXDtick(e.target.value)}
              className={`${inputCls} w-full`}
              placeholder="自動"
            />
          </div>
        )}
        <div>
          <label className={labelCls}>Y目盛り間隔</label>
          <input
            type="number"
            min="0"
            value={editYDtick}
            onChange={(e) => setEditYDtick(e.target.value)}
            className={`${inputCls} w-full`}
            placeholder="自動"
          />
        </div>
      </div>

      {/* データ値ラベル */}
      {showValueLabelsControl && (
        <div className="flex items-center justify-between gap-2">
          <span className={`${labelCls} mb-0`}>データ値を表示</span>
          <Toggle checked={editShowValueLabels} onChange={setEditShowValueLabels} />
        </div>
      )}

      {/* 凡例トグル */}
      <div className="flex items-center justify-between gap-2">
        <span className={`${labelCls} mb-0`}>凡例を表示</span>
        <Toggle checked={editShowLegend} onChange={setEditShowLegend} />
      </div>

      {/* 凡例位置 */}
      {editShowLegend && (
        <div>
          <label className={labelCls}>凡例の位置</label>
          <select
            value={editLegendPos}
            onChange={(e) => setEditLegendPos(e.target.value as LegendPosition)}
            className={`${inputCls} w-full`}
          >
            {(["右上", "右下", "左上", "左下"] as const).map((pos) => (
              <option key={pos} value={pos}>{pos}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
