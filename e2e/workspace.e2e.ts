import { expect, test } from "@playwright/test"

test("offers an English interface backed by the English run", async ({ page }) => {
  await page.goto("/?lang=en")

  await expect(
    page.getByRole("button", { name: "Fulfills the request", exact: true }),
  ).toBeVisible()
  await expect(page.getByRole("region", { name: "Agent browser" })).toContainText(
    "Cart | Cloud Mall",
  )
  await expect(page.locator(".page-screenshot")).toHaveAttribute(
    "src",
    "screenshots/en/08-cart.webp",
  )
  await expect(
    page.getByRole("button", { name: "Step 3, Submitted the search: view page" }),
  ).toBeVisible()
  await expect(page.getByText("Recorded execution · 8 steps")).toBeVisible()

  await page.getByRole("button", { name: "中文" }).click()
  await expect(page.getByRole("button", { name: "符合原始任务", exact: true })).toBeVisible()
})

test("inspects a historical step and returns to the last recorded state", async ({ page }) => {
  await page.goto("/")
  await expect(
    page.locator('.message-block[data-speaker="assistant"] .message-content'),
  ).toContainText("已为你将最畅销的红色跑鞋加入购物车")
  await expect(page.getByRole("region", { name: "Agent 浏览器" })).toContainText("购物车｜云朵商城")

  await page.getByRole("button", { name: "步骤 3，提交搜索：查看页面" }).click()
  const browser = page.getByRole("region", { name: "Agent 浏览器" })
  await expect(browser).toContainText("红色跑鞋－商品搜索")
  await expect(browser).toContainText("步骤 3 / 8 · 此步之后录制")
  await expect(
    page.getByRole("button", { name: "步骤 3，提交搜索：正在查看页面" }),
  ).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("步骤 3 / 8", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: "返回最后录制状态" }).click()
  await expect(browser).toContainText("最后一次录制的状态")
  await expect(page.getByRole("button", { name: "下一步" })).toBeDisabled()
})

test("keeps Python behind technical details", async ({ page }) => {
  await page.goto("/")
  const firstStep = page.getByRole("article", { name: "步骤 1" })
  const code = firstStep.getByText('new_tab("https://mall.example/")')
  await expect(code).toBeHidden()

  await firstStep.getByText("技术细节 · 1 个 Python 单元").click()
  await expect(code).toBeVisible()
})

test("jumps directly to a recorded step", async ({ page }) => {
  await page.goto("/")
  await page.getByRole("combobox", { name: "跳转步骤" }).selectOption("4")

  await expect(
    page.getByRole("button", { name: "步骤 5，打开「云漫步红色休闲鞋」：正在查看页面" }),
  ).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByText("步骤 5 / 8", { exact: true })).toBeVisible()
})

test("keeps a decision tentative until submission and then locks it", async ({ page }) => {
  await page.goto("/")
  const accepted = page.getByRole("button", { name: "符合原始任务", exact: true })
  const rejected = page.getByRole("button", { name: "不符合原始任务", exact: true })
  const submit = page.getByRole("button", { name: "提交评估" })

  await rejected.click()
  await expect(accepted).toBeEnabled()
  await expect(rejected).toBeEnabled()
  await expect(submit).toBeEnabled()
  await expect(page.getByText(/已选择：不符合原始任务。提交前仍可更改。/)).toBeVisible()

  await accepted.click()
  await expect(page.getByText(/已选择：符合原始任务。提交前仍可更改。/)).toBeVisible()
  await expect(page.getByText("提交前已更改选择 1 次。")).toBeVisible()

  await submit.click()
  await expect(accepted).toBeDisabled()
  await expect(rejected).toBeDisabled()
  await expect(submit).toBeDisabled()
  await expect(page.getByText(/已提交：符合原始任务。/)).toBeVisible()
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
        (element) =>
          Math.ceil(element.scrollTop + element.clientHeight) >= element.scrollHeight - 1,
      ),
    )
    .toBe(true)
  await expect(jump).toBeHidden()
})

test("fits the screenshot by default and toggles to actual size on click", async ({ page }) => {
  await page.goto("/")
  const viewport = page.locator(".browser-viewport")
  const trigger = page.locator(".screenshot-trigger")
  const image = page.locator(".page-screenshot")

  await expect(image).toBeVisible()
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
