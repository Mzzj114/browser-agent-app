import { expect, test } from "vitest"
import type { StudySession } from "../../src/study/session.ts"
import {
  buildSubmission,
  type SubmissionPayload,
  submissionPayloadSchema,
} from "../../src/study/submission.ts"
import { startReviewTiming } from "../../src/study/timing.ts"

const session: StudySession = {
  participantCode: "P07",
  caseOrder: 2,
  caseCode: "C12",
  runId: "F2_write_review_clean",
  condition: "candidates",
  fixtureRevision: "decision-replay/2",
  appVersion: "0.1.0",
}

const timing = startReviewTiming("2026-11-23T10:00:00.000Z", 0)
const finished = { wallMs: 45_000, stepViews: 0, uniqueStepsViewed: 0, finalViews: 0 }

const payload: SubmissionPayload = buildSubmission({
  session,
  locale: "en",
  verdict: "rejected",
  explanation: "Cart shows the wrong product.",
  timing,
  finished,
  submittedAtIso: "2026-11-23T10:01:00.000Z",
  viewport: { width: 1440, height: 900 },
  submissionId: "11111111-1111-4111-8111-111111111111",
})

test("maps the session, response, and timing into the payload", () => {
  expect(payload).toEqual({
    submissionId: "11111111-1111-4111-8111-111111111111",
    participantCode: "P07",
    caseOrder: 2,
    condition: "candidates",
    runId: "F2_write_review_clean",
    locale: "en",
    verdict: "rejected",
    explanation: "Cart shows the wrong product.",
    timing: finished,
    startedAt: "2026-11-23T10:00:00.000Z",
    submittedAt: "2026-11-23T10:01:00.000Z",
    appVersion: "0.1.0",
    fixtureRevision: "decision-replay/2",
    viewport: { width: 1440, height: 900 },
  })
})

test("accepts a blank explanation for either verdict", () => {
  const accepted = buildSubmission({
    session,
    locale: "zh",
    verdict: "accepted",
    explanation: "",
    timing,
    finished,
    submittedAtIso: "2026-11-23T10:01:00.000Z",
    viewport: { width: 1280, height: 720 },
    submissionId: "22222222-2222-4222-8222-222222222222",
  })
  expect(accepted.verdict).toBe("accepted")
  expect(accepted.explanation).toBe("")
  expect(accepted.locale).toBe("zh")
})

test("the payload schema accepts a built payload unchanged", () => {
  expect(submissionPayloadSchema.parse(payload)).toEqual(payload)
})

test("the payload schema rejects invalid rows", () => {
  const cases = [
    { ...payload, caseOrder: 4 },
    { ...payload, verdict: "maybe" },
    { ...payload, explanation: "x".repeat(501) },
    { ...payload, locale: "fr" },
    { ...payload, condition: "turbo" },
    { ...payload, runId: "" },
  ]
  for (const row of cases) {
    expect(() => submissionPayloadSchema.parse(row)).toThrow()
  }

  const { viewport, ...withoutViewport } = payload
  expect(viewport).toBeDefined()
  expect(() => submissionPayloadSchema.parse(withoutViewport)).toThrow()
})
