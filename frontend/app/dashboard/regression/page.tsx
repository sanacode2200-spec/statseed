"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { inputCls, textareaCls } from "@/components/ui/formStyles";
import { parseNullableNumbers, parseCategoricalValues } from "@/lib/parse";
import type {
  LinearRegressionRequest,
  LinearRegressionResult,
  LogisticRegressionResult,
  MixedModelResult,
  PoissonRegressionResult,
  RegressionPredictor,
} from "@/lib/types";
import { useDataset } from "@/contexts/DataContext";
import { continuousColumns, numericAnalysisColumns, groupColumns, findColumn } from "@/lib/dataUtils";

type PredState = { id: number; name: string; rawText: string };
type InputMode = "csv" | "manual";
type ModelType = "linear" | "logistic" | "poisson" | "mixed";

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
  const [groupName, setGroupName] = useState("患者ID");
  const [groupText, setGroupText] = useState("");
  const [randomSlope, setRandomSlope] = useState("");

  // CSV
  const [csvOutcomeCol, setCsvOutcomeCol] = useState("");
  const [csvPredCols, setCsvPredCols] = useState<Record<string, boolean>>({});
  const [csvGroupCol, setCsvGroupCol] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<LinearRegressionResult | null>(null);
  const [logitResult, setLogitResult] = useState<LogisticRegressionResult | null>(null);
  const [poissonResult, setPoissonResult] = useState<PoissonRegressionResult | null>(null);
  const [mixedResult, setMixedResult] = useState<MixedModelResult | null>(null);

  const isLogistic = modelType === "logistic";
  const isPoisson = modelType === "poisson";
  const isMixed = modelType === "mixed";
  // ロジスティック(0/1)・ポアソン(カウント)のアウトカムは数値列全体から選べるようにする
  const outcomeColumns = dataset
    ? (modelType === "logistic" || modelType === "poisson" ? numericAnalysisColumns(dataset.columns) : continuousColumns(dataset.columns))
    : [];

  // ランダム傾きの選択候補（現在指定されている説明変数名）
  const predictorNameCandidates =
    inputMode === "csv" && dataset
      ? continuousColumns(dataset.columns)
          .filter((c) => csvPredCols[c.name] && c.name !== csvOutcomeCol && c.name !== csvGroupCol)
          .map((c) => c.name)
      : preds.map((p) => p.name.trim()).filter(Boolean);
  // 選択中の説明変数が削除・改名された場合は未選択扱いにする
  const effectiveRandomSlope = predictorNameCandidates.includes(randomSlope) ? randomSlope : "";

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
    const groups = groupColumns(dataset.columns);
    setCsvGroupCol((prev) => (groups.some((c) => c.name === prev) ? prev : (groups[0]?.name ?? "")));
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
    setPoissonResult(null);
    setMixedResult(null);
    try {
      let outcome: (number | null)[];
      let predictors: RegressionPredictor[];
      let outName: string;
      let group: (string | null)[] = [];
      let groupNameUsed = "";

      if (inputMode === "csv" && dataset) {
        const outCol = findColumn(dataset.columns, csvOutcomeCol);
        if (!outCol) throw new Error("目的変数の列を選択してください。");
        const predCols = continuousColumns(dataset.columns).filter(
          (c) => csvPredCols[c.name] && c.name !== csvOutcomeCol && c.name !== csvGroupCol
        );
        if (predCols.length === 0) throw new Error("説明変数の列を1つ以上選択してください。");
        outName = outCol.name;
        outcome = outCol.values;
        predictors = predCols.map((c) => ({ name: c.name, values: c.values }));
        if (isMixed) {
          const groupCol = findColumn(dataset.columns, csvGroupCol);
          if (!groupCol) throw new Error("グループ（クラスタリング単位）の列を選択してください。");
          group = groupCol.cat_values;
          groupNameUsed = groupCol.name;
        }
      } else {
        outcome = parseNullableNumbers(outcomeText);
        predictors = preds
          .map((p, i) => ({ name: p.name.trim() || `説明変数${i + 1}`, rawText: p.rawText }))
          .filter((p) => p.rawText.trim() !== "")
          .map((p) => ({ name: p.name, values: parseNullableNumbers(p.rawText) }));
        if (predictors.length === 0) throw new Error("説明変数を1つ以上入力してください。");
        outName = outcomeName.trim() || (isLogistic ? "アウトカム" : isPoisson ? "件数" : "目的変数");
        if (isMixed) {
          group = parseCategoricalValues(groupText);
          if (group.length === 0) throw new Error("グループ（クラスタリング単位）を入力してください。");
          groupNameUsed = groupName.trim() || "グループ";
        }
      }

      if (isLogistic) {
        setLogitResult(await api.regressionLogistic({ outcome_name: outName, outcome, predictors }));
      } else if (isPoisson) {
        setPoissonResult(await api.regressionPoisson({ outcome_name: outName, outcome, predictors }));
      } else if (isMixed) {
        setMixedResult(
          await api.regressionMixed({
            outcome_name: outName,
            outcome,
            predictors,
            group_name: groupNameUsed,
            group,
            random_slope: effectiveRandomSlope || null,
          })
        );
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
        <h1 className="text-[24px] font-semibold text-gray-900 dark:text-white">回帰分析</h1>
        <p className="text-[16px] text-gray-400 dark:text-neutral-500 mt-1">
          {isLogistic
            ? "0/1 の2値アウトカム（1=イベント発生）を説明変数で予測します。各説明変数のオッズ比(OR)と95%CIを算出します。"
            : isPoisson
            ? "カウント（0以上の整数。例：転倒回数）を説明変数で予測します。各説明変数の発生率比(IRR)と95%CIを算出します。"
            : isMixed
            ? "患者IDなど繰り返し測定・クラスタリングの単位（グループ）をランダム切片で調整したうえで、説明変数の影響を推定します（線形混合モデル）。"
            : "1つの目的変数（連続変数）を1つ以上の説明変数で予測します。説明変数を複数指定すると重回帰（共変量調整）になります。"}
        </p>
      </div>

      <SegmentedControl
        value={modelType}
        options={[
          { value: "linear", label: "線形回帰" },
          { value: "logistic", label: "ロジスティック回帰" },
          { value: "poisson", label: "ポアソン回帰" },
          { value: "mixed", label: "混合効果モデル" },
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
            <label htmlFor="regression-outcome-col" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">
              {isLogistic ? "アウトカム（0/1 の列）" : isPoisson ? "件数（カウントの列）" : "目的変数（連続変数）"}
            </label>
            <select
              id="regression-outcome-col"
              value={csvOutcomeCol}
              onChange={(e) => setCsvOutcomeCol(e.target.value)}
              className={inputCls + " w-full sm:w-72"}
            >
              {outcomeColumns.map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </Card>

          {isMixed && (
            <Card className="p-4">
              <label htmlFor="regression-group-col" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">
                グループ（患者IDなどクラスタリングの単位）
              </label>
              <select
                id="regression-group-col"
                value={csvGroupCol}
                onChange={(e) => setCsvGroupCol(e.target.value)}
                className={inputCls + " w-full sm:w-72"}
              >
                {groupColumns(dataset.columns).map((c) => (
                  <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                ))}
              </select>
            </Card>
          )}

          <Card className="p-4">
            <p className="text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-2.5">
              説明変数（連続変数・複数選択可）
            </p>
            <div className="space-y-1.5">
              {continuousColumns(dataset.columns).filter((c) => c.name !== csvOutcomeCol && c.name !== (isMixed ? csvGroupCol : "")).map((c) => (
                <label key={c.name} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!csvPredCols[c.name]}
                    onChange={() => setCsvPredCols((prev) => ({ ...prev, [c.name]: !prev[c.name] }))}
                    className="rounded shrink-0"
                  />
                  <span className="text-[16px] text-gray-700 dark:text-neutral-300 truncate">{c.name}</span>
                  <span className="text-[13px] text-gray-400 dark:text-neutral-600 shrink-0">
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
              <label htmlFor="regression-outcome-name" className="text-[14px] text-gray-500 dark:text-neutral-500 shrink-0">{isLogistic ? "アウトカム" : isPoisson ? "件数" : "目的変数"}</label>
              <input
                id="regression-outcome-name"
                className={inputCls + " flex-1 min-w-[8rem]"}
                placeholder={isLogistic ? "アウトカム名（例：再入院）" : isPoisson ? "件数名（例：転倒回数）" : "目的変数名"}
                value={outcomeName}
                onChange={(e) => setOutcomeName(e.target.value)}
              />
            </div>
            <textarea
              aria-label={isLogistic ? "アウトカムの値" : isPoisson ? "件数の値" : "目的変数の値"}
              className={textareaCls}
              rows={3}
              placeholder={isLogistic
                ? "0 / 1 を1行1件で入力（1=イベント発生, 0=非発生。欠損: NA, -）"
                : isPoisson
                ? "0以上の整数を1行1件で入力（例：転倒回数。欠損: NA, -）"
                : "目的変数の数値をスペース・改行・カンマ区切りで入力（欠損: NA, -）"}
              value={outcomeText}
              onChange={(e) => setOutcomeText(e.target.value)}
            />
          </Card>

          {isMixed && (
            <Card className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label htmlFor="regression-group-name" className="text-[14px] text-gray-500 dark:text-neutral-500 shrink-0">グループ</label>
                <input
                  id="regression-group-name"
                  className={inputCls + " flex-1 min-w-[8rem]"}
                  placeholder="グループ名（例：患者ID）"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <textarea
                aria-label="グループの値"
                className={textareaCls}
                rows={3}
                placeholder="患者IDなどクラスタリングの単位を目的変数と同じ順番・件数で入力（改行・カンマ区切り）"
                value={groupText}
                onChange={(e) => setGroupText(e.target.value)}
              />
            </Card>
          )}

          {preds.map((p, idx) => (
            <Card key={p.id} className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <label htmlFor={`regression-predictor-name-${p.id}`} className="text-[13px] text-gray-400 dark:text-neutral-600 w-5">{idx + 1}</label>
                <input
                  id={`regression-predictor-name-${p.id}`}
                  className={inputCls + " flex-1 min-w-[8rem]"}
                  placeholder={`説明変数${idx + 1}の名前`}
                  value={p.name}
                  onChange={(e) => updatePred(p.id, { name: e.target.value })}
                />
                {preds.length > 1 && (
                  <button
                    onClick={() => removePred(p.id)}
                    className="text-gray-300 dark:text-neutral-700 hover:text-red-400 transition-colors text-[22px] leading-none shrink-0"
                    title="削除"
                    aria-label={`説明変数${idx + 1}を削除`}
                  >
                    ×
                  </button>
                )}
              </div>
              <textarea
                aria-label={`説明変数${idx + 1}の値`}
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
            className="flex items-center gap-1.5 text-[14px] text-white hover:text-white transition-colors"
          >
            <span className="text-[19px] leading-none">+</span> 説明変数を追加
          </button>
        </div>
      )}

      {isMixed && predictorNameCandidates.length > 0 && (
        <Card className="p-4 mt-3">
          <label htmlFor="regression-random-slope" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">
            ランダム傾き（任意）
          </label>
          <p className="text-[13px] text-gray-400 dark:text-neutral-600 mb-2">
            指定した説明変数の効果がグループごとに変動することを許容します（例：時間経過の効果が患者ごとに異なる）
          </p>
          <select
            id="regression-random-slope"
            value={effectiveRandomSlope}
            onChange={(e) => setRandomSlope(e.target.value)}
            className={inputCls + " w-full sm:w-72"}
          >
            <option value="">なし（ランダム切片のみ）</option>
            {predictorNameCandidates.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </Card>
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

      {poissonResult && (
        <div className="mt-6 space-y-4">
          <PoissonModelFit result={poissonResult} />
          <RateTable result={poissonResult} />
          <InterpretationCard text={poissonResult.interpretation} />
        </div>
      )}

      {mixedResult && (
        <div className="mt-6 space-y-4">
          <MixedModelFit result={mixedResult} />
          <MixedCoefTable result={mixedResult} />
          <InterpretationCard text={mixedResult.interpretation} />
        </div>
      )}
    </div>
  );
}

function InterpretationCard({ text }: { text: string }) {
  return (
    <Card className="p-4">
      <p className="text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">結果の解釈</p>
      <p className="text-[16px] leading-relaxed text-gray-700 dark:text-neutral-300">{text}</p>
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
      <p className="text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-3">モデルの当てはまり</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
        {items.map(([label, val]) => (
          <div key={label}>
            <div className="text-[13px] text-gray-400 dark:text-neutral-600">{label}</div>
            <div className="text-[18px] font-semibold text-gray-800 dark:text-neutral-200 tabular-nums">{val}</div>
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
      <p className="text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-3">モデルの当てはまり</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
        {items.map(([label, val]) => (
          <div key={label}>
            <div className="text-[13px] text-gray-400 dark:text-neutral-600">{label}</div>
            <div className="text-[18px] font-semibold text-gray-800 dark:text-neutral-200 tabular-nums">{val}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function OddsTable({ result }: { result: LogisticRegressionResult }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full text-[16px]">
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

function PoissonModelFit({ result }: { result: PoissonRegressionResult }) {
  const items: [string, string][] = [
    ["McFadden 擬似R²", fmt(result.pseudo_r_squared)],
    ["尤度比検定 p値", fmtP(result.lr_pvalue)],
    ["逸脱度 (deviance)", fmt(result.deviance, 2)],
    ["解析に使用 / 全体", `${result.n_used} / ${result.n_total}`],
    ["対数尤度", fmt(result.log_likelihood, 2)],
    ["欠損で除外", String(result.n_excluded)],
  ];
  return (
    <Card className="p-4">
      <p className="text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-3">モデルの当てはまり</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
        {items.map(([label, val]) => (
          <div key={label}>
            <div className="text-[13px] text-gray-400 dark:text-neutral-600">{label}</div>
            <div className="text-[18px] font-semibold text-gray-800 dark:text-neutral-200 tabular-nums">{val}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function RateTable({ result }: { result: PoissonRegressionResult }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full text-[16px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-500 dark:text-neutral-500">
            <th className="text-left px-4 py-2.5 font-medium">項目</th>
            <th className="text-right px-4 py-2.5 font-medium">発生率比 (IRR)</th>
            <th className="text-center px-4 py-2.5 font-medium">IRR の 95%CI</th>
            <th className="text-right px-4 py-2.5 font-medium">係数(対数)</th>
            <th className="text-right px-4 py-2.5 font-medium">p値</th>
          </tr>
        </thead>
        <tbody>
          {result.coefficients.map((c, i) => (
            <tr key={i} className="border-b border-gray-100 dark:border-neutral-900 last:border-0">
              <td className="px-4 py-2 font-medium text-gray-800 dark:text-neutral-200">{c.name}</td>
              <td className="px-4 py-2 text-right tabular-nums text-gray-700 dark:text-neutral-300">{fmt(c.rate_ratio, 3)}</td>
              <td className="px-4 py-2 text-center tabular-nums text-gray-500 dark:text-neutral-500">
                {fmt(c.rr_ci95_low, 3)} – {fmt(c.rr_ci95_high, 3)}
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

function MixedModelFit({ result }: { result: MixedModelResult }) {
  const items: [string, string][] = [
    [`${result.group_name}間のばらつき（群間分散）`, fmt(result.group_var, 3)],
    ["残差分散", fmt(result.resid_var, 3)],
    ["ICC（群内相関係数）", fmt(result.icc, 3)],
    [`${result.group_name}の数`, String(result.n_groups)],
    ["解析に使用 / 全体", `${result.n_used} / ${result.n_total}`],
    ["欠損で除外", String(result.n_excluded)],
  ];
  if (result.random_slope_name !== null && result.slope_var !== null) {
    items.push([`「${result.random_slope_name}」のランダム傾き分散`, fmt(result.slope_var, 3)]);
    items.push(["切片と傾きの相関", fmt(result.intercept_slope_corr ?? NaN, 3)]);
  }
  return (
    <Card className="p-4">
      <p className="text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-3">モデルの当てはまり</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3">
        {items.map(([label, val]) => (
          <div key={label}>
            <div className="text-[13px] text-gray-400 dark:text-neutral-600">{label}</div>
            <div className="text-[18px] font-semibold text-gray-800 dark:text-neutral-200 tabular-nums">{val}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function MixedCoefTable({ result }: { result: MixedModelResult }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full text-[16px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 text-gray-500 dark:text-neutral-500">
            <th className="text-left px-4 py-2.5 font-medium">項目（固定効果）</th>
            <th className="text-right px-4 py-2.5 font-medium">係数</th>
            <th className="text-center px-4 py-2.5 font-medium">95%CI</th>
            <th className="text-right px-4 py-2.5 font-medium">z値</th>
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
              <td className="px-4 py-2 text-right tabular-nums text-gray-500 dark:text-neutral-500">{fmt(c.z_value, 3)}</td>
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
      <table className="w-full text-[16px]">
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
