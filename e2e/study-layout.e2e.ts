import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { expect, type Locator, type Page, test } from "@playwright/test"
import { studyConditionFromEnvironment } from "../scripts/study-condition.ts"
import type { StudyRun } from "../src/domain/study-run-schema.ts"
import type { Locale } from "../src/i18n/locale.ts"
import type { StudyEquivalenceReport } from "../tests/fixtures/study-builds.ts"
import {
  representativeRunId,
  runFrame,
  runScreenshotSize,
  runUrl,
} from "./run.ts"

const studyCondition = studyConditionFromEnvironment()

const viewports = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
] as const

const copy = {
  zh: {
    executionOverview: "执行概览",
    accept: "符合原始任务",
    reject: "不符合原始任务",
    submit: "提交评估",
    cannotDetermine: "无法判断",
    localizationPrompt: /最早的错误操作/,
    explanationPrompt: /简短说明/,
    finalState: "最终状态",
    lastRecordedState: "最后一次录制的状态",
    beforeStep4: "第 4 步操作前 · 共 4 步",
    offeredOperations: "候选操作",
    offeredTargets: "候选目标",
    submitted: "评估仅记录在本页。",
  },
  en: {
    executionOverview: "Execution overview",
    accept: "Fulfills the request",
    reject: "Does not fulfill the request",
    submit: "Submit assessment",
    cannotDetermine: "Cannot determine",
    localizationPrompt: /earliest mistaken action/,
    explanationPrompt: /short explanation/i,
    finalState: "Final state",
    lastRecordedState: "Last recorded state",
    beforeStep4: "Before step 4 of 4",
    offeredOperations: "Offered operations",
    offeredTargets: "Offered targets",
    submitted: "Response recorded on this page only.",
  },
} as const

async function tabUntilFocused(page: Page, target: Locator): Promise<void> {
  for (let press = 0; press < 120; press += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) return
    await page.keyboard.press("Tab")
  }
  throw new Error("target was not reached with Tab navigation")
}

async function box(locator: Locator) {
  const bounds = await locator.boundingBox()
  if (bounds === null) throw new Error(`missing bounds for ${await locator.toString()}`)
  return {
    x: Math.round(bounds.x * 1000) / 1000,
    y: Math.round(bounds.y * 1000) / 1000,
    width: Math.round(bounds.width * 1000) / 1000,
    height: Math.round(bounds.height * 1000) / 1000,
  }
}

async function screenshotReference(image: Locator) {
  const path = await image.getAttribute("src")
  const width = Number.parseInt((await image.getAttribute("width")) ?? "", 10)
  const height = Number.parseInt((await image.getAttribute("height")) ?? "", 10)
  if (!path) throw new Error("missing screenshot path")
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("missing intrinsic screenshot dimensions")
  }
  return { path, width, height }
}

async function capture(
  page: Page,
  locale: Locale,
  viewport: { width: number; height: number },
  state: string,
) {
  const directory = join(
    process.cwd(),
    "test-results",
    "study-evidence",
    `${locale}-${viewport.width}x${viewport.height}`,
  )
  await mkdir(directory, { recursive: true })
  await page.screenshot({ path: join(directory, `${state}.png`) })
}

async function writeReport(
  locale: Locale,
  viewport: { width: number; height: number },
  report: StudyEquivalenceReport,
): Promise<void> {
  const directory = join(process.cwd(), "test-results", "study-equivalence")
  await mkdir(directory, { recursive: true })
  await writeFile(
    join(directory, `${locale}-${viewport.width}x${viewport.height}.json`),
    `${JSON.stringify(report, null, 2)}\n`,
    "utf8",
  )
}

async function selectedRun(locale: Locale): Promise<StudyRun> {
  const path = join(process.cwd(), "public", "runs", representativeRunId, `run.${locale}.json`)
  return JSON.parse(await readFile(path, "utf8")) as StudyRun
}

