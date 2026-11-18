import { createHash } from "node:crypto"
import type { Dirent } from "node:fs"
import { readdir, readFile, stat } from "node:fs/promises"
import { isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { loadStudyRuns } from "../src/data/load-study-runs.ts"
import { coreView } from "../src/domain/project-run.ts"
import type { StudyCondition } from "../src/domain/study-condition.ts"
import { studyConditions } from "../src/domain/study-condition.ts"
import type { StudyRun, StudyRuns } from "../src/domain/study-run-schema.ts"
import { LOCALES, type Locale } from "../src/i18n/locale.ts"

export type BuildReport = {
  readonly condition: StudyCondition
  readonly fixtureRevision: string
  readonly coreDigests: Readonly<Record<Locale, string>>
}

const allowedStudyFiles = new Set(["manifest.json", "run.en.json", "run.zh.json"])

const allowedJsonFiles = new Set(["study/manifest.json", "study/run.en.json", "study/run.zh.json"])

const forbiddenPathSegments = new Set([
  ".superpowers",
  "docs",
  "e2e",
  "fixtures",
  "scripts",
  "tests",
])

const canonicalFixtureNames = new Set([
  "shopping.en.json",
  "shopping.zh.json",
  "agent-run.en.json",
  "agent-run.json",
])

const rootFiles = new Set(["index.html", "favicon.svg"])

const assetExtensions = new Set([
  ".avif",
  ".css",
  ".eot",
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".js",
  ".otf",
  ".png",
  ".svg",
  ".ttf",
  ".webp",
  ".woff",
  ".woff2",
])

const screenshotPattern = /^screenshots\/(?:en\/)?[a-z0-9-]+\.webp$/

const textExtensions = new Set([".css", ".html", ".js", ".json", ".svg"])

type LegacySentinel = {
  readonly label: string
  readonly pattern: RegExp
}

const legacySentinels: readonly LegacySentinel[] = [
  { label: "legacy fixture revision", pattern: /fixture_version/ },
  { label: "legacy fixture revision", pattern: /bu-replay\/1/ },
  { label: "legacy Python cell", pattern: /["']?tool["']?\s*:\s*["']python["']/ },
  { label: "legacy thinking field", pattern: /["']?thinking["']?\s*:/ },
  {
    label: "legacy instrumented screenshot source",
    pattern: /["']?source["']?\s*:\s*["']instrumented["']/,
  },
  { label: "researcher annotation", pattern: /["']?annotation_version["']\s*:/ },
  { label: "researcher annotation", pattern: /["']?earliest_mistake(?:_episode_id)?["']\s*:/ },
  {
    label: "researcher ground truth",
    pattern: /["']?(?:expected_product|observed_cart_product|claimed_product)["']\s*:/,
  },
  { label: "undocumented confidence field", pattern: /["']?confidence["']\s*:/ },
]

type BuildFile = {
  readonly absolute: string
  readonly relativePath: string
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(",")}]`
  }
  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left < right ? -1 : left > right ? 1 : 0,
    )
    return `{${entries
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`)
      .join(",")}}`
  }
  return JSON.stringify(value) ?? "null"
}

function digest(value: unknown): string {
  return createHash("sha256").update(stableJson(value)).digest("hex")
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function extensionOf(basename: string): string {
  const index = basename.lastIndexOf(".")
  return index <= 0 ? "" : basename.slice(index).toLowerCase()
}

function isPermittedArtifact(
  lowerPath: string,
  segments: readonly string[],
  basename: string,
): boolean {
  if (rootFiles.has(lowerPath)) return true
  if (allowedJsonFiles.has(lowerPath)) return true
  if (segments.length === 2 && segments[0] === "assets") {
    return assetExtensions.has(extensionOf(basename))
  }
  return screenshotPattern.test(lowerPath)
}

async function collectFiles(directory: string): Promise<readonly BuildFile[]> {
  const files: BuildFile[] = []

  async function visit(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const absolute = join(current, entry.name)
      if (entry.isDirectory()) {
        await visit(absolute)
        continue
      }
      if (!entry.isFile()) {
        throw new Error(`Unexpected non-file build entry: ${relative(directory, absolute)}`)
      }
      files.push({
        absolute,
        relativePath: relative(directory, absolute).split(sep).join("/"),
      })
    }
  }

  await visit(directory)
  return files
}

function assertPermittedPath(buildDirectory: string, file: BuildFile): void {
  const lowerPath = file.relativePath.toLowerCase()
  const segments = lowerPath.split("/")
  const basename = segments.at(-1) ?? ""

  if (segments.some((segment) => segment.startsWith("showcase"))) {
    throw new Error(
      `Study build ${buildDirectory}: developer showcase page emitted at ${file.relativePath}`,
    )
  }

  if (basename.endsWith(".map")) {
    throw new Error(
      `Study build ${buildDirectory}: emitted source map ${file.relativePath} may expose authoring data`,
    )
  }

  if (/\.(?:ts|tsx|py)$/.test(basename)) {
    throw new Error(
      `Study build ${buildDirectory}: developer source artifact emitted at ${file.relativePath}`,
    )
  }

  if (
    basename.includes("ground-truth") ||
    basename.includes("ground_truth") ||
    basename.includes("annotation")
  ) {
    throw new Error(
      `Study build ${buildDirectory}: researcher annotation artifact emitted at ${file.relativePath}`,
    )
  }

  if (canonicalFixtureNames.has(basename)) {
    throw new Error(
      `Study build ${buildDirectory}: canonical authoring fixture emitted at ${file.relativePath}`,
    )
  }

  if (segments.some((segment) => forbiddenPathSegments.has(segment))) {
    throw new Error(
      `Study build ${buildDirectory}: developer artifact emitted at ${file.relativePath}`,
    )
  }

  if (!isPermittedArtifact(lowerPath, segments, basename)) {
    throw new Error(
      `Study build ${buildDirectory}: unexpected build artifact emitted at ${file.relativePath}`,
    )
  }
}

function assertNoLegacySentinels(buildDirectory: string, file: BuildFile, contents: string): void {
  if (contents.includes("sourceMappingURL")) {
    throw new Error(
      `Study build ${buildDirectory}: emitted source map reference in ${file.relativePath}`,
    )
  }

  for (const sentinel of legacySentinels) {
    if (sentinel.pattern.test(contents)) {
      throw new Error(
        `Study build ${buildDirectory}: legacy ${sentinel.label} sentinel in ${file.relativePath}`,
      )
    }
  }
}

async function assertStudyDirectory(buildDirectory: string): Promise<string> {
  const studyDirectory = join(buildDirectory, "study")
  let entries: Dirent[]
  try {
    entries = await readdir(studyDirectory, { withFileTypes: true })
  } catch (error) {
    throw new Error(
      `Study build ${buildDirectory}: missing study fixture directory (${messageOf(error)})`,
      { cause: error },
    )
  }

  for (const entry of entries) {
    if (!entry.isFile() || !allowedStudyFiles.has(entry.name)) {
      throw new Error(
        `Study build ${buildDirectory}: unexpected study fixture entry "${entry.name}"`,
      )
    }
  }

  return studyDirectory
}

function localStudyFetcher(): typeof fetch {
  return async (input) => {
    const url =
      typeof input === "string" ? new URL(input) : input instanceof URL ? input : new URL(input.url)
    try {
      const contents = await readFile(fileURLToPath(url), "utf8")
      return new Response(contents, {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    } catch {
      return new Response("missing", { status: 404 })
    }
  }
}

async function loadValidatedRuns(
  buildDirectory: string,
  studyDirectory: string,
  expectedCondition: StudyCondition,
): Promise<StudyRuns> {
  const baseUrl = pathToFileURL(`${studyDirectory}${sep}`)
  try {
    return await loadStudyRuns(baseUrl, expectedCondition, localStudyFetcher())
  } catch (error) {
    throw new Error(`Study build ${buildDirectory}: invalid study fixtures (${messageOf(error)})`, {
      cause: error,
    })
  }
}

async function assertScreenshots(
  buildDirectory: string,
  run: StudyRun,
  locale: Locale,
): Promise<void> {
  for (const observation of run.observations) {
    const screenshot = observation.screenshot
    if (!screenshot) continue

    const absolute = resolve(buildDirectory, screenshot.path)
    const relativePath = relative(buildDirectory, absolute)
    if (relativePath.startsWith("..") || isAbsolute(relativePath)) {
      throw new Error(
        `Study build ${buildDirectory}: ${locale} screenshot escapes the build at ${screenshot.path}`,
      )
    }

    let size = 0
    try {
      const information = await stat(absolute)
      size = information.isFile() ? information.size : 0
    } catch {
      size = 0
    }

    if (size <= 0) {
      throw new Error(
        `Study build ${buildDirectory}: missing ${locale} screenshot ${screenshot.path}`,
      )
    }
  }
}

const comparisonSchemaVersion = "study-equivalence/1"

const comparisonViewports = [
  { width: 1280, height: 720 },
  { width: 1366, height: 768 },
  { width: 1440, height: 900 },
] as const

type ComparisonBounds = {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

type ComparisonScreenshot = {
  readonly path: string
  readonly width: number
  readonly height: number
}

type ComparisonReport = {
  readonly schemaVersion: typeof comparisonSchemaVersion
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

const comparisonReportKeys = new Set([
  "actionOrder",
  "condition",
  "controls",
  "locale",
  "panes",
  "schemaVersion",
  "screenshots",
  "viewport",
])

const comparisonScreenshotKeys = new Set(["path", "width", "height"])
const comparisonBoundsKeys = new Set(["x", "y", "width", "height"])
const comparisonScreenshotReferences = new Set(["initial", "final", "episode04"])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function assertExactKeys(
  value: Record<string, unknown>,
  expected: ReadonlySet<string>,
  label: string,
): void {
  const actual = Object.keys(value)
  for (const key of actual) {
    if (!expected.has(key)) {
      throw new Error(`${label} has an unexpected field "${key}"`)
    }
  }
  for (const key of expected) {
    if (!(key in value)) {
      throw new Error(`${label} is missing required field "${key}"`)
    }
  }
}

function comparisonNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${label} must be a finite number`)
  }
  return value
}

function parseComparisonBounds(value: unknown, label: string): ComparisonBounds {
  if (!isRecord(value)) throw new Error(`${label} must be an object`)
  assertExactKeys(value, comparisonBoundsKeys, label)
  return {
    x: comparisonNumber(value["x"], `${label}.x`),
    y: comparisonNumber(value["y"], `${label}.y`),
    width: comparisonNumber(value["width"], `${label}.width`),
    height: comparisonNumber(value["height"], `${label}.height`),
  }
}

function parseComparisonBoundsMap(value: unknown, label: string): Record<string, ComparisonBounds> {
  if (!isRecord(value)) throw new Error(`${label} must be an object`)
  const keys = Object.keys(value)
  if (keys.length === 0) throw new Error(`${label} must not be empty`)
  if (keys.some((key) => key.trim() === "")) {
    throw new Error(`${label} has a blank bounds name`)
  }
  return Object.fromEntries(
    keys.map((key) => [key, parseComparisonBounds(value[key], `${label}.${key}`)]),
  )
}

function parseComparisonScreenshot(value: unknown, label: string): ComparisonScreenshot {
  if (!isRecord(value)) throw new Error(`${label} must be an object`)
  assertExactKeys(value, comparisonScreenshotKeys, label)
  const path = value["path"]
  if (typeof path !== "string" || !screenshotPattern.test(path)) {
    throw new Error(`${label}.path must be a permitted screenshot path`)
  }
  return {
    path,
    width: comparisonNumber(value["width"], `${label}.width`),
    height: comparisonNumber(value["height"], `${label}.height`),
  }
}

function allowedComparisonViewport(
  viewport: unknown,
): asserts viewport is { readonly width: number; readonly height: number } {
  if (!isRecord(viewport)) throw new Error("Report viewport must be an object")
  assertExactKeys(viewport, new Set(["width", "height"]), "Report viewport")
  const width = comparisonNumber(viewport["width"], "Report viewport.width")
  const height = comparisonNumber(viewport["height"], "Report viewport.height")
  const permitted = comparisonViewports.some(
    (candidate) => candidate.width === width && candidate.height === height,
  )
  if (!permitted) throw new Error(`Report viewport ${width}x${height} is not supported`)
}

function parseComparisonReport(value: unknown, label: string): ComparisonReport {
  if (!isRecord(value)) throw new Error(`${label} must be an object`)
  assertExactKeys(value, comparisonReportKeys, label)

  if (value["schemaVersion"] !== comparisonSchemaVersion) {
    throw new Error(`${label} has an unsupported schema version`)
  }

  const condition = value["condition"]
  if (!studyConditions.includes(condition as StudyCondition)) {
    throw new Error(`${label} has an invalid condition`)
  }

  const locale = value["locale"]
  if (locale !== "zh" && locale !== "en") {
    throw new Error(`${label} has an invalid locale`)
  }

  const viewport = value["viewport"]
  allowedComparisonViewport(viewport)

  const screenshots = value["screenshots"]
  if (!isRecord(screenshots)) throw new Error(`${label}.screenshots must be an object`)
  assertExactKeys(screenshots, comparisonScreenshotReferences, `${label}.screenshots`)

  const actionOrder = value["actionOrder"]
  if (
    !Array.isArray(actionOrder) ||
    actionOrder.length === 0 ||
    actionOrder.some((action) => typeof action !== "string" || action.trim() === "")
  ) {
    throw new Error(`${label}.actionOrder must list the recorded actions`)
  }

  return {
    schemaVersion: comparisonSchemaVersion,
    condition: condition as StudyCondition,
    locale,
    viewport: {
      width: viewport.width,
      height: viewport.height,
    },
    screenshots: {
      initial: parseComparisonScreenshot(screenshots["initial"], `${label}.screenshots.initial`),
      final: parseComparisonScreenshot(screenshots["final"], `${label}.screenshots.final`),
      episode04: parseComparisonScreenshot(
        screenshots["episode04"],
        `${label}.screenshots.episode04`,
      ),
    },
    panes: parseComparisonBoundsMap(value["panes"], `${label}.panes`),
    controls: parseComparisonBoundsMap(value["controls"], `${label}.controls`),
    actionOrder,
  }
}

function comparisonReportName(locale: Locale, viewport: { width: number; height: number }): string {
  return `${locale}-${viewport.width}x${viewport.height}.json`
}

function expectedComparisonReportNames(): readonly string[] {
  return LOCALES.flatMap((locale) =>
    comparisonViewports.map((viewport) => comparisonReportName(locale, viewport)),
  ).sort()
}

async function readComparisonReports(
  root: string,
  condition: StudyCondition,
): Promise<ReadonlyMap<string, ComparisonReport>> {
  const directory = join(root, "test-results", "study-equivalence")
  const names = (await readdir(directory)).sort()
  const expected = expectedComparisonReportNames()
  if (JSON.stringify(names) !== JSON.stringify(expected)) {
    const missing = expected.filter((name) => !names.includes(name))
    const unexpected = names.filter((name) => !expected.includes(name))
    throw new Error(
      `Study comparison ${root}: missing or unexpected equivalence reports (missing: ${
        missing.join(", ") || "none"
      }; unexpected: ${unexpected.join(", ") || "none"})`,
    )
  }

  const reports = new Map<string, ComparisonReport>()
  for (const name of names) {
    let contents: string
    try {
      contents = await readFile(join(directory, name), "utf8")
    } catch (error) {
      throw new Error(`Study comparison ${root}: report ${name} is unavailable`, { cause: error })
    }

    let value: unknown
    try {
      value = JSON.parse(contents) as unknown
    } catch (error) {
      throw new Error(`Study comparison ${root}: report ${name} is not valid JSON`, {
        cause: error,
      })
    }

    const report = parseComparisonReport(value, `Report ${name}`)
    if (report.condition !== condition) {
      throw new Error(
        `Study comparison ${root}: report ${name} claims condition ${report.condition}, expected ${condition}`,
      )
    }
    reports.set(name, report)
  }

  return reports
}

function assertBoundsClose(label: string, left: ComparisonBounds, right: ComparisonBounds): void {
  for (const key of comparisonBoundsKeys) {
    const field = key as keyof ComparisonBounds
    if (Math.abs(left[field] - right[field]) > 1) {
      throw new Error(
        `Study comparison: ${label}.${field} differs by more than 1px (${left[field]} vs ${right[field]})`,
      )
    }
  }
}

function assertBoundsMapMatch(
  label: string,
  left: Readonly<Record<string, ComparisonBounds>>,
  right: Readonly<Record<string, ComparisonBounds>>,
): void {
  const leftKeys = Object.keys(left).sort()
  const rightKeys = Object.keys(right).sort()
  if (JSON.stringify(leftKeys) !== JSON.stringify(rightKeys)) {
    throw new Error(`Study comparison: ${label} names differ between conditions`)
  }
  for (const key of leftKeys) {
    const leftBounds = left[key]
    const rightBounds = right[key]
    if (!leftBounds || !rightBounds) throw new Error(`Study comparison: ${label}.${key} missing`)
    assertBoundsClose(`${label}.${key}`, leftBounds, rightBounds)
  }
}

function assertReportsMatch(
  referenceLabel: string,
  reference: ComparisonReport,
  actualLabel: string,
  actual: ComparisonReport,
): void {
  if (JSON.stringify(reference.screenshots) !== JSON.stringify(actual.screenshots)) {
    throw new Error(
      `Study comparison: screenshot references differ between ${referenceLabel} and ${actualLabel}`,
    )
  }
  if (JSON.stringify(reference.actionOrder) !== JSON.stringify(actual.actionOrder)) {
    throw new Error(
      `Study comparison: action order differs between ${referenceLabel} and ${actualLabel}`,
    )
  }
  assertBoundsMapMatch("panes", reference.panes, actual.panes)
  assertBoundsMapMatch("controls", reference.controls, actual.controls)
}

type UnscoredCandidate = {
  readonly id: string
  readonly label: string
  readonly context: string | null
}

type UnscoredHead = {
  readonly offered: readonly UnscoredCandidate[]
  readonly selectedId: string
}

type UnscoredEpisodeHeads = {
  readonly id: string
  readonly operationHead: UnscoredHead
  readonly targetHead: (UnscoredHead & { readonly operation: string }) | null
}

function unscoredHeads(run: StudyRun): readonly UnscoredEpisodeHeads[] {
  return run.episodes.map((episode) => {
    if (!("operationHead" in episode)) {
      throw new Error(`Study comparison: baseline episode ${episode.id} unexpectedly has no heads`)
    }
    const operationHead = episode.operationHead
    const targetHead = episode.targetHead
    return {
      id: episode.id,
      operationHead: {
        offered: operationHead.offered.map((candidate) => ({
          id: candidate.id,
          label: candidate.label,
          context: candidate.context,
        })),
        selectedId: operationHead.selectedId,
      },
      targetHead: targetHead
        ? {
            operation: targetHead.operation,
            offered: targetHead.offered.map((candidate) => ({
              id: candidate.id,
              label: candidate.label,
              context: candidate.context,
            })),
            selectedId: targetHead.selectedId,
          }
        : null,
    }
  })
}

type VerifiedBuild = {
  readonly report: BuildReport
  readonly runs: StudyRuns
}

async function verifyStudyBuildWithRuns(
  directory: string,
  expectedCondition: StudyCondition,
): Promise<VerifiedBuild> {
  const buildDirectory = resolve(directory)

  try {
    const information = await stat(buildDirectory)
    if (!information.isDirectory()) {
      throw new Error("not a directory")
    }
  } catch (error) {
    throw new Error(
      `Study build ${buildDirectory}: directory is unavailable (${messageOf(error)})`,
      {
        cause: error,
      },
    )
  }

  const studyDirectory = await assertStudyDirectory(buildDirectory)
  const files = await collectFiles(buildDirectory)

  for (const file of files) {
    assertPermittedPath(buildDirectory, file)

    const extension = extensionOf(file.relativePath)
    if (!textExtensions.has(extension)) continue

    const contents = await readFile(file.absolute, "utf8")
    assertNoLegacySentinels(buildDirectory, file, contents)
  }

  const runs = await loadValidatedRuns(buildDirectory, studyDirectory, expectedCondition)

  await Promise.all(
    LOCALES.map((locale) => assertScreenshots(buildDirectory, runs[locale], locale)),
  )

  const zh = runs.zh
  const en = runs.en
  if (zh.condition !== expectedCondition || en.condition !== expectedCondition) {
    throw new Error(
      `Study build ${buildDirectory}: condition mismatch: expected ${expectedCondition}`,
    )
  }

  return {
    report: {
      condition: zh.condition,
      fixtureRevision: zh.fixtureRevision,
      coreDigests: {
        zh: digest(coreView(zh)),
        en: digest(coreView(en)),
      },
    },
    runs,
  }
}

export async function verifyStudyBuild(
  directory: string,
  expectedCondition: StudyCondition,
): Promise<BuildReport> {
  return (await verifyStudyBuildWithRuns(directory, expectedCondition)).report
}

export async function compareStudyBuilds(
  directories: Readonly<Record<StudyCondition, string>>,
): Promise<void> {
  const conditions: readonly StudyCondition[] = ["baseline", "candidates", "probabilities"]
  const verified = Object.fromEntries(
    await Promise.all(
      conditions.map(async (condition) => {
        const root = resolve(directories[condition])
        const build = await verifyStudyBuildWithRuns(join(root, "dist"), condition)
        const reports = await readComparisonReports(root, condition)
        return [condition, { build, reports }] as const
      }),
    ),
  ) as Record<
    StudyCondition,
    { build: VerifiedBuild; reports: ReadonlyMap<string, ComparisonReport> }
  >

  const baseline = verified.baseline.build.report
  for (const condition of conditions.slice(1)) {
    const report = verified[condition].build.report
    if (report.fixtureRevision !== baseline.fixtureRevision) {
      throw new Error(
        `Study comparison: fixture revision differs for ${condition} (${report.fixtureRevision} vs ${baseline.fixtureRevision})`,
      )
    }
    if (JSON.stringify(report.coreDigests) !== JSON.stringify(baseline.coreDigests)) {
      throw new Error(
        `Study comparison: common core digest differs for ${condition}; common task, report, observations, or action structure changed`,
      )
    }
  }

  for (const locale of LOCALES) {
    const candidates = unscoredHeads(verified.candidates.build.runs[locale])
    const probabilities = unscoredHeads(verified.probabilities.build.runs[locale])
    if (JSON.stringify(candidates) !== JSON.stringify(probabilities)) {
      throw new Error(
        `Study comparison: candidate order or selection differs between candidates and probabilities (${locale})`,
      )
    }
  }

  for (const locale of LOCALES) {
    for (const viewport of comparisonViewports) {
      const name = comparisonReportName(locale, viewport)
      const reference = verified.baseline.reports.get(name)
      if (!reference) throw new Error(`Study comparison: missing report ${name}`)
      for (const condition of conditions.slice(1)) {
        const actual = verified[condition].reports.get(name)
        if (!actual) throw new Error(`Study comparison: missing ${condition} report ${name}`)
        assertReportsMatch("baseline", reference, condition, actual)
      }
    }
  }
}
