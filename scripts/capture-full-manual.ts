/**
 * StatSeed 完全マニュアル用スクリーンショット自動撮影スクリプト
 *
 * Playwright（headed）で本番環境を操作し、トップ画面〜全機能・全10検定・
 * グラフ編集機能を網羅したスクショを screenshots/manual/{カテゴリ}/{連番}_{説明}.png に保存する。
 *
 * 実行:
 *   NODE_PATH=frontend/node_modules node scripts/capture-full-manual.ts
 *   （対象URLを変える場合）MANUAL_BASE_URL=http://127.0.0.1:3100 ... で上書き
 *   （ヘッドレスにする場合）MANUAL_HEADLESS=1 ...
 *
 * サンプルデータ: verify/data/ の検定別ダミーCSV（カイ二乗/Fisherは行列のため手入力）。
 *                KM・ROCは verify/data に該当が無いため sample-data/ を使用。
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.MANUAL_BASE_URL || "https://statseed.vercel.app";
const HEADLESS = process.env.MANUAL_HEADLESS === "1";
const SHOTS = path.join(ROOT, "screenshots", "manual");
const VERIFY = path.join(ROOT, "verify", "data");
const SAMPLE = path.join(ROOT, "sample-data");

const log = (m: string) => console.log(m);
const warns: string[] = [];
const warn = (m: string) => { warns.push(m); console.log("  ⚠️  " + m); };

async function settle(page: any, ms = 1000) {
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch {}
  await page.waitForTimeout(ms);
}

async function shot(page: any, cat: string, name: string, full = true) {
  const dir = path.join(SHOTS, cat);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name.endsWith(".png") ? name : name + ".png");
  await page.screenshot({ path: file, fullPage: full });
  log(`  📸 ${cat}/${path.basename(file)}`);
}

async function sel(page: any, idSelector: string, value: string) {
  const loc = page.locator(idSelector);
  if (await loc.count()) {
    try { await loc.selectOption(value); } catch (e) { warn(`select ${idSelector}=${value}: ${e}`); }
    await page.waitForTimeout(350);
  }
}

async function fill(page: any, selector: string, value: string) {
  const loc = page.locator(selector);
  if (await loc.count()) {
    await loc.first().fill(value);
    await page.waitForTimeout(400);
  }
}

async function clickName(page: any, name: string, exact = true) {
  const b = page.getByRole("button", { name, exact });
  if (await b.count() && await b.first().isVisible()) {
    await b.first().click();
    await page.waitForTimeout(400);
    return true;
  }
  return false;
}

async function expand(page: any, title: string) {
  const b = page.locator("button[aria-expanded]").filter({ hasText: title }).first();
  if (await b.count()) {
    if ((await b.getAttribute("aria-expanded")) === "false") {
      await b.click();
      await page.waitForTimeout(350);
    }
  }
}

async function upload(page: any, file: string) {
  const name = path.basename(file);
  await page.goto(BASE + "/dashboard/data", { waitUntil: "domcontentloaded" });
  await settle(page, 900);
  await page.locator('input[type="file"]').setInputFiles(file);
  try {
    await page.getByRole("heading", { name }).waitFor({ timeout: 60000 });
  } catch {
    warn(`upload heading not found for ${name}`);
  }
  await settle(page, 1400);
  return name;
}

/** 検定結果が出るまで待つ（結果ブロックの「CSVダウンロード」を目印に） */
async function waitTestResult(page: any) {
  try {
    await page.getByText("CSVダウンロード", { exact: false }).first().waitFor({ timeout: 60000 });
  } catch {
    warn("test result did not appear within timeout");
  }
  await settle(page, 900);
}

