import { expect, test } from "@playwright/test"

test("offers an English interface backed by the English run", async ({ page }) => {
  await page.goto("/?lang=en")

  await expect(page.getByRole("heading", { name: "Final state" })).toBeVisible()
  await expect(page.locator(".study-context")).toContainText("Original task")
  await expect(page.locator(".study-context")).toContainText("Agent-reported result")
  await expect(page.locator(".browser-state-label")).toHaveText("Last recorded state")
  await expect(page.locator(".page-screenshot")).toHaveAttribute(
    "src",
    "screenshots/en/08-cart.webp",
  )
  await expect(
    page
      .getByRole("navigation", { name: "Execution overview" })
      .getByText("Reported task completion"),
  ).toBeVisible()
  await expect(page.getByText("Recorded execution · 8 steps")).toBeVisible()

  await page.getByRole("button", { name: "中文" }).click()
  await expect(page.getByRole("heading", { name: "最终状态" })).toBeVisible()
})

test("shows the before-image for a historical step and returns to the final state", async ({
  page,
}) => {
  await page.goto("/?lang=en")
  await expect(page.locator(".page-screenshot")).toHaveAttribute(
    "src",
    "screenshots/en/08-cart.webp",
  )

  await page.getByRole("combobox", { name: "Jump to step" }).selectOption("3")
  const browser = page.getByRole("region", { name: "Agent browser" })
  await expect(browser).toContainText("Cloud Walk Red Sneakers")
  await expect(page.getByText("Before step 4 of 8")).toBeVisible()
  await expect(page.locator(".page-screenshot")).toHaveAttribute(
    "src",
    "screenshots/en/04-sorted.webp",
  )
  await expect(page.locator('.execution-rail-item[data-viewed="true"]')).toContainText(
    "Opened “Cloud Walk Red Sneakers”",
  )
  await expect(page.getByRole("heading", { name: "Viewed step 4" })).toBeVisible()

  await page.getByRole("button", { name: "Return to last recorded state" }).click()
  await expect(page.locator(".browser-state-label")).toHaveText("Last recorded state")
  await expect(page.getByRole("heading", { name: "Final state" })).toBeVisible()
  await expect(page.getByRole("button", { name: "Next step" })).toBeDisabled()
})

test("removes technical disclosure and the disabled composer from the participant workspace", async ({
  page,
}) => {
  await page.goto("/?lang=en")

  await expect(page.locator("details")).toHaveCount(0)
  await expect(page.locator(".step-card")).toHaveCount(0)
  await expect(page.locator(".agent-prompt")).toHaveCount(0)
  await expect(page.locator(".chat-scroll")).toHaveCount(0)
  await expect(page.getByText(/Technical details/)).toHaveCount(0)
  await expect(page.getByText("No mistaken action")).toHaveCount(0)
})

test("keeps the step menu, execution rail, and arrows on the same viewed ID", async ({ page }) => {
  await page.goto("/?lang=en")
  const menu = page.getByRole("combobox", { name: "Jump to step" })

  await menu.selectOption("3")
  await expect(menu).toHaveValue("3")
  await expect(page.getByText("Before step 4 of 8")).toBeVisible()
  await expect(page.getByRole("button", { name: "Previous step" })).toBeEnabled()
  await expect(page.getByRole("button", { name: "Next step" })).toBeEnabled()

  await page.getByRole("button", { name: "Next step" }).click()
  await expect(menu).toHaveValue("4")
  await expect(page.getByText("Before step 5 of 8")).toBeVisible()
  await expect(page.locator(".page-screenshot")).toHaveAttribute(
    "src",
    "screenshots/en/05-product.webp",
  )

  await page
    .getByRole("navigation", { name: "Execution overview" })
    .getByRole("button", { name: /Step 2.*Submitted the search/ })
    .click()
  await expect(menu).toHaveValue("1")
  await expect(page.getByText("Before step 2 of 8")).toBeVisible()
  await expect(page.locator(".page-screenshot")).toHaveAttribute(
    "src",
    "screenshots/en/02-search-filled.webp",
  )
})

test("keeps a response tentative until submission and then locks judgments but not replay", async ({
  page,
}) => {
  await page.goto("/?lang=en")
  const accepted = page.getByRole("button", { name: "Fulfills the request", exact: true })
  const rejected = page.getByRole("button", { name: "Does not fulfill the request", exact: true })
  const submit = page.getByRole("button", { name: "Submit assessment", exact: true })
  const menu = page.getByRole("combobox", { name: "Jump to step" })

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

  await menu.selectOption("3")
  await expect(page.getByRole("heading", { name: "Viewed step 4" })).toBeVisible()
  await expect(page.getByText("Before step 4 of 8")).toBeVisible()
  await expect(page.locator(".page-screenshot")).toHaveAttribute(
    "src",
    "screenshots/en/04-sorted.webp",
  )
  await expect(page.getByRole("button", { name: "Next step" })).toBeEnabled()
})

test("fits the screenshot by default and toggles to actual size on click", async ({ page }) => {
  await page.goto("/?lang=en")
  const viewport = page.locator(".browser-viewport")
  const trigger = page.locator(".screenshot-trigger")
  const image = page.locator(".page-screenshot")

  await expect(image).toBeVisible()
  await expect(image).toHaveAttribute("width", "1200")
  await expect(image).toHaveAttribute("height", "800")
  await expect(image).toHaveCSS("filter", "none")
  await expect(image).toHaveCSS("opacity", "1")
  await expect(trigger).toHaveAttribute("data-zoomed", "false")
  await expect(trigger).toHaveCSS("cursor", "zoom-in")
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollWidth > element.clientWidth))
    .toBe(false)

  await trigger.click()
  await expect(trigger).toHaveAttribute("data-zoomed", "true")
  await expect(trigger).toHaveCSS("cursor", "zoom-out")
  await expect
    .poll(() =>
      image.evaluate((element) => {
        const rect = element.getBoundingClientRect()
        return `${Math.round(rect.width)}x${Math.round(rect.height)}`
      }),
    )
    .toBe("1202x802")
  await expect
    .poll(() => viewport.evaluate((element) => element.scrollWidth > element.clientWidth))
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
})

test("enforces the desktop minimum without page-level overflow", async ({ page }) => {
  await page.goto("/?lang=zh")
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
