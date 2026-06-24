"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import type { ColumnRole, UploadResponse } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { useDataset } from "@/contexts/DataContext";
import { columnRole } from "@/lib/dataUtils";

const ACCEPT = ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const ROLE_OPTIONS: { value: ColumnRole; label: string }[] = [
  { value: "id", label: "ID" },
  { value: "continuous", label: "連続" },
  { value: "ordinal", label: "順序" },
  { value: "categorical", label: "カテゴリ" },
  { value: "date", label: "日付" },
  { value: "exclude", label: "除外" },
];

function CopyButton({ values }: { values: (number | null)[] }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    const text = values.map((v) => (v === null ? "NA" : String(v))).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <button
      onClick={handleCopy}
      className="text-[14px] text-white dark:text-[#56B4E9] hover:underline whitespace-nowrap"
    >
      {copied ? "コピー済み ✓" : "値をコピー"}
    </button>
  );
}

export default function DataPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { dataset, storageMode, setDataset, setStorageMode, clearDataset } = useDataset();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [activeCol, setActiveCol] = useState<string | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setResult(null);
    setActiveCol(null);
    setLoading(true);

    try {
      const ext = file.name.toLowerCase();
      const res = ext.endsWith(".csv")
        ? await api.uploadCsv(file)
        : await api.uploadExcel(file);
      setResult(res);
      setDataset(res, "session");
      const firstContinuous = res.columns.find((c) => c.dtype === "continuous");
      if (firstContinuous) setActiveCol(firstContinuous.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    clearDataset();
    setResult(null);
    setActiveCol(null);
  }

  function updateRole(columnName: string, role: ColumnRole) {
    const current = result ?? dataset;
    if (!current) return;
    const updated = {
      ...current,
      columns: current.columns.map((column) =>
        column.name === columnName ? { ...column, role } : column
      ),
    };
    setResult(updated);
    setDataset(updated);
    if (role !== "continuous" && activeCol === columnName) setActiveCol(null);
  }

  function excludePrivacyRiskColumns() {
    const current = result ?? dataset;
    if (!current) return;
    const updated = {
      ...current,
      columns: current.columns.map((column) =>
        column.privacy_risk ? { ...column, role: "exclude" as const } : column
      ),
    };
    setResult(updated);
    setDataset(updated);
    setActiveCol(null);
  }

  function handleStorageModeChange(persistent: boolean) {
    if (persistent && privacyRiskColumns.length > 0) {
      const confirmed = window.confirm(
        `個人識別情報を含む可能性がある列が ${privacyRiskColumns.length} 件あります。` +
        "この端末にデータを残しますか？共有端末では保存しないでください。"
      );
      if (!confirmed) return;
    }
    setStorageMode(persistent ? "persistent" : "session");
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  const displayed = result ?? dataset;
  const activeColInfo = displayed?.columns.find((c) => c.name === activeCol);
  const privacyRiskColumns = displayed?.columns.filter((column) => column.privacy_risk) ?? [];

  return (
    <div>
      <div className="text-[13px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-1">
        データ
      </div>
      <h1 className="text-[24px] font-bold text-gray-900 dark:text-white mb-1">データ読み込み</h1>
      <p className="text-[16px] text-gray-400 dark:text-neutral-600 mb-5">
        CSV または Excel ファイルをアップロードすると、列ごとの概要を確認できます。
        読み込んだデータは記述統計・検定・グラフ・Table 1 の各ページで列を選ぶだけで使えます。
      </p>

      {/* Drop zone */}
      <div
        role="button"
        tabIndex={0}
        aria-label="クリックまたはドラッグ＆ドロップでCSV・Excelファイルを選択"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`mb-5 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors px-6 py-10 ${
          dragging
            ? "border-white/30 bg-neutral-900"
            : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#111] hover:border-gray-300 dark:hover:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-950"
        }`}
      >
        <div className="text-3xl" aria-hidden="true">📂</div>
        <p className="text-[16px] font-medium text-gray-500 dark:text-neutral-500">
          クリックまたはドラッグ＆ドロップでファイルを選択
        </p>
        <p className="text-[14px] text-gray-400 dark:text-neutral-600">CSV・Excel（.xlsx / .xls）対応 / 最大10MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onInputChange}
          tabIndex={-1}
          aria-hidden="true"
          className="sr-only"
        />
      </div>

      {loading && (
        <div className="text-center text-[16px] text-gray-400 dark:text-neutral-600 py-8">読み込み中...</div>
      )}

      {error && <ErrorMessage message={error} />}

      {displayed && (
        <div className="space-y-4">
          {privacyRiskColumns.length > 0 && (
            <div className="rounded-xl border border-orange-300 dark:border-orange-900 bg-orange-50 dark:bg-orange-950/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-[17px] font-semibold text-orange-800 dark:text-orange-300">
                    個人識別情報を含む可能性があります
                  </h2>
                  <p className="mt-1 text-[14px] text-orange-700 dark:text-orange-400">
                    端末保存や画面共有の前に確認してください。解析から除外しても元データ内の値は削除されません。
                  </p>
                </div>
                <button
                  type="button"
                  onClick={excludePrivacyRiskColumns}
                  className="rounded-md border border-orange-300 dark:border-orange-800 px-3 py-1.5 text-[14px] font-medium text-orange-800 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-950/40"
                >
                  候補列を解析から一括除外
                </button>
              </div>
              <div className="mt-3 space-y-2">
                {privacyRiskColumns.map((column) => (
                  <div
                    key={column.name}
                    className="flex flex-wrap items-center gap-2 rounded-md bg-white/70 dark:bg-black/20 px-3 py-2"
                  >
                    <span className="text-[14px] font-medium text-orange-900 dark:text-orange-200">
                      {column.name}
                    </span>
                    <span className="min-w-0 flex-1 text-[13px] text-orange-700 dark:text-orange-400">
                      {column.privacy_reason}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateRole(column.name, "id")}
                      className="text-[13px] text-orange-800 dark:text-orange-300 hover:underline"
                    >
                      IDとして扱う
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRole(column.name, "exclude")}
                      className="text-[13px] text-orange-800 dark:text-orange-300 hover:underline"
                    >
                      解析から除外
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* サマリー */}
          <Card>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[17px] font-semibold text-gray-800 dark:text-neutral-200">
                {displayed.filename}
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-[14px] text-gray-400 dark:text-neutral-600">
                  {displayed.n_rows} 行 × {displayed.n_cols} 列
                </span>
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-[14px] text-gray-400 dark:text-neutral-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  クリア
                </button>
              </div>
            </div>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 px-3 py-2.5">
              <div>
                <p className="text-[14px] font-medium text-gray-700 dark:text-neutral-300">
                  {storageMode === "persistent" ? "この端末に保存中" : "このタブ内だけに保存中"}
                </p>
                <p className="mt-0.5 text-[13px] text-gray-400 dark:text-neutral-600">
                  {storageMode === "persistent"
                    ? "ブラウザを閉じてもデータが残ります。共有端末では使用しないでください。"
                    : "ページ更新では保持され、タブを閉じると削除されます。"}
                </p>
              </div>
              <label className="flex items-center gap-2 text-[14px] text-gray-600 dark:text-neutral-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={storageMode === "persistent"}
                  onChange={(e) => handleStorageModeChange(e.target.checked)}
                  className="rounded"
                />
                この端末に保存する
              </label>
            </div>
            <p className="text-[14px] text-gray-400 dark:text-neutral-600 mb-4">
              解析前に各列の役割を確認してください。ID・日付・除外にした列は解析候補に表示されません。
              {" "}
              <Link href="/dashboard/descriptive" className="text-white hover:underline">記述統計</Link>
              {" / "}
              <Link href="/dashboard/test" className="text-white hover:underline">検定</Link>
              {" / "}
              <Link href="/dashboard/graph" className="text-white hover:underline">グラフ</Link>
              {" / "}
              <Link href="/dashboard/table1" className="text-white hover:underline">Table 1</Link>
              {" "}ページで「CSVから選択」を使って解析できます。
            </p>

            {/* 列一覧 */}
            <div className="overflow-x-auto">
              <table className="w-full text-[16px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-neutral-800 text-left">
                    <th className="pb-2 pr-4 text-[13px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600">列名</th>
                    <th className="pb-2 pr-4 text-[13px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600">解析上の役割</th>
                    <th className="pb-2 pr-4 text-[13px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600 text-right">有効数</th>
                    <th className="pb-2 pr-4 text-[13px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600 text-right">欠損数</th>
                    <th className="pb-2 text-[13px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {displayed.columns.map((col) => {
                    const role = columnRole(col);
                    return (
                    <tr
                      key={col.name}
                      onClick={() => role === "continuous" && setActiveCol(col.name)}
                      className={`border-b border-gray-100 dark:border-neutral-900 last:border-0 transition-colors ${
                        role === "continuous"
                          ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-950"
                          : ""
                      } ${activeCol === col.name ? "bg-gray-50 dark:bg-neutral-950" : ""}`}
                    >
                      <td className="py-2 pr-4 font-medium text-gray-700 dark:text-neutral-300">
                        {col.name}
                        {col.privacy_risk && (
                          <span
                            className="ml-2 rounded bg-orange-100 dark:bg-orange-950/40 px-1.5 py-0.5 text-[12px] font-medium text-orange-700 dark:text-orange-400"
                            title={col.privacy_reason ?? undefined}
                          >
                            要確認
                          </span>
                        )}
                        {activeCol === col.name && (
                          <span className="ml-2 text-[13px] text-gray-400 dark:text-neutral-600">▶ 選択中</span>
                        )}
                      </td>
                      <td className="py-2 pr-4 min-w-52">
                        <select
                          value={role}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => updateRole(col.name, e.target.value as ColumnRole)}
                          className="rounded-md border border-gray-200 dark:border-neutral-800 px-2 py-1 text-[14px] bg-white dark:bg-[#111] text-gray-700 dark:text-neutral-300 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700"
                          aria-label={`${col.name} の役割`}
                        >
                          {ROLE_OPTIONS.map((option) => (
                            <option
                              key={option.value}
                              value={option.value}
                              disabled={option.value === "continuous" && col.values.length === 0}
                            >
                              {option.label}
                            </option>
                          ))}
                        </select>
                        {col.role_reason && (
                          <p className="mt-1 text-[12px] leading-tight text-gray-400 dark:text-neutral-600">
                            {col.role_reason}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-gray-600 dark:text-neutral-400">
                        {col.n_valid}
                      </td>
                      <td className="py-2 pr-4 text-right font-mono text-gray-400 dark:text-neutral-600">
                        {col.n_missing > 0 ? (
                          <span className="text-orange-500 dark:text-orange-400">{col.n_missing}</span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="py-2">
                        {role === "continuous" && col.values.length > 0 && (
                          <CopyButton values={col.values} />
                        )}
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 選択列のプレビュー */}
          {activeColInfo && (
            <Card>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-[17px] font-semibold text-gray-700 dark:text-neutral-300">
                  {activeColInfo.name} — 値のプレビュー
                </h3>
                <CopyButton values={activeColInfo.values} />
              </div>
              <p className="text-[14px] text-gray-400 dark:text-neutral-600 mb-3">
                「値をコピー」→ 記述統計や検定ページに貼り付けて解析できます
              </p>
              <div className="font-mono text-[16px] bg-gray-50 dark:bg-[#111] rounded-md p-3 max-h-48 overflow-y-auto leading-relaxed text-gray-600 dark:text-neutral-400">
                {activeColInfo.values.slice(0, 50).map((v, i) => (
                  <span key={i} className="mr-2">
                    {v === null ? <span className="text-orange-400">NA</span> : v}
                  </span>
                ))}
                {activeColInfo.values.length > 50 && (
                  <span className="text-gray-400 dark:text-neutral-600">... 他 {activeColInfo.values.length - 50} 件</span>
                )}
              </div>
            </Card>
          )}

          {/* データプレビューテーブル */}
          <Card>
            <h3 className="text-[13px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600 mb-3">
              先頭 {displayed.preview_rows.length} 行
            </h3>
            <div className="overflow-x-auto">
              <table className="text-[14px] min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-neutral-800">
                    {displayed.columns.map((col) => (
                      <th
                        key={col.name}
                        className="pb-2 pr-4 text-left font-medium text-gray-400 dark:text-neutral-600 whitespace-nowrap"
                      >
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayed.preview_rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50 dark:bg-neutral-950/50"}>
                      {displayed.columns.map((col) => (
                        <td
                          key={col.name}
                          className={`py-1.5 pr-4 font-mono whitespace-nowrap ${
                            row[col.name] === null ? "text-orange-400" : "text-gray-600 dark:text-neutral-400"
                          }`}
                        >
                          {row[col.name] ?? "NA"}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
