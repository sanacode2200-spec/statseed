import { inputCls, textareaCls } from "@/components/ui/formStyles";
import type { ColumnInfo } from "@/lib/types";

type Props = {
  csvMode: boolean;
  csvCont: ColumnInfo[];
  csvNumeric: ColumnInfo[];
  csvCat: ColumnInfo[];
  csvKmTimeCol: string;
  setCsvKmTimeCol: (v: string) => void;
  csvKmEventCol: string;
  setCsvKmEventCol: (v: string) => void;
  csvKmGroupCol: string;
  setCsvKmGroupCol: (v: string) => void;
  kmTimesText: string;
  setKmTimesText: (v: string) => void;
  kmEventsText: string;
  setKmEventsText: (v: string) => void;
  kmGroupText: string;
  setKmGroupText: (v: string) => void;
  kmTimeLabel: string;
  setKmTimeLabel: (v: string) => void;
  kmSurvLabel: string;
  setKmSurvLabel: (v: string) => void;
  kmShowCi: boolean;
  setKmShowCi: (v: boolean) => void;
  kmShowRisk: boolean;
  setKmShowRisk: (v: boolean) => void;
};

export function KaplanMeierPanel({
  csvMode,
  csvCont,
  csvNumeric,
  csvCat,
  csvKmTimeCol,
  setCsvKmTimeCol,
  csvKmEventCol,
  setCsvKmEventCol,
  csvKmGroupCol,
  setCsvKmGroupCol,
  kmTimesText,
  setKmTimesText,
  kmEventsText,
  setKmEventsText,
  kmGroupText,
  setKmGroupText,
  kmTimeLabel,
  setKmTimeLabel,
  kmSurvLabel,
  setKmSurvLabel,
  kmShowCi,
  setKmShowCi,
  kmShowRisk,
  setKmShowRisk,
}: Props) {
  return (
    <div className="space-y-3">
      {csvMode ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">生存時間の列</label>
            <select value={csvKmTimeCol} onChange={(e) => setCsvKmTimeCol(e.target.value)} className={`${inputCls} w-full`}>
              {csvCont.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">イベントの列（1=発生, 0=打ち切り）</label>
            <select value={csvKmEventCol} onChange={(e) => setCsvKmEventCol(e.target.value)} className={`${inputCls} w-full`}>
              {csvNumeric.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">群ラベルの列（任意）</label>
            <select value={csvKmGroupCol} onChange={(e) => setCsvKmGroupCol(e.target.value)} className={`${inputCls} w-full`}>
              <option value="">（指定なし）</option>
              {csvCat.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                生存時間（1行1データ）
              </label>
              <textarea value={kmTimesText} onChange={(e) => setKmTimesText(e.target.value)}
                rows={7} className={textareaCls} placeholder={"例：\n12\n18\n24\n30\n6"} />
            </div>
            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                イベント（1=発生, 0=打ち切り）
              </label>
              <textarea value={kmEventsText} onChange={(e) => setKmEventsText(e.target.value)}
                rows={7} className={textareaCls} placeholder={"例：\n1\n0\n1\n1\n0"} />
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
              群ラベル（任意・複数群比較）
            </label>
            <textarea value={kmGroupText} onChange={(e) => setKmGroupText(e.target.value)}
              rows={3} className={textareaCls} placeholder={"例：\n治療群\n治療群\n対照群\n対照群\n治療群"} />
          </div>
        </>
      )}
      <div className="flex gap-4 flex-wrap">
        <div>
          <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">X軸ラベル</label>
          <input type="text" value={kmTimeLabel} onChange={(e) => setKmTimeLabel(e.target.value)}
            className={`${inputCls} w-32`} placeholder="時間" />
        </div>
        <div>
          <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">Y軸ラベル</label>
          <input type="text" value={kmSurvLabel} onChange={(e) => setKmSurvLabel(e.target.value)}
            className={`${inputCls} w-32`} placeholder="生存率" />
        </div>
        <div className="flex flex-col gap-1.5 justify-end">
          <label className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
            <input type="checkbox" checked={kmShowCi} onChange={(e) => setKmShowCi(e.target.checked)} className="rounded" />
            95%CI表示
          </label>
          <label className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
            <input type="checkbox" checked={kmShowRisk} onChange={(e) => setKmShowRisk(e.target.checked)} className="rounded" />
            リスクテーブル表示
          </label>
        </div>
      </div>
    </div>
  );
}
