import type { StudyCondition } from "../domain/study-condition.ts"
import type { CaseOrder } from "./case-link.ts"

/**
 * One researcher-built study case: the link identity plus the build-time facts
 * the submission needs. The participant's other cases are never known to the
 * app; the researcher's link list is the assignment.
 */
export type StudySession = {
  readonly participantCode: string
  readonly caseOrder: CaseOrder
  readonly caseCode: string
  readonly runId: string
  readonly condition: StudyCondition
  readonly fixtureRevision: string
  readonly appVersion: string
}
