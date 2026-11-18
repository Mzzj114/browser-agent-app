import { createHash } from "node:crypto"
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { writeStudyFixtures } from "../scripts/study-fixtures.ts"
import { coreView, projectRun } from "../src/domain/project-run.ts"
import { type StudyCondition, studyConditions } from "../src/domain/study-condition.ts"
import { studyManifestSchema, studyRunSchema } from "../src/domain/study-run-schema.ts"
import { canonicalRun, studyRuns } from "./fixtures/decision-runs.ts"

const fixtureRevision = "0".repeat(64)
const temporaryRoot = join(process.env["LOCALAPPDATA"] ?? tmpdir(), "Temp", "opencode")
const ownedDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    ownedDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function fixtureDirectory(): Promise<string> {
  await mkdir(temporaryRoot, { recursive: true })
  const directory = await mkdtemp(join(temporaryRoot, "study-fixtures-"))
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

function canonicalFixturePath(locale: "zh" | "en"): string {
  return join(process.cwd(), "fixtures", "decision-runs", `shopping.${locale}.json`)
}

const fixedFiles = ["manifest.json", "run.en.json", "run.zh.json"]

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

  it("physically removes decision heads from baseline episodes", () => {
    const run = projected("baseline")
    if (run.condition !== "baseline") throw new Error("Expected a baseline run")
    expect(run.episodes.every((episode) => !("operationHead" in episode))).toBe(true)
    expect(run.episodes.every((episode) => !("targetHead" in episode))).toBe(true)
  })

  it("projects only the core episode keys for baseline", () => {
    const run = projected("baseline")
    if (run.condition !== "baseline") throw new Error("Expected a baseline run")
    for (const episode of run.episodes) {
      expect(Object.keys(episode).sort()).toEqual(
        [
          "action",
          "afterObservationId",
          "beforeObservationId",
          "enteredText",
          "executedAt",
          "id",
          "operation",
          "ordinal",
          "outcome",
        ].sort(),
      )
    }
  })

  it("keeps candidate rows unscored in the candidates condition", () => {
    for (const episode of experimentalEpisodes(projected("candidates"))) {
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

  it("never projects confidence fields or researcher annotations", () => {
    const serialized = studyConditions
      .map((condition) => JSON.stringify(projected(condition)))
      .join("\n")
    expect(serialized).not.toContain("confidence")
    expect(serialized).not.toContain("annotations")
    expect(serialized).not.toContain("groundTruth")
    expect(serialized).not.toContain("earliest_mistake")
  })

  it("preserves common run fields and observations", () => {
    const run = projected("baseline")
    const canonical = canonicalRun("en")
    expect(run.runId).toBe(canonical.runId)
    expect(run.task).toBe(canonical.task)
    expect(run.report).toBe(canonical.report)
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

  it("rejects a probabilities candidate row without a probability", () => {
    const forged = structuredClone(projected("probabilities")) as unknown as Record<string, unknown>
    const episodes = forged["episodes"] as Record<string, unknown>[]
    const head = record(record(episodes[0])["operationHead"])
    const offered = head["offered"] as Record<string, unknown>[]
    const candidate = { ...offered[0] }
    delete candidate["probability"]
    offered[0] = candidate
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

  it.each([
    ["candidates", "episode-01", "TYPE_TEXT"],
    ["candidates", "episode-04", "CLICK"],
    ["candidates", "episode-05", "SELECT"],
    ["probabilities", "episode-01", "TYPE_TEXT"],
    ["probabilities", "episode-04", "CLICK"],
    ["probabilities", "episode-05", "SELECT"],
  ] as const)(
    "rejects a %s %s operation without target evidence",
    (condition, episodeId, operation) => {
      const forged = structuredClone(projected(condition)) as unknown as Record<string, unknown>
      const episodes = forged["episodes"] as Record<string, unknown>[]
      const episode = episodes.find((candidate) => candidate["id"] === episodeId)
      if (!episode) throw new Error(`Expected ${episodeId}`)
      expect(episode["operation"]).toBe(operation)
      episode["targetHead"] = null
      expect(studyRunSchema.safeParse(forged).success).toBe(false)
    },
  )

  it("rejects unexpected key surfaces", () => {
    const forged = structuredClone(projected("baseline")) as unknown as Record<string, unknown>
    forged["annotations"] = []
    expect(studyRunSchema.safeParse(forged).success).toBe(false)
  })
})

describe("study fixture generation", () => {
  it("writes exactly the fixed trio twice with byte-identical output", async () => {
    const first = await fixtureDirectory()
    const second = await fixtureDirectory()
    const manifest = await writeStudyFixtures({ condition: "baseline", outputDir: first })
    await writeStudyFixtures({ condition: "baseline", outputDir: second })

    expect((await readdir(first)).sort()).toEqual(fixedFiles)
    expect((await readdir(second)).sort()).toEqual(fixedFiles)
    for (const file of fixedFiles) {
      expect(await readFile(join(first, file))).toEqual(await readFile(join(second, file)))
    }
    expect(manifest.condition).toBe("baseline")
    expect(manifest.files).toEqual({ zh: "run.zh.json", en: "run.en.json" })
  })

  it("hashes both canonical source files in zh then en order", async () => {
    const directory = await fixtureDirectory()
    const manifest = await writeStudyFixtures({ condition: "probabilities", outputDir: directory })
    const expected = createHash("sha256")
    expected.update(await readFile(canonicalFixturePath("zh")))
    expected.update(await readFile(canonicalFixturePath("en")))
    expect(manifest.fixtureRevision).toBe(expected.digest("hex"))
    expect(manifest.fixtureRevision).toMatch(/^[0-9a-f]{64}$/)
    expect(studyManifestSchema.safeParse(manifest).success).toBe(true)
  })

  it("writes the projected runs named by the manifest", async () => {
    const directory = await fixtureDirectory()
    const manifest = await writeStudyFixtures({ condition: "candidates", outputDir: directory })
    const parsedManifest = studyManifestSchema.parse(
      JSON.parse(await readFile(join(directory, "manifest.json"), "utf8")),
    )
    expect(parsedManifest).toEqual(manifest)

    for (const locale of ["zh", "en"] as const) {
      const file = parsedManifest.files[locale]
      const run = studyRunSchema.parse(JSON.parse(await readFile(join(directory, file), "utf8")))
      expect(run).toEqual(projectRun(canonicalRun(locale), "candidates", manifest.fixtureRevision))
      expect(JSON.stringify(run)).not.toContain("probability")
    }
  })

  it("fails instead of deleting unknown pre-existing files", async () => {
    const directory = await fixtureDirectory()
    const unrelated = join(directory, "notes.txt")
    await writeFile(unrelated, "keep me", "utf8")

    await expect(
      writeStudyFixtures({ condition: "baseline", outputDir: directory }),
    ).rejects.toThrow(/unexpected/i)
    expect(await readFile(unrelated, "utf8")).toBe("keep me")
    expect((await readdir(directory)).sort()).toEqual(["notes.txt"])
  })

  it("provides valid in-memory runs for every condition", () => {
    for (const condition of studyConditions) {
      const runs = studyRuns(condition)
      expect(runs.zh.condition).toBe(condition)
      expect(runs.en.condition).toBe(condition)
      expect(studyRunSchema.safeParse(runs.zh).success).toBe(true)
      expect(studyRunSchema.safeParse(runs.en).success).toBe(true)
    }
  })
})
