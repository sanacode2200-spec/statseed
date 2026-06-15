import type { PlotlyFigure } from "./types";

export type ChartType =
  | "boxplot"
  | "histogram"
  | "scatter"
  | "paired"
  | "barplot"
  | "kaplan_meier"
  | "roc";

// PNG/SVG/PDF出力時のmatplotlib figsizeに合わせた画面表示の縦横比
export function getAspectRatio(chartType: ChartType, figure: PlotlyFigure): number {
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

export function formatGraphP(p: number): string {
  return p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`;
}
