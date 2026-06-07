"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { CategoricalResponse, DescriptiveResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { DescriptiveResultTable } from "@/components/stats/DescriptiveResultTable";
import { CategoricalResultTable } from "@/components/stats/CategoricalResultTable";
import {
  parseCategoricalValues,
  parseNullableNumbers,
} from "@/lib/parse";
import { exportCategoricalCsv, exportDescriptiveCsv } from "@/lib/exportCsv";
import { useDataset } from "@/contexts/DataContext";
import { categoricalColumns, continuousColumns, findColumn } from "@/lib/dataUtils";

type Mode = "continuous" | "categorical";
type InputMode = "csv" | "manual";

const inputCls =
  "w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-[13px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700";

export default function DescriptivePage() {
  const { dataset } = useDataset();
  const [mode, setMode] = useState<Mode>("continuous");
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [csvColName, setCsvColName] = useState("");
  const [variableName, setVariableName] = useState("変数");
  const [rawText, setRawText] = useState("");
  const [continuousResult, setContinuousResult] = useState<DescriptiveResponse | null>(null);
  const [categoricalResult, setCategoricalResult] = useState<CategoricalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // データ読み込み済みなら自動的にCSVモードへ
  useEffect(() => {
    if (dataset) setInputMode("csv");
  }, [dataset]);

  // モード切替時、選択中の列が新モードに合わなければ最初の列を選び直す
  useEffect(() => {
    if (!dataset || inputMode !== "csv") return;
    const cols = mode === "continuous" ? continuousColumns(dataset.columns) : categoricalColumns(dataset.columns);
    if (!cols.some((c) => c.name === csvColName)) {
      setCsvColName(cols[0]?.name ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, inputMode, mode]);

  function switchMode(next: Mode) {
    setMode(next);
    setContinuousResult(null);
    setCategoricalResult(null);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setContinuousResult(null);
    setCategoricalResult(null);
    setLoading(true);

    try {
      if (inputMode === "csv") {
        if (!dataset) throw new Error("データが読み込まれていません。");
        const col = findColumn(dataset.columns, csvColName);
        if (!col) throw new Error("列を選択してください。");

        if (mode === "continuous") {
          const values = col.values;
          if (values.length === 0) throw new Error("データがありません。");
          const res = await api.descriptive({ variable_name: col.name, values });
          setContinuousResult(res);
        } else {
          const values = col.cat_values.filter((v): v is string => v !== null);
          if (values.length === 0) throw new Error("データがありません。");
          const res = await api.categoricalDescriptive({ variable_name: col.name, values });
          setCategoricalResult(res);
        }
      } else if (mode === "continuous") {
        const values = parseNullableNumbers(rawText);
        if (values.length === 0) throw new Error("データを入力してください。");
        const res = await api.descriptive({ variable_name: variableName, values });
        setContinuousResult(res);
      } else {
        const values = parseCategoricalValues(rawText);
        if (values.length === 0) throw new Error("データを入力してください。");
        const res = await api.categoricalDescriptive({ variable_name: variableName, values });
        setCategoricalResult(res);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  const result = mode === "continuous" ? continuousResult : categoricalResult;
  const csvCols = dataset ? (mode === "continuous" ? continuousColumns(dataset.columns) : categoricalColumns(dataset.columns)) : [];

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-1">
        解析
      </div>
      <h1 className="text-[20px] font-bold text-gray-900 dark:text-white mb-1">記述統計</h1>
      <p className="text-[13px] text-gray-400 dark:text-neutral-600 mb-5">
        データを入力すると統計量を自動計算します。
      </p>

      {/* モード切り替え */}
      <div className="flex gap-1.5 mb-5">
        {([
          { value: "continuous", label: "連続変数" },
          { value: "categorical", label: "カテゴリ変数" },
        ] as const).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => switchMode(opt.value)}
            className={`px-3 py-1 rounded-md text-[12px] font-medium border transition-colors ${
              mode === opt.value
                ? "text-white border-transparent"
                : "text-gray-500 dark:text-neutral-500 border-gray-200 dark:border-neutral-800 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-neutral-900"
            }`}
            style={mode === opt.value ? { backgroundColor: "#fff", color: "#000" } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Card className="mb-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {dataset && (
            <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-neutral-900 rounded-md w-fit">
              {([
                { value: "csv", label: "CSVから選択" },
                { value: "manual", label: "手入力" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setInputMode(opt.value)}
                  className={`px-3 py-1 rounded text-[12px] font-medium transition-colors ${
                    inputMode === opt.value
                      ? "bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm"
                      : "text-gray-500 dark:text-neutral-500 hover:text-gray-700 dark:hover:text-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {inputMode === "csv" && dataset ? (
            <div>
              <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                {mode === "continuous" ? "連続変数の列" : "カテゴリ変数の列"}
              </label>
              {csvCols.length === 0 ? (
                <p className="text-[12px] text-orange-500 dark:text-orange-400">
                  {mode === "continuous" ? "連続変数の列が見つかりません。" : "カテゴリ変数の列が見つかりません。"}
                </p>
              ) : (
                <select
                  value={csvColName}
                  onChange={(e) => setCsvColName(e.target.value)}
                  className={inputCls}
                >
                  {csvCols.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <>
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">変数名</label>
                <input
                  type="text"
                  value={variableName}
                  onChange={(e) => setVariableName(e.target.value)}
                  className={inputCls}
                  placeholder="例：性別、診断名、年齢など"
                />
              </div>

              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">データ</label>
                {mode === "continuous" ? (
                  <p className="text-[12px] text-gray-400 dark:text-neutral-600 mb-1.5">
                    数値を改行・スペース・カンマのいずれかで区切って入力してください。欠損値はNA、- で表せます。
                  </p>
                ) : (
                  <p className="text-[12px] text-gray-400 dark:text-neutral-600 mb-1.5">
                    カテゴリ値を1行1件（またはカンマ・タブ区切り）で入力してください。欠損値はNA、- で表せます。
                  </p>
                )}
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={8}
                  className={`${inputCls} font-mono resize-y`}
                  placeholder={
                    mode === "continuous"
                      ? "20\n22\n24\nNA\n28"
                      : "男性\n女性\n男性\nNA\n女性"
                  }
                />
              </div>
            </>
          )}

          <Button type="submit" loading={loading}>
            解析する
          </Button>
        </form>
      </Card>

      {error && <ErrorMessage message={error} />}

      {result && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => {
                if (mode === "continuous" && continuousResult) exportDescriptiveCsv(continuousResult);
                if (mode === "categorical" && categoricalResult) exportCategoricalCsv(categoricalResult);
              }}
              className="text-[12px] text-white hover:text-white transition-colors"
            >
              CSVダウンロード
            </button>
          </div>
          {mode === "continuous" && continuousResult && (
            <DescriptiveResultTable result={continuousResult} />
          )}
          {mode === "categorical" && categoricalResult && (
            <CategoricalResultTable result={categoricalResult} />
          )}
          <Card>
            <h3 className="text-[12px] font-semibold text-gray-500 dark:text-neutral-500 uppercase tracking-wider mb-2">解釈</h3>
            <p className="text-[13px] text-gray-600 dark:text-neutral-400 leading-relaxed">{result.interpretation}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
