import { expect, test } from "@playwright/test"
import { studyConditionFromEnvironment } from "../scripts/study-condition.ts"
import { runFrame, runUrl } from "./run.ts"

const studyCondition = studyConditionFromEnvironment()

const en = {
  explanation: /short explanation/i,
  accept: "Fulfills the request",
  reject: "Does not fulfill the request",
  submit: "Submit assessment",
  beforeStep4: "Before step 4 of 4",
  finalState: "Final state",
  lastRecordedState: "Last recorded state",
  offeredOperations: "Offered operations",
  offeredTargets: "Offered targets",
  submitted: "Response recorded on this page only.",
  missingScreenshot: "No screenshot for this step",
} as const

const zh = {
  explanation: /简短说明/,
  accept: "符合原始任务",
  reject: "不符合原始任务",
  submit: "提交评估",
  beforeStep4: "第 4 步操作前 · 共 4 步",
  finalState: "最终状态",
  lastRecordedState: "最后一次录制的状态",
  submitted: "评估仅记录在本页。",
} as const

test("loads the pinned condition without a URL override and exposes no technical evidence", async ({
  page,
}) => {
  await page.goto(runUrl("en"))
  await expect(page.locator(".app-shell")).toBeVisible()
  await expect(page.getByRole("heading", { name: en.finalState })).toBeVisible()

  await expect(page.locator("details")).toHaveCount(0)
  await expect(page.locator(".agent-prompt")).toHaveCount(0)
  await expect(page.locator(".chat-scroll")).toHaveCount(0)
  await expect(page.locator(".code-block")).toHaveCount(0)

  const body = await page.locator("body").textContent()
  expect(body).not.toMatch(/technical details|python|thinking|confidence|no mistaken action/i)

  if (studyCondition === "baseline") {
    await expect(page.getByRole("table")).toHaveCount(0)
    expect(body).not.toMatch(/probability|offered operations|offered targets/i)
  } else {
    await page.locator(".execution-rail-item").nth(3).click()
    await expect(page.getByRole("table", { name: en.offeredOperations })).toBeVisible()
    await expect(page.getByRole("table", { name: en.offeredTargets })).toBeVisible()
  }
})

test("shows both heads for a target action and no localization control", async ({ page }) => {
  await page.goto(runUrl("en"))
  const items = page.locator(".execution-rail-list .execution-rail-item")
  await items.nth(3).click()
  await expect(page.getByText(en.beforeStep4)).toBeVisible()
  await expect(page.getByRole("textbox", { name: en.explanation })).toBeEnabled()
  await expect(page.getByRole("combobox")).toHaveCount(0)

  if (studyCondition === "baseline") {
    await expect(page.getByRole("table")).toHaveCount(0)
  } else {
    await expect(page.getByRole("table", { name: en.offeredOperations })).toBeVisible()
    await expect(page.getByRole("table", { name: en.offeredTargets })).toBeVisible()
  }

  await items.last().click()
  await expect(page.getByRole("heading", { name: en.finalState })).toBeVisible()
  await expect(page.locator("[data-marked]")).toHaveCount(0)
  await expect(page.getByRole("combobox")).toHaveCount(0)
})