// ---------------------------------------------------------------------------
// A. 基本操作（getting-started）
// ---------------------------------------------------------------------------
async function captureGettingStarted(page: any) {
  log("\n▶ A. 基本操作（getting-started）");
  try {
    await page.goto(BASE + "/dashboard", { waitUntil: "domcontentloaded" });
    await settle(page, 1200);
    await shot(page, "getting-started", "01_dashboard");

    await page.goto(BASE + "/dashboard/data", { waitUntil: "domcontentloaded" });
    await settle(page, 1000);
    await shot(page, "getting-started", "02_upload_empty");

    // 個人情報警告・欠損・列役割が一通り出る sample-data/01 を使用
    await page.locator('input[type="file"]').setInputFiles(path.join(SAMPLE, "01_rehab_pre_post.csv"));
    try { await page.getByRole("heading", { name: "01_rehab_pre_post.csv" }).waitFor({ timeout: 60000 }); } catch {}
    await settle(page, 1500);
    await shot(page, "getting-started", "03_uploaded_overview");

    // 列の役割（解析上の役割）カードを要素単位でも撮る
    const summary = page.getByRole("heading", { name: "01_rehab_pre_post.csv" }).locator("xpath=ancestor::div[contains(@class,'rounded')][1]");
    try { await summary.first().screenshot({ path: path.join(SHOTS, "getting-started", "04_column_roles.png") }); log("  📸 getting-started/04_column_roles.png"); }
    catch { await shot(page, "getting-started", "04_column_roles"); }

    // データプレビュー表
    const preview = page.getByText(/先頭 \d+ 行/).locator("xpath=ancestor::div[contains(@class,'rounded')][1]");
    try { await preview.first().scrollIntoViewIfNeeded(); await preview.first().screenshot({ path: path.join(SHOTS, "getting-started", "05_preview_table.png") }); log("  📸 getting-started/05_preview_table.png"); }
    catch { await shot(page, "getting-started", "05_preview_table"); }
  } catch (e) {
    warn(`getting-started failed: ${e}`);
  }
}

// ---------------------------------------------------------------------------
// B. 10検定
// ---------------------------------------------------------------------------
type TestCfg = {
  cat: string;
  csv?: string;            // アップロードするCSV（CSVモード）
  testType?: string;       // #test-type の値
  cols?: Record<string, string>; // selector -> value
  manualTable?: string;    // カイ二乗/Fisher: 手入力クロス集計表
  regression?: boolean;    // 重回帰（回帰ページ）
  predictors?: string[];   // 重回帰の説明変数列
};

const TESTS: TestCfg[] = [
  { cat: "welch", csv: path.join(VERIFY, "two_groups.csv"), testType: "ttest",
    cols: { "#test-value-col": "value", "#test-group-col": "group", "#test-group-a": "A", "#test-group-b": "B" } },
  { cat: "paired-t", csv: path.join(VERIFY, "paired.csv"), testType: "ttest-paired",
    cols: { "#test-before-col": "pre", "#test-after-col": "post" } },
  { cat: "mannwhitney", csv: path.join(VERIFY, "two_groups.csv"), testType: "mannwhitney",
    cols: { "#test-value-col": "value", "#test-group-col": "group", "#test-group-a": "A", "#test-group-b": "B" } },
  { cat: "wilcoxon", csv: path.join(VERIFY, "paired.csv"), testType: "wilcoxon",
    cols: { "#test-before-col": "pre", "#test-after-col": "post" } },
  { cat: "chisquare", testType: "chisquare", manualTable: "30 14 6\n12 22 18" },
  { cat: "fisher", testType: "fisher", manualTable: "8 2\n3 9" },
  { cat: "pearson", csv: path.join(VERIFY, "correlation.csv"), testType: "pearson",
    cols: { "#test-x-col": "x", "#test-y-col": "y" } },
  { cat: "spearman", csv: path.join(VERIFY, "correlation.csv"), testType: "spearman",
    cols: { "#test-x-col": "x", "#test-y-col": "y" } },
  { cat: "anova", csv: path.join(VERIFY, "anova.csv"), testType: "anova",
    cols: { "#test-value-col": "value", "#test-group-col": "group" } },
  { cat: "regression", csv: path.join(VERIFY, "regression.csv"), regression: true, predictors: ["x1", "x2", "x3"] },
];

