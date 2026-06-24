import { inputCls, textareaCls } from "@/components/ui/formStyles";
import type { ColumnInfo } from "@/lib/types";

type Props = {
  csvMode: boolean;
  csvCont: ColumnInfo[];
  histXLabel: string;
  setHistXLabel: (v: string) => void;
  csvHistCol: string;
  setCsvHistCol: (v: string) => void;
  histText: string;
  setHistText: (v: string) => void;
  histShowNormal: boolean;
  setHistShowNormal: (v: boolean) => void;
};

export function HistogramPanel({
  csvMode,
  csvCont,
  histXLabel,
  setHistXLabel,
  csvHistCol,
  setCsvHistCol,
  histText,
  setHistText,
  histShowNormal,
  setHistShowNormal,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="hist-x-label" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">X軸ラベル</label>
        <input
          id="hist-x-label"
          type="text"
          value={histXLabel}
          onChange={(e) => setHistXLabel(e.target.value)}
          className={`${inputCls} w-full sm:w-48`}
          placeholder="例：年齢 (歳)"
        />
      </div>
      {csvMode ? (
        <div>
          <label htmlFor="hist-col" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">データの列</label>
          <select id="hist-col" value={csvHistCol} onChange={(e) => setCsvHistCol(e.target.value)} className={`${inputCls} w-full`}>
            {csvCont.map((c) => (
              <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label htmlFor="hist-text" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">データ</label>
          <textarea
            id="hist-text"
            value={histText}
            onChange={(e) => setHistText(e.target.value)}
            rows={7}
            className={textareaCls}
            placeholder="1行1データ（またはスペース/カンマ区切り）"
          />
        </div>
      )}
      <label className="flex items-center gap-1.5 text-[14px] text-gray-500 dark:text-neutral-500 cursor-pointer">
        <input
          type="checkbox"
          checked={histShowNormal}
          onChange={(e) => setHistShowNormal(e.target.checked)}
          className="rounded"
        />
        正規分布曲線を重ねる
      </label>
    </div>
  );
}