test("rail selection and verdict changes preserve the explanation draft", async ({ page }) => {
  const explanation = "The cart contains a different product from the request."
  await page.goto(runUrl("en"))
  await page.locator(".execution-rail-item").nth(3).click()
  await page.getByRole("textbox", { name: en.explanation }).fill(explanation)
  await page.getByRole("button", { name: en.reject, exact: true }).click()

  await page.locator(".execution-rail-item").nth(1).click()
  await expect(page.getByText("Before step 2 of 4")).toBeVisible()
  await expect(page.getByRole("textbox", { name: en.explanation })).toHaveValue(explanation)
  await expect(page.getByRole("button", { name: en.reject, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.locator('.execution-rail-item[data-viewed="true"]')).toHaveCount(1)
  await expect(page.locator("[data-marked]")).toHaveCount(0)

  await page.locator(".execution-rail-item").last().click()
  await expect(page.getByRole("textbox", { name: en.explanation })).toHaveValue(explanation)
  await expect(page.getByRole("heading", { name: en.finalState })).toBeVisible()
})

test("submits a rejection with a blank explanation and keeps the response on-screen only", async ({
  page,
}) => {
  await page.goto(runUrl("en"))
  await page.getByRole("button", { name: en.reject, exact: true }).click()
  const explanation = page.getByRole("textbox", { name: en.explanation })
  await expect(explanation).toHaveValue("")
  const submit = page.getByRole("button", { name: en.submit, exact: true })

  const localKeysBefore = await page.evaluate(() => Object.keys(window.localStorage).sort())
  const sessionKeysBefore = await page.evaluate(() => Object.keys(window.sessionStorage).sort())
  const requestsAfterSubmit: string[] = []
  page.on("request", (request) => requestsAfterSubmit.push(request.method()))

  await submit.click()
  await expect(page.getByText(en.submitted)).toBeVisible()
  expect(await page.evaluate(() => Object.keys(window.localStorage).sort())).toEqual(
    localKeysBefore,
  )
  expect(await page.evaluate(() => Object.keys(window.sessionStorage).sort())).toEqual(
    sessionKeysBefore,
  )
  expect(requestsAfterSubmit).toEqual([])
})

test("locale switches preserve an explanation draft and a submitted response", async ({ page }) => {
  const explanation = "  Keep this participant text exactly.\nSecond line.  "
  await page.goto(runUrl("zh"))
  await page.locator(".execution-rail-item").nth(3).click()
  await page.getByRole("textbox", { name: zh.explanation }).fill(explanation)
  await page.getByRole("button", { name: zh.reject, exact: true }).click()

  await page.getByRole("button", { name: "English" }).click()
  await expect(page.getByRole("navigation", { name: "Execution overview" })).toBeVisible()
  await expect(page.getByText(en.beforeStep4)).toBeVisible()
  await expect(page.getByRole("textbox", { name: en.explanation })).toHaveValue(explanation)
  await expect(page.getByRole("button", { name: en.reject, exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(page.getByRole("combobox")).toHaveCount(0)
  await expect(page.locator("[data-marked]")).toHaveCount(0)
  await expect(page.locator("details")).toHaveCount(0)

  await page.getByRole("button", { name: en.submit, exact: true }).click()
  await expect(page.getByText(en.submitted)).toBeVisible()
  await page.getByRole("button", { name: "中文" }).click()
  await expect(page.getByText(zh.submitted)).toBeVisible()
  await expect(page.getByRole("textbox", { name: zh.explanation })).toHaveValue(explanation)
  await expect(page.getByRole("textbox", { name: zh.explanation })).toBeDisabled()
  await expect(page.getByRole("button", { name: zh.accept, exact: true })).toBeDisabled()
  await expect(page.getByRole("button", { name: zh.reject, exact: true })).toBeDisabled()
  await expect(page.getByRole("combobox")).toHaveCount(0)
  await expect(page.locator("[data-marked]")).toHaveCount(0)
})

test("reload clears the on-screen judgment while remaining on the pinned run", async ({ page }) => {
  await page.goto(runUrl("en"))
  await page.getByRole("button", { name: en.accept, exact: true }).click()
  await page.getByRole("button", { name: en.submit, exact: true }).click()
  await expect(page.getByText(en.submitted)).toBeVisible()

  await page.reload()
  await expect(page.locator(".app-shell")).toBeVisible()
  await expect(page.getByText(en.submitted)).toHaveCount(0)
  await expect(page.getByRole("button", { name: en.submit, exact: true })).toBeDisabled()
  await expect(page.getByRole("textbox", { name: en.explanation })).toHaveValue("")
  await expect(page.getByRole("combobox")).toHaveCount(0)
  await expect(page.locator("[data-marked]")).toHaveCount(0)
  for (const key of await page.evaluate(() => Object.keys(window.localStorage))) {
    expect(key).not.toMatch(/response|answer|verdict|judg/i)
  }
})

test("a real missing screenshot shows evidence failure without substituting an after-image", async ({
  page,
}) => {
  await page.goto(runUrl("en"))
  await page.route(`**/${runFrame.step4}`, async (route) => {
    await route.fulfill({ status: 404, contentType: "text/plain", body: "not found" })
  })
  const items = page.locator(".execution-rail-list .execution-rail-item")
  await items.nth(3).click()
  await expect(page.getByText(en.beforeStep4)).toBeVisible()
  await expect(page.getByText(en.missingScreenshot)).toBeVisible()
  await expect(page.locator(".page-screenshot")).toHaveCount(0)
  await expect(page.locator(".decision-inspector-action")).toContainText(
    "Add Classic Leather Wallet to Cart",
  )

  await items.nth(1).click()
  await expect(page.getByText("Before step 2 of 4")).toBeVisible()
  await expect(page.locator(".page-screenshot")).toBeVisible()
  await items.nth(2).click()
  await expect(page.locator(".page-screenshot")).toBeVisible()
})