async function captureTest(page: any, cfg: TestCfg) {
  log(`\n▶ B. 検定: ${cfg.cat}`);
  try {
    if (cfg.regression) return await captureRegression(page, cfg);

    if (cfg.csv) {
      // データ確認
      await upload(page, cfg.csv);
      await shot(page, cfg.cat, "01_data_check");

      await page.goto(BASE + "/dashboard/test", { waitUntil: "domcontentloaded" });
      await settle(page, 900);
      await clickName(page, "CSVから選択");
      await sel(page, "#test-type", cfg.testType!);
      await settle(page, 600);
      for (const [s, v] of Object.entries(cfg.cols || {})) await sel(page, s, v);
      await settle(page, 500);
      await shot(page, cfg.cat, "02_select");
    } else {
      // カイ二乗 / Fisher: 手入力クロス集計表
      await page.goto(BASE + "/dashboard/test", { waitUntil: "domcontentloaded" });
      await settle(page, 900);
      await clickName(page, "手入力"); // データが残っていてもマニュアル入力へ
      await sel(page, "#test-type", cfg.testType!);
      await settle(page, 500);
      await fill(page, "#test-cross-table", cfg.manualTable!);
      await shot(page, cfg.cat, "01_data_check");
      await shot(page, cfg.cat, "02_select");
    }

    await page.getByRole("button", { name: "検定を実行" }).click();
    await waitTestResult(page);
    await shot(page, cfg.cat, "03_result");
  } catch (e) {
    warn(`test ${cfg.cat} failed: ${e}`);
  }
}

async function captureRegression(page: any, cfg: TestCfg) {
  await upload(page, cfg.csv!);
  await shot(page, cfg.cat, "01_data_check");

  await page.goto(BASE + "/dashboard/regression", { waitUntil: "domcontentloaded" });
  await settle(page, 900);
  await clickName(page, "CSVから選択");
  await clickName(page, "線形回帰");
  await settle(page, 500);
  // 説明変数チェックボックス（ラベル内のテキストで特定）
  for (const p of cfg.predictors || []) {
    const lbl = page.locator("label").filter({ hasText: p }).first();
    if (await lbl.count()) {
      const cb = lbl.locator('input[type="checkbox"]');
      if (!(await cb.isChecked())) await cb.check();
      await page.waitForTimeout(250);
    }
  }
  await shot(page, cfg.cat, "02_select");

  await page.getByRole("button", { name: "回帰分析を実行" }).click();
  try { await page.getByText("結果の解釈").first().waitFor({ timeout: 60000 }); } catch { warn("regression result timeout"); }
  await settle(page, 900);
  await shot(page, cfg.cat, "03_result");
}

// ---------------------------------------------------------------------------
// C. グラフ編集（graph-edit）
// ---------------------------------------------------------------------------
async function drawGraph(page: any, opts: { chartLabel: string; selects?: Record<string, string>; preClick?: () => Promise<void> }) {
  await clickName(page, "CSVから選択");
  // グラフ種別ボタン
  const tb = page.getByRole("button", { name: opts.chartLabel, exact: true });
  if (await tb.count()) { await tb.first().click(); await page.waitForTimeout(500); }
  for (const [s, v] of Object.entries(opts.selects || {})) await sel(page, s, v);
  if (opts.preClick) await opts.preClick();
  await page.getByRole("button", { name: "グラフを描画" }).click();
  try { await page.locator(".plot-container").first().waitFor({ timeout: 60000 }); } catch { warn(`draw ${opts.chartLabel} timeout`); }
  await settle(page, 1400);
}

