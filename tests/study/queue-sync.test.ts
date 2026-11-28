import { expect, test, vi } from "vitest"
import { startQueueSync } from "../../src/study/queue-sync.ts"
import type { StudySession } from "../../src/study/session.ts"
import { buildSubmission, type SubmissionPayload } from "../../src/study/submission.ts"
import { enqueueSubmission, readSubmissionQueue } from "../../src/study/submission-store.ts"
import { SubmissionSendError, type SubmissionSink } from "../../src/study/supabase-rest.ts"
import { startReviewTiming } from "../../src/study/timing.ts"

const session: StudySession = {
  participantCode: "P07",
  caseOrder: 1,
  caseCode: "C01",
  runId: "F1_add_single_item_clean",
  condition: "baseline",
  fixtureRevision: "decision-replay/2",
  appVersion: "0.1.0",
}

const finished = {
  wallMs: 1_000,
  stepViews: 1,
  uniqueStepsViewed: 1,
  finalViews: 0,
  firstInteractionMs: 400,
}

const queued: SubmissionPayload = buildSubmission({
  session,
  locale: "zh",
  verdict: "rejected",
  explanation: "Wrong product.",
  timing: startReviewTiming("2026-11-23T10:00:00.000Z", 0),
  finished,
  submittedAtIso: "2026-11-23T10:01:00.000Z",
  viewport: { width: 1440, height: 900 },
  submissionId: "11111111-1111-4111-8111-111111111111",
})

function dispatchOnline(): void {
  window.dispatchEvent(new Event("online"))
}

test("flushes the queue immediately and again on reconnect", async () => {
  const sent: string[] = []
  const sink: SubmissionSink = async (row) => {
    sent.push(row.submissionId)
  }
  enqueueSubmission(window.localStorage, queued)
  const flushed = vi.fn()

  const stop = startQueueSync(window.localStorage, sink, flushed).stop

  await vi.waitFor(() => expect(flushed).toHaveBeenCalledTimes(1))
  expect(sent).toHaveLength(1)
  expect(readSubmissionQueue(window.localStorage)).toEqual([])

  enqueueSubmission(window.localStorage, { ...queued, caseOrder: 2 })
  dispatchOnline()
  await vi.waitFor(() => expect(sent).toHaveLength(2))

  stop()
  dispatchOnline()
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(sent).toHaveLength(2)
})

test("keeps a failed upload pending until a later reconnect succeeds", async () => {
  let offline = true
  const sink: SubmissionSink = async () => {
    if (offline) throw new SubmissionSendError("offline", true)
  }
  enqueueSubmission(window.localStorage, queued)
  const flushed = vi.fn()

  startQueueSync(window.localStorage, sink, flushed)

  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(readSubmissionQueue(window.localStorage)).toHaveLength(1)

  offline = false
  dispatchOnline()

  await vi.waitFor(() => expect(readSubmissionQueue(window.localStorage)).toEqual([]))
  expect(flushed.mock.calls.length).toBeGreaterThanOrEqual(2)
})

test("reports every flush attempt even when the queue is empty", async () => {
  const sink: SubmissionSink = async () => {}
  const flushed = vi.fn()

  startQueueSync(window.localStorage, sink, flushed)

  await vi.waitFor(() => expect(flushed).toHaveBeenCalledTimes(1))

  dispatchOnline()

  await vi.waitFor(() => expect(flushed).toHaveBeenCalledTimes(2))
  expect(readSubmissionQueue(window.localStorage)).toEqual([])
})
