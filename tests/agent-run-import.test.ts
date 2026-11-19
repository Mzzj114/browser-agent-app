import { describe, expect, it } from "vitest"
import {
  buildCanonicalRuns,
  repairMojibake,
  type SourceMeta,
  type SourceTrace,
  type Translations,
} from "../scripts/agent-run-import.ts"

const translations: Translations = {
  tasks: { "Sort the results.": "对结果进行排序。" },
  actions: { "Sort results → Price": "排序结果 → 价格" },
  taskTitles: { amazon_sort: { en: "Sort results", zh: "排序结果" } },
  roles: { button: "按钮", link: "链接" },
  operations: {
    CLICK: "点击",
    TYPE_TEXT: "输入文本",
    SELECT: "选择",
    SCROLL_DOWN: "向下滚动",
    SCROLL_UP: "向上滚动",
    WAIT: "等待",
    DONE: "完成",
    BLOCKED: "受阻",
  },
}

const meta: SourceMeta = {
  run_id: "run-1",
  task_id: "amazon_sort",
  scenario: "test",
  condition: "clean",
  seed: 42,
  instruction: "Sort the results.",
  started_at: "2026-11-17T00:00:00",
}

function trace(overrides: Partial<SourceTrace> = {}): SourceTrace {
  return {
    initial_frame: "pre_0000.jpg",
    final_frame: null,
    final_page: { url: "https://example.test/products", title: "Example Store" },
    steps: [
      {
        step: 1,
        action: "Sort results â†’ Price",
        operation: "CLICK",
        target: "1",
        text: null,
        url: "https://example.test/",
        pre_frame: "pre_0001.jpg",
        elapsed_ms: 1000,
        decision_index: 0,
      },
    ],
    decisions: [
      {
        operation: "CLICK",
        target: "1",
        operation_probabilities: { CLICK: 0.8, TYPE_TEXT: 0.2 },
        raw_answers: {
          click_target: { choice: "1", probabilities: { "1": 0.8, "2": 0.2 } },
        },
        request: {
          questions: {
            click_target: {
              criteria: {
                "1": { element: "[1] Sort results → Price", role: "button" },
                "2": { element: "[2] Other", role: "link" },
              },
            },
          },
        },
      },
    ],
    ...overrides,
  }
}

const frameSize = () => ({ width: 1120, height: 780 })

describe("agent run import mapping", () => {
  it("repairs cp1252 mojibake", () => {
    expect(repairMojibake("Sort results â†’ Price â€” now")).toBe("Sort results → Price — now")
    expect(repairMojibake("Plain ASCII")).toBe("Plain ASCII")
  })

  it("builds paired English and Chinese runs from one trace", () => {
    const { en, zh, revision } = buildCanonicalRuns({
      runId: "run-1",
      meta,
      trace: trace(),
      translations,
      frameSize,
      finishedAt: "2026-11-17T00:00:05",
    })

    expect(en.runId).toBe("run-1")
    expect(en.locale).toBe("en")
    expect(zh.locale).toBe("zh")
    expect(en.task).toBe("Sort the results.")
    expect(zh.task).toBe("对结果进行排序。")
    expect(en.episodes[0]?.action).toBe("Sort results → Price")
    expect(zh.episodes[0]?.action).toBe("排序结果 → 价格")
    expect(en.observations).toHaveLength(2)
    expect(en.finalObservationId).toBe("obs-01")
    expect(en.observations[1]?.screenshot?.path).toBe("frames/pre_0001.jpg")
    expect(en.observations[1]?.screenshot).toMatchObject({ width: 1120, height: 780 })
    expect(revision).toMatch(/^[0-9a-f]{64}$/)
  })

  it("translates role context but keeps the literal candidate label English", () => {
    const { zh } = buildCanonicalRuns({
      runId: "run-1",
      meta,
      trace: trace(),
      translations,
      frameSize,
    })
    const target = zh.episodes[0]?.targetHead
    if (!target) throw new Error("Expected a target head")

    expect(target.offered[0]?.label).toBe("[1] Sort results → Price")
    expect(target.offered[0]?.context).toBe("按钮")
    expect(target.offered[1]?.context).toBe("链接")
  })

  it("fails when a translatable action is missing", () => {
    const step = trace().steps[0]
    if (!step) throw new Error("Expected a step")
    expect(() =>
      buildCanonicalRuns({
        runId: "run-1",
        meta,
        trace: trace({
          steps: [
            {
              ...step,
              action: "An untranslated action",
            },
          ],
        }),
        translations,
        frameSize,
      }),
    ).toThrow(/untranslated action/i)
  })

  it("rejects probabilities that do not sum to one", () => {
    const invalid = trace()
    const decision = invalid.decisions[0]
    if (!decision) throw new Error("Expected a decision")
    expect(() =>
      buildCanonicalRuns({
        runId: "run-1",
        meta,
        trace: trace({
          decisions: [
            {
              ...decision,
              operation_probabilities: { CLICK: 0.8, TYPE_TEXT: 0.1 },
            },
          ],
        }),
        translations,
        frameSize,
      }),
    ).toThrow()
  })

  it("rejects a selected target that is not an argmax", () => {
    const invalid = trace()
    const decision = invalid.decisions[0]
    if (!decision?.raw_answers) throw new Error("Expected a decision")
    expect(() =>
      buildCanonicalRuns({
        runId: "run-1",
        meta,
        trace: trace({
          decisions: [
            {
              ...decision,
              raw_answers: {
                click_target: { choice: "2", probabilities: { "1": 0.8, "2": 0.2 } },
              },
            },
          ],
        }),
        translations,
        frameSize,
      }),
    ).toThrow()
  })
})