async function captureGraphEdit(page: any) {
  log("\n▶ C. グラフ編集（graph-edit）");
  try {
    await upload(page, path.join(VERIFY, "anova.csv"));
    await page.goto(BASE + "/dashboard/graph", { waitUntil: "domcontentloaded" });
    await settle(page, 900);
    await drawGraph(page, { chartLabel: "箱ひげ図", selects: { "#boxplot-value-col": "value", "#boxplot-group-col": "group" } });
    await shot(page, "graph-edit", "01_default");

    // タイトル編集
    await expand(page, "テキスト");
    await fill(page, "#graphedit-title", "群ごとのスコア分布");
    await shot(page, "graph-edit", "02_title");

    // 軸ラベル
    await expand(page, "軸");
    await fill(page, "#graphedit-x-label", "群");
    await shot(page, "graph-edit", "03_x_label");
    await fill(page, "#graphedit-y-label", "スコア (点)");
    await shot(page, "graph-edit", "04_y_label");

    // 軸範囲（Y）
    await fill(page, 'input[aria-label="Y軸の最小値"]', "0");
    await fill(page, 'input[aria-label="Y軸の最大値"]', "40");
    await shot(page, "graph-edit", "05_axis_range");

    // 凡例表示/非表示
    await expand(page, "スタイル");
    const legendToggle = page.getByRole("switch", { name: "凡例を表示" });
    if (await legendToggle.count()) {
      if ((await legendToggle.getAttribute("aria-checked")) === "true") { await legendToggle.click(); await page.waitForTimeout(600); }
      await shot(page, "graph-edit", "06_legend_hidden");
      await legendToggle.click(); await page.waitForTimeout(600); // 再表示
      await shot(page, "graph-edit", "07_legend_shown");
    }

    // 凡例位置
    const positions: [string, string][] = [
      ["右上", "08_legend_top_right"],
      ["右下", "09_legend_bottom_right"],
      ["左上", "10_legend_top_left"],
      ["左下", "11_legend_bottom_left"],
    ];
    for (const [pos, name] of positions) {
      await sel(page, "#graphedit-legend-pos", pos);
      await page.waitForTimeout(600);
      await shot(page, "graph-edit", name);
    }

    // 直接編集モード
    const direct = page.getByRole("switch", { name: "グラフを直接編集" });
    if (await direct.count()) { await direct.click(); await page.waitForTimeout(600); await shot(page, "graph-edit", "12_direct_edit"); await direct.click(); await page.waitForTimeout(400); }
  } catch (e) {
    warn(`graph-edit failed: ${e}`);
  }
}

// ---------------------------------------------------------------------------
// C-8. グラフ種別（charts）
// ---------------------------------------------------------------------------
async function captureCharts(page: any) {
  log("\n▶ C-8. グラフ種別（charts）");
  const go = async (csv: string) => {
    await upload(page, csv);
    await page.goto(BASE + "/dashboard/graph", { waitUntil: "domcontentloaded" });
    await settle(page, 900);
  };
  try {
    await go(path.join(VERIFY, "anova.csv"));
    await drawGraph(page, { chartLabel: "箱ひげ図", selects: { "#boxplot-value-col": "value", "#boxplot-group-col": "group" } });
    await shot(page, "charts", "01_boxplot");
    // 白黒（モノクロ印刷向け）
    const mono = page.getByRole("button", { name: "白黒", exact: true });
    if (await mono.count()) { await mono.first().click(); await page.waitForTimeout(300); await page.getByRole("button", { name: "グラフを描画" }).click(); await settle(page, 1200); await shot(page, "charts", "02_boxplot_monochrome"); }

    await go(path.join(VERIFY, "anova.csv"));
    await drawGraph(page, { chartLabel: "棒グラフ", selects: { "#bar-value-col": "value", "#bar-group-col": "group" } });
    await shot(page, "charts", "03_barplot");

    await go(path.join(VERIFY, "correlation.csv"));
    await drawGraph(page, { chartLabel: "散布図", selects: { "#scatter-x-col": "x", "#scatter-y-col": "y" } });
    await shot(page, "charts", "04_scatter");

    await go(path.join(SAMPLE, "07_histogram_large_normal.csv"));
    await drawGraph(page, { chartLabel: "ヒストグラム", selects: { "#hist-col": "握力_kg" } });
    await shot(page, "charts", "05_histogram");

    await go(path.join(VERIFY, "paired.csv"));
    await drawGraph(page, { chartLabel: "対応ありプロット", selects: { "#paired-before-col": "pre", "#paired-after-col": "post" } });
    await shot(page, "charts", "06_paired");

    await go(path.join(SAMPLE, "05_survival_followup.csv"));
    await drawGraph(page, { chartLabel: "カプランマイヤー", selects: { "#km-time-col": "観察期間_日", "#km-event-col": "イベント発生", "#km-group-col": "群" } });
    await shot(page, "charts", "07_kaplan_meier");

    await go(path.join(SAMPLE, "06_roc_diagnostic.csv"));
    await drawGraph(page, { chartLabel: "ROC曲線", selects: { "#roc-score-col": "TUGテスト_秒", "#roc-label-col": "転倒歴_有無" } });
    await shot(page, "charts", "08_roc");
  } catch (e) {
    warn(`charts failed: ${e}`);
  }
}

