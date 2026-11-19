import { mkdir, readFile, rm, unlink, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { type BuildReport, verifyStudyBuild } from "../scripts/study-build.ts"
import { studyConditions } from "../src/domain/study-condition.ts"
import { studyRunIndexSchema, studyRunSchema } from "../src/domain/study-run-schema.ts"
import { fixtureRunId, writeBuildFixture } from "./fixtures/study-builds.ts"

const ownedDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    ownedDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function build(condition: (typeof studyConditions)[number]): Promise<string> {
  const directory = await writeBuildFixture(condition)
  ownedDirectories.push(directory)
  return directory
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object")
  }
  return value as Record<string, unknown>
}

async function readJson(path: string): Promise<Record<string, unknown>> {
  return record(JSON.parse(await readFile(path, "utf8")))
}

async function updateJson(
  path: string,
  update: (value: Record<string, unknown>) => void,
): Promise<void> {
  const value = await readJson(path)
  update(value)
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8")
}

async function manifest(directory: string) {
  return studyRunIndexSchema.parse(await readJson(join(directory, "runs", "index.json")))
}

function runPath(directory: string, locale: "zh" | "en"): string {
  return join(directory, "runs", fixtureRunId, `run.${locale}.json`)
}

async function runFile(directory: string, locale: "zh" | "en") {
  return studyRunSchema.parse(await readJson(runPath(directory, locale)))
}

