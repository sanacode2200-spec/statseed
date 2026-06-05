"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import type { ExportRequest, PlotlyFigure } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorMessage } from "@/components/ui/ErrorMessage";
import { PlotlyChart } from "@/components/charts/PlotlyChart";

type ChartType = "boxplot" | "histogram" | "scatter";
type FontPreset = "論文標準" | "日本語対応" | "ポスター" | "カスタム";

const inputCls =
  "rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-1.5 text-[13px] bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700";

const textareaCls =
  "w-full rounded-md border border-gray-200 dark:border-neutral-800 px-3 py-2 text-[13px] font-mono bg-white dark:bg-[#111] text-gray-800 dark:text-neutral-200 placeholder-gray-400 dark:placeholder-neutral-600 focus:outline-none focus:ring-1 focus:ring-neutral-300 dark:focus:ring-neutral-700 resize-y";

function parseNums(text: string): number[] {
  return text
    .split(/[\n,\t\s]+/)
    .filter((s) => s.trim() !== "")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n));
}

export default function GraphPage() {
  const [chartType, setChartType] = useState<ChartType>("boxplot");

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
    setLoading(true);

    try {
      if (chartType === "boxplot") {
        const groups = bpGroupTexts.map(parseNums);
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
        const values = parseNums(histText);
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
        const x = parseNums(scXText);
        const y = parseNums(scYText);
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
        chart_type: chartType,
        format: exportFormat,
        font_preset: fontPreset,
        font_family: fontPreset === "カスタム" && customFamily ? customFamily : null,
        font_size:
          fontPreset === "カスタム" && customSize
            ? parseInt(customSize, 10) || null
            : null,
      };
      if (chartType === "boxplot") {
        body.boxplot = {
          groups: bpGroupTexts.map(parseNums),
          group_names: bpGroupNames,
          title,
          y_label: bpYLabel,
          show_jitter: bpShowJitter,
        };
      } else if (chartType === "histogram") {
        body.histogram = {
          values: parseNums(histText),
          title,
          x_label: histXLabel,
          show_normal_curve: histShowNormal,
        };
      } else {
        body.scatter = {
          x: parseNums(scXText),
          y: parseNums(scYText),
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
        </Card>
      )}
    </div>
  );
}
