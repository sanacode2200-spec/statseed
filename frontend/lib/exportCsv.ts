import type {
  CategoricalResponse,
  CorrelationResult,
  DescriptiveResponse,
  PosthocResult,
  ROCResponse,
  Table1Result,
  TestResult,
} from "./types";

function esc(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

function row(...cells: (string | number | null | undefined)[]): string {
  return cells.map(esc).join(",");
}

function download(csv: string, filename: string) {
  // UTF-8 BOM for Excel Japanese compatibility
  const bom = "﻿";
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportDescriptiveCsv(result: DescriptiveResponse) {
  const fmt = (v: number | null) => (v === null ? "" : v.toFixed(4));
  const lines = [
    row("変数名", "n", "欠損", "平均", "SD", "中央値", "Q1", "Q3", "IQR", "最小", "最大", "95%CI下限", "95%CI上限", "Shapiro-Wilk p値"),
    row(
      result.variable_name,
      result.n,
      result.missing,
      fmt(result.mean),
      fmt(result.sd),
      fmt(result.median),
      fmt(result.q1),
      fmt(result.q3),
      fmt(result.iqr),
      fmt(result.minimum),
      fmt(result.maximum),
      fmt(result.ci95_low),
      fmt(result.ci95_high),
      result.shapiro_wilk_p === null ? "" : result.shapiro_wilk_p.toFixed(4),
    ),
  ];
  download(lines.join("\n"), `descriptive_${result.variable_name}.csv`);
}

export function exportCategoricalCsv(result: CategoricalResponse) {
  const lines = [
    row("変数名", "カテゴリ", "件数", "割合(%)"),
    ...result.categories.map((c) =>
      row(result.variable_name, c.label, c.count, c.percent.toFixed(2))
    ),
  ];
  download(lines.join("\n"), `categorical_${result.variable_name}.csv`);
}

export function exportTestResultCsv(result: TestResult) {
  const fmt = (v: number | null) => (v === null ? "" : v.toFixed(4));
  const lines = [
    row("検定名", "統計量", "p値", "効果量", "効果量の種類", "95%CI下限", "95%CI上限"),
    row(
      result.test_name,
      fmt(result.statistic),
      result.p_value.toFixed(4),
      fmt(result.effect_size),
      result.effect_size_label ?? "",
      fmt(result.ci95_low),
      fmt(result.ci95_high),
    ),
  ];
  download(lines.join("\n"), `test_result.csv`);
}

export function exportCorrelationCsv(result: CorrelationResult) {
  const fmt = (v: number | null) => (v === null ? "" : v.toFixed(4));
  const lines = [
    row("手法", "相関係数(r)", "p値", "n", "95%CI下限", "95%CI上限"),
    row(
      result.method,
      result.r.toFixed(4),
      result.p_value.toFixed(4),
      result.n,
      fmt(result.ci95_low),
      fmt(result.ci95_high),
    ),
  ];
  download(lines.join("\n"), `correlation_${result.method}.csv`);
}

export function exportPosthocCsv(result: PosthocResult) {
  const hasParam = result.pairs.some((p) => p.mean_diff !== null);
  const header = hasParam
    ? row("群A", "群B", "平均(A)", "平均(B)", "平均差(A-B)", "p値(補正前)", "p値(補正後)", "有意")
    : row("群A", "群B", "p値(補正前)", "p値(補正後)", "有意");

  const dataRows = result.pairs.map((p) => {
    const sig = p.significant ? "有意" : "n.s.";
    if (hasParam) {
      return row(
        p.group_a, p.group_b,
        p.mean_a?.toFixed(4) ?? "",
        p.mean_b?.toFixed(4) ?? "",
        p.mean_diff?.toFixed(4) ?? "",
        p.p_raw.toFixed(4),
        p.p_adjusted.toFixed(4),
        sig,
      );
    }
    return row(p.group_a, p.group_b, p.p_raw.toFixed(4), p.p_adjusted.toFixed(4), sig);
  });

  download([header, ...dataRows].join("\n"), `posthoc_${result.method}.csv`);
}

export function exportTable1Csv(result: Table1Result) {
  const cols = result.group_names
    ? ["変数", "全体", ...result.group_names, "p値", "検定"]
    : ["変数", "全体"];

  const headerN = result.group_names
    ? ["", `n = ${result.n_overall}`, ...result.group_names.map((g) => `n = ${result.n_by_group?.[g] ?? ""}`), "", ""]
    : ["", `n = ${result.n_overall}`];

  const dataRows = result.rows.map((r) => {
    const label = r.indent ? `  ${r.variable}` : r.variable;
    const cells: (string | null)[] = [label, r.overall];
    if (result.group_names) {
      for (const g of result.group_names) cells.push(r.groups?.[g] ?? "");
      cells.push(r.indent ? "" : (r.p_value ?? ""));
      cells.push(r.indent ? "" : (r.test_name ?? ""));
    }
    return cells.map(esc).join(",");
  });

  download(
    [cols.map(esc).join(","), headerN.map(esc).join(","), ...dataRows].join("\n"),
    "table1.csv",
  );
}

export function exportRocCsv(stats: ROCResponse, fpr: number[], tpr: number[], thresholds: number[]) {
  const lines = [
    row("閾値", "感度(TPR)", "1-特異度(FPR)"),
    ...thresholds.map((t, i) => row(t.toFixed(6), tpr[i].toFixed(4), fpr[i].toFixed(4))),
  ];
  download(lines.join("\n"), `roc_curve_auc${stats.auc.toFixed(3)}.csv`);
}
