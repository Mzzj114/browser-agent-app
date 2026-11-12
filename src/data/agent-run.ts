import { agentRunSchema } from "../domain/run-schema"
import rawAgentRun from "./agent-run.json"

export const agentRun = agentRunSchema.parse(rawAgentRun)
