import { expect, test } from "vitest"
import type { StudySession } from "../../src/study/session.ts"
import { buildSubmission } from "../../src/study/submission.ts"
import {
  enqueueSubmission,
  flushSubmissionQueue,
  markQueuedSubmissionFailed,
  queuedSubmissionStatus,
  readCompletedMarker,
  readSubmissionQueue,
  removeQueuedSubmission,
  writeCompletedMarker,
} from "../../src/study/submission-store.ts"
import { SubmissionSendError, type SubmissionSink } from "../../src/study/supabase-rest.ts"
import { startReviewTiming } from "../../src/study/timing.ts"

class MemoryStorage implements Storage {
  private readonly items = new Map<string, string>()

  get length(): number {
    return this.items.size
  }

  clear(): void {
    this.items.clear()
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  key(index: number): string | null {
    return [...this.items.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value)
  }
}

const session: StudySession = {
  participantCode: "P07",
  caseOrder: 1,
  caseCode: "C01",
  runId: "F1_add_single_item_clean",
  condition: "baseline",
  fixtureRevision: "decision-replay/2",
  appVersion: "0.1.0",
}

const timing = startReviewTiming("2026-11-23T10:00:00.000Z", 0)
const finished = { wallMs: 1_000, stepViews: 1, uniqueStepsViewed: 1, finalViews: 0 }

function payload(submissionId: string, caseOrder: 1 | 2 | 3 = 1) {
  return buildSubmission({
    session: { ...session, caseOrder },
    locale: "zh",
    verdict: "rejected",
    explanation: "Wrong product.",
    timing,
    finished,
    submittedAtIso: "2026-11-23T10:01:00.000Z",
    viewport: { width: 1440, height: 900 },
    submissionId,
  })
}

const first = payload("11111111-1111-4111-8111-111111111111")
const second = payload("22222222-2222-4222-8222-222222222222", 2)

test("enqueues submissions in order and reads them back", () => {
  const storage = new MemoryStorage()
  enqueueSubmission(storage, first)
  enqueueSubmission(storage, second)

  const queue = readSubmissionQueue(storage)
  expect(queue).toHaveLength(2)
  expect(queue[0]?.payload.submissionId).toBe(first.submissionId)
  expect(queue[0]?.status).toBe("pending")
  expect(queue[1]?.payload.submissionId).toBe(second.submissionId)
})

test("removes one submission and keeps the others", () => {
  const storage = new MemoryStorage()
  enqueueSubmission(storage, first)
  enqueueSubmission(storage, second)

  removeQueuedSubmission(storage, first.submissionId)

  const queue = readSubmissionQueue(storage)
  expect(queue).toHaveLength(1)
  expect(queue[0]?.payload.submissionId).toBe(second.submissionId)
})

test("marks a submission failed without dropping it", () => {
  const storage = new MemoryStorage()
  enqueueSubmission(storage, first)

  markQueuedSubmissionFailed(storage, first.submissionId)

  expect(readSubmissionQueue(storage)[0]?.status).toBe("failed")
})

test("completed markers are keyed by participant, case, and run", () => {
  const storage = new MemoryStorage()
  writeCompletedMarker(storage, "P07", 1, first.runId, first.submissionId)

  expect(readCompletedMarker(storage, "P07", 1, first.runId)).toEqual({
    submissionId: first.submissionId,
  })
  expect(readCompletedMarker(storage, "P07", 2, first.runId)).toBeNull()
  expect(readCompletedMarker(storage, "P08", 1, first.runId)).toBeNull()
  expect(readCompletedMarker(storage, "P07", 1, "another-run")).toBeNull()
})

test("corrupt storage is treated as empty", () => {
  const storage = new MemoryStorage()
  storage.setItem("study.submission-queue.v1", "{ not json")
  storage.setItem("study.completed-cases.v1", "]]]")

  expect(readSubmissionQueue(storage)).toEqual([])
  expect(readCompletedMarker(storage, "P07", 1, first.runId)).toBeNull()
})

test("queued status is delivered when absent, retrying when pending", () => {
  const storage = new MemoryStorage()
  expect(queuedSubmissionStatus(storage, first.submissionId)).toBe("delivered")

  enqueueSubmission(storage, first)
  expect(queuedSubmissionStatus(storage, first.submissionId)).toBe("retrying")

  markQueuedSubmissionFailed(storage, first.submissionId)
  expect(queuedSubmissionStatus(storage, first.submissionId)).toBe("failed")
})

test("a successful flush removes the item and reports it delivered", async () => {
  const storage = new MemoryStorage()
  enqueueSubmission(storage, first)
  const sent: string[] = []
  const sink: SubmissionSink = async (row) => {
    sent.push(row.submissionId)
  }

  const outcome = await flushSubmissionQueue(storage, sink)

  expect(sent).toEqual([first.submissionId])
  expect(outcome.get(first.submissionId)).toBe("delivered")
  expect(readSubmissionQueue(storage)).toEqual([])
})

test("a retryable failure keeps the item pending", async () => {
  const storage = new MemoryStorage()
  enqueueSubmission(storage, first)
  const sink = async () => {
    throw new SubmissionSendError("network down", true)
  }

  const outcome = await flushSubmissionQueue(storage, sink)

  expect(outcome.get(first.submissionId)).toBe("retrying")
  expect(readSubmissionQueue(storage)[0]?.status).toBe("pending")
})

test("a permanent failure marks the item failed", async () => {
  const storage = new MemoryStorage()
  enqueueSubmission(storage, first)
  const sink = async () => {
    throw new SubmissionSendError("rejected", false)
  }

  const outcome = await flushSubmissionQueue(storage, sink)

  expect(outcome.get(first.submissionId)).toBe("failed")
  expect(readSubmissionQueue(storage)[0]?.status).toBe("failed")
})

test("already failed items are skipped without calling the sink", async () => {
  const storage = new MemoryStorage()
  enqueueSubmission(storage, first)
  markQueuedSubmissionFailed(storage, first.submissionId)
  const sink = async () => {
    throw new Error("must not be called")
  }

  const outcome = await flushSubmissionQueue(storage, sink)

  expect(outcome.get(first.submissionId)).toBe("failed")
})

test("a failing item does not stop later items", async () => {
  const storage = new MemoryStorage()
  enqueueSubmission(storage, first)
  enqueueSubmission(storage, second)
  const sink: SubmissionSink = async (row) => {
    if (row.submissionId === first.submissionId) {
      throw new SubmissionSendError("rejected", false)
    }
  }

  const outcome = await flushSubmissionQueue(storage, sink)

  expect(outcome.get(first.submissionId)).toBe("failed")
  expect(outcome.get(second.submissionId)).toBe("delivered")
  const remaining = readSubmissionQueue(storage)
  expect(remaining).toHaveLength(1)
  expect(remaining[0]?.payload.submissionId).toBe(first.submissionId)
  expect(remaining[0]?.status).toBe("failed")
})

test("an unexpected error is treated as retryable", async () => {
  const storage = new MemoryStorage()
  enqueueSubmission(storage, first)
  const sink = async () => {
    throw new Error("unexpected")
  }

  const outcome = await flushSubmissionQueue(storage, sink)

  expect(outcome.get(first.submissionId)).toBe("retrying")
  expect(readSubmissionQueue(storage)[0]?.status).toBe("pending")
})
