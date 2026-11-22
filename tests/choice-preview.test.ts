import { describe, expect, it } from "vitest"
import { rankPreviewIds } from "../src/domain/choice-preview.ts"
import type { ScoredCandidate } from "../src/domain/decision-run-schema.ts"

const offeredIds = ["chosen", "b", "c", "d", "e", "f"]

function head(probabilities: readonly number[]) {
  const offered: ScoredCandidate[] = offeredIds.map((id, index) => ({
    id,
    label: id,
    context: null,
    probability: probabilities[index] ?? 0,
  }))
  return { offered, selectedId: "chosen" }
}

describe("choice preview ranking", () => {
  it("ranks positive alternatives by probability and keeps input order for ties", () => {
    const value = head([0.39, 0.15, 0.15, 0.2, 0.11, 0])

    expect(rankPreviewIds(value)).toEqual(["d", "b", "c"])
  })

  it("stops at the cutoff tie instead of filling from lower-ranked candidates", () => {
    const value = head([0.4, 0.2, 0.15, 0.1, 0.1, 0.05])

    expect(rankPreviewIds(value)).toEqual(["b", "c", "d"])
  })

  it("never fills empty slots with zero-probability alternatives", () => {
    const value = head([1, 0, 0, 0, 0, 0])

    expect(rankPreviewIds(value)).toEqual([])
  })

  it("does not mutate the offered candidates or the selection", () => {
    const value = head([0.39, 0.15, 0.15, 0.2, 0.11, 0])
    const before = structuredClone(value)

    rankPreviewIds(value)

    expect(value).toEqual(before)
  })
})
