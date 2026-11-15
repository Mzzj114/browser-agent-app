import { expect, type Locator, type Page, test } from "@playwright/test"

import agentRunEnFixture from "../src/data/agent-run.en.json" with { type: "json" }
import agentRunZhFixture from "../src/data/agent-run.json" with { type: "json" }

const fixtureRuns = {
  zh: agentRunZhFixture,
  en: agentRunEnFixture,
} as const

type FixtureRun = (typeof fixtureRuns)["zh" | "en"]

const localeCopy = {
  zh: {
    url: "/?lang=zh",
    browserLabel: "Agent 浏览器",
    jumpToStep: "跳转步骤",
    returnToFinal: "返回最后录制状态",
    lastRecordedState: "最后一次录制的状态",
    accept: "符合原始任务",
    reject: "不符合原始任务",
    submit: "提交评估",
    step3Article: "步骤 3",
    step3ViewPage: "步骤 3，提交搜索：查看页面",
    step3ViewingPage: "步骤 3，提交搜索：正在查看页面",
    step3StateLabel: "步骤 3 / 8 · 此步之后录制",
    step3TechnicalDetails: "技术细节 · 1 个 Python 单元",
    desktopOnlyTitle: "请在桌面窗口中使用浏览助手",
  },
  en: {
    url: "/?lang=en",
    browserLabel: "Agent browser",
    jumpToStep: "Jump to step",
    returnToFinal: "Return to last recorded state",
    lastRecordedState: "Last recorded state",
    accept: "Fulfills the request",
    reject: "Does not fulfill the request",
    submit: "Submit assessment",
    step3Article: "Step 3",
    step3ViewPage: "Step 3, Submitted the search: view page",
    step3ViewingPage: "Step 3, Submitted the search: viewing page",
    step3StateLabel: "Step 3 / 8 · recorded after this step",
    step3TechnicalDetails: "Technical details · 1 Python cell",
    desktopOnlyTitle: "Please use Browser Assistant in a desktop window",
  },
} as const

function fixtureStep(run: FixtureRun, ordinal: number) {
  const step = run.steps.find((candidate) => candidate.ordinal === ordinal)
  if (step === undefined) throw new Error(`fixture run has no step ${ordinal}`)
  return step
}

function finalScreenshot(run: FixtureRun) {
  const step = run.steps.at(-1)
  if (step === undefined) throw new Error("fixture run has no steps")
  return step.pageState.screenshot
}

function fixtureCellCode(run: FixtureRun, ordinal: number): string {
  const cell = fixtureStep(run, ordinal).cells.at(0)
  if (cell === undefined) throw new Error(`fixture step ${ordinal} has no cells`)
  return cell.code
}

const tokenNames = [
  "--canvas",
  "--surface-primary",
  "--surface-secondary",
  "--surface-sunken",
  "--surface-hover",
  "--surface-selected",
  "--text-primary",
  "--text-secondary",
  "--text-tertiary",
  "--text-disabled",
  "--border-default",
  "--border-strong",
  "--accent-primary",
  "--accent-hover",
  "--accent-border",
  "--accent-soft",
  "--code-text",
  "--error-text",
  "--error-surface",
  "--scrim",
  "--focus-ring",
  "--shadow-browser",
  "--radius-control",
  "--radius-surface",
  "--radius-panel",
  "--radius-composer",
] as const

async function readTokens(page: Page, names: readonly string[]): Promise<Record<string, string>> {
  return page.evaluate((tokens) => {
    const style = getComputedStyle(document.documentElement)
    return Object.fromEntries(tokens.map((name) => [name, style.getPropertyValue(name).trim()]))
  }, names)
}

