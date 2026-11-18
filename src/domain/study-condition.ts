import { z } from "zod"

export const studyConditions = ["baseline", "candidates", "probabilities"] as const

export type StudyCondition = (typeof studyConditions)[number]

export const studyConditionSchema = z.enum(studyConditions)