for (const locale of ["zh", "en"] as const) {
  for (const viewport of viewports) {
    test(`${locale} at ${viewport.width}x${viewport.height} keeps long evidence bounded and emits an equivalence report`, async ({
      page,
    }) => {
      const text = copy[locale]
      const run = await selectedRun(locale)
      const expectedFinal = { path: runFrame.final, ...runScreenshotSize }
      await page.setViewportSize(viewport)
      await page.goto(runUrl(locale))
      await page.evaluate(() => document.fonts.ready)
      const shell = page.locator(".app-shell")
      await expect(shell).toBeVisible()
      await expect(page.getByRole("heading", { name: text.finalState })).toBeVisible()
      await expect(page.locator(".browser-state-label")).toHaveText(text.lastRecordedState)

      const initialImage = page.locator(".page-screenshot")
      await expect(initialImage).toBeVisible()
      await expect(initialImage).toHaveAttribute("src", expectedFinal.path)
      await expect(initialImage).toHaveAttribute("width", String(expectedFinal.width))
      await expect(initialImage).toHaveAttribute("height", String(expectedFinal.height))
      const initialReference = await screenshotReference(initialImage)
      expect(initialReference).toEqual(expectedFinal)
      await expect(
        page.locator(".study-context-panel").getByText(run.task, { exact: true }),
      ).toHaveText(run.task)
      await capture(page, locale, viewport, "initial")

      const context = page.locator(".study-context")
      await expect(context).toHaveCSS("overflow", "visible")
      await expect(page.locator(".study-context-scroll").first()).toHaveCSS("overflow-y", "auto")

      const items = page.locator(".execution-rail-list .execution-rail-item")
      const viewedStep = items.nth(3)
      await tabUntilFocused(page, viewedStep)
      await expect(viewedStep).toBeFocused()
      await expect(viewedStep).toHaveCSS("outline-style", "solid")

      await viewedStep.click()
      await expect(page.getByText(text.beforeStep4)).toBeVisible()
      await expect(page.locator(".page-screenshot")).toHaveAttribute("src", runFrame.step4)
      const episode04Reference = await screenshotReference(page.locator(".page-screenshot"))

      if (studyCondition === "baseline") {
        await expect(page.getByRole("table")).toHaveCount(0)
      } else {
        await expect(page.getByRole("table", { name: text.offeredOperations })).toBeVisible()
        await expect(page.getByRole("table", { name: text.offeredTargets })).toBeVisible()
        await expect(page.getByRole("table").locator("tbody button")).toHaveCount(0)
        await expect(page.getByRole("table").locator("tbody a")).toHaveCount(0)
        await expect(
          page.getByRole("table").locator("tbody input, tbody textarea, tbody select"),
        ).toHaveCount(0)
      }

      await items.last().click()
      await expect(page.getByRole("heading", { name: text.finalState })).toBeVisible()
      await expect(page.locator(".browser-state-label")).toHaveText(text.lastRecordedState)
      const restoredFinalImage = page.locator(".page-screenshot")
      await expect(restoredFinalImage).toHaveAttribute("src", expectedFinal.path)
      await expect(restoredFinalImage).toHaveAttribute("width", String(expectedFinal.width))
      await expect(restoredFinalImage).toHaveAttribute("height", String(expectedFinal.height))
      const finalReference = await screenshotReference(restoredFinalImage)
      expect(finalReference).toEqual(initialReference)
      await viewedStep.click()
      await expect(page.getByText(text.beforeStep4)).toBeVisible()

      const mark = page.getByRole("combobox", { name: text.localizationPrompt })
      await tabUntilFocused(page, mark)
      await expect(mark).toBeFocused()
      await expect(mark).toHaveCSS("outline-style", "solid")

      const rail = page.locator(".execution-rail-list")
      const inspector = page.locator(".study-inspector-panel")
      const viewer = page.locator(".browser-viewport")
      await expect(rail).toHaveCSS("overflow-y", "auto")
      await expect(inspector).toHaveCSS("overflow-y", "auto")
      await expect
        .poll(() => viewer.evaluate((element) => element.scrollHeight > element.clientHeight))
        .toBe(false)
      await rail.evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      await expect.poll(() => inspector.evaluate((element) => element.scrollTop)).toBe(0)
      await expect.poll(() => viewer.evaluate((element) => element.scrollTop)).toBe(0)
      await rail.evaluate((element) => {
        element.scrollTop = 0
      })
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
          ),
        )
        .toBe(0)
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollHeight - document.documentElement.clientHeight,
          ),
        )
        .toBe(0)

      await mark.selectOption("episode-04")
      await expect(page.getByRole("combobox", { name: text.localizationPrompt })).toHaveValue(
        "episode-04",
      )
      await expect(page.locator('.execution-rail-item[data-marked="true"]')).toHaveCount(1)
      await expect(page.locator('.execution-rail-item[data-marked="true"]')).toContainText(
        locale === "en" ? "Your mark" : "你的标记",
      )
      await page.locator('.execution-rail-item[data-marked="true"]').scrollIntoViewIfNeeded()
      await capture(page, locale, viewport, "historical-mark")

      const explanation = page.getByRole("textbox", { name: text.explanationPrompt })
      const explanationText = locale === "zh" ? "证".repeat(500) : "x".repeat(500)
      await explanation.fill(explanationText)
      await expect(explanation).toHaveValue(explanationText)
      await expect(page.getByText("500/500")).toBeVisible()

      await page
        .getByRole("combobox", { name: text.localizationPrompt })
        .selectOption("cannot-determine")
      await expect(page.locator('.execution-rail-item[data-marked="true"]')).toHaveCount(0)
      await expect(page.getByText(text.beforeStep4)).toBeVisible()
      await expect(page.locator(".page-screenshot")).toHaveAttribute("src", runFrame.step4)
      await expect(explanation).toHaveValue(explanationText)
      await capture(page, locale, viewport, "uncertainty")

      const controls = {
        viewedStep: await box(viewedStep),
        final: await box(items.last()),
        accept: await box(page.getByRole("button", { name: text.accept, exact: true })),
        reject: await box(page.getByRole("button", { name: text.reject, exact: true })),
        localization: await box(page.getByRole("combobox", { name: text.localizationPrompt })),
        explanation: await box(explanation),
        submit: await box(page.getByRole("button", { name: text.submit, exact: true })),
      }
      const panes = {
        context: await box(context),
        rail: await box(page.locator(".execution-rail")),
        page: await box(page.locator(".study-page")),
        inspector: await box(inspector),
        response: await box(page.locator(".study-response")),
      }
      const actionOrder = await page
        .locator(".execution-rail-list > li:not(:last-child) .execution-rail-action")
        .allTextContents()

      await page.getByRole("button", { name: text.reject, exact: true }).click()
      await page.getByRole("button", { name: text.submit, exact: true }).click()
      await expect(page.getByText(text.submitted)).toBeVisible()
      await expect(explanation).toBeDisabled()
      await page.locator(".study-response").evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      await capture(page, locale, viewport, "submitted")

      await writeReport(locale, viewport, {
        schemaVersion: "study-equivalence/1",
        condition: studyCondition,
        locale,
        viewport,
        screenshots: {
          initial: initialReference,
          final: finalReference,
          episode04: episode04Reference,
        },
        panes,
        controls,
        actionOrder,
      })

      expect(actionOrder).toEqual(run.episodes.map((episode) => episode.action))
    })
  }
}
