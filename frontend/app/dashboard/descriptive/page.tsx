"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { DescriptiveResponse } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { DescriptiveResultTable } from "@/components/stats/DescriptiveResultTable";

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

export default function DescriptivePage() {
  const [variableName, setVariableName] = useState("変数");
  const [rawText, setRawText] = useState("");
  const [result, setResult] = useState<DescriptiveResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    const values = parseValues(rawText);
    if (values.length === 0) {
      setError("データを入力してください。");
      return;
    }

    setLoading(true);
    try {
      const res = await api.descriptive({ variable_name: variableName, values });
      setResult(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-1">記述統計</h1>
      <p className="text-sm text-gray-500 mb-6">
        数値データを入力すると、平均・SD・中央値・IQR・95%CI・正規性検定を自動計算します。
      </p>

      <Card className="mb-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              変数名
            </label>
            <input
              type="text"
              value={variableName}
              onChange={(e) => setVariableName(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="例：年齢、握力、血圧など"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              データ
            </label>
            <p className="text-xs text-gray-400 mb-2">
              数値を改行・スペース・カンマのいずれかで区切って入力してください。欠損値は空行、NA、- で表せます。
            </p>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
              placeholder={"20\n22\n24\nNA\n28"}
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
          <DescriptiveResultTable result={result} />
          <Card>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">解釈</h3>
            <p className="text-sm text-gray-600 leading-relaxed">{result.interpretation}</p>
          </Card>
        </div>
      )}
    </div>
  );
}
