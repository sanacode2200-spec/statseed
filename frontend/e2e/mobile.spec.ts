import { expect, test } from "playwright/test";

test("モバイルナビを開き、遷移後に閉じられる", async ({ page }) => {
  await page.goto("/dashboard");

  const openButton = page.getByRole("button", { name: "メニューを開く" });
  await openButton.click();

  const drawer = page.getByRole("dialog", { name: "ナビゲーション" });
  await expect(drawer).toBeVisible();
  await expect(openButton).toHaveAttribute("aria-expanded", "true");

  await drawer.getByRole("link", { name: "Descriptive" }).click();
  await expect(page).toHaveURL(/\/dashboard\/descriptive$/);
  await expect(drawer).not.toBeVisible();
  await expect(openButton).toHaveAttribute("aria-expanded", "false");
});
