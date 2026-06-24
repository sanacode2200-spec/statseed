"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import type { AnalysisSampleInfo, CorrelationResult, TestResult } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { inputCls, textareaCls } from "@/components/ui/formStyles";
import { AnalysisSampleInfoCard, CorrelationResultCard, TestResultCard } from "@/components/stats/TestResultCard";
import { PosthocResultTable } from "@/components/stats/PosthocResultTable";
import { parseIntegerMatrix, parseNumbers } from "@/lib/parse";
import type { ColumnInfo, PosthocResult } from "@/lib/types";
import { exportCorrelationCsv, exportPosthocCsv, exportTestResultCsv } from "@/lib/exportCsv";
import { useDataset } from "@/contexts/DataContext";
import { saveGraphHandoff } from "@/lib/graphHandoff";
import {
  categoricalColumns,
  continuousColumns,
  crossTabulate,
  extractTwoGroups,
  findColumn,
  pairColumns,
  splitByGroup,
  uniqueCategories,
} from "@/lib/dataUtils";

type InputMode = "csv" | "manual";

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
  | "spearman"
  | "tukey"
  | "bonferroni"
  | "holm"
  | "steel_dwass";

const TEST_OPTIONS: { value: TestType; label: string; category: string }[] = [
  { value: "ttest", label: "独立2群 t検定（Welch）", category: "2群比較（連続変数）" },
  { value: "mannwhitney", label: "Mann-Whitney U検定", category: "2群比較（連続変数）" },
  { value: "ttest-paired", label: "対応のある t検定", category: "対応あり比較" },
  { value: "wilcoxon", label: "Wilcoxon符号順位検定", category: "対応あり比較" },
  { value: "anova", label: "一元配置ANOVA（3群以上）", category: "多群比較（連続変数）" },
  { value: "kruskal", label: "Kruskal-Wallis検定", category: "多群比較（連続変数）" },
  { value: "tukey", label: "Tukey HSD（ANOVA後）", category: "多重比較（事後検定）" },
  { value: "bonferroni", label: "Bonferroni補正（パラメトリック）", category: "多重比較（事後検定）" },
  { value: "holm", label: "Holm-Bonferroni補正（パラメトリック）", category: "多重比較（事後検定）" },
  { value: "steel_dwass", label: "Dunn検定 + Holm補正（Kruskal後）", category: "多重比較（事後検定）" },
  { value: "chisquare", label: "χ²検定", category: "カテゴリ変数" },
  { value: "fisher", label: "Fisher正確検定（2×2のみ）", category: "カテゴリ変数" },
  { value: "pearson", label: "Pearson相関係数", category: "相関" },
  { value: "spearman", label: "Spearman順位相関係数", category: "相関" },
];

