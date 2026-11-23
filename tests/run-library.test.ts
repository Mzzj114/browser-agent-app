import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { readAgentRunManifest, writeRunLibrary } from "../scripts/run-library.ts"
import { coreView, projectRun } from "../src/domain/project-run.ts"
import { type StudyCondition, studyConditions } from "../src/domain/study-condition.ts"
import { studyRunSchema } from "../src/domain/study-run-schema.ts"
import { canonicalRun } from "./fixtures/decision-runs.ts"

const fixtureRevision = "0".repeat(64)
const fixtureRunId = "F1_add_single_item_clean"
const sourceDir = resolve("fixtures", "agent-runs")
const temporaryRoot = join(process.env["LOCALAPPDATA"] ?? tmpdir(), "Temp", "opencode")
const ownedDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    ownedDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function fixtureDirectory(): Promise<string> {
  await mkdir(temporaryRoot, { recursive: true })
  const directory = await mkdtemp(join(temporaryRoot, "run-library-"))
  ownedDirectories.push(directory)
  return directory
}

function projected(condition: StudyCondition) {
  return projectRun(canonicalRun("en"), condition, fixtureRevision)
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object")
  }
  return value as Record<string, unknown>
}

function experimentalEpisodes(run: ReturnType<typeof projected>) {
  if (run.condition === "baseline") throw new Error("Expected an experimental run")
  return run.episodes
}

function probabilitiesRun() {
  const run = projected("probabilities")
  if (run.condition !== "probabilities") throw new Error("Expected a probabilities run")
  return run
}

async function readJson(path: string): Promise<unknown> {
  return JSON.parse(await readFile(path, "utf8")) as unknown
}

describe("study run projection", () => {
  it("derives an identical core view across all conditions", () => {
    const views = studyConditions.map((condition) => coreView(projected(condition)))
    for (const view of views) expect(view).toEqual(views[0])
  })

  it("keeps candidate order and selections identical between experiments", () => {
    const candidates = experimentalEpisodes(projected("candidates"))
    const probabilities = experimentalEpisodes(projected("probabilities"))
    expect(candidates).toHaveLength(probabilities.length)

    candidates.forEach((episode, index) => {
      const scored = probabilities[index]
      expect(scored).toBeDefined()
      if (!scored) return

      expect(episode.operationHead.offered.map((candidate) => candidate.id)).toEqual(
        scored.operationHead.offered.map((candidate) => candidate.id),
      )
      expect(episode.operationHead.selectedId).toBe(scored.operationHead.selectedId)
      expect(episode.targetHead?.operation ?? null).toBe(scored.targetHead?.operation ?? null)
      expect(episode.targetHead?.selectedId ?? null).toBe(scored.targetHead?.selectedId ?? null)
      expect(episode.targetHead?.offered.map((candidate) => candidate.id) ?? null).toEqual(
        scored.targetHead?.offered.map((candidate) => candidate.id) ?? null,
      )
    })
  })

  it("projects identical wallet previews and imports reported confidence", async () => {
    const directory = await fixtureDirectory()
    const runsDirectory = join(directory, "runs")

    async function readProjection(condition: StudyCondition) {
      await writeRunLibrary({
        condition,
        sourceDir,
        outputDir: runsDirectory,
        runIds: [fixtureRunId],
      })
      return studyRunSchema.parse(await readJson(join(runsDirectory, fixtureRunId, "run.en.json")))
    }

    const candidates = await readProjection("candidates")
    const probabilities = await readProjection("probabilities")
    if (candidates.condition !== "candidates" || probabilities.condition !== "probabilities") {
      throw new Error("Expected experimental runs")
    }

    const candidateStep = candidates.episodes[2]
    const scoredStep = probabilities.episodes[2]
    if (!candidateStep || !scoredStep) throw new Error("Expected wallet step 3")

    expect(candidateStep.operationHead.previewIds).toEqual(["BLOCKED", "SCROLL_DOWN"])
    expect(candidateStep.targetHead?.previewIds).toEqual(["38"])
    expect(candidateStep.operationHead.previewIds).toEqual(scoredStep.operationHead.previewIds)
    expect(candidateStep.targetHead?.previewIds).toEqual(scoredStep.targetHead?.previewIds)
    expect(candidateStep.operationHead.selectedId).toBe(scoredStep.operationHead.selectedId)
    expect(candidateStep.targetHead?.selectedId).toBe(scoredStep.targetHead?.selectedId)
    expect([
      scoredStep.operationHead.reportedConfidence,
      scoredStep.targetHead?.reportedConfidence,
    ]).toEqual([0.96, 0.5])
    expect("reportedConfidence" in candidateStep.operationHead).toBe(false)
    expect(
      candidateStep.targetHead ? "reportedConfidence" in candidateStep.targetHead : false,
    ).toBe(false)
  })

  it("physically removes decision heads from baseline episodes", () => {
    const run = projected("baseline")
    if (run.condition !== "baseline") throw new Error("Expected a baseline run")
    expect(run.episodes.every((episode) => !("operationHead" in episode))).toBe(true)
    expect(run.episodes.every((episode) => !("targetHead" in episode))).toBe(true)
  })

  it("keeps candidate rows unscored in the candidates condition", () => {
    for (const episode of experimentalEpisodes(projected("candidates"))) {
      expect("reportedConfidence" in episode.operationHead).toBe(false)
      if (episode.targetHead) {
        expect("reportedConfidence" in episode.targetHead).toBe(false)
      }
      for (const candidate of episode.operationHead.offered) {
        expect("probability" in candidate).toBe(false)
      }
      for (const candidate of episode.targetHead?.offered ?? []) {
        expect("probability" in candidate).toBe(false)
      }
    }
  })

  it("includes probabilities at both levels in the probabilities condition", () => {
    for (const episode of probabilitiesRun().episodes) {
      for (const candidate of episode.operationHead.offered) {
        expect(typeof candidate.probability).toBe("number")
      }
      for (const candidate of episode.targetHead?.offered ?? []) {
        expect(typeof candidate.probability).toBe("number")
      }
    }
  })

  it("projects confidence only into the scored condition and no researcher annotations", () => {
    const serialized = Object.fromEntries(
      studyConditions.map((condition) => [condition, JSON.stringify(projected(condition))]),
    )
    expect(serialized["baseline"]).not.toContain("confidence")
    expect(serialized["candidates"]).not.toContain("confidence")
    expect(serialized["probabilities"]).toContain("reportedConfidence")
    for (const contents of Object.values(serialized)) {
      expect(contents).not.toContain("annotations")
      expect(contents).not.toContain("groundTruth")
      expect(contents).not.toContain("earliest_mistake")
    }
  })

  it("preserves task, observations, and the fixture revision", () => {
    const run = projected("baseline")
    const canonical = canonicalRun("en")
    expect(run.runId).toBe(canonical.runId)
    expect(run.task).toBe(canonical.task)
    expect(run.initialObservationId).toBe(canonical.initialObservationId)
    expect(run.finalObservationId).toBe(canonical.finalObservationId)
    expect(run.fixtureRevision).toBe(fixtureRevision)
    expect(run.condition).toBe("baseline")
    expect(run.observations).toEqual(canonical.observations)
    expect(studyRunSchema.safeParse(run).success).toBe(true)
  })
})

