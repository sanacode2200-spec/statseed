"use client";

import dynamic from "next/dynamic";
import type { PlotlyFigure } from "@/lib/types";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg text-[15px] text-gray-400">
      グラフを読み込み中...
    </div>
  ),
});

export function PlotlyChart({ figure }: { figure: PlotlyFigure }) {
  return (
    <Plot
      data={figure.data as Plotly.Data[]}
      layout={{
        ...(figure.layout as Partial<Plotly.Layout>),
        autosize: true,
      }}
      config={{
        displaylogo: false,
        modeBarButtonsToRemove: ["sendDataToCloud", "lasso2d", "select2d"],
        responsive: true,
      }}
      style={{ width: "100%", height: "400px" }}
      useResizeHandler
    />
  );
}
