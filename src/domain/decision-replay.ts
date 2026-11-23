import { assertNever } from "./assert-never.ts"
import type { Observation } from "./decision-run-schema.ts"
import type { StudyRun } from "./study-run-schema.ts"

export type ViewedSelection =
  | { readonly kind: "final" }
  | { readonly kind: "episode"; readonly episodeId: string }

export function initialViewedSelection(): ViewedSelection {
  return { kind: "final" }
}

/**
 * Study cases open on the first step so participants start at the beginning of
 * the recorded run. An empty run falls back to the final state.
 */
export function firstViewedSelection(episodeIds: readonly string[]): ViewedSelection {
  const firstEpisodeId = episodeIds[0]
  return firstEpisodeId === undefined
    ? initialViewedSelection()
    : { kind: "episode", episodeId: firstEpisodeId }
}

export function normalizeViewedSelection(
  selection: ViewedSelection,
  episodeIds: readonly string[],
): ViewedSelection {
  switch (selection.kind) {
    case "final":
      return selection
    case "episode":
      return episodeIds.includes(selection.episodeId) ? selection : initialViewedSelection()
    default:
      return assertNever(selection)
  }
}

export function previousViewedSelection(
  selection: ViewedSelection,
  episodeIds: readonly string[],
): ViewedSelection {
  switch (selection.kind) {
    case "final": {
      const lastEpisodeId = episodeIds.at(-1)
      return lastEpisodeId === undefined ? selection : { kind: "episode", episodeId: lastEpisodeId }
    }
    case "episode": {
      if (!episodeIds.includes(selection.episodeId)) return initialViewedSelection()
      const index = episodeIds.indexOf(selection.episodeId)
      if (index <= 0) return selection
      const previousEpisodeId = episodeIds.at(index - 1)
      return previousEpisodeId === undefined
        ? selection
        : { kind: "episode", episodeId: previousEpisodeId }
    }
    default:
      return assertNever(selection)
  }
}

export function nextViewedSelection(
  selection: ViewedSelection,
  episodeIds: readonly string[],
): ViewedSelection {
  switch (selection.kind) {
    case "final":
      return selection
    case "episode": {
      if (!episodeIds.includes(selection.episodeId)) return initialViewedSelection()
      const index = episodeIds.indexOf(selection.episodeId)
      const nextEpisodeId = episodeIds.at(index + 1)
      return nextEpisodeId === undefined ? selection : { kind: "episode", episodeId: nextEpisodeId }
    }
    default:
      return assertNever(selection)
  }
}

export function viewedObservation(run: StudyRun, selection: ViewedSelection): Observation {
  const normalized = normalizeViewedSelection(
    selection,
    run.episodes.map((episode) => episode.id),
  )

  if (normalized.kind === "final") return observationById(run, run.finalObservationId)

  const episode = run.episodes.find((item) => item.id === normalized.episodeId)
  if (!episode) return observationById(run, run.finalObservationId)
  return observationById(run, episode.beforeObservationId)
}

function observationById(run: StudyRun, observationId: string): Observation {
  const observation = run.observations.find((item) => item.id === observationId)
  if (!observation) throw new Error(`Missing observation ${observationId}`)
  return observation
}
