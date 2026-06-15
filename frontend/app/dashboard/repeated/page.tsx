"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { inputCls, textareaCls } from "@/components/ui/formStyles";
import { parseNullableNumbers } from "@/lib/parse";
import type { RepeatedMeasuresResult, RepeatedCondition } from "@/lib/types";
import { useDataset } from "@/contexts/DataContext";
import { continuousColumns } from "@/lib/dataUtils";

type CondState = { id: number; name: string; rawText: string };
type InputMode = "csv" | "manual";

let _id = 0;
function nextId() { return ++_id; }
function makeCond(): CondState { return { id: nextId(), name: "", rawText: "" }; }

export default function RepeatedAnovaPage() {
  const { dataset } = useDataset();
  const [inputMode, setInputMode] = useState<InputMode>("manual");

  const [variableName, setVariableName] = useState("測定値");
  const [conditionLabel, setConditionLabel] = useState("条件");
  const [conds, setConds] = useState<CondState[]>([makeCond(), makeCond(), makeCond()]);
  const [csvCols, setCsvCols] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RepeatedMeasuresResult | null>(null);

  useEffect(() => {
    if (!dataset) return;
    setInputMode("csv");
    setCsvCols((prev) => {
      const next: Record<string, boolean> = {};
      for (const c of continuousColumns(dataset.columns)) next[c.name] = prev[c.name] ?? false;
      return next;
    });
  }, [dataset]);

  const updateCond = useCallback((id: number, patch: Partial<CondState>) => {
    setConds((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }, []);
  const addCond = () => setConds((prev) => [...prev, makeCond()]);
  const removeCond = (id: number) => setConds((prev) => prev.filter((c) => c.id !== id));

  async function run() {
    setError(null);
    setLoading(true);
    setResult(null);
    try {
      let conditions: RepeatedCondition[];
      if (inputMode === "csv" && dataset) {
        const cols = continuousColumns(dataset.columns).filter((c) => csvCols[c.name]);
        if (cols.length < 3) throw new Error("条件として使う連続変数の列を3つ以上選んでください。");
        conditions = cols.map((c) => ({ name: c.name, values: c.values }));
      } else {
        conditions = conds
          .map((c, i) => ({ name: c.name.trim() || `条件${i + 1}`, rawText: c.rawText }))
          .filter((c) => c.rawText.trim() !== "")
          .map((c) => ({ name: c.name, values: parseNullableNumbers(c.rawText) }));
        if (conditions.length < 3) throw new Error("条件を3つ以上入力してください（各条件は同一対象の測定値）。");
      }
      setResult(await api.testRepeatedAnova({
        variable_name: variableName.trim() || "測定値",
        condition_label: conditionLabel.trim() || "条件",
        conditions,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white">反復測定分散分析</h1>
        <p className="text-[13px] text-gray-400 dark:text-neutral-500 mt-1">
          同一対象を3つ以上の条件（時点）で測定したデータの差を検定します（対応あり一元配置 ANOVA）。各条件は同じ対象を同じ順番で入力してください。
        </p>
      </div>

      {dataset && (
        <SegmentedControl
          value={inputMode}
          options={[
            { value: "csv", label: "CSVから選択" },
            { value: "manual", label: "手入力" },
          ]}
          onChange={setInputMode}
          ariaLabel="入力方法"
          className="mb-4"
        />
      )}

      <Card className="p-4 mb-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">測定値の名前</label>
            <input className={inputCls} value={variableName} onChange={(e) => setVariableName(e.target.value)} placeholder="例：握力" />
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">条件の呼び名</label>
            <input className={inputCls} value={conditionLabel} onChange={(e) => setConditionLabel(e.target.value)} placeholder="例：時点" />
          </div>
        </div>
      </Card>

      {inputMode === "csv" && dataset ? (
        <Card className="p-4">
          <p className="text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-2.5">
            条件の列（連続変数・3つ以上選択。各列が1条件、行が対象）
          </p>
          <div className="space-y-1.5">
            {continuousColumns(dataset.columns).map((c) => (
              <label key={c.name} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!csvCols[c.name]}
                  onChange={() => setCsvCols((prev) => ({ ...prev, [c.name]: !prev[c.name] }))}
                  className="rounded shrink-0"
                />
                <span className="text-[13px] text-gray-700 dark:text-neutral-300 truncate">{c.name}</span>
                <span className="text-[11px] text-gray-400 dark:text-neutral-600 shrink-0">
                  （有効 {c.n_valid} / 欠損 {c.n_missing}）
                </span>
              </label>
            ))}
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {conds.map((c, idx) => (
            <Card key={c.id} className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-gray-400 dark:text-neutral-600 w-5">{idx + 1}</span>
                <input
                  className={inputCls + " flex-1 min-w-[8rem]"}
                  placeholder={`条件${idx + 1}の名前（例：${idx === 0 ? "前" : idx === 1 ? "中" : "後"}）`}
                  value={c.name}
                  onChange={(e) => updateCond(c.id, { name: e.target.value })}
                />
                {conds.length > 3 && (
                  <button
                    onClick={() => removeCond(c.id)}
                    className="text-gray-300 dark:text-neutral-700 hover:text-red-400 transition-colors text-[18px] leading-none shrink-0"
                    title="削除"
                  >
                    ×
                  </button>
                )}
              </div>
              <textarea
                className={textareaCls}
                rows={3}
                placeholder="この条件の測定値を、対象の順番をそろえて1行1件で入力"
                value={c.rawText}
                onChange={(e) => updateCond(c.id, { rawText: e.target.value })}
              />
            </Card>
          ))}
          <button
            onClick={addCond}
            className="flex items-center gap-1.5 text-[12px] text-white hover:text-white transition-colors"
          >
            <span className="text-[16px] leading-none">+</span> 条件を追加
          </button>
        </div>
      )}

      <div className="mt-4">
        <Button onClick={run} disabled={loading}>
          {loading ? "計算中..." : "反復測定ANOVAを実行"}
        </Button>
      </div>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {result && (
        <div className="mt-6 space-y-4">
          <Card className="p-4">
            <p className="text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-3">{result.test_name}</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-4">
              {([
                ["F値", fmt(result.f_statistic, 2)],
                ["自由度", `${fmt(result.df_num, 0)}, ${fmt(result.df_den, 0)}`],
                ["p値", fmtP(result.p_value)],
                ["対象数 / 除外", `${result.n_subjects} / ${result.n_excluded}`],
              ] as [string, string][]).map(([label, val]) => (
                <div key={label}>
                  <div className="text-[11px] text-gray-400 dark:text-neutral-600">{label}</div>
                  <div className={`text-[15px] font-semibold tabular-nums ${
                    label === "p値" && result.p_value < 0.05 ? "text-white" : "text-gray-800 dark:text-neutral-200"
                  }`}>{val}</div>
                </div>
              ))}
            </div>
          </Card>

          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-500 dark:text-neutral-500">
                  <th className="text-left px-4 py-2.5 font-medium">条件</th>
                  <th className="text-right px-4 py-2.5 font-medium">平均値</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(result.condition_means).map(([name, mean]) => (
                  <tr key={name} className="border-b border-gray-100 dark:border-neutral-900 last:border-0">
                    <td className="px-4 py-2 font-medium text-gray-800 dark:text-neutral-200">{name}</td>
                    <td className="px-4 py-2 text-right tabular-nums text-gray-700 dark:text-neutral-300">{fmt(mean, 2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Card className="p-4">
            <p className="text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">結果の解釈</p>
            <p className="text-[13px] leading-relaxed text-gray-700 dark:text-neutral-300">{result.interpretation}</p>
          </Card>
        </div>
      )}
    </div>
  );
}

function fmt(n: number, d = 3): string {
  if (!Number.isFinite(n)) return "—";
  return n.toFixed(d);
}
function fmtP(p: number): string {
  if (!Number.isFinite(p)) return "—";
  return p < 0.001 ? "<0.001" : p.toFixed(3);
}
