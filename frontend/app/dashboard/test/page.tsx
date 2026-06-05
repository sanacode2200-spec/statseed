"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { CorrelationResult, TestResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { CorrelationResultCard, TestResultCard } from "@/components/stats/TestResultCard";

type TestType =
  | "ttest"
  | "mannwhitney"
  | "ttest-paired"
  | "wilcoxon"
  | "anova"
  | "kruskal"
  | "chisquare"
  | "fisher"
  | "pearson"
  | "spearman";

const TEST_OPTIONS: { value: TestType; label: string; category: string }[] = [
  { value: "ttest", label: "独立2群 t検定（Welch）", category: "2群比較（連続変数）" },
  { value: "mannwhitney", label: "Mann-Whitney U検定", category: "2群比較（連続変数）" },
  { value: "ttest-paired", label: "対応のある t検定", category: "対応あり比較" },
  { value: "wilcoxon", label: "Wilcoxon符号順位検定", category: "対応あり比較" },
  { value: "anova", label: "一元配置ANOVA（3群以上）", category: "多群比較（連続変数）" },
  { value: "kruskal", label: "Kruskal-Wallis検定", category: "多群比較（連続変数）" },
  { value: "chisquare", label: "χ²検定", category: "カテゴリ変数" },
  { value: "fisher", label: "Fisher正確検定（2×2のみ）", category: "カテゴリ変数" },
  { value: "pearson", label: "Pearson相関係数", category: "相関" },
  { value: "spearman", label: "Spearman順位相関係数", category: "相関" },
];

const inputCls =
  "w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-[12px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700";

const textareaCls =
  "w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2 text-[12px] font-mono bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 resize-y";

function parseNums(text: string): number[] {
  return text
    .split(/[\n,\t\s]+/)
    .filter((s) => s.trim() !== "")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n));
}

function parseMatrix(text: string): number[][] {
  return text
    .split("\n")
    .map((row) =>
      row
        .split(/[,\t\s]+/)
        .filter((s) => s.trim() !== "")
        .map(Number)
        .filter((n) => !isNaN(n))
    )
    .filter((row) => row.length > 0);
}

