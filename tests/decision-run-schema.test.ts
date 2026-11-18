import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import legacyEn from "../src/data/agent-run.en.json"
import legacyZh from "../src/data/agent-run.json"
import { type DecisionRun, decisionRunSchema } from "../src/domain/decision-run-schema"
import { canonicalRun, type EdgeRunKind, edgeRun } from "./fixtures/decision-runs"
import shoppingGroundTruth from "./fixtures/shopping.ground-truth.json"

const locales = ["zh", "en"] as const

const edgeRunKinds: readonly EdgeRunKind[] = [
  "operation-error",
  "blocked",
  "controls",
  "successful",
  "recovered",
  "repeated-targets",
  "long-list",
  "missing-image",
]

function observationFor(run: DecisionRun, id: string) {
  const observation = run.observations.find((item) => item.id === id)
  if (!observation) throw new Error(`Missing observation ${id}`)
  return observation
}

function episodeFor(run: DecisionRun, id: string) {
  const episode = run.episodes.find((item) => item.id === id)
  if (!episode) throw new Error(`Missing episode ${id}`)
  return episode
}

function screenshotFor(run: DecisionRun, observationId: string) {
  const screenshot = observationFor(run, observationId).screenshot
  if (!screenshot) throw new Error(`Missing screenshot for ${observationId}`)
  return screenshot
}

function targetHeadFor(run: DecisionRun, episodeId: string) {
  const targetHead = episodeFor(run, episodeId).targetHead
  if (!targetHead) throw new Error(`Missing target head for ${episodeId}`)
  return targetHead
}

function headSignature(head: DecisionRun["episodes"][number]["operationHead"]) {
  return {
    offered: head.offered.map((candidate) => ({
      id: candidate.id,
      probability: candidate.probability,
    })),
    selectedId: head.selectedId,
  }
}

function runStructure(run: DecisionRun) {
  return {
    observations: run.observations.map((observation) => ({
      id: observation.id,
      file: observation.screenshot?.path.split("/").at(-1) ?? null,
      width: observation.screenshot?.width ?? null,
      height: observation.screenshot?.height ?? null,
      source: observation.screenshot?.source ?? null,
    })),
    initialObservationId: run.initialObservationId,
    finalObservationId: run.finalObservationId,
    episodes: run.episodes.map((episode) => ({
      id: episode.id,
      ordinal: episode.ordinal,
      operation: episode.operation,
      executedAt: episode.executedAt,
      beforeObservationId: episode.beforeObservationId,
      afterObservationId: episode.afterObservationId,
      hasEnteredText: episode.enteredText !== null,
      operationHead: headSignature(episode.operationHead),
      targetHead: episode.targetHead
        ? {
            operation: episode.targetHead.operation,
            ...headSignature(episode.targetHead),
          }
        : null,
    })),
  }
}

