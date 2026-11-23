import { expect, test } from "@playwright/test"
import { runFrame, runScreenshotSize, runUrl } from "./run.ts"

test("offers both interfaces backed by the recorded run", async ({ page }) => {
  await page.goto(runUrl("en"))

  await expect(page.getByRole("heading", { name: "Final state" })).toBeVisible()
  await expect(page.locator(".study-context")).toContainText("Original task")
  await expect(page.locator(".study-context")).not.toContainText("Agent-reported result")
  await expect(page.locator(".browser-state-label")).toHaveText("Last recorded state")
  await expect(page.locator(".page-screenshot")).toHaveAttribute("src", runFrame.final)
  await expect(
    page
      .getByRole("navigation", { name: "Execution overview" })
      .getByText("Add Classic Leather Wallet to Cart"),
  ).toBeVisible()
  await expect(page.locator(".product-header").getByText("4 steps", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "中文" }).click()
  await expect(page.getByRole("heading", { name: "最终状态" })).toBeVisible()
  await expect(
    page
      .getByRole("navigation", { name: "执行概览" })
      .getByText("将 Classic Leather Wallet 加入购物车"),
  ).toBeVisible()
})

test("shows the before-image for a historical step and returns to the final state", async ({
  page,
}) => {
  await page.goto(runUrl("en"))
  await expect(page.locator(".page-screenshot")).toHaveAttribute("src", runFrame.final)

  await page.locator(".execution-rail-item").nth(3).click()
  await expect(page.locator(".decision-inspector-action")).toContainText(
    "Add Classic Leather Wallet to Cart",
  )
  await expect(page.getByText("Before step 4 of 4")).toBeVisible()
  await expect(page.locator(".page-screenshot")).toHaveAttribute("src", runFrame.step4)
  await expect(page.locator('.execution-rail-item[data-viewed="true"]')).toContainText(
    "Add Classic Leather Wallet to Cart",
  )
  await expect(page.getByRole("heading", { name: "Viewed step 4" })).toBeVisible()

  await page.locator(".execution-rail-item").last().click()
  await expect(page.locator(".browser-state-label")).toHaveText("Last recorded state")
  await expect(page.getByRole("heading", { name: "Final state" })).toBeVisible()
  await expect(page.locator(".execution-rail-item").last()).toHaveAttribute("aria-current", "step")
})

test("keeps only the task disclosure and removes technical, report, and composer copy", async ({
  page,
}) => {
  await page.goto(runUrl("en"))

  await expect(page.locator("details")).toHaveCount(1)
  await expect(page.locator(".study-task-strip")).toHaveCount(1)
  await expect(page.locator(".study-inspector")).toHaveCount(0)
  await expect(page.locator(".step-card")).toHaveCount(0)
  await expect(page.locator(".agent-prompt")).toHaveCount(0)
  await expect(page.locator(".chat-scroll")).toHaveCount(0)
  await expect(page.getByText(/Technical details/)).toHaveCount(0)
  await expect(page.getByText(/Agent-reported result/)).toHaveCount(0)
  await expect(page.getByText("No mistaken action")).toHaveCount(0)
})

test("navigates historical steps and final state through the execution rail", async ({ page }) => {
  await page.goto(runUrl("en"))
  const items = page.locator(".execution-rail-list .execution-rail-item")

  await items.nth(3).click()
  await expect(items.nth(3)).toHaveAttribute("aria-current", "step")
  await expect(page.getByText("Before step 4 of 4")).toBeVisible()

  await items.nth(1).click()
  await expect(items.nth(1)).toHaveAttribute("aria-current", "step")
  await expect(page.getByText("Before step 2 of 4")).toBeVisible()
  await expect(page.locator(".page-screenshot")).toHaveAttribute("src", runFrame.step2)

  await items.last().click()
  await expect(items.last()).toContainText("Final state")
  await expect(items.last()).toHaveAttribute("aria-current", "step")
  await expect(page.getByRole("heading", { name: "Final state" })).toBeVisible()
})

test("keeps a response tentative until submission and then locks judgments but not replay", async ({
  page,
}) => {
  await page.goto(runUrl("en"))
  const accepted = page.getByRole("button", { name: "Fulfills the request", exact: true })
  const rejected = page.getByRole("button", { name: "Does not fulfill the request", exact: true })
  const submit = page.getByRole("button", { name: "Submit assessment", exact: true })
  const items = page.locator(".execution-rail-list .execution-rail-item")

  await expect(submit).toBeDisabled()
  await rejected.click()
  await expect(accepted).toBeEnabled()
  await expect(rejected).toBeEnabled()
  await expect(submit).toBeEnabled()
  await accepted.click()
  await expect(accepted).toHaveAttribute("aria-pressed", "true")
  await submit.click()

  await expect(accepted).toBeDisabled()
  await expect(rejected).toBeDisabled()
  await expect(submit).toBeDisabled()
  await expect(page.getByText("Response recorded on this page only.")).toBeVisible()
  await expect(page.locator(".study-response")).not.toContainText(/correct|incorrect|错误/)

  await items.nth(3).click()
  await expect(page.getByRole("heading", { name: "Viewed step 4" })).toBeVisible()
  await expect(page.getByText("Before step 4 of 4")).toBeVisible()
  await expect(page.locator(".page-screenshot")).toHaveAttribute("src", runFrame.step4)
  await expect(items.last()).toBeEnabled()
})

test("fits the screenshot by default and toggles to actual size on click", async ({ page }) => {
  await page.goto(runUrl("en"))
  const viewport = page.locator(".browser-viewport")
  const trigger = page.locator(".screenshot-trigger")
  const image = page.locator(".page-screenshot")

  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute("width", String(runScreenshotSize.width))
  await expect(image).toHaveAttribute("height", String(runScreenshotSize.height))
  await expect(image).toHaveCSS("filter", "none")
  await expect(image).toHaveCSS("opacity", "1")
  await expect(trigger).toHaveAttribute("data-zoomed", "false")
  await expect(trigger).toHaveCSS("cursor", "zoom-in")
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollWidth > element.clientWidth))
    .toBe(false)
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(false)

  await trigger.click()
  await expect(trigger).toHaveAttribute("data-zoomed", "true")
  await expect(trigger).toHaveCSS("cursor", "zoom-out")
  await expect
    .poll(() =>
      image.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        const style = getComputedStyle(element)
        return {
          width: Math.round(
            rect.width -
              Number.parseFloat(style.borderLeftWidth) -
              Number.parseFloat(style.borderRightWidth),
          ),
          height: Math.round(
            rect.height -
              Number.parseFloat(style.borderTopWidth) -
              Number.parseFloat(style.borderBottomWidth),
          ),
        }
      }),
    )
    .toEqual(runScreenshotSize)
  await expect
    .poll(() =>
      viewport.evaluate(
        (element) =>
          element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight,
      ),
    )
    .toBe(true)
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(true)

  await trigger.click()
  await expect(trigger).toHaveAttribute("data-zoomed", "false")
  await expect(trigger).toHaveCSS("cursor", "zoom-in")
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollWidth > element.clientWidth))
    .toBe(false)
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(false)
})

test("enforces the desktop minimum without page-level overflow", async ({ page }) => {
  await page.goto(runUrl("zh"))
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
