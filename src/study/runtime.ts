import type { StudySession } from "./session.ts"
import type { SubmissionSink } from "./supabase-rest.ts"

/**
 * Everything the workspace needs to run one researcher-built study case.
 * The sink is injected so tests and the demo stay free of network calls.
 */
export type StudyRuntime = {
  readonly session: StudySession
  readonly sink: SubmissionSink
}
