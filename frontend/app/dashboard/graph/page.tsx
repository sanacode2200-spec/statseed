"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AnalysisSampleInfo, BoxplotComparisonResult, ExportRequest, PlotlyFigure, ROCResponse } from "@/lib/types";
import { exportRocCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PlotlyChart } from "@/components/charts/PlotlyChart";
import { AnalysisSampleInfoCard } from "@/components/stats/TestResultCard";
import { parseCategoricalValues, parseNumbers } from "@/lib/parse";
import { useDataset } from "@/contexts/DataContext";
import { takeGraphHandoff } from "@/lib/graphHandoff";
import {
  alignRocColumns,
  alignSurvivalColumns,
  categoricalColumns,
  continuousColumns,
  findColumn,
  numericAnalysisColumns,
  pairColumns,
  splitByGroup,
} from "@/lib/dataUtils";

type ChartType = "boxplot" | "histogram" | "scatter" | "paired" | "barplot" | "kaplan_meier" | "roc";
type FontPreset = "論文標準" | "日本語対応" | "ポスター" | "カスタム";
type InputMode = "csv" | "manual";

const inputCls =
  "rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-[13px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700";

const textareaCls =
  "w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2 text-[13px] font-mono bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 resize-y";

// PNG/SVG/PDF出力時のmatplotlib figsizeに合わせた画面表示の縦横比
function getAspectRatio(chartType: ChartType, figure: PlotlyFigure): number {
  switch (chartType) {
    case "boxplot": {
      const k = figure.data.filter((t) => (t as { type?: string }).type === "box").length || 1;
      return Math.max(3.5, k * 1.4) / 4;
    }
    case "barplot": {
      const k = figure.data.filter((t) => (t as { type?: string }).type === "bar").length || 1;
      return Math.max(3.5, k * 1.2) / 4;
    }
    case "histogram":
      return 5 / 4;
    case "scatter":
      return 4.5 / 4;
    case "paired":
      return 1;
    case "kaplan_meier": {
      const marginB = (figure.layout as { margin?: { b?: number } })?.margin?.b ?? 60;
      return marginB >= 80 ? 5 / 5.5 : 5 / 4.5;
    }
    case "roc":
      return 1;
    default:
      return 1.25;
  }
}

