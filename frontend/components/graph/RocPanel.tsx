import { inputCls, textareaCls } from "@/components/ui/formStyles";
import type { ColumnInfo } from "@/lib/types";

type Props = {
  csvMode: boolean;
  csvCont: ColumnInfo[];
  csvNumeric: ColumnInfo[];
  rocScoreLabel: string;
  setRocScoreLabel: (v: string) => void;
  csvRocScoreCol: string;
  setCsvRocScoreCol: (v: string) => void;
  csvRocLabelCol: string;
  setCsvRocLabelCol: (v: string) => void;
  rocScoresText: string;
  setRocScoresText: (v: string) => void;
  rocLabelsText: string;
  setRocLabelsText: (v: string) => void;
};

export function RocPanel({
  csvMode,
  csvCont,
  csvNumeric,
  rocScoreLabel,
  setRocScoreLabel,
  csvRocScoreCol,
  setCsvRocScoreCol,
  csvRocLabelCol,
  setCsvRocLabelCol,
  rocScoresText,
  setRocScoresText,
  rocLabelsText,
  setRocLabelsText,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="roc-score-label" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">スコアラベル</label>
        <input id="roc-score-label" type="text" value={rocScoreLabel} onChange={(e) => setRocScoreLabel(e.target.value)}
          className={`${inputCls} w-full sm:w-48`} placeholder="例：診断スコア" />
      </div>
      {csvMode ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="roc-score-col" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">診断スコアの列</label>
            <select id="roc-score-col" value={csvRocScoreCol} onChange={(e) => setCsvRocScoreCol(e.target.value)} className={`${inputCls} w-full`}>
              {csvCont.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="roc-label-col" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">正解ラベルの列（1=陽性, 0=陰性）</label>
            <select id="roc-label-col" value={csvRocLabelCol} onChange={(e) => setCsvRocLabelCol(e.target.value)} className={`${inputCls} w-full`}>
              {csvNumeric.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="roc-scores-text" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
              診断スコア（1行1データ）
            </label>
            <textarea id="roc-scores-text" value={rocScoresText} onChange={(e) => setRocScoresText(e.target.value)}
              rows={7} className={textareaCls} placeholder={"例：\n0.9\n0.8\n0.4\n0.2\n0.1"} />
          </div>
          <div>
            <label htmlFor="roc-labels-text" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
              正解ラベル（1=陽性, 0=陰性）
            </label>
            <textarea id="roc-labels-text" value={rocLabelsText} onChange={(e) => setRocLabelsText(e.target.value)}
              rows={7} className={textareaCls} placeholder={"例：\n1\n1\n0\n0\n0"} />
          </div>
        </div>
      )}
    </div>
  );
}
