import { cp, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { basename, join, resolve } from "node:path"
import type { StudyRunSummary } from "../src/domain/study-run-schema.ts"
import {
  buildCanonicalRuns,
  combinationRevision,
  type FrameSize,
  readJpegSize,
  repairMojibake,
  type SourceMeta,
  type SourceStep,
  type SourceTrace,
  type Translations,
} from "./agent-run-import.ts"

const ownedFiles = new Set(["manifest.json", "provenance.json", "translations.json"])

function parseArguments(argv: readonly string[]): { source: string; out: string } {
  let source = ""
  let out = resolve("fixtures", "agent-runs")

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === "--source") {
      source = argv[index + 1] ?? ""
      index += 1
    } else if (argument === "--out") {
      out = resolve(argv[index + 1] ?? out)
      index += 1
    }
  }

  if (!source) {
    throw new Error(
      "Usage: node scripts/import-agent-runs.ts --source <final-runs-dir> [--out <dir>]",
    )
  }

  return { source: resolve(source), out }
}

function serialize(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`
}

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T
}

async function collectFrameSizes(runDirectory: string, frames: readonly string[]) {
  const sizes = new Map<string, FrameSize>()
  await Promise.all(
    [...new Set(frames)].map(async (frame) => {
      sizes.set(frame, await readJpegSize(join(runDirectory, "frames", frame)))
    }),
  )
  return sizes
}

async function assertOutputIsOwned(out: string, runIds: ReadonlySet<string>): Promise<void> {
  await mkdir(out, { recursive: true })
  const entries = await readdir(out, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isFile()) {
      if (ownedFiles.has(entry.name)) continue
      throw new Error(`Refusing to write agent runs: unexpected file "${entry.name}" in ${out}`)
    }
    if (!entry.isDirectory() || !runIds.has(entry.name)) {
      throw new Error(`Refusing to write agent runs: unexpected entry "${entry.name}" in ${out}`)
    }
  }
}

async function main(): Promise<void> {
  const { source, out } = parseArguments(process.argv.slice(2))
  const translations = await readJson<Translations>(join(out, "translations.json"))

  const runIds = (await readdir(source, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()

  if (runIds.length === 0) throw new Error(`No run directories under ${source}`)
  await assertOutputIsOwned(out, new Set(runIds))

  const built: Array<{
    id: string
    meta: SourceMeta
    en: ReturnType<typeof buildCanonicalRuns>["en"]
    zh: ReturnType<typeof buildCanonicalRuns>["zh"]
    revision: string
    summary: { finished_at?: string }
  }> = []

  for (const runId of runIds) {
    const runDirectory = join(source, runId)
    const meta = await readJson<SourceMeta>(join(runDirectory, "meta.json"))
    const trace = await readJson<SourceTrace>(join(runDirectory, "trace.json"))
    const summary = await readJson<{ finished_at?: string }>(join(runDirectory, "summary.json"))

    if (meta.run_id !== runId) {
      throw new Error(`Run directory ${runId} declares run_id ${meta.run_id}`)
    }

    const frameNames = [
      ...(trace.initial_frame ? [trace.initial_frame] : []),
      ...(trace.final_frame ? [trace.final_frame] : []),
      ...trace.steps.map((step: SourceStep) => step.pre_frame),
    ].filter((frame): frame is string => typeof frame === "string" && frame !== "")

    const sizes = await collectFrameSizes(runDirectory, frameNames)
    const pair = buildCanonicalRuns({
      runId,
      meta: { ...meta, instruction: repairMojibake(meta.instruction) },
      trace,
      translations,
      finishedAt: summary.finished_at,
      frameSize: (frame) => {
        const size = sizes.get(frame)
        if (!size) throw new Error(`Run ${runId} references an unknown frame ${frame}`)
        return size
      },
    })

    built.push({
      id: runId,
      meta,
      summary,
      en: pair.en,
      zh: pair.zh,
      revision: pair.revision,
    })
    console.log(`imported ${runId} (${pair.en.episodes.length} steps)`)
  }

  const fixtureRevision = combinationRevision(built.map((run) => run.revision))
  const runs: StudyRunSummary[] = built.map((run, index) => {
    const title = translations.taskTitles[run.meta.task_id]
    if (!title) {
      throw new Error(`Missing task title for ${JSON.stringify(run.meta.task_id)}`)
    }
    return {
      id: run.id,
      ordinal: index + 1,
      steps: run.en.episodes.length,
      title,
      files: { zh: "run.zh.json", en: "run.en.json" },
    }
  })

  for (const run of built) {
    const directory = join(out, run.id)
    await rm(directory, { recursive: true, force: true })
    await mkdir(directory, { recursive: true })
    await cp(join(source, run.id, "frames"), join(directory, "frames"), { recursive: true })

    const en = run.en
    const zh = run.zh
    await Promise.all([
      writeFile(join(directory, "run.en.json"), serialize(en)),
      writeFile(join(directory, "run.zh.json"), serialize(zh)),
    ])
  }

  const manifest = {
    fixtureVersion: "decision-replay/2" as const,
    fixtureRevision,
    runs,
  }
  await writeFile(join(out, "manifest.json"), serialize(manifest))

  const provenance = {
    fixtureVersion: "decision-replay/2",
    source: basename(source),
    runs: built.map((run) => ({
      id: run.id,
      taskId: run.meta.task_id,
      scenario: run.meta.scenario,
      sourceCondition: run.meta.condition,
      seed: run.meta.seed,
      startedAt: run.meta.started_at,
      finishedAt: run.summary.finished_at ?? null,
      stepCount: run.en.episodes.length,
    })),
  }
  await writeFile(join(out, "provenance.json"), serialize(provenance))

  console.log(`imported ${runs.length} runs with revision ${fixtureRevision} into ${out}`)
}

main().catch((error: unknown) => {
  console.error("Failed to import agent runs", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