describe.each(locales)("canonical decision run (%s)", (locale) => {
  it("contains eight ordered episodes with stable IDs", () => {
    // Given the canonical fixture for this locale.
    const run = canonicalRun(locale)

    // When the episodes are inspected.
    // Then the agreed sequence is complete and chronological.
    expect(run.episodes.map((episode) => episode.id)).toEqual([
      "episode-01",
      "episode-02",
      "episode-03",
      "episode-04",
      "episode-05",
      "episode-06",
      "episode-07",
      "episode-08",
    ])
    expect(run.episodes.map((episode) => episode.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(decisionRunSchema.safeParse(run).success).toBe(true)
  })

  it("uses the authored before-image sequence and a separate cart observation", () => {
    // Given the canonical fixture.
    const run = canonicalRun(locale)

    // When each episode's before observation is resolved.
    const beforeFiles = run.episodes.map((episode) => {
      const file = screenshotFor(run, episode.beforeObservationId).path.split("/").at(-1)
      return file?.replace(/\.webp$/, "")
    })

    // Then the screenshots match the eight-step timeline rather than shifted captions.
    expect(beforeFiles).toEqual([
      "01-home",
      "02-search-filled",
      "03-results",
      "04-sorted",
      "05-product",
      "06-size-selected",
      "07-added",
      "08-cart",
    ])
    expect(run.initialObservationId).toBe("obs-00")
    expect(run.finalObservationId).toBe("obs-08")
    expect(run.episodes.at(-1)?.afterObservationId).toBe("obs-08")
    expect(run.episodes.at(-2)?.afterObservationId).toBe("obs-07")
    expect(screenshotFor(run, "obs-07").path).toMatch(/08-cart\.webp$/)
    expect(screenshotFor(run, "obs-08").path).toMatch(/08-cart\.webp$/)
  })

  it("opens Cloud Walk on episode-04 and terminates with DONE", () => {
    // Given the canonical fixture.
    const run = canonicalRun(locale)
    const openingEpisode = episodeFor(run, "episode-04")
    const terminalEpisode = run.episodes.at(-1)

    // When the potentially mistaken action and the terminal action are inspected.
    // Then episode-04 states the product actually opened and DONE carries no target.
    const expectedProduct = locale === "zh" ? "云漫步" : "Cloud Walk"
    expect(openingEpisode.operation).toBe("CLICK")
    expect(openingEpisode.action).toContain(expectedProduct)
    expect(targetHeadFor(run, "episode-04").selectedId).toBe("target-cloud-walk")
    expect(
      targetHeadFor(run, "episode-04").offered.find(
        (candidate) => candidate.id === "target-cloud-walk",
      )?.label,
    ).toContain(expectedProduct)
    expect(terminalEpisode?.operation).toBe("DONE")
    expect(terminalEpisode?.targetHead).toBeNull()
    expect(terminalEpisode?.operationHead.selectedId).toBe("DONE")
  })

  it("binds every observation to an existing synthetic-render screenshot", () => {
    // Given the canonical fixture.
    const run = canonicalRun(locale)

    // When every screenshot binding is resolved on disk.
    // Then provenance, dimensions, and the reused asset are explicit.
    for (const observation of run.observations) {
      expect(observation.screenshot).not.toBeNull()
      const screenshot = screenshotFor(run, observation.id)
      expect(screenshot.source).toBe("synthetic-render")
      expect(screenshot.width).toBe(1200)
      expect(screenshot.height).toBe(800)
      expect(existsSync(resolve("public", screenshot.path))).toBe(true)
    }
  })

  it("keeps the task and final report verbatim from the existing locale fixture", () => {
    // Given the legacy fixture and the canonical fixture.
    const run = canonicalRun(locale)
    const legacy = locale === "zh" ? legacyZh : legacyEn

    // When their prompts and reports are compared.
    // Then the agent's claim is reused without an objectively verified rewrite.
    expect(run.task).toBe(legacy.task)
    expect(run.report).toBe(legacy.final.text)
  })
})

describe("bilingual decision data", () => {
  it("keeps IDs, head order, and scores identical across locales", () => {
    // Given both locale fixtures.
    const zh = canonicalRun("zh")
    const en = canonicalRun("en")

    // When their locale-independent structure is compared.
    // Then only localized copy differs.
    expect(runStructure(zh)).toEqual(runStructure(en))
  })

  it("returns a fresh clone for each canonical-run request", () => {
    // Given the cached parsed fixtures.
    const first = canonicalRun("en")
    const second = canonicalRun("en")

    // When two runs are requested.
    // Then each caller receives an independent object.
    expect(first).not.toBe(second)
    expect(first).toEqual(second)
    expect(first.episodes).not.toBe(second.episodes)
  })

  it("records the researcher earliest mistake on episode-04 outside runtime modules", () => {
    // Given the researcher-only annotation.
    // When its earliest mistake is inspected.
    // Then it identifies the new episode numbering and an existing episode.
    expect(shoppingGroundTruth.annotation_version).toBe("study-ground-truth/1")
    expect(shoppingGroundTruth.earliest_mistake_episode_id).toBe("episode-04")
    expect(canonicalRun("en").episodes.map((episode) => episode.id)).toContain(
      shoppingGroundTruth.earliest_mistake_episode_id,
    )
  })
})

describe("canonical decision schema rejection", () => {
  it("rejects duplicate episode IDs", () => {
    // Given a run with a repeated episode identifier.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-08" ? { ...episode, id: "episode-07" } : episode,
    )

    // When the run is validated.
    // Then duplicate episode IDs are rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects duplicate observation IDs", () => {
    // Given a run with a repeated observation identifier.
    const run = canonicalRun("en")
    const observations = run.observations.map((observation) =>
      observation.id === "obs-08" ? { ...observation, id: "obs-07" } : observation,
    )

    // When the run is validated.
    // Then duplicate observation IDs are rejected.
    expect(decisionRunSchema.safeParse({ ...run, observations }).success).toBe(false)
  })

  it("rejects a step whose before observation does not exist", () => {
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-04" ? { ...episode, beforeObservationId: "missing" } : episode,
    )
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects a step whose after observation does not exist", () => {
    // Given a run with a dangling after-observation reference.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-05" ? { ...episode, afterObservationId: "obs-99" } : episode,
    )

    // When the run is validated.
    // Then the dangling reference is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects an episode executed before its before observation was captured", () => {
    // Given a reversed action time.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-04"
        ? { ...episode, executedAt: "2026-11-11T08:00:00.000Z" }
        : episode,
    )

    // When the run is validated.
    // Then the timeline bound is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects observations captured out of order", () => {
    // Given observations stored against the capture timeline.
    const run = canonicalRun("en")
    const observations = [...run.observations]
    const second = observations[1]
    const third = observations[2]
    if (!second || !third) throw new Error("Missing canonical observations")
    observations[1] = third
    observations[2] = second

    // When the run is validated.
    // Then the observation order is rejected.
    expect(decisionRunSchema.safeParse({ ...run, observations }).success).toBe(false)
  })

  it("rejects an operation head whose selected ID is missing", () => {
    // Given a head pointing at no offered operation candidate.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-01"
        ? {
            ...episode,
            operationHead: { ...episode.operationHead, selectedId: "op-missing" },
          }
        : episode,
    )

    // When the run is validated.
    // Then the missing selected ID is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects a target head whose selected ID is missing", () => {
    // Given a target head pointing at no offered target candidate.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-04"
        ? {
            ...episode,
            targetHead: episode.targetHead
              ? { ...episode.targetHead, selectedId: "target-missing" }
              : null,
          }
        : episode,
    )

    // When the run is validated.
    // Then the missing selected target is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects a target head whose operation differs from the episode operation", () => {
    // Given a target head qualified by another operation.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-04"
        ? {
            ...episode,
            targetHead: episode.targetHead
              ? { ...episode.targetHead, operation: "SELECT" as const }
              : null,
          }
        : episode,
    )

    // When the run is validated.
    // Then the target/operation mismatch is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it.each([Number.NaN, Number.POSITIVE_INFINITY, -0.01, 1.01])(
    "rejects a nonfinite or out-of-range score (%s)",
    (probability) => {
      // Given an invalid operation probability.
      const run = canonicalRun("en")
      const episodes = run.episodes.map((episode) =>
        episode.id === "episode-01"
          ? {
              ...episode,
              operationHead: {
                ...episode.operationHead,
                offered: episode.operationHead.offered.map((candidate, index) =>
                  index === 0 ? { ...candidate, probability } : candidate,
                ),
              },
            }
          : episode,
      )

      // When the run is validated.
      // Then the score is rejected.
      expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
    },
  )

  it("rejects an operation head whose probabilities are not normalized", () => {
    // Given a head summing above one.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-01"
        ? {
            ...episode,
            operationHead: {
              ...episode.operationHead,
              offered: episode.operationHead.offered.map((candidate, index) =>
                index === 0 ? { ...candidate, probability: 0.85 } : candidate,
              ),
            },
          }
        : episode,
    )

    // When the run is validated.
    // Then the unnormalized head is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects a target head whose probabilities are not normalized", () => {
    // Given a target head summing above one.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-04"
        ? {
            ...episode,
            targetHead: episode.targetHead
              ? {
                  ...episode.targetHead,
                  offered: episode.targetHead.offered.map((candidate, index) =>
                    index === 0 ? { ...candidate, probability: 0.65 } : candidate,
                  ),
                }
              : null,
          }
        : episode,
    )

    // When the run is validated.
    // Then the unnormalized target head is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects a selected operation that is not an argmax", () => {
    // Given a normalized head where another operation outscores the selection.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-01"
        ? {
            ...episode,
            operationHead: {
              ...episode.operationHead,
              offered: episode.operationHead.offered.map((candidate) => {
                if (candidate.id === "TYPE_TEXT") return { ...candidate, probability: 0.12 }
                if (candidate.id === "CLICK") return { ...candidate, probability: 0.82 }
                return candidate
              }),
            },
          }
        : episode,
    )

    // When the run is validated.
    // Then the non-argmax selection is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects a selected target that is not an argmax", () => {
    // Given a normalized target head where another target outscores the selection.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-04"
        ? {
            ...episode,
            targetHead: episode.targetHead
              ? {
                  ...episode.targetHead,
                  offered: episode.targetHead.offered.map((candidate) => {
                    if (candidate.id === "target-cloud-walk") {
                      return { ...candidate, probability: 0.2 }
                    }
                    if (candidate.id === "target-breeze") {
                      return { ...candidate, probability: 0.62 }
                    }
                    return candidate
                  }),
                }
              : null,
          }
        : episode,
    )

    // When the run is validated.
    // Then the non-argmax target selection is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it("rejects a target head on the terminal DONE operation", () => {
    // Given a terminal operation carrying a target head.
    const run = canonicalRun("en")
    const episodes = run.episodes.map((episode) =>
      episode.id === "episode-08"
        ? {
            ...episode,
            targetHead: {
              operation: "DONE" as const,
              offered: [
                {
                  id: "target-done",
                  label: "Done",
                  context: null,
                  probability: 1,
                },
              ],
              selectedId: "target-done",
            },
          }
        : episode,
    )

    // When the run is validated.
    // Then the forbidden terminal target is rejected.
    expect(decisionRunSchema.safeParse({ ...run, episodes }).success).toBe(false)
  })

  it.each([
    "../screenshots/01-home.webp",
    "/screenshots/01-home.webp",
    "https://mall.example/screenshots/01-home.webp",
    "screenshots/../01-home.webp",
  ])("rejects a traversal or absolute screenshot path (%s)", (path) => {
    // Given a screenshot binding escaping the local asset contract.
    const run = canonicalRun("en")
    const observations = run.observations.map((observation) =>
      observation.id === "obs-00" && observation.screenshot
        ? { ...observation, screenshot: { ...observation.screenshot, path } }
        : observation,
    )

    // When the run is validated.
    // Then the path is rejected.
    expect(decisionRunSchema.safeParse({ ...run, observations }).success).toBe(false)
  })
})

