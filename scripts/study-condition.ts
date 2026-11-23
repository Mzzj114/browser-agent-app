import { type StudyCondition, studyConditionSchema } from "../src/domain/study-condition.ts"

/**
 * Participant-facing URL segment for each condition. Short, neutral slugs keep
 * the condition name out of the address bar; the build writes each site here.
 */
export const studyConditionRoutes = {
  baseline: "b",
  candidates: "c",
  probabilities: "p",
} as const satisfies Readonly<Record<StudyCondition, string>>

export function studyConditionFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): StudyCondition {
  const { STUDY_CONDITION } = environment
  return studyConditionSchema.parse(STUDY_CONDITION ?? "baseline")
}