function ColSelect({
  id,
  label,
  columns,
  value,
  onChange,
}: {
  id: string;
  label: string;
  columns: ColumnInfo[];
  value: string;
  onChange: (name: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">{label}</label>
      {columns.length === 0 ? (
        <p className="text-[14px] text-orange-500 dark:text-orange-400">該当する列が見つかりません。</p>
      ) : (
        <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={inputCls}>
          {columns.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}

export default function TestPage() {
  const router = useRouter();
  const { dataset } = useDataset();
  const [inputMode, setInputMode] = useState<InputMode>("manual");

  // CSVモード: 2群・多群・事後検定
  const [csvValueCol, setCsvValueCol] = useState("");
  const [csvGroupCol, setCsvGroupCol] = useState("");
  const [csvGroupA, setCsvGroupA] = useState("");
  const [csvGroupB, setCsvGroupB] = useState("");
  // CSVモード: 対応あり
  const [csvBeforeCol, setCsvBeforeCol] = useState("");
  const [csvAfterCol, setCsvAfterCol] = useState("");
  // CSVモード: 相関
  const [csvXCol, setCsvXCol] = useState("");
  const [csvYCol, setCsvYCol] = useState("");
  // CSVモード: クロス集計
  const [csvRowCol, setCsvRowCol] = useState("");
  const [csvColCol, setCsvColCol] = useState("");

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

  const [result, setResult] = useState<TestResult | CorrelationResult | PosthocResult | null>(null);
  const [sampleInfo, setSampleInfo] = useState<AnalysisSampleInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCorrelation = testType === "pearson" || testType === "spearman";
  const isTwoGroup = testType === "ttest" || testType === "mannwhitney";
  const isPaired = testType === "ttest-paired" || testType === "wilcoxon";
  const isMultiGroup = testType === "anova" || testType === "kruskal";
  const isPosthoc = testType === "tukey" || testType === "bonferroni" || testType === "holm" || testType === "steel_dwass";
  const isTable = testType === "chisquare" || testType === "fisher";

  const csvCont = dataset ? continuousColumns(dataset.columns) : [];
  const csvCat = dataset ? categoricalColumns(dataset.columns) : [];
  const csvGroupColInfo = dataset ? findColumn(dataset.columns, csvGroupCol) : undefined;
  const csvGroupOptions = csvGroupColInfo ? uniqueCategories(csvGroupColInfo) : [];

  // データ読み込み済みなら自動的にCSVモードへ
  useEffect(() => {
    if (dataset) setInputMode("csv");
  }, [dataset]);

  // 検定タイプ・データ変更時に列選択をリセット
  useEffect(() => {
    if (!dataset) return;
    const cont = continuousColumns(dataset.columns);
    const cat = categoricalColumns(dataset.columns);
    if (isTwoGroup || isMultiGroup || isPosthoc) {
      setCsvValueCol((prev) => (cont.some((c) => c.name === prev) ? prev : cont[0]?.name ?? ""));
      setCsvGroupCol((prev) => (cat.some((c) => c.name === prev) ? prev : cat[0]?.name ?? ""));
    } else if (isPaired) {
      setCsvBeforeCol((prev) => (cont.some((c) => c.name === prev) ? prev : cont[0]?.name ?? ""));
      setCsvAfterCol((prev) => (cont.some((c) => c.name === prev) ? prev : cont[1]?.name ?? cont[0]?.name ?? ""));
    } else if (isCorrelation) {
      setCsvXCol((prev) => (cont.some((c) => c.name === prev) ? prev : cont[0]?.name ?? ""));
      setCsvYCol((prev) => (cont.some((c) => c.name === prev) ? prev : cont[1]?.name ?? cont[0]?.name ?? ""));
    } else if (isTable) {
      setCsvRowCol((prev) => (cat.some((c) => c.name === prev) ? prev : cat[0]?.name ?? ""));
      setCsvColCol((prev) => (cat.some((c) => c.name === prev) ? prev : cat[1]?.name ?? cat[0]?.name ?? ""));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, testType]);

  // 群の選択肢が変わったら群A/群Bを選び直す
  useEffect(() => {
    if (csvGroupOptions.length === 0) return;
    setCsvGroupA((prev) => (csvGroupOptions.includes(prev) ? prev : csvGroupOptions[0]));
    setCsvGroupB((prev) => (csvGroupOptions.includes(prev) && prev !== csvGroupOptions[0] ? prev : csvGroupOptions[1] ?? csvGroupOptions[0]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [csvGroupCol, csvGroupOptions.join("|")]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSampleInfo(null);
    setLoading(true);

    try {
      if (inputMode === "csv" && dataset) {
        if (isTwoGroup) {
          const valueCol = findColumn(dataset.columns, csvValueCol);
          const groupCol = findColumn(dataset.columns, csvGroupCol);
          if (!valueCol || !groupCol) throw new Error("列を選択してください。");
          if (!csvGroupA || !csvGroupB || csvGroupA === csvGroupB) throw new Error("異なる2つの群を選択してください。");
          const { a, b } = extractTwoGroups(valueCol, groupCol, csvGroupA, csvGroupB);
          if (a.length < 2 || b.length < 2) throw new Error("各群に2件以上のデータが必要です。");
          const req = {
            variable_name: valueCol.name,
            group_a: a,
            group_b: b,
            group_a_name: csvGroupA,
            group_b_name: csvGroupB,
          };
          setResult(testType === "ttest" ? await api.ttestInd(req) : await api.mannwhitney(req));
          setSampleInfo({
            total: dataset.n_rows,
            used: a.length + b.length,
            excluded: dataset.n_rows - a.length - b.length,
            exclusion_reason: "値または群が欠損、もしくは選択した2群以外の行",
          });
        } else if (isPaired) {
          const beforeCol = findColumn(dataset.columns, csvBeforeCol);
          const afterCol = findColumn(dataset.columns, csvAfterCol);
          if (!beforeCol || !afterCol) throw new Error("列を選択してください。");
          const { a: before, b: after } = pairColumns(beforeCol, afterCol);
          if (before.length < 2) throw new Error("2件以上のデータが必要です。");
          const req = { variable_name: `${beforeCol.name} → ${afterCol.name}`, before, after };
          setResult(testType === "ttest-paired" ? await api.ttestPaired(req) : await api.wilcoxon(req));
          setSampleInfo({
            total: dataset.n_rows,
            used: before.length,
            excluded: dataset.n_rows - before.length,
            exclusion_reason: "介入前・介入後のいずれかが欠損したペア",
          });
        } else if (isMultiGroup || isPosthoc) {
          const valueCol = findColumn(dataset.columns, csvValueCol);
          const groupCol = findColumn(dataset.columns, csvGroupCol);
          if (!valueCol || !groupCol) throw new Error("列を選択してください。");
          const { groupNames, groups } = splitByGroup(valueCol, groupCol);
          if (groups.length < 2) throw new Error("2群以上のデータが必要です。");
          if (groups.some((g) => g.length < 2)) throw new Error("各群に2件以上のデータが必要です。");
          const req = { variable_name: valueCol.name, groups, group_names: groupNames };
          if (isPosthoc) {
            setResult(await api.posthoc({
              ...req,
              method: testType as "tukey" | "bonferroni" | "holm" | "steel_dwass",
            }));
          } else {
            setResult(testType === "anova" ? await api.anova(req) : await api.kruskal(req));
          }
          const used = groups.reduce((sum, group) => sum + group.length, 0);
          setSampleInfo({
            total: dataset.n_rows,
            used,
            excluded: dataset.n_rows - used,
            exclusion_reason: "値または群が欠損した行",
          });
        } else if (isTable) {
          const rowCol = findColumn(dataset.columns, csvRowCol);
          const colCol = findColumn(dataset.columns, csvColCol);
          if (!rowCol || !colCol) throw new Error("列を選択してください。");
          const { table } = crossTabulate(rowCol, colCol);
          if (table.length < 2) throw new Error("2行以上のデータが必要です。");
          const req = { observed: table };
          setResult(testType === "chisquare" ? await api.chisquare(req) : await api.fisher(req));
          const used = table.flat().reduce((sum, count) => sum + count, 0);
          setSampleInfo({
            total: dataset.n_rows,
            used,
            excluded: dataset.n_rows - used,
            exclusion_reason: "クロス集計に使う2列のいずれかが欠損した行",
          });
        } else if (isCorrelation) {
          const xCol = findColumn(dataset.columns, csvXCol);
          const yCol = findColumn(dataset.columns, csvYCol);
          if (!xCol || !yCol) throw new Error("列を選択してください。");
          const { a: x, b: y } = pairColumns(xCol, yCol);
          if (x.length < 3) throw new Error("3件以上のデータが必要です。");
          setResult(
            await api.correlation({
              variable_x_name: xCol.name,
              variable_y_name: yCol.name,
              x,
              y,
              method: testType === "pearson" ? "pearson" : "spearman",
            })
          );
          setSampleInfo({
            total: dataset.n_rows,
            used: x.length,
            excluded: dataset.n_rows - x.length,
            exclusion_reason: "X・Yのいずれかが欠損した行（完全ケース解析）",
          });
        }
      } else if (isTwoGroup) {
        const ga = parseNumbers(groupAText);
        const gb = parseNumbers(groupBText);
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
        const before = parseNumbers(beforeText);
        const after = parseNumbers(afterText);
        if (before.length < 2) throw new Error("2件以上のデータが必要です。");
        if (before.length !== after.length) throw new Error("介入前後のデータ数が一致しません。");
        const req = { variable_name: variableName, before, after };
        setResult(testType === "ttest-paired" ? await api.ttestPaired(req) : await api.wilcoxon(req));
      } else if (isMultiGroup || isPosthoc) {
        const groups = multiGroupTexts.map(parseNumbers);
        if (groups.some((g) => g.length < 2)) throw new Error("各群に2件以上のデータが必要です。");
        const req = { variable_name: variableName, groups, group_names: multiGroupNames };
        if (isPosthoc) {
          setResult(await api.posthoc({
            ...req,
            method: testType as "tukey" | "bonferroni" | "holm" | "steel_dwass",
          }));
        } else {
          setResult(testType === "anova" ? await api.anova(req) : await api.kruskal(req));
        }
      } else if (isTable) {
        const observed = parseIntegerMatrix(tableText);
        if (observed.length < 2) throw new Error("2行以上のデータが必要です。");
        const req = { observed };
        setResult(testType === "chisquare" ? await api.chisquare(req) : await api.fisher(req));
      } else if (isCorrelation) {
        const x = parseNumbers(xText);
        const y = parseNumbers(yText);
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

  function createGraphFromResult() {
    if (!result || !dataset || inputMode !== "csv") return;
    const methodText = "method" in result ? result.method : "test_name" in result ? result.test_name : "";
    const captionText = "interpretation" in result ? result.interpretation : "";
    if (isPaired) {
      saveGraphHandoff({
        chart_type: "paired",
        before_column: csvBeforeCol,
        after_column: csvAfterCol,
        title: `${csvBeforeCol} と ${csvAfterCol} の対応あり比較`,
        method_text: methodText,
        caption_text: captionText,
      });
    } else if (isCorrelation) {
      saveGraphHandoff({
        chart_type: "scatter",
        x_column: csvXCol,
        y_column: csvYCol,
        title: `${csvXCol} と ${csvYCol} の関連`,
        method_text: methodText,
        caption_text: captionText,
      });
    } else if (isTwoGroup || isMultiGroup || isPosthoc) {
      saveGraphHandoff({
        chart_type: "boxplot",
        value_column: csvValueCol,
        group_column: csvGroupCol,
        included_groups: isTwoGroup ? [csvGroupA, csvGroupB] : undefined,
        comparison_method: testType === "mannwhitney" || testType === "kruskal" || testType === "steel_dwass" ? "nonparametric" : "parametric",
        title: `${csvValueCol} の群間比較`,
        method_text: methodText,
        caption_text: captionText,
      });
    } else {
      return;
    }
    router.push("/dashboard/graph");
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
      <div className="text-[13px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-1">
        解析
      </div>
      <h1 className="text-[24px] font-bold text-gray-900 dark:text-white mb-1">統計検定</h1>
      <p className="text-[16px] text-gray-400 dark:text-neutral-600 mb-5">検定を選んでデータを入力してください。</p>

      <Card className="mb-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 検定選択 */}
          <div>
            <label htmlFor="test-type" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">検定の種類</label>
            <select
              id="test-type"
              value={testType}
              onChange={(e) => {
                setTestType(e.target.value as TestType);
                setResult(null);
                setSampleInfo(null);
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

          {/* 入力モード切替 */}
          {dataset && (
            <SegmentedControl
              value={inputMode}
              options={[
                { value: "csv", label: "CSVから選択" },
                { value: "manual", label: "手入力" },
              ]}
              onChange={(next) => {
                setInputMode(next);
                setResult(null);
                setSampleInfo(null);
                setError(null);
              }}
              ariaLabel="入力方法"
            />
          )}

          {/* 変数名（テーブル系以外・手入力時のみ） */}
          {!isTable && !(inputMode === "csv" && dataset) && (
            <div>
              <label htmlFor="test-variable-name" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">変数名</label>
              <input
                id="test-variable-name"
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
            inputMode === "csv" && dataset ? (
              <div className="space-y-3">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <ColSelect id="test-value-col" label="値の列（連続変数）" columns={csvCont} value={csvValueCol} onChange={setCsvValueCol} />
                  <ColSelect id="test-group-col" label="群の列（カテゴリ変数）" columns={csvCat} value={csvGroupCol} onChange={setCsvGroupCol} />
                </div>
                {csvGroupOptions.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label htmlFor="test-group-a" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">群A</label>
                      <select id="test-group-a" value={csvGroupA} onChange={(e) => setCsvGroupA(e.target.value)} className={inputCls}>
                        {csvGroupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="test-group-b" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">群B</label>
                      <select id="test-group-b" value={csvGroupB} onChange={(e) => setCsvGroupB(e.target.value)} className={inputCls}>
                        {csvGroupOptions.map((g) => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { name: groupAName, setName: setGroupAName, text: groupAText, setText: setGroupAText },
                  { name: groupBName, setName: setGroupBName, text: groupBText, setText: setGroupBText },
                ].map(({ name, setName, text, setText }, i) => (
                  <div key={i}>
                    <input
                      type="text"
                      aria-label={`群${i === 0 ? "A" : "B"}の名前`}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`${inputCls} mb-1.5`}
                    />
                    <textarea
                      aria-label={`群${i === 0 ? "A" : "B"}の値`}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={6}
                      className={textareaCls}
                      placeholder="数値を1行1つ入力"
                    />
                  </div>
                ))}
              </div>
            )
          )}

          {/* 対応あり */}
          {isPaired && (
            inputMode === "csv" && dataset ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColSelect id="test-before-col" label="介入前の列" columns={csvCont} value={csvBeforeCol} onChange={setCsvBeforeCol} />
                <ColSelect id="test-after-col" label="介入後の列" columns={csvCont} value={csvAfterCol} onChange={setCsvAfterCol} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { label: "介入前", id: "test-paired-before", text: beforeText, setText: setBeforeText },
                  { label: "介入後", id: "test-paired-after", text: afterText, setText: setAfterText },
                ].map(({ label, id, text, setText }) => (
                  <div key={label}>
                    <label htmlFor={id} className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">{label}</label>
                    <textarea
                      id={id}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={6}
                      className={textareaCls}
                      placeholder="1行1データ"
                    />
                  </div>
                ))}
              </div>
            )
          )}

          {/* 多群・多重比較（同じ入力UI） */}
          {(isMultiGroup || isPosthoc) && (
            inputMode === "csv" && dataset ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColSelect id="test-value-col" label="値の列（連続変数）" columns={csvCont} value={csvValueCol} onChange={setCsvValueCol} />
                <ColSelect id="test-group-col" label="群の列（カテゴリ変数）" columns={csvCat} value={csvGroupCol} onChange={setCsvGroupCol} />
                {csvGroupOptions.length > 0 && (
                  <p className="col-span-2 text-[14px] text-gray-400 dark:text-neutral-600">
                    検出されたグループ: {csvGroupOptions.join(" / ")}
                  </p>
                )}
              </div>
            ) : (
            <div className="space-y-3">
              {multiGroupTexts.map((text, i) => (
                <div key={i} className="flex flex-col gap-2 sm:flex-row sm:items-start">
                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap gap-2">
                      <input
                        type="text"
                        aria-label={`群${i + 1}の名前`}
                        value={multiGroupNames[i]}
                        onChange={(e) => updateMultiGroupName(i, e.target.value)}
                        className="w-28 rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-[16px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700"
                      />
                      {multiGroupTexts.length > 3 && (
                        <button
                          type="button"
                          onClick={() => removeGroup(i)}
                          aria-label={`群${i + 1}を削除`}
                          className="text-[14px] text-red-500 dark:text-red-400 hover:underline"
                        >
                          削除
                        </button>
                      )}
                    </div>
                    <textarea
                      aria-label={`群${i + 1}の値`}
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
                className="text-[14px] text-gray-400 dark:text-neutral-600 hover:text-gray-600 dark:hover:text-neutral-400 transition-colors"
              >
                + 群を追加
              </button>
            </div>
            )
          )}

          {/* クロス集計表 */}
          {isTable && (
            inputMode === "csv" && dataset ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColSelect id="test-row-col" label="行変数（カテゴリ）" columns={csvCat} value={csvRowCol} onChange={setCsvRowCol} />
                <ColSelect id="test-col-col" label="列変数（カテゴリ）" columns={csvCat} value={csvColCol} onChange={setCsvColCol} />
              </div>
            ) : (
              <div>
                <label htmlFor="test-cross-table" className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                  クロス集計表
                </label>
                <p className="text-[14px] text-gray-400 dark:text-neutral-600 mb-1.5">
                  行を改行で、列をスペース/タブ/カンマで区切って入力してください。
                </p>
                <textarea
                  id="test-cross-table"
                  value={tableText}
                  onChange={(e) => setTableText(e.target.value)}
                  rows={5}
                  className={textareaCls}
                  placeholder={"例（2×2）：\n10 5\n3 12"}
                />
              </div>
            )
          )}

          {/* 相関 */}
          {isCorrelation && (
            inputMode === "csv" && dataset ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ColSelect id="test-x-col" label="X列（連続変数）" columns={csvCont} value={csvXCol} onChange={setCsvXCol} />
                <ColSelect id="test-y-col" label="Y列（連続変数）" columns={csvCont} value={csvYCol} onChange={setCsvYCol} />
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {[
                  { name: xName, setName: setXName, text: xText, setText: setXText },
                  { name: yName, setName: setYName, text: yText, setText: setYText },
                ].map(({ name, setName, text, setText }, i) => (
                  <div key={i}>
                    <input
                      type="text"
                      aria-label={i === 0 ? "X変数名" : "Y変数名"}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`${inputCls} mb-1.5`}
                      placeholder={i === 0 ? "X 変数名" : "Y 変数名"}
                    />
                    <textarea
                      aria-label={i === 0 ? "X変数の値" : "Y変数の値"}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      rows={6}
                      className={textareaCls}
                      placeholder="1行1データ"
                    />
                  </div>
                ))}
              </div>
            )
          )}

          <Button type="submit" loading={loading}>
            検定を実行
          </Button>
        </form>
      </Card>

      {error && <ErrorMessage message={error} />}

      {result && (
        <div className="space-y-3">
          {sampleInfo && <AnalysisSampleInfoCard info={sampleInfo} />}
          <div className="flex justify-end">
            {inputMode === "csv" && dataset && !isTable && (
              <button
                onClick={createGraphFromResult}
                className="mr-4 text-[14px] font-medium text-white dark:text-[#56B4E9] hover:underline"
              >
                この結果からグラフを作成
              </button>
            )}
            <button
              onClick={() => {
                if ("pairs" in result) exportPosthocCsv(result as PosthocResult);
                else if ("r" in result) exportCorrelationCsv(result as CorrelationResult);
                else exportTestResultCsv(result as TestResult);
              }}
              className="text-[14px] text-white hover:text-white transition-colors"
            >
              CSVダウンロード
            </button>
          </div>
          {"pairs" in result ? (
            <PosthocResultTable result={result as PosthocResult} />
          ) : "r" in result ? (
            <CorrelationResultCard result={result as CorrelationResult} />
          ) : (
            <TestResultCard result={result as TestResult} />
          )}
        </div>
      )}
    </div>
  );
}
