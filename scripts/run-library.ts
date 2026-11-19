import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { z } from "zod"
import { decisionRunSchema } from "../src/domain/decision-run-schema.ts"
import { projectRun } from "../src/domain/project-run.ts"
import type { StudyCondition } from "../src/domain/study-condition.ts"
import {
  type StudyRun,
  type StudyRunIndex,
  studyRunIndexSchema,
  studyRunSchema,
} from "../src/domain/study-run-schema.ts"

const manifestSchema = z
  .strictObject({
    fixtureVersion: z.literal("decision-replay/2"),
    fixtureRevision: z.string().regex(/^[0-9a-f]{64}$/),
    runs: z
      .array(
        z
          .strictObject({
            id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
            ordinal: z.number().int().positive(),
            steps: z.number().int().positive(),
            title: z
              .strictObject({ zh: z.string().min(1), en: z.string().min(1) })
              .readonly(),
            files: z
              .strictObject({ zh: z.literal("run.zh.json"), en: z.literal("run.en.json") })
              .readonly(),
          })
          .readonly(),
      )
      .min(1)
      .readonly(),
  })
  .readonly()

export type AgentRunManifest = z.infer<typeof manifestSchema>

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown
}

function withRuntimeFramePaths(run: StudyRun, runId: string): StudyRun {
  return studyRunSchema.parse({
    ...run,
    observations: run.observations.map((observation) =>
      observation.screenshot
        ? {
            ...observation,
            screenshot: {
              ...observation.screenshot,
              path: `runs/${runId}/${observation.screenshot.path}`,
            },
          }
        : observation,
    ),
  })
}

export async function readAgentRunManifest(sourceDir: string): Promise<AgentRunManifest> {
  return manifestSchema.parse(await readJson(join(sourceDir, "manifest.json")))
}

export async function writeRunLibrary(options: {
  readonly condition: StudyCondition
  readonly sourceDir?: string
  readonly outputDir?: string
  readonly runIds?: readonly string[]
}): Promise<StudyRunIndex> {
  const sourceDir = resolve(options.sourceDir ?? join("fixtures", "agent-runs"))
  const outputDir = resolve(options.outputDir ?? join("public", "runs"))
  const manifest = await readAgentRunManifest(sourceDir)
  const requested = options.runIds === undefined ? null : new Set(options.runIds)
  if (requested !== null) {
    for (const id of requested) {
      if (!manifest.runs.some((run) => run.id === id)) {
        throw new Error(`Unknown run id requested: ${id}`)
      }
    }
  }
  const selectedRuns = manifest.runs
    .filter((run) => requested === null || requested.has(run.id))
    .map((run, index) => ({ ...run, ordinal: index + 1 }))

  const runs = []
  for (const summary of selectedRuns) {
    const directory = join(sourceDir, summary.id)
    const [enValue, zhValue] = await Promise.all([
      readJson(join(directory, summary.files.en)),
      readJson(join(directory, summary.files.zh)),
    ])
    const en = decisionRunSchema.parse(enValue)
    const zh = decisionRunSchema.parse(zhValue)

    if (en.runId !== summary.id || zh.runId !== summary.id) {
      throw new Error(`Run ${summary.id} has mismatched run IDs`)
    }
    if (en.locale !== "en" || zh.locale !== "zh") {
      throw new Error(`Run ${summary.id} has mismatched locales`)
    }
    if (en.episodes.length !== summary.steps || zh.episodes.length !== summary.steps) {
      throw new Error(`Run ${summary.id} does not match the manifest step count`)
    }

    runs.push({
      summary,
      en: withRuntimeFramePaths(
        projectRun(en, options.condition, manifest.fixtureRevision),
        summary.id,
      ),
      zh: withRuntimeFramePaths(
        projectRun(zh, options.condition, manifest.fixtureRevision),
        summary.id,
      ),
    })
  }

  await rm(outputDir, { recursive: true, force: true })
  await mkdir(outputDir, { recursive: true })

  for (const run of runs) {
    const directory = join(outputDir, run.summary.id)
    await mkdir(directory, { recursive: true })
    await Promise.all([
      writeFile(join(directory, "run.en.json"), serialize(run.en)),
      writeFile(join(directory, "run.zh.json"), serialize(run.zh)),
      cp(join(sourceDir, run.summary.id, "frames"), join(directory, "frames"), {
        recursive: true,
      }),
    ])
  }

  const index = studyRunIndexSchema.parse({
    fixtureVersion: manifest.fixtureVersion,
    condition: options.condition,
    fixtureRevision: manifest.fixtureRevision,
    runs: selectedRuns,
  } satisfies StudyRunIndex)

  await writeFile(join(outputDir, "index.json"), serialize(index))
  return index
}