export default function TestPage() {
  const [testType, setTestType] = useState<TestType>("ttest");
  const [variableName, setVariableName] = useState("変数");
  const [groupAName, setGroupAName] = useState("群A");
  const [groupBName, setGroupBName] = useState("群B");
  const [groupAText, setGroupAText] = useState("");
  const [groupBText, setGroupBText] = useState("");
  const [beforeText, setBeforeText] = useState("");
  const [afterText, setAfterText] = useState("");
  const [multiGroupTexts, setMultiGroupTexts] = useState(["", "", ""]);
  const [multiGroupNames, setMultiGroupNames] = useState(["群1", "群2", "群3"]);
  const [tableText, setTableText] = useState("");
  const [xName, setXName] = useState("X");
  const [yName, setYName] = useState("Y");
  const [xText, setXText] = useState("");
  const [yText, setYText] = useState("");

  const [result, setResult] = useState<TestResult | CorrelationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCorrelation = testType === "pearson" || testType === "spearman";
  const isTwoGroup = testType === "ttest" || testType === "mannwhitney";
  const isPaired = testType === "ttest-paired" || testType === "wilcoxon";
  const isMultiGroup = testType === "anova" || testType === "kruskal";
  const isTable = testType === "chisquare" || testType === "fisher";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);

    try {
      if (isTwoGroup) {
        const ga = parseNums(groupAText);
        const gb = parseNums(groupBText);
        if (ga.length < 2 || gb.length < 2) throw new Error("各群に2件以上のデータが必要です。");
        const req = {
          variable_name: variableName,
          group_a: ga,
          group_b: gb,
          group_a_name: groupAName,
          group_b_name: groupBName,
        };
        setResult(testType === "ttest" ? await api.ttestInd(req) : await api.mannwhitney(req));
      } else if (isPaired) {
        const before = parseNums(beforeText);
        const after = parseNums(afterText);
        if (before.length < 2) throw new Error("2件以上のデータが必要です。");
        if (before.length !== after.length) throw new Error("介入前後のデータ数が一致しません。");
        const req = { variable_name: variableName, before, after };
        setResult(testType === "ttest-paired" ? await api.ttestPaired(req) : await api.wilcoxon(req));
      } else if (isMultiGroup) {
        const groups = multiGroupTexts.map(parseNums);
        if (groups.some((g) => g.length < 2)) throw new Error("各群に2件以上のデータが必要です。");
        const req = {
          variable_name: variableName,
          groups,
          group_names: multiGroupNames,
        };
        setResult(testType === "anova" ? await api.anova(req) : await api.kruskal(req));
      } else if (isTable) {
        const observed = parseMatrix(tableText);
        if (observed.length < 2) throw new Error("2行以上のデータが必要です。");
        const req = { observed };
        setResult(testType === "chisquare" ? await api.chisquare(req) : await api.fisher(req));
      } else if (isCorrelation) {
        const x = parseNums(xText);
        const y = parseNums(yText);
        if (x.length < 3) throw new Error("3件以上のデータが必要です。");
        if (x.length !== y.length) throw new Error("XとYのデータ数が一致しません。");
        setResult(
          await api.correlation({
            variable_x_name: xName,
            variable_y_name: yName,
            x,
            y,
            method: testType === "pearson" ? "pearson" : "spearman",
          })
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "解析に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function updateMultiGroup(index: number, value: string) {
    setMultiGroupTexts((prev) => prev.map((t, i) => (i === index ? value : t)));
  }
  function updateMultiGroupName(index: number, value: string) {
    setMultiGroupNames((prev) => prev.map((t, i) => (i === index ? value : t)));
  }
  function addGroup() {
    setMultiGroupTexts((prev) => [...prev, ""]);
    setMultiGroupNames((prev) => [...prev, `群${prev.length + 1}`]);
  }
  function removeGroup(index: number) {
    if (multiGroupTexts.length <= 3) return;
    setMultiGroupTexts((prev) => prev.filter((_, i) => i !== index));
    setMultiGroupNames((prev) => prev.filter((_, i) => i !== index));
  }

  const grouped = TEST_OPTIONS.reduce<Record<string, typeof TEST_OPTIONS>>(
    (acc, opt) => {
      (acc[opt.category] ??= []).push(opt);
      return acc;
    },
    {}
  );

  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-1">
        解析
      </div>
      <h1 className="text-[18px] font-bold text-gray-900 dark:text-white mb-1">統計検定</h1>
      <p className="text-[12px] text-gray-400 dark:text-neutral-600 mb-5">検定を選んでデータを入力してください。</p>

      <Card className="mb-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 検定選択 */}
          <div>
            <label className="block text-[11px] font-medium text-gray-500 dark:text-neutral-500 mb-1">検定の種類</label>
            <select
              value={testType}
              onChange={(e) => {
                setTestType(e.target.value as TestType);
                setResult(null);
                setError(null);
              }}
              className={inputCls}
            >
              {Object.entries(grouped).map(([category, opts]) => (
                <optgroup key={category} label={category}>
                  {opts.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          {/* 変数名（テーブル系以外） */}
          {!isTable && (
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-neutral-500 mb-1">変数名</label>
              <input
                type="text"
                value={variableName}
                onChange={(e) => setVariableName(e.target.value)}
                className={inputCls}
                placeholder="例：握力"
              />
            </div>
          )}

          {/* 2群 */}
          {isTwoGroup && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: groupAName, setName: setGroupAName, text: groupAText, setText: setGroupAText },
                { name: groupBName, setName: setGroupBName, text: groupBText, setText: setGroupBText },
              ].map(({ name, setName, text, setText }, i) => (
                <div key={i}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${inputCls} mb-1.5`}
                  />
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    className={textareaCls}
                    placeholder="数値を1行1つ入力"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 対応あり */}
          {isPaired && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "介入前", text: beforeText, setText: setBeforeText },
                { label: "介入後", text: afterText, setText: setAfterText },
              ].map(({ label, text, setText }) => (
                <div key={label}>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">{label}</p>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    className={textareaCls}
                    placeholder="1行1データ"
                  />
                </div>
              ))}
            </div>
          )}

          {/* 多群 */}
          {isMultiGroup && (
            <div className="space-y-3">
              {multiGroupTexts.map((text, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1">
                      <input
                        type="text"
                        value={multiGroupNames[i]}
                        onChange={(e) => updateMultiGroupName(i, e.target.value)}
                        className="w-28 rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-[12px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700"
                      />
                      {multiGroupTexts.length > 3 && (
                        <button
                          type="button"
                          onClick={() => removeGroup(i)}
                          className="text-[11px] text-red-500 dark:text-red-400 hover:underline"
                        >
                          削除
                        </button>
                      )}
                    </div>
                    <textarea
                      value={text}
                      onChange={(e) => updateMultiGroup(i, e.target.value)}
                      rows={4}
                      className={textareaCls}
                      placeholder="1行1データ"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addGroup}
                className="text-[11px] text-gray-400 dark:text-neutral-600 hover:text-gray-600 dark:hover:text-neutral-400 transition-colors"
              >
                + 群を追加
              </button>
            </div>
          )}

          {/* クロス集計表 */}
          {isTable && (
            <div>
              <label className="block text-[11px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                クロス集計表
              </label>
              <p className="text-[11px] text-gray-400 dark:text-neutral-600 mb-1.5">
                行を改行で、列をスペース/タブ/カンマで区切って入力してください。
              </p>
              <textarea
                value={tableText}
                onChange={(e) => setTableText(e.target.value)}
                rows={5}
                className={textareaCls}
                placeholder={"例（2×2）：\n10 5\n3 12"}
              />
            </div>
          )}

          {/* 相関 */}
          {isCorrelation && (
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: xName, setName: setXName, text: xText, setText: setXText },
                { name: yName, setName: setYName, text: yText, setText: setYText },
              ].map(({ name, setName, text, setText }, i) => (
                <div key={i}>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`${inputCls} mb-1.5`}
                    placeholder={i === 0 ? "X 変数名" : "Y 変数名"}
                  />
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={6}
                    className={textareaCls}
                    placeholder="1行1データ"
                  />
                </div>
              ))}
            </div>
          )}

          <Button type="submit" loading={loading}>
            検定を実行
          </Button>
        </form>
      </Card>

      {error && <ErrorMessage message={error} />}

      {result &&
        ("r" in result ? (
          <CorrelationResultCard result={result as CorrelationResult} />
        ) : (
          <TestResultCard result={result as TestResult} />
        ))}
    </div>
  );
}
