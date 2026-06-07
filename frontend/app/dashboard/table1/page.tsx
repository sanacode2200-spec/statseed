"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { parseNullableNumbers, parseCategoricalValues } from "@/lib/parse";
import type { Table1Result, Table1Variable } from "@/lib/types";
import { exportTable1Csv } from "@/lib/exportCsv";
import { useDataset } from "@/contexts/DataContext";
import { categoricalColumns, findColumn } from "@/lib/dataUtils";

type VarState = {
  id: number;
  name: string;
  type: "continuous" | "categorical";
  rawText: string;
  display: "mean_sd" | "median_iqr";
};

type InputMode = "csv" | "manual";

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
  const { dataset } = useDataset();
  const [inputMode, setInputMode] = useState<InputMode>("manual");
  const [vars, setVars] = useState<VarState[]>([makeVar()]);
  const [useGroup, setUseGroup] = useState(false);
  const [groupName, setGroupName] = useState("群");
  const [groupText, setGroupText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Table1Result | null>(null);

  // CSVモード用の選択状態
  const [csvSelectedCols, setCsvSelectedCols] = useState<Record<string, boolean>>({});
  const [csvDisplayByCol, setCsvDisplayByCol] = useState<Record<string, "mean_sd" | "median_iqr">>({});
  const [csvGroupCol, setCsvGroupCol] = useState("");

  // データ読み込み済みなら自動的にCSVモードへ、列の選択状態を初期化
  useEffect(() => {
    if (!dataset) return;
    setInputMode("csv");
    setCsvSelectedCols((prev) => {
      const next: Record<string, boolean> = {};
      for (const c of dataset.columns) next[c.name] = prev[c.name] ?? true;
      return next;
    });
    setCsvDisplayByCol((prev) => {
      const next: Record<string, "mean_sd" | "median_iqr"> = {};
      for (const c of dataset.columns) {
        if (c.dtype === "continuous") next[c.name] = prev[c.name] ?? "mean_sd";
      }
      return next;
    });
    setCsvGroupCol((prev) => (dataset.columns.some((c) => c.name === prev) ? prev : ""));
  }, [dataset]);

  const updateVar = useCallback((id: number, patch: Partial<VarState>) => {
    setVars((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }, []);

  const addVar = () => setVars((prev) => [...prev, makeVar()]);
  const removeVar = (id: number) => setVars((prev) => prev.filter((v) => v.id !== id));

  function toggleCsvCol(name: string) {
    setCsvSelectedCols((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  async function run() {
    setError(null);
    setLoading(true);
    try {
      let variables: Table1Variable[];
      let group_values: (string | null)[] | undefined;
      let group_name: string;

      if (inputMode === "csv" && dataset) {
        const selected = dataset.columns.filter((c) => csvSelectedCols[c.name] && c.name !== csvGroupCol);
        if (selected.length === 0) throw new Error("変数として使う列を選択してください。");
        variables = selected.map((c) =>
          c.dtype === "continuous"
            ? { name: c.name, type: "continuous", values: c.values, display: csvDisplayByCol[c.name] ?? "mean_sd" }
            : { name: c.name, type: "categorical", values: c.cat_values }
        );
        const groupCol = csvGroupCol ? findColumn(dataset.columns, csvGroupCol) : undefined;
        group_values = groupCol ? groupCol.cat_values : undefined;
        group_name = groupCol ? groupCol.name : (groupName || "群");
      } else {
        variables = vars.map((v) => {
          if (v.type === "continuous") {
            return { name: v.name || "変数", type: "continuous", values: parseNullableNumbers(v.rawText), display: v.display };
          } else {
            return { name: v.name || "変数", type: "categorical", values: parseCategoricalValues(v.rawText) };
          }
        });
        group_values = useGroup && groupText.trim()
          ? parseCategoricalValues(groupText) as (string | null)[]
          : undefined;
        group_name = groupName || "群";
      }

      const res = await api.table1({ variables, group_values, group_name });
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

      {dataset && (
        <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-neutral-900 rounded-md w-fit mb-4">
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
        <div className="space-y-3">
          <Card className="p-4">
            <p className="text-[12px] text-gray-400 dark:text-neutral-600 mb-3">
              Table 1 に含める列を選択してください。連続変数は表示形式（平均±SD / 中央値(IQR)）を切り替えられます。
            </p>
            <div className="space-y-1.5">
              {dataset.columns.map((c) => (
                <div key={c.name} className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={!!csvSelectedCols[c.name] && c.name !== csvGroupCol}
                      disabled={c.name === csvGroupCol}
                      onChange={() => toggleCsvCol(c.name)}
                      className="rounded shrink-0"
                    />
                    <span className="text-[13px] text-gray-700 dark:text-neutral-300 truncate">{c.name}</span>
                    <span className="text-[11px] text-gray-400 dark:text-neutral-600 shrink-0">
                      （{c.dtype === "continuous" ? "連続" : "カテゴリ"} / 有効 {c.n_valid} / 欠損 {c.n_missing}）
                    </span>
                    {c.name === csvGroupCol && (
                      <span className="text-[11px] text-gray-400 dark:text-neutral-600 shrink-0">— 群変数として使用中</span>
                    )}
                  </label>
                  {c.dtype === "continuous" && c.name !== csvGroupCol && (
                    <div className="flex rounded-md border border-gray-200 dark:border-neutral-800 overflow-hidden shrink-0">
                      {([["mean_sd", "平均±SD"], ["median_iqr", "中央値(IQR)"]] as const).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setCsvDisplayByCol((prev) => ({ ...prev, [c.name]: val }))}
                          className={`px-3 py-1 text-[11px] transition-colors ${
                            (csvDisplayByCol[c.name] ?? "mean_sd") === val
                              ? "bg-white text-black"
                              : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500 hover:bg-gray-50 dark:hover:bg-neutral-900"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">
              群分け（任意・p値を計算）
            </label>
            <select
              value={csvGroupCol}
              onChange={(e) => setCsvGroupCol(e.target.value)}
              className={inputCls + " w-64"}
            >
              <option value="">（群分けしない）</option>
              {categoricalColumns(dataset.columns).map((c) => (
                <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
              ))}
            </select>
          </Card>
        </div>
      ) : (
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
                        ? "bg-white text-black"
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
                          ? "bg-white text-black"
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
          className="flex items-center gap-1.5 text-[12px] text-white hover:text-white transition-colors"
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
      )}

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
            <div className="flex items-center gap-3">
              <button
                onClick={copyAsTsv}
                className="text-[12px] text-white hover:text-white transition-colors"
              >
                TSVでコピー（Excel/Word用）
              </button>
              <button
                onClick={() => exportTable1Csv(result)}
                className="text-[12px] text-white hover:text-white transition-colors"
              >
                CSVダウンロード
              </button>
            </div>
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
                      ? "font-semibold text-white"
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
