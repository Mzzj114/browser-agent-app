import { existsSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { agentRun } from "../src/data/agent-run"
import { agentRunSchema } from "../src/domain/run-schema"

describe("synthetic browser-use replay fixture", () => {
  it("contains eight chronological model-response steps", () => {
    // Given the normalized fixture is loaded.
    // When its steps are inspected.
    // Then the run contains the agreed execution length and native count.
    expect(agentRun.steps).toHaveLength(8)
    expect(agentRun.final.steps).toBe(agentRun.steps.length)
    expect(agentRun.steps.map((step) => step.ordinal)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it("uses native Python cells without legacy summaries", () => {
    // Given a completed fixture.
    // When every execution step is inspected.
    for (const step of agentRun.steps) {
      // Then only native 1.x cells and optional provider thinking are present.
      expect(step.cells.length).toBeGreaterThan(0)
      for (const cell of step.cells) {
        expect(cell.tool).toBe("python")
        expect(cell.code.length).toBeGreaterThan(0)
      }
      expect(step).not.toHaveProperty("summary")
      expect(step).not.toHaveProperty("evaluation_previous_goal")
      expect(step).not.toHaveProperty("memory")
      expect(step).not.toHaveProperty("next_goal")
    }
  })

  it("binds every step to an existing recorder-captured local screenshot", () => {
    // Given recorder-produced page states.
    for (const step of agentRun.steps) {
      // When the step screenshot binding is inspected.
      const screenshot = step.pageState.screenshot
      // Then its provenance and local asset are explicit.
      expect(screenshot).not.toBeNull()
      expect(screenshot?.source).toBe("instrumented")
      expect(screenshot?.width).toBe(1200)
      expect(screenshot?.height).toBe(800)
      if (screenshot) {
        expect(existsSync(resolve("public", screenshot.path))).toBe(true)
      }
    }
  })

  it("passes the normalized boundary schema without runtime ground truth", () => {
    // Given the bundled fixture object.
    // When it crosses the application data boundary.
    const parsed = agentRunSchema.parse(agentRun)
    // Then it is valid and contains no participant-facing correctness annotation.
    expect(parsed).toEqual(agentRun)
    expect("groundTruth" in agentRun).toBe(false)
    expect("verdict" in agentRun).toBe(false)
  })
})
