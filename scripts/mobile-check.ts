/**
 * StatSeed モバイル品質確認スクリプト
 *
 * iPhone 14 (375x812) / iPad (768x1024) で本番環境を操作し、
 * レイアウト崩れ・操作性・スクロール動作を確認する。
 * スクリーンショットは screenshots/mobile/{iphone,ipad}/ に保存。
 *
 * 実行:
 *   NODE_PATH=frontend/node_modules node scripts/mobile-check.ts
 *   （ヘッドレス無効）MOBILE_HEADLESS=0 node scripts/mobile-check.ts
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.MOBILE_BASE_URL || "https://statseed.vercel.app";
const HEADLESS = process.env.MOBILE_HEADLESS !== "0";
const OUT = path.join(ROOT, "screenshots", "mobile");

const DEVICES = [
  { name: "iphone", width: 375, height: 812, dpr: 3 },
  { name: "ipad",   width: 768, height: 1024, dpr: 2 },
];

const issues: string[] = [];
const log = (m: string) => console.log(m);
const warn = (msg: string) => { issues.push(msg); console.log("  ⚠️  " + msg); };

async function settle(page: any, ms = 1200) {
  try { await page.waitForLoadState("networkidle", { timeout: 20000 }); } catch {}
  await page.waitForTimeout(ms);
}

async function shot(page: any, device: string, name: string) {
  const dir = path.join(OUT, device);
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, name.endsWith(".png") ? name : name + ".png");
  await page.screenshot({ path: file, fullPage: true });
  log(`  📸 ${device}/${path.basename(file)}`);
}

async function checkScrollable(page: any, selector: string, label: string, device: string) {
  const el = page.locator(selector).first();
  if (!await el.count()) {
    warn(`[${device}] ${label}: 要素が見つかりません (${selector})`);
    return;
  }
  const box = await el.boundingBox();
  const scrollW = await el.evaluate((e: Element) => e.scrollWidth);
  if (box && scrollW > box.width + 4) {
    log(`  ✅ [${device}] ${label}: 横スクロール可能 (scrollWidth=${scrollW}, visibleWidth=${Math.round(box.width)})`);
  } else {
    log(`  ✅ [${device}] ${label}: 横スクロール不要（収まっている）`);
  }
}

async function checkPageWidth(page: any, device: string, expected: number, label: string) {
  const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
  if (bodyWidth > expected + 8) {
    warn(`[${device}] ${label}: ページ横幅超過 (body.scrollWidth=${bodyWidth}, expected<=${expected})`);
  } else {
    log(`  ✅ [${device}] ${label}: 横幅OK (scrollWidth=${bodyWidth})`);
  }
}

async function runDevice(browser: any, device: typeof DEVICES[0]) {
  const { name, width, height, dpr } = device;
  log(`\n${"=".repeat(50)}`);
  log(`📱 デバイス: ${name} (${width}x${height} @${dpr}x)`);
  log("=".repeat(50));

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: dpr,
    isMobile: name === "iphone",
    hasTouch: name === "iphone",
    userAgent: name === "iphone"
      ? "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
      : "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });
  const page = await context.newPage();

  // ── 1. ダッシュボードトップ ──
  log("\n[1] ダッシュボードトップ");
  await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await checkPageWidth(page, name, width, "ダッシュボードトップ");
  await shot(page, name, "01_dashboard_top");

  // ── 2. モバイルハンバーガーメニュー（iPhoneのみ） ──
  if (name === "iphone") {
    log("\n[2] ハンバーガーメニュー展開");
    // ハンバーガーボタン（aria-label="メニューを開く"）
    const burger = page.locator('button[aria-label="メニューを開く"]').first();
    const burgerCount = await burger.count();
    if (burgerCount) {
      try {
        await burger.click({ timeout: 5000 });
        await page.waitForTimeout(600);
        await shot(page, name, "02_drawer_open");
        await page.keyboard.press("Escape");
        await page.waitForTimeout(400);
      } catch (e) {
        warn(`[${name}] ハンバーガーメニュークリック失敗: ${e}`);
        await shot(page, name, "02_drawer_failed");
      }
    } else {
      warn(`[${name}] ハンバーガーボタンが見つかりません`);
      await shot(page, name, "02_no_burger");
    }
  } else {
    await shot(page, name, "02_dashboard_sidebar");
  }

  // ── 3. CSVアップロード画面 ──
  log("\n[3] データ読み込み画面");
  await page.goto(`${BASE}/dashboard/data`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await checkPageWidth(page, name, width, "CSVアップロード画面");
  await shot(page, name, "03_upload_page");

  // ファイル選択ボタン確認
  const fileInput = page.locator('input[type="file"]');
  if (await fileInput.count()) {
    log(`  ✅ [${name}] ファイル選択 input[type=file] 存在確認OK`);
  } else {
    warn(`[${name}] ファイル選択 input[type=file] が見つかりません`);
  }

  // ドロップゾーンのキーボード操作確認
  const dropzone = page.locator('[role="button"][tabindex="0"]').first();
  if (await dropzone.count()) {
    log(`  ✅ [${name}] ドロップゾーン role=button 確認OK`);
  } else {
    warn(`[${name}] ドロップゾーンのキーボード操作要素が見つかりません`);
  }

  // ── 4. 記述統計（手入力フォーム確認）──
  log("\n[4] 記述統計フォーム");
  await page.goto(`${BASE}/dashboard/descriptive`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await checkPageWidth(page, name, width, "記述統計");
  await shot(page, name, "04_descriptive");

  // ── 5. 統計検定（Welch t検定）──
  log("\n[5] 統計検定ページ");
  await page.goto(`${BASE}/dashboard/test`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await checkPageWidth(page, name, width, "統計検定");

  // 検定種別セレクト操作
  const testSelect = page.locator('select, [role="combobox"]').first();
  if (await testSelect.count()) {
    log(`  ✅ [${name}] 検定種別セレクト存在確認OK`);
  } else {
    warn(`[${name}] 検定種別セレクトが見つかりません`);
  }

  // グループ入力テキストエリア
  const textarea = page.locator("textarea").first();
  if (await textarea.count()) {
    const box = await textarea.boundingBox();
    if (box && box.width >= 200) {
      log(`  ✅ [${name}] グループ入力テキストエリア幅OK (${Math.round(box.width)}px)`);
    } else {
      warn(`[${name}] テキストエリアが狭すぎます (width=${box ? Math.round(box.width) : "N/A"}px)`);
    }
  }
  await shot(page, name, "05_test_page");

  // ── 6. グラフ作成ページ ──
  log("\n[6] グラフ作成ページ");
  await page.goto(`${BASE}/dashboard/graph`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await checkPageWidth(page, name, width, "グラフ作成ページ");

  // Plotlyグラフエリアの幅確認（140px問題の再発チェック）
  const plotlyDiv = page.locator(".js-plotly-plot, [data-testid='plotly-chart'], .plotly").first();
  if (await plotlyDiv.count()) {
    const plotBox = await plotlyDiv.boundingBox();
    if (plotBox && plotBox.width < 200) {
      warn(`[${name}] Plotlyグラフ幅が異常に狭い (${Math.round(plotBox.width)}px) — flex-col 問題の再発の可能性`);
    } else if (plotBox) {
      log(`  ✅ [${name}] Plotlyグラフ幅OK (${Math.round(plotBox.width)}px)`);
    }
  }
  await shot(page, name, "06_graph_page");

  // ── 7. グラフ編集パネル（データ入力後）──
  log("\n[7] グラフ編集パネル（ヒストグラム手入力）");
  await page.goto(`${BASE}/dashboard/graph`, { waitUntil: "domcontentloaded" });
  await settle(page);

  // ヒストグラムを選択（グラフ種別はボタン群 role="group"、<select>ではない）
  const histBtn = page.locator('[role="group"][aria-label="グラフの種類"] button').filter({ hasText: "ヒストグラム" }).first();
  if (await histBtn.count()) {
    await histBtn.click();
    await page.waitForTimeout(400);
  } else {
    warn(`[${name}] ヒストグラムボタンが見つかりません`);
  }

  // 手入力フォームにデータを入力
  const inputTA = page.locator("textarea").first();
  if (await inputTA.count()) {
    await inputTA.fill("1 2 3 4 5 6 7 8 9 10");
    await page.waitForTimeout(300);
  }

  // 計算ボタンをクリック（グラフを描画）
  const calcBtn = page.locator("button").filter({ hasText: "グラフを描画" }).first();
  if (await calcBtn.count()) {
    await calcBtn.click();
    // 編集パネルの出現を待つ（バックエンドのコールドスタート（Render無料枠）で数十秒かかることがあるため長めに待つ）
    const editSection = page.locator('button').filter({ hasText: /テキスト|軸|スタイル|出力/ }).first();
    await editSection.waitFor({ state: "visible", timeout: 45000 }).catch(() => {});
    await settle(page, 1000);
    await shot(page, name, "07_graph_result");

    if (await editSection.count()) {
      log(`  ✅ [${name}] グラフ編集パネル存在確認OK`);
      await editSection.click().catch(() => {});
      await page.waitForTimeout(400);
      await shot(page, name, "08_graph_edit_panel");
    } else {
      warn(`[${name}] グラフ編集パネルが見つかりません`);
      await shot(page, name, "08_graph_edit_panel_missing");
    }
  } else {
    warn(`[${name}] グラフ描画ボタンが見つかりません`);
    await shot(page, name, "07_graph_no_button");
  }

  // ── 8. Table 1（結果テーブルの横スクロール確認）──
  log("\n[8] Table 1 横スクロール");
  await page.goto(`${BASE}/dashboard/test`, { waitUntil: "domcontentloaded" });
  await settle(page);

  // 手入力でデータを入れて計算実行
  const group1 = page.locator("textarea").nth(0);
  const group2 = page.locator("textarea").nth(1);
  if (await group1.count() && await group2.count()) {
    await group1.fill("10 12 14 16 18 20");
    await group2.fill("8 9 11 13 15 17");
    await page.waitForTimeout(300);
    const runBtn = page.locator("button").filter({ hasText: /検定|計算|実行/ }).first();
    if (await runBtn.count()) {
      await runBtn.click();
      await page.locator("table, [role='table'], .overflow-x-auto").first()
        .waitFor({ state: "visible", timeout: 45000 }).catch(() => {});
      await settle(page, 1000);
      await shot(page, name, "09_test_result");

      // 結果テーブルの横スクロール確認（divベースのテーブルにも対応）
      await checkScrollable(page, "table, [role='table'], .overflow-x-auto", "結果テーブル", name);
    }
  }

  // ── 9. 検定選択ガイド ──
  log("\n[9] 検定選択ガイド");
  await page.goto(`${BASE}/dashboard/guide`, { waitUntil: "domcontentloaded" });
  await settle(page);
  await checkPageWidth(page, name, width, "検定選択ガイド");
  await shot(page, name, "10_guide");

  await context.close();
}

(async () => {
  log("📱 StatSeed モバイル品質確認 開始");
  log(`🎯 対象: ${BASE}`);

  const browser = await chromium.launch({ headless: HEADLESS });

  for (const device of DEVICES) {
    await runDevice(browser, device);
  }

  await browser.close();

  log("\n" + "=".repeat(50));
  if (issues.length === 0) {
    log("✅ 問題なし — モバイル品質チェック完了");
  } else {
    log(`⚠️  ${issues.length}件の問題が見つかりました:`);
    issues.forEach((i, idx) => log(`  ${idx + 1}. ${i}`));
  }
  log("=".repeat(50));
  log(`📁 スクリーンショット: screenshots/mobile/`);
})();
