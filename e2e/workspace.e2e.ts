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

test("scrolls the whole page while the header and task stay pinned", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto(runUrl("en"))
  await page.evaluate(() => document.fonts.ready)
  const header = page.locator(".product-header")
  const context = page.locator(".study-context")
  const review = page.locator(".study-page")
  const image = page.locator(".page-screenshot")
  const response = page.locator(".study-response")

  // Then the document, not the review panel, owns the scroll.
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
      ),
    )
    .toBeGreaterThan(0)
  await expect
    .poll(() => review.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeLessThanOrEqual(0)

  // And the response form starts below the fold.
  await expect(response).not.toBeInViewport()

  // The screenshot fills the review panel at its intrinsic aspect ratio.
  const reviewBox = await review.boundingBox()
  const imageBox = await image.boundingBox()
  if (reviewBox === null || imageBox === null) throw new Error("missing layout boxes")
  expect(imageBox.width).toBeGreaterThanOrEqual(reviewBox.width - 2)
  expect(imageBox.height).toBeGreaterThan(imageBox.width * 0.6)
  // The rail is the wider column and the review page is narrower than the previous 48vh frame.
  const railBox = await page.locator(".execution-rail").boundingBox()
  if (railBox === null) throw new Error("missing rail box")
  expect(railBox.width).toBeGreaterThanOrEqual(230)
  expect(imageBox.height).toBeLessThan(720)

  // When the participant scrolls, the page moves while the header and task stay pinned.
  await page.evaluate(() => window.scrollTo(0, 400))
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0)
  const headerBox = await header.boundingBox()
  const contextBox = await context.boundingBox()
  if (headerBox === null || contextBox === null) throw new Error("missing pinned boxes")
  expect(Math.round(headerBox.y)).toBe(0)
  expect(Math.round(contextBox.y)).toBe(56)
  await expect(context).toBeInViewport()

  // And scrolling to the bottom reveals the response form.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(response).toBeInViewport()
  await expect(
    page.getByRole("button", { name: "Submit assessment", exact: true }),
  ).toBeInViewport()
})

test("caps a long step rail at the screenshot and scrolls it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
  await page.goto("/?lang=en&run=F1_spec_comparison_clean")
  await page.evaluate(() => document.fonts.ready)
  const rail = page.locator(".execution-rail")
  const frame = page.locator(".browser-frame")
  const list = page.locator(".execution-rail-list")
  const items = list.locator(".execution-rail-item")

  // Then every recorded step plus Final state is in the rail.
  await expect(items).toHaveCount(37)

  // And the rail never grows past the recorded screenshot.
  const railBox = await rail.boundingBox()
  const frameBox = await frame.boundingBox()
  if (railBox === null || frameBox === null) throw new Error("missing rail boxes")
  expect(railBox.height).toBeLessThanOrEqual(frameBox.height + 1)

  // The overflowing step list scrolls inside the rail instead.
  await expect
    .poll(() => list.evaluate((element) => element.scrollHeight - element.clientHeight))
    .toBeGreaterThan(0)
  await items.last().scrollIntoViewIfNeeded()
  await expect(items.last()).toBeInViewport()
})

test("gives the compact study Zoom control a 44px target and toggles fit", async ({ page }) => {
  await page.goto(runUrl("en"))
  const zoom = page.locator(".browser-compact-zoom")
  const trigger = page.locator(".screenshot-trigger")

  const bounds = await zoom.boundingBox()
  if (bounds === null) throw new Error("compact Zoom control has no bounding box")
  expect(bounds.width).toBeGreaterThanOrEqual(44)
  expect(bounds.height).toBeGreaterThanOrEqual(44)
  await expect(zoom).toHaveText("Zoom")
  await zoom.click()
  await expect(zoom).toHaveText("Fit")
  await expect(trigger).toHaveAttribute("data-zoomed", "true")
  await zoom.click()
  await expect(zoom).toHaveText("Zoom")
  await expect(trigger).toHaveAttribute("data-zoomed", "false")
})

test("fits the screenshot by default and toggles to actual size on click", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 })
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
  // The page grows to the image height, so only the horizontal axis overflows the image well.
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollHeight > element.clientHeight))
    .toBe(false)

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
