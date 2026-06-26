/**
 * graph-edit の凡例デモ（06〜11）を、凡例が実際に表示される
 * カプランマイヤー曲線で撮り直す補助スクリプト。
 * グループ箱ひげ図は凡例を持たないため、凡例表示/非表示・位置の違いが出ない。
 *
 * 実行: MANUAL_HEADLESS=1 NODE_PATH=frontend/node_modules node scripts/capture-legend-fix.ts
 */
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.resolve(__dirname, "..");
const BASE = process.env.MANUAL_BASE_URL || "https://statseed.vercel.app";
const HEADLESS = process.env.MANUAL_HEADLESS === "1";
const SHOTS = path.join(ROOT, "screenshots", "manual", "graph-edit");
const KM = path.join(ROOT, "sample-data", "05_survival_followup.csv");

async function settle(page: any, ms = 1000) {
  try { await page.waitForLoadState("networkidle", { timeout: 15000 }); } catch {}
  await page.waitForTimeout(ms);
}
async function shot(page: any, name: string) {
  fs.mkdirSync(SHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SHOTS, name), fullPage: true });
  console.log("  📸 graph-edit/" + name);
}

async function main() {
  const browser = await chromium.launch({ headless: HEADLESS, args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, locale: "ja-JP" });
  const page = await ctx.newPage();
  page.setDefaultTimeout(30000);

  // upload KM data
  await page.goto(BASE + "/dashboard/data", { waitUntil: "domcontentloaded" });
  await settle(page, 900);
  await page.locator('input[type="file"]').setInputFiles(KM);
  try { await page.getByRole("heading", { name: "05_survival_followup.csv" }).waitFor({ timeout: 60000 }); } catch {}
  await settle(page, 1200);

  // draw KM
  await page.goto(BASE + "/dashboard/graph", { waitUntil: "domcontentloaded" });
  await settle(page, 900);
  const csvBtn = page.getByRole("button", { name: "CSVから選択" });
  if (await csvBtn.count()) { await csvBtn.first().click(); await page.waitForTimeout(300); }
  await page.getByRole("button", { name: "カプランマイヤー", exact: true }).first().click();
  await page.waitForTimeout(500);
  for (const [id, v] of [["#km-time-col", "観察期間_日"], ["#km-event-col", "イベント発生"], ["#km-group-col", "群"]] as const) {
    const loc = page.locator(id);
    if (await loc.count()) { try { await loc.selectOption(v); } catch {} await page.waitForTimeout(250); }
  }
  await page.getByRole("button", { name: "グラフを描画" }).click();
  try { await page.locator(".plot-container").first().waitFor({ timeout: 60000 }); } catch {}
  await settle(page, 1400);

  // expand スタイル
  const styleBtn = page.locator("button[aria-expanded]").filter({ hasText: "スタイル" }).first();
  if (await styleBtn.count() && (await styleBtn.getAttribute("aria-expanded")) === "false") { await styleBtn.click(); await page.waitForTimeout(350); }

  // legend hide / show
  const legend = page.getByRole("switch", { name: "凡例を表示" });
  if (await legend.count()) {
    if ((await legend.getAttribute("aria-checked")) === "true") { await legend.click(); await page.waitForTimeout(700); }
    await shot(page, "06_legend_hidden.png");
    await legend.click(); await page.waitForTimeout(700);
    await shot(page, "07_legend_shown.png");
  }

  // legend positions
  const positions: [string, string][] = [
    ["右上", "08_legend_top_right.png"],
    ["右下", "09_legend_bottom_right.png"],
    ["左上", "10_legend_top_left.png"],
    ["左下", "11_legend_bottom_left.png"],
  ];
  for (const [pos, name] of positions) {
    const sel = page.locator("#graphedit-legend-pos");
    if (await sel.count()) { try { await sel.selectOption(pos); } catch {} await page.waitForTimeout(700); }
    await shot(page, name);
  }

  await browser.close();
  console.log("✅ 凡例デモ撮り直し完了");
}
main().catch((e) => { console.error(e); process.exit(1); });
