import { expect, type Page, test } from "@playwright/test"

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

function relativeLuminance(hex: string): number {
  const channels = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
  const [r, g, b] = channels.map((channel) =>
    channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(foreground: string, background: string): number {
  const [light, dark] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  )
  return (light + 0.05) / (dark + 0.05)
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
