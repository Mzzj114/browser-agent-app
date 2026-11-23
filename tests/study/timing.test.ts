import { expect, test } from "vitest"
import {
  finishReviewTiming,
  recordFinalView,
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

test("finishing computes wall time and view counts", () => {
  const viewed = recordFinalView(recordStepView(recordStepView(base, "episode-01"), "episode-02"))
  expect(finishReviewTiming(viewed, 61_000)).toEqual({
    wallMs: 60_000,
    stepViews: 2,
    uniqueStepsViewed: 2,
    finalViews: 1,
  })
})
