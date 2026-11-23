import { describe, expect, it } from "vitest"
import {
  firstViewedSelection,
  initialViewedSelection,
  nextViewedSelection,
  normalizeViewedSelection,
  previousViewedSelection,
  viewedObservation,
} from "../src/domain/decision-replay.ts"
import { initialStudyResponse } from "../src/domain/study-response.ts"
import { canonicalRun, studyRuns } from "./fixtures/decision-runs.ts"

const run = studyRuns("baseline").en
const episodeIds = run.episodes.map((episode) => episode.id)

function viewedEpisode(episodeId: string) {
  return { kind: "episode", episodeId } as const
}

describe("decision replay selection", () => {
  it("opens on the final state", () => {
    // Given the replay is opening.
    // When the initial viewed selection is created.
    const selection = initialViewedSelection()
    // Then the separate final state is selected.
    expect(selection).toEqual({ kind: "final" })
  })

  it("opens a study case on the first step", () => {
    // Given the episode order of a run.
    // When the first selection for entering a case is created.
    const selection = firstViewedSelection(episodeIds)
    // Then the first step is selected instead of the final state.
    expect(selection).toEqual(viewedEpisode("episode-01"))
    expect(viewedObservation(run, selection).id).toBe("obs-00")
  })

  it("falls back to the final state when a run has no steps", () => {
    // Given a run without episodes.
    // When the first selection is created.
    // Then the final state remains the only valid selection.
    expect(firstViewedSelection([])).toEqual({ kind: "final" })
  })

  it("goes from final state to the terminal decision without conflating them", () => {
    const ids = canonicalRun("en").episodes.map((episode) => episode.id)
    expect(previousViewedSelection(initialViewedSelection(), ids)).toEqual({
      kind: "episode",
      episodeId: "episode-08",
    })
  })

  it("keeps the terminal decision's before observation distinct from the final observation", () => {
    // Given the terminal episode and the final state share the same screenshot pixels.
    const final = viewedObservation(run, initialViewedSelection())
    const terminal = viewedObservation(run, viewedEpisode("episode-08"))
    // Then they remain separate observations and replay selections.
    expect(final.id).toBe("obs-08")
    expect(terminal.id).toBe("obs-07")
    expect(final.screenshot?.path).toBe("screenshots/en/08-cart.webp")
    expect(terminal.screenshot?.path).toBe("screenshots/en/08-cart.webp")
    expect(final.id).not.toBe(terminal.id)
  })

  it("moves backward through episode order", () => {
    // Given the fourth episode is viewed.
    // When previous is chosen.
    const previous = previousViewedSelection(viewedEpisode("episode-04"), episodeIds)
    // Then the third episode is selected.
    expect(previous).toEqual(viewedEpisode("episode-03"))
  })

  it("moves forward through episode order", () => {
    // Given the fourth episode is viewed.
    // When next is chosen.
    const next = nextViewedSelection(viewedEpisode("episode-04"), episodeIds)
    // Then the fifth episode is selected.
    expect(next).toEqual(viewedEpisode("episode-05"))
  })

  it("stops at the episode boundaries and the final state", () => {
    // Given the first, last, and final selections.
    // When arrows are chosen at each boundary.
    // Then the selection neither wraps nor leaves the final state.
    expect(previousViewedSelection(viewedEpisode("episode-01"), episodeIds)).toEqual(
      viewedEpisode("episode-01"),
    )
    expect(nextViewedSelection(viewedEpisode("episode-08"), episodeIds)).toEqual(
      viewedEpisode("episode-08"),
    )
    expect(nextViewedSelection(initialViewedSelection(), episodeIds)).toEqual({ kind: "final" })
    expect(previousViewedSelection(initialViewedSelection(), [])).toEqual({ kind: "final" })
  })

  it("normalizes an unknown episode ID to the final state", () => {
    // Given a selection refers to an episode that is not in the run.
    const unknown = viewedEpisode("episode-99")
    // When the selection is normalized or used to navigate.
    // Then the final state is selected instead.
    expect(normalizeViewedSelection(unknown, episodeIds)).toEqual({ kind: "final" })
    expect(previousViewedSelection(unknown, episodeIds)).toEqual({ kind: "final" })
    expect(nextViewedSelection(unknown, episodeIds)).toEqual({ kind: "final" })
    expect(viewedObservation(run, unknown).id).toBe("obs-08")
  })

  it("keeps a known episode selection unchanged when normalized", () => {
    // Given a valid episode selection.
    const selection = viewedEpisode("episode-04")
    // When it is normalized against the run.
    // Then the same episode remains selected.
    expect(normalizeViewedSelection(selection, episodeIds)).toEqual(selection)
  })

  it("shows the sorted results before the fourth episode, not the product page", () => {
    // Given the fourth episode is viewed.
    // When its before observation is resolved.
    const observation = viewedObservation(run, viewedEpisode("episode-04"))
    // Then the sorted search results are shown, not the clicked product page.
    expect(observation.id).toBe("obs-03")
    expect(observation.url).toContain("sort=sales")
    expect(observation.screenshot?.path).toBe("screenshots/en/04-sorted.webp")
  })

  it("shows the final observation when the final state is viewed", () => {
    // Given the final state is viewed.
    // When its observation is resolved.
    const observation = viewedObservation(run, initialViewedSelection())
    // Then the run's final observation is returned.
    expect(observation.id).toBe(run.finalObservationId)
    expect(observation.url).toBe("https://mall.example/cart")
  })

  it("never mutates the independent response while replaying", () => {
    // Given an authored response draft.
    const response = {
      ...initialStudyResponse(),
      verdict: "rejected" as const,
      explanation: "  Keep this authored text  ",
    }
    const snapshot = structuredClone(response)
    // When every replay transition is used.
    const previous = previousViewedSelection(initialViewedSelection(), episodeIds)
    nextViewedSelection(previous, episodeIds)
    normalizeViewedSelection(viewedEpisode("episode-99"), episodeIds)
    viewedObservation(run, previous)
    // Then the response is untouched.
    expect(response).toEqual(snapshot)
  })
})
