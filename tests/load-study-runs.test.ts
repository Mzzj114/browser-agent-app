import { describe, expect, it } from "vitest"
import { loadStudyRuns } from "../src/data/load-study-runs.ts"
import type { StudyCondition } from "../src/domain/study-condition.ts"
import { studyConditions } from "../src/domain/study-condition.ts"
import { studyRuns } from "./fixtures/decision-runs.ts"

type FixtureFile = "manifest.json" | "run.en.json" | "run.zh.json"
type FixtureFiles = Record<FixtureFile, unknown>

type ResponseOverride = {
  readonly status: number
  readonly body: string
}

function fixtureFiles(condition: StudyCondition): FixtureFiles {
  const runs = studyRuns(condition)
  return {
    "manifest.json": {
      fixtureVersion: runs.zh.fixtureVersion,
      condition,
      fixtureRevision: runs.zh.fixtureRevision,
      files: { zh: "run.zh.json", en: "run.en.json" },
    },
    "run.zh.json": structuredClone(runs.zh),
    "run.en.json": structuredClone(runs.en),
  }
}

function respondWith(
  files: FixtureFiles,
  overrides: Partial<Record<FixtureFile, ResponseOverride>> = {},
) {
  const calls: string[] = []
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    calls.push(url)
    const name = new URL(url).pathname.split("/").at(-1) ?? ""
    const override = overrides[name as FixtureFile]
    if (override) return new Response(override.body, { status: override.status })
    if (!(name in files)) return new Response("missing", { status: 404 })
    return new Response(JSON.stringify(files[name as FixtureFile]), { status: 200 })
  }) as typeof fetch
  return { calls, fetcher }
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Expected an object")
  }
  return value as Record<string, unknown>
}

function episodeRecord(run: Record<string, unknown>, index = 0): Record<string, unknown> {
  const episodes = run["episodes"]
  if (!Array.isArray(episodes)) throw new Error("Expected episodes")
  const episode = episodes[index]
  if (episode === undefined) throw new Error("Expected an episode")
  return record(episode)
}

function baseUrl(): URL {
  return new URL("../study/", document.baseURI)
}

describe("study run loading", () => {
  it.each(studyConditions)("loads both locales for %s", async (condition) => {
    const files = fixtureFiles(condition)
    const { fetcher } = respondWith(files)

    const runs = await loadStudyRuns(baseUrl(), condition, fetcher)

    expect(runs.zh).toEqual(files["run.zh.json"])
    expect(runs.en).toEqual(files["run.en.json"])
  })

  it("fetches the manifest and both fixed locale files concurrently", async () => {
    const files = fixtureFiles("baseline")
    const { calls, fetcher } = respondWith(files)
    const base = baseUrl()

    await loadStudyRuns(base, "baseline", fetcher)

    expect(calls.sort()).toEqual(
      ["manifest.json", "run.en.json", "run.zh.json"].map((file) => new URL(file, base).href),
    )
  })

  it("rejects a forged manifest condition", async () => {
    const files = fixtureFiles("baseline")
    record(files["manifest.json"])["condition"] = "probabilities"
    const { fetcher } = respondWith(files)

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow(/condition/i)
  })

  it("rejects a manifest with unexpected keys", async () => {
    const files = fixtureFiles("baseline")
    record(files["manifest.json"])["annotations"] = []
    const { fetcher } = respondWith(files)

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow()
  })

  it("rejects richer run payloads with unexpected keys", async () => {
    const files = fixtureFiles("baseline")
    record(files["run.en.json"])["annotations"] = []
    const { fetcher } = respondWith(files)

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow()
  })

  it("rejects a locale revision mismatch between files", async () => {
    const files = fixtureFiles("baseline")
    record(files["run.en.json"])["fixtureRevision"] = "f".repeat(64)
    const { fetcher } = respondWith(files)

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow(/revision/i)
  })

  it("rejects a revision that does not match the manifest", async () => {
    const files = fixtureFiles("baseline")
    record(files["run.zh.json"])["fixtureRevision"] = "e".repeat(64)
    record(files["run.en.json"])["fixtureRevision"] = "e".repeat(64)
    const { fetcher } = respondWith(files)

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow(/revision/i)
  })

  it("rejects a locale key mismatch", async () => {
    const files = fixtureFiles("baseline")
    record(files["run.zh.json"])["locale"] = "en"
    const { fetcher } = respondWith(files)

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow(/locale/i)
  })

  it("rejects a missing locale file", async () => {
    const files = fixtureFiles("baseline")
    const { fetcher } = respondWith(files, { "run.zh.json": { status: 404, body: "missing" } })

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow(/HTTP 404/)
  })

  it("rejects an HTTP error", async () => {
    const files = fixtureFiles("baseline")
    const { fetcher } = respondWith(files, {
      "manifest.json": { status: 500, body: "server error" },
    })

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow(/HTTP 500/)
  })

  it("rejects invalid JSON", async () => {
    const files = fixtureFiles("baseline")
    const { fetcher } = respondWith(files, {
      "manifest.json": { status: 200, body: "{not json" },
    })

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow(/valid JSON/i)
  })

  it("rejects mismatched episode structures between locales", async () => {
    const files = fixtureFiles("baseline")
    episodeRecord(record(files["run.en.json"]))["id"] = "episode-99"
    const { fetcher } = respondWith(files)

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow(/structure/i)
  })

  it("rejects mismatched candidate structures between locales", async () => {
    const files = fixtureFiles("candidates")
    const episode = episodeRecord(record(files["run.en.json"]))
    const head = record(episode["operationHead"])
    const offered = head["offered"]
    if (!Array.isArray(offered)) throw new Error("Expected offered candidates")
    offered.reverse()
    const { fetcher } = respondWith(files)

    await expect(loadStudyRuns(baseUrl(), "candidates", fetcher)).rejects.toThrow(/structure/i)
  })

  it("never falls back to another fixture source", async () => {
    const files = fixtureFiles("baseline")
    record(files["manifest.json"])["condition"] = "candidates"
    const { calls, fetcher } = respondWith(files)

    await expect(loadStudyRuns(baseUrl(), "baseline", fetcher)).rejects.toThrow()
    expect(calls).toHaveLength(3)
    expect(calls.every((url) => url.startsWith(baseUrl().href))).toBe(true)
  })
})
