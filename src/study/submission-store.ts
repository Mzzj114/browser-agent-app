import type { CaseOrder } from "./case-link.ts"
import { type SubmissionPayload, submissionPayloadSchema } from "./submission.ts"
import { SubmissionSendError, type SubmissionSink } from "./supabase-rest.ts"

const queueKey = "study.submission-queue.v1"
const completedKey = "study.completed-cases.v1"

export type QueuedSubmission = {
  readonly payload: SubmissionPayload
  readonly status: "pending" | "failed"
}

export type FlushOutcome = "delivered" | "retrying" | "failed"

function readJson(storage: Storage, key: string): unknown {
  try {
    const raw = storage.getItem(key)
    return raw === null ? undefined : (JSON.parse(raw) as unknown)
  } catch {
    return undefined
  }
}

function writeJson(storage: Storage, key: string, value: unknown): void {
  storage.setItem(key, JSON.stringify(value))
}

function completedMarkerKey(participantCode: string, caseOrder: CaseOrder, runId: string): string {
  return `${participantCode}:${caseOrder}:${runId}`
}

export function readSubmissionQueue(storage: Storage): readonly QueuedSubmission[] {
  const raw = readJson(storage, queueKey)
  if (!Array.isArray(raw)) return []

  const queue: QueuedSubmission[] = []
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue
    const candidate = item as { payload?: unknown; status?: unknown }
    const parsed = submissionPayloadSchema.safeParse(candidate.payload)
    if (!parsed.success) continue
    if (candidate.status !== "pending" && candidate.status !== "failed") continue
    queue.push({ payload: parsed.data, status: candidate.status })
  }
  return queue
}

function writeQueue(storage: Storage, queue: readonly QueuedSubmission[]): void {
  writeJson(storage, queueKey, queue)
}

export function enqueueSubmission(storage: Storage, payload: SubmissionPayload): void {
  writeQueue(storage, [...readSubmissionQueue(storage), { payload, status: "pending" }])
}

export function removeQueuedSubmission(storage: Storage, submissionId: string): void {
  writeQueue(
    storage,
    readSubmissionQueue(storage).filter((item) => item.payload.submissionId !== submissionId),
  )
}

export function markQueuedSubmissionFailed(storage: Storage, submissionId: string): void {
  writeQueue(
    storage,
    readSubmissionQueue(storage).map((item) =>
      item.payload.submissionId === submissionId ? { ...item, status: "failed" } : item,
    ),
  )
}

export function readCompletedMarker(
  storage: Storage,
  participantCode: string,
  caseOrder: CaseOrder,
  runId: string,
): { readonly submissionId: string } | null {
  const raw = readJson(storage, completedKey)
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null

  const marker = (raw as Record<string, unknown>)[
    completedMarkerKey(participantCode, caseOrder, runId)
  ]
  if (typeof marker !== "object" || marker === null) return null

  const submissionId = (marker as { submissionId?: unknown }).submissionId
  return typeof submissionId === "string" && submissionId.length > 0 ? { submissionId } : null
}

export function writeCompletedMarker(
  storage: Storage,
  participantCode: string,
  caseOrder: CaseOrder,
  runId: string,
  submissionId: string,
): void {
  const raw = readJson(storage, completedKey)
  const markers =
    typeof raw === "object" && raw !== null && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {}
  markers[completedMarkerKey(participantCode, caseOrder, runId)] = { submissionId }
  writeJson(storage, completedKey, markers)
}

export function queuedSubmissionStatus(storage: Storage, submissionId: string): FlushOutcome {
  const item = readSubmissionQueue(storage).find(
    (queued) => queued.payload.submissionId === submissionId,
  )
  if (item === undefined) return "delivered"
  return item.status === "failed" ? "failed" : "retrying"
}

export async function flushSubmissionQueue(
  storage: Storage,
  sink: SubmissionSink,
): Promise<ReadonlyMap<string, FlushOutcome>> {
  const outcomes = new Map<string, FlushOutcome>()

  for (const item of readSubmissionQueue(storage)) {
    const submissionId = item.payload.submissionId
    if (item.status === "failed") {
      outcomes.set(submissionId, "failed")
      continue
    }

    try {
      await sink(item.payload)
      removeQueuedSubmission(storage, submissionId)
      outcomes.set(submissionId, "delivered")
    } catch (error) {
      const retryable = !(error instanceof SubmissionSendError) || error.retryable
      if (retryable) {
        outcomes.set(submissionId, "retrying")
      } else {
        markQueuedSubmissionFailed(storage, submissionId)
        outcomes.set(submissionId, "failed")
      }
    }
  }

  return outcomes
}
