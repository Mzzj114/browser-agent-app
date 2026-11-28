import { z } from "zod"
import { type StudyCondition, studyConditionSchema } from "../domain/study-condition.ts"
import type { CaseOrder } from "./case-link.ts"
import type { StudySession } from "./session.ts"
import type { ReviewTiming, TimingCounts } from "./timing.ts"

export type SubmissionPayload = {
  readonly submissionId: string
  readonly participantCode: string
  readonly caseOrder: CaseOrder
  readonly condition: StudyCondition
  readonly runId: string
  readonly locale: "zh" | "en"
  readonly verdict: "accepted" | "rejected"
  readonly explanation: string
  readonly timing: TimingCounts
  readonly startedAt: string
  readonly submittedAt: string
  readonly appVersion: string
  readonly fixtureRevision: string
  readonly viewport: { readonly width: number; readonly height: number }
}

export type BuildSubmissionInput = {
  readonly session: StudySession
  readonly locale: "zh" | "en"
  readonly verdict: "accepted" | "rejected"
  readonly explanation: string
  readonly timing: ReviewTiming
  readonly finished: TimingCounts
  readonly submittedAtIso: string
  readonly viewport: { readonly width: number; readonly height: number }
  readonly submissionId: string
}

export function buildSubmission(input: BuildSubmissionInput): SubmissionPayload {
  const { session, timing } = input

  return {
    submissionId: input.submissionId,
    participantCode: session.participantCode,
    caseOrder: session.caseOrder,
    condition: session.condition,
    runId: session.runId,
    locale: input.locale,
    verdict: input.verdict,
    explanation: input.explanation,
    timing: input.finished,
    startedAt: timing.startedAtIso,
    submittedAt: input.submittedAtIso,
    appVersion: session.appVersion,
    fixtureRevision: session.fixtureRevision,
    viewport: input.viewport,
  }
}

export const submissionPayloadSchema = z.strictObject({
  submissionId: z.string().min(1),
  participantCode: z.string().min(1).max(32),
  caseOrder: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  condition: studyConditionSchema,
  runId: z.string().min(1),
  locale: z.enum(["zh", "en"]),
  verdict: z.enum(["accepted", "rejected"]),
  explanation: z.string().max(500),
  timing: z
    .strictObject({
      wallMs: z.number().min(0),
      stepViews: z.number().min(0),
      uniqueStepsViewed: z.number().min(0),
      finalViews: z.number().min(0),
      // Missing on rows queued before this metric existed; treat those as unknown.
      firstInteractionMs: z.number().min(0).nullable().default(null),
    })
    .refine(
      (timing) => timing.firstInteractionMs === null || timing.firstInteractionMs <= timing.wallMs,
      {
        message: "First interaction cannot follow the end of the review",
        path: ["firstInteractionMs"],
      },
    ),
  startedAt: z.string().min(1),
  submittedAt: z.string().min(1),
  appVersion: z.string().min(1),
  fixtureRevision: z.string().min(1),
  viewport: z.strictObject({
    width: z.number().min(0),
    height: z.number().min(0),
  }),
})
