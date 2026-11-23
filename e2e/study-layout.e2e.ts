import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { expect, type Locator, type Page, test } from "@playwright/test"
import { studyConditionFromEnvironment } from "../scripts/study-condition.ts"
import type { StudyRun } from "../src/domain/study-run-schema.ts"
import type { Locale } from "../src/i18n/locale.ts"
import type { StudyEquivalenceReport } from "../tests/fixtures/study-builds.ts"
import { representativeRunId, runFrame, runScreenshotSize, runUrl } from "./run.ts"

const studyCondition = studyConditionFromEnvironment()

const viewports = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
] as const

const copy = {
  zh: {
    executionOverview: "执行概览",
    originalTask: "原始任务",
    accept: "符合原始任务",
    reject: "不符合原始任务",
    submit: "提交评估",
    explanationPrompt: /简短说明/,
    finalState: "最终状态",
    lastRecordedState: "最后一次录制的状态",
    beforeStep3: "第 3 步操作前 · 共 4 步",
    beforeStep4: "第 4 步操作前 · 共 4 步",
    whatTheAgentDid: "Agent 执行的操作",
    whatItClicked: "Agent 点击的目标",
    submitted: "评估仅记录在本页。",
  },
  en: {
    executionOverview: "Execution overview",
    originalTask: "Original task",
    accept: "Fulfills the request",
    reject: "Does not fulfill the request",
    submit: "Submit assessment",
    explanationPrompt: /short explanation/i,
    finalState: "Final state",
    lastRecordedState: "Last recorded state",
    beforeStep3: "Before step 3 of 4",
    beforeStep4: "Before step 4 of 4",
    whatTheAgentDid: "What the agent did",
    whatItClicked: "What it clicked",
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

async function expectFinalHasNoChoiceCards(page: Page): Promise<void> {
  await expect(page.locator(".decision-choice-group")).toHaveCount(0)
  await expect(page.locator('[data-choice="chosen"]')).toHaveCount(0)
  await expect(page.locator('[data-choice="alternative"]')).toHaveCount(0)
}

async function expectStepFourChoiceCards(page: Page): Promise<void> {
  if (studyCondition === "baseline") {
    await expect(page.locator(".decision-choice-group")).toHaveCount(0)
    await expect(page.locator('[data-choice="alternative"]')).toHaveCount(0)
    return
  }

  await expect(page.locator(".decision-choice-group")).toHaveCount(2)
  await expect(
    page.locator('[data-choice-kind="actions"] [data-choice="alternative"]'),
  ).toHaveCount(1)
  await expect(page.locator('[data-choice-kind="things"] [data-choice="alternative"]')).toHaveCount(
    0,
  )
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
      const taskStrip = page.locator(".study-task-strip")
      const taskSummary = taskStrip.locator("summary")
      await expect(taskStrip).toHaveCount(1)
      await expect(taskSummary).toContainText(text.originalTask)
      await expect(taskStrip.locator(".study-task-excerpt")).toHaveText(run.task)
      await expect(taskStrip.locator(".study-task-text")).toHaveText(run.task)
      await taskSummary.click()
      await expect(taskStrip).toHaveAttribute("open", "")
      await expect(taskStrip.locator(".study-task-text")).toHaveText(run.task)
      await expect
        .poll(() => taskStrip.evaluate((element) => element.scrollWidth - element.clientWidth))
        .toBe(0)
      await taskSummary.click()
      await expect(taskStrip).not.toHaveAttribute("open", "")
      await capture(page, locale, viewport, "initial")

      const context = page.locator(".study-context")
      await expect(context).toHaveCSS("overflow", "visible")

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
        await expect(page.locator(".decision-choice-group")).toHaveCount(0)
      } else {
        await expect(page.locator(".decision-choice-group")).toHaveCount(2)
        await expect(
          page.locator('[data-choice-kind="actions"]').getByRole("heading", {
            name: text.whatTheAgentDid,
          }),
        ).toBeVisible()
        await expect(
          page.locator('[data-choice-kind="things"]').getByRole("heading", {
            name: text.whatItClicked,
          }),
        ).toBeVisible()
        await expect(
          page.locator('[data-choice-kind="actions"] [data-choice="alternative"]'),
        ).toHaveCount(1)
        await expect(
          page.locator('[data-choice-kind="things"] [data-choice="alternative"]'),
        ).toHaveCount(0)
        await expect(
          page.locator(
            '[data-choice="alternative"] button, [data-choice="alternative"] a, [data-choice="alternative"] [tabindex]',
          ),
        ).toHaveCount(0)
      }

      const review = page.locator(".study-page")
      await items.nth(2).click()
      await expect(page.getByText(text.beforeStep3)).toBeVisible()

      if (studyCondition !== "baseline") {
        const actions = page.locator('[data-choice-kind="actions"]')
        const things = page.locator('[data-choice-kind="things"]')
        const actionToggle = actions.locator("button[aria-expanded]")
        const thingToggle = things.locator("button[aria-expanded]")
        const initialActionCards = await actions.locator('[data-choice="alternative"]').count()
        const initialThingCards = await things.locator('[data-choice="alternative"]').count()
        await actionToggle.click()
        await thingToggle.click()
        await expect(actionToggle).toHaveAttribute("aria-expanded", "true")
        await expect(thingToggle).toHaveAttribute("aria-expanded", "true")
        expect(await actions.locator('[data-choice="alternative"]').count()).toBeGreaterThan(
          initialActionCards,
        )
        expect(await things.locator('[data-choice="alternative"]').count()).toBeGreaterThan(
          initialThingCards,
        )
        await capture(page, locale, viewport, "expanded")

        await review.evaluate((element) => {
          element.scrollTop = element.scrollHeight
        })
        await expect(things.locator('[data-choice="alternative"]').last()).toBeInViewport()
        await expect(page.getByRole("button", { name: text.submit, exact: true })).toBeInViewport()
        await expect
          .poll(() =>
            page.evaluate(
              () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
            ),
          )
          .toBe(0)
        await capture(page, locale, viewport, "expanded-last")
      }

      await review.evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      await viewedStep.click()
      await expect(page.getByText(text.beforeStep4)).toBeVisible()
      await expect(viewedStep).toBeFocused()
      await expect.poll(() => review.evaluate((element) => element.scrollTop)).toBe(0)
      if (studyCondition !== "baseline") {
        await expect(
          page.locator('.decision-choice-group button[aria-expanded="true"]'),
        ).toHaveCount(0)
      }

      await items.last().click()
      await expect(page.getByRole("heading", { name: text.finalState })).toBeVisible()
      await expect(page.locator(".browser-state-label")).toHaveText(text.lastRecordedState)
      await expectFinalHasNoChoiceCards(page)
      const restoredFinalImage = page.locator(".page-screenshot")
      await expect(restoredFinalImage).toHaveAttribute("src", expectedFinal.path)
      await expect(restoredFinalImage).toHaveAttribute("width", String(expectedFinal.width))
      await expect(restoredFinalImage).toHaveAttribute("height", String(expectedFinal.height))
      const finalReference = await screenshotReference(restoredFinalImage)
      expect(finalReference).toEqual(initialReference)
      await viewedStep.click()
      await expect(page.getByText(text.beforeStep4)).toBeVisible()
      await expectStepFourChoiceCards(page)

      const explanation = page.getByRole("textbox", { name: text.explanationPrompt })
      await tabUntilFocused(page, explanation)
      await expect(explanation).toBeFocused()
      await expect(explanation).toHaveCSS("outline-style", "solid")
      await expect(page.getByRole("combobox")).toHaveCount(0)

      const rail = page.locator(".execution-rail-list")
      const viewer = page.locator(".browser-viewport")
      await expect(rail).toHaveCSS("overflow-y", "auto")
      await expect(review).toHaveCSS("overflow-y", "auto")
      await expect(review).toHaveCSS("scrollbar-gutter", "stable")
      await expect
        .poll(() => viewer.evaluate((element) => element.scrollHeight > element.clientHeight))
        .toBe(false)
      await expect
        .poll(() => viewer.evaluate((element) => element.scrollWidth > element.clientWidth))
        .toBe(false)
      await expect
        .poll(() =>
          page
            .locator(".page-screenshot")
            .evaluate((element) => getComputedStyle(element).objectFit),
        )
        .toBe("contain")
      // Tabbing to the inline count buttons may have scrolled the review column.
      await review.evaluate((element) => {
        element.scrollTop = 0
      })
      await rail.evaluate((element) => {
        element.scrollTop = element.scrollHeight
      })
      await expect.poll(() => review.evaluate((element) => element.scrollTop)).toBe(0)
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

      const explanationText = locale === "zh" ? "证".repeat(500) : "x".repeat(500)
      await explanation.fill(explanationText)
      await expect(explanation).toHaveValue(explanationText)
      await expect(page.getByText("500/500")).toBeVisible()

      await items.last().click()
      await expect(page.getByRole("heading", { name: text.finalState })).toBeVisible()
      await expect(explanation).toHaveValue(explanationText)
      await expectFinalHasNoChoiceCards(page)
      await viewedStep.click()
      await expect(page.getByText(text.beforeStep4)).toBeVisible()
      await expectStepFourChoiceCards(page)
      await expect(page.locator(".page-screenshot")).toHaveAttribute("src", runFrame.step4)
      await expect(explanation).toHaveValue(explanationText)
      await expect(page.locator("[data-marked]")).toHaveCount(0)
      await expect
        .poll(() => taskStrip.evaluate((element) => element.hasAttribute("open")))
        .toBe(false)
      if (studyCondition !== "baseline") {
        await expect(
          page.locator('.decision-choice-group button[aria-expanded="true"]'),
        ).toHaveCount(0)
      }
      await review.evaluate((element) => {
        element.scrollTop = 0
      })
      await expect.poll(() => review.evaluate((element) => element.scrollTop)).toBe(0)
      await capture(page, locale, viewport, "draft")

      const controls = {
        task: await box(taskSummary),
        viewedStep: await box(viewedStep),
        final: await box(items.last()),
        accept: await box(page.getByRole("button", { name: text.accept, exact: true })),
        reject: await box(page.getByRole("button", { name: text.reject, exact: true })),
        explanation: await box(explanation),
        submit: await box(page.getByRole("button", { name: text.submit, exact: true })),
      }
      const panes = {
        context: await box(context),
        rail: await box(page.locator(".execution-rail")),
        review: await box(review),
        browserFrame: await box(page.locator(".browser-frame")),
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
        schemaVersion: "study-equivalence/2",
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
