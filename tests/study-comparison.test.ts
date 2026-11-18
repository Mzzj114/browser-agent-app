import { readdir, readFile, rm, unlink, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import { compareStudyBuilds } from "../scripts/study-build.ts"
import type { StudyCondition } from "../src/domain/study-condition.ts"
import { studyConditions } from "../src/domain/study-condition.ts"
import type { StudyRun } from "../src/domain/study-run-schema.ts"
import {
  comparisonReportPath,
  comparisonViewports,
  type StudyEquivalenceReport,
  writeComparisonWorktree,
} from "./fixtures/study-builds.ts"

const ownedDirectories: string[] = []

afterEach(async () => {
  await Promise.all(
    ownedDirectories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

async function build(condition: StudyCondition): Promise<string> {
  const directory = await writeComparisonWorktree(condition)
  ownedDirectories.push(directory)
  return directory
}

async function buildAll(): Promise<Record<StudyCondition, string>> {
  return {
    baseline: await build("baseline"),
    candidates: await build("candidates"),
    probabilities: await build("probabilities"),
  }
}

async function updateReport(
  root: string,
  locale: "zh" | "en",
  viewportIndex: number,
  update: (report: Record<string, unknown>) => void,
): Promise<void> {
  const viewport = comparisonViewports[viewportIndex]
  if (!viewport) throw new Error(`Missing viewport ${viewportIndex}`)
  const path = comparisonReportPath(root, locale, viewport)
  const report = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>
  update(report)
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8")
}

async function updateRun(
  root: string,
  locale: "zh" | "en",
  update: (run: StudyRun) => StudyRun,
): Promise<void> {
  const path = join(root, "dist", "study", `run.${locale}.json`)
  const run = JSON.parse(await readFile(path, "utf8")) as StudyRun
  await writeFile(path, `${JSON.stringify(update(run), null, 2)}\n`, "utf8")
}

function swapEpisodeFourTargets(run: StudyRun): StudyRun {
  return {
    ...run,
    episodes: run.episodes.map((episode) => {
      if (episode.id !== "episode-04" || !("targetHead" in episode) || !episode.targetHead) {
        return episode
      }
      const [first, second, ...rest] = episode.targetHead.offered
      if (!first || !second) return episode
      return {
        ...episode,
        targetHead: {
          ...episode.targetHead,
          offered: [second, first, ...rest],
        },
      }
    }),
  } as StudyRun
}

describe("cross-condition study comparison", () => {
  it("accepts equivalent worktrees with six matching reports", async () => {
    const builds = await buildAll()

    await expect(compareStudyBuilds(builds)).resolves.toBeUndefined()
  })

  it("rejects mismatched common task content across conditions", async () => {
    const builds = await buildAll()
    await updateRun(builds.candidates, "en", (run) => ({
      ...run,
      task: `${run.task} (different common task)`,
    }))

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/common|core|digest/i)
  })

  it("rejects a candidate order that differs from the scored condition", async () => {
    const builds = await buildAll()
    await updateRun(builds.candidates, "en", swapEpisodeFourTargets)
    await updateRun(builds.candidates, "zh", swapEpisodeFourTargets)

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/candidate order/i)
  })

  it("rejects a missing locale/viewport report", async () => {
    const builds = await buildAll()
    const viewport = comparisonViewports[1]
    if (!viewport) throw new Error("Missing comparison viewport")
    await unlink(comparisonReportPath(builds.probabilities, "zh", viewport))

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/missing|report/i)
  })

  it("rejects a pane bound outside the one-pixel tolerance", async () => {
    const builds = await buildAll()
    await updateReport(builds.baseline, "en", 0, (report) => {
      const panes = report["panes"] as Record<string, Record<string, number>>
      const inspector = panes["inspector"]
      if (!inspector) throw new Error("Missing inspector bounds")
      inspector["x"] = (inspector["x"] ?? 0) + 2
    })

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/bound|pane|geometry|tolerance/i)
  })

  it("rejects report fields that could expose inspector scroll or participant answers", async () => {
    const builds = await buildAll()
    await updateReport(builds.candidates, "zh", 2, (report) => {
      report["inspectorScrollHeight"] = 480
      report["participantAnswers"] = [{ episodeId: "episode-04" }]
    })

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/report|invalid|unexpected/i)
  })

  it("rejects a report labelled with the wrong condition", async () => {
    const builds = await buildAll()
    await updateReport(builds.baseline, "en", 1, (report) => {
      report["condition"] = "probabilities"
    })

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/condition/i)
  })

  it("rejects reports whose action order differs", async () => {
    const builds = await buildAll()
    await updateReport(builds.probabilities, "en", 2, (report) => {
      const actionOrder = report["actionOrder"] as string[]
      actionOrder[0] = "A different action"
    })

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/action order/i)
  })

  it("validates exactly six reports for every condition", async () => {
    const builds = await buildAll()
    for (const condition of studyConditions) {
      const directory = join(builds[condition], "test-results", "study-equivalence")
      expect((await readdir(directory)).sort()).toEqual([
        "en-1280x720.json",
        "en-1366x768.json",
        "en-1440x900.json",
        "zh-1280x720.json",
        "zh-1366x768.json",
        "zh-1440x900.json",
      ])
    }
  })
})

// Compile-time assertion that the fixture shape stays the report-shape contract.
const reportContract: StudyEquivalenceReport | null = null
void reportContract
