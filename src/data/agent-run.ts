import type { AgentRun } from "../domain/run-schema"

export const agentRun = {
  fixture_version: "bu-replay/1",
  source: "synthetic",
  engine: {
    library: "browser-use",
    version: "1.0.2",
    model: "synthetic-replay",
    vision: true,
  },
  task: "待加载任务",
  final: {
    status: "completed",
    text: "待加载回复",
    steps: 0,
    duration_s: 1,
    usage: { input: 0, output: 0, cache_read: 0, cache_write: 0, requests: 0 },
    cost_usd: null,
    partial: null,
    error: null,
    success: true,
  },
  steps: [],
  delivery: { tool: "finish", success_arg: true },
} satisfies AgentRun
