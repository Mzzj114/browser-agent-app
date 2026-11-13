import { agentRunSchema } from "../domain/run-schema"
import rawAgentRunEn from "./agent-run.en.json"
import rawAgentRunZh from "./agent-run.json"

export const agentRun = agentRunSchema.parse(rawAgentRunZh)
export const agentRunEn = agentRunSchema.parse(rawAgentRunEn)

export const agentRuns = {
  zh: agentRun,
  en: agentRunEn,
} as const
