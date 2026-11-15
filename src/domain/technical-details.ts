/**
 * The delivered final report is a separate content channel from the recorded
 * technical code. Replace its string literal with a neutral pointer so the
 * report cannot be duplicated inside the technical-details disclosure.
 */
const FINAL_REPORT_CALL =
  /(finish(?:_from_repl)?\s*\(\s*result\s*=\s*)("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g

export function sanitizeTechnicalCode(code: string, placeholder: string): string {
  return code.replace(FINAL_REPORT_CALL, `$1${JSON.stringify(placeholder)}`)
}
