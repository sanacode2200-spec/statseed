import { expect, test } from "playwright/test";

test("モバイルナビを開き、遷移後に閉じられる", async ({ page }) => {
  await page.goto("/dashboard");

  const openButton = page.getByRole("button", { name: "メニューを開く" });
  await openButton.click();

  const drawer = page.getByRole("dialog", { name: "ナビゲーション" });
  await expect(drawer).toBeVisible();
  await expect(openButton).toHaveAttribute("aria-expanded", "true");

  await drawer.getByRole("link", { name: "データを要約" }).click();
  await expect(page).toHaveURL(/\/dashboard\/descriptive$/);
  await expect(drawer).not.toBeVisible();
  await expect(openButton).toHaveAttribute("aria-expanded", "false");
});

test("モバイルヘッダーからテーマを切り替えられる", async ({ page }) => {
  await page.goto("/dashboard");

  const themeButton = page.getByRole("button", { name: "ライトモードに切り替える" });
  await themeButton.click();

  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await expect.poll(() => page.evaluate(() => localStorage.getItem("theme"))).toBe("light");
  await expect(page.getByRole("button", { name: "ダークモードに切り替える" })).toBeVisible();
});
