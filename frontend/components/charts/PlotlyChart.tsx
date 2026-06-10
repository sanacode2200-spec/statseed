"use client";

import dynamic from "next/dynamic";
import type { PlotlyFigure } from "@/lib/types";

const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center w-full h-full bg-gray-50 rounded-lg text-[15px] text-gray-400">
      グラフを読み込み中...
    </div>
  ),
});

export function PlotlyChart({ figure, aspectRatio = 1.25 }: { figure: PlotlyFigure; aspectRatio?: number }) {
  return (
    <div className="mx-auto w-full" style={{ maxWidth: "640px" }}>
      <div style={{ aspectRatio: String(aspectRatio), width: "100%" }}>
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
          style={{ width: "100%", height: "100%" }}
          useResizeHandler
        />
      </div>
    </div>
  );
}