describe("study run schema", () => {
  it.each(studyConditions)("accepts a projected %s run", (condition) => {
    expect(studyRunSchema.safeParse(projected(condition)).success).toBe(true)
  })

  it("rejects baseline episodes that carry decision heads", () => {
    const forged = structuredClone(projected("baseline")) as unknown as Record<string, unknown>
    const episodes = forged["episodes"] as Record<string, unknown>[]
    const first = episodes[0]
    if (!first) throw new Error("Expected an episode")
    first["operationHead"] = {
      offered: [{ id: "CLICK", label: "Click", context: null }],
      selectedId: "CLICK",
    }
    expect(studyRunSchema.safeParse(forged).success).toBe(false)
  })

  it("rejects probabilities inside a candidates candidate row", () => {
    const forged = structuredClone(projected("candidates")) as unknown as Record<string, unknown>
    const episodes = forged["episodes"] as Record<string, unknown>[]
    const head = record(record(episodes[0])["operationHead"])
    const offered = head["offered"] as Record<string, unknown>[]
    offered[0] = { ...offered[0], probability: 0.5 }
    expect(studyRunSchema.safeParse(forged).success).toBe(false)
  })

  it("rejects a selected operation that is not offered", () => {
    const forged = structuredClone(projected("candidates")) as unknown as Record<string, unknown>
    const episodes = forged["episodes"] as Record<string, unknown>[]
    record(record(episodes[0])["operationHead"])["selectedId"] = "not-offered"
    expect(studyRunSchema.safeParse(forged).success).toBe(false)
  })

  it("rejects a selected target that is not offered", () => {
    const forged = structuredClone(projected("candidates")) as unknown as Record<string, unknown>
    const episodes = forged["episodes"] as Record<string, unknown>[]
    const targetEpisode = episodes.find((episode) => episode["targetHead"] !== null)
    if (!targetEpisode) throw new Error("Expected a target episode")
    record(targetEpisode["targetHead"])["selectedId"] = "not-offered"
    expect(studyRunSchema.safeParse(forged).success).toBe(false)
  })

  it.each(["duplicate", "selected", "unknown"] as const)("rejects a %s preview ID", (kind) => {
    const forged = structuredClone(projected("candidates")) as unknown as Record<string, unknown>
    const episodes = forged["episodes"] as Record<string, unknown>[]
    const head = record(record(episodes[2])["operationHead"])
    const previewIds = head["previewIds"]
    const selectedId = head["selectedId"]
    if (!Array.isArray(previewIds) || typeof selectedId !== "string") {
      throw new Error("Expected a previewed operation head")
    }
    const first = previewIds[0]
    if (typeof first !== "string") throw new Error("Expected a preview ID")
    head["previewIds"] =
      kind === "duplicate" ? [first, first] : kind === "selected" ? [selectedId] : ["not-offered"]

    expect(studyRunSchema.safeParse(forged).success).toBe(false)
  })

  it("rejects an order that disagrees with the scored probabilities", () => {
    const forged = structuredClone(projected("probabilities")) as unknown as Record<string, unknown>
    const episodes = forged["episodes"] as Record<string, unknown>[]
    const head = record(record(episodes[2])["operationHead"])
    const previewIds = head["previewIds"]
    if (!Array.isArray(previewIds) || previewIds.length < 2) {
      throw new Error("Expected multiple preview IDs")
    }
    head["previewIds"] = [...previewIds].reverse()

    expect(studyRunSchema.safeParse(forged).success).toBe(false)
  })

  it("rejects unexpected key surfaces", () => {
    const forged = structuredClone(projected("baseline")) as unknown as Record<string, unknown>
    forged["annotations"] = []
    expect(studyRunSchema.safeParse(forged).success).toBe(false)
  })
})