// ---------------------------------------------------------------------------
// C-9 / D. エクスポート・自動生成文（export）
// ---------------------------------------------------------------------------
async function refreshOutput(page: any) {
  const btn = page.getByRole("button", { name: "編集を反映して更新" });
  if (await btn.count()) { await btn.first().click(); }
  try { await page.getByRole("img", { name: "最終出力プレビュー" }).waitFor({ timeout: 60000 }); } catch { warn("export preview timeout"); }
  await settle(page, 1000);
}

async function captureExport(page: any) {
  log("\n▶ C-9 / D. エクスポート・自動生成文（export）");
  try {
    await upload(page, path.join(VERIFY, "anova.csv"));
    await page.goto(BASE + "/dashboard/graph", { waitUntil: "domcontentloaded" });
    await settle(page, 900);
    await drawGraph(page, { chartLabel: "箱ひげ図", selects: { "#boxplot-value-col": "value", "#boxplot-group-col": "group" } });

    // 図注・方法文（自動生成）
    const caption = page.getByText("図注", { exact: true }).locator("xpath=ancestor::div[contains(@class,'border-t')][1]");
    try { await caption.first().scrollIntoViewIfNeeded(); await caption.first().screenshot({ path: path.join(SHOTS, "export", "01_caption_method.png") }); log("  📸 export/01_caption_method.png"); }
    catch { await shot(page, "export", "01_caption_method"); }

    // 最終出力（matplotlib 300dpi）に切替
    await clickName(page, "最終出力");
    try { await page.getByRole("img", { name: "最終出力プレビュー" }).waitFor({ timeout: 60000 }); } catch { warn("output preview timeout"); }
    await settle(page, 1200);
    await shot(page, "export", "02_output_png_single");

    // 出力・エクスポートセクションを開く
    await expand(page, "出力・エクスポート");
    await shot(page, "export", "03_export_panel");

    // 用途プリセット: 論文2段組
    await clickName(page, "論文2段組");
    await refreshOutput(page);
    await shot(page, "export", "04_output_double");

    // 用途プリセット: 16:9スライド
    await clickName(page, "16:9スライド");
    await refreshOutput(page);
    await shot(page, "export", "05_output_slide");

    // 形式: SVG
    await clickName(page, "論文1段組");
    await clickName(page, "SVG");
    await refreshOutput(page);
    await shot(page, "export", "06_output_svg");

    // 形式: PDF（プレビュー不可メッセージ）
    await clickName(page, "PDF");
    await page.waitForTimeout(800);
    await shot(page, "export", "07_output_pdf");
  } catch (e) {
    warn(`export failed: ${e}`);
  }
}

// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(SHOTS, { recursive: true });
  log(`StatSeed マニュアル撮影`);
  log(`  対象URL : ${BASE}`);
  log(`  headless: ${HEADLESS}`);
  log(`  出力先  : ${SHOTS}`);

  const browser = await chromium.launch({ headless: HEADLESS, args: ["--no-sandbox"] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: "ja-JP" });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  try {
    await captureGettingStarted(page);
    for (const cfg of TESTS) await captureTest(page, cfg);
    await captureGraphEdit(page);
    await captureCharts(page);
    await captureExport(page);
  } finally {
    await browser.close();
  }

  log("\n✅ 撮影完了");
  if (warns.length) {
    log(`\n⚠️  警告 ${warns.length} 件:`);
    for (const w of warns) log("  - " + w);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
