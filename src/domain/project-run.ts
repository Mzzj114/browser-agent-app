import { assertNever } from "./assert-never.ts"
import { rankPreviewIds } from "./choice-preview.ts"
import type {
  Candidate,
  DecisionHeadInput,
  DecisionRun,
  EpisodeCore,
  Observation,
  ScoredCandidate,
  TargetDecisionHeadInput,
} from "./decision-run-schema.ts"
import type { StudyCondition } from "./study-condition.ts"
import { type StudyRun, type StudyRunCore, studyRunSchema } from "./study-run-schema.ts"

function projectObservation(observation: Observation) {
  return {
    id: observation.id,
    url: observation.url,
    title: observation.title,
    capturedAt: observation.capturedAt,
    screenshot: observation.screenshot
      ? {
          path: observation.screenshot.path,
          width: observation.screenshot.width,
          height: observation.screenshot.height,
          source: observation.screenshot.source,
        }
      : null,
  }
}

function projectCoreEpisode(episode: EpisodeCore) {
  return {
    id: episode.id,
    ordinal: episode.ordinal,
    action: episode.action,
    operation: episode.operation,
    executedAt: episode.executedAt,
    beforeObservationId: episode.beforeObservationId,
    afterObservationId: episode.afterObservationId,
    outcome: episode.outcome
      ? {
          kind: episode.outcome.kind,
          text: episode.outcome.text,
        }
      : null,
    enteredText: episode.enteredText,
  }
}

function projectCandidate(candidate: Candidate) {
  return {
    id: candidate.id,
    label: candidate.label,
    context: candidate.context,
  }
}

function projectScoredCandidate(candidate: ScoredCandidate) {
  return {
    id: candidate.id,
    label: candidate.label,
    context: candidate.context,
    probability: candidate.probability,
  }
}

function projectUnscoredHead(head: DecisionHeadInput<ScoredCandidate>) {
  return {
    offered: head.offered.map(projectCandidate),
    selectedId: head.selectedId,
    previewIds: rankPreviewIds(head),
  }
}

function projectUnscoredTargetHead(head: TargetDecisionHeadInput) {
  return {
    operation: head.operation,
    offered: head.offered.map(projectCandidate),
    selectedId: head.selectedId,
    previewIds: rankPreviewIds(head),
  }
}

function projectScoredHead(head: DecisionHeadInput<ScoredCandidate>) {
  return {
    offered: head.offered.map(projectScoredCandidate),
    selectedId: head.selectedId,
    previewIds: rankPreviewIds(head),
    reportedConfidence: head.reportedConfidence ?? null,
  }
}

function projectScoredTargetHead(head: TargetDecisionHeadInput) {
  return {
    operation: head.operation,
    offered: head.offered.map(projectScoredCandidate),
    selectedId: head.selectedId,
    previewIds: rankPreviewIds(head),
    reportedConfidence: head.reportedConfidence ?? null,
  }
}

function projectCandidateEpisode(episode: DecisionRun["episodes"][number]) {
  return {
    ...projectCoreEpisode(episode),
    operationHead: projectUnscoredHead(episode.operationHead),
    targetHead: episode.targetHead ? projectUnscoredTargetHead(episode.targetHead) : null,
  }
}

function projectScoredEpisode(episode: DecisionRun["episodes"][number]) {
  return {
    ...projectCoreEpisode(episode),
    operationHead: projectScoredHead(episode.operationHead),
    targetHead: episode.targetHead ? projectScoredTargetHead(episode.targetHead) : null,
  }
}

function commonRunFields(run: DecisionRun) {
  return {
    fixtureVersion: run.fixtureVersion,
    source: run.source,
    runId: run.runId,
    locale: run.locale,
    task: run.task,
    initialObservationId: run.initialObservationId,
    finalObservationId: run.finalObservationId,
    observations: run.observations.map(projectObservation),
  }
}

export function projectRun(
  run: DecisionRun,
  condition: StudyCondition,
  fixtureRevision: string,
): StudyRun {
  const common = commonRunFields(run)

  switch (condition) {
    case "baseline":
      return studyRunSchema.parse({
        ...common,
        condition,
        fixtureRevision,
        episodes: run.episodes.map(projectCoreEpisode),
      })
    case "candidates":
      return studyRunSchema.parse({
        ...common,
        condition,
        fixtureRevision,
        episodes: run.episodes.map(projectCandidateEpisode),
      })
    case "probabilities":
      return studyRunSchema.parse({
        ...common,
        condition,
        fixtureRevision,
        episodes: run.episodes.map(projectScoredEpisode),
      })
    default:
      return assertNever(condition)
  }
}

export function coreView(run: StudyRun): StudyRunCore {
  return {
    fixtureVersion: run.fixtureVersion,
    source: run.source,
    runId: run.runId,
    locale: run.locale,
    task: run.task,
    initialObservationId: run.initialObservationId,
    finalObservationId: run.finalObservationId,
    observations: run.observations.map(projectObservation),
    episodes: run.episodes.map(projectCoreEpisode),
  }
}