describe("run library writer", () => {
  it("writes an index, both locales, and copied frames", async () => {
    const directory = await fixtureDirectory()
    const runsDirectory = join(directory, "runs")
    const index = await writeRunLibrary({
      condition: "candidates",
      sourceDir,
      outputDir: runsDirectory,
      runIds: [fixtureRunId],
    })

    expect(index.condition).toBe("candidates")
    expect(index.runs).toHaveLength(1)
    expect(index.runs[0]?.id).toBe(fixtureRunId)
    expect((await readdir(runsDirectory)).sort()).toEqual([fixtureRunId, "index.json"])

    const runDirectory = join(runsDirectory, fixtureRunId)
    expect((await readdir(runDirectory)).sort()).toEqual(["frames", "run.en.json", "run.zh.json"])

    for (const locale of ["zh", "en"] as const) {
      const run = studyRunSchema.parse(await readJson(join(runDirectory, `run.${locale}.json`)))
      expect(run.runId).toBe(fixtureRunId)
      expect(run.locale).toBe(locale)
      expect(run.condition).toBe("candidates")
      expect(run.fixtureRevision).toBe(index.fixtureRevision)
      const screenshot = run.observations[0]?.screenshot
      if (!screenshot) throw new Error("Expected a screenshot")
      expect(screenshot.path).toMatch(new RegExp(`^runs/${fixtureRunId}/frames/`))
      expect((await stat(join(directory, screenshot.path))).size).toBeGreaterThan(0)
    }
  })

  it.each(studyConditions)("projects %s evidence from the canonical library", async (condition) => {
    const directory = await fixtureDirectory()
    const runsDirectory = join(directory, "runs")
    const index = await writeRunLibrary({
      condition,
      sourceDir,
      outputDir: runsDirectory,
      runIds: [fixtureRunId],
    })
    const run = studyRunSchema.parse(
      await readJson(join(runsDirectory, fixtureRunId, "run.en.json")),
    )

    expect(run.condition).toBe(condition)
    expect(run.fixtureRevision).toBe(index.fixtureRevision)
    if (condition === "baseline") {
      expect(run.episodes.every((episode) => !("operationHead" in episode))).toBe(true)
    } else {
      expect(run.episodes.every((episode) => "operationHead" in episode)).toBe(true)
    }
  })

  it("rejects a run id outside the manifest", async () => {
    const directory = await fixtureDirectory()
    await expect(
      writeRunLibrary({
        condition: "baseline",
        sourceDir,
        outputDir: join(directory, "runs"),
        runIds: ["does-not-exist"],
      }),
    ).rejects.toThrow(/unknown/i)
  })

  it("rejects a manifest with unexpected keys", async () => {
    const directory = await fixtureDirectory()
    await writeFile(
      join(directory, "manifest.json"),
      JSON.stringify({
        fixtureVersion: "decision-replay/2",
        fixtureRevision: "a".repeat(64),
        runs: [],
        annotations: [],
      }),
    )

    await expect(readAgentRunManifest(directory)).rejects.toThrow()
  })
})
