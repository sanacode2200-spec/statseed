import { inputCls, textareaCls } from "@/components/ui/formStyles";
import type { ColumnInfo } from "@/lib/types";

type Props = {
  csvMode: boolean;
  csvCont: ColumnInfo[];
  csvPairedBeforeCol: string;
  setCsvPairedBeforeCol: (v: string) => void;
  csvPairedAfterCol: string;
  setCsvPairedAfterCol: (v: string) => void;
  pairedBeforeText: string;
  setPairedBeforeText: (v: string) => void;
  pairedAfterText: string;
  setPairedAfterText: (v: string) => void;
  pairedBeforeLabel: string;
  setPairedBeforeLabel: (v: string) => void;
  pairedAfterLabel: string;
  setPairedAfterLabel: (v: string) => void;
  pairedYLabel: string;
  setPairedYLabel: (v: string) => void;
};

export function PairedPanel({
  csvMode,
  csvCont,
  csvPairedBeforeCol,
  setCsvPairedBeforeCol,
  csvPairedAfterCol,
  setCsvPairedAfterCol,
  pairedBeforeText,
  setPairedBeforeText,
  pairedAfterText,
  setPairedAfterText,
  pairedBeforeLabel,
  setPairedBeforeLabel,
  pairedAfterLabel,
  setPairedAfterLabel,
  pairedYLabel,
  setPairedYLabel,
}: Props) {
  return (
    <div className="space-y-3">
      {csvMode ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="paired-before-col" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">介入前・1時点目</label>
            <select id="paired-before-col" value={csvPairedBeforeCol} onChange={(e) => { setCsvPairedBeforeCol(e.target.value); setPairedBeforeLabel(e.target.value); }} className={`${inputCls} w-full`}>
              {csvCont.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="paired-after-col" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">介入後・2時点目</label>
            <select id="paired-after-col" value={csvPairedAfterCol} onChange={(e) => { setCsvPairedAfterCol(e.target.value); setPairedAfterLabel(e.target.value); }} className={`${inputCls} w-full`}>
              {csvCont.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <textarea aria-label="介入前の値" value={pairedBeforeText} onChange={(e) => setPairedBeforeText(e.target.value)} rows={6} className={textareaCls} placeholder="介入前（1行1データ）" />
          <textarea aria-label="介入後の値" value={pairedAfterText} onChange={(e) => setPairedAfterText(e.target.value)} rows={6} className={textareaCls} placeholder="介入後（1行1データ）" />
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <input aria-label="前ラベル" value={pairedBeforeLabel} onChange={(e) => setPairedBeforeLabel(e.target.value)} className={`${inputCls} w-full`} placeholder="前ラベル" />
        <input aria-label="後ラベル" value={pairedAfterLabel} onChange={(e) => setPairedAfterLabel(e.target.value)} className={`${inputCls} w-full`} placeholder="後ラベル" />
        <input aria-label="Y軸ラベル" value={pairedYLabel} onChange={(e) => setPairedYLabel(e.target.value)} className={`${inputCls} w-full`} placeholder="Y軸ラベル" />
      </div>
    </div>
  );
}
