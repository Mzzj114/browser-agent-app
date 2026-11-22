import type { DecisionHead, ScoredCandidate } from "./decision-run-schema.ts"

const previewLimit = 3

export function rankPreviewIds(head: DecisionHead<ScoredCandidate>): readonly string[] {
  return head.offered
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.id !== head.selectedId && candidate.probability > 0)
    .sort(
      (left, right) =>
        right.candidate.probability - left.candidate.probability || left.index - right.index,
    )
    .slice(0, previewLimit)
    .map(({ candidate }) => candidate.id)
}
