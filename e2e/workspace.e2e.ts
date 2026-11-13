import { expect, test } from "@playwright/test"

test("offers an English interface backed by the English run", async ({ page }) => {
  await page.goto("/?lang=en")

  await expect(page.getByRole("button", { name: "Accept result" })).toBeVisible()
  await expect(page.getByRole("region", { name: "Agent browser" })).toContainText("Cart | Cloud Mall")
  await expect(page.locator(".page-screenshot")).toHaveAttribute(
    "src",
    "screenshots/en/08-cart.webp",
  )
  await expect(page.getByRole("button", { name: "Step 3: view page" })).toBeVisible()

  await page.getByRole("button", { name: "中文" }).click()
  await expect(page.getByRole("button", { name: "接受结果" })).toBeVisible()
})

test("inspects a historical step and returns to the final result", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.locator('.message-block[data-speaker="assistant"] .message-content'),
  ).toContainText("已为你将最畅销的红色跑鞋加入购物车")
  await expect(page.getByRole("region", { name: "Agent 浏览器" })).toContainText("购物车｜云朵商城")

  await page.getByRole("button", { name: "步骤 3：查看页面" }).click()
  const browser = page.getByRole("region", { name: "Agent 浏览器" })
  await expect(browser).toContainText("红色跑鞋－商品搜索")
  await expect(page.getByRole("button", { name: "步骤 3：正在查看页面" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.getByText("步骤 3 / 8")).toBeVisible()

  await page.getByRole("button", { name: "返回最终状态" }).click()
  await expect(browser).toContainText("购物车｜云朵商城")
  await expect(page.getByRole("button", { name: "下一步" })).toBeDisabled()
})

test("locks both neutral decisions after one choice", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "拒绝结果" }).click()
  await expect(page.getByRole("button", { name: "接受结果" })).toBeDisabled()
  await expect(page.getByRole("button", { name: "拒绝结果" })).toBeDisabled()
  await expect(page.getByText(/已记录：拒绝结果/)).toBeVisible()
  await expect(page.locator(".decision-footer")).not.toContainText(/正确|错误/)
})

test("keeps the decision in the transcript and jumps to the latest content", async ({ page }) => {
  await page.goto("/")
  const scroll = page.locator(".chat-scroll")
  await expect(scroll.locator(".decision-footer")).toBeVisible()
  await expect(page.locator(".agent-prompt textarea")).toBeDisabled()
  await expect(page.locator(".agent-prompt")).toContainText("synthetic-model")

  const jump = page.getByRole("button", { name: "跳到最新内容" })
  await expect(jump).toBeVisible()
  await jump.click()
  await expect
    .poll(() =>
      scroll.evaluate(
        (element) => Math.ceil(element.scrollTop + element.clientHeight) >= element.scrollHeight - 1,
      ),
    )
    .toBe(true)
  await expect(jump).toBeHidden()
})

test("zooms beyond native width, closes with Escape, and restores trigger focus", async ({
  page,
}) => {
  await page.goto("/")
  const trigger = page.getByRole("button", { name: "放大查看" })
  await trigger.click()
  const dialog = page.getByRole("dialog", { name: "放大查看" })
  await expect(dialog).toBeVisible()

  await dialog.getByRole("button", { name: "放大", exact: true }).click()
  await expect(dialog.locator("img")).toHaveCSS("width", "1500px")
  await expect(page.getByText("125%", { exact: true })).toBeVisible()

  await page.keyboard.press("Escape")
  await expect(dialog).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    )
    .toBe(false)
})

test("enforces the desktop minimum without page-level overflow", async ({ page }) => {
  await page.goto("/")
  await page.setViewportSize({ width: 1279, height: 720 })
  await expect(page.getByRole("heading", { name: "请在桌面窗口中使用浏览助手" })).toBeVisible()
  await expect(page.locator(".app-shell")).toBeHidden()

  await page.setViewportSize({ width: 375, height: 667 })
  await expect(page.getByRole("heading", { name: "请在桌面窗口中使用浏览助手" })).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      ),
    )
    .toBe(false)

  await page.setViewportSize({ width: 1280, height: 720 })
  await expect(page.getByRole("region", { name: "Agent 浏览器" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "请在桌面窗口中使用浏览助手" })).toBeHidden()
})