function relativeLuminance(hex: string | undefined): number {
  if (hex === undefined || !/^#[\da-f]{6}$/i.test(hex)) {
    throw new Error(`Expected a six-digit hex color, got ${hex}`)
  }
  const linearChannel = (offset: number) => {
    const channel = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linearChannel(1) + 0.7152 * linearChannel(3) + 0.0722 * linearChannel(5)
}

function contrastRatio(foreground: string | undefined, background: string | undefined): number {
  const a = relativeLuminance(foreground)
  const b = relativeLuminance(background)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

async function tabUntilFocused(page: Page, target: Locator): Promise<void> {
  for (let press = 0; press < 80; press += 1) {
    if (await target.evaluate((element) => element === document.activeElement)) {
      return
    }
    await page.keyboard.press("Tab")
  }
  throw new Error("target was not reached with Tab navigation")
}

type Appearance = {
  readonly color: string
  readonly backgroundColor: string
  readonly borderColor: readonly string[]
  readonly borderWidth: readonly string[]
  readonly borderStyle: readonly string[]
  readonly borderRadius: string
  readonly boxShadow: string
  readonly fontSize: string
  readonly fontWeight: string
  readonly padding: readonly string[]
}

/** Reads the settled visual treatment of a control, without text content or focus outline. */
async function readAppearance(locator: Locator): Promise<Appearance> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      color: style.color,
      backgroundColor: style.backgroundColor,
      borderColor: [
        style.borderTopColor,
        style.borderRightColor,
        style.borderBottomColor,
        style.borderLeftColor,
      ],
      borderWidth: [
        style.borderTopWidth,
        style.borderRightWidth,
        style.borderBottomWidth,
        style.borderLeftWidth,
      ],
      borderStyle: [
        style.borderTopStyle,
        style.borderRightStyle,
        style.borderBottomStyle,
        style.borderLeftStyle,
      ],
      borderRadius: style.borderRadius,
      boxShadow: style.boxShadow,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight,
      padding: [style.paddingTop, style.paddingRight, style.paddingBottom, style.paddingLeft],
    }
  })
}

type FocusOutline = {
  readonly outlineStyle: string
  readonly outlineWidth: string
  readonly outlineColor: string
  readonly outlineOffset: string
}

async function readFocusOutline(locator: Locator): Promise<FocusOutline> {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element)
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      outlineOffset: style.outlineOffset,
    }
  })
}

async function boundingBoxOf(locator: Locator) {
  const box = await locator.boundingBox()
  if (box === null) throw new Error("element has no bounding box")
  return box
}

function expectPixelClose(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(1)
}

test("uses the proposed neutral theme tokens", async ({ page }) => {
  await page.goto("/")
  const tokens = await readTokens(page, tokenNames)

  expect(tokens).toEqual({
    "--canvas": "#f6f7f8",
    "--surface-primary": "#ffffff",
    "--surface-secondary": "#f7f8fa",
    "--surface-sunken": "#eef0f2",
    "--surface-hover": "#f0f2f5",
    "--surface-selected": "#f0f1fb",
    "--text-primary": "#25272c",
    "--text-secondary": "#555d68",
    "--text-tertiary": "#646d79",
    "--text-disabled": "#8b919b",
    "--border-default": "#dde1e6",
    "--border-strong": "#c5cbd3",
    "--accent-primary": "#5158b8",
    "--accent-hover": "#444ba3",
    "--accent-border": "#a9afe6",
    "--accent-soft": "#e3e6fa",
    "--code-text": "#343a46",
    "--error-text": "#b42318",
    "--error-surface": "#fff4f2",
    "--scrim": "rgb(24 26 32 / 58%)",
    "--focus-ring": "#5158b8",
    "--shadow-browser": "0 1px 2px rgb(24 26 32 / 6%)",
    "--radius-control": "6px",
    "--radius-surface": "8px",
    "--radius-panel": "10px",
    "--radius-composer": "8px",
  })
})

test("keeps enabled text and focus colors legible", async ({ page }) => {
  await page.goto("/")
  const tokens = await readTokens(page, tokenNames)

  expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5)
  expect(contrastRatio("#ffffff", "#ffffff")).toBe(1)

  const textSurfaces = [
    "--surface-primary",
    "--surface-secondary",
    "--surface-hover",
    "--surface-selected",
    "--surface-sunken",
    "--canvas",
  ]
  for (const text of ["--text-primary", "--text-secondary", "--text-tertiary"]) {
    for (const surface of textSurfaces) {
      expect(
        contrastRatio(tokens[text], tokens[surface]),
        `${text} on ${surface}`,
      ).toBeGreaterThanOrEqual(4.5)
    }
  }

  for (const surface of ["--surface-primary", "--surface-secondary"]) {
    expect(
      contrastRatio(tokens["--code-text"], tokens[surface]),
      `--code-text on ${surface}`,
    ).toBeGreaterThanOrEqual(4.5)
  }

  expect(
    contrastRatio(tokens["--error-text"], tokens["--error-surface"]),
    "--error-text on --error-surface",
  ).toBeGreaterThanOrEqual(4.5)

  const controlSurfaces = [
    "--surface-primary",
    "--surface-secondary",
    "--surface-hover",
    "--canvas",
    "--surface-selected",
  ]
  for (const surface of controlSurfaces) {
    expect(
      contrastRatio(tokens["--accent-primary"], tokens[surface]),
      `--accent-primary on ${surface}`,
    ).toBeGreaterThanOrEqual(4.5)
    expect(
      contrastRatio(tokens["--focus-ring"], tokens[surface]),
      `--focus-ring on ${surface}`,
    ).toBeGreaterThanOrEqual(3)
  }
})