describe("study build verification", () => {
  it("reports the pinned condition, fixture revision, and common-core digests", async () => {
    const directory = await build("baseline")
    const parsed = await manifest(directory)

    const report: BuildReport = await verifyStudyBuild(directory, "baseline")

    expect(Object.keys(report).sort()).toEqual(["condition", "coreDigests", "fixtureRevision"])
    expect(report.condition).toBe("baseline")
    expect(report.fixtureRevision).toBe(parsed.fixtureRevision)
    expect(Object.keys(report.coreDigests).sort()).toEqual(["en", "zh"])
    expect(report.coreDigests.zh).toMatch(/^[0-9a-f]{64}$/)
    expect(report.coreDigests.en).toMatch(/^[0-9a-f]{64}$/)
  })

  it.each(studyConditions)("accepts a %s build for its matching pin", async (condition) => {
    const directory = await build(condition)

    await expect(verifyStudyBuild(directory, condition)).resolves.toMatchObject({ condition })
  })

  it.each([
    ["probabilities", "baseline"],
    ["baseline", "candidates"],
    ["candidates", "probabilities"],
  ] as const)("rejects a %s build for a %s pin", async (actual, expected) => {
    const directory = await build(actual)

    await expect(verifyStudyBuild(directory, expected)).rejects.toThrow(/condition/i)
  })

  it("rejects a serving manifest whose condition differs from the pinned branch", async () => {
    const directory = await build("baseline")
    await updateJson(join(directory, "runs", "index.json"), (value) => {
      Reflect.set(value, "condition", "probabilities")
    })

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/condition/i)
  })

  it("rejects a manifest revision that disagrees with the emitted runs", async () => {
    const directory = await build("baseline")
    await updateJson(join(directory, "runs", "index.json"), (value) => {
      Reflect.set(value, "fixtureRevision", "f".repeat(64))
    })

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/revision/i)
  })

  it("rejects a run whose locale disagrees with its filename", async () => {
    const directory = await build("baseline")
    await updateJson(runPath(directory, "zh"), (value) => {
      Reflect.set(value, "locale", "en")
    })

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/locale/i)
  })

  it("rejects zh and en runs whose shared structure diverges", async () => {
    const directory = await build("candidates")
    await updateJson(runPath(directory, "en"), (value) => {
      const episodes = Reflect.get(value, "episodes") as Record<string, unknown>[]
      const first = episodes[0]
      if (!first) throw new Error("Expected an episode")
      Reflect.set(first, "id", "episode-99")
    })

    await expect(verifyStudyBuild(directory, "candidates")).rejects.toThrow(/structure|mismatch/i)
  })

  it("rejects canonical authoring fixtures copied into the study directory", async () => {
    const directory = await build("baseline")
    await writeFile(join(directory, "runs", "shopping.en.json"), "{}\n", "utf8")

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(
      /unexpected|shopping|fixture/i,
    )
  })

  it("rejects unexpected study fixture entries", async () => {
    const directory = await build("baseline")
    await writeFile(join(directory, "runs", "notes.txt"), "extra\n", "utf8")

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/unexpected|notes/i)
  })

  it("rejects researcher annotation data emitted into the build", async () => {
    const directory = await build("baseline")
    await writeFile(
      join(directory, "assets", "shopping.ground-truth.json"),
      '{ "verdict": "incorrect" }\n',
      "utf8",
    )

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(
      /annotation|ground-truth|json/i,
    )
  })

  it("rejects an unexpected JSON artifact outside the study directory", async () => {
    const directory = await build("baseline")
    await writeFile(join(directory, "assets", "notes.json"), "{}\n", "utf8")

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/json|unexpected/i)
  })

  it.each([
    "assets/transcript.md",
    "assets/events.jsonl",
    "assets/data.csv",
    "assets/sources.zip",
    "assets/Component.jsx",
  ])("rejects an unpermitted %s payload", async (relativePath) => {
    const directory = await build("baseline")
    const outputPath = join(directory, relativePath)
    await mkdir(dirname(outputPath), { recursive: true })
    await writeFile(outputPath, "researcher payload\n", "utf8")

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(
      /unexpected|artifact|extension|path/i,
    )
  })

  it.each(["showcase/index.html", "demo/index.html"])(
    "rejects a nested participant page at %s",
    async (relativePath) => {
      const directory = await build("baseline")
      const outputPath = join(directory, relativePath)
      await mkdir(dirname(outputPath), { recursive: true })
      await writeFile(outputPath, "<!doctype html><title>nested</title>\n", "utf8")

      await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(
        /showcase|unexpected|html/i,
      )
    },
  )

  it("rejects a run with an extra exposure key", async () => {
    const directory = await build("baseline")
    await updateJson(runPath(directory, "en"), (value) => {
      Reflect.set(value, "annotations", [])
    })

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/study build|invalid/i)
  })

  it("rejects missing screenshot evidence", async () => {
    const directory = await build("probabilities")
    const run = await runFile(directory, "en")
    const screenshot = run.observations.find((observation) => observation.screenshot)?.screenshot
    if (!screenshot) throw new Error("Expected a referenced screenshot")

    await unlink(join(directory, screenshot.path))

    await expect(verifyStudyBuild(directory, "probabilities")).rejects.toThrow(/screenshot/i)
  })

  it.each([
    ["python cell", 'const legacy = { tool: "python", code: "print(page_info())" }\n'],
    ["thinking", 'const legacy = { thinking: "private reasoning" }\n'],
    ["legacy fixture revision", 'const legacy = { fixture_version: "bu-replay/1" }\n'],
  ])("rejects legacy fixture %s sentinels in emitted assets", async (_name, contents) => {
    const directory = await build("baseline")
    await writeFile(join(directory, "assets", "legacy.js"), contents, "utf8")

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(
      /legacy|sentinel|python|thinking|fixture/i,
    )
  })

  it("rejects an accidentally emitted showcase page", async () => {
    const directory = await build("baseline")
    await writeFile(
      join(directory, "showcase.html"),
      "<!doctype html><title>showcase</title>\n",
      "utf8",
    )

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/showcase/i)
  })

  it("rejects emitted source maps", async () => {
    const directory = await build("baseline")
    await writeFile(join(directory, "assets", "index.js.map"), "{}\n", "utf8")

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/source map|\.map/i)
  })

  it("rejects a source map reference in an emitted script", async () => {
    const directory = await build("baseline")
    await writeFile(
      join(directory, "assets", "index.js"),
      'console.log("build")\n//# sourceMappingURL=index.js.map\n',
      "utf8",
    )

    await expect(verifyStudyBuild(directory, "baseline")).rejects.toThrow(/source map/i)
  })

  it("allows generic probability and schema copy in JavaScript", async () => {
    const directory = await build("baseline")
    await writeFile(
      join(directory, "assets", "index.js"),
      'const copy = "probability schemas and participant copy are generic";\n',
      "utf8",
    )

    await expect(verifyStudyBuild(directory, "baseline")).resolves.toMatchObject({
      condition: "baseline",
    })
  })

  it("keeps common-core digests equal across conditions", async () => {
    const reports = await Promise.all(
      studyConditions.map(async (condition) => verifyStudyBuild(await build(condition), condition)),
    )

    for (const report of reports) {
      expect(report.coreDigests).toEqual(reports[0]?.coreDigests)
    }
  })
})
