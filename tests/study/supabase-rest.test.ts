import { expect, test } from "vitest"
import { type SubmissionSinkConfig, submissionSinkConfig } from "../../src/study/config.ts"
import type { StudySession } from "../../src/study/session.ts"
import { buildSubmission, type SubmissionPayload } from "../../src/study/submission.ts"
import { restSubmissionSink, SubmissionSendError } from "../../src/study/supabase-rest.ts"
import { startReviewTiming } from "../../src/study/timing.ts"

const config: SubmissionSinkConfig = submissionSinkConfig({
  VITE_SUPABASE_URL: "https://study.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-key",
}) as SubmissionSinkConfig

const session: StudySession = {
  participantCode: "P07",
  caseOrder: 3,
  caseCode: "C19",
  runId: "F4_reorder_past_item_clean",
  condition: "probabilities",
  fixtureRevision: "decision-replay/2",
  appVersion: "0.1.0",
}

const row: SubmissionPayload = buildSubmission({
  session,
  locale: "en",
  verdict: "accepted",
  explanation: "Everything matched the request.",
  timing: startReviewTiming("2026-11-23T10:00:00.000Z", 0),
  finished: {
    wallMs: 42_000,
    stepViews: 3,
    uniqueStepsViewed: 2,
    finalViews: 1,
    firstInteractionMs: 15_000,
  },
  submittedAtIso: "2026-11-23T10:02:00.000Z",
  viewport: { width: 1440, height: 900 },
  submissionId: "11111111-1111-4111-8111-111111111111",
})

function fakeResponse(status: number): Response {
  return { ok: status >= 200 && status < 300, status } as Response
}

type Captured = { url: string; headers: Headers; body: unknown }

function capturingFetcher(status: number, captured: Captured[]): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    captured.push({
      url: String(input),
      headers: new Headers(init?.headers),
      body: JSON.parse(String(init?.body ?? "{}")),
    })
    return fakeResponse(status)
  }) as typeof fetch
}

test("posts the snake_case submission row to the study table", async () => {
  const captured: Captured[] = []
  const sink = restSubmissionSink(config, capturingFetcher(201, captured))

  await sink(row)

  expect(captured).toHaveLength(1)
  expect(captured[0]?.url).toBe("https://study.supabase.co/rest/v1/study_submissions")
  const headers = captured[0]?.headers
  expect(headers?.get("apikey")).toBe("sb_publishable_test-key")
  expect(headers?.get("authorization")).toBe("Bearer sb_publishable_test-key")
  expect(headers?.get("content-type")).toBe("application/json")
  expect(headers?.get("prefer")).toBe("return=minimal")
  expect(captured[0]?.body).toEqual({
    submission_id: "11111111-1111-4111-8111-111111111111",
    participant_code: "P07",
    case_order: 3,
    condition: "probabilities",
    run_id: "F4_reorder_past_item_clean",
    locale: "en",
    verdict: "accepted",
    explanation: "Everything matched the request.",
    timing: {
      wallMs: 42_000,
      stepViews: 3,
      uniqueStepsViewed: 2,
      finalViews: 1,
      firstInteractionMs: 15_000,
    },
    started_at: "2026-11-23T10:00:00.000Z",
    submitted_at: "2026-11-23T10:02:00.000Z",
    app_version: "0.1.0",
    fixture_revision: "decision-replay/2",
    viewport: { width: 1440, height: 900 },
  })
})

test("resolves on a created or minimal success", async () => {
  for (const status of [201, 204]) {
    const sink = restSubmissionSink(config, capturingFetcher(status, []))
    await expect(sink(row)).resolves.toBeUndefined()
  }
})

test("treats a unique-constraint conflict as delivered", async () => {
  const sink = restSubmissionSink(config, capturingFetcher(409, []))
  await expect(sink(row)).resolves.toBeUndefined()
})

test("treats validation rejections as permanent", async () => {
  for (const status of [400, 403, 422]) {
    const sink = restSubmissionSink(config, capturingFetcher(status, []))
    const failure = await sink(row).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(SubmissionSendError)
    expect((failure as SubmissionSendError).retryable).toBe(false)
  }
})

test("treats server errors as retryable", async () => {
  for (const status of [500, 503]) {
    const sink = restSubmissionSink(config, capturingFetcher(status, []))
    const failure = await sink(row).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(SubmissionSendError)
    expect((failure as SubmissionSendError).retryable).toBe(true)
  }
})

test("treats a network failure as retryable", async () => {
  const fetcher = (async () => {
    throw new TypeError("network down")
  }) as typeof fetch
  const sink = restSubmissionSink(config, fetcher)

  const failure = await sink(row).catch((error: unknown) => error)

  expect(failure).toBeInstanceOf(SubmissionSendError)
  expect((failure as SubmissionSendError).retryable).toBe(true)
})
