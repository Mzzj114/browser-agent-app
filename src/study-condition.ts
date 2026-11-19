import { type StudyCondition, studyConditionSchema } from "./domain/study-condition.ts"

/**
 * The condition is inlined by Vite at build time. It is intentionally not
 * readable from the URL, query string, or browser storage.
 */
export const studyCondition: StudyCondition = studyConditionSchema.parse(
  import.meta.env.VITE_STUDY_CONDITION ?? "baseline",
)
