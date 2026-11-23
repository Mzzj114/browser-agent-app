import { flushSubmissionQueue } from "./submission-store.ts"
import type { SubmissionSink } from "./supabase-rest.ts"

export type QueueSync = {
  /** Removes the reconnect listener. The initial flush cannot be undone. */
  readonly stop: () => void
}

/**
 * Retrying a queued submission must not depend on the participant staying on
 * the same page state. One page-lifetime sync flushes the queue on start and
 * whenever the browser reports it is back online; `onFlushed` lets a caller
 * such as the submitted-notice screen re-render the honest upload status.
 */
export function startQueueSync(
  storage: Storage,
  sink: SubmissionSink,
  onFlushed?: () => void,
): QueueSync {
  const flush = () => {
    void flushSubmissionQueue(storage, sink).then(() => onFlushed?.())
  }

  flush()
  window.addEventListener("online", flush)

  return { stop: () => window.removeEventListener("online", flush) }
}
