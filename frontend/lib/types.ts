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

export interface AnalysisSampleInfo {
  total: number;
  used: number;
  excluded: number;
  exclusion_reason: string;
}

export interface TestResult {
  test_name: string;
  statistic: number | null;
  p_value: number;
  effect_size: number | null;
  effect_size_label: string | null;
  ci95_low: number | null;
  ci95_high: number | null;
  estimate?: number | null;
  estimate_label?: string | null;
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
  estimand?: "mean" | "distribution";
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

export type ColumnRole = "id" | "continuous" | "ordinal" | "categorical" | "date" | "exclude";
export type PrivacyRisk = "direct_identifier" | "contact" | "birth_date" | "address";

export interface ColumnInfo {
  name: string;
  dtype: "continuous" | "categorical";
  role?: ColumnRole;
  role_reason?: string;
  privacy_risk?: PrivacyRisk | null;
  privacy_reason?: string | null;
  n_valid: number;
  n_missing: number;
  values: (number | null)[];
  cat_values: (string | null)[];
  preview: (string | null)[];
}

export interface UploadResponse {
  n_rows: number;
  n_cols: number;
  filename: string;
  columns: ColumnInfo[];
  preview_rows: Record<string, string | null>[];
}

// --- 多重比較（事後検定）---

export interface PosthocRequest {
  variable_name?: string;
  groups: number[][];
  group_names?: string[] | null;
  method: "tukey" | "bonferroni" | "holm" | "steel_dwass";
}

export interface PairwiseComparison {
  group_a: string;
  group_b: string;
  mean_a: number | null;
  mean_b: number | null;
  mean_diff: number | null;
  p_raw: number;
  p_adjusted: number;
  significant: boolean;
}

export interface PosthocResult {
  method: string;
  variable_name: string;
  pairs: PairwiseComparison[];
  n_comparisons: number;
  interpretation: string;
}

// --- Table 1 ---

export interface ContinuousVariable {
  name: string;
  type: "continuous";
  values: (number | null)[];
  display?: "mean_sd" | "median_iqr";
}

export interface CategoricalVariable {
  name: string;
  type: "categorical";
  values: (string | null)[];
}

export type Table1Variable = ContinuousVariable | CategoricalVariable;

export interface Table1Request {
  variables: Table1Variable[];
  group_values?: (string | null)[] | null;
  group_name?: string;
  show_pvalue?: boolean;
  show_smd?: boolean;
}

export interface Table1Row {
  variable: string;
  indent: boolean;
  overall: string;
  groups: Record<string, string> | null;
  p_value: string | null;
  test_name: string | null;
  smd: string | null;
  missing: number;
  missing_by_group: Record<string, number> | null;
}

export interface Table1Result {
  rows: Table1Row[];
  group_names: string[] | null;
  n_overall: number;
  n_by_group: Record<string, number> | null;
  group_missing: number;
}

// --- 回帰分析 ---

export interface RegressionPredictor {
  name: string;
  values: (number | null)[];
}

export interface LinearRegressionRequest {
  outcome_name?: string;
  outcome: (number | null)[];
  predictors: RegressionPredictor[];
}

export interface RegressionCoefficient {
  name: string;
  coef: number;
  std_err: number;
  t_value: number;
  p_value: number;
  ci95_low: number;
  ci95_high: number;
  std_coef: number | null;
}

export interface LinearRegressionResult {
  outcome_name: string;
  coefficients: RegressionCoefficient[];
  n_total: number;
  n_used: number;
  n_excluded: number;
  df_model: number;
  df_resid: number;
  r_squared: number;
  adj_r_squared: number;
  f_statistic: number;
  f_pvalue: number;
  interpretation: string;
}

// --- グラフ ---

export interface KaplanMeierRequest {
  times: number[];
  events: number[];
  group_labels?: (string | null)[] | null;
  title?: string;
  time_label?: string;
  survival_label?: string;
  show_ci?: boolean;
  show_risk_table?: boolean;
}

export interface BarplotRequest {
  groups: number[][];
  group_names?: string[];
  title?: string;
  y_label?: string;
  error_type?: "sd" | "sem" | "ci95";
}

export interface BoxplotRequest {
  groups: number[][];
  group_names?: string[];
  title?: string;
  y_label?: string;
  show_jitter?: boolean;
  display_style?: "auto" | "simple" | "distribution" | "individual";
  color_mode?: "color" | "monochrome";
  show_n?: boolean;
  show_grid?: boolean;
  y_min?: number | null;
  y_max?: number | null;
  show_comparison?: boolean;
  comparison_method?: "parametric" | "nonparametric";
}

export interface BoxplotPairComparison {
  group_a: string;
  group_b: string;
  p_value: number;
  significant: boolean;
}

export interface BoxplotComparisonResult {
  method: string;
  omnibus_p_value: number | null;
  effect_size: number | null;
  effect_size_label: string | null;
  pairs: BoxplotPairComparison[];
  note: string;
}

export interface BoxplotResult {
  figure: PlotlyFigure;
  comparison: BoxplotComparisonResult | null;
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

export interface PairedPlotRequest {
  before: number[];
  after: number[];
  before_label?: string;
  after_label?: string;
  title?: string;
  y_label?: string;
}

export interface PlotlyFigure {
  data: Record<string, unknown>[];
  layout: Record<string, unknown>;
}

export interface ROCRequest {
  scores: number[];
  labels: number[];
  title?: string;
  score_label?: string;
}

export interface ROCResponse {
  fpr: number[];
  tpr: number[];
  thresholds: number[];
  auc: number;
  auc_ci_lower: number;
  auc_ci_upper: number;
  optimal_threshold: number;
  optimal_fpr: number;
  optimal_tpr: number;
  n_pos: number;
  n_neg: number;
  interpretation: string;
}

export interface ROCResult {
  figure: PlotlyFigure;
  stats: ROCResponse;
}

export interface ExportRequest {
  chart_type: "boxplot" | "histogram" | "scatter" | "paired" | "barplot" | "kaplan_meier" | "roc";
  format: "png" | "svg" | "pdf";
  transparent?: boolean;
  font_preset?: "論文標準" | "日本語対応" | "ポスター" | "カスタム" | null;
  font_family?: string | null;
  font_size?: number | null;
  width_inches?: number | null;
  height_inches?: number | null;
  boxplot?: BoxplotRequest;
  histogram?: HistogramRequest;
  scatter?: ScatterRequest;
  paired?: PairedPlotRequest;
  barplot?: BarplotRequest;
  kaplan_meier?: KaplanMeierRequest;
  roc?: ROCRequest;
}

export interface GraphHandoff {
  chart_type: "boxplot" | "scatter" | "paired";
  value_column?: string;
  group_column?: string;
  included_groups?: string[];
  before_column?: string;
  after_column?: string;
  x_column?: string;
  y_column?: string;
  comparison_method?: "parametric" | "nonparametric";
  title?: string;
  method_text?: string;
  caption_text?: string;
}
