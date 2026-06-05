"use client";

import { useRef, useState } from "react";
import { api } from "@/lib/api";
import type { ColumnInfo, UploadResponse } from "@/lib/types";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";

const ACCEPT = ".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function ColTypeBadge({ dtype }: { dtype: ColumnInfo["dtype"] }) {
  return dtype === "continuous" ? (
    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-blue-50 dark:bg-[#0072B2]/10 text-[#0072B2] dark:text-[#56B4E9]">
      連続
    </span>
  ) : (
    <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-neutral-900 text-gray-500 dark:text-neutral-500">
      カテゴリ
    </span>
  );
}

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
      className="text-[11px] text-[#0072B2] dark:text-[#56B4E9] hover:underline whitespace-nowrap"
    >
      {copied ? "コピー済み ✓" : "値をコピー"}
    </button>
  );
}

export default function DataPage() {
  const inputRef = useRef<HTMLInputElement>(null);
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
      const firstContinuous = res.columns.find((c) => c.dtype === "continuous");
      if (firstContinuous) setActiveCol(firstContinuous.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "読み込みに失敗しました。");
    } finally {
      setLoading(false);
    }
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

  const activeColInfo = result?.columns.find((c) => c.name === activeCol);

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-1">
        データ
      </div>
      <h1 className="text-[18px] font-bold text-gray-900 dark:text-white mb-1">データ読み込み</h1>
      <p className="text-[12px] text-gray-400 dark:text-neutral-600 mb-5">
        CSV または Excel ファイルをアップロードすると、列ごとの概要を確認できます。
        連続変数の値は「値をコピー」で記述統計・検定ページに貼り付けて使えます。
      </p>

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`mb-5 flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed cursor-pointer transition-colors px-6 py-10 ${
          dragging
            ? "border-[#0072B2] bg-[#0072B2]/5"
            : "border-gray-200 dark:border-neutral-800 bg-white dark:bg-[#111] hover:border-gray-300 dark:hover:border-neutral-700 hover:bg-gray-50 dark:hover:bg-neutral-950"
        }`}
      >
        <div className="text-3xl">📂</div>
        <p className="text-[12px] font-medium text-gray-500 dark:text-neutral-500">
          クリックまたはドラッグ＆ドロップでファイルを選択
        </p>
        <p className="text-[11px] text-gray-400 dark:text-neutral-600">CSV・Excel（.xlsx / .xls）対応 / 最大10MB</p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          onChange={onInputChange}
          className="hidden"
        />
      </div>

      {loading && (
        <div className="text-center text-[12px] text-gray-400 dark:text-neutral-600 py-8">読み込み中...</div>
      )}

      {error && <ErrorMessage message={error} />}

      {result && (
        <div className="space-y-4">
          {/* サマリー */}
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[13px] font-semibold text-gray-800 dark:text-neutral-200">
                {result.filename}
              </h2>
              <span className="text-[11px] text-gray-400 dark:text-neutral-600">
                {result.n_rows} 行 × {result.n_cols} 列
              </span>
            </div>

            {/* 列一覧 */}
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-neutral-800 text-left">
                    <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600">列名</th>
                    <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600">型</th>
                    <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600 text-right">有効数</th>
                    <th className="pb-2 pr-4 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600 text-right">欠損数</th>
                    <th className="pb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {result.columns.map((col) => (
                    <tr
                      key={col.name}
                      onClick={() => col.dtype === "continuous" && setActiveCol(col.name)}
                      className={`border-b border-gray-100 dark:border-neutral-900 last:border-0 transition-colors ${
                        col.dtype === "continuous"
                          ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-950"
                          : "opacity-50"
                      } ${activeCol === col.name ? "bg-gray-50 dark:bg-neutral-950" : ""}`}
                    >
                      <td className="py-2 pr-4 font-medium text-gray-700 dark:text-neutral-300">
                        {col.name}
                        {activeCol === col.name && (
                          <span className="ml-2 text-[10px] text-gray-400 dark:text-neutral-600">▶ 選択中</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <ColTypeBadge dtype={col.dtype} />
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
                        {col.dtype === "continuous" && col.values.length > 0 && (
                          <CopyButton values={col.values} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* 選択列のプレビュー */}
          {activeColInfo && (
            <Card>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[13px] font-semibold text-gray-700 dark:text-neutral-300">
                  {activeColInfo.name} — 値のプレビュー
                </h3>
                <CopyButton values={activeColInfo.values} />
              </div>
              <p className="text-[11px] text-gray-400 dark:text-neutral-600 mb-3">
                「値をコピー」→ 記述統計や検定ページに貼り付けて解析できます
              </p>
              <div className="font-mono text-[12px] bg-gray-50 dark:bg-[#111] rounded-md p-3 max-h-48 overflow-y-auto leading-relaxed text-gray-600 dark:text-neutral-400">
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
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-neutral-600 mb-3">
              先頭 {result.preview_rows.length} 行
            </h3>
            <div className="overflow-x-auto">
              <table className="text-[11px] min-w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-neutral-800">
                    {result.columns.map((col) => (
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
                  {result.preview_rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? "" : "bg-gray-50 dark:bg-neutral-950/50"}>
                      {result.columns.map((col) => (
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
