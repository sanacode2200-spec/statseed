"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { inputCls, textareaCls } from "@/components/ui/formStyles";
import { parseNullableNumbers } from "@/lib/parse";
import type {
  LinearRegressionRequest,
  LinearRegressionResult,
  LogisticRegressionResult,
  RegressionPredictor,
} from "@/lib/types";
import { useDataset } from "@/contexts/DataContext";
import { continuousColumns, numericAnalysisColumns, findColumn } from "@/lib/dataUtils";

type PredState = { id: number; name: string; rawText: string };
type InputMode = "csv" | "manual";
type ModelType = "linear" | "logistic";

let _id = 0;
function nextId() { return ++_id; }
function makePred(): PredState { return { id: nextId(), name: "", rawText: "" }; }

export default function RegressionPage() {
  const { dataset } = useDataset();
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [modelType, setModelType] = useState<ModelType>("linear");

  // 手入力
  const [outcomeName, setOutcomeName] = useState("目的変数");
  const [outcomeText, setOutcomeText] = useState("");
  const [preds, setPreds] = useState<PredState[]>([makePred()]);

  // CSV
  const [csvOutcomeCol, setCsvOutcomeCol] = useState("");
  const [csvPredCols, setCsvPredCols] = useState<Record<string, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinearRegressionResult | null>(null);
  const [logitResult, setLogitResult] = useState<LogisticRegressionResult | null>(null);

  const isLogistic = modelType === "logistic";
  // ロジスティックのアウトカム列は 0/1 を想定し、数値列全体から選べるようにする
  const outcomeColumns = dataset
    ? (isLogistic ? numericAnalysisColumns(dataset.columns) : continuousColumns(dataset.columns))
    : [];

  useEffect(() => {
    if (!dataset) return;
    setInputMode("csv");
    const cont = continuousColumns(dataset.columns);
    setCsvOutcomeCol((prev) => (cont.some((c) => c.name === prev) ? prev : (cont[0]?.name ?? "")));
    setCsvPredCols((prev) => {
      const next: Record<string, boolean> = {};
      for (const c of cont) next[c.name] = prev[c.name] ?? false;
      return next;
    });
  }, [dataset]);

  const updatePred = useCallback((id: number, patch: Partial<PredState>) => {
    setPreds((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }, []);
  const addPred = () => setPreds((prev) => [...prev, makePred()]);
  const removePred = (id: number) => setPreds((prev) => prev.filter((p) => p.id !== id));

  async function run() {
    setError(null);
    setLoading(true);
    setResult(null);
    setLogitResult(null);
    try {
      let outcome: (number | null)[];
      let predictors: RegressionPredictor[];
      let outName: string;

      if (inputMode === "csv" && dataset) {
        const outCol = findColumn(dataset.columns, csvOutcomeCol);
        if (!outCol) throw new Error("目的変数の列を選択してください。");
        const predCols = continuousColumns(dataset.columns).filter(
          (c) => csvPredCols[c.name] && c.name !== csvOutcomeCol
        );
        if (predCols.length === 0) throw new Error("説明変数の列を1つ以上選択してください。");
        outName = outCol.name;
        outcome = outCol.values;
        predictors = predCols.map((c) => ({ name: c.name, values: c.values }));
      } else {
        outcome = parseNullableNumbers(outcomeText);
        predictors = preds
          .map((p, i) => ({ name: p.name.trim() || `説明変数${i + 1}`, rawText: p.rawText }))
          .filter((p) => p.rawText.trim() !== "")
          .map((p) => ({ name: p.name, values: parseNullableNumbers(p.rawText) }));
        if (predictors.length === 0) throw new Error("説明変数を1つ以上入力してください。");
        outName = outcomeName.trim() || (isLogistic ? "アウトカム" : "目的変数");
      }

      if (isLogistic) {
        setLogitResult(await api.regressionLogistic({ outcome_name: outName, outcome, predictors }));
      } else {
        const req: LinearRegressionRequest = { outcome_name: outName, outcome, predictors };
        setResult(await api.regressionLinear(req));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white">回帰分析</h1>
        <p className="text-[13px] text-gray-400 dark:text-neutral-500 mt-1">
          {isLogistic
            ? "0/1 の2値アウトカム（1=イベント発生）を説明変数で予測します。各説明変数のオッズ比(OR)と95%CIを算出します。"
            : "1つの目的変数（連続変数）を1つ以上の説明変数で予測します。説明変数を複数指定すると重回帰（共変量調整）になります。"}
        </p>
      </div>

      <SegmentedControl
        value={modelType}
        options={[
          { value: "linear", label: "線形回帰" },
          { value: "logistic", label: "ロジスティック回帰" },
        ]}
        onChange={setModelType}
        ariaLabel="回帰の種類"
        className="mb-4"
      />

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

      {inputMode === "csv" && dataset ? (
        <div className="space-y-3">
          <Card className="p-4">
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">
              {isLogistic ? "アウトカム（0/1 の列）" : "目的変数（連続変数）"}
            </label>
            <select
              value={csvOutcomeCol}
              onChange={(e) => setCsvOutcomeCol(e.target.value)}
              className={inputCls + " w-full sm:w-72"}
            >
              {outcomeColumns.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </Card>

          <Card className="p-4">
            <p className="text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-2.5">
              説明変数（連続変数・複数選択可）
            </p>
            <div className="space-y-1.5">
              {continuousColumns(dataset.columns).filter((c) => c.name !== csvOutcomeCol).map((c) => (
                <label key={c.name} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!csvPredCols[c.name]}
                    onChange={() => setCsvPredCols((prev) => ({ ...prev, [c.name]: !prev[c.name] }))}
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
        </div>
      ) : (
        <div className="space-y-3">
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-gray-500 dark:text-neutral-500 shrink-0">{isLogistic ? "アウトカム" : "目的変数"}</span>
              <input
                className={inputCls + " flex-1 min-w-[8rem]"}
                placeholder={isLogistic ? "アウトカム名（例：再入院）" : "目的変数名"}
                value={outcomeName}
                onChange={(e) => setOutcomeName(e.target.value)}
              />
            </div>
            <textarea
              className={textareaCls}
              rows={3}
              placeholder={isLogistic
                ? "0 / 1 を1行1件で入力（1=イベント発生, 0=非発生。欠損: NA, -）"
                : "目的変数の数値をスペース・改行・カンマ区切りで入力（欠損: NA, -）"}
              value={outcomeText}
              onChange={(e) => setOutcomeText(e.target.value)}
            />
          </Card>

          {preds.map((p, idx) => (
            <Card key={p.id} className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-gray-400 dark:text-neutral-600 w-5">{idx + 1}</span>
                <input
                  className={inputCls + " flex-1 min-w-[8rem]"}
                  placeholder={`説明変数${idx + 1}の名前`}
                  value={p.name}
                  onChange={(e) => updatePred(p.id, { name: e.target.value })}
                />
                {preds.length > 1 && (
                  <button
                    onClick={() => removePred(p.id)}
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
                placeholder="説明変数の数値を目的変数と同じ順番・件数で入力"
                value={p.rawText}
                onChange={(e) => updatePred(p.id, { rawText: e.target.value })}
              />
            </Card>
          ))}

          <button
            onClick={addPred}
            className="flex items-center gap-1.5 text-[12px] text-white hover:text-white transition-colors"
          >
            <span className="text-[16px] leading-none">+</span> 説明変数を追加
          </button>
        </div>
      )}

      <div className="mt-4">
        <Button onClick={run} disabled={loading}>
          {loading ? "計算中..." : "回帰分析を実行"}
        </Button>
      </div>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {result && (
        <div className="mt-6 space-y-4">
          <ModelFit result={result} />
          <CoefTable result={result} />
          <InterpretationCard text={result.interpretation} />
        </div>
      )}

      {logitResult && (
        <div className="mt-6 space-y-4">
          <LogitModelFit result={logitResult} />
          <OddsTable result={logitResult} />
          <InterpretationCard text={logitResult.interpretation} />
        </div>
      )}
    </div>
  );
}

function InterpretationCard({ text }: { text: string }) {
  return (
    <Card className="p-4">
      <p className="text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">結果の解釈</p>
      <p className="text-[13px] leading-relaxed text-gray-700 dark:text-neutral-300">{text}</p>
    </Card>
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

function ModelFit({ result }: { result: LinearRegressionResult }) {
  const items: [string, string][] = [
    ["R²（決定係数）", fmt(result.r_squared)],
    ["自由度調整済み R²", fmt(result.adj_r_squared)],
    ["F値", fmt(result.f_statistic, 2)],
    ["モデルの p値", fmtP(result.f_pvalue)],
    ["解析に使用 / 全体", `${result.n_used} / ${result.n_total}`],
    ["欠損で除外", String(result.n_excluded)],
  ];
  return (
    <Card className="p-4">
      <p className="text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-3">モデルの当てはまり</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
        {items.map(([label, val]) => (
          <div key={label}>
            <div className="text-[11px] text-gray-400 dark:text-neutral-600">{label}</div>
            <div className="text-[15px] font-semibold text-gray-800 dark:text-neutral-200 tabular-nums">{val}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LogitModelFit({ result }: { result: LogisticRegressionResult }) {
  const items: [string, string][] = [
    ["McFadden 擬似R²", fmt(result.pseudo_r_squared)],
    ["尤度比検定 p値", fmtP(result.lr_pvalue)],
    ["イベント / 使用数", `${result.n_events} / ${result.n_used}`],
    ["解析に使用 / 全体", `${result.n_used} / ${result.n_total}`],
    ["対数尤度", fmt(result.log_likelihood, 2)],
    ["欠損で除外", String(result.n_excluded)],
  ];
  return (
    <Card className="p-4">
      <p className="text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-3">モデルの当てはまり</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
        {items.map(([label, val]) => (
          <div key={label}>
            <div className="text-[11px] text-gray-400 dark:text-neutral-600">{label}</div>
            <div className="text-[15px] font-semibold text-gray-800 dark:text-neutral-200 tabular-nums">{val}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OddsTable({ result }: { result: LogisticRegressionResult }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-500 dark:text-neutral-500">
            <th className="text-left px-4 py-2.5 font-medium">項目</th>
            <th className="text-right px-4 py-2.5 font-medium">オッズ比 (OR)</th>
            <th className="text-center px-4 py-2.5 font-medium">OR の 95%CI</th>
            <th className="text-right px-4 py-2.5 font-medium">係数(対数オッズ)</th>
            <th className="text-right px-4 py-2.5 font-medium">p値</th>
          </tr>
        </thead>
        <tbody>
          {result.coefficients.map((c, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-neutral-900 last:border-0">
              <td className="px-4 py-2 font-medium text-gray-800 dark:text-neutral-200">{c.name}</td>
              <td className="px-4 py-2 text-right tabular-nums text-gray-700 dark:text-neutral-300">{fmt(c.odds_ratio, 3)}</td>
              <td className="px-4 py-2 text-center tabular-nums text-gray-500 dark:text-neutral-500">
                {fmt(c.or_ci95_low, 3)} – {fmt(c.or_ci95_high, 3)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-gray-500 dark:text-neutral-500">{fmt(c.coef, 4)}</td>
              <td className={`px-4 py-2 text-right tabular-nums ${
                c.p_value < 0.05 ? "font-semibold text-white" : "text-gray-500 dark:text-neutral-500"
              }`}>
                {fmtP(c.p_value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CoefTable({ result }: { result: LinearRegressionResult }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-500 dark:text-neutral-500">
            <th className="text-left px-4 py-2.5 font-medium">項目</th>
            <th className="text-right px-4 py-2.5 font-medium">係数</th>
            <th className="text-center px-4 py-2.5 font-medium">95%CI</th>
            <th className="text-right px-4 py-2.5 font-medium">標準化係数</th>
            <th className="text-right px-4 py-2.5 font-medium">p値</th>
          </tr>
        </thead>
        <tbody>
          {result.coefficients.map((c, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-neutral-900 last:border-0">
              <td className="px-4 py-2 font-medium text-gray-800 dark:text-neutral-200">{c.name}</td>
              <td className="px-4 py-2 text-right tabular-nums text-gray-700 dark:text-neutral-300">{fmt(c.coef, 4)}</td>
              <td className="px-4 py-2 text-center tabular-nums text-gray-500 dark:text-neutral-500">
                {fmt(c.ci95_low, 3)} – {fmt(c.ci95_high, 3)}
              </td>
              <td className="px-4 py-2 text-right tabular-nums text-gray-500 dark:text-neutral-500">
                {c.std_coef === null ? "—" : fmt(c.std_coef, 3)}
              </td>
              <td className={`px-4 py-2 text-right tabular-nums ${
                c.p_value < 0.05 ? "font-semibold text-white" : "text-gray-500 dark:text-neutral-500"
              }`}>
                {fmtP(c.p_value)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
