import type * as React from "react"
import { useEffect, useId, useRef, useState } from "react"
import {
  type ResponseAction,
  type ResponseError,
  responseErrors,
  type StudyResponse,
} from "../../domain/study-response"
import { useMessages } from "../../i18n"
import { ActionButton } from "./buttons"

type StudyResponseFormProps = {
  readonly state: StudyResponse
  readonly onResponse: (action: ResponseAction) => void
  readonly mode?: "demo" | "study"
  readonly uploadStatus?: "synced" | "retrying" | "failed" | null
  readonly statusRef?: React.RefObject<HTMLParagraphElement | null>
}

function describedBy(...values: readonly (string | undefined)[]): string | undefined {
  const ids = values.filter((value): value is string => value !== undefined).join(" ")
  return ids === "" ? undefined : ids
}

export function StudyResponseForm({
  state,
  onResponse,
  mode = "demo",
  uploadStatus = null,
  statusRef,
}: StudyResponseFormProps): React.JSX.Element {
  const messages = useMessages()
  const idPrefix = useId()
  const studyMode = mode === "study"
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [invalidSubmitCount, setInvalidSubmitCount] = useState(0)
  const summaryRef = useRef<HTMLDivElement>(null)
  const lastFocusedInvalidSubmit = useRef(0)
  const errors = responseErrors(state)
  const submitted = state.status === "submitted"
  const showErrors = submitAttempted && !submitted && errors.length > 0
  const hasError = (error: ResponseError) => showErrors && errors.includes(error)

  useEffect(() => {
    if (invalidSubmitCount === lastFocusedInvalidSubmit.current) return
    lastFocusedInvalidSubmit.current = invalidSubmitCount
    if (showErrors) summaryRef.current?.focus()
  }, [invalidSubmitCount, showErrors])

  const questionId = `${idPrefix}-question`
  const verdictErrorId = `${idPrefix}-verdict-required`
  const explanationId = `${idPrefix}-explanation`
  const explanationHelperId = `${idPrefix}-explanation-helper`
  const explanationTooLongErrorId = `${idPrefix}-explanation-too-long`
  const errorsId = `${idPrefix}-errors`
  const consequenceId = `${idPrefix}-consequence`
  const onScreenOnlyId = `${idPrefix}-on-screen-only`

  const verdictHasError = hasError("verdict-required")
  const explanationTooLong = hasError("explanation-too-long")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitted) return

    // The submit button is disabled without a verdict, so this invalid branch is only reachable
    // when a seeded or externally constructed response is submitted before the form re-renders.
    // Keep the alert summary and focus handoff so that state still gets accessible feedback.
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

      <div className="study-response-field study-response-explanation">
        <label htmlFor={explanationId}>
          {messages.study.explanationHeading}{" "}
          <span className="study-response-indicator">{messages.study.explanationOptional}</span>
        </label>
        <textarea
          id={explanationId}
          name="explanation"
          value={state.explanation}
          rows={2}
          maxLength={500}
          disabled={submitted}
          aria-required={false}
          aria-invalid={explanationTooLong ? true : undefined}
          aria-describedby={describedBy(
            explanationHelperId,
            explanationTooLong ? explanationTooLongErrorId : undefined,
          )}
          placeholder={messages.study.explanationPlaceholder}
          onChange={(event) => onResponse({ type: "explain", text: event.target.value })}
        />
        <p id={explanationHelperId} className="study-response-helper">
          {messages.study.explanationOptionalHelper}
        </p>
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
          aria-describedby={describedBy(consequenceId, studyMode ? undefined : onScreenOnlyId)}
        >
          {messages.decisionSubmit}
        </ActionButton>
        <span className="study-response-count">{state.explanation.length}/500</span>
      </div>

      <div className="study-response-notices">
        <p id={consequenceId} className="study-response-consequence">
          {messages.decisionExplanation}
        </p>
        {studyMode ? null : (
          <p id={onScreenOnlyId} className="study-response-on-screen-only">
            {messages.study.onScreenOnly}
          </p>
        )}
        <p
          ref={statusRef}
          className="study-response-status"
          role="status"
          aria-live="polite"
          tabIndex={-1}
        >
          {submitted
            ? studyMode
              ? messages.study.studySubmittedNotice
              : messages.study.responseSubmittedStatus
            : ""}
        </p>
        {submitted && studyMode && uploadStatus !== null ? (
          <p className="study-response-upload" role="status">
            {uploadStatus === "synced"
              ? messages.study.uploadSynced
              : uploadStatus === "retrying"
                ? messages.study.uploadRetrying
                : messages.study.uploadFailedNotice}
          </p>
        ) : null}
      </div>
    </form>
  )
}
