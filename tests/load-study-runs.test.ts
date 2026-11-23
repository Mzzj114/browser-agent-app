import { describe, expect, it } from "vitest"
import { loadRunIndex, loadStudyRun } from "../src/data/load-study-runs.ts"
import type { StudyCondition } from "../src/domain/study-condition.ts"
import { studyConditions } from "../src/domain/study-condition.ts"
import { studyRunSchema } from "../src/domain/study-run-schema.ts"
import { studyRuns } from "./fixtures/decision-runs.ts"

const runId = "fixture-run"

type FixtureFiles = Record<string, unknown>

function fixtureFiles(condition: StudyCondition): FixtureFiles {
  const runs = studyRuns(condition)
  const zh = { ...runs.zh, runId }
  const en = { ...runs.en, runId }
  return {
    "index.json": {
      fixtureVersion: runs.zh.fixtureVersion,
      condition,
      fixtureRevision: runs.zh.fixtureRevision,
      runs: [
        {
          id: runId,
          ordinal: 1,
          steps: zh.episodes.length,
          title: { zh: "记录", en: "Run" },
          files: { zh: "run.zh.json", en: "run.en.json" },
        },
      ],
    },
    [`${runId}/run.zh.json`]: structuredClone(zh),
    [`${runId}/run.en.json`]: structuredClone(en),
  }
}

function respondWith(
  files: FixtureFiles,
  overrides: Record<string, { status: number; body: string }> = {},
) {
  const calls: string[] = []
  const fetcher = (async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url
    calls.push(new URL(url).pathname)
    const key = new URL(url).pathname.replace(/^\/runs\//, "")
    const override = overrides[key]
    if (override) return new Response(override.body, { status: override.status })
    if (!(key in files)) return new Response("missing", { status: 404 })
    return new Response(JSON.stringify(files[key]), { status: 200 })
  }) as typeof fetch
  return { calls, fetcher }
}

