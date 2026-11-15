import { describe, expect, it } from "vitest"
import { sanitizeTechnicalCode } from "../src/domain/technical-details"

const PLACEHOLDER = "[final response shown in the conversation]"

describe("technical-details sanitation", () => {
  it("replaces the delivered final report inside a finish call", () => {
    // Given a cell that repeats the final report as a Python argument.
    const code = 'finish(result="Added the red shoes, size 42. Total ¥399.")'
    // When the technical code is prepared for display.
    const sanitized = sanitizeTechnicalCode(code, PLACEHOLDER)
    // Then the duplicate report is replaced by a neutral pointer.
    expect(sanitized).toBe(`finish(result=${JSON.stringify(PLACEHOLDER)})`)
  })

  it("also sanitizes finish_from_repl and single-quoted arguments", () => {
    const code = "finish_from_repl(result='A report with \"quotes\".')"
    expect(sanitizeTechnicalCode(code, PLACEHOLDER)).toBe(
      `finish_from_repl(result=${JSON.stringify(PLACEHOLDER)})`,
    )
  })

  it("keeps unrelated code and other arguments untouched", () => {
    const code = 'print(js("document.title"))\nfinish(result="done", success=True)'
    expect(sanitizeTechnicalCode(code, PLACEHOLDER)).toBe(
      `print(js("document.title"))\nfinish(result=${JSON.stringify(PLACEHOLDER)}, success=True)`,
    )
  })

  it("leaves code without a finish call unchanged", () => {
    const code = 'click_at_xy(864, 616)\nprint("cart")'
    expect(sanitizeTechnicalCode(code, PLACEHOLDER)).toBe(code)
  })
})
