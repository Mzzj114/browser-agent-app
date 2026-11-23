import { expect, test } from "@playwright/test"

test("lists neutral recorded runs and opens one from the home URL", async ({ page }) => {
  await page.goto("/?lang=en")

  await expect(page.getByRole("heading", { name: "Choose a recorded run", level: 2 })).toBeVisible()
  const links = page.locator(".picker-list a")
  await expect(links).toHaveCount(44)
  await expect(page.locator(".picker-main")).not.toContainText(/clean|intv|failure|catch|score/i)
  await expect(links.first()).toContainText("Run 01")
  await expect(links.first()).toContainText("Page content is in English")

  await links.first().click()
  await expect(page).toHaveURL(/\?lang=en&run=F1_add_single_item_clean$/)
  await expect(page.locator(".study-shell")).toBeVisible()
  await expect(page.getByRole("heading", { name: "Final state" })).toBeVisible()
})

test("shows the localized picker and fails closed for an unknown run", async ({ page }) => {
  await page.goto("/?lang=zh")
  await expect(page.getByRole("heading", { name: "选择一个执行记录", level: 2 })).toBeVisible()
  await expect(page.locator(".picker-list a").first()).toContainText("记录 01")

  await page.goto("/?lang=zh&run=missing-run")
  await expect(page.getByRole("alert")).toContainText("找不到这条执行记录")
  await expect(page.locator(".picker-list a")).toHaveCount(44)
})
