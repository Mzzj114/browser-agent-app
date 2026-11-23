export type CaseOrder = 1 | 2 | 3

const participantCodePattern = /^[A-Za-z0-9_-]{1,32}$/
const caseOrderValues = ["1", "2", "3"] as const

export type StudyLink =
  | { readonly kind: "demo" }
  | { readonly kind: "invalid" }
  | {
      readonly kind: "case"
      readonly participantCode: string
      readonly caseOrder: CaseOrder
      readonly caseCode: string
      readonly runId: string
    }

/**
 * Study links are `?p=<participant>&c=<1|2|3>&case=<code>`. A URL without any
 * of those parameters stays in demo mode, where `?run=<raw id>` keeps its
 * existing meaning. Any partial or malformed combination is invalid and must
 * never fall back to the run picker.
 */
export function parseStudyLink(
  searchParams: URLSearchParams,
  caseCodes: ReadonlyMap<string, string>,
): StudyLink {
  const caseCode = searchParams.get("case")
  const participantCode = searchParams.get("p")
  const caseOrder = searchParams.get("c")

  if (caseCode === null && participantCode === null && caseOrder === null) {
    return { kind: "demo" }
  }

  if (caseCode === null || participantCode === null || caseOrder === null) {
    return { kind: "invalid" }
  }
  if (!participantCodePattern.test(participantCode)) {
    return { kind: "invalid" }
  }

  const order = caseOrderValues.indexOf(caseOrder as (typeof caseOrderValues)[number])
  if (order < 0) {
    return { kind: "invalid" }
  }

  const runId = caseCodes.get(caseCode)
  if (runId === undefined) {
    return { kind: "invalid" }
  }

  return {
    kind: "case",
    participantCode,
    caseOrder: (order + 1) as CaseOrder,
    caseCode,
    runId,
  }
}
