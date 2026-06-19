"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import type { PlotlyFigure } from "@/lib/types";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-50 dark:bg-neutral-950 rounded-lg text-[18px] text-gray-400">
      グラフを読み込み中...
    </div>
  ),
});

function useIsDarkMode(): boolean {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    setDark(root.classList.contains("dark"));

    const observer = new MutationObserver(() => {
      setDark(root.classList.contains("dark"));
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return dark;
}

/** Plotly のインプレース編集（editable）で変更されたテキストをフォーム状態へ戻すためのコールバック群。 */
export interface PlotlyEditHandlers {
  onTitleEdit?: (text: string) => void;
  onXLabelEdit?: (text: string) => void;
  onYLabelEdit?: (text: string) => void;
}

export function PlotlyChart({
  figure,
  aspectRatio = 1.25,
  editable = false,
  editHandlers,
  background = "transparent",
}: {
  figure: PlotlyFigure;
  aspectRatio?: number;
  editable?: boolean;
  editHandlers?: PlotlyEditHandlers;
  background?: "transparent" | "white" | "cream";
}) {
  const dark = useIsDarkMode();

  const lineColor = dark ? "#737373" : "#373737";
  const textColor = dark ? "#d4d4d4" : "#373737";
  const bgColor = background === "white" ? "#ffffff" : background === "cream" ? "#faf8f3" : "rgba(0,0,0,0)";
  // 背景色を敷く場合は文字色を濃色固定にする（ダーク用の薄色だと白/クリーム地で読めないため）
  const onBg = background === "transparent";
  const effTextColor = onBg ? textColor : "#373737";
  const effLineColor = onBg ? lineColor : "#373737";

  const baseLayout = figure.layout as Record<string, unknown>;
  const layout: Partial<Plotly.Layout> = {
    ...baseLayout,
    autosize: true,
    paper_bgcolor: bgColor,
    plot_bgcolor: bgColor,
    font: { ...(baseLayout.font as object), color: effTextColor },
    xaxis: { ...(baseLayout.xaxis as object), linecolor: effLineColor, tickcolor: effLineColor },
    yaxis: { ...(baseLayout.yaxis as object), linecolor: effLineColor, tickcolor: effLineColor },
  };

  return (
    <div className="mx-auto w-full" style={{ maxWidth: "640px" }}>
      <div style={{ aspectRatio: String(aspectRatio), width: "100%" }}>
        <Plot
          data={figure.data as Plotly.Data[]}
          layout={layout}
          config={{
            displaylogo: false,
            modeBarButtonsToRemove: ["sendDataToCloud", "lasso2d", "select2d"],
            responsive: true,
            editable,
            edits: editable
              ? { titleText: true, axisTitleText: true, annotationText: true, annotationPosition: true, legendPosition: true }
              : undefined,
          }}
          onRelayout={
            editable && editHandlers
              ? (e: Record<string, unknown>) => {
                  const t = e["title.text"];
                  if (typeof t === "string") editHandlers.onTitleEdit?.(t);
                  const xt = e["xaxis.title.text"];
                  if (typeof xt === "string") editHandlers.onXLabelEdit?.(xt);
                  const yt = e["yaxis.title.text"];
                  if (typeof yt === "string") editHandlers.onYLabelEdit?.(yt);
                }
              : undefined
          }
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