test("uses neutral static identity styling", async ({ page }) => {
  await page.goto("/?lang=en")
  await page.evaluate(() => document.fonts.ready)

  await expect(page.locator(".brand-icon")).toHaveCSS("color", "rgb(85, 93, 104)")
  await expect(page.locator('.message-block[data-speaker="assistant"] .message-avatar')).toHaveCSS(
    "background-color",
    "rgb(247, 248, 250)",
  )
  await expect(page.locator(".agent-prompt-model svg")).toHaveCSS("color", "rgb(85, 93, 104)")
  await expect(page.locator(".agent-prompt-field")).toHaveCSS("box-shadow", "none")
  await expect(page.locator(".replay-bar")).toHaveCSS("box-shadow", "none")
  await expect(page.locator(".step-card").first()).toHaveCSS("box-shadow", "none")

  const avatarStyle = (speaker: string) =>
    page
      .locator(`.message-block[data-speaker="${speaker}"] .message-avatar`)
      .evaluate((element) => {
        const style = getComputedStyle(element)
        return {
          color: style.color,
          backgroundColor: style.backgroundColor,
          borderColor: style.borderTopColor,
          borderWidth: style.borderTopWidth,
          borderStyle: style.borderTopStyle,
        }
      })
  expect(await avatarStyle("assistant")).toEqual(await avatarStyle("user"))
})

test("removes card elevation without losing historical selection", async ({ page }) => {
  await page.goto("/?lang=en")
  await page.evaluate(() => document.fonts.ready)

  // Replay menu values are zero-based; index 2 is recorded step 3.
  await page.getByRole("combobox", { name: "Jump to step" }).selectOption("2")
  const step = page.locator('.step-card[data-selected="true"]')
  const stepButton = step.locator(".step-select")
  await expect(stepButton).toHaveAttribute("aria-pressed", "true")
  await expect(step).toHaveCSS("background-color", "rgb(240, 241, 251)")
  await expect(step).toHaveCSS("box-shadow", /rgb\(81, 88, 184\) 2px 0px 0px 0px inset/)

  await page.getByRole("combobox", { name: "Jump to step" }).selectOption("final")
  await expect(page.locator('.step-card[data-selected="true"]')).toHaveCount(0)
  await expect(page.locator(".step-card").first()).toHaveCSS("box-shadow", "none")
})

test("keeps keyboard focus visible on replay and assessment controls", async ({ page }) => {
  const expectVisibleFocusRing = async (target: Locator) => {
    await expect(target).toBeFocused()
    await expect(target.evaluate((element) => element.matches(":focus-visible"))).resolves.toBe(
      true,
    )
    await expect(target).toHaveCSS("outline-style", "solid")
    await expect(target).toHaveCSS("outline-width", "3px")
    await expect(target).toHaveCSS("outline-color", "rgb(81, 88, 184)")
    await expect(target).toHaveCSS("outline-offset", "2px")
  }

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    await page.emulateMedia({ reducedMotion })
    await page.goto("/?lang=en")
    await page.evaluate(() => document.fonts.ready)

    const replaySelect = page.getByRole("combobox", { name: "Jump to step" })
    await tabUntilFocused(page, replaySelect)
    await expectVisibleFocusRing(replaySelect)

    const assessment = page.getByRole("button", { name: "Fulfills the request", exact: true })
    await tabUntilFocused(page, assessment)
    await expectVisibleFocusRing(assessment)
    await expect(
      assessment.evaluate((element) => {
        const scroller = element.closest(".chat-scroll")
        if (!(scroller instanceof HTMLElement)) throw new Error("Missing chat scroll container")
        const box = element.getBoundingClientRect()
        const viewport = scroller.getBoundingClientRect()
        return box.top >= viewport.top && box.bottom <= viewport.bottom
      }),
    ).resolves.toBe(true)
  }
})

