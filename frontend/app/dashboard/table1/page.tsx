"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { parseNullableNumbers, parseCategoricalValues } from "@/lib/parse";
import type { Table1Result, Table1Variable } from "@/lib/types";

type VarState = {
  id: number;
  name: string;
  type: "continuous" | "categorical";
  rawText: string;
  display: "mean_sd" | "median_iqr";
};

const inputCls =
  "w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-[13px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700";
const textareaCls =
  "w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2 text-[13px] font-mono bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 resize-y";

let _id = 0;
function nextId() { return ++_id; }

function makeVar(): VarState {
  return { id: nextId(), name: "", type: "continuous", rawText: "", display: "mean_sd" };
}

export default function Table1Page() {
  const [vars, setVars] = useState<VarState[]>([makeVar()]);
  const [useGroup, setUseGroup] = useState(false);
  const [groupName, setGroupName] = useState("群");
  const [groupText, setGroupText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Table1Result | null>(null);

  const updateVar = useCallback((id: number, patch: Partial<VarState>) => {
    setVars((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const addVar = () => setVars((prev) => [...prev, makeVar()]);
  const removeVar = (id: number) => setVars((prev) => prev.filter((v) => v.id !== id));

  async function run() {
    setError(null);
    setLoading(true);
    try {
      const variables: Table1Variable[] = vars.map((v) => {
        if (v.type === "continuous") {
          return { name: v.name || "変数", type: "continuous", values: parseNullableNumbers(v.rawText), display: v.display };
        } else {
          return { name: v.name || "変数", type: "categorical", values: parseCategoricalValues(v.rawText) };
        }
      });

      const group_values = useGroup && groupText.trim()
        ? parseCategoricalValues(groupText) as (string | null)[]
        : undefined;

      const res = await api.table1({ variables, group_values, group_name: groupName || "群" });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function copyAsTsv() {
    if (!result) return;
    const cols = result.group_names ? ["変数", "全体", ...result.group_names, "p値", "検定"] : ["変数", "全体"];
    const headerN = result.group_names
      ? ["", `n = ${result.n_overall}`, ...result.group_names.map((g) => `n = ${result.n_by_group?.[g] ?? ""}`), "", ""]
      : ["", `n = ${result.n_overall}`];
    const lines = [cols.join("\t"), headerN.join("\t")];
    for (const row of result.rows) {
      const label = row.indent ? `  ${row.variable}` : row.variable;
      const cells = [label, row.overall];
      if (result.group_names) {
        for (const g of result.group_names) cells.push(row.groups?.[g] ?? "");
        cells.push(row.indent ? "" : (row.p_value ?? ""));
        cells.push(row.indent ? "" : (row.test_name ?? ""));
      }
      lines.push(cells.join("\t"));
    }
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white">Table 1 自動生成</h1>
        <p className="text-[13px] text-gray-400 dark:text-neutral-500 mt-1">
          論文の背景データ表（Table 1）を自動生成します。連続・カテゴリ変数を混在できます。
        </p>
      </div>

      <div className="space-y-3">
        {/* 変数リスト */}
        {vars.map((v, idx) => (
          <Card key={v.id} className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[11px] text-gray-400 dark:text-neutral-600 w-5">{idx + 1}</span>
              <input
                className={inputCls + " flex-1"}
                placeholder="変数名"
                value={v.name}
                onChange={(e) => updateVar(v.id, { name: e.target.value })}
              />
              {/* 型切り替え */}
              <div className="flex rounded-md border border-gray-200 dark:border-neutral-800 overflow-hidden shrink-0">
                {(["continuous", "categorical"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updateVar(v.id, { type: t })}
                    className={`px-3 py-1 text-[11px] transition-colors ${
                      v.type === t
                        ? "bg-[#0072B2] text-white"
                        : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-900"
                    }`}
                  >
                    {t === "continuous" ? "連続" : "カテゴリ"}
                  </button>
                ))}
              </div>
              {/* 表示形式（連続のみ） */}
              {v.type === "continuous" && (
                <div className="flex rounded-md border border-gray-200 dark:border-neutral-800 overflow-hidden shrink-0">
                  {([["mean_sd", "平均±SD"], ["median_iqr", "中央値(IQR)"]] as const).map(([val, label]) => (
                    <button
                      key={val}
                      onClick={() => updateVar(v.id, { display: val })}
                      className={`px-3 py-1 text-[11px] transition-colors ${
                        v.display === val
                          ? "bg-[#0072B2] text-white"
                          : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {vars.length > 1 && (
                <button
                  onClick={() => removeVar(v.id)}
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
              placeholder={v.type === "continuous" ? "数値をスペース・改行・カンマで区切って入力（欠損: NA, -）" : "カテゴリ値を1行1件（またはカンマ区切り）で入力"}
              value={v.rawText}
              onChange={(e) => updateVar(v.id, { rawText: e.target.value })}
            />
          </Card>
        ))}

        <button
          onClick={addVar}
          className="flex items-center gap-1.5 text-[12px] text-[#0072B2] hover:text-[#005a8e] transition-colors"
        >
          <span className="text-[16px] leading-none">+</span> 変数を追加
        </button>

        {/* 群分け */}
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={useGroup}
                onChange={(e) => setUseGroup(e.target.checked)}
                className="rounded"
              />
              <span className="text-[13px] text-gray-700 dark:text-neutral-300">群別に比較する（p値を計算）</span>
            </label>
            {useGroup && (
              <input
                className={inputCls + " w-32"}
                placeholder="群変数名"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
              />
            )}
          </div>
          {useGroup && (
            <textarea
              className={textareaCls}
              rows={3}
              placeholder="群ラベルを変数と同じ順番で入力（例: A, A, B, B, ...）"
              value={groupText}
              onChange={(e) => setGroupText(e.target.value)}
            />
          )}
        </Card>
      </div>

      <div className="mt-4">
        <Button onClick={run} disabled={loading}>
          {loading ? "生成中..." : "Table 1を生成"}
        </Button>
      </div>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {result && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-[15px] font-semibold text-gray-800 dark:text-neutral-200">Table 1</h2>
            <button
              onClick={copyAsTsv}
              className="text-[12px] text-[#0072B2] hover:text-[#005a8e] transition-colors"
            >
              TSVでコピー（Excel/Word用）
            </button>
          </div>
          <Table1View result={result} />
        </div>
      )}
    </div>
  );
}

function Table1View({ result }: { result: Table1Result }) {
  const hasGroups = result.group_names !== null && result.group_names.length > 0;

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
            <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500 w-48">変数</th>
            <th className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">
              全体<br /><span className="font-normal text-[11px]">n = {result.n_overall}</span>
            </th>
            {hasGroups && result.group_names!.map((g) => (
              <th key={g} className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">
                {g}<br /><span className="font-normal text-[11px]">n = {result.n_by_group?.[g] ?? ""}</span>
              </th>
            ))}
            {hasGroups && (
              <>
                <th className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">p値</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500 text-[11px]">検定</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, i) => (
            <tr
              key={i}
              className={`border-b border-gray-100 dark:border-neutral-900 last:border-0 ${
                row.indent ? "" : "bg-white dark:bg-transparent"
              }`}
            >
              <td className={`px-4 py-2 text-gray-800 dark:text-neutral-200 ${row.indent ? "pl-8 text-gray-500 dark:text-neutral-500" : "font-medium"}`}>
                {row.variable}
              </td>
              <td className="text-center px-4 py-2 text-gray-700 dark:text-neutral-300 tabular-nums">
                {row.overall}
              </td>
              {hasGroups && result.group_names!.map((g) => (
                <td key={g} className="text-center px-4 py-2 text-gray-700 dark:text-neutral-300 tabular-nums">
                  {row.groups?.[g] ?? ""}
                </td>
              ))}
              {hasGroups && (
                <>
                  <td className={`text-center px-4 py-2 tabular-nums ${
                    row.p_value && parseFloat(row.p_value) < 0.05
                      ? "font-semibold text-[#0072B2]"
                      : "text-gray-500 dark:text-neutral-500"
                  }`}>
                    {row.p_value ?? (row.indent ? "" : "—")}
                  </td>
                  <td className="px-4 py-2 text-[11px] text-gray-400 dark:text-neutral-600">
                    {row.indent ? "" : (row.test_name ?? "")}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
