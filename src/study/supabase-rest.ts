import type { SubmissionSinkConfig } from "./config.ts"
import type { SubmissionPayload } from "./submission.ts"

export class SubmissionSendError extends Error {
  readonly retryable: boolean

  constructor(message: string, retryable: boolean) {
    super(message)
    this.name = "SubmissionSendError"
    this.retryable = retryable
  }
}

export type SubmissionSink = (payload: SubmissionPayload) => Promise<void>

const submissionTable = "study_submissions"

/**
 * Snake-case wire names for the insert-only Supabase table. A `409` unique
 * violation on `submission_id` means the row is already there, so it counts as
 * delivered rather than an error.
 */
function wireRow(payload: SubmissionPayload): Record<string, unknown> {
  return {
    submission_id: payload.submissionId,
    participant_code: payload.participantCode,
    case_order: payload.caseOrder,
    condition: payload.condition,
    run_id: payload.runId,
    locale: payload.locale,
    verdict: payload.verdict,
    explanation: payload.explanation,
    timing: payload.timing,
    started_at: payload.startedAt,
    submitted_at: payload.submittedAt,
    app_version: payload.appVersion,
    fixture_revision: payload.fixtureRevision,
    viewport: payload.viewport,
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function restSubmissionSink(
  config: SubmissionSinkConfig,
  fetcher: typeof fetch = fetch,
): SubmissionSink {
  return async (payload) => {
    let response: Response
    try {
      response = await fetcher(`${config.url}/rest/v1/${submissionTable}`, {
        method: "POST",
        headers: {
          apikey: config.key,
          Authorization: `Bearer ${config.key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(wireRow(payload)),
      })
    } catch (error) {
      throw new SubmissionSendError(`The submission could not be sent (${messageOf(error)})`, true)
    }

    if (response.ok) return
    if (response.status === 409) return

    if (response.status >= 500) {
      throw new SubmissionSendError(
        `The submission endpoint failed with status ${response.status}`,
        true,
      )
    }

    throw new SubmissionSendError(
      `The submission was rejected with status ${response.status}`,
      false,
    )
  }
}
