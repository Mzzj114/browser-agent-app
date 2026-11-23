export type PreviewHead = {
  readonly offered: readonly { readonly id: string; readonly probability?: number }[]
  readonly selectedId: string
}

const previewLimit = 3

export function rankPreviewIds(head: PreviewHead): readonly string[] {
  return head.offered
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.id !== head.selectedId && (candidate.probability ?? 0) > 0)
    .sort(
      (left, right) =>
        (right.candidate.probability ?? 0) - (left.candidate.probability ?? 0) ||
        left.index - right.index,
    )
    .slice(0, previewLimit)
    .map(({ candidate }) => candidate.id)
}
