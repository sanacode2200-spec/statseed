import type {
  BarplotRequest,
  BoxplotResult,
  BoxplotRequest,
  KaplanMeierRequest,
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
  PairedPlotRequest,
  PlotlyFigure,
  PosthocRequest,
  PosthocResult,
  ROCRequest,
  ROCResult,
  ScatterRequest,
  Table1Request,
  Table1Result,
  TestResult,
  TwoGroupRequest,
  UploadResponse,
} from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function errorMessage(payload: unknown, fallback: string): string {
  if (typeof payload !== "object" || payload === null || !("detail" in payload)) {
    return fallback;
  }

  const detail = payload.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail)) {
    const messages = detail
      .map((item) => {
        if (typeof item !== "object" || item === null || !("msg" in item)) return null;
        return typeof item.msg === "string" ? item.msg.replace(/^Value error, /, "") : null;
      })
      .filter((message): message is string => message !== null);
    if (messages.length > 0) return messages.join("\n");
  }
  return fallback;
}

async function responseError(res: Response, fallback: string): Promise<Error> {
  const payload: unknown = await res.json().catch(() => null);
  return new Error(errorMessage(payload, `${fallback} (${res.status})`));
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await responseError(res, "APIエラー");
  }
  return res.json() as Promise<T>;
}

async function _upload<T>(path: string, file: File): Promise<T> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form });
  if (!res.ok) {
    throw await responseError(res, "アップロードエラー");
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

  graphKaplanMeier: (req: KaplanMeierRequest) =>
    post<PlotlyFigure>("/api/graph/kaplan-meier", req),

  graphBarplot: (req: BarplotRequest) =>
    post<PlotlyFigure>("/api/graph/barplot", req),

  graphBoxplot: (req: BoxplotRequest) =>
    post<BoxplotResult>("/api/graph/boxplot", req),

  graphHistogram: (req: HistogramRequest) =>
    post<PlotlyFigure>("/api/graph/histogram", req),

  graphScatter: (req: ScatterRequest) =>
    post<PlotlyFigure>("/api/graph/scatter", req),

  graphPaired: (req: PairedPlotRequest) =>
    post<PlotlyFigure>("/api/graph/paired", req),

  graphRoc: (req: ROCRequest) =>
    post<ROCResult>("/api/graph/roc", req),

  graphExportUrl: () => `${BASE}/api/graph/export`,

  uploadCsv: (file: File) => _upload<UploadResponse>("/api/upload/csv", file),
  uploadExcel: (file: File) => _upload<UploadResponse>("/api/upload/excel", file),

  guideSuggest: (req: GuideRequest) =>
    post<GuideResponse>("/api/guide/suggest", req),

  posthoc: (req: PosthocRequest) =>
    post<PosthocResult>("/api/test/posthoc", req),

  table1: (req: Table1Request) =>
    post<Table1Result>("/api/table1", req),
};