function formatGraphP(p: number): string {
  return p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`;
}

function TextCopyBlock({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 p-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[12px] font-semibold text-gray-600 dark:text-neutral-400">{title}</p>
        <button type="button" onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); })} className="text-[11px] text-gray-500 hover:underline">
          {copied ? "コピー済み" : "コピー"}
        </button>
      </div>
      <p className="text-[12px] leading-relaxed text-gray-600 dark:text-neutral-400">{text}</p>
    </div>
  );
}

export default function GraphPage() {
  const { dataset } = useDataset();
  const [chartType, setChartType] = useState<ChartType>("boxplot");
  const [inputMode, setInputMode] = useState<InputMode>("manual");

  // CSV列選択（チャート種別ごと）
  const [csvGroupedValueCol, setCsvGroupedValueCol] = useState("");
  const [csvGroupedGroupCol, setCsvGroupedGroupCol] = useState("");
  const [includedGroups, setIncludedGroups] = useState<string[] | null>(null);
  const [csvHistCol, setCsvHistCol] = useState("");
  const [csvScatterXCol, setCsvScatterXCol] = useState("");
  const [csvScatterYCol, setCsvScatterYCol] = useState("");
  const [csvPairedBeforeCol, setCsvPairedBeforeCol] = useState("");
  const [csvPairedAfterCol, setCsvPairedAfterCol] = useState("");
  const [csvKmTimeCol, setCsvKmTimeCol] = useState("");
  const [csvKmEventCol, setCsvKmEventCol] = useState("");
  const [csvKmGroupCol, setCsvKmGroupCol] = useState("");
  const [csvRocScoreCol, setCsvRocScoreCol] = useState("");
  const [csvRocLabelCol, setCsvRocLabelCol] = useState("");

  // kaplan-meier
  const [kmTimesText, setKmTimesText] = useState("");
  const [kmEventsText, setKmEventsText] = useState("");
  const [kmGroupText, setKmGroupText] = useState("");
  const [kmTimeLabel, setKmTimeLabel] = useState("時間");
  const [kmSurvLabel, setKmSurvLabel] = useState("生存率");
  const [kmShowCi, setKmShowCi] = useState(true);
  const [kmShowRisk, setKmShowRisk] = useState(true);

  // barplot
  const [barGroupTexts, setBarGroupTexts] = useState(["", ""]);
  const [barGroupNames, setBarGroupNames] = useState(["群A", "群B"]);
  const [barYLabel, setBarYLabel] = useState("");
  const [barErrorType, setBarErrorType] = useState<"sd" | "sem" | "ci95">("sd");

  // boxplot
  const [bpGroupTexts, setBpGroupTexts] = useState(["", ""]);
  const [bpGroupNames, setBpGroupNames] = useState(["群A", "群B"]);
  const [bpYLabel, setBpYLabel] = useState("");
  const [bpDisplayStyle, setBpDisplayStyle] = useState<"auto" | "simple" | "distribution" | "individual">("individual");
  const [bpColorMode, setBpColorMode] = useState<"color" | "monochrome">("color");
  const [bpShowN, setBpShowN] = useState(true);
  const [bpShowGrid, setBpShowGrid] = useState(true);
  const [bpYMin, setBpYMin] = useState("");
  const [bpYMax, setBpYMax] = useState("");
  const [bpShowComparison, setBpShowComparison] = useState(false);
  const [bpComparisonMethod, setBpComparisonMethod] = useState<"parametric" | "nonparametric">("parametric");
  const [bpComparison, setBpComparison] = useState<BoxplotComparisonResult | null>(null);

  // histogram
  const [histText, setHistText] = useState("");
  const [histXLabel, setHistXLabel] = useState("");
  const [histShowNormal, setHistShowNormal] = useState(true);

  // scatter
  const [scXText, setScXText] = useState("");
  const [scYText, setScYText] = useState("");
  const [scXLabel, setScXLabel] = useState("X");
  const [scYLabel, setScYLabel] = useState("Y");
  const [scShowReg, setScShowReg] = useState(true);
  const [pairedBeforeText, setPairedBeforeText] = useState("");
  const [pairedAfterText, setPairedAfterText] = useState("");
  const [pairedBeforeLabel, setPairedBeforeLabel] = useState("介入前");
  const [pairedAfterLabel, setPairedAfterLabel] = useState("介入後");
  const [pairedYLabel, setPairedYLabel] = useState("");

  // roc
  const [rocScoresText, setRocScoresText] = useState("");
  const [rocLabelsText, setRocLabelsText] = useState("");
  const [rocScoreLabel, setRocScoreLabel] = useState("スコア");
  const [rocStats, setRocStats] = useState<ROCResponse | null>(null);

  // common
  const [title, setTitle] = useState("");
  const [figure, setFigure] = useState<PlotlyFigure | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleInfo, setSampleInfo] = useState<AnalysisSampleInfo | null>(null);
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "pdf">("png");
  const [exportTransparent, setExportTransparent] = useState(true);
  const [outputPreset, setOutputPreset] = useState<"single" | "double" | "slide">("single");
  const [exportPreviewUrl, setExportPreviewUrl] = useState<string | null>(null);
  const [methodText, setMethodText] = useState("");
  const [captionText, setCaptionText] = useState("");

  // font preset
  const [fontPreset, setFontPreset] = useState<FontPreset>("論文標準");
  const [customFamily, setCustomFamily] = useState("");
  const [customSize, setCustomSize] = useState("9");

  const csvCont = dataset ? continuousColumns(dataset.columns) : [];
  const csvCat = dataset ? categoricalColumns(dataset.columns) : [];
  const csvNumeric = dataset ? numericAnalysisColumns(dataset.columns) : [];

  // データ読み込み済みなら自動的にCSVモードへ
  useEffect(() => {
    if (dataset) setInputMode("csv");
  }, [dataset]);

  useEffect(() => {
    const handoff = takeGraphHandoff();
    if (!handoff) return;
    setChartType(handoff.chart_type);
    setTitle(handoff.title ?? "");
    setMethodText(handoff.method_text ?? "");
    setCaptionText(handoff.caption_text ?? "");
    if (handoff.chart_type === "boxplot") {
      setCsvGroupedValueCol(handoff.value_column ?? "");
      setCsvGroupedGroupCol(handoff.group_column ?? "");
      setIncludedGroups(handoff.included_groups ?? null);
      setBpShowComparison(true);
      setBpComparisonMethod(handoff.comparison_method ?? "parametric");
    } else if (handoff.chart_type === "paired") {
      setCsvPairedBeforeCol(handoff.before_column ?? "");
      setCsvPairedAfterCol(handoff.after_column ?? "");
      setPairedBeforeLabel(handoff.before_column ?? "介入前");
      setPairedAfterLabel(handoff.after_column ?? "介入後");
    } else {
      setCsvScatterXCol(handoff.x_column ?? "");
      setCsvScatterYCol(handoff.y_column ?? "");
    }
  }, []);

  // モード・グラフ種別切替時、選択中の列が無効なら選び直す
  useEffect(() => {
    if (!dataset || inputMode !== "csv") return;
    const firstCont = csvCont[0]?.name ?? "";
    const firstCat = csvCat[0]?.name ?? "";
    if (chartType === "boxplot" || chartType === "barplot") {
      if (!csvCont.some((c) => c.name === csvGroupedValueCol)) setCsvGroupedValueCol(firstCont);
      if (!csvCat.some((c) => c.name === csvGroupedGroupCol)) setCsvGroupedGroupCol(firstCat);
    } else if (chartType === "histogram") {
      if (!csvCont.some((c) => c.name === csvHistCol)) setCsvHistCol(firstCont);
    } else if (chartType === "scatter") {
      if (!csvCont.some((c) => c.name === csvScatterXCol)) setCsvScatterXCol(firstCont);
      if (!csvCont.some((c) => c.name === csvScatterYCol)) setCsvScatterYCol(csvCont[1]?.name ?? firstCont);
    } else if (chartType === "paired") {
      if (!csvCont.some((c) => c.name === csvPairedBeforeCol)) setCsvPairedBeforeCol(firstCont);
      if (!csvCont.some((c) => c.name === csvPairedAfterCol)) setCsvPairedAfterCol(csvCont[1]?.name ?? firstCont);
    } else if (chartType === "kaplan_meier") {
      if (!csvCont.some((c) => c.name === csvKmTimeCol)) setCsvKmTimeCol(firstCont);
      if (!csvNumeric.some((c) => c.name === csvKmEventCol)) setCsvKmEventCol(csvNumeric[0]?.name ?? "");
      if (csvKmGroupCol && !csvCat.some((c) => c.name === csvKmGroupCol)) setCsvKmGroupCol("");
    } else if (chartType === "roc") {
      if (!csvCont.some((c) => c.name === csvRocScoreCol)) setCsvRocScoreCol(firstCont);
      if (!csvNumeric.some((c) => c.name === csvRocLabelCol)) setCsvRocLabelCol(csvNumeric[0]?.name ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset, inputMode, chartType]);

  function updateBarGroup(i: number, v: string) {
    setBarGroupTexts((p) => p.map((t, j) => (j === i ? v : t)));
  }
  function updateBarName(i: number, v: string) {
    setBarGroupNames((p) => p.map((t, j) => (j === i ? v : t)));
  }
  function addBarGroup() {
    setBarGroupTexts((p) => [...p, ""]);
    setBarGroupNames((p) => [...p, `群${p.length + 1}`]);
  }
  function removeBarGroup(i: number) {
    if (barGroupTexts.length <= 2) return;
    setBarGroupTexts((p) => p.filter((_, j) => j !== i));
    setBarGroupNames((p) => p.filter((_, j) => j !== i));
  }

  function updateBpGroup(i: number, v: string) {
    setBpGroupTexts((p) => p.map((t, j) => (j === i ? v : t)));
  }
  function updateBpName(i: number, v: string) {
    setBpGroupNames((p) => p.map((t, j) => (j === i ? v : t)));
  }
  function addBpGroup() {
    setBpGroupTexts((p) => [...p, ""]);
    setBpGroupNames((p) => [...p, `群${p.length + 1}`]);
  }
  function removeBpGroup(i: number) {
    if (bpGroupTexts.length <= 2) return;
    setBpGroupTexts((p) => p.filter((_, j) => j !== i));
    setBpGroupNames((p) => p.filter((_, j) => j !== i));
  }

  function csvGroupedData() {
    if (!dataset) throw new Error("データが読み込まれていません。");
    const valueCol = findColumn(dataset.columns, csvGroupedValueCol);
    const groupCol = findColumn(dataset.columns, csvGroupedGroupCol);
    if (!valueCol || !groupCol) throw new Error("列を選択してください。");
    const { groupNames, groups } = splitByGroup(valueCol, groupCol);
    const filtered = includedGroups
      ? groupNames.map((name, index) => ({ name, group: groups[index] })).filter(({ name }) => includedGroups.includes(name))
      : groupNames.map((name, index) => ({ name, group: groups[index] }));
    if (filtered.length < 2) throw new Error("2群以上のデータが必要です。");
    if (filtered.some(({ group }) => group.length < 2)) throw new Error("各群に2件以上のデータが必要です。");
    return { groups: filtered.map(({ group }) => group), groupNames: filtered.map(({ name }) => name) };
  }

  function csvHistogramData() {
    if (!dataset) throw new Error("データが読み込まれていません。");
    const col = findColumn(dataset.columns, csvHistCol);
    if (!col) throw new Error("列を選択してください。");
    const values = col.values.filter((v): v is number => v !== null);
    if (values.length < 3) throw new Error("3件以上のデータが必要です。");
    return { values };
  }

  function csvScatterData() {
    if (!dataset) throw new Error("データが読み込まれていません。");
    const xCol = findColumn(dataset.columns, csvScatterXCol);
    const yCol = findColumn(dataset.columns, csvScatterYCol);
    if (!xCol || !yCol) throw new Error("列を選択してください。");
    const { a: x, b: y } = pairColumns(xCol, yCol);
    if (x.length < 3) throw new Error("3件以上のデータが必要です。");
    return { x, y };
  }

  function csvPairedData() {
    if (!dataset) throw new Error("データが読み込まれていません。");
    const beforeCol = findColumn(dataset.columns, csvPairedBeforeCol);
    const afterCol = findColumn(dataset.columns, csvPairedAfterCol);
    if (!beforeCol || !afterCol) throw new Error("列を選択してください。");
    const { a: before, b: after } = pairColumns(beforeCol, afterCol);
    if (before.length < 2) throw new Error("2件以上のペアが必要です。");
    return { before, after };
  }

  function csvKmData() {
    if (!dataset) throw new Error("データが読み込まれていません。");
    const timeCol = findColumn(dataset.columns, csvKmTimeCol);
    const eventCol = findColumn(dataset.columns, csvKmEventCol);
    if (!timeCol || !eventCol) throw new Error("列を選択してください。");
    const groupCol = csvKmGroupCol ? findColumn(dataset.columns, csvKmGroupCol) ?? null : null;
    const { times, events, groups } = alignSurvivalColumns(timeCol, eventCol, groupCol);
    if (times.length < 2) throw new Error("2件以上の生存時間が必要です。");
    if (events.some((ev) => ev !== 0 && ev !== 1)) throw new Error("イベント列は 0（打ち切り）または 1（イベント）の値である必要があります。");
    return { times, events, group_labels: groups };
  }

  function csvRocData() {
    if (!dataset) throw new Error("データが読み込まれていません。");
    const scoreCol = findColumn(dataset.columns, csvRocScoreCol);
    const labelCol = findColumn(dataset.columns, csvRocLabelCol);
    if (!scoreCol || !labelCol) throw new Error("列を選択してください。");
    const { scores, labels } = alignRocColumns(scoreCol, labelCol);
    if (scores.length < 4) throw new Error("4件以上のデータが必要です。");
    if (labels.some((l) => l !== 0 && l !== 1)) throw new Error("ラベル列は 0（陰性）または 1（陽性）の値である必要があります。");
    return { scores, labels };
  }

  async function handleDraw(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFigure(null);
    setRocStats(null);
    setBpComparison(null);
    setSampleInfo(null);
    setLoading(true);

    const useCsv = inputMode === "csv" && !!dataset;

    try {
      if (chartType === "roc") {
        let scores: number[];
        let labels: number[];
        if (useCsv) {
          ({ scores, labels } = csvRocData());
        } else {
          scores = parseNumbers(rocScoresText);
          const labelsRaw = parseNumbers(rocLabelsText);
          if (scores.length < 4) throw new Error("4件以上のスコアが必要です。");
          if (scores.length !== labelsRaw.length) throw new Error("スコアとラベルのデータ数が一致しません。");
          labels = labelsRaw.map(Math.round);
          if (labels.some((l) => l !== 0 && l !== 1)) throw new Error("ラベルは 0（陰性）または 1（陽性）を入力してください。");
        }
        const result = await api.graphRoc({ scores, labels, title, score_label: rocScoreLabel });
        setFigure(result.figure);
        setRocStats(result.stats);
        if (useCsv) setSampleInfo(csvSampleInfo(scores.length, "スコアまたは正解ラベルが欠損した行"));
      } else if (chartType === "kaplan_meier") {
        let times: number[];
        let events: number[];
        let group_labels: (string | null)[] | null;
        if (useCsv) {
          ({ times, events, group_labels } = csvKmData());
        } else {
          times = parseNumbers(kmTimesText);
          const eventsRaw = parseNumbers(kmEventsText);
          if (times.length < 2) throw new Error("2件以上の生存時間が必要です。");
          if (times.length !== eventsRaw.length) throw new Error("生存時間とイベントのデータ数が一致しません。");
          events = eventsRaw.map((v) => Math.round(v));
          if (events.some((e) => e !== 0 && e !== 1)) throw new Error("イベントは 0（打ち切り）または 1（イベント）を入力してください。");
          group_labels = kmGroupText.trim()
            ? (parseCategoricalValues(kmGroupText) as (string | null)[])
            : null;
        }
        setFigure(
          await api.graphKaplanMeier({
            times, events, group_labels,
            title,
            time_label: kmTimeLabel,
            survival_label: kmSurvLabel,
            show_ci: kmShowCi,
            show_risk_table: kmShowRisk,
          })
        );
        if (useCsv) setSampleInfo(csvSampleInfo(times.length, "生存時間、イベント、または指定した群が欠損した行"));
      } else if (chartType === "barplot") {
        let groups: number[][];
        let group_names: string[];
        if (useCsv) {
          ({ groups, groupNames: group_names } = csvGroupedData());
        } else {
          groups = barGroupTexts.map(parseNumbers);
          if (groups.some((g) => g.length < 2)) throw new Error("各群に2件以上のデータが必要です。");
          group_names = barGroupNames;
        }
        setFigure(
          await api.graphBarplot({
            groups,
            group_names,
            title,
            y_label: barYLabel,
            error_type: barErrorType,
          })
        );
        if (useCsv) setSampleInfo(csvSampleInfo(groups.reduce((sum, group) => sum + group.length, 0), "値または群が欠損した行"));
      } else if (chartType === "boxplot") {
        let groups: number[][];
        let group_names: string[];
        if (useCsv) {
          ({ groups, groupNames: group_names } = csvGroupedData());
        } else {
          groups = bpGroupTexts.map(parseNumbers);
          if (groups.some((g) => g.length < 2)) throw new Error("各群に2件以上のデータが必要です。");
          group_names = bpGroupNames;
        }
        const result = await api.graphBoxplot({
            groups,
            group_names,
            title,
            y_label: bpYLabel,
            display_style: bpDisplayStyle,
            color_mode: bpColorMode,
            show_n: bpShowN,
            show_grid: bpShowGrid,
            y_min: bpYMin === "" ? null : Number(bpYMin),
            y_max: bpYMax === "" ? null : Number(bpYMax),
            show_comparison: bpShowComparison,
            comparison_method: bpComparisonMethod,
          });
        setFigure(result.figure);
        setBpComparison(result.comparison);
        if (useCsv) setSampleInfo(csvSampleInfo(groups.reduce((sum, group) => sum + group.length, 0), "値または群が欠損した行"));
      } else if (chartType === "histogram") {
        let values: number[];
        if (useCsv) {
          ({ values } = csvHistogramData());
        } else {
          values = parseNumbers(histText);
          if (values.length < 3) throw new Error("3件以上のデータが必要です。");
        }
        setFigure(
          await api.graphHistogram({
            values,
            title,
            x_label: histXLabel,
            show_normal_curve: histShowNormal,
          })
        );
        if (useCsv) setSampleInfo(csvSampleInfo(values.length, "選択した値が欠損した行"));
      } else if (chartType === "paired") {
        let before: number[];
        let after: number[];
        if (useCsv) {
          ({ before, after } = csvPairedData());
        } else {
          before = parseNumbers(pairedBeforeText);
          after = parseNumbers(pairedAfterText);
          if (before.length < 2 || before.length !== after.length) throw new Error("同数のペアを2件以上入力してください。");
        }
        setFigure(await api.graphPaired({
          before, after, before_label: pairedBeforeLabel, after_label: pairedAfterLabel, title, y_label: pairedYLabel,
        }));
        if (useCsv) setSampleInfo(csvSampleInfo(before.length, "前後のいずれかが欠損したペア"));
      } else {
        let x: number[];
        let y: number[];
        if (useCsv) {
          ({ x, y } = csvScatterData());
        } else {
          x = parseNumbers(scXText);
          y = parseNumbers(scYText);
          if (x.length < 3) throw new Error("3件以上のデータが必要です。");
          if (x.length !== y.length) throw new Error("XとYのデータ数が一致しません。");
        }
        setFigure(
          await api.graphScatter({
            x,
            y,
            title,
            x_label: scXLabel,
            y_label: scYLabel,
            show_regression: scShowReg,
          })
        );
        if (useCsv) setSampleInfo(csvSampleInfo(x.length, "X・Yのいずれかが欠損した行（完全ケース）"));
      }
      if (!captionText) setCaptionText(`${title || CHART_OPTIONS.find((option) => option.value === chartType)?.label || "グラフ"}。個別値または解析対象データを表示した。`);
      if (!methodText) setMethodText(`Statseedを用いて${CHART_OPTIONS.find((option) => option.value === chartType)?.label || "グラフ"}を作成した。欠損値は利用する変数の完全ケースで除外した。`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "グラフ生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  function csvSampleInfo(used: number, exclusionReason: string): AnalysisSampleInfo {
    const total = dataset?.n_rows ?? used;
    return {
      total,
      used,
      excluded: total - used,
      exclusion_reason: exclusionReason,
    };
  }

  async function handleExport(download = true) {
    setExporting(true);
    const useCsv = inputMode === "csv" && !!dataset;
    try {
      const body: ExportRequest = {
        chart_type: chartType as ExportRequest["chart_type"],
        format: exportFormat,
        transparent: exportTransparent,
        font_preset: fontPreset,
        font_family: fontPreset === "カスタム" && customFamily ? customFamily : null,
        font_size:
          fontPreset === "カスタム" && customSize
            ? parseInt(customSize, 10) || null
            : null,
        ...({
          single: { width_inches: 3.5, height_inches: 3.2 },
          double: { width_inches: 7.2, height_inches: 4.5 },
          slide: { width_inches: 10, height_inches: 5.625 },
        }[outputPreset]),
      };
      if (chartType === "kaplan_meier") {
        let times: number[];
        let events: number[];
        let group_labels: (string | null)[] | null;
        if (useCsv) {
          ({ times, events, group_labels } = csvKmData());
        } else {
          times = parseNumbers(kmTimesText);
          events = parseNumbers(kmEventsText).map(Math.round);
          group_labels = kmGroupText.trim()
            ? (parseCategoricalValues(kmGroupText) as (string | null)[])
            : null;
        }
        body.kaplan_meier = { times, events, group_labels, title, time_label: kmTimeLabel, survival_label: kmSurvLabel, show_ci: kmShowCi, show_risk_table: kmShowRisk };
      } else if (chartType === "barplot") {
        let groups: number[][];
        let group_names: string[];
        if (useCsv) {
          ({ groups, groupNames: group_names } = csvGroupedData());
        } else {
          groups = barGroupTexts.map(parseNumbers);
          group_names = barGroupNames;
        }
        body.barplot = { groups, group_names, title, y_label: barYLabel, error_type: barErrorType };
      } else if (chartType === "boxplot") {
        let groups: number[][];
        let group_names: string[];
        if (useCsv) {
          ({ groups, groupNames: group_names } = csvGroupedData());
        } else {
          groups = bpGroupTexts.map(parseNumbers);
          group_names = bpGroupNames;
        }
        body.boxplot = {
          groups,
          group_names,
          title,
          y_label: bpYLabel,
          display_style: bpDisplayStyle,
          color_mode: bpColorMode,
          show_n: bpShowN,
          show_grid: bpShowGrid,
          y_min: bpYMin === "" ? null : Number(bpYMin),
          y_max: bpYMax === "" ? null : Number(bpYMax),
          show_comparison: bpShowComparison,
          comparison_method: bpComparisonMethod,
        };
      } else if (chartType === "histogram") {
        const values = useCsv ? csvHistogramData().values : parseNumbers(histText);
        body.histogram = { values, title, x_label: histXLabel, show_normal_curve: histShowNormal };
      } else if (chartType === "roc") {
        let scores: number[];
        let labels: number[];
        if (useCsv) {
          ({ scores, labels } = csvRocData());
        } else {
          scores = parseNumbers(rocScoresText);
          const labelsRaw = parseNumbers(rocLabelsText);
          if (scores.length < 4) throw new Error("4件以上のスコアが必要です。");
          if (scores.length !== labelsRaw.length) throw new Error("スコアとラベルのデータ数が一致しません。");
          labels = labelsRaw.map(Math.round);
          if (labels.some((l) => l !== 0 && l !== 1)) throw new Error("ラベルは 0（陰性）または 1（陽性）を入力してください。");
        }
        body.roc = { scores, labels, title, score_label: rocScoreLabel };
      } else if (chartType === "paired") {
        let before: number[];
        let after: number[];
        if (useCsv) ({ before, after } = csvPairedData());
        else {
          before = parseNumbers(pairedBeforeText);
          after = parseNumbers(pairedAfterText);
        }
        body.paired = { before, after, before_label: pairedBeforeLabel, after_label: pairedAfterLabel, title, y_label: pairedYLabel };
      } else {
        let x: number[];
        let y: number[];
        if (useCsv) {
          ({ x, y } = csvScatterData());
        } else {
          x = parseNumbers(scXText);
          y = parseNumbers(scYText);
        }
        body.scatter = { x, y, title, x_label: scXLabel, y_label: scYLabel, show_regression: scShowReg };
      }

      const res = await fetch(api.graphExportUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("エクスポートに失敗しました。");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (exportPreviewUrl) URL.revokeObjectURL(exportPreviewUrl);
      setExportPreviewUrl(url);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = `statseed_graph.${exportFormat}`;
        a.click();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エクスポートに失敗しました。");
    } finally {
      setExporting(false);
    }
  }

  const CHART_OPTIONS: { value: ChartType; label: string }[] = [
    { value: "kaplan_meier", label: "カプランマイヤー" },
    { value: "roc", label: "ROC曲線" },
    { value: "barplot", label: "棒グラフ" },
    { value: "boxplot", label: "箱ひげ図" },
    { value: "histogram", label: "ヒストグラム" },
    { value: "scatter", label: "散布図" },
    { value: "paired", label: "対応ありプロット" },
  ];

  const toggleBtn = (active: boolean) =>
    `px-3 py-1 rounded-md text-[12px] font-medium border transition-colors ${
      active
        ? "text-white border-transparent"
        : "text-gray-500 dark:text-neutral-500 border-gray-200 dark:border-neutral-800 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-neutral-900"
    }`;

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-1">
        解析
      </div>
      <h1 className="text-[20px] font-bold text-gray-900 dark:text-white mb-1">グラフ作成</h1>
      <p className="text-[13px] text-gray-400 dark:text-neutral-600 mb-5">
        グラフを作成し、PNG・SVG・PDFで論文品質出力できます。
      </p>

      <Card className="mb-5">
        <form onSubmit={handleDraw} className="space-y-4">
          {/* グラフ種別 */}
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">グラフの種類</label>
            <div className="flex gap-1.5">
              {CHART_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setChartType(opt.value);
                    setFigure(null);
                    setError(null);
                  }}
                  className={toggleBtn(chartType === opt.value)}
                  style={chartType === opt.value ? { backgroundColor: "#fff", color: "#000" } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* タイトル */}
          {includedGroups && (chartType === "boxplot" || chartType === "barplot") && (
            <div className="rounded-md border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 px-3 py-2 text-[12px] text-gray-500 dark:text-neutral-500">
              検定結果から引き継いだ群: {includedGroups.join(" / ")}
              <button type="button" onClick={() => setIncludedGroups(null)} className="ml-3 hover:underline">全群を使用</button>
            </div>
          )}

          {/* タイトル */}
          <div>
            <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">タイトル（任意）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${inputCls} w-full`}
              placeholder="例：介入前後の握力比較"
            />
          </div>

          {dataset && (
            <div className="flex gap-1 p-0.5 bg-gray-100 dark:bg-neutral-900 rounded-md w-fit">
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

          {/* カプランマイヤー */}
          {chartType === "kaplan_meier" && (
            <div className="space-y-3">
              {inputMode === "csv" && dataset ? (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">生存時間の列</label>
                    <select value={csvKmTimeCol} onChange={(e) => setCsvKmTimeCol(e.target.value)} className={`${inputCls} w-full`}>
                      {csvCont.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">イベントの列（1=発生, 0=打ち切り）</label>
                    <select value={csvKmEventCol} onChange={(e) => setCsvKmEventCol(e.target.value)} className={`${inputCls} w-full`}>
                      {csvNumeric.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">群ラベルの列（任意）</label>
                    <select value={csvKmGroupCol} onChange={(e) => setCsvKmGroupCol(e.target.value)} className={`${inputCls} w-full`}>
                      <option value="">（指定なし）</option>
                      {csvCat.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                        生存時間（1行1データ）
                      </label>
                      <textarea value={kmTimesText} onChange={(e) => setKmTimesText(e.target.value)}
                        rows={7} className={textareaCls} placeholder={"例：\n12\n18\n24\n30\n6"} />
                    </div>
                    <div>
                      <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                        イベント（1=発生, 0=打ち切り）
                      </label>
                      <textarea value={kmEventsText} onChange={(e) => setKmEventsText(e.target.value)}
                        rows={7} className={textareaCls} placeholder={"例：\n1\n0\n1\n1\n0"} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                      群ラベル（任意・複数群比較）
                    </label>
                    <textarea value={kmGroupText} onChange={(e) => setKmGroupText(e.target.value)}
                      rows={3} className={textareaCls} placeholder={"例：\n治療群\n治療群\n対照群\n対照群\n治療群"} />
                  </div>
                </>
              )}
              <div className="flex gap-4 flex-wrap">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">X軸ラベル</label>
                  <input type="text" value={kmTimeLabel} onChange={(e) => setKmTimeLabel(e.target.value)}
                    className={`${inputCls} w-32`} placeholder="時間" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">Y軸ラベル</label>
                  <input type="text" value={kmSurvLabel} onChange={(e) => setKmSurvLabel(e.target.value)}
                    className={`${inputCls} w-32`} placeholder="生存率" />
                </div>
                <div className="flex flex-col gap-1.5 justify-end">
                  <label className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
                    <input type="checkbox" checked={kmShowCi} onChange={(e) => setKmShowCi(e.target.checked)} className="rounded" />
                    95%CI表示
                  </label>
                  <label className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
                    <input type="checkbox" checked={kmShowRisk} onChange={(e) => setKmShowRisk(e.target.checked)} className="rounded" />
                    リスクテーブル表示
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 棒グラフ */}
          {chartType === "barplot" && (
            <div className="space-y-3">
              <div className="flex gap-4 flex-wrap">
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">Y軸ラベル</label>
                  <input type="text" value={barYLabel} onChange={(e) => setBarYLabel(e.target.value)}
                    className={`${inputCls} w-48`} placeholder="例：握力 (kg)" />
                </div>
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">エラーバー</label>
                  <div className="flex rounded-md border border-gray-200 dark:border-neutral-800 overflow-hidden">
                    {([["sd", "SD"], ["sem", "SEM"], ["ci95", "95%CI"]] as const).map(([val, label]) => (
                      <button key={val} type="button" onClick={() => setBarErrorType(val)}
                        className={`px-3 py-1.5 text-[12px] transition-colors ${barErrorType === val
                          ? "bg-white text-black" : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500 hover:bg-gray-50"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {inputMode === "csv" && dataset ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">値（連続変数）の列</label>
                    <select value={csvGroupedValueCol} onChange={(e) => setCsvGroupedValueCol(e.target.value)} className={`${inputCls} w-full`}>
                      {csvCont.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">群（カテゴリ変数）の列</label>
                    <select value={csvGroupedGroupCol} onChange={(e) => setCsvGroupedGroupCol(e.target.value)} className={`${inputCls} w-full`}>
                      {csvCat.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {barGroupTexts.map((text, i) => (
                      <div key={i}>
                        <div className="flex gap-1 mb-1">
                          <input type="text" value={barGroupNames[i]} onChange={(e) => updateBarName(i, e.target.value)}
                            className="flex-1 rounded-md border border-gray-200 dark:border-neutral-800 px-2 py-1 text-[13px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700" />
                          {barGroupTexts.length > 2 && (
                            <button type="button" onClick={() => removeBarGroup(i)}
                              className="text-[12px] text-red-400 hover:text-red-600">✕</button>
                          )}
                        </div>
                        <textarea value={text} onChange={(e) => updateBarGroup(i, e.target.value)}
                          rows={5} className={textareaCls} placeholder="1行1データ" />
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={addBarGroup}
                    className="text-[12px] text-gray-400 dark:text-neutral-600 hover:text-gray-600 dark:hover:text-neutral-400 transition-colors">
                    + 群を追加
                  </button>
                </>
              )}
            </div>
          )}

          {/* 箱ひげ図 */}
          {chartType === "boxplot" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">Y軸ラベル</label>
                <input
                  type="text"
                  value={bpYLabel}
                  onChange={(e) => setBpYLabel(e.target.value)}
                  className={`${inputCls} w-48`}
                  placeholder="例：握力 (kg)"
                />
              </div>
              {inputMode === "csv" && dataset ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">値（連続変数）の列</label>
                    <select value={csvGroupedValueCol} onChange={(e) => setCsvGroupedValueCol(e.target.value)} className={`${inputCls} w-full`}>
                      {csvCont.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">群（カテゴリ変数）の列</label>
                    <select value={csvGroupedGroupCol} onChange={(e) => setCsvGroupedGroupCol(e.target.value)} className={`${inputCls} w-full`}>
                      {csvCat.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {bpGroupTexts.map((text, i) => (
                    <div key={i}>
                      <div className="flex gap-1 mb-1">
                        <input
                          type="text"
                          value={bpGroupNames[i]}
                          onChange={(e) => updateBpName(i, e.target.value)}
                          className="flex-1 rounded-md border border-gray-200 dark:border-neutral-800 px-2 py-1 text-[13px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700"
                        />
                        {bpGroupTexts.length > 2 && (
                          <button
                            type="button"
                            onClick={() => removeBpGroup(i)}
                            className="text-[12px] text-red-400 dark:text-red-500 hover:text-red-600"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <textarea
                        value={text}
                        onChange={(e) => updateBpGroup(i, e.target.value)}
                        rows={5}
                        className={textareaCls}
                        placeholder="1行1データ"
                      />
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-4">
                {!(inputMode === "csv" && dataset) && (
                  <button
                    type="button"
                    onClick={addBpGroup}
                    className="text-[12px] text-gray-400 dark:text-neutral-600 hover:text-gray-600 dark:hover:text-neutral-400 transition-colors"
                  >
                    + 群を追加
                  </button>
                )}
              </div>

              <div className="rounded-lg border border-gray-200 dark:border-neutral-800 p-3 space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[12px] font-medium text-gray-600 dark:text-neutral-400">表示スタイル</span>
                    <span className="text-[11px] text-gray-400 dark:text-neutral-600">個別値の点サイズはデータ数に合わせて調整されます</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      ["individual", "個別値を表示", "箱ひげとすべての測定値"],
                      ["simple", "箱ひげのみ", "要約された分布だけを表示"],
                    ] as const).map(([value, label, description]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setBpDisplayStyle(value)}
                        className={`rounded-md border px-3 py-2 text-left transition-colors ${
                          bpDisplayStyle === value
                            ? "border-gray-900 dark:border-neutral-200 bg-gray-50 dark:bg-neutral-900"
                            : "border-gray-200 dark:border-neutral-800 hover:bg-gray-50 dark:hover:bg-neutral-900"
                        }`}
                      >
                        <span className="block text-[12px] font-medium text-gray-700 dark:text-neutral-300">{label}</span>
                        <span className="block mt-0.5 text-[10px] text-gray-400 dark:text-neutral-600">{description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap items-end gap-4">
                  <div>
                    <label className="block text-[11px] text-gray-400 dark:text-neutral-600 mb-1">配色</label>
                    <div className="flex rounded-md border border-gray-200 dark:border-neutral-800 overflow-hidden">
                      {([["color", "カラー"], ["monochrome", "白黒"]] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setBpColorMode(value)}
                          className={`px-3 py-1.5 text-[12px] transition-colors ${
                            bpColorMode === value
                              ? "bg-gray-900 text-white dark:bg-neutral-100 dark:text-black"
                              : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <label className="flex items-center gap-1.5 pb-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
                    <input type="checkbox" checked={bpShowN} onChange={(e) => setBpShowN(e.target.checked)} className="rounded" />
                    サンプル数を表示
                  </label>
                  <label className="flex items-center gap-1.5 pb-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
                    <input type="checkbox" checked={bpShowGrid} onChange={(e) => setBpShowGrid(e.target.checked)} className="rounded" />
                    補助線を表示
                  </label>
                  <div className="flex gap-2">
                    <div>
                      <label className="block text-[11px] text-gray-400 dark:text-neutral-600 mb-1">Y軸 最小</label>
                      <input type="number" value={bpYMin} onChange={(e) => setBpYMin(e.target.value)}
                        className={`${inputCls} w-24`} placeholder="自動" step="any" />
                    </div>
                    <div>
                      <label className="block text-[11px] text-gray-400 dark:text-neutral-600 mb-1">Y軸 最大</label>
                      <input type="number" value={bpYMax} onChange={(e) => setBpYMax(e.target.value)}
                        className={`${inputCls} w-24`} placeholder="自動" step="any" />
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 dark:border-neutral-800 pt-3">
                  <label className="flex items-center gap-2 text-[12px] font-medium text-gray-600 dark:text-neutral-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={bpShowComparison}
                      onChange={(e) => setBpShowComparison(e.target.checked)}
                      className="rounded"
                    />
                    群間差を検定してp値を表示
                  </label>
                  {bpShowComparison && (
                    <div className="mt-2 flex flex-wrap items-center gap-3">
                      <span className="text-[11px] text-gray-400 dark:text-neutral-600">データの扱い：</span>
                      <div className="flex rounded-md border border-gray-200 dark:border-neutral-800 overflow-hidden">
                        {([
                          ["parametric", "平均値を比較", "Welch / ANOVA + Tukey"],
                          ["nonparametric", "順位を比較", "Mann–Whitney / Kruskal–Wallis + Dunn-Holm"],
                        ] as const).map(([value, label, detail]) => (
                          <button
                            key={value}
                            type="button"
                            title={detail}
                            onClick={() => setBpComparisonMethod(value)}
                            className={`px-3 py-1.5 text-[12px] transition-colors ${
                              bpComparisonMethod === value
                                ? "bg-gray-900 text-white dark:bg-neutral-100 dark:text-black"
                                : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500"
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-neutral-600">
                        {bpComparisonMethod === "parametric"
                          ? "平均値の差を検定します"
                          : "外れ値や非正規分布の影響を受けにくい方法です"}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ヒストグラム */}
          {chartType === "histogram" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">X軸ラベル</label>
                <input
                  type="text"
                  value={histXLabel}
                  onChange={(e) => setHistXLabel(e.target.value)}
                  className={`${inputCls} w-48`}
                  placeholder="例：年齢 (歳)"
                />
              </div>
              {inputMode === "csv" && dataset ? (
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">データの列</label>
                  <select value={csvHistCol} onChange={(e) => setCsvHistCol(e.target.value)} className={`${inputCls} w-full`}>
                    {csvCont.map((c) => (
                      <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">データ</label>
                  <textarea
                    value={histText}
                    onChange={(e) => setHistText(e.target.value)}
                    rows={7}
                    className={textareaCls}
                    placeholder="1行1データ（またはスペース/カンマ区切り）"
                  />
                </div>
              )}
              <label className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={histShowNormal}
                  onChange={(e) => setHistShowNormal(e.target.checked)}
                  className="rounded"
                />
                正規分布曲線を重ねる
              </label>
            </div>
          )}

          {/* ROC曲線 */}
          {chartType === "roc" && (
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">スコアラベル</label>
                <input type="text" value={rocScoreLabel} onChange={(e) => setRocScoreLabel(e.target.value)}
                  className={`${inputCls} w-48`} placeholder="例：診断スコア" />
              </div>
              {inputMode === "csv" && dataset ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">診断スコアの列</label>
                    <select value={csvRocScoreCol} onChange={(e) => setCsvRocScoreCol(e.target.value)} className={`${inputCls} w-full`}>
                      {csvCont.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">正解ラベルの列（1=陽性, 0=陰性）</label>
                    <select value={csvRocLabelCol} onChange={(e) => setCsvRocLabelCol(e.target.value)} className={`${inputCls} w-full`}>
                      {csvNumeric.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                      診断スコア（1行1データ）
                    </label>
                    <textarea value={rocScoresText} onChange={(e) => setRocScoresText(e.target.value)}
                      rows={7} className={textareaCls} placeholder={"例：\n0.9\n0.8\n0.4\n0.2\n0.1"} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">
                      正解ラベル（1=陽性, 0=陰性）
                    </label>
                    <textarea value={rocLabelsText} onChange={(e) => setRocLabelsText(e.target.value)}
                      rows={7} className={textareaCls} placeholder={"例：\n1\n1\n0\n0\n0"} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 散布図 */}
          {chartType === "scatter" && (
            <div className="space-y-3">
              {inputMode === "csv" && dataset ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">X軸の列</label>
                    <select value={csvScatterXCol} onChange={(e) => setCsvScatterXCol(e.target.value)} className={`${inputCls} w-full mb-1.5`}>
                      {csvCont.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                    <input type="text" value={scXLabel} onChange={(e) => setScXLabel(e.target.value)}
                      placeholder="X軸ラベル" className={`${inputCls} w-full`} />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">Y軸の列</label>
                    <select value={csvScatterYCol} onChange={(e) => setCsvScatterYCol(e.target.value)} className={`${inputCls} w-full mb-1.5`}>
                      {csvCont.map((c) => (
                        <option key={c.name} value={c.name}>{c.name}（有効 {c.n_valid} / 欠損 {c.n_missing}）</option>
                      ))}
                    </select>
                    <input type="text" value={scYLabel} onChange={(e) => setScYLabel(e.target.value)}
                      placeholder="Y軸ラベル" className={`${inputCls} w-full`} />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "X", name: scXLabel, setName: setScXLabel, text: scXText, setText: setScXText },
                    { label: "Y", name: scYLabel, setName: setScYLabel, text: scYText, setText: setScYText },
                  ].map(({ label, name, setName, text, setText }) => (
                    <div key={label}>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={`${label}軸ラベル`}
                        className={`${inputCls} w-full mb-1.5`}
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
              <label className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={scShowReg}
                  onChange={(e) => setScShowReg(e.target.checked)}
                  className="rounded"
                />
                回帰直線を表示
              </label>
            </div>
          )}

          {/* 対応あり個別値プロット */}
          {chartType === "paired" && (
            <div className="space-y-3">
              {inputMode === "csv" && dataset ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">介入前・1時点目</label>
                    <select value={csvPairedBeforeCol} onChange={(e) => { setCsvPairedBeforeCol(e.target.value); setPairedBeforeLabel(e.target.value); }} className={`${inputCls} w-full`}>
                      {csvCont.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-500 dark:text-neutral-500 mb-1">介入後・2時点目</label>
                    <select value={csvPairedAfterCol} onChange={(e) => { setCsvPairedAfterCol(e.target.value); setPairedAfterLabel(e.target.value); }} className={`${inputCls} w-full`}>
                      {csvCont.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <textarea value={pairedBeforeText} onChange={(e) => setPairedBeforeText(e.target.value)} rows={6} className={textareaCls} placeholder="介入前（1行1データ）" />
                  <textarea value={pairedAfterText} onChange={(e) => setPairedAfterText(e.target.value)} rows={6} className={textareaCls} placeholder="介入後（1行1データ）" />
                </div>
              )}
              <div className="grid grid-cols-3 gap-3">
                <input value={pairedBeforeLabel} onChange={(e) => setPairedBeforeLabel(e.target.value)} className={`${inputCls} w-full`} placeholder="前ラベル" />
                <input value={pairedAfterLabel} onChange={(e) => setPairedAfterLabel(e.target.value)} className={`${inputCls} w-full`} placeholder="後ラベル" />
                <input value={pairedYLabel} onChange={(e) => setPairedYLabel(e.target.value)} className={`${inputCls} w-full`} placeholder="Y軸ラベル" />
              </div>
            </div>
          )}

          <Button type="submit" loading={loading}>
            グラフを描画
          </Button>
        </form>
      </Card>

      {error && <ErrorMessage message={error} />}

      {figure && (
        <Card>
          {sampleInfo && <div className="mb-4"><AnalysisSampleInfoCard info={sampleInfo} /></div>}
          <PlotlyChart figure={figure} aspectRatio={getAspectRatio(chartType, figure)} />

          {bpComparison && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-[12px] font-semibold text-gray-600 dark:text-neutral-400">群間比較結果</p>
                  <p className="text-[11px] text-gray-400 dark:text-neutral-600 mt-0.5">{bpComparison.method}</p>
                </div>
                <div className="flex gap-3 text-[11px] text-gray-500 dark:text-neutral-500">
                  {bpComparison.omnibus_p_value !== null && (
                    <span>全体: {formatGraphP(bpComparison.omnibus_p_value)}</span>
                  )}
                  {bpComparison.effect_size !== null && bpComparison.effect_size_label && (
                    <span>{bpComparison.effect_size_label} = {bpComparison.effect_size.toFixed(3)}</span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-neutral-800">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-neutral-900 border-b border-gray-200 dark:border-neutral-800">
                      <th className="px-3 py-2 text-left font-medium text-gray-500 dark:text-neutral-500">比較</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-neutral-500">p値</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-500 dark:text-neutral-500">基準との関係</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bpComparison.pairs.map((pair) => (
                      <tr key={`${pair.group_a}-${pair.group_b}`} className="border-b border-gray-100 dark:border-neutral-900 last:border-0">
                        <td className="px-3 py-2 text-gray-700 dark:text-neutral-300">{pair.group_a} vs {pair.group_b}</td>
                        <td className="px-3 py-2 text-right font-mono text-gray-700 dark:text-neutral-300">{formatGraphP(pair.p_value)}</td>
                        <td className="px-3 py-2 text-center text-gray-500 dark:text-neutral-500">{pair.significant ? "p < 0.05" : "p ≥ 0.05"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 text-[11px] text-gray-400 dark:text-neutral-600">
                {bpComparison.note} p値は差の大きさや臨床的重要性を示しません。効果量とデータ分布も確認してください。
              </p>
            </div>
          )}

          {/* ROC統計量 */}
          {rocStats && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold text-gray-500 dark:text-neutral-500">ROC解析結果</p>
                <button
                  onClick={() => exportRocCsv(rocStats, rocStats.fpr, rocStats.tpr, rocStats.thresholds)}
                  className="text-[12px] text-white hover:text-white transition-colors"
                >
                  CSVダウンロード（座標データ）
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[13px] mb-3">
                <div className="grid grid-cols-[minmax(8rem,12rem)_auto] gap-x-4">
                  <span className="text-gray-400 dark:text-neutral-600">AUC</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{rocStats.auc.toFixed(3)}</span>
                </div>
                <div className="grid grid-cols-[minmax(8rem,12rem)_auto] gap-x-4">
                  <span className="text-gray-400 dark:text-neutral-600">95%CI</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">
                    {rocStats.auc_ci_lower.toFixed(3)} – {rocStats.auc_ci_upper.toFixed(3)}
                  </span>
                </div>
                <div className="grid grid-cols-[minmax(8rem,12rem)_auto] gap-x-4">
                  <span className="text-gray-400 dark:text-neutral-600">最適カットオフ</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{rocStats.optimal_threshold.toFixed(3)}</span>
                </div>
                <div className="grid grid-cols-[minmax(8rem,12rem)_auto] gap-x-4">
                  <span className="text-gray-400 dark:text-neutral-600">感度（最適点）</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{(rocStats.optimal_tpr * 100).toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-[minmax(8rem,12rem)_auto] gap-x-4">
                  <span className="text-gray-400 dark:text-neutral-600">特異度（最適点）</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{((1 - rocStats.optimal_fpr) * 100).toFixed(1)}%</span>
                </div>
                <div className="grid grid-cols-[minmax(8rem,12rem)_auto] gap-x-4">
                  <span className="text-gray-400 dark:text-neutral-600">陽性例 / 陰性例</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{rocStats.n_pos} / {rocStats.n_neg}</span>
                </div>
              </div>
              <p className="text-[12px] text-gray-500 dark:text-neutral-500 whitespace-pre-line">{rocStats.interpretation}</p>
            </div>
          )}

          {(captionText || methodText) && (
            <div className="mt-4 grid gap-3 border-t border-gray-100 dark:border-neutral-800 pt-4 md:grid-cols-2">
              <TextCopyBlock title="図注" text={captionText || `${title || "図"}。個別値と解析対象数を示した。`} />
              <TextCopyBlock title="方法文" text={methodText || "Statseedを用いて解析および作図を行った。"} />
            </div>
          )}

          {/* エクスポート */}
          <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800 space-y-3">
            {/* フォントプリセット */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] text-gray-400 dark:text-neutral-600 mr-1">フォント：</span>
              {(["論文標準", "日本語対応", "ポスター", "カスタム"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setFontPreset(p)}
                  className={toggleBtn(fontPreset === p)}
                  style={fontPreset === p ? { backgroundColor: "#56B4E9" } : undefined}
                >
                  {p}
                </button>
              ))}
            </div>

            {fontPreset === "カスタム" && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customFamily}
                  onChange={(e) => setCustomFamily(e.target.value)}
                  placeholder="フォント名（例：Helvetica）"
                  className={`${inputCls} w-52`}
                />
                <input
                  type="number"
                  value={customSize}
                  onChange={(e) => setCustomSize(e.target.value)}
                  min={6}
                  max={24}
                  placeholder="サイズ"
                  className={`${inputCls} w-16`}
                />
                <span className="text-[12px] text-gray-400 dark:text-neutral-600">pt</span>
              </div>
            )}

            {/* 背景 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] text-gray-400 dark:text-neutral-600 mr-1">背景：</span>
              <button
                type="button"
                onClick={() => setExportTransparent(true)}
                className={toggleBtn(exportTransparent)}
                style={exportTransparent ? { backgroundColor: "#CC79A7" } : undefined}
              >
                透明
              </button>
              <button
                type="button"
                onClick={() => setExportTransparent(false)}
                className={toggleBtn(!exportTransparent)}
                style={!exportTransparent ? { backgroundColor: "#CC79A7" } : undefined}
              >
                白
              </button>
            </div>

            {/* フォーマット & ダウンロード */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[12px] text-gray-400 dark:text-neutral-600 mr-1">用途：</span>
              {([
                ["single", "論文1段組"],
                ["double", "論文2段組"],
                ["slide", "16:9スライド"],
              ] as const).map(([value, label]) => (
                <button key={value} type="button" onClick={() => setOutputPreset(value)} className={toggleBtn(outputPreset === value)}>
                  {label}
                </button>
              ))}
            </div>

            {exportPreviewUrl && exportFormat !== "pdf" && (
              <div className="rounded-md border border-gray-200 dark:border-neutral-800 bg-white p-3">
                <p className="mb-2 text-[11px] text-gray-500">最終出力プレビュー</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={exportPreviewUrl} alt="最終出力プレビュー" className="mx-auto max-h-[420px] max-w-full" />
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[12px] text-gray-400 dark:text-neutral-600 mr-1">形式：</span>
              {(["png", "svg", "pdf"] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={toggleBtn(exportFormat === fmt)}
                  style={exportFormat === fmt ? { backgroundColor: "#009E73" } : undefined}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
              <Button
                variant="secondary"
                onClick={() => handleExport(false)}
                loading={exporting}
                className="ml-1"
              >
                最終出力をプレビュー
              </Button>
              <Button
                variant="secondary"
                onClick={() => handleExport(true)}
                loading={exporting}
              >
                ダウンロード
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
