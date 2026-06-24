import path from "node:path";
import type { Page } from "playwright/test";
import { expect, test } from "playwright/test";

const sampleCsv = path.resolve(process.cwd(), "../sample-data/01_rehab_pre_post.csv");

function selectNearLabel(page: Page, label: string) {
  return page.locator("label", { hasText: label }).locator("..").locator("select");
}

test("手入力から記述統計を実行できる", async ({ page }) => {
  await page.goto("/dashboard/descriptive");

  await page.locator("label", { hasText: "変数名" }).locator("..").locator("input").fill("歩行速度");
  await page.locator("textarea").fill("1.0\n1.2\n1.4\nNA\n1.8");
  await page.getByRole("button", { name: "解析する" }).click();

  await expect(page.getByRole("columnheader", { name: "歩行速度" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "4 件" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "1 件" })).toBeVisible();
  await expect(page.getByText("解釈", { exact: true })).toBeVisible();
});

test("データ読み込みのドロップゾーンをキーボードで操作できる", async ({ page }) => {
  await page.goto("/dashboard/data");

  const dropzone = page.getByRole("button", {
    name: "クリックまたはドラッグ＆ドロップでCSV・Excelファイルを選択",
  });
  await expect(dropzone).toBeVisible();

  const [chooser] = await Promise.all([
    page.waitForEvent("filechooser"),
    dropzone.focus().then(() => page.keyboard.press("Enter")),
  ]);
  await chooser.setFiles(sampleCsv);

  await expect(page.getByRole("heading", { name: "01_rehab_pre_post.csv" })).toBeVisible();
});

test("CSV読込から対応あり検定を実行しグラフへ引き継げる", async ({ page }) => {
  await page.goto("/dashboard/data");
  await page.locator('input[type="file"]').setInputFiles(sampleCsv);

  await expect(page.getByRole("heading", { name: "01_rehab_pre_post.csv" })).toBeVisible();
  await expect(page.getByText("このタブ内だけに保存中")).toBeVisible();
  await expect(page.getByText("個人識別情報を含む可能性があります")).toBeVisible();

  await page.getByRole("link", { name: "群の差・関連" }).click();
  await selectNearLabel(page, "検定の種類").selectOption("ttest-paired");
  await selectNearLabel(page, "介入前の列").selectOption("FIM_介入前");
  await selectNearLabel(page, "介入後の列").selectOption("FIM_介入後");
  await page.getByRole("button", { name: "検定を実行" }).click();

  await expect(page.getByRole("heading", { name: "対応のあるt検定" })).toBeVisible();
  await expect(page.getByText("解析使用")).toBeVisible();
  await expect(page.getByRole("button", { name: "この結果からグラフを作成" })).toBeVisible();

  await page.getByRole("button", { name: "この結果からグラフを作成" }).click();
  await expect(page).toHaveURL(/\/dashboard\/graph$/);
  await expect(page.getByRole("heading", { name: "グラフ作成" })).toBeVisible();
  await expect(page.locator("label", { hasText: "タイトル（任意）" }).locator("..").locator("input"))
    .toHaveValue("FIM_介入前 と FIM_介入後 の対応あり比較");
  await expect(selectNearLabel(page, "介入前・1時点目")).toHaveValue("FIM_介入前");
  await expect(selectNearLabel(page, "介入後・2時点目")).toHaveValue("FIM_介入後");

  await page.getByRole("button", { name: "グラフを描画" }).click();
  await expect(page.locator(".plot-container")).toBeVisible();
  await expect(page.getByText("解析使用")).toBeVisible();
});
