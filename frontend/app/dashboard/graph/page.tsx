"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { ExportRequest, PlotlyFigure, ROCResponse } from "@/lib/types";
import { exportRocCsv } from "@/lib/exportCsv";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PlotlyChart } from "@/components/charts/PlotlyChart";
import { parseCategoricalValues, parseNumbers } from "@/lib/parse";

type ChartType = "boxplot" | "histogram" | "scatter" | "barplot" | "kaplan_meier" | "roc";
type FontPreset = "論文標準" | "日本語対応" | "ポスター" | "カスタム";

const inputCls =
  "rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-[13px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700";

const textareaCls =
  "w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2 text-[13px] font-mono bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 resize-y";

export default function GraphPage() {
  const [chartType, setChartType] = useState<ChartType>("boxplot");

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
  const [bpShowJitter, setBpShowJitter] = useState(true);

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
  const [exportFormat, setExportFormat] = useState<"png" | "svg" | "pdf">("png");

  // font preset
  const [fontPreset, setFontPreset] = useState<FontPreset>("論文標準");
  const [customFamily, setCustomFamily] = useState("");
  const [customSize, setCustomSize] = useState("9");

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

  async function handleDraw(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFigure(null);
    setRocStats(null);
    setLoading(true);

    try {
      if (chartType === "roc") {
        const scores = parseNumbers(rocScoresText);
        const labelsRaw = parseNumbers(rocLabelsText);
        if (scores.length < 4) throw new Error("4件以上のスコアが必要です。");
        if (scores.length !== labelsRaw.length) throw new Error("スコアとラベルのデータ数が一致しません。");
        const labels = labelsRaw.map(Math.round);
        if (labels.some((l) => l !== 0 && l !== 1)) throw new Error("ラベルは 0（陰性）または 1（陽性）を入力してください。");
        const result = await api.graphRoc({ scores, labels, title, score_label: rocScoreLabel });
        setFigure(result.figure);
        setRocStats(result.stats);
      } else if (chartType === "kaplan_meier") {
        const times = parseNumbers(kmTimesText);
        const eventsRaw = parseNumbers(kmEventsText);
        if (times.length < 2) throw new Error("2件以上の生存時間が必要です。");
        if (times.length !== eventsRaw.length) throw new Error("生存時間とイベントのデータ数が一致しません。");
        const events = eventsRaw.map((v) => Math.round(v));
        if (events.some((e) => e !== 0 && e !== 1)) throw new Error("イベントは 0（打ち切り）または 1（イベント）を入力してください。");
        const group_labels = kmGroupText.trim()
          ? (parseCategoricalValues(kmGroupText) as (string | null)[])
          : null;
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
      } else if (chartType === "barplot") {
        const groups = barGroupTexts.map(parseNumbers);
        if (groups.some((g) => g.length < 2)) throw new Error("各群に2件以上のデータが必要です。");
        setFigure(
          await api.graphBarplot({
            groups,
            group_names: barGroupNames,
            title,
            y_label: barYLabel,
            error_type: barErrorType,
          })
        );
      } else if (chartType === "boxplot") {
        const groups = bpGroupTexts.map(parseNumbers);
        if (groups.some((g) => g.length < 2)) throw new Error("各群に2件以上のデータが必要です。");
        setFigure(
          await api.graphBoxplot({
            groups,
            group_names: bpGroupNames,
            title,
            y_label: bpYLabel,
            show_jitter: bpShowJitter,
          })
        );
      } else if (chartType === "histogram") {
        const values = parseNumbers(histText);
        if (values.length < 3) throw new Error("3件以上のデータが必要です。");
        setFigure(
          await api.graphHistogram({
            values,
            title,
            x_label: histXLabel,
            show_normal_curve: histShowNormal,
          })
        );
      } else {
        const x = parseNumbers(scXText);
        const y = parseNumbers(scYText);
        if (x.length < 3) throw new Error("3件以上のデータが必要です。");
        if (x.length !== y.length) throw new Error("XとYのデータ数が一致しません。");
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
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "グラフ生成に失敗しました。");
    } finally {
      setLoading(false);
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const body: ExportRequest = {
        chart_type: chartType as ExportRequest["chart_type"],
        format: exportFormat,
        font_preset: fontPreset,
        font_family: fontPreset === "カスタム" && customFamily ? customFamily : null,
        font_size:
          fontPreset === "カスタム" && customSize
            ? parseInt(customSize, 10) || null
            : null,
      };
      if (chartType === "kaplan_meier") {
        const times = parseNumbers(kmTimesText);
        const events = parseNumbers(kmEventsText).map(Math.round);
        const group_labels = kmGroupText.trim()
          ? (parseCategoricalValues(kmGroupText) as (string | null)[])
          : null;
        body.kaplan_meier = { times, events, group_labels, title, time_label: kmTimeLabel, survival_label: kmSurvLabel, show_ci: kmShowCi, show_risk_table: kmShowRisk };
      } else if (chartType === "barplot") {
        body.barplot = {
          groups: barGroupTexts.map(parseNumbers),
          group_names: barGroupNames,
          title,
          y_label: barYLabel,
          error_type: barErrorType,
        };
      } else if (chartType === "boxplot") {
        body.boxplot = {
          groups: bpGroupTexts.map(parseNumbers),
          group_names: bpGroupNames,
          title,
          y_label: bpYLabel,
          show_jitter: bpShowJitter,
        };
      } else if (chartType === "histogram") {
        body.histogram = {
          values: parseNumbers(histText),
          title,
          x_label: histXLabel,
          show_normal_curve: histShowNormal,
        };
      } else {
        body.scatter = {
          x: parseNumbers(scXText),
          y: parseNumbers(scYText),
          title,
          x_label: scXLabel,
          y_label: scYLabel,
          show_regression: scShowReg,
        };
      }

      const res = await fetch(api.graphExportUrl(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("エクスポートに失敗しました。");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `statseed_graph.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
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
                  style={chartType === opt.value ? { backgroundColor: "#0072B2" } : undefined}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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

          {/* カプランマイヤー */}
          {chartType === "kaplan_meier" && (
            <div className="space-y-3">
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
                          ? "bg-[#0072B2] text-white" : "bg-white dark:bg-[#111] text-gray-500 dark:text-neutral-500 hover:bg-gray-50"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
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
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={addBpGroup}
                  className="text-[12px] text-gray-400 dark:text-neutral-600 hover:text-gray-600 dark:hover:text-neutral-400 transition-colors"
                >
                  + 群を追加
                </button>
                <label className="flex items-center gap-1.5 text-[12px] text-gray-500 dark:text-neutral-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bpShowJitter}
                    onChange={(e) => setBpShowJitter(e.target.checked)}
                    className="rounded"
                  />
                  jitterプロット表示
                </label>
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
            </div>
          )}

          {/* 散布図 */}
          {chartType === "scatter" && (
            <div className="space-y-3">
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

          <Button type="submit" loading={loading}>
            グラフを描画
          </Button>
        </form>
      </Card>

      {error && <ErrorMessage message={error} />}

      {figure && (
        <Card>
          <PlotlyChart figure={figure} />

          {/* ROC統計量 */}
          {rocStats && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-neutral-800">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[12px] font-semibold text-gray-500 dark:text-neutral-500">ROC解析結果</p>
                <button
                  onClick={() => exportRocCsv(rocStats, rocStats.fpr, rocStats.tpr, rocStats.thresholds)}
                  className="text-[12px] text-[#0072B2] hover:text-[#005a8e] transition-colors"
                >
                  CSVダウンロード（座標データ）
                </button>
              </div>
              <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-[13px] mb-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-neutral-600">AUC</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{rocStats.auc.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-neutral-600">95%CI</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">
                    {rocStats.auc_ci_lower.toFixed(3)} – {rocStats.auc_ci_upper.toFixed(3)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-neutral-600">最適カットオフ</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{rocStats.optimal_threshold.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-neutral-600">感度（最適点）</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{(rocStats.optimal_tpr * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-neutral-600">特異度（最適点）</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{((1 - rocStats.optimal_fpr) * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 dark:text-neutral-600">陽性例 / 陰性例</span>
                  <span className="font-medium text-gray-800 dark:text-neutral-200">{rocStats.n_pos} / {rocStats.n_neg}</span>
                </div>
              </div>
              <p className="text-[12px] text-gray-500 dark:text-neutral-500 whitespace-pre-line">{rocStats.interpretation}</p>
            </div>
          )}

          {/* エクスポート（ROC以外） */}
          {chartType !== "roc" && (
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

            {/* フォーマット & ダウンロード */}
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
                onClick={handleExport}
                loading={exporting}
                className="ml-1"
              >
                ダウンロード
              </Button>
            </div>
          </div>
          )}
        </Card>
      )}
    </div>
  );
}
