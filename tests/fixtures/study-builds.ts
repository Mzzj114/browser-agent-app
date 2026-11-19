import { mkdir, mkdtemp, rename, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { writeRunLibrary } from "../../scripts/run-library.ts"
import type { StudyCondition } from "../../src/domain/study-condition.ts"
import { LOCALES, type Locale } from "../../src/i18n/locale.ts"

// biome-ignore lint/complexity/useLiteralKeys: process.env requires bracket access under noPropertyAccessFromIndexSignature.
const localAppData = process.env["LOCALAPPDATA"]
const temporaryRoot = join(localAppData ?? tmpdir(), "Temp", "opencode")

export const fixtureRunId = "F1_add_single_item_clean"

export const comparisonLocales = LOCALES
export const comparisonViewports = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
] as const

export type ComparisonBounds = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export type ComparisonScreenshot = {
  readonly path: string
  readonly width: number
  readonly height: number
}

export type StudyEquivalenceReport = {
  readonly schemaVersion: "study-equivalence/1"
  readonly condition: StudyCondition
  readonly locale: Locale
  readonly viewport: { readonly width: number; readonly height: number }
  readonly screenshots: {
    readonly initial: ComparisonScreenshot
    readonly final: ComparisonScreenshot
    readonly episode04: ComparisonScreenshot
  }
  readonly panes: Readonly<Record<string, ComparisonBounds>>
  readonly controls: Readonly<Record<string, ComparisonBounds>>
  readonly actionOrder: readonly string[]
}

function comparisonBounds(offset: number): ComparisonBounds {
  return {
    x: 16 + offset,
    y: 72 + offset,
    width: 320 - offset,
    height: 240 - offset,
  }
}

export function studyEquivalenceReport(
  condition: StudyCondition,
  locale: Locale,
  viewport: { readonly width: number; readonly height: number },
): StudyEquivalenceReport {
  const prefix = locale === "en" ? "screenshots/en/" : "screenshots/"
  const screenshot = (name: string, width: number, height: number): ComparisonScreenshot => ({
    path: `${prefix}${name}.webp`,
    width,
    height,
  })

  return {
    schemaVersion: "study-equivalence/1",
    condition,
    locale,
    viewport,
    screenshots: {
      initial: screenshot("08-cart", 1202, 802),
      final: screenshot("08-cart", 1202, 802),
      episode04: screenshot("04-sorted", 1202, 802),
    },
    panes: {
      context: comparisonBounds(0),
      rail: comparisonBounds(1),
      page: comparisonBounds(2),
      inspector: comparisonBounds(3),
      response: comparisonBounds(4),
    },
    controls: {
      jump: comparisonBounds(5),
      previous: comparisonBounds(6),
      next: comparisonBounds(7),
      final: comparisonBounds(8),
      mark: comparisonBounds(9),
      accept: comparisonBounds(10),
      reject: comparisonBounds(11),
      localization: comparisonBounds(12),
      explanation: comparisonBounds(13),
      submit: comparisonBounds(14),
    },
    actionOrder: [
      "Typed “red running shoes”",
      "Submitted the search",
      "Clicked Best selling",
      "Opened “Cloud Walk Red Sneakers”",
      "Selected size 42",
      "Added to cart",
      "Opened cart",
      "Reported task completion",
    ],
  }
}

export function comparisonReportPath(
  root: string,
  locale: Locale,
  viewport: { readonly width: number; readonly height: number },
): string {
  return join(
    root,
    "test-results",
    "study-equivalence",
    `${locale}-${viewport.width}x${viewport.height}.json`,
  )
}

export async function writeEquivalenceReports(
  root: string,
  condition: StudyCondition,
  mutate: (report: StudyEquivalenceReport) => StudyEquivalenceReport = (report) => report,
): Promise<void> {
  await Promise.all(
    LOCALES.flatMap((locale) =>
      comparisonViewports.map(async (viewport) => {
        const outputPath = comparisonReportPath(root, locale, viewport)
        await mkdir(dirname(outputPath), { recursive: true })
        await writeFile(
          outputPath,
          `${JSON.stringify(mutate(studyEquivalenceReport(condition, locale, viewport)), null, 2)}\n`,
          "utf8",
        )
      }),
    ),
  )
}

export async function writeComparisonWorktree(condition: StudyCondition): Promise<string> {
  await mkdir(temporaryRoot, { recursive: true })
  const root = await mkdtemp(join(temporaryRoot, "study-worktree-"))
  const build = await writeBuildFixture(condition)
  await rename(build, join(root, "dist"))
  await writeEquivalenceReports(root, condition)
  return root
}

export async function writeBuildFixture(condition: StudyCondition): Promise<string> {
  await mkdir(temporaryRoot, { recursive: true })
  const directory = await mkdtemp(join(temporaryRoot, "study-build-"))

  await writeRunLibrary({
    condition,
    sourceDir: resolve("fixtures", "agent-runs"),
    outputDir: join(directory, "runs"),
    runIds: [fixtureRunId],
  })

  await mkdir(join(directory, "assets"), { recursive: true })
  await Promise.all([
    writeFile(
      join(directory, "index.html"),
      '<!doctype html><html lang="en"><head><title>Study build fixture</title></head><body><div id="root"></div><script type="module" src="./assets/index.js"></script></body></html>\n',
      "utf8",
    ),
    writeFile(
      join(directory, "assets", "index.js"),
      'const root = document.querySelector("#root");\nif (root) root.textContent = "study build fixture";\n',
      "utf8",
    ),
  ])

  return directory
}
