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
}: {
  figure: PlotlyFigure;
  aspectRatio?: number;
  editable?: boolean;
  editHandlers?: PlotlyEditHandlers;
}) {
  const dark = useIsDarkMode();

  const lineColor = dark ? "#737373" : "#373737";
  const textColor = dark ? "#d4d4d4" : "#373737";

  const baseLayout = figure.layout as Record<string, unknown>;
  const layout: Partial<Plotly.Layout> = {
    ...baseLayout,
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    font: { ...(baseLayout.font as object), color: textColor },
    xaxis: { ...(baseLayout.xaxis as object), linecolor: lineColor, tickcolor: lineColor },
    yaxis: { ...(baseLayout.yaxis as object), linecolor: lineColor, tickcolor: lineColor },
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
