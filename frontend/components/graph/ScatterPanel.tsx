import { inputCls, textareaCls } from "@/components/ui/formStyles";
import type { ColumnInfo } from "@/lib/types";

type Props = {
  csvMode: boolean;
  csvCont: ColumnInfo[];
  csvScatterXCol: string;
  setCsvScatterXCol: (v: string) => void;
  csvScatterYCol: string;
  setCsvScatterYCol: (v: string) => void;
  scXLabel: string;
  setScXLabel: (v: string) => void;
  scYLabel: string;
  setScYLabel: (v: string) => void;
  scXText: string;
  setScXText: (v: string) => void;
  scYText: string;
  setScYText: (v: string) => void;
  scShowReg: boolean;
  setScShowReg: (v: boolean) => void;
};

export function ScatterPanel({
  csvMode,
  csvCont,
  csvScatterXCol,
  setCsvScatterXCol,
  csvScatterYCol,
  setCsvScatterYCol,
  scXLabel,
  setScXLabel,
  scYLabel,
  setScYLabel,
  scXText,
  setScXText,
  scYText,
  setScYText,
  scShowReg,
  setScShowReg,
}: Props) {
  return (
    <div className="space-y-3">
      {csvMode ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">X軸の列</label>
            <select value={csvScatterXCol} onChange={(e) => setCsvScatterXCol(e.target.value)} className={`${inputCls} w-full mb-1.5`}>
              {csvCont.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
            <input type="text" value={scXLabel} onChange={(e) => setScXLabel(e.target.value)}
              placeholder="X軸ラベル" className={`${inputCls} w-full`} />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">Y軸の列</label>
            <select value={csvScatterYCol} onChange={(e) => setCsvScatterYCol(e.target.value)} className={`${inputCls} w-full mb-1.5`}>
              {csvCont.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
            <input type="text" value={scYLabel} onChange={(e) => setScYLabel(e.target.value)}
              placeholder="Y軸ラベル" className={`${inputCls} w-full`} />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { label: "X", name: scXLabel, setName: setScXLabel, text: scXText, setText: setScXText },
            { label: "Y", name: scYLabel, setName: setScYLabel, text: scYText, setText: setScYText },
          ].map(({ label, name, setName, text, setText }) => (
            <div key={label}>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={`${label}軸ラベル`}
                className={`${inputCls} w-full mb-1.5`}
              />
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                className={textareaCls}
                placeholder="1行1データ"
              />
            </div>
          ))}
        </div>
      )}
      <label className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
        <input
          type="checkbox"
          checked={scShowReg}
          onChange={(e) => setScShowReg(e.target.checked)}
          className="rounded"
        />
        回帰直線を表示
      </label>
    </div>
  );
}
