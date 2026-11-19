import { expect, type Locator, type Page, test } from "@playwright/test"

const localeCopy = {
  zh: {
    url: "/?lang=zh",
    accept: "符合原始任务",
    reject: "不符合原始任务",
    submit: "提交评估",
    localizationPrompt: "哪一步包含 Agent 最早的错误操作？",
    desktopOnlyTitle: "请在桌面窗口中使用浏览助手",
  },
  en: {
    url: "/?lang=en",
    accept: "Fulfills the request",
    reject: "Does not fulfill the request",
    submit: "Submit assessment",
    localizationPrompt: "Which step contains the agent's earliest mistaken action?",
    desktopOnlyTitle: "Please use Browser Assistant in a desktop window",
  },
} as const

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
  if (hex === undefined) throw new Error("Expected a hex color, got undefined")
  const normalized = /^#[\da-f]{3}$/i.test(hex)
    ? `#${hex
        .slice(1)
        .split("")
        .map((channel) => `${channel}${channel}`)
        .join("")}`
    : hex
  if (!/^#[\da-f]{6}$/i.test(normalized)) {
    throw new Error(`Expected a six-digit hex color, got ${hex}`)
  }
  const linearChannel = (offset: number) => {
    const channel = Number.parseInt(normalized.slice(offset, offset + 2), 16) / 255
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
  for (let press = 0; press < 120; press += 1) {
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

test("uses the proposed neutral theme tokens", async ({ page }) => {
  await page.goto("/?lang=en")
  const tokens = await readTokens(page, tokenNames)

  expect(tokens).toEqual({
    "--canvas": "#f6f7f8",
    "--surface-primary": "#fff",
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
    "--scrim": "#181a2094",
    "--focus-ring": "#5158b8",
    "--shadow-browser": "0 1px 2px #181a200f",
    "--radius-control": "6px",
    "--radius-surface": "8px",
    "--radius-panel": "10px",
    "--radius-composer": "8px",
  })
})

test("keeps enabled text and focus colors legible", async ({ page }) => {
  await page.goto("/?lang=en")
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
  await expect(page.locator(".status-badge")).toHaveCSS("background-color", "rgb(247, 248, 250)")
  await expect(page.locator(".study-inspector")).toHaveCSS("box-shadow", "none")
  await expect(page.locator(".execution-rail-item").first()).toHaveCSS("box-shadow", "none")
  await expect(page.locator(".study-context-panel").first()).toHaveCSS("box-shadow", "none")
})

test("removes card elevation without losing historical selection", async ({ page }) => {
  await page.goto("/?lang=en")
  await page.evaluate(() => document.fonts.ready)

  await page.locator(".execution-rail-item").nth(2).click()
  const item = page.locator('.execution-rail-item[data-viewed="true"]')
  await expect(item).toHaveCount(1)
  await expect(item).toHaveCSS("background-color", "rgb(240, 241, 251)")
  await expect(item).toHaveCSS("box-shadow", /rgb\(81, 88, 184\) 2px 0px 0px 0px inset/)

  await page.locator(".execution-rail-item").last().click()
  await expect(page.locator('.execution-rail-item[data-viewed="true"]')).toHaveCount(1)
  await expect(page.locator(".execution-rail-item").last()).toHaveAttribute("data-viewed", "true")
  await expect(page.locator(".execution-rail-item").first()).toHaveCSS("box-shadow", "none")
})

test("keeps keyboard focus visible on replay and response controls", async ({ page }) => {
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

    const railStep = page.locator(".execution-rail-item").nth(3)
    await tabUntilFocused(page, railStep)
    await expectVisibleFocusRing(railStep)

    const assessment = page.getByRole("button", { name: "Fulfills the request", exact: true })
    await tabUntilFocused(page, assessment)
    await expectVisibleFocusRing(assessment)

    const mark = page.getByRole("combobox", { name: /earliest mistaken action/i })
    await tabUntilFocused(page, mark)
    await expectVisibleFocusRing(mark)
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
    await page
      .getByRole("combobox", { name: copy.localizationPrompt })
      .selectOption("cannot-determine")
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
