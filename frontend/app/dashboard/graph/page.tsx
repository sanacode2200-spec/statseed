"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { AnalysisSampleInfo, BoxplotComparisonResult, ExportRequest, PlotlyFigure, ROCResponse } from "@/lib/types";
import { exportRocCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { inputAutoCls as inputCls } from "@/components/ui/formStyles";
import { TextCopyBlock } from "@/components/ui/TextCopyBlock";
import { PlotlyChart } from "@/components/charts/PlotlyChart";
import { type ChartType, getAspectRatio, formatGraphP } from "@/lib/graphConfig";
import { HistogramPanel } from "@/components/graph/HistogramPanel";
import { RocPanel } from "@/components/graph/RocPanel";
import { ScatterPanel } from "@/components/graph/ScatterPanel";
import { PairedPanel } from "@/components/graph/PairedPanel";
import { KaplanMeierPanel } from "@/components/graph/KaplanMeierPanel";
import { BarplotPanel } from "@/components/graph/BarplotPanel";
import { BoxplotPanel } from "@/components/graph/BoxplotPanel";
import { GraphEditPanel, LEGEND_POSITION_MAP, type LegendPosition } from "@/components/graph/GraphEditPanel";
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

type FontPreset = "論文標準" | "日本語対応" | "ポスター" | "カスタム";
type InputMode = "csv" | "manual";

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

  // グラフ編集パネル
  const [editTitle, setEditTitle] = useState("");
  const [editXLabel, setEditXLabel] = useState("");
  const [editYLabel, setEditYLabel] = useState("");
  const [editXMin, setEditXMin] = useState("");
  const [editXMax, setEditXMax] = useState("");
  const [editYMin, setEditYMin] = useState("");
  const [editYMax, setEditYMax] = useState("");
  const [editShowLegend, setEditShowLegend] = useState(true);
  const [editLegendPos, setEditLegendPos] = useState<LegendPosition>("右上");
  const [editShowTitle, setEditShowTitle] = useState(true);
  const [editXDtick, setEditXDtick] = useState("");
  const [editYDtick, setEditYDtick] = useState("");
  const [editShowValueLabels, setEditShowValueLabels] = useState(false);
  const [editSubtitle, setEditSubtitle] = useState("");
  const [editBackground, setEditBackground] = useState<"transparent" | "white" | "cream">("transparent");
  const [editDirectMode, setEditDirectMode] = useState(false);

  // font preset
  const [fontPreset, setFontPreset] = useState<FontPreset>("論文標準");
  const [customFamily, setCustomFamily] = useState("");
  const [customSize, setCustomSize] = useState("9");

  function initEditPanel(type: ChartType) {
    setEditXMin(""); setEditXMax(""); setEditYMin(""); setEditYMax("");
    setEditShowLegend(true);
    setEditLegendPos("右上");
    setEditShowTitle(true);
    setEditXDtick(""); setEditYDtick("");
    setEditShowValueLabels(false);
    setEditSubtitle("");
    setEditBackground("transparent");
    setEditDirectMode(false);
    setEditTitle(title);
    if (type === "scatter") { setEditXLabel(scXLabel); setEditYLabel(scYLabel); }
    else if (type === "histogram") { setEditXLabel(histXLabel); setEditYLabel("度数"); }
    else if (type === "kaplan_meier") { setEditXLabel(kmTimeLabel); setEditYLabel(kmSurvLabel); }
    else if (type === "roc") { setEditXLabel("1 - 特異度（偽陽性率）"); setEditYLabel("感度（真陽性率）"); }
    else if (type === "boxplot") { setEditXLabel(""); setEditYLabel(bpYLabel); }
    else if (type === "barplot") { setEditXLabel(""); setEditYLabel(barYLabel); }
    else if (type === "paired") { setEditXLabel(""); setEditYLabel(pairedYLabel); }
  }

  // 編集オーバーライドをPlotly layoutにマージ
  const patchedFigure = useMemo(() => {
    if (!figure) return null;
    const layout: Record<string, unknown> = { ...figure.layout };

    const titleObj = typeof layout.title === "object" && layout.title !== null ? { ...(layout.title as Record<string, unknown>) } : {};
    layout.title = { ...titleObj, text: editShowTitle ? editTitle : "" };

    // サブタイトル（スライド向け）: 大見出しを左寄せにし、その下にグレーの説明文
    if (editSubtitle) {
      layout.title = { ...(layout.title as Record<string, unknown>), x: 0.01, xanchor: "left" };
      const existing = Array.isArray(layout.annotations) ? (layout.annotations as Record<string, unknown>[]) : [];
      layout.annotations = [
        ...existing,
        {
          text: editSubtitle,
          xref: "paper", yref: "paper",
          x: 0, y: 1.04, xanchor: "left", yanchor: "bottom",
          showarrow: false,
          font: { size: 11, color: "#8a8a8a" },
        },
      ];
    }

    const xAxis: Record<string, unknown> = typeof layout.xaxis === "object" && layout.xaxis !== null ? { ...(layout.xaxis as Record<string, unknown>) } : {};
    if (editXLabel !== "") {
      const xTitleObj = typeof xAxis.title === "object" && xAxis.title !== null ? { ...(xAxis.title as Record<string, unknown>) } : {};
      xAxis.title = { ...xTitleObj, text: editXLabel };
    }
    const xMin = parseFloat(editXMin), xMax = parseFloat(editXMax);
    if (!isNaN(xMin) && !isNaN(xMax) && xMin < xMax) { xAxis.range = [xMin, xMax]; xAxis.autorange = false; }
    const xDtick = parseFloat(editXDtick);
    if (!isNaN(xDtick) && xDtick > 0) { xAxis.dtick = xDtick; xAxis.tick0 = 0; }
    layout.xaxis = xAxis;

    const yAxis: Record<string, unknown> = typeof layout.yaxis === "object" && layout.yaxis !== null ? { ...(layout.yaxis as Record<string, unknown>) } : {};
    if (editYLabel !== "") {
      const yTitleObj = typeof yAxis.title === "object" && yAxis.title !== null ? { ...(yAxis.title as Record<string, unknown>) } : {};
      yAxis.title = { ...yTitleObj, text: editYLabel };
    }
    const yMin = parseFloat(editYMin), yMax = parseFloat(editYMax);
    if (!isNaN(yMin) && !isNaN(yMax) && yMin < yMax) { yAxis.range = [yMin, yMax]; yAxis.autorange = false; }
    const yDtick = parseFloat(editYDtick);
    if (!isNaN(yDtick) && yDtick > 0) { yAxis.dtick = yDtick; yAxis.tick0 = 0; }
    layout.yaxis = yAxis;

    layout.showlegend = editShowLegend;
    if (editShowLegend) {
      const legendPositions: Record<string, Record<string, unknown>> = {
        右上: { x: 0.99, y: 0.99, xanchor: "right", yanchor: "top" },
        右下: { x: 0.99, y: 0.01, xanchor: "right", yanchor: "bottom" },
        左上: { x: 0.01, y: 0.99, xanchor: "left", yanchor: "top" },
        左下: { x: 0.01, y: 0.01, xanchor: "left", yanchor: "bottom" },
      };
      const pos = legendPositions[editLegendPos];
      if (pos) layout.legend = { ...(typeof layout.legend === "object" && layout.legend !== null ? (layout.legend as Record<string, unknown>) : {}), ...pos };
    }

    // データ値ラベル（棒グラフのバーに数値を表示）
    let data = figure.data;
    if (editShowValueLabels) {
      data = figure.data.map((trace) => {
        const t = trace as Record<string, unknown>;
        if (t.type !== "bar") return trace;
        const ys = Array.isArray(t.y) ? (t.y as number[]) : [];
        return {
          ...t,
          text: ys.map((v) => (typeof v === "number" ? String(Number(v.toPrecision(3))) : "")),
          textposition: "outside",
          cliponaxis: false,
          textfont: { size: 11, color: "#373737" },
        };
      });
    }

    return { ...figure, data, layout };
  }, [figure, editTitle, editShowTitle, editSubtitle, editXLabel, editYLabel, editXMin, editXMax, editYMin, editYMax, editXDtick, editYDtick, editShowValueLabels, editShowLegend, editLegendPos]);

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
      initEditPanel(chartType);
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

      // 編集パネルのオーバーライドを反映
      if (editShowTitle && editTitle) body.override_title = editTitle;
      if (!editShowTitle) body.override_hide_title = true;
      const xDtickEx = parseFloat(editXDtick);
      if (!isNaN(xDtickEx) && xDtickEx > 0) body.override_x_dtick = xDtickEx;
      const yDtickEx = parseFloat(editYDtick);
      if (!isNaN(yDtickEx) && yDtickEx > 0) body.override_y_dtick = yDtickEx;
      if (editShowValueLabels) body.override_show_value_labels = true;
      if (editSubtitle) body.override_subtitle = editSubtitle;
      if (editBackground !== "transparent") body.override_background = editBackground;
      if (editXLabel) body.override_x_label = editXLabel;
      if (editYLabel) body.override_y_label = editYLabel;
      const xMinEx = parseFloat(editXMin), xMaxEx = parseFloat(editXMax);
      if (!isNaN(xMinEx) && !isNaN(xMaxEx) && xMinEx < xMaxEx) body.override_x_range = [xMinEx, xMaxEx];
      const yMinEx = parseFloat(editYMin), yMaxEx = parseFloat(editYMax);
      if (!isNaN(yMinEx) && !isNaN(yMaxEx) && yMinEx < yMaxEx) body.override_y_range = [yMinEx, yMaxEx];
      body.override_show_legend = editShowLegend;
      body.override_legend_position = LEGEND_POSITION_MAP[editLegendPos];

      const blob = await api.graphExport(body);
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
    `px-3 py-1 rounded-md text-[14px] font-medium border transition-colors ${
      active
        ? "text-white border-transparent"
        : "text-gray-500 dark:text-neutral-500 border-gray-200 dark:border-neutral-800 bg-white dark:bg-transparent hover:bg-gray-50 dark:hover:bg-neutral-900"
    }`;

  return (
    <div>
      <div className="text-[13px] font-semibold uppercase tracking-widest text-gray-400 dark:text-neutral-600 mb-1">
        解析
      </div>
      <h1 className="text-[24px] font-bold text-gray-900 dark:text-white mb-1">グラフ作成</h1>
      <p className="text-[16px] text-gray-400 dark:text-neutral-600 mb-5">
        個別値が伝わるグラフを作成し、論文や発表に使いやすいPNG・SVG・PDFで出力できます。
      </p>

      <Card className="mb-5">
        <form onSubmit={handleDraw} className="space-y-4">
          {/* グラフ種別 */}
          <div>
            <label className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1.5">グラフの種類</label>
            <div className="flex flex-wrap gap-1.5">
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
            <div className="rounded-md border border-gray-200 dark:border-neutral-800 bg-gray-50 dark:bg-neutral-950 px-3 py-2 text-[14px] text-gray-500 dark:text-neutral-500">
              検定結果から引き継いだ群: {includedGroups.join(" / ")}
              <button type="button" onClick={() => setIncludedGroups(null)} className="ml-3 hover:underline">全群を使用</button>
            </div>
          )}

          {/* タイトル */}
          <div>
            <label className="block text-[14px] font-medium text-gray-500 dark:text-neutral-500 mb-1">タイトル（任意）</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${inputCls} w-full`}
              placeholder="例：介入前後の握力比較"
            />
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
            />
          )}

          {/* カプランマイヤー */}
          {chartType === "kaplan_meier" && (
            <KaplanMeierPanel
              csvMode={inputMode === "csv" && !!dataset}
              csvCont={csvCont}
              csvNumeric={csvNumeric}
              csvCat={csvCat}
              csvKmTimeCol={csvKmTimeCol}
              setCsvKmTimeCol={setCsvKmTimeCol}
              csvKmEventCol={csvKmEventCol}
              setCsvKmEventCol={setCsvKmEventCol}
              csvKmGroupCol={csvKmGroupCol}
              setCsvKmGroupCol={setCsvKmGroupCol}
              kmTimesText={kmTimesText}
              setKmTimesText={setKmTimesText}
              kmEventsText={kmEventsText}
              setKmEventsText={setKmEventsText}
              kmGroupText={kmGroupText}
              setKmGroupText={setKmGroupText}
              kmTimeLabel={kmTimeLabel}
              setKmTimeLabel={setKmTimeLabel}
              kmSurvLabel={kmSurvLabel}
              setKmSurvLabel={setKmSurvLabel}
              kmShowCi={kmShowCi}
              setKmShowCi={setKmShowCi}
              kmShowRisk={kmShowRisk}
              setKmShowRisk={setKmShowRisk}
            />
          )}

          {/* 棒グラフ */}
          {chartType === "barplot" && (
            <BarplotPanel
              csvMode={inputMode === "csv" && !!dataset}
              csvCont={csvCont}
              csvCat={csvCat}
              barYLabel={barYLabel}
              setBarYLabel={setBarYLabel}
              barErrorType={barErrorType}
              setBarErrorType={setBarErrorType}
              csvGroupedValueCol={csvGroupedValueCol}
              setCsvGroupedValueCol={setCsvGroupedValueCol}
              csvGroupedGroupCol={csvGroupedGroupCol}
              setCsvGroupedGroupCol={setCsvGroupedGroupCol}
              barGroupTexts={barGroupTexts}
              barGroupNames={barGroupNames}
              updateBarName={updateBarName}
              updateBarGroup={updateBarGroup}
              addBarGroup={addBarGroup}
              removeBarGroup={removeBarGroup}
            />
          )}

          {/* 箱ひげ図 */}
          {chartType === "boxplot" && (
            <BoxplotPanel
              csvMode={inputMode === "csv" && !!dataset}
              csvCont={csvCont}
              csvCat={csvCat}
              bpYLabel={bpYLabel}
              setBpYLabel={setBpYLabel}
              csvGroupedValueCol={csvGroupedValueCol}
              setCsvGroupedValueCol={setCsvGroupedValueCol}
              csvGroupedGroupCol={csvGroupedGroupCol}
              setCsvGroupedGroupCol={setCsvGroupedGroupCol}
              bpGroupTexts={bpGroupTexts}
              bpGroupNames={bpGroupNames}
              updateBpName={updateBpName}
              updateBpGroup={updateBpGroup}
              addBpGroup={addBpGroup}
              removeBpGroup={removeBpGroup}
              bpDisplayStyle={bpDisplayStyle}
              setBpDisplayStyle={setBpDisplayStyle}
              bpColorMode={bpColorMode}
              setBpColorMode={setBpColorMode}
              bpShowN={bpShowN}
              setBpShowN={setBpShowN}
              bpShowGrid={bpShowGrid}
              setBpShowGrid={setBpShowGrid}
              bpYMin={bpYMin}
              setBpYMin={setBpYMin}
              bpYMax={bpYMax}
              setBpYMax={setBpYMax}
              bpShowComparison={bpShowComparison}
              setBpShowComparison={setBpShowComparison}
              bpComparisonMethod={bpComparisonMethod}
              setBpComparisonMethod={setBpComparisonMethod}
            />
          )}

          {/* ヒストグラム */}
          {chartType === "histogram" && (
            <HistogramPanel
              csvMode={inputMode === "csv" && !!dataset}
              csvCont={csvCont}
              histXLabel={histXLabel}
              setHistXLabel={setHistXLabel}
              csvHistCol={csvHistCol}
              setCsvHistCol={setCsvHistCol}
              histText={histText}
              setHistText={setHistText}
              histShowNormal={histShowNormal}
              setHistShowNormal={setHistShowNormal}
            />
          )}

          {/* ROC曲線 */}
          {chartType === "roc" && (
            <RocPanel
              csvMode={inputMode === "csv" && !!dataset}
              csvCont={csvCont}
              csvNumeric={csvNumeric}
              rocScoreLabel={rocScoreLabel}
              setRocScoreLabel={setRocScoreLabel}
              csvRocScoreCol={csvRocScoreCol}
              setCsvRocScoreCol={setCsvRocScoreCol}
              csvRocLabelCol={csvRocLabelCol}
              setCsvRocLabelCol={setCsvRocLabelCol}
              rocScoresText={rocScoresText}
              setRocScoresText={setRocScoresText}
              rocLabelsText={rocLabelsText}
              setRocLabelsText={setRocLabelsText}
            />
          )}

          {/* 散布図 */}
          {chartType === "scatter" && (
            <ScatterPanel
              csvMode={inputMode === "csv" && !!dataset}
              csvCont={csvCont}
              csvScatterXCol={csvScatterXCol}
              setCsvScatterXCol={setCsvScatterXCol}
              csvScatterYCol={csvScatterYCol}
              setCsvScatterYCol={setCsvScatterYCol}
              scXLabel={scXLabel}
              setScXLabel={setScXLabel}
              scYLabel={scYLabel}
              setScYLabel={setScYLabel}
              scXText={scXText}
              setScXText={setScXText}
              scYText={scYText}
              setScYText={setScYText}
              scShowReg={scShowReg}
              setScShowReg={setScShowReg}
            />
          )}

          {/* 対応あり個別値プロット */}
          {chartType === "paired" && (
            <PairedPanel
              csvMode={inputMode === "csv" && !!dataset}
              csvCont={csvCont}
              csvPairedBeforeCol={csvPairedBeforeCol}
              setCsvPairedBeforeCol={setCsvPairedBeforeCol}
              csvPairedAfterCol={csvPairedAfterCol}
              setCsvPairedAfterCol={setCsvPairedAfterCol}
              pairedBeforeText={pairedBeforeText}
              setPairedBeforeText={setPairedBeforeText}
              pairedAfterText={pairedAfterText}
              setPairedAfterText={setPairedAfterText}
              pairedBeforeLabel={pairedBeforeLabel}
              setPairedBeforeLabel={setPairedBeforeLabel}
              pairedAfterLabel={pairedAfterLabel}
              setPairedAfterLabel={setPairedAfterLabel}
              pairedYLabel={pairedYLabel}
              setPairedYLabel={setPairedYLabel}
            />
          )}

          <Button type="submit" loading={loading}>
            グラフを描画
          </Button>
        </form>
      </Card>

      {error && <ErrorMessage message={error} />}

      {patchedFigure && (
        <Card>
          {sampleInfo && <div className="mb-4"><AnalysisSampleInfoCard info={sampleInfo} /></div>}

          {/* グラフ + 編集パネル（デスクトップ横並び） */}
          <div className="flex flex-col lg:flex-row gap-5">
            <div className="flex-1 min-w-0">
              <PlotlyChart
                figure={patchedFigure}
                aspectRatio={getAspectRatio(chartType, patchedFigure)}
                background={editBackground}
                editable={editDirectMode}
                editHandlers={{
                  onTitleEdit: (t) => { setEditShowTitle(true); setEditTitle(t); },
                  onXLabelEdit: setEditXLabel,
                  onYLabelEdit: setEditYLabel,
                }}
              />
            </div>
            <div className="lg:w-60 xl:w-64 shrink-0 border-t border-gray-100 dark:border-neutral-800 pt-4 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5">
              <GraphEditPanel
                editTitle={editTitle} setEditTitle={setEditTitle}
                editShowTitle={editShowTitle} setEditShowTitle={setEditShowTitle}
                editXLabel={editXLabel} setEditXLabel={setEditXLabel}
                editYLabel={editYLabel} setEditYLabel={setEditYLabel}
                editXMin={editXMin} setEditXMin={setEditXMin}
                editXMax={editXMax} setEditXMax={setEditXMax}
                editYMin={editYMin} setEditYMin={setEditYMin}
                editYMax={editYMax} setEditYMax={setEditYMax}
                editXDtick={editXDtick} setEditXDtick={setEditXDtick}
                editYDtick={editYDtick} setEditYDtick={setEditYDtick}
                showXControls={["scatter", "histogram", "roc", "kaplan_meier"].includes(chartType)}
                editShowValueLabels={editShowValueLabels} setEditShowValueLabels={setEditShowValueLabels}
                showValueLabelsControl={chartType === "barplot"}
                editSubtitle={editSubtitle} setEditSubtitle={setEditSubtitle}
                editBackground={editBackground} setEditBackground={setEditBackground}
                editShowLegend={editShowLegend} setEditShowLegend={setEditShowLegend}
                editLegendPos={editLegendPos} setEditLegendPos={setEditLegendPos}
                editDirectMode={editDirectMode} setEditDirectMode={setEditDirectMode}
              />
            </div>
          </div>

          {bpComparison && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div>
                  <p className="text-[14px] font-semibold text-gray-600 dark:text-neutral-400">群間比較結果</p>
                  <p className="text-[13px] text-gray-400 dark:text-neutral-600 mt-0.5">{bpComparison.method}</p>
                </div>
                <div className="flex flex-wrap gap-3 text-[13px] text-gray-500 dark:text-neutral-500">
                  {bpComparison.omnibus_p_value !== null && (
                    <span>全体: {formatGraphP(bpComparison.omnibus_p_value)}</span>
                  )}
                  {bpComparison.effect_size !== null && bpComparison.effect_size_label && (
                    <span>{bpComparison.effect_size_label} = {bpComparison.effect_size.toFixed(3)}</span>
                  )}
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border border-gray-200 dark:border-neutral-800">
                <table className="w-full text-[14px]">
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
              <p className="mt-2 text-[13px] text-gray-400 dark:text-neutral-600">
                {bpComparison.note} p値は差の大きさや臨床的重要性を示しません。効果量とデータ分布も確認してください。
              </p>
            </div>
          )}

          {/* ROC統計量 */}
          {rocStats && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14px] font-semibold text-gray-500 dark:text-neutral-500">ROC解析結果</p>
                <button
                  onClick={() => exportRocCsv(rocStats, rocStats.fpr, rocStats.tpr, rocStats.thresholds)}
                  className="text-[14px] text-white hover:text-white transition-colors"
                >
                  CSVダウンロード（座標データ）
                </button>
              </div>
              <div className="mb-3 grid grid-cols-1 gap-x-8 gap-y-1 text-[16px] sm:grid-cols-2">
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
              <p className="text-[14px] text-gray-500 dark:text-neutral-500 whitespace-pre-line">{rocStats.interpretation}</p>
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
              <span className="text-[14px] text-gray-400 dark:text-neutral-600 mr-1">フォント：</span>
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
                  className={`${inputCls} w-full sm:w-52`}
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
                <span className="text-[14px] text-gray-400 dark:text-neutral-600">pt</span>
              </div>
            )}

            {/* 背景 */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[14px] text-gray-400 dark:text-neutral-600 mr-1">背景：</span>
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
              <span className="text-[14px] text-gray-400 dark:text-neutral-600 mr-1">用途：</span>
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
                <p className="mb-2 text-[13px] text-gray-500">最終出力プレビュー</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={exportPreviewUrl} alt="最終出力プレビュー" className="mx-auto max-h-[420px] max-w-full" />
              </div>
            )}

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[14px] text-gray-400 dark:text-neutral-600 mr-1">形式：</span>
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
