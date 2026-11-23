import cases from "./cases.json"

const caseCodePattern = /^C\d{2}$/

/**
 * Validate the checked-in case-code map. Codes are short, stable identifiers
 * that keep raw run IDs out of participant-visible study links. The map never
 * carries expected verdicts or any other answer-key data.
 */
export function parseCaseCodes(raw: unknown): ReadonlyMap<string, string> {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new Error("Case codes must be an object mapping codes to run ids")
  }

  const entries = Object.entries(raw as Record<string, unknown>)
  if (entries.length === 0) {
    throw new Error("Case codes must not be empty")
  }

  const codes = new Map<string, string>()
  const runIds = new Set<string>()
  for (const [code, runId] of entries) {
    if (!caseCodePattern.test(code)) {
      throw new Error(`Invalid case code "${code}"`)
    }
    if (typeof runId !== "string" || runId.length === 0) {
      throw new Error(`Case code "${code}" must map to a non-empty run id`)
    }
    if (runIds.has(runId)) {
      throw new Error(`Duplicate case run id "${runId}"`)
    }
    runIds.add(runId)
    codes.set(code, runId)
  }

  return codes
}

export const caseCodes: ReadonlyMap<string, string> = parseCaseCodes(cases)