describe("edge decision fixtures", () => {
  it.each(edgeRunKinds)("validates the %s edge fixture", (kind) => {
    // Given a test-only edge fixture.
    const run = edgeRun(kind)

    // When it crosses the canonical boundary.
    // Then it remains a coherent decision run.
    expect(decisionRunSchema.safeParse(run).success).toBe(true)
  })

  it("keeps an operation error on the observation it actually produced", () => {
    // Given the operation-error fixture.
    const run = edgeRun("operation-error")
    const failedIndex = run.episodes.findIndex(
      (episode) => episode.outcome?.kind === "execution-error",
    )
    const failed = run.episodes[failedIndex]

    // When the failed step is compared with its linked observations.
    // Then a non-navigating error leaves the before and after pages identical.
    expect(failedIndex).toBeGreaterThan(-1)
    if (!failed) throw new Error("Missing failed episode")
    const before = observationFor(run, failed.beforeObservationId)
    const after = observationFor(run, failed.afterObservationId)
    expect(failed.action).toContain("Attempted")
    expect(after.url).toBe(before.url)
    expect(after.title).toBe(before.title)
    expect(after.screenshot?.path).toBe(before.screenshot?.path)

    // And the next step successfully reaches the product page.
    const recovery = run.episodes[failedIndex + 1]
    expect(recovery?.outcome).toBeNull()
    expect(recovery?.afterObservationId).toBe("obs-04")
    expect(observationFor(run, "obs-04").url).toContain("cloud-walk-red")
    expect(run.report).toBe(canonicalRun("en").report)
  })

  it("links terminal BLOCKED to the blocking observation and a matching report", () => {
    // Given the blocked fixture.
    const run = edgeRun("blocked")
    const terminal = run.episodes.at(-1)
    if (!terminal) throw new Error("Missing terminal episode")

    // When the terminal episode and final observation are inspected.
    // Then the run stops on the sign-in gate instead of claiming a successful cart.
    const final = observationFor(run, run.finalObservationId)
    expect(terminal.operation).toBe("BLOCKED")
    expect(terminal.targetHead).toBeNull()
    expect(terminal.afterObservationId).toBe(run.finalObservationId)
    expect(final.url).toContain("sign-in")
    expect(final.title.toLowerCase()).toContain("sign in")
    expect(final.screenshot).toBeNull()
    expect(terminal.outcome?.text.toLowerCase()).toContain("sign-in")
    expect(run.report).not.toBe(canonicalRun("en").report)
    expect(run.report.toLowerCase()).not.toContain("added the best-selling")
    expect(run.report.toLowerCase()).toContain("couldn't")
  })

  it("models WAIT and scroll controls without target heads", () => {
    const run = edgeRun("controls")
    const controls = run.episodes.filter(
      (episode) =>
        episode.operation === "WAIT" ||
        episode.operation === "SCROLL_DOWN" ||
        episode.operation === "SCROLL_UP",
    )
    expect(controls.map((episode) => episode.operation)).toEqual(["SCROLL_DOWN", "WAIT"])
    for (const episode of controls) expect(episode.targetHead).toBeNull()
  })

  it("models a successful run without execution errors", () => {
    const run = edgeRun("successful")
    expect(run.episodes.at(-1)?.operation).toBe("DONE")
    expect(run.episodes.some((episode) => episode.outcome?.kind === "execution-error")).toBe(false)
  })

  it("models an execution error followed by recovery", () => {
    const run = edgeRun("recovered")
    const errorIndex = run.episodes.findIndex(
      (episode) => episode.outcome?.kind === "execution-error",
    )
    expect(errorIndex).toBeGreaterThan(-1)
    expect(run.episodes.slice(errorIndex + 1).some((episode) => episode.outcome === null)).toBe(
      true,
    )
    expect(run.episodes.at(-1)?.operation).toBe("DONE")
  })

  it("keeps repeated target labels distinct by ID and context", () => {
    const targetHead = targetHeadFor(edgeRun("repeated-targets"), "episode-04")
    const repeated = targetHead.offered.filter(
      (candidate) => candidate.label === "Cloud Walk Red Sneakers",
    )
    expect(repeated).toHaveLength(2)
    expect(new Set(repeated.map((candidate) => candidate.id)).size).toBe(2)
    expect(new Set(repeated.map((candidate) => candidate.context)).size).toBe(2)
  })

  it("supports a long candidate list", () => {
    expect(episodeFor(edgeRun("long-list"), "episode-04").operationHead.offered).toHaveLength(250)
  })

  it("supports a missing screenshot without substituting another image", () => {
    expect(observationFor(edgeRun("missing-image"), "obs-04").screenshot).toBeNull()
  })
})