// Choice symmetry: neither fulfillment answer may be styled more prominently than the other.
for (const locale of ["zh", "en"] as const) {
  test(`${locale}: gives both fulfillment answers equivalent treatment in every decision state`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" })
    const copy = localeCopy[locale]
    await page.goto(copy.url)
    await page.evaluate(() => document.fonts.ready)

    const accepted = page.getByRole("button", { name: copy.accept, exact: true })
    const rejected = page.getByRole("button", { name: copy.reject, exact: true })
    const submit = page.getByRole("button", { name: copy.submit, exact: true })
    const hoverSurface = "rgb(240, 242, 245)" // --surface-hover
    const selectedSurface = "rgb(240, 241, 251)" // --surface-selected

    // Default state, before any selection.
    expect(await readAppearance(accepted)).toEqual(await readAppearance(rejected))
    const acceptedBounds = await boundingBoxOf(accepted)
    const rejectedBounds = await boundingBoxOf(rejected)
    expect(Math.abs(acceptedBounds.width - rejectedBounds.width)).toBeLessThanOrEqual(1)
    expect(Math.abs(acceptedBounds.height - rejectedBounds.height)).toBeLessThanOrEqual(1)

    // Settled hover, one answer at a time.
    await accepted.hover()
    await expect(accepted).toHaveCSS("background-color", hoverSurface)
    const acceptedHover = await readAppearance(accepted)
    await rejected.hover()
    await expect(rejected).toHaveCSS("background-color", hoverSurface)
    const rejectedHover = await readAppearance(rejected)
    expect(acceptedHover).toEqual(rejectedHover)

    // Keyboard focus, compared separately from the outline; the mouse moves off the answers
    // first so the still-hovered answer cannot contaminate the focused comparison.
    await page.mouse.move(0, 0)
    await tabUntilFocused(page, accepted)
    const acceptedFocused = await readAppearance(accepted)
    const acceptedOutline = await readFocusOutline(accepted)
    expect(acceptedOutline.outlineStyle).toBe("solid")
    await page.keyboard.press("Tab")
    await expect(rejected).toBeFocused()
    const rejectedFocused = await readAppearance(rejected)
    const rejectedOutline = await readFocusOutline(rejected)
    expect(acceptedFocused).toEqual(rejectedFocused)
    expect(acceptedOutline).toEqual(rejectedOutline)

    // Tentative selection, one answer at a time.
    await accepted.click()
    await page.mouse.move(0, 0)
    await expect(accepted).toHaveAttribute("data-selected", "true")
    await expect(accepted).toHaveCSS("background-color", selectedSurface)
    await expect(accepted).toHaveCSS("border-top-color", "rgb(169, 175, 230)")
    await expect(accepted).toHaveCSS("color", "rgb(81, 88, 184)")
    const acceptedSelected = await readAppearance(accepted)
    await rejected.click()
    await page.mouse.move(0, 0)
    await expect(rejected).toHaveAttribute("data-selected", "true")
    await expect(rejected).toHaveCSS("background-color", selectedSurface)
    await expect(rejected).toHaveCSS("border-top-color", "rgb(169, 175, 230)")
    await expect(rejected).toHaveCSS("color", "rgb(81, 88, 184)")
    const rejectedSelected = await readAppearance(rejected)
    expect(acceptedSelected).toEqual(rejectedSelected)

    // Submission in fresh loads: the selected submitted styles match and both choices lock.
    await page.goto(copy.url)
    await page.evaluate(() => document.fonts.ready)
    await accepted.click()
    await submit.click()
    await expect(accepted).toBeDisabled()
    await expect(rejected).toBeDisabled()
    await expect(accepted).toHaveCSS("background-color", selectedSurface)
    await expect(accepted).toHaveCSS("border-top-color", "rgb(169, 175, 230)")
    await expect(accepted).toHaveCSS("color", "rgb(81, 88, 184)")
    const acceptedSubmitted = await readAppearance(accepted)

    await page.goto(copy.url)
    await page.evaluate(() => document.fonts.ready)
    await rejected.click()
    await submit.click()
    await expect(accepted).toBeDisabled()
    await expect(rejected).toBeDisabled()
    await expect(rejected).toHaveCSS("background-color", selectedSurface)
    await expect(rejected).toHaveCSS("border-top-color", "rgb(169, 175, 230)")
    await expect(rejected).toHaveCSS("color", "rgb(81, 88, 184)")
    const rejectedSubmitted = await readAppearance(rejected)

    expect(acceptedSubmitted).toEqual(rejectedSubmitted)
  })
}

