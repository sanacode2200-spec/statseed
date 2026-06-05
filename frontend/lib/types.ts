// --- 記述統計 ---

export interface DescriptiveRequest {
  variable_name: string;
  values: (number | null)[];
}

export interface DescriptiveResponse {
  variable_name: string;
  n: number;
  missing: number;
  mean: number | null;
  sd: number | null;
  median: number;
  q1: number;
  q3: number;
  iqr: number;
  minimum: number;
  maximum: number;
  ci95_low: number | null;
  ci95_high: number | null;
  shapiro_wilk_p: number | null;
  interpretation: string;
}

export interface CategoricalRequest {
  variable_name: string;
  values: (string | null)[];
}

export interface CategoryCount {
  label: string;
  count: number;
  percent: number;
}

export interface CategoricalResponse {
  variable_name: string;
  n: number;
  missing: number;
  categories: CategoryCount[];
  interpretation: string;
}

// --- 検定共通 ---

export interface TestResult {
  test_name: string;
  statistic: number | null;
  p_value: number;
  effect_size: number | null;
  effect_size_label: string | null;
  ci95_low: number | null;
  ci95_high: number | null;
  interpretation: string;
}

export interface CorrelationResult {
  method: string;
  r: number;
  p_value: number;
  n: number;
  ci95_low: number | null;
  ci95_high: number | null;
  interpretation: string;
}

// --- 検定リクエスト ---

export interface TwoGroupRequest {
  variable_name: string;
  group_a: number[];
  group_b: number[];
  group_a_name: string;
  group_b_name: string;
}

export interface PairedRequest {
  variable_name: string;
  before: number[];
  after: number[];
}

export interface MultiGroupRequest {
  variable_name: string;
  groups: number[][];
  group_names: string[] | null;
}

export interface ChiSquareRequest {
  observed: number[][];
}

export interface CorrelationRequest {
  variable_x_name: string;
  variable_y_name: string;
  x: number[];
  y: number[];
  method: "pearson" | "spearman";
}

// --- 検定選択ガイド ---

export interface GuideRequest {
  purpose: "compare" | "correlate";
  data_type?: "continuous" | "categorical";
  n_groups?: 2 | 3;
  paired?: boolean;
  normal?: "yes" | "no" | "unknown";
}

export interface SuggestedTest {
  test_name: string;
  endpoint: string;
  confidence: "推奨" | "代替案";
  reason: string;
  caution: string;
}

export interface GuideResponse {
  suggestions: SuggestedTest[];
  summary: string;
}

// --- アップロード ---

export interface ColumnInfo {
  name: string;
  dtype: "continuous" | "categorical";
  n_valid: number;
  n_missing: number;
  values: (number | null)[];
  preview: (string | null)[];
}

export interface UploadResponse {
  n_rows: number;
  n_cols: number;
  filename: string;
  columns: ColumnInfo[];
  preview_rows: Record<string, string | null>[];
}

// --- グラフ ---

export interface BoxplotRequest {
  groups: number[][];
  group_names?: string[];
  title?: string;
  y_label?: string;
  show_jitter?: boolean;
}

export interface HistogramRequest {
  values: number[];
  title?: string;
  x_label?: string;
  bins?: number | null;
  show_normal_curve?: boolean;
}

export interface ScatterRequest {
  x: number[];
  y: number[];
  title?: string;
  x_label?: string;
  y_label?: string;
  show_regression?: boolean;
}

export interface PlotlyFigure {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
}

export interface ExportRequest {
  chart_type: "boxplot" | "histogram" | "scatter";
  format: "png" | "svg" | "pdf";
  font_preset?: "論文標準" | "日本語対応" | "ポスター" | "カスタム" | null;
  font_family?: string | null;
  font_size?: number | null;
  boxplot?: BoxplotRequest;
  histogram?: HistogramRequest;
  scatter?: ScatterRequest;
}
