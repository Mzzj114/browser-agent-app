import { createHash } from "node:crypto"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { type DecisionRun, decisionRunSchema } from "../src/domain/decision-run-schema.ts"
import { projectRun } from "../src/domain/project-run.ts"
import type { StudyCondition } from "../src/domain/study-condition.ts"
import {
  type StudyManifest,
  studyManifestSchema,
  studyRunSchema,
} from "../src/domain/study-run-schema.ts"
import type { Locale } from "../src/i18n/locale.ts"

const canonicalDirectory = resolve("fixtures", "decision-runs")

const canonicalFiles = {
  zh: join(canonicalDirectory, "shopping.zh.json"),
  en: join(canonicalDirectory, "shopping.en.json"),
} as const

const outputFiles = {
  manifest: "manifest.json",
  zh: "run.zh.json",
  en: "run.en.json",
} as const

const ownedFiles = new Set<string>(Object.values(outputFiles))

function parseCanonical(locale: Locale, contents: Buffer): DecisionRun {
  const run = decisionRunSchema.parse(JSON.parse(contents.toString("utf8")))
  if (run.locale !== locale) {
    throw new Error(`Canonical ${locale} fixture declares locale ${run.locale}`)
  }
  return run
}

async function assertWritableDirectory(outputDir: string): Promise<void> {
  await mkdir(outputDir, { recursive: true })
  const entries = await readdir(outputDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isFile() || !ownedFiles.has(entry.name)) {
      throw new Error(
        `Refusing to write study fixtures: unexpected entry "${entry.name}" in ${outputDir}`,
      )
    }
  }
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

export async function writeStudyFixtures(options: {
  condition: StudyCondition
  outputDir: string
}): Promise<StudyManifest> {
  const [zhBytes, enBytes] = await Promise.all([
    readFile(canonicalFiles.zh),
    readFile(canonicalFiles.en),
  ])

  const fixtureRevision = createHash("sha256").update(zhBytes).update(enBytes).digest("hex")

  const canonicalRuns = {
    zh: parseCanonical("zh", zhBytes),
    en: parseCanonical("en", enBytes),
  } satisfies Record<Locale, DecisionRun>

  const runs = {
    zh: projectRun(canonicalRuns.zh, options.condition, fixtureRevision),
    en: projectRun(canonicalRuns.en, options.condition, fixtureRevision),
  }

  const manifest = studyManifestSchema.parse({
    fixtureVersion: runs.zh.fixtureVersion,
    condition: options.condition,
    fixtureRevision,
    files: {
      zh: outputFiles.zh,
      en: outputFiles.en,
    },
  } satisfies StudyManifest)

  await assertWritableDirectory(options.outputDir)

  await Promise.all([
    writeFile(join(options.outputDir, outputFiles.zh), serialize(studyRunSchema.parse(runs.zh))),
    writeFile(join(options.outputDir, outputFiles.en), serialize(studyRunSchema.parse(runs.en))),
    writeFile(join(options.outputDir, outputFiles.manifest), serialize(manifest)),
  ])

  return manifest
}
