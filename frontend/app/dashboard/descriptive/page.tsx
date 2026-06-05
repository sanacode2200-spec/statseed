"use client";

import { useState } from "react";
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

type Mode = "continuous" | "categorical";

const inputCls =
  "w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-[13px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700";

export default function DescriptivePage() {
  const [mode, setMode] = useState<Mode>("continuous");
  const [variableName, setVariableName] = useState("変数");
  const [rawText, setRawText] = useState("");
  const [continuousResult, setContinuousResult] = useState<DescriptiveResponse | null>(null);
  const [categoricalResult, setCategoricalResult] = useState<CategoricalResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      if (mode === "continuous") {
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
            style={mode === opt.value ? { backgroundColor: "#0072B2" } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Card className="mb-5">
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <Button type="submit" loading={loading}>
            解析する
          </Button>
        </form>
      </Card>

      {error && <ErrorMessage message={error} />}

      {result && (
        <div className="space-y-4">
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
