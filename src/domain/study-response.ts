import { assertNever } from "./assert-never.ts"

const explanationLimit = 500

export type StudyResponse = {
  readonly status: "pending" | "submitted"
  readonly verdict: "accepted" | "rejected" | null
  readonly explanation: string
}

export type ResponseAction =
  | { readonly type: "verdict"; readonly verdict: "accepted" | "rejected" }
  | { readonly type: "explain"; readonly text: string }
  | { readonly type: "submit" }

export type ResponseError = "verdict-required" | "explanation-too-long"

export function initialStudyResponse(): StudyResponse {
  return {
    status: "pending",
    verdict: null,
    explanation: "",
  }
}

export function responseErrors(state: StudyResponse): readonly ResponseError[] {
  const errors: ResponseError[] = []

  if (state.verdict === null) errors.push("verdict-required")
  if (state.explanation.length > explanationLimit) errors.push("explanation-too-long")

  return errors
}

export function updateStudyResponse(state: StudyResponse, action: ResponseAction): StudyResponse {
  if (state.status === "submitted") return state

  switch (action.type) {
    case "verdict":
      return action.verdict === state.verdict ? state : { ...state, verdict: action.verdict }
    case "explain":
      if (action.text.length > explanationLimit) return state
      return action.text === state.explanation ? state : { ...state, explanation: action.text }
    case "submit":
      return responseErrors(state).length === 0 ? { ...state, status: "submitted" } : state
    default:
      return assertNever(action)
  }
}