function baseUrl(): URL {
  return new URL("http://fixture.test/runs/")
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

describe("run library loading", () => {
  it.each(studyConditions)("loads both locales for %s", async (condition) => {
    const files = fixtureFiles(condition)
    const { fetcher } = respondWith(files)
    const index = await loadRunIndex(baseUrl(), condition, fetcher)

    const runs = await loadStudyRun(baseUrl(), index, runId, fetcher)

    expect(runs.zh).toEqual(files[`${runId}/run.zh.json`])
    expect(runs.en).toEqual(files[`${runId}/run.en.json`])
  })

  it("fetches the index before the two locale files", async () => {
    const files = fixtureFiles("baseline")
    const { calls, fetcher } = respondWith(files)

    const index = await loadRunIndex(baseUrl(), "baseline", fetcher)
    await loadStudyRun(baseUrl(), index, runId, fetcher)

    expect(calls).toEqual([
      "/runs/index.json",
      `/runs/${runId}/run.zh.json`,
      `/runs/${runId}/run.en.json`,
    ])
  })

  it("rejects a forged index condition", async () => {
    const files = fixtureFiles("baseline")
    record(files["index.json"])["condition"] = "probabilities"

    await expect(loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)).rejects.toThrow(
      /condition/i,
    )
  })

  it("rejects an index with unexpected keys", async () => {
    const files = fixtureFiles("baseline")
    record(files["index.json"])["annotations"] = []

    await expect(loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)).rejects.toThrow()
  })

  it("rejects richer run payloads with unexpected keys", async () => {
    const files = fixtureFiles("baseline")
    record(files[`${runId}/run.en.json`])["annotations"] = []
    const index = await loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)

    await expect(
      loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher),
    ).rejects.toThrow()
  })

  it("rejects a revision that does not match the index", async () => {
    const files = fixtureFiles("baseline")
    record(files[`${runId}/run.zh.json`])["fixtureRevision"] = "e".repeat(64)
    record(files[`${runId}/run.en.json`])["fixtureRevision"] = "e".repeat(64)
    const index = await loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)

    await expect(loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher)).rejects.toThrow(
      /revision/i,
    )
  })

  it("rejects a locale key mismatch", async () => {
    const files = fixtureFiles("baseline")
    record(files[`${runId}/run.zh.json`])["locale"] = "en"
    const index = await loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)

    await expect(loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher)).rejects.toThrow(
      /locale/i,
    )
  })

  it("rejects a missing locale file", async () => {
    const files = fixtureFiles("baseline")
    const index = await loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)
    const { fetcher } = respondWith(files, {
      [`${runId}/run.zh.json`]: { status: 404, body: "missing" },
    })

    await expect(loadStudyRun(baseUrl(), index, runId, fetcher)).rejects.toThrow(/HTTP 404/)
  })

  it("rejects an HTTP error on the index", async () => {
    const files = fixtureFiles("baseline")
    const { fetcher } = respondWith(files, {
      "index.json": { status: 500, body: "server error" },
    })

    await expect(loadRunIndex(baseUrl(), "baseline", fetcher)).rejects.toThrow(/HTTP 500/)
  })

  it("rejects invalid JSON", async () => {
    const files = fixtureFiles("baseline")
    const { fetcher } = respondWith(files, {
      "index.json": { status: 200, body: "{not json" },
    })

    await expect(loadRunIndex(baseUrl(), "baseline", fetcher)).rejects.toThrow(/valid JSON/i)
  })

  it("rejects mismatched episode structures between locales", async () => {
    const files = fixtureFiles("baseline")
    episodeRecord(record(files[`${runId}/run.en.json`]))["id"] = "episode-99"
    const index = await loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)

    await expect(loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher)).rejects.toThrow(
      /structure/i,
    )
  })

  it("rejects a valid-looking but mismatched preview order between locales", async () => {
    const files = fixtureFiles("candidates")
    const episode = episodeRecord(record(files[`${runId}/run.en.json`]), 2)
    const head = record(episode["operationHead"])
    const previewIds = head["previewIds"]
    if (!Array.isArray(previewIds) || previewIds.length < 2) {
      throw new Error("Expected multiple preview IDs")
    }
    head["previewIds"] = [...previewIds].reverse()
    const index = await loadRunIndex(baseUrl(), "candidates", respondWith(files).fetcher)

    await expect(loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher)).rejects.toThrow(
      /structure/i,
    )
  })

  it("rejects a valid-looking but mismatched reported confidence between locales", async () => {
    const files = fixtureFiles("probabilities")
    const episode = episodeRecord(record(files[`${runId}/run.en.json`]), 0)
    record(episode["operationHead"])["reportedConfidence"] = 0.1
    const index = await loadRunIndex(baseUrl(), "probabilities", respondWith(files).fetcher)

    await expect(loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher)).rejects.toThrow(
      /structure/i,
    )
  })

  it("rejects a mismatched outcome presence between locales", async () => {
    const files = fixtureFiles("baseline")
    episodeRecord(record(files[`${runId}/run.en.json`]), 1)["outcome"] = {
      kind: "observation",
      text: "Locale-specific wording that is not compared.",
    }
    const index = await loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)

    await expect(loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher)).rejects.toThrow(
      /structure/i,
    )
  })

  it("rejects a mismatched entered-text presence between locales", async () => {
    const files = fixtureFiles("baseline")
    episodeRecord(record(files[`${runId}/run.en.json`]), 0)["enteredText"] = null
    const index = await loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)

    await expect(loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher)).rejects.toThrow(
      /structure/i,
    )
  })

  it("rejects a step count that disagrees with the index", async () => {
    const files = fixtureFiles("baseline")
    const indexValue = record(files["index.json"])
    const runs = indexValue["runs"]
    if (!Array.isArray(runs)) throw new Error("Expected runs")
    record(runs[0])["steps"] = 99
    const index = await loadRunIndex(baseUrl(), "baseline", respondWith(files).fetcher)

    await expect(loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher)).rejects.toThrow(
      /step count/i,
    )
  })

  it("rejects an unknown run id without fetching a run file", async () => {
    const files = fixtureFiles("baseline")
    const { calls, fetcher } = respondWith(files)
    const index = await loadRunIndex(baseUrl(), "baseline", fetcher)

    await expect(loadStudyRun(baseUrl(), index, "missing-run", fetcher)).rejects.toThrow(/unknown/i)
    expect(calls).toEqual(["/runs/index.json"])
  })

  it("rejects a traversal-like run id without fetching", async () => {
    const files = fixtureFiles("baseline")
    const { calls, fetcher } = respondWith(files)
    const index = await loadRunIndex(baseUrl(), "baseline", fetcher)

    await expect(loadStudyRun(baseUrl(), index, "../secret", fetcher)).rejects.toThrow(/unknown/i)
    expect(calls).toEqual(["/runs/index.json"])
  })

  it("does not compare localized action, context, or entered-text contents", async () => {
    const files = fixtureFiles("candidates")
    for (const locale of ["zh", "en"] as const) {
      const episode = episodeRecord(record(files[`${runId}/run.${locale}.json`]), 0)
      episode["action"] = `Localized action (${locale})`
      episode["enteredText"] = `Localized input (${locale})`
      const head = record(episode["operationHead"])
      const offered = head["offered"]
      if (!Array.isArray(offered)) throw new Error("Expected offered candidates")
      record(offered[0])["label"] = `Localized label (${locale})`
      record(offered[0])["context"] = `Localized context (${locale})`
    }
    const index = await loadRunIndex(baseUrl(), "candidates", respondWith(files).fetcher)

    await expect(
      loadStudyRun(baseUrl(), index, runId, respondWith(files).fetcher),
    ).resolves.toBeDefined()
  })

  it("never falls back to another fixture source", async () => {
    const files = fixtureFiles("baseline")
    record(files["index.json"])["condition"] = "candidates"
    const { calls, fetcher } = respondWith(files)

    await expect(loadRunIndex(baseUrl(), "baseline", fetcher)).rejects.toThrow()
    expect(calls).toEqual(["/runs/index.json"])
  })
})

describe("synthetic canonical pair", () => {
  it("has a valid projected run for every condition", () => {
    for (const condition of studyConditions) {
      const runs = studyRuns(condition)
      expect(studyRunSchema.safeParse(runs.zh).success).toBe(true)
      expect(studyRunSchema.safeParse(runs.en).success).toBe(true)
    }
  })
})
