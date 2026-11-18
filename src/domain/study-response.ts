import { assertNever } from "./assert-never.ts"

const explanationLimit = 500

export type Localization =
  | { readonly kind: "unanswered" }
  | { readonly kind: "cannot-determine" }
  | { readonly kind: "episode"; readonly episodeId: string }

export type StudyResponse = {
  readonly status: "pending" | "submitted"
  readonly verdict: "accepted" | "rejected" | null
  readonly localization: Localization
  readonly explanation: string
}

export type ResponseAction =
  | { readonly type: "verdict"; readonly verdict: "accepted" | "rejected" }
  | { readonly type: "localize"; readonly localization: Localization }
  | { readonly type: "mark"; readonly episodeId: string }
  | { readonly type: "explain"; readonly text: string }
  | { readonly type: "submit" }

export type ResponseError =
  | "verdict-required"
  | "localization-required"
  | "unknown-episode"
  | "explanation-required"
  | "explanation-too-long"

export function initialStudyResponse(): StudyResponse {
  return {
    status: "pending",
    verdict: null,
    localization: { kind: "unanswered" },
    explanation: "",
  }
}

export function responseErrors(
  state: StudyResponse,
  episodeIds: readonly string[],
): readonly ResponseError[] {
  const errors: ResponseError[] = []

  if (state.verdict === null) errors.push("verdict-required")

  switch (state.localization.kind) {
    case "unanswered":
      if (state.verdict === "rejected") errors.push("localization-required")
      break
    case "cannot-determine":
      break
    case "episode":
      if (!episodeIds.includes(state.localization.episodeId)) errors.push("unknown-episode")
      if (state.explanation.trim() === "") errors.push("explanation-required")
      break
    default:
      return assertNever(state.localization)
  }

  if (state.explanation.length > explanationLimit) errors.push("explanation-too-long")

  return errors
}

export function updateStudyResponse(
  state: StudyResponse,
  action: ResponseAction,
  episodeIds: readonly string[],
): StudyResponse {
  if (state.status === "submitted") return state

  switch (action.type) {
    case "verdict":
      return action.verdict === state.verdict ? state : { ...state, verdict: action.verdict }
    case "localize":
      return updateLocalization(state, action.localization, episodeIds)
    case "mark":
      return updateMark(state, action.episodeId, episodeIds)
    case "explain":
      if (action.text.length > explanationLimit) return state
      return action.text === state.explanation ? state : { ...state, explanation: action.text }
    case "submit":
      return responseErrors(state, episodeIds).length === 0
        ? { ...state, status: "submitted" }
        : state
    default:
      return assertNever(action)
  }
}

function updateLocalization(
  state: StudyResponse,
  localization: Localization,
  episodeIds: readonly string[],
): StudyResponse {
  switch (localization.kind) {
    case "unanswered":
    case "cannot-determine":
      break
    case "episode":
      if (!episodeIds.includes(localization.episodeId)) return state
      break
    default:
      return assertNever(localization)
  }

  return { ...state, localization }
}

function updateMark(
  state: StudyResponse,
  episodeId: string,
  episodeIds: readonly string[],
): StudyResponse {
  if (!episodeIds.includes(episodeId)) return state

  const isCurrentlyMarked =
    state.localization.kind === "episode" && state.localization.episodeId === episodeId

  return {
    ...state,
    localization: isCurrentlyMarked ? { kind: "unanswered" } : { kind: "episode", episodeId },
  }
}
