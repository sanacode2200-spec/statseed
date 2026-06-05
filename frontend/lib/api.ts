import type {
  BoxplotRequest,
  CategoricalRequest,
  CategoricalResponse,
  ChiSquareRequest,
  CorrelationRequest,
  CorrelationResult,
  DescriptiveRequest,
  DescriptiveResponse,
  GuideRequest,
  GuideResponse,
  HistogramRequest,
  MultiGroupRequest,
  PairedRequest,
  PlotlyFigure,
  ScatterRequest,
  TestResult,
  TwoGroupRequest,
  UploadResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `APIエラー (${res.status})`);
  }
  return res.json() as Promise<T>;
}

async function _upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.detail ?? `アップロードエラー (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  descriptive: (req: DescriptiveRequest) =>
    post<DescriptiveResponse>("/api/descriptive", req),

  categoricalDescriptive: (req: CategoricalRequest) =>
    post<CategoricalResponse>("/api/descriptive/categorical", req),

  ttestInd: (req: TwoGroupRequest) =>
    post<TestResult>("/api/test/ttest", req),

  mannwhitney: (req: TwoGroupRequest) =>
    post<TestResult>("/api/test/mannwhitney", req),

  ttestPaired: (req: PairedRequest) =>
    post<TestResult>("/api/test/ttest-paired", req),

  wilcoxon: (req: PairedRequest) =>
    post<TestResult>("/api/test/wilcoxon", req),

  anova: (req: MultiGroupRequest) =>
    post<TestResult>("/api/test/anova", req),

  kruskal: (req: MultiGroupRequest) =>
    post<TestResult>("/api/test/kruskal", req),

  chisquare: (req: ChiSquareRequest) =>
    post<TestResult>("/api/test/chisquare", req),

  fisher: (req: ChiSquareRequest) =>
    post<TestResult>("/api/test/fisher", req),

  correlation: (req: CorrelationRequest) =>
    post<CorrelationResult>("/api/test/correlation", req),

  graphBoxplot: (req: BoxplotRequest) =>
    post<PlotlyFigure>("/api/graph/boxplot", req),

  graphHistogram: (req: HistogramRequest) =>
    post<PlotlyFigure>("/api/graph/histogram", req),

  graphScatter: (req: ScatterRequest) =>
    post<PlotlyFigure>("/api/graph/scatter", req),

  graphExportUrl: () => `${BASE}/api/graph/export`,

  uploadCsv: (file: File) => _upload<UploadResponse>("/api/upload/csv", file),
  uploadExcel: (file: File) => _upload<UploadResponse>("/api/upload/excel", file),

  guideSuggest: (req: GuideRequest) =>
    post<GuideResponse>("/api/guide/suggest", req),
};
