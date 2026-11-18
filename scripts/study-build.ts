import { createHash } from "node:crypto"
import type { Dirent } from "node:fs"
import { readdir, readFile, stat } from "node:fs/promises"
import { isAbsolute, join, relative, resolve, sep } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { loadStudyRuns } from "../src/data/load-study-runs.ts"
import { coreView } from "../src/domain/project-run.ts"
import type { StudyCondition } from "../src/domain/study-condition.ts"
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

export async function verifyStudyBuild(
  directory: string,
  expectedCondition: StudyCondition,
): Promise<BuildReport> {
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
    condition: zh.condition,
    fixtureRevision: zh.fixtureRevision,
    coreDigests: {
      zh: digest(coreView(zh)),
      en: digest(coreView(en)),
    },
  }
}
