import { type StudyCondition, studyConditionSchema } from "../src/domain/study-condition.ts"

export function studyConditionFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): StudyCondition {
  const { STUDY_CONDITION } = environment
  return studyConditionSchema.parse(STUDY_CONDITION ?? "baseline")
}
