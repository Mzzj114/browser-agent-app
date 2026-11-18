import type * as React from "react"
import { useEffect, useId, useRef, useState } from "react"
import type { EpisodeCore } from "../../domain/decision-run-schema"
import {
  type ResponseAction,
  type ResponseError,
  responseErrors,
  type StudyResponse,
} from "../../domain/study-response"
import { useMessages } from "../../i18n"
import { ActionButton } from "./buttons"

type StudyResponseFormProps = {
  readonly episodes: readonly Pick<EpisodeCore, "id" | "ordinal" | "action">[]
  readonly state: StudyResponse
  readonly onResponse: (action: ResponseAction) => void
}

const unansweredValue = ""
const cannotDetermineValue = "cannot-determine"

function describedBy(...values: readonly (string | undefined)[]): string | undefined {
  const ids = values.filter((value): value is string => value !== undefined).join(" ")
  return ids === "" ? undefined : ids
}

export function StudyResponseForm({
  episodes,
  state,
  onResponse,
}: StudyResponseFormProps): React.JSX.Element {
  const messages = useMessages()
  const idPrefix = useId()
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [invalidSubmitCount, setInvalidSubmitCount] = useState(0)
  const summaryRef = useRef<HTMLDivElement>(null)
  const lastFocusedInvalidSubmit = useRef(0)
  const episodeIds = episodes.map((episode) => episode.id)
  const errors = responseErrors(state, episodeIds)
  const submitted = state.status === "submitted"
  const showErrors = submitAttempted && !submitted && errors.length > 0
  const hasError = (error: ResponseError) => showErrors && errors.includes(error)

  useEffect(() => {
    if (invalidSubmitCount === lastFocusedInvalidSubmit.current) return
    lastFocusedInvalidSubmit.current = invalidSubmitCount
    if (showErrors) summaryRef.current?.focus()
  }, [invalidSubmitCount, showErrors])

  const questionId = `${idPrefix}-question`
  const localizationId = `${idPrefix}-localization`
  const localizationHelperId = `${idPrefix}-localization-helper`
  const verdictErrorId = `${idPrefix}-verdict-required`
  const localizationRequiredErrorId = `${idPrefix}-localization-required`
  const unknownEpisodeErrorId = `${idPrefix}-unknown-episode`
  const explanationId = `${idPrefix}-explanation`
  const explanationHelperId = `${idPrefix}-explanation-helper`
  const explanationRequiredErrorId = `${idPrefix}-explanation-required`
  const explanationTooLongErrorId = `${idPrefix}-explanation-too-long`
  const errorsId = `${idPrefix}-errors`
  const consequenceId = `${idPrefix}-consequence`
  const onScreenOnlyId = `${idPrefix}-on-screen-only`

  const localizationValue =
    state.localization.kind === "episode"
      ? state.localization.episodeId
      : state.localization.kind === "cannot-determine"
        ? cannotDetermineValue
        : unansweredValue

  const explanationRequired = state.localization.kind === "episode"
  const explanationHelper =
    state.localization.kind === "episode"
      ? messages.study.explanationRequiredHelper
      : state.localization.kind === "cannot-determine"
        ? messages.study.explanationCannotDetermineHelper
        : messages.study.explanationOptionalHelper

  const verdictHasError = hasError("verdict-required")
  const localizationRequired = hasError("localization-required")
  const unknownEpisode = hasError("unknown-episode")
  const explanationMissing = hasError("explanation-required")
  const explanationTooLong = hasError("explanation-too-long")

  function handleLocalizationChange(value: string) {
    if (value === cannotDetermineValue) {
      onResponse({ type: "localize", localization: { kind: "cannot-determine" } })
      return
    }

    if (value === unansweredValue) {
      onResponse({ type: "localize", localization: { kind: "unanswered" } })
      return
    }

    onResponse({ type: "localize", localization: { kind: "episode", episodeId: value } })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitted) return

    setSubmitAttempted(true)
    if (errors.length === 0) {
      onResponse({ type: "submit" })
    } else {
      setInvalidSubmitCount((count) => count + 1)
    }
  }

  return (
    <form
      className="study-response-form"
      aria-labelledby={questionId}
      data-status={state.status}
      noValidate
      onSubmit={handleSubmit}
    >
      <fieldset
        className="study-response-verdict"
        aria-describedby={verdictHasError ? verdictErrorId : undefined}
      >
        <legend id={questionId} className="study-response-question">
          {messages.decisionQuestion}
        </legend>
        <div className="study-response-verdict-actions">
          <ActionButton
            disabled={submitted}
            selected={state.verdict === "accepted"}
            onClick={() => onResponse({ type: "verdict", verdict: "accepted" })}
          >
            {messages.acceptResult}
          </ActionButton>
          <ActionButton
            disabled={submitted}
            selected={state.verdict === "rejected"}
            onClick={() => onResponse({ type: "verdict", verdict: "rejected" })}
          >
            {messages.rejectResult}
          </ActionButton>
        </div>
        {verdictHasError ? (
          <p id={verdictErrorId} className="study-response-error">
            {messages.study.responseErrorMessages["verdict-required"]}
          </p>
        ) : null}
      </fieldset>

      {showErrors ? (
        <div
          ref={summaryRef}
          className="study-response-errors"
          role="alert"
          aria-labelledby={errorsId}
          tabIndex={-1}
        >
          <h3 id={errorsId}>{messages.study.errorSummaryHeading}</h3>
          <ul>
            {errors.map((error) => (
              <li key={error}>{messages.study.responseErrorMessages[error]}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="study-response-field">
        <label htmlFor={localizationId}>{messages.study.localizationPrompt}</label>
        <select
          id={localizationId}
          name="earliest-mistake"
          value={localizationValue}
          disabled={submitted}
          aria-invalid={localizationRequired || unknownEpisode ? true : undefined}
          aria-describedby={describedBy(
            localizationHelperId,
            localizationRequired ? localizationRequiredErrorId : undefined,
            unknownEpisode ? unknownEpisodeErrorId : undefined,
          )}
          onChange={(event) => handleLocalizationChange(event.target.value)}
        >
          <option value={unansweredValue}>{messages.study.localizationPlaceholder}</option>
          {episodes.map((episode) => (
            <option key={episode.id} value={episode.id}>
              {messages.stepOption(episode.ordinal, episode.action)}
            </option>
          ))}
          <option value={cannotDetermineValue}>{messages.study.cannotDetermine}</option>
        </select>
        <p id={localizationHelperId} className="study-response-helper">
          {messages.study.uncertaintyHelper}
        </p>
        {localizationRequired ? (
          <p id={localizationRequiredErrorId} className="study-response-error">
            {messages.study.responseErrorMessages["localization-required"]}
          </p>
        ) : null}
        {unknownEpisode ? (
          <p id={unknownEpisodeErrorId} className="study-response-error">
            {messages.study.responseErrorMessages["unknown-episode"]}
          </p>
        ) : null}
      </div>

      <div className="study-response-field">
        <label htmlFor={explanationId}>
          {messages.study.explanationHeading}{" "}
          <span className="study-response-indicator">
            {explanationRequired
              ? messages.study.explanationRequired
              : messages.study.explanationOptional}
          </span>
        </label>
        <textarea
          id={explanationId}
          name="explanation"
          value={state.explanation}
          rows={4}
          maxLength={500}
          disabled={submitted}
          aria-required={explanationRequired}
          aria-invalid={explanationMissing || explanationTooLong ? true : undefined}
          aria-describedby={describedBy(
            explanationHelperId,
            explanationMissing ? explanationRequiredErrorId : undefined,
            explanationTooLong ? explanationTooLongErrorId : undefined,
          )}
          placeholder={messages.study.explanationPlaceholder}
          onChange={(event) => onResponse({ type: "explain", text: event.target.value })}
        />
        <p id={explanationHelperId} className="study-response-helper">
          {explanationHelper}
        </p>
        {explanationMissing ? (
          <p id={explanationRequiredErrorId} className="study-response-error">
            {messages.study.responseErrorMessages["explanation-required"]}
          </p>
        ) : null}
        {explanationTooLong ? (
          <p id={explanationTooLongErrorId} className="study-response-error">
            {messages.study.responseErrorMessages["explanation-too-long"]}
          </p>
        ) : null}
      </div>

      <div className="study-response-submit-row">
        <ActionButton
          type="submit"
          disabled={submitted || state.verdict === null}
          aria-describedby={describedBy(consequenceId, onScreenOnlyId)}
        >
          {messages.decisionSubmit}
        </ActionButton>
        <span className="study-response-count">{state.explanation.length}/500</span>
      </div>

      <p id={consequenceId} className="study-response-consequence">
        {messages.decisionExplanation}
      </p>
      <p id={onScreenOnlyId} className="study-response-on-screen-only">
        {messages.study.onScreenOnly}
      </p>
      <p className="study-response-status" role="status" aria-live="polite">
        {submitted ? messages.study.responseSubmittedStatus : ""}
      </p>
    </form>
  )
}
