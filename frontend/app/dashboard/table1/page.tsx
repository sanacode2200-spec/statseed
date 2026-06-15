"use client";

import { useState, useCallback, useEffect } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { inputCls, textareaCls } from "@/components/ui/formStyles";
import { parseNullableNumbers, parseCategoricalValues } from "@/lib/parse";
import type { Table1Result, Table1Variable } from "@/lib/types";
import { exportTable1Csv } from "@/lib/exportCsv";
import { useDataset } from "@/contexts/DataContext";
import { analysisColumns, categoricalColumns, columnRole, findColumn } from "@/lib/dataUtils";

type VarState = {
  id: number;
  name: string;
  type: "continuous" | "categorical";
  rawText: string;
  display: "mean_sd" | "median_iqr";
};

type InputMode = "csv" | "manual";

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
  // Table 1 では群間p値は推奨されないため既定オフ。SMD（効果量）は既定オン。
  const [showPvalue, setShowPvalue] = useState(false);
  const [showSmd, setShowSmd] = useState(true);
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
      for (const c of analysisColumns(dataset.columns)) next[c.name] = prev[c.name] ?? true;
      return next;
    });
    setCsvDisplayByCol((prev) => {
      const next: Record<string, "mean_sd" | "median_iqr"> = {};
      for (const c of dataset.columns) {
        if (columnRole(c) === "continuous") next[c.name] = prev[c.name] ?? "mean_sd";
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
        const selected = analysisColumns(dataset.columns).filter((c) => csvSelectedCols[c.name] && c.name !== csvGroupCol);
        if (selected.length === 0) throw new Error("変数として使う列を選択してください。");
        variables = selected.map((c) =>
          columnRole(c) === "continuous"
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

      const res = await api.table1({ variables, group_values, group_name, show_pvalue: showPvalue, show_smd: showSmd });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function copyAsTsv() {
    if (!result) return;
    const hasGroups = !!result.group_names;
    const hasSmd = result.rows.some((r) => r.smd !== null);
    const hasPvalue = result.rows.some((r) => r.p_value !== null);
    const cols = ["変数", "全体", "欠損"];
    const headerN = ["", `n = ${result.n_overall}`, ""];
    if (hasGroups && result.group_names) {
      for (const g of result.group_names) {
        cols.push(g);
        headerN.push(`n = ${result.n_by_group?.[g] ?? ""}`);
      }
      if (hasSmd) { cols.push("SMD"); headerN.push(""); }
      if (hasPvalue) { cols.push("p値", "検定"); headerN.push("", ""); }
    }
    const lines = [cols.join("\t"), headerN.join("\t")];
    for (const row of result.rows) {
      const label = row.indent ? `  ${row.variable}` : row.variable;
      const cells = [label, row.overall, row.indent ? "" : String(row.missing)];
      if (hasGroups && result.group_names) {
        for (const g of result.group_names) cells.push(row.groups?.[g] ?? "");
        if (hasSmd) cells.push(row.indent ? "" : (row.smd ?? ""));
        if (hasPvalue) {
          cells.push(row.indent ? "" : (row.p_value ?? ""));
          cells.push(row.indent ? "" : (row.test_name ?? ""));
        }
      }
      lines.push(cells.join("\t"));
    }
    navigator.clipboard.writeText(lines.join("\n"));
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-5">
        <h1 className="text-[20px] font-semibold text-gray-900 dark:text-white">Table 1 自動生成</h1>
        <p className="text-[13px] text-gray-400 dark:text-neutral-500 mt-1">
          論文の背景データ表（Table 1）を自動生成します。連続・カテゴリ変数を混在できます。
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

      {inputMode === "csv" && dataset ? (
        <div className="space-y-3">
          <Card className="p-4">
            <p className="text-[12px] text-gray-400 dark:text-neutral-600 mb-3">
              Table 1 に含める列を選択してください。連続変数は表示形式（平均±SD / 中央値(IQR)）を切り替えられます。
            </p>
            <div className="space-y-1.5">
              {analysisColumns(dataset.columns).map((c) => (
                <div key={c.name} className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                      （{columnRole(c) === "continuous" ? "連続" : columnRole(c) === "ordinal" ? "順序" : "カテゴリ"} / 有効 {c.n_valid} / 欠損 {c.n_missing}）
                    </span>
                    {c.name === csvGroupCol && (
                      <span className="text-[11px] text-gray-400 dark:text-neutral-600 shrink-0">— 群変数として使用中</span>
                    )}
                  </label>
                  {columnRole(c) === "continuous" && c.name !== csvGroupCol && (
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
              className={inputCls + " w-full sm:w-64"}
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
            <div className="mb-3 flex flex-wrap items-center gap-2">
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

      {((inputMode === "csv" && dataset && !!csvGroupCol) || (inputMode === "manual" && useGroup)) && (
        <Card className="mt-3 p-4">
          <p className="text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-2.5">群間比較の指標</p>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showSmd} onChange={(e) => setShowSmd(e.target.checked)} className="rounded" />
              <span className="text-[13px] text-gray-700 dark:text-neutral-300">標準化平均差（SMD）を表示</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showPvalue} onChange={(e) => setShowPvalue(e.target.checked)} className="rounded" />
              <span className="text-[13px] text-gray-700 dark:text-neutral-300">p値を表示</span>
            </label>
          </div>
          <p className="mt-2.5 text-[11px] text-gray-400 dark:text-neutral-600">
            背景特性表（Table 1）では検出力に依存するp値より、サンプルサイズに依存しない効果量であるSMDが推奨されます（|SMD| &gt; 0.1 で群間の偏りの目安）。SMDは2群比較時のみ算出されます。
          </p>
        </Card>
      )}

      <div className="mt-4">
        <Button onClick={run} disabled={loading}>
          {loading ? "生成中..." : "Table 1を生成"}
        </Button>
      </div>

      {error && <div className="mt-4"><ErrorMessage message={error} /></div>}

      {result && (
        <div className="mt-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[15px] font-semibold text-gray-800 dark:text-neutral-200">Table 1</h2>
            <div className="flex flex-wrap items-center gap-3">
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
          <p className="mt-2 text-[11px] text-gray-400 dark:text-neutral-600">
            欠損数は変数ごとに表示しています。
            {result.group_missing > 0 && ` 群分け列の欠損により ${result.group_missing} 件は群別集計から除外されました。`}
          </p>
        </div>
      )}
    </div>
  );
}

function Table1View({ result }: { result: Table1Result }) {
  const hasGroups = result.group_names !== null && result.group_names.length > 0;
  const hasSmd = hasGroups && result.rows.some((r) => r.smd !== null);
  const hasPvalue = hasGroups && result.rows.some((r) => r.p_value !== null);

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-neutral-800">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950">
            <th className="text-left px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500 w-48">変数</th>
            <th className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">
              全体<br /><span className="font-normal text-[11px]">n = {result.n_overall}</span>
            </th>
            <th className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">欠損</th>
            {hasGroups && result.group_names!.map((g) => (
              <th key={g} className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">
                {g}<br /><span className="font-normal text-[11px]">n = {result.n_by_group?.[g] ?? ""}</span>
              </th>
            ))}
            {hasSmd && (
              <th className="text-center px-4 py-2.5 font-medium text-gray-500 dark:text-neutral-500">SMD</th>
            )}
            {hasPvalue && (
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
              <td className={`text-center px-4 py-2 tabular-nums ${row.missing > 0 ? "text-orange-600 dark:text-orange-400" : "text-gray-400 dark:text-neutral-600"}`}>
                {row.indent ? "" : row.missing}
              </td>
              {hasGroups && result.group_names!.map((g) => (
                <td key={g} className="text-center px-4 py-2 text-gray-700 dark:text-neutral-300 tabular-nums">
                  {row.groups?.[g] ?? ""}
                </td>
              ))}
              {hasSmd && (
                <td className={`text-center px-4 py-2 tabular-nums ${
                  row.smd && Math.abs(parseFloat(row.smd)) > 0.1
                    ? "font-semibold text-white"
                    : "text-gray-500 dark:text-neutral-500"
                }`}>
                  {row.smd ?? (row.indent ? "" : "—")}
                </td>
              )}
              {hasPvalue && (
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
