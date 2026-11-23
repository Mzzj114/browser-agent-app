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
  fixtureRunId,
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

async function rewriteEveryReport(
  root: string,
  update: (report: Record<string, unknown>) => void,
): Promise<void> {
  for (const locale of ["zh", "en"] as const) {
    for (const viewport of comparisonViewports) {
      const path = comparisonReportPath(root, locale, viewport)
      const report = JSON.parse(await readFile(path, "utf8")) as Record<string, unknown>
      update(report)
      await writeFile(path, `${JSON.stringify(report, null, 2)}\n`, "utf8")
    }
  }
}

async function copyOneReportUnderEveryName(
  root: string,
  sourceLocale: "zh" | "en",
  sourceViewportIndex: number,
): Promise<void> {
  const sourceViewport = comparisonViewports[sourceViewportIndex]
  if (!sourceViewport) throw new Error(`Missing viewport ${sourceViewportIndex}`)
  const source = await readFile(comparisonReportPath(root, sourceLocale, sourceViewport), "utf8")
  for (const locale of ["zh", "en"] as const) {
    for (const viewport of comparisonViewports) {
      await writeFile(comparisonReportPath(root, locale, viewport), source, "utf8")
    }
  }
}

async function updateRun(
  root: string,
  locale: "zh" | "en",
  update: (run: StudyRun) => StudyRun,
): Promise<void> {
  const path = join(root, "dist", "runs", fixtureRunId, `run.${locale}.json`)
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

  it("rejects a valid but changed unscored preview order", async () => {
    const builds = await buildAll()
    const reorderPreviews = (run: StudyRun): StudyRun =>
      ({
        ...run,
        episodes: run.episodes.map((episode) => {
          if (!("operationHead" in episode) || episode.id !== "episode-03") return episode
          const previewIds = episode.operationHead.previewIds
          if (previewIds.length < 2) return episode
          return {
            ...episode,
            operationHead: { ...episode.operationHead, previewIds: [...previewIds].reverse() },
          }
        }),
      }) as StudyRun
    await updateRun(builds.candidates, "en", reorderPreviews)
    await updateRun(builds.candidates, "zh", reorderPreviews)

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/candidate order/i)
  })

  it("rejects a missing locale/viewport report", async () => {
    const builds = await buildAll()
    const viewport = comparisonViewports[1]
    if (!viewport) throw new Error("Missing comparison viewport")
    await unlink(comparisonReportPath(builds.probabilities, "zh", viewport))

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/missing|report/i)
  })

  it("rejects reports copied from one locale/size under every filename, even when consistent across conditions", async () => {
    const builds = await buildAll()
    for (const condition of studyConditions) {
      await copyOneReportUnderEveryName(builds[condition], "en", 0)
    }

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/locale|viewport|metadata|filename/i)
  })

  it("rejects consistently mislabeled locale metadata under the correct filenames", async () => {
    const builds = await buildAll()
    for (const condition of studyConditions) {
      await rewriteEveryReport(builds[condition], (report) => {
        const viewport = report["viewport"] as Record<string, unknown>
        if (report["locale"] === "zh" && viewport["width"] === 1280 && viewport["height"] === 720) {
          report["locale"] = "en"
        }
      })
    }

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/locale|metadata|filename/i)
  })

  it("rejects a browserFrame pane width outside the one-pixel tolerance", async () => {
    const builds = await buildAll()
    await updateReport(builds.baseline, "en", 0, (report) => {
      const panes = report["panes"] as Record<string, Record<string, number>>
      const browserFrame = panes["browserFrame"]
      if (!browserFrame) throw new Error("Missing browser frame bounds")
      browserFrame["width"] = (browserFrame["width"] ?? 0) + 2
    })

    await expect(compareStudyBuilds(builds)).rejects.toThrow(
      /browserFrame|bound|geometry|tolerance/i,
    )
  })

  it("rejects a pairwise one-pixel overshoot between the two experimental conditions", async () => {
    const builds = await buildAll()
    await updateReport(builds.candidates, "en", 0, (report) => {
      const panes = report["panes"] as Record<string, Record<string, number>>
      const browserFrame = panes["browserFrame"]
      if (!browserFrame) throw new Error("Missing browser frame bounds")
      browserFrame["x"] = (browserFrame["x"] ?? 0) + 1
    })
    await updateReport(builds.probabilities, "en", 0, (report) => {
      const panes = report["panes"] as Record<string, Record<string, number>>
      const browserFrame = panes["browserFrame"]
      if (!browserFrame) throw new Error("Missing browser frame bounds")
      browserFrame["x"] = (browserFrame["x"] ?? 0) - 1
    })

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/differ|tolerance|pairwise/i)
  })

  it("rejects an obsolete study-equivalence/1 report", async () => {
    const builds = await buildAll()
    await updateReport(builds.probabilities, "zh", 1, (report) => {
      report["schemaVersion"] = "study-equivalence/1"
    })

    await expect(compareStudyBuilds(builds)).rejects.toThrow(
      /schema version|unsupported|schemaVersion/i,
    )
  })

  it("rejects pane or control names outside the shared review contract", async () => {
    const builds = await buildAll()
    await updateReport(builds.candidates, "en", 2, (report) => {
      const panes = report["panes"] as Record<string, Record<string, number>>
      panes["cardContent"] = { x: 0, y: 0, width: 100, height: 100 }
    })

    await expect(compareStudyBuilds(builds)).rejects.toThrow(/unexpected field|cardContent/i)

    const rebuilt = await buildAll()
    await updateReport(rebuilt.candidates, "zh", 2, (report) => {
      const controls = report["controls"] as Record<string, Record<string, number>>
      controls["jump"] = { x: 0, y: 0, width: 100, height: 100 }
    })

    await expect(compareStudyBuilds(rebuilt)).rejects.toThrow(/unexpected field|jump/i)
  })

  it("rejects report fields that could expose review scroll or participant answers", async () => {
    const builds = await buildAll()
    await updateReport(builds.candidates, "zh", 2, (report) => {
      report["reviewScrollHeight"] = 480
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
