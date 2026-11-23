export type ReviewTiming = {
  readonly startedAtIso: string
  readonly startedAtMs: number
  readonly stepViews: number
  readonly uniqueStepsViewed: ReadonlySet<string>
  readonly finalViews: number
}

export function startReviewTiming(startedAtIso: string, startedAtMs: number): ReviewTiming {
  return {
    startedAtIso,
    startedAtMs,
    stepViews: 0,
    uniqueStepsViewed: new Set<string>(),
    finalViews: 0,
  }
}

export function recordStepView(timing: ReviewTiming, episodeId: string): ReviewTiming {
  const uniqueStepsViewed = new Set(timing.uniqueStepsViewed)
  uniqueStepsViewed.add(episodeId)
  return { ...timing, stepViews: timing.stepViews + 1, uniqueStepsViewed }
}

export function recordFinalView(timing: ReviewTiming): ReviewTiming {
  return { ...timing, finalViews: timing.finalViews + 1 }
}

export type TimingCounts = {
  readonly wallMs: number
  readonly stepViews: number
  readonly uniqueStepsViewed: number
  readonly finalViews: number
}

export function finishReviewTiming(timing: ReviewTiming, nowMs: number): TimingCounts {
  return {
    wallMs: Math.max(0, Math.round(nowMs - timing.startedAtMs)),
    stepViews: timing.stepViews,
    uniqueStepsViewed: timing.uniqueStepsViewed.size,
    finalViews: timing.finalViews,
  }
}
