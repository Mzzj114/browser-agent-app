import rawEn from "../../fixtures/decision-runs/shopping.en.json"
import rawZh from "../../fixtures/decision-runs/shopping.zh.json"
import {
  type DecisionRun,
  decisionRunSchema,
  type Operation,
  type ScoredCandidate,
} from "../../src/domain/decision-run-schema.ts"
import type { Locale } from "../../src/i18n/locale.ts"

const canonicalRuns = {
  zh: decisionRunSchema.parse(rawZh),
  en: decisionRunSchema.parse(rawEn),
} satisfies Record<Locale, DecisionRun>

const operationLabels: Record<Operation, string> = {
  CLICK: "Click",
  TYPE_TEXT: "Type text",
  SELECT: "Select",
  SCROLL_DOWN: "Scroll down",
  SCROLL_UP: "Scroll up",
  WAIT: "Wait",
  DONE: "Done",
  BLOCKED: "Blocked",
}

export type EdgeRunKind =
  | "operation-error"
  | "blocked"
  | "controls"
  | "successful"
  | "recovered"
  | "repeated-targets"
  | "long-list"
  | "missing-image"

export function canonicalRun(locale: Locale): DecisionRun {
  return structuredClone(canonicalRuns[locale])
}

function scoredCandidate(
  id: string,
  label: string,
  probability: number,
  context: string | null = null,
): ScoredCandidate {
  return { id, label, context, probability }
}

function operationCandidate(operation: Operation, probability: number): ScoredCandidate {
  return scoredCandidate(operation, operationLabels[operation], probability)
}

function withEpisode(
  run: DecisionRun,
  id: string,
  update: (episode: DecisionRun["episodes"][number]) => DecisionRun["episodes"][number],
): DecisionRun {
  return {
    ...run,
    episodes: run.episodes.map((episode) => (episode.id === id ? update(episode) : episode)),
  }
}

function operationErrorRun(): DecisionRun {
  return withEpisode(canonicalRun("en"), "episode-04", (episode) => ({
    ...episode,
    outcome: {
      kind: "execution-error",
      text: "The product click did not navigate to the product page.",
    },
  }))
}

function blockedRun(): DecisionRun {
  return withEpisode(canonicalRun("en"), "episode-08", (episode) => ({
    ...episode,
    action: "Stopped at the sign-in gate",
    operation: "BLOCKED",
    operationHead: {
      offered: [
        operationCandidate("BLOCKED", 0.8),
        operationCandidate("DONE", 0.15),
        operationCandidate("CLICK", 0.05),
      ],
      selectedId: "BLOCKED",
    },
    targetHead: null,
  }))
}

function controlsRun(): DecisionRun {
  const run = withEpisode(canonicalRun("en"), "episode-03", (episode) => ({
    ...episode,
    action: "Scrolled the search results",
    operation: "SCROLL_DOWN",
    operationHead: {
      offered: [
        operationCandidate("SCROLL_DOWN", 0.7),
        operationCandidate("SCROLL_UP", 0.1),
        operationCandidate("CLICK", 0.15),
        operationCandidate("WAIT", 0.05),
      ],
      selectedId: "SCROLL_DOWN",
    },
    targetHead: null,
  }))

  return withEpisode(run, "episode-08", (episode) => ({
    ...episode,
    action: "Waited on the cart page",
    operation: "WAIT",
    operationHead: {
      offered: [
        operationCandidate("WAIT", 0.8),
        operationCandidate("CLICK", 0.12),
        operationCandidate("SCROLL_DOWN", 0.08),
      ],
      selectedId: "WAIT",
    },
    targetHead: null,
  }))
}

function successfulRun(): DecisionRun {
  const run = canonicalRun("en")
  return {
    ...run,
    episodes: run.episodes.map((episode) => ({
      ...episode,
      outcome: {
        kind: "observation",
        text:
          episode.operation === "DONE"
            ? "Reported task completion."
            : "Observed the resulting page.",
      },
    })),
  }
}

function recoveredRun(): DecisionRun {
  const run = canonicalRun("en")
  return {
    ...run,
    episodes: run.episodes.map((episode) => {
      if (episode.id === "episode-03") {
        return {
          ...episode,
          action: "Attempted to select Best selling",
          executedAt: "2026-11-11T09:00:17.200Z",
          afterObservationId: "obs-02",
          outcome: {
            kind: "execution-error",
            text: "The sort click did not change the result order.",
          },
        }
      }
      if (episode.id === "episode-04") {
        return {
          ...episode,
          beforeObservationId: "obs-02",
          afterObservationId: "obs-04",
        }
      }
      return episode
    }),
  }
}

function repeatedTargetsRun(): DecisionRun {
  return withEpisode(canonicalRun("en"), "episode-04", (episode) => ({
    ...episode,
    targetHead: {
      operation: "CLICK",
      offered: [
        scoredCandidate("target-cloud-walk", "Cloud Walk Red Sneakers", 0.5, "Result card 2"),
        scoredCandidate("target-cloud-walk-copy", "Cloud Walk Red Sneakers", 0.3, "Result card 3"),
        scoredCandidate("target-breeze", "Breeze Pro Red Running Shoes", 0.2, "Result card 1"),
      ],
      selectedId: "target-cloud-walk",
    },
  }))
}

function longListRun(): DecisionRun {
  const alternatives = Array.from({ length: 249 }, (_, index) =>
    scoredCandidate(
      `op-alt-${index.toString().padStart(3, "0")}`,
      `Operation ${index + 1}`,
      0.5 / 249,
    ),
  )

  return withEpisode(canonicalRun("en"), "episode-04", (episode) => ({
    ...episode,
    operationHead: {
      offered: [operationCandidate("CLICK", 0.5), ...alternatives],
      selectedId: "CLICK",
    },
  }))
}

function missingImageRun(): DecisionRun {
  const run = canonicalRun("en")
  return {
    ...run,
    observations: run.observations.map((observation) =>
      observation.id === "obs-04" ? { ...observation, screenshot: null } : observation,
    ),
  }
}

export function edgeRun(kind: EdgeRunKind): DecisionRun {
  switch (kind) {
    case "operation-error":
      return operationErrorRun()
    case "blocked":
      return blockedRun()
    case "controls":
      return controlsRun()
    case "successful":
      return successfulRun()
    case "recovered":
      return recoveredRun()
    case "repeated-targets":
      return repeatedTargetsRun()
    case "long-list":
      return longListRun()
    case "missing-image":
      return missingImageRun()
    default:
      return assertEdgeKind(kind)
  }
}

function assertEdgeKind(kind: never): never {
  throw new Error(`Unsupported edge run: ${String(kind)}`)
}