// Preservation matrix: report exposure and evidence geometry for every study locale/viewport.
const preservationViewports = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
] as const

for (const locale of ["zh", "en"] as const) {
  for (const viewport of preservationViewports) {
    test(`${locale} at ${viewport.width}x${viewport.height} preserves report exposure and evidence geometry`, async ({
      page,
    }) => {
      const run = fixtureRuns[locale]
      const copy = localeCopy[locale]
      const finalShot = finalScreenshot(run)
      const step3 = fixtureStep(run, 3)

      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(copy.url)
      await page.evaluate(() => document.fonts.ready)

      const taskMessage = page.locator('.message-block[data-speaker="user"] .message-content')
      const reportMessage = page.locator(
        '.message-block[data-speaker="assistant"] .message-content',
      )
      const reportBlock = page.locator('.message-block[data-speaker="assistant"]')
      const browserRegion = page.getByRole("region", { name: copy.browserLabel })
      const browserViewport = page.locator(".browser-viewport")
      const chatScroll = page.locator(".chat-scroll")
      const replaySelect = page.getByRole("combobox", { name: copy.jumpToStep })
      const stateLabel = page.locator(".browser-state-label")
      const image = page.locator(".page-screenshot")
      const trigger = page.locator(".screenshot-trigger")

      // Task and report text come verbatim from the locale fixture.
      await expect(taskMessage).toHaveText(run.task)
      await expect(reportMessage).toHaveText(run.final.text)

      // The report stays inside the transcript, ahead of the decision footer, at fixed typography.
      expect(
        await page.evaluate(() => {
          const chat = document.querySelector(".chat-messages")
          const report = chat?.querySelector('.message-block[data-speaker="assistant"]')
          const footer = chat?.querySelector(".decision-footer")
          if (
            !(chat instanceof HTMLElement) ||
            !(report instanceof HTMLElement) ||
            !(footer instanceof HTMLElement)
          ) {
            return "missing transcript pieces"
          }
          const footerFollowsReport =
            (report.compareDocumentPosition(footer) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
          return chat.contains(report) && chat.contains(footer) && footerFollowsReport
            ? "report before footer"
            : "report out of order"
        }),
      ).toBe("report before footer")
      await expect(reportMessage).toHaveCSS("font-size", "16px")
      await expect(reportMessage).toHaveCSS("line-height", "27.2px")
      await expect(reportMessage).toHaveCSS("opacity", "1")

      // Portable pane geometry: header offset, agent-width clamp, chat column insets.
      const headerHeightToken = (await readTokens(page, ["--header-height"]))["--header-height"]
      if (headerHeightToken === undefined) throw new Error("--header-height token is missing")
      const headerHeight = Number.parseInt(headerHeightToken, 10)
      const workspaceBox = await boundingBoxOf(page.locator(".workspace"))
      const agentPanelBox = await boundingBoxOf(page.locator(".agent-panel"))
      const reportBox = await boundingBoxOf(reportBlock)
      // --agent-width: clamp(25rem, 30vw, 27rem) at the 16px root font size.
      const expectedAgentWidth = Math.min(Math.max(400, viewport.width * 0.3), 432)
      expectPixelClose(workspaceBox.x, 0)
      expectPixelClose(workspaceBox.y, headerHeight)
      expectPixelClose(workspaceBox.width, viewport.width)
      expectPixelClose(workspaceBox.height, viewport.height - headerHeight)
      expectPixelClose(agentPanelBox.x, viewport.width - expectedAgentWidth)
      expectPixelClose(agentPanelBox.width, expectedAgentWidth)
      expectPixelClose(agentPanelBox.y, workspaceBox.y)
      expectPixelClose(agentPanelBox.height, workspaceBox.height)
      // The report wraps in the chat column: 1px panel border + 20px chat padding per side.
      expectPixelClose(reportBox.x, agentPanelBox.x + 21)
      expectPixelClose(reportBox.width, agentPanelBox.width - 41)
      await expect.poll(() => chatScroll.evaluate((element) => element.scrollTop)).toBe(0)

      // No page-level overflow; the chat and the browser viewport keep their own scrolling.
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
      await expect(chatScroll).toHaveCSS("overflow-y", "auto")
      await expect(browserViewport).toHaveCSS("overflow", "auto")
      await expect
        .poll(() => chatScroll.evaluate((element) => element.scrollHeight > element.clientHeight))
        .toBe(true)

      // Initial replay state: last recorded state, no selected step, technical details closed.
      await expect(replaySelect).toHaveValue("final")
      await expect(stateLabel).toHaveText(copy.lastRecordedState)
      await expect(page.locator('.step-card[data-selected="true"]')).toHaveCount(0)
      await expect(page.locator(".step-body > .disclosure[open]")).toHaveCount(0)

      // The composer stays disabled with the recorded model visible.
      await expect(page.locator(".agent-prompt textarea")).toBeDisabled()
      await expect(page.locator(".agent-prompt .agent-prompt-send")).toBeDisabled()
      await expect(page.locator(".agent-prompt")).toContainText(run.engine.model)

      // The screenshot is the locale's own last frame at intrinsic size, without filters.
      await expect(image).toHaveAttribute("src", finalShot.path)
      await expect(image).toHaveAttribute("width", String(finalShot.width))
      await expect(image).toHaveAttribute("height", String(finalShot.height))
      await expect(image).toHaveCSS("filter", "none")
      await expect(image).toHaveCSS("opacity", "1")
      await expect(image).toHaveCSS("mix-blend-mode", "normal")

      // Historical step 3: pressed state, caption, its own frame, native code behind details.
      await page.getByRole("button", { name: copy.step3ViewPage, exact: true }).click()
      const step3Card = page.getByRole("article", { name: copy.step3Article, exact: true })
      const step3Button = step3Card.getByRole("button")
      await expect(step3Button).toHaveAttribute("aria-pressed", "true")
      await expect(step3Button).toHaveAccessibleName(copy.step3ViewingPage)
      await expect(step3Card).toHaveAttribute("data-selected", "true")
      await expect(stateLabel).toHaveText(copy.step3StateLabel)
      await expect(browserRegion).toContainText(step3.pageState.title)
      await expect(image).toHaveAttribute("src", step3.pageState.screenshot.path)

      await step3Card.getByText(copy.step3TechnicalDetails, { exact: true }).click()
      await expect(step3Card.locator(".code-block")).toBeVisible()
      await expect(step3Card.locator(".code-block")).toContainText(fixtureCellCode(run, 3))

      await page.getByRole("button", { name: copy.returnToFinal }).click()
      await expect(replaySelect).toHaveValue("final")
      await expect(stateLabel).toHaveText(copy.lastRecordedState)
      await expect(image).toHaveAttribute("src", finalShot.path)

      // Actual size keeps the intrinsic border box with internal scrolling; fit restores.
      await trigger.click()
      await expect(trigger).toHaveAttribute("data-zoomed", "true")
      await expect
        .poll(() =>
          image.evaluate((element) => {
            const rect = element.getBoundingClientRect()
            return `${Math.round(rect.width)}x${Math.round(rect.height)}`
          }),
        )
        .toBe(`${finalShot.width + 2}x${finalShot.height + 2}`)
      await expect
        .poll(() =>
          browserViewport.evaluate((element) => element.scrollWidth > element.clientWidth),
        )
        .toBe(true)
      await expect
        .poll(() =>
          browserViewport.evaluate((element) => element.scrollHeight > element.clientHeight),
        )
        .toBe(true)

      await trigger.click()
      await expect(trigger).toHaveAttribute("data-zoomed", "false")
      await expect
        .poll(() =>
          browserViewport.evaluate((element) => element.scrollWidth > element.clientWidth),
        )
        .toBe(false)
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
    })
  }
}

// Desktop fallback: one pixel below the 1280x720 minimum in either dimension, both locales.
for (const locale of ["zh", "en"] as const) {
  test(`${locale}: keeps the desktop-only fallback at 1279x720 and 1280x719 without page overflow`, async ({
    page,
  }) => {
    const copy = localeCopy[locale]
    for (const size of [
      { width: 1279, height: 720 },
      { width: 1280, height: 719 },
    ]) {
      await page.setViewportSize(size)
      await page.goto(copy.url)
      await expect(
        page.getByRole("heading", { name: copy.desktopOnlyTitle, exact: true }),
      ).toBeVisible()
      await expect(page.locator(".app-shell")).toBeHidden()
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
    }
  })
}
