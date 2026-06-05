"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { CategoricalResponse, DescriptiveResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { DescriptiveResultTable } from "@/components/stats/DescriptiveResultTable";
import { CategoricalResultTable } from "@/components/stats/CategoricalResultTable";

type Mode = "continuous" | "categorical";

function parseValues(text: string): (number | null)[] {
  return text
    .split(/[\n,\t\s]+/)
    .filter((s) => s.trim() !== "")
    .map((s) => {
      const t = s.trim();
      if (t === "" || t === "NA" || t === "na" || t === "-") return null;
      const n = parseFloat(t);
      return isNaN(n) ? null : n;
    });
}

function parseCategorical(text: string): (string | null)[] {
  return text
    .split(/[\n,\t]+/)
    .map((s) => {
      const t = s.trim();
      if (t === "" || t === "NA" || t === "na" || t === "-") return null;
      return t;
    })
    .filter((v) => v !== undefined) as (string | null)[];
}

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
        const values = parseValues(rawText);
        if (values.length === 0) throw new Error("データを入力してください。");
        const res = await api.descriptive({ variable_name: variableName, values });
        setContinuousResult(res);
      } else {
        const values = parseCategorical(rawText);
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
      <h1 className="text-xl font-bold text-gray-800 mb-1">記述統計</h1>
      <p className="text-sm text-gray-500 mb-4">
        データを入力すると統計量を自動計算します。
      </p>

      {/* モード切り替え */}
      <div className="flex gap-2 mb-6">
        {([
          { value: "continuous", label: "連続変数" },
          { value: "categorical", label: "カテゴリ変数" },
        ] as const).map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => switchMode(opt.value)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium border transition-colors ${
              mode === opt.value
                ? "text-white border-transparent"
                : "text-gray-600 border-gray-300 bg-white hover:bg-gray-50"
            }`}
            style={mode === opt.value ? { backgroundColor: "#0072B2" } : undefined}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <Card className="mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">変数名</label>
            <input
              type="text"
              value={variableName}
              onChange={(e) => setVariableName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：性別、診断名、年齢など"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">データ</label>
            {mode === "continuous" ? (
              <p className="text-xs text-gray-400 mb-2">
                数値を改行・スペース・カンマのいずれかで区切って入力してください。欠損値は空行、NA、- で表せます。
              </p>
            ) : (
              <p className="text-xs text-gray-400 mb-2">
                カテゴリ値を1行1件（またはカンマ・タブ区切り）で入力してください。欠損値は空行、NA、- で表せます。
              </p>
            )}
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
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
            <h3 className="text-sm font-semibold text-gray-700 mb-2">解釈</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{result.interpretation}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
