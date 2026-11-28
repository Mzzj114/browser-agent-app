import { expect, test } from "vitest"
import {
  finishReviewTiming,
  recordFinalView,
  recordFirstInteraction,
  recordStepView,
  startReviewTiming,
} from "../../src/study/timing.ts"

const base = startReviewTiming("2026-11-23T10:00:00.000Z", 1_000)

test("starts with the case-open moment and no view activity", () => {
  expect(base).toEqual({
    startedAtIso: "2026-11-23T10:00:00.000Z",
    startedAtMs: 1_000,
    stepViews: 0,
    uniqueStepsViewed: new Set<string>(),
    finalViews: 0,
    firstInteractionMs: null,
  })
})

test("counts step views and unique steps", () => {
  const first = recordStepView(base, "episode-01")
  expect(first.stepViews).toBe(1)
  expect([...first.uniqueStepsViewed]).toEqual(["episode-01"])

  const repeated = recordStepView(first, "episode-01")
  expect(repeated.stepViews).toBe(2)
  expect(repeated.uniqueStepsViewed.size).toBe(1)

  const other = recordStepView(repeated, "episode-02")
  expect(other.stepViews).toBe(3)
  expect(other.uniqueStepsViewed.size).toBe(2)
})

test("never mutates the previous timing state", () => {
  recordStepView(base, "episode-01")
  recordFinalView(base)
  expect(base.stepViews).toBe(0)
  expect(base.uniqueStepsViewed.size).toBe(0)
  expect(base.finalViews).toBe(0)
})

test("counts explicit final-state views", () => {
  expect(recordFinalView(base).finalViews).toBe(1)
  expect(recordFinalView(recordFinalView(base)).finalViews).toBe(2)
})

test("records the first interaction as elapsed time from case open", () => {
  const first = recordFirstInteraction(base, 1_250)
  expect(first.firstInteractionMs).toBe(250)
  expect(base.firstInteractionMs).toBeNull()
})

test("keeps the first interaction time when later interactions arrive", () => {
  const first = recordFirstInteraction(base, 1_250)
  const later = recordFirstInteraction(first, 9_000)
  expect(later.firstInteractionMs).toBe(250)
})

test("keeps a zero first interaction instead of overwriting it later", () => {
  const first = recordFirstInteraction(base, 500)
  expect(first.firstInteractionMs).toBe(0)
  expect(recordFirstInteraction(first, 9_000).firstInteractionMs).toBe(0)
})

test("rounds and clamps the first interaction time", () => {
  expect(recordFirstInteraction(base, 1_500.6).firstInteractionMs).toBe(501)
  expect(recordFirstInteraction(base, 500).firstInteractionMs).toBe(0)
})

test("finishing computes wall time and view counts", () => {
  const viewed = recordFirstInteraction(
    recordFinalView(recordStepView(recordStepView(base, "episode-01"), "episode-02")),
    1_500,
  )
  expect(finishReviewTiming(viewed, 61_000)).toEqual({
    wallMs: 60_000,
    stepViews: 2,
    uniqueStepsViewed: 2,
    finalViews: 1,
    firstInteractionMs: 500,
  })
})

test("finishing carries a missing first interaction through", () => {
  expect(finishReviewTiming(base, 61_000).firstInteractionMs).toBeNull()
})
